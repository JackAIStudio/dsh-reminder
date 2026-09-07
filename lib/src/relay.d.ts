import type { RelayMode } from "./types.ts";
export type RemoteSessionType = "ssh" | "devcontainer" | "codespaces";
export interface RemoteSession {
    type: RemoteSessionType;
    relayUrl: string;
}
export declare function detectSessionType(): RemoteSessionType | null;
export declare function detectRemoteSession(): RemoteSession | null;
export declare function getRelayUrl(relayMode: RelayMode): string | null;
export declare function checkRelayHealth(relayUrl: string): Promise<boolean>;
export declare function relayPlayCategory(relayUrl: string, category: string): Promise<boolean>;
export declare function relayNotify(relayUrl: string, title: string, body: string): Promise<boolean>;
export declare function relaySetupInstructions(session: RemoteSession): string;
