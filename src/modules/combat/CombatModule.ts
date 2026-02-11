import { Notice } from 'obsidian';
import { GameModule } from '../../core/GameModule';
import { VictoryModal } from '../../ui/modals';

export class CombatModule extends GameModule {
    readonly id = 'combat';
    readonly name = 'Combat';
    readonly description = 'Boss defeat processing and victory checks.';

    private unsubscribeQuestCompleted: (() => void) | null = null;

    onEnable(): void {
        if (!this.kernel) return;

        this.unsubscribeQuestCompleted = this.kernel.events.on('quest:completed', (payload) => {
            if (!payload.isBoss || payload.bossLevel === null) return;

            const engine = this.kernel!.getService('engine');
            const app = this.kernel!.getService('app');
            const plugin = this.kernel!.getService('plugin');
            const result = engine?.analyticsEngine?.defeatBoss?.(payload.bossLevel);

            if (result?.message) {
                new Notice(result.message);
            }

            if (this.kernel!.state.gameWon) {
                new VictoryModal(app, plugin).open();
            }
        });
    }

    onDisable(): void {
        if (this.unsubscribeQuestCompleted) {
            this.unsubscribeQuestCompleted();
            this.unsubscribeQuestCompleted = null;
        }
    }
}
