import type { PeonConfig, PeonState } from "./types.ts";
export declare function migrateConfig(raw: Record<string, any>): Record<string, any>;
export declare function ensureDirs(): void;
export declare function loadConfig(): PeonConfig;
export declare function saveConfig(config: PeonConfig): void;
export declare function loadState(): PeonState;
export declare function saveState(state: PeonState): void;
