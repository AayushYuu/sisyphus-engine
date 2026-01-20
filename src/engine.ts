import { App, TFile, TFolder, Notice, moment } from 'obsidian';
import { SisyphusSettings, Skill, Modifier, DailyMission } from './types';
import { AudioController } from './utils';
import { ChaosModal } from './ui/modals';
import { AnalyticsEngine } from './engines/AnalyticsEngine';
import { MeditationEngine } from './engines/MeditationEngine';
import { ResearchEngine } from './engines/ResearchEngine';
import { ChainsEngine } from './engines/ChainsEngine';
import { FiltersEngine } from './engines/FiltersEngine';

// DEFAULT CONSTANTS
export const DEFAULT_MODIFIER: Modifier = { name: "Clear Skies", desc: "No effects.", xpMult: 1, goldMult: 1, priceMult: 1, icon: "☀️" };
export const CHAOS_TABLE: Modifier[] = [
    { name: "Clear Skies", desc: "Normal.", xpMult: 1, goldMult: 1, priceMult: 1, icon: "☀️" },
    { name: "Flow State", desc: "+50% XP.", xpMult: 1.5, goldMult: 1, priceMult: 1, icon: "🌊" },
    { name: "Windfall", desc: "+50% Gold.", xpMult: 1, goldMult: 1.5, priceMult: 1, icon: "💰" },
    { name: "Inflation", desc: "Prices 2x.", xpMult: 1, goldMult: 1, priceMult: 2, icon: "📈" },
    { name: "Brain Fog", desc: "XP 0.5x.", xpMult: 0.5, goldMult: 1, priceMult: 1, icon: "🌫️" },
    { name: "Rival Sabotage", desc: "Gold 0.5x.", xpMult: 1, goldMult: 0.5, priceMult: 1, icon: "🕵️" },
    { name: "Adrenaline", desc: "2x XP, -5 HP/Q.", xpMult: 2, goldMult: 1, priceMult: 1, icon: "💉" }
];

// DLC 1: Mission Pool
const MISSION_POOL = [
    { id: "morning_win", name: "☀️ Morning Win", desc: "Complete 1 Trivial quest before 10 AM", target: 1, reward: { xp: 0, gold: 15 }, check: "morning_trivial" },
    { id: "momentum", name: "🔥 Momentum", desc: "Complete 3 quests today", target: 3, reward: { xp: 20, gold: 0 }, check: "quest_count" },
    { id: "zero_inbox", name: "🧘 Zero Inbox", desc: "Process all scraps (0 remaining)", target: 1, reward: { xp: 0, gold: 10 }, check: "zero_scraps" },
    { id: "specialist", name: "🎯 Specialist", desc: "Use the same skill 3 times", target: 3, reward: { xp: 15, gold: 0 }, check: "skill_repeat" },
    { id: "high_stakes", name: "💪 High Stakes", desc: "Complete 1 High Stakes quest", target: 1, reward: { xp: 0, gold: 30 }, check: "high_stakes" },
    { id: "speed_demon", name: "⚡ Speed Demon", desc: "Complete quest within 2h of creation", target: 1, reward: { xp: 25, gold: 0 }, check: "fast_complete" },
    { id: "synergist", name: "🔗 Synergist", desc: "Complete quest with Primary + Secondary skill", target: 1, reward: { xp: 0, gold: 10 }, check: "synergy" },
    { id: "survivor", name: "🛡️ Survivor", desc: "Don't take any damage today", target: 1, reward: { xp: 0, gold: 20 }, check: "no_damage" },
    { id: "risk_taker", name: "🎲 Risk Taker", desc: "Complete Difficulty 4+ quest", target: 1, reward: { xp: 15, gold: 0 }, check: "hard_quest" }
];

export class SisyphusEngine {
    app: App;
    plugin: any;
    audio: AudioController;
  analyticsEngine: AnalyticsEngine;
meditationEngine: MeditationEngine;
researchEngine: ResearchEngine;
chainsEngine: ChainsEngine;
filtersEngine: FiltersEngine;

    constructor(app: App, plugin: any, audio: AudioController) {
        this.app = app;
        this.plugin = plugin;
        this.audio = audio;
    this.analyticsEngine = new AnalyticsEngine(this.settings, this.audio);
this.meditationEngine = new MeditationEngine(this.settings, this.audio);
this.researchEngine = new ResearchEngine(this.settings, this.audio);
this.chainsEngine = new ChainsEngine(this.settings, this.audio);
this.filtersEngine = new FiltersEngine(this.settings);
    }

    get settings(): SisyphusSettings { return this.plugin.settings; }
    set settings(val: SisyphusSettings) { this.plugin.settings = val; }

    async save() { await this.plugin.saveSettings(); this.plugin.refreshUI(); }

    // DLC 1: Daily Missions
    rollDailyMissions() {
        const available = [...MISSION_POOL];
        const selected: DailyMission[] = [];
        
        for (let i = 0; i < 3; i++) {
            if (available.length === 0) break;
            const idx = Math.floor(Math.random() * available.length);
            const mission = available.splice(idx, 1)[0];
            selected.push({
                ...mission,
                checkFunc: mission.check,
                progress: 0,
                completed: false
            });
        }
        
        this.settings.dailyMissions = selected;
        this.settings.dailyMissionDate = moment().format("YYYY-MM-DD");
        this.settings.questsCompletedToday = 0;
        this.settings.skillUsesToday = {};
    }

