'use strict';

var obsidian = require('obsidian');

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

// EVENT BUS SYSTEM
class TinyEmitter {
    constructor() {
        this.listeners = {};
    }
    on(event, fn) {
        (this.listeners[event] = this.listeners[event] || []).push(fn);
    }
    off(event, fn) {
        if (!this.listeners[event])
            return;
        this.listeners[event] = this.listeners[event].filter(f => f !== fn);
    }
    trigger(event, data) {
        (this.listeners[event] || []).forEach(fn => fn(data));
    }
}
class AudioController {
    constructor(muted) {
        this.audioCtx = null;
        this.brownNoiseNode = null;
        this.muted = false;
        this.muted = muted;
    }
    setMuted(muted) { this.muted = muted; }
    initAudio() { if (!this.audioCtx)
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    playTone(freq, type, duration, vol = 0.1) {
        if (this.muted)
            return;
        this.initAudio();
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, this.audioCtx.currentTime + duration);
        osc.stop(this.audioCtx.currentTime + duration);
    }
    playSound(type) {
        if (type === "success") {
            this.playTone(600, "sine", 0.1);
            setTimeout(() => this.playTone(800, "sine", 0.2), 100);
        }
        else if (type === "fail") {
            this.playTone(150, "sawtooth", 0.4);
            setTimeout(() => this.playTone(100, "sawtooth", 0.4), 150);
        }
        else if (type === "death") {
            this.playTone(50, "square", 1.0);
        }
        else if (type === "click") {
            this.playTone(800, "sine", 0.05);
        }
        else if (type === "heartbeat") {
            this.playTone(60, "sine", 0.1, 0.5);
            setTimeout(() => this.playTone(50, "sine", 0.1, 0.4), 150);
        }
        else if (type === "meditate") {
            this.playTone(432, "sine", 2.0, 0.05);
        }
    }
    toggleBrownNoise() {
        this.initAudio();
        if (this.brownNoiseNode) {
            this.brownNoiseNode.disconnect();
            this.brownNoiseNode = null;
            new obsidian.Notice("Focus Audio: OFF");
        }
        else {
            const bufferSize = 4096;
            this.brownNoiseNode = this.audioCtx.createScriptProcessor(bufferSize, 1, 1);
            let lastOut = 0;
            this.brownNoiseNode.onaudioprocess = (e) => {
                const output = e.outputBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    output[i] = (lastOut + (0.02 * white)) / 1.02;
                    lastOut = output[i];
                    output[i] *= 0.1;
                }
            };
            this.brownNoiseNode.connect(this.audioCtx.destination);
            new obsidian.Notice("Focus Audio: ON (Brown Noise)");
        }
    }
}

class ChaosModal extends obsidian.Modal {
    constructor(app, m) { super(app); this.modifier = m; }
    onOpen() {
        const c = this.contentEl;
        const h1 = c.createEl("h1", { text: "THE OMEN" });
        h1.setAttribute("style", "text-align:center; color:#f55;");
        const ic = c.createEl("div", { text: this.modifier.icon });
        ic.setAttribute("style", "font-size:80px; text-align:center;");
        const h2 = c.createEl("h2", { text: this.modifier.name });
        h2.setAttribute("style", "text-align:center;");
        const p = c.createEl("p", { text: this.modifier.desc });
        p.setAttribute("style", "text-align:center");
        const b = c.createEl("button", { text: "Acknowledge" });
        b.addClass("mod-cta");
        b.style.display = "block";
        b.style.margin = "20px auto";
        b.onclick = () => this.close();
    }
    onClose() { this.contentEl.empty(); }
}
class ShopModal extends obsidian.Modal {
    constructor(app, plugin) { super(app); this.plugin = plugin; }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "🛒 BLACK MARKET" });
        contentEl.createEl("p", { text: `Purse: 🪙 ${this.plugin.settings.gold}` });
        this.item(contentEl, "💉 Stimpack", "Heal 20 HP", 50, () => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.hp = Math.min(this.plugin.settings.maxHp, this.plugin.settings.hp + 20);
        }));
        this.item(contentEl, "💣 Sabotage", "-5 Rival Dmg", 200, () => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.rivalDmg = Math.max(5, this.plugin.settings.rivalDmg - 5);
        }));
        this.item(contentEl, "🛡️ Shield", "24h Protection", 150, () => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.shieldedUntil = obsidian.moment().add(24, 'hours').toISOString();
        }));
        this.item(contentEl, "😴 Rest Day", "Safe for 24h", 100, () => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.restDayUntil = obsidian.moment().add(24, 'hours').toISOString();
        }));
    }
    item(el, name, desc, cost, effect) {
        const c = el.createDiv();
        c.setAttribute("style", "display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #333;");
        const i = c.createDiv();
        i.createEl("b", { text: name });
        i.createEl("div", { text: desc });
        const b = c.createEl("button", { text: `${cost} G` });
        if (this.plugin.settings.gold < cost) {
            b.setAttribute("disabled", "true");
            b.style.opacity = "0.5";
        }
        else {
            b.addClass("mod-cta");
            b.onclick = () => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.gold -= cost;
                yield effect();
                yield this.plugin.engine.save();
                new obsidian.Notice(`Bought ${name}`);
                this.close();
                new ShopModal(this.app, this.plugin).open();
            });
        }
    }
    onClose() { this.contentEl.empty(); }
}
class QuestModal extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        this.difficulty = 3;
        this.skill = "None";
        this.secSkill = "None";
        this.deadline = "";
        this.highStakes = false;
        this.isBoss = false;
        this.plugin = plugin;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "⚔️ DEPLOYMENT" });
        new obsidian.Setting(contentEl).setName("Objective").addText(t => {
            t.onChange(v => this.name = v);
            setTimeout(() => t.inputEl.focus(), 50);
        });
        new obsidian.Setting(contentEl).setName("Difficulty").addDropdown(d => d.addOption("1", "Trivial").addOption("2", "Easy").addOption("3", "Medium").addOption("4", "Hard").addOption("5", "SUICIDE").setValue("3").onChange(v => this.difficulty = parseInt(v)));
        const skills = { "None": "None" };
        this.plugin.settings.skills.forEach(s => skills[s.name] = s.name);
        skills["+ New"] = "+ New";
        new obsidian.Setting(contentEl).setName("Primary Node").addDropdown(d => d.addOptions(skills).onChange(v => {
            if (v === "+ New") {
                this.close();
                new SkillManagerModal(this.app, this.plugin).open();
            }
            else
                this.skill = v;
        }));
        new obsidian.Setting(contentEl).setName("Synergy Node").addDropdown(d => d.addOptions(skills).setValue("None").onChange(v => this.secSkill = v));
        new obsidian.Setting(contentEl).setName("Deadline").addText(t => { t.inputEl.type = "datetime-local"; t.onChange(v => this.deadline = v); });
        new obsidian.Setting(contentEl).setName("High Stakes").setDesc("Double Gold / Double Damage").addToggle(t => t.setValue(false).onChange(v => this.highStakes = v));
        new obsidian.Setting(contentEl).addButton(b => b.setButtonText("Deploy").setCta().onClick(() => {
            if (this.name) {
                this.plugin.engine.createQuest(this.name, this.difficulty, this.skill, this.secSkill, this.deadline, this.highStakes, "Normal", this.isBoss);
                this.close();
            }
        }));
    }
    onClose() { this.contentEl.empty(); }
}
class SkillManagerModal extends obsidian.Modal {
    constructor(app, plugin) { super(app); this.plugin = plugin; }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Add New Node" });
        let n = "";
        new obsidian.Setting(contentEl).setName("Node Name").addText(t => t.onChange(v => n = v)).addButton(b => b.setButtonText("Create").setCta().onClick(() => __awaiter(this, void 0, void 0, function* () {
            if (n) {
                this.plugin.settings.skills.push({ name: n, level: 1, xp: 0, xpReq: 5, lastUsed: new Date().toISOString(), rust: 0, connections: [] });
                yield this.plugin.engine.save();
                this.close();
            }
        })));
    }
    onClose() { this.contentEl.empty(); }
}
class SkillDetailModal extends obsidian.Modal {
    constructor(app, plugin, index) { super(app); this.plugin = plugin; this.index = index; }
    onOpen() {
        const { contentEl } = this;
        const s = this.plugin.settings.skills[this.index];
        contentEl.createEl("h2", { text: `Node: ${s.name}` });
        new obsidian.Setting(contentEl).setName("Name").addText(t => t.setValue(s.name).onChange(v => s.name = v));
        new obsidian.Setting(contentEl).setName("Rust Status").setDesc(`Stacks: ${s.rust}`).addButton(b => b.setButtonText("Manual Polish").onClick(() => __awaiter(this, void 0, void 0, function* () {
            s.rust = 0;
            s.xpReq = Math.floor(s.xpReq / 1.1);
            yield this.plugin.engine.save();
            this.close();
            new obsidian.Notice("Rust polished.");
        })));
        const div = contentEl.createDiv();
        div.setAttribute("style", "margin-top:20px; display:flex; justify-content:space-between;");
        const bSave = div.createEl("button", { text: "Save" });
        bSave.addClass("mod-cta");
        bSave.onclick = () => __awaiter(this, void 0, void 0, function* () { yield this.plugin.engine.save(); this.close(); });
        const bDel = div.createEl("button", { text: "Delete Node" });
        bDel.setAttribute("style", "color:red;");
        bDel.onclick = () => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.skills.splice(this.index, 1);
            yield this.plugin.engine.save();
            this.close();
        });
    }
    onClose() { this.contentEl.empty(); }
}
class ResearchQuestModal extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        this.title = "";
        this.type = "survey";
        this.linkedSkill = "None";
        this.linkedCombatQuest = "None";
        this.plugin = plugin;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "RESEARCH DEPLOYMENT" });
        new obsidian.Setting(contentEl)
            .setName("Research Title")
            .addText(t => {
            t.onChange(v => this.title = v);
            setTimeout(() => t.inputEl.focus(), 50);
        });
        new obsidian.Setting(contentEl)
            .setName("Research Type")
            .addDropdown(d => d
            .addOption("survey", "Survey (100-200 words)")
            .addOption("deep_dive", "Deep Dive (200-400 words)")
            .setValue("survey")
            .onChange(v => this.type = v));
        const skills = { "None": "None" };
        this.plugin.settings.skills.forEach(s => skills[s.name] = s.name);
        new obsidian.Setting(contentEl)
            .setName("Linked Skill")
            .addDropdown(d => d
            .addOptions(skills)
            .setValue("None")
            .onChange(v => this.linkedSkill = v));
        const combatQuests = { "None": "None" };
        const questFolder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        if (questFolder instanceof obsidian.TFolder) {
            questFolder.children.forEach(f => {
                if (f instanceof obsidian.TFile && f.extension === "md") {
                    combatQuests[f.basename] = f.basename;
                }
            });
        }
        new obsidian.Setting(contentEl)
            .setName("Link Combat Quest")
            .addDropdown(d => d
            .addOptions(combatQuests)
            .setValue("None")
            .onChange(v => this.linkedCombatQuest = v));
        new obsidian.Setting(contentEl)
            .addButton(b => b
            .setButtonText("CREATE RESEARCH")
            .setCta()
            .onClick(() => {
            if (this.title) {
                this.plugin.engine.createResearchQuest(this.title, this.type, this.linkedSkill, this.linkedCombatQuest);
                this.close();
            }
        }));
    }
    onClose() {
        this.contentEl.empty();
    }
}
class ResearchListModal extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "RESEARCH LIBRARY" });
        const stats = this.plugin.engine.getResearchRatio();
        const statsEl = contentEl.createDiv({ cls: "sisy-research-stats" });
        statsEl.createEl("p", { text: `Combat Quests: ${stats.combat}` });
        statsEl.createEl("p", { text: `Research Quests: ${stats.research}` });
        statsEl.createEl("p", { text: `Ratio: ${stats.ratio}:1` });
        if (!this.plugin.engine.canCreateResearchQuest()) {
            const warning = contentEl.createDiv();
            warning.setAttribute("style", "color: orange; font-weight: bold; margin: 10px 0;");
            warning.setText("RESEARCH BLOCKED: Need 2:1 combat to research ratio");
        }
        contentEl.createEl("h3", { text: "Active Research" });
        const quests = this.plugin.settings.researchQuests.filter(q => !q.completed);
        if (quests.length === 0) {
            contentEl.createEl("p", { text: "No active research quests." });
        }
        else {
            quests.forEach((q) => {
                const card = contentEl.createDiv({ cls: "sisy-research-card" });
                card.setAttribute("style", "border: 1px solid #444; padding: 10px; margin: 5px 0; border-radius: 4px;");
                const header = card.createEl("h4", { text: q.title });
                header.setAttribute("style", "margin: 0 0 5px 0;");
                const info = card.createEl("div");
                info.setText(`Type: ${q.type === "survey" ? "Survey" : "Deep Dive"} | Words: ${q.wordCount}/${q.wordLimit}`);
                info.setAttribute("style", "font-size: 0.9em; opacity: 0.8;");
                const actions = card.createDiv();
                actions.setAttribute("style", "margin-top: 8px; display: flex; gap: 5px;");
                const completeBtn = actions.createEl("button", { text: "COMPLETE" });
                completeBtn.setAttribute("style", "flex: 1; padding: 5px; background: green; color: white; border: none; border-radius: 3px; cursor: pointer;");
                completeBtn.onclick = () => {
                    this.plugin.engine.completeResearchQuest(q.id, q.wordCount);
                    this.close();
                };
                const deleteBtn = actions.createEl("button", { text: "DELETE" });
                deleteBtn.setAttribute("style", "flex: 1; padding: 5px; background: red; color: white; border: none; border-radius: 3px; cursor: pointer;");
                deleteBtn.onclick = () => {
                    this.plugin.engine.deleteResearchQuest(q.id);
                    this.close();
                };
            });
        }
        contentEl.createEl("h3", { text: "Completed Research" });
        const completed = this.plugin.settings.researchQuests.filter(q => q.completed);
        if (completed.length === 0) {
            contentEl.createEl("p", { text: "No completed research." });
        }
        else {
            completed.forEach((q) => {
                const item = contentEl.createEl("p");
                item.setText(`+ ${q.title} (${q.type === "survey" ? "Survey" : "Deep Dive"})`);
                item.setAttribute("style", "opacity: 0.6; font-size: 0.9em;");
            });
        }
    }
    onClose() {
        this.contentEl.empty();
    }
}
class ChainBuilderModal extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        this.chainName = "";
        this.selectedQuests = [];
        this.plugin = plugin;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "CHAIN BUILDER" });
        new obsidian.Setting(contentEl)
            .setName("Chain Name")
            .addText(t => {
            t.onChange(v => this.chainName = v);
            setTimeout(() => t.inputEl.focus(), 50);
        });
        contentEl.createEl("h3", { text: "Select Quests" });
        const questFolder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        const quests = [];
        if (questFolder instanceof obsidian.TFolder) {
            questFolder.children.forEach(f => {
                if (f instanceof obsidian.TFile && f.extension === "md") {
                    quests.push(f.basename);
                }
            });
        }
        quests.forEach((quest, idx) => {
            new obsidian.Setting(contentEl)
                .setName(quest)
                .addToggle(t => t.onChange(v => {
                if (v) {
                    this.selectedQuests.push(quest);
                }
                else {
                    this.selectedQuests = this.selectedQuests.filter(q => q !== quest);
                }
            }));
        });
        new obsidian.Setting(contentEl)
            .addButton(b => b
            .setButtonText("CREATE CHAIN")
            .setCta()
            .onClick(() => __awaiter(this, void 0, void 0, function* () {
            if (this.chainName && this.selectedQuests.length >= 2) {
                yield this.plugin.engine.createQuestChain(this.chainName, this.selectedQuests);
                this.close();
            }
            else {
                new obsidian.Notice("Chain needs a name and at least 2 quests");
            }
        })));
    }
    onClose() {
        this.contentEl.empty();
    }
}

/**
 * DLC 6: Analytics & Endgame Engine
 * Handles all metrics tracking, boss milestones, achievements, and win condition
 *
 * ISOLATED: Only reads/writes to settings.dayMetrics, weeklyReports, bossMilestones, streak, achievements
 * DEPENDENCIES: moment, SisyphusSettings types
 */
class AnalyticsEngine {
    constructor(settings, audioController) {
        this.settings = settings;
        this.audioController = audioController;
    }
    /**
     * Track daily metrics - called whenever a quest is completed/failed/etc
     */
    trackDailyMetrics(type, amount = 1) {
        const today = obsidian.moment().format("YYYY-MM-DD");
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
    }
    /**
     * Update daily streak - called once per day at login
     */
    updateStreak() {
        const today = obsidian.moment().format("YYYY-MM-DD");
        const lastDate = this.settings.streak.lastDate;
        if (lastDate === today) {
            return; // Already counted today
        }
        const yesterday = obsidian.moment().subtract(1, 'day').format("YYYY-MM-DD");
        if (lastDate === yesterday) {
            // Consecutive day
            this.settings.streak.current++;
            if (this.settings.streak.current > this.settings.streak.longest) {
                this.settings.streak.longest = this.settings.streak.current;
            }
        }
        else {
            // Streak broken, start new one
            this.settings.streak.current = 1;
        }
        this.settings.streak.lastDate = today;
    }
    /**
     * Initialize boss milestones on first run
     */
    initializeBossMilestones() {
        if (this.settings.bossMilestones.length === 0) {
            const milestones = [
                { level: 10, name: "The First Trial", unlocked: false, defeated: false, xpReward: 500 },
                { level: 20, name: "The Nemesis Returns", unlocked: false, defeated: false, xpReward: 1000 },
                { level: 30, name: "The Reaper Awakens", unlocked: false, defeated: false, xpReward: 1500 },
                { level: 50, name: "The Final Ascension", unlocked: false, defeated: false, xpReward: 5000 }
            ];
            this.settings.bossMilestones = milestones;
        }
    }
    /**
     * Check if any bosses should be unlocked based on current level
     */
    checkBossMilestones() {
        const messages = [];
        if (!this.settings.bossMilestones || this.settings.bossMilestones.length === 0) {
            this.initializeBossMilestones();
        }
        this.settings.bossMilestones.forEach((boss) => {
            var _a;
            if (this.settings.level >= boss.level && !boss.unlocked) {
                boss.unlocked = true;
                messages.push(`Boss Unlocked: ${boss.name} (Level ${boss.level})`);
                if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
                    this.audioController.playSound("success");
                }
            }
        });
        return messages;
    }
    /**
     * Mark boss as defeated and award XP
     */
    defeatBoss(level) {
        var _a;
        const boss = this.settings.bossMilestones.find((b) => b.level === level);
        if (!boss) {
            return { success: false, message: "Boss not found", xpReward: 0 };
        }
        if (boss.defeated) {
            return { success: false, message: "Boss already defeated", xpReward: 0 };
        }
        boss.defeated = true;
        boss.defeatedAt = new Date().toISOString();
        this.settings.xp += boss.xpReward;
        if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
            this.audioController.playSound("success");
        }
        // Check win condition
        if (level === 50) {
            this.winGame();
            return { success: true, message: `Boss Defeated: ${boss.name}! VICTORY!`, xpReward: boss.xpReward };
        }
        return { success: true, message: `Boss Defeated: ${boss.name}! +${boss.xpReward} XP`, xpReward: boss.xpReward };
    }
    /**
     * Trigger win condition
     */
    winGame() {
        var _a;
        this.settings.gameWon = true;
        this.settings.endGameDate = new Date().toISOString();
        if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
            this.audioController.playSound("success");
        }
    }
    /**
     * Generate weekly report
     */
    generateWeeklyReport() {
        const week = obsidian.moment().week();
        const startDate = obsidian.moment().startOf('week').format("YYYY-MM-DD");
        const endDate = obsidian.moment().endOf('week').format("YYYY-MM-DD");
        const weekMetrics = this.settings.dayMetrics.filter((m) => obsidian.moment(m.date).isBetween(obsidian.moment(startDate), obsidian.moment(endDate), null, '[]'));
        const totalQuests = weekMetrics.reduce((sum, m) => sum + m.questsCompleted, 0);
        const totalFailed = weekMetrics.reduce((sum, m) => sum + m.questsFailed, 0);
        const successRate = totalQuests + totalFailed > 0 ? Math.round((totalQuests / (totalQuests + totalFailed)) * 100) : 0;
        const totalXp = weekMetrics.reduce((sum, m) => sum + m.xpEarned, 0);
        const totalGold = weekMetrics.reduce((sum, m) => sum + m.goldEarned, 0);
        const topSkills = this.settings.skills
            .sort((a, b) => (b.level - a.level))
            .slice(0, 3)
            .map((s) => s.name);
        const bestDay = weekMetrics.length > 0
            ? weekMetrics.reduce((max, m) => m.questsCompleted > max.questsCompleted ? m : max).date
            : startDate;
        const worstDay = weekMetrics.length > 0
            ? weekMetrics.reduce((min, m) => m.questsFailed > min.questsFailed ? m : min).date
            : startDate;
        const report = {
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
        return report;
    }
    /**
     * Unlock an achievement
     */
    unlockAchievement(achievementId) {
        var _a;
        const achievement = this.settings.achievements.find((a) => a.id === achievementId);
        if (!achievement || achievement.unlocked)
            return false;
        achievement.unlocked = true;
        achievement.unlockedAt = new Date().toISOString();
        if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
            this.audioController.playSound("success");
        }
        return true;
    }
    /**
     * Get current game stats snapshot
     */
    getGameStats() {
        return {
            level: this.settings.level,
            currentStreak: this.settings.streak.current,
            longestStreak: this.settings.streak.longest,
            totalQuests: this.settings.dayMetrics.reduce((sum, m) => sum + m.questsCompleted, 0),
            totalXp: this.settings.xp + this.settings.dayMetrics.reduce((sum, m) => sum + m.xpEarned, 0),
            gameWon: this.settings.gameWon,
            bossesDefeated: this.settings.bossMilestones.filter((b) => b.defeated).length,
            totalBosses: this.settings.bossMilestones.length
        };
    }
    /**
     * Get survival estimate (rough calculation)
     */
    getSurvivalEstimate() {
        const damagePerFailure = 10 + Math.floor(this.settings.rivalDmg / 2);
        const actualDamage = this.settings.gold < 0 ? damagePerFailure * 2 : damagePerFailure;
        return Math.floor(this.settings.hp / Math.max(1, actualDamage));
    }
}

/**
 * DLC 3: Meditation & Recovery Engine
 * Handles lockdown state, meditation healing, and quest deletion quota
 *
 * ISOLATED: Only reads/writes to lockdownUntil, isMeditating, meditationClicksThisLockdown,
 *           questDeletionsToday, lastDeletionReset
 * DEPENDENCIES: moment, SisyphusSettings
 * SIDE EFFECTS: Plays audio (432 Hz tone)
 */
class MeditationEngine {
    constructor(settings, audioController) {
        this.meditationCooldownMs = 30000; // 30 seconds
        this.settings = settings;
        this.audioController = audioController;
    }
    /**
     * Check if currently locked down
     */
    isLockedDown() {
        if (!this.settings.lockdownUntil)
            return false;
        return obsidian.moment().isBefore(obsidian.moment(this.settings.lockdownUntil));
    }
    /**
     * Get lockdown time remaining in minutes
     */
    getLockdownTimeRemaining() {
        if (!this.isLockedDown()) {
            return { hours: 0, minutes: 0, totalMinutes: 0 };
        }
        const totalMinutes = obsidian.moment(this.settings.lockdownUntil).diff(obsidian.moment(), 'minutes');
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return { hours, minutes, totalMinutes };
    }
    /**
     * Trigger lockdown after taking 50+ damage
     */
    triggerLockdown() {
        this.settings.lockdownUntil = obsidian.moment().add(6, 'hours').toISOString();
        this.settings.meditationClicksThisLockdown = 0;
    }
    /**
     * Perform one meditation cycle (click)
     * Returns: { success, cyclesDone, cyclesRemaining, message }
     */
    meditate() {
        var _a;
        if (!this.isLockedDown()) {
            return {
                success: false,
                cyclesDone: 0,
                cyclesRemaining: 0,
                message: "Not in lockdown. No need to meditate.",
                lockdownReduced: false
            };
        }
        if (this.settings.isMeditating) {
            return {
                success: false,
                cyclesDone: this.settings.meditationClicksThisLockdown,
                cyclesRemaining: Math.max(0, 10 - this.settings.meditationClicksThisLockdown),
                message: "Already meditating. Wait 30 seconds.",
                lockdownReduced: false
            };
        }
        this.settings.isMeditating = true;
        this.settings.meditationClicksThisLockdown++;
        // Play healing frequency
        this.playMeditationSound();
        const remaining = 10 - this.settings.meditationClicksThisLockdown;
        // Check if 10 cycles complete
        if (this.settings.meditationClicksThisLockdown >= 10) {
            const reducedTime = obsidian.moment(this.settings.lockdownUntil).subtract(5, 'hours');
            this.settings.lockdownUntil = reducedTime.toISOString();
            this.settings.meditationClicksThisLockdown = 0;
            if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
                this.audioController.playSound("success");
            }
            // Auto-reset meditation flag after cooldown
            setTimeout(() => {
                this.settings.isMeditating = false;
            }, this.meditationCooldownMs);
            return {
                success: true,
                cyclesDone: 0,
                cyclesRemaining: 0,
                message: "Meditation complete. Lockdown reduced by 5 hours.",
                lockdownReduced: true
            };
        }
        // Auto-reset meditation flag after cooldown
        setTimeout(() => {
            this.settings.isMeditating = false;
        }, this.meditationCooldownMs);
        return {
            success: true,
            cyclesDone: this.settings.meditationClicksThisLockdown,
            cyclesRemaining: remaining,
            message: `Meditation (${this.settings.meditationClicksThisLockdown}/10) - ${remaining} cycles left`,
            lockdownReduced: false
        };
    }
    /**
     * Play 432 Hz healing frequency for 1 second
     */
    playMeditationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
        }
        catch (e) {
            console.log("Audio not available for meditation");
        }
    }
    /**
     * Get meditation status for current lockdown
     */
    getMeditationStatus() {
        const cyclesDone = this.settings.meditationClicksThisLockdown;
        const cyclesRemaining = Math.max(0, 10 - cyclesDone);
        const timeReduced = (10 - cyclesRemaining) * 30; // 30 min per cycle
        return {
            cyclesDone,
            cyclesRemaining,
            timeReduced
        };
    }
    /**
     * Reset deletion quota if new day
     */
    ensureDeletionQuotaReset() {
        const today = obsidian.moment().format("YYYY-MM-DD");
        if (this.settings.lastDeletionReset !== today) {
            this.settings.lastDeletionReset = today;
            this.settings.questDeletionsToday = 0;
        }
    }
    /**
     * Check if user has free deletions left today
     */
    canDeleteQuestFree() {
        this.ensureDeletionQuotaReset();
        return this.settings.questDeletionsToday < 3;
    }
    /**
     * Get deletion quota status
     */
    getDeletionQuota() {
        this.ensureDeletionQuotaReset();
        const remaining = Math.max(0, 3 - this.settings.questDeletionsToday);
        const paid = Math.max(0, this.settings.questDeletionsToday - 3);
        return {
            free: remaining,
            paid: paid,
            remaining: remaining
        };
    }
    /**
     * Delete a quest and charge gold if necessary
     * Returns: { cost, message }
     */
    applyDeletionCost() {
        this.ensureDeletionQuotaReset();
        let cost = 0;
        let message = "";
        if (this.settings.questDeletionsToday >= 3) {
            // Paid deletion
            cost = 10;
            message = `Quest deleted. Cost: -${cost}g`;
        }
        else {
            // Free deletion
            const remaining = 3 - this.settings.questDeletionsToday;
            message = `Quest deleted. (${remaining - 1} free deletions remaining)`;
        }
        this.settings.questDeletionsToday++;
        this.settings.gold -= cost;
        return { cost, message };
    }
}

/**
 * DLC 2: Research Quest System Engine
 * Handles research quest creation, completion, word count validation, and combat:research ratio
 *
 * ISOLATED: Only reads/writes to researchQuests, researchStats
 * DEPENDENCIES: SisyphusSettings types
 * REQUIREMENTS: Audio callbacks from parent for notifications
 */
class ResearchEngine {
    constructor(settings, audioController) {
        this.settings = settings;
        this.audioController = audioController;
    }
    /**
     * Create a new research quest
     * Checks 2:1 combat:research ratio before allowing creation
     */
    createResearchQuest(title, type, linkedSkill, linkedCombatQuest) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check 2:1 combat:research ratio
            if (!this.canCreateResearchQuest()) {
                return {
                    success: false,
                    message: "RESEARCH BLOCKED: Complete 2 combat quests per research quest"
                };
            }
            const wordLimit = type === "survey" ? 200 : 400;
            const questId = `research_${(this.settings.lastResearchQuestId || 0) + 1}`;
            const researchQuest = {
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
            this.settings.researchQuests.push(researchQuest);
            this.settings.lastResearchQuestId = parseInt(questId.split('_')[1]);
            this.settings.researchStats.totalResearch++;
            return {
                success: true,
                message: `Research Quest Created: ${type === "survey" ? "Survey" : "Deep Dive"} (${wordLimit} words)`,
                questId: questId
            };
        });
    }
    /**
     * Complete a research quest
     * Validates word count (80-125%), applies penalties for overage, awards XP
     */
    completeResearchQuest(questId, finalWordCount) {
        var _a;
        const researchQuest = this.settings.researchQuests.find(q => q.id === questId);
        if (!researchQuest) {
            return { success: false, message: "Research quest not found", xpReward: 0, goldPenalty: 0 };
        }
        if (researchQuest.completed) {
            return { success: false, message: "Quest already completed", xpReward: 0, goldPenalty: 0 };
        }
        // Check minimum word count (80% of limit)
        const minWords = Math.ceil(researchQuest.wordLimit * 0.8);
        if (finalWordCount < minWords) {
            return {
                success: false,
                message: `Quest too short! Minimum ${minWords} words required (you have ${finalWordCount})`,
                xpReward: 0,
                goldPenalty: 0
            };
        }
        // Check maximum word count (125% is locked)
        if (finalWordCount > researchQuest.wordLimit * 1.25) {
            return {
                success: false,
                message: `Word count too high! Maximum ${Math.ceil(researchQuest.wordLimit * 1.25)} words allowed`,
                xpReward: 0,
                goldPenalty: 0
            };
        }
        // Calculate XP reward
        let xpReward = researchQuest.type === "survey" ? 5 : 20;
        // Calculate gold penalty for overage (100-125% range)
        let goldPenalty = 0;
        if (finalWordCount > researchQuest.wordLimit) {
            const overagePercent = ((finalWordCount - researchQuest.wordLimit) / researchQuest.wordLimit) * 100;
            if (overagePercent > 0) {
                goldPenalty = Math.floor(20 * (overagePercent / 100));
            }
        }
        // Award XP to linked skill
        const skill = this.settings.skills.find(s => s.name === researchQuest.linkedSkill);
        if (skill) {
            skill.xp += xpReward;
            if (skill.xp >= skill.xpReq) {
                skill.level++;
                skill.xp = 0;
            }
        }
        // Apply penalty and mark complete
        this.settings.gold -= goldPenalty;
        researchQuest.completed = true;
        researchQuest.completedAt = new Date().toISOString();
        this.settings.researchStats.researchCompleted++;
        if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
            this.audioController.playSound("success");
        }
        let message = `Research Complete: ${researchQuest.title}! +${xpReward} XP`;
        if (goldPenalty > 0) {
            message += ` (-${goldPenalty}g overage penalty)`;
        }
        return { success: true, message, xpReward, goldPenalty };
    }
    /**
     * Delete a research quest
     */
    deleteResearchQuest(questId) {
        const index = this.settings.researchQuests.findIndex(q => q.id === questId);
        if (index !== -1) {
            const quest = this.settings.researchQuests[index];
            this.settings.researchQuests.splice(index, 1);
            // Decrement stats appropriately
            if (!quest.completed) {
                this.settings.researchStats.totalResearch = Math.max(0, this.settings.researchStats.totalResearch - 1);
            }
            else {
                this.settings.researchStats.researchCompleted = Math.max(0, this.settings.researchStats.researchCompleted - 1);
            }
            return { success: true, message: "Research quest deleted" };
        }
        return { success: false, message: "Research quest not found" };
    }
    /**
     * Update word count for a research quest (as user writes)
     */
    updateResearchWordCount(questId, newWordCount) {
        const researchQuest = this.settings.researchQuests.find(q => q.id === questId);
        if (researchQuest) {
            researchQuest.wordCount = newWordCount;
            return true;
        }
        return false;
    }
    /**
     * Get current combat:research ratio
     */
    getResearchRatio() {
        const stats = this.settings.researchStats;
        const ratio = stats.totalCombat / Math.max(1, stats.totalResearch);
        return {
            combat: stats.totalCombat,
            research: stats.totalResearch,
            ratio: ratio.toFixed(2)
        };
    }
    /**
     * Check if user can create more research quests
     * Rule: Must have 2:1 combat to research ratio
     */
    canCreateResearchQuest() {
        const stats = this.settings.researchStats;
        const ratio = stats.totalCombat / Math.max(1, stats.totalResearch);
        return ratio >= 2;
    }
    /**
     * Get active (not completed) research quests
     */
    getActiveResearchQuests() {
        return this.settings.researchQuests.filter(q => !q.completed);
    }
    /**
     * Get completed research quests
     */
    getCompletedResearchQuests() {
        return this.settings.researchQuests.filter(q => q.completed);
    }
    /**
     * Validate word count status for a quest
     * Returns: { status: 'too_short' | 'perfect' | 'overage' | 'locked', percent: number }
     */
    validateWordCount(questId, wordCount) {
        const quest = this.settings.researchQuests.find(q => q.id === questId);
        if (!quest) {
            return { status: 'too_short', percent: 0, message: "Quest not found" };
        }
        const percent = (wordCount / quest.wordLimit) * 100;
        if (percent < 80) {
            return { status: 'too_short', percent, message: `Too short (${Math.ceil(percent)}%). Need 80% minimum.` };
        }
        if (percent <= 100) {
            return { status: 'perfect', percent, message: `Perfect range (${Math.ceil(percent)}%)` };
        }
        if (percent <= 125) {
            const tax = Math.floor(20 * ((percent - 100) / 100));
            return { status: 'overage', percent, message: `Overage warning: -${tax}g tax` };
        }
        return { status: 'locked', percent, message: `Locked! Maximum 125% of word limit.` };
    }
}

/**
 * DLC 4: Quest Chains Engine
 * Handles multi-quest sequences with ordering, locking, and completion tracking
 *
 * ISOLATED: Only reads/writes to activeChains, chainHistory, currentChainId, chainQuestsCompleted
 * DEPENDENCIES: SisyphusSettings types
 * INTEGRATION POINTS: Needs to hook into completeQuest() in main engine for chain progression
 */
class ChainsEngine {
    constructor(settings, audioController) {
        this.settings = settings;
        this.audioController = audioController;
    }
    /**
     * Create a new quest chain
     */
    createQuestChain(name, questNames) {
        return __awaiter(this, void 0, void 0, function* () {
            if (questNames.length < 2) {
                return {
                    success: false,
                    message: "Chain must have at least 2 quests"
                };
            }
            const chainId = `chain_${Date.now()}`;
            const chain = {
                id: chainId,
                name: name,
                quests: questNames,
                currentIndex: 0,
                completed: false,
                startedAt: new Date().toISOString(),
                isBoss: questNames[questNames.length - 1].toLowerCase().includes("boss")
            };
            this.settings.activeChains.push(chain);
            this.settings.currentChainId = chainId;
            return {
                success: true,
                message: `Chain created: ${name} (${questNames.length} quests)`,
                chainId: chainId
            };
        });
    }
    /**
     * Get the current active chain
     */
    getActiveChain() {
        if (!this.settings.currentChainId)
            return null;
        const chain = this.settings.activeChains.find(c => c.id === this.settings.currentChainId);
        return (chain && !chain.completed) ? chain : null;
    }
    /**
     * Get the next quest that should be completed in the active chain
     */
    getNextQuestInChain() {
        const chain = this.getActiveChain();
        if (!chain)
            return null;
        return chain.quests[chain.currentIndex] || null;
    }
    /**
     * Check if a quest is part of an active (incomplete) chain
     */
    isQuestInChain(questName) {
        const chain = this.settings.activeChains.find(c => !c.completed);
        if (!chain)
            return false;
        return chain.quests.includes(questName);
    }
    /**
     * Check if a quest can be started (is it the next quest in the chain?)
     */
    canStartQuest(questName) {
        const chain = this.getActiveChain();
        if (!chain)
            return true; // Not in a chain, can start any quest
        const nextQuest = this.getNextQuestInChain();
        return nextQuest === questName;
    }
    /**
     * Mark a quest as completed in the chain
     * Advances chain if successful, awards bonus XP if chain completes
     */
    completeChainQuest(questName) {
        return __awaiter(this, void 0, void 0, function* () {
            const chain = this.getActiveChain();
            if (!chain) {
                return { success: false, message: "No active chain", chainComplete: false, bonusXp: 0 };
            }
            const currentQuest = chain.quests[chain.currentIndex];
            if (currentQuest !== questName) {
                return {
                    success: false,
                    message: "Quest is not next in chain",
                    chainComplete: false,
                    bonusXp: 0
                };
            }
            chain.currentIndex++;
            this.settings.chainQuestsCompleted++;
            // Check if chain is complete
            if (chain.currentIndex >= chain.quests.length) {
                return this.completeChain(chain);
            }
            const remaining = chain.quests.length - chain.currentIndex;
            const percent = Math.floor((chain.currentIndex / chain.quests.length) * 100);
            return {
                success: true,
                message: `Chain progress: ${chain.currentIndex}/${chain.quests.length} (${remaining} remaining, ${percent}% complete)`,
                chainComplete: false,
                bonusXp: 0
            };
        });
    }
    /**
     * Complete the entire chain
     */
    completeChain(chain) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            chain.completed = true;
            chain.completedAt = new Date().toISOString();
            const bonusXp = 100;
            this.settings.xp += bonusXp;
            const record = {
                chainId: chain.id,
                chainName: chain.name,
                totalQuests: chain.quests.length,
                completedAt: chain.completedAt,
                xpEarned: bonusXp
            };
            this.settings.chainHistory.push(record);
            if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
                this.audioController.playSound("success");
            }
            return {
                success: true,
                message: `Chain complete: ${chain.name}! +${bonusXp} XP Bonus`,
                chainComplete: true,
                bonusXp: bonusXp
            };
        });
    }
    /**
     * Break an active chain
     * Keeps earned XP from completed quests
     */
    breakChain() {
        return __awaiter(this, void 0, void 0, function* () {
            const chain = this.getActiveChain();
            if (!chain) {
                return { success: false, message: "No active chain to break", xpKept: 0 };
            }
            const completed = chain.currentIndex;
            const xpKept = completed * 10; // Approximate XP from each quest
            // Save to history as broken
            const record = {
                chainId: chain.id,
                chainName: chain.name,
                totalQuests: chain.quests.length,
                completedAt: new Date().toISOString(),
                xpEarned: xpKept
            };
            this.settings.chainHistory.push(record);
            this.settings.activeChains = this.settings.activeChains.filter(c => c.id !== chain.id);
            this.settings.currentChainId = "";
            return {
                success: true,
                message: `Chain broken: ${chain.name}. Kept ${completed} quest completions (${xpKept} XP).`,
                xpKept: xpKept
            };
        });
    }
    /**
     * Get progress of active chain
     */
    getChainProgress() {
        const chain = this.getActiveChain();
        if (!chain)
            return { completed: 0, total: 0, percent: 0 };
        return {
            completed: chain.currentIndex,
            total: chain.quests.length,
            percent: Math.floor((chain.currentIndex / chain.quests.length) * 100)
        };
    }
    /**
     * Get all completed chain records (history)
     */
    getChainHistory() {
        return this.settings.chainHistory;
    }
    /**
     * Get all active chains (not completed)
     */
    getActiveChains() {
        return this.settings.activeChains.filter(c => !c.completed);
    }
    /**
     * Get detailed state of active chain (for UI rendering)
     */
    getChainDetails() {
        const chain = this.getActiveChain();
        if (!chain) {
            return { chain: null, progress: { completed: 0, total: 0, percent: 0 }, questStates: [] };
        }
        const progress = this.getChainProgress();
        const questStates = chain.quests.map((quest, idx) => {
            if (idx < chain.currentIndex) {
                return { quest, status: 'completed' };
            }
            else if (idx === chain.currentIndex) {
                return { quest, status: 'active' };
            }
            else {
                return { quest, status: 'locked' };
            }
        });
        return { chain, progress, questStates };
    }
}

/**
 * DLC 5: Context Filters Engine
 * Handles quest filtering by energy level, location context, and custom tags
 *
 * ISOLATED: Only reads/writes to questFilters, filterState
 * DEPENDENCIES: SisyphusSettings types, TFile (for quest metadata)
 * NOTE: This is primarily a VIEW LAYER concern, but keeping logic isolated is good
 */
class FiltersEngine {
    constructor(settings) {
        this.settings = settings;
    }
    /**
     * Set filter for a specific quest
     */
    setQuestFilter(questName, energy, context, tags) {
        this.settings.questFilters[questName] = {
            energyLevel: energy,
            context: context,
            tags: tags
        };
    }
    /**
     * Get filter for a specific quest
     */
    getQuestFilter(questName) {
        return this.settings.questFilters[questName] || null;
    }
    /**
     * Update the active filter state
     */
    setFilterState(energy, context, tags) {
        this.settings.filterState = {
            activeEnergy: energy,
            activeContext: context,
            activeTags: tags
        };
    }
    /**
     * Get current filter state
     */
    getFilterState() {
        return this.settings.filterState;
    }
    /**
     * Check if a quest matches current filter state
     */
    questMatchesFilter(questName) {
        const filters = this.settings.filterState;
        const questFilter = this.settings.questFilters[questName];
        // If no filter set for this quest, always show
        if (!questFilter)
            return true;
        // Energy filter
        if (filters.activeEnergy !== "any" && questFilter.energyLevel !== filters.activeEnergy) {
            return false;
        }
        // Context filter
        if (filters.activeContext !== "any" && questFilter.context !== filters.activeContext) {
            return false;
        }
        // Tags filter (requires ANY of the active tags)
        if (filters.activeTags.length > 0) {
            const hasTag = filters.activeTags.some((tag) => questFilter.tags.includes(tag));
            if (!hasTag)
                return false;
        }
        return true;
    }
    /**
     * Filter a list of quests based on current filter state
     */
    filterQuests(quests) {
        return quests.filter(quest => {
            const questName = quest.basename || quest.name;
            return this.questMatchesFilter(questName);
        });
    }
    /**
     * Get quests by specific energy level
     */
    getQuestsByEnergy(energy, quests) {
        return quests.filter(q => {
            const questName = q.basename || q.name;
            const filter = this.settings.questFilters[questName];
            return filter && filter.energyLevel === energy;
        });
    }
    /**
     * Get quests by specific context
     */
    getQuestsByContext(context, quests) {
        return quests.filter(q => {
            const questName = q.basename || q.name;
            const filter = this.settings.questFilters[questName];
            return filter && filter.context === context;
        });
    }
    /**
     * Get quests by specific tags
     */
    getQuestsByTags(tags, quests) {
        return quests.filter(q => {
            const questName = q.basename || q.name;
            const filter = this.settings.questFilters[questName];
            if (!filter)
                return false;
            return tags.some(tag => filter.tags.includes(tag));
        });
    }
    /**
     * Clear all active filters
     */
    clearFilters() {
        this.settings.filterState = {
            activeEnergy: "any",
            activeContext: "any",
            activeTags: []
        };
    }
    /**
     * Get all unique tags used across all quests
     */
    getAvailableTags() {
        const tags = new Set();
        for (const questName in this.settings.questFilters) {
            const filter = this.settings.questFilters[questName];
            filter.tags.forEach((tag) => tags.add(tag));
        }
        return Array.from(tags).sort();
    }
    /**
     * Get summary stats about filtered state
     */
    getFilterStats(allQuests) {
        const filtered = this.filterQuests(allQuests);
        const activeFiltersCount = (this.settings.filterState.activeEnergy !== "any" ? 1 : 0) +
            (this.settings.filterState.activeContext !== "any" ? 1 : 0) +
            (this.settings.filterState.activeTags.length > 0 ? 1 : 0);
        return {
            total: allQuests.length,
            filtered: filtered.length,
            activeFiltersCount: activeFiltersCount
        };
    }
    /**
     * Toggle a specific filter value
     * Useful for UI toggle buttons
     */
    toggleEnergyFilter(energy) {
        if (this.settings.filterState.activeEnergy === energy) {
            this.settings.filterState.activeEnergy = "any";
        }
        else {
            this.settings.filterState.activeEnergy = energy;
        }
    }
    /**
     * Toggle context filter
     */
    toggleContextFilter(context) {
        if (this.settings.filterState.activeContext === context) {
            this.settings.filterState.activeContext = "any";
        }
        else {
            this.settings.filterState.activeContext = context;
        }
    }
    /**
     * Toggle a tag in the active tag list
     */
    toggleTag(tag) {
        const idx = this.settings.filterState.activeTags.indexOf(tag);
        if (idx >= 0) {
            this.settings.filterState.activeTags.splice(idx, 1);
        }
        else {
            this.settings.filterState.activeTags.push(tag);
        }
    }
}

// DEFAULT CONSTANTS
const DEFAULT_MODIFIER = { name: "Clear Skies", desc: "No effects.", xpMult: 1, goldMult: 1, priceMult: 1, icon: "☀️" };
const CHAOS_TABLE = [
    { name: "Clear Skies", desc: "Normal.", xpMult: 1, goldMult: 1, priceMult: 1, icon: "☀️" },
    { name: "Flow State", desc: "+50% XP.", xpMult: 1.5, goldMult: 1, priceMult: 1, icon: "🌊" },
    { name: "Windfall", desc: "+50% Gold.", xpMult: 1, goldMult: 1.5, priceMult: 1, icon: "💰" },
    { name: "Inflation", desc: "Prices 2x.", xpMult: 1, goldMult: 1, priceMult: 2, icon: "📈" },
    { name: "Brain Fog", desc: "XP 0.5x.", xpMult: 0.5, goldMult: 1, priceMult: 1, icon: "🌫️" },
    { name: "Rival Sabotage", desc: "Gold 0.5x.", xpMult: 1, goldMult: 0.5, priceMult: 1, icon: "🕵️" },
    { name: "Adrenaline", desc: "2x XP, -5 HP/Q.", xpMult: 2, goldMult: 1, priceMult: 1, icon: "💉" }
];
// BOSS DATA
const BOSS_DATA = {
    10: { name: "The Gatekeeper", desc: "The first major filter. Prove you belong here.", hp_pen: 20 },
    20: { name: "The Shadow Self", desc: "Your own bad habits manifest.", hp_pen: 30 },
    30: { name: "The Mountain", desc: "The peak is visible, but the air is thin.", hp_pen: 40 },
    40: { name: "The Absurd", desc: "Why do we struggle? Because we must.", hp_pen: 50 },
    50: { name: "Sisyphus Prime", desc: "One must imagine Sisyphus happy.", hp_pen: 99 }
};
// MISSION POOL
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
class SisyphusEngine extends TinyEmitter {
    constructor(app, plugin, audio) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.audio = audio;
        this.analyticsEngine = new AnalyticsEngine(this.plugin.settings, this.audio);
        this.meditationEngine = new MeditationEngine(this.plugin.settings, this.audio);
        this.researchEngine = new ResearchEngine(this.plugin.settings, this.audio);
        this.chainsEngine = new ChainsEngine(this.plugin.settings, this.audio);
        this.filtersEngine = new FiltersEngine(this.plugin.settings);
    }
    get settings() { return this.plugin.settings; }
    set settings(val) { this.plugin.settings = val; }
    save() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.plugin.saveSettings();
            this.trigger("update");
        });
    }
    // GAME LOOP
    rollDailyMissions() {
        const available = [...MISSION_POOL];
        const selected = [];
        for (let i = 0; i < 3; i++) {
            if (available.length === 0)
                break;
            const idx = Math.floor(Math.random() * available.length);
            const mission = available.splice(idx, 1)[0];
            selected.push(Object.assign(Object.assign({}, mission), { checkFunc: mission.check, progress: 0, completed: false }));
        }
        this.settings.dailyMissions = selected;
        this.settings.dailyMissionDate = obsidian.moment().format("YYYY-MM-DD");
        this.settings.questsCompletedToday = 0;
        this.settings.skillUsesToday = {};
    }
    checkDailyMissions(context) {
        const now = obsidian.moment();
        this.settings.dailyMissions.forEach(mission => {
            if (mission.completed)
                return;
            switch (mission.checkFunc) {
                case "morning_trivial":
                    if (context.type === "complete" && context.difficulty === 1 && now.hour() < 10)
                        mission.progress++;
                    break;
                case "quest_count":
                    if (context.type === "complete")
                        mission.progress = this.settings.questsCompletedToday;
                    break;
                case "high_stakes":
                    if (context.type === "complete" && context.highStakes)
                        mission.progress++;
                    break;
                case "fast_complete":
                    if (context.type === "complete" && context.questCreated) {
                        if (obsidian.moment().diff(obsidian.moment(context.questCreated), 'hours') <= 2)
                            mission.progress++;
                    }
                    break;
                case "synergy":
                    if (context.type === "complete" && context.skill && context.secondarySkill && context.secondarySkill !== "None")
                        mission.progress++;
                    break;
                case "no_damage":
                    if (context.type === "damage")
                        mission.progress = 0;
                    break;
                case "hard_quest":
                    if (context.type === "complete" && context.difficulty && context.difficulty >= 4)
                        mission.progress++;
                    break;
                case "skill_repeat":
                    if (context.type === "complete" && context.skill) {
                        this.settings.skillUsesToday[context.skill] = (this.settings.skillUsesToday[context.skill] || 0) + 1;
                        const maxUses = Math.max(0, ...Object.values(this.settings.skillUsesToday));
                        mission.progress = maxUses;
                    }
                    break;
            }
            if (mission.progress >= mission.target && !mission.completed) {
                mission.completed = true;
                this.settings.xp += mission.reward.xp;
                this.settings.gold += mission.reward.gold;
                new obsidian.Notice(`✅ Daily Mission Complete: ${mission.name}`);
                this.audio.playSound("success");
            }
        });
        this.save();
    }
    getDifficultyNumber(diffLabel) {
        if (diffLabel === "Trivial")
            return 1;
        if (diffLabel === "Easy")
            return 2;
        if (diffLabel === "Medium")
            return 3;
        if (diffLabel === "Hard")
            return 4;
        if (diffLabel === "SUICIDE")
            return 5;
        return 3;
    }
    checkDailyLogin() {
        return __awaiter(this, void 0, void 0, function* () {
            const today = obsidian.moment().format("YYYY-MM-DD");
            if (this.settings.lastLogin) {
                const daysDiff = obsidian.moment().diff(obsidian.moment(this.settings.lastLogin), 'days');
                if (daysDiff > 2) {
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
                const todayMoment = obsidian.moment();
                this.settings.skills.forEach(s => {
                    if (s.lastUsed) {
                        if (todayMoment.diff(obsidian.moment(s.lastUsed), 'days') > 3 && !this.isResting()) {
                            s.rust = Math.min(10, (s.rust || 0) + 1);
                            s.xpReq = Math.floor(s.xpReq * 1.1);
                        }
                    }
                });
                this.settings.lastLogin = today;
                this.settings.history.push({ date: today, status: "success", xpEarned: 0 });
                if (this.settings.history.length > 14)
                    this.settings.history.shift();
                if (this.settings.dailyMissionDate !== today)
                    this.rollDailyMissions();
                yield this.rollChaos(true);
                yield this.save();
            }
        });
    }
    completeQuest(file) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            this.analyticsEngine.trackDailyMetrics("quest_complete", 1);
            this.settings.researchStats.totalCombat++;
            if (this.meditationEngine.isLockedDown()) {
                new obsidian.Notice("LOCKDOWN ACTIVE");
                return;
            }
            const fm = (_a = this.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
            if (!fm)
                return;
            const questName = file.basename;
            if (this.chainsEngine.isQuestInChain(questName) && !this.chainsEngine.canStartQuest(questName)) {
                new obsidian.Notice("Quest locked in chain. Complete the active quest first.");
                return;
            }
            if (this.chainsEngine.isQuestInChain(questName)) {
                const chainResult = yield this.chainsEngine.completeChainQuest(questName);
                if (chainResult.success && chainResult.message)
                    new obsidian.Notice(chainResult.message);
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
                    new obsidian.Notice(`✨ ${skill.name}: Rust Cleared!`);
                }
                skill.lastUsed = new Date().toISOString();
                skill.xp += 1;
                if (skill.xp >= skill.xpReq) {
                    skill.level++;
                    skill.xp = 0;
                    new obsidian.Notice(`🧠 ${skill.name} Up!`);
                }
                if (secondary && secondary !== "None") {
                    const secSkill = this.settings.skills.find(s => s.name === secondary);
                    if (secSkill) {
                        if (!skill.connections)
                            skill.connections = [];
                        if (!skill.connections.includes(secondary)) {
                            skill.connections.push(secondary);
                            new obsidian.Notice(`🔗 Neural Link Established`);
                        }
                        xp += Math.floor(secSkill.level * 0.5);
                        secSkill.xp += 0.5;
                    }
                }
            }
            if (this.settings.dailyModifier.name === "Adrenaline")
                this.settings.hp -= 5;
            this.settings.xp += xp;
            this.settings.gold += gold;
            if (this.settings.xp >= this.settings.xpReq) {
                this.settings.level++;
                this.settings.rivalDmg += 5;
                this.settings.xp = 0;
                this.settings.xpReq = Math.floor(this.settings.xpReq * 1.1);
                this.settings.maxHp = 100 + (this.settings.level * 5);
                this.settings.hp = this.settings.maxHp;
                this.taunt("level_up");
                const bossMsgs = this.analyticsEngine.checkBossMilestones();
                bossMsgs.forEach(msg => new obsidian.Notice(msg));
                // BOSS SPAWN CHECK
                if (BOSS_DATA[this.settings.level]) {
                    this.spawnBoss(this.settings.level);
                }
            }
            this.settings.questsCompletedToday++;
            const questCreated = fm.created ? new Date(fm.created).getTime() : Date.now();
            const difficulty = this.getDifficultyNumber(fm.difficulty);
            this.checkDailyMissions({ type: "complete", difficulty, skill: skillName, secondarySkill: secondary, highStakes: fm.high_stakes, questCreated });
            const archivePath = "Active_Run/Archive";
            if (!this.app.vault.getAbstractFileByPath(archivePath))
                yield this.app.vault.createFolder(archivePath);
            yield this.app.fileManager.processFrontMatter(file, (f) => { f.status = "completed"; f.completed_at = new Date().toISOString(); });
            yield this.app.fileManager.renameFile(file, `${archivePath}/${file.name}`);
            yield this.save();
        });
    }
    spawnBoss(level) {
        return __awaiter(this, void 0, void 0, function* () {
            const boss = BOSS_DATA[level];
            if (!boss)
                return;
            const bossName = `BOSS_LVL${level} - ${boss.name}`;
            new obsidian.Notice(`⚠️ BOSS DETECTED: ${boss.name}`);
            // Auto-create the boss quest
            yield this.createQuest(bossName, 5, // Difficulty 5 (Suicide)
            "Boss", "None", obsidian.moment().add(3, 'days').toISOString(), // 3 Day limit
            true, // High Stakes
            "Critical", // Priority
            true // isBoss flag
            );
            this.audio.playSound("death"); // Ominous sound
        });
    }
    failQuest(file_1) {
        return __awaiter(this, arguments, void 0, function* (file, manualAbort = false) {
            if (this.isResting() && !manualAbort) {
                new obsidian.Notice("😴 Rest Day active. No damage.");
                return;
            }
            if (this.isShielded() && !manualAbort) {
                new obsidian.Notice(`🛡️ SHIELDED!`);
            }
            else {
                let damage = 10 + Math.floor(this.settings.rivalDmg / 2);
                if (this.settings.gold < -100)
                    damage *= 2;
                this.settings.hp -= damage;
                this.settings.damageTakenToday += damage;
                if (!manualAbort)
                    this.settings.rivalDmg += 1;
                this.audio.playSound("fail");
                this.taunt("fail");
                this.checkDailyMissions({ type: "damage" });
                if (this.settings.damageTakenToday > 50) {
                    this.meditationEngine.triggerLockdown();
                    this.taunt("lockdown");
                    this.audio.playSound("death");
                    this.trigger("lockdown");
                }
                if (this.settings.hp <= 30) {
                    this.audio.playSound("heartbeat");
                    this.taunt("low_hp");
                }
            }
            const gravePath = "Graveyard/Failures";
            if (!this.app.vault.getAbstractFileByPath(gravePath))
                yield this.app.vault.createFolder(gravePath);
            yield this.app.fileManager.renameFile(file, `${gravePath}/[FAILED] ${file.name}`);
            yield this.save();
            if (this.settings.hp <= 0)
                this.triggerDeath();
        });
    }
    createQuest(name, diff, skill, secSkill, deadlineIso, highStakes, priority, isBoss) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.meditationEngine.isLockedDown()) {
                new obsidian.Notice("⛔ LOCKDOWN ACTIVE");
                return;
            }
            if (this.isResting() && highStakes) {
                new obsidian.Notice("Cannot deploy High Stakes on Rest Day.");
                return;
            }
            let xpReward = 0;
            let goldReward = 0;
            let diffLabel = "";
            if (isBoss) {
                xpReward = 1000;
                goldReward = 1000;
                diffLabel = "☠️ BOSS";
            }
            else {
                switch (diff) {
                    case 1:
                        xpReward = Math.floor(this.settings.xpReq * 0.05);
                        goldReward = 10;
                        diffLabel = "Trivial";
                        break;
                    case 2:
                        xpReward = Math.floor(this.settings.xpReq * 0.10);
                        goldReward = 20;
                        diffLabel = "Easy";
                        break;
                    case 3:
                        xpReward = Math.floor(this.settings.xpReq * 0.20);
                        goldReward = 40;
                        diffLabel = "Medium";
                        break;
                    case 4:
                        xpReward = Math.floor(this.settings.xpReq * 0.40);
                        goldReward = 80;
                        diffLabel = "Hard";
                        break;
                    case 5:
                        xpReward = Math.floor(this.settings.xpReq * 0.60);
                        goldReward = 150;
                        diffLabel = "SUICIDE";
                        break;
                }
            }
            if (highStakes && !isBoss) {
                goldReward = Math.floor(goldReward * 1.5);
            }
            let deadlineStr = "None";
            let deadlineFrontmatter = "";
            if (deadlineIso) {
                deadlineStr = obsidian.moment(deadlineIso).format("YYYY-MM-DD HH:mm");
                deadlineFrontmatter = `deadline: ${deadlineIso}`;
            }
            const rootPath = "Active_Run";
            const questsPath = "Active_Run/Quests";
            if (!this.app.vault.getAbstractFileByPath(rootPath))
                yield this.app.vault.createFolder(rootPath);
            if (!this.app.vault.getAbstractFileByPath(questsPath))
                yield this.app.vault.createFolder(questsPath);
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
            if (this.app.vault.getAbstractFileByPath(filename)) {
                new obsidian.Notice("Exists!");
                return;
            }
            yield this.app.vault.create(filename, content);
            this.audio.playSound("click");
            this.save();
        });
    }
    // ... (rest of methods: deleteQuest, checkDeadlines, triggerDeath, rollChaos, attemptRecovery, isLockedDown, isResting, isShielded, taunt, parseQuickInput)
    // For brevity, we assume standard implementation below. But since this is a "rewrite" script, I MUST include them to avoid breaking the file.
    deleteQuest(file) {
        return __awaiter(this, void 0, void 0, function* () { yield this.app.vault.delete(file); new obsidian.Notice("Deployment Aborted (Deleted)"); this.save(); });
    }
    checkDeadlines() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const folder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
            if (!(folder instanceof obsidian.TFolder))
                return;
            for (const file of folder.children) {
                if (file instanceof obsidian.TFile) {
                    const fm = (_a = this.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
                    if ((fm === null || fm === void 0 ? void 0 : fm.deadline) && obsidian.moment().isAfter(obsidian.moment(fm.deadline)))
                        yield this.failQuest(file);
                }
            }
            // BOSS RESPAWN CHECK (Anti-Cheese)
            if (this.settings.level >= 10 && BOSS_DATA[10] && !this.settings.bossMilestones.some((b) => b.level === 10 && b.defeated)) {
                const f = this.app.vault.getAbstractFileByPath(`Active_Run/Quests/BOSS_LVL10 - ${BOSS_DATA[10].name}.md`);
                if (!f) {
                    new obsidian.Notice("You cannot hide from the Gatekeeper.");
                    yield this.spawnBoss(10);
                }
            }
            // (Scales to other levels if needed, simple check for LVL 10 first)
            this.save();
        });
    }
    triggerDeath() {
        return __awaiter(this, void 0, void 0, function* () {
            this.audio.playSound("death");
            const earnedSouls = Math.floor(this.settings.level * 10 + this.settings.gold / 10);
            this.settings.legacy.souls += earnedSouls;
            this.settings.legacy.deathCount = (this.settings.legacy.deathCount || 0) + 1;
            new obsidian.Notice(`💀 RUN ENDED.`);
            this.settings.hp = 100;
            this.settings.maxHp = 100;
            this.settings.xp = 0;
            this.settings.gold = 0;
            this.settings.xpReq = 100;
            this.settings.level = 1;
            this.settings.rivalDmg = 10;
            this.settings.skills = [];
            this.settings.history = [];
            this.settings.damageTakenToday = 0;
            this.settings.lockdownUntil = "";
            this.settings.shieldedUntil = "";
            this.settings.restDayUntil = "";
            this.settings.dailyMissions = [];
            this.settings.dailyMissionDate = "";
            this.settings.questsCompletedToday = 0;
            this.settings.skillUsesToday = {};
            const baseStartGold = this.settings.legacy.perks.startGold || 0;
            const scarPenalty = Math.pow(0.9, this.settings.legacy.deathCount);
            this.settings.gold = Math.floor(baseStartGold * scarPenalty);
            this.settings.runCount++;
            yield this.save();
        });
    }
    rollChaos() {
        return __awaiter(this, arguments, void 0, function* (showModal = false) {
            const roll = Math.random();
            if (roll < 0.4)
                this.settings.dailyModifier = DEFAULT_MODIFIER;
            else {
                const idx = Math.floor(Math.random() * (CHAOS_TABLE.length - 1)) + 1;
                this.settings.dailyModifier = CHAOS_TABLE[idx];
                if (this.settings.dailyModifier.name === "Rival Sabotage" && this.settings.gold > 10)
                    this.settings.gold = Math.floor(this.settings.gold * 0.9);
            }
            yield this.save();
            if (showModal)
                new ChaosModal(this.app, this.settings.dailyModifier).open();
        });
    }
    attemptRecovery() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.meditationEngine.isLockedDown()) {
                new obsidian.Notice("Not in Lockdown.");
                return;
            }
            const { hours, minutes } = this.meditationEngine.getLockdownTimeRemaining();
            new obsidian.Notice(`Recovering... ${hours}h ${minutes}m remaining.`);
            this.save();
        });
    }
    isLockedDown() { return this.meditationEngine.isLockedDown(); }
    isResting() { return this.settings.restDayUntil && obsidian.moment().isBefore(obsidian.moment(this.settings.restDayUntil)); }
    isShielded() { return this.settings.shieldedUntil && obsidian.moment().isBefore(obsidian.moment(this.settings.shieldedUntil)); }
    taunt(trigger) {
        if (Math.random() < 0.2)
            return;
        const insults = {
            "fail": ["Focus.", "Again.", "Stay sharp."],
            "shield": ["Smart move.", "Bought some time."],
            "low_hp": ["Critical condition.", "Survive."],
            "level_up": ["Stronger.", "Scaling up."],
            "lockdown": ["Overheated. Cooling down.", "Forced rest."]
        };
        const msg = insults[trigger][Math.floor(Math.random() * insults[trigger].length)];
        new obsidian.Notice(`SYSTEM: "${msg}"`, 6000);
    }
    parseQuickInput(text) {
        if (this.meditationEngine.isLockedDown()) {
            new obsidian.Notice("⛔ LOCKDOWN ACTIVE");
            return;
        }
        let diff = 3;
        let cleanText = text;
        if (text.match(/\/1/)) {
            diff = 1;
            cleanText = text.replace(/\/1/, "").trim();
        }
        else if (text.match(/\/2/)) {
            diff = 2;
            cleanText = text.replace(/\/2/, "").trim();
        }
        else if (text.match(/\/3/)) {
            diff = 3;
            cleanText = text.replace(/\/3/, "").trim();
        }
        else if (text.match(/\/4/)) {
            diff = 4;
            cleanText = text.replace(/\/4/, "").trim();
        }
        else if (text.match(/\/5/)) {
            diff = 5;
            cleanText = text.replace(/\/5/, "").trim();
        }
        const deadline = obsidian.moment().add(24, 'hours').toISOString();
        this.createQuest(cleanText, diff, "None", "None", deadline, false, "Normal", false);
    }
    // DELEGATED METHODS
    createResearchQuest(title, type, linkedSkill, linkedCombatQuest) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.researchEngine.createResearchQuest(title, type, linkedSkill, linkedCombatQuest);
            if (!result.success) {
                new obsidian.Notice(result.message);
                return;
            }
            new obsidian.Notice(result.message);
            yield this.save();
        });
    }
    completeResearchQuest(questId, finalWordCount) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = this.researchEngine.completeResearchQuest(questId, finalWordCount);
            if (!result.success) {
                new obsidian.Notice(result.message);
                return;
            }
            new obsidian.Notice(result.message);
            yield this.save();
        });
    }
    deleteResearchQuest(questId) {
        const result = this.researchEngine.deleteResearchQuest(questId);
        new obsidian.Notice(result.message);
        this.save();
    }
    updateResearchWordCount(questId, newWordCount) { this.researchEngine.updateResearchWordCount(questId, newWordCount); this.save(); }
    getResearchRatio() { return this.researchEngine.getResearchRatio(); }
    canCreateResearchQuest() { return this.researchEngine.canCreateResearchQuest(); }
    startMeditation() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = this.meditationEngine.meditate();
            if (!result.success && result.message) {
                new obsidian.Notice(result.message);
                return;
            }
            new obsidian.Notice(result.message);
            yield this.save();
        });
    }
    getMeditationStatus() { return this.meditationEngine.getMeditationStatus(); }
    canDeleteQuest() { return this.meditationEngine.canDeleteQuestFree(); }
    deleteQuestWithCost(file) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = this.meditationEngine.applyDeletionCost();
            new obsidian.Notice(result.message);
            yield this.app.vault.delete(file);
            yield this.save();
        });
    }
    createQuestChain(name, questNames) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.chainsEngine.createQuestChain(name, questNames);
            if (result.success) {
                new obsidian.Notice(result.message);
                yield this.save();
                return true;
            }
            else {
                new obsidian.Notice(result.message);
                return false;
            }
        });
    }
    getActiveChain() { return this.chainsEngine.getActiveChain(); }
    getChainProgress() { return this.chainsEngine.getChainProgress(); }
    breakChain() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.chainsEngine.breakChain();
            new obsidian.Notice(result.message);
            yield this.save();
        });
    }
    setQuestFilter(questFile, energy, context, tags) {
        this.filtersEngine.setQuestFilter(questFile.basename, energy, context, tags);
        new obsidian.Notice(`Quest tagged: ${energy} energy, ${context} context`);
        this.save();
    }
    setFilterState(energy, context, tags) {
        this.filtersEngine.setFilterState(energy, context, tags);
        new obsidian.Notice(`Filters set: ${energy} energy, ${context} context`);
        this.save();
    }
    clearFilters() { this.filtersEngine.clearFilters(); new obsidian.Notice("All filters cleared"); this.save(); }
    getFilteredQuests(quests) { return this.filtersEngine.filterQuests(quests); }
    getGameStats() { return this.analyticsEngine.getGameStats(); }
    checkBossMilestones() {
        const msgs = this.analyticsEngine.checkBossMilestones();
        msgs.forEach(m => new obsidian.Notice(m));
        this.save();
    }
    generateWeeklyReport() { return this.analyticsEngine.generateWeeklyReport(); }
}

const VIEW_TYPE_PANOPTICON = "sisyphus-panopticon";
class PanopticonView extends obsidian.ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
    }
    getViewType() { return VIEW_TYPE_PANOPTICON; }
    getDisplayText() { return "Eye Sisyphus"; }
    getIcon() { return "skull"; }
    onOpen() {
        return __awaiter(this, void 0, void 0, function* () {
            this.refresh();
            this.plugin.engine.on('update', this.refresh.bind(this));
        });
    }
    refresh() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const c = this.contentEl;
            c.empty();
            const container = c.createDiv({ cls: "sisy-container" });
            const scroll = container.createDiv({ cls: "sisy-scroll-area" });
            // --- 1. HEADER & CRITICAL ALERTS ---
            scroll.createEl("h2", { text: "Eye SISYPHUS OS", cls: "sisy-header" });
            if (this.plugin.engine.isLockedDown()) {
                const l = scroll.createDiv({ cls: "sisy-alert sisy-alert-lockdown" });
                l.createEl("h3", { text: "LOCKDOWN ACTIVE" });
                const { hours, minutes: mins } = this.plugin.engine.meditationEngine.getLockdownTimeRemaining();
                l.createEl("p", { text: `Time Remaining: ${hours}h ${mins}m` });
                const btn = l.createEl("button", { text: "ATTEMPT RECOVERY" });
                const medStatus = this.plugin.engine.getMeditationStatus();
                const medDiv = l.createDiv();
                medDiv.setAttribute("style", "margin-top: 10px; padding: 10px; background: rgba(170, 100, 255, 0.1); border-radius: 4px;");
                medDiv.createEl("p", { text: `Meditation: ${medStatus.cyclesDone}/10 (${medStatus.cyclesRemaining} left)` });
                const medBar = medDiv.createDiv();
                medBar.setAttribute("style", "height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin: 5px 0; overflow: hidden;");
                const medFill = medBar.createDiv();
                const medPercent = (medStatus.cyclesDone / 10) * 100;
                medFill.setAttribute("style", `width: ${medPercent}%; height: 100%; background: #aa64ff; transition: width 0.3s;`);
                const medBtn = medDiv.createEl("button", { text: "MEDITATE" });
                medBtn.setAttribute("style", "width: 100%; padding: 8px; margin-top: 5px; background: rgba(170, 100, 255, 0.3); border: 1px solid #aa64ff; color: #aa64ff; border-radius: 3px; cursor: pointer; font-weight: bold;");
                medBtn.onclick = () => {
                    this.plugin.engine.startMeditation();
                    setTimeout(() => this.refresh(), 100);
                };
                btn.addClass("sisy-btn");
                btn.onclick = () => this.plugin.engine.attemptRecovery();
            }
            if (this.plugin.engine.isResting()) {
                const r = scroll.createDiv({ cls: "sisy-alert sisy-alert-rest" });
                r.createEl("h3", { text: "REST DAY ACTIVE" });
                const timeRemaining = obsidian.moment(this.plugin.settings.restDayUntil).diff(obsidian.moment(), 'minutes');
                const hours = Math.floor(timeRemaining / 60);
                const mins = timeRemaining % 60;
                r.createEl("p", { text: `${hours}h ${mins}m remaining | No damage, Rust paused` });
            }
            // --- 2. HUD GRID (2x2) ---
            const hud = scroll.createDiv({ cls: "sisy-hud" });
            this.stat(hud, "HEALTH", `${this.plugin.settings.hp}/${this.plugin.settings.maxHp}`, this.plugin.settings.hp < 30 ? "sisy-critical" : "");
            this.stat(hud, "GOLD", `${this.plugin.settings.gold}`, this.plugin.settings.gold < 0 ? "sisy-val-debt" : "");
            this.stat(hud, "LEVEL", `${this.plugin.settings.level}`);
            this.stat(hud, "RIVAL DMG", `${this.plugin.settings.rivalDmg}`);
            // --- 3. THE ORACLE ---
            const oracle = scroll.createDiv({ cls: "sisy-oracle" });
            oracle.createEl("h4", { text: "ORACLE PREDICTION" });
            const survival = Math.floor(this.plugin.settings.hp / (this.plugin.settings.rivalDmg * (this.plugin.settings.gold < 0 ? 2 : 1)));
            let survText = `Survival: ${survival} days`;
            const isCrisis = this.plugin.settings.hp < 30 || this.plugin.settings.gold < 0;
            // Glitch Logic
            if (isCrisis && Math.random() < 0.3) {
                const glitches = ["[CORRUPTED]", "??? DAYS LEFT", "NO FUTURE", "RUN"];
                survText = glitches[Math.floor(Math.random() * glitches.length)];
            }
            const survEl = oracle.createDiv({ text: survText });
            if (survival < 2 || survText.includes("???") || survText.includes("CORRUPTED")) {
                survEl.setAttribute("style", "color:#ff5555; font-weight:bold; letter-spacing: 1px;");
            }
            const lights = oracle.createDiv({ cls: "sisy-status-lights" });
            if (this.plugin.settings.gold < 0)
                lights.createDiv({ text: "DEBT: YES", cls: "sisy-light-active" });
            // DLC 1: Scars display
            const scarCount = ((_a = this.plugin.settings.legacy) === null || _a === void 0 ? void 0 : _a.deathCount) || 0;
            if (scarCount > 0) {
                const scarEl = oracle.createDiv({ cls: "sisy-scar-display" });
                scarEl.createEl("span", { text: `Scars: ${scarCount}` });
                const penalty = Math.pow(0.9, scarCount);
                const percentLost = Math.floor((1 - penalty) * 100);
                scarEl.createEl("small", { text: `(-${percentLost}% starting gold)` });
            }
            // DLC 1: Next milestone
            const levelMilestones = [10, 20, 30, 50];
            const nextMilestone = levelMilestones.find(m => m > this.plugin.settings.level);
            if (nextMilestone) {
                const milestoneEl = oracle.createDiv({ cls: "sisy-milestone" });
                milestoneEl.createEl("span", { text: `Next Milestone: Level ${nextMilestone}` });
                if (nextMilestone === 10 || nextMilestone === 20 || nextMilestone === 30 || nextMilestone === 50) {
                    milestoneEl.createEl("small", { text: "(Boss Unlock)" });
                }
            }
            // --- 4. DAILY MISSIONS (DLC 1) ---
            scroll.createDiv({ text: "TODAYS OBJECTIVES", cls: "sisy-section-title" });
            this.renderDailyMissions(scroll);
            // --- 5. CONTROLS ---
            const ctrls = scroll.createDiv({ cls: "sisy-controls" });
            ctrls.createEl("button", { text: "DEPLOY", cls: "sisy-btn mod-cta" }).onclick = () => new QuestModal(this.app, this.plugin).open();
            ctrls.createEl("button", { text: "SHOP", cls: "sisy-btn" }).onclick = () => new ShopModal(this.app, this.plugin).open();
            ctrls.createEl("button", { text: "FOCUS", cls: "sisy-btn" }).onclick = () => this.plugin.audio.toggleBrownNoise();
            // --- 6. ACTIVE THREATS ---
            // --- DLC 5: CONTEXT FILTERS ---
            scroll.createDiv({ text: "FILTER CONTROLS", cls: "sisy-section-title" });
            this.renderFilterBar(scroll);
            // --- DLC 4: QUEST CHAINS ---
            const activeChain = this.plugin.engine.getActiveChain();
            if (activeChain) {
                scroll.createDiv({ text: "ACTIVE CHAIN", cls: "sisy-section-title" });
                this.renderChainSection(scroll);
            }
            // --- DLC 2: RESEARCH LIBRARY ---
            scroll.createDiv({ text: "RESEARCH LIBRARY", cls: "sisy-section-title" });
            this.renderResearchSection(scroll);
            // --- DLC 6: ANALYTICS & ENDGAME ---
            scroll.createDiv({ text: "ANALYTICS & PROGRESS", cls: "sisy-section-title" });
            this.renderAnalytics(scroll);
            // --- ACTIVE THREATS ---
            scroll.createDiv({ text: "ACTIVE THREATS", cls: "sisy-section-title" });
            yield this.renderQuests(scroll);
            scroll.createDiv({ text: "NEURAL HUB", cls: "sisy-section-title" });
            this.plugin.settings.skills.forEach((s, idx) => {
                const row = scroll.createDiv({ cls: "sisy-skill-row" });
                row.onclick = () => new SkillDetailModal(this.app, this.plugin, idx).open();
                const meta = row.createDiv({ cls: "sisy-skill-meta" });
                meta.createSpan({ text: s.name });
                meta.createSpan({ text: `Lvl ${s.level}` });
                if (s.rust > 0) {
                    meta.createSpan({ text: `RUST ${s.rust}`, cls: "sisy-rust-badge" });
                }
                const bar = row.createDiv({ cls: "sisy-bar-bg" });
                const fill = bar.createDiv({ cls: "sisy-bar-fill" });
                fill.setAttribute("style", `width: ${(s.xp / s.xpReq) * 100}%; background: ${s.rust > 0 ? '#d35400' : '#00b0ff'}`);
            });
            const addBtn = scroll.createDiv({ text: "+ Add Neural Node", cls: "sisy-add-skill" });
            addBtn.onclick = () => new SkillManagerModal(this.app, this.plugin).open();
            // --- 8. QUICK CAPTURE ---
            const footer = container.createDiv({ cls: "sisy-quick-capture" });
            const input = footer.createEl("input", { cls: "sisy-quick-input", placeholder: "Mission /1...5" });
            input.onkeydown = (e) => __awaiter(this, void 0, void 0, function* () {
                if (e.key === 'Enter' && input.value.trim()) {
                    this.plugin.engine.parseQuickInput(input.value.trim());
                    input.value = "";
                }
            });
        });
    }
    // DLC 1: Render Daily Missions
    renderDailyMissions(parent) {
        const missions = this.plugin.settings.dailyMissions || [];
        if (missions.length === 0) {
            parent.createDiv({ text: "No missions today. Check back tomorrow.", cls: "sisy-empty-state" });
            return;
        }
        const missionsDiv = parent.createDiv({ cls: "sisy-daily-missions" });
        missions.forEach((mission) => {
            const card = missionsDiv.createDiv({ cls: "sisy-mission-card" });
            if (mission.completed)
                card.addClass("sisy-mission-completed");
            const header = card.createDiv({ cls: "sisy-mission-header" });
            const statusIcon = mission.completed ? "YES" : "..";
            header.createEl("span", { text: statusIcon, cls: "sisy-mission-status" });
            header.createEl("span", { text: mission.name, cls: "sisy-mission-name" });
            card.createEl("p", { text: mission.desc, cls: "sisy-mission-desc" });
            const progress = card.createDiv({ cls: "sisy-mission-progress" });
            progress.createEl("span", { text: `${mission.progress}/${mission.target}`, cls: "sisy-mission-counter" });
            const bar = progress.createDiv({ cls: "sisy-bar-bg" });
            const fill = bar.createDiv({ cls: "sisy-bar-fill" });
            const percent = (mission.progress / mission.target) * 100;
            fill.setAttribute("style", `width: ${Math.min(percent, 100)}%`);
            const reward = card.createDiv({ cls: "sisy-mission-reward" });
            if (mission.reward.xp > 0)
                reward.createSpan({ text: `+${mission.reward.xp} XP`, cls: "sisy-reward-xp" });
            if (mission.reward.gold > 0)
                reward.createSpan({ text: `+${mission.reward.gold}g`, cls: "sisy-reward-gold" });
        });
        const allCompleted = missions.every(m => m.completed);
        if (allCompleted && missions.length > 0) {
            missionsDiv.createDiv({ text: "All Missions Complete! +50 Bonus Gold", cls: "sisy-mission-bonus" });
        }
    }
    // DLC 2: Render Research Quests Section
    renderResearchSection(parent) {
        const researchQuests = this.plugin.settings.researchQuests || [];
        const activeResearch = researchQuests.filter(q => !q.completed);
        const completedResearch = researchQuests.filter(q => q.completed);
        // Stats bar
        const stats = this.plugin.engine.getResearchRatio();
        const statsDiv = parent.createDiv({ cls: "sisy-research-stats" });
        statsDiv.setAttribute("style", "border: 1px solid #666; padding: 10px; border-radius: 4px; margin-bottom: 10px; background: rgba(170, 100, 255, 0.05);");
        const ratioText = statsDiv.createEl("p", { text: `Research Ratio: ${stats.combat}:${stats.research} (${stats.ratio}:1)` });
        ratioText.setAttribute("style", "margin: 5px 0; font-size: 0.9em;");
        if (!this.plugin.engine.canCreateResearchQuest()) {
            const warning = statsDiv.createEl("p", { text: "BLOCKED: Need 2 combat per 1 research" });
            warning.setAttribute("style", "color: orange; font-weight: bold; margin: 5px 0;");
        }
        // Active Research
        parent.createDiv({ text: "ACTIVE RESEARCH", cls: "sisy-section-title" });
        if (activeResearch.length === 0) {
            parent.createDiv({ text: "No active research.", cls: "sisy-empty-state" });
        }
        else {
            activeResearch.forEach((quest) => {
                const card = parent.createDiv({ cls: "sisy-research-card" });
                card.setAttribute("style", "border: 1px solid #aa64ff; padding: 10px; margin-bottom: 8px; border-radius: 4px; background: rgba(170, 100, 255, 0.05);");
                const header = card.createDiv();
                header.setAttribute("style", "display: flex; justify-content: space-between; margin-bottom: 6px;");
                const title = header.createEl("span", { text: quest.title });
                title.setAttribute("style", "font-weight: bold; flex: 1;");
                const typeLabel = header.createEl("span", { text: quest.type === "survey" ? "SURVEY" : "DEEP DIVE" });
                typeLabel.setAttribute("style", "font-size: 0.75em; padding: 2px 6px; background: rgba(170, 100, 255, 0.3); border-radius: 2px;");
                const wordCount = card.createEl("p", { text: `Words: ${quest.wordCount}/${quest.wordLimit}` });
                wordCount.setAttribute("style", "margin: 5px 0; font-size: 0.85em;");
                const bar = card.createDiv();
                bar.setAttribute("style", "height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin: 6px 0;");
                const fill = bar.createDiv();
                const percent = Math.min(100, (quest.wordCount / quest.wordLimit) * 100);
                fill.setAttribute("style", `width: ${percent}%; height: 100%; background: #aa64ff; transition: width 0.3s;`);
                const actions = card.createDiv();
                actions.setAttribute("style", "display: flex; gap: 5px; margin-top: 8px;");
                const viewBtn = actions.createEl("button", { text: "COMPLETE" });
                viewBtn.setAttribute("style", "flex: 1; padding: 6px; background: rgba(85, 255, 85, 0.2); border: 1px solid #55ff55; color: #55ff55; border-radius: 3px; cursor: pointer; font-size: 0.85em;");
                viewBtn.onclick = () => {
                    this.plugin.engine.completeResearchQuest(quest.id, quest.wordCount);
                    this.refresh();
                };
                const deleteBtn = actions.createEl("button", { text: "DELETE" });
                deleteBtn.setAttribute("style", "flex: 1; padding: 6px; background: rgba(255, 85, 85, 0.2); border: 1px solid #ff5555; color: #ff5555; border-radius: 3px; cursor: pointer; font-size: 0.85em;");
                deleteBtn.onclick = () => {
                    this.plugin.engine.deleteResearchQuest(quest.id);
                    this.refresh();
                };
            });
        }
        // Completed Research
        parent.createDiv({ text: "COMPLETED RESEARCH", cls: "sisy-section-title" });
        if (completedResearch.length === 0) {
            parent.createDiv({ text: "No completed research.", cls: "sisy-empty-state" });
        }
        else {
            completedResearch.forEach((quest) => {
                const item = parent.createEl("p", { text: `+ ${quest.title} (${quest.type === "survey" ? "Survey" : "Deep Dive"})` });
                item.setAttribute("style", "opacity: 0.6; font-size: 0.9em; margin: 3px 0;");
            });
        }
    }
    renderQuests(parent) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const folder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
            let count = 0;
            if (folder instanceof obsidian.TFolder) {
                const files = folder.children.filter(f => f instanceof obsidian.TFile);
                files.sort((a, b) => {
                    var _a, _b;
                    const fmA = (_a = this.app.metadataCache.getFileCache(a)) === null || _a === void 0 ? void 0 : _a.frontmatter;
                    const fmB = (_b = this.app.metadataCache.getFileCache(b)) === null || _b === void 0 ? void 0 : _b.frontmatter;
                    const dateA = (fmA === null || fmA === void 0 ? void 0 : fmA.deadline) ? obsidian.moment(fmA.deadline).valueOf() : 9999999999999;
                    const dateB = (fmB === null || fmB === void 0 ? void 0 : fmB.deadline) ? obsidian.moment(fmB.deadline).valueOf() : 9999999999999;
                    return dateA - dateB;
                });
                for (const file of files) {
                    count++;
                    const fm = (_a = this.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
                    const card = parent.createDiv({ cls: "sisy-card" });
                    if (fm === null || fm === void 0 ? void 0 : fm.is_boss)
                        card.addClass("sisy-card-boss");
                    const d = String((fm === null || fm === void 0 ? void 0 : fm.difficulty) || "").match(/\d/);
                    if (d)
                        card.addClass(`sisy-card-${d[0]}`);
                    // Top section with title and timer
                    const top = card.createDiv({ cls: "sisy-card-top" });
                    top.createDiv({ text: file.basename, cls: "sisy-card-title" });
                    // Timer
                    if (fm === null || fm === void 0 ? void 0 : fm.deadline) {
                        const diff = obsidian.moment(fm.deadline).diff(obsidian.moment(), 'minutes');
                        const hours = Math.floor(diff / 60);
                        const mins = diff % 60;
                        const timerText = diff < 0 ? "EXPIRED" : `${hours}h ${mins}m`;
                        const timer = top.createDiv({ text: timerText, cls: "sisy-timer" });
                        if (diff < 60)
                            timer.addClass("sisy-timer-late");
                    }
                    // Trash icon (inline, not absolute)
                    const trash = top.createDiv({ cls: "sisy-trash", text: "[X]" });
                    trash.style.cursor = "pointer";
                    trash.style.color = "#ff5555";
                    trash.onclick = (e) => {
                        e.stopPropagation();
                        this.plugin.engine.deleteQuest(file);
                    };
                    // Action buttons
                    const acts = card.createDiv({ cls: "sisy-actions" });
                    const bD = acts.createEl("button", { text: "OK", cls: "sisy-action-btn mod-done" });
                    bD.onclick = () => this.plugin.engine.completeQuest(file);
                    const bF = acts.createEl("button", { text: "XX", cls: "sisy-action-btn mod-fail" });
                    bF.onclick = () => this.plugin.engine.failQuest(file, true);
                }
            }
            if (count === 0) {
                const idle = parent.createDiv({ text: "System Idle.", cls: "sisy-empty-state" });
                const ctaBtn = idle.createEl("button", { text: "[DEPLOY QUEST]", cls: "sisy-btn mod-cta" });
                ctaBtn.style.marginTop = "10px";
                ctaBtn.onclick = () => new QuestModal(this.app, this.plugin).open();
            }
        });
    }
    renderChainSection(parent) {
        const chain = this.plugin.engine.getActiveChain();
        if (!chain) {
            parent.createDiv({ text: "No active chain.", cls: "sisy-empty-state" });
            return;
        }
        const chainDiv = parent.createDiv({ cls: "sisy-chain-container" });
        chainDiv.setAttribute("style", "border: 1px solid #4caf50; padding: 12px; border-radius: 4px; background: rgba(76, 175, 80, 0.05); margin-bottom: 10px;");
        const header = chainDiv.createEl("h3", { text: chain.name });
        header.setAttribute("style", "margin: 0 0 10px 0; color: #4caf50;");
        const progress = this.plugin.engine.getChainProgress();
        const progressText = chainDiv.createEl("p", { text: `Progress: ${progress.completed}/${progress.total}` });
        progressText.setAttribute("style", "margin: 5px 0; font-size: 0.9em;");
        const bar = chainDiv.createDiv();
        bar.setAttribute("style", "height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin: 8px 0; overflow: hidden;");
        const fill = bar.createDiv();
        fill.setAttribute("style", `width: ${progress.percent}%; height: 100%; background: #4caf50; transition: width 0.3s;`);
        const questList = chainDiv.createDiv({ cls: "sisy-chain-quests" });
        questList.setAttribute("style", "margin: 10px 0; font-size: 0.85em;");
        chain.quests.forEach((quest, idx) => {
            const item = questList.createEl("p");
            const icon = idx < progress.completed ? "OK" : idx === progress.completed ? ">>>" : "LOCK";
            const status = idx < progress.completed ? "DONE" : idx === progress.completed ? "ACTIVE" : "LOCKED";
            item.setText(`[${icon}] ${quest} (${status})`);
            item.setAttribute("style", `margin: 3px 0; padding: 3px; 
                ${idx < progress.completed ? "opacity: 0.6;" : idx === progress.completed ? "font-weight: bold; color: #4caf50;" : "opacity: 0.4;"}`);
        });
        const actions = chainDiv.createDiv();
        actions.setAttribute("style", "display: flex; gap: 5px; margin-top: 10px;");
        const breakBtn = actions.createEl("button", { text: "BREAK CHAIN" });
        breakBtn.setAttribute("style", "flex: 1; padding: 6px; background: rgba(255, 85, 85, 0.2); border: 1px solid #ff5555; color: #ff5555; border-radius: 3px; cursor: pointer; font-size: 0.8em;");
        breakBtn.onclick = () => __awaiter(this, void 0, void 0, function* () {
            yield this.plugin.engine.breakChain();
            this.refresh();
        });
    }
    renderFilterBar(parent) {
        const filters = this.plugin.settings.filterState;
        const filterDiv = parent.createDiv({ cls: "sisy-filter-bar" });
        filterDiv.setAttribute("style", "border: 1px solid #0088ff; padding: 10px; border-radius: 4px; background: rgba(0, 136, 255, 0.05); margin-bottom: 15px;");
        // Energy filter
        const energyDiv = filterDiv.createDiv();
        energyDiv.setAttribute("style", "margin-bottom: 8px;");
        energyDiv.createEl("span", { text: "Energy: " }).setAttribute("style", "font-weight: bold;");
        const energyOptions = ["any", "high", "medium", "low"];
        energyOptions.forEach(opt => {
            const btn = energyDiv.createEl("button", { text: opt.toUpperCase() });
            btn.setAttribute("style", `margin: 0 3px; padding: 4px 8px; border-radius: 3px; cursor: pointer; 
                ${filters.activeEnergy === opt ? "background: #0088ff; color: white;" : "background: rgba(0, 136, 255, 0.2);"}`);
            btn.onclick = () => {
                this.plugin.engine.setFilterState(opt, filters.activeContext, filters.activeTags);
                this.refresh();
            };
        });
        // Context filter
        const contextDiv = filterDiv.createDiv();
        contextDiv.setAttribute("style", "margin-bottom: 8px;");
        contextDiv.createEl("span", { text: "Context: " }).setAttribute("style", "font-weight: bold;");
        const contextOptions = ["any", "home", "office", "anywhere"];
        contextOptions.forEach(opt => {
            const btn = contextDiv.createEl("button", { text: opt.toUpperCase() });
            btn.setAttribute("style", `margin: 0 3px; padding: 4px 8px; border-radius: 3px; cursor: pointer; 
                ${filters.activeContext === opt ? "background: #0088ff; color: white;" : "background: rgba(0, 136, 255, 0.2);"}`);
            btn.onclick = () => {
                this.plugin.engine.setFilterState(filters.activeEnergy, opt, filters.activeTags);
                this.refresh();
            };
        });
        // Clear button
        const clearBtn = filterDiv.createEl("button", { text: "CLEAR FILTERS" });
        clearBtn.setAttribute("style", "width: 100%; padding: 6px; margin-top: 8px; background: rgba(255, 85, 85, 0.2); border: 1px solid #ff5555; color: #ff5555; border-radius: 3px; cursor: pointer; font-weight: bold;");
        clearBtn.onclick = () => {
            this.plugin.engine.clearFilters();
            this.refresh();
        };
    }
    renderAnalytics(parent) {
        const stats = this.plugin.engine.getGameStats();
        const analyticsDiv = parent.createDiv({ cls: "sisy-analytics" });
        analyticsDiv.setAttribute("style", "border: 1px solid #ffc107; padding: 12px; border-radius: 4px; background: rgba(255, 193, 7, 0.05); margin-bottom: 15px;");
        analyticsDiv.createEl("h3", { text: "ANALYTICS & PROGRESS" }).setAttribute("style", "margin: 0 0 10px 0; color: #ffc107;");
        // Stats grid
        const statsDiv = analyticsDiv.createDiv();
        statsDiv.setAttribute("style", "display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;");
        const stats_items = [
            { label: "Level", value: stats.level },
            { label: "Current Streak", value: stats.currentStreak },
            { label: "Longest Streak", value: stats.longestStreak },
            { label: "Total Quests", value: stats.totalQuests }
        ];
        stats_items.forEach(item => {
            const statBox = statsDiv.createDiv();
            statBox.setAttribute("style", "border: 1px solid #ffc107; padding: 8px; border-radius: 3px; background: rgba(255, 193, 7, 0.1);");
            statBox.createEl("p", { text: item.label }).setAttribute("style", "margin: 0; font-size: 0.8em; opacity: 0.7;");
            statBox.createEl("p", { text: String(item.value) }).setAttribute("style", "margin: 5px 0 0 0; font-size: 1.2em; font-weight: bold; color: #ffc107;");
        });
        // Boss progress
        analyticsDiv.createEl("h4", { text: "Boss Milestones" }).setAttribute("style", "margin: 12px 0 8px 0; color: #ffc107;");
        const bosses = this.plugin.settings.bossMilestones;
        if (bosses && bosses.length > 0) {
            bosses.forEach((boss) => {
                const bossItem = analyticsDiv.createDiv();
                bossItem.setAttribute("style", "margin: 6px 0; padding: 8px; background: rgba(0, 0, 0, 0.2); border-radius: 3px;");
                const icon = boss.defeated ? "OK" : boss.unlocked ? ">>" : "LOCK";
                const name = bossItem.createEl("span", { text: `[${icon}] Level ${boss.level}: ${boss.name}` });
                name.setAttribute("style", boss.defeated ? "color: #4caf50; font-weight: bold;" : boss.unlocked ? "color: #ffc107;" : "opacity: 0.5;");
            });
        }
        // Win condition
        if (stats.gameWon) {
            const winDiv = analyticsDiv.createDiv();
            winDiv.setAttribute("style", "margin-top: 12px; padding: 12px; background: rgba(76, 175, 80, 0.2); border: 2px solid #4caf50; border-radius: 4px; text-align: center;");
            winDiv.createEl("p", { text: "GAME WON!" }).setAttribute("style", "margin: 0; font-size: 1.2em; font-weight: bold; color: #4caf50;");
        }
    }
    stat(p, label, val, cls = "") {
        const b = p.createDiv({ cls: "sisy-stat-box" });
        if (cls)
            b.addClass(cls);
        b.createDiv({ text: label, cls: "sisy-stat-label" });
        b.createDiv({ text: val, cls: "sisy-stat-val" });
    }
    onClose() {
        return __awaiter(this, void 0, void 0, function* () {
            this.plugin.engine.off('update', this.refresh.bind(this));
        });
    }
}

const DEFAULT_SETTINGS = {
    hp: 100, maxHp: 100, xp: 0, gold: 0, xpReq: 100, level: 1, rivalDmg: 10,
    lastLogin: "", shieldedUntil: "", restDayUntil: "", skills: [],
    dailyModifier: DEFAULT_MODIFIER,
    legacy: { souls: 0, perks: { startGold: 0, startSkillPoints: 0, rivalDelay: 0 }, relics: [], deathCount: 0 },
    muted: false, history: [], runCount: 1, lockdownUntil: "", damageTakenToday: 0,
    dailyMissions: [],
    dailyMissionDate: "",
    questsCompletedToday: 0,
    skillUsesToday: {},
    researchQuests: [],
    researchStats: { totalResearch: 0, totalCombat: 0, researchCompleted: 0, combatCompleted: 0 },
    lastResearchQuestId: 0,
    meditationCyclesCompleted: 0,
    questDeletionsToday: 0,
    lastDeletionReset: "",
    isMeditating: false,
    meditationClicksThisLockdown: 0,
    activeChains: [],
    chainHistory: [],
    currentChainId: "",
    chainQuestsCompleted: 0,
    questFilters: {},
    filterState: { activeEnergy: "any", activeContext: "any", activeTags: [] },
    dayMetrics: [],
    weeklyReports: [],
    bossMilestones: [],
    streak: { current: 0, longest: 0, lastDate: "" },
    achievements: [],
    gameWon: false
};
class SisyphusPlugin extends obsidian.Plugin {
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadSettings();
            this.loadStyles();
            this.audio = new AudioController(this.settings.muted);
            this.engine = new SisyphusEngine(this.app, this, this.audio);
            this.registerView(VIEW_TYPE_PANOPTICON, (leaf) => new PanopticonView(leaf, this));
            this.statusBarItem = this.addStatusBarItem();
            yield this.engine.checkDailyLogin();
            this.updateStatusBar();
            this.addCommand({ id: 'open-panopticon', name: 'Open Panopticon (Sidebar)', callback: () => this.activateView() });
            this.addCommand({ id: 'toggle-focus', name: 'Toggle Focus Noise', callback: () => this.audio.toggleBrownNoise() });
            this.addCommand({ id: 'reroll-chaos', name: 'Reroll Chaos', callback: () => this.engine.rollChaos(true) });
            this.addCommand({ id: 'accept-death', name: 'ACCEPT DEATH', callback: () => this.engine.triggerDeath() });
            this.addCommand({ id: 'recover', name: 'Recover (Lockdown)', callback: () => this.engine.attemptRecovery() });
            this.addCommand({
                id: 'create-research',
                name: 'Research: Create Research Quest',
                callback: () => new ResearchQuestModal(this.app, this).open()
            });
            this.addCommand({
                id: 'view-research',
                name: 'Research: View Research Library',
                callback: () => new ResearchListModal(this.app, this).open()
            });
            this.addCommand({
                id: 'meditate',
                name: 'Meditation: Start Meditation',
                callback: () => this.engine.startMeditation()
            });
            this.addCommand({
                id: 'create-chain',
                name: 'Chains: Create Quest Chain',
                callback: () => {
                    new ChainBuilderModal(this.app, this).open();
                }
            });
            this.addCommand({
                id: 'view-chains',
                name: 'Chains: View Active Chain',
                callback: () => {
                    const chain = this.engine.getActiveChain();
                    if (chain) {
                        new obsidian.Notice(`Active Chain: ${chain.name} (${this.engine.getChainProgress().completed}/${chain.quests.length})`);
                    }
                    else {
                        new obsidian.Notice("No active chain");
                    }
                }
            });
            this.addCommand({
                id: 'filter-high-energy',
                name: 'Filters: Show High Energy Quests',
                callback: () => this.engine.setFilterState("high", "any", [])
            });
            this.addCommand({
                id: 'filter-medium-energy',
                name: 'Filters: Show Medium Energy Quests',
                callback: () => this.engine.setFilterState("medium", "any", [])
            });
            this.addCommand({
                id: 'filter-low-energy',
                name: 'Filters: Show Low Energy Quests',
                callback: () => this.engine.setFilterState("low", "any", [])
            });
            this.addCommand({
                id: 'clear-filters',
                name: 'Filters: Clear All Filters',
                callback: () => this.engine.clearFilters()
            });
            this.addCommand({
                id: 'weekly-report',
                name: 'Analytics: Generate Weekly Report',
                callback: () => {
                    const report = this.engine.generateWeeklyReport();
                    new obsidian.Notice(`Week ${report.week}: ${report.totalQuests} quests, ${report.successRate}% success`);
                }
            });
            this.addCommand({
                id: 'game-stats',
                name: 'Analytics: View Game Stats',
                callback: () => {
                    const stats = this.engine.getGameStats();
                    new obsidian.Notice(`Level: ${stats.level} | Streak: ${stats.currentStreak} | Quests: ${stats.totalQuests}`);
                }
            });
            this.addCommand({
                id: 'check-bosses',
                name: 'Endgame: Check Boss Milestones',
                callback: () => this.engine.checkBossMilestones()
            });
            this.addRibbonIcon('skull', 'Sisyphus Sidebar', () => this.activateView());
            this.registerInterval(window.setInterval(() => this.engine.checkDeadlines(), 60000));
        });
    }
    loadStyles() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cssFile = this.app.vault.getAbstractFileByPath(this.manifest.dir + "/styles.css");
                if (cssFile instanceof obsidian.TFile) {
                    const css = yield this.app.vault.read(cssFile);
                    const style = document.createElement("style");
                    style.id = "sisyphus-styles";
                    style.innerHTML = css;
                    document.head.appendChild(style);
                }
            }
            catch (e) {
                console.error("Could not load styles.css", e);
            }
        });
    }
    onunload() {
        return __awaiter(this, void 0, void 0, function* () {
            this.app.workspace.detachLeavesOfType(VIEW_TYPE_PANOPTICON);
            if (this.audio.audioCtx)
                this.audio.audioCtx.close();
            const style = document.getElementById("sisyphus-styles");
            if (style)
                style.remove();
        });
    }
    activateView() {
        return __awaiter(this, void 0, void 0, function* () {
            const { workspace } = this.app;
            let leaf = null;
            const leaves = workspace.getLeavesOfType(VIEW_TYPE_PANOPTICON);
            if (leaves.length > 0) {
                leaf = leaves[0];
            }
            else {
                leaf = workspace.getRightLeaf(false);
                yield leaf.setViewState({ type: VIEW_TYPE_PANOPTICON, active: true });
            }
            workspace.revealLeaf(leaf);
        });
    }
    refreshUI() {
        this.updateStatusBar();
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_PANOPTICON);
        if (leaves.length > 0)
            leaves[0].view.refresh();
    }
    updateStatusBar() {
        let shield = (this.engine.isShielded() || this.engine.isResting()) ? (this.engine.isResting() ? "D" : "S") : "";
        const completedMissions = this.settings.dailyMissions.filter(m => m.completed).length;
        const totalMissions = this.settings.dailyMissions.length;
        const missionProgress = totalMissions > 0 ? `M${completedMissions}/${totalMissions}` : "";
        const statusText = `${this.settings.dailyModifier.icon} ${shield} HP${this.settings.hp}/${this.settings.maxHp} G${this.settings.gold} Lvl${this.settings.level} ${missionProgress}`;
        this.statusBarItem.setText(statusText);
        if (this.settings.hp < 30)
            this.statusBarItem.style.color = "red";
        else if (this.settings.gold < 0)
            this.statusBarItem.style.color = "orange";
        else
            this.statusBarItem.style.color = "";
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData());
            if (!this.settings.legacy)
                this.settings.legacy = { souls: 0, perks: { startGold: 0, startSkillPoints: 0, rivalDelay: 0 }, relics: [], deathCount: 0 };
            if (this.settings.legacy.deathCount === undefined)
                this.settings.legacy.deathCount = 0;
            if (!this.settings.history)
                this.settings.history = [];
            if (!this.settings.dailyMissions)
                this.settings.dailyMissions = [];
            if (!this.settings.dailyMissionDate)
                this.settings.dailyMissionDate = "";
            if (this.settings.questsCompletedToday === undefined)
                this.settings.questsCompletedToday = 0;
            if (!this.settings.skillUsesToday)
                this.settings.skillUsesToday = {};
            if (!this.settings.researchQuests)
                this.settings.researchQuests = [];
            if (!this.settings.researchStats)
                this.settings.researchStats = {
                    totalResearch: 0,
                    totalCombat: 0,
                    researchCompleted: 0,
                    combatCompleted: 0
                };
            if (this.settings.lastResearchQuestId === undefined)
                this.settings.lastResearchQuestId = 0;
            if (this.settings.meditationCyclesCompleted === undefined)
                this.settings.meditationCyclesCompleted = 0;
            if (this.settings.questDeletionsToday === undefined)
                this.settings.questDeletionsToday = 0;
            if (!this.settings.lastDeletionReset)
                this.settings.lastDeletionReset = "";
            if (this.settings.isMeditating === undefined)
                this.settings.isMeditating = false;
            if (this.settings.meditationClicksThisLockdown === undefined)
                this.settings.meditationClicksThisLockdown = 0;
            if (!this.settings.activeChains)
                this.settings.activeChains = [];
            if (!this.settings.chainHistory)
                this.settings.chainHistory = [];
            if (!this.settings.currentChainId)
                this.settings.currentChainId = "";
            if (this.settings.chainQuestsCompleted === undefined)
                this.settings.chainQuestsCompleted = 0;
            if (!this.settings.questFilters)
                this.settings.questFilters = {};
            if (!this.settings.filterState)
                this.settings.filterState = { activeEnergy: "any", activeContext: "any", activeTags: [] };
            if (!this.settings.dayMetrics)
                this.settings.dayMetrics = [];
            if (!this.settings.weeklyReports)
                this.settings.weeklyReports = [];
            if (!this.settings.bossMilestones)
                this.settings.bossMilestones = [];
            if (!this.settings.streak)
                this.settings.streak = { current: 0, longest: 0, lastDate: "" };
            if (!this.settings.achievements)
                this.settings.achievements = [];
            if (this.settings.gameWon === undefined)
                this.settings.gameWon = false;
            this.settings.skills = this.settings.skills.map(s => (Object.assign(Object.assign({}, s), { rust: s.rust || 0, lastUsed: s.lastUsed || new Date().toISOString(), connections: s.connections || [] })));
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () { yield this.saveData(this.settings); });
    }
}

module.exports = SisyphusPlugin;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInNyYy91dGlscy50cyIsInNyYy91aS9tb2RhbHMudHMiLCJzcmMvZW5naW5lcy9BbmFseXRpY3NFbmdpbmUudHMiLCJzcmMvZW5naW5lcy9NZWRpdGF0aW9uRW5naW5lLnRzIiwic3JjL2VuZ2luZXMvUmVzZWFyY2hFbmdpbmUudHMiLCJzcmMvZW5naW5lcy9DaGFpbnNFbmdpbmUudHMiLCJzcmMvZW5naW5lcy9GaWx0ZXJzRW5naW5lLnRzIiwic3JjL2VuZ2luZS50cyIsInNyYy91aS92aWV3LnRzIiwic3JjL21haW4udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG5Db3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi5cclxuXHJcblBlcm1pc3Npb24gdG8gdXNlLCBjb3B5LCBtb2RpZnksIGFuZC9vciBkaXN0cmlidXRlIHRoaXMgc29mdHdhcmUgZm9yIGFueVxyXG5wdXJwb3NlIHdpdGggb3Igd2l0aG91dCBmZWUgaXMgaGVyZWJ5IGdyYW50ZWQuXHJcblxyXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiIEFORCBUSEUgQVVUSE9SIERJU0NMQUlNUyBBTEwgV0FSUkFOVElFUyBXSVRIXHJcblJFR0FSRCBUTyBUSElTIFNPRlRXQVJFIElOQ0xVRElORyBBTEwgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWVxyXG5BTkQgRklUTkVTUy4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUiBCRSBMSUFCTEUgRk9SIEFOWSBTUEVDSUFMLCBESVJFQ1QsXHJcbklORElSRUNULCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVMgT1IgQU5ZIERBTUFHRVMgV0hBVFNPRVZFUiBSRVNVTFRJTkcgRlJPTVxyXG5MT1NTIE9GIFVTRSwgREFUQSBPUiBQUk9GSVRTLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgTkVHTElHRU5DRSBPUlxyXG5PVEhFUiBUT1JUSU9VUyBBQ1RJT04sIEFSSVNJTkcgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgVVNFIE9SXHJcblBFUkZPUk1BTkNFIE9GIFRISVMgU09GVFdBUkUuXHJcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqICovXHJcbi8qIGdsb2JhbCBSZWZsZWN0LCBQcm9taXNlLCBTdXBwcmVzc2VkRXJyb3IsIFN5bWJvbCwgSXRlcmF0b3IgKi9cclxuXHJcbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwgcCkpIGRbcF0gPSBiW3BdOyB9O1xyXG4gICAgcmV0dXJuIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHRlbmRzKGQsIGIpIHtcclxuICAgIGlmICh0eXBlb2YgYiAhPT0gXCJmdW5jdGlvblwiICYmIGIgIT09IG51bGwpXHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNsYXNzIGV4dGVuZHMgdmFsdWUgXCIgKyBTdHJpbmcoYikgKyBcIiBpcyBub3QgYSBjb25zdHJ1Y3RvciBvciBudWxsXCIpO1xyXG4gICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XHJcbiAgICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gX19hc3NpZ24odCkge1xyXG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpIHRbcF0gPSBzW3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH1cclxuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXN0KHMsIGUpIHtcclxuICAgIHZhciB0ID0ge307XHJcbiAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcclxuICAgICAgICB0W3BdID0gc1twXTtcclxuICAgIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChlLmluZGV4T2YocFtpXSkgPCAwICYmIE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChzLCBwW2ldKSlcclxuICAgICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xyXG4gICAgICAgIH1cclxuICAgIHJldHVybiB0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXNEZWNvcmF0ZShjdG9yLCBkZXNjcmlwdG9ySW4sIGRlY29yYXRvcnMsIGNvbnRleHRJbiwgaW5pdGlhbGl6ZXJzLCBleHRyYUluaXRpYWxpemVycykge1xyXG4gICAgZnVuY3Rpb24gYWNjZXB0KGYpIHsgaWYgKGYgIT09IHZvaWQgMCAmJiB0eXBlb2YgZiAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRnVuY3Rpb24gZXhwZWN0ZWRcIik7IHJldHVybiBmOyB9XHJcbiAgICB2YXIga2luZCA9IGNvbnRleHRJbi5raW5kLCBrZXkgPSBraW5kID09PSBcImdldHRlclwiID8gXCJnZXRcIiA6IGtpbmQgPT09IFwic2V0dGVyXCIgPyBcInNldFwiIDogXCJ2YWx1ZVwiO1xyXG4gICAgdmFyIHRhcmdldCA9ICFkZXNjcmlwdG9ySW4gJiYgY3RvciA/IGNvbnRleHRJbltcInN0YXRpY1wiXSA/IGN0b3IgOiBjdG9yLnByb3RvdHlwZSA6IG51bGw7XHJcbiAgICB2YXIgZGVzY3JpcHRvciA9IGRlc2NyaXB0b3JJbiB8fCAodGFyZ2V0ID8gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGNvbnRleHRJbi5uYW1lKSA6IHt9KTtcclxuICAgIHZhciBfLCBkb25lID0gZmFsc2U7XHJcbiAgICBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgIHZhciBjb250ZXh0ID0ge307XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4pIGNvbnRleHRbcF0gPSBwID09PSBcImFjY2Vzc1wiID8ge30gOiBjb250ZXh0SW5bcF07XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4uYWNjZXNzKSBjb250ZXh0LmFjY2Vzc1twXSA9IGNvbnRleHRJbi5hY2Nlc3NbcF07XHJcbiAgICAgICAgY29udGV4dC5hZGRJbml0aWFsaXplciA9IGZ1bmN0aW9uIChmKSB7IGlmIChkb25lKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGFkZCBpbml0aWFsaXplcnMgYWZ0ZXIgZGVjb3JhdGlvbiBoYXMgY29tcGxldGVkXCIpOyBleHRyYUluaXRpYWxpemVycy5wdXNoKGFjY2VwdChmIHx8IG51bGwpKTsgfTtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gKDAsIGRlY29yYXRvcnNbaV0pKGtpbmQgPT09IFwiYWNjZXNzb3JcIiA/IHsgZ2V0OiBkZXNjcmlwdG9yLmdldCwgc2V0OiBkZXNjcmlwdG9yLnNldCB9IDogZGVzY3JpcHRvcltrZXldLCBjb250ZXh0KTtcclxuICAgICAgICBpZiAoa2luZCA9PT0gXCJhY2Nlc3NvclwiKSB7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IHZvaWQgMCkgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IG51bGwgfHwgdHlwZW9mIHJlc3VsdCAhPT0gXCJvYmplY3RcIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBleHBlY3RlZFwiKTtcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmdldCkpIGRlc2NyaXB0b3IuZ2V0ID0gXztcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LnNldCkpIGRlc2NyaXB0b3Iuc2V0ID0gXztcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmluaXQpKSBpbml0aWFsaXplcnMudW5zaGlmdChfKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoXyA9IGFjY2VwdChyZXN1bHQpKSB7XHJcbiAgICAgICAgICAgIGlmIChraW5kID09PSBcImZpZWxkXCIpIGluaXRpYWxpemVycy51bnNoaWZ0KF8pO1xyXG4gICAgICAgICAgICBlbHNlIGRlc2NyaXB0b3Jba2V5XSA9IF87XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRhcmdldCkgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgY29udGV4dEluLm5hbWUsIGRlc2NyaXB0b3IpO1xyXG4gICAgZG9uZSA9IHRydWU7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19ydW5Jbml0aWFsaXplcnModGhpc0FyZywgaW5pdGlhbGl6ZXJzLCB2YWx1ZSkge1xyXG4gICAgdmFyIHVzZVZhbHVlID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGluaXRpYWxpemVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhbHVlID0gdXNlVmFsdWUgPyBpbml0aWFsaXplcnNbaV0uY2FsbCh0aGlzQXJnLCB2YWx1ZSkgOiBpbml0aWFsaXplcnNbaV0uY2FsbCh0aGlzQXJnKTtcclxuICAgIH1cclxuICAgIHJldHVybiB1c2VWYWx1ZSA/IHZhbHVlIDogdm9pZCAwO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcHJvcEtleSh4KSB7XHJcbiAgICByZXR1cm4gdHlwZW9mIHggPT09IFwic3ltYm9sXCIgPyB4IDogXCJcIi5jb25jYXQoeCk7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zZXRGdW5jdGlvbk5hbWUoZiwgbmFtZSwgcHJlZml4KSB7XHJcbiAgICBpZiAodHlwZW9mIG5hbWUgPT09IFwic3ltYm9sXCIpIG5hbWUgPSBuYW1lLmRlc2NyaXB0aW9uID8gXCJbXCIuY29uY2F0KG5hbWUuZGVzY3JpcHRpb24sIFwiXVwiKSA6IFwiXCI7XHJcbiAgICByZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnR5KGYsIFwibmFtZVwiLCB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSwgdmFsdWU6IHByZWZpeCA/IFwiXCIuY29uY2F0KHByZWZpeCwgXCIgXCIsIG5hbWUpIDogbmFtZSB9KTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX21ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKSB7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QubWV0YWRhdGEgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIFJlZmxlY3QubWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdGVyKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XHJcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cclxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZ2VuZXJhdG9yKHRoaXNBcmcsIGJvZHkpIHtcclxuICAgIHZhciBfID0geyBsYWJlbDogMCwgc2VudDogZnVuY3Rpb24oKSB7IGlmICh0WzBdICYgMSkgdGhyb3cgdFsxXTsgcmV0dXJuIHRbMV07IH0sIHRyeXM6IFtdLCBvcHM6IFtdIH0sIGYsIHksIHQsIGcgPSBPYmplY3QuY3JlYXRlKCh0eXBlb2YgSXRlcmF0b3IgPT09IFwiZnVuY3Rpb25cIiA/IEl0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpO1xyXG4gICAgcmV0dXJuIGcubmV4dCA9IHZlcmIoMCksIGdbXCJ0aHJvd1wiXSA9IHZlcmIoMSksIGdbXCJyZXR1cm5cIl0gPSB2ZXJiKDIpLCB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgKGdbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSksIGc7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgcmV0dXJuIGZ1bmN0aW9uICh2KSB7IHJldHVybiBzdGVwKFtuLCB2XSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHN0ZXAob3ApIHtcclxuICAgICAgICBpZiAoZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7XHJcbiAgICAgICAgd2hpbGUgKGcgJiYgKGcgPSAwLCBvcFswXSAmJiAoXyA9IDApKSwgXykgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKGYgPSAxLCB5ICYmICh0ID0gb3BbMF0gJiAyID8geVtcInJldHVyblwiXSA6IG9wWzBdID8geVtcInRocm93XCJdIHx8ICgodCA9IHlbXCJyZXR1cm5cIl0pICYmIHQuY2FsbCh5KSwgMCkgOiB5Lm5leHQpICYmICEodCA9IHQuY2FsbCh5LCBvcFsxXSkpLmRvbmUpIHJldHVybiB0O1xyXG4gICAgICAgICAgICBpZiAoeSA9IDAsIHQpIG9wID0gW29wWzBdICYgMiwgdC52YWx1ZV07XHJcbiAgICAgICAgICAgIHN3aXRjaCAob3BbMF0pIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgMDogY2FzZSAxOiB0ID0gb3A7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA0OiBfLmxhYmVsKys7IHJldHVybiB7IHZhbHVlOiBvcFsxXSwgZG9uZTogZmFsc2UgfTtcclxuICAgICAgICAgICAgICAgIGNhc2UgNTogXy5sYWJlbCsrOyB5ID0gb3BbMV07IG9wID0gWzBdOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGNhc2UgNzogb3AgPSBfLm9wcy5wb3AoKTsgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEodCA9IF8udHJ5cywgdCA9IHQubGVuZ3RoID4gMCAmJiB0W3QubGVuZ3RoIC0gMV0pICYmIChvcFswXSA9PT0gNiB8fCBvcFswXSA9PT0gMikpIHsgXyA9IDA7IGNvbnRpbnVlOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSAzICYmICghdCB8fCAob3BbMV0gPiB0WzBdICYmIG9wWzFdIDwgdFszXSkpKSB7IF8ubGFiZWwgPSBvcFsxXTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDYgJiYgXy5sYWJlbCA8IHRbMV0pIHsgXy5sYWJlbCA9IHRbMV07IHQgPSBvcDsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodCAmJiBfLmxhYmVsIDwgdFsyXSkgeyBfLmxhYmVsID0gdFsyXTsgXy5vcHMucHVzaChvcCk7IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRbMl0pIF8ub3BzLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIF8udHJ5cy5wb3AoKTsgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgb3AgPSBib2R5LmNhbGwodGhpc0FyZywgXyk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkgeyBvcCA9IFs2LCBlXTsgeSA9IDA7IH0gZmluYWxseSB7IGYgPSB0ID0gMDsgfVxyXG4gICAgICAgIGlmIChvcFswXSAmIDUpIHRocm93IG9wWzFdOyByZXR1cm4geyB2YWx1ZTogb3BbMF0gPyBvcFsxXSA6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fY3JlYXRlQmluZGluZyA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobSwgayk7XHJcbiAgICBpZiAoIWRlc2MgfHwgKFwiZ2V0XCIgaW4gZGVzYyA/ICFtLl9fZXNNb2R1bGUgOiBkZXNjLndyaXRhYmxlIHx8IGRlc2MuY29uZmlndXJhYmxlKSkge1xyXG4gICAgICAgIGRlc2MgPSB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH07XHJcbiAgICB9XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIGRlc2MpO1xyXG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIG9bazJdID0gbVtrXTtcclxufSk7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHBvcnRTdGFyKG0sIG8pIHtcclxuICAgIGZvciAodmFyIHAgaW4gbSkgaWYgKHAgIT09IFwiZGVmYXVsdFwiICYmICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobywgcCkpIF9fY3JlYXRlQmluZGluZyhvLCBtLCBwKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fdmFsdWVzKG8pIHtcclxuICAgIHZhciBzID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIFN5bWJvbC5pdGVyYXRvciwgbSA9IHMgJiYgb1tzXSwgaSA9IDA7XHJcbiAgICBpZiAobSkgcmV0dXJuIG0uY2FsbChvKTtcclxuICAgIGlmIChvICYmIHR5cGVvZiBvLmxlbmd0aCA9PT0gXCJudW1iZXJcIikgcmV0dXJuIHtcclxuICAgICAgICBuZXh0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmIChvICYmIGkgPj0gby5sZW5ndGgpIG8gPSB2b2lkIDA7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiBvICYmIG9baSsrXSwgZG9uZTogIW8gfTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihzID8gXCJPYmplY3QgaXMgbm90IGl0ZXJhYmxlLlwiIDogXCJTeW1ib2wuaXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZWFkKG8sIG4pIHtcclxuICAgIHZhciBtID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9bU3ltYm9sLml0ZXJhdG9yXTtcclxuICAgIGlmICghbSkgcmV0dXJuIG87XHJcbiAgICB2YXIgaSA9IG0uY2FsbChvKSwgciwgYXIgPSBbXSwgZTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgd2hpbGUgKChuID09PSB2b2lkIDAgfHwgbi0tID4gMCkgJiYgIShyID0gaS5uZXh0KCkpLmRvbmUpIGFyLnB1c2goci52YWx1ZSk7XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZXJyb3IpIHsgZSA9IHsgZXJyb3I6IGVycm9yIH07IH1cclxuICAgIGZpbmFsbHkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChyICYmICFyLmRvbmUgJiYgKG0gPSBpW1wicmV0dXJuXCJdKSkgbS5jYWxsKGkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmaW5hbGx5IHsgaWYgKGUpIHRocm93IGUuZXJyb3I7IH1cclxuICAgIH1cclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuLyoqIEBkZXByZWNhdGVkICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZCgpIHtcclxuICAgIGZvciAodmFyIGFyID0gW10sIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgIGFyID0gYXIuY29uY2F0KF9fcmVhZChhcmd1bWVudHNbaV0pKTtcclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuLyoqIEBkZXByZWNhdGVkICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZEFycmF5cygpIHtcclxuICAgIGZvciAodmFyIHMgPSAwLCBpID0gMCwgaWwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgaWw7IGkrKykgcyArPSBhcmd1bWVudHNbaV0ubGVuZ3RoO1xyXG4gICAgZm9yICh2YXIgciA9IEFycmF5KHMpLCBrID0gMCwgaSA9IDA7IGkgPCBpbDsgaSsrKVxyXG4gICAgICAgIGZvciAodmFyIGEgPSBhcmd1bWVudHNbaV0sIGogPSAwLCBqbCA9IGEubGVuZ3RoOyBqIDwgamw7IGorKywgaysrKVxyXG4gICAgICAgICAgICByW2tdID0gYVtqXTtcclxuICAgIHJldHVybiByO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheSh0bywgZnJvbSwgcGFjaykge1xyXG4gICAgaWYgKHBhY2sgfHwgYXJndW1lbnRzLmxlbmd0aCA9PT0gMikgZm9yICh2YXIgaSA9IDAsIGwgPSBmcm9tLmxlbmd0aCwgYXI7IGkgPCBsOyBpKyspIHtcclxuICAgICAgICBpZiAoYXIgfHwgIShpIGluIGZyb20pKSB7XHJcbiAgICAgICAgICAgIGlmICghYXIpIGFyID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZnJvbSwgMCwgaSk7XHJcbiAgICAgICAgICAgIGFyW2ldID0gZnJvbVtpXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdG8uY29uY2F0KGFyIHx8IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZyb20pKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXQodikge1xyXG4gICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfX2F3YWl0ID8gKHRoaXMudiA9IHYsIHRoaXMpIDogbmV3IF9fYXdhaXQodik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jR2VuZXJhdG9yKHRoaXNBcmcsIF9hcmd1bWVudHMsIGdlbmVyYXRvcikge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBnID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pLCBpLCBxID0gW107XHJcbiAgICByZXR1cm4gaSA9IE9iamVjdC5jcmVhdGUoKHR5cGVvZiBBc3luY0l0ZXJhdG9yID09PSBcImZ1bmN0aW9uXCIgPyBBc3luY0l0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpLCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIsIGF3YWl0UmV0dXJuKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gYXdhaXRSZXR1cm4oZikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh2KS50aGVuKGYsIHJlamVjdCk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpZiAoZ1tuXSkgeyBpW25dID0gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChhLCBiKSB7IHEucHVzaChbbiwgdiwgYSwgYl0pID4gMSB8fCByZXN1bWUobiwgdik7IH0pOyB9OyBpZiAoZikgaVtuXSA9IGYoaVtuXSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gcmVzdW1lKG4sIHYpIHsgdHJ5IHsgc3RlcChnW25dKHYpKTsgfSBjYXRjaCAoZSkgeyBzZXR0bGUocVswXVszXSwgZSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gc3RlcChyKSB7IHIudmFsdWUgaW5zdGFuY2VvZiBfX2F3YWl0ID8gUHJvbWlzZS5yZXNvbHZlKHIudmFsdWUudikudGhlbihmdWxmaWxsLCByZWplY3QpIDogc2V0dGxlKHFbMF1bMl0sIHIpOyB9XHJcbiAgICBmdW5jdGlvbiBmdWxmaWxsKHZhbHVlKSB7IHJlc3VtZShcIm5leHRcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiByZWplY3QodmFsdWUpIHsgcmVzdW1lKFwidGhyb3dcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUoZiwgdikgeyBpZiAoZih2KSwgcS5zaGlmdCgpLCBxLmxlbmd0aCkgcmVzdW1lKHFbMF1bMF0sIHFbMF1bMV0pOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jRGVsZWdhdG9yKG8pIHtcclxuICAgIHZhciBpLCBwO1xyXG4gICAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiLCBmdW5jdGlvbiAoZSkgeyB0aHJvdyBlOyB9KSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpW25dID0gb1tuXSA/IGZ1bmN0aW9uICh2KSB7IHJldHVybiAocCA9ICFwKSA/IHsgdmFsdWU6IF9fYXdhaXQob1tuXSh2KSksIGRvbmU6IGZhbHNlIH0gOiBmID8gZih2KSA6IHY7IH0gOiBmOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jVmFsdWVzKG8pIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xyXG4gICAgcmV0dXJuIG0gPyBtLmNhbGwobykgOiAobyA9IHR5cGVvZiBfX3ZhbHVlcyA9PT0gXCJmdW5jdGlvblwiID8gX192YWx1ZXMobykgOiBvW1N5bWJvbC5pdGVyYXRvcl0oKSwgaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGkpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IGlbbl0gPSBvW25dICYmIGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IHYgPSBvW25dKHYpLCBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCB2LmRvbmUsIHYudmFsdWUpOyB9KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tYWtlVGVtcGxhdGVPYmplY3QoY29va2VkLCByYXcpIHtcclxuICAgIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvb2tlZCwgXCJyYXdcIiwgeyB2YWx1ZTogcmF3IH0pOyB9IGVsc2UgeyBjb29rZWQucmF3ID0gcmF3OyB9XHJcbiAgICByZXR1cm4gY29va2VkO1xyXG59O1xyXG5cclxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xyXG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcclxufTtcclxuXHJcbnZhciBvd25LZXlzID0gZnVuY3Rpb24obykge1xyXG4gICAgb3duS2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzIHx8IGZ1bmN0aW9uIChvKSB7XHJcbiAgICAgICAgdmFyIGFyID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgayBpbiBvKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIGspKSBhclthci5sZW5ndGhdID0gaztcclxuICAgICAgICByZXR1cm4gYXI7XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIG93bktleXMobyk7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19pbXBvcnRTdGFyKG1vZCkge1xyXG4gICAgaWYgKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgcmV0dXJuIG1vZDtcclxuICAgIHZhciByZXN1bHQgPSB7fTtcclxuICAgIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayA9IG93bktleXMobW9kKSwgaSA9IDA7IGkgPCBrLmxlbmd0aDsgaSsrKSBpZiAoa1tpXSAhPT0gXCJkZWZhdWx0XCIpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwga1tpXSk7XHJcbiAgICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9faW1wb3J0RGVmYXVsdChtb2QpIHtcclxuICAgIHJldHVybiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSA/IG1vZCA6IHsgZGVmYXVsdDogbW9kIH07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkR2V0KHJlY2VpdmVyLCBzdGF0ZSwga2luZCwgZikge1xyXG4gICAgaWYgKGtpbmQgPT09IFwiYVwiICYmICFmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBhY2Nlc3NvciB3YXMgZGVmaW5lZCB3aXRob3V0IGEgZ2V0dGVyXCIpO1xyXG4gICAgaWYgKHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgIT09IHN0YXRlIHx8ICFmIDogIXN0YXRlLmhhcyhyZWNlaXZlcikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgcmVhZCBwcml2YXRlIG1lbWJlciBmcm9tIGFuIG9iamVjdCB3aG9zZSBjbGFzcyBkaWQgbm90IGRlY2xhcmUgaXRcIik7XHJcbiAgICByZXR1cm4ga2luZCA9PT0gXCJtXCIgPyBmIDoga2luZCA9PT0gXCJhXCIgPyBmLmNhbGwocmVjZWl2ZXIpIDogZiA/IGYudmFsdWUgOiBzdGF0ZS5nZXQocmVjZWl2ZXIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZFNldChyZWNlaXZlciwgc3RhdGUsIHZhbHVlLCBraW5kLCBmKSB7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJtXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIG1ldGhvZCBpcyBub3Qgd3JpdGFibGVcIik7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJhXCIgJiYgIWYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIGFjY2Vzc29yIHdhcyBkZWZpbmVkIHdpdGhvdXQgYSBzZXR0ZXJcIik7XHJcbiAgICBpZiAodHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciAhPT0gc3RhdGUgfHwgIWYgOiAhc3RhdGUuaGFzKHJlY2VpdmVyKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCB3cml0ZSBwcml2YXRlIG1lbWJlciB0byBhbiBvYmplY3Qgd2hvc2UgY2xhc3MgZGlkIG5vdCBkZWNsYXJlIGl0XCIpO1xyXG4gICAgcmV0dXJuIChraW5kID09PSBcImFcIiA/IGYuY2FsbChyZWNlaXZlciwgdmFsdWUpIDogZiA/IGYudmFsdWUgPSB2YWx1ZSA6IHN0YXRlLnNldChyZWNlaXZlciwgdmFsdWUpKSwgdmFsdWU7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkSW4oc3RhdGUsIHJlY2VpdmVyKSB7XHJcbiAgICBpZiAocmVjZWl2ZXIgPT09IG51bGwgfHwgKHR5cGVvZiByZWNlaXZlciAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgcmVjZWl2ZXIgIT09IFwiZnVuY3Rpb25cIikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgdXNlICdpbicgb3BlcmF0b3Igb24gbm9uLW9iamVjdFwiKTtcclxuICAgIHJldHVybiB0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyID09PSBzdGF0ZSA6IHN0YXRlLmhhcyhyZWNlaXZlcik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZShlbnYsIHZhbHVlLCBhc3luYykge1xyXG4gICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB2b2lkIDApIHtcclxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiB2YWx1ZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IGV4cGVjdGVkLlwiKTtcclxuICAgICAgICB2YXIgZGlzcG9zZSwgaW5uZXI7XHJcbiAgICAgICAgaWYgKGFzeW5jKSB7XHJcbiAgICAgICAgICAgIGlmICghU3ltYm9sLmFzeW5jRGlzcG9zZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0Rpc3Bvc2UgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgICAgICAgICBkaXNwb3NlID0gdmFsdWVbU3ltYm9sLmFzeW5jRGlzcG9zZV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChkaXNwb3NlID09PSB2b2lkIDApIHtcclxuICAgICAgICAgICAgaWYgKCFTeW1ib2wuZGlzcG9zZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5kaXNwb3NlIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgICAgICAgICAgZGlzcG9zZSA9IHZhbHVlW1N5bWJvbC5kaXNwb3NlXTtcclxuICAgICAgICAgICAgaWYgKGFzeW5jKSBpbm5lciA9IGRpc3Bvc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0eXBlb2YgZGlzcG9zZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IG5vdCBkaXNwb3NhYmxlLlwiKTtcclxuICAgICAgICBpZiAoaW5uZXIpIGRpc3Bvc2UgPSBmdW5jdGlvbigpIHsgdHJ5IHsgaW5uZXIuY2FsbCh0aGlzKTsgfSBjYXRjaCAoZSkgeyByZXR1cm4gUHJvbWlzZS5yZWplY3QoZSk7IH0gfTtcclxuICAgICAgICBlbnYuc3RhY2sucHVzaCh7IHZhbHVlOiB2YWx1ZSwgZGlzcG9zZTogZGlzcG9zZSwgYXN5bmM6IGFzeW5jIH0pO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoYXN5bmMpIHtcclxuICAgICAgICBlbnYuc3RhY2sucHVzaCh7IGFzeW5jOiB0cnVlIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG5cclxufVxyXG5cclxudmFyIF9TdXBwcmVzc2VkRXJyb3IgPSB0eXBlb2YgU3VwcHJlc3NlZEVycm9yID09PSBcImZ1bmN0aW9uXCIgPyBTdXBwcmVzc2VkRXJyb3IgOiBmdW5jdGlvbiAoZXJyb3IsIHN1cHByZXNzZWQsIG1lc3NhZ2UpIHtcclxuICAgIHZhciBlID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xyXG4gICAgcmV0dXJuIGUubmFtZSA9IFwiU3VwcHJlc3NlZEVycm9yXCIsIGUuZXJyb3IgPSBlcnJvciwgZS5zdXBwcmVzc2VkID0gc3VwcHJlc3NlZCwgZTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2Rpc3Bvc2VSZXNvdXJjZXMoZW52KSB7XHJcbiAgICBmdW5jdGlvbiBmYWlsKGUpIHtcclxuICAgICAgICBlbnYuZXJyb3IgPSBlbnYuaGFzRXJyb3IgPyBuZXcgX1N1cHByZXNzZWRFcnJvcihlLCBlbnYuZXJyb3IsIFwiQW4gZXJyb3Igd2FzIHN1cHByZXNzZWQgZHVyaW5nIGRpc3Bvc2FsLlwiKSA6IGU7XHJcbiAgICAgICAgZW52Lmhhc0Vycm9yID0gdHJ1ZTtcclxuICAgIH1cclxuICAgIHZhciByLCBzID0gMDtcclxuICAgIGZ1bmN0aW9uIG5leHQoKSB7XHJcbiAgICAgICAgd2hpbGUgKHIgPSBlbnYuc3RhY2sucG9wKCkpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGlmICghci5hc3luYyAmJiBzID09PSAxKSByZXR1cm4gcyA9IDAsIGVudi5zdGFjay5wdXNoKHIpLCBQcm9taXNlLnJlc29sdmUoKS50aGVuKG5leHQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHIuZGlzcG9zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSByLmRpc3Bvc2UuY2FsbChyLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoci5hc3luYykgcmV0dXJuIHMgfD0gMiwgUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCkudGhlbihuZXh0LCBmdW5jdGlvbihlKSB7IGZhaWwoZSk7IHJldHVybiBuZXh0KCk7IH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBzIHw9IDE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIGZhaWwoZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHMgPT09IDEpIHJldHVybiBlbnYuaGFzRXJyb3IgPyBQcm9taXNlLnJlamVjdChlbnYuZXJyb3IpIDogUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgaWYgKGVudi5oYXNFcnJvcikgdGhyb3cgZW52LmVycm9yO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5leHQoKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmV3cml0ZVJlbGF0aXZlSW1wb3J0RXh0ZW5zaW9uKHBhdGgsIHByZXNlcnZlSnN4KSB7XHJcbiAgICBpZiAodHlwZW9mIHBhdGggPT09IFwic3RyaW5nXCIgJiYgL15cXC5cXC4/XFwvLy50ZXN0KHBhdGgpKSB7XHJcbiAgICAgICAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFwuKHRzeCkkfCgoPzpcXC5kKT8pKCg/OlxcLlteLi9dKz8pPylcXC4oW2NtXT8pdHMkL2ksIGZ1bmN0aW9uIChtLCB0c3gsIGQsIGV4dCwgY20pIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRzeCA/IHByZXNlcnZlSnN4ID8gXCIuanN4XCIgOiBcIi5qc1wiIDogZCAmJiAoIWV4dCB8fCAhY20pID8gbSA6IChkICsgZXh0ICsgXCIuXCIgKyBjbS50b0xvd2VyQ2FzZSgpICsgXCJqc1wiKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiBwYXRoO1xyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCB7XHJcbiAgICBfX2V4dGVuZHM6IF9fZXh0ZW5kcyxcclxuICAgIF9fYXNzaWduOiBfX2Fzc2lnbixcclxuICAgIF9fcmVzdDogX19yZXN0LFxyXG4gICAgX19kZWNvcmF0ZTogX19kZWNvcmF0ZSxcclxuICAgIF9fcGFyYW06IF9fcGFyYW0sXHJcbiAgICBfX2VzRGVjb3JhdGU6IF9fZXNEZWNvcmF0ZSxcclxuICAgIF9fcnVuSW5pdGlhbGl6ZXJzOiBfX3J1bkluaXRpYWxpemVycyxcclxuICAgIF9fcHJvcEtleTogX19wcm9wS2V5LFxyXG4gICAgX19zZXRGdW5jdGlvbk5hbWU6IF9fc2V0RnVuY3Rpb25OYW1lLFxyXG4gICAgX19tZXRhZGF0YTogX19tZXRhZGF0YSxcclxuICAgIF9fYXdhaXRlcjogX19hd2FpdGVyLFxyXG4gICAgX19nZW5lcmF0b3I6IF9fZ2VuZXJhdG9yLFxyXG4gICAgX19jcmVhdGVCaW5kaW5nOiBfX2NyZWF0ZUJpbmRpbmcsXHJcbiAgICBfX2V4cG9ydFN0YXI6IF9fZXhwb3J0U3RhcixcclxuICAgIF9fdmFsdWVzOiBfX3ZhbHVlcyxcclxuICAgIF9fcmVhZDogX19yZWFkLFxyXG4gICAgX19zcHJlYWQ6IF9fc3ByZWFkLFxyXG4gICAgX19zcHJlYWRBcnJheXM6IF9fc3ByZWFkQXJyYXlzLFxyXG4gICAgX19zcHJlYWRBcnJheTogX19zcHJlYWRBcnJheSxcclxuICAgIF9fYXdhaXQ6IF9fYXdhaXQsXHJcbiAgICBfX2FzeW5jR2VuZXJhdG9yOiBfX2FzeW5jR2VuZXJhdG9yLFxyXG4gICAgX19hc3luY0RlbGVnYXRvcjogX19hc3luY0RlbGVnYXRvcixcclxuICAgIF9fYXN5bmNWYWx1ZXM6IF9fYXN5bmNWYWx1ZXMsXHJcbiAgICBfX21ha2VUZW1wbGF0ZU9iamVjdDogX19tYWtlVGVtcGxhdGVPYmplY3QsXHJcbiAgICBfX2ltcG9ydFN0YXI6IF9faW1wb3J0U3RhcixcclxuICAgIF9faW1wb3J0RGVmYXVsdDogX19pbXBvcnREZWZhdWx0LFxyXG4gICAgX19jbGFzc1ByaXZhdGVGaWVsZEdldDogX19jbGFzc1ByaXZhdGVGaWVsZEdldCxcclxuICAgIF9fY2xhc3NQcml2YXRlRmllbGRTZXQ6IF9fY2xhc3NQcml2YXRlRmllbGRTZXQsXHJcbiAgICBfX2NsYXNzUHJpdmF0ZUZpZWxkSW46IF9fY2xhc3NQcml2YXRlRmllbGRJbixcclxuICAgIF9fYWRkRGlzcG9zYWJsZVJlc291cmNlOiBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZSxcclxuICAgIF9fZGlzcG9zZVJlc291cmNlczogX19kaXNwb3NlUmVzb3VyY2VzLFxyXG4gICAgX19yZXdyaXRlUmVsYXRpdmVJbXBvcnRFeHRlbnNpb246IF9fcmV3cml0ZVJlbGF0aXZlSW1wb3J0RXh0ZW5zaW9uLFxyXG59O1xyXG4iLCJpbXBvcnQgeyBOb3RpY2UgfSBmcm9tICdvYnNpZGlhbic7XG5cbi8vIEVWRU5UIEJVUyBTWVNURU1cbmV4cG9ydCBjbGFzcyBUaW55RW1pdHRlciB7XG4gICAgcHJpdmF0ZSBsaXN0ZW5lcnM6IHsgW2tleTogc3RyaW5nXTogRnVuY3Rpb25bXSB9ID0ge307XG5cbiAgICBvbihldmVudDogc3RyaW5nLCBmbjogRnVuY3Rpb24pIHtcbiAgICAgICAgKHRoaXMubGlzdGVuZXJzW2V2ZW50XSA9IHRoaXMubGlzdGVuZXJzW2V2ZW50XSB8fCBbXSkucHVzaChmbik7XG4gICAgfVxuXG4gICAgb2ZmKGV2ZW50OiBzdHJpbmcsIGZuOiBGdW5jdGlvbikge1xuICAgICAgICBpZiAoIXRoaXMubGlzdGVuZXJzW2V2ZW50XSkgcmV0dXJuO1xuICAgICAgICB0aGlzLmxpc3RlbmVyc1tldmVudF0gPSB0aGlzLmxpc3RlbmVyc1tldmVudF0uZmlsdGVyKGYgPT4gZiAhPT0gZm4pO1xuICAgIH1cblxuICAgIHRyaWdnZXIoZXZlbnQ6IHN0cmluZywgZGF0YT86IGFueSkge1xuICAgICAgICAodGhpcy5saXN0ZW5lcnNbZXZlbnRdIHx8IFtdKS5mb3JFYWNoKGZuID0+IGZuKGRhdGEpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBBdWRpb0NvbnRyb2xsZXIge1xuICAgIGF1ZGlvQ3R4OiBBdWRpb0NvbnRleHQgfCBudWxsID0gbnVsbDtcbiAgICBicm93bk5vaXNlTm9kZTogU2NyaXB0UHJvY2Vzc29yTm9kZSB8IG51bGwgPSBudWxsO1xuICAgIG11dGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgICBjb25zdHJ1Y3RvcihtdXRlZDogYm9vbGVhbikgeyB0aGlzLm11dGVkID0gbXV0ZWQ7IH1cblxuICAgIHNldE11dGVkKG11dGVkOiBib29sZWFuKSB7IHRoaXMubXV0ZWQgPSBtdXRlZDsgfVxuXG4gICAgaW5pdEF1ZGlvKCkgeyBpZiAoIXRoaXMuYXVkaW9DdHgpIHRoaXMuYXVkaW9DdHggPSBuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgKHdpbmRvdyBhcyBhbnkpLndlYmtpdEF1ZGlvQ29udGV4dCkoKTsgfVxuXG4gICAgcGxheVRvbmUoZnJlcTogbnVtYmVyLCB0eXBlOiBPc2NpbGxhdG9yVHlwZSwgZHVyYXRpb246IG51bWJlciwgdm9sOiBudW1iZXIgPSAwLjEpIHtcbiAgICAgICAgaWYgKHRoaXMubXV0ZWQpIHJldHVybjtcbiAgICAgICAgdGhpcy5pbml0QXVkaW8oKTtcbiAgICAgICAgY29uc3Qgb3NjID0gdGhpcy5hdWRpb0N0eCEuY3JlYXRlT3NjaWxsYXRvcigpO1xuICAgICAgICBjb25zdCBnYWluID0gdGhpcy5hdWRpb0N0eCEuY3JlYXRlR2FpbigpO1xuICAgICAgICBvc2MudHlwZSA9IHR5cGU7XG4gICAgICAgIG9zYy5mcmVxdWVuY3kudmFsdWUgPSBmcmVxO1xuICAgICAgICBvc2MuY29ubmVjdChnYWluKTtcbiAgICAgICAgZ2Fpbi5jb25uZWN0KHRoaXMuYXVkaW9DdHghLmRlc3RpbmF0aW9uKTtcbiAgICAgICAgb3NjLnN0YXJ0KCk7XG4gICAgICAgIGdhaW4uZ2Fpbi5zZXRWYWx1ZUF0VGltZSh2b2wsIHRoaXMuYXVkaW9DdHghLmN1cnJlbnRUaW1lKTtcbiAgICAgICAgZ2Fpbi5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoMC4wMDAwMSwgdGhpcy5hdWRpb0N0eCEuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG4gICAgICAgIG9zYy5zdG9wKHRoaXMuYXVkaW9DdHghLmN1cnJlbnRUaW1lICsgZHVyYXRpb24pO1xuICAgIH1cblxuICAgIHBsYXlTb3VuZCh0eXBlOiBcInN1Y2Nlc3NcInxcImZhaWxcInxcImRlYXRoXCJ8XCJjbGlja1wifFwiaGVhcnRiZWF0XCJ8XCJtZWRpdGF0ZVwiKSB7XG4gICAgICAgIGlmICh0eXBlID09PSBcInN1Y2Nlc3NcIikgeyB0aGlzLnBsYXlUb25lKDYwMCwgXCJzaW5lXCIsIDAuMSk7IHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wbGF5VG9uZSg4MDAsIFwic2luZVwiLCAwLjIpLCAxMDApOyB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFwiZmFpbFwiKSB7IHRoaXMucGxheVRvbmUoMTUwLCBcInNhd3Rvb3RoXCIsIDAuNCk7IHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wbGF5VG9uZSgxMDAsIFwic2F3dG9vdGhcIiwgMC40KSwgMTUwKTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcImRlYXRoXCIpIHsgdGhpcy5wbGF5VG9uZSg1MCwgXCJzcXVhcmVcIiwgMS4wKTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcImNsaWNrXCIpIHsgdGhpcy5wbGF5VG9uZSg4MDAsIFwic2luZVwiLCAwLjA1KTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcImhlYXJ0YmVhdFwiKSB7IHRoaXMucGxheVRvbmUoNjAsIFwic2luZVwiLCAwLjEsIDAuNSk7IHNldFRpbWVvdXQoKCk9PnRoaXMucGxheVRvbmUoNTAsIFwic2luZVwiLCAwLjEsIDAuNCksIDE1MCk7IH1cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gXCJtZWRpdGF0ZVwiKSB7IHRoaXMucGxheVRvbmUoNDMyLCBcInNpbmVcIiwgMi4wLCAwLjA1KTsgfVxuICAgIH1cblxuICAgIHRvZ2dsZUJyb3duTm9pc2UoKSB7XG4gICAgICAgIHRoaXMuaW5pdEF1ZGlvKCk7XG4gICAgICAgIGlmICh0aGlzLmJyb3duTm9pc2VOb2RlKSB7IFxuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZS5kaXNjb25uZWN0KCk7IFxuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZSA9IG51bGw7IFxuICAgICAgICAgICAgbmV3IE5vdGljZShcIkZvY3VzIEF1ZGlvOiBPRkZcIik7IFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgYnVmZmVyU2l6ZSA9IDQwOTY7IFxuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZSA9IHRoaXMuYXVkaW9DdHghLmNyZWF0ZVNjcmlwdFByb2Nlc3NvcihidWZmZXJTaXplLCAxLCAxKTtcbiAgICAgICAgICAgIGxldCBsYXN0T3V0ID0gMDtcbiAgICAgICAgICAgIHRoaXMuYnJvd25Ob2lzZU5vZGUub25hdWRpb3Byb2Nlc3MgPSAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG91dHB1dCA9IGUub3V0cHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnVmZmVyU2l6ZTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdoaXRlID0gTWF0aC5yYW5kb20oKSAqIDIgLSAxOyBcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0W2ldID0gKGxhc3RPdXQgKyAoMC4wMiAqIHdoaXRlKSkgLyAxLjAyOyBcbiAgICAgICAgICAgICAgICAgICAgbGFzdE91dCA9IG91dHB1dFtpXTsgXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dFtpXSAqPSAwLjE7IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLmJyb3duTm9pc2VOb2RlLmNvbm5lY3QodGhpcy5hdWRpb0N0eCEuZGVzdGluYXRpb24pO1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIkZvY3VzIEF1ZGlvOiBPTiAoQnJvd24gTm9pc2UpXCIpO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgQXBwLCBNb2RhbCwgU2V0dGluZywgTm90aWNlLCBtb21lbnQsIFRGaWxlLCBURm9sZGVyIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IFNpc3lwaHVzUGx1Z2luIGZyb20gJy4uL21haW4nOyAvLyBGaXg6IERlZmF1bHQgSW1wb3J0XG5pbXBvcnQgeyBNb2RpZmllciB9IGZyb20gJy4uL3R5cGVzJztcblxuZXhwb3J0IGNsYXNzIENoYW9zTW9kYWwgZXh0ZW5kcyBNb2RhbCB7IFxuICAgIG1vZGlmaWVyOiBNb2RpZmllcjsgXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIG06IE1vZGlmaWVyKSB7IHN1cGVyKGFwcCk7IHRoaXMubW9kaWZpZXI9bTsgfSBcbiAgICBvbk9wZW4oKSB7IFxuICAgICAgICBjb25zdCBjID0gdGhpcy5jb250ZW50RWw7IFxuICAgICAgICBjb25zdCBoMSA9IGMuY3JlYXRlRWwoXCJoMVwiLCB7IHRleHQ6IFwiVEhFIE9NRU5cIiB9KTsgXG4gICAgICAgIGgxLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJ0ZXh0LWFsaWduOmNlbnRlcjsgY29sb3I6I2Y1NTtcIik7IFxuICAgICAgICBjb25zdCBpYyA9IGMuY3JlYXRlRWwoXCJkaXZcIiwgeyB0ZXh0OiB0aGlzLm1vZGlmaWVyLmljb24gfSk7IFxuICAgICAgICBpYy5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwiZm9udC1zaXplOjgwcHg7IHRleHQtYWxpZ246Y2VudGVyO1wiKTsgXG4gICAgICAgIGNvbnN0IGgyID0gYy5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogdGhpcy5tb2RpZmllci5uYW1lIH0pOyBcbiAgICAgICAgaDIuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcInRleHQtYWxpZ246Y2VudGVyO1wiKTsgXG4gICAgICAgIGNvbnN0IHAgPSBjLmNyZWF0ZUVsKFwicFwiLCB7dGV4dDogdGhpcy5tb2RpZmllci5kZXNjfSk7IFxuICAgICAgICBwLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJ0ZXh0LWFsaWduOmNlbnRlclwiKTsgXG4gICAgICAgIGNvbnN0IGIgPSBjLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHt0ZXh0OlwiQWNrbm93bGVkZ2VcIn0pOyBcbiAgICAgICAgYi5hZGRDbGFzcyhcIm1vZC1jdGFcIik7IFxuICAgICAgICBiLnN0eWxlLmRpc3BsYXk9XCJibG9ja1wiOyBcbiAgICAgICAgYi5zdHlsZS5tYXJnaW49XCIyMHB4IGF1dG9cIjsgXG4gICAgICAgIGIub25jbGljaz0oKT0+dGhpcy5jbG9zZSgpOyBcbiAgICB9IFxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH0gXG59XG5cbmV4cG9ydCBjbGFzcyBTaG9wTW9kYWwgZXh0ZW5kcyBNb2RhbCB7IFxuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47IFxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9IFxuICAgIG9uT3BlbigpIHsgXG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzOyBcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIvCfm5IgQkxBQ0sgTUFSS0VUXCIgfSk7IFxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFB1cnNlOiDwn6qZICR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZH1gIH0pOyBcbiAgICAgICAgXG4gICAgICAgIHRoaXMuaXRlbShjb250ZW50RWwsIFwi8J+SiSBTdGltcGFja1wiLCBcIkhlYWwgMjAgSFBcIiwgNTAsIGFzeW5jICgpID0+IHsgXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ocCA9IE1hdGgubWluKHRoaXMucGx1Z2luLnNldHRpbmdzLm1heEhwLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ocCArIDIwKTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgdGhpcy5pdGVtKGNvbnRlbnRFbCwgXCLwn5KjIFNhYm90YWdlXCIsIFwiLTUgUml2YWwgRG1nXCIsIDIwMCwgYXN5bmMgKCkgPT4geyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnJpdmFsRG1nID0gTWF0aC5tYXgoNSwgdGhpcy5wbHVnaW4uc2V0dGluZ3Mucml2YWxEbWcgLSA1KTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgdGhpcy5pdGVtKGNvbnRlbnRFbCwgXCLwn5uh77iPIFNoaWVsZFwiLCBcIjI0aCBQcm90ZWN0aW9uXCIsIDE1MCwgYXN5bmMgKCkgPT4geyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNoaWVsZGVkVW50aWwgPSBtb21lbnQoKS5hZGQoMjQsICdob3VycycpLnRvSVNPU3RyaW5nKCk7IFxuICAgICAgICB9KTsgXG4gICAgICAgIHRoaXMuaXRlbShjb250ZW50RWwsIFwi8J+YtCBSZXN0IERheVwiLCBcIlNhZmUgZm9yIDI0aFwiLCAxMDAsIGFzeW5jICgpID0+IHsgXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXN0RGF5VW50aWwgPSBtb21lbnQoKS5hZGQoMjQsICdob3VycycpLnRvSVNPU3RyaW5nKCk7IFxuICAgICAgICB9KTsgXG4gICAgfSBcbiAgICBpdGVtKGVsOiBIVE1MRWxlbWVudCwgbmFtZTogc3RyaW5nLCBkZXNjOiBzdHJpbmcsIGNvc3Q6IG51bWJlciwgZWZmZWN0OiAoKSA9PiBQcm9taXNlPHZvaWQ+KSB7IFxuICAgICAgICBjb25zdCBjID0gZWwuY3JlYXRlRGl2KCk7IFxuICAgICAgICBjLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTpmbGV4OyBqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjsgcGFkZGluZzoxMHB4IDA7IGJvcmRlci1ib3R0b206MXB4IHNvbGlkICMzMzM7XCIpOyBcbiAgICAgICAgY29uc3QgaSA9IGMuY3JlYXRlRGl2KCk7IFxuICAgICAgICBpLmNyZWF0ZUVsKFwiYlwiLCB7IHRleHQ6IG5hbWUgfSk7IFxuICAgICAgICBpLmNyZWF0ZUVsKFwiZGl2XCIsIHsgdGV4dDogZGVzYyB9KTsgXG4gICAgICAgIGNvbnN0IGIgPSBjLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogYCR7Y29zdH0gR2AgfSk7IFxuICAgICAgICBpZih0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIDwgY29zdCkgeyBcbiAgICAgICAgICAgIGIuc2V0QXR0cmlidXRlKFwiZGlzYWJsZWRcIixcInRydWVcIik7IGIuc3R5bGUub3BhY2l0eT1cIjAuNVwiOyBcbiAgICAgICAgfSBlbHNlIHsgXG4gICAgICAgICAgICBiLmFkZENsYXNzKFwibW9kLWN0YVwiKTsgXG4gICAgICAgICAgICBiLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7IFxuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmdvbGQgLT0gY29zdDsgXG4gICAgICAgICAgICAgICAgYXdhaXQgZWZmZWN0KCk7IFxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5zYXZlKCk7IFxuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYEJvdWdodCAke25hbWV9YCk7IFxuICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTsgXG4gICAgICAgICAgICAgICAgbmV3IFNob3BNb2RhbCh0aGlzLmFwcCx0aGlzLnBsdWdpbikub3BlbigpOyBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBcbiAgICB9IFxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH0gXG59XG5cbmV4cG9ydCBjbGFzcyBRdWVzdE1vZGFsIGV4dGVuZHMgTW9kYWwgeyBcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luOyBcbiAgICBuYW1lOiBzdHJpbmc7IGRpZmZpY3VsdHk6IG51bWJlciA9IDM7IHNraWxsOiBzdHJpbmcgPSBcIk5vbmVcIjsgc2VjU2tpbGw6IHN0cmluZyA9IFwiTm9uZVwiOyBkZWFkbGluZTogc3RyaW5nID0gXCJcIjsgaGlnaFN0YWtlczogYm9vbGVhbiA9IGZhbHNlOyBpc0Jvc3M6IGJvb2xlYW4gPSBmYWxzZTsgXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHsgc3VwZXIoYXBwKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH0gXG4gICAgb25PcGVuKCkgeyBcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7IFxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwi4pqU77iPIERFUExPWU1FTlRcIiB9KTsgXG4gICAgICAgIFxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJPYmplY3RpdmVcIikuYWRkVGV4dCh0ID0+IHsgXG4gICAgICAgICAgICB0Lm9uQ2hhbmdlKHYgPT4gdGhpcy5uYW1lID0gdik7IFxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0LmlucHV0RWwuZm9jdXMoKSwgNTApOyBcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiRGlmZmljdWx0eVwiKS5hZGREcm9wZG93bihkID0+IGQuYWRkT3B0aW9uKFwiMVwiLFwiVHJpdmlhbFwiKS5hZGRPcHRpb24oXCIyXCIsXCJFYXN5XCIpLmFkZE9wdGlvbihcIjNcIixcIk1lZGl1bVwiKS5hZGRPcHRpb24oXCI0XCIsXCJIYXJkXCIpLmFkZE9wdGlvbihcIjVcIixcIlNVSUNJREVcIikuc2V0VmFsdWUoXCIzXCIpLm9uQ2hhbmdlKHY9PnRoaXMuZGlmZmljdWx0eT1wYXJzZUludCh2KSkpOyBcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNraWxsczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsgXCJOb25lXCI6IFwiTm9uZVwiIH07IFxuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5za2lsbHMuZm9yRWFjaChzID0+IHNraWxsc1tzLm5hbWVdID0gcy5uYW1lKTsgXG4gICAgICAgIHNraWxsc1tcIisgTmV3XCJdID0gXCIrIE5ld1wiOyBcbiAgICAgICAgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIlByaW1hcnkgTm9kZVwiKS5hZGREcm9wZG93bihkID0+IGQuYWRkT3B0aW9ucyhza2lsbHMpLm9uQ2hhbmdlKHYgPT4geyBcbiAgICAgICAgICAgIGlmKHY9PT1cIisgTmV3XCIpeyB0aGlzLmNsb3NlKCk7IG5ldyBTa2lsbE1hbmFnZXJNb2RhbCh0aGlzLmFwcCx0aGlzLnBsdWdpbikub3BlbigpOyB9IGVsc2UgdGhpcy5za2lsbD12OyBcbiAgICAgICAgfSkpOyBcbiAgICAgICAgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIlN5bmVyZ3kgTm9kZVwiKS5hZGREcm9wZG93bihkID0+IGQuYWRkT3B0aW9ucyhza2lsbHMpLnNldFZhbHVlKFwiTm9uZVwiKS5vbkNoYW5nZSh2ID0+IHRoaXMuc2VjU2tpbGwgPSB2KSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIkRlYWRsaW5lXCIpLmFkZFRleHQodCA9PiB7IHQuaW5wdXRFbC50eXBlID0gXCJkYXRldGltZS1sb2NhbFwiOyB0Lm9uQ2hhbmdlKHYgPT4gdGhpcy5kZWFkbGluZSA9IHYpOyB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiSGlnaCBTdGFrZXNcIikuc2V0RGVzYyhcIkRvdWJsZSBHb2xkIC8gRG91YmxlIERhbWFnZVwiKS5hZGRUb2dnbGUodD0+dC5zZXRWYWx1ZShmYWxzZSkub25DaGFuZ2Uodj0+dGhpcy5oaWdoU3Rha2VzPXYpKTsgXG4gICAgICAgIFxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLmFkZEJ1dHRvbihiID0+IGIuc2V0QnV0dG9uVGV4dChcIkRlcGxveVwiKS5zZXRDdGEoKS5vbkNsaWNrKCgpID0+IHsgXG4gICAgICAgICAgICBpZih0aGlzLm5hbWUpe1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5jcmVhdGVRdWVzdCh0aGlzLm5hbWUsdGhpcy5kaWZmaWN1bHR5LHRoaXMuc2tpbGwsdGhpcy5zZWNTa2lsbCx0aGlzLmRlYWRsaW5lLHRoaXMuaGlnaFN0YWtlcywgXCJOb3JtYWxcIiwgdGhpcy5pc0Jvc3MpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH0gXG4gICAgICAgIH0pKTsgXG4gICAgfSBcbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9IFxufVxuXG5leHBvcnQgY2xhc3MgU2tpbGxNYW5hZ2VyTW9kYWwgZXh0ZW5kcyBNb2RhbCB7IFxuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47IFxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9IFxuICAgIG9uT3BlbigpIHsgXG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzOyBcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIkFkZCBOZXcgTm9kZVwiIH0pOyBcbiAgICAgICAgbGV0IG49XCJcIjsgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIk5vZGUgTmFtZVwiKS5hZGRUZXh0KHQ9PnQub25DaGFuZ2Uodj0+bj12KSkuYWRkQnV0dG9uKGI9PmIuc2V0QnV0dG9uVGV4dChcIkNyZWF0ZVwiKS5zZXRDdGEoKS5vbkNsaWNrKGFzeW5jKCk9PntcbiAgICAgICAgICAgIGlmKG4pe1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5wdXNoKHtuYW1lOm4sbGV2ZWw6MSx4cDowLHhwUmVxOjUsbGFzdFVzZWQ6bmV3IERhdGUoKS50b0lTT1N0cmluZygpLHJ1c3Q6MCxjb25uZWN0aW9uczpbXX0pO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5zYXZlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSk7IFxuICAgIH0gXG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfSBcbn1cblxuZXhwb3J0IGNsYXNzIFNraWxsRGV0YWlsTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjsgaW5kZXg6IG51bWJlcjtcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbiwgaW5kZXg6IG51bWJlcikgeyBzdXBlcihhcHApOyB0aGlzLnBsdWdpbj1wbHVnaW47IHRoaXMuaW5kZXg9aW5kZXg7IH1cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzOyBjb25zdCBzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2tpbGxzW3RoaXMuaW5kZXhdO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IGBOb2RlOiAke3MubmFtZX1gIH0pO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJOYW1lXCIpLmFkZFRleHQodD0+dC5zZXRWYWx1ZShzLm5hbWUpLm9uQ2hhbmdlKHY9PnMubmFtZT12KSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIlJ1c3QgU3RhdHVzXCIpLnNldERlc2MoYFN0YWNrczogJHtzLnJ1c3R9YCkuYWRkQnV0dG9uKGI9PmIuc2V0QnV0dG9uVGV4dChcIk1hbnVhbCBQb2xpc2hcIikub25DbGljayhhc3luYygpPT57IFxuICAgICAgICAgICAgcy5ydXN0PTA7IHMueHBSZXE9TWF0aC5mbG9vcihzLnhwUmVxLzEuMSk7IFxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLnNhdmUoKTsgXG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7IFxuICAgICAgICAgICAgbmV3IE5vdGljZShcIlJ1c3QgcG9saXNoZWQuXCIpOyBcbiAgICAgICAgfSkpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZGl2ID0gY29udGVudEVsLmNyZWF0ZURpdigpOyBcbiAgICAgICAgZGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luLXRvcDoyMHB4OyBkaXNwbGF5OmZsZXg7IGp1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGJTYXZlID0gZGl2LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHt0ZXh0OlwiU2F2ZVwifSk7IFxuICAgICAgICBiU2F2ZS5hZGRDbGFzcyhcIm1vZC1jdGFcIik7IFxuICAgICAgICBiU2F2ZS5vbmNsaWNrPWFzeW5jKCk9PnsgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLnNhdmUoKTsgdGhpcy5jbG9zZSgpOyB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYkRlbCA9IGRpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7dGV4dDpcIkRlbGV0ZSBOb2RlXCJ9KTsgXG4gICAgICAgIGJEZWwuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcImNvbG9yOnJlZDtcIik7IFxuICAgICAgICBiRGVsLm9uY2xpY2s9YXN5bmMoKT0+eyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5zcGxpY2UodGhpcy5pbmRleCwgMSk7IFxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLnNhdmUoKTsgXG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7IFxuICAgICAgICB9O1xuICAgIH1cbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9XG59XG5cblxuXG5leHBvcnQgY2xhc3MgUmVzZWFyY2hRdWVzdE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG4gICAgdGl0bGU6IHN0cmluZyA9IFwiXCI7XG4gICAgdHlwZTogXCJzdXJ2ZXlcIiB8IFwiZGVlcF9kaXZlXCIgPSBcInN1cnZleVwiO1xuICAgIGxpbmtlZFNraWxsOiBzdHJpbmcgPSBcIk5vbmVcIjtcbiAgICBsaW5rZWRDb21iYXRRdWVzdDogc3RyaW5nID0gXCJOb25lXCI7XG5cbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikge1xuICAgICAgICBzdXBlcihhcHApO1xuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICB9XG5cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiUkVTRUFSQ0ggREVQTE9ZTUVOVFwiIH0pO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcbiAgICAgICAgICAgIC5zZXROYW1lKFwiUmVzZWFyY2ggVGl0bGVcIilcbiAgICAgICAgICAgIC5hZGRUZXh0KHQgPT4ge1xuICAgICAgICAgICAgICAgIHQub25DaGFuZ2UodiA9PiB0aGlzLnRpdGxlID0gdik7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0LmlucHV0RWwuZm9jdXMoKSwgNTApO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgLnNldE5hbWUoXCJSZXNlYXJjaCBUeXBlXCIpXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiBkXG4gICAgICAgICAgICAgICAgLmFkZE9wdGlvbihcInN1cnZleVwiLCBcIlN1cnZleSAoMTAwLTIwMCB3b3JkcylcIilcbiAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKFwiZGVlcF9kaXZlXCIsIFwiRGVlcCBEaXZlICgyMDAtNDAwIHdvcmRzKVwiKVxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZShcInN1cnZleVwiKVxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2ID0+IHRoaXMudHlwZSA9IHYgYXMgXCJzdXJ2ZXlcIiB8IFwiZGVlcF9kaXZlXCIpXG4gICAgICAgICAgICApO1xuXG4gICAgICAgIGNvbnN0IHNraWxsczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsgXCJOb25lXCI6IFwiTm9uZVwiIH07XG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5mb3JFYWNoKHMgPT4gc2tpbGxzW3MubmFtZV0gPSBzLm5hbWUpO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcbiAgICAgICAgICAgIC5zZXROYW1lKFwiTGlua2VkIFNraWxsXCIpXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiBkXG4gICAgICAgICAgICAgICAgLmFkZE9wdGlvbnMoc2tpbGxzKVxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZShcIk5vbmVcIilcbiAgICAgICAgICAgICAgICAub25DaGFuZ2UodiA9PiB0aGlzLmxpbmtlZFNraWxsID0gdilcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgY29uc3QgY29tYmF0UXVlc3RzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyBcIk5vbmVcIjogXCJOb25lXCIgfTtcbiAgICAgICAgY29uc3QgcXVlc3RGb2xkZXIgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJBY3RpdmVfUnVuL1F1ZXN0c1wiKTtcbiAgICAgICAgaWYgKHF1ZXN0Rm9sZGVyIGluc3RhbmNlb2YgVEZvbGRlcikge1xuICAgICAgICAgICAgcXVlc3RGb2xkZXIuY2hpbGRyZW4uZm9yRWFjaChmID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZiBpbnN0YW5jZW9mIFRGaWxlICYmIGYuZXh0ZW5zaW9uID09PSBcIm1kXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tYmF0UXVlc3RzW2YuYmFzZW5hbWVdID0gZi5iYXNlbmFtZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcbiAgICAgICAgICAgIC5zZXROYW1lKFwiTGluayBDb21iYXQgUXVlc3RcIilcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkID0+IGRcbiAgICAgICAgICAgICAgICAuYWRkT3B0aW9ucyhjb21iYXRRdWVzdHMpXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKFwiTm9uZVwiKVxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2ID0+IHRoaXMubGlua2VkQ29tYmF0UXVlc3QgPSB2KVxuICAgICAgICAgICAgKTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXG4gICAgICAgICAgICAuYWRkQnV0dG9uKGIgPT4gYlxuICAgICAgICAgICAgICAgIC5zZXRCdXR0b25UZXh0KFwiQ1JFQVRFIFJFU0VBUkNIXCIpXG4gICAgICAgICAgICAgICAgLnNldEN0YSgpXG4gICAgICAgICAgICAgICAgLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50aXRsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmNyZWF0ZVJlc2VhcmNoUXVlc3QoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50aXRsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5saW5rZWRTa2lsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmtlZENvbWJhdFF1ZXN0XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgfVxuXG4gICAgb25DbG9zZSgpIHtcbiAgICAgICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZXNlYXJjaExpc3RNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHtcbiAgICAgICAgc3VwZXIoYXBwKTtcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgfVxuXG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIlJFU0VBUkNIIExJQlJBUllcIiB9KTtcblxuICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRSZXNlYXJjaFJhdGlvKCk7XG4gICAgICAgIGNvbnN0IHN0YXRzRWwgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktcmVzZWFyY2gtc3RhdHNcIiB9KTtcbiAgICAgICAgc3RhdHNFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgQ29tYmF0IFF1ZXN0czogJHtzdGF0cy5jb21iYXR9YCB9KTtcbiAgICAgICAgc3RhdHNFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgUmVzZWFyY2ggUXVlc3RzOiAke3N0YXRzLnJlc2VhcmNofWAgfSk7XG4gICAgICAgIHN0YXRzRWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFJhdGlvOiAke3N0YXRzLnJhdGlvfToxYCB9KTtcblxuICAgICAgICBpZiAoIXRoaXMucGx1Z2luLmVuZ2luZS5jYW5DcmVhdGVSZXNlYXJjaFF1ZXN0KCkpIHtcbiAgICAgICAgICAgIGNvbnN0IHdhcm5pbmcgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICB3YXJuaW5nLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiY29sb3I6IG9yYW5nZTsgZm9udC13ZWlnaHQ6IGJvbGQ7IG1hcmdpbjogMTBweCAwO1wiKTtcbiAgICAgICAgICAgIHdhcm5pbmcuc2V0VGV4dChcIlJFU0VBUkNIIEJMT0NLRUQ6IE5lZWQgMjoxIGNvbWJhdCB0byByZXNlYXJjaCByYXRpb1wiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJBY3RpdmUgUmVzZWFyY2hcIiB9KTtcblxuICAgICAgICBjb25zdCBxdWVzdHMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maWx0ZXIocSA9PiAhcS5jb21wbGV0ZWQpO1xuICAgICAgICBpZiAocXVlc3RzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiTm8gYWN0aXZlIHJlc2VhcmNoIHF1ZXN0cy5cIiB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHF1ZXN0cy5mb3JFYWNoKChxOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXJkID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXJlc2VhcmNoLWNhcmRcIiB9KTtcbiAgICAgICAgICAgICAgICBjYXJkLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYm9yZGVyOiAxcHggc29saWQgIzQ0NDsgcGFkZGluZzogMTBweDsgbWFyZ2luOiA1cHggMDsgYm9yZGVyLXJhZGl1czogNHB4O1wiKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IGNhcmQuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IHEudGl0bGUgfSk7XG4gICAgICAgICAgICAgICAgaGVhZGVyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAwIDAgNXB4IDA7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgaW5mbyA9IGNhcmQuY3JlYXRlRWwoXCJkaXZcIik7XG4gICAgICAgICAgICAgICAgaW5mby5zZXRUZXh0KGBUeXBlOiAke3EudHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IFwiU3VydmV5XCIgOiBcIkRlZXAgRGl2ZVwifSB8IFdvcmRzOiAke3Eud29yZENvdW50fS8ke3Eud29yZExpbWl0fWApO1xuICAgICAgICAgICAgICAgIGluZm8uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmb250LXNpemU6IDAuOWVtOyBvcGFjaXR5OiAwLjg7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgYWN0aW9ucyA9IGNhcmQuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICAgICAgYWN0aW9ucy5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbi10b3A6IDhweDsgZGlzcGxheTogZmxleDsgZ2FwOiA1cHg7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgY29tcGxldGVCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDT01QTEVURVwiIH0pO1xuICAgICAgICAgICAgICAgIGNvbXBsZXRlQnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZmxleDogMTsgcGFkZGluZzogNXB4OyBiYWNrZ3JvdW5kOiBncmVlbjsgY29sb3I6IHdoaXRlOyBib3JkZXI6IG5vbmU7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyO1wiKTtcbiAgICAgICAgICAgICAgICBjb21wbGV0ZUJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuY29tcGxldGVSZXNlYXJjaFF1ZXN0KHEuaWQsIHEud29yZENvdW50KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBjb25zdCBkZWxldGVCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJERUxFVEVcIiB9KTtcbiAgICAgICAgICAgICAgICBkZWxldGVCdG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmbGV4OiAxOyBwYWRkaW5nOiA1cHg7IGJhY2tncm91bmQ6IHJlZDsgY29sb3I6IHdoaXRlOyBib3JkZXI6IG5vbmU7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyO1wiKTtcbiAgICAgICAgICAgICAgICBkZWxldGVCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmRlbGV0ZVJlc2VhcmNoUXVlc3QocS5pZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiQ29tcGxldGVkIFJlc2VhcmNoXCIgfSk7XG4gICAgICAgIGNvbnN0IGNvbXBsZXRlZCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbHRlcihxID0+IHEuY29tcGxldGVkKTtcbiAgICAgICAgaWYgKGNvbXBsZXRlZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk5vIGNvbXBsZXRlZCByZXNlYXJjaC5cIiB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbXBsZXRlZC5mb3JFYWNoKChxOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtID0gY29udGVudEVsLmNyZWF0ZUVsKFwicFwiKTtcbiAgICAgICAgICAgICAgICBpdGVtLnNldFRleHQoYCsgJHtxLnRpdGxlfSAoJHtxLnR5cGUgPT09IFwic3VydmV5XCIgPyBcIlN1cnZleVwiIDogXCJEZWVwIERpdmVcIn0pYCk7XG4gICAgICAgICAgICAgICAgaXRlbS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm9wYWNpdHk6IDAuNjsgZm9udC1zaXplOiAwLjllbTtcIik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG9uQ2xvc2UoKSB7XG4gICAgICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgfVxufVxuXG5cbmV4cG9ydCBjbGFzcyBDaGFpbkJ1aWxkZXJNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuICAgIGNoYWluTmFtZTogc3RyaW5nID0gXCJcIjtcbiAgICBzZWxlY3RlZFF1ZXN0czogc3RyaW5nW10gPSBbXTtcblxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgIH1cblxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJDSEFJTiBCVUlMREVSXCIgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgLnNldE5hbWUoXCJDaGFpbiBOYW1lXCIpXG4gICAgICAgICAgICAuYWRkVGV4dCh0ID0+IHtcbiAgICAgICAgICAgICAgICB0Lm9uQ2hhbmdlKHYgPT4gdGhpcy5jaGFpbk5hbWUgPSB2KTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHQuaW5wdXRFbC5mb2N1cygpLCA1MCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiU2VsZWN0IFF1ZXN0c1wiIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcXVlc3RGb2xkZXIgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJBY3RpdmVfUnVuL1F1ZXN0c1wiKTtcbiAgICAgICAgY29uc3QgcXVlc3RzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBcbiAgICAgICAgaWYgKHF1ZXN0Rm9sZGVyIGluc3RhbmNlb2YgVEZvbGRlcikge1xuICAgICAgICAgICAgcXVlc3RGb2xkZXIuY2hpbGRyZW4uZm9yRWFjaChmID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZiBpbnN0YW5jZW9mIFRGaWxlICYmIGYuZXh0ZW5zaW9uID09PSBcIm1kXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcXVlc3RzLnB1c2goZi5iYXNlbmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBxdWVzdHMuZm9yRWFjaCgocXVlc3QsIGlkeCkgPT4ge1xuICAgICAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgICAgIC5zZXROYW1lKHF1ZXN0KVxuICAgICAgICAgICAgICAgIC5hZGRUb2dnbGUodCA9PiB0Lm9uQ2hhbmdlKHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFF1ZXN0cy5wdXNoKHF1ZXN0KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRRdWVzdHMgPSB0aGlzLnNlbGVjdGVkUXVlc3RzLmZpbHRlcihxID0+IHEgIT09IHF1ZXN0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgLmFkZEJ1dHRvbihiID0+IGJcbiAgICAgICAgICAgICAgICAuc2V0QnV0dG9uVGV4dChcIkNSRUFURSBDSEFJTlwiKVxuICAgICAgICAgICAgICAgIC5zZXRDdGEoKVxuICAgICAgICAgICAgICAgIC5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY2hhaW5OYW1lICYmIHRoaXMuc2VsZWN0ZWRRdWVzdHMubGVuZ3RoID49IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5jcmVhdGVRdWVzdENoYWluKHRoaXMuY2hhaW5OYW1lLCB0aGlzLnNlbGVjdGVkUXVlc3RzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJDaGFpbiBuZWVkcyBhIG5hbWUgYW5kIGF0IGxlYXN0IDIgcXVlc3RzXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgfVxuXG4gICAgb25DbG9zZSgpIHtcbiAgICAgICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBEYXlNZXRyaWNzLCBXZWVrbHlSZXBvcnQsIEJvc3NNaWxlc3RvbmUsIFN0cmVhaywgQWNoaWV2ZW1lbnQgfSBmcm9tICcuLi90eXBlcyc7XG5cbi8qKlxuICogRExDIDY6IEFuYWx5dGljcyAmIEVuZGdhbWUgRW5naW5lXG4gKiBIYW5kbGVzIGFsbCBtZXRyaWNzIHRyYWNraW5nLCBib3NzIG1pbGVzdG9uZXMsIGFjaGlldmVtZW50cywgYW5kIHdpbiBjb25kaXRpb25cbiAqIFxuICogSVNPTEFURUQ6IE9ubHkgcmVhZHMvd3JpdGVzIHRvIHNldHRpbmdzLmRheU1ldHJpY3MsIHdlZWtseVJlcG9ydHMsIGJvc3NNaWxlc3RvbmVzLCBzdHJlYWssIGFjaGlldmVtZW50c1xuICogREVQRU5ERU5DSUVTOiBtb21lbnQsIFNpc3lwaHVzU2V0dGluZ3MgdHlwZXNcbiAqL1xuZXhwb3J0IGNsYXNzIEFuYWx5dGljc0VuZ2luZSB7XG4gICAgc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3M7XG4gICAgYXVkaW9Db250cm9sbGVyPzogYW55OyAvLyBPcHRpb25hbCBhdWRpbyBjYWxsYmFjayBmb3Igbm90aWZpY2F0aW9uc1xuXG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3MsIGF1ZGlvQ29udHJvbGxlcj86IGFueSkge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyID0gYXVkaW9Db250cm9sbGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRyYWNrIGRhaWx5IG1ldHJpY3MgLSBjYWxsZWQgd2hlbmV2ZXIgYSBxdWVzdCBpcyBjb21wbGV0ZWQvZmFpbGVkL2V0Y1xuICAgICAqL1xuICAgIHRyYWNrRGFpbHlNZXRyaWNzKHR5cGU6ICdxdWVzdF9jb21wbGV0ZScgfCAncXVlc3RfZmFpbCcgfCAneHAnIHwgJ2dvbGQnIHwgJ2RhbWFnZScgfCAnc2tpbGxfbGV2ZWwnIHwgJ2NoYWluX2NvbXBsZXRlJywgYW1vdW50OiBudW1iZXIgPSAxKSB7XG4gICAgICAgIGNvbnN0IHRvZGF5ID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgXG4gICAgICAgIGxldCBtZXRyaWMgPSB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MuZmluZChtID0+IG0uZGF0ZSA9PT0gdG9kYXkpO1xuICAgICAgICBpZiAoIW1ldHJpYykge1xuICAgICAgICAgICAgbWV0cmljID0ge1xuICAgICAgICAgICAgICAgIGRhdGU6IHRvZGF5LFxuICAgICAgICAgICAgICAgIHF1ZXN0c0NvbXBsZXRlZDogMCxcbiAgICAgICAgICAgICAgICBxdWVzdHNGYWlsZWQ6IDAsXG4gICAgICAgICAgICAgICAgeHBFYXJuZWQ6IDAsXG4gICAgICAgICAgICAgICAgZ29sZEVhcm5lZDogMCxcbiAgICAgICAgICAgICAgICBkYW1hZ2VzVGFrZW46IDAsXG4gICAgICAgICAgICAgICAgc2tpbGxzTGV2ZWxlZDogW10sXG4gICAgICAgICAgICAgICAgY2hhaW5zQ29tcGxldGVkOiAwXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzLnB1c2gobWV0cmljKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIFwicXVlc3RfY29tcGxldGVcIjpcbiAgICAgICAgICAgICAgICBtZXRyaWMucXVlc3RzQ29tcGxldGVkICs9IGFtb3VudDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJxdWVzdF9mYWlsXCI6XG4gICAgICAgICAgICAgICAgbWV0cmljLnF1ZXN0c0ZhaWxlZCArPSBhbW91bnQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwieHBcIjpcbiAgICAgICAgICAgICAgICBtZXRyaWMueHBFYXJuZWQgKz0gYW1vdW50O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImdvbGRcIjpcbiAgICAgICAgICAgICAgICBtZXRyaWMuZ29sZEVhcm5lZCArPSBhbW91bnQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiZGFtYWdlXCI6XG4gICAgICAgICAgICAgICAgbWV0cmljLmRhbWFnZXNUYWtlbiArPSBhbW91bnQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwic2tpbGxfbGV2ZWxcIjpcbiAgICAgICAgICAgICAgICBtZXRyaWMuc2tpbGxzTGV2ZWxlZC5wdXNoKFwiU2tpbGwgbGV2ZWxlZFwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJjaGFpbl9jb21wbGV0ZVwiOlxuICAgICAgICAgICAgICAgIG1ldHJpYy5jaGFpbnNDb21wbGV0ZWQgKz0gYW1vdW50O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGRhaWx5IHN0cmVhayAtIGNhbGxlZCBvbmNlIHBlciBkYXkgYXQgbG9naW5cbiAgICAgKi9cbiAgICB1cGRhdGVTdHJlYWsoKSB7XG4gICAgICAgIGNvbnN0IHRvZGF5ID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgY29uc3QgbGFzdERhdGUgPSB0aGlzLnNldHRpbmdzLnN0cmVhay5sYXN0RGF0ZTtcbiAgICAgICAgXG4gICAgICAgIGlmIChsYXN0RGF0ZSA9PT0gdG9kYXkpIHtcbiAgICAgICAgICAgIHJldHVybjsgLy8gQWxyZWFkeSBjb3VudGVkIHRvZGF5XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHllc3RlcmRheSA9IG1vbWVudCgpLnN1YnRyYWN0KDEsICdkYXknKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGxhc3REYXRlID09PSB5ZXN0ZXJkYXkpIHtcbiAgICAgICAgICAgIC8vIENvbnNlY3V0aXZlIGRheVxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5zdHJlYWsuY3VycmVudCsrO1xuICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3Muc3RyZWFrLmN1cnJlbnQgPiB0aGlzLnNldHRpbmdzLnN0cmVhay5sb25nZXN0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5zdHJlYWsubG9uZ2VzdCA9IHRoaXMuc2V0dGluZ3Muc3RyZWFrLmN1cnJlbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTdHJlYWsgYnJva2VuLCBzdGFydCBuZXcgb25lXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnN0cmVhay5jdXJyZW50ID0gMTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5zdHJlYWsubGFzdERhdGUgPSB0b2RheTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGJvc3MgbWlsZXN0b25lcyBvbiBmaXJzdCBydW5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplQm9zc01pbGVzdG9uZXMoKSB7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgbWlsZXN0b25lcyA9IFtcbiAgICAgICAgICAgICAgICB7IGxldmVsOiAxMCwgbmFtZTogXCJUaGUgRmlyc3QgVHJpYWxcIiwgdW5sb2NrZWQ6IGZhbHNlLCBkZWZlYXRlZDogZmFsc2UsIHhwUmV3YXJkOiA1MDAgfSxcbiAgICAgICAgICAgICAgICB7IGxldmVsOiAyMCwgbmFtZTogXCJUaGUgTmVtZXNpcyBSZXR1cm5zXCIsIHVubG9ja2VkOiBmYWxzZSwgZGVmZWF0ZWQ6IGZhbHNlLCB4cFJld2FyZDogMTAwMCB9LFxuICAgICAgICAgICAgICAgIHsgbGV2ZWw6IDMwLCBuYW1lOiBcIlRoZSBSZWFwZXIgQXdha2Vuc1wiLCB1bmxvY2tlZDogZmFsc2UsIGRlZmVhdGVkOiBmYWxzZSwgeHBSZXdhcmQ6IDE1MDAgfSxcbiAgICAgICAgICAgICAgICB7IGxldmVsOiA1MCwgbmFtZTogXCJUaGUgRmluYWwgQXNjZW5zaW9uXCIsIHVubG9ja2VkOiBmYWxzZSwgZGVmZWF0ZWQ6IGZhbHNlLCB4cFJld2FyZDogNTAwMCB9XG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzID0gbWlsZXN0b25lcyBhcyBhbnk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBhbnkgYm9zc2VzIHNob3VsZCBiZSB1bmxvY2tlZCBiYXNlZCBvbiBjdXJyZW50IGxldmVsXG4gICAgICovXG4gICAgY2hlY2tCb3NzTWlsZXN0b25lcygpOiBzdHJpbmdbXSB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2VzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzIHx8IHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVCb3NzTWlsZXN0b25lcygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmZvckVhY2goKGJvc3M6IEJvc3NNaWxlc3RvbmUpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmxldmVsID49IGJvc3MubGV2ZWwgJiYgIWJvc3MudW5sb2NrZWQpIHtcbiAgICAgICAgICAgICAgICBib3NzLnVubG9ja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlcy5wdXNoKGBCb3NzIFVubG9ja2VkOiAke2Jvc3MubmFtZX0gKExldmVsICR7Ym9zcy5sZXZlbH0pYCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyPy5wbGF5U291bmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2VzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1hcmsgYm9zcyBhcyBkZWZlYXRlZCBhbmQgYXdhcmQgWFBcbiAgICAgKi9cbiAgICBkZWZlYXRCb3NzKGxldmVsOiBudW1iZXIpOiB7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgeHBSZXdhcmQ6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgYm9zcyA9IHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMuZmluZCgoYjogQm9zc01pbGVzdG9uZSkgPT4gYi5sZXZlbCA9PT0gbGV2ZWwpO1xuICAgICAgICBpZiAoIWJvc3MpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIkJvc3Mgbm90IGZvdW5kXCIsIHhwUmV3YXJkOiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChib3NzLmRlZmVhdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJCb3NzIGFscmVhZHkgZGVmZWF0ZWRcIiwgeHBSZXdhcmQ6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgYm9zcy5kZWZlYXRlZCA9IHRydWU7XG4gICAgICAgIGJvc3MuZGVmZWF0ZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MueHAgKz0gYm9zcy54cFJld2FyZDtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcj8ucGxheVNvdW5kKSB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayB3aW4gY29uZGl0aW9uXG4gICAgICAgIGlmIChsZXZlbCA9PT0gNTApIHtcbiAgICAgICAgICAgIHRoaXMud2luR2FtZSgpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYEJvc3MgRGVmZWF0ZWQ6ICR7Ym9zcy5uYW1lfSEgVklDVE9SWSFgLCB4cFJld2FyZDogYm9zcy54cFJld2FyZCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgQm9zcyBEZWZlYXRlZDogJHtib3NzLm5hbWV9ISArJHtib3NzLnhwUmV3YXJkfSBYUGAsIHhwUmV3YXJkOiBib3NzLnhwUmV3YXJkIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJpZ2dlciB3aW4gY29uZGl0aW9uXG4gICAgICovXG4gICAgcHJpdmF0ZSB3aW5HYW1lKCkge1xuICAgICAgICB0aGlzLnNldHRpbmdzLmdhbWVXb24gPSB0cnVlO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmVuZEdhbWVEYXRlID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyPy5wbGF5U291bmQpIHtcbiAgICAgICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSB3ZWVrbHkgcmVwb3J0XG4gICAgICovXG4gICAgZ2VuZXJhdGVXZWVrbHlSZXBvcnQoKTogV2Vla2x5UmVwb3J0IHtcbiAgICAgICAgY29uc3Qgd2VlayA9IG1vbWVudCgpLndlZWsoKTtcbiAgICAgICAgY29uc3Qgc3RhcnREYXRlID0gbW9tZW50KCkuc3RhcnRPZignd2VlaycpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIGNvbnN0IGVuZERhdGUgPSBtb21lbnQoKS5lbmRPZignd2VlaycpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB3ZWVrTWV0cmljcyA9IHRoaXMuc2V0dGluZ3MuZGF5TWV0cmljcy5maWx0ZXIoKG06IERheU1ldHJpY3MpID0+IFxuICAgICAgICAgICAgbW9tZW50KG0uZGF0ZSkuaXNCZXR3ZWVuKG1vbWVudChzdGFydERhdGUpLCBtb21lbnQoZW5kRGF0ZSksIG51bGwsICdbXScpXG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0b3RhbFF1ZXN0cyA9IHdlZWtNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0ucXVlc3RzQ29tcGxldGVkLCAwKTtcbiAgICAgICAgY29uc3QgdG90YWxGYWlsZWQgPSB3ZWVrTWV0cmljcy5yZWR1Y2UoKHN1bTogbnVtYmVyLCBtOiBEYXlNZXRyaWNzKSA9PiBzdW0gKyBtLnF1ZXN0c0ZhaWxlZCwgMCk7XG4gICAgICAgIGNvbnN0IHN1Y2Nlc3NSYXRlID0gdG90YWxRdWVzdHMgKyB0b3RhbEZhaWxlZCA+IDAgPyBNYXRoLnJvdW5kKCh0b3RhbFF1ZXN0cyAvICh0b3RhbFF1ZXN0cyArIHRvdGFsRmFpbGVkKSkgKiAxMDApIDogMDtcbiAgICAgICAgY29uc3QgdG90YWxYcCA9IHdlZWtNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0ueHBFYXJuZWQsIDApO1xuICAgICAgICBjb25zdCB0b3RhbEdvbGQgPSB3ZWVrTWV0cmljcy5yZWR1Y2UoKHN1bTogbnVtYmVyLCBtOiBEYXlNZXRyaWNzKSA9PiBzdW0gKyBtLmdvbGRFYXJuZWQsIDApO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdG9wU2tpbGxzID0gdGhpcy5zZXR0aW5ncy5za2lsbHNcbiAgICAgICAgICAgIC5zb3J0KChhOiBhbnksIGI6IGFueSkgPT4gKGIubGV2ZWwgLSBhLmxldmVsKSlcbiAgICAgICAgICAgIC5zbGljZSgwLCAzKVxuICAgICAgICAgICAgLm1hcCgoczogYW55KSA9PiBzLm5hbWUpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYmVzdERheSA9IHdlZWtNZXRyaWNzLmxlbmd0aCA+IDAgXG4gICAgICAgICAgICA/IHdlZWtNZXRyaWNzLnJlZHVjZSgobWF4OiBEYXlNZXRyaWNzLCBtOiBEYXlNZXRyaWNzKSA9PiBtLnF1ZXN0c0NvbXBsZXRlZCA+IG1heC5xdWVzdHNDb21wbGV0ZWQgPyBtIDogbWF4KS5kYXRlXG4gICAgICAgICAgICA6IHN0YXJ0RGF0ZTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdvcnN0RGF5ID0gd2Vla01ldHJpY3MubGVuZ3RoID4gMFxuICAgICAgICAgICAgPyB3ZWVrTWV0cmljcy5yZWR1Y2UoKG1pbjogRGF5TWV0cmljcywgbTogRGF5TWV0cmljcykgPT4gbS5xdWVzdHNGYWlsZWQgPiBtaW4ucXVlc3RzRmFpbGVkID8gbSA6IG1pbikuZGF0ZVxuICAgICAgICAgICAgOiBzdGFydERhdGU7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZXBvcnQ6IFdlZWtseVJlcG9ydCA9IHtcbiAgICAgICAgICAgIHdlZWs6IHdlZWssXG4gICAgICAgICAgICBzdGFydERhdGU6IHN0YXJ0RGF0ZSxcbiAgICAgICAgICAgIGVuZERhdGU6IGVuZERhdGUsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0czogdG90YWxRdWVzdHMsXG4gICAgICAgICAgICBzdWNjZXNzUmF0ZTogc3VjY2Vzc1JhdGUsXG4gICAgICAgICAgICB0b3RhbFhwOiB0b3RhbFhwLFxuICAgICAgICAgICAgdG90YWxHb2xkOiB0b3RhbEdvbGQsXG4gICAgICAgICAgICB0b3BTa2lsbHM6IHRvcFNraWxscyxcbiAgICAgICAgICAgIGJlc3REYXk6IGJlc3REYXksXG4gICAgICAgICAgICB3b3JzdERheTogd29yc3REYXlcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3Mud2Vla2x5UmVwb3J0cy5wdXNoKHJlcG9ydCk7XG4gICAgICAgIHJldHVybiByZXBvcnQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVW5sb2NrIGFuIGFjaGlldmVtZW50XG4gICAgICovXG4gICAgdW5sb2NrQWNoaWV2ZW1lbnQoYWNoaWV2ZW1lbnRJZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGFjaGlldmVtZW50ID0gdGhpcy5zZXR0aW5ncy5hY2hpZXZlbWVudHMuZmluZCgoYTogQWNoaWV2ZW1lbnQpID0+IGEuaWQgPT09IGFjaGlldmVtZW50SWQpO1xuICAgICAgICBpZiAoIWFjaGlldmVtZW50IHx8IGFjaGlldmVtZW50LnVubG9ja2VkKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICBhY2hpZXZlbWVudC51bmxvY2tlZCA9IHRydWU7XG4gICAgICAgIGFjaGlldmVtZW50LnVubG9ja2VkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5hdWRpb0NvbnRyb2xsZXI/LnBsYXlTb3VuZCkge1xuICAgICAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgZ2FtZSBzdGF0cyBzbmFwc2hvdFxuICAgICAqL1xuICAgIGdldEdhbWVTdGF0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGxldmVsOiB0aGlzLnNldHRpbmdzLmxldmVsLFxuICAgICAgICAgICAgY3VycmVudFN0cmVhazogdGhpcy5zZXR0aW5ncy5zdHJlYWsuY3VycmVudCxcbiAgICAgICAgICAgIGxvbmdlc3RTdHJlYWs6IHRoaXMuc2V0dGluZ3Muc3RyZWFrLmxvbmdlc3QsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0czogdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0ucXVlc3RzQ29tcGxldGVkLCAwKSxcbiAgICAgICAgICAgIHRvdGFsWHA6IHRoaXMuc2V0dGluZ3MueHAgKyB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogRGF5TWV0cmljcykgPT4gc3VtICsgbS54cEVhcm5lZCwgMCksXG4gICAgICAgICAgICBnYW1lV29uOiB0aGlzLnNldHRpbmdzLmdhbWVXb24sXG4gICAgICAgICAgICBib3NzZXNEZWZlYXRlZDogdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcy5maWx0ZXIoKGI6IEJvc3NNaWxlc3RvbmUpID0+IGIuZGVmZWF0ZWQpLmxlbmd0aCxcbiAgICAgICAgICAgIHRvdGFsQm9zc2VzOiB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmxlbmd0aFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBzdXJ2aXZhbCBlc3RpbWF0ZSAocm91Z2ggY2FsY3VsYXRpb24pXG4gICAgICovXG4gICAgZ2V0U3Vydml2YWxFc3RpbWF0ZSgpOiBudW1iZXIge1xuICAgICAgICBjb25zdCBkYW1hZ2VQZXJGYWlsdXJlID0gMTAgKyBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3Mucml2YWxEbWcgLyAyKTtcbiAgICAgICAgY29uc3QgYWN0dWFsRGFtYWdlID0gdGhpcy5zZXR0aW5ncy5nb2xkIDwgMCA/IGRhbWFnZVBlckZhaWx1cmUgKiAyIDogZGFtYWdlUGVyRmFpbHVyZTtcbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy5ocCAvIE1hdGgubWF4KDEsIGFjdHVhbERhbWFnZSkpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IG1vbWVudCB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IFNpc3lwaHVzU2V0dGluZ3MgfSBmcm9tICcuLi90eXBlcyc7XG5cbi8qKlxuICogRExDIDM6IE1lZGl0YXRpb24gJiBSZWNvdmVyeSBFbmdpbmVcbiAqIEhhbmRsZXMgbG9ja2Rvd24gc3RhdGUsIG1lZGl0YXRpb24gaGVhbGluZywgYW5kIHF1ZXN0IGRlbGV0aW9uIHF1b3RhXG4gKiBcbiAqIElTT0xBVEVEOiBPbmx5IHJlYWRzL3dyaXRlcyB0byBsb2NrZG93blVudGlsLCBpc01lZGl0YXRpbmcsIG1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24sIFxuICogICAgICAgICAgIHF1ZXN0RGVsZXRpb25zVG9kYXksIGxhc3REZWxldGlvblJlc2V0XG4gKiBERVBFTkRFTkNJRVM6IG1vbWVudCwgU2lzeXBodXNTZXR0aW5nc1xuICogU0lERSBFRkZFQ1RTOiBQbGF5cyBhdWRpbyAoNDMyIEh6IHRvbmUpXG4gKi9cbmV4cG9ydCBjbGFzcyBNZWRpdGF0aW9uRW5naW5lIHtcbiAgICBzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncztcbiAgICBhdWRpb0NvbnRyb2xsZXI/OiBhbnk7IC8vIE9wdGlvbmFsIGZvciA0MzIgSHogc291bmRcbiAgICBwcml2YXRlIG1lZGl0YXRpb25Db29sZG93bk1zID0gMzAwMDA7IC8vIDMwIHNlY29uZHNcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzLCBhdWRpb0NvbnRyb2xsZXI/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlciA9IGF1ZGlvQ29udHJvbGxlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBjdXJyZW50bHkgbG9ja2VkIGRvd25cbiAgICAgKi9cbiAgICBpc0xvY2tlZERvd24oKTogYm9vbGVhbiB7XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiBtb21lbnQoKS5pc0JlZm9yZShtb21lbnQodGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGxvY2tkb3duIHRpbWUgcmVtYWluaW5nIGluIG1pbnV0ZXNcbiAgICAgKi9cbiAgICBnZXRMb2NrZG93blRpbWVSZW1haW5pbmcoKTogeyBob3VyczogbnVtYmVyOyBtaW51dGVzOiBudW1iZXI7IHRvdGFsTWludXRlczogbnVtYmVyIH0ge1xuICAgICAgICBpZiAoIXRoaXMuaXNMb2NrZWREb3duKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGhvdXJzOiAwLCBtaW51dGVzOiAwLCB0b3RhbE1pbnV0ZXM6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgdG90YWxNaW51dGVzID0gbW9tZW50KHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCkuZGlmZihtb21lbnQoKSwgJ21pbnV0ZXMnKTtcbiAgICAgICAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKHRvdGFsTWludXRlcyAvIDYwKTtcbiAgICAgICAgY29uc3QgbWludXRlcyA9IHRvdGFsTWludXRlcyAlIDYwO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHsgaG91cnMsIG1pbnV0ZXMsIHRvdGFsTWludXRlcyB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRyaWdnZXIgbG9ja2Rvd24gYWZ0ZXIgdGFraW5nIDUwKyBkYW1hZ2VcbiAgICAgKi9cbiAgICB0cmlnZ2VyTG9ja2Rvd24oKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCA9IG1vbWVudCgpLmFkZCg2LCAnaG91cnMnKS50b0lTT1N0cmluZygpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24gPSAwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm0gb25lIG1lZGl0YXRpb24gY3ljbGUgKGNsaWNrKVxuICAgICAqIFJldHVybnM6IHsgc3VjY2VzcywgY3ljbGVzRG9uZSwgY3ljbGVzUmVtYWluaW5nLCBtZXNzYWdlIH1cbiAgICAgKi9cbiAgICBtZWRpdGF0ZSgpOiB7IHN1Y2Nlc3M6IGJvb2xlYW47IGN5Y2xlc0RvbmU6IG51bWJlcjsgY3ljbGVzUmVtYWluaW5nOiBudW1iZXI7IG1lc3NhZ2U6IHN0cmluZzsgbG9ja2Rvd25SZWR1Y2VkOiBib29sZWFuIH0ge1xuICAgICAgICBpZiAoIXRoaXMuaXNMb2NrZWREb3duKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgY3ljbGVzRG9uZTogMCxcbiAgICAgICAgICAgICAgICBjeWNsZXNSZW1haW5pbmc6IDAsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogXCJOb3QgaW4gbG9ja2Rvd24uIE5vIG5lZWQgdG8gbWVkaXRhdGUuXCIsXG4gICAgICAgICAgICAgICAgbG9ja2Rvd25SZWR1Y2VkOiBmYWxzZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuaXNNZWRpdGF0aW5nKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGN5Y2xlc0RvbmU6IHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bixcbiAgICAgICAgICAgICAgICBjeWNsZXNSZW1haW5pbmc6IE1hdGgubWF4KDAsIDEwIC0gdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duKSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIkFscmVhZHkgbWVkaXRhdGluZy4gV2FpdCAzMCBzZWNvbmRzLlwiLFxuICAgICAgICAgICAgICAgIGxvY2tkb3duUmVkdWNlZDogZmFsc2VcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuaXNNZWRpdGF0aW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duKys7XG4gICAgICAgIFxuICAgICAgICAvLyBQbGF5IGhlYWxpbmcgZnJlcXVlbmN5XG4gICAgICAgIHRoaXMucGxheU1lZGl0YXRpb25Tb3VuZCgpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVtYWluaW5nID0gMTAgLSB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd247XG4gICAgICAgIGxldCBsb2NrZG93blJlZHVjZWQgPSBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIDEwIGN5Y2xlcyBjb21wbGV0ZVxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duID49IDEwKSB7XG4gICAgICAgICAgICBjb25zdCByZWR1Y2VkVGltZSA9IG1vbWVudCh0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwpLnN1YnRyYWN0KDUsICdob3VycycpO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsID0gcmVkdWNlZFRpbWUudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93biA9IDA7XG4gICAgICAgICAgICBsb2NrZG93blJlZHVjZWQgPSB0cnVlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodGhpcy5hdWRpb0NvbnRyb2xsZXI/LnBsYXlTb3VuZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEF1dG8tcmVzZXQgbWVkaXRhdGlvbiBmbGFnIGFmdGVyIGNvb2xkb3duXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLmlzTWVkaXRhdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgfSwgdGhpcy5tZWRpdGF0aW9uQ29vbGRvd25Ncyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjeWNsZXNEb25lOiAwLFxuICAgICAgICAgICAgICAgIGN5Y2xlc1JlbWFpbmluZzogMCxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIk1lZGl0YXRpb24gY29tcGxldGUuIExvY2tkb3duIHJlZHVjZWQgYnkgNSBob3Vycy5cIixcbiAgICAgICAgICAgICAgICBsb2NrZG93blJlZHVjZWQ6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEF1dG8tcmVzZXQgbWVkaXRhdGlvbiBmbGFnIGFmdGVyIGNvb2xkb3duXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5pc01lZGl0YXRpbmcgPSBmYWxzZTtcbiAgICAgICAgfSwgdGhpcy5tZWRpdGF0aW9uQ29vbGRvd25Ncyk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIGN5Y2xlc0RvbmU6IHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bixcbiAgICAgICAgICAgIGN5Y2xlc1JlbWFpbmluZzogcmVtYWluaW5nLFxuICAgICAgICAgICAgbWVzc2FnZTogYE1lZGl0YXRpb24gKCR7dGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3dufS8xMCkgLSAke3JlbWFpbmluZ30gY3ljbGVzIGxlZnRgLFxuICAgICAgICAgICAgbG9ja2Rvd25SZWR1Y2VkOiBmYWxzZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBsYXkgNDMyIEh6IGhlYWxpbmcgZnJlcXVlbmN5IGZvciAxIHNlY29uZFxuICAgICAqL1xuICAgIHByaXZhdGUgcGxheU1lZGl0YXRpb25Tb3VuZCgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGF1ZGlvQ29udGV4dCA9IG5ldyAod2luZG93LkF1ZGlvQ29udGV4dCB8fCAod2luZG93IGFzIGFueSkud2Via2l0QXVkaW9Db250ZXh0KSgpO1xuICAgICAgICAgICAgY29uc3Qgb3NjaWxsYXRvciA9IGF1ZGlvQ29udGV4dC5jcmVhdGVPc2NpbGxhdG9yKCk7XG4gICAgICAgICAgICBjb25zdCBnYWluTm9kZSA9IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG9zY2lsbGF0b3IuZnJlcXVlbmN5LnZhbHVlID0gNDMyO1xuICAgICAgICAgICAgb3NjaWxsYXRvci50eXBlID0gXCJzaW5lXCI7XG4gICAgICAgICAgICBnYWluTm9kZS5nYWluLnNldFZhbHVlQXRUaW1lKDAuMywgYXVkaW9Db250ZXh0LmN1cnJlbnRUaW1lKTtcbiAgICAgICAgICAgIGdhaW5Ob2RlLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSgwLjAxLCBhdWRpb0NvbnRleHQuY3VycmVudFRpbWUgKyAxKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgb3NjaWxsYXRvci5jb25uZWN0KGdhaW5Ob2RlKTtcbiAgICAgICAgICAgIGdhaW5Ob2RlLmNvbm5lY3QoYXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgb3NjaWxsYXRvci5zdGFydChhdWRpb0NvbnRleHQuY3VycmVudFRpbWUpO1xuICAgICAgICAgICAgb3NjaWxsYXRvci5zdG9wKGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZSArIDEpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvIG5vdCBhdmFpbGFibGUgZm9yIG1lZGl0YXRpb25cIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbWVkaXRhdGlvbiBzdGF0dXMgZm9yIGN1cnJlbnQgbG9ja2Rvd25cbiAgICAgKi9cbiAgICBnZXRNZWRpdGF0aW9uU3RhdHVzKCk6IHsgY3ljbGVzRG9uZTogbnVtYmVyOyBjeWNsZXNSZW1haW5pbmc6IG51bWJlcjsgdGltZVJlZHVjZWQ6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgY3ljbGVzRG9uZSA9IHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bjtcbiAgICAgICAgY29uc3QgY3ljbGVzUmVtYWluaW5nID0gTWF0aC5tYXgoMCwgMTAgLSBjeWNsZXNEb25lKTtcbiAgICAgICAgY29uc3QgdGltZVJlZHVjZWQgPSAoMTAgLSBjeWNsZXNSZW1haW5pbmcpICogMzA7IC8vIDMwIG1pbiBwZXIgY3ljbGVcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjeWNsZXNEb25lLFxuICAgICAgICAgICAgY3ljbGVzUmVtYWluaW5nLFxuICAgICAgICAgICAgdGltZVJlZHVjZWRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXNldCBkZWxldGlvbiBxdW90YSBpZiBuZXcgZGF5XG4gICAgICovXG4gICAgcHJpdmF0ZSBlbnN1cmVEZWxldGlvblF1b3RhUmVzZXQoKSB7XG4gICAgICAgIGNvbnN0IHRvZGF5ID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmxhc3REZWxldGlvblJlc2V0ICE9PSB0b2RheSkge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0RGVsZXRpb25SZXNldCA9IHRvZGF5O1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5ID0gMDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHVzZXIgaGFzIGZyZWUgZGVsZXRpb25zIGxlZnQgdG9kYXlcbiAgICAgKi9cbiAgICBjYW5EZWxldGVRdWVzdEZyZWUoKTogYm9vbGVhbiB7XG4gICAgICAgIHRoaXMuZW5zdXJlRGVsZXRpb25RdW90YVJlc2V0KCk7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkgPCAzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBkZWxldGlvbiBxdW90YSBzdGF0dXNcbiAgICAgKi9cbiAgICBnZXREZWxldGlvblF1b3RhKCk6IHsgZnJlZTogbnVtYmVyOyBwYWlkOiBudW1iZXI7IHJlbWFpbmluZzogbnVtYmVyIH0ge1xuICAgICAgICB0aGlzLmVuc3VyZURlbGV0aW9uUXVvdGFSZXNldCgpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVtYWluaW5nID0gTWF0aC5tYXgoMCwgMyAtIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSk7XG4gICAgICAgIGNvbnN0IHBhaWQgPSBNYXRoLm1heCgwLCB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkgLSAzKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBmcmVlOiByZW1haW5pbmcsXG4gICAgICAgICAgICBwYWlkOiBwYWlkLFxuICAgICAgICAgICAgcmVtYWluaW5nOiByZW1haW5pbmdcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgYSBxdWVzdCBhbmQgY2hhcmdlIGdvbGQgaWYgbmVjZXNzYXJ5XG4gICAgICogUmV0dXJuczogeyBjb3N0LCBtZXNzYWdlIH1cbiAgICAgKi9cbiAgICBhcHBseURlbGV0aW9uQ29zdCgpOiB7IGNvc3Q6IG51bWJlcjsgbWVzc2FnZTogc3RyaW5nIH0ge1xuICAgICAgICB0aGlzLmVuc3VyZURlbGV0aW9uUXVvdGFSZXNldCgpO1xuICAgICAgICBcbiAgICAgICAgbGV0IGNvc3QgPSAwO1xuICAgICAgICBsZXQgbWVzc2FnZSA9IFwiXCI7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5ID49IDMpIHtcbiAgICAgICAgICAgIC8vIFBhaWQgZGVsZXRpb25cbiAgICAgICAgICAgIGNvc3QgPSAxMDtcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBgUXVlc3QgZGVsZXRlZC4gQ29zdDogLSR7Y29zdH1nYDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZyZWUgZGVsZXRpb25cbiAgICAgICAgICAgIGNvbnN0IHJlbWFpbmluZyA9IDMgLSB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXk7XG4gICAgICAgICAgICBtZXNzYWdlID0gYFF1ZXN0IGRlbGV0ZWQuICgke3JlbWFpbmluZyAtIDF9IGZyZWUgZGVsZXRpb25zIHJlbWFpbmluZylgO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkrKztcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5nb2xkIC09IGNvc3Q7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBjb3N0LCBtZXNzYWdlIH07XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgU2lzeXBodXNTZXR0aW5ncywgUmVzZWFyY2hRdWVzdCB9IGZyb20gJy4uL3R5cGVzJztcblxuLyoqXG4gKiBETEMgMjogUmVzZWFyY2ggUXVlc3QgU3lzdGVtIEVuZ2luZVxuICogSGFuZGxlcyByZXNlYXJjaCBxdWVzdCBjcmVhdGlvbiwgY29tcGxldGlvbiwgd29yZCBjb3VudCB2YWxpZGF0aW9uLCBhbmQgY29tYmF0OnJlc2VhcmNoIHJhdGlvXG4gKiBcbiAqIElTT0xBVEVEOiBPbmx5IHJlYWRzL3dyaXRlcyB0byByZXNlYXJjaFF1ZXN0cywgcmVzZWFyY2hTdGF0c1xuICogREVQRU5ERU5DSUVTOiBTaXN5cGh1c1NldHRpbmdzIHR5cGVzXG4gKiBSRVFVSVJFTUVOVFM6IEF1ZGlvIGNhbGxiYWNrcyBmcm9tIHBhcmVudCBmb3Igbm90aWZpY2F0aW9uc1xuICovXG5leHBvcnQgY2xhc3MgUmVzZWFyY2hFbmdpbmUge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIGF1ZGlvQ29udHJvbGxlcj86IGFueTtcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzLCBhdWRpb0NvbnRyb2xsZXI/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlciA9IGF1ZGlvQ29udHJvbGxlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgcmVzZWFyY2ggcXVlc3RcbiAgICAgKiBDaGVja3MgMjoxIGNvbWJhdDpyZXNlYXJjaCByYXRpbyBiZWZvcmUgYWxsb3dpbmcgY3JlYXRpb25cbiAgICAgKi9cbiAgICBhc3luYyBjcmVhdGVSZXNlYXJjaFF1ZXN0KHRpdGxlOiBzdHJpbmcsIHR5cGU6IFwic3VydmV5XCIgfCBcImRlZXBfZGl2ZVwiLCBsaW5rZWRTa2lsbDogc3RyaW5nLCBsaW5rZWRDb21iYXRRdWVzdDogc3RyaW5nKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgcXVlc3RJZD86IHN0cmluZyB9PiB7XG4gICAgICAgIC8vIENoZWNrIDI6MSBjb21iYXQ6cmVzZWFyY2ggcmF0aW9cbiAgICAgICAgaWYgKCF0aGlzLmNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIlJFU0VBUkNIIEJMT0NLRUQ6IENvbXBsZXRlIDIgY29tYmF0IHF1ZXN0cyBwZXIgcmVzZWFyY2ggcXVlc3RcIlxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3Qgd29yZExpbWl0ID0gdHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IDIwMCA6IDQwMDtcbiAgICAgICAgY29uc3QgcXVlc3RJZCA9IGByZXNlYXJjaF8keyh0aGlzLnNldHRpbmdzLmxhc3RSZXNlYXJjaFF1ZXN0SWQgfHwgMCkgKyAxfWA7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZXNlYXJjaFF1ZXN0OiBSZXNlYXJjaFF1ZXN0ID0ge1xuICAgICAgICAgICAgaWQ6IHF1ZXN0SWQsXG4gICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgICAgbGlua2VkU2tpbGw6IGxpbmtlZFNraWxsLFxuICAgICAgICAgICAgd29yZExpbWl0OiB3b3JkTGltaXQsXG4gICAgICAgICAgICB3b3JkQ291bnQ6IDAsXG4gICAgICAgICAgICBsaW5rZWRDb21iYXRRdWVzdDogbGlua2VkQ29tYmF0UXVlc3QsXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGNvbXBsZXRlZDogZmFsc2VcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMucHVzaChyZXNlYXJjaFF1ZXN0KTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0UmVzZWFyY2hRdWVzdElkID0gcGFyc2VJbnQocXVlc3RJZC5zcGxpdCgnXycpWzFdKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnRvdGFsUmVzZWFyY2grKztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogYFJlc2VhcmNoIFF1ZXN0IENyZWF0ZWQ6ICR7dHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IFwiU3VydmV5XCIgOiBcIkRlZXAgRGl2ZVwifSAoJHt3b3JkTGltaXR9IHdvcmRzKWAsXG4gICAgICAgICAgICBxdWVzdElkOiBxdWVzdElkXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29tcGxldGUgYSByZXNlYXJjaCBxdWVzdFxuICAgICAqIFZhbGlkYXRlcyB3b3JkIGNvdW50ICg4MC0xMjUlKSwgYXBwbGllcyBwZW5hbHRpZXMgZm9yIG92ZXJhZ2UsIGF3YXJkcyBYUFxuICAgICAqL1xuICAgIGNvbXBsZXRlUmVzZWFyY2hRdWVzdChxdWVzdElkOiBzdHJpbmcsIGZpbmFsV29yZENvdW50OiBudW1iZXIpOiB7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgeHBSZXdhcmQ6IG51bWJlcjsgZ29sZFBlbmFsdHk6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgcmVzZWFyY2hRdWVzdCA9IHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuZmluZChxID0+IHEuaWQgPT09IHF1ZXN0SWQpO1xuICAgICAgICBpZiAoIXJlc2VhcmNoUXVlc3QpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIlJlc2VhcmNoIHF1ZXN0IG5vdCBmb3VuZFwiLCB4cFJld2FyZDogMCwgZ29sZFBlbmFsdHk6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHJlc2VhcmNoUXVlc3QuY29tcGxldGVkKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJRdWVzdCBhbHJlYWR5IGNvbXBsZXRlZFwiLCB4cFJld2FyZDogMCwgZ29sZFBlbmFsdHk6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgbWluaW11bSB3b3JkIGNvdW50ICg4MCUgb2YgbGltaXQpXG4gICAgICAgIGNvbnN0IG1pbldvcmRzID0gTWF0aC5jZWlsKHJlc2VhcmNoUXVlc3Qud29yZExpbWl0ICogMC44KTtcbiAgICAgICAgaWYgKGZpbmFsV29yZENvdW50IDwgbWluV29yZHMpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYFF1ZXN0IHRvbyBzaG9ydCEgTWluaW11bSAke21pbldvcmRzfSB3b3JkcyByZXF1aXJlZCAoeW91IGhhdmUgJHtmaW5hbFdvcmRDb3VudH0pYCxcbiAgICAgICAgICAgICAgICB4cFJld2FyZDogMCxcbiAgICAgICAgICAgICAgICBnb2xkUGVuYWx0eTogMFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgbWF4aW11bSB3b3JkIGNvdW50ICgxMjUlIGlzIGxvY2tlZClcbiAgICAgICAgaWYgKGZpbmFsV29yZENvdW50ID4gcmVzZWFyY2hRdWVzdC53b3JkTGltaXQgKiAxLjI1KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBXb3JkIGNvdW50IHRvbyBoaWdoISBNYXhpbXVtICR7TWF0aC5jZWlsKHJlc2VhcmNoUXVlc3Qud29yZExpbWl0ICogMS4yNSl9IHdvcmRzIGFsbG93ZWRgLFxuICAgICAgICAgICAgICAgIHhwUmV3YXJkOiAwLFxuICAgICAgICAgICAgICAgIGdvbGRQZW5hbHR5OiAwXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDYWxjdWxhdGUgWFAgcmV3YXJkXG4gICAgICAgIGxldCB4cFJld2FyZCA9IHJlc2VhcmNoUXVlc3QudHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IDUgOiAyMDtcbiAgICAgICAgXG4gICAgICAgIC8vIENhbGN1bGF0ZSBnb2xkIHBlbmFsdHkgZm9yIG92ZXJhZ2UgKDEwMC0xMjUlIHJhbmdlKVxuICAgICAgICBsZXQgZ29sZFBlbmFsdHkgPSAwO1xuICAgICAgICBpZiAoZmluYWxXb3JkQ291bnQgPiByZXNlYXJjaFF1ZXN0LndvcmRMaW1pdCkge1xuICAgICAgICAgICAgY29uc3Qgb3ZlcmFnZVBlcmNlbnQgPSAoKGZpbmFsV29yZENvdW50IC0gcmVzZWFyY2hRdWVzdC53b3JkTGltaXQpIC8gcmVzZWFyY2hRdWVzdC53b3JkTGltaXQpICogMTAwO1xuICAgICAgICAgICAgaWYgKG92ZXJhZ2VQZXJjZW50ID4gMCkge1xuICAgICAgICAgICAgICAgIGdvbGRQZW5hbHR5ID0gTWF0aC5mbG9vcigyMCAqIChvdmVyYWdlUGVyY2VudCAvIDEwMCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBd2FyZCBYUCB0byBsaW5rZWQgc2tpbGxcbiAgICAgICAgY29uc3Qgc2tpbGwgPSB0aGlzLnNldHRpbmdzLnNraWxscy5maW5kKHMgPT4gcy5uYW1lID09PSByZXNlYXJjaFF1ZXN0LmxpbmtlZFNraWxsKTtcbiAgICAgICAgaWYgKHNraWxsKSB7XG4gICAgICAgICAgICBza2lsbC54cCArPSB4cFJld2FyZDtcbiAgICAgICAgICAgIGlmIChza2lsbC54cCA+PSBza2lsbC54cFJlcSkge1xuICAgICAgICAgICAgICAgIHNraWxsLmxldmVsKys7XG4gICAgICAgICAgICAgICAgc2tpbGwueHAgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSBwZW5hbHR5IGFuZCBtYXJrIGNvbXBsZXRlXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZ29sZCAtPSBnb2xkUGVuYWx0eTtcbiAgICAgICAgcmVzZWFyY2hRdWVzdC5jb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICByZXNlYXJjaFF1ZXN0LmNvbXBsZXRlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMucmVzZWFyY2hDb21wbGV0ZWQrKztcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcj8ucGxheVNvdW5kKSB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBsZXQgbWVzc2FnZSA9IGBSZXNlYXJjaCBDb21wbGV0ZTogJHtyZXNlYXJjaFF1ZXN0LnRpdGxlfSEgKyR7eHBSZXdhcmR9IFhQYDtcbiAgICAgICAgaWYgKGdvbGRQZW5hbHR5ID4gMCkge1xuICAgICAgICAgICAgbWVzc2FnZSArPSBgICgtJHtnb2xkUGVuYWx0eX1nIG92ZXJhZ2UgcGVuYWx0eSlgO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlLCB4cFJld2FyZCwgZ29sZFBlbmFsdHkgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgYSByZXNlYXJjaCBxdWVzdFxuICAgICAqL1xuICAgIGRlbGV0ZVJlc2VhcmNoUXVlc3QocXVlc3RJZDogc3RyaW5nKTogeyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfSB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maW5kSW5kZXgocSA9PiBxLmlkID09PSBxdWVzdElkKTtcbiAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgY29uc3QgcXVlc3QgPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzW2luZGV4XTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRGVjcmVtZW50IHN0YXRzIGFwcHJvcHJpYXRlbHlcbiAgICAgICAgICAgIGlmICghcXVlc3QuY29tcGxldGVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnRvdGFsUmVzZWFyY2ggPSBNYXRoLm1heCgwLCB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMudG90YWxSZXNlYXJjaCAtIDEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMucmVzZWFyY2hDb21wbGV0ZWQgPSBNYXRoLm1heCgwLCB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMucmVzZWFyY2hDb21wbGV0ZWQgLSAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogXCJSZXNlYXJjaCBxdWVzdCBkZWxldGVkXCIgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiUmVzZWFyY2ggcXVlc3Qgbm90IGZvdW5kXCIgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgd29yZCBjb3VudCBmb3IgYSByZXNlYXJjaCBxdWVzdCAoYXMgdXNlciB3cml0ZXMpXG4gICAgICovXG4gICAgdXBkYXRlUmVzZWFyY2hXb3JkQ291bnQocXVlc3RJZDogc3RyaW5nLCBuZXdXb3JkQ291bnQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCByZXNlYXJjaFF1ZXN0ID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maW5kKHEgPT4gcS5pZCA9PT0gcXVlc3RJZCk7XG4gICAgICAgIGlmIChyZXNlYXJjaFF1ZXN0KSB7XG4gICAgICAgICAgICByZXNlYXJjaFF1ZXN0LndvcmRDb3VudCA9IG5ld1dvcmRDb3VudDtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCBjb21iYXQ6cmVzZWFyY2ggcmF0aW9cbiAgICAgKi9cbiAgICBnZXRSZXNlYXJjaFJhdGlvKCk6IHsgY29tYmF0OiBudW1iZXI7IHJlc2VhcmNoOiBudW1iZXI7IHJhdGlvOiBzdHJpbmcgfSB7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzO1xuICAgICAgICBjb25zdCByYXRpbyA9IHN0YXRzLnRvdGFsQ29tYmF0IC8gTWF0aC5tYXgoMSwgc3RhdHMudG90YWxSZXNlYXJjaCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjb21iYXQ6IHN0YXRzLnRvdGFsQ29tYmF0LFxuICAgICAgICAgICAgcmVzZWFyY2g6IHN0YXRzLnRvdGFsUmVzZWFyY2gsXG4gICAgICAgICAgICByYXRpbzogcmF0aW8udG9GaXhlZCgyKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHVzZXIgY2FuIGNyZWF0ZSBtb3JlIHJlc2VhcmNoIHF1ZXN0c1xuICAgICAqIFJ1bGU6IE11c3QgaGF2ZSAyOjEgY29tYmF0IHRvIHJlc2VhcmNoIHJhdGlvXG4gICAgICovXG4gICAgY2FuQ3JlYXRlUmVzZWFyY2hRdWVzdCgpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3Qgc3RhdHMgPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHM7XG4gICAgICAgIGNvbnN0IHJhdGlvID0gc3RhdHMudG90YWxDb21iYXQgLyBNYXRoLm1heCgxLCBzdGF0cy50b3RhbFJlc2VhcmNoKTtcbiAgICAgICAgcmV0dXJuIHJhdGlvID49IDI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFjdGl2ZSAobm90IGNvbXBsZXRlZCkgcmVzZWFyY2ggcXVlc3RzXG4gICAgICovXG4gICAgZ2V0QWN0aXZlUmVzZWFyY2hRdWVzdHMoKTogUmVzZWFyY2hRdWVzdFtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuZmlsdGVyKHEgPT4gIXEuY29tcGxldGVkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgY29tcGxldGVkIHJlc2VhcmNoIHF1ZXN0c1xuICAgICAqL1xuICAgIGdldENvbXBsZXRlZFJlc2VhcmNoUXVlc3RzKCk6IFJlc2VhcmNoUXVlc3RbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbHRlcihxID0+IHEuY29tcGxldGVkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0ZSB3b3JkIGNvdW50IHN0YXR1cyBmb3IgYSBxdWVzdFxuICAgICAqIFJldHVybnM6IHsgc3RhdHVzOiAndG9vX3Nob3J0JyB8ICdwZXJmZWN0JyB8ICdvdmVyYWdlJyB8ICdsb2NrZWQnLCBwZXJjZW50OiBudW1iZXIgfVxuICAgICAqL1xuICAgIHZhbGlkYXRlV29yZENvdW50KHF1ZXN0SWQ6IHN0cmluZywgd29yZENvdW50OiBudW1iZXIpOiB7IHN0YXR1czogJ3Rvb19zaG9ydCcgfCAncGVyZmVjdCcgfCAnb3ZlcmFnZScgfCAnbG9ja2VkJzsgcGVyY2VudDogbnVtYmVyOyBtZXNzYWdlOiBzdHJpbmcgfSB7XG4gICAgICAgIGNvbnN0IHF1ZXN0ID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maW5kKHEgPT4gcS5pZCA9PT0gcXVlc3RJZCk7XG4gICAgICAgIGlmICghcXVlc3QpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN0YXR1czogJ3Rvb19zaG9ydCcsIHBlcmNlbnQ6IDAsIG1lc3NhZ2U6IFwiUXVlc3Qgbm90IGZvdW5kXCIgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgcGVyY2VudCA9ICh3b3JkQ291bnQgLyBxdWVzdC53b3JkTGltaXQpICogMTAwO1xuICAgICAgICBcbiAgICAgICAgaWYgKHBlcmNlbnQgPCA4MCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiAndG9vX3Nob3J0JywgcGVyY2VudCwgbWVzc2FnZTogYFRvbyBzaG9ydCAoJHtNYXRoLmNlaWwocGVyY2VudCl9JSkuIE5lZWQgODAlIG1pbmltdW0uYCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAocGVyY2VudCA8PSAxMDApIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN0YXR1czogJ3BlcmZlY3QnLCBwZXJjZW50LCBtZXNzYWdlOiBgUGVyZmVjdCByYW5nZSAoJHtNYXRoLmNlaWwocGVyY2VudCl9JSlgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChwZXJjZW50IDw9IDEyNSkge1xuICAgICAgICAgICAgY29uc3QgdGF4ID0gTWF0aC5mbG9vcigyMCAqICgocGVyY2VudCAtIDEwMCkgLyAxMDApKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN0YXR1czogJ292ZXJhZ2UnLCBwZXJjZW50LCBtZXNzYWdlOiBgT3ZlcmFnZSB3YXJuaW5nOiAtJHt0YXh9ZyB0YXhgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7IHN0YXR1czogJ2xvY2tlZCcsIHBlcmNlbnQsIG1lc3NhZ2U6IGBMb2NrZWQhIE1heGltdW0gMTI1JSBvZiB3b3JkIGxpbWl0LmAgfTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBRdWVzdENoYWluLCBRdWVzdENoYWluUmVjb3JkIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG4vKipcbiAqIERMQyA0OiBRdWVzdCBDaGFpbnMgRW5naW5lXG4gKiBIYW5kbGVzIG11bHRpLXF1ZXN0IHNlcXVlbmNlcyB3aXRoIG9yZGVyaW5nLCBsb2NraW5nLCBhbmQgY29tcGxldGlvbiB0cmFja2luZ1xuICogXG4gKiBJU09MQVRFRDogT25seSByZWFkcy93cml0ZXMgdG8gYWN0aXZlQ2hhaW5zLCBjaGFpbkhpc3RvcnksIGN1cnJlbnRDaGFpbklkLCBjaGFpblF1ZXN0c0NvbXBsZXRlZFxuICogREVQRU5ERU5DSUVTOiBTaXN5cGh1c1NldHRpbmdzIHR5cGVzXG4gKiBJTlRFR1JBVElPTiBQT0lOVFM6IE5lZWRzIHRvIGhvb2sgaW50byBjb21wbGV0ZVF1ZXN0KCkgaW4gbWFpbiBlbmdpbmUgZm9yIGNoYWluIHByb2dyZXNzaW9uXG4gKi9cbmV4cG9ydCBjbGFzcyBDaGFpbnNFbmdpbmUge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIGF1ZGlvQ29udHJvbGxlcj86IGFueTtcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzLCBhdWRpb0NvbnRyb2xsZXI/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlciA9IGF1ZGlvQ29udHJvbGxlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgcXVlc3QgY2hhaW5cbiAgICAgKi9cbiAgICBhc3luYyBjcmVhdGVRdWVzdENoYWluKG5hbWU6IHN0cmluZywgcXVlc3ROYW1lczogc3RyaW5nW10pOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyBjaGFpbklkPzogc3RyaW5nIH0+IHtcbiAgICAgICAgaWYgKHF1ZXN0TmFtZXMubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIkNoYWluIG11c3QgaGF2ZSBhdCBsZWFzdCAyIHF1ZXN0c1wiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjaGFpbklkID0gYGNoYWluXyR7RGF0ZS5ub3coKX1gO1xuICAgICAgICBjb25zdCBjaGFpbjogUXVlc3RDaGFpbiA9IHtcbiAgICAgICAgICAgIGlkOiBjaGFpbklkLFxuICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgIHF1ZXN0czogcXVlc3ROYW1lcyxcbiAgICAgICAgICAgIGN1cnJlbnRJbmRleDogMCxcbiAgICAgICAgICAgIGNvbXBsZXRlZDogZmFsc2UsXG4gICAgICAgICAgICBzdGFydGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGlzQm9zczogcXVlc3ROYW1lc1txdWVzdE5hbWVzLmxlbmd0aCAtIDFdLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoXCJib3NzXCIpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5wdXNoKGNoYWluKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jdXJyZW50Q2hhaW5JZCA9IGNoYWluSWQ7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBDaGFpbiBjcmVhdGVkOiAke25hbWV9ICgke3F1ZXN0TmFtZXMubGVuZ3RofSBxdWVzdHMpYCxcbiAgICAgICAgICAgIGNoYWluSWQ6IGNoYWluSWRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIGN1cnJlbnQgYWN0aXZlIGNoYWluXG4gICAgICovXG4gICAgZ2V0QWN0aXZlQ2hhaW4oKTogUXVlc3RDaGFpbiB8IG51bGwge1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuY3VycmVudENoYWluSWQpIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5maW5kKGMgPT4gYy5pZCA9PT0gdGhpcy5zZXR0aW5ncy5jdXJyZW50Q2hhaW5JZCk7XG4gICAgICAgIHJldHVybiAoY2hhaW4gJiYgIWNoYWluLmNvbXBsZXRlZCkgPyBjaGFpbiA6IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBuZXh0IHF1ZXN0IHRoYXQgc2hvdWxkIGJlIGNvbXBsZXRlZCBpbiB0aGUgYWN0aXZlIGNoYWluXG4gICAgICovXG4gICAgZ2V0TmV4dFF1ZXN0SW5DaGFpbigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIGlmICghY2hhaW4pIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNoYWluLnF1ZXN0c1tjaGFpbi5jdXJyZW50SW5kZXhdIHx8IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgYSBxdWVzdCBpcyBwYXJ0IG9mIGFuIGFjdGl2ZSAoaW5jb21wbGV0ZSkgY2hhaW5cbiAgICAgKi9cbiAgICBpc1F1ZXN0SW5DaGFpbihxdWVzdE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zLmZpbmQoYyA9PiAhYy5jb21wbGV0ZWQpO1xuICAgICAgICBpZiAoIWNoYWluKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiBjaGFpbi5xdWVzdHMuaW5jbHVkZXMocXVlc3ROYW1lKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBhIHF1ZXN0IGNhbiBiZSBzdGFydGVkIChpcyBpdCB0aGUgbmV4dCBxdWVzdCBpbiB0aGUgY2hhaW4/KVxuICAgICAqL1xuICAgIGNhblN0YXJ0UXVlc3QocXVlc3ROYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIGlmICghY2hhaW4pIHJldHVybiB0cnVlOyAvLyBOb3QgaW4gYSBjaGFpbiwgY2FuIHN0YXJ0IGFueSBxdWVzdFxuICAgICAgICBcbiAgICAgICAgY29uc3QgbmV4dFF1ZXN0ID0gdGhpcy5nZXROZXh0UXVlc3RJbkNoYWluKCk7XG4gICAgICAgIHJldHVybiBuZXh0UXVlc3QgPT09IHF1ZXN0TmFtZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNYXJrIGEgcXVlc3QgYXMgY29tcGxldGVkIGluIHRoZSBjaGFpblxuICAgICAqIEFkdmFuY2VzIGNoYWluIGlmIHN1Y2Nlc3NmdWwsIGF3YXJkcyBib251cyBYUCBpZiBjaGFpbiBjb21wbGV0ZXNcbiAgICAgKi9cbiAgICBhc3luYyBjb21wbGV0ZUNoYWluUXVlc3QocXVlc3ROYW1lOiBzdHJpbmcpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyBjaGFpbkNvbXBsZXRlOiBib29sZWFuOyBib251c1hwOiBudW1iZXIgfT4ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiTm8gYWN0aXZlIGNoYWluXCIsIGNoYWluQ29tcGxldGU6IGZhbHNlLCBib251c1hwOiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRRdWVzdCA9IGNoYWluLnF1ZXN0c1tjaGFpbi5jdXJyZW50SW5kZXhdO1xuICAgICAgICBpZiAoY3VycmVudFF1ZXN0ICE9PSBxdWVzdE5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogXCJRdWVzdCBpcyBub3QgbmV4dCBpbiBjaGFpblwiLFxuICAgICAgICAgICAgICAgIGNoYWluQ29tcGxldGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGJvbnVzWHA6IDBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNoYWluLmN1cnJlbnRJbmRleCsrO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmNoYWluUXVlc3RzQ29tcGxldGVkKys7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBjaGFpbiBpcyBjb21wbGV0ZVxuICAgICAgICBpZiAoY2hhaW4uY3VycmVudEluZGV4ID49IGNoYWluLnF1ZXN0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBsZXRlQ2hhaW4oY2hhaW4pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZW1haW5pbmcgPSBjaGFpbi5xdWVzdHMubGVuZ3RoIC0gY2hhaW4uY3VycmVudEluZGV4O1xuICAgICAgICBjb25zdCBwZXJjZW50ID0gTWF0aC5mbG9vcigoY2hhaW4uY3VycmVudEluZGV4IC8gY2hhaW4ucXVlc3RzLmxlbmd0aCkgKiAxMDApO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBgQ2hhaW4gcHJvZ3Jlc3M6ICR7Y2hhaW4uY3VycmVudEluZGV4fS8ke2NoYWluLnF1ZXN0cy5sZW5ndGh9ICgke3JlbWFpbmluZ30gcmVtYWluaW5nLCAke3BlcmNlbnR9JSBjb21wbGV0ZSlgLFxuICAgICAgICAgICAgY2hhaW5Db21wbGV0ZTogZmFsc2UsXG4gICAgICAgICAgICBib251c1hwOiAwXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29tcGxldGUgdGhlIGVudGlyZSBjaGFpblxuICAgICAqL1xuICAgIHByaXZhdGUgYXN5bmMgY29tcGxldGVDaGFpbihjaGFpbjogUXVlc3RDaGFpbik6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmc7IGNoYWluQ29tcGxldGU6IGJvb2xlYW47IGJvbnVzWHA6IG51bWJlciB9PiB7XG4gICAgICAgIGNoYWluLmNvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgIGNoYWluLmNvbXBsZXRlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYm9udXNYcCA9IDEwMDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy54cCArPSBib251c1hwO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVjb3JkOiBRdWVzdENoYWluUmVjb3JkID0ge1xuICAgICAgICAgICAgY2hhaW5JZDogY2hhaW4uaWQsXG4gICAgICAgICAgICBjaGFpbk5hbWU6IGNoYWluLm5hbWUsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0czogY2hhaW4ucXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIGNvbXBsZXRlZEF0OiBjaGFpbi5jb21wbGV0ZWRBdCxcbiAgICAgICAgICAgIHhwRWFybmVkOiBib251c1hwXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeS5wdXNoKHJlY29yZCk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5hdWRpb0NvbnRyb2xsZXI/LnBsYXlTb3VuZCkge1xuICAgICAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBgQ2hhaW4gY29tcGxldGU6ICR7Y2hhaW4ubmFtZX0hICske2JvbnVzWHB9IFhQIEJvbnVzYCxcbiAgICAgICAgICAgIGNoYWluQ29tcGxldGU6IHRydWUsXG4gICAgICAgICAgICBib251c1hwOiBib251c1hwXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQnJlYWsgYW4gYWN0aXZlIGNoYWluXG4gICAgICogS2VlcHMgZWFybmVkIFhQIGZyb20gY29tcGxldGVkIHF1ZXN0c1xuICAgICAqL1xuICAgIGFzeW5jIGJyZWFrQ2hhaW4oKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgeHBLZXB0OiBudW1iZXIgfT4ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiTm8gYWN0aXZlIGNoYWluIHRvIGJyZWFrXCIsIHhwS2VwdDogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb21wbGV0ZWQgPSBjaGFpbi5jdXJyZW50SW5kZXg7XG4gICAgICAgIGNvbnN0IHhwS2VwdCA9IGNvbXBsZXRlZCAqIDEwOyAvLyBBcHByb3hpbWF0ZSBYUCBmcm9tIGVhY2ggcXVlc3RcbiAgICAgICAgXG4gICAgICAgIC8vIFNhdmUgdG8gaGlzdG9yeSBhcyBicm9rZW5cbiAgICAgICAgY29uc3QgcmVjb3JkOiBRdWVzdENoYWluUmVjb3JkID0ge1xuICAgICAgICAgICAgY2hhaW5JZDogY2hhaW4uaWQsXG4gICAgICAgICAgICBjaGFpbk5hbWU6IGNoYWluLm5hbWUsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0czogY2hhaW4ucXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIGNvbXBsZXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICB4cEVhcm5lZDogeHBLZXB0XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeS5wdXNoKHJlY29yZCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zID0gdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMuZmlsdGVyKGMgPT4gYy5pZCAhPT0gY2hhaW4uaWQpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmN1cnJlbnRDaGFpbklkID0gXCJcIjtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogYENoYWluIGJyb2tlbjogJHtjaGFpbi5uYW1lfS4gS2VwdCAke2NvbXBsZXRlZH0gcXVlc3QgY29tcGxldGlvbnMgKCR7eHBLZXB0fSBYUCkuYCxcbiAgICAgICAgICAgIHhwS2VwdDogeHBLZXB0XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHByb2dyZXNzIG9mIGFjdGl2ZSBjaGFpblxuICAgICAqL1xuICAgIGdldENoYWluUHJvZ3Jlc3MoKTogeyBjb21wbGV0ZWQ6IG51bWJlcjsgdG90YWw6IG51bWJlcjsgcGVyY2VudDogbnVtYmVyIH0ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikgcmV0dXJuIHsgY29tcGxldGVkOiAwLCB0b3RhbDogMCwgcGVyY2VudDogMCB9O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNvbXBsZXRlZDogY2hhaW4uY3VycmVudEluZGV4LFxuICAgICAgICAgICAgdG90YWw6IGNoYWluLnF1ZXN0cy5sZW5ndGgsXG4gICAgICAgICAgICBwZXJjZW50OiBNYXRoLmZsb29yKChjaGFpbi5jdXJyZW50SW5kZXggLyBjaGFpbi5xdWVzdHMubGVuZ3RoKSAqIDEwMClcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIGNvbXBsZXRlZCBjaGFpbiByZWNvcmRzIChoaXN0b3J5KVxuICAgICAqL1xuICAgIGdldENoYWluSGlzdG9yeSgpOiBRdWVzdENoYWluUmVjb3JkW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXR0aW5ncy5jaGFpbkhpc3Rvcnk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCBhY3RpdmUgY2hhaW5zIChub3QgY29tcGxldGVkKVxuICAgICAqL1xuICAgIGdldEFjdGl2ZUNoYWlucygpOiBRdWVzdENoYWluW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMuZmlsdGVyKGMgPT4gIWMuY29tcGxldGVkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgZGV0YWlsZWQgc3RhdGUgb2YgYWN0aXZlIGNoYWluIChmb3IgVUkgcmVuZGVyaW5nKVxuICAgICAqL1xuICAgIGdldENoYWluRGV0YWlscygpOiB7XG4gICAgICAgIGNoYWluOiBRdWVzdENoYWluIHwgbnVsbDtcbiAgICAgICAgcHJvZ3Jlc3M6IHsgY29tcGxldGVkOiBudW1iZXI7IHRvdGFsOiBudW1iZXI7IHBlcmNlbnQ6IG51bWJlciB9O1xuICAgICAgICBxdWVzdFN0YXRlczogQXJyYXk8eyBxdWVzdDogc3RyaW5nOyBzdGF0dXM6ICdjb21wbGV0ZWQnIHwgJ2FjdGl2ZScgfCAnbG9ja2VkJyB9PjtcbiAgICB9IHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIGlmICghY2hhaW4pIHtcbiAgICAgICAgICAgIHJldHVybiB7IGNoYWluOiBudWxsLCBwcm9ncmVzczogeyBjb21wbGV0ZWQ6IDAsIHRvdGFsOiAwLCBwZXJjZW50OiAwIH0sIHF1ZXN0U3RhdGVzOiBbXSB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBwcm9ncmVzcyA9IHRoaXMuZ2V0Q2hhaW5Qcm9ncmVzcygpO1xuICAgICAgICBjb25zdCBxdWVzdFN0YXRlcyA9IGNoYWluLnF1ZXN0cy5tYXAoKHF1ZXN0LCBpZHgpID0+IHtcbiAgICAgICAgICAgIGlmIChpZHggPCBjaGFpbi5jdXJyZW50SW5kZXgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBxdWVzdCwgc3RhdHVzOiAnY29tcGxldGVkJyBhcyBjb25zdCB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpZHggPT09IGNoYWluLmN1cnJlbnRJbmRleCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHF1ZXN0LCBzdGF0dXM6ICdhY3RpdmUnIGFzIGNvbnN0IH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHF1ZXN0LCBzdGF0dXM6ICdsb2NrZWQnIGFzIGNvbnN0IH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHsgY2hhaW4sIHByb2dyZXNzLCBxdWVzdFN0YXRlcyB9O1xuICAgIH1cbn1cbiIsImltcG9ydCB7IFRGaWxlIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgU2lzeXBodXNTZXR0aW5ncywgQ29udGV4dEZpbHRlciwgRmlsdGVyU3RhdGUsIEVuZXJneUxldmVsLCBRdWVzdENvbnRleHQgfSBmcm9tICcuLi90eXBlcyc7XG5cbi8qKlxuICogRExDIDU6IENvbnRleHQgRmlsdGVycyBFbmdpbmVcbiAqIEhhbmRsZXMgcXVlc3QgZmlsdGVyaW5nIGJ5IGVuZXJneSBsZXZlbCwgbG9jYXRpb24gY29udGV4dCwgYW5kIGN1c3RvbSB0YWdzXG4gKiBcbiAqIElTT0xBVEVEOiBPbmx5IHJlYWRzL3dyaXRlcyB0byBxdWVzdEZpbHRlcnMsIGZpbHRlclN0YXRlXG4gKiBERVBFTkRFTkNJRVM6IFNpc3lwaHVzU2V0dGluZ3MgdHlwZXMsIFRGaWxlIChmb3IgcXVlc3QgbWV0YWRhdGEpXG4gKiBOT1RFOiBUaGlzIGlzIHByaW1hcmlseSBhIFZJRVcgTEFZRVIgY29uY2VybiwgYnV0IGtlZXBpbmcgbG9naWMgaXNvbGF0ZWQgaXMgZ29vZFxuICovXG5leHBvcnQgY2xhc3MgRmlsdGVyc0VuZ2luZSB7XG4gICAgc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3M7XG5cbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncykge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0IGZpbHRlciBmb3IgYSBzcGVjaWZpYyBxdWVzdFxuICAgICAqL1xuICAgIHNldFF1ZXN0RmlsdGVyKHF1ZXN0TmFtZTogc3RyaW5nLCBlbmVyZ3k6IEVuZXJneUxldmVsLCBjb250ZXh0OiBRdWVzdENvbnRleHQsIHRhZ3M6IHN0cmluZ1tdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV0gPSB7XG4gICAgICAgICAgICBlbmVyZ3lMZXZlbDogZW5lcmd5LFxuICAgICAgICAgICAgY29udGV4dDogY29udGV4dCxcbiAgICAgICAgICAgIHRhZ3M6IHRhZ3NcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgZmlsdGVyIGZvciBhIHNwZWNpZmljIHF1ZXN0XG4gICAgICovXG4gICAgZ2V0UXVlc3RGaWx0ZXIocXVlc3ROYW1lOiBzdHJpbmcpOiBDb250ZXh0RmlsdGVyIHwgbnVsbCB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdIHx8IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSBhY3RpdmUgZmlsdGVyIHN0YXRlXG4gICAgICovXG4gICAgc2V0RmlsdGVyU3RhdGUoZW5lcmd5OiBFbmVyZ3lMZXZlbCB8IFwiYW55XCIsIGNvbnRleHQ6IFF1ZXN0Q29udGV4dCB8IFwiYW55XCIsIHRhZ3M6IHN0cmluZ1tdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUgPSB7XG4gICAgICAgICAgICBhY3RpdmVFbmVyZ3k6IGVuZXJneSBhcyBhbnksXG4gICAgICAgICAgICBhY3RpdmVDb250ZXh0OiBjb250ZXh0IGFzIGFueSxcbiAgICAgICAgICAgIGFjdGl2ZVRhZ3M6IHRhZ3NcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCBmaWx0ZXIgc3RhdGVcbiAgICAgKi9cbiAgICBnZXRGaWx0ZXJTdGF0ZSgpOiBGaWx0ZXJTdGF0ZSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGEgcXVlc3QgbWF0Y2hlcyBjdXJyZW50IGZpbHRlciBzdGF0ZVxuICAgICAqL1xuICAgIHF1ZXN0TWF0Y2hlc0ZpbHRlcihxdWVzdE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBmaWx0ZXJzID0gdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZTtcbiAgICAgICAgY29uc3QgcXVlc3RGaWx0ZXIgPSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgbm8gZmlsdGVyIHNldCBmb3IgdGhpcyBxdWVzdCwgYWx3YXlzIHNob3dcbiAgICAgICAgaWYgKCFxdWVzdEZpbHRlcikgcmV0dXJuIHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmVyZ3kgZmlsdGVyXG4gICAgICAgIGlmIChmaWx0ZXJzLmFjdGl2ZUVuZXJneSAhPT0gXCJhbnlcIiAmJiBxdWVzdEZpbHRlci5lbmVyZ3lMZXZlbCAhPT0gZmlsdGVycy5hY3RpdmVFbmVyZ3kpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29udGV4dCBmaWx0ZXJcbiAgICAgICAgaWYgKGZpbHRlcnMuYWN0aXZlQ29udGV4dCAhPT0gXCJhbnlcIiAmJiBxdWVzdEZpbHRlci5jb250ZXh0ICE9PSBmaWx0ZXJzLmFjdGl2ZUNvbnRleHQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVGFncyBmaWx0ZXIgKHJlcXVpcmVzIEFOWSBvZiB0aGUgYWN0aXZlIHRhZ3MpXG4gICAgICAgIGlmIChmaWx0ZXJzLmFjdGl2ZVRhZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgaGFzVGFnID0gZmlsdGVycy5hY3RpdmVUYWdzLnNvbWUoKHRhZzogc3RyaW5nKSA9PiBxdWVzdEZpbHRlci50YWdzLmluY2x1ZGVzKHRhZykpO1xuICAgICAgICAgICAgaWYgKCFoYXNUYWcpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmlsdGVyIGEgbGlzdCBvZiBxdWVzdHMgYmFzZWQgb24gY3VycmVudCBmaWx0ZXIgc3RhdGVcbiAgICAgKi9cbiAgICBmaWx0ZXJRdWVzdHMocXVlc3RzOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+KTogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9PiB7XG4gICAgICAgIHJldHVybiBxdWVzdHMuZmlsdGVyKHF1ZXN0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0TmFtZSA9IHF1ZXN0LmJhc2VuYW1lIHx8IHF1ZXN0Lm5hbWU7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5xdWVzdE1hdGNoZXNGaWx0ZXIocXVlc3ROYW1lKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHF1ZXN0cyBieSBzcGVjaWZpYyBlbmVyZ3kgbGV2ZWxcbiAgICAgKi9cbiAgICBnZXRRdWVzdHNCeUVuZXJneShlbmVyZ3k6IEVuZXJneUxldmVsLCBxdWVzdHM6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4pOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+IHtcbiAgICAgICAgcmV0dXJuIHF1ZXN0cy5maWx0ZXIocSA9PiB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdE5hbWUgPSBxLmJhc2VuYW1lIHx8IHEubmFtZTtcbiAgICAgICAgICAgIGNvbnN0IGZpbHRlciA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV07XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyICYmIGZpbHRlci5lbmVyZ3lMZXZlbCA9PT0gZW5lcmd5O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcXVlc3RzIGJ5IHNwZWNpZmljIGNvbnRleHRcbiAgICAgKi9cbiAgICBnZXRRdWVzdHNCeUNvbnRleHQoY29udGV4dDogUXVlc3RDb250ZXh0LCBxdWVzdHM6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4pOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+IHtcbiAgICAgICAgcmV0dXJuIHF1ZXN0cy5maWx0ZXIocSA9PiB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdE5hbWUgPSBxLmJhc2VuYW1lIHx8IHEubmFtZTtcbiAgICAgICAgICAgIGNvbnN0IGZpbHRlciA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV07XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyICYmIGZpbHRlci5jb250ZXh0ID09PSBjb250ZXh0O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcXVlc3RzIGJ5IHNwZWNpZmljIHRhZ3NcbiAgICAgKi9cbiAgICBnZXRRdWVzdHNCeVRhZ3ModGFnczogc3RyaW5nW10sIHF1ZXN0czogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9Pik6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4ge1xuICAgICAgICByZXR1cm4gcXVlc3RzLmZpbHRlcihxID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0TmFtZSA9IHEuYmFzZW5hbWUgfHwgcS5uYW1lO1xuICAgICAgICAgICAgY29uc3QgZmlsdGVyID0gdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnNbcXVlc3ROYW1lXTtcbiAgICAgICAgICAgIGlmICghZmlsdGVyKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm4gdGFncy5zb21lKHRhZyA9PiBmaWx0ZXIudGFncy5pbmNsdWRlcyh0YWcpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2xlYXIgYWxsIGFjdGl2ZSBmaWx0ZXJzXG4gICAgICovXG4gICAgY2xlYXJGaWx0ZXJzKCk6IHZvaWQge1xuICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlID0ge1xuICAgICAgICAgICAgYWN0aXZlRW5lcmd5OiBcImFueVwiLFxuICAgICAgICAgICAgYWN0aXZlQ29udGV4dDogXCJhbnlcIixcbiAgICAgICAgICAgIGFjdGl2ZVRhZ3M6IFtdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCB1bmlxdWUgdGFncyB1c2VkIGFjcm9zcyBhbGwgcXVlc3RzXG4gICAgICovXG4gICAgZ2V0QXZhaWxhYmxlVGFncygpOiBzdHJpbmdbXSB7XG4gICAgICAgIGNvbnN0IHRhZ3MgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgXG4gICAgICAgIGZvciAoY29uc3QgcXVlc3ROYW1lIGluIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzKSB7XG4gICAgICAgICAgICBjb25zdCBmaWx0ZXIgPSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdO1xuICAgICAgICAgICAgZmlsdGVyLnRhZ3MuZm9yRWFjaCgodGFnOiBzdHJpbmcpID0+IHRhZ3MuYWRkKHRhZykpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gQXJyYXkuZnJvbSh0YWdzKS5zb3J0KCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHN1bW1hcnkgc3RhdHMgYWJvdXQgZmlsdGVyZWQgc3RhdGVcbiAgICAgKi9cbiAgICBnZXRGaWx0ZXJTdGF0cyhhbGxRdWVzdHM6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4pOiB7XG4gICAgICAgIHRvdGFsOiBudW1iZXI7XG4gICAgICAgIGZpbHRlcmVkOiBudW1iZXI7XG4gICAgICAgIGFjdGl2ZUZpbHRlcnNDb3VudDogbnVtYmVyO1xuICAgIH0ge1xuICAgICAgICBjb25zdCBmaWx0ZXJlZCA9IHRoaXMuZmlsdGVyUXVlc3RzKGFsbFF1ZXN0cyk7XG4gICAgICAgIGNvbnN0IGFjdGl2ZUZpbHRlcnNDb3VudCA9ICh0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUVuZXJneSAhPT0gXCJhbnlcIiA/IDEgOiAwKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUNvbnRleHQgIT09IFwiYW55XCIgPyAxIDogMCkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVUYWdzLmxlbmd0aCA+IDAgPyAxIDogMCk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdG90YWw6IGFsbFF1ZXN0cy5sZW5ndGgsXG4gICAgICAgICAgICBmaWx0ZXJlZDogZmlsdGVyZWQubGVuZ3RoLFxuICAgICAgICAgICAgYWN0aXZlRmlsdGVyc0NvdW50OiBhY3RpdmVGaWx0ZXJzQ291bnRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgYSBzcGVjaWZpYyBmaWx0ZXIgdmFsdWVcbiAgICAgKiBVc2VmdWwgZm9yIFVJIHRvZ2dsZSBidXR0b25zXG4gICAgICovXG4gICAgdG9nZ2xlRW5lcmd5RmlsdGVyKGVuZXJneTogRW5lcmd5TGV2ZWwgfCBcImFueVwiKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUVuZXJneSA9PT0gZW5lcmd5KSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUVuZXJneSA9IFwiYW55XCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUVuZXJneSA9IGVuZXJneSBhcyBhbnk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgY29udGV4dCBmaWx0ZXJcbiAgICAgKi9cbiAgICB0b2dnbGVDb250ZXh0RmlsdGVyKGNvbnRleHQ6IFF1ZXN0Q29udGV4dCB8IFwiYW55XCIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlQ29udGV4dCA9PT0gY29udGV4dCkge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVDb250ZXh0ID0gXCJhbnlcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlQ29udGV4dCA9IGNvbnRleHQgYXMgYW55O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGEgdGFnIGluIHRoZSBhY3RpdmUgdGFnIGxpc3RcbiAgICAgKi9cbiAgICB0b2dnbGVUYWcodGFnOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVUYWdzLmluZGV4T2YodGFnKTtcbiAgICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZVRhZ3Muc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZVRhZ3MucHVzaCh0YWcpO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgQXBwLCBURmlsZSwgVEZvbGRlciwgTm90aWNlLCBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBTa2lsbCwgTW9kaWZpZXIsIERhaWx5TWlzc2lvbiB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgQXVkaW9Db250cm9sbGVyLCBUaW55RW1pdHRlciB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgQ2hhb3NNb2RhbCB9IGZyb20gJy4vdWkvbW9kYWxzJztcbmltcG9ydCB7IEFuYWx5dGljc0VuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9BbmFseXRpY3NFbmdpbmUnO1xuaW1wb3J0IHsgTWVkaXRhdGlvbkVuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9NZWRpdGF0aW9uRW5naW5lJztcbmltcG9ydCB7IFJlc2VhcmNoRW5naW5lIH0gZnJvbSAnLi9lbmdpbmVzL1Jlc2VhcmNoRW5naW5lJztcbmltcG9ydCB7IENoYWluc0VuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9DaGFpbnNFbmdpbmUnO1xuaW1wb3J0IHsgRmlsdGVyc0VuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9GaWx0ZXJzRW5naW5lJztcblxuLy8gREVGQVVMVCBDT05TVEFOVFNcbmV4cG9ydCBjb25zdCBERUZBVUxUX01PRElGSUVSOiBNb2RpZmllciA9IHsgbmFtZTogXCJDbGVhciBTa2llc1wiLCBkZXNjOiBcIk5vIGVmZmVjdHMuXCIsIHhwTXVsdDogMSwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMSwgaWNvbjogXCLimIDvuI9cIiB9O1xuZXhwb3J0IGNvbnN0IENIQU9TX1RBQkxFOiBNb2RpZmllcltdID0gW1xuICAgIHsgbmFtZTogXCJDbGVhciBTa2llc1wiLCBkZXNjOiBcIk5vcm1hbC5cIiwgeHBNdWx0OiAxLCBnb2xkTXVsdDogMSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIuKYgO+4j1wiIH0sXG4gICAgeyBuYW1lOiBcIkZsb3cgU3RhdGVcIiwgZGVzYzogXCIrNTAlIFhQLlwiLCB4cE11bHQ6IDEuNSwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMSwgaWNvbjogXCLwn4yKXCIgfSxcbiAgICB7IG5hbWU6IFwiV2luZGZhbGxcIiwgZGVzYzogXCIrNTAlIEdvbGQuXCIsIHhwTXVsdDogMSwgZ29sZE11bHQ6IDEuNSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIvCfkrBcIiB9LFxuICAgIHsgbmFtZTogXCJJbmZsYXRpb25cIiwgZGVzYzogXCJQcmljZXMgMnguXCIsIHhwTXVsdDogMSwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMiwgaWNvbjogXCLwn5OIXCIgfSxcbiAgICB7IG5hbWU6IFwiQnJhaW4gRm9nXCIsIGRlc2M6IFwiWFAgMC41eC5cIiwgeHBNdWx0OiAwLjUsIGdvbGRNdWx0OiAxLCBwcmljZU11bHQ6IDEsIGljb246IFwi8J+Mq++4j1wiIH0sXG4gICAgeyBuYW1lOiBcIlJpdmFsIFNhYm90YWdlXCIsIGRlc2M6IFwiR29sZCAwLjV4LlwiLCB4cE11bHQ6IDEsIGdvbGRNdWx0OiAwLjUsIHByaWNlTXVsdDogMSwgaWNvbjogXCLwn5W177iPXCIgfSxcbiAgICB7IG5hbWU6IFwiQWRyZW5hbGluZVwiLCBkZXNjOiBcIjJ4IFhQLCAtNSBIUC9RLlwiLCB4cE11bHQ6IDIsIGdvbGRNdWx0OiAxLCBwcmljZU11bHQ6IDEsIGljb246IFwi8J+SiVwiIH1cbl07XG5cbi8vIEJPU1MgREFUQVxuY29uc3QgQk9TU19EQVRBOiBSZWNvcmQ8bnVtYmVyLCB7IG5hbWU6IHN0cmluZywgZGVzYzogc3RyaW5nLCBocF9wZW46IG51bWJlciB9PiA9IHtcbiAgICAxMDogeyBuYW1lOiBcIlRoZSBHYXRla2VlcGVyXCIsIGRlc2M6IFwiVGhlIGZpcnN0IG1ham9yIGZpbHRlci4gUHJvdmUgeW91IGJlbG9uZyBoZXJlLlwiLCBocF9wZW46IDIwIH0sXG4gICAgMjA6IHsgbmFtZTogXCJUaGUgU2hhZG93IFNlbGZcIiwgZGVzYzogXCJZb3VyIG93biBiYWQgaGFiaXRzIG1hbmlmZXN0LlwiLCBocF9wZW46IDMwIH0sXG4gICAgMzA6IHsgbmFtZTogXCJUaGUgTW91bnRhaW5cIiwgZGVzYzogXCJUaGUgcGVhayBpcyB2aXNpYmxlLCBidXQgdGhlIGFpciBpcyB0aGluLlwiLCBocF9wZW46IDQwIH0sXG4gICAgNDA6IHsgbmFtZTogXCJUaGUgQWJzdXJkXCIsIGRlc2M6IFwiV2h5IGRvIHdlIHN0cnVnZ2xlPyBCZWNhdXNlIHdlIG11c3QuXCIsIGhwX3BlbjogNTAgfSxcbiAgICA1MDogeyBuYW1lOiBcIlNpc3lwaHVzIFByaW1lXCIsIGRlc2M6IFwiT25lIG11c3QgaW1hZ2luZSBTaXN5cGh1cyBoYXBweS5cIiwgaHBfcGVuOiA5OSB9XG59O1xuXG4vLyBNSVNTSU9OIFBPT0xcbmNvbnN0IE1JU1NJT05fUE9PTCA9IFtcbiAgICB7IGlkOiBcIm1vcm5pbmdfd2luXCIsIG5hbWU6IFwi4piA77iPIE1vcm5pbmcgV2luXCIsIGRlc2M6IFwiQ29tcGxldGUgMSBUcml2aWFsIHF1ZXN0IGJlZm9yZSAxMCBBTVwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMCwgZ29sZDogMTUgfSwgY2hlY2s6IFwibW9ybmluZ190cml2aWFsXCIgfSxcbiAgICB7IGlkOiBcIm1vbWVudHVtXCIsIG5hbWU6IFwi8J+UpSBNb21lbnR1bVwiLCBkZXNjOiBcIkNvbXBsZXRlIDMgcXVlc3RzIHRvZGF5XCIsIHRhcmdldDogMywgcmV3YXJkOiB7IHhwOiAyMCwgZ29sZDogMCB9LCBjaGVjazogXCJxdWVzdF9jb3VudFwiIH0sXG4gICAgeyBpZDogXCJ6ZXJvX2luYm94XCIsIG5hbWU6IFwi8J+nmCBaZXJvIEluYm94XCIsIGRlc2M6IFwiUHJvY2VzcyBhbGwgc2NyYXBzICgwIHJlbWFpbmluZylcIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDAsIGdvbGQ6IDEwIH0sIGNoZWNrOiBcInplcm9fc2NyYXBzXCIgfSxcbiAgICB7IGlkOiBcInNwZWNpYWxpc3RcIiwgbmFtZTogXCLwn46vIFNwZWNpYWxpc3RcIiwgZGVzYzogXCJVc2UgdGhlIHNhbWUgc2tpbGwgMyB0aW1lc1wiLCB0YXJnZXQ6IDMsIHJld2FyZDogeyB4cDogMTUsIGdvbGQ6IDAgfSwgY2hlY2s6IFwic2tpbGxfcmVwZWF0XCIgfSxcbiAgICB7IGlkOiBcImhpZ2hfc3Rha2VzXCIsIG5hbWU6IFwi8J+SqiBIaWdoIFN0YWtlc1wiLCBkZXNjOiBcIkNvbXBsZXRlIDEgSGlnaCBTdGFrZXMgcXVlc3RcIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDAsIGdvbGQ6IDMwIH0sIGNoZWNrOiBcImhpZ2hfc3Rha2VzXCIgfSxcbiAgICB7IGlkOiBcInNwZWVkX2RlbW9uXCIsIG5hbWU6IFwi4pqhIFNwZWVkIERlbW9uXCIsIGRlc2M6IFwiQ29tcGxldGUgcXVlc3Qgd2l0aGluIDJoIG9mIGNyZWF0aW9uXCIsIHRhcmdldDogMSwgcmV3YXJkOiB7IHhwOiAyNSwgZ29sZDogMCB9LCBjaGVjazogXCJmYXN0X2NvbXBsZXRlXCIgfSxcbiAgICB7IGlkOiBcInN5bmVyZ2lzdFwiLCBuYW1lOiBcIvCflJcgU3luZXJnaXN0XCIsIGRlc2M6IFwiQ29tcGxldGUgcXVlc3Qgd2l0aCBQcmltYXJ5ICsgU2Vjb25kYXJ5IHNraWxsXCIsIHRhcmdldDogMSwgcmV3YXJkOiB7IHhwOiAwLCBnb2xkOiAxMCB9LCBjaGVjazogXCJzeW5lcmd5XCIgfSxcbiAgICB7IGlkOiBcInN1cnZpdm9yXCIsIG5hbWU6IFwi8J+boe+4jyBTdXJ2aXZvclwiLCBkZXNjOiBcIkRvbid0IHRha2UgYW55IGRhbWFnZSB0b2RheVwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMCwgZ29sZDogMjAgfSwgY2hlY2s6IFwibm9fZGFtYWdlXCIgfSxcbiAgICB7IGlkOiBcInJpc2tfdGFrZXJcIiwgbmFtZTogXCLwn46yIFJpc2sgVGFrZXJcIiwgZGVzYzogXCJDb21wbGV0ZSBEaWZmaWN1bHR5IDQrIHF1ZXN0XCIsIHRhcmdldDogMSwgcmV3YXJkOiB7IHhwOiAxNSwgZ29sZDogMCB9LCBjaGVjazogXCJoYXJkX3F1ZXN0XCIgfVxuXTtcblxuZXhwb3J0IGNsYXNzIFNpc3lwaHVzRW5naW5lIGV4dGVuZHMgVGlueUVtaXR0ZXIge1xuICAgIGFwcDogQXBwO1xuICAgIHBsdWdpbjogYW55O1xuICAgIGF1ZGlvOiBBdWRpb0NvbnRyb2xsZXI7XG4gICAgXG4gICAgLy8gU3ViLUVuZ2luZXNcbiAgICBhbmFseXRpY3NFbmdpbmU6IEFuYWx5dGljc0VuZ2luZTtcbiAgICBtZWRpdGF0aW9uRW5naW5lOiBNZWRpdGF0aW9uRW5naW5lO1xuICAgIHJlc2VhcmNoRW5naW5lOiBSZXNlYXJjaEVuZ2luZTtcbiAgICBjaGFpbnNFbmdpbmU6IENoYWluc0VuZ2luZTtcbiAgICBmaWx0ZXJzRW5naW5lOiBGaWx0ZXJzRW5naW5lO1xuXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogYW55LCBhdWRpbzogQXVkaW9Db250cm9sbGVyKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuYXBwID0gYXBwO1xuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICAgICAgdGhpcy5hdWRpbyA9IGF1ZGlvO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5hbmFseXRpY3NFbmdpbmUgPSBuZXcgQW5hbHl0aWNzRW5naW5lKHRoaXMucGx1Z2luLnNldHRpbmdzLCB0aGlzLmF1ZGlvKTtcbiAgICAgICAgdGhpcy5tZWRpdGF0aW9uRW5naW5lID0gbmV3IE1lZGl0YXRpb25FbmdpbmUodGhpcy5wbHVnaW4uc2V0dGluZ3MsIHRoaXMuYXVkaW8pO1xuICAgICAgICB0aGlzLnJlc2VhcmNoRW5naW5lID0gbmV3IFJlc2VhcmNoRW5naW5lKHRoaXMucGx1Z2luLnNldHRpbmdzLCB0aGlzLmF1ZGlvKTtcbiAgICAgICAgdGhpcy5jaGFpbnNFbmdpbmUgPSBuZXcgQ2hhaW5zRW5naW5lKHRoaXMucGx1Z2luLnNldHRpbmdzLCB0aGlzLmF1ZGlvKTtcbiAgICAgICAgdGhpcy5maWx0ZXJzRW5naW5lID0gbmV3IEZpbHRlcnNFbmdpbmUodGhpcy5wbHVnaW4uc2V0dGluZ3MpO1xuICAgIH1cblxuICAgIGdldCBzZXR0aW5ncygpOiBTaXN5cGh1c1NldHRpbmdzIHsgcmV0dXJuIHRoaXMucGx1Z2luLnNldHRpbmdzOyB9XG4gICAgc2V0IHNldHRpbmdzKHZhbDogU2lzeXBodXNTZXR0aW5ncykgeyB0aGlzLnBsdWdpbi5zZXR0aW5ncyA9IHZhbDsgfVxuXG4gICAgYXN5bmMgc2F2ZSgpIHsgXG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpOyBcbiAgICAgICAgdGhpcy50cmlnZ2VyKFwidXBkYXRlXCIpO1xuICAgIH1cblxuICAgIC8vIEdBTUUgTE9PUFxuICAgIHJvbGxEYWlseU1pc3Npb25zKCkge1xuICAgICAgICBjb25zdCBhdmFpbGFibGUgPSBbLi4uTUlTU0lPTl9QT09MXTtcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWQ6IERhaWx5TWlzc2lvbltdID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoYXZhaWxhYmxlLmxlbmd0aCA9PT0gMCkgYnJlYWs7XG4gICAgICAgICAgICBjb25zdCBpZHggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBhdmFpbGFibGUubGVuZ3RoKTtcbiAgICAgICAgICAgIGNvbnN0IG1pc3Npb24gPSBhdmFpbGFibGUuc3BsaWNlKGlkeCwgMSlbMF07XG4gICAgICAgICAgICBzZWxlY3RlZC5wdXNoKHsgLi4ubWlzc2lvbiwgY2hlY2tGdW5jOiBtaXNzaW9uLmNoZWNrLCBwcm9ncmVzczogMCwgY29tcGxldGVkOiBmYWxzZSB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMgPSBzZWxlY3RlZDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25EYXRlID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdHNDb21wbGV0ZWRUb2RheSA9IDA7XG4gICAgICAgIHRoaXMuc2V0dGluZ3Muc2tpbGxVc2VzVG9kYXkgPSB7fTtcbiAgICB9XG5cbiAgICBjaGVja0RhaWx5TWlzc2lvbnMoY29udGV4dDogeyB0eXBlPzogc3RyaW5nOyBkaWZmaWN1bHR5PzogbnVtYmVyOyBza2lsbD86IHN0cmluZzsgc2Vjb25kYXJ5U2tpbGw/OiBzdHJpbmc7IGhpZ2hTdGFrZXM/OiBib29sZWFuOyBxdWVzdENyZWF0ZWQ/OiBudW1iZXIgfSkge1xuICAgICAgICBjb25zdCBub3cgPSBtb21lbnQoKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25zLmZvckVhY2gobWlzc2lvbiA9PiB7XG4gICAgICAgICAgICBpZiAobWlzc2lvbi5jb21wbGV0ZWQpIHJldHVybjtcbiAgICAgICAgICAgIHN3aXRjaCAobWlzc2lvbi5jaGVja0Z1bmMpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwibW9ybmluZ190cml2aWFsXCI6IGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LmRpZmZpY3VsdHkgPT09IDEgJiYgbm93LmhvdXIoKSA8IDEwKSBtaXNzaW9uLnByb2dyZXNzKys7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJxdWVzdF9jb3VudFwiOiBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIpIG1pc3Npb24ucHJvZ3Jlc3MgPSB0aGlzLnNldHRpbmdzLnF1ZXN0c0NvbXBsZXRlZFRvZGF5OyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiaGlnaF9zdGFrZXNcIjogaWYgKGNvbnRleHQudHlwZSA9PT0gXCJjb21wbGV0ZVwiICYmIGNvbnRleHQuaGlnaFN0YWtlcykgbWlzc2lvbi5wcm9ncmVzcysrOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiZmFzdF9jb21wbGV0ZVwiOiBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIgJiYgY29udGV4dC5xdWVzdENyZWF0ZWQpIHsgaWYgKG1vbWVudCgpLmRpZmYobW9tZW50KGNvbnRleHQucXVlc3RDcmVhdGVkKSwgJ2hvdXJzJykgPD0gMikgbWlzc2lvbi5wcm9ncmVzcysrOyB9IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJzeW5lcmd5XCI6IGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LnNraWxsICYmIGNvbnRleHQuc2Vjb25kYXJ5U2tpbGwgJiYgY29udGV4dC5zZWNvbmRhcnlTa2lsbCAhPT0gXCJOb25lXCIpIG1pc3Npb24ucHJvZ3Jlc3MrKzsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIm5vX2RhbWFnZVwiOiBpZiAoY29udGV4dC50eXBlID09PSBcImRhbWFnZVwiKSBtaXNzaW9uLnByb2dyZXNzID0gMDsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcImhhcmRfcXVlc3RcIjogaWYgKGNvbnRleHQudHlwZSA9PT0gXCJjb21wbGV0ZVwiICYmIGNvbnRleHQuZGlmZmljdWx0eSAmJiBjb250ZXh0LmRpZmZpY3VsdHkgPj0gNCkgbWlzc2lvbi5wcm9ncmVzcysrOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwic2tpbGxfcmVwZWF0XCI6IFxuICAgICAgICAgICAgICAgICAgICBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIgJiYgY29udGV4dC5za2lsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5za2lsbFVzZXNUb2RheVtjb250ZXh0LnNraWxsXSA9ICh0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5W2NvbnRleHQuc2tpbGxdIHx8IDApICsgMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1heFVzZXMgPSBNYXRoLm1heCgwLCAuLi5PYmplY3QudmFsdWVzKHRoaXMuc2V0dGluZ3Muc2tpbGxVc2VzVG9kYXkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pc3Npb24ucHJvZ3Jlc3MgPSBtYXhVc2VzO1xuICAgICAgICAgICAgICAgICAgICB9IFxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtaXNzaW9uLnByb2dyZXNzID49IG1pc3Npb24udGFyZ2V0ICYmICFtaXNzaW9uLmNvbXBsZXRlZCkge1xuICAgICAgICAgICAgICAgIG1pc3Npb24uY29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLnhwICs9IG1pc3Npb24ucmV3YXJkLnhwO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZ29sZCArPSBtaXNzaW9uLnJld2FyZC5nb2xkO1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYOKchSBEYWlseSBNaXNzaW9uIENvbXBsZXRlOiAke21pc3Npb24ubmFtZX1gKTtcbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBnZXREaWZmaWN1bHR5TnVtYmVyKGRpZmZMYWJlbDogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgaWYgKGRpZmZMYWJlbCA9PT0gXCJUcml2aWFsXCIpIHJldHVybiAxO1xuICAgICAgICBpZiAoZGlmZkxhYmVsID09PSBcIkVhc3lcIikgcmV0dXJuIDI7XG4gICAgICAgIGlmIChkaWZmTGFiZWwgPT09IFwiTWVkaXVtXCIpIHJldHVybiAzO1xuICAgICAgICBpZiAoZGlmZkxhYmVsID09PSBcIkhhcmRcIikgcmV0dXJuIDQ7XG4gICAgICAgIGlmIChkaWZmTGFiZWwgPT09IFwiU1VJQ0lERVwiKSByZXR1cm4gNTtcbiAgICAgICAgcmV0dXJuIDM7XG4gICAgfVxuXG4gICAgYXN5bmMgY2hlY2tEYWlseUxvZ2luKCkge1xuICAgICAgICBjb25zdCB0b2RheSA9IG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmxhc3RMb2dpbikge1xuICAgICAgICAgICAgY29uc3QgZGF5c0RpZmYgPSBtb21lbnQoKS5kaWZmKG1vbWVudCh0aGlzLnNldHRpbmdzLmxhc3RMb2dpbiksICdkYXlzJyk7XG4gICAgICAgICAgICBpZiAoZGF5c0RpZmYgPiAyKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgcm90RGFtYWdlID0gKGRheXNEaWZmIC0gMSkgKiAxMDtcbiAgICAgICAgICAgICAgICBpZiAocm90RGFtYWdlID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLmhwIC09IHJvdERhbWFnZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5oaXN0b3J5LnB1c2goeyBkYXRlOiB0b2RheSwgc3RhdHVzOiBcInJvdFwiLCB4cEVhcm5lZDogLXJvdERhbWFnZSB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubGFzdExvZ2luICE9PSB0b2RheSkge1xuICAgICAgICAgICAgdGhpcy5hbmFseXRpY3NFbmdpbmUudXBkYXRlU3RyZWFrKCk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLm1heEhwID0gMTAwICsgKHRoaXMuc2V0dGluZ3MubGV2ZWwgKiA1KTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaHAgPSBNYXRoLm1pbih0aGlzLnNldHRpbmdzLm1heEhwLCB0aGlzLnNldHRpbmdzLmhwICsgMjApO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5kYW1hZ2VUYWtlblRvZGF5ID0gMDtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCA9IFwiXCI7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHRvZGF5TW9tZW50ID0gbW9tZW50KCk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnNraWxscy5mb3JFYWNoKHMgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChzLmxhc3RVc2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0b2RheU1vbWVudC5kaWZmKG1vbWVudChzLmxhc3RVc2VkKSwgJ2RheXMnKSA+IDMgJiYgIXRoaXMuaXNSZXN0aW5nKCkpIHsgXG4gICAgICAgICAgICAgICAgICAgICAgICBzLnJ1c3QgPSBNYXRoLm1pbigxMCwgKHMucnVzdCB8fCAwKSArIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcy54cFJlcSA9IE1hdGguZmxvb3Iocy54cFJlcSAqIDEuMSk7IFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubGFzdExvZ2luID0gdG9kYXk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmhpc3RvcnkucHVzaCh7IGRhdGU6IHRvZGF5LCBzdGF0dXM6IFwic3VjY2Vzc1wiLCB4cEVhcm5lZDogMCB9KTtcbiAgICAgICAgICAgIGlmKHRoaXMuc2V0dGluZ3MuaGlzdG9yeS5sZW5ndGggPiAxNCkgdGhpcy5zZXR0aW5ncy5oaXN0b3J5LnNoaWZ0KCk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbkRhdGUgIT09IHRvZGF5KSB0aGlzLnJvbGxEYWlseU1pc3Npb25zKCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJvbGxDaGFvcyh0cnVlKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgY29tcGxldGVRdWVzdChmaWxlOiBURmlsZSkge1xuICAgICAgICB0aGlzLmFuYWx5dGljc0VuZ2luZS50cmFja0RhaWx5TWV0cmljcyhcInF1ZXN0X2NvbXBsZXRlXCIsIDEpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMudG90YWxDb21iYXQrKztcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLm1lZGl0YXRpb25FbmdpbmUuaXNMb2NrZWREb3duKCkpIHsgbmV3IE5vdGljZShcIkxPQ0tET1dOIEFDVElWRVwiKTsgcmV0dXJuOyB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBmbSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcbiAgICAgICAgaWYgKCFmbSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcXVlc3ROYW1lID0gZmlsZS5iYXNlbmFtZTtcbiAgICAgICAgaWYgKHRoaXMuY2hhaW5zRW5naW5lLmlzUXVlc3RJbkNoYWluKHF1ZXN0TmFtZSkgJiYgIXRoaXMuY2hhaW5zRW5naW5lLmNhblN0YXJ0UXVlc3QocXVlc3ROYW1lKSkge1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIlF1ZXN0IGxvY2tlZCBpbiBjaGFpbi4gQ29tcGxldGUgdGhlIGFjdGl2ZSBxdWVzdCBmaXJzdC5cIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5jaGFpbnNFbmdpbmUuaXNRdWVzdEluQ2hhaW4ocXVlc3ROYW1lKSkge1xuICAgICAgICAgICAgIGNvbnN0IGNoYWluUmVzdWx0ID0gYXdhaXQgdGhpcy5jaGFpbnNFbmdpbmUuY29tcGxldGVDaGFpblF1ZXN0KHF1ZXN0TmFtZSk7XG4gICAgICAgICAgICAgaWYgKGNoYWluUmVzdWx0LnN1Y2Nlc3MgJiYgY2hhaW5SZXN1bHQubWVzc2FnZSkgbmV3IE5vdGljZShjaGFpblJlc3VsdC5tZXNzYWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB4cCA9IChmbS54cF9yZXdhcmQgfHwgMjApICogdGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyLnhwTXVsdDtcbiAgICAgICAgbGV0IGdvbGQgPSAoZm0uZ29sZF9yZXdhcmQgfHwgMCkgKiB0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIuZ29sZE11bHQ7XG4gICAgICAgIGNvbnN0IHNraWxsTmFtZSA9IGZtLnNraWxsIHx8IFwiTm9uZVwiO1xuICAgICAgICBjb25zdCBzZWNvbmRhcnkgPSBmbS5zZWNvbmRhcnlfc2tpbGwgfHwgXCJOb25lXCI7IFxuXG4gICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcblxuICAgICAgICBjb25zdCBza2lsbCA9IHRoaXMuc2V0dGluZ3Muc2tpbGxzLmZpbmQocyA9PiBzLm5hbWUgPT09IHNraWxsTmFtZSk7XG4gICAgICAgIGlmIChza2lsbCkge1xuICAgICAgICAgICAgaWYgKHNraWxsLnJ1c3QgPiAwKSB7XG4gICAgICAgICAgICAgICAgc2tpbGwucnVzdCA9IDA7XG4gICAgICAgICAgICAgICAgc2tpbGwueHBSZXEgPSBNYXRoLmZsb29yKHNraWxsLnhwUmVxIC8gMS4yKTsgXG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShg4pyoICR7c2tpbGwubmFtZX06IFJ1c3QgQ2xlYXJlZCFgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNraWxsLmxhc3RVc2VkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgc2tpbGwueHAgKz0gMTtcbiAgICAgICAgICAgIGlmIChza2lsbC54cCA+PSBza2lsbC54cFJlcSkgeyBza2lsbC5sZXZlbCsrOyBza2lsbC54cCA9IDA7IG5ldyBOb3RpY2UoYPCfp6AgJHtza2lsbC5uYW1lfSBVcCFgKTsgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc2Vjb25kYXJ5ICYmIHNlY29uZGFyeSAhPT0gXCJOb25lXCIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWNTa2lsbCA9IHRoaXMuc2V0dGluZ3Muc2tpbGxzLmZpbmQocyA9PiBzLm5hbWUgPT09IHNlY29uZGFyeSk7XG4gICAgICAgICAgICAgICAgaWYgKHNlY1NraWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFza2lsbC5jb25uZWN0aW9ucykgc2tpbGwuY29ubmVjdGlvbnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYoIXNraWxsLmNvbm5lY3Rpb25zLmluY2x1ZGVzKHNlY29uZGFyeSkpIHsgc2tpbGwuY29ubmVjdGlvbnMucHVzaChzZWNvbmRhcnkpOyBuZXcgTm90aWNlKGDwn5SXIE5ldXJhbCBMaW5rIEVzdGFibGlzaGVkYCk7IH1cbiAgICAgICAgICAgICAgICAgICAgeHAgKz0gTWF0aC5mbG9vcihzZWNTa2lsbC5sZXZlbCAqIDAuNSk7IHNlY1NraWxsLnhwICs9IDAuNTsgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZGFpbHlNb2RpZmllci5uYW1lID09PSBcIkFkcmVuYWxpbmVcIikgdGhpcy5zZXR0aW5ncy5ocCAtPSA1O1xuICAgICAgICB0aGlzLnNldHRpbmdzLnhwICs9IHhwOyB0aGlzLnNldHRpbmdzLmdvbGQgKz0gZ29sZDtcblxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy54cCA+PSB0aGlzLnNldHRpbmdzLnhwUmVxKSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxldmVsKys7IFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5yaXZhbERtZyArPSA1OyBcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MueHAgPSAwO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy54cFJlcSA9IE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy54cFJlcSAqIDEuMSk7IFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5tYXhIcCA9IDEwMCArICh0aGlzLnNldHRpbmdzLmxldmVsICogNSk7IFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5ocCA9IHRoaXMuc2V0dGluZ3MubWF4SHA7XG4gICAgICAgICAgICB0aGlzLnRhdW50KFwibGV2ZWxfdXBcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGJvc3NNc2dzID0gdGhpcy5hbmFseXRpY3NFbmdpbmUuY2hlY2tCb3NzTWlsZXN0b25lcygpO1xuICAgICAgICAgICAgYm9zc01zZ3MuZm9yRWFjaChtc2cgPT4gbmV3IE5vdGljZShtc2cpKTtcblxuICAgICAgICAgICAgLy8gQk9TUyBTUEFXTiBDSEVDS1xuICAgICAgICAgICAgaWYgKEJPU1NfREFUQVt0aGlzLnNldHRpbmdzLmxldmVsXSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc3Bhd25Cb3NzKHRoaXMuc2V0dGluZ3MubGV2ZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdHNDb21wbGV0ZWRUb2RheSsrO1xuICAgICAgICBjb25zdCBxdWVzdENyZWF0ZWQgPSBmbS5jcmVhdGVkID8gbmV3IERhdGUoZm0uY3JlYXRlZCkuZ2V0VGltZSgpIDogRGF0ZS5ub3coKTtcbiAgICAgICAgY29uc3QgZGlmZmljdWx0eSA9IHRoaXMuZ2V0RGlmZmljdWx0eU51bWJlcihmbS5kaWZmaWN1bHR5KTtcbiAgICAgICAgdGhpcy5jaGVja0RhaWx5TWlzc2lvbnMoeyB0eXBlOiBcImNvbXBsZXRlXCIsIGRpZmZpY3VsdHksIHNraWxsOiBza2lsbE5hbWUsIHNlY29uZGFyeVNraWxsOiBzZWNvbmRhcnksIGhpZ2hTdGFrZXM6IGZtLmhpZ2hfc3Rha2VzLCBxdWVzdENyZWF0ZWQgfSk7XG5cbiAgICAgICAgY29uc3QgYXJjaGl2ZVBhdGggPSBcIkFjdGl2ZV9SdW4vQXJjaGl2ZVwiO1xuICAgICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChhcmNoaXZlUGF0aCkpIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihhcmNoaXZlUGF0aCk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZikgPT4geyBmLnN0YXR1cyA9IFwiY29tcGxldGVkXCI7IGYuY29tcGxldGVkX2F0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpOyB9KTtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucmVuYW1lRmlsZShmaWxlLCBgJHthcmNoaXZlUGF0aH0vJHtmaWxlLm5hbWV9YCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgIH1cblxuICAgIGFzeW5jIHNwYXduQm9zcyhsZXZlbDogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGJvc3MgPSBCT1NTX0RBVEFbbGV2ZWxdO1xuICAgICAgICBpZiAoIWJvc3MpIHJldHVybjtcblxuICAgICAgICBjb25zdCBib3NzTmFtZSA9IGBCT1NTX0xWTCR7bGV2ZWx9IC0gJHtib3NzLm5hbWV9YDtcbiAgICAgICAgbmV3IE5vdGljZShg4pqg77iPIEJPU1MgREVURUNURUQ6ICR7Ym9zcy5uYW1lfWApO1xuICAgICAgICBcbiAgICAgICAgLy8gQXV0by1jcmVhdGUgdGhlIGJvc3MgcXVlc3RcbiAgICAgICAgYXdhaXQgdGhpcy5jcmVhdGVRdWVzdChcbiAgICAgICAgICAgIGJvc3NOYW1lLCBcbiAgICAgICAgICAgIDUsIC8vIERpZmZpY3VsdHkgNSAoU3VpY2lkZSlcbiAgICAgICAgICAgIFwiQm9zc1wiLCBcbiAgICAgICAgICAgIFwiTm9uZVwiLCBcbiAgICAgICAgICAgIG1vbWVudCgpLmFkZCgzLCAnZGF5cycpLnRvSVNPU3RyaW5nKCksIC8vIDMgRGF5IGxpbWl0XG4gICAgICAgICAgICB0cnVlLCAvLyBIaWdoIFN0YWtlc1xuICAgICAgICAgICAgXCJDcml0aWNhbFwiLCAvLyBQcmlvcml0eVxuICAgICAgICAgICAgdHJ1ZSAvLyBpc0Jvc3MgZmxhZ1xuICAgICAgICApO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5hdWRpby5wbGF5U291bmQoXCJkZWF0aFwiKTsgLy8gT21pbm91cyBzb3VuZFxuICAgIH1cblxuICAgIGFzeW5jIGZhaWxRdWVzdChmaWxlOiBURmlsZSwgbWFudWFsQWJvcnQ6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgICAgICBpZiAodGhpcy5pc1Jlc3RpbmcoKSAmJiAhbWFudWFsQWJvcnQpIHsgbmV3IE5vdGljZShcIvCfmLQgUmVzdCBEYXkgYWN0aXZlLiBObyBkYW1hZ2UuXCIpOyByZXR1cm47IH1cblxuICAgICAgICBpZiAodGhpcy5pc1NoaWVsZGVkKCkgJiYgIW1hbnVhbEFib3J0KSB7XG4gICAgICAgICAgICBuZXcgTm90aWNlKGDwn5uh77iPIFNISUVMREVEIWApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGRhbWFnZSA9IDEwICsgTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLnJpdmFsRG1nIC8gMik7XG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5nb2xkIDwgLTEwMCkgZGFtYWdlICo9IDI7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaHAgLT0gZGFtYWdlO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5kYW1hZ2VUYWtlblRvZGF5ICs9IGRhbWFnZTtcbiAgICAgICAgICAgIGlmICghbWFudWFsQWJvcnQpIHRoaXMuc2V0dGluZ3Mucml2YWxEbWcgKz0gMTsgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwiZmFpbFwiKTtcbiAgICAgICAgICAgIHRoaXMudGF1bnQoXCJmYWlsXCIpO1xuICAgICAgICAgICAgdGhpcy5jaGVja0RhaWx5TWlzc2lvbnMoeyB0eXBlOiBcImRhbWFnZVwiIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5kYW1hZ2VUYWtlblRvZGF5ID4gNTApIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1lZGl0YXRpb25FbmdpbmUudHJpZ2dlckxvY2tkb3duKCk7XG4gICAgICAgICAgICAgICAgdGhpcy50YXVudChcImxvY2tkb3duXCIpO1xuICAgICAgICAgICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwiZGVhdGhcIik7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwibG9ja2Rvd25cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5ocCA8PSAzMCkgeyB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImhlYXJ0YmVhdFwiKTsgdGhpcy50YXVudChcImxvd19ocFwiKTsgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGdyYXZlUGF0aCA9IFwiR3JhdmV5YXJkL0ZhaWx1cmVzXCI7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGdyYXZlUGF0aCkpIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihncmF2ZVBhdGgpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5yZW5hbWVGaWxlKGZpbGUsIGAke2dyYXZlUGF0aH0vW0ZBSUxFRF0gJHtmaWxlLm5hbWV9YCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5ocCA8PSAwKSB0aGlzLnRyaWdnZXJEZWF0aCgpO1xuICAgIH1cbiAgICBcbiAgICBhc3luYyBjcmVhdGVRdWVzdChuYW1lOiBzdHJpbmcsIGRpZmY6IG51bWJlciwgc2tpbGw6IHN0cmluZywgc2VjU2tpbGw6IHN0cmluZywgZGVhZGxpbmVJc286IHN0cmluZywgaGlnaFN0YWtlczogYm9vbGVhbiwgcHJpb3JpdHk6IHN0cmluZywgaXNCb3NzOiBib29sZWFuKSB7XG4gICAgICAgIGlmICh0aGlzLm1lZGl0YXRpb25FbmdpbmUuaXNMb2NrZWREb3duKCkpIHsgbmV3IE5vdGljZShcIuKblCBMT0NLRE9XTiBBQ1RJVkVcIik7IHJldHVybjsgfVxuICAgICAgICBpZiAodGhpcy5pc1Jlc3RpbmcoKSAmJiBoaWdoU3Rha2VzKSB7IG5ldyBOb3RpY2UoXCJDYW5ub3QgZGVwbG95IEhpZ2ggU3Rha2VzIG9uIFJlc3QgRGF5LlwiKTsgcmV0dXJuOyB9IFxuXG4gICAgICAgIGxldCB4cFJld2FyZCA9IDA7IGxldCBnb2xkUmV3YXJkID0gMDsgbGV0IGRpZmZMYWJlbCA9IFwiXCI7XG4gICAgICAgIGlmIChpc0Jvc3MpIHsgXG4gICAgICAgICAgICB4cFJld2FyZCA9IDEwMDA7IFxuICAgICAgICAgICAgZ29sZFJld2FyZCA9IDEwMDA7IFxuICAgICAgICAgICAgZGlmZkxhYmVsID0gXCLimKDvuI8gQk9TU1wiOyBcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN3aXRjaChkaWZmKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAxOiB4cFJld2FyZCA9IE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy54cFJlcSAqIDAuMDUpOyBnb2xkUmV3YXJkID0gMTA7IGRpZmZMYWJlbCA9IFwiVHJpdmlhbFwiOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI6IHhwUmV3YXJkID0gTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLnhwUmVxICogMC4xMCk7IGdvbGRSZXdhcmQgPSAyMDsgZGlmZkxhYmVsID0gXCJFYXN5XCI7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzogeHBSZXdhcmQgPSBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3MueHBSZXEgKiAwLjIwKTsgZ29sZFJld2FyZCA9IDQwOyBkaWZmTGFiZWwgPSBcIk1lZGl1bVwiOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IHhwUmV3YXJkID0gTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLnhwUmVxICogMC40MCk7IGdvbGRSZXdhcmQgPSA4MDsgZGlmZkxhYmVsID0gXCJIYXJkXCI7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNTogeHBSZXdhcmQgPSBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3MueHBSZXEgKiAwLjYwKTsgZ29sZFJld2FyZCA9IDE1MDsgZGlmZkxhYmVsID0gXCJTVUlDSURFXCI7IGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChoaWdoU3Rha2VzICYmICFpc0Jvc3MpIHsgZ29sZFJld2FyZCA9IE1hdGguZmxvb3IoZ29sZFJld2FyZCAqIDEuNSk7IH1cbiAgICAgICAgbGV0IGRlYWRsaW5lU3RyID0gXCJOb25lXCI7IGxldCBkZWFkbGluZUZyb250bWF0dGVyID0gXCJcIjtcbiAgICAgICAgaWYgKGRlYWRsaW5lSXNvKSB7IGRlYWRsaW5lU3RyID0gbW9tZW50KGRlYWRsaW5lSXNvKS5mb3JtYXQoXCJZWVlZLU1NLUREIEhIOm1tXCIpOyBkZWFkbGluZUZyb250bWF0dGVyID0gYGRlYWRsaW5lOiAke2RlYWRsaW5lSXNvfWA7IH1cblxuICAgICAgICBjb25zdCByb290UGF0aCA9IFwiQWN0aXZlX1J1blwiOyBjb25zdCBxdWVzdHNQYXRoID0gXCJBY3RpdmVfUnVuL1F1ZXN0c1wiO1xuICAgICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChyb290UGF0aCkpIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihyb290UGF0aCk7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHF1ZXN0c1BhdGgpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIocXVlc3RzUGF0aCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBzYWZlTmFtZSA9IG5hbWUucmVwbGFjZSgvW15hLXowLTldL2dpLCAnXycpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGNvbnN0IGZpbGVuYW1lID0gYCR7cXVlc3RzUGF0aH0vJHtzYWZlTmFtZX0ubWRgO1xuICAgICAgICBjb25zdCBjb250ZW50ID0gYC0tLVxudHlwZTogcXVlc3RcbnN0YXR1czogYWN0aXZlXG5kaWZmaWN1bHR5OiAke2RpZmZMYWJlbH1cbnByaW9yaXR5OiAke3ByaW9yaXR5fVxueHBfcmV3YXJkOiAke3hwUmV3YXJkfVxuZ29sZF9yZXdhcmQ6ICR7Z29sZFJld2FyZH1cbnNraWxsOiAke3NraWxsfVxuc2Vjb25kYXJ5X3NraWxsOiAke3NlY1NraWxsfVxuaGlnaF9zdGFrZXM6ICR7aGlnaFN0YWtlc31cbmlzX2Jvc3M6ICR7aXNCb3NzfVxuY3JlYXRlZDogJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCl9XG4ke2RlYWRsaW5lRnJvbnRtYXR0ZXJ9XG4tLS1cbiMg4pqU77iPICR7bmFtZX1cbj4gWyFJTkZPXSBNaXNzaW9uXG4+ICoqUHJpOioqICR7cHJpb3JpdHl9IHwgKipEaWZmOioqICR7ZGlmZkxhYmVsfSB8ICoqRHVlOioqICR7ZGVhZGxpbmVTdHJ9XG4+ICoqUndkOioqICR7eHBSZXdhcmR9IFhQIHwgJHtnb2xkUmV3YXJkfSBHXG4+ICoqTmV1cmFsIExpbms6KiogJHtza2lsbH0gKyAke3NlY1NraWxsfVxuYDtcbiAgICAgICAgaWYgKHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChmaWxlbmFtZSkpIHsgbmV3IE5vdGljZShcIkV4aXN0cyFcIik7IHJldHVybjsgfVxuICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUoZmlsZW5hbWUsIGNvbnRlbnQpO1xuICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImNsaWNrXCIpOyBcbiAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgfVxuICAgIFxuICAgIC8vIC4uLiAocmVzdCBvZiBtZXRob2RzOiBkZWxldGVRdWVzdCwgY2hlY2tEZWFkbGluZXMsIHRyaWdnZXJEZWF0aCwgcm9sbENoYW9zLCBhdHRlbXB0UmVjb3ZlcnksIGlzTG9ja2VkRG93biwgaXNSZXN0aW5nLCBpc1NoaWVsZGVkLCB0YXVudCwgcGFyc2VRdWlja0lucHV0KVxuICAgIC8vIEZvciBicmV2aXR5LCB3ZSBhc3N1bWUgc3RhbmRhcmQgaW1wbGVtZW50YXRpb24gYmVsb3cuIEJ1dCBzaW5jZSB0aGlzIGlzIGEgXCJyZXdyaXRlXCIgc2NyaXB0LCBJIE1VU1QgaW5jbHVkZSB0aGVtIHRvIGF2b2lkIGJyZWFraW5nIHRoZSBmaWxlLlxuICAgIFxuICAgIGFzeW5jIGRlbGV0ZVF1ZXN0KGZpbGU6IFRGaWxlKSB7IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmRlbGV0ZShmaWxlKTsgbmV3IE5vdGljZShcIkRlcGxveW1lbnQgQWJvcnRlZCAoRGVsZXRlZClcIik7IHRoaXMuc2F2ZSgpOyB9XG5cbiAgICBhc3luYyBjaGVja0RlYWRsaW5lcygpIHtcbiAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiQWN0aXZlX1J1bi9RdWVzdHNcIik7XG4gICAgICAgIGlmICghKGZvbGRlciBpbnN0YW5jZW9mIFRGb2xkZXIpKSByZXR1cm47XG4gICAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBmb2xkZXIuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBmbSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcbiAgICAgICAgICAgICAgICBpZiAoZm0/LmRlYWRsaW5lICYmIG1vbWVudCgpLmlzQWZ0ZXIobW9tZW50KGZtLmRlYWRsaW5lKSkpIGF3YWl0IHRoaXMuZmFpbFF1ZXN0KGZpbGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIEJPU1MgUkVTUEFXTiBDSEVDSyAoQW50aS1DaGVlc2UpXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmxldmVsID49IDEwICYmIEJPU1NfREFUQVsxMF0gJiYgIXRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMuc29tZSgoYjphbnkpID0+IGIubGV2ZWwgPT09IDEwICYmIGIuZGVmZWF0ZWQpKSB7XG4gICAgICAgICAgICAgY29uc3QgZiA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChgQWN0aXZlX1J1bi9RdWVzdHMvQk9TU19MVkwxMCAtICR7Qk9TU19EQVRBWzEwXS5uYW1lfS5tZGApO1xuICAgICAgICAgICAgIGlmICghZikgeyBuZXcgTm90aWNlKFwiWW91IGNhbm5vdCBoaWRlIGZyb20gdGhlIEdhdGVrZWVwZXIuXCIpOyBhd2FpdCB0aGlzLnNwYXduQm9zcygxMCk7IH1cbiAgICAgICAgfVxuICAgICAgICAvLyAoU2NhbGVzIHRvIG90aGVyIGxldmVscyBpZiBuZWVkZWQsIHNpbXBsZSBjaGVjayBmb3IgTFZMIDEwIGZpcnN0KVxuXG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH1cblxuICAgIGFzeW5jIHRyaWdnZXJEZWF0aCgpIHtcbiAgICAgICAgdGhpcy5hdWRpby5wbGF5U291bmQoXCJkZWF0aFwiKTtcbiAgICAgICAgY29uc3QgZWFybmVkU291bHMgPSBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3MubGV2ZWwgKiAxMCArIHRoaXMuc2V0dGluZ3MuZ29sZCAvIDEwKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sZWdhY3kuc291bHMgKz0gZWFybmVkU291bHM7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MubGVnYWN5LmRlYXRoQ291bnQgPSAodGhpcy5zZXR0aW5ncy5sZWdhY3kuZGVhdGhDb3VudCB8fCAwKSArIDE7XG4gICAgICAgIG5ldyBOb3RpY2UoYPCfkoAgUlVOIEVOREVELmApO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmhwID0gMTAwOyB0aGlzLnNldHRpbmdzLm1heEhwID0gMTAwOyB0aGlzLnNldHRpbmdzLnhwID0gMDsgdGhpcy5zZXR0aW5ncy5nb2xkID0gMDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy54cFJlcSA9IDEwMDsgdGhpcy5zZXR0aW5ncy5sZXZlbCA9IDE7IHRoaXMuc2V0dGluZ3Mucml2YWxEbWcgPSAxMDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5za2lsbHMgPSBbXTsgdGhpcy5zZXR0aW5ncy5oaXN0b3J5ID0gW107IHRoaXMuc2V0dGluZ3MuZGFtYWdlVGFrZW5Ub2RheSA9IDA7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCA9IFwiXCI7IHRoaXMuc2V0dGluZ3Muc2hpZWxkZWRVbnRpbCA9IFwiXCI7IHRoaXMuc2V0dGluZ3MucmVzdERheVVudGlsID0gXCJcIjtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25zID0gW107IHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9uRGF0ZSA9IFwiXCI7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3RzQ29tcGxldGVkVG9kYXkgPSAwOyB0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5ID0ge307XG4gICAgICAgIGNvbnN0IGJhc2VTdGFydEdvbGQgPSB0aGlzLnNldHRpbmdzLmxlZ2FjeS5wZXJrcy5zdGFydEdvbGQgfHwgMDtcbiAgICAgICAgY29uc3Qgc2NhclBlbmFsdHkgPSBNYXRoLnBvdygwLjksIHRoaXMuc2V0dGluZ3MubGVnYWN5LmRlYXRoQ291bnQpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmdvbGQgPSBNYXRoLmZsb29yKGJhc2VTdGFydEdvbGQgKiBzY2FyUGVuYWx0eSk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucnVuQ291bnQrKztcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgcm9sbENoYW9zKHNob3dNb2RhbDogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgICAgIGNvbnN0IHJvbGwgPSBNYXRoLnJhbmRvbSgpO1xuICAgICAgICBpZiAocm9sbCA8IDAuNCkgdGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyID0gREVGQVVMVF9NT0RJRklFUjtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBpZHggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoQ0hBT1NfVEFCTEUubGVuZ3RoIC0gMSkpICsgMTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZGFpbHlNb2RpZmllciA9IENIQU9TX1RBQkxFW2lkeF07XG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyLm5hbWUgPT09IFwiUml2YWwgU2Fib3RhZ2VcIiAmJiB0aGlzLnNldHRpbmdzLmdvbGQgPiAxMCkgdGhpcy5zZXR0aW5ncy5nb2xkID0gTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLmdvbGQgKiAwLjkpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgICAgICBpZiAoc2hvd01vZGFsKSBuZXcgQ2hhb3NNb2RhbCh0aGlzLmFwcCwgdGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyKS5vcGVuKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgYXR0ZW1wdFJlY292ZXJ5KCkge1xuICAgICAgICBpZiAoIXRoaXMubWVkaXRhdGlvbkVuZ2luZS5pc0xvY2tlZERvd24oKSkgeyBuZXcgTm90aWNlKFwiTm90IGluIExvY2tkb3duLlwiKTsgcmV0dXJuOyB9XG4gICAgICAgIGNvbnN0IHsgaG91cnMsIG1pbnV0ZXMgfSA9IHRoaXMubWVkaXRhdGlvbkVuZ2luZS5nZXRMb2NrZG93blRpbWVSZW1haW5pbmcoKTtcbiAgICAgICAgbmV3IE5vdGljZShgUmVjb3ZlcmluZy4uLiAke2hvdXJzfWggJHttaW51dGVzfW0gcmVtYWluaW5nLmApO1xuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBpc0xvY2tlZERvd24oKSB7IHJldHVybiB0aGlzLm1lZGl0YXRpb25FbmdpbmUuaXNMb2NrZWREb3duKCk7IH1cbiAgICBpc1Jlc3RpbmcoKSB7IHJldHVybiB0aGlzLnNldHRpbmdzLnJlc3REYXlVbnRpbCAmJiBtb21lbnQoKS5pc0JlZm9yZShtb21lbnQodGhpcy5zZXR0aW5ncy5yZXN0RGF5VW50aWwpKTsgfVxuICAgIGlzU2hpZWxkZWQoKSB7IHJldHVybiB0aGlzLnNldHRpbmdzLnNoaWVsZGVkVW50aWwgJiYgbW9tZW50KCkuaXNCZWZvcmUobW9tZW50KHRoaXMuc2V0dGluZ3Muc2hpZWxkZWRVbnRpbCkpOyB9XG5cbiAgICB0YXVudCh0cmlnZ2VyOiBcImZhaWxcInxcInNoaWVsZFwifFwibG93X2hwXCJ8XCJsZXZlbF91cFwifFwibG9ja2Rvd25cIikge1xuICAgICAgICBpZiAoTWF0aC5yYW5kb20oKSA8IDAuMikgcmV0dXJuOyBcbiAgICAgICAgY29uc3QgaW5zdWx0cyA9IHtcbiAgICAgICAgICAgIFwiZmFpbFwiOiBbXCJGb2N1cy5cIiwgXCJBZ2Fpbi5cIiwgXCJTdGF5IHNoYXJwLlwiXSxcbiAgICAgICAgICAgIFwic2hpZWxkXCI6IFtcIlNtYXJ0IG1vdmUuXCIsIFwiQm91Z2h0IHNvbWUgdGltZS5cIl0sXG4gICAgICAgICAgICBcImxvd19ocFwiOiBbXCJDcml0aWNhbCBjb25kaXRpb24uXCIsIFwiU3Vydml2ZS5cIl0sXG4gICAgICAgICAgICBcImxldmVsX3VwXCI6IFtcIlN0cm9uZ2VyLlwiLCBcIlNjYWxpbmcgdXAuXCJdLFxuICAgICAgICAgICAgXCJsb2NrZG93blwiOiBbXCJPdmVyaGVhdGVkLiBDb29saW5nIGRvd24uXCIsIFwiRm9yY2VkIHJlc3QuXCJdXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IG1zZyA9IGluc3VsdHNbdHJpZ2dlcl1bTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogaW5zdWx0c1t0cmlnZ2VyXS5sZW5ndGgpXTtcbiAgICAgICAgbmV3IE5vdGljZShgU1lTVEVNOiBcIiR7bXNnfVwiYCwgNjAwMCk7XG4gICAgfVxuICAgIFxuICAgIHBhcnNlUXVpY2tJbnB1dCh0ZXh0OiBzdHJpbmcpIHtcbiAgICAgICAgaWYgKHRoaXMubWVkaXRhdGlvbkVuZ2luZS5pc0xvY2tlZERvd24oKSkgeyBuZXcgTm90aWNlKFwi4puUIExPQ0tET1dOIEFDVElWRVwiKTsgcmV0dXJuOyB9XG4gICAgICAgIGxldCBkaWZmID0gMzsgbGV0IGNsZWFuVGV4dCA9IHRleHQ7XG4gICAgICAgIGlmICh0ZXh0Lm1hdGNoKC9cXC8xLykpIHsgZGlmZiA9IDE7IGNsZWFuVGV4dCA9IHRleHQucmVwbGFjZSgvXFwvMS8sIFwiXCIpLnRyaW0oKTsgfVxuICAgICAgICBlbHNlIGlmICh0ZXh0Lm1hdGNoKC9cXC8yLykpIHsgZGlmZiA9IDI7IGNsZWFuVGV4dCA9IHRleHQucmVwbGFjZSgvXFwvMi8sIFwiXCIpLnRyaW0oKTsgfVxuICAgICAgICBlbHNlIGlmICh0ZXh0Lm1hdGNoKC9cXC8zLykpIHsgZGlmZiA9IDM7IGNsZWFuVGV4dCA9IHRleHQucmVwbGFjZSgvXFwvMy8sIFwiXCIpLnRyaW0oKTsgfVxuICAgICAgICBlbHNlIGlmICh0ZXh0Lm1hdGNoKC9cXC80LykpIHsgZGlmZiA9IDQ7IGNsZWFuVGV4dCA9IHRleHQucmVwbGFjZSgvXFwvNC8sIFwiXCIpLnRyaW0oKTsgfVxuICAgICAgICBlbHNlIGlmICh0ZXh0Lm1hdGNoKC9cXC81LykpIHsgZGlmZiA9IDU7IGNsZWFuVGV4dCA9IHRleHQucmVwbGFjZSgvXFwvNS8sIFwiXCIpLnRyaW0oKTsgfVxuICAgICAgICBjb25zdCBkZWFkbGluZSA9IG1vbWVudCgpLmFkZCgyNCwgJ2hvdXJzJykudG9JU09TdHJpbmcoKTtcbiAgICAgICAgdGhpcy5jcmVhdGVRdWVzdChjbGVhblRleHQsIGRpZmYsIFwiTm9uZVwiLCBcIk5vbmVcIiwgZGVhZGxpbmUsIGZhbHNlLCBcIk5vcm1hbFwiLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgLy8gREVMRUdBVEVEIE1FVEhPRFNcbiAgICBhc3luYyBjcmVhdGVSZXNlYXJjaFF1ZXN0KHRpdGxlOiBzdHJpbmcsIHR5cGU6IFwic3VydmV5XCIgfCBcImRlZXBfZGl2ZVwiLCBsaW5rZWRTa2lsbDogc3RyaW5nLCBsaW5rZWRDb21iYXRRdWVzdDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMucmVzZWFyY2hFbmdpbmUuY3JlYXRlUmVzZWFyY2hRdWVzdCh0aXRsZSwgdHlwZSwgbGlua2VkU2tpbGwsIGxpbmtlZENvbWJhdFF1ZXN0KTtcbiAgICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgeyBuZXcgTm90aWNlKHJlc3VsdC5tZXNzYWdlKTsgcmV0dXJuOyB9XG4gICAgICAgIG5ldyBOb3RpY2UocmVzdWx0Lm1lc3NhZ2UpO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBhc3luYyBjb21wbGV0ZVJlc2VhcmNoUXVlc3QocXVlc3RJZDogc3RyaW5nLCBmaW5hbFdvcmRDb3VudDogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMucmVzZWFyY2hFbmdpbmUuY29tcGxldGVSZXNlYXJjaFF1ZXN0KHF1ZXN0SWQsIGZpbmFsV29yZENvdW50KTtcbiAgICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgeyBuZXcgTm90aWNlKHJlc3VsdC5tZXNzYWdlKTsgcmV0dXJuOyB9XG4gICAgICAgIG5ldyBOb3RpY2UocmVzdWx0Lm1lc3NhZ2UpO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBkZWxldGVSZXNlYXJjaFF1ZXN0KHF1ZXN0SWQ6IHN0cmluZykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLnJlc2VhcmNoRW5naW5lLmRlbGV0ZVJlc2VhcmNoUXVlc3QocXVlc3RJZCk7XG4gICAgICAgIG5ldyBOb3RpY2UocmVzdWx0Lm1lc3NhZ2UpO1xuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICB1cGRhdGVSZXNlYXJjaFdvcmRDb3VudChxdWVzdElkOiBzdHJpbmcsIG5ld1dvcmRDb3VudDogbnVtYmVyKSB7IHRoaXMucmVzZWFyY2hFbmdpbmUudXBkYXRlUmVzZWFyY2hXb3JkQ291bnQocXVlc3RJZCwgbmV3V29yZENvdW50KTsgdGhpcy5zYXZlKCk7IH1cbiAgICBnZXRSZXNlYXJjaFJhdGlvKCkgeyByZXR1cm4gdGhpcy5yZXNlYXJjaEVuZ2luZS5nZXRSZXNlYXJjaFJhdGlvKCk7IH1cbiAgICBjYW5DcmVhdGVSZXNlYXJjaFF1ZXN0KCkgeyByZXR1cm4gdGhpcy5yZXNlYXJjaEVuZ2luZS5jYW5DcmVhdGVSZXNlYXJjaFF1ZXN0KCk7IH1cblxuICAgIGFzeW5jIHN0YXJ0TWVkaXRhdGlvbigpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5tZWRpdGF0aW9uRW5naW5lLm1lZGl0YXRlKCk7XG4gICAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MgJiYgcmVzdWx0Lm1lc3NhZ2UpIHsgbmV3IE5vdGljZShyZXN1bHQubWVzc2FnZSk7IHJldHVybjsgfVxuICAgICAgICBuZXcgTm90aWNlKHJlc3VsdC5tZXNzYWdlKTtcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlKCk7XG4gICAgfVxuICAgIFxuICAgIGdldE1lZGl0YXRpb25TdGF0dXMoKSB7IHJldHVybiB0aGlzLm1lZGl0YXRpb25FbmdpbmUuZ2V0TWVkaXRhdGlvblN0YXR1cygpOyB9XG4gICAgY2FuRGVsZXRlUXVlc3QoKSB7IHJldHVybiB0aGlzLm1lZGl0YXRpb25FbmdpbmUuY2FuRGVsZXRlUXVlc3RGcmVlKCk7IH1cbiAgICBhc3luYyBkZWxldGVRdWVzdFdpdGhDb3N0KGZpbGU6IFRGaWxlKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMubWVkaXRhdGlvbkVuZ2luZS5hcHBseURlbGV0aW9uQ29zdCgpO1xuICAgICAgICBuZXcgTm90aWNlKHJlc3VsdC5tZXNzYWdlKTtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuZGVsZXRlKGZpbGUpO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBhc3luYyBjcmVhdGVRdWVzdENoYWluKG5hbWU6IHN0cmluZywgcXVlc3ROYW1lczogc3RyaW5nW10pIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5jaGFpbnNFbmdpbmUuY3JlYXRlUXVlc3RDaGFpbihuYW1lLCBxdWVzdE5hbWVzKTtcbiAgICAgICAgaWYgKHJlc3VsdC5zdWNjZXNzKSB7IG5ldyBOb3RpY2UocmVzdWx0Lm1lc3NhZ2UpOyBhd2FpdCB0aGlzLnNhdmUoKTsgcmV0dXJuIHRydWU7IH1cbiAgICAgICAgZWxzZSB7IG5ldyBOb3RpY2UocmVzdWx0Lm1lc3NhZ2UpOyByZXR1cm4gZmFsc2U7IH1cbiAgICB9XG4gICAgXG4gICAgZ2V0QWN0aXZlQ2hhaW4oKSB7IHJldHVybiB0aGlzLmNoYWluc0VuZ2luZS5nZXRBY3RpdmVDaGFpbigpOyB9XG4gICAgZ2V0Q2hhaW5Qcm9ncmVzcygpIHsgcmV0dXJuIHRoaXMuY2hhaW5zRW5naW5lLmdldENoYWluUHJvZ3Jlc3MoKTsgfVxuICAgIGFzeW5jIGJyZWFrQ2hhaW4oKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuY2hhaW5zRW5naW5lLmJyZWFrQ2hhaW4oKTtcbiAgICAgICAgbmV3IE5vdGljZShyZXN1bHQubWVzc2FnZSk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgIH1cblxuICAgIHNldFF1ZXN0RmlsdGVyKHF1ZXN0RmlsZTogVEZpbGUsIGVuZXJneTogYW55LCBjb250ZXh0OiBhbnksIHRhZ3M6IHN0cmluZ1tdKSB7XG4gICAgICAgIHRoaXMuZmlsdGVyc0VuZ2luZS5zZXRRdWVzdEZpbHRlcihxdWVzdEZpbGUuYmFzZW5hbWUsIGVuZXJneSwgY29udGV4dCwgdGFncyk7XG4gICAgICAgIG5ldyBOb3RpY2UoYFF1ZXN0IHRhZ2dlZDogJHtlbmVyZ3l9IGVuZXJneSwgJHtjb250ZXh0fSBjb250ZXh0YCk7XG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH1cbiAgICBzZXRGaWx0ZXJTdGF0ZShlbmVyZ3k6IGFueSwgY29udGV4dDogYW55LCB0YWdzOiBzdHJpbmdbXSkge1xuICAgICAgICB0aGlzLmZpbHRlcnNFbmdpbmUuc2V0RmlsdGVyU3RhdGUoZW5lcmd5LCBjb250ZXh0LCB0YWdzKTtcbiAgICAgICAgbmV3IE5vdGljZShgRmlsdGVycyBzZXQ6ICR7ZW5lcmd5fSBlbmVyZ3ksICR7Y29udGV4dH0gY29udGV4dGApO1xuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG4gICAgY2xlYXJGaWx0ZXJzKCkgeyB0aGlzLmZpbHRlcnNFbmdpbmUuY2xlYXJGaWx0ZXJzKCk7IG5ldyBOb3RpY2UoXCJBbGwgZmlsdGVycyBjbGVhcmVkXCIpOyB0aGlzLnNhdmUoKTsgfVxuICAgIGdldEZpbHRlcmVkUXVlc3RzKHF1ZXN0czogYW55W10pIHsgcmV0dXJuIHRoaXMuZmlsdGVyc0VuZ2luZS5maWx0ZXJRdWVzdHMocXVlc3RzKTsgfVxuXG4gICAgZ2V0R2FtZVN0YXRzKCkgeyByZXR1cm4gdGhpcy5hbmFseXRpY3NFbmdpbmUuZ2V0R2FtZVN0YXRzKCk7IH1cbiAgICBjaGVja0Jvc3NNaWxlc3RvbmVzKCkgeyBcbiAgICAgICAgY29uc3QgbXNncyA9IHRoaXMuYW5hbHl0aWNzRW5naW5lLmNoZWNrQm9zc01pbGVzdG9uZXMoKTtcbiAgICAgICAgbXNncy5mb3JFYWNoKG0gPT4gbmV3IE5vdGljZShtKSk7XG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH1cbiAgICBnZW5lcmF0ZVdlZWtseVJlcG9ydCgpIHsgcmV0dXJuIHRoaXMuYW5hbHl0aWNzRW5naW5lLmdlbmVyYXRlV2Vla2x5UmVwb3J0KCk7IH1cbn1cbiIsImltcG9ydCB7IEl0ZW1WaWV3LCBXb3Jrc3BhY2VMZWFmLCBURmlsZSwgVEZvbGRlciwgbW9tZW50IH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IFNpc3lwaHVzUGx1Z2luIGZyb20gJy4uL21haW4nO1xuaW1wb3J0IHsgUXVlc3RNb2RhbCwgU2hvcE1vZGFsLCBTa2lsbERldGFpbE1vZGFsLCBTa2lsbE1hbmFnZXJNb2RhbCB9IGZyb20gJy4vbW9kYWxzJztcbmltcG9ydCB7IFNraWxsLCBEYWlseU1pc3Npb24gfSBmcm9tICcuLi90eXBlcyc7XG5cbmV4cG9ydCBjb25zdCBWSUVXX1RZUEVfUEFOT1BUSUNPTiA9IFwic2lzeXBodXMtcGFub3B0aWNvblwiO1xuXG5leHBvcnQgY2xhc3MgUGFub3B0aWNvblZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjtcblxuICAgIGNvbnN0cnVjdG9yKGxlYWY6IFdvcmtzcGFjZUxlYWYsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHtcbiAgICAgICAgc3VwZXIobGVhZik7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgIH1cblxuICAgIGdldFZpZXdUeXBlKCkgeyByZXR1cm4gVklFV19UWVBFX1BBTk9QVElDT047IH1cbiAgICBnZXREaXNwbGF5VGV4dCgpIHsgcmV0dXJuIFwiRXllIFNpc3lwaHVzXCI7IH1cbiAgICBnZXRJY29uKCkgeyByZXR1cm4gXCJza3VsbFwiOyB9XG5cbiAgICBhc3luYyBvbk9wZW4oKSB7IFxuICAgICAgICB0aGlzLnJlZnJlc2goKTsgXG4gICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5vbigndXBkYXRlJywgdGhpcy5yZWZyZXNoLmJpbmQodGhpcykpOyBcbiAgICB9XG5cbiAgICBhc3luYyByZWZyZXNoKCkge1xuICAgICAgICBjb25zdCBjID0gdGhpcy5jb250ZW50RWw7IGMuZW1wdHkoKTtcbiAgICAgICAgY29uc3QgY29udGFpbmVyID0gYy5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jb250YWluZXJcIiB9KTtcbiAgICAgICAgY29uc3Qgc2Nyb2xsID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXNjcm9sbC1hcmVhXCIgfSk7XG5cbiAgICAgICAgLy8gLS0tIDEuIEhFQURFUiAmIENSSVRJQ0FMIEFMRVJUUyAtLS1cbiAgICAgICAgc2Nyb2xsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIkV5ZSBTSVNZUEhVUyBPU1wiLCBjbHM6IFwic2lzeS1oZWFkZXJcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmKHRoaXMucGx1Z2luLmVuZ2luZS5pc0xvY2tlZERvd24oKSkge1xuICAgICAgICAgICAgY29uc3QgbCA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1hbGVydCBzaXN5LWFsZXJ0LWxvY2tkb3duXCIgfSk7XG4gICAgICAgICAgICBsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkxPQ0tET1dOIEFDVElWRVwiIH0pO1xuICAgICAgICAgICAgY29uc3QgeyBob3VycywgbWludXRlczogbWlucyB9ID0gdGhpcy5wbHVnaW4uZW5naW5lLm1lZGl0YXRpb25FbmdpbmUuZ2V0TG9ja2Rvd25UaW1lUmVtYWluaW5nKCk7XG4gICAgICAgICAgICBsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBUaW1lIFJlbWFpbmluZzogJHtob3Vyc31oICR7bWluc31tYCB9KTtcbiAgICAgICAgICAgIGNvbnN0IGJ0biA9IGwuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkFUVEVNUFQgUkVDT1ZFUllcIiB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgbWVkU3RhdHVzID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldE1lZGl0YXRpb25TdGF0dXMoKTtcbiAgICAgICAgICAgIGNvbnN0IG1lZERpdiA9IGwuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICBtZWREaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW4tdG9wOiAxMHB4OyBwYWRkaW5nOiAxMHB4OyBiYWNrZ3JvdW5kOiByZ2JhKDE3MCwgMTAwLCAyNTUsIDAuMSk7IGJvcmRlci1yYWRpdXM6IDRweDtcIik7XG4gICAgICAgICAgICBtZWREaXYuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYE1lZGl0YXRpb246ICR7bWVkU3RhdHVzLmN5Y2xlc0RvbmV9LzEwICgke21lZFN0YXR1cy5jeWNsZXNSZW1haW5pbmd9IGxlZnQpYCB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgbWVkQmFyID0gbWVkRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgbWVkQmFyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiaGVpZ2h0OiA2cHg7IGJhY2tncm91bmQ6IHJnYmEoMjU1LDI1NSwyNTUsMC4xKTsgYm9yZGVyLXJhZGl1czogM3B4OyBtYXJnaW46IDVweCAwOyBvdmVyZmxvdzogaGlkZGVuO1wiKTtcbiAgICAgICAgICAgIGNvbnN0IG1lZEZpbGwgPSBtZWRCYXIuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICBjb25zdCBtZWRQZXJjZW50ID0gKG1lZFN0YXR1cy5jeWNsZXNEb25lIC8gMTApICogMTAwO1xuICAgICAgICAgICAgbWVkRmlsbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgd2lkdGg6ICR7bWVkUGVyY2VudH0lOyBoZWlnaHQ6IDEwMCU7IGJhY2tncm91bmQ6ICNhYTY0ZmY7IHRyYW5zaXRpb246IHdpZHRoIDAuM3M7YCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IG1lZEJ0biA9IG1lZERpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiTUVESVRBVEVcIiB9KTtcbiAgICAgICAgICAgIG1lZEJ0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIndpZHRoOiAxMDAlOyBwYWRkaW5nOiA4cHg7IG1hcmdpbi10b3A6IDVweDsgYmFja2dyb3VuZDogcmdiYSgxNzAsIDEwMCwgMjU1LCAwLjMpOyBib3JkZXI6IDFweCBzb2xpZCAjYWE2NGZmOyBjb2xvcjogI2FhNjRmZjsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtd2VpZ2h0OiBib2xkO1wiKTtcbiAgICAgICAgICAgIG1lZEJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5zdGFydE1lZGl0YXRpb24oKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMucmVmcmVzaCgpLCAxMDApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGJ0bi5hZGRDbGFzcyhcInNpc3ktYnRuXCIpO1xuICAgICAgICAgICAgYnRuLm9uY2xpY2sgPSAoKSA9PiB0aGlzLnBsdWdpbi5lbmdpbmUuYXR0ZW1wdFJlY292ZXJ5KCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYodGhpcy5wbHVnaW4uZW5naW5lLmlzUmVzdGluZygpKSB7XG4gICAgICAgICAgICAgY29uc3QgciA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1hbGVydCBzaXN5LWFsZXJ0LXJlc3RcIiB9KTtcbiAgICAgICAgICAgICByLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlJFU1QgREFZIEFDVElWRVwiIH0pO1xuICAgICAgICAgICAgIGNvbnN0IHRpbWVSZW1haW5pbmcgPSBtb21lbnQodGhpcy5wbHVnaW4uc2V0dGluZ3MucmVzdERheVVudGlsKS5kaWZmKG1vbWVudCgpLCAnbWludXRlcycpO1xuICAgICAgICAgICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcih0aW1lUmVtYWluaW5nIC8gNjApO1xuICAgICAgICAgICAgIGNvbnN0IG1pbnMgPSB0aW1lUmVtYWluaW5nICUgNjA7XG4gICAgICAgICAgICAgci5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgJHtob3Vyc31oICR7bWluc31tIHJlbWFpbmluZyB8IE5vIGRhbWFnZSwgUnVzdCBwYXVzZWRgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gLS0tIDIuIEhVRCBHUklEICgyeDIpIC0tLVxuICAgICAgICBjb25zdCBodWQgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktaHVkXCIgfSk7XG4gICAgICAgIHRoaXMuc3RhdChodWQsIFwiSEVBTFRIXCIsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmhwfS8ke3RoaXMucGx1Z2luLnNldHRpbmdzLm1heEhwfWAsIHRoaXMucGx1Z2luLnNldHRpbmdzLmhwIDwgMzAgPyBcInNpc3ktY3JpdGljYWxcIiA6IFwiXCIpO1xuICAgICAgICB0aGlzLnN0YXQoaHVkLCBcIkdPTERcIiwgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZH1gLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIDwgMCA/IFwic2lzeS12YWwtZGVidFwiIDogXCJcIik7XG4gICAgICAgIHRoaXMuc3RhdChodWQsIFwiTEVWRUxcIiwgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MubGV2ZWx9YCk7XG4gICAgICAgIHRoaXMuc3RhdChodWQsIFwiUklWQUwgRE1HXCIsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLnJpdmFsRG1nfWApO1xuXG4gICAgICAgIC8vIC0tLSAzLiBUSEUgT1JBQ0xFIC0tLVxuICAgICAgICBjb25zdCBvcmFjbGUgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktb3JhY2xlXCIgfSk7XG4gICAgICAgIG9yYWNsZS5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogXCJPUkFDTEUgUFJFRElDVElPTlwiIH0pO1xuICAgICAgICBjb25zdCBzdXJ2aXZhbCA9IE1hdGguZmxvb3IodGhpcy5wbHVnaW4uc2V0dGluZ3MuaHAgLyAodGhpcy5wbHVnaW4uc2V0dGluZ3Mucml2YWxEbWcgKiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZCA8IDAgPyAyIDogMSkpKTtcbiAgICAgICAgXG4gICAgICAgIGxldCBzdXJ2VGV4dCA9IGBTdXJ2aXZhbDogJHtzdXJ2aXZhbH0gZGF5c2A7XG4gICAgICAgIGNvbnN0IGlzQ3Jpc2lzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuaHAgPCAzMCB8fCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIDwgMDtcbiAgICAgICAgXG4gICAgICAgIC8vIEdsaXRjaCBMb2dpY1xuICAgICAgICBpZiAoaXNDcmlzaXMgJiYgTWF0aC5yYW5kb20oKSA8IDAuMykge1xuICAgICAgICAgICAgY29uc3QgZ2xpdGNoZXMgPSBbXCJbQ09SUlVQVEVEXVwiLCBcIj8/PyBEQVlTIExFRlRcIiwgXCJOTyBGVVRVUkVcIiwgXCJSVU5cIl07XG4gICAgICAgICAgICBzdXJ2VGV4dCA9IGdsaXRjaGVzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGdsaXRjaGVzLmxlbmd0aCldO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3VydkVsID0gb3JhY2xlLmNyZWF0ZURpdih7IHRleHQ6IHN1cnZUZXh0IH0pO1xuICAgICAgICBpZiAoc3Vydml2YWwgPCAyIHx8IHN1cnZUZXh0LmluY2x1ZGVzKFwiPz8/XCIpIHx8IHN1cnZUZXh0LmluY2x1ZGVzKFwiQ09SUlVQVEVEXCIpKSB7XG4gICAgICAgICAgICAgc3VydkVsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiY29sb3I6I2ZmNTU1NTsgZm9udC13ZWlnaHQ6Ym9sZDsgbGV0dGVyLXNwYWNpbmc6IDFweDtcIik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGxpZ2h0cyA9IG9yYWNsZS5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1zdGF0dXMtbGlnaHRzXCIgfSk7XG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIDwgMCkgbGlnaHRzLmNyZWF0ZURpdih7IHRleHQ6IFwiREVCVDogWUVTXCIsIGNsczogXCJzaXN5LWxpZ2h0LWFjdGl2ZVwiIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRExDIDE6IFNjYXJzIGRpc3BsYXlcbiAgICAgICAgY29uc3Qgc2NhckNvdW50ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MubGVnYWN5Py5kZWF0aENvdW50IHx8IDA7XG4gICAgICAgIGlmIChzY2FyQ291bnQgPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzY2FyRWwgPSBvcmFjbGUuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktc2Nhci1kaXNwbGF5XCIgfSk7XG4gICAgICAgICAgICBzY2FyRWwuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogYFNjYXJzOiAke3NjYXJDb3VudH1gIH0pO1xuICAgICAgICAgICAgY29uc3QgcGVuYWx0eSA9IE1hdGgucG93KDAuOSwgc2NhckNvdW50KTtcbiAgICAgICAgICAgIGNvbnN0IHBlcmNlbnRMb3N0ID0gTWF0aC5mbG9vcigoMSAtIHBlbmFsdHkpICogMTAwKTtcbiAgICAgICAgICAgIHNjYXJFbC5jcmVhdGVFbChcInNtYWxsXCIsIHsgdGV4dDogYCgtJHtwZXJjZW50TG9zdH0lIHN0YXJ0aW5nIGdvbGQpYCB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRExDIDE6IE5leHQgbWlsZXN0b25lXG4gICAgICAgIGNvbnN0IGxldmVsTWlsZXN0b25lcyA9IFsxMCwgMjAsIDMwLCA1MF07XG4gICAgICAgIGNvbnN0IG5leHRNaWxlc3RvbmUgPSBsZXZlbE1pbGVzdG9uZXMuZmluZChtID0+IG0gPiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sZXZlbCk7XG4gICAgICAgIGlmIChuZXh0TWlsZXN0b25lKSB7XG4gICAgICAgICAgICBjb25zdCBtaWxlc3RvbmVFbCA9IG9yYWNsZS5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1taWxlc3RvbmVcIiB9KTtcbiAgICAgICAgICAgIG1pbGVzdG9uZUVsLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IGBOZXh0IE1pbGVzdG9uZTogTGV2ZWwgJHtuZXh0TWlsZXN0b25lfWAgfSk7XG4gICAgICAgICAgICBpZiAobmV4dE1pbGVzdG9uZSA9PT0gMTAgfHwgbmV4dE1pbGVzdG9uZSA9PT0gMjAgfHwgbmV4dE1pbGVzdG9uZSA9PT0gMzAgfHwgbmV4dE1pbGVzdG9uZSA9PT0gNTApIHtcbiAgICAgICAgICAgICAgICBtaWxlc3RvbmVFbC5jcmVhdGVFbChcInNtYWxsXCIsIHsgdGV4dDogXCIoQm9zcyBVbmxvY2spXCIgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyAtLS0gNC4gREFJTFkgTUlTU0lPTlMgKERMQyAxKSAtLS1cbiAgICAgICAgc2Nyb2xsLmNyZWF0ZURpdih7IHRleHQ6IFwiVE9EQVlTIE9CSkVDVElWRVNcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICB0aGlzLnJlbmRlckRhaWx5TWlzc2lvbnMoc2Nyb2xsKTtcblxuICAgICAgICAvLyAtLS0gNS4gQ09OVFJPTFMgLS0tXG4gICAgICAgIGNvbnN0IGN0cmxzID0gc2Nyb2xsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNvbnRyb2xzXCIgfSk7XG4gICAgICAgIGN0cmxzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJERVBMT1lcIiwgY2xzOiBcInNpc3ktYnRuIG1vZC1jdGFcIiB9KS5vbmNsaWNrID0gKCkgPT4gbmV3IFF1ZXN0TW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luKS5vcGVuKCk7XG4gICAgICAgIGN0cmxzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJTSE9QXCIsIGNsczogXCJzaXN5LWJ0blwiIH0pLm9uY2xpY2sgPSAoKSA9PiBuZXcgU2hvcE1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpO1xuICAgICAgICBjdHJscy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiRk9DVVNcIiwgY2xzOiBcInNpc3ktYnRuXCIgfSkub25jbGljayA9ICgpID0+IHRoaXMucGx1Z2luLmF1ZGlvLnRvZ2dsZUJyb3duTm9pc2UoKTtcblxuICAgICAgICAvLyAtLS0gNi4gQUNUSVZFIFRIUkVBVFMgLS0tXG4gICAgICAgIC8vIC0tLSBETEMgNTogQ09OVEVYVCBGSUxURVJTIC0tLVxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJGSUxURVIgQ09OVFJPTFNcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICB0aGlzLnJlbmRlckZpbHRlckJhcihzY3JvbGwpO1xuXG4gICAgICAgIC8vIC0tLSBETEMgNDogUVVFU1QgQ0hBSU5TIC0tLVxuICAgICAgICBjb25zdCBhY3RpdmVDaGFpbiA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRBY3RpdmVDaGFpbigpO1xuICAgICAgICBpZiAoYWN0aXZlQ2hhaW4pIHtcbiAgICAgICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIkFDVElWRSBDSEFJTlwiLCBjbHM6IFwic2lzeS1zZWN0aW9uLXRpdGxlXCIgfSk7XG4gICAgICAgICAgICB0aGlzLnJlbmRlckNoYWluU2VjdGlvbihzY3JvbGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gLS0tIERMQyAyOiBSRVNFQVJDSCBMSUJSQVJZIC0tLVxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJSRVNFQVJDSCBMSUJSQVJZXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgdGhpcy5yZW5kZXJSZXNlYXJjaFNlY3Rpb24oc2Nyb2xsKTtcblxuICAgICAgICAvLyAtLS0gRExDIDY6IEFOQUxZVElDUyAmIEVOREdBTUUgLS0tXG4gICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIkFOQUxZVElDUyAmIFBST0dSRVNTXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgdGhpcy5yZW5kZXJBbmFseXRpY3Moc2Nyb2xsKTtcblxuICAgICAgICAvLyAtLS0gQUNUSVZFIFRIUkVBVFMgLS0tXG4gICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIkFDVElWRSBUSFJFQVRTXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgYXdhaXQgdGhpcy5yZW5kZXJRdWVzdHMoc2Nyb2xsKTtcblxuICAgICAgICAgICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIk5FVVJBTCBIVUJcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2tpbGxzLmZvckVhY2goKHM6IFNraWxsLCBpZHg6IG51bWJlcikgPT4ge1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gc2Nyb2xsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXNraWxsLXJvd1wiIH0pO1xuICAgICAgICAgICAgcm93Lm9uY2xpY2sgPSAoKSA9PiBuZXcgU2tpbGxEZXRhaWxNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4sIGlkeCkub3BlbigpO1xuICAgICAgICAgICAgY29uc3QgbWV0YSA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1za2lsbC1tZXRhXCIgfSk7XG4gICAgICAgICAgICBtZXRhLmNyZWF0ZVNwYW4oeyB0ZXh0OiBzLm5hbWUgfSk7XG4gICAgICAgICAgICBtZXRhLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgTHZsICR7cy5sZXZlbH1gIH0pO1xuICAgICAgICAgICAgaWYgKHMucnVzdCA+IDApIHtcbiAgICAgICAgICAgICAgICBtZXRhLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgUlVTVCAke3MucnVzdH1gLCBjbHM6IFwic2lzeS1ydXN0LWJhZGdlXCIgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBiYXIgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYmFyLWJnXCIgfSk7XG4gICAgICAgICAgICBjb25zdCBmaWxsID0gYmFyLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJhci1maWxsXCIgfSk7XG4gICAgICAgICAgICBmaWxsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIGB3aWR0aDogJHsocy54cC9zLnhwUmVxKSoxMDB9JTsgYmFja2dyb3VuZDogJHtzLnJ1c3QgPiAwID8gJyNkMzU0MDAnIDogJyMwMGIwZmYnfWApO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGFkZEJ0biA9IHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIisgQWRkIE5ldXJhbCBOb2RlXCIsIGNsczogXCJzaXN5LWFkZC1za2lsbFwiIH0pO1xuICAgICAgICBhZGRCdG4ub25jbGljayA9ICgpID0+IG5ldyBTa2lsbE1hbmFnZXJNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4pLm9wZW4oKTtcblxuICAgICAgICAvLyAtLS0gOC4gUVVJQ0sgQ0FQVFVSRSAtLS1cbiAgICAgICAgY29uc3QgZm9vdGVyID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXF1aWNrLWNhcHR1cmVcIiB9KTtcbiAgICAgICAgY29uc3QgaW5wdXQgPSBmb290ZXIuY3JlYXRlRWwoXCJpbnB1dFwiLCB7IGNsczogXCJzaXN5LXF1aWNrLWlucHV0XCIsIHBsYWNlaG9sZGVyOiBcIk1pc3Npb24gLzEuLi41XCIgfSk7XG4gICAgICAgIGlucHV0Lm9ua2V5ZG93biA9IGFzeW5jIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXkgPT09ICdFbnRlcicgJiYgaW5wdXQudmFsdWUudHJpbSgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLnBhcnNlUXVpY2tJbnB1dChpbnB1dC52YWx1ZS50cmltKCkpO1xuICAgICAgICAgICAgICAgIGlucHV0LnZhbHVlID0gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBETEMgMTogUmVuZGVyIERhaWx5IE1pc3Npb25zXG4gICAgcmVuZGVyRGFpbHlNaXNzaW9ucyhwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IG1pc3Npb25zID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGFpbHlNaXNzaW9ucyB8fCBbXTtcbiAgICAgICAgXG4gICAgICAgIGlmIChtaXNzaW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGVtcHR5ID0gcGFyZW50LmNyZWF0ZURpdih7IHRleHQ6IFwiTm8gbWlzc2lvbnMgdG9kYXkuIENoZWNrIGJhY2sgdG9tb3Jyb3cuXCIsIGNsczogXCJzaXN5LWVtcHR5LXN0YXRlXCIgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtaXNzaW9uc0RpdiA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1kYWlseS1taXNzaW9uc1wiIH0pO1xuICAgICAgICBcbiAgICAgICAgbWlzc2lvbnMuZm9yRWFjaCgobWlzc2lvbjogRGFpbHlNaXNzaW9uKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjYXJkID0gbWlzc2lvbnNEaXYuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktbWlzc2lvbi1jYXJkXCIgfSk7XG4gICAgICAgICAgICBpZiAobWlzc2lvbi5jb21wbGV0ZWQpIGNhcmQuYWRkQ2xhc3MoXCJzaXN5LW1pc3Npb24tY29tcGxldGVkXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LW1pc3Npb24taGVhZGVyXCIgfSk7XG4gICAgICAgICAgICBjb25zdCBzdGF0dXNJY29uID0gbWlzc2lvbi5jb21wbGV0ZWQgPyBcIllFU1wiIDogXCIuLlwiO1xuICAgICAgICAgICAgaGVhZGVyLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IHN0YXR1c0ljb24sIGNsczogXCJzaXN5LW1pc3Npb24tc3RhdHVzXCIgfSk7XG4gICAgICAgICAgICBoZWFkZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogbWlzc2lvbi5uYW1lLCBjbHM6IFwic2lzeS1taXNzaW9uLW5hbWVcIiB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgZGVzYyA9IGNhcmQuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogbWlzc2lvbi5kZXNjLCBjbHM6IFwic2lzeS1taXNzaW9uLWRlc2NcIiB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgcHJvZ3Jlc3MgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LW1pc3Npb24tcHJvZ3Jlc3NcIiB9KTtcbiAgICAgICAgICAgIHByb2dyZXNzLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IGAke21pc3Npb24ucHJvZ3Jlc3N9LyR7bWlzc2lvbi50YXJnZXR9YCwgY2xzOiBcInNpc3ktbWlzc2lvbi1jb3VudGVyXCIgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGJhciA9IHByb2dyZXNzLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJhci1iZ1wiIH0pO1xuICAgICAgICAgICAgY29uc3QgZmlsbCA9IGJhci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1iYXItZmlsbFwiIH0pO1xuICAgICAgICAgICAgY29uc3QgcGVyY2VudCA9IChtaXNzaW9uLnByb2dyZXNzIC8gbWlzc2lvbi50YXJnZXQpICogMTAwO1xuICAgICAgICAgICAgZmlsbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgd2lkdGg6ICR7TWF0aC5taW4ocGVyY2VudCwgMTAwKX0lYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHJld2FyZCA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktbWlzc2lvbi1yZXdhcmRcIiB9KTtcbiAgICAgICAgICAgIGlmIChtaXNzaW9uLnJld2FyZC54cCA+IDApIHJld2FyZC5jcmVhdGVTcGFuKHsgdGV4dDogYCske21pc3Npb24ucmV3YXJkLnhwfSBYUGAsIGNsczogXCJzaXN5LXJld2FyZC14cFwiIH0pO1xuICAgICAgICAgICAgaWYgKG1pc3Npb24ucmV3YXJkLmdvbGQgPiAwKSByZXdhcmQuY3JlYXRlU3Bhbih7IHRleHQ6IGArJHttaXNzaW9uLnJld2FyZC5nb2xkfWdgLCBjbHM6IFwic2lzeS1yZXdhcmQtZ29sZFwiIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCBhbGxDb21wbGV0ZWQgPSBtaXNzaW9ucy5ldmVyeShtID0+IG0uY29tcGxldGVkKTtcbiAgICAgICAgaWYgKGFsbENvbXBsZXRlZCAmJiBtaXNzaW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBib251cyA9IG1pc3Npb25zRGl2LmNyZWF0ZURpdih7IHRleHQ6IFwiQWxsIE1pc3Npb25zIENvbXBsZXRlISArNTAgQm9udXMgR29sZFwiLCBjbHM6IFwic2lzeS1taXNzaW9uLWJvbnVzXCIgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG4gICAgLy8gRExDIDI6IFJlbmRlciBSZXNlYXJjaCBRdWVzdHMgU2VjdGlvblxuICAgIHJlbmRlclJlc2VhcmNoU2VjdGlvbihwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IHJlc2VhcmNoUXVlc3RzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMgfHwgW107XG4gICAgICAgIGNvbnN0IGFjdGl2ZVJlc2VhcmNoID0gcmVzZWFyY2hRdWVzdHMuZmlsdGVyKHEgPT4gIXEuY29tcGxldGVkKTtcbiAgICAgICAgY29uc3QgY29tcGxldGVkUmVzZWFyY2ggPSByZXNlYXJjaFF1ZXN0cy5maWx0ZXIocSA9PiBxLmNvbXBsZXRlZCk7XG5cbiAgICAgICAgLy8gU3RhdHMgYmFyXG4gICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldFJlc2VhcmNoUmF0aW8oKTtcbiAgICAgICAgY29uc3Qgc3RhdHNEaXYgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktcmVzZWFyY2gtc3RhdHNcIiB9KTtcbiAgICAgICAgc3RhdHNEaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJib3JkZXI6IDFweCBzb2xpZCAjNjY2OyBwYWRkaW5nOiAxMHB4OyBib3JkZXItcmFkaXVzOiA0cHg7IG1hcmdpbi1ib3R0b206IDEwcHg7IGJhY2tncm91bmQ6IHJnYmEoMTcwLCAxMDAsIDI1NSwgMC4wNSk7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmF0aW9UZXh0ID0gc3RhdHNEaXYuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFJlc2VhcmNoIFJhdGlvOiAke3N0YXRzLmNvbWJhdH06JHtzdGF0cy5yZXNlYXJjaH0gKCR7c3RhdHMucmF0aW99OjEpYCB9KTtcbiAgICAgICAgcmF0aW9UZXh0LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiA1cHggMDsgZm9udC1zaXplOiAwLjllbTtcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXRoaXMucGx1Z2luLmVuZ2luZS5jYW5DcmVhdGVSZXNlYXJjaFF1ZXN0KCkpIHtcbiAgICAgICAgICAgIGNvbnN0IHdhcm5pbmcgPSBzdGF0c0Rpdi5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIkJMT0NLRUQ6IE5lZWQgMiBjb21iYXQgcGVyIDEgcmVzZWFyY2hcIiB9KTtcbiAgICAgICAgICAgIHdhcm5pbmcuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJjb2xvcjogb3JhbmdlOyBmb250LXdlaWdodDogYm9sZDsgbWFyZ2luOiA1cHggMDtcIik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBY3RpdmUgUmVzZWFyY2hcbiAgICAgICAgcGFyZW50LmNyZWF0ZURpdih7IHRleHQ6IFwiQUNUSVZFIFJFU0VBUkNIXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChhY3RpdmVSZXNlYXJjaC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHBhcmVudC5jcmVhdGVEaXYoeyB0ZXh0OiBcIk5vIGFjdGl2ZSByZXNlYXJjaC5cIiwgY2xzOiBcInNpc3ktZW1wdHktc3RhdGVcIiB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFjdGl2ZVJlc2VhcmNoLmZvckVhY2goKHF1ZXN0OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXJkID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXJlc2VhcmNoLWNhcmRcIiB9KTtcbiAgICAgICAgICAgICAgICBjYXJkLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYm9yZGVyOiAxcHggc29saWQgI2FhNjRmZjsgcGFkZGluZzogMTBweDsgbWFyZ2luLWJvdHRvbTogOHB4OyBib3JkZXItcmFkaXVzOiA0cHg7IGJhY2tncm91bmQ6IHJnYmEoMTcwLCAxMDAsIDI1NSwgMC4wNSk7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gY2FyZC5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICBoZWFkZXIuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJkaXNwbGF5OiBmbGV4OyBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47IG1hcmdpbi1ib3R0b206IDZweDtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCB0aXRsZSA9IGhlYWRlci5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBxdWVzdC50aXRsZSB9KTtcbiAgICAgICAgICAgICAgICB0aXRsZS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZvbnQtd2VpZ2h0OiBib2xkOyBmbGV4OiAxO1wiKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHR5cGVMYWJlbCA9IGhlYWRlci5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBxdWVzdC50eXBlID09PSBcInN1cnZleVwiID8gXCJTVVJWRVlcIiA6IFwiREVFUCBESVZFXCIgfSk7XG4gICAgICAgICAgICAgICAgdHlwZUxhYmVsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZm9udC1zaXplOiAwLjc1ZW07IHBhZGRpbmc6IDJweCA2cHg7IGJhY2tncm91bmQ6IHJnYmEoMTcwLCAxMDAsIDI1NSwgMC4zKTsgYm9yZGVyLXJhZGl1czogMnB4O1wiKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHdvcmRDb3VudCA9IGNhcmQuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFdvcmRzOiAke3F1ZXN0LndvcmRDb3VudH0vJHtxdWVzdC53b3JkTGltaXR9YCB9KTtcbiAgICAgICAgICAgICAgICB3b3JkQ291bnQuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDVweCAwOyBmb250LXNpemU6IDAuODVlbTtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBiYXIgPSBjYXJkLmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgICAgIGJhci5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImhlaWdodDogNnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwyNTUsMjU1LDAuMSk7IGJvcmRlci1yYWRpdXM6IDNweDsgb3ZlcmZsb3c6IGhpZGRlbjsgbWFyZ2luOiA2cHggMDtcIik7XG4gICAgICAgICAgICAgICAgY29uc3QgZmlsbCA9IGJhci5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwZXJjZW50ID0gTWF0aC5taW4oMTAwLCAocXVlc3Qud29yZENvdW50IC8gcXVlc3Qud29yZExpbWl0KSAqIDEwMCk7XG4gICAgICAgICAgICAgICAgZmlsbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgd2lkdGg6ICR7cGVyY2VudH0lOyBoZWlnaHQ6IDEwMCU7IGJhY2tncm91bmQ6ICNhYTY0ZmY7IHRyYW5zaXRpb246IHdpZHRoIDAuM3M7YCk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBhY3Rpb25zID0gY2FyZC5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICBhY3Rpb25zLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTogZmxleDsgZ2FwOiA1cHg7IG1hcmdpbi10b3A6IDhweDtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCB2aWV3QnRuID0gYWN0aW9ucy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQ09NUExFVEVcIiB9KTtcbiAgICAgICAgICAgICAgICB2aWV3QnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZmxleDogMTsgcGFkZGluZzogNnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDg1LCAyNTUsIDg1LCAwLjIpOyBib3JkZXI6IDFweCBzb2xpZCAjNTVmZjU1OyBjb2xvcjogIzU1ZmY1NTsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtc2l6ZTogMC44NWVtO1wiKTtcbiAgICAgICAgICAgICAgICB2aWV3QnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5jb21wbGV0ZVJlc2VhcmNoUXVlc3QocXVlc3QuaWQsIHF1ZXN0LndvcmRDb3VudCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBjb25zdCBkZWxldGVCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJERUxFVEVcIiB9KTtcbiAgICAgICAgICAgICAgICBkZWxldGVCdG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmbGV4OiAxOyBwYWRkaW5nOiA2cHg7IGJhY2tncm91bmQ6IHJnYmEoMjU1LCA4NSwgODUsIDAuMik7IGJvcmRlcjogMXB4IHNvbGlkICNmZjU1NTU7IGNvbG9yOiAjZmY1NTU1OyBib3JkZXItcmFkaXVzOiAzcHg7IGN1cnNvcjogcG9pbnRlcjsgZm9udC1zaXplOiAwLjg1ZW07XCIpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZUJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuZGVsZXRlUmVzZWFyY2hRdWVzdChxdWVzdC5pZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbXBsZXRlZCBSZXNlYXJjaFxuICAgICAgICBwYXJlbnQuY3JlYXRlRGl2KHsgdGV4dDogXCJDT01QTEVURUQgUkVTRUFSQ0hcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNvbXBsZXRlZFJlc2VhcmNoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcGFyZW50LmNyZWF0ZURpdih7IHRleHQ6IFwiTm8gY29tcGxldGVkIHJlc2VhcmNoLlwiLCBjbHM6IFwic2lzeS1lbXB0eS1zdGF0ZVwiIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29tcGxldGVkUmVzZWFyY2guZm9yRWFjaCgocXVlc3Q6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBwYXJlbnQuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYCsgJHtxdWVzdC50aXRsZX0gKCR7cXVlc3QudHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IFwiU3VydmV5XCIgOiBcIkRlZXAgRGl2ZVwifSlgIH0pO1xuICAgICAgICAgICAgICAgIGl0ZW0uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJvcGFjaXR5OiAwLjY7IGZvbnQtc2l6ZTogMC45ZW07IG1hcmdpbjogM3B4IDA7XCIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgICAgICAgICAgYXN5bmMgcmVuZGVyUXVlc3RzKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiQWN0aXZlX1J1bi9RdWVzdHNcIik7XG4gICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgIGlmIChmb2xkZXIgaW5zdGFuY2VvZiBURm9sZGVyKSB7XG4gICAgICAgICAgICBjb25zdCBmaWxlcyA9IGZvbGRlci5jaGlsZHJlbi5maWx0ZXIoZiA9PiBmIGluc3RhbmNlb2YgVEZpbGUpIGFzIFRGaWxlW107XG4gICAgICAgICAgICBmaWxlcy5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZm1BID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoYSk/LmZyb250bWF0dGVyO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZtQiA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGIpPy5mcm9udG1hdHRlcjtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRlQSA9IGZtQT8uZGVhZGxpbmUgPyBtb21lbnQoZm1BLmRlYWRsaW5lKS52YWx1ZU9mKCkgOiA5OTk5OTk5OTk5OTk5O1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGVCID0gZm1CPy5kZWFkbGluZSA/IG1vbWVudChmbUIuZGVhZGxpbmUpLnZhbHVlT2YoKSA6IDk5OTk5OTk5OTk5OTk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGVBIC0gZGF0ZUI7IFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgY29uc3QgZm0gPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgICAgICAgICAgY29uc3QgY2FyZCA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jYXJkXCIgfSk7XG4gICAgICAgICAgICAgICAgaWYgKGZtPy5pc19ib3NzKSBjYXJkLmFkZENsYXNzKFwic2lzeS1jYXJkLWJvc3NcIik7XG4gICAgICAgICAgICAgICAgY29uc3QgZCA9IFN0cmluZyhmbT8uZGlmZmljdWx0eSB8fCBcIlwiKS5tYXRjaCgvXFxkLyk7XG4gICAgICAgICAgICAgICAgaWYgKGQpIGNhcmQuYWRkQ2xhc3MoYHNpc3ktY2FyZC0ke2RbMF19YCk7XG5cbiAgICAgICAgICAgICAgICAvLyBUb3Agc2VjdGlvbiB3aXRoIHRpdGxlIGFuZCB0aW1lclxuICAgICAgICAgICAgICAgIGNvbnN0IHRvcCA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktY2FyZC10b3BcIiB9KTtcbiAgICAgICAgICAgICAgICB0b3AuY3JlYXRlRGl2KHsgdGV4dDogZmlsZS5iYXNlbmFtZSwgY2xzOiBcInNpc3ktY2FyZC10aXRsZVwiIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFRpbWVyXG4gICAgICAgICAgICAgICAgaWYgKGZtPy5kZWFkbGluZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaWZmID0gbW9tZW50KGZtLmRlYWRsaW5lKS5kaWZmKG1vbWVudCgpLCAnbWludXRlcycpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IoZGlmZiAvIDYwKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWlucyA9IGRpZmYgJSA2MDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGltZXJUZXh0ID0gZGlmZiA8IDAgPyBcIkVYUElSRURcIiA6IGAke2hvdXJzfWggJHttaW5zfW1gO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0aW1lciA9IHRvcC5jcmVhdGVEaXYoeyB0ZXh0OiB0aW1lclRleHQsIGNsczogXCJzaXN5LXRpbWVyXCIgfSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkaWZmIDwgNjApIHRpbWVyLmFkZENsYXNzKFwic2lzeS10aW1lci1sYXRlXCIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFRyYXNoIGljb24gKGlubGluZSwgbm90IGFic29sdXRlKVxuICAgICAgICAgICAgICAgIGNvbnN0IHRyYXNoID0gdG9wLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXRyYXNoXCIsIHRleHQ6IFwiW1hdXCIgfSk7XG4gICAgICAgICAgICAgICAgdHJhc2guc3R5bGUuY3Vyc29yID0gXCJwb2ludGVyXCI7XG4gICAgICAgICAgICAgICAgdHJhc2guc3R5bGUuY29sb3IgPSBcIiNmZjU1NTVcIjtcbiAgICAgICAgICAgICAgICB0cmFzaC5vbmNsaWNrID0gKGUpID0+IHsgXG4gICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7IFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuZGVsZXRlUXVlc3QoZmlsZSk7IFxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAvLyBBY3Rpb24gYnV0dG9uc1xuICAgICAgICAgICAgICAgIGNvbnN0IGFjdHMgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWFjdGlvbnNcIiB9KTtcbiAgICAgICAgICAgICAgICBjb25zdCBiRCA9IGFjdHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIk9LXCIsIGNsczogXCJzaXN5LWFjdGlvbi1idG4gbW9kLWRvbmVcIiB9KTtcbiAgICAgICAgICAgICAgICBiRC5vbmNsaWNrID0gKCkgPT4gdGhpcy5wbHVnaW4uZW5naW5lLmNvbXBsZXRlUXVlc3QoZmlsZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgYkYgPSBhY3RzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJYWFwiLCBjbHM6IFwic2lzeS1hY3Rpb24tYnRuIG1vZC1mYWlsXCIgfSk7XG4gICAgICAgICAgICAgICAgYkYub25jbGljayA9ICgpID0+IHRoaXMucGx1Z2luLmVuZ2luZS5mYWlsUXVlc3QoZmlsZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvdW50ID09PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBpZGxlID0gcGFyZW50LmNyZWF0ZURpdih7IHRleHQ6IFwiU3lzdGVtIElkbGUuXCIsIGNsczogXCJzaXN5LWVtcHR5LXN0YXRlXCIgfSk7XG4gICAgICAgICAgICBjb25zdCBjdGFCdG4gPSBpZGxlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJbREVQTE9ZIFFVRVNUXVwiLCBjbHM6IFwic2lzeS1idG4gbW9kLWN0YVwiIH0pO1xuICAgICAgICAgICAgY3RhQnRuLnN0eWxlLm1hcmdpblRvcCA9IFwiMTBweFwiO1xuICAgICAgICAgICAgY3RhQnRuLm9uY2xpY2sgPSAoKSA9PiBuZXcgUXVlc3RNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4pLm9wZW4oKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIFxuXG4gICAgcmVuZGVyQ2hhaW5TZWN0aW9uKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghY2hhaW4pIHtcbiAgICAgICAgICAgIHBhcmVudC5jcmVhdGVEaXYoeyB0ZXh0OiBcIk5vIGFjdGl2ZSBjaGFpbi5cIiwgY2xzOiBcInNpc3ktZW1wdHktc3RhdGVcIiB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY2hhaW5EaXYgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktY2hhaW4tY29udGFpbmVyXCIgfSk7XG4gICAgICAgIGNoYWluRGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYm9yZGVyOiAxcHggc29saWQgIzRjYWY1MDsgcGFkZGluZzogMTJweDsgYm9yZGVyLXJhZGl1czogNHB4OyBiYWNrZ3JvdW5kOiByZ2JhKDc2LCAxNzUsIDgwLCAwLjA1KTsgbWFyZ2luLWJvdHRvbTogMTBweDtcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBoZWFkZXIgPSBjaGFpbkRpdi5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogY2hhaW4ubmFtZSB9KTtcbiAgICAgICAgaGVhZGVyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAwIDAgMTBweCAwOyBjb2xvcjogIzRjYWY1MDtcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBwcm9ncmVzcyA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRDaGFpblByb2dyZXNzKCk7XG4gICAgICAgIGNvbnN0IHByb2dyZXNzVGV4dCA9IGNoYWluRGl2LmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBQcm9ncmVzczogJHtwcm9ncmVzcy5jb21wbGV0ZWR9LyR7cHJvZ3Jlc3MudG90YWx9YCB9KTtcbiAgICAgICAgcHJvZ3Jlc3NUZXh0LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiA1cHggMDsgZm9udC1zaXplOiAwLjllbTtcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBiYXIgPSBjaGFpbkRpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgYmFyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiaGVpZ2h0OiA2cHg7IGJhY2tncm91bmQ6IHJnYmEoMjU1LDI1NSwyNTUsMC4xKTsgYm9yZGVyLXJhZGl1czogM3B4OyBtYXJnaW46IDhweCAwOyBvdmVyZmxvdzogaGlkZGVuO1wiKTtcbiAgICAgICAgY29uc3QgZmlsbCA9IGJhci5jcmVhdGVEaXYoKTtcbiAgICAgICAgZmlsbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgd2lkdGg6ICR7cHJvZ3Jlc3MucGVyY2VudH0lOyBoZWlnaHQ6IDEwMCU7IGJhY2tncm91bmQ6ICM0Y2FmNTA7IHRyYW5zaXRpb246IHdpZHRoIDAuM3M7YCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBxdWVzdExpc3QgPSBjaGFpbkRpdi5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jaGFpbi1xdWVzdHNcIiB9KTtcbiAgICAgICAgcXVlc3RMaXN0LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAxMHB4IDA7IGZvbnQtc2l6ZTogMC44NWVtO1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNoYWluLnF1ZXN0cy5mb3JFYWNoKChxdWVzdCwgaWR4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpdGVtID0gcXVlc3RMaXN0LmNyZWF0ZUVsKFwicFwiKTtcbiAgICAgICAgICAgIGNvbnN0IGljb24gPSBpZHggPCBwcm9ncmVzcy5jb21wbGV0ZWQgPyBcIk9LXCIgOiBpZHggPT09IHByb2dyZXNzLmNvbXBsZXRlZCA/IFwiPj4+XCIgOiBcIkxPQ0tcIjtcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IGlkeCA8IHByb2dyZXNzLmNvbXBsZXRlZCA/IFwiRE9ORVwiIDogaWR4ID09PSBwcm9ncmVzcy5jb21wbGV0ZWQgPyBcIkFDVElWRVwiIDogXCJMT0NLRURcIjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaXRlbS5zZXRUZXh0KGBbJHtpY29ufV0gJHtxdWVzdH0gKCR7c3RhdHVzfSlgKTtcbiAgICAgICAgICAgIGl0ZW0uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgYG1hcmdpbjogM3B4IDA7IHBhZGRpbmc6IDNweDsgXG4gICAgICAgICAgICAgICAgJHtpZHggPCBwcm9ncmVzcy5jb21wbGV0ZWQgPyBcIm9wYWNpdHk6IDAuNjtcIiA6IGlkeCA9PT0gcHJvZ3Jlc3MuY29tcGxldGVkID8gXCJmb250LXdlaWdodDogYm9sZDsgY29sb3I6ICM0Y2FmNTA7XCIgOiBcIm9wYWNpdHk6IDAuNDtcIn1gKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBhY3Rpb25zID0gY2hhaW5EaXYuY3JlYXRlRGl2KCk7XG4gICAgICAgIGFjdGlvbnMuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJkaXNwbGF5OiBmbGV4OyBnYXA6IDVweDsgbWFyZ2luLXRvcDogMTBweDtcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBicmVha0J0biA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkJSRUFLIENIQUlOXCIgfSk7XG4gICAgICAgIGJyZWFrQnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZmxleDogMTsgcGFkZGluZzogNnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwgODUsIDg1LCAwLjIpOyBib3JkZXI6IDFweCBzb2xpZCAjZmY1NTU1OyBjb2xvcjogI2ZmNTU1NTsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtc2l6ZTogMC44ZW07XCIpO1xuICAgICAgICBicmVha0J0bi5vbmNsaWNrID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLmJyZWFrQ2hhaW4oKTtcbiAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICB9O1xuICAgIH1cblxuXG4gICAgcmVuZGVyRmlsdGVyQmFyKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgZmlsdGVycyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmZpbHRlclN0YXRlO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZmlsdGVyRGl2ID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWZpbHRlci1iYXJcIiB9KTtcbiAgICAgICAgZmlsdGVyRGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYm9yZGVyOiAxcHggc29saWQgIzAwODhmZjsgcGFkZGluZzogMTBweDsgYm9yZGVyLXJhZGl1czogNHB4OyBiYWNrZ3JvdW5kOiByZ2JhKDAsIDEzNiwgMjU1LCAwLjA1KTsgbWFyZ2luLWJvdHRvbTogMTVweDtcIik7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmVyZ3kgZmlsdGVyXG4gICAgICAgIGNvbnN0IGVuZXJneURpdiA9IGZpbHRlckRpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgZW5lcmd5RGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luLWJvdHRvbTogOHB4O1wiKTtcbiAgICAgICAgZW5lcmd5RGl2LmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IFwiRW5lcmd5OiBcIiB9KS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZvbnQtd2VpZ2h0OiBib2xkO1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGVuZXJneU9wdGlvbnMgPSBbXCJhbnlcIiwgXCJoaWdoXCIsIFwibWVkaXVtXCIsIFwibG93XCJdO1xuICAgICAgICBlbmVyZ3lPcHRpb25zLmZvckVhY2gob3B0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGJ0biA9IGVuZXJneURpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IG9wdC50b1VwcGVyQ2FzZSgpIH0pO1xuICAgICAgICAgICAgYnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIGBtYXJnaW46IDAgM3B4OyBwYWRkaW5nOiA0cHggOHB4OyBib3JkZXItcmFkaXVzOiAzcHg7IGN1cnNvcjogcG9pbnRlcjsgXG4gICAgICAgICAgICAgICAgJHtmaWx0ZXJzLmFjdGl2ZUVuZXJneSA9PT0gb3B0ID8gXCJiYWNrZ3JvdW5kOiAjMDA4OGZmOyBjb2xvcjogd2hpdGU7XCIgOiBcImJhY2tncm91bmQ6IHJnYmEoMCwgMTM2LCAyNTUsIDAuMik7XCJ9YCk7XG4gICAgICAgICAgICBidG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuc2V0RmlsdGVyU3RhdGUob3B0IGFzIGFueSwgZmlsdGVycy5hY3RpdmVDb250ZXh0LCBmaWx0ZXJzLmFjdGl2ZVRhZ3MpO1xuICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb250ZXh0IGZpbHRlclxuICAgICAgICBjb25zdCBjb250ZXh0RGl2ID0gZmlsdGVyRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICBjb250ZXh0RGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luLWJvdHRvbTogOHB4O1wiKTtcbiAgICAgICAgY29udGV4dERpdi5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBcIkNvbnRleHQ6IFwiIH0pLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZm9udC13ZWlnaHQ6IGJvbGQ7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY29udGV4dE9wdGlvbnMgPSBbXCJhbnlcIiwgXCJob21lXCIsIFwib2ZmaWNlXCIsIFwiYW55d2hlcmVcIl07XG4gICAgICAgIGNvbnRleHRPcHRpb25zLmZvckVhY2gob3B0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGJ0biA9IGNvbnRleHREaXYuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBvcHQudG9VcHBlckNhc2UoKSB9KTtcbiAgICAgICAgICAgIGJ0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgbWFyZ2luOiAwIDNweDsgcGFkZGluZzogNHB4IDhweDsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IFxuICAgICAgICAgICAgICAgICR7ZmlsdGVycy5hY3RpdmVDb250ZXh0ID09PSBvcHQgPyBcImJhY2tncm91bmQ6ICMwMDg4ZmY7IGNvbG9yOiB3aGl0ZTtcIiA6IFwiYmFja2dyb3VuZDogcmdiYSgwLCAxMzYsIDI1NSwgMC4yKTtcIn1gKTtcbiAgICAgICAgICAgIGJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5zZXRGaWx0ZXJTdGF0ZShmaWx0ZXJzLmFjdGl2ZUVuZXJneSwgb3B0IGFzIGFueSwgZmlsdGVycy5hY3RpdmVUYWdzKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgYnV0dG9uXG4gICAgICAgIGNvbnN0IGNsZWFyQnRuID0gZmlsdGVyRGl2LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDTEVBUiBGSUxURVJTXCIgfSk7XG4gICAgICAgIGNsZWFyQnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwid2lkdGg6IDEwMCU7IHBhZGRpbmc6IDZweDsgbWFyZ2luLXRvcDogOHB4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwgODUsIDg1LCAwLjIpOyBib3JkZXI6IDFweCBzb2xpZCAjZmY1NTU1OyBjb2xvcjogI2ZmNTU1NTsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtd2VpZ2h0OiBib2xkO1wiKTtcbiAgICAgICAgY2xlYXJCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5jbGVhckZpbHRlcnMoKTtcbiAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICB9O1xuICAgIH1cblxuXG4gICAgcmVuZGVyQW5hbHl0aWNzKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3Qgc3RhdHMgPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0R2FtZVN0YXRzKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBhbmFseXRpY3NEaXYgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYW5hbHl0aWNzXCIgfSk7XG4gICAgICAgIGFuYWx5dGljc0Rpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImJvcmRlcjogMXB4IHNvbGlkICNmZmMxMDc7IHBhZGRpbmc6IDEycHg7IGJvcmRlci1yYWRpdXM6IDRweDsgYmFja2dyb3VuZDogcmdiYSgyNTUsIDE5MywgNywgMC4wNSk7IG1hcmdpbi1ib3R0b206IDE1cHg7XCIpO1xuICAgICAgICBcbiAgICAgICAgYW5hbHl0aWNzRGl2LmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkFOQUxZVElDUyAmIFBST0dSRVNTXCIgfSkuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDAgMCAxMHB4IDA7IGNvbG9yOiAjZmZjMTA3O1wiKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0YXRzIGdyaWRcbiAgICAgICAgY29uc3Qgc3RhdHNEaXYgPSBhbmFseXRpY3NEaXYuY3JlYXRlRGl2KCk7XG4gICAgICAgIHN0YXRzRGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTogZ3JpZDsgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAxZnIgMWZyOyBnYXA6IDEwcHg7IG1hcmdpbi1ib3R0b206IDEwcHg7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgc3RhdHNfaXRlbXMgPSBbXG4gICAgICAgICAgICB7IGxhYmVsOiBcIkxldmVsXCIsIHZhbHVlOiBzdGF0cy5sZXZlbCB9LFxuICAgICAgICAgICAgeyBsYWJlbDogXCJDdXJyZW50IFN0cmVha1wiLCB2YWx1ZTogc3RhdHMuY3VycmVudFN0cmVhayB9LFxuICAgICAgICAgICAgeyBsYWJlbDogXCJMb25nZXN0IFN0cmVha1wiLCB2YWx1ZTogc3RhdHMubG9uZ2VzdFN0cmVhayB9LFxuICAgICAgICAgICAgeyBsYWJlbDogXCJUb3RhbCBRdWVzdHNcIiwgdmFsdWU6IHN0YXRzLnRvdGFsUXVlc3RzIH1cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIHN0YXRzX2l0ZW1zLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzdGF0Qm94ID0gc3RhdHNEaXYuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICBzdGF0Qm94LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYm9yZGVyOiAxcHggc29saWQgI2ZmYzEwNzsgcGFkZGluZzogOHB4OyBib3JkZXItcmFkaXVzOiAzcHg7IGJhY2tncm91bmQ6IHJnYmEoMjU1LCAxOTMsIDcsIDAuMSk7XCIpO1xuICAgICAgICAgICAgc3RhdEJveC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBpdGVtLmxhYmVsIH0pLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAwOyBmb250LXNpemU6IDAuOGVtOyBvcGFjaXR5OiAwLjc7XCIpO1xuICAgICAgICAgICAgc3RhdEJveC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBTdHJpbmcoaXRlbS52YWx1ZSkgfSkuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDVweCAwIDAgMDsgZm9udC1zaXplOiAxLjJlbTsgZm9udC13ZWlnaHQ6IGJvbGQ7IGNvbG9yOiAjZmZjMTA3O1wiKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBCb3NzIHByb2dyZXNzXG4gICAgICAgIGFuYWx5dGljc0Rpdi5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogXCJCb3NzIE1pbGVzdG9uZXNcIiB9KS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogMTJweCAwIDhweCAwOyBjb2xvcjogI2ZmYzEwNztcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBib3NzZXMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcztcbiAgICAgICAgaWYgKGJvc3NlcyAmJiBib3NzZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgYm9zc2VzLmZvckVhY2goKGJvc3M6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJvc3NJdGVtID0gYW5hbHl0aWNzRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgICAgIGJvc3NJdGVtLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiA2cHggMDsgcGFkZGluZzogOHB4OyBiYWNrZ3JvdW5kOiByZ2JhKDAsIDAsIDAsIDAuMik7IGJvcmRlci1yYWRpdXM6IDNweDtcIik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgaWNvbiA9IGJvc3MuZGVmZWF0ZWQgPyBcIk9LXCIgOiBib3NzLnVubG9ja2VkID8gXCI+PlwiIDogXCJMT0NLXCI7XG4gICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9IGJvc3NJdGVtLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IGBbJHtpY29ufV0gTGV2ZWwgJHtib3NzLmxldmVsfTogJHtib3NzLm5hbWV9YCB9KTtcbiAgICAgICAgICAgICAgICBuYW1lLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIGJvc3MuZGVmZWF0ZWQgPyBcImNvbG9yOiAjNGNhZjUwOyBmb250LXdlaWdodDogYm9sZDtcIiA6IGJvc3MudW5sb2NrZWQgPyBcImNvbG9yOiAjZmZjMTA3O1wiIDogXCJvcGFjaXR5OiAwLjU7XCIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFdpbiBjb25kaXRpb25cbiAgICAgICAgaWYgKHN0YXRzLmdhbWVXb24pIHtcbiAgICAgICAgICAgIGNvbnN0IHdpbkRpdiA9IGFuYWx5dGljc0Rpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgIHdpbkRpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbi10b3A6IDEycHg7IHBhZGRpbmc6IDEycHg7IGJhY2tncm91bmQ6IHJnYmEoNzYsIDE3NSwgODAsIDAuMik7IGJvcmRlcjogMnB4IHNvbGlkICM0Y2FmNTA7IGJvcmRlci1yYWRpdXM6IDRweDsgdGV4dC1hbGlnbjogY2VudGVyO1wiKTtcbiAgICAgICAgICAgIHdpbkRpdi5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIkdBTUUgV09OIVwiIH0pLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAwOyBmb250LXNpemU6IDEuMmVtOyBmb250LXdlaWdodDogYm9sZDsgY29sb3I6ICM0Y2FmNTA7XCIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHN0YXQocDogSFRNTEVsZW1lbnQsIGxhYmVsOiBzdHJpbmcsIHZhbDogc3RyaW5nLCBjbHM6IHN0cmluZyA9IFwiXCIpIHtcbiAgICAgICAgY29uc3QgYiA9IHAuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktc3RhdC1ib3hcIiB9KTsgXG4gICAgICAgIGlmIChjbHMpIGIuYWRkQ2xhc3MoY2xzKTtcbiAgICAgICAgYi5jcmVhdGVEaXYoeyB0ZXh0OiBsYWJlbCwgY2xzOiBcInNpc3ktc3RhdC1sYWJlbFwiIH0pO1xuICAgICAgICBiLmNyZWF0ZURpdih7IHRleHQ6IHZhbCwgY2xzOiBcInNpc3ktc3RhdC12YWxcIiB9KTtcbiAgICB9XG5cbiAgICBhc3luYyBvbkNsb3NlKCkge1xuICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUub2ZmKCd1cGRhdGUnLCB0aGlzLnJlZnJlc2guYmluZCh0aGlzKSk7XG4gICAgfVxufSIsImltcG9ydCB7IE5vdGljZSwgUGx1Z2luLCBURmlsZSwgV29ya3NwYWNlTGVhZiB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IFNpc3lwaHVzU2V0dGluZ3MsIFNraWxsLCBNb2RpZmllciwgRGFpbHlNaXNzaW9uIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBTaXN5cGh1c0VuZ2luZSwgREVGQVVMVF9NT0RJRklFUiB9IGZyb20gJy4vZW5naW5lJztcbmltcG9ydCB7IEF1ZGlvQ29udHJvbGxlciB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgUmVzZWFyY2hRdWVzdE1vZGFsLCBDaGFpbkJ1aWxkZXJNb2RhbCwgUmVzZWFyY2hMaXN0TW9kYWwgfSBmcm9tIFwiLi91aS9tb2RhbHNcIjtcbmltcG9ydCB7IFBhbm9wdGljb25WaWV3LCBWSUVXX1RZUEVfUEFOT1BUSUNPTiB9IGZyb20gXCIuL3VpL3ZpZXdcIjtcblxuY29uc3QgREVGQVVMVF9TRVRUSU5HUzogU2lzeXBodXNTZXR0aW5ncyA9IHtcbiAgICBocDogMTAwLCBtYXhIcDogMTAwLCB4cDogMCwgZ29sZDogMCwgeHBSZXE6IDEwMCwgbGV2ZWw6IDEsIHJpdmFsRG1nOiAxMCxcbiAgICBsYXN0TG9naW46IFwiXCIsIHNoaWVsZGVkVW50aWw6IFwiXCIsIHJlc3REYXlVbnRpbDogXCJcIiwgc2tpbGxzOiBbXSxcbiAgICBkYWlseU1vZGlmaWVyOiBERUZBVUxUX01PRElGSUVSLCBcbiAgICBsZWdhY3k6IHsgc291bHM6IDAsIHBlcmtzOiB7IHN0YXJ0R29sZDogMCwgc3RhcnRTa2lsbFBvaW50czogMCwgcml2YWxEZWxheTogMCB9LCByZWxpY3M6IFtdLCBkZWF0aENvdW50OiAwIH0sIFxuICAgIG11dGVkOiBmYWxzZSwgaGlzdG9yeTogW10sIHJ1bkNvdW50OiAxLCBsb2NrZG93blVudGlsOiBcIlwiLCBkYW1hZ2VUYWtlblRvZGF5OiAwLFxuICAgIGRhaWx5TWlzc2lvbnM6IFtdLCBcbiAgICBkYWlseU1pc3Npb25EYXRlOiBcIlwiLCBcbiAgICBxdWVzdHNDb21wbGV0ZWRUb2RheTogMCwgXG4gICAgc2tpbGxVc2VzVG9kYXk6IHt9LFxuICAgIHJlc2VhcmNoUXVlc3RzOiBbXSxcbiAgICByZXNlYXJjaFN0YXRzOiB7IHRvdGFsUmVzZWFyY2g6IDAsIHRvdGFsQ29tYmF0OiAwLCByZXNlYXJjaENvbXBsZXRlZDogMCwgY29tYmF0Q29tcGxldGVkOiAwIH0sXG4gICAgbGFzdFJlc2VhcmNoUXVlc3RJZDogMCxcbiAgICBtZWRpdGF0aW9uQ3ljbGVzQ29tcGxldGVkOiAwLFxuICAgIHF1ZXN0RGVsZXRpb25zVG9kYXk6IDAsXG4gICAgbGFzdERlbGV0aW9uUmVzZXQ6IFwiXCIsXG4gICAgaXNNZWRpdGF0aW5nOiBmYWxzZSxcbiAgICBtZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duOiAwLFxuICAgIGFjdGl2ZUNoYWluczogW10sXG4gICAgY2hhaW5IaXN0b3J5OiBbXSxcbiAgICBjdXJyZW50Q2hhaW5JZDogXCJcIixcbiAgICBjaGFpblF1ZXN0c0NvbXBsZXRlZDogMCxcbiAgICBxdWVzdEZpbHRlcnM6IHt9LFxuICAgIGZpbHRlclN0YXRlOiB7IGFjdGl2ZUVuZXJneTogXCJhbnlcIiwgYWN0aXZlQ29udGV4dDogXCJhbnlcIiwgYWN0aXZlVGFnczogW10gfSxcbiAgICBkYXlNZXRyaWNzOiBbXSxcbiAgICB3ZWVrbHlSZXBvcnRzOiBbXSxcbiAgICBib3NzTWlsZXN0b25lczogW10sXG4gICAgc3RyZWFrOiB7IGN1cnJlbnQ6IDAsIGxvbmdlc3Q6IDAsIGxhc3REYXRlOiBcIlwiIH0sXG4gICAgYWNoaWV2ZW1lbnRzOiBbXSxcbiAgICBnYW1lV29uOiBmYWxzZVxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTaXN5cGh1c1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gICAgc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3M7XG4gICAgc3RhdHVzQmFySXRlbTogSFRNTEVsZW1lbnQ7XG4gICAgZW5naW5lOiBTaXN5cGh1c0VuZ2luZTtcbiAgICBhdWRpbzogQXVkaW9Db250cm9sbGVyO1xuXG4gICAgYXN5bmMgb25sb2FkKCkge1xuICAgICAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5sb2FkU3R5bGVzKCk7XG4gICAgICAgIHRoaXMuYXVkaW8gPSBuZXcgQXVkaW9Db250cm9sbGVyKHRoaXMuc2V0dGluZ3MubXV0ZWQpO1xuICAgICAgICB0aGlzLmVuZ2luZSA9IG5ldyBTaXN5cGh1c0VuZ2luZSh0aGlzLmFwcCwgdGhpcywgdGhpcy5hdWRpbyk7XG5cbiAgICAgICAgdGhpcy5yZWdpc3RlclZpZXcoVklFV19UWVBFX1BBTk9QVElDT04sIChsZWFmKSA9PiBuZXcgUGFub3B0aWNvblZpZXcobGVhZiwgdGhpcykpO1xuXG4gICAgICAgIHRoaXMuc3RhdHVzQmFySXRlbSA9IHRoaXMuYWRkU3RhdHVzQmFySXRlbSgpO1xuICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5jaGVja0RhaWx5TG9naW4oKTtcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNCYXIoKTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ29wZW4tcGFub3B0aWNvbicsIG5hbWU6ICdPcGVuIFBhbm9wdGljb24gKFNpZGViYXIpJywgY2FsbGJhY2s6ICgpID0+IHRoaXMuYWN0aXZhdGVWaWV3KCkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAndG9nZ2xlLWZvY3VzJywgbmFtZTogJ1RvZ2dsZSBGb2N1cyBOb2lzZScsIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmF1ZGlvLnRvZ2dsZUJyb3duTm9pc2UoKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdyZXJvbGwtY2hhb3MnLCBuYW1lOiAnUmVyb2xsIENoYW9zJywgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLnJvbGxDaGFvcyh0cnVlKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdhY2NlcHQtZGVhdGgnLCBuYW1lOiAnQUNDRVBUIERFQVRIJywgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLnRyaWdnZXJEZWF0aCgpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ3JlY292ZXInLCBuYW1lOiAnUmVjb3ZlciAoTG9ja2Rvd24pJywgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLmF0dGVtcHRSZWNvdmVyeSgpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdjcmVhdGUtcmVzZWFyY2gnLFxuICAgICAgICAgICAgbmFtZTogJ1Jlc2VhcmNoOiBDcmVhdGUgUmVzZWFyY2ggUXVlc3QnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IG5ldyBSZXNlYXJjaFF1ZXN0TW9kYWwodGhpcy5hcHAsIHRoaXMpLm9wZW4oKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICd2aWV3LXJlc2VhcmNoJyxcbiAgICAgICAgICAgIG5hbWU6ICdSZXNlYXJjaDogVmlldyBSZXNlYXJjaCBMaWJyYXJ5JyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiBuZXcgUmVzZWFyY2hMaXN0TW9kYWwodGhpcy5hcHAsIHRoaXMpLm9wZW4oKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdtZWRpdGF0ZScsXG4gICAgICAgICAgICBuYW1lOiAnTWVkaXRhdGlvbjogU3RhcnQgTWVkaXRhdGlvbicsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUuc3RhcnRNZWRpdGF0aW9uKClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnY3JlYXRlLWNoYWluJyxcbiAgICAgICAgICAgIG5hbWU6ICdDaGFpbnM6IENyZWF0ZSBRdWVzdCBDaGFpbicsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4ge1xuICAgICAgICAgICAgICAgIG5ldyBDaGFpbkJ1aWxkZXJNb2RhbCh0aGlzLmFwcCwgdGhpcykub3BlbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICd2aWV3LWNoYWlucycsXG4gICAgICAgICAgICBuYW1lOiAnQ2hhaW5zOiBWaWV3IEFjdGl2ZSBDaGFpbicsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5lbmdpbmUuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgICAgICAgICBpZiAoY2hhaW4pIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShgQWN0aXZlIENoYWluOiAke2NoYWluLm5hbWV9ICgke3RoaXMuZW5naW5lLmdldENoYWluUHJvZ3Jlc3MoKS5jb21wbGV0ZWR9LyR7Y2hhaW4ucXVlc3RzLmxlbmd0aH0pYCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShcIk5vIGFjdGl2ZSBjaGFpblwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ2ZpbHRlci1oaWdoLWVuZXJneScsXG4gICAgICAgICAgICBuYW1lOiAnRmlsdGVyczogU2hvdyBIaWdoIEVuZXJneSBRdWVzdHMnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLnNldEZpbHRlclN0YXRlKFwiaGlnaFwiLCBcImFueVwiLCBbXSlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnZmlsdGVyLW1lZGl1bS1lbmVyZ3knLFxuICAgICAgICAgICAgbmFtZTogJ0ZpbHRlcnM6IFNob3cgTWVkaXVtIEVuZXJneSBRdWVzdHMnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLnNldEZpbHRlclN0YXRlKFwibWVkaXVtXCIsIFwiYW55XCIsIFtdKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdmaWx0ZXItbG93LWVuZXJneScsXG4gICAgICAgICAgICBuYW1lOiAnRmlsdGVyczogU2hvdyBMb3cgRW5lcmd5IFF1ZXN0cycsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUuc2V0RmlsdGVyU3RhdGUoXCJsb3dcIiwgXCJhbnlcIiwgW10pXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ2NsZWFyLWZpbHRlcnMnLFxuICAgICAgICAgICAgbmFtZTogJ0ZpbHRlcnM6IENsZWFyIEFsbCBGaWx0ZXJzJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5jbGVhckZpbHRlcnMoKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICd3ZWVrbHktcmVwb3J0JyxcbiAgICAgICAgICAgIG5hbWU6ICdBbmFseXRpY3M6IEdlbmVyYXRlIFdlZWtseSBSZXBvcnQnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXBvcnQgPSB0aGlzLmVuZ2luZS5nZW5lcmF0ZVdlZWtseVJlcG9ydCgpO1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYFdlZWsgJHtyZXBvcnQud2Vla306ICR7cmVwb3J0LnRvdGFsUXVlc3RzfSBxdWVzdHMsICR7cmVwb3J0LnN1Y2Nlc3NSYXRlfSUgc3VjY2Vzc2ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdnYW1lLXN0YXRzJyxcbiAgICAgICAgICAgIG5hbWU6ICdBbmFseXRpY3M6IFZpZXcgR2FtZSBTdGF0cycsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5lbmdpbmUuZ2V0R2FtZVN0YXRzKCk7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShgTGV2ZWw6ICR7c3RhdHMubGV2ZWx9IHwgU3RyZWFrOiAke3N0YXRzLmN1cnJlbnRTdHJlYWt9IHwgUXVlc3RzOiAke3N0YXRzLnRvdGFsUXVlc3RzfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdjaGVjay1ib3NzZXMnLFxuICAgICAgICAgICAgbmFtZTogJ0VuZGdhbWU6IENoZWNrIEJvc3MgTWlsZXN0b25lcycsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUuY2hlY2tCb3NzTWlsZXN0b25lcygpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkUmliYm9uSWNvbignc2t1bGwnLCAnU2lzeXBodXMgU2lkZWJhcicsICgpID0+IHRoaXMuYWN0aXZhdGVWaWV3KCkpO1xuICAgICAgICB0aGlzLnJlZ2lzdGVySW50ZXJ2YWwod2luZG93LnNldEludGVydmFsKCgpID0+IHRoaXMuZW5naW5lLmNoZWNrRGVhZGxpbmVzKCksIDYwMDAwKSk7XG4gICAgfVxuXG4gICAgYXN5bmMgbG9hZFN0eWxlcygpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGNzc0ZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGhpcy5tYW5pZmVzdC5kaXIgKyBcIi9zdHlsZXMuY3NzXCIpO1xuICAgICAgICAgICAgaWYgKGNzc0ZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNzcyA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoY3NzRmlsZSk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XG4gICAgICAgICAgICAgICAgc3R5bGUuaWQgPSBcInNpc3lwaHVzLXN0eWxlc1wiO1xuICAgICAgICAgICAgICAgIHN0eWxlLmlubmVySFRNTCA9IGNzcztcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkgeyBjb25zb2xlLmVycm9yKFwiQ291bGQgbm90IGxvYWQgc3R5bGVzLmNzc1wiLCBlKTsgfVxuICAgIH1cblxuICAgIGFzeW5jIG9udW5sb2FkKCkge1xuICAgICAgICB0aGlzLmFwcC53b3Jrc3BhY2UuZGV0YWNoTGVhdmVzT2ZUeXBlKFZJRVdfVFlQRV9QQU5PUFRJQ09OKTtcbiAgICAgICAgaWYodGhpcy5hdWRpby5hdWRpb0N0eCkgdGhpcy5hdWRpby5hdWRpb0N0eC5jbG9zZSgpO1xuICAgICAgICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2lzeXBodXMtc3R5bGVzXCIpO1xuICAgICAgICBpZiAoc3R5bGUpIHN0eWxlLnJlbW92ZSgpO1xuICAgIH1cblxuICAgIGFzeW5jIGFjdGl2YXRlVmlldygpIHtcbiAgICAgICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuYXBwO1xuICAgICAgICBsZXQgbGVhZjogV29ya3NwYWNlTGVhZiB8IG51bGwgPSBudWxsO1xuICAgICAgICBjb25zdCBsZWF2ZXMgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFZJRVdfVFlQRV9QQU5PUFRJQ09OKTtcbiAgICAgICAgaWYgKGxlYXZlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBsZWFmID0gbGVhdmVzWzBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGVhZiA9IHdvcmtzcGFjZS5nZXRSaWdodExlYWYoZmFsc2UpO1xuICAgICAgICAgICAgYXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBWSUVXX1RZUEVfUEFOT1BUSUNPTiwgYWN0aXZlOiB0cnVlIH0pO1xuICAgICAgICB9XG4gICAgICAgIHdvcmtzcGFjZS5yZXZlYWxMZWFmKGxlYWYpO1xuICAgIH1cblxuICAgIHJlZnJlc2hVSSgpIHtcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNCYXIoKTtcbiAgICAgICAgY29uc3QgbGVhdmVzID0gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYXZlc09mVHlwZShWSUVXX1RZUEVfUEFOT1BUSUNPTik7XG4gICAgICAgIGlmIChsZWF2ZXMubGVuZ3RoID4gMCkgKGxlYXZlc1swXS52aWV3IGFzIFBhbm9wdGljb25WaWV3KS5yZWZyZXNoKCk7XG4gICAgfVxuXG4gICAgdXBkYXRlU3RhdHVzQmFyKCkge1xuICAgICAgICBsZXQgc2hpZWxkID0gKHRoaXMuZW5naW5lLmlzU2hpZWxkZWQoKSB8fCB0aGlzLmVuZ2luZS5pc1Jlc3RpbmcoKSkgPyAodGhpcy5lbmdpbmUuaXNSZXN0aW5nKCkgPyBcIkRcIiA6IFwiU1wiKSA6IFwiXCI7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb21wbGV0ZWRNaXNzaW9ucyA9IHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9ucy5maWx0ZXIobSA9PiBtLmNvbXBsZXRlZCkubGVuZ3RoO1xuICAgICAgICBjb25zdCB0b3RhbE1pc3Npb25zID0gdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25zLmxlbmd0aDtcbiAgICAgICAgY29uc3QgbWlzc2lvblByb2dyZXNzID0gdG90YWxNaXNzaW9ucyA+IDAgPyBgTSR7Y29tcGxldGVkTWlzc2lvbnN9LyR7dG90YWxNaXNzaW9uc31gIDogXCJcIjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHN0YXR1c1RleHQgPSBgJHt0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIuaWNvbn0gJHtzaGllbGR9IEhQJHt0aGlzLnNldHRpbmdzLmhwfS8ke3RoaXMuc2V0dGluZ3MubWF4SHB9IEcke3RoaXMuc2V0dGluZ3MuZ29sZH0gTHZsJHt0aGlzLnNldHRpbmdzLmxldmVsfSAke21pc3Npb25Qcm9ncmVzc31gO1xuICAgICAgICB0aGlzLnN0YXR1c0Jhckl0ZW0uc2V0VGV4dChzdGF0dXNUZXh0KTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmhwIDwgMzApIHRoaXMuc3RhdHVzQmFySXRlbS5zdHlsZS5jb2xvciA9IFwicmVkXCI7IFxuICAgICAgICBlbHNlIGlmICh0aGlzLnNldHRpbmdzLmdvbGQgPCAwKSB0aGlzLnN0YXR1c0Jhckl0ZW0uc3R5bGUuY29sb3IgPSBcIm9yYW5nZVwiO1xuICAgICAgICBlbHNlIHRoaXMuc3RhdHVzQmFySXRlbS5zdHlsZS5jb2xvciA9IFwiXCI7XG4gICAgfVxuICAgIFxuICAgIGFzeW5jIGxvYWRTZXR0aW5ncygpIHsgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBhd2FpdCB0aGlzLmxvYWREYXRhKCkpO1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MubGVnYWN5KSB0aGlzLnNldHRpbmdzLmxlZ2FjeSA9IHsgc291bHM6IDAsIHBlcmtzOiB7IHN0YXJ0R29sZDogMCwgc3RhcnRTa2lsbFBvaW50czogMCwgcml2YWxEZWxheTogMCB9LCByZWxpY3M6IFtdLCBkZWF0aENvdW50OiAwIH07XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmxlZ2FjeS5kZWF0aENvdW50ID09PSB1bmRlZmluZWQpIHRoaXMuc2V0dGluZ3MubGVnYWN5LmRlYXRoQ291bnQgPSAwOyBcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmhpc3RvcnkpIHRoaXMuc2V0dGluZ3MuaGlzdG9yeSA9IFtdO1xuICAgICAgICBcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMpIHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9ucyA9IFtdO1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9uRGF0ZSkgdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25EYXRlID0gXCJcIjtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MucXVlc3RzQ29tcGxldGVkVG9kYXkgPT09IHVuZGVmaW5lZCkgdGhpcy5zZXR0aW5ncy5xdWVzdHNDb21wbGV0ZWRUb2RheSA9IDA7XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5za2lsbFVzZXNUb2RheSkgdGhpcy5zZXR0aW5ncy5za2lsbFVzZXNUb2RheSA9IHt9O1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMpIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMgPSBbXTtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMpIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cyA9IHsgXG4gICAgICAgICAgICB0b3RhbFJlc2VhcmNoOiAwLCBcbiAgICAgICAgICAgIHRvdGFsQ29tYmF0OiAwLCBcbiAgICAgICAgICAgIHJlc2VhcmNoQ29tcGxldGVkOiAwLCBcbiAgICAgICAgICAgIGNvbWJhdENvbXBsZXRlZDogMCBcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubGFzdFJlc2VhcmNoUXVlc3RJZCA9PT0gdW5kZWZpbmVkKSB0aGlzLnNldHRpbmdzLmxhc3RSZXNlYXJjaFF1ZXN0SWQgPSAwO1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ3ljbGVzQ29tcGxldGVkID09PSB1bmRlZmluZWQpIHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkN5Y2xlc0NvbXBsZXRlZCA9IDA7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkgPT09IHVuZGVmaW5lZCkgdGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5ID0gMDtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmxhc3REZWxldGlvblJlc2V0KSB0aGlzLnNldHRpbmdzLmxhc3REZWxldGlvblJlc2V0ID0gXCJcIjtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuaXNNZWRpdGF0aW5nID09PSB1bmRlZmluZWQpIHRoaXMuc2V0dGluZ3MuaXNNZWRpdGF0aW5nID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24gPT09IHVuZGVmaW5lZCkgdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duID0gMDtcbiAgICAgICAgXG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMpIHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zID0gW107XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5jaGFpbkhpc3RvcnkpIHRoaXMuc2V0dGluZ3MuY2hhaW5IaXN0b3J5ID0gW107XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5jdXJyZW50Q2hhaW5JZCkgdGhpcy5zZXR0aW5ncy5jdXJyZW50Q2hhaW5JZCA9IFwiXCI7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmNoYWluUXVlc3RzQ29tcGxldGVkID09PSB1bmRlZmluZWQpIHRoaXMuc2V0dGluZ3MuY2hhaW5RdWVzdHNDb21wbGV0ZWQgPSAwO1xuICAgICAgICBcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVycykgdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnMgPSB7fTtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlKSB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlID0geyBhY3RpdmVFbmVyZ3k6IFwiYW55XCIsIGFjdGl2ZUNvbnRleHQ6IFwiYW55XCIsIGFjdGl2ZVRhZ3M6IFtdIH07XG4gICAgICAgIFxuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuZGF5TWV0cmljcykgdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzID0gW107XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy53ZWVrbHlSZXBvcnRzKSB0aGlzLnNldHRpbmdzLndlZWtseVJlcG9ydHMgPSBbXTtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzKSB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzID0gW107XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5zdHJlYWspIHRoaXMuc2V0dGluZ3Muc3RyZWFrID0geyBjdXJyZW50OiAwLCBsb25nZXN0OiAwLCBsYXN0RGF0ZTogXCJcIiB9O1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuYWNoaWV2ZW1lbnRzKSB0aGlzLnNldHRpbmdzLmFjaGlldmVtZW50cyA9IFtdO1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5nYW1lV29uID09PSB1bmRlZmluZWQpIHRoaXMuc2V0dGluZ3MuZ2FtZVdvbiA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5za2lsbHMgPSB0aGlzLnNldHRpbmdzLnNraWxscy5tYXAocyA9PiAoe1xuICAgICAgICAgICAgLi4ucyxcbiAgICAgICAgICAgIHJ1c3Q6IChzIGFzIGFueSkucnVzdCB8fCAwLFxuICAgICAgICAgICAgbGFzdFVzZWQ6IChzIGFzIGFueSkubGFzdFVzZWQgfHwgbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgY29ubmVjdGlvbnM6IChzIGFzIGFueSkuY29ubmVjdGlvbnMgfHwgW11cbiAgICAgICAgfSkpO1xuICAgIH1cbiAgICBhc3luYyBzYXZlU2V0dGluZ3MoKSB7IGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7IH1cbn1cbiJdLCJuYW1lcyI6WyJOb3RpY2UiLCJNb2RhbCIsIm1vbWVudCIsIlNldHRpbmciLCJURm9sZGVyIiwiVEZpbGUiLCJJdGVtVmlldyIsIlBsdWdpbiJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBa0dBO0FBQ08sU0FBUyxTQUFTLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFO0FBQzdELElBQUksU0FBUyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsT0FBTyxLQUFLLFlBQVksQ0FBQyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxVQUFVLE9BQU8sRUFBRSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO0FBQ2hILElBQUksT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsT0FBTyxDQUFDLEVBQUUsVUFBVSxPQUFPLEVBQUUsTUFBTSxFQUFFO0FBQy9ELFFBQVEsU0FBUyxTQUFTLENBQUMsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FB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QUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7U0FDaEcsQ0FBQSxDQUFDLENBQUM7QUFDSCxRQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsR0FBRyxFQUFFLE1BQVcsU0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxhQUFBO1lBQ2hFLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDbEYsQ0FBQSxDQUFDLENBQUM7QUFDSCxRQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsTUFBVyxTQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLGFBQUE7QUFDakUsWUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLEdBQUdDLGVBQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7U0FDaEYsQ0FBQSxDQUFDLENBQUM7QUFDSCxRQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsR0FBRyxFQUFFLE1BQVcsU0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxhQUFBO0FBQ2hFLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsWUFBWSxHQUFHQSxlQUFNLEVBQUUsQ0FBQyxH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O2FBQ3pCO2lCQUFNO2dCQUNILFFBQU8sSUFBSTtBQUNQLG9CQUFBLEtBQUssQ0FBQztBQUFFLHdCQUFBLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDO3dCQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7d0JBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQzt3QkFBQyxNQUFNO0FBQ3pHLG9CQUFBLEtBQUssQ0FBQztBQUFFLHdCQUFBLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDO3dCQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7d0JBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQzt3QkFBQyxNQUFNO0FBQ3RHLG9CQUFBLEtBQUssQ0FBQztBQUFFLHdCQUFBLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDO3dCQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7d0JBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQzt3QkFBQyxNQUFNO0FBQ3hHLG9CQUFBLEtBQUssQ0FBQztBQUFFLHdCQUFBLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDO3dCQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7d0JBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQzt3QkFBQyxNQUFNO0FBQ3RHLG9CQUFBLEtBQUssQ0FBQztBQUFFLHdCQUFBLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDO3dCQUFDLFVBQVUsR0FBRyxHQUFHLENBQUM7d0JBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQzt3QkFBQyxNQUFNO2lCQUM3RzthQUNKO0FBQ0Qs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
