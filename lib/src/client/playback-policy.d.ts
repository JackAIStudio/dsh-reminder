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
export declare const CLIENT_AUTOPLAY_DEBOUNCE_MS = 5000;
/** localStorage key shared by every same-origin tab / PWA window. */
export declare const AUTOPLAY_STORAGE_KEY = "dsh-reminder:last-autoplay-at";
/** True for addresses that share speakers with the dsh host process. */
export declare function isLoopbackHostname(hostname: string | undefined | null): boolean;
/**
 * Browser autoplay is for remote pages only. Subagent composers must stay
 * silent — the parent turn still owns the one completion sound.
 */
export declare function clientShouldAutoPlayCompletion(input: {
    hostname: string | undefined | null;
    subagent?: unknown;
}): boolean;
export declare function completionAudioUrl(category: string, now?: number): string;
export declare function previewAudioUrl(pack: string, now?: number): string;
/** Pick the completion vs error clip from the session snapshot. */
export declare function completionCategoryFromSnapshot(lastAgentError: unknown): 'task.complete' | 'task.error';
export declare function resetAutoplayClaimForTests(): void;
/**
 * First caller within `debounceMs` wins. Same-tab listeners share the
 * in-memory lock; same-origin tabs also share localStorage.
 */
export declare function claimAutoplay(now?: number, debounceMs?: number, storage?: Pick<Storage, 'getItem' | 'setItem'> | null): boolean;