    checkDailyMissions(context: { type?: string; difficulty?: number; skill?: string; secondarySkill?: string; highStakes?: boolean; questCreated?: number }) {
        const now = moment();
        
        this.settings.dailyMissions.forEach(mission => {
            if (mission.completed) return;
            
            switch (mission.checkFunc) {
                case "morning_trivial":
                    if (context.type === "complete" && context.difficulty === 1 && now.hour() < 10) {
                        mission.progress++;
                    }
                    break;
                case "quest_count":
                    if (context.type === "complete") {
                        mission.progress = this.settings.questsCompletedToday;
                    }
                    break;
                case "high_stakes":
                    if (context.type === "complete" && context.highStakes) {
                        mission.progress++;
                    }
                    break;
                case "fast_complete":
                    if (context.type === "complete" && context.questCreated) {
                        const elapsed = moment().diff(moment(context.questCreated), 'hours');
                        if (elapsed <= 2) mission.progress++;
                    }
                    break;
                case "synergy":
                    if (context.type === "complete" && context.skill && context.secondarySkill && context.secondarySkill !== "None") {
                        mission.progress++;
                    }
                    break;
                case "no_damage":
                    if (context.type === "damage") {
                        mission.progress = 0;
                    }
                    break;
                case "hard_quest":
                    if (context.type === "complete" && context.difficulty && context.difficulty >= 4) {
                        mission.progress++;
                    }
                    break;
                case "skill_repeat":
                    if (context.type === "complete" && context.skill) {
                        this.settings.skillUsesToday[context.skill] = (this.settings.skillUsesToday[context.skill] || 0) + 1;
                        const skillUseValues: number[] = [];
                        for (const key in this.settings.skillUsesToday) {
                            skillUseValues.push(this.settings.skillUsesToday[key]);
                        }
                        const maxUses = skillUseValues.length > 0 ? Math.max(...skillUseValues) : 0;
                        mission.progress = maxUses;
                    }
                    break;
            }
            
            if (mission.progress >= mission.target && !mission.completed) {
                mission.completed = true;
                this.settings.xp += mission.reward.xp;
                this.settings.gold += mission.reward.gold;
                new Notice(`✅ Daily Mission Complete: ${mission.name}`);
                this.audio.playSound("success");
            }
        });
        
        this.save();
    }

    getDifficultyNumber(diffLabel: string): number {
        if (diffLabel === "Trivial") return 1;
        if (diffLabel === "Easy") return 2;
        if (diffLabel === "Medium") return 3;
        if (diffLabel === "Hard") return 4;
        if (diffLabel === "SUICIDE") return 5;
        return 3;
    }

    async checkDailyLogin() {
        const today = moment().format("YYYY-MM-DD");
        
        if (this.settings.lastLogin) {
            const lastDate = moment(this.settings.lastLogin);
            const todayMoment = moment();
            const daysDiff = todayMoment.diff(lastDate, 'days');

            if (daysDiff > 1) {
                const rotDamage = (daysDiff - 1) * 10;
                if (rotDamage > 0) {
                    this.settings.hp -= rotDamage;
                    this.settings.history.push({ date: today, status: "rot", xpEarned: -rotDamage });
                }
            }
        }

        if (this.settings.lastLogin !== today) {
      this.analyticsEngine.updateStreak();
            this.settings.maxHp = 100 + (this.settings.level * 5);
            this.settings.hp = Math.min(this.settings.maxHp, this.settings.hp + 20);
            
            this.settings.damageTakenToday = 0;
            this.settings.lockdownUntil = "";
            
            const todayMoment = moment();
            this.settings.skills.forEach(s => {
                if (s.lastUsed) {
                    const diff = todayMoment.diff(moment(s.lastUsed), 'days');
                    if (diff > 3) {
                        if (!this.isResting()) { 
                            s.rust = Math.min(10, (s.rust || 0) + 1);
                            s.xpReq = Math.floor(s.xpReq * 1.1); 
                        }
                    }
                }
            });

            if (!this.settings.history.find(h => h.date === this.settings.lastLogin)) {
                this.settings.history.push({ date: this.settings.lastLogin, status: "skip", xpEarned: 0 });
            }
            
            this.settings.lastLogin = today;
            this.settings.history.push({ date: today, status: "success", xpEarned: 0 });
            if(this.settings.history.length > 14) this.settings.history.shift();

            // DLC 1: Roll daily missions
            if (this.settings.dailyMissionDate !== today) {
                this.rollDailyMissions();
            }

            await this.rollChaos(true);
            await this.save();
        }
    }

