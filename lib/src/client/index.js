/**
 * dsh-reminder settings section, browser half.
 *
 * Registers the "peon-ping sounds" page in web Settings right below
 * "Agent Presets" (`settings.section` order 21; agent-presets is 20). The
 * page reads and writes the host through the plugin's own `/peon/api` HTTP
 * prefix (get / set / action) instead of a settings namespace: dsh rc.6's
 * apiproxy only exposes allowlisted settings namespaces to web clients, so
 * third-party namespaces are filtered out even when registered. The route is
 * served by this plugin's host half on the same origin, so the page needs no
 * settings-scope transport.
 *
 * @module dsh-reminder/client
 */
import React, { useRef, useEffect } from 'react';
import { PeonSettingsSection } from "./PeonSettingsSection.js";
import { en, zh } from "./locales.js";
/** Dictionary namespace owned by this plugin. */
export const NS = 'settings.peon';
/** Services required by the settings section (copy + slot declaration only). */
export const inject = ['slots', 'locale'];
/** Contribute the peon-ping sounds settings page. */
function AutoAudioListener(props) {
    const running = typeof props.useSession === "function"
        ? props.useSession((s) => s?.running)
        : false;
    const prevRunning = useRef(running);
    useEffect(() => {
        if (prevRunning.current === true && running === false) {
            try {
                const audio = new Audio(`/peon/api/audio/task.complete?t=${Date.now()}`);
                audio.volume = 0.8;
                audio.play().catch(() => { });
            }
            catch { }
        }
        prevRunning.current = running;
    }, [running]);
    return null;
}
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-reminder: copy dictionaries');
    const t = ctx.locale.bind(NS);
    const injected = () => ({ t, close: () => { } });
    ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'peon-ping',
        order: 21,
        label: () => t('nav'),
        locale: NS,
        inject: injected,
    }, PeonSettingsSection));
    ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
        name: 'conversation.composer.dock',
        id: 'peon-ping-listener',
        order: 100,
    }, (props) => React.createElement(AutoAudioListener, props)));
}
//# sourceMappingURL=index.js.map