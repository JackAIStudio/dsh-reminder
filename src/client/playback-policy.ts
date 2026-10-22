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
export const SOUND_EVENT_STORAGE_PREFIX = 'dsh-reminder:sound:'

/** How long a claimed event id is kept before pruning. */
export const SOUND_EVENT_CLAIM_TTL_MS = 60_000

/** In-process claims so two listeners in one page cannot race. */
const memoryClaims = new Set<string>()

export function completionAudioUrl(category: string, now = Date.now()): string {
  return `/peon/api/audio/${encodeURIComponent(category)}?t=${now}`
}

export function previewAudioUrl(pack: string, now = Date.now()): string {
  return `/peon/api/audio/session.start?pack=${encodeURIComponent(pack)}&t=${now}`
}

/**
 * First same-origin tab to see an event id plays it; later tabs stay silent.
 * The host sends one id per lifecycle sound, so this only dedupes duplicate
 * deliveries (multiple tabs / a reloaded listener), never two real sounds.
 */
export function claimSoundEvent(
  id: string,
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'length' | 'key'> | null,
  now = Date.now(),
): boolean {
  if (id === '') return true
  if (memoryClaims.has(id)) return false
  memoryClaims.add(id)
  if (memoryClaims.size > 200) {
    const oldest = memoryClaims.values().next().value
    if (oldest !== undefined) memoryClaims.delete(oldest)
  }
  if (!storage) return true
  const key = SOUND_EVENT_STORAGE_PREFIX + id
  try {
    if (storage.getItem(key) !== null) return false
    storage.setItem(key, String(now))
    pruneSoundEventClaims(storage, now)
    return true
  } catch {
    // private mode / disabled storage — the in-memory claim is enough
    return true
  }
}

function pruneSoundEventClaims(
  storage: Pick<Storage, 'getItem' | 'removeItem' | 'length' | 'key'>,
  now: number,
): void {
  try {
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i)
      if (key === null || !key.startsWith(SOUND_EVENT_STORAGE_PREFIX)) continue
      const claimedAt = Number(storage.getItem(key))
      if (!Number.isFinite(claimedAt) || now - claimedAt > SOUND_EVENT_CLAIM_TTL_MS) {
        storage.removeItem(key)
      }
    }
  } catch {
    // Storage can disappear mid-iteration in private mode; playback still works.
  }
}

export function resetSoundEventClaimsForTests(): void {
  memoryClaims.clear()
}