    async completeQuest(file: TFile) {
    this.analyticsEngine.trackDailyMetrics("quest_complete", 1);
    this.settings.researchStats.totalCombat++;
    if (this.isLockedDown()) { new Notice("LOCKDOWN ACTIVE"); return; }
    
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (!fm) return;
    
    // DLC 4: Check if quest is in active chain and allowed
    const questName = file.basename;
    if (this.isQuestInChain(questName) && !this.canStartQuest(questName)) {
        new Notice("Quest locked in chain. Complete the active quest first.");
        return;
    }
        let xp = (fm.xp_reward || 20) * this.settings.dailyModifier.xpMult;
        let gold = (fm.gold_reward || 0) * this.settings.dailyModifier.goldMult;
        const skillName = fm.skill || "None";
        const secondary = fm.secondary_skill || "None"; 

        this.audio.playSound("success");

        const skill = this.settings.skills.find(s => s.name === skillName);
        if (skill) {
            if (skill.rust > 0) {
                skill.rust = 0;
                skill.xpReq = Math.floor(skill.xpReq / 1.2); 
                new Notice(`✨ ${skill.name}: Rust Cleared!`);
            }
            skill.lastUsed = new Date().toISOString();
            skill.xp += 1;
            if (skill.xp >= skill.xpReq) { skill.level++; skill.xp = 0; new Notice(`🧠 ${skill.name} Up!`); }
            
            if (secondary && secondary !== "None") {
                const secSkill = this.settings.skills.find(s => s.name === secondary);
                if (secSkill) {
                    if(!skill.connections) skill.connections = [];
                    if(!skill.connections.includes(secondary)) { skill.connections.push(secondary); new Notice(`🔗 Neural Link Established`); }
                    xp += Math.floor(secSkill.level * 0.5); secSkill.xp += 0.5; 
                }
            }
        }

        if (this.settings.dailyModifier.name === "Adrenaline") this.settings.hp -= 5;
        this.settings.xp += xp; this.settings.gold += gold;

        if (this.settings.xp >= this.settings.xpReq) {
            this.settings.level++; 
            this.settings.rivalDmg += 5; 
            this.settings.xp = 0;
            this.settings.xpReq = Math.floor(this.settings.xpReq * 1.1); 
            this.settings.maxHp = 100 + (this.settings.level * 5); 
            this.settings.hp = this.settings.maxHp;
            this.taunt("level_up");
        }

        // DLC 1: Track for daily missions
        this.settings.questsCompletedToday++;
        const questCreated = fm.created ? new Date(fm.created).getTime() : Date.now();
        const difficulty = this.getDifficultyNumber(fm.difficulty);
        this.checkDailyMissions({
            type: "complete",
            difficulty: difficulty,
            skill: skillName,
            secondarySkill: secondary,
            highStakes: fm.high_stakes,
            questCreated: questCreated
        });

        const archivePath = "Active_Run/Archive";
        if (!this.app.vault.getAbstractFileByPath(archivePath)) await this.app.vault.createFolder(archivePath);
        await this.app.fileManager.processFrontMatter(file, (f) => { f.status = "completed"; f.completed_at = new Date().toISOString(); });
        await this.app.fileManager.renameFile(file, `${archivePath}/${file.name}`);
        await this.save();
    }

    async failQuest(file: TFile, manualAbort: boolean = false) {
        if (this.isResting() && !manualAbort) {
             new Notice("😴 Rest Day active. No damage.");
             return;
        }

        if (this.isShielded() && !manualAbort) {
            new Notice(`🛡️ SHIELDED!`);
        } else {
            let damage = 10 + Math.floor(this.settings.rivalDmg / 2);
            if (this.settings.gold < -100) damage *= 2;
            
            this.settings.hp -= damage;
            this.settings.damageTakenToday += damage;
            if (!manualAbort) this.settings.rivalDmg += 1; 
            
            this.audio.playSound("fail");
            this.taunt("fail");
            
            // DLC 1: Track damage
            this.checkDailyMissions({ type: "damage" });
            
            if (this.settings.damageTakenToday > 50) {
        this.meditationEngine.triggerLockdown();
                this.settings.lockdownUntil = moment().add(6, 'hours').toISOString();
                this.taunt("lockdown");
                this.audio.playSound("death");
            }
            if (this.settings.hp <= 30) { this.audio.playSound("heartbeat"); this.taunt("low_hp"); }
        }
        const gravePath = "Graveyard/Failures";
        if (!this.app.vault.getAbstractFileByPath(gravePath)) await this.app.vault.createFolder(gravePath);
        await this.app.fileManager.renameFile(file, `${gravePath}/[FAILED] ${file.name}`);
        await this.save();
        if (this.settings.hp <= 0) this.triggerDeath();
    }

