import type { PackManifest, PeonConfig, PeonState, Registry } from "./types.ts";
export declare function getPacksDir(): string;
export declare function listPacks(): {
    name: string;
    displayName: string;
    path: string;
}[];
export declare function loadManifest(packPath: string): PackManifest | null;
export declare function pickSound(category: string, config: PeonConfig, state: PeonState): {
    file: string;
    label: string;
} | null;
export declare function fetchRegistry(): Promise<Registry | null>;
export declare function downloadPack(packName: string, registry: Registry | null, onProgress?: (msg: string) => void): Promise<boolean>;
