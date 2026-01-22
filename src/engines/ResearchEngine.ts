import { App, TFile, Notice } from 'obsidian';
import { SisyphusSettings, ResearchQuest } from '../types';

export class ResearchEngine {
    settings: SisyphusSettings;
    audioController?: any;
    app: App; // Added App reference for file operations

    constructor(settings: SisyphusSettings, app: App, audioController?: any) {
        this.settings = settings;
        this.app = app;
        this.audioController = audioController;
    }

    async createResearchQuest(title: string, type: "survey" | "deep_dive", linkedSkill: string, linkedCombatQuest: string): Promise<{ success: boolean; message: string; questId?: string }> {
        // [FIX] Allow first research quest for free (Cold Start), otherwise enforce 2:1
        if (this.settings.researchStats.totalResearch > 0 && !this.canCreateResearchQuest()) {
            return {
                success: false,
                message: "RESEARCH BLOCKED: Complete 2 combat quests per research quest"
            };
        }
        
        const wordLimit = type === "survey" ? 200 : 400;
        const questId = `research_${(this.settings.lastResearchQuestId || 0) + 1}`;
        
        const researchQuest: ResearchQuest = {
            id: questId,
            title: title,
            type: type,
            linkedSkill: linkedSkill,
            wordLimit: wordLimit,
            wordCount: 0,
            linkedCombatQuest: linkedCombatQuest,
            createdAt: new Date().toISOString(),
            completed: false
        };

        // [FIX] Create actual Markdown file
        const folderPath = "Active_Run/Research";
        if (!this.app.vault.getAbstractFileByPath(folderPath)) {
            await this.app.vault.createFolder(folderPath);
        }

        const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${folderPath}/${safeTitle}.md`;
        const content = `---
type: research
research_id: ${questId}
status: active
linked_skill: ${linkedSkill}
word_limit: ${wordLimit}
created: ${new Date().toISOString()}
---
# 📚 ${title}
> [!INFO] Research Guidelines
> **Type:** ${type} | **Target:** ${wordLimit} words
> **Linked Skill:** ${linkedSkill}

Write your research here...
`;

        try {
            await this.app.vault.create(filename, content);
        } catch (e) {
            new Notice("Error creating research file. Check console.");
            console.error(e);
        }
        
        this.settings.researchQuests.push(researchQuest);
        this.settings.lastResearchQuestId = parseInt(questId.split('_')[1]);
        this.settings.researchStats.totalResearch++;
        
        return {
            success: true,
            message: `Research Quest Created: ${type === "survey" ? "Survey" : "Deep Dive"}`,
            questId: questId
        };
    }

    completeResearchQuest(questId: string, finalWordCount: number): { success: boolean; message: string; xpReward: number; goldPenalty: number } {
        const researchQuest = this.settings.researchQuests.find(q => q.id === questId);
        if (!researchQuest) return { success: false, message: "Research quest not found", xpReward: 0, goldPenalty: 0 };
        if (researchQuest.completed) return { success: false, message: "Quest already completed", xpReward: 0, goldPenalty: 0 };
        
        const minWords = Math.ceil(researchQuest.wordLimit * 0.8);
        if (finalWordCount < minWords) {
            return { success: false, message: `Too short! Need ${minWords} words.`, xpReward: 0, goldPenalty: 0 };
        }
        
        if (finalWordCount > researchQuest.wordLimit * 1.25) {
            return { success: false, message: `Too long! Max ${Math.ceil(researchQuest.wordLimit * 1.25)} words.`, xpReward: 0, goldPenalty: 0 };
        }
        
        let xpReward = researchQuest.type === "survey" ? 5 : 20;
        let goldPenalty = 0;
        if (finalWordCount > researchQuest.wordLimit) {
            const overagePercent = ((finalWordCount - researchQuest.wordLimit) / researchQuest.wordLimit) * 100;
            goldPenalty = Math.floor(20 * (overagePercent / 100));
        }
        
        const skill = this.settings.skills.find(s => s.name === researchQuest.linkedSkill);
        if (skill) {
            skill.xp += xpReward;
            if (skill.xp >= skill.xpReq) { skill.level++; skill.xp = 0; }
        }
        
        this.settings.gold -= goldPenalty;
        researchQuest.completed = true;
        researchQuest.completedAt = new Date().toISOString();
        this.settings.researchStats.researchCompleted++;
        
        if (this.audioController?.playSound) this.audioController.playSound("success");
        
        let message = `Research Complete! +${xpReward} XP`;
        if (goldPenalty > 0) message += ` (-${goldPenalty}g tax)`;
        
        return { success: true, message, xpReward, goldPenalty };
    }

    async deleteResearchQuest(questId: string): Promise<{ success: boolean; message: string }> {
        const index = this.settings.researchQuests.findIndex(q => q.id === questId);
        if (index !== -1) {
            const quest = this.settings.researchQuests[index];
            
            // [FIX] Try to find and delete the file
            const files = this.app.vault.getMarkdownFiles();
            const file = files.find(f => {
                const cache = this.app.metadataCache.getFileCache(f);
                return cache?.frontmatter?.research_id === questId;
            });

            if (file) {
                await this.app.vault.delete(file);
            }

            this.settings.researchQuests.splice(index, 1);
            if (!quest.completed) this.settings.researchStats.totalResearch = Math.max(0, this.settings.researchStats.totalResearch - 1);
            else this.settings.researchStats.researchCompleted = Math.max(0, this.settings.researchStats.researchCompleted - 1);
            
            return { success: true, message: "Research deleted" };
        }
        return { success: false, message: "Not found" };
    }

    updateResearchWordCount(questId: string, newWordCount: number): boolean {
        const researchQuest = this.settings.researchQuests.find(q => q.id === questId);
        if (researchQuest) {
            researchQuest.wordCount = newWordCount;
            return true;
        }
        return false;
    }

    getResearchRatio() {
        const stats = this.settings.researchStats;
        const ratio = stats.totalCombat / Math.max(1, stats.totalResearch);
        return { combat: stats.totalCombat, research: stats.totalResearch, ratio: ratio.toFixed(2) };
    }

    canCreateResearchQuest(): boolean {
        const stats = this.settings.researchStats;
        const ratio = stats.totalCombat / Math.max(1, stats.totalResearch);
        return ratio >= 2;
    }
}
