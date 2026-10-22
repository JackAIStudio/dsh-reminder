import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DEFAULT_CONFIG, DEFAULT_STATE } from '../src/constants'

const { mockPlay, mockNotify } = vi.hoisted(() => ({
  mockPlay: vi.fn(),
  mockNotify: vi.fn(),
}))

vi.mock('../src/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/audio')>()
  return { ...actual, playCategorySound: mockPlay, sendNotification: mockNotify }
})

vi.mock('../src/packs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/packs')>()
  return {
    ...actual,
    // Make shouldPlaySounds() true without touching the real pack directory.
    listPacks: () => [{ name: 'peon', displayName: 'Peon', path: '/tmp/peon' }],
  }
})

vi.mock('../src/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/config')>()
  return {
    ...actual,
    ensureDirs: () => {},
    loadConfig: () => ({ ...DEFAULT_CONFIG, relay_mode: 'local' as const }),
    loadState: () => ({ ...DEFAULT_STATE }),
    saveConfig: () => {},
    saveState: () => {},
  }
})

function makeSession() {
  return {
    id: 's-sound',
    header: { id: 's-sound', version: 0, createdAt: Date.now(), cwd: process.cwd(), delegationDepth: undefined as number | undefined },
    events: [],
    get surface() { return {} },
  }
}

describe('GUI sound ownership', () => {
  let listeners: Record<string, Function[]>
  let routeHandler: ((req: any, res: any) => any) | undefined
  let closeHandlers: Function[]
  let writes: string[]

  beforeEach(async () => {
    mockPlay.mockClear()
    mockNotify.mockClear()
    listeners = {}
    routeHandler = undefined
    closeHandlers = []
    writes = []

    const webServer = {
      register: (route: any) => {
        if (route.path === '/peon/api') routeHandler = route.handler
        return () => {}
      },
    }

    const stubCtx: any = {
      on: (name: string, handler: Function) => {
        (listeners[name] ??= []).push(handler)
        return () => {}
      },
      get: (name: string) => name === 'webServer' ? webServer : undefined,
      inject: (_names: string[], callback: (ctx: any) => void) => { callback(stubCtx) },
      effect: (fn: () => unknown) => fn(),
      logger: { warn: () => {}, info: () => {}, error: () => {} },
    }

    const { apply } = await import('../index')
    apply(stubCtx)
  })

  afterEach(() => {
    for (const handler of closeHandlers) handler()
    closeHandlers = []
  })

  async function connectGui() {
    const res = {
      writeHead: vi.fn(),
      write: vi.fn((chunk: string) => { writes.push(chunk) }),
      end: vi.fn(),
      on: vi.fn((event: string, handler: Function) => {
        if (event === 'close' || event === 'error') closeHandlers.push(handler)
      }),
    }
    const req = {
      method: 'GET',
      url: '/peon/api/events',
      headers: { host: '127.0.0.1:3080' },
      on: vi.fn((event: string, handler: Function) => {
        if (event === 'close') closeHandlers.push(handler)
      }),
    }
    expect(routeHandler).toBeDefined()
    await routeHandler!(req, res)
  }

  async function completeTurn() {
    const session = makeSession()
    for (const handler of listeners['session/event']!) {
      await handler(session, {
        type: 'turn/end',
        seq: 1,
        time: 1,
        data: { turn: 1, reason: { kind: 'completed' } },
      })
    }
  }

  it('lets a connected GUI own task.complete and skips host audio', async () => {
    await connectGui()
    await completeTurn()

    expect(mockPlay).not.toHaveBeenCalled()
    expect(writes.some((chunk) => chunk.includes('"category":"task.complete"'))).toBe(true)
    // The banner still comes from the host, but the sound is not duplicated.
    expect(mockNotify).toHaveBeenCalled()
  })

  it('uses host audio when no GUI is connected (CLI/headless fallback)', async () => {
    await completeTurn()
    expect(mockPlay).toHaveBeenCalledWith('task.complete', expect.anything(), expect.anything())
  })
})
