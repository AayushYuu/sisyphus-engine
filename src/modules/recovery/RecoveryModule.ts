import { Notice, moment } from 'obsidian';
import { GameModule } from '../../core/GameModule';

export class RecoveryModule extends GameModule {
    readonly id = 'recovery';
    readonly name = 'Recovery';
    readonly description = 'Handles timed recovery effects such as buff expiration.';

    private unsubscribeClockTick: (() => void) | null = null;

    onEnable(): void {
        if (!this.kernel) return;

        this.unsubscribeClockTick = this.kernel.events.on('clock:tick', () => {
            const settings = this.kernel!.state;
            const engine = this.kernel!.getService('engine');
            const now = moment();
            const initialCount = settings.activeBuffs.length;

            settings.activeBuffs = settings.activeBuffs.filter((buff) => moment(buff.expiresAt).isAfter(now));

            if (settings.activeBuffs.length < initialCount) {
                new Notice('A potion effect has worn off.');
                engine?.trigger?.('update');
            }
        });
    }

    onDisable(): void {
        if (this.unsubscribeClockTick) {
            this.unsubscribeClockTick();
            this.unsubscribeClockTick = null;
        }
    }
}
