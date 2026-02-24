import { Notice } from 'obsidian';
import { GameModule } from '../../core/GameModule';

export class ProgressionModule extends GameModule {
    readonly id = 'progression';
    readonly name = 'Progression';
    readonly description = 'XP, leveling, and skill growth from completed quests.';

    private unsubscribeQuestCompleted: (() => void) | null = null;
    private unsubscribeRewardGranted: (() => void) | null = null;

    onEnable(): void {
        if (!this.kernel) return;

        this.unsubscribeQuestCompleted = this.kernel.events.on('quest:completed', (payload) => {
            const settings = this.kernel!.state;
            const engine = this.kernel!.getService('engine');

            let xp = payload.xpReward;
            const skill = settings.skills.find((entry) => entry.name === payload.skillName);
            if (skill) {
                skill.rust = 0;
                skill.xpReq = Math.max(1, Math.floor(skill.xpReq / 1.1));
                skill.lastUsed = new Date().toISOString();
                skill.xp += 1;
                if (skill.xp >= skill.xpReq) {
                    skill.level++;
                    skill.xp = 0;
                    new Notice(`🧠 ${skill.name} Leveled Up!`);
                }
            }

            if (payload.secondarySkill && payload.secondarySkill !== 'None') {
                const secondarySkill = settings.skills.find((entry) => entry.name === payload.secondarySkill);
                if (secondarySkill && skill) {
                    if (!skill.connections) skill.connections = [];
                    if (!skill.connections.includes(payload.secondarySkill)) {
                        skill.connections.push(payload.secondarySkill);
                        new Notice('🔗 Neural Link Established');
                    }

                    xp += Math.floor(secondarySkill.level * 0.5);
                    secondarySkill.xp += 1;
                }
            }

            settings.xp += xp;

            if (settings.xp >= settings.xpReq) {
                settings.level++;
                settings.xp = 0;
                settings.xpReq = Math.floor(settings.xpReq * 1.1);
                settings.maxHp = 100 + (settings.level * 5);
                settings.hp = settings.maxHp;

                if (engine?.taunt) engine.taunt('level_up');
                const messages = engine?.analyticsEngine?.checkBossMilestones?.() ?? [];
                messages.forEach((message: string) => new Notice(message));

                if ([10, 20, 30, 50].includes(settings.level) && engine?.spawnBoss) {
                    void engine.spawnBoss(settings.level);
                }
            }
        });

        this.unsubscribeRewardGranted = this.kernel.events.on('reward:granted', (payload) => {
            this.kernel!.state.xp += payload.xp;
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

    renderSettings(container: HTMLElement): void {
        if (!this.kernel) return;
        const settings = this.kernel.state;

        const section = container.createDiv({ cls: 'sisy-module-settings' });
        section.createEl('h4', { text: '📈 Progression Settings' });
        section.createEl('p', { text: `Level: ${settings.level} — XP: ${settings.xp}/${settings.xpReq}`, attr: { style: 'font-size:0.85em; color:var(--text-muted);' } });

        const bosses = settings.bossMilestones || [];
        const defeated = bosses.filter((b: any) => b.defeated).length;
        section.createEl('p', { text: `Boss Milestones: ${defeated}/${bosses.length} defeated`, attr: { style: 'font-size:0.85em; color:var(--text-muted);' } });
    }
}