    async createQuest(name: string, diff: number, skill: string, secSkill: string, deadlineIso: string, highStakes: boolean, priority: string, isBoss: boolean) {
        if (this.isLockedDown()) { new Notice("⛔ LOCKDOWN ACTIVE"); return; }
        if (this.isResting() && highStakes) { new Notice("Cannot deploy High Stakes on Rest Day."); return; } 

        let xpReward = 0; let goldReward = 0; let diffLabel = "";
        
        if (isBoss) {
            xpReward = 1000; goldReward = 1000; diffLabel = "☠️ BOSS";
        } else {
            switch(diff) {
                case 1: xpReward = Math.floor(this.settings.xpReq * 0.05); goldReward = 10; diffLabel = "Trivial"; break;
                case 2: xpReward = Math.floor(this.settings.xpReq * 0.10); goldReward = 20; diffLabel = "Easy"; break;
                case 3: xpReward = Math.floor(this.settings.xpReq * 0.20); goldReward = 40; diffLabel = "Medium"; break;
                case 4: xpReward = Math.floor(this.settings.xpReq * 0.40); goldReward = 80; diffLabel = "Hard"; break;
                case 5: xpReward = Math.floor(this.settings.xpReq * 0.60); goldReward = 150; diffLabel = "SUICIDE"; break;
            }
        }

        if (highStakes && !isBoss) { goldReward = Math.floor(goldReward * 1.5); }

        let deadlineStr = "None"; let deadlineFrontmatter = "";
        if (deadlineIso) {
            deadlineStr = moment(deadlineIso).format("YYYY-MM-DD HH:mm");
            deadlineFrontmatter = `deadline: ${deadlineIso}`;
        }

        const rootPath = "Active_Run";
        const questsPath = "Active_Run/Quests";
        if (!this.app.vault.getAbstractFileByPath(rootPath)) await this.app.vault.createFolder(rootPath);
        if (!this.app.vault.getAbstractFileByPath(questsPath)) await this.app.vault.createFolder(questsPath);
        
        const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${questsPath}/${safeName}.md`;
        
        const content = `---
type: quest
status: active
difficulty: ${diffLabel}
priority: ${priority}
xp_reward: ${xpReward}
gold_reward: ${goldReward}
skill: ${skill}
secondary_skill: ${secSkill}
high_stakes: ${highStakes}
is_boss: ${isBoss}
created: ${new Date().toISOString()}
${deadlineFrontmatter}
---
# ⚔️ ${name}
> [!INFO] Mission
> **Pri:** ${priority} | **Diff:** ${diffLabel} | **Due:** ${deadlineStr}
> **Rwd:** ${xpReward} XP | ${goldReward} G
> **Neural Link:** ${skill} + ${secSkill}
`;
        if (this.app.vault.getAbstractFileByPath(filename)) { new Notice("Exists!"); return; }
        await this.app.vault.create(filename, content);
        this.audio.playSound("click"); 
        
        setTimeout(() => this.plugin.refreshUI(), 200);
    }

    async deleteQuest(file: TFile) {
        await this.app.vault.delete(file);
        new Notice("Deployment Aborted (Deleted)");
        this.plugin.refreshUI();
    }

    async checkDeadlines() {
        const folder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        if (!(folder instanceof TFolder)) return;
        for (const file of folder.children) {
            if (file instanceof TFile) {
                const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
                if (fm?.deadline && moment().isAfter(moment(fm.deadline))) await this.failQuest(file);
            }
        }
        this.plugin.refreshUI();
    }

    async triggerDeath() {
        this.audio.playSound("death");
        const earnedSouls = Math.floor(this.settings.level * 10 + this.settings.gold / 10);
        this.settings.legacy.souls += earnedSouls;
        
        this.settings.legacy.deathCount = (this.settings.legacy.deathCount || 0) + 1;

        const graveFile = "Graveyard/Chronicles.md";
        if (!this.app.vault.getAbstractFileByPath("Graveyard")) await this.app.vault.createFolder("Graveyard");
        const deathMsg = `\n## Run #${this.settings.runCount} (${new Date().toISOString().split('T')[0]})\n- Lvl: ${this.settings.level}\n- Souls: ${earnedSouls}\n- Scars: ${this.settings.legacy.deathCount}`;
        
        const f = this.app.vault.getAbstractFileByPath(graveFile);
        if (f instanceof TFile) await this.app.vault.append(f, deathMsg);
        else await this.app.vault.create(graveFile, "# Chronicles\n" + deathMsg);

        new Notice(`💀 RUN ENDED.`);
        
        const activePath = "Active_Run"; const graveyardPath = "Graveyard"; const runName = `Run_Failed_${Date.now()}`;
        if (!this.app.vault.getAbstractFileByPath(graveyardPath)) await this.app.vault.createFolder(graveyardPath);
        const activeFolder = this.app.vault.getAbstractFileByPath(activePath);
        if (activeFolder instanceof TFolder) {
            await this.app.vault.createFolder(`${graveyardPath}/${runName}`);
            for (let child of activeFolder.children) { await this.app.fileManager.renameFile(child, `${graveyardPath}/${runName}/${child.name}`); }
        }
        
        const legacyBackup = this.settings.legacy;
        const runCount = this.settings.runCount + 1;
        
        this.settings.hp = 100; this.settings.maxHp = 100; this.settings.xp = 0; this.settings.gold = 0;
        this.settings.xpReq = 100; this.settings.level = 1; this.settings.rivalDmg = 10;
        this.settings.skills = []; this.settings.history = []; this.settings.damageTakenToday = 0;
        this.settings.lockdownUntil = ""; this.settings.shieldedUntil = ""; this.settings.restDayUntil = "";
        this.settings.dailyMissions = []; this.settings.dailyMissionDate = "";
        this.settings.questsCompletedToday = 0; this.settings.skillUsesToday = {};
        
        this.settings.legacy = legacyBackup;
        
        const baseStartGold = this.settings.legacy.perks.startGold || 0;
        const scarPenalty = Math.pow(0.9, this.settings.legacy.deathCount);
        this.settings.gold = Math.floor(baseStartGold * scarPenalty);

        this.settings.runCount = runCount;
        await this.save();
    }

    async rollChaos(showModal: boolean = false) {
        const roll = Math.random();
        if (roll < 0.4) this.settings.dailyModifier = DEFAULT_MODIFIER;
        else {
            const idx = Math.floor(Math.random() * (CHAOS_TABLE.length - 1)) + 1;
            this.settings.dailyModifier = CHAOS_TABLE[idx];
            if (this.settings.dailyModifier.name === "Rival Sabotage" && this.settings.gold > 10) this.settings.gold = Math.floor(this.settings.gold * 0.9);
        }
        await this.save();
        if (showModal) new ChaosModal(this.app, this.settings.dailyModifier).open();
    }

    async attemptRecovery() {
        if (!this.isLockedDown()) { new Notice("Not in Lockdown."); return; }
        const diff = moment(this.settings.lockdownUntil).diff(moment(), 'minutes');
        new Notice(`Recovering... ${Math.floor(diff/60)}h ${diff%60}m remaining.`);
    }

    isLockedDown() {
        if (!this.settings.lockdownUntil) return false;
        return moment().isBefore(moment(this.settings.lockdownUntil));
    }
    
    isResting() {
        if (!this.settings.restDayUntil) return false;
        return moment().isBefore(moment(this.settings.restDayUntil));
    }

    isShielded() {
        if (!this.settings.shieldedUntil) return false;
        return moment().isBefore(moment(this.settings.shieldedUntil));
    }

    taunt(trigger: "fail"|"shield"|"low_hp"|"level_up"|"lockdown") {
        if (Math.random() < 0.2) return; 
        const insults = {
            "fail": ["Focus.", "Again.", "Stay sharp."],
            "shield": ["Smart move.", "Bought some time."],
            "low_hp": ["Critical condition.", "Survive."],
            "level_up": ["Stronger.", "Scaling up."],
            "lockdown": ["Overheated. Cooling down.", "Forced rest."]
        };
        const msg = insults[trigger][Math.floor(Math.random() * insults[trigger].length)];
        new Notice(`SYSTEM: "${msg}"`, 6000);
    }
    
