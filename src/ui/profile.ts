/**
 * Character Sheet / Profile Modal — Full stats overview.
 */
import { App, Modal, moment } from 'obsidian';
import SisyphusPlugin from '../main';
import { ChartRenderer } from './charts';

export class ProfileModal extends Modal {
    plugin: SisyphusPlugin;

    constructor(app: App, plugin: SisyphusPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        const s = this.plugin.settings;
        contentEl.addClass('sisy-profile');

        // --- HEADER ---
        const hero = contentEl.createDiv({ cls: 'sisy-profile-hero' });
        const topSkill = s.skills.length > 0 ? [...s.skills].sort((a, b) => b.level - a.level)[0] : null;
        const classTitle = topSkill ? this.deriveClass(topSkill.name, topSkill.level) : 'Untrained';
        const achievementCount = s.achievements?.filter(a => a.unlocked).length || 0;
        const titleFromAch = this.deriveTitle(achievementCount, s.level);

        hero.createDiv({ text: `⚔️`, cls: 'sisy-profile-avatar' });
        hero.createEl('h2', { text: titleFromAch, cls: 'sisy-profile-title' });
        hero.createDiv({ text: `Class: ${classTitle}`, cls: 'sisy-profile-class' });
        hero.createDiv({ text: `Level ${s.level} · Run #${s.runCount + 1} · ${s.legacy.deathCount} Deaths`, cls: 'sisy-profile-subtitle' });

        // --- STAT GRID ---
        const stats = contentEl.createDiv({ cls: 'sisy-profile-stats' });
        this.statBox(stats, '❤️', 'HP', `${s.hp}/${s.maxHp}`);
        this.statBox(stats, '⚡', 'XP', `${s.xp}/${s.xpReq}`);
        this.statBox(stats, '💰', 'Gold', String(s.gold));
        this.statBox(stats, '🔥', 'Streak', String(s.streak?.current || 0));
        this.statBox(stats, '⚔️', 'Combo', `x${s.comboCount}`);
        this.statBox(stats, '🏆', 'Trophies', `${achievementCount}`);
        this.statBox(stats, '💀', 'Deaths', String(s.legacy.deathCount));
        this.statBox(stats, '📊', 'Total Quests', String(s.dayMetrics.reduce((sum, d) => sum + d.questsCompleted, 0)));

        // --- ACTIVE BUFFS ---
        if (s.activeBuffs.length > 0) {
            contentEl.createEl('h3', { text: '⚡ ACTIVE EFFECTS' });
            const buffs = contentEl.createDiv({ cls: 'sisy-profile-buffs' });
            s.activeBuffs.forEach(b => {
                const remaining = moment(b.expiresAt).diff(moment(), 'minutes');
                if (remaining > 0) {
                    const chip = buffs.createDiv({ cls: 'sisy-profile-buff-chip' });
                    chip.textContent = `${b.icon} ${b.name} (${remaining}m)`;
                }
            });
        }

        // --- SKILL RADAR ---
        if (s.skills.length >= 3) {
            contentEl.createEl('h3', { text: '🧠 SKILL PROFILE' });
            const radarContainer = contentEl.createDiv({ cls: 'sisy-profile-radar' });
            const sorted = [...s.skills].sort((a, b) => b.level - a.level);
            ChartRenderer.renderRadar(radarContainer, sorted);
        }

        // --- ACHIEVEMENT SHOWCASE ---
        const unlocked = (s.achievements || []).filter(a => a.unlocked);
        if (unlocked.length > 0) {
            contentEl.createEl('h3', { text: '🏆 ACHIEVEMENTS' });
            const achGrid = contentEl.createDiv({ cls: 'sisy-profile-achievements' });
            const sorted = [...unlocked].sort((a, b) => {
                const order = { legendary: 0, epic: 1, rare: 2, common: 3 };
                return (order[a.rarity] ?? 4) - (order[b.rarity] ?? 4);
            });
            sorted.slice(0, 12).forEach(ach => {
                const card = achGrid.createDiv({ cls: `sisy-achievement-card sisy-ach-${ach.rarity}` });
                const rarityIcons: Record<string, string> = { common: '🏅', rare: '💎', epic: '👑', legendary: '⭐' };
                card.createDiv({ text: rarityIcons[ach.rarity] || '🏆', cls: 'sisy-ach-icon' });
                card.createDiv({ text: ach.name, cls: 'sisy-ach-name' });
                card.createDiv({ text: ach.description, cls: 'sisy-ach-desc' });
            });
        }

        // --- RUN HISTORY ---
        if (s.scars && s.scars.length > 0) {
            contentEl.createEl('h3', { text: '🧬 SCARS & HISTORY' });
            const scarList = contentEl.createDiv({ cls: 'sisy-profile-scars' });
            s.scars.slice(-5).reverse().forEach(scar => {
                const row = scarList.createDiv({ cls: 'sisy-profile-scar-row' });
                row.createSpan({ text: `${scar.label}: ${scar.value}` });
                row.createSpan({ text: moment(scar.earnedAt).fromNow(), cls: 'sisy-text-muted' });
            });
        }

        // --- LEGACY ---
        contentEl.createEl('h3', { text: '👻 LEGACY' });
        const legacy = contentEl.createDiv({ cls: 'sisy-profile-stats' });
        this.statBox(legacy, '👻', 'Souls', String(s.legacy.souls));
        this.statBox(legacy, '💰', 'Start Gold', `+${s.legacy.perks.startGold}`);
        this.statBox(legacy, '🧬', 'Relics', String(s.legacy.relics.length));

        // --- CLOSE ---
        const close = contentEl.createDiv({ cls: 'sisy-pomodoro-controls' });
        close.createEl('button', { text: 'DISMISS', cls: 'sisy-btn mod-cta' }).onclick = () => this.close();
    }

    private statBox(parent: HTMLElement, icon: string, label: string, value: string) {
        const box = parent.createDiv({ cls: 'sisy-profile-stat-box' });
        box.createDiv({ text: icon, cls: 'sisy-profile-stat-icon' });
        box.createDiv({ text: value, cls: 'sisy-profile-stat-val' });
        box.createDiv({ text: label, cls: 'sisy-profile-stat-label' });
    }

    private deriveClass(skillName: string, level: number): string {
        const tier = level >= 10 ? 'Master' : level >= 5 ? 'Adept' : 'Apprentice';
        return `${tier} ${skillName}`;
    }

    private deriveTitle(achievementCount: number, level: number): string {
        if (level >= 50) return '✨ Sisyphus, Transcended';
        if (level >= 30) return '🌟 Champion of the Summit';
        if (level >= 20) return '⚡ Veteran of the Boulder';
        if (level >= 10) return '🔥 Warrior of the Climb';
        if (achievementCount >= 5) return '🛡️ Proven Seeker';
        return '🗡️ Initiate';
    }

    onClose() { this.contentEl.empty(); }
}
