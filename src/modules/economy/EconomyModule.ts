import { GameModule } from '../../core/GameModule';

export class EconomyModule extends GameModule {
    readonly id = 'economy';
    readonly name = 'Economy';
    readonly description = 'Applies gold rewards from quest completions.';

    private unsubscribeQuestCompleted: (() => void) | null = null;
    private unsubscribeRewardGranted: (() => void) | null = null;

    onEnable(): void {
        if (!this.kernel) return;

        this.unsubscribeQuestCompleted = this.kernel.events.on('quest:completed', (payload) => {
            this.kernel!.state.gold += payload.goldReward;
        });

        this.unsubscribeRewardGranted = this.kernel.events.on('reward:granted', (payload) => {
            this.kernel!.state.gold += payload.gold;
        });
    }

    onDisable(): void {
        if (this.unsubscribeQuestCompleted) {
            this.unsubscribeQuestCompleted();
            this.unsubscribeQuestCompleted = null;
        }
        if (this.unsubscribeRewardGranted) {
            this.unsubscribeRewardGranted();
            this.unsubscribeRewardGranted = null;
        }
    }
}
