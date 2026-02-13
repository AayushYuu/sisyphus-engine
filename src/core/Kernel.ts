import { SisyphusSettings } from '../types';
import { EventBus } from './EventBus';
import { GameModule } from './GameModule';
import { GlobalConfig, StateManager } from './StateManager';
import { ModuleManager } from './ModuleManager';
import { KernelServiceMap } from './services';

export interface KernelEvents {
    'clock:tick': { now: string };
    'session:start': { now: string };
    'quest:completed': {
        questId: string;
        difficulty: number;
        skillName: string;
        secondarySkill: string;
        highStakes: boolean;
        isBoss: boolean;
        bossLevel: number | null;
        xpReward: number;
        goldReward: number;
    };
    'reward:granted': {
        xp: number;
        gold: number;
        reason: string;
    };
    'quest:failed': {
        questId: string;
        reason?: string;
        damage: number;
        manualAbort: boolean;
        bossHpPenalty: number;
    };
    'file:modified': { path: string };
}

interface KernelContext {
    config: GlobalConfig;
    state: SisyphusSettings;
    save: (config: GlobalConfig, state: SisyphusSettings) => Promise<void>;
    services?: Partial<KernelServiceMap>;
}

export class SisyphusKernel {
    readonly events = new EventBus<KernelEvents>();
    readonly modules = new ModuleManager();
    readonly stateManager: StateManager;

    private readonly services: Partial<KernelServiceMap>;

    config: GlobalConfig;
    state: SisyphusSettings;

    constructor(private readonly context: KernelContext) {
        this.config = context.config;
        this.state = context.state;
        this.stateManager = new StateManager(this.state);
        this.services = { ...(context.services ?? {}) };
    }


    setService<K extends keyof KernelServiceMap>(name: K, service: KernelServiceMap[K]): void {
        this.services[name] = service;
    }

    getService<K extends keyof KernelServiceMap>(name: K): KernelServiceMap[K] | null {
        return (this.services[name] as KernelServiceMap[K] | undefined) ?? null;
    }

    registerModule(module: GameModule): void {
        module.onLoad(this);
        this.modules.register(module);
    }

    enableConfiguredModules(): void {
        this.config.enabledModules.forEach((moduleId) => {
            try {
                this.modules.enable(moduleId);
            } catch (error) {
                console.error(`[SisyphusKernel] Could not enable module '${moduleId}'.`, error);
            }
        });
    }

    async persist(): Promise<void> {
        await this.context.save(this.config, this.state);
    }

    shutdown(): void {
        this.modules.disableAll();
        this.modules.getAll().forEach((module) => module.onUnload());
        this.events.clear();
    }

    isModuleEnabled(moduleId: string): boolean {
        return this.modules.isEnabled(moduleId);
    }
}
