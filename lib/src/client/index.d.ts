/**
 * dsh-reminder browser half.
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
 * It also subscribes to `/peon/api/events`. The host broadcasts exactly one
 * `sound` event per lifecycle sound and skips its own `afplay` while a GUI is
 * connected, so the desktop app / browser is the only playback owner. This is
 * the normal desktop-app arrangement: the app's UI plays the custom sound,
 * and the host process is only the headless fallback.
 *
 * @module dsh-reminder/client
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type PeonKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** peon-ping sounds settings copy. */
        'settings.peon': PeonKey;
    }
}
/** Dictionary namespace owned by this plugin. */
export declare const NS = "settings.peon";
/** Services required by the settings section (copy + slot declaration only). */
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
