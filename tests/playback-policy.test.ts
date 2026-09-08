import { describe, it, expect, beforeEach } from 'vitest'
import {
  AUTOPLAY_STORAGE_KEY,
  CLIENT_AUTOPLAY_DEBOUNCE_MS,
  claimAutoplay,
  clientShouldAutoPlayCompletion,
  completionAudioUrl,
  completionCategoryFromSnapshot,
  isLoopbackHostname,
  previewAudioUrl,
  resetAutoplayClaimForTests,
} from '../src/client/playback-policy'

describe('isLoopbackHostname', () => {
  it('treats localhost, 127.0.0.1 and ::1 as loopback', () => {
    expect(isLoopbackHostname('localhost')).toBe(true)
    expect(isLoopbackHostname('127.0.0.1')).toBe(true)
    expect(isLoopbackHostname('::1')).toBe(true)
    expect(isLoopbackHostname('[::1]')).toBe(true)
    expect(isLoopbackHostname('Foo.Localhost')).toBe(true)
  })

  it('does not treat LAN, public or cloud hosts as loopback', () => {
    expect(isLoopbackHostname('192.168.1.8')).toBe(false)
    expect(isLoopbackHostname('mac.followjack.cn')).toBe(false)
    expect(isLoopbackHostname('dsh.followjack.cn')).toBe(false)
    expect(isLoopbackHostname('')).toBe(false)
    expect(isLoopbackHostname(undefined)).toBe(false)
  })
})

describe('clientShouldAutoPlayCompletion', () => {
  it('skips packaged app / Chrome tabs on the host machine', () => {
    expect(clientShouldAutoPlayCompletion({ hostname: '127.0.0.1' })).toBe(false)
    expect(clientShouldAutoPlayCompletion({ hostname: 'localhost' })).toBe(false)
  })

  it('allows phone / cloud pages that are not the host speakers', () => {
    expect(clientShouldAutoPlayCompletion({ hostname: 'mac.followjack.cn' })).toBe(true)
    expect(clientShouldAutoPlayCompletion({ hostname: '192.168.1.8' })).toBe(true)
  })

  it('skips subagent composers so only the parent turn beeps', () => {
    expect(clientShouldAutoPlayCompletion({
      hostname: 'mac.followjack.cn',
      subagent: { address: 'child' },
    })).toBe(false)
  })
})

describe('completionCategoryFromSnapshot', () => {
  it('plays task.error when the session recorded an agent error', () => {
    expect(completionCategoryFromSnapshot('boom')).toBe('task.error')
  })

  it('plays task.complete on a clean finish', () => {
    expect(completionCategoryFromSnapshot(null)).toBe('task.complete')
    expect(completionCategoryFromSnapshot('')).toBe('task.complete')
  })
})

describe('audio urls', () => {
  it('encodes category and pack', () => {
    expect(completionAudioUrl('task.complete', 1)).toBe('/peon/api/audio/task.complete?t=1')
    expect(previewAudioUrl('peon', 2)).toBe('/peon/api/audio/session.start?pack=peon&t=2')
  })
})

describe('claimAutoplay', () => {
  beforeEach(() => {
    resetAutoplayClaimForTests()
  })

  it('lets the first caller win and debounce later ones', () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value) },
    }
    expect(claimAutoplay(1000, CLIENT_AUTOPLAY_DEBOUNCE_MS, storage)).toBe(true)
    expect(claimAutoplay(1001, CLIENT_AUTOPLAY_DEBOUNCE_MS, storage)).toBe(false)
    expect(claimAutoplay(1000 + CLIENT_AUTOPLAY_DEBOUNCE_MS, CLIENT_AUTOPLAY_DEBOUNCE_MS, storage)).toBe(true)
    expect(store.get(AUTOPLAY_STORAGE_KEY)).toBe(String(1000 + CLIENT_AUTOPLAY_DEBOUNCE_MS))
  })
})
