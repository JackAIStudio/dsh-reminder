/**
 * dsh-reminder settings section, browser half.
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
 * @module dsh-reminder/client
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import React, { useRef, useEffect } from 'react'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { PeonSettingsSection, type PeonSectionProps } from './PeonSettingsSection.tsx'
import { en, zh, type PeonKey } from './locales.ts'
import {
  CLIENT_AUTOPLAY_DEBOUNCE_MS,
  claimAutoplay,
  clientShouldAutoPlayCompletion,
  completionAudioUrl,
  completionCategoryFromSnapshot,
} from './playback-policy.ts'

/** Host settings the remote autoplay path must still honour. */
interface PeonPlaybackGate {
  enabled?: boolean
  paused?: boolean
  categories?: Record<string, boolean>
  volume?: number
}

/** True when the peon config allows this category to beep. Fail open on network errors. */
async function remotePlaybackAllowed(category: string): Promise<{ allowed: boolean; volume: number }> {
  try {
    const response = await fetch('/peon/api/get', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })
    const parsed = (await response.json().catch(() => null)) as { ok?: boolean; value?: PeonPlaybackGate } | null
    const value = parsed?.value
    if (value === undefined) return { allowed: true, volume: 0.8 }
    if (value.enabled === false || value.paused === true) return { allowed: false, volume: 0 }
    if (value.categories?.[category] === false) return { allowed: false, volume: 0 }
    const volume = typeof value.volume === 'number' ? value.volume : 0.8
    return { allowed: true, volume }
  } catch {
    return { allowed: true, volume: 0.8 }
  }
}

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

/** Contribute the peon-ping sounds settings page. */

function AutoAudioListener(props: { useSession?: (selector: (s: any) => any) => any }): null {
  const select = typeof props.useSession === 'function' ? props.useSession : undefined
  const running = select ? select((s: any) => s?.running) : false
  const subagent = select ? select((s: any) => s?.subagent) : null
  const lastAgentError = select ? select((s: any) => s?.lastAgentError) : null
  const prevRunning = useRef(running)

  useEffect(() => {
    const wasRunning = prevRunning.current === true
    prevRunning.current = running
    if (!wasRunning || running !== false) return

    const hostname = typeof window === 'undefined' ? '' : window.location.hostname
    if (!clientShouldAutoPlayCompletion({ hostname, subagent })) return
    if (!claimAutoplay(Date.now(), CLIENT_AUTOPLAY_DEBOUNCE_MS, typeof localStorage === 'undefined' ? null : localStorage)) {
      return
    }

    const category = completionCategoryFromSnapshot(lastAgentError)
    void (async () => {
      const gate = await remotePlaybackAllowed(category)
      if (!gate.allowed) return
      try {
        const audio = new Audio(completionAudioUrl(category))
        audio.volume = gate.volume
        await audio.play()
      } catch {
        // autoplay policy or missing pack — the host may still have played
      }
    })()
  }, [running, subagent, lastAgentError])

  return null
}

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-reminder: copy dictionaries')

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

  ctx.slots.inject('conversation.composer.dock' as any, () => ctx.slots.register({
    name: 'conversation.composer.dock' as any,
    id: 'peon-ping-listener',
    order: 100,
  }, (props: any) => React.createElement(AutoAudioListener, props)))
}
