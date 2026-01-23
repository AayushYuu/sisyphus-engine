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
        // 1. Standard Items
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
        // 2. Power-Ups
        contentEl.createEl("h3", { text: "🧪 ALCHEMY" });
        const buffs = [
            { id: "focus_potion", name: "Focus Potion", icon: "🧪", desc: "2x XP (1h)", cost: 100, duration: 60, effect: { xpMult: 2 } },
            { id: "midas_touch", name: "Midas Touch", icon: "✨", desc: "3x Gold (30m)", cost: 150, duration: 30, effect: { goldMult: 3 } },
            { id: "iron_will", name: "Iron Will", icon: "🛡️", desc: "50% Dmg Reduct (2h)", cost: 200, duration: 120, effect: { damageMult: 0.5 } }
        ];
        buffs.forEach(buff => {
            this.item(contentEl, `${buff.icon} ${buff.name}`, buff.desc, buff.cost, () => __awaiter(this, void 0, void 0, function* () {
                this.plugin.engine.activateBuff(buff);
            }));
        });
    }
    item(el, name, desc, baseCost, effect) {
        // [FIX] Apply Inflation Multiplier
        const mult = this.plugin.settings.dailyModifier.priceMult || 1;
        const realCost = Math.ceil(baseCost * mult);
        const c = el.createDiv();
        c.setAttribute("style", "display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #333;");
        const i = c.createDiv();
        i.createEl("b", { text: name });
        // Show inflated price warning if applicable
        if (mult > 1) {
            i.createEl("span", { text: ` (📈 Inf: ${mult}x)`, attr: { style: "color: red; font-size: 0.8em;" } });
        }
        i.createEl("div", { text: desc });
        const b = c.createEl("button", { text: `${realCost} G` });
        if (this.plugin.settings.gold < realCost) {
            b.setAttribute("disabled", "true");
            b.style.opacity = "0.5";
        }
        else {
            b.addClass("mod-cta");
            b.onclick = () => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.gold -= realCost;
                yield effect();
                yield this.plugin.engine.save();
                new obsidian.Notice(`Bought ${name} for ${realCost}g`);
                this.close();
                new ShopModal(this.app, this.plugin).open();
            });
        }
    }
    onClose() { this.contentEl.empty(); }
}
// ... (QuestModal, SkillManagerModal, etc. remain unchanged from previous versions, included here for completeness of file if you replace entirely, but assuming you merge or I provide only Changed classes. Since you asked for files, I will include QuestModal etc below)
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
        new obsidian.Setting(contentEl).setName("Objective").addText(t => { t.onChange(v => this.name = v); setTimeout(() => t.inputEl.focus(), 50); });
        new obsidian.Setting(contentEl).setName("Difficulty").addDropdown(d => d.addOption("1", "Trivial").addOption("2", "Easy").addOption("3", "Medium").addOption("4", "Hard").addOption("5", "SUICIDE").setValue("3").onChange(v => this.difficulty = parseInt(v)));
        const skills = { "None": "None" };
        this.plugin.settings.skills.forEach(s => skills[s.name] = s.name);
        skills["+ New"] = "+ New";
        new obsidian.Setting(contentEl).setName("Primary Node").addDropdown(d => d.addOptions(skills).onChange(v => { if (v === "+ New") {
            this.close();
            new SkillManagerModal(this.app, this.plugin).open();
        }
        else
            this.skill = v; }));
        new obsidian.Setting(contentEl).setName("Synergy Node").addDropdown(d => d.addOptions(skills).setValue("None").onChange(v => this.secSkill = v));
        new obsidian.Setting(contentEl).setName("Deadline").addText(t => { t.inputEl.type = "datetime-local"; t.onChange(v => this.deadline = v); });
        new obsidian.Setting(contentEl).setName("High Stakes").setDesc("Double Gold / Double Damage").addToggle(t => t.setValue(false).onChange(v => this.highStakes = v));
        new obsidian.Setting(contentEl).addButton(b => b.setButtonText("Deploy").setCta().onClick(() => { if (this.name) {
            this.plugin.engine.createQuest(this.name, this.difficulty, this.skill, this.secSkill, this.deadline, this.highStakes, "Normal", this.isBoss);
            this.close();
        } }));
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
        new obsidian.Setting(contentEl).setName("Rust Status").setDesc(`Stacks: ${s.rust}`).addButton(b => b.setButtonText("Manual Polish").onClick(() => __awaiter(this, void 0, void 0, function* () { s.rust = 0; s.xpReq = Math.floor(s.xpReq / 1.1); yield this.plugin.engine.save(); this.close(); new obsidian.Notice("Rust polished."); })));
        const div = contentEl.createDiv();
        div.setAttribute("style", "margin-top:20px; display:flex; justify-content:space-between;");
        const bSave = div.createEl("button", { text: "Save" });
        bSave.addClass("mod-cta");
        bSave.onclick = () => __awaiter(this, void 0, void 0, function* () { yield this.plugin.engine.save(); this.close(); });
        const bDel = div.createEl("button", { text: "Delete Node" });
        bDel.setAttribute("style", "color:red;");
        bDel.onclick = () => __awaiter(this, void 0, void 0, function* () { this.plugin.settings.skills.splice(this.index, 1); yield this.plugin.engine.save(); this.close(); });
    }
    onClose() { this.contentEl.empty(); }
}
class QuickCaptureModal extends obsidian.Modal {
    constructor(app, plugin) { super(app); this.plugin = plugin; }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "⚡ Quick Capture" });
        const div = contentEl.createDiv();
        const input = div.createEl("input", { type: "text", attr: { placeholder: "What's on your mind?", style: "width: 100%; padding: 10px; font-size: 1.2em; background: #222; border: 1px solid #444; color: #e0e0e0;" } });
        input.focus();
        input.addEventListener("keypress", (e) => __awaiter(this, void 0, void 0, function* () { if (e.key === "Enter" && input.value.trim().length > 0) {
            yield this.plugin.engine.createScrap(input.value);
            this.close();
        } }));
        const btn = contentEl.createEl("button", { text: "Capture to Scraps" });
        btn.addClass("mod-cta");
        btn.setAttribute("style", "margin-top: 15px; width: 100%;");
        btn.onclick = () => __awaiter(this, void 0, void 0, function* () { if (input.value.trim().length > 0) {
            yield this.plugin.engine.createScrap(input.value);
            this.close();
        } });
    }
    onClose() { this.contentEl.empty(); }
}
class QuestTemplateModal extends obsidian.Modal {
    constructor(app, plugin) { super(app); this.plugin = plugin; }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "⚡ Quick Deploy Templates" });
        const grid = contentEl.createDiv();
        grid.style.display = "grid";
        grid.style.gridTemplateColumns = "1fr 1fr";
        grid.style.gap = "10px";
        const templates = this.plugin.settings.questTemplates || [];
        if (templates.length === 0)
            grid.createDiv({ text: "No templates found. Create one in Settings." });
        templates.forEach(template => {
            const btn = grid.createEl("button", { text: template.name });
            btn.addClass("sisy-btn");
            btn.style.textAlign = "left";
            btn.style.padding = "15px";
            btn.createDiv({ text: `Diff: ${template.diff} | Skill: ${template.skill}`, attr: { style: "font-size: 0.8em; opacity: 0.7; margin-top: 5px;" } });
            btn.onclick = () => {
                let deadline = "";
                if (template.deadline.startsWith("+")) {
                    const hours = parseInt(template.deadline.replace("+", "").replace("h", ""));
                    deadline = obsidian.moment().add(hours, 'hours').toISOString();
                }
                else if (template.deadline.includes(":")) {
                    const [h, m] = template.deadline.split(":");
                    deadline = obsidian.moment().set({ hour: parseInt(h), minute: parseInt(m) }).toISOString();
                    if (obsidian.moment().isAfter(deadline))
                        deadline = obsidian.moment(deadline).add(1, 'day').toISOString();
                }
                else
                    deadline = obsidian.moment().add(24, 'hours').toISOString();
                this.plugin.engine.createQuest(template.name, template.diff, template.skill, "None", deadline, false, "Normal", false);
                new obsidian.Notice(`Deployed: ${template.name}`);
                this.close();
            };
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
        new obsidian.Setting(contentEl).setName("Research Title").addText(t => { t.onChange(v => this.title = v); setTimeout(() => t.inputEl.focus(), 50); });
        new obsidian.Setting(contentEl).setName("Research Type").addDropdown(d => d.addOption("survey", "Survey (100-200 words)").addOption("deep_dive", "Deep Dive (200-400 words)").setValue("survey").onChange(v => this.type = v));
        const skills = { "None": "None" };
        this.plugin.settings.skills.forEach(s => skills[s.name] = s.name);
        new obsidian.Setting(contentEl).setName("Linked Skill").addDropdown(d => d.addOptions(skills).setValue("None").onChange(v => this.linkedSkill = v));
        const combatQuests = { "None": "None" };
        const questFolder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        if (questFolder instanceof obsidian.TFolder) {
            questFolder.children.forEach(f => { if (f instanceof obsidian.TFile && f.extension === "md")
                combatQuests[f.basename] = f.basename; });
        }
        new obsidian.Setting(contentEl).setName("Link Combat Quest").addDropdown(d => d.addOptions(combatQuests).setValue("None").onChange(v => this.linkedCombatQuest = v));
        new obsidian.Setting(contentEl).addButton(b => b.setButtonText("CREATE RESEARCH").setCta().onClick(() => { if (this.title) {
            this.plugin.engine.createResearchQuest(this.title, this.type, this.linkedSkill, this.linkedCombatQuest);
            this.close();
        } }));
    }
    onClose() { this.contentEl.empty(); }
}
class ResearchListModal extends obsidian.Modal {
    constructor(app, plugin) { super(app); this.plugin = plugin; }
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
        if (quests.length === 0)
            contentEl.createEl("p", { text: "No active research quests." });
        else
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
                completeBtn.onclick = () => { this.plugin.engine.completeResearchQuest(q.id, q.wordCount); this.close(); };
                const deleteBtn = actions.createEl("button", { text: "DELETE" });
                deleteBtn.setAttribute("style", "flex: 1; padding: 5px; background: red; color: white; border: none; border-radius: 3px; cursor: pointer;");
                deleteBtn.onclick = () => { this.plugin.engine.deleteResearchQuest(q.id); this.close(); };
            });
        contentEl.createEl("h3", { text: "Completed Research" });
        const completed = this.plugin.settings.researchQuests.filter(q => q.completed);
        if (completed.length === 0)
            contentEl.createEl("p", { text: "No completed research." });
        else
            completed.forEach((q) => { const item = contentEl.createEl("p"); item.setText(`+ ${q.title} (${q.type === "survey" ? "Survey" : "Deep Dive"})`); item.setAttribute("style", "opacity: 0.6; font-size: 0.9em;"); });
    }
    onClose() { this.contentEl.empty(); }
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
        new obsidian.Setting(contentEl).setName("Chain Name").addText(t => { t.onChange(v => this.chainName = v); setTimeout(() => t.inputEl.focus(), 50); });
        contentEl.createEl("h3", { text: "Select Quests" });
        const questFolder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        const quests = [];
        if (questFolder instanceof obsidian.TFolder) {
            questFolder.children.forEach(f => { if (f instanceof obsidian.TFile && f.extension === "md")
                quests.push(f.basename); });
        }
        quests.forEach((quest, idx) => { new obsidian.Setting(contentEl).setName(quest).addToggle(t => t.onChange(v => { if (v)
            this.selectedQuests.push(quest);
        else
            this.selectedQuests = this.selectedQuests.filter(q => q !== quest); })); });
        new obsidian.Setting(contentEl).addButton(b => b.setButtonText("CREATE CHAIN").setCta().onClick(() => __awaiter(this, void 0, void 0, function* () { if (this.chainName && this.selectedQuests.length >= 2) {
            yield this.plugin.engine.createQuestChain(this.chainName, this.selectedQuests);
            this.close();
        }
        else
            new obsidian.Notice("Chain needs a name and at least 2 quests"); })));
    }
    onClose() { this.contentEl.empty(); }
}
class VictoryModal extends obsidian.Modal {
    constructor(app, plugin) { super(app); this.plugin = plugin; }
    onOpen() {
        const { contentEl } = this;
        contentEl.addClass("sisy-victory-modal");
        contentEl.createEl("h1", { text: "ASCENSION ACHIEVED", cls: "sisy-victory-title" });
        contentEl.createEl("div", { text: "🏆", attr: { style: "font-size: 60px; margin: 20px 0;" } });
        const stats = contentEl.createDiv();
        const legacy = this.plugin.settings.legacy;
        const metrics = this.plugin.engine.getGameStats();
        this.statLine(stats, "Final Level", "50");
        this.statLine(stats, "Total Quests", `${metrics.totalQuests}`);
        this.statLine(stats, "Deaths Endured", `${legacy.deathCount}`);
        this.statLine(stats, "Longest Streak", `${metrics.longestStreak} days`);
        contentEl.createEl("p", { text: "One must imagine Sisyphus happy. You have pushed the boulder to the peak.", attr: { style: "margin: 30px 0; font-style: italic; opacity: 0.8;" } });
        const btn = contentEl.createEl("button", { text: "BEGIN NEW GAME+" });
        btn.addClass("mod-cta");
        btn.style.width = "100%";
        btn.onclick = () => { this.close(); };
    }
    statLine(el, label, val) { const line = el.createDiv({ cls: "sisy-victory-stat" }); line.innerHTML = `${label}: <span class="sisy-victory-highlight">${val}</span>`; }
    onClose() { this.contentEl.empty(); }
}
class TemplateManagerModal extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        this.newName = "";
        this.newDiff = 1;
        this.newSkill = "None";
        this.newDeadline = "+2h";
        this.plugin = plugin;
    }
    onOpen() {
        this.display();
    }
    display() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: "Manage Templates" });
        // 1. List Existing Templates
        const listDiv = contentEl.createDiv();
        listDiv.style.marginBottom = "20px";
        listDiv.style.maxHeight = "300px";
        listDiv.style.overflowY = "auto";
        this.plugin.settings.questTemplates.forEach((t, idx) => {
            const row = listDiv.createDiv();
            row.style.display = "flex";
            row.style.justifyContent = "space-between";
            row.style.alignItems = "center";
            row.style.padding = "10px";
            row.style.borderBottom = "1px solid #333";
            row.createDiv({ text: `${t.name} (D${t.diff}, ${t.skill}, ${t.deadline})` });
            const delBtn = row.createEl("button", { text: "Delete" });
            delBtn.style.color = "red";
            delBtn.onclick = () => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.questTemplates.splice(idx, 1);
                yield this.plugin.saveSettings();
                this.display(); // Refresh UI
            });
        });
        // 2. Add New Template Form
        contentEl.createEl("h3", { text: "Add New Template" });
        new obsidian.Setting(contentEl).setName("Name").addText(t => t.onChange(v => this.newName = v));
        new obsidian.Setting(contentEl).setName("Difficulty (1-5)").addText(t => t.setValue("1").onChange(v => this.newDiff = parseInt(v)));
        new obsidian.Setting(contentEl).setName("Skill").addText(t => t.setValue("None").onChange(v => this.newSkill = v));
        new obsidian.Setting(contentEl).setName("Deadline").setDesc("Format: '10:00' or '+2h'").addText(t => t.setValue("+2h").onChange(v => this.newDeadline = v));
        new obsidian.Setting(contentEl).addButton(b => b
            .setButtonText("Add Template")
            .setCta()
            .onClick(() => __awaiter(this, void 0, void 0, function* () {
            if (!this.newName)
                return;
            this.plugin.settings.questTemplates.push({
                name: this.newName,
                diff: this.newDiff,
                skill: this.newSkill,
                deadline: this.newDeadline
            });
            yield this.plugin.saveSettings();
            this.display(); // Refresh UI to show new item
            new obsidian.Notice("Template added.");
            // Reset fields
            this.newName = "";
        })));
    }
    onClose() {
        this.contentEl.empty();
    }
}

const ACHIEVEMENT_DEFINITIONS = [
    // --- EARLY GAME ---
    { id: "first_blood", name: "First Blood", description: "Complete your first quest.", rarity: "common" },
    { id: "week_warrior", name: "Week Warrior", description: "Maintain a 7-day streak.", rarity: "common" },
    { id: "warm_up", name: "Warm Up", description: "Complete 10 total quests.", rarity: "common" },
    // --- MID GAME ---
    { id: "skill_adept", name: "Apprentice", description: "Reach Level 5 in any skill.", rarity: "rare" },
    { id: "chain_gang", name: "Chain Gang", description: "Complete a Quest Chain.", rarity: "rare" },
    { id: "researcher", name: "Scholar", description: "Complete 5 Research Quests.", rarity: "rare" },
    { id: "rich", name: "Capitalist", description: "Hold 500 gold at once.", rarity: "rare" },
    // --- END GAME ---
    { id: "boss_slayer", name: "Giant Slayer", description: "Defeat your first Boss.", rarity: "epic" },
    { id: "ascended", name: "Sisyphus Happy", description: "Reach Level 50.", rarity: "legendary" },
    { id: "immortal", name: "Immortal", description: "Reach Level 20 with 0 Deaths.", rarity: "legendary" }
];

class AnalyticsEngine {
    constructor(settings, audioController) {
        this.settings = settings;
        this.audioController = audioController;
    }
    /**
     * Ensure all achievements exist in settings
     */
    initializeAchievements() {
        // If achievements array is empty or missing definitions, sync it
        if (!this.settings.achievements)
            this.settings.achievements = [];
        ACHIEVEMENT_DEFINITIONS.forEach(def => {
            const exists = this.settings.achievements.find(a => a.id === def.id);
            if (!exists) {
                this.settings.achievements.push(Object.assign(Object.assign({}, def), { unlocked: false }));
            }
        });
    }
    trackDailyMetrics(type, amount = 1) {
        const today = obsidian.moment().format("YYYY-MM-DD");
        let metric = this.settings.dayMetrics.find(m => m.date === today);
        if (!metric) {
            metric = { date: today, questsCompleted: 0, questsFailed: 0, xpEarned: 0, goldEarned: 0, damagesTaken: 0, skillsLeveled: [], chainsCompleted: 0 };
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
        // Trigger Achievement Check after every metric update
        this.checkAchievements();
    }
    updateStreak() {
        const today = obsidian.moment().format("YYYY-MM-DD");
        const lastDate = this.settings.streak.lastDate;
        if (lastDate !== today) {
            const yesterday = obsidian.moment().subtract(1, 'day').format("YYYY-MM-DD");
            if (lastDate === yesterday) {
                // Continued from yesterday
                this.settings.streak.current++;
            }
            else if (!lastDate) {
                // First ever quest
                this.settings.streak.current = 1;
            }
            else {
                // Broken streak
                this.settings.streak.current = 1;
            }
            if (this.settings.streak.current > this.settings.streak.longest) {
                this.settings.streak.longest = this.settings.streak.current;
            }
            this.settings.streak.lastDate = today;
        }
        // Always check achievements
        this.checkAchievements();
    }
    checkAchievements() {
        this.initializeAchievements();
        const s = this.settings;
        const totalQuests = s.dayMetrics.reduce((sum, m) => sum + m.questsCompleted, 0);
        // 1. First Blood
        if (totalQuests >= 1)
            this.unlock("first_blood");
        // 2. Warm Up
        if (totalQuests >= 10)
            this.unlock("warm_up");
        // 3. Week Warrior
        if (s.streak.current >= 7)
            this.unlock("week_warrior");
        // 4. Skill Adept
        if (s.skills.some(skill => skill.level >= 5))
            this.unlock("skill_adept");
        // 5. Chain Gang
        if (s.chainHistory.length >= 1)
            this.unlock("chain_gang");
        // 6. Researcher
        if (s.researchStats.researchCompleted >= 5)
            this.unlock("researcher");
        // 7. Capitalist
        if (s.gold >= 500)
            this.unlock("rich");
        // 8. Giant Slayer
        if (s.bossMilestones.some(b => b.defeated))
            this.unlock("boss_slayer");
        // 9. Ascended
        if (s.level >= 50)
            this.unlock("ascended");
        // 10. Immortal
        if (s.level >= 20 && s.legacy.deathCount === 0)
            this.unlock("immortal");
    }
    unlock(id) {
        const ach = this.settings.achievements.find(a => a.id === id);
        if (ach && !ach.unlocked) {
            ach.unlocked = true;
            ach.unlockedAt = new Date().toISOString();
            if (this.audioController)
                this.audioController.playSound("success");
            // We return true so the caller can show a notice if they want, 
            // though usually the Notice is better handled here if we had access to that API easily, 
            // or let the engine handle the notification.
        }
    }
    // ... (Keep existing boss/report methods below as they were) ...
    initializeBossMilestones() {
        if (this.settings.bossMilestones.length === 0) {
            this.settings.bossMilestones = [
                { level: 10, name: "The First Trial", unlocked: false, defeated: false, xpReward: 500 },
                { level: 20, name: "The Nemesis Returns", unlocked: false, defeated: false, xpReward: 1000 },
                { level: 30, name: "The Reaper Awakens", unlocked: false, defeated: false, xpReward: 1500 },
                { level: 50, name: "The Final Ascension", unlocked: false, defeated: false, xpReward: 5000 }
            ];
        }
    }
    checkBossMilestones() {
        const messages = [];
        if (!this.settings.bossMilestones || this.settings.bossMilestones.length === 0)
            this.initializeBossMilestones();
        this.settings.bossMilestones.forEach((boss) => {
            if (this.settings.level >= boss.level && !boss.unlocked) {
                boss.unlocked = true;
                messages.push(`Boss Unlocked: ${boss.name} (Level ${boss.level})`);
                if (this.audioController)
                    this.audioController.playSound("success");
            }
        });
        return messages;
    }
    defeatBoss(level) {
        const boss = this.settings.bossMilestones.find((b) => b.level === level);
        if (!boss)
            return { success: false, message: "Boss not found", xpReward: 0 };
        if (boss.defeated)
            return { success: false, message: "Boss already defeated", xpReward: 0 };
        boss.defeated = true;
        boss.defeatedAt = new Date().toISOString();
        this.settings.xp += boss.xpReward;
        if (this.audioController)
            this.audioController.playSound("success");
        if (level === 50)
            this.winGame();
        return { success: true, message: `Boss Defeated: ${boss.name}! +${boss.xpReward} XP`, xpReward: boss.xpReward };
    }
    winGame() {
        this.settings.gameWon = true;
        this.settings.endGameDate = new Date().toISOString();
        if (this.audioController)
            this.audioController.playSound("success");
    }
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
        const topSkills = this.settings.skills.sort((a, b) => (b.level - a.level)).slice(0, 3).map((s) => s.name);
        const bestDay = weekMetrics.length > 0 ? weekMetrics.reduce((max, m) => m.questsCompleted > max.questsCompleted ? m : max).date : startDate;
        const worstDay = weekMetrics.length > 0 ? weekMetrics.reduce((min, m) => m.questsFailed > min.questsFailed ? m : min).date : startDate;
        const report = { week, startDate, endDate, totalQuests, successRate, totalXp, totalGold, topSkills, bestDay, worstDay };
        this.settings.weeklyReports.push(report);
        return report;
    }
    unlockAchievement(achievementId) {
        // This is a manual override if needed, logic is mostly in checkAchievements now
        this.checkAchievements();
        return true;
    }
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

class ResearchEngine {
    constructor(settings, app, audioController) {
        this.settings = settings;
        this.app = app;
        this.audioController = audioController;
    }
    createResearchQuest(title, type, linkedSkill, linkedCombatQuest) {
        return __awaiter(this, void 0, void 0, function* () {
            // [FIX] Allow first research quest for free (Cold Start), otherwise enforce 2:1
            if (this.settings.researchStats.totalResearch > 0 && !this.canCreateResearchQuest()) {
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
            // [FIX] Create actual Markdown file
            const folderPath = "Active_Run/Research";
            if (!this.app.vault.getAbstractFileByPath(folderPath)) {
                yield this.app.vault.createFolder(folderPath);
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
                yield this.app.vault.create(filename, content);
            }
            catch (e) {
                new obsidian.Notice("Error creating research file. Check console.");
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
        });
    }
    completeResearchQuest(questId, finalWordCount) {
        var _a;
        const researchQuest = this.settings.researchQuests.find(q => q.id === questId);
        if (!researchQuest)
            return { success: false, message: "Research quest not found", xpReward: 0, goldPenalty: 0 };
        if (researchQuest.completed)
            return { success: false, message: "Quest already completed", xpReward: 0, goldPenalty: 0 };
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
            if (skill.xp >= skill.xpReq) {
                skill.level++;
                skill.xp = 0;
            }
        }
        this.settings.gold -= goldPenalty;
        researchQuest.completed = true;
        researchQuest.completedAt = new Date().toISOString();
        this.settings.researchStats.researchCompleted++;
        if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound)
            this.audioController.playSound("success");
        let message = `Research Complete! +${xpReward} XP`;
        if (goldPenalty > 0)
            message += ` (-${goldPenalty}g tax)`;
        return { success: true, message, xpReward, goldPenalty };
    }
    deleteResearchQuest(questId) {
        return __awaiter(this, void 0, void 0, function* () {
            const index = this.settings.researchQuests.findIndex(q => q.id === questId);
            if (index !== -1) {
                const quest = this.settings.researchQuests[index];
                // [FIX] Try to find and delete the file
                const files = this.app.vault.getMarkdownFiles();
                const file = files.find(f => {
                    var _a;
                    const cache = this.app.metadataCache.getFileCache(f);
                    return ((_a = cache === null || cache === void 0 ? void 0 : cache.frontmatter) === null || _a === void 0 ? void 0 : _a.research_id) === questId;
                });
                if (file) {
                    yield this.app.vault.delete(file);
                }
                this.settings.researchQuests.splice(index, 1);
                if (!quest.completed)
                    this.settings.researchStats.totalResearch = Math.max(0, this.settings.researchStats.totalResearch - 1);
                else
                    this.settings.researchStats.researchCompleted = Math.max(0, this.settings.researchStats.researchCompleted - 1);
                return { success: true, message: "Research deleted" };
            }
            return { success: false, message: "Not found" };
        });
    }
    updateResearchWordCount(questId, newWordCount) {
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
    canCreateResearchQuest() {
        const stats = this.settings.researchStats;
        const ratio = stats.totalCombat / Math.max(1, stats.totalResearch);
        return ratio >= 2;
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
       * Handle file rename events to keep chains intact
       * @param oldName The previous basename of the file
       * @param newName The new basename of the file
       */
    handleRename(oldName, newName) {
        let changesMade = false;
        this.settings.activeChains.forEach(chain => {
            // Check if this chain contains the old quest name
            const index = chain.quests.indexOf(oldName);
            if (index !== -1) {
                // Replace with new name
                chain.quests[index] = newName;
                changesMade = true;
            }
        });
        // Also check history (optional, but good for data integrity)
        this.settings.chainHistory.forEach(record => {
            // If you store quest lists in history later, update them here.
            // Currently history is just summary data, so strictly not needed yet,
            // but good to keep in mind.
        });
        if (changesMade) {
            // Using console log for debug, Notice might be too spammy during batch renames
            console.log(`[Sisyphus] Updated chains for rename: ${oldName} -> ${newName}`);
        }
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
       * Handle file rename events to preserve filters
       * @param oldName The previous basename
       * @param newName The new basename
       */
    handleRename(oldName, newName) {
        const filterData = this.settings.questFilters[oldName];
        if (filterData) {
            // 1. Assign data to new key
            this.settings.questFilters[newName] = filterData;
            // 2. Delete old key
            delete this.settings.questFilters[oldName];
            console.log(`[Sisyphus] Transferred filters: ${oldName} -> ${newName}`);
        }
    }
    /**
     * Garbage Collection: Clean up filters for files that no longer exist
     * Call this sparingly (e.g., on plugin load)
     */
    cleanupOrphans(existingFileNames) {
        const keys = Object.keys(this.settings.questFilters);
        let deleted = 0;
        keys.forEach(key => {
            if (!existingFileNames.includes(key)) {
                delete this.settings.questFilters[key];
                deleted++;
            }
        });
        if (deleted > 0) {
            console.log(`[Sisyphus] Cleaned up ${deleted} orphaned filter entries.`);
        }
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
const BOSS_DATA = {
    10: { name: "The Gatekeeper", desc: "The first major filter.", hp_pen: 20 },
    20: { name: "The Shadow Self", desc: "Your own bad habits manifest.", hp_pen: 30 },
    30: { name: "The Mountain", desc: "The peak is visible.", hp_pen: 40 },
    50: { name: "Sisyphus Prime", desc: "One must imagine Sisyphus happy.", hp_pen: 99 }
};
const MISSION_POOL = [
    { id: "morning_win", name: "☀️ Morning Win", desc: "Complete 1 Trivial quest before 10 AM", target: 1, reward: { xp: 0, gold: 15 }, check: "morning_trivial" },
    { id: "momentum", name: "🔥 Momentum", desc: "Complete 3 quests today", target: 3, reward: { xp: 20, gold: 0 }, check: "quest_count" },
    { id: "zero_inbox", name: "🧘 Zero Inbox", desc: "Process all files in 'Scraps'", target: 1, reward: { xp: 0, gold: 10 }, check: "zero_inbox" },
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
        // [FEATURE] Undo Buffer
        this.deletedQuestBuffer = [];
        this.app = app;
        this.plugin = plugin;
        this.audio = audio;
        this.analyticsEngine = new AnalyticsEngine(this.plugin.settings, this.audio);
        this.meditationEngine = new MeditationEngine(this.plugin.settings, this.audio);
        this.researchEngine = new ResearchEngine(this.plugin.settings, this.app, this.audio);
        this.chainsEngine = new ChainsEngine(this.plugin.settings, this.audio);
        this.filtersEngine = new FiltersEngine(this.plugin.settings);
    }
    get settings() { return this.plugin.settings; }
    set settings(val) { this.plugin.settings = val; }
    save() {
        return __awaiter(this, void 0, void 0, function* () { yield this.plugin.saveSettings(); this.trigger("update"); });
    }
    // [FIX] Safe Archiver: Handles duplicates by renaming (Quest -> Quest (1))
    safeArchive(file_1) {
        return __awaiter(this, arguments, void 0, function* (file, subfolder = "Archive") {
            const root = "Active_Run";
            const targetFolder = `${root}/${subfolder}`;
            if (!this.app.vault.getAbstractFileByPath(root))
                yield this.app.vault.createFolder(root);
            if (!this.app.vault.getAbstractFileByPath(targetFolder))
                yield this.app.vault.createFolder(targetFolder);
            let targetPath = `${targetFolder}/${file.name}`;
            // Collision Detection Loop
            let counter = 1;
            while (this.app.vault.getAbstractFileByPath(targetPath)) {
                targetPath = `${targetFolder}/${file.basename} (${counter}).${file.extension}`;
                counter++;
            }
            yield this.app.fileManager.renameFile(file, targetPath);
        });
    }
    activateBuff(item) {
        const expires = obsidian.moment().add(item.duration, 'minutes').toISOString();
        this.settings.activeBuffs.push({
            id: item.id,
            name: item.name,
            icon: item.icon,
            expiresAt: expires,
            effect: item.effect
        });
        new obsidian.Notice(`🥤 Gulp! ${item.name} active for ${item.duration}m`);
        this.save();
    }
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
        let justFinishedAll = false;
        this.settings.dailyMissions.forEach(mission => {
            if (mission.completed)
                return;
            switch (mission.checkFunc) {
                case "zero_inbox":
                    const scraps = this.app.vault.getAbstractFileByPath("Scraps");
                    if (scraps instanceof obsidian.TFolder) {
                        mission.progress = scraps.children.length === 0 ? 1 : 0;
                    }
                    else {
                        mission.progress = 1;
                    }
                    break;
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
                    if (context.type === "complete" && context.questCreated && obsidian.moment().diff(obsidian.moment(context.questCreated), 'hours') <= 2)
                        mission.progress++;
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
                        mission.progress = Math.max(0, ...Object.values(this.settings.skillUsesToday));
                    }
                    break;
            }
            if (mission.progress >= mission.target && !mission.completed) {
                mission.completed = true;
                this.settings.xp += mission.reward.xp;
                this.settings.gold += mission.reward.gold;
                new obsidian.Notice(`✅ Mission Complete: ${mission.name}`);
                this.audio.playSound("success");
                if (this.settings.dailyMissions.every(m => m.completed))
                    justFinishedAll = true;
            }
        });
        if (justFinishedAll) {
            this.settings.gold += 50;
            new obsidian.Notice("🎉 All Missions Complete! +50 Bonus Gold");
            this.audio.playSound("success");
        }
        this.save();
    }
    getDifficultyNumber(diffLabel) {
        const map = { "Trivial": 1, "Easy": 2, "Medium": 3, "Hard": 4, "SUICIDE": 5 };
        return map[diffLabel] || 3;
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
                this.settings.maxHp = 100 + (this.settings.level * 5);
                this.settings.hp = Math.min(this.settings.maxHp, this.settings.hp + 20);
                this.settings.damageTakenToday = 0;
                this.settings.lockdownUntil = "";
                this.settings.lastLogin = today;
                // Rust Logic
                const todayMoment = obsidian.moment();
                this.settings.skills.forEach(s => {
                    if (s.lastUsed) {
                        if (todayMoment.diff(obsidian.moment(s.lastUsed), 'days') > 3 && !this.isResting()) {
                            s.rust = Math.min(10, (s.rust || 0) + 1);
                            s.xpReq = Math.floor(s.xpReq * 1.1);
                        }
                    }
                });
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
            if (this.meditationEngine.isLockedDown()) {
                new obsidian.Notice("LOCKDOWN ACTIVE");
                return;
            }
            // --- COMBO SYSTEM ---
            const now = Date.now();
            const timeDiff = now - this.settings.lastCompletionTime;
            const COMBO_WINDOW = 10 * 60 * 1000; // 10 minutes
            if (timeDiff < COMBO_WINDOW) {
                this.settings.comboCount++;
                this.audio.playSound("success");
            }
            else {
                this.settings.comboCount = 1;
            }
            this.settings.lastCompletionTime = now;
            // ---------------------------
            const fm = (_a = this.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
            if (!fm)
                return;
            const questName = file.basename;
            if (this.chainsEngine.isQuestInChain(questName)) {
                const canStart = this.chainsEngine.canStartQuest(questName);
                if (!canStart) {
                    new obsidian.Notice("Locked by Chain.");
                    return;
                }
                const chainResult = yield this.chainsEngine.completeChainQuest(questName);
                if (chainResult.success) {
                    new obsidian.Notice(chainResult.message);
                    if (chainResult.chainComplete) {
                        this.settings.xp += chainResult.bonusXp;
                        new obsidian.Notice(`🎉 Chain Bonus: +${chainResult.bonusXp} XP!`);
                    }
                }
            }
            if (fm.is_boss) {
                const match = file.basename.match(/BOSS_LVL(\d+)/);
                if (match) {
                    const level = parseInt(match[1]);
                    const result = this.analyticsEngine.defeatBoss(level);
                    new obsidian.Notice(result.message);
                    if (this.settings.gameWon)
                        new VictoryModal(this.app, this.plugin).open();
                }
            }
            this.analyticsEngine.trackDailyMetrics("quest_complete", 1);
            this.settings.researchStats.totalCombat++;
            // Rewards
            let xpMult = this.settings.dailyModifier.xpMult;
            let goldMult = this.settings.dailyModifier.goldMult;
            this.settings.activeBuffs.forEach(b => {
                if (b.effect.xpMult)
                    xpMult *= b.effect.xpMult;
                if (b.effect.goldMult)
                    goldMult *= b.effect.goldMult;
            });
            let xp = (fm.xp_reward || 20) * xpMult;
            let gold = (fm.gold_reward || 0) * goldMult;
            if (this.settings.comboCount > 1) {
                const bonus = Math.floor(xp * 0.1 * (this.settings.comboCount - 1));
                xp += bonus;
                new obsidian.Notice(`🔥 COMBO x${this.settings.comboCount}! +${bonus} Bonus XP`);
            }
            const skillName = fm.skill || "None";
            const skill = this.settings.skills.find(s => s.name === skillName);
            if (skill) {
                skill.rust = 0;
                skill.xpReq = Math.floor(skill.xpReq / 1.1);
                skill.lastUsed = new Date().toISOString();
                skill.xp += 1;
                if (skill.xp >= skill.xpReq) {
                    skill.level++;
                    skill.xp = 0;
                    new obsidian.Notice(`🧠 ${skill.name} Leveled Up!`);
                }
            }
            const secondary = fm.secondary_skill || "None";
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
            this.settings.xp += xp;
            this.settings.gold += gold;
            if (this.settings.dailyModifier.name === "Adrenaline") {
                this.settings.hp -= 5;
                this.settings.damageTakenToday += 5;
                if (this.settings.damageTakenToday > 50 && !this.meditationEngine.isLockedDown()) {
                    this.meditationEngine.triggerLockdown();
                    this.trigger("lockdown");
                    new obsidian.Notice("Overexertion! LOCKDOWN INITIATED.");
                }
            }
            this.audio.playSound("success");
            if (this.settings.xp >= this.settings.xpReq) {
                this.settings.level++;
                this.settings.xp = 0;
                this.settings.xpReq = Math.floor(this.settings.xpReq * 1.1);
                this.settings.maxHp = 100 + (this.settings.level * 5);
                this.settings.hp = this.settings.maxHp;
                this.taunt("level_up");
                const msgs = this.analyticsEngine.checkBossMilestones();
                msgs.forEach(m => new obsidian.Notice(m));
                if ([10, 20, 30, 50].includes(this.settings.level))
                    this.spawnBoss(this.settings.level);
            }
            this.settings.questsCompletedToday++;
            this.analyticsEngine.updateStreak();
            this.checkDailyMissions({
                type: "complete",
                difficulty: this.getDifficultyNumber(fm.difficulty),
                skill: skillName,
                secondarySkill: secondary,
                highStakes: fm.high_stakes
            });
            yield this.app.fileManager.processFrontMatter(file, (f) => { f.status = "completed"; f.completed_at = new Date().toISOString(); });
            // [FIX] Use Safe Archive to prevent duplicates/zombies
            yield this.safeArchive(file, "Archive");
            yield this.save();
        });
    }
    spawnBoss(level) {
        return __awaiter(this, void 0, void 0, function* () {
            const boss = BOSS_DATA[level];
            if (!boss)
                return;
            this.audio.playSound("heartbeat");
            new obsidian.Notice("⚠️ ANOMALY DETECTED...", 2000);
            setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                this.audio.playSound("death");
                new obsidian.Notice(`☠️ BOSS SPAWNED: ${boss.name}`);
                yield this.createQuest(`BOSS_LVL${level} - ${boss.name}`, 5, "Boss", "None", obsidian.moment().add(3, 'days').toISOString(), true, "Critical", true);
                setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    const safeName = `BOSS_LVL${level}_-_${boss.name}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    const files = this.app.vault.getMarkdownFiles();
                    const file = files.find(f => f.name.toLowerCase() === `${safeName}.md`);
                    if (file instanceof obsidian.TFile) {
                        const maxHp = 100 + (level * 20);
                        yield this.app.fileManager.processFrontMatter(file, (fm) => {
                            fm.boss_hp = maxHp;
                            fm.boss_max_hp = maxHp;
                        });
                        this.trigger("update");
                    }
                }), 500);
            }), 3000);
        });
    }
    damageBoss(file) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const fm = (_a = this.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
            if (!fm || !fm.is_boss)
                return;
            const damage = 25;
            const currentHp = fm.boss_hp || 100;
            const newHp = currentHp - damage;
            if (newHp <= 0) {
                yield this.completeQuest(file);
                new obsidian.Notice("⚔️ FINAL BLOW! Boss Defeated!");
            }
            else {
                yield this.app.fileManager.processFrontMatter(file, (f) => {
                    f.boss_hp = newHp;
                });
                this.audio.playSound("fail");
                new obsidian.Notice(`⚔️ Boss Damaged! ${newHp}/${fm.boss_max_hp} HP remaining`);
                setTimeout(() => this.trigger("update"), 200);
            }
        });
    }
    failQuest(file_1) {
        return __awaiter(this, arguments, void 0, function* (file, manualAbort = false) {
            var _a;
            if (this.isResting() && !manualAbort) {
                new obsidian.Notice("Rest Day protection.");
                return;
            }
            if (this.isShielded() && !manualAbort) {
                new obsidian.Notice("Shielded!");
                return;
            }
            let damage = 10 + Math.floor(this.settings.rivalDmg / 2);
            this.settings.activeBuffs.forEach(b => {
                if (b.effect.damageMult)
                    damage = Math.floor(damage * b.effect.damageMult);
            });
            const fm = (_a = this.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
            if (fm === null || fm === void 0 ? void 0 : fm.is_boss) {
                const match = file.basename.match(/BOSS_LVL(\d+)/);
                if (match) {
                    const level = parseInt(match[1]);
                    if (BOSS_DATA[level]) {
                        damage += BOSS_DATA[level].hp_pen;
                        new obsidian.Notice(`☠️ Boss Crush: +${BOSS_DATA[level].hp_pen} Damage`);
                    }
                }
            }
            if (this.settings.gold < 0)
                damage *= 2;
            this.settings.hp -= damage;
            this.settings.damageTakenToday += damage;
            if (!manualAbort)
                this.settings.rivalDmg += 1;
            this.audio.playSound("fail");
            this.checkDailyMissions({ type: "damage" });
            if (this.settings.damageTakenToday > 50) {
                this.meditationEngine.triggerLockdown();
                this.trigger("lockdown");
            }
            const gravePath = "Graveyard/Failures";
            if (!this.app.vault.getAbstractFileByPath(gravePath))
                yield this.app.vault.createFolder(gravePath);
            yield this.app.fileManager.renameFile(file, `${gravePath}/[FAILED] ${file.name}`);
            yield this.save();
        });
    }
    createQuest(name, diff, skill, secSkill, deadlineIso, highStakes, priority, isBoss) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.meditationEngine.isLockedDown()) {
                new obsidian.Notice("LOCKDOWN ACTIVE");
                return;
            }
            let xpReward = 0;
            let goldReward = 0;
            let diffLabel = "";
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
            if (isBoss) {
                xpReward = 1000;
                goldReward = 1000;
                diffLabel = "☠️ BOSS";
            }
            if (highStakes && !isBoss)
                goldReward = Math.floor(goldReward * 1.5);
            const rootPath = "Active_Run/Quests";
            if (!this.app.vault.getAbstractFileByPath(rootPath))
                yield this.app.vault.createFolder(rootPath);
            const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
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
deadline: ${deadlineIso}
---
# ⚔️ ${name}`;
            yield this.app.vault.create(`${rootPath}/${safeName}.md`, content);
            this.audio.playSound("click");
            this.save();
        });
    }
    deleteQuest(file) {
        return __awaiter(this, void 0, void 0, function* () {
            const costResult = this.meditationEngine.applyDeletionCost();
            if (costResult.cost > 0 && this.settings.gold < costResult.cost) {
                new obsidian.Notice("Insufficient gold for paid deletion!");
                return;
            }
            try {
                const content = yield this.app.vault.read(file);
                this.deletedQuestBuffer.push({
                    name: file.name,
                    content: content,
                    path: file.path,
                    deletedAt: Date.now()
                });
                if (this.deletedQuestBuffer.length > 5)
                    this.deletedQuestBuffer.shift();
                this.trigger("undo:show", file.basename);
            }
            catch (e) {
                console.error("Buffer fail", e);
            }
            yield this.app.vault.delete(file);
            if (costResult.message)
                new obsidian.Notice(costResult.message);
            this.save();
        });
    }
    undoLastDeletion() {
        return __awaiter(this, void 0, void 0, function* () {
            const last = this.deletedQuestBuffer.pop();
            if (!last) {
                new obsidian.Notice("Nothing to undo.");
                return;
            }
            if (Date.now() - last.deletedAt > 60000) {
                new obsidian.Notice("Too late to undo.");
                return;
            }
            try {
                yield this.app.vault.create(last.path, last.content);
                new obsidian.Notice(`Restored: ${last.name}`);
                setTimeout(() => {
                    this.trigger("update");
                }, 100);
            }
            catch (e) {
                new obsidian.Notice("Could not restore file (path may be taken).");
            }
        });
    }
    checkDeadlines() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const now = obsidian.moment();
            const initialCount = this.settings.activeBuffs.length;
            this.settings.activeBuffs = this.settings.activeBuffs.filter(b => obsidian.moment(b.expiresAt).isAfter(now));
            if (this.settings.activeBuffs.length < initialCount) {
                new obsidian.Notice("A potion effect has worn off.");
                this.trigger("update");
            }
            const folder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
            if (!(folder instanceof obsidian.TFolder))
                return;
            const zeroInbox = this.settings.dailyMissions.find(m => m.checkFunc === "zero_inbox" && !m.completed);
            if (zeroInbox) {
                const scraps = this.app.vault.getAbstractFileByPath("Scraps");
                if (scraps instanceof obsidian.TFolder && scraps.children.length === 0) {
                    this.checkDailyMissions({ type: "check" });
                }
            }
            for (const file of folder.children) {
                if (file instanceof obsidian.TFile) {
                    const fm = (_a = this.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
                    if ((fm === null || fm === void 0 ? void 0 : fm.deadline) && obsidian.moment().isAfter(obsidian.moment(fm.deadline)))
                        yield this.failQuest(file);
                }
            }
            this.save();
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
        });
    }
    isLockedDown() { return this.meditationEngine.isLockedDown(); }
    isResting() { return this.settings.restDayUntil && obsidian.moment().isBefore(obsidian.moment(this.settings.restDayUntil)); }
    isShielded() { return this.settings.shieldedUntil && obsidian.moment().isBefore(obsidian.moment(this.settings.shieldedUntil)); }
    createResearchQuest(title, type, linkedSkill, linkedCombatQuest) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.researchEngine.createResearchQuest(title, type, linkedSkill, linkedCombatQuest);
            if (res.success)
                new obsidian.Notice(res.message);
            else
                new obsidian.Notice(res.message);
            yield this.save();
        });
    }
    completeResearchQuest(id, words) { this.researchEngine.completeResearchQuest(id, words); this.save(); }
    deleteResearchQuest(id) { this.researchEngine.deleteResearchQuest(id); this.save(); }
    updateResearchWordCount(id, words) {
        this.researchEngine.updateResearchWordCount(id, words);
        this.trigger("update");
    }
    getResearchRatio() { return this.researchEngine.getResearchRatio(); }
    canCreateResearchQuest() { return this.researchEngine.canCreateResearchQuest(); }
    startMeditation() {
        return __awaiter(this, void 0, void 0, function* () { const r = this.meditationEngine.meditate(); new obsidian.Notice(r.message); yield this.save(); });
    }
    getMeditationStatus() { return this.meditationEngine.getMeditationStatus(); }
    createScrap(content) {
        return __awaiter(this, void 0, void 0, function* () {
            const folderPath = "Scraps";
            if (!this.app.vault.getAbstractFileByPath(folderPath))
                yield this.app.vault.createFolder(folderPath);
            const timestamp = obsidian.moment().format("YYYY-MM-DD HH-mm-ss");
            yield this.app.vault.create(`${folderPath}/${timestamp}.md`, content);
            new obsidian.Notice("⚡ Scrap Captured");
            this.audio.playSound("click");
        });
    }
    generateSkillGraph() {
        return __awaiter(this, void 0, void 0, function* () {
            const skills = this.settings.skills;
            if (skills.length === 0) {
                new obsidian.Notice("No neural nodes found.");
                return;
            }
            const nodes = [];
            const edges = [];
            const width = 250;
            const height = 140;
            const radius = Math.max(400, skills.length * 60);
            const centerX = 0;
            const centerY = 0;
            const angleStep = (2 * Math.PI) / skills.length;
            skills.forEach((skill, index) => {
                const angle = index * angleStep;
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);
                let color = "4";
                if (skill.rust > 0)
                    color = "1";
                else if (skill.level >= 10)
                    color = "6";
                const statusIcon = skill.rust > 0 ? "⚠️ RUSTY" : "🟢 ACTIVE";
                const progress = Math.floor((skill.xp / skill.xpReq) * 100);
                const text = `## ${skill.name}\n**Lv ${skill.level}**\n${statusIcon}\nXP: ${skill.xp}/${skill.xpReq} (${progress}%)`;
                nodes.push({ id: skill.name, x: Math.floor(x), y: Math.floor(y), width, height, type: "text", text, color });
            });
            skills.forEach(skill => {
                if (skill.connections) {
                    skill.connections.forEach(targetName => {
                        if (skills.find(s => s.name === targetName)) {
                            edges.push({ id: `${skill.name}-${targetName}`, fromNode: skill.name, fromSide: "right", toNode: targetName, toSide: "left", color: "4" });
                        }
                    });
                }
            });
            const canvasData = { nodes, edges };
            const path = "Active_Run/Neural_Hub.canvas";
            const file = this.app.vault.getAbstractFileByPath(path);
            if (file instanceof obsidian.TFile) {
                yield this.app.vault.modify(file, JSON.stringify(canvasData, null, 2));
                new obsidian.Notice("Neural Hub updated.");
            }
            else {
                yield this.app.vault.create(path, JSON.stringify(canvasData, null, 2));
                new obsidian.Notice("Neural Hub created.");
            }
        });
    }
    createQuestChain(name, quests) {
        return __awaiter(this, void 0, void 0, function* () { yield this.chainsEngine.createQuestChain(name, quests); yield this.save(); });
    }
    getActiveChain() { return this.chainsEngine.getActiveChain(); }
    getChainProgress() { return this.chainsEngine.getChainProgress(); }
    breakChain() {
        return __awaiter(this, void 0, void 0, function* () { yield this.chainsEngine.breakChain(); yield this.save(); });
    }
    setFilterState(energy, context, tags) { this.filtersEngine.setFilterState(energy, context, tags); this.save(); }
    clearFilters() { this.filtersEngine.clearFilters(); this.save(); }
    getGameStats() { return this.analyticsEngine.getGameStats(); }
    checkBossMilestones() { return this.analyticsEngine.checkBossMilestones(); }
    generateWeeklyReport() { return this.analyticsEngine.generateWeeklyReport(); }
    taunt(trigger) {
        const msgs = {
            "fail": ["Pathetic.", "Try again.", "Is that all?"],
            "level_up": ["Power overwhelming.", "Ascending."],
            "low_hp": ["Bleeding out...", "Hold on."]
        };
        const msg = msgs[trigger] ? msgs[trigger][Math.floor(Math.random() * msgs[trigger].length)] : "Observe.";
        new obsidian.Notice(`SYSTEM: ${msg}`);
    }
    parseQuickInput(text) {
        const match = text.match(/(.+?)\s*\/(\d)/);
        if (match) {
            this.createQuest(match[1], parseInt(match[2]), "None", "None", obsidian.moment().add(24, 'hours').toISOString(), false, "Normal", false);
        }
        else {
            this.createQuest(text, 3, "None", "None", obsidian.moment().add(24, 'hours').toISOString(), false, "Normal", false);
        }
    }
    triggerDeath() {
        return __awaiter(this, void 0, void 0, function* () {
            const activeFolder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
            const graveFolder = "Graveyard/Deaths/" + obsidian.moment().format("YYYY-MM-DD-HHmm");
            if (!this.app.vault.getAbstractFileByPath(graveFolder))
                yield this.app.vault.createFolder(graveFolder);
            if (activeFolder instanceof obsidian.TFolder) {
                for (const file of activeFolder.children) {
                    if (file instanceof obsidian.TFile) {
                        yield this.app.fileManager.renameFile(file, `${graveFolder}/${file.name}`);
                    }
                }
            }
            this.settings.level = 1;
            this.settings.hp = 100;
            this.settings.gold = 0;
            this.settings.legacy.deathCount = (this.settings.legacy.deathCount || 0) + 1;
            yield this.save();
        });
    }
}

class ChartRenderer {
    // [FIX] Added optional 'width' parameter
    static renderLineChart(parent, metrics, widthOverride) {
        const height = 100; // Matches CSS height
        const width = widthOverride || parent.clientWidth || 300;
        const padding = 5; // Reduced padding
        const data = [];
        const labels = [];
        for (let i = 6; i >= 0; i--) {
            const d = obsidian.moment().subtract(i, 'days').format("YYYY-MM-DD");
            const m = metrics.find(x => x.date === d);
            data.push(m ? m.questsCompleted : 0);
            labels.push(obsidian.moment(d).format("ddd"));
        }
        const maxVal = Math.max(...data, 5);
        const points = [];
        data.forEach((val, idx) => {
            const x = (idx / (data.length - 1)) * (width - padding * 2) + padding;
            const y = height - ((val / maxVal) * (height - padding * 2)) - padding;
            points.push(`${x},${y}`);
        });
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%"); // Fit container
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`); // Scale correctly
        svg.setAttribute("preserveAspectRatio", "none"); // Stretch to fit
        svg.classList.add("sisy-chart-svg");
        parent.appendChild(svg);
        const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        polyline.setAttribute("points", points.join(" "));
        polyline.setAttribute("fill", "none");
        polyline.setAttribute("stroke", "#00b0ff");
        polyline.setAttribute("stroke-width", "2");
        svg.appendChild(polyline);
        points.forEach((p, i) => {
            const [cx, cy] = p.split(",");
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", cx);
            circle.setAttribute("cy", cy);
            circle.setAttribute("r", "3");
            circle.setAttribute("fill", "#00b0ff");
            svg.appendChild(circle);
        });
    }
    static renderHeatmap(parent, metrics) {
        const heatmap = parent.createDiv({ cls: "sisy-heatmap" });
        for (let i = 27; i >= 0; i--) {
            const date = obsidian.moment().subtract(i, 'days').format("YYYY-MM-DD");
            const m = metrics.find(x => x.date === date);
            const count = m ? m.questsCompleted : 0;
            let color = "rgba(255,255,255,0.05)";
            if (count > 0)
                color = "rgba(0, 176, 255, 0.3)";
            if (count > 3)
                color = "rgba(0, 176, 255, 0.6)";
            if (count > 6)
                color = "rgba(0, 176, 255, 1.0)";
            const day = heatmap.createDiv({ cls: "sisy-heat-cell" });
            day.style.background = color;
            day.setAttribute("title", `${date}: ${count} quests`);
            if (i === 0)
                day.style.border = "1px solid white";
        }
    }
}

class QuestCardRenderer {
    static render(parent, file, view) {
        var _a;
        const fm = (_a = view.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
        const card = parent.createDiv({ cls: "sisy-card" });
        if (view.selectMode) {
            const isSelected = view.selectedQuests.has(file);
            if (isSelected)
                card.style.borderColor = "var(--sisy-blue)";
            const top = card.createDiv({ cls: "sisy-card-top" });
            const cb = top.createEl("input", { type: "checkbox" });
            cb.checked = isSelected;
            cb.style.marginRight = "10px";
            top.createDiv({ text: file.basename, cls: "sisy-card-title" });
            card.onclick = () => {
                if (view.selectedQuests.has(file))
                    view.selectedQuests.delete(file);
                else
                    view.selectedQuests.add(file);
                view.refresh();
            };
        }
        else {
            if (fm === null || fm === void 0 ? void 0 : fm.is_boss)
                card.addClass("sisy-card-boss");
            // === IMPROVED DRAG & DROP ===
            card.setAttribute("draggable", "true");
            card.addEventListener("dragstart", (e) => {
                var _a;
                view.draggedFile = file;
                card.style.opacity = "0.4";
                card.style.transform = "scale(0.95)";
                // Set data for compatibility
                (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.setData("text/plain", file.path);
            });
            card.addEventListener("dragend", () => {
                card.style.opacity = "1";
                card.style.transform = "none";
                view.draggedFile = null;
                // Remove visual guides from all cards
                parent.querySelectorAll(".sisy-card").forEach(el => el.style.borderTop = "");
            });
            card.addEventListener("dragover", (e) => {
                e.preventDefault();
                // Visual Cue: Blue line above card
                card.style.borderTop = "3px solid var(--sisy-blue)";
            });
            card.addEventListener("dragleave", () => {
                card.style.borderTop = "";
            });
            card.addEventListener("drop", (e) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                e.preventDefault();
                card.style.borderTop = "";
                if (view.draggedFile && view.draggedFile !== file) {
                    const dragged = view.draggedFile;
                    // Logic: Place 'dragged' BEFORE 'file'
                    const targetFm = (_a = view.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
                    // Get target order, default to "now" if missing
                    const targetOrder = (targetFm === null || targetFm === void 0 ? void 0 : targetFm.manual_order) !== undefined ? targetFm.manual_order : obsidian.moment().valueOf();
                    // New order is slightly less than target (puts it above)
                    const newOrder = targetOrder - 100; // Gap of 100 to prevent collisions
                    // Apply change
                    yield view.plugin.app.fileManager.processFrontMatter(dragged, (f) => {
                        f.manual_order = newOrder;
                    });
                    // [FIX] Force engine update to re-sort list immediately
                    view.plugin.engine.trigger("update");
                }
            }));
            // =============================
            const top = card.createDiv({ cls: "sisy-card-top" });
            const titleRow = top.createDiv({ cls: "sisy-card-meta" });
            titleRow.createDiv({ text: file.basename, cls: "sisy-card-title" });
            if (fm === null || fm === void 0 ? void 0 : fm.deadline) {
                const diff = obsidian.moment(fm.deadline).diff(obsidian.moment(), 'minutes');
                const t = top.createDiv({ text: diff < 0 ? "EXPIRED" : `${Math.floor(diff / 60)}h ${diff % 60}m`, cls: "sisy-timer" });
                if (diff < 60)
                    t.addClass("sisy-timer-late");
            }
            const trash = top.createDiv({ cls: "sisy-btn", text: "X", attr: { style: "padding: 2px 8px; font-size: 0.8em;" } });
            trash.onclick = (e) => { e.stopPropagation(); view.plugin.engine.deleteQuest(file); };
            if ((fm === null || fm === void 0 ? void 0 : fm.is_boss) && (fm === null || fm === void 0 ? void 0 : fm.boss_max_hp)) {
                const bar = card.createDiv({ cls: "sisy-bar-bg" });
                const pct = (fm.boss_hp / fm.boss_max_hp) * 100;
                bar.createDiv({ cls: "sisy-bar-fill sisy-fill-red", attr: { style: `width:${pct}%;` } });
                card.createDiv({ text: `${fm.boss_hp}/${fm.boss_max_hp} HP`, attr: { style: "text-align:center; font-size:0.8em; color:var(--sisy-red); font-weight:bold;" } });
            }
            const acts = card.createDiv({ cls: "sisy-actions" });
            const bOk = acts.createEl("button", { text: "COMPLETE", cls: "sisy-btn mod-done sisy-action-btn" });
            bOk.onclick = (e) => { e.stopPropagation(); view.plugin.engine.completeQuest(file); };
            const bFail = acts.createEl("button", { text: "FAIL", cls: "sisy-btn mod-fail sisy-action-btn" });
            bFail.onclick = (e) => { e.stopPropagation(); view.plugin.engine.failQuest(file, true); };
        }
    }
}

const VIEW_TYPE_PANOPTICON = "sisyphus-panopticon";
class PanopticonView extends obsidian.ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.draggedFile = null;
        this.selectMode = false;
        this.selectedQuests = new Set();
        this.observer = null;
        this.currentQuestList = [];
        this.renderedCount = 0;
        this.BATCH_SIZE = 20;
        this.debouncedRefresh = obsidian.debounce(this.refresh.bind(this), 50, true);
        this.plugin = plugin;
    }
    getViewType() { return VIEW_TYPE_PANOPTICON; }
    getDisplayText() { return "Eye Sisyphus"; }
    getIcon() { return "skull"; }
    onOpen() {
        return __awaiter(this, void 0, void 0, function* () {
            this.refresh();
            this.plugin.engine.on('update', this.debouncedRefresh);
            this.plugin.engine.on('undo:show', (name) => this.showUndoToast(name));
        });
    }
    onClose() {
        return __awaiter(this, void 0, void 0, function* () {
            this.plugin.engine.off('update', this.debouncedRefresh);
            this.plugin.engine.off('undo:show', this.showUndoToast.bind(this));
            if (this.observer)
                this.observer.disconnect();
        });
    }
    refresh() {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Capture State & Dimensions
            const scrollArea = this.contentEl.querySelector(".sisy-scroll-area");
            let lastScroll = 0;
            if (scrollArea)
                lastScroll = scrollArea.scrollTop;
            // [FIX] Measure width BEFORE wiping DOM so we can draw charts off-screen
            const currentWidth = this.contentEl.clientWidth || 300;
            const itemsToRestore = Math.max(this.renderedCount, this.BATCH_SIZE);
            const activeEl = document.activeElement;
            const isQuickInput = activeEl && activeEl.classList.contains("sisy-quick-input");
            let quickInputValue = "";
            if (isQuickInput)
                quickInputValue = activeEl.value;
            // 2. Clean & Prep
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
            this.prepareQuests();
            this.renderedCount = 0;
            // 3. Build Buffer
            const buffer = document.createDocumentFragment();
            const container = buffer.createDiv({ cls: "sisy-container" });
            const scroll = container.createDiv({ cls: "sisy-scroll-area" });
            scroll.style.scrollBehavior = "auto";
            // --- UI CONSTRUCTION ---
            const header = scroll.createDiv({ cls: "sisy-header" });
            header.createEl("h2", { text: "Eye SISYPHUS OS" });
            const soundBtn = header.createEl("span", { text: this.plugin.settings.muted ? "🔇" : "🔊", cls: "sisy-sound-btn" });
            soundBtn.onclick = () => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.muted = !this.plugin.settings.muted;
                this.plugin.audio.setMuted(this.plugin.settings.muted);
                yield this.plugin.saveSettings();
                this.debouncedRefresh();
            });
            this.renderAlerts(scroll);
            const hud = scroll.createDiv({ cls: "sisy-hud" });
            this.stat(hud, "HEALTH", `${this.plugin.settings.hp}/${this.plugin.settings.maxHp}`, this.plugin.settings.hp < 30 ? "sisy-critical" : "");
            this.stat(hud, "GOLD", `${this.plugin.settings.gold}`, this.plugin.settings.gold < 0 ? "sisy-val-debt" : "");
            this.stat(hud, "LEVEL", `${this.plugin.settings.level}`);
            this.stat(hud, "RIVAL DMG", `${this.plugin.settings.rivalDmg}`);
            this.renderOracle(scroll);
            scroll.createDiv({ text: "TODAYS OBJECTIVES", cls: "sisy-section-title" });
            this.renderDailyMissions(scroll);
            const ctrls = scroll.createDiv({ cls: "sisy-controls" });
            ctrls.createEl("button", { text: "DEPLOY", cls: "sisy-btn mod-cta" }).onclick = () => new QuestModal(this.app, this.plugin).open();
            ctrls.createEl("button", { text: "SHOP", cls: "sisy-btn" }).onclick = () => new ShopModal(this.app, this.plugin).open();
            ctrls.createEl("button", { text: "FOCUS", cls: "sisy-btn" }).onclick = () => this.plugin.audio.toggleBrownNoise();
            const selBtn = ctrls.createEl("button", {
                text: this.selectMode ? `CANCEL (${this.selectedQuests.size})` : "SELECT",
                cls: "sisy-btn"
            });
            if (this.selectMode)
                selBtn.addClass("sisy-filter-active");
            selBtn.onclick = () => {
                this.selectMode = !this.selectMode;
                this.selectedQuests.clear();
                this.refresh();
            };
            scroll.createDiv({ text: "FILTER CONTROLS", cls: "sisy-section-title" });
            this.renderFilterBar(scroll);
            if (this.plugin.engine.getActiveChain()) {
                scroll.createDiv({ text: "ACTIVE CHAIN", cls: "sisy-section-title" });
                this.renderChainSection(scroll);
            }
            scroll.createDiv({ text: "RESEARCH LIBRARY", cls: "sisy-section-title" });
            this.renderResearchSection(scroll);
            scroll.createDiv({ text: "ANALYTICS", cls: "sisy-section-title" });
            const analyticsContainer = scroll.createDiv({ cls: "sisy-analytics" });
            this.setupAnalyticsStructure(analyticsContainer);
            // [FIX] Render Charts NOW, into the buffer, using the captured width
            // This ensures they are fully drawn before the user sees them.
            this.renderAnalyticsCharts(analyticsContainer, currentWidth);
            scroll.createDiv({ text: "ACTIVE THREATS", cls: "sisy-section-title" });
            const questContainer = scroll.createDiv({ cls: "sisy-quest-container" });
            this.renderQuestBatch(questContainer, itemsToRestore);
            scroll.createDiv({ text: "NEURAL HUB", cls: "sisy-section-title" });
            this.renderSkills(scroll);
            const footer = container.createDiv({ cls: "sisy-quick-capture" });
            const input = footer.createEl("input", { cls: "sisy-quick-input", placeholder: "Mission /1...5" });
            if (isQuickInput)
                input.value = quickInputValue;
            input.onkeydown = (e) => __awaiter(this, void 0, void 0, function* () {
                if (e.key === 'Enter' && input.value.trim()) {
                    this.plugin.engine.parseQuickInput(input.value.trim());
                    input.value = "";
                }
            });
            this.renderBulkBar(container);
            // 4. THE SWAP
            this.contentEl.empty();
            this.contentEl.appendChild(buffer);
            // 5. RESTORE
            if (isQuickInput) {
                const newInput = this.contentEl.querySelector(".sisy-quick-input");
                if (newInput) {
                    newInput.focus();
                    const len = newInput.value.length;
                    newInput.setSelectionRange(len, len);
                }
            }
            if (lastScroll > 0) {
                const newScroll = this.contentEl.querySelector(".sisy-scroll-area");
                if (newScroll)
                    newScroll.scrollTop = lastScroll;
            }
        });
    }
    prepareQuests() {
        const folder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        this.currentQuestList = [];
        if (folder instanceof obsidian.TFolder) {
            let files = folder.children.filter(f => f instanceof obsidian.TFile);
            files = this.plugin.engine.filtersEngine.filterQuests(files);
            files.sort((a, b) => {
                var _a, _b;
                const fmA = (_a = this.app.metadataCache.getFileCache(a)) === null || _a === void 0 ? void 0 : _a.frontmatter;
                const fmB = (_b = this.app.metadataCache.getFileCache(b)) === null || _b === void 0 ? void 0 : _b.frontmatter;
                const orderA = (fmA === null || fmA === void 0 ? void 0 : fmA.manual_order) !== undefined ? fmA.manual_order : 9999999999999;
                const orderB = (fmB === null || fmB === void 0 ? void 0 : fmB.manual_order) !== undefined ? fmB.manual_order : 9999999999999;
                if (orderA !== orderB)
                    return orderA - orderB;
                if ((fmA === null || fmA === void 0 ? void 0 : fmA.is_boss) !== (fmB === null || fmB === void 0 ? void 0 : fmB.is_boss))
                    return ((fmB === null || fmB === void 0 ? void 0 : fmB.is_boss) ? 1 : 0) - ((fmA === null || fmA === void 0 ? void 0 : fmA.is_boss) ? 1 : 0);
                const dateA = (fmA === null || fmA === void 0 ? void 0 : fmA.deadline) ? obsidian.moment(fmA.deadline).valueOf() : 9999999999999;
                const dateB = (fmB === null || fmB === void 0 ? void 0 : fmB.deadline) ? obsidian.moment(fmB.deadline).valueOf() : 9999999999999;
                return dateA - dateB;
            });
            this.currentQuestList = files;
        }
    }
    renderQuestBatch(container, batchSize = this.BATCH_SIZE) {
        if (this.currentQuestList.length === 0) {
            const idle = container.createDiv({ text: "System Idle.", cls: "sisy-empty-state" });
            const ctaBtn = idle.createEl("button", { text: "[DEPLOY QUEST]", cls: "sisy-btn mod-cta" });
            ctaBtn.style.marginTop = "10px";
            ctaBtn.onclick = () => new QuestModal(this.app, this.plugin).open();
            return;
        }
        const nextBatch = this.currentQuestList.slice(this.renderedCount, this.renderedCount + batchSize);
        for (const file of nextBatch)
            QuestCardRenderer.render(container, file, this);
        this.renderedCount += nextBatch.length;
        if (this.renderedCount < this.currentQuestList.length) {
            const sentinel = container.createDiv({ cls: "sisy-sentinel" });
            this.observer = new IntersectionObserver((entries) => {
                var _a;
                if (entries[0].isIntersecting) {
                    (_a = this.observer) === null || _a === void 0 ? void 0 : _a.disconnect();
                    sentinel.remove();
                    this.renderQuestBatch(container, this.BATCH_SIZE);
                }
            }, { root: container.parentElement, threshold: 0.1 });
            this.observer.observe(sentinel);
        }
    }
    setupAnalyticsStructure(parent) {
        const stats = this.plugin.engine.getGameStats();
        const g = parent.createDiv({ cls: "sisy-hud" });
        this.stat(g, "Streak", String(stats.currentStreak));
        this.stat(g, "Today", String(this.plugin.settings.questsCompletedToday));
        parent.createEl("h4", { text: "Activity (7 Days)" });
        parent.createDiv({ cls: "sisy-chart-container-line" });
        parent.createEl("h4", { text: "Heatmap" });
        parent.createDiv({ cls: "sisy-chart-container-heat" });
    }
    // [FIX] Accept widthOverride to enable off-screen rendering
    renderAnalyticsCharts(parent, widthOverride) {
        const lineContainer = parent.querySelector(".sisy-chart-container-line");
        const heatContainer = parent.querySelector(".sisy-chart-container-heat");
        if (lineContainer) {
            lineContainer.empty();
            ChartRenderer.renderLineChart(lineContainer, this.plugin.settings.dayMetrics, widthOverride);
        }
        if (heatContainer) {
            heatContainer.empty();
            ChartRenderer.renderHeatmap(heatContainer, this.plugin.settings.dayMetrics);
        }
    }
    renderAlerts(scroll) {
        if (this.plugin.settings.activeBuffs.length > 0) {
            const buffBar = scroll.createDiv({ cls: "sisy-alert sisy-alert-buff" });
            buffBar.createEl("h3", { text: "ACTIVE EFFECTS", attr: { style: "color: var(--sisy-purple);" } });
            this.plugin.settings.activeBuffs.forEach(b => {
                const row = buffBar.createDiv({ cls: "sisy-alert-row" });
                row.createSpan({ text: `${b.icon} ${b.name}` });
                row.createSpan({ text: `${obsidian.moment(b.expiresAt).diff(obsidian.moment(), 'minutes')}m left`, cls: "sisy-alert-timer" });
            });
        }
        if (this.plugin.settings.gold < 0) {
            const d = scroll.createDiv({ cls: "sisy-alert sisy-alert-debt" });
            d.createEl("h3", { text: "⚠️ DEBT CRISIS" });
            d.createEl("p", { text: `Balance: ${this.plugin.settings.gold}g` });
        }
    }
    renderOracle(scroll) {
        const oracle = scroll.createDiv({ cls: "sisy-oracle" });
        oracle.createEl("h4", { text: "ORACLE PREDICTION" });
        const survival = Math.floor(this.plugin.settings.hp / Math.max(1, (this.plugin.settings.rivalDmg * (this.plugin.settings.gold < 0 ? 2 : 1))));
        const survEl = oracle.createDiv({ text: `Survival: ${survival} days`, cls: "sisy-prediction" });
        if (survival < 2)
            survEl.addClass("sisy-prediction-bad");
    }
    renderSkills(scroll) {
        this.plugin.settings.skills.forEach((s, idx) => {
            const row = scroll.createDiv({ cls: "sisy-skill-row" });
            row.onclick = () => new SkillDetailModal(this.app, this.plugin, idx).open();
            const meta = row.createDiv({ cls: "sisy-skill-meta" });
            meta.createSpan({ text: `${s.name} (Lvl ${s.level})` });
            if (s.rust > 0)
                meta.createSpan({ text: `RUST ${s.rust}`, cls: "sisy-text-rust" });
            const bar = row.createDiv({ cls: "sisy-bar-bg" });
            bar.createDiv({ cls: "sisy-bar-fill sisy-fill-blue", attr: { style: `width: ${(s.xp / s.xpReq) * 100}%;` } });
        });
        scroll.createDiv({ text: "+ Add Node", cls: "sisy-btn", attr: { style: "width:100%; margin-top:10px;" } }).onclick = () => new SkillManagerModal(this.app, this.plugin).open();
    }
    renderBulkBar(parent) {
        if (!this.selectMode || this.selectedQuests.size === 0)
            return;
        const bar = parent.createDiv({ cls: "sisy-bulk-bar" });
        bar.createSpan({ text: `${this.selectedQuests.size} Selected`, attr: { style: "align-self:center; font-weight:bold; color: white;" } });
        const btnC = bar.createEl("button", { text: "COMPLETE ALL", cls: "sisy-btn mod-done" });
        btnC.onclick = () => __awaiter(this, void 0, void 0, function* () { for (const f of this.selectedQuests)
            yield this.plugin.engine.completeQuest(f); this.selectedQuests.clear(); this.selectMode = false; this.debouncedRefresh(); });
        const btnD = bar.createEl("button", { text: "DELETE ALL", cls: "sisy-btn mod-fail" });
        btnD.onclick = () => __awaiter(this, void 0, void 0, function* () { for (const f of this.selectedQuests)
            yield this.plugin.engine.deleteQuest(f); this.selectedQuests.clear(); this.selectMode = false; this.debouncedRefresh(); });
    }
    renderDailyMissions(parent) {
        const missions = this.plugin.settings.dailyMissions || [];
        if (missions.length === 0) {
            parent.createDiv({ text: "No missions.", cls: "sisy-empty-state" });
            return;
        }
        const missionsDiv = parent.createDiv();
        missions.forEach((m) => {
            const card = missionsDiv.createDiv({ cls: "sisy-mission-card" });
            if (m.completed)
                card.addClass("sisy-mission-completed");
            const h = card.createDiv({ cls: "sisy-card-top" });
            h.createEl("span", { text: m.name, cls: "sisy-card-title" });
            h.createEl("span", { text: `${m.progress}/${m.target}`, attr: { style: "font-weight: bold;" } });
            card.createDiv({ text: m.desc, attr: { style: "font-size: 0.8em; opacity: 0.7; margin-bottom: 5px;" } });
            const bar = card.createDiv({ cls: "sisy-bar-bg" });
            bar.createDiv({ cls: "sisy-bar-fill sisy-fill-green", attr: { style: `width: ${(m.progress / m.target) * 100}%;` } });
        });
    }
    renderChainSection(parent) {
        const chain = this.plugin.engine.getActiveChain();
        const div = parent.createDiv({ cls: "sisy-chain-container" });
        div.createEl("h3", { text: chain.name, attr: { style: "color: var(--sisy-green);" } });
        const p = this.plugin.engine.getChainProgress();
        const b = div.createDiv({ cls: "sisy-bar-bg" });
        b.createDiv({ cls: "sisy-bar-fill sisy-fill-green", attr: { style: `width:${p.percent}%;` } });
        const list = div.createDiv({ attr: { style: "margin: 10px 0; font-size: 0.9em;" } });
        chain.quests.forEach((q, i) => list.createEl("p", { text: `[${i < p.completed ? "OK" : ".."}] ${q}`, attr: { style: i === p.completed ? "font-weight:bold" : "opacity:0.5" } }));
        div.createEl("button", { text: "BREAK CHAIN", cls: "sisy-btn mod-fail", attr: { style: "width:100%; margin-top:10px;" } }).onclick = () => __awaiter(this, void 0, void 0, function* () { yield this.plugin.engine.breakChain(); this.debouncedRefresh(); });
    }
    renderResearchSection(parent) {
        const research = this.plugin.settings.researchQuests || [];
        const active = research.filter(q => !q.completed);
        const stats = this.plugin.engine.getResearchRatio();
        const statsDiv = parent.createDiv({ cls: "sisy-research-stats sisy-card" });
        statsDiv.createEl("p", { text: `Research Ratio: ${stats.combat}:${stats.research}` });
        if (active.length === 0)
            parent.createDiv({ text: "No active research.", cls: "sisy-empty-state" });
        else
            active.forEach((q) => {
                const card = parent.createDiv({ cls: "sisy-research-card" });
                const h = card.createDiv({ cls: "sisy-card-top" });
                h.createEl("span", { text: q.title, cls: "sisy-card-title" });
                card.createEl("p", { text: `Words: ${q.wordCount}/${q.wordLimit}` });
                const bar = card.createDiv({ cls: "sisy-bar-bg" });
                bar.createDiv({ cls: "sisy-bar-fill sisy-fill-purple", attr: { style: `width:${Math.min(100, (q.wordCount / q.wordLimit) * 100)}%;` } });
                const acts = card.createDiv({ cls: "sisy-actions" });
                acts.createEl("button", { text: "COMPLETE", cls: "sisy-btn mod-done sisy-action-btn" }).onclick = () => { this.plugin.engine.completeResearchQuest(q.id, q.wordCount); this.debouncedRefresh(); };
                acts.createEl("button", { text: "DELETE", cls: "sisy-btn mod-fail sisy-action-btn" }).onclick = () => { this.plugin.engine.deleteResearchQuest(q.id); this.debouncedRefresh(); };
            });
    }
    renderFilterBar(parent) {
        const getFreshState = () => this.plugin.settings.filterState;
        const d = parent.createDiv({ cls: "sisy-filter-bar" });
        const addRow = (l, opts, curr, cb) => {
            const r = d.createDiv({ cls: "sisy-filter-row" });
            r.createSpan({ text: l, cls: "sisy-filter-label" });
            opts.forEach(o => {
                const btn = r.createEl("button", { text: o.toUpperCase(), cls: "sisy-filter-btn" });
                if (curr === o)
                    btn.addClass("sisy-filter-active");
                btn.onclick = () => cb(o);
            });
        };
        const f = getFreshState();
        addRow("Energy:", ["any", "high", "medium"], f.activeEnergy, (v) => {
            const s = getFreshState();
            const newVal = (s.activeEnergy === v && v !== "any") ? "any" : v;
            this.plugin.engine.setFilterState(newVal, s.activeContext, s.activeTags);
            this.debouncedRefresh();
        });
        addRow("Context:", ["any", "home", "office"], f.activeContext, (v) => {
            const s = getFreshState();
            const newVal = (s.activeContext === v && v !== "any") ? "any" : v;
            this.plugin.engine.setFilterState(s.activeEnergy, newVal, s.activeTags);
            this.debouncedRefresh();
        });
        d.createEl("button", { text: "CLEAR", cls: "sisy-btn mod-fail", attr: { style: "width:100%; margin-top:5px;" } }).onclick = () => { this.plugin.engine.clearFilters(); this.debouncedRefresh(); };
    }
    stat(p, label, val, cls = "") {
        const b = p.createDiv({ cls: "sisy-stat-box" });
        if (cls)
            b.addClass(cls);
        b.createDiv({ text: label, cls: "sisy-stat-label" });
        b.createDiv({ text: val, cls: "sisy-stat-val" });
    }
    showUndoToast(questName) {
        const toast = document.createElement("div");
        toast.setAttribute("style", "position:fixed; bottom:20px; right:20px; background:#1e1e1e; padding:12px 20px; border-radius:6px; z-index:9999; border:1px solid var(--sisy-blue); box-shadow: 0 5px 20px rgba(0,0,0,0.5); display:flex; align-items:center; gap:15px;");
        toast.innerHTML = `<span>Deleted: <strong>${questName}</strong></span>`;
        const btn = document.createElement("button");
        btn.innerText = "UNDO";
        btn.setAttribute("style", "cursor:pointer; color:var(--sisy-blue); background:none; border:none; font-weight:bold; letter-spacing:1px;");
        btn.onclick = () => __awaiter(this, void 0, void 0, function* () { yield this.plugin.engine.undoLastDeletion(); toast.remove(); });
        toast.appendChild(btn);
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 8000);
    }
}

class SisyphusSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl("h2", { text: "Sisyphus Engine Settings" });
        // --- GAMEPLAY SECTION ---
        containerEl.createEl("h3", { text: "Gameplay" });
        new obsidian.Setting(containerEl)
            .setName("Starting HP")
            .setDesc("Base HP for a new run (Default: 100)")
            .addText(text => text
            .setValue(String(this.plugin.settings.maxHp))
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            const num = parseInt(value);
            this.plugin.settings.maxHp = isNaN(num) ? 100 : num;
            yield this.plugin.saveSettings();
        })));
        new obsidian.Setting(containerEl)
            .setName("Difficulty Scaling (Rival Damage)")
            .setDesc("Starting damage punishment for failed quests (Default: 10)")
            .addText(text => text
            .setValue(String(this.plugin.settings.rivalDmg))
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            const num = parseInt(value);
            this.plugin.settings.rivalDmg = isNaN(num) ? 10 : num;
            yield this.plugin.saveSettings();
        })));
        // Inside display(), under Gameplay section...
        new obsidian.Setting(containerEl)
            .setName("Quest Templates")
            .setDesc("Create or delete quick-deploy templates.")
            .addButton(btn => btn
            .setButtonText("Manage Templates")
            .onClick(() => {
            new TemplateManagerModal(this.app, this.plugin).open();
        }));
        // --- AUDIO SECTION ---
        containerEl.createEl("h3", { text: "Audio" });
        new obsidian.Setting(containerEl)
            .setName("Mute All Sounds")
            .setDesc("Disable sound effects and ambient noise")
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.muted)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.muted = value;
            this.plugin.audio.setMuted(value);
            yield this.plugin.saveSettings();
        })));
        // --- DATA MANAGEMENT SECTION ---
        containerEl.createEl("h3", { text: "Data Management" });
        new obsidian.Setting(containerEl)
            .setName("Export Full Data")
            .setDesc("Download all settings, history, and stats as a JSON file.")
            .addButton(btn => btn
            .setButtonText("Export Backup")
            .onClick(() => __awaiter(this, void 0, void 0, function* () {
            const json = JSON.stringify(this.plugin.settings, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sisyphus_backup_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            new obsidian.Notice("Backup downloaded.");
        })));
        new obsidian.Setting(containerEl)
            .setName("Import Data")
            .setDesc("Restore from backup file. ⚠️ WARNING: Overwrites current progress!")
            .addButton(btn => btn
            .setButtonText("Import Backup")
            .setWarning()
            .onClick(() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => __awaiter(this, void 0, void 0, function* () {
                const file = e.target.files[0];
                if (!file)
                    return;
                try {
                    const text = yield file.text();
                    const data = JSON.parse(text);
                    // Basic validation check
                    if (!data.hp || !data.skills) {
                        new obsidian.Notice("Invalid backup file.");
                        return;
                    }
                    this.plugin.settings = data;
                    yield this.plugin.saveSettings();
                    // Force engine to reload state
                    this.plugin.engine.trigger("update");
                    new obsidian.Notice("Data imported successfully!");
                }
                catch (err) {
                    new obsidian.Notice("Error importing data.");
                    console.error(err);
                }
            });
            input.click();
        }));
    }
}

const DEFAULT_SETTINGS = {
    // [NEW] Default Templates
    questTemplates: [
        { name: "Morning Routine", diff: 1, skill: "Discipline", deadline: "10:00" },
        { name: "Deep Work Block", diff: 3, skill: "Focus", deadline: "+2h" },
        { name: "Quick Exercise", diff: 2, skill: "Health", deadline: "+12h" }
    ], // Comma here, NO closing brace yet!
    // [NEW] Defaults
    comboCount: 0,
    lastCompletionTime: 0,
    // [NEW]
    activeBuffs: [],
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
            // --- EVENT LISTENER: FILE RENAME ---
            this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
                // We only care about Markdown files, and we need the basename
                if (file instanceof obsidian.TFile && file.extension === 'md') {
                    const newName = file.basename;
                    // Extract old basename from the old path
                    // oldPath looks like "Active_Run/Quests/OldName.md"
                    const pathParts = oldPath.split('/');
                    const oldFileName = pathParts[pathParts.length - 1];
                    const oldName = oldFileName.replace(/\.md$/, ''); // Remove extension
                    if (oldName !== newName) {
                        // Propagate rename to engines
                        this.engine.chainsEngine.handleRename(oldName, newName);
                        this.engine.filtersEngine.handleRename(oldName, newName);
                        // Force save to persist changes
                        this.engine.save();
                    }
                }
            }));
            this.addCommand({
                id: 'quest-templates',
                name: 'Deploy Quest from Template',
                callback: () => new QuestTemplateModal(this.app, this).open()
            });
            this.addCommand({
                id: 'deploy-quest-hotkey',
                name: 'Deploy Quest',
                hotkeys: [{ modifiers: ["Mod"], key: "d" }],
                callback: () => new ResearchQuestModal(this.app, this).open() // Assuming default is Research or Quest Modal?
                // Actually, we should map this to QuestModal, but you didn't export QuestModal in modals.ts properly in the snippet. 
                // Assuming QuestModal is available or we use ResearchQuestModal. 
                // Reverting to ResearchQuestModal as per your import list, 
                // OR if you have QuestModal imported, use that.
                // Let's assume you want the standard Quest creation:
                // callback: () => new QuestModal(this.app, this).open()
            });
            this.addCommand({
                id: 'undo-quest-delete',
                name: 'Undo Last Quest Deletion',
                hotkeys: [{ modifiers: ["Mod", "Shift"], key: "z" }],
                callback: () => this.engine.undoLastDeletion()
            });
            this.addCommand({
                id: 'export-stats',
                name: 'Analytics: Export Stats JSON',
                callback: () => __awaiter(this, void 0, void 0, function* () {
                    const stats = this.engine.getGameStats();
                    const path = `Sisyphus_Stats_${Date.now()}.json`;
                    yield this.app.vault.create(path, JSON.stringify(stats, null, 2));
                    new obsidian.Notice(`Stats exported to ${path}`);
                })
            });
            this.addCommand({
                id: 'accept-death',
                name: 'ACCEPT DEATH (Reset Run)',
                callback: () => this.engine.triggerDeath()
            });
            this.addCommand({
                id: 'reroll-chaos',
                name: 'Reroll Chaos',
                callback: () => this.engine.rollChaos(true)
            });
            this.addCommand({
                id: 'quick-capture',
                name: 'Quick Capture (Scrap)',
                callback: () => new QuickCaptureModal(this.app, this).open()
            });
            this.addCommand({
                id: 'generate-skill-graph',
                name: 'Neural Hub: Generate Skill Graph',
                callback: () => this.engine.generateSkillGraph()
            });
            yield this.loadSettings();
            this.loadStyles();
            this.audio = new AudioController(this.settings.muted);
            this.engine = new SisyphusEngine(this.app, this, this.audio);
            this.registerView(VIEW_TYPE_PANOPTICON, (leaf) => new PanopticonView(leaf, this));
            this.statusBarItem = this.addStatusBarItem();
            window.sisyphusEngine = this.engine;
            yield this.engine.checkDailyLogin();
            this.updateStatusBar();
            // --- COMMANDS ---
            this.addCommand({ id: 'open-panopticon', name: 'Open Panopticon', callback: () => this.activateView() });
            this.addCommand({ id: 'toggle-focus', name: 'Toggle Focus Audio', callback: () => this.audio.toggleBrownNoise() });
            this.addCommand({ id: 'create-research', name: 'Research: Create Quest', callback: () => new ResearchQuestModal(this.app, this).open() });
            this.addCommand({ id: 'view-research', name: 'Research: View Library', callback: () => new ResearchListModal(this.app, this).open() });
            this.addCommand({ id: 'meditate', name: 'Meditation: Start', callback: () => this.engine.startMeditation() });
            this.addCommand({ id: 'create-chain', name: 'Chains: Create', callback: () => new ChainBuilderModal(this.app, this).open() });
            this.addCommand({ id: 'view-chains', name: 'Chains: View Active', callback: () => { const c = this.engine.getActiveChain(); new obsidian.Notice(c ? `Active: ${c.name}` : "No active chain"); } });
            this.addCommand({ id: 'filter-high', name: 'Filters: High Energy', callback: () => this.engine.setFilterState("high", "any", []) });
            this.addCommand({ id: 'clear-filters', name: 'Filters: Clear', callback: () => this.engine.clearFilters() });
            this.addCommand({ id: 'game-stats', name: 'Analytics: Stats', callback: () => { const s = this.engine.getGameStats(); new obsidian.Notice(`Lvl ${s.level} | Streak ${s.currentStreak}`); } });
            this.addRibbonIcon('skull', 'Sisyphus Sidebar', () => this.activateView());
            // ... previous code ...
            // --- SETTINGS TAB ---
            this.addSettingTab(new SisyphusSettingTab(this.app, this));
            this.addRibbonIcon('skull', 'Sisyphus Sidebar', () => this.activateView());
            this.registerInterval(window.setInterval(() => this.engine.checkDeadlines(), 60000));
            // [FIX] Debounced Word Counter (Typewriter Fix)
            const debouncedUpdate = obsidian.debounce((file, content) => {
                var _a;
                // 1. Check if file still exists to prevent race condition errors
                if (!file || !file.path)
                    return;
                const exists = this.app.vault.getAbstractFileByPath(file.path);
                if (!exists)
                    return;
                const cache = this.app.metadataCache.getFileCache(file);
                if ((_a = cache === null || cache === void 0 ? void 0 : cache.frontmatter) === null || _a === void 0 ? void 0 : _a.research_id) {
                    const words = content.trim().split(/\s+/).length;
                    this.engine.updateResearchWordCount(cache.frontmatter.research_id, words);
                }
            }, 1000, true);
            // Register the event listener to actually USE the debounce function
            this.registerEvent(this.app.workspace.on('editor-change', (editor, info) => {
                if (info && info.file) {
                    debouncedUpdate(info.file, editor.getValue());
                }
            }));
        });
    } // <--- THIS BRACE WAS MISSING
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
            if (leaves.length > 0)
                leaf = leaves[0];
            else {
                leaf = workspace.getRightLeaf(false);
                yield leaf.setViewState({ type: VIEW_TYPE_PANOPTICON, active: true });
            }
            workspace.revealLeaf(leaf);
        });
    }
    updateStatusBar() {
        const shield = (this.engine.isShielded() || this.engine.isResting()) ? (this.engine.isResting() ? "D" : "S") : "";
        const mCount = this.settings.dailyMissions.filter(m => m.completed).length;
        // [NEW] Combo Indicator
        // If combo > 1, show fire icon. Otherwise show nothing.
        this.settings.comboCount > 1 ? ` 🔥x${this.settings.comboCount}` : "";
        this.statusBarItem.setText(`${this.settings.dailyModifier.icon} ${shield} HP${this.settings.hp} G${this.settings.gold} M${mCount}/3`);
        this.statusBarItem.style.color = this.settings.hp < 30 ? "red" : this.settings.gold < 0 ? "orange" : "";
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () { this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData()); });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () { yield this.saveData(this.settings); });
    }
}

module.exports = SisyphusPlugin;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInNyYy91dGlscy50cyIsInNyYy91aS9tb2RhbHMudHMiLCJzcmMvYWNoaWV2ZW1lbnRzLnRzIiwic3JjL2VuZ2luZXMvQW5hbHl0aWNzRW5naW5lLnRzIiwic3JjL2VuZ2luZXMvTWVkaXRhdGlvbkVuZ2luZS50cyIsInNyYy9lbmdpbmVzL1Jlc2VhcmNoRW5naW5lLnRzIiwic3JjL2VuZ2luZXMvQ2hhaW5zRW5naW5lLnRzIiwic3JjL2VuZ2luZXMvRmlsdGVyc0VuZ2luZS50cyIsInNyYy9lbmdpbmUudHMiLCJzcmMvdWkvY2hhcnRzLnRzIiwic3JjL3VpL2NhcmQudHMiLCJzcmMvdWkvdmlldy50cyIsInNyYy9zZXR0aW5ncy50cyIsInNyYy9tYWluLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcclxuQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uXHJcblxyXG5QZXJtaXNzaW9uIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBhbmQvb3IgZGlzdHJpYnV0ZSB0aGlzIHNvZnR3YXJlIGZvciBhbnlcclxucHVycG9zZSB3aXRoIG9yIHdpdGhvdXQgZmVlIGlzIGhlcmVieSBncmFudGVkLlxyXG5cclxuVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiBBTkQgVEhFIEFVVEhPUiBESVNDTEFJTVMgQUxMIFdBUlJBTlRJRVMgV0lUSFxyXG5SRUdBUkQgVE8gVEhJUyBTT0ZUV0FSRSBJTkNMVURJTkcgQUxMIElNUExJRUQgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFlcclxuQU5EIEZJVE5FU1MuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1IgQkUgTElBQkxFIEZPUiBBTlkgU1BFQ0lBTCwgRElSRUNULFxyXG5JTkRJUkVDVCwgT1IgQ09OU0VRVUVOVElBTCBEQU1BR0VTIE9SIEFOWSBEQU1BR0VTIFdIQVRTT0VWRVIgUkVTVUxUSU5HIEZST01cclxuTE9TUyBPRiBVU0UsIERBVEEgT1IgUFJPRklUUywgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIE5FR0xJR0VOQ0UgT1JcclxuT1RIRVIgVE9SVElPVVMgQUNUSU9OLCBBUklTSU5HIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFVTRSBPUlxyXG5QRVJGT1JNQU5DRSBPRiBUSElTIFNPRlRXQVJFLlxyXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiAqL1xyXG4vKiBnbG9iYWwgUmVmbGVjdCwgUHJvbWlzZSwgU3VwcHJlc3NlZEVycm9yLCBTeW1ib2wsIEl0ZXJhdG9yICovXHJcblxyXG52YXIgZXh0ZW5kU3RhdGljcyA9IGZ1bmN0aW9uKGQsIGIpIHtcclxuICAgIGV4dGVuZFN0YXRpY3MgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHxcclxuICAgICAgICAoeyBfX3Byb3RvX186IFtdIH0gaW5zdGFuY2VvZiBBcnJheSAmJiBmdW5jdGlvbiAoZCwgYikgeyBkLl9fcHJvdG9fXyA9IGI7IH0pIHx8XHJcbiAgICAgICAgZnVuY3Rpb24gKGQsIGIpIHsgZm9yICh2YXIgcCBpbiBiKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGIsIHApKSBkW3BdID0gYltwXTsgfTtcclxuICAgIHJldHVybiBleHRlbmRTdGF0aWNzKGQsIGIpO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXh0ZW5kcyhkLCBiKSB7XHJcbiAgICBpZiAodHlwZW9mIGIgIT09IFwiZnVuY3Rpb25cIiAmJiBiICE9PSBudWxsKVxyXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDbGFzcyBleHRlbmRzIHZhbHVlIFwiICsgU3RyaW5nKGIpICsgXCIgaXMgbm90IGEgY29uc3RydWN0b3Igb3IgbnVsbFwiKTtcclxuICAgIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cclxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcclxufVxyXG5cclxuZXhwb3J0IHZhciBfX2Fzc2lnbiA9IGZ1bmN0aW9uKCkge1xyXG4gICAgX19hc3NpZ24gPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uIF9fYXNzaWduKHQpIHtcclxuICAgICAgICBmb3IgKHZhciBzLCBpID0gMSwgbiA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBuOyBpKyspIHtcclxuICAgICAgICAgICAgcyA9IGFyZ3VtZW50c1tpXTtcclxuICAgICAgICAgICAgZm9yICh2YXIgcCBpbiBzKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHMsIHApKSB0W3BdID0gc1twXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHQ7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gX19hc3NpZ24uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVzdChzLCBlKSB7XHJcbiAgICB2YXIgdCA9IHt9O1xyXG4gICAgZm9yICh2YXIgcCBpbiBzKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHMsIHApICYmIGUuaW5kZXhPZihwKSA8IDApXHJcbiAgICAgICAgdFtwXSA9IHNbcF07XHJcbiAgICBpZiAocyAhPSBudWxsICYmIHR5cGVvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzID09PSBcImZ1bmN0aW9uXCIpXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIHAgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKHMpOyBpIDwgcC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoZS5pbmRleE9mKHBbaV0pIDwgMCAmJiBPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlLmNhbGwocywgcFtpXSkpXHJcbiAgICAgICAgICAgICAgICB0W3BbaV1dID0gc1twW2ldXTtcclxuICAgICAgICB9XHJcbiAgICByZXR1cm4gdDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcclxuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xyXG4gICAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcclxuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3BhcmFtKHBhcmFtSW5kZXgsIGRlY29yYXRvcikge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIGtleSkgeyBkZWNvcmF0b3IodGFyZ2V0LCBrZXksIHBhcmFtSW5kZXgpOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2VzRGVjb3JhdGUoY3RvciwgZGVzY3JpcHRvckluLCBkZWNvcmF0b3JzLCBjb250ZXh0SW4sIGluaXRpYWxpemVycywgZXh0cmFJbml0aWFsaXplcnMpIHtcclxuICAgIGZ1bmN0aW9uIGFjY2VwdChmKSB7IGlmIChmICE9PSB2b2lkIDAgJiYgdHlwZW9mIGYgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZ1bmN0aW9uIGV4cGVjdGVkXCIpOyByZXR1cm4gZjsgfVxyXG4gICAgdmFyIGtpbmQgPSBjb250ZXh0SW4ua2luZCwga2V5ID0ga2luZCA9PT0gXCJnZXR0ZXJcIiA/IFwiZ2V0XCIgOiBraW5kID09PSBcInNldHRlclwiID8gXCJzZXRcIiA6IFwidmFsdWVcIjtcclxuICAgIHZhciB0YXJnZXQgPSAhZGVzY3JpcHRvckluICYmIGN0b3IgPyBjb250ZXh0SW5bXCJzdGF0aWNcIl0gPyBjdG9yIDogY3Rvci5wcm90b3R5cGUgOiBudWxsO1xyXG4gICAgdmFyIGRlc2NyaXB0b3IgPSBkZXNjcmlwdG9ySW4gfHwgKHRhcmdldCA/IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBjb250ZXh0SW4ubmFtZSkgOiB7fSk7XHJcbiAgICB2YXIgXywgZG9uZSA9IGZhbHNlO1xyXG4gICAgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgICAgICB2YXIgY29udGV4dCA9IHt9O1xyXG4gICAgICAgIGZvciAodmFyIHAgaW4gY29udGV4dEluKSBjb250ZXh0W3BdID0gcCA9PT0gXCJhY2Nlc3NcIiA/IHt9IDogY29udGV4dEluW3BdO1xyXG4gICAgICAgIGZvciAodmFyIHAgaW4gY29udGV4dEluLmFjY2VzcykgY29udGV4dC5hY2Nlc3NbcF0gPSBjb250ZXh0SW4uYWNjZXNzW3BdO1xyXG4gICAgICAgIGNvbnRleHQuYWRkSW5pdGlhbGl6ZXIgPSBmdW5jdGlvbiAoZikgeyBpZiAoZG9uZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBhZGQgaW5pdGlhbGl6ZXJzIGFmdGVyIGRlY29yYXRpb24gaGFzIGNvbXBsZXRlZFwiKTsgZXh0cmFJbml0aWFsaXplcnMucHVzaChhY2NlcHQoZiB8fCBudWxsKSk7IH07XHJcbiAgICAgICAgdmFyIHJlc3VsdCA9ICgwLCBkZWNvcmF0b3JzW2ldKShraW5kID09PSBcImFjY2Vzc29yXCIgPyB7IGdldDogZGVzY3JpcHRvci5nZXQsIHNldDogZGVzY3JpcHRvci5zZXQgfSA6IGRlc2NyaXB0b3Jba2V5XSwgY29udGV4dCk7XHJcbiAgICAgICAgaWYgKGtpbmQgPT09IFwiYWNjZXNzb3JcIikge1xyXG4gICAgICAgICAgICBpZiAocmVzdWx0ID09PSB2b2lkIDApIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBpZiAocmVzdWx0ID09PSBudWxsIHx8IHR5cGVvZiByZXN1bHQgIT09IFwib2JqZWN0XCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJPYmplY3QgZXhwZWN0ZWRcIik7XHJcbiAgICAgICAgICAgIGlmIChfID0gYWNjZXB0KHJlc3VsdC5nZXQpKSBkZXNjcmlwdG9yLmdldCA9IF87XHJcbiAgICAgICAgICAgIGlmIChfID0gYWNjZXB0KHJlc3VsdC5zZXQpKSBkZXNjcmlwdG9yLnNldCA9IF87XHJcbiAgICAgICAgICAgIGlmIChfID0gYWNjZXB0KHJlc3VsdC5pbml0KSkgaW5pdGlhbGl6ZXJzLnVuc2hpZnQoXyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKF8gPSBhY2NlcHQocmVzdWx0KSkge1xyXG4gICAgICAgICAgICBpZiAoa2luZCA9PT0gXCJmaWVsZFwiKSBpbml0aWFsaXplcnMudW5zaGlmdChfKTtcclxuICAgICAgICAgICAgZWxzZSBkZXNjcmlwdG9yW2tleV0gPSBfO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICh0YXJnZXQpIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGNvbnRleHRJbi5uYW1lLCBkZXNjcmlwdG9yKTtcclxuICAgIGRvbmUgPSB0cnVlO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcnVuSW5pdGlhbGl6ZXJzKHRoaXNBcmcsIGluaXRpYWxpemVycywgdmFsdWUpIHtcclxuICAgIHZhciB1c2VWYWx1ZSA9IGFyZ3VtZW50cy5sZW5ndGggPiAyO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbml0aWFsaXplcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YWx1ZSA9IHVzZVZhbHVlID8gaW5pdGlhbGl6ZXJzW2ldLmNhbGwodGhpc0FyZywgdmFsdWUpIDogaW5pdGlhbGl6ZXJzW2ldLmNhbGwodGhpc0FyZyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdXNlVmFsdWUgPyB2YWx1ZSA6IHZvaWQgMDtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3Byb3BLZXkoeCkge1xyXG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSBcInN5bWJvbFwiID8geCA6IFwiXCIuY29uY2F0KHgpO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc2V0RnVuY3Rpb25OYW1lKGYsIG5hbWUsIHByZWZpeCkge1xyXG4gICAgaWYgKHR5cGVvZiBuYW1lID09PSBcInN5bWJvbFwiKSBuYW1lID0gbmFtZS5kZXNjcmlwdGlvbiA/IFwiW1wiLmNvbmNhdChuYW1lLmRlc2NyaXB0aW9uLCBcIl1cIikgOiBcIlwiO1xyXG4gICAgcmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShmLCBcIm5hbWVcIiwgeyBjb25maWd1cmFibGU6IHRydWUsIHZhbHVlOiBwcmVmaXggPyBcIlwiLmNvbmNhdChwcmVmaXgsIFwiIFwiLCBuYW1lKSA6IG5hbWUgfSk7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSkge1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0Lm1ldGFkYXRhID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiBSZWZsZWN0Lm1ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXRlcih0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcclxuICAgIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxyXG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XHJcbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2dlbmVyYXRvcih0aGlzQXJnLCBib2R5KSB7XHJcbiAgICB2YXIgXyA9IHsgbGFiZWw6IDAsIHNlbnQ6IGZ1bmN0aW9uKCkgeyBpZiAodFswXSAmIDEpIHRocm93IHRbMV07IHJldHVybiB0WzFdOyB9LCB0cnlzOiBbXSwgb3BzOiBbXSB9LCBmLCB5LCB0LCBnID0gT2JqZWN0LmNyZWF0ZSgodHlwZW9mIEl0ZXJhdG9yID09PSBcImZ1bmN0aW9uXCIgPyBJdGVyYXRvciA6IE9iamVjdCkucHJvdG90eXBlKTtcclxuICAgIHJldHVybiBnLm5leHQgPSB2ZXJiKDApLCBnW1widGhyb3dcIl0gPSB2ZXJiKDEpLCBnW1wicmV0dXJuXCJdID0gdmVyYigyKSwgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIChnW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0pLCBnO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKG9wKSB7XHJcbiAgICAgICAgaWYgKGYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO1xyXG4gICAgICAgIHdoaWxlIChnICYmIChnID0gMCwgb3BbMF0gJiYgKF8gPSAwKSksIF8pIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChmID0gMSwgeSAmJiAodCA9IG9wWzBdICYgMiA/IHlbXCJyZXR1cm5cIl0gOiBvcFswXSA/IHlbXCJ0aHJvd1wiXSB8fCAoKHQgPSB5W1wicmV0dXJuXCJdKSAmJiB0LmNhbGwoeSksIDApIDogeS5uZXh0KSAmJiAhKHQgPSB0LmNhbGwoeSwgb3BbMV0pKS5kb25lKSByZXR1cm4gdDtcclxuICAgICAgICAgICAgaWYgKHkgPSAwLCB0KSBvcCA9IFtvcFswXSAmIDIsIHQudmFsdWVdO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKG9wWzBdKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDA6IGNhc2UgMTogdCA9IG9wOyBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNDogXy5sYWJlbCsrOyByZXR1cm4geyB2YWx1ZTogb3BbMV0sIGRvbmU6IGZhbHNlIH07XHJcbiAgICAgICAgICAgICAgICBjYXNlIDU6IF8ubGFiZWwrKzsgeSA9IG9wWzFdOyBvcCA9IFswXTsgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDc6IG9wID0gXy5vcHMucG9wKCk7IF8udHJ5cy5wb3AoKTsgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghKHQgPSBfLnRyeXMsIHQgPSB0Lmxlbmd0aCA+IDAgJiYgdFt0Lmxlbmd0aCAtIDFdKSAmJiAob3BbMF0gPT09IDYgfHwgb3BbMF0gPT09IDIpKSB7IF8gPSAwOyBjb250aW51ZTsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gMyAmJiAoIXQgfHwgKG9wWzFdID4gdFswXSAmJiBvcFsxXSA8IHRbM10pKSkgeyBfLmxhYmVsID0gb3BbMV07IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSA2ICYmIF8ubGFiZWwgPCB0WzFdKSB7IF8ubGFiZWwgPSB0WzFdOyB0ID0gb3A7IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHQgJiYgXy5sYWJlbCA8IHRbMl0pIHsgXy5sYWJlbCA9IHRbMl07IF8ub3BzLnB1c2gob3ApOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0WzJdKSBfLm9wcy5wb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG9wID0gYm9keS5jYWxsKHRoaXNBcmcsIF8pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHsgb3AgPSBbNiwgZV07IHkgPSAwOyB9IGZpbmFsbHkgeyBmID0gdCA9IDA7IH1cclxuICAgICAgICBpZiAob3BbMF0gJiA1KSB0aHJvdyBvcFsxXTsgcmV0dXJuIHsgdmFsdWU6IG9wWzBdID8gb3BbMV0gOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IHZhciBfX2NyZWF0ZUJpbmRpbmcgPSBPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XHJcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xyXG4gICAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG0sIGspO1xyXG4gICAgaWYgKCFkZXNjIHx8IChcImdldFwiIGluIGRlc2MgPyAhbS5fX2VzTW9kdWxlIDogZGVzYy53cml0YWJsZSB8fCBkZXNjLmNvbmZpZ3VyYWJsZSkpIHtcclxuICAgICAgICBkZXNjID0geyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9O1xyXG4gICAgfVxyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIGsyLCBkZXNjKTtcclxufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICBvW2syXSA9IG1ba107XHJcbn0pO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXhwb3J0U3RhcihtLCBvKSB7XHJcbiAgICBmb3IgKHZhciBwIGluIG0pIGlmIChwICE9PSBcImRlZmF1bHRcIiAmJiAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIHApKSBfX2NyZWF0ZUJpbmRpbmcobywgbSwgcCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3ZhbHVlcyhvKSB7XHJcbiAgICB2YXIgcyA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBTeW1ib2wuaXRlcmF0b3IsIG0gPSBzICYmIG9bc10sIGkgPSAwO1xyXG4gICAgaWYgKG0pIHJldHVybiBtLmNhbGwobyk7XHJcbiAgICBpZiAobyAmJiB0eXBlb2Ygby5sZW5ndGggPT09IFwibnVtYmVyXCIpIHJldHVybiB7XHJcbiAgICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAobyAmJiBpID49IG8ubGVuZ3RoKSBvID0gdm9pZCAwO1xyXG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogbyAmJiBvW2krK10sIGRvbmU6ICFvIH07XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IocyA/IFwiT2JqZWN0IGlzIG5vdCBpdGVyYWJsZS5cIiA6IFwiU3ltYm9sLml0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVhZChvLCBuKSB7XHJcbiAgICB2YXIgbSA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvW1N5bWJvbC5pdGVyYXRvcl07XHJcbiAgICBpZiAoIW0pIHJldHVybiBvO1xyXG4gICAgdmFyIGkgPSBtLmNhbGwobyksIHIsIGFyID0gW10sIGU7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHdoaWxlICgobiA9PT0gdm9pZCAwIHx8IG4tLSA+IDApICYmICEociA9IGkubmV4dCgpKS5kb25lKSBhci5wdXNoKHIudmFsdWUpO1xyXG4gICAgfVxyXG4gICAgY2F0Y2ggKGVycm9yKSB7IGUgPSB7IGVycm9yOiBlcnJvciB9OyB9XHJcbiAgICBmaW5hbGx5IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAociAmJiAhci5kb25lICYmIChtID0gaVtcInJldHVyblwiXSkpIG0uY2FsbChpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZmluYWxseSB7IGlmIChlKSB0aHJvdyBlLmVycm9yOyB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbi8qKiBAZGVwcmVjYXRlZCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWQoKSB7XHJcbiAgICBmb3IgKHZhciBhciA9IFtdLCBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKylcclxuICAgICAgICBhciA9IGFyLmNvbmNhdChfX3JlYWQoYXJndW1lbnRzW2ldKSk7XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbi8qKiBAZGVwcmVjYXRlZCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheXMoKSB7XHJcbiAgICBmb3IgKHZhciBzID0gMCwgaSA9IDAsIGlsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHMgKz0gYXJndW1lbnRzW2ldLmxlbmd0aDtcclxuICAgIGZvciAodmFyIHIgPSBBcnJheShzKSwgayA9IDAsIGkgPSAwOyBpIDwgaWw7IGkrKylcclxuICAgICAgICBmb3IgKHZhciBhID0gYXJndW1lbnRzW2ldLCBqID0gMCwgamwgPSBhLmxlbmd0aDsgaiA8IGpsOyBqKyssIGsrKylcclxuICAgICAgICAgICAgcltrXSA9IGFbal07XHJcbiAgICByZXR1cm4gcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkQXJyYXkodG8sIGZyb20sIHBhY2spIHtcclxuICAgIGlmIChwYWNrIHx8IGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIGZvciAodmFyIGkgPSAwLCBsID0gZnJvbS5sZW5ndGgsIGFyOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKGFyIHx8ICEoaSBpbiBmcm9tKSkge1xyXG4gICAgICAgICAgICBpZiAoIWFyKSBhciA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZyb20sIDAsIGkpO1xyXG4gICAgICAgICAgICBhcltpXSA9IGZyb21baV07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRvLmNvbmNhdChhciB8fCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChmcm9tKSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0KHYpIHtcclxuICAgIHJldHVybiB0aGlzIGluc3RhbmNlb2YgX19hd2FpdCA/ICh0aGlzLnYgPSB2LCB0aGlzKSA6IG5ldyBfX2F3YWl0KHYpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY0dlbmVyYXRvcih0aGlzQXJnLCBfYXJndW1lbnRzLCBnZW5lcmF0b3IpIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgZyA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSwgaSwgcSA9IFtdO1xyXG4gICAgcmV0dXJuIGkgPSBPYmplY3QuY3JlYXRlKCh0eXBlb2YgQXN5bmNJdGVyYXRvciA9PT0gXCJmdW5jdGlvblwiID8gQXN5bmNJdGVyYXRvciA6IE9iamVjdCkucHJvdG90eXBlKSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiKSwgdmVyYihcInJldHVyblwiLCBhd2FpdFJldHVybiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgIGZ1bmN0aW9uIGF3YWl0UmV0dXJuKGYpIHsgcmV0dXJuIGZ1bmN0aW9uICh2KSB7IHJldHVybiBQcm9taXNlLnJlc29sdmUodikudGhlbihmLCByZWplY3QpOyB9OyB9XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4sIGYpIHsgaWYgKGdbbl0pIHsgaVtuXSA9IGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAoYSwgYikgeyBxLnB1c2goW24sIHYsIGEsIGJdKSA+IDEgfHwgcmVzdW1lKG4sIHYpOyB9KTsgfTsgaWYgKGYpIGlbbl0gPSBmKGlbbl0pOyB9IH1cclxuICAgIGZ1bmN0aW9uIHJlc3VtZShuLCB2KSB7IHRyeSB7IHN0ZXAoZ1tuXSh2KSk7IH0gY2F0Y2ggKGUpIHsgc2V0dGxlKHFbMF1bM10sIGUpOyB9IH1cclxuICAgIGZ1bmN0aW9uIHN0ZXAocikgeyByLnZhbHVlIGluc3RhbmNlb2YgX19hd2FpdCA/IFByb21pc2UucmVzb2x2ZShyLnZhbHVlLnYpLnRoZW4oZnVsZmlsbCwgcmVqZWN0KSA6IHNldHRsZShxWzBdWzJdLCByKTsgfVxyXG4gICAgZnVuY3Rpb24gZnVsZmlsbCh2YWx1ZSkgeyByZXN1bWUoXCJuZXh0XCIsIHZhbHVlKTsgfVxyXG4gICAgZnVuY3Rpb24gcmVqZWN0KHZhbHVlKSB7IHJlc3VtZShcInRocm93XCIsIHZhbHVlKTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKGYsIHYpIHsgaWYgKGYodiksIHEuc2hpZnQoKSwgcS5sZW5ndGgpIHJlc3VtZShxWzBdWzBdLCBxWzBdWzFdKTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY0RlbGVnYXRvcihvKSB7XHJcbiAgICB2YXIgaSwgcDtcclxuICAgIHJldHVybiBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiwgZnVuY3Rpb24gKGUpIHsgdGhyb3cgZTsgfSksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4sIGYpIHsgaVtuXSA9IG9bbl0gPyBmdW5jdGlvbiAodikgeyByZXR1cm4gKHAgPSAhcCkgPyB7IHZhbHVlOiBfX2F3YWl0KG9bbl0odikpLCBkb25lOiBmYWxzZSB9IDogZiA/IGYodikgOiB2OyB9IDogZjsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY1ZhbHVlcyhvKSB7XHJcbiAgICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgdmFyIG0gPSBvW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSwgaTtcclxuICAgIHJldHVybiBtID8gbS5jYWxsKG8pIDogKG8gPSB0eXBlb2YgX192YWx1ZXMgPT09IFwiZnVuY3Rpb25cIiA/IF9fdmFsdWVzKG8pIDogb1tTeW1ib2wuaXRlcmF0b3JdKCksIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiKSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpKTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobikgeyBpW25dID0gb1tuXSAmJiBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkgeyB2ID0gb1tuXSh2KSwgc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgdi5kb25lLCB2LnZhbHVlKTsgfSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHNldHRsZShyZXNvbHZlLCByZWplY3QsIGQsIHYpIHsgUHJvbWlzZS5yZXNvbHZlKHYpLnRoZW4oZnVuY3Rpb24odikgeyByZXNvbHZlKHsgdmFsdWU6IHYsIGRvbmU6IGQgfSk7IH0sIHJlamVjdCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fbWFrZVRlbXBsYXRlT2JqZWN0KGNvb2tlZCwgcmF3KSB7XHJcbiAgICBpZiAoT2JqZWN0LmRlZmluZVByb3BlcnR5KSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjb29rZWQsIFwicmF3XCIsIHsgdmFsdWU6IHJhdyB9KTsgfSBlbHNlIHsgY29va2VkLnJhdyA9IHJhdzsgfVxyXG4gICAgcmV0dXJuIGNvb2tlZDtcclxufTtcclxuXHJcbnZhciBfX3NldE1vZHVsZURlZmF1bHQgPSBPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBcImRlZmF1bHRcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCB2YWx1ZTogdiB9KTtcclxufSkgOiBmdW5jdGlvbihvLCB2KSB7XHJcbiAgICBvW1wiZGVmYXVsdFwiXSA9IHY7XHJcbn07XHJcblxyXG52YXIgb3duS2V5cyA9IGZ1bmN0aW9uKG8pIHtcclxuICAgIG93bktleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyB8fCBmdW5jdGlvbiAobykge1xyXG4gICAgICAgIHZhciBhciA9IFtdO1xyXG4gICAgICAgIGZvciAodmFyIGsgaW4gbykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvLCBrKSkgYXJbYXIubGVuZ3RoXSA9IGs7XHJcbiAgICAgICAgcmV0dXJuIGFyO1xyXG4gICAgfTtcclxuICAgIHJldHVybiBvd25LZXlzKG8pO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9faW1wb3J0U3Rhcihtb2QpIHtcclxuICAgIGlmIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpIHJldHVybiBtb2Q7XHJcbiAgICB2YXIgcmVzdWx0ID0ge307XHJcbiAgICBpZiAobW9kICE9IG51bGwpIGZvciAodmFyIGsgPSBvd25LZXlzKG1vZCksIGkgPSAwOyBpIDwgay5sZW5ndGg7IGkrKykgaWYgKGtbaV0gIT09IFwiZGVmYXVsdFwiKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGtbaV0pO1xyXG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydERlZmF1bHQobW9kKSB7XHJcbiAgICByZXR1cm4gKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgPyBtb2QgOiB7IGRlZmF1bHQ6IG1vZCB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZEdldChyZWNlaXZlciwgc3RhdGUsIGtpbmQsIGYpIHtcclxuICAgIGlmIChraW5kID09PSBcImFcIiAmJiAhZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByaXZhdGUgYWNjZXNzb3Igd2FzIGRlZmluZWQgd2l0aG91dCBhIGdldHRlclwiKTtcclxuICAgIGlmICh0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyICE9PSBzdGF0ZSB8fCAhZiA6ICFzdGF0ZS5oYXMocmVjZWl2ZXIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHJlYWQgcHJpdmF0ZSBtZW1iZXIgZnJvbSBhbiBvYmplY3Qgd2hvc2UgY2xhc3MgZGlkIG5vdCBkZWNsYXJlIGl0XCIpO1xyXG4gICAgcmV0dXJuIGtpbmQgPT09IFwibVwiID8gZiA6IGtpbmQgPT09IFwiYVwiID8gZi5jYWxsKHJlY2VpdmVyKSA6IGYgPyBmLnZhbHVlIDogc3RhdGUuZ2V0KHJlY2VpdmVyKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRTZXQocmVjZWl2ZXIsIHN0YXRlLCB2YWx1ZSwga2luZCwgZikge1xyXG4gICAgaWYgKGtpbmQgPT09IFwibVwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBtZXRob2QgaXMgbm90IHdyaXRhYmxlXCIpO1xyXG4gICAgaWYgKGtpbmQgPT09IFwiYVwiICYmICFmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBhY2Nlc3NvciB3YXMgZGVmaW5lZCB3aXRob3V0IGEgc2V0dGVyXCIpO1xyXG4gICAgaWYgKHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgIT09IHN0YXRlIHx8ICFmIDogIXN0YXRlLmhhcyhyZWNlaXZlcikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3Qgd3JpdGUgcHJpdmF0ZSBtZW1iZXIgdG8gYW4gb2JqZWN0IHdob3NlIGNsYXNzIGRpZCBub3QgZGVjbGFyZSBpdFwiKTtcclxuICAgIHJldHVybiAoa2luZCA9PT0gXCJhXCIgPyBmLmNhbGwocmVjZWl2ZXIsIHZhbHVlKSA6IGYgPyBmLnZhbHVlID0gdmFsdWUgOiBzdGF0ZS5zZXQocmVjZWl2ZXIsIHZhbHVlKSksIHZhbHVlO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZEluKHN0YXRlLCByZWNlaXZlcikge1xyXG4gICAgaWYgKHJlY2VpdmVyID09PSBudWxsIHx8ICh0eXBlb2YgcmVjZWl2ZXIgIT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHJlY2VpdmVyICE9PSBcImZ1bmN0aW9uXCIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHVzZSAnaW4nIG9wZXJhdG9yIG9uIG5vbi1vYmplY3RcIik7XHJcbiAgICByZXR1cm4gdHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciA9PT0gc3RhdGUgOiBzdGF0ZS5oYXMocmVjZWl2ZXIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hZGREaXNwb3NhYmxlUmVzb3VyY2UoZW52LCB2YWx1ZSwgYXN5bmMpIHtcclxuICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdm9pZCAwKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgdmFsdWUgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBleHBlY3RlZC5cIik7XHJcbiAgICAgICAgdmFyIGRpc3Bvc2UsIGlubmVyO1xyXG4gICAgICAgIGlmIChhc3luYykge1xyXG4gICAgICAgICAgICBpZiAoIVN5bWJvbC5hc3luY0Rpc3Bvc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNEaXNwb3NlIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgICAgICAgICAgZGlzcG9zZSA9IHZhbHVlW1N5bWJvbC5hc3luY0Rpc3Bvc2VdO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoZGlzcG9zZSA9PT0gdm9pZCAwKSB7XHJcbiAgICAgICAgICAgIGlmICghU3ltYm9sLmRpc3Bvc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuZGlzcG9zZSBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICAgICAgICAgIGRpc3Bvc2UgPSB2YWx1ZVtTeW1ib2wuZGlzcG9zZV07XHJcbiAgICAgICAgICAgIGlmIChhc3luYykgaW5uZXIgPSBkaXNwb3NlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodHlwZW9mIGRpc3Bvc2UgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBub3QgZGlzcG9zYWJsZS5cIik7XHJcbiAgICAgICAgaWYgKGlubmVyKSBkaXNwb3NlID0gZnVuY3Rpb24oKSB7IHRyeSB7IGlubmVyLmNhbGwodGhpcyk7IH0gY2F0Y2ggKGUpIHsgcmV0dXJuIFByb21pc2UucmVqZWN0KGUpOyB9IH07XHJcbiAgICAgICAgZW52LnN0YWNrLnB1c2goeyB2YWx1ZTogdmFsdWUsIGRpc3Bvc2U6IGRpc3Bvc2UsIGFzeW5jOiBhc3luYyB9KTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGFzeW5jKSB7XHJcbiAgICAgICAgZW52LnN0YWNrLnB1c2goeyBhc3luYzogdHJ1ZSB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiB2YWx1ZTtcclxuXHJcbn1cclxuXHJcbnZhciBfU3VwcHJlc3NlZEVycm9yID0gdHlwZW9mIFN1cHByZXNzZWRFcnJvciA9PT0gXCJmdW5jdGlvblwiID8gU3VwcHJlc3NlZEVycm9yIDogZnVuY3Rpb24gKGVycm9yLCBzdXBwcmVzc2VkLCBtZXNzYWdlKSB7XHJcbiAgICB2YXIgZSA9IG5ldyBFcnJvcihtZXNzYWdlKTtcclxuICAgIHJldHVybiBlLm5hbWUgPSBcIlN1cHByZXNzZWRFcnJvclwiLCBlLmVycm9yID0gZXJyb3IsIGUuc3VwcHJlc3NlZCA9IHN1cHByZXNzZWQsIGU7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kaXNwb3NlUmVzb3VyY2VzKGVudikge1xyXG4gICAgZnVuY3Rpb24gZmFpbChlKSB7XHJcbiAgICAgICAgZW52LmVycm9yID0gZW52Lmhhc0Vycm9yID8gbmV3IF9TdXBwcmVzc2VkRXJyb3IoZSwgZW52LmVycm9yLCBcIkFuIGVycm9yIHdhcyBzdXBwcmVzc2VkIGR1cmluZyBkaXNwb3NhbC5cIikgOiBlO1xyXG4gICAgICAgIGVudi5oYXNFcnJvciA9IHRydWU7XHJcbiAgICB9XHJcbiAgICB2YXIgciwgcyA9IDA7XHJcbiAgICBmdW5jdGlvbiBuZXh0KCkge1xyXG4gICAgICAgIHdoaWxlIChyID0gZW52LnN0YWNrLnBvcCgpKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXIuYXN5bmMgJiYgcyA9PT0gMSkgcmV0dXJuIHMgPSAwLCBlbnYuc3RhY2sucHVzaChyKSwgUHJvbWlzZS5yZXNvbHZlKCkudGhlbihuZXh0KTtcclxuICAgICAgICAgICAgICAgIGlmIChyLmRpc3Bvc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gci5kaXNwb3NlLmNhbGwoci52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHIuYXN5bmMpIHJldHVybiBzIHw9IDIsIFByb21pc2UucmVzb2x2ZShyZXN1bHQpLnRoZW4obmV4dCwgZnVuY3Rpb24oZSkgeyBmYWlsKGUpOyByZXR1cm4gbmV4dCgpOyB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgcyB8PSAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICBmYWlsKGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChzID09PSAxKSByZXR1cm4gZW52Lmhhc0Vycm9yID8gUHJvbWlzZS5yZWplY3QoZW52LmVycm9yKSA6IFByb21pc2UucmVzb2x2ZSgpO1xyXG4gICAgICAgIGlmIChlbnYuaGFzRXJyb3IpIHRocm93IGVudi5lcnJvcjtcclxuICAgIH1cclxuICAgIHJldHVybiBuZXh0KCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3Jld3JpdGVSZWxhdGl2ZUltcG9ydEV4dGVuc2lvbihwYXRoLCBwcmVzZXJ2ZUpzeCkge1xyXG4gICAgaWYgKHR5cGVvZiBwYXRoID09PSBcInN0cmluZ1wiICYmIC9eXFwuXFwuP1xcLy8udGVzdChwYXRoKSkge1xyXG4gICAgICAgIHJldHVybiBwYXRoLnJlcGxhY2UoL1xcLih0c3gpJHwoKD86XFwuZCk/KSgoPzpcXC5bXi4vXSs/KT8pXFwuKFtjbV0/KXRzJC9pLCBmdW5jdGlvbiAobSwgdHN4LCBkLCBleHQsIGNtKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0c3ggPyBwcmVzZXJ2ZUpzeCA/IFwiLmpzeFwiIDogXCIuanNcIiA6IGQgJiYgKCFleHQgfHwgIWNtKSA/IG0gOiAoZCArIGV4dCArIFwiLlwiICsgY20udG9Mb3dlckNhc2UoKSArIFwianNcIik7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcGF0aDtcclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQge1xyXG4gICAgX19leHRlbmRzOiBfX2V4dGVuZHMsXHJcbiAgICBfX2Fzc2lnbjogX19hc3NpZ24sXHJcbiAgICBfX3Jlc3Q6IF9fcmVzdCxcclxuICAgIF9fZGVjb3JhdGU6IF9fZGVjb3JhdGUsXHJcbiAgICBfX3BhcmFtOiBfX3BhcmFtLFxyXG4gICAgX19lc0RlY29yYXRlOiBfX2VzRGVjb3JhdGUsXHJcbiAgICBfX3J1bkluaXRpYWxpemVyczogX19ydW5Jbml0aWFsaXplcnMsXHJcbiAgICBfX3Byb3BLZXk6IF9fcHJvcEtleSxcclxuICAgIF9fc2V0RnVuY3Rpb25OYW1lOiBfX3NldEZ1bmN0aW9uTmFtZSxcclxuICAgIF9fbWV0YWRhdGE6IF9fbWV0YWRhdGEsXHJcbiAgICBfX2F3YWl0ZXI6IF9fYXdhaXRlcixcclxuICAgIF9fZ2VuZXJhdG9yOiBfX2dlbmVyYXRvcixcclxuICAgIF9fY3JlYXRlQmluZGluZzogX19jcmVhdGVCaW5kaW5nLFxyXG4gICAgX19leHBvcnRTdGFyOiBfX2V4cG9ydFN0YXIsXHJcbiAgICBfX3ZhbHVlczogX192YWx1ZXMsXHJcbiAgICBfX3JlYWQ6IF9fcmVhZCxcclxuICAgIF9fc3ByZWFkOiBfX3NwcmVhZCxcclxuICAgIF9fc3ByZWFkQXJyYXlzOiBfX3NwcmVhZEFycmF5cyxcclxuICAgIF9fc3ByZWFkQXJyYXk6IF9fc3ByZWFkQXJyYXksXHJcbiAgICBfX2F3YWl0OiBfX2F3YWl0LFxyXG4gICAgX19hc3luY0dlbmVyYXRvcjogX19hc3luY0dlbmVyYXRvcixcclxuICAgIF9fYXN5bmNEZWxlZ2F0b3I6IF9fYXN5bmNEZWxlZ2F0b3IsXHJcbiAgICBfX2FzeW5jVmFsdWVzOiBfX2FzeW5jVmFsdWVzLFxyXG4gICAgX19tYWtlVGVtcGxhdGVPYmplY3Q6IF9fbWFrZVRlbXBsYXRlT2JqZWN0LFxyXG4gICAgX19pbXBvcnRTdGFyOiBfX2ltcG9ydFN0YXIsXHJcbiAgICBfX2ltcG9ydERlZmF1bHQ6IF9faW1wb3J0RGVmYXVsdCxcclxuICAgIF9fY2xhc3NQcml2YXRlRmllbGRHZXQ6IF9fY2xhc3NQcml2YXRlRmllbGRHZXQsXHJcbiAgICBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0OiBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0LFxyXG4gICAgX19jbGFzc1ByaXZhdGVGaWVsZEluOiBfX2NsYXNzUHJpdmF0ZUZpZWxkSW4sXHJcbiAgICBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZTogX19hZGREaXNwb3NhYmxlUmVzb3VyY2UsXHJcbiAgICBfX2Rpc3Bvc2VSZXNvdXJjZXM6IF9fZGlzcG9zZVJlc291cmNlcyxcclxuICAgIF9fcmV3cml0ZVJlbGF0aXZlSW1wb3J0RXh0ZW5zaW9uOiBfX3Jld3JpdGVSZWxhdGl2ZUltcG9ydEV4dGVuc2lvbixcclxufTtcclxuIiwiaW1wb3J0IHsgTm90aWNlIH0gZnJvbSAnb2JzaWRpYW4nO1xuXG4vLyBFVkVOVCBCVVMgU1lTVEVNXG5leHBvcnQgY2xhc3MgVGlueUVtaXR0ZXIge1xuICAgIHByaXZhdGUgbGlzdGVuZXJzOiB7IFtrZXk6IHN0cmluZ106IEZ1bmN0aW9uW10gfSA9IHt9O1xuXG4gICAgb24oZXZlbnQ6IHN0cmluZywgZm46IEZ1bmN0aW9uKSB7XG4gICAgICAgICh0aGlzLmxpc3RlbmVyc1tldmVudF0gPSB0aGlzLmxpc3RlbmVyc1tldmVudF0gfHwgW10pLnB1c2goZm4pO1xuICAgIH1cblxuICAgIG9mZihldmVudDogc3RyaW5nLCBmbjogRnVuY3Rpb24pIHtcbiAgICAgICAgaWYgKCF0aGlzLmxpc3RlbmVyc1tldmVudF0pIHJldHVybjtcbiAgICAgICAgdGhpcy5saXN0ZW5lcnNbZXZlbnRdID0gdGhpcy5saXN0ZW5lcnNbZXZlbnRdLmZpbHRlcihmID0+IGYgIT09IGZuKTtcbiAgICB9XG5cbiAgICB0cmlnZ2VyKGV2ZW50OiBzdHJpbmcsIGRhdGE/OiBhbnkpIHtcbiAgICAgICAgKHRoaXMubGlzdGVuZXJzW2V2ZW50XSB8fCBbXSkuZm9yRWFjaChmbiA9PiBmbihkYXRhKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQXVkaW9Db250cm9sbGVyIHtcbiAgICBhdWRpb0N0eDogQXVkaW9Db250ZXh0IHwgbnVsbCA9IG51bGw7XG4gICAgYnJvd25Ob2lzZU5vZGU6IFNjcmlwdFByb2Nlc3Nvck5vZGUgfCBudWxsID0gbnVsbDtcbiAgICBtdXRlZDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gICAgY29uc3RydWN0b3IobXV0ZWQ6IGJvb2xlYW4pIHsgdGhpcy5tdXRlZCA9IG11dGVkOyB9XG5cbiAgICBzZXRNdXRlZChtdXRlZDogYm9vbGVhbikgeyB0aGlzLm11dGVkID0gbXV0ZWQ7IH1cblxuICAgIGluaXRBdWRpbygpIHsgaWYgKCF0aGlzLmF1ZGlvQ3R4KSB0aGlzLmF1ZGlvQ3R4ID0gbmV3ICh3aW5kb3cuQXVkaW9Db250ZXh0IHx8ICh3aW5kb3cgYXMgYW55KS53ZWJraXRBdWRpb0NvbnRleHQpKCk7IH1cblxuICAgIHBsYXlUb25lKGZyZXE6IG51bWJlciwgdHlwZTogT3NjaWxsYXRvclR5cGUsIGR1cmF0aW9uOiBudW1iZXIsIHZvbDogbnVtYmVyID0gMC4xKSB7XG4gICAgICAgIGlmICh0aGlzLm11dGVkKSByZXR1cm47XG4gICAgICAgIHRoaXMuaW5pdEF1ZGlvKCk7XG4gICAgICAgIGNvbnN0IG9zYyA9IHRoaXMuYXVkaW9DdHghLmNyZWF0ZU9zY2lsbGF0b3IoKTtcbiAgICAgICAgY29uc3QgZ2FpbiA9IHRoaXMuYXVkaW9DdHghLmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgb3NjLnR5cGUgPSB0eXBlO1xuICAgICAgICBvc2MuZnJlcXVlbmN5LnZhbHVlID0gZnJlcTtcbiAgICAgICAgb3NjLmNvbm5lY3QoZ2Fpbik7XG4gICAgICAgIGdhaW4uY29ubmVjdCh0aGlzLmF1ZGlvQ3R4IS5kZXN0aW5hdGlvbik7XG4gICAgICAgIG9zYy5zdGFydCgpO1xuICAgICAgICBnYWluLmdhaW4uc2V0VmFsdWVBdFRpbWUodm9sLCB0aGlzLmF1ZGlvQ3R4IS5jdXJyZW50VGltZSk7XG4gICAgICAgIGdhaW4uZ2Fpbi5leHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lKDAuMDAwMDEsIHRoaXMuYXVkaW9DdHghLmN1cnJlbnRUaW1lICsgZHVyYXRpb24pO1xuICAgICAgICBvc2Muc3RvcCh0aGlzLmF1ZGlvQ3R4IS5jdXJyZW50VGltZSArIGR1cmF0aW9uKTtcbiAgICB9XG5cbiAgICBwbGF5U291bmQodHlwZTogXCJzdWNjZXNzXCJ8XCJmYWlsXCJ8XCJkZWF0aFwifFwiY2xpY2tcInxcImhlYXJ0YmVhdFwifFwibWVkaXRhdGVcIikge1xuICAgICAgICBpZiAodHlwZSA9PT0gXCJzdWNjZXNzXCIpIHsgdGhpcy5wbGF5VG9uZSg2MDAsIFwic2luZVwiLCAwLjEpOyBzZXRUaW1lb3V0KCgpID0+IHRoaXMucGxheVRvbmUoODAwLCBcInNpbmVcIiwgMC4yKSwgMTAwKTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcImZhaWxcIikgeyB0aGlzLnBsYXlUb25lKDE1MCwgXCJzYXd0b290aFwiLCAwLjQpOyBzZXRUaW1lb3V0KCgpID0+IHRoaXMucGxheVRvbmUoMTAwLCBcInNhd3Rvb3RoXCIsIDAuNCksIDE1MCk7IH1cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gXCJkZWF0aFwiKSB7IHRoaXMucGxheVRvbmUoNTAsIFwic3F1YXJlXCIsIDEuMCk7IH1cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gXCJjbGlja1wiKSB7IHRoaXMucGxheVRvbmUoODAwLCBcInNpbmVcIiwgMC4wNSk7IH1cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gXCJoZWFydGJlYXRcIikgeyB0aGlzLnBsYXlUb25lKDYwLCBcInNpbmVcIiwgMC4xLCAwLjUpOyBzZXRUaW1lb3V0KCgpPT50aGlzLnBsYXlUb25lKDUwLCBcInNpbmVcIiwgMC4xLCAwLjQpLCAxNTApOyB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFwibWVkaXRhdGVcIikgeyB0aGlzLnBsYXlUb25lKDQzMiwgXCJzaW5lXCIsIDIuMCwgMC4wNSk7IH1cbiAgICB9XG5cbiAgICB0b2dnbGVCcm93bk5vaXNlKCkge1xuICAgICAgICB0aGlzLmluaXRBdWRpbygpO1xuICAgICAgICBpZiAodGhpcy5icm93bk5vaXNlTm9kZSkgeyBcbiAgICAgICAgICAgIHRoaXMuYnJvd25Ob2lzZU5vZGUuZGlzY29ubmVjdCgpOyBcbiAgICAgICAgICAgIHRoaXMuYnJvd25Ob2lzZU5vZGUgPSBudWxsOyBcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJGb2N1cyBBdWRpbzogT0ZGXCIpOyBcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGJ1ZmZlclNpemUgPSA0MDk2OyBcbiAgICAgICAgICAgIHRoaXMuYnJvd25Ob2lzZU5vZGUgPSB0aGlzLmF1ZGlvQ3R4IS5jcmVhdGVTY3JpcHRQcm9jZXNzb3IoYnVmZmVyU2l6ZSwgMSwgMSk7XG4gICAgICAgICAgICBsZXQgbGFzdE91dCA9IDA7XG4gICAgICAgICAgICB0aGlzLmJyb3duTm9pc2VOb2RlLm9uYXVkaW9wcm9jZXNzID0gKGUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBvdXRwdXQgPSBlLm91dHB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJ1ZmZlclNpemU7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB3aGl0ZSA9IE1hdGgucmFuZG9tKCkgKiAyIC0gMTsgXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dFtpXSA9IChsYXN0T3V0ICsgKDAuMDIgKiB3aGl0ZSkpIC8gMS4wMjsgXG4gICAgICAgICAgICAgICAgICAgIGxhc3RPdXQgPSBvdXRwdXRbaV07IFxuICAgICAgICAgICAgICAgICAgICBvdXRwdXRbaV0gKj0gMC4xOyBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZS5jb25uZWN0KHRoaXMuYXVkaW9DdHghLmRlc3RpbmF0aW9uKTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJGb2N1cyBBdWRpbzogT04gKEJyb3duIE5vaXNlKVwiKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsImltcG9ydCB7IEFwcCwgTW9kYWwsIFNldHRpbmcsIE5vdGljZSwgbW9tZW50LCBURmlsZSwgVEZvbGRlciB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCBTaXN5cGh1c1BsdWdpbiBmcm9tICcuLi9tYWluJzsgXG5pbXBvcnQgeyBNb2RpZmllciB9IGZyb20gJy4uL3R5cGVzJztcblxuZXhwb3J0IGNsYXNzIENoYW9zTW9kYWwgZXh0ZW5kcyBNb2RhbCB7IFxuICAgIG1vZGlmaWVyOiBNb2RpZmllcjsgXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIG06IE1vZGlmaWVyKSB7IHN1cGVyKGFwcCk7IHRoaXMubW9kaWZpZXI9bTsgfSBcbiAgICBvbk9wZW4oKSB7IFxuICAgICAgICBjb25zdCBjID0gdGhpcy5jb250ZW50RWw7IFxuICAgICAgICBjb25zdCBoMSA9IGMuY3JlYXRlRWwoXCJoMVwiLCB7IHRleHQ6IFwiVEhFIE9NRU5cIiB9KTsgXG4gICAgICAgIGgxLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJ0ZXh0LWFsaWduOmNlbnRlcjsgY29sb3I6I2Y1NTtcIik7IFxuICAgICAgICBjb25zdCBpYyA9IGMuY3JlYXRlRWwoXCJkaXZcIiwgeyB0ZXh0OiB0aGlzLm1vZGlmaWVyLmljb24gfSk7IFxuICAgICAgICBpYy5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwiZm9udC1zaXplOjgwcHg7IHRleHQtYWxpZ246Y2VudGVyO1wiKTsgXG4gICAgICAgIGNvbnN0IGgyID0gYy5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogdGhpcy5tb2RpZmllci5uYW1lIH0pOyBcbiAgICAgICAgaDIuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcInRleHQtYWxpZ246Y2VudGVyO1wiKTsgXG4gICAgICAgIGNvbnN0IHAgPSBjLmNyZWF0ZUVsKFwicFwiLCB7dGV4dDogdGhpcy5tb2RpZmllci5kZXNjfSk7IFxuICAgICAgICBwLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJ0ZXh0LWFsaWduOmNlbnRlclwiKTsgXG4gICAgICAgIGNvbnN0IGIgPSBjLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHt0ZXh0OlwiQWNrbm93bGVkZ2VcIn0pOyBcbiAgICAgICAgYi5hZGRDbGFzcyhcIm1vZC1jdGFcIik7IFxuICAgICAgICBiLnN0eWxlLmRpc3BsYXk9XCJibG9ja1wiOyBcbiAgICAgICAgYi5zdHlsZS5tYXJnaW49XCIyMHB4IGF1dG9cIjsgXG4gICAgICAgIGIub25jbGljaz0oKT0+dGhpcy5jbG9zZSgpOyBcbiAgICB9IFxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH0gXG59XG5cbmV4cG9ydCBjbGFzcyBTaG9wTW9kYWwgZXh0ZW5kcyBNb2RhbCB7IFxuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47IFxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9IFxuICBcbiAgb25PcGVuKCkgeyBcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7IFxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwi8J+bkiBCTEFDSyBNQVJLRVRcIiB9KTsgXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgUHVyc2U6IPCfqpkgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkfWAgfSk7IFxuICAgICAgICBcbiAgICAgICAgLy8gMS4gU3RhbmRhcmQgSXRlbXNcbiAgICAgICAgdGhpcy5pdGVtKGNvbnRlbnRFbCwgXCLwn5KJIFN0aW1wYWNrXCIsIFwiSGVhbCAyMCBIUFwiLCA1MCwgYXN5bmMgKCkgPT4geyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmhwID0gTWF0aC5taW4odGhpcy5wbHVnaW4uc2V0dGluZ3MubWF4SHAsIHRoaXMucGx1Z2luLnNldHRpbmdzLmhwICsgMjApOyBcbiAgICAgICAgfSk7IFxuICAgICAgICB0aGlzLml0ZW0oY29udGVudEVsLCBcIvCfkqMgU2Fib3RhZ2VcIiwgXCItNSBSaXZhbCBEbWdcIiwgMjAwLCBhc3luYyAoKSA9PiB7IFxuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Mucml2YWxEbWcgPSBNYXRoLm1heCg1LCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yaXZhbERtZyAtIDUpOyBcbiAgICAgICAgfSk7IFxuICAgICAgICB0aGlzLml0ZW0oY29udGVudEVsLCBcIvCfm6HvuI8gU2hpZWxkXCIsIFwiMjRoIFByb3RlY3Rpb25cIiwgMTUwLCBhc3luYyAoKSA9PiB7IFxuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2hpZWxkZWRVbnRpbCA9IG1vbWVudCgpLmFkZCgyNCwgJ2hvdXJzJykudG9JU09TdHJpbmcoKTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgdGhpcy5pdGVtKGNvbnRlbnRFbCwgXCLwn5i0IFJlc3QgRGF5XCIsIFwiU2FmZSBmb3IgMjRoXCIsIDEwMCwgYXN5bmMgKCkgPT4geyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnJlc3REYXlVbnRpbCA9IG1vbWVudCgpLmFkZCgyNCwgJ2hvdXJzJykudG9JU09TdHJpbmcoKTsgXG4gICAgICAgIH0pOyBcblxuICAgICAgICAvLyAyLiBQb3dlci1VcHNcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIvCfp6ogQUxDSEVNWVwiIH0pO1xuICAgICAgICBjb25zdCBidWZmcyA9IFtcbiAgICAgICAgICAgIHsgaWQ6IFwiZm9jdXNfcG90aW9uXCIsIG5hbWU6IFwiRm9jdXMgUG90aW9uXCIsIGljb246IFwi8J+nqlwiLCBkZXNjOiBcIjJ4IFhQICgxaClcIiwgY29zdDogMTAwLCBkdXJhdGlvbjogNjAsIGVmZmVjdDogeyB4cE11bHQ6IDIgfSB9LFxuICAgICAgICAgICAgeyBpZDogXCJtaWRhc190b3VjaFwiLCBuYW1lOiBcIk1pZGFzIFRvdWNoXCIsIGljb246IFwi4pyoXCIsIGRlc2M6IFwiM3ggR29sZCAoMzBtKVwiLCBjb3N0OiAxNTAsIGR1cmF0aW9uOiAzMCwgZWZmZWN0OiB7IGdvbGRNdWx0OiAzIH0gfSxcbiAgICAgICAgICAgIHsgaWQ6IFwiaXJvbl93aWxsXCIsIG5hbWU6IFwiSXJvbiBXaWxsXCIsIGljb246IFwi8J+boe+4j1wiLCBkZXNjOiBcIjUwJSBEbWcgUmVkdWN0ICgyaClcIiwgY29zdDogMjAwLCBkdXJhdGlvbjogMTIwLCBlZmZlY3Q6IHsgZGFtYWdlTXVsdDogMC41IH0gfVxuICAgICAgICBdO1xuXG4gICAgICAgIGJ1ZmZzLmZvckVhY2goYnVmZiA9PiB7XG4gICAgICAgICAgICAgdGhpcy5pdGVtKGNvbnRlbnRFbCwgYCR7YnVmZi5pY29ufSAke2J1ZmYubmFtZX1gLCBidWZmLmRlc2MsIGJ1ZmYuY29zdCwgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuYWN0aXZhdGVCdWZmKGJ1ZmYpO1xuICAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgaXRlbShlbDogSFRNTEVsZW1lbnQsIG5hbWU6IHN0cmluZywgZGVzYzogc3RyaW5nLCBiYXNlQ29zdDogbnVtYmVyLCBlZmZlY3Q6ICgpID0+IFByb21pc2U8dm9pZD4pIHsgXG4gICAgICAgIC8vIFtGSVhdIEFwcGx5IEluZmxhdGlvbiBNdWx0aXBsaWVyXG4gICAgICAgIGNvbnN0IG11bHQgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kYWlseU1vZGlmaWVyLnByaWNlTXVsdCB8fCAxO1xuICAgICAgICBjb25zdCByZWFsQ29zdCA9IE1hdGguY2VpbChiYXNlQ29zdCAqIG11bHQpO1xuXG4gICAgICAgIGNvbnN0IGMgPSBlbC5jcmVhdGVEaXYoKTsgXG4gICAgICAgIGMuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJkaXNwbGF5OmZsZXg7IGp1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuOyBwYWRkaW5nOjEwcHggMDsgYm9yZGVyLWJvdHRvbToxcHggc29saWQgIzMzMztcIik7IFxuICAgICAgICBjb25zdCBpID0gYy5jcmVhdGVEaXYoKTsgXG4gICAgICAgIGkuY3JlYXRlRWwoXCJiXCIsIHsgdGV4dDogbmFtZSB9KTsgXG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGluZmxhdGVkIHByaWNlIHdhcm5pbmcgaWYgYXBwbGljYWJsZVxuICAgICAgICBpZiAobXVsdCA+IDEpIHtcbiAgICAgICAgICAgIGkuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogYCAo8J+TiCBJbmY6ICR7bXVsdH14KWAsIGF0dHI6IHsgc3R5bGU6IFwiY29sb3I6IHJlZDsgZm9udC1zaXplOiAwLjhlbTtcIiB9IH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaS5jcmVhdGVFbChcImRpdlwiLCB7IHRleHQ6IGRlc2MgfSk7IFxuICAgICAgICBjb25zdCBiID0gYy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IGAke3JlYWxDb3N0fSBHYCB9KTsgXG4gICAgICAgIFxuICAgICAgICBpZih0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIDwgcmVhbENvc3QpIHsgXG4gICAgICAgICAgICBiLnNldEF0dHJpYnV0ZShcImRpc2FibGVkXCIsXCJ0cnVlXCIpOyBiLnN0eWxlLm9wYWNpdHk9XCIwLjVcIjsgXG4gICAgICAgIH0gZWxzZSB7IFxuICAgICAgICAgICAgYi5hZGRDbGFzcyhcIm1vZC1jdGFcIik7IFxuICAgICAgICAgICAgYi5vbmNsaWNrID0gYXN5bmMgKCkgPT4geyBcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIC09IHJlYWxDb3N0OyBcbiAgICAgICAgICAgICAgICBhd2FpdCBlZmZlY3QoKTsgXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLnNhdmUoKTsgXG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShgQm91Z2h0ICR7bmFtZX0gZm9yICR7cmVhbENvc3R9Z2ApOyBcbiAgICAgICAgICAgICAgICB0aGlzLmNsb3NlKCk7IFxuICAgICAgICAgICAgICAgIG5ldyBTaG9wTW9kYWwodGhpcy5hcHAsdGhpcy5wbHVnaW4pLm9wZW4oKTsgXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gXG4gICAgfSBcbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9IFxufVxuXG4vLyAuLi4gKFF1ZXN0TW9kYWwsIFNraWxsTWFuYWdlck1vZGFsLCBldGMuIHJlbWFpbiB1bmNoYW5nZWQgZnJvbSBwcmV2aW91cyB2ZXJzaW9ucywgaW5jbHVkZWQgaGVyZSBmb3IgY29tcGxldGVuZXNzIG9mIGZpbGUgaWYgeW91IHJlcGxhY2UgZW50aXJlbHksIGJ1dCBhc3N1bWluZyB5b3UgbWVyZ2Ugb3IgSSBwcm92aWRlIG9ubHkgQ2hhbmdlZCBjbGFzc2VzLiBTaW5jZSB5b3UgYXNrZWQgZm9yIGZpbGVzLCBJIHdpbGwgaW5jbHVkZSBRdWVzdE1vZGFsIGV0YyBiZWxvdylcblxuZXhwb3J0IGNsYXNzIFF1ZXN0TW9kYWwgZXh0ZW5kcyBNb2RhbCB7IFxuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47IFxuICAgIG5hbWU6IHN0cmluZzsgZGlmZmljdWx0eTogbnVtYmVyID0gMzsgc2tpbGw6IHN0cmluZyA9IFwiTm9uZVwiOyBzZWNTa2lsbDogc3RyaW5nID0gXCJOb25lXCI7IGRlYWRsaW5lOiBzdHJpbmcgPSBcIlwiOyBoaWdoU3Rha2VzOiBib29sZWFuID0gZmFsc2U7IGlzQm9zczogYm9vbGVhbiA9IGZhbHNlOyBcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikgeyBzdXBlcihhcHApOyB0aGlzLnBsdWdpbiA9IHBsdWdpbjsgfSBcbiAgICBvbk9wZW4oKSB7IFxuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpczsgXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCLimpTvuI8gREVQTE9ZTUVOVFwiIH0pOyBcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiT2JqZWN0aXZlXCIpLmFkZFRleHQodCA9PiB7IHQub25DaGFuZ2UodiA9PiB0aGlzLm5hbWUgPSB2KTsgc2V0VGltZW91dCgoKSA9PiB0LmlucHV0RWwuZm9jdXMoKSwgNTApOyB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiRGlmZmljdWx0eVwiKS5hZGREcm9wZG93bihkID0+IGQuYWRkT3B0aW9uKFwiMVwiLFwiVHJpdmlhbFwiKS5hZGRPcHRpb24oXCIyXCIsXCJFYXN5XCIpLmFkZE9wdGlvbihcIjNcIixcIk1lZGl1bVwiKS5hZGRPcHRpb24oXCI0XCIsXCJIYXJkXCIpLmFkZE9wdGlvbihcIjVcIixcIlNVSUNJREVcIikuc2V0VmFsdWUoXCIzXCIpLm9uQ2hhbmdlKHY9PnRoaXMuZGlmZmljdWx0eT1wYXJzZUludCh2KSkpOyBcbiAgICAgICAgY29uc3Qgc2tpbGxzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyBcIk5vbmVcIjogXCJOb25lXCIgfTsgXG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5mb3JFYWNoKHMgPT4gc2tpbGxzW3MubmFtZV0gPSBzLm5hbWUpOyBcbiAgICAgICAgc2tpbGxzW1wiKyBOZXdcIl0gPSBcIisgTmV3XCI7IFxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJQcmltYXJ5IE5vZGVcIikuYWRkRHJvcGRvd24oZCA9PiBkLmFkZE9wdGlvbnMoc2tpbGxzKS5vbkNoYW5nZSh2ID0+IHsgaWYodj09PVwiKyBOZXdcIil7IHRoaXMuY2xvc2UoKTsgbmV3IFNraWxsTWFuYWdlck1vZGFsKHRoaXMuYXBwLHRoaXMucGx1Z2luKS5vcGVuKCk7IH0gZWxzZSB0aGlzLnNraWxsPXY7IH0pKTsgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIlN5bmVyZ3kgTm9kZVwiKS5hZGREcm9wZG93bihkID0+IGQuYWRkT3B0aW9ucyhza2lsbHMpLnNldFZhbHVlKFwiTm9uZVwiKS5vbkNoYW5nZSh2ID0+IHRoaXMuc2VjU2tpbGwgPSB2KSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIkRlYWRsaW5lXCIpLmFkZFRleHQodCA9PiB7IHQuaW5wdXRFbC50eXBlID0gXCJkYXRldGltZS1sb2NhbFwiOyB0Lm9uQ2hhbmdlKHYgPT4gdGhpcy5kZWFkbGluZSA9IHYpOyB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiSGlnaCBTdGFrZXNcIikuc2V0RGVzYyhcIkRvdWJsZSBHb2xkIC8gRG91YmxlIERhbWFnZVwiKS5hZGRUb2dnbGUodD0+dC5zZXRWYWx1ZShmYWxzZSkub25DaGFuZ2Uodj0+dGhpcy5oaWdoU3Rha2VzPXYpKTsgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuYWRkQnV0dG9uKGIgPT4gYi5zZXRCdXR0b25UZXh0KFwiRGVwbG95XCIpLnNldEN0YSgpLm9uQ2xpY2soKCkgPT4geyBpZih0aGlzLm5hbWUpeyB0aGlzLnBsdWdpbi5lbmdpbmUuY3JlYXRlUXVlc3QodGhpcy5uYW1lLHRoaXMuZGlmZmljdWx0eSx0aGlzLnNraWxsLHRoaXMuc2VjU2tpbGwsdGhpcy5kZWFkbGluZSx0aGlzLmhpZ2hTdGFrZXMsIFwiTm9ybWFsXCIsIHRoaXMuaXNCb3NzKTsgdGhpcy5jbG9zZSgpOyB9IH0pKTsgXG4gICAgfSBcbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9IFxufVxuXG5leHBvcnQgY2xhc3MgU2tpbGxNYW5hZ2VyTW9kYWwgZXh0ZW5kcyBNb2RhbCB7IFxuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47IFxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9IFxuICAgIG9uT3BlbigpIHsgXG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzOyBcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIkFkZCBOZXcgTm9kZVwiIH0pOyBcbiAgICAgICAgbGV0IG49XCJcIjsgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIk5vZGUgTmFtZVwiKS5hZGRUZXh0KHQ9PnQub25DaGFuZ2Uodj0+bj12KSkuYWRkQnV0dG9uKGI9PmIuc2V0QnV0dG9uVGV4dChcIkNyZWF0ZVwiKS5zZXRDdGEoKS5vbkNsaWNrKGFzeW5jKCk9PntcbiAgICAgICAgICAgIGlmKG4peyB0aGlzLnBsdWdpbi5zZXR0aW5ncy5za2lsbHMucHVzaCh7bmFtZTpuLGxldmVsOjEseHA6MCx4cFJlcTo1LGxhc3RVc2VkOm5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxydXN0OjAsY29ubmVjdGlvbnM6W119KTsgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLnNhdmUoKTsgdGhpcy5jbG9zZSgpOyB9XG4gICAgICAgIH0pKTsgXG4gICAgfSBcbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9IFxufVxuXG5leHBvcnQgY2xhc3MgU2tpbGxEZXRhaWxNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luOyBpbmRleDogbnVtYmVyO1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luLCBpbmRleDogbnVtYmVyKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luPXBsdWdpbjsgdGhpcy5pbmRleD1pbmRleDsgfVxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7IGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5za2lsbHNbdGhpcy5pbmRleF07XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogYE5vZGU6ICR7cy5uYW1lfWAgfSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIk5hbWVcIikuYWRkVGV4dCh0PT50LnNldFZhbHVlKHMubmFtZSkub25DaGFuZ2Uodj0+cy5uYW1lPXYpKTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiUnVzdCBTdGF0dXNcIikuc2V0RGVzYyhgU3RhY2tzOiAke3MucnVzdH1gKS5hZGRCdXR0b24oYj0+Yi5zZXRCdXR0b25UZXh0KFwiTWFudWFsIFBvbGlzaFwiKS5vbkNsaWNrKGFzeW5jKCk9Pnsgcy5ydXN0PTA7IHMueHBSZXE9TWF0aC5mbG9vcihzLnhwUmVxLzEuMSk7IGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5zYXZlKCk7IHRoaXMuY2xvc2UoKTsgbmV3IE5vdGljZShcIlJ1c3QgcG9saXNoZWQuXCIpOyB9KSk7XG4gICAgICAgIGNvbnN0IGRpdiA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoKTsgZGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luLXRvcDoyMHB4OyBkaXNwbGF5OmZsZXg7IGp1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO1wiKTtcbiAgICAgICAgY29uc3QgYlNhdmUgPSBkaXYuY3JlYXRlRWwoXCJidXR0b25cIiwge3RleHQ6XCJTYXZlXCJ9KTsgYlNhdmUuYWRkQ2xhc3MoXCJtb2QtY3RhXCIpOyBiU2F2ZS5vbmNsaWNrPWFzeW5jKCk9PnsgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLnNhdmUoKTsgdGhpcy5jbG9zZSgpOyB9O1xuICAgICAgICBjb25zdCBiRGVsID0gZGl2LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHt0ZXh0OlwiRGVsZXRlIE5vZGVcIn0pOyBiRGVsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJjb2xvcjpyZWQ7XCIpOyBiRGVsLm9uY2xpY2s9YXN5bmMoKT0+eyB0aGlzLnBsdWdpbi5zZXR0aW5ncy5za2lsbHMuc3BsaWNlKHRoaXMuaW5kZXgsIDEpOyBhd2FpdCB0aGlzLnBsdWdpbi5lbmdpbmUuc2F2ZSgpOyB0aGlzLmNsb3NlKCk7IH07XG4gICAgfVxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH1cbn1cblxuZXhwb3J0IGNsYXNzIFF1aWNrQ2FwdHVyZU1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHsgc3VwZXIoYXBwKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH1cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwi4pqhIFF1aWNrIENhcHR1cmVcIiB9KTtcbiAgICAgICAgY29uc3QgZGl2ID0gY29udGVudEVsLmNyZWF0ZURpdigpO1xuICAgICAgICBjb25zdCBpbnB1dCA9IGRpdi5jcmVhdGVFbChcImlucHV0XCIsIHsgdHlwZTogXCJ0ZXh0XCIsIGF0dHI6IHsgcGxhY2Vob2xkZXI6IFwiV2hhdCdzIG9uIHlvdXIgbWluZD9cIiwgc3R5bGU6IFwid2lkdGg6IDEwMCU7IHBhZGRpbmc6IDEwcHg7IGZvbnQtc2l6ZTogMS4yZW07IGJhY2tncm91bmQ6ICMyMjI7IGJvcmRlcjogMXB4IHNvbGlkICM0NDQ7IGNvbG9yOiAjZTBlMGUwO1wiIH0gfSk7XG4gICAgICAgIGlucHV0LmZvY3VzKCk7XG4gICAgICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCBhc3luYyAoZSkgPT4geyBpZiAoZS5rZXkgPT09IFwiRW50ZXJcIiAmJiBpbnB1dC52YWx1ZS50cmltKCkubGVuZ3RoID4gMCkgeyBhd2FpdCB0aGlzLnBsdWdpbi5lbmdpbmUuY3JlYXRlU2NyYXAoaW5wdXQudmFsdWUpOyB0aGlzLmNsb3NlKCk7IH0gfSk7XG4gICAgICAgIGNvbnN0IGJ0biA9IGNvbnRlbnRFbC5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQ2FwdHVyZSB0byBTY3JhcHNcIiB9KTtcbiAgICAgICAgYnRuLmFkZENsYXNzKFwibW9kLWN0YVwiKTtcbiAgICAgICAgYnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luLXRvcDogMTVweDsgd2lkdGg6IDEwMCU7XCIpO1xuICAgICAgICBidG4ub25jbGljayA9IGFzeW5jICgpID0+IHsgaWYgKGlucHV0LnZhbHVlLnRyaW0oKS5sZW5ndGggPiAwKSB7IGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5jcmVhdGVTY3JhcChpbnB1dC52YWx1ZSk7IHRoaXMuY2xvc2UoKTsgfSB9O1xuICAgIH1cbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9XG59XG5cbmV4cG9ydCBjbGFzcyBRdWVzdFRlbXBsYXRlTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjtcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikgeyBzdXBlcihhcHApOyB0aGlzLnBsdWdpbiA9IHBsdWdpbjsgfVxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCLimqEgUXVpY2sgRGVwbG95IFRlbXBsYXRlc1wiIH0pO1xuICAgICAgICBjb25zdCBncmlkID0gY29udGVudEVsLmNyZWF0ZURpdigpO1xuICAgICAgICBncmlkLnN0eWxlLmRpc3BsYXkgPSBcImdyaWRcIjsgZ3JpZC5zdHlsZS5ncmlkVGVtcGxhdGVDb2x1bW5zID0gXCIxZnIgMWZyXCI7IGdyaWQuc3R5bGUuZ2FwID0gXCIxMHB4XCI7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlcyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnF1ZXN0VGVtcGxhdGVzIHx8IFtdO1xuICAgICAgICBpZiAodGVtcGxhdGVzLmxlbmd0aCA9PT0gMCkgZ3JpZC5jcmVhdGVEaXYoeyB0ZXh0OiBcIk5vIHRlbXBsYXRlcyBmb3VuZC4gQ3JlYXRlIG9uZSBpbiBTZXR0aW5ncy5cIiB9KTtcbiAgICAgICAgdGVtcGxhdGVzLmZvckVhY2godGVtcGxhdGUgPT4ge1xuICAgICAgICAgICAgY29uc3QgYnRuID0gZ3JpZC5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IHRlbXBsYXRlLm5hbWUgfSk7XG4gICAgICAgICAgICBidG4uYWRkQ2xhc3MoXCJzaXN5LWJ0blwiKTsgYnRuLnN0eWxlLnRleHRBbGlnbiA9IFwibGVmdFwiOyBidG4uc3R5bGUucGFkZGluZyA9IFwiMTVweFwiO1xuICAgICAgICAgICAgYnRuLmNyZWF0ZURpdih7IHRleHQ6IGBEaWZmOiAke3RlbXBsYXRlLmRpZmZ9IHwgU2tpbGw6ICR7dGVtcGxhdGUuc2tpbGx9YCwgYXR0cjogeyBzdHlsZTogXCJmb250LXNpemU6IDAuOGVtOyBvcGFjaXR5OiAwLjc7IG1hcmdpbi10b3A6IDVweDtcIiB9IH0pO1xuICAgICAgICAgICAgYnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGRlYWRsaW5lID0gXCJcIjtcbiAgICAgICAgICAgICAgICBpZiAodGVtcGxhdGUuZGVhZGxpbmUuc3RhcnRzV2l0aChcIitcIikpIHsgY29uc3QgaG91cnMgPSBwYXJzZUludCh0ZW1wbGF0ZS5kZWFkbGluZS5yZXBsYWNlKFwiK1wiLCBcIlwiKS5yZXBsYWNlKFwiaFwiLCBcIlwiKSk7IGRlYWRsaW5lID0gbW9tZW50KCkuYWRkKGhvdXJzLCAnaG91cnMnKS50b0lTT1N0cmluZygpOyB9IFxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHRlbXBsYXRlLmRlYWRsaW5lLmluY2x1ZGVzKFwiOlwiKSkgeyBjb25zdCBbaCwgbV0gPSB0ZW1wbGF0ZS5kZWFkbGluZS5zcGxpdChcIjpcIik7IGRlYWRsaW5lID0gbW9tZW50KCkuc2V0KHsgaG91cjogcGFyc2VJbnQoaCksIG1pbnV0ZTogcGFyc2VJbnQobSkgfSkudG9JU09TdHJpbmcoKTsgaWYgKG1vbWVudCgpLmlzQWZ0ZXIoZGVhZGxpbmUpKSBkZWFkbGluZSA9IG1vbWVudChkZWFkbGluZSkuYWRkKDEsICdkYXknKS50b0lTT1N0cmluZygpOyB9IFxuICAgICAgICAgICAgICAgIGVsc2UgZGVhZGxpbmUgPSBtb21lbnQoKS5hZGQoMjQsICdob3VycycpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmNyZWF0ZVF1ZXN0KHRlbXBsYXRlLm5hbWUsIHRlbXBsYXRlLmRpZmYsIHRlbXBsYXRlLnNraWxsLCBcIk5vbmVcIiwgZGVhZGxpbmUsIGZhbHNlLCBcIk5vcm1hbFwiLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShgRGVwbG95ZWQ6ICR7dGVtcGxhdGUubmFtZX1gKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfVxufVxuXG5leHBvcnQgY2xhc3MgUmVzZWFyY2hRdWVzdE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47IHRpdGxlOiBzdHJpbmcgPSBcIlwiOyB0eXBlOiBcInN1cnZleVwiIHwgXCJkZWVwX2RpdmVcIiA9IFwic3VydmV5XCI7IGxpbmtlZFNraWxsOiBzdHJpbmcgPSBcIk5vbmVcIjsgbGlua2VkQ29tYmF0UXVlc3Q6IHN0cmluZyA9IFwiTm9uZVwiO1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9XG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpczsgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIlJFU0VBUkNIIERFUExPWU1FTlRcIiB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiUmVzZWFyY2ggVGl0bGVcIikuYWRkVGV4dCh0ID0+IHsgdC5vbkNoYW5nZSh2ID0+IHRoaXMudGl0bGUgPSB2KTsgc2V0VGltZW91dCgoKSA9PiB0LmlucHV0RWwuZm9jdXMoKSwgNTApOyB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiUmVzZWFyY2ggVHlwZVwiKS5hZGREcm9wZG93bihkID0+IGQuYWRkT3B0aW9uKFwic3VydmV5XCIsIFwiU3VydmV5ICgxMDAtMjAwIHdvcmRzKVwiKS5hZGRPcHRpb24oXCJkZWVwX2RpdmVcIiwgXCJEZWVwIERpdmUgKDIwMC00MDAgd29yZHMpXCIpLnNldFZhbHVlKFwic3VydmV5XCIpLm9uQ2hhbmdlKHYgPT4gdGhpcy50eXBlID0gdiBhcyBcInN1cnZleVwiIHwgXCJkZWVwX2RpdmVcIikpO1xuICAgICAgICBjb25zdCBza2lsbHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7IFwiTm9uZVwiOiBcIk5vbmVcIiB9OyB0aGlzLnBsdWdpbi5zZXR0aW5ncy5za2lsbHMuZm9yRWFjaChzID0+IHNraWxsc1tzLm5hbWVdID0gcy5uYW1lKTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiTGlua2VkIFNraWxsXCIpLmFkZERyb3Bkb3duKGQgPT4gZC5hZGRPcHRpb25zKHNraWxscykuc2V0VmFsdWUoXCJOb25lXCIpLm9uQ2hhbmdlKHYgPT4gdGhpcy5saW5rZWRTa2lsbCA9IHYpKTtcbiAgICAgICAgY29uc3QgY29tYmF0UXVlc3RzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyBcIk5vbmVcIjogXCJOb25lXCIgfTtcbiAgICAgICAgY29uc3QgcXVlc3RGb2xkZXIgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJBY3RpdmVfUnVuL1F1ZXN0c1wiKTtcbiAgICAgICAgaWYgKHF1ZXN0Rm9sZGVyIGluc3RhbmNlb2YgVEZvbGRlcikgeyBxdWVzdEZvbGRlci5jaGlsZHJlbi5mb3JFYWNoKGYgPT4geyBpZiAoZiBpbnN0YW5jZW9mIFRGaWxlICYmIGYuZXh0ZW5zaW9uID09PSBcIm1kXCIpIGNvbWJhdFF1ZXN0c1tmLmJhc2VuYW1lXSA9IGYuYmFzZW5hbWU7IH0pOyB9XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIkxpbmsgQ29tYmF0IFF1ZXN0XCIpLmFkZERyb3Bkb3duKGQgPT4gZC5hZGRPcHRpb25zKGNvbWJhdFF1ZXN0cykuc2V0VmFsdWUoXCJOb25lXCIpLm9uQ2hhbmdlKHYgPT4gdGhpcy5saW5rZWRDb21iYXRRdWVzdCA9IHYpKTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5hZGRCdXR0b24oYiA9PiBiLnNldEJ1dHRvblRleHQoXCJDUkVBVEUgUkVTRUFSQ0hcIikuc2V0Q3RhKCkub25DbGljaygoKSA9PiB7IGlmICh0aGlzLnRpdGxlKSB7IHRoaXMucGx1Z2luLmVuZ2luZS5jcmVhdGVSZXNlYXJjaFF1ZXN0KHRoaXMudGl0bGUsIHRoaXMudHlwZSwgdGhpcy5saW5rZWRTa2lsbCwgdGhpcy5saW5rZWRDb21iYXRRdWVzdCk7IHRoaXMuY2xvc2UoKTsgfSB9KSk7XG4gICAgfVxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlc2VhcmNoTGlzdE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHsgc3VwZXIoYXBwKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH1cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzOyBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiUkVTRUFSQ0ggTElCUkFSWVwiIH0pO1xuICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRSZXNlYXJjaFJhdGlvKCk7XG4gICAgICAgIGNvbnN0IHN0YXRzRWwgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktcmVzZWFyY2gtc3RhdHNcIiB9KTsgc3RhdHNFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgQ29tYmF0IFF1ZXN0czogJHtzdGF0cy5jb21iYXR9YCB9KTsgc3RhdHNFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgUmVzZWFyY2ggUXVlc3RzOiAke3N0YXRzLnJlc2VhcmNofWAgfSk7IHN0YXRzRWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFJhdGlvOiAke3N0YXRzLnJhdGlvfToxYCB9KTtcbiAgICAgICAgaWYgKCF0aGlzLnBsdWdpbi5lbmdpbmUuY2FuQ3JlYXRlUmVzZWFyY2hRdWVzdCgpKSB7IGNvbnN0IHdhcm5pbmcgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7IHdhcm5pbmcuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJjb2xvcjogb3JhbmdlOyBmb250LXdlaWdodDogYm9sZDsgbWFyZ2luOiAxMHB4IDA7XCIpOyB3YXJuaW5nLnNldFRleHQoXCJSRVNFQVJDSCBCTE9DS0VEOiBOZWVkIDI6MSBjb21iYXQgdG8gcmVzZWFyY2ggcmF0aW9cIik7IH1cbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkFjdGl2ZSBSZXNlYXJjaFwiIH0pO1xuICAgICAgICBjb25zdCBxdWVzdHMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maWx0ZXIocSA9PiAhcS5jb21wbGV0ZWQpO1xuICAgICAgICBpZiAocXVlc3RzLmxlbmd0aCA9PT0gMCkgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiTm8gYWN0aXZlIHJlc2VhcmNoIHF1ZXN0cy5cIiB9KTtcbiAgICAgICAgZWxzZSBxdWVzdHMuZm9yRWFjaCgocTogYW55KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjYXJkID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXJlc2VhcmNoLWNhcmRcIiB9KTsgY2FyZC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImJvcmRlcjogMXB4IHNvbGlkICM0NDQ7IHBhZGRpbmc6IDEwcHg7IG1hcmdpbjogNXB4IDA7IGJvcmRlci1yYWRpdXM6IDRweDtcIik7XG4gICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBjYXJkLmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiBxLnRpdGxlIH0pOyBoZWFkZXIuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDAgMCA1cHggMDtcIik7XG4gICAgICAgICAgICBjb25zdCBpbmZvID0gY2FyZC5jcmVhdGVFbChcImRpdlwiKTsgaW5mby5pbm5lckhUTUwgPSBgPGNvZGUgc3R5bGU9XCJjb2xvcjojYWE2NGZmXCI+JHtxLmlkfTwvY29kZT48YnI+VHlwZTogJHtxLnR5cGUgPT09IFwic3VydmV5XCIgPyBcIlN1cnZleVwiIDogXCJEZWVwIERpdmVcIn0gfCBXb3JkczogJHtxLndvcmRDb3VudH0vJHtxLndvcmRMaW1pdH1gOyBpbmZvLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZm9udC1zaXplOiAwLjllbTsgb3BhY2l0eTogMC44O1wiKTtcbiAgICAgICAgICAgIGNvbnN0IGFjdGlvbnMgPSBjYXJkLmNyZWF0ZURpdigpOyBhY3Rpb25zLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luLXRvcDogOHB4OyBkaXNwbGF5OiBmbGV4OyBnYXA6IDVweDtcIik7XG4gICAgICAgICAgICBjb25zdCBjb21wbGV0ZUJ0biA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkNPTVBMRVRFXCIgfSk7IGNvbXBsZXRlQnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZmxleDogMTsgcGFkZGluZzogNXB4OyBiYWNrZ3JvdW5kOiBncmVlbjsgY29sb3I6IHdoaXRlOyBib3JkZXI6IG5vbmU7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyO1wiKTsgY29tcGxldGVCdG4ub25jbGljayA9ICgpID0+IHsgdGhpcy5wbHVnaW4uZW5naW5lLmNvbXBsZXRlUmVzZWFyY2hRdWVzdChxLmlkLCBxLndvcmRDb3VudCk7IHRoaXMuY2xvc2UoKTsgfTtcbiAgICAgICAgICAgIGNvbnN0IGRlbGV0ZUJ0biA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkRFTEVURVwiIH0pOyBkZWxldGVCdG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmbGV4OiAxOyBwYWRkaW5nOiA1cHg7IGJhY2tncm91bmQ6IHJlZDsgY29sb3I6IHdoaXRlOyBib3JkZXI6IG5vbmU7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyO1wiKTsgZGVsZXRlQnRuLm9uY2xpY2sgPSAoKSA9PiB7IHRoaXMucGx1Z2luLmVuZ2luZS5kZWxldGVSZXNlYXJjaFF1ZXN0KHEuaWQpOyB0aGlzLmNsb3NlKCk7IH07XG4gICAgICAgIH0pO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiQ29tcGxldGVkIFJlc2VhcmNoXCIgfSk7XG4gICAgICAgIGNvbnN0IGNvbXBsZXRlZCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbHRlcihxID0+IHEuY29tcGxldGVkKTtcbiAgICAgICAgaWYgKGNvbXBsZXRlZC5sZW5ndGggPT09IDApIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk5vIGNvbXBsZXRlZCByZXNlYXJjaC5cIiB9KTtcbiAgICAgICAgZWxzZSBjb21wbGV0ZWQuZm9yRWFjaCgocTogYW55KSA9PiB7IGNvbnN0IGl0ZW0gPSBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIpOyBpdGVtLnNldFRleHQoYCsgJHtxLnRpdGxlfSAoJHtxLnR5cGUgPT09IFwic3VydmV5XCIgPyBcIlN1cnZleVwiIDogXCJEZWVwIERpdmVcIn0pYCk7IGl0ZW0uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJvcGFjaXR5OiAwLjY7IGZvbnQtc2l6ZTogMC45ZW07XCIpOyB9KTtcbiAgICB9XG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfVxufVxuXG5leHBvcnQgY2xhc3MgQ2hhaW5CdWlsZGVyTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjsgY2hhaW5OYW1lOiBzdHJpbmcgPSBcIlwiOyBzZWxlY3RlZFF1ZXN0czogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikgeyBzdXBlcihhcHApOyB0aGlzLnBsdWdpbiA9IHBsdWdpbjsgfVxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7IGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJDSEFJTiBCVUlMREVSXCIgfSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIkNoYWluIE5hbWVcIikuYWRkVGV4dCh0ID0+IHsgdC5vbkNoYW5nZSh2ID0+IHRoaXMuY2hhaW5OYW1lID0gdik7IHNldFRpbWVvdXQoKCkgPT4gdC5pbnB1dEVsLmZvY3VzKCksIDUwKTsgfSk7XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJTZWxlY3QgUXVlc3RzXCIgfSk7XG4gICAgICAgIGNvbnN0IHF1ZXN0Rm9sZGVyID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiQWN0aXZlX1J1bi9RdWVzdHNcIik7XG4gICAgICAgIGNvbnN0IHF1ZXN0czogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgaWYgKHF1ZXN0Rm9sZGVyIGluc3RhbmNlb2YgVEZvbGRlcikgeyBxdWVzdEZvbGRlci5jaGlsZHJlbi5mb3JFYWNoKGYgPT4geyBpZiAoZiBpbnN0YW5jZW9mIFRGaWxlICYmIGYuZXh0ZW5zaW9uID09PSBcIm1kXCIpIHF1ZXN0cy5wdXNoKGYuYmFzZW5hbWUpOyB9KTsgfVxuICAgICAgICBxdWVzdHMuZm9yRWFjaCgocXVlc3QsIGlkeCkgPT4geyBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUocXVlc3QpLmFkZFRvZ2dsZSh0ID0+IHQub25DaGFuZ2UodiA9PiB7IGlmICh2KSB0aGlzLnNlbGVjdGVkUXVlc3RzLnB1c2gocXVlc3QpOyBlbHNlIHRoaXMuc2VsZWN0ZWRRdWVzdHMgPSB0aGlzLnNlbGVjdGVkUXVlc3RzLmZpbHRlcihxID0+IHEgIT09IHF1ZXN0KTsgfSkpOyB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5hZGRCdXR0b24oYiA9PiBiLnNldEJ1dHRvblRleHQoXCJDUkVBVEUgQ0hBSU5cIikuc2V0Q3RhKCkub25DbGljayhhc3luYyAoKSA9PiB7IGlmICh0aGlzLmNoYWluTmFtZSAmJiB0aGlzLnNlbGVjdGVkUXVlc3RzLmxlbmd0aCA+PSAyKSB7IGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5jcmVhdGVRdWVzdENoYWluKHRoaXMuY2hhaW5OYW1lLCB0aGlzLnNlbGVjdGVkUXVlc3RzKTsgdGhpcy5jbG9zZSgpOyB9IGVsc2UgbmV3IE5vdGljZShcIkNoYWluIG5lZWRzIGEgbmFtZSBhbmQgYXQgbGVhc3QgMiBxdWVzdHNcIik7IH0pKTtcbiAgICB9XG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfVxufVxuXG5leHBvcnQgY2xhc3MgVmljdG9yeU1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHsgc3VwZXIoYXBwKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH1cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzOyBjb250ZW50RWwuYWRkQ2xhc3MoXCJzaXN5LXZpY3RvcnktbW9kYWxcIik7XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgxXCIsIHsgdGV4dDogXCJBU0NFTlNJT04gQUNISUVWRURcIiwgY2xzOiBcInNpc3ktdmljdG9yeS10aXRsZVwiIH0pO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJkaXZcIiwgeyB0ZXh0OiBcIvCfj4ZcIiwgYXR0cjogeyBzdHlsZTogXCJmb250LXNpemU6IDYwcHg7IG1hcmdpbjogMjBweCAwO1wiIH0gfSk7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gY29udGVudEVsLmNyZWF0ZURpdigpOyBjb25zdCBsZWdhY3kgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sZWdhY3k7IGNvbnN0IG1ldHJpY3MgPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0R2FtZVN0YXRzKCk7XG4gICAgICAgIHRoaXMuc3RhdExpbmUoc3RhdHMsIFwiRmluYWwgTGV2ZWxcIiwgXCI1MFwiKTsgdGhpcy5zdGF0TGluZShzdGF0cywgXCJUb3RhbCBRdWVzdHNcIiwgYCR7bWV0cmljcy50b3RhbFF1ZXN0c31gKTsgdGhpcy5zdGF0TGluZShzdGF0cywgXCJEZWF0aHMgRW5kdXJlZFwiLCBgJHtsZWdhY3kuZGVhdGhDb3VudH1gKTsgdGhpcy5zdGF0TGluZShzdGF0cywgXCJMb25nZXN0IFN0cmVha1wiLCBgJHttZXRyaWNzLmxvbmdlc3RTdHJlYWt9IGRheXNgKTtcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiT25lIG11c3QgaW1hZ2luZSBTaXN5cGh1cyBoYXBweS4gWW91IGhhdmUgcHVzaGVkIHRoZSBib3VsZGVyIHRvIHRoZSBwZWFrLlwiLCBhdHRyOiB7IHN0eWxlOiBcIm1hcmdpbjogMzBweCAwOyBmb250LXN0eWxlOiBpdGFsaWM7IG9wYWNpdHk6IDAuODtcIiB9IH0pO1xuICAgICAgICBjb25zdCBidG4gPSBjb250ZW50RWwuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkJFR0lOIE5FVyBHQU1FK1wiIH0pOyBidG4uYWRkQ2xhc3MoXCJtb2QtY3RhXCIpOyBidG4uc3R5bGUud2lkdGggPSBcIjEwMCVcIjsgYnRuLm9uY2xpY2sgPSAoKSA9PiB7IHRoaXMuY2xvc2UoKTsgfTtcbiAgICB9XG4gICAgc3RhdExpbmUoZWw6IEhUTUxFbGVtZW50LCBsYWJlbDogc3RyaW5nLCB2YWw6IHN0cmluZykgeyBjb25zdCBsaW5lID0gZWwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktdmljdG9yeS1zdGF0XCIgfSk7IGxpbmUuaW5uZXJIVE1MID0gYCR7bGFiZWx9OiA8c3BhbiBjbGFzcz1cInNpc3ktdmljdG9yeS1oaWdobGlnaHRcIj4ke3ZhbH08L3NwYW4+YDsgfVxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH1cbn1cblxuZXhwb3J0IGNsYXNzIFRlbXBsYXRlTWFuYWdlck1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG4gICAgbmV3TmFtZTogc3RyaW5nID0gXCJcIjtcbiAgICBuZXdEaWZmOiBudW1iZXIgPSAxO1xuICAgIG5ld1NraWxsOiBzdHJpbmcgPSBcIk5vbmVcIjtcbiAgICBuZXdEZWFkbGluZTogc3RyaW5nID0gXCIrMmhcIjtcblxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgIH1cblxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgfVxuXG4gICAgZGlzcGxheSgpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiTWFuYWdlIFRlbXBsYXRlc1wiIH0pO1xuXG4gICAgICAgIC8vIDEuIExpc3QgRXhpc3RpbmcgVGVtcGxhdGVzXG4gICAgICAgIGNvbnN0IGxpc3REaXYgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7XG4gICAgICAgIGxpc3REaXYuc3R5bGUubWFyZ2luQm90dG9tID0gXCIyMHB4XCI7XG4gICAgICAgIGxpc3REaXYuc3R5bGUubWF4SGVpZ2h0ID0gXCIzMDBweFwiO1xuICAgICAgICBsaXN0RGl2LnN0eWxlLm92ZXJmbG93WSA9IFwiYXV0b1wiO1xuXG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnF1ZXN0VGVtcGxhdGVzLmZvckVhY2goKHQsIGlkeCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gbGlzdERpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgIHJvdy5zdHlsZS5kaXNwbGF5ID0gXCJmbGV4XCI7XG4gICAgICAgICAgICByb3cuc3R5bGUuanVzdGlmeUNvbnRlbnQgPSBcInNwYWNlLWJldHdlZW5cIjtcbiAgICAgICAgICAgIHJvdy5zdHlsZS5hbGlnbkl0ZW1zID0gXCJjZW50ZXJcIjtcbiAgICAgICAgICAgIHJvdy5zdHlsZS5wYWRkaW5nID0gXCIxMHB4XCI7XG4gICAgICAgICAgICByb3cuc3R5bGUuYm9yZGVyQm90dG9tID0gXCIxcHggc29saWQgIzMzM1wiO1xuXG4gICAgICAgICAgICByb3cuY3JlYXRlRGl2KHsgdGV4dDogYCR7dC5uYW1lfSAoRCR7dC5kaWZmfSwgJHt0LnNraWxsfSwgJHt0LmRlYWRsaW5lfSlgIH0pO1xuXG4gICAgICAgICAgICBjb25zdCBkZWxCdG4gPSByb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkRlbGV0ZVwiIH0pO1xuICAgICAgICAgICAgZGVsQnRuLnN0eWxlLmNvbG9yID0gXCJyZWRcIjtcbiAgICAgICAgICAgIGRlbEJ0bi5vbmNsaWNrID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnF1ZXN0VGVtcGxhdGVzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGxheSgpOyAvLyBSZWZyZXNoIFVJXG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyAyLiBBZGQgTmV3IFRlbXBsYXRlIEZvcm1cbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkFkZCBOZXcgVGVtcGxhdGVcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIk5hbWVcIikuYWRkVGV4dCh0ID0+IHQub25DaGFuZ2UodiA9PiB0aGlzLm5ld05hbWUgPSB2KSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIkRpZmZpY3VsdHkgKDEtNSlcIikuYWRkVGV4dCh0ID0+IHQuc2V0VmFsdWUoXCIxXCIpLm9uQ2hhbmdlKHYgPT4gdGhpcy5uZXdEaWZmID0gcGFyc2VJbnQodikpKTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiU2tpbGxcIikuYWRkVGV4dCh0ID0+IHQuc2V0VmFsdWUoXCJOb25lXCIpLm9uQ2hhbmdlKHYgPT4gdGhpcy5uZXdTa2lsbCA9IHYpKTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiRGVhZGxpbmVcIikuc2V0RGVzYyhcIkZvcm1hdDogJzEwOjAwJyBvciAnKzJoJ1wiKS5hZGRUZXh0KHQgPT4gdC5zZXRWYWx1ZShcIisyaFwiKS5vbkNoYW5nZSh2ID0+IHRoaXMubmV3RGVhZGxpbmUgPSB2KSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5hZGRCdXR0b24oYiA9PiBiXG4gICAgICAgICAgICAuc2V0QnV0dG9uVGV4dChcIkFkZCBUZW1wbGF0ZVwiKVxuICAgICAgICAgICAgLnNldEN0YSgpXG4gICAgICAgICAgICAub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLm5ld05hbWUpIHJldHVybjtcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWVzdFRlbXBsYXRlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogdGhpcy5uZXdOYW1lLFxuICAgICAgICAgICAgICAgICAgICBkaWZmOiB0aGlzLm5ld0RpZmYsXG4gICAgICAgICAgICAgICAgICAgIHNraWxsOiB0aGlzLm5ld1NraWxsLFxuICAgICAgICAgICAgICAgICAgICBkZWFkbGluZTogdGhpcy5uZXdEZWFkbGluZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGxheSgpOyAvLyBSZWZyZXNoIFVJIHRvIHNob3cgbmV3IGl0ZW1cbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKFwiVGVtcGxhdGUgYWRkZWQuXCIpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlc2V0IGZpZWxkc1xuICAgICAgICAgICAgICAgIHRoaXMubmV3TmFtZSA9IFwiXCI7XG4gICAgICAgICAgICB9KSk7XG4gICAgfVxuXG4gICAgb25DbG9zZSgpIHtcbiAgICAgICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBBY2hpZXZlbWVudCB9IGZyb20gJy4vdHlwZXMnO1xuXG5leHBvcnQgY29uc3QgQUNISUVWRU1FTlRfREVGSU5JVElPTlM6IE9taXQ8QWNoaWV2ZW1lbnQsIFwidW5sb2NrZWRcIiB8IFwidW5sb2NrZWRBdFwiPltdID0gW1xuICAgIC8vIC0tLSBFQVJMWSBHQU1FIC0tLVxuICAgIHsgaWQ6IFwiZmlyc3RfYmxvb2RcIiwgbmFtZTogXCJGaXJzdCBCbG9vZFwiLCBkZXNjcmlwdGlvbjogXCJDb21wbGV0ZSB5b3VyIGZpcnN0IHF1ZXN0LlwiLCByYXJpdHk6IFwiY29tbW9uXCIgfSxcbiAgICB7IGlkOiBcIndlZWtfd2FycmlvclwiLCBuYW1lOiBcIldlZWsgV2FycmlvclwiLCBkZXNjcmlwdGlvbjogXCJNYWludGFpbiBhIDctZGF5IHN0cmVhay5cIiwgcmFyaXR5OiBcImNvbW1vblwiIH0sXG4gICAgeyBpZDogXCJ3YXJtX3VwXCIsIG5hbWU6IFwiV2FybSBVcFwiLCBkZXNjcmlwdGlvbjogXCJDb21wbGV0ZSAxMCB0b3RhbCBxdWVzdHMuXCIsIHJhcml0eTogXCJjb21tb25cIiB9LFxuXG4gICAgLy8gLS0tIE1JRCBHQU1FIC0tLVxuICAgIHsgaWQ6IFwic2tpbGxfYWRlcHRcIiwgbmFtZTogXCJBcHByZW50aWNlXCIsIGRlc2NyaXB0aW9uOiBcIlJlYWNoIExldmVsIDUgaW4gYW55IHNraWxsLlwiLCByYXJpdHk6IFwicmFyZVwiIH0sXG4gICAgeyBpZDogXCJjaGFpbl9nYW5nXCIsIG5hbWU6IFwiQ2hhaW4gR2FuZ1wiLCBkZXNjcmlwdGlvbjogXCJDb21wbGV0ZSBhIFF1ZXN0IENoYWluLlwiLCByYXJpdHk6IFwicmFyZVwiIH0sXG4gICAgeyBpZDogXCJyZXNlYXJjaGVyXCIsIG5hbWU6IFwiU2Nob2xhclwiLCBkZXNjcmlwdGlvbjogXCJDb21wbGV0ZSA1IFJlc2VhcmNoIFF1ZXN0cy5cIiwgcmFyaXR5OiBcInJhcmVcIiB9LFxuICAgIHsgaWQ6IFwicmljaFwiLCBuYW1lOiBcIkNhcGl0YWxpc3RcIiwgZGVzY3JpcHRpb246IFwiSG9sZCA1MDAgZ29sZCBhdCBvbmNlLlwiLCByYXJpdHk6IFwicmFyZVwiIH0sXG5cbiAgICAvLyAtLS0gRU5EIEdBTUUgLS0tXG4gICAgeyBpZDogXCJib3NzX3NsYXllclwiLCBuYW1lOiBcIkdpYW50IFNsYXllclwiLCBkZXNjcmlwdGlvbjogXCJEZWZlYXQgeW91ciBmaXJzdCBCb3NzLlwiLCByYXJpdHk6IFwiZXBpY1wiIH0sXG4gICAgeyBpZDogXCJhc2NlbmRlZFwiLCBuYW1lOiBcIlNpc3lwaHVzIEhhcHB5XCIsIGRlc2NyaXB0aW9uOiBcIlJlYWNoIExldmVsIDUwLlwiLCByYXJpdHk6IFwibGVnZW5kYXJ5XCIgfSxcbiAgICB7IGlkOiBcImltbW9ydGFsXCIsIG5hbWU6IFwiSW1tb3J0YWxcIiwgZGVzY3JpcHRpb246IFwiUmVhY2ggTGV2ZWwgMjAgd2l0aCAwIERlYXRocy5cIiwgcmFyaXR5OiBcImxlZ2VuZGFyeVwiIH1cbl07XG4iLCJpbXBvcnQgeyBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBEYXlNZXRyaWNzLCBXZWVrbHlSZXBvcnQsIEJvc3NNaWxlc3RvbmUsIFN0cmVhaywgQWNoaWV2ZW1lbnQgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBBQ0hJRVZFTUVOVF9ERUZJTklUSU9OUyB9IGZyb20gJy4uL2FjaGlldmVtZW50cyc7XG5cbmV4cG9ydCBjbGFzcyBBbmFseXRpY3NFbmdpbmUge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIGF1ZGlvQ29udHJvbGxlcj86IGFueTtcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzLCBhdWRpb0NvbnRyb2xsZXI/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlciA9IGF1ZGlvQ29udHJvbGxlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFbnN1cmUgYWxsIGFjaGlldmVtZW50cyBleGlzdCBpbiBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVBY2hpZXZlbWVudHMoKSB7XG4gICAgICAgIC8vIElmIGFjaGlldmVtZW50cyBhcnJheSBpcyBlbXB0eSBvciBtaXNzaW5nIGRlZmluaXRpb25zLCBzeW5jIGl0XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5hY2hpZXZlbWVudHMpIHRoaXMuc2V0dGluZ3MuYWNoaWV2ZW1lbnRzID0gW107XG5cbiAgICAgICAgQUNISUVWRU1FTlRfREVGSU5JVElPTlMuZm9yRWFjaChkZWYgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXhpc3RzID0gdGhpcy5zZXR0aW5ncy5hY2hpZXZlbWVudHMuZmluZChhID0+IGEuaWQgPT09IGRlZi5pZCk7XG4gICAgICAgICAgICBpZiAoIWV4aXN0cykge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuYWNoaWV2ZW1lbnRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAuLi5kZWYsXG4gICAgICAgICAgICAgICAgICAgIHVubG9ja2VkOiBmYWxzZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB0cmFja0RhaWx5TWV0cmljcyh0eXBlOiAncXVlc3RfY29tcGxldGUnIHwgJ3F1ZXN0X2ZhaWwnIHwgJ3hwJyB8ICdnb2xkJyB8ICdkYW1hZ2UnIHwgJ3NraWxsX2xldmVsJyB8ICdjaGFpbl9jb21wbGV0ZScsIGFtb3VudDogbnVtYmVyID0gMSkge1xuICAgICAgICBjb25zdCB0b2RheSA9IG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIFxuICAgICAgICBsZXQgbWV0cmljID0gdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzLmZpbmQobSA9PiBtLmRhdGUgPT09IHRvZGF5KTtcbiAgICAgICAgaWYgKCFtZXRyaWMpIHtcbiAgICAgICAgICAgIG1ldHJpYyA9IHsgZGF0ZTogdG9kYXksIHF1ZXN0c0NvbXBsZXRlZDogMCwgcXVlc3RzRmFpbGVkOiAwLCB4cEVhcm5lZDogMCwgZ29sZEVhcm5lZDogMCwgZGFtYWdlc1Rha2VuOiAwLCBza2lsbHNMZXZlbGVkOiBbXSwgY2hhaW5zQ29tcGxldGVkOiAwIH07XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MucHVzaChtZXRyaWMpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgXCJxdWVzdF9jb21wbGV0ZVwiOiBtZXRyaWMucXVlc3RzQ29tcGxldGVkICs9IGFtb3VudDsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwicXVlc3RfZmFpbFwiOiBtZXRyaWMucXVlc3RzRmFpbGVkICs9IGFtb3VudDsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwieHBcIjogbWV0cmljLnhwRWFybmVkICs9IGFtb3VudDsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiZ29sZFwiOiBtZXRyaWMuZ29sZEVhcm5lZCArPSBhbW91bnQ7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImRhbWFnZVwiOiBtZXRyaWMuZGFtYWdlc1Rha2VuICs9IGFtb3VudDsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwic2tpbGxfbGV2ZWxcIjogbWV0cmljLnNraWxsc0xldmVsZWQucHVzaChcIlNraWxsIGxldmVsZWRcIik7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImNoYWluX2NvbXBsZXRlXCI6IG1ldHJpYy5jaGFpbnNDb21wbGV0ZWQgKz0gYW1vdW50OyBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXIgQWNoaWV2ZW1lbnQgQ2hlY2sgYWZ0ZXIgZXZlcnkgbWV0cmljIHVwZGF0ZVxuICAgICAgICB0aGlzLmNoZWNrQWNoaWV2ZW1lbnRzKCk7XG4gICAgfVxuXG4gIHVwZGF0ZVN0cmVhaygpIHtcbiAgICAgICAgY29uc3QgdG9kYXkgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBjb25zdCBsYXN0RGF0ZSA9IHRoaXMuc2V0dGluZ3Muc3RyZWFrLmxhc3REYXRlO1xuICAgICAgICBcbiAgICAgICAgaWYgKGxhc3REYXRlICE9PSB0b2RheSkge1xuICAgICAgICAgICAgY29uc3QgeWVzdGVyZGF5ID0gbW9tZW50KCkuc3VidHJhY3QoMSwgJ2RheScpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgICAgICBpZiAobGFzdERhdGUgPT09IHllc3RlcmRheSkge1xuICAgICAgICAgICAgICAgIC8vIENvbnRpbnVlZCBmcm9tIHllc3RlcmRheVxuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc3RyZWFrLmN1cnJlbnQrKztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIWxhc3REYXRlKSB7XG4gICAgICAgICAgICAgICAgLy8gRmlyc3QgZXZlciBxdWVzdFxuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc3RyZWFrLmN1cnJlbnQgPSAxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBCcm9rZW4gc3RyZWFrXG4gICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5zdHJlYWsuY3VycmVudCA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0aGlzLnNldHRpbmdzLnN0cmVhay5jdXJyZW50ID4gdGhpcy5zZXR0aW5ncy5zdHJlYWsubG9uZ2VzdCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc3RyZWFrLmxvbmdlc3QgPSB0aGlzLnNldHRpbmdzLnN0cmVhay5jdXJyZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnN0cmVhay5sYXN0RGF0ZSA9IHRvZGF5O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBbHdheXMgY2hlY2sgYWNoaWV2ZW1lbnRzXG4gICAgICAgIHRoaXMuY2hlY2tBY2hpZXZlbWVudHMoKTtcbiAgICB9XG5cbiAgICBjaGVja0FjaGlldmVtZW50cygpIHtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplQWNoaWV2ZW1lbnRzKCk7XG4gICAgICAgIGNvbnN0IHMgPSB0aGlzLnNldHRpbmdzO1xuICAgICAgICBjb25zdCB0b3RhbFF1ZXN0cyA9IHMuZGF5TWV0cmljcy5yZWR1Y2UoKHN1bSwgbSkgPT4gc3VtICsgbS5xdWVzdHNDb21wbGV0ZWQsIDApO1xuXG4gICAgICAgIC8vIDEuIEZpcnN0IEJsb29kXG4gICAgICAgIGlmICh0b3RhbFF1ZXN0cyA+PSAxKSB0aGlzLnVubG9jayhcImZpcnN0X2Jsb29kXCIpO1xuXG4gICAgICAgIC8vIDIuIFdhcm0gVXBcbiAgICAgICAgaWYgKHRvdGFsUXVlc3RzID49IDEwKSB0aGlzLnVubG9jayhcIndhcm1fdXBcIik7XG5cbiAgICAgICAgLy8gMy4gV2VlayBXYXJyaW9yXG4gICAgICAgIGlmIChzLnN0cmVhay5jdXJyZW50ID49IDcpIHRoaXMudW5sb2NrKFwid2Vla193YXJyaW9yXCIpO1xuXG4gICAgICAgIC8vIDQuIFNraWxsIEFkZXB0XG4gICAgICAgIGlmIChzLnNraWxscy5zb21lKHNraWxsID0+IHNraWxsLmxldmVsID49IDUpKSB0aGlzLnVubG9jayhcInNraWxsX2FkZXB0XCIpO1xuXG4gICAgICAgIC8vIDUuIENoYWluIEdhbmdcbiAgICAgICAgaWYgKHMuY2hhaW5IaXN0b3J5Lmxlbmd0aCA+PSAxKSB0aGlzLnVubG9jayhcImNoYWluX2dhbmdcIik7XG5cbiAgICAgICAgLy8gNi4gUmVzZWFyY2hlclxuICAgICAgICBpZiAocy5yZXNlYXJjaFN0YXRzLnJlc2VhcmNoQ29tcGxldGVkID49IDUpIHRoaXMudW5sb2NrKFwicmVzZWFyY2hlclwiKTtcblxuICAgICAgICAvLyA3LiBDYXBpdGFsaXN0XG4gICAgICAgIGlmIChzLmdvbGQgPj0gNTAwKSB0aGlzLnVubG9jayhcInJpY2hcIik7XG5cbiAgICAgICAgLy8gOC4gR2lhbnQgU2xheWVyXG4gICAgICAgIGlmIChzLmJvc3NNaWxlc3RvbmVzLnNvbWUoYiA9PiBiLmRlZmVhdGVkKSkgdGhpcy51bmxvY2soXCJib3NzX3NsYXllclwiKTtcblxuICAgICAgICAvLyA5LiBBc2NlbmRlZFxuICAgICAgICBpZiAocy5sZXZlbCA+PSA1MCkgdGhpcy51bmxvY2soXCJhc2NlbmRlZFwiKTtcblxuICAgICAgICAvLyAxMC4gSW1tb3J0YWxcbiAgICAgICAgaWYgKHMubGV2ZWwgPj0gMjAgJiYgcy5sZWdhY3kuZGVhdGhDb3VudCA9PT0gMCkgdGhpcy51bmxvY2soXCJpbW1vcnRhbFwiKTtcbiAgICB9XG5cbiAgICB1bmxvY2soaWQ6IHN0cmluZykge1xuICAgICAgICBjb25zdCBhY2ggPSB0aGlzLnNldHRpbmdzLmFjaGlldmVtZW50cy5maW5kKGEgPT4gYS5pZCA9PT0gaWQpO1xuICAgICAgICBpZiAoYWNoICYmICFhY2gudW5sb2NrZWQpIHtcbiAgICAgICAgICAgIGFjaC51bmxvY2tlZCA9IHRydWU7XG4gICAgICAgICAgICBhY2gudW5sb2NrZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcikgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgICAgIC8vIFdlIHJldHVybiB0cnVlIHNvIHRoZSBjYWxsZXIgY2FuIHNob3cgYSBub3RpY2UgaWYgdGhleSB3YW50LCBcbiAgICAgICAgICAgIC8vIHRob3VnaCB1c3VhbGx5IHRoZSBOb3RpY2UgaXMgYmV0dGVyIGhhbmRsZWQgaGVyZSBpZiB3ZSBoYWQgYWNjZXNzIHRvIHRoYXQgQVBJIGVhc2lseSwgXG4gICAgICAgICAgICAvLyBvciBsZXQgdGhlIGVuZ2luZSBoYW5kbGUgdGhlIG5vdGlmaWNhdGlvbi5cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIC4uLiAoS2VlcCBleGlzdGluZyBib3NzL3JlcG9ydCBtZXRob2RzIGJlbG93IGFzIHRoZXkgd2VyZSkgLi4uXG4gICAgaW5pdGlhbGl6ZUJvc3NNaWxlc3RvbmVzKCkge1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMgPSBbXG4gICAgICAgICAgICAgICAgeyBsZXZlbDogMTAsIG5hbWU6IFwiVGhlIEZpcnN0IFRyaWFsXCIsIHVubG9ja2VkOiBmYWxzZSwgZGVmZWF0ZWQ6IGZhbHNlLCB4cFJld2FyZDogNTAwIH0sXG4gICAgICAgICAgICAgICAgeyBsZXZlbDogMjAsIG5hbWU6IFwiVGhlIE5lbWVzaXMgUmV0dXJuc1wiLCB1bmxvY2tlZDogZmFsc2UsIGRlZmVhdGVkOiBmYWxzZSwgeHBSZXdhcmQ6IDEwMDAgfSxcbiAgICAgICAgICAgICAgICB7IGxldmVsOiAzMCwgbmFtZTogXCJUaGUgUmVhcGVyIEF3YWtlbnNcIiwgdW5sb2NrZWQ6IGZhbHNlLCBkZWZlYXRlZDogZmFsc2UsIHhwUmV3YXJkOiAxNTAwIH0sXG4gICAgICAgICAgICAgICAgeyBsZXZlbDogNTAsIG5hbWU6IFwiVGhlIEZpbmFsIEFzY2Vuc2lvblwiLCB1bmxvY2tlZDogZmFsc2UsIGRlZmVhdGVkOiBmYWxzZSwgeHBSZXdhcmQ6IDUwMDAgfVxuICAgICAgICAgICAgXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNoZWNrQm9zc01pbGVzdG9uZXMoKTogc3RyaW5nW10ge1xuICAgICAgICBjb25zdCBtZXNzYWdlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzIHx8IHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMubGVuZ3RoID09PSAwKSB0aGlzLmluaXRpYWxpemVCb3NzTWlsZXN0b25lcygpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcy5mb3JFYWNoKChib3NzOiBCb3NzTWlsZXN0b25lKSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5sZXZlbCA+PSBib3NzLmxldmVsICYmICFib3NzLnVubG9ja2VkKSB7XG4gICAgICAgICAgICAgICAgYm9zcy51bmxvY2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgbWVzc2FnZXMucHVzaChgQm9zcyBVbmxvY2tlZDogJHtib3NzLm5hbWV9IChMZXZlbCAke2Jvc3MubGV2ZWx9KWApO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcikgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBtZXNzYWdlcztcbiAgICB9XG5cbiAgICBkZWZlYXRCb3NzKGxldmVsOiBudW1iZXIpOiB7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgeHBSZXdhcmQ6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgYm9zcyA9IHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMuZmluZCgoYjogQm9zc01pbGVzdG9uZSkgPT4gYi5sZXZlbCA9PT0gbGV2ZWwpO1xuICAgICAgICBpZiAoIWJvc3MpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIkJvc3Mgbm90IGZvdW5kXCIsIHhwUmV3YXJkOiAwIH07XG4gICAgICAgIGlmIChib3NzLmRlZmVhdGVkKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJCb3NzIGFscmVhZHkgZGVmZWF0ZWRcIiwgeHBSZXdhcmQ6IDAgfTtcbiAgICAgICAgXG4gICAgICAgIGJvc3MuZGVmZWF0ZWQgPSB0cnVlO1xuICAgICAgICBib3NzLmRlZmVhdGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MueHAgKz0gYm9zcy54cFJld2FyZDtcbiAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyKSB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICBpZiAobGV2ZWwgPT09IDUwKSB0aGlzLndpbkdhbWUoKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBCb3NzIERlZmVhdGVkOiAke2Jvc3MubmFtZX0hICske2Jvc3MueHBSZXdhcmR9IFhQYCwgeHBSZXdhcmQ6IGJvc3MueHBSZXdhcmQgfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHdpbkdhbWUoKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZ2FtZVdvbiA9IHRydWU7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZW5kR2FtZURhdGUgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcikgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICB9XG5cbiAgICBnZW5lcmF0ZVdlZWtseVJlcG9ydCgpOiBXZWVrbHlSZXBvcnQge1xuICAgICAgICBjb25zdCB3ZWVrID0gbW9tZW50KCkud2VlaygpO1xuICAgICAgICBjb25zdCBzdGFydERhdGUgPSBtb21lbnQoKS5zdGFydE9mKCd3ZWVrJykuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgY29uc3QgZW5kRGF0ZSA9IG1vbWVudCgpLmVuZE9mKCd3ZWVrJykuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdlZWtNZXRyaWNzID0gdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzLmZpbHRlcigobTogRGF5TWV0cmljcykgPT4gXG4gICAgICAgICAgICBtb21lbnQobS5kYXRlKS5pc0JldHdlZW4obW9tZW50KHN0YXJ0RGF0ZSksIG1vbWVudChlbmREYXRlKSwgbnVsbCwgJ1tdJylcbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRvdGFsUXVlc3RzID0gd2Vla01ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogRGF5TWV0cmljcykgPT4gc3VtICsgbS5xdWVzdHNDb21wbGV0ZWQsIDApO1xuICAgICAgICBjb25zdCB0b3RhbEZhaWxlZCA9IHdlZWtNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0ucXVlc3RzRmFpbGVkLCAwKTtcbiAgICAgICAgY29uc3Qgc3VjY2Vzc1JhdGUgPSB0b3RhbFF1ZXN0cyArIHRvdGFsRmFpbGVkID4gMCA/IE1hdGgucm91bmQoKHRvdGFsUXVlc3RzIC8gKHRvdGFsUXVlc3RzICsgdG90YWxGYWlsZWQpKSAqIDEwMCkgOiAwO1xuICAgICAgICBjb25zdCB0b3RhbFhwID0gd2Vla01ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogRGF5TWV0cmljcykgPT4gc3VtICsgbS54cEVhcm5lZCwgMCk7XG4gICAgICAgIGNvbnN0IHRvdGFsR29sZCA9IHdlZWtNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0uZ29sZEVhcm5lZCwgMCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0b3BTa2lsbHMgPSB0aGlzLnNldHRpbmdzLnNraWxscy5zb3J0KChhOiBhbnksIGI6IGFueSkgPT4gKGIubGV2ZWwgLSBhLmxldmVsKSkuc2xpY2UoMCwgMykubWFwKChzOiBhbnkpID0+IHMubmFtZSk7XG4gICAgICAgIGNvbnN0IGJlc3REYXkgPSB3ZWVrTWV0cmljcy5sZW5ndGggPiAwID8gd2Vla01ldHJpY3MucmVkdWNlKChtYXg6IERheU1ldHJpY3MsIG06IERheU1ldHJpY3MpID0+IG0ucXVlc3RzQ29tcGxldGVkID4gbWF4LnF1ZXN0c0NvbXBsZXRlZCA/IG0gOiBtYXgpLmRhdGUgOiBzdGFydERhdGU7XG4gICAgICAgIGNvbnN0IHdvcnN0RGF5ID0gd2Vla01ldHJpY3MubGVuZ3RoID4gMCA/IHdlZWtNZXRyaWNzLnJlZHVjZSgobWluOiBEYXlNZXRyaWNzLCBtOiBEYXlNZXRyaWNzKSA9PiBtLnF1ZXN0c0ZhaWxlZCA+IG1pbi5xdWVzdHNGYWlsZWQgPyBtIDogbWluKS5kYXRlIDogc3RhcnREYXRlO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVwb3J0OiBXZWVrbHlSZXBvcnQgPSB7IHdlZWssIHN0YXJ0RGF0ZSwgZW5kRGF0ZSwgdG90YWxRdWVzdHMsIHN1Y2Nlc3NSYXRlLCB0b3RhbFhwLCB0b3RhbEdvbGQsIHRvcFNraWxscywgYmVzdERheSwgd29yc3REYXkgfTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy53ZWVrbHlSZXBvcnRzLnB1c2gocmVwb3J0KTtcbiAgICAgICAgcmV0dXJuIHJlcG9ydDtcbiAgICB9XG5cbiAgICB1bmxvY2tBY2hpZXZlbWVudChhY2hpZXZlbWVudElkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhIG1hbnVhbCBvdmVycmlkZSBpZiBuZWVkZWQsIGxvZ2ljIGlzIG1vc3RseSBpbiBjaGVja0FjaGlldmVtZW50cyBub3dcbiAgICAgICAgdGhpcy5jaGVja0FjaGlldmVtZW50cygpO1xuICAgICAgICByZXR1cm4gdHJ1ZTsgXG4gICAgfVxuXG4gICAgZ2V0R2FtZVN0YXRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbGV2ZWw6IHRoaXMuc2V0dGluZ3MubGV2ZWwsXG4gICAgICAgICAgICBjdXJyZW50U3RyZWFrOiB0aGlzLnNldHRpbmdzLnN0cmVhay5jdXJyZW50LFxuICAgICAgICAgICAgbG9uZ2VzdFN0cmVhazogdGhpcy5zZXR0aW5ncy5zdHJlYWsubG9uZ2VzdCxcbiAgICAgICAgICAgIHRvdGFsUXVlc3RzOiB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogRGF5TWV0cmljcykgPT4gc3VtICsgbS5xdWVzdHNDb21wbGV0ZWQsIDApLFxuICAgICAgICAgICAgdG90YWxYcDogdGhpcy5zZXR0aW5ncy54cCArIHRoaXMuc2V0dGluZ3MuZGF5TWV0cmljcy5yZWR1Y2UoKHN1bTogbnVtYmVyLCBtOiBEYXlNZXRyaWNzKSA9PiBzdW0gKyBtLnhwRWFybmVkLCAwKSxcbiAgICAgICAgICAgIGdhbWVXb246IHRoaXMuc2V0dGluZ3MuZ2FtZVdvbixcbiAgICAgICAgICAgIGJvc3Nlc0RlZmVhdGVkOiB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmZpbHRlcigoYjogQm9zc01pbGVzdG9uZSkgPT4gYi5kZWZlYXRlZCkubGVuZ3RoLFxuICAgICAgICAgICAgdG90YWxCb3NzZXM6IHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMubGVuZ3RoXG4gICAgICAgIH07XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgbW9tZW50IH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgU2lzeXBodXNTZXR0aW5ncyB9IGZyb20gJy4uL3R5cGVzJztcblxuLyoqXG4gKiBETEMgMzogTWVkaXRhdGlvbiAmIFJlY292ZXJ5IEVuZ2luZVxuICogSGFuZGxlcyBsb2NrZG93biBzdGF0ZSwgbWVkaXRhdGlvbiBoZWFsaW5nLCBhbmQgcXVlc3QgZGVsZXRpb24gcXVvdGFcbiAqIFxuICogSVNPTEFURUQ6IE9ubHkgcmVhZHMvd3JpdGVzIHRvIGxvY2tkb3duVW50aWwsIGlzTWVkaXRhdGluZywgbWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93biwgXG4gKiAgICAgICAgICAgcXVlc3REZWxldGlvbnNUb2RheSwgbGFzdERlbGV0aW9uUmVzZXRcbiAqIERFUEVOREVOQ0lFUzogbW9tZW50LCBTaXN5cGh1c1NldHRpbmdzXG4gKiBTSURFIEVGRkVDVFM6IFBsYXlzIGF1ZGlvICg0MzIgSHogdG9uZSlcbiAqL1xuZXhwb3J0IGNsYXNzIE1lZGl0YXRpb25FbmdpbmUge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIGF1ZGlvQ29udHJvbGxlcj86IGFueTsgLy8gT3B0aW9uYWwgZm9yIDQzMiBIeiBzb3VuZFxuICAgIHByaXZhdGUgbWVkaXRhdGlvbkNvb2xkb3duTXMgPSAzMDAwMDsgLy8gMzAgc2Vjb25kc1xuXG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3MsIGF1ZGlvQ29udHJvbGxlcj86IGFueSkge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyID0gYXVkaW9Db250cm9sbGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGN1cnJlbnRseSBsb2NrZWQgZG93blxuICAgICAqL1xuICAgIGlzTG9ja2VkRG93bigpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwpIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIG1vbWVudCgpLmlzQmVmb3JlKG1vbWVudCh0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbG9ja2Rvd24gdGltZSByZW1haW5pbmcgaW4gbWludXRlc1xuICAgICAqL1xuICAgIGdldExvY2tkb3duVGltZVJlbWFpbmluZygpOiB7IGhvdXJzOiBudW1iZXI7IG1pbnV0ZXM6IG51bWJlcjsgdG90YWxNaW51dGVzOiBudW1iZXIgfSB7XG4gICAgICAgIGlmICghdGhpcy5pc0xvY2tlZERvd24oKSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgaG91cnM6IDAsIG1pbnV0ZXM6IDAsIHRvdGFsTWludXRlczogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0b3RhbE1pbnV0ZXMgPSBtb21lbnQodGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsKS5kaWZmKG1vbWVudCgpLCAnbWludXRlcycpO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IodG90YWxNaW51dGVzIC8gNjApO1xuICAgICAgICBjb25zdCBtaW51dGVzID0gdG90YWxNaW51dGVzICUgNjA7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBob3VycywgbWludXRlcywgdG90YWxNaW51dGVzIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJpZ2dlciBsb2NrZG93biBhZnRlciB0YWtpbmcgNTArIGRhbWFnZVxuICAgICAqL1xuICAgIHRyaWdnZXJMb2NrZG93bigpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsID0gbW9tZW50KCkuYWRkKDYsICdob3VycycpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93biA9IDA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybSBvbmUgbWVkaXRhdGlvbiBjeWNsZSAoY2xpY2spXG4gICAgICogUmV0dXJuczogeyBzdWNjZXNzLCBjeWNsZXNEb25lLCBjeWNsZXNSZW1haW5pbmcsIG1lc3NhZ2UgfVxuICAgICAqL1xuICAgIG1lZGl0YXRlKCk6IHsgc3VjY2VzczogYm9vbGVhbjsgY3ljbGVzRG9uZTogbnVtYmVyOyBjeWNsZXNSZW1haW5pbmc6IG51bWJlcjsgbWVzc2FnZTogc3RyaW5nOyBsb2NrZG93blJlZHVjZWQ6IGJvb2xlYW4gfSB7XG4gICAgICAgIGlmICghdGhpcy5pc0xvY2tlZERvd24oKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBjeWNsZXNEb25lOiAwLFxuICAgICAgICAgICAgICAgIGN5Y2xlc1JlbWFpbmluZzogMCxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIk5vdCBpbiBsb2NrZG93bi4gTm8gbmVlZCB0byBtZWRpdGF0ZS5cIixcbiAgICAgICAgICAgICAgICBsb2NrZG93blJlZHVjZWQ6IGZhbHNlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5pc01lZGl0YXRpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgY3ljbGVzRG9uZTogdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duLFxuICAgICAgICAgICAgICAgIGN5Y2xlc1JlbWFpbmluZzogTWF0aC5tYXgoMCwgMTAgLSB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24pLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiQWxyZWFkeSBtZWRpdGF0aW5nLiBXYWl0IDMwIHNlY29uZHMuXCIsXG4gICAgICAgICAgICAgICAgbG9ja2Rvd25SZWR1Y2VkOiBmYWxzZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5pc01lZGl0YXRpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24rKztcbiAgICAgICAgXG4gICAgICAgIC8vIFBsYXkgaGVhbGluZyBmcmVxdWVuY3lcbiAgICAgICAgdGhpcy5wbGF5TWVkaXRhdGlvblNvdW5kKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZW1haW5pbmcgPSAxMCAtIHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bjtcbiAgICAgICAgbGV0IGxvY2tkb3duUmVkdWNlZCA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgMTAgY3ljbGVzIGNvbXBsZXRlXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24gPj0gMTApIHtcbiAgICAgICAgICAgIGNvbnN0IHJlZHVjZWRUaW1lID0gbW9tZW50KHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCkuc3VidHJhY3QoNSwgJ2hvdXJzJyk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwgPSByZWR1Y2VkVGltZS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duID0gMDtcbiAgICAgICAgICAgIGxvY2tkb3duUmVkdWNlZCA9IHRydWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcj8ucGxheVNvdW5kKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQXV0by1yZXNldCBtZWRpdGF0aW9uIGZsYWcgYWZ0ZXIgY29vbGRvd25cbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaXNNZWRpdGF0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICB9LCB0aGlzLm1lZGl0YXRpb25Db29sZG93bk1zKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGN5Y2xlc0RvbmU6IDAsXG4gICAgICAgICAgICAgICAgY3ljbGVzUmVtYWluaW5nOiAwLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiTWVkaXRhdGlvbiBjb21wbGV0ZS4gTG9ja2Rvd24gcmVkdWNlZCBieSA1IGhvdXJzLlwiLFxuICAgICAgICAgICAgICAgIGxvY2tkb3duUmVkdWNlZDogdHJ1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQXV0by1yZXNldCBtZWRpdGF0aW9uIGZsYWcgYWZ0ZXIgY29vbGRvd25cbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmlzTWVkaXRhdGluZyA9IGZhbHNlO1xuICAgICAgICB9LCB0aGlzLm1lZGl0YXRpb25Db29sZG93bk1zKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgY3ljbGVzRG9uZTogdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duLFxuICAgICAgICAgICAgY3ljbGVzUmVtYWluaW5nOiByZW1haW5pbmcsXG4gICAgICAgICAgICBtZXNzYWdlOiBgTWVkaXRhdGlvbiAoJHt0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd259LzEwKSAtICR7cmVtYWluaW5nfSBjeWNsZXMgbGVmdGAsXG4gICAgICAgICAgICBsb2NrZG93blJlZHVjZWQ6IGZhbHNlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGxheSA0MzIgSHogaGVhbGluZyBmcmVxdWVuY3kgZm9yIDEgc2Vjb25kXG4gICAgICovXG4gICAgcHJpdmF0ZSBwbGF5TWVkaXRhdGlvblNvdW5kKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgYXVkaW9Db250ZXh0ID0gbmV3ICh3aW5kb3cuQXVkaW9Db250ZXh0IHx8ICh3aW5kb3cgYXMgYW55KS53ZWJraXRBdWRpb0NvbnRleHQpKCk7XG4gICAgICAgICAgICBjb25zdCBvc2NpbGxhdG9yID0gYXVkaW9Db250ZXh0LmNyZWF0ZU9zY2lsbGF0b3IoKTtcbiAgICAgICAgICAgIGNvbnN0IGdhaW5Ob2RlID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgb3NjaWxsYXRvci5mcmVxdWVuY3kudmFsdWUgPSA0MzI7XG4gICAgICAgICAgICBvc2NpbGxhdG9yLnR5cGUgPSBcInNpbmVcIjtcbiAgICAgICAgICAgIGdhaW5Ob2RlLmdhaW4uc2V0VmFsdWVBdFRpbWUoMC4zLCBhdWRpb0NvbnRleHQuY3VycmVudFRpbWUpO1xuICAgICAgICAgICAgZ2Fpbk5vZGUuZ2Fpbi5leHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lKDAuMDEsIGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZSArIDEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBvc2NpbGxhdG9yLmNvbm5lY3QoZ2Fpbk5vZGUpO1xuICAgICAgICAgICAgZ2Fpbk5vZGUuY29ubmVjdChhdWRpb0NvbnRleHQuZGVzdGluYXRpb24pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBvc2NpbGxhdG9yLnN0YXJ0KGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZSk7XG4gICAgICAgICAgICBvc2NpbGxhdG9yLnN0b3AoYXVkaW9Db250ZXh0LmN1cnJlbnRUaW1lICsgMSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW8gbm90IGF2YWlsYWJsZSBmb3IgbWVkaXRhdGlvblwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBtZWRpdGF0aW9uIHN0YXR1cyBmb3IgY3VycmVudCBsb2NrZG93blxuICAgICAqL1xuICAgIGdldE1lZGl0YXRpb25TdGF0dXMoKTogeyBjeWNsZXNEb25lOiBudW1iZXI7IGN5Y2xlc1JlbWFpbmluZzogbnVtYmVyOyB0aW1lUmVkdWNlZDogbnVtYmVyIH0ge1xuICAgICAgICBjb25zdCBjeWNsZXNEb25lID0gdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duO1xuICAgICAgICBjb25zdCBjeWNsZXNSZW1haW5pbmcgPSBNYXRoLm1heCgwLCAxMCAtIGN5Y2xlc0RvbmUpO1xuICAgICAgICBjb25zdCB0aW1lUmVkdWNlZCA9ICgxMCAtIGN5Y2xlc1JlbWFpbmluZykgKiAzMDsgLy8gMzAgbWluIHBlciBjeWNsZVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGN5Y2xlc0RvbmUsXG4gICAgICAgICAgICBjeWNsZXNSZW1haW5pbmcsXG4gICAgICAgICAgICB0aW1lUmVkdWNlZFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlc2V0IGRlbGV0aW9uIHF1b3RhIGlmIG5ldyBkYXlcbiAgICAgKi9cbiAgICBwcml2YXRlIGVuc3VyZURlbGV0aW9uUXVvdGFSZXNldCgpIHtcbiAgICAgICAgY29uc3QgdG9kYXkgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubGFzdERlbGV0aW9uUmVzZXQgIT09IHRvZGF5KSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxhc3REZWxldGlvblJlc2V0ID0gdG9kYXk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkgPSAwO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdXNlciBoYXMgZnJlZSBkZWxldGlvbnMgbGVmdCB0b2RheVxuICAgICAqL1xuICAgIGNhbkRlbGV0ZVF1ZXN0RnJlZSgpOiBib29sZWFuIHtcbiAgICAgICAgdGhpcy5lbnN1cmVEZWxldGlvblF1b3RhUmVzZXQoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSA8IDM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGRlbGV0aW9uIHF1b3RhIHN0YXR1c1xuICAgICAqL1xuICAgIGdldERlbGV0aW9uUXVvdGEoKTogeyBmcmVlOiBudW1iZXI7IHBhaWQ6IG51bWJlcjsgcmVtYWluaW5nOiBudW1iZXIgfSB7XG4gICAgICAgIHRoaXMuZW5zdXJlRGVsZXRpb25RdW90YVJlc2V0KCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZW1haW5pbmcgPSBNYXRoLm1heCgwLCAzIC0gdGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5KTtcbiAgICAgICAgY29uc3QgcGFpZCA9IE1hdGgubWF4KDAsIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSAtIDMpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGZyZWU6IHJlbWFpbmluZyxcbiAgICAgICAgICAgIHBhaWQ6IHBhaWQsXG4gICAgICAgICAgICByZW1haW5pbmc6IHJlbWFpbmluZ1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBhIHF1ZXN0IGFuZCBjaGFyZ2UgZ29sZCBpZiBuZWNlc3NhcnlcbiAgICAgKiBSZXR1cm5zOiB7IGNvc3QsIG1lc3NhZ2UgfVxuICAgICAqL1xuICAgIGFwcGx5RGVsZXRpb25Db3N0KCk6IHsgY29zdDogbnVtYmVyOyBtZXNzYWdlOiBzdHJpbmcgfSB7XG4gICAgICAgIHRoaXMuZW5zdXJlRGVsZXRpb25RdW90YVJlc2V0KCk7XG4gICAgICAgIFxuICAgICAgICBsZXQgY29zdCA9IDA7XG4gICAgICAgIGxldCBtZXNzYWdlID0gXCJcIjtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkgPj0gMykge1xuICAgICAgICAgICAgLy8gUGFpZCBkZWxldGlvblxuICAgICAgICAgICAgY29zdCA9IDEwO1xuICAgICAgICAgICAgbWVzc2FnZSA9IGBRdWVzdCBkZWxldGVkLiBDb3N0OiAtJHtjb3N0fWdgO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRnJlZSBkZWxldGlvblxuICAgICAgICAgICAgY29uc3QgcmVtYWluaW5nID0gMyAtIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheTtcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBgUXVlc3QgZGVsZXRlZC4gKCR7cmVtYWluaW5nIC0gMX0gZnJlZSBkZWxldGlvbnMgcmVtYWluaW5nKWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSsrO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmdvbGQgLT0gY29zdDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7IGNvc3QsIG1lc3NhZ2UgfTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBBcHAsIFRGaWxlLCBOb3RpY2UgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBSZXNlYXJjaFF1ZXN0IH0gZnJvbSAnLi4vdHlwZXMnO1xuXG5leHBvcnQgY2xhc3MgUmVzZWFyY2hFbmdpbmUge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIGF1ZGlvQ29udHJvbGxlcj86IGFueTtcbiAgICBhcHA6IEFwcDsgLy8gQWRkZWQgQXBwIHJlZmVyZW5jZSBmb3IgZmlsZSBvcGVyYXRpb25zXG5cbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncywgYXBwOiBBcHAsIGF1ZGlvQ29udHJvbGxlcj86IGFueSkge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgICAgIHRoaXMuYXBwID0gYXBwO1xuICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlciA9IGF1ZGlvQ29udHJvbGxlcjtcbiAgICB9XG5cbiAgICBhc3luYyBjcmVhdGVSZXNlYXJjaFF1ZXN0KHRpdGxlOiBzdHJpbmcsIHR5cGU6IFwic3VydmV5XCIgfCBcImRlZXBfZGl2ZVwiLCBsaW5rZWRTa2lsbDogc3RyaW5nLCBsaW5rZWRDb21iYXRRdWVzdDogc3RyaW5nKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgcXVlc3RJZD86IHN0cmluZyB9PiB7XG4gICAgICAgIC8vIFtGSVhdIEFsbG93IGZpcnN0IHJlc2VhcmNoIHF1ZXN0IGZvciBmcmVlIChDb2xkIFN0YXJ0KSwgb3RoZXJ3aXNlIGVuZm9yY2UgMjoxXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMudG90YWxSZXNlYXJjaCA+IDAgJiYgIXRoaXMuY2FuQ3JlYXRlUmVzZWFyY2hRdWVzdCgpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiUkVTRUFSQ0ggQkxPQ0tFRDogQ29tcGxldGUgMiBjb21iYXQgcXVlc3RzIHBlciByZXNlYXJjaCBxdWVzdFwiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCB3b3JkTGltaXQgPSB0eXBlID09PSBcInN1cnZleVwiID8gMjAwIDogNDAwO1xuICAgICAgICBjb25zdCBxdWVzdElkID0gYHJlc2VhcmNoXyR7KHRoaXMuc2V0dGluZ3MubGFzdFJlc2VhcmNoUXVlc3RJZCB8fCAwKSArIDF9YDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJlc2VhcmNoUXVlc3Q6IFJlc2VhcmNoUXVlc3QgPSB7XG4gICAgICAgICAgICBpZDogcXVlc3RJZCxcbiAgICAgICAgICAgIHRpdGxlOiB0aXRsZSxcbiAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICBsaW5rZWRTa2lsbDogbGlua2VkU2tpbGwsXG4gICAgICAgICAgICB3b3JkTGltaXQ6IHdvcmRMaW1pdCxcbiAgICAgICAgICAgIHdvcmRDb3VudDogMCxcbiAgICAgICAgICAgIGxpbmtlZENvbWJhdFF1ZXN0OiBsaW5rZWRDb21iYXRRdWVzdCxcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgY29tcGxldGVkOiBmYWxzZVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFtGSVhdIENyZWF0ZSBhY3R1YWwgTWFya2Rvd24gZmlsZVxuICAgICAgICBjb25zdCBmb2xkZXJQYXRoID0gXCJBY3RpdmVfUnVuL1Jlc2VhcmNoXCI7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZvbGRlclBhdGgpKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZm9sZGVyUGF0aCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzYWZlVGl0bGUgPSB0aXRsZS5yZXBsYWNlKC9bXmEtejAtOV0vZ2ksICdfJykudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBgJHtmb2xkZXJQYXRofS8ke3NhZmVUaXRsZX0ubWRgO1xuICAgICAgICBjb25zdCBjb250ZW50ID0gYC0tLVxudHlwZTogcmVzZWFyY2hcbnJlc2VhcmNoX2lkOiAke3F1ZXN0SWR9XG5zdGF0dXM6IGFjdGl2ZVxubGlua2VkX3NraWxsOiAke2xpbmtlZFNraWxsfVxud29yZF9saW1pdDogJHt3b3JkTGltaXR9XG5jcmVhdGVkOiAke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKX1cbi0tLVxuIyDwn5OaICR7dGl0bGV9XG4+IFshSU5GT10gUmVzZWFyY2ggR3VpZGVsaW5lc1xuPiAqKlR5cGU6KiogJHt0eXBlfSB8ICoqVGFyZ2V0OioqICR7d29yZExpbWl0fSB3b3Jkc1xuPiAqKkxpbmtlZCBTa2lsbDoqKiAke2xpbmtlZFNraWxsfVxuXG5Xcml0ZSB5b3VyIHJlc2VhcmNoIGhlcmUuLi5cbmA7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShmaWxlbmFtZSwgY29udGVudCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJFcnJvciBjcmVhdGluZyByZXNlYXJjaCBmaWxlLiBDaGVjayBjb25zb2xlLlwiKTtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMucHVzaChyZXNlYXJjaFF1ZXN0KTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0UmVzZWFyY2hRdWVzdElkID0gcGFyc2VJbnQocXVlc3RJZC5zcGxpdCgnXycpWzFdKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnRvdGFsUmVzZWFyY2grKztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogYFJlc2VhcmNoIFF1ZXN0IENyZWF0ZWQ6ICR7dHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IFwiU3VydmV5XCIgOiBcIkRlZXAgRGl2ZVwifWAsXG4gICAgICAgICAgICBxdWVzdElkOiBxdWVzdElkXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgY29tcGxldGVSZXNlYXJjaFF1ZXN0KHF1ZXN0SWQ6IHN0cmluZywgZmluYWxXb3JkQ291bnQ6IG51bWJlcik6IHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyB4cFJld2FyZDogbnVtYmVyOyBnb2xkUGVuYWx0eTogbnVtYmVyIH0ge1xuICAgICAgICBjb25zdCByZXNlYXJjaFF1ZXN0ID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maW5kKHEgPT4gcS5pZCA9PT0gcXVlc3RJZCk7XG4gICAgICAgIGlmICghcmVzZWFyY2hRdWVzdCkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiUmVzZWFyY2ggcXVlc3Qgbm90IGZvdW5kXCIsIHhwUmV3YXJkOiAwLCBnb2xkUGVuYWx0eTogMCB9O1xuICAgICAgICBpZiAocmVzZWFyY2hRdWVzdC5jb21wbGV0ZWQpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIlF1ZXN0IGFscmVhZHkgY29tcGxldGVkXCIsIHhwUmV3YXJkOiAwLCBnb2xkUGVuYWx0eTogMCB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgbWluV29yZHMgPSBNYXRoLmNlaWwocmVzZWFyY2hRdWVzdC53b3JkTGltaXQgKiAwLjgpO1xuICAgICAgICBpZiAoZmluYWxXb3JkQ291bnQgPCBtaW5Xb3Jkcykge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IGBUb28gc2hvcnQhIE5lZWQgJHttaW5Xb3Jkc30gd29yZHMuYCwgeHBSZXdhcmQ6IDAsIGdvbGRQZW5hbHR5OiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChmaW5hbFdvcmRDb3VudCA+IHJlc2VhcmNoUXVlc3Qud29yZExpbWl0ICogMS4yNSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IGBUb28gbG9uZyEgTWF4ICR7TWF0aC5jZWlsKHJlc2VhcmNoUXVlc3Qud29yZExpbWl0ICogMS4yNSl9IHdvcmRzLmAsIHhwUmV3YXJkOiAwLCBnb2xkUGVuYWx0eTogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBsZXQgeHBSZXdhcmQgPSByZXNlYXJjaFF1ZXN0LnR5cGUgPT09IFwic3VydmV5XCIgPyA1IDogMjA7XG4gICAgICAgIGxldCBnb2xkUGVuYWx0eSA9IDA7XG4gICAgICAgIGlmIChmaW5hbFdvcmRDb3VudCA+IHJlc2VhcmNoUXVlc3Qud29yZExpbWl0KSB7XG4gICAgICAgICAgICBjb25zdCBvdmVyYWdlUGVyY2VudCA9ICgoZmluYWxXb3JkQ291bnQgLSByZXNlYXJjaFF1ZXN0LndvcmRMaW1pdCkgLyByZXNlYXJjaFF1ZXN0LndvcmRMaW1pdCkgKiAxMDA7XG4gICAgICAgICAgICBnb2xkUGVuYWx0eSA9IE1hdGguZmxvb3IoMjAgKiAob3ZlcmFnZVBlcmNlbnQgLyAxMDApKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2tpbGwgPSB0aGlzLnNldHRpbmdzLnNraWxscy5maW5kKHMgPT4gcy5uYW1lID09PSByZXNlYXJjaFF1ZXN0LmxpbmtlZFNraWxsKTtcbiAgICAgICAgaWYgKHNraWxsKSB7XG4gICAgICAgICAgICBza2lsbC54cCArPSB4cFJld2FyZDtcbiAgICAgICAgICAgIGlmIChza2lsbC54cCA+PSBza2lsbC54cFJlcSkgeyBza2lsbC5sZXZlbCsrOyBza2lsbC54cCA9IDA7IH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5nb2xkIC09IGdvbGRQZW5hbHR5O1xuICAgICAgICByZXNlYXJjaFF1ZXN0LmNvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgIHJlc2VhcmNoUXVlc3QuY29tcGxldGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy5yZXNlYXJjaENvbXBsZXRlZCsrO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyPy5wbGF5U291bmQpIHRoaXMuYXVkaW9Db250cm9sbGVyLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgIFxuICAgICAgICBsZXQgbWVzc2FnZSA9IGBSZXNlYXJjaCBDb21wbGV0ZSEgKyR7eHBSZXdhcmR9IFhQYDtcbiAgICAgICAgaWYgKGdvbGRQZW5hbHR5ID4gMCkgbWVzc2FnZSArPSBgICgtJHtnb2xkUGVuYWx0eX1nIHRheClgO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZSwgeHBSZXdhcmQsIGdvbGRQZW5hbHR5IH07XG4gICAgfVxuXG4gICAgYXN5bmMgZGVsZXRlUmVzZWFyY2hRdWVzdChxdWVzdElkOiBzdHJpbmcpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nIH0+IHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbmRJbmRleChxID0+IHEuaWQgPT09IHF1ZXN0SWQpO1xuICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdCA9IHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHNbaW5kZXhdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBbRklYXSBUcnkgdG8gZmluZCBhbmQgZGVsZXRlIHRoZSBmaWxlXG4gICAgICAgICAgICBjb25zdCBmaWxlcyA9IHRoaXMuYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKTtcbiAgICAgICAgICAgIGNvbnN0IGZpbGUgPSBmaWxlcy5maW5kKGYgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhY2hlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhY2hlPy5mcm9udG1hdHRlcj8ucmVzZWFyY2hfaWQgPT09IHF1ZXN0SWQ7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKGZpbGUpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5kZWxldGUoZmlsZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIGlmICghcXVlc3QuY29tcGxldGVkKSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMudG90YWxSZXNlYXJjaCA9IE1hdGgubWF4KDAsIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy50b3RhbFJlc2VhcmNoIC0gMSk7XG4gICAgICAgICAgICBlbHNlIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy5yZXNlYXJjaENvbXBsZXRlZCA9IE1hdGgubWF4KDAsIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy5yZXNlYXJjaENvbXBsZXRlZCAtIDEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBcIlJlc2VhcmNoIGRlbGV0ZWRcIiB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIk5vdCBmb3VuZFwiIH07XG4gICAgfVxuXG4gICAgdXBkYXRlUmVzZWFyY2hXb3JkQ291bnQocXVlc3RJZDogc3RyaW5nLCBuZXdXb3JkQ291bnQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCByZXNlYXJjaFF1ZXN0ID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maW5kKHEgPT4gcS5pZCA9PT0gcXVlc3RJZCk7XG4gICAgICAgIGlmIChyZXNlYXJjaFF1ZXN0KSB7XG4gICAgICAgICAgICByZXNlYXJjaFF1ZXN0LndvcmRDb3VudCA9IG5ld1dvcmRDb3VudDtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBnZXRSZXNlYXJjaFJhdGlvKCkge1xuICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cztcbiAgICAgICAgY29uc3QgcmF0aW8gPSBzdGF0cy50b3RhbENvbWJhdCAvIE1hdGgubWF4KDEsIHN0YXRzLnRvdGFsUmVzZWFyY2gpO1xuICAgICAgICByZXR1cm4geyBjb21iYXQ6IHN0YXRzLnRvdGFsQ29tYmF0LCByZXNlYXJjaDogc3RhdHMudG90YWxSZXNlYXJjaCwgcmF0aW86IHJhdGlvLnRvRml4ZWQoMikgfTtcbiAgICB9XG5cbiAgICBjYW5DcmVhdGVSZXNlYXJjaFF1ZXN0KCk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cztcbiAgICAgICAgY29uc3QgcmF0aW8gPSBzdGF0cy50b3RhbENvbWJhdCAvIE1hdGgubWF4KDEsIHN0YXRzLnRvdGFsUmVzZWFyY2gpO1xuICAgICAgICByZXR1cm4gcmF0aW8gPj0gMjtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBRdWVzdENoYWluLCBRdWVzdENoYWluUmVjb3JkIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG4vKipcbiAqIERMQyA0OiBRdWVzdCBDaGFpbnMgRW5naW5lXG4gKiBIYW5kbGVzIG11bHRpLXF1ZXN0IHNlcXVlbmNlcyB3aXRoIG9yZGVyaW5nLCBsb2NraW5nLCBhbmQgY29tcGxldGlvbiB0cmFja2luZ1xuICogXG4gKiBJU09MQVRFRDogT25seSByZWFkcy93cml0ZXMgdG8gYWN0aXZlQ2hhaW5zLCBjaGFpbkhpc3RvcnksIGN1cnJlbnRDaGFpbklkLCBjaGFpblF1ZXN0c0NvbXBsZXRlZFxuICogREVQRU5ERU5DSUVTOiBTaXN5cGh1c1NldHRpbmdzIHR5cGVzXG4gKiBJTlRFR1JBVElPTiBQT0lOVFM6IE5lZWRzIHRvIGhvb2sgaW50byBjb21wbGV0ZVF1ZXN0KCkgaW4gbWFpbiBlbmdpbmUgZm9yIGNoYWluIHByb2dyZXNzaW9uXG4gKi9cbmV4cG9ydCBjbGFzcyBDaGFpbnNFbmdpbmUge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIGF1ZGlvQ29udHJvbGxlcj86IGFueTtcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzLCBhdWRpb0NvbnRyb2xsZXI/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlciA9IGF1ZGlvQ29udHJvbGxlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgcXVlc3QgY2hhaW5cbiAgICAgKi9cbiAgICBhc3luYyBjcmVhdGVRdWVzdENoYWluKG5hbWU6IHN0cmluZywgcXVlc3ROYW1lczogc3RyaW5nW10pOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyBjaGFpbklkPzogc3RyaW5nIH0+IHtcbiAgICAgICAgaWYgKHF1ZXN0TmFtZXMubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIkNoYWluIG11c3QgaGF2ZSBhdCBsZWFzdCAyIHF1ZXN0c1wiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjaGFpbklkID0gYGNoYWluXyR7RGF0ZS5ub3coKX1gO1xuICAgICAgICBjb25zdCBjaGFpbjogUXVlc3RDaGFpbiA9IHtcbiAgICAgICAgICAgIGlkOiBjaGFpbklkLFxuICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgIHF1ZXN0czogcXVlc3ROYW1lcyxcbiAgICAgICAgICAgIGN1cnJlbnRJbmRleDogMCxcbiAgICAgICAgICAgIGNvbXBsZXRlZDogZmFsc2UsXG4gICAgICAgICAgICBzdGFydGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGlzQm9zczogcXVlc3ROYW1lc1txdWVzdE5hbWVzLmxlbmd0aCAtIDFdLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoXCJib3NzXCIpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5wdXNoKGNoYWluKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jdXJyZW50Q2hhaW5JZCA9IGNoYWluSWQ7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBDaGFpbiBjcmVhdGVkOiAke25hbWV9ICgke3F1ZXN0TmFtZXMubGVuZ3RofSBxdWVzdHMpYCxcbiAgICAgICAgICAgIGNoYWluSWQ6IGNoYWluSWRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIGN1cnJlbnQgYWN0aXZlIGNoYWluXG4gICAgICovXG4gICAgZ2V0QWN0aXZlQ2hhaW4oKTogUXVlc3RDaGFpbiB8IG51bGwge1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuY3VycmVudENoYWluSWQpIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5maW5kKGMgPT4gYy5pZCA9PT0gdGhpcy5zZXR0aW5ncy5jdXJyZW50Q2hhaW5JZCk7XG4gICAgICAgIHJldHVybiAoY2hhaW4gJiYgIWNoYWluLmNvbXBsZXRlZCkgPyBjaGFpbiA6IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBuZXh0IHF1ZXN0IHRoYXQgc2hvdWxkIGJlIGNvbXBsZXRlZCBpbiB0aGUgYWN0aXZlIGNoYWluXG4gICAgICovXG4gICAgZ2V0TmV4dFF1ZXN0SW5DaGFpbigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIGlmICghY2hhaW4pIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNoYWluLnF1ZXN0c1tjaGFpbi5jdXJyZW50SW5kZXhdIHx8IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgYSBxdWVzdCBpcyBwYXJ0IG9mIGFuIGFjdGl2ZSAoaW5jb21wbGV0ZSkgY2hhaW5cbiAgICAgKi9cbiAgICBpc1F1ZXN0SW5DaGFpbihxdWVzdE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zLmZpbmQoYyA9PiAhYy5jb21wbGV0ZWQpO1xuICAgICAgICBpZiAoIWNoYWluKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiBjaGFpbi5xdWVzdHMuaW5jbHVkZXMocXVlc3ROYW1lKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBhIHF1ZXN0IGNhbiBiZSBzdGFydGVkIChpcyBpdCB0aGUgbmV4dCBxdWVzdCBpbiB0aGUgY2hhaW4/KVxuICAgICAqL1xuICAgIGNhblN0YXJ0UXVlc3QocXVlc3ROYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIGlmICghY2hhaW4pIHJldHVybiB0cnVlOyAvLyBOb3QgaW4gYSBjaGFpbiwgY2FuIHN0YXJ0IGFueSBxdWVzdFxuICAgICAgICBcbiAgICAgICAgY29uc3QgbmV4dFF1ZXN0ID0gdGhpcy5nZXROZXh0UXVlc3RJbkNoYWluKCk7XG4gICAgICAgIHJldHVybiBuZXh0UXVlc3QgPT09IHF1ZXN0TmFtZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNYXJrIGEgcXVlc3QgYXMgY29tcGxldGVkIGluIHRoZSBjaGFpblxuICAgICAqIEFkdmFuY2VzIGNoYWluIGlmIHN1Y2Nlc3NmdWwsIGF3YXJkcyBib251cyBYUCBpZiBjaGFpbiBjb21wbGV0ZXNcbiAgICAgKi9cbiAgICBhc3luYyBjb21wbGV0ZUNoYWluUXVlc3QocXVlc3ROYW1lOiBzdHJpbmcpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyBjaGFpbkNvbXBsZXRlOiBib29sZWFuOyBib251c1hwOiBudW1iZXIgfT4ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiTm8gYWN0aXZlIGNoYWluXCIsIGNoYWluQ29tcGxldGU6IGZhbHNlLCBib251c1hwOiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRRdWVzdCA9IGNoYWluLnF1ZXN0c1tjaGFpbi5jdXJyZW50SW5kZXhdO1xuICAgICAgICBpZiAoY3VycmVudFF1ZXN0ICE9PSBxdWVzdE5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogXCJRdWVzdCBpcyBub3QgbmV4dCBpbiBjaGFpblwiLFxuICAgICAgICAgICAgICAgIGNoYWluQ29tcGxldGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGJvbnVzWHA6IDBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNoYWluLmN1cnJlbnRJbmRleCsrO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmNoYWluUXVlc3RzQ29tcGxldGVkKys7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBjaGFpbiBpcyBjb21wbGV0ZVxuICAgICAgICBpZiAoY2hhaW4uY3VycmVudEluZGV4ID49IGNoYWluLnF1ZXN0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBsZXRlQ2hhaW4oY2hhaW4pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZW1haW5pbmcgPSBjaGFpbi5xdWVzdHMubGVuZ3RoIC0gY2hhaW4uY3VycmVudEluZGV4O1xuICAgICAgICBjb25zdCBwZXJjZW50ID0gTWF0aC5mbG9vcigoY2hhaW4uY3VycmVudEluZGV4IC8gY2hhaW4ucXVlc3RzLmxlbmd0aCkgKiAxMDApO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBgQ2hhaW4gcHJvZ3Jlc3M6ICR7Y2hhaW4uY3VycmVudEluZGV4fS8ke2NoYWluLnF1ZXN0cy5sZW5ndGh9ICgke3JlbWFpbmluZ30gcmVtYWluaW5nLCAke3BlcmNlbnR9JSBjb21wbGV0ZSlgLFxuICAgICAgICAgICAgY2hhaW5Db21wbGV0ZTogZmFsc2UsXG4gICAgICAgICAgICBib251c1hwOiAwXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29tcGxldGUgdGhlIGVudGlyZSBjaGFpblxuICAgICAqL1xuICAgIHByaXZhdGUgYXN5bmMgY29tcGxldGVDaGFpbihjaGFpbjogUXVlc3RDaGFpbik6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmc7IGNoYWluQ29tcGxldGU6IGJvb2xlYW47IGJvbnVzWHA6IG51bWJlciB9PiB7XG4gICAgICAgIGNoYWluLmNvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgIGNoYWluLmNvbXBsZXRlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYm9udXNYcCA9IDEwMDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy54cCArPSBib251c1hwO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVjb3JkOiBRdWVzdENoYWluUmVjb3JkID0ge1xuICAgICAgICAgICAgY2hhaW5JZDogY2hhaW4uaWQsXG4gICAgICAgICAgICBjaGFpbk5hbWU6IGNoYWluLm5hbWUsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0czogY2hhaW4ucXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIGNvbXBsZXRlZEF0OiBjaGFpbi5jb21wbGV0ZWRBdCxcbiAgICAgICAgICAgIHhwRWFybmVkOiBib251c1hwXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeS5wdXNoKHJlY29yZCk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5hdWRpb0NvbnRyb2xsZXI/LnBsYXlTb3VuZCkge1xuICAgICAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBgQ2hhaW4gY29tcGxldGU6ICR7Y2hhaW4ubmFtZX0hICske2JvbnVzWHB9IFhQIEJvbnVzYCxcbiAgICAgICAgICAgIGNoYWluQ29tcGxldGU6IHRydWUsXG4gICAgICAgICAgICBib251c1hwOiBib251c1hwXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQnJlYWsgYW4gYWN0aXZlIGNoYWluXG4gICAgICogS2VlcHMgZWFybmVkIFhQIGZyb20gY29tcGxldGVkIHF1ZXN0c1xuICAgICAqL1xuICAgIGFzeW5jIGJyZWFrQ2hhaW4oKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgeHBLZXB0OiBudW1iZXIgfT4ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiTm8gYWN0aXZlIGNoYWluIHRvIGJyZWFrXCIsIHhwS2VwdDogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb21wbGV0ZWQgPSBjaGFpbi5jdXJyZW50SW5kZXg7XG4gICAgICAgIGNvbnN0IHhwS2VwdCA9IGNvbXBsZXRlZCAqIDEwOyAvLyBBcHByb3hpbWF0ZSBYUCBmcm9tIGVhY2ggcXVlc3RcbiAgICAgICAgXG4gICAgICAgIC8vIFNhdmUgdG8gaGlzdG9yeSBhcyBicm9rZW5cbiAgICAgICAgY29uc3QgcmVjb3JkOiBRdWVzdENoYWluUmVjb3JkID0ge1xuICAgICAgICAgICAgY2hhaW5JZDogY2hhaW4uaWQsXG4gICAgICAgICAgICBjaGFpbk5hbWU6IGNoYWluLm5hbWUsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0czogY2hhaW4ucXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIGNvbXBsZXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICB4cEVhcm5lZDogeHBLZXB0XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeS5wdXNoKHJlY29yZCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zID0gdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMuZmlsdGVyKGMgPT4gYy5pZCAhPT0gY2hhaW4uaWQpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmN1cnJlbnRDaGFpbklkID0gXCJcIjtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogYENoYWluIGJyb2tlbjogJHtjaGFpbi5uYW1lfS4gS2VwdCAke2NvbXBsZXRlZH0gcXVlc3QgY29tcGxldGlvbnMgKCR7eHBLZXB0fSBYUCkuYCxcbiAgICAgICAgICAgIHhwS2VwdDogeHBLZXB0XG4gICAgICAgIH07XG4gICAgfVxuICAvKipcbiAgICAgKiBIYW5kbGUgZmlsZSByZW5hbWUgZXZlbnRzIHRvIGtlZXAgY2hhaW5zIGludGFjdFxuICAgICAqIEBwYXJhbSBvbGROYW1lIFRoZSBwcmV2aW91cyBiYXNlbmFtZSBvZiB0aGUgZmlsZVxuICAgICAqIEBwYXJhbSBuZXdOYW1lIFRoZSBuZXcgYmFzZW5hbWUgb2YgdGhlIGZpbGVcbiAgICAgKi9cbiAgICBoYW5kbGVSZW5hbWUob2xkTmFtZTogc3RyaW5nLCBuZXdOYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgbGV0IGNoYW5nZXNNYWRlID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMuZm9yRWFjaChjaGFpbiA9PiB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGNoYWluIGNvbnRhaW5zIHRoZSBvbGQgcXVlc3QgbmFtZVxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBjaGFpbi5xdWVzdHMuaW5kZXhPZihvbGROYW1lKTtcbiAgICAgICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAvLyBSZXBsYWNlIHdpdGggbmV3IG5hbWVcbiAgICAgICAgICAgICAgICBjaGFpbi5xdWVzdHNbaW5kZXhdID0gbmV3TmFtZTtcbiAgICAgICAgICAgICAgICBjaGFuZ2VzTWFkZSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFsc28gY2hlY2sgaGlzdG9yeSAob3B0aW9uYWwsIGJ1dCBnb29kIGZvciBkYXRhIGludGVncml0eSlcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jaGFpbkhpc3RvcnkuZm9yRWFjaChyZWNvcmQgPT4ge1xuICAgICAgICAgICAgLy8gSWYgeW91IHN0b3JlIHF1ZXN0IGxpc3RzIGluIGhpc3RvcnkgbGF0ZXIsIHVwZGF0ZSB0aGVtIGhlcmUuXG4gICAgICAgICAgICAvLyBDdXJyZW50bHkgaGlzdG9yeSBpcyBqdXN0IHN1bW1hcnkgZGF0YSwgc28gc3RyaWN0bHkgbm90IG5lZWRlZCB5ZXQsXG4gICAgICAgICAgICAvLyBidXQgZ29vZCB0byBrZWVwIGluIG1pbmQuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChjaGFuZ2VzTWFkZSkge1xuICAgICAgICAgICAgLy8gVXNpbmcgY29uc29sZSBsb2cgZm9yIGRlYnVnLCBOb3RpY2UgbWlnaHQgYmUgdG9vIHNwYW1teSBkdXJpbmcgYmF0Y2ggcmVuYW1lc1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFtTaXN5cGh1c10gVXBkYXRlZCBjaGFpbnMgZm9yIHJlbmFtZTogJHtvbGROYW1lfSAtPiAke25ld05hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcHJvZ3Jlc3Mgb2YgYWN0aXZlIGNoYWluXG4gICAgICovXG4gICAgZ2V0Q2hhaW5Qcm9ncmVzcygpOiB7IGNvbXBsZXRlZDogbnVtYmVyOyB0b3RhbDogbnVtYmVyOyBwZXJjZW50OiBudW1iZXIgfSB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5nZXRBY3RpdmVDaGFpbigpO1xuICAgICAgICBpZiAoIWNoYWluKSByZXR1cm4geyBjb21wbGV0ZWQ6IDAsIHRvdGFsOiAwLCBwZXJjZW50OiAwIH07XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY29tcGxldGVkOiBjaGFpbi5jdXJyZW50SW5kZXgsXG4gICAgICAgICAgICB0b3RhbDogY2hhaW4ucXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIHBlcmNlbnQ6IE1hdGguZmxvb3IoKGNoYWluLmN1cnJlbnRJbmRleCAvIGNoYWluLnF1ZXN0cy5sZW5ndGgpICogMTAwKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgY29tcGxldGVkIGNoYWluIHJlY29yZHMgKGhpc3RvcnkpXG4gICAgICovXG4gICAgZ2V0Q2hhaW5IaXN0b3J5KCk6IFF1ZXN0Q2hhaW5SZWNvcmRbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIGFjdGl2ZSBjaGFpbnMgKG5vdCBjb21wbGV0ZWQpXG4gICAgICovXG4gICAgZ2V0QWN0aXZlQ2hhaW5zKCk6IFF1ZXN0Q2hhaW5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5maWx0ZXIoYyA9PiAhYy5jb21wbGV0ZWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBkZXRhaWxlZCBzdGF0ZSBvZiBhY3RpdmUgY2hhaW4gKGZvciBVSSByZW5kZXJpbmcpXG4gICAgICovXG4gICAgZ2V0Q2hhaW5EZXRhaWxzKCk6IHtcbiAgICAgICAgY2hhaW46IFF1ZXN0Q2hhaW4gfCBudWxsO1xuICAgICAgICBwcm9ncmVzczogeyBjb21wbGV0ZWQ6IG51bWJlcjsgdG90YWw6IG51bWJlcjsgcGVyY2VudDogbnVtYmVyIH07XG4gICAgICAgIHF1ZXN0U3RhdGVzOiBBcnJheTx7IHF1ZXN0OiBzdHJpbmc7IHN0YXR1czogJ2NvbXBsZXRlZCcgfCAnYWN0aXZlJyB8ICdsb2NrZWQnIH0+O1xuICAgIH0ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikge1xuICAgICAgICAgICAgcmV0dXJuIHsgY2hhaW46IG51bGwsIHByb2dyZXNzOiB7IGNvbXBsZXRlZDogMCwgdG90YWw6IDAsIHBlcmNlbnQ6IDAgfSwgcXVlc3RTdGF0ZXM6IFtdIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHByb2dyZXNzID0gdGhpcy5nZXRDaGFpblByb2dyZXNzKCk7XG4gICAgICAgIGNvbnN0IHF1ZXN0U3RhdGVzID0gY2hhaW4ucXVlc3RzLm1hcCgocXVlc3QsIGlkeCkgPT4ge1xuICAgICAgICAgICAgaWYgKGlkeCA8IGNoYWluLmN1cnJlbnRJbmRleCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHF1ZXN0LCBzdGF0dXM6ICdjb21wbGV0ZWQnIGFzIGNvbnN0IH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlkeCA9PT0gY2hhaW4uY3VycmVudEluZGV4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgcXVlc3QsIHN0YXR1czogJ2FjdGl2ZScgYXMgY29uc3QgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgcXVlc3QsIHN0YXR1czogJ2xvY2tlZCcgYXMgY29uc3QgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBjaGFpbiwgcHJvZ3Jlc3MsIHF1ZXN0U3RhdGVzIH07XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgVEZpbGUgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBDb250ZXh0RmlsdGVyLCBGaWx0ZXJTdGF0ZSwgRW5lcmd5TGV2ZWwsIFF1ZXN0Q29udGV4dCB9IGZyb20gJy4uL3R5cGVzJztcblxuLyoqXG4gKiBETEMgNTogQ29udGV4dCBGaWx0ZXJzIEVuZ2luZVxuICogSGFuZGxlcyBxdWVzdCBmaWx0ZXJpbmcgYnkgZW5lcmd5IGxldmVsLCBsb2NhdGlvbiBjb250ZXh0LCBhbmQgY3VzdG9tIHRhZ3NcbiAqIFxuICogSVNPTEFURUQ6IE9ubHkgcmVhZHMvd3JpdGVzIHRvIHF1ZXN0RmlsdGVycywgZmlsdGVyU3RhdGVcbiAqIERFUEVOREVOQ0lFUzogU2lzeXBodXNTZXR0aW5ncyB0eXBlcywgVEZpbGUgKGZvciBxdWVzdCBtZXRhZGF0YSlcbiAqIE5PVEU6IFRoaXMgaXMgcHJpbWFyaWx5IGEgVklFVyBMQVlFUiBjb25jZXJuLCBidXQga2VlcGluZyBsb2dpYyBpc29sYXRlZCBpcyBnb29kXG4gKi9cbmV4cG9ydCBjbGFzcyBGaWx0ZXJzRW5naW5lIHtcbiAgICBzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncztcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcbiAgICB9XG4gIC8qKlxuICAgICAqIEhhbmRsZSBmaWxlIHJlbmFtZSBldmVudHMgdG8gcHJlc2VydmUgZmlsdGVyc1xuICAgICAqIEBwYXJhbSBvbGROYW1lIFRoZSBwcmV2aW91cyBiYXNlbmFtZVxuICAgICAqIEBwYXJhbSBuZXdOYW1lIFRoZSBuZXcgYmFzZW5hbWVcbiAgICAgKi9cbiAgICBoYW5kbGVSZW5hbWUob2xkTmFtZTogc3RyaW5nLCBuZXdOYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZmlsdGVyRGF0YSA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW29sZE5hbWVdO1xuICAgICAgICBcbiAgICAgICAgaWYgKGZpbHRlckRhdGEpIHtcbiAgICAgICAgICAgIC8vIDEuIEFzc2lnbiBkYXRhIHRvIG5ldyBrZXlcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW25ld05hbWVdID0gZmlsdGVyRGF0YTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gMi4gRGVsZXRlIG9sZCBrZXlcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1tvbGROYW1lXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc29sZS5sb2coYFtTaXN5cGh1c10gVHJhbnNmZXJyZWQgZmlsdGVyczogJHtvbGROYW1lfSAtPiAke25ld05hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHYXJiYWdlIENvbGxlY3Rpb246IENsZWFuIHVwIGZpbHRlcnMgZm9yIGZpbGVzIHRoYXQgbm8gbG9uZ2VyIGV4aXN0XG4gICAgICogQ2FsbCB0aGlzIHNwYXJpbmdseSAoZS5nLiwgb24gcGx1Z2luIGxvYWQpXG4gICAgICovXG4gICAgY2xlYW51cE9ycGhhbnMoZXhpc3RpbmdGaWxlTmFtZXM6IHN0cmluZ1tdKSB7XG4gICAgICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVycyk7XG4gICAgICAgIGxldCBkZWxldGVkID0gMDtcbiAgICAgICAgXG4gICAgICAgIGtleXMuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKCFleGlzdGluZ0ZpbGVOYW1lcy5pbmNsdWRlcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW2tleV07XG4gICAgICAgICAgICAgICAgZGVsZXRlZCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChkZWxldGVkID4gMCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFtTaXN5cGh1c10gQ2xlYW5lZCB1cCAke2RlbGV0ZWR9IG9ycGhhbmVkIGZpbHRlciBlbnRyaWVzLmApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0IGZpbHRlciBmb3IgYSBzcGVjaWZpYyBxdWVzdFxuICAgICAqL1xuICAgIHNldFF1ZXN0RmlsdGVyKHF1ZXN0TmFtZTogc3RyaW5nLCBlbmVyZ3k6IEVuZXJneUxldmVsLCBjb250ZXh0OiBRdWVzdENvbnRleHQsIHRhZ3M6IHN0cmluZ1tdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV0gPSB7XG4gICAgICAgICAgICBlbmVyZ3lMZXZlbDogZW5lcmd5LFxuICAgICAgICAgICAgY29udGV4dDogY29udGV4dCxcbiAgICAgICAgICAgIHRhZ3M6IHRhZ3NcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgZmlsdGVyIGZvciBhIHNwZWNpZmljIHF1ZXN0XG4gICAgICovXG4gICAgZ2V0UXVlc3RGaWx0ZXIocXVlc3ROYW1lOiBzdHJpbmcpOiBDb250ZXh0RmlsdGVyIHwgbnVsbCB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdIHx8IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSBhY3RpdmUgZmlsdGVyIHN0YXRlXG4gICAgICovXG4gICAgc2V0RmlsdGVyU3RhdGUoZW5lcmd5OiBFbmVyZ3lMZXZlbCB8IFwiYW55XCIsIGNvbnRleHQ6IFF1ZXN0Q29udGV4dCB8IFwiYW55XCIsIHRhZ3M6IHN0cmluZ1tdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUgPSB7XG4gICAgICAgICAgICBhY3RpdmVFbmVyZ3k6IGVuZXJneSBhcyBhbnksXG4gICAgICAgICAgICBhY3RpdmVDb250ZXh0OiBjb250ZXh0IGFzIGFueSxcbiAgICAgICAgICAgIGFjdGl2ZVRhZ3M6IHRhZ3NcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCBmaWx0ZXIgc3RhdGVcbiAgICAgKi9cbiAgICBnZXRGaWx0ZXJTdGF0ZSgpOiBGaWx0ZXJTdGF0ZSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGEgcXVlc3QgbWF0Y2hlcyBjdXJyZW50IGZpbHRlciBzdGF0ZVxuICAgICAqL1xuICAgIHF1ZXN0TWF0Y2hlc0ZpbHRlcihxdWVzdE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBmaWx0ZXJzID0gdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZTtcbiAgICAgICAgY29uc3QgcXVlc3RGaWx0ZXIgPSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgbm8gZmlsdGVyIHNldCBmb3IgdGhpcyBxdWVzdCwgYWx3YXlzIHNob3dcbiAgICAgICAgaWYgKCFxdWVzdEZpbHRlcikgcmV0dXJuIHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmVyZ3kgZmlsdGVyXG4gICAgICAgIGlmIChmaWx0ZXJzLmFjdGl2ZUVuZXJneSAhPT0gXCJhbnlcIiAmJiBxdWVzdEZpbHRlci5lbmVyZ3lMZXZlbCAhPT0gZmlsdGVycy5hY3RpdmVFbmVyZ3kpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29udGV4dCBmaWx0ZXJcbiAgICAgICAgaWYgKGZpbHRlcnMuYWN0aXZlQ29udGV4dCAhPT0gXCJhbnlcIiAmJiBxdWVzdEZpbHRlci5jb250ZXh0ICE9PSBmaWx0ZXJzLmFjdGl2ZUNvbnRleHQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVGFncyBmaWx0ZXIgKHJlcXVpcmVzIEFOWSBvZiB0aGUgYWN0aXZlIHRhZ3MpXG4gICAgICAgIGlmIChmaWx0ZXJzLmFjdGl2ZVRhZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgaGFzVGFnID0gZmlsdGVycy5hY3RpdmVUYWdzLnNvbWUoKHRhZzogc3RyaW5nKSA9PiBxdWVzdEZpbHRlci50YWdzLmluY2x1ZGVzKHRhZykpO1xuICAgICAgICAgICAgaWYgKCFoYXNUYWcpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmlsdGVyIGEgbGlzdCBvZiBxdWVzdHMgYmFzZWQgb24gY3VycmVudCBmaWx0ZXIgc3RhdGVcbiAgICAgKi9cbiAgICBmaWx0ZXJRdWVzdHMocXVlc3RzOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+KTogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9PiB7XG4gICAgICAgIHJldHVybiBxdWVzdHMuZmlsdGVyKHF1ZXN0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0TmFtZSA9IHF1ZXN0LmJhc2VuYW1lIHx8IHF1ZXN0Lm5hbWU7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5xdWVzdE1hdGNoZXNGaWx0ZXIocXVlc3ROYW1lKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHF1ZXN0cyBieSBzcGVjaWZpYyBlbmVyZ3kgbGV2ZWxcbiAgICAgKi9cbiAgICBnZXRRdWVzdHNCeUVuZXJneShlbmVyZ3k6IEVuZXJneUxldmVsLCBxdWVzdHM6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4pOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+IHtcbiAgICAgICAgcmV0dXJuIHF1ZXN0cy5maWx0ZXIocSA9PiB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdE5hbWUgPSBxLmJhc2VuYW1lIHx8IHEubmFtZTtcbiAgICAgICAgICAgIGNvbnN0IGZpbHRlciA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV07XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyICYmIGZpbHRlci5lbmVyZ3lMZXZlbCA9PT0gZW5lcmd5O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcXVlc3RzIGJ5IHNwZWNpZmljIGNvbnRleHRcbiAgICAgKi9cbiAgICBnZXRRdWVzdHNCeUNvbnRleHQoY29udGV4dDogUXVlc3RDb250ZXh0LCBxdWVzdHM6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4pOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+IHtcbiAgICAgICAgcmV0dXJuIHF1ZXN0cy5maWx0ZXIocSA9PiB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdE5hbWUgPSBxLmJhc2VuYW1lIHx8IHEubmFtZTtcbiAgICAgICAgICAgIGNvbnN0IGZpbHRlciA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV07XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyICYmIGZpbHRlci5jb250ZXh0ID09PSBjb250ZXh0O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcXVlc3RzIGJ5IHNwZWNpZmljIHRhZ3NcbiAgICAgKi9cbiAgICBnZXRRdWVzdHNCeVRhZ3ModGFnczogc3RyaW5nW10sIHF1ZXN0czogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9Pik6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4ge1xuICAgICAgICByZXR1cm4gcXVlc3RzLmZpbHRlcihxID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0TmFtZSA9IHEuYmFzZW5hbWUgfHwgcS5uYW1lO1xuICAgICAgICAgICAgY29uc3QgZmlsdGVyID0gdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnNbcXVlc3ROYW1lXTtcbiAgICAgICAgICAgIGlmICghZmlsdGVyKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm4gdGFncy5zb21lKHRhZyA9PiBmaWx0ZXIudGFncy5pbmNsdWRlcyh0YWcpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2xlYXIgYWxsIGFjdGl2ZSBmaWx0ZXJzXG4gICAgICovXG4gICAgY2xlYXJGaWx0ZXJzKCk6IHZvaWQge1xuICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlID0ge1xuICAgICAgICAgICAgYWN0aXZlRW5lcmd5OiBcImFueVwiLFxuICAgICAgICAgICAgYWN0aXZlQ29udGV4dDogXCJhbnlcIixcbiAgICAgICAgICAgIGFjdGl2ZVRhZ3M6IFtdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCB1bmlxdWUgdGFncyB1c2VkIGFjcm9zcyBhbGwgcXVlc3RzXG4gICAgICovXG4gICAgZ2V0QXZhaWxhYmxlVGFncygpOiBzdHJpbmdbXSB7XG4gICAgICAgIGNvbnN0IHRhZ3MgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgXG4gICAgICAgIGZvciAoY29uc3QgcXVlc3ROYW1lIGluIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzKSB7XG4gICAgICAgICAgICBjb25zdCBmaWx0ZXIgPSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdO1xuICAgICAgICAgICAgZmlsdGVyLnRhZ3MuZm9yRWFjaCgodGFnOiBzdHJpbmcpID0+IHRhZ3MuYWRkKHRhZykpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gQXJyYXkuZnJvbSh0YWdzKS5zb3J0KCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHN1bW1hcnkgc3RhdHMgYWJvdXQgZmlsdGVyZWQgc3RhdGVcbiAgICAgKi9cbiAgICBnZXRGaWx0ZXJTdGF0cyhhbGxRdWVzdHM6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4pOiB7XG4gICAgICAgIHRvdGFsOiBudW1iZXI7XG4gICAgICAgIGZpbHRlcmVkOiBudW1iZXI7XG4gICAgICAgIGFjdGl2ZUZpbHRlcnNDb3VudDogbnVtYmVyO1xuICAgIH0ge1xuICAgICAgICBjb25zdCBmaWx0ZXJlZCA9IHRoaXMuZmlsdGVyUXVlc3RzKGFsbFF1ZXN0cyk7XG4gICAgICAgIGNvbnN0IGFjdGl2ZUZpbHRlcnNDb3VudCA9ICh0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUVuZXJneSAhPT0gXCJhbnlcIiA/IDEgOiAwKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUNvbnRleHQgIT09IFwiYW55XCIgPyAxIDogMCkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVUYWdzLmxlbmd0aCA+IDAgPyAxIDogMCk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdG90YWw6IGFsbFF1ZXN0cy5sZW5ndGgsXG4gICAgICAgICAgICBmaWx0ZXJlZDogZmlsdGVyZWQubGVuZ3RoLFxuICAgICAgICAgICAgYWN0aXZlRmlsdGVyc0NvdW50OiBhY3RpdmVGaWx0ZXJzQ291bnRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgYSBzcGVjaWZpYyBmaWx0ZXIgdmFsdWVcbiAgICAgKiBVc2VmdWwgZm9yIFVJIHRvZ2dsZSBidXR0b25zXG4gICAgICovXG4gICAgdG9nZ2xlRW5lcmd5RmlsdGVyKGVuZXJneTogRW5lcmd5TGV2ZWwgfCBcImFueVwiKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUVuZXJneSA9PT0gZW5lcmd5KSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUVuZXJneSA9IFwiYW55XCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUVuZXJneSA9IGVuZXJneSBhcyBhbnk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgY29udGV4dCBmaWx0ZXJcbiAgICAgKi9cbiAgICB0b2dnbGVDb250ZXh0RmlsdGVyKGNvbnRleHQ6IFF1ZXN0Q29udGV4dCB8IFwiYW55XCIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlQ29udGV4dCA9PT0gY29udGV4dCkge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVDb250ZXh0ID0gXCJhbnlcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlQ29udGV4dCA9IGNvbnRleHQgYXMgYW55O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGEgdGFnIGluIHRoZSBhY3RpdmUgdGFnIGxpc3RcbiAgICAgKi9cbiAgICB0b2dnbGVUYWcodGFnOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVUYWdzLmluZGV4T2YodGFnKTtcbiAgICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZVRhZ3Muc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZVRhZ3MucHVzaCh0YWcpO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgQXBwLCBURmlsZSwgVEZvbGRlciwgTm90aWNlLCBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBTa2lsbCwgTW9kaWZpZXIsIERhaWx5TWlzc2lvbiB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgQXVkaW9Db250cm9sbGVyLCBUaW55RW1pdHRlciB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgQ2hhb3NNb2RhbCwgVmljdG9yeU1vZGFsIH0gZnJvbSAnLi91aS9tb2RhbHMnO1xuaW1wb3J0IHsgQW5hbHl0aWNzRW5naW5lIH0gZnJvbSAnLi9lbmdpbmVzL0FuYWx5dGljc0VuZ2luZSc7XG5pbXBvcnQgeyBNZWRpdGF0aW9uRW5naW5lIH0gZnJvbSAnLi9lbmdpbmVzL01lZGl0YXRpb25FbmdpbmUnO1xuaW1wb3J0IHsgUmVzZWFyY2hFbmdpbmUgfSBmcm9tICcuL2VuZ2luZXMvUmVzZWFyY2hFbmdpbmUnO1xuaW1wb3J0IHsgQ2hhaW5zRW5naW5lIH0gZnJvbSAnLi9lbmdpbmVzL0NoYWluc0VuZ2luZSc7XG5pbXBvcnQgeyBGaWx0ZXJzRW5naW5lIH0gZnJvbSAnLi9lbmdpbmVzL0ZpbHRlcnNFbmdpbmUnO1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9NT0RJRklFUjogTW9kaWZpZXIgPSB7IG5hbWU6IFwiQ2xlYXIgU2tpZXNcIiwgZGVzYzogXCJObyBlZmZlY3RzLlwiLCB4cE11bHQ6IDEsIGdvbGRNdWx0OiAxLCBwcmljZU11bHQ6IDEsIGljb246IFwi4piA77iPXCIgfTtcbmV4cG9ydCBjb25zdCBDSEFPU19UQUJMRTogTW9kaWZpZXJbXSA9IFtcbiAgICB7IG5hbWU6IFwiQ2xlYXIgU2tpZXNcIiwgZGVzYzogXCJOb3JtYWwuXCIsIHhwTXVsdDogMSwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMSwgaWNvbjogXCLimIDvuI9cIiB9LFxuICAgIHsgbmFtZTogXCJGbG93IFN0YXRlXCIsIGRlc2M6IFwiKzUwJSBYUC5cIiwgeHBNdWx0OiAxLjUsIGdvbGRNdWx0OiAxLCBwcmljZU11bHQ6IDEsIGljb246IFwi8J+MilwiIH0sXG4gICAgeyBuYW1lOiBcIldpbmRmYWxsXCIsIGRlc2M6IFwiKzUwJSBHb2xkLlwiLCB4cE11bHQ6IDEsIGdvbGRNdWx0OiAxLjUsIHByaWNlTXVsdDogMSwgaWNvbjogXCLwn5KwXCIgfSxcbiAgICB7IG5hbWU6IFwiSW5mbGF0aW9uXCIsIGRlc2M6IFwiUHJpY2VzIDJ4LlwiLCB4cE11bHQ6IDEsIGdvbGRNdWx0OiAxLCBwcmljZU11bHQ6IDIsIGljb246IFwi8J+TiFwiIH0sXG4gICAgeyBuYW1lOiBcIkJyYWluIEZvZ1wiLCBkZXNjOiBcIlhQIDAuNXguXCIsIHhwTXVsdDogMC41LCBnb2xkTXVsdDogMSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIvCfjKvvuI9cIiB9LFxuICAgIHsgbmFtZTogXCJSaXZhbCBTYWJvdGFnZVwiLCBkZXNjOiBcIkdvbGQgMC41eC5cIiwgeHBNdWx0OiAxLCBnb2xkTXVsdDogMC41LCBwcmljZU11bHQ6IDEsIGljb246IFwi8J+Vte+4j1wiIH0sXG4gICAgeyBuYW1lOiBcIkFkcmVuYWxpbmVcIiwgZGVzYzogXCIyeCBYUCwgLTUgSFAvUS5cIiwgeHBNdWx0OiAyLCBnb2xkTXVsdDogMSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIvCfkolcIiB9XG5dO1xuZXhwb3J0IGNvbnN0IFBPV0VSX1VQUyA9IFtcbiAgICB7IGlkOiBcImZvY3VzX3BvdGlvblwiLCBuYW1lOiBcIkZvY3VzIFBvdGlvblwiLCBpY29uOiBcIvCfp6pcIiwgZGVzYzogXCIyeCBYUCAoMWgpXCIsIGNvc3Q6IDEwMCwgZHVyYXRpb246IDYwLCBlZmZlY3Q6IHsgeHBNdWx0OiAyIH0gfSxcbiAgICB7IGlkOiBcIm1pZGFzX3RvdWNoXCIsIG5hbWU6IFwiTWlkYXMgVG91Y2hcIiwgaWNvbjogXCLinKhcIiwgZGVzYzogXCIzeCBHb2xkICgzMG0pXCIsIGNvc3Q6IDE1MCwgZHVyYXRpb246IDMwLCBlZmZlY3Q6IHsgZ29sZE11bHQ6IDMgfSB9LFxuICAgIHsgaWQ6IFwiaXJvbl93aWxsXCIsIG5hbWU6IFwiSXJvbiBXaWxsXCIsIGljb246IFwi8J+boe+4j1wiLCBkZXNjOiBcIjUwJSBEbWcgUmVkdWN0ICgyaClcIiwgY29zdDogMjAwLCBkdXJhdGlvbjogMTIwLCBlZmZlY3Q6IHsgZGFtYWdlTXVsdDogMC41IH0gfVxuXTtcblxuY29uc3QgQk9TU19EQVRBOiBSZWNvcmQ8bnVtYmVyLCB7IG5hbWU6IHN0cmluZywgZGVzYzogc3RyaW5nLCBocF9wZW46IG51bWJlciB9PiA9IHtcbiAgICAxMDogeyBuYW1lOiBcIlRoZSBHYXRla2VlcGVyXCIsIGRlc2M6IFwiVGhlIGZpcnN0IG1ham9yIGZpbHRlci5cIiwgaHBfcGVuOiAyMCB9LFxuICAgIDIwOiB7IG5hbWU6IFwiVGhlIFNoYWRvdyBTZWxmXCIsIGRlc2M6IFwiWW91ciBvd24gYmFkIGhhYml0cyBtYW5pZmVzdC5cIiwgaHBfcGVuOiAzMCB9LFxuICAgIDMwOiB7IG5hbWU6IFwiVGhlIE1vdW50YWluXCIsIGRlc2M6IFwiVGhlIHBlYWsgaXMgdmlzaWJsZS5cIiwgaHBfcGVuOiA0MCB9LFxuICAgIDUwOiB7IG5hbWU6IFwiU2lzeXBodXMgUHJpbWVcIiwgZGVzYzogXCJPbmUgbXVzdCBpbWFnaW5lIFNpc3lwaHVzIGhhcHB5LlwiLCBocF9wZW46IDk5IH1cbn07XG5cbmNvbnN0IE1JU1NJT05fUE9PTCA9IFtcbiAgICB7IGlkOiBcIm1vcm5pbmdfd2luXCIsIG5hbWU6IFwi4piA77iPIE1vcm5pbmcgV2luXCIsIGRlc2M6IFwiQ29tcGxldGUgMSBUcml2aWFsIHF1ZXN0IGJlZm9yZSAxMCBBTVwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMCwgZ29sZDogMTUgfSwgY2hlY2s6IFwibW9ybmluZ190cml2aWFsXCIgfSxcbiAgICB7IGlkOiBcIm1vbWVudHVtXCIsIG5hbWU6IFwi8J+UpSBNb21lbnR1bVwiLCBkZXNjOiBcIkNvbXBsZXRlIDMgcXVlc3RzIHRvZGF5XCIsIHRhcmdldDogMywgcmV3YXJkOiB7IHhwOiAyMCwgZ29sZDogMCB9LCBjaGVjazogXCJxdWVzdF9jb3VudFwiIH0sXG4gICAgeyBpZDogXCJ6ZXJvX2luYm94XCIsIG5hbWU6IFwi8J+nmCBaZXJvIEluYm94XCIsIGRlc2M6IFwiUHJvY2VzcyBhbGwgZmlsZXMgaW4gJ1NjcmFwcydcIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDAsIGdvbGQ6IDEwIH0sIGNoZWNrOiBcInplcm9faW5ib3hcIiB9LFxuICAgIHsgaWQ6IFwic3BlY2lhbGlzdFwiLCBuYW1lOiBcIvCfjq8gU3BlY2lhbGlzdFwiLCBkZXNjOiBcIlVzZSB0aGUgc2FtZSBza2lsbCAzIHRpbWVzXCIsIHRhcmdldDogMywgcmV3YXJkOiB7IHhwOiAxNSwgZ29sZDogMCB9LCBjaGVjazogXCJza2lsbF9yZXBlYXRcIiB9LFxuICAgIHsgaWQ6IFwiaGlnaF9zdGFrZXNcIiwgbmFtZTogXCLwn5KqIEhpZ2ggU3Rha2VzXCIsIGRlc2M6IFwiQ29tcGxldGUgMSBIaWdoIFN0YWtlcyBxdWVzdFwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMCwgZ29sZDogMzAgfSwgY2hlY2s6IFwiaGlnaF9zdGFrZXNcIiB9LFxuICAgIHsgaWQ6IFwic3BlZWRfZGVtb25cIiwgbmFtZTogXCLimqEgU3BlZWQgRGVtb25cIiwgZGVzYzogXCJDb21wbGV0ZSBxdWVzdCB3aXRoaW4gMmggb2YgY3JlYXRpb25cIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDI1LCBnb2xkOiAwIH0sIGNoZWNrOiBcImZhc3RfY29tcGxldGVcIiB9LFxuICAgIHsgaWQ6IFwic3luZXJnaXN0XCIsIG5hbWU6IFwi8J+UlyBTeW5lcmdpc3RcIiwgZGVzYzogXCJDb21wbGV0ZSBxdWVzdCB3aXRoIFByaW1hcnkgKyBTZWNvbmRhcnkgc2tpbGxcIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDAsIGdvbGQ6IDEwIH0sIGNoZWNrOiBcInN5bmVyZ3lcIiB9LFxuICAgIHsgaWQ6IFwic3Vydml2b3JcIiwgbmFtZTogXCLwn5uh77iPIFN1cnZpdm9yXCIsIGRlc2M6IFwiRG9uJ3QgdGFrZSBhbnkgZGFtYWdlIHRvZGF5XCIsIHRhcmdldDogMSwgcmV3YXJkOiB7IHhwOiAwLCBnb2xkOiAyMCB9LCBjaGVjazogXCJub19kYW1hZ2VcIiB9LFxuICAgIHsgaWQ6IFwicmlza190YWtlclwiLCBuYW1lOiBcIvCfjrIgUmlzayBUYWtlclwiLCBkZXNjOiBcIkNvbXBsZXRlIERpZmZpY3VsdHkgNCsgcXVlc3RcIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDE1LCBnb2xkOiAwIH0sIGNoZWNrOiBcImhhcmRfcXVlc3RcIiB9XG5dO1xuXG5leHBvcnQgY2xhc3MgU2lzeXBodXNFbmdpbmUgZXh0ZW5kcyBUaW55RW1pdHRlciB7XG4gICAgYXBwOiBBcHA7XG4gICAgcGx1Z2luOiBhbnk7XG4gICAgYXVkaW86IEF1ZGlvQ29udHJvbGxlcjtcbiAgICBhbmFseXRpY3NFbmdpbmU6IEFuYWx5dGljc0VuZ2luZTtcbiAgICBtZWRpdGF0aW9uRW5naW5lOiBNZWRpdGF0aW9uRW5naW5lO1xuICAgIHJlc2VhcmNoRW5naW5lOiBSZXNlYXJjaEVuZ2luZTtcbiAgICBjaGFpbnNFbmdpbmU6IENoYWluc0VuZ2luZTtcbiAgICBmaWx0ZXJzRW5naW5lOiBGaWx0ZXJzRW5naW5lO1xuXG4gICAgLy8gW0ZFQVRVUkVdIFVuZG8gQnVmZmVyXG4gICAgcHJpdmF0ZSBkZWxldGVkUXVlc3RCdWZmZXI6IEFycmF5PHsgbmFtZTogc3RyaW5nOyBjb250ZW50OiBzdHJpbmc7IHBhdGg6IHN0cmluZzsgZGVsZXRlZEF0OiBudW1iZXIgfT4gPSBbXTtcblxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IGFueSwgYXVkaW86IEF1ZGlvQ29udHJvbGxlcikge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmFwcCA9IGFwcDtcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgICAgIHRoaXMuYXVkaW8gPSBhdWRpbztcbiAgICAgICAgXG4gICAgICAgIHRoaXMuYW5hbHl0aWNzRW5naW5lID0gbmV3IEFuYWx5dGljc0VuZ2luZSh0aGlzLnBsdWdpbi5zZXR0aW5ncywgdGhpcy5hdWRpbyk7XG4gICAgICAgIHRoaXMubWVkaXRhdGlvbkVuZ2luZSA9IG5ldyBNZWRpdGF0aW9uRW5naW5lKHRoaXMucGx1Z2luLnNldHRpbmdzLCB0aGlzLmF1ZGlvKTtcbiAgICAgICAgdGhpcy5yZXNlYXJjaEVuZ2luZSA9IG5ldyBSZXNlYXJjaEVuZ2luZSh0aGlzLnBsdWdpbi5zZXR0aW5ncywgdGhpcy5hcHAsIHRoaXMuYXVkaW8pO1xuICAgICAgICB0aGlzLmNoYWluc0VuZ2luZSA9IG5ldyBDaGFpbnNFbmdpbmUodGhpcy5wbHVnaW4uc2V0dGluZ3MsIHRoaXMuYXVkaW8pO1xuICAgICAgICB0aGlzLmZpbHRlcnNFbmdpbmUgPSBuZXcgRmlsdGVyc0VuZ2luZSh0aGlzLnBsdWdpbi5zZXR0aW5ncyk7XG4gICAgfVxuXG4gICAgZ2V0IHNldHRpbmdzKCk6IFNpc3lwaHVzU2V0dGluZ3MgeyByZXR1cm4gdGhpcy5wbHVnaW4uc2V0dGluZ3M7IH1cbiAgICBzZXQgc2V0dGluZ3ModmFsOiBTaXN5cGh1c1NldHRpbmdzKSB7IHRoaXMucGx1Z2luLnNldHRpbmdzID0gdmFsOyB9XG5cbiAgICBhc3luYyBzYXZlKCkgeyBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTsgdGhpcy50cmlnZ2VyKFwidXBkYXRlXCIpOyB9XG5cbiAgICAvLyBbRklYXSBTYWZlIEFyY2hpdmVyOiBIYW5kbGVzIGR1cGxpY2F0ZXMgYnkgcmVuYW1pbmcgKFF1ZXN0IC0+IFF1ZXN0ICgxKSlcbiAgICBhc3luYyBzYWZlQXJjaGl2ZShmaWxlOiBURmlsZSwgc3ViZm9sZGVyOiBzdHJpbmcgPSBcIkFyY2hpdmVcIikge1xuICAgICAgICBjb25zdCByb290ID0gXCJBY3RpdmVfUnVuXCI7XG4gICAgICAgIGNvbnN0IHRhcmdldEZvbGRlciA9IGAke3Jvb3R9LyR7c3ViZm9sZGVyfWA7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChyb290KSkgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKHJvb3QpO1xuICAgICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0YXJnZXRGb2xkZXIpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIodGFyZ2V0Rm9sZGVyKTtcblxuICAgICAgICBsZXQgdGFyZ2V0UGF0aCA9IGAke3RhcmdldEZvbGRlcn0vJHtmaWxlLm5hbWV9YDtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbGxpc2lvbiBEZXRlY3Rpb24gTG9vcFxuICAgICAgICBsZXQgY291bnRlciA9IDE7XG4gICAgICAgIHdoaWxlICh0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGFyZ2V0UGF0aCkpIHtcbiAgICAgICAgICAgIHRhcmdldFBhdGggPSBgJHt0YXJnZXRGb2xkZXJ9LyR7ZmlsZS5iYXNlbmFtZX0gKCR7Y291bnRlcn0pLiR7ZmlsZS5leHRlbnNpb259YDtcbiAgICAgICAgICAgIGNvdW50ZXIrKztcbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnJlbmFtZUZpbGUoZmlsZSwgdGFyZ2V0UGF0aCk7XG4gICAgfVxuXG4gICAgYWN0aXZhdGVCdWZmKGl0ZW06IGFueSkge1xuICAgICAgICBjb25zdCBleHBpcmVzID0gbW9tZW50KCkuYWRkKGl0ZW0uZHVyYXRpb24sICdtaW51dGVzJykudG9JU09TdHJpbmcoKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5hY3RpdmVCdWZmcy5wdXNoKHtcbiAgICAgICAgICAgIGlkOiBpdGVtLmlkLFxuICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lLFxuICAgICAgICAgICAgaWNvbjogaXRlbS5pY29uLFxuICAgICAgICAgICAgZXhwaXJlc0F0OiBleHBpcmVzLFxuICAgICAgICAgICAgZWZmZWN0OiBpdGVtLmVmZmVjdFxuICAgICAgICB9KTtcbiAgICAgICAgbmV3IE5vdGljZShg8J+lpCBHdWxwISAke2l0ZW0ubmFtZX0gYWN0aXZlIGZvciAke2l0ZW0uZHVyYXRpb259bWApO1xuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICByb2xsRGFpbHlNaXNzaW9ucygpIHtcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlID0gWy4uLk1JU1NJT05fUE9PTF07XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkOiBEYWlseU1pc3Npb25bXSA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgICAgICAgaWYgKGF2YWlsYWJsZS5sZW5ndGggPT09IDApIGJyZWFrO1xuICAgICAgICAgICAgY29uc3QgaWR4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYXZhaWxhYmxlLmxlbmd0aCk7XG4gICAgICAgICAgICBjb25zdCBtaXNzaW9uID0gYXZhaWxhYmxlLnNwbGljZShpZHgsIDEpWzBdO1xuICAgICAgICAgICAgc2VsZWN0ZWQucHVzaCh7IC4uLm1pc3Npb24sIGNoZWNrRnVuYzogbWlzc2lvbi5jaGVjaywgcHJvZ3Jlc3M6IDAsIGNvbXBsZXRlZDogZmFsc2UgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25zID0gc2VsZWN0ZWQ7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9uRGF0ZSA9IG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3RzQ29tcGxldGVkVG9kYXkgPSAwO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5ID0ge307XG4gICAgfVxuXG4gICAgY2hlY2tEYWlseU1pc3Npb25zKGNvbnRleHQ6IHsgdHlwZT86IHN0cmluZzsgZGlmZmljdWx0eT86IG51bWJlcjsgc2tpbGw/OiBzdHJpbmc7IHNlY29uZGFyeVNraWxsPzogc3RyaW5nOyBoaWdoU3Rha2VzPzogYm9vbGVhbjsgcXVlc3RDcmVhdGVkPzogbnVtYmVyIH0pIHtcbiAgICAgICAgY29uc3Qgbm93ID0gbW9tZW50KCk7XG4gICAgICAgIGxldCBqdXN0RmluaXNoZWRBbGwgPSBmYWxzZTtcblxuICAgICAgICB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMuZm9yRWFjaChtaXNzaW9uID0+IHtcbiAgICAgICAgICAgIGlmIChtaXNzaW9uLmNvbXBsZXRlZCkgcmV0dXJuO1xuICAgICAgICAgICAgc3dpdGNoIChtaXNzaW9uLmNoZWNrRnVuYykge1xuICAgICAgICAgICAgICAgIGNhc2UgXCJ6ZXJvX2luYm94XCI6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNjcmFwcyA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChcIlNjcmFwc1wiKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjcmFwcyBpbnN0YW5jZW9mIFRGb2xkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pc3Npb24ucHJvZ3Jlc3MgPSBzY3JhcHMuY2hpbGRyZW4ubGVuZ3RoID09PSAwID8gMSA6IDA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtaXNzaW9uLnByb2dyZXNzID0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwibW9ybmluZ190cml2aWFsXCI6IGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LmRpZmZpY3VsdHkgPT09IDEgJiYgbm93LmhvdXIoKSA8IDEwKSBtaXNzaW9uLnByb2dyZXNzKys7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJxdWVzdF9jb3VudFwiOiBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIpIG1pc3Npb24ucHJvZ3Jlc3MgPSB0aGlzLnNldHRpbmdzLnF1ZXN0c0NvbXBsZXRlZFRvZGF5OyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiaGlnaF9zdGFrZXNcIjogaWYgKGNvbnRleHQudHlwZSA9PT0gXCJjb21wbGV0ZVwiICYmIGNvbnRleHQuaGlnaFN0YWtlcykgbWlzc2lvbi5wcm9ncmVzcysrOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiZmFzdF9jb21wbGV0ZVwiOiBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIgJiYgY29udGV4dC5xdWVzdENyZWF0ZWQgJiYgbW9tZW50KCkuZGlmZihtb21lbnQoY29udGV4dC5xdWVzdENyZWF0ZWQpLCAnaG91cnMnKSA8PSAyKSBtaXNzaW9uLnByb2dyZXNzKys7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJzeW5lcmd5XCI6IGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LnNraWxsICYmIGNvbnRleHQuc2Vjb25kYXJ5U2tpbGwgJiYgY29udGV4dC5zZWNvbmRhcnlTa2lsbCAhPT0gXCJOb25lXCIpIG1pc3Npb24ucHJvZ3Jlc3MrKzsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIm5vX2RhbWFnZVwiOiBpZiAoY29udGV4dC50eXBlID09PSBcImRhbWFnZVwiKSBtaXNzaW9uLnByb2dyZXNzID0gMDsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcImhhcmRfcXVlc3RcIjogaWYgKGNvbnRleHQudHlwZSA9PT0gXCJjb21wbGV0ZVwiICYmIGNvbnRleHQuZGlmZmljdWx0eSAmJiBjb250ZXh0LmRpZmZpY3VsdHkgPj0gNCkgbWlzc2lvbi5wcm9ncmVzcysrOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwic2tpbGxfcmVwZWF0XCI6IFxuICAgICAgICAgICAgICAgICAgICBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIgJiYgY29udGV4dC5za2lsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5za2lsbFVzZXNUb2RheVtjb250ZXh0LnNraWxsXSA9ICh0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5W2NvbnRleHQuc2tpbGxdIHx8IDApICsgMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pc3Npb24ucHJvZ3Jlc3MgPSBNYXRoLm1heCgwLCAuLi5PYmplY3QudmFsdWVzKHRoaXMuc2V0dGluZ3Muc2tpbGxVc2VzVG9kYXkpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWlzc2lvbi5wcm9ncmVzcyA+PSBtaXNzaW9uLnRhcmdldCAmJiAhbWlzc2lvbi5jb21wbGV0ZWQpIHtcbiAgICAgICAgICAgICAgICBtaXNzaW9uLmNvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy54cCArPSBtaXNzaW9uLnJld2FyZC54cDtcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLmdvbGQgKz0gbWlzc2lvbi5yZXdhcmQuZ29sZDtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGDinIUgTWlzc2lvbiBDb21wbGV0ZTogJHttaXNzaW9uLm5hbWV9YCk7XG4gICAgICAgICAgICAgICAgdGhpcy5hdWRpby5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9ucy5ldmVyeShtID0+IG0uY29tcGxldGVkKSkganVzdEZpbmlzaGVkQWxsID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGp1c3RGaW5pc2hlZEFsbCkge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5nb2xkICs9IDUwO1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIvCfjokgQWxsIE1pc3Npb25zIENvbXBsZXRlISArNTAgQm9udXMgR29sZFwiKTtcbiAgICAgICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH1cblxuICAgIGdldERpZmZpY3VsdHlOdW1iZXIoZGlmZkxhYmVsOiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgICBjb25zdCBtYXA6IGFueSA9IHsgXCJUcml2aWFsXCI6IDEsIFwiRWFzeVwiOiAyLCBcIk1lZGl1bVwiOiAzLCBcIkhhcmRcIjogNCwgXCJTVUlDSURFXCI6IDUgfTtcbiAgICAgICAgcmV0dXJuIG1hcFtkaWZmTGFiZWxdIHx8IDM7XG4gICAgfVxuXG4gICAgYXN5bmMgY2hlY2tEYWlseUxvZ2luKCkge1xuICAgICAgICBjb25zdCB0b2RheSA9IG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmxhc3RMb2dpbikge1xuICAgICAgICAgICAgY29uc3QgZGF5c0RpZmYgPSBtb21lbnQoKS5kaWZmKG1vbWVudCh0aGlzLnNldHRpbmdzLmxhc3RMb2dpbiksICdkYXlzJyk7XG4gICAgICAgICAgICBpZiAoZGF5c0RpZmYgPiAyKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgcm90RGFtYWdlID0gKGRheXNEaWZmIC0gMSkgKiAxMDtcbiAgICAgICAgICAgICAgICBpZiAocm90RGFtYWdlID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLmhwIC09IHJvdERhbWFnZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5oaXN0b3J5LnB1c2goeyBkYXRlOiB0b2RheSwgc3RhdHVzOiBcInJvdFwiLCB4cEVhcm5lZDogLXJvdERhbWFnZSB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubGFzdExvZ2luICE9PSB0b2RheSkge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5tYXhIcCA9IDEwMCArICh0aGlzLnNldHRpbmdzLmxldmVsICogNSk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmhwID0gTWF0aC5taW4odGhpcy5zZXR0aW5ncy5tYXhIcCwgdGhpcy5zZXR0aW5ncy5ocCArIDIwKTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZGFtYWdlVGFrZW5Ub2RheSA9IDA7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwgPSBcIlwiO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0TG9naW4gPSB0b2RheTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUnVzdCBMb2dpY1xuICAgICAgICAgICAgY29uc3QgdG9kYXlNb21lbnQgPSBtb21lbnQoKTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc2tpbGxzLmZvckVhY2gocyA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHMubGFzdFVzZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRvZGF5TW9tZW50LmRpZmYobW9tZW50KHMubGFzdFVzZWQpLCAnZGF5cycpID4gMyAmJiAhdGhpcy5pc1Jlc3RpbmcoKSkgeyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHMucnVzdCA9IE1hdGgubWluKDEwLCAocy5ydXN0IHx8IDApICsgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzLnhwUmVxID0gTWF0aC5mbG9vcihzLnhwUmVxICogMS4xKTsgXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9uRGF0ZSAhPT0gdG9kYXkpIHRoaXMucm9sbERhaWx5TWlzc2lvbnMoKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucm9sbENoYW9zKHRydWUpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBjb21wbGV0ZVF1ZXN0KGZpbGU6IFRGaWxlKSB7XG4gICAgICAgIGlmICh0aGlzLm1lZGl0YXRpb25FbmdpbmUuaXNMb2NrZWREb3duKCkpIHsgbmV3IE5vdGljZShcIkxPQ0tET1dOIEFDVElWRVwiKTsgcmV0dXJuOyB9XG4gICAgICAgIFxuICAgICAgICAvLyAtLS0gQ09NQk8gU1lTVEVNIC0tLVxuICAgICAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgICBjb25zdCB0aW1lRGlmZiA9IG5vdyAtIHRoaXMuc2V0dGluZ3MubGFzdENvbXBsZXRpb25UaW1lO1xuICAgICAgICBjb25zdCBDT01CT19XSU5ET1cgPSAxMCAqIDYwICogMTAwMDsgLy8gMTAgbWludXRlc1xuXG4gICAgICAgIGlmICh0aW1lRGlmZiA8IENPTUJPX1dJTkRPVykge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5jb21ib0NvdW50Kys7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7IFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5jb21ib0NvdW50ID0gMTsgXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0Q29tcGxldGlvblRpbWUgPSBub3c7XG4gICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gICAgICAgIGNvbnN0IGZtID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk/LmZyb250bWF0dGVyO1xuICAgICAgICBpZiAoIWZtKSByZXR1cm47XG4gICAgICAgIGNvbnN0IHF1ZXN0TmFtZSA9IGZpbGUuYmFzZW5hbWU7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5jaGFpbnNFbmdpbmUuaXNRdWVzdEluQ2hhaW4ocXVlc3ROYW1lKSkge1xuICAgICAgICAgICAgIGNvbnN0IGNhblN0YXJ0ID0gdGhpcy5jaGFpbnNFbmdpbmUuY2FuU3RhcnRRdWVzdChxdWVzdE5hbWUpO1xuICAgICAgICAgICAgIGlmICghY2FuU3RhcnQpIHsgbmV3IE5vdGljZShcIkxvY2tlZCBieSBDaGFpbi5cIik7IHJldHVybjsgfVxuICAgICAgICAgICAgIFxuICAgICAgICAgICAgIGNvbnN0IGNoYWluUmVzdWx0ID0gYXdhaXQgdGhpcy5jaGFpbnNFbmdpbmUuY29tcGxldGVDaGFpblF1ZXN0KHF1ZXN0TmFtZSk7XG4gICAgICAgICAgICAgaWYgKGNoYWluUmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShjaGFpblJlc3VsdC5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgaWYgKGNoYWluUmVzdWx0LmNoYWluQ29tcGxldGUpIHtcbiAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MueHAgKz0gY2hhaW5SZXN1bHQuYm9udXNYcDtcbiAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYPCfjokgQ2hhaW4gQm9udXM6ICske2NoYWluUmVzdWx0LmJvbnVzWHB9IFhQIWApO1xuICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZtLmlzX2Jvc3MpIHtcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gZmlsZS5iYXNlbmFtZS5tYXRjaCgvQk9TU19MVkwoXFxkKykvKTtcbiAgICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxldmVsID0gcGFyc2VJbnQobWF0Y2hbMV0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuYW5hbHl0aWNzRW5naW5lLmRlZmVhdEJvc3MobGV2ZWwpO1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UocmVzdWx0Lm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmdhbWVXb24pIG5ldyBWaWN0b3J5TW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luKS5vcGVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmFuYWx5dGljc0VuZ2luZS50cmFja0RhaWx5TWV0cmljcyhcInF1ZXN0X2NvbXBsZXRlXCIsIDEpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMudG90YWxDb21iYXQrKztcbiAgICAgICBcbiAgICAgICAgLy8gUmV3YXJkc1xuICAgICAgICBsZXQgeHBNdWx0ID0gdGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyLnhwTXVsdDtcbiAgICAgICAgbGV0IGdvbGRNdWx0ID0gdGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyLmdvbGRNdWx0O1xuXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuYWN0aXZlQnVmZnMuZm9yRWFjaChiID0+IHtcbiAgICAgICAgICAgIGlmIChiLmVmZmVjdC54cE11bHQpIHhwTXVsdCAqPSBiLmVmZmVjdC54cE11bHQ7XG4gICAgICAgICAgICBpZiAoYi5lZmZlY3QuZ29sZE11bHQpIGdvbGRNdWx0ICo9IGIuZWZmZWN0LmdvbGRNdWx0O1xuICAgICAgICB9KTtcblxuICAgICAgICBsZXQgeHAgPSAoZm0ueHBfcmV3YXJkIHx8IDIwKSAqIHhwTXVsdDtcbiAgICAgICAgbGV0IGdvbGQgPSAoZm0uZ29sZF9yZXdhcmQgfHwgMCkgKiBnb2xkTXVsdDtcblxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5jb21ib0NvdW50ID4gMSkge1xuICAgICAgICAgICAgY29uc3QgYm9udXMgPSBNYXRoLmZsb29yKHhwICogMC4xICogKHRoaXMuc2V0dGluZ3MuY29tYm9Db3VudCAtIDEpKTsgXG4gICAgICAgICAgICB4cCArPSBib251cztcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoYPCflKUgQ09NQk8geCR7dGhpcy5zZXR0aW5ncy5jb21ib0NvdW50fSEgKyR7Ym9udXN9IEJvbnVzIFhQYCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNraWxsTmFtZSA9IGZtLnNraWxsIHx8IFwiTm9uZVwiO1xuICAgICAgICBjb25zdCBza2lsbCA9IHRoaXMuc2V0dGluZ3Muc2tpbGxzLmZpbmQocyA9PiBzLm5hbWUgPT09IHNraWxsTmFtZSk7XG4gICAgICAgIGlmIChza2lsbCkge1xuICAgICAgICAgICAgc2tpbGwucnVzdCA9IDA7XG4gICAgICAgICAgICBza2lsbC54cFJlcSA9IE1hdGguZmxvb3Ioc2tpbGwueHBSZXEgLyAxLjEpO1xuICAgICAgICAgICAgc2tpbGwubGFzdFVzZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICBza2lsbC54cCArPSAxO1xuICAgICAgICAgICAgaWYgKHNraWxsLnhwID49IHNraWxsLnhwUmVxKSB7IHNraWxsLmxldmVsKys7IHNraWxsLnhwID0gMDsgbmV3IE5vdGljZShg8J+noCAke3NraWxsLm5hbWV9IExldmVsZWQgVXAhYCk7IH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNlY29uZGFyeSA9IGZtLnNlY29uZGFyeV9za2lsbCB8fCBcIk5vbmVcIjtcbiAgICAgICAgaWYgKHNlY29uZGFyeSAmJiBzZWNvbmRhcnkgIT09IFwiTm9uZVwiKSB7XG4gICAgICAgICAgICBjb25zdCBzZWNTa2lsbCA9IHRoaXMuc2V0dGluZ3Muc2tpbGxzLmZpbmQocyA9PiBzLm5hbWUgPT09IHNlY29uZGFyeSk7XG4gICAgICAgICAgICBpZiAoc2VjU2tpbGwpIHtcbiAgICAgICAgICAgICAgICBpZighc2tpbGwuY29ubmVjdGlvbnMpIHNraWxsLmNvbm5lY3Rpb25zID0gW107XG4gICAgICAgICAgICAgICAgaWYoIXNraWxsLmNvbm5lY3Rpb25zLmluY2x1ZGVzKHNlY29uZGFyeSkpIHsgc2tpbGwuY29ubmVjdGlvbnMucHVzaChzZWNvbmRhcnkpOyBuZXcgTm90aWNlKGDwn5SXIE5ldXJhbCBMaW5rIEVzdGFibGlzaGVkYCk7IH1cbiAgICAgICAgICAgICAgICB4cCArPSBNYXRoLmZsb29yKHNlY1NraWxsLmxldmVsICogMC41KTsgXG4gICAgICAgICAgICAgICAgc2VjU2tpbGwueHAgKz0gMC41OyBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2V0dGluZ3MueHAgKz0geHA7IHRoaXMuc2V0dGluZ3MuZ29sZCArPSBnb2xkO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZGFpbHlNb2RpZmllci5uYW1lID09PSBcIkFkcmVuYWxpbmVcIikge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5ocCAtPSA1O1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5kYW1hZ2VUYWtlblRvZGF5ICs9IDU7XG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5kYW1hZ2VUYWtlblRvZGF5ID4gNTAgJiYgIXRoaXMubWVkaXRhdGlvbkVuZ2luZS5pc0xvY2tlZERvd24oKSkge1xuICAgICAgICAgICAgICAgIHRoaXMubWVkaXRhdGlvbkVuZ2luZS50cmlnZ2VyTG9ja2Rvd24oKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJsb2NrZG93blwiKTtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKFwiT3ZlcmV4ZXJ0aW9uISBMT0NLRE9XTiBJTklUSUFURUQuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG5cbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MueHAgPj0gdGhpcy5zZXR0aW5ncy54cFJlcSkge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5sZXZlbCsrOyBcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MueHAgPSAwO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy54cFJlcSA9IE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy54cFJlcSAqIDEuMSk7IFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5tYXhIcCA9IDEwMCArICh0aGlzLnNldHRpbmdzLmxldmVsICogNSk7IFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5ocCA9IHRoaXMuc2V0dGluZ3MubWF4SHA7XG4gICAgICAgICAgICB0aGlzLnRhdW50KFwibGV2ZWxfdXBcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IG1zZ3MgPSB0aGlzLmFuYWx5dGljc0VuZ2luZS5jaGVja0Jvc3NNaWxlc3RvbmVzKCk7XG4gICAgICAgICAgICBtc2dzLmZvckVhY2gobSA9PiBuZXcgTm90aWNlKG0pKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKFsxMCwgMjAsIDMwLCA1MF0uaW5jbHVkZXModGhpcy5zZXR0aW5ncy5sZXZlbCkpIHRoaXMuc3Bhd25Cb3NzKHRoaXMuc2V0dGluZ3MubGV2ZWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdHNDb21wbGV0ZWRUb2RheSsrO1xuICAgICAgICB0aGlzLmFuYWx5dGljc0VuZ2luZS51cGRhdGVTdHJlYWsoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuY2hlY2tEYWlseU1pc3Npb25zKHsgXG4gICAgICAgICAgICB0eXBlOiBcImNvbXBsZXRlXCIsIFxuICAgICAgICAgICAgZGlmZmljdWx0eTogdGhpcy5nZXREaWZmaWN1bHR5TnVtYmVyKGZtLmRpZmZpY3VsdHkpLCBcbiAgICAgICAgICAgIHNraWxsOiBza2lsbE5hbWUsIFxuICAgICAgICAgICAgc2Vjb25kYXJ5U2tpbGw6IHNlY29uZGFyeSxcbiAgICAgICAgICAgIGhpZ2hTdGFrZXM6IGZtLmhpZ2hfc3Rha2VzIFxuICAgICAgICB9KTtcblxuICAgICAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGYpID0+IHsgZi5zdGF0dXMgPSBcImNvbXBsZXRlZFwiOyBmLmNvbXBsZXRlZF9hdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTsgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBbRklYXSBVc2UgU2FmZSBBcmNoaXZlIHRvIHByZXZlbnQgZHVwbGljYXRlcy96b21iaWVzXG4gICAgICAgIGF3YWl0IHRoaXMuc2FmZUFyY2hpdmUoZmlsZSwgXCJBcmNoaXZlXCIpO1xuICAgICAgICBcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgc3Bhd25Cb3NzKGxldmVsOiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgYm9zcyA9IEJPU1NfREFUQVtsZXZlbF07XG4gICAgICAgIGlmICghYm9zcykgcmV0dXJuO1xuICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImhlYXJ0YmVhdFwiKTtcbiAgICAgICAgbmV3IE5vdGljZShcIuKaoO+4jyBBTk9NQUxZIERFVEVDVEVELi4uXCIsIDIwMDApO1xuICAgICAgICBcbiAgICAgICAgc2V0VGltZW91dChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImRlYXRoXCIpO1xuICAgICAgICAgICAgbmV3IE5vdGljZShg4pig77iPIEJPU1MgU1BBV05FRDogJHtib3NzLm5hbWV9YCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY3JlYXRlUXVlc3QoXG4gICAgICAgICAgICAgICAgYEJPU1NfTFZMJHtsZXZlbH0gLSAke2Jvc3MubmFtZX1gLCA1LCBcIkJvc3NcIiwgXCJOb25lXCIsIFxuICAgICAgICAgICAgICAgIG1vbWVudCgpLmFkZCgzLCAnZGF5cycpLnRvSVNPU3RyaW5nKCksIHRydWUsIFwiQ3JpdGljYWxcIiwgdHJ1ZVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgc2V0VGltZW91dChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2FmZU5hbWUgPSBgQk9TU19MVkwke2xldmVsfV8tXyR7Ym9zcy5uYW1lfWAucmVwbGFjZSgvW15hLXowLTldL2dpLCAnXycpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZXMgPSB0aGlzLmFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZSA9IGZpbGVzLmZpbmQoZiA9PiBmLm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gYCR7c2FmZU5hbWV9Lm1kYCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXhIcCA9IDEwMCArIChsZXZlbCAqIDIwKTsgXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZm0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZtLmJvc3NfaHAgPSBtYXhIcDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZtLmJvc3NfbWF4X2hwID0gbWF4SHA7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJ1cGRhdGVcIik7IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDUwMCk7IFxuICAgICAgICB9LCAzMDAwKTtcbiAgICB9XG5cbiAgICBhc3luYyBkYW1hZ2VCb3NzKGZpbGU6IFRGaWxlKSB7XG4gICAgICAgIGNvbnN0IGZtID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk/LmZyb250bWF0dGVyO1xuICAgICAgICBpZiAoIWZtIHx8ICFmbS5pc19ib3NzKSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgZGFtYWdlID0gMjU7IFxuICAgICAgICBjb25zdCBjdXJyZW50SHAgPSBmbS5ib3NzX2hwIHx8IDEwMDtcbiAgICAgICAgY29uc3QgbmV3SHAgPSBjdXJyZW50SHAgLSBkYW1hZ2U7XG5cbiAgICAgICAgaWYgKG5ld0hwIDw9IDApIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY29tcGxldGVRdWVzdChmaWxlKTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCLimpTvuI8gRklOQUwgQkxPVyEgQm9zcyBEZWZlYXRlZCFcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGYpID0+IHtcbiAgICAgICAgICAgICAgICBmLmJvc3NfaHAgPSBuZXdIcDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5hdWRpby5wbGF5U291bmQoXCJmYWlsXCIpO1xuICAgICAgICAgICAgbmV3IE5vdGljZShg4pqU77iPIEJvc3MgRGFtYWdlZCEgJHtuZXdIcH0vJHtmbS5ib3NzX21heF9ocH0gSFAgcmVtYWluaW5nYCk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMudHJpZ2dlcihcInVwZGF0ZVwiKSwgMjAwKTsgXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBmYWlsUXVlc3QoZmlsZTogVEZpbGUsIG1hbnVhbEFib3J0OiBib29sZWFuID0gZmFsc2UpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNSZXN0aW5nKCkgJiYgIW1hbnVhbEFib3J0KSB7IG5ldyBOb3RpY2UoXCJSZXN0IERheSBwcm90ZWN0aW9uLlwiKTsgcmV0dXJuOyB9XG4gICAgICAgIGlmICh0aGlzLmlzU2hpZWxkZWQoKSAmJiAhbWFudWFsQWJvcnQpIHsgbmV3IE5vdGljZShcIlNoaWVsZGVkIVwiKTsgcmV0dXJuOyB9XG5cbiAgICAgICAgbGV0IGRhbWFnZSA9IDEwICsgTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLnJpdmFsRG1nIC8gMik7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmFjdGl2ZUJ1ZmZzLmZvckVhY2goYiA9PiB7XG4gICAgICAgICAgICBpZiAoYi5lZmZlY3QuZGFtYWdlTXVsdCkgZGFtYWdlID0gTWF0aC5mbG9vcihkYW1hZ2UgKiBiLmVmZmVjdC5kYW1hZ2VNdWx0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgZm0gPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgIGlmIChmbT8uaXNfYm9zcykge1xuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSBmaWxlLmJhc2VuYW1lLm1hdGNoKC9CT1NTX0xWTChcXGQrKS8pO1xuICAgICAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGV2ZWwgPSBwYXJzZUludChtYXRjaFsxXSk7XG4gICAgICAgICAgICAgICAgaWYgKEJPU1NfREFUQVtsZXZlbF0pIHtcbiAgICAgICAgICAgICAgICAgICAgZGFtYWdlICs9IEJPU1NfREFUQVtsZXZlbF0uaHBfcGVuO1xuICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGDimKDvuI8gQm9zcyBDcnVzaDogKyR7Qk9TU19EQVRBW2xldmVsXS5ocF9wZW59IERhbWFnZWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmdvbGQgPCAwKSBkYW1hZ2UgKj0gMjtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuaHAgLT0gZGFtYWdlO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmRhbWFnZVRha2VuVG9kYXkgKz0gZGFtYWdlO1xuICAgICAgICBpZiAoIW1hbnVhbEFib3J0KSB0aGlzLnNldHRpbmdzLnJpdmFsRG1nICs9IDE7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImZhaWxcIik7XG4gICAgICAgIHRoaXMuY2hlY2tEYWlseU1pc3Npb25zKHsgdHlwZTogXCJkYW1hZ2VcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmRhbWFnZVRha2VuVG9kYXkgPiA1MCkge1xuICAgICAgICAgICAgdGhpcy5tZWRpdGF0aW9uRW5naW5lLnRyaWdnZXJMb2NrZG93bigpO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwibG9ja2Rvd25cIik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGdyYXZlUGF0aCA9IFwiR3JhdmV5YXJkL0ZhaWx1cmVzXCI7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGdyYXZlUGF0aCkpIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihncmF2ZVBhdGgpO1xuICAgICAgICBcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucmVuYW1lRmlsZShmaWxlLCBgJHtncmF2ZVBhdGh9L1tGQUlMRURdICR7ZmlsZS5uYW1lfWApO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG4gICAgXG4gICAgYXN5bmMgY3JlYXRlUXVlc3QobmFtZTogc3RyaW5nLCBkaWZmOiBudW1iZXIsIHNraWxsOiBzdHJpbmcsIHNlY1NraWxsOiBzdHJpbmcsIGRlYWRsaW5lSXNvOiBzdHJpbmcsIGhpZ2hTdGFrZXM6IGJvb2xlYW4sIHByaW9yaXR5OiBzdHJpbmcsIGlzQm9zczogYm9vbGVhbikge1xuICAgICAgICBpZiAodGhpcy5tZWRpdGF0aW9uRW5naW5lLmlzTG9ja2VkRG93bigpKSB7IG5ldyBOb3RpY2UoXCJMT0NLRE9XTiBBQ1RJVkVcIik7IHJldHVybjsgfVxuICAgICAgICBcbiAgICAgICAgbGV0IHhwUmV3YXJkID0gMDsgbGV0IGdvbGRSZXdhcmQgPSAwOyBsZXQgZGlmZkxhYmVsID0gXCJcIjtcbiAgICAgICAgc3dpdGNoKGRpZmYpIHtcbiAgICAgICAgICAgIGNhc2UgMTogeHBSZXdhcmQgPSBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3MueHBSZXEgKiAwLjA1KTsgZ29sZFJld2FyZCA9IDEwOyBkaWZmTGFiZWwgPSBcIlRyaXZpYWxcIjsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDI6IHhwUmV3YXJkID0gTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLnhwUmVxICogMC4xMCk7IGdvbGRSZXdhcmQgPSAyMDsgZGlmZkxhYmVsID0gXCJFYXN5XCI7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAzOiB4cFJld2FyZCA9IE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy54cFJlcSAqIDAuMjApOyBnb2xkUmV3YXJkID0gNDA7IGRpZmZMYWJlbCA9IFwiTWVkaXVtXCI7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA0OiB4cFJld2FyZCA9IE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy54cFJlcSAqIDAuNDApOyBnb2xkUmV3YXJkID0gODA7IGRpZmZMYWJlbCA9IFwiSGFyZFwiOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNTogeHBSZXdhcmQgPSBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3MueHBSZXEgKiAwLjYwKTsgZ29sZFJld2FyZCA9IDE1MDsgZGlmZkxhYmVsID0gXCJTVUlDSURFXCI7IGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0Jvc3MpIHsgeHBSZXdhcmQ9MTAwMDsgZ29sZFJld2FyZD0xMDAwOyBkaWZmTGFiZWw9XCLimKDvuI8gQk9TU1wiOyB9XG4gICAgICAgIGlmIChoaWdoU3Rha2VzICYmICFpc0Jvc3MpIGdvbGRSZXdhcmQgPSBNYXRoLmZsb29yKGdvbGRSZXdhcmQgKiAxLjUpO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgcm9vdFBhdGggPSBcIkFjdGl2ZV9SdW4vUXVlc3RzXCI7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHJvb3RQYXRoKSkgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKHJvb3RQYXRoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNhZmVOYW1lID0gbmFtZS5yZXBsYWNlKC9bXmEtejAtOV0vZ2ksICdfJykudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgY29uc3QgY29udGVudCA9IGAtLS1cbnR5cGU6IHF1ZXN0XG5zdGF0dXM6IGFjdGl2ZVxuZGlmZmljdWx0eTogJHtkaWZmTGFiZWx9XG5wcmlvcml0eTogJHtwcmlvcml0eX1cbnhwX3Jld2FyZDogJHt4cFJld2FyZH1cbmdvbGRfcmV3YXJkOiAke2dvbGRSZXdhcmR9XG5za2lsbDogJHtza2lsbH1cbnNlY29uZGFyeV9za2lsbDogJHtzZWNTa2lsbH1cbmhpZ2hfc3Rha2VzOiAke2hpZ2hTdGFrZXMgPyAndHJ1ZScgOiAnZmFsc2UnfVxuaXNfYm9zczogJHtpc0Jvc3N9XG5jcmVhdGVkOiAke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKX1cbmRlYWRsaW5lOiAke2RlYWRsaW5lSXNvfVxuLS0tXG4jIOKalO+4jyAke25hbWV9YDtcbiAgICAgICAgXG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShgJHtyb290UGF0aH0vJHtzYWZlTmFtZX0ubWRgLCBjb250ZW50KTtcbiAgICAgICAgdGhpcy5hdWRpby5wbGF5U291bmQoXCJjbGlja1wiKTtcbiAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgZGVsZXRlUXVlc3QoZmlsZTogVEZpbGUpIHsgXG4gICAgICAgIGNvbnN0IGNvc3RSZXN1bHQgPSB0aGlzLm1lZGl0YXRpb25FbmdpbmUuYXBwbHlEZWxldGlvbkNvc3QoKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjb3N0UmVzdWx0LmNvc3QgPiAwICYmIHRoaXMuc2V0dGluZ3MuZ29sZCA8IGNvc3RSZXN1bHQuY29zdCkge1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIkluc3VmZmljaWVudCBnb2xkIGZvciBwYWlkIGRlbGV0aW9uIVwiKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpO1xuICAgICAgICAgICAgdGhpcy5kZWxldGVkUXVlc3RCdWZmZXIucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogZmlsZS5uYW1lLFxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgcGF0aDogZmlsZS5wYXRoLFxuICAgICAgICAgICAgICAgIGRlbGV0ZWRBdDogRGF0ZS5ub3coKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAodGhpcy5kZWxldGVkUXVlc3RCdWZmZXIubGVuZ3RoID4gNSkgdGhpcy5kZWxldGVkUXVlc3RCdWZmZXIuc2hpZnQoKTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcInVuZG86c2hvd1wiLCBmaWxlLmJhc2VuYW1lKTtcbiAgICAgICAgfSBjYXRjaChlKSB7IGNvbnNvbGUuZXJyb3IoXCJCdWZmZXIgZmFpbFwiLCBlKTsgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmRlbGV0ZShmaWxlKTtcbiAgICAgICAgaWYgKGNvc3RSZXN1bHQubWVzc2FnZSkgbmV3IE5vdGljZShjb3N0UmVzdWx0Lm1lc3NhZ2UpO1xuICAgICAgICB0aGlzLnNhdmUoKTsgXG4gICAgfVxuICBcbiAgICBhc3luYyB1bmRvTGFzdERlbGV0aW9uKCkge1xuICAgICAgICBjb25zdCBsYXN0ID0gdGhpcy5kZWxldGVkUXVlc3RCdWZmZXIucG9wKCk7XG4gICAgICAgIGlmICghbGFzdCkgeyBuZXcgTm90aWNlKFwiTm90aGluZyB0byB1bmRvLlwiKTsgcmV0dXJuOyB9XG4gICAgICAgIFxuICAgICAgICBpZiAoRGF0ZS5ub3coKSAtIGxhc3QuZGVsZXRlZEF0ID4gNjAwMDApIHsgbmV3IE5vdGljZShcIlRvbyBsYXRlIHRvIHVuZG8uXCIpOyByZXR1cm47IH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKGxhc3QucGF0aCwgbGFzdC5jb250ZW50KTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoYFJlc3RvcmVkOiAke2xhc3QubmFtZX1gKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwidXBkYXRlXCIpO1xuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgIFxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiQ291bGQgbm90IHJlc3RvcmUgZmlsZSAocGF0aCBtYXkgYmUgdGFrZW4pLlwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGNoZWNrRGVhZGxpbmVzKCkge1xuICAgICAgICBjb25zdCBub3cgPSBtb21lbnQoKTtcbiAgICAgICAgY29uc3QgaW5pdGlhbENvdW50ID0gdGhpcy5zZXR0aW5ncy5hY3RpdmVCdWZmcy5sZW5ndGg7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuYWN0aXZlQnVmZnMgPSB0aGlzLnNldHRpbmdzLmFjdGl2ZUJ1ZmZzLmZpbHRlcihiID0+IG1vbWVudChiLmV4cGlyZXNBdCkuaXNBZnRlcihub3cpKTtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuYWN0aXZlQnVmZnMubGVuZ3RoIDwgaW5pdGlhbENvdW50KSB7XG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiQSBwb3Rpb24gZWZmZWN0IGhhcyB3b3JuIG9mZi5cIik7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJ1cGRhdGVcIik7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiQWN0aXZlX1J1bi9RdWVzdHNcIik7XG4gICAgICAgIGlmICghKGZvbGRlciBpbnN0YW5jZW9mIFRGb2xkZXIpKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBjb25zdCB6ZXJvSW5ib3ggPSB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMuZmluZChtID0+IG0uY2hlY2tGdW5jID09PSBcInplcm9faW5ib3hcIiAmJiAhbS5jb21wbGV0ZWQpO1xuICAgICAgICBpZiAoemVyb0luYm94KSB7XG4gICAgICAgICAgICBjb25zdCBzY3JhcHMgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJTY3JhcHNcIik7XG4gICAgICAgICAgICBpZiAoc2NyYXBzIGluc3RhbmNlb2YgVEZvbGRlciAmJiBzY3JhcHMuY2hpbGRyZW4ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jaGVja0RhaWx5TWlzc2lvbnMoeyB0eXBlOiBcImNoZWNrXCIgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZm9sZGVyLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZm0gPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgICAgICAgICAgaWYgKGZtPy5kZWFkbGluZSAmJiBtb21lbnQoKS5pc0FmdGVyKG1vbWVudChmbS5kZWFkbGluZSkpKSBhd2FpdCB0aGlzLmZhaWxRdWVzdChmaWxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBhc3luYyByb2xsQ2hhb3Moc2hvd01vZGFsOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3Qgcm9sbCA9IE1hdGgucmFuZG9tKCk7XG4gICAgICAgIGlmIChyb2xsIDwgMC40KSB0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIgPSBERUZBVUxUX01PRElGSUVSO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGlkeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChDSEFPU19UQUJMRS5sZW5ndGggLSAxKSkgKyAxO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyID0gQ0hBT1NfVEFCTEVbaWR4XTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICAgICAgaWYgKHNob3dNb2RhbCkgbmV3IENoYW9zTW9kYWwodGhpcy5hcHAsIHRoaXMuc2V0dGluZ3MuZGFpbHlNb2RpZmllcikub3BlbigpO1xuICAgIH1cblxuICAgIGFzeW5jIGF0dGVtcHRSZWNvdmVyeSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLm1lZGl0YXRpb25FbmdpbmUuaXNMb2NrZWREb3duKCkpIHsgbmV3IE5vdGljZShcIk5vdCBpbiBMb2NrZG93bi5cIik7IHJldHVybjsgfVxuICAgICAgICBjb25zdCB7IGhvdXJzLCBtaW51dGVzIH0gPSB0aGlzLm1lZGl0YXRpb25FbmdpbmUuZ2V0TG9ja2Rvd25UaW1lUmVtYWluaW5nKCk7XG4gICAgICAgIG5ldyBOb3RpY2UoYFJlY292ZXJpbmcuLi4gJHtob3Vyc31oICR7bWludXRlc31tIHJlbWFpbmluZy5gKTtcbiAgICB9XG5cbiAgICBpc0xvY2tlZERvd24oKSB7IHJldHVybiB0aGlzLm1lZGl0YXRpb25FbmdpbmUuaXNMb2NrZWREb3duKCk7IH1cbiAgICBpc1Jlc3RpbmcoKSB7IHJldHVybiB0aGlzLnNldHRpbmdzLnJlc3REYXlVbnRpbCAmJiBtb21lbnQoKS5pc0JlZm9yZShtb21lbnQodGhpcy5zZXR0aW5ncy5yZXN0RGF5VW50aWwpKTsgfVxuICAgIGlzU2hpZWxkZWQoKSB7IHJldHVybiB0aGlzLnNldHRpbmdzLnNoaWVsZGVkVW50aWwgJiYgbW9tZW50KCkuaXNCZWZvcmUobW9tZW50KHRoaXMuc2V0dGluZ3Muc2hpZWxkZWRVbnRpbCkpOyB9XG5cbiAgICBhc3luYyBjcmVhdGVSZXNlYXJjaFF1ZXN0KHRpdGxlOiBzdHJpbmcsIHR5cGU6IGFueSwgbGlua2VkU2tpbGw6IHN0cmluZywgbGlua2VkQ29tYmF0UXVlc3Q6IHN0cmluZykge1xuICAgICAgICBjb25zdCByZXMgPSBhd2FpdCB0aGlzLnJlc2VhcmNoRW5naW5lLmNyZWF0ZVJlc2VhcmNoUXVlc3QodGl0bGUsIHR5cGUsIGxpbmtlZFNraWxsLCBsaW5rZWRDb21iYXRRdWVzdCk7XG4gICAgICAgIGlmKHJlcy5zdWNjZXNzKSBuZXcgTm90aWNlKHJlcy5tZXNzYWdlKTsgZWxzZSBuZXcgTm90aWNlKHJlcy5tZXNzYWdlKTtcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlKCk7XG4gICAgfVxuICAgIFxuICAgIGNvbXBsZXRlUmVzZWFyY2hRdWVzdChpZDogc3RyaW5nLCB3b3JkczogbnVtYmVyKSB7IHRoaXMucmVzZWFyY2hFbmdpbmUuY29tcGxldGVSZXNlYXJjaFF1ZXN0KGlkLCB3b3Jkcyk7IHRoaXMuc2F2ZSgpOyB9XG4gICAgZGVsZXRlUmVzZWFyY2hRdWVzdChpZDogc3RyaW5nKSB7IHRoaXMucmVzZWFyY2hFbmdpbmUuZGVsZXRlUmVzZWFyY2hRdWVzdChpZCk7IHRoaXMuc2F2ZSgpOyB9XG4gICAgdXBkYXRlUmVzZWFyY2hXb3JkQ291bnQoaWQ6IHN0cmluZywgd29yZHM6IG51bWJlcikgeyBcbiAgICAgICAgdGhpcy5yZXNlYXJjaEVuZ2luZS51cGRhdGVSZXNlYXJjaFdvcmRDb3VudChpZCwgd29yZHMpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoXCJ1cGRhdGVcIik7XG4gICAgfVxuICAgIGdldFJlc2VhcmNoUmF0aW8oKSB7IHJldHVybiB0aGlzLnJlc2VhcmNoRW5naW5lLmdldFJlc2VhcmNoUmF0aW8oKTsgfVxuICAgIGNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKSB7IHJldHVybiB0aGlzLnJlc2VhcmNoRW5naW5lLmNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKTsgfVxuICAgIFxuICAgIGFzeW5jIHN0YXJ0TWVkaXRhdGlvbigpIHsgY29uc3QgciA9IHRoaXMubWVkaXRhdGlvbkVuZ2luZS5tZWRpdGF0ZSgpOyBuZXcgTm90aWNlKHIubWVzc2FnZSk7IGF3YWl0IHRoaXMuc2F2ZSgpOyB9XG4gICAgZ2V0TWVkaXRhdGlvblN0YXR1cygpIHsgcmV0dXJuIHRoaXMubWVkaXRhdGlvbkVuZ2luZS5nZXRNZWRpdGF0aW9uU3RhdHVzKCk7IH1cbiAgICBhc3luYyBjcmVhdGVTY3JhcChjb250ZW50OiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgZm9sZGVyUGF0aCA9IFwiU2NyYXBzXCI7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZvbGRlclBhdGgpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZm9sZGVyUGF0aCk7XG4gICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tREQgSEgtbW0tc3NcIik7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShgJHtmb2xkZXJQYXRofS8ke3RpbWVzdGFtcH0ubWRgLCBjb250ZW50KTtcbiAgICAgICAgbmV3IE5vdGljZShcIuKaoSBTY3JhcCBDYXB0dXJlZFwiKTsgdGhpcy5hdWRpby5wbGF5U291bmQoXCJjbGlja1wiKTtcbiAgICB9XG4gICAgXG4gICAgYXN5bmMgZ2VuZXJhdGVTa2lsbEdyYXBoKCkgeyBcbiAgICAgICAgY29uc3Qgc2tpbGxzID0gdGhpcy5zZXR0aW5ncy5za2lsbHM7XG4gICAgICAgIGlmIChza2lsbHMubGVuZ3RoID09PSAwKSB7IG5ldyBOb3RpY2UoXCJObyBuZXVyYWwgbm9kZXMgZm91bmQuXCIpOyByZXR1cm47IH1cbiAgICAgICAgY29uc3Qgbm9kZXM6IGFueVtdID0gW107IGNvbnN0IGVkZ2VzOiBhbnlbXSA9IFtdO1xuICAgICAgICBjb25zdCB3aWR0aCA9IDI1MDsgY29uc3QgaGVpZ2h0ID0gMTQwOyBcbiAgICAgICAgY29uc3QgcmFkaXVzID0gTWF0aC5tYXgoNDAwLCBza2lsbHMubGVuZ3RoICogNjApO1xuICAgICAgICBjb25zdCBjZW50ZXJYID0gMDsgY29uc3QgY2VudGVyWSA9IDA7IGNvbnN0IGFuZ2xlU3RlcCA9ICgyICogTWF0aC5QSSkgLyBza2lsbHMubGVuZ3RoO1xuXG4gICAgICAgIHNraWxscy5mb3JFYWNoKChza2lsbCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGFuZ2xlID0gaW5kZXggKiBhbmdsZVN0ZXA7XG4gICAgICAgICAgICBjb25zdCB4ID0gY2VudGVyWCArIHJhZGl1cyAqIE1hdGguY29zKGFuZ2xlKTtcbiAgICAgICAgICAgIGNvbnN0IHkgPSBjZW50ZXJZICsgcmFkaXVzICogTWF0aC5zaW4oYW5nbGUpO1xuICAgICAgICAgICAgbGV0IGNvbG9yID0gXCI0XCI7IFxuICAgICAgICAgICAgaWYgKHNraWxsLnJ1c3QgPiAwKSBjb2xvciA9IFwiMVwiOyBlbHNlIGlmIChza2lsbC5sZXZlbCA+PSAxMCkgY29sb3IgPSBcIjZcIjtcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1c0ljb24gPSBza2lsbC5ydXN0ID4gMCA/IFwi4pqg77iPIFJVU1RZXCIgOiBcIvCfn6IgQUNUSVZFXCI7XG4gICAgICAgICAgICBjb25zdCBwcm9ncmVzcyA9IE1hdGguZmxvb3IoKHNraWxsLnhwIC8gc2tpbGwueHBSZXEpICogMTAwKTtcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSBgIyMgJHtza2lsbC5uYW1lfVxcbioqTHYgJHtza2lsbC5sZXZlbH0qKlxcbiR7c3RhdHVzSWNvbn1cXG5YUDogJHtza2lsbC54cH0vJHtza2lsbC54cFJlcX0gKCR7cHJvZ3Jlc3N9JSlgOyBcbiAgICAgICAgICAgIG5vZGVzLnB1c2goeyBpZDogc2tpbGwubmFtZSwgeDogTWF0aC5mbG9vcih4KSwgeTogTWF0aC5mbG9vcih5KSwgd2lkdGgsIGhlaWdodCwgdHlwZTogXCJ0ZXh0XCIsIHRleHQsIGNvbG9yIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBza2lsbHMuZm9yRWFjaChza2lsbCA9PiB7XG4gICAgICAgICAgICBpZiAoc2tpbGwuY29ubmVjdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBza2lsbC5jb25uZWN0aW9ucy5mb3JFYWNoKHRhcmdldE5hbWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2tpbGxzLmZpbmQocyA9PiBzLm5hbWUgPT09IHRhcmdldE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlZGdlcy5wdXNoKHsgaWQ6IGAke3NraWxsLm5hbWV9LSR7dGFyZ2V0TmFtZX1gLCBmcm9tTm9kZTogc2tpbGwubmFtZSwgZnJvbVNpZGU6IFwicmlnaHRcIiwgdG9Ob2RlOiB0YXJnZXROYW1lLCB0b1NpZGU6IFwibGVmdFwiLCBjb2xvcjogXCI0XCIgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgY2FudmFzRGF0YSA9IHsgbm9kZXMsIGVkZ2VzIH07XG4gICAgICAgIGNvbnN0IHBhdGggPSBcIkFjdGl2ZV9SdW4vTmV1cmFsX0h1Yi5jYW52YXNcIjtcbiAgICAgICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoKTtcbiAgICAgICAgaWYgKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkgeyBhd2FpdCB0aGlzLmFwcC52YXVsdC5tb2RpZnkoZmlsZSwgSlNPTi5zdHJpbmdpZnkoY2FudmFzRGF0YSwgbnVsbCwgMikpOyBuZXcgTm90aWNlKFwiTmV1cmFsIEh1YiB1cGRhdGVkLlwiKTsgfSBcbiAgICAgICAgZWxzZSB7IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShwYXRoLCBKU09OLnN0cmluZ2lmeShjYW52YXNEYXRhLCBudWxsLCAyKSk7IG5ldyBOb3RpY2UoXCJOZXVyYWwgSHViIGNyZWF0ZWQuXCIpOyB9XG4gICAgfVxuXG4gICAgYXN5bmMgY3JlYXRlUXVlc3RDaGFpbihuYW1lOiBzdHJpbmcsIHF1ZXN0czogc3RyaW5nW10pIHsgYXdhaXQgdGhpcy5jaGFpbnNFbmdpbmUuY3JlYXRlUXVlc3RDaGFpbihuYW1lLCBxdWVzdHMpOyBhd2FpdCB0aGlzLnNhdmUoKTsgfVxuICAgIGdldEFjdGl2ZUNoYWluKCkgeyByZXR1cm4gdGhpcy5jaGFpbnNFbmdpbmUuZ2V0QWN0aXZlQ2hhaW4oKTsgfVxuICAgIGdldENoYWluUHJvZ3Jlc3MoKSB7IHJldHVybiB0aGlzLmNoYWluc0VuZ2luZS5nZXRDaGFpblByb2dyZXNzKCk7IH1cbiAgICBhc3luYyBicmVha0NoYWluKCkgeyBhd2FpdCB0aGlzLmNoYWluc0VuZ2luZS5icmVha0NoYWluKCk7IGF3YWl0IHRoaXMuc2F2ZSgpOyB9XG4gICAgXG4gICAgc2V0RmlsdGVyU3RhdGUoZW5lcmd5OiBhbnksIGNvbnRleHQ6IGFueSwgdGFnczogc3RyaW5nW10pIHsgdGhpcy5maWx0ZXJzRW5naW5lLnNldEZpbHRlclN0YXRlKGVuZXJneSwgY29udGV4dCwgdGFncyk7IHRoaXMuc2F2ZSgpOyB9XG4gICAgY2xlYXJGaWx0ZXJzKCkgeyB0aGlzLmZpbHRlcnNFbmdpbmUuY2xlYXJGaWx0ZXJzKCk7IHRoaXMuc2F2ZSgpOyB9XG4gICAgXG4gICAgZ2V0R2FtZVN0YXRzKCkgeyByZXR1cm4gdGhpcy5hbmFseXRpY3NFbmdpbmUuZ2V0R2FtZVN0YXRzKCk7IH1cbiAgICBjaGVja0Jvc3NNaWxlc3RvbmVzKCkgeyByZXR1cm4gdGhpcy5hbmFseXRpY3NFbmdpbmUuY2hlY2tCb3NzTWlsZXN0b25lcygpOyB9XG4gICAgZ2VuZXJhdGVXZWVrbHlSZXBvcnQoKSB7IHJldHVybiB0aGlzLmFuYWx5dGljc0VuZ2luZS5nZW5lcmF0ZVdlZWtseVJlcG9ydCgpOyB9XG5cbiAgICB0YXVudCh0cmlnZ2VyOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgbXNnczogYW55ID0geyBcbiAgICAgICAgICAgIFwiZmFpbFwiOiBbXCJQYXRoZXRpYy5cIiwgXCJUcnkgYWdhaW4uXCIsIFwiSXMgdGhhdCBhbGw/XCJdLCBcbiAgICAgICAgICAgIFwibGV2ZWxfdXBcIjogW1wiUG93ZXIgb3ZlcndoZWxtaW5nLlwiLCBcIkFzY2VuZGluZy5cIl0sXG4gICAgICAgICAgICBcImxvd19ocFwiOiBbXCJCbGVlZGluZyBvdXQuLi5cIiwgXCJIb2xkIG9uLlwiXSBcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgbXNnID0gbXNnc1t0cmlnZ2VyXSA/IG1zZ3NbdHJpZ2dlcl1bTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogbXNnc1t0cmlnZ2VyXS5sZW5ndGgpXSA6IFwiT2JzZXJ2ZS5cIjtcbiAgICAgICAgbmV3IE5vdGljZShgU1lTVEVNOiAke21zZ31gKTtcbiAgICB9XG4gICAgXG4gICAgcGFyc2VRdWlja0lucHV0KHRleHQ6IHN0cmluZykge1xuICAgICAgICBjb25zdCBtYXRjaCA9IHRleHQubWF0Y2goLyguKz8pXFxzKlxcLyhcXGQpLyk7XG4gICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgdGhpcy5jcmVhdGVRdWVzdChtYXRjaFsxXSwgcGFyc2VJbnQobWF0Y2hbMl0pLCBcIk5vbmVcIiwgXCJOb25lXCIsIG1vbWVudCgpLmFkZCgyNCwgJ2hvdXJzJykudG9JU09TdHJpbmcoKSwgZmFsc2UsIFwiTm9ybWFsXCIsIGZhbHNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlUXVlc3QodGV4dCwgMywgXCJOb25lXCIsIFwiTm9uZVwiLCBtb21lbnQoKS5hZGQoMjQsICdob3VycycpLnRvSVNPU3RyaW5nKCksIGZhbHNlLCBcIk5vcm1hbFwiLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyB0cmlnZ2VyRGVhdGgoKSB7IFxuICAgICAgICBjb25zdCBhY3RpdmVGb2xkZXIgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJBY3RpdmVfUnVuL1F1ZXN0c1wiKTtcbiAgICAgICAgY29uc3QgZ3JhdmVGb2xkZXIgPSBcIkdyYXZleWFyZC9EZWF0aHMvXCIgKyBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLURELUhIbW1cIik7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGdyYXZlRm9sZGVyKSkgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKGdyYXZlRm9sZGVyKTtcblxuICAgICAgICBpZiAoYWN0aXZlRm9sZGVyIGluc3RhbmNlb2YgVEZvbGRlcikge1xuICAgICAgICAgICAgZm9yIChjb25zdCBmaWxlIG9mIGFjdGl2ZUZvbGRlci5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgIGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucmVuYW1lRmlsZShmaWxlLCBgJHtncmF2ZUZvbGRlcn0vJHtmaWxlLm5hbWV9YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sZXZlbCA9IDE7IHRoaXMuc2V0dGluZ3MuaHAgPSAxMDA7IHRoaXMuc2V0dGluZ3MuZ29sZCA9IDA7IFxuICAgICAgICB0aGlzLnNldHRpbmdzLmxlZ2FjeS5kZWF0aENvdW50ID0gKHRoaXMuc2V0dGluZ3MubGVnYWN5LmRlYXRoQ291bnQgfHwgMCkgKyAxO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5cbmV4cG9ydCBjbGFzcyBDaGFydFJlbmRlcmVyIHtcbiAgICAvLyBbRklYXSBBZGRlZCBvcHRpb25hbCAnd2lkdGgnIHBhcmFtZXRlclxuICAgIHN0YXRpYyByZW5kZXJMaW5lQ2hhcnQocGFyZW50OiBIVE1MRWxlbWVudCwgbWV0cmljczogYW55W10sIHdpZHRoT3ZlcnJpZGU/OiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gMTAwOyAvLyBNYXRjaGVzIENTUyBoZWlnaHRcbiAgICAgICAgY29uc3Qgd2lkdGggPSB3aWR0aE92ZXJyaWRlIHx8IHBhcmVudC5jbGllbnRXaWR0aCB8fCAzMDA7XG4gICAgICAgIGNvbnN0IHBhZGRpbmcgPSA1OyAvLyBSZWR1Y2VkIHBhZGRpbmdcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRhdGE6IG51bWJlcltdID0gW107XG4gICAgICAgIGNvbnN0IGxhYmVsczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDY7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICBjb25zdCBkID0gbW9tZW50KCkuc3VidHJhY3QoaSwgJ2RheXMnKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICAgICAgY29uc3QgbSA9IG1ldHJpY3MuZmluZCh4ID0+IHguZGF0ZSA9PT0gZCk7XG4gICAgICAgICAgICBkYXRhLnB1c2gobSA/IG0ucXVlc3RzQ29tcGxldGVkIDogMCk7XG4gICAgICAgICAgICBsYWJlbHMucHVzaChtb21lbnQoZCkuZm9ybWF0KFwiZGRkXCIpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG1heFZhbCA9IE1hdGgubWF4KC4uLmRhdGEsIDUpOyBcbiAgICAgICAgY29uc3QgcG9pbnRzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBcbiAgICAgICAgZGF0YS5mb3JFYWNoKCh2YWwsIGlkeCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeCA9IChpZHggLyAoZGF0YS5sZW5ndGggLSAxKSkgKiAod2lkdGggLSBwYWRkaW5nICogMikgKyBwYWRkaW5nO1xuICAgICAgICAgICAgY29uc3QgeSA9IGhlaWdodCAtICgodmFsIC8gbWF4VmFsKSAqIChoZWlnaHQgLSBwYWRkaW5nICogMikpIC0gcGFkZGluZztcbiAgICAgICAgICAgIHBvaW50cy5wdXNoKGAke3h9LCR7eX1gKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3Qgc3ZnID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiwgXCJzdmdcIik7XG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoXCJ3aWR0aFwiLCBcIjEwMCVcIik7XG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoXCJoZWlnaHRcIiwgXCIxMDAlXCIpOyAvLyBGaXQgY29udGFpbmVyXG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoXCJ2aWV3Qm94XCIsIGAwIDAgJHt3aWR0aH0gJHtoZWlnaHR9YCk7IC8vIFNjYWxlIGNvcnJlY3RseVxuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKFwicHJlc2VydmVBc3BlY3RSYXRpb1wiLCBcIm5vbmVcIik7IC8vIFN0cmV0Y2ggdG8gZml0XG4gICAgICAgIHN2Zy5jbGFzc0xpc3QuYWRkKFwic2lzeS1jaGFydC1zdmdcIik7XG4gICAgICAgIHBhcmVudC5hcHBlbmRDaGlsZChzdmcpO1xuXG4gICAgICAgIGNvbnN0IHBvbHlsaW5lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiwgXCJwb2x5bGluZVwiKTtcbiAgICAgICAgcG9seWxpbmUuc2V0QXR0cmlidXRlKFwicG9pbnRzXCIsIHBvaW50cy5qb2luKFwiIFwiKSk7XG4gICAgICAgIHBvbHlsaW5lLnNldEF0dHJpYnV0ZShcImZpbGxcIiwgXCJub25lXCIpO1xuICAgICAgICBwb2x5bGluZS5zZXRBdHRyaWJ1dGUoXCJzdHJva2VcIiwgXCIjMDBiMGZmXCIpO1xuICAgICAgICBwb2x5bGluZS5zZXRBdHRyaWJ1dGUoXCJzdHJva2Utd2lkdGhcIiwgXCIyXCIpO1xuICAgICAgICBzdmcuYXBwZW5kQ2hpbGQocG9seWxpbmUpO1xuXG4gICAgICAgIHBvaW50cy5mb3JFYWNoKChwLCBpKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBbY3gsIGN5XSA9IHAuc3BsaXQoXCIsXCIpO1xuICAgICAgICAgICAgY29uc3QgY2lyY2xlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiwgXCJjaXJjbGVcIik7XG4gICAgICAgICAgICBjaXJjbGUuc2V0QXR0cmlidXRlKFwiY3hcIiwgY3gpO1xuICAgICAgICAgICAgY2lyY2xlLnNldEF0dHJpYnV0ZShcImN5XCIsIGN5KTtcbiAgICAgICAgICAgIGNpcmNsZS5zZXRBdHRyaWJ1dGUoXCJyXCIsIFwiM1wiKTtcbiAgICAgICAgICAgIGNpcmNsZS5zZXRBdHRyaWJ1dGUoXCJmaWxsXCIsIFwiIzAwYjBmZlwiKTtcbiAgICAgICAgICAgIHN2Zy5hcHBlbmRDaGlsZChjaXJjbGUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBzdGF0aWMgcmVuZGVySGVhdG1hcChwYXJlbnQ6IEhUTUxFbGVtZW50LCBtZXRyaWNzOiBhbnlbXSkge1xuICAgICAgICBjb25zdCBoZWF0bWFwID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWhlYXRtYXBcIiB9KTtcbiAgICBcbiAgICAgICAgZm9yIChsZXQgaSA9IDI3OyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG1vbWVudCgpLnN1YnRyYWN0KGksICdkYXlzJykuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgICAgIGNvbnN0IG0gPSBtZXRyaWNzLmZpbmQoeCA9PiB4LmRhdGUgPT09IGRhdGUpO1xuICAgICAgICAgICAgY29uc3QgY291bnQgPSBtID8gbS5xdWVzdHNDb21wbGV0ZWQgOiAwO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBsZXQgY29sb3IgPSBcInJnYmEoMjU1LDI1NSwyNTUsMC4wNSlcIjtcbiAgICAgICAgICAgIGlmIChjb3VudCA+IDApIGNvbG9yID0gXCJyZ2JhKDAsIDE3NiwgMjU1LCAwLjMpXCI7XG4gICAgICAgICAgICBpZiAoY291bnQgPiAzKSBjb2xvciA9IFwicmdiYSgwLCAxNzYsIDI1NSwgMC42KVwiO1xuICAgICAgICAgICAgaWYgKGNvdW50ID4gNikgY29sb3IgPSBcInJnYmEoMCwgMTc2LCAyNTUsIDEuMClcIjtcblxuICAgICAgICAgICAgY29uc3QgZGF5ID0gaGVhdG1hcC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1oZWF0LWNlbGxcIiB9KTtcbiAgICAgICAgICAgIGRheS5zdHlsZS5iYWNrZ3JvdW5kID0gY29sb3I7XG4gICAgICAgICAgICBkYXkuc2V0QXR0cmlidXRlKFwidGl0bGVcIiwgYCR7ZGF0ZX06ICR7Y291bnR9IHF1ZXN0c2ApO1xuICAgICAgICAgICAgaWYgKGkgPT09IDApIGRheS5zdHlsZS5ib3JkZXIgPSBcIjFweCBzb2xpZCB3aGl0ZVwiO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgVEZpbGUsIG1vbWVudCB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB0eXBlIHsgUGFub3B0aWNvblZpZXcgfSBmcm9tICcuL3ZpZXcnO1xuXG5leHBvcnQgY2xhc3MgUXVlc3RDYXJkUmVuZGVyZXIge1xuICAgIHN0YXRpYyByZW5kZXIocGFyZW50OiBIVE1MRWxlbWVudCwgZmlsZTogVEZpbGUsIHZpZXc6IFBhbm9wdGljb25WaWV3KSB7XG4gICAgICAgIGNvbnN0IGZtID0gdmlldy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk/LmZyb250bWF0dGVyO1xuICAgICAgICBjb25zdCBjYXJkID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNhcmRcIiB9KTtcblxuICAgICAgICBpZiAodmlldy5zZWxlY3RNb2RlKSB7XG4gICAgICAgICAgICBjb25zdCBpc1NlbGVjdGVkID0gdmlldy5zZWxlY3RlZFF1ZXN0cy5oYXMoZmlsZSk7XG4gICAgICAgICAgICBpZiAoaXNTZWxlY3RlZCkgY2FyZC5zdHlsZS5ib3JkZXJDb2xvciA9IFwidmFyKC0tc2lzeS1ibHVlKVwiO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCB0b3AgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNhcmQtdG9wXCIgfSk7XG4gICAgICAgICAgICBjb25zdCBjYiA9IHRvcC5jcmVhdGVFbChcImlucHV0XCIsIHsgdHlwZTogXCJjaGVja2JveFwiIH0pO1xuICAgICAgICAgICAgY2IuY2hlY2tlZCA9IGlzU2VsZWN0ZWQ7XG4gICAgICAgICAgICBjYi5zdHlsZS5tYXJnaW5SaWdodCA9IFwiMTBweFwiO1xuICAgICAgICAgICAgdG9wLmNyZWF0ZURpdih7IHRleHQ6IGZpbGUuYmFzZW5hbWUsIGNsczogXCJzaXN5LWNhcmQtdGl0bGVcIiB9KTtcblxuICAgICAgICAgICAgY2FyZC5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh2aWV3LnNlbGVjdGVkUXVlc3RzLmhhcyhmaWxlKSkgdmlldy5zZWxlY3RlZFF1ZXN0cy5kZWxldGUoZmlsZSk7XG4gICAgICAgICAgICAgICAgZWxzZSB2aWV3LnNlbGVjdGVkUXVlc3RzLmFkZChmaWxlKTtcbiAgICAgICAgICAgICAgICB2aWV3LnJlZnJlc2goKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoZm0/LmlzX2Jvc3MpIGNhcmQuYWRkQ2xhc3MoXCJzaXN5LWNhcmQtYm9zc1wiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gPT09IElNUFJPVkVEIERSQUcgJiBEUk9QID09PVxuICAgICAgICAgICAgY2FyZC5zZXRBdHRyaWJ1dGUoXCJkcmFnZ2FibGVcIiwgXCJ0cnVlXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXJkLmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnc3RhcnRcIiwgKGUpID0+IHtcbiAgICAgICAgICAgICAgICB2aWV3LmRyYWdnZWRGaWxlID0gZmlsZTtcbiAgICAgICAgICAgICAgICBjYXJkLnN0eWxlLm9wYWNpdHkgPSBcIjAuNFwiO1xuICAgICAgICAgICAgICAgIGNhcmQuc3R5bGUudHJhbnNmb3JtID0gXCJzY2FsZSgwLjk1KVwiO1xuICAgICAgICAgICAgICAgIC8vIFNldCBkYXRhIGZvciBjb21wYXRpYmlsaXR5XG4gICAgICAgICAgICAgICAgZS5kYXRhVHJhbnNmZXI/LnNldERhdGEoXCJ0ZXh0L3BsYWluXCIsIGZpbGUucGF0aCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY2FyZC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ2VuZFwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FyZC5zdHlsZS5vcGFjaXR5ID0gXCIxXCI7XG4gICAgICAgICAgICAgICAgY2FyZC5zdHlsZS50cmFuc2Zvcm0gPSBcIm5vbmVcIjtcbiAgICAgICAgICAgICAgICB2aWV3LmRyYWdnZWRGaWxlID0gbnVsbDtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgdmlzdWFsIGd1aWRlcyBmcm9tIGFsbCBjYXJkc1xuICAgICAgICAgICAgICAgIHBhcmVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnNpc3ktY2FyZFwiKS5mb3JFYWNoKGVsID0+IChlbCBhcyBIVE1MRWxlbWVudCkuc3R5bGUuYm9yZGVyVG9wID0gXCJcIik7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY2FyZC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ292ZXJcIiwgKGUpID0+IHsgXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpOyBcbiAgICAgICAgICAgICAgICAvLyBWaXN1YWwgQ3VlOiBCbHVlIGxpbmUgYWJvdmUgY2FyZFxuICAgICAgICAgICAgICAgIGNhcmQuc3R5bGUuYm9yZGVyVG9wID0gXCIzcHggc29saWQgdmFyKC0tc2lzeS1ibHVlKVwiOyBcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjYXJkLmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnbGVhdmVcIiwgKCkgPT4geyBcbiAgICAgICAgICAgICAgICBjYXJkLnN0eWxlLmJvcmRlclRvcCA9IFwiXCI7IFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNhcmQuYWRkRXZlbnRMaXN0ZW5lcihcImRyb3BcIiwgYXN5bmMgKGUpID0+IHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgY2FyZC5zdHlsZS5ib3JkZXJUb3AgPSBcIlwiO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICh2aWV3LmRyYWdnZWRGaWxlICYmIHZpZXcuZHJhZ2dlZEZpbGUgIT09IGZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICBjb25zdCBkcmFnZ2VkID0gdmlldy5kcmFnZ2VkRmlsZTtcbiAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAvLyBMb2dpYzogUGxhY2UgJ2RyYWdnZWQnIEJFRk9SRSAnZmlsZSdcbiAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRGbSA9IHZpZXcuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcbiAgICAgICAgICAgICAgICAgICAvLyBHZXQgdGFyZ2V0IG9yZGVyLCBkZWZhdWx0IHRvIFwibm93XCIgaWYgbWlzc2luZ1xuICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldE9yZGVyID0gdGFyZ2V0Rm0/Lm1hbnVhbF9vcmRlciAhPT0gdW5kZWZpbmVkID8gdGFyZ2V0Rm0ubWFudWFsX29yZGVyIDogbW9tZW50KCkudmFsdWVPZigpO1xuICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgIC8vIE5ldyBvcmRlciBpcyBzbGlnaHRseSBsZXNzIHRoYW4gdGFyZ2V0IChwdXRzIGl0IGFib3ZlKVxuICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld09yZGVyID0gdGFyZ2V0T3JkZXIgLSAxMDA7IC8vIEdhcCBvZiAxMDAgdG8gcHJldmVudCBjb2xsaXNpb25zXG5cbiAgICAgICAgICAgICAgICAgICAvLyBBcHBseSBjaGFuZ2VcbiAgICAgICAgICAgICAgICAgICBhd2FpdCB2aWV3LnBsdWdpbi5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGRyYWdnZWQsIChmOmFueSkgPT4geyBcbiAgICAgICAgICAgICAgICAgICAgICAgZi5tYW51YWxfb3JkZXIgPSBuZXdPcmRlcjsgXG4gICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgLy8gW0ZJWF0gRm9yY2UgZW5naW5lIHVwZGF0ZSB0byByZS1zb3J0IGxpc3QgaW1tZWRpYXRlbHlcbiAgICAgICAgICAgICAgICAgICB2aWV3LnBsdWdpbi5lbmdpbmUudHJpZ2dlcihcInVwZGF0ZVwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAgICAgICAgIGNvbnN0IHRvcCA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktY2FyZC10b3BcIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IHRpdGxlUm93ID0gdG9wLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNhcmQtbWV0YVwiIH0pO1xuICAgICAgICAgICAgdGl0bGVSb3cuY3JlYXRlRGl2KHsgdGV4dDogZmlsZS5iYXNlbmFtZSwgY2xzOiBcInNpc3ktY2FyZC10aXRsZVwiIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoZm0/LmRlYWRsaW5lKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGlmZiA9IG1vbWVudChmbS5kZWFkbGluZSkuZGlmZihtb21lbnQoKSwgJ21pbnV0ZXMnKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0ID0gdG9wLmNyZWF0ZURpdih7IHRleHQ6IGRpZmYgPCAwID8gXCJFWFBJUkVEXCIgOiBgJHtNYXRoLmZsb29yKGRpZmYvNjApfWggJHtkaWZmJTYwfW1gLCBjbHM6IFwic2lzeS10aW1lclwiIH0pO1xuICAgICAgICAgICAgICAgIGlmIChkaWZmIDwgNjApIHQuYWRkQ2xhc3MoXCJzaXN5LXRpbWVyLWxhdGVcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHRyYXNoID0gdG9wLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJ0blwiLCB0ZXh0OiBcIlhcIiwgYXR0cjogeyBzdHlsZTogXCJwYWRkaW5nOiAycHggOHB4OyBmb250LXNpemU6IDAuOGVtO1wiIH0gfSk7XG4gICAgICAgICAgICB0cmFzaC5vbmNsaWNrID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgdmlldy5wbHVnaW4uZW5naW5lLmRlbGV0ZVF1ZXN0KGZpbGUpOyB9O1xuXG4gICAgICAgICAgICBpZiAoZm0/LmlzX2Jvc3MgJiYgZm0/LmJvc3NfbWF4X2hwKSB7XG4gICAgICAgICAgICAgICAgIGNvbnN0IGJhciA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYmFyLWJnXCIgfSk7XG4gICAgICAgICAgICAgICAgIGNvbnN0IHBjdCA9IChmbS5ib3NzX2hwIC8gZm0uYm9zc19tYXhfaHApICogMTAwO1xuICAgICAgICAgICAgICAgICBiYXIuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYmFyLWZpbGwgc2lzeS1maWxsLXJlZFwiLCBhdHRyOiB7IHN0eWxlOiBgd2lkdGg6JHtwY3R9JTtgIH0gfSk7XG4gICAgICAgICAgICAgICAgIGNhcmQuY3JlYXRlRGl2KHsgdGV4dDogYCR7Zm0uYm9zc19ocH0vJHtmbS5ib3NzX21heF9ocH0gSFBgLCBhdHRyOiB7IHN0eWxlOiBcInRleHQtYWxpZ246Y2VudGVyOyBmb250LXNpemU6MC44ZW07IGNvbG9yOnZhcigtLXNpc3ktcmVkKTsgZm9udC13ZWlnaHQ6Ym9sZDtcIiB9IH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBhY3RzID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1hY3Rpb25zXCIgfSk7XG4gICAgICAgICAgICBjb25zdCBiT2sgPSBhY3RzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDT01QTEVURVwiLCBjbHM6IFwic2lzeS1idG4gbW9kLWRvbmUgc2lzeS1hY3Rpb24tYnRuXCIgfSk7XG4gICAgICAgICAgICBiT2sub25jbGljayA9IChlKSA9PiB7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IHZpZXcucGx1Z2luLmVuZ2luZS5jb21wbGV0ZVF1ZXN0KGZpbGUpOyB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBiRmFpbCA9IGFjdHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkZBSUxcIiwgY2xzOiBcInNpc3ktYnRuIG1vZC1mYWlsIHNpc3ktYWN0aW9uLWJ0blwiIH0pO1xuICAgICAgICAgICAgYkZhaWwub25jbGljayA9IChlKSA9PiB7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IHZpZXcucGx1Z2luLmVuZ2luZS5mYWlsUXVlc3QoZmlsZSwgdHJ1ZSk7IH07XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgeyBJdGVtVmlldywgV29ya3NwYWNlTGVhZiwgVEZpbGUsIFRGb2xkZXIsIG1vbWVudCwgZGVib3VuY2UgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgU2lzeXBodXNQbHVnaW4gZnJvbSAnLi4vbWFpbic7XG5pbXBvcnQgeyBRdWVzdE1vZGFsLCBTaG9wTW9kYWwsIFNraWxsRGV0YWlsTW9kYWwsIFNraWxsTWFuYWdlck1vZGFsIH0gZnJvbSAnLi9tb2RhbHMnO1xuaW1wb3J0IHsgU2tpbGwsIERhaWx5TWlzc2lvbiB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IENoYXJ0UmVuZGVyZXIgfSBmcm9tICcuL2NoYXJ0cyc7XG5pbXBvcnQgeyBRdWVzdENhcmRSZW5kZXJlciB9IGZyb20gJy4vY2FyZCc7XG5cbmV4cG9ydCBjb25zdCBWSUVXX1RZUEVfUEFOT1BUSUNPTiA9IFwic2lzeXBodXMtcGFub3B0aWNvblwiO1xuXG5leHBvcnQgY2xhc3MgUGFub3B0aWNvblZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjtcbiAgICBkcmFnZ2VkRmlsZTogVEZpbGUgfCBudWxsID0gbnVsbDtcbiAgICBzZWxlY3RNb2RlOiBib29sZWFuID0gZmFsc2U7XG4gICAgc2VsZWN0ZWRRdWVzdHM6IFNldDxURmlsZT4gPSBuZXcgU2V0KCk7XG4gICAgXG4gICAgcHJpdmF0ZSBvYnNlcnZlcjogSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIGN1cnJlbnRRdWVzdExpc3Q6IFRGaWxlW10gPSBbXTtcbiAgICBwcml2YXRlIHJlbmRlcmVkQ291bnQ6IG51bWJlciA9IDA7XG4gICAgcHJpdmF0ZSByZWFkb25seSBCQVRDSF9TSVpFID0gMjA7XG5cbiAgICBwcml2YXRlIGRlYm91bmNlZFJlZnJlc2ggPSBkZWJvdW5jZSh0aGlzLnJlZnJlc2guYmluZCh0aGlzKSwgNTAsIHRydWUpO1xuXG4gICAgY29uc3RydWN0b3IobGVhZjogV29ya3NwYWNlTGVhZiwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikge1xuICAgICAgICBzdXBlcihsZWFmKTtcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgfVxuXG4gICAgZ2V0Vmlld1R5cGUoKSB7IHJldHVybiBWSUVXX1RZUEVfUEFOT1BUSUNPTjsgfVxuICAgIGdldERpc3BsYXlUZXh0KCkgeyByZXR1cm4gXCJFeWUgU2lzeXBodXNcIjsgfVxuICAgIGdldEljb24oKSB7IHJldHVybiBcInNrdWxsXCI7IH1cblxuICAgIGFzeW5jIG9uT3BlbigpIHsgXG4gICAgICAgIHRoaXMucmVmcmVzaCgpOyBcbiAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLm9uKCd1cGRhdGUnLCB0aGlzLmRlYm91bmNlZFJlZnJlc2gpOyBcbiAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLm9uKCd1bmRvOnNob3cnLCAobmFtZTogc3RyaW5nKSA9PiB0aGlzLnNob3dVbmRvVG9hc3QobmFtZSkpO1xuICAgIH1cblxuICAgIGFzeW5jIG9uQ2xvc2UoKSB7XG4gICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5vZmYoJ3VwZGF0ZScsIHRoaXMuZGVib3VuY2VkUmVmcmVzaCk7XG4gICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5vZmYoJ3VuZG86c2hvdycsIHRoaXMuc2hvd1VuZG9Ub2FzdC5iaW5kKHRoaXMpKTtcbiAgICAgICAgaWYgKHRoaXMub2JzZXJ2ZXIpIHRoaXMub2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuICAgIH1cblxuICAgIGFzeW5jIHJlZnJlc2goKSB7XG4gICAgICAgIC8vIDEuIENhcHR1cmUgU3RhdGUgJiBEaW1lbnNpb25zXG4gICAgICAgIGNvbnN0IHNjcm9sbEFyZWEgPSB0aGlzLmNvbnRlbnRFbC5xdWVyeVNlbGVjdG9yKFwiLnNpc3ktc2Nyb2xsLWFyZWFcIikgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgIGxldCBsYXN0U2Nyb2xsID0gMDtcbiAgICAgICAgaWYgKHNjcm9sbEFyZWEpIGxhc3RTY3JvbGwgPSBzY3JvbGxBcmVhLnNjcm9sbFRvcDtcblxuICAgICAgICAvLyBbRklYXSBNZWFzdXJlIHdpZHRoIEJFRk9SRSB3aXBpbmcgRE9NIHNvIHdlIGNhbiBkcmF3IGNoYXJ0cyBvZmYtc2NyZWVuXG4gICAgICAgIGNvbnN0IGN1cnJlbnRXaWR0aCA9IHRoaXMuY29udGVudEVsLmNsaWVudFdpZHRoIHx8IDMwMDsgXG5cbiAgICAgICAgY29uc3QgaXRlbXNUb1Jlc3RvcmUgPSBNYXRoLm1heCh0aGlzLnJlbmRlcmVkQ291bnQsIHRoaXMuQkFUQ0hfU0laRSk7XG5cbiAgICAgICAgY29uc3QgYWN0aXZlRWwgPSBkb2N1bWVudC5hY3RpdmVFbGVtZW50IGFzIEhUTUxFbGVtZW50O1xuICAgICAgICBjb25zdCBpc1F1aWNrSW5wdXQgPSBhY3RpdmVFbCAmJiBhY3RpdmVFbC5jbGFzc0xpc3QuY29udGFpbnMoXCJzaXN5LXF1aWNrLWlucHV0XCIpO1xuICAgICAgICBsZXQgcXVpY2tJbnB1dFZhbHVlID0gXCJcIjtcbiAgICAgICAgaWYgKGlzUXVpY2tJbnB1dCkgcXVpY2tJbnB1dFZhbHVlID0gKGFjdGl2ZUVsIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlO1xuXG4gICAgICAgIC8vIDIuIENsZWFuICYgUHJlcFxuICAgICAgICBpZiAodGhpcy5vYnNlcnZlcikgeyB0aGlzLm9ic2VydmVyLmRpc2Nvbm5lY3QoKTsgdGhpcy5vYnNlcnZlciA9IG51bGw7IH1cbiAgICAgICAgdGhpcy5wcmVwYXJlUXVlc3RzKCk7IFxuICAgICAgICB0aGlzLnJlbmRlcmVkQ291bnQgPSAwOyBcblxuICAgICAgICAvLyAzLiBCdWlsZCBCdWZmZXJcbiAgICAgICAgY29uc3QgYnVmZmVyID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICBjb25zdCBjb250YWluZXIgPSBidWZmZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktY29udGFpbmVyXCIgfSk7XG4gICAgICAgIGNvbnN0IHNjcm9sbCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1zY3JvbGwtYXJlYVwiIH0pO1xuICAgICAgICBzY3JvbGwuc3R5bGUuc2Nyb2xsQmVoYXZpb3IgPSBcImF1dG9cIjtcblxuICAgICAgICAvLyAtLS0gVUkgQ09OU1RSVUNUSU9OIC0tLVxuICAgICAgICBjb25zdCBoZWFkZXIgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktaGVhZGVyXCIgfSk7XG4gICAgICAgIGhlYWRlci5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJFeWUgU0lTWVBIVVMgT1NcIiB9KTtcbiAgICAgICAgY29uc3Qgc291bmRCdG4gPSBoZWFkZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogdGhpcy5wbHVnaW4uc2V0dGluZ3MubXV0ZWQgPyBcIvCflIdcIiA6IFwi8J+UilwiLCBjbHM6IFwic2lzeS1zb3VuZC1idG5cIiB9KTtcbiAgICAgICAgc291bmRCdG4ub25jbGljayA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5tdXRlZCA9ICF0aGlzLnBsdWdpbi5zZXR0aW5ncy5tdXRlZDtcbiAgICAgICAgICAgICB0aGlzLnBsdWdpbi5hdWRpby5zZXRNdXRlZCh0aGlzLnBsdWdpbi5zZXR0aW5ncy5tdXRlZCk7XG4gICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgdGhpcy5kZWJvdW5jZWRSZWZyZXNoKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5yZW5kZXJBbGVydHMoc2Nyb2xsKTtcblxuICAgICAgICBjb25zdCBodWQgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktaHVkXCIgfSk7XG4gICAgICAgIHRoaXMuc3RhdChodWQsIFwiSEVBTFRIXCIsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmhwfS8ke3RoaXMucGx1Z2luLnNldHRpbmdzLm1heEhwfWAsIHRoaXMucGx1Z2luLnNldHRpbmdzLmhwIDwgMzAgPyBcInNpc3ktY3JpdGljYWxcIiA6IFwiXCIpO1xuICAgICAgICB0aGlzLnN0YXQoaHVkLCBcIkdPTERcIiwgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZH1gLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIDwgMCA/IFwic2lzeS12YWwtZGVidFwiIDogXCJcIik7XG4gICAgICAgIHRoaXMuc3RhdChodWQsIFwiTEVWRUxcIiwgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MubGV2ZWx9YCk7XG4gICAgICAgIHRoaXMuc3RhdChodWQsIFwiUklWQUwgRE1HXCIsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLnJpdmFsRG1nfWApO1xuXG4gICAgICAgIHRoaXMucmVuZGVyT3JhY2xlKHNjcm9sbCk7XG5cbiAgICAgICAgc2Nyb2xsLmNyZWF0ZURpdih7IHRleHQ6IFwiVE9EQVlTIE9CSkVDVElWRVNcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICB0aGlzLnJlbmRlckRhaWx5TWlzc2lvbnMoc2Nyb2xsKTtcblxuICAgICAgICBjb25zdCBjdHJscyA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jb250cm9sc1wiIH0pO1xuICAgICAgICBjdHJscy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiREVQTE9ZXCIsIGNsczogXCJzaXN5LWJ0biBtb2QtY3RhXCIgfSkub25jbGljayA9ICgpID0+IG5ldyBRdWVzdE1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpO1xuICAgICAgICBjdHJscy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiU0hPUFwiLCBjbHM6IFwic2lzeS1idG5cIiB9KS5vbmNsaWNrID0gKCkgPT4gbmV3IFNob3BNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4pLm9wZW4oKTtcbiAgICAgICAgY3RybHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkZPQ1VTXCIsIGNsczogXCJzaXN5LWJ0blwiIH0pLm9uY2xpY2sgPSAoKSA9PiB0aGlzLnBsdWdpbi5hdWRpby50b2dnbGVCcm93bk5vaXNlKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBzZWxCdG4gPSBjdHJscy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IFxuICAgICAgICAgICAgdGV4dDogdGhpcy5zZWxlY3RNb2RlID8gYENBTkNFTCAoJHt0aGlzLnNlbGVjdGVkUXVlc3RzLnNpemV9KWAgOiBcIlNFTEVDVFwiLCBcbiAgICAgICAgICAgIGNsczogXCJzaXN5LWJ0blwiIFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0TW9kZSkgc2VsQnRuLmFkZENsYXNzKFwic2lzeS1maWx0ZXItYWN0aXZlXCIpO1xuICAgICAgICBzZWxCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0TW9kZSA9ICF0aGlzLnNlbGVjdE1vZGU7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkUXVlc3RzLmNsZWFyKCk7XG4gICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJGSUxURVIgQ09OVFJPTFNcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICB0aGlzLnJlbmRlckZpbHRlckJhcihzY3JvbGwpO1xuXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0QWN0aXZlQ2hhaW4oKSkge1xuICAgICAgICAgICAgc2Nyb2xsLmNyZWF0ZURpdih7IHRleHQ6IFwiQUNUSVZFIENIQUlOXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyQ2hhaW5TZWN0aW9uKHNjcm9sbCk7XG4gICAgICAgIH1cblxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJSRVNFQVJDSCBMSUJSQVJZXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgdGhpcy5yZW5kZXJSZXNlYXJjaFNlY3Rpb24oc2Nyb2xsKTtcblxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJBTkFMWVRJQ1NcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICBjb25zdCBhbmFseXRpY3NDb250YWluZXIgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYW5hbHl0aWNzXCIgfSk7XG4gICAgICAgIHRoaXMuc2V0dXBBbmFseXRpY3NTdHJ1Y3R1cmUoYW5hbHl0aWNzQ29udGFpbmVyKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFtGSVhdIFJlbmRlciBDaGFydHMgTk9XLCBpbnRvIHRoZSBidWZmZXIsIHVzaW5nIHRoZSBjYXB0dXJlZCB3aWR0aFxuICAgICAgICAvLyBUaGlzIGVuc3VyZXMgdGhleSBhcmUgZnVsbHkgZHJhd24gYmVmb3JlIHRoZSB1c2VyIHNlZXMgdGhlbS5cbiAgICAgICAgdGhpcy5yZW5kZXJBbmFseXRpY3NDaGFydHMoYW5hbHl0aWNzQ29udGFpbmVyLCBjdXJyZW50V2lkdGgpO1xuXG4gICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIkFDVElWRSBUSFJFQVRTXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgY29uc3QgcXVlc3RDb250YWluZXIgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktcXVlc3QtY29udGFpbmVyXCIgfSk7XG4gICAgICAgIHRoaXMucmVuZGVyUXVlc3RCYXRjaChxdWVzdENvbnRhaW5lciwgaXRlbXNUb1Jlc3RvcmUpO1xuXG4gICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIk5FVVJBTCBIVUJcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICB0aGlzLnJlbmRlclNraWxscyhzY3JvbGwpO1xuXG4gICAgICAgIGNvbnN0IGZvb3RlciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1xdWljay1jYXB0dXJlXCIgfSk7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gZm9vdGVyLmNyZWF0ZUVsKFwiaW5wdXRcIiwgeyBjbHM6IFwic2lzeS1xdWljay1pbnB1dFwiLCBwbGFjZWhvbGRlcjogXCJNaXNzaW9uIC8xLi4uNVwiIH0pO1xuICAgICAgICBpZiAoaXNRdWlja0lucHV0KSBpbnB1dC52YWx1ZSA9IHF1aWNrSW5wdXRWYWx1ZTtcbiAgICAgICAgXG4gICAgICAgIGlucHV0Lm9ua2V5ZG93biA9IGFzeW5jIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXkgPT09ICdFbnRlcicgJiYgaW5wdXQudmFsdWUudHJpbSgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLnBhcnNlUXVpY2tJbnB1dChpbnB1dC52YWx1ZS50cmltKCkpO1xuICAgICAgICAgICAgICAgIGlucHV0LnZhbHVlID0gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnJlbmRlckJ1bGtCYXIoY29udGFpbmVyKTtcblxuICAgICAgICAvLyA0LiBUSEUgU1dBUFxuICAgICAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgICAgICB0aGlzLmNvbnRlbnRFbC5hcHBlbmRDaGlsZChidWZmZXIpO1xuXG4gICAgICAgIC8vIDUuIFJFU1RPUkVcbiAgICAgICAgaWYgKGlzUXVpY2tJbnB1dCkge1xuICAgICAgICAgICAgY29uc3QgbmV3SW5wdXQgPSB0aGlzLmNvbnRlbnRFbC5xdWVyeVNlbGVjdG9yKFwiLnNpc3ktcXVpY2staW5wdXRcIikgYXMgSFRNTElucHV0RWxlbWVudDtcbiAgICAgICAgICAgIGlmIChuZXdJbnB1dCkge1xuICAgICAgICAgICAgICAgIG5ld0lucHV0LmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgbGVuID0gbmV3SW5wdXQudmFsdWUubGVuZ3RoOyBcbiAgICAgICAgICAgICAgICBuZXdJbnB1dC5zZXRTZWxlY3Rpb25SYW5nZShsZW4sIGxlbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGFzdFNjcm9sbCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IG5ld1Njcm9sbCA9IHRoaXMuY29udGVudEVsLnF1ZXJ5U2VsZWN0b3IoXCIuc2lzeS1zY3JvbGwtYXJlYVwiKTtcbiAgICAgICAgICAgIGlmKG5ld1Njcm9sbCkgbmV3U2Nyb2xsLnNjcm9sbFRvcCA9IGxhc3RTY3JvbGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcmVwYXJlUXVlc3RzKCkge1xuICAgICAgICBjb25zdCBmb2xkZXIgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJBY3RpdmVfUnVuL1F1ZXN0c1wiKTtcbiAgICAgICAgdGhpcy5jdXJyZW50UXVlc3RMaXN0ID0gW107XG5cbiAgICAgICAgaWYgKGZvbGRlciBpbnN0YW5jZW9mIFRGb2xkZXIpIHtcbiAgICAgICAgICAgIGxldCBmaWxlcyA9IGZvbGRlci5jaGlsZHJlbi5maWx0ZXIoZiA9PiBmIGluc3RhbmNlb2YgVEZpbGUpIGFzIFRGaWxlW107XG4gICAgICAgICAgICBmaWxlcyA9IHRoaXMucGx1Z2luLmVuZ2luZS5maWx0ZXJzRW5naW5lLmZpbHRlclF1ZXN0cyhmaWxlcykgYXMgVEZpbGVbXTsgXG4gICAgICAgICAgICBmaWxlcy5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZm1BID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoYSk/LmZyb250bWF0dGVyO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZtQiA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGIpPy5mcm9udG1hdHRlcjtcbiAgICAgICAgICAgICAgICBjb25zdCBvcmRlckEgPSBmbUE/Lm1hbnVhbF9vcmRlciAhPT0gdW5kZWZpbmVkID8gZm1BLm1hbnVhbF9vcmRlciA6IDk5OTk5OTk5OTk5OTk7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3JkZXJCID0gZm1CPy5tYW51YWxfb3JkZXIgIT09IHVuZGVmaW5lZCA/IGZtQi5tYW51YWxfb3JkZXIgOiA5OTk5OTk5OTk5OTk5O1xuICAgICAgICAgICAgICAgIGlmIChvcmRlckEgIT09IG9yZGVyQikgcmV0dXJuIG9yZGVyQSAtIG9yZGVyQjtcbiAgICAgICAgICAgICAgICBpZiAoZm1BPy5pc19ib3NzICE9PSBmbUI/LmlzX2Jvc3MpIHJldHVybiAoZm1CPy5pc19ib3NzID8gMSA6IDApIC0gKGZtQT8uaXNfYm9zcyA/IDEgOiAwKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRlQSA9IGZtQT8uZGVhZGxpbmUgPyBtb21lbnQoZm1BLmRlYWRsaW5lKS52YWx1ZU9mKCkgOiA5OTk5OTk5OTk5OTk5O1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGVCID0gZm1CPy5kZWFkbGluZSA/IG1vbWVudChmbUIuZGVhZGxpbmUpLnZhbHVlT2YoKSA6IDk5OTk5OTk5OTk5OTk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGVBIC0gZGF0ZUI7IFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRRdWVzdExpc3QgPSBmaWxlcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlbmRlclF1ZXN0QmF0Y2goY29udGFpbmVyOiBIVE1MRWxlbWVudCwgYmF0Y2hTaXplOiBudW1iZXIgPSB0aGlzLkJBVENIX1NJWkUpIHtcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFF1ZXN0TGlzdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGlkbGUgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgdGV4dDogXCJTeXN0ZW0gSWRsZS5cIiwgY2xzOiBcInNpc3ktZW1wdHktc3RhdGVcIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IGN0YUJ0biA9IGlkbGUuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIltERVBMT1kgUVVFU1RdXCIsIGNsczogXCJzaXN5LWJ0biBtb2QtY3RhXCIgfSk7XG4gICAgICAgICAgICBjdGFCdG4uc3R5bGUubWFyZ2luVG9wID0gXCIxMHB4XCI7XG4gICAgICAgICAgICBjdGFCdG4ub25jbGljayA9ICgpID0+IG5ldyBRdWVzdE1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbmV4dEJhdGNoID0gdGhpcy5jdXJyZW50UXVlc3RMaXN0LnNsaWNlKHRoaXMucmVuZGVyZWRDb3VudCwgdGhpcy5yZW5kZXJlZENvdW50ICsgYmF0Y2hTaXplKTtcbiAgICAgICAgZm9yIChjb25zdCBmaWxlIG9mIG5leHRCYXRjaCkgUXVlc3RDYXJkUmVuZGVyZXIucmVuZGVyKGNvbnRhaW5lciwgZmlsZSwgdGhpcyk7XG4gICAgICAgIHRoaXMucmVuZGVyZWRDb3VudCArPSBuZXh0QmF0Y2gubGVuZ3RoO1xuXG4gICAgICAgIGlmICh0aGlzLnJlbmRlcmVkQ291bnQgPCB0aGlzLmN1cnJlbnRRdWVzdExpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBzZW50aW5lbCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1zZW50aW5lbFwiIH0pO1xuICAgICAgICAgICAgdGhpcy5vYnNlcnZlciA9IG5ldyBJbnRlcnNlY3Rpb25PYnNlcnZlcigoZW50cmllcykgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlbnRyaWVzWzBdLmlzSW50ZXJzZWN0aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub2JzZXJ2ZXI/LmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgc2VudGluZWwucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyUXVlc3RCYXRjaChjb250YWluZXIsIHRoaXMuQkFUQ0hfU0laRSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgeyByb290OiBjb250YWluZXIucGFyZW50RWxlbWVudCwgdGhyZXNob2xkOiAwLjEgfSk7XG4gICAgICAgICAgICB0aGlzLm9ic2VydmVyLm9ic2VydmUoc2VudGluZWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0dXBBbmFseXRpY3NTdHJ1Y3R1cmUocGFyZW50OiBIVE1MRWxlbWVudCkge1xuICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRHYW1lU3RhdHMoKTtcbiAgICAgICAgY29uc3QgZyA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1odWRcIiB9KTtcbiAgICAgICAgdGhpcy5zdGF0KGcsIFwiU3RyZWFrXCIsIFN0cmluZyhzdGF0cy5jdXJyZW50U3RyZWFrKSk7XG4gICAgICAgIHRoaXMuc3RhdChnLCBcIlRvZGF5XCIsIFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWVzdHNDb21wbGV0ZWRUb2RheSkpO1xuICAgICAgICBcbiAgICAgICAgcGFyZW50LmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiBcIkFjdGl2aXR5ICg3IERheXMpXCIgfSk7XG4gICAgICAgIHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jaGFydC1jb250YWluZXItbGluZVwiIH0pOyBcbiAgICAgICAgcGFyZW50LmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiBcIkhlYXRtYXBcIiB9KTtcbiAgICAgICAgcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNoYXJ0LWNvbnRhaW5lci1oZWF0XCIgfSk7IFxuICAgIH1cblxuICAgIC8vIFtGSVhdIEFjY2VwdCB3aWR0aE92ZXJyaWRlIHRvIGVuYWJsZSBvZmYtc2NyZWVuIHJlbmRlcmluZ1xuICAgIHJlbmRlckFuYWx5dGljc0NoYXJ0cyhwYXJlbnQ6IEhUTUxFbGVtZW50LCB3aWR0aE92ZXJyaWRlPzogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGxpbmVDb250YWluZXIgPSBwYXJlbnQucXVlcnlTZWxlY3RvcihcIi5zaXN5LWNoYXJ0LWNvbnRhaW5lci1saW5lXCIpIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICBjb25zdCBoZWF0Q29udGFpbmVyID0gcGFyZW50LnF1ZXJ5U2VsZWN0b3IoXCIuc2lzeS1jaGFydC1jb250YWluZXItaGVhdFwiKSBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgXG4gICAgICAgIGlmIChsaW5lQ29udGFpbmVyKSB7XG4gICAgICAgICAgICBsaW5lQ29udGFpbmVyLmVtcHR5KCk7XG4gICAgICAgICAgICBDaGFydFJlbmRlcmVyLnJlbmRlckxpbmVDaGFydChsaW5lQ29udGFpbmVyLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kYXlNZXRyaWNzLCB3aWR0aE92ZXJyaWRlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGVhdENvbnRhaW5lcikge1xuICAgICAgICAgICAgaGVhdENvbnRhaW5lci5lbXB0eSgpO1xuICAgICAgICAgICAgQ2hhcnRSZW5kZXJlci5yZW5kZXJIZWF0bWFwKGhlYXRDb250YWluZXIsIHRoaXMucGx1Z2luLnNldHRpbmdzLmRheU1ldHJpY3MpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVuZGVyQWxlcnRzKHNjcm9sbDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmFjdGl2ZUJ1ZmZzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGJ1ZmZCYXIgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYWxlcnQgc2lzeS1hbGVydC1idWZmXCIgfSk7XG4gICAgICAgICAgICBidWZmQmFyLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkFDVElWRSBFRkZFQ1RTXCIsIGF0dHI6IHsgc3R5bGU6IFwiY29sb3I6IHZhcigtLXNpc3ktcHVycGxlKTtcIiB9IH0pO1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuYWN0aXZlQnVmZnMuZm9yRWFjaChiID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByb3cgPSBidWZmQmFyLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWFsZXJ0LXJvd1wiIH0pO1xuICAgICAgICAgICAgICAgIHJvdy5jcmVhdGVTcGFuKHsgdGV4dDogYCR7Yi5pY29ufSAke2IubmFtZX1gIH0pO1xuICAgICAgICAgICAgICAgIHJvdy5jcmVhdGVTcGFuKHsgdGV4dDogYCR7bW9tZW50KGIuZXhwaXJlc0F0KS5kaWZmKG1vbWVudCgpLCAnbWludXRlcycpfW0gbGVmdGAsIGNsczogXCJzaXN5LWFsZXJ0LXRpbWVyXCIgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZCA8IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGQgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYWxlcnQgc2lzeS1hbGVydC1kZWJ0XCIgfSk7XG4gICAgICAgICAgICBkLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIuKaoO+4jyBERUJUIENSSVNJU1wiIH0pO1xuICAgICAgICAgICAgZC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgQmFsYW5jZTogJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkfWdgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVuZGVyT3JhY2xlKHNjcm9sbDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3Qgb3JhY2xlID0gc2Nyb2xsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LW9yYWNsZVwiIH0pO1xuICAgICAgICBvcmFjbGUuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IFwiT1JBQ0xFIFBSRURJQ1RJT05cIiB9KTtcbiAgICAgICAgY29uc3Qgc3Vydml2YWwgPSBNYXRoLmZsb29yKHRoaXMucGx1Z2luLnNldHRpbmdzLmhwIC8gTWF0aC5tYXgoMSwgKHRoaXMucGx1Z2luLnNldHRpbmdzLnJpdmFsRG1nICogKHRoaXMucGx1Z2luLnNldHRpbmdzLmdvbGQgPCAwID8gMiA6IDEpKSkpO1xuICAgICAgICBjb25zdCBzdXJ2RWwgPSBvcmFjbGUuY3JlYXRlRGl2KHsgdGV4dDogYFN1cnZpdmFsOiAke3N1cnZpdmFsfSBkYXlzYCwgY2xzOiBcInNpc3ktcHJlZGljdGlvblwiIH0pO1xuICAgICAgICBpZiAoc3Vydml2YWwgPCAyKSBzdXJ2RWwuYWRkQ2xhc3MoXCJzaXN5LXByZWRpY3Rpb24tYmFkXCIpO1xuICAgIH1cblxuICAgIHJlbmRlclNraWxscyhzY3JvbGw6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5mb3JFYWNoKChzOiBTa2lsbCwgaWR4OiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1za2lsbC1yb3dcIiB9KTtcbiAgICAgICAgICAgIHJvdy5vbmNsaWNrID0gKCkgPT4gbmV3IFNraWxsRGV0YWlsTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luLCBpZHgpLm9wZW4oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgbWV0YSA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1za2lsbC1tZXRhXCIgfSk7XG4gICAgICAgICAgICBtZXRhLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgJHtzLm5hbWV9IChMdmwgJHtzLmxldmVsfSlgIH0pO1xuICAgICAgICAgICAgaWYgKHMucnVzdCA+IDApIG1ldGEuY3JlYXRlU3Bhbih7IHRleHQ6IGBSVVNUICR7cy5ydXN0fWAsIGNsczogXCJzaXN5LXRleHQtcnVzdFwiIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBiYXIgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYmFyLWJnXCIgfSk7XG4gICAgICAgICAgICBiYXIuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYmFyLWZpbGwgc2lzeS1maWxsLWJsdWVcIiwgYXR0cjogeyBzdHlsZTogYHdpZHRoOiAkeyhzLnhwL3MueHBSZXEpKjEwMH0lO2AgfSB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIisgQWRkIE5vZGVcIiwgY2xzOiBcInNpc3ktYnRuXCIsIGF0dHI6IHsgc3R5bGU6IFwid2lkdGg6MTAwJTsgbWFyZ2luLXRvcDoxMHB4O1wiIH0gfSkub25jbGljayA9ICgpID0+IG5ldyBTa2lsbE1hbmFnZXJNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4pLm9wZW4oKTtcbiAgICB9XG5cbiAgICByZW5kZXJCdWxrQmFyKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgaWYgKCF0aGlzLnNlbGVjdE1vZGUgfHwgdGhpcy5zZWxlY3RlZFF1ZXN0cy5zaXplID09PSAwKSByZXR1cm47XG4gICAgICAgIGNvbnN0IGJhciA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1idWxrLWJhclwiIH0pO1xuICAgICAgICBiYXIuY3JlYXRlU3Bhbih7IHRleHQ6IGAke3RoaXMuc2VsZWN0ZWRRdWVzdHMuc2l6ZX0gU2VsZWN0ZWRgLCBhdHRyOiB7IHN0eWxlOiBcImFsaWduLXNlbGY6Y2VudGVyOyBmb250LXdlaWdodDpib2xkOyBjb2xvcjogd2hpdGU7XCIgfSB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGJ0bkMgPSBiYXIuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkNPTVBMRVRFIEFMTFwiLCBjbHM6IFwic2lzeS1idG4gbW9kLWRvbmVcIiB9KTtcbiAgICAgICAgYnRuQy5vbmNsaWNrID0gYXN5bmMgKCkgPT4geyBmb3IgKGNvbnN0IGYgb2YgdGhpcy5zZWxlY3RlZFF1ZXN0cykgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLmNvbXBsZXRlUXVlc3QoZik7IHRoaXMuc2VsZWN0ZWRRdWVzdHMuY2xlYXIoKTsgdGhpcy5zZWxlY3RNb2RlID0gZmFsc2U7IHRoaXMuZGVib3VuY2VkUmVmcmVzaCgpOyB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYnRuRCA9IGJhci5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiREVMRVRFIEFMTFwiLCBjbHM6IFwic2lzeS1idG4gbW9kLWZhaWxcIiB9KTtcbiAgICAgICAgYnRuRC5vbmNsaWNrID0gYXN5bmMgKCkgPT4geyBmb3IgKGNvbnN0IGYgb2YgdGhpcy5zZWxlY3RlZFF1ZXN0cykgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLmRlbGV0ZVF1ZXN0KGYpOyB0aGlzLnNlbGVjdGVkUXVlc3RzLmNsZWFyKCk7IHRoaXMuc2VsZWN0TW9kZSA9IGZhbHNlOyB0aGlzLmRlYm91bmNlZFJlZnJlc2goKTsgfTtcbiAgICB9XG5cbiAgICByZW5kZXJEYWlseU1pc3Npb25zKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgbWlzc2lvbnMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kYWlseU1pc3Npb25zIHx8IFtdO1xuICAgICAgICBpZiAobWlzc2lvbnMubGVuZ3RoID09PSAwKSB7IHBhcmVudC5jcmVhdGVEaXYoeyB0ZXh0OiBcIk5vIG1pc3Npb25zLlwiLCBjbHM6IFwic2lzeS1lbXB0eS1zdGF0ZVwiIH0pOyByZXR1cm47IH1cbiAgICAgICAgY29uc3QgbWlzc2lvbnNEaXYgPSBwYXJlbnQuY3JlYXRlRGl2KCk7XG4gICAgICAgIG1pc3Npb25zLmZvckVhY2goKG06IERhaWx5TWlzc2lvbikgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2FyZCA9IG1pc3Npb25zRGl2LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LW1pc3Npb24tY2FyZFwiIH0pO1xuICAgICAgICAgICAgaWYgKG0uY29tcGxldGVkKSBjYXJkLmFkZENsYXNzKFwic2lzeS1taXNzaW9uLWNvbXBsZXRlZFwiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgaCA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktY2FyZC10b3BcIiB9KTtcbiAgICAgICAgICAgIGguY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogbS5uYW1lLCBjbHM6IFwic2lzeS1jYXJkLXRpdGxlXCIgfSk7XG4gICAgICAgICAgICBoLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IGAke20ucHJvZ3Jlc3N9LyR7bS50YXJnZXR9YCwgYXR0cjogeyBzdHlsZTogXCJmb250LXdlaWdodDogYm9sZDtcIiB9IH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXJkLmNyZWF0ZURpdih7IHRleHQ6IG0uZGVzYywgYXR0cjogeyBzdHlsZTogXCJmb250LXNpemU6IDAuOGVtOyBvcGFjaXR5OiAwLjc7IG1hcmdpbi1ib3R0b206IDVweDtcIiB9IH0pO1xuXG4gICAgICAgICAgICBjb25zdCBiYXIgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJhci1iZ1wiIH0pO1xuICAgICAgICAgICAgYmFyLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJhci1maWxsIHNpc3ktZmlsbC1ncmVlblwiLCBhdHRyOiB7IHN0eWxlOiBgd2lkdGg6ICR7KG0ucHJvZ3Jlc3MvbS50YXJnZXQpKjEwMH0lO2AgfSB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmVuZGVyQ2hhaW5TZWN0aW9uKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgY29uc3QgZGl2ID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNoYWluLWNvbnRhaW5lclwiIH0pO1xuICAgICAgICBkaXYuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IGNoYWluLm5hbWUsIGF0dHI6IHsgc3R5bGU6IFwiY29sb3I6IHZhcigtLXNpc3ktZ3JlZW4pO1wiIH0gfSk7XG4gICAgICAgIGNvbnN0IHAgPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0Q2hhaW5Qcm9ncmVzcygpO1xuICAgICAgICBjb25zdCBiID0gZGl2LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJhci1iZ1wiIH0pO1xuICAgICAgICBiLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJhci1maWxsIHNpc3ktZmlsbC1ncmVlblwiLCBhdHRyOiB7IHN0eWxlOiBgd2lkdGg6JHtwLnBlcmNlbnR9JTtgIH0gfSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBsaXN0ID0gZGl2LmNyZWF0ZURpdih7IGF0dHI6IHsgc3R5bGU6IFwibWFyZ2luOiAxMHB4IDA7IGZvbnQtc2l6ZTogMC45ZW07XCIgfSB9KTtcbiAgICAgICAgY2hhaW4ucXVlc3RzLmZvckVhY2goKHEsIGkpID0+IGxpc3QuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFske2kgPCBwLmNvbXBsZXRlZCA/IFwiT0tcIiA6IFwiLi5cIn1dICR7cX1gLCBhdHRyOiB7IHN0eWxlOiBpPT09cC5jb21wbGV0ZWQgPyBcImZvbnQtd2VpZ2h0OmJvbGRcIiA6IFwib3BhY2l0eTowLjVcIiB9IH0pKTtcbiAgICAgICAgZGl2LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJCUkVBSyBDSEFJTlwiLCBjbHM6IFwic2lzeS1idG4gbW9kLWZhaWxcIiwgYXR0cjogeyBzdHlsZTogXCJ3aWR0aDoxMDAlOyBtYXJnaW4tdG9wOjEwcHg7XCIgfSB9KS5vbmNsaWNrID0gYXN5bmMgKCkgPT4geyBhd2FpdCB0aGlzLnBsdWdpbi5lbmdpbmUuYnJlYWtDaGFpbigpOyB0aGlzLmRlYm91bmNlZFJlZnJlc2goKTsgfTtcbiAgICB9XG5cbiAgICByZW5kZXJSZXNlYXJjaFNlY3Rpb24ocGFyZW50OiBIVE1MRWxlbWVudCkge1xuICAgICAgICBjb25zdCByZXNlYXJjaCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzIHx8IFtdO1xuICAgICAgICBjb25zdCBhY3RpdmUgPSByZXNlYXJjaC5maWx0ZXIocSA9PiAhcS5jb21wbGV0ZWQpO1xuICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRSZXNlYXJjaFJhdGlvKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBzdGF0c0RpdiA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1yZXNlYXJjaC1zdGF0cyBzaXN5LWNhcmRcIiB9KTtcbiAgICAgICAgc3RhdHNEaXYuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFJlc2VhcmNoIFJhdGlvOiAke3N0YXRzLmNvbWJhdH06JHtzdGF0cy5yZXNlYXJjaH1gIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKGFjdGl2ZS5sZW5ndGggPT09IDApIHBhcmVudC5jcmVhdGVEaXYoeyB0ZXh0OiBcIk5vIGFjdGl2ZSByZXNlYXJjaC5cIiwgY2xzOiBcInNpc3ktZW1wdHktc3RhdGVcIiB9KTtcbiAgICAgICAgZWxzZSBhY3RpdmUuZm9yRWFjaCgocTogYW55KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjYXJkID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXJlc2VhcmNoLWNhcmRcIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IGggPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNhcmQtdG9wXCIgfSk7XG4gICAgICAgICAgICBoLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IHEudGl0bGUsIGNsczogXCJzaXN5LWNhcmQtdGl0bGVcIiB9KTtcbiAgICAgICAgICAgIGNhcmQuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFdvcmRzOiAke3Eud29yZENvdW50fS8ke3Eud29yZExpbWl0fWAgfSk7XG4gICAgICAgICAgICBjb25zdCBiYXIgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJhci1iZ1wiIH0pO1xuICAgICAgICAgICAgYmFyLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJhci1maWxsIHNpc3ktZmlsbC1wdXJwbGVcIiwgYXR0cjogeyBzdHlsZTogYHdpZHRoOiR7TWF0aC5taW4oMTAwLCAocS53b3JkQ291bnQvcS53b3JkTGltaXQpKjEwMCl9JTtgIH0gfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGFjdHMgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWFjdGlvbnNcIiB9KTtcbiAgICAgICAgICAgIGFjdHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkNPTVBMRVRFXCIsIGNsczogXCJzaXN5LWJ0biBtb2QtZG9uZSBzaXN5LWFjdGlvbi1idG5cIiB9KS5vbmNsaWNrID0gKCkgPT4geyB0aGlzLnBsdWdpbi5lbmdpbmUuY29tcGxldGVSZXNlYXJjaFF1ZXN0KHEuaWQsIHEud29yZENvdW50KTsgdGhpcy5kZWJvdW5jZWRSZWZyZXNoKCk7IH07XG4gICAgICAgICAgICBhY3RzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJERUxFVEVcIiwgY2xzOiBcInNpc3ktYnRuIG1vZC1mYWlsIHNpc3ktYWN0aW9uLWJ0blwiIH0pLm9uY2xpY2sgPSAoKSA9PiB7IHRoaXMucGx1Z2luLmVuZ2luZS5kZWxldGVSZXNlYXJjaFF1ZXN0KHEuaWQpOyB0aGlzLmRlYm91bmNlZFJlZnJlc2goKTsgfTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmVuZGVyRmlsdGVyQmFyKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgZ2V0RnJlc2hTdGF0ZSA9ICgpID0+IHRoaXMucGx1Z2luLnNldHRpbmdzLmZpbHRlclN0YXRlO1xuICAgICAgICBjb25zdCBkID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWZpbHRlci1iYXJcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGFkZFJvdyA9IChsOiBzdHJpbmcsIG9wdHM6IHN0cmluZ1tdLCBjdXJyOiBzdHJpbmcsIGNiOiBhbnkpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSBkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWZpbHRlci1yb3dcIiB9KTtcbiAgICAgICAgICAgIHIuY3JlYXRlU3Bhbih7IHRleHQ6IGwsIGNsczogXCJzaXN5LWZpbHRlci1sYWJlbFwiIH0pO1xuICAgICAgICAgICAgb3B0cy5mb3JFYWNoKG8gPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ0biA9IHIuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBvLnRvVXBwZXJDYXNlKCksIGNsczogXCJzaXN5LWZpbHRlci1idG5cIiB9KTtcbiAgICAgICAgICAgICAgICBpZiAoY3VyciA9PT0gbykgYnRuLmFkZENsYXNzKFwic2lzeS1maWx0ZXItYWN0aXZlXCIpO1xuICAgICAgICAgICAgICAgIGJ0bi5vbmNsaWNrID0gKCkgPT4gY2Iobyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBmID0gZ2V0RnJlc2hTdGF0ZSgpO1xuICAgICAgICBhZGRSb3coXCJFbmVyZ3k6XCIsIFtcImFueVwiLCBcImhpZ2hcIiwgXCJtZWRpdW1cIl0sIGYuYWN0aXZlRW5lcmd5LCAodjphbnkpPT4geyBcbiAgICAgICAgICAgIGNvbnN0IHMgPSBnZXRGcmVzaFN0YXRlKCk7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWwgPSAocy5hY3RpdmVFbmVyZ3kgPT09IHYgJiYgdiAhPT0gXCJhbnlcIikgPyBcImFueVwiIDogdjtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5zZXRGaWx0ZXJTdGF0ZShuZXdWYWwsIHMuYWN0aXZlQ29udGV4dCwgcy5hY3RpdmVUYWdzKTsgXG4gICAgICAgICAgICB0aGlzLmRlYm91bmNlZFJlZnJlc2goKTsgXG4gICAgICAgIH0pO1xuICAgICAgICBhZGRSb3coXCJDb250ZXh0OlwiLCBbXCJhbnlcIiwgXCJob21lXCIsIFwib2ZmaWNlXCJdLCBmLmFjdGl2ZUNvbnRleHQsICh2OmFueSk9PiB7IFxuICAgICAgICAgICAgY29uc3QgcyA9IGdldEZyZXNoU3RhdGUoKTtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbCA9IChzLmFjdGl2ZUNvbnRleHQgPT09IHYgJiYgdiAhPT0gXCJhbnlcIikgPyBcImFueVwiIDogdjtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5zZXRGaWx0ZXJTdGF0ZShzLmFjdGl2ZUVuZXJneSwgbmV3VmFsLCBzLmFjdGl2ZVRhZ3MpOyBcbiAgICAgICAgICAgIHRoaXMuZGVib3VuY2VkUmVmcmVzaCgpOyBcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBkLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDTEVBUlwiLCBjbHM6IFwic2lzeS1idG4gbW9kLWZhaWxcIiwgYXR0cjogeyBzdHlsZTogXCJ3aWR0aDoxMDAlOyBtYXJnaW4tdG9wOjVweDtcIiB9IH0pLm9uY2xpY2sgPSAoKSA9PiB7IHRoaXMucGx1Z2luLmVuZ2luZS5jbGVhckZpbHRlcnMoKTsgdGhpcy5kZWJvdW5jZWRSZWZyZXNoKCk7IH07XG4gICAgfVxuXG4gICAgc3RhdChwOiBIVE1MRWxlbWVudCwgbGFiZWw6IHN0cmluZywgdmFsOiBzdHJpbmcsIGNsczogc3RyaW5nID0gXCJcIikge1xuICAgICAgICBjb25zdCBiID0gcC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1zdGF0LWJveFwiIH0pOyBcbiAgICAgICAgaWYgKGNscykgYi5hZGRDbGFzcyhjbHMpO1xuICAgICAgICBiLmNyZWF0ZURpdih7IHRleHQ6IGxhYmVsLCBjbHM6IFwic2lzeS1zdGF0LWxhYmVsXCIgfSk7XG4gICAgICAgIGIuY3JlYXRlRGl2KHsgdGV4dDogdmFsLCBjbHM6IFwic2lzeS1zdGF0LXZhbFwiIH0pO1xuICAgIH1cblxuICAgIHNob3dVbmRvVG9hc3QocXVlc3ROYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgdG9hc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB0b2FzdC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcInBvc2l0aW9uOmZpeGVkOyBib3R0b206MjBweDsgcmlnaHQ6MjBweDsgYmFja2dyb3VuZDojMWUxZTFlOyBwYWRkaW5nOjEycHggMjBweDsgYm9yZGVyLXJhZGl1czo2cHg7IHotaW5kZXg6OTk5OTsgYm9yZGVyOjFweCBzb2xpZCB2YXIoLS1zaXN5LWJsdWUpOyBib3gtc2hhZG93OiAwIDVweCAyMHB4IHJnYmEoMCwwLDAsMC41KTsgZGlzcGxheTpmbGV4OyBhbGlnbi1pdGVtczpjZW50ZXI7IGdhcDoxNXB4O1wiKTsgXG4gICAgICAgIHRvYXN0LmlubmVySFRNTCA9IGA8c3Bhbj5EZWxldGVkOiA8c3Ryb25nPiR7cXVlc3ROYW1lfTwvc3Ryb25nPjwvc3Bhbj5gO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcbiAgICAgICAgYnRuLmlubmVyVGV4dCA9IFwiVU5ET1wiO1xuICAgICAgICBidG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJjdXJzb3I6cG9pbnRlcjsgY29sb3I6dmFyKC0tc2lzeS1ibHVlKTsgYmFja2dyb3VuZDpub25lOyBib3JkZXI6bm9uZTsgZm9udC13ZWlnaHQ6Ym9sZDsgbGV0dGVyLXNwYWNpbmc6MXB4O1wiKTtcbiAgICAgICAgYnRuLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7IGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS51bmRvTGFzdERlbGV0aW9uKCk7IHRvYXN0LnJlbW92ZSgpOyB9O1xuICAgICAgICBcbiAgICAgICAgdG9hc3QuYXBwZW5kQ2hpbGQoYnRuKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0b2FzdCk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdG9hc3QucmVtb3ZlKCksIDgwMDApO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IEFwcCwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZywgTm90aWNlIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IFNpc3lwaHVzUGx1Z2luIGZyb20gJy4vbWFpbic7XG5pbXBvcnQgeyBUZW1wbGF0ZU1hbmFnZXJNb2RhbCB9IGZyb20gJy4vdWkvbW9kYWxzJzsgLy8gQWRqdXN0IHBhdGggaWYgbmVlZGVkXG5cbmV4cG9ydCBjbGFzcyBTaXN5cGh1c1NldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHtcbiAgICAgICAgc3VwZXIoYXBwLCBwbHVnaW4pO1xuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICB9XG5cbiAgICBkaXNwbGF5KCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xuICAgICAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuXG4gICAgICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIlNpc3lwaHVzIEVuZ2luZSBTZXR0aW5nc1wiIH0pO1xuXG4gICAgICAgIC8vIC0tLSBHQU1FUExBWSBTRUNUSU9OIC0tLVxuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJHYW1lcGxheVwiIH0pO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAgICAgLnNldE5hbWUoXCJTdGFydGluZyBIUFwiKVxuICAgICAgICAgICAgLnNldERlc2MoXCJCYXNlIEhQIGZvciBhIG5ldyBydW4gKERlZmF1bHQ6IDEwMClcIilcbiAgICAgICAgICAgIC5hZGRUZXh0KHRleHQgPT4gdGV4dFxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3MubWF4SHApKVxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbnVtID0gcGFyc2VJbnQodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5tYXhIcCA9IGlzTmFOKG51bSkgPyAxMDAgOiBudW07XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgIH0pKTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAgIC5zZXROYW1lKFwiRGlmZmljdWx0eSBTY2FsaW5nIChSaXZhbCBEYW1hZ2UpXCIpXG4gICAgICAgICAgICAuc2V0RGVzYyhcIlN0YXJ0aW5nIGRhbWFnZSBwdW5pc2htZW50IGZvciBmYWlsZWQgcXVlc3RzIChEZWZhdWx0OiAxMClcIilcbiAgICAgICAgICAgIC5hZGRUZXh0KHRleHQgPT4gdGV4dFxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3Mucml2YWxEbWcpKVxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbnVtID0gcGFyc2VJbnQodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yaXZhbERtZyA9IGlzTmFOKG51bSkgPyAxMCA6IG51bTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgIC8vIEluc2lkZSBkaXNwbGF5KCksIHVuZGVyIEdhbWVwbGF5IHNlY3Rpb24uLi5cblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAuc2V0TmFtZShcIlF1ZXN0IFRlbXBsYXRlc1wiKVxuICAgICAgICAuc2V0RGVzYyhcIkNyZWF0ZSBvciBkZWxldGUgcXVpY2stZGVwbG95IHRlbXBsYXRlcy5cIilcbiAgICAgICAgLmFkZEJ1dHRvbihidG4gPT4gYnRuXG4gICAgICAgICAgICAuc2V0QnV0dG9uVGV4dChcIk1hbmFnZSBUZW1wbGF0ZXNcIilcbiAgICAgICAgICAgIC5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgICAgICAgICBuZXcgVGVtcGxhdGVNYW5hZ2VyTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luKS5vcGVuKCk7XG4gICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgLy8gLS0tIEFVRElPIFNFQ1RJT04gLS0tXG4gICAgICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkF1ZGlvXCIgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZShcIk11dGUgQWxsIFNvdW5kc1wiKVxuICAgICAgICAgICAgLnNldERlc2MoXCJEaXNhYmxlIHNvdW5kIGVmZmVjdHMgYW5kIGFtYmllbnQgbm9pc2VcIilcbiAgICAgICAgICAgIC5hZGRUb2dnbGUodG9nZ2xlID0+IHRvZ2dsZVxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5tdXRlZClcbiAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLm11dGVkID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmF1ZGlvLnNldE11dGVkKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgIC8vIC0tLSBEQVRBIE1BTkFHRU1FTlQgU0VDVElPTiAtLS1cbiAgICAgICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiRGF0YSBNYW5hZ2VtZW50XCIgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZShcIkV4cG9ydCBGdWxsIERhdGFcIilcbiAgICAgICAgICAgIC5zZXREZXNjKFwiRG93bmxvYWQgYWxsIHNldHRpbmdzLCBoaXN0b3J5LCBhbmQgc3RhdHMgYXMgYSBKU09OIGZpbGUuXCIpXG4gICAgICAgICAgICAuYWRkQnV0dG9uKGJ0biA9PiBidG5cbiAgICAgICAgICAgICAgICAuc2V0QnV0dG9uVGV4dChcIkV4cG9ydCBCYWNrdXBcIilcbiAgICAgICAgICAgICAgICAub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGpzb24gPSBKU09OLnN0cmluZ2lmeSh0aGlzLnBsdWdpbi5zZXR0aW5ncywgbnVsbCwgMik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbanNvbl0sIHsgdHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgICAgICAgICAgICAgYS5ocmVmID0gdXJsO1xuICAgICAgICAgICAgICAgICAgICBhLmRvd25sb2FkID0gYHNpc3lwaHVzX2JhY2t1cF8ke0RhdGUubm93KCl9Lmpzb25gO1xuICAgICAgICAgICAgICAgICAgICBhLmNsaWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcbiAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShcIkJhY2t1cCBkb3dubG9hZGVkLlwiKTtcbiAgICAgICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZShcIkltcG9ydCBEYXRhXCIpXG4gICAgICAgICAgICAuc2V0RGVzYyhcIlJlc3RvcmUgZnJvbSBiYWNrdXAgZmlsZS4g4pqg77iPIFdBUk5JTkc6IE92ZXJ3cml0ZXMgY3VycmVudCBwcm9ncmVzcyFcIilcbiAgICAgICAgICAgIC5hZGRCdXR0b24oYnRuID0+IGJ0blxuICAgICAgICAgICAgICAgIC5zZXRCdXR0b25UZXh0KFwiSW1wb3J0IEJhY2t1cFwiKVxuICAgICAgICAgICAgICAgIC5zZXRXYXJuaW5nKClcbiAgICAgICAgICAgICAgICAub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQudHlwZSA9ICdmaWxlJztcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQuYWNjZXB0ID0gJy5qc29uJztcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlucHV0Lm9uY2hhbmdlID0gYXN5bmMgKGU6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZSA9IGUudGFyZ2V0LmZpbGVzWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmaWxlKSByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGF3YWl0IGZpbGUudGV4dCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKHRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEJhc2ljIHZhbGlkYXRpb24gY2hlY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGEuaHAgfHwgIWRhdGEuc2tpbGxzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJJbnZhbGlkIGJhY2t1cCBmaWxlLlwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzID0gZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3JjZSBlbmdpbmUgdG8gcmVsb2FkIHN0YXRlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLnRyaWdnZXIoXCJ1cGRhdGVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShcIkRhdGEgaW1wb3J0ZWQgc3VjY2Vzc2Z1bGx5IVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJFcnJvciBpbXBvcnRpbmcgZGF0YS5cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQuY2xpY2soKTtcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgTm90aWNlLCBQbHVnaW4sIFRGaWxlLCBXb3Jrc3BhY2VMZWFmLCBkZWJvdW5jZSB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IFNpc3lwaHVzU2V0dGluZ3MgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IFNpc3lwaHVzRW5naW5lLCBERUZBVUxUX01PRElGSUVSIH0gZnJvbSAnLi9lbmdpbmUnO1xuaW1wb3J0IHsgQXVkaW9Db250cm9sbGVyIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBQYW5vcHRpY29uVmlldywgVklFV19UWVBFX1BBTk9QVElDT04gfSBmcm9tIFwiLi91aS92aWV3XCI7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdUYWIgfSBmcm9tICcuL3NldHRpbmdzJztcbmltcG9ydCB7IFJlc2VhcmNoUXVlc3RNb2RhbCwgQ2hhaW5CdWlsZGVyTW9kYWwsIFJlc2VhcmNoTGlzdE1vZGFsLCBRdWlja0NhcHR1cmVNb2RhbCwgUXVlc3RUZW1wbGF0ZU1vZGFsIH0gZnJvbSBcIi4vdWkvbW9kYWxzXCI7XG5cbmNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFNpc3lwaHVzU2V0dGluZ3MgPSB7XG4gICAgLy8gW05FV10gRGVmYXVsdCBUZW1wbGF0ZXNcbiAgICBxdWVzdFRlbXBsYXRlczogW1xuICAgICAgICB7IG5hbWU6IFwiTW9ybmluZyBSb3V0aW5lXCIsIGRpZmY6IDEsIHNraWxsOiBcIkRpc2NpcGxpbmVcIiwgZGVhZGxpbmU6IFwiMTA6MDBcIiB9LFxuICAgICAgICB7IG5hbWU6IFwiRGVlcCBXb3JrIEJsb2NrXCIsIGRpZmY6IDMsIHNraWxsOiBcIkZvY3VzXCIsIGRlYWRsaW5lOiBcIisyaFwiIH0sXG4gICAgICAgIHsgbmFtZTogXCJRdWljayBFeGVyY2lzZVwiLCBkaWZmOiAyLCBza2lsbDogXCJIZWFsdGhcIiwgZGVhZGxpbmU6IFwiKzEyaFwiIH1cbiAgICBdLCAvLyBDb21tYSBoZXJlLCBOTyBjbG9zaW5nIGJyYWNlIHlldCFcbiAgLy8gW05FV10gRGVmYXVsdHNcbiAgICBjb21ib0NvdW50OiAwLFxuICAgIGxhc3RDb21wbGV0aW9uVGltZTogMCxcbiAgLy8gW05FV11cbiAgICBhY3RpdmVCdWZmczogW10sXG5cbiAgICBocDogMTAwLCBtYXhIcDogMTAwLCB4cDogMCwgZ29sZDogMCwgeHBSZXE6IDEwMCwgbGV2ZWw6IDEsIHJpdmFsRG1nOiAxMCxcbiAgICBsYXN0TG9naW46IFwiXCIsIHNoaWVsZGVkVW50aWw6IFwiXCIsIHJlc3REYXlVbnRpbDogXCJcIiwgc2tpbGxzOiBbXSxcbiAgICBkYWlseU1vZGlmaWVyOiBERUZBVUxUX01PRElGSUVSLCBcbiAgICBsZWdhY3k6IHsgc291bHM6IDAsIHBlcmtzOiB7IHN0YXJ0R29sZDogMCwgc3RhcnRTa2lsbFBvaW50czogMCwgcml2YWxEZWxheTogMCB9LCByZWxpY3M6IFtdLCBkZWF0aENvdW50OiAwIH0sIFxuICAgIG11dGVkOiBmYWxzZSwgaGlzdG9yeTogW10sIHJ1bkNvdW50OiAxLCBsb2NrZG93blVudGlsOiBcIlwiLCBkYW1hZ2VUYWtlblRvZGF5OiAwLFxuICAgIGRhaWx5TWlzc2lvbnM6IFtdLCBcbiAgICBkYWlseU1pc3Npb25EYXRlOiBcIlwiLCBcbiAgICBxdWVzdHNDb21wbGV0ZWRUb2RheTogMCwgXG4gICAgc2tpbGxVc2VzVG9kYXk6IHt9LFxuICAgIHJlc2VhcmNoUXVlc3RzOiBbXSxcbiAgICByZXNlYXJjaFN0YXRzOiB7IHRvdGFsUmVzZWFyY2g6IDAsIHRvdGFsQ29tYmF0OiAwLCByZXNlYXJjaENvbXBsZXRlZDogMCwgY29tYmF0Q29tcGxldGVkOiAwIH0sXG4gICAgbGFzdFJlc2VhcmNoUXVlc3RJZDogMCxcbiAgICBtZWRpdGF0aW9uQ3ljbGVzQ29tcGxldGVkOiAwLFxuICAgIHF1ZXN0RGVsZXRpb25zVG9kYXk6IDAsXG4gICAgbGFzdERlbGV0aW9uUmVzZXQ6IFwiXCIsXG4gICAgaXNNZWRpdGF0aW5nOiBmYWxzZSxcbiAgICBtZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duOiAwLFxuICAgIGFjdGl2ZUNoYWluczogW10sXG4gICAgY2hhaW5IaXN0b3J5OiBbXSxcbiAgICBjdXJyZW50Q2hhaW5JZDogXCJcIixcbiAgICBjaGFpblF1ZXN0c0NvbXBsZXRlZDogMCxcbiAgICBxdWVzdEZpbHRlcnM6IHt9LFxuICAgIGZpbHRlclN0YXRlOiB7IGFjdGl2ZUVuZXJneTogXCJhbnlcIiwgYWN0aXZlQ29udGV4dDogXCJhbnlcIiwgYWN0aXZlVGFnczogW10gfSxcbiAgICBkYXlNZXRyaWNzOiBbXSxcbiAgICB3ZWVrbHlSZXBvcnRzOiBbXSxcbiAgICBib3NzTWlsZXN0b25lczogW10sXG4gICAgc3RyZWFrOiB7IGN1cnJlbnQ6IDAsIGxvbmdlc3Q6IDAsIGxhc3REYXRlOiBcIlwiIH0sXG4gICAgYWNoaWV2ZW1lbnRzOiBbXSxcbiAgICBnYW1lV29uOiBmYWxzZVxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTaXN5cGh1c1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gICAgc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3M7XG4gICAgc3RhdHVzQmFySXRlbTogSFRNTEVsZW1lbnQ7XG4gICAgZW5naW5lOiBTaXN5cGh1c0VuZ2luZTtcbiAgICBhdWRpbzogQXVkaW9Db250cm9sbGVyO1xuXG4gICAgYXN5bmMgb25sb2FkKCkge1xuICAgIC8vIC0tLSBFVkVOVCBMSVNURU5FUjogRklMRSBSRU5BTUUgLS0tXG4gICAgICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC52YXVsdC5vbigncmVuYW1lJywgKGZpbGUsIG9sZFBhdGgpID0+IHtcbiAgICAgICAgICAgIC8vIFdlIG9ubHkgY2FyZSBhYm91dCBNYXJrZG93biBmaWxlcywgYW5kIHdlIG5lZWQgdGhlIGJhc2VuYW1lXG4gICAgICAgICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlICYmIGZpbGUuZXh0ZW5zaW9uID09PSAnbWQnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3TmFtZSA9IGZpbGUuYmFzZW5hbWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBvbGQgYmFzZW5hbWUgZnJvbSB0aGUgb2xkIHBhdGhcbiAgICAgICAgICAgICAgICAvLyBvbGRQYXRoIGxvb2tzIGxpa2UgXCJBY3RpdmVfUnVuL1F1ZXN0cy9PbGROYW1lLm1kXCJcbiAgICAgICAgICAgICAgICBjb25zdCBwYXRoUGFydHMgPSBvbGRQYXRoLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICAgICAgY29uc3Qgb2xkRmlsZU5hbWUgPSBwYXRoUGFydHNbcGF0aFBhcnRzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgIGNvbnN0IG9sZE5hbWUgPSBvbGRGaWxlTmFtZS5yZXBsYWNlKC9cXC5tZCQvLCAnJyk7IC8vIFJlbW92ZSBleHRlbnNpb25cblxuICAgICAgICAgICAgICAgIGlmIChvbGROYW1lICE9PSBuZXdOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFByb3BhZ2F0ZSByZW5hbWUgdG8gZW5naW5lc1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVuZ2luZS5jaGFpbnNFbmdpbmUuaGFuZGxlUmVuYW1lKG9sZE5hbWUsIG5ld05hbWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVuZ2luZS5maWx0ZXJzRW5naW5lLmhhbmRsZVJlbmFtZShvbGROYW1lLCBuZXdOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEZvcmNlIHNhdmUgdG8gcGVyc2lzdCBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW5naW5lLnNhdmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKTtcblxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ3F1ZXN0LXRlbXBsYXRlcycsXG4gICAgICAgICAgICBuYW1lOiAnRGVwbG95IFF1ZXN0IGZyb20gVGVtcGxhdGUnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IG5ldyBRdWVzdFRlbXBsYXRlTW9kYWwodGhpcy5hcHAsIHRoaXMpLm9wZW4oKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdkZXBsb3ktcXVlc3QtaG90a2V5JyxcbiAgICAgICAgICAgIG5hbWU6ICdEZXBsb3kgUXVlc3QnLFxuICAgICAgICAgICAgaG90a2V5czogW3sgbW9kaWZpZXJzOiBbXCJNb2RcIl0sIGtleTogXCJkXCIgfV0sXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gbmV3IFJlc2VhcmNoUXVlc3RNb2RhbCh0aGlzLmFwcCwgdGhpcykub3BlbigpIC8vIEFzc3VtaW5nIGRlZmF1bHQgaXMgUmVzZWFyY2ggb3IgUXVlc3QgTW9kYWw/XG4gICAgICAgICAgICAvLyBBY3R1YWxseSwgd2Ugc2hvdWxkIG1hcCB0aGlzIHRvIFF1ZXN0TW9kYWwsIGJ1dCB5b3UgZGlkbid0IGV4cG9ydCBRdWVzdE1vZGFsIGluIG1vZGFscy50cyBwcm9wZXJseSBpbiB0aGUgc25pcHBldC4gXG4gICAgICAgICAgICAvLyBBc3N1bWluZyBRdWVzdE1vZGFsIGlzIGF2YWlsYWJsZSBvciB3ZSB1c2UgUmVzZWFyY2hRdWVzdE1vZGFsLiBcbiAgICAgICAgICAgIC8vIFJldmVydGluZyB0byBSZXNlYXJjaFF1ZXN0TW9kYWwgYXMgcGVyIHlvdXIgaW1wb3J0IGxpc3QsIFxuICAgICAgICAgICAgLy8gT1IgaWYgeW91IGhhdmUgUXVlc3RNb2RhbCBpbXBvcnRlZCwgdXNlIHRoYXQuXG4gICAgICAgICAgICAvLyBMZXQncyBhc3N1bWUgeW91IHdhbnQgdGhlIHN0YW5kYXJkIFF1ZXN0IGNyZWF0aW9uOlxuICAgICAgICAgICAgLy8gY2FsbGJhY2s6ICgpID0+IG5ldyBRdWVzdE1vZGFsKHRoaXMuYXBwLCB0aGlzKS5vcGVuKClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAndW5kby1xdWVzdC1kZWxldGUnLFxuICAgICAgICAgICAgbmFtZTogJ1VuZG8gTGFzdCBRdWVzdCBEZWxldGlvbicsXG4gICAgICAgICAgICBob3RrZXlzOiBbeyBtb2RpZmllcnM6IFtcIk1vZFwiLCBcIlNoaWZ0XCJdLCBrZXk6IFwielwiIH1dLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLnVuZG9MYXN0RGVsZXRpb24oKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdleHBvcnQtc3RhdHMnLFxuICAgICAgICAgICAgbmFtZTogJ0FuYWx5dGljczogRXhwb3J0IFN0YXRzIEpTT04nLFxuICAgICAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMuZW5naW5lLmdldEdhbWVTdGF0cygpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSBgU2lzeXBodXNfU3RhdHNfJHtEYXRlLm5vdygpfS5qc29uYDtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUocGF0aCwgSlNPTi5zdHJpbmdpZnkoc3RhdHMsIG51bGwsIDIpKTtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGBTdGF0cyBleHBvcnRlZCB0byAke3BhdGh9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgXG4gICAgICAgICAgICBpZDogJ2FjY2VwdC1kZWF0aCcsIFxuICAgICAgICAgICAgbmFtZTogJ0FDQ0VQVCBERUFUSCAoUmVzZXQgUnVuKScsIFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLnRyaWdnZXJEZWF0aCgpIFxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBcbiAgICAgICAgICAgIGlkOiAncmVyb2xsLWNoYW9zJywgXG4gICAgICAgICAgICBuYW1lOiAnUmVyb2xsIENoYW9zJywgXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUucm9sbENoYW9zKHRydWUpIFxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAncXVpY2stY2FwdHVyZScsXG4gICAgICAgICAgICBuYW1lOiAnUXVpY2sgQ2FwdHVyZSAoU2NyYXApJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiBuZXcgUXVpY2tDYXB0dXJlTW9kYWwodGhpcy5hcHAsIHRoaXMpLm9wZW4oKVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ2dlbmVyYXRlLXNraWxsLWdyYXBoJyxcbiAgICAgICAgICAgIG5hbWU6ICdOZXVyYWwgSHViOiBHZW5lcmF0ZSBTa2lsbCBHcmFwaCcsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUuZ2VuZXJhdGVTa2lsbEdyYXBoKClcbiAgICAgICAgfSk7XG4gICAgICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmxvYWRTdHlsZXMoKTtcbiAgICAgICAgdGhpcy5hdWRpbyA9IG5ldyBBdWRpb0NvbnRyb2xsZXIodGhpcy5zZXR0aW5ncy5tdXRlZCk7XG4gICAgICAgIHRoaXMuZW5naW5lID0gbmV3IFNpc3lwaHVzRW5naW5lKHRoaXMuYXBwLCB0aGlzLCB0aGlzLmF1ZGlvKTtcblxuICAgICAgICB0aGlzLnJlZ2lzdGVyVmlldyhWSUVXX1RZUEVfUEFOT1BUSUNPTiwgKGxlYWYpID0+IG5ldyBQYW5vcHRpY29uVmlldyhsZWFmLCB0aGlzKSk7XG5cbiAgICAgICAgdGhpcy5zdGF0dXNCYXJJdGVtID0gdGhpcy5hZGRTdGF0dXNCYXJJdGVtKCk7XG4gICAgICAgICh3aW5kb3cgYXMgYW55KS5zaXN5cGh1c0VuZ2luZSA9IHRoaXMuZW5naW5lO1xuICAgICAgICBcbiAgICAgICAgYXdhaXQgdGhpcy5lbmdpbmUuY2hlY2tEYWlseUxvZ2luKCk7XG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHVzQmFyKCk7XG5cblxuICAgICAgICAvLyAtLS0gQ09NTUFORFMgLS0tXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAnb3Blbi1wYW5vcHRpY29uJywgbmFtZTogJ09wZW4gUGFub3B0aWNvbicsIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmFjdGl2YXRlVmlldygpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ3RvZ2dsZS1mb2N1cycsIG5hbWU6ICdUb2dnbGUgRm9jdXMgQXVkaW8nLCBjYWxsYmFjazogKCkgPT4gdGhpcy5hdWRpby50b2dnbGVCcm93bk5vaXNlKCkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAnY3JlYXRlLXJlc2VhcmNoJywgbmFtZTogJ1Jlc2VhcmNoOiBDcmVhdGUgUXVlc3QnLCBjYWxsYmFjazogKCkgPT4gbmV3IFJlc2VhcmNoUXVlc3RNb2RhbCh0aGlzLmFwcCwgdGhpcykub3BlbigpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ3ZpZXctcmVzZWFyY2gnLCBuYW1lOiAnUmVzZWFyY2g6IFZpZXcgTGlicmFyeScsIGNhbGxiYWNrOiAoKSA9PiBuZXcgUmVzZWFyY2hMaXN0TW9kYWwodGhpcy5hcHAsIHRoaXMpLm9wZW4oKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdtZWRpdGF0ZScsIG5hbWU6ICdNZWRpdGF0aW9uOiBTdGFydCcsIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5zdGFydE1lZGl0YXRpb24oKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdjcmVhdGUtY2hhaW4nLCBuYW1lOiAnQ2hhaW5zOiBDcmVhdGUnLCBjYWxsYmFjazogKCkgPT4gbmV3IENoYWluQnVpbGRlck1vZGFsKHRoaXMuYXBwLCB0aGlzKS5vcGVuKCkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAndmlldy1jaGFpbnMnLCBuYW1lOiAnQ2hhaW5zOiBWaWV3IEFjdGl2ZScsIGNhbGxiYWNrOiAoKSA9PiB7IGNvbnN0IGMgPSB0aGlzLmVuZ2luZS5nZXRBY3RpdmVDaGFpbigpOyBuZXcgTm90aWNlKGMgPyBgQWN0aXZlOiAke2MubmFtZX1gIDogXCJObyBhY3RpdmUgY2hhaW5cIik7IH0gfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAnZmlsdGVyLWhpZ2gnLCBuYW1lOiAnRmlsdGVyczogSGlnaCBFbmVyZ3knLCBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUuc2V0RmlsdGVyU3RhdGUoXCJoaWdoXCIsIFwiYW55XCIsIFtdKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdjbGVhci1maWx0ZXJzJywgbmFtZTogJ0ZpbHRlcnM6IENsZWFyJywgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLmNsZWFyRmlsdGVycygpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ2dhbWUtc3RhdHMnLCBuYW1lOiAnQW5hbHl0aWNzOiBTdGF0cycsIGNhbGxiYWNrOiAoKSA9PiB7IGNvbnN0IHMgPSB0aGlzLmVuZ2luZS5nZXRHYW1lU3RhdHMoKTsgbmV3IE5vdGljZShgTHZsICR7cy5sZXZlbH0gfCBTdHJlYWsgJHtzLmN1cnJlbnRTdHJlYWt9YCk7IH0gfSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmFkZFJpYmJvbkljb24oJ3NrdWxsJywgJ1Npc3lwaHVzIFNpZGViYXInLCAoKSA9PiB0aGlzLmFjdGl2YXRlVmlldygpKTtcbiAgICAgICAgLy8gLi4uIHByZXZpb3VzIGNvZGUgLi4uXG5cbiAgICAvLyAtLS0gU0VUVElOR1MgVEFCIC0tLVxuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgU2lzeXBodXNTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG5cbiAgICB0aGlzLmFkZFJpYmJvbkljb24oJ3NrdWxsJywgJ1Npc3lwaHVzIFNpZGViYXInLCAoKSA9PiB0aGlzLmFjdGl2YXRlVmlldygpKTtcbiAgICB0aGlzLnJlZ2lzdGVySW50ZXJ2YWwod2luZG93LnNldEludGVydmFsKCgpID0+IHRoaXMuZW5naW5lLmNoZWNrRGVhZGxpbmVzKCksIDYwMDAwKSk7XG5cblxuICAgIC8vIFtGSVhdIERlYm91bmNlZCBXb3JkIENvdW50ZXIgKFR5cGV3cml0ZXIgRml4KVxuICAgICAgICBjb25zdCBkZWJvdW5jZWRVcGRhdGUgPSBkZWJvdW5jZSgoZmlsZTogVEZpbGUsIGNvbnRlbnQ6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgLy8gMS4gQ2hlY2sgaWYgZmlsZSBzdGlsbCBleGlzdHMgdG8gcHJldmVudCByYWNlIGNvbmRpdGlvbiBlcnJvcnNcbiAgICAgICAgICAgIGlmICghZmlsZSB8fCAhZmlsZS5wYXRoKSByZXR1cm47XG4gICAgICAgICAgICBjb25zdCBleGlzdHMgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZmlsZS5wYXRoKTtcbiAgICAgICAgICAgIGlmICghZXhpc3RzKSByZXR1cm47XG5cbiAgICAgICAgICAgIGNvbnN0IGNhY2hlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XG4gICAgICAgICAgICBpZiAoY2FjaGU/LmZyb250bWF0dGVyPy5yZXNlYXJjaF9pZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHdvcmRzID0gY29udGVudC50cmltKCkuc3BsaXQoL1xccysvKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgdGhpcy5lbmdpbmUudXBkYXRlUmVzZWFyY2hXb3JkQ291bnQoY2FjaGUuZnJvbnRtYXR0ZXIucmVzZWFyY2hfaWQsIHdvcmRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMTAwMCwgdHJ1ZSk7XG5cbiAgICAgICAgLy8gUmVnaXN0ZXIgdGhlIGV2ZW50IGxpc3RlbmVyIHRvIGFjdHVhbGx5IFVTRSB0aGUgZGVib3VuY2UgZnVuY3Rpb25cbiAgICAgICAgdGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLndvcmtzcGFjZS5vbignZWRpdG9yLWNoYW5nZScsIChlZGl0b3IsIGluZm8pID0+IHtcbiAgICAgICAgICAgIGlmIChpbmZvICYmIGluZm8uZmlsZSkge1xuICAgICAgICAgICAgICAgIGRlYm91bmNlZFVwZGF0ZShpbmZvLmZpbGUsIGVkaXRvci5nZXRWYWx1ZSgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgIH0gLy8gPC0tLSBUSElTIEJSQUNFIFdBUyBNSVNTSU5HXG5cbiAgICBhc3luYyBsb2FkU3R5bGVzKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgY3NzRmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0aGlzLm1hbmlmZXN0LmRpciArIFwiL3N0eWxlcy5jc3NcIik7XG4gICAgICAgICAgICBpZiAoY3NzRmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3NzID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChjc3NGaWxlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcbiAgICAgICAgICAgICAgICBzdHlsZS5pZCA9IFwic2lzeXBodXMtc3R5bGVzXCI7XG4gICAgICAgICAgICAgICAgc3R5bGUuaW5uZXJIVE1MID0gY3NzO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7IGNvbnNvbGUuZXJyb3IoXCJDb3VsZCBub3QgbG9hZCBzdHlsZXMuY3NzXCIsIGUpOyB9XG4gICAgfVxuXG4gICAgYXN5bmMgb251bmxvYWQoKSB7XG4gICAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5kZXRhY2hMZWF2ZXNPZlR5cGUoVklFV19UWVBFX1BBTk9QVElDT04pO1xuICAgICAgICBpZih0aGlzLmF1ZGlvLmF1ZGlvQ3R4KSB0aGlzLmF1ZGlvLmF1ZGlvQ3R4LmNsb3NlKCk7XG4gICAgICAgIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzaXN5cGh1cy1zdHlsZXNcIik7XG4gICAgICAgIGlmIChzdHlsZSkgc3R5bGUucmVtb3ZlKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgYWN0aXZhdGVWaWV3KCkge1xuICAgICAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHA7XG4gICAgICAgIGxldCBsZWFmOiBXb3Jrc3BhY2VMZWFmIHwgbnVsbCA9IG51bGw7XG4gICAgICAgIGNvbnN0IGxlYXZlcyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVklFV19UWVBFX1BBTk9QVElDT04pO1xuICAgICAgICBpZiAobGVhdmVzLmxlbmd0aCA+IDApIGxlYWYgPSBsZWF2ZXNbMF07XG4gICAgICAgIGVsc2UgeyBsZWFmID0gd29ya3NwYWNlLmdldFJpZ2h0TGVhZihmYWxzZSk7IGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogVklFV19UWVBFX1BBTk9QVElDT04sIGFjdGl2ZTogdHJ1ZSB9KTsgfVxuICAgICAgICB3b3Jrc3BhY2UucmV2ZWFsTGVhZihsZWFmKTtcbiAgICB9XG5cbiAgICB1cGRhdGVTdGF0dXNCYXIoKSB7XG4gICAgICAgIGNvbnN0IHNoaWVsZCA9ICh0aGlzLmVuZ2luZS5pc1NoaWVsZGVkKCkgfHwgdGhpcy5lbmdpbmUuaXNSZXN0aW5nKCkpID8gKHRoaXMuZW5naW5lLmlzUmVzdGluZygpID8gXCJEXCIgOiBcIlNcIikgOiBcIlwiO1xuICAgICAgICBjb25zdCBtQ291bnQgPSB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMuZmlsdGVyKG0gPT4gbS5jb21wbGV0ZWQpLmxlbmd0aDtcbiAgICAvLyBbTkVXXSBDb21ibyBJbmRpY2F0b3JcbiAgICAgICAgLy8gSWYgY29tYm8gPiAxLCBzaG93IGZpcmUgaWNvbi4gT3RoZXJ3aXNlIHNob3cgbm90aGluZy5cbiAgICAgICAgY29uc3QgY29tYm8gPSB0aGlzLnNldHRpbmdzLmNvbWJvQ291bnQgPiAxID8gYCDwn5SleCR7dGhpcy5zZXR0aW5ncy5jb21ib0NvdW50fWAgOiBcIlwiO1xuICAgICAgICB0aGlzLnN0YXR1c0Jhckl0ZW0uc2V0VGV4dChgJHt0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIuaWNvbn0gJHtzaGllbGR9IEhQJHt0aGlzLnNldHRpbmdzLmhwfSBHJHt0aGlzLnNldHRpbmdzLmdvbGR9IE0ke21Db3VudH0vM2ApO1xuICAgICAgICB0aGlzLnN0YXR1c0Jhckl0ZW0uc3R5bGUuY29sb3IgPSB0aGlzLnNldHRpbmdzLmhwIDwgMzAgPyBcInJlZFwiIDogdGhpcy5zZXR0aW5ncy5nb2xkIDwgMCA/IFwib3JhbmdlXCIgOiBcIlwiO1xuICAgIH1cbiAgICBcbiAgICBhc3luYyBsb2FkU2V0dGluZ3MoKSB7IHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBhd2FpdCB0aGlzLmxvYWREYXRhKCkpOyB9XG4gICAgYXN5bmMgc2F2ZVNldHRpbmdzKCkgeyBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpOyB9XG59XG4iXSwibmFtZXMiOlsiTm90aWNlIiwiTW9kYWwiLCJtb21lbnQiLCJTZXR0aW5nIiwiVEZvbGRlciIsIlRGaWxlIiwiSXRlbVZpZXciLCJkZWJvdW5jZSIsIlBsdWdpblNldHRpbmdUYWIiLCJQbHVnaW4iXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQWtHQTtBQUNPLFNBQVMsU0FBUyxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRTtBQUM3RCxJQUFJLFNBQVMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sS0FBSyxZQUFZLENBQUMsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsVUFBVSxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtBQUNoSCxJQUFJLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLFVBQVUsT0FBTyxFQUFFLE1BQU0sRUFBRTtBQUMvRCxRQUFRLFNBQVMsU0FBUyxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7QUFD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Q0FBQyxDQUFDO1FBQUMsSUFBSyxDQUFBLEtBQUEsR0FBVyxNQUFNLENBQUM7UUFBQyxJQUFRLENBQUEsUUFBQSxHQUFXLE1BQU0sQ0FBQztRQUFDLElBQVEsQ0FBQSxRQUFBLEdBQVcsRUFBRSxDQUFDO1FBQUMsSUFBVSxDQUFBLFVBQUEsR0FBWSxLQUFLLENBQUM7UUFBQyxJQUFNLENBQUEsTUFBQSxHQUFZLEtBQUssQ0FBQztBQUN6RyxRQUFBLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0tBQUU7SUFDbkYsTUFBTSxHQUFBO0FBQ0YsUUFBQSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQzNCLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDcEQsSUFBSUUsZ0JBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxFQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3ZJLFFBQUEsSUFBSUEsZ0JBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxR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QUMsSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQztBQUFFLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQzs7QUFHekUsUUFBQSxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsTUFBTSxJQUFJLENBQUM7QUFBRSxZQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7O0FBRzFELFFBQUEsSUFBSSxDQUFDLENBQUMsYUFBYSxDQUFDLGlCQUFpQixJQUFJLENBQUM7QUFBRSxZQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7O0FBR3RFLFFBQUEsSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLEdBQUc7QUFBRSxZQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7O0FBR3ZDLFFBQUEsSUFBSSxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUFFLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQzs7QUFHdkUsUUFBQSxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRTtBQUFFLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQzs7QUFHM0MsUUFBQSxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxLQUFLLENBQUM7QUFBRSxZQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7S0FDM0U7QUFFRCxJQUFBLE1BQU0sQ0FBQyxFQUFVLEVBQUE7UUFDYixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7QUFDOUQsUUFBQSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxR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QUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7QUFFNUQsUUFBQSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFhLEtBQzlEQSxlQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQ0EsZUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFQSxlQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUMzRSxDQUFDO1FBRUYsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQVcsRUFBRSxDQUFhLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkcsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQVcsRUFBRSxDQUFhLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDaEcsUUFBQSxNQUFNLFdBQVcsR0FBRyxXQUFXLEdBQUcsV0FBVyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsV0FBVyxJQUFJLFdBQVcsR0FBRyxXQUFXLENBQUMsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdEgsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQVcsRUFBRSxDQUFhLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEYsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQVcsRUFBRSxDQUFhLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFNUYsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMs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
