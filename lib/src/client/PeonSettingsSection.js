import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * peon-ping settings section: reads and writes the host through the plugin's
 * own `/peon/api` HTTP prefix (get / set / action), which the host bridges to
 * the pi `~/.config/peon-ping/` files and to pack install / preview /
 * refresh.
 *
 * A plugin-owned HTTP route is used instead of the `settingsScope` transport
 * because dsh rc.6's apiproxy only exposes allowlisted settings namespaces to
 * web clients — a third-party namespace is filtered from `settings.describe`
 * and answers `settings-not-exposed` even when registered. The page talks to
 * the same host origin, so the browser-trust fence on `/peon/api` is
 * satisfied by ordinary same-origin fetches.
 *
 * The component deliberately imports no Host value modules — the namespace id
 * and value shape are restated here (type-only), so the browser bundle stays
 * free of node-only imports.
 * @module dsh-reminder/client/PeonSettingsSection
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@deepseek-ai/dsh-client-ui-primitives';
import { previewAudioUrl } from "./playback-policy.js";
import css from './PeonSettingsSection.module.css';
/** Category keys in the order the pi settings panel lists them. */
const CATEGORIES = [
    { key: 'session.start', label: 'cat.session.start' },
    { key: 'task.acknowledge', label: 'cat.task.acknowledge' },
    { key: 'task.complete', label: 'cat.task.complete' },
    { key: 'task.error', label: 'cat.task.error' },
    { key: 'input.required', label: 'cat.input.required' },
    { key: 'resource.limit', label: 'cat.resource.limit' },
    { key: 'user.spam', label: 'cat.user.spam' },
];
/** Call one `/peon/api/<method>` endpoint on the same origin. */
async function peonCall(method, payload) {
    let response;
    try {
        response = await fetch(`/peon/api/${method}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
        });
    }
    catch (error) {
        throw new Error(`peon-ping: network error: ${error instanceof Error ? error.message : String(error)}`);
    }
    const parsed = (await response.json().catch(() => null));
    if (!response.ok || parsed === null || parsed.ok !== true || parsed.value === undefined) {
        throw new Error(parsed?.error?.message ?? `peon-ping: HTTP ${response.status}`);
    }
    return parsed.value;
}
/** Read the current section from the host. */
async function fetchSection() {
    return peonCall('get', {});
}
/** Write one scalar field (categories is written whole) and return the fresh section. */
async function setField(field, value) {
    return peonCall('set', { field, value });
}
/** Trigger one host action (install / preview / refresh) and return the fresh section. */
async function runAction(action) {
    return peonCall('action', { action });
}
function Row({ label, children }) {
    return (_jsxs("div", { className: css.row, children: [_jsx("span", { className: css.label, children: label }), _jsx("span", { className: css.control, children: children })] }));
}
function Toggle({ on, onChange, onText, offText }) {
    return (_jsx("button", { type: "button", className: `${css.toggle} ${on ? css.toggleOn : ''}`, onClick: () => onChange(!on), children: on ? onText : offText }));
}
export function PeonSettingsSection(props) {
    const { t } = props;
    const [value, setValue] = useState(null);
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState(null);
    const [pending, setPending] = useState(false);
    const mounted = useRef(true);
    const refresh = useCallback(async () => {
        try {
            const next = await fetchSection();
            if (!mounted.current)
                return;
            setValue(next);
            setStatus('ready');
            setError(null);
        }
        catch (cause) {
            if (!mounted.current)
                return;
            setStatus('error');
            setError(cause instanceof Error ? cause.message : String(cause));
        }
    }, []);
    useEffect(() => {
        mounted.current = true;
        void refresh();
        return () => {
            mounted.current = false;
        };
    }, [refresh]);
    if (status === 'loading' && value === null) {
        return _jsxs("div", { className: css.wrap, children: [t('notice'), "\u2026"] });
    }
    if (status === 'error' || value === null) {
        return _jsxs("div", { className: css.wrap, children: [t('notice'), ": ", error ?? t('unavailable')] });
    }
    const set = (field, next) => {
        void setField(field, next).then(refresh).catch((cause) => {
            setStatus('error');
            setError(cause instanceof Error ? cause.message : String(cause));
        });
    };
    const trigger = (action) => {
        // Preview stays in this browser. Calling the host `preview` action would
        // also `afplay` on the machine running dsh — the same clip twice when
        // the GUI is a packaged app / Chrome tab on that machine, and a stray
        // beep on the server when the GUI is a phone or cloud page.
        if (action === 'preview') {
            try {
                const pack = value?.default_pack || 'peon';
                const audio = new Audio(previewAudioUrl(pack));
                audio.volume = typeof value?.volume === 'number' ? value.volume : 1;
                audio.play().catch((error) => {
                    console.warn('[dsh-reminder] Web Audio preview failed:', error);
                });
            }
            catch (error) {
                console.warn('[dsh-reminder] new Audio error:', error);
            }
            return;
        }
        setPending(true);
        void runAction(action).then(refresh).catch((cause) => {
            setStatus('error');
            setError(cause instanceof Error ? cause.message : String(cause));
        }).finally(() => {
            setPending(false);
        });
    };
    const activePack = value.packs.includes(value.default_pack) ? value.default_pack : value.packs[0];
    return (_jsxs("div", { className: css.wrap, children: [_jsx("h2", { className: css.title, children: t('title') }), _jsx("p", { className: css.description, children: t('description') }), value._notice !== '' ? (_jsxs("div", { className: css.notice, children: [t('notice'), ": ", value._notice] })) : null, _jsxs(Row, { label: `${t('sounds')} (${t(value.paused ? 'paused' : 'active')})`, children: [_jsx(Toggle, { on: value.enabled, onChange: (next) => set('enabled', next), onText: t('enabled'), offText: t('disabled') }), _jsx(Toggle, { on: !value.paused, onChange: (next) => set('paused', !next), onText: t('active'), offText: t('paused') })] }), _jsxs(Row, { label: t('soundPack'), children: [_jsx("select", { className: css.select, value: activePack ?? '', onChange: (event) => set('default_pack', event.target.value), children: value.packs.length === 0 ? (_jsx("option", { value: "", children: t('noPacks') })) : (value.packs.map((name) => (_jsx("option", { value: name, children: name }, name)))) }), _jsx(Button, { variant: "outline", disabled: pending, onClick: () => trigger('install'), children: pending ? t('installing') : t('install') }), _jsx(Button, { variant: "outline", disabled: pending || value.packs.length === 0, onClick: () => trigger('preview'), children: t('preview') })] }), _jsx(Row, { label: `${t('volume')}: ${Math.round(value.volume * 100)}%`, children: _jsx("input", { type: "range", min: 0, max: 100, step: 10, value: Math.round(value.volume * 100), onChange: (event) => set('volume', Number(event.target.value) / 100), className: css.range }) }), _jsx(Row, { label: t('notifications'), children: _jsx(Toggle, { on: value.desktop_notifications, onChange: (next) => set('desktop_notifications', next), onText: t('enabled'), offText: t('disabled') }) }), _jsx(Row, { label: t('toolErrorAlert'), children: _jsx(Toggle, { on: value.tool_error_sounds, onChange: (next) => set('tool_error_sounds', next), onText: t('enabled'), offText: t('disabled') }) }), _jsx(Row, { label: t('silentWindow'), children: _jsx("input", { type: "number", min: 0, max: 300, value: value.silent_window_seconds, onChange: (event) => set('silent_window_seconds', Number(event.target.value) || 0), className: css.number }) }), _jsx(Row, { label: t('relayMode'), children: _jsxs("select", { className: css.select, value: value.relay_mode, onChange: (event) => set('relay_mode', event.target.value), children: [_jsx("option", { value: "auto", children: "auto" }), _jsx("option", { value: "local", children: "local" }), _jsx("option", { value: "relay", children: "relay" })] }) }), _jsxs("div", { className: css.categories, children: [_jsx("div", { className: css.catLabel, children: t('category') }), CATEGORIES.map(({ key, label }) => (_jsxs("div", { className: css.catRow, children: [_jsx("span", { children: t(label) }), _jsx(Toggle, { on: value.categories[key] !== false, onChange: (next) => {
                                    const nextCategories = { ...value.categories, [key]: next };
                                    set('categories', nextCategories);
                                }, onText: t('enabled'), offText: t('disabled') })] }, key)))] })] }));
}
//# sourceMappingURL=PeonSettingsSection.js.map