import type { NotifyStatus } from "./notify-content.ts";
import type { PeonConfig, PeonState } from "./types.ts";
export declare function killPreviousSound(): void;
export declare function playSound(file: string, volume: number, waitSeconds?: number): void;
export type UiNotify = (message: string, type?: "info" | "warning" | "error") => void;
export declare function sendNotification(title: string, body: string, config: PeonConfig, uiNotify?: UiNotify, status?: NotifyStatus, promptLine?: string): void;
export declare function playCategorySound(category: string, config: PeonConfig, state: PeonState): void;
