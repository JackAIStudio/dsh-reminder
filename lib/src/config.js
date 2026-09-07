import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { CONFIG_PATH, DATA_DIR, DEFAULT_CONFIG, DEFAULT_STATE, PACKS_DIR, STATE_PATH } from "./constants.js";
import { DEFAULT_ICON_PATH } from "./notification.js";
export function migrateConfig(raw) {
    if (raw.active_pack !== undefined) {
        if (raw.default_pack === undefined) {
            raw.default_pack = raw.active_pack;
        }
        delete raw.active_pack;
    }
    return raw;
}
const ICON_URL = "https://raw.githubusercontent.com/PeonPing/peon-ping/main/docs/peon-icon.png";
export function ensureDirs() {
    mkdirSync(DATA_DIR, { recursive: true });
    mkdirSync(PACKS_DIR, { recursive: true });
    ensureDefaultIcon();
}
function ensureDefaultIcon() {
    if (existsSync(DEFAULT_ICON_PATH))
        return;
    fetch(ICON_URL, { signal: AbortSignal.timeout(5000) })
        .then((resp) => {
        if (!resp.ok)
            return;
        return resp.arrayBuffer();
    })
        .then((buf) => {
        if (buf)
            writeFileSync(DEFAULT_ICON_PATH, Buffer.from(buf));
    })
        .catch(() => { });
}
export function loadConfig() {
    try {
        const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
        const migrated = migrateConfig(raw);
        return { ...DEFAULT_CONFIG, ...migrated, categories: { ...DEFAULT_CONFIG.categories, ...migrated.categories } };
    }
    catch {
        return { ...DEFAULT_CONFIG };
    }
}
export function saveConfig(config) {
    ensureDirs();
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
}
export function loadState() {
    try {
        const raw = JSON.parse(readFileSync(STATE_PATH, "utf8"));
        return { ...DEFAULT_STATE, ...raw };
    }
    catch {
        return { ...DEFAULT_STATE };
    }
}
export function saveState(state) {
    ensureDirs();
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
}
//# sourceMappingURL=config.js.map