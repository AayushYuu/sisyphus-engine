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
                info.innerHTML = `<code style="color:#aa64ff">${q.id}</code><br>Type: ${q.type === "survey" ? "Survey" : "Deep Dive"} | Words: ${q.wordCount}/${q.wordLimit}`;
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
    { id: "zero_inbox", name: "🧘 Zero Inbox", desc: "Complete 1 Trivial Quest", target: 1, reward: { xp: 0, gold: 10 }, check: "morning_trivial" }, // FIXED: Removed impossible check
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
                // FIXED: Removed premature updateStreak() from here
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
            // FIXED: Removed premature metrics tracking from here
            var _a;
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
            // FIXED: Added metrics tracking here, after validation
            this.analyticsEngine.trackDailyMetrics("quest_complete", 1);
            this.settings.researchStats.totalCombat++;
            let xp = (fm.xp_reward || 20) * this.settings.dailyModifier.xpMult;
            let gold = (fm.gold_reward || 0) * this.settings.dailyModifier.goldMult;
            const skillName = fm.skill || "None";
            const secondary = fm.secondary_skill || "None";
            this.audio.playSound("success");
            const skill = this.settings.skills.find(s => s.name === skillName);
            if (skill) {
                if (skill.rust > 0) {
                    skill.rust = 0;
                    // FIXED: Rust math corrected to match decay (1.1)
                    skill.xpReq = Math.floor(skill.xpReq / 1.1);
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
            // FIXED: Added Streak update here (Performance Based)
            this.analyticsEngine.updateStreak();
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
                // FIXED: Strict debt threshold (< 0 instead of < -100)
                if (this.settings.gold < 0)
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
            // FIXED: High Stakes saved as 'true'/'false' string for Obsidian compatibility
            const content = `---
type: quest
status: active
difficulty: ${diffLabel}
priority: ${priority}
xp_reward: ${xpReward}
gold_reward: ${goldReward}
skill: ${skill}
secondary_skill: ${secSkill}
high_stakes: ${highStakes ? 'true' : 'false'}
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
                card.createEl("div", { text: `ID: ${quest.id}` }).setAttribute("style", "font-family:monospace; font-size:0.8em; color:#aa64ff; opacity:0.8; margin-bottom:4px;");
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
                let files = folder.children.filter(f => f instanceof obsidian.TFile);
                files = this.plugin.engine.filtersEngine.filterQuests(files); // [AUTO-FIX] Apply filters
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
            // [AUTO-FIX] Expose for debug
            window.sisyphusEngine = this.engine;
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
            // [AUTO-FIX] Research Word Counter
            this.registerEvent(this.app.workspace.on('editor-change', (editor, info) => {
                var _a;
                if (!info || !info.file)
                    return;
                const cache = this.app.metadataCache.getFileCache(info.file);
                if ((_a = cache === null || cache === void 0 ? void 0 : cache.frontmatter) === null || _a === void 0 ? void 0 : _a.research_id) {
                    const words = editor.getValue().trim().split(/\s+/).length;
                    this.engine.updateResearchWordCount(cache.frontmatter.research_id, words);
                }
            }));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInNyYy91dGlscy50cyIsInNyYy91aS9tb2RhbHMudHMiLCJzcmMvZW5naW5lcy9BbmFseXRpY3NFbmdpbmUudHMiLCJzcmMvZW5naW5lcy9NZWRpdGF0aW9uRW5naW5lLnRzIiwic3JjL2VuZ2luZXMvUmVzZWFyY2hFbmdpbmUudHMiLCJzcmMvZW5naW5lcy9DaGFpbnNFbmdpbmUudHMiLCJzcmMvZW5naW5lcy9GaWx0ZXJzRW5naW5lLnRzIiwic3JjL2VuZ2luZS50cyIsInNyYy91aS92aWV3LnRzIiwic3JjL21haW4udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG5Db3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi5cclxuXHJcblBlcm1pc3Npb24gdG8gdXNlLCBjb3B5LCBtb2RpZnksIGFuZC9vciBkaXN0cmlidXRlIHRoaXMgc29mdHdhcmUgZm9yIGFueVxyXG5wdXJwb3NlIHdpdGggb3Igd2l0aG91dCBmZWUgaXMgaGVyZWJ5IGdyYW50ZWQuXHJcblxyXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiIEFORCBUSEUgQVVUSE9SIERJU0NMQUlNUyBBTEwgV0FSUkFOVElFUyBXSVRIXHJcblJFR0FSRCBUTyBUSElTIFNPRlRXQVJFIElOQ0xVRElORyBBTEwgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWVxyXG5BTkQgRklUTkVTUy4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUiBCRSBMSUFCTEUgRk9SIEFOWSBTUEVDSUFMLCBESVJFQ1QsXHJcbklORElSRUNULCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVMgT1IgQU5ZIERBTUFHRVMgV0hBVFNPRVZFUiBSRVNVTFRJTkcgRlJPTVxyXG5MT1NTIE9GIFVTRSwgREFUQSBPUiBQUk9GSVRTLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgTkVHTElHRU5DRSBPUlxyXG5PVEhFUiBUT1JUSU9VUyBBQ1RJT04sIEFSSVNJTkcgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgVVNFIE9SXHJcblBFUkZPUk1BTkNFIE9GIFRISVMgU09GVFdBUkUuXHJcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqICovXHJcbi8qIGdsb2JhbCBSZWZsZWN0LCBQcm9taXNlLCBTdXBwcmVzc2VkRXJyb3IsIFN5bWJvbCwgSXRlcmF0b3IgKi9cclxuXHJcbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwgcCkpIGRbcF0gPSBiW3BdOyB9O1xyXG4gICAgcmV0dXJuIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHRlbmRzKGQsIGIpIHtcclxuICAgIGlmICh0eXBlb2YgYiAhPT0gXCJmdW5jdGlvblwiICYmIGIgIT09IG51bGwpXHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNsYXNzIGV4dGVuZHMgdmFsdWUgXCIgKyBTdHJpbmcoYikgKyBcIiBpcyBub3QgYSBjb25zdHJ1Y3RvciBvciBudWxsXCIpO1xyXG4gICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XHJcbiAgICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gX19hc3NpZ24odCkge1xyXG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpIHRbcF0gPSBzW3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH1cclxuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXN0KHMsIGUpIHtcclxuICAgIHZhciB0ID0ge307XHJcbiAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcclxuICAgICAgICB0W3BdID0gc1twXTtcclxuICAgIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChlLmluZGV4T2YocFtpXSkgPCAwICYmIE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChzLCBwW2ldKSlcclxuICAgICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xyXG4gICAgICAgIH1cclxuICAgIHJldHVybiB0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXNEZWNvcmF0ZShjdG9yLCBkZXNjcmlwdG9ySW4sIGRlY29yYXRvcnMsIGNvbnRleHRJbiwgaW5pdGlhbGl6ZXJzLCBleHRyYUluaXRpYWxpemVycykge1xyXG4gICAgZnVuY3Rpb24gYWNjZXB0KGYpIHsgaWYgKGYgIT09IHZvaWQgMCAmJiB0eXBlb2YgZiAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRnVuY3Rpb24gZXhwZWN0ZWRcIik7IHJldHVybiBmOyB9XHJcbiAgICB2YXIga2luZCA9IGNvbnRleHRJbi5raW5kLCBrZXkgPSBraW5kID09PSBcImdldHRlclwiID8gXCJnZXRcIiA6IGtpbmQgPT09IFwic2V0dGVyXCIgPyBcInNldFwiIDogXCJ2YWx1ZVwiO1xyXG4gICAgdmFyIHRhcmdldCA9ICFkZXNjcmlwdG9ySW4gJiYgY3RvciA/IGNvbnRleHRJbltcInN0YXRpY1wiXSA/IGN0b3IgOiBjdG9yLnByb3RvdHlwZSA6IG51bGw7XHJcbiAgICB2YXIgZGVzY3JpcHRvciA9IGRlc2NyaXB0b3JJbiB8fCAodGFyZ2V0ID8gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGNvbnRleHRJbi5uYW1lKSA6IHt9KTtcclxuICAgIHZhciBfLCBkb25lID0gZmFsc2U7XHJcbiAgICBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgIHZhciBjb250ZXh0ID0ge307XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4pIGNvbnRleHRbcF0gPSBwID09PSBcImFjY2Vzc1wiID8ge30gOiBjb250ZXh0SW5bcF07XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4uYWNjZXNzKSBjb250ZXh0LmFjY2Vzc1twXSA9IGNvbnRleHRJbi5hY2Nlc3NbcF07XHJcbiAgICAgICAgY29udGV4dC5hZGRJbml0aWFsaXplciA9IGZ1bmN0aW9uIChmKSB7IGlmIChkb25lKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGFkZCBpbml0aWFsaXplcnMgYWZ0ZXIgZGVjb3JhdGlvbiBoYXMgY29tcGxldGVkXCIpOyBleHRyYUluaXRpYWxpemVycy5wdXNoKGFjY2VwdChmIHx8IG51bGwpKTsgfTtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gKDAsIGRlY29yYXRvcnNbaV0pKGtpbmQgPT09IFwiYWNjZXNzb3JcIiA/IHsgZ2V0OiBkZXNjcmlwdG9yLmdldCwgc2V0OiBkZXNjcmlwdG9yLnNldCB9IDogZGVzY3JpcHRvcltrZXldLCBjb250ZXh0KTtcclxuICAgICAgICBpZiAoa2luZCA9PT0gXCJhY2Nlc3NvclwiKSB7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IHZvaWQgMCkgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IG51bGwgfHwgdHlwZW9mIHJlc3VsdCAhPT0gXCJvYmplY3RcIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBleHBlY3RlZFwiKTtcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmdldCkpIGRlc2NyaXB0b3IuZ2V0ID0gXztcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LnNldCkpIGRlc2NyaXB0b3Iuc2V0ID0gXztcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmluaXQpKSBpbml0aWFsaXplcnMudW5zaGlmdChfKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoXyA9IGFjY2VwdChyZXN1bHQpKSB7XHJcbiAgICAgICAgICAgIGlmIChraW5kID09PSBcImZpZWxkXCIpIGluaXRpYWxpemVycy51bnNoaWZ0KF8pO1xyXG4gICAgICAgICAgICBlbHNlIGRlc2NyaXB0b3Jba2V5XSA9IF87XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRhcmdldCkgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgY29udGV4dEluLm5hbWUsIGRlc2NyaXB0b3IpO1xyXG4gICAgZG9uZSA9IHRydWU7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19ydW5Jbml0aWFsaXplcnModGhpc0FyZywgaW5pdGlhbGl6ZXJzLCB2YWx1ZSkge1xyXG4gICAgdmFyIHVzZVZhbHVlID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGluaXRpYWxpemVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhbHVlID0gdXNlVmFsdWUgPyBpbml0aWFsaXplcnNbaV0uY2FsbCh0aGlzQXJnLCB2YWx1ZSkgOiBpbml0aWFsaXplcnNbaV0uY2FsbCh0aGlzQXJnKTtcclxuICAgIH1cclxuICAgIHJldHVybiB1c2VWYWx1ZSA/IHZhbHVlIDogdm9pZCAwO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcHJvcEtleSh4KSB7XHJcbiAgICByZXR1cm4gdHlwZW9mIHggPT09IFwic3ltYm9sXCIgPyB4IDogXCJcIi5jb25jYXQoeCk7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zZXRGdW5jdGlvbk5hbWUoZiwgbmFtZSwgcHJlZml4KSB7XHJcbiAgICBpZiAodHlwZW9mIG5hbWUgPT09IFwic3ltYm9sXCIpIG5hbWUgPSBuYW1lLmRlc2NyaXB0aW9uID8gXCJbXCIuY29uY2F0KG5hbWUuZGVzY3JpcHRpb24sIFwiXVwiKSA6IFwiXCI7XHJcbiAgICByZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnR5KGYsIFwibmFtZVwiLCB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSwgdmFsdWU6IHByZWZpeCA/IFwiXCIuY29uY2F0KHByZWZpeCwgXCIgXCIsIG5hbWUpIDogbmFtZSB9KTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX21ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKSB7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QubWV0YWRhdGEgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIFJlZmxlY3QubWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdGVyKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XHJcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cclxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZ2VuZXJhdG9yKHRoaXNBcmcsIGJvZHkpIHtcclxuICAgIHZhciBfID0geyBsYWJlbDogMCwgc2VudDogZnVuY3Rpb24oKSB7IGlmICh0WzBdICYgMSkgdGhyb3cgdFsxXTsgcmV0dXJuIHRbMV07IH0sIHRyeXM6IFtdLCBvcHM6IFtdIH0sIGYsIHksIHQsIGcgPSBPYmplY3QuY3JlYXRlKCh0eXBlb2YgSXRlcmF0b3IgPT09IFwiZnVuY3Rpb25cIiA/IEl0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpO1xyXG4gICAgcmV0dXJuIGcubmV4dCA9IHZlcmIoMCksIGdbXCJ0aHJvd1wiXSA9IHZlcmIoMSksIGdbXCJyZXR1cm5cIl0gPSB2ZXJiKDIpLCB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgKGdbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSksIGc7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgcmV0dXJuIGZ1bmN0aW9uICh2KSB7IHJldHVybiBzdGVwKFtuLCB2XSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHN0ZXAob3ApIHtcclxuICAgICAgICBpZiAoZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7XHJcbiAgICAgICAgd2hpbGUgKGcgJiYgKGcgPSAwLCBvcFswXSAmJiAoXyA9IDApKSwgXykgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKGYgPSAxLCB5ICYmICh0ID0gb3BbMF0gJiAyID8geVtcInJldHVyblwiXSA6IG9wWzBdID8geVtcInRocm93XCJdIHx8ICgodCA9IHlbXCJyZXR1cm5cIl0pICYmIHQuY2FsbCh5KSwgMCkgOiB5Lm5leHQpICYmICEodCA9IHQuY2FsbCh5LCBvcFsxXSkpLmRvbmUpIHJldHVybiB0O1xyXG4gICAgICAgICAgICBpZiAoeSA9IDAsIHQpIG9wID0gW29wWzBdICYgMiwgdC52YWx1ZV07XHJcbiAgICAgICAgICAgIHN3aXRjaCAob3BbMF0pIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgMDogY2FzZSAxOiB0ID0gb3A7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA0OiBfLmxhYmVsKys7IHJldHVybiB7IHZhbHVlOiBvcFsxXSwgZG9uZTogZmFsc2UgfTtcclxuICAgICAgICAgICAgICAgIGNhc2UgNTogXy5sYWJlbCsrOyB5ID0gb3BbMV07IG9wID0gWzBdOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGNhc2UgNzogb3AgPSBfLm9wcy5wb3AoKTsgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEodCA9IF8udHJ5cywgdCA9IHQubGVuZ3RoID4gMCAmJiB0W3QubGVuZ3RoIC0gMV0pICYmIChvcFswXSA9PT0gNiB8fCBvcFswXSA9PT0gMikpIHsgXyA9IDA7IGNvbnRpbnVlOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSAzICYmICghdCB8fCAob3BbMV0gPiB0WzBdICYmIG9wWzFdIDwgdFszXSkpKSB7IF8ubGFiZWwgPSBvcFsxXTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDYgJiYgXy5sYWJlbCA8IHRbMV0pIHsgXy5sYWJlbCA9IHRbMV07IHQgPSBvcDsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodCAmJiBfLmxhYmVsIDwgdFsyXSkgeyBfLmxhYmVsID0gdFsyXTsgXy5vcHMucHVzaChvcCk7IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRbMl0pIF8ub3BzLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIF8udHJ5cy5wb3AoKTsgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgb3AgPSBib2R5LmNhbGwodGhpc0FyZywgXyk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkgeyBvcCA9IFs2LCBlXTsgeSA9IDA7IH0gZmluYWxseSB7IGYgPSB0ID0gMDsgfVxyXG4gICAgICAgIGlmIChvcFswXSAmIDUpIHRocm93IG9wWzFdOyByZXR1cm4geyB2YWx1ZTogb3BbMF0gPyBvcFsxXSA6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fY3JlYXRlQmluZGluZyA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobSwgayk7XHJcbiAgICBpZiAoIWRlc2MgfHwgKFwiZ2V0XCIgaW4gZGVzYyA/ICFtLl9fZXNNb2R1bGUgOiBkZXNjLndyaXRhYmxlIHx8IGRlc2MuY29uZmlndXJhYmxlKSkge1xyXG4gICAgICAgIGRlc2MgPSB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH07XHJcbiAgICB9XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIGRlc2MpO1xyXG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIG9bazJdID0gbVtrXTtcclxufSk7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHBvcnRTdGFyKG0sIG8pIHtcclxuICAgIGZvciAodmFyIHAgaW4gbSkgaWYgKHAgIT09IFwiZGVmYXVsdFwiICYmICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobywgcCkpIF9fY3JlYXRlQmluZGluZyhvLCBtLCBwKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fdmFsdWVzKG8pIHtcclxuICAgIHZhciBzID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIFN5bWJvbC5pdGVyYXRvciwgbSA9IHMgJiYgb1tzXSwgaSA9IDA7XHJcbiAgICBpZiAobSkgcmV0dXJuIG0uY2FsbChvKTtcclxuICAgIGlmIChvICYmIHR5cGVvZiBvLmxlbmd0aCA9PT0gXCJudW1iZXJcIikgcmV0dXJuIHtcclxuICAgICAgICBuZXh0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmIChvICYmIGkgPj0gby5sZW5ndGgpIG8gPSB2b2lkIDA7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiBvICYmIG9baSsrXSwgZG9uZTogIW8gfTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihzID8gXCJPYmplY3QgaXMgbm90IGl0ZXJhYmxlLlwiIDogXCJTeW1ib2wuaXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZWFkKG8sIG4pIHtcclxuICAgIHZhciBtID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9bU3ltYm9sLml0ZXJhdG9yXTtcclxuICAgIGlmICghbSkgcmV0dXJuIG87XHJcbiAgICB2YXIgaSA9IG0uY2FsbChvKSwgciwgYXIgPSBbXSwgZTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgd2hpbGUgKChuID09PSB2b2lkIDAgfHwgbi0tID4gMCkgJiYgIShyID0gaS5uZXh0KCkpLmRvbmUpIGFyLnB1c2goci52YWx1ZSk7XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZXJyb3IpIHsgZSA9IHsgZXJyb3I6IGVycm9yIH07IH1cclxuICAgIGZpbmFsbHkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChyICYmICFyLmRvbmUgJiYgKG0gPSBpW1wicmV0dXJuXCJdKSkgbS5jYWxsKGkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmaW5hbGx5IHsgaWYgKGUpIHRocm93IGUuZXJyb3I7IH1cclxuICAgIH1cclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuLyoqIEBkZXByZWNhdGVkICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZCgpIHtcclxuICAgIGZvciAodmFyIGFyID0gW10sIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgIGFyID0gYXIuY29uY2F0KF9fcmVhZChhcmd1bWVudHNbaV0pKTtcclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuLyoqIEBkZXByZWNhdGVkICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZEFycmF5cygpIHtcclxuICAgIGZvciAodmFyIHMgPSAwLCBpID0gMCwgaWwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgaWw7IGkrKykgcyArPSBhcmd1bWVudHNbaV0ubGVuZ3RoO1xyXG4gICAgZm9yICh2YXIgciA9IEFycmF5KHMpLCBrID0gMCwgaSA9IDA7IGkgPCBpbDsgaSsrKVxyXG4gICAgICAgIGZvciAodmFyIGEgPSBhcmd1bWVudHNbaV0sIGogPSAwLCBqbCA9IGEubGVuZ3RoOyBqIDwgamw7IGorKywgaysrKVxyXG4gICAgICAgICAgICByW2tdID0gYVtqXTtcclxuICAgIHJldHVybiByO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheSh0bywgZnJvbSwgcGFjaykge1xyXG4gICAgaWYgKHBhY2sgfHwgYXJndW1lbnRzLmxlbmd0aCA9PT0gMikgZm9yICh2YXIgaSA9IDAsIGwgPSBmcm9tLmxlbmd0aCwgYXI7IGkgPCBsOyBpKyspIHtcclxuICAgICAgICBpZiAoYXIgfHwgIShpIGluIGZyb20pKSB7XHJcbiAgICAgICAgICAgIGlmICghYXIpIGFyID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZnJvbSwgMCwgaSk7XHJcbiAgICAgICAgICAgIGFyW2ldID0gZnJvbVtpXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdG8uY29uY2F0KGFyIHx8IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZyb20pKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXQodikge1xyXG4gICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfX2F3YWl0ID8gKHRoaXMudiA9IHYsIHRoaXMpIDogbmV3IF9fYXdhaXQodik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jR2VuZXJhdG9yKHRoaXNBcmcsIF9hcmd1bWVudHMsIGdlbmVyYXRvcikge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBnID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pLCBpLCBxID0gW107XHJcbiAgICByZXR1cm4gaSA9IE9iamVjdC5jcmVhdGUoKHR5cGVvZiBBc3luY0l0ZXJhdG9yID09PSBcImZ1bmN0aW9uXCIgPyBBc3luY0l0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpLCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIsIGF3YWl0UmV0dXJuKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gYXdhaXRSZXR1cm4oZikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh2KS50aGVuKGYsIHJlamVjdCk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpZiAoZ1tuXSkgeyBpW25dID0gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChhLCBiKSB7IHEucHVzaChbbiwgdiwgYSwgYl0pID4gMSB8fCByZXN1bWUobiwgdik7IH0pOyB9OyBpZiAoZikgaVtuXSA9IGYoaVtuXSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gcmVzdW1lKG4sIHYpIHsgdHJ5IHsgc3RlcChnW25dKHYpKTsgfSBjYXRjaCAoZSkgeyBzZXR0bGUocVswXVszXSwgZSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gc3RlcChyKSB7IHIudmFsdWUgaW5zdGFuY2VvZiBfX2F3YWl0ID8gUHJvbWlzZS5yZXNvbHZlKHIudmFsdWUudikudGhlbihmdWxmaWxsLCByZWplY3QpIDogc2V0dGxlKHFbMF1bMl0sIHIpOyB9XHJcbiAgICBmdW5jdGlvbiBmdWxmaWxsKHZhbHVlKSB7IHJlc3VtZShcIm5leHRcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiByZWplY3QodmFsdWUpIHsgcmVzdW1lKFwidGhyb3dcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUoZiwgdikgeyBpZiAoZih2KSwgcS5zaGlmdCgpLCBxLmxlbmd0aCkgcmVzdW1lKHFbMF1bMF0sIHFbMF1bMV0pOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jRGVsZWdhdG9yKG8pIHtcclxuICAgIHZhciBpLCBwO1xyXG4gICAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiLCBmdW5jdGlvbiAoZSkgeyB0aHJvdyBlOyB9KSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpW25dID0gb1tuXSA/IGZ1bmN0aW9uICh2KSB7IHJldHVybiAocCA9ICFwKSA/IHsgdmFsdWU6IF9fYXdhaXQob1tuXSh2KSksIGRvbmU6IGZhbHNlIH0gOiBmID8gZih2KSA6IHY7IH0gOiBmOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jVmFsdWVzKG8pIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xyXG4gICAgcmV0dXJuIG0gPyBtLmNhbGwobykgOiAobyA9IHR5cGVvZiBfX3ZhbHVlcyA9PT0gXCJmdW5jdGlvblwiID8gX192YWx1ZXMobykgOiBvW1N5bWJvbC5pdGVyYXRvcl0oKSwgaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGkpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IGlbbl0gPSBvW25dICYmIGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IHYgPSBvW25dKHYpLCBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCB2LmRvbmUsIHYudmFsdWUpOyB9KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tYWtlVGVtcGxhdGVPYmplY3QoY29va2VkLCByYXcpIHtcclxuICAgIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvb2tlZCwgXCJyYXdcIiwgeyB2YWx1ZTogcmF3IH0pOyB9IGVsc2UgeyBjb29rZWQucmF3ID0gcmF3OyB9XHJcbiAgICByZXR1cm4gY29va2VkO1xyXG59O1xyXG5cclxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xyXG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcclxufTtcclxuXHJcbnZhciBvd25LZXlzID0gZnVuY3Rpb24obykge1xyXG4gICAgb3duS2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzIHx8IGZ1bmN0aW9uIChvKSB7XHJcbiAgICAgICAgdmFyIGFyID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgayBpbiBvKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIGspKSBhclthci5sZW5ndGhdID0gaztcclxuICAgICAgICByZXR1cm4gYXI7XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIG93bktleXMobyk7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19pbXBvcnRTdGFyKG1vZCkge1xyXG4gICAgaWYgKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgcmV0dXJuIG1vZDtcclxuICAgIHZhciByZXN1bHQgPSB7fTtcclxuICAgIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayA9IG93bktleXMobW9kKSwgaSA9IDA7IGkgPCBrLmxlbmd0aDsgaSsrKSBpZiAoa1tpXSAhPT0gXCJkZWZhdWx0XCIpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwga1tpXSk7XHJcbiAgICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9faW1wb3J0RGVmYXVsdChtb2QpIHtcclxuICAgIHJldHVybiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSA/IG1vZCA6IHsgZGVmYXVsdDogbW9kIH07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkR2V0KHJlY2VpdmVyLCBzdGF0ZSwga2luZCwgZikge1xyXG4gICAgaWYgKGtpbmQgPT09IFwiYVwiICYmICFmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBhY2Nlc3NvciB3YXMgZGVmaW5lZCB3aXRob3V0IGEgZ2V0dGVyXCIpO1xyXG4gICAgaWYgKHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgIT09IHN0YXRlIHx8ICFmIDogIXN0YXRlLmhhcyhyZWNlaXZlcikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgcmVhZCBwcml2YXRlIG1lbWJlciBmcm9tIGFuIG9iamVjdCB3aG9zZSBjbGFzcyBkaWQgbm90IGRlY2xhcmUgaXRcIik7XHJcbiAgICByZXR1cm4ga2luZCA9PT0gXCJtXCIgPyBmIDoga2luZCA9PT0gXCJhXCIgPyBmLmNhbGwocmVjZWl2ZXIpIDogZiA/IGYudmFsdWUgOiBzdGF0ZS5nZXQocmVjZWl2ZXIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZFNldChyZWNlaXZlciwgc3RhdGUsIHZhbHVlLCBraW5kLCBmKSB7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJtXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIG1ldGhvZCBpcyBub3Qgd3JpdGFibGVcIik7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJhXCIgJiYgIWYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIGFjY2Vzc29yIHdhcyBkZWZpbmVkIHdpdGhvdXQgYSBzZXR0ZXJcIik7XHJcbiAgICBpZiAodHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciAhPT0gc3RhdGUgfHwgIWYgOiAhc3RhdGUuaGFzKHJlY2VpdmVyKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCB3cml0ZSBwcml2YXRlIG1lbWJlciB0byBhbiBvYmplY3Qgd2hvc2UgY2xhc3MgZGlkIG5vdCBkZWNsYXJlIGl0XCIpO1xyXG4gICAgcmV0dXJuIChraW5kID09PSBcImFcIiA/IGYuY2FsbChyZWNlaXZlciwgdmFsdWUpIDogZiA/IGYudmFsdWUgPSB2YWx1ZSA6IHN0YXRlLnNldChyZWNlaXZlciwgdmFsdWUpKSwgdmFsdWU7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkSW4oc3RhdGUsIHJlY2VpdmVyKSB7XHJcbiAgICBpZiAocmVjZWl2ZXIgPT09IG51bGwgfHwgKHR5cGVvZiByZWNlaXZlciAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgcmVjZWl2ZXIgIT09IFwiZnVuY3Rpb25cIikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgdXNlICdpbicgb3BlcmF0b3Igb24gbm9uLW9iamVjdFwiKTtcclxuICAgIHJldHVybiB0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyID09PSBzdGF0ZSA6IHN0YXRlLmhhcyhyZWNlaXZlcik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZShlbnYsIHZhbHVlLCBhc3luYykge1xyXG4gICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB2b2lkIDApIHtcclxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiB2YWx1ZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IGV4cGVjdGVkLlwiKTtcclxuICAgICAgICB2YXIgZGlzcG9zZSwgaW5uZXI7XHJcbiAgICAgICAgaWYgKGFzeW5jKSB7XHJcbiAgICAgICAgICAgIGlmICghU3ltYm9sLmFzeW5jRGlzcG9zZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0Rpc3Bvc2UgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgICAgICAgICBkaXNwb3NlID0gdmFsdWVbU3ltYm9sLmFzeW5jRGlzcG9zZV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChkaXNwb3NlID09PSB2b2lkIDApIHtcclxuICAgICAgICAgICAgaWYgKCFTeW1ib2wuZGlzcG9zZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5kaXNwb3NlIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgICAgICAgICAgZGlzcG9zZSA9IHZhbHVlW1N5bWJvbC5kaXNwb3NlXTtcclxuICAgICAgICAgICAgaWYgKGFzeW5jKSBpbm5lciA9IGRpc3Bvc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0eXBlb2YgZGlzcG9zZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IG5vdCBkaXNwb3NhYmxlLlwiKTtcclxuICAgICAgICBpZiAoaW5uZXIpIGRpc3Bvc2UgPSBmdW5jdGlvbigpIHsgdHJ5IHsgaW5uZXIuY2FsbCh0aGlzKTsgfSBjYXRjaCAoZSkgeyByZXR1cm4gUHJvbWlzZS5yZWplY3QoZSk7IH0gfTtcclxuICAgICAgICBlbnYuc3RhY2sucHVzaCh7IHZhbHVlOiB2YWx1ZSwgZGlzcG9zZTogZGlzcG9zZSwgYXN5bmM6IGFzeW5jIH0pO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoYXN5bmMpIHtcclxuICAgICAgICBlbnYuc3RhY2sucHVzaCh7IGFzeW5jOiB0cnVlIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG5cclxufVxyXG5cclxudmFyIF9TdXBwcmVzc2VkRXJyb3IgPSB0eXBlb2YgU3VwcHJlc3NlZEVycm9yID09PSBcImZ1bmN0aW9uXCIgPyBTdXBwcmVzc2VkRXJyb3IgOiBmdW5jdGlvbiAoZXJyb3IsIHN1cHByZXNzZWQsIG1lc3NhZ2UpIHtcclxuICAgIHZhciBlID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xyXG4gICAgcmV0dXJuIGUubmFtZSA9IFwiU3VwcHJlc3NlZEVycm9yXCIsIGUuZXJyb3IgPSBlcnJvciwgZS5zdXBwcmVzc2VkID0gc3VwcHJlc3NlZCwgZTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2Rpc3Bvc2VSZXNvdXJjZXMoZW52KSB7XHJcbiAgICBmdW5jdGlvbiBmYWlsKGUpIHtcclxuICAgICAgICBlbnYuZXJyb3IgPSBlbnYuaGFzRXJyb3IgPyBuZXcgX1N1cHByZXNzZWRFcnJvcihlLCBlbnYuZXJyb3IsIFwiQW4gZXJyb3Igd2FzIHN1cHByZXNzZWQgZHVyaW5nIGRpc3Bvc2FsLlwiKSA6IGU7XHJcbiAgICAgICAgZW52Lmhhc0Vycm9yID0gdHJ1ZTtcclxuICAgIH1cclxuICAgIHZhciByLCBzID0gMDtcclxuICAgIGZ1bmN0aW9uIG5leHQoKSB7XHJcbiAgICAgICAgd2hpbGUgKHIgPSBlbnYuc3RhY2sucG9wKCkpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGlmICghci5hc3luYyAmJiBzID09PSAxKSByZXR1cm4gcyA9IDAsIGVudi5zdGFjay5wdXNoKHIpLCBQcm9taXNlLnJlc29sdmUoKS50aGVuKG5leHQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHIuZGlzcG9zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSByLmRpc3Bvc2UuY2FsbChyLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoci5hc3luYykgcmV0dXJuIHMgfD0gMiwgUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCkudGhlbihuZXh0LCBmdW5jdGlvbihlKSB7IGZhaWwoZSk7IHJldHVybiBuZXh0KCk7IH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBzIHw9IDE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIGZhaWwoZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHMgPT09IDEpIHJldHVybiBlbnYuaGFzRXJyb3IgPyBQcm9taXNlLnJlamVjdChlbnYuZXJyb3IpIDogUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgaWYgKGVudi5oYXNFcnJvcikgdGhyb3cgZW52LmVycm9yO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5leHQoKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmV3cml0ZVJlbGF0aXZlSW1wb3J0RXh0ZW5zaW9uKHBhdGgsIHByZXNlcnZlSnN4KSB7XHJcbiAgICBpZiAodHlwZW9mIHBhdGggPT09IFwic3RyaW5nXCIgJiYgL15cXC5cXC4/XFwvLy50ZXN0KHBhdGgpKSB7XHJcbiAgICAgICAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFwuKHRzeCkkfCgoPzpcXC5kKT8pKCg/OlxcLlteLi9dKz8pPylcXC4oW2NtXT8pdHMkL2ksIGZ1bmN0aW9uIChtLCB0c3gsIGQsIGV4dCwgY20pIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRzeCA/IHByZXNlcnZlSnN4ID8gXCIuanN4XCIgOiBcIi5qc1wiIDogZCAmJiAoIWV4dCB8fCAhY20pID8gbSA6IChkICsgZXh0ICsgXCIuXCIgKyBjbS50b0xvd2VyQ2FzZSgpICsgXCJqc1wiKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiBwYXRoO1xyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCB7XHJcbiAgICBfX2V4dGVuZHM6IF9fZXh0ZW5kcyxcclxuICAgIF9fYXNzaWduOiBfX2Fzc2lnbixcclxuICAgIF9fcmVzdDogX19yZXN0LFxyXG4gICAgX19kZWNvcmF0ZTogX19kZWNvcmF0ZSxcclxuICAgIF9fcGFyYW06IF9fcGFyYW0sXHJcbiAgICBfX2VzRGVjb3JhdGU6IF9fZXNEZWNvcmF0ZSxcclxuICAgIF9fcnVuSW5pdGlhbGl6ZXJzOiBfX3J1bkluaXRpYWxpemVycyxcclxuICAgIF9fcHJvcEtleTogX19wcm9wS2V5LFxyXG4gICAgX19zZXRGdW5jdGlvbk5hbWU6IF9fc2V0RnVuY3Rpb25OYW1lLFxyXG4gICAgX19tZXRhZGF0YTogX19tZXRhZGF0YSxcclxuICAgIF9fYXdhaXRlcjogX19hd2FpdGVyLFxyXG4gICAgX19nZW5lcmF0b3I6IF9fZ2VuZXJhdG9yLFxyXG4gICAgX19jcmVhdGVCaW5kaW5nOiBfX2NyZWF0ZUJpbmRpbmcsXHJcbiAgICBfX2V4cG9ydFN0YXI6IF9fZXhwb3J0U3RhcixcclxuICAgIF9fdmFsdWVzOiBfX3ZhbHVlcyxcclxuICAgIF9fcmVhZDogX19yZWFkLFxyXG4gICAgX19zcHJlYWQ6IF9fc3ByZWFkLFxyXG4gICAgX19zcHJlYWRBcnJheXM6IF9fc3ByZWFkQXJyYXlzLFxyXG4gICAgX19zcHJlYWRBcnJheTogX19zcHJlYWRBcnJheSxcclxuICAgIF9fYXdhaXQ6IF9fYXdhaXQsXHJcbiAgICBfX2FzeW5jR2VuZXJhdG9yOiBfX2FzeW5jR2VuZXJhdG9yLFxyXG4gICAgX19hc3luY0RlbGVnYXRvcjogX19hc3luY0RlbGVnYXRvcixcclxuICAgIF9fYXN5bmNWYWx1ZXM6IF9fYXN5bmNWYWx1ZXMsXHJcbiAgICBfX21ha2VUZW1wbGF0ZU9iamVjdDogX19tYWtlVGVtcGxhdGVPYmplY3QsXHJcbiAgICBfX2ltcG9ydFN0YXI6IF9faW1wb3J0U3RhcixcclxuICAgIF9faW1wb3J0RGVmYXVsdDogX19pbXBvcnREZWZhdWx0LFxyXG4gICAgX19jbGFzc1ByaXZhdGVGaWVsZEdldDogX19jbGFzc1ByaXZhdGVGaWVsZEdldCxcclxuICAgIF9fY2xhc3NQcml2YXRlRmllbGRTZXQ6IF9fY2xhc3NQcml2YXRlRmllbGRTZXQsXHJcbiAgICBfX2NsYXNzUHJpdmF0ZUZpZWxkSW46IF9fY2xhc3NQcml2YXRlRmllbGRJbixcclxuICAgIF9fYWRkRGlzcG9zYWJsZVJlc291cmNlOiBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZSxcclxuICAgIF9fZGlzcG9zZVJlc291cmNlczogX19kaXNwb3NlUmVzb3VyY2VzLFxyXG4gICAgX19yZXdyaXRlUmVsYXRpdmVJbXBvcnRFeHRlbnNpb246IF9fcmV3cml0ZVJlbGF0aXZlSW1wb3J0RXh0ZW5zaW9uLFxyXG59O1xyXG4iLCJpbXBvcnQgeyBOb3RpY2UgfSBmcm9tICdvYnNpZGlhbic7XG5cbi8vIEVWRU5UIEJVUyBTWVNURU1cbmV4cG9ydCBjbGFzcyBUaW55RW1pdHRlciB7XG4gICAgcHJpdmF0ZSBsaXN0ZW5lcnM6IHsgW2tleTogc3RyaW5nXTogRnVuY3Rpb25bXSB9ID0ge307XG5cbiAgICBvbihldmVudDogc3RyaW5nLCBmbjogRnVuY3Rpb24pIHtcbiAgICAgICAgKHRoaXMubGlzdGVuZXJzW2V2ZW50XSA9IHRoaXMubGlzdGVuZXJzW2V2ZW50XSB8fCBbXSkucHVzaChmbik7XG4gICAgfVxuXG4gICAgb2ZmKGV2ZW50OiBzdHJpbmcsIGZuOiBGdW5jdGlvbikge1xuICAgICAgICBpZiAoIXRoaXMubGlzdGVuZXJzW2V2ZW50XSkgcmV0dXJuO1xuICAgICAgICB0aGlzLmxpc3RlbmVyc1tldmVudF0gPSB0aGlzLmxpc3RlbmVyc1tldmVudF0uZmlsdGVyKGYgPT4gZiAhPT0gZm4pO1xuICAgIH1cblxuICAgIHRyaWdnZXIoZXZlbnQ6IHN0cmluZywgZGF0YT86IGFueSkge1xuICAgICAgICAodGhpcy5saXN0ZW5lcnNbZXZlbnRdIHx8IFtdKS5mb3JFYWNoKGZuID0+IGZuKGRhdGEpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBBdWRpb0NvbnRyb2xsZXIge1xuICAgIGF1ZGlvQ3R4OiBBdWRpb0NvbnRleHQgfCBudWxsID0gbnVsbDtcbiAgICBicm93bk5vaXNlTm9kZTogU2NyaXB0UHJvY2Vzc29yTm9kZSB8IG51bGwgPSBudWxsO1xuICAgIG11dGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgICBjb25zdHJ1Y3RvcihtdXRlZDogYm9vbGVhbikgeyB0aGlzLm11dGVkID0gbXV0ZWQ7IH1cblxuICAgIHNldE11dGVkKG11dGVkOiBib29sZWFuKSB7IHRoaXMubXV0ZWQgPSBtdXRlZDsgfVxuXG4gICAgaW5pdEF1ZGlvKCkgeyBpZiAoIXRoaXMuYXVkaW9DdHgpIHRoaXMuYXVkaW9DdHggPSBuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgKHdpbmRvdyBhcyBhbnkpLndlYmtpdEF1ZGlvQ29udGV4dCkoKTsgfVxuXG4gICAgcGxheVRvbmUoZnJlcTogbnVtYmVyLCB0eXBlOiBPc2NpbGxhdG9yVHlwZSwgZHVyYXRpb246IG51bWJlciwgdm9sOiBudW1iZXIgPSAwLjEpIHtcbiAgICAgICAgaWYgKHRoaXMubXV0ZWQpIHJldHVybjtcbiAgICAgICAgdGhpcy5pbml0QXVkaW8oKTtcbiAgICAgICAgY29uc3Qgb3NjID0gdGhpcy5hdWRpb0N0eCEuY3JlYXRlT3NjaWxsYXRvcigpO1xuICAgICAgICBjb25zdCBnYWluID0gdGhpcy5hdWRpb0N0eCEuY3JlYXRlR2FpbigpO1xuICAgICAgICBvc2MudHlwZSA9IHR5cGU7XG4gICAgICAgIG9zYy5mcmVxdWVuY3kudmFsdWUgPSBmcmVxO1xuICAgICAgICBvc2MuY29ubmVjdChnYWluKTtcbiAgICAgICAgZ2Fpbi5jb25uZWN0KHRoaXMuYXVkaW9DdHghLmRlc3RpbmF0aW9uKTtcbiAgICAgICAgb3NjLnN0YXJ0KCk7XG4gICAgICAgIGdhaW4uZ2Fpbi5zZXRWYWx1ZUF0VGltZSh2b2wsIHRoaXMuYXVkaW9DdHghLmN1cnJlbnRUaW1lKTtcbiAgICAgICAgZ2Fpbi5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoMC4wMDAwMSwgdGhpcy5hdWRpb0N0eCEuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG4gICAgICAgIG9zYy5zdG9wKHRoaXMuYXVkaW9DdHghLmN1cnJlbnRUaW1lICsgZHVyYXRpb24pO1xuICAgIH1cblxuICAgIHBsYXlTb3VuZCh0eXBlOiBcInN1Y2Nlc3NcInxcImZhaWxcInxcImRlYXRoXCJ8XCJjbGlja1wifFwiaGVhcnRiZWF0XCJ8XCJtZWRpdGF0ZVwiKSB7XG4gICAgICAgIGlmICh0eXBlID09PSBcInN1Y2Nlc3NcIikgeyB0aGlzLnBsYXlUb25lKDYwMCwgXCJzaW5lXCIsIDAuMSk7IHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wbGF5VG9uZSg4MDAsIFwic2luZVwiLCAwLjIpLCAxMDApOyB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFwiZmFpbFwiKSB7IHRoaXMucGxheVRvbmUoMTUwLCBcInNhd3Rvb3RoXCIsIDAuNCk7IHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wbGF5VG9uZSgxMDAsIFwic2F3dG9vdGhcIiwgMC40KSwgMTUwKTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcImRlYXRoXCIpIHsgdGhpcy5wbGF5VG9uZSg1MCwgXCJzcXVhcmVcIiwgMS4wKTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcImNsaWNrXCIpIHsgdGhpcy5wbGF5VG9uZSg4MDAsIFwic2luZVwiLCAwLjA1KTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcImhlYXJ0YmVhdFwiKSB7IHRoaXMucGxheVRvbmUoNjAsIFwic2luZVwiLCAwLjEsIDAuNSk7IHNldFRpbWVvdXQoKCk9PnRoaXMucGxheVRvbmUoNTAsIFwic2luZVwiLCAwLjEsIDAuNCksIDE1MCk7IH1cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gXCJtZWRpdGF0ZVwiKSB7IHRoaXMucGxheVRvbmUoNDMyLCBcInNpbmVcIiwgMi4wLCAwLjA1KTsgfVxuICAgIH1cblxuICAgIHRvZ2dsZUJyb3duTm9pc2UoKSB7XG4gICAgICAgIHRoaXMuaW5pdEF1ZGlvKCk7XG4gICAgICAgIGlmICh0aGlzLmJyb3duTm9pc2VOb2RlKSB7IFxuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZS5kaXNjb25uZWN0KCk7IFxuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZSA9IG51bGw7IFxuICAgICAgICAgICAgbmV3IE5vdGljZShcIkZvY3VzIEF1ZGlvOiBPRkZcIik7IFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgYnVmZmVyU2l6ZSA9IDQwOTY7IFxuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZSA9IHRoaXMuYXVkaW9DdHghLmNyZWF0ZVNjcmlwdFByb2Nlc3NvcihidWZmZXJTaXplLCAxLCAxKTtcbiAgICAgICAgICAgIGxldCBsYXN0T3V0ID0gMDtcbiAgICAgICAgICAgIHRoaXMuYnJvd25Ob2lzZU5vZGUub25hdWRpb3Byb2Nlc3MgPSAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG91dHB1dCA9IGUub3V0cHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnVmZmVyU2l6ZTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdoaXRlID0gTWF0aC5yYW5kb20oKSAqIDIgLSAxOyBcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0W2ldID0gKGxhc3RPdXQgKyAoMC4wMiAqIHdoaXRlKSkgLyAxLjAyOyBcbiAgICAgICAgICAgICAgICAgICAgbGFzdE91dCA9IG91dHB1dFtpXTsgXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dFtpXSAqPSAwLjE7IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLmJyb3duTm9pc2VOb2RlLmNvbm5lY3QodGhpcy5hdWRpb0N0eCEuZGVzdGluYXRpb24pO1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIkZvY3VzIEF1ZGlvOiBPTiAoQnJvd24gTm9pc2UpXCIpO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgQXBwLCBNb2RhbCwgU2V0dGluZywgTm90aWNlLCBtb21lbnQsIFRGaWxlLCBURm9sZGVyIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IFNpc3lwaHVzUGx1Z2luIGZyb20gJy4uL21haW4nOyAvLyBGaXg6IERlZmF1bHQgSW1wb3J0XG5pbXBvcnQgeyBNb2RpZmllciB9IGZyb20gJy4uL3R5cGVzJztcblxuZXhwb3J0IGNsYXNzIENoYW9zTW9kYWwgZXh0ZW5kcyBNb2RhbCB7IFxuICAgIG1vZGlmaWVyOiBNb2RpZmllcjsgXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIG06IE1vZGlmaWVyKSB7IHN1cGVyKGFwcCk7IHRoaXMubW9kaWZpZXI9bTsgfSBcbiAgICBvbk9wZW4oKSB7IFxuICAgICAgICBjb25zdCBjID0gdGhpcy5jb250ZW50RWw7IFxuICAgICAgICBjb25zdCBoMSA9IGMuY3JlYXRlRWwoXCJoMVwiLCB7IHRleHQ6IFwiVEhFIE9NRU5cIiB9KTsgXG4gICAgICAgIGgxLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJ0ZXh0LWFsaWduOmNlbnRlcjsgY29sb3I6I2Y1NTtcIik7IFxuICAgICAgICBjb25zdCBpYyA9IGMuY3JlYXRlRWwoXCJkaXZcIiwgeyB0ZXh0OiB0aGlzLm1vZGlmaWVyLmljb24gfSk7IFxuICAgICAgICBpYy5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwiZm9udC1zaXplOjgwcHg7IHRleHQtYWxpZ246Y2VudGVyO1wiKTsgXG4gICAgICAgIGNvbnN0IGgyID0gYy5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogdGhpcy5tb2RpZmllci5uYW1lIH0pOyBcbiAgICAgICAgaDIuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcInRleHQtYWxpZ246Y2VudGVyO1wiKTsgXG4gICAgICAgIGNvbnN0IHAgPSBjLmNyZWF0ZUVsKFwicFwiLCB7dGV4dDogdGhpcy5tb2RpZmllci5kZXNjfSk7IFxuICAgICAgICBwLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJ0ZXh0LWFsaWduOmNlbnRlclwiKTsgXG4gICAgICAgIGNvbnN0IGIgPSBjLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHt0ZXh0OlwiQWNrbm93bGVkZ2VcIn0pOyBcbiAgICAgICAgYi5hZGRDbGFzcyhcIm1vZC1jdGFcIik7IFxuICAgICAgICBiLnN0eWxlLmRpc3BsYXk9XCJibG9ja1wiOyBcbiAgICAgICAgYi5zdHlsZS5tYXJnaW49XCIyMHB4IGF1dG9cIjsgXG4gICAgICAgIGIub25jbGljaz0oKT0+dGhpcy5jbG9zZSgpOyBcbiAgICB9IFxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH0gXG59XG5cbmV4cG9ydCBjbGFzcyBTaG9wTW9kYWwgZXh0ZW5kcyBNb2RhbCB7IFxuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47IFxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9IFxuICAgIG9uT3BlbigpIHsgXG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzOyBcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIvCfm5IgQkxBQ0sgTUFSS0VUXCIgfSk7IFxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFB1cnNlOiDwn6qZICR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZH1gIH0pOyBcbiAgICAgICAgXG4gICAgICAgIHRoaXMuaXRlbShjb250ZW50RWwsIFwi8J+SiSBTdGltcGFja1wiLCBcIkhlYWwgMjAgSFBcIiwgNTAsIGFzeW5jICgpID0+IHsgXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ocCA9IE1hdGgubWluKHRoaXMucGx1Z2luLnNldHRpbmdzLm1heEhwLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ocCArIDIwKTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgdGhpcy5pdGVtKGNvbnRlbnRFbCwgXCLwn5KjIFNhYm90YWdlXCIsIFwiLTUgUml2YWwgRG1nXCIsIDIwMCwgYXN5bmMgKCkgPT4geyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnJpdmFsRG1nID0gTWF0aC5tYXgoNSwgdGhpcy5wbHVnaW4uc2V0dGluZ3Mucml2YWxEbWcgLSA1KTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgdGhpcy5pdGVtKGNvbnRlbnRFbCwgXCLwn5uh77iPIFNoaWVsZFwiLCBcIjI0aCBQcm90ZWN0aW9uXCIsIDE1MCwgYXN5bmMgKCkgPT4geyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNoaWVsZGVkVW50aWwgPSBtb21lbnQoKS5hZGQoMjQsICdob3VycycpLnRvSVNPU3RyaW5nKCk7IFxuICAgICAgICB9KTsgXG4gICAgICAgIHRoaXMuaXRlbShjb250ZW50RWwsIFwi8J+YtCBSZXN0IERheVwiLCBcIlNhZmUgZm9yIDI0aFwiLCAxMDAsIGFzeW5jICgpID0+IHsgXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXN0RGF5VW50aWwgPSBtb21lbnQoKS5hZGQoMjQsICdob3VycycpLnRvSVNPU3RyaW5nKCk7IFxuICAgICAgICB9KTsgXG4gICAgfSBcbiAgICBpdGVtKGVsOiBIVE1MRWxlbWVudCwgbmFtZTogc3RyaW5nLCBkZXNjOiBzdHJpbmcsIGNvc3Q6IG51bWJlciwgZWZmZWN0OiAoKSA9PiBQcm9taXNlPHZvaWQ+KSB7IFxuICAgICAgICBjb25zdCBjID0gZWwuY3JlYXRlRGl2KCk7IFxuICAgICAgICBjLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTpmbGV4OyBqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjsgcGFkZGluZzoxMHB4IDA7IGJvcmRlci1ib3R0b206MXB4IHNvbGlkICMzMzM7XCIpOyBcbiAgICAgICAgY29uc3QgaSA9IGMuY3JlYXRlRGl2KCk7IFxuICAgICAgICBpLmNyZWF0ZUVsKFwiYlwiLCB7IHRleHQ6IG5hbWUgfSk7IFxuICAgICAgICBpLmNyZWF0ZUVsKFwiZGl2XCIsIHsgdGV4dDogZGVzYyB9KTsgXG4gICAgICAgIGNvbnN0IGIgPSBjLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogYCR7Y29zdH0gR2AgfSk7IFxuICAgICAgICBpZih0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIDwgY29zdCkgeyBcbiAgICAgICAgICAgIGIuc2V0QXR0cmlidXRlKFwiZGlzYWJsZWRcIixcInRydWVcIik7IGIuc3R5bGUub3BhY2l0eT1cIjAuNVwiOyBcbiAgICAgICAgfSBlbHNlIHsgXG4gICAgICAgICAgICBiLmFkZENsYXNzKFwibW9kLWN0YVwiKTsgXG4gICAgICAgICAgICBiLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7IFxuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmdvbGQgLT0gY29zdDsgXG4gICAgICAgICAgICAgICAgYXdhaXQgZWZmZWN0KCk7IFxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5zYXZlKCk7IFxuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYEJvdWdodCAke25hbWV9YCk7IFxuICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTsgXG4gICAgICAgICAgICAgICAgbmV3IFNob3BNb2RhbCh0aGlzLmFwcCx0aGlzLnBsdWdpbikub3BlbigpOyBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBcbiAgICB9IFxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH0gXG59XG5cbmV4cG9ydCBjbGFzcyBRdWVzdE1vZGFsIGV4dGVuZHMgTW9kYWwgeyBcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luOyBcbiAgICBuYW1lOiBzdHJpbmc7IGRpZmZpY3VsdHk6IG51bWJlciA9IDM7IHNraWxsOiBzdHJpbmcgPSBcIk5vbmVcIjsgc2VjU2tpbGw6IHN0cmluZyA9IFwiTm9uZVwiOyBkZWFkbGluZTogc3RyaW5nID0gXCJcIjsgaGlnaFN0YWtlczogYm9vbGVhbiA9IGZhbHNlOyBpc0Jvc3M6IGJvb2xlYW4gPSBmYWxzZTsgXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHsgc3VwZXIoYXBwKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH0gXG4gICAgb25PcGVuKCkgeyBcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7IFxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwi4pqU77iPIERFUExPWU1FTlRcIiB9KTsgXG4gICAgICAgIFxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJPYmplY3RpdmVcIikuYWRkVGV4dCh0ID0+IHsgXG4gICAgICAgICAgICB0Lm9uQ2hhbmdlKHYgPT4gdGhpcy5uYW1lID0gdik7IFxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0LmlucHV0RWwuZm9jdXMoKSwgNTApOyBcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiRGlmZmljdWx0eVwiKS5hZGREcm9wZG93bihkID0+IGQuYWRkT3B0aW9uKFwiMVwiLFwiVHJpdmlhbFwiKS5hZGRPcHRpb24oXCIyXCIsXCJFYXN5XCIpLmFkZE9wdGlvbihcIjNcIixcIk1lZGl1bVwiKS5hZGRPcHRpb24oXCI0XCIsXCJIYXJkXCIpLmFkZE9wdGlvbihcIjVcIixcIlNVSUNJREVcIikuc2V0VmFsdWUoXCIzXCIpLm9uQ2hhbmdlKHY9PnRoaXMuZGlmZmljdWx0eT1wYXJzZUludCh2KSkpOyBcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNraWxsczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsgXCJOb25lXCI6IFwiTm9uZVwiIH07IFxuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5za2lsbHMuZm9yRWFjaChzID0+IHNraWxsc1tzLm5hbWVdID0gcy5uYW1lKTsgXG4gICAgICAgIHNraWxsc1tcIisgTmV3XCJdID0gXCIrIE5ld1wiOyBcbiAgICAgICAgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIlByaW1hcnkgTm9kZVwiKS5hZGREcm9wZG93bihkID0+IGQuYWRkT3B0aW9ucyhza2lsbHMpLm9uQ2hhbmdlKHYgPT4geyBcbiAgICAgICAgICAgIGlmKHY9PT1cIisgTmV3XCIpeyB0aGlzLmNsb3NlKCk7IG5ldyBTa2lsbE1hbmFnZXJNb2RhbCh0aGlzLmFwcCx0aGlzLnBsdWdpbikub3BlbigpOyB9IGVsc2UgdGhpcy5za2lsbD12OyBcbiAgICAgICAgfSkpOyBcbiAgICAgICAgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIlN5bmVyZ3kgTm9kZVwiKS5hZGREcm9wZG93bihkID0+IGQuYWRkT3B0aW9ucyhza2lsbHMpLnNldFZhbHVlKFwiTm9uZVwiKS5vbkNoYW5nZSh2ID0+IHRoaXMuc2VjU2tpbGwgPSB2KSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIkRlYWRsaW5lXCIpLmFkZFRleHQodCA9PiB7IHQuaW5wdXRFbC50eXBlID0gXCJkYXRldGltZS1sb2NhbFwiOyB0Lm9uQ2hhbmdlKHYgPT4gdGhpcy5kZWFkbGluZSA9IHYpOyB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiSGlnaCBTdGFrZXNcIikuc2V0RGVzYyhcIkRvdWJsZSBHb2xkIC8gRG91YmxlIERhbWFnZVwiKS5hZGRUb2dnbGUodD0+dC5zZXRWYWx1ZShmYWxzZSkub25DaGFuZ2Uodj0+dGhpcy5oaWdoU3Rha2VzPXYpKTsgXG4gICAgICAgIFxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLmFkZEJ1dHRvbihiID0+IGIuc2V0QnV0dG9uVGV4dChcIkRlcGxveVwiKS5zZXRDdGEoKS5vbkNsaWNrKCgpID0+IHsgXG4gICAgICAgICAgICBpZih0aGlzLm5hbWUpe1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5jcmVhdGVRdWVzdCh0aGlzLm5hbWUsdGhpcy5kaWZmaWN1bHR5LHRoaXMuc2tpbGwsdGhpcy5zZWNTa2lsbCx0aGlzLmRlYWRsaW5lLHRoaXMuaGlnaFN0YWtlcywgXCJOb3JtYWxcIiwgdGhpcy5pc0Jvc3MpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH0gXG4gICAgICAgIH0pKTsgXG4gICAgfSBcbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9IFxufVxuXG5leHBvcnQgY2xhc3MgU2tpbGxNYW5hZ2VyTW9kYWwgZXh0ZW5kcyBNb2RhbCB7IFxuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47IFxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9IFxuICAgIG9uT3BlbigpIHsgXG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzOyBcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIkFkZCBOZXcgTm9kZVwiIH0pOyBcbiAgICAgICAgbGV0IG49XCJcIjsgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIk5vZGUgTmFtZVwiKS5hZGRUZXh0KHQ9PnQub25DaGFuZ2Uodj0+bj12KSkuYWRkQnV0dG9uKGI9PmIuc2V0QnV0dG9uVGV4dChcIkNyZWF0ZVwiKS5zZXRDdGEoKS5vbkNsaWNrKGFzeW5jKCk9PntcbiAgICAgICAgICAgIGlmKG4pe1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5wdXNoKHtuYW1lOm4sbGV2ZWw6MSx4cDowLHhwUmVxOjUsbGFzdFVzZWQ6bmV3IERhdGUoKS50b0lTT1N0cmluZygpLHJ1c3Q6MCxjb25uZWN0aW9uczpbXX0pO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5zYXZlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSk7IFxuICAgIH0gXG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfSBcbn1cblxuZXhwb3J0IGNsYXNzIFNraWxsRGV0YWlsTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjsgaW5kZXg6IG51bWJlcjtcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbiwgaW5kZXg6IG51bWJlcikgeyBzdXBlcihhcHApOyB0aGlzLnBsdWdpbj1wbHVnaW47IHRoaXMuaW5kZXg9aW5kZXg7IH1cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzOyBjb25zdCBzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2tpbGxzW3RoaXMuaW5kZXhdO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IGBOb2RlOiAke3MubmFtZX1gIH0pO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJOYW1lXCIpLmFkZFRleHQodD0+dC5zZXRWYWx1ZShzLm5hbWUpLm9uQ2hhbmdlKHY9PnMubmFtZT12KSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIlJ1c3QgU3RhdHVzXCIpLnNldERlc2MoYFN0YWNrczogJHtzLnJ1c3R9YCkuYWRkQnV0dG9uKGI9PmIuc2V0QnV0dG9uVGV4dChcIk1hbnVhbCBQb2xpc2hcIikub25DbGljayhhc3luYygpPT57IFxuICAgICAgICAgICAgcy5ydXN0PTA7IHMueHBSZXE9TWF0aC5mbG9vcihzLnhwUmVxLzEuMSk7IFxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLnNhdmUoKTsgXG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7IFxuICAgICAgICAgICAgbmV3IE5vdGljZShcIlJ1c3QgcG9saXNoZWQuXCIpOyBcbiAgICAgICAgfSkpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZGl2ID0gY29udGVudEVsLmNyZWF0ZURpdigpOyBcbiAgICAgICAgZGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luLXRvcDoyMHB4OyBkaXNwbGF5OmZsZXg7IGp1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGJTYXZlID0gZGl2LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHt0ZXh0OlwiU2F2ZVwifSk7IFxuICAgICAgICBiU2F2ZS5hZGRDbGFzcyhcIm1vZC1jdGFcIik7IFxuICAgICAgICBiU2F2ZS5vbmNsaWNrPWFzeW5jKCk9PnsgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLnNhdmUoKTsgdGhpcy5jbG9zZSgpOyB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYkRlbCA9IGRpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7dGV4dDpcIkRlbGV0ZSBOb2RlXCJ9KTsgXG4gICAgICAgIGJEZWwuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcImNvbG9yOnJlZDtcIik7IFxuICAgICAgICBiRGVsLm9uY2xpY2s9YXN5bmMoKT0+eyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5zcGxpY2UodGhpcy5pbmRleCwgMSk7IFxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLnNhdmUoKTsgXG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7IFxuICAgICAgICB9O1xuICAgIH1cbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9XG59XG5cblxuXG5leHBvcnQgY2xhc3MgUmVzZWFyY2hRdWVzdE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG4gICAgdGl0bGU6IHN0cmluZyA9IFwiXCI7XG4gICAgdHlwZTogXCJzdXJ2ZXlcIiB8IFwiZGVlcF9kaXZlXCIgPSBcInN1cnZleVwiO1xuICAgIGxpbmtlZFNraWxsOiBzdHJpbmcgPSBcIk5vbmVcIjtcbiAgICBsaW5rZWRDb21iYXRRdWVzdDogc3RyaW5nID0gXCJOb25lXCI7XG5cbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikge1xuICAgICAgICBzdXBlcihhcHApO1xuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICB9XG5cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiUkVTRUFSQ0ggREVQTE9ZTUVOVFwiIH0pO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcbiAgICAgICAgICAgIC5zZXROYW1lKFwiUmVzZWFyY2ggVGl0bGVcIilcbiAgICAgICAgICAgIC5hZGRUZXh0KHQgPT4ge1xuICAgICAgICAgICAgICAgIHQub25DaGFuZ2UodiA9PiB0aGlzLnRpdGxlID0gdik7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0LmlucHV0RWwuZm9jdXMoKSwgNTApO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgLnNldE5hbWUoXCJSZXNlYXJjaCBUeXBlXCIpXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiBkXG4gICAgICAgICAgICAgICAgLmFkZE9wdGlvbihcInN1cnZleVwiLCBcIlN1cnZleSAoMTAwLTIwMCB3b3JkcylcIilcbiAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKFwiZGVlcF9kaXZlXCIsIFwiRGVlcCBEaXZlICgyMDAtNDAwIHdvcmRzKVwiKVxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZShcInN1cnZleVwiKVxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2ID0+IHRoaXMudHlwZSA9IHYgYXMgXCJzdXJ2ZXlcIiB8IFwiZGVlcF9kaXZlXCIpXG4gICAgICAgICAgICApO1xuXG4gICAgICAgIGNvbnN0IHNraWxsczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsgXCJOb25lXCI6IFwiTm9uZVwiIH07XG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5mb3JFYWNoKHMgPT4gc2tpbGxzW3MubmFtZV0gPSBzLm5hbWUpO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcbiAgICAgICAgICAgIC5zZXROYW1lKFwiTGlua2VkIFNraWxsXCIpXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiBkXG4gICAgICAgICAgICAgICAgLmFkZE9wdGlvbnMoc2tpbGxzKVxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZShcIk5vbmVcIilcbiAgICAgICAgICAgICAgICAub25DaGFuZ2UodiA9PiB0aGlzLmxpbmtlZFNraWxsID0gdilcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgY29uc3QgY29tYmF0UXVlc3RzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyBcIk5vbmVcIjogXCJOb25lXCIgfTtcbiAgICAgICAgY29uc3QgcXVlc3RGb2xkZXIgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJBY3RpdmVfUnVuL1F1ZXN0c1wiKTtcbiAgICAgICAgaWYgKHF1ZXN0Rm9sZGVyIGluc3RhbmNlb2YgVEZvbGRlcikge1xuICAgICAgICAgICAgcXVlc3RGb2xkZXIuY2hpbGRyZW4uZm9yRWFjaChmID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZiBpbnN0YW5jZW9mIFRGaWxlICYmIGYuZXh0ZW5zaW9uID09PSBcIm1kXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tYmF0UXVlc3RzW2YuYmFzZW5hbWVdID0gZi5iYXNlbmFtZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcbiAgICAgICAgICAgIC5zZXROYW1lKFwiTGluayBDb21iYXQgUXVlc3RcIilcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkID0+IGRcbiAgICAgICAgICAgICAgICAuYWRkT3B0aW9ucyhjb21iYXRRdWVzdHMpXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKFwiTm9uZVwiKVxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2ID0+IHRoaXMubGlua2VkQ29tYmF0UXVlc3QgPSB2KVxuICAgICAgICAgICAgKTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXG4gICAgICAgICAgICAuYWRkQnV0dG9uKGIgPT4gYlxuICAgICAgICAgICAgICAgIC5zZXRCdXR0b25UZXh0KFwiQ1JFQVRFIFJFU0VBUkNIXCIpXG4gICAgICAgICAgICAgICAgLnNldEN0YSgpXG4gICAgICAgICAgICAgICAgLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50aXRsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmNyZWF0ZVJlc2VhcmNoUXVlc3QoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50aXRsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5saW5rZWRTa2lsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmtlZENvbWJhdFF1ZXN0XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgfVxuXG4gICAgb25DbG9zZSgpIHtcbiAgICAgICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZXNlYXJjaExpc3RNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHtcbiAgICAgICAgc3VwZXIoYXBwKTtcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgfVxuXG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIlJFU0VBUkNIIExJQlJBUllcIiB9KTtcblxuICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRSZXNlYXJjaFJhdGlvKCk7XG4gICAgICAgIGNvbnN0IHN0YXRzRWwgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktcmVzZWFyY2gtc3RhdHNcIiB9KTtcbiAgICAgICAgc3RhdHNFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgQ29tYmF0IFF1ZXN0czogJHtzdGF0cy5jb21iYXR9YCB9KTtcbiAgICAgICAgc3RhdHNFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgUmVzZWFyY2ggUXVlc3RzOiAke3N0YXRzLnJlc2VhcmNofWAgfSk7XG4gICAgICAgIHN0YXRzRWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFJhdGlvOiAke3N0YXRzLnJhdGlvfToxYCB9KTtcblxuICAgICAgICBpZiAoIXRoaXMucGx1Z2luLmVuZ2luZS5jYW5DcmVhdGVSZXNlYXJjaFF1ZXN0KCkpIHtcbiAgICAgICAgICAgIGNvbnN0IHdhcm5pbmcgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICB3YXJuaW5nLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiY29sb3I6IG9yYW5nZTsgZm9udC13ZWlnaHQ6IGJvbGQ7IG1hcmdpbjogMTBweCAwO1wiKTtcbiAgICAgICAgICAgIHdhcm5pbmcuc2V0VGV4dChcIlJFU0VBUkNIIEJMT0NLRUQ6IE5lZWQgMjoxIGNvbWJhdCB0byByZXNlYXJjaCByYXRpb1wiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJBY3RpdmUgUmVzZWFyY2hcIiB9KTtcblxuICAgICAgICBjb25zdCBxdWVzdHMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maWx0ZXIocSA9PiAhcS5jb21wbGV0ZWQpO1xuICAgICAgICBpZiAocXVlc3RzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiTm8gYWN0aXZlIHJlc2VhcmNoIHF1ZXN0cy5cIiB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHF1ZXN0cy5mb3JFYWNoKChxOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXJkID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXJlc2VhcmNoLWNhcmRcIiB9KTtcbiAgICAgICAgICAgICAgICBjYXJkLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYm9yZGVyOiAxcHggc29saWQgIzQ0NDsgcGFkZGluZzogMTBweDsgbWFyZ2luOiA1cHggMDsgYm9yZGVyLXJhZGl1czogNHB4O1wiKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IGNhcmQuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IHEudGl0bGUgfSk7XG4gICAgICAgICAgICAgICAgaGVhZGVyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAwIDAgNXB4IDA7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgaW5mbyA9IGNhcmQuY3JlYXRlRWwoXCJkaXZcIik7XG4gICAgICAgICAgICAgICAgaW5mby5pbm5lckhUTUwgPSBgPGNvZGUgc3R5bGU9XCJjb2xvcjojYWE2NGZmXCI+JHtxLmlkfTwvY29kZT48YnI+VHlwZTogJHtxLnR5cGUgPT09IFwic3VydmV5XCIgPyBcIlN1cnZleVwiIDogXCJEZWVwIERpdmVcIn0gfCBXb3JkczogJHtxLndvcmRDb3VudH0vJHtxLndvcmRMaW1pdH1gO1xuICAgICAgICAgICAgICAgIGluZm8uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmb250LXNpemU6IDAuOWVtOyBvcGFjaXR5OiAwLjg7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgYWN0aW9ucyA9IGNhcmQuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICAgICAgYWN0aW9ucy5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbi10b3A6IDhweDsgZGlzcGxheTogZmxleDsgZ2FwOiA1cHg7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgY29tcGxldGVCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDT01QTEVURVwiIH0pO1xuICAgICAgICAgICAgICAgIGNvbXBsZXRlQnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZmxleDogMTsgcGFkZGluZzogNXB4OyBiYWNrZ3JvdW5kOiBncmVlbjsgY29sb3I6IHdoaXRlOyBib3JkZXI6IG5vbmU7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyO1wiKTtcbiAgICAgICAgICAgICAgICBjb21wbGV0ZUJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuY29tcGxldGVSZXNlYXJjaFF1ZXN0KHEuaWQsIHEud29yZENvdW50KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBjb25zdCBkZWxldGVCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJERUxFVEVcIiB9KTtcbiAgICAgICAgICAgICAgICBkZWxldGVCdG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmbGV4OiAxOyBwYWRkaW5nOiA1cHg7IGJhY2tncm91bmQ6IHJlZDsgY29sb3I6IHdoaXRlOyBib3JkZXI6IG5vbmU7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyO1wiKTtcbiAgICAgICAgICAgICAgICBkZWxldGVCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmRlbGV0ZVJlc2VhcmNoUXVlc3QocS5pZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiQ29tcGxldGVkIFJlc2VhcmNoXCIgfSk7XG4gICAgICAgIGNvbnN0IGNvbXBsZXRlZCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbHRlcihxID0+IHEuY29tcGxldGVkKTtcbiAgICAgICAgaWYgKGNvbXBsZXRlZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk5vIGNvbXBsZXRlZCByZXNlYXJjaC5cIiB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbXBsZXRlZC5mb3JFYWNoKChxOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtID0gY29udGVudEVsLmNyZWF0ZUVsKFwicFwiKTtcbiAgICAgICAgICAgICAgICBpdGVtLnNldFRleHQoYCsgJHtxLnRpdGxlfSAoJHtxLnR5cGUgPT09IFwic3VydmV5XCIgPyBcIlN1cnZleVwiIDogXCJEZWVwIERpdmVcIn0pYCk7XG4gICAgICAgICAgICAgICAgaXRlbS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm9wYWNpdHk6IDAuNjsgZm9udC1zaXplOiAwLjllbTtcIik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG9uQ2xvc2UoKSB7XG4gICAgICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgfVxufVxuXG5cbmV4cG9ydCBjbGFzcyBDaGFpbkJ1aWxkZXJNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuICAgIGNoYWluTmFtZTogc3RyaW5nID0gXCJcIjtcbiAgICBzZWxlY3RlZFF1ZXN0czogc3RyaW5nW10gPSBbXTtcblxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgIH1cblxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJDSEFJTiBCVUlMREVSXCIgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgLnNldE5hbWUoXCJDaGFpbiBOYW1lXCIpXG4gICAgICAgICAgICAuYWRkVGV4dCh0ID0+IHtcbiAgICAgICAgICAgICAgICB0Lm9uQ2hhbmdlKHYgPT4gdGhpcy5jaGFpbk5hbWUgPSB2KTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHQuaW5wdXRFbC5mb2N1cygpLCA1MCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiU2VsZWN0IFF1ZXN0c1wiIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcXVlc3RGb2xkZXIgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJBY3RpdmVfUnVuL1F1ZXN0c1wiKTtcbiAgICAgICAgY29uc3QgcXVlc3RzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBcbiAgICAgICAgaWYgKHF1ZXN0Rm9sZGVyIGluc3RhbmNlb2YgVEZvbGRlcikge1xuICAgICAgICAgICAgcXVlc3RGb2xkZXIuY2hpbGRyZW4uZm9yRWFjaChmID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZiBpbnN0YW5jZW9mIFRGaWxlICYmIGYuZXh0ZW5zaW9uID09PSBcIm1kXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcXVlc3RzLnB1c2goZi5iYXNlbmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBxdWVzdHMuZm9yRWFjaCgocXVlc3QsIGlkeCkgPT4ge1xuICAgICAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgICAgIC5zZXROYW1lKHF1ZXN0KVxuICAgICAgICAgICAgICAgIC5hZGRUb2dnbGUodCA9PiB0Lm9uQ2hhbmdlKHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFF1ZXN0cy5wdXNoKHF1ZXN0KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRRdWVzdHMgPSB0aGlzLnNlbGVjdGVkUXVlc3RzLmZpbHRlcihxID0+IHEgIT09IHF1ZXN0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgLmFkZEJ1dHRvbihiID0+IGJcbiAgICAgICAgICAgICAgICAuc2V0QnV0dG9uVGV4dChcIkNSRUFURSBDSEFJTlwiKVxuICAgICAgICAgICAgICAgIC5zZXRDdGEoKVxuICAgICAgICAgICAgICAgIC5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY2hhaW5OYW1lICYmIHRoaXMuc2VsZWN0ZWRRdWVzdHMubGVuZ3RoID49IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5jcmVhdGVRdWVzdENoYWluKHRoaXMuY2hhaW5OYW1lLCB0aGlzLnNlbGVjdGVkUXVlc3RzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJDaGFpbiBuZWVkcyBhIG5hbWUgYW5kIGF0IGxlYXN0IDIgcXVlc3RzXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgfVxuXG4gICAgb25DbG9zZSgpIHtcbiAgICAgICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBEYXlNZXRyaWNzLCBXZWVrbHlSZXBvcnQsIEJvc3NNaWxlc3RvbmUsIFN0cmVhaywgQWNoaWV2ZW1lbnQgfSBmcm9tICcuLi90eXBlcyc7XG5cbi8qKlxuICogRExDIDY6IEFuYWx5dGljcyAmIEVuZGdhbWUgRW5naW5lXG4gKiBIYW5kbGVzIGFsbCBtZXRyaWNzIHRyYWNraW5nLCBib3NzIG1pbGVzdG9uZXMsIGFjaGlldmVtZW50cywgYW5kIHdpbiBjb25kaXRpb25cbiAqIFxuICogSVNPTEFURUQ6IE9ubHkgcmVhZHMvd3JpdGVzIHRvIHNldHRpbmdzLmRheU1ldHJpY3MsIHdlZWtseVJlcG9ydHMsIGJvc3NNaWxlc3RvbmVzLCBzdHJlYWssIGFjaGlldmVtZW50c1xuICogREVQRU5ERU5DSUVTOiBtb21lbnQsIFNpc3lwaHVzU2V0dGluZ3MgdHlwZXNcbiAqL1xuZXhwb3J0IGNsYXNzIEFuYWx5dGljc0VuZ2luZSB7XG4gICAgc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3M7XG4gICAgYXVkaW9Db250cm9sbGVyPzogYW55OyAvLyBPcHRpb25hbCBhdWRpbyBjYWxsYmFjayBmb3Igbm90aWZpY2F0aW9uc1xuXG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3MsIGF1ZGlvQ29udHJvbGxlcj86IGFueSkge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyID0gYXVkaW9Db250cm9sbGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRyYWNrIGRhaWx5IG1ldHJpY3MgLSBjYWxsZWQgd2hlbmV2ZXIgYSBxdWVzdCBpcyBjb21wbGV0ZWQvZmFpbGVkL2V0Y1xuICAgICAqL1xuICAgIHRyYWNrRGFpbHlNZXRyaWNzKHR5cGU6ICdxdWVzdF9jb21wbGV0ZScgfCAncXVlc3RfZmFpbCcgfCAneHAnIHwgJ2dvbGQnIHwgJ2RhbWFnZScgfCAnc2tpbGxfbGV2ZWwnIHwgJ2NoYWluX2NvbXBsZXRlJywgYW1vdW50OiBudW1iZXIgPSAxKSB7XG4gICAgICAgIGNvbnN0IHRvZGF5ID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgXG4gICAgICAgIGxldCBtZXRyaWMgPSB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MuZmluZChtID0+IG0uZGF0ZSA9PT0gdG9kYXkpO1xuICAgICAgICBpZiAoIW1ldHJpYykge1xuICAgICAgICAgICAgbWV0cmljID0ge1xuICAgICAgICAgICAgICAgIGRhdGU6IHRvZGF5LFxuICAgICAgICAgICAgICAgIHF1ZXN0c0NvbXBsZXRlZDogMCxcbiAgICAgICAgICAgICAgICBxdWVzdHNGYWlsZWQ6IDAsXG4gICAgICAgICAgICAgICAgeHBFYXJuZWQ6IDAsXG4gICAgICAgICAgICAgICAgZ29sZEVhcm5lZDogMCxcbiAgICAgICAgICAgICAgICBkYW1hZ2VzVGFrZW46IDAsXG4gICAgICAgICAgICAgICAgc2tpbGxzTGV2ZWxlZDogW10sXG4gICAgICAgICAgICAgICAgY2hhaW5zQ29tcGxldGVkOiAwXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzLnB1c2gobWV0cmljKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIFwicXVlc3RfY29tcGxldGVcIjpcbiAgICAgICAgICAgICAgICBtZXRyaWMucXVlc3RzQ29tcGxldGVkICs9IGFtb3VudDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJxdWVzdF9mYWlsXCI6XG4gICAgICAgICAgICAgICAgbWV0cmljLnF1ZXN0c0ZhaWxlZCArPSBhbW91bnQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwieHBcIjpcbiAgICAgICAgICAgICAgICBtZXRyaWMueHBFYXJuZWQgKz0gYW1vdW50O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImdvbGRcIjpcbiAgICAgICAgICAgICAgICBtZXRyaWMuZ29sZEVhcm5lZCArPSBhbW91bnQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiZGFtYWdlXCI6XG4gICAgICAgICAgICAgICAgbWV0cmljLmRhbWFnZXNUYWtlbiArPSBhbW91bnQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwic2tpbGxfbGV2ZWxcIjpcbiAgICAgICAgICAgICAgICBtZXRyaWMuc2tpbGxzTGV2ZWxlZC5wdXNoKFwiU2tpbGwgbGV2ZWxlZFwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJjaGFpbl9jb21wbGV0ZVwiOlxuICAgICAgICAgICAgICAgIG1ldHJpYy5jaGFpbnNDb21wbGV0ZWQgKz0gYW1vdW50O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGRhaWx5IHN0cmVhayAtIGNhbGxlZCBvbmNlIHBlciBkYXkgYXQgbG9naW5cbiAgICAgKi9cbiAgICB1cGRhdGVTdHJlYWsoKSB7XG4gICAgICAgIGNvbnN0IHRvZGF5ID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgY29uc3QgbGFzdERhdGUgPSB0aGlzLnNldHRpbmdzLnN0cmVhay5sYXN0RGF0ZTtcbiAgICAgICAgXG4gICAgICAgIGlmIChsYXN0RGF0ZSA9PT0gdG9kYXkpIHtcbiAgICAgICAgICAgIHJldHVybjsgLy8gQWxyZWFkeSBjb3VudGVkIHRvZGF5XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHllc3RlcmRheSA9IG1vbWVudCgpLnN1YnRyYWN0KDEsICdkYXknKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGxhc3REYXRlID09PSB5ZXN0ZXJkYXkpIHtcbiAgICAgICAgICAgIC8vIENvbnNlY3V0aXZlIGRheVxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5zdHJlYWsuY3VycmVudCsrO1xuICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3Muc3RyZWFrLmN1cnJlbnQgPiB0aGlzLnNldHRpbmdzLnN0cmVhay5sb25nZXN0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5zdHJlYWsubG9uZ2VzdCA9IHRoaXMuc2V0dGluZ3Muc3RyZWFrLmN1cnJlbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTdHJlYWsgYnJva2VuLCBzdGFydCBuZXcgb25lXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnN0cmVhay5jdXJyZW50ID0gMTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5zdHJlYWsubGFzdERhdGUgPSB0b2RheTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGJvc3MgbWlsZXN0b25lcyBvbiBmaXJzdCBydW5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplQm9zc01pbGVzdG9uZXMoKSB7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgbWlsZXN0b25lcyA9IFtcbiAgICAgICAgICAgICAgICB7IGxldmVsOiAxMCwgbmFtZTogXCJUaGUgRmlyc3QgVHJpYWxcIiwgdW5sb2NrZWQ6IGZhbHNlLCBkZWZlYXRlZDogZmFsc2UsIHhwUmV3YXJkOiA1MDAgfSxcbiAgICAgICAgICAgICAgICB7IGxldmVsOiAyMCwgbmFtZTogXCJUaGUgTmVtZXNpcyBSZXR1cm5zXCIsIHVubG9ja2VkOiBmYWxzZSwgZGVmZWF0ZWQ6IGZhbHNlLCB4cFJld2FyZDogMTAwMCB9LFxuICAgICAgICAgICAgICAgIHsgbGV2ZWw6IDMwLCBuYW1lOiBcIlRoZSBSZWFwZXIgQXdha2Vuc1wiLCB1bmxvY2tlZDogZmFsc2UsIGRlZmVhdGVkOiBmYWxzZSwgeHBSZXdhcmQ6IDE1MDAgfSxcbiAgICAgICAgICAgICAgICB7IGxldmVsOiA1MCwgbmFtZTogXCJUaGUgRmluYWwgQXNjZW5zaW9uXCIsIHVubG9ja2VkOiBmYWxzZSwgZGVmZWF0ZWQ6IGZhbHNlLCB4cFJld2FyZDogNTAwMCB9XG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzID0gbWlsZXN0b25lcyBhcyBhbnk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBhbnkgYm9zc2VzIHNob3VsZCBiZSB1bmxvY2tlZCBiYXNlZCBvbiBjdXJyZW50IGxldmVsXG4gICAgICovXG4gICAgY2hlY2tCb3NzTWlsZXN0b25lcygpOiBzdHJpbmdbXSB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2VzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzIHx8IHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVCb3NzTWlsZXN0b25lcygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmZvckVhY2goKGJvc3M6IEJvc3NNaWxlc3RvbmUpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmxldmVsID49IGJvc3MubGV2ZWwgJiYgIWJvc3MudW5sb2NrZWQpIHtcbiAgICAgICAgICAgICAgICBib3NzLnVubG9ja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlcy5wdXNoKGBCb3NzIFVubG9ja2VkOiAke2Jvc3MubmFtZX0gKExldmVsICR7Ym9zcy5sZXZlbH0pYCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyPy5wbGF5U291bmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2VzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1hcmsgYm9zcyBhcyBkZWZlYXRlZCBhbmQgYXdhcmQgWFBcbiAgICAgKi9cbiAgICBkZWZlYXRCb3NzKGxldmVsOiBudW1iZXIpOiB7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgeHBSZXdhcmQ6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgYm9zcyA9IHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMuZmluZCgoYjogQm9zc01pbGVzdG9uZSkgPT4gYi5sZXZlbCA9PT0gbGV2ZWwpO1xuICAgICAgICBpZiAoIWJvc3MpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIkJvc3Mgbm90IGZvdW5kXCIsIHhwUmV3YXJkOiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChib3NzLmRlZmVhdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJCb3NzIGFscmVhZHkgZGVmZWF0ZWRcIiwgeHBSZXdhcmQ6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgYm9zcy5kZWZlYXRlZCA9IHRydWU7XG4gICAgICAgIGJvc3MuZGVmZWF0ZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MueHAgKz0gYm9zcy54cFJld2FyZDtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcj8ucGxheVNvdW5kKSB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayB3aW4gY29uZGl0aW9uXG4gICAgICAgIGlmIChsZXZlbCA9PT0gNTApIHtcbiAgICAgICAgICAgIHRoaXMud2luR2FtZSgpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYEJvc3MgRGVmZWF0ZWQ6ICR7Ym9zcy5uYW1lfSEgVklDVE9SWSFgLCB4cFJld2FyZDogYm9zcy54cFJld2FyZCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgQm9zcyBEZWZlYXRlZDogJHtib3NzLm5hbWV9ISArJHtib3NzLnhwUmV3YXJkfSBYUGAsIHhwUmV3YXJkOiBib3NzLnhwUmV3YXJkIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJpZ2dlciB3aW4gY29uZGl0aW9uXG4gICAgICovXG4gICAgcHJpdmF0ZSB3aW5HYW1lKCkge1xuICAgICAgICB0aGlzLnNldHRpbmdzLmdhbWVXb24gPSB0cnVlO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmVuZEdhbWVEYXRlID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyPy5wbGF5U291bmQpIHtcbiAgICAgICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSB3ZWVrbHkgcmVwb3J0XG4gICAgICovXG4gICAgZ2VuZXJhdGVXZWVrbHlSZXBvcnQoKTogV2Vla2x5UmVwb3J0IHtcbiAgICAgICAgY29uc3Qgd2VlayA9IG1vbWVudCgpLndlZWsoKTtcbiAgICAgICAgY29uc3Qgc3RhcnREYXRlID0gbW9tZW50KCkuc3RhcnRPZignd2VlaycpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIGNvbnN0IGVuZERhdGUgPSBtb21lbnQoKS5lbmRPZignd2VlaycpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB3ZWVrTWV0cmljcyA9IHRoaXMuc2V0dGluZ3MuZGF5TWV0cmljcy5maWx0ZXIoKG06IERheU1ldHJpY3MpID0+IFxuICAgICAgICAgICAgbW9tZW50KG0uZGF0ZSkuaXNCZXR3ZWVuKG1vbWVudChzdGFydERhdGUpLCBtb21lbnQoZW5kRGF0ZSksIG51bGwsICdbXScpXG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0b3RhbFF1ZXN0cyA9IHdlZWtNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0ucXVlc3RzQ29tcGxldGVkLCAwKTtcbiAgICAgICAgY29uc3QgdG90YWxGYWlsZWQgPSB3ZWVrTWV0cmljcy5yZWR1Y2UoKHN1bTogbnVtYmVyLCBtOiBEYXlNZXRyaWNzKSA9PiBzdW0gKyBtLnF1ZXN0c0ZhaWxlZCwgMCk7XG4gICAgICAgIGNvbnN0IHN1Y2Nlc3NSYXRlID0gdG90YWxRdWVzdHMgKyB0b3RhbEZhaWxlZCA+IDAgPyBNYXRoLnJvdW5kKCh0b3RhbFF1ZXN0cyAvICh0b3RhbFF1ZXN0cyArIHRvdGFsRmFpbGVkKSkgKiAxMDApIDogMDtcbiAgICAgICAgY29uc3QgdG90YWxYcCA9IHdlZWtNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0ueHBFYXJuZWQsIDApO1xuICAgICAgICBjb25zdCB0b3RhbEdvbGQgPSB3ZWVrTWV0cmljcy5yZWR1Y2UoKHN1bTogbnVtYmVyLCBtOiBEYXlNZXRyaWNzKSA9PiBzdW0gKyBtLmdvbGRFYXJuZWQsIDApO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdG9wU2tpbGxzID0gdGhpcy5zZXR0aW5ncy5za2lsbHNcbiAgICAgICAgICAgIC5zb3J0KChhOiBhbnksIGI6IGFueSkgPT4gKGIubGV2ZWwgLSBhLmxldmVsKSlcbiAgICAgICAgICAgIC5zbGljZSgwLCAzKVxuICAgICAgICAgICAgLm1hcCgoczogYW55KSA9PiBzLm5hbWUpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYmVzdERheSA9IHdlZWtNZXRyaWNzLmxlbmd0aCA+IDAgXG4gICAgICAgICAgICA/IHdlZWtNZXRyaWNzLnJlZHVjZSgobWF4OiBEYXlNZXRyaWNzLCBtOiBEYXlNZXRyaWNzKSA9PiBtLnF1ZXN0c0NvbXBsZXRlZCA+IG1heC5xdWVzdHNDb21wbGV0ZWQgPyBtIDogbWF4KS5kYXRlXG4gICAgICAgICAgICA6IHN0YXJ0RGF0ZTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdvcnN0RGF5ID0gd2Vla01ldHJpY3MubGVuZ3RoID4gMFxuICAgICAgICAgICAgPyB3ZWVrTWV0cmljcy5yZWR1Y2UoKG1pbjogRGF5TWV0cmljcywgbTogRGF5TWV0cmljcykgPT4gbS5xdWVzdHNGYWlsZWQgPiBtaW4ucXVlc3RzRmFpbGVkID8gbSA6IG1pbikuZGF0ZVxuICAgICAgICAgICAgOiBzdGFydERhdGU7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZXBvcnQ6IFdlZWtseVJlcG9ydCA9IHtcbiAgICAgICAgICAgIHdlZWs6IHdlZWssXG4gICAgICAgICAgICBzdGFydERhdGU6IHN0YXJ0RGF0ZSxcbiAgICAgICAgICAgIGVuZERhdGU6IGVuZERhdGUsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0czogdG90YWxRdWVzdHMsXG4gICAgICAgICAgICBzdWNjZXNzUmF0ZTogc3VjY2Vzc1JhdGUsXG4gICAgICAgICAgICB0b3RhbFhwOiB0b3RhbFhwLFxuICAgICAgICAgICAgdG90YWxHb2xkOiB0b3RhbEdvbGQsXG4gICAgICAgICAgICB0b3BTa2lsbHM6IHRvcFNraWxscyxcbiAgICAgICAgICAgIGJlc3REYXk6IGJlc3REYXksXG4gICAgICAgICAgICB3b3JzdERheTogd29yc3REYXlcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3Mud2Vla2x5UmVwb3J0cy5wdXNoKHJlcG9ydCk7XG4gICAgICAgIHJldHVybiByZXBvcnQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVW5sb2NrIGFuIGFjaGlldmVtZW50XG4gICAgICovXG4gICAgdW5sb2NrQWNoaWV2ZW1lbnQoYWNoaWV2ZW1lbnRJZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGFjaGlldmVtZW50ID0gdGhpcy5zZXR0aW5ncy5hY2hpZXZlbWVudHMuZmluZCgoYTogQWNoaWV2ZW1lbnQpID0+IGEuaWQgPT09IGFjaGlldmVtZW50SWQpO1xuICAgICAgICBpZiAoIWFjaGlldmVtZW50IHx8IGFjaGlldmVtZW50LnVubG9ja2VkKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICBhY2hpZXZlbWVudC51bmxvY2tlZCA9IHRydWU7XG4gICAgICAgIGFjaGlldmVtZW50LnVubG9ja2VkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5hdWRpb0NvbnRyb2xsZXI/LnBsYXlTb3VuZCkge1xuICAgICAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgZ2FtZSBzdGF0cyBzbmFwc2hvdFxuICAgICAqL1xuICAgIGdldEdhbWVTdGF0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGxldmVsOiB0aGlzLnNldHRpbmdzLmxldmVsLFxuICAgICAgICAgICAgY3VycmVudFN0cmVhazogdGhpcy5zZXR0aW5ncy5zdHJlYWsuY3VycmVudCxcbiAgICAgICAgICAgIGxvbmdlc3RTdHJlYWs6IHRoaXMuc2V0dGluZ3Muc3RyZWFrLmxvbmdlc3QsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0czogdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0ucXVlc3RzQ29tcGxldGVkLCAwKSxcbiAgICAgICAgICAgIHRvdGFsWHA6IHRoaXMuc2V0dGluZ3MueHAgKyB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogRGF5TWV0cmljcykgPT4gc3VtICsgbS54cEVhcm5lZCwgMCksXG4gICAgICAgICAgICBnYW1lV29uOiB0aGlzLnNldHRpbmdzLmdhbWVXb24sXG4gICAgICAgICAgICBib3NzZXNEZWZlYXRlZDogdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcy5maWx0ZXIoKGI6IEJvc3NNaWxlc3RvbmUpID0+IGIuZGVmZWF0ZWQpLmxlbmd0aCxcbiAgICAgICAgICAgIHRvdGFsQm9zc2VzOiB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmxlbmd0aFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBzdXJ2aXZhbCBlc3RpbWF0ZSAocm91Z2ggY2FsY3VsYXRpb24pXG4gICAgICovXG4gICAgZ2V0U3Vydml2YWxFc3RpbWF0ZSgpOiBudW1iZXIge1xuICAgICAgICBjb25zdCBkYW1hZ2VQZXJGYWlsdXJlID0gMTAgKyBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3Mucml2YWxEbWcgLyAyKTtcbiAgICAgICAgY29uc3QgYWN0dWFsRGFtYWdlID0gdGhpcy5zZXR0aW5ncy5nb2xkIDwgMCA/IGRhbWFnZVBlckZhaWx1cmUgKiAyIDogZGFtYWdlUGVyRmFpbHVyZTtcbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy5ocCAvIE1hdGgubWF4KDEsIGFjdHVhbERhbWFnZSkpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IG1vbWVudCB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IFNpc3lwaHVzU2V0dGluZ3MgfSBmcm9tICcuLi90eXBlcyc7XG5cbi8qKlxuICogRExDIDM6IE1lZGl0YXRpb24gJiBSZWNvdmVyeSBFbmdpbmVcbiAqIEhhbmRsZXMgbG9ja2Rvd24gc3RhdGUsIG1lZGl0YXRpb24gaGVhbGluZywgYW5kIHF1ZXN0IGRlbGV0aW9uIHF1b3RhXG4gKiBcbiAqIElTT0xBVEVEOiBPbmx5IHJlYWRzL3dyaXRlcyB0byBsb2NrZG93blVudGlsLCBpc01lZGl0YXRpbmcsIG1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24sIFxuICogICAgICAgICAgIHF1ZXN0RGVsZXRpb25zVG9kYXksIGxhc3REZWxldGlvblJlc2V0XG4gKiBERVBFTkRFTkNJRVM6IG1vbWVudCwgU2lzeXBodXNTZXR0aW5nc1xuICogU0lERSBFRkZFQ1RTOiBQbGF5cyBhdWRpbyAoNDMyIEh6IHRvbmUpXG4gKi9cbmV4cG9ydCBjbGFzcyBNZWRpdGF0aW9uRW5naW5lIHtcbiAgICBzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncztcbiAgICBhdWRpb0NvbnRyb2xsZXI/OiBhbnk7IC8vIE9wdGlvbmFsIGZvciA0MzIgSHogc291bmRcbiAgICBwcml2YXRlIG1lZGl0YXRpb25Db29sZG93bk1zID0gMzAwMDA7IC8vIDMwIHNlY29uZHNcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzLCBhdWRpb0NvbnRyb2xsZXI/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlciA9IGF1ZGlvQ29udHJvbGxlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBjdXJyZW50bHkgbG9ja2VkIGRvd25cbiAgICAgKi9cbiAgICBpc0xvY2tlZERvd24oKTogYm9vbGVhbiB7XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiBtb21lbnQoKS5pc0JlZm9yZShtb21lbnQodGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGxvY2tkb3duIHRpbWUgcmVtYWluaW5nIGluIG1pbnV0ZXNcbiAgICAgKi9cbiAgICBnZXRMb2NrZG93blRpbWVSZW1haW5pbmcoKTogeyBob3VyczogbnVtYmVyOyBtaW51dGVzOiBudW1iZXI7IHRvdGFsTWludXRlczogbnVtYmVyIH0ge1xuICAgICAgICBpZiAoIXRoaXMuaXNMb2NrZWREb3duKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGhvdXJzOiAwLCBtaW51dGVzOiAwLCB0b3RhbE1pbnV0ZXM6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgdG90YWxNaW51dGVzID0gbW9tZW50KHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCkuZGlmZihtb21lbnQoKSwgJ21pbnV0ZXMnKTtcbiAgICAgICAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKHRvdGFsTWludXRlcyAvIDYwKTtcbiAgICAgICAgY29uc3QgbWludXRlcyA9IHRvdGFsTWludXRlcyAlIDYwO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHsgaG91cnMsIG1pbnV0ZXMsIHRvdGFsTWludXRlcyB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRyaWdnZXIgbG9ja2Rvd24gYWZ0ZXIgdGFraW5nIDUwKyBkYW1hZ2VcbiAgICAgKi9cbiAgICB0cmlnZ2VyTG9ja2Rvd24oKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCA9IG1vbWVudCgpLmFkZCg2LCAnaG91cnMnKS50b0lTT1N0cmluZygpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24gPSAwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm0gb25lIG1lZGl0YXRpb24gY3ljbGUgKGNsaWNrKVxuICAgICAqIFJldHVybnM6IHsgc3VjY2VzcywgY3ljbGVzRG9uZSwgY3ljbGVzUmVtYWluaW5nLCBtZXNzYWdlIH1cbiAgICAgKi9cbiAgICBtZWRpdGF0ZSgpOiB7IHN1Y2Nlc3M6IGJvb2xlYW47IGN5Y2xlc0RvbmU6IG51bWJlcjsgY3ljbGVzUmVtYWluaW5nOiBudW1iZXI7IG1lc3NhZ2U6IHN0cmluZzsgbG9ja2Rvd25SZWR1Y2VkOiBib29sZWFuIH0ge1xuICAgICAgICBpZiAoIXRoaXMuaXNMb2NrZWREb3duKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgY3ljbGVzRG9uZTogMCxcbiAgICAgICAgICAgICAgICBjeWNsZXNSZW1haW5pbmc6IDAsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogXCJOb3QgaW4gbG9ja2Rvd24uIE5vIG5lZWQgdG8gbWVkaXRhdGUuXCIsXG4gICAgICAgICAgICAgICAgbG9ja2Rvd25SZWR1Y2VkOiBmYWxzZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuaXNNZWRpdGF0aW5nKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGN5Y2xlc0RvbmU6IHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bixcbiAgICAgICAgICAgICAgICBjeWNsZXNSZW1haW5pbmc6IE1hdGgubWF4KDAsIDEwIC0gdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duKSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIkFscmVhZHkgbWVkaXRhdGluZy4gV2FpdCAzMCBzZWNvbmRzLlwiLFxuICAgICAgICAgICAgICAgIGxvY2tkb3duUmVkdWNlZDogZmFsc2VcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuaXNNZWRpdGF0aW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duKys7XG4gICAgICAgIFxuICAgICAgICAvLyBQbGF5IGhlYWxpbmcgZnJlcXVlbmN5XG4gICAgICAgIHRoaXMucGxheU1lZGl0YXRpb25Tb3VuZCgpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVtYWluaW5nID0gMTAgLSB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd247XG4gICAgICAgIGxldCBsb2NrZG93blJlZHVjZWQgPSBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIDEwIGN5Y2xlcyBjb21wbGV0ZVxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duID49IDEwKSB7XG4gICAgICAgICAgICBjb25zdCByZWR1Y2VkVGltZSA9IG1vbWVudCh0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwpLnN1YnRyYWN0KDUsICdob3VycycpO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsID0gcmVkdWNlZFRpbWUudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93biA9IDA7XG4gICAgICAgICAgICBsb2NrZG93blJlZHVjZWQgPSB0cnVlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodGhpcy5hdWRpb0NvbnRyb2xsZXI/LnBsYXlTb3VuZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEF1dG8tcmVzZXQgbWVkaXRhdGlvbiBmbGFnIGFmdGVyIGNvb2xkb3duXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLmlzTWVkaXRhdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgfSwgdGhpcy5tZWRpdGF0aW9uQ29vbGRvd25Ncyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjeWNsZXNEb25lOiAwLFxuICAgICAgICAgICAgICAgIGN5Y2xlc1JlbWFpbmluZzogMCxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIk1lZGl0YXRpb24gY29tcGxldGUuIExvY2tkb3duIHJlZHVjZWQgYnkgNSBob3Vycy5cIixcbiAgICAgICAgICAgICAgICBsb2NrZG93blJlZHVjZWQ6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEF1dG8tcmVzZXQgbWVkaXRhdGlvbiBmbGFnIGFmdGVyIGNvb2xkb3duXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5pc01lZGl0YXRpbmcgPSBmYWxzZTtcbiAgICAgICAgfSwgdGhpcy5tZWRpdGF0aW9uQ29vbGRvd25Ncyk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIGN5Y2xlc0RvbmU6IHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bixcbiAgICAgICAgICAgIGN5Y2xlc1JlbWFpbmluZzogcmVtYWluaW5nLFxuICAgICAgICAgICAgbWVzc2FnZTogYE1lZGl0YXRpb24gKCR7dGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3dufS8xMCkgLSAke3JlbWFpbmluZ30gY3ljbGVzIGxlZnRgLFxuICAgICAgICAgICAgbG9ja2Rvd25SZWR1Y2VkOiBmYWxzZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBsYXkgNDMyIEh6IGhlYWxpbmcgZnJlcXVlbmN5IGZvciAxIHNlY29uZFxuICAgICAqL1xuICAgIHByaXZhdGUgcGxheU1lZGl0YXRpb25Tb3VuZCgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGF1ZGlvQ29udGV4dCA9IG5ldyAod2luZG93LkF1ZGlvQ29udGV4dCB8fCAod2luZG93IGFzIGFueSkud2Via2l0QXVkaW9Db250ZXh0KSgpO1xuICAgICAgICAgICAgY29uc3Qgb3NjaWxsYXRvciA9IGF1ZGlvQ29udGV4dC5jcmVhdGVPc2NpbGxhdG9yKCk7XG4gICAgICAgICAgICBjb25zdCBnYWluTm9kZSA9IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG9zY2lsbGF0b3IuZnJlcXVlbmN5LnZhbHVlID0gNDMyO1xuICAgICAgICAgICAgb3NjaWxsYXRvci50eXBlID0gXCJzaW5lXCI7XG4gICAgICAgICAgICBnYWluTm9kZS5nYWluLnNldFZhbHVlQXRUaW1lKDAuMywgYXVkaW9Db250ZXh0LmN1cnJlbnRUaW1lKTtcbiAgICAgICAgICAgIGdhaW5Ob2RlLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSgwLjAxLCBhdWRpb0NvbnRleHQuY3VycmVudFRpbWUgKyAxKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgb3NjaWxsYXRvci5jb25uZWN0KGdhaW5Ob2RlKTtcbiAgICAgICAgICAgIGdhaW5Ob2RlLmNvbm5lY3QoYXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgb3NjaWxsYXRvci5zdGFydChhdWRpb0NvbnRleHQuY3VycmVudFRpbWUpO1xuICAgICAgICAgICAgb3NjaWxsYXRvci5zdG9wKGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZSArIDEpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvIG5vdCBhdmFpbGFibGUgZm9yIG1lZGl0YXRpb25cIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbWVkaXRhdGlvbiBzdGF0dXMgZm9yIGN1cnJlbnQgbG9ja2Rvd25cbiAgICAgKi9cbiAgICBnZXRNZWRpdGF0aW9uU3RhdHVzKCk6IHsgY3ljbGVzRG9uZTogbnVtYmVyOyBjeWNsZXNSZW1haW5pbmc6IG51bWJlcjsgdGltZVJlZHVjZWQ6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgY3ljbGVzRG9uZSA9IHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bjtcbiAgICAgICAgY29uc3QgY3ljbGVzUmVtYWluaW5nID0gTWF0aC5tYXgoMCwgMTAgLSBjeWNsZXNEb25lKTtcbiAgICAgICAgY29uc3QgdGltZVJlZHVjZWQgPSAoMTAgLSBjeWNsZXNSZW1haW5pbmcpICogMzA7IC8vIDMwIG1pbiBwZXIgY3ljbGVcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjeWNsZXNEb25lLFxuICAgICAgICAgICAgY3ljbGVzUmVtYWluaW5nLFxuICAgICAgICAgICAgdGltZVJlZHVjZWRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXNldCBkZWxldGlvbiBxdW90YSBpZiBuZXcgZGF5XG4gICAgICovXG4gICAgcHJpdmF0ZSBlbnN1cmVEZWxldGlvblF1b3RhUmVzZXQoKSB7XG4gICAgICAgIGNvbnN0IHRvZGF5ID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmxhc3REZWxldGlvblJlc2V0ICE9PSB0b2RheSkge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0RGVsZXRpb25SZXNldCA9IHRvZGF5O1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5ID0gMDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHVzZXIgaGFzIGZyZWUgZGVsZXRpb25zIGxlZnQgdG9kYXlcbiAgICAgKi9cbiAgICBjYW5EZWxldGVRdWVzdEZyZWUoKTogYm9vbGVhbiB7XG4gICAgICAgIHRoaXMuZW5zdXJlRGVsZXRpb25RdW90YVJlc2V0KCk7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkgPCAzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBkZWxldGlvbiBxdW90YSBzdGF0dXNcbiAgICAgKi9cbiAgICBnZXREZWxldGlvblF1b3RhKCk6IHsgZnJlZTogbnVtYmVyOyBwYWlkOiBudW1iZXI7IHJlbWFpbmluZzogbnVtYmVyIH0ge1xuICAgICAgICB0aGlzLmVuc3VyZURlbGV0aW9uUXVvdGFSZXNldCgpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVtYWluaW5nID0gTWF0aC5tYXgoMCwgMyAtIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSk7XG4gICAgICAgIGNvbnN0IHBhaWQgPSBNYXRoLm1heCgwLCB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkgLSAzKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBmcmVlOiByZW1haW5pbmcsXG4gICAgICAgICAgICBwYWlkOiBwYWlkLFxuICAgICAgICAgICAgcmVtYWluaW5nOiByZW1haW5pbmdcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgYSBxdWVzdCBhbmQgY2hhcmdlIGdvbGQgaWYgbmVjZXNzYXJ5XG4gICAgICogUmV0dXJuczogeyBjb3N0LCBtZXNzYWdlIH1cbiAgICAgKi9cbiAgICBhcHBseURlbGV0aW9uQ29zdCgpOiB7IGNvc3Q6IG51bWJlcjsgbWVzc2FnZTogc3RyaW5nIH0ge1xuICAgICAgICB0aGlzLmVuc3VyZURlbGV0aW9uUXVvdGFSZXNldCgpO1xuICAgICAgICBcbiAgICAgICAgbGV0IGNvc3QgPSAwO1xuICAgICAgICBsZXQgbWVzc2FnZSA9IFwiXCI7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5ID49IDMpIHtcbiAgICAgICAgICAgIC8vIFBhaWQgZGVsZXRpb25cbiAgICAgICAgICAgIGNvc3QgPSAxMDtcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBgUXVlc3QgZGVsZXRlZC4gQ29zdDogLSR7Y29zdH1nYDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZyZWUgZGVsZXRpb25cbiAgICAgICAgICAgIGNvbnN0IHJlbWFpbmluZyA9IDMgLSB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXk7XG4gICAgICAgICAgICBtZXNzYWdlID0gYFF1ZXN0IGRlbGV0ZWQuICgke3JlbWFpbmluZyAtIDF9IGZyZWUgZGVsZXRpb25zIHJlbWFpbmluZylgO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkrKztcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5nb2xkIC09IGNvc3Q7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBjb3N0LCBtZXNzYWdlIH07XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgU2lzeXBodXNTZXR0aW5ncywgUmVzZWFyY2hRdWVzdCB9IGZyb20gJy4uL3R5cGVzJztcblxuLyoqXG4gKiBETEMgMjogUmVzZWFyY2ggUXVlc3QgU3lzdGVtIEVuZ2luZVxuICogSGFuZGxlcyByZXNlYXJjaCBxdWVzdCBjcmVhdGlvbiwgY29tcGxldGlvbiwgd29yZCBjb3VudCB2YWxpZGF0aW9uLCBhbmQgY29tYmF0OnJlc2VhcmNoIHJhdGlvXG4gKiBcbiAqIElTT0xBVEVEOiBPbmx5IHJlYWRzL3dyaXRlcyB0byByZXNlYXJjaFF1ZXN0cywgcmVzZWFyY2hTdGF0c1xuICogREVQRU5ERU5DSUVTOiBTaXN5cGh1c1NldHRpbmdzIHR5cGVzXG4gKiBSRVFVSVJFTUVOVFM6IEF1ZGlvIGNhbGxiYWNrcyBmcm9tIHBhcmVudCBmb3Igbm90aWZpY2F0aW9uc1xuICovXG5leHBvcnQgY2xhc3MgUmVzZWFyY2hFbmdpbmUge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIGF1ZGlvQ29udHJvbGxlcj86IGFueTtcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzLCBhdWRpb0NvbnRyb2xsZXI/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlciA9IGF1ZGlvQ29udHJvbGxlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgcmVzZWFyY2ggcXVlc3RcbiAgICAgKiBDaGVja3MgMjoxIGNvbWJhdDpyZXNlYXJjaCByYXRpbyBiZWZvcmUgYWxsb3dpbmcgY3JlYXRpb25cbiAgICAgKi9cbiAgICBhc3luYyBjcmVhdGVSZXNlYXJjaFF1ZXN0KHRpdGxlOiBzdHJpbmcsIHR5cGU6IFwic3VydmV5XCIgfCBcImRlZXBfZGl2ZVwiLCBsaW5rZWRTa2lsbDogc3RyaW5nLCBsaW5rZWRDb21iYXRRdWVzdDogc3RyaW5nKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgcXVlc3RJZD86IHN0cmluZyB9PiB7XG4gICAgICAgIC8vIENoZWNrIDI6MSBjb21iYXQ6cmVzZWFyY2ggcmF0aW9cbiAgICAgICAgaWYgKCF0aGlzLmNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIlJFU0VBUkNIIEJMT0NLRUQ6IENvbXBsZXRlIDIgY29tYmF0IHF1ZXN0cyBwZXIgcmVzZWFyY2ggcXVlc3RcIlxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3Qgd29yZExpbWl0ID0gdHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IDIwMCA6IDQwMDtcbiAgICAgICAgY29uc3QgcXVlc3RJZCA9IGByZXNlYXJjaF8keyh0aGlzLnNldHRpbmdzLmxhc3RSZXNlYXJjaFF1ZXN0SWQgfHwgMCkgKyAxfWA7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZXNlYXJjaFF1ZXN0OiBSZXNlYXJjaFF1ZXN0ID0ge1xuICAgICAgICAgICAgaWQ6IHF1ZXN0SWQsXG4gICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgICAgbGlua2VkU2tpbGw6IGxpbmtlZFNraWxsLFxuICAgICAgICAgICAgd29yZExpbWl0OiB3b3JkTGltaXQsXG4gICAgICAgICAgICB3b3JkQ291bnQ6IDAsXG4gICAgICAgICAgICBsaW5rZWRDb21iYXRRdWVzdDogbGlua2VkQ29tYmF0UXVlc3QsXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGNvbXBsZXRlZDogZmFsc2VcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMucHVzaChyZXNlYXJjaFF1ZXN0KTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0UmVzZWFyY2hRdWVzdElkID0gcGFyc2VJbnQocXVlc3RJZC5zcGxpdCgnXycpWzFdKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnRvdGFsUmVzZWFyY2grKztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogYFJlc2VhcmNoIFF1ZXN0IENyZWF0ZWQ6ICR7dHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IFwiU3VydmV5XCIgOiBcIkRlZXAgRGl2ZVwifSAoJHt3b3JkTGltaXR9IHdvcmRzKWAsXG4gICAgICAgICAgICBxdWVzdElkOiBxdWVzdElkXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29tcGxldGUgYSByZXNlYXJjaCBxdWVzdFxuICAgICAqIFZhbGlkYXRlcyB3b3JkIGNvdW50ICg4MC0xMjUlKSwgYXBwbGllcyBwZW5hbHRpZXMgZm9yIG92ZXJhZ2UsIGF3YXJkcyBYUFxuICAgICAqL1xuICAgIGNvbXBsZXRlUmVzZWFyY2hRdWVzdChxdWVzdElkOiBzdHJpbmcsIGZpbmFsV29yZENvdW50OiBudW1iZXIpOiB7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgeHBSZXdhcmQ6IG51bWJlcjsgZ29sZFBlbmFsdHk6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgcmVzZWFyY2hRdWVzdCA9IHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuZmluZChxID0+IHEuaWQgPT09IHF1ZXN0SWQpO1xuICAgICAgICBpZiAoIXJlc2VhcmNoUXVlc3QpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIlJlc2VhcmNoIHF1ZXN0IG5vdCBmb3VuZFwiLCB4cFJld2FyZDogMCwgZ29sZFBlbmFsdHk6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHJlc2VhcmNoUXVlc3QuY29tcGxldGVkKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJRdWVzdCBhbHJlYWR5IGNvbXBsZXRlZFwiLCB4cFJld2FyZDogMCwgZ29sZFBlbmFsdHk6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgbWluaW11bSB3b3JkIGNvdW50ICg4MCUgb2YgbGltaXQpXG4gICAgICAgIGNvbnN0IG1pbldvcmRzID0gTWF0aC5jZWlsKHJlc2VhcmNoUXVlc3Qud29yZExpbWl0ICogMC44KTtcbiAgICAgICAgaWYgKGZpbmFsV29yZENvdW50IDwgbWluV29yZHMpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYFF1ZXN0IHRvbyBzaG9ydCEgTWluaW11bSAke21pbldvcmRzfSB3b3JkcyByZXF1aXJlZCAoeW91IGhhdmUgJHtmaW5hbFdvcmRDb3VudH0pYCxcbiAgICAgICAgICAgICAgICB4cFJld2FyZDogMCxcbiAgICAgICAgICAgICAgICBnb2xkUGVuYWx0eTogMFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgbWF4aW11bSB3b3JkIGNvdW50ICgxMjUlIGlzIGxvY2tlZClcbiAgICAgICAgaWYgKGZpbmFsV29yZENvdW50ID4gcmVzZWFyY2hRdWVzdC53b3JkTGltaXQgKiAxLjI1KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBXb3JkIGNvdW50IHRvbyBoaWdoISBNYXhpbXVtICR7TWF0aC5jZWlsKHJlc2VhcmNoUXVlc3Qud29yZExpbWl0ICogMS4yNSl9IHdvcmRzIGFsbG93ZWRgLFxuICAgICAgICAgICAgICAgIHhwUmV3YXJkOiAwLFxuICAgICAgICAgICAgICAgIGdvbGRQZW5hbHR5OiAwXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDYWxjdWxhdGUgWFAgcmV3YXJkXG4gICAgICAgIGxldCB4cFJld2FyZCA9IHJlc2VhcmNoUXVlc3QudHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IDUgOiAyMDtcbiAgICAgICAgXG4gICAgICAgIC8vIENhbGN1bGF0ZSBnb2xkIHBlbmFsdHkgZm9yIG92ZXJhZ2UgKDEwMC0xMjUlIHJhbmdlKVxuICAgICAgICBsZXQgZ29sZFBlbmFsdHkgPSAwO1xuICAgICAgICBpZiAoZmluYWxXb3JkQ291bnQgPiByZXNlYXJjaFF1ZXN0LndvcmRMaW1pdCkge1xuICAgICAgICAgICAgY29uc3Qgb3ZlcmFnZVBlcmNlbnQgPSAoKGZpbmFsV29yZENvdW50IC0gcmVzZWFyY2hRdWVzdC53b3JkTGltaXQpIC8gcmVzZWFyY2hRdWVzdC53b3JkTGltaXQpICogMTAwO1xuICAgICAgICAgICAgaWYgKG92ZXJhZ2VQZXJjZW50ID4gMCkge1xuICAgICAgICAgICAgICAgIGdvbGRQZW5hbHR5ID0gTWF0aC5mbG9vcigyMCAqIChvdmVyYWdlUGVyY2VudCAvIDEwMCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBd2FyZCBYUCB0byBsaW5rZWQgc2tpbGxcbiAgICAgICAgY29uc3Qgc2tpbGwgPSB0aGlzLnNldHRpbmdzLnNraWxscy5maW5kKHMgPT4gcy5uYW1lID09PSByZXNlYXJjaFF1ZXN0LmxpbmtlZFNraWxsKTtcbiAgICAgICAgaWYgKHNraWxsKSB7XG4gICAgICAgICAgICBza2lsbC54cCArPSB4cFJld2FyZDtcbiAgICAgICAgICAgIGlmIChza2lsbC54cCA+PSBza2lsbC54cFJlcSkge1xuICAgICAgICAgICAgICAgIHNraWxsLmxldmVsKys7XG4gICAgICAgICAgICAgICAgc2tpbGwueHAgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSBwZW5hbHR5IGFuZCBtYXJrIGNvbXBsZXRlXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZ29sZCAtPSBnb2xkUGVuYWx0eTtcbiAgICAgICAgcmVzZWFyY2hRdWVzdC5jb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICByZXNlYXJjaFF1ZXN0LmNvbXBsZXRlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMucmVzZWFyY2hDb21wbGV0ZWQrKztcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcj8ucGxheVNvdW5kKSB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBsZXQgbWVzc2FnZSA9IGBSZXNlYXJjaCBDb21wbGV0ZTogJHtyZXNlYXJjaFF1ZXN0LnRpdGxlfSEgKyR7eHBSZXdhcmR9IFhQYDtcbiAgICAgICAgaWYgKGdvbGRQZW5hbHR5ID4gMCkge1xuICAgICAgICAgICAgbWVzc2FnZSArPSBgICgtJHtnb2xkUGVuYWx0eX1nIG92ZXJhZ2UgcGVuYWx0eSlgO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlLCB4cFJld2FyZCwgZ29sZFBlbmFsdHkgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgYSByZXNlYXJjaCBxdWVzdFxuICAgICAqL1xuICAgIGRlbGV0ZVJlc2VhcmNoUXVlc3QocXVlc3RJZDogc3RyaW5nKTogeyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfSB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maW5kSW5kZXgocSA9PiBxLmlkID09PSBxdWVzdElkKTtcbiAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgY29uc3QgcXVlc3QgPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzW2luZGV4XTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRGVjcmVtZW50IHN0YXRzIGFwcHJvcHJpYXRlbHlcbiAgICAgICAgICAgIGlmICghcXVlc3QuY29tcGxldGVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnRvdGFsUmVzZWFyY2ggPSBNYXRoLm1heCgwLCB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMudG90YWxSZXNlYXJjaCAtIDEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMucmVzZWFyY2hDb21wbGV0ZWQgPSBNYXRoLm1heCgwLCB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMucmVzZWFyY2hDb21wbGV0ZWQgLSAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogXCJSZXNlYXJjaCBxdWVzdCBkZWxldGVkXCIgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiUmVzZWFyY2ggcXVlc3Qgbm90IGZvdW5kXCIgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgd29yZCBjb3VudCBmb3IgYSByZXNlYXJjaCBxdWVzdCAoYXMgdXNlciB3cml0ZXMpXG4gICAgICovXG4gICAgdXBkYXRlUmVzZWFyY2hXb3JkQ291bnQocXVlc3RJZDogc3RyaW5nLCBuZXdXb3JkQ291bnQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCByZXNlYXJjaFF1ZXN0ID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maW5kKHEgPT4gcS5pZCA9PT0gcXVlc3RJZCk7XG4gICAgICAgIGlmIChyZXNlYXJjaFF1ZXN0KSB7XG4gICAgICAgICAgICByZXNlYXJjaFF1ZXN0LndvcmRDb3VudCA9IG5ld1dvcmRDb3VudDtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCBjb21iYXQ6cmVzZWFyY2ggcmF0aW9cbiAgICAgKi9cbiAgICBnZXRSZXNlYXJjaFJhdGlvKCk6IHsgY29tYmF0OiBudW1iZXI7IHJlc2VhcmNoOiBudW1iZXI7IHJhdGlvOiBzdHJpbmcgfSB7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzO1xuICAgICAgICBjb25zdCByYXRpbyA9IHN0YXRzLnRvdGFsQ29tYmF0IC8gTWF0aC5tYXgoMSwgc3RhdHMudG90YWxSZXNlYXJjaCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjb21iYXQ6IHN0YXRzLnRvdGFsQ29tYmF0LFxuICAgICAgICAgICAgcmVzZWFyY2g6IHN0YXRzLnRvdGFsUmVzZWFyY2gsXG4gICAgICAgICAgICByYXRpbzogcmF0aW8udG9GaXhlZCgyKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHVzZXIgY2FuIGNyZWF0ZSBtb3JlIHJlc2VhcmNoIHF1ZXN0c1xuICAgICAqIFJ1bGU6IE11c3QgaGF2ZSAyOjEgY29tYmF0IHRvIHJlc2VhcmNoIHJhdGlvXG4gICAgICovXG4gICAgY2FuQ3JlYXRlUmVzZWFyY2hRdWVzdCgpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3Qgc3RhdHMgPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHM7XG4gICAgICAgIGNvbnN0IHJhdGlvID0gc3RhdHMudG90YWxDb21iYXQgLyBNYXRoLm1heCgxLCBzdGF0cy50b3RhbFJlc2VhcmNoKTtcbiAgICAgICAgcmV0dXJuIHJhdGlvID49IDI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFjdGl2ZSAobm90IGNvbXBsZXRlZCkgcmVzZWFyY2ggcXVlc3RzXG4gICAgICovXG4gICAgZ2V0QWN0aXZlUmVzZWFyY2hRdWVzdHMoKTogUmVzZWFyY2hRdWVzdFtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuZmlsdGVyKHEgPT4gIXEuY29tcGxldGVkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgY29tcGxldGVkIHJlc2VhcmNoIHF1ZXN0c1xuICAgICAqL1xuICAgIGdldENvbXBsZXRlZFJlc2VhcmNoUXVlc3RzKCk6IFJlc2VhcmNoUXVlc3RbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbHRlcihxID0+IHEuY29tcGxldGVkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0ZSB3b3JkIGNvdW50IHN0YXR1cyBmb3IgYSBxdWVzdFxuICAgICAqIFJldHVybnM6IHsgc3RhdHVzOiAndG9vX3Nob3J0JyB8ICdwZXJmZWN0JyB8ICdvdmVyYWdlJyB8ICdsb2NrZWQnLCBwZXJjZW50OiBudW1iZXIgfVxuICAgICAqL1xuICAgIHZhbGlkYXRlV29yZENvdW50KHF1ZXN0SWQ6IHN0cmluZywgd29yZENvdW50OiBudW1iZXIpOiB7IHN0YXR1czogJ3Rvb19zaG9ydCcgfCAncGVyZmVjdCcgfCAnb3ZlcmFnZScgfCAnbG9ja2VkJzsgcGVyY2VudDogbnVtYmVyOyBtZXNzYWdlOiBzdHJpbmcgfSB7XG4gICAgICAgIGNvbnN0IHF1ZXN0ID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maW5kKHEgPT4gcS5pZCA9PT0gcXVlc3RJZCk7XG4gICAgICAgIGlmICghcXVlc3QpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN0YXR1czogJ3Rvb19zaG9ydCcsIHBlcmNlbnQ6IDAsIG1lc3NhZ2U6IFwiUXVlc3Qgbm90IGZvdW5kXCIgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgcGVyY2VudCA9ICh3b3JkQ291bnQgLyBxdWVzdC53b3JkTGltaXQpICogMTAwO1xuICAgICAgICBcbiAgICAgICAgaWYgKHBlcmNlbnQgPCA4MCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiAndG9vX3Nob3J0JywgcGVyY2VudCwgbWVzc2FnZTogYFRvbyBzaG9ydCAoJHtNYXRoLmNlaWwocGVyY2VudCl9JSkuIE5lZWQgODAlIG1pbmltdW0uYCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAocGVyY2VudCA8PSAxMDApIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN0YXR1czogJ3BlcmZlY3QnLCBwZXJjZW50LCBtZXNzYWdlOiBgUGVyZmVjdCByYW5nZSAoJHtNYXRoLmNlaWwocGVyY2VudCl9JSlgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChwZXJjZW50IDw9IDEyNSkge1xuICAgICAgICAgICAgY29uc3QgdGF4ID0gTWF0aC5mbG9vcigyMCAqICgocGVyY2VudCAtIDEwMCkgLyAxMDApKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN0YXR1czogJ292ZXJhZ2UnLCBwZXJjZW50LCBtZXNzYWdlOiBgT3ZlcmFnZSB3YXJuaW5nOiAtJHt0YXh9ZyB0YXhgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7IHN0YXR1czogJ2xvY2tlZCcsIHBlcmNlbnQsIG1lc3NhZ2U6IGBMb2NrZWQhIE1heGltdW0gMTI1JSBvZiB3b3JkIGxpbWl0LmAgfTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBRdWVzdENoYWluLCBRdWVzdENoYWluUmVjb3JkIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG4vKipcbiAqIERMQyA0OiBRdWVzdCBDaGFpbnMgRW5naW5lXG4gKiBIYW5kbGVzIG11bHRpLXF1ZXN0IHNlcXVlbmNlcyB3aXRoIG9yZGVyaW5nLCBsb2NraW5nLCBhbmQgY29tcGxldGlvbiB0cmFja2luZ1xuICogXG4gKiBJU09MQVRFRDogT25seSByZWFkcy93cml0ZXMgdG8gYWN0aXZlQ2hhaW5zLCBjaGFpbkhpc3RvcnksIGN1cnJlbnRDaGFpbklkLCBjaGFpblF1ZXN0c0NvbXBsZXRlZFxuICogREVQRU5ERU5DSUVTOiBTaXN5cGh1c1NldHRpbmdzIHR5cGVzXG4gKiBJTlRFR1JBVElPTiBQT0lOVFM6IE5lZWRzIHRvIGhvb2sgaW50byBjb21wbGV0ZVF1ZXN0KCkgaW4gbWFpbiBlbmdpbmUgZm9yIGNoYWluIHByb2dyZXNzaW9uXG4gKi9cbmV4cG9ydCBjbGFzcyBDaGFpbnNFbmdpbmUge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIGF1ZGlvQ29udHJvbGxlcj86IGFueTtcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzLCBhdWRpb0NvbnRyb2xsZXI/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlciA9IGF1ZGlvQ29udHJvbGxlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgcXVlc3QgY2hhaW5cbiAgICAgKi9cbiAgICBhc3luYyBjcmVhdGVRdWVzdENoYWluKG5hbWU6IHN0cmluZywgcXVlc3ROYW1lczogc3RyaW5nW10pOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyBjaGFpbklkPzogc3RyaW5nIH0+IHtcbiAgICAgICAgaWYgKHF1ZXN0TmFtZXMubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIkNoYWluIG11c3QgaGF2ZSBhdCBsZWFzdCAyIHF1ZXN0c1wiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjaGFpbklkID0gYGNoYWluXyR7RGF0ZS5ub3coKX1gO1xuICAgICAgICBjb25zdCBjaGFpbjogUXVlc3RDaGFpbiA9IHtcbiAgICAgICAgICAgIGlkOiBjaGFpbklkLFxuICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgIHF1ZXN0czogcXVlc3ROYW1lcyxcbiAgICAgICAgICAgIGN1cnJlbnRJbmRleDogMCxcbiAgICAgICAgICAgIGNvbXBsZXRlZDogZmFsc2UsXG4gICAgICAgICAgICBzdGFydGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGlzQm9zczogcXVlc3ROYW1lc1txdWVzdE5hbWVzLmxlbmd0aCAtIDFdLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoXCJib3NzXCIpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5wdXNoKGNoYWluKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jdXJyZW50Q2hhaW5JZCA9IGNoYWluSWQ7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBDaGFpbiBjcmVhdGVkOiAke25hbWV9ICgke3F1ZXN0TmFtZXMubGVuZ3RofSBxdWVzdHMpYCxcbiAgICAgICAgICAgIGNoYWluSWQ6IGNoYWluSWRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIGN1cnJlbnQgYWN0aXZlIGNoYWluXG4gICAgICovXG4gICAgZ2V0QWN0aXZlQ2hhaW4oKTogUXVlc3RDaGFpbiB8IG51bGwge1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuY3VycmVudENoYWluSWQpIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5maW5kKGMgPT4gYy5pZCA9PT0gdGhpcy5zZXR0aW5ncy5jdXJyZW50Q2hhaW5JZCk7XG4gICAgICAgIHJldHVybiAoY2hhaW4gJiYgIWNoYWluLmNvbXBsZXRlZCkgPyBjaGFpbiA6IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBuZXh0IHF1ZXN0IHRoYXQgc2hvdWxkIGJlIGNvbXBsZXRlZCBpbiB0aGUgYWN0aXZlIGNoYWluXG4gICAgICovXG4gICAgZ2V0TmV4dFF1ZXN0SW5DaGFpbigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIGlmICghY2hhaW4pIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNoYWluLnF1ZXN0c1tjaGFpbi5jdXJyZW50SW5kZXhdIHx8IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgYSBxdWVzdCBpcyBwYXJ0IG9mIGFuIGFjdGl2ZSAoaW5jb21wbGV0ZSkgY2hhaW5cbiAgICAgKi9cbiAgICBpc1F1ZXN0SW5DaGFpbihxdWVzdE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zLmZpbmQoYyA9PiAhYy5jb21wbGV0ZWQpO1xuICAgICAgICBpZiAoIWNoYWluKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiBjaGFpbi5xdWVzdHMuaW5jbHVkZXMocXVlc3ROYW1lKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBhIHF1ZXN0IGNhbiBiZSBzdGFydGVkIChpcyBpdCB0aGUgbmV4dCBxdWVzdCBpbiB0aGUgY2hhaW4/KVxuICAgICAqL1xuICAgIGNhblN0YXJ0UXVlc3QocXVlc3ROYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIGlmICghY2hhaW4pIHJldHVybiB0cnVlOyAvLyBOb3QgaW4gYSBjaGFpbiwgY2FuIHN0YXJ0IGFueSBxdWVzdFxuICAgICAgICBcbiAgICAgICAgY29uc3QgbmV4dFF1ZXN0ID0gdGhpcy5nZXROZXh0UXVlc3RJbkNoYWluKCk7XG4gICAgICAgIHJldHVybiBuZXh0UXVlc3QgPT09IHF1ZXN0TmFtZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNYXJrIGEgcXVlc3QgYXMgY29tcGxldGVkIGluIHRoZSBjaGFpblxuICAgICAqIEFkdmFuY2VzIGNoYWluIGlmIHN1Y2Nlc3NmdWwsIGF3YXJkcyBib251cyBYUCBpZiBjaGFpbiBjb21wbGV0ZXNcbiAgICAgKi9cbiAgICBhc3luYyBjb21wbGV0ZUNoYWluUXVlc3QocXVlc3ROYW1lOiBzdHJpbmcpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyBjaGFpbkNvbXBsZXRlOiBib29sZWFuOyBib251c1hwOiBudW1iZXIgfT4ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiTm8gYWN0aXZlIGNoYWluXCIsIGNoYWluQ29tcGxldGU6IGZhbHNlLCBib251c1hwOiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRRdWVzdCA9IGNoYWluLnF1ZXN0c1tjaGFpbi5jdXJyZW50SW5kZXhdO1xuICAgICAgICBpZiAoY3VycmVudFF1ZXN0ICE9PSBxdWVzdE5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogXCJRdWVzdCBpcyBub3QgbmV4dCBpbiBjaGFpblwiLFxuICAgICAgICAgICAgICAgIGNoYWluQ29tcGxldGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGJvbnVzWHA6IDBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNoYWluLmN1cnJlbnRJbmRleCsrO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmNoYWluUXVlc3RzQ29tcGxldGVkKys7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBjaGFpbiBpcyBjb21wbGV0ZVxuICAgICAgICBpZiAoY2hhaW4uY3VycmVudEluZGV4ID49IGNoYWluLnF1ZXN0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBsZXRlQ2hhaW4oY2hhaW4pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZW1haW5pbmcgPSBjaGFpbi5xdWVzdHMubGVuZ3RoIC0gY2hhaW4uY3VycmVudEluZGV4O1xuICAgICAgICBjb25zdCBwZXJjZW50ID0gTWF0aC5mbG9vcigoY2hhaW4uY3VycmVudEluZGV4IC8gY2hhaW4ucXVlc3RzLmxlbmd0aCkgKiAxMDApO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBgQ2hhaW4gcHJvZ3Jlc3M6ICR7Y2hhaW4uY3VycmVudEluZGV4fS8ke2NoYWluLnF1ZXN0cy5sZW5ndGh9ICgke3JlbWFpbmluZ30gcmVtYWluaW5nLCAke3BlcmNlbnR9JSBjb21wbGV0ZSlgLFxuICAgICAgICAgICAgY2hhaW5Db21wbGV0ZTogZmFsc2UsXG4gICAgICAgICAgICBib251c1hwOiAwXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29tcGxldGUgdGhlIGVudGlyZSBjaGFpblxuICAgICAqL1xuICAgIHByaXZhdGUgYXN5bmMgY29tcGxldGVDaGFpbihjaGFpbjogUXVlc3RDaGFpbik6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmc7IGNoYWluQ29tcGxldGU6IGJvb2xlYW47IGJvbnVzWHA6IG51bWJlciB9PiB7XG4gICAgICAgIGNoYWluLmNvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgIGNoYWluLmNvbXBsZXRlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYm9udXNYcCA9IDEwMDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy54cCArPSBib251c1hwO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVjb3JkOiBRdWVzdENoYWluUmVjb3JkID0ge1xuICAgICAgICAgICAgY2hhaW5JZDogY2hhaW4uaWQsXG4gICAgICAgICAgICBjaGFpbk5hbWU6IGNoYWluLm5hbWUsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0czogY2hhaW4ucXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIGNvbXBsZXRlZEF0OiBjaGFpbi5jb21wbGV0ZWRBdCxcbiAgICAgICAgICAgIHhwRWFybmVkOiBib251c1hwXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeS5wdXNoKHJlY29yZCk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5hdWRpb0NvbnRyb2xsZXI/LnBsYXlTb3VuZCkge1xuICAgICAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBgQ2hhaW4gY29tcGxldGU6ICR7Y2hhaW4ubmFtZX0hICske2JvbnVzWHB9IFhQIEJvbnVzYCxcbiAgICAgICAgICAgIGNoYWluQ29tcGxldGU6IHRydWUsXG4gICAgICAgICAgICBib251c1hwOiBib251c1hwXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQnJlYWsgYW4gYWN0aXZlIGNoYWluXG4gICAgICogS2VlcHMgZWFybmVkIFhQIGZyb20gY29tcGxldGVkIHF1ZXN0c1xuICAgICAqL1xuICAgIGFzeW5jIGJyZWFrQ2hhaW4oKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgeHBLZXB0OiBudW1iZXIgfT4ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiTm8gYWN0aXZlIGNoYWluIHRvIGJyZWFrXCIsIHhwS2VwdDogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb21wbGV0ZWQgPSBjaGFpbi5jdXJyZW50SW5kZXg7XG4gICAgICAgIGNvbnN0IHhwS2VwdCA9IGNvbXBsZXRlZCAqIDEwOyAvLyBBcHByb3hpbWF0ZSBYUCBmcm9tIGVhY2ggcXVlc3RcbiAgICAgICAgXG4gICAgICAgIC8vIFNhdmUgdG8gaGlzdG9yeSBhcyBicm9rZW5cbiAgICAgICAgY29uc3QgcmVjb3JkOiBRdWVzdENoYWluUmVjb3JkID0ge1xuICAgICAgICAgICAgY2hhaW5JZDogY2hhaW4uaWQsXG4gICAgICAgICAgICBjaGFpbk5hbWU6IGNoYWluLm5hbWUsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0czogY2hhaW4ucXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIGNvbXBsZXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICB4cEVhcm5lZDogeHBLZXB0XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeS5wdXNoKHJlY29yZCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zID0gdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMuZmlsdGVyKGMgPT4gYy5pZCAhPT0gY2hhaW4uaWQpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmN1cnJlbnRDaGFpbklkID0gXCJcIjtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogYENoYWluIGJyb2tlbjogJHtjaGFpbi5uYW1lfS4gS2VwdCAke2NvbXBsZXRlZH0gcXVlc3QgY29tcGxldGlvbnMgKCR7eHBLZXB0fSBYUCkuYCxcbiAgICAgICAgICAgIHhwS2VwdDogeHBLZXB0XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHByb2dyZXNzIG9mIGFjdGl2ZSBjaGFpblxuICAgICAqL1xuICAgIGdldENoYWluUHJvZ3Jlc3MoKTogeyBjb21wbGV0ZWQ6IG51bWJlcjsgdG90YWw6IG51bWJlcjsgcGVyY2VudDogbnVtYmVyIH0ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikgcmV0dXJuIHsgY29tcGxldGVkOiAwLCB0b3RhbDogMCwgcGVyY2VudDogMCB9O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNvbXBsZXRlZDogY2hhaW4uY3VycmVudEluZGV4LFxuICAgICAgICAgICAgdG90YWw6IGNoYWluLnF1ZXN0cy5sZW5ndGgsXG4gICAgICAgICAgICBwZXJjZW50OiBNYXRoLmZsb29yKChjaGFpbi5jdXJyZW50SW5kZXggLyBjaGFpbi5xdWVzdHMubGVuZ3RoKSAqIDEwMClcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIGNvbXBsZXRlZCBjaGFpbiByZWNvcmRzIChoaXN0b3J5KVxuICAgICAqL1xuICAgIGdldENoYWluSGlzdG9yeSgpOiBRdWVzdENoYWluUmVjb3JkW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXR0aW5ncy5jaGFpbkhpc3Rvcnk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCBhY3RpdmUgY2hhaW5zIChub3QgY29tcGxldGVkKVxuICAgICAqL1xuICAgIGdldEFjdGl2ZUNoYWlucygpOiBRdWVzdENoYWluW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMuZmlsdGVyKGMgPT4gIWMuY29tcGxldGVkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgZGV0YWlsZWQgc3RhdGUgb2YgYWN0aXZlIGNoYWluIChmb3IgVUkgcmVuZGVyaW5nKVxuICAgICAqL1xuICAgIGdldENoYWluRGV0YWlscygpOiB7XG4gICAgICAgIGNoYWluOiBRdWVzdENoYWluIHwgbnVsbDtcbiAgICAgICAgcHJvZ3Jlc3M6IHsgY29tcGxldGVkOiBudW1iZXI7IHRvdGFsOiBudW1iZXI7IHBlcmNlbnQ6IG51bWJlciB9O1xuICAgICAgICBxdWVzdFN0YXRlczogQXJyYXk8eyBxdWVzdDogc3RyaW5nOyBzdGF0dXM6ICdjb21wbGV0ZWQnIHwgJ2FjdGl2ZScgfCAnbG9ja2VkJyB9PjtcbiAgICB9IHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIGlmICghY2hhaW4pIHtcbiAgICAgICAgICAgIHJldHVybiB7IGNoYWluOiBudWxsLCBwcm9ncmVzczogeyBjb21wbGV0ZWQ6IDAsIHRvdGFsOiAwLCBwZXJjZW50OiAwIH0sIHF1ZXN0U3RhdGVzOiBbXSB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBwcm9ncmVzcyA9IHRoaXMuZ2V0Q2hhaW5Qcm9ncmVzcygpO1xuICAgICAgICBjb25zdCBxdWVzdFN0YXRlcyA9IGNoYWluLnF1ZXN0cy5tYXAoKHF1ZXN0LCBpZHgpID0+IHtcbiAgICAgICAgICAgIGlmIChpZHggPCBjaGFpbi5jdXJyZW50SW5kZXgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBxdWVzdCwgc3RhdHVzOiAnY29tcGxldGVkJyBhcyBjb25zdCB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpZHggPT09IGNoYWluLmN1cnJlbnRJbmRleCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHF1ZXN0LCBzdGF0dXM6ICdhY3RpdmUnIGFzIGNvbnN0IH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHF1ZXN0LCBzdGF0dXM6ICdsb2NrZWQnIGFzIGNvbnN0IH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHsgY2hhaW4sIHByb2dyZXNzLCBxdWVzdFN0YXRlcyB9O1xuICAgIH1cbn1cbiIsImltcG9ydCB7IFRGaWxlIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgU2lzeXBodXNTZXR0aW5ncywgQ29udGV4dEZpbHRlciwgRmlsdGVyU3RhdGUsIEVuZXJneUxldmVsLCBRdWVzdENvbnRleHQgfSBmcm9tICcuLi90eXBlcyc7XG5cbi8qKlxuICogRExDIDU6IENvbnRleHQgRmlsdGVycyBFbmdpbmVcbiAqIEhhbmRsZXMgcXVlc3QgZmlsdGVyaW5nIGJ5IGVuZXJneSBsZXZlbCwgbG9jYXRpb24gY29udGV4dCwgYW5kIGN1c3RvbSB0YWdzXG4gKiBcbiAqIElTT0xBVEVEOiBPbmx5IHJlYWRzL3dyaXRlcyB0byBxdWVzdEZpbHRlcnMsIGZpbHRlclN0YXRlXG4gKiBERVBFTkRFTkNJRVM6IFNpc3lwaHVzU2V0dGluZ3MgdHlwZXMsIFRGaWxlIChmb3IgcXVlc3QgbWV0YWRhdGEpXG4gKiBOT1RFOiBUaGlzIGlzIHByaW1hcmlseSBhIFZJRVcgTEFZRVIgY29uY2VybiwgYnV0IGtlZXBpbmcgbG9naWMgaXNvbGF0ZWQgaXMgZ29vZFxuICovXG5leHBvcnQgY2xhc3MgRmlsdGVyc0VuZ2luZSB7XG4gICAgc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3M7XG5cbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncykge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0IGZpbHRlciBmb3IgYSBzcGVjaWZpYyBxdWVzdFxuICAgICAqL1xuICAgIHNldFF1ZXN0RmlsdGVyKHF1ZXN0TmFtZTogc3RyaW5nLCBlbmVyZ3k6IEVuZXJneUxldmVsLCBjb250ZXh0OiBRdWVzdENvbnRleHQsIHRhZ3M6IHN0cmluZ1tdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV0gPSB7XG4gICAgICAgICAgICBlbmVyZ3lMZXZlbDogZW5lcmd5LFxuICAgICAgICAgICAgY29udGV4dDogY29udGV4dCxcbiAgICAgICAgICAgIHRhZ3M6IHRhZ3NcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgZmlsdGVyIGZvciBhIHNwZWNpZmljIHF1ZXN0XG4gICAgICovXG4gICAgZ2V0UXVlc3RGaWx0ZXIocXVlc3ROYW1lOiBzdHJpbmcpOiBDb250ZXh0RmlsdGVyIHwgbnVsbCB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdIHx8IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSBhY3RpdmUgZmlsdGVyIHN0YXRlXG4gICAgICovXG4gICAgc2V0RmlsdGVyU3RhdGUoZW5lcmd5OiBFbmVyZ3lMZXZlbCB8IFwiYW55XCIsIGNvbnRleHQ6IFF1ZXN0Q29udGV4dCB8IFwiYW55XCIsIHRhZ3M6IHN0cmluZ1tdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUgPSB7XG4gICAgICAgICAgICBhY3RpdmVFbmVyZ3k6IGVuZXJneSBhcyBhbnksXG4gICAgICAgICAgICBhY3RpdmVDb250ZXh0OiBjb250ZXh0IGFzIGFueSxcbiAgICAgICAgICAgIGFjdGl2ZVRhZ3M6IHRhZ3NcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCBmaWx0ZXIgc3RhdGVcbiAgICAgKi9cbiAgICBnZXRGaWx0ZXJTdGF0ZSgpOiBGaWx0ZXJTdGF0ZSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGEgcXVlc3QgbWF0Y2hlcyBjdXJyZW50IGZpbHRlciBzdGF0ZVxuICAgICAqL1xuICAgIHF1ZXN0TWF0Y2hlc0ZpbHRlcihxdWVzdE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBmaWx0ZXJzID0gdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZTtcbiAgICAgICAgY29uc3QgcXVlc3RGaWx0ZXIgPSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgbm8gZmlsdGVyIHNldCBmb3IgdGhpcyBxdWVzdCwgYWx3YXlzIHNob3dcbiAgICAgICAgaWYgKCFxdWVzdEZpbHRlcikgcmV0dXJuIHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmVyZ3kgZmlsdGVyXG4gICAgICAgIGlmIChmaWx0ZXJzLmFjdGl2ZUVuZXJneSAhPT0gXCJhbnlcIiAmJiBxdWVzdEZpbHRlci5lbmVyZ3lMZXZlbCAhPT0gZmlsdGVycy5hY3RpdmVFbmVyZ3kpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29udGV4dCBmaWx0ZXJcbiAgICAgICAgaWYgKGZpbHRlcnMuYWN0aXZlQ29udGV4dCAhPT0gXCJhbnlcIiAmJiBxdWVzdEZpbHRlci5jb250ZXh0ICE9PSBmaWx0ZXJzLmFjdGl2ZUNvbnRleHQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVGFncyBmaWx0ZXIgKHJlcXVpcmVzIEFOWSBvZiB0aGUgYWN0aXZlIHRhZ3MpXG4gICAgICAgIGlmIChmaWx0ZXJzLmFjdGl2ZVRhZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgaGFzVGFnID0gZmlsdGVycy5hY3RpdmVUYWdzLnNvbWUoKHRhZzogc3RyaW5nKSA9PiBxdWVzdEZpbHRlci50YWdzLmluY2x1ZGVzKHRhZykpO1xuICAgICAgICAgICAgaWYgKCFoYXNUYWcpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmlsdGVyIGEgbGlzdCBvZiBxdWVzdHMgYmFzZWQgb24gY3VycmVudCBmaWx0ZXIgc3RhdGVcbiAgICAgKi9cbiAgICBmaWx0ZXJRdWVzdHMocXVlc3RzOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+KTogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9PiB7XG4gICAgICAgIHJldHVybiBxdWVzdHMuZmlsdGVyKHF1ZXN0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0TmFtZSA9IHF1ZXN0LmJhc2VuYW1lIHx8IHF1ZXN0Lm5hbWU7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5xdWVzdE1hdGNoZXNGaWx0ZXIocXVlc3ROYW1lKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHF1ZXN0cyBieSBzcGVjaWZpYyBlbmVyZ3kgbGV2ZWxcbiAgICAgKi9cbiAgICBnZXRRdWVzdHNCeUVuZXJneShlbmVyZ3k6IEVuZXJneUxldmVsLCBxdWVzdHM6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4pOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+IHtcbiAgICAgICAgcmV0dXJuIHF1ZXN0cy5maWx0ZXIocSA9PiB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdE5hbWUgPSBxLmJhc2VuYW1lIHx8IHEubmFtZTtcbiAgICAgICAgICAgIGNvbnN0IGZpbHRlciA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV07XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyICYmIGZpbHRlci5lbmVyZ3lMZXZlbCA9PT0gZW5lcmd5O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcXVlc3RzIGJ5IHNwZWNpZmljIGNvbnRleHRcbiAgICAgKi9cbiAgICBnZXRRdWVzdHNCeUNvbnRleHQoY29udGV4dDogUXVlc3RDb250ZXh0LCBxdWVzdHM6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4pOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+IHtcbiAgICAgICAgcmV0dXJuIHF1ZXN0cy5maWx0ZXIocSA9PiB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdE5hbWUgPSBxLmJhc2VuYW1lIHx8IHEubmFtZTtcbiAgICAgICAgICAgIGNvbnN0IGZpbHRlciA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV07XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyICYmIGZpbHRlci5jb250ZXh0ID09PSBjb250ZXh0O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcXVlc3RzIGJ5IHNwZWNpZmljIHRhZ3NcbiAgICAgKi9cbiAgICBnZXRRdWVzdHNCeVRhZ3ModGFnczogc3RyaW5nW10sIHF1ZXN0czogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9Pik6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4ge1xuICAgICAgICByZXR1cm4gcXVlc3RzLmZpbHRlcihxID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0TmFtZSA9IHEuYmFzZW5hbWUgfHwgcS5uYW1lO1xuICAgICAgICAgICAgY29uc3QgZmlsdGVyID0gdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnNbcXVlc3ROYW1lXTtcbiAgICAgICAgICAgIGlmICghZmlsdGVyKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm4gdGFncy5zb21lKHRhZyA9PiBmaWx0ZXIudGFncy5pbmNsdWRlcyh0YWcpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2xlYXIgYWxsIGFjdGl2ZSBmaWx0ZXJzXG4gICAgICovXG4gICAgY2xlYXJGaWx0ZXJzKCk6IHZvaWQge1xuICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlID0ge1xuICAgICAgICAgICAgYWN0aXZlRW5lcmd5OiBcImFueVwiLFxuICAgICAgICAgICAgYWN0aXZlQ29udGV4dDogXCJhbnlcIixcbiAgICAgICAgICAgIGFjdGl2ZVRhZ3M6IFtdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCB1bmlxdWUgdGFncyB1c2VkIGFjcm9zcyBhbGwgcXVlc3RzXG4gICAgICovXG4gICAgZ2V0QXZhaWxhYmxlVGFncygpOiBzdHJpbmdbXSB7XG4gICAgICAgIGNvbnN0IHRhZ3MgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgXG4gICAgICAgIGZvciAoY29uc3QgcXVlc3ROYW1lIGluIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzKSB7XG4gICAgICAgICAgICBjb25zdCBmaWx0ZXIgPSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdO1xuICAgICAgICAgICAgZmlsdGVyLnRhZ3MuZm9yRWFjaCgodGFnOiBzdHJpbmcpID0+IHRhZ3MuYWRkKHRhZykpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gQXJyYXkuZnJvbSh0YWdzKS5zb3J0KCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHN1bW1hcnkgc3RhdHMgYWJvdXQgZmlsdGVyZWQgc3RhdGVcbiAgICAgKi9cbiAgICBnZXRGaWx0ZXJTdGF0cyhhbGxRdWVzdHM6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4pOiB7XG4gICAgICAgIHRvdGFsOiBudW1iZXI7XG4gICAgICAgIGZpbHRlcmVkOiBudW1iZXI7XG4gICAgICAgIGFjdGl2ZUZpbHRlcnNDb3VudDogbnVtYmVyO1xuICAgIH0ge1xuICAgICAgICBjb25zdCBmaWx0ZXJlZCA9IHRoaXMuZmlsdGVyUXVlc3RzKGFsbFF1ZXN0cyk7XG4gICAgICAgIGNvbnN0IGFjdGl2ZUZpbHRlcnNDb3VudCA9ICh0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUVuZXJneSAhPT0gXCJhbnlcIiA/IDEgOiAwKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUNvbnRleHQgIT09IFwiYW55XCIgPyAxIDogMCkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVUYWdzLmxlbmd0aCA+IDAgPyAxIDogMCk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdG90YWw6IGFsbFF1ZXN0cy5sZW5ndGgsXG4gICAgICAgICAgICBmaWx0ZXJlZDogZmlsdGVyZWQubGVuZ3RoLFxuICAgICAgICAgICAgYWN0aXZlRmlsdGVyc0NvdW50OiBhY3RpdmVGaWx0ZXJzQ291bnRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgYSBzcGVjaWZpYyBmaWx0ZXIgdmFsdWVcbiAgICAgKiBVc2VmdWwgZm9yIFVJIHRvZ2dsZSBidXR0b25zXG4gICAgICovXG4gICAgdG9nZ2xlRW5lcmd5RmlsdGVyKGVuZXJneTogRW5lcmd5TGV2ZWwgfCBcImFueVwiKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUVuZXJneSA9PT0gZW5lcmd5KSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUVuZXJneSA9IFwiYW55XCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUVuZXJneSA9IGVuZXJneSBhcyBhbnk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgY29udGV4dCBmaWx0ZXJcbiAgICAgKi9cbiAgICB0b2dnbGVDb250ZXh0RmlsdGVyKGNvbnRleHQ6IFF1ZXN0Q29udGV4dCB8IFwiYW55XCIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlQ29udGV4dCA9PT0gY29udGV4dCkge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVDb250ZXh0ID0gXCJhbnlcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlQ29udGV4dCA9IGNvbnRleHQgYXMgYW55O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGEgdGFnIGluIHRoZSBhY3RpdmUgdGFnIGxpc3RcbiAgICAgKi9cbiAgICB0b2dnbGVUYWcodGFnOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVUYWdzLmluZGV4T2YodGFnKTtcbiAgICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZVRhZ3Muc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZVRhZ3MucHVzaCh0YWcpO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgQXBwLCBURmlsZSwgVEZvbGRlciwgTm90aWNlLCBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBTa2lsbCwgTW9kaWZpZXIsIERhaWx5TWlzc2lvbiB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgQXVkaW9Db250cm9sbGVyLCBUaW55RW1pdHRlciB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgQ2hhb3NNb2RhbCB9IGZyb20gJy4vdWkvbW9kYWxzJztcbmltcG9ydCB7IEFuYWx5dGljc0VuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9BbmFseXRpY3NFbmdpbmUnO1xuaW1wb3J0IHsgTWVkaXRhdGlvbkVuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9NZWRpdGF0aW9uRW5naW5lJztcbmltcG9ydCB7IFJlc2VhcmNoRW5naW5lIH0gZnJvbSAnLi9lbmdpbmVzL1Jlc2VhcmNoRW5naW5lJztcbmltcG9ydCB7IENoYWluc0VuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9DaGFpbnNFbmdpbmUnO1xuaW1wb3J0IHsgRmlsdGVyc0VuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9GaWx0ZXJzRW5naW5lJztcblxuLy8gREVGQVVMVCBDT05TVEFOVFNcbmV4cG9ydCBjb25zdCBERUZBVUxUX01PRElGSUVSOiBNb2RpZmllciA9IHsgbmFtZTogXCJDbGVhciBTa2llc1wiLCBkZXNjOiBcIk5vIGVmZmVjdHMuXCIsIHhwTXVsdDogMSwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMSwgaWNvbjogXCLimIDvuI9cIiB9O1xuZXhwb3J0IGNvbnN0IENIQU9TX1RBQkxFOiBNb2RpZmllcltdID0gW1xuICAgIHsgbmFtZTogXCJDbGVhciBTa2llc1wiLCBkZXNjOiBcIk5vcm1hbC5cIiwgeHBNdWx0OiAxLCBnb2xkTXVsdDogMSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIuKYgO+4j1wiIH0sXG4gICAgeyBuYW1lOiBcIkZsb3cgU3RhdGVcIiwgZGVzYzogXCIrNTAlIFhQLlwiLCB4cE11bHQ6IDEuNSwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMSwgaWNvbjogXCLwn4yKXCIgfSxcbiAgICB7IG5hbWU6IFwiV2luZGZhbGxcIiwgZGVzYzogXCIrNTAlIEdvbGQuXCIsIHhwTXVsdDogMSwgZ29sZE11bHQ6IDEuNSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIvCfkrBcIiB9LFxuICAgIHsgbmFtZTogXCJJbmZsYXRpb25cIiwgZGVzYzogXCJQcmljZXMgMnguXCIsIHhwTXVsdDogMSwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMiwgaWNvbjogXCLwn5OIXCIgfSxcbiAgICB7IG5hbWU6IFwiQnJhaW4gRm9nXCIsIGRlc2M6IFwiWFAgMC41eC5cIiwgeHBNdWx0OiAwLjUsIGdvbGRNdWx0OiAxLCBwcmljZU11bHQ6IDEsIGljb246IFwi8J+Mq++4j1wiIH0sXG4gICAgeyBuYW1lOiBcIlJpdmFsIFNhYm90YWdlXCIsIGRlc2M6IFwiR29sZCAwLjV4LlwiLCB4cE11bHQ6IDEsIGdvbGRNdWx0OiAwLjUsIHByaWNlTXVsdDogMSwgaWNvbjogXCLwn5W177iPXCIgfSxcbiAgICB7IG5hbWU6IFwiQWRyZW5hbGluZVwiLCBkZXNjOiBcIjJ4IFhQLCAtNSBIUC9RLlwiLCB4cE11bHQ6IDIsIGdvbGRNdWx0OiAxLCBwcmljZU11bHQ6IDEsIGljb246IFwi8J+SiVwiIH1cbl07XG5cbi8vIEJPU1MgREFUQVxuY29uc3QgQk9TU19EQVRBOiBSZWNvcmQ8bnVtYmVyLCB7IG5hbWU6IHN0cmluZywgZGVzYzogc3RyaW5nLCBocF9wZW46IG51bWJlciB9PiA9IHtcbiAgICAxMDogeyBuYW1lOiBcIlRoZSBHYXRla2VlcGVyXCIsIGRlc2M6IFwiVGhlIGZpcnN0IG1ham9yIGZpbHRlci4gUHJvdmUgeW91IGJlbG9uZyBoZXJlLlwiLCBocF9wZW46IDIwIH0sXG4gICAgMjA6IHsgbmFtZTogXCJUaGUgU2hhZG93IFNlbGZcIiwgZGVzYzogXCJZb3VyIG93biBiYWQgaGFiaXRzIG1hbmlmZXN0LlwiLCBocF9wZW46IDMwIH0sXG4gICAgMzA6IHsgbmFtZTogXCJUaGUgTW91bnRhaW5cIiwgZGVzYzogXCJUaGUgcGVhayBpcyB2aXNpYmxlLCBidXQgdGhlIGFpciBpcyB0aGluLlwiLCBocF9wZW46IDQwIH0sXG4gICAgNDA6IHsgbmFtZTogXCJUaGUgQWJzdXJkXCIsIGRlc2M6IFwiV2h5IGRvIHdlIHN0cnVnZ2xlPyBCZWNhdXNlIHdlIG11c3QuXCIsIGhwX3BlbjogNTAgfSxcbiAgICA1MDogeyBuYW1lOiBcIlNpc3lwaHVzIFByaW1lXCIsIGRlc2M6IFwiT25lIG11c3QgaW1hZ2luZSBTaXN5cGh1cyBoYXBweS5cIiwgaHBfcGVuOiA5OSB9XG59O1xuXG4vLyBNSVNTSU9OIFBPT0xcbmNvbnN0IE1JU1NJT05fUE9PTCA9IFtcbiAgICB7IGlkOiBcIm1vcm5pbmdfd2luXCIsIG5hbWU6IFwi4piA77iPIE1vcm5pbmcgV2luXCIsIGRlc2M6IFwiQ29tcGxldGUgMSBUcml2aWFsIHF1ZXN0IGJlZm9yZSAxMCBBTVwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMCwgZ29sZDogMTUgfSwgY2hlY2s6IFwibW9ybmluZ190cml2aWFsXCIgfSxcbiAgICB7IGlkOiBcIm1vbWVudHVtXCIsIG5hbWU6IFwi8J+UpSBNb21lbnR1bVwiLCBkZXNjOiBcIkNvbXBsZXRlIDMgcXVlc3RzIHRvZGF5XCIsIHRhcmdldDogMywgcmV3YXJkOiB7IHhwOiAyMCwgZ29sZDogMCB9LCBjaGVjazogXCJxdWVzdF9jb3VudFwiIH0sXG4gICAgeyBpZDogXCJ6ZXJvX2luYm94XCIsIG5hbWU6IFwi8J+nmCBaZXJvIEluYm94XCIsIGRlc2M6IFwiQ29tcGxldGUgMSBUcml2aWFsIFF1ZXN0XCIsIHRhcmdldDogMSwgcmV3YXJkOiB7IHhwOiAwLCBnb2xkOiAxMCB9LCBjaGVjazogXCJtb3JuaW5nX3RyaXZpYWxcIiB9LCAvLyBGSVhFRDogUmVtb3ZlZCBpbXBvc3NpYmxlIGNoZWNrXG4gICAgeyBpZDogXCJzcGVjaWFsaXN0XCIsIG5hbWU6IFwi8J+OryBTcGVjaWFsaXN0XCIsIGRlc2M6IFwiVXNlIHRoZSBzYW1lIHNraWxsIDMgdGltZXNcIiwgdGFyZ2V0OiAzLCByZXdhcmQ6IHsgeHA6IDE1LCBnb2xkOiAwIH0sIGNoZWNrOiBcInNraWxsX3JlcGVhdFwiIH0sXG4gICAgeyBpZDogXCJoaWdoX3N0YWtlc1wiLCBuYW1lOiBcIvCfkqogSGlnaCBTdGFrZXNcIiwgZGVzYzogXCJDb21wbGV0ZSAxIEhpZ2ggU3Rha2VzIHF1ZXN0XCIsIHRhcmdldDogMSwgcmV3YXJkOiB7IHhwOiAwLCBnb2xkOiAzMCB9LCBjaGVjazogXCJoaWdoX3N0YWtlc1wiIH0sXG4gICAgeyBpZDogXCJzcGVlZF9kZW1vblwiLCBuYW1lOiBcIuKaoSBTcGVlZCBEZW1vblwiLCBkZXNjOiBcIkNvbXBsZXRlIHF1ZXN0IHdpdGhpbiAyaCBvZiBjcmVhdGlvblwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMjUsIGdvbGQ6IDAgfSwgY2hlY2s6IFwiZmFzdF9jb21wbGV0ZVwiIH0sXG4gICAgeyBpZDogXCJzeW5lcmdpc3RcIiwgbmFtZTogXCLwn5SXIFN5bmVyZ2lzdFwiLCBkZXNjOiBcIkNvbXBsZXRlIHF1ZXN0IHdpdGggUHJpbWFyeSArIFNlY29uZGFyeSBza2lsbFwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMCwgZ29sZDogMTAgfSwgY2hlY2s6IFwic3luZXJneVwiIH0sXG4gICAgeyBpZDogXCJzdXJ2aXZvclwiLCBuYW1lOiBcIvCfm6HvuI8gU3Vydml2b3JcIiwgZGVzYzogXCJEb24ndCB0YWtlIGFueSBkYW1hZ2UgdG9kYXlcIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDAsIGdvbGQ6IDIwIH0sIGNoZWNrOiBcIm5vX2RhbWFnZVwiIH0sXG4gICAgeyBpZDogXCJyaXNrX3Rha2VyXCIsIG5hbWU6IFwi8J+OsiBSaXNrIFRha2VyXCIsIGRlc2M6IFwiQ29tcGxldGUgRGlmZmljdWx0eSA0KyBxdWVzdFwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMTUsIGdvbGQ6IDAgfSwgY2hlY2s6IFwiaGFyZF9xdWVzdFwiIH1cbl07XG5cbmV4cG9ydCBjbGFzcyBTaXN5cGh1c0VuZ2luZSBleHRlbmRzIFRpbnlFbWl0dGVyIHtcbiAgICBhcHA6IEFwcDtcbiAgICBwbHVnaW46IGFueTtcbiAgICBhdWRpbzogQXVkaW9Db250cm9sbGVyO1xuICAgIFxuICAgIC8vIFN1Yi1FbmdpbmVzXG4gICAgYW5hbHl0aWNzRW5naW5lOiBBbmFseXRpY3NFbmdpbmU7XG4gICAgbWVkaXRhdGlvbkVuZ2luZTogTWVkaXRhdGlvbkVuZ2luZTtcbiAgICByZXNlYXJjaEVuZ2luZTogUmVzZWFyY2hFbmdpbmU7XG4gICAgY2hhaW5zRW5naW5lOiBDaGFpbnNFbmdpbmU7XG4gICAgZmlsdGVyc0VuZ2luZTogRmlsdGVyc0VuZ2luZTtcblxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IGFueSwgYXVkaW86IEF1ZGlvQ29udHJvbGxlcikge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmFwcCA9IGFwcDtcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgICAgIHRoaXMuYXVkaW8gPSBhdWRpbztcbiAgICAgICAgXG4gICAgICAgIHRoaXMuYW5hbHl0aWNzRW5naW5lID0gbmV3IEFuYWx5dGljc0VuZ2luZSh0aGlzLnBsdWdpbi5zZXR0aW5ncywgdGhpcy5hdWRpbyk7XG4gICAgICAgIHRoaXMubWVkaXRhdGlvbkVuZ2luZSA9IG5ldyBNZWRpdGF0aW9uRW5naW5lKHRoaXMucGx1Z2luLnNldHRpbmdzLCB0aGlzLmF1ZGlvKTtcbiAgICAgICAgdGhpcy5yZXNlYXJjaEVuZ2luZSA9IG5ldyBSZXNlYXJjaEVuZ2luZSh0aGlzLnBsdWdpbi5zZXR0aW5ncywgdGhpcy5hdWRpbyk7XG4gICAgICAgIHRoaXMuY2hhaW5zRW5naW5lID0gbmV3IENoYWluc0VuZ2luZSh0aGlzLnBsdWdpbi5zZXR0aW5ncywgdGhpcy5hdWRpbyk7XG4gICAgICAgIHRoaXMuZmlsdGVyc0VuZ2luZSA9IG5ldyBGaWx0ZXJzRW5naW5lKHRoaXMucGx1Z2luLnNldHRpbmdzKTtcbiAgICB9XG5cbiAgICBnZXQgc2V0dGluZ3MoKTogU2lzeXBodXNTZXR0aW5ncyB7IHJldHVybiB0aGlzLnBsdWdpbi5zZXR0aW5nczsgfVxuICAgIHNldCBzZXR0aW5ncyh2YWw6IFNpc3lwaHVzU2V0dGluZ3MpIHsgdGhpcy5wbHVnaW4uc2V0dGluZ3MgPSB2YWw7IH1cblxuICAgIGFzeW5jIHNhdmUoKSB7IFxuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTsgXG4gICAgICAgIHRoaXMudHJpZ2dlcihcInVwZGF0ZVwiKTtcbiAgICB9XG5cbiAgICAvLyBHQU1FIExPT1BcbiAgICByb2xsRGFpbHlNaXNzaW9ucygpIHtcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlID0gWy4uLk1JU1NJT05fUE9PTF07XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkOiBEYWlseU1pc3Npb25bXSA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgICAgICAgaWYgKGF2YWlsYWJsZS5sZW5ndGggPT09IDApIGJyZWFrO1xuICAgICAgICAgICAgY29uc3QgaWR4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYXZhaWxhYmxlLmxlbmd0aCk7XG4gICAgICAgICAgICBjb25zdCBtaXNzaW9uID0gYXZhaWxhYmxlLnNwbGljZShpZHgsIDEpWzBdO1xuICAgICAgICAgICAgc2VsZWN0ZWQucHVzaCh7IC4uLm1pc3Npb24sIGNoZWNrRnVuYzogbWlzc2lvbi5jaGVjaywgcHJvZ3Jlc3M6IDAsIGNvbXBsZXRlZDogZmFsc2UgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25zID0gc2VsZWN0ZWQ7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9uRGF0ZSA9IG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3RzQ29tcGxldGVkVG9kYXkgPSAwO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5ID0ge307XG4gICAgfVxuXG4gICAgY2hlY2tEYWlseU1pc3Npb25zKGNvbnRleHQ6IHsgdHlwZT86IHN0cmluZzsgZGlmZmljdWx0eT86IG51bWJlcjsgc2tpbGw/OiBzdHJpbmc7IHNlY29uZGFyeVNraWxsPzogc3RyaW5nOyBoaWdoU3Rha2VzPzogYm9vbGVhbjsgcXVlc3RDcmVhdGVkPzogbnVtYmVyIH0pIHtcbiAgICAgICAgY29uc3Qgbm93ID0gbW9tZW50KCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9ucy5mb3JFYWNoKG1pc3Npb24gPT4ge1xuICAgICAgICAgICAgaWYgKG1pc3Npb24uY29tcGxldGVkKSByZXR1cm47XG4gICAgICAgICAgICBzd2l0Y2ggKG1pc3Npb24uY2hlY2tGdW5jKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBcIm1vcm5pbmdfdHJpdmlhbFwiOiBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIgJiYgY29udGV4dC5kaWZmaWN1bHR5ID09PSAxICYmIG5vdy5ob3VyKCkgPCAxMCkgbWlzc2lvbi5wcm9ncmVzcysrOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwicXVlc3RfY291bnRcIjogaWYgKGNvbnRleHQudHlwZSA9PT0gXCJjb21wbGV0ZVwiKSBtaXNzaW9uLnByb2dyZXNzID0gdGhpcy5zZXR0aW5ncy5xdWVzdHNDb21wbGV0ZWRUb2RheTsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcImhpZ2hfc3Rha2VzXCI6IGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LmhpZ2hTdGFrZXMpIG1pc3Npb24ucHJvZ3Jlc3MrKzsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcImZhc3RfY29tcGxldGVcIjogaWYgKGNvbnRleHQudHlwZSA9PT0gXCJjb21wbGV0ZVwiICYmIGNvbnRleHQucXVlc3RDcmVhdGVkKSB7IGlmIChtb21lbnQoKS5kaWZmKG1vbWVudChjb250ZXh0LnF1ZXN0Q3JlYXRlZCksICdob3VycycpIDw9IDIpIG1pc3Npb24ucHJvZ3Jlc3MrKzsgfSBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwic3luZXJneVwiOiBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIgJiYgY29udGV4dC5za2lsbCAmJiBjb250ZXh0LnNlY29uZGFyeVNraWxsICYmIGNvbnRleHQuc2Vjb25kYXJ5U2tpbGwgIT09IFwiTm9uZVwiKSBtaXNzaW9uLnByb2dyZXNzKys7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJub19kYW1hZ2VcIjogaWYgKGNvbnRleHQudHlwZSA9PT0gXCJkYW1hZ2VcIikgbWlzc2lvbi5wcm9ncmVzcyA9IDA7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJoYXJkX3F1ZXN0XCI6IGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LmRpZmZpY3VsdHkgJiYgY29udGV4dC5kaWZmaWN1bHR5ID49IDQpIG1pc3Npb24ucHJvZ3Jlc3MrKzsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcInNraWxsX3JlcGVhdFwiOiBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRleHQudHlwZSA9PT0gXCJjb21wbGV0ZVwiICYmIGNvbnRleHQuc2tpbGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc2tpbGxVc2VzVG9kYXlbY29udGV4dC5za2lsbF0gPSAodGhpcy5zZXR0aW5ncy5za2lsbFVzZXNUb2RheVtjb250ZXh0LnNraWxsXSB8fCAwKSArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXhVc2VzID0gTWF0aC5tYXgoMCwgLi4uT2JqZWN0LnZhbHVlcyh0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtaXNzaW9uLnByb2dyZXNzID0gbWF4VXNlcztcbiAgICAgICAgICAgICAgICAgICAgfSBcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWlzc2lvbi5wcm9ncmVzcyA+PSBtaXNzaW9uLnRhcmdldCAmJiAhbWlzc2lvbi5jb21wbGV0ZWQpIHtcbiAgICAgICAgICAgICAgICBtaXNzaW9uLmNvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy54cCArPSBtaXNzaW9uLnJld2FyZC54cDtcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLmdvbGQgKz0gbWlzc2lvbi5yZXdhcmQuZ29sZDtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGDinIUgRGFpbHkgTWlzc2lvbiBDb21wbGV0ZTogJHttaXNzaW9uLm5hbWV9YCk7XG4gICAgICAgICAgICAgICAgdGhpcy5hdWRpby5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgfVxuXG4gICAgZ2V0RGlmZmljdWx0eU51bWJlcihkaWZmTGFiZWw6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIGlmIChkaWZmTGFiZWwgPT09IFwiVHJpdmlhbFwiKSByZXR1cm4gMTtcbiAgICAgICAgaWYgKGRpZmZMYWJlbCA9PT0gXCJFYXN5XCIpIHJldHVybiAyO1xuICAgICAgICBpZiAoZGlmZkxhYmVsID09PSBcIk1lZGl1bVwiKSByZXR1cm4gMztcbiAgICAgICAgaWYgKGRpZmZMYWJlbCA9PT0gXCJIYXJkXCIpIHJldHVybiA0O1xuICAgICAgICBpZiAoZGlmZkxhYmVsID09PSBcIlNVSUNJREVcIikgcmV0dXJuIDU7XG4gICAgICAgIHJldHVybiAzO1xuICAgIH1cblxuICAgIGFzeW5jIGNoZWNrRGFpbHlMb2dpbigpIHtcbiAgICAgICAgY29uc3QgdG9kYXkgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5sYXN0TG9naW4pIHtcbiAgICAgICAgICAgIGNvbnN0IGRheXNEaWZmID0gbW9tZW50KCkuZGlmZihtb21lbnQodGhpcy5zZXR0aW5ncy5sYXN0TG9naW4pLCAnZGF5cycpO1xuICAgICAgICAgICAgaWYgKGRheXNEaWZmID4gMikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJvdERhbWFnZSA9IChkYXlzRGlmZiAtIDEpICogMTA7XG4gICAgICAgICAgICAgICAgaWYgKHJvdERhbWFnZSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5ocCAtPSByb3REYW1hZ2U7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaGlzdG9yeS5wdXNoKHsgZGF0ZTogdG9kYXksIHN0YXR1czogXCJyb3RcIiwgeHBFYXJuZWQ6IC1yb3REYW1hZ2UgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmxhc3RMb2dpbiAhPT0gdG9kYXkpIHtcbiAgICAgICAgICAgIC8vIEZJWEVEOiBSZW1vdmVkIHByZW1hdHVyZSB1cGRhdGVTdHJlYWsoKSBmcm9tIGhlcmVcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubWF4SHAgPSAxMDAgKyAodGhpcy5zZXR0aW5ncy5sZXZlbCAqIDUpO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5ocCA9IE1hdGgubWluKHRoaXMuc2V0dGluZ3MubWF4SHAsIHRoaXMuc2V0dGluZ3MuaHAgKyAyMCk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmRhbWFnZVRha2VuVG9kYXkgPSAwO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsID0gXCJcIjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgdG9kYXlNb21lbnQgPSBtb21lbnQoKTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc2tpbGxzLmZvckVhY2gocyA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHMubGFzdFVzZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRvZGF5TW9tZW50LmRpZmYobW9tZW50KHMubGFzdFVzZWQpLCAnZGF5cycpID4gMyAmJiAhdGhpcy5pc1Jlc3RpbmcoKSkgeyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHMucnVzdCA9IE1hdGgubWluKDEwLCAocy5ydXN0IHx8IDApICsgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzLnhwUmVxID0gTWF0aC5mbG9vcihzLnhwUmVxICogMS4xKTsgXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0TG9naW4gPSB0b2RheTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaGlzdG9yeS5wdXNoKHsgZGF0ZTogdG9kYXksIHN0YXR1czogXCJzdWNjZXNzXCIsIHhwRWFybmVkOiAwIH0pO1xuICAgICAgICAgICAgaWYodGhpcy5zZXR0aW5ncy5oaXN0b3J5Lmxlbmd0aCA+IDE0KSB0aGlzLnNldHRpbmdzLmhpc3Rvcnkuc2hpZnQoKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9uRGF0ZSAhPT0gdG9kYXkpIHRoaXMucm9sbERhaWx5TWlzc2lvbnMoKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucm9sbENoYW9zKHRydWUpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBjb21wbGV0ZVF1ZXN0KGZpbGU6IFRGaWxlKSB7XG4gICAgICAgIC8vIEZJWEVEOiBSZW1vdmVkIHByZW1hdHVyZSBtZXRyaWNzIHRyYWNraW5nIGZyb20gaGVyZVxuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMubWVkaXRhdGlvbkVuZ2luZS5pc0xvY2tlZERvd24oKSkgeyBuZXcgTm90aWNlKFwiTE9DS0RPV04gQUNUSVZFXCIpOyByZXR1cm47IH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGZtID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk/LmZyb250bWF0dGVyO1xuICAgICAgICBpZiAoIWZtKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBjb25zdCBxdWVzdE5hbWUgPSBmaWxlLmJhc2VuYW1lO1xuICAgICAgICBpZiAodGhpcy5jaGFpbnNFbmdpbmUuaXNRdWVzdEluQ2hhaW4ocXVlc3ROYW1lKSAmJiAhdGhpcy5jaGFpbnNFbmdpbmUuY2FuU3RhcnRRdWVzdChxdWVzdE5hbWUpKSB7XG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiUXVlc3QgbG9ja2VkIGluIGNoYWluLiBDb21wbGV0ZSB0aGUgYWN0aXZlIHF1ZXN0IGZpcnN0LlwiKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmNoYWluc0VuZ2luZS5pc1F1ZXN0SW5DaGFpbihxdWVzdE5hbWUpKSB7XG4gICAgICAgICAgICAgY29uc3QgY2hhaW5SZXN1bHQgPSBhd2FpdCB0aGlzLmNoYWluc0VuZ2luZS5jb21wbGV0ZUNoYWluUXVlc3QocXVlc3ROYW1lKTtcbiAgICAgICAgICAgICBpZiAoY2hhaW5SZXN1bHQuc3VjY2VzcyAmJiBjaGFpblJlc3VsdC5tZXNzYWdlKSBuZXcgTm90aWNlKGNoYWluUmVzdWx0Lm1lc3NhZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRklYRUQ6IEFkZGVkIG1ldHJpY3MgdHJhY2tpbmcgaGVyZSwgYWZ0ZXIgdmFsaWRhdGlvblxuICAgICAgICB0aGlzLmFuYWx5dGljc0VuZ2luZS50cmFja0RhaWx5TWV0cmljcyhcInF1ZXN0X2NvbXBsZXRlXCIsIDEpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMudG90YWxDb21iYXQrKztcblxuICAgICAgICBsZXQgeHAgPSAoZm0ueHBfcmV3YXJkIHx8IDIwKSAqIHRoaXMuc2V0dGluZ3MuZGFpbHlNb2RpZmllci54cE11bHQ7XG4gICAgICAgIGxldCBnb2xkID0gKGZtLmdvbGRfcmV3YXJkIHx8IDApICogdGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyLmdvbGRNdWx0O1xuICAgICAgICBjb25zdCBza2lsbE5hbWUgPSBmbS5za2lsbCB8fCBcIk5vbmVcIjtcbiAgICAgICAgY29uc3Qgc2Vjb25kYXJ5ID0gZm0uc2Vjb25kYXJ5X3NraWxsIHx8IFwiTm9uZVwiOyBcblxuICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG5cbiAgICAgICAgY29uc3Qgc2tpbGwgPSB0aGlzLnNldHRpbmdzLnNraWxscy5maW5kKHMgPT4gcy5uYW1lID09PSBza2lsbE5hbWUpO1xuICAgICAgICBpZiAoc2tpbGwpIHtcbiAgICAgICAgICAgIGlmIChza2lsbC5ydXN0ID4gMCkge1xuICAgICAgICAgICAgICAgIHNraWxsLnJ1c3QgPSAwO1xuICAgICAgICAgICAgICAgIC8vIEZJWEVEOiBSdXN0IG1hdGggY29ycmVjdGVkIHRvIG1hdGNoIGRlY2F5ICgxLjEpXG4gICAgICAgICAgICAgICAgc2tpbGwueHBSZXEgPSBNYXRoLmZsb29yKHNraWxsLnhwUmVxIC8gMS4xKTsgXG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShg4pyoICR7c2tpbGwubmFtZX06IFJ1c3QgQ2xlYXJlZCFgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNraWxsLmxhc3RVc2VkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgc2tpbGwueHAgKz0gMTtcbiAgICAgICAgICAgIGlmIChza2lsbC54cCA+PSBza2lsbC54cFJlcSkgeyBza2lsbC5sZXZlbCsrOyBza2lsbC54cCA9IDA7IG5ldyBOb3RpY2UoYPCfp6AgJHtza2lsbC5uYW1lfSBVcCFgKTsgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc2Vjb25kYXJ5ICYmIHNlY29uZGFyeSAhPT0gXCJOb25lXCIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWNTa2lsbCA9IHRoaXMuc2V0dGluZ3Muc2tpbGxzLmZpbmQocyA9PiBzLm5hbWUgPT09IHNlY29uZGFyeSk7XG4gICAgICAgICAgICAgICAgaWYgKHNlY1NraWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFza2lsbC5jb25uZWN0aW9ucykgc2tpbGwuY29ubmVjdGlvbnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYoIXNraWxsLmNvbm5lY3Rpb25zLmluY2x1ZGVzKHNlY29uZGFyeSkpIHsgc2tpbGwuY29ubmVjdGlvbnMucHVzaChzZWNvbmRhcnkpOyBuZXcgTm90aWNlKGDwn5SXIE5ldXJhbCBMaW5rIEVzdGFibGlzaGVkYCk7IH1cbiAgICAgICAgICAgICAgICAgICAgeHAgKz0gTWF0aC5mbG9vcihzZWNTa2lsbC5sZXZlbCAqIDAuNSk7IHNlY1NraWxsLnhwICs9IDAuNTsgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZGFpbHlNb2RpZmllci5uYW1lID09PSBcIkFkcmVuYWxpbmVcIikgdGhpcy5zZXR0aW5ncy5ocCAtPSA1O1xuICAgICAgICB0aGlzLnNldHRpbmdzLnhwICs9IHhwOyB0aGlzLnNldHRpbmdzLmdvbGQgKz0gZ29sZDtcblxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy54cCA+PSB0aGlzLnNldHRpbmdzLnhwUmVxKSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxldmVsKys7IFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5yaXZhbERtZyArPSA1OyBcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MueHAgPSAwO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy54cFJlcSA9IE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy54cFJlcSAqIDEuMSk7IFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5tYXhIcCA9IDEwMCArICh0aGlzLnNldHRpbmdzLmxldmVsICogNSk7IFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5ocCA9IHRoaXMuc2V0dGluZ3MubWF4SHA7XG4gICAgICAgICAgICB0aGlzLnRhdW50KFwibGV2ZWxfdXBcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGJvc3NNc2dzID0gdGhpcy5hbmFseXRpY3NFbmdpbmUuY2hlY2tCb3NzTWlsZXN0b25lcygpO1xuICAgICAgICAgICAgYm9zc01zZ3MuZm9yRWFjaChtc2cgPT4gbmV3IE5vdGljZShtc2cpKTtcblxuICAgICAgICAgICAgLy8gQk9TUyBTUEFXTiBDSEVDS1xuICAgICAgICAgICAgaWYgKEJPU1NfREFUQVt0aGlzLnNldHRpbmdzLmxldmVsXSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc3Bhd25Cb3NzKHRoaXMuc2V0dGluZ3MubGV2ZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdHNDb21wbGV0ZWRUb2RheSsrO1xuICAgICAgICAvLyBGSVhFRDogQWRkZWQgU3RyZWFrIHVwZGF0ZSBoZXJlIChQZXJmb3JtYW5jZSBCYXNlZClcbiAgICAgICAgdGhpcy5hbmFseXRpY3NFbmdpbmUudXBkYXRlU3RyZWFrKCk7IFxuICAgICAgICBcbiAgICAgICAgY29uc3QgcXVlc3RDcmVhdGVkID0gZm0uY3JlYXRlZCA/IG5ldyBEYXRlKGZtLmNyZWF0ZWQpLmdldFRpbWUoKSA6IERhdGUubm93KCk7XG4gICAgICAgIGNvbnN0IGRpZmZpY3VsdHkgPSB0aGlzLmdldERpZmZpY3VsdHlOdW1iZXIoZm0uZGlmZmljdWx0eSk7XG4gICAgICAgIHRoaXMuY2hlY2tEYWlseU1pc3Npb25zKHsgdHlwZTogXCJjb21wbGV0ZVwiLCBkaWZmaWN1bHR5LCBza2lsbDogc2tpbGxOYW1lLCBzZWNvbmRhcnlTa2lsbDogc2Vjb25kYXJ5LCBoaWdoU3Rha2VzOiBmbS5oaWdoX3N0YWtlcywgcXVlc3RDcmVhdGVkIH0pO1xuXG4gICAgICAgIGNvbnN0IGFyY2hpdmVQYXRoID0gXCJBY3RpdmVfUnVuL0FyY2hpdmVcIjtcbiAgICAgICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoYXJjaGl2ZVBhdGgpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoYXJjaGl2ZVBhdGgpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGYpID0+IHsgZi5zdGF0dXMgPSBcImNvbXBsZXRlZFwiOyBmLmNvbXBsZXRlZF9hdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTsgfSk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnJlbmFtZUZpbGUoZmlsZSwgYCR7YXJjaGl2ZVBhdGh9LyR7ZmlsZS5uYW1lfWApO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBhc3luYyBzcGF3bkJvc3MobGV2ZWw6IG51bWJlcikge1xuICAgICAgICBjb25zdCBib3NzID0gQk9TU19EQVRBW2xldmVsXTtcbiAgICAgICAgaWYgKCFib3NzKSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgYm9zc05hbWUgPSBgQk9TU19MVkwke2xldmVsfSAtICR7Ym9zcy5uYW1lfWA7XG4gICAgICAgIG5ldyBOb3RpY2UoYOKaoO+4jyBCT1NTIERFVEVDVEVEOiAke2Jvc3MubmFtZX1gKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEF1dG8tY3JlYXRlIHRoZSBib3NzIHF1ZXN0XG4gICAgICAgIGF3YWl0IHRoaXMuY3JlYXRlUXVlc3QoXG4gICAgICAgICAgICBib3NzTmFtZSwgXG4gICAgICAgICAgICA1LCAvLyBEaWZmaWN1bHR5IDUgKFN1aWNpZGUpXG4gICAgICAgICAgICBcIkJvc3NcIiwgXG4gICAgICAgICAgICBcIk5vbmVcIiwgXG4gICAgICAgICAgICBtb21lbnQoKS5hZGQoMywgJ2RheXMnKS50b0lTT1N0cmluZygpLCAvLyAzIERheSBsaW1pdFxuICAgICAgICAgICAgdHJ1ZSwgLy8gSGlnaCBTdGFrZXNcbiAgICAgICAgICAgIFwiQ3JpdGljYWxcIiwgLy8gUHJpb3JpdHlcbiAgICAgICAgICAgIHRydWUgLy8gaXNCb3NzIGZsYWdcbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwiZGVhdGhcIik7IC8vIE9taW5vdXMgc291bmRcbiAgICB9XG5cbiAgICBhc3luYyBmYWlsUXVlc3QoZmlsZTogVEZpbGUsIG1hbnVhbEFib3J0OiBib29sZWFuID0gZmFsc2UpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNSZXN0aW5nKCkgJiYgIW1hbnVhbEFib3J0KSB7IG5ldyBOb3RpY2UoXCLwn5i0IFJlc3QgRGF5IGFjdGl2ZS4gTm8gZGFtYWdlLlwiKTsgcmV0dXJuOyB9XG5cbiAgICAgICAgaWYgKHRoaXMuaXNTaGllbGRlZCgpICYmICFtYW51YWxBYm9ydCkge1xuICAgICAgICAgICAgbmV3IE5vdGljZShg8J+boe+4jyBTSElFTERFRCFgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBkYW1hZ2UgPSAxMCArIE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy5yaXZhbERtZyAvIDIpO1xuICAgICAgICAgICAgLy8gRklYRUQ6IFN0cmljdCBkZWJ0IHRocmVzaG9sZCAoPCAwIGluc3RlYWQgb2YgPCAtMTAwKVxuICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZ29sZCA8IDApIGRhbWFnZSAqPSAyO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmhwIC09IGRhbWFnZTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZGFtYWdlVGFrZW5Ub2RheSArPSBkYW1hZ2U7XG4gICAgICAgICAgICBpZiAoIW1hbnVhbEFib3J0KSB0aGlzLnNldHRpbmdzLnJpdmFsRG1nICs9IDE7IFxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImZhaWxcIik7XG4gICAgICAgICAgICB0aGlzLnRhdW50KFwiZmFpbFwiKTtcbiAgICAgICAgICAgIHRoaXMuY2hlY2tEYWlseU1pc3Npb25zKHsgdHlwZTogXCJkYW1hZ2VcIiB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZGFtYWdlVGFrZW5Ub2RheSA+IDUwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tZWRpdGF0aW9uRW5naW5lLnRyaWdnZXJMb2NrZG93bigpO1xuICAgICAgICAgICAgICAgIHRoaXMudGF1bnQoXCJsb2NrZG93blwiKTtcbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImRlYXRoXCIpO1xuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcImxvY2tkb3duXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuaHAgPD0gMzApIHsgdGhpcy5hdWRpby5wbGF5U291bmQoXCJoZWFydGJlYXRcIik7IHRoaXMudGF1bnQoXCJsb3dfaHBcIik7IH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBncmF2ZVBhdGggPSBcIkdyYXZleWFyZC9GYWlsdXJlc1wiO1xuICAgICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChncmF2ZVBhdGgpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZ3JhdmVQYXRoKTtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucmVuYW1lRmlsZShmaWxlLCBgJHtncmF2ZVBhdGh9L1tGQUlMRURdICR7ZmlsZS5uYW1lfWApO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuaHAgPD0gMCkgdGhpcy50cmlnZ2VyRGVhdGgoKTtcbiAgICB9XG4gICAgXG4gICAgYXN5bmMgY3JlYXRlUXVlc3QobmFtZTogc3RyaW5nLCBkaWZmOiBudW1iZXIsIHNraWxsOiBzdHJpbmcsIHNlY1NraWxsOiBzdHJpbmcsIGRlYWRsaW5lSXNvOiBzdHJpbmcsIGhpZ2hTdGFrZXM6IGJvb2xlYW4sIHByaW9yaXR5OiBzdHJpbmcsIGlzQm9zczogYm9vbGVhbikge1xuICAgICAgICBpZiAodGhpcy5tZWRpdGF0aW9uRW5naW5lLmlzTG9ja2VkRG93bigpKSB7IG5ldyBOb3RpY2UoXCLim5QgTE9DS0RPV04gQUNUSVZFXCIpOyByZXR1cm47IH1cbiAgICAgICAgaWYgKHRoaXMuaXNSZXN0aW5nKCkgJiYgaGlnaFN0YWtlcykgeyBuZXcgTm90aWNlKFwiQ2Fubm90IGRlcGxveSBIaWdoIFN0YWtlcyBvbiBSZXN0IERheS5cIik7IHJldHVybjsgfSBcblxuICAgICAgICBsZXQgeHBSZXdhcmQgPSAwOyBsZXQgZ29sZFJld2FyZCA9IDA7IGxldCBkaWZmTGFiZWwgPSBcIlwiO1xuICAgICAgICBpZiAoaXNCb3NzKSB7IFxuICAgICAgICAgICAgeHBSZXdhcmQgPSAxMDAwOyBcbiAgICAgICAgICAgIGdvbGRSZXdhcmQgPSAxMDAwOyBcbiAgICAgICAgICAgIGRpZmZMYWJlbCA9IFwi4pig77iPIEJPU1NcIjsgXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzd2l0Y2goZGlmZikge1xuICAgICAgICAgICAgICAgIGNhc2UgMTogeHBSZXdhcmQgPSBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3MueHBSZXEgKiAwLjA1KTsgZ29sZFJld2FyZCA9IDEwOyBkaWZmTGFiZWwgPSBcIlRyaXZpYWxcIjsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAyOiB4cFJld2FyZCA9IE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy54cFJlcSAqIDAuMTApOyBnb2xkUmV3YXJkID0gMjA7IGRpZmZMYWJlbCA9IFwiRWFzeVwiOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDM6IHhwUmV3YXJkID0gTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLnhwUmVxICogMC4yMCk7IGdvbGRSZXdhcmQgPSA0MDsgZGlmZkxhYmVsID0gXCJNZWRpdW1cIjsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA0OiB4cFJld2FyZCA9IE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy54cFJlcSAqIDAuNDApOyBnb2xkUmV3YXJkID0gODA7IGRpZmZMYWJlbCA9IFwiSGFyZFwiOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDU6IHhwUmV3YXJkID0gTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLnhwUmVxICogMC42MCk7IGdvbGRSZXdhcmQgPSAxNTA7IGRpZmZMYWJlbCA9IFwiU1VJQ0lERVwiOyBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaGlnaFN0YWtlcyAmJiAhaXNCb3NzKSB7IGdvbGRSZXdhcmQgPSBNYXRoLmZsb29yKGdvbGRSZXdhcmQgKiAxLjUpOyB9XG4gICAgICAgIGxldCBkZWFkbGluZVN0ciA9IFwiTm9uZVwiOyBsZXQgZGVhZGxpbmVGcm9udG1hdHRlciA9IFwiXCI7XG4gICAgICAgIGlmIChkZWFkbGluZUlzbykgeyBkZWFkbGluZVN0ciA9IG1vbWVudChkZWFkbGluZUlzbykuZm9ybWF0KFwiWVlZWS1NTS1ERCBISDptbVwiKTsgZGVhZGxpbmVGcm9udG1hdHRlciA9IGBkZWFkbGluZTogJHtkZWFkbGluZUlzb31gOyB9XG5cbiAgICAgICAgY29uc3Qgcm9vdFBhdGggPSBcIkFjdGl2ZV9SdW5cIjsgY29uc3QgcXVlc3RzUGF0aCA9IFwiQWN0aXZlX1J1bi9RdWVzdHNcIjtcbiAgICAgICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocm9vdFBhdGgpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIocm9vdFBhdGgpO1xuICAgICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChxdWVzdHNQYXRoKSkgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKHF1ZXN0c1BhdGgpO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2FmZU5hbWUgPSBuYW1lLnJlcGxhY2UoL1teYS16MC05XS9naSwgJ18nKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBjb25zdCBmaWxlbmFtZSA9IGAke3F1ZXN0c1BhdGh9LyR7c2FmZU5hbWV9Lm1kYDtcbiAgICAgICAgXG4gICAgICAgIC8vIEZJWEVEOiBIaWdoIFN0YWtlcyBzYXZlZCBhcyAndHJ1ZScvJ2ZhbHNlJyBzdHJpbmcgZm9yIE9ic2lkaWFuIGNvbXBhdGliaWxpdHlcbiAgICAgICAgY29uc3QgY29udGVudCA9IGAtLS1cbnR5cGU6IHF1ZXN0XG5zdGF0dXM6IGFjdGl2ZVxuZGlmZmljdWx0eTogJHtkaWZmTGFiZWx9XG5wcmlvcml0eTogJHtwcmlvcml0eX1cbnhwX3Jld2FyZDogJHt4cFJld2FyZH1cbmdvbGRfcmV3YXJkOiAke2dvbGRSZXdhcmR9XG5za2lsbDogJHtza2lsbH1cbnNlY29uZGFyeV9za2lsbDogJHtzZWNTa2lsbH1cbmhpZ2hfc3Rha2VzOiAke2hpZ2hTdGFrZXMgPyAndHJ1ZScgOiAnZmFsc2UnfVxuaXNfYm9zczogJHtpc0Jvc3N9XG5jcmVhdGVkOiAke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKX1cbiR7ZGVhZGxpbmVGcm9udG1hdHRlcn1cbi0tLVxuIyDimpTvuI8gJHtuYW1lfVxuPiBbIUlORk9dIE1pc3Npb25cbj4gKipQcmk6KiogJHtwcmlvcml0eX0gfCAqKkRpZmY6KiogJHtkaWZmTGFiZWx9IHwgKipEdWU6KiogJHtkZWFkbGluZVN0cn1cbj4gKipSd2Q6KiogJHt4cFJld2FyZH0gWFAgfCAke2dvbGRSZXdhcmR9IEdcbj4gKipOZXVyYWwgTGluazoqKiAke3NraWxsfSArICR7c2VjU2tpbGx9XG5gO1xuICAgICAgICBpZiAodGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZpbGVuYW1lKSkgeyBuZXcgTm90aWNlKFwiRXhpc3RzIVwiKTsgcmV0dXJuOyB9XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShmaWxlbmFtZSwgY29udGVudCk7XG4gICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwiY2xpY2tcIik7IFxuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG4gICAgXG4gICAgYXN5bmMgZGVsZXRlUXVlc3QoZmlsZTogVEZpbGUpIHsgYXdhaXQgdGhpcy5hcHAudmF1bHQuZGVsZXRlKGZpbGUpOyBuZXcgTm90aWNlKFwiRGVwbG95bWVudCBBYm9ydGVkIChEZWxldGVkKVwiKTsgdGhpcy5zYXZlKCk7IH1cblxuICAgIGFzeW5jIGNoZWNrRGVhZGxpbmVzKCkge1xuICAgICAgICBjb25zdCBmb2xkZXIgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJBY3RpdmVfUnVuL1F1ZXN0c1wiKTtcbiAgICAgICAgaWYgKCEoZm9sZGVyIGluc3RhbmNlb2YgVEZvbGRlcikpIHJldHVybjtcbiAgICAgICAgZm9yIChjb25zdCBmaWxlIG9mIGZvbGRlci5jaGlsZHJlbikge1xuICAgICAgICAgICAgaWYgKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZtID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk/LmZyb250bWF0dGVyO1xuICAgICAgICAgICAgICAgIGlmIChmbT8uZGVhZGxpbmUgJiYgbW9tZW50KCkuaXNBZnRlcihtb21lbnQoZm0uZGVhZGxpbmUpKSkgYXdhaXQgdGhpcy5mYWlsUXVlc3QoZmlsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gQk9TUyBSRVNQQVdOIENIRUNLIChBbnRpLUNoZWVzZSlcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubGV2ZWwgPj0gMTAgJiYgQk9TU19EQVRBWzEwXSAmJiAhdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcy5zb21lKChiOmFueSkgPT4gYi5sZXZlbCA9PT0gMTAgJiYgYi5kZWZlYXRlZCkpIHtcbiAgICAgICAgICAgICBjb25zdCBmID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGBBY3RpdmVfUnVuL1F1ZXN0cy9CT1NTX0xWTDEwIC0gJHtCT1NTX0RBVEFbMTBdLm5hbWV9Lm1kYCk7XG4gICAgICAgICAgICAgaWYgKCFmKSB7IG5ldyBOb3RpY2UoXCJZb3UgY2Fubm90IGhpZGUgZnJvbSB0aGUgR2F0ZWtlZXBlci5cIik7IGF3YWl0IHRoaXMuc3Bhd25Cb3NzKDEwKTsgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH1cblxuICAgIGFzeW5jIHRyaWdnZXJEZWF0aCgpIHtcbiAgICAgICAgdGhpcy5hdWRpby5wbGF5U291bmQoXCJkZWF0aFwiKTtcbiAgICAgICAgY29uc3QgZWFybmVkU291bHMgPSBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3MubGV2ZWwgKiAxMCArIHRoaXMuc2V0dGluZ3MuZ29sZCAvIDEwKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sZWdhY3kuc291bHMgKz0gZWFybmVkU291bHM7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MubGVnYWN5LmRlYXRoQ291bnQgPSAodGhpcy5zZXR0aW5ncy5sZWdhY3kuZGVhdGhDb3VudCB8fCAwKSArIDE7XG4gICAgICAgIG5ldyBOb3RpY2UoYPCfkoAgUlVOIEVOREVELmApO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmhwID0gMTAwOyB0aGlzLnNldHRpbmdzLm1heEhwID0gMTAwOyB0aGlzLnNldHRpbmdzLnhwID0gMDsgdGhpcy5zZXR0aW5ncy5nb2xkID0gMDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy54cFJlcSA9IDEwMDsgdGhpcy5zZXR0aW5ncy5sZXZlbCA9IDE7IHRoaXMuc2V0dGluZ3Mucml2YWxEbWcgPSAxMDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5za2lsbHMgPSBbXTsgdGhpcy5zZXR0aW5ncy5oaXN0b3J5ID0gW107IHRoaXMuc2V0dGluZ3MuZGFtYWdlVGFrZW5Ub2RheSA9IDA7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCA9IFwiXCI7IHRoaXMuc2V0dGluZ3Muc2hpZWxkZWRVbnRpbCA9IFwiXCI7IHRoaXMuc2V0dGluZ3MucmVzdERheVVudGlsID0gXCJcIjtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25zID0gW107IHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9uRGF0ZSA9IFwiXCI7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3RzQ29tcGxldGVkVG9kYXkgPSAwOyB0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5ID0ge307XG4gICAgICAgIGNvbnN0IGJhc2VTdGFydEdvbGQgPSB0aGlzLnNldHRpbmdzLmxlZ2FjeS5wZXJrcy5zdGFydEdvbGQgfHwgMDtcbiAgICAgICAgY29uc3Qgc2NhclBlbmFsdHkgPSBNYXRoLnBvdygwLjksIHRoaXMuc2V0dGluZ3MubGVnYWN5LmRlYXRoQ291bnQpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmdvbGQgPSBNYXRoLmZsb29yKGJhc2VTdGFydEdvbGQgKiBzY2FyUGVuYWx0eSk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucnVuQ291bnQrKztcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgcm9sbENoYW9zKHNob3dNb2RhbDogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgICAgIGNvbnN0IHJvbGwgPSBNYXRoLnJhbmRvbSgpO1xuICAgICAgICBpZiAocm9sbCA8IDAuNCkgdGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyID0gREVGQVVMVF9NT0RJRklFUjtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBpZHggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoQ0hBT1NfVEFCTEUubGVuZ3RoIC0gMSkpICsgMTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZGFpbHlNb2RpZmllciA9IENIQU9TX1RBQkxFW2lkeF07XG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyLm5hbWUgPT09IFwiUml2YWwgU2Fib3RhZ2VcIiAmJiB0aGlzLnNldHRpbmdzLmdvbGQgPiAxMCkgdGhpcy5zZXR0aW5ncy5nb2xkID0gTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLmdvbGQgKiAwLjkpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgICAgICBpZiAoc2hvd01vZGFsKSBuZXcgQ2hhb3NNb2RhbCh0aGlzLmFwcCwgdGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyKS5vcGVuKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgYXR0ZW1wdFJlY292ZXJ5KCkge1xuICAgICAgICBpZiAoIXRoaXMubWVkaXRhdGlvbkVuZ2luZS5pc0xvY2tlZERvd24oKSkgeyBuZXcgTm90aWNlKFwiTm90IGluIExvY2tkb3duLlwiKTsgcmV0dXJuOyB9XG4gICAgICAgIGNvbnN0IHsgaG91cnMsIG1pbnV0ZXMgfSA9IHRoaXMubWVkaXRhdGlvbkVuZ2luZS5nZXRMb2NrZG93blRpbWVSZW1haW5pbmcoKTtcbiAgICAgICAgbmV3IE5vdGljZShgUmVjb3ZlcmluZy4uLiAke2hvdXJzfWggJHttaW51dGVzfW0gcmVtYWluaW5nLmApO1xuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBpc0xvY2tlZERvd24oKSB7IHJldHVybiB0aGlzLm1lZGl0YXRpb25FbmdpbmUuaXNMb2NrZWREb3duKCk7IH1cbiAgICBpc1Jlc3RpbmcoKSB7IHJldHVybiB0aGlzLnNldHRpbmdzLnJlc3REYXlVbnRpbCAmJiBtb21lbnQoKS5pc0JlZm9yZShtb21lbnQodGhpcy5zZXR0aW5ncy5yZXN0RGF5VW50aWwpKTsgfVxuICAgIGlzU2hpZWxkZWQoKSB7IHJldHVybiB0aGlzLnNldHRpbmdzLnNoaWVsZGVkVW50aWwgJiYgbW9tZW50KCkuaXNCZWZvcmUobW9tZW50KHRoaXMuc2V0dGluZ3Muc2hpZWxkZWRVbnRpbCkpOyB9XG5cbiAgICB0YXVudCh0cmlnZ2VyOiBcImZhaWxcInxcInNoaWVsZFwifFwibG93X2hwXCJ8XCJsZXZlbF91cFwifFwibG9ja2Rvd25cIikge1xuICAgICAgICBpZiAoTWF0aC5yYW5kb20oKSA8IDAuMikgcmV0dXJuOyBcbiAgICAgICAgY29uc3QgaW5zdWx0cyA9IHtcbiAgICAgICAgICAgIFwiZmFpbFwiOiBbXCJGb2N1cy5cIiwgXCJBZ2Fpbi5cIiwgXCJTdGF5IHNoYXJwLlwiXSxcbiAgICAgICAgICAgIFwic2hpZWxkXCI6IFtcIlNtYXJ0IG1vdmUuXCIsIFwiQm91Z2h0IHNvbWUgdGltZS5cIl0sXG4gICAgICAgICAgICBcImxvd19ocFwiOiBbXCJDcml0aWNhbCBjb25kaXRpb24uXCIsIFwiU3Vydml2ZS5cIl0sXG4gICAgICAgICAgICBcImxldmVsX3VwXCI6IFtcIlN0cm9uZ2VyLlwiLCBcIlNjYWxpbmcgdXAuXCJdLFxuICAgICAgICAgICAgXCJsb2NrZG93blwiOiBbXCJPdmVyaGVhdGVkLiBDb29saW5nIGRvd24uXCIsIFwiRm9yY2VkIHJlc3QuXCJdXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IG1zZyA9IGluc3VsdHNbdHJpZ2dlcl1bTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogaW5zdWx0c1t0cmlnZ2VyXS5sZW5ndGgpXTtcbiAgICAgICAgbmV3IE5vdGljZShgU1lTVEVNOiBcIiR7bXNnfVwiYCwgNjAwMCk7XG4gICAgfVxuICAgIFxuICAgIHBhcnNlUXVpY2tJbnB1dCh0ZXh0OiBzdHJpbmcpIHtcbiAgICAgICAgaWYgKHRoaXMubWVkaXRhdGlvbkVuZ2luZS5pc0xvY2tlZERvd24oKSkgeyBuZXcgTm90aWNlKFwi4puUIExPQ0tET1dOIEFDVElWRVwiKTsgcmV0dXJuOyB9XG4gICAgICAgIGxldCBkaWZmID0gMzsgbGV0IGNsZWFuVGV4dCA9IHRleHQ7XG4gICAgICAgIGlmICh0ZXh0Lm1hdGNoKC9cXC8xLykpIHsgZGlmZiA9IDE7IGNsZWFuVGV4dCA9IHRleHQucmVwbGFjZSgvXFwvMS8sIFwiXCIpLnRyaW0oKTsgfVxuICAgICAgICBlbHNlIGlmICh0ZXh0Lm1hdGNoKC9cXC8yLykpIHsgZGlmZiA9IDI7IGNsZWFuVGV4dCA9IHRleHQucmVwbGFjZSgvXFwvMi8sIFwiXCIpLnRyaW0oKTsgfVxuICAgICAgICBlbHNlIGlmICh0ZXh0Lm1hdGNoKC9cXC8zLykpIHsgZGlmZiA9IDM7IGNsZWFuVGV4dCA9IHRleHQucmVwbGFjZSgvXFwvMy8sIFwiXCIpLnRyaW0oKTsgfVxuICAgICAgICBlbHNlIGlmICh0ZXh0Lm1hdGNoKC9cXC80LykpIHsgZGlmZiA9IDQ7IGNsZWFuVGV4dCA9IHRleHQucmVwbGFjZSgvXFwvNC8sIFwiXCIpLnRyaW0oKTsgfVxuICAgICAgICBlbHNlIGlmICh0ZXh0Lm1hdGNoKC9cXC81LykpIHsgZGlmZiA9IDU7IGNsZWFuVGV4dCA9IHRleHQucmVwbGFjZSgvXFwvNS8sIFwiXCIpLnRyaW0oKTsgfVxuICAgICAgICBjb25zdCBkZWFkbGluZSA9IG1vbWVudCgpLmFkZCgyNCwgJ2hvdXJzJykudG9JU09TdHJpbmcoKTtcbiAgICAgICAgdGhpcy5jcmVhdGVRdWVzdChjbGVhblRleHQsIGRpZmYsIFwiTm9uZVwiLCBcIk5vbmVcIiwgZGVhZGxpbmUsIGZhbHNlLCBcIk5vcm1hbFwiLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgLy8gREVMRUdBVEVEIE1FVEhPRFNcbiAgICBhc3luYyBjcmVhdGVSZXNlYXJjaFF1ZXN0KHRpdGxlOiBzdHJpbmcsIHR5cGU6IFwic3VydmV5XCIgfCBcImRlZXBfZGl2ZVwiLCBsaW5rZWRTa2lsbDogc3RyaW5nLCBsaW5rZWRDb21iYXRRdWVzdDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMucmVzZWFyY2hFbmdpbmUuY3JlYXRlUmVzZWFyY2hRdWVzdCh0aXRsZSwgdHlwZSwgbGlua2VkU2tpbGwsIGxpbmtlZENvbWJhdFF1ZXN0KTtcbiAgICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgeyBuZXcgTm90aWNlKHJlc3VsdC5tZXNzYWdlKTsgcmV0dXJuOyB9XG4gICAgICAgIG5ldyBOb3RpY2UocmVzdWx0Lm1lc3NhZ2UpO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBhc3luYyBjb21wbGV0ZVJlc2VhcmNoUXVlc3QocXVlc3RJZDogc3RyaW5nLCBmaW5hbFdvcmRDb3VudDogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMucmVzZWFyY2hFbmdpbmUuY29tcGxldGVSZXNlYXJjaFF1ZXN0KHF1ZXN0SWQsIGZpbmFsV29yZENvdW50KTtcbiAgICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgeyBuZXcgTm90aWNlKHJlc3VsdC5tZXNzYWdlKTsgcmV0dXJuOyB9XG4gICAgICAgIG5ldyBOb3RpY2UocmVzdWx0Lm1lc3NhZ2UpO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBkZWxldGVSZXNlYXJjaFF1ZXN0KHF1ZXN0SWQ6IHN0cmluZykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLnJlc2VhcmNoRW5naW5lLmRlbGV0ZVJlc2VhcmNoUXVlc3QocXVlc3RJZCk7XG4gICAgICAgIG5ldyBOb3RpY2UocmVzdWx0Lm1lc3NhZ2UpO1xuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICB1cGRhdGVSZXNlYXJjaFdvcmRDb3VudChxdWVzdElkOiBzdHJpbmcsIG5ld1dvcmRDb3VudDogbnVtYmVyKSB7IHRoaXMucmVzZWFyY2hFbmdpbmUudXBkYXRlUmVzZWFyY2hXb3JkQ291bnQocXVlc3RJZCwgbmV3V29yZENvdW50KTsgdGhpcy5zYXZlKCk7IH1cbiAgICBnZXRSZXNlYXJjaFJhdGlvKCkgeyByZXR1cm4gdGhpcy5yZXNlYXJjaEVuZ2luZS5nZXRSZXNlYXJjaFJhdGlvKCk7IH1cbiAgICBjYW5DcmVhdGVSZXNlYXJjaFF1ZXN0KCkgeyByZXR1cm4gdGhpcy5yZXNlYXJjaEVuZ2luZS5jYW5DcmVhdGVSZXNlYXJjaFF1ZXN0KCk7IH1cblxuICAgIGFzeW5jIHN0YXJ0TWVkaXRhdGlvbigpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5tZWRpdGF0aW9uRW5naW5lLm1lZGl0YXRlKCk7XG4gICAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MgJiYgcmVzdWx0Lm1lc3NhZ2UpIHsgbmV3IE5vdGljZShyZXN1bHQubWVzc2FnZSk7IHJldHVybjsgfVxuICAgICAgICBuZXcgTm90aWNlKHJlc3VsdC5tZXNzYWdlKTtcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlKCk7XG4gICAgfVxuICAgIFxuICAgIGdldE1lZGl0YXRpb25TdGF0dXMoKSB7IHJldHVybiB0aGlzLm1lZGl0YXRpb25FbmdpbmUuZ2V0TWVkaXRhdGlvblN0YXR1cygpOyB9XG4gICAgY2FuRGVsZXRlUXVlc3QoKSB7IHJldHVybiB0aGlzLm1lZGl0YXRpb25FbmdpbmUuY2FuRGVsZXRlUXVlc3RGcmVlKCk7IH1cbiAgICBhc3luYyBkZWxldGVRdWVzdFdpdGhDb3N0KGZpbGU6IFRGaWxlKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMubWVkaXRhdGlvbkVuZ2luZS5hcHBseURlbGV0aW9uQ29zdCgpO1xuICAgICAgICBuZXcgTm90aWNlKHJlc3VsdC5tZXNzYWdlKTtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuZGVsZXRlKGZpbGUpO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBhc3luYyBjcmVhdGVRdWVzdENoYWluKG5hbWU6IHN0cmluZywgcXVlc3ROYW1lczogc3RyaW5nW10pIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5jaGFpbnNFbmdpbmUuY3JlYXRlUXVlc3RDaGFpbihuYW1lLCBxdWVzdE5hbWVzKTtcbiAgICAgICAgaWYgKHJlc3VsdC5zdWNjZXNzKSB7IG5ldyBOb3RpY2UocmVzdWx0Lm1lc3NhZ2UpOyBhd2FpdCB0aGlzLnNhdmUoKTsgcmV0dXJuIHRydWU7IH1cbiAgICAgICAgZWxzZSB7IG5ldyBOb3RpY2UocmVzdWx0Lm1lc3NhZ2UpOyByZXR1cm4gZmFsc2U7IH1cbiAgICB9XG4gICAgXG4gICAgZ2V0QWN0aXZlQ2hhaW4oKSB7IHJldHVybiB0aGlzLmNoYWluc0VuZ2luZS5nZXRBY3RpdmVDaGFpbigpOyB9XG4gICAgZ2V0Q2hhaW5Qcm9ncmVzcygpIHsgcmV0dXJuIHRoaXMuY2hhaW5zRW5naW5lLmdldENoYWluUHJvZ3Jlc3MoKTsgfVxuICAgIGFzeW5jIGJyZWFrQ2hhaW4oKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuY2hhaW5zRW5naW5lLmJyZWFrQ2hhaW4oKTtcbiAgICAgICAgbmV3IE5vdGljZShyZXN1bHQubWVzc2FnZSk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgIH1cblxuICAgIHNldFF1ZXN0RmlsdGVyKHF1ZXN0RmlsZTogVEZpbGUsIGVuZXJneTogYW55LCBjb250ZXh0OiBhbnksIHRhZ3M6IHN0cmluZ1tdKSB7XG4gICAgICAgIHRoaXMuZmlsdGVyc0VuZ2luZS5zZXRRdWVzdEZpbHRlcihxdWVzdEZpbGUuYmFzZW5hbWUsIGVuZXJneSwgY29udGV4dCwgdGFncyk7XG4gICAgICAgIG5ldyBOb3RpY2UoYFF1ZXN0IHRhZ2dlZDogJHtlbmVyZ3l9IGVuZXJneSwgJHtjb250ZXh0fSBjb250ZXh0YCk7XG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH1cbiAgICBzZXRGaWx0ZXJTdGF0ZShlbmVyZ3k6IGFueSwgY29udGV4dDogYW55LCB0YWdzOiBzdHJpbmdbXSkge1xuICAgICAgICB0aGlzLmZpbHRlcnNFbmdpbmUuc2V0RmlsdGVyU3RhdGUoZW5lcmd5LCBjb250ZXh0LCB0YWdzKTtcbiAgICAgICAgbmV3IE5vdGljZShgRmlsdGVycyBzZXQ6ICR7ZW5lcmd5fSBlbmVyZ3ksICR7Y29udGV4dH0gY29udGV4dGApO1xuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG4gICAgY2xlYXJGaWx0ZXJzKCkgeyB0aGlzLmZpbHRlcnNFbmdpbmUuY2xlYXJGaWx0ZXJzKCk7IG5ldyBOb3RpY2UoXCJBbGwgZmlsdGVycyBjbGVhcmVkXCIpOyB0aGlzLnNhdmUoKTsgfVxuICAgIGdldEZpbHRlcmVkUXVlc3RzKHF1ZXN0czogYW55W10pIHsgcmV0dXJuIHRoaXMuZmlsdGVyc0VuZ2luZS5maWx0ZXJRdWVzdHMocXVlc3RzKTsgfVxuXG4gICAgZ2V0R2FtZVN0YXRzKCkgeyByZXR1cm4gdGhpcy5hbmFseXRpY3NFbmdpbmUuZ2V0R2FtZVN0YXRzKCk7IH1cbiAgICBjaGVja0Jvc3NNaWxlc3RvbmVzKCkgeyBcbiAgICAgICAgY29uc3QgbXNncyA9IHRoaXMuYW5hbHl0aWNzRW5naW5lLmNoZWNrQm9zc01pbGVzdG9uZXMoKTtcbiAgICAgICAgbXNncy5mb3JFYWNoKG0gPT4gbmV3IE5vdGljZShtKSk7XG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH1cbiAgICBnZW5lcmF0ZVdlZWtseVJlcG9ydCgpIHsgcmV0dXJuIHRoaXMuYW5hbHl0aWNzRW5naW5lLmdlbmVyYXRlV2Vla2x5UmVwb3J0KCk7IH1cbn1cbiIsImltcG9ydCB7IEl0ZW1WaWV3LCBXb3Jrc3BhY2VMZWFmLCBURmlsZSwgVEZvbGRlciwgbW9tZW50IH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IFNpc3lwaHVzUGx1Z2luIGZyb20gJy4uL21haW4nO1xuaW1wb3J0IHsgUXVlc3RNb2RhbCwgU2hvcE1vZGFsLCBTa2lsbERldGFpbE1vZGFsLCBTa2lsbE1hbmFnZXJNb2RhbCB9IGZyb20gJy4vbW9kYWxzJztcbmltcG9ydCB7IFNraWxsLCBEYWlseU1pc3Npb24gfSBmcm9tICcuLi90eXBlcyc7XG5cbmV4cG9ydCBjb25zdCBWSUVXX1RZUEVfUEFOT1BUSUNPTiA9IFwic2lzeXBodXMtcGFub3B0aWNvblwiO1xuXG5leHBvcnQgY2xhc3MgUGFub3B0aWNvblZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjtcblxuICAgIGNvbnN0cnVjdG9yKGxlYWY6IFdvcmtzcGFjZUxlYWYsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHtcbiAgICAgICAgc3VwZXIobGVhZik7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgIH1cblxuICAgIGdldFZpZXdUeXBlKCkgeyByZXR1cm4gVklFV19UWVBFX1BBTk9QVElDT047IH1cbiAgICBnZXREaXNwbGF5VGV4dCgpIHsgcmV0dXJuIFwiRXllIFNpc3lwaHVzXCI7IH1cbiAgICBnZXRJY29uKCkgeyByZXR1cm4gXCJza3VsbFwiOyB9XG5cbiAgICBhc3luYyBvbk9wZW4oKSB7IFxuICAgICAgICB0aGlzLnJlZnJlc2goKTsgXG4gICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5vbigndXBkYXRlJywgdGhpcy5yZWZyZXNoLmJpbmQodGhpcykpOyBcbiAgICB9XG5cbiAgICBhc3luYyByZWZyZXNoKCkge1xuICAgICAgICBjb25zdCBjID0gdGhpcy5jb250ZW50RWw7IGMuZW1wdHkoKTtcbiAgICAgICAgY29uc3QgY29udGFpbmVyID0gYy5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jb250YWluZXJcIiB9KTtcbiAgICAgICAgY29uc3Qgc2Nyb2xsID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXNjcm9sbC1hcmVhXCIgfSk7XG5cbiAgICAgICAgLy8gLS0tIDEuIEhFQURFUiAmIENSSVRJQ0FMIEFMRVJUUyAtLS1cbiAgICAgICAgc2Nyb2xsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIkV5ZSBTSVNZUEhVUyBPU1wiLCBjbHM6IFwic2lzeS1oZWFkZXJcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmKHRoaXMucGx1Z2luLmVuZ2luZS5pc0xvY2tlZERvd24oKSkge1xuICAgICAgICAgICAgY29uc3QgbCA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1hbGVydCBzaXN5LWFsZXJ0LWxvY2tkb3duXCIgfSk7XG4gICAgICAgICAgICBsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkxPQ0tET1dOIEFDVElWRVwiIH0pO1xuICAgICAgICAgICAgY29uc3QgeyBob3VycywgbWludXRlczogbWlucyB9ID0gdGhpcy5wbHVnaW4uZW5naW5lLm1lZGl0YXRpb25FbmdpbmUuZ2V0TG9ja2Rvd25UaW1lUmVtYWluaW5nKCk7XG4gICAgICAgICAgICBsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBUaW1lIFJlbWFpbmluZzogJHtob3Vyc31oICR7bWluc31tYCB9KTtcbiAgICAgICAgICAgIGNvbnN0IGJ0biA9IGwuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkFUVEVNUFQgUkVDT1ZFUllcIiB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgbWVkU3RhdHVzID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldE1lZGl0YXRpb25TdGF0dXMoKTtcbiAgICAgICAgICAgIGNvbnN0IG1lZERpdiA9IGwuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICBtZWREaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW4tdG9wOiAxMHB4OyBwYWRkaW5nOiAxMHB4OyBiYWNrZ3JvdW5kOiByZ2JhKDE3MCwgMTAwLCAyNTUsIDAuMSk7IGJvcmRlci1yYWRpdXM6IDRweDtcIik7XG4gICAgICAgICAgICBtZWREaXYuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYE1lZGl0YXRpb246ICR7bWVkU3RhdHVzLmN5Y2xlc0RvbmV9LzEwICgke21lZFN0YXR1cy5jeWNsZXNSZW1haW5pbmd9IGxlZnQpYCB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgbWVkQmFyID0gbWVkRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgbWVkQmFyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiaGVpZ2h0OiA2cHg7IGJhY2tncm91bmQ6IHJnYmEoMjU1LDI1NSwyNTUsMC4xKTsgYm9yZGVyLXJhZGl1czogM3B4OyBtYXJnaW46IDVweCAwOyBvdmVyZmxvdzogaGlkZGVuO1wiKTtcbiAgICAgICAgICAgIGNvbnN0IG1lZEZpbGwgPSBtZWRCYXIuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICBjb25zdCBtZWRQZXJjZW50ID0gKG1lZFN0YXR1cy5jeWNsZXNEb25lIC8gMTApICogMTAwO1xuICAgICAgICAgICAgbWVkRmlsbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgd2lkdGg6ICR7bWVkUGVyY2VudH0lOyBoZWlnaHQ6IDEwMCU7IGJhY2tncm91bmQ6ICNhYTY0ZmY7IHRyYW5zaXRpb246IHdpZHRoIDAuM3M7YCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IG1lZEJ0biA9IG1lZERpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiTUVESVRBVEVcIiB9KTtcbiAgICAgICAgICAgIG1lZEJ0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIndpZHRoOiAxMDAlOyBwYWRkaW5nOiA4cHg7IG1hcmdpbi10b3A6IDVweDsgYmFja2dyb3VuZDogcmdiYSgxNzAsIDEwMCwgMjU1LCAwLjMpOyBib3JkZXI6IDFweCBzb2xpZCAjYWE2NGZmOyBjb2xvcjogI2FhNjRmZjsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtd2VpZ2h0OiBib2xkO1wiKTtcbiAgICAgICAgICAgIG1lZEJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5zdGFydE1lZGl0YXRpb24oKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMucmVmcmVzaCgpLCAxMDApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGJ0bi5hZGRDbGFzcyhcInNpc3ktYnRuXCIpO1xuICAgICAgICAgICAgYnRuLm9uY2xpY2sgPSAoKSA9PiB0aGlzLnBsdWdpbi5lbmdpbmUuYXR0ZW1wdFJlY292ZXJ5KCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYodGhpcy5wbHVnaW4uZW5naW5lLmlzUmVzdGluZygpKSB7XG4gICAgICAgICAgICAgY29uc3QgciA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1hbGVydCBzaXN5LWFsZXJ0LXJlc3RcIiB9KTtcbiAgICAgICAgICAgICByLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlJFU1QgREFZIEFDVElWRVwiIH0pO1xuICAgICAgICAgICAgIGNvbnN0IHRpbWVSZW1haW5pbmcgPSBtb21lbnQodGhpcy5wbHVnaW4uc2V0dGluZ3MucmVzdERheVVudGlsKS5kaWZmKG1vbWVudCgpLCAnbWludXRlcycpO1xuICAgICAgICAgICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcih0aW1lUmVtYWluaW5nIC8gNjApO1xuICAgICAgICAgICAgIGNvbnN0IG1pbnMgPSB0aW1lUmVtYWluaW5nICUgNjA7XG4gICAgICAgICAgICAgci5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgJHtob3Vyc31oICR7bWluc31tIHJlbWFpbmluZyB8IE5vIGRhbWFnZSwgUnVzdCBwYXVzZWRgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gLS0tIDIuIEhVRCBHUklEICgyeDIpIC0tLVxuICAgICAgICBjb25zdCBodWQgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktaHVkXCIgfSk7XG4gICAgICAgIHRoaXMuc3RhdChodWQsIFwiSEVBTFRIXCIsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmhwfS8ke3RoaXMucGx1Z2luLnNldHRpbmdzLm1heEhwfWAsIHRoaXMucGx1Z2luLnNldHRpbmdzLmhwIDwgMzAgPyBcInNpc3ktY3JpdGljYWxcIiA6IFwiXCIpO1xuICAgICAgICB0aGlzLnN0YXQoaHVkLCBcIkdPTERcIiwgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZH1gLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIDwgMCA/IFwic2lzeS12YWwtZGVidFwiIDogXCJcIik7XG4gICAgICAgIHRoaXMuc3RhdChodWQsIFwiTEVWRUxcIiwgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MubGV2ZWx9YCk7XG4gICAgICAgIHRoaXMuc3RhdChodWQsIFwiUklWQUwgRE1HXCIsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLnJpdmFsRG1nfWApO1xuXG4gICAgICAgIC8vIC0tLSAzLiBUSEUgT1JBQ0xFIC0tLVxuICAgICAgICBjb25zdCBvcmFjbGUgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktb3JhY2xlXCIgfSk7XG4gICAgICAgIG9yYWNsZS5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogXCJPUkFDTEUgUFJFRElDVElPTlwiIH0pO1xuICAgICAgICBjb25zdCBzdXJ2aXZhbCA9IE1hdGguZmxvb3IodGhpcy5wbHVnaW4uc2V0dGluZ3MuaHAgLyAodGhpcy5wbHVnaW4uc2V0dGluZ3Mucml2YWxEbWcgKiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZCA8IDAgPyAyIDogMSkpKTtcbiAgICAgICAgXG4gICAgICAgIGxldCBzdXJ2VGV4dCA9IGBTdXJ2aXZhbDogJHtzdXJ2aXZhbH0gZGF5c2A7XG4gICAgICAgIGNvbnN0IGlzQ3Jpc2lzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuaHAgPCAzMCB8fCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIDwgMDtcbiAgICAgICAgXG4gICAgICAgIC8vIEdsaXRjaCBMb2dpY1xuICAgICAgICBpZiAoaXNDcmlzaXMgJiYgTWF0aC5yYW5kb20oKSA8IDAuMykge1xuICAgICAgICAgICAgY29uc3QgZ2xpdGNoZXMgPSBbXCJbQ09SUlVQVEVEXVwiLCBcIj8/PyBEQVlTIExFRlRcIiwgXCJOTyBGVVRVUkVcIiwgXCJSVU5cIl07XG4gICAgICAgICAgICBzdXJ2VGV4dCA9IGdsaXRjaGVzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGdsaXRjaGVzLmxlbmd0aCldO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3VydkVsID0gb3JhY2xlLmNyZWF0ZURpdih7IHRleHQ6IHN1cnZUZXh0IH0pO1xuICAgICAgICBpZiAoc3Vydml2YWwgPCAyIHx8IHN1cnZUZXh0LmluY2x1ZGVzKFwiPz8/XCIpIHx8IHN1cnZUZXh0LmluY2x1ZGVzKFwiQ09SUlVQVEVEXCIpKSB7XG4gICAgICAgICAgICAgc3VydkVsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiY29sb3I6I2ZmNTU1NTsgZm9udC13ZWlnaHQ6Ym9sZDsgbGV0dGVyLXNwYWNpbmc6IDFweDtcIik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGxpZ2h0cyA9IG9yYWNsZS5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1zdGF0dXMtbGlnaHRzXCIgfSk7XG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIDwgMCkgbGlnaHRzLmNyZWF0ZURpdih7IHRleHQ6IFwiREVCVDogWUVTXCIsIGNsczogXCJzaXN5LWxpZ2h0LWFjdGl2ZVwiIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRExDIDE6IFNjYXJzIGRpc3BsYXlcbiAgICAgICAgY29uc3Qgc2NhckNvdW50ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MubGVnYWN5Py5kZWF0aENvdW50IHx8IDA7XG4gICAgICAgIGlmIChzY2FyQ291bnQgPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzY2FyRWwgPSBvcmFjbGUuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktc2Nhci1kaXNwbGF5XCIgfSk7XG4gICAgICAgICAgICBzY2FyRWwuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogYFNjYXJzOiAke3NjYXJDb3VudH1gIH0pO1xuICAgICAgICAgICAgY29uc3QgcGVuYWx0eSA9IE1hdGgucG93KDAuOSwgc2NhckNvdW50KTtcbiAgICAgICAgICAgIGNvbnN0IHBlcmNlbnRMb3N0ID0gTWF0aC5mbG9vcigoMSAtIHBlbmFsdHkpICogMTAwKTtcbiAgICAgICAgICAgIHNjYXJFbC5jcmVhdGVFbChcInNtYWxsXCIsIHsgdGV4dDogYCgtJHtwZXJjZW50TG9zdH0lIHN0YXJ0aW5nIGdvbGQpYCB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRExDIDE6IE5leHQgbWlsZXN0b25lXG4gICAgICAgIGNvbnN0IGxldmVsTWlsZXN0b25lcyA9IFsxMCwgMjAsIDMwLCA1MF07XG4gICAgICAgIGNvbnN0IG5leHRNaWxlc3RvbmUgPSBsZXZlbE1pbGVzdG9uZXMuZmluZChtID0+IG0gPiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sZXZlbCk7XG4gICAgICAgIGlmIChuZXh0TWlsZXN0b25lKSB7XG4gICAgICAgICAgICBjb25zdCBtaWxlc3RvbmVFbCA9IG9yYWNsZS5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1taWxlc3RvbmVcIiB9KTtcbiAgICAgICAgICAgIG1pbGVzdG9uZUVsLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IGBOZXh0IE1pbGVzdG9uZTogTGV2ZWwgJHtuZXh0TWlsZXN0b25lfWAgfSk7XG4gICAgICAgICAgICBpZiAobmV4dE1pbGVzdG9uZSA9PT0gMTAgfHwgbmV4dE1pbGVzdG9uZSA9PT0gMjAgfHwgbmV4dE1pbGVzdG9uZSA9PT0gMzAgfHwgbmV4dE1pbGVzdG9uZSA9PT0gNTApIHtcbiAgICAgICAgICAgICAgICBtaWxlc3RvbmVFbC5jcmVhdGVFbChcInNtYWxsXCIsIHsgdGV4dDogXCIoQm9zcyBVbmxvY2spXCIgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyAtLS0gNC4gREFJTFkgTUlTU0lPTlMgKERMQyAxKSAtLS1cbiAgICAgICAgc2Nyb2xsLmNyZWF0ZURpdih7IHRleHQ6IFwiVE9EQVlTIE9CSkVDVElWRVNcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICB0aGlzLnJlbmRlckRhaWx5TWlzc2lvbnMoc2Nyb2xsKTtcblxuICAgICAgICAvLyAtLS0gNS4gQ09OVFJPTFMgLS0tXG4gICAgICAgIGNvbnN0IGN0cmxzID0gc2Nyb2xsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNvbnRyb2xzXCIgfSk7XG4gICAgICAgIGN0cmxzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJERVBMT1lcIiwgY2xzOiBcInNpc3ktYnRuIG1vZC1jdGFcIiB9KS5vbmNsaWNrID0gKCkgPT4gbmV3IFF1ZXN0TW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luKS5vcGVuKCk7XG4gICAgICAgIGN0cmxzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJTSE9QXCIsIGNsczogXCJzaXN5LWJ0blwiIH0pLm9uY2xpY2sgPSAoKSA9PiBuZXcgU2hvcE1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpO1xuICAgICAgICBjdHJscy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiRk9DVVNcIiwgY2xzOiBcInNpc3ktYnRuXCIgfSkub25jbGljayA9ICgpID0+IHRoaXMucGx1Z2luLmF1ZGlvLnRvZ2dsZUJyb3duTm9pc2UoKTtcblxuICAgICAgICAvLyAtLS0gNi4gQUNUSVZFIFRIUkVBVFMgLS0tXG4gICAgICAgIC8vIC0tLSBETEMgNTogQ09OVEVYVCBGSUxURVJTIC0tLVxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJGSUxURVIgQ09OVFJPTFNcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICB0aGlzLnJlbmRlckZpbHRlckJhcihzY3JvbGwpO1xuXG4gICAgICAgIC8vIC0tLSBETEMgNDogUVVFU1QgQ0hBSU5TIC0tLVxuICAgICAgICBjb25zdCBhY3RpdmVDaGFpbiA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRBY3RpdmVDaGFpbigpO1xuICAgICAgICBpZiAoYWN0aXZlQ2hhaW4pIHtcbiAgICAgICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIkFDVElWRSBDSEFJTlwiLCBjbHM6IFwic2lzeS1zZWN0aW9uLXRpdGxlXCIgfSk7XG4gICAgICAgICAgICB0aGlzLnJlbmRlckNoYWluU2VjdGlvbihzY3JvbGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gLS0tIERMQyAyOiBSRVNFQVJDSCBMSUJSQVJZIC0tLVxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJSRVNFQVJDSCBMSUJSQVJZXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgdGhpcy5yZW5kZXJSZXNlYXJjaFNlY3Rpb24oc2Nyb2xsKTtcblxuICAgICAgICAvLyAtLS0gRExDIDY6IEFOQUxZVElDUyAmIEVOREdBTUUgLS0tXG4gICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIkFOQUxZVElDUyAmIFBST0dSRVNTXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgdGhpcy5yZW5kZXJBbmFseXRpY3Moc2Nyb2xsKTtcblxuICAgICAgICAvLyAtLS0gQUNUSVZFIFRIUkVBVFMgLS0tXG4gICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIkFDVElWRSBUSFJFQVRTXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgYXdhaXQgdGhpcy5yZW5kZXJRdWVzdHMoc2Nyb2xsKTtcblxuICAgICAgICAgICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIk5FVVJBTCBIVUJcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2tpbGxzLmZvckVhY2goKHM6IFNraWxsLCBpZHg6IG51bWJlcikgPT4ge1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gc2Nyb2xsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXNraWxsLXJvd1wiIH0pO1xuICAgICAgICAgICAgcm93Lm9uY2xpY2sgPSAoKSA9PiBuZXcgU2tpbGxEZXRhaWxNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4sIGlkeCkub3BlbigpO1xuICAgICAgICAgICAgY29uc3QgbWV0YSA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1za2lsbC1tZXRhXCIgfSk7XG4gICAgICAgICAgICBtZXRhLmNyZWF0ZVNwYW4oeyB0ZXh0OiBzLm5hbWUgfSk7XG4gICAgICAgICAgICBtZXRhLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgTHZsICR7cy5sZXZlbH1gIH0pO1xuICAgICAgICAgICAgaWYgKHMucnVzdCA+IDApIHtcbiAgICAgICAgICAgICAgICBtZXRhLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgUlVTVCAke3MucnVzdH1gLCBjbHM6IFwic2lzeS1ydXN0LWJhZGdlXCIgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBiYXIgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYmFyLWJnXCIgfSk7XG4gICAgICAgICAgICBjb25zdCBmaWxsID0gYmFyLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJhci1maWxsXCIgfSk7XG4gICAgICAgICAgICBmaWxsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIGB3aWR0aDogJHsocy54cC9zLnhwUmVxKSoxMDB9JTsgYmFja2dyb3VuZDogJHtzLnJ1c3QgPiAwID8gJyNkMzU0MDAnIDogJyMwMGIwZmYnfWApO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGFkZEJ0biA9IHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIisgQWRkIE5ldXJhbCBOb2RlXCIsIGNsczogXCJzaXN5LWFkZC1za2lsbFwiIH0pO1xuICAgICAgICBhZGRCdG4ub25jbGljayA9ICgpID0+IG5ldyBTa2lsbE1hbmFnZXJNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4pLm9wZW4oKTtcblxuICAgICAgICAvLyAtLS0gOC4gUVVJQ0sgQ0FQVFVSRSAtLS1cbiAgICAgICAgY29uc3QgZm9vdGVyID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXF1aWNrLWNhcHR1cmVcIiB9KTtcbiAgICAgICAgY29uc3QgaW5wdXQgPSBmb290ZXIuY3JlYXRlRWwoXCJpbnB1dFwiLCB7IGNsczogXCJzaXN5LXF1aWNrLWlucHV0XCIsIHBsYWNlaG9sZGVyOiBcIk1pc3Npb24gLzEuLi41XCIgfSk7XG4gICAgICAgIGlucHV0Lm9ua2V5ZG93biA9IGFzeW5jIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXkgPT09ICdFbnRlcicgJiYgaW5wdXQudmFsdWUudHJpbSgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLnBhcnNlUXVpY2tJbnB1dChpbnB1dC52YWx1ZS50cmltKCkpO1xuICAgICAgICAgICAgICAgIGlucHV0LnZhbHVlID0gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBETEMgMTogUmVuZGVyIERhaWx5IE1pc3Npb25zXG4gICAgcmVuZGVyRGFpbHlNaXNzaW9ucyhwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IG1pc3Npb25zID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGFpbHlNaXNzaW9ucyB8fCBbXTtcbiAgICAgICAgXG4gICAgICAgIGlmIChtaXNzaW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGVtcHR5ID0gcGFyZW50LmNyZWF0ZURpdih7IHRleHQ6IFwiTm8gbWlzc2lvbnMgdG9kYXkuIENoZWNrIGJhY2sgdG9tb3Jyb3cuXCIsIGNsczogXCJzaXN5LWVtcHR5LXN0YXRlXCIgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtaXNzaW9uc0RpdiA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1kYWlseS1taXNzaW9uc1wiIH0pO1xuICAgICAgICBcbiAgICAgICAgbWlzc2lvbnMuZm9yRWFjaCgobWlzc2lvbjogRGFpbHlNaXNzaW9uKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjYXJkID0gbWlzc2lvbnNEaXYuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktbWlzc2lvbi1jYXJkXCIgfSk7XG4gICAgICAgICAgICBpZiAobWlzc2lvbi5jb21wbGV0ZWQpIGNhcmQuYWRkQ2xhc3MoXCJzaXN5LW1pc3Npb24tY29tcGxldGVkXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LW1pc3Npb24taGVhZGVyXCIgfSk7XG4gICAgICAgICAgICBjb25zdCBzdGF0dXNJY29uID0gbWlzc2lvbi5jb21wbGV0ZWQgPyBcIllFU1wiIDogXCIuLlwiO1xuICAgICAgICAgICAgaGVhZGVyLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IHN0YXR1c0ljb24sIGNsczogXCJzaXN5LW1pc3Npb24tc3RhdHVzXCIgfSk7XG4gICAgICAgICAgICBoZWFkZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogbWlzc2lvbi5uYW1lLCBjbHM6IFwic2lzeS1taXNzaW9uLW5hbWVcIiB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgZGVzYyA9IGNhcmQuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogbWlzc2lvbi5kZXNjLCBjbHM6IFwic2lzeS1taXNzaW9uLWRlc2NcIiB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgcHJvZ3Jlc3MgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LW1pc3Npb24tcHJvZ3Jlc3NcIiB9KTtcbiAgICAgICAgICAgIHByb2dyZXNzLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IGAke21pc3Npb24ucHJvZ3Jlc3N9LyR7bWlzc2lvbi50YXJnZXR9YCwgY2xzOiBcInNpc3ktbWlzc2lvbi1jb3VudGVyXCIgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGJhciA9IHByb2dyZXNzLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJhci1iZ1wiIH0pO1xuICAgICAgICAgICAgY29uc3QgZmlsbCA9IGJhci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1iYXItZmlsbFwiIH0pO1xuICAgICAgICAgICAgY29uc3QgcGVyY2VudCA9IChtaXNzaW9uLnByb2dyZXNzIC8gbWlzc2lvbi50YXJnZXQpICogMTAwO1xuICAgICAgICAgICAgZmlsbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgd2lkdGg6ICR7TWF0aC5taW4ocGVyY2VudCwgMTAwKX0lYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHJld2FyZCA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktbWlzc2lvbi1yZXdhcmRcIiB9KTtcbiAgICAgICAgICAgIGlmIChtaXNzaW9uLnJld2FyZC54cCA+IDApIHJld2FyZC5jcmVhdGVTcGFuKHsgdGV4dDogYCske21pc3Npb24ucmV3YXJkLnhwfSBYUGAsIGNsczogXCJzaXN5LXJld2FyZC14cFwiIH0pO1xuICAgICAgICAgICAgaWYgKG1pc3Npb24ucmV3YXJkLmdvbGQgPiAwKSByZXdhcmQuY3JlYXRlU3Bhbih7IHRleHQ6IGArJHttaXNzaW9uLnJld2FyZC5nb2xkfWdgLCBjbHM6IFwic2lzeS1yZXdhcmQtZ29sZFwiIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCBhbGxDb21wbGV0ZWQgPSBtaXNzaW9ucy5ldmVyeShtID0+IG0uY29tcGxldGVkKTtcbiAgICAgICAgaWYgKGFsbENvbXBsZXRlZCAmJiBtaXNzaW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBib251cyA9IG1pc3Npb25zRGl2LmNyZWF0ZURpdih7IHRleHQ6IFwiQWxsIE1pc3Npb25zIENvbXBsZXRlISArNTAgQm9udXMgR29sZFwiLCBjbHM6IFwic2lzeS1taXNzaW9uLWJvbnVzXCIgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG4gICAgLy8gRExDIDI6IFJlbmRlciBSZXNlYXJjaCBRdWVzdHMgU2VjdGlvblxuICAgIHJlbmRlclJlc2VhcmNoU2VjdGlvbihwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IHJlc2VhcmNoUXVlc3RzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMgfHwgW107XG4gICAgICAgIGNvbnN0IGFjdGl2ZVJlc2VhcmNoID0gcmVzZWFyY2hRdWVzdHMuZmlsdGVyKHEgPT4gIXEuY29tcGxldGVkKTtcbiAgICAgICAgY29uc3QgY29tcGxldGVkUmVzZWFyY2ggPSByZXNlYXJjaFF1ZXN0cy5maWx0ZXIocSA9PiBxLmNvbXBsZXRlZCk7XG5cbiAgICAgICAgLy8gU3RhdHMgYmFyXG4gICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldFJlc2VhcmNoUmF0aW8oKTtcbiAgICAgICAgY29uc3Qgc3RhdHNEaXYgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktcmVzZWFyY2gtc3RhdHNcIiB9KTtcbiAgICAgICAgc3RhdHNEaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJib3JkZXI6IDFweCBzb2xpZCAjNjY2OyBwYWRkaW5nOiAxMHB4OyBib3JkZXItcmFkaXVzOiA0cHg7IG1hcmdpbi1ib3R0b206IDEwcHg7IGJhY2tncm91bmQ6IHJnYmEoMTcwLCAxMDAsIDI1NSwgMC4wNSk7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmF0aW9UZXh0ID0gc3RhdHNEaXYuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFJlc2VhcmNoIFJhdGlvOiAke3N0YXRzLmNvbWJhdH06JHtzdGF0cy5yZXNlYXJjaH0gKCR7c3RhdHMucmF0aW99OjEpYCB9KTtcbiAgICAgICAgcmF0aW9UZXh0LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiA1cHggMDsgZm9udC1zaXplOiAwLjllbTtcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXRoaXMucGx1Z2luLmVuZ2luZS5jYW5DcmVhdGVSZXNlYXJjaFF1ZXN0KCkpIHtcbiAgICAgICAgICAgIGNvbnN0IHdhcm5pbmcgPSBzdGF0c0Rpdi5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIkJMT0NLRUQ6IE5lZWQgMiBjb21iYXQgcGVyIDEgcmVzZWFyY2hcIiB9KTtcbiAgICAgICAgICAgIHdhcm5pbmcuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJjb2xvcjogb3JhbmdlOyBmb250LXdlaWdodDogYm9sZDsgbWFyZ2luOiA1cHggMDtcIik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBY3RpdmUgUmVzZWFyY2hcbiAgICAgICAgcGFyZW50LmNyZWF0ZURpdih7IHRleHQ6IFwiQUNUSVZFIFJFU0VBUkNIXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChhY3RpdmVSZXNlYXJjaC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHBhcmVudC5jcmVhdGVEaXYoeyB0ZXh0OiBcIk5vIGFjdGl2ZSByZXNlYXJjaC5cIiwgY2xzOiBcInNpc3ktZW1wdHktc3RhdGVcIiB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFjdGl2ZVJlc2VhcmNoLmZvckVhY2goKHF1ZXN0OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXJkID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXJlc2VhcmNoLWNhcmRcIiB9KTtcbiAgICAgICAgICAgICAgICBjYXJkLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYm9yZGVyOiAxcHggc29saWQgI2FhNjRmZjsgcGFkZGluZzogMTBweDsgbWFyZ2luLWJvdHRvbTogOHB4OyBib3JkZXItcmFkaXVzOiA0cHg7IGJhY2tncm91bmQ6IHJnYmEoMTcwLCAxMDAsIDI1NSwgMC4wNSk7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gY2FyZC5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICBoZWFkZXIuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJkaXNwbGF5OiBmbGV4OyBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47IG1hcmdpbi1ib3R0b206IDZweDtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCB0aXRsZSA9IGhlYWRlci5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBxdWVzdC50aXRsZSB9KTtcbiAgICAgICAgICAgICAgICB0aXRsZS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZvbnQtd2VpZ2h0OiBib2xkOyBmbGV4OiAxO1wiKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHR5cGVMYWJlbCA9IGhlYWRlci5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBxdWVzdC50eXBlID09PSBcInN1cnZleVwiID8gXCJTVVJWRVlcIiA6IFwiREVFUCBESVZFXCIgfSk7XG4gICAgICAgICAgICAgICAgdHlwZUxhYmVsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZm9udC1zaXplOiAwLjc1ZW07IHBhZGRpbmc6IDJweCA2cHg7IGJhY2tncm91bmQ6IHJnYmEoMTcwLCAxMDAsIDI1NSwgMC4zKTsgYm9yZGVyLXJhZGl1czogMnB4O1wiKTtcblxuICAgICAgICAgICAgICAgIGNhcmQuY3JlYXRlRWwoXCJkaXZcIiwgeyB0ZXh0OiBgSUQ6ICR7cXVlc3QuaWR9YCB9KS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZvbnQtZmFtaWx5Om1vbm9zcGFjZTsgZm9udC1zaXplOjAuOGVtOyBjb2xvcjojYWE2NGZmOyBvcGFjaXR5OjAuODsgbWFyZ2luLWJvdHRvbTo0cHg7XCIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHdvcmRDb3VudCA9IGNhcmQuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFdvcmRzOiAke3F1ZXN0LndvcmRDb3VudH0vJHtxdWVzdC53b3JkTGltaXR9YCB9KTtcbiAgICAgICAgICAgICAgICB3b3JkQ291bnQuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDVweCAwOyBmb250LXNpemU6IDAuODVlbTtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBiYXIgPSBjYXJkLmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgICAgIGJhci5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImhlaWdodDogNnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwyNTUsMjU1LDAuMSk7IGJvcmRlci1yYWRpdXM6IDNweDsgb3ZlcmZsb3c6IGhpZGRlbjsgbWFyZ2luOiA2cHggMDtcIik7XG4gICAgICAgICAgICAgICAgY29uc3QgZmlsbCA9IGJhci5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwZXJjZW50ID0gTWF0aC5taW4oMTAwLCAocXVlc3Qud29yZENvdW50IC8gcXVlc3Qud29yZExpbWl0KSAqIDEwMCk7XG4gICAgICAgICAgICAgICAgZmlsbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgd2lkdGg6ICR7cGVyY2VudH0lOyBoZWlnaHQ6IDEwMCU7IGJhY2tncm91bmQ6ICNhYTY0ZmY7IHRyYW5zaXRpb246IHdpZHRoIDAuM3M7YCk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBhY3Rpb25zID0gY2FyZC5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICBhY3Rpb25zLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTogZmxleDsgZ2FwOiA1cHg7IG1hcmdpbi10b3A6IDhweDtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCB2aWV3QnRuID0gYWN0aW9ucy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQ09NUExFVEVcIiB9KTtcbiAgICAgICAgICAgICAgICB2aWV3QnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZmxleDogMTsgcGFkZGluZzogNnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDg1LCAyNTUsIDg1LCAwLjIpOyBib3JkZXI6IDFweCBzb2xpZCAjNTVmZjU1OyBjb2xvcjogIzU1ZmY1NTsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtc2l6ZTogMC44NWVtO1wiKTtcbiAgICAgICAgICAgICAgICB2aWV3QnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5jb21wbGV0ZVJlc2VhcmNoUXVlc3QocXVlc3QuaWQsIHF1ZXN0LndvcmRDb3VudCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBjb25zdCBkZWxldGVCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJERUxFVEVcIiB9KTtcbiAgICAgICAgICAgICAgICBkZWxldGVCdG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmbGV4OiAxOyBwYWRkaW5nOiA2cHg7IGJhY2tncm91bmQ6IHJnYmEoMjU1LCA4NSwgODUsIDAuMik7IGJvcmRlcjogMXB4IHNvbGlkICNmZjU1NTU7IGNvbG9yOiAjZmY1NTU1OyBib3JkZXItcmFkaXVzOiAzcHg7IGN1cnNvcjogcG9pbnRlcjsgZm9udC1zaXplOiAwLjg1ZW07XCIpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZUJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuZGVsZXRlUmVzZWFyY2hRdWVzdChxdWVzdC5pZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbXBsZXRlZCBSZXNlYXJjaFxuICAgICAgICBwYXJlbnQuY3JlYXRlRGl2KHsgdGV4dDogXCJDT01QTEVURUQgUkVTRUFSQ0hcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNvbXBsZXRlZFJlc2VhcmNoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcGFyZW50LmNyZWF0ZURpdih7IHRleHQ6IFwiTm8gY29tcGxldGVkIHJlc2VhcmNoLlwiLCBjbHM6IFwic2lzeS1lbXB0eS1zdGF0ZVwiIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29tcGxldGVkUmVzZWFyY2guZm9yRWFjaCgocXVlc3Q6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBwYXJlbnQuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYCsgJHtxdWVzdC50aXRsZX0gKCR7cXVlc3QudHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IFwiU3VydmV5XCIgOiBcIkRlZXAgRGl2ZVwifSlgIH0pO1xuICAgICAgICAgICAgICAgIGl0ZW0uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJvcGFjaXR5OiAwLjY7IGZvbnQtc2l6ZTogMC45ZW07IG1hcmdpbjogM3B4IDA7XCIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgICAgICAgICAgYXN5bmMgcmVuZGVyUXVlc3RzKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiQWN0aXZlX1J1bi9RdWVzdHNcIik7XG4gICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgIGlmIChmb2xkZXIgaW5zdGFuY2VvZiBURm9sZGVyKSB7XG4gICAgICAgICAgICBsZXQgZmlsZXMgPSBmb2xkZXIuY2hpbGRyZW4uZmlsdGVyKGYgPT4gZiBpbnN0YW5jZW9mIFRGaWxlKSBhcyBURmlsZVtdO1xuICAgICAgICAgICAgZmlsZXMgPSB0aGlzLnBsdWdpbi5lbmdpbmUuZmlsdGVyc0VuZ2luZS5maWx0ZXJRdWVzdHMoZmlsZXMpIGFzIFRGaWxlW107IC8vIFtBVVRPLUZJWF0gQXBwbHkgZmlsdGVyc1xuICAgICAgICAgICAgZmlsZXMuc29ydCgoYSwgYikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZtQSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGEpPy5mcm9udG1hdHRlcjtcbiAgICAgICAgICAgICAgICBjb25zdCBmbUIgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShiKT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0ZUEgPSBmbUE/LmRlYWRsaW5lID8gbW9tZW50KGZtQS5kZWFkbGluZSkudmFsdWVPZigpIDogOTk5OTk5OTk5OTk5OTtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRlQiA9IGZtQj8uZGVhZGxpbmUgPyBtb21lbnQoZm1CLmRlYWRsaW5lKS52YWx1ZU9mKCkgOiA5OTk5OTk5OTk5OTk5O1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXRlQSAtIGRhdGVCOyBcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZtID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk/LmZyb250bWF0dGVyO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhcmQgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktY2FyZFwiIH0pO1xuICAgICAgICAgICAgICAgIGlmIChmbT8uaXNfYm9zcykgY2FyZC5hZGRDbGFzcyhcInNpc3ktY2FyZC1ib3NzXCIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGQgPSBTdHJpbmcoZm0/LmRpZmZpY3VsdHkgfHwgXCJcIikubWF0Y2goL1xcZC8pO1xuICAgICAgICAgICAgICAgIGlmIChkKSBjYXJkLmFkZENsYXNzKGBzaXN5LWNhcmQtJHtkWzBdfWApO1xuXG4gICAgICAgICAgICAgICAgLy8gVG9wIHNlY3Rpb24gd2l0aCB0aXRsZSBhbmQgdGltZXJcbiAgICAgICAgICAgICAgICBjb25zdCB0b3AgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNhcmQtdG9wXCIgfSk7XG4gICAgICAgICAgICAgICAgdG9wLmNyZWF0ZURpdih7IHRleHQ6IGZpbGUuYmFzZW5hbWUsIGNsczogXCJzaXN5LWNhcmQtdGl0bGVcIiB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBUaW1lclxuICAgICAgICAgICAgICAgIGlmIChmbT8uZGVhZGxpbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlmZiA9IG1vbWVudChmbS5kZWFkbGluZSkuZGlmZihtb21lbnQoKSwgJ21pbnV0ZXMnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKGRpZmYgLyA2MCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1pbnMgPSBkaWZmICUgNjA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVyVGV4dCA9IGRpZmYgPCAwID8gXCJFWFBJUkVEXCIgOiBgJHtob3Vyc31oICR7bWluc31tYDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGltZXIgPSB0b3AuY3JlYXRlRGl2KHsgdGV4dDogdGltZXJUZXh0LCBjbHM6IFwic2lzeS10aW1lclwiIH0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGlmZiA8IDYwKSB0aW1lci5hZGRDbGFzcyhcInNpc3ktdGltZXItbGF0ZVwiKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBUcmFzaCBpY29uIChpbmxpbmUsIG5vdCBhYnNvbHV0ZSlcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFzaCA9IHRvcC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS10cmFzaFwiLCB0ZXh0OiBcIltYXVwiIH0pO1xuICAgICAgICAgICAgICAgIHRyYXNoLnN0eWxlLmN1cnNvciA9IFwicG9pbnRlclwiO1xuICAgICAgICAgICAgICAgIHRyYXNoLnN0eWxlLmNvbG9yID0gXCIjZmY1NTU1XCI7XG4gICAgICAgICAgICAgICAgdHJhc2gub25jbGljayA9IChlKSA9PiB7IFxuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpOyBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmRlbGV0ZVF1ZXN0KGZpbGUpOyBcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgLy8gQWN0aW9uIGJ1dHRvbnNcbiAgICAgICAgICAgICAgICBjb25zdCBhY3RzID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1hY3Rpb25zXCIgfSk7XG4gICAgICAgICAgICAgICAgY29uc3QgYkQgPSBhY3RzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJPS1wiLCBjbHM6IFwic2lzeS1hY3Rpb24tYnRuIG1vZC1kb25lXCIgfSk7XG4gICAgICAgICAgICAgICAgYkQub25jbGljayA9ICgpID0+IHRoaXMucGx1Z2luLmVuZ2luZS5jb21wbGV0ZVF1ZXN0KGZpbGUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJGID0gYWN0cy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiWFhcIiwgY2xzOiBcInNpc3ktYWN0aW9uLWJ0biBtb2QtZmFpbFwiIH0pO1xuICAgICAgICAgICAgICAgIGJGLm9uY2xpY2sgPSAoKSA9PiB0aGlzLnBsdWdpbi5lbmdpbmUuZmFpbFF1ZXN0KGZpbGUsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgaWRsZSA9IHBhcmVudC5jcmVhdGVEaXYoeyB0ZXh0OiBcIlN5c3RlbSBJZGxlLlwiLCBjbHM6IFwic2lzeS1lbXB0eS1zdGF0ZVwiIH0pO1xuICAgICAgICAgICAgY29uc3QgY3RhQnRuID0gaWRsZS5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiW0RFUExPWSBRVUVTVF1cIiwgY2xzOiBcInNpc3ktYnRuIG1vZC1jdGFcIiB9KTtcbiAgICAgICAgICAgIGN0YUJ0bi5zdHlsZS5tYXJnaW5Ub3AgPSBcIjEwcHhcIjtcbiAgICAgICAgICAgIGN0YUJ0bi5vbmNsaWNrID0gKCkgPT4gbmV3IFF1ZXN0TW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luKS5vcGVuKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBcblxuICAgIHJlbmRlckNoYWluU2VjdGlvbihwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWNoYWluKSB7XG4gICAgICAgICAgICBwYXJlbnQuY3JlYXRlRGl2KHsgdGV4dDogXCJObyBhY3RpdmUgY2hhaW4uXCIsIGNsczogXCJzaXN5LWVtcHR5LXN0YXRlXCIgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNoYWluRGl2ID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNoYWluLWNvbnRhaW5lclwiIH0pO1xuICAgICAgICBjaGFpbkRpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImJvcmRlcjogMXB4IHNvbGlkICM0Y2FmNTA7IHBhZGRpbmc6IDEycHg7IGJvcmRlci1yYWRpdXM6IDRweDsgYmFja2dyb3VuZDogcmdiYSg3NiwgMTc1LCA4MCwgMC4wNSk7IG1hcmdpbi1ib3R0b206IDEwcHg7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgaGVhZGVyID0gY2hhaW5EaXYuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IGNoYWluLm5hbWUgfSk7XG4gICAgICAgIGhlYWRlci5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogMCAwIDEwcHggMDsgY29sb3I6ICM0Y2FmNTA7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcHJvZ3Jlc3MgPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0Q2hhaW5Qcm9ncmVzcygpO1xuICAgICAgICBjb25zdCBwcm9ncmVzc1RleHQgPSBjaGFpbkRpdi5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgUHJvZ3Jlc3M6ICR7cHJvZ3Jlc3MuY29tcGxldGVkfS8ke3Byb2dyZXNzLnRvdGFsfWAgfSk7XG4gICAgICAgIHByb2dyZXNzVGV4dC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogNXB4IDA7IGZvbnQtc2l6ZTogMC45ZW07XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYmFyID0gY2hhaW5EaXYuY3JlYXRlRGl2KCk7XG4gICAgICAgIGJhci5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImhlaWdodDogNnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwyNTUsMjU1LDAuMSk7IGJvcmRlci1yYWRpdXM6IDNweDsgbWFyZ2luOiA4cHggMDsgb3ZlcmZsb3c6IGhpZGRlbjtcIik7XG4gICAgICAgIGNvbnN0IGZpbGwgPSBiYXIuY3JlYXRlRGl2KCk7XG4gICAgICAgIGZpbGwuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgYHdpZHRoOiAke3Byb2dyZXNzLnBlcmNlbnR9JTsgaGVpZ2h0OiAxMDAlOyBiYWNrZ3JvdW5kOiAjNGNhZjUwOyB0cmFuc2l0aW9uOiB3aWR0aCAwLjNzO2ApO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcXVlc3RMaXN0ID0gY2hhaW5EaXYuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktY2hhaW4tcXVlc3RzXCIgfSk7XG4gICAgICAgIHF1ZXN0TGlzdC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogMTBweCAwOyBmb250LXNpemU6IDAuODVlbTtcIik7XG4gICAgICAgIFxuICAgICAgICBjaGFpbi5xdWVzdHMuZm9yRWFjaCgocXVlc3QsIGlkeCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHF1ZXN0TGlzdC5jcmVhdGVFbChcInBcIik7XG4gICAgICAgICAgICBjb25zdCBpY29uID0gaWR4IDwgcHJvZ3Jlc3MuY29tcGxldGVkID8gXCJPS1wiIDogaWR4ID09PSBwcm9ncmVzcy5jb21wbGV0ZWQgPyBcIj4+PlwiIDogXCJMT0NLXCI7XG4gICAgICAgICAgICBjb25zdCBzdGF0dXMgPSBpZHggPCBwcm9ncmVzcy5jb21wbGV0ZWQgPyBcIkRPTkVcIiA6IGlkeCA9PT0gcHJvZ3Jlc3MuY29tcGxldGVkID8gXCJBQ1RJVkVcIiA6IFwiTE9DS0VEXCI7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGl0ZW0uc2V0VGV4dChgWyR7aWNvbn1dICR7cXVlc3R9ICgke3N0YXR1c30pYCk7XG4gICAgICAgICAgICBpdGVtLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIGBtYXJnaW46IDNweCAwOyBwYWRkaW5nOiAzcHg7IFxuICAgICAgICAgICAgICAgICR7aWR4IDwgcHJvZ3Jlc3MuY29tcGxldGVkID8gXCJvcGFjaXR5OiAwLjY7XCIgOiBpZHggPT09IHByb2dyZXNzLmNvbXBsZXRlZCA/IFwiZm9udC13ZWlnaHQ6IGJvbGQ7IGNvbG9yOiAjNGNhZjUwO1wiIDogXCJvcGFjaXR5OiAwLjQ7XCJ9YCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYWN0aW9ucyA9IGNoYWluRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICBhY3Rpb25zLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTogZmxleDsgZ2FwOiA1cHg7IG1hcmdpbi10b3A6IDEwcHg7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYnJlYWtCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJCUkVBSyBDSEFJTlwiIH0pO1xuICAgICAgICBicmVha0J0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZsZXg6IDE7IHBhZGRpbmc6IDZweDsgYmFja2dyb3VuZDogcmdiYSgyNTUsIDg1LCA4NSwgMC4yKTsgYm9yZGVyOiAxcHggc29saWQgI2ZmNTU1NTsgY29sb3I6ICNmZjU1NTU7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyOyBmb250LXNpemU6IDAuOGVtO1wiKTtcbiAgICAgICAgYnJlYWtCdG4ub25jbGljayA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5icmVha0NoYWluKCk7XG4gICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgfTtcbiAgICB9XG5cblxuICAgIHJlbmRlckZpbHRlckJhcihwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IGZpbHRlcnMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5maWx0ZXJTdGF0ZTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGZpbHRlckRpdiA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1maWx0ZXItYmFyXCIgfSk7XG4gICAgICAgIGZpbHRlckRpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImJvcmRlcjogMXB4IHNvbGlkICMwMDg4ZmY7IHBhZGRpbmc6IDEwcHg7IGJvcmRlci1yYWRpdXM6IDRweDsgYmFja2dyb3VuZDogcmdiYSgwLCAxMzYsIDI1NSwgMC4wNSk7IG1hcmdpbi1ib3R0b206IDE1cHg7XCIpO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5lcmd5IGZpbHRlclxuICAgICAgICBjb25zdCBlbmVyZ3lEaXYgPSBmaWx0ZXJEaXYuY3JlYXRlRGl2KCk7XG4gICAgICAgIGVuZXJneURpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbi1ib3R0b206IDhweDtcIik7XG4gICAgICAgIGVuZXJneURpdi5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBcIkVuZXJneTogXCIgfSkuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmb250LXdlaWdodDogYm9sZDtcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBlbmVyZ3lPcHRpb25zID0gW1wiYW55XCIsIFwiaGlnaFwiLCBcIm1lZGl1bVwiLCBcImxvd1wiXTtcbiAgICAgICAgZW5lcmd5T3B0aW9ucy5mb3JFYWNoKG9wdCA9PiB7XG4gICAgICAgICAgICBjb25zdCBidG4gPSBlbmVyZ3lEaXYuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBvcHQudG9VcHBlckNhc2UoKSB9KTtcbiAgICAgICAgICAgIGJ0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgbWFyZ2luOiAwIDNweDsgcGFkZGluZzogNHB4IDhweDsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IFxuICAgICAgICAgICAgICAgICR7ZmlsdGVycy5hY3RpdmVFbmVyZ3kgPT09IG9wdCA/IFwiYmFja2dyb3VuZDogIzAwODhmZjsgY29sb3I6IHdoaXRlO1wiIDogXCJiYWNrZ3JvdW5kOiByZ2JhKDAsIDEzNiwgMjU1LCAwLjIpO1wifWApO1xuICAgICAgICAgICAgYnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLnNldEZpbHRlclN0YXRlKG9wdCBhcyBhbnksIGZpbHRlcnMuYWN0aXZlQ29udGV4dCwgZmlsdGVycy5hY3RpdmVUYWdzKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udGV4dCBmaWx0ZXJcbiAgICAgICAgY29uc3QgY29udGV4dERpdiA9IGZpbHRlckRpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgY29udGV4dERpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbi1ib3R0b206IDhweDtcIik7XG4gICAgICAgIGNvbnRleHREaXYuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogXCJDb250ZXh0OiBcIiB9KS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZvbnQtd2VpZ2h0OiBib2xkO1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbnRleHRPcHRpb25zID0gW1wiYW55XCIsIFwiaG9tZVwiLCBcIm9mZmljZVwiLCBcImFueXdoZXJlXCJdO1xuICAgICAgICBjb250ZXh0T3B0aW9ucy5mb3JFYWNoKG9wdCA9PiB7XG4gICAgICAgICAgICBjb25zdCBidG4gPSBjb250ZXh0RGl2LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogb3B0LnRvVXBwZXJDYXNlKCkgfSk7XG4gICAgICAgICAgICBidG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgYG1hcmdpbjogMCAzcHg7IHBhZGRpbmc6IDRweCA4cHg7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyOyBcbiAgICAgICAgICAgICAgICAke2ZpbHRlcnMuYWN0aXZlQ29udGV4dCA9PT0gb3B0ID8gXCJiYWNrZ3JvdW5kOiAjMDA4OGZmOyBjb2xvcjogd2hpdGU7XCIgOiBcImJhY2tncm91bmQ6IHJnYmEoMCwgMTM2LCAyNTUsIDAuMik7XCJ9YCk7XG4gICAgICAgICAgICBidG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuc2V0RmlsdGVyU3RhdGUoZmlsdGVycy5hY3RpdmVFbmVyZ3ksIG9wdCBhcyBhbnksIGZpbHRlcnMuYWN0aXZlVGFncyk7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGJ1dHRvblxuICAgICAgICBjb25zdCBjbGVhckJ0biA9IGZpbHRlckRpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQ0xFQVIgRklMVEVSU1wiIH0pO1xuICAgICAgICBjbGVhckJ0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIndpZHRoOiAxMDAlOyBwYWRkaW5nOiA2cHg7IG1hcmdpbi10b3A6IDhweDsgYmFja2dyb3VuZDogcmdiYSgyNTUsIDg1LCA4NSwgMC4yKTsgYm9yZGVyOiAxcHggc29saWQgI2ZmNTU1NTsgY29sb3I6ICNmZjU1NTU7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyOyBmb250LXdlaWdodDogYm9sZDtcIik7XG4gICAgICAgIGNsZWFyQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuY2xlYXJGaWx0ZXJzKCk7XG4gICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgfTtcbiAgICB9XG5cblxuICAgIHJlbmRlckFuYWx5dGljcyhwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldEdhbWVTdGF0cygpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYW5hbHl0aWNzRGl2ID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWFuYWx5dGljc1wiIH0pO1xuICAgICAgICBhbmFseXRpY3NEaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJib3JkZXI6IDFweCBzb2xpZCAjZmZjMTA3OyBwYWRkaW5nOiAxMnB4OyBib3JkZXItcmFkaXVzOiA0cHg7IGJhY2tncm91bmQ6IHJnYmEoMjU1LCAxOTMsIDcsIDAuMDUpOyBtYXJnaW4tYm90dG9tOiAxNXB4O1wiKTtcbiAgICAgICAgXG4gICAgICAgIGFuYWx5dGljc0Rpdi5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJBTkFMWVRJQ1MgJiBQUk9HUkVTU1wiIH0pLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAwIDAgMTBweCAwOyBjb2xvcjogI2ZmYzEwNztcIik7XG4gICAgICAgIFxuICAgICAgICAvLyBTdGF0cyBncmlkXG4gICAgICAgIGNvbnN0IHN0YXRzRGl2ID0gYW5hbHl0aWNzRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICBzdGF0c0Rpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImRpc3BsYXk6IGdyaWQ7IGdyaWQtdGVtcGxhdGUtY29sdW1uczogMWZyIDFmcjsgZ2FwOiAxMHB4OyBtYXJnaW4tYm90dG9tOiAxMHB4O1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHN0YXRzX2l0ZW1zID0gW1xuICAgICAgICAgICAgeyBsYWJlbDogXCJMZXZlbFwiLCB2YWx1ZTogc3RhdHMubGV2ZWwgfSxcbiAgICAgICAgICAgIHsgbGFiZWw6IFwiQ3VycmVudCBTdHJlYWtcIiwgdmFsdWU6IHN0YXRzLmN1cnJlbnRTdHJlYWsgfSxcbiAgICAgICAgICAgIHsgbGFiZWw6IFwiTG9uZ2VzdCBTdHJlYWtcIiwgdmFsdWU6IHN0YXRzLmxvbmdlc3RTdHJlYWsgfSxcbiAgICAgICAgICAgIHsgbGFiZWw6IFwiVG90YWwgUXVlc3RzXCIsIHZhbHVlOiBzdGF0cy50b3RhbFF1ZXN0cyB9XG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBzdGF0c19pdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3RhdEJveCA9IHN0YXRzRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgc3RhdEJveC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImJvcmRlcjogMXB4IHNvbGlkICNmZmMxMDc7IHBhZGRpbmc6IDhweDsgYm9yZGVyLXJhZGl1czogM3B4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwgMTkzLCA3LCAwLjEpO1wiKTtcbiAgICAgICAgICAgIHN0YXRCb3guY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogaXRlbS5sYWJlbCB9KS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogMDsgZm9udC1zaXplOiAwLjhlbTsgb3BhY2l0eTogMC43O1wiKTtcbiAgICAgICAgICAgIHN0YXRCb3guY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogU3RyaW5nKGl0ZW0udmFsdWUpIH0pLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiA1cHggMCAwIDA7IGZvbnQtc2l6ZTogMS4yZW07IGZvbnQtd2VpZ2h0OiBib2xkOyBjb2xvcjogI2ZmYzEwNztcIik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQm9zcyBwcm9ncmVzc1xuICAgICAgICBhbmFseXRpY3NEaXYuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IFwiQm9zcyBNaWxlc3RvbmVzXCIgfSkuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDEycHggMCA4cHggMDsgY29sb3I6ICNmZmMxMDc7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYm9zc2VzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuYm9zc01pbGVzdG9uZXM7XG4gICAgICAgIGlmIChib3NzZXMgJiYgYm9zc2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGJvc3Nlcy5mb3JFYWNoKChib3NzOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBib3NzSXRlbSA9IGFuYWx5dGljc0Rpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICBib3NzSXRlbS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogNnB4IDA7IHBhZGRpbmc6IDhweDsgYmFja2dyb3VuZDogcmdiYSgwLCAwLCAwLCAwLjIpOyBib3JkZXItcmFkaXVzOiAzcHg7XCIpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGljb24gPSBib3NzLmRlZmVhdGVkID8gXCJPS1wiIDogYm9zcy51bmxvY2tlZCA/IFwiPj5cIiA6IFwiTE9DS1wiO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBib3NzSXRlbS5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBgWyR7aWNvbn1dIExldmVsICR7Ym9zcy5sZXZlbH06ICR7Ym9zcy5uYW1lfWAgfSk7XG4gICAgICAgICAgICAgICAgbmFtZS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBib3NzLmRlZmVhdGVkID8gXCJjb2xvcjogIzRjYWY1MDsgZm9udC13ZWlnaHQ6IGJvbGQ7XCIgOiBib3NzLnVubG9ja2VkID8gXCJjb2xvcjogI2ZmYzEwNztcIiA6IFwib3BhY2l0eTogMC41O1wiKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBXaW4gY29uZGl0aW9uXG4gICAgICAgIGlmIChzdGF0cy5nYW1lV29uKSB7XG4gICAgICAgICAgICBjb25zdCB3aW5EaXYgPSBhbmFseXRpY3NEaXYuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICB3aW5EaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW4tdG9wOiAxMnB4OyBwYWRkaW5nOiAxMnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDc2LCAxNzUsIDgwLCAwLjIpOyBib3JkZXI6IDJweCBzb2xpZCAjNGNhZjUwOyBib3JkZXItcmFkaXVzOiA0cHg7IHRleHQtYWxpZ246IGNlbnRlcjtcIik7XG4gICAgICAgICAgICB3aW5EaXYuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJHQU1FIFdPTiFcIiB9KS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogMDsgZm9udC1zaXplOiAxLjJlbTsgZm9udC13ZWlnaHQ6IGJvbGQ7IGNvbG9yOiAjNGNhZjUwO1wiKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBzdGF0KHA6IEhUTUxFbGVtZW50LCBsYWJlbDogc3RyaW5nLCB2YWw6IHN0cmluZywgY2xzOiBzdHJpbmcgPSBcIlwiKSB7XG4gICAgICAgIGNvbnN0IGIgPSBwLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXN0YXQtYm94XCIgfSk7IFxuICAgICAgICBpZiAoY2xzKSBiLmFkZENsYXNzKGNscyk7XG4gICAgICAgIGIuY3JlYXRlRGl2KHsgdGV4dDogbGFiZWwsIGNsczogXCJzaXN5LXN0YXQtbGFiZWxcIiB9KTtcbiAgICAgICAgYi5jcmVhdGVEaXYoeyB0ZXh0OiB2YWwsIGNsczogXCJzaXN5LXN0YXQtdmFsXCIgfSk7XG4gICAgfVxuXG4gICAgYXN5bmMgb25DbG9zZSgpIHtcbiAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLm9mZigndXBkYXRlJywgdGhpcy5yZWZyZXNoLmJpbmQodGhpcykpO1xuICAgIH1cbn0iLCJpbXBvcnQgeyBOb3RpY2UsIFBsdWdpbiwgVEZpbGUsIFdvcmtzcGFjZUxlYWYgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBTa2lsbCwgTW9kaWZpZXIsIERhaWx5TWlzc2lvbiB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgU2lzeXBodXNFbmdpbmUsIERFRkFVTFRfTU9ESUZJRVIgfSBmcm9tICcuL2VuZ2luZSc7XG5pbXBvcnQgeyBBdWRpb0NvbnRyb2xsZXIgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IFJlc2VhcmNoUXVlc3RNb2RhbCwgQ2hhaW5CdWlsZGVyTW9kYWwsIFJlc2VhcmNoTGlzdE1vZGFsIH0gZnJvbSBcIi4vdWkvbW9kYWxzXCI7XG5pbXBvcnQgeyBQYW5vcHRpY29uVmlldywgVklFV19UWVBFX1BBTk9QVElDT04gfSBmcm9tIFwiLi91aS92aWV3XCI7XG5cbmNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFNpc3lwaHVzU2V0dGluZ3MgPSB7XG4gICAgaHA6IDEwMCwgbWF4SHA6IDEwMCwgeHA6IDAsIGdvbGQ6IDAsIHhwUmVxOiAxMDAsIGxldmVsOiAxLCByaXZhbERtZzogMTAsXG4gICAgbGFzdExvZ2luOiBcIlwiLCBzaGllbGRlZFVudGlsOiBcIlwiLCByZXN0RGF5VW50aWw6IFwiXCIsIHNraWxsczogW10sXG4gICAgZGFpbHlNb2RpZmllcjogREVGQVVMVF9NT0RJRklFUiwgXG4gICAgbGVnYWN5OiB7IHNvdWxzOiAwLCBwZXJrczogeyBzdGFydEdvbGQ6IDAsIHN0YXJ0U2tpbGxQb2ludHM6IDAsIHJpdmFsRGVsYXk6IDAgfSwgcmVsaWNzOiBbXSwgZGVhdGhDb3VudDogMCB9LCBcbiAgICBtdXRlZDogZmFsc2UsIGhpc3Rvcnk6IFtdLCBydW5Db3VudDogMSwgbG9ja2Rvd25VbnRpbDogXCJcIiwgZGFtYWdlVGFrZW5Ub2RheTogMCxcbiAgICBkYWlseU1pc3Npb25zOiBbXSwgXG4gICAgZGFpbHlNaXNzaW9uRGF0ZTogXCJcIiwgXG4gICAgcXVlc3RzQ29tcGxldGVkVG9kYXk6IDAsIFxuICAgIHNraWxsVXNlc1RvZGF5OiB7fSxcbiAgICByZXNlYXJjaFF1ZXN0czogW10sXG4gICAgcmVzZWFyY2hTdGF0czogeyB0b3RhbFJlc2VhcmNoOiAwLCB0b3RhbENvbWJhdDogMCwgcmVzZWFyY2hDb21wbGV0ZWQ6IDAsIGNvbWJhdENvbXBsZXRlZDogMCB9LFxuICAgIGxhc3RSZXNlYXJjaFF1ZXN0SWQ6IDAsXG4gICAgbWVkaXRhdGlvbkN5Y2xlc0NvbXBsZXRlZDogMCxcbiAgICBxdWVzdERlbGV0aW9uc1RvZGF5OiAwLFxuICAgIGxhc3REZWxldGlvblJlc2V0OiBcIlwiLFxuICAgIGlzTWVkaXRhdGluZzogZmFsc2UsXG4gICAgbWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bjogMCxcbiAgICBhY3RpdmVDaGFpbnM6IFtdLFxuICAgIGNoYWluSGlzdG9yeTogW10sXG4gICAgY3VycmVudENoYWluSWQ6IFwiXCIsXG4gICAgY2hhaW5RdWVzdHNDb21wbGV0ZWQ6IDAsXG4gICAgcXVlc3RGaWx0ZXJzOiB7fSxcbiAgICBmaWx0ZXJTdGF0ZTogeyBhY3RpdmVFbmVyZ3k6IFwiYW55XCIsIGFjdGl2ZUNvbnRleHQ6IFwiYW55XCIsIGFjdGl2ZVRhZ3M6IFtdIH0sXG4gICAgZGF5TWV0cmljczogW10sXG4gICAgd2Vla2x5UmVwb3J0czogW10sXG4gICAgYm9zc01pbGVzdG9uZXM6IFtdLFxuICAgIHN0cmVhazogeyBjdXJyZW50OiAwLCBsb25nZXN0OiAwLCBsYXN0RGF0ZTogXCJcIiB9LFxuICAgIGFjaGlldmVtZW50czogW10sXG4gICAgZ2FtZVdvbjogZmFsc2Vcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2lzeXBodXNQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIHN0YXR1c0Jhckl0ZW06IEhUTUxFbGVtZW50O1xuICAgIGVuZ2luZTogU2lzeXBodXNFbmdpbmU7XG4gICAgYXVkaW86IEF1ZGlvQ29udHJvbGxlcjtcblxuICAgIGFzeW5jIG9ubG9hZCgpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMubG9hZFN0eWxlcygpO1xuICAgICAgICB0aGlzLmF1ZGlvID0gbmV3IEF1ZGlvQ29udHJvbGxlcih0aGlzLnNldHRpbmdzLm11dGVkKTtcbiAgICAgICAgdGhpcy5lbmdpbmUgPSBuZXcgU2lzeXBodXNFbmdpbmUodGhpcy5hcHAsIHRoaXMsIHRoaXMuYXVkaW8pO1xuXG4gICAgICAgIHRoaXMucmVnaXN0ZXJWaWV3KFZJRVdfVFlQRV9QQU5PUFRJQ09OLCAobGVhZikgPT4gbmV3IFBhbm9wdGljb25WaWV3KGxlYWYsIHRoaXMpKTtcblxuICAgICAgICB0aGlzLnN0YXR1c0Jhckl0ZW0gPSB0aGlzLmFkZFN0YXR1c0Jhckl0ZW0oKTtcbiAgICAgICAgLy8gW0FVVE8tRklYXSBFeHBvc2UgZm9yIGRlYnVnXG4gICAgICAgICh3aW5kb3cgYXMgYW55KS5zaXN5cGh1c0VuZ2luZSA9IHRoaXMuZW5naW5lO1xuICAgICAgICBcbiAgICAgICAgYXdhaXQgdGhpcy5lbmdpbmUuY2hlY2tEYWlseUxvZ2luKCk7XG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHVzQmFyKCk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdvcGVuLXBhbm9wdGljb24nLCBuYW1lOiAnT3BlbiBQYW5vcHRpY29uIChTaWRlYmFyKScsIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmFjdGl2YXRlVmlldygpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ3RvZ2dsZS1mb2N1cycsIG5hbWU6ICdUb2dnbGUgRm9jdXMgTm9pc2UnLCBjYWxsYmFjazogKCkgPT4gdGhpcy5hdWRpby50b2dnbGVCcm93bk5vaXNlKCkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAncmVyb2xsLWNoYW9zJywgbmFtZTogJ1Jlcm9sbCBDaGFvcycsIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5yb2xsQ2hhb3ModHJ1ZSkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAnYWNjZXB0LWRlYXRoJywgbmFtZTogJ0FDQ0VQVCBERUFUSCcsIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS50cmlnZ2VyRGVhdGgoKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdyZWNvdmVyJywgbmFtZTogJ1JlY292ZXIgKExvY2tkb3duKScsIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5hdHRlbXB0UmVjb3ZlcnkoKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnY3JlYXRlLXJlc2VhcmNoJyxcbiAgICAgICAgICAgIG5hbWU6ICdSZXNlYXJjaDogQ3JlYXRlIFJlc2VhcmNoIFF1ZXN0JyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiBuZXcgUmVzZWFyY2hRdWVzdE1vZGFsKHRoaXMuYXBwLCB0aGlzKS5vcGVuKClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAndmlldy1yZXNlYXJjaCcsXG4gICAgICAgICAgICBuYW1lOiAnUmVzZWFyY2g6IFZpZXcgUmVzZWFyY2ggTGlicmFyeScsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gbmV3IFJlc2VhcmNoTGlzdE1vZGFsKHRoaXMuYXBwLCB0aGlzKS5vcGVuKClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnbWVkaXRhdGUnLFxuICAgICAgICAgICAgbmFtZTogJ01lZGl0YXRpb246IFN0YXJ0IE1lZGl0YXRpb24nLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLnN0YXJ0TWVkaXRhdGlvbigpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ2NyZWF0ZS1jaGFpbicsXG4gICAgICAgICAgICBuYW1lOiAnQ2hhaW5zOiBDcmVhdGUgUXVlc3QgQ2hhaW4nLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBuZXcgQ2hhaW5CdWlsZGVyTW9kYWwodGhpcy5hcHAsIHRoaXMpLm9wZW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAndmlldy1jaGFpbnMnLFxuICAgICAgICAgICAgbmFtZTogJ0NoYWluczogVmlldyBBY3RpdmUgQ2hhaW4nLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZW5naW5lLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgICAgICAgICAgaWYgKGNoYWluKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYEFjdGl2ZSBDaGFpbjogJHtjaGFpbi5uYW1lfSAoJHt0aGlzLmVuZ2luZS5nZXRDaGFpblByb2dyZXNzKCkuY29tcGxldGVkfS8ke2NoYWluLnF1ZXN0cy5sZW5ndGh9KWApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJObyBhY3RpdmUgY2hhaW5cIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdmaWx0ZXItaGlnaC1lbmVyZ3knLFxuICAgICAgICAgICAgbmFtZTogJ0ZpbHRlcnM6IFNob3cgSGlnaCBFbmVyZ3kgUXVlc3RzJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5zZXRGaWx0ZXJTdGF0ZShcImhpZ2hcIiwgXCJhbnlcIiwgW10pXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ2ZpbHRlci1tZWRpdW0tZW5lcmd5JyxcbiAgICAgICAgICAgIG5hbWU6ICdGaWx0ZXJzOiBTaG93IE1lZGl1bSBFbmVyZ3kgUXVlc3RzJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5zZXRGaWx0ZXJTdGF0ZShcIm1lZGl1bVwiLCBcImFueVwiLCBbXSlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnZmlsdGVyLWxvdy1lbmVyZ3knLFxuICAgICAgICAgICAgbmFtZTogJ0ZpbHRlcnM6IFNob3cgTG93IEVuZXJneSBRdWVzdHMnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLnNldEZpbHRlclN0YXRlKFwibG93XCIsIFwiYW55XCIsIFtdKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdjbGVhci1maWx0ZXJzJyxcbiAgICAgICAgICAgIG5hbWU6ICdGaWx0ZXJzOiBDbGVhciBBbGwgRmlsdGVycycsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUuY2xlYXJGaWx0ZXJzKClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnd2Vla2x5LXJlcG9ydCcsXG4gICAgICAgICAgICBuYW1lOiAnQW5hbHl0aWNzOiBHZW5lcmF0ZSBXZWVrbHkgUmVwb3J0JyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVwb3J0ID0gdGhpcy5lbmdpbmUuZ2VuZXJhdGVXZWVrbHlSZXBvcnQoKTtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGBXZWVrICR7cmVwb3J0LndlZWt9OiAke3JlcG9ydC50b3RhbFF1ZXN0c30gcXVlc3RzLCAke3JlcG9ydC5zdWNjZXNzUmF0ZX0lIHN1Y2Nlc3NgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnZ2FtZS1zdGF0cycsXG4gICAgICAgICAgICBuYW1lOiAnQW5hbHl0aWNzOiBWaWV3IEdhbWUgU3RhdHMnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMuZW5naW5lLmdldEdhbWVTdGF0cygpO1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYExldmVsOiAke3N0YXRzLmxldmVsfSB8IFN0cmVhazogJHtzdGF0cy5jdXJyZW50U3RyZWFrfSB8IFF1ZXN0czogJHtzdGF0cy50b3RhbFF1ZXN0c31gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnY2hlY2stYm9zc2VzJyxcbiAgICAgICAgICAgIG5hbWU6ICdFbmRnYW1lOiBDaGVjayBCb3NzIE1pbGVzdG9uZXMnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLmNoZWNrQm9zc01pbGVzdG9uZXMoKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZFJpYmJvbkljb24oJ3NrdWxsJywgJ1Npc3lwaHVzIFNpZGViYXInLCAoKSA9PiB0aGlzLmFjdGl2YXRlVmlldygpKTtcbiAgICAgICAgdGhpcy5yZWdpc3RlckludGVydmFsKHdpbmRvdy5zZXRJbnRlcnZhbCgoKSA9PiB0aGlzLmVuZ2luZS5jaGVja0RlYWRsaW5lcygpLCA2MDAwMCkpO1xuICAgICAgICBcbiAgICAgICAgLy8gW0FVVE8tRklYXSBSZXNlYXJjaCBXb3JkIENvdW50ZXJcbiAgICAgICAgdGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLndvcmtzcGFjZS5vbignZWRpdG9yLWNoYW5nZScsIChlZGl0b3IsIGluZm8pID0+IHtcbiAgICAgICAgICAgIGlmICghaW5mbyB8fCAhaW5mby5maWxlKSByZXR1cm47XG4gICAgICAgICAgICBjb25zdCBjYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGluZm8uZmlsZSk7XG4gICAgICAgICAgICBpZiAoY2FjaGU/LmZyb250bWF0dGVyPy5yZXNlYXJjaF9pZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHdvcmRzID0gZWRpdG9yLmdldFZhbHVlKCkudHJpbSgpLnNwbGl0KC9cXHMrLykubGVuZ3RoO1xuICAgICAgICAgICAgICAgIHRoaXMuZW5naW5lLnVwZGF0ZVJlc2VhcmNoV29yZENvdW50KGNhY2hlLmZyb250bWF0dGVyLnJlc2VhcmNoX2lkLCB3b3Jkcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKTtcbiAgICB9XG5cbiAgICBhc3luYyBsb2FkU3R5bGVzKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgY3NzRmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0aGlzLm1hbmlmZXN0LmRpciArIFwiL3N0eWxlcy5jc3NcIik7XG4gICAgICAgICAgICBpZiAoY3NzRmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3NzID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChjc3NGaWxlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcbiAgICAgICAgICAgICAgICBzdHlsZS5pZCA9IFwic2lzeXBodXMtc3R5bGVzXCI7XG4gICAgICAgICAgICAgICAgc3R5bGUuaW5uZXJIVE1MID0gY3NzO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7IGNvbnNvbGUuZXJyb3IoXCJDb3VsZCBub3QgbG9hZCBzdHlsZXMuY3NzXCIsIGUpOyB9XG4gICAgfVxuXG4gICAgYXN5bmMgb251bmxvYWQoKSB7XG4gICAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5kZXRhY2hMZWF2ZXNPZlR5cGUoVklFV19UWVBFX1BBTk9QVElDT04pO1xuICAgICAgICBpZih0aGlzLmF1ZGlvLmF1ZGlvQ3R4KSB0aGlzLmF1ZGlvLmF1ZGlvQ3R4LmNsb3NlKCk7XG4gICAgICAgIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzaXN5cGh1cy1zdHlsZXNcIik7XG4gICAgICAgIGlmIChzdHlsZSkgc3R5bGUucmVtb3ZlKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgYWN0aXZhdGVWaWV3KCkge1xuICAgICAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHA7XG4gICAgICAgIGxldCBsZWFmOiBXb3Jrc3BhY2VMZWFmIHwgbnVsbCA9IG51bGw7XG4gICAgICAgIGNvbnN0IGxlYXZlcyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVklFV19UWVBFX1BBTk9QVElDT04pO1xuICAgICAgICBpZiAobGVhdmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGxlYWYgPSBsZWF2ZXNbMF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZWFmID0gd29ya3NwYWNlLmdldFJpZ2h0TGVhZihmYWxzZSk7XG4gICAgICAgICAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IFZJRVdfVFlQRV9QQU5PUFRJQ09OLCBhY3RpdmU6IHRydWUgfSk7XG4gICAgICAgIH1cbiAgICAgICAgd29ya3NwYWNlLnJldmVhbExlYWYobGVhZik7XG4gICAgfVxuXG4gICAgcmVmcmVzaFVJKCkge1xuICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0JhcigpO1xuICAgICAgICBjb25zdCBsZWF2ZXMgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFZJRVdfVFlQRV9QQU5PUFRJQ09OKTtcbiAgICAgICAgaWYgKGxlYXZlcy5sZW5ndGggPiAwKSAobGVhdmVzWzBdLnZpZXcgYXMgUGFub3B0aWNvblZpZXcpLnJlZnJlc2goKTtcbiAgICB9XG5cbiAgICB1cGRhdGVTdGF0dXNCYXIoKSB7XG4gICAgICAgIGxldCBzaGllbGQgPSAodGhpcy5lbmdpbmUuaXNTaGllbGRlZCgpIHx8IHRoaXMuZW5naW5lLmlzUmVzdGluZygpKSA/ICh0aGlzLmVuZ2luZS5pc1Jlc3RpbmcoKSA/IFwiRFwiIDogXCJTXCIpIDogXCJcIjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbXBsZXRlZE1pc3Npb25zID0gdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25zLmZpbHRlcihtID0+IG0uY29tcGxldGVkKS5sZW5ndGg7XG4gICAgICAgIGNvbnN0IHRvdGFsTWlzc2lvbnMgPSB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMubGVuZ3RoO1xuICAgICAgICBjb25zdCBtaXNzaW9uUHJvZ3Jlc3MgPSB0b3RhbE1pc3Npb25zID4gMCA/IGBNJHtjb21wbGV0ZWRNaXNzaW9uc30vJHt0b3RhbE1pc3Npb25zfWAgOiBcIlwiO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgc3RhdHVzVGV4dCA9IGAke3RoaXMuc2V0dGluZ3MuZGFpbHlNb2RpZmllci5pY29ufSAke3NoaWVsZH0gSFAke3RoaXMuc2V0dGluZ3MuaHB9LyR7dGhpcy5zZXR0aW5ncy5tYXhIcH0gRyR7dGhpcy5zZXR0aW5ncy5nb2xkfSBMdmwke3RoaXMuc2V0dGluZ3MubGV2ZWx9ICR7bWlzc2lvblByb2dyZXNzfWA7XG4gICAgICAgIHRoaXMuc3RhdHVzQmFySXRlbS5zZXRUZXh0KHN0YXR1c1RleHQpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuaHAgPCAzMCkgdGhpcy5zdGF0dXNCYXJJdGVtLnN0eWxlLmNvbG9yID0gXCJyZWRcIjsgXG4gICAgICAgIGVsc2UgaWYgKHRoaXMuc2V0dGluZ3MuZ29sZCA8IDApIHRoaXMuc3RhdHVzQmFySXRlbS5zdHlsZS5jb2xvciA9IFwib3JhbmdlXCI7XG4gICAgICAgIGVsc2UgdGhpcy5zdGF0dXNCYXJJdGVtLnN0eWxlLmNvbG9yID0gXCJcIjtcbiAgICB9XG4gICAgXG4gICAgYXN5bmMgbG9hZFNldHRpbmdzKCkgeyBcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIGF3YWl0IHRoaXMubG9hZERhdGEoKSk7XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5sZWdhY3kpIHRoaXMuc2V0dGluZ3MubGVnYWN5ID0geyBzb3VsczogMCwgcGVya3M6IHsgc3RhcnRHb2xkOiAwLCBzdGFydFNraWxsUG9pbnRzOiAwLCByaXZhbERlbGF5OiAwIH0sIHJlbGljczogW10sIGRlYXRoQ291bnQ6IDAgfTtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubGVnYWN5LmRlYXRoQ291bnQgPT09IHVuZGVmaW5lZCkgdGhpcy5zZXR0aW5ncy5sZWdhY3kuZGVhdGhDb3VudCA9IDA7IFxuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuaGlzdG9yeSkgdGhpcy5zZXR0aW5ncy5oaXN0b3J5ID0gW107XG4gICAgICAgIFxuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9ucykgdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25zID0gW107XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25EYXRlKSB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbkRhdGUgPSBcIlwiO1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5xdWVzdHNDb21wbGV0ZWRUb2RheSA9PT0gdW5kZWZpbmVkKSB0aGlzLnNldHRpbmdzLnF1ZXN0c0NvbXBsZXRlZFRvZGF5ID0gMDtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5KSB0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5ID0ge307XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cykgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cyA9IFtdO1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cykgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzID0geyBcbiAgICAgICAgICAgIHRvdGFsUmVzZWFyY2g6IDAsIFxuICAgICAgICAgICAgdG90YWxDb21iYXQ6IDAsIFxuICAgICAgICAgICAgcmVzZWFyY2hDb21wbGV0ZWQ6IDAsIFxuICAgICAgICAgICAgY29tYmF0Q29tcGxldGVkOiAwIFxuICAgICAgICB9O1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5sYXN0UmVzZWFyY2hRdWVzdElkID09PSB1bmRlZmluZWQpIHRoaXMuc2V0dGluZ3MubGFzdFJlc2VhcmNoUXVlc3RJZCA9IDA7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DeWNsZXNDb21wbGV0ZWQgPT09IHVuZGVmaW5lZCkgdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ3ljbGVzQ29tcGxldGVkID0gMDtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSA9PT0gdW5kZWZpbmVkKSB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkgPSAwO1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MubGFzdERlbGV0aW9uUmVzZXQpIHRoaXMuc2V0dGluZ3MubGFzdERlbGV0aW9uUmVzZXQgPSBcIlwiO1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5pc01lZGl0YXRpbmcgPT09IHVuZGVmaW5lZCkgdGhpcy5zZXR0aW5ncy5pc01lZGl0YXRpbmcgPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93biA9PT0gdW5kZWZpbmVkKSB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24gPSAwO1xuICAgICAgICBcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucykgdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMgPSBbXTtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeSkgdGhpcy5zZXR0aW5ncy5jaGFpbkhpc3RvcnkgPSBbXTtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmN1cnJlbnRDaGFpbklkKSB0aGlzLnNldHRpbmdzLmN1cnJlbnRDaGFpbklkID0gXCJcIjtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuY2hhaW5RdWVzdHNDb21wbGV0ZWQgPT09IHVuZGVmaW5lZCkgdGhpcy5zZXR0aW5ncy5jaGFpblF1ZXN0c0NvbXBsZXRlZCA9IDA7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzKSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVycyA9IHt9O1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUpIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUgPSB7IGFjdGl2ZUVuZXJneTogXCJhbnlcIiwgYWN0aXZlQ29udGV4dDogXCJhbnlcIiwgYWN0aXZlVGFnczogW10gfTtcbiAgICAgICAgXG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzKSB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MgPSBbXTtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLndlZWtseVJlcG9ydHMpIHRoaXMuc2V0dGluZ3Mud2Vla2x5UmVwb3J0cyA9IFtdO1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMpIHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMgPSBbXTtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLnN0cmVhaykgdGhpcy5zZXR0aW5ncy5zdHJlYWsgPSB7IGN1cnJlbnQ6IDAsIGxvbmdlc3Q6IDAsIGxhc3REYXRlOiBcIlwiIH07XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5hY2hpZXZlbWVudHMpIHRoaXMuc2V0dGluZ3MuYWNoaWV2ZW1lbnRzID0gW107XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmdhbWVXb24gPT09IHVuZGVmaW5lZCkgdGhpcy5zZXR0aW5ncy5nYW1lV29uID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLnNraWxscyA9IHRoaXMuc2V0dGluZ3Muc2tpbGxzLm1hcChzID0+ICh7XG4gICAgICAgICAgICAuLi5zLFxuICAgICAgICAgICAgcnVzdDogKHMgYXMgYW55KS5ydXN0IHx8IDAsXG4gICAgICAgICAgICBsYXN0VXNlZDogKHMgYXMgYW55KS5sYXN0VXNlZCB8fCBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBjb25uZWN0aW9uczogKHMgYXMgYW55KS5jb25uZWN0aW9ucyB8fCBbXVxuICAgICAgICB9KSk7XG4gICAgfVxuICAgIGFzeW5jIHNhdmVTZXR0aW5ncygpIHsgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTsgfVxufVxuIl0sIm5hbWVzIjpbIk5vdGljZSIsIk1vZGFsIiwibW9tZW50IiwiU2V0dGluZyIsIlRGb2xkZXIiLCJURmlsZSIsIkl0ZW1WaWV3IiwiUGx1Z2luIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFrR0E7QUFDTyxTQUFTLFNBQVMsQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUU7QUFDN0QsSUFBSSxTQUFTLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPLEtBQUssWUFBWSxDQUFDLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLFVBQVUsT0FBTyxFQUFFLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFD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
