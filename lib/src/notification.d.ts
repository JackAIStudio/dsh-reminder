import type { NotifyStatus } from "./notify-content.ts";
import { type Platform } from "./platform.ts";
export declare const DEFAULT_ICON_PATH: string;
export type Notifier = "osascript" | "notify-send" | "powershell" | "winforms";
export interface NotifyCommand {
    bin: string;
    args: string[];
}
export declare function escapeNotificationText(text: string): string;
export declare function detectNotifier(platform?: Platform, commandExists?: (cmd: string) => boolean): Notifier | null;
export declare function resolveIcon(packPath?: string): string;
export declare function buildNotifyCommand(notifier: Notifier | string, title: string, body: string, iconPath?: string, status?: NotifyStatus, promptLine?: string): NotifyCommand | null;
export interface NotifyOptions {
    platform?: Platform;
    iconPath?: string;
    status?: NotifyStatus;
    promptLine?: string;
}
export declare function sendDesktopNotification(title: string, body: string, options?: NotifyOptions | Platform): boolean;
