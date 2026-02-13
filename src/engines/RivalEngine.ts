/**
 * RivalEngine — Named rival with personality, contextual taunts, and progression.
 */
import { SisyphusSettings, RivalState, RivalPersonality } from '../types';
import { showToast } from '../ui/effects';

const RIVAL_NAMES = ['ECHO-7', 'WRAITH', 'CIPHER', 'PHANTOM', 'NEMESIS', 'SHADOW', 'ORACLE-X', 'VOID'];
const RIVAL_AVATARS = ['👤', '🤖', '👁️', '💀', '🎭', '🌑', '⚡', '🔮'];

const TAUNTS: Record<RivalPersonality, Record<string, string[]>> = {
    aggressive: {
        fail: ["PATHETIC. I expected more.", "You call that effort? Laughable.", "Every failure feeds ME."],
        slack: ["Still resting? I'm pulling ahead.", "Your inaction is my progress.", "Tick tock. I don't sleep."],
        low_hp: ["Bleeding out already? Soft.", "I can smell your weakness.", "One more hit and you're DONE."],
        rival_stronger: ["I'm stronger now. Can you feel it?", "The gap widens. Give up.", "You're falling behind. Permanently."],
        quest_complete: ["Lucky hit. Won't last.", "One win means nothing.", "I completed THREE while you did one."],
    },
    mocking: {
        fail: ["Oh no! 😢 That was SO close. Not really.", "Oops! Butterfingers!", "Maybe try something easier? Like breathing?"],
        slack: ["Nap time? Adorable.", "I'll keep score while you rest 📋", "ZzzzZzzz... oh sorry, were you working?"],
        low_hp: ["Might want to see a doctor 🏥", "That doesn't look healthy!", "Red suits you, actually."],
        rival_stronger: ["Getting... kinda easy up here 😎", "I can barely see you from this high!", "Wave up at me! 👋"],
        quest_complete: ["Aww, good job! ⭐ Want a sticker?", "Participation trophy incoming!", "Even a broken clock..."],
    },
    calculating: {
        fail: ["Failure probability: as predicted.", "Data point recorded. Trend negative.", "Error rate: increasing."],
        slack: ["Idle time: measurable. Progress: zero.", "Inactivity logged. Advantage: mine.", "Time decay applied."],
        low_hp: ["Vital signs: critical. Prognosis: poor.", "System integrity: compromised.", "HP below threshold. Intervention unlikely."],
        rival_stronger: ["Delta exceeds recovery threshold.", "Probability of your victory: declining.", "Statistical irreversibility approaching."],
        quest_complete: ["Anomaly noted. Likely regression to mean.", "Single data point. Insufficient.", "Acknowledged. Adjusting projections."],
    },
    silent: {
        fail: ["..."], slack: ["..."], low_hp: ["..."],
        rival_stronger: ["⚔️"], quest_complete: [""],
    },
};

export class RivalEngine {

    /** Initialize rival state if not present */
    static init(settings: SisyphusSettings): void {
        if (!settings.rival || !settings.rival.name) {
            const idx = Math.floor(Math.random() * RIVAL_NAMES.length);
            settings.rival = {
                name: RIVAL_NAMES[idx],
                avatar: RIVAL_AVATARS[idx],
                personality: (['aggressive', 'mocking', 'calculating'] as RivalPersonality[])[Math.floor(Math.random() * 3)],
                level: 1,
                xp: 0,
                xpReq: 100,
                damageDealt: 0,
                lastTaunt: '',
                lastTauntTime: '',
            };
        }
    }

    /** Rival gains XP when player fails or slacks */
    static rivalGainXP(settings: SisyphusSettings, amount: number): void {
        const r = settings.rival;
        r.xp += amount;
        while (r.xp >= r.xpReq) {
            r.xp -= r.xpReq;
            r.level++;
            r.xpReq = Math.floor(r.xpReq * 1.3);
            showToast({
                icon: r.avatar,
                title: `${r.name} leveled up!`,
                message: `Rival is now Level ${r.level}.`,
                variant: 'fail',
                duration: 4000,
            });
        }
    }

    /** Get a contextual taunt */
    static taunt(settings: SisyphusSettings, trigger: string): string {
        const r = settings.rival;
        const pool = TAUNTS[r.personality]?.[trigger] || TAUNTS.aggressive.fail;
        const msg = pool[Math.floor(Math.random() * pool.length)];
        r.lastTaunt = msg;
        r.lastTauntTime = new Date().toISOString();
        return msg;
    }

    /** Show a taunt as a toast */
    static showTaunt(settings: SisyphusSettings, trigger: string): void {
        const r = settings.rival;
        const msg = RivalEngine.taunt(settings, trigger);
        if (!msg || msg === '') return;

        showToast({
            icon: r.avatar,
            title: r.name,
            message: msg,
            variant: 'fail',
            duration: 5000,
        });
    }

    /** Check if rival is stronger than player and taunt */
    static checkRivalAdvantage(settings: SisyphusSettings): void {
        const r = settings.rival;
        if (r.level > settings.level) {
            RivalEngine.showTaunt(settings, 'rival_stronger');
        }
    }

    /** Render rival section in HUD */
    static renderRivalHUD(parent: HTMLElement, settings: SisyphusSettings): HTMLElement {
        const r = settings.rival;
        const section = parent.createDiv({ cls: 'sisy-rival-section' });

        const header = section.createDiv({ cls: 'sisy-rival-header' });
        header.createSpan({ text: `${r.avatar} ${r.name}`, cls: 'sisy-rival-name' });
        header.createSpan({ text: `Lv${r.level}`, cls: 'sisy-rival-level' });

        // Level comparison bar
        const compBar = section.createDiv({ cls: 'sisy-rival-compare' });
        const playerPct = Math.min((settings.level / (settings.level + r.level)) * 100, 100);
        const rivalPct = 100 - playerPct;

        const playerBar = compBar.createDiv({ cls: 'sisy-rival-bar-player' });
        playerBar.style.width = `${playerPct}%`;
        playerBar.textContent = `You L${settings.level}`;

        const rivalBar = compBar.createDiv({ cls: 'sisy-rival-bar-rival' });
        rivalBar.style.width = `${rivalPct}%`;
        rivalBar.textContent = `${r.name} L${r.level}`;

        // Last taunt bubble
        if (r.lastTaunt && r.lastTaunt !== '') {
            const bubble = section.createDiv({ cls: 'sisy-rival-taunt' });
            bubble.textContent = `"${r.lastTaunt}"`;
        }

        // Rival XP bar
        const xpBar = section.createDiv({ cls: 'sisy-bar-bg' });
        const xpPct = r.xpReq > 0 ? (r.xp / r.xpReq) * 100 : 0;
        xpBar.createDiv({ cls: 'sisy-bar-fill sisy-fill-red', attr: { style: `width:${xpPct}%` } });

        return section;
    }
}
