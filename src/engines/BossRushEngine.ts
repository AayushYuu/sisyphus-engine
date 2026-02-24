import { SisyphusSettings, BossRushState } from '../types';
import { Notice } from 'obsidian';
import { NotificationEngine } from './NotificationEngine';

const DEFAULT_RUSH: BossRushState = {
    active: false,
    queue: [],
    currentIndex: 0,
    completedCount: 0,
    totalReward: { xp: 0, gold: 0 },
};

export class BossRushEngine {
    static ensureState(settings: SisyphusSettings): BossRushState {
        if (!settings.bossRush) {
            settings.bossRush = { ...DEFAULT_RUSH, queue: [], totalReward: { xp: 0, gold: 0 } };
        }
        return settings.bossRush;
    }

    static startRush(settings: SisyphusSettings, questPaths: string[]): boolean {
        if (questPaths.length < 2) {
            new Notice('Boss Rush requires at least 2 quests.');
            return false;
        }

        const rush = this.ensureState(settings);
        if (rush.active) {
            new Notice('A Boss Rush is already active!');
            return false;
        }

        rush.active = true;
        rush.queue = [...questPaths];
        rush.currentIndex = 0;
        rush.startedAt = new Date().toISOString();
        rush.completedCount = 0;
        rush.totalReward = { xp: 0, gold: 0 };

        new Notice(`⚔️ BOSS RUSH INITIATED — ${questPaths.length} quests queued!`);
        NotificationEngine.push(settings, {
            icon: '⚔️',
            title: 'Boss Rush Started!',
            message: `${questPaths.length} quests queued. Complete them all for massive rewards. Failure means death.`,
            category: 'combat',
        });

        return true;
    }

    static getCurrentQuest(settings: SisyphusSettings): string | null {
        const rush = this.ensureState(settings);
        if (!rush.active || rush.currentIndex >= rush.queue.length) return null;
        return rush.queue[rush.currentIndex];
    }

    static advanceRush(settings: SisyphusSettings, xpEarned: number, goldEarned: number): { finished: boolean; nextQuest: string | null } {
        const rush = this.ensureState(settings);
        if (!rush.active) return { finished: false, nextQuest: null };

        rush.completedCount++;
        rush.totalReward.xp += xpEarned;
        rush.totalReward.gold += goldEarned;
        rush.currentIndex++;

        if (rush.currentIndex >= rush.queue.length) {
            // Rush complete — massive bonus!
            const bonusXp = Math.floor(rush.totalReward.xp * 1); // 2x total = 1x bonus
            const bonusGold = Math.floor(rush.totalReward.gold * 1);
            settings.xp += bonusXp;
            settings.gold += bonusGold;

            new Notice(`🏆 BOSS RUSH COMPLETE! Bonus: +${bonusXp} XP, +${bonusGold} Gold!`, 10000);
            NotificationEngine.push(settings, {
                icon: '🏆',
                title: 'Boss Rush Conquered!',
                message: `${rush.completedCount} quests completed. Bonus: +${bonusXp} XP, +${bonusGold} Gold.`,
                category: 'combat',
            });

            this.resetRush(settings);
            return { finished: true, nextQuest: null };
        }

        const remaining = rush.queue.length - rush.currentIndex;
        new Notice(`⚔️ Rush Progress: ${rush.completedCount}/${rush.queue.length} — ${remaining} remaining!`);
        return { finished: false, nextQuest: rush.queue[rush.currentIndex] };
    }

    static failRush(settings: SisyphusSettings): void {
        const rush = this.ensureState(settings);
        if (!rush.active) return;

        new Notice(`💀 BOSS RUSH FAILED at quest ${rush.completedCount + 1}/${rush.queue.length}. All progress lost.`, 10000);
        NotificationEngine.push(settings, {
            icon: '💀',
            title: 'Boss Rush Failed!',
            message: `Failed at quest ${rush.completedCount + 1}/${rush.queue.length}. No bonus rewards.`,
            category: 'combat',
        });

        this.resetRush(settings);
    }

    static isActive(settings: SisyphusSettings): boolean {
        const rush = this.ensureState(settings);
        return rush.active;
    }

    static getProgress(settings: SisyphusSettings): { current: number; total: number; queueNames: string[] } {
        const rush = this.ensureState(settings);
        return {
            current: rush.currentIndex,
            total: rush.queue.length,
            queueNames: rush.queue.map(p => {
                const parts = p.split('/');
                return parts[parts.length - 1].replace(/\.md$/, '');
            }),
        };
    }

    private static resetRush(settings: SisyphusSettings): void {
        settings.bossRush = { ...DEFAULT_RUSH, queue: [], totalReward: { xp: 0, gold: 0 } };
    }
}
