import { GameModule } from '../../core/GameModule';

export class AnalyticsModule extends GameModule {
    readonly id = 'analytics';
    readonly name = 'Analytics';
    readonly description = 'Tracks gameplay telemetry from domain events.';

    private unsubscribeQuestCompleted: (() => void) | null = null;
    private unsubscribeQuestFailed: (() => void) | null = null;

    onEnable(): void {
        if (!this.kernel) return;

        this.unsubscribeQuestCompleted = this.kernel.events.on('quest:completed', () => {
            const settings = this.kernel!.state;
            const engine = this.kernel!.getService('engine');

            engine?.analyticsEngine?.trackDailyMetrics?.('quest_complete', 1);
            settings.researchStats.totalCombat += 1;
        });

        this.unsubscribeQuestFailed = this.kernel.events.on('quest:failed', () => {
            const engine = this.kernel!.getService('engine');
            engine?.analyticsEngine?.trackDailyMetrics?.('quest_fail', 1);
        });
    }

    onDisable(): void {
        if (this.unsubscribeQuestCompleted) {
            this.unsubscribeQuestCompleted();
            this.unsubscribeQuestCompleted = null;
        }

        if (this.unsubscribeQuestFailed) {
            this.unsubscribeQuestFailed();
            this.unsubscribeQuestFailed = null;
        }
    }

    renderSettings(container: HTMLElement): void {
        if (!this.kernel) return;
        const settings = this.kernel.state;

        const section = container.createDiv({ cls: 'sisy-module-settings' });
        section.createEl('h4', { text: '📊 Analytics Settings' });
        section.createEl('p', { text: `Days Tracked: ${(settings.dayMetrics || []).length}`, attr: { style: 'font-size:0.85em; color:var(--text-muted);' } });
        section.createEl('p', { text: `Weekly Reports: ${(settings.weeklyReports || []).length}`, attr: { style: 'font-size:0.85em; color:var(--text-muted);' } });

        const unlocked = (settings.achievements || []).filter((a: any) => a.unlocked).length;
        section.createEl('p', { text: `Achievements: ${unlocked}/${(settings.achievements || []).length} unlocked`, attr: { style: 'font-size:0.85em; color:var(--text-muted);' } });
    }
}
