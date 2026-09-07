/**
 * Notification content generation — title and body per event type.
 *
 * Strategy (informed by upstream peon-ping's peon.sh and the pi plugin's
 * notify-content.ts):
 *
 * - Title: "<project> · <status>" where <project> comes from a priority
 *   chain (session name > git remote > folder name), and <status> is a
 *   short label describing the event type (done / error / compacted).
 *   This replaces the old hardcoded "pi · <folder>" + "Task complete".
 *
 * - Body: event-specific. For task completion we extract the assistant's
 *   last text response (truncated), so the popup actually tells you what
 *   happened instead of a generic "Task complete". For errors we name the
 *   failing tool. For compaction we say so plainly.
 *
 * Ported from pi-peon-ping-win's `src/notify-content.ts`: the pi
 * `ExtensionAPI` session-name lookup became the Harness `sessionTitle`
 * service (optional), and the pi `AgentMessage[]` history became the DSH
 * `SessionEvent[]` log (`assistant/message` events).
 */
import type { SessionEvent } from "@deepseek-ai/dsh-session";
/**
 * Resolve the project label via a priority chain.
 *
 *   1. session name  — the Harness session-title projection (like pi's
 *      `pi.getSessionName()`, which upstream prefers)
 *   2. git remote repo name — `git remote get-url origin` → trailing segment
 *   3. basename(cwd)        — folder name fallback
 *
 * Upstream has more layers (.peon-label file, project_name_map glob,
 * notification_title_script); we keep it simple since sessions already
 * have a first-class title projection.
 */
export declare function resolveProjectName(cwd: string, sessionName?: string): string;
/**
 * Extract the assistant's last text response from the DSH session event log.
 * Used as the notification body so the popup shows what actually happened.
 *
 * Walks events in reverse to find the most recent `assistant/message` event
 * with non-empty text content. Tool-call-only turns are skipped — they don't
 * tell the user anything useful in a popup.
 */
export declare function extractLastAssistantText(events: readonly SessionEvent[] | undefined): string;
/**
 * Extract error text from a `tool/result` block's content.
 *
 * The DSH `tool/result` message carries a single `tool-result` block whose
 * `content` holds the tool's model-facing output: for the bash tool that is
 * the combined stdout + stderr + "Command exited with code N"; for other
 * tools it's the thrown error message. We concatenate all text blocks and
 * truncate. Same shape as the pi plugin's `ToolExecutionEndEvent.result`.
 */
export declare function extractToolErrorText(result: unknown): string;
/** Event types that produce a distinct notification status/title suffix. */
export type NotifyStatus = "done" | "error" | "compacted";
export interface NotifyContent {
    title: string;
    body: string;
    status: NotifyStatus;
}
/**
 * Build notification title + body for a given event.
 *
 * title: "<project> · <status>"
 * body:  event-specific (assistant summary for done, tool name for error,
 *        fixed text for compacted).
 */
export declare function buildNotifyContent(status: NotifyStatus, project: string, bodyOverride?: string): NotifyContent;
