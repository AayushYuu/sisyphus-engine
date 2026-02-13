/**
 * AchievementEngine — Checks and unlocks achievements based on game state.
 */
import { SisyphusSettings, Achievement } from '../types';
import { ACHIEVEMENT_DEFINITIONS } from '../achievements';
import { showToast, floatReward } from '../ui/effects';

export class AchievementEngine {

    /** Initialize achievements if not present */
    static init(settings: SisyphusSettings): void {
        if (!settings.achievements || settings.achievements.length === 0) {
            settings.achievements = ACHIEVEMENT_DEFINITIONS.map(def => ({
                ...def,
                unlocked: false,
            }));
        }
        // Add any new definitions not yet in settings
        const existingIds = new Set(settings.achievements.map(a => a.id));
        ACHIEVEMENT_DEFINITIONS.forEach(def => {
            if (!existingIds.has(def.id)) {
                settings.achievements.push({ ...def, unlocked: false });
            }
        });
    }

    /** Check all achievements, unlock any newly met */
    static checkAll(settings: SisyphusSettings): Achievement[] {
        const newlyUnlocked: Achievement[] = [];

        settings.achievements.forEach(ach => {
            if (ach.unlocked) return;
            if (this.evaluate(ach.id, settings)) {
                ach.unlocked = true;
                ach.unlockedAt = new Date().toISOString();
                newlyUnlocked.push(ach);
            }
        });

        // Show celebrations for newly unlocked
        newlyUnlocked.forEach(ach => {
            const rarityColors: Record<string, string> = {
                common: 'var(--sisy-green)',
                rare: 'var(--sisy-blue)',
                epic: 'var(--sisy-purple)',
                legendary: 'var(--sisy-gold)',
            };
            const rarityIcons: Record<string, string> = {
                common: '🏅',
                rare: '💎',
                epic: '👑',
                legendary: '⭐',
            };

            showToast({
                icon: rarityIcons[ach.rarity] || '🏆',
                title: `Achievement Unlocked!`,
                message: `${ach.name} — ${ach.description}`,
                variant: ach.rarity === 'legendary' ? 'level' : ach.rarity === 'epic' ? 'xp' : 'success',
                duration: ach.rarity === 'legendary' ? 8000 : 5000,
            });

            floatReward(`🏆 ${ach.name}`, 'xp');

            // Full-screen overlay for epic+ achievements
            if (ach.rarity === 'epic' || ach.rarity === 'legendary') {
                AchievementEngine.showUnlockOverlay(ach, rarityColors[ach.rarity]);
            }
        });

        return newlyUnlocked;
    }

    /** Evaluate a single achievement condition */
    private static evaluate(id: string, s: SisyphusSettings): boolean {
        const totalQuests = s.dayMetrics.reduce((sum, d) => sum + d.questsCompleted, 0);
        const totalResearches = s.researchQuests.filter(r => r.completed).length;
        const bossesDefeated = (s.bossMilestones || []).filter(b => b.defeated).length;
        const maxSkillLevel = s.skills.length > 0 ? Math.max(...s.skills.map(sk => sk.level)) : 0;
        const chainsDone = (s.chainHistory || []).length;

        switch (id) {
            // Common
            case 'first_blood': return totalQuests >= 1;
            case 'week_warrior': return (s.streak?.current || 0) >= 7;
            case 'warm_up': return totalQuests >= 10;
            case 'night_owl': return this.hasNightOwl(s);
            case 'early_bird': return this.hasEarlyBird(s);
            case 'triple_threat': return s.questsCompletedToday >= 3;

            // Rare
            case 'skill_adept': return maxSkillLevel >= 5;
            case 'chain_gang': return chainsDone >= 1;
            case 'researcher': return totalResearches >= 5;
            case 'rich': return s.gold >= 500;
            case 'combo_king': return s.comboCount >= 5;
            case 'speed_demon': return this.hasSpeedDemon(s);
            case 'perfectionist': return this.hasPerfectWeek(s);
            case 'iron_streak': return (s.streak?.current || 0) >= 14;

            // Epic
            case 'boss_slayer': return bossesDefeated >= 1;
            case 'skill_master': return maxSkillLevel >= 10;
            case 'century': return totalQuests >= 100;
            case 'phoenix': return s.legacy.deathCount >= 1 && s.level >= 10;
            case 'research_professor': return totalResearches >= 20;
            case 'gold_hoarder': return s.gold >= 2000;

            // Legendary
            case 'ascended': return s.level >= 50;
            case 'immortal': return s.level >= 20 && s.legacy.deathCount === 0;
            case 'completionist': return s.achievements.filter(a => a.unlocked && a.rarity !== 'legendary').length >= (s.achievements.length - 3);
            case 'marathon': return (s.streak?.current || 0) >= 30;
            case 'grand_master': return s.skills.filter(sk => sk.level >= 10).length >= 5;

            default: return false;
        }
    }

    private static hasNightOwl(s: SisyphusSettings): boolean {
        return s.dayMetrics.some(d => d.hourlyCompletions && (d.hourlyCompletions[22] > 0 || d.hourlyCompletions[23] > 0 || d.hourlyCompletions[0] > 0));
    }

    private static hasEarlyBird(s: SisyphusSettings): boolean {
        return s.dayMetrics.some(d => d.hourlyCompletions && (d.hourlyCompletions[5] > 0 || d.hourlyCompletions[6] > 0));
    }

    private static hasSpeedDemon(s: SisyphusSettings): boolean {
        // Completed 5+ quests in one day
        return s.dayMetrics.some(d => d.questsCompleted >= 5);
    }

    private static hasPerfectWeek(s: SisyphusSettings): boolean {
        // 7 consecutive days with at least 1 quest, 0 failures
        const sorted = [...s.dayMetrics].sort((a, b) => a.date.localeCompare(b.date));
        for (let i = 0; i <= sorted.length - 7; i++) {
            const slice = sorted.slice(i, i + 7);
            if (slice.every(d => d.questsCompleted > 0 && d.questsFailed === 0)) return true;
        }
        return false;
    }

    /** Full-screen achievement unlock overlay */
    static showUnlockOverlay(ach: Achievement, color: string): void {
        const overlay = document.createElement('div');
        overlay.className = 'sisy-achievement-overlay';
        overlay.style.setProperty('--ach-color', color);

        overlay.innerHTML = `
            <div class="sisy-achievement-overlay-content">
                <div class="sisy-achievement-rarity">${ach.rarity.toUpperCase()}</div>
                <div class="sisy-achievement-icon">🏆</div>
                <div class="sisy-achievement-name">${ach.name}</div>
                <div class="sisy-achievement-desc">${ach.description}</div>
            </div>
        `;

        document.body.appendChild(overlay);
        setTimeout(() => {
            overlay.classList.add('sisy-achievement-overlay-exit');
            setTimeout(() => overlay.remove(), 500);
        }, 3000);
    }
}
