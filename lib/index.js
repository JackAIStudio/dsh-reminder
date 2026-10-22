/**
 * peon-ping for DeepSeek Harness — a faithful port of the pi plugin
 * `pi-peon-ping-win` (https://github.com/Gohan/pi-peon-ping-win).
 *
 * Plays themed audio clips from OpenPeon sound packs on lifecycle events and
 * shows desktop notifications. The pi event mapping:
 *
 *   pi `session_start`          → dsh `session/created` (top-level sessions)
 *   pi `before_agent_start`     → dsh `user/message` (kind 'user'; prompt capture)
 *   pi `agent_start`            → dsh `turn/start` (spam detection + ack)
 *   pi `tool_execution_end` err → dsh `tool/result` with isError
 *   pi `agent_end`              → dsh `turn/end` (task complete + summary popup)
 *   pi `session_compact`        → dsh `compaction/end` (fires AFTER compaction)
 *
 * The pi TUI settings/install panels move into the web GUI: the Settings
 * page (the client half of this package) reads and writes the `peon-ping`
 * settings namespace, placed right below "Agent Presets" in Settings.
 *
 * Config and state stay in `~/.config/peon-ping/` — the same files the pi
 * plugin uses — so packs and settings are shared between pi and dsh.
 *
 * @module dsh-reminder
 */
import { createReadStream } from 'node:fs';
import { extname } from 'node:path';
// Type-level: merges `compaction/end` into the SessionEventMap vocabulary
// (mirrors @deepseek-ai/dsh-compaction/types; no runtime import).
import "./src/compaction-events.js";
import { playCategorySound, sendNotification } from "./src/audio.js";
import { ensureDirs, loadConfig, loadState, saveConfig, saveState } from "./src/config.js";
import { buildNotifyContent, extractLastAssistantText, extractToolErrorText, resolveProjectName } from "./src/notify-content.js";
import { listPacks, pickSound } from "./src/packs.js";
import { checkRelayHealth, detectRemoteSession, getRelayUrl, relaySetupInstructions } from "./src/relay.js";
import { previewPackSound, runInstall, getPackSoundFile } from "./src/ui.js";
import { buildSettingsEntry, configFromSettings, parseAction, } from "./src/settings.js";
export const name = 'peon-ping';
/** Text of one content-block array (user prompts). */
function blocksText(content) {
    if (!content || !Array.isArray(content))
        return '';
    return content
        .filter((block) => typeof block === 'object' &&
        block !== null &&
        block.type === 'text')
        .map((block) => block.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Whether a session is a top-level (non-subagent) session.
 *
 * A live top-level session has no `delegationDepth` (undefined); only
 * `dsh-subagent` sets it, to `parent + 1` (>= 1) for child sessions. However
 * the JSONL persistence layer normalizes the header on save
 * (`delegationDepth ?? 0` in dsh-session-persistence-jsonl) and restores the
 * explicit `0` on load, so a resumed conversation must still count as
 * top-level — treating `0` as subagent would silence every hook after a host
 * restart.
 */
function isTopLevel(session) {
    const depth = session.header.delegationDepth;
    return depth === undefined || depth === 0;
}
/** Get session events safely across DSH 0.1.5 and 0.1.7+ (snapshotEvents or events fallback) */
function getSessionEvents(session) {
    if (typeof session.snapshotEvents === 'function') {
        return session.snapshotEvents();
    }
    return session.events ?? [];
}
/** Look up the tool name for a `tool/result` by walking back to its `tool/call`. */
function toolNameFor(session, callId) {
    if (typeof callId !== 'string')
        return 'tool';
    const events = getSessionEvents(session);
    for (let i = events.length - 1; i >= 0; i--) {
        const event = events[i];
        if (event?.type === 'tool/call' && String(event.data.callId) === callId) {
            const name = event.data.name;
            return typeof name === 'string' ? name : 'tool';
        }
    }
    return 'tool';
}
/** Short human label for an unexpected turn end (popup body). */
function turnEndFailureLabel(reason) {
    switch (reason.kind) {
        case 'aborted':
            return 'Task cancelled';
        case 'error': {
            const message = reason.error?.message;
            return message !== undefined && message.length > 0 ? `Task failed: ${message}` : 'Task failed';
        }
        case 'blocked':
            return 'Task blocked';
        case 'max-tokens':
            return 'Task hit the token limit';
        case 'interrupted':
            return 'Task interrupted';
        default:
            return 'Task ended unexpectedly';
    }
}
function writeJson(res, status, body) {
    const text = JSON.stringify(body);
    res.writeHead(status, {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(text),
        'cache-control': 'no-store',
    });
    res.end(text);
}
function writeOk(res, value) {
    writeJson(res, 200, { ok: true, value });
}
function writeError(res, status, code, message) {
    writeJson(res, status, { ok: false, error: { code, message } });
}
/** Read a bounded JSON request body (the settings page sends tiny payloads). */
async function readJsonBody(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > 64 * 1024)
            throw new Error('request body too large');
        chunks.push(buffer);
    }
    if (chunks.length === 0)
        return {};
    const text = Buffer.concat(chunks).toString('utf8');
    try {
        return JSON.parse(text);
    }
    catch {
        throw new Error('invalid JSON body');
    }
}
/**
 * Same browser-trust fence as the shell's own route mounts: the request must
 * come from a loopback or trusted authority, must not be a cross-site fetch,
 * and (when a browser sends one) its origin must match the Host header.
 */
