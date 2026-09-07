/**
 * Host-side pack management for the dsh-reminder port.
 *
 * The pi plugin's TUI panels became the web Settings page (client half of
 * this package); this module keeps the two host actions the page triggers
 * through the settings `_action` field: downloading packs and previewing a
 * sound. Config and state remain in the same `~/.config/peon-ping/` files the
 * pi plugin uses, so packs and settings are shared between pi and dsh.
 *
 * @module dsh-reminder/ui
 */
import type { PeonConfig, PeonState } from "./types.ts";
export interface InstallReport {
    installed: number;
    total: number;
    failed: string[];
    cancelled: boolean;
}
/** Download packs; `onProgress` receives one-line updates. */
export declare function runInstall(packNames: string[], onProgress: (msg: string) => void, isCancelled?: () => boolean): Promise<InstallReport>;
/** Preview the session.start sound of one pack; returns a label or null. */
export declare function previewPackSound(packName: string): string | null;
/** Get the physical sound file path for a category in a pack. */
export declare function getPackSoundFile(packName: string, category?: string): {
    file: string;
    label: string;
} | null;
export type { PeonConfig, PeonState };
