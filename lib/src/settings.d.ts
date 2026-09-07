/**
 * Settings section bridge for the dsh-reminder web settings page.
 *
 * The web GUI's Settings page (client half of this package) reads and writes
 * the host through this plugin's own `/peon/api` HTTP route — not through a
 * settings namespace, because dsh rc.6's apiproxy only exposes allowlisted
 * namespaces to web clients (third-party namespaces are filtered even when
 * registered). The host bridges the section to the same
 * `~/.config/peon-ping/config.json` + `state.json` files the pi plugin uses,
 * so event handlers and pi stay in sync.
 *
 * The section carries the full config plus three host-maintained fields:
 * - `packs`   — installed pack names (host writes after install/refresh)
 * - `_action` — client→host command field (`install[:<names>]`, `preview`,
 *   `refresh`); the host executes it and clears it
 * - `_notice` — host→client one-line result (install report, preview label)
 *
 * @module dsh-reminder/settings
 */
import type { PeonConfig, PeonState, RelayMode } from './types.ts';
/** All fields the web settings page exposes, plus host-maintained ones. */
export interface PeonSettings {
    default_pack: string;
    volume: number;
    enabled: boolean;
    desktop_notifications: boolean;
    tool_error_sounds: boolean;
    silent_window_seconds: number;
    relay_mode: RelayMode;
    paused: boolean;
    categories: Record<string, boolean>;
    packs: string[];
    _action: string;
    _notice: string;
}
/** Namespace id string (kept for logs and the client-side mirror). */
export declare const PEON_SETTINGS_NS_ID = "peon-ping";
/** Build the initial (base-layer) section from the current files. */
export declare function buildSettingsEntry(config: PeonConfig, state: PeonState, packs: string[]): PeonSettings;
/**
 * Extract the pi config-file fields from a settings section, preserving any
 * fields the web page does not expose (annoyed_*, playback_wait_seconds) from
 * the current file when writing back.
 */
export declare function configFromSettings(section: PeonSettings, current: PeonConfig): PeonConfig;
/** Default config used when the file is absent (mirrors DEFAULT_CONFIG). */
export declare function defaultConfig(): PeonConfig;
/** Whether a section carries any client-driven change the host must act on. */
export declare function hasAction(section: PeonSettings): boolean;
/** Parse the `_action` field into a command and optional pack names. */
export declare function parseAction(action: string): {
    command: string;
    names: string[];
};