    parseQuickInput(text: string) {
        if (this.isLockedDown()) { new Notice("⛔ LOCKDOWN ACTIVE"); return; }
        let diff = 3;
        let cleanText = text;
        
        if (text.match(/\/1/)) { diff = 1; cleanText = text.replace(/\/1/, "").trim(); }
        else if (text.match(/\/2/)) { diff = 2; cleanText = text.replace(/\/2/, "").trim(); }
        else if (text.match(/\/3/)) { diff = 3; cleanText = text.replace(/\/3/, "").trim(); }
        else if (text.match(/\/4/)) { diff = 4; cleanText = text.replace(/\/4/, "").trim(); }
        else if (text.match(/\/5/)) { diff = 5; cleanText = text.replace(/\/5/, "").trim(); }

        const deadline = moment().add(24, 'hours').toISOString();
        this.createQuest(cleanText, diff, "None", "None", deadline, false, "Normal", false);
    }


    // ===== DLC 2: RESEARCH QUEST SYSTEM =====
    
    async createResearchQuest(title: string, type: "survey" | "deep_dive", linkedSkill: string, linkedCombatQuest: string) {
    if (!this.researchEngine.canCreateResearchQuest()) { new Notice("BLOCKED"); return; }
        if (this.isLockedDown()) { 
            new Notice("LOCKDOWN ACTIVE"); 
            return; 
        }
        
        if (!this.settings.researchStats) {
            this.settings.researchStats = { 
                totalResearch: 0, 
                totalCombat: 0, 
                researchCompleted: 0, 
                combatCompleted: 0 
            };
        }
        
        // Check 2:1 combat:research ratio enforcer
        const ratio = this.settings.researchStats.totalCombat / Math.max(1, this.settings.researchStats.totalResearch);
        if (ratio < 2) {
            new Notice("RESEARCH BLOCKED: Complete 2 combat quests per research quest");
            return;
        }
        
        const wordLimit = type === "survey" ? 200 : 400;
        const questId = (this.settings.lastResearchQuestId || 0) + 1;
        
        const researchQuest: any = {
            id: `research_${questId}`,
            title: title,
            type: type,
            linkedSkill: linkedSkill,
            wordLimit: wordLimit,
            wordCount: 0,
            linkedCombatQuest: linkedCombatQuest,
            createdAt: new Date().toISOString(),
            completed: false
        };
        
        this.settings.researchQuests.push(researchQuest);
        this.settings.lastResearchQuestId = questId;
        this.settings.researchStats.totalResearch++;
        
        new Notice(`Research Quest Created: ${type === "survey" ? "Survey" : "Deep Dive"} (${wordLimit} words)`);
        await this.save();
    }

    async completeResearchQuest(questId: string, finalWordCount: number) {
        const researchQuest = this.settings.researchQuests.find(q => q.id === questId);
        if (!researchQuest) {
            new Notice("Research quest not found");
            return;
        }
        
        // Check word count
        if (finalWordCount < researchQuest.wordLimit * 0.8) {
            new Notice("Quest too short! Minimum 80% of word limit required");
            return;
        }
        
        // Calculate penalty if over limit
        let xpReward = researchQuest.type === "survey" ? 5 : 20;
        let goldPenalty = 0;
                if (finalWordCount > researchQuest.wordLimit) {
            const overagePercent = ((finalWordCount - researchQuest.wordLimit) / researchQuest.wordLimit) * 100;
            if (overagePercent > 25) {
                goldPenalty = Math.floor(20 * (overagePercent / 100));
                new Notice(`Word count tax: -${goldPenalty}g`);
            }
        }
        
        // Award XP to linked skill
        const skill = this.settings.skills.find(s => s.name === researchQuest.linkedSkill);
        if (skill) {
            skill.xp += xpReward;
            if (skill.xp >= skill.xpReq) {
                skill.level++;
                skill.xp = 0;
                new Notice(`Skill leveled: ${skill.name}`);
            }
        }
        
        this.settings.gold -= goldPenalty;
        researchQuest.completed = true;
        researchQuest.completedAt = new Date().toISOString();
        this.settings.researchStats.researchCompleted++;
        
        this.audio.playSound("success");
        await this.save();
    }

    deleteResearchQuest(questId: string) {
        const index = this.settings.researchQuests.findIndex(q => q.id === questId);
        if (index !== -1) {
            this.settings.researchQuests.splice(index, 1);
            this.settings.researchStats.totalResearch = Math.max(0, this.settings.researchStats.totalResearch - 1);
            new Notice("Research quest deleted");
            this.save();
        }
    }

    updateResearchWordCount(questId: string, newWordCount: number) {
        const researchQuest = this.settings.researchQuests.find(q => q.id === questId);
        if (researchQuest) {
            researchQuest.wordCount = newWordCount;
            this.save();
        }
    }

    getResearchRatio(): { combat: number; research: number; ratio: string } {
        const stats = this.settings.researchStats;
        const ratio = stats.totalCombat / Math.max(1, stats.totalResearch);
        return {
            combat: stats.totalCombat,
            research: stats.totalResearch,
            ratio: ratio.toFixed(2)
        };
    }

    canCreateResearchQuest(): boolean {
        const stats = this.settings.researchStats;
        const ratio = stats.totalCombat / Math.max(1, stats.totalResearch);
        return ratio >= 2;
    }
    

    // ===== DLC 3: MEDITATION & RECOVERY =====
    
