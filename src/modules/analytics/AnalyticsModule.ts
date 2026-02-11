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
}
