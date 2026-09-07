/**
 * peon-ping for DeepSeek Harness — a faithful port of the pi plugin
 * `pi-peon-ping-win` (https://github.com/Gohan/pi-peon-ping-win).
 *
 * Plays themed audio clips from OpenPeon sound packs on lifecycle events and
 * shows desktop notifications. The pi event mapping:
 *
 *   pi `session_start`          → dsh `session/created` (top-level sessions)
 *   pi `before_agent_start`     → dsh `user/message` (kind 'user'; prompt capture)
 *   pi `agent_start`            → dsh `turn/start` (spam detection + ack)
 *   pi `tool_execution_end` err → dsh `tool/result` with isError
 *   pi `agent_end`              → dsh `turn/end` (task complete + summary popup)
 *   pi `session_compact`        → dsh `compaction/end` (fires AFTER compaction)
 *
 * The pi TUI settings/install panels move into the web GUI: the Settings
 * page (the client half of this package) reads and writes the `peon-ping`
 * settings namespace, placed right below "Agent Presets" in Settings.
 *
 * Config and state stay in `~/.config/peon-ping/` — the same files the pi
 * plugin uses — so packs and settings are shared between pi and dsh.
 *
 * @module dsh-reminder
 */
import type { Context } from '@deepseek-ai/cordis';
import './src/compaction-events.ts';
export declare const name = "peon-ping";
export declare function apply(ctx: Context): void;
