import { Notice, moment } from 'obsidian';
import { DeathModal } from '../../ui/modals';
import { GameModule } from '../../core/GameModule';

export class DailyLifecycleModule extends GameModule {
    readonly id = 'daily_lifecycle';
    readonly name = 'Daily Lifecycle';
    readonly description = 'Handles daily login reset, rot damage, and daily chaos roll.';

    private unsubscribeSessionStart: (() => void) | null = null;

    onEnable(): void {
        if (!this.kernel) return;

        this.unsubscribeSessionStart = this.kernel.events.on('session:start', async () => {
            const settings = this.kernel!.state;
            const app = this.kernel!.getService('app');
            const plugin = this.kernel!.getService('plugin');
            const engine = this.kernel!.getService('engine');

            const today = moment().format('YYYY-MM-DD');
            if (settings.lastLogin) {
                const daysDiff = moment().diff(moment(settings.lastLogin), 'days');
                if (daysDiff > 2) {
                    const rotDamage = (daysDiff - 1) * 10;
                    if (rotDamage > 0) {
                        settings.hp -= rotDamage;
                        settings.history.push({ date: today, status: 'rot', xpEarned: -rotDamage });
                    }

                    if (settings.hp <= 0) {
                        new DeathModal(app, plugin).open();
                        await engine?.save?.();
                        return;
                    }
                }
            }

            if (settings.lastLogin !== today) {
                settings.maxHp = 100 + (settings.level * 5);
                settings.hp = Math.min(settings.maxHp, settings.hp + 20);
                settings.damageTakenToday = 0;
                settings.lockdownUntil = '';
                settings.lastLogin = today;

                const todayMoment = moment();
                settings.skills.forEach((skill) => {
                    if (skill.lastUsed && todayMoment.diff(moment(skill.lastUsed), 'days') > 3 && !engine?.isResting?.()) {
                        skill.rust = Math.min(10, (skill.rust || 0) + 1);
                        skill.xpReq = Math.floor(skill.xpReq * 1.1);
                    }
                });

                if (settings.dailyMissionDate !== today) {
                    engine?.rollDailyMissions?.();
                }

                await engine?.rollChaos?.(true);
                await engine?.save?.();
                return;
            }

            await engine?.save?.();
        });
    }

    onDisable(): void {
        if (this.unsubscribeSessionStart) {
            this.unsubscribeSessionStart();
            this.unsubscribeSessionStart = null;
        }
    }
}