function isTrustedRequest(req, trustedHosts) {
    const host = req.headers.host;
    if (typeof host !== 'string')
        return false;
    const hostname = host.replace(/:\d+$/, '').toLowerCase();
    const loopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    if (!loopback) {
        const trusted = (trustedHosts ?? []).some((authority) => authority.replace(/:\d+$/, '').toLowerCase() === hostname);
        if (!trusted)
            return false;
    }
    if (req.headers['sec-fetch-site'] === 'cross-site')
        return false;
    const origin = req.headers.origin;
    if (origin === undefined)
        return true;
    try {
        const parsed = new URL(origin);
        // Desktop renderer uses the dsh-app:// custom scheme. The request still
        // reaches the loopback host, so accept local app/file origins here.
        if ((parsed.protocol === 'dsh-app:' || parsed.protocol === 'file:') && loopback)
            return true;
        return parsed.host === host;
    }
    catch {
        return false;
    }
}
// The settings page is a web surface. Cordis only offers a service to the
// plugin context when it is declared here; relying on ctx.inject alone left
// the /peon/api route unmounted on the 0.2.x Desktop host.
export const inject = ['webServer'];
export function apply(ctx) {
    ensureDirs();
    let config = loadConfig();
    let state = loadState();
    let installing = false;
    // Per-session runtime facts (the pi plugin tracked these globally because
    // it had exactly one session per process; the harness hosts many).
    const sessionStartTimes = new WeakMap();
    const currentPrompts = new WeakMap();
    const hasPacks = () => listPacks().length > 0;
    /** ctx.get() throws for an unregistered service on some Cordis versions. */
    const getService = (name) => {
        try {
            return ctx.get(name);
        }
        catch {
            return undefined;
        }
    };
    /** Deep link for the session that produced this notification. */
    const sessionDeepLink = (session) => {
        // The Desktop host also serves the ordinary Web GUI on a loopback port.
        // authenticatedUrl() adds this process's launch token; the token exchange
        // redirects to `./` and preserves the fragment, so #session survives.
        const connection = getService('connection');
        const webServer = getService('webServer');
        if (connection?.authenticatedUrl && webServer?.port) {
            try {
                const base = `${webServer.protocol ?? 'http:'}//127.0.0.1:${String(webServer.port)}/`;
                const url = new URL(connection.authenticatedUrl(base));
                url.hash = `session=${encodeURIComponent(session.header.id)}`;
                return url.href;
            }
            catch { }
        }
        const resourcesPath = process.resourcesPath;
        if (process.versions.electron || resourcesPath) {
            return 'dsh://open';
        }
        const index = process.argv.indexOf('--port');
        const argvPort = index >= 0 ? Number(process.argv[index + 1]) : undefined;
        const port = webServer?.port
            ?? (Number.isInteger(argvPort) && argvPort > 0 ? argvPort : undefined)
            ?? 3080;
        return `http://127.0.0.1:${port}/?session=${encodeURIComponent(session.header.id)}`;
    };
    const shouldPlaySounds = () => {
        if (installing)
            return false;
        const relayUrl = getRelayUrl(config.relay_mode);
        return relayUrl !== null || hasPacks();
    };
    // Connected GUI renderers own playback. The host process is only the
    // fallback for CLI / headless sessions where no page can play audio. That
    // keeps a desktop app from stacking a host `afplay` under the renderer's
    // Web Audio clip.
    const guiClients = new Set();
    let soundEventSeq = 0;
    const broadcastSound = (category) => {
        if (guiClients.size === 0)
            return 0;
        const payload = `data: ${JSON.stringify({
            type: 'sound',
            id: `${Date.now().toString(36)}-${(soundEventSeq++).toString(36)}`,
            category,
            volume: config.volume,
        })}\n\n`;
        let delivered = 0;
        for (const client of [...guiClients]) {
            try {
                client.write(payload);
                delivered += 1;
            }
            catch {
                guiClients.delete(client);
            }
        }
        return delivered;
    };
    /**
     * Send one lifecycle sound to its single owner: a connected GUI when there
     * is one, otherwise this host process. Relay mode stays host-side because
     * the relay, not the local speakers, is the playback target.
     */
    const emitCategorySound = (category) => {
        if (!config.enabled || state.paused)
            return;
        if (!config.categories[category])
            return;
        if (getRelayUrl(config.relay_mode) !== null) {
            playCategorySound(category, config, state);
            return;
        }
        if (broadcastSound(category) > 0)
            return;
        playCategorySound(category, config, state);
    };
    ctx.effect(() => () => {
        for (const client of guiClients) {
            try {
                client.end();
            }
            catch { }
        }
        guiClients.clear();
    }, 'dsh-reminder: GUI sound clients');
    const projectName = (session) => {
        const cwd = session.header.cwd ?? process.cwd();
        const titles = getService('sessionTitle');
        const snapshot = titles?.get(session);
        return resolveProjectName(cwd, snapshot?.title);
    };
    // pi `session_start` — a new top-level session entered the store.
    ctx.on('session/created', (session) => {
        if (!isTopLevel(session))
            return;
        config = loadConfig();
        state = loadState();
        const relayUrl = getRelayUrl(config.relay_mode);
        if (relayUrl) {
            void checkRelayHealth(relayUrl).then((healthy) => {
                if (healthy)
                    return;
                const remote = detectRemoteSession();
                const instructions = remote
                    ? relaySetupInstructions(remote)
                    : `Ensure relay is running at ${relayUrl}`;
                ctx.logger.warn(`peon-ping: relay unreachable at ${relayUrl}. ${instructions}`);
            });
        }
        if (!relayUrl && !hasPacks()) {
            ctx.logger.warn('peon-ping: no sound packs. Run /peon install');
            return;
        }
        const now = Date.now();
        sessionStartTimes.set(session, now);
        state.session_start_time = now;
        state.prompt_timestamps = [];
        saveState(state);
        emitCategorySound('session.start');
    });
    // pi `before_agent_start` — capture the user's prompt for popup echo.
    ctx.on('session/event', (session, event) => {
        if (!isTopLevel(session))
            return;
        if (event.type !== 'user/message')
            return;
        const source = event.data.source;
        if (!source || source.kind !== 'user')
            return;
        currentPrompts.set(session, blocksText(event.data.content).slice(0, 200));
    });
    // pi `agent_start` — rapid-prompt spam detection + acknowledge sound.
    ctx.on('session/event', (session, event) => {
        if (!isTopLevel(session))
            return;
        if (event.type !== 'turn/start')
            return;
        config = loadConfig();
        state = loadState();
        if (!shouldPlaySounds())
            return;
        const now = Date.now();
        sessionStartTimes.set(session, now);
        const window = config.annoyed_window_seconds * 1000;
        state.prompt_timestamps = state.prompt_timestamps.filter((t) => now - t < window);
        state.prompt_timestamps.push(now);
        saveState(state);
        if (state.prompt_timestamps.length >= config.annoyed_threshold) {
            emitCategorySound('user.spam');
        }
        else {
            emitCategorySound('task.acknowledge');
        }
    });
    // pi `tool_execution_end` with isError — error sound (opt-in) + desktop
    // notification. An individual tool failure does NOT terminate the task, so
    // by default it stays silent (`tool_error_sounds: false`) — both the beep
    // AND the popup follow that switch; only whole-task failures announce
    // themselves (see the turn/end handler).
    ctx.on('session/event', (session, event) => {
        if (!isTopLevel(session))
            return;
        if (event.type !== 'tool/result')
            return;
        const data = event.data;
        const block = data.message?.content?.[0];
        if (!block || typeof block !== 'object')
            return;
        const toolResult = block;
        if (toolResult.type !== 'tool-result' || !toolResult.isError)
            return;
        config = loadConfig();
        state = loadState();
        if (!shouldPlaySounds())
            return;
        if (config.tool_error_sounds) {
            emitCategorySound('task.error');
            if (config.enabled && !state.paused && config.desktop_notifications) {
                const project = projectName(session);
                const errText = extractToolErrorText(toolResult);
                const detail = errText || 'failed';
                const source = event.data.message?.source;
                const toolName = toolNameFor(session, source?.callId);
                const { title, body } = buildNotifyContent('error', project, `[${toolName}]: ${detail}`);
                sendNotification(title, body, config, undefined, 'error', currentPrompts.get(session), sessionDeepLink(session));
            }
        }
    });
    // pi `agent_end` — completion sound + summary popup for a normal finish,
    // error sound + failure popup when the task terminates unexpectedly.
    ctx.on('session/event', (session, event) => {
        if (!isTopLevel(session))
            return;
        if (event.type !== 'turn/end')
            return;
        config = loadConfig();
        state = loadState();
        if (!shouldPlaySounds())
            return;
        const now = Date.now();
        if (now - state.last_stop_time < 1500)
            return;
        state.last_stop_time = now;
        const reason = event.data.reason;
        const completed = reason.kind === 'completed';
        if (completed) {
            // Silent window only suppresses task.complete, never failures.
            const silentMs = config.silent_window_seconds * 1000;
            const startTime = sessionStartTimes.get(session) ?? state.session_start_time;
            if (silentMs > 0 && now - startTime < silentMs)
                return;
            saveState(state);
            emitCategorySound('task.complete');
            if (config.enabled && !state.paused) {
                const project = projectName(session);
                const summary = extractLastAssistantText(getSessionEvents(session));
                const { title, body } = buildNotifyContent('done', project, summary || undefined);
                sendNotification(title, body, config, undefined, 'done', currentPrompts.get(session), sessionDeepLink(session));
            }
        }
        else {
            // Unexpected termination (error / aborted / blocked / max-tokens /
            // interrupted): beep the error sound and surface it in a popup.
            saveState(state);
            emitCategorySound('task.error');
            if (config.enabled && !state.paused && config.desktop_notifications) {
                const project = projectName(session);
                const { title, body } = buildNotifyContent('error', project, turnEndFailureLabel(reason));
                sendNotification(title, body, config, undefined, 'error', currentPrompts.get(session), sessionDeepLink(session));
            }
        }
    });
    // pi `session_compact` — resource-limit sound + notification. Like the
    // fork, we fire on the event AFTER compaction completes, not before.
    // Compaction is a routine background event, so it belongs to the
    // `resource.limit` category — OFF by default. Both the beep and the popup
    // follow that category switch.
    ctx.on('session/event', (session, event) => {
        if (!isTopLevel(session))
            return;
        if (event.type !== 'compaction/end')
            return;
        config = loadConfig();
        state = loadState();
        if (!shouldPlaySounds())
            return;
        if (!config.categories['resource.limit'])
            return;
        emitCategorySound('resource.limit');
        if (config.enabled && !state.paused && config.desktop_notifications) {
            const project = projectName(session);
            const { title, body } = buildNotifyContent('compacted', project);
            sendNotification(title, body, config, undefined, 'compacted', undefined, sessionDeepLink(session));
        }
    });
    // Web settings: the Settings page (client half of this package) talks to
    // the host through a plugin-owned `/peon/api` HTTP prefix (get / set /
    // action), which the host bridges to the pi config / state files and to
    // pack install / preview / refresh. A plugin-owned route is used instead of
    // the `peon-ping` settings namespace because dsh rc.6's apiproxy exposes
    // only allowlisted settings namespaces to web clients — a third-party
    // namespace is filtered from `settings.describe` and answers
    // `settings-not-exposed` even when registered. The route mounts once the
    // `webServer` service is available (web surfaces only), and is fenced by
    // the same browser-trust check the shell's own routes use.
    {
        const entry = () => buildSettingsEntry(loadConfig(), loadState(), listPacks().map((p) => p.name));
        /** Persist one full section through to the pi files. */
        const writeSection = (section) => {
            const fileConfig = configFromSettings(section, loadConfig());
            saveConfig(fileConfig);
            const fileState = loadState();
            fileState.paused = section.paused;
            saveState(fileState);
        };
        /** Execute one client command (pack install / preview / refresh). */
        const runAction = async (action) => {
            const section = entry();
            let notice = section._notice;
            let packs = section.packs;
            const { command, names } = parseAction(action);
            if (command === 'install') {
                installing = true;
                try {
                    const progress = [];
                    const report = await runInstall(names, (msg) => {
                        progress.push(msg);
                        ctx.logger.info(`peon-ping: ${msg}`);
                    });
                    packs = listPacks().map((p) => p.name);
                    notice = report.cancelled
                        ? `Install cancelled (${report.installed}/${report.total} packs).`
                        : report.installed > 0
                            ? `Installed ${report.installed}/${report.total} packs${report.failed.length > 0 ? `; failed: ${report.failed.join(', ')}` : ''}.`
                            : `No packs installed (${report.total} attempted${report.failed.length > 0 ? `; failed: ${report.failed.join(', ')}` : ''}).`;
                }
                finally {
                    installing = false;
                }
            }
            else if (command === 'preview') {
                const previewed = previewPackSound(section.default_pack);
                notice = previewed !== null ? `Previewing ${previewed}.` : 'No preview sound available (install packs first).';
            }
            else if (command === 'refresh') {
                packs = listPacks().map((p) => p.name);
                notice = `${packs.length} pack${packs.length === 1 ? '' : 's'} installed.`;
            }
            else if (command.length > 0) {
                notice = `Unknown action "${command}".`;
            }
            return { section: { ...section, packs, _notice: notice, _action: '' }, notice };
        };
        // Desktop has webServer but no webRuntime. Requiring both made the
        // settings route silently unmount and every /peon/api call answer 405.
        ctx.inject(['webServer'], (sctx) => {
            const host = sctx;
            // The injected service context exposes services through get(); reading
            // host.webServer directly works on older Web builds but is undefined on
            // the 0.2.x Desktop host.
            const webServer = (host.get?.('webServer') ?? host.webServer);
            if (!webServer)
                return;
            let webRuntime;
            try {
                webRuntime = (host.get?.('webRuntime') ?? host.webRuntime);
            }
            catch {
                // webRuntime is optional and absent on Desktop; get() may throw for an
                // unregistered service on some Cordis versions.
                webRuntime = undefined;
            }
            ctx.effect(() => webServer.register({
                kind: 'prefix',
                path: '/peon/api',
                handler: async (req, res) => {
                    if (!isTrustedRequest(req, webRuntime?.trustedHosts ?? [])) {
                        writeError(res, 403, 'forbidden', 'forbidden');
                        return;
                    }
                    const url = new URL(req.url ?? '/', 'http://dsh.internal');
                    if (req.method === 'GET' && url.pathname === '/peon/api/events') {
                        res.writeHead(200, {
                            'content-type': 'text/event-stream',
                            'cache-control': 'no-cache, no-transform',
                            'connection': 'keep-alive',
                        });
                        let heartbeat;
                        const cleanup = () => {
                            if (heartbeat !== undefined)
                                clearInterval(heartbeat);
                            guiClients.delete(res);
                        };
                        guiClients.add(res);
                        try {
                            res.write('event: ready\ndata: {"type":"ready"}\n\n');
                        }
                        catch {
                            cleanup();
                            return;
                        }
                        heartbeat = setInterval(() => {
                            try {
                                res.write(': ping\n\n');
                            }
                            catch {
                                cleanup();
                            }
                        }, 25_000);
                        req.on('close', cleanup);
                        res.on('close', cleanup);
                        res.on('error', cleanup);
                        return;
                    }
                    if (req.method === 'GET' && url.pathname.startsWith('/peon/api/audio')) {
                        const rawCat = url.pathname.slice('/peon/api/audio'.length).replace(/^\//, '') || 'session.start';
                        const requestedPack = url.searchParams.get('pack') || null;
                        let sound = null;
                        if (requestedPack !== null) {
                            sound = getPackSoundFile(requestedPack, rawCat);
                        }
                        else {
                            const currentConfig = loadConfig();
                            const currentState = loadState();
                            sound = pickSound(rawCat, currentConfig, currentState);
                            if (sound !== null)
                                saveState(currentState);
                        }
                        if (!sound) {
                            writeError(res, 404, 'not-found', 'sound not found');
                            return;
                        }
                        const ext = extname(sound.file).toLowerCase();
                        const mime = ext === '.mp3' ? 'audio/mpeg' : ext === '.ogg' ? 'audio/ogg' : 'audio/wav';
                        res.writeHead(200, {
                            'content-type': mime,
                            'cache-control': 'no-store',
                            'access-control-allow-origin': '*',
                        });
                        createReadStream(sound.file).pipe(res);
                        return;
                    }
                    if (req.method !== 'POST') {
                        writeError(res, 405, 'method-error', 'method not allowed');
                        return;
                    }
                    const pathname = new URL(req.url ?? '/', 'http://dsh.internal').pathname;
                    const method = pathname.startsWith('/peon/api/') ? pathname.slice('/peon/api/'.length) : undefined;
                    if (method === undefined || method.includes('/')) {
                        writeError(res, 404, 'not-found', `unknown peon API method "${method ?? ''}"`);
                        return;
                    }
                    try {
                        const payload = (await readJsonBody(req));
                        if (method === 'get') {
                            writeOk(res, entry());
                        }
                        else if (method === 'set') {
                            const field = typeof payload.field === 'string' ? payload.field : '';
                            if (field === '' || !(field in entry())) {
                                writeError(res, 400, 'bad-request', `unknown field "${field}"`);
                                return;
                            }
                            const section = { ...entry(), [field]: payload.value };
                            writeSection(section);
                            writeOk(res, entry());
                        }
                        else if (method === 'action') {
                            const action = typeof payload.action === 'string' ? payload.action : '';
                            const { section, notice } = await runAction(action);
                            writeSection(section);
                            writeOk(res, { ...entry(), _notice: notice });
                        }
                        else {
                            writeError(res, 404, 'not-found', `unknown peon API method "${method}"`);
                        }
                    }
                    catch (error) {
                        writeError(res, 400, 'bad-request', error instanceof Error ? error.message : String(error));
                    }
                },
            }), 'dsh-reminder: /peon/api routes');
        });
    }
}
//# sourceMappingURL=index.js.map