export type Platform = "mac" | "linux" | "wsl" | "win" | "unknown";
export declare function detectPlatform(): Platform;
export declare function detectLinuxPlayer(): string | null;
export declare function detectPwshBin(): string | null;
export declare function detectWindowsPlayer(): string | null;
/**
 * Convert a WSL path to the Windows path a spawned PowerShell can open.
 * WSL2 files live under `\\wsl.localhost\<distro>\...` from Windows' side and
 * `/mnt/<drive>/...` maps to `<drive>:\...`; passing a raw `/home/...` path
 * to Windows-side APIs (`System.Windows.Media.MediaPlayer`, WinRT Toast icon
 * bindings, ...) fails SILENTLY (no exception, no sound / no icon). The
 * distro name, user name, and drive mounts are resolved dynamically via
 * `wslpath -w` on every machine — nothing here is hardcoded. Falls back to
 * the raw path when `wslpath` is unavailable (e.g. inside a container),
 * where Windows-side playback cannot work anyway.
 */
export declare function wslToWindowsPath(file: string): string;
