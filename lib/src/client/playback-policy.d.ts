/**
 * Sound-event playback policy for the browser half.
 *
 * The host is the single source of truth for whether a category is enabled
 * and for the chosen volume. It broadcasts one `sound` event over
 * `/peon/api/events`; every connected GUI receives that event and plays it
 * locally. The host process only runs `afplay` when no GUI is connected
 * (CLI / headless), so a desktop app never stacks a host clip under the
 * renderer's Web Audio clip.
 *
 * @module dsh-reminder/client/playback-policy
 */
/** localStorage prefix for cross-tab sound-event claims. */
export declare const SOUND_EVENT_STORAGE_PREFIX = "dsh-reminder:sound:";
/** How long a claimed event id is kept before pruning. */
export declare const SOUND_EVENT_CLAIM_TTL_MS = 60000;
export declare function completionAudioUrl(category: string, now?: number): string;
export declare function previewAudioUrl(pack: string, now?: number): string;
/**
 * First same-origin tab to see an event id plays it; later tabs stay silent.
 * The host sends one id per lifecycle sound, so this only dedupes duplicate
 * deliveries (multiple tabs / a reloaded listener), never two real sounds.
 */
export declare function claimSoundEvent(id: string, storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'length' | 'key'> | null, now?: number): boolean;
export declare function resetSoundEventClaimsForTests(): void;
