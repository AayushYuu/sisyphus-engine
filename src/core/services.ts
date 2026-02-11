import { App } from 'obsidian';
import type SisyphusPlugin from '../main';

export interface EngineModuleBridge {
    checkDailyMissions?: (context: {
        type: string;
        difficulty?: number;
        skill?: string;
        secondarySkill?: string;
        highStakes?: boolean;
    }) => void;
    meditationEngine?: {
        triggerLockdown?: () => void;
    };
    trigger?: (eventName: string) => void;
    taunt?: (eventName: string) => void;
    analyticsEngine?: {
        checkBossMilestones?: () => string[];
        defeatBoss?: (level: number) => { message?: string } | undefined;
        updateStreak?: () => void;
        trackDailyMetrics?: (key: string, value: number) => void;
    };
    spawnBoss?: (level: number) => Promise<void> | void;
    rollDailyMissions?: () => void;
    rollChaos?: (showModal?: boolean) => Promise<void> | void;
    save?: () => Promise<void> | void;
    isResting?: () => string | boolean;
}

export interface AudioModuleBridge {
    playSound?: (soundId: string) => void;
}

export interface KernelServiceMap {
    app: App;
    engine: EngineModuleBridge;
    audio: AudioModuleBridge;
    plugin: SisyphusPlugin;
}
