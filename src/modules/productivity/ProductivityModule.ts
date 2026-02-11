import { GameModule } from '../../core/GameModule';

export class ProductivityModule extends GameModule {
    readonly id = 'productivity';
    readonly name = 'Productivity';
    readonly description = 'Quest completion counters, streaks, and mission progression.';

    private unsubscribeQuestCompleted: (() => void) | null = null;

    onEnable(): void {
        if (!this.kernel) return;

        this.unsubscribeQuestCompleted = this.kernel.events.on('quest:completed', (payload) => {
            const settings = this.kernel!.state;
            const engine = this.kernel!.getService('engine');

            settings.questsCompletedToday += 1;
            engine?.analyticsEngine?.updateStreak?.();

            engine?.checkDailyMissions?.({
                type: 'complete',
                difficulty: payload.difficulty,
                skill: payload.skillName,
                secondarySkill: payload.secondarySkill,
                highStakes: payload.highStakes
            });
        });
    }

    onDisable(): void {
        if (this.unsubscribeQuestCompleted) {
            this.unsubscribeQuestCompleted();
            this.unsubscribeQuestCompleted = null;
        }
    }
}