    async startMeditation() {
        if (!this.isLockedDown()) {
            new Notice("Not in lockdown. No need to meditate.");
            return;
        }
        
        if (this.settings.isMeditating) {
            new Notice("Already meditating. Wait 30 seconds.");
            return;
        }
        
        this.settings.isMeditating = true;
        this.settings.meditationClicksThisLockdown++;
        
        this.playMeditationSound();
        
        const remaining = 10 - this.settings.meditationClicksThisLockdown;
        new Notice(`Meditation (${this.settings.meditationClicksThisLockdown}/10) - ${remaining} cycles left`);
        
        if (this.settings.meditationClicksThisLockdown >= 10) {
            const reducedTime = moment(this.settings.lockdownUntil).subtract(5, 'hours');
            this.settings.lockdownUntil = reducedTime.toISOString();
            this.settings.meditationClicksThisLockdown = 0;
            new Notice("Meditation complete. Lockdown reduced by 5 hours.");
            this.audio.playSound("success");
        }
        
        // 30 second cooldown
        setTimeout(() => {
            this.settings.isMeditating = false;
            this.save();
        }, 30000);
        
        await this.save();
    }
    
    playMeditationSound() {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.frequency.value = 432;
            oscillator.type = "sine";
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 1);
        } catch (e) {
            console.log("Audio not available");
        }
    }
    
    canDeleteQuest(): boolean {
        const today = moment().format("YYYY-MM-DD");
        
        if (this.settings.lastDeletionReset !== today) {
            this.settings.lastDeletionReset = today;
            this.settings.questDeletionsToday = 0;
        }
        
        return this.settings.questDeletionsToday < 3;
    }
    
    async deleteQuestWithCost(file: TFile) {
        const today = moment().format("YYYY-MM-DD");
        
        if (this.settings.lastDeletionReset !== today) {
            this.settings.lastDeletionReset = today;
            this.settings.questDeletionsToday = 0;
        }
        
        let cost = 0;
        if (this.settings.questDeletionsToday >= 3) {
            cost = 10;
            if (this.settings.gold < cost) {
                new Notice("Insufficient gold to delete this quest.");
                return;
            }
        }
        
        this.settings.questDeletionsToday++;
        this.settings.gold -= cost;
        
        if (cost > 0) {
            new Notice(`Quest deleted. Cost: -${cost}g`);
        } else {
            new Notice(`Quest deleted. (${3 - this.settings.questDeletionsToday} free deletions remaining)`);
        }
        
        await this.app.vault.delete(file);
        await this.save();
    }
    
    getMeditationStatus(): { cyclesDone: number; cyclesRemaining: number; timeReduced: number } {
        const cyclesDone = this.settings.meditationClicksThisLockdown;
        const cyclesRemaining = Math.max(0, 10 - cyclesDone);
        const timeReduced = (10 - cyclesRemaining) * 30;
        
        return {
            cyclesDone: cyclesDone,
            cyclesRemaining: cyclesRemaining,
            timeReduced: timeReduced
        };
    }
    
    getDeletionQuota(): { free: number; paid: number; remaining: number } {
        const today = moment().format("YYYY-MM-DD");
        
        if (this.settings.lastDeletionReset !== today) {
            this.settings.lastDeletionReset = today;
            this.settings.questDeletionsToday = 0;
        }
        
        const remaining = Math.max(0, 3 - this.settings.questDeletionsToday);
        
        return {
            free: Math.min(3, 3 - this.settings.questDeletionsToday),
            paid: Math.max(0, this.settings.questDeletionsToday - 3),
            remaining: remaining
        };
    }



    // ===== DLC 4: QUEST CHAINS =====
    
    async createQuestChain(name: string, questNames: string[]): Promise<boolean> {
        if (questNames.length < 2) {
            new Notice("Chain must have at least 2 quests");
            return false;
        }
        
        const chainId = `chain_${Date.now()}`;
        const chain: any = {
            id: chainId,
            name: name,
            quests: questNames,
            currentIndex: 0,
            completed: false,
            startedAt: new Date().toISOString(),
            isBoss: questNames[questNames.length - 1].includes("boss")
        };
        
        this.settings.activeChains.push(chain);
        this.settings.currentChainId = chainId;
        
        new Notice(`Chain created: ${name} (${questNames.length} quests)`);
        await this.save();
        return true;
    }
    
    getNextQuestInChain(): string | null {
        if (!this.settings.currentChainId) return null;
        
        const chain = this.settings.activeChains.find(c => c.id === this.settings.currentChainId);
        if (!chain || chain.completed) return null;
        
        return chain.quests[chain.currentIndex] || null;
    }
    
    isQuestInChain(questName: string): boolean {
        const chain = this.settings.activeChains.find(c => !c.completed);
        if (!chain) return false;
        return chain.quests.includes(questName);
    }
    
    canStartQuest(questName: string): boolean {
        const chain = this.settings.activeChains.find(c => !c.completed);
        if (!chain) return true;
        
        const nextQuest = this.getNextQuestInChain();
        return nextQuest === questName;
    }
    
    async completeChainQuest(questName: string) {
        const chain = this.settings.activeChains.find(c => !c.completed && c.quests.includes(questName));
        if (!chain) return;
        
        const currentQuest = chain.quests[chain.currentIndex];
        if (currentQuest !== questName) {
            new Notice("Quest is not next in chain");
            return;
        }
        
        chain.currentIndex++;
        this.settings.chainQuestsCompleted++;
        
        if (chain.currentIndex >= chain.quests.length) {
            // Chain complete
            chain.completed = true;
            chain.completedAt = new Date().toISOString();
            
            this.settings.xp += 100;
            
            const record: any = {
                chainId: chain.id,
                chainName: chain.name,
                totalQuests: chain.quests.length,
                completedAt: chain.completedAt,
                xpEarned: 100
            };
            
            this.settings.chainHistory.push(record);
            
            new Notice(`Chain complete: ${chain.name}! +100 XP Bonus`);
            this.audio.playSound("success");
        } else {
            const remaining = chain.quests.length - chain.currentIndex;
            new Notice(`Chain progress: ${chain.currentIndex + 1}/${chain.quests.length} (${remaining} remaining)`);
        }
        
        await this.save();
    }
    
    async breakChain() {
        const chain = this.settings.activeChains.find(c => c.id === this.settings.currentChainId);
        if (!chain) return;
        
        const completed = chain.currentIndex;
        const xpEarned = completed * 10;
        
        // Save to history even though broken
        const record: any = {
            chainId: chain.id,
            chainName: chain.name,
            totalQuests: chain.quests.length,
            completedAt: new Date().toISOString(),
            xpEarned: xpEarned
        };
        
        this.settings.chainHistory.push(record);
        this.settings.activeChains = this.settings.activeChains.filter(c => c.id !== chain.id);
        this.settings.currentChainId = "";
        
        new Notice(`Chain broken: ${chain.name}. Kept ${completed} quest completions (${xpEarned} XP).`);
        await this.save();
    }
    
    getActiveChain() {
        return this.settings.activeChains.find(c => !c.completed && c.id === this.settings.currentChainId) || null;
    }
    
    getChainProgress(): { completed: number; total: number; percent: number } {
        const chain = this.getActiveChain();
        if (!chain) return { completed: 0, total: 0, percent: 0 };
        
        return {
            completed: chain.currentIndex,
            total: chain.quests.length,
            percent: Math.floor((chain.currentIndex / chain.quests.length) * 100)
        };
    }



    // ===== DLC 5: CONTEXT FILTERS =====
    
    setQuestFilter(questFile: TFile, energy: "high" | "medium" | "low", context: "home" | "office" | "anywhere", tags: string[]) {
        const questName = questFile.basename;
        
        this.settings.questFilters[questName] = {
            energyLevel: energy,
            context: context,
            tags: tags
        };
        
        new Notice(`Quest tagged: ${energy} energy, ${context} context`);
        this.save();
    }
    
    setFilterState(energy: "high" | "medium" | "low" | "any", context: "home" | "office" | "anywhere" | "any", tags: string[]) {
        this.settings.filterState = {
            activeEnergy: energy,
            activeContext: context,
            activeTags: tags
        };
        
        new Notice(`Filters set: ${energy} energy, ${context} context`);
        this.save();
    }
    
    getFilteredQuests(quests: any[]): any[] {
        const filters = this.settings.filterState;
        
        return quests.filter(quest => {
            const questName = quest.basename || quest.name;
            const questFilter = this.settings.questFilters[questName];
            
            // If no filter set, show all
            if (!questFilter) return true;
            
            // Energy filter
            if (filters.activeEnergy !== "any" && questFilter.energyLevel !== filters.activeEnergy) {
                return false;
            }
            
            // Context filter
            if (filters.activeContext !== "any" && questFilter.context !== filters.activeContext) {
                return false;
            }
            
            // Tags filter
            if (filters.activeTags.length > 0) {
                const hasTag = filters.activeTags.some((tag: string) => questFilter.tags.includes(tag));
                if (!hasTag) return false;
            }
            
            return true;
        });
    }
    
    getQuestsByEnergy(energy: "high" | "medium" | "low", quests: any[]): any[] {
        return quests.filter(q => {
            const questName = q.basename || q.name;
            const filter = this.settings.questFilters[questName];
            return filter && filter.energyLevel === energy;
        });
    }
    
    getQuestsByContext(context: "home" | "office" | "anywhere", quests: any[]): any[] {
        return quests.filter(q => {
            const questName = q.basename || q.name;
            const filter = this.settings.questFilters[questName];
            return filter && filter.context === context;
        });
    }
    
    getQuestsByTags(tags: string[], quests: any[]): any[] {
        return quests.filter(q => {
            const questName = q.basename || q.name;
            const filter = this.settings.questFilters[questName];
            if (!filter) return false;
            return tags.some(tag => filter.tags.includes(tag));
        });
    }
    
    clearFilters() {
        this.settings.filterState = {
            activeEnergy: "any",
            activeContext: "any",
            activeTags: []
        };
        
        new Notice("All filters cleared");
        this.save();
    }
    
    getAvailableTags(): string[] {
        const tags = new Set<string>();
        
        for (const questName in this.settings.questFilters) {
            const filter = this.settings.questFilters[questName];
            filter.tags.forEach((tag: string) => tags.add(tag));
        }
        
        return Array.from(tags).sort();
    }



    // ===== DLC 6: ANALYTICS & ENDGAME =====
    
    trackDailyMetrics(type: string, amount: number = 1) {
        const today = moment().format("YYYY-MM-DD");
        
        let metric = this.settings.dayMetrics.find(m => m.date === today);
        if (!metric) {
            metric = {
                date: today,
                questsCompleted: 0,
                questsFailed: 0,
                xpEarned: 0,
                goldEarned: 0,
                damagesTaken: 0,
                skillsLeveled: [],
                chainsCompleted: 0
            };
            this.settings.dayMetrics.push(metric);
        }
        
        switch (type) {
            case "quest_complete":
                metric.questsCompleted += amount;
                break;
            case "quest_fail":
                metric.questsFailed += amount;
                break;
            case "xp":
                metric.xpEarned += amount;
                break;
            case "gold":
                metric.goldEarned += amount;
                break;
            case "damage":
                metric.damagesTaken += amount;
                break;
            case "skill_level":
                metric.skillsLeveled.push("Skill leveled");
                break;
            case "chain_complete":
                metric.chainsCompleted += amount;
                break;
        }
        
        this.save();
    }
    
    updateStreak() {
        const today = moment().format("YYYY-MM-DD");
        const lastDate = this.settings.streak.lastDate;
        
        if (lastDate === today) {
            return; // Already counted today
        }
        
        const yesterday = moment().subtract(1, 'day').format("YYYY-MM-DD");
        
        if (lastDate === yesterday) {
            this.settings.streak.current++;
            if (this.settings.streak.current > this.settings.streak.longest) {
                this.settings.streak.longest = this.settings.streak.current;
            }
        } else {
            this.settings.streak.current = 1;
        }
        
        this.settings.streak.lastDate = today;
        this.save();
    }
    
    initializeBossMilestones() {
        if (this.settings.bossMilestones.length === 0) {
            const milestones = [
                { level: 10, name: "The First Trial", unlocked: false, defeated: false, xpReward: 500 },
                { level: 20, name: "The Nemesis Returns", unlocked: false, defeated: false, xpReward: 1000 },
                { level: 30, name: "The Reaper Awakens", unlocked: false, defeated: false, xpReward: 1500 },
                { level: 50, name: "The Final Ascension", unlocked: false, defeated: false, xpReward: 5000 }
            ];
            
            this.settings.bossMilestones = milestones as any;
            this.save();
        }
    }
    
    checkBossMilestones() {
        if (!this.settings.bossMilestones || this.settings.bossMilestones.length === 0) {
            this.initializeBossMilestones();
        }
        
        this.settings.bossMilestones.forEach((boss: any) => {
            if (this.settings.level >= boss.level && !boss.unlocked) {
                boss.unlocked = true;
                new Notice(`Boss Unlocked: ${boss.name} (Level ${boss.level})`);
                this.audio.playSound("success");
            }
        });
        
        this.save();
    }
    
    defeatBoss(level: number) {
        const boss = this.settings.bossMilestones.find((b: any) => b.level === level);
        if (!boss) return;
        
        boss.defeated = true;
        boss.defeatedAt = new Date().toISOString();
        
        this.settings.xp += boss.xpReward;
        
        new Notice(`Boss Defeated: ${boss.name}! +${boss.xpReward} XP`);
        this.audio.playSound("success");
        
        // Check win condition
        if (level === 50) {
            this.winGame();
        }
        
        this.save();
    }
    
    winGame() {
        this.settings.gameWon = true;
        this.settings.endGameDate = new Date().toISOString();
        
        const totalTime = moment(this.settings.endGameDate).diff(moment(this.settings.history[0]?.date), 'days');
        const finalLevel = this.settings.level;
        const finalGold = this.settings.gold;
        
        new Notice(`VICTORY! You reached Level 50 in ${totalTime} days!`);
        this.audio.playSound("success");
        
        this.save();
    }
    
    generateWeeklyReport() {
        const week = moment().week();
        const startDate = moment().startOf('week').format("YYYY-MM-DD");
        const endDate = moment().endOf('week').format("YYYY-MM-DD");
        
        const weekMetrics = this.settings.dayMetrics.filter((m: any) => 
            moment(m.date).isBetween(moment(startDate), moment(endDate), null, '[]')
        );
        
        const totalQuests = weekMetrics.reduce((sum: number, m: any) => sum + m.questsCompleted, 0);
        const totalFailed = weekMetrics.reduce((sum: number, m: any) => sum + m.questsFailed, 0);
        const successRate = totalQuests + totalFailed > 0 ? Math.round((totalQuests / (totalQuests + totalFailed)) * 100) : 0;
        const totalXp = weekMetrics.reduce((sum: number, m: any) => sum + m.xpEarned, 0);
        const totalGold = weekMetrics.reduce((sum: number, m: any) => sum + m.goldEarned, 0);
        
        const topSkills = this.settings.skills
            .sort((a: any, b: any) => (b.level - a.level))
            .slice(0, 3)
            .map((s: any) => s.name);
        
        const bestDay = weekMetrics.length > 0 
            ? weekMetrics.reduce((max: any, m: any) => m.questsCompleted > max.questsCompleted ? m : max).date
            : startDate;
        
        const worstDay = weekMetrics.length > 0
            ? weekMetrics.reduce((min: any, m: any) => m.questsFailed > min.questsFailed ? m : min).date
            : startDate;
        
        const report: any = {
            week: week,
            startDate: startDate,
            endDate: endDate,
            totalQuests: totalQuests,
            successRate: successRate,
            totalXp: totalXp,
            totalGold: totalGold,
            topSkills: topSkills,
            bestDay: bestDay,
            worstDay: worstDay
        };
        
        this.settings.weeklyReports.push(report);
        new Notice(`Weekly Report Generated (Week ${week})`);
        this.save();
        
        return report;
    }
    
    unlockAchievement(achievementId: string) {
        const achievement = this.settings.achievements.find((a: any) => a.id === achievementId);
        if (!achievement || achievement.unlocked) return;
        
        achievement.unlocked = true;
        achievement.unlockedAt = new Date().toISOString();
        
        new Notice(`Achievement Unlocked: ${achievement.name}`);
        this.audio.playSound("success");
        this.save();
    }
    
    getGameStats() {
        return {
            level: this.settings.level,
            currentStreak: this.settings.streak.current,
            longestStreak: this.settings.streak.longest,
            totalQuests: this.settings.dayMetrics.reduce((sum: number, m: any) => sum + m.questsCompleted, 0),
            totalXp: this.settings.xp + this.settings.dayMetrics.reduce((sum: number, m: any) => sum + m.xpEarned, 0),
            gameWon: this.settings.gameWon,
            bossesFesDeated: this.settings.bossMilestones.filter((b: any) => b.defeated).length,
            totalBosses: this.settings.bossMilestones.length
        };
    }

}
