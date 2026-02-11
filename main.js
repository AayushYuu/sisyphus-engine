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
        if (!s) {
            contentEl.createEl("p", { text: "Skill not found." });
            return;
        }
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
                    const raw = template.deadline.replace(/^\+\s*/, "").replace(/\s*h(our)?s?$/i, "");
                    const hours = parseInt(raw, 10);
                    deadline = isNaN(hours) || hours < 0
                        ? obsidian.moment().add(24, 'hours').toISOString()
                        : obsidian.moment().add(hours, 'hours').toISOString();
                }
                else if (template.deadline.includes(":")) {
                    const [h, m] = template.deadline.split(":");
                    const hour = parseInt(h, 10) || 0;
                    const minute = parseInt(m, 10) || 0;
                    deadline = obsidian.moment().set({ hour, minute }).toISOString();
                    if (obsidian.moment().isAfter(deadline))
                        deadline = obsidian.moment(deadline).add(1, 'day').toISOString();
                }
                else {
                    deadline = obsidian.moment().add(24, 'hours').toISOString();
                }
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
        new obsidian.Setting(contentEl).addButton(b => b.setButtonText("CREATE RESEARCH").setCta().onClick(() => __awaiter(this, void 0, void 0, function* () {
            if (!this.title)
                return;
            const res = yield this.plugin.engine.createResearchQuest(this.title, this.type, this.linkedSkill, this.linkedCombatQuest);
            if (res.success)
                this.close();
        })));
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
                deleteBtn.onclick = () => __awaiter(this, void 0, void 0, function* () { yield this.plugin.engine.deleteResearchQuest(q.id); this.close(); });
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
class DeathModal extends obsidian.Modal {
    constructor(app, plugin) { super(app); this.plugin = plugin; }
    onOpen() {
        const { contentEl } = this;
        contentEl.addClass("sisy-death-modal");
        contentEl.createEl("h1", { text: "YOU DIED", cls: "sisy-death-title", attr: { style: "text-align:center; color:#f55;" } });
        contentEl.createEl("div", { text: "☠️", attr: { style: "font-size: 60px; margin: 20px 0; text-align: center;" } });
        const legacy = this.plugin.settings.legacy || { deathCount: 0, souls: 0, perks: { startGold: 0, startSkillPoints: 0, rivalDelay: 0 }, relics: [] };
        const streak = this.plugin.settings.streak || { longest: 0, current: 0, lastDate: "" };
        const stats = contentEl.createDiv({ attr: { style: "margin: 20px 0;" } });
        this.statLine(stats, "Level Reached", `${this.plugin.settings.level}`);
        this.statLine(stats, "Deaths (after this)", `${legacy.deathCount + 1}`);
        this.statLine(stats, "Longest Streak", `${streak.longest || 0} days`);
        contentEl.createEl("p", { text: "One must imagine Sisyphus happy. The boulder rolls back. You keep only your Scars.", attr: { style: "margin: 20px 0; font-style: italic; opacity: 0.8; text-align: center;" } });
        const btn = contentEl.createEl("button", { text: "ACCEPT DEATH" });
        btn.addClass("mod-cta");
        btn.style.width = "100%";
        btn.onclick = () => __awaiter(this, void 0, void 0, function* () {
            yield this.plugin.engine.triggerDeath();
            this.close();
        });
        contentEl.appendChild(btn);
    }
    statLine(el, label, val) { const line = el.createDiv({ cls: "sisy-victory-stat" }); line.innerHTML = `${label}: <span class="sisy-victory-highlight">${val}</span>`; }
    onClose() { this.contentEl.empty(); }
}
class ScarsModal extends obsidian.Modal {
    constructor(app, plugin) { super(app); this.plugin = plugin; }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "🧬 SCARS" });
        contentEl.createEl("p", { text: "What persists across deaths.", attr: { style: "opacity: 0.8; margin-bottom: 15px;" } });
        const scars = this.plugin.settings.scars || [];
        if (scars.length === 0) {
            contentEl.createEl("p", { text: "No scars yet. They accumulate when you die.", cls: "sisy-empty-state" });
        }
        else {
            const list = contentEl.createDiv();
            scars.slice().reverse().forEach((s) => {
                const row = list.createDiv({ attr: { style: "padding: 10px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;" } });
                row.createSpan({ text: `${s.label}: ${s.value}` });
                if (s.earnedAt)
                    row.createSpan({ text: new Date(s.earnedAt).toLocaleDateString(), attr: { style: "font-size: 0.85em; opacity: 0.7;" } });
            });
        }
    }
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
        new obsidian.Setting(contentEl).setName("Difficulty (1-5)").addText(t => t.setValue("1").onChange(v => { const n = parseInt(v, 10); this.newDiff = isNaN(n) ? 1 : Math.min(5, Math.max(1, n)); }));
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
                diff: Math.min(5, Math.max(1, this.newDiff || 1)),
                skill: this.newSkill || "None",
                deadline: this.newDeadline || "+2h"
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
     * Get the cost of the next deletion without mutating state.
     * Use this to check affordability before calling applyDeletionCost.
     */
    getDeletionCost() {
        this.ensureDeletionQuotaReset();
        let cost = 0;
        let message = "";
        if (this.settings.questDeletionsToday >= 3) {
            cost = 10;
            message = `Quest deleted. Cost: -${cost}g`;
        }
        else {
            const remaining = 3 - this.settings.questDeletionsToday;
            message = `Quest deleted. (${remaining - 1} free deletions remaining)`;
        }
        return { cost, message };
    }
    /**
     * Apply deletion: increment quota and charge gold. Call only after checking getDeletionCost().
     * Returns: { cost, message }
     */
    applyDeletionCost() {
        const { cost, message } = this.getDeletionCost();
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
            (filter.tags || []).forEach((tag) => tags.add(tag));
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

/**
 * Pure game formulas for Sisyphus Engine.
 * No Obsidian or runtime deps — safe to unit test.
 */
const BOSS_DATA = {
    10: { name: "The Gatekeeper", desc: "The first major filter.", hp_pen: 20 },
    20: { name: "The Shadow Self", desc: "Your own bad habits manifest.", hp_pen: 30 },
    30: { name: "The Mountain", desc: "The peak is visible.", hp_pen: 40 },
    50: { name: "Sisyphus Prime", desc: "One must imagine Sisyphus happy.", hp_pen: 99 },
};
function getDifficultyNumber(diffLabel) {
    var _a;
    const map = {
        Trivial: 1,
        Easy: 2,
        Medium: 3,
        Hard: 4,
        SUICIDE: 5,
    };
    return (_a = map[diffLabel]) !== null && _a !== void 0 ? _a : 3;
}
function questRewardsByDifficulty(diff, xpReq, isBoss, highStakes) {
    if (isBoss) {
        return { xpReward: 1000, goldReward: 1000, diffLabel: "☠️ BOSS" };
    }
    let xpReward;
    let goldReward;
    let diffLabel;
    switch (diff) {
        case 1:
            xpReward = Math.floor(xpReq * 0.05);
            goldReward = 10;
            diffLabel = "Trivial";
            break;
        case 2:
            xpReward = Math.floor(xpReq * 0.1);
            goldReward = 20;
            diffLabel = "Easy";
            break;
        case 3:
            xpReward = Math.floor(xpReq * 0.2);
            goldReward = 40;
            diffLabel = "Medium";
            break;
        case 4:
            xpReward = Math.floor(xpReq * 0.4);
            goldReward = 80;
            diffLabel = "Hard";
            break;
        case 5:
            xpReward = Math.floor(xpReq * 0.6);
            goldReward = 150;
            diffLabel = "SUICIDE";
            break;
        default:
            xpReward = Math.floor(xpReq * 0.2);
            goldReward = 40;
            diffLabel = "Medium";
    }
    if (highStakes)
        goldReward = Math.floor(goldReward * 1.5);
    return { xpReward, goldReward, diffLabel };
}
/**
 * Compute fail damage: base + rival, then buff mult, then boss penalty, then debt double.
 */
function computeFailDamage(rivalDmg, gold, damageMult, bossHpPenalty) {
    let d = 10 + Math.floor(rivalDmg / 2);
    d = Math.floor(d * damageMult);
    d += bossHpPenalty;
    if (gold < 0)
        d *= 2;
    return d;
}
function getBossHpPenalty(level) {
    var _a, _b;
    return (_b = (_a = BOSS_DATA[level]) === null || _a === void 0 ? void 0 : _a.hp_pen) !== null && _b !== void 0 ? _b : 0;
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
    /** Same sanitization as createQuest; use for lookup. */
    toSafeQuestName(name) {
        return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
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
                this.grantRewards(mission.reward.xp, mission.reward.gold, `mission:${mission.id}`);
                new obsidian.Notice(`✅ Mission Complete: ${mission.name}`);
                this.audio.playSound("success");
                if (this.settings.dailyMissions.every(m => m.completed))
                    justFinishedAll = true;
            }
        });
        if (justFinishedAll) {
            this.grantRewards(0, 50, 'missions:all_complete_bonus');
            new obsidian.Notice("🎉 All Missions Complete! +50 Bonus Gold");
            this.audio.playSound("success");
        }
    }
    getDifficultyNumber(diffLabel) {
        return getDifficultyNumber(diffLabel);
    }
    grantRewards(xp, gold, reason) {
        if (this.plugin.kernel) {
            this.plugin.kernel.events.emit('reward:granted', { xp, gold, reason });
            return;
        }
        this.settings.xp += xp;
        this.settings.gold += gold;
    }
    checkDailyLogin() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.plugin.kernel) {
                this.plugin.kernel.events.emit('session:start', { now: new Date().toISOString() });
                return;
            }
            const today = obsidian.moment().format("YYYY-MM-DD");
            if (this.settings.lastLogin) {
                const daysDiff = obsidian.moment().diff(obsidian.moment(this.settings.lastLogin), 'days');
                if (daysDiff > 2) {
                    const rotDamage = (daysDiff - 1) * 10;
                    if (rotDamage > 0) {
                        this.settings.hp -= rotDamage;
                        this.settings.history.push({ date: today, status: "rot", xpEarned: -rotDamage });
                    }
                    if (this.settings.hp <= 0) {
                        new DeathModal(this.app, this.plugin).open();
                        yield this.save();
                        return;
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
                        this.grantRewards(chainResult.bonusXp, 0, 'chain:completion_bonus');
                        new obsidian.Notice(`🎉 Chain Bonus: +${chainResult.bonusXp} XP!`);
                    }
                }
            }
            if (!this.plugin.kernel) {
                this.analyticsEngine.trackDailyMetrics("quest_complete", 1);
                this.settings.researchStats.totalCombat++;
            }
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
            const secondary = fm.secondary_skill || "None";
            const bossMatch = fm.is_boss ? file.basename.match(/BOSS_LVL(\d+)/) : null;
            const bossLevel = bossMatch ? parseInt(bossMatch[1]) : null;
            if (this.plugin.kernel) {
                this.plugin.kernel.events.emit('quest:completed', {
                    questId: file.basename,
                    difficulty: this.getDifficultyNumber(fm.difficulty),
                    skillName,
                    secondarySkill: secondary,
                    highStakes: !!fm.high_stakes,
                    isBoss: !!fm.is_boss,
                    bossLevel,
                    xpReward: xp,
                    goldReward: gold
                });
            }
            else {
                this.grantRewards(xp, gold, 'quest:completed');
            }
            this.audio.playSound("success");
            if (this.settings.hp <= 0) {
                return;
            }
            if (!this.plugin.kernel) {
                this.settings.questsCompletedToday++;
                this.analyticsEngine.updateStreak();
                this.checkDailyMissions({
                    type: "complete",
                    difficulty: this.getDifficultyNumber(fm.difficulty),
                    skill: skillName,
                    secondarySkill: secondary,
                    highStakes: fm.high_stakes
                });
            }
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
                    const safeName = this.toSafeQuestName(`BOSS_LVL${level} - ${boss.name}`);
                    const files = this.app.vault.getMarkdownFiles();
                    const file = files.find(f => f.basename.toLowerCase() === safeName);
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
            let damageMult = 1;
            this.settings.activeBuffs.forEach(b => {
                if (b.effect.damageMult)
                    damageMult *= b.effect.damageMult;
            });
            const fm = (_a = this.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
            let bossHpPenalty = 0;
            if (fm === null || fm === void 0 ? void 0 : fm.is_boss) {
                const match = file.basename.match(/BOSS_LVL(\d+)/);
                if (match) {
                    const level = parseInt(match[1]);
                    bossHpPenalty = getBossHpPenalty(level);
                }
            }
            const damage = computeFailDamage(this.settings.rivalDmg, this.settings.gold, damageMult, bossHpPenalty);
            if (this.plugin.kernel) {
                this.plugin.kernel.events.emit('quest:failed', {
                    questId: file.basename,
                    reason: manualAbort ? 'manual_abort' : 'failed',
                    damage,
                    manualAbort,
                    bossHpPenalty
                });
            }
            else {
                this.analyticsEngine.trackDailyMetrics("quest_fail", 1);
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
                if (this.settings.hp <= 0) {
                    new DeathModal(this.app, this.plugin).open();
                    return;
                }
                if (bossHpPenalty > 0) {
                    new obsidian.Notice(`☠️ Boss Crush: +${bossHpPenalty} Damage`);
                }
            }
            if (this.settings.hp <= 0) {
                return;
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
            const { xpReward, goldReward, diffLabel } = questRewardsByDifficulty(diff, this.settings.xpReq, isBoss, highStakes);
            const rootPath = "Active_Run/Quests";
            if (!this.app.vault.getAbstractFileByPath(rootPath))
                yield this.app.vault.createFolder(rootPath);
            const safeName = this.toSafeQuestName(name);
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
            const { cost } = this.meditationEngine.getDeletionCost();
            if (cost > 0 && this.settings.gold < cost) {
                new obsidian.Notice("Insufficient gold for paid deletion!");
                return;
            }
            const costResult = this.meditationEngine.applyDeletionCost();
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
            if (!this.plugin.kernel) {
                const now = obsidian.moment();
                const initialCount = this.settings.activeBuffs.length;
                this.settings.activeBuffs = this.settings.activeBuffs.filter(b => obsidian.moment(b.expiresAt).isAfter(now));
                if (this.settings.activeBuffs.length < initialCount) {
                    new obsidian.Notice("A potion effect has worn off.");
                    this.trigger("update");
                }
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
            if (res.success) {
                new obsidian.Notice(res.message);
                yield this.save();
            }
            else {
                new obsidian.Notice(res.message);
            }
            return res;
        });
    }
    completeResearchQuest(id, words) { this.researchEngine.completeResearchQuest(id, words); this.save(); }
    deleteResearchQuest(id) {
        return __awaiter(this, void 0, void 0, function* () { yield this.researchEngine.deleteResearchQuest(id); yield this.save(); });
    }
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
                const progress = skill.xpReq > 0 ? Math.floor((skill.xp / skill.xpReq) * 100) : 0;
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
            const path = this.settings.neuralHubPath || "Active_Run/Neural_Hub.canvas";
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
            const diff = Math.min(5, Math.max(1, parseInt(match[2], 10) || 3));
            this.createQuest(match[1], diff, "None", "None", obsidian.moment().add(24, 'hours').toISOString(), false, "Normal", false);
        }
        else {
            this.createQuest(text, 3, "None", "None", obsidian.moment().add(24, 'hours').toISOString(), false, "Normal", false);
        }
    }
    triggerDeath() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const nextDeath = (((_a = this.settings.legacy) === null || _a === void 0 ? void 0 : _a.deathCount) || 0) + 1;
            const runLevel = this.settings.level;
            const runStreak = ((_b = this.settings.streak) === null || _b === void 0 ? void 0 : _b.longest) || 0;
            const bossesDefeated = (this.settings.bossMilestones || []).filter((b) => b.defeated).length;
            if (!this.settings.scars)
                this.settings.scars = [];
            this.settings.scars.push({
                id: `death_${Date.now()}`,
                label: "Death",
                value: `#${nextDeath} · Lv ${runLevel} · Streak ${runStreak} · Bosses ${bossesDefeated}`,
                earnedAt: new Date().toISOString()
            });
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
            this.settings.legacy.deathCount = nextDeath;
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
        const divisor = Math.max(1, data.length - 1);
        data.forEach((val, idx) => {
            const x = (idx / divisor) * (width - padding * 2) + padding;
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
        var _a, _b;
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
                const pct = (((_b = fm.boss_hp) !== null && _b !== void 0 ? _b : 0) / fm.boss_max_hp) * 100;
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
            this.renderScars(scroll);
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
    renderScars(scroll) {
        const scars = this.plugin.settings.scars || [];
        if (scars.length === 0)
            return;
        const div = scroll.createDiv({ cls: "sisy-scars" });
        div.createEl("h4", { text: "🧬 SCARS" });
        const recent = scars.slice(-3).reverse();
        recent.forEach((s) => {
            div.createEl("p", { text: `${s.label}: ${s.value}`, attr: { style: "font-size: 0.9em; opacity: 0.85;" } });
        });
        const btn = div.createEl("button", { text: "View all", cls: "sisy-btn" });
        btn.style.marginTop = "6px";
        btn.onclick = () => new ScarsModal(this.app, this.plugin).open();
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
            const pct = s.xpReq > 0 ? (s.xp / s.xpReq) * 100 : 0;
            bar.createDiv({ cls: "sisy-bar-fill sisy-fill-blue", attr: { style: `width: ${pct}%;` } });
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
            const pct = m.target > 0 ? (m.progress / m.target) * 100 : 0;
            bar.createDiv({ cls: "sisy-bar-fill sisy-fill-green", attr: { style: `width: ${pct}%;` } });
        });
    }
    renderChainSection(parent) {
        const chain = this.plugin.engine.getActiveChain();
        if (!chain)
            return;
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
                const wpct = q.wordLimit > 0 ? Math.min(100, (q.wordCount / q.wordLimit) * 100) : 0;
                bar.createDiv({ cls: "sisy-bar-fill sisy-fill-purple", attr: { style: `width:${wpct}%;` } });
                const acts = card.createDiv({ cls: "sisy-actions" });
                acts.createEl("button", { text: "COMPLETE", cls: "sisy-btn mod-done sisy-action-btn" }).onclick = () => { this.plugin.engine.completeResearchQuest(q.id, q.wordCount); this.debouncedRefresh(); };
                acts.createEl("button", { text: "DELETE", cls: "sisy-btn mod-fail sisy-action-btn" }).onclick = () => __awaiter(this, void 0, void 0, function* () { yield this.plugin.engine.deleteResearchQuest(q.id); this.debouncedRefresh(); });
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

const CONFIG_VERSION = 1;
const STATE_VERSION = 1;
const KNOWN_MODULE_IDS = [
    'survival',
    'progression',
    'economy',
    'combat',
    'productivity',
    'analytics',
    'recovery',
    'daily_lifecycle'
];
function normalizeEnabledModules(rawIds) {
    if (!Array.isArray(rawIds))
        return [...KNOWN_MODULE_IDS];
    const allowed = new Set(KNOWN_MODULE_IDS);
    const normalized = rawIds
        .filter((id) => typeof id === 'string')
        .filter((id) => allowed.has(id));
    return normalized.length > 0 ? [...new Set(normalized)] : [...KNOWN_MODULE_IDS];
}
const DEFAULT_CONFIG = {
    enabledModules: [...KNOWN_MODULE_IDS],
    difficultyScale: 1,
    muteAudio: false
};
function isPersistedState(value) {
    if (!value || typeof value !== 'object')
        return false;
    const candidate = value;
    return !!candidate.config && !!candidate.state;
}
class StateManager {
    constructor(defaultState) {
        this.defaultState = defaultState;
    }
    migrate(rawData) {
        var _a, _b;
        if (isPersistedState(rawData)) {
            const nextConfig = Object.assign(Object.assign(Object.assign({}, DEFAULT_CONFIG), rawData.config), { enabledModules: normalizeEnabledModules((_a = rawData.config) === null || _a === void 0 ? void 0 : _a.enabledModules) });
            return {
                config: nextConfig,
                state: Object.assign({}, this.defaultState, rawData.state),
                migrated: rawData.configVersion !== CONFIG_VERSION || rawData.stateVersion !== STATE_VERSION
            };
        }
        const legacyState = Object.assign({}, this.defaultState, (rawData !== null && rawData !== void 0 ? rawData : {}));
        return {
            config: Object.assign(Object.assign({}, DEFAULT_CONFIG), { muteAudio: (_b = legacyState.muted) !== null && _b !== void 0 ? _b : DEFAULT_CONFIG.muteAudio, enabledModules: normalizeEnabledModules(undefined) }),
            state: legacyState,
            migrated: true
        };
    }
    toPersistedState(config, state) {
        return {
            configVersion: CONFIG_VERSION,
            stateVersion: STATE_VERSION,
            config: Object.assign(Object.assign(Object.assign({}, DEFAULT_CONFIG), config), { enabledModules: normalizeEnabledModules(config.enabledModules) }),
            state
        };
    }
}

class SisyphusSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        var _a, _b;
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Sisyphus Engine Settings' });
        // --- MODULES SECTION ---
        containerEl.createEl('h3', { text: 'Modules' });
        const modules = (_b = (_a = this.plugin.kernel) === null || _a === void 0 ? void 0 : _a.modules.getAll()) !== null && _b !== void 0 ? _b : [];
        modules.forEach((module) => {
            new obsidian.Setting(containerEl)
                .setName(module.name)
                .setDesc(module.description)
                .addToggle((toggle) => {
                const enabled = this.plugin.kernel.modules.isEnabled(module.id);
                toggle
                    .setValue(enabled)
                    .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (value) {
                            this.plugin.kernel.modules.enable(module.id);
                        }
                        else {
                            this.plugin.kernel.modules.disable(module.id);
                        }
                        const enabledIds = this.plugin.kernel.modules
                            .getAll()
                            .filter((entry) => this.plugin.kernel.modules.isEnabled(entry.id))
                            .map((entry) => entry.id);
                        this.plugin.config.enabledModules = enabledIds;
                        yield this.plugin.saveSettings();
                        this.plugin.engine.trigger('update');
                    }
                    catch (error) {
                        new obsidian.Notice(`Failed to toggle module '${module.name}'.`);
                        console.error(error);
                        this.display();
                    }
                }));
            });
        });
        // --- GAMEPLAY SECTION ---
        containerEl.createEl('h3', { text: 'Gameplay' });
        new obsidian.Setting(containerEl)
            .setName('Starting HP')
            .setDesc('Base HP for a new run (Default: 100)')
            .addText((text) => text.setValue(String(this.plugin.settings.maxHp)).onChange((value) => __awaiter(this, void 0, void 0, function* () {
            const num = parseInt(value);
            this.plugin.settings.maxHp = Number.isNaN(num) ? 100 : num;
            yield this.plugin.saveSettings();
        })));
        new obsidian.Setting(containerEl)
            .setName('Difficulty Scaling (Rival Damage)')
            .setDesc('Starting damage punishment for failed quests (Default: 10)')
            .addText((text) => text.setValue(String(this.plugin.settings.rivalDmg)).onChange((value) => __awaiter(this, void 0, void 0, function* () {
            const num = parseInt(value);
            this.plugin.settings.rivalDmg = Number.isNaN(num) ? 10 : num;
            yield this.plugin.saveSettings();
        })));
        new obsidian.Setting(containerEl)
            .setName('Quest Templates')
            .setDesc('Create or delete quick-deploy templates.')
            .addButton((btn) => btn.setButtonText('Manage Templates').onClick(() => {
            new TemplateManagerModal(this.app, this.plugin).open();
        }));
        // --- AUDIO SECTION ---
        containerEl.createEl('h3', { text: 'Audio' });
        new obsidian.Setting(containerEl)
            .setName('Mute All Sounds')
            .setDesc('Disable sound effects and ambient noise')
            .addToggle((toggle) => toggle.setValue(this.plugin.settings.muted).onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.muted = value;
            this.plugin.audio.setMuted(value);
            yield this.plugin.saveSettings();
        })));
        // --- DATA MANAGEMENT SECTION ---
        containerEl.createEl('h3', { text: 'Data Management' });
        new obsidian.Setting(containerEl)
            .setName('Export Full Data')
            .setDesc('Download config and full game state as a JSON file.')
            .addButton((btn) => btn.setButtonText('Export Backup').onClick(() => {
            const stateManager = new StateManager(this.plugin.settings);
            const payload = stateManager.toPersistedState(this.plugin.config, this.plugin.settings);
            const json = JSON.stringify(payload, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `sisyphus_backup_${Date.now()}.json`;
            anchor.click();
            URL.revokeObjectURL(url);
            new obsidian.Notice('Backup downloaded.');
        }));
        new obsidian.Setting(containerEl)
            .setName('Import Data')
            .setDesc('Restore from backup file. ⚠️ WARNING: Overwrites current progress!')
            .addButton((btn) => btn
            .setButtonText('Import Backup')
            .setWarning()
            .onClick(() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (event) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const target = event.target;
                const file = (_a = target.files) === null || _a === void 0 ? void 0 : _a[0];
                if (!file)
                    return;
                try {
                    const text = yield file.text();
                    const data = JSON.parse(text);
                    const stateManager = new StateManager(this.plugin.settings);
                    const migrated = stateManager.migrate(data);
                    this.plugin.config = migrated.config;
                    this.plugin.settings = migrated.state;
                    // Keep runtime references in sync
                    this.plugin.kernel.config = this.plugin.config;
                    this.plugin.kernel.state = this.plugin.settings;
                    const enabled = new Set(this.plugin.config.enabledModules);
                    this.plugin.kernel.modules.getAll().forEach((module) => {
                        if (enabled.has(module.id)) {
                            this.plugin.kernel.modules.enable(module.id);
                        }
                        else {
                            this.plugin.kernel.modules.disable(module.id);
                        }
                    });
                    yield this.plugin.saveSettings();
                    this.plugin.engine.trigger('update');
                    this.display();
                    new obsidian.Notice('Data imported successfully!');
                }
                catch (error) {
                    new obsidian.Notice('Error importing data.');
                    console.error(error);
                }
            });
            input.click();
        }));
    }
}

class EventBus {
    constructor() {
        this.listeners = new Map();
    }
    on(event, handler) {
        var _a;
        const handlers = (_a = this.listeners.get(event)) !== null && _a !== void 0 ? _a : new Set();
        handlers.add(handler);
        this.listeners.set(event, handlers);
        return () => this.off(event, handler);
    }
    off(event, handler) {
        const handlers = this.listeners.get(event);
        if (!handlers)
            return;
        handlers.delete(handler);
        if (handlers.size === 0) {
            this.listeners.delete(event);
        }
    }
    emit(event, payload) {
        const handlers = this.listeners.get(event);
        if (!handlers || handlers.size === 0)
            return;
        handlers.forEach((registeredHandler) => registeredHandler(payload));
    }
    clear() {
        this.listeners.clear();
    }
}

class ModuleManager {
    constructor() {
        this.modules = new Map();
        this.enabledModules = new Set();
    }
    register(module) {
        this.modules.set(module.id, module);
    }
    getAll() {
        return [...this.modules.values()];
    }
    getById(moduleId) {
        var _a;
        return (_a = this.modules.get(moduleId)) !== null && _a !== void 0 ? _a : null;
    }
    isEnabled(moduleId) {
        return this.enabledModules.has(moduleId);
    }
    enable(moduleId) {
        const module = this.modules.get(moduleId);
        if (!module || this.enabledModules.has(moduleId))
            return;
        const sortedDependencies = this.resolveDependencies(moduleId);
        sortedDependencies.forEach((id) => {
            if (this.enabledModules.has(id))
                return;
            const dependency = this.modules.get(id);
            if (!dependency)
                return;
            dependency.onEnable();
            this.enabledModules.add(id);
        });
    }
    disable(moduleId) {
        if (!this.enabledModules.has(moduleId))
            return;
        const dependents = this.findDependents(moduleId);
        dependents.forEach((dependentId) => this.disable(dependentId));
        const module = this.modules.get(moduleId);
        if (!module)
            return;
        module.onDisable();
        this.enabledModules.delete(moduleId);
    }
    disableAll() {
        [...this.enabledModules].forEach((moduleId) => this.disable(moduleId));
    }
    resolveDependencies(moduleId) {
        const sorted = [];
        const visiting = new Set();
        const visited = new Set();
        const visit = (id) => {
            if (visited.has(id))
                return;
            if (visiting.has(id)) {
                throw new Error(`Circular module dependency detected for module: ${id}`);
            }
            visiting.add(id);
            const module = this.modules.get(id);
            if (!module) {
                throw new Error(`Missing dependency module: ${id}`);
            }
            module.dependencies.forEach((dependencyId) => visit(dependencyId));
            visiting.delete(id);
            visited.add(id);
            sorted.push(id);
        };
        visit(moduleId);
        return sorted;
    }
    findDependents(moduleId) {
        const dependents = [];
        this.modules.forEach((module) => {
            if (!this.enabledModules.has(module.id))
                return;
            if (module.dependencies.includes(moduleId)) {
                dependents.push(module.id);
            }
        });
        return dependents;
    }
}

class SisyphusKernel {
    constructor(context) {
        var _a;
        this.context = context;
        this.events = new EventBus();
        this.modules = new ModuleManager();
        this.config = context.config;
        this.state = context.state;
        this.stateManager = new StateManager(this.state);
        this.services = Object.assign({}, ((_a = context.services) !== null && _a !== void 0 ? _a : {}));
    }
    setService(name, service) {
        this.services[name] = service;
    }
    getService(name) {
        var _a;
        return (_a = this.services[name]) !== null && _a !== void 0 ? _a : null;
    }
    registerModule(module) {
        module.onLoad(this);
        this.modules.register(module);
    }
    enableConfiguredModules() {
        this.config.enabledModules.forEach((moduleId) => {
            try {
                this.modules.enable(moduleId);
            }
            catch (error) {
                console.error(`[SisyphusKernel] Could not enable module '${moduleId}'.`, error);
            }
        });
    }
    persist() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.context.save(this.config, this.state);
        });
    }
    shutdown() {
        this.modules.disableAll();
        this.modules.getAll().forEach((module) => module.onUnload());
        this.events.clear();
    }
}

class GameModule {
    constructor() {
        this.dependencies = [];
        this.kernel = null;
    }
    onLoad(kernel) {
        this.kernel = kernel;
    }
    onUnload() {
        this.kernel = null;
    }
    renderSettings(_container) {
        // Optional override for module-specific settings
    }
}

class ProgressionModule extends GameModule {
    constructor() {
        super(...arguments);
        this.id = 'progression';
        this.name = 'Progression';
        this.description = 'XP, leveling, and skill growth from completed quests.';
        this.unsubscribeQuestCompleted = null;
        this.unsubscribeRewardGranted = null;
    }
    onEnable() {
        if (!this.kernel)
            return;
        this.unsubscribeQuestCompleted = this.kernel.events.on('quest:completed', (payload) => {
            var _a, _b, _c;
            const settings = this.kernel.state;
            const engine = this.kernel.getService('engine');
            let xp = payload.xpReward;
            const skill = settings.skills.find((entry) => entry.name === payload.skillName);
            if (skill) {
                skill.rust = 0;
                skill.xpReq = Math.max(1, Math.floor(skill.xpReq / 1.1));
                skill.lastUsed = new Date().toISOString();
                skill.xp += 1;
                if (skill.xp >= skill.xpReq) {
                    skill.level++;
                    skill.xp = 0;
                    new obsidian.Notice(`🧠 ${skill.name} Leveled Up!`);
                }
            }
            if (payload.secondarySkill && payload.secondarySkill !== 'None') {
                const secondarySkill = settings.skills.find((entry) => entry.name === payload.secondarySkill);
                if (secondarySkill && skill) {
                    if (!skill.connections)
                        skill.connections = [];
                    if (!skill.connections.includes(payload.secondarySkill)) {
                        skill.connections.push(payload.secondarySkill);
                        new obsidian.Notice('🔗 Neural Link Established');
                    }
                    xp += Math.floor(secondarySkill.level * 0.5);
                    secondarySkill.xp += 0.5;
                }
            }
            settings.xp += xp;
            if (settings.xp >= settings.xpReq) {
                settings.level++;
                settings.xp = 0;
                settings.xpReq = Math.floor(settings.xpReq * 1.1);
                settings.maxHp = 100 + (settings.level * 5);
                settings.hp = settings.maxHp;
                if (engine === null || engine === void 0 ? void 0 : engine.taunt)
                    engine.taunt('level_up');
                const messages = (_c = (_b = (_a = engine === null || engine === void 0 ? void 0 : engine.analyticsEngine) === null || _a === void 0 ? void 0 : _a.checkBossMilestones) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : [];
                messages.forEach((message) => new obsidian.Notice(message));
                if ([10, 20, 30, 50].includes(settings.level) && (engine === null || engine === void 0 ? void 0 : engine.spawnBoss)) {
                    void engine.spawnBoss(settings.level);
                }
            }
        });
        this.unsubscribeRewardGranted = this.kernel.events.on('reward:granted', (payload) => {
            this.kernel.state.xp += payload.xp;
        });
    }
    onDisable() {
        if (this.unsubscribeQuestCompleted) {
            this.unsubscribeQuestCompleted();
            this.unsubscribeQuestCompleted = null;
        }
        if (this.unsubscribeRewardGranted) {
            this.unsubscribeRewardGranted();
            this.unsubscribeRewardGranted = null;
        }
    }
}

class EconomyModule extends GameModule {
    constructor() {
        super(...arguments);
        this.id = 'economy';
        this.name = 'Economy';
        this.description = 'Applies gold rewards from quest completions.';
        this.unsubscribeQuestCompleted = null;
        this.unsubscribeRewardGranted = null;
    }
    onEnable() {
        if (!this.kernel)
            return;
        this.unsubscribeQuestCompleted = this.kernel.events.on('quest:completed', (payload) => {
            this.kernel.state.gold += payload.goldReward;
        });
        this.unsubscribeRewardGranted = this.kernel.events.on('reward:granted', (payload) => {
            this.kernel.state.gold += payload.gold;
        });
    }
    onDisable() {
        if (this.unsubscribeQuestCompleted) {
            this.unsubscribeQuestCompleted();
            this.unsubscribeQuestCompleted = null;
        }
        if (this.unsubscribeRewardGranted) {
            this.unsubscribeRewardGranted();
            this.unsubscribeRewardGranted = null;
        }
    }
}

class SurvivalModule extends GameModule {
    constructor() {
        super(...arguments);
        this.id = 'survival';
        this.name = 'Survival';
        this.description = 'HP damage, lockdown, and death handling for failed quests.';
        this.unsubscribeQuestFailed = null;
        this.unsubscribeQuestCompleted = null;
    }
    onEnable() {
        if (!this.kernel)
            return;
        this.unsubscribeQuestFailed = this.kernel.events.on('quest:failed', (payload) => {
            var _a;
            const settings = this.kernel.state;
            const engine = this.kernel.getService('engine');
            const app = this.kernel.getService('app');
            const plugin = this.kernel.getService('plugin');
            const audio = this.kernel.getService('audio');
            settings.hp -= payload.damage;
            settings.damageTakenToday += payload.damage;
            if (!payload.manualAbort)
                settings.rivalDmg += 1;
            if (audio === null || audio === void 0 ? void 0 : audio.playSound)
                audio.playSound('fail');
            if (engine === null || engine === void 0 ? void 0 : engine.checkDailyMissions)
                engine.checkDailyMissions({ type: 'damage' });
            if (settings.damageTakenToday > 50) {
                if ((_a = engine === null || engine === void 0 ? void 0 : engine.meditationEngine) === null || _a === void 0 ? void 0 : _a.triggerLockdown)
                    engine.meditationEngine.triggerLockdown();
                if (engine === null || engine === void 0 ? void 0 : engine.trigger)
                    engine.trigger('lockdown');
            }
            if (settings.hp <= 0) {
                new DeathModal(app, plugin).open();
                return;
            }
            if (payload.bossHpPenalty > 0) {
                new obsidian.Notice(`☠️ Boss Crush: +${payload.bossHpPenalty} Damage`);
            }
        });
        this.unsubscribeQuestCompleted = this.kernel.events.on('quest:completed', () => {
            var _a;
            const settings = this.kernel.state;
            const engine = this.kernel.getService('engine');
            const app = this.kernel.getService('app');
            const plugin = this.kernel.getService('plugin');
            if (settings.dailyModifier.name !== 'Adrenaline')
                return;
            settings.hp -= 5;
            settings.damageTakenToday += 5;
            if (settings.damageTakenToday > 50) {
                if ((_a = engine === null || engine === void 0 ? void 0 : engine.meditationEngine) === null || _a === void 0 ? void 0 : _a.triggerLockdown)
                    engine.meditationEngine.triggerLockdown();
                if (engine === null || engine === void 0 ? void 0 : engine.trigger)
                    engine.trigger('lockdown');
                new obsidian.Notice('Overexertion! LOCKDOWN INITIATED.');
            }
            if (settings.hp <= 0) {
                new DeathModal(app, plugin).open();
            }
        });
    }
    onDisable() {
        if (this.unsubscribeQuestFailed) {
            this.unsubscribeQuestFailed();
            this.unsubscribeQuestFailed = null;
        }
        if (this.unsubscribeQuestCompleted) {
            this.unsubscribeQuestCompleted();
            this.unsubscribeQuestCompleted = null;
        }
    }
}

class CombatModule extends GameModule {
    constructor() {
        super(...arguments);
        this.id = 'combat';
        this.name = 'Combat';
        this.description = 'Boss defeat processing and victory checks.';
        this.unsubscribeQuestCompleted = null;
    }
    onEnable() {
        if (!this.kernel)
            return;
        this.unsubscribeQuestCompleted = this.kernel.events.on('quest:completed', (payload) => {
            var _a, _b;
            if (!payload.isBoss || payload.bossLevel === null)
                return;
            const engine = this.kernel.getService('engine');
            const app = this.kernel.getService('app');
            const plugin = this.kernel.getService('plugin');
            const result = (_b = (_a = engine === null || engine === void 0 ? void 0 : engine.analyticsEngine) === null || _a === void 0 ? void 0 : _a.defeatBoss) === null || _b === void 0 ? void 0 : _b.call(_a, payload.bossLevel);
            if (result === null || result === void 0 ? void 0 : result.message) {
                new obsidian.Notice(result.message);
            }
            if (this.kernel.state.gameWon) {
                new VictoryModal(app, plugin).open();
            }
        });
    }
    onDisable() {
        if (this.unsubscribeQuestCompleted) {
            this.unsubscribeQuestCompleted();
            this.unsubscribeQuestCompleted = null;
        }
    }
}

class ProductivityModule extends GameModule {
    constructor() {
        super(...arguments);
        this.id = 'productivity';
        this.name = 'Productivity';
        this.description = 'Quest completion counters, streaks, and mission progression.';
        this.unsubscribeQuestCompleted = null;
    }
    onEnable() {
        if (!this.kernel)
            return;
        this.unsubscribeQuestCompleted = this.kernel.events.on('quest:completed', (payload) => {
            var _a, _b, _c;
            const settings = this.kernel.state;
            const engine = this.kernel.getService('engine');
            settings.questsCompletedToday += 1;
            (_b = (_a = engine === null || engine === void 0 ? void 0 : engine.analyticsEngine) === null || _a === void 0 ? void 0 : _a.updateStreak) === null || _b === void 0 ? void 0 : _b.call(_a);
            (_c = engine === null || engine === void 0 ? void 0 : engine.checkDailyMissions) === null || _c === void 0 ? void 0 : _c.call(engine, {
                type: 'complete',
                difficulty: payload.difficulty,
                skill: payload.skillName,
                secondarySkill: payload.secondarySkill,
                highStakes: payload.highStakes
            });
        });
    }
    onDisable() {
        if (this.unsubscribeQuestCompleted) {
            this.unsubscribeQuestCompleted();
            this.unsubscribeQuestCompleted = null;
        }
    }
}

class AnalyticsModule extends GameModule {
    constructor() {
        super(...arguments);
        this.id = 'analytics';
        this.name = 'Analytics';
        this.description = 'Tracks gameplay telemetry from domain events.';
        this.unsubscribeQuestCompleted = null;
        this.unsubscribeQuestFailed = null;
    }
    onEnable() {
        if (!this.kernel)
            return;
        this.unsubscribeQuestCompleted = this.kernel.events.on('quest:completed', () => {
            var _a, _b;
            const settings = this.kernel.state;
            const engine = this.kernel.getService('engine');
            (_b = (_a = engine === null || engine === void 0 ? void 0 : engine.analyticsEngine) === null || _a === void 0 ? void 0 : _a.trackDailyMetrics) === null || _b === void 0 ? void 0 : _b.call(_a, 'quest_complete', 1);
            settings.researchStats.totalCombat += 1;
        });
        this.unsubscribeQuestFailed = this.kernel.events.on('quest:failed', () => {
            var _a, _b;
            const engine = this.kernel.getService('engine');
            (_b = (_a = engine === null || engine === void 0 ? void 0 : engine.analyticsEngine) === null || _a === void 0 ? void 0 : _a.trackDailyMetrics) === null || _b === void 0 ? void 0 : _b.call(_a, 'quest_fail', 1);
        });
    }
    onDisable() {
        if (this.unsubscribeQuestCompleted) {
            this.unsubscribeQuestCompleted();
            this.unsubscribeQuestCompleted = null;
        }
        if (this.unsubscribeQuestFailed) {
            this.unsubscribeQuestFailed();
            this.unsubscribeQuestFailed = null;
        }
    }
}

class RecoveryModule extends GameModule {
    constructor() {
        super(...arguments);
        this.id = 'recovery';
        this.name = 'Recovery';
        this.description = 'Handles timed recovery effects such as buff expiration.';
        this.unsubscribeClockTick = null;
    }
    onEnable() {
        if (!this.kernel)
            return;
        this.unsubscribeClockTick = this.kernel.events.on('clock:tick', () => {
            var _a;
            const settings = this.kernel.state;
            const engine = this.kernel.getService('engine');
            const now = obsidian.moment();
            const initialCount = settings.activeBuffs.length;
            settings.activeBuffs = settings.activeBuffs.filter((buff) => obsidian.moment(buff.expiresAt).isAfter(now));
            if (settings.activeBuffs.length < initialCount) {
                new obsidian.Notice('A potion effect has worn off.');
                (_a = engine === null || engine === void 0 ? void 0 : engine.trigger) === null || _a === void 0 ? void 0 : _a.call(engine, 'update');
            }
        });
    }
    onDisable() {
        if (this.unsubscribeClockTick) {
            this.unsubscribeClockTick();
            this.unsubscribeClockTick = null;
        }
    }
}

class DailyLifecycleModule extends GameModule {
    constructor() {
        super(...arguments);
        this.id = 'daily_lifecycle';
        this.name = 'Daily Lifecycle';
        this.description = 'Handles daily login reset, rot damage, and daily chaos roll.';
        this.unsubscribeSessionStart = null;
    }
    onEnable() {
        if (!this.kernel)
            return;
        this.unsubscribeSessionStart = this.kernel.events.on('session:start', () => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const settings = this.kernel.state;
            const app = this.kernel.getService('app');
            const plugin = this.kernel.getService('plugin');
            const engine = this.kernel.getService('engine');
            const today = obsidian.moment().format('YYYY-MM-DD');
            if (settings.lastLogin) {
                const daysDiff = obsidian.moment().diff(obsidian.moment(settings.lastLogin), 'days');
                if (daysDiff > 2) {
                    const rotDamage = (daysDiff - 1) * 10;
                    if (rotDamage > 0) {
                        settings.hp -= rotDamage;
                        settings.history.push({ date: today, status: 'rot', xpEarned: -rotDamage });
                    }
                    if (settings.hp <= 0) {
                        new DeathModal(app, plugin).open();
                        yield ((_a = engine === null || engine === void 0 ? void 0 : engine.save) === null || _a === void 0 ? void 0 : _a.call(engine));
                        return;
                    }
                }
            }
            if (settings.lastLogin !== today) {
                settings.maxHp = 100 + (settings.level * 5);
                settings.hp = Math.min(settings.maxHp, settings.hp + 20);
                settings.damageTakenToday = 0;
                settings.lockdownUntil = '';
                settings.lastLogin = today;
                const todayMoment = obsidian.moment();
                settings.skills.forEach((skill) => {
                    var _a;
                    if (skill.lastUsed && todayMoment.diff(obsidian.moment(skill.lastUsed), 'days') > 3 && !((_a = engine === null || engine === void 0 ? void 0 : engine.isResting) === null || _a === void 0 ? void 0 : _a.call(engine))) {
                        skill.rust = Math.min(10, (skill.rust || 0) + 1);
                        skill.xpReq = Math.floor(skill.xpReq * 1.1);
                    }
                });
                if (settings.dailyMissionDate !== today) {
                    (_b = engine === null || engine === void 0 ? void 0 : engine.rollDailyMissions) === null || _b === void 0 ? void 0 : _b.call(engine);
                }
                yield ((_c = engine === null || engine === void 0 ? void 0 : engine.rollChaos) === null || _c === void 0 ? void 0 : _c.call(engine, true));
                yield ((_d = engine === null || engine === void 0 ? void 0 : engine.save) === null || _d === void 0 ? void 0 : _d.call(engine));
                return;
            }
            yield ((_e = engine === null || engine === void 0 ? void 0 : engine.save) === null || _e === void 0 ? void 0 : _e.call(engine));
        }));
    }
    onDisable() {
        if (this.unsubscribeSessionStart) {
            this.unsubscribeSessionStart();
            this.unsubscribeSessionStart = null;
        }
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
    gameWon: false,
    scars: [],
    neuralHubPath: "Active_Run/Neural_Hub.canvas"
};
class SisyphusPlugin extends obsidian.Plugin {
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            // --- EVENT LISTENER: FILE RENAME ---
            this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
                if (!this.engine)
                    return;
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
                callback: () => new QuestModal(this.app, this).open()
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
            this.audio = new AudioController(this.config.muteAudio);
            this.engine = new SisyphusEngine(this.app, this, this.audio);
            this.kernel = new SisyphusKernel({
                config: this.config,
                state: this.settings,
                save: (config, state) => __awaiter(this, void 0, void 0, function* () {
                    yield this.saveData({ config, state });
                }),
                services: {
                    app: this.app,
                    engine: this.engine,
                    audio: this.audio,
                    plugin: this
                }
            });
            this.kernel.registerModule(new SurvivalModule());
            this.kernel.registerModule(new ProgressionModule());
            this.kernel.registerModule(new EconomyModule());
            this.kernel.registerModule(new CombatModule());
            this.kernel.registerModule(new ProductivityModule());
            this.kernel.registerModule(new AnalyticsModule());
            this.kernel.registerModule(new RecoveryModule());
            this.kernel.registerModule(new DailyLifecycleModule());
            this.kernel.enableConfiguredModules();
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
            this.addCommand({ id: 'scars', name: 'Scars: View', callback: () => new ScarsModal(this.app, this).open() });
            this.addRibbonIcon('skull', 'Sisyphus Sidebar', () => this.activateView());
            // ... previous code ...
            // --- SETTINGS TAB ---
            this.addSettingTab(new SisyphusSettingTab(this.app, this));
            this.registerInterval(window.setInterval(() => {
                if (this.kernel)
                    this.kernel.events.emit('clock:tick', { now: new Date().toISOString() });
                void this.engine.checkDeadlines();
            }, 60000));
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
                const dir = (this.manifest && this.manifest.dir) || "";
                const path = dir ? `${dir}/styles.css` : "styles.css";
                const cssFile = this.app.vault.getAbstractFileByPath(path);
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
            if (this.kernel)
                this.kernel.shutdown();
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
        const combo = this.settings.comboCount > 1 ? ` 🔥x${this.settings.comboCount}` : "";
        this.statusBarItem.setText(`${this.settings.dailyModifier.icon} ${shield} HP${this.settings.hp} G${this.settings.gold} M${mCount}/3${combo}`);
        this.statusBarItem.style.color = this.settings.hp < 30 ? "red" : this.settings.gold < 0 ? "orange" : "";
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            const stateManager = new StateManager(DEFAULT_SETTINGS);
            const migration = stateManager.migrate(yield this.loadData());
            this.config = migration.config;
            this.settings = migration.state;
            if (migration.migrated) {
                yield this.saveData(stateManager.toPersistedState(this.config, this.settings));
            }
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            const stateManager = new StateManager(DEFAULT_SETTINGS);
            this.config.muteAudio = this.settings.muted;
            yield this.saveData(stateManager.toPersistedState(this.config, this.settings));
        });
    }
}

module.exports = SisyphusPlugin;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInNyYy91dGlscy50cyIsInNyYy91aS9tb2RhbHMudHMiLCJzcmMvYWNoaWV2ZW1lbnRzLnRzIiwic3JjL2VuZ2luZXMvQW5hbHl0aWNzRW5naW5lLnRzIiwic3JjL2VuZ2luZXMvTWVkaXRhdGlvbkVuZ2luZS50cyIsInNyYy9lbmdpbmVzL1Jlc2VhcmNoRW5naW5lLnRzIiwic3JjL2VuZ2luZXMvQ2hhaW5zRW5naW5lLnRzIiwic3JjL2VuZ2luZXMvRmlsdGVyc0VuZ2luZS50cyIsInNyYy9tZWNoYW5pY3MudHMiLCJzcmMvZW5naW5lLnRzIiwic3JjL3VpL2NoYXJ0cy50cyIsInNyYy91aS9jYXJkLnRzIiwic3JjL3VpL3ZpZXcudHMiLCJzcmMvY29yZS9TdGF0ZU1hbmFnZXIudHMiLCJzcmMvc2V0dGluZ3MudHMiLCJzcmMvY29yZS9FdmVudEJ1cy50cyIsInNyYy9jb3JlL01vZHVsZU1hbmFnZXIudHMiLCJzcmMvY29yZS9LZXJuZWwudHMiLCJzcmMvY29yZS9HYW1lTW9kdWxlLnRzIiwic3JjL21vZHVsZXMvcHJvZ3Jlc3Npb24vUHJvZ3Jlc3Npb25Nb2R1bGUudHMiLCJzcmMvbW9kdWxlcy9lY29ub215L0Vjb25vbXlNb2R1bGUudHMiLCJzcmMvbW9kdWxlcy9zdXJ2aXZhbC9TdXJ2aXZhbE1vZHVsZS50cyIsInNyYy9tb2R1bGVzL2NvbWJhdC9Db21iYXRNb2R1bGUudHMiLCJzcmMvbW9kdWxlcy9wcm9kdWN0aXZpdHkvUHJvZHVjdGl2aXR5TW9kdWxlLnRzIiwic3JjL21vZHVsZXMvYW5hbHl0aWNzL0FuYWx5dGljc01vZHVsZS50cyIsInNyYy9tb2R1bGVzL3JlY292ZXJ5L1JlY292ZXJ5TW9kdWxlLnRzIiwic3JjL21vZHVsZXMvcmVjb3ZlcnkvRGFpbHlMaWZlY3ljbGVNb2R1bGUudHMiLCJzcmMvbWFpbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbkNvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLlxyXG5cclxuUGVybWlzc2lvbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgYW5kL29yIGRpc3RyaWJ1dGUgdGhpcyBzb2Z0d2FyZSBmb3IgYW55XHJcbnB1cnBvc2Ugd2l0aCBvciB3aXRob3V0IGZlZSBpcyBoZXJlYnkgZ3JhbnRlZC5cclxuXHJcblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIgQU5EIFRIRSBBVVRIT1IgRElTQ0xBSU1TIEFMTCBXQVJSQU5USUVTIFdJVEhcclxuUkVHQVJEIFRPIFRISVMgU09GVFdBUkUgSU5DTFVESU5HIEFMTCBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZXHJcbkFORCBGSVRORVNTLiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SIEJFIExJQUJMRSBGT1IgQU5ZIFNQRUNJQUwsIERJUkVDVCxcclxuSU5ESVJFQ1QsIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyBPUiBBTlkgREFNQUdFUyBXSEFUU09FVkVSIFJFU1VMVElORyBGUk9NXHJcbkxPU1MgT0YgVVNFLCBEQVRBIE9SIFBST0ZJVFMsIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBORUdMSUdFTkNFIE9SXHJcbk9USEVSIFRPUlRJT1VTIEFDVElPTiwgQVJJU0lORyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBVU0UgT1JcclxuUEVSRk9STUFOQ0UgT0YgVEhJUyBTT0ZUV0FSRS5cclxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi9cclxuLyogZ2xvYmFsIFJlZmxlY3QsIFByb21pc2UsIFN1cHByZXNzZWRFcnJvciwgU3ltYm9sLCBJdGVyYXRvciAqL1xyXG5cclxudmFyIGV4dGVuZFN0YXRpY3MgPSBmdW5jdGlvbihkLCBiKSB7XHJcbiAgICBleHRlbmRTdGF0aWNzID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8XHJcbiAgICAgICAgKHsgX19wcm90b19fOiBbXSB9IGluc3RhbmNlb2YgQXJyYXkgJiYgZnVuY3Rpb24gKGQsIGIpIHsgZC5fX3Byb3RvX18gPSBiOyB9KSB8fFxyXG4gICAgICAgIGZ1bmN0aW9uIChkLCBiKSB7IGZvciAodmFyIHAgaW4gYikgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChiLCBwKSkgZFtwXSA9IGJbcF07IH07XHJcbiAgICByZXR1cm4gZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2V4dGVuZHMoZCwgYikge1xyXG4gICAgaWYgKHR5cGVvZiBiICE9PSBcImZ1bmN0aW9uXCIgJiYgYiAhPT0gbnVsbClcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2xhc3MgZXh0ZW5kcyB2YWx1ZSBcIiArIFN0cmluZyhiKSArIFwiIGlzIG5vdCBhIGNvbnN0cnVjdG9yIG9yIG51bGxcIik7XHJcbiAgICBleHRlbmRTdGF0aWNzKGQsIGIpO1xyXG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XHJcbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19hc3NpZ24gPSBmdW5jdGlvbigpIHtcclxuICAgIF9fYXNzaWduID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiBfX2Fzc2lnbih0KSB7XHJcbiAgICAgICAgZm9yICh2YXIgcywgaSA9IDEsIG4gPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XHJcbiAgICAgICAgICAgIHMgPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSkgdFtwXSA9IHNbcF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIF9fYXNzaWduLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3Jlc3QocywgZSkge1xyXG4gICAgdmFyIHQgPSB7fTtcclxuICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSAmJiBlLmluZGV4T2YocCkgPCAwKVxyXG4gICAgICAgIHRbcF0gPSBzW3BdO1xyXG4gICAgaWYgKHMgIT0gbnVsbCAmJiB0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyA9PT0gXCJmdW5jdGlvblwiKVxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBwID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhzKTsgaSA8IHAubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKGUuaW5kZXhPZihwW2ldKSA8IDAgJiYgT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZS5jYWxsKHMsIHBbaV0pKVxyXG4gICAgICAgICAgICAgICAgdFtwW2ldXSA9IHNbcFtpXV07XHJcbiAgICAgICAgfVxyXG4gICAgcmV0dXJuIHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2RlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19wYXJhbShwYXJhbUluZGV4LCBkZWNvcmF0b3IpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHsgZGVjb3JhdG9yKHRhcmdldCwga2V5LCBwYXJhbUluZGV4KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19lc0RlY29yYXRlKGN0b3IsIGRlc2NyaXB0b3JJbiwgZGVjb3JhdG9ycywgY29udGV4dEluLCBpbml0aWFsaXplcnMsIGV4dHJhSW5pdGlhbGl6ZXJzKSB7XHJcbiAgICBmdW5jdGlvbiBhY2NlcHQoZikgeyBpZiAoZiAhPT0gdm9pZCAwICYmIHR5cGVvZiBmICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJGdW5jdGlvbiBleHBlY3RlZFwiKTsgcmV0dXJuIGY7IH1cclxuICAgIHZhciBraW5kID0gY29udGV4dEluLmtpbmQsIGtleSA9IGtpbmQgPT09IFwiZ2V0dGVyXCIgPyBcImdldFwiIDoga2luZCA9PT0gXCJzZXR0ZXJcIiA/IFwic2V0XCIgOiBcInZhbHVlXCI7XHJcbiAgICB2YXIgdGFyZ2V0ID0gIWRlc2NyaXB0b3JJbiAmJiBjdG9yID8gY29udGV4dEluW1wic3RhdGljXCJdID8gY3RvciA6IGN0b3IucHJvdG90eXBlIDogbnVsbDtcclxuICAgIHZhciBkZXNjcmlwdG9yID0gZGVzY3JpcHRvckluIHx8ICh0YXJnZXQgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgY29udGV4dEluLm5hbWUpIDoge30pO1xyXG4gICAgdmFyIF8sIGRvbmUgPSBmYWxzZTtcclxuICAgIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICAgICAgdmFyIGNvbnRleHQgPSB7fTtcclxuICAgICAgICBmb3IgKHZhciBwIGluIGNvbnRleHRJbikgY29udGV4dFtwXSA9IHAgPT09IFwiYWNjZXNzXCIgPyB7fSA6IGNvbnRleHRJbltwXTtcclxuICAgICAgICBmb3IgKHZhciBwIGluIGNvbnRleHRJbi5hY2Nlc3MpIGNvbnRleHQuYWNjZXNzW3BdID0gY29udGV4dEluLmFjY2Vzc1twXTtcclxuICAgICAgICBjb250ZXh0LmFkZEluaXRpYWxpemVyID0gZnVuY3Rpb24gKGYpIHsgaWYgKGRvbmUpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgYWRkIGluaXRpYWxpemVycyBhZnRlciBkZWNvcmF0aW9uIGhhcyBjb21wbGV0ZWRcIik7IGV4dHJhSW5pdGlhbGl6ZXJzLnB1c2goYWNjZXB0KGYgfHwgbnVsbCkpOyB9O1xyXG4gICAgICAgIHZhciByZXN1bHQgPSAoMCwgZGVjb3JhdG9yc1tpXSkoa2luZCA9PT0gXCJhY2Nlc3NvclwiID8geyBnZXQ6IGRlc2NyaXB0b3IuZ2V0LCBzZXQ6IGRlc2NyaXB0b3Iuc2V0IH0gOiBkZXNjcmlwdG9yW2tleV0sIGNvbnRleHQpO1xyXG4gICAgICAgIGlmIChraW5kID09PSBcImFjY2Vzc29yXCIpIHtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gdm9pZCAwKSBjb250aW51ZTtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gbnVsbCB8fCB0eXBlb2YgcmVzdWx0ICE9PSBcIm9iamVjdFwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IGV4cGVjdGVkXCIpO1xyXG4gICAgICAgICAgICBpZiAoXyA9IGFjY2VwdChyZXN1bHQuZ2V0KSkgZGVzY3JpcHRvci5nZXQgPSBfO1xyXG4gICAgICAgICAgICBpZiAoXyA9IGFjY2VwdChyZXN1bHQuc2V0KSkgZGVzY3JpcHRvci5zZXQgPSBfO1xyXG4gICAgICAgICAgICBpZiAoXyA9IGFjY2VwdChyZXN1bHQuaW5pdCkpIGluaXRpYWxpemVycy51bnNoaWZ0KF8pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChfID0gYWNjZXB0KHJlc3VsdCkpIHtcclxuICAgICAgICAgICAgaWYgKGtpbmQgPT09IFwiZmllbGRcIikgaW5pdGlhbGl6ZXJzLnVuc2hpZnQoXyk7XHJcbiAgICAgICAgICAgIGVsc2UgZGVzY3JpcHRvcltrZXldID0gXztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAodGFyZ2V0KSBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBjb250ZXh0SW4ubmFtZSwgZGVzY3JpcHRvcik7XHJcbiAgICBkb25lID0gdHJ1ZTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3J1bkluaXRpYWxpemVycyh0aGlzQXJnLCBpbml0aWFsaXplcnMsIHZhbHVlKSB7XHJcbiAgICB2YXIgdXNlVmFsdWUgPSBhcmd1bWVudHMubGVuZ3RoID4gMjtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW5pdGlhbGl6ZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFsdWUgPSB1c2VWYWx1ZSA/IGluaXRpYWxpemVyc1tpXS5jYWxsKHRoaXNBcmcsIHZhbHVlKSA6IGluaXRpYWxpemVyc1tpXS5jYWxsKHRoaXNBcmcpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHVzZVZhbHVlID8gdmFsdWUgOiB2b2lkIDA7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19wcm9wS2V5KHgpIHtcclxuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gXCJzeW1ib2xcIiA/IHggOiBcIlwiLmNvbmNhdCh4KTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NldEZ1bmN0aW9uTmFtZShmLCBuYW1lLCBwcmVmaXgpIHtcclxuICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gXCJzeW1ib2xcIikgbmFtZSA9IG5hbWUuZGVzY3JpcHRpb24gPyBcIltcIi5jb25jYXQobmFtZS5kZXNjcmlwdGlvbiwgXCJdXCIpIDogXCJcIjtcclxuICAgIHJldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkoZiwgXCJuYW1lXCIsIHsgY29uZmlndXJhYmxlOiB0cnVlLCB2YWx1ZTogcHJlZml4ID8gXCJcIi5jb25jYXQocHJlZml4LCBcIiBcIiwgbmFtZSkgOiBuYW1lIH0pO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fbWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpIHtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5tZXRhZGF0YSA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4gUmVmbGVjdC5tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0ZXIodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19nZW5lcmF0b3IodGhpc0FyZywgYm9keSkge1xyXG4gICAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZyA9IE9iamVjdC5jcmVhdGUoKHR5cGVvZiBJdGVyYXRvciA9PT0gXCJmdW5jdGlvblwiID8gSXRlcmF0b3IgOiBPYmplY3QpLnByb3RvdHlwZSk7XHJcbiAgICByZXR1cm4gZy5uZXh0ID0gdmVyYigwKSwgZ1tcInRocm93XCJdID0gdmVyYigxKSwgZ1tcInJldHVyblwiXSA9IHZlcmIoMiksIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiAoZ1tTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9KSwgZztcclxuICAgIGZ1bmN0aW9uIHZlcmIobikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHN0ZXAoW24sIHZdKTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc3RlcChvcCkge1xyXG4gICAgICAgIGlmIChmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiR2VuZXJhdG9yIGlzIGFscmVhZHkgZXhlY3V0aW5nLlwiKTtcclxuICAgICAgICB3aGlsZSAoZyAmJiAoZyA9IDAsIG9wWzBdICYmIChfID0gMCkpLCBfKSB0cnkge1xyXG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XHJcbiAgICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcclxuICAgICAgICAgICAgc3dpdGNoIChvcFswXSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xyXG4gICAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XHJcbiAgICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19jcmVhdGVCaW5kaW5nID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIHZhciBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihtLCBrKTtcclxuICAgIGlmICghZGVzYyB8fCAoXCJnZXRcIiBpbiBkZXNjID8gIW0uX19lc01vZHVsZSA6IGRlc2Mud3JpdGFibGUgfHwgZGVzYy5jb25maWd1cmFibGUpKSB7XHJcbiAgICAgICAgZGVzYyA9IHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG1ba107IH0gfTtcclxuICAgIH1cclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgZGVzYyk7XHJcbn0pIDogKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XHJcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xyXG4gICAgb1trMl0gPSBtW2tdO1xyXG59KTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2V4cG9ydFN0YXIobSwgbykge1xyXG4gICAgZm9yICh2YXIgcCBpbiBtKSBpZiAocCAhPT0gXCJkZWZhdWx0XCIgJiYgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvLCBwKSkgX19jcmVhdGVCaW5kaW5nKG8sIG0sIHApO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX192YWx1ZXMobykge1xyXG4gICAgdmFyIHMgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgU3ltYm9sLml0ZXJhdG9yLCBtID0gcyAmJiBvW3NdLCBpID0gMDtcclxuICAgIGlmIChtKSByZXR1cm4gbS5jYWxsKG8pO1xyXG4gICAgaWYgKG8gJiYgdHlwZW9mIG8ubGVuZ3RoID09PSBcIm51bWJlclwiKSByZXR1cm4ge1xyXG4gICAgICAgIG5leHQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKG8gJiYgaSA+PSBvLmxlbmd0aCkgbyA9IHZvaWQgMDtcclxuICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IG8gJiYgb1tpKytdLCBkb25lOiAhbyB9O1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKHMgPyBcIk9iamVjdCBpcyBub3QgaXRlcmFibGUuXCIgOiBcIlN5bWJvbC5pdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3JlYWQobywgbikge1xyXG4gICAgdmFyIG0gPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb1tTeW1ib2wuaXRlcmF0b3JdO1xyXG4gICAgaWYgKCFtKSByZXR1cm4gbztcclxuICAgIHZhciBpID0gbS5jYWxsKG8pLCByLCBhciA9IFtdLCBlO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICB3aGlsZSAoKG4gPT09IHZvaWQgMCB8fCBuLS0gPiAwKSAmJiAhKHIgPSBpLm5leHQoKSkuZG9uZSkgYXIucHVzaChyLnZhbHVlKTtcclxuICAgIH1cclxuICAgIGNhdGNoIChlcnJvcikgeyBlID0geyBlcnJvcjogZXJyb3IgfTsgfVxyXG4gICAgZmluYWxseSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKHIgJiYgIXIuZG9uZSAmJiAobSA9IGlbXCJyZXR1cm5cIl0pKSBtLmNhbGwoaSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZpbmFsbHkgeyBpZiAoZSkgdGhyb3cgZS5lcnJvcjsgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGFyO1xyXG59XHJcblxyXG4vKiogQGRlcHJlY2F0ZWQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkKCkge1xyXG4gICAgZm9yICh2YXIgYXIgPSBbXSwgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspXHJcbiAgICAgICAgYXIgPSBhci5jb25jYXQoX19yZWFkKGFyZ3VtZW50c1tpXSkpO1xyXG4gICAgcmV0dXJuIGFyO1xyXG59XHJcblxyXG4vKiogQGRlcHJlY2F0ZWQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkQXJyYXlzKCkge1xyXG4gICAgZm9yICh2YXIgcyA9IDAsIGkgPSAwLCBpbCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBpbDsgaSsrKSBzICs9IGFyZ3VtZW50c1tpXS5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciByID0gQXJyYXkocyksIGsgPSAwLCBpID0gMDsgaSA8IGlsOyBpKyspXHJcbiAgICAgICAgZm9yICh2YXIgYSA9IGFyZ3VtZW50c1tpXSwgaiA9IDAsIGpsID0gYS5sZW5ndGg7IGogPCBqbDsgaisrLCBrKyspXHJcbiAgICAgICAgICAgIHJba10gPSBhW2pdO1xyXG4gICAgcmV0dXJuIHI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZEFycmF5KHRvLCBmcm9tLCBwYWNrKSB7XHJcbiAgICBpZiAocGFjayB8fCBhcmd1bWVudHMubGVuZ3RoID09PSAyKSBmb3IgKHZhciBpID0gMCwgbCA9IGZyb20ubGVuZ3RoLCBhcjsgaSA8IGw7IGkrKykge1xyXG4gICAgICAgIGlmIChhciB8fCAhKGkgaW4gZnJvbSkpIHtcclxuICAgICAgICAgICAgaWYgKCFhcikgYXIgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChmcm9tLCAwLCBpKTtcclxuICAgICAgICAgICAgYXJbaV0gPSBmcm9tW2ldO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiB0by5jb25jYXQoYXIgfHwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZnJvbSkpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdCh2KSB7XHJcbiAgICByZXR1cm4gdGhpcyBpbnN0YW5jZW9mIF9fYXdhaXQgPyAodGhpcy52ID0gdiwgdGhpcykgOiBuZXcgX19hd2FpdCh2KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNHZW5lcmF0b3IodGhpc0FyZywgX2FyZ3VtZW50cywgZ2VuZXJhdG9yKSB7XHJcbiAgICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgdmFyIGcgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSksIGksIHEgPSBbXTtcclxuICAgIHJldHVybiBpID0gT2JqZWN0LmNyZWF0ZSgodHlwZW9mIEFzeW5jSXRlcmF0b3IgPT09IFwiZnVuY3Rpb25cIiA/IEFzeW5jSXRlcmF0b3IgOiBPYmplY3QpLnByb3RvdHlwZSksIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiwgYXdhaXRSZXR1cm4pLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICBmdW5jdGlvbiBhd2FpdFJldHVybihmKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHYpLnRoZW4oZiwgcmVqZWN0KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gdmVyYihuLCBmKSB7IGlmIChnW25dKSB7IGlbbl0gPSBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKGEsIGIpIHsgcS5wdXNoKFtuLCB2LCBhLCBiXSkgPiAxIHx8IHJlc3VtZShuLCB2KTsgfSk7IH07IGlmIChmKSBpW25dID0gZihpW25dKTsgfSB9XHJcbiAgICBmdW5jdGlvbiByZXN1bWUobiwgdikgeyB0cnkgeyBzdGVwKGdbbl0odikpOyB9IGNhdGNoIChlKSB7IHNldHRsZShxWzBdWzNdLCBlKTsgfSB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKHIpIHsgci52YWx1ZSBpbnN0YW5jZW9mIF9fYXdhaXQgPyBQcm9taXNlLnJlc29sdmUoci52YWx1ZS52KS50aGVuKGZ1bGZpbGwsIHJlamVjdCkgOiBzZXR0bGUocVswXVsyXSwgcik7IH1cclxuICAgIGZ1bmN0aW9uIGZ1bGZpbGwodmFsdWUpIHsgcmVzdW1lKFwibmV4dFwiLCB2YWx1ZSk7IH1cclxuICAgIGZ1bmN0aW9uIHJlamVjdCh2YWx1ZSkgeyByZXN1bWUoXCJ0aHJvd1wiLCB2YWx1ZSk7IH1cclxuICAgIGZ1bmN0aW9uIHNldHRsZShmLCB2KSB7IGlmIChmKHYpLCBxLnNoaWZ0KCksIHEubGVuZ3RoKSByZXN1bWUocVswXVswXSwgcVswXVsxXSk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNEZWxlZ2F0b3Iobykge1xyXG4gICAgdmFyIGksIHA7XHJcbiAgICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIsIGZ1bmN0aW9uIChlKSB7IHRocm93IGU7IH0pLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuLCBmKSB7IGlbbl0gPSBvW25dID8gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIChwID0gIXApID8geyB2YWx1ZTogX19hd2FpdChvW25dKHYpKSwgZG9uZTogZmFsc2UgfSA6IGYgPyBmKHYpIDogdjsgfSA6IGY7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNWYWx1ZXMobykge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBtID0gb1tTeW1ib2wuYXN5bmNJdGVyYXRvcl0sIGk7XHJcbiAgICByZXR1cm4gbSA/IG0uY2FsbChvKSA6IChvID0gdHlwZW9mIF9fdmFsdWVzID09PSBcImZ1bmN0aW9uXCIgPyBfX3ZhbHVlcyhvKSA6IG9bU3ltYm9sLml0ZXJhdG9yXSgpLCBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaSk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgaVtuXSA9IG9bbl0gJiYgZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHsgdiA9IG9bbl0odiksIHNldHRsZShyZXNvbHZlLCByZWplY3QsIHYuZG9uZSwgdi52YWx1ZSk7IH0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCBkLCB2KSB7IFByb21pc2UucmVzb2x2ZSh2KS50aGVuKGZ1bmN0aW9uKHYpIHsgcmVzb2x2ZSh7IHZhbHVlOiB2LCBkb25lOiBkIH0pOyB9LCByZWplY3QpOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX21ha2VUZW1wbGF0ZU9iamVjdChjb29rZWQsIHJhdykge1xyXG4gICAgaWYgKE9iamVjdC5kZWZpbmVQcm9wZXJ0eSkgeyBPYmplY3QuZGVmaW5lUHJvcGVydHkoY29va2VkLCBcInJhd1wiLCB7IHZhbHVlOiByYXcgfSk7IH0gZWxzZSB7IGNvb2tlZC5yYXcgPSByYXc7IH1cclxuICAgIHJldHVybiBjb29rZWQ7XHJcbn07XHJcblxyXG52YXIgX19zZXRNb2R1bGVEZWZhdWx0ID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgXCJkZWZhdWx0XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHYgfSk7XHJcbn0pIDogZnVuY3Rpb24obywgdikge1xyXG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xyXG59O1xyXG5cclxudmFyIG93bktleXMgPSBmdW5jdGlvbihvKSB7XHJcbiAgICBvd25LZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMgfHwgZnVuY3Rpb24gKG8pIHtcclxuICAgICAgICB2YXIgYXIgPSBbXTtcclxuICAgICAgICBmb3IgKHZhciBrIGluIG8pIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobywgaykpIGFyW2FyLmxlbmd0aF0gPSBrO1xyXG4gICAgICAgIHJldHVybiBhcjtcclxuICAgIH07XHJcbiAgICByZXR1cm4gb3duS2V5cyhvKTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydFN0YXIobW9kKSB7XHJcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrID0gb3duS2V5cyhtb2QpLCBpID0gMDsgaSA8IGsubGVuZ3RoOyBpKyspIGlmIChrW2ldICE9PSBcImRlZmF1bHRcIikgX19jcmVhdGVCaW5kaW5nKHJlc3VsdCwgbW9kLCBrW2ldKTtcclxuICAgIF9fc2V0TW9kdWxlRGVmYXVsdChyZXN1bHQsIG1vZCk7XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19pbXBvcnREZWZhdWx0KG1vZCkge1xyXG4gICAgcmV0dXJuIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpID8gbW9kIDogeyBkZWZhdWx0OiBtb2QgfTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRHZXQocmVjZWl2ZXIsIHN0YXRlLCBraW5kLCBmKSB7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJhXCIgJiYgIWYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIGFjY2Vzc29yIHdhcyBkZWZpbmVkIHdpdGhvdXQgYSBnZXR0ZXJcIik7XHJcbiAgICBpZiAodHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciAhPT0gc3RhdGUgfHwgIWYgOiAhc3RhdGUuaGFzKHJlY2VpdmVyKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCByZWFkIHByaXZhdGUgbWVtYmVyIGZyb20gYW4gb2JqZWN0IHdob3NlIGNsYXNzIGRpZCBub3QgZGVjbGFyZSBpdFwiKTtcclxuICAgIHJldHVybiBraW5kID09PSBcIm1cIiA/IGYgOiBraW5kID09PSBcImFcIiA/IGYuY2FsbChyZWNlaXZlcikgOiBmID8gZi52YWx1ZSA6IHN0YXRlLmdldChyZWNlaXZlcik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0KHJlY2VpdmVyLCBzdGF0ZSwgdmFsdWUsIGtpbmQsIGYpIHtcclxuICAgIGlmIChraW5kID09PSBcIm1cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByaXZhdGUgbWV0aG9kIGlzIG5vdCB3cml0YWJsZVwiKTtcclxuICAgIGlmIChraW5kID09PSBcImFcIiAmJiAhZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByaXZhdGUgYWNjZXNzb3Igd2FzIGRlZmluZWQgd2l0aG91dCBhIHNldHRlclwiKTtcclxuICAgIGlmICh0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyICE9PSBzdGF0ZSB8fCAhZiA6ICFzdGF0ZS5oYXMocmVjZWl2ZXIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHdyaXRlIHByaXZhdGUgbWVtYmVyIHRvIGFuIG9iamVjdCB3aG9zZSBjbGFzcyBkaWQgbm90IGRlY2xhcmUgaXRcIik7XHJcbiAgICByZXR1cm4gKGtpbmQgPT09IFwiYVwiID8gZi5jYWxsKHJlY2VpdmVyLCB2YWx1ZSkgOiBmID8gZi52YWx1ZSA9IHZhbHVlIDogc3RhdGUuc2V0KHJlY2VpdmVyLCB2YWx1ZSkpLCB2YWx1ZTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRJbihzdGF0ZSwgcmVjZWl2ZXIpIHtcclxuICAgIGlmIChyZWNlaXZlciA9PT0gbnVsbCB8fCAodHlwZW9mIHJlY2VpdmVyICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiByZWNlaXZlciAhPT0gXCJmdW5jdGlvblwiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCB1c2UgJ2luJyBvcGVyYXRvciBvbiBub24tb2JqZWN0XCIpO1xyXG4gICAgcmV0dXJuIHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgPT09IHN0YXRlIDogc3RhdGUuaGFzKHJlY2VpdmVyKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYWRkRGlzcG9zYWJsZVJlc291cmNlKGVudiwgdmFsdWUsIGFzeW5jKSB7XHJcbiAgICBpZiAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHZvaWQgMCkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHZhbHVlICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJPYmplY3QgZXhwZWN0ZWQuXCIpO1xyXG4gICAgICAgIHZhciBkaXNwb3NlLCBpbm5lcjtcclxuICAgICAgICBpZiAoYXN5bmMpIHtcclxuICAgICAgICAgICAgaWYgKCFTeW1ib2wuYXN5bmNEaXNwb3NlKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jRGlzcG9zZSBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICAgICAgICAgIGRpc3Bvc2UgPSB2YWx1ZVtTeW1ib2wuYXN5bmNEaXNwb3NlXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGRpc3Bvc2UgPT09IHZvaWQgMCkge1xyXG4gICAgICAgICAgICBpZiAoIVN5bWJvbC5kaXNwb3NlKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmRpc3Bvc2UgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgICAgICAgICBkaXNwb3NlID0gdmFsdWVbU3ltYm9sLmRpc3Bvc2VdO1xyXG4gICAgICAgICAgICBpZiAoYXN5bmMpIGlubmVyID0gZGlzcG9zZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHR5cGVvZiBkaXNwb3NlICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJPYmplY3Qgbm90IGRpc3Bvc2FibGUuXCIpO1xyXG4gICAgICAgIGlmIChpbm5lcikgZGlzcG9zZSA9IGZ1bmN0aW9uKCkgeyB0cnkgeyBpbm5lci5jYWxsKHRoaXMpOyB9IGNhdGNoIChlKSB7IHJldHVybiBQcm9taXNlLnJlamVjdChlKTsgfSB9O1xyXG4gICAgICAgIGVudi5zdGFjay5wdXNoKHsgdmFsdWU6IHZhbHVlLCBkaXNwb3NlOiBkaXNwb3NlLCBhc3luYzogYXN5bmMgfSk7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChhc3luYykge1xyXG4gICAgICAgIGVudi5zdGFjay5wdXNoKHsgYXN5bmM6IHRydWUgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcblxyXG59XHJcblxyXG52YXIgX1N1cHByZXNzZWRFcnJvciA9IHR5cGVvZiBTdXBwcmVzc2VkRXJyb3IgPT09IFwiZnVuY3Rpb25cIiA/IFN1cHByZXNzZWRFcnJvciA6IGZ1bmN0aW9uIChlcnJvciwgc3VwcHJlc3NlZCwgbWVzc2FnZSkge1xyXG4gICAgdmFyIGUgPSBuZXcgRXJyb3IobWVzc2FnZSk7XHJcbiAgICByZXR1cm4gZS5uYW1lID0gXCJTdXBwcmVzc2VkRXJyb3JcIiwgZS5lcnJvciA9IGVycm9yLCBlLnN1cHByZXNzZWQgPSBzdXBwcmVzc2VkLCBlO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZGlzcG9zZVJlc291cmNlcyhlbnYpIHtcclxuICAgIGZ1bmN0aW9uIGZhaWwoZSkge1xyXG4gICAgICAgIGVudi5lcnJvciA9IGVudi5oYXNFcnJvciA/IG5ldyBfU3VwcHJlc3NlZEVycm9yKGUsIGVudi5lcnJvciwgXCJBbiBlcnJvciB3YXMgc3VwcHJlc3NlZCBkdXJpbmcgZGlzcG9zYWwuXCIpIDogZTtcclxuICAgICAgICBlbnYuaGFzRXJyb3IgPSB0cnVlO1xyXG4gICAgfVxyXG4gICAgdmFyIHIsIHMgPSAwO1xyXG4gICAgZnVuY3Rpb24gbmV4dCgpIHtcclxuICAgICAgICB3aGlsZSAociA9IGVudi5zdGFjay5wb3AoKSkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyLmFzeW5jICYmIHMgPT09IDEpIHJldHVybiBzID0gMCwgZW52LnN0YWNrLnB1c2gociksIFByb21pc2UucmVzb2x2ZSgpLnRoZW4obmV4dCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoci5kaXNwb3NlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHIuZGlzcG9zZS5jYWxsKHIudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyLmFzeW5jKSByZXR1cm4gcyB8PSAyLCBQcm9taXNlLnJlc29sdmUocmVzdWx0KS50aGVuKG5leHQsIGZ1bmN0aW9uKGUpIHsgZmFpbChlKTsgcmV0dXJuIG5leHQoKTsgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHMgfD0gMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgZmFpbChlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAocyA9PT0gMSkgcmV0dXJuIGVudi5oYXNFcnJvciA/IFByb21pc2UucmVqZWN0KGVudi5lcnJvcikgOiBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgICAgICBpZiAoZW52Lmhhc0Vycm9yKSB0aHJvdyBlbnYuZXJyb3I7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbmV4dCgpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXdyaXRlUmVsYXRpdmVJbXBvcnRFeHRlbnNpb24ocGF0aCwgcHJlc2VydmVKc3gpIHtcclxuICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gXCJzdHJpbmdcIiAmJiAvXlxcLlxcLj9cXC8vLnRlc3QocGF0aCkpIHtcclxuICAgICAgICByZXR1cm4gcGF0aC5yZXBsYWNlKC9cXC4odHN4KSR8KCg/OlxcLmQpPykoKD86XFwuW14uL10rPyk/KVxcLihbY21dPyl0cyQvaSwgZnVuY3Rpb24gKG0sIHRzeCwgZCwgZXh0LCBjbSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHN4ID8gcHJlc2VydmVKc3ggPyBcIi5qc3hcIiA6IFwiLmpzXCIgOiBkICYmICghZXh0IHx8ICFjbSkgPyBtIDogKGQgKyBleHQgKyBcIi5cIiArIGNtLnRvTG93ZXJDYXNlKCkgKyBcImpzXCIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHBhdGg7XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IHtcclxuICAgIF9fZXh0ZW5kczogX19leHRlbmRzLFxyXG4gICAgX19hc3NpZ246IF9fYXNzaWduLFxyXG4gICAgX19yZXN0OiBfX3Jlc3QsXHJcbiAgICBfX2RlY29yYXRlOiBfX2RlY29yYXRlLFxyXG4gICAgX19wYXJhbTogX19wYXJhbSxcclxuICAgIF9fZXNEZWNvcmF0ZTogX19lc0RlY29yYXRlLFxyXG4gICAgX19ydW5Jbml0aWFsaXplcnM6IF9fcnVuSW5pdGlhbGl6ZXJzLFxyXG4gICAgX19wcm9wS2V5OiBfX3Byb3BLZXksXHJcbiAgICBfX3NldEZ1bmN0aW9uTmFtZTogX19zZXRGdW5jdGlvbk5hbWUsXHJcbiAgICBfX21ldGFkYXRhOiBfX21ldGFkYXRhLFxyXG4gICAgX19hd2FpdGVyOiBfX2F3YWl0ZXIsXHJcbiAgICBfX2dlbmVyYXRvcjogX19nZW5lcmF0b3IsXHJcbiAgICBfX2NyZWF0ZUJpbmRpbmc6IF9fY3JlYXRlQmluZGluZyxcclxuICAgIF9fZXhwb3J0U3RhcjogX19leHBvcnRTdGFyLFxyXG4gICAgX192YWx1ZXM6IF9fdmFsdWVzLFxyXG4gICAgX19yZWFkOiBfX3JlYWQsXHJcbiAgICBfX3NwcmVhZDogX19zcHJlYWQsXHJcbiAgICBfX3NwcmVhZEFycmF5czogX19zcHJlYWRBcnJheXMsXHJcbiAgICBfX3NwcmVhZEFycmF5OiBfX3NwcmVhZEFycmF5LFxyXG4gICAgX19hd2FpdDogX19hd2FpdCxcclxuICAgIF9fYXN5bmNHZW5lcmF0b3I6IF9fYXN5bmNHZW5lcmF0b3IsXHJcbiAgICBfX2FzeW5jRGVsZWdhdG9yOiBfX2FzeW5jRGVsZWdhdG9yLFxyXG4gICAgX19hc3luY1ZhbHVlczogX19hc3luY1ZhbHVlcyxcclxuICAgIF9fbWFrZVRlbXBsYXRlT2JqZWN0OiBfX21ha2VUZW1wbGF0ZU9iamVjdCxcclxuICAgIF9faW1wb3J0U3RhcjogX19pbXBvcnRTdGFyLFxyXG4gICAgX19pbXBvcnREZWZhdWx0OiBfX2ltcG9ydERlZmF1bHQsXHJcbiAgICBfX2NsYXNzUHJpdmF0ZUZpZWxkR2V0OiBfX2NsYXNzUHJpdmF0ZUZpZWxkR2V0LFxyXG4gICAgX19jbGFzc1ByaXZhdGVGaWVsZFNldDogX19jbGFzc1ByaXZhdGVGaWVsZFNldCxcclxuICAgIF9fY2xhc3NQcml2YXRlRmllbGRJbjogX19jbGFzc1ByaXZhdGVGaWVsZEluLFxyXG4gICAgX19hZGREaXNwb3NhYmxlUmVzb3VyY2U6IF9fYWRkRGlzcG9zYWJsZVJlc291cmNlLFxyXG4gICAgX19kaXNwb3NlUmVzb3VyY2VzOiBfX2Rpc3Bvc2VSZXNvdXJjZXMsXHJcbiAgICBfX3Jld3JpdGVSZWxhdGl2ZUltcG9ydEV4dGVuc2lvbjogX19yZXdyaXRlUmVsYXRpdmVJbXBvcnRFeHRlbnNpb24sXHJcbn07XHJcbiIsImltcG9ydCB7IE5vdGljZSB9IGZyb20gJ29ic2lkaWFuJztcblxuLy8gRVZFTlQgQlVTIFNZU1RFTVxuZXhwb3J0IGNsYXNzIFRpbnlFbWl0dGVyIHtcbiAgICBwcml2YXRlIGxpc3RlbmVyczogeyBba2V5OiBzdHJpbmddOiBGdW5jdGlvbltdIH0gPSB7fTtcblxuICAgIG9uKGV2ZW50OiBzdHJpbmcsIGZuOiBGdW5jdGlvbikge1xuICAgICAgICAodGhpcy5saXN0ZW5lcnNbZXZlbnRdID0gdGhpcy5saXN0ZW5lcnNbZXZlbnRdIHx8IFtdKS5wdXNoKGZuKTtcbiAgICB9XG5cbiAgICBvZmYoZXZlbnQ6IHN0cmluZywgZm46IEZ1bmN0aW9uKSB7XG4gICAgICAgIGlmICghdGhpcy5saXN0ZW5lcnNbZXZlbnRdKSByZXR1cm47XG4gICAgICAgIHRoaXMubGlzdGVuZXJzW2V2ZW50XSA9IHRoaXMubGlzdGVuZXJzW2V2ZW50XS5maWx0ZXIoZiA9PiBmICE9PSBmbik7XG4gICAgfVxuXG4gICAgdHJpZ2dlcihldmVudDogc3RyaW5nLCBkYXRhPzogYW55KSB7XG4gICAgICAgICh0aGlzLmxpc3RlbmVyc1tldmVudF0gfHwgW10pLmZvckVhY2goZm4gPT4gZm4oZGF0YSkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEF1ZGlvQ29udHJvbGxlciB7XG4gICAgYXVkaW9DdHg6IEF1ZGlvQ29udGV4dCB8IG51bGwgPSBudWxsO1xuICAgIGJyb3duTm9pc2VOb2RlOiBTY3JpcHRQcm9jZXNzb3JOb2RlIHwgbnVsbCA9IG51bGw7XG4gICAgbXV0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAgIGNvbnN0cnVjdG9yKG11dGVkOiBib29sZWFuKSB7IHRoaXMubXV0ZWQgPSBtdXRlZDsgfVxuXG4gICAgc2V0TXV0ZWQobXV0ZWQ6IGJvb2xlYW4pIHsgdGhpcy5tdXRlZCA9IG11dGVkOyB9XG5cbiAgICBpbml0QXVkaW8oKSB7IGlmICghdGhpcy5hdWRpb0N0eCkgdGhpcy5hdWRpb0N0eCA9IG5ldyAod2luZG93LkF1ZGlvQ29udGV4dCB8fCAod2luZG93IGFzIGFueSkud2Via2l0QXVkaW9Db250ZXh0KSgpOyB9XG5cbiAgICBwbGF5VG9uZShmcmVxOiBudW1iZXIsIHR5cGU6IE9zY2lsbGF0b3JUeXBlLCBkdXJhdGlvbjogbnVtYmVyLCB2b2w6IG51bWJlciA9IDAuMSkge1xuICAgICAgICBpZiAodGhpcy5tdXRlZCkgcmV0dXJuO1xuICAgICAgICB0aGlzLmluaXRBdWRpbygpO1xuICAgICAgICBjb25zdCBvc2MgPSB0aGlzLmF1ZGlvQ3R4IS5jcmVhdGVPc2NpbGxhdG9yKCk7XG4gICAgICAgIGNvbnN0IGdhaW4gPSB0aGlzLmF1ZGlvQ3R4IS5jcmVhdGVHYWluKCk7XG4gICAgICAgIG9zYy50eXBlID0gdHlwZTtcbiAgICAgICAgb3NjLmZyZXF1ZW5jeS52YWx1ZSA9IGZyZXE7XG4gICAgICAgIG9zYy5jb25uZWN0KGdhaW4pO1xuICAgICAgICBnYWluLmNvbm5lY3QodGhpcy5hdWRpb0N0eCEuZGVzdGluYXRpb24pO1xuICAgICAgICBvc2Muc3RhcnQoKTtcbiAgICAgICAgZ2Fpbi5nYWluLnNldFZhbHVlQXRUaW1lKHZvbCwgdGhpcy5hdWRpb0N0eCEuY3VycmVudFRpbWUpO1xuICAgICAgICBnYWluLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSgwLjAwMDAxLCB0aGlzLmF1ZGlvQ3R4IS5jdXJyZW50VGltZSArIGR1cmF0aW9uKTtcbiAgICAgICAgb3NjLnN0b3AodGhpcy5hdWRpb0N0eCEuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG4gICAgfVxuXG4gICAgcGxheVNvdW5kKHR5cGU6IFwic3VjY2Vzc1wifFwiZmFpbFwifFwiZGVhdGhcInxcImNsaWNrXCJ8XCJoZWFydGJlYXRcInxcIm1lZGl0YXRlXCIpIHtcbiAgICAgICAgaWYgKHR5cGUgPT09IFwic3VjY2Vzc1wiKSB7IHRoaXMucGxheVRvbmUoNjAwLCBcInNpbmVcIiwgMC4xKTsgc2V0VGltZW91dCgoKSA9PiB0aGlzLnBsYXlUb25lKDgwMCwgXCJzaW5lXCIsIDAuMiksIDEwMCk7IH1cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gXCJmYWlsXCIpIHsgdGhpcy5wbGF5VG9uZSgxNTAsIFwic2F3dG9vdGhcIiwgMC40KTsgc2V0VGltZW91dCgoKSA9PiB0aGlzLnBsYXlUb25lKDEwMCwgXCJzYXd0b290aFwiLCAwLjQpLCAxNTApOyB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFwiZGVhdGhcIikgeyB0aGlzLnBsYXlUb25lKDUwLCBcInNxdWFyZVwiLCAxLjApOyB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFwiY2xpY2tcIikgeyB0aGlzLnBsYXlUb25lKDgwMCwgXCJzaW5lXCIsIDAuMDUpOyB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFwiaGVhcnRiZWF0XCIpIHsgdGhpcy5wbGF5VG9uZSg2MCwgXCJzaW5lXCIsIDAuMSwgMC41KTsgc2V0VGltZW91dCgoKT0+dGhpcy5wbGF5VG9uZSg1MCwgXCJzaW5lXCIsIDAuMSwgMC40KSwgMTUwKTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcIm1lZGl0YXRlXCIpIHsgdGhpcy5wbGF5VG9uZSg0MzIsIFwic2luZVwiLCAyLjAsIDAuMDUpOyB9XG4gICAgfVxuXG4gICAgdG9nZ2xlQnJvd25Ob2lzZSgpIHtcbiAgICAgICAgdGhpcy5pbml0QXVkaW8oKTtcbiAgICAgICAgaWYgKHRoaXMuYnJvd25Ob2lzZU5vZGUpIHsgXG4gICAgICAgICAgICB0aGlzLmJyb3duTm9pc2VOb2RlLmRpc2Nvbm5lY3QoKTsgXG4gICAgICAgICAgICB0aGlzLmJyb3duTm9pc2VOb2RlID0gbnVsbDsgXG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiRm9jdXMgQXVkaW86IE9GRlwiKTsgXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBidWZmZXJTaXplID0gNDA5NjsgXG4gICAgICAgICAgICB0aGlzLmJyb3duTm9pc2VOb2RlID0gdGhpcy5hdWRpb0N0eCEuY3JlYXRlU2NyaXB0UHJvY2Vzc29yKGJ1ZmZlclNpemUsIDEsIDEpO1xuICAgICAgICAgICAgbGV0IGxhc3RPdXQgPSAwO1xuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZS5vbmF1ZGlvcHJvY2VzcyA9IChlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3V0cHV0ID0gZS5vdXRwdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCk7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBidWZmZXJTaXplOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2hpdGUgPSBNYXRoLnJhbmRvbSgpICogMiAtIDE7IFxuICAgICAgICAgICAgICAgICAgICBvdXRwdXRbaV0gPSAobGFzdE91dCArICgwLjAyICogd2hpdGUpKSAvIDEuMDI7IFxuICAgICAgICAgICAgICAgICAgICBsYXN0T3V0ID0gb3V0cHV0W2ldOyBcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0W2ldICo9IDAuMTsgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMuYnJvd25Ob2lzZU5vZGUuY29ubmVjdCh0aGlzLmF1ZGlvQ3R4IS5kZXN0aW5hdGlvbik7XG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiRm9jdXMgQXVkaW86IE9OIChCcm93biBOb2lzZSlcIik7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgeyBBcHAsIE1vZGFsLCBTZXR0aW5nLCBOb3RpY2UsIG1vbWVudCwgVEZpbGUsIFRGb2xkZXIgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgU2lzeXBodXNQbHVnaW4gZnJvbSAnLi4vbWFpbic7IFxuaW1wb3J0IHsgTW9kaWZpZXIgfSBmcm9tICcuLi90eXBlcyc7XG5cbmV4cG9ydCBjbGFzcyBDaGFvc01vZGFsIGV4dGVuZHMgTW9kYWwgeyBcbiAgICBtb2RpZmllcjogTW9kaWZpZXI7IFxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBtOiBNb2RpZmllcikgeyBzdXBlcihhcHApOyB0aGlzLm1vZGlmaWVyPW07IH0gXG4gICAgb25PcGVuKCkgeyBcbiAgICAgICAgY29uc3QgYyA9IHRoaXMuY29udGVudEVsOyBcbiAgICAgICAgY29uc3QgaDEgPSBjLmNyZWF0ZUVsKFwiaDFcIiwgeyB0ZXh0OiBcIlRIRSBPTUVOXCIgfSk7IFxuICAgICAgICBoMS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwidGV4dC1hbGlnbjpjZW50ZXI7IGNvbG9yOiNmNTU7XCIpOyBcbiAgICAgICAgY29uc3QgaWMgPSBjLmNyZWF0ZUVsKFwiZGl2XCIsIHsgdGV4dDogdGhpcy5tb2RpZmllci5pY29uIH0pOyBcbiAgICAgICAgaWMuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcImZvbnQtc2l6ZTo4MHB4OyB0ZXh0LWFsaWduOmNlbnRlcjtcIik7IFxuICAgICAgICBjb25zdCBoMiA9IGMuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IHRoaXMubW9kaWZpZXIubmFtZSB9KTsgXG4gICAgICAgIGgyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJ0ZXh0LWFsaWduOmNlbnRlcjtcIik7IFxuICAgICAgICBjb25zdCBwID0gYy5jcmVhdGVFbChcInBcIiwge3RleHQ6IHRoaXMubW9kaWZpZXIuZGVzY30pOyBcbiAgICAgICAgcC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwidGV4dC1hbGlnbjpjZW50ZXJcIik7IFxuICAgICAgICBjb25zdCBiID0gYy5jcmVhdGVFbChcImJ1dHRvblwiLCB7dGV4dDpcIkFja25vd2xlZGdlXCJ9KTsgXG4gICAgICAgIGIuYWRkQ2xhc3MoXCJtb2QtY3RhXCIpOyBcbiAgICAgICAgYi5zdHlsZS5kaXNwbGF5PVwiYmxvY2tcIjsgXG4gICAgICAgIGIuc3R5bGUubWFyZ2luPVwiMjBweCBhdXRvXCI7IFxuICAgICAgICBiLm9uY2xpY2s9KCk9PnRoaXMuY2xvc2UoKTsgXG4gICAgfSBcbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9IFxufVxuXG5leHBvcnQgY2xhc3MgU2hvcE1vZGFsIGV4dGVuZHMgTW9kYWwgeyBcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luOyBcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikgeyBzdXBlcihhcHApOyB0aGlzLnBsdWdpbiA9IHBsdWdpbjsgfSBcbiAgXG4gIG9uT3BlbigpIHsgXG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzOyBcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIvCfm5IgQkxBQ0sgTUFSS0VUXCIgfSk7IFxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFB1cnNlOiDwn6qZICR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZH1gIH0pOyBcbiAgICAgICAgXG4gICAgICAgIC8vIDEuIFN0YW5kYXJkIEl0ZW1zXG4gICAgICAgIHRoaXMuaXRlbShjb250ZW50RWwsIFwi8J+SiSBTdGltcGFja1wiLCBcIkhlYWwgMjAgSFBcIiwgNTAsIGFzeW5jICgpID0+IHsgXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ocCA9IE1hdGgubWluKHRoaXMucGx1Z2luLnNldHRpbmdzLm1heEhwLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ocCArIDIwKTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgdGhpcy5pdGVtKGNvbnRlbnRFbCwgXCLwn5KjIFNhYm90YWdlXCIsIFwiLTUgUml2YWwgRG1nXCIsIDIwMCwgYXN5bmMgKCkgPT4geyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnJpdmFsRG1nID0gTWF0aC5tYXgoNSwgdGhpcy5wbHVnaW4uc2V0dGluZ3Mucml2YWxEbWcgLSA1KTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgdGhpcy5pdGVtKGNvbnRlbnRFbCwgXCLwn5uh77iPIFNoaWVsZFwiLCBcIjI0aCBQcm90ZWN0aW9uXCIsIDE1MCwgYXN5bmMgKCkgPT4geyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNoaWVsZGVkVW50aWwgPSBtb21lbnQoKS5hZGQoMjQsICdob3VycycpLnRvSVNPU3RyaW5nKCk7IFxuICAgICAgICB9KTsgXG4gICAgICAgIHRoaXMuaXRlbShjb250ZW50RWwsIFwi8J+YtCBSZXN0IERheVwiLCBcIlNhZmUgZm9yIDI0aFwiLCAxMDAsIGFzeW5jICgpID0+IHsgXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXN0RGF5VW50aWwgPSBtb21lbnQoKS5hZGQoMjQsICdob3VycycpLnRvSVNPU3RyaW5nKCk7IFxuICAgICAgICB9KTsgXG5cbiAgICAgICAgLy8gMi4gUG93ZXItVXBzXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCLwn6eqIEFMQ0hFTVlcIiB9KTtcbiAgICAgICAgY29uc3QgYnVmZnMgPSBbXG4gICAgICAgICAgICB7IGlkOiBcImZvY3VzX3BvdGlvblwiLCBuYW1lOiBcIkZvY3VzIFBvdGlvblwiLCBpY29uOiBcIvCfp6pcIiwgZGVzYzogXCIyeCBYUCAoMWgpXCIsIGNvc3Q6IDEwMCwgZHVyYXRpb246IDYwLCBlZmZlY3Q6IHsgeHBNdWx0OiAyIH0gfSxcbiAgICAgICAgICAgIHsgaWQ6IFwibWlkYXNfdG91Y2hcIiwgbmFtZTogXCJNaWRhcyBUb3VjaFwiLCBpY29uOiBcIuKcqFwiLCBkZXNjOiBcIjN4IEdvbGQgKDMwbSlcIiwgY29zdDogMTUwLCBkdXJhdGlvbjogMzAsIGVmZmVjdDogeyBnb2xkTXVsdDogMyB9IH0sXG4gICAgICAgICAgICB7IGlkOiBcImlyb25fd2lsbFwiLCBuYW1lOiBcIklyb24gV2lsbFwiLCBpY29uOiBcIvCfm6HvuI9cIiwgZGVzYzogXCI1MCUgRG1nIFJlZHVjdCAoMmgpXCIsIGNvc3Q6IDIwMCwgZHVyYXRpb246IDEyMCwgZWZmZWN0OiB7IGRhbWFnZU11bHQ6IDAuNSB9IH1cbiAgICAgICAgXTtcblxuICAgICAgICBidWZmcy5mb3JFYWNoKGJ1ZmYgPT4ge1xuICAgICAgICAgICAgIHRoaXMuaXRlbShjb250ZW50RWwsIGAke2J1ZmYuaWNvbn0gJHtidWZmLm5hbWV9YCwgYnVmZi5kZXNjLCBidWZmLmNvc3QsIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmFjdGl2YXRlQnVmZihidWZmKTtcbiAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gIGl0ZW0oZWw6IEhUTUxFbGVtZW50LCBuYW1lOiBzdHJpbmcsIGRlc2M6IHN0cmluZywgYmFzZUNvc3Q6IG51bWJlciwgZWZmZWN0OiAoKSA9PiBQcm9taXNlPHZvaWQ+KSB7IFxuICAgICAgICAvLyBbRklYXSBBcHBseSBJbmZsYXRpb24gTXVsdGlwbGllclxuICAgICAgICBjb25zdCBtdWx0ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGFpbHlNb2RpZmllci5wcmljZU11bHQgfHwgMTtcbiAgICAgICAgY29uc3QgcmVhbENvc3QgPSBNYXRoLmNlaWwoYmFzZUNvc3QgKiBtdWx0KTtcblxuICAgICAgICBjb25zdCBjID0gZWwuY3JlYXRlRGl2KCk7IFxuICAgICAgICBjLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTpmbGV4OyBqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjsgcGFkZGluZzoxMHB4IDA7IGJvcmRlci1ib3R0b206MXB4IHNvbGlkICMzMzM7XCIpOyBcbiAgICAgICAgY29uc3QgaSA9IGMuY3JlYXRlRGl2KCk7IFxuICAgICAgICBpLmNyZWF0ZUVsKFwiYlwiLCB7IHRleHQ6IG5hbWUgfSk7IFxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBpbmZsYXRlZCBwcmljZSB3YXJuaW5nIGlmIGFwcGxpY2FibGVcbiAgICAgICAgaWYgKG11bHQgPiAxKSB7XG4gICAgICAgICAgICBpLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IGAgKPCfk4ggSW5mOiAke211bHR9eClgLCBhdHRyOiB7IHN0eWxlOiBcImNvbG9yOiByZWQ7IGZvbnQtc2l6ZTogMC44ZW07XCIgfSB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGkuY3JlYXRlRWwoXCJkaXZcIiwgeyB0ZXh0OiBkZXNjIH0pOyBcbiAgICAgICAgY29uc3QgYiA9IGMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBgJHtyZWFsQ29zdH0gR2AgfSk7IFxuICAgICAgICBcbiAgICAgICAgaWYodGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZCA8IHJlYWxDb3N0KSB7IFxuICAgICAgICAgICAgYi5zZXRBdHRyaWJ1dGUoXCJkaXNhYmxlZFwiLFwidHJ1ZVwiKTsgYi5zdHlsZS5vcGFjaXR5PVwiMC41XCI7IFxuICAgICAgICB9IGVsc2UgeyBcbiAgICAgICAgICAgIGIuYWRkQ2xhc3MoXCJtb2QtY3RhXCIpOyBcbiAgICAgICAgICAgIGIub25jbGljayA9IGFzeW5jICgpID0+IHsgXG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZCAtPSByZWFsQ29zdDsgXG4gICAgICAgICAgICAgICAgYXdhaXQgZWZmZWN0KCk7IFxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5zYXZlKCk7IFxuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYEJvdWdodCAke25hbWV9IGZvciAke3JlYWxDb3N0fWdgKTsgXG4gICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpOyBcbiAgICAgICAgICAgICAgICBuZXcgU2hvcE1vZGFsKHRoaXMuYXBwLHRoaXMucGx1Z2luKS5vcGVuKCk7IFxuICAgICAgICAgICAgfVxuICAgICAgICB9IFxuICAgIH0gXG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfSBcbn1cblxuLy8gLi4uIChRdWVzdE1vZGFsLCBTa2lsbE1hbmFnZXJNb2RhbCwgZXRjLiByZW1haW4gdW5jaGFuZ2VkIGZyb20gcHJldmlvdXMgdmVyc2lvbnMsIGluY2x1ZGVkIGhlcmUgZm9yIGNvbXBsZXRlbmVzcyBvZiBmaWxlIGlmIHlvdSByZXBsYWNlIGVudGlyZWx5LCBidXQgYXNzdW1pbmcgeW91IG1lcmdlIG9yIEkgcHJvdmlkZSBvbmx5IENoYW5nZWQgY2xhc3Nlcy4gU2luY2UgeW91IGFza2VkIGZvciBmaWxlcywgSSB3aWxsIGluY2x1ZGUgUXVlc3RNb2RhbCBldGMgYmVsb3cpXG5cbmV4cG9ydCBjbGFzcyBRdWVzdE1vZGFsIGV4dGVuZHMgTW9kYWwgeyBcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luOyBcbiAgICBuYW1lOiBzdHJpbmc7IGRpZmZpY3VsdHk6IG51bWJlciA9IDM7IHNraWxsOiBzdHJpbmcgPSBcIk5vbmVcIjsgc2VjU2tpbGw6IHN0cmluZyA9IFwiTm9uZVwiOyBkZWFkbGluZTogc3RyaW5nID0gXCJcIjsgaGlnaFN0YWtlczogYm9vbGVhbiA9IGZhbHNlOyBpc0Jvc3M6IGJvb2xlYW4gPSBmYWxzZTsgXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHsgc3VwZXIoYXBwKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH0gXG4gICAgb25PcGVuKCkgeyBcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7IFxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwi4pqU77iPIERFUExPWU1FTlRcIiB9KTsgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIk9iamVjdGl2ZVwiKS5hZGRUZXh0KHQgPT4geyB0Lm9uQ2hhbmdlKHYgPT4gdGhpcy5uYW1lID0gdik7IHNldFRpbWVvdXQoKCkgPT4gdC5pbnB1dEVsLmZvY3VzKCksIDUwKTsgfSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIkRpZmZpY3VsdHlcIikuYWRkRHJvcGRvd24oZCA9PiBkLmFkZE9wdGlvbihcIjFcIixcIlRyaXZpYWxcIikuYWRkT3B0aW9uKFwiMlwiLFwiRWFzeVwiKS5hZGRPcHRpb24oXCIzXCIsXCJNZWRpdW1cIikuYWRkT3B0aW9uKFwiNFwiLFwiSGFyZFwiKS5hZGRPcHRpb24oXCI1XCIsXCJTVUlDSURFXCIpLnNldFZhbHVlKFwiM1wiKS5vbkNoYW5nZSh2PT50aGlzLmRpZmZpY3VsdHk9cGFyc2VJbnQodikpKTsgXG4gICAgICAgIGNvbnN0IHNraWxsczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsgXCJOb25lXCI6IFwiTm9uZVwiIH07IFxuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5za2lsbHMuZm9yRWFjaChzID0+IHNraWxsc1tzLm5hbWVdID0gcy5uYW1lKTsgXG4gICAgICAgIHNraWxsc1tcIisgTmV3XCJdID0gXCIrIE5ld1wiOyBcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiUHJpbWFyeSBOb2RlXCIpLmFkZERyb3Bkb3duKGQgPT4gZC5hZGRPcHRpb25zKHNraWxscykub25DaGFuZ2UodiA9PiB7IGlmKHY9PT1cIisgTmV3XCIpeyB0aGlzLmNsb3NlKCk7IG5ldyBTa2lsbE1hbmFnZXJNb2RhbCh0aGlzLmFwcCx0aGlzLnBsdWdpbikub3BlbigpOyB9IGVsc2UgdGhpcy5za2lsbD12OyB9KSk7IFxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJTeW5lcmd5IE5vZGVcIikuYWRkRHJvcGRvd24oZCA9PiBkLmFkZE9wdGlvbnMoc2tpbGxzKS5zZXRWYWx1ZShcIk5vbmVcIikub25DaGFuZ2UodiA9PiB0aGlzLnNlY1NraWxsID0gdikpO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJEZWFkbGluZVwiKS5hZGRUZXh0KHQgPT4geyB0LmlucHV0RWwudHlwZSA9IFwiZGF0ZXRpbWUtbG9jYWxcIjsgdC5vbkNoYW5nZSh2ID0+IHRoaXMuZGVhZGxpbmUgPSB2KTsgfSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIkhpZ2ggU3Rha2VzXCIpLnNldERlc2MoXCJEb3VibGUgR29sZCAvIERvdWJsZSBEYW1hZ2VcIikuYWRkVG9nZ2xlKHQ9PnQuc2V0VmFsdWUoZmFsc2UpLm9uQ2hhbmdlKHY9PnRoaXMuaGlnaFN0YWtlcz12KSk7IFxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLmFkZEJ1dHRvbihiID0+IGIuc2V0QnV0dG9uVGV4dChcIkRlcGxveVwiKS5zZXRDdGEoKS5vbkNsaWNrKCgpID0+IHsgaWYodGhpcy5uYW1lKXsgdGhpcy5wbHVnaW4uZW5naW5lLmNyZWF0ZVF1ZXN0KHRoaXMubmFtZSx0aGlzLmRpZmZpY3VsdHksdGhpcy5za2lsbCx0aGlzLnNlY1NraWxsLHRoaXMuZGVhZGxpbmUsdGhpcy5oaWdoU3Rha2VzLCBcIk5vcm1hbFwiLCB0aGlzLmlzQm9zcyk7IHRoaXMuY2xvc2UoKTsgfSB9KSk7IFxuICAgIH0gXG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfSBcbn1cblxuZXhwb3J0IGNsYXNzIFNraWxsTWFuYWdlck1vZGFsIGV4dGVuZHMgTW9kYWwgeyBcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luOyBcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikgeyBzdXBlcihhcHApOyB0aGlzLnBsdWdpbiA9IHBsdWdpbjsgfSBcbiAgICBvbk9wZW4oKSB7IFxuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpczsgXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJBZGQgTmV3IE5vZGVcIiB9KTsgXG4gICAgICAgIGxldCBuPVwiXCI7IFxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJOb2RlIE5hbWVcIikuYWRkVGV4dCh0PT50Lm9uQ2hhbmdlKHY9Pm49dikpLmFkZEJ1dHRvbihiPT5iLnNldEJ1dHRvblRleHQoXCJDcmVhdGVcIikuc2V0Q3RhKCkub25DbGljayhhc3luYygpPT57XG4gICAgICAgICAgICBpZihuKXsgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2tpbGxzLnB1c2goe25hbWU6bixsZXZlbDoxLHhwOjAseHBSZXE6NSxsYXN0VXNlZDpuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkscnVzdDowLGNvbm5lY3Rpb25zOltdfSk7IGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5zYXZlKCk7IHRoaXMuY2xvc2UoKTsgfVxuICAgICAgICB9KSk7IFxuICAgIH0gXG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfSBcbn1cblxuZXhwb3J0IGNsYXNzIFNraWxsRGV0YWlsTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjsgaW5kZXg6IG51bWJlcjtcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbiwgaW5kZXg6IG51bWJlcikgeyBzdXBlcihhcHApOyB0aGlzLnBsdWdpbj1wbHVnaW47IHRoaXMuaW5kZXg9aW5kZXg7IH1cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgICAgICBjb25zdCBzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2tpbGxzW3RoaXMuaW5kZXhdO1xuICAgICAgICBpZiAoIXMpIHsgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiU2tpbGwgbm90IGZvdW5kLlwiIH0pOyByZXR1cm47IH1cbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBgTm9kZTogJHtzLm5hbWV9YCB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiTmFtZVwiKS5hZGRUZXh0KHQ9PnQuc2V0VmFsdWUocy5uYW1lKS5vbkNoYW5nZSh2PT5zLm5hbWU9dikpO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJSdXN0IFN0YXR1c1wiKS5zZXREZXNjKGBTdGFja3M6ICR7cy5ydXN0fWApLmFkZEJ1dHRvbihiPT5iLnNldEJ1dHRvblRleHQoXCJNYW51YWwgUG9saXNoXCIpLm9uQ2xpY2soYXN5bmMoKT0+eyBzLnJ1c3Q9MDsgcy54cFJlcT1NYXRoLmZsb29yKHMueHBSZXEvMS4xKTsgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLnNhdmUoKTsgdGhpcy5jbG9zZSgpOyBuZXcgTm90aWNlKFwiUnVzdCBwb2xpc2hlZC5cIik7IH0pKTtcbiAgICAgICAgY29uc3QgZGl2ID0gY29udGVudEVsLmNyZWF0ZURpdigpOyBkaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW4tdG9wOjIwcHg7IGRpc3BsYXk6ZmxleDsganVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47XCIpO1xuICAgICAgICBjb25zdCBiU2F2ZSA9IGRpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7dGV4dDpcIlNhdmVcIn0pOyBiU2F2ZS5hZGRDbGFzcyhcIm1vZC1jdGFcIik7IGJTYXZlLm9uY2xpY2s9YXN5bmMoKT0+eyBhd2FpdCB0aGlzLnBsdWdpbi5lbmdpbmUuc2F2ZSgpOyB0aGlzLmNsb3NlKCk7IH07XG4gICAgICAgIGNvbnN0IGJEZWwgPSBkaXYuY3JlYXRlRWwoXCJidXR0b25cIiwge3RleHQ6XCJEZWxldGUgTm9kZVwifSk7IGJEZWwuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcImNvbG9yOnJlZDtcIik7IGJEZWwub25jbGljaz1hc3luYygpPT57IHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5zcGxpY2UodGhpcy5pbmRleCwgMSk7IGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5zYXZlKCk7IHRoaXMuY2xvc2UoKTsgfTtcbiAgICB9XG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfVxufVxuXG5leHBvcnQgY2xhc3MgUXVpY2tDYXB0dXJlTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjtcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikgeyBzdXBlcihhcHApOyB0aGlzLnBsdWdpbiA9IHBsdWdpbjsgfVxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCLimqEgUXVpY2sgQ2FwdHVyZVwiIH0pO1xuICAgICAgICBjb25zdCBkaXYgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gZGl2LmNyZWF0ZUVsKFwiaW5wdXRcIiwgeyB0eXBlOiBcInRleHRcIiwgYXR0cjogeyBwbGFjZWhvbGRlcjogXCJXaGF0J3Mgb24geW91ciBtaW5kP1wiLCBzdHlsZTogXCJ3aWR0aDogMTAwJTsgcGFkZGluZzogMTBweDsgZm9udC1zaXplOiAxLjJlbTsgYmFja2dyb3VuZDogIzIyMjsgYm9yZGVyOiAxcHggc29saWQgIzQ0NDsgY29sb3I6ICNlMGUwZTA7XCIgfSB9KTtcbiAgICAgICAgaW5wdXQuZm9jdXMoKTtcbiAgICAgICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIGFzeW5jIChlKSA9PiB7IGlmIChlLmtleSA9PT0gXCJFbnRlclwiICYmIGlucHV0LnZhbHVlLnRyaW0oKS5sZW5ndGggPiAwKSB7IGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5jcmVhdGVTY3JhcChpbnB1dC52YWx1ZSk7IHRoaXMuY2xvc2UoKTsgfSB9KTtcbiAgICAgICAgY29uc3QgYnRuID0gY29udGVudEVsLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDYXB0dXJlIHRvIFNjcmFwc1wiIH0pO1xuICAgICAgICBidG4uYWRkQ2xhc3MoXCJtb2QtY3RhXCIpO1xuICAgICAgICBidG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW4tdG9wOiAxNXB4OyB3aWR0aDogMTAwJTtcIik7XG4gICAgICAgIGJ0bi5vbmNsaWNrID0gYXN5bmMgKCkgPT4geyBpZiAoaW5wdXQudmFsdWUudHJpbSgpLmxlbmd0aCA+IDApIHsgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLmNyZWF0ZVNjcmFwKGlucHV0LnZhbHVlKTsgdGhpcy5jbG9zZSgpOyB9IH07XG4gICAgfVxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH1cbn1cblxuZXhwb3J0IGNsYXNzIFF1ZXN0VGVtcGxhdGVNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9XG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIuKaoSBRdWljayBEZXBsb3kgVGVtcGxhdGVzXCIgfSk7XG4gICAgICAgIGNvbnN0IGdyaWQgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7XG4gICAgICAgIGdyaWQuc3R5bGUuZGlzcGxheSA9IFwiZ3JpZFwiOyBncmlkLnN0eWxlLmdyaWRUZW1wbGF0ZUNvbHVtbnMgPSBcIjFmciAxZnJcIjsgZ3JpZC5zdHlsZS5nYXAgPSBcIjEwcHhcIjtcbiAgICAgICAgY29uc3QgdGVtcGxhdGVzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucXVlc3RUZW1wbGF0ZXMgfHwgW107XG4gICAgICAgIGlmICh0ZW1wbGF0ZXMubGVuZ3RoID09PSAwKSBncmlkLmNyZWF0ZURpdih7IHRleHQ6IFwiTm8gdGVtcGxhdGVzIGZvdW5kLiBDcmVhdGUgb25lIGluIFNldHRpbmdzLlwiIH0pO1xuICAgICAgICB0ZW1wbGF0ZXMuZm9yRWFjaCh0ZW1wbGF0ZSA9PiB7XG4gICAgICAgICAgICBjb25zdCBidG4gPSBncmlkLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogdGVtcGxhdGUubmFtZSB9KTtcbiAgICAgICAgICAgIGJ0bi5hZGRDbGFzcyhcInNpc3ktYnRuXCIpOyBidG4uc3R5bGUudGV4dEFsaWduID0gXCJsZWZ0XCI7IGJ0bi5zdHlsZS5wYWRkaW5nID0gXCIxNXB4XCI7XG4gICAgICAgICAgICBidG4uY3JlYXRlRGl2KHsgdGV4dDogYERpZmY6ICR7dGVtcGxhdGUuZGlmZn0gfCBTa2lsbDogJHt0ZW1wbGF0ZS5za2lsbH1gLCBhdHRyOiB7IHN0eWxlOiBcImZvbnQtc2l6ZTogMC44ZW07IG9wYWNpdHk6IDAuNzsgbWFyZ2luLXRvcDogNXB4O1wiIH0gfSk7XG4gICAgICAgICAgICBidG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgZGVhZGxpbmUgPSBcIlwiO1xuICAgICAgICAgICAgICAgIGlmICh0ZW1wbGF0ZS5kZWFkbGluZS5zdGFydHNXaXRoKFwiK1wiKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByYXcgPSB0ZW1wbGF0ZS5kZWFkbGluZS5yZXBsYWNlKC9eXFwrXFxzKi8sIFwiXCIpLnJlcGxhY2UoL1xccypoKG91cik/cz8kL2ksIFwiXCIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBob3VycyA9IHBhcnNlSW50KHJhdywgMTApO1xuICAgICAgICAgICAgICAgICAgICBkZWFkbGluZSA9IGlzTmFOKGhvdXJzKSB8fCBob3VycyA8IDBcbiAgICAgICAgICAgICAgICAgICAgICAgID8gbW9tZW50KCkuYWRkKDI0LCAnaG91cnMnKS50b0lTT1N0cmluZygpXG4gICAgICAgICAgICAgICAgICAgICAgICA6IG1vbWVudCgpLmFkZChob3VycywgJ2hvdXJzJykudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRlbXBsYXRlLmRlYWRsaW5lLmluY2x1ZGVzKFwiOlwiKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBbaCwgbV0gPSB0ZW1wbGF0ZS5kZWFkbGluZS5zcGxpdChcIjpcIik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGhvdXIgPSBwYXJzZUludChoLCAxMCkgfHwgMDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWludXRlID0gcGFyc2VJbnQobSwgMTApIHx8IDA7XG4gICAgICAgICAgICAgICAgICAgIGRlYWRsaW5lID0gbW9tZW50KCkuc2V0KHsgaG91ciwgbWludXRlIH0pLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtb21lbnQoKS5pc0FmdGVyKGRlYWRsaW5lKSkgZGVhZGxpbmUgPSBtb21lbnQoZGVhZGxpbmUpLmFkZCgxLCAnZGF5JykudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkZWFkbGluZSA9IG1vbWVudCgpLmFkZCgyNCwgJ2hvdXJzJykudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmNyZWF0ZVF1ZXN0KHRlbXBsYXRlLm5hbWUsIHRlbXBsYXRlLmRpZmYsIHRlbXBsYXRlLnNraWxsLCBcIk5vbmVcIiwgZGVhZGxpbmUsIGZhbHNlLCBcIk5vcm1hbFwiLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShgRGVwbG95ZWQ6ICR7dGVtcGxhdGUubmFtZX1gKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfVxufVxuXG5leHBvcnQgY2xhc3MgUmVzZWFyY2hRdWVzdE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47IHRpdGxlOiBzdHJpbmcgPSBcIlwiOyB0eXBlOiBcInN1cnZleVwiIHwgXCJkZWVwX2RpdmVcIiA9IFwic3VydmV5XCI7IGxpbmtlZFNraWxsOiBzdHJpbmcgPSBcIk5vbmVcIjsgbGlua2VkQ29tYmF0UXVlc3Q6IHN0cmluZyA9IFwiTm9uZVwiO1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9XG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpczsgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIlJFU0VBUkNIIERFUExPWU1FTlRcIiB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiUmVzZWFyY2ggVGl0bGVcIikuYWRkVGV4dCh0ID0+IHsgdC5vbkNoYW5nZSh2ID0+IHRoaXMudGl0bGUgPSB2KTsgc2V0VGltZW91dCgoKSA9PiB0LmlucHV0RWwuZm9jdXMoKSwgNTApOyB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiUmVzZWFyY2ggVHlwZVwiKS5hZGREcm9wZG93bihkID0+IGQuYWRkT3B0aW9uKFwic3VydmV5XCIsIFwiU3VydmV5ICgxMDAtMjAwIHdvcmRzKVwiKS5hZGRPcHRpb24oXCJkZWVwX2RpdmVcIiwgXCJEZWVwIERpdmUgKDIwMC00MDAgd29yZHMpXCIpLnNldFZhbHVlKFwic3VydmV5XCIpLm9uQ2hhbmdlKHYgPT4gdGhpcy50eXBlID0gdiBhcyBcInN1cnZleVwiIHwgXCJkZWVwX2RpdmVcIikpO1xuICAgICAgICBjb25zdCBza2lsbHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7IFwiTm9uZVwiOiBcIk5vbmVcIiB9OyB0aGlzLnBsdWdpbi5zZXR0aW5ncy5za2lsbHMuZm9yRWFjaChzID0+IHNraWxsc1tzLm5hbWVdID0gcy5uYW1lKTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiTGlua2VkIFNraWxsXCIpLmFkZERyb3Bkb3duKGQgPT4gZC5hZGRPcHRpb25zKHNraWxscykuc2V0VmFsdWUoXCJOb25lXCIpLm9uQ2hhbmdlKHYgPT4gdGhpcy5saW5rZWRTa2lsbCA9IHYpKTtcbiAgICAgICAgY29uc3QgY29tYmF0UXVlc3RzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyBcIk5vbmVcIjogXCJOb25lXCIgfTtcbiAgICAgICAgY29uc3QgcXVlc3RGb2xkZXIgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJBY3RpdmVfUnVuL1F1ZXN0c1wiKTtcbiAgICAgICAgaWYgKHF1ZXN0Rm9sZGVyIGluc3RhbmNlb2YgVEZvbGRlcikgeyBxdWVzdEZvbGRlci5jaGlsZHJlbi5mb3JFYWNoKGYgPT4geyBpZiAoZiBpbnN0YW5jZW9mIFRGaWxlICYmIGYuZXh0ZW5zaW9uID09PSBcIm1kXCIpIGNvbWJhdFF1ZXN0c1tmLmJhc2VuYW1lXSA9IGYuYmFzZW5hbWU7IH0pOyB9XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIkxpbmsgQ29tYmF0IFF1ZXN0XCIpLmFkZERyb3Bkb3duKGQgPT4gZC5hZGRPcHRpb25zKGNvbWJhdFF1ZXN0cykuc2V0VmFsdWUoXCJOb25lXCIpLm9uQ2hhbmdlKHYgPT4gdGhpcy5saW5rZWRDb21iYXRRdWVzdCA9IHYpKTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5hZGRCdXR0b24oYiA9PiBiLnNldEJ1dHRvblRleHQoXCJDUkVBVEUgUkVTRUFSQ0hcIikuc2V0Q3RhKCkub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRoaXMudGl0bGUpIHJldHVybjtcbiAgICAgICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5jcmVhdGVSZXNlYXJjaFF1ZXN0KHRoaXMudGl0bGUsIHRoaXMudHlwZSwgdGhpcy5saW5rZWRTa2lsbCwgdGhpcy5saW5rZWRDb21iYXRRdWVzdCk7XG4gICAgICAgICAgICBpZiAocmVzLnN1Y2Nlc3MpIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgfSkpO1xuICAgIH1cbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZXNlYXJjaExpc3RNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9XG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpczsgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIlJFU0VBUkNIIExJQlJBUllcIiB9KTtcbiAgICAgICAgY29uc3Qgc3RhdHMgPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0UmVzZWFyY2hSYXRpbygpO1xuICAgICAgICBjb25zdCBzdGF0c0VsID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXJlc2VhcmNoLXN0YXRzXCIgfSk7IHN0YXRzRWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYENvbWJhdCBRdWVzdHM6ICR7c3RhdHMuY29tYmF0fWAgfSk7IHN0YXRzRWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFJlc2VhcmNoIFF1ZXN0czogJHtzdGF0cy5yZXNlYXJjaH1gIH0pOyBzdGF0c0VsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBSYXRpbzogJHtzdGF0cy5yYXRpb306MWAgfSk7XG4gICAgICAgIGlmICghdGhpcy5wbHVnaW4uZW5naW5lLmNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKSkgeyBjb25zdCB3YXJuaW5nID0gY29udGVudEVsLmNyZWF0ZURpdigpOyB3YXJuaW5nLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiY29sb3I6IG9yYW5nZTsgZm9udC13ZWlnaHQ6IGJvbGQ7IG1hcmdpbjogMTBweCAwO1wiKTsgd2FybmluZy5zZXRUZXh0KFwiUkVTRUFSQ0ggQkxPQ0tFRDogTmVlZCAyOjEgY29tYmF0IHRvIHJlc2VhcmNoIHJhdGlvXCIpOyB9XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJBY3RpdmUgUmVzZWFyY2hcIiB9KTtcbiAgICAgICAgY29uc3QgcXVlc3RzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuZmlsdGVyKHEgPT4gIXEuY29tcGxldGVkKTtcbiAgICAgICAgaWYgKHF1ZXN0cy5sZW5ndGggPT09IDApIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk5vIGFjdGl2ZSByZXNlYXJjaCBxdWVzdHMuXCIgfSk7XG4gICAgICAgIGVsc2UgcXVlc3RzLmZvckVhY2goKHE6IGFueSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2FyZCA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1yZXNlYXJjaC1jYXJkXCIgfSk7IGNhcmQuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJib3JkZXI6IDFweCBzb2xpZCAjNDQ0OyBwYWRkaW5nOiAxMHB4OyBtYXJnaW46IDVweCAwOyBib3JkZXItcmFkaXVzOiA0cHg7XCIpO1xuICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gY2FyZC5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogcS50aXRsZSB9KTsgaGVhZGVyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAwIDAgNXB4IDA7XCIpO1xuICAgICAgICAgICAgY29uc3QgaW5mbyA9IGNhcmQuY3JlYXRlRWwoXCJkaXZcIik7IGluZm8uaW5uZXJIVE1MID0gYDxjb2RlIHN0eWxlPVwiY29sb3I6I2FhNjRmZlwiPiR7cS5pZH08L2NvZGU+PGJyPlR5cGU6ICR7cS50eXBlID09PSBcInN1cnZleVwiID8gXCJTdXJ2ZXlcIiA6IFwiRGVlcCBEaXZlXCJ9IHwgV29yZHM6ICR7cS53b3JkQ291bnR9LyR7cS53b3JkTGltaXR9YDsgaW5mby5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZvbnQtc2l6ZTogMC45ZW07IG9wYWNpdHk6IDAuODtcIik7XG4gICAgICAgICAgICBjb25zdCBhY3Rpb25zID0gY2FyZC5jcmVhdGVEaXYoKTsgYWN0aW9ucy5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbi10b3A6IDhweDsgZGlzcGxheTogZmxleDsgZ2FwOiA1cHg7XCIpO1xuICAgICAgICAgICAgY29uc3QgY29tcGxldGVCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDT01QTEVURVwiIH0pOyBjb21wbGV0ZUJ0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZsZXg6IDE7IHBhZGRpbmc6IDVweDsgYmFja2dyb3VuZDogZ3JlZW47IGNvbG9yOiB3aGl0ZTsgYm9yZGVyOiBub25lOyBib3JkZXItcmFkaXVzOiAzcHg7IGN1cnNvcjogcG9pbnRlcjtcIik7IGNvbXBsZXRlQnRuLm9uY2xpY2sgPSAoKSA9PiB7IHRoaXMucGx1Z2luLmVuZ2luZS5jb21wbGV0ZVJlc2VhcmNoUXVlc3QocS5pZCwgcS53b3JkQ291bnQpOyB0aGlzLmNsb3NlKCk7IH07XG4gICAgICAgICAgICBjb25zdCBkZWxldGVCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJERUxFVEVcIiB9KTsgZGVsZXRlQnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZmxleDogMTsgcGFkZGluZzogNXB4OyBiYWNrZ3JvdW5kOiByZWQ7IGNvbG9yOiB3aGl0ZTsgYm9yZGVyOiBub25lOyBib3JkZXItcmFkaXVzOiAzcHg7IGN1cnNvcjogcG9pbnRlcjtcIik7IGRlbGV0ZUJ0bi5vbmNsaWNrID0gYXN5bmMgKCkgPT4geyBhd2FpdCB0aGlzLnBsdWdpbi5lbmdpbmUuZGVsZXRlUmVzZWFyY2hRdWVzdChxLmlkKTsgdGhpcy5jbG9zZSgpOyB9O1xuICAgICAgICB9KTtcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkNvbXBsZXRlZCBSZXNlYXJjaFwiIH0pO1xuICAgICAgICBjb25zdCBjb21wbGV0ZWQgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maWx0ZXIocSA9PiBxLmNvbXBsZXRlZCk7XG4gICAgICAgIGlmIChjb21wbGV0ZWQubGVuZ3RoID09PSAwKSBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJObyBjb21wbGV0ZWQgcmVzZWFyY2guXCIgfSk7XG4gICAgICAgIGVsc2UgY29tcGxldGVkLmZvckVhY2goKHE6IGFueSkgPT4geyBjb25zdCBpdGVtID0gY29udGVudEVsLmNyZWF0ZUVsKFwicFwiKTsgaXRlbS5zZXRUZXh0KGArICR7cS50aXRsZX0gKCR7cS50eXBlID09PSBcInN1cnZleVwiID8gXCJTdXJ2ZXlcIiA6IFwiRGVlcCBEaXZlXCJ9KWApOyBpdGVtLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwib3BhY2l0eTogMC42OyBmb250LXNpemU6IDAuOWVtO1wiKTsgfSk7XG4gICAgfVxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH1cbn1cblxuZXhwb3J0IGNsYXNzIENoYWluQnVpbGRlck1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47IGNoYWluTmFtZTogc3RyaW5nID0gXCJcIjsgc2VsZWN0ZWRRdWVzdHM6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHsgc3VwZXIoYXBwKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH1cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzOyBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiQ0hBSU4gQlVJTERFUlwiIH0pO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJDaGFpbiBOYW1lXCIpLmFkZFRleHQodCA9PiB7IHQub25DaGFuZ2UodiA9PiB0aGlzLmNoYWluTmFtZSA9IHYpOyBzZXRUaW1lb3V0KCgpID0+IHQuaW5wdXRFbC5mb2N1cygpLCA1MCk7IH0pO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiU2VsZWN0IFF1ZXN0c1wiIH0pO1xuICAgICAgICBjb25zdCBxdWVzdEZvbGRlciA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChcIkFjdGl2ZV9SdW4vUXVlc3RzXCIpO1xuICAgICAgICBjb25zdCBxdWVzdHM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGlmIChxdWVzdEZvbGRlciBpbnN0YW5jZW9mIFRGb2xkZXIpIHsgcXVlc3RGb2xkZXIuY2hpbGRyZW4uZm9yRWFjaChmID0+IHsgaWYgKGYgaW5zdGFuY2VvZiBURmlsZSAmJiBmLmV4dGVuc2lvbiA9PT0gXCJtZFwiKSBxdWVzdHMucHVzaChmLmJhc2VuYW1lKTsgfSk7IH1cbiAgICAgICAgcXVlc3RzLmZvckVhY2goKHF1ZXN0LCBpZHgpID0+IHsgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKHF1ZXN0KS5hZGRUb2dnbGUodCA9PiB0Lm9uQ2hhbmdlKHYgPT4geyBpZiAodikgdGhpcy5zZWxlY3RlZFF1ZXN0cy5wdXNoKHF1ZXN0KTsgZWxzZSB0aGlzLnNlbGVjdGVkUXVlc3RzID0gdGhpcy5zZWxlY3RlZFF1ZXN0cy5maWx0ZXIocSA9PiBxICE9PSBxdWVzdCk7IH0pKTsgfSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuYWRkQnV0dG9uKGIgPT4gYi5zZXRCdXR0b25UZXh0KFwiQ1JFQVRFIENIQUlOXCIpLnNldEN0YSgpLm9uQ2xpY2soYXN5bmMgKCkgPT4geyBpZiAodGhpcy5jaGFpbk5hbWUgJiYgdGhpcy5zZWxlY3RlZFF1ZXN0cy5sZW5ndGggPj0gMikgeyBhd2FpdCB0aGlzLnBsdWdpbi5lbmdpbmUuY3JlYXRlUXVlc3RDaGFpbih0aGlzLmNoYWluTmFtZSwgdGhpcy5zZWxlY3RlZFF1ZXN0cyk7IHRoaXMuY2xvc2UoKTsgfSBlbHNlIG5ldyBOb3RpY2UoXCJDaGFpbiBuZWVkcyBhIG5hbWUgYW5kIGF0IGxlYXN0IDIgcXVlc3RzXCIpOyB9KSk7XG4gICAgfVxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH1cbn1cblxuZXhwb3J0IGNsYXNzIFZpY3RvcnlNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9XG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpczsgY29udGVudEVsLmFkZENsYXNzKFwic2lzeS12aWN0b3J5LW1vZGFsXCIpO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMVwiLCB7IHRleHQ6IFwiQVNDRU5TSU9OIEFDSElFVkVEXCIsIGNsczogXCJzaXN5LXZpY3RvcnktdGl0bGVcIiB9KTtcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiZGl2XCIsIHsgdGV4dDogXCLwn4+GXCIsIGF0dHI6IHsgc3R5bGU6IFwiZm9udC1zaXplOiA2MHB4OyBtYXJnaW46IDIwcHggMDtcIiB9IH0pO1xuICAgICAgICBjb25zdCBzdGF0cyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoKTsgY29uc3QgbGVnYWN5ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MubGVnYWN5OyBjb25zdCBtZXRyaWNzID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldEdhbWVTdGF0cygpO1xuICAgICAgICB0aGlzLnN0YXRMaW5lKHN0YXRzLCBcIkZpbmFsIExldmVsXCIsIFwiNTBcIik7IHRoaXMuc3RhdExpbmUoc3RhdHMsIFwiVG90YWwgUXVlc3RzXCIsIGAke21ldHJpY3MudG90YWxRdWVzdHN9YCk7IHRoaXMuc3RhdExpbmUoc3RhdHMsIFwiRGVhdGhzIEVuZHVyZWRcIiwgYCR7bGVnYWN5LmRlYXRoQ291bnR9YCk7IHRoaXMuc3RhdExpbmUoc3RhdHMsIFwiTG9uZ2VzdCBTdHJlYWtcIiwgYCR7bWV0cmljcy5sb25nZXN0U3RyZWFrfSBkYXlzYCk7XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk9uZSBtdXN0IGltYWdpbmUgU2lzeXBodXMgaGFwcHkuIFlvdSBoYXZlIHB1c2hlZCB0aGUgYm91bGRlciB0byB0aGUgcGVhay5cIiwgYXR0cjogeyBzdHlsZTogXCJtYXJnaW46IDMwcHggMDsgZm9udC1zdHlsZTogaXRhbGljOyBvcGFjaXR5OiAwLjg7XCIgfSB9KTtcbiAgICAgICAgY29uc3QgYnRuID0gY29udGVudEVsLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJCRUdJTiBORVcgR0FNRStcIiB9KTsgYnRuLmFkZENsYXNzKFwibW9kLWN0YVwiKTsgYnRuLnN0eWxlLndpZHRoID0gXCIxMDAlXCI7IGJ0bi5vbmNsaWNrID0gKCkgPT4geyB0aGlzLmNsb3NlKCk7IH07XG4gICAgfVxuICAgIHN0YXRMaW5lKGVsOiBIVE1MRWxlbWVudCwgbGFiZWw6IHN0cmluZywgdmFsOiBzdHJpbmcpIHsgY29uc3QgbGluZSA9IGVsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXZpY3Rvcnktc3RhdFwiIH0pOyBsaW5lLmlubmVySFRNTCA9IGAke2xhYmVsfTogPHNwYW4gY2xhc3M9XCJzaXN5LXZpY3RvcnktaGlnaGxpZ2h0XCI+JHt2YWx9PC9zcGFuPmA7IH1cbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9XG59XG5cbmV4cG9ydCBjbGFzcyBEZWF0aE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHsgc3VwZXIoYXBwKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH1cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgICAgICBjb250ZW50RWwuYWRkQ2xhc3MoXCJzaXN5LWRlYXRoLW1vZGFsXCIpO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMVwiLCB7IHRleHQ6IFwiWU9VIERJRURcIiwgY2xzOiBcInNpc3ktZGVhdGgtdGl0bGVcIiwgYXR0cjogeyBzdHlsZTogXCJ0ZXh0LWFsaWduOmNlbnRlcjsgY29sb3I6I2Y1NTtcIiB9IH0pO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJkaXZcIiwgeyB0ZXh0OiBcIuKYoO+4j1wiLCBhdHRyOiB7IHN0eWxlOiBcImZvbnQtc2l6ZTogNjBweDsgbWFyZ2luOiAyMHB4IDA7IHRleHQtYWxpZ246IGNlbnRlcjtcIiB9IH0pO1xuY29uc3QgbGVnYWN5ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MubGVnYWN5IHx8IHsgZGVhdGhDb3VudDogMCwgc291bHM6IDAsIHBlcmtzOiB7IHN0YXJ0R29sZDogMCwgc3RhcnRTa2lsbFBvaW50czogMCwgcml2YWxEZWxheTogMCB9LCByZWxpY3M6IFtdIH07XG5jb25zdCBzdHJlYWsgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zdHJlYWsgfHwgeyBsb25nZXN0OiAwLCBjdXJyZW50OiAwLCBsYXN0RGF0ZTogXCJcIiB9O1xuY29uc3Qgc3RhdHMgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgYXR0cjogeyBzdHlsZTogXCJtYXJnaW46IDIwcHggMDtcIiB9IH0pO1xudGhpcy5zdGF0TGluZShzdGF0cywgXCJMZXZlbCBSZWFjaGVkXCIsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmxldmVsfWApO1xudGhpcy5zdGF0TGluZShzdGF0cywgXCJEZWF0aHMgKGFmdGVyIHRoaXMpXCIsIGAke2xlZ2FjeS5kZWF0aENvdW50ICsgMX1gKTtcbiAgICB0aGlzLnN0YXRMaW5lKHN0YXRzLCBcIkxvbmdlc3QgU3RyZWFrXCIsIGAke3N0cmVhay5sb25nZXN0IHx8IDB9IGRheXNgKTtcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiT25lIG11c3QgaW1hZ2luZSBTaXN5cGh1cyBoYXBweS4gVGhlIGJvdWxkZXIgcm9sbHMgYmFjay4gWW91IGtlZXAgb25seSB5b3VyIFNjYXJzLlwiLCBhdHRyOiB7IHN0eWxlOiBcIm1hcmdpbjogMjBweCAwOyBmb250LXN0eWxlOiBpdGFsaWM7IG9wYWNpdHk6IDAuODsgdGV4dC1hbGlnbjogY2VudGVyO1wiIH0gfSk7XG4gICAgICAgIGNvbnN0IGJ0biA9IGNvbnRlbnRFbC5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQUNDRVBUIERFQVRIXCIgfSk7XG4gICAgICAgIGJ0bi5hZGRDbGFzcyhcIm1vZC1jdGFcIik7XG4gICAgICAgIGJ0bi5zdHlsZS53aWR0aCA9IFwiMTAwJVwiO1xuICAgICAgICBidG4ub25jbGljayA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS50cmlnZ2VyRGVhdGgoKTtcbiAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29udGVudEVsLmFwcGVuZENoaWxkKGJ0bik7XG4gICAgfVxuICAgIHN0YXRMaW5lKGVsOiBIVE1MRWxlbWVudCwgbGFiZWw6IHN0cmluZywgdmFsOiBzdHJpbmcpIHsgY29uc3QgbGluZSA9IGVsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXZpY3Rvcnktc3RhdFwiIH0pOyBsaW5lLmlubmVySFRNTCA9IGAke2xhYmVsfTogPHNwYW4gY2xhc3M9XCJzaXN5LXZpY3RvcnktaGlnaGxpZ2h0XCI+JHt2YWx9PC9zcGFuPmA7IH1cbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9XG59XG5cbmV4cG9ydCBjbGFzcyBTY2Fyc01vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHsgc3VwZXIoYXBwKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH1cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwi8J+nrCBTQ0FSU1wiIH0pO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJXaGF0IHBlcnNpc3RzIGFjcm9zcyBkZWF0aHMuXCIsIGF0dHI6IHsgc3R5bGU6IFwib3BhY2l0eTogMC44OyBtYXJnaW4tYm90dG9tOiAxNXB4O1wiIH0gfSk7XG4gICAgICAgIGNvbnN0IHNjYXJzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2NhcnMgfHwgW107XG4gICAgICAgIGlmIChzY2Fycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk5vIHNjYXJzIHlldC4gVGhleSBhY2N1bXVsYXRlIHdoZW4geW91IGRpZS5cIiwgY2xzOiBcInNpc3ktZW1wdHktc3RhdGVcIiB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICBzY2Fycy5zbGljZSgpLnJldmVyc2UoKS5mb3JFYWNoKChzOiB7IGxhYmVsOiBzdHJpbmc7IHZhbHVlOiBzdHJpbmcgfCBudW1iZXI7IGVhcm5lZEF0Pzogc3RyaW5nIH0pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByb3cgPSBsaXN0LmNyZWF0ZURpdih7IGF0dHI6IHsgc3R5bGU6IFwicGFkZGluZzogMTBweDsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMzMzM7IGRpc3BsYXk6IGZsZXg7IGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjsgYWxpZ24taXRlbXM6IGNlbnRlcjtcIiB9IH0pO1xuICAgICAgICAgICAgICAgIHJvdy5jcmVhdGVTcGFuKHsgdGV4dDogYCR7cy5sYWJlbH06ICR7cy52YWx1ZX1gIH0pO1xuICAgICAgICAgICAgICAgIGlmIChzLmVhcm5lZEF0KSByb3cuY3JlYXRlU3Bhbih7IHRleHQ6IG5ldyBEYXRlKHMuZWFybmVkQXQpLnRvTG9jYWxlRGF0ZVN0cmluZygpLCBhdHRyOiB7IHN0eWxlOiBcImZvbnQtc2l6ZTogMC44NWVtOyBvcGFjaXR5OiAwLjc7XCIgfSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH1cbn1cblxuZXhwb3J0IGNsYXNzIFRlbXBsYXRlTWFuYWdlck1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG4gICAgbmV3TmFtZTogc3RyaW5nID0gXCJcIjtcbiAgICBuZXdEaWZmOiBudW1iZXIgPSAxO1xuICAgIG5ld1NraWxsOiBzdHJpbmcgPSBcIk5vbmVcIjtcbiAgICBuZXdEZWFkbGluZTogc3RyaW5nID0gXCIrMmhcIjtcblxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgIH1cblxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgfVxuXG4gICAgZGlzcGxheSgpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiTWFuYWdlIFRlbXBsYXRlc1wiIH0pO1xuXG4gICAgICAgIC8vIDEuIExpc3QgRXhpc3RpbmcgVGVtcGxhdGVzXG4gICAgICAgIGNvbnN0IGxpc3REaXYgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7XG4gICAgICAgIGxpc3REaXYuc3R5bGUubWFyZ2luQm90dG9tID0gXCIyMHB4XCI7XG4gICAgICAgIGxpc3REaXYuc3R5bGUubWF4SGVpZ2h0ID0gXCIzMDBweFwiO1xuICAgICAgICBsaXN0RGl2LnN0eWxlLm92ZXJmbG93WSA9IFwiYXV0b1wiO1xuXG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnF1ZXN0VGVtcGxhdGVzLmZvckVhY2goKHQsIGlkeCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gbGlzdERpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgIHJvdy5zdHlsZS5kaXNwbGF5ID0gXCJmbGV4XCI7XG4gICAgICAgICAgICByb3cuc3R5bGUuanVzdGlmeUNvbnRlbnQgPSBcInNwYWNlLWJldHdlZW5cIjtcbiAgICAgICAgICAgIHJvdy5zdHlsZS5hbGlnbkl0ZW1zID0gXCJjZW50ZXJcIjtcbiAgICAgICAgICAgIHJvdy5zdHlsZS5wYWRkaW5nID0gXCIxMHB4XCI7XG4gICAgICAgICAgICByb3cuc3R5bGUuYm9yZGVyQm90dG9tID0gXCIxcHggc29saWQgIzMzM1wiO1xuXG4gICAgICAgICAgICByb3cuY3JlYXRlRGl2KHsgdGV4dDogYCR7dC5uYW1lfSAoRCR7dC5kaWZmfSwgJHt0LnNraWxsfSwgJHt0LmRlYWRsaW5lfSlgIH0pO1xuXG4gICAgICAgICAgICBjb25zdCBkZWxCdG4gPSByb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkRlbGV0ZVwiIH0pO1xuICAgICAgICAgICAgZGVsQnRuLnN0eWxlLmNvbG9yID0gXCJyZWRcIjtcbiAgICAgICAgICAgIGRlbEJ0bi5vbmNsaWNrID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnF1ZXN0VGVtcGxhdGVzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGxheSgpOyAvLyBSZWZyZXNoIFVJXG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyAyLiBBZGQgTmV3IFRlbXBsYXRlIEZvcm1cbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkFkZCBOZXcgVGVtcGxhdGVcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIk5hbWVcIikuYWRkVGV4dCh0ID0+IHQub25DaGFuZ2UodiA9PiB0aGlzLm5ld05hbWUgPSB2KSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIkRpZmZpY3VsdHkgKDEtNSlcIikuYWRkVGV4dCh0ID0+IHQuc2V0VmFsdWUoXCIxXCIpLm9uQ2hhbmdlKHYgPT4geyBjb25zdCBuID0gcGFyc2VJbnQodiwgMTApOyB0aGlzLm5ld0RpZmYgPSBpc05hTihuKSA/IDEgOiBNYXRoLm1pbig1LCBNYXRoLm1heCgxLCBuKSk7IH0pKTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiU2tpbGxcIikuYWRkVGV4dCh0ID0+IHQuc2V0VmFsdWUoXCJOb25lXCIpLm9uQ2hhbmdlKHYgPT4gdGhpcy5uZXdTa2lsbCA9IHYpKTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiRGVhZGxpbmVcIikuc2V0RGVzYyhcIkZvcm1hdDogJzEwOjAwJyBvciAnKzJoJ1wiKS5hZGRUZXh0KHQgPT4gdC5zZXRWYWx1ZShcIisyaFwiKS5vbkNoYW5nZSh2ID0+IHRoaXMubmV3RGVhZGxpbmUgPSB2KSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5hZGRCdXR0b24oYiA9PiBiXG4gICAgICAgICAgICAuc2V0QnV0dG9uVGV4dChcIkFkZCBUZW1wbGF0ZVwiKVxuICAgICAgICAgICAgLnNldEN0YSgpXG4gICAgICAgICAgICAub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLm5ld05hbWUpIHJldHVybjtcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWVzdFRlbXBsYXRlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogdGhpcy5uZXdOYW1lLFxuICAgICAgICAgICAgICAgICAgICBkaWZmOiBNYXRoLm1pbig1LCBNYXRoLm1heCgxLCB0aGlzLm5ld0RpZmYgfHwgMSkpLFxuICAgICAgICAgICAgICAgICAgICBza2lsbDogdGhpcy5uZXdTa2lsbCB8fCBcIk5vbmVcIixcbiAgICAgICAgICAgICAgICAgICAgZGVhZGxpbmU6IHRoaXMubmV3RGVhZGxpbmUgfHwgXCIrMmhcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGxheSgpOyAvLyBSZWZyZXNoIFVJIHRvIHNob3cgbmV3IGl0ZW1cbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKFwiVGVtcGxhdGUgYWRkZWQuXCIpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlc2V0IGZpZWxkc1xuICAgICAgICAgICAgICAgIHRoaXMubmV3TmFtZSA9IFwiXCI7XG4gICAgICAgICAgICB9KSk7XG4gICAgfVxuXG4gICAgb25DbG9zZSgpIHtcbiAgICAgICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBBY2hpZXZlbWVudCB9IGZyb20gJy4vdHlwZXMnO1xuXG5leHBvcnQgY29uc3QgQUNISUVWRU1FTlRfREVGSU5JVElPTlM6IE9taXQ8QWNoaWV2ZW1lbnQsIFwidW5sb2NrZWRcIiB8IFwidW5sb2NrZWRBdFwiPltdID0gW1xuICAgIC8vIC0tLSBFQVJMWSBHQU1FIC0tLVxuICAgIHsgaWQ6IFwiZmlyc3RfYmxvb2RcIiwgbmFtZTogXCJGaXJzdCBCbG9vZFwiLCBkZXNjcmlwdGlvbjogXCJDb21wbGV0ZSB5b3VyIGZpcnN0IHF1ZXN0LlwiLCByYXJpdHk6IFwiY29tbW9uXCIgfSxcbiAgICB7IGlkOiBcIndlZWtfd2FycmlvclwiLCBuYW1lOiBcIldlZWsgV2FycmlvclwiLCBkZXNjcmlwdGlvbjogXCJNYWludGFpbiBhIDctZGF5IHN0cmVhay5cIiwgcmFyaXR5OiBcImNvbW1vblwiIH0sXG4gICAgeyBpZDogXCJ3YXJtX3VwXCIsIG5hbWU6IFwiV2FybSBVcFwiLCBkZXNjcmlwdGlvbjogXCJDb21wbGV0ZSAxMCB0b3RhbCBxdWVzdHMuXCIsIHJhcml0eTogXCJjb21tb25cIiB9LFxuXG4gICAgLy8gLS0tIE1JRCBHQU1FIC0tLVxuICAgIHsgaWQ6IFwic2tpbGxfYWRlcHRcIiwgbmFtZTogXCJBcHByZW50aWNlXCIsIGRlc2NyaXB0aW9uOiBcIlJlYWNoIExldmVsIDUgaW4gYW55IHNraWxsLlwiLCByYXJpdHk6IFwicmFyZVwiIH0sXG4gICAgeyBpZDogXCJjaGFpbl9nYW5nXCIsIG5hbWU6IFwiQ2hhaW4gR2FuZ1wiLCBkZXNjcmlwdGlvbjogXCJDb21wbGV0ZSBhIFF1ZXN0IENoYWluLlwiLCByYXJpdHk6IFwicmFyZVwiIH0sXG4gICAgeyBpZDogXCJyZXNlYXJjaGVyXCIsIG5hbWU6IFwiU2Nob2xhclwiLCBkZXNjcmlwdGlvbjogXCJDb21wbGV0ZSA1IFJlc2VhcmNoIFF1ZXN0cy5cIiwgcmFyaXR5OiBcInJhcmVcIiB9LFxuICAgIHsgaWQ6IFwicmljaFwiLCBuYW1lOiBcIkNhcGl0YWxpc3RcIiwgZGVzY3JpcHRpb246IFwiSG9sZCA1MDAgZ29sZCBhdCBvbmNlLlwiLCByYXJpdHk6IFwicmFyZVwiIH0sXG5cbiAgICAvLyAtLS0gRU5EIEdBTUUgLS0tXG4gICAgeyBpZDogXCJib3NzX3NsYXllclwiLCBuYW1lOiBcIkdpYW50IFNsYXllclwiLCBkZXNjcmlwdGlvbjogXCJEZWZlYXQgeW91ciBmaXJzdCBCb3NzLlwiLCByYXJpdHk6IFwiZXBpY1wiIH0sXG4gICAgeyBpZDogXCJhc2NlbmRlZFwiLCBuYW1lOiBcIlNpc3lwaHVzIEhhcHB5XCIsIGRlc2NyaXB0aW9uOiBcIlJlYWNoIExldmVsIDUwLlwiLCByYXJpdHk6IFwibGVnZW5kYXJ5XCIgfSxcbiAgICB7IGlkOiBcImltbW9ydGFsXCIsIG5hbWU6IFwiSW1tb3J0YWxcIiwgZGVzY3JpcHRpb246IFwiUmVhY2ggTGV2ZWwgMjAgd2l0aCAwIERlYXRocy5cIiwgcmFyaXR5OiBcImxlZ2VuZGFyeVwiIH1cbl07XG4iLCJpbXBvcnQgeyBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBEYXlNZXRyaWNzLCBXZWVrbHlSZXBvcnQsIEJvc3NNaWxlc3RvbmUsIFN0cmVhaywgQWNoaWV2ZW1lbnQgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBBQ0hJRVZFTUVOVF9ERUZJTklUSU9OUyB9IGZyb20gJy4uL2FjaGlldmVtZW50cyc7XG5cbmV4cG9ydCBjbGFzcyBBbmFseXRpY3NFbmdpbmUge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIGF1ZGlvQ29udHJvbGxlcj86IGFueTtcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzLCBhdWRpb0NvbnRyb2xsZXI/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlciA9IGF1ZGlvQ29udHJvbGxlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFbnN1cmUgYWxsIGFjaGlldmVtZW50cyBleGlzdCBpbiBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVBY2hpZXZlbWVudHMoKSB7XG4gICAgICAgIC8vIElmIGFjaGlldmVtZW50cyBhcnJheSBpcyBlbXB0eSBvciBtaXNzaW5nIGRlZmluaXRpb25zLCBzeW5jIGl0XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5hY2hpZXZlbWVudHMpIHRoaXMuc2V0dGluZ3MuYWNoaWV2ZW1lbnRzID0gW107XG5cbiAgICAgICAgQUNISUVWRU1FTlRfREVGSU5JVElPTlMuZm9yRWFjaChkZWYgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXhpc3RzID0gdGhpcy5zZXR0aW5ncy5hY2hpZXZlbWVudHMuZmluZChhID0+IGEuaWQgPT09IGRlZi5pZCk7XG4gICAgICAgICAgICBpZiAoIWV4aXN0cykge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuYWNoaWV2ZW1lbnRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAuLi5kZWYsXG4gICAgICAgICAgICAgICAgICAgIHVubG9ja2VkOiBmYWxzZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB0cmFja0RhaWx5TWV0cmljcyh0eXBlOiAncXVlc3RfY29tcGxldGUnIHwgJ3F1ZXN0X2ZhaWwnIHwgJ3hwJyB8ICdnb2xkJyB8ICdkYW1hZ2UnIHwgJ3NraWxsX2xldmVsJyB8ICdjaGFpbl9jb21wbGV0ZScsIGFtb3VudDogbnVtYmVyID0gMSkge1xuICAgICAgICBjb25zdCB0b2RheSA9IG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIFxuICAgICAgICBsZXQgbWV0cmljID0gdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzLmZpbmQobSA9PiBtLmRhdGUgPT09IHRvZGF5KTtcbiAgICAgICAgaWYgKCFtZXRyaWMpIHtcbiAgICAgICAgICAgIG1ldHJpYyA9IHsgZGF0ZTogdG9kYXksIHF1ZXN0c0NvbXBsZXRlZDogMCwgcXVlc3RzRmFpbGVkOiAwLCB4cEVhcm5lZDogMCwgZ29sZEVhcm5lZDogMCwgZGFtYWdlc1Rha2VuOiAwLCBza2lsbHNMZXZlbGVkOiBbXSwgY2hhaW5zQ29tcGxldGVkOiAwIH07XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MucHVzaChtZXRyaWMpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgXCJxdWVzdF9jb21wbGV0ZVwiOiBtZXRyaWMucXVlc3RzQ29tcGxldGVkICs9IGFtb3VudDsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwicXVlc3RfZmFpbFwiOiBtZXRyaWMucXVlc3RzRmFpbGVkICs9IGFtb3VudDsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwieHBcIjogbWV0cmljLnhwRWFybmVkICs9IGFtb3VudDsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiZ29sZFwiOiBtZXRyaWMuZ29sZEVhcm5lZCArPSBhbW91bnQ7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImRhbWFnZVwiOiBtZXRyaWMuZGFtYWdlc1Rha2VuICs9IGFtb3VudDsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwic2tpbGxfbGV2ZWxcIjogbWV0cmljLnNraWxsc0xldmVsZWQucHVzaChcIlNraWxsIGxldmVsZWRcIik7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImNoYWluX2NvbXBsZXRlXCI6IG1ldHJpYy5jaGFpbnNDb21wbGV0ZWQgKz0gYW1vdW50OyBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXIgQWNoaWV2ZW1lbnQgQ2hlY2sgYWZ0ZXIgZXZlcnkgbWV0cmljIHVwZGF0ZVxuICAgICAgICB0aGlzLmNoZWNrQWNoaWV2ZW1lbnRzKCk7XG4gICAgfVxuXG4gIHVwZGF0ZVN0cmVhaygpIHtcbiAgICAgICAgY29uc3QgdG9kYXkgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBjb25zdCBsYXN0RGF0ZSA9IHRoaXMuc2V0dGluZ3Muc3RyZWFrLmxhc3REYXRlO1xuICAgICAgICBcbiAgICAgICAgaWYgKGxhc3REYXRlICE9PSB0b2RheSkge1xuICAgICAgICAgICAgY29uc3QgeWVzdGVyZGF5ID0gbW9tZW50KCkuc3VidHJhY3QoMSwgJ2RheScpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgICAgICBpZiAobGFzdERhdGUgPT09IHllc3RlcmRheSkge1xuICAgICAgICAgICAgICAgIC8vIENvbnRpbnVlZCBmcm9tIHllc3RlcmRheVxuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc3RyZWFrLmN1cnJlbnQrKztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIWxhc3REYXRlKSB7XG4gICAgICAgICAgICAgICAgLy8gRmlyc3QgZXZlciBxdWVzdFxuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc3RyZWFrLmN1cnJlbnQgPSAxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBCcm9rZW4gc3RyZWFrXG4gICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5zdHJlYWsuY3VycmVudCA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0aGlzLnNldHRpbmdzLnN0cmVhay5jdXJyZW50ID4gdGhpcy5zZXR0aW5ncy5zdHJlYWsubG9uZ2VzdCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc3RyZWFrLmxvbmdlc3QgPSB0aGlzLnNldHRpbmdzLnN0cmVhay5jdXJyZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnN0cmVhay5sYXN0RGF0ZSA9IHRvZGF5O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBbHdheXMgY2hlY2sgYWNoaWV2ZW1lbnRzXG4gICAgICAgIHRoaXMuY2hlY2tBY2hpZXZlbWVudHMoKTtcbiAgICB9XG5cbiAgICBjaGVja0FjaGlldmVtZW50cygpIHtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplQWNoaWV2ZW1lbnRzKCk7XG4gICAgICAgIGNvbnN0IHMgPSB0aGlzLnNldHRpbmdzO1xuICAgICAgICBjb25zdCB0b3RhbFF1ZXN0cyA9IHMuZGF5TWV0cmljcy5yZWR1Y2UoKHN1bSwgbSkgPT4gc3VtICsgbS5xdWVzdHNDb21wbGV0ZWQsIDApO1xuXG4gICAgICAgIC8vIDEuIEZpcnN0IEJsb29kXG4gICAgICAgIGlmICh0b3RhbFF1ZXN0cyA+PSAxKSB0aGlzLnVubG9jayhcImZpcnN0X2Jsb29kXCIpO1xuXG4gICAgICAgIC8vIDIuIFdhcm0gVXBcbiAgICAgICAgaWYgKHRvdGFsUXVlc3RzID49IDEwKSB0aGlzLnVubG9jayhcIndhcm1fdXBcIik7XG5cbiAgICAgICAgLy8gMy4gV2VlayBXYXJyaW9yXG4gICAgICAgIGlmIChzLnN0cmVhay5jdXJyZW50ID49IDcpIHRoaXMudW5sb2NrKFwid2Vla193YXJyaW9yXCIpO1xuXG4gICAgICAgIC8vIDQuIFNraWxsIEFkZXB0XG4gICAgICAgIGlmIChzLnNraWxscy5zb21lKHNraWxsID0+IHNraWxsLmxldmVsID49IDUpKSB0aGlzLnVubG9jayhcInNraWxsX2FkZXB0XCIpO1xuXG4gICAgICAgIC8vIDUuIENoYWluIEdhbmdcbiAgICAgICAgaWYgKHMuY2hhaW5IaXN0b3J5Lmxlbmd0aCA+PSAxKSB0aGlzLnVubG9jayhcImNoYWluX2dhbmdcIik7XG5cbiAgICAgICAgLy8gNi4gUmVzZWFyY2hlclxuICAgICAgICBpZiAocy5yZXNlYXJjaFN0YXRzLnJlc2VhcmNoQ29tcGxldGVkID49IDUpIHRoaXMudW5sb2NrKFwicmVzZWFyY2hlclwiKTtcblxuICAgICAgICAvLyA3LiBDYXBpdGFsaXN0XG4gICAgICAgIGlmIChzLmdvbGQgPj0gNTAwKSB0aGlzLnVubG9jayhcInJpY2hcIik7XG5cbiAgICAgICAgLy8gOC4gR2lhbnQgU2xheWVyXG4gICAgICAgIGlmIChzLmJvc3NNaWxlc3RvbmVzLnNvbWUoYiA9PiBiLmRlZmVhdGVkKSkgdGhpcy51bmxvY2soXCJib3NzX3NsYXllclwiKTtcblxuICAgICAgICAvLyA5LiBBc2NlbmRlZFxuICAgICAgICBpZiAocy5sZXZlbCA+PSA1MCkgdGhpcy51bmxvY2soXCJhc2NlbmRlZFwiKTtcblxuICAgICAgICAvLyAxMC4gSW1tb3J0YWxcbiAgICAgICAgaWYgKHMubGV2ZWwgPj0gMjAgJiYgcy5sZWdhY3kuZGVhdGhDb3VudCA9PT0gMCkgdGhpcy51bmxvY2soXCJpbW1vcnRhbFwiKTtcbiAgICB9XG5cbiAgICB1bmxvY2soaWQ6IHN0cmluZykge1xuICAgICAgICBjb25zdCBhY2ggPSB0aGlzLnNldHRpbmdzLmFjaGlldmVtZW50cy5maW5kKGEgPT4gYS5pZCA9PT0gaWQpO1xuICAgICAgICBpZiAoYWNoICYmICFhY2gudW5sb2NrZWQpIHtcbiAgICAgICAgICAgIGFjaC51bmxvY2tlZCA9IHRydWU7XG4gICAgICAgICAgICBhY2gudW5sb2NrZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcikgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgICAgIC8vIFdlIHJldHVybiB0cnVlIHNvIHRoZSBjYWxsZXIgY2FuIHNob3cgYSBub3RpY2UgaWYgdGhleSB3YW50LCBcbiAgICAgICAgICAgIC8vIHRob3VnaCB1c3VhbGx5IHRoZSBOb3RpY2UgaXMgYmV0dGVyIGhhbmRsZWQgaGVyZSBpZiB3ZSBoYWQgYWNjZXNzIHRvIHRoYXQgQVBJIGVhc2lseSwgXG4gICAgICAgICAgICAvLyBvciBsZXQgdGhlIGVuZ2luZSBoYW5kbGUgdGhlIG5vdGlmaWNhdGlvbi5cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIC4uLiAoS2VlcCBleGlzdGluZyBib3NzL3JlcG9ydCBtZXRob2RzIGJlbG93IGFzIHRoZXkgd2VyZSkgLi4uXG4gICAgaW5pdGlhbGl6ZUJvc3NNaWxlc3RvbmVzKCkge1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMgPSBbXG4gICAgICAgICAgICAgICAgeyBsZXZlbDogMTAsIG5hbWU6IFwiVGhlIEZpcnN0IFRyaWFsXCIsIHVubG9ja2VkOiBmYWxzZSwgZGVmZWF0ZWQ6IGZhbHNlLCB4cFJld2FyZDogNTAwIH0sXG4gICAgICAgICAgICAgICAgeyBsZXZlbDogMjAsIG5hbWU6IFwiVGhlIE5lbWVzaXMgUmV0dXJuc1wiLCB1bmxvY2tlZDogZmFsc2UsIGRlZmVhdGVkOiBmYWxzZSwgeHBSZXdhcmQ6IDEwMDAgfSxcbiAgICAgICAgICAgICAgICB7IGxldmVsOiAzMCwgbmFtZTogXCJUaGUgUmVhcGVyIEF3YWtlbnNcIiwgdW5sb2NrZWQ6IGZhbHNlLCBkZWZlYXRlZDogZmFsc2UsIHhwUmV3YXJkOiAxNTAwIH0sXG4gICAgICAgICAgICAgICAgeyBsZXZlbDogNTAsIG5hbWU6IFwiVGhlIEZpbmFsIEFzY2Vuc2lvblwiLCB1bmxvY2tlZDogZmFsc2UsIGRlZmVhdGVkOiBmYWxzZSwgeHBSZXdhcmQ6IDUwMDAgfVxuICAgICAgICAgICAgXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNoZWNrQm9zc01pbGVzdG9uZXMoKTogc3RyaW5nW10ge1xuICAgICAgICBjb25zdCBtZXNzYWdlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzIHx8IHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMubGVuZ3RoID09PSAwKSB0aGlzLmluaXRpYWxpemVCb3NzTWlsZXN0b25lcygpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcy5mb3JFYWNoKChib3NzOiBCb3NzTWlsZXN0b25lKSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5sZXZlbCA+PSBib3NzLmxldmVsICYmICFib3NzLnVubG9ja2VkKSB7XG4gICAgICAgICAgICAgICAgYm9zcy51bmxvY2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgbWVzc2FnZXMucHVzaChgQm9zcyBVbmxvY2tlZDogJHtib3NzLm5hbWV9IChMZXZlbCAke2Jvc3MubGV2ZWx9KWApO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcikgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBtZXNzYWdlcztcbiAgICB9XG5cbiAgICBkZWZlYXRCb3NzKGxldmVsOiBudW1iZXIpOiB7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgeHBSZXdhcmQ6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgYm9zcyA9IHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMuZmluZCgoYjogQm9zc01pbGVzdG9uZSkgPT4gYi5sZXZlbCA9PT0gbGV2ZWwpO1xuICAgICAgICBpZiAoIWJvc3MpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIkJvc3Mgbm90IGZvdW5kXCIsIHhwUmV3YXJkOiAwIH07XG4gICAgICAgIGlmIChib3NzLmRlZmVhdGVkKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJCb3NzIGFscmVhZHkgZGVmZWF0ZWRcIiwgeHBSZXdhcmQ6IDAgfTtcbiAgICAgICAgXG4gICAgICAgIGJvc3MuZGVmZWF0ZWQgPSB0cnVlO1xuICAgICAgICBib3NzLmRlZmVhdGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MueHAgKz0gYm9zcy54cFJld2FyZDtcbiAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyKSB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICBpZiAobGV2ZWwgPT09IDUwKSB0aGlzLndpbkdhbWUoKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBCb3NzIERlZmVhdGVkOiAke2Jvc3MubmFtZX0hICske2Jvc3MueHBSZXdhcmR9IFhQYCwgeHBSZXdhcmQ6IGJvc3MueHBSZXdhcmQgfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHdpbkdhbWUoKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZ2FtZVdvbiA9IHRydWU7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZW5kR2FtZURhdGUgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcikgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICB9XG5cbiAgICBnZW5lcmF0ZVdlZWtseVJlcG9ydCgpOiBXZWVrbHlSZXBvcnQge1xuICAgICAgICBjb25zdCB3ZWVrID0gbW9tZW50KCkud2VlaygpO1xuICAgICAgICBjb25zdCBzdGFydERhdGUgPSBtb21lbnQoKS5zdGFydE9mKCd3ZWVrJykuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgY29uc3QgZW5kRGF0ZSA9IG1vbWVudCgpLmVuZE9mKCd3ZWVrJykuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdlZWtNZXRyaWNzID0gdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzLmZpbHRlcigobTogRGF5TWV0cmljcykgPT4gXG4gICAgICAgICAgICBtb21lbnQobS5kYXRlKS5pc0JldHdlZW4obW9tZW50KHN0YXJ0RGF0ZSksIG1vbWVudChlbmREYXRlKSwgbnVsbCwgJ1tdJylcbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRvdGFsUXVlc3RzID0gd2Vla01ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogRGF5TWV0cmljcykgPT4gc3VtICsgbS5xdWVzdHNDb21wbGV0ZWQsIDApO1xuICAgICAgICBjb25zdCB0b3RhbEZhaWxlZCA9IHdlZWtNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0ucXVlc3RzRmFpbGVkLCAwKTtcbiAgICAgICAgY29uc3Qgc3VjY2Vzc1JhdGUgPSB0b3RhbFF1ZXN0cyArIHRvdGFsRmFpbGVkID4gMCA/IE1hdGgucm91bmQoKHRvdGFsUXVlc3RzIC8gKHRvdGFsUXVlc3RzICsgdG90YWxGYWlsZWQpKSAqIDEwMCkgOiAwO1xuICAgICAgICBjb25zdCB0b3RhbFhwID0gd2Vla01ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogRGF5TWV0cmljcykgPT4gc3VtICsgbS54cEVhcm5lZCwgMCk7XG4gICAgICAgIGNvbnN0IHRvdGFsR29sZCA9IHdlZWtNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0uZ29sZEVhcm5lZCwgMCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0b3BTa2lsbHMgPSB0aGlzLnNldHRpbmdzLnNraWxscy5zb3J0KChhOiBhbnksIGI6IGFueSkgPT4gKGIubGV2ZWwgLSBhLmxldmVsKSkuc2xpY2UoMCwgMykubWFwKChzOiBhbnkpID0+IHMubmFtZSk7XG4gICAgICAgIGNvbnN0IGJlc3REYXkgPSB3ZWVrTWV0cmljcy5sZW5ndGggPiAwID8gd2Vla01ldHJpY3MucmVkdWNlKChtYXg6IERheU1ldHJpY3MsIG06IERheU1ldHJpY3MpID0+IG0ucXVlc3RzQ29tcGxldGVkID4gbWF4LnF1ZXN0c0NvbXBsZXRlZCA/IG0gOiBtYXgpLmRhdGUgOiBzdGFydERhdGU7XG4gICAgICAgIGNvbnN0IHdvcnN0RGF5ID0gd2Vla01ldHJpY3MubGVuZ3RoID4gMCA/IHdlZWtNZXRyaWNzLnJlZHVjZSgobWluOiBEYXlNZXRyaWNzLCBtOiBEYXlNZXRyaWNzKSA9PiBtLnF1ZXN0c0ZhaWxlZCA+IG1pbi5xdWVzdHNGYWlsZWQgPyBtIDogbWluKS5kYXRlIDogc3RhcnREYXRlO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVwb3J0OiBXZWVrbHlSZXBvcnQgPSB7IHdlZWssIHN0YXJ0RGF0ZSwgZW5kRGF0ZSwgdG90YWxRdWVzdHMsIHN1Y2Nlc3NSYXRlLCB0b3RhbFhwLCB0b3RhbEdvbGQsIHRvcFNraWxscywgYmVzdERheSwgd29yc3REYXkgfTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy53ZWVrbHlSZXBvcnRzLnB1c2gocmVwb3J0KTtcbiAgICAgICAgcmV0dXJuIHJlcG9ydDtcbiAgICB9XG5cbiAgICB1bmxvY2tBY2hpZXZlbWVudChhY2hpZXZlbWVudElkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhIG1hbnVhbCBvdmVycmlkZSBpZiBuZWVkZWQsIGxvZ2ljIGlzIG1vc3RseSBpbiBjaGVja0FjaGlldmVtZW50cyBub3dcbiAgICAgICAgdGhpcy5jaGVja0FjaGlldmVtZW50cygpO1xuICAgICAgICByZXR1cm4gdHJ1ZTsgXG4gICAgfVxuXG4gICAgZ2V0R2FtZVN0YXRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbGV2ZWw6IHRoaXMuc2V0dGluZ3MubGV2ZWwsXG4gICAgICAgICAgICBjdXJyZW50U3RyZWFrOiB0aGlzLnNldHRpbmdzLnN0cmVhay5jdXJyZW50LFxuICAgICAgICAgICAgbG9uZ2VzdFN0cmVhazogdGhpcy5zZXR0aW5ncy5zdHJlYWsubG9uZ2VzdCxcbiAgICAgICAgICAgIHRvdGFsUXVlc3RzOiB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogRGF5TWV0cmljcykgPT4gc3VtICsgbS5xdWVzdHNDb21wbGV0ZWQsIDApLFxuICAgICAgICAgICAgdG90YWxYcDogdGhpcy5zZXR0aW5ncy54cCArIHRoaXMuc2V0dGluZ3MuZGF5TWV0cmljcy5yZWR1Y2UoKHN1bTogbnVtYmVyLCBtOiBEYXlNZXRyaWNzKSA9PiBzdW0gKyBtLnhwRWFybmVkLCAwKSxcbiAgICAgICAgICAgIGdhbWVXb246IHRoaXMuc2V0dGluZ3MuZ2FtZVdvbixcbiAgICAgICAgICAgIGJvc3Nlc0RlZmVhdGVkOiB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmZpbHRlcigoYjogQm9zc01pbGVzdG9uZSkgPT4gYi5kZWZlYXRlZCkubGVuZ3RoLFxuICAgICAgICAgICAgdG90YWxCb3NzZXM6IHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMubGVuZ3RoXG4gICAgICAgIH07XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgbW9tZW50IH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgU2lzeXBodXNTZXR0aW5ncyB9IGZyb20gJy4uL3R5cGVzJztcblxuLyoqXG4gKiBETEMgMzogTWVkaXRhdGlvbiAmIFJlY292ZXJ5IEVuZ2luZVxuICogSGFuZGxlcyBsb2NrZG93biBzdGF0ZSwgbWVkaXRhdGlvbiBoZWFsaW5nLCBhbmQgcXVlc3QgZGVsZXRpb24gcXVvdGFcbiAqIFxuICogSVNPTEFURUQ6IE9ubHkgcmVhZHMvd3JpdGVzIHRvIGxvY2tkb3duVW50aWwsIGlzTWVkaXRhdGluZywgbWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93biwgXG4gKiAgICAgICAgICAgcXVlc3REZWxldGlvbnNUb2RheSwgbGFzdERlbGV0aW9uUmVzZXRcbiAqIERFUEVOREVOQ0lFUzogbW9tZW50LCBTaXN5cGh1c1NldHRpbmdzXG4gKiBTSURFIEVGRkVDVFM6IFBsYXlzIGF1ZGlvICg0MzIgSHogdG9uZSlcbiAqL1xuZXhwb3J0IGNsYXNzIE1lZGl0YXRpb25FbmdpbmUge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIGF1ZGlvQ29udHJvbGxlcj86IGFueTsgLy8gT3B0aW9uYWwgZm9yIDQzMiBIeiBzb3VuZFxuICAgIHByaXZhdGUgbWVkaXRhdGlvbkNvb2xkb3duTXMgPSAzMDAwMDsgLy8gMzAgc2Vjb25kc1xuXG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3MsIGF1ZGlvQ29udHJvbGxlcj86IGFueSkge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyID0gYXVkaW9Db250cm9sbGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGN1cnJlbnRseSBsb2NrZWQgZG93blxuICAgICAqL1xuICAgIGlzTG9ja2VkRG93bigpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwpIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIG1vbWVudCgpLmlzQmVmb3JlKG1vbWVudCh0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbG9ja2Rvd24gdGltZSByZW1haW5pbmcgaW4gbWludXRlc1xuICAgICAqL1xuICAgIGdldExvY2tkb3duVGltZVJlbWFpbmluZygpOiB7IGhvdXJzOiBudW1iZXI7IG1pbnV0ZXM6IG51bWJlcjsgdG90YWxNaW51dGVzOiBudW1iZXIgfSB7XG4gICAgICAgIGlmICghdGhpcy5pc0xvY2tlZERvd24oKSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgaG91cnM6IDAsIG1pbnV0ZXM6IDAsIHRvdGFsTWludXRlczogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0b3RhbE1pbnV0ZXMgPSBtb21lbnQodGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsKS5kaWZmKG1vbWVudCgpLCAnbWludXRlcycpO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IodG90YWxNaW51dGVzIC8gNjApO1xuICAgICAgICBjb25zdCBtaW51dGVzID0gdG90YWxNaW51dGVzICUgNjA7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBob3VycywgbWludXRlcywgdG90YWxNaW51dGVzIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJpZ2dlciBsb2NrZG93biBhZnRlciB0YWtpbmcgNTArIGRhbWFnZVxuICAgICAqL1xuICAgIHRyaWdnZXJMb2NrZG93bigpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsID0gbW9tZW50KCkuYWRkKDYsICdob3VycycpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93biA9IDA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybSBvbmUgbWVkaXRhdGlvbiBjeWNsZSAoY2xpY2spXG4gICAgICogUmV0dXJuczogeyBzdWNjZXNzLCBjeWNsZXNEb25lLCBjeWNsZXNSZW1haW5pbmcsIG1lc3NhZ2UgfVxuICAgICAqL1xuICAgIG1lZGl0YXRlKCk6IHsgc3VjY2VzczogYm9vbGVhbjsgY3ljbGVzRG9uZTogbnVtYmVyOyBjeWNsZXNSZW1haW5pbmc6IG51bWJlcjsgbWVzc2FnZTogc3RyaW5nOyBsb2NrZG93blJlZHVjZWQ6IGJvb2xlYW4gfSB7XG4gICAgICAgIGlmICghdGhpcy5pc0xvY2tlZERvd24oKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBjeWNsZXNEb25lOiAwLFxuICAgICAgICAgICAgICAgIGN5Y2xlc1JlbWFpbmluZzogMCxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIk5vdCBpbiBsb2NrZG93bi4gTm8gbmVlZCB0byBtZWRpdGF0ZS5cIixcbiAgICAgICAgICAgICAgICBsb2NrZG93blJlZHVjZWQ6IGZhbHNlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5pc01lZGl0YXRpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgY3ljbGVzRG9uZTogdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duLFxuICAgICAgICAgICAgICAgIGN5Y2xlc1JlbWFpbmluZzogTWF0aC5tYXgoMCwgMTAgLSB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24pLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiQWxyZWFkeSBtZWRpdGF0aW5nLiBXYWl0IDMwIHNlY29uZHMuXCIsXG4gICAgICAgICAgICAgICAgbG9ja2Rvd25SZWR1Y2VkOiBmYWxzZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5pc01lZGl0YXRpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24rKztcbiAgICAgICAgXG4gICAgICAgIC8vIFBsYXkgaGVhbGluZyBmcmVxdWVuY3lcbiAgICAgICAgdGhpcy5wbGF5TWVkaXRhdGlvblNvdW5kKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZW1haW5pbmcgPSAxMCAtIHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bjtcbiAgICAgICAgbGV0IGxvY2tkb3duUmVkdWNlZCA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgMTAgY3ljbGVzIGNvbXBsZXRlXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24gPj0gMTApIHtcbiAgICAgICAgICAgIGNvbnN0IHJlZHVjZWRUaW1lID0gbW9tZW50KHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCkuc3VidHJhY3QoNSwgJ2hvdXJzJyk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwgPSByZWR1Y2VkVGltZS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duID0gMDtcbiAgICAgICAgICAgIGxvY2tkb3duUmVkdWNlZCA9IHRydWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcj8ucGxheVNvdW5kKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQXV0by1yZXNldCBtZWRpdGF0aW9uIGZsYWcgYWZ0ZXIgY29vbGRvd25cbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaXNNZWRpdGF0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICB9LCB0aGlzLm1lZGl0YXRpb25Db29sZG93bk1zKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGN5Y2xlc0RvbmU6IDAsXG4gICAgICAgICAgICAgICAgY3ljbGVzUmVtYWluaW5nOiAwLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiTWVkaXRhdGlvbiBjb21wbGV0ZS4gTG9ja2Rvd24gcmVkdWNlZCBieSA1IGhvdXJzLlwiLFxuICAgICAgICAgICAgICAgIGxvY2tkb3duUmVkdWNlZDogdHJ1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQXV0by1yZXNldCBtZWRpdGF0aW9uIGZsYWcgYWZ0ZXIgY29vbGRvd25cbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmlzTWVkaXRhdGluZyA9IGZhbHNlO1xuICAgICAgICB9LCB0aGlzLm1lZGl0YXRpb25Db29sZG93bk1zKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgY3ljbGVzRG9uZTogdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duLFxuICAgICAgICAgICAgY3ljbGVzUmVtYWluaW5nOiByZW1haW5pbmcsXG4gICAgICAgICAgICBtZXNzYWdlOiBgTWVkaXRhdGlvbiAoJHt0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd259LzEwKSAtICR7cmVtYWluaW5nfSBjeWNsZXMgbGVmdGAsXG4gICAgICAgICAgICBsb2NrZG93blJlZHVjZWQ6IGZhbHNlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGxheSA0MzIgSHogaGVhbGluZyBmcmVxdWVuY3kgZm9yIDEgc2Vjb25kXG4gICAgICovXG4gICAgcHJpdmF0ZSBwbGF5TWVkaXRhdGlvblNvdW5kKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgYXVkaW9Db250ZXh0ID0gbmV3ICh3aW5kb3cuQXVkaW9Db250ZXh0IHx8ICh3aW5kb3cgYXMgYW55KS53ZWJraXRBdWRpb0NvbnRleHQpKCk7XG4gICAgICAgICAgICBjb25zdCBvc2NpbGxhdG9yID0gYXVkaW9Db250ZXh0LmNyZWF0ZU9zY2lsbGF0b3IoKTtcbiAgICAgICAgICAgIGNvbnN0IGdhaW5Ob2RlID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgb3NjaWxsYXRvci5mcmVxdWVuY3kudmFsdWUgPSA0MzI7XG4gICAgICAgICAgICBvc2NpbGxhdG9yLnR5cGUgPSBcInNpbmVcIjtcbiAgICAgICAgICAgIGdhaW5Ob2RlLmdhaW4uc2V0VmFsdWVBdFRpbWUoMC4zLCBhdWRpb0NvbnRleHQuY3VycmVudFRpbWUpO1xuICAgICAgICAgICAgZ2Fpbk5vZGUuZ2Fpbi5leHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lKDAuMDEsIGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZSArIDEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBvc2NpbGxhdG9yLmNvbm5lY3QoZ2Fpbk5vZGUpO1xuICAgICAgICAgICAgZ2Fpbk5vZGUuY29ubmVjdChhdWRpb0NvbnRleHQuZGVzdGluYXRpb24pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBvc2NpbGxhdG9yLnN0YXJ0KGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZSk7XG4gICAgICAgICAgICBvc2NpbGxhdG9yLnN0b3AoYXVkaW9Db250ZXh0LmN1cnJlbnRUaW1lICsgMSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW8gbm90IGF2YWlsYWJsZSBmb3IgbWVkaXRhdGlvblwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBtZWRpdGF0aW9uIHN0YXR1cyBmb3IgY3VycmVudCBsb2NrZG93blxuICAgICAqL1xuICAgIGdldE1lZGl0YXRpb25TdGF0dXMoKTogeyBjeWNsZXNEb25lOiBudW1iZXI7IGN5Y2xlc1JlbWFpbmluZzogbnVtYmVyOyB0aW1lUmVkdWNlZDogbnVtYmVyIH0ge1xuICAgICAgICBjb25zdCBjeWNsZXNEb25lID0gdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duO1xuICAgICAgICBjb25zdCBjeWNsZXNSZW1haW5pbmcgPSBNYXRoLm1heCgwLCAxMCAtIGN5Y2xlc0RvbmUpO1xuICAgICAgICBjb25zdCB0aW1lUmVkdWNlZCA9ICgxMCAtIGN5Y2xlc1JlbWFpbmluZykgKiAzMDsgLy8gMzAgbWluIHBlciBjeWNsZVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGN5Y2xlc0RvbmUsXG4gICAgICAgICAgICBjeWNsZXNSZW1haW5pbmcsXG4gICAgICAgICAgICB0aW1lUmVkdWNlZFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlc2V0IGRlbGV0aW9uIHF1b3RhIGlmIG5ldyBkYXlcbiAgICAgKi9cbiAgICBwcml2YXRlIGVuc3VyZURlbGV0aW9uUXVvdGFSZXNldCgpIHtcbiAgICAgICAgY29uc3QgdG9kYXkgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubGFzdERlbGV0aW9uUmVzZXQgIT09IHRvZGF5KSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxhc3REZWxldGlvblJlc2V0ID0gdG9kYXk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkgPSAwO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdXNlciBoYXMgZnJlZSBkZWxldGlvbnMgbGVmdCB0b2RheVxuICAgICAqL1xuICAgIGNhbkRlbGV0ZVF1ZXN0RnJlZSgpOiBib29sZWFuIHtcbiAgICAgICAgdGhpcy5lbnN1cmVEZWxldGlvblF1b3RhUmVzZXQoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSA8IDM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGRlbGV0aW9uIHF1b3RhIHN0YXR1c1xuICAgICAqL1xuICAgIGdldERlbGV0aW9uUXVvdGEoKTogeyBmcmVlOiBudW1iZXI7IHBhaWQ6IG51bWJlcjsgcmVtYWluaW5nOiBudW1iZXIgfSB7XG4gICAgICAgIHRoaXMuZW5zdXJlRGVsZXRpb25RdW90YVJlc2V0KCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZW1haW5pbmcgPSBNYXRoLm1heCgwLCAzIC0gdGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5KTtcbiAgICAgICAgY29uc3QgcGFpZCA9IE1hdGgubWF4KDAsIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSAtIDMpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGZyZWU6IHJlbWFpbmluZyxcbiAgICAgICAgICAgIHBhaWQ6IHBhaWQsXG4gICAgICAgICAgICByZW1haW5pbmc6IHJlbWFpbmluZ1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgY29zdCBvZiB0aGUgbmV4dCBkZWxldGlvbiB3aXRob3V0IG11dGF0aW5nIHN0YXRlLlxuICAgICAqIFVzZSB0aGlzIHRvIGNoZWNrIGFmZm9yZGFiaWxpdHkgYmVmb3JlIGNhbGxpbmcgYXBwbHlEZWxldGlvbkNvc3QuXG4gICAgICovXG4gICAgZ2V0RGVsZXRpb25Db3N0KCk6IHsgY29zdDogbnVtYmVyOyBtZXNzYWdlOiBzdHJpbmcgfSB7XG4gICAgICAgIHRoaXMuZW5zdXJlRGVsZXRpb25RdW90YVJlc2V0KCk7XG5cbiAgICAgICAgbGV0IGNvc3QgPSAwO1xuICAgICAgICBsZXQgbWVzc2FnZSA9IFwiXCI7XG5cbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSA+PSAzKSB7XG4gICAgICAgICAgICBjb3N0ID0gMTA7XG4gICAgICAgICAgICBtZXNzYWdlID0gYFF1ZXN0IGRlbGV0ZWQuIENvc3Q6IC0ke2Nvc3R9Z2A7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCByZW1haW5pbmcgPSAzIC0gdGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5O1xuICAgICAgICAgICAgbWVzc2FnZSA9IGBRdWVzdCBkZWxldGVkLiAoJHtyZW1haW5pbmcgLSAxfSBmcmVlIGRlbGV0aW9ucyByZW1haW5pbmcpYDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7IGNvc3QsIG1lc3NhZ2UgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBcHBseSBkZWxldGlvbjogaW5jcmVtZW50IHF1b3RhIGFuZCBjaGFyZ2UgZ29sZC4gQ2FsbCBvbmx5IGFmdGVyIGNoZWNraW5nIGdldERlbGV0aW9uQ29zdCgpLlxuICAgICAqIFJldHVybnM6IHsgY29zdCwgbWVzc2FnZSB9XG4gICAgICovXG4gICAgYXBwbHlEZWxldGlvbkNvc3QoKTogeyBjb3N0OiBudW1iZXI7IG1lc3NhZ2U6IHN0cmluZyB9IHtcbiAgICAgICAgY29uc3QgeyBjb3N0LCBtZXNzYWdlIH0gPSB0aGlzLmdldERlbGV0aW9uQ29zdCgpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkrKztcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5nb2xkIC09IGNvc3Q7XG4gICAgICAgIHJldHVybiB7IGNvc3QsIG1lc3NhZ2UgfTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBBcHAsIFRGaWxlLCBOb3RpY2UgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBSZXNlYXJjaFF1ZXN0IH0gZnJvbSAnLi4vdHlwZXMnO1xuXG5leHBvcnQgY2xhc3MgUmVzZWFyY2hFbmdpbmUge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIGF1ZGlvQ29udHJvbGxlcj86IGFueTtcbiAgICBhcHA6IEFwcDsgLy8gQWRkZWQgQXBwIHJlZmVyZW5jZSBmb3IgZmlsZSBvcGVyYXRpb25zXG5cbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncywgYXBwOiBBcHAsIGF1ZGlvQ29udHJvbGxlcj86IGFueSkge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgICAgIHRoaXMuYXBwID0gYXBwO1xuICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlciA9IGF1ZGlvQ29udHJvbGxlcjtcbiAgICB9XG5cbiAgICBhc3luYyBjcmVhdGVSZXNlYXJjaFF1ZXN0KHRpdGxlOiBzdHJpbmcsIHR5cGU6IFwic3VydmV5XCIgfCBcImRlZXBfZGl2ZVwiLCBsaW5rZWRTa2lsbDogc3RyaW5nLCBsaW5rZWRDb21iYXRRdWVzdDogc3RyaW5nKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgcXVlc3RJZD86IHN0cmluZyB9PiB7XG4gICAgICAgIC8vIFtGSVhdIEFsbG93IGZpcnN0IHJlc2VhcmNoIHF1ZXN0IGZvciBmcmVlIChDb2xkIFN0YXJ0KSwgb3RoZXJ3aXNlIGVuZm9yY2UgMjoxXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMudG90YWxSZXNlYXJjaCA+IDAgJiYgIXRoaXMuY2FuQ3JlYXRlUmVzZWFyY2hRdWVzdCgpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiUkVTRUFSQ0ggQkxPQ0tFRDogQ29tcGxldGUgMiBjb21iYXQgcXVlc3RzIHBlciByZXNlYXJjaCBxdWVzdFwiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCB3b3JkTGltaXQgPSB0eXBlID09PSBcInN1cnZleVwiID8gMjAwIDogNDAwO1xuICAgICAgICBjb25zdCBxdWVzdElkID0gYHJlc2VhcmNoXyR7KHRoaXMuc2V0dGluZ3MubGFzdFJlc2VhcmNoUXVlc3RJZCB8fCAwKSArIDF9YDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJlc2VhcmNoUXVlc3Q6IFJlc2VhcmNoUXVlc3QgPSB7XG4gICAgICAgICAgICBpZDogcXVlc3RJZCxcbiAgICAgICAgICAgIHRpdGxlOiB0aXRsZSxcbiAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICBsaW5rZWRTa2lsbDogbGlua2VkU2tpbGwsXG4gICAgICAgICAgICB3b3JkTGltaXQ6IHdvcmRMaW1pdCxcbiAgICAgICAgICAgIHdvcmRDb3VudDogMCxcbiAgICAgICAgICAgIGxpbmtlZENvbWJhdFF1ZXN0OiBsaW5rZWRDb21iYXRRdWVzdCxcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgY29tcGxldGVkOiBmYWxzZVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFtGSVhdIENyZWF0ZSBhY3R1YWwgTWFya2Rvd24gZmlsZVxuICAgICAgICBjb25zdCBmb2xkZXJQYXRoID0gXCJBY3RpdmVfUnVuL1Jlc2VhcmNoXCI7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZvbGRlclBhdGgpKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZm9sZGVyUGF0aCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzYWZlVGl0bGUgPSB0aXRsZS5yZXBsYWNlKC9bXmEtejAtOV0vZ2ksICdfJykudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBgJHtmb2xkZXJQYXRofS8ke3NhZmVUaXRsZX0ubWRgO1xuICAgICAgICBjb25zdCBjb250ZW50ID0gYC0tLVxudHlwZTogcmVzZWFyY2hcbnJlc2VhcmNoX2lkOiAke3F1ZXN0SWR9XG5zdGF0dXM6IGFjdGl2ZVxubGlua2VkX3NraWxsOiAke2xpbmtlZFNraWxsfVxud29yZF9saW1pdDogJHt3b3JkTGltaXR9XG5jcmVhdGVkOiAke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKX1cbi0tLVxuIyDwn5OaICR7dGl0bGV9XG4+IFshSU5GT10gUmVzZWFyY2ggR3VpZGVsaW5lc1xuPiAqKlR5cGU6KiogJHt0eXBlfSB8ICoqVGFyZ2V0OioqICR7d29yZExpbWl0fSB3b3Jkc1xuPiAqKkxpbmtlZCBTa2lsbDoqKiAke2xpbmtlZFNraWxsfVxuXG5Xcml0ZSB5b3VyIHJlc2VhcmNoIGhlcmUuLi5cbmA7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShmaWxlbmFtZSwgY29udGVudCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJFcnJvciBjcmVhdGluZyByZXNlYXJjaCBmaWxlLiBDaGVjayBjb25zb2xlLlwiKTtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMucHVzaChyZXNlYXJjaFF1ZXN0KTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0UmVzZWFyY2hRdWVzdElkID0gcGFyc2VJbnQocXVlc3RJZC5zcGxpdCgnXycpWzFdKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnRvdGFsUmVzZWFyY2grKztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogYFJlc2VhcmNoIFF1ZXN0IENyZWF0ZWQ6ICR7dHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IFwiU3VydmV5XCIgOiBcIkRlZXAgRGl2ZVwifWAsXG4gICAgICAgICAgICBxdWVzdElkOiBxdWVzdElkXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgY29tcGxldGVSZXNlYXJjaFF1ZXN0KHF1ZXN0SWQ6IHN0cmluZywgZmluYWxXb3JkQ291bnQ6IG51bWJlcik6IHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyB4cFJld2FyZDogbnVtYmVyOyBnb2xkUGVuYWx0eTogbnVtYmVyIH0ge1xuICAgICAgICBjb25zdCByZXNlYXJjaFF1ZXN0ID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maW5kKHEgPT4gcS5pZCA9PT0gcXVlc3RJZCk7XG4gICAgICAgIGlmICghcmVzZWFyY2hRdWVzdCkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiUmVzZWFyY2ggcXVlc3Qgbm90IGZvdW5kXCIsIHhwUmV3YXJkOiAwLCBnb2xkUGVuYWx0eTogMCB9O1xuICAgICAgICBpZiAocmVzZWFyY2hRdWVzdC5jb21wbGV0ZWQpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIlF1ZXN0IGFscmVhZHkgY29tcGxldGVkXCIsIHhwUmV3YXJkOiAwLCBnb2xkUGVuYWx0eTogMCB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgbWluV29yZHMgPSBNYXRoLmNlaWwocmVzZWFyY2hRdWVzdC53b3JkTGltaXQgKiAwLjgpO1xuICAgICAgICBpZiAoZmluYWxXb3JkQ291bnQgPCBtaW5Xb3Jkcykge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IGBUb28gc2hvcnQhIE5lZWQgJHttaW5Xb3Jkc30gd29yZHMuYCwgeHBSZXdhcmQ6IDAsIGdvbGRQZW5hbHR5OiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChmaW5hbFdvcmRDb3VudCA+IHJlc2VhcmNoUXVlc3Qud29yZExpbWl0ICogMS4yNSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IGBUb28gbG9uZyEgTWF4ICR7TWF0aC5jZWlsKHJlc2VhcmNoUXVlc3Qud29yZExpbWl0ICogMS4yNSl9IHdvcmRzLmAsIHhwUmV3YXJkOiAwLCBnb2xkUGVuYWx0eTogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBsZXQgeHBSZXdhcmQgPSByZXNlYXJjaFF1ZXN0LnR5cGUgPT09IFwic3VydmV5XCIgPyA1IDogMjA7XG4gICAgICAgIGxldCBnb2xkUGVuYWx0eSA9IDA7XG4gICAgICAgIGlmIChmaW5hbFdvcmRDb3VudCA+IHJlc2VhcmNoUXVlc3Qud29yZExpbWl0KSB7XG4gICAgICAgICAgICBjb25zdCBvdmVyYWdlUGVyY2VudCA9ICgoZmluYWxXb3JkQ291bnQgLSByZXNlYXJjaFF1ZXN0LndvcmRMaW1pdCkgLyByZXNlYXJjaFF1ZXN0LndvcmRMaW1pdCkgKiAxMDA7XG4gICAgICAgICAgICBnb2xkUGVuYWx0eSA9IE1hdGguZmxvb3IoMjAgKiAob3ZlcmFnZVBlcmNlbnQgLyAxMDApKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2tpbGwgPSB0aGlzLnNldHRpbmdzLnNraWxscy5maW5kKHMgPT4gcy5uYW1lID09PSByZXNlYXJjaFF1ZXN0LmxpbmtlZFNraWxsKTtcbiAgICAgICAgaWYgKHNraWxsKSB7XG4gICAgICAgICAgICBza2lsbC54cCArPSB4cFJld2FyZDtcbiAgICAgICAgICAgIGlmIChza2lsbC54cCA+PSBza2lsbC54cFJlcSkgeyBza2lsbC5sZXZlbCsrOyBza2lsbC54cCA9IDA7IH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5nb2xkIC09IGdvbGRQZW5hbHR5O1xuICAgICAgICByZXNlYXJjaFF1ZXN0LmNvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgIHJlc2VhcmNoUXVlc3QuY29tcGxldGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy5yZXNlYXJjaENvbXBsZXRlZCsrO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyPy5wbGF5U291bmQpIHRoaXMuYXVkaW9Db250cm9sbGVyLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgIFxuICAgICAgICBsZXQgbWVzc2FnZSA9IGBSZXNlYXJjaCBDb21wbGV0ZSEgKyR7eHBSZXdhcmR9IFhQYDtcbiAgICAgICAgaWYgKGdvbGRQZW5hbHR5ID4gMCkgbWVzc2FnZSArPSBgICgtJHtnb2xkUGVuYWx0eX1nIHRheClgO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZSwgeHBSZXdhcmQsIGdvbGRQZW5hbHR5IH07XG4gICAgfVxuXG4gICAgYXN5bmMgZGVsZXRlUmVzZWFyY2hRdWVzdChxdWVzdElkOiBzdHJpbmcpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nIH0+IHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbmRJbmRleChxID0+IHEuaWQgPT09IHF1ZXN0SWQpO1xuICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdCA9IHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHNbaW5kZXhdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBbRklYXSBUcnkgdG8gZmluZCBhbmQgZGVsZXRlIHRoZSBmaWxlXG4gICAgICAgICAgICBjb25zdCBmaWxlcyA9IHRoaXMuYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKTtcbiAgICAgICAgICAgIGNvbnN0IGZpbGUgPSBmaWxlcy5maW5kKGYgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhY2hlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhY2hlPy5mcm9udG1hdHRlcj8ucmVzZWFyY2hfaWQgPT09IHF1ZXN0SWQ7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKGZpbGUpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5kZWxldGUoZmlsZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIGlmICghcXVlc3QuY29tcGxldGVkKSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMudG90YWxSZXNlYXJjaCA9IE1hdGgubWF4KDAsIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy50b3RhbFJlc2VhcmNoIC0gMSk7XG4gICAgICAgICAgICBlbHNlIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy5yZXNlYXJjaENvbXBsZXRlZCA9IE1hdGgubWF4KDAsIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy5yZXNlYXJjaENvbXBsZXRlZCAtIDEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBcIlJlc2VhcmNoIGRlbGV0ZWRcIiB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIk5vdCBmb3VuZFwiIH07XG4gICAgfVxuXG4gICAgdXBkYXRlUmVzZWFyY2hXb3JkQ291bnQocXVlc3RJZDogc3RyaW5nLCBuZXdXb3JkQ291bnQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCByZXNlYXJjaFF1ZXN0ID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maW5kKHEgPT4gcS5pZCA9PT0gcXVlc3RJZCk7XG4gICAgICAgIGlmIChyZXNlYXJjaFF1ZXN0KSB7XG4gICAgICAgICAgICByZXNlYXJjaFF1ZXN0LndvcmRDb3VudCA9IG5ld1dvcmRDb3VudDtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBnZXRSZXNlYXJjaFJhdGlvKCkge1xuICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cztcbiAgICAgICAgY29uc3QgcmF0aW8gPSBzdGF0cy50b3RhbENvbWJhdCAvIE1hdGgubWF4KDEsIHN0YXRzLnRvdGFsUmVzZWFyY2gpO1xuICAgICAgICByZXR1cm4geyBjb21iYXQ6IHN0YXRzLnRvdGFsQ29tYmF0LCByZXNlYXJjaDogc3RhdHMudG90YWxSZXNlYXJjaCwgcmF0aW86IHJhdGlvLnRvRml4ZWQoMikgfTtcbiAgICB9XG5cbiAgICBjYW5DcmVhdGVSZXNlYXJjaFF1ZXN0KCk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cztcbiAgICAgICAgY29uc3QgcmF0aW8gPSBzdGF0cy50b3RhbENvbWJhdCAvIE1hdGgubWF4KDEsIHN0YXRzLnRvdGFsUmVzZWFyY2gpO1xuICAgICAgICByZXR1cm4gcmF0aW8gPj0gMjtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBRdWVzdENoYWluLCBRdWVzdENoYWluUmVjb3JkIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG4vKipcbiAqIERMQyA0OiBRdWVzdCBDaGFpbnMgRW5naW5lXG4gKiBIYW5kbGVzIG11bHRpLXF1ZXN0IHNlcXVlbmNlcyB3aXRoIG9yZGVyaW5nLCBsb2NraW5nLCBhbmQgY29tcGxldGlvbiB0cmFja2luZ1xuICogXG4gKiBJU09MQVRFRDogT25seSByZWFkcy93cml0ZXMgdG8gYWN0aXZlQ2hhaW5zLCBjaGFpbkhpc3RvcnksIGN1cnJlbnRDaGFpbklkLCBjaGFpblF1ZXN0c0NvbXBsZXRlZFxuICogREVQRU5ERU5DSUVTOiBTaXN5cGh1c1NldHRpbmdzIHR5cGVzXG4gKiBJTlRFR1JBVElPTiBQT0lOVFM6IE5lZWRzIHRvIGhvb2sgaW50byBjb21wbGV0ZVF1ZXN0KCkgaW4gbWFpbiBlbmdpbmUgZm9yIGNoYWluIHByb2dyZXNzaW9uXG4gKi9cbmV4cG9ydCBjbGFzcyBDaGFpbnNFbmdpbmUge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIGF1ZGlvQ29udHJvbGxlcj86IGFueTtcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzLCBhdWRpb0NvbnRyb2xsZXI/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlciA9IGF1ZGlvQ29udHJvbGxlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgcXVlc3QgY2hhaW5cbiAgICAgKi9cbiAgICBhc3luYyBjcmVhdGVRdWVzdENoYWluKG5hbWU6IHN0cmluZywgcXVlc3ROYW1lczogc3RyaW5nW10pOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyBjaGFpbklkPzogc3RyaW5nIH0+IHtcbiAgICAgICAgaWYgKHF1ZXN0TmFtZXMubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIkNoYWluIG11c3QgaGF2ZSBhdCBsZWFzdCAyIHF1ZXN0c1wiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjaGFpbklkID0gYGNoYWluXyR7RGF0ZS5ub3coKX1gO1xuICAgICAgICBjb25zdCBjaGFpbjogUXVlc3RDaGFpbiA9IHtcbiAgICAgICAgICAgIGlkOiBjaGFpbklkLFxuICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgIHF1ZXN0czogcXVlc3ROYW1lcyxcbiAgICAgICAgICAgIGN1cnJlbnRJbmRleDogMCxcbiAgICAgICAgICAgIGNvbXBsZXRlZDogZmFsc2UsXG4gICAgICAgICAgICBzdGFydGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGlzQm9zczogcXVlc3ROYW1lc1txdWVzdE5hbWVzLmxlbmd0aCAtIDFdLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoXCJib3NzXCIpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5wdXNoKGNoYWluKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jdXJyZW50Q2hhaW5JZCA9IGNoYWluSWQ7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBDaGFpbiBjcmVhdGVkOiAke25hbWV9ICgke3F1ZXN0TmFtZXMubGVuZ3RofSBxdWVzdHMpYCxcbiAgICAgICAgICAgIGNoYWluSWQ6IGNoYWluSWRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIGN1cnJlbnQgYWN0aXZlIGNoYWluXG4gICAgICovXG4gICAgZ2V0QWN0aXZlQ2hhaW4oKTogUXVlc3RDaGFpbiB8IG51bGwge1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuY3VycmVudENoYWluSWQpIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5maW5kKGMgPT4gYy5pZCA9PT0gdGhpcy5zZXR0aW5ncy5jdXJyZW50Q2hhaW5JZCk7XG4gICAgICAgIHJldHVybiAoY2hhaW4gJiYgIWNoYWluLmNvbXBsZXRlZCkgPyBjaGFpbiA6IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBuZXh0IHF1ZXN0IHRoYXQgc2hvdWxkIGJlIGNvbXBsZXRlZCBpbiB0aGUgYWN0aXZlIGNoYWluXG4gICAgICovXG4gICAgZ2V0TmV4dFF1ZXN0SW5DaGFpbigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIGlmICghY2hhaW4pIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNoYWluLnF1ZXN0c1tjaGFpbi5jdXJyZW50SW5kZXhdIHx8IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgYSBxdWVzdCBpcyBwYXJ0IG9mIGFuIGFjdGl2ZSAoaW5jb21wbGV0ZSkgY2hhaW5cbiAgICAgKi9cbiAgICBpc1F1ZXN0SW5DaGFpbihxdWVzdE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zLmZpbmQoYyA9PiAhYy5jb21wbGV0ZWQpO1xuICAgICAgICBpZiAoIWNoYWluKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiBjaGFpbi5xdWVzdHMuaW5jbHVkZXMocXVlc3ROYW1lKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBhIHF1ZXN0IGNhbiBiZSBzdGFydGVkIChpcyBpdCB0aGUgbmV4dCBxdWVzdCBpbiB0aGUgY2hhaW4/KVxuICAgICAqL1xuICAgIGNhblN0YXJ0UXVlc3QocXVlc3ROYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIGlmICghY2hhaW4pIHJldHVybiB0cnVlOyAvLyBOb3QgaW4gYSBjaGFpbiwgY2FuIHN0YXJ0IGFueSBxdWVzdFxuICAgICAgICBcbiAgICAgICAgY29uc3QgbmV4dFF1ZXN0ID0gdGhpcy5nZXROZXh0UXVlc3RJbkNoYWluKCk7XG4gICAgICAgIHJldHVybiBuZXh0UXVlc3QgPT09IHF1ZXN0TmFtZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNYXJrIGEgcXVlc3QgYXMgY29tcGxldGVkIGluIHRoZSBjaGFpblxuICAgICAqIEFkdmFuY2VzIGNoYWluIGlmIHN1Y2Nlc3NmdWwsIGF3YXJkcyBib251cyBYUCBpZiBjaGFpbiBjb21wbGV0ZXNcbiAgICAgKi9cbiAgICBhc3luYyBjb21wbGV0ZUNoYWluUXVlc3QocXVlc3ROYW1lOiBzdHJpbmcpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyBjaGFpbkNvbXBsZXRlOiBib29sZWFuOyBib251c1hwOiBudW1iZXIgfT4ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiTm8gYWN0aXZlIGNoYWluXCIsIGNoYWluQ29tcGxldGU6IGZhbHNlLCBib251c1hwOiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRRdWVzdCA9IGNoYWluLnF1ZXN0c1tjaGFpbi5jdXJyZW50SW5kZXhdO1xuICAgICAgICBpZiAoY3VycmVudFF1ZXN0ICE9PSBxdWVzdE5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogXCJRdWVzdCBpcyBub3QgbmV4dCBpbiBjaGFpblwiLFxuICAgICAgICAgICAgICAgIGNoYWluQ29tcGxldGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGJvbnVzWHA6IDBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNoYWluLmN1cnJlbnRJbmRleCsrO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmNoYWluUXVlc3RzQ29tcGxldGVkKys7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBjaGFpbiBpcyBjb21wbGV0ZVxuICAgICAgICBpZiAoY2hhaW4uY3VycmVudEluZGV4ID49IGNoYWluLnF1ZXN0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBsZXRlQ2hhaW4oY2hhaW4pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZW1haW5pbmcgPSBjaGFpbi5xdWVzdHMubGVuZ3RoIC0gY2hhaW4uY3VycmVudEluZGV4O1xuICAgICAgICBjb25zdCBwZXJjZW50ID0gTWF0aC5mbG9vcigoY2hhaW4uY3VycmVudEluZGV4IC8gY2hhaW4ucXVlc3RzLmxlbmd0aCkgKiAxMDApO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBgQ2hhaW4gcHJvZ3Jlc3M6ICR7Y2hhaW4uY3VycmVudEluZGV4fS8ke2NoYWluLnF1ZXN0cy5sZW5ndGh9ICgke3JlbWFpbmluZ30gcmVtYWluaW5nLCAke3BlcmNlbnR9JSBjb21wbGV0ZSlgLFxuICAgICAgICAgICAgY2hhaW5Db21wbGV0ZTogZmFsc2UsXG4gICAgICAgICAgICBib251c1hwOiAwXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29tcGxldGUgdGhlIGVudGlyZSBjaGFpblxuICAgICAqL1xuICAgIHByaXZhdGUgYXN5bmMgY29tcGxldGVDaGFpbihjaGFpbjogUXVlc3RDaGFpbik6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmc7IGNoYWluQ29tcGxldGU6IGJvb2xlYW47IGJvbnVzWHA6IG51bWJlciB9PiB7XG4gICAgICAgIGNoYWluLmNvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgIGNoYWluLmNvbXBsZXRlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYm9udXNYcCA9IDEwMDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy54cCArPSBib251c1hwO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVjb3JkOiBRdWVzdENoYWluUmVjb3JkID0ge1xuICAgICAgICAgICAgY2hhaW5JZDogY2hhaW4uaWQsXG4gICAgICAgICAgICBjaGFpbk5hbWU6IGNoYWluLm5hbWUsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0czogY2hhaW4ucXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIGNvbXBsZXRlZEF0OiBjaGFpbi5jb21wbGV0ZWRBdCxcbiAgICAgICAgICAgIHhwRWFybmVkOiBib251c1hwXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeS5wdXNoKHJlY29yZCk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5hdWRpb0NvbnRyb2xsZXI/LnBsYXlTb3VuZCkge1xuICAgICAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBgQ2hhaW4gY29tcGxldGU6ICR7Y2hhaW4ubmFtZX0hICske2JvbnVzWHB9IFhQIEJvbnVzYCxcbiAgICAgICAgICAgIGNoYWluQ29tcGxldGU6IHRydWUsXG4gICAgICAgICAgICBib251c1hwOiBib251c1hwXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQnJlYWsgYW4gYWN0aXZlIGNoYWluXG4gICAgICogS2VlcHMgZWFybmVkIFhQIGZyb20gY29tcGxldGVkIHF1ZXN0c1xuICAgICAqL1xuICAgIGFzeW5jIGJyZWFrQ2hhaW4oKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgeHBLZXB0OiBudW1iZXIgfT4ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiTm8gYWN0aXZlIGNoYWluIHRvIGJyZWFrXCIsIHhwS2VwdDogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb21wbGV0ZWQgPSBjaGFpbi5jdXJyZW50SW5kZXg7XG4gICAgICAgIGNvbnN0IHhwS2VwdCA9IGNvbXBsZXRlZCAqIDEwOyAvLyBBcHByb3hpbWF0ZSBYUCBmcm9tIGVhY2ggcXVlc3RcbiAgICAgICAgXG4gICAgICAgIC8vIFNhdmUgdG8gaGlzdG9yeSBhcyBicm9rZW5cbiAgICAgICAgY29uc3QgcmVjb3JkOiBRdWVzdENoYWluUmVjb3JkID0ge1xuICAgICAgICAgICAgY2hhaW5JZDogY2hhaW4uaWQsXG4gICAgICAgICAgICBjaGFpbk5hbWU6IGNoYWluLm5hbWUsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0czogY2hhaW4ucXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIGNvbXBsZXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICB4cEVhcm5lZDogeHBLZXB0XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeS5wdXNoKHJlY29yZCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zID0gdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMuZmlsdGVyKGMgPT4gYy5pZCAhPT0gY2hhaW4uaWQpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmN1cnJlbnRDaGFpbklkID0gXCJcIjtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogYENoYWluIGJyb2tlbjogJHtjaGFpbi5uYW1lfS4gS2VwdCAke2NvbXBsZXRlZH0gcXVlc3QgY29tcGxldGlvbnMgKCR7eHBLZXB0fSBYUCkuYCxcbiAgICAgICAgICAgIHhwS2VwdDogeHBLZXB0XG4gICAgICAgIH07XG4gICAgfVxuICAvKipcbiAgICAgKiBIYW5kbGUgZmlsZSByZW5hbWUgZXZlbnRzIHRvIGtlZXAgY2hhaW5zIGludGFjdFxuICAgICAqIEBwYXJhbSBvbGROYW1lIFRoZSBwcmV2aW91cyBiYXNlbmFtZSBvZiB0aGUgZmlsZVxuICAgICAqIEBwYXJhbSBuZXdOYW1lIFRoZSBuZXcgYmFzZW5hbWUgb2YgdGhlIGZpbGVcbiAgICAgKi9cbiAgICBoYW5kbGVSZW5hbWUob2xkTmFtZTogc3RyaW5nLCBuZXdOYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgbGV0IGNoYW5nZXNNYWRlID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMuZm9yRWFjaChjaGFpbiA9PiB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGNoYWluIGNvbnRhaW5zIHRoZSBvbGQgcXVlc3QgbmFtZVxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBjaGFpbi5xdWVzdHMuaW5kZXhPZihvbGROYW1lKTtcbiAgICAgICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAvLyBSZXBsYWNlIHdpdGggbmV3IG5hbWVcbiAgICAgICAgICAgICAgICBjaGFpbi5xdWVzdHNbaW5kZXhdID0gbmV3TmFtZTtcbiAgICAgICAgICAgICAgICBjaGFuZ2VzTWFkZSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFsc28gY2hlY2sgaGlzdG9yeSAob3B0aW9uYWwsIGJ1dCBnb29kIGZvciBkYXRhIGludGVncml0eSlcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jaGFpbkhpc3RvcnkuZm9yRWFjaChyZWNvcmQgPT4ge1xuICAgICAgICAgICAgLy8gSWYgeW91IHN0b3JlIHF1ZXN0IGxpc3RzIGluIGhpc3RvcnkgbGF0ZXIsIHVwZGF0ZSB0aGVtIGhlcmUuXG4gICAgICAgICAgICAvLyBDdXJyZW50bHkgaGlzdG9yeSBpcyBqdXN0IHN1bW1hcnkgZGF0YSwgc28gc3RyaWN0bHkgbm90IG5lZWRlZCB5ZXQsXG4gICAgICAgICAgICAvLyBidXQgZ29vZCB0byBrZWVwIGluIG1pbmQuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChjaGFuZ2VzTWFkZSkge1xuICAgICAgICAgICAgLy8gVXNpbmcgY29uc29sZSBsb2cgZm9yIGRlYnVnLCBOb3RpY2UgbWlnaHQgYmUgdG9vIHNwYW1teSBkdXJpbmcgYmF0Y2ggcmVuYW1lc1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFtTaXN5cGh1c10gVXBkYXRlZCBjaGFpbnMgZm9yIHJlbmFtZTogJHtvbGROYW1lfSAtPiAke25ld05hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcHJvZ3Jlc3Mgb2YgYWN0aXZlIGNoYWluXG4gICAgICovXG4gICAgZ2V0Q2hhaW5Qcm9ncmVzcygpOiB7IGNvbXBsZXRlZDogbnVtYmVyOyB0b3RhbDogbnVtYmVyOyBwZXJjZW50OiBudW1iZXIgfSB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5nZXRBY3RpdmVDaGFpbigpO1xuICAgICAgICBpZiAoIWNoYWluKSByZXR1cm4geyBjb21wbGV0ZWQ6IDAsIHRvdGFsOiAwLCBwZXJjZW50OiAwIH07XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY29tcGxldGVkOiBjaGFpbi5jdXJyZW50SW5kZXgsXG4gICAgICAgICAgICB0b3RhbDogY2hhaW4ucXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIHBlcmNlbnQ6IE1hdGguZmxvb3IoKGNoYWluLmN1cnJlbnRJbmRleCAvIGNoYWluLnF1ZXN0cy5sZW5ndGgpICogMTAwKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgY29tcGxldGVkIGNoYWluIHJlY29yZHMgKGhpc3RvcnkpXG4gICAgICovXG4gICAgZ2V0Q2hhaW5IaXN0b3J5KCk6IFF1ZXN0Q2hhaW5SZWNvcmRbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIGFjdGl2ZSBjaGFpbnMgKG5vdCBjb21wbGV0ZWQpXG4gICAgICovXG4gICAgZ2V0QWN0aXZlQ2hhaW5zKCk6IFF1ZXN0Q2hhaW5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5maWx0ZXIoYyA9PiAhYy5jb21wbGV0ZWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBkZXRhaWxlZCBzdGF0ZSBvZiBhY3RpdmUgY2hhaW4gKGZvciBVSSByZW5kZXJpbmcpXG4gICAgICovXG4gICAgZ2V0Q2hhaW5EZXRhaWxzKCk6IHtcbiAgICAgICAgY2hhaW46IFF1ZXN0Q2hhaW4gfCBudWxsO1xuICAgICAgICBwcm9ncmVzczogeyBjb21wbGV0ZWQ6IG51bWJlcjsgdG90YWw6IG51bWJlcjsgcGVyY2VudDogbnVtYmVyIH07XG4gICAgICAgIHF1ZXN0U3RhdGVzOiBBcnJheTx7IHF1ZXN0OiBzdHJpbmc7IHN0YXR1czogJ2NvbXBsZXRlZCcgfCAnYWN0aXZlJyB8ICdsb2NrZWQnIH0+O1xuICAgIH0ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikge1xuICAgICAgICAgICAgcmV0dXJuIHsgY2hhaW46IG51bGwsIHByb2dyZXNzOiB7IGNvbXBsZXRlZDogMCwgdG90YWw6IDAsIHBlcmNlbnQ6IDAgfSwgcXVlc3RTdGF0ZXM6IFtdIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHByb2dyZXNzID0gdGhpcy5nZXRDaGFpblByb2dyZXNzKCk7XG4gICAgICAgIGNvbnN0IHF1ZXN0U3RhdGVzID0gY2hhaW4ucXVlc3RzLm1hcCgocXVlc3QsIGlkeCkgPT4ge1xuICAgICAgICAgICAgaWYgKGlkeCA8IGNoYWluLmN1cnJlbnRJbmRleCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHF1ZXN0LCBzdGF0dXM6ICdjb21wbGV0ZWQnIGFzIGNvbnN0IH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlkeCA9PT0gY2hhaW4uY3VycmVudEluZGV4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgcXVlc3QsIHN0YXR1czogJ2FjdGl2ZScgYXMgY29uc3QgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgcXVlc3QsIHN0YXR1czogJ2xvY2tlZCcgYXMgY29uc3QgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBjaGFpbiwgcHJvZ3Jlc3MsIHF1ZXN0U3RhdGVzIH07XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgVEZpbGUgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBDb250ZXh0RmlsdGVyLCBGaWx0ZXJTdGF0ZSwgRW5lcmd5TGV2ZWwsIFF1ZXN0Q29udGV4dCB9IGZyb20gJy4uL3R5cGVzJztcblxuLyoqXG4gKiBETEMgNTogQ29udGV4dCBGaWx0ZXJzIEVuZ2luZVxuICogSGFuZGxlcyBxdWVzdCBmaWx0ZXJpbmcgYnkgZW5lcmd5IGxldmVsLCBsb2NhdGlvbiBjb250ZXh0LCBhbmQgY3VzdG9tIHRhZ3NcbiAqIFxuICogSVNPTEFURUQ6IE9ubHkgcmVhZHMvd3JpdGVzIHRvIHF1ZXN0RmlsdGVycywgZmlsdGVyU3RhdGVcbiAqIERFUEVOREVOQ0lFUzogU2lzeXBodXNTZXR0aW5ncyB0eXBlcywgVEZpbGUgKGZvciBxdWVzdCBtZXRhZGF0YSlcbiAqIE5PVEU6IFRoaXMgaXMgcHJpbWFyaWx5IGEgVklFVyBMQVlFUiBjb25jZXJuLCBidXQga2VlcGluZyBsb2dpYyBpc29sYXRlZCBpcyBnb29kXG4gKi9cbmV4cG9ydCBjbGFzcyBGaWx0ZXJzRW5naW5lIHtcbiAgICBzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncztcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcbiAgICB9XG4gIC8qKlxuICAgICAqIEhhbmRsZSBmaWxlIHJlbmFtZSBldmVudHMgdG8gcHJlc2VydmUgZmlsdGVyc1xuICAgICAqIEBwYXJhbSBvbGROYW1lIFRoZSBwcmV2aW91cyBiYXNlbmFtZVxuICAgICAqIEBwYXJhbSBuZXdOYW1lIFRoZSBuZXcgYmFzZW5hbWVcbiAgICAgKi9cbiAgICBoYW5kbGVSZW5hbWUob2xkTmFtZTogc3RyaW5nLCBuZXdOYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZmlsdGVyRGF0YSA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW29sZE5hbWVdO1xuICAgICAgICBcbiAgICAgICAgaWYgKGZpbHRlckRhdGEpIHtcbiAgICAgICAgICAgIC8vIDEuIEFzc2lnbiBkYXRhIHRvIG5ldyBrZXlcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW25ld05hbWVdID0gZmlsdGVyRGF0YTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gMi4gRGVsZXRlIG9sZCBrZXlcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1tvbGROYW1lXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc29sZS5sb2coYFtTaXN5cGh1c10gVHJhbnNmZXJyZWQgZmlsdGVyczogJHtvbGROYW1lfSAtPiAke25ld05hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHYXJiYWdlIENvbGxlY3Rpb246IENsZWFuIHVwIGZpbHRlcnMgZm9yIGZpbGVzIHRoYXQgbm8gbG9uZ2VyIGV4aXN0XG4gICAgICogQ2FsbCB0aGlzIHNwYXJpbmdseSAoZS5nLiwgb24gcGx1Z2luIGxvYWQpXG4gICAgICovXG4gICAgY2xlYW51cE9ycGhhbnMoZXhpc3RpbmdGaWxlTmFtZXM6IHN0cmluZ1tdKSB7XG4gICAgICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVycyk7XG4gICAgICAgIGxldCBkZWxldGVkID0gMDtcbiAgICAgICAgXG4gICAgICAgIGtleXMuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKCFleGlzdGluZ0ZpbGVOYW1lcy5pbmNsdWRlcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW2tleV07XG4gICAgICAgICAgICAgICAgZGVsZXRlZCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChkZWxldGVkID4gMCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFtTaXN5cGh1c10gQ2xlYW5lZCB1cCAke2RlbGV0ZWR9IG9ycGhhbmVkIGZpbHRlciBlbnRyaWVzLmApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0IGZpbHRlciBmb3IgYSBzcGVjaWZpYyBxdWVzdFxuICAgICAqL1xuICAgIHNldFF1ZXN0RmlsdGVyKHF1ZXN0TmFtZTogc3RyaW5nLCBlbmVyZ3k6IEVuZXJneUxldmVsLCBjb250ZXh0OiBRdWVzdENvbnRleHQsIHRhZ3M6IHN0cmluZ1tdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV0gPSB7XG4gICAgICAgICAgICBlbmVyZ3lMZXZlbDogZW5lcmd5LFxuICAgICAgICAgICAgY29udGV4dDogY29udGV4dCxcbiAgICAgICAgICAgIHRhZ3M6IHRhZ3NcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgZmlsdGVyIGZvciBhIHNwZWNpZmljIHF1ZXN0XG4gICAgICovXG4gICAgZ2V0UXVlc3RGaWx0ZXIocXVlc3ROYW1lOiBzdHJpbmcpOiBDb250ZXh0RmlsdGVyIHwgbnVsbCB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdIHx8IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSBhY3RpdmUgZmlsdGVyIHN0YXRlXG4gICAgICovXG4gICAgc2V0RmlsdGVyU3RhdGUoZW5lcmd5OiBFbmVyZ3lMZXZlbCB8IFwiYW55XCIsIGNvbnRleHQ6IFF1ZXN0Q29udGV4dCB8IFwiYW55XCIsIHRhZ3M6IHN0cmluZ1tdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUgPSB7XG4gICAgICAgICAgICBhY3RpdmVFbmVyZ3k6IGVuZXJneSBhcyBhbnksXG4gICAgICAgICAgICBhY3RpdmVDb250ZXh0OiBjb250ZXh0IGFzIGFueSxcbiAgICAgICAgICAgIGFjdGl2ZVRhZ3M6IHRhZ3NcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCBmaWx0ZXIgc3RhdGVcbiAgICAgKi9cbiAgICBnZXRGaWx0ZXJTdGF0ZSgpOiBGaWx0ZXJTdGF0ZSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGEgcXVlc3QgbWF0Y2hlcyBjdXJyZW50IGZpbHRlciBzdGF0ZVxuICAgICAqL1xuICAgIHF1ZXN0TWF0Y2hlc0ZpbHRlcihxdWVzdE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBmaWx0ZXJzID0gdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZTtcbiAgICAgICAgY29uc3QgcXVlc3RGaWx0ZXIgPSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgbm8gZmlsdGVyIHNldCBmb3IgdGhpcyBxdWVzdCwgYWx3YXlzIHNob3dcbiAgICAgICAgaWYgKCFxdWVzdEZpbHRlcikgcmV0dXJuIHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmVyZ3kgZmlsdGVyXG4gICAgICAgIGlmIChmaWx0ZXJzLmFjdGl2ZUVuZXJneSAhPT0gXCJhbnlcIiAmJiBxdWVzdEZpbHRlci5lbmVyZ3lMZXZlbCAhPT0gZmlsdGVycy5hY3RpdmVFbmVyZ3kpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29udGV4dCBmaWx0ZXJcbiAgICAgICAgaWYgKGZpbHRlcnMuYWN0aXZlQ29udGV4dCAhPT0gXCJhbnlcIiAmJiBxdWVzdEZpbHRlci5jb250ZXh0ICE9PSBmaWx0ZXJzLmFjdGl2ZUNvbnRleHQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVGFncyBmaWx0ZXIgKHJlcXVpcmVzIEFOWSBvZiB0aGUgYWN0aXZlIHRhZ3MpXG4gICAgICAgIGlmIChmaWx0ZXJzLmFjdGl2ZVRhZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgaGFzVGFnID0gZmlsdGVycy5hY3RpdmVUYWdzLnNvbWUoKHRhZzogc3RyaW5nKSA9PiBxdWVzdEZpbHRlci50YWdzLmluY2x1ZGVzKHRhZykpO1xuICAgICAgICAgICAgaWYgKCFoYXNUYWcpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmlsdGVyIGEgbGlzdCBvZiBxdWVzdHMgYmFzZWQgb24gY3VycmVudCBmaWx0ZXIgc3RhdGVcbiAgICAgKi9cbiAgICBmaWx0ZXJRdWVzdHMocXVlc3RzOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+KTogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9PiB7XG4gICAgICAgIHJldHVybiBxdWVzdHMuZmlsdGVyKHF1ZXN0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0TmFtZSA9IHF1ZXN0LmJhc2VuYW1lIHx8IHF1ZXN0Lm5hbWU7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5xdWVzdE1hdGNoZXNGaWx0ZXIocXVlc3ROYW1lKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHF1ZXN0cyBieSBzcGVjaWZpYyBlbmVyZ3kgbGV2ZWxcbiAgICAgKi9cbiAgICBnZXRRdWVzdHNCeUVuZXJneShlbmVyZ3k6IEVuZXJneUxldmVsLCBxdWVzdHM6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4pOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+IHtcbiAgICAgICAgcmV0dXJuIHF1ZXN0cy5maWx0ZXIocSA9PiB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdE5hbWUgPSBxLmJhc2VuYW1lIHx8IHEubmFtZTtcbiAgICAgICAgICAgIGNvbnN0IGZpbHRlciA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV07XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyICYmIGZpbHRlci5lbmVyZ3lMZXZlbCA9PT0gZW5lcmd5O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcXVlc3RzIGJ5IHNwZWNpZmljIGNvbnRleHRcbiAgICAgKi9cbiAgICBnZXRRdWVzdHNCeUNvbnRleHQoY29udGV4dDogUXVlc3RDb250ZXh0LCBxdWVzdHM6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4pOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+IHtcbiAgICAgICAgcmV0dXJuIHF1ZXN0cy5maWx0ZXIocSA9PiB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdE5hbWUgPSBxLmJhc2VuYW1lIHx8IHEubmFtZTtcbiAgICAgICAgICAgIGNvbnN0IGZpbHRlciA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV07XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyICYmIGZpbHRlci5jb250ZXh0ID09PSBjb250ZXh0O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcXVlc3RzIGJ5IHNwZWNpZmljIHRhZ3NcbiAgICAgKi9cbiAgICBnZXRRdWVzdHNCeVRhZ3ModGFnczogc3RyaW5nW10sIHF1ZXN0czogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9Pik6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4ge1xuICAgICAgICByZXR1cm4gcXVlc3RzLmZpbHRlcihxID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0TmFtZSA9IHEuYmFzZW5hbWUgfHwgcS5uYW1lO1xuICAgICAgICAgICAgY29uc3QgZmlsdGVyID0gdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnNbcXVlc3ROYW1lXTtcbiAgICAgICAgICAgIGlmICghZmlsdGVyKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm4gdGFncy5zb21lKHRhZyA9PiBmaWx0ZXIudGFncy5pbmNsdWRlcyh0YWcpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2xlYXIgYWxsIGFjdGl2ZSBmaWx0ZXJzXG4gICAgICovXG4gICAgY2xlYXJGaWx0ZXJzKCk6IHZvaWQge1xuICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlID0ge1xuICAgICAgICAgICAgYWN0aXZlRW5lcmd5OiBcImFueVwiLFxuICAgICAgICAgICAgYWN0aXZlQ29udGV4dDogXCJhbnlcIixcbiAgICAgICAgICAgIGFjdGl2ZVRhZ3M6IFtdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCB1bmlxdWUgdGFncyB1c2VkIGFjcm9zcyBhbGwgcXVlc3RzXG4gICAgICovXG4gICAgZ2V0QXZhaWxhYmxlVGFncygpOiBzdHJpbmdbXSB7XG4gICAgICAgIGNvbnN0IHRhZ3MgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgXG4gICAgICAgIGZvciAoY29uc3QgcXVlc3ROYW1lIGluIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzKSB7XG4gICAgICAgICAgICBjb25zdCBmaWx0ZXIgPSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdO1xuICAgICAgICAgICAgKGZpbHRlci50YWdzIHx8IFtdKS5mb3JFYWNoKCh0YWc6IHN0cmluZykgPT4gdGFncy5hZGQodGFnKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBBcnJheS5mcm9tKHRhZ3MpLnNvcnQoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgc3VtbWFyeSBzdGF0cyBhYm91dCBmaWx0ZXJlZCBzdGF0ZVxuICAgICAqL1xuICAgIGdldEZpbHRlclN0YXRzKGFsbFF1ZXN0czogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9Pik6IHtcbiAgICAgICAgdG90YWw6IG51bWJlcjtcbiAgICAgICAgZmlsdGVyZWQ6IG51bWJlcjtcbiAgICAgICAgYWN0aXZlRmlsdGVyc0NvdW50OiBudW1iZXI7XG4gICAgfSB7XG4gICAgICAgIGNvbnN0IGZpbHRlcmVkID0gdGhpcy5maWx0ZXJRdWVzdHMoYWxsUXVlc3RzKTtcbiAgICAgICAgY29uc3QgYWN0aXZlRmlsdGVyc0NvdW50ID0gKHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlRW5lcmd5ICE9PSBcImFueVwiID8gMSA6IDApICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlQ29udGV4dCAhPT0gXCJhbnlcIiA/IDEgOiAwKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZVRhZ3MubGVuZ3RoID4gMCA/IDEgOiAwKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b3RhbDogYWxsUXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIGZpbHRlcmVkOiBmaWx0ZXJlZC5sZW5ndGgsXG4gICAgICAgICAgICBhY3RpdmVGaWx0ZXJzQ291bnQ6IGFjdGl2ZUZpbHRlcnNDb3VudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBhIHNwZWNpZmljIGZpbHRlciB2YWx1ZVxuICAgICAqIFVzZWZ1bCBmb3IgVUkgdG9nZ2xlIGJ1dHRvbnNcbiAgICAgKi9cbiAgICB0b2dnbGVFbmVyZ3lGaWx0ZXIoZW5lcmd5OiBFbmVyZ3lMZXZlbCB8IFwiYW55XCIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlRW5lcmd5ID09PSBlbmVyZ3kpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlRW5lcmd5ID0gXCJhbnlcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlRW5lcmd5ID0gZW5lcmd5IGFzIGFueTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBjb250ZXh0IGZpbHRlclxuICAgICAqL1xuICAgIHRvZ2dsZUNvbnRleHRGaWx0ZXIoY29udGV4dDogUXVlc3RDb250ZXh0IHwgXCJhbnlcIik6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVDb250ZXh0ID09PSBjb250ZXh0KSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUNvbnRleHQgPSBcImFueVwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVDb250ZXh0ID0gY29udGV4dCBhcyBhbnk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgYSB0YWcgaW4gdGhlIGFjdGl2ZSB0YWcgbGlzdFxuICAgICAqL1xuICAgIHRvZ2dsZVRhZyh0YWc6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZVRhZ3MuaW5kZXhPZih0YWcpO1xuICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlVGFncy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlVGFncy5wdXNoKHRhZyk7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCIvKipcbiAqIFB1cmUgZ2FtZSBmb3JtdWxhcyBmb3IgU2lzeXBodXMgRW5naW5lLlxuICogTm8gT2JzaWRpYW4gb3IgcnVudGltZSBkZXBzIOKAlCBzYWZlIHRvIHVuaXQgdGVzdC5cbiAqL1xuXG5leHBvcnQgY29uc3QgQk9TU19EQVRBOiBSZWNvcmQ8bnVtYmVyLCB7IG5hbWU6IHN0cmluZzsgZGVzYzogc3RyaW5nOyBocF9wZW46IG51bWJlciB9PiA9IHtcbiAgMTA6IHsgbmFtZTogXCJUaGUgR2F0ZWtlZXBlclwiLCBkZXNjOiBcIlRoZSBmaXJzdCBtYWpvciBmaWx0ZXIuXCIsIGhwX3BlbjogMjAgfSxcbiAgMjA6IHsgbmFtZTogXCJUaGUgU2hhZG93IFNlbGZcIiwgZGVzYzogXCJZb3VyIG93biBiYWQgaGFiaXRzIG1hbmlmZXN0LlwiLCBocF9wZW46IDMwIH0sXG4gIDMwOiB7IG5hbWU6IFwiVGhlIE1vdW50YWluXCIsIGRlc2M6IFwiVGhlIHBlYWsgaXMgdmlzaWJsZS5cIiwgaHBfcGVuOiA0MCB9LFxuICA1MDogeyBuYW1lOiBcIlNpc3lwaHVzIFByaW1lXCIsIGRlc2M6IFwiT25lIG11c3QgaW1hZ2luZSBTaXN5cGh1cyBoYXBweS5cIiwgaHBfcGVuOiA5OSB9LFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldERpZmZpY3VsdHlOdW1iZXIoZGlmZkxhYmVsOiBzdHJpbmcpOiBudW1iZXIge1xuICBjb25zdCBtYXA6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7XG4gICAgVHJpdmlhbDogMSxcbiAgICBFYXN5OiAyLFxuICAgIE1lZGl1bTogMyxcbiAgICBIYXJkOiA0LFxuICAgIFNVSUNJREU6IDUsXG4gIH07XG4gIHJldHVybiBtYXBbZGlmZkxhYmVsXSA/PyAzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcXVlc3RSZXdhcmRzQnlEaWZmaWN1bHR5KFxuICBkaWZmOiBudW1iZXIsXG4gIHhwUmVxOiBudW1iZXIsXG4gIGlzQm9zczogYm9vbGVhbixcbiAgaGlnaFN0YWtlczogYm9vbGVhblxuKTogeyB4cFJld2FyZDogbnVtYmVyOyBnb2xkUmV3YXJkOiBudW1iZXI7IGRpZmZMYWJlbDogc3RyaW5nIH0ge1xuICBpZiAoaXNCb3NzKSB7XG4gICAgcmV0dXJuIHsgeHBSZXdhcmQ6IDEwMDAsIGdvbGRSZXdhcmQ6IDEwMDAsIGRpZmZMYWJlbDogXCLimKDvuI8gQk9TU1wiIH07XG4gIH1cbiAgbGV0IHhwUmV3YXJkOiBudW1iZXI7XG4gIGxldCBnb2xkUmV3YXJkOiBudW1iZXI7XG4gIGxldCBkaWZmTGFiZWw6IHN0cmluZztcbiAgc3dpdGNoIChkaWZmKSB7XG4gICAgY2FzZSAxOlxuICAgICAgeHBSZXdhcmQgPSBNYXRoLmZsb29yKHhwUmVxICogMC4wNSk7XG4gICAgICBnb2xkUmV3YXJkID0gMTA7XG4gICAgICBkaWZmTGFiZWwgPSBcIlRyaXZpYWxcIjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMjpcbiAgICAgIHhwUmV3YXJkID0gTWF0aC5mbG9vcih4cFJlcSAqIDAuMSk7XG4gICAgICBnb2xkUmV3YXJkID0gMjA7XG4gICAgICBkaWZmTGFiZWwgPSBcIkVhc3lcIjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMzpcbiAgICAgIHhwUmV3YXJkID0gTWF0aC5mbG9vcih4cFJlcSAqIDAuMik7XG4gICAgICBnb2xkUmV3YXJkID0gNDA7XG4gICAgICBkaWZmTGFiZWwgPSBcIk1lZGl1bVwiO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSA0OlxuICAgICAgeHBSZXdhcmQgPSBNYXRoLmZsb29yKHhwUmVxICogMC40KTtcbiAgICAgIGdvbGRSZXdhcmQgPSA4MDtcbiAgICAgIGRpZmZMYWJlbCA9IFwiSGFyZFwiO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSA1OlxuICAgICAgeHBSZXdhcmQgPSBNYXRoLmZsb29yKHhwUmVxICogMC42KTtcbiAgICAgIGdvbGRSZXdhcmQgPSAxNTA7XG4gICAgICBkaWZmTGFiZWwgPSBcIlNVSUNJREVcIjtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICB4cFJld2FyZCA9IE1hdGguZmxvb3IoeHBSZXEgKiAwLjIpO1xuICAgICAgZ29sZFJld2FyZCA9IDQwO1xuICAgICAgZGlmZkxhYmVsID0gXCJNZWRpdW1cIjtcbiAgfVxuICBpZiAoaGlnaFN0YWtlcykgZ29sZFJld2FyZCA9IE1hdGguZmxvb3IoZ29sZFJld2FyZCAqIDEuNSk7XG4gIHJldHVybiB7IHhwUmV3YXJkLCBnb2xkUmV3YXJkLCBkaWZmTGFiZWwgfTtcbn1cblxuLyoqXG4gKiBDb21wdXRlIGZhaWwgZGFtYWdlOiBiYXNlICsgcml2YWwsIHRoZW4gYnVmZiBtdWx0LCB0aGVuIGJvc3MgcGVuYWx0eSwgdGhlbiBkZWJ0IGRvdWJsZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVGYWlsRGFtYWdlKFxuICByaXZhbERtZzogbnVtYmVyLFxuICBnb2xkOiBudW1iZXIsXG4gIGRhbWFnZU11bHQ6IG51bWJlcixcbiAgYm9zc0hwUGVuYWx0eTogbnVtYmVyXG4pOiBudW1iZXIge1xuICBsZXQgZCA9IDEwICsgTWF0aC5mbG9vcihyaXZhbERtZyAvIDIpO1xuICBkID0gTWF0aC5mbG9vcihkICogZGFtYWdlTXVsdCk7XG4gIGQgKz0gYm9zc0hwUGVuYWx0eTtcbiAgaWYgKGdvbGQgPCAwKSBkICo9IDI7XG4gIHJldHVybiBkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Qm9zc0hwUGVuYWx0eShsZXZlbDogbnVtYmVyKTogbnVtYmVyIHtcbiAgcmV0dXJuIEJPU1NfREFUQVtsZXZlbF0/LmhwX3BlbiA/PyAwO1xufVxuIiwiaW1wb3J0IHsgQXBwLCBURmlsZSwgVEZvbGRlciwgTm90aWNlLCBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBTa2lsbCwgTW9kaWZpZXIsIERhaWx5TWlzc2lvbiB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgQXVkaW9Db250cm9sbGVyLCBUaW55RW1pdHRlciB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgQ2hhb3NNb2RhbCwgRGVhdGhNb2RhbCB9IGZyb20gJy4vdWkvbW9kYWxzJztcbmltcG9ydCB7IEFuYWx5dGljc0VuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9BbmFseXRpY3NFbmdpbmUnO1xuaW1wb3J0IHsgTWVkaXRhdGlvbkVuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9NZWRpdGF0aW9uRW5naW5lJztcbmltcG9ydCB7IFJlc2VhcmNoRW5naW5lIH0gZnJvbSAnLi9lbmdpbmVzL1Jlc2VhcmNoRW5naW5lJztcbmltcG9ydCB7IENoYWluc0VuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9DaGFpbnNFbmdpbmUnO1xuaW1wb3J0IHsgRmlsdGVyc0VuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9GaWx0ZXJzRW5naW5lJztcbmltcG9ydCB7XG4gIEJPU1NfREFUQSxcbiAgZ2V0RGlmZmljdWx0eU51bWJlciBhcyBnZXREaWZmaWN1bHR5TnVtLFxuICBxdWVzdFJld2FyZHNCeURpZmZpY3VsdHksXG4gIGNvbXB1dGVGYWlsRGFtYWdlLFxuICBnZXRCb3NzSHBQZW5hbHR5LFxufSBmcm9tICcuL21lY2hhbmljcyc7XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX01PRElGSUVSOiBNb2RpZmllciA9IHsgbmFtZTogXCJDbGVhciBTa2llc1wiLCBkZXNjOiBcIk5vIGVmZmVjdHMuXCIsIHhwTXVsdDogMSwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMSwgaWNvbjogXCLimIDvuI9cIiB9O1xuZXhwb3J0IGNvbnN0IENIQU9TX1RBQkxFOiBNb2RpZmllcltdID0gW1xuICAgIHsgbmFtZTogXCJDbGVhciBTa2llc1wiLCBkZXNjOiBcIk5vcm1hbC5cIiwgeHBNdWx0OiAxLCBnb2xkTXVsdDogMSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIuKYgO+4j1wiIH0sXG4gICAgeyBuYW1lOiBcIkZsb3cgU3RhdGVcIiwgZGVzYzogXCIrNTAlIFhQLlwiLCB4cE11bHQ6IDEuNSwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMSwgaWNvbjogXCLwn4yKXCIgfSxcbiAgICB7IG5hbWU6IFwiV2luZGZhbGxcIiwgZGVzYzogXCIrNTAlIEdvbGQuXCIsIHhwTXVsdDogMSwgZ29sZE11bHQ6IDEuNSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIvCfkrBcIiB9LFxuICAgIHsgbmFtZTogXCJJbmZsYXRpb25cIiwgZGVzYzogXCJQcmljZXMgMnguXCIsIHhwTXVsdDogMSwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMiwgaWNvbjogXCLwn5OIXCIgfSxcbiAgICB7IG5hbWU6IFwiQnJhaW4gRm9nXCIsIGRlc2M6IFwiWFAgMC41eC5cIiwgeHBNdWx0OiAwLjUsIGdvbGRNdWx0OiAxLCBwcmljZU11bHQ6IDEsIGljb246IFwi8J+Mq++4j1wiIH0sXG4gICAgeyBuYW1lOiBcIlJpdmFsIFNhYm90YWdlXCIsIGRlc2M6IFwiR29sZCAwLjV4LlwiLCB4cE11bHQ6IDEsIGdvbGRNdWx0OiAwLjUsIHByaWNlTXVsdDogMSwgaWNvbjogXCLwn5W177iPXCIgfSxcbiAgICB7IG5hbWU6IFwiQWRyZW5hbGluZVwiLCBkZXNjOiBcIjJ4IFhQLCAtNSBIUC9RLlwiLCB4cE11bHQ6IDIsIGdvbGRNdWx0OiAxLCBwcmljZU11bHQ6IDEsIGljb246IFwi8J+SiVwiIH1cbl07XG5leHBvcnQgY29uc3QgUE9XRVJfVVBTID0gW1xuICAgIHsgaWQ6IFwiZm9jdXNfcG90aW9uXCIsIG5hbWU6IFwiRm9jdXMgUG90aW9uXCIsIGljb246IFwi8J+nqlwiLCBkZXNjOiBcIjJ4IFhQICgxaClcIiwgY29zdDogMTAwLCBkdXJhdGlvbjogNjAsIGVmZmVjdDogeyB4cE11bHQ6IDIgfSB9LFxuICAgIHsgaWQ6IFwibWlkYXNfdG91Y2hcIiwgbmFtZTogXCJNaWRhcyBUb3VjaFwiLCBpY29uOiBcIuKcqFwiLCBkZXNjOiBcIjN4IEdvbGQgKDMwbSlcIiwgY29zdDogMTUwLCBkdXJhdGlvbjogMzAsIGVmZmVjdDogeyBnb2xkTXVsdDogMyB9IH0sXG4gICAgeyBpZDogXCJpcm9uX3dpbGxcIiwgbmFtZTogXCJJcm9uIFdpbGxcIiwgaWNvbjogXCLwn5uh77iPXCIsIGRlc2M6IFwiNTAlIERtZyBSZWR1Y3QgKDJoKVwiLCBjb3N0OiAyMDAsIGR1cmF0aW9uOiAxMjAsIGVmZmVjdDogeyBkYW1hZ2VNdWx0OiAwLjUgfSB9XG5dO1xuXG5jb25zdCBNSVNTSU9OX1BPT0wgPSBbXG4gICAgeyBpZDogXCJtb3JuaW5nX3dpblwiLCBuYW1lOiBcIuKYgO+4jyBNb3JuaW5nIFdpblwiLCBkZXNjOiBcIkNvbXBsZXRlIDEgVHJpdmlhbCBxdWVzdCBiZWZvcmUgMTAgQU1cIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDAsIGdvbGQ6IDE1IH0sIGNoZWNrOiBcIm1vcm5pbmdfdHJpdmlhbFwiIH0sXG4gICAgeyBpZDogXCJtb21lbnR1bVwiLCBuYW1lOiBcIvCflKUgTW9tZW50dW1cIiwgZGVzYzogXCJDb21wbGV0ZSAzIHF1ZXN0cyB0b2RheVwiLCB0YXJnZXQ6IDMsIHJld2FyZDogeyB4cDogMjAsIGdvbGQ6IDAgfSwgY2hlY2s6IFwicXVlc3RfY291bnRcIiB9LFxuICAgIHsgaWQ6IFwiemVyb19pbmJveFwiLCBuYW1lOiBcIvCfp5ggWmVybyBJbmJveFwiLCBkZXNjOiBcIlByb2Nlc3MgYWxsIGZpbGVzIGluICdTY3JhcHMnXCIsIHRhcmdldDogMSwgcmV3YXJkOiB7IHhwOiAwLCBnb2xkOiAxMCB9LCBjaGVjazogXCJ6ZXJvX2luYm94XCIgfSxcbiAgICB7IGlkOiBcInNwZWNpYWxpc3RcIiwgbmFtZTogXCLwn46vIFNwZWNpYWxpc3RcIiwgZGVzYzogXCJVc2UgdGhlIHNhbWUgc2tpbGwgMyB0aW1lc1wiLCB0YXJnZXQ6IDMsIHJld2FyZDogeyB4cDogMTUsIGdvbGQ6IDAgfSwgY2hlY2s6IFwic2tpbGxfcmVwZWF0XCIgfSxcbiAgICB7IGlkOiBcImhpZ2hfc3Rha2VzXCIsIG5hbWU6IFwi8J+SqiBIaWdoIFN0YWtlc1wiLCBkZXNjOiBcIkNvbXBsZXRlIDEgSGlnaCBTdGFrZXMgcXVlc3RcIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDAsIGdvbGQ6IDMwIH0sIGNoZWNrOiBcImhpZ2hfc3Rha2VzXCIgfSxcbiAgICB7IGlkOiBcInNwZWVkX2RlbW9uXCIsIG5hbWU6IFwi4pqhIFNwZWVkIERlbW9uXCIsIGRlc2M6IFwiQ29tcGxldGUgcXVlc3Qgd2l0aGluIDJoIG9mIGNyZWF0aW9uXCIsIHRhcmdldDogMSwgcmV3YXJkOiB7IHhwOiAyNSwgZ29sZDogMCB9LCBjaGVjazogXCJmYXN0X2NvbXBsZXRlXCIgfSxcbiAgICB7IGlkOiBcInN5bmVyZ2lzdFwiLCBuYW1lOiBcIvCflJcgU3luZXJnaXN0XCIsIGRlc2M6IFwiQ29tcGxldGUgcXVlc3Qgd2l0aCBQcmltYXJ5ICsgU2Vjb25kYXJ5IHNraWxsXCIsIHRhcmdldDogMSwgcmV3YXJkOiB7IHhwOiAwLCBnb2xkOiAxMCB9LCBjaGVjazogXCJzeW5lcmd5XCIgfSxcbiAgICB7IGlkOiBcInN1cnZpdm9yXCIsIG5hbWU6IFwi8J+boe+4jyBTdXJ2aXZvclwiLCBkZXNjOiBcIkRvbid0IHRha2UgYW55IGRhbWFnZSB0b2RheVwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMCwgZ29sZDogMjAgfSwgY2hlY2s6IFwibm9fZGFtYWdlXCIgfSxcbiAgICB7IGlkOiBcInJpc2tfdGFrZXJcIiwgbmFtZTogXCLwn46yIFJpc2sgVGFrZXJcIiwgZGVzYzogXCJDb21wbGV0ZSBEaWZmaWN1bHR5IDQrIHF1ZXN0XCIsIHRhcmdldDogMSwgcmV3YXJkOiB7IHhwOiAxNSwgZ29sZDogMCB9LCBjaGVjazogXCJoYXJkX3F1ZXN0XCIgfVxuXTtcblxuZXhwb3J0IGNsYXNzIFNpc3lwaHVzRW5naW5lIGV4dGVuZHMgVGlueUVtaXR0ZXIge1xuICAgIGFwcDogQXBwO1xuICAgIHBsdWdpbjogYW55O1xuICAgIGF1ZGlvOiBBdWRpb0NvbnRyb2xsZXI7XG4gICAgYW5hbHl0aWNzRW5naW5lOiBBbmFseXRpY3NFbmdpbmU7XG4gICAgbWVkaXRhdGlvbkVuZ2luZTogTWVkaXRhdGlvbkVuZ2luZTtcbiAgICByZXNlYXJjaEVuZ2luZTogUmVzZWFyY2hFbmdpbmU7XG4gICAgY2hhaW5zRW5naW5lOiBDaGFpbnNFbmdpbmU7XG4gICAgZmlsdGVyc0VuZ2luZTogRmlsdGVyc0VuZ2luZTtcblxuICAgIC8vIFtGRUFUVVJFXSBVbmRvIEJ1ZmZlclxuICAgIHByaXZhdGUgZGVsZXRlZFF1ZXN0QnVmZmVyOiBBcnJheTx7IG5hbWU6IHN0cmluZzsgY29udGVudDogc3RyaW5nOyBwYXRoOiBzdHJpbmc7IGRlbGV0ZWRBdDogbnVtYmVyIH0+ID0gW107XG5cbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBhbnksIGF1ZGlvOiBBdWRpb0NvbnRyb2xsZXIpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5hcHAgPSBhcHA7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgICAgICB0aGlzLmF1ZGlvID0gYXVkaW87XG4gICAgICAgIFxuICAgICAgICB0aGlzLmFuYWx5dGljc0VuZ2luZSA9IG5ldyBBbmFseXRpY3NFbmdpbmUodGhpcy5wbHVnaW4uc2V0dGluZ3MsIHRoaXMuYXVkaW8pO1xuICAgICAgICB0aGlzLm1lZGl0YXRpb25FbmdpbmUgPSBuZXcgTWVkaXRhdGlvbkVuZ2luZSh0aGlzLnBsdWdpbi5zZXR0aW5ncywgdGhpcy5hdWRpbyk7XG4gICAgICAgIHRoaXMucmVzZWFyY2hFbmdpbmUgPSBuZXcgUmVzZWFyY2hFbmdpbmUodGhpcy5wbHVnaW4uc2V0dGluZ3MsIHRoaXMuYXBwLCB0aGlzLmF1ZGlvKTtcbiAgICAgICAgdGhpcy5jaGFpbnNFbmdpbmUgPSBuZXcgQ2hhaW5zRW5naW5lKHRoaXMucGx1Z2luLnNldHRpbmdzLCB0aGlzLmF1ZGlvKTtcbiAgICAgICAgdGhpcy5maWx0ZXJzRW5naW5lID0gbmV3IEZpbHRlcnNFbmdpbmUodGhpcy5wbHVnaW4uc2V0dGluZ3MpO1xuICAgIH1cblxuICAgIGdldCBzZXR0aW5ncygpOiBTaXN5cGh1c1NldHRpbmdzIHsgcmV0dXJuIHRoaXMucGx1Z2luLnNldHRpbmdzOyB9XG4gICAgc2V0IHNldHRpbmdzKHZhbDogU2lzeXBodXNTZXR0aW5ncykgeyB0aGlzLnBsdWdpbi5zZXR0aW5ncyA9IHZhbDsgfVxuXG4gICAgYXN5bmMgc2F2ZSgpIHsgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7IHRoaXMudHJpZ2dlcihcInVwZGF0ZVwiKTsgfVxuXG4gICAgLyoqIFNhbWUgc2FuaXRpemF0aW9uIGFzIGNyZWF0ZVF1ZXN0OyB1c2UgZm9yIGxvb2t1cC4gKi9cbiAgICBwcml2YXRlIHRvU2FmZVF1ZXN0TmFtZShuYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gbmFtZS5yZXBsYWNlKC9bXmEtejAtOV0vZ2ksICdfJykudG9Mb3dlckNhc2UoKTtcbiAgICB9XG5cbiAgICAvLyBbRklYXSBTYWZlIEFyY2hpdmVyOiBIYW5kbGVzIGR1cGxpY2F0ZXMgYnkgcmVuYW1pbmcgKFF1ZXN0IC0+IFF1ZXN0ICgxKSlcbiAgICBhc3luYyBzYWZlQXJjaGl2ZShmaWxlOiBURmlsZSwgc3ViZm9sZGVyOiBzdHJpbmcgPSBcIkFyY2hpdmVcIikge1xuICAgICAgICBjb25zdCByb290ID0gXCJBY3RpdmVfUnVuXCI7XG4gICAgICAgIGNvbnN0IHRhcmdldEZvbGRlciA9IGAke3Jvb3R9LyR7c3ViZm9sZGVyfWA7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChyb290KSkgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKHJvb3QpO1xuICAgICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0YXJnZXRGb2xkZXIpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIodGFyZ2V0Rm9sZGVyKTtcblxuICAgICAgICBsZXQgdGFyZ2V0UGF0aCA9IGAke3RhcmdldEZvbGRlcn0vJHtmaWxlLm5hbWV9YDtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbGxpc2lvbiBEZXRlY3Rpb24gTG9vcFxuICAgICAgICBsZXQgY291bnRlciA9IDE7XG4gICAgICAgIHdoaWxlICh0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGFyZ2V0UGF0aCkpIHtcbiAgICAgICAgICAgIHRhcmdldFBhdGggPSBgJHt0YXJnZXRGb2xkZXJ9LyR7ZmlsZS5iYXNlbmFtZX0gKCR7Y291bnRlcn0pLiR7ZmlsZS5leHRlbnNpb259YDtcbiAgICAgICAgICAgIGNvdW50ZXIrKztcbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnJlbmFtZUZpbGUoZmlsZSwgdGFyZ2V0UGF0aCk7XG4gICAgfVxuXG4gICAgYWN0aXZhdGVCdWZmKGl0ZW06IGFueSkge1xuICAgICAgICBjb25zdCBleHBpcmVzID0gbW9tZW50KCkuYWRkKGl0ZW0uZHVyYXRpb24sICdtaW51dGVzJykudG9JU09TdHJpbmcoKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5hY3RpdmVCdWZmcy5wdXNoKHtcbiAgICAgICAgICAgIGlkOiBpdGVtLmlkLFxuICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lLFxuICAgICAgICAgICAgaWNvbjogaXRlbS5pY29uLFxuICAgICAgICAgICAgZXhwaXJlc0F0OiBleHBpcmVzLFxuICAgICAgICAgICAgZWZmZWN0OiBpdGVtLmVmZmVjdFxuICAgICAgICB9KTtcbiAgICAgICAgbmV3IE5vdGljZShg8J+lpCBHdWxwISAke2l0ZW0ubmFtZX0gYWN0aXZlIGZvciAke2l0ZW0uZHVyYXRpb259bWApO1xuICAgIH1cblxuICAgIHJvbGxEYWlseU1pc3Npb25zKCkge1xuICAgICAgICBjb25zdCBhdmFpbGFibGUgPSBbLi4uTUlTU0lPTl9QT09MXTtcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWQ6IERhaWx5TWlzc2lvbltdID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoYXZhaWxhYmxlLmxlbmd0aCA9PT0gMCkgYnJlYWs7XG4gICAgICAgICAgICBjb25zdCBpZHggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBhdmFpbGFibGUubGVuZ3RoKTtcbiAgICAgICAgICAgIGNvbnN0IG1pc3Npb24gPSBhdmFpbGFibGUuc3BsaWNlKGlkeCwgMSlbMF07XG4gICAgICAgICAgICBzZWxlY3RlZC5wdXNoKHsgLi4ubWlzc2lvbiwgY2hlY2tGdW5jOiBtaXNzaW9uLmNoZWNrLCBwcm9ncmVzczogMCwgY29tcGxldGVkOiBmYWxzZSB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMgPSBzZWxlY3RlZDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25EYXRlID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdHNDb21wbGV0ZWRUb2RheSA9IDA7XG4gICAgICAgIHRoaXMuc2V0dGluZ3Muc2tpbGxVc2VzVG9kYXkgPSB7fTtcbiAgICB9XG5cbiAgICBjaGVja0RhaWx5TWlzc2lvbnMoY29udGV4dDogeyB0eXBlPzogc3RyaW5nOyBkaWZmaWN1bHR5PzogbnVtYmVyOyBza2lsbD86IHN0cmluZzsgc2Vjb25kYXJ5U2tpbGw/OiBzdHJpbmc7IGhpZ2hTdGFrZXM/OiBib29sZWFuOyBxdWVzdENyZWF0ZWQ/OiBudW1iZXIgfSkge1xuICAgICAgICBjb25zdCBub3cgPSBtb21lbnQoKTtcbiAgICAgICAgbGV0IGp1c3RGaW5pc2hlZEFsbCA9IGZhbHNlO1xuXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9ucy5mb3JFYWNoKG1pc3Npb24gPT4ge1xuICAgICAgICAgICAgaWYgKG1pc3Npb24uY29tcGxldGVkKSByZXR1cm47XG4gICAgICAgICAgICBzd2l0Y2ggKG1pc3Npb24uY2hlY2tGdW5jKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBcInplcm9faW5ib3hcIjpcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2NyYXBzID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiU2NyYXBzXCIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2NyYXBzIGluc3RhbmNlb2YgVEZvbGRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWlzc2lvbi5wcm9ncmVzcyA9IHNjcmFwcy5jaGlsZHJlbi5sZW5ndGggPT09IDAgPyAxIDogMDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pc3Npb24ucHJvZ3Jlc3MgPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJtb3JuaW5nX3RyaXZpYWxcIjogaWYgKGNvbnRleHQudHlwZSA9PT0gXCJjb21wbGV0ZVwiICYmIGNvbnRleHQuZGlmZmljdWx0eSA9PT0gMSAmJiBub3cuaG91cigpIDwgMTApIG1pc3Npb24ucHJvZ3Jlc3MrKzsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcInF1ZXN0X2NvdW50XCI6IGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIikgbWlzc2lvbi5wcm9ncmVzcyA9IHRoaXMuc2V0dGluZ3MucXVlc3RzQ29tcGxldGVkVG9kYXk7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJoaWdoX3N0YWtlc1wiOiBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIgJiYgY29udGV4dC5oaWdoU3Rha2VzKSBtaXNzaW9uLnByb2dyZXNzKys7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJmYXN0X2NvbXBsZXRlXCI6IGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LnF1ZXN0Q3JlYXRlZCAmJiBtb21lbnQoKS5kaWZmKG1vbWVudChjb250ZXh0LnF1ZXN0Q3JlYXRlZCksICdob3VycycpIDw9IDIpIG1pc3Npb24ucHJvZ3Jlc3MrKzsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcInN5bmVyZ3lcIjogaWYgKGNvbnRleHQudHlwZSA9PT0gXCJjb21wbGV0ZVwiICYmIGNvbnRleHQuc2tpbGwgJiYgY29udGV4dC5zZWNvbmRhcnlTa2lsbCAmJiBjb250ZXh0LnNlY29uZGFyeVNraWxsICE9PSBcIk5vbmVcIikgbWlzc2lvbi5wcm9ncmVzcysrOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwibm9fZGFtYWdlXCI6IGlmIChjb250ZXh0LnR5cGUgPT09IFwiZGFtYWdlXCIpIG1pc3Npb24ucHJvZ3Jlc3MgPSAwOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiaGFyZF9xdWVzdFwiOiBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIgJiYgY29udGV4dC5kaWZmaWN1bHR5ICYmIGNvbnRleHQuZGlmZmljdWx0eSA+PSA0KSBtaXNzaW9uLnByb2dyZXNzKys7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJza2lsbF9yZXBlYXRcIjogXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LnNraWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5W2NvbnRleHQuc2tpbGxdID0gKHRoaXMuc2V0dGluZ3Muc2tpbGxVc2VzVG9kYXlbY29udGV4dC5za2lsbF0gfHwgMCkgKyAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWlzc2lvbi5wcm9ncmVzcyA9IE1hdGgubWF4KDAsIC4uLk9iamVjdC52YWx1ZXModGhpcy5zZXR0aW5ncy5za2lsbFVzZXNUb2RheSkpO1xuICAgICAgICAgICAgICAgICAgICB9IFxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtaXNzaW9uLnByb2dyZXNzID49IG1pc3Npb24udGFyZ2V0ICYmICFtaXNzaW9uLmNvbXBsZXRlZCkge1xuICAgICAgICAgICAgICAgIG1pc3Npb24uY29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmdyYW50UmV3YXJkcyhtaXNzaW9uLnJld2FyZC54cCwgbWlzc2lvbi5yZXdhcmQuZ29sZCwgYG1pc3Npb246JHttaXNzaW9uLmlkfWApO1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYOKchSBNaXNzaW9uIENvbXBsZXRlOiAke21pc3Npb24ubmFtZX1gKTtcbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25zLmV2ZXJ5KG0gPT4gbS5jb21wbGV0ZWQpKSBqdXN0RmluaXNoZWRBbGwgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoanVzdEZpbmlzaGVkQWxsKSB7XG4gICAgICAgICAgICB0aGlzLmdyYW50UmV3YXJkcygwLCA1MCwgJ21pc3Npb25zOmFsbF9jb21wbGV0ZV9ib251cycpO1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIvCfjokgQWxsIE1pc3Npb25zIENvbXBsZXRlISArNTAgQm9udXMgR29sZFwiKTtcbiAgICAgICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdldERpZmZpY3VsdHlOdW1iZXIoZGlmZkxhYmVsOiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gZ2V0RGlmZmljdWx0eU51bShkaWZmTGFiZWwpO1xuICAgIH1cblxuXG4gICAgcHJpdmF0ZSBncmFudFJld2FyZHMoeHA6IG51bWJlciwgZ29sZDogbnVtYmVyLCByZWFzb246IHN0cmluZykge1xuICAgICAgICBpZiAodGhpcy5wbHVnaW4ua2VybmVsKSB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5rZXJuZWwuZXZlbnRzLmVtaXQoJ3Jld2FyZDpncmFudGVkJywgeyB4cCwgZ29sZCwgcmVhc29uIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZXR0aW5ncy54cCArPSB4cDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5nb2xkICs9IGdvbGQ7XG4gICAgfVxuXG4gICAgYXN5bmMgY2hlY2tEYWlseUxvZ2luKCkge1xuICAgICAgICBpZiAodGhpcy5wbHVnaW4ua2VybmVsKSB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5rZXJuZWwuZXZlbnRzLmVtaXQoJ3Nlc3Npb246c3RhcnQnLCB7IG5vdzogbmV3IERhdGUoKS50b0lTT1N0cmluZygpIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRvZGF5ID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubGFzdExvZ2luKSB7XG4gICAgICAgICAgICBjb25zdCBkYXlzRGlmZiA9IG1vbWVudCgpLmRpZmYobW9tZW50KHRoaXMuc2V0dGluZ3MubGFzdExvZ2luKSwgJ2RheXMnKTtcbiAgICAgICAgICAgIGlmIChkYXlzRGlmZiA+IDIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByb3REYW1hZ2UgPSAoZGF5c0RpZmYgLSAxKSAqIDEwO1xuICAgICAgICAgICAgICAgIGlmIChyb3REYW1hZ2UgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaHAgLT0gcm90RGFtYWdlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLmhpc3RvcnkucHVzaCh7IGRhdGU6IHRvZGF5LCBzdGF0dXM6IFwicm90XCIsIHhwRWFybmVkOiAtcm90RGFtYWdlIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5ocCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ldyBEZWF0aE1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5sYXN0TG9naW4gIT09IHRvZGF5KSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLm1heEhwID0gMTAwICsgKHRoaXMuc2V0dGluZ3MubGV2ZWwgKiA1KTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaHAgPSBNYXRoLm1pbih0aGlzLnNldHRpbmdzLm1heEhwLCB0aGlzLnNldHRpbmdzLmhwICsgMjApO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5kYW1hZ2VUYWtlblRvZGF5ID0gMDtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCA9IFwiXCI7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxhc3RMb2dpbiA9IHRvZGF5O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSdXN0IExvZ2ljXG4gICAgICAgICAgICBjb25zdCB0b2RheU1vbWVudCA9IG1vbWVudCgpO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5za2lsbHMuZm9yRWFjaChzID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocy5sYXN0VXNlZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodG9kYXlNb21lbnQuZGlmZihtb21lbnQocy5sYXN0VXNlZCksICdkYXlzJykgPiAzICYmICF0aGlzLmlzUmVzdGluZygpKSB7IFxuICAgICAgICAgICAgICAgICAgICAgICAgcy5ydXN0ID0gTWF0aC5taW4oMTAsIChzLnJ1c3QgfHwgMCkgKyAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMueHBSZXEgPSBNYXRoLmZsb29yKHMueHBSZXEgKiAxLjEpOyBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25EYXRlICE9PSB0b2RheSkgdGhpcy5yb2xsRGFpbHlNaXNzaW9ucygpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5yb2xsQ2hhb3ModHJ1ZSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGNvbXBsZXRlUXVlc3QoZmlsZTogVEZpbGUpIHtcbiAgICAgICAgaWYgKHRoaXMubWVkaXRhdGlvbkVuZ2luZS5pc0xvY2tlZERvd24oKSkgeyBuZXcgTm90aWNlKFwiTE9DS0RPV04gQUNUSVZFXCIpOyByZXR1cm47IH1cbiAgICAgICAgXG4gICAgICAgIC8vIC0tLSBDT01CTyBTWVNURU0gLS0tXG4gICAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIGNvbnN0IHRpbWVEaWZmID0gbm93IC0gdGhpcy5zZXR0aW5ncy5sYXN0Q29tcGxldGlvblRpbWU7XG4gICAgICAgIGNvbnN0IENPTUJPX1dJTkRPVyA9IDEwICogNjAgKiAxMDAwOyAvLyAxMCBtaW51dGVzXG5cbiAgICAgICAgaWYgKHRpbWVEaWZmIDwgQ09NQk9fV0lORE9XKSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmNvbWJvQ291bnQrKztcbiAgICAgICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwic3VjY2Vzc1wiKTsgXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmNvbWJvQ291bnQgPSAxOyBcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNldHRpbmdzLmxhc3RDb21wbGV0aW9uVGltZSA9IG5vdztcbiAgICAgICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgICAgICAgY29uc3QgZm0gPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgIGlmICghZm0pIHJldHVybjtcbiAgICAgICAgY29uc3QgcXVlc3ROYW1lID0gZmlsZS5iYXNlbmFtZTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmNoYWluc0VuZ2luZS5pc1F1ZXN0SW5DaGFpbihxdWVzdE5hbWUpKSB7XG4gICAgICAgICAgICAgY29uc3QgY2FuU3RhcnQgPSB0aGlzLmNoYWluc0VuZ2luZS5jYW5TdGFydFF1ZXN0KHF1ZXN0TmFtZSk7XG4gICAgICAgICAgICAgaWYgKCFjYW5TdGFydCkgeyBuZXcgTm90aWNlKFwiTG9ja2VkIGJ5IENoYWluLlwiKTsgcmV0dXJuOyB9XG4gICAgICAgICAgICAgXG4gICAgICAgICAgICAgY29uc3QgY2hhaW5SZXN1bHQgPSBhd2FpdCB0aGlzLmNoYWluc0VuZ2luZS5jb21wbGV0ZUNoYWluUXVlc3QocXVlc3ROYW1lKTtcbiAgICAgICAgICAgICBpZiAoY2hhaW5SZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGNoYWluUmVzdWx0Lm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICBpZiAoY2hhaW5SZXN1bHQuY2hhaW5Db21wbGV0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmFudFJld2FyZHMoY2hhaW5SZXN1bHQuYm9udXNYcCwgMCwgJ2NoYWluOmNvbXBsZXRpb25fYm9udXMnKTtcbiAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYPCfjokgQ2hhaW4gQm9udXM6ICske2NoYWluUmVzdWx0LmJvbnVzWHB9IFhQIWApO1xuICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLnBsdWdpbi5rZXJuZWwpIHtcbiAgICAgICAgICAgIHRoaXMuYW5hbHl0aWNzRW5naW5lLnRyYWNrRGFpbHlNZXRyaWNzKFwicXVlc3RfY29tcGxldGVcIiwgMSk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMudG90YWxDb21iYXQrKztcbiAgICAgICAgfVxuICAgICAgIFxuICAgICAgICAvLyBSZXdhcmRzXG4gICAgICAgIGxldCB4cE11bHQgPSB0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIueHBNdWx0O1xuICAgICAgICBsZXQgZ29sZE11bHQgPSB0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIuZ29sZE11bHQ7XG5cbiAgICAgICAgdGhpcy5zZXR0aW5ncy5hY3RpdmVCdWZmcy5mb3JFYWNoKGIgPT4ge1xuICAgICAgICAgICAgaWYgKGIuZWZmZWN0LnhwTXVsdCkgeHBNdWx0ICo9IGIuZWZmZWN0LnhwTXVsdDtcbiAgICAgICAgICAgIGlmIChiLmVmZmVjdC5nb2xkTXVsdCkgZ29sZE11bHQgKj0gYi5lZmZlY3QuZ29sZE11bHQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxldCB4cCA9IChmbS54cF9yZXdhcmQgfHwgMjApICogeHBNdWx0O1xuICAgICAgICBsZXQgZ29sZCA9IChmbS5nb2xkX3Jld2FyZCB8fCAwKSAqIGdvbGRNdWx0O1xuXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmNvbWJvQ291bnQgPiAxKSB7XG4gICAgICAgICAgICBjb25zdCBib251cyA9IE1hdGguZmxvb3IoeHAgKiAwLjEgKiAodGhpcy5zZXR0aW5ncy5jb21ib0NvdW50IC0gMSkpOyBcbiAgICAgICAgICAgIHhwICs9IGJvbnVzO1xuICAgICAgICAgICAgbmV3IE5vdGljZShg8J+UpSBDT01CTyB4JHt0aGlzLnNldHRpbmdzLmNvbWJvQ291bnR9ISArJHtib251c30gQm9udXMgWFBgKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2tpbGxOYW1lID0gZm0uc2tpbGwgfHwgXCJOb25lXCI7XG4gICAgICAgIGNvbnN0IHNlY29uZGFyeSA9IGZtLnNlY29uZGFyeV9za2lsbCB8fCBcIk5vbmVcIjtcblxuICAgICAgICBjb25zdCBib3NzTWF0Y2ggPSBmbS5pc19ib3NzID8gZmlsZS5iYXNlbmFtZS5tYXRjaCgvQk9TU19MVkwoXFxkKykvKSA6IG51bGw7XG4gICAgICAgIGNvbnN0IGJvc3NMZXZlbCA9IGJvc3NNYXRjaCA/IHBhcnNlSW50KGJvc3NNYXRjaFsxXSkgOiBudWxsO1xuXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5rZXJuZWwpIHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLmtlcm5lbC5ldmVudHMuZW1pdCgncXVlc3Q6Y29tcGxldGVkJywge1xuICAgICAgICAgICAgICAgIHF1ZXN0SWQ6IGZpbGUuYmFzZW5hbWUsXG4gICAgICAgICAgICAgICAgZGlmZmljdWx0eTogdGhpcy5nZXREaWZmaWN1bHR5TnVtYmVyKGZtLmRpZmZpY3VsdHkpLFxuICAgICAgICAgICAgICAgIHNraWxsTmFtZSxcbiAgICAgICAgICAgICAgICBzZWNvbmRhcnlTa2lsbDogc2Vjb25kYXJ5LFxuICAgICAgICAgICAgICAgIGhpZ2hTdGFrZXM6ICEhZm0uaGlnaF9zdGFrZXMsXG4gICAgICAgICAgICAgICAgaXNCb3NzOiAhIWZtLmlzX2Jvc3MsXG4gICAgICAgICAgICAgICAgYm9zc0xldmVsLFxuICAgICAgICAgICAgICAgIHhwUmV3YXJkOiB4cCxcbiAgICAgICAgICAgICAgICBnb2xkUmV3YXJkOiBnb2xkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZ3JhbnRSZXdhcmRzKHhwLCBnb2xkLCAncXVlc3Q6Y29tcGxldGVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcblxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5ocCA8PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMucGx1Z2luLmtlcm5lbCkge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdHNDb21wbGV0ZWRUb2RheSsrO1xuICAgICAgICAgICAgdGhpcy5hbmFseXRpY3NFbmdpbmUudXBkYXRlU3RyZWFrKCk7XG5cbiAgICAgICAgICAgIHRoaXMuY2hlY2tEYWlseU1pc3Npb25zKHtcbiAgICAgICAgICAgICAgICB0eXBlOiBcImNvbXBsZXRlXCIsXG4gICAgICAgICAgICAgICAgZGlmZmljdWx0eTogdGhpcy5nZXREaWZmaWN1bHR5TnVtYmVyKGZtLmRpZmZpY3VsdHkpLFxuICAgICAgICAgICAgICAgIHNraWxsOiBza2lsbE5hbWUsXG4gICAgICAgICAgICAgICAgc2Vjb25kYXJ5U2tpbGw6IHNlY29uZGFyeSxcbiAgICAgICAgICAgICAgICBoaWdoU3Rha2VzOiBmbS5oaWdoX3N0YWtlc1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGYpID0+IHsgZi5zdGF0dXMgPSBcImNvbXBsZXRlZFwiOyBmLmNvbXBsZXRlZF9hdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTsgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBbRklYXSBVc2UgU2FmZSBBcmNoaXZlIHRvIHByZXZlbnQgZHVwbGljYXRlcy96b21iaWVzXG4gICAgICAgIGF3YWl0IHRoaXMuc2FmZUFyY2hpdmUoZmlsZSwgXCJBcmNoaXZlXCIpO1xuICAgICAgICBcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgc3Bhd25Cb3NzKGxldmVsOiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgYm9zcyA9IEJPU1NfREFUQVtsZXZlbF07XG4gICAgICAgIGlmICghYm9zcykgcmV0dXJuO1xuICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImhlYXJ0YmVhdFwiKTtcbiAgICAgICAgbmV3IE5vdGljZShcIuKaoO+4jyBBTk9NQUxZIERFVEVDVEVELi4uXCIsIDIwMDApO1xuICAgICAgICBcbiAgICAgICAgc2V0VGltZW91dChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImRlYXRoXCIpO1xuICAgICAgICAgICAgbmV3IE5vdGljZShg4pig77iPIEJPU1MgU1BBV05FRDogJHtib3NzLm5hbWV9YCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY3JlYXRlUXVlc3QoXG4gICAgICAgICAgICAgICAgYEJPU1NfTFZMJHtsZXZlbH0gLSAke2Jvc3MubmFtZX1gLCA1LCBcIkJvc3NcIiwgXCJOb25lXCIsIFxuICAgICAgICAgICAgICAgIG1vbWVudCgpLmFkZCgzLCAnZGF5cycpLnRvSVNPU3RyaW5nKCksIHRydWUsIFwiQ3JpdGljYWxcIiwgdHJ1ZVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgc2V0VGltZW91dChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2FmZU5hbWUgPSB0aGlzLnRvU2FmZVF1ZXN0TmFtZShgQk9TU19MVkwke2xldmVsfSAtICR7Ym9zcy5uYW1lfWApO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVzID0gdGhpcy5hcHAudmF1bHQuZ2V0TWFya2Rvd25GaWxlcygpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSBmaWxlcy5maW5kKGYgPT4gZi5iYXNlbmFtZS50b0xvd2VyQ2FzZSgpID09PSBzYWZlTmFtZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXhIcCA9IDEwMCArIChsZXZlbCAqIDIwKTsgXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZm0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZtLmJvc3NfaHAgPSBtYXhIcDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZtLmJvc3NfbWF4X2hwID0gbWF4SHA7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJ1cGRhdGVcIik7IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDUwMCk7IFxuICAgICAgICB9LCAzMDAwKTtcbiAgICB9XG5cbiAgICBhc3luYyBkYW1hZ2VCb3NzKGZpbGU6IFRGaWxlKSB7XG4gICAgICAgIGNvbnN0IGZtID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk/LmZyb250bWF0dGVyO1xuICAgICAgICBpZiAoIWZtIHx8ICFmbS5pc19ib3NzKSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgZGFtYWdlID0gMjU7IFxuICAgICAgICBjb25zdCBjdXJyZW50SHAgPSBmbS5ib3NzX2hwIHx8IDEwMDtcbiAgICAgICAgY29uc3QgbmV3SHAgPSBjdXJyZW50SHAgLSBkYW1hZ2U7XG5cbiAgICAgICAgaWYgKG5ld0hwIDw9IDApIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY29tcGxldGVRdWVzdChmaWxlKTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCLimpTvuI8gRklOQUwgQkxPVyEgQm9zcyBEZWZlYXRlZCFcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGYpID0+IHtcbiAgICAgICAgICAgICAgICBmLmJvc3NfaHAgPSBuZXdIcDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5hdWRpby5wbGF5U291bmQoXCJmYWlsXCIpO1xuICAgICAgICAgICAgbmV3IE5vdGljZShg4pqU77iPIEJvc3MgRGFtYWdlZCEgJHtuZXdIcH0vJHtmbS5ib3NzX21heF9ocH0gSFAgcmVtYWluaW5nYCk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMudHJpZ2dlcihcInVwZGF0ZVwiKSwgMjAwKTsgXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBmYWlsUXVlc3QoZmlsZTogVEZpbGUsIG1hbnVhbEFib3J0OiBib29sZWFuID0gZmFsc2UpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNSZXN0aW5nKCkgJiYgIW1hbnVhbEFib3J0KSB7IG5ldyBOb3RpY2UoXCJSZXN0IERheSBwcm90ZWN0aW9uLlwiKTsgcmV0dXJuOyB9XG4gICAgICAgIGlmICh0aGlzLmlzU2hpZWxkZWQoKSAmJiAhbWFudWFsQWJvcnQpIHsgbmV3IE5vdGljZShcIlNoaWVsZGVkIVwiKTsgcmV0dXJuOyB9XG5cbiAgICAgICAgbGV0IGRhbWFnZU11bHQgPSAxO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmFjdGl2ZUJ1ZmZzLmZvckVhY2goYiA9PiB7XG4gICAgICAgICAgICBpZiAoYi5lZmZlY3QuZGFtYWdlTXVsdCkgZGFtYWdlTXVsdCAqPSBiLmVmZmVjdC5kYW1hZ2VNdWx0O1xuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCBmbSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcbiAgICAgICAgbGV0IGJvc3NIcFBlbmFsdHkgPSAwO1xuICAgICAgICBpZiAoZm0/LmlzX2Jvc3MpIHtcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gZmlsZS5iYXNlbmFtZS5tYXRjaCgvQk9TU19MVkwoXFxkKykvKTtcbiAgICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxldmVsID0gcGFyc2VJbnQobWF0Y2hbMV0pO1xuICAgICAgICAgICAgICAgIGJvc3NIcFBlbmFsdHkgPSBnZXRCb3NzSHBQZW5hbHR5KGxldmVsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGRhbWFnZSA9IGNvbXB1dGVGYWlsRGFtYWdlKFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5yaXZhbERtZyxcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZ29sZCxcbiAgICAgICAgICAgIGRhbWFnZU11bHQsXG4gICAgICAgICAgICBib3NzSHBQZW5hbHR5XG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKHRoaXMucGx1Z2luLmtlcm5lbCkge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4ua2VybmVsLmV2ZW50cy5lbWl0KCdxdWVzdDpmYWlsZWQnLCB7XG4gICAgICAgICAgICAgICAgcXVlc3RJZDogZmlsZS5iYXNlbmFtZSxcbiAgICAgICAgICAgICAgICByZWFzb246IG1hbnVhbEFib3J0ID8gJ21hbnVhbF9hYm9ydCcgOiAnZmFpbGVkJyxcbiAgICAgICAgICAgICAgICBkYW1hZ2UsXG4gICAgICAgICAgICAgICAgbWFudWFsQWJvcnQsXG4gICAgICAgICAgICAgICAgYm9zc0hwUGVuYWx0eVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmFuYWx5dGljc0VuZ2luZS50cmFja0RhaWx5TWV0cmljcyhcInF1ZXN0X2ZhaWxcIiwgMSk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmhwIC09IGRhbWFnZTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZGFtYWdlVGFrZW5Ub2RheSArPSBkYW1hZ2U7XG4gICAgICAgICAgICBpZiAoIW1hbnVhbEFib3J0KSB0aGlzLnNldHRpbmdzLnJpdmFsRG1nICs9IDE7XG5cbiAgICAgICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwiZmFpbFwiKTtcbiAgICAgICAgICAgIHRoaXMuY2hlY2tEYWlseU1pc3Npb25zKHsgdHlwZTogXCJkYW1hZ2VcIiB9KTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZGFtYWdlVGFrZW5Ub2RheSA+IDUwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tZWRpdGF0aW9uRW5naW5lLnRyaWdnZXJMb2NrZG93bigpO1xuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcImxvY2tkb3duXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5ocCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgbmV3IERlYXRoTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luKS5vcGVuKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYm9zc0hwUGVuYWx0eSA+IDApIHtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGDimKDvuI8gQm9zcyBDcnVzaDogKyR7Ym9zc0hwUGVuYWx0eX0gRGFtYWdlYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5ocCA8PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBncmF2ZVBhdGggPSBcIkdyYXZleWFyZC9GYWlsdXJlc1wiO1xuICAgICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChncmF2ZVBhdGgpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZ3JhdmVQYXRoKTtcblxuICAgICAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5yZW5hbWVGaWxlKGZpbGUsIGAke2dyYXZlUGF0aH0vW0ZBSUxFRF0gJHtmaWxlLm5hbWV9YCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgIH1cbiAgICBcbiAgICBhc3luYyBjcmVhdGVRdWVzdChuYW1lOiBzdHJpbmcsIGRpZmY6IG51bWJlciwgc2tpbGw6IHN0cmluZywgc2VjU2tpbGw6IHN0cmluZywgZGVhZGxpbmVJc286IHN0cmluZywgaGlnaFN0YWtlczogYm9vbGVhbiwgcHJpb3JpdHk6IHN0cmluZywgaXNCb3NzOiBib29sZWFuKSB7XG4gICAgICAgIGlmICh0aGlzLm1lZGl0YXRpb25FbmdpbmUuaXNMb2NrZWREb3duKCkpIHsgbmV3IE5vdGljZShcIkxPQ0tET1dOIEFDVElWRVwiKTsgcmV0dXJuOyB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCB7IHhwUmV3YXJkLCBnb2xkUmV3YXJkLCBkaWZmTGFiZWwgfSA9IHF1ZXN0UmV3YXJkc0J5RGlmZmljdWx0eShkaWZmLCB0aGlzLnNldHRpbmdzLnhwUmVxLCBpc0Jvc3MsIGhpZ2hTdGFrZXMpO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgcm9vdFBhdGggPSBcIkFjdGl2ZV9SdW4vUXVlc3RzXCI7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHJvb3RQYXRoKSkgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKHJvb3RQYXRoKTtcblxuICAgICAgICBjb25zdCBzYWZlTmFtZSA9IHRoaXMudG9TYWZlUXVlc3ROYW1lKG5hbWUpO1xuICAgICAgICBjb25zdCBjb250ZW50ID0gYC0tLVxudHlwZTogcXVlc3RcbnN0YXR1czogYWN0aXZlXG5kaWZmaWN1bHR5OiAke2RpZmZMYWJlbH1cbnByaW9yaXR5OiAke3ByaW9yaXR5fVxueHBfcmV3YXJkOiAke3hwUmV3YXJkfVxuZ29sZF9yZXdhcmQ6ICR7Z29sZFJld2FyZH1cbnNraWxsOiAke3NraWxsfVxuc2Vjb25kYXJ5X3NraWxsOiAke3NlY1NraWxsfVxuaGlnaF9zdGFrZXM6ICR7aGlnaFN0YWtlcyA/ICd0cnVlJyA6ICdmYWxzZSd9XG5pc19ib3NzOiAke2lzQm9zc31cbmNyZWF0ZWQ6ICR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpfVxuZGVhZGxpbmU6ICR7ZGVhZGxpbmVJc299XG4tLS1cbiMg4pqU77iPICR7bmFtZX1gO1xuICAgICAgICBcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKGAke3Jvb3RQYXRofS8ke3NhZmVOYW1lfS5tZGAsIGNvbnRlbnQpO1xuICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImNsaWNrXCIpO1xuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBhc3luYyBkZWxldGVRdWVzdChmaWxlOiBURmlsZSkge1xuICAgICAgICBjb25zdCB7IGNvc3QgfSA9IHRoaXMubWVkaXRhdGlvbkVuZ2luZS5nZXREZWxldGlvbkNvc3QoKTtcbiAgICAgICAgaWYgKGNvc3QgPiAwICYmIHRoaXMuc2V0dGluZ3MuZ29sZCA8IGNvc3QpIHtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJJbnN1ZmZpY2llbnQgZ29sZCBmb3IgcGFpZCBkZWxldGlvbiFcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb3N0UmVzdWx0ID0gdGhpcy5tZWRpdGF0aW9uRW5naW5lLmFwcGx5RGVsZXRpb25Db3N0KCk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpO1xuICAgICAgICAgICAgdGhpcy5kZWxldGVkUXVlc3RCdWZmZXIucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogZmlsZS5uYW1lLFxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgcGF0aDogZmlsZS5wYXRoLFxuICAgICAgICAgICAgICAgIGRlbGV0ZWRBdDogRGF0ZS5ub3coKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAodGhpcy5kZWxldGVkUXVlc3RCdWZmZXIubGVuZ3RoID4gNSkgdGhpcy5kZWxldGVkUXVlc3RCdWZmZXIuc2hpZnQoKTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcInVuZG86c2hvd1wiLCBmaWxlLmJhc2VuYW1lKTtcbiAgICAgICAgfSBjYXRjaChlKSB7IGNvbnNvbGUuZXJyb3IoXCJCdWZmZXIgZmFpbFwiLCBlKTsgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmRlbGV0ZShmaWxlKTtcbiAgICAgICAgaWYgKGNvc3RSZXN1bHQubWVzc2FnZSkgbmV3IE5vdGljZShjb3N0UmVzdWx0Lm1lc3NhZ2UpO1xuICAgICAgICB0aGlzLnNhdmUoKTsgXG4gICAgfVxuICBcbiAgICBhc3luYyB1bmRvTGFzdERlbGV0aW9uKCkge1xuICAgICAgICBjb25zdCBsYXN0ID0gdGhpcy5kZWxldGVkUXVlc3RCdWZmZXIucG9wKCk7XG4gICAgICAgIGlmICghbGFzdCkgeyBuZXcgTm90aWNlKFwiTm90aGluZyB0byB1bmRvLlwiKTsgcmV0dXJuOyB9XG4gICAgICAgIFxuICAgICAgICBpZiAoRGF0ZS5ub3coKSAtIGxhc3QuZGVsZXRlZEF0ID4gNjAwMDApIHsgbmV3IE5vdGljZShcIlRvbyBsYXRlIHRvIHVuZG8uXCIpOyByZXR1cm47IH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKGxhc3QucGF0aCwgbGFzdC5jb250ZW50KTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoYFJlc3RvcmVkOiAke2xhc3QubmFtZX1gKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwidXBkYXRlXCIpO1xuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgIFxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiQ291bGQgbm90IHJlc3RvcmUgZmlsZSAocGF0aCBtYXkgYmUgdGFrZW4pLlwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGNoZWNrRGVhZGxpbmVzKCkge1xuICAgICAgICBpZiAoIXRoaXMucGx1Z2luLmtlcm5lbCkge1xuICAgICAgICAgICAgY29uc3Qgbm93ID0gbW9tZW50KCk7XG4gICAgICAgICAgICBjb25zdCBpbml0aWFsQ291bnQgPSB0aGlzLnNldHRpbmdzLmFjdGl2ZUJ1ZmZzLmxlbmd0aDtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuYWN0aXZlQnVmZnMgPSB0aGlzLnNldHRpbmdzLmFjdGl2ZUJ1ZmZzLmZpbHRlcihiID0+IG1vbWVudChiLmV4cGlyZXNBdCkuaXNBZnRlcihub3cpKTtcbiAgICAgICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmFjdGl2ZUJ1ZmZzLmxlbmd0aCA8IGluaXRpYWxDb3VudCkge1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJBIHBvdGlvbiBlZmZlY3QgaGFzIHdvcm4gb2ZmLlwiKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJ1cGRhdGVcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiQWN0aXZlX1J1bi9RdWVzdHNcIik7XG4gICAgICAgIGlmICghKGZvbGRlciBpbnN0YW5jZW9mIFRGb2xkZXIpKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBjb25zdCB6ZXJvSW5ib3ggPSB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMuZmluZChtID0+IG0uY2hlY2tGdW5jID09PSBcInplcm9faW5ib3hcIiAmJiAhbS5jb21wbGV0ZWQpO1xuICAgICAgICBpZiAoemVyb0luYm94KSB7XG4gICAgICAgICAgICBjb25zdCBzY3JhcHMgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJTY3JhcHNcIik7XG4gICAgICAgICAgICBpZiAoc2NyYXBzIGluc3RhbmNlb2YgVEZvbGRlciAmJiBzY3JhcHMuY2hpbGRyZW4ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jaGVja0RhaWx5TWlzc2lvbnMoeyB0eXBlOiBcImNoZWNrXCIgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZm9sZGVyLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZm0gPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgICAgICAgICAgaWYgKGZtPy5kZWFkbGluZSAmJiBtb21lbnQoKS5pc0FmdGVyKG1vbWVudChmbS5kZWFkbGluZSkpKSBhd2FpdCB0aGlzLmZhaWxRdWVzdChmaWxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBhc3luYyByb2xsQ2hhb3Moc2hvd01vZGFsOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3Qgcm9sbCA9IE1hdGgucmFuZG9tKCk7XG4gICAgICAgIGlmIChyb2xsIDwgMC40KSB0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIgPSBERUZBVUxUX01PRElGSUVSO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGlkeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChDSEFPU19UQUJMRS5sZW5ndGggLSAxKSkgKyAxO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyID0gQ0hBT1NfVEFCTEVbaWR4XTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICAgICAgaWYgKHNob3dNb2RhbCkgbmV3IENoYW9zTW9kYWwodGhpcy5hcHAsIHRoaXMuc2V0dGluZ3MuZGFpbHlNb2RpZmllcikub3BlbigpO1xuICAgIH1cblxuICAgIGFzeW5jIGF0dGVtcHRSZWNvdmVyeSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLm1lZGl0YXRpb25FbmdpbmUuaXNMb2NrZWREb3duKCkpIHsgbmV3IE5vdGljZShcIk5vdCBpbiBMb2NrZG93bi5cIik7IHJldHVybjsgfVxuICAgICAgICBjb25zdCB7IGhvdXJzLCBtaW51dGVzIH0gPSB0aGlzLm1lZGl0YXRpb25FbmdpbmUuZ2V0TG9ja2Rvd25UaW1lUmVtYWluaW5nKCk7XG4gICAgICAgIG5ldyBOb3RpY2UoYFJlY292ZXJpbmcuLi4gJHtob3Vyc31oICR7bWludXRlc31tIHJlbWFpbmluZy5gKTtcbiAgICB9XG5cbiAgICBpc0xvY2tlZERvd24oKSB7IHJldHVybiB0aGlzLm1lZGl0YXRpb25FbmdpbmUuaXNMb2NrZWREb3duKCk7IH1cbiAgICBpc1Jlc3RpbmcoKSB7IHJldHVybiB0aGlzLnNldHRpbmdzLnJlc3REYXlVbnRpbCAmJiBtb21lbnQoKS5pc0JlZm9yZShtb21lbnQodGhpcy5zZXR0aW5ncy5yZXN0RGF5VW50aWwpKTsgfVxuICAgIGlzU2hpZWxkZWQoKSB7IHJldHVybiB0aGlzLnNldHRpbmdzLnNoaWVsZGVkVW50aWwgJiYgbW9tZW50KCkuaXNCZWZvcmUobW9tZW50KHRoaXMuc2V0dGluZ3Muc2hpZWxkZWRVbnRpbCkpOyB9XG5cbiAgICBhc3luYyBjcmVhdGVSZXNlYXJjaFF1ZXN0KHRpdGxlOiBzdHJpbmcsIHR5cGU6IGFueSwgbGlua2VkU2tpbGw6IHN0cmluZywgbGlua2VkQ29tYmF0UXVlc3Q6IHN0cmluZyk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfT4ge1xuICAgICAgICBjb25zdCByZXMgPSBhd2FpdCB0aGlzLnJlc2VhcmNoRW5naW5lLmNyZWF0ZVJlc2VhcmNoUXVlc3QodGl0bGUsIHR5cGUsIGxpbmtlZFNraWxsLCBsaW5rZWRDb21iYXRRdWVzdCk7XG4gICAgICAgIGlmIChyZXMuc3VjY2Vzcykge1xuICAgICAgICAgICAgbmV3IE5vdGljZShyZXMubWVzc2FnZSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UocmVzLm1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIFxuICAgIGNvbXBsZXRlUmVzZWFyY2hRdWVzdChpZDogc3RyaW5nLCB3b3JkczogbnVtYmVyKSB7IHRoaXMucmVzZWFyY2hFbmdpbmUuY29tcGxldGVSZXNlYXJjaFF1ZXN0KGlkLCB3b3Jkcyk7IHRoaXMuc2F2ZSgpOyB9XG4gICAgYXN5bmMgZGVsZXRlUmVzZWFyY2hRdWVzdChpZDogc3RyaW5nKSB7IGF3YWl0IHRoaXMucmVzZWFyY2hFbmdpbmUuZGVsZXRlUmVzZWFyY2hRdWVzdChpZCk7IGF3YWl0IHRoaXMuc2F2ZSgpOyB9XG4gICAgdXBkYXRlUmVzZWFyY2hXb3JkQ291bnQoaWQ6IHN0cmluZywgd29yZHM6IG51bWJlcikgeyBcbiAgICAgICAgdGhpcy5yZXNlYXJjaEVuZ2luZS51cGRhdGVSZXNlYXJjaFdvcmRDb3VudChpZCwgd29yZHMpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoXCJ1cGRhdGVcIik7XG4gICAgfVxuICAgIGdldFJlc2VhcmNoUmF0aW8oKSB7IHJldHVybiB0aGlzLnJlc2VhcmNoRW5naW5lLmdldFJlc2VhcmNoUmF0aW8oKTsgfVxuICAgIGNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKSB7IHJldHVybiB0aGlzLnJlc2VhcmNoRW5naW5lLmNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKTsgfVxuICAgIFxuICAgIGFzeW5jIHN0YXJ0TWVkaXRhdGlvbigpIHsgY29uc3QgciA9IHRoaXMubWVkaXRhdGlvbkVuZ2luZS5tZWRpdGF0ZSgpOyBuZXcgTm90aWNlKHIubWVzc2FnZSk7IGF3YWl0IHRoaXMuc2F2ZSgpOyB9XG4gICAgZ2V0TWVkaXRhdGlvblN0YXR1cygpIHsgcmV0dXJuIHRoaXMubWVkaXRhdGlvbkVuZ2luZS5nZXRNZWRpdGF0aW9uU3RhdHVzKCk7IH1cbiAgICBhc3luYyBjcmVhdGVTY3JhcChjb250ZW50OiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgZm9sZGVyUGF0aCA9IFwiU2NyYXBzXCI7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZvbGRlclBhdGgpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZm9sZGVyUGF0aCk7XG4gICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tREQgSEgtbW0tc3NcIik7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShgJHtmb2xkZXJQYXRofS8ke3RpbWVzdGFtcH0ubWRgLCBjb250ZW50KTtcbiAgICAgICAgbmV3IE5vdGljZShcIuKaoSBTY3JhcCBDYXB0dXJlZFwiKTsgdGhpcy5hdWRpby5wbGF5U291bmQoXCJjbGlja1wiKTtcbiAgICB9XG4gICAgXG4gICAgYXN5bmMgZ2VuZXJhdGVTa2lsbEdyYXBoKCkgeyBcbiAgICAgICAgY29uc3Qgc2tpbGxzID0gdGhpcy5zZXR0aW5ncy5za2lsbHM7XG4gICAgICAgIGlmIChza2lsbHMubGVuZ3RoID09PSAwKSB7IG5ldyBOb3RpY2UoXCJObyBuZXVyYWwgbm9kZXMgZm91bmQuXCIpOyByZXR1cm47IH1cbiAgICAgICAgY29uc3Qgbm9kZXM6IGFueVtdID0gW107IGNvbnN0IGVkZ2VzOiBhbnlbXSA9IFtdO1xuICAgICAgICBjb25zdCB3aWR0aCA9IDI1MDsgY29uc3QgaGVpZ2h0ID0gMTQwOyBcbiAgICAgICAgY29uc3QgcmFkaXVzID0gTWF0aC5tYXgoNDAwLCBza2lsbHMubGVuZ3RoICogNjApO1xuICAgICAgICBjb25zdCBjZW50ZXJYID0gMDsgY29uc3QgY2VudGVyWSA9IDA7IGNvbnN0IGFuZ2xlU3RlcCA9ICgyICogTWF0aC5QSSkgLyBza2lsbHMubGVuZ3RoO1xuXG4gICAgICAgIHNraWxscy5mb3JFYWNoKChza2lsbCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGFuZ2xlID0gaW5kZXggKiBhbmdsZVN0ZXA7XG4gICAgICAgICAgICBjb25zdCB4ID0gY2VudGVyWCArIHJhZGl1cyAqIE1hdGguY29zKGFuZ2xlKTtcbiAgICAgICAgICAgIGNvbnN0IHkgPSBjZW50ZXJZICsgcmFkaXVzICogTWF0aC5zaW4oYW5nbGUpO1xuICAgICAgICAgICAgbGV0IGNvbG9yID0gXCI0XCI7IFxuICAgICAgICAgICAgaWYgKHNraWxsLnJ1c3QgPiAwKSBjb2xvciA9IFwiMVwiOyBlbHNlIGlmIChza2lsbC5sZXZlbCA+PSAxMCkgY29sb3IgPSBcIjZcIjtcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1c0ljb24gPSBza2lsbC5ydXN0ID4gMCA/IFwi4pqg77iPIFJVU1RZXCIgOiBcIvCfn6IgQUNUSVZFXCI7XG4gICAgICAgICAgICBjb25zdCBwcm9ncmVzcyA9IHNraWxsLnhwUmVxID4gMCA/IE1hdGguZmxvb3IoKHNraWxsLnhwIC8gc2tpbGwueHBSZXEpICogMTAwKSA6IDA7XG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gYCMjICR7c2tpbGwubmFtZX1cXG4qKkx2ICR7c2tpbGwubGV2ZWx9KipcXG4ke3N0YXR1c0ljb259XFxuWFA6ICR7c2tpbGwueHB9LyR7c2tpbGwueHBSZXF9ICgke3Byb2dyZXNzfSUpYDsgXG4gICAgICAgICAgICBub2Rlcy5wdXNoKHsgaWQ6IHNraWxsLm5hbWUsIHg6IE1hdGguZmxvb3IoeCksIHk6IE1hdGguZmxvb3IoeSksIHdpZHRoLCBoZWlnaHQsIHR5cGU6IFwidGV4dFwiLCB0ZXh0LCBjb2xvciB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2tpbGxzLmZvckVhY2goc2tpbGwgPT4ge1xuICAgICAgICAgICAgaWYgKHNraWxsLmNvbm5lY3Rpb25zKSB7XG4gICAgICAgICAgICAgICAgc2tpbGwuY29ubmVjdGlvbnMuZm9yRWFjaCh0YXJnZXROYW1lID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNraWxscy5maW5kKHMgPT4gcy5uYW1lID09PSB0YXJnZXROYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWRnZXMucHVzaCh7IGlkOiBgJHtza2lsbC5uYW1lfS0ke3RhcmdldE5hbWV9YCwgZnJvbU5vZGU6IHNraWxsLm5hbWUsIGZyb21TaWRlOiBcInJpZ2h0XCIsIHRvTm9kZTogdGFyZ2V0TmFtZSwgdG9TaWRlOiBcImxlZnRcIiwgY29sb3I6IFwiNFwiIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGNhbnZhc0RhdGEgPSB7IG5vZGVzLCBlZGdlcyB9O1xuICAgICAgICBjb25zdCBwYXRoID0gdGhpcy5zZXR0aW5ncy5uZXVyYWxIdWJQYXRoIHx8IFwiQWN0aXZlX1J1bi9OZXVyYWxfSHViLmNhbnZhc1wiO1xuICAgICAgICBjb25zdCBmaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHBhdGgpO1xuICAgICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7IGF3YWl0IHRoaXMuYXBwLnZhdWx0Lm1vZGlmeShmaWxlLCBKU09OLnN0cmluZ2lmeShjYW52YXNEYXRhLCBudWxsLCAyKSk7IG5ldyBOb3RpY2UoXCJOZXVyYWwgSHViIHVwZGF0ZWQuXCIpOyB9IFxuICAgICAgICBlbHNlIHsgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKHBhdGgsIEpTT04uc3RyaW5naWZ5KGNhbnZhc0RhdGEsIG51bGwsIDIpKTsgbmV3IE5vdGljZShcIk5ldXJhbCBIdWIgY3JlYXRlZC5cIik7IH1cbiAgICB9XG5cbiAgICBhc3luYyBjcmVhdGVRdWVzdENoYWluKG5hbWU6IHN0cmluZywgcXVlc3RzOiBzdHJpbmdbXSkgeyBhd2FpdCB0aGlzLmNoYWluc0VuZ2luZS5jcmVhdGVRdWVzdENoYWluKG5hbWUsIHF1ZXN0cyk7IGF3YWl0IHRoaXMuc2F2ZSgpOyB9XG4gICAgZ2V0QWN0aXZlQ2hhaW4oKSB7IHJldHVybiB0aGlzLmNoYWluc0VuZ2luZS5nZXRBY3RpdmVDaGFpbigpOyB9XG4gICAgZ2V0Q2hhaW5Qcm9ncmVzcygpIHsgcmV0dXJuIHRoaXMuY2hhaW5zRW5naW5lLmdldENoYWluUHJvZ3Jlc3MoKTsgfVxuICAgIGFzeW5jIGJyZWFrQ2hhaW4oKSB7IGF3YWl0IHRoaXMuY2hhaW5zRW5naW5lLmJyZWFrQ2hhaW4oKTsgYXdhaXQgdGhpcy5zYXZlKCk7IH1cbiAgICBcbiAgICBzZXRGaWx0ZXJTdGF0ZShlbmVyZ3k6IGFueSwgY29udGV4dDogYW55LCB0YWdzOiBzdHJpbmdbXSkgeyB0aGlzLmZpbHRlcnNFbmdpbmUuc2V0RmlsdGVyU3RhdGUoZW5lcmd5LCBjb250ZXh0LCB0YWdzKTsgdGhpcy5zYXZlKCk7IH1cbiAgICBjbGVhckZpbHRlcnMoKSB7IHRoaXMuZmlsdGVyc0VuZ2luZS5jbGVhckZpbHRlcnMoKTsgdGhpcy5zYXZlKCk7IH1cbiAgICBcbiAgICBnZXRHYW1lU3RhdHMoKSB7IHJldHVybiB0aGlzLmFuYWx5dGljc0VuZ2luZS5nZXRHYW1lU3RhdHMoKTsgfVxuICAgIGNoZWNrQm9zc01pbGVzdG9uZXMoKSB7IHJldHVybiB0aGlzLmFuYWx5dGljc0VuZ2luZS5jaGVja0Jvc3NNaWxlc3RvbmVzKCk7IH1cbiAgICBnZW5lcmF0ZVdlZWtseVJlcG9ydCgpIHsgcmV0dXJuIHRoaXMuYW5hbHl0aWNzRW5naW5lLmdlbmVyYXRlV2Vla2x5UmVwb3J0KCk7IH1cblxuICAgIHRhdW50KHRyaWdnZXI6IHN0cmluZykge1xuICAgICAgICBjb25zdCBtc2dzOiBhbnkgPSB7IFxuICAgICAgICAgICAgXCJmYWlsXCI6IFtcIlBhdGhldGljLlwiLCBcIlRyeSBhZ2Fpbi5cIiwgXCJJcyB0aGF0IGFsbD9cIl0sIFxuICAgICAgICAgICAgXCJsZXZlbF91cFwiOiBbXCJQb3dlciBvdmVyd2hlbG1pbmcuXCIsIFwiQXNjZW5kaW5nLlwiXSxcbiAgICAgICAgICAgIFwibG93X2hwXCI6IFtcIkJsZWVkaW5nIG91dC4uLlwiLCBcIkhvbGQgb24uXCJdIFxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBtc2cgPSBtc2dzW3RyaWdnZXJdID8gbXNnc1t0cmlnZ2VyXVtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBtc2dzW3RyaWdnZXJdLmxlbmd0aCldIDogXCJPYnNlcnZlLlwiO1xuICAgICAgICBuZXcgTm90aWNlKGBTWVNURU06ICR7bXNnfWApO1xuICAgIH1cbiAgICBcbiAgICBwYXJzZVF1aWNrSW5wdXQodGV4dDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IG1hdGNoID0gdGV4dC5tYXRjaCgvKC4rPylcXHMqXFwvKFxcZCkvKTtcbiAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICBjb25zdCBkaWZmID0gTWF0aC5taW4oNSwgTWF0aC5tYXgoMSwgcGFyc2VJbnQobWF0Y2hbMl0sIDEwKSB8fCAzKSk7XG4gICAgICAgICAgICB0aGlzLmNyZWF0ZVF1ZXN0KG1hdGNoWzFdLCBkaWZmLCBcIk5vbmVcIiwgXCJOb25lXCIsIG1vbWVudCgpLmFkZCgyNCwgJ2hvdXJzJykudG9JU09TdHJpbmcoKSwgZmFsc2UsIFwiTm9ybWFsXCIsIGZhbHNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlUXVlc3QodGV4dCwgMywgXCJOb25lXCIsIFwiTm9uZVwiLCBtb21lbnQoKS5hZGQoMjQsICdob3VycycpLnRvSVNPU3RyaW5nKCksIGZhbHNlLCBcIk5vcm1hbFwiLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyB0cmlnZ2VyRGVhdGgoKSB7XG4gICAgICAgIGNvbnN0IG5leHREZWF0aCA9ICh0aGlzLnNldHRpbmdzLmxlZ2FjeT8uZGVhdGhDb3VudCB8fCAwKSArIDE7XG4gICAgICAgIGNvbnN0IHJ1bkxldmVsID0gdGhpcy5zZXR0aW5ncy5sZXZlbDtcbiAgICAgICAgY29uc3QgcnVuU3RyZWFrID0gdGhpcy5zZXR0aW5ncy5zdHJlYWs/Lmxvbmdlc3QgfHwgMDtcbiAgICAgICAgY29uc3QgYm9zc2VzRGVmZWF0ZWQgPSAodGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcyB8fCBbXSkuZmlsdGVyKChiOiB7IGRlZmVhdGVkPzogYm9vbGVhbiB9KSA9PiBiLmRlZmVhdGVkKS5sZW5ndGg7XG5cbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLnNjYXJzKSB0aGlzLnNldHRpbmdzLnNjYXJzID0gW107XG4gICAgICAgIHRoaXMuc2V0dGluZ3Muc2NhcnMucHVzaCh7XG4gICAgICAgICAgICBpZDogYGRlYXRoXyR7RGF0ZS5ub3coKX1gLFxuICAgICAgICAgICAgbGFiZWw6IFwiRGVhdGhcIixcbiAgICAgICAgICAgIHZhbHVlOiBgIyR7bmV4dERlYXRofSDCtyBMdiAke3J1bkxldmVsfSDCtyBTdHJlYWsgJHtydW5TdHJlYWt9IMK3IEJvc3NlcyAke2Jvc3Nlc0RlZmVhdGVkfWAsXG4gICAgICAgICAgICBlYXJuZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGFjdGl2ZUZvbGRlciA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChcIkFjdGl2ZV9SdW4vUXVlc3RzXCIpO1xuICAgICAgICBjb25zdCBncmF2ZUZvbGRlciA9IFwiR3JhdmV5YXJkL0RlYXRocy9cIiArIG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tREQtSEhtbVwiKTtcbiAgICAgICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZ3JhdmVGb2xkZXIpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZ3JhdmVGb2xkZXIpO1xuXG4gICAgICAgIGlmIChhY3RpdmVGb2xkZXIgaW5zdGFuY2VvZiBURm9sZGVyKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgYWN0aXZlRm9sZGVyLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5yZW5hbWVGaWxlKGZpbGUsIGAke2dyYXZlRm9sZGVyfS8ke2ZpbGUubmFtZX1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNldHRpbmdzLmxldmVsID0gMTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5ocCA9IDEwMDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5nb2xkID0gMDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sZWdhY3kuZGVhdGhDb3VudCA9IG5leHREZWF0aDtcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlKCk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgbW9tZW50IH0gZnJvbSAnb2JzaWRpYW4nO1xuXG5leHBvcnQgY2xhc3MgQ2hhcnRSZW5kZXJlciB7XG4gICAgLy8gW0ZJWF0gQWRkZWQgb3B0aW9uYWwgJ3dpZHRoJyBwYXJhbWV0ZXJcbiAgICBzdGF0aWMgcmVuZGVyTGluZUNoYXJ0KHBhcmVudDogSFRNTEVsZW1lbnQsIG1ldHJpY3M6IGFueVtdLCB3aWR0aE92ZXJyaWRlPzogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGhlaWdodCA9IDEwMDsgLy8gTWF0Y2hlcyBDU1MgaGVpZ2h0XG4gICAgICAgIGNvbnN0IHdpZHRoID0gd2lkdGhPdmVycmlkZSB8fCBwYXJlbnQuY2xpZW50V2lkdGggfHwgMzAwO1xuICAgICAgICBjb25zdCBwYWRkaW5nID0gNTsgLy8gUmVkdWNlZCBwYWRkaW5nXG4gICAgICAgIFxuICAgICAgICBjb25zdCBkYXRhOiBudW1iZXJbXSA9IFtdO1xuICAgICAgICBjb25zdCBsYWJlbHM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSA2OyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgY29uc3QgZCA9IG1vbWVudCgpLnN1YnRyYWN0KGksICdkYXlzJykuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgICAgIGNvbnN0IG0gPSBtZXRyaWNzLmZpbmQoeCA9PiB4LmRhdGUgPT09IGQpO1xuICAgICAgICAgICAgZGF0YS5wdXNoKG0gPyBtLnF1ZXN0c0NvbXBsZXRlZCA6IDApO1xuICAgICAgICAgICAgbGFiZWxzLnB1c2gobW9tZW50KGQpLmZvcm1hdChcImRkZFwiKSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtYXhWYWwgPSBNYXRoLm1heCguLi5kYXRhLCA1KTtcbiAgICAgICAgY29uc3QgcG9pbnRzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBjb25zdCBkaXZpc29yID0gTWF0aC5tYXgoMSwgZGF0YS5sZW5ndGggLSAxKTtcblxuICAgICAgICBkYXRhLmZvckVhY2goKHZhbCwgaWR4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB4ID0gKGlkeCAvIGRpdmlzb3IpICogKHdpZHRoIC0gcGFkZGluZyAqIDIpICsgcGFkZGluZztcbiAgICAgICAgICAgIGNvbnN0IHkgPSBoZWlnaHQgLSAoKHZhbCAvIG1heFZhbCkgKiAoaGVpZ2h0IC0gcGFkZGluZyAqIDIpKSAtIHBhZGRpbmc7XG4gICAgICAgICAgICBwb2ludHMucHVzaChgJHt4fSwke3l9YCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IHN2ZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsIFwic3ZnXCIpO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKFwid2lkdGhcIiwgXCIxMDAlXCIpO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKFwiaGVpZ2h0XCIsIFwiMTAwJVwiKTsgLy8gRml0IGNvbnRhaW5lclxuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKFwidmlld0JveFwiLCBgMCAwICR7d2lkdGh9ICR7aGVpZ2h0fWApOyAvLyBTY2FsZSBjb3JyZWN0bHlcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZShcInByZXNlcnZlQXNwZWN0UmF0aW9cIiwgXCJub25lXCIpOyAvLyBTdHJldGNoIHRvIGZpdFxuICAgICAgICBzdmcuY2xhc3NMaXN0LmFkZChcInNpc3ktY2hhcnQtc3ZnXCIpO1xuICAgICAgICBwYXJlbnQuYXBwZW5kQ2hpbGQoc3ZnKTtcblxuICAgICAgICBjb25zdCBwb2x5bGluZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsIFwicG9seWxpbmVcIik7XG4gICAgICAgIHBvbHlsaW5lLnNldEF0dHJpYnV0ZShcInBvaW50c1wiLCBwb2ludHMuam9pbihcIiBcIikpO1xuICAgICAgICBwb2x5bGluZS5zZXRBdHRyaWJ1dGUoXCJmaWxsXCIsIFwibm9uZVwiKTtcbiAgICAgICAgcG9seWxpbmUuc2V0QXR0cmlidXRlKFwic3Ryb2tlXCIsIFwiIzAwYjBmZlwiKTtcbiAgICAgICAgcG9seWxpbmUuc2V0QXR0cmlidXRlKFwic3Ryb2tlLXdpZHRoXCIsIFwiMlwiKTtcbiAgICAgICAgc3ZnLmFwcGVuZENoaWxkKHBvbHlsaW5lKTtcblxuICAgICAgICBwb2ludHMuZm9yRWFjaCgocCwgaSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgW2N4LCBjeV0gPSBwLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgIGNvbnN0IGNpcmNsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsIFwiY2lyY2xlXCIpO1xuICAgICAgICAgICAgY2lyY2xlLnNldEF0dHJpYnV0ZShcImN4XCIsIGN4KTtcbiAgICAgICAgICAgIGNpcmNsZS5zZXRBdHRyaWJ1dGUoXCJjeVwiLCBjeSk7XG4gICAgICAgICAgICBjaXJjbGUuc2V0QXR0cmlidXRlKFwiclwiLCBcIjNcIik7XG4gICAgICAgICAgICBjaXJjbGUuc2V0QXR0cmlidXRlKFwiZmlsbFwiLCBcIiMwMGIwZmZcIik7XG4gICAgICAgICAgICBzdmcuYXBwZW5kQ2hpbGQoY2lyY2xlKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc3RhdGljIHJlbmRlckhlYXRtYXAocGFyZW50OiBIVE1MRWxlbWVudCwgbWV0cmljczogYW55W10pIHtcbiAgICAgICAgY29uc3QgaGVhdG1hcCA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1oZWF0bWFwXCIgfSk7XG4gICAgXG4gICAgICAgIGZvciAobGV0IGkgPSAyNzsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBtb21lbnQoKS5zdWJ0cmFjdChpLCAnZGF5cycpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgICAgICBjb25zdCBtID0gbWV0cmljcy5maW5kKHggPT4geC5kYXRlID09PSBkYXRlKTtcbiAgICAgICAgICAgIGNvbnN0IGNvdW50ID0gbSA/IG0ucXVlc3RzQ29tcGxldGVkIDogMDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbGV0IGNvbG9yID0gXCJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpXCI7XG4gICAgICAgICAgICBpZiAoY291bnQgPiAwKSBjb2xvciA9IFwicmdiYSgwLCAxNzYsIDI1NSwgMC4zKVwiO1xuICAgICAgICAgICAgaWYgKGNvdW50ID4gMykgY29sb3IgPSBcInJnYmEoMCwgMTc2LCAyNTUsIDAuNilcIjtcbiAgICAgICAgICAgIGlmIChjb3VudCA+IDYpIGNvbG9yID0gXCJyZ2JhKDAsIDE3NiwgMjU1LCAxLjApXCI7XG5cbiAgICAgICAgICAgIGNvbnN0IGRheSA9IGhlYXRtYXAuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktaGVhdC1jZWxsXCIgfSk7XG4gICAgICAgICAgICBkYXkuc3R5bGUuYmFja2dyb3VuZCA9IGNvbG9yO1xuICAgICAgICAgICAgZGF5LnNldEF0dHJpYnV0ZShcInRpdGxlXCIsIGAke2RhdGV9OiAke2NvdW50fSBxdWVzdHNgKTtcbiAgICAgICAgICAgIGlmIChpID09PSAwKSBkYXkuc3R5bGUuYm9yZGVyID0gXCIxcHggc29saWQgd2hpdGVcIjtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsImltcG9ydCB7IFRGaWxlLCBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgdHlwZSB7IFBhbm9wdGljb25WaWV3IH0gZnJvbSAnLi92aWV3JztcblxuZXhwb3J0IGNsYXNzIFF1ZXN0Q2FyZFJlbmRlcmVyIHtcbiAgICBzdGF0aWMgcmVuZGVyKHBhcmVudDogSFRNTEVsZW1lbnQsIGZpbGU6IFRGaWxlLCB2aWV3OiBQYW5vcHRpY29uVmlldykge1xuICAgICAgICBjb25zdCBmbSA9IHZpZXcuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcbiAgICAgICAgY29uc3QgY2FyZCA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jYXJkXCIgfSk7XG5cbiAgICAgICAgaWYgKHZpZXcuc2VsZWN0TW9kZSkge1xuICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IHZpZXcuc2VsZWN0ZWRRdWVzdHMuaGFzKGZpbGUpO1xuICAgICAgICAgICAgaWYgKGlzU2VsZWN0ZWQpIGNhcmQuc3R5bGUuYm9yZGVyQ29sb3IgPSBcInZhcigtLXNpc3ktYmx1ZSlcIjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgdG9wID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jYXJkLXRvcFwiIH0pO1xuICAgICAgICAgICAgY29uc3QgY2IgPSB0b3AuY3JlYXRlRWwoXCJpbnB1dFwiLCB7IHR5cGU6IFwiY2hlY2tib3hcIiB9KTtcbiAgICAgICAgICAgIGNiLmNoZWNrZWQgPSBpc1NlbGVjdGVkO1xuICAgICAgICAgICAgY2Iuc3R5bGUubWFyZ2luUmlnaHQgPSBcIjEwcHhcIjtcbiAgICAgICAgICAgIHRvcC5jcmVhdGVEaXYoeyB0ZXh0OiBmaWxlLmJhc2VuYW1lLCBjbHM6IFwic2lzeS1jYXJkLXRpdGxlXCIgfSk7XG5cbiAgICAgICAgICAgIGNhcmQub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodmlldy5zZWxlY3RlZFF1ZXN0cy5oYXMoZmlsZSkpIHZpZXcuc2VsZWN0ZWRRdWVzdHMuZGVsZXRlKGZpbGUpO1xuICAgICAgICAgICAgICAgIGVsc2Ugdmlldy5zZWxlY3RlZFF1ZXN0cy5hZGQoZmlsZSk7XG4gICAgICAgICAgICAgICAgdmlldy5yZWZyZXNoKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGZtPy5pc19ib3NzKSBjYXJkLmFkZENsYXNzKFwic2lzeS1jYXJkLWJvc3NcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vID09PSBJTVBST1ZFRCBEUkFHICYgRFJPUCA9PT1cbiAgICAgICAgICAgIGNhcmQuc2V0QXR0cmlidXRlKFwiZHJhZ2dhYmxlXCIsIFwidHJ1ZVwiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FyZC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ3N0YXJ0XCIsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgdmlldy5kcmFnZ2VkRmlsZSA9IGZpbGU7XG4gICAgICAgICAgICAgICAgY2FyZC5zdHlsZS5vcGFjaXR5ID0gXCIwLjRcIjtcbiAgICAgICAgICAgICAgICBjYXJkLnN0eWxlLnRyYW5zZm9ybSA9IFwic2NhbGUoMC45NSlcIjtcbiAgICAgICAgICAgICAgICAvLyBTZXQgZGF0YSBmb3IgY29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgICAgIGUuZGF0YVRyYW5zZmVyPy5zZXREYXRhKFwidGV4dC9wbGFpblwiLCBmaWxlLnBhdGgpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNhcmQuYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdlbmRcIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhcmQuc3R5bGUub3BhY2l0eSA9IFwiMVwiO1xuICAgICAgICAgICAgICAgIGNhcmQuc3R5bGUudHJhbnNmb3JtID0gXCJub25lXCI7XG4gICAgICAgICAgICAgICAgdmlldy5kcmFnZ2VkRmlsZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHZpc3VhbCBndWlkZXMgZnJvbSBhbGwgY2FyZHNcbiAgICAgICAgICAgICAgICBwYXJlbnQucXVlcnlTZWxlY3RvckFsbChcIi5zaXN5LWNhcmRcIikuZm9yRWFjaChlbCA9PiAoZWwgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLmJvcmRlclRvcCA9IFwiXCIpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNhcmQuYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdvdmVyXCIsIChlKSA9PiB7IFxuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTsgXG4gICAgICAgICAgICAgICAgLy8gVmlzdWFsIEN1ZTogQmx1ZSBsaW5lIGFib3ZlIGNhcmRcbiAgICAgICAgICAgICAgICBjYXJkLnN0eWxlLmJvcmRlclRvcCA9IFwiM3B4IHNvbGlkIHZhcigtLXNpc3ktYmx1ZSlcIjsgXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY2FyZC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ2xlYXZlXCIsICgpID0+IHsgXG4gICAgICAgICAgICAgICAgY2FyZC5zdHlsZS5ib3JkZXJUb3AgPSBcIlwiOyBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXJkLmFkZEV2ZW50TGlzdGVuZXIoXCJkcm9wXCIsIGFzeW5jIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGNhcmQuc3R5bGUuYm9yZGVyVG9wID0gXCJcIjtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAodmlldy5kcmFnZ2VkRmlsZSAmJiB2aWV3LmRyYWdnZWRGaWxlICE9PSBmaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgY29uc3QgZHJhZ2dlZCA9IHZpZXcuZHJhZ2dlZEZpbGU7XG4gICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgLy8gTG9naWM6IFBsYWNlICdkcmFnZ2VkJyBCRUZPUkUgJ2ZpbGUnXG4gICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0Rm0gPSB2aWV3LmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgICAgICAgICAgICAgLy8gR2V0IHRhcmdldCBvcmRlciwgZGVmYXVsdCB0byBcIm5vd1wiIGlmIG1pc3NpbmdcbiAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRPcmRlciA9IHRhcmdldEZtPy5tYW51YWxfb3JkZXIgIT09IHVuZGVmaW5lZCA/IHRhcmdldEZtLm1hbnVhbF9vcmRlciA6IG1vbWVudCgpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAvLyBOZXcgb3JkZXIgaXMgc2xpZ2h0bHkgbGVzcyB0aGFuIHRhcmdldCAocHV0cyBpdCBhYm92ZSlcbiAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdPcmRlciA9IHRhcmdldE9yZGVyIC0gMTAwOyAvLyBHYXAgb2YgMTAwIHRvIHByZXZlbnQgY29sbGlzaW9uc1xuXG4gICAgICAgICAgICAgICAgICAgLy8gQXBwbHkgY2hhbmdlXG4gICAgICAgICAgICAgICAgICAgYXdhaXQgdmlldy5wbHVnaW4uYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihkcmFnZ2VkLCAoZjphbnkpID0+IHsgXG4gICAgICAgICAgICAgICAgICAgICAgIGYubWFudWFsX29yZGVyID0gbmV3T3JkZXI7IFxuICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgIC8vIFtGSVhdIEZvcmNlIGVuZ2luZSB1cGRhdGUgdG8gcmUtc29ydCBsaXN0IGltbWVkaWF0ZWx5XG4gICAgICAgICAgICAgICAgICAgdmlldy5wbHVnaW4uZW5naW5lLnRyaWdnZXIoXCJ1cGRhdGVcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgICAgICAgICBjb25zdCB0b3AgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNhcmQtdG9wXCIgfSk7XG4gICAgICAgICAgICBjb25zdCB0aXRsZVJvdyA9IHRvcC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jYXJkLW1ldGFcIiB9KTtcbiAgICAgICAgICAgIHRpdGxlUm93LmNyZWF0ZURpdih7IHRleHQ6IGZpbGUuYmFzZW5hbWUsIGNsczogXCJzaXN5LWNhcmQtdGl0bGVcIiB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGZtPy5kZWFkbGluZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpZmYgPSBtb21lbnQoZm0uZGVhZGxpbmUpLmRpZmYobW9tZW50KCksICdtaW51dGVzJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgdCA9IHRvcC5jcmVhdGVEaXYoeyB0ZXh0OiBkaWZmIDwgMCA/IFwiRVhQSVJFRFwiIDogYCR7TWF0aC5mbG9vcihkaWZmLzYwKX1oICR7ZGlmZiU2MH1tYCwgY2xzOiBcInNpc3ktdGltZXJcIiB9KTtcbiAgICAgICAgICAgICAgICBpZiAoZGlmZiA8IDYwKSB0LmFkZENsYXNzKFwic2lzeS10aW1lci1sYXRlXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB0cmFzaCA9IHRvcC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1idG5cIiwgdGV4dDogXCJYXCIsIGF0dHI6IHsgc3R5bGU6IFwicGFkZGluZzogMnB4IDhweDsgZm9udC1zaXplOiAwLjhlbTtcIiB9IH0pO1xuICAgICAgICAgICAgdHJhc2gub25jbGljayA9IChlKSA9PiB7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IHZpZXcucGx1Z2luLmVuZ2luZS5kZWxldGVRdWVzdChmaWxlKTsgfTtcblxuICAgICAgICAgICAgaWYgKGZtPy5pc19ib3NzICYmIGZtPy5ib3NzX21heF9ocCkge1xuICAgICAgICAgICAgICAgICBjb25zdCBiYXIgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJhci1iZ1wiIH0pO1xuICAgICAgICAgICAgICAgICBjb25zdCBwY3QgPSAoKGZtLmJvc3NfaHAgPz8gMCkgLyBmbS5ib3NzX21heF9ocCkgKiAxMDA7XG4gICAgICAgICAgICAgICAgIGJhci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1iYXItZmlsbCBzaXN5LWZpbGwtcmVkXCIsIGF0dHI6IHsgc3R5bGU6IGB3aWR0aDoke3BjdH0lO2AgfSB9KTtcbiAgICAgICAgICAgICAgICAgY2FyZC5jcmVhdGVEaXYoeyB0ZXh0OiBgJHtmbS5ib3NzX2hwfS8ke2ZtLmJvc3NfbWF4X2hwfSBIUGAsIGF0dHI6IHsgc3R5bGU6IFwidGV4dC1hbGlnbjpjZW50ZXI7IGZvbnQtc2l6ZTowLjhlbTsgY29sb3I6dmFyKC0tc2lzeS1yZWQpOyBmb250LXdlaWdodDpib2xkO1wiIH0gfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGFjdHMgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWFjdGlvbnNcIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IGJPayA9IGFjdHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkNPTVBMRVRFXCIsIGNsczogXCJzaXN5LWJ0biBtb2QtZG9uZSBzaXN5LWFjdGlvbi1idG5cIiB9KTtcbiAgICAgICAgICAgIGJPay5vbmNsaWNrID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgdmlldy5wbHVnaW4uZW5naW5lLmNvbXBsZXRlUXVlc3QoZmlsZSk7IH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGJGYWlsID0gYWN0cy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiRkFJTFwiLCBjbHM6IFwic2lzeS1idG4gbW9kLWZhaWwgc2lzeS1hY3Rpb24tYnRuXCIgfSk7XG4gICAgICAgICAgICBiRmFpbC5vbmNsaWNrID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgdmlldy5wbHVnaW4uZW5naW5lLmZhaWxRdWVzdChmaWxlLCB0cnVlKTsgfTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsImltcG9ydCB7IEl0ZW1WaWV3LCBXb3Jrc3BhY2VMZWFmLCBURmlsZSwgVEZvbGRlciwgbW9tZW50LCBkZWJvdW5jZSB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCBTaXN5cGh1c1BsdWdpbiBmcm9tICcuLi9tYWluJztcbmltcG9ydCB7IFF1ZXN0TW9kYWwsIFNob3BNb2RhbCwgU2tpbGxEZXRhaWxNb2RhbCwgU2tpbGxNYW5hZ2VyTW9kYWwsIFNjYXJzTW9kYWwgfSBmcm9tICcuL21vZGFscyc7XG5pbXBvcnQgeyBTa2lsbCwgRGFpbHlNaXNzaW9uIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgQ2hhcnRSZW5kZXJlciB9IGZyb20gJy4vY2hhcnRzJztcbmltcG9ydCB7IFF1ZXN0Q2FyZFJlbmRlcmVyIH0gZnJvbSAnLi9jYXJkJztcblxuZXhwb3J0IGNvbnN0IFZJRVdfVFlQRV9QQU5PUFRJQ09OID0gXCJzaXN5cGh1cy1wYW5vcHRpY29uXCI7XG5cbmV4cG9ydCBjbGFzcyBQYW5vcHRpY29uVmlldyBleHRlbmRzIEl0ZW1WaWV3IHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuICAgIGRyYWdnZWRGaWxlOiBURmlsZSB8IG51bGwgPSBudWxsO1xuICAgIHNlbGVjdE1vZGU6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICBzZWxlY3RlZFF1ZXN0czogU2V0PFRGaWxlPiA9IG5ldyBTZXQoKTtcbiAgICBcbiAgICBwcml2YXRlIG9ic2VydmVyOiBJbnRlcnNlY3Rpb25PYnNlcnZlciB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgY3VycmVudFF1ZXN0TGlzdDogVEZpbGVbXSA9IFtdO1xuICAgIHByaXZhdGUgcmVuZGVyZWRDb3VudDogbnVtYmVyID0gMDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IEJBVENIX1NJWkUgPSAyMDtcblxuICAgIHByaXZhdGUgZGVib3VuY2VkUmVmcmVzaCA9IGRlYm91bmNlKHRoaXMucmVmcmVzaC5iaW5kKHRoaXMpLCA1MCwgdHJ1ZSk7XG5cbiAgICBjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7XG4gICAgICAgIHN1cGVyKGxlYWYpO1xuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICB9XG5cbiAgICBnZXRWaWV3VHlwZSgpIHsgcmV0dXJuIFZJRVdfVFlQRV9QQU5PUFRJQ09OOyB9XG4gICAgZ2V0RGlzcGxheVRleHQoKSB7IHJldHVybiBcIkV5ZSBTaXN5cGh1c1wiOyB9XG4gICAgZ2V0SWNvbigpIHsgcmV0dXJuIFwic2t1bGxcIjsgfVxuXG4gICAgYXN5bmMgb25PcGVuKCkgeyBcbiAgICAgICAgdGhpcy5yZWZyZXNoKCk7IFxuICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUub24oJ3VwZGF0ZScsIHRoaXMuZGVib3VuY2VkUmVmcmVzaCk7IFxuICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUub24oJ3VuZG86c2hvdycsIChuYW1lOiBzdHJpbmcpID0+IHRoaXMuc2hvd1VuZG9Ub2FzdChuYW1lKSk7XG4gICAgfVxuXG4gICAgYXN5bmMgb25DbG9zZSgpIHtcbiAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLm9mZigndXBkYXRlJywgdGhpcy5kZWJvdW5jZWRSZWZyZXNoKTtcbiAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLm9mZigndW5kbzpzaG93JywgdGhpcy5zaG93VW5kb1RvYXN0LmJpbmQodGhpcykpO1xuICAgICAgICBpZiAodGhpcy5vYnNlcnZlcikgdGhpcy5vYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgfVxuXG4gICAgYXN5bmMgcmVmcmVzaCgpIHtcbiAgICAgICAgLy8gMS4gQ2FwdHVyZSBTdGF0ZSAmIERpbWVuc2lvbnNcbiAgICAgICAgY29uc3Qgc2Nyb2xsQXJlYSA9IHRoaXMuY29udGVudEVsLnF1ZXJ5U2VsZWN0b3IoXCIuc2lzeS1zY3JvbGwtYXJlYVwiKSBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgbGV0IGxhc3RTY3JvbGwgPSAwO1xuICAgICAgICBpZiAoc2Nyb2xsQXJlYSkgbGFzdFNjcm9sbCA9IHNjcm9sbEFyZWEuc2Nyb2xsVG9wO1xuXG4gICAgICAgIC8vIFtGSVhdIE1lYXN1cmUgd2lkdGggQkVGT1JFIHdpcGluZyBET00gc28gd2UgY2FuIGRyYXcgY2hhcnRzIG9mZi1zY3JlZW5cbiAgICAgICAgY29uc3QgY3VycmVudFdpZHRoID0gdGhpcy5jb250ZW50RWwuY2xpZW50V2lkdGggfHwgMzAwOyBcblxuICAgICAgICBjb25zdCBpdGVtc1RvUmVzdG9yZSA9IE1hdGgubWF4KHRoaXMucmVuZGVyZWRDb3VudCwgdGhpcy5CQVRDSF9TSVpFKTtcblxuICAgICAgICBjb25zdCBhY3RpdmVFbCA9IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgIGNvbnN0IGlzUXVpY2tJbnB1dCA9IGFjdGl2ZUVsICYmIGFjdGl2ZUVsLmNsYXNzTGlzdC5jb250YWlucyhcInNpc3ktcXVpY2staW5wdXRcIik7XG4gICAgICAgIGxldCBxdWlja0lucHV0VmFsdWUgPSBcIlwiO1xuICAgICAgICBpZiAoaXNRdWlja0lucHV0KSBxdWlja0lucHV0VmFsdWUgPSAoYWN0aXZlRWwgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWU7XG5cbiAgICAgICAgLy8gMi4gQ2xlYW4gJiBQcmVwXG4gICAgICAgIGlmICh0aGlzLm9ic2VydmVyKSB7IHRoaXMub2JzZXJ2ZXIuZGlzY29ubmVjdCgpOyB0aGlzLm9ic2VydmVyID0gbnVsbDsgfVxuICAgICAgICB0aGlzLnByZXBhcmVRdWVzdHMoKTsgXG4gICAgICAgIHRoaXMucmVuZGVyZWRDb3VudCA9IDA7IFxuXG4gICAgICAgIC8vIDMuIEJ1aWxkIEJ1ZmZlclxuICAgICAgICBjb25zdCBidWZmZXIgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGJ1ZmZlci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jb250YWluZXJcIiB9KTtcbiAgICAgICAgY29uc3Qgc2Nyb2xsID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXNjcm9sbC1hcmVhXCIgfSk7XG4gICAgICAgIHNjcm9sbC5zdHlsZS5zY3JvbGxCZWhhdmlvciA9IFwiYXV0b1wiO1xuXG4gICAgICAgIC8vIC0tLSBVSSBDT05TVFJVQ1RJT04gLS0tXG4gICAgICAgIGNvbnN0IGhlYWRlciA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1oZWFkZXJcIiB9KTtcbiAgICAgICAgaGVhZGVyLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIkV5ZSBTSVNZUEhVUyBPU1wiIH0pO1xuICAgICAgICBjb25zdCBzb3VuZEJ0biA9IGhlYWRlci5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5tdXRlZCA/IFwi8J+Uh1wiIDogXCLwn5SKXCIsIGNsczogXCJzaXN5LXNvdW5kLWJ0blwiIH0pO1xuICAgICAgICBzb3VuZEJ0bi5vbmNsaWNrID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLm11dGVkID0gIXRoaXMucGx1Z2luLnNldHRpbmdzLm11dGVkO1xuICAgICAgICAgICAgIHRoaXMucGx1Z2luLmF1ZGlvLnNldE11dGVkKHRoaXMucGx1Z2luLnNldHRpbmdzLm11dGVkKTtcbiAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICB0aGlzLmRlYm91bmNlZFJlZnJlc2goKTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnJlbmRlckFsZXJ0cyhzY3JvbGwpO1xuXG4gICAgICAgIGNvbnN0IGh1ZCA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1odWRcIiB9KTtcbiAgICAgICAgdGhpcy5zdGF0KGh1ZCwgXCJIRUFMVEhcIiwgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuaHB9LyR7dGhpcy5wbHVnaW4uc2V0dGluZ3MubWF4SHB9YCwgdGhpcy5wbHVnaW4uc2V0dGluZ3MuaHAgPCAzMCA/IFwic2lzeS1jcml0aWNhbFwiIDogXCJcIik7XG4gICAgICAgIHRoaXMuc3RhdChodWQsIFwiR09MRFwiLCBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkfWAsIHRoaXMucGx1Z2luLnNldHRpbmdzLmdvbGQgPCAwID8gXCJzaXN5LXZhbC1kZWJ0XCIgOiBcIlwiKTtcbiAgICAgICAgdGhpcy5zdGF0KGh1ZCwgXCJMRVZFTFwiLCBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5sZXZlbH1gKTtcbiAgICAgICAgdGhpcy5zdGF0KGh1ZCwgXCJSSVZBTCBETUdcIiwgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3Mucml2YWxEbWd9YCk7XG5cbiAgICAgICAgdGhpcy5yZW5kZXJPcmFjbGUoc2Nyb2xsKTtcblxuICAgICAgICB0aGlzLnJlbmRlclNjYXJzKHNjcm9sbCk7XG5cbiAgICAgICAgc2Nyb2xsLmNyZWF0ZURpdih7IHRleHQ6IFwiVE9EQVlTIE9CSkVDVElWRVNcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICB0aGlzLnJlbmRlckRhaWx5TWlzc2lvbnMoc2Nyb2xsKTtcblxuICAgICAgICBjb25zdCBjdHJscyA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jb250cm9sc1wiIH0pO1xuICAgICAgICBjdHJscy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiREVQTE9ZXCIsIGNsczogXCJzaXN5LWJ0biBtb2QtY3RhXCIgfSkub25jbGljayA9ICgpID0+IG5ldyBRdWVzdE1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpO1xuICAgICAgICBjdHJscy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiU0hPUFwiLCBjbHM6IFwic2lzeS1idG5cIiB9KS5vbmNsaWNrID0gKCkgPT4gbmV3IFNob3BNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4pLm9wZW4oKTtcbiAgICAgICAgY3RybHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkZPQ1VTXCIsIGNsczogXCJzaXN5LWJ0blwiIH0pLm9uY2xpY2sgPSAoKSA9PiB0aGlzLnBsdWdpbi5hdWRpby50b2dnbGVCcm93bk5vaXNlKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBzZWxCdG4gPSBjdHJscy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IFxuICAgICAgICAgICAgdGV4dDogdGhpcy5zZWxlY3RNb2RlID8gYENBTkNFTCAoJHt0aGlzLnNlbGVjdGVkUXVlc3RzLnNpemV9KWAgOiBcIlNFTEVDVFwiLCBcbiAgICAgICAgICAgIGNsczogXCJzaXN5LWJ0blwiIFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0TW9kZSkgc2VsQnRuLmFkZENsYXNzKFwic2lzeS1maWx0ZXItYWN0aXZlXCIpO1xuICAgICAgICBzZWxCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0TW9kZSA9ICF0aGlzLnNlbGVjdE1vZGU7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkUXVlc3RzLmNsZWFyKCk7XG4gICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJGSUxURVIgQ09OVFJPTFNcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICB0aGlzLnJlbmRlckZpbHRlckJhcihzY3JvbGwpO1xuXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0QWN0aXZlQ2hhaW4oKSkge1xuICAgICAgICAgICAgc2Nyb2xsLmNyZWF0ZURpdih7IHRleHQ6IFwiQUNUSVZFIENIQUlOXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyQ2hhaW5TZWN0aW9uKHNjcm9sbCk7XG4gICAgICAgIH1cblxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJSRVNFQVJDSCBMSUJSQVJZXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgdGhpcy5yZW5kZXJSZXNlYXJjaFNlY3Rpb24oc2Nyb2xsKTtcblxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJBTkFMWVRJQ1NcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICBjb25zdCBhbmFseXRpY3NDb250YWluZXIgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYW5hbHl0aWNzXCIgfSk7XG4gICAgICAgIHRoaXMuc2V0dXBBbmFseXRpY3NTdHJ1Y3R1cmUoYW5hbHl0aWNzQ29udGFpbmVyKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFtGSVhdIFJlbmRlciBDaGFydHMgTk9XLCBpbnRvIHRoZSBidWZmZXIsIHVzaW5nIHRoZSBjYXB0dXJlZCB3aWR0aFxuICAgICAgICAvLyBUaGlzIGVuc3VyZXMgdGhleSBhcmUgZnVsbHkgZHJhd24gYmVmb3JlIHRoZSB1c2VyIHNlZXMgdGhlbS5cbiAgICAgICAgdGhpcy5yZW5kZXJBbmFseXRpY3NDaGFydHMoYW5hbHl0aWNzQ29udGFpbmVyLCBjdXJyZW50V2lkdGgpO1xuXG4gICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIkFDVElWRSBUSFJFQVRTXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgY29uc3QgcXVlc3RDb250YWluZXIgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktcXVlc3QtY29udGFpbmVyXCIgfSk7XG4gICAgICAgIHRoaXMucmVuZGVyUXVlc3RCYXRjaChxdWVzdENvbnRhaW5lciwgaXRlbXNUb1Jlc3RvcmUpO1xuXG4gICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIk5FVVJBTCBIVUJcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICB0aGlzLnJlbmRlclNraWxscyhzY3JvbGwpO1xuXG4gICAgICAgIGNvbnN0IGZvb3RlciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1xdWljay1jYXB0dXJlXCIgfSk7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gZm9vdGVyLmNyZWF0ZUVsKFwiaW5wdXRcIiwgeyBjbHM6IFwic2lzeS1xdWljay1pbnB1dFwiLCBwbGFjZWhvbGRlcjogXCJNaXNzaW9uIC8xLi4uNVwiIH0pO1xuICAgICAgICBpZiAoaXNRdWlja0lucHV0KSBpbnB1dC52YWx1ZSA9IHF1aWNrSW5wdXRWYWx1ZTtcbiAgICAgICAgXG4gICAgICAgIGlucHV0Lm9ua2V5ZG93biA9IGFzeW5jIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXkgPT09ICdFbnRlcicgJiYgaW5wdXQudmFsdWUudHJpbSgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLnBhcnNlUXVpY2tJbnB1dChpbnB1dC52YWx1ZS50cmltKCkpO1xuICAgICAgICAgICAgICAgIGlucHV0LnZhbHVlID0gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnJlbmRlckJ1bGtCYXIoY29udGFpbmVyKTtcblxuICAgICAgICAvLyA0LiBUSEUgU1dBUFxuICAgICAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgICAgICB0aGlzLmNvbnRlbnRFbC5hcHBlbmRDaGlsZChidWZmZXIpO1xuXG4gICAgICAgIC8vIDUuIFJFU1RPUkVcbiAgICAgICAgaWYgKGlzUXVpY2tJbnB1dCkge1xuICAgICAgICAgICAgY29uc3QgbmV3SW5wdXQgPSB0aGlzLmNvbnRlbnRFbC5xdWVyeVNlbGVjdG9yKFwiLnNpc3ktcXVpY2staW5wdXRcIikgYXMgSFRNTElucHV0RWxlbWVudDtcbiAgICAgICAgICAgIGlmIChuZXdJbnB1dCkge1xuICAgICAgICAgICAgICAgIG5ld0lucHV0LmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgbGVuID0gbmV3SW5wdXQudmFsdWUubGVuZ3RoOyBcbiAgICAgICAgICAgICAgICBuZXdJbnB1dC5zZXRTZWxlY3Rpb25SYW5nZShsZW4sIGxlbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGFzdFNjcm9sbCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IG5ld1Njcm9sbCA9IHRoaXMuY29udGVudEVsLnF1ZXJ5U2VsZWN0b3IoXCIuc2lzeS1zY3JvbGwtYXJlYVwiKTtcbiAgICAgICAgICAgIGlmKG5ld1Njcm9sbCkgbmV3U2Nyb2xsLnNjcm9sbFRvcCA9IGxhc3RTY3JvbGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcmVwYXJlUXVlc3RzKCkge1xuICAgICAgICBjb25zdCBmb2xkZXIgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJBY3RpdmVfUnVuL1F1ZXN0c1wiKTtcbiAgICAgICAgdGhpcy5jdXJyZW50UXVlc3RMaXN0ID0gW107XG5cbiAgICAgICAgaWYgKGZvbGRlciBpbnN0YW5jZW9mIFRGb2xkZXIpIHtcbiAgICAgICAgICAgIGxldCBmaWxlcyA9IGZvbGRlci5jaGlsZHJlbi5maWx0ZXIoZiA9PiBmIGluc3RhbmNlb2YgVEZpbGUpIGFzIFRGaWxlW107XG4gICAgICAgICAgICBmaWxlcyA9IHRoaXMucGx1Z2luLmVuZ2luZS5maWx0ZXJzRW5naW5lLmZpbHRlclF1ZXN0cyhmaWxlcykgYXMgVEZpbGVbXTsgXG4gICAgICAgICAgICBmaWxlcy5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZm1BID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoYSk/LmZyb250bWF0dGVyO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZtQiA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGIpPy5mcm9udG1hdHRlcjtcbiAgICAgICAgICAgICAgICBjb25zdCBvcmRlckEgPSBmbUE/Lm1hbnVhbF9vcmRlciAhPT0gdW5kZWZpbmVkID8gZm1BLm1hbnVhbF9vcmRlciA6IDk5OTk5OTk5OTk5OTk7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3JkZXJCID0gZm1CPy5tYW51YWxfb3JkZXIgIT09IHVuZGVmaW5lZCA/IGZtQi5tYW51YWxfb3JkZXIgOiA5OTk5OTk5OTk5OTk5O1xuICAgICAgICAgICAgICAgIGlmIChvcmRlckEgIT09IG9yZGVyQikgcmV0dXJuIG9yZGVyQSAtIG9yZGVyQjtcbiAgICAgICAgICAgICAgICBpZiAoZm1BPy5pc19ib3NzICE9PSBmbUI/LmlzX2Jvc3MpIHJldHVybiAoZm1CPy5pc19ib3NzID8gMSA6IDApIC0gKGZtQT8uaXNfYm9zcyA/IDEgOiAwKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRlQSA9IGZtQT8uZGVhZGxpbmUgPyBtb21lbnQoZm1BLmRlYWRsaW5lKS52YWx1ZU9mKCkgOiA5OTk5OTk5OTk5OTk5O1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGVCID0gZm1CPy5kZWFkbGluZSA/IG1vbWVudChmbUIuZGVhZGxpbmUpLnZhbHVlT2YoKSA6IDk5OTk5OTk5OTk5OTk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGVBIC0gZGF0ZUI7IFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRRdWVzdExpc3QgPSBmaWxlcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlbmRlclF1ZXN0QmF0Y2goY29udGFpbmVyOiBIVE1MRWxlbWVudCwgYmF0Y2hTaXplOiBudW1iZXIgPSB0aGlzLkJBVENIX1NJWkUpIHtcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFF1ZXN0TGlzdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGlkbGUgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgdGV4dDogXCJTeXN0ZW0gSWRsZS5cIiwgY2xzOiBcInNpc3ktZW1wdHktc3RhdGVcIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IGN0YUJ0biA9IGlkbGUuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIltERVBMT1kgUVVFU1RdXCIsIGNsczogXCJzaXN5LWJ0biBtb2QtY3RhXCIgfSk7XG4gICAgICAgICAgICBjdGFCdG4uc3R5bGUubWFyZ2luVG9wID0gXCIxMHB4XCI7XG4gICAgICAgICAgICBjdGFCdG4ub25jbGljayA9ICgpID0+IG5ldyBRdWVzdE1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbmV4dEJhdGNoID0gdGhpcy5jdXJyZW50UXVlc3RMaXN0LnNsaWNlKHRoaXMucmVuZGVyZWRDb3VudCwgdGhpcy5yZW5kZXJlZENvdW50ICsgYmF0Y2hTaXplKTtcbiAgICAgICAgZm9yIChjb25zdCBmaWxlIG9mIG5leHRCYXRjaCkgUXVlc3RDYXJkUmVuZGVyZXIucmVuZGVyKGNvbnRhaW5lciwgZmlsZSwgdGhpcyk7XG4gICAgICAgIHRoaXMucmVuZGVyZWRDb3VudCArPSBuZXh0QmF0Y2gubGVuZ3RoO1xuXG4gICAgICAgIGlmICh0aGlzLnJlbmRlcmVkQ291bnQgPCB0aGlzLmN1cnJlbnRRdWVzdExpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBzZW50aW5lbCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1zZW50aW5lbFwiIH0pO1xuICAgICAgICAgICAgdGhpcy5vYnNlcnZlciA9IG5ldyBJbnRlcnNlY3Rpb25PYnNlcnZlcigoZW50cmllcykgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlbnRyaWVzWzBdLmlzSW50ZXJzZWN0aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub2JzZXJ2ZXI/LmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgc2VudGluZWwucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyUXVlc3RCYXRjaChjb250YWluZXIsIHRoaXMuQkFUQ0hfU0laRSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgeyByb290OiBjb250YWluZXIucGFyZW50RWxlbWVudCwgdGhyZXNob2xkOiAwLjEgfSk7XG4gICAgICAgICAgICB0aGlzLm9ic2VydmVyLm9ic2VydmUoc2VudGluZWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0dXBBbmFseXRpY3NTdHJ1Y3R1cmUocGFyZW50OiBIVE1MRWxlbWVudCkge1xuICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRHYW1lU3RhdHMoKTtcbiAgICAgICAgY29uc3QgZyA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1odWRcIiB9KTtcbiAgICAgICAgdGhpcy5zdGF0KGcsIFwiU3RyZWFrXCIsIFN0cmluZyhzdGF0cy5jdXJyZW50U3RyZWFrKSk7XG4gICAgICAgIHRoaXMuc3RhdChnLCBcIlRvZGF5XCIsIFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWVzdHNDb21wbGV0ZWRUb2RheSkpO1xuICAgICAgICBcbiAgICAgICAgcGFyZW50LmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiBcIkFjdGl2aXR5ICg3IERheXMpXCIgfSk7XG4gICAgICAgIHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jaGFydC1jb250YWluZXItbGluZVwiIH0pOyBcbiAgICAgICAgcGFyZW50LmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiBcIkhlYXRtYXBcIiB9KTtcbiAgICAgICAgcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNoYXJ0LWNvbnRhaW5lci1oZWF0XCIgfSk7IFxuICAgIH1cblxuICAgIC8vIFtGSVhdIEFjY2VwdCB3aWR0aE92ZXJyaWRlIHRvIGVuYWJsZSBvZmYtc2NyZWVuIHJlbmRlcmluZ1xuICAgIHJlbmRlckFuYWx5dGljc0NoYXJ0cyhwYXJlbnQ6IEhUTUxFbGVtZW50LCB3aWR0aE92ZXJyaWRlPzogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGxpbmVDb250YWluZXIgPSBwYXJlbnQucXVlcnlTZWxlY3RvcihcIi5zaXN5LWNoYXJ0LWNvbnRhaW5lci1saW5lXCIpIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICBjb25zdCBoZWF0Q29udGFpbmVyID0gcGFyZW50LnF1ZXJ5U2VsZWN0b3IoXCIuc2lzeS1jaGFydC1jb250YWluZXItaGVhdFwiKSBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgXG4gICAgICAgIGlmIChsaW5lQ29udGFpbmVyKSB7XG4gICAgICAgICAgICBsaW5lQ29udGFpbmVyLmVtcHR5KCk7XG4gICAgICAgICAgICBDaGFydFJlbmRlcmVyLnJlbmRlckxpbmVDaGFydChsaW5lQ29udGFpbmVyLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kYXlNZXRyaWNzLCB3aWR0aE92ZXJyaWRlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGVhdENvbnRhaW5lcikge1xuICAgICAgICAgICAgaGVhdENvbnRhaW5lci5lbXB0eSgpO1xuICAgICAgICAgICAgQ2hhcnRSZW5kZXJlci5yZW5kZXJIZWF0bWFwKGhlYXRDb250YWluZXIsIHRoaXMucGx1Z2luLnNldHRpbmdzLmRheU1ldHJpY3MpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVuZGVyQWxlcnRzKHNjcm9sbDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmFjdGl2ZUJ1ZmZzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGJ1ZmZCYXIgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYWxlcnQgc2lzeS1hbGVydC1idWZmXCIgfSk7XG4gICAgICAgICAgICBidWZmQmFyLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkFDVElWRSBFRkZFQ1RTXCIsIGF0dHI6IHsgc3R5bGU6IFwiY29sb3I6IHZhcigtLXNpc3ktcHVycGxlKTtcIiB9IH0pO1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuYWN0aXZlQnVmZnMuZm9yRWFjaChiID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByb3cgPSBidWZmQmFyLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWFsZXJ0LXJvd1wiIH0pO1xuICAgICAgICAgICAgICAgIHJvdy5jcmVhdGVTcGFuKHsgdGV4dDogYCR7Yi5pY29ufSAke2IubmFtZX1gIH0pO1xuICAgICAgICAgICAgICAgIHJvdy5jcmVhdGVTcGFuKHsgdGV4dDogYCR7bW9tZW50KGIuZXhwaXJlc0F0KS5kaWZmKG1vbWVudCgpLCAnbWludXRlcycpfW0gbGVmdGAsIGNsczogXCJzaXN5LWFsZXJ0LXRpbWVyXCIgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZCA8IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGQgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYWxlcnQgc2lzeS1hbGVydC1kZWJ0XCIgfSk7XG4gICAgICAgICAgICBkLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIuKaoO+4jyBERUJUIENSSVNJU1wiIH0pO1xuICAgICAgICAgICAgZC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgQmFsYW5jZTogJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkfWdgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVuZGVyT3JhY2xlKHNjcm9sbDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3Qgb3JhY2xlID0gc2Nyb2xsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LW9yYWNsZVwiIH0pO1xuICAgICAgICBvcmFjbGUuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IFwiT1JBQ0xFIFBSRURJQ1RJT05cIiB9KTtcbiAgICAgICAgY29uc3Qgc3Vydml2YWwgPSBNYXRoLmZsb29yKHRoaXMucGx1Z2luLnNldHRpbmdzLmhwIC8gTWF0aC5tYXgoMSwgKHRoaXMucGx1Z2luLnNldHRpbmdzLnJpdmFsRG1nICogKHRoaXMucGx1Z2luLnNldHRpbmdzLmdvbGQgPCAwID8gMiA6IDEpKSkpO1xuICAgICAgICBjb25zdCBzdXJ2RWwgPSBvcmFjbGUuY3JlYXRlRGl2KHsgdGV4dDogYFN1cnZpdmFsOiAke3N1cnZpdmFsfSBkYXlzYCwgY2xzOiBcInNpc3ktcHJlZGljdGlvblwiIH0pO1xuICAgICAgICBpZiAoc3Vydml2YWwgPCAyKSBzdXJ2RWwuYWRkQ2xhc3MoXCJzaXN5LXByZWRpY3Rpb24tYmFkXCIpO1xuICAgIH1cblxuICAgIHJlbmRlclNjYXJzKHNjcm9sbDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3Qgc2NhcnMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zY2FycyB8fCBbXTtcbiAgICAgICAgaWYgKHNjYXJzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBjb25zdCBkaXYgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktc2NhcnNcIiB9KTtcbiAgICAgICAgZGl2LmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiBcIvCfp6wgU0NBUlNcIiB9KTtcbiAgICAgICAgY29uc3QgcmVjZW50ID0gc2NhcnMuc2xpY2UoLTMpLnJldmVyc2UoKTtcbiAgICAgICAgcmVjZW50LmZvckVhY2goKHM6IHsgbGFiZWw6IHN0cmluZzsgdmFsdWU6IHN0cmluZyB8IG51bWJlciB9KSA9PiB7XG4gICAgICAgICAgICBkaXYuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYCR7cy5sYWJlbH06ICR7cy52YWx1ZX1gLCBhdHRyOiB7IHN0eWxlOiBcImZvbnQtc2l6ZTogMC45ZW07IG9wYWNpdHk6IDAuODU7XCIgfSB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IGJ0biA9IGRpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiVmlldyBhbGxcIiwgY2xzOiBcInNpc3ktYnRuXCIgfSk7XG4gICAgICAgIGJ0bi5zdHlsZS5tYXJnaW5Ub3AgPSBcIjZweFwiO1xuICAgICAgICBidG4ub25jbGljayA9ICgpID0+IG5ldyBTY2Fyc01vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpO1xuICAgIH1cblxuICAgIHJlbmRlclNraWxscyhzY3JvbGw6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5mb3JFYWNoKChzOiBTa2lsbCwgaWR4OiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1za2lsbC1yb3dcIiB9KTtcbiAgICAgICAgICAgIHJvdy5vbmNsaWNrID0gKCkgPT4gbmV3IFNraWxsRGV0YWlsTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luLCBpZHgpLm9wZW4oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgbWV0YSA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1za2lsbC1tZXRhXCIgfSk7XG4gICAgICAgICAgICBtZXRhLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgJHtzLm5hbWV9IChMdmwgJHtzLmxldmVsfSlgIH0pO1xuICAgICAgICAgICAgaWYgKHMucnVzdCA+IDApIG1ldGEuY3JlYXRlU3Bhbih7IHRleHQ6IGBSVVNUICR7cy5ydXN0fWAsIGNsczogXCJzaXN5LXRleHQtcnVzdFwiIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBiYXIgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYmFyLWJnXCIgfSk7XG4gICAgICAgICAgICBjb25zdCBwY3QgPSBzLnhwUmVxID4gMCA/IChzLnhwIC8gcy54cFJlcSkgKiAxMDAgOiAwO1xuICAgICAgICAgICAgYmFyLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJhci1maWxsIHNpc3ktZmlsbC1ibHVlXCIsIGF0dHI6IHsgc3R5bGU6IGB3aWR0aDogJHtwY3R9JTtgIH0gfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCIrIEFkZCBOb2RlXCIsIGNsczogXCJzaXN5LWJ0blwiLCBhdHRyOiB7IHN0eWxlOiBcIndpZHRoOjEwMCU7IG1hcmdpbi10b3A6MTBweDtcIiB9IH0pLm9uY2xpY2sgPSAoKSA9PiBuZXcgU2tpbGxNYW5hZ2VyTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luKS5vcGVuKCk7XG4gICAgfVxuXG4gICAgcmVuZGVyQnVsa0JhcihwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGlmICghdGhpcy5zZWxlY3RNb2RlIHx8IHRoaXMuc2VsZWN0ZWRRdWVzdHMuc2l6ZSA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBjb25zdCBiYXIgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYnVsay1iYXJcIiB9KTtcbiAgICAgICAgYmFyLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgJHt0aGlzLnNlbGVjdGVkUXVlc3RzLnNpemV9IFNlbGVjdGVkYCwgYXR0cjogeyBzdHlsZTogXCJhbGlnbi1zZWxmOmNlbnRlcjsgZm9udC13ZWlnaHQ6Ym9sZDsgY29sb3I6IHdoaXRlO1wiIH0gfSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBidG5DID0gYmFyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDT01QTEVURSBBTExcIiwgY2xzOiBcInNpc3ktYnRuIG1vZC1kb25lXCIgfSk7XG4gICAgICAgIGJ0bkMub25jbGljayA9IGFzeW5jICgpID0+IHsgZm9yIChjb25zdCBmIG9mIHRoaXMuc2VsZWN0ZWRRdWVzdHMpIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5jb21wbGV0ZVF1ZXN0KGYpOyB0aGlzLnNlbGVjdGVkUXVlc3RzLmNsZWFyKCk7IHRoaXMuc2VsZWN0TW9kZSA9IGZhbHNlOyB0aGlzLmRlYm91bmNlZFJlZnJlc2goKTsgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGJ0bkQgPSBiYXIuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkRFTEVURSBBTExcIiwgY2xzOiBcInNpc3ktYnRuIG1vZC1mYWlsXCIgfSk7XG4gICAgICAgIGJ0bkQub25jbGljayA9IGFzeW5jICgpID0+IHsgZm9yIChjb25zdCBmIG9mIHRoaXMuc2VsZWN0ZWRRdWVzdHMpIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5kZWxldGVRdWVzdChmKTsgdGhpcy5zZWxlY3RlZFF1ZXN0cy5jbGVhcigpOyB0aGlzLnNlbGVjdE1vZGUgPSBmYWxzZTsgdGhpcy5kZWJvdW5jZWRSZWZyZXNoKCk7IH07XG4gICAgfVxuXG4gICAgcmVuZGVyRGFpbHlNaXNzaW9ucyhwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IG1pc3Npb25zID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGFpbHlNaXNzaW9ucyB8fCBbXTtcbiAgICAgICAgaWYgKG1pc3Npb25zLmxlbmd0aCA9PT0gMCkgeyBwYXJlbnQuY3JlYXRlRGl2KHsgdGV4dDogXCJObyBtaXNzaW9ucy5cIiwgY2xzOiBcInNpc3ktZW1wdHktc3RhdGVcIiB9KTsgcmV0dXJuOyB9XG4gICAgICAgIGNvbnN0IG1pc3Npb25zRGl2ID0gcGFyZW50LmNyZWF0ZURpdigpO1xuICAgICAgICBtaXNzaW9ucy5mb3JFYWNoKChtOiBEYWlseU1pc3Npb24pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNhcmQgPSBtaXNzaW9uc0Rpdi5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1taXNzaW9uLWNhcmRcIiB9KTtcbiAgICAgICAgICAgIGlmIChtLmNvbXBsZXRlZCkgY2FyZC5hZGRDbGFzcyhcInNpc3ktbWlzc2lvbi1jb21wbGV0ZWRcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGggPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNhcmQtdG9wXCIgfSk7XG4gICAgICAgICAgICBoLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IG0ubmFtZSwgY2xzOiBcInNpc3ktY2FyZC10aXRsZVwiIH0pO1xuICAgICAgICAgICAgaC5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBgJHttLnByb2dyZXNzfS8ke20udGFyZ2V0fWAsIGF0dHI6IHsgc3R5bGU6IFwiZm9udC13ZWlnaHQ6IGJvbGQ7XCIgfSB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FyZC5jcmVhdGVEaXYoeyB0ZXh0OiBtLmRlc2MsIGF0dHI6IHsgc3R5bGU6IFwiZm9udC1zaXplOiAwLjhlbTsgb3BhY2l0eTogMC43OyBtYXJnaW4tYm90dG9tOiA1cHg7XCIgfSB9KTtcblxuICAgICAgICAgICAgY29uc3QgYmFyID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1iYXItYmdcIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IHBjdCA9IG0udGFyZ2V0ID4gMCA/IChtLnByb2dyZXNzIC8gbS50YXJnZXQpICogMTAwIDogMDtcbiAgICAgICAgICAgIGJhci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1iYXItZmlsbCBzaXN5LWZpbGwtZ3JlZW5cIiwgYXR0cjogeyBzdHlsZTogYHdpZHRoOiAke3BjdH0lO2AgfSB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmVuZGVyQ2hhaW5TZWN0aW9uKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikgcmV0dXJuO1xuICAgICAgICBjb25zdCBkaXYgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktY2hhaW4tY29udGFpbmVyXCIgfSk7XG4gICAgICAgIGRpdi5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogY2hhaW4ubmFtZSwgYXR0cjogeyBzdHlsZTogXCJjb2xvcjogdmFyKC0tc2lzeS1ncmVlbik7XCIgfSB9KTtcbiAgICAgICAgY29uc3QgcCA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRDaGFpblByb2dyZXNzKCk7XG4gICAgICAgIGNvbnN0IGIgPSBkaXYuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYmFyLWJnXCIgfSk7XG4gICAgICAgIGIuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYmFyLWZpbGwgc2lzeS1maWxsLWdyZWVuXCIsIGF0dHI6IHsgc3R5bGU6IGB3aWR0aDoke3AucGVyY2VudH0lO2AgfSB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGxpc3QgPSBkaXYuY3JlYXRlRGl2KHsgYXR0cjogeyBzdHlsZTogXCJtYXJnaW46IDEwcHggMDsgZm9udC1zaXplOiAwLjllbTtcIiB9IH0pO1xuICAgICAgICBjaGFpbi5xdWVzdHMuZm9yRWFjaCgocSwgaSkgPT4gbGlzdC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgWyR7aSA8IHAuY29tcGxldGVkID8gXCJPS1wiIDogXCIuLlwifV0gJHtxfWAsIGF0dHI6IHsgc3R5bGU6IGk9PT1wLmNvbXBsZXRlZCA/IFwiZm9udC13ZWlnaHQ6Ym9sZFwiIDogXCJvcGFjaXR5OjAuNVwiIH0gfSkpO1xuICAgICAgICBkaXYuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkJSRUFLIENIQUlOXCIsIGNsczogXCJzaXN5LWJ0biBtb2QtZmFpbFwiLCBhdHRyOiB7IHN0eWxlOiBcIndpZHRoOjEwMCU7IG1hcmdpbi10b3A6MTBweDtcIiB9IH0pLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7IGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5icmVha0NoYWluKCk7IHRoaXMuZGVib3VuY2VkUmVmcmVzaCgpOyB9O1xuICAgIH1cblxuICAgIHJlbmRlclJlc2VhcmNoU2VjdGlvbihwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IHJlc2VhcmNoID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMgfHwgW107XG4gICAgICAgIGNvbnN0IGFjdGl2ZSA9IHJlc2VhcmNoLmZpbHRlcihxID0+ICFxLmNvbXBsZXRlZCk7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldFJlc2VhcmNoUmF0aW8oKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHN0YXRzRGl2ID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXJlc2VhcmNoLXN0YXRzIHNpc3ktY2FyZFwiIH0pO1xuICAgICAgICBzdGF0c0Rpdi5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgUmVzZWFyY2ggUmF0aW86ICR7c3RhdHMuY29tYmF0fToke3N0YXRzLnJlc2VhcmNofWAgfSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoYWN0aXZlLmxlbmd0aCA9PT0gMCkgcGFyZW50LmNyZWF0ZURpdih7IHRleHQ6IFwiTm8gYWN0aXZlIHJlc2VhcmNoLlwiLCBjbHM6IFwic2lzeS1lbXB0eS1zdGF0ZVwiIH0pO1xuICAgICAgICBlbHNlIGFjdGl2ZS5mb3JFYWNoKChxOiBhbnkpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNhcmQgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktcmVzZWFyY2gtY2FyZFwiIH0pO1xuICAgICAgICAgICAgY29uc3QgaCA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktY2FyZC10b3BcIiB9KTtcbiAgICAgICAgICAgIGguY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogcS50aXRsZSwgY2xzOiBcInNpc3ktY2FyZC10aXRsZVwiIH0pO1xuICAgICAgICAgICAgY2FyZC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgV29yZHM6ICR7cS53b3JkQ291bnR9LyR7cS53b3JkTGltaXR9YCB9KTtcbiAgICAgICAgICAgIGNvbnN0IGJhciA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYmFyLWJnXCIgfSk7XG4gICAgICAgICAgICBjb25zdCB3cGN0ID0gcS53b3JkTGltaXQgPiAwID8gTWF0aC5taW4oMTAwLCAocS53b3JkQ291bnQgLyBxLndvcmRMaW1pdCkgKiAxMDApIDogMDtcbiAgICAgICAgICAgIGJhci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1iYXItZmlsbCBzaXN5LWZpbGwtcHVycGxlXCIsIGF0dHI6IHsgc3R5bGU6IGB3aWR0aDoke3dwY3R9JTtgIH0gfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGFjdHMgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWFjdGlvbnNcIiB9KTtcbiAgICAgICAgICAgIGFjdHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkNPTVBMRVRFXCIsIGNsczogXCJzaXN5LWJ0biBtb2QtZG9uZSBzaXN5LWFjdGlvbi1idG5cIiB9KS5vbmNsaWNrID0gKCkgPT4geyB0aGlzLnBsdWdpbi5lbmdpbmUuY29tcGxldGVSZXNlYXJjaFF1ZXN0KHEuaWQsIHEud29yZENvdW50KTsgdGhpcy5kZWJvdW5jZWRSZWZyZXNoKCk7IH07XG4gICAgICAgICAgICBhY3RzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJERUxFVEVcIiwgY2xzOiBcInNpc3ktYnRuIG1vZC1mYWlsIHNpc3ktYWN0aW9uLWJ0blwiIH0pLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7IGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5kZWxldGVSZXNlYXJjaFF1ZXN0KHEuaWQpOyB0aGlzLmRlYm91bmNlZFJlZnJlc2goKTsgfTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmVuZGVyRmlsdGVyQmFyKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgZ2V0RnJlc2hTdGF0ZSA9ICgpID0+IHRoaXMucGx1Z2luLnNldHRpbmdzLmZpbHRlclN0YXRlO1xuICAgICAgICBjb25zdCBkID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWZpbHRlci1iYXJcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGFkZFJvdyA9IChsOiBzdHJpbmcsIG9wdHM6IHN0cmluZ1tdLCBjdXJyOiBzdHJpbmcsIGNiOiBhbnkpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSBkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWZpbHRlci1yb3dcIiB9KTtcbiAgICAgICAgICAgIHIuY3JlYXRlU3Bhbih7IHRleHQ6IGwsIGNsczogXCJzaXN5LWZpbHRlci1sYWJlbFwiIH0pO1xuICAgICAgICAgICAgb3B0cy5mb3JFYWNoKG8gPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ0biA9IHIuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBvLnRvVXBwZXJDYXNlKCksIGNsczogXCJzaXN5LWZpbHRlci1idG5cIiB9KTtcbiAgICAgICAgICAgICAgICBpZiAoY3VyciA9PT0gbykgYnRuLmFkZENsYXNzKFwic2lzeS1maWx0ZXItYWN0aXZlXCIpO1xuICAgICAgICAgICAgICAgIGJ0bi5vbmNsaWNrID0gKCkgPT4gY2Iobyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBmID0gZ2V0RnJlc2hTdGF0ZSgpO1xuICAgICAgICBhZGRSb3coXCJFbmVyZ3k6XCIsIFtcImFueVwiLCBcImhpZ2hcIiwgXCJtZWRpdW1cIl0sIGYuYWN0aXZlRW5lcmd5LCAodjphbnkpPT4geyBcbiAgICAgICAgICAgIGNvbnN0IHMgPSBnZXRGcmVzaFN0YXRlKCk7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWwgPSAocy5hY3RpdmVFbmVyZ3kgPT09IHYgJiYgdiAhPT0gXCJhbnlcIikgPyBcImFueVwiIDogdjtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5zZXRGaWx0ZXJTdGF0ZShuZXdWYWwsIHMuYWN0aXZlQ29udGV4dCwgcy5hY3RpdmVUYWdzKTsgXG4gICAgICAgICAgICB0aGlzLmRlYm91bmNlZFJlZnJlc2goKTsgXG4gICAgICAgIH0pO1xuICAgICAgICBhZGRSb3coXCJDb250ZXh0OlwiLCBbXCJhbnlcIiwgXCJob21lXCIsIFwib2ZmaWNlXCJdLCBmLmFjdGl2ZUNvbnRleHQsICh2OmFueSk9PiB7IFxuICAgICAgICAgICAgY29uc3QgcyA9IGdldEZyZXNoU3RhdGUoKTtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbCA9IChzLmFjdGl2ZUNvbnRleHQgPT09IHYgJiYgdiAhPT0gXCJhbnlcIikgPyBcImFueVwiIDogdjtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5zZXRGaWx0ZXJTdGF0ZShzLmFjdGl2ZUVuZXJneSwgbmV3VmFsLCBzLmFjdGl2ZVRhZ3MpOyBcbiAgICAgICAgICAgIHRoaXMuZGVib3VuY2VkUmVmcmVzaCgpOyBcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBkLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDTEVBUlwiLCBjbHM6IFwic2lzeS1idG4gbW9kLWZhaWxcIiwgYXR0cjogeyBzdHlsZTogXCJ3aWR0aDoxMDAlOyBtYXJnaW4tdG9wOjVweDtcIiB9IH0pLm9uY2xpY2sgPSAoKSA9PiB7IHRoaXMucGx1Z2luLmVuZ2luZS5jbGVhckZpbHRlcnMoKTsgdGhpcy5kZWJvdW5jZWRSZWZyZXNoKCk7IH07XG4gICAgfVxuXG4gICAgc3RhdChwOiBIVE1MRWxlbWVudCwgbGFiZWw6IHN0cmluZywgdmFsOiBzdHJpbmcsIGNsczogc3RyaW5nID0gXCJcIikge1xuICAgICAgICBjb25zdCBiID0gcC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1zdGF0LWJveFwiIH0pOyBcbiAgICAgICAgaWYgKGNscykgYi5hZGRDbGFzcyhjbHMpO1xuICAgICAgICBiLmNyZWF0ZURpdih7IHRleHQ6IGxhYmVsLCBjbHM6IFwic2lzeS1zdGF0LWxhYmVsXCIgfSk7XG4gICAgICAgIGIuY3JlYXRlRGl2KHsgdGV4dDogdmFsLCBjbHM6IFwic2lzeS1zdGF0LXZhbFwiIH0pO1xuICAgIH1cblxuICAgIHNob3dVbmRvVG9hc3QocXVlc3ROYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgdG9hc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB0b2FzdC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcInBvc2l0aW9uOmZpeGVkOyBib3R0b206MjBweDsgcmlnaHQ6MjBweDsgYmFja2dyb3VuZDojMWUxZTFlOyBwYWRkaW5nOjEycHggMjBweDsgYm9yZGVyLXJhZGl1czo2cHg7IHotaW5kZXg6OTk5OTsgYm9yZGVyOjFweCBzb2xpZCB2YXIoLS1zaXN5LWJsdWUpOyBib3gtc2hhZG93OiAwIDVweCAyMHB4IHJnYmEoMCwwLDAsMC41KTsgZGlzcGxheTpmbGV4OyBhbGlnbi1pdGVtczpjZW50ZXI7IGdhcDoxNXB4O1wiKTsgXG4gICAgICAgIHRvYXN0LmlubmVySFRNTCA9IGA8c3Bhbj5EZWxldGVkOiA8c3Ryb25nPiR7cXVlc3ROYW1lfTwvc3Ryb25nPjwvc3Bhbj5gO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcbiAgICAgICAgYnRuLmlubmVyVGV4dCA9IFwiVU5ET1wiO1xuICAgICAgICBidG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJjdXJzb3I6cG9pbnRlcjsgY29sb3I6dmFyKC0tc2lzeS1ibHVlKTsgYmFja2dyb3VuZDpub25lOyBib3JkZXI6bm9uZTsgZm9udC13ZWlnaHQ6Ym9sZDsgbGV0dGVyLXNwYWNpbmc6MXB4O1wiKTtcbiAgICAgICAgYnRuLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7IGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS51bmRvTGFzdERlbGV0aW9uKCk7IHRvYXN0LnJlbW92ZSgpOyB9O1xuICAgICAgICBcbiAgICAgICAgdG9hc3QuYXBwZW5kQ2hpbGQoYnRuKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0b2FzdCk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdG9hc3QucmVtb3ZlKCksIDgwMDApO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IFNpc3lwaHVzU2V0dGluZ3MgfSBmcm9tICcuLi90eXBlcyc7XG5cbmV4cG9ydCBjb25zdCBDT05GSUdfVkVSU0lPTiA9IDE7XG5leHBvcnQgY29uc3QgU1RBVEVfVkVSU0lPTiA9IDE7XG5cbmV4cG9ydCBjb25zdCBLTk9XTl9NT0RVTEVfSURTID0gW1xuICAgICdzdXJ2aXZhbCcsXG4gICAgJ3Byb2dyZXNzaW9uJyxcbiAgICAnZWNvbm9teScsXG4gICAgJ2NvbWJhdCcsXG4gICAgJ3Byb2R1Y3Rpdml0eScsXG4gICAgJ2FuYWx5dGljcycsXG4gICAgJ3JlY292ZXJ5JyxcbiAgICAnZGFpbHlfbGlmZWN5Y2xlJ1xuXSBhcyBjb25zdDtcblxuZnVuY3Rpb24gbm9ybWFsaXplRW5hYmxlZE1vZHVsZXMocmF3SWRzOiB1bmtub3duKTogc3RyaW5nW10ge1xuICAgIGlmICghQXJyYXkuaXNBcnJheShyYXdJZHMpKSByZXR1cm4gWy4uLktOT1dOX01PRFVMRV9JRFNdO1xuXG4gICAgY29uc3QgYWxsb3dlZCA9IG5ldyBTZXQ8c3RyaW5nPihLTk9XTl9NT0RVTEVfSURTKTtcbiAgICBjb25zdCBub3JtYWxpemVkID0gcmF3SWRzXG4gICAgICAgIC5maWx0ZXIoKGlkKTogaWQgaXMgc3RyaW5nID0+IHR5cGVvZiBpZCA9PT0gJ3N0cmluZycpXG4gICAgICAgIC5maWx0ZXIoKGlkKSA9PiBhbGxvd2VkLmhhcyhpZCkpO1xuXG4gICAgcmV0dXJuIG5vcm1hbGl6ZWQubGVuZ3RoID4gMCA/IFsuLi5uZXcgU2V0KG5vcm1hbGl6ZWQpXSA6IFsuLi5LTk9XTl9NT0RVTEVfSURTXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBHbG9iYWxDb25maWcge1xuICAgIGVuYWJsZWRNb2R1bGVzOiBzdHJpbmdbXTtcbiAgICBkaWZmaWN1bHR5U2NhbGU6IG51bWJlcjtcbiAgICBtdXRlQXVkaW86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGVyc2lzdGVkU3RhdGUge1xuICAgIGNvbmZpZ1ZlcnNpb246IG51bWJlcjtcbiAgICBzdGF0ZVZlcnNpb246IG51bWJlcjtcbiAgICBjb25maWc6IEdsb2JhbENvbmZpZztcbiAgICBzdGF0ZTogU2lzeXBodXNTZXR0aW5ncztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNaWdyYXRpb25SZXN1bHQge1xuICAgIGNvbmZpZzogR2xvYmFsQ29uZmlnO1xuICAgIHN0YXRlOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIG1pZ3JhdGVkOiBib29sZWFuO1xufVxuXG5jb25zdCBERUZBVUxUX0NPTkZJRzogR2xvYmFsQ29uZmlnID0ge1xuICAgIGVuYWJsZWRNb2R1bGVzOiBbLi4uS05PV05fTU9EVUxFX0lEU10sXG4gICAgZGlmZmljdWx0eVNjYWxlOiAxLFxuICAgIG11dGVBdWRpbzogZmFsc2Vcbn07XG5cbmZ1bmN0aW9uIGlzUGVyc2lzdGVkU3RhdGUodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBQYXJ0aWFsPFBlcnNpc3RlZFN0YXRlPiB7XG4gICAgaWYgKCF2YWx1ZSB8fCB0eXBlb2YgdmFsdWUgIT09ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCBjYW5kaWRhdGUgPSB2YWx1ZSBhcyBQYXJ0aWFsPFBlcnNpc3RlZFN0YXRlPjtcbiAgICByZXR1cm4gISFjYW5kaWRhdGUuY29uZmlnICYmICEhY2FuZGlkYXRlLnN0YXRlO1xufVxuXG5leHBvcnQgY2xhc3MgU3RhdGVNYW5hZ2VyIHtcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGRlZmF1bHRTdGF0ZTogU2lzeXBodXNTZXR0aW5ncykge31cblxuICAgIG1pZ3JhdGUocmF3RGF0YTogdW5rbm93bik6IE1pZ3JhdGlvblJlc3VsdCB7XG4gICAgICAgIGlmIChpc1BlcnNpc3RlZFN0YXRlKHJhd0RhdGEpKSB7XG4gICAgICAgICAgICBjb25zdCBuZXh0Q29uZmlnOiBHbG9iYWxDb25maWcgPSB7XG4gICAgICAgICAgICAgICAgLi4uREVGQVVMVF9DT05GSUcsXG4gICAgICAgICAgICAgICAgLi4ucmF3RGF0YS5jb25maWcsXG4gICAgICAgICAgICAgICAgZW5hYmxlZE1vZHVsZXM6IG5vcm1hbGl6ZUVuYWJsZWRNb2R1bGVzKHJhd0RhdGEuY29uZmlnPy5lbmFibGVkTW9kdWxlcylcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgY29uZmlnOiBuZXh0Q29uZmlnLFxuICAgICAgICAgICAgICAgIHN0YXRlOiBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmRlZmF1bHRTdGF0ZSwgcmF3RGF0YS5zdGF0ZSksXG4gICAgICAgICAgICAgICAgbWlncmF0ZWQ6IHJhd0RhdGEuY29uZmlnVmVyc2lvbiAhPT0gQ09ORklHX1ZFUlNJT04gfHwgcmF3RGF0YS5zdGF0ZVZlcnNpb24gIT09IFNUQVRFX1ZFUlNJT05cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBsZWdhY3lTdGF0ZSA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZGVmYXVsdFN0YXRlLCAocmF3RGF0YSA/PyB7fSkgYXMgUGFydGlhbDxTaXN5cGh1c1NldHRpbmdzPik7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNvbmZpZzoge1xuICAgICAgICAgICAgICAgIC4uLkRFRkFVTFRfQ09ORklHLFxuICAgICAgICAgICAgICAgIG11dGVBdWRpbzogbGVnYWN5U3RhdGUubXV0ZWQgPz8gREVGQVVMVF9DT05GSUcubXV0ZUF1ZGlvLFxuICAgICAgICAgICAgICAgIGVuYWJsZWRNb2R1bGVzOiBub3JtYWxpemVFbmFibGVkTW9kdWxlcyh1bmRlZmluZWQpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3RhdGU6IGxlZ2FjeVN0YXRlLFxuICAgICAgICAgICAgbWlncmF0ZWQ6IHRydWVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB0b1BlcnNpc3RlZFN0YXRlKGNvbmZpZzogR2xvYmFsQ29uZmlnLCBzdGF0ZTogU2lzeXBodXNTZXR0aW5ncyk6IFBlcnNpc3RlZFN0YXRlIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNvbmZpZ1ZlcnNpb246IENPTkZJR19WRVJTSU9OLFxuICAgICAgICAgICAgc3RhdGVWZXJzaW9uOiBTVEFURV9WRVJTSU9OLFxuICAgICAgICAgICAgY29uZmlnOiB7XG4gICAgICAgICAgICAgICAgLi4uREVGQVVMVF9DT05GSUcsXG4gICAgICAgICAgICAgICAgLi4uY29uZmlnLFxuICAgICAgICAgICAgICAgIGVuYWJsZWRNb2R1bGVzOiBub3JtYWxpemVFbmFibGVkTW9kdWxlcyhjb25maWcuZW5hYmxlZE1vZHVsZXMpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3RhdGVcbiAgICAgICAgfTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBBcHAsIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcsIE5vdGljZSB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCBTaXN5cGh1c1BsdWdpbiBmcm9tICcuL21haW4nO1xuaW1wb3J0IHsgVGVtcGxhdGVNYW5hZ2VyTW9kYWwgfSBmcm9tICcuL3VpL21vZGFscyc7XG5pbXBvcnQgeyBTdGF0ZU1hbmFnZXIgfSBmcm9tICcuL2NvcmUvU3RhdGVNYW5hZ2VyJztcblxuZXhwb3J0IGNsYXNzIFNpc3lwaHVzU2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG5cbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikge1xuICAgICAgICBzdXBlcihhcHAsIHBsdWdpbik7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgIH1cblxuICAgIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG5cbiAgICAgICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gyJywgeyB0ZXh0OiAnU2lzeXBodXMgRW5naW5lIFNldHRpbmdzJyB9KTtcblxuICAgICAgICAvLyAtLS0gTU9EVUxFUyBTRUNUSU9OIC0tLVxuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdNb2R1bGVzJyB9KTtcblxuICAgICAgICBjb25zdCBtb2R1bGVzID0gdGhpcy5wbHVnaW4ua2VybmVsPy5tb2R1bGVzLmdldEFsbCgpID8/IFtdO1xuICAgICAgICBtb2R1bGVzLmZvckVhY2goKG1vZHVsZSkgPT4ge1xuICAgICAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAgICAgLnNldE5hbWUobW9kdWxlLm5hbWUpXG4gICAgICAgICAgICAgICAgLnNldERlc2MobW9kdWxlLmRlc2NyaXB0aW9uKVxuICAgICAgICAgICAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbmFibGVkID0gdGhpcy5wbHVnaW4ua2VybmVsLm1vZHVsZXMuaXNFbmFibGVkKG1vZHVsZS5pZCk7XG4gICAgICAgICAgICAgICAgICAgIHRvZ2dsZVxuICAgICAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKGVuYWJsZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5rZXJuZWwubW9kdWxlcy5lbmFibGUobW9kdWxlLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmtlcm5lbC5tb2R1bGVzLmRpc2FibGUobW9kdWxlLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVuYWJsZWRJZHMgPSB0aGlzLnBsdWdpbi5rZXJuZWwubW9kdWxlc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmdldEFsbCgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKChlbnRyeSkgPT4gdGhpcy5wbHVnaW4ua2VybmVsLm1vZHVsZXMuaXNFbmFibGVkKGVudHJ5LmlkKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoKGVudHJ5KSA9PiBlbnRyeS5pZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uY29uZmlnLmVuYWJsZWRNb2R1bGVzID0gZW5hYmxlZElkcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS50cmlnZ2VyKCd1cGRhdGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGBGYWlsZWQgdG8gdG9nZ2xlIG1vZHVsZSAnJHttb2R1bGUubmFtZX0nLmApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIC0tLSBHQU1FUExBWSBTRUNUSU9OIC0tLVxuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdHYW1lcGxheScgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnU3RhcnRpbmcgSFAnKVxuICAgICAgICAgICAgLnNldERlc2MoJ0Jhc2UgSFAgZm9yIGEgbmV3IHJ1biAoRGVmYXVsdDogMTAwKScpXG4gICAgICAgICAgICAuYWRkVGV4dCgodGV4dCkgPT5cbiAgICAgICAgICAgICAgICB0ZXh0LnNldFZhbHVlKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5tYXhIcCkpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBudW0gPSBwYXJzZUludCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLm1heEhwID0gTnVtYmVyLmlzTmFOKG51bSkgPyAxMDAgOiBudW07XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAgICAgLnNldE5hbWUoJ0RpZmZpY3VsdHkgU2NhbGluZyAoUml2YWwgRGFtYWdlKScpXG4gICAgICAgICAgICAuc2V0RGVzYygnU3RhcnRpbmcgZGFtYWdlIHB1bmlzaG1lbnQgZm9yIGZhaWxlZCBxdWVzdHMgKERlZmF1bHQ6IDEwKScpXG4gICAgICAgICAgICAuYWRkVGV4dCgodGV4dCkgPT5cbiAgICAgICAgICAgICAgICB0ZXh0LnNldFZhbHVlKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5yaXZhbERtZykpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBudW0gPSBwYXJzZUludCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnJpdmFsRG1nID0gTnVtYmVyLmlzTmFOKG51bSkgPyAxMCA6IG51bTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnUXVlc3QgVGVtcGxhdGVzJylcbiAgICAgICAgICAgIC5zZXREZXNjKCdDcmVhdGUgb3IgZGVsZXRlIHF1aWNrLWRlcGxveSB0ZW1wbGF0ZXMuJylcbiAgICAgICAgICAgIC5hZGRCdXR0b24oKGJ0bikgPT5cbiAgICAgICAgICAgICAgICBidG4uc2V0QnV0dG9uVGV4dCgnTWFuYWdlIFRlbXBsYXRlcycpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBuZXcgVGVtcGxhdGVNYW5hZ2VyTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luKS5vcGVuKCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgLy8gLS0tIEFVRElPIFNFQ1RJT04gLS0tXG4gICAgICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogJ0F1ZGlvJyB9KTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAgIC5zZXROYW1lKCdNdXRlIEFsbCBTb3VuZHMnKVxuICAgICAgICAgICAgLnNldERlc2MoJ0Rpc2FibGUgc291bmQgZWZmZWN0cyBhbmQgYW1iaWVudCBub2lzZScpXG4gICAgICAgICAgICAuYWRkVG9nZ2xlKCh0b2dnbGUpID0+XG4gICAgICAgICAgICAgICAgdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLm11dGVkKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubXV0ZWQgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uYXVkaW8uc2V0TXV0ZWQodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAvLyAtLS0gREFUQSBNQU5BR0VNRU5UIFNFQ1RJT04gLS0tXG4gICAgICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogJ0RhdGEgTWFuYWdlbWVudCcgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnRXhwb3J0IEZ1bGwgRGF0YScpXG4gICAgICAgICAgICAuc2V0RGVzYygnRG93bmxvYWQgY29uZmlnIGFuZCBmdWxsIGdhbWUgc3RhdGUgYXMgYSBKU09OIGZpbGUuJylcbiAgICAgICAgICAgIC5hZGRCdXR0b24oKGJ0bikgPT5cbiAgICAgICAgICAgICAgICBidG4uc2V0QnV0dG9uVGV4dCgnRXhwb3J0IEJhY2t1cCcpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0ZU1hbmFnZXIgPSBuZXcgU3RhdGVNYW5hZ2VyKHRoaXMucGx1Z2luLnNldHRpbmdzKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGF5bG9hZCA9IHN0YXRlTWFuYWdlci50b1BlcnNpc3RlZFN0YXRlKHRoaXMucGx1Z2luLmNvbmZpZywgdGhpcy5wbHVnaW4uc2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBqc29uID0gSlNPTi5zdHJpbmdpZnkocGF5bG9hZCwgbnVsbCwgMik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbanNvbl0sIHsgdHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFuY2hvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgICAgICAgICAgICAgYW5jaG9yLmhyZWYgPSB1cmw7XG4gICAgICAgICAgICAgICAgICAgIGFuY2hvci5kb3dubG9hZCA9IGBzaXN5cGh1c19iYWNrdXBfJHtEYXRlLm5vdygpfS5qc29uYDtcbiAgICAgICAgICAgICAgICAgICAgYW5jaG9yLmNsaWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcbiAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZSgnQmFja3VwIGRvd25sb2FkZWQuJyk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnSW1wb3J0IERhdGEnKVxuICAgICAgICAgICAgLnNldERlc2MoJ1Jlc3RvcmUgZnJvbSBiYWNrdXAgZmlsZS4g4pqg77iPIFdBUk5JTkc6IE92ZXJ3cml0ZXMgY3VycmVudCBwcm9ncmVzcyEnKVxuICAgICAgICAgICAgLmFkZEJ1dHRvbigoYnRuKSA9PlxuICAgICAgICAgICAgICAgIGJ0blxuICAgICAgICAgICAgICAgICAgICAuc2V0QnV0dG9uVGV4dCgnSW1wb3J0IEJhY2t1cCcpXG4gICAgICAgICAgICAgICAgICAgIC5zZXRXYXJuaW5nKClcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQudHlwZSA9ICdmaWxlJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LmFjY2VwdCA9ICcuanNvbic7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0Lm9uY2hhbmdlID0gYXN5bmMgKGV2ZW50OiBFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGV2ZW50LnRhcmdldCBhcyBIVE1MSW5wdXRFbGVtZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSB0YXJnZXQuZmlsZXM/LlswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZpbGUpIHJldHVybjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBhd2FpdCBmaWxlLnRleHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UodGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRlTWFuYWdlciA9IG5ldyBTdGF0ZU1hbmFnZXIodGhpcy5wbHVnaW4uc2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtaWdyYXRlZCA9IHN0YXRlTWFuYWdlci5taWdyYXRlKGRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmNvbmZpZyA9IG1pZ3JhdGVkLmNvbmZpZztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MgPSBtaWdyYXRlZC5zdGF0ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBLZWVwIHJ1bnRpbWUgcmVmZXJlbmNlcyBpbiBzeW5jXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmtlcm5lbC5jb25maWcgPSB0aGlzLnBsdWdpbi5jb25maWc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmtlcm5lbC5zdGF0ZSA9IHRoaXMucGx1Z2luLnNldHRpbmdzO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVuYWJsZWQgPSBuZXcgU2V0KHRoaXMucGx1Z2luLmNvbmZpZy5lbmFibGVkTW9kdWxlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmtlcm5lbC5tb2R1bGVzLmdldEFsbCgpLmZvckVhY2goKG1vZHVsZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVuYWJsZWQuaGFzKG1vZHVsZS5pZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5rZXJuZWwubW9kdWxlcy5lbmFibGUobW9kdWxlLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4ua2VybmVsLm1vZHVsZXMuZGlzYWJsZShtb2R1bGUuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLnRyaWdnZXIoJ3VwZGF0ZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpc3BsYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZSgnRGF0YSBpbXBvcnRlZCBzdWNjZXNzZnVsbHkhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZSgnRXJyb3IgaW1wb3J0aW5nIGRhdGEuJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LmNsaWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApO1xuICAgIH1cbn1cbiIsImV4cG9ydCB0eXBlIEV2ZW50TWFwID0gb2JqZWN0O1xuXG50eXBlIEV2ZW50SGFuZGxlcjxUPiA9IChwYXlsb2FkOiBUKSA9PiB2b2lkO1xuXG5leHBvcnQgY2xhc3MgRXZlbnRCdXM8VEV2ZW50cyBleHRlbmRzIEV2ZW50TWFwPiB7XG4gICAgcHJpdmF0ZSBsaXN0ZW5lcnMgPSBuZXcgTWFwPGtleW9mIFRFdmVudHMsIFNldDxFdmVudEhhbmRsZXI8YW55Pj4+KCk7XG5cbiAgICBvbjxUS2V5IGV4dGVuZHMga2V5b2YgVEV2ZW50cz4oZXZlbnQ6IFRLZXksIGhhbmRsZXI6IEV2ZW50SGFuZGxlcjxURXZlbnRzW1RLZXldPik6ICgpID0+IHZvaWQge1xuICAgICAgICBjb25zdCBoYW5kbGVycyA9IHRoaXMubGlzdGVuZXJzLmdldChldmVudCkgPz8gbmV3IFNldCgpO1xuICAgICAgICBoYW5kbGVycy5hZGQoaGFuZGxlcik7XG4gICAgICAgIHRoaXMubGlzdGVuZXJzLnNldChldmVudCwgaGFuZGxlcnMpO1xuXG4gICAgICAgIHJldHVybiAoKSA9PiB0aGlzLm9mZihldmVudCwgaGFuZGxlcik7XG4gICAgfVxuXG4gICAgb2ZmPFRLZXkgZXh0ZW5kcyBrZXlvZiBURXZlbnRzPihldmVudDogVEtleSwgaGFuZGxlcjogRXZlbnRIYW5kbGVyPFRFdmVudHNbVEtleV0+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGhhbmRsZXJzID0gdGhpcy5saXN0ZW5lcnMuZ2V0KGV2ZW50KTtcbiAgICAgICAgaWYgKCFoYW5kbGVycykgcmV0dXJuO1xuXG4gICAgICAgIGhhbmRsZXJzLmRlbGV0ZShoYW5kbGVyKTtcbiAgICAgICAgaWYgKGhhbmRsZXJzLnNpemUgPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuZXJzLmRlbGV0ZShldmVudCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBlbWl0PFRLZXkgZXh0ZW5kcyBrZXlvZiBURXZlbnRzPihldmVudDogVEtleSwgcGF5bG9hZDogVEV2ZW50c1tUS2V5XSk6IHZvaWQge1xuICAgICAgICBjb25zdCBoYW5kbGVycyA9IHRoaXMubGlzdGVuZXJzLmdldChldmVudCk7XG4gICAgICAgIGlmICghaGFuZGxlcnMgfHwgaGFuZGxlcnMuc2l6ZSA9PT0gMCkgcmV0dXJuO1xuXG4gICAgICAgIGhhbmRsZXJzLmZvckVhY2goKHJlZ2lzdGVyZWRIYW5kbGVyKSA9PiByZWdpc3RlcmVkSGFuZGxlcihwYXlsb2FkKSk7XG4gICAgfVxuXG4gICAgY2xlYXIoKTogdm9pZCB7XG4gICAgICAgIHRoaXMubGlzdGVuZXJzLmNsZWFyKCk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgR2FtZU1vZHVsZSB9IGZyb20gJy4vR2FtZU1vZHVsZSc7XG5cbmV4cG9ydCBjbGFzcyBNb2R1bGVNYW5hZ2VyIHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IG1vZHVsZXMgPSBuZXcgTWFwPHN0cmluZywgR2FtZU1vZHVsZT4oKTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IGVuYWJsZWRNb2R1bGVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgICByZWdpc3Rlcihtb2R1bGU6IEdhbWVNb2R1bGUpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5tb2R1bGVzLnNldChtb2R1bGUuaWQsIG1vZHVsZSk7XG4gICAgfVxuXG4gICAgZ2V0QWxsKCk6IEdhbWVNb2R1bGVbXSB7XG4gICAgICAgIHJldHVybiBbLi4udGhpcy5tb2R1bGVzLnZhbHVlcygpXTtcbiAgICB9XG5cbiAgICBnZXRCeUlkKG1vZHVsZUlkOiBzdHJpbmcpOiBHYW1lTW9kdWxlIHwgbnVsbCB7XG4gICAgICAgIHJldHVybiB0aGlzLm1vZHVsZXMuZ2V0KG1vZHVsZUlkKSA/PyBudWxsO1xuICAgIH1cblxuICAgIGlzRW5hYmxlZChtb2R1bGVJZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmVuYWJsZWRNb2R1bGVzLmhhcyhtb2R1bGVJZCk7XG4gICAgfVxuXG4gICAgZW5hYmxlKG1vZHVsZUlkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbW9kdWxlID0gdGhpcy5tb2R1bGVzLmdldChtb2R1bGVJZCk7XG4gICAgICAgIGlmICghbW9kdWxlIHx8IHRoaXMuZW5hYmxlZE1vZHVsZXMuaGFzKG1vZHVsZUlkKSkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IHNvcnRlZERlcGVuZGVuY2llcyA9IHRoaXMucmVzb2x2ZURlcGVuZGVuY2llcyhtb2R1bGVJZCk7XG4gICAgICAgIHNvcnRlZERlcGVuZGVuY2llcy5mb3JFYWNoKChpZCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuZW5hYmxlZE1vZHVsZXMuaGFzKGlkKSkgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3QgZGVwZW5kZW5jeSA9IHRoaXMubW9kdWxlcy5nZXQoaWQpO1xuICAgICAgICAgICAgaWYgKCFkZXBlbmRlbmN5KSByZXR1cm47XG5cbiAgICAgICAgICAgIGRlcGVuZGVuY3kub25FbmFibGUoKTtcbiAgICAgICAgICAgIHRoaXMuZW5hYmxlZE1vZHVsZXMuYWRkKGlkKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZGlzYWJsZShtb2R1bGVJZDogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGlmICghdGhpcy5lbmFibGVkTW9kdWxlcy5oYXMobW9kdWxlSWQpKSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgZGVwZW5kZW50cyA9IHRoaXMuZmluZERlcGVuZGVudHMobW9kdWxlSWQpO1xuICAgICAgICBkZXBlbmRlbnRzLmZvckVhY2goKGRlcGVuZGVudElkKSA9PiB0aGlzLmRpc2FibGUoZGVwZW5kZW50SWQpKTtcblxuICAgICAgICBjb25zdCBtb2R1bGUgPSB0aGlzLm1vZHVsZXMuZ2V0KG1vZHVsZUlkKTtcbiAgICAgICAgaWYgKCFtb2R1bGUpIHJldHVybjtcblxuICAgICAgICBtb2R1bGUub25EaXNhYmxlKCk7XG4gICAgICAgIHRoaXMuZW5hYmxlZE1vZHVsZXMuZGVsZXRlKG1vZHVsZUlkKTtcbiAgICB9XG5cbiAgICBkaXNhYmxlQWxsKCk6IHZvaWQge1xuICAgICAgICBbLi4udGhpcy5lbmFibGVkTW9kdWxlc10uZm9yRWFjaCgobW9kdWxlSWQpID0+IHRoaXMuZGlzYWJsZShtb2R1bGVJZCkpO1xuICAgIH1cblxuICAgIHByaXZhdGUgcmVzb2x2ZURlcGVuZGVuY2llcyhtb2R1bGVJZDogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgICAgICBjb25zdCBzb3J0ZWQ6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGNvbnN0IHZpc2l0aW5nID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICAgIGNvbnN0IHZpc2l0ZWQgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAgICAgICBjb25zdCB2aXNpdCA9IChpZDogc3RyaW5nKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBpZiAodmlzaXRlZC5oYXMoaWQpKSByZXR1cm47XG4gICAgICAgICAgICBpZiAodmlzaXRpbmcuaGFzKGlkKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQ2lyY3VsYXIgbW9kdWxlIGRlcGVuZGVuY3kgZGV0ZWN0ZWQgZm9yIG1vZHVsZTogJHtpZH1gKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmlzaXRpbmcuYWRkKGlkKTtcbiAgICAgICAgICAgIGNvbnN0IG1vZHVsZSA9IHRoaXMubW9kdWxlcy5nZXQoaWQpO1xuICAgICAgICAgICAgaWYgKCFtb2R1bGUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgZGVwZW5kZW5jeSBtb2R1bGU6ICR7aWR9YCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1vZHVsZS5kZXBlbmRlbmNpZXMuZm9yRWFjaCgoZGVwZW5kZW5jeUlkKSA9PiB2aXNpdChkZXBlbmRlbmN5SWQpKTtcbiAgICAgICAgICAgIHZpc2l0aW5nLmRlbGV0ZShpZCk7XG4gICAgICAgICAgICB2aXNpdGVkLmFkZChpZCk7XG4gICAgICAgICAgICBzb3J0ZWQucHVzaChpZCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmlzaXQobW9kdWxlSWQpO1xuICAgICAgICByZXR1cm4gc29ydGVkO1xuICAgIH1cblxuICAgIHByaXZhdGUgZmluZERlcGVuZGVudHMobW9kdWxlSWQ6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICAgICAgY29uc3QgZGVwZW5kZW50czogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgdGhpcy5tb2R1bGVzLmZvckVhY2goKG1vZHVsZSkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmVuYWJsZWRNb2R1bGVzLmhhcyhtb2R1bGUuaWQpKSByZXR1cm47XG4gICAgICAgICAgICBpZiAobW9kdWxlLmRlcGVuZGVuY2llcy5pbmNsdWRlcyhtb2R1bGVJZCkpIHtcbiAgICAgICAgICAgICAgICBkZXBlbmRlbnRzLnB1c2gobW9kdWxlLmlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBkZXBlbmRlbnRzO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IFNpc3lwaHVzU2V0dGluZ3MgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBFdmVudEJ1cyB9IGZyb20gJy4vRXZlbnRCdXMnO1xuaW1wb3J0IHsgR2FtZU1vZHVsZSB9IGZyb20gJy4vR2FtZU1vZHVsZSc7XG5pbXBvcnQgeyBHbG9iYWxDb25maWcsIFN0YXRlTWFuYWdlciB9IGZyb20gJy4vU3RhdGVNYW5hZ2VyJztcbmltcG9ydCB7IE1vZHVsZU1hbmFnZXIgfSBmcm9tICcuL01vZHVsZU1hbmFnZXInO1xuaW1wb3J0IHsgS2VybmVsU2VydmljZU1hcCB9IGZyb20gJy4vc2VydmljZXMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEtlcm5lbEV2ZW50cyB7XG4gICAgJ2Nsb2NrOnRpY2snOiB7IG5vdzogc3RyaW5nIH07XG4gICAgJ3Nlc3Npb246c3RhcnQnOiB7IG5vdzogc3RyaW5nIH07XG4gICAgJ3F1ZXN0OmNvbXBsZXRlZCc6IHtcbiAgICAgICAgcXVlc3RJZDogc3RyaW5nO1xuICAgICAgICBkaWZmaWN1bHR5OiBudW1iZXI7XG4gICAgICAgIHNraWxsTmFtZTogc3RyaW5nO1xuICAgICAgICBzZWNvbmRhcnlTa2lsbDogc3RyaW5nO1xuICAgICAgICBoaWdoU3Rha2VzOiBib29sZWFuO1xuICAgICAgICBpc0Jvc3M6IGJvb2xlYW47XG4gICAgICAgIGJvc3NMZXZlbDogbnVtYmVyIHwgbnVsbDtcbiAgICAgICAgeHBSZXdhcmQ6IG51bWJlcjtcbiAgICAgICAgZ29sZFJld2FyZDogbnVtYmVyO1xuICAgIH07XG4gICAgJ3Jld2FyZDpncmFudGVkJzoge1xuICAgICAgICB4cDogbnVtYmVyO1xuICAgICAgICBnb2xkOiBudW1iZXI7XG4gICAgICAgIHJlYXNvbjogc3RyaW5nO1xuICAgIH07XG4gICAgJ3F1ZXN0OmZhaWxlZCc6IHtcbiAgICAgICAgcXVlc3RJZDogc3RyaW5nO1xuICAgICAgICByZWFzb24/OiBzdHJpbmc7XG4gICAgICAgIGRhbWFnZTogbnVtYmVyO1xuICAgICAgICBtYW51YWxBYm9ydDogYm9vbGVhbjtcbiAgICAgICAgYm9zc0hwUGVuYWx0eTogbnVtYmVyO1xuICAgIH07XG4gICAgJ2ZpbGU6bW9kaWZpZWQnOiB7IHBhdGg6IHN0cmluZyB9O1xufVxuXG5pbnRlcmZhY2UgS2VybmVsQ29udGV4dCB7XG4gICAgY29uZmlnOiBHbG9iYWxDb25maWc7XG4gICAgc3RhdGU6IFNpc3lwaHVzU2V0dGluZ3M7XG4gICAgc2F2ZTogKGNvbmZpZzogR2xvYmFsQ29uZmlnLCBzdGF0ZTogU2lzeXBodXNTZXR0aW5ncykgPT4gUHJvbWlzZTx2b2lkPjtcbiAgICBzZXJ2aWNlcz86IFBhcnRpYWw8S2VybmVsU2VydmljZU1hcD47XG59XG5cbmV4cG9ydCBjbGFzcyBTaXN5cGh1c0tlcm5lbCB7XG4gICAgcmVhZG9ubHkgZXZlbnRzID0gbmV3IEV2ZW50QnVzPEtlcm5lbEV2ZW50cz4oKTtcbiAgICByZWFkb25seSBtb2R1bGVzID0gbmV3IE1vZHVsZU1hbmFnZXIoKTtcbiAgICByZWFkb25seSBzdGF0ZU1hbmFnZXI6IFN0YXRlTWFuYWdlcjtcblxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2VydmljZXM6IFBhcnRpYWw8S2VybmVsU2VydmljZU1hcD47XG5cbiAgICBjb25maWc6IEdsb2JhbENvbmZpZztcbiAgICBzdGF0ZTogU2lzeXBodXNTZXR0aW5ncztcblxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgY29udGV4dDogS2VybmVsQ29udGV4dCkge1xuICAgICAgICB0aGlzLmNvbmZpZyA9IGNvbnRleHQuY29uZmlnO1xuICAgICAgICB0aGlzLnN0YXRlID0gY29udGV4dC5zdGF0ZTtcbiAgICAgICAgdGhpcy5zdGF0ZU1hbmFnZXIgPSBuZXcgU3RhdGVNYW5hZ2VyKHRoaXMuc3RhdGUpO1xuICAgICAgICB0aGlzLnNlcnZpY2VzID0geyAuLi4oY29udGV4dC5zZXJ2aWNlcyA/PyB7fSkgfTtcbiAgICB9XG5cblxuICAgIHNldFNlcnZpY2U8SyBleHRlbmRzIGtleW9mIEtlcm5lbFNlcnZpY2VNYXA+KG5hbWU6IEssIHNlcnZpY2U6IEtlcm5lbFNlcnZpY2VNYXBbS10pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5zZXJ2aWNlc1tuYW1lXSA9IHNlcnZpY2U7XG4gICAgfVxuXG4gICAgZ2V0U2VydmljZTxLIGV4dGVuZHMga2V5b2YgS2VybmVsU2VydmljZU1hcD4obmFtZTogSyk6IEtlcm5lbFNlcnZpY2VNYXBbS10gfCBudWxsIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLnNlcnZpY2VzW25hbWVdIGFzIEtlcm5lbFNlcnZpY2VNYXBbS10gfCB1bmRlZmluZWQpID8/IG51bGw7XG4gICAgfVxuXG4gICAgcmVnaXN0ZXJNb2R1bGUobW9kdWxlOiBHYW1lTW9kdWxlKTogdm9pZCB7XG4gICAgICAgIG1vZHVsZS5vbkxvYWQodGhpcyk7XG4gICAgICAgIHRoaXMubW9kdWxlcy5yZWdpc3Rlcihtb2R1bGUpO1xuICAgIH1cblxuICAgIGVuYWJsZUNvbmZpZ3VyZWRNb2R1bGVzKCk6IHZvaWQge1xuICAgICAgICB0aGlzLmNvbmZpZy5lbmFibGVkTW9kdWxlcy5mb3JFYWNoKChtb2R1bGVJZCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vZHVsZXMuZW5hYmxlKG1vZHVsZUlkKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgW1Npc3lwaHVzS2VybmVsXSBDb3VsZCBub3QgZW5hYmxlIG1vZHVsZSAnJHttb2R1bGVJZH0nLmAsIGVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgYXN5bmMgcGVyc2lzdCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5jb250ZXh0LnNhdmUodGhpcy5jb25maWcsIHRoaXMuc3RhdGUpO1xuICAgIH1cblxuICAgIHNodXRkb3duKCk6IHZvaWQge1xuICAgICAgICB0aGlzLm1vZHVsZXMuZGlzYWJsZUFsbCgpO1xuICAgICAgICB0aGlzLm1vZHVsZXMuZ2V0QWxsKCkuZm9yRWFjaCgobW9kdWxlKSA9PiBtb2R1bGUub25VbmxvYWQoKSk7XG4gICAgICAgIHRoaXMuZXZlbnRzLmNsZWFyKCk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgU2lzeXBodXNLZXJuZWwgfSBmcm9tICcuL0tlcm5lbCc7XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBHYW1lTW9kdWxlIHtcbiAgICBhYnN0cmFjdCByZWFkb25seSBpZDogc3RyaW5nO1xuICAgIGFic3RyYWN0IHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgICBhYnN0cmFjdCByZWFkb25seSBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICAgIHJlYWRvbmx5IGRlcGVuZGVuY2llczogc3RyaW5nW10gPSBbXTtcblxuICAgIHByb3RlY3RlZCBrZXJuZWw6IFNpc3lwaHVzS2VybmVsIHwgbnVsbCA9IG51bGw7XG5cbiAgICBvbkxvYWQoa2VybmVsOiBTaXN5cGh1c0tlcm5lbCk6IHZvaWQge1xuICAgICAgICB0aGlzLmtlcm5lbCA9IGtlcm5lbDtcbiAgICB9XG5cbiAgICBhYnN0cmFjdCBvbkVuYWJsZSgpOiB2b2lkO1xuICAgIGFic3RyYWN0IG9uRGlzYWJsZSgpOiB2b2lkO1xuXG4gICAgb25VbmxvYWQoKTogdm9pZCB7XG4gICAgICAgIHRoaXMua2VybmVsID0gbnVsbDtcbiAgICB9XG5cbiAgICByZW5kZXJTZXR0aW5ncyhfY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgICAgICAvLyBPcHRpb25hbCBvdmVycmlkZSBmb3IgbW9kdWxlLXNwZWNpZmljIHNldHRpbmdzXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgTm90aWNlIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgR2FtZU1vZHVsZSB9IGZyb20gJy4uLy4uL2NvcmUvR2FtZU1vZHVsZSc7XG5cbmV4cG9ydCBjbGFzcyBQcm9ncmVzc2lvbk1vZHVsZSBleHRlbmRzIEdhbWVNb2R1bGUge1xuICAgIHJlYWRvbmx5IGlkID0gJ3Byb2dyZXNzaW9uJztcbiAgICByZWFkb25seSBuYW1lID0gJ1Byb2dyZXNzaW9uJztcbiAgICByZWFkb25seSBkZXNjcmlwdGlvbiA9ICdYUCwgbGV2ZWxpbmcsIGFuZCBza2lsbCBncm93dGggZnJvbSBjb21wbGV0ZWQgcXVlc3RzLic7XG5cbiAgICBwcml2YXRlIHVuc3Vic2NyaWJlUXVlc3RDb21wbGV0ZWQ6ICgoKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgdW5zdWJzY3JpYmVSZXdhcmRHcmFudGVkOiAoKCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcblxuICAgIG9uRW5hYmxlKCk6IHZvaWQge1xuICAgICAgICBpZiAoIXRoaXMua2VybmVsKSByZXR1cm47XG5cbiAgICAgICAgdGhpcy51bnN1YnNjcmliZVF1ZXN0Q29tcGxldGVkID0gdGhpcy5rZXJuZWwuZXZlbnRzLm9uKCdxdWVzdDpjb21wbGV0ZWQnLCAocGF5bG9hZCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB0aGlzLmtlcm5lbCEuc3RhdGU7XG4gICAgICAgICAgICBjb25zdCBlbmdpbmUgPSB0aGlzLmtlcm5lbCEuZ2V0U2VydmljZSgnZW5naW5lJyk7XG5cbiAgICAgICAgICAgIGxldCB4cCA9IHBheWxvYWQueHBSZXdhcmQ7XG4gICAgICAgICAgICBjb25zdCBza2lsbCA9IHNldHRpbmdzLnNraWxscy5maW5kKChlbnRyeSkgPT4gZW50cnkubmFtZSA9PT0gcGF5bG9hZC5za2lsbE5hbWUpO1xuICAgICAgICAgICAgaWYgKHNraWxsKSB7XG4gICAgICAgICAgICAgICAgc2tpbGwucnVzdCA9IDA7XG4gICAgICAgICAgICAgICAgc2tpbGwueHBSZXEgPSBNYXRoLm1heCgxLCBNYXRoLmZsb29yKHNraWxsLnhwUmVxIC8gMS4xKSk7XG4gICAgICAgICAgICAgICAgc2tpbGwubGFzdFVzZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgc2tpbGwueHAgKz0gMTtcbiAgICAgICAgICAgICAgICBpZiAoc2tpbGwueHAgPj0gc2tpbGwueHBSZXEpIHtcbiAgICAgICAgICAgICAgICAgICAgc2tpbGwubGV2ZWwrKztcbiAgICAgICAgICAgICAgICAgICAgc2tpbGwueHAgPSAwO1xuICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGDwn6egICR7c2tpbGwubmFtZX0gTGV2ZWxlZCBVcCFgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwYXlsb2FkLnNlY29uZGFyeVNraWxsICYmIHBheWxvYWQuc2Vjb25kYXJ5U2tpbGwgIT09ICdOb25lJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlY29uZGFyeVNraWxsID0gc2V0dGluZ3Muc2tpbGxzLmZpbmQoKGVudHJ5KSA9PiBlbnRyeS5uYW1lID09PSBwYXlsb2FkLnNlY29uZGFyeVNraWxsKTtcbiAgICAgICAgICAgICAgICBpZiAoc2Vjb25kYXJ5U2tpbGwgJiYgc2tpbGwpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFza2lsbC5jb25uZWN0aW9ucykgc2tpbGwuY29ubmVjdGlvbnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFza2lsbC5jb25uZWN0aW9ucy5pbmNsdWRlcyhwYXlsb2FkLnNlY29uZGFyeVNraWxsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2tpbGwuY29ubmVjdGlvbnMucHVzaChwYXlsb2FkLnNlY29uZGFyeVNraWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoJ/CflJcgTmV1cmFsIExpbmsgRXN0YWJsaXNoZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHhwICs9IE1hdGguZmxvb3Ioc2Vjb25kYXJ5U2tpbGwubGV2ZWwgKiAwLjUpO1xuICAgICAgICAgICAgICAgICAgICBzZWNvbmRhcnlTa2lsbC54cCArPSAwLjU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzZXR0aW5ncy54cCArPSB4cDtcblxuICAgICAgICAgICAgaWYgKHNldHRpbmdzLnhwID49IHNldHRpbmdzLnhwUmVxKSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MubGV2ZWwrKztcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy54cCA9IDA7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MueHBSZXEgPSBNYXRoLmZsb29yKHNldHRpbmdzLnhwUmVxICogMS4xKTtcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5tYXhIcCA9IDEwMCArIChzZXR0aW5ncy5sZXZlbCAqIDUpO1xuICAgICAgICAgICAgICAgIHNldHRpbmdzLmhwID0gc2V0dGluZ3MubWF4SHA7XG5cbiAgICAgICAgICAgICAgICBpZiAoZW5naW5lPy50YXVudCkgZW5naW5lLnRhdW50KCdsZXZlbF91cCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VzID0gZW5naW5lPy5hbmFseXRpY3NFbmdpbmU/LmNoZWNrQm9zc01pbGVzdG9uZXM/LigpID8/IFtdO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VzLmZvckVhY2goKG1lc3NhZ2U6IHN0cmluZykgPT4gbmV3IE5vdGljZShtZXNzYWdlKSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoWzEwLCAyMCwgMzAsIDUwXS5pbmNsdWRlcyhzZXR0aW5ncy5sZXZlbCkgJiYgZW5naW5lPy5zcGF3bkJvc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgdm9pZCBlbmdpbmUuc3Bhd25Cb3NzKHNldHRpbmdzLmxldmVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMudW5zdWJzY3JpYmVSZXdhcmRHcmFudGVkID0gdGhpcy5rZXJuZWwuZXZlbnRzLm9uKCdyZXdhcmQ6Z3JhbnRlZCcsIChwYXlsb2FkKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmtlcm5lbCEuc3RhdGUueHAgKz0gcGF5bG9hZC54cDtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgb25EaXNhYmxlKCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy51bnN1YnNjcmliZVF1ZXN0Q29tcGxldGVkKSB7XG4gICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlUXVlc3RDb21wbGV0ZWQoKTtcbiAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmVRdWVzdENvbXBsZXRlZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMudW5zdWJzY3JpYmVSZXdhcmRHcmFudGVkKSB7XG4gICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlUmV3YXJkR3JhbnRlZCgpO1xuICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZVJld2FyZEdyYW50ZWQgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgR2FtZU1vZHVsZSB9IGZyb20gJy4uLy4uL2NvcmUvR2FtZU1vZHVsZSc7XG5cbmV4cG9ydCBjbGFzcyBFY29ub215TW9kdWxlIGV4dGVuZHMgR2FtZU1vZHVsZSB7XG4gICAgcmVhZG9ubHkgaWQgPSAnZWNvbm9teSc7XG4gICAgcmVhZG9ubHkgbmFtZSA9ICdFY29ub215JztcbiAgICByZWFkb25seSBkZXNjcmlwdGlvbiA9ICdBcHBsaWVzIGdvbGQgcmV3YXJkcyBmcm9tIHF1ZXN0IGNvbXBsZXRpb25zLic7XG5cbiAgICBwcml2YXRlIHVuc3Vic2NyaWJlUXVlc3RDb21wbGV0ZWQ6ICgoKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgdW5zdWJzY3JpYmVSZXdhcmRHcmFudGVkOiAoKCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcblxuICAgIG9uRW5hYmxlKCk6IHZvaWQge1xuICAgICAgICBpZiAoIXRoaXMua2VybmVsKSByZXR1cm47XG5cbiAgICAgICAgdGhpcy51bnN1YnNjcmliZVF1ZXN0Q29tcGxldGVkID0gdGhpcy5rZXJuZWwuZXZlbnRzLm9uKCdxdWVzdDpjb21wbGV0ZWQnLCAocGF5bG9hZCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5rZXJuZWwhLnN0YXRlLmdvbGQgKz0gcGF5bG9hZC5nb2xkUmV3YXJkO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnVuc3Vic2NyaWJlUmV3YXJkR3JhbnRlZCA9IHRoaXMua2VybmVsLmV2ZW50cy5vbigncmV3YXJkOmdyYW50ZWQnLCAocGF5bG9hZCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5rZXJuZWwhLnN0YXRlLmdvbGQgKz0gcGF5bG9hZC5nb2xkO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBvbkRpc2FibGUoKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLnVuc3Vic2NyaWJlUXVlc3RDb21wbGV0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmVRdWVzdENvbXBsZXRlZCgpO1xuICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZVF1ZXN0Q29tcGxldGVkID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy51bnN1YnNjcmliZVJld2FyZEdyYW50ZWQpIHtcbiAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmVSZXdhcmRHcmFudGVkKCk7XG4gICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlUmV3YXJkR3JhbnRlZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgeyBOb3RpY2UgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBEZWF0aE1vZGFsIH0gZnJvbSAnLi4vLi4vdWkvbW9kYWxzJztcbmltcG9ydCB7IEdhbWVNb2R1bGUgfSBmcm9tICcuLi8uLi9jb3JlL0dhbWVNb2R1bGUnO1xuXG5leHBvcnQgY2xhc3MgU3Vydml2YWxNb2R1bGUgZXh0ZW5kcyBHYW1lTW9kdWxlIHtcbiAgICByZWFkb25seSBpZCA9ICdzdXJ2aXZhbCc7XG4gICAgcmVhZG9ubHkgbmFtZSA9ICdTdXJ2aXZhbCc7XG4gICAgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSAnSFAgZGFtYWdlLCBsb2NrZG93biwgYW5kIGRlYXRoIGhhbmRsaW5nIGZvciBmYWlsZWQgcXVlc3RzLic7XG5cbiAgICBwcml2YXRlIHVuc3Vic2NyaWJlUXVlc3RGYWlsZWQ6ICgoKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgdW5zdWJzY3JpYmVRdWVzdENvbXBsZXRlZDogKCgpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG5cbiAgICBvbkVuYWJsZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCF0aGlzLmtlcm5lbCkgcmV0dXJuO1xuXG4gICAgICAgIHRoaXMudW5zdWJzY3JpYmVRdWVzdEZhaWxlZCA9IHRoaXMua2VybmVsLmV2ZW50cy5vbigncXVlc3Q6ZmFpbGVkJywgKHBheWxvYWQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gdGhpcy5rZXJuZWwhLnN0YXRlO1xuICAgICAgICAgICAgY29uc3QgZW5naW5lID0gdGhpcy5rZXJuZWwhLmdldFNlcnZpY2UoJ2VuZ2luZScpO1xuICAgICAgICAgICAgY29uc3QgYXBwID0gdGhpcy5rZXJuZWwhLmdldFNlcnZpY2UoJ2FwcCcpO1xuICAgICAgICAgICAgY29uc3QgcGx1Z2luID0gdGhpcy5rZXJuZWwhLmdldFNlcnZpY2UoJ3BsdWdpbicpO1xuICAgICAgICAgICAgY29uc3QgYXVkaW8gPSB0aGlzLmtlcm5lbCEuZ2V0U2VydmljZSgnYXVkaW8nKTtcblxuICAgICAgICAgICAgc2V0dGluZ3MuaHAgLT0gcGF5bG9hZC5kYW1hZ2U7XG4gICAgICAgICAgICBzZXR0aW5ncy5kYW1hZ2VUYWtlblRvZGF5ICs9IHBheWxvYWQuZGFtYWdlO1xuICAgICAgICAgICAgaWYgKCFwYXlsb2FkLm1hbnVhbEFib3J0KSBzZXR0aW5ncy5yaXZhbERtZyArPSAxO1xuXG4gICAgICAgICAgICBpZiAoYXVkaW8/LnBsYXlTb3VuZCkgYXVkaW8ucGxheVNvdW5kKCdmYWlsJyk7XG4gICAgICAgICAgICBpZiAoZW5naW5lPy5jaGVja0RhaWx5TWlzc2lvbnMpIGVuZ2luZS5jaGVja0RhaWx5TWlzc2lvbnMoeyB0eXBlOiAnZGFtYWdlJyB9KTtcblxuICAgICAgICAgICAgaWYgKHNldHRpbmdzLmRhbWFnZVRha2VuVG9kYXkgPiA1MCkge1xuICAgICAgICAgICAgICAgIGlmIChlbmdpbmU/Lm1lZGl0YXRpb25FbmdpbmU/LnRyaWdnZXJMb2NrZG93bikgZW5naW5lLm1lZGl0YXRpb25FbmdpbmUudHJpZ2dlckxvY2tkb3duKCk7XG4gICAgICAgICAgICAgICAgaWYgKGVuZ2luZT8udHJpZ2dlcikgZW5naW5lLnRyaWdnZXIoJ2xvY2tkb3duJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzZXR0aW5ncy5ocCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgbmV3IERlYXRoTW9kYWwoYXBwLCBwbHVnaW4pLm9wZW4oKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwYXlsb2FkLmJvc3NIcFBlbmFsdHkgPiAwKSB7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShg4pig77iPIEJvc3MgQ3J1c2g6ICske3BheWxvYWQuYm9zc0hwUGVuYWx0eX0gRGFtYWdlYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMudW5zdWJzY3JpYmVRdWVzdENvbXBsZXRlZCA9IHRoaXMua2VybmVsLmV2ZW50cy5vbigncXVlc3Q6Y29tcGxldGVkJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB0aGlzLmtlcm5lbCEuc3RhdGU7XG4gICAgICAgICAgICBjb25zdCBlbmdpbmUgPSB0aGlzLmtlcm5lbCEuZ2V0U2VydmljZSgnZW5naW5lJyk7XG4gICAgICAgICAgICBjb25zdCBhcHAgPSB0aGlzLmtlcm5lbCEuZ2V0U2VydmljZSgnYXBwJyk7XG4gICAgICAgICAgICBjb25zdCBwbHVnaW4gPSB0aGlzLmtlcm5lbCEuZ2V0U2VydmljZSgncGx1Z2luJyk7XG5cbiAgICAgICAgICAgIGlmIChzZXR0aW5ncy5kYWlseU1vZGlmaWVyLm5hbWUgIT09ICdBZHJlbmFsaW5lJykgcmV0dXJuO1xuXG4gICAgICAgICAgICBzZXR0aW5ncy5ocCAtPSA1O1xuICAgICAgICAgICAgc2V0dGluZ3MuZGFtYWdlVGFrZW5Ub2RheSArPSA1O1xuXG4gICAgICAgICAgICBpZiAoc2V0dGluZ3MuZGFtYWdlVGFrZW5Ub2RheSA+IDUwKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVuZ2luZT8ubWVkaXRhdGlvbkVuZ2luZT8udHJpZ2dlckxvY2tkb3duKSBlbmdpbmUubWVkaXRhdGlvbkVuZ2luZS50cmlnZ2VyTG9ja2Rvd24oKTtcbiAgICAgICAgICAgICAgICBpZiAoZW5naW5lPy50cmlnZ2VyKSBlbmdpbmUudHJpZ2dlcignbG9ja2Rvd24nKTtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKCdPdmVyZXhlcnRpb24hIExPQ0tET1dOIElOSVRJQVRFRC4nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHNldHRpbmdzLmhwIDw9IDApIHtcbiAgICAgICAgICAgICAgICBuZXcgRGVhdGhNb2RhbChhcHAsIHBsdWdpbikub3BlbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH1cblxuICAgIG9uRGlzYWJsZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMudW5zdWJzY3JpYmVRdWVzdEZhaWxlZCkge1xuICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZVF1ZXN0RmFpbGVkKCk7XG4gICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlUXVlc3RGYWlsZWQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnVuc3Vic2NyaWJlUXVlc3RDb21wbGV0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmVRdWVzdENvbXBsZXRlZCgpO1xuICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZVF1ZXN0Q29tcGxldGVkID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsImltcG9ydCB7IE5vdGljZSB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IEdhbWVNb2R1bGUgfSBmcm9tICcuLi8uLi9jb3JlL0dhbWVNb2R1bGUnO1xuaW1wb3J0IHsgVmljdG9yeU1vZGFsIH0gZnJvbSAnLi4vLi4vdWkvbW9kYWxzJztcblxuZXhwb3J0IGNsYXNzIENvbWJhdE1vZHVsZSBleHRlbmRzIEdhbWVNb2R1bGUge1xuICAgIHJlYWRvbmx5IGlkID0gJ2NvbWJhdCc7XG4gICAgcmVhZG9ubHkgbmFtZSA9ICdDb21iYXQnO1xuICAgIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gJ0Jvc3MgZGVmZWF0IHByb2Nlc3NpbmcgYW5kIHZpY3RvcnkgY2hlY2tzLic7XG5cbiAgICBwcml2YXRlIHVuc3Vic2NyaWJlUXVlc3RDb21wbGV0ZWQ6ICgoKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuXG4gICAgb25FbmFibGUoKTogdm9pZCB7XG4gICAgICAgIGlmICghdGhpcy5rZXJuZWwpIHJldHVybjtcblxuICAgICAgICB0aGlzLnVuc3Vic2NyaWJlUXVlc3RDb21wbGV0ZWQgPSB0aGlzLmtlcm5lbC5ldmVudHMub24oJ3F1ZXN0OmNvbXBsZXRlZCcsIChwYXlsb2FkKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXBheWxvYWQuaXNCb3NzIHx8IHBheWxvYWQuYm9zc0xldmVsID09PSBudWxsKSByZXR1cm47XG5cbiAgICAgICAgICAgIGNvbnN0IGVuZ2luZSA9IHRoaXMua2VybmVsIS5nZXRTZXJ2aWNlKCdlbmdpbmUnKTtcbiAgICAgICAgICAgIGNvbnN0IGFwcCA9IHRoaXMua2VybmVsIS5nZXRTZXJ2aWNlKCdhcHAnKTtcbiAgICAgICAgICAgIGNvbnN0IHBsdWdpbiA9IHRoaXMua2VybmVsIS5nZXRTZXJ2aWNlKCdwbHVnaW4nKTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGVuZ2luZT8uYW5hbHl0aWNzRW5naW5lPy5kZWZlYXRCb3NzPy4ocGF5bG9hZC5ib3NzTGV2ZWwpO1xuXG4gICAgICAgICAgICBpZiAocmVzdWx0Py5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShyZXN1bHQubWVzc2FnZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmtlcm5lbCEuc3RhdGUuZ2FtZVdvbikge1xuICAgICAgICAgICAgICAgIG5ldyBWaWN0b3J5TW9kYWwoYXBwLCBwbHVnaW4pLm9wZW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgb25EaXNhYmxlKCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy51bnN1YnNjcmliZVF1ZXN0Q29tcGxldGVkKSB7XG4gICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlUXVlc3RDb21wbGV0ZWQoKTtcbiAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmVRdWVzdENvbXBsZXRlZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgeyBHYW1lTW9kdWxlIH0gZnJvbSAnLi4vLi4vY29yZS9HYW1lTW9kdWxlJztcblxuZXhwb3J0IGNsYXNzIFByb2R1Y3Rpdml0eU1vZHVsZSBleHRlbmRzIEdhbWVNb2R1bGUge1xuICAgIHJlYWRvbmx5IGlkID0gJ3Byb2R1Y3Rpdml0eSc7XG4gICAgcmVhZG9ubHkgbmFtZSA9ICdQcm9kdWN0aXZpdHknO1xuICAgIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gJ1F1ZXN0IGNvbXBsZXRpb24gY291bnRlcnMsIHN0cmVha3MsIGFuZCBtaXNzaW9uIHByb2dyZXNzaW9uLic7XG5cbiAgICBwcml2YXRlIHVuc3Vic2NyaWJlUXVlc3RDb21wbGV0ZWQ6ICgoKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuXG4gICAgb25FbmFibGUoKTogdm9pZCB7XG4gICAgICAgIGlmICghdGhpcy5rZXJuZWwpIHJldHVybjtcblxuICAgICAgICB0aGlzLnVuc3Vic2NyaWJlUXVlc3RDb21wbGV0ZWQgPSB0aGlzLmtlcm5lbC5ldmVudHMub24oJ3F1ZXN0OmNvbXBsZXRlZCcsIChwYXlsb2FkKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHRoaXMua2VybmVsIS5zdGF0ZTtcbiAgICAgICAgICAgIGNvbnN0IGVuZ2luZSA9IHRoaXMua2VybmVsIS5nZXRTZXJ2aWNlKCdlbmdpbmUnKTtcblxuICAgICAgICAgICAgc2V0dGluZ3MucXVlc3RzQ29tcGxldGVkVG9kYXkgKz0gMTtcbiAgICAgICAgICAgIGVuZ2luZT8uYW5hbHl0aWNzRW5naW5lPy51cGRhdGVTdHJlYWs/LigpO1xuXG4gICAgICAgICAgICBlbmdpbmU/LmNoZWNrRGFpbHlNaXNzaW9ucz8uKHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnY29tcGxldGUnLFxuICAgICAgICAgICAgICAgIGRpZmZpY3VsdHk6IHBheWxvYWQuZGlmZmljdWx0eSxcbiAgICAgICAgICAgICAgICBza2lsbDogcGF5bG9hZC5za2lsbE5hbWUsXG4gICAgICAgICAgICAgICAgc2Vjb25kYXJ5U2tpbGw6IHBheWxvYWQuc2Vjb25kYXJ5U2tpbGwsXG4gICAgICAgICAgICAgICAgaGlnaFN0YWtlczogcGF5bG9hZC5oaWdoU3Rha2VzXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgb25EaXNhYmxlKCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy51bnN1YnNjcmliZVF1ZXN0Q29tcGxldGVkKSB7XG4gICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlUXVlc3RDb21wbGV0ZWQoKTtcbiAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmVRdWVzdENvbXBsZXRlZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgeyBHYW1lTW9kdWxlIH0gZnJvbSAnLi4vLi4vY29yZS9HYW1lTW9kdWxlJztcblxuZXhwb3J0IGNsYXNzIEFuYWx5dGljc01vZHVsZSBleHRlbmRzIEdhbWVNb2R1bGUge1xuICAgIHJlYWRvbmx5IGlkID0gJ2FuYWx5dGljcyc7XG4gICAgcmVhZG9ubHkgbmFtZSA9ICdBbmFseXRpY3MnO1xuICAgIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gJ1RyYWNrcyBnYW1lcGxheSB0ZWxlbWV0cnkgZnJvbSBkb21haW4gZXZlbnRzLic7XG5cbiAgICBwcml2YXRlIHVuc3Vic2NyaWJlUXVlc3RDb21wbGV0ZWQ6ICgoKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgdW5zdWJzY3JpYmVRdWVzdEZhaWxlZDogKCgpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG5cbiAgICBvbkVuYWJsZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCF0aGlzLmtlcm5lbCkgcmV0dXJuO1xuXG4gICAgICAgIHRoaXMudW5zdWJzY3JpYmVRdWVzdENvbXBsZXRlZCA9IHRoaXMua2VybmVsLmV2ZW50cy5vbigncXVlc3Q6Y29tcGxldGVkJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB0aGlzLmtlcm5lbCEuc3RhdGU7XG4gICAgICAgICAgICBjb25zdCBlbmdpbmUgPSB0aGlzLmtlcm5lbCEuZ2V0U2VydmljZSgnZW5naW5lJyk7XG5cbiAgICAgICAgICAgIGVuZ2luZT8uYW5hbHl0aWNzRW5naW5lPy50cmFja0RhaWx5TWV0cmljcz8uKCdxdWVzdF9jb21wbGV0ZScsIDEpO1xuICAgICAgICAgICAgc2V0dGluZ3MucmVzZWFyY2hTdGF0cy50b3RhbENvbWJhdCArPSAxO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnVuc3Vic2NyaWJlUXVlc3RGYWlsZWQgPSB0aGlzLmtlcm5lbC5ldmVudHMub24oJ3F1ZXN0OmZhaWxlZCcsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGVuZ2luZSA9IHRoaXMua2VybmVsIS5nZXRTZXJ2aWNlKCdlbmdpbmUnKTtcbiAgICAgICAgICAgIGVuZ2luZT8uYW5hbHl0aWNzRW5naW5lPy50cmFja0RhaWx5TWV0cmljcz8uKCdxdWVzdF9mYWlsJywgMSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIG9uRGlzYWJsZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMudW5zdWJzY3JpYmVRdWVzdENvbXBsZXRlZCkge1xuICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZVF1ZXN0Q29tcGxldGVkKCk7XG4gICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlUXVlc3RDb21wbGV0ZWQgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMudW5zdWJzY3JpYmVRdWVzdEZhaWxlZCkge1xuICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZVF1ZXN0RmFpbGVkKCk7XG4gICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlUXVlc3RGYWlsZWQgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgTm90aWNlLCBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBHYW1lTW9kdWxlIH0gZnJvbSAnLi4vLi4vY29yZS9HYW1lTW9kdWxlJztcblxuZXhwb3J0IGNsYXNzIFJlY292ZXJ5TW9kdWxlIGV4dGVuZHMgR2FtZU1vZHVsZSB7XG4gICAgcmVhZG9ubHkgaWQgPSAncmVjb3ZlcnknO1xuICAgIHJlYWRvbmx5IG5hbWUgPSAnUmVjb3ZlcnknO1xuICAgIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gJ0hhbmRsZXMgdGltZWQgcmVjb3ZlcnkgZWZmZWN0cyBzdWNoIGFzIGJ1ZmYgZXhwaXJhdGlvbi4nO1xuXG4gICAgcHJpdmF0ZSB1bnN1YnNjcmliZUNsb2NrVGljazogKCgpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG5cbiAgICBvbkVuYWJsZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCF0aGlzLmtlcm5lbCkgcmV0dXJuO1xuXG4gICAgICAgIHRoaXMudW5zdWJzY3JpYmVDbG9ja1RpY2sgPSB0aGlzLmtlcm5lbC5ldmVudHMub24oJ2Nsb2NrOnRpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHRoaXMua2VybmVsIS5zdGF0ZTtcbiAgICAgICAgICAgIGNvbnN0IGVuZ2luZSA9IHRoaXMua2VybmVsIS5nZXRTZXJ2aWNlKCdlbmdpbmUnKTtcbiAgICAgICAgICAgIGNvbnN0IG5vdyA9IG1vbWVudCgpO1xuICAgICAgICAgICAgY29uc3QgaW5pdGlhbENvdW50ID0gc2V0dGluZ3MuYWN0aXZlQnVmZnMubGVuZ3RoO1xuXG4gICAgICAgICAgICBzZXR0aW5ncy5hY3RpdmVCdWZmcyA9IHNldHRpbmdzLmFjdGl2ZUJ1ZmZzLmZpbHRlcigoYnVmZikgPT4gbW9tZW50KGJ1ZmYuZXhwaXJlc0F0KS5pc0FmdGVyKG5vdykpO1xuXG4gICAgICAgICAgICBpZiAoc2V0dGluZ3MuYWN0aXZlQnVmZnMubGVuZ3RoIDwgaW5pdGlhbENvdW50KSB7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZSgnQSBwb3Rpb24gZWZmZWN0IGhhcyB3b3JuIG9mZi4nKTtcbiAgICAgICAgICAgICAgICBlbmdpbmU/LnRyaWdnZXI/LigndXBkYXRlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIG9uRGlzYWJsZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMudW5zdWJzY3JpYmVDbG9ja1RpY2spIHtcbiAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmVDbG9ja1RpY2soKTtcbiAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmVDbG9ja1RpY2sgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgTm90aWNlLCBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBEZWF0aE1vZGFsIH0gZnJvbSAnLi4vLi4vdWkvbW9kYWxzJztcbmltcG9ydCB7IEdhbWVNb2R1bGUgfSBmcm9tICcuLi8uLi9jb3JlL0dhbWVNb2R1bGUnO1xuXG5leHBvcnQgY2xhc3MgRGFpbHlMaWZlY3ljbGVNb2R1bGUgZXh0ZW5kcyBHYW1lTW9kdWxlIHtcbiAgICByZWFkb25seSBpZCA9ICdkYWlseV9saWZlY3ljbGUnO1xuICAgIHJlYWRvbmx5IG5hbWUgPSAnRGFpbHkgTGlmZWN5Y2xlJztcbiAgICByZWFkb25seSBkZXNjcmlwdGlvbiA9ICdIYW5kbGVzIGRhaWx5IGxvZ2luIHJlc2V0LCByb3QgZGFtYWdlLCBhbmQgZGFpbHkgY2hhb3Mgcm9sbC4nO1xuXG4gICAgcHJpdmF0ZSB1bnN1YnNjcmliZVNlc3Npb25TdGFydDogKCgpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG5cbiAgICBvbkVuYWJsZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCF0aGlzLmtlcm5lbCkgcmV0dXJuO1xuXG4gICAgICAgIHRoaXMudW5zdWJzY3JpYmVTZXNzaW9uU3RhcnQgPSB0aGlzLmtlcm5lbC5ldmVudHMub24oJ3Nlc3Npb246c3RhcnQnLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHRoaXMua2VybmVsIS5zdGF0ZTtcbiAgICAgICAgICAgIGNvbnN0IGFwcCA9IHRoaXMua2VybmVsIS5nZXRTZXJ2aWNlKCdhcHAnKTtcbiAgICAgICAgICAgIGNvbnN0IHBsdWdpbiA9IHRoaXMua2VybmVsIS5nZXRTZXJ2aWNlKCdwbHVnaW4nKTtcbiAgICAgICAgICAgIGNvbnN0IGVuZ2luZSA9IHRoaXMua2VybmVsIS5nZXRTZXJ2aWNlKCdlbmdpbmUnKTtcblxuICAgICAgICAgICAgY29uc3QgdG9kYXkgPSBtb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKTtcbiAgICAgICAgICAgIGlmIChzZXR0aW5ncy5sYXN0TG9naW4pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXlzRGlmZiA9IG1vbWVudCgpLmRpZmYobW9tZW50KHNldHRpbmdzLmxhc3RMb2dpbiksICdkYXlzJyk7XG4gICAgICAgICAgICAgICAgaWYgKGRheXNEaWZmID4gMikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByb3REYW1hZ2UgPSAoZGF5c0RpZmYgLSAxKSAqIDEwO1xuICAgICAgICAgICAgICAgICAgICBpZiAocm90RGFtYWdlID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuaHAgLT0gcm90RGFtYWdlO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuaGlzdG9yeS5wdXNoKHsgZGF0ZTogdG9kYXksIHN0YXR1czogJ3JvdCcsIHhwRWFybmVkOiAtcm90RGFtYWdlIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLmhwIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBEZWF0aE1vZGFsKGFwcCwgcGx1Z2luKS5vcGVuKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBlbmdpbmU/LnNhdmU/LigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc2V0dGluZ3MubGFzdExvZ2luICE9PSB0b2RheSkge1xuICAgICAgICAgICAgICAgIHNldHRpbmdzLm1heEhwID0gMTAwICsgKHNldHRpbmdzLmxldmVsICogNSk7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MuaHAgPSBNYXRoLm1pbihzZXR0aW5ncy5tYXhIcCwgc2V0dGluZ3MuaHAgKyAyMCk7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MuZGFtYWdlVGFrZW5Ub2RheSA9IDA7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MubG9ja2Rvd25VbnRpbCA9ICcnO1xuICAgICAgICAgICAgICAgIHNldHRpbmdzLmxhc3RMb2dpbiA9IHRvZGF5O1xuXG4gICAgICAgICAgICAgICAgY29uc3QgdG9kYXlNb21lbnQgPSBtb21lbnQoKTtcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5za2lsbHMuZm9yRWFjaCgoc2tpbGwpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNraWxsLmxhc3RVc2VkICYmIHRvZGF5TW9tZW50LmRpZmYobW9tZW50KHNraWxsLmxhc3RVc2VkKSwgJ2RheXMnKSA+IDMgJiYgIWVuZ2luZT8uaXNSZXN0aW5nPy4oKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2tpbGwucnVzdCA9IE1hdGgubWluKDEwLCAoc2tpbGwucnVzdCB8fCAwKSArIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2tpbGwueHBSZXEgPSBNYXRoLmZsb29yKHNraWxsLnhwUmVxICogMS4xKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLmRhaWx5TWlzc2lvbkRhdGUgIT09IHRvZGF5KSB7XG4gICAgICAgICAgICAgICAgICAgIGVuZ2luZT8ucm9sbERhaWx5TWlzc2lvbnM/LigpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGF3YWl0IGVuZ2luZT8ucm9sbENoYW9zPy4odHJ1ZSk7XG4gICAgICAgICAgICAgICAgYXdhaXQgZW5naW5lPy5zYXZlPy4oKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGF3YWl0IGVuZ2luZT8uc2F2ZT8uKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIG9uRGlzYWJsZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMudW5zdWJzY3JpYmVTZXNzaW9uU3RhcnQpIHtcbiAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmVTZXNzaW9uU3RhcnQoKTtcbiAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmVTZXNzaW9uU3RhcnQgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgTm90aWNlLCBQbHVnaW4sIFRGaWxlLCBXb3Jrc3BhY2VMZWFmLCBkZWJvdW5jZSB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IFNpc3lwaHVzU2V0dGluZ3MgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IFNpc3lwaHVzRW5naW5lLCBERUZBVUxUX01PRElGSUVSIH0gZnJvbSAnLi9lbmdpbmUnO1xuaW1wb3J0IHsgQXVkaW9Db250cm9sbGVyIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBQYW5vcHRpY29uVmlldywgVklFV19UWVBFX1BBTk9QVElDT04gfSBmcm9tIFwiLi91aS92aWV3XCI7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdUYWIgfSBmcm9tICcuL3NldHRpbmdzJztcbmltcG9ydCB7IFJlc2VhcmNoUXVlc3RNb2RhbCwgQ2hhaW5CdWlsZGVyTW9kYWwsIFJlc2VhcmNoTGlzdE1vZGFsLCBRdWlja0NhcHR1cmVNb2RhbCwgUXVlc3RUZW1wbGF0ZU1vZGFsLCBRdWVzdE1vZGFsLCBTY2Fyc01vZGFsIH0gZnJvbSBcIi4vdWkvbW9kYWxzXCI7XG5pbXBvcnQgeyBTaXN5cGh1c0tlcm5lbCB9IGZyb20gJy4vY29yZS9LZXJuZWwnO1xuaW1wb3J0IHsgR2xvYmFsQ29uZmlnLCBTdGF0ZU1hbmFnZXIgfSBmcm9tICcuL2NvcmUvU3RhdGVNYW5hZ2VyJztcbmltcG9ydCB7IFByb2dyZXNzaW9uTW9kdWxlIH0gZnJvbSAnLi9tb2R1bGVzL3Byb2dyZXNzaW9uL1Byb2dyZXNzaW9uTW9kdWxlJztcbmltcG9ydCB7IEVjb25vbXlNb2R1bGUgfSBmcm9tICcuL21vZHVsZXMvZWNvbm9teS9FY29ub215TW9kdWxlJztcbmltcG9ydCB7IFN1cnZpdmFsTW9kdWxlIH0gZnJvbSAnLi9tb2R1bGVzL3N1cnZpdmFsL1N1cnZpdmFsTW9kdWxlJztcbmltcG9ydCB7IENvbWJhdE1vZHVsZSB9IGZyb20gJy4vbW9kdWxlcy9jb21iYXQvQ29tYmF0TW9kdWxlJztcbmltcG9ydCB7IFByb2R1Y3Rpdml0eU1vZHVsZSB9IGZyb20gJy4vbW9kdWxlcy9wcm9kdWN0aXZpdHkvUHJvZHVjdGl2aXR5TW9kdWxlJztcbmltcG9ydCB7IEFuYWx5dGljc01vZHVsZSB9IGZyb20gJy4vbW9kdWxlcy9hbmFseXRpY3MvQW5hbHl0aWNzTW9kdWxlJztcbmltcG9ydCB7IFJlY292ZXJ5TW9kdWxlIH0gZnJvbSAnLi9tb2R1bGVzL3JlY292ZXJ5L1JlY292ZXJ5TW9kdWxlJztcbmltcG9ydCB7IERhaWx5TGlmZWN5Y2xlTW9kdWxlIH0gZnJvbSAnLi9tb2R1bGVzL3JlY292ZXJ5L0RhaWx5TGlmZWN5Y2xlTW9kdWxlJztcblxuY29uc3QgREVGQVVMVF9TRVRUSU5HUzogU2lzeXBodXNTZXR0aW5ncyA9IHtcbiAgICAvLyBbTkVXXSBEZWZhdWx0IFRlbXBsYXRlc1xuICAgIHF1ZXN0VGVtcGxhdGVzOiBbXG4gICAgICAgIHsgbmFtZTogXCJNb3JuaW5nIFJvdXRpbmVcIiwgZGlmZjogMSwgc2tpbGw6IFwiRGlzY2lwbGluZVwiLCBkZWFkbGluZTogXCIxMDowMFwiIH0sXG4gICAgICAgIHsgbmFtZTogXCJEZWVwIFdvcmsgQmxvY2tcIiwgZGlmZjogMywgc2tpbGw6IFwiRm9jdXNcIiwgZGVhZGxpbmU6IFwiKzJoXCIgfSxcbiAgICAgICAgeyBuYW1lOiBcIlF1aWNrIEV4ZXJjaXNlXCIsIGRpZmY6IDIsIHNraWxsOiBcIkhlYWx0aFwiLCBkZWFkbGluZTogXCIrMTJoXCIgfVxuICAgIF0sIC8vIENvbW1hIGhlcmUsIE5PIGNsb3NpbmcgYnJhY2UgeWV0IVxuICAvLyBbTkVXXSBEZWZhdWx0c1xuICAgIGNvbWJvQ291bnQ6IDAsXG4gICAgbGFzdENvbXBsZXRpb25UaW1lOiAwLFxuICAvLyBbTkVXXVxuICAgIGFjdGl2ZUJ1ZmZzOiBbXSxcblxuICAgIGhwOiAxMDAsIG1heEhwOiAxMDAsIHhwOiAwLCBnb2xkOiAwLCB4cFJlcTogMTAwLCBsZXZlbDogMSwgcml2YWxEbWc6IDEwLFxuICAgIGxhc3RMb2dpbjogXCJcIiwgc2hpZWxkZWRVbnRpbDogXCJcIiwgcmVzdERheVVudGlsOiBcIlwiLCBza2lsbHM6IFtdLFxuICAgIGRhaWx5TW9kaWZpZXI6IERFRkFVTFRfTU9ESUZJRVIsIFxuICAgIGxlZ2FjeTogeyBzb3VsczogMCwgcGVya3M6IHsgc3RhcnRHb2xkOiAwLCBzdGFydFNraWxsUG9pbnRzOiAwLCByaXZhbERlbGF5OiAwIH0sIHJlbGljczogW10sIGRlYXRoQ291bnQ6IDAgfSwgXG4gICAgbXV0ZWQ6IGZhbHNlLCBoaXN0b3J5OiBbXSwgcnVuQ291bnQ6IDEsIGxvY2tkb3duVW50aWw6IFwiXCIsIGRhbWFnZVRha2VuVG9kYXk6IDAsXG4gICAgZGFpbHlNaXNzaW9uczogW10sIFxuICAgIGRhaWx5TWlzc2lvbkRhdGU6IFwiXCIsIFxuICAgIHF1ZXN0c0NvbXBsZXRlZFRvZGF5OiAwLCBcbiAgICBza2lsbFVzZXNUb2RheToge30sXG4gICAgcmVzZWFyY2hRdWVzdHM6IFtdLFxuICAgIHJlc2VhcmNoU3RhdHM6IHsgdG90YWxSZXNlYXJjaDogMCwgdG90YWxDb21iYXQ6IDAsIHJlc2VhcmNoQ29tcGxldGVkOiAwLCBjb21iYXRDb21wbGV0ZWQ6IDAgfSxcbiAgICBsYXN0UmVzZWFyY2hRdWVzdElkOiAwLFxuICAgIG1lZGl0YXRpb25DeWNsZXNDb21wbGV0ZWQ6IDAsXG4gICAgcXVlc3REZWxldGlvbnNUb2RheTogMCxcbiAgICBsYXN0RGVsZXRpb25SZXNldDogXCJcIixcbiAgICBpc01lZGl0YXRpbmc6IGZhbHNlLFxuICAgIG1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd246IDAsXG4gICAgYWN0aXZlQ2hhaW5zOiBbXSxcbiAgICBjaGFpbkhpc3Rvcnk6IFtdLFxuICAgIGN1cnJlbnRDaGFpbklkOiBcIlwiLFxuICAgIGNoYWluUXVlc3RzQ29tcGxldGVkOiAwLFxuICAgIHF1ZXN0RmlsdGVyczoge30sXG4gICAgZmlsdGVyU3RhdGU6IHsgYWN0aXZlRW5lcmd5OiBcImFueVwiLCBhY3RpdmVDb250ZXh0OiBcImFueVwiLCBhY3RpdmVUYWdzOiBbXSB9LFxuICAgIGRheU1ldHJpY3M6IFtdLFxuICAgIHdlZWtseVJlcG9ydHM6IFtdLFxuICAgIGJvc3NNaWxlc3RvbmVzOiBbXSxcbiAgICBzdHJlYWs6IHsgY3VycmVudDogMCwgbG9uZ2VzdDogMCwgbGFzdERhdGU6IFwiXCIgfSxcbiAgICBhY2hpZXZlbWVudHM6IFtdLFxuICAgIGdhbWVXb246IGZhbHNlLFxuICAgIHNjYXJzOiBbXSxcbiAgICBuZXVyYWxIdWJQYXRoOiBcIkFjdGl2ZV9SdW4vTmV1cmFsX0h1Yi5jYW52YXNcIlxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTaXN5cGh1c1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gICAgc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3M7XG4gICAgY29uZmlnOiBHbG9iYWxDb25maWc7XG4gICAgc3RhdHVzQmFySXRlbTogSFRNTEVsZW1lbnQ7XG4gICAgZW5naW5lOiBTaXN5cGh1c0VuZ2luZTtcbiAgICBrZXJuZWw6IFNpc3lwaHVzS2VybmVsO1xuICAgIGF1ZGlvOiBBdWRpb0NvbnRyb2xsZXI7XG5cbiAgICBhc3luYyBvbmxvYWQoKSB7XG4gICAgLy8gLS0tIEVWRU5UIExJU1RFTkVSOiBGSUxFIFJFTkFNRSAtLS1cbiAgICAgICAgdGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLnZhdWx0Lm9uKCdyZW5hbWUnLCAoZmlsZSwgb2xkUGF0aCkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmVuZ2luZSkgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKGZpbGUgaW5zdGFuY2VvZiBURmlsZSAmJiBmaWxlLmV4dGVuc2lvbiA9PT0gJ21kJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld05hbWUgPSBmaWxlLmJhc2VuYW1lO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEV4dHJhY3Qgb2xkIGJhc2VuYW1lIGZyb20gdGhlIG9sZCBwYXRoXG4gICAgICAgICAgICAgICAgLy8gb2xkUGF0aCBsb29rcyBsaWtlIFwiQWN0aXZlX1J1bi9RdWVzdHMvT2xkTmFtZS5tZFwiXG4gICAgICAgICAgICAgICAgY29uc3QgcGF0aFBhcnRzID0gb2xkUGF0aC5zcGxpdCgnLycpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG9sZEZpbGVOYW1lID0gcGF0aFBhcnRzW3BhdGhQYXJ0cy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICBjb25zdCBvbGROYW1lID0gb2xkRmlsZU5hbWUucmVwbGFjZSgvXFwubWQkLywgJycpOyAvLyBSZW1vdmUgZXh0ZW5zaW9uXG5cbiAgICAgICAgICAgICAgICBpZiAob2xkTmFtZSAhPT0gbmV3TmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBQcm9wYWdhdGUgcmVuYW1lIHRvIGVuZ2luZXNcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbmdpbmUuY2hhaW5zRW5naW5lLmhhbmRsZVJlbmFtZShvbGROYW1lLCBuZXdOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbmdpbmUuZmlsdGVyc0VuZ2luZS5oYW5kbGVSZW5hbWUob2xkTmFtZSwgbmV3TmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBGb3JjZSBzYXZlIHRvIHBlcnNpc3QgY2hhbmdlc1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVuZ2luZS5zYXZlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KSk7XG5cbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdxdWVzdC10ZW1wbGF0ZXMnLFxuICAgICAgICAgICAgbmFtZTogJ0RlcGxveSBRdWVzdCBmcm9tIFRlbXBsYXRlJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiBuZXcgUXVlc3RUZW1wbGF0ZU1vZGFsKHRoaXMuYXBwLCB0aGlzKS5vcGVuKClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnZGVwbG95LXF1ZXN0LWhvdGtleScsXG4gICAgICAgICAgICBuYW1lOiAnRGVwbG95IFF1ZXN0JyxcbiAgICAgICAgICAgIGhvdGtleXM6IFt7IG1vZGlmaWVyczogW1wiTW9kXCJdLCBrZXk6IFwiZFwiIH1dLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IG5ldyBRdWVzdE1vZGFsKHRoaXMuYXBwLCB0aGlzKS5vcGVuKClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAndW5kby1xdWVzdC1kZWxldGUnLFxuICAgICAgICAgICAgbmFtZTogJ1VuZG8gTGFzdCBRdWVzdCBEZWxldGlvbicsXG4gICAgICAgICAgICBob3RrZXlzOiBbeyBtb2RpZmllcnM6IFtcIk1vZFwiLCBcIlNoaWZ0XCJdLCBrZXk6IFwielwiIH1dLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLnVuZG9MYXN0RGVsZXRpb24oKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdleHBvcnQtc3RhdHMnLFxuICAgICAgICAgICAgbmFtZTogJ0FuYWx5dGljczogRXhwb3J0IFN0YXRzIEpTT04nLFxuICAgICAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMuZW5naW5lLmdldEdhbWVTdGF0cygpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSBgU2lzeXBodXNfU3RhdHNfJHtEYXRlLm5vdygpfS5qc29uYDtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUocGF0aCwgSlNPTi5zdHJpbmdpZnkoc3RhdHMsIG51bGwsIDIpKTtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGBTdGF0cyBleHBvcnRlZCB0byAke3BhdGh9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgXG4gICAgICAgICAgICBpZDogJ2FjY2VwdC1kZWF0aCcsIFxuICAgICAgICAgICAgbmFtZTogJ0FDQ0VQVCBERUFUSCAoUmVzZXQgUnVuKScsIFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLnRyaWdnZXJEZWF0aCgpIFxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBcbiAgICAgICAgICAgIGlkOiAncmVyb2xsLWNoYW9zJywgXG4gICAgICAgICAgICBuYW1lOiAnUmVyb2xsIENoYW9zJywgXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUucm9sbENoYW9zKHRydWUpIFxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAncXVpY2stY2FwdHVyZScsXG4gICAgICAgICAgICBuYW1lOiAnUXVpY2sgQ2FwdHVyZSAoU2NyYXApJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiBuZXcgUXVpY2tDYXB0dXJlTW9kYWwodGhpcy5hcHAsIHRoaXMpLm9wZW4oKVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ2dlbmVyYXRlLXNraWxsLWdyYXBoJyxcbiAgICAgICAgICAgIG5hbWU6ICdOZXVyYWwgSHViOiBHZW5lcmF0ZSBTa2lsbCBHcmFwaCcsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUuZ2VuZXJhdGVTa2lsbEdyYXBoKClcbiAgICAgICAgfSk7XG4gICAgICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmxvYWRTdHlsZXMoKTtcbiAgICAgICAgdGhpcy5hdWRpbyA9IG5ldyBBdWRpb0NvbnRyb2xsZXIodGhpcy5jb25maWcubXV0ZUF1ZGlvKTtcbiAgICAgICAgdGhpcy5lbmdpbmUgPSBuZXcgU2lzeXBodXNFbmdpbmUodGhpcy5hcHAsIHRoaXMsIHRoaXMuYXVkaW8pO1xuICAgICAgICB0aGlzLmtlcm5lbCA9IG5ldyBTaXN5cGh1c0tlcm5lbCh7XG4gICAgICAgICAgICBjb25maWc6IHRoaXMuY29uZmlnLFxuICAgICAgICAgICAgc3RhdGU6IHRoaXMuc2V0dGluZ3MsXG4gICAgICAgICAgICBzYXZlOiBhc3luYyAoY29uZmlnLCBzdGF0ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEoeyBjb25maWcsIHN0YXRlIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlcnZpY2VzOiB7XG4gICAgICAgICAgICAgICAgYXBwOiB0aGlzLmFwcCxcbiAgICAgICAgICAgICAgICBlbmdpbmU6IHRoaXMuZW5naW5lLFxuICAgICAgICAgICAgICAgIGF1ZGlvOiB0aGlzLmF1ZGlvLFxuICAgICAgICAgICAgICAgIHBsdWdpbjogdGhpc1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5rZXJuZWwucmVnaXN0ZXJNb2R1bGUobmV3IFN1cnZpdmFsTW9kdWxlKCkpO1xuICAgICAgICB0aGlzLmtlcm5lbC5yZWdpc3Rlck1vZHVsZShuZXcgUHJvZ3Jlc3Npb25Nb2R1bGUoKSk7XG4gICAgICAgIHRoaXMua2VybmVsLnJlZ2lzdGVyTW9kdWxlKG5ldyBFY29ub215TW9kdWxlKCkpO1xuICAgICAgICB0aGlzLmtlcm5lbC5yZWdpc3Rlck1vZHVsZShuZXcgQ29tYmF0TW9kdWxlKCkpO1xuICAgICAgICB0aGlzLmtlcm5lbC5yZWdpc3Rlck1vZHVsZShuZXcgUHJvZHVjdGl2aXR5TW9kdWxlKCkpO1xuICAgICAgICB0aGlzLmtlcm5lbC5yZWdpc3Rlck1vZHVsZShuZXcgQW5hbHl0aWNzTW9kdWxlKCkpO1xuICAgICAgICB0aGlzLmtlcm5lbC5yZWdpc3Rlck1vZHVsZShuZXcgUmVjb3ZlcnlNb2R1bGUoKSk7XG4gICAgICAgIHRoaXMua2VybmVsLnJlZ2lzdGVyTW9kdWxlKG5ldyBEYWlseUxpZmVjeWNsZU1vZHVsZSgpKTtcbiAgICAgICAgdGhpcy5rZXJuZWwuZW5hYmxlQ29uZmlndXJlZE1vZHVsZXMoKTtcblxuICAgICAgICB0aGlzLnJlZ2lzdGVyVmlldyhWSUVXX1RZUEVfUEFOT1BUSUNPTiwgKGxlYWYpID0+IG5ldyBQYW5vcHRpY29uVmlldyhsZWFmLCB0aGlzKSk7XG5cbiAgICAgICAgdGhpcy5zdGF0dXNCYXJJdGVtID0gdGhpcy5hZGRTdGF0dXNCYXJJdGVtKCk7XG4gICAgICAgICh3aW5kb3cgYXMgYW55KS5zaXN5cGh1c0VuZ2luZSA9IHRoaXMuZW5naW5lO1xuICAgICAgICBcbiAgICAgICAgYXdhaXQgdGhpcy5lbmdpbmUuY2hlY2tEYWlseUxvZ2luKCk7XG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHVzQmFyKCk7XG5cblxuICAgICAgICAvLyAtLS0gQ09NTUFORFMgLS0tXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAnb3Blbi1wYW5vcHRpY29uJywgbmFtZTogJ09wZW4gUGFub3B0aWNvbicsIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmFjdGl2YXRlVmlldygpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ3RvZ2dsZS1mb2N1cycsIG5hbWU6ICdUb2dnbGUgRm9jdXMgQXVkaW8nLCBjYWxsYmFjazogKCkgPT4gdGhpcy5hdWRpby50b2dnbGVCcm93bk5vaXNlKCkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAnY3JlYXRlLXJlc2VhcmNoJywgbmFtZTogJ1Jlc2VhcmNoOiBDcmVhdGUgUXVlc3QnLCBjYWxsYmFjazogKCkgPT4gbmV3IFJlc2VhcmNoUXVlc3RNb2RhbCh0aGlzLmFwcCwgdGhpcykub3BlbigpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ3ZpZXctcmVzZWFyY2gnLCBuYW1lOiAnUmVzZWFyY2g6IFZpZXcgTGlicmFyeScsIGNhbGxiYWNrOiAoKSA9PiBuZXcgUmVzZWFyY2hMaXN0TW9kYWwodGhpcy5hcHAsIHRoaXMpLm9wZW4oKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdtZWRpdGF0ZScsIG5hbWU6ICdNZWRpdGF0aW9uOiBTdGFydCcsIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5zdGFydE1lZGl0YXRpb24oKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdjcmVhdGUtY2hhaW4nLCBuYW1lOiAnQ2hhaW5zOiBDcmVhdGUnLCBjYWxsYmFjazogKCkgPT4gbmV3IENoYWluQnVpbGRlck1vZGFsKHRoaXMuYXBwLCB0aGlzKS5vcGVuKCkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAndmlldy1jaGFpbnMnLCBuYW1lOiAnQ2hhaW5zOiBWaWV3IEFjdGl2ZScsIGNhbGxiYWNrOiAoKSA9PiB7IGNvbnN0IGMgPSB0aGlzLmVuZ2luZS5nZXRBY3RpdmVDaGFpbigpOyBuZXcgTm90aWNlKGMgPyBgQWN0aXZlOiAke2MubmFtZX1gIDogXCJObyBhY3RpdmUgY2hhaW5cIik7IH0gfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAnZmlsdGVyLWhpZ2gnLCBuYW1lOiAnRmlsdGVyczogSGlnaCBFbmVyZ3knLCBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUuc2V0RmlsdGVyU3RhdGUoXCJoaWdoXCIsIFwiYW55XCIsIFtdKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdjbGVhci1maWx0ZXJzJywgbmFtZTogJ0ZpbHRlcnM6IENsZWFyJywgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLmNsZWFyRmlsdGVycygpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ2dhbWUtc3RhdHMnLCBuYW1lOiAnQW5hbHl0aWNzOiBTdGF0cycsIGNhbGxiYWNrOiAoKSA9PiB7IGNvbnN0IHMgPSB0aGlzLmVuZ2luZS5nZXRHYW1lU3RhdHMoKTsgbmV3IE5vdGljZShgTHZsICR7cy5sZXZlbH0gfCBTdHJlYWsgJHtzLmN1cnJlbnRTdHJlYWt9YCk7IH0gfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAnc2NhcnMnLCBuYW1lOiAnU2NhcnM6IFZpZXcnLCBjYWxsYmFjazogKCkgPT4gbmV3IFNjYXJzTW9kYWwodGhpcy5hcHAsIHRoaXMpLm9wZW4oKSB9KTtcblxuICAgICAgICB0aGlzLmFkZFJpYmJvbkljb24oJ3NrdWxsJywgJ1Npc3lwaHVzIFNpZGViYXInLCAoKSA9PiB0aGlzLmFjdGl2YXRlVmlldygpKTtcbiAgICAgICAgLy8gLi4uIHByZXZpb3VzIGNvZGUgLi4uXG5cbiAgICAvLyAtLS0gU0VUVElOR1MgVEFCIC0tLVxuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgU2lzeXBodXNTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG5cbiAgICB0aGlzLnJlZ2lzdGVySW50ZXJ2YWwod2luZG93LnNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgaWYgKHRoaXMua2VybmVsKSB0aGlzLmtlcm5lbC5ldmVudHMuZW1pdCgnY2xvY2s6dGljaycsIHsgbm93OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkgfSk7XG4gICAgICAgIHZvaWQgdGhpcy5lbmdpbmUuY2hlY2tEZWFkbGluZXMoKTtcbiAgICB9LCA2MDAwMCkpO1xuXG5cbiAgICAvLyBbRklYXSBEZWJvdW5jZWQgV29yZCBDb3VudGVyIChUeXBld3JpdGVyIEZpeClcbiAgICAgICAgY29uc3QgZGVib3VuY2VkVXBkYXRlID0gZGVib3VuY2UoKGZpbGU6IFRGaWxlLCBjb250ZW50OiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIC8vIDEuIENoZWNrIGlmIGZpbGUgc3RpbGwgZXhpc3RzIHRvIHByZXZlbnQgcmFjZSBjb25kaXRpb24gZXJyb3JzXG4gICAgICAgICAgICBpZiAoIWZpbGUgfHwgIWZpbGUucGF0aCkgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3QgZXhpc3RzID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZpbGUucGF0aCk7XG4gICAgICAgICAgICBpZiAoIWV4aXN0cykgcmV0dXJuO1xuXG4gICAgICAgICAgICBjb25zdCBjYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpO1xuICAgICAgICAgICAgaWYgKGNhY2hlPy5mcm9udG1hdHRlcj8ucmVzZWFyY2hfaWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB3b3JkcyA9IGNvbnRlbnQudHJpbSgpLnNwbGl0KC9cXHMrLykubGVuZ3RoO1xuICAgICAgICAgICAgICAgIHRoaXMuZW5naW5lLnVwZGF0ZVJlc2VhcmNoV29yZENvdW50KGNhY2hlLmZyb250bWF0dGVyLnJlc2VhcmNoX2lkLCB3b3Jkcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIDEwMDAsIHRydWUpO1xuXG4gICAgICAgIC8vIFJlZ2lzdGVyIHRoZSBldmVudCBsaXN0ZW5lciB0byBhY3R1YWxseSBVU0UgdGhlIGRlYm91bmNlIGZ1bmN0aW9uXG4gICAgICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oJ2VkaXRvci1jaGFuZ2UnLCAoZWRpdG9yLCBpbmZvKSA9PiB7XG4gICAgICAgICAgICBpZiAoaW5mbyAmJiBpbmZvLmZpbGUpIHtcbiAgICAgICAgICAgICAgICBkZWJvdW5jZWRVcGRhdGUoaW5mby5maWxlLCBlZGl0b3IuZ2V0VmFsdWUoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKTtcbiAgICB9IC8vIDwtLS0gVEhJUyBCUkFDRSBXQVMgTUlTU0lOR1xuXG4gICAgYXN5bmMgbG9hZFN0eWxlcygpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGRpciA9ICh0aGlzLm1hbmlmZXN0ICYmICh0aGlzLm1hbmlmZXN0IGFzIHsgZGlyPzogc3RyaW5nIH0pLmRpcikgfHwgXCJcIjtcbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSBkaXIgPyBgJHtkaXJ9L3N0eWxlcy5jc3NgIDogXCJzdHlsZXMuY3NzXCI7XG4gICAgICAgICAgICBjb25zdCBjc3NGaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHBhdGgpO1xuICAgICAgICAgICAgaWYgKGNzc0ZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNzcyA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoY3NzRmlsZSk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XG4gICAgICAgICAgICAgICAgc3R5bGUuaWQgPSBcInNpc3lwaHVzLXN0eWxlc1wiO1xuICAgICAgICAgICAgICAgIHN0eWxlLmlubmVySFRNTCA9IGNzcztcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkgeyBjb25zb2xlLmVycm9yKFwiQ291bGQgbm90IGxvYWQgc3R5bGVzLmNzc1wiLCBlKTsgfVxuICAgIH1cblxuICAgIGFzeW5jIG9udW5sb2FkKCkge1xuICAgICAgICB0aGlzLmFwcC53b3Jrc3BhY2UuZGV0YWNoTGVhdmVzT2ZUeXBlKFZJRVdfVFlQRV9QQU5PUFRJQ09OKTtcbiAgICAgICAgaWYgKHRoaXMua2VybmVsKSB0aGlzLmtlcm5lbC5zaHV0ZG93bigpO1xuICAgICAgICBpZih0aGlzLmF1ZGlvLmF1ZGlvQ3R4KSB0aGlzLmF1ZGlvLmF1ZGlvQ3R4LmNsb3NlKCk7XG4gICAgICAgIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzaXN5cGh1cy1zdHlsZXNcIik7XG4gICAgICAgIGlmIChzdHlsZSkgc3R5bGUucmVtb3ZlKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgYWN0aXZhdGVWaWV3KCkge1xuICAgICAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHA7XG4gICAgICAgIGxldCBsZWFmOiBXb3Jrc3BhY2VMZWFmIHwgbnVsbCA9IG51bGw7XG4gICAgICAgIGNvbnN0IGxlYXZlcyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVklFV19UWVBFX1BBTk9QVElDT04pO1xuICAgICAgICBpZiAobGVhdmVzLmxlbmd0aCA+IDApIGxlYWYgPSBsZWF2ZXNbMF07XG4gICAgICAgIGVsc2UgeyBsZWFmID0gd29ya3NwYWNlLmdldFJpZ2h0TGVhZihmYWxzZSk7IGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogVklFV19UWVBFX1BBTk9QVElDT04sIGFjdGl2ZTogdHJ1ZSB9KTsgfVxuICAgICAgICB3b3Jrc3BhY2UucmV2ZWFsTGVhZihsZWFmKTtcbiAgICB9XG5cbiAgICB1cGRhdGVTdGF0dXNCYXIoKSB7XG4gICAgICAgIGNvbnN0IHNoaWVsZCA9ICh0aGlzLmVuZ2luZS5pc1NoaWVsZGVkKCkgfHwgdGhpcy5lbmdpbmUuaXNSZXN0aW5nKCkpID8gKHRoaXMuZW5naW5lLmlzUmVzdGluZygpID8gXCJEXCIgOiBcIlNcIikgOiBcIlwiO1xuICAgICAgICBjb25zdCBtQ291bnQgPSB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMuZmlsdGVyKG0gPT4gbS5jb21wbGV0ZWQpLmxlbmd0aDtcbiAgICAvLyBbTkVXXSBDb21ibyBJbmRpY2F0b3JcbiAgICAgICAgLy8gSWYgY29tYm8gPiAxLCBzaG93IGZpcmUgaWNvbi4gT3RoZXJ3aXNlIHNob3cgbm90aGluZy5cbiAgICAgICAgY29uc3QgY29tYm8gPSB0aGlzLnNldHRpbmdzLmNvbWJvQ291bnQgPiAxID8gYCDwn5SleCR7dGhpcy5zZXR0aW5ncy5jb21ib0NvdW50fWAgOiBcIlwiO1xuICAgICAgICB0aGlzLnN0YXR1c0Jhckl0ZW0uc2V0VGV4dChgJHt0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIuaWNvbn0gJHtzaGllbGR9IEhQJHt0aGlzLnNldHRpbmdzLmhwfSBHJHt0aGlzLnNldHRpbmdzLmdvbGR9IE0ke21Db3VudH0vMyR7Y29tYm99YCk7XG4gICAgICAgIHRoaXMuc3RhdHVzQmFySXRlbS5zdHlsZS5jb2xvciA9IHRoaXMuc2V0dGluZ3MuaHAgPCAzMCA/IFwicmVkXCIgOiB0aGlzLnNldHRpbmdzLmdvbGQgPCAwID8gXCJvcmFuZ2VcIiA6IFwiXCI7XG4gICAgfVxuICAgIFxuICAgIGFzeW5jIGxvYWRTZXR0aW5ncygpIHtcbiAgICAgICAgY29uc3Qgc3RhdGVNYW5hZ2VyID0gbmV3IFN0YXRlTWFuYWdlcihERUZBVUxUX1NFVFRJTkdTKTtcbiAgICAgICAgY29uc3QgbWlncmF0aW9uID0gc3RhdGVNYW5hZ2VyLm1pZ3JhdGUoYXdhaXQgdGhpcy5sb2FkRGF0YSgpKTtcbiAgICAgICAgdGhpcy5jb25maWcgPSBtaWdyYXRpb24uY29uZmlnO1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gbWlncmF0aW9uLnN0YXRlO1xuXG4gICAgICAgIGlmIChtaWdyYXRpb24ubWlncmF0ZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEoc3RhdGVNYW5hZ2VyLnRvUGVyc2lzdGVkU3RhdGUodGhpcy5jb25maWcsIHRoaXMuc2V0dGluZ3MpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIHNhdmVTZXR0aW5ncygpIHtcbiAgICAgICAgY29uc3Qgc3RhdGVNYW5hZ2VyID0gbmV3IFN0YXRlTWFuYWdlcihERUZBVUxUX1NFVFRJTkdTKTtcbiAgICAgICAgdGhpcy5jb25maWcubXV0ZUF1ZGlvID0gdGhpcy5zZXR0aW5ncy5tdXRlZDtcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlRGF0YShzdGF0ZU1hbmFnZXIudG9QZXJzaXN0ZWRTdGF0ZSh0aGlzLmNvbmZpZywgdGhpcy5zZXR0aW5ncykpO1xuICAgIH1cbn1cbiJdLCJuYW1lcyI6WyJOb3RpY2UiLCJNb2RhbCIsIm1vbWVudCIsIlNldHRpbmciLCJURm9sZGVyIiwiVEZpbGUiLCJnZXREaWZmaWN1bHR5TnVtIiwiSXRlbVZpZXciLCJkZWJvdW5jZSIsIlBsdWdpblNldHRpbmdUYWIiLCJQbHVnaW4iXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQWtHQTtBQUNPLFNBQVMsU0FBUyxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRTtBQUM3RCxJQUFJLFNBQVMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sS0FBSyxZQUFZLENBQUMsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsVUFBVSxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtBQUNoSCxJQUFJLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLFVBQVUsT0FBTyxFQUFFLE1BQU0sRUFBRTtBQUMvRCxRQUFRLFNBQVMsU0FBUyxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7QUFDbkcsUUFBUSxTQUFTLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7QUFDdEcsUUFBUSxTQUFTLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUU7QUFDdEgsUUFBUSxJQUFJLENBQUMsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsVUFBVSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7QUFDOUUsS0FBSyxDQUFDLENBQUM7QUFDUCxDQUFDO0FBNk1EO0FBQ3VCLE9BQU8sZUFBZSxLQUFLLFVBQVUsR0FBRyxlQUFlLEdBQUcsVUFBVSxLQUFLLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRTtBQUN2SCxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUks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LENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzdJLElBQUlBLGdCQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLDJCQUEyQixDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxDQUEyQixDQUFDLENBQUMsQ0FBQztBQUNoUCxRQUFBLE1BQU0sTUFBTSxHQUEyQixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzdILFFBQUEsSUFBSUEsZ0JBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzSSxRQUFBLE1BQU0sWUFBWSxHQUEyQixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQztBQUNoRSxRQUFBLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFDOUUsUUFBQSxJQUFJLFdBQVcsWUFB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QUd2RCxRQUFBLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDO0FBQUUsWUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDOztBQUd6RSxRQUFBLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxNQUFNLElBQUksQ0FBQztBQUFFLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQzs7QUFHMUQsUUFBQSxJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLElBQUksQ0FBQztBQUFFLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQzs7QUFHdEUsUUFBQSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksR0FBRztBQUFFLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQzs7QUFHdkMsUUFBQSxJQUFJLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQUUsWUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDOztBQUd2RSxRQUFBLElBQUksQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFO0FBQUUsWUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDOztBQUczQyxRQUFBLElBQUksQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEtBQUssQ0FBQztBQUFFLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztLQUMzRTtBQUVELElBQUEsTUFBTSxDQUFDLEVBQVUsRUFBQTtRQUNiLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztBQUM5RCxRQUFB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
