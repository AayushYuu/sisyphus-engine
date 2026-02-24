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

    renderSettings(container: HTMLElement): void {
        if (!this.kernel) return;
        const settings = this.kernel.state;

        const section = container.createDiv({ cls: 'sisy-module-settings' });
        section.createEl('h4', { text: '⚡ Productivity Settings' });
        section.createEl('p', { text: `Quests Completed Today: ${settings.questsCompletedToday}`, attr: { style: 'font-size:0.85em; color:var(--text-muted);' } });
        section.createEl('p', { text: `Streak: ${settings.streak?.current || 0} days (best: ${settings.streak?.longest || 0})`, attr: { style: 'font-size:0.85em; color:var(--text-muted);' } });
        section.createEl('p', { text: `Daily Missions: ${(settings.dailyMissions || []).filter((m: any) => m.completed).length}/${(settings.dailyMissions || []).length}`, attr: { style: 'font-size:0.85em; color:var(--text-muted);' } });
    }
}
