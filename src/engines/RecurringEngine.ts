import { App, TFile, Notice } from 'obsidian';
import { SisyphusSettings, RecurringQuest } from '../types';

export class RecurringEngine {
    static async checkAndDeploy(app: App, settings: SisyphusSettings): Promise<void> {
        if (!settings.recurringQuests) settings.recurringQuests = [];
        const today = new Date().toISOString().split('T')[0];

        for (const rq of settings.recurringQuests) {
            if (!rq.enabled) continue;
            if (rq.lastDeployed === today) continue;
            if (!this.shouldDeployToday(rq)) continue;

            try {
                await this.deployQuest(app, settings, rq);
                rq.lastDeployed = today;
            } catch (e) {
                console.error(`[RecurringEngine] Failed to deploy: ${rq.name}`, e);
            }
        }
    }

    static shouldDeployToday(rq: RecurringQuest): boolean {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Sun

        switch (rq.schedule) {
            case 'daily':
                return true;
            case 'weekday':
                return dayOfWeek >= 1 && dayOfWeek <= 5;
            case 'weekly':
                return dayOfWeek === 1; // Monday
            case 'custom':
                return (rq.customDays || []).includes(dayOfWeek);
            default:
                return false;
        }
    }

    private static async deployQuest(app: App, settings: SisyphusSettings, rq: RecurringQuest): Promise<void> {
        const rootPath = 'Active_Run/Quests';
        const folder = app.vault.getAbstractFileByPath(rootPath);
        if (!folder) {
            await app.vault.createFolder(rootPath);
        }

        const safeName = rq.name.replace(/[\\/:*?"<>|]/g, '_');
        const today = new Date().toISOString().split('T')[0];
        const fileName = `${safeName}_${today}.md`;
        const filePath = `${rootPath}/${fileName}`;

        // Check if already exists
        const existing = app.vault.getAbstractFileByPath(filePath);
        if (existing) return;

        const content = [
            '---',
            `difficulty: ${rq.difficulty}`,
            `skill: "${rq.skill}"`,
            `recurring_id: "${rq.id}"`,
            `recurring: true`,
            '---',
            '',
            `# ${rq.name}`,
            '',
            `*Auto-deployed recurring quest (${rq.schedule})*`,
        ].join('\n');

        await app.vault.create(filePath, content);
        new Notice(`🔄 Recurring quest deployed: ${rq.name}`);
    }

    static createRecurring(settings: SisyphusSettings, quest: Omit<RecurringQuest, 'id'>): RecurringQuest {
        if (!settings.recurringQuests) settings.recurringQuests = [];
        const rq: RecurringQuest = {
            ...quest,
            id: `rq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        };
        settings.recurringQuests.push(rq);
        return rq;
    }

    static deleteRecurring(settings: SisyphusSettings, id: string): void {
        if (!settings.recurringQuests) return;
        settings.recurringQuests = settings.recurringQuests.filter(rq => rq.id !== id);
    }

    static toggleRecurring(settings: SisyphusSettings, id: string): boolean {
        if (!settings.recurringQuests) return false;
        const rq = settings.recurringQuests.find(r => r.id === id);
        if (!rq) return false;
        rq.enabled = !rq.enabled;
        return rq.enabled;
    }
}
