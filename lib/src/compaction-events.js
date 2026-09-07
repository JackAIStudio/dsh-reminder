/**
 * Compaction vocabulary for the session event firehose.
 *
 * Mirrors the `compaction/*` declarations from
 * `@deepseek-ai/dsh-compaction/types` (which augments
 * `@deepseek-ai/dsh-session/types`), so this package's typecheck sees
 * `compaction/end` on `SessionEventMap` without depending on the compaction
 * package at build time. The runtime never imports values from this file; the
 * events flow through the same `session/event` firehose regardless.
 */
export {};
//# sourceMappingURL=compaction-events.js.map