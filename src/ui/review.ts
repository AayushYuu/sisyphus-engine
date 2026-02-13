/**
 * Weekly Review Modal — Shows a narrative summary of the past week's performance.
 */
import { App, Modal, moment } from 'obsidian';
import SisyphusPlugin from '../main';
import { DayMetrics } from '../types';

export class WeeklyReviewModal extends Modal {
    plugin: SisyphusPlugin;

    constructor(app: App, plugin: SisyphusPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('sisy-review');

        const now = moment();
        const weekAgo = moment().subtract(7, 'days');

        // Filter metrics for last 7 days
        const weekMetrics = (this.plugin.settings.dayMetrics || []).filter((d: DayMetrics) => {
            const date = moment(d.date);
            return date.isAfter(weekAgo) && date.isBefore(now.clone().add(1, 'day'));
        });

        // Aggregate stats
        const totalQuests = weekMetrics.reduce((s, d) => s + (d.questsCompleted || 0), 0);
        const totalFails = weekMetrics.reduce((s, d) => s + (d.questsFailed || 0), 0);
        const totalXp = weekMetrics.reduce((s, d) => s + (d.xpEarned || 0), 0);
        const totalGold = weekMetrics.reduce((s, d) => s + (d.goldEarned || 0), 0);
        const totalDmg = weekMetrics.reduce((s, d) => s + (d.damagesTaken || 0), 0);
        const daysActive = weekMetrics.length;
        const successRate = totalQuests + totalFails > 0
            ? Math.round((totalQuests / (totalQuests + totalFails)) * 100) : 0;

        // Find best day
        let bestDay = 'N/A';
        let bestDayQuests = 0;
        weekMetrics.forEach((d: DayMetrics) => {
            if (d.questsCompleted > bestDayQuests) {
                bestDayQuests = d.questsCompleted;
                bestDay = moment(d.date).format('dddd');
            }
        });

        // Collect unique skills leveled
        const skillsSet = new Set<string>();
        weekMetrics.forEach((d: DayMetrics) => {
            (d.skillsLeveled || []).forEach(s => skillsSet.add(s));
        });

        // --- RENDER ---
        const hero = contentEl.createDiv({ cls: 'sisy-review-hero' });
        hero.createEl('h2', { text: '📊 WEEKLY DEBRIEF' });
        hero.createEl('p', { text: `${weekAgo.format('MMM D')} — ${now.format('MMM D, YYYY')}`, cls: 'sisy-review-stat-label' });

        const stats = contentEl.createDiv({ cls: 'sisy-review-stats' });

        this.stat(stats, String(totalQuests), 'Quests Done');
        this.stat(stats, `${successRate}%`, 'Success Rate');
        this.stat(stats, `+${totalXp}`, 'XP Earned');
        this.stat(stats, `+${totalGold}`, 'Gold Earned');
        this.stat(stats, String(totalDmg), 'Damage Taken');
        this.stat(stats, `${daysActive}/7`, 'Days Active');
        this.stat(stats, bestDay, 'Best Day');
        this.stat(stats, String(this.plugin.settings.streak?.current || 0), 'Current Streak');

        // Narrative
        const narrative = contentEl.createDiv({ cls: 'sisy-review-narrative' });
        let text = '';
        if (totalQuests === 0) {
            text = 'The silence of inaction hangs heavy. Not a single quest was attempted this week. The Rival grows stronger.';
        } else if (successRate >= 80) {
            text = `Exceptional week. ${totalQuests} quests completed with an ${successRate}% success rate. ` +
                `${bestDay} was your most productive day. Keep this momentum.`;
        } else if (successRate >= 50) {
            text = `A battle-worn week.  ${totalQuests} quests completed, but ${totalFails} were lost. ` +
                `Sharpen your focus next week — the Rival shows no mercy.`;
        } else {
            text = `A brutal week. Only ${successRate}% success rate across ${totalQuests + totalFails} attempts. ` +
                `${totalDmg} damage absorbed. Regroup and reconsider your strategy.`;
        }
        if (skillsSet.size > 0) {
            text += ` Skills leveled: ${Array.from(skillsSet).join(', ')}.`;
        }
        narrative.textContent = text;

        // Close button
        const close = contentEl.createDiv({ cls: 'sisy-pomodoro-controls' });
        const btn = close.createEl('button', { text: 'DISMISS', cls: 'sisy-btn mod-cta' });
        btn.onclick = () => this.close();
    }

    private stat(parent: HTMLElement, value: string, label: string) {
        const box = parent.createDiv({ cls: 'sisy-review-stat' });
        box.createDiv({ text: value, cls: 'sisy-review-stat-val' });
        box.createDiv({ text: label, cls: 'sisy-review-stat-label' });
    }

    onClose() { this.contentEl.empty(); }
}

/**
 * Boss Encounter Modal — Dramatic boss introduction with health bar.
 */
export class BossEncounterModal extends Modal {
    plugin: SisyphusPlugin;
    bossName: string;
    bossLevel: number;
    bossSubtitle: string;

    constructor(app: App, plugin: SisyphusPlugin, bossName: string, bossLevel: number, bossSubtitle: string) {
        super(app);
        this.plugin = plugin;
        this.bossName = bossName;
        this.bossLevel = bossLevel;
        this.bossSubtitle = bossSubtitle;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('sisy-boss-modal');
        contentEl.style.animation = 'boss-entrance 0.6s ease-out';

        // Phase label
        contentEl.createDiv({ text: `⚠️ BOSS ENCOUNTER — LEVEL ${this.bossLevel}`, cls: 'sisy-boss-phase' });

        // Boss name
        contentEl.createDiv({ text: `☠️ ${this.bossName}`, cls: 'sisy-boss-name' });

        // Subtitle
        contentEl.createDiv({ text: this.bossSubtitle, cls: 'sisy-boss-subtitle' });

        // Boss HP bar (visual only, full health)
        const hpBar = contentEl.createDiv({ cls: 'sisy-boss-hp-bar' });
        const fill = hpBar.createDiv({ cls: 'sisy-boss-hp-fill' });
        fill.style.width = '100%';

        // Lore text
        const lore = contentEl.createDiv({ cls: 'sisy-review-narrative' });
        lore.textContent = `A formidable challenge awaits. Complete the boss quest chain to defeat this adversary and claim legendary rewards.`;
        lore.style.textAlign = 'center';

        // Engage button
        const controls = contentEl.createDiv({ cls: 'sisy-pomodoro-controls' });
        const btn = controls.createEl('button', { text: '⚔️ ENGAGE', cls: 'sisy-btn mod-fail' });
        btn.style.fontSize = '1.1em';
        btn.style.padding = '12px 30px';
        btn.onclick = () => {
            this.plugin.audio.playSound('heartbeat');
            this.close();
        };
    }

    onClose() { this.contentEl.empty(); }
}
