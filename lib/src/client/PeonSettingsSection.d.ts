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
import type { ReactNode } from 'react';
import type { PeonKey } from './locales.ts';
/** Client-side mirror of the host settings section (type-only). */
export interface PeonSettingsValue {
    default_pack: string;
    volume: number;
    enabled: boolean;
    desktop_notifications: boolean;
    tool_error_sounds: boolean;
    silent_window_seconds: number;
    relay_mode: 'auto' | 'local' | 'relay';
    paused: boolean;
    categories: Record<string, boolean>;
    packs: string[];
    _action: string;
    _notice: string;
}
/** Full component props: owner props (close) + injected translation face. */
export interface PeonSectionProps {
    /** Close the settings panel (shell affordance). */
    close: () => void;
    /** Bound dictionary lookup. */
    t: (key: PeonKey) => string;
}
export declare function PeonSettingsSection(props: PeonSectionProps): ReactNode;
