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

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { PeonSettingsSection, type PeonSectionProps } from './PeonSettingsSection.tsx'
import { en, zh, type PeonKey } from './locales.ts'
import { claimSoundEvent, completionAudioUrl } from './playback-policy.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** peon-ping sounds settings copy. */
    'settings.peon': PeonKey
  }
}

/** Dictionary namespace owned by this plugin. */
export const NS = 'settings.peon'

/** Services required by the settings section (copy + slot declaration only). */
export const inject = ['slots', 'locale']

/** One host-broadcast lifecycle sound. */
interface PeonSoundEvent {
  type?: string
  id?: string
  category?: string
  volume?: number
}

let currentAudio: HTMLAudioElement | undefined

function playSoundEvent(category: string, volume: number): void {
  void (async () => {
    try {
      if (currentAudio !== undefined) {
        currentAudio.pause()
        currentAudio.currentTime = 0
      }
      const audio = new Audio(completionAudioUrl(category))
      currentAudio = audio
      audio.volume = Math.max(0, Math.min(1, volume))
      audio.addEventListener('ended', () => {
        if (currentAudio === audio) currentAudio = undefined
      }, { once: true })
      await audio.play()
    } catch (error) {
      console.warn('[dsh-reminder] Web Audio playback failed:', error)
    }
  })()
}

/**
 * Subscribe to the host's sound-event stream. EventSource reconnects on its
 * own after a host restart; the host treats a disconnected page as headless
 * and falls back to native audio until this page reconnects.
 */
function connectSoundEvents(): () => void {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') return () => {}
  const source = new EventSource('/peon/api/events')
  source.onmessage = (message) => {
    try {
      const event = JSON.parse(message.data) as PeonSoundEvent
      if (event.type !== 'sound' || typeof event.category !== 'string') return
      const id = typeof event.id === 'string' ? event.id : ''
      const storage = typeof localStorage === 'undefined' ? null : localStorage
      if (!claimSoundEvent(id, storage)) return
      const volume = typeof event.volume === 'number' ? event.volume : 0.8
      playSoundEvent(event.category, volume)
    } catch {
      // Ignore malformed frames; the stream itself is best-effort.
    }
  }
  return () => source.close()
}

export function apply(ctx: ClientContext): void {
  // dsh-app-badge also has a browser-notification fallback. Mark this client
  // as the notification owner so the two plugins never show two popups for
  // the same turn completion.
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__DSH_REMINDER_NOTIFICATIONS__ = true
  }

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-reminder: copy dictionaries')
  ctx.effect(connectSoundEvents, 'dsh-reminder: sound events')

  const t = ctx.locale.bind(NS)
  const injected = (): PeonSectionProps => ({ t, close: () => {} })

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'peon-ping',
    order: 21,
    label: () => t('nav'),
    locale: NS,
    inject: injected,
  }, PeonSettingsSection))
}
