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

function normalizeEnabledModules(rawIds: unknown): string[] {
    if (!Array.isArray(rawIds)) return [...KNOWN_MODULE_IDS];

    const allowed = new Set<string>(KNOWN_MODULE_IDS);
    const normalized = rawIds
        .filter((id): id is string => typeof id === 'string')
        .filter((id) => allowed.has(id));

    return normalized.length > 0 ? [...new Set(normalized)] : [...KNOWN_MODULE_IDS];
}

export interface GlobalConfig {
    enabledModules: string[];
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
    difficultyScale: 1,
    muteAudio: false
};

function isPersistedState(value: unknown): value is Partial<PersistedState> {
    if (!value || typeof value !== 'object') return false;

    const candidate = value as Partial<PersistedState>;
    return !!candidate.config && !!candidate.state;
}

export class StateManager {
    constructor(private readonly defaultState: SisyphusSettings) {}

    migrate(rawData: unknown): MigrationResult {
        if (isPersistedState(rawData)) {
            const nextConfig: GlobalConfig = {
                ...DEFAULT_CONFIG,
                ...rawData.config,
                enabledModules: normalizeEnabledModules(rawData.config?.enabledModules)
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
