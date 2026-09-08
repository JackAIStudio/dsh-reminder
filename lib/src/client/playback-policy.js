/**
 * When a completion sound may play in the browser.
 *
 * Local GUI (packaged Chromium app, Chrome tab, Electron window) talks to
 * `localhost` / `127.0.0.1`. The host plugin already plays through the
 * machine's speakers (`afplay` / `paplay` / …). Playing Web Audio as well
 * stacks the same clip on top of itself.
 *
 * Remote GUIs (phone via LAN/public URL, cloud web) are not the host
 * machine — those pages still need Web Audio.
 *
 * @module dsh-reminder/client/playback-policy
 */
/** Same 5s window the host uses on `state.last_stop_time`. */
export const CLIENT_AUTOPLAY_DEBOUNCE_MS = 5000;
/** localStorage key shared by every same-origin tab / PWA window. */
export const AUTOPLAY_STORAGE_KEY = 'dsh-reminder:last-autoplay-at';
/** In-process lock so two dock listeners in one tab cannot race localStorage. */
let memoryLastAutoplayAt;
/** True for addresses that share speakers with the dsh host process. */
export function isLoopbackHostname(hostname) {
    if (hostname == null || hostname === '')
        return false;
    const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0:0:0:0:0:0:0:1') {
        return true;
    }
    if (host.endsWith('.localhost'))
        return true;
    return false;
}
/**
 * Browser autoplay is for remote pages only. Subagent composers must stay
 * silent — the parent turn still owns the one completion sound.
 */
export function clientShouldAutoPlayCompletion(input) {
    if (isLoopbackHostname(input.hostname))
        return false;
    if (input.subagent != null)
        return false;
    return true;
}
export function completionAudioUrl(category, now = Date.now()) {
    return `/peon/api/audio/${encodeURIComponent(category)}?t=${now}`;
}
export function previewAudioUrl(pack, now = Date.now()) {
    return `/peon/api/audio/session.start?pack=${encodeURIComponent(pack)}&t=${now}`;
}
/** Pick the completion vs error clip from the session snapshot. */
export function completionCategoryFromSnapshot(lastAgentError) {
    return typeof lastAgentError === 'string' && lastAgentError.length > 0
        ? 'task.error'
        : 'task.complete';
}
export function resetAutoplayClaimForTests() {
    memoryLastAutoplayAt = undefined;
}
/**
 * First caller within `debounceMs` wins. Same-tab listeners share the
 * in-memory lock; same-origin tabs also share localStorage.
 */
export function claimAutoplay(now = Date.now(), debounceMs = CLIENT_AUTOPLAY_DEBOUNCE_MS, storage) {
    if (memoryLastAutoplayAt !== undefined && now - memoryLastAutoplayAt < debounceMs)
        return false;
    if (storage) {
        try {
            const raw = storage.getItem(AUTOPLAY_STORAGE_KEY);
            if (raw != null) {
                const prev = Number(raw);
                if (Number.isFinite(prev) && now - prev < debounceMs) {
                    memoryLastAutoplayAt = prev;
                    return false;
                }
            }
            storage.setItem(AUTOPLAY_STORAGE_KEY, String(now));
        }
        catch {
            // private mode / disabled storage — memory lock is enough for this tab
        }
    }
    memoryLastAutoplayAt = now;
    return true;
}
//# sourceMappingURL=playback-policy.js.map