import { describe, it, expect, beforeEach } from 'vitest'
import {
  SOUND_EVENT_CLAIM_TTL_MS,
  SOUND_EVENT_STORAGE_PREFIX,
  claimSoundEvent,
  completionAudioUrl,
  previewAudioUrl,
  resetSoundEventClaimsForTests,
} from '../src/client/playback-policy'

/** Minimal Storage implementation backed by a Map (same-origin tab model). */
class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'length' | 'key'> {
  private readonly map = new Map<string, string>()

  get length(): number {
    return this.map.size
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }

  removeItem(key: string): void {
    this.map.delete(key)
  }
}

describe('claimSoundEvent', () => {
  beforeEach(() => {
    resetSoundEventClaimsForTests()
  })

  it('lets one delivery play and suppresses a duplicate in the same page', () => {
    const storage = new MemoryStorage()
    expect(claimSoundEvent('event-1', storage, 1000)).toBe(true)
    expect(claimSoundEvent('event-1', storage, 1001)).toBe(false)
  })

  it('suppresses a duplicate across same-origin tabs', () => {
    const storage = new MemoryStorage()
    expect(claimSoundEvent('event-1', storage, 1000)).toBe(true)
    // A second tab has its own in-memory set but shares localStorage.
    resetSoundEventClaimsForTests()
    expect(claimSoundEvent('event-1', storage, 1001)).toBe(false)
    expect(claimSoundEvent('event-2', storage, 1002)).toBe(true)
  })

  it('prunes claims older than the TTL', () => {
    const storage = new MemoryStorage()
    const staleKey = SOUND_EVENT_STORAGE_PREFIX + 'stale'
    storage.setItem(staleKey, '0')
    expect(claimSoundEvent('fresh', storage, SOUND_EVENT_CLAIM_TTL_MS + 1)).toBe(true)
    expect(storage.getItem(staleKey)).toBeNull()
  })
})

describe('audio urls', () => {
  it('encodes category and pack', () => {
    expect(completionAudioUrl('task.complete', 1)).toBe('/peon/api/audio/task.complete?t=1')
    expect(previewAudioUrl('peon', 2)).toBe('/peon/api/audio/session.start?pack=peon&t=2')
  })
})
