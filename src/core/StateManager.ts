import { SisyphusSettings } from '../types';

export const CONFIG_VERSION = 1;
export const STATE_VERSION = 1;

export const KNOWN_MODULE_IDS = [
    'survival',
    'progression',
    'economy',
    'combat',
    'productivity',
    'analytics',
    'recovery',
    'daily_lifecycle'
] as const;

export type GameMode = 'full' | 'pacifist' | 'zen' | 'hardcore' | 'custom';

export const GAME_MODE_PRESETS: Record<Exclude<GameMode, 'custom'>, readonly string[]> = {
    full: KNOWN_MODULE_IDS,
    pacifist: ['survival', 'progression', 'economy', 'productivity', 'analytics', 'recovery', 'daily_lifecycle'],
    zen: ['productivity', 'analytics', 'daily_lifecycle'],
    hardcore: ['survival', 'progression', 'combat', 'productivity', 'analytics', 'recovery', 'daily_lifecycle'],
};

export const GAME_MODE_DESCRIPTIONS: Record<GameMode, string> = {
    full: 'All systems active — the complete Sisyphus experience.',
    pacifist: 'No bosses, no rival damage. Focus on quests & progression.',
    zen: 'Pure tracking. No HP, gold, or gamification.',
    hardcore: 'No economy/shop. Earn everything through pure effort.',
    custom: 'Mix and match modules to your liking.',
};

function normalizeEnabledModules(rawIds: unknown): string[] {
    if (!Array.isArray(rawIds)) return [...KNOWN_MODULE_IDS];

    const allowed = new Set<string>(KNOWN_MODULE_IDS);
    const normalized = rawIds
        .filter((id): id is string => typeof id === 'string')
        .filter((id) => allowed.has(id));

    return normalized.length > 0 ? [...new Set(normalized)] : [...KNOWN_MODULE_IDS];
}

function detectGameMode(enabledModules: string[]): GameMode {
    const sorted = [...enabledModules].sort();
    for (const [mode, preset] of Object.entries(GAME_MODE_PRESETS) as [Exclude<GameMode, 'custom'>, readonly string[]][]) {
        const presetSorted = [...preset].sort();
        if (sorted.length === presetSorted.length && sorted.every((id, i) => id === presetSorted[i])) {
            return mode;
        }
    }
    return 'custom';
}

export interface GlobalConfig {
    enabledModules: string[];
    gameMode: GameMode;
    difficultyScale: number;
    muteAudio: boolean;
}

export interface PersistedState {
    configVersion: number;
    stateVersion: number;
    config: GlobalConfig;
    state: SisyphusSettings;
}

export interface MigrationResult {
    config: GlobalConfig;
    state: SisyphusSettings;
    migrated: boolean;
}

const DEFAULT_CONFIG: GlobalConfig = {
    enabledModules: [...KNOWN_MODULE_IDS],
    gameMode: 'full',
    difficultyScale: 1,
    muteAudio: false
};

function isPersistedState(value: unknown): value is Partial<PersistedState> {
    if (!value || typeof value !== 'object') return false;

    const candidate = value as Partial<PersistedState>;
    return !!candidate.config && !!candidate.state;
}

export class StateManager {
    constructor(private readonly defaultState: SisyphusSettings) { }

    migrate(rawData: unknown): MigrationResult {
        if (isPersistedState(rawData)) {
            const nextConfig: GlobalConfig = {
                ...DEFAULT_CONFIG,
                ...rawData.config,
                enabledModules: normalizeEnabledModules(rawData.config?.enabledModules),
                gameMode: rawData.config?.gameMode ?? detectGameMode(normalizeEnabledModules(rawData.config?.enabledModules))
            };

            return {
                config: nextConfig,
                state: Object.assign({}, this.defaultState, rawData.state),
                migrated: rawData.configVersion !== CONFIG_VERSION || rawData.stateVersion !== STATE_VERSION
            };
        }

        const legacyState = Object.assign({}, this.defaultState, (rawData ?? {}) as Partial<SisyphusSettings>);

        return {
            config: {
                ...DEFAULT_CONFIG,
                muteAudio: legacyState.muted ?? DEFAULT_CONFIG.muteAudio,
                enabledModules: normalizeEnabledModules(undefined)
            },
            state: legacyState,
            migrated: true
        };
    }

    toPersistedState(config: GlobalConfig, state: SisyphusSettings): PersistedState {
        return {
            configVersion: CONFIG_VERSION,
            stateVersion: STATE_VERSION,
            config: {
                ...DEFAULT_CONFIG,
                ...config,
                enabledModules: normalizeEnabledModules(config.enabledModules)
            },
            state
        };
    }
}
