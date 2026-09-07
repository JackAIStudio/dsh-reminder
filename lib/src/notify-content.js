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
import { execSync } from "node:child_process";
/** Maximum characters of the assistant's last response to show in the body. */
const MAX_SUMMARY_CHARS = 120;
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
export function resolveProjectName(cwd, sessionName) {
    // 1. Session name (highest priority — user explicitly set it, or the
    //    harness auto-titled the session)
    const name = sessionName?.trim();
    if (name)
        return sanitizeLabel(name);
    // 2. Git remote repo name
    const gitRepo = readGitRepoName(cwd);
    if (gitRepo)
        return sanitizeLabel(gitRepo);
    // 3. Folder name fallback. Normalize backslashes to forward slashes first:
    //    `node:path`'s basename only treats the host's native separator
    //    specially, so a Windows path on a POSIX host (or vice versa) would
    //    otherwise keep the whole path. Taking the last segment manually keeps
    //    the result identical on every OS.
    const folder = cwd
        .replace(/\\/g, "/")
        .replace(/\/+$/, "")
        .split("/")
        .pop();
    return sanitizeLabel(folder ?? "") || "project";
}
function readGitRepoName(cwd) {
    try {
        const out = execSync("git remote get-url origin", {
            cwd,
            stdio: ["ignore", "pipe", "ignore"],
            timeout: 2000,
            encoding: "utf8",
        }).trim();
        if (!out)
            return null;
        // Trim trailing slash, take last path segment, strip .git suffix
        const repo = out.replace(/\/$/, "").split(/[\/:]/).pop();
        return repo ? repo.replace(/\.git$/, "") : null;
    }
    catch {
        return null;
    }
}
/** Strip characters that don't play well in popup titles. */
function sanitizeLabel(s) {
    return s.replace(/[^a-zA-Z0-9 ._\-\u4e00-\u9fff]/g, "").trim().slice(0, 50);
}
/** Extract the plain text of one message's content blocks. */
function blocksToText(content, joinWith) {
    if (!content || !Array.isArray(content))
        return "";
    return content
        .filter((block) => typeof block === "object" &&
        block !== null &&
        block.type === "text")
        .map((block) => block.text)
        .join(joinWith)
        .replace(/\s+/g, " ")
        .trim();
}
/**
 * Extract the assistant's last text response from the DSH session event log.
 * Used as the notification body so the popup shows what actually happened.
 *
 * Walks events in reverse to find the most recent `assistant/message` event
 * with non-empty text content. Tool-call-only turns are skipped — they don't
 * tell the user anything useful in a popup.
 */
export function extractLastAssistantText(events) {
    if (!events || events.length === 0)
        return "";
    for (let i = events.length - 1; i >= 0; i--) {
        const event = events[i];
        if (!event || typeof event !== "object")
            continue;
        if (event.type !== "assistant/message")
            continue;
        const message = event.data?.message;
        if (!message || typeof message !== "object")
            continue;
        const content = message.content;
        const text = blocksToText(Array.isArray(content) ? content : undefined, " ");
        if (text)
            return truncate(text, MAX_SUMMARY_CHARS);
    }
    return "";
}
/**
 * Extract error text from a `tool/result` block's content.
 *
 * The DSH `tool/result` message carries a single `tool-result` block whose
 * `content` holds the tool's model-facing output: for the bash tool that is
 * the combined stdout + stderr + "Command exited with code N"; for other
 * tools it's the thrown error message. We concatenate all text blocks and
 * truncate. Same shape as the pi plugin's `ToolExecutionEndEvent.result`.
 */
export function extractToolErrorText(result) {
    if (!result || typeof result !== "object")
        return "";
    const content = result.content;
    if (!Array.isArray(content))
        return "";
    const text = blocksToText(content, "\n");
    return text ? truncate(text, MAX_SUMMARY_CHARS) : "";
}
function truncate(s, max) {
    if (s.length <= max)
        return s;
    // Try to cut at a word boundary near the limit
    const cut = s.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut) + "…";
}
/** Human-readable status label for the title. */
const STATUS_LABEL = {
    done: "done",
    error: "error",
    compacted: "compacted",
};
/**
 * Build notification title + body for a given event.
 *
 * title: "<project> · <status>"
 * body:  event-specific (assistant summary for done, tool name for error,
 *        fixed text for compacted).
 */
export function buildNotifyContent(status, project, bodyOverride) {
    const title = `${project} · ${STATUS_LABEL[status]}`;
    let body;
    if (bodyOverride !== undefined) {
        body = bodyOverride;
    }
    else if (status === "done") {
        body = "Task complete";
    }
    else if (status === "error") {
        body = "Tool failed";
    }
    else {
        body = "Context compacted";
    }
    return { title, body, status };
}
//# sourceMappingURL=notify-content.js.map