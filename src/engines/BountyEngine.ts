import { SisyphusSettings, Bounty } from '../types';

const BOUNTY_REASONS = {
    neglected_skill: (skill: string, days: number) => `${skill} hasn't been trained in ${days} days — rust is building!`,
    low_streak: 'Your streak is broken — get back on track!',
    low_completions: 'Quest completions are down this week — time to grind!',
};

export class BountyEngine {
    static generateBounties(settings: SisyphusSettings): void {
        if (!settings.bounties) settings.bounties = [];

        // Only generate once per day
        const today = new Date().toISOString().split('T')[0];
        const hasToday = settings.bounties.some(b => b.expiresAt.startsWith(today) || b.id.startsWith(`bounty_${today}`));
        if (hasToday) return;

        // Expire old bounties first
        this.expireBounties(settings);

        const newBounties: Bounty[] = [];
        const now = new Date();
        const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

        // 1. Neglected skills
        if (settings.skills && settings.skills.length > 0) {
            const neglected = settings.skills
                .filter(s => {
                    if (!s.lastUsed) return true;
                    const daysSince = (now.getTime() - new Date(s.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
                    return daysSince >= 3;
                })
                .sort((a, b) => {
                    const daysA = a.lastUsed ? (now.getTime() - new Date(a.lastUsed).getTime()) / (1000 * 60 * 60 * 24) : 999;
                    const daysB = b.lastUsed ? (now.getTime() - new Date(b.lastUsed).getTime()) / (1000 * 60 * 60 * 24) : 999;
                    return daysB - daysA;
                });

            neglected.slice(0, 2).forEach(skill => {
                const days = skill.lastUsed ? Math.floor((now.getTime() - new Date(skill.lastUsed).getTime()) / (1000 * 60 * 60 * 24)) : 99;
                const multiplier = Math.min(3, 1 + (days * 0.2));
                newBounties.push({
                    id: `bounty_${today}_skill_${skill.name.toLowerCase().replace(/\s+/g, '_')}`,
                    name: `Train ${skill.name}`,
                    description: `Complete a quest using ${skill.name} to prevent further decay.`,
                    reason: BOUNTY_REASONS.neglected_skill(skill.name, days),
                    targetSkill: skill.name,
                    difficulty: Math.min(5, Math.max(1, Math.ceil(skill.level / 3))),
                    reward: {
                        xp: Math.floor(20 * multiplier),
                        gold: Math.floor(15 * multiplier),
                        multiplier: Math.round(multiplier * 10) / 10,
                    },
                    expiresAt: expiry,
                    accepted: false,
                    questFileCreated: false,
                });
            });
        }

        // 2. Broken streak bounty
        if (settings.streak && settings.streak.current === 0 && settings.streak.longest > 0) {
            newBounties.push({
                id: `bounty_${today}_streak`,
                name: 'Rebuild Your Streak',
                description: 'Complete any 2 quests today to reignite your streak.',
                reason: BOUNTY_REASONS.low_streak,
                targetSkill: '',
                difficulty: 2,
                reward: { xp: 30, gold: 20, multiplier: 2 },
                expiresAt: expiry,
                accepted: false,
                questFileCreated: false,
            });
        }

        // 3. Low productivity bounty
        const todayMetrics = settings.dayMetrics?.find(d => d.date === today);
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const yesterdayMetrics = settings.dayMetrics?.find(d => d.date === yesterday);
        if (yesterdayMetrics && yesterdayMetrics.questsCompleted === 0) {
            newBounties.push({
                id: `bounty_${today}_productivity`,
                name: 'Break the Silence',
                description: 'You completed 0 quests yesterday. Complete 1 quest to prove you\'re alive.',
                reason: BOUNTY_REASONS.low_completions,
                targetSkill: '',
                difficulty: 1,
                reward: { xp: 15, gold: 10, multiplier: 1.5 },
                expiresAt: expiry,
                accepted: false,
                questFileCreated: false,
            });
        }

        settings.bounties.push(...newBounties);
    }

    static acceptBounty(settings: SisyphusSettings, bountyId: string): Bounty | null {
        if (!settings.bounties) return null;
        const bounty = settings.bounties.find(b => b.id === bountyId);
        if (!bounty) return null;
        bounty.accepted = true;
        return bounty;
    }

    static dismissBounty(settings: SisyphusSettings, bountyId: string): void {
        if (!settings.bounties) return;
        settings.bounties = settings.bounties.filter(b => b.id !== bountyId);
    }

    static expireBounties(settings: SisyphusSettings): void {
        if (!settings.bounties) return;
        const now = new Date().toISOString();
        settings.bounties = settings.bounties.filter(b => b.expiresAt > now || b.accepted);
    }

    static getActiveBounties(settings: SisyphusSettings): Bounty[] {
        if (!settings.bounties) return [];
        const now = new Date().toISOString();
        return settings.bounties.filter(b => !b.accepted && b.expiresAt > now);
    }

    static getAcceptedBounties(settings: SisyphusSettings): Bounty[] {
        if (!settings.bounties) return [];
        return settings.bounties.filter(b => b.accepted && !b.questFileCreated);
    }
}
