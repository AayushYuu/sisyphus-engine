import { Notice } from 'obsidian';
import { DeathModal } from '../../ui/modals';
import { GameModule } from '../../core/GameModule';

export class SurvivalModule extends GameModule {
    readonly id = 'survival';
    readonly name = 'Survival';
    readonly description = 'HP damage, lockdown, and death handling for failed quests.';

    private unsubscribeQuestFailed: (() => void) | null = null;
    private unsubscribeQuestCompleted: (() => void) | null = null;

    onEnable(): void {
        if (!this.kernel) return;

        this.unsubscribeQuestFailed = this.kernel.events.on('quest:failed', (payload) => {
            const settings = this.kernel!.state;
            const engine = this.kernel!.getService('engine');
            const app = this.kernel!.getService('app');
            const plugin = this.kernel!.getService('plugin');
            const audio = this.kernel!.getService('audio');

            settings.hp -= payload.damage;
            settings.damageTakenToday += payload.damage;
            if (!payload.manualAbort) settings.rivalDmg += 1;

            if (audio?.playSound) audio.playSound('fail');
            if (engine?.checkDailyMissions) engine.checkDailyMissions({ type: 'damage' });

            if (settings.damageTakenToday > 50) {
                if (engine?.meditationEngine?.triggerLockdown) engine.meditationEngine.triggerLockdown();
                if (engine?.trigger) engine.trigger('lockdown');
            }

            if (settings.hp <= 0) {
                new DeathModal(app, plugin).open();
                return;
            }

            if (payload.bossHpPenalty > 0) {
                new Notice(`☠️ Boss Crush: +${payload.bossHpPenalty} Damage`);
            }
        });

        this.unsubscribeQuestCompleted = this.kernel.events.on('quest:completed', () => {
            const settings = this.kernel!.state;
            const engine = this.kernel!.getService('engine');
            const app = this.kernel!.getService('app');
            const plugin = this.kernel!.getService('plugin');

            if (settings.dailyModifier.name !== 'Adrenaline') return;

            settings.hp -= 5;
            settings.damageTakenToday += 5;

            if (settings.damageTakenToday > 50) {
                if (engine?.meditationEngine?.triggerLockdown) engine.meditationEngine.triggerLockdown();
                if (engine?.trigger) engine.trigger('lockdown');
                new Notice('Overexertion! LOCKDOWN INITIATED.');
            }

            if (settings.hp <= 0) {
                new DeathModal(app, plugin).open();
            }
        });

    }

    onDisable(): void {
        if (this.unsubscribeQuestFailed) {
            this.unsubscribeQuestFailed();
            this.unsubscribeQuestFailed = null;
        }
        if (this.unsubscribeQuestCompleted) {
            this.unsubscribeQuestCompleted();
            this.unsubscribeQuestCompleted = null;
        }
    }
}
