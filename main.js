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
    }
    getDifficultyNumber(diffLabel) {
        return getDifficultyNumber(diffLabel);
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
                if (secSkill && skill) {
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
                if (this.settings.hp <= 0) {
                    new DeathModal(this.app, this.plugin).open();
                    return;
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
                    if (bossHpPenalty > 0)
                        new obsidian.Notice(`☠️ Boss Crush: +${bossHpPenalty} Damage`);
                }
            }
            const damage = computeFailDamage(this.settings.rivalDmg, this.settings.gold, damageMult, bossHpPenalty);
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
                    const required = ['hp', 'skills', 'level', 'xpReq', 'dailyModifier', 'legacy', 'researchStats', 'filterState'];
                    const missing = required.filter(k => data[k] == null);
                    if (missing.length > 0) {
                        new obsidian.Notice(`Invalid backup: missing ${missing.join(', ')}`);
                        return;
                    }
                    if (!Array.isArray(data.scars))
                        data.scars = [];
                    if (typeof data.neuralHubPath !== 'string')
                        data.neuralHubPath = 'Active_Run/Neural_Hub.canvas';
                    this.plugin.settings = data;
                    yield this.plugin.saveSettings();
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
            this.addCommand({ id: 'scars', name: 'Scars: View', callback: () => new ScarsModal(this.app, this).open() });
            this.addRibbonIcon('skull', 'Sisyphus Sidebar', () => this.activateView());
            // ... previous code ...
            // --- SETTINGS TAB ---
            this.addSettingTab(new SisyphusSettingTab(this.app, this));
            this.addRibbonIcon('skull', 'Sisyphus Sidebar', () => this.activateView());
            this.registerInterval(window.setInterval(() => { void this.engine.checkDeadlines(); }, 60000));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInNyYy91dGlscy50cyIsInNyYy91aS9tb2RhbHMudHMiLCJzcmMvYWNoaWV2ZW1lbnRzLnRzIiwic3JjL2VuZ2luZXMvQW5hbHl0aWNzRW5naW5lLnRzIiwic3JjL2VuZ2luZXMvTWVkaXRhdGlvbkVuZ2luZS50cyIsInNyYy9lbmdpbmVzL1Jlc2VhcmNoRW5naW5lLnRzIiwic3JjL2VuZ2luZXMvQ2hhaW5zRW5naW5lLnRzIiwic3JjL2VuZ2luZXMvRmlsdGVyc0VuZ2luZS50cyIsInNyYy9tZWNoYW5pY3MudHMiLCJzcmMvZW5naW5lLnRzIiwic3JjL3VpL2NoYXJ0cy50cyIsInNyYy91aS9jYXJkLnRzIiwic3JjL3VpL3ZpZXcudHMiLCJzcmMvc2V0dGluZ3MudHMiLCJzcmMvbWFpbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbkNvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLlxyXG5cclxuUGVybWlzc2lvbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgYW5kL29yIGRpc3RyaWJ1dGUgdGhpcyBzb2Z0d2FyZSBmb3IgYW55XHJcbnB1cnBvc2Ugd2l0aCBvciB3aXRob3V0IGZlZSBpcyBoZXJlYnkgZ3JhbnRlZC5cclxuXHJcblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIgQU5EIFRIRSBBVVRIT1IgRElTQ0xBSU1TIEFMTCBXQVJSQU5USUVTIFdJVEhcclxuUkVHQVJEIFRPIFRISVMgU09GVFdBUkUgSU5DTFVESU5HIEFMTCBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZXHJcbkFORCBGSVRORVNTLiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SIEJFIExJQUJMRSBGT1IgQU5ZIFNQRUNJQUwsIERJUkVDVCxcclxuSU5ESVJFQ1QsIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyBPUiBBTlkgREFNQUdFUyBXSEFUU09FVkVSIFJFU1VMVElORyBGUk9NXHJcbkxPU1MgT0YgVVNFLCBEQVRBIE9SIFBST0ZJVFMsIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBORUdMSUdFTkNFIE9SXHJcbk9USEVSIFRPUlRJT1VTIEFDVElPTiwgQVJJU0lORyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBVU0UgT1JcclxuUEVSRk9STUFOQ0UgT0YgVEhJUyBTT0ZUV0FSRS5cclxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi9cclxuLyogZ2xvYmFsIFJlZmxlY3QsIFByb21pc2UsIFN1cHByZXNzZWRFcnJvciwgU3ltYm9sLCBJdGVyYXRvciAqL1xyXG5cclxudmFyIGV4dGVuZFN0YXRpY3MgPSBmdW5jdGlvbihkLCBiKSB7XHJcbiAgICBleHRlbmRTdGF0aWNzID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8XHJcbiAgICAgICAgKHsgX19wcm90b19fOiBbXSB9IGluc3RhbmNlb2YgQXJyYXkgJiYgZnVuY3Rpb24gKGQsIGIpIHsgZC5fX3Byb3RvX18gPSBiOyB9KSB8fFxyXG4gICAgICAgIGZ1bmN0aW9uIChkLCBiKSB7IGZvciAodmFyIHAgaW4gYikgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChiLCBwKSkgZFtwXSA9IGJbcF07IH07XHJcbiAgICByZXR1cm4gZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2V4dGVuZHMoZCwgYikge1xyXG4gICAgaWYgKHR5cGVvZiBiICE9PSBcImZ1bmN0aW9uXCIgJiYgYiAhPT0gbnVsbClcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2xhc3MgZXh0ZW5kcyB2YWx1ZSBcIiArIFN0cmluZyhiKSArIFwiIGlzIG5vdCBhIGNvbnN0cnVjdG9yIG9yIG51bGxcIik7XHJcbiAgICBleHRlbmRTdGF0aWNzKGQsIGIpO1xyXG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XHJcbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19hc3NpZ24gPSBmdW5jdGlvbigpIHtcclxuICAgIF9fYXNzaWduID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiBfX2Fzc2lnbih0KSB7XHJcbiAgICAgICAgZm9yICh2YXIgcywgaSA9IDEsIG4gPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XHJcbiAgICAgICAgICAgIHMgPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSkgdFtwXSA9IHNbcF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIF9fYXNzaWduLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3Jlc3QocywgZSkge1xyXG4gICAgdmFyIHQgPSB7fTtcclxuICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSAmJiBlLmluZGV4T2YocCkgPCAwKVxyXG4gICAgICAgIHRbcF0gPSBzW3BdO1xyXG4gICAgaWYgKHMgIT0gbnVsbCAmJiB0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyA9PT0gXCJmdW5jdGlvblwiKVxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBwID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhzKTsgaSA8IHAubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKGUuaW5kZXhPZihwW2ldKSA8IDAgJiYgT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZS5jYWxsKHMsIHBbaV0pKVxyXG4gICAgICAgICAgICAgICAgdFtwW2ldXSA9IHNbcFtpXV07XHJcbiAgICAgICAgfVxyXG4gICAgcmV0dXJuIHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2RlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19wYXJhbShwYXJhbUluZGV4LCBkZWNvcmF0b3IpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHsgZGVjb3JhdG9yKHRhcmdldCwga2V5LCBwYXJhbUluZGV4KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19lc0RlY29yYXRlKGN0b3IsIGRlc2NyaXB0b3JJbiwgZGVjb3JhdG9ycywgY29udGV4dEluLCBpbml0aWFsaXplcnMsIGV4dHJhSW5pdGlhbGl6ZXJzKSB7XHJcbiAgICBmdW5jdGlvbiBhY2NlcHQoZikgeyBpZiAoZiAhPT0gdm9pZCAwICYmIHR5cGVvZiBmICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJGdW5jdGlvbiBleHBlY3RlZFwiKTsgcmV0dXJuIGY7IH1cclxuICAgIHZhciBraW5kID0gY29udGV4dEluLmtpbmQsIGtleSA9IGtpbmQgPT09IFwiZ2V0dGVyXCIgPyBcImdldFwiIDoga2luZCA9PT0gXCJzZXR0ZXJcIiA/IFwic2V0XCIgOiBcInZhbHVlXCI7XHJcbiAgICB2YXIgdGFyZ2V0ID0gIWRlc2NyaXB0b3JJbiAmJiBjdG9yID8gY29udGV4dEluW1wic3RhdGljXCJdID8gY3RvciA6IGN0b3IucHJvdG90eXBlIDogbnVsbDtcclxuICAgIHZhciBkZXNjcmlwdG9yID0gZGVzY3JpcHRvckluIHx8ICh0YXJnZXQgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgY29udGV4dEluLm5hbWUpIDoge30pO1xyXG4gICAgdmFyIF8sIGRvbmUgPSBmYWxzZTtcclxuICAgIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICAgICAgdmFyIGNvbnRleHQgPSB7fTtcclxuICAgICAgICBmb3IgKHZhciBwIGluIGNvbnRleHRJbikgY29udGV4dFtwXSA9IHAgPT09IFwiYWNjZXNzXCIgPyB7fSA6IGNvbnRleHRJbltwXTtcclxuICAgICAgICBmb3IgKHZhciBwIGluIGNvbnRleHRJbi5hY2Nlc3MpIGNvbnRleHQuYWNjZXNzW3BdID0gY29udGV4dEluLmFjY2Vzc1twXTtcclxuICAgICAgICBjb250ZXh0LmFkZEluaXRpYWxpemVyID0gZnVuY3Rpb24gKGYpIHsgaWYgKGRvbmUpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgYWRkIGluaXRpYWxpemVycyBhZnRlciBkZWNvcmF0aW9uIGhhcyBjb21wbGV0ZWRcIik7IGV4dHJhSW5pdGlhbGl6ZXJzLnB1c2goYWNjZXB0KGYgfHwgbnVsbCkpOyB9O1xyXG4gICAgICAgIHZhciByZXN1bHQgPSAoMCwgZGVjb3JhdG9yc1tpXSkoa2luZCA9PT0gXCJhY2Nlc3NvclwiID8geyBnZXQ6IGRlc2NyaXB0b3IuZ2V0LCBzZXQ6IGRlc2NyaXB0b3Iuc2V0IH0gOiBkZXNjcmlwdG9yW2tleV0sIGNvbnRleHQpO1xyXG4gICAgICAgIGlmIChraW5kID09PSBcImFjY2Vzc29yXCIpIHtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gdm9pZCAwKSBjb250aW51ZTtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gbnVsbCB8fCB0eXBlb2YgcmVzdWx0ICE9PSBcIm9iamVjdFwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IGV4cGVjdGVkXCIpO1xyXG4gICAgICAgICAgICBpZiAoXyA9IGFjY2VwdChyZXN1bHQuZ2V0KSkgZGVzY3JpcHRvci5nZXQgPSBfO1xyXG4gICAgICAgICAgICBpZiAoXyA9IGFjY2VwdChyZXN1bHQuc2V0KSkgZGVzY3JpcHRvci5zZXQgPSBfO1xyXG4gICAgICAgICAgICBpZiAoXyA9IGFjY2VwdChyZXN1bHQuaW5pdCkpIGluaXRpYWxpemVycy51bnNoaWZ0KF8pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChfID0gYWNjZXB0KHJlc3VsdCkpIHtcclxuICAgICAgICAgICAgaWYgKGtpbmQgPT09IFwiZmllbGRcIikgaW5pdGlhbGl6ZXJzLnVuc2hpZnQoXyk7XHJcbiAgICAgICAgICAgIGVsc2UgZGVzY3JpcHRvcltrZXldID0gXztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAodGFyZ2V0KSBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBjb250ZXh0SW4ubmFtZSwgZGVzY3JpcHRvcik7XHJcbiAgICBkb25lID0gdHJ1ZTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3J1bkluaXRpYWxpemVycyh0aGlzQXJnLCBpbml0aWFsaXplcnMsIHZhbHVlKSB7XHJcbiAgICB2YXIgdXNlVmFsdWUgPSBhcmd1bWVudHMubGVuZ3RoID4gMjtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW5pdGlhbGl6ZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFsdWUgPSB1c2VWYWx1ZSA/IGluaXRpYWxpemVyc1tpXS5jYWxsKHRoaXNBcmcsIHZhbHVlKSA6IGluaXRpYWxpemVyc1tpXS5jYWxsKHRoaXNBcmcpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHVzZVZhbHVlID8gdmFsdWUgOiB2b2lkIDA7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19wcm9wS2V5KHgpIHtcclxuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gXCJzeW1ib2xcIiA/IHggOiBcIlwiLmNvbmNhdCh4KTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NldEZ1bmN0aW9uTmFtZShmLCBuYW1lLCBwcmVmaXgpIHtcclxuICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gXCJzeW1ib2xcIikgbmFtZSA9IG5hbWUuZGVzY3JpcHRpb24gPyBcIltcIi5jb25jYXQobmFtZS5kZXNjcmlwdGlvbiwgXCJdXCIpIDogXCJcIjtcclxuICAgIHJldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkoZiwgXCJuYW1lXCIsIHsgY29uZmlndXJhYmxlOiB0cnVlLCB2YWx1ZTogcHJlZml4ID8gXCJcIi5jb25jYXQocHJlZml4LCBcIiBcIiwgbmFtZSkgOiBuYW1lIH0pO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fbWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpIHtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5tZXRhZGF0YSA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4gUmVmbGVjdC5tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0ZXIodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19nZW5lcmF0b3IodGhpc0FyZywgYm9keSkge1xyXG4gICAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZyA9IE9iamVjdC5jcmVhdGUoKHR5cGVvZiBJdGVyYXRvciA9PT0gXCJmdW5jdGlvblwiID8gSXRlcmF0b3IgOiBPYmplY3QpLnByb3RvdHlwZSk7XHJcbiAgICByZXR1cm4gZy5uZXh0ID0gdmVyYigwKSwgZ1tcInRocm93XCJdID0gdmVyYigxKSwgZ1tcInJldHVyblwiXSA9IHZlcmIoMiksIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiAoZ1tTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9KSwgZztcclxuICAgIGZ1bmN0aW9uIHZlcmIobikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHN0ZXAoW24sIHZdKTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc3RlcChvcCkge1xyXG4gICAgICAgIGlmIChmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiR2VuZXJhdG9yIGlzIGFscmVhZHkgZXhlY3V0aW5nLlwiKTtcclxuICAgICAgICB3aGlsZSAoZyAmJiAoZyA9IDAsIG9wWzBdICYmIChfID0gMCkpLCBfKSB0cnkge1xyXG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XHJcbiAgICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcclxuICAgICAgICAgICAgc3dpdGNoIChvcFswXSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xyXG4gICAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XHJcbiAgICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19jcmVhdGVCaW5kaW5nID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIHZhciBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihtLCBrKTtcclxuICAgIGlmICghZGVzYyB8fCAoXCJnZXRcIiBpbiBkZXNjID8gIW0uX19lc01vZHVsZSA6IGRlc2Mud3JpdGFibGUgfHwgZGVzYy5jb25maWd1cmFibGUpKSB7XHJcbiAgICAgICAgZGVzYyA9IHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG1ba107IH0gfTtcclxuICAgIH1cclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgZGVzYyk7XHJcbn0pIDogKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XHJcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xyXG4gICAgb1trMl0gPSBtW2tdO1xyXG59KTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2V4cG9ydFN0YXIobSwgbykge1xyXG4gICAgZm9yICh2YXIgcCBpbiBtKSBpZiAocCAhPT0gXCJkZWZhdWx0XCIgJiYgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvLCBwKSkgX19jcmVhdGVCaW5kaW5nKG8sIG0sIHApO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX192YWx1ZXMobykge1xyXG4gICAgdmFyIHMgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgU3ltYm9sLml0ZXJhdG9yLCBtID0gcyAmJiBvW3NdLCBpID0gMDtcclxuICAgIGlmIChtKSByZXR1cm4gbS5jYWxsKG8pO1xyXG4gICAgaWYgKG8gJiYgdHlwZW9mIG8ubGVuZ3RoID09PSBcIm51bWJlclwiKSByZXR1cm4ge1xyXG4gICAgICAgIG5leHQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKG8gJiYgaSA+PSBvLmxlbmd0aCkgbyA9IHZvaWQgMDtcclxuICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IG8gJiYgb1tpKytdLCBkb25lOiAhbyB9O1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKHMgPyBcIk9iamVjdCBpcyBub3QgaXRlcmFibGUuXCIgOiBcIlN5bWJvbC5pdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3JlYWQobywgbikge1xyXG4gICAgdmFyIG0gPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb1tTeW1ib2wuaXRlcmF0b3JdO1xyXG4gICAgaWYgKCFtKSByZXR1cm4gbztcclxuICAgIHZhciBpID0gbS5jYWxsKG8pLCByLCBhciA9IFtdLCBlO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICB3aGlsZSAoKG4gPT09IHZvaWQgMCB8fCBuLS0gPiAwKSAmJiAhKHIgPSBpLm5leHQoKSkuZG9uZSkgYXIucHVzaChyLnZhbHVlKTtcclxuICAgIH1cclxuICAgIGNhdGNoIChlcnJvcikgeyBlID0geyBlcnJvcjogZXJyb3IgfTsgfVxyXG4gICAgZmluYWxseSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKHIgJiYgIXIuZG9uZSAmJiAobSA9IGlbXCJyZXR1cm5cIl0pKSBtLmNhbGwoaSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZpbmFsbHkgeyBpZiAoZSkgdGhyb3cgZS5lcnJvcjsgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGFyO1xyXG59XHJcblxyXG4vKiogQGRlcHJlY2F0ZWQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkKCkge1xyXG4gICAgZm9yICh2YXIgYXIgPSBbXSwgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspXHJcbiAgICAgICAgYXIgPSBhci5jb25jYXQoX19yZWFkKGFyZ3VtZW50c1tpXSkpO1xyXG4gICAgcmV0dXJuIGFyO1xyXG59XHJcblxyXG4vKiogQGRlcHJlY2F0ZWQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkQXJyYXlzKCkge1xyXG4gICAgZm9yICh2YXIgcyA9IDAsIGkgPSAwLCBpbCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBpbDsgaSsrKSBzICs9IGFyZ3VtZW50c1tpXS5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciByID0gQXJyYXkocyksIGsgPSAwLCBpID0gMDsgaSA8IGlsOyBpKyspXHJcbiAgICAgICAgZm9yICh2YXIgYSA9IGFyZ3VtZW50c1tpXSwgaiA9IDAsIGpsID0gYS5sZW5ndGg7IGogPCBqbDsgaisrLCBrKyspXHJcbiAgICAgICAgICAgIHJba10gPSBhW2pdO1xyXG4gICAgcmV0dXJuIHI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZEFycmF5KHRvLCBmcm9tLCBwYWNrKSB7XHJcbiAgICBpZiAocGFjayB8fCBhcmd1bWVudHMubGVuZ3RoID09PSAyKSBmb3IgKHZhciBpID0gMCwgbCA9IGZyb20ubGVuZ3RoLCBhcjsgaSA8IGw7IGkrKykge1xyXG4gICAgICAgIGlmIChhciB8fCAhKGkgaW4gZnJvbSkpIHtcclxuICAgICAgICAgICAgaWYgKCFhcikgYXIgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChmcm9tLCAwLCBpKTtcclxuICAgICAgICAgICAgYXJbaV0gPSBmcm9tW2ldO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiB0by5jb25jYXQoYXIgfHwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZnJvbSkpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdCh2KSB7XHJcbiAgICByZXR1cm4gdGhpcyBpbnN0YW5jZW9mIF9fYXdhaXQgPyAodGhpcy52ID0gdiwgdGhpcykgOiBuZXcgX19hd2FpdCh2KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNHZW5lcmF0b3IodGhpc0FyZywgX2FyZ3VtZW50cywgZ2VuZXJhdG9yKSB7XHJcbiAgICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgdmFyIGcgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSksIGksIHEgPSBbXTtcclxuICAgIHJldHVybiBpID0gT2JqZWN0LmNyZWF0ZSgodHlwZW9mIEFzeW5jSXRlcmF0b3IgPT09IFwiZnVuY3Rpb25cIiA/IEFzeW5jSXRlcmF0b3IgOiBPYmplY3QpLnByb3RvdHlwZSksIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiwgYXdhaXRSZXR1cm4pLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICBmdW5jdGlvbiBhd2FpdFJldHVybihmKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHYpLnRoZW4oZiwgcmVqZWN0KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gdmVyYihuLCBmKSB7IGlmIChnW25dKSB7IGlbbl0gPSBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKGEsIGIpIHsgcS5wdXNoKFtuLCB2LCBhLCBiXSkgPiAxIHx8IHJlc3VtZShuLCB2KTsgfSk7IH07IGlmIChmKSBpW25dID0gZihpW25dKTsgfSB9XHJcbiAgICBmdW5jdGlvbiByZXN1bWUobiwgdikgeyB0cnkgeyBzdGVwKGdbbl0odikpOyB9IGNhdGNoIChlKSB7IHNldHRsZShxWzBdWzNdLCBlKTsgfSB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKHIpIHsgci52YWx1ZSBpbnN0YW5jZW9mIF9fYXdhaXQgPyBQcm9taXNlLnJlc29sdmUoci52YWx1ZS52KS50aGVuKGZ1bGZpbGwsIHJlamVjdCkgOiBzZXR0bGUocVswXVsyXSwgcik7IH1cclxuICAgIGZ1bmN0aW9uIGZ1bGZpbGwodmFsdWUpIHsgcmVzdW1lKFwibmV4dFwiLCB2YWx1ZSk7IH1cclxuICAgIGZ1bmN0aW9uIHJlamVjdCh2YWx1ZSkgeyByZXN1bWUoXCJ0aHJvd1wiLCB2YWx1ZSk7IH1cclxuICAgIGZ1bmN0aW9uIHNldHRsZShmLCB2KSB7IGlmIChmKHYpLCBxLnNoaWZ0KCksIHEubGVuZ3RoKSByZXN1bWUocVswXVswXSwgcVswXVsxXSk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNEZWxlZ2F0b3Iobykge1xyXG4gICAgdmFyIGksIHA7XHJcbiAgICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIsIGZ1bmN0aW9uIChlKSB7IHRocm93IGU7IH0pLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuLCBmKSB7IGlbbl0gPSBvW25dID8gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIChwID0gIXApID8geyB2YWx1ZTogX19hd2FpdChvW25dKHYpKSwgZG9uZTogZmFsc2UgfSA6IGYgPyBmKHYpIDogdjsgfSA6IGY7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNWYWx1ZXMobykge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBtID0gb1tTeW1ib2wuYXN5bmNJdGVyYXRvcl0sIGk7XHJcbiAgICByZXR1cm4gbSA/IG0uY2FsbChvKSA6IChvID0gdHlwZW9mIF9fdmFsdWVzID09PSBcImZ1bmN0aW9uXCIgPyBfX3ZhbHVlcyhvKSA6IG9bU3ltYm9sLml0ZXJhdG9yXSgpLCBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaSk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgaVtuXSA9IG9bbl0gJiYgZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHsgdiA9IG9bbl0odiksIHNldHRsZShyZXNvbHZlLCByZWplY3QsIHYuZG9uZSwgdi52YWx1ZSk7IH0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCBkLCB2KSB7IFByb21pc2UucmVzb2x2ZSh2KS50aGVuKGZ1bmN0aW9uKHYpIHsgcmVzb2x2ZSh7IHZhbHVlOiB2LCBkb25lOiBkIH0pOyB9LCByZWplY3QpOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX21ha2VUZW1wbGF0ZU9iamVjdChjb29rZWQsIHJhdykge1xyXG4gICAgaWYgKE9iamVjdC5kZWZpbmVQcm9wZXJ0eSkgeyBPYmplY3QuZGVmaW5lUHJvcGVydHkoY29va2VkLCBcInJhd1wiLCB7IHZhbHVlOiByYXcgfSk7IH0gZWxzZSB7IGNvb2tlZC5yYXcgPSByYXc7IH1cclxuICAgIHJldHVybiBjb29rZWQ7XHJcbn07XHJcblxyXG52YXIgX19zZXRNb2R1bGVEZWZhdWx0ID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgXCJkZWZhdWx0XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHYgfSk7XHJcbn0pIDogZnVuY3Rpb24obywgdikge1xyXG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xyXG59O1xyXG5cclxudmFyIG93bktleXMgPSBmdW5jdGlvbihvKSB7XHJcbiAgICBvd25LZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMgfHwgZnVuY3Rpb24gKG8pIHtcclxuICAgICAgICB2YXIgYXIgPSBbXTtcclxuICAgICAgICBmb3IgKHZhciBrIGluIG8pIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobywgaykpIGFyW2FyLmxlbmd0aF0gPSBrO1xyXG4gICAgICAgIHJldHVybiBhcjtcclxuICAgIH07XHJcbiAgICByZXR1cm4gb3duS2V5cyhvKTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydFN0YXIobW9kKSB7XHJcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrID0gb3duS2V5cyhtb2QpLCBpID0gMDsgaSA8IGsubGVuZ3RoOyBpKyspIGlmIChrW2ldICE9PSBcImRlZmF1bHRcIikgX19jcmVhdGVCaW5kaW5nKHJlc3VsdCwgbW9kLCBrW2ldKTtcclxuICAgIF9fc2V0TW9kdWxlRGVmYXVsdChyZXN1bHQsIG1vZCk7XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19pbXBvcnREZWZhdWx0KG1vZCkge1xyXG4gICAgcmV0dXJuIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpID8gbW9kIDogeyBkZWZhdWx0OiBtb2QgfTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRHZXQocmVjZWl2ZXIsIHN0YXRlLCBraW5kLCBmKSB7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJhXCIgJiYgIWYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIGFjY2Vzc29yIHdhcyBkZWZpbmVkIHdpdGhvdXQgYSBnZXR0ZXJcIik7XHJcbiAgICBpZiAodHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciAhPT0gc3RhdGUgfHwgIWYgOiAhc3RhdGUuaGFzKHJlY2VpdmVyKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCByZWFkIHByaXZhdGUgbWVtYmVyIGZyb20gYW4gb2JqZWN0IHdob3NlIGNsYXNzIGRpZCBub3QgZGVjbGFyZSBpdFwiKTtcclxuICAgIHJldHVybiBraW5kID09PSBcIm1cIiA/IGYgOiBraW5kID09PSBcImFcIiA/IGYuY2FsbChyZWNlaXZlcikgOiBmID8gZi52YWx1ZSA6IHN0YXRlLmdldChyZWNlaXZlcik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0KHJlY2VpdmVyLCBzdGF0ZSwgdmFsdWUsIGtpbmQsIGYpIHtcclxuICAgIGlmIChraW5kID09PSBcIm1cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByaXZhdGUgbWV0aG9kIGlzIG5vdCB3cml0YWJsZVwiKTtcclxuICAgIGlmIChraW5kID09PSBcImFcIiAmJiAhZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByaXZhdGUgYWNjZXNzb3Igd2FzIGRlZmluZWQgd2l0aG91dCBhIHNldHRlclwiKTtcclxuICAgIGlmICh0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyICE9PSBzdGF0ZSB8fCAhZiA6ICFzdGF0ZS5oYXMocmVjZWl2ZXIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHdyaXRlIHByaXZhdGUgbWVtYmVyIHRvIGFuIG9iamVjdCB3aG9zZSBjbGFzcyBkaWQgbm90IGRlY2xhcmUgaXRcIik7XHJcbiAgICByZXR1cm4gKGtpbmQgPT09IFwiYVwiID8gZi5jYWxsKHJlY2VpdmVyLCB2YWx1ZSkgOiBmID8gZi52YWx1ZSA9IHZhbHVlIDogc3RhdGUuc2V0KHJlY2VpdmVyLCB2YWx1ZSkpLCB2YWx1ZTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRJbihzdGF0ZSwgcmVjZWl2ZXIpIHtcclxuICAgIGlmIChyZWNlaXZlciA9PT0gbnVsbCB8fCAodHlwZW9mIHJlY2VpdmVyICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiByZWNlaXZlciAhPT0gXCJmdW5jdGlvblwiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCB1c2UgJ2luJyBvcGVyYXRvciBvbiBub24tb2JqZWN0XCIpO1xyXG4gICAgcmV0dXJuIHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgPT09IHN0YXRlIDogc3RhdGUuaGFzKHJlY2VpdmVyKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYWRkRGlzcG9zYWJsZVJlc291cmNlKGVudiwgdmFsdWUsIGFzeW5jKSB7XHJcbiAgICBpZiAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHZvaWQgMCkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHZhbHVlICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJPYmplY3QgZXhwZWN0ZWQuXCIpO1xyXG4gICAgICAgIHZhciBkaXNwb3NlLCBpbm5lcjtcclxuICAgICAgICBpZiAoYXN5bmMpIHtcclxuICAgICAgICAgICAgaWYgKCFTeW1ib2wuYXN5bmNEaXNwb3NlKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jRGlzcG9zZSBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICAgICAgICAgIGRpc3Bvc2UgPSB2YWx1ZVtTeW1ib2wuYXN5bmNEaXNwb3NlXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGRpc3Bvc2UgPT09IHZvaWQgMCkge1xyXG4gICAgICAgICAgICBpZiAoIVN5bWJvbC5kaXNwb3NlKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmRpc3Bvc2UgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgICAgICAgICBkaXNwb3NlID0gdmFsdWVbU3ltYm9sLmRpc3Bvc2VdO1xyXG4gICAgICAgICAgICBpZiAoYXN5bmMpIGlubmVyID0gZGlzcG9zZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHR5cGVvZiBkaXNwb3NlICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJPYmplY3Qgbm90IGRpc3Bvc2FibGUuXCIpO1xyXG4gICAgICAgIGlmIChpbm5lcikgZGlzcG9zZSA9IGZ1bmN0aW9uKCkgeyB0cnkgeyBpbm5lci5jYWxsKHRoaXMpOyB9IGNhdGNoIChlKSB7IHJldHVybiBQcm9taXNlLnJlamVjdChlKTsgfSB9O1xyXG4gICAgICAgIGVudi5zdGFjay5wdXNoKHsgdmFsdWU6IHZhbHVlLCBkaXNwb3NlOiBkaXNwb3NlLCBhc3luYzogYXN5bmMgfSk7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChhc3luYykge1xyXG4gICAgICAgIGVudi5zdGFjay5wdXNoKHsgYXN5bmM6IHRydWUgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcblxyXG59XHJcblxyXG52YXIgX1N1cHByZXNzZWRFcnJvciA9IHR5cGVvZiBTdXBwcmVzc2VkRXJyb3IgPT09IFwiZnVuY3Rpb25cIiA/IFN1cHByZXNzZWRFcnJvciA6IGZ1bmN0aW9uIChlcnJvciwgc3VwcHJlc3NlZCwgbWVzc2FnZSkge1xyXG4gICAgdmFyIGUgPSBuZXcgRXJyb3IobWVzc2FnZSk7XHJcbiAgICByZXR1cm4gZS5uYW1lID0gXCJTdXBwcmVzc2VkRXJyb3JcIiwgZS5lcnJvciA9IGVycm9yLCBlLnN1cHByZXNzZWQgPSBzdXBwcmVzc2VkLCBlO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZGlzcG9zZVJlc291cmNlcyhlbnYpIHtcclxuICAgIGZ1bmN0aW9uIGZhaWwoZSkge1xyXG4gICAgICAgIGVudi5lcnJvciA9IGVudi5oYXNFcnJvciA/IG5ldyBfU3VwcHJlc3NlZEVycm9yKGUsIGVudi5lcnJvciwgXCJBbiBlcnJvciB3YXMgc3VwcHJlc3NlZCBkdXJpbmcgZGlzcG9zYWwuXCIpIDogZTtcclxuICAgICAgICBlbnYuaGFzRXJyb3IgPSB0cnVlO1xyXG4gICAgfVxyXG4gICAgdmFyIHIsIHMgPSAwO1xyXG4gICAgZnVuY3Rpb24gbmV4dCgpIHtcclxuICAgICAgICB3aGlsZSAociA9IGVudi5zdGFjay5wb3AoKSkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyLmFzeW5jICYmIHMgPT09IDEpIHJldHVybiBzID0gMCwgZW52LnN0YWNrLnB1c2gociksIFByb21pc2UucmVzb2x2ZSgpLnRoZW4obmV4dCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoci5kaXNwb3NlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHIuZGlzcG9zZS5jYWxsKHIudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyLmFzeW5jKSByZXR1cm4gcyB8PSAyLCBQcm9taXNlLnJlc29sdmUocmVzdWx0KS50aGVuKG5leHQsIGZ1bmN0aW9uKGUpIHsgZmFpbChlKTsgcmV0dXJuIG5leHQoKTsgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHMgfD0gMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgZmFpbChlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAocyA9PT0gMSkgcmV0dXJuIGVudi5oYXNFcnJvciA/IFByb21pc2UucmVqZWN0KGVudi5lcnJvcikgOiBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgICAgICBpZiAoZW52Lmhhc0Vycm9yKSB0aHJvdyBlbnYuZXJyb3I7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbmV4dCgpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXdyaXRlUmVsYXRpdmVJbXBvcnRFeHRlbnNpb24ocGF0aCwgcHJlc2VydmVKc3gpIHtcclxuICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gXCJzdHJpbmdcIiAmJiAvXlxcLlxcLj9cXC8vLnRlc3QocGF0aCkpIHtcclxuICAgICAgICByZXR1cm4gcGF0aC5yZXBsYWNlKC9cXC4odHN4KSR8KCg/OlxcLmQpPykoKD86XFwuW14uL10rPyk/KVxcLihbY21dPyl0cyQvaSwgZnVuY3Rpb24gKG0sIHRzeCwgZCwgZXh0LCBjbSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHN4ID8gcHJlc2VydmVKc3ggPyBcIi5qc3hcIiA6IFwiLmpzXCIgOiBkICYmICghZXh0IHx8ICFjbSkgPyBtIDogKGQgKyBleHQgKyBcIi5cIiArIGNtLnRvTG93ZXJDYXNlKCkgKyBcImpzXCIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHBhdGg7XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IHtcclxuICAgIF9fZXh0ZW5kczogX19leHRlbmRzLFxyXG4gICAgX19hc3NpZ246IF9fYXNzaWduLFxyXG4gICAgX19yZXN0OiBfX3Jlc3QsXHJcbiAgICBfX2RlY29yYXRlOiBfX2RlY29yYXRlLFxyXG4gICAgX19wYXJhbTogX19wYXJhbSxcclxuICAgIF9fZXNEZWNvcmF0ZTogX19lc0RlY29yYXRlLFxyXG4gICAgX19ydW5Jbml0aWFsaXplcnM6IF9fcnVuSW5pdGlhbGl6ZXJzLFxyXG4gICAgX19wcm9wS2V5OiBfX3Byb3BLZXksXHJcbiAgICBfX3NldEZ1bmN0aW9uTmFtZTogX19zZXRGdW5jdGlvbk5hbWUsXHJcbiAgICBfX21ldGFkYXRhOiBfX21ldGFkYXRhLFxyXG4gICAgX19hd2FpdGVyOiBfX2F3YWl0ZXIsXHJcbiAgICBfX2dlbmVyYXRvcjogX19nZW5lcmF0b3IsXHJcbiAgICBfX2NyZWF0ZUJpbmRpbmc6IF9fY3JlYXRlQmluZGluZyxcclxuICAgIF9fZXhwb3J0U3RhcjogX19leHBvcnRTdGFyLFxyXG4gICAgX192YWx1ZXM6IF9fdmFsdWVzLFxyXG4gICAgX19yZWFkOiBfX3JlYWQsXHJcbiAgICBfX3NwcmVhZDogX19zcHJlYWQsXHJcbiAgICBfX3NwcmVhZEFycmF5czogX19zcHJlYWRBcnJheXMsXHJcbiAgICBfX3NwcmVhZEFycmF5OiBfX3NwcmVhZEFycmF5LFxyXG4gICAgX19hd2FpdDogX19hd2FpdCxcclxuICAgIF9fYXN5bmNHZW5lcmF0b3I6IF9fYXN5bmNHZW5lcmF0b3IsXHJcbiAgICBfX2FzeW5jRGVsZWdhdG9yOiBfX2FzeW5jRGVsZWdhdG9yLFxyXG4gICAgX19hc3luY1ZhbHVlczogX19hc3luY1ZhbHVlcyxcclxuICAgIF9fbWFrZVRlbXBsYXRlT2JqZWN0OiBfX21ha2VUZW1wbGF0ZU9iamVjdCxcclxuICAgIF9faW1wb3J0U3RhcjogX19pbXBvcnRTdGFyLFxyXG4gICAgX19pbXBvcnREZWZhdWx0OiBfX2ltcG9ydERlZmF1bHQsXHJcbiAgICBfX2NsYXNzUHJpdmF0ZUZpZWxkR2V0OiBfX2NsYXNzUHJpdmF0ZUZpZWxkR2V0LFxyXG4gICAgX19jbGFzc1ByaXZhdGVGaWVsZFNldDogX19jbGFzc1ByaXZhdGVGaWVsZFNldCxcclxuICAgIF9fY2xhc3NQcml2YXRlRmllbGRJbjogX19jbGFzc1ByaXZhdGVGaWVsZEluLFxyXG4gICAgX19hZGREaXNwb3NhYmxlUmVzb3VyY2U6IF9fYWRkRGlzcG9zYWJsZVJlc291cmNlLFxyXG4gICAgX19kaXNwb3NlUmVzb3VyY2VzOiBfX2Rpc3Bvc2VSZXNvdXJjZXMsXHJcbiAgICBfX3Jld3JpdGVSZWxhdGl2ZUltcG9ydEV4dGVuc2lvbjogX19yZXdyaXRlUmVsYXRpdmVJbXBvcnRFeHRlbnNpb24sXHJcbn07XHJcbiIsImltcG9ydCB7IE5vdGljZSB9IGZyb20gJ29ic2lkaWFuJztcblxuLy8gRVZFTlQgQlVTIFNZU1RFTVxuZXhwb3J0IGNsYXNzIFRpbnlFbWl0dGVyIHtcbiAgICBwcml2YXRlIGxpc3RlbmVyczogeyBba2V5OiBzdHJpbmddOiBGdW5jdGlvbltdIH0gPSB7fTtcblxuICAgIG9uKGV2ZW50OiBzdHJpbmcsIGZuOiBGdW5jdGlvbikge1xuICAgICAgICAodGhpcy5saXN0ZW5lcnNbZXZlbnRdID0gdGhpcy5saXN0ZW5lcnNbZXZlbnRdIHx8IFtdKS5wdXNoKGZuKTtcbiAgICB9XG5cbiAgICBvZmYoZXZlbnQ6IHN0cmluZywgZm46IEZ1bmN0aW9uKSB7XG4gICAgICAgIGlmICghdGhpcy5saXN0ZW5lcnNbZXZlbnRdKSByZXR1cm47XG4gICAgICAgIHRoaXMubGlzdGVuZXJzW2V2ZW50XSA9IHRoaXMubGlzdGVuZXJzW2V2ZW50XS5maWx0ZXIoZiA9PiBmICE9PSBmbik7XG4gICAgfVxuXG4gICAgdHJpZ2dlcihldmVudDogc3RyaW5nLCBkYXRhPzogYW55KSB7XG4gICAgICAgICh0aGlzLmxpc3RlbmVyc1tldmVudF0gfHwgW10pLmZvckVhY2goZm4gPT4gZm4oZGF0YSkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEF1ZGlvQ29udHJvbGxlciB7XG4gICAgYXVkaW9DdHg6IEF1ZGlvQ29udGV4dCB8IG51bGwgPSBudWxsO1xuICAgIGJyb3duTm9pc2VOb2RlOiBTY3JpcHRQcm9jZXNzb3JOb2RlIHwgbnVsbCA9IG51bGw7XG4gICAgbXV0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAgIGNvbnN0cnVjdG9yKG11dGVkOiBib29sZWFuKSB7IHRoaXMubXV0ZWQgPSBtdXRlZDsgfVxuXG4gICAgc2V0TXV0ZWQobXV0ZWQ6IGJvb2xlYW4pIHsgdGhpcy5tdXRlZCA9IG11dGVkOyB9XG5cbiAgICBpbml0QXVkaW8oKSB7IGlmICghdGhpcy5hdWRpb0N0eCkgdGhpcy5hdWRpb0N0eCA9IG5ldyAod2luZG93LkF1ZGlvQ29udGV4dCB8fCAod2luZG93IGFzIGFueSkud2Via2l0QXVkaW9Db250ZXh0KSgpOyB9XG5cbiAgICBwbGF5VG9uZShmcmVxOiBudW1iZXIsIHR5cGU6IE9zY2lsbGF0b3JUeXBlLCBkdXJhdGlvbjogbnVtYmVyLCB2b2w6IG51bWJlciA9IDAuMSkge1xuICAgICAgICBpZiAodGhpcy5tdXRlZCkgcmV0dXJuO1xuICAgICAgICB0aGlzLmluaXRBdWRpbygpO1xuICAgICAgICBjb25zdCBvc2MgPSB0aGlzLmF1ZGlvQ3R4IS5jcmVhdGVPc2NpbGxhdG9yKCk7XG4gICAgICAgIGNvbnN0IGdhaW4gPSB0aGlzLmF1ZGlvQ3R4IS5jcmVhdGVHYWluKCk7XG4gICAgICAgIG9zYy50eXBlID0gdHlwZTtcbiAgICAgICAgb3NjLmZyZXF1ZW5jeS52YWx1ZSA9IGZyZXE7XG4gICAgICAgIG9zYy5jb25uZWN0KGdhaW4pO1xuICAgICAgICBnYWluLmNvbm5lY3QodGhpcy5hdWRpb0N0eCEuZGVzdGluYXRpb24pO1xuICAgICAgICBvc2Muc3RhcnQoKTtcbiAgICAgICAgZ2Fpbi5nYWluLnNldFZhbHVlQXRUaW1lKHZvbCwgdGhpcy5hdWRpb0N0eCEuY3VycmVudFRpbWUpO1xuICAgICAgICBnYWluLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSgwLjAwMDAxLCB0aGlzLmF1ZGlvQ3R4IS5jdXJyZW50VGltZSArIGR1cmF0aW9uKTtcbiAgICAgICAgb3NjLnN0b3AodGhpcy5hdWRpb0N0eCEuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG4gICAgfVxuXG4gICAgcGxheVNvdW5kKHR5cGU6IFwic3VjY2Vzc1wifFwiZmFpbFwifFwiZGVhdGhcInxcImNsaWNrXCJ8XCJoZWFydGJlYXRcInxcIm1lZGl0YXRlXCIpIHtcbiAgICAgICAgaWYgKHR5cGUgPT09IFwic3VjY2Vzc1wiKSB7IHRoaXMucGxheVRvbmUoNjAwLCBcInNpbmVcIiwgMC4xKTsgc2V0VGltZW91dCgoKSA9PiB0aGlzLnBsYXlUb25lKDgwMCwgXCJzaW5lXCIsIDAuMiksIDEwMCk7IH1cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gXCJmYWlsXCIpIHsgdGhpcy5wbGF5VG9uZSgxNTAsIFwic2F3dG9vdGhcIiwgMC40KTsgc2V0VGltZW91dCgoKSA9PiB0aGlzLnBsYXlUb25lKDEwMCwgXCJzYXd0b290aFwiLCAwLjQpLCAxNTApOyB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFwiZGVhdGhcIikgeyB0aGlzLnBsYXlUb25lKDUwLCBcInNxdWFyZVwiLCAxLjApOyB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFwiY2xpY2tcIikgeyB0aGlzLnBsYXlUb25lKDgwMCwgXCJzaW5lXCIsIDAuMDUpOyB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFwiaGVhcnRiZWF0XCIpIHsgdGhpcy5wbGF5VG9uZSg2MCwgXCJzaW5lXCIsIDAuMSwgMC41KTsgc2V0VGltZW91dCgoKT0+dGhpcy5wbGF5VG9uZSg1MCwgXCJzaW5lXCIsIDAuMSwgMC40KSwgMTUwKTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcIm1lZGl0YXRlXCIpIHsgdGhpcy5wbGF5VG9uZSg0MzIsIFwic2luZVwiLCAyLjAsIDAuMDUpOyB9XG4gICAgfVxuXG4gICAgdG9nZ2xlQnJvd25Ob2lzZSgpIHtcbiAgICAgICAgdGhpcy5pbml0QXVkaW8oKTtcbiAgICAgICAgaWYgKHRoaXMuYnJvd25Ob2lzZU5vZGUpIHsgXG4gICAgICAgICAgICB0aGlzLmJyb3duTm9pc2VOb2RlLmRpc2Nvbm5lY3QoKTsgXG4gICAgICAgICAgICB0aGlzLmJyb3duTm9pc2VOb2RlID0gbnVsbDsgXG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiRm9jdXMgQXVkaW86IE9GRlwiKTsgXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBidWZmZXJTaXplID0gNDA5NjsgXG4gICAgICAgICAgICB0aGlzLmJyb3duTm9pc2VOb2RlID0gdGhpcy5hdWRpb0N0eCEuY3JlYXRlU2NyaXB0UHJvY2Vzc29yKGJ1ZmZlclNpemUsIDEsIDEpO1xuICAgICAgICAgICAgbGV0IGxhc3RPdXQgPSAwO1xuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZS5vbmF1ZGlvcHJvY2VzcyA9IChlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3V0cHV0ID0gZS5vdXRwdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCk7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBidWZmZXJTaXplOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2hpdGUgPSBNYXRoLnJhbmRvbSgpICogMiAtIDE7IFxuICAgICAgICAgICAgICAgICAgICBvdXRwdXRbaV0gPSAobGFzdE91dCArICgwLjAyICogd2hpdGUpKSAvIDEuMDI7IFxuICAgICAgICAgICAgICAgICAgICBsYXN0T3V0ID0gb3V0cHV0W2ldOyBcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0W2ldICo9IDAuMTsgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMuYnJvd25Ob2lzZU5vZGUuY29ubmVjdCh0aGlzLmF1ZGlvQ3R4IS5kZXN0aW5hdGlvbik7XG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiRm9jdXMgQXVkaW86IE9OIChCcm93biBOb2lzZSlcIik7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgeyBBcHAsIE1vZGFsLCBTZXR0aW5nLCBOb3RpY2UsIG1vbWVudCwgVEZpbGUsIFRGb2xkZXIgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgU2lzeXBodXNQbHVnaW4gZnJvbSAnLi4vbWFpbic7IFxuaW1wb3J0IHsgTW9kaWZpZXIgfSBmcm9tICcuLi90eXBlcyc7XG5cbmV4cG9ydCBjbGFzcyBDaGFvc01vZGFsIGV4dGVuZHMgTW9kYWwgeyBcbiAgICBtb2RpZmllcjogTW9kaWZpZXI7IFxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBtOiBNb2RpZmllcikgeyBzdXBlcihhcHApOyB0aGlzLm1vZGlmaWVyPW07IH0gXG4gICAgb25PcGVuKCkgeyBcbiAgICAgICAgY29uc3QgYyA9IHRoaXMuY29udGVudEVsOyBcbiAgICAgICAgY29uc3QgaDEgPSBjLmNyZWF0ZUVsKFwiaDFcIiwgeyB0ZXh0OiBcIlRIRSBPTUVOXCIgfSk7IFxuICAgICAgICBoMS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwidGV4dC1hbGlnbjpjZW50ZXI7IGNvbG9yOiNmNTU7XCIpOyBcbiAgICAgICAgY29uc3QgaWMgPSBjLmNyZWF0ZUVsKFwiZGl2XCIsIHsgdGV4dDogdGhpcy5tb2RpZmllci5pY29uIH0pOyBcbiAgICAgICAgaWMuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcImZvbnQtc2l6ZTo4MHB4OyB0ZXh0LWFsaWduOmNlbnRlcjtcIik7IFxuICAgICAgICBjb25zdCBoMiA9IGMuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IHRoaXMubW9kaWZpZXIubmFtZSB9KTsgXG4gICAgICAgIGgyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJ0ZXh0LWFsaWduOmNlbnRlcjtcIik7IFxuICAgICAgICBjb25zdCBwID0gYy5jcmVhdGVFbChcInBcIiwge3RleHQ6IHRoaXMubW9kaWZpZXIuZGVzY30pOyBcbiAgICAgICAgcC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwidGV4dC1hbGlnbjpjZW50ZXJcIik7IFxuICAgICAgICBjb25zdCBiID0gYy5jcmVhdGVFbChcImJ1dHRvblwiLCB7dGV4dDpcIkFja25vd2xlZGdlXCJ9KTsgXG4gICAgICAgIGIuYWRkQ2xhc3MoXCJtb2QtY3RhXCIpOyBcbiAgICAgICAgYi5zdHlsZS5kaXNwbGF5PVwiYmxvY2tcIjsgXG4gICAgICAgIGIuc3R5bGUubWFyZ2luPVwiMjBweCBhdXRvXCI7IFxuICAgICAgICBiLm9uY2xpY2s9KCk9PnRoaXMuY2xvc2UoKTsgXG4gICAgfSBcbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9IFxufVxuXG5leHBvcnQgY2xhc3MgU2hvcE1vZGFsIGV4dGVuZHMgTW9kYWwgeyBcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luOyBcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikgeyBzdXBlcihhcHApOyB0aGlzLnBsdWdpbiA9IHBsdWdpbjsgfSBcbiAgXG4gIG9uT3BlbigpIHsgXG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzOyBcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIvCfm5IgQkxBQ0sgTUFSS0VUXCIgfSk7IFxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFB1cnNlOiDwn6qZICR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZH1gIH0pOyBcbiAgICAgICAgXG4gICAgICAgIC8vIDEuIFN0YW5kYXJkIEl0ZW1zXG4gICAgICAgIHRoaXMuaXRlbShjb250ZW50RWwsIFwi8J+SiSBTdGltcGFja1wiLCBcIkhlYWwgMjAgSFBcIiwgNTAsIGFzeW5jICgpID0+IHsgXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ocCA9IE1hdGgubWluKHRoaXMucGx1Z2luLnNldHRpbmdzLm1heEhwLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ocCArIDIwKTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgdGhpcy5pdGVtKGNvbnRlbnRFbCwgXCLwn5KjIFNhYm90YWdlXCIsIFwiLTUgUml2YWwgRG1nXCIsIDIwMCwgYXN5bmMgKCkgPT4geyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnJpdmFsRG1nID0gTWF0aC5tYXgoNSwgdGhpcy5wbHVnaW4uc2V0dGluZ3Mucml2YWxEbWcgLSA1KTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgdGhpcy5pdGVtKGNvbnRlbnRFbCwgXCLwn5uh77iPIFNoaWVsZFwiLCBcIjI0aCBQcm90ZWN0aW9uXCIsIDE1MCwgYXN5bmMgKCkgPT4geyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNoaWVsZGVkVW50aWwgPSBtb21lbnQoKS5hZGQoMjQsICdob3VycycpLnRvSVNPU3RyaW5nKCk7IFxuICAgICAgICB9KTsgXG4gICAgICAgIHRoaXMuaXRlbShjb250ZW50RWwsIFwi8J+YtCBSZXN0IERheVwiLCBcIlNhZmUgZm9yIDI0aFwiLCAxMDAsIGFzeW5jICgpID0+IHsgXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXN0RGF5VW50aWwgPSBtb21lbnQoKS5hZGQoMjQsICdob3VycycpLnRvSVNPU3RyaW5nKCk7IFxuICAgICAgICB9KTsgXG5cbiAgICAgICAgLy8gMi4gUG93ZXItVXBzXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCLwn6eqIEFMQ0hFTVlcIiB9KTtcbiAgICAgICAgY29uc3QgYnVmZnMgPSBbXG4gICAgICAgICAgICB7IGlkOiBcImZvY3VzX3BvdGlvblwiLCBuYW1lOiBcIkZvY3VzIFBvdGlvblwiLCBpY29uOiBcIvCfp6pcIiwgZGVzYzogXCIyeCBYUCAoMWgpXCIsIGNvc3Q6IDEwMCwgZHVyYXRpb246IDYwLCBlZmZlY3Q6IHsgeHBNdWx0OiAyIH0gfSxcbiAgICAgICAgICAgIHsgaWQ6IFwibWlkYXNfdG91Y2hcIiwgbmFtZTogXCJNaWRhcyBUb3VjaFwiLCBpY29uOiBcIuKcqFwiLCBkZXNjOiBcIjN4IEdvbGQgKDMwbSlcIiwgY29zdDogMTUwLCBkdXJhdGlvbjogMzAsIGVmZmVjdDogeyBnb2xkTXVsdDogMyB9IH0sXG4gICAgICAgICAgICB7IGlkOiBcImlyb25fd2lsbFwiLCBuYW1lOiBcIklyb24gV2lsbFwiLCBpY29uOiBcIvCfm6HvuI9cIiwgZGVzYzogXCI1MCUgRG1nIFJlZHVjdCAoMmgpXCIsIGNvc3Q6IDIwMCwgZHVyYXRpb246IDEyMCwgZWZmZWN0OiB7IGRhbWFnZU11bHQ6IDAuNSB9IH1cbiAgICAgICAgXTtcblxuICAgICAgICBidWZmcy5mb3JFYWNoKGJ1ZmYgPT4ge1xuICAgICAgICAgICAgIHRoaXMuaXRlbShjb250ZW50RWwsIGAke2J1ZmYuaWNvbn0gJHtidWZmLm5hbWV9YCwgYnVmZi5kZXNjLCBidWZmLmNvc3QsIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmFjdGl2YXRlQnVmZihidWZmKTtcbiAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gIGl0ZW0oZWw6IEhUTUxFbGVtZW50LCBuYW1lOiBzdHJpbmcsIGRlc2M6IHN0cmluZywgYmFzZUNvc3Q6IG51bWJlciwgZWZmZWN0OiAoKSA9PiBQcm9taXNlPHZvaWQ+KSB7IFxuICAgICAgICAvLyBbRklYXSBBcHBseSBJbmZsYXRpb24gTXVsdGlwbGllclxuICAgICAgICBjb25zdCBtdWx0ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGFpbHlNb2RpZmllci5wcmljZU11bHQgfHwgMTtcbiAgICAgICAgY29uc3QgcmVhbENvc3QgPSBNYXRoLmNlaWwoYmFzZUNvc3QgKiBtdWx0KTtcblxuICAgICAgICBjb25zdCBjID0gZWwuY3JlYXRlRGl2KCk7IFxuICAgICAgICBjLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTpmbGV4OyBqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjsgcGFkZGluZzoxMHB4IDA7IGJvcmRlci1ib3R0b206MXB4IHNvbGlkICMzMzM7XCIpOyBcbiAgICAgICAgY29uc3QgaSA9IGMuY3JlYXRlRGl2KCk7IFxuICAgICAgICBpLmNyZWF0ZUVsKFwiYlwiLCB7IHRleHQ6IG5hbWUgfSk7IFxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBpbmZsYXRlZCBwcmljZSB3YXJuaW5nIGlmIGFwcGxpY2FibGVcbiAgICAgICAgaWYgKG11bHQgPiAxKSB7XG4gICAgICAgICAgICBpLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IGAgKPCfk4ggSW5mOiAke211bHR9eClgLCBhdHRyOiB7IHN0eWxlOiBcImNvbG9yOiByZWQ7IGZvbnQtc2l6ZTogMC44ZW07XCIgfSB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGkuY3JlYXRlRWwoXCJkaXZcIiwgeyB0ZXh0OiBkZXNjIH0pOyBcbiAgICAgICAgY29uc3QgYiA9IGMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBgJHtyZWFsQ29zdH0gR2AgfSk7IFxuICAgICAgICBcbiAgICAgICAgaWYodGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZCA8IHJlYWxDb3N0KSB7IFxuICAgICAgICAgICAgYi5zZXRBdHRyaWJ1dGUoXCJkaXNhYmxlZFwiLFwidHJ1ZVwiKTsgYi5zdHlsZS5vcGFjaXR5PVwiMC41XCI7IFxuICAgICAgICB9IGVsc2UgeyBcbiAgICAgICAgICAgIGIuYWRkQ2xhc3MoXCJtb2QtY3RhXCIpOyBcbiAgICAgICAgICAgIGIub25jbGljayA9IGFzeW5jICgpID0+IHsgXG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZCAtPSByZWFsQ29zdDsgXG4gICAgICAgICAgICAgICAgYXdhaXQgZWZmZWN0KCk7IFxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5zYXZlKCk7IFxuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYEJvdWdodCAke25hbWV9IGZvciAke3JlYWxDb3N0fWdgKTsgXG4gICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpOyBcbiAgICAgICAgICAgICAgICBuZXcgU2hvcE1vZGFsKHRoaXMuYXBwLHRoaXMucGx1Z2luKS5vcGVuKCk7IFxuICAgICAgICAgICAgfVxuICAgICAgICB9IFxuICAgIH0gXG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfSBcbn1cblxuLy8gLi4uIChRdWVzdE1vZGFsLCBTa2lsbE1hbmFnZXJNb2RhbCwgZXRjLiByZW1haW4gdW5jaGFuZ2VkIGZyb20gcHJldmlvdXMgdmVyc2lvbnMsIGluY2x1ZGVkIGhlcmUgZm9yIGNvbXBsZXRlbmVzcyBvZiBmaWxlIGlmIHlvdSByZXBsYWNlIGVudGlyZWx5LCBidXQgYXNzdW1pbmcgeW91IG1lcmdlIG9yIEkgcHJvdmlkZSBvbmx5IENoYW5nZWQgY2xhc3Nlcy4gU2luY2UgeW91IGFza2VkIGZvciBmaWxlcywgSSB3aWxsIGluY2x1ZGUgUXVlc3RNb2RhbCBldGMgYmVsb3cpXG5cbmV4cG9ydCBjbGFzcyBRdWVzdE1vZGFsIGV4dGVuZHMgTW9kYWwgeyBcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luOyBcbiAgICBuYW1lOiBzdHJpbmc7IGRpZmZpY3VsdHk6IG51bWJlciA9IDM7IHNraWxsOiBzdHJpbmcgPSBcIk5vbmVcIjsgc2VjU2tpbGw6IHN0cmluZyA9IFwiTm9uZVwiOyBkZWFkbGluZTogc3RyaW5nID0gXCJcIjsgaGlnaFN0YWtlczogYm9vbGVhbiA9IGZhbHNlOyBpc0Jvc3M6IGJvb2xlYW4gPSBmYWxzZTsgXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHsgc3VwZXIoYXBwKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH0gXG4gICAgb25PcGVuKCkgeyBcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7IFxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwi4pqU77iPIERFUExPWU1FTlRcIiB9KTsgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIk9iamVjdGl2ZVwiKS5hZGRUZXh0KHQgPT4geyB0Lm9uQ2hhbmdlKHYgPT4gdGhpcy5uYW1lID0gdik7IHNldFRpbWVvdXQoKCkgPT4gdC5pbnB1dEVsLmZvY3VzKCksIDUwKTsgfSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIkRpZmZpY3VsdHlcIikuYWRkRHJvcGRvd24oZCA9PiBkLmFkZE9wdGlvbihcIjFcIixcIlRyaXZpYWxcIikuYWRkT3B0aW9uKFwiMlwiLFwiRWFzeVwiKS5hZGRPcHRpb24oXCIzXCIsXCJNZWRpdW1cIikuYWRkT3B0aW9uKFwiNFwiLFwiSGFyZFwiKS5hZGRPcHRpb24oXCI1XCIsXCJTVUlDSURFXCIpLnNldFZhbHVlKFwiM1wiKS5vbkNoYW5nZSh2PT50aGlzLmRpZmZpY3VsdHk9cGFyc2VJbnQodikpKTsgXG4gICAgICAgIGNvbnN0IHNraWxsczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsgXCJOb25lXCI6IFwiTm9uZVwiIH07IFxuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5za2lsbHMuZm9yRWFjaChzID0+IHNraWxsc1tzLm5hbWVdID0gcy5uYW1lKTsgXG4gICAgICAgIHNraWxsc1tcIisgTmV3XCJdID0gXCIrIE5ld1wiOyBcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiUHJpbWFyeSBOb2RlXCIpLmFkZERyb3Bkb3duKGQgPT4gZC5hZGRPcHRpb25zKHNraWxscykub25DaGFuZ2UodiA9PiB7IGlmKHY9PT1cIisgTmV3XCIpeyB0aGlzLmNsb3NlKCk7IG5ldyBTa2lsbE1hbmFnZXJNb2RhbCh0aGlzLmFwcCx0aGlzLnBsdWdpbikub3BlbigpOyB9IGVsc2UgdGhpcy5za2lsbD12OyB9KSk7IFxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJTeW5lcmd5IE5vZGVcIikuYWRkRHJvcGRvd24oZCA9PiBkLmFkZE9wdGlvbnMoc2tpbGxzKS5zZXRWYWx1ZShcIk5vbmVcIikub25DaGFuZ2UodiA9PiB0aGlzLnNlY1NraWxsID0gdikpO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJEZWFkbGluZVwiKS5hZGRUZXh0KHQgPT4geyB0LmlucHV0RWwudHlwZSA9IFwiZGF0ZXRpbWUtbG9jYWxcIjsgdC5vbkNoYW5nZSh2ID0+IHRoaXMuZGVhZGxpbmUgPSB2KTsgfSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIkhpZ2ggU3Rha2VzXCIpLnNldERlc2MoXCJEb3VibGUgR29sZCAvIERvdWJsZSBEYW1hZ2VcIikuYWRkVG9nZ2xlKHQ9PnQuc2V0VmFsdWUoZmFsc2UpLm9uQ2hhbmdlKHY9PnRoaXMuaGlnaFN0YWtlcz12KSk7IFxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLmFkZEJ1dHRvbihiID0+IGIuc2V0QnV0dG9uVGV4dChcIkRlcGxveVwiKS5zZXRDdGEoKS5vbkNsaWNrKCgpID0+IHsgaWYodGhpcy5uYW1lKXsgdGhpcy5wbHVnaW4uZW5naW5lLmNyZWF0ZVF1ZXN0KHRoaXMubmFtZSx0aGlzLmRpZmZpY3VsdHksdGhpcy5za2lsbCx0aGlzLnNlY1NraWxsLHRoaXMuZGVhZGxpbmUsdGhpcy5oaWdoU3Rha2VzLCBcIk5vcm1hbFwiLCB0aGlzLmlzQm9zcyk7IHRoaXMuY2xvc2UoKTsgfSB9KSk7IFxuICAgIH0gXG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfSBcbn1cblxuZXhwb3J0IGNsYXNzIFNraWxsTWFuYWdlck1vZGFsIGV4dGVuZHMgTW9kYWwgeyBcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luOyBcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikgeyBzdXBlcihhcHApOyB0aGlzLnBsdWdpbiA9IHBsdWdpbjsgfSBcbiAgICBvbk9wZW4oKSB7IFxuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpczsgXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJBZGQgTmV3IE5vZGVcIiB9KTsgXG4gICAgICAgIGxldCBuPVwiXCI7IFxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJOb2RlIE5hbWVcIikuYWRkVGV4dCh0PT50Lm9uQ2hhbmdlKHY9Pm49dikpLmFkZEJ1dHRvbihiPT5iLnNldEJ1dHRvblRleHQoXCJDcmVhdGVcIikuc2V0Q3RhKCkub25DbGljayhhc3luYygpPT57XG4gICAgICAgICAgICBpZihuKXsgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2tpbGxzLnB1c2goe25hbWU6bixsZXZlbDoxLHhwOjAseHBSZXE6NSxsYXN0VXNlZDpuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkscnVzdDowLGNvbm5lY3Rpb25zOltdfSk7IGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5zYXZlKCk7IHRoaXMuY2xvc2UoKTsgfVxuICAgICAgICB9KSk7IFxuICAgIH0gXG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfSBcbn1cblxuZXhwb3J0IGNsYXNzIFNraWxsRGV0YWlsTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjsgaW5kZXg6IG51bWJlcjtcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbiwgaW5kZXg6IG51bWJlcikgeyBzdXBlcihhcHApOyB0aGlzLnBsdWdpbj1wbHVnaW47IHRoaXMuaW5kZXg9aW5kZXg7IH1cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgICAgICBjb25zdCBzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2tpbGxzW3RoaXMuaW5kZXhdO1xuICAgICAgICBpZiAoIXMpIHsgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiU2tpbGwgbm90IGZvdW5kLlwiIH0pOyByZXR1cm47IH1cbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBgTm9kZTogJHtzLm5hbWV9YCB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiTmFtZVwiKS5hZGRUZXh0KHQ9PnQuc2V0VmFsdWUocy5uYW1lKS5vbkNoYW5nZSh2PT5zLm5hbWU9dikpO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJSdXN0IFN0YXR1c1wiKS5zZXREZXNjKGBTdGFja3M6ICR7cy5ydXN0fWApLmFkZEJ1dHRvbihiPT5iLnNldEJ1dHRvblRleHQoXCJNYW51YWwgUG9saXNoXCIpLm9uQ2xpY2soYXN5bmMoKT0+eyBzLnJ1c3Q9MDsgcy54cFJlcT1NYXRoLmZsb29yKHMueHBSZXEvMS4xKTsgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLnNhdmUoKTsgdGhpcy5jbG9zZSgpOyBuZXcgTm90aWNlKFwiUnVzdCBwb2xpc2hlZC5cIik7IH0pKTtcbiAgICAgICAgY29uc3QgZGl2ID0gY29udGVudEVsLmNyZWF0ZURpdigpOyBkaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW4tdG9wOjIwcHg7IGRpc3BsYXk6ZmxleDsganVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47XCIpO1xuICAgICAgICBjb25zdCBiU2F2ZSA9IGRpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7dGV4dDpcIlNhdmVcIn0pOyBiU2F2ZS5hZGRDbGFzcyhcIm1vZC1jdGFcIik7IGJTYXZlLm9uY2xpY2s9YXN5bmMoKT0+eyBhd2FpdCB0aGlzLnBsdWdpbi5lbmdpbmUuc2F2ZSgpOyB0aGlzLmNsb3NlKCk7IH07XG4gICAgICAgIGNvbnN0IGJEZWwgPSBkaXYuY3JlYXRlRWwoXCJidXR0b25cIiwge3RleHQ6XCJEZWxldGUgTm9kZVwifSk7IGJEZWwuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcImNvbG9yOnJlZDtcIik7IGJEZWwub25jbGljaz1hc3luYygpPT57IHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5zcGxpY2UodGhpcy5pbmRleCwgMSk7IGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5zYXZlKCk7IHRoaXMuY2xvc2UoKTsgfTtcbiAgICB9XG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfVxufVxuXG5leHBvcnQgY2xhc3MgUXVpY2tDYXB0dXJlTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjtcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikgeyBzdXBlcihhcHApOyB0aGlzLnBsdWdpbiA9IHBsdWdpbjsgfVxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCLimqEgUXVpY2sgQ2FwdHVyZVwiIH0pO1xuICAgICAgICBjb25zdCBkaXYgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gZGl2LmNyZWF0ZUVsKFwiaW5wdXRcIiwgeyB0eXBlOiBcInRleHRcIiwgYXR0cjogeyBwbGFjZWhvbGRlcjogXCJXaGF0J3Mgb24geW91ciBtaW5kP1wiLCBzdHlsZTogXCJ3aWR0aDogMTAwJTsgcGFkZGluZzogMTBweDsgZm9udC1zaXplOiAxLjJlbTsgYmFja2dyb3VuZDogIzIyMjsgYm9yZGVyOiAxcHggc29saWQgIzQ0NDsgY29sb3I6ICNlMGUwZTA7XCIgfSB9KTtcbiAgICAgICAgaW5wdXQuZm9jdXMoKTtcbiAgICAgICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIGFzeW5jIChlKSA9PiB7IGlmIChlLmtleSA9PT0gXCJFbnRlclwiICYmIGlucHV0LnZhbHVlLnRyaW0oKS5sZW5ndGggPiAwKSB7IGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5jcmVhdGVTY3JhcChpbnB1dC52YWx1ZSk7IHRoaXMuY2xvc2UoKTsgfSB9KTtcbiAgICAgICAgY29uc3QgYnRuID0gY29udGVudEVsLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDYXB0dXJlIHRvIFNjcmFwc1wiIH0pO1xuICAgICAgICBidG4uYWRkQ2xhc3MoXCJtb2QtY3RhXCIpO1xuICAgICAgICBidG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW4tdG9wOiAxNXB4OyB3aWR0aDogMTAwJTtcIik7XG4gICAgICAgIGJ0bi5vbmNsaWNrID0gYXN5bmMgKCkgPT4geyBpZiAoaW5wdXQudmFsdWUudHJpbSgpLmxlbmd0aCA+IDApIHsgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLmNyZWF0ZVNjcmFwKGlucHV0LnZhbHVlKTsgdGhpcy5jbG9zZSgpOyB9IH07XG4gICAgfVxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH1cbn1cblxuZXhwb3J0IGNsYXNzIFF1ZXN0VGVtcGxhdGVNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9XG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIuKaoSBRdWljayBEZXBsb3kgVGVtcGxhdGVzXCIgfSk7XG4gICAgICAgIGNvbnN0IGdyaWQgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7XG4gICAgICAgIGdyaWQuc3R5bGUuZGlzcGxheSA9IFwiZ3JpZFwiOyBncmlkLnN0eWxlLmdyaWRUZW1wbGF0ZUNvbHVtbnMgPSBcIjFmciAxZnJcIjsgZ3JpZC5zdHlsZS5nYXAgPSBcIjEwcHhcIjtcbiAgICAgICAgY29uc3QgdGVtcGxhdGVzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucXVlc3RUZW1wbGF0ZXMgfHwgW107XG4gICAgICAgIGlmICh0ZW1wbGF0ZXMubGVuZ3RoID09PSAwKSBncmlkLmNyZWF0ZURpdih7IHRleHQ6IFwiTm8gdGVtcGxhdGVzIGZvdW5kLiBDcmVhdGUgb25lIGluIFNldHRpbmdzLlwiIH0pO1xuICAgICAgICB0ZW1wbGF0ZXMuZm9yRWFjaCh0ZW1wbGF0ZSA9PiB7XG4gICAgICAgICAgICBjb25zdCBidG4gPSBncmlkLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogdGVtcGxhdGUubmFtZSB9KTtcbiAgICAgICAgICAgIGJ0bi5hZGRDbGFzcyhcInNpc3ktYnRuXCIpOyBidG4uc3R5bGUudGV4dEFsaWduID0gXCJsZWZ0XCI7IGJ0bi5zdHlsZS5wYWRkaW5nID0gXCIxNXB4XCI7XG4gICAgICAgICAgICBidG4uY3JlYXRlRGl2KHsgdGV4dDogYERpZmY6ICR7dGVtcGxhdGUuZGlmZn0gfCBTa2lsbDogJHt0ZW1wbGF0ZS5za2lsbH1gLCBhdHRyOiB7IHN0eWxlOiBcImZvbnQtc2l6ZTogMC44ZW07IG9wYWNpdHk6IDAuNzsgbWFyZ2luLXRvcDogNXB4O1wiIH0gfSk7XG4gICAgICAgICAgICBidG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgZGVhZGxpbmUgPSBcIlwiO1xuICAgICAgICAgICAgICAgIGlmICh0ZW1wbGF0ZS5kZWFkbGluZS5zdGFydHNXaXRoKFwiK1wiKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByYXcgPSB0ZW1wbGF0ZS5kZWFkbGluZS5yZXBsYWNlKC9eXFwrXFxzKi8sIFwiXCIpLnJlcGxhY2UoL1xccypoKG91cik/cz8kL2ksIFwiXCIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBob3VycyA9IHBhcnNlSW50KHJhdywgMTApO1xuICAgICAgICAgICAgICAgICAgICBkZWFkbGluZSA9IGlzTmFOKGhvdXJzKSB8fCBob3VycyA8IDBcbiAgICAgICAgICAgICAgICAgICAgICAgID8gbW9tZW50KCkuYWRkKDI0LCAnaG91cnMnKS50b0lTT1N0cmluZygpXG4gICAgICAgICAgICAgICAgICAgICAgICA6IG1vbWVudCgpLmFkZChob3VycywgJ2hvdXJzJykudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRlbXBsYXRlLmRlYWRsaW5lLmluY2x1ZGVzKFwiOlwiKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBbaCwgbV0gPSB0ZW1wbGF0ZS5kZWFkbGluZS5zcGxpdChcIjpcIik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGhvdXIgPSBwYXJzZUludChoLCAxMCkgfHwgMDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWludXRlID0gcGFyc2VJbnQobSwgMTApIHx8IDA7XG4gICAgICAgICAgICAgICAgICAgIGRlYWRsaW5lID0gbW9tZW50KCkuc2V0KHsgaG91ciwgbWludXRlIH0pLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtb21lbnQoKS5pc0FmdGVyKGRlYWRsaW5lKSkgZGVhZGxpbmUgPSBtb21lbnQoZGVhZGxpbmUpLmFkZCgxLCAnZGF5JykudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkZWFkbGluZSA9IG1vbWVudCgpLmFkZCgyNCwgJ2hvdXJzJykudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmNyZWF0ZVF1ZXN0KHRlbXBsYXRlLm5hbWUsIHRlbXBsYXRlLmRpZmYsIHRlbXBsYXRlLnNraWxsLCBcIk5vbmVcIiwgZGVhZGxpbmUsIGZhbHNlLCBcIk5vcm1hbFwiLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShgRGVwbG95ZWQ6ICR7dGVtcGxhdGUubmFtZX1gKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfVxufVxuXG5leHBvcnQgY2xhc3MgUmVzZWFyY2hRdWVzdE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47IHRpdGxlOiBzdHJpbmcgPSBcIlwiOyB0eXBlOiBcInN1cnZleVwiIHwgXCJkZWVwX2RpdmVcIiA9IFwic3VydmV5XCI7IGxpbmtlZFNraWxsOiBzdHJpbmcgPSBcIk5vbmVcIjsgbGlua2VkQ29tYmF0UXVlc3Q6IHN0cmluZyA9IFwiTm9uZVwiO1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9XG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpczsgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIlJFU0VBUkNIIERFUExPWU1FTlRcIiB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiUmVzZWFyY2ggVGl0bGVcIikuYWRkVGV4dCh0ID0+IHsgdC5vbkNoYW5nZSh2ID0+IHRoaXMudGl0bGUgPSB2KTsgc2V0VGltZW91dCgoKSA9PiB0LmlucHV0RWwuZm9jdXMoKSwgNTApOyB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiUmVzZWFyY2ggVHlwZVwiKS5hZGREcm9wZG93bihkID0+IGQuYWRkT3B0aW9uKFwic3VydmV5XCIsIFwiU3VydmV5ICgxMDAtMjAwIHdvcmRzKVwiKS5hZGRPcHRpb24oXCJkZWVwX2RpdmVcIiwgXCJEZWVwIERpdmUgKDIwMC00MDAgd29yZHMpXCIpLnNldFZhbHVlKFwic3VydmV5XCIpLm9uQ2hhbmdlKHYgPT4gdGhpcy50eXBlID0gdiBhcyBcInN1cnZleVwiIHwgXCJkZWVwX2RpdmVcIikpO1xuICAgICAgICBjb25zdCBza2lsbHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7IFwiTm9uZVwiOiBcIk5vbmVcIiB9OyB0aGlzLnBsdWdpbi5zZXR0aW5ncy5za2lsbHMuZm9yRWFjaChzID0+IHNraWxsc1tzLm5hbWVdID0gcy5uYW1lKTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiTGlua2VkIFNraWxsXCIpLmFkZERyb3Bkb3duKGQgPT4gZC5hZGRPcHRpb25zKHNraWxscykuc2V0VmFsdWUoXCJOb25lXCIpLm9uQ2hhbmdlKHYgPT4gdGhpcy5saW5rZWRTa2lsbCA9IHYpKTtcbiAgICAgICAgY29uc3QgY29tYmF0UXVlc3RzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyBcIk5vbmVcIjogXCJOb25lXCIgfTtcbiAgICAgICAgY29uc3QgcXVlc3RGb2xkZXIgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJBY3RpdmVfUnVuL1F1ZXN0c1wiKTtcbiAgICAgICAgaWYgKHF1ZXN0Rm9sZGVyIGluc3RhbmNlb2YgVEZvbGRlcikgeyBxdWVzdEZvbGRlci5jaGlsZHJlbi5mb3JFYWNoKGYgPT4geyBpZiAoZiBpbnN0YW5jZW9mIFRGaWxlICYmIGYuZXh0ZW5zaW9uID09PSBcIm1kXCIpIGNvbWJhdFF1ZXN0c1tmLmJhc2VuYW1lXSA9IGYuYmFzZW5hbWU7IH0pOyB9XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIkxpbmsgQ29tYmF0IFF1ZXN0XCIpLmFkZERyb3Bkb3duKGQgPT4gZC5hZGRPcHRpb25zKGNvbWJhdFF1ZXN0cykuc2V0VmFsdWUoXCJOb25lXCIpLm9uQ2hhbmdlKHYgPT4gdGhpcy5saW5rZWRDb21iYXRRdWVzdCA9IHYpKTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5hZGRCdXR0b24oYiA9PiBiLnNldEJ1dHRvblRleHQoXCJDUkVBVEUgUkVTRUFSQ0hcIikuc2V0Q3RhKCkub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRoaXMudGl0bGUpIHJldHVybjtcbiAgICAgICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5jcmVhdGVSZXNlYXJjaFF1ZXN0KHRoaXMudGl0bGUsIHRoaXMudHlwZSwgdGhpcy5saW5rZWRTa2lsbCwgdGhpcy5saW5rZWRDb21iYXRRdWVzdCk7XG4gICAgICAgICAgICBpZiAocmVzLnN1Y2Nlc3MpIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgfSkpO1xuICAgIH1cbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZXNlYXJjaExpc3RNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9XG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpczsgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIlJFU0VBUkNIIExJQlJBUllcIiB9KTtcbiAgICAgICAgY29uc3Qgc3RhdHMgPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0UmVzZWFyY2hSYXRpbygpO1xuICAgICAgICBjb25zdCBzdGF0c0VsID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXJlc2VhcmNoLXN0YXRzXCIgfSk7IHN0YXRzRWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYENvbWJhdCBRdWVzdHM6ICR7c3RhdHMuY29tYmF0fWAgfSk7IHN0YXRzRWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFJlc2VhcmNoIFF1ZXN0czogJHtzdGF0cy5yZXNlYXJjaH1gIH0pOyBzdGF0c0VsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBSYXRpbzogJHtzdGF0cy5yYXRpb306MWAgfSk7XG4gICAgICAgIGlmICghdGhpcy5wbHVnaW4uZW5naW5lLmNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKSkgeyBjb25zdCB3YXJuaW5nID0gY29udGVudEVsLmNyZWF0ZURpdigpOyB3YXJuaW5nLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiY29sb3I6IG9yYW5nZTsgZm9udC13ZWlnaHQ6IGJvbGQ7IG1hcmdpbjogMTBweCAwO1wiKTsgd2FybmluZy5zZXRUZXh0KFwiUkVTRUFSQ0ggQkxPQ0tFRDogTmVlZCAyOjEgY29tYmF0IHRvIHJlc2VhcmNoIHJhdGlvXCIpOyB9XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJBY3RpdmUgUmVzZWFyY2hcIiB9KTtcbiAgICAgICAgY29uc3QgcXVlc3RzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuZmlsdGVyKHEgPT4gIXEuY29tcGxldGVkKTtcbiAgICAgICAgaWYgKHF1ZXN0cy5sZW5ndGggPT09IDApIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk5vIGFjdGl2ZSByZXNlYXJjaCBxdWVzdHMuXCIgfSk7XG4gICAgICAgIGVsc2UgcXVlc3RzLmZvckVhY2goKHE6IGFueSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2FyZCA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1yZXNlYXJjaC1jYXJkXCIgfSk7IGNhcmQuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJib3JkZXI6IDFweCBzb2xpZCAjNDQ0OyBwYWRkaW5nOiAxMHB4OyBtYXJnaW46IDVweCAwOyBib3JkZXItcmFkaXVzOiA0cHg7XCIpO1xuICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gY2FyZC5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogcS50aXRsZSB9KTsgaGVhZGVyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAwIDAgNXB4IDA7XCIpO1xuICAgICAgICAgICAgY29uc3QgaW5mbyA9IGNhcmQuY3JlYXRlRWwoXCJkaXZcIik7IGluZm8uaW5uZXJIVE1MID0gYDxjb2RlIHN0eWxlPVwiY29sb3I6I2FhNjRmZlwiPiR7cS5pZH08L2NvZGU+PGJyPlR5cGU6ICR7cS50eXBlID09PSBcInN1cnZleVwiID8gXCJTdXJ2ZXlcIiA6IFwiRGVlcCBEaXZlXCJ9IHwgV29yZHM6ICR7cS53b3JkQ291bnR9LyR7cS53b3JkTGltaXR9YDsgaW5mby5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZvbnQtc2l6ZTogMC45ZW07IG9wYWNpdHk6IDAuODtcIik7XG4gICAgICAgICAgICBjb25zdCBhY3Rpb25zID0gY2FyZC5jcmVhdGVEaXYoKTsgYWN0aW9ucy5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbi10b3A6IDhweDsgZGlzcGxheTogZmxleDsgZ2FwOiA1cHg7XCIpO1xuICAgICAgICAgICAgY29uc3QgY29tcGxldGVCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDT01QTEVURVwiIH0pOyBjb21wbGV0ZUJ0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZsZXg6IDE7IHBhZGRpbmc6IDVweDsgYmFja2dyb3VuZDogZ3JlZW47IGNvbG9yOiB3aGl0ZTsgYm9yZGVyOiBub25lOyBib3JkZXItcmFkaXVzOiAzcHg7IGN1cnNvcjogcG9pbnRlcjtcIik7IGNvbXBsZXRlQnRuLm9uY2xpY2sgPSAoKSA9PiB7IHRoaXMucGx1Z2luLmVuZ2luZS5jb21wbGV0ZVJlc2VhcmNoUXVlc3QocS5pZCwgcS53b3JkQ291bnQpOyB0aGlzLmNsb3NlKCk7IH07XG4gICAgICAgICAgICBjb25zdCBkZWxldGVCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJERUxFVEVcIiB9KTsgZGVsZXRlQnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZmxleDogMTsgcGFkZGluZzogNXB4OyBiYWNrZ3JvdW5kOiByZWQ7IGNvbG9yOiB3aGl0ZTsgYm9yZGVyOiBub25lOyBib3JkZXItcmFkaXVzOiAzcHg7IGN1cnNvcjogcG9pbnRlcjtcIik7IGRlbGV0ZUJ0bi5vbmNsaWNrID0gYXN5bmMgKCkgPT4geyBhd2FpdCB0aGlzLnBsdWdpbi5lbmdpbmUuZGVsZXRlUmVzZWFyY2hRdWVzdChxLmlkKTsgdGhpcy5jbG9zZSgpOyB9O1xuICAgICAgICB9KTtcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkNvbXBsZXRlZCBSZXNlYXJjaFwiIH0pO1xuICAgICAgICBjb25zdCBjb21wbGV0ZWQgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maWx0ZXIocSA9PiBxLmNvbXBsZXRlZCk7XG4gICAgICAgIGlmIChjb21wbGV0ZWQubGVuZ3RoID09PSAwKSBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJObyBjb21wbGV0ZWQgcmVzZWFyY2guXCIgfSk7XG4gICAgICAgIGVsc2UgY29tcGxldGVkLmZvckVhY2goKHE6IGFueSkgPT4geyBjb25zdCBpdGVtID0gY29udGVudEVsLmNyZWF0ZUVsKFwicFwiKTsgaXRlbS5zZXRUZXh0KGArICR7cS50aXRsZX0gKCR7cS50eXBlID09PSBcInN1cnZleVwiID8gXCJTdXJ2ZXlcIiA6IFwiRGVlcCBEaXZlXCJ9KWApOyBpdGVtLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwib3BhY2l0eTogMC42OyBmb250LXNpemU6IDAuOWVtO1wiKTsgfSk7XG4gICAgfVxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH1cbn1cblxuZXhwb3J0IGNsYXNzIENoYWluQnVpbGRlck1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47IGNoYWluTmFtZTogc3RyaW5nID0gXCJcIjsgc2VsZWN0ZWRRdWVzdHM6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHsgc3VwZXIoYXBwKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH1cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzOyBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiQ0hBSU4gQlVJTERFUlwiIH0pO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJDaGFpbiBOYW1lXCIpLmFkZFRleHQodCA9PiB7IHQub25DaGFuZ2UodiA9PiB0aGlzLmNoYWluTmFtZSA9IHYpOyBzZXRUaW1lb3V0KCgpID0+IHQuaW5wdXRFbC5mb2N1cygpLCA1MCk7IH0pO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiU2VsZWN0IFF1ZXN0c1wiIH0pO1xuICAgICAgICBjb25zdCBxdWVzdEZvbGRlciA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChcIkFjdGl2ZV9SdW4vUXVlc3RzXCIpO1xuICAgICAgICBjb25zdCBxdWVzdHM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGlmIChxdWVzdEZvbGRlciBpbnN0YW5jZW9mIFRGb2xkZXIpIHsgcXVlc3RGb2xkZXIuY2hpbGRyZW4uZm9yRWFjaChmID0+IHsgaWYgKGYgaW5zdGFuY2VvZiBURmlsZSAmJiBmLmV4dGVuc2lvbiA9PT0gXCJtZFwiKSBxdWVzdHMucHVzaChmLmJhc2VuYW1lKTsgfSk7IH1cbiAgICAgICAgcXVlc3RzLmZvckVhY2goKHF1ZXN0LCBpZHgpID0+IHsgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKHF1ZXN0KS5hZGRUb2dnbGUodCA9PiB0Lm9uQ2hhbmdlKHYgPT4geyBpZiAodikgdGhpcy5zZWxlY3RlZFF1ZXN0cy5wdXNoKHF1ZXN0KTsgZWxzZSB0aGlzLnNlbGVjdGVkUXVlc3RzID0gdGhpcy5zZWxlY3RlZFF1ZXN0cy5maWx0ZXIocSA9PiBxICE9PSBxdWVzdCk7IH0pKTsgfSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuYWRkQnV0dG9uKGIgPT4gYi5zZXRCdXR0b25UZXh0KFwiQ1JFQVRFIENIQUlOXCIpLnNldEN0YSgpLm9uQ2xpY2soYXN5bmMgKCkgPT4geyBpZiAodGhpcy5jaGFpbk5hbWUgJiYgdGhpcy5zZWxlY3RlZFF1ZXN0cy5sZW5ndGggPj0gMikgeyBhd2FpdCB0aGlzLnBsdWdpbi5lbmdpbmUuY3JlYXRlUXVlc3RDaGFpbih0aGlzLmNoYWluTmFtZSwgdGhpcy5zZWxlY3RlZFF1ZXN0cyk7IHRoaXMuY2xvc2UoKTsgfSBlbHNlIG5ldyBOb3RpY2UoXCJDaGFpbiBuZWVkcyBhIG5hbWUgYW5kIGF0IGxlYXN0IDIgcXVlc3RzXCIpOyB9KSk7XG4gICAgfVxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH1cbn1cblxuZXhwb3J0IGNsYXNzIFZpY3RvcnlNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9XG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpczsgY29udGVudEVsLmFkZENsYXNzKFwic2lzeS12aWN0b3J5LW1vZGFsXCIpO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMVwiLCB7IHRleHQ6IFwiQVNDRU5TSU9OIEFDSElFVkVEXCIsIGNsczogXCJzaXN5LXZpY3RvcnktdGl0bGVcIiB9KTtcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiZGl2XCIsIHsgdGV4dDogXCLwn4+GXCIsIGF0dHI6IHsgc3R5bGU6IFwiZm9udC1zaXplOiA2MHB4OyBtYXJnaW46IDIwcHggMDtcIiB9IH0pO1xuICAgICAgICBjb25zdCBzdGF0cyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoKTsgY29uc3QgbGVnYWN5ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MubGVnYWN5OyBjb25zdCBtZXRyaWNzID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldEdhbWVTdGF0cygpO1xuICAgICAgICB0aGlzLnN0YXRMaW5lKHN0YXRzLCBcIkZpbmFsIExldmVsXCIsIFwiNTBcIik7IHRoaXMuc3RhdExpbmUoc3RhdHMsIFwiVG90YWwgUXVlc3RzXCIsIGAke21ldHJpY3MudG90YWxRdWVzdHN9YCk7IHRoaXMuc3RhdExpbmUoc3RhdHMsIFwiRGVhdGhzIEVuZHVyZWRcIiwgYCR7bGVnYWN5LmRlYXRoQ291bnR9YCk7IHRoaXMuc3RhdExpbmUoc3RhdHMsIFwiTG9uZ2VzdCBTdHJlYWtcIiwgYCR7bWV0cmljcy5sb25nZXN0U3RyZWFrfSBkYXlzYCk7XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk9uZSBtdXN0IGltYWdpbmUgU2lzeXBodXMgaGFwcHkuIFlvdSBoYXZlIHB1c2hlZCB0aGUgYm91bGRlciB0byB0aGUgcGVhay5cIiwgYXR0cjogeyBzdHlsZTogXCJtYXJnaW46IDMwcHggMDsgZm9udC1zdHlsZTogaXRhbGljOyBvcGFjaXR5OiAwLjg7XCIgfSB9KTtcbiAgICAgICAgY29uc3QgYnRuID0gY29udGVudEVsLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJCRUdJTiBORVcgR0FNRStcIiB9KTsgYnRuLmFkZENsYXNzKFwibW9kLWN0YVwiKTsgYnRuLnN0eWxlLndpZHRoID0gXCIxMDAlXCI7IGJ0bi5vbmNsaWNrID0gKCkgPT4geyB0aGlzLmNsb3NlKCk7IH07XG4gICAgfVxuICAgIHN0YXRMaW5lKGVsOiBIVE1MRWxlbWVudCwgbGFiZWw6IHN0cmluZywgdmFsOiBzdHJpbmcpIHsgY29uc3QgbGluZSA9IGVsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXZpY3Rvcnktc3RhdFwiIH0pOyBsaW5lLmlubmVySFRNTCA9IGAke2xhYmVsfTogPHNwYW4gY2xhc3M9XCJzaXN5LXZpY3RvcnktaGlnaGxpZ2h0XCI+JHt2YWx9PC9zcGFuPmA7IH1cbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9XG59XG5cbmV4cG9ydCBjbGFzcyBEZWF0aE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHsgc3VwZXIoYXBwKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH1cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgICAgICBjb250ZW50RWwuYWRkQ2xhc3MoXCJzaXN5LWRlYXRoLW1vZGFsXCIpO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMVwiLCB7IHRleHQ6IFwiWU9VIERJRURcIiwgY2xzOiBcInNpc3ktZGVhdGgtdGl0bGVcIiwgYXR0cjogeyBzdHlsZTogXCJ0ZXh0LWFsaWduOmNlbnRlcjsgY29sb3I6I2Y1NTtcIiB9IH0pO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJkaXZcIiwgeyB0ZXh0OiBcIuKYoO+4j1wiLCBhdHRyOiB7IHN0eWxlOiBcImZvbnQtc2l6ZTogNjBweDsgbWFyZ2luOiAyMHB4IDA7IHRleHQtYWxpZ246IGNlbnRlcjtcIiB9IH0pO1xuY29uc3QgbGVnYWN5ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MubGVnYWN5IHx8IHsgZGVhdGhDb3VudDogMCwgc291bHM6IDAsIHBlcmtzOiB7IHN0YXJ0R29sZDogMCwgc3RhcnRTa2lsbFBvaW50czogMCwgcml2YWxEZWxheTogMCB9LCByZWxpY3M6IFtdIH07XG5jb25zdCBzdHJlYWsgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zdHJlYWsgfHwgeyBsb25nZXN0OiAwLCBjdXJyZW50OiAwLCBsYXN0RGF0ZTogXCJcIiB9O1xuY29uc3Qgc3RhdHMgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgYXR0cjogeyBzdHlsZTogXCJtYXJnaW46IDIwcHggMDtcIiB9IH0pO1xudGhpcy5zdGF0TGluZShzdGF0cywgXCJMZXZlbCBSZWFjaGVkXCIsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmxldmVsfWApO1xudGhpcy5zdGF0TGluZShzdGF0cywgXCJEZWF0aHMgKGFmdGVyIHRoaXMpXCIsIGAke2xlZ2FjeS5kZWF0aENvdW50ICsgMX1gKTtcbiAgICB0aGlzLnN0YXRMaW5lKHN0YXRzLCBcIkxvbmdlc3QgU3RyZWFrXCIsIGAke3N0cmVhay5sb25nZXN0IHx8IDB9IGRheXNgKTtcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiT25lIG11c3QgaW1hZ2luZSBTaXN5cGh1cyBoYXBweS4gVGhlIGJvdWxkZXIgcm9sbHMgYmFjay4gWW91IGtlZXAgb25seSB5b3VyIFNjYXJzLlwiLCBhdHRyOiB7IHN0eWxlOiBcIm1hcmdpbjogMjBweCAwOyBmb250LXN0eWxlOiBpdGFsaWM7IG9wYWNpdHk6IDAuODsgdGV4dC1hbGlnbjogY2VudGVyO1wiIH0gfSk7XG4gICAgICAgIGNvbnN0IGJ0biA9IGNvbnRlbnRFbC5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQUNDRVBUIERFQVRIXCIgfSk7XG4gICAgICAgIGJ0bi5hZGRDbGFzcyhcIm1vZC1jdGFcIik7XG4gICAgICAgIGJ0bi5zdHlsZS53aWR0aCA9IFwiMTAwJVwiO1xuICAgICAgICBidG4ub25jbGljayA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS50cmlnZ2VyRGVhdGgoKTtcbiAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29udGVudEVsLmFwcGVuZENoaWxkKGJ0bik7XG4gICAgfVxuICAgIHN0YXRMaW5lKGVsOiBIVE1MRWxlbWVudCwgbGFiZWw6IHN0cmluZywgdmFsOiBzdHJpbmcpIHsgY29uc3QgbGluZSA9IGVsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXZpY3Rvcnktc3RhdFwiIH0pOyBsaW5lLmlubmVySFRNTCA9IGAke2xhYmVsfTogPHNwYW4gY2xhc3M9XCJzaXN5LXZpY3RvcnktaGlnaGxpZ2h0XCI+JHt2YWx9PC9zcGFuPmA7IH1cbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9XG59XG5cbmV4cG9ydCBjbGFzcyBTY2Fyc01vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHsgc3VwZXIoYXBwKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH1cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwi8J+nrCBTQ0FSU1wiIH0pO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJXaGF0IHBlcnNpc3RzIGFjcm9zcyBkZWF0aHMuXCIsIGF0dHI6IHsgc3R5bGU6IFwib3BhY2l0eTogMC44OyBtYXJnaW4tYm90dG9tOiAxNXB4O1wiIH0gfSk7XG4gICAgICAgIGNvbnN0IHNjYXJzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2NhcnMgfHwgW107XG4gICAgICAgIGlmIChzY2Fycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk5vIHNjYXJzIHlldC4gVGhleSBhY2N1bXVsYXRlIHdoZW4geW91IGRpZS5cIiwgY2xzOiBcInNpc3ktZW1wdHktc3RhdGVcIiB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICBzY2Fycy5zbGljZSgpLnJldmVyc2UoKS5mb3JFYWNoKChzOiB7IGxhYmVsOiBzdHJpbmc7IHZhbHVlOiBzdHJpbmcgfCBudW1iZXI7IGVhcm5lZEF0Pzogc3RyaW5nIH0pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByb3cgPSBsaXN0LmNyZWF0ZURpdih7IGF0dHI6IHsgc3R5bGU6IFwicGFkZGluZzogMTBweDsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMzMzM7IGRpc3BsYXk6IGZsZXg7IGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjsgYWxpZ24taXRlbXM6IGNlbnRlcjtcIiB9IH0pO1xuICAgICAgICAgICAgICAgIHJvdy5jcmVhdGVTcGFuKHsgdGV4dDogYCR7cy5sYWJlbH06ICR7cy52YWx1ZX1gIH0pO1xuICAgICAgICAgICAgICAgIGlmIChzLmVhcm5lZEF0KSByb3cuY3JlYXRlU3Bhbih7IHRleHQ6IG5ldyBEYXRlKHMuZWFybmVkQXQpLnRvTG9jYWxlRGF0ZVN0cmluZygpLCBhdHRyOiB7IHN0eWxlOiBcImZvbnQtc2l6ZTogMC44NWVtOyBvcGFjaXR5OiAwLjc7XCIgfSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH1cbn1cblxuZXhwb3J0IGNsYXNzIFRlbXBsYXRlTWFuYWdlck1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG4gICAgbmV3TmFtZTogc3RyaW5nID0gXCJcIjtcbiAgICBuZXdEaWZmOiBudW1iZXIgPSAxO1xuICAgIG5ld1NraWxsOiBzdHJpbmcgPSBcIk5vbmVcIjtcbiAgICBuZXdEZWFkbGluZTogc3RyaW5nID0gXCIrMmhcIjtcblxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgIH1cblxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgfVxuXG4gICAgZGlzcGxheSgpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiTWFuYWdlIFRlbXBsYXRlc1wiIH0pO1xuXG4gICAgICAgIC8vIDEuIExpc3QgRXhpc3RpbmcgVGVtcGxhdGVzXG4gICAgICAgIGNvbnN0IGxpc3REaXYgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7XG4gICAgICAgIGxpc3REaXYuc3R5bGUubWFyZ2luQm90dG9tID0gXCIyMHB4XCI7XG4gICAgICAgIGxpc3REaXYuc3R5bGUubWF4SGVpZ2h0ID0gXCIzMDBweFwiO1xuICAgICAgICBsaXN0RGl2LnN0eWxlLm92ZXJmbG93WSA9IFwiYXV0b1wiO1xuXG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnF1ZXN0VGVtcGxhdGVzLmZvckVhY2goKHQsIGlkeCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gbGlzdERpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgIHJvdy5zdHlsZS5kaXNwbGF5ID0gXCJmbGV4XCI7XG4gICAgICAgICAgICByb3cuc3R5bGUuanVzdGlmeUNvbnRlbnQgPSBcInNwYWNlLWJldHdlZW5cIjtcbiAgICAgICAgICAgIHJvdy5zdHlsZS5hbGlnbkl0ZW1zID0gXCJjZW50ZXJcIjtcbiAgICAgICAgICAgIHJvdy5zdHlsZS5wYWRkaW5nID0gXCIxMHB4XCI7XG4gICAgICAgICAgICByb3cuc3R5bGUuYm9yZGVyQm90dG9tID0gXCIxcHggc29saWQgIzMzM1wiO1xuXG4gICAgICAgICAgICByb3cuY3JlYXRlRGl2KHsgdGV4dDogYCR7dC5uYW1lfSAoRCR7dC5kaWZmfSwgJHt0LnNraWxsfSwgJHt0LmRlYWRsaW5lfSlgIH0pO1xuXG4gICAgICAgICAgICBjb25zdCBkZWxCdG4gPSByb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkRlbGV0ZVwiIH0pO1xuICAgICAgICAgICAgZGVsQnRuLnN0eWxlLmNvbG9yID0gXCJyZWRcIjtcbiAgICAgICAgICAgIGRlbEJ0bi5vbmNsaWNrID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnF1ZXN0VGVtcGxhdGVzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGxheSgpOyAvLyBSZWZyZXNoIFVJXG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyAyLiBBZGQgTmV3IFRlbXBsYXRlIEZvcm1cbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkFkZCBOZXcgVGVtcGxhdGVcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIk5hbWVcIikuYWRkVGV4dCh0ID0+IHQub25DaGFuZ2UodiA9PiB0aGlzLm5ld05hbWUgPSB2KSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIkRpZmZpY3VsdHkgKDEtNSlcIikuYWRkVGV4dCh0ID0+IHQuc2V0VmFsdWUoXCIxXCIpLm9uQ2hhbmdlKHYgPT4geyBjb25zdCBuID0gcGFyc2VJbnQodiwgMTApOyB0aGlzLm5ld0RpZmYgPSBpc05hTihuKSA/IDEgOiBNYXRoLm1pbig1LCBNYXRoLm1heCgxLCBuKSk7IH0pKTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiU2tpbGxcIikuYWRkVGV4dCh0ID0+IHQuc2V0VmFsdWUoXCJOb25lXCIpLm9uQ2hhbmdlKHYgPT4gdGhpcy5uZXdTa2lsbCA9IHYpKTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiRGVhZGxpbmVcIikuc2V0RGVzYyhcIkZvcm1hdDogJzEwOjAwJyBvciAnKzJoJ1wiKS5hZGRUZXh0KHQgPT4gdC5zZXRWYWx1ZShcIisyaFwiKS5vbkNoYW5nZSh2ID0+IHRoaXMubmV3RGVhZGxpbmUgPSB2KSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5hZGRCdXR0b24oYiA9PiBiXG4gICAgICAgICAgICAuc2V0QnV0dG9uVGV4dChcIkFkZCBUZW1wbGF0ZVwiKVxuICAgICAgICAgICAgLnNldEN0YSgpXG4gICAgICAgICAgICAub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLm5ld05hbWUpIHJldHVybjtcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWVzdFRlbXBsYXRlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogdGhpcy5uZXdOYW1lLFxuICAgICAgICAgICAgICAgICAgICBkaWZmOiBNYXRoLm1pbig1LCBNYXRoLm1heCgxLCB0aGlzLm5ld0RpZmYgfHwgMSkpLFxuICAgICAgICAgICAgICAgICAgICBza2lsbDogdGhpcy5uZXdTa2lsbCB8fCBcIk5vbmVcIixcbiAgICAgICAgICAgICAgICAgICAgZGVhZGxpbmU6IHRoaXMubmV3RGVhZGxpbmUgfHwgXCIrMmhcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGxheSgpOyAvLyBSZWZyZXNoIFVJIHRvIHNob3cgbmV3IGl0ZW1cbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKFwiVGVtcGxhdGUgYWRkZWQuXCIpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlc2V0IGZpZWxkc1xuICAgICAgICAgICAgICAgIHRoaXMubmV3TmFtZSA9IFwiXCI7XG4gICAgICAgICAgICB9KSk7XG4gICAgfVxuXG4gICAgb25DbG9zZSgpIHtcbiAgICAgICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBBY2hpZXZlbWVudCB9IGZyb20gJy4vdHlwZXMnO1xuXG5leHBvcnQgY29uc3QgQUNISUVWRU1FTlRfREVGSU5JVElPTlM6IE9taXQ8QWNoaWV2ZW1lbnQsIFwidW5sb2NrZWRcIiB8IFwidW5sb2NrZWRBdFwiPltdID0gW1xuICAgIC8vIC0tLSBFQVJMWSBHQU1FIC0tLVxuICAgIHsgaWQ6IFwiZmlyc3RfYmxvb2RcIiwgbmFtZTogXCJGaXJzdCBCbG9vZFwiLCBkZXNjcmlwdGlvbjogXCJDb21wbGV0ZSB5b3VyIGZpcnN0IHF1ZXN0LlwiLCByYXJpdHk6IFwiY29tbW9uXCIgfSxcbiAgICB7IGlkOiBcIndlZWtfd2FycmlvclwiLCBuYW1lOiBcIldlZWsgV2FycmlvclwiLCBkZXNjcmlwdGlvbjogXCJNYWludGFpbiBhIDctZGF5IHN0cmVhay5cIiwgcmFyaXR5OiBcImNvbW1vblwiIH0sXG4gICAgeyBpZDogXCJ3YXJtX3VwXCIsIG5hbWU6IFwiV2FybSBVcFwiLCBkZXNjcmlwdGlvbjogXCJDb21wbGV0ZSAxMCB0b3RhbCBxdWVzdHMuXCIsIHJhcml0eTogXCJjb21tb25cIiB9LFxuXG4gICAgLy8gLS0tIE1JRCBHQU1FIC0tLVxuICAgIHsgaWQ6IFwic2tpbGxfYWRlcHRcIiwgbmFtZTogXCJBcHByZW50aWNlXCIsIGRlc2NyaXB0aW9uOiBcIlJlYWNoIExldmVsIDUgaW4gYW55IHNraWxsLlwiLCByYXJpdHk6IFwicmFyZVwiIH0sXG4gICAgeyBpZDogXCJjaGFpbl9nYW5nXCIsIG5hbWU6IFwiQ2hhaW4gR2FuZ1wiLCBkZXNjcmlwdGlvbjogXCJDb21wbGV0ZSBhIFF1ZXN0IENoYWluLlwiLCByYXJpdHk6IFwicmFyZVwiIH0sXG4gICAgeyBpZDogXCJyZXNlYXJjaGVyXCIsIG5hbWU6IFwiU2Nob2xhclwiLCBkZXNjcmlwdGlvbjogXCJDb21wbGV0ZSA1IFJlc2VhcmNoIFF1ZXN0cy5cIiwgcmFyaXR5OiBcInJhcmVcIiB9LFxuICAgIHsgaWQ6IFwicmljaFwiLCBuYW1lOiBcIkNhcGl0YWxpc3RcIiwgZGVzY3JpcHRpb246IFwiSG9sZCA1MDAgZ29sZCBhdCBvbmNlLlwiLCByYXJpdHk6IFwicmFyZVwiIH0sXG5cbiAgICAvLyAtLS0gRU5EIEdBTUUgLS0tXG4gICAgeyBpZDogXCJib3NzX3NsYXllclwiLCBuYW1lOiBcIkdpYW50IFNsYXllclwiLCBkZXNjcmlwdGlvbjogXCJEZWZlYXQgeW91ciBmaXJzdCBCb3NzLlwiLCByYXJpdHk6IFwiZXBpY1wiIH0sXG4gICAgeyBpZDogXCJhc2NlbmRlZFwiLCBuYW1lOiBcIlNpc3lwaHVzIEhhcHB5XCIsIGRlc2NyaXB0aW9uOiBcIlJlYWNoIExldmVsIDUwLlwiLCByYXJpdHk6IFwibGVnZW5kYXJ5XCIgfSxcbiAgICB7IGlkOiBcImltbW9ydGFsXCIsIG5hbWU6IFwiSW1tb3J0YWxcIiwgZGVzY3JpcHRpb246IFwiUmVhY2ggTGV2ZWwgMjAgd2l0aCAwIERlYXRocy5cIiwgcmFyaXR5OiBcImxlZ2VuZGFyeVwiIH1cbl07XG4iLCJpbXBvcnQgeyBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBEYXlNZXRyaWNzLCBXZWVrbHlSZXBvcnQsIEJvc3NNaWxlc3RvbmUsIFN0cmVhaywgQWNoaWV2ZW1lbnQgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBBQ0hJRVZFTUVOVF9ERUZJTklUSU9OUyB9IGZyb20gJy4uL2FjaGlldmVtZW50cyc7XG5cbmV4cG9ydCBjbGFzcyBBbmFseXRpY3NFbmdpbmUge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIGF1ZGlvQ29udHJvbGxlcj86IGFueTtcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzLCBhdWRpb0NvbnRyb2xsZXI/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlciA9IGF1ZGlvQ29udHJvbGxlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFbnN1cmUgYWxsIGFjaGlldmVtZW50cyBleGlzdCBpbiBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVBY2hpZXZlbWVudHMoKSB7XG4gICAgICAgIC8vIElmIGFjaGlldmVtZW50cyBhcnJheSBpcyBlbXB0eSBvciBtaXNzaW5nIGRlZmluaXRpb25zLCBzeW5jIGl0XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5hY2hpZXZlbWVudHMpIHRoaXMuc2V0dGluZ3MuYWNoaWV2ZW1lbnRzID0gW107XG5cbiAgICAgICAgQUNISUVWRU1FTlRfREVGSU5JVElPTlMuZm9yRWFjaChkZWYgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXhpc3RzID0gdGhpcy5zZXR0aW5ncy5hY2hpZXZlbWVudHMuZmluZChhID0+IGEuaWQgPT09IGRlZi5pZCk7XG4gICAgICAgICAgICBpZiAoIWV4aXN0cykge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuYWNoaWV2ZW1lbnRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAuLi5kZWYsXG4gICAgICAgICAgICAgICAgICAgIHVubG9ja2VkOiBmYWxzZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB0cmFja0RhaWx5TWV0cmljcyh0eXBlOiAncXVlc3RfY29tcGxldGUnIHwgJ3F1ZXN0X2ZhaWwnIHwgJ3hwJyB8ICdnb2xkJyB8ICdkYW1hZ2UnIHwgJ3NraWxsX2xldmVsJyB8ICdjaGFpbl9jb21wbGV0ZScsIGFtb3VudDogbnVtYmVyID0gMSkge1xuICAgICAgICBjb25zdCB0b2RheSA9IG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIFxuICAgICAgICBsZXQgbWV0cmljID0gdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzLmZpbmQobSA9PiBtLmRhdGUgPT09IHRvZGF5KTtcbiAgICAgICAgaWYgKCFtZXRyaWMpIHtcbiAgICAgICAgICAgIG1ldHJpYyA9IHsgZGF0ZTogdG9kYXksIHF1ZXN0c0NvbXBsZXRlZDogMCwgcXVlc3RzRmFpbGVkOiAwLCB4cEVhcm5lZDogMCwgZ29sZEVhcm5lZDogMCwgZGFtYWdlc1Rha2VuOiAwLCBza2lsbHNMZXZlbGVkOiBbXSwgY2hhaW5zQ29tcGxldGVkOiAwIH07XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MucHVzaChtZXRyaWMpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgXCJxdWVzdF9jb21wbGV0ZVwiOiBtZXRyaWMucXVlc3RzQ29tcGxldGVkICs9IGFtb3VudDsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwicXVlc3RfZmFpbFwiOiBtZXRyaWMucXVlc3RzRmFpbGVkICs9IGFtb3VudDsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwieHBcIjogbWV0cmljLnhwRWFybmVkICs9IGFtb3VudDsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiZ29sZFwiOiBtZXRyaWMuZ29sZEVhcm5lZCArPSBhbW91bnQ7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImRhbWFnZVwiOiBtZXRyaWMuZGFtYWdlc1Rha2VuICs9IGFtb3VudDsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwic2tpbGxfbGV2ZWxcIjogbWV0cmljLnNraWxsc0xldmVsZWQucHVzaChcIlNraWxsIGxldmVsZWRcIik7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImNoYWluX2NvbXBsZXRlXCI6IG1ldHJpYy5jaGFpbnNDb21wbGV0ZWQgKz0gYW1vdW50OyBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXIgQWNoaWV2ZW1lbnQgQ2hlY2sgYWZ0ZXIgZXZlcnkgbWV0cmljIHVwZGF0ZVxuICAgICAgICB0aGlzLmNoZWNrQWNoaWV2ZW1lbnRzKCk7XG4gICAgfVxuXG4gIHVwZGF0ZVN0cmVhaygpIHtcbiAgICAgICAgY29uc3QgdG9kYXkgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBjb25zdCBsYXN0RGF0ZSA9IHRoaXMuc2V0dGluZ3Muc3RyZWFrLmxhc3REYXRlO1xuICAgICAgICBcbiAgICAgICAgaWYgKGxhc3REYXRlICE9PSB0b2RheSkge1xuICAgICAgICAgICAgY29uc3QgeWVzdGVyZGF5ID0gbW9tZW50KCkuc3VidHJhY3QoMSwgJ2RheScpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgICAgICBpZiAobGFzdERhdGUgPT09IHllc3RlcmRheSkge1xuICAgICAgICAgICAgICAgIC8vIENvbnRpbnVlZCBmcm9tIHllc3RlcmRheVxuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc3RyZWFrLmN1cnJlbnQrKztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIWxhc3REYXRlKSB7XG4gICAgICAgICAgICAgICAgLy8gRmlyc3QgZXZlciBxdWVzdFxuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc3RyZWFrLmN1cnJlbnQgPSAxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBCcm9rZW4gc3RyZWFrXG4gICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5zdHJlYWsuY3VycmVudCA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0aGlzLnNldHRpbmdzLnN0cmVhay5jdXJyZW50ID4gdGhpcy5zZXR0aW5ncy5zdHJlYWsubG9uZ2VzdCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc3RyZWFrLmxvbmdlc3QgPSB0aGlzLnNldHRpbmdzLnN0cmVhay5jdXJyZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnN0cmVhay5sYXN0RGF0ZSA9IHRvZGF5O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBbHdheXMgY2hlY2sgYWNoaWV2ZW1lbnRzXG4gICAgICAgIHRoaXMuY2hlY2tBY2hpZXZlbWVudHMoKTtcbiAgICB9XG5cbiAgICBjaGVja0FjaGlldmVtZW50cygpIHtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplQWNoaWV2ZW1lbnRzKCk7XG4gICAgICAgIGNvbnN0IHMgPSB0aGlzLnNldHRpbmdzO1xuICAgICAgICBjb25zdCB0b3RhbFF1ZXN0cyA9IHMuZGF5TWV0cmljcy5yZWR1Y2UoKHN1bSwgbSkgPT4gc3VtICsgbS5xdWVzdHNDb21wbGV0ZWQsIDApO1xuXG4gICAgICAgIC8vIDEuIEZpcnN0IEJsb29kXG4gICAgICAgIGlmICh0b3RhbFF1ZXN0cyA+PSAxKSB0aGlzLnVubG9jayhcImZpcnN0X2Jsb29kXCIpO1xuXG4gICAgICAgIC8vIDIuIFdhcm0gVXBcbiAgICAgICAgaWYgKHRvdGFsUXVlc3RzID49IDEwKSB0aGlzLnVubG9jayhcIndhcm1fdXBcIik7XG5cbiAgICAgICAgLy8gMy4gV2VlayBXYXJyaW9yXG4gICAgICAgIGlmIChzLnN0cmVhay5jdXJyZW50ID49IDcpIHRoaXMudW5sb2NrKFwid2Vla193YXJyaW9yXCIpO1xuXG4gICAgICAgIC8vIDQuIFNraWxsIEFkZXB0XG4gICAgICAgIGlmIChzLnNraWxscy5zb21lKHNraWxsID0+IHNraWxsLmxldmVsID49IDUpKSB0aGlzLnVubG9jayhcInNraWxsX2FkZXB0XCIpO1xuXG4gICAgICAgIC8vIDUuIENoYWluIEdhbmdcbiAgICAgICAgaWYgKHMuY2hhaW5IaXN0b3J5Lmxlbmd0aCA+PSAxKSB0aGlzLnVubG9jayhcImNoYWluX2dhbmdcIik7XG5cbiAgICAgICAgLy8gNi4gUmVzZWFyY2hlclxuICAgICAgICBpZiAocy5yZXNlYXJjaFN0YXRzLnJlc2VhcmNoQ29tcGxldGVkID49IDUpIHRoaXMudW5sb2NrKFwicmVzZWFyY2hlclwiKTtcblxuICAgICAgICAvLyA3LiBDYXBpdGFsaXN0XG4gICAgICAgIGlmIChzLmdvbGQgPj0gNTAwKSB0aGlzLnVubG9jayhcInJpY2hcIik7XG5cbiAgICAgICAgLy8gOC4gR2lhbnQgU2xheWVyXG4gICAgICAgIGlmIChzLmJvc3NNaWxlc3RvbmVzLnNvbWUoYiA9PiBiLmRlZmVhdGVkKSkgdGhpcy51bmxvY2soXCJib3NzX3NsYXllclwiKTtcblxuICAgICAgICAvLyA5LiBBc2NlbmRlZFxuICAgICAgICBpZiAocy5sZXZlbCA+PSA1MCkgdGhpcy51bmxvY2soXCJhc2NlbmRlZFwiKTtcblxuICAgICAgICAvLyAxMC4gSW1tb3J0YWxcbiAgICAgICAgaWYgKHMubGV2ZWwgPj0gMjAgJiYgcy5sZWdhY3kuZGVhdGhDb3VudCA9PT0gMCkgdGhpcy51bmxvY2soXCJpbW1vcnRhbFwiKTtcbiAgICB9XG5cbiAgICB1bmxvY2soaWQ6IHN0cmluZykge1xuICAgICAgICBjb25zdCBhY2ggPSB0aGlzLnNldHRpbmdzLmFjaGlldmVtZW50cy5maW5kKGEgPT4gYS5pZCA9PT0gaWQpO1xuICAgICAgICBpZiAoYWNoICYmICFhY2gudW5sb2NrZWQpIHtcbiAgICAgICAgICAgIGFjaC51bmxvY2tlZCA9IHRydWU7XG4gICAgICAgICAgICBhY2gudW5sb2NrZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcikgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgICAgIC8vIFdlIHJldHVybiB0cnVlIHNvIHRoZSBjYWxsZXIgY2FuIHNob3cgYSBub3RpY2UgaWYgdGhleSB3YW50LCBcbiAgICAgICAgICAgIC8vIHRob3VnaCB1c3VhbGx5IHRoZSBOb3RpY2UgaXMgYmV0dGVyIGhhbmRsZWQgaGVyZSBpZiB3ZSBoYWQgYWNjZXNzIHRvIHRoYXQgQVBJIGVhc2lseSwgXG4gICAgICAgICAgICAvLyBvciBsZXQgdGhlIGVuZ2luZSBoYW5kbGUgdGhlIG5vdGlmaWNhdGlvbi5cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIC4uLiAoS2VlcCBleGlzdGluZyBib3NzL3JlcG9ydCBtZXRob2RzIGJlbG93IGFzIHRoZXkgd2VyZSkgLi4uXG4gICAgaW5pdGlhbGl6ZUJvc3NNaWxlc3RvbmVzKCkge1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMgPSBbXG4gICAgICAgICAgICAgICAgeyBsZXZlbDogMTAsIG5hbWU6IFwiVGhlIEZpcnN0IFRyaWFsXCIsIHVubG9ja2VkOiBmYWxzZSwgZGVmZWF0ZWQ6IGZhbHNlLCB4cFJld2FyZDogNTAwIH0sXG4gICAgICAgICAgICAgICAgeyBsZXZlbDogMjAsIG5hbWU6IFwiVGhlIE5lbWVzaXMgUmV0dXJuc1wiLCB1bmxvY2tlZDogZmFsc2UsIGRlZmVhdGVkOiBmYWxzZSwgeHBSZXdhcmQ6IDEwMDAgfSxcbiAgICAgICAgICAgICAgICB7IGxldmVsOiAzMCwgbmFtZTogXCJUaGUgUmVhcGVyIEF3YWtlbnNcIiwgdW5sb2NrZWQ6IGZhbHNlLCBkZWZlYXRlZDogZmFsc2UsIHhwUmV3YXJkOiAxNTAwIH0sXG4gICAgICAgICAgICAgICAgeyBsZXZlbDogNTAsIG5hbWU6IFwiVGhlIEZpbmFsIEFzY2Vuc2lvblwiLCB1bmxvY2tlZDogZmFsc2UsIGRlZmVhdGVkOiBmYWxzZSwgeHBSZXdhcmQ6IDUwMDAgfVxuICAgICAgICAgICAgXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNoZWNrQm9zc01pbGVzdG9uZXMoKTogc3RyaW5nW10ge1xuICAgICAgICBjb25zdCBtZXNzYWdlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzIHx8IHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMubGVuZ3RoID09PSAwKSB0aGlzLmluaXRpYWxpemVCb3NzTWlsZXN0b25lcygpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcy5mb3JFYWNoKChib3NzOiBCb3NzTWlsZXN0b25lKSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5sZXZlbCA+PSBib3NzLmxldmVsICYmICFib3NzLnVubG9ja2VkKSB7XG4gICAgICAgICAgICAgICAgYm9zcy51bmxvY2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgbWVzc2FnZXMucHVzaChgQm9zcyBVbmxvY2tlZDogJHtib3NzLm5hbWV9IChMZXZlbCAke2Jvc3MubGV2ZWx9KWApO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcikgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBtZXNzYWdlcztcbiAgICB9XG5cbiAgICBkZWZlYXRCb3NzKGxldmVsOiBudW1iZXIpOiB7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgeHBSZXdhcmQ6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgYm9zcyA9IHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMuZmluZCgoYjogQm9zc01pbGVzdG9uZSkgPT4gYi5sZXZlbCA9PT0gbGV2ZWwpO1xuICAgICAgICBpZiAoIWJvc3MpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIkJvc3Mgbm90IGZvdW5kXCIsIHhwUmV3YXJkOiAwIH07XG4gICAgICAgIGlmIChib3NzLmRlZmVhdGVkKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJCb3NzIGFscmVhZHkgZGVmZWF0ZWRcIiwgeHBSZXdhcmQ6IDAgfTtcbiAgICAgICAgXG4gICAgICAgIGJvc3MuZGVmZWF0ZWQgPSB0cnVlO1xuICAgICAgICBib3NzLmRlZmVhdGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MueHAgKz0gYm9zcy54cFJld2FyZDtcbiAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyKSB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICBpZiAobGV2ZWwgPT09IDUwKSB0aGlzLndpbkdhbWUoKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBCb3NzIERlZmVhdGVkOiAke2Jvc3MubmFtZX0hICske2Jvc3MueHBSZXdhcmR9IFhQYCwgeHBSZXdhcmQ6IGJvc3MueHBSZXdhcmQgfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHdpbkdhbWUoKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZ2FtZVdvbiA9IHRydWU7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZW5kR2FtZURhdGUgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcikgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICB9XG5cbiAgICBnZW5lcmF0ZVdlZWtseVJlcG9ydCgpOiBXZWVrbHlSZXBvcnQge1xuICAgICAgICBjb25zdCB3ZWVrID0gbW9tZW50KCkud2VlaygpO1xuICAgICAgICBjb25zdCBzdGFydERhdGUgPSBtb21lbnQoKS5zdGFydE9mKCd3ZWVrJykuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgY29uc3QgZW5kRGF0ZSA9IG1vbWVudCgpLmVuZE9mKCd3ZWVrJykuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdlZWtNZXRyaWNzID0gdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzLmZpbHRlcigobTogRGF5TWV0cmljcykgPT4gXG4gICAgICAgICAgICBtb21lbnQobS5kYXRlKS5pc0JldHdlZW4obW9tZW50KHN0YXJ0RGF0ZSksIG1vbWVudChlbmREYXRlKSwgbnVsbCwgJ1tdJylcbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRvdGFsUXVlc3RzID0gd2Vla01ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogRGF5TWV0cmljcykgPT4gc3VtICsgbS5xdWVzdHNDb21wbGV0ZWQsIDApO1xuICAgICAgICBjb25zdCB0b3RhbEZhaWxlZCA9IHdlZWtNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0ucXVlc3RzRmFpbGVkLCAwKTtcbiAgICAgICAgY29uc3Qgc3VjY2Vzc1JhdGUgPSB0b3RhbFF1ZXN0cyArIHRvdGFsRmFpbGVkID4gMCA/IE1hdGgucm91bmQoKHRvdGFsUXVlc3RzIC8gKHRvdGFsUXVlc3RzICsgdG90YWxGYWlsZWQpKSAqIDEwMCkgOiAwO1xuICAgICAgICBjb25zdCB0b3RhbFhwID0gd2Vla01ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogRGF5TWV0cmljcykgPT4gc3VtICsgbS54cEVhcm5lZCwgMCk7XG4gICAgICAgIGNvbnN0IHRvdGFsR29sZCA9IHdlZWtNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0uZ29sZEVhcm5lZCwgMCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0b3BTa2lsbHMgPSB0aGlzLnNldHRpbmdzLnNraWxscy5zb3J0KChhOiBhbnksIGI6IGFueSkgPT4gKGIubGV2ZWwgLSBhLmxldmVsKSkuc2xpY2UoMCwgMykubWFwKChzOiBhbnkpID0+IHMubmFtZSk7XG4gICAgICAgIGNvbnN0IGJlc3REYXkgPSB3ZWVrTWV0cmljcy5sZW5ndGggPiAwID8gd2Vla01ldHJpY3MucmVkdWNlKChtYXg6IERheU1ldHJpY3MsIG06IERheU1ldHJpY3MpID0+IG0ucXVlc3RzQ29tcGxldGVkID4gbWF4LnF1ZXN0c0NvbXBsZXRlZCA/IG0gOiBtYXgpLmRhdGUgOiBzdGFydERhdGU7XG4gICAgICAgIGNvbnN0IHdvcnN0RGF5ID0gd2Vla01ldHJpY3MubGVuZ3RoID4gMCA/IHdlZWtNZXRyaWNzLnJlZHVjZSgobWluOiBEYXlNZXRyaWNzLCBtOiBEYXlNZXRyaWNzKSA9PiBtLnF1ZXN0c0ZhaWxlZCA+IG1pbi5xdWVzdHNGYWlsZWQgPyBtIDogbWluKS5kYXRlIDogc3RhcnREYXRlO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVwb3J0OiBXZWVrbHlSZXBvcnQgPSB7IHdlZWssIHN0YXJ0RGF0ZSwgZW5kRGF0ZSwgdG90YWxRdWVzdHMsIHN1Y2Nlc3NSYXRlLCB0b3RhbFhwLCB0b3RhbEdvbGQsIHRvcFNraWxscywgYmVzdERheSwgd29yc3REYXkgfTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy53ZWVrbHlSZXBvcnRzLnB1c2gocmVwb3J0KTtcbiAgICAgICAgcmV0dXJuIHJlcG9ydDtcbiAgICB9XG5cbiAgICB1bmxvY2tBY2hpZXZlbWVudChhY2hpZXZlbWVudElkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhIG1hbnVhbCBvdmVycmlkZSBpZiBuZWVkZWQsIGxvZ2ljIGlzIG1vc3RseSBpbiBjaGVja0FjaGlldmVtZW50cyBub3dcbiAgICAgICAgdGhpcy5jaGVja0FjaGlldmVtZW50cygpO1xuICAgICAgICByZXR1cm4gdHJ1ZTsgXG4gICAgfVxuXG4gICAgZ2V0R2FtZVN0YXRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbGV2ZWw6IHRoaXMuc2V0dGluZ3MubGV2ZWwsXG4gICAgICAgICAgICBjdXJyZW50U3RyZWFrOiB0aGlzLnNldHRpbmdzLnN0cmVhay5jdXJyZW50LFxuICAgICAgICAgICAgbG9uZ2VzdFN0cmVhazogdGhpcy5zZXR0aW5ncy5zdHJlYWsubG9uZ2VzdCxcbiAgICAgICAgICAgIHRvdGFsUXVlc3RzOiB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogRGF5TWV0cmljcykgPT4gc3VtICsgbS5xdWVzdHNDb21wbGV0ZWQsIDApLFxuICAgICAgICAgICAgdG90YWxYcDogdGhpcy5zZXR0aW5ncy54cCArIHRoaXMuc2V0dGluZ3MuZGF5TWV0cmljcy5yZWR1Y2UoKHN1bTogbnVtYmVyLCBtOiBEYXlNZXRyaWNzKSA9PiBzdW0gKyBtLnhwRWFybmVkLCAwKSxcbiAgICAgICAgICAgIGdhbWVXb246IHRoaXMuc2V0dGluZ3MuZ2FtZVdvbixcbiAgICAgICAgICAgIGJvc3Nlc0RlZmVhdGVkOiB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmZpbHRlcigoYjogQm9zc01pbGVzdG9uZSkgPT4gYi5kZWZlYXRlZCkubGVuZ3RoLFxuICAgICAgICAgICAgdG90YWxCb3NzZXM6IHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMubGVuZ3RoXG4gICAgICAgIH07XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgbW9tZW50IH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgU2lzeXBodXNTZXR0aW5ncyB9IGZyb20gJy4uL3R5cGVzJztcblxuLyoqXG4gKiBETEMgMzogTWVkaXRhdGlvbiAmIFJlY292ZXJ5IEVuZ2luZVxuICogSGFuZGxlcyBsb2NrZG93biBzdGF0ZSwgbWVkaXRhdGlvbiBoZWFsaW5nLCBhbmQgcXVlc3QgZGVsZXRpb24gcXVvdGFcbiAqIFxuICogSVNPTEFURUQ6IE9ubHkgcmVhZHMvd3JpdGVzIHRvIGxvY2tkb3duVW50aWwsIGlzTWVkaXRhdGluZywgbWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93biwgXG4gKiAgICAgICAgICAgcXVlc3REZWxldGlvbnNUb2RheSwgbGFzdERlbGV0aW9uUmVzZXRcbiAqIERFUEVOREVOQ0lFUzogbW9tZW50LCBTaXN5cGh1c1NldHRpbmdzXG4gKiBTSURFIEVGRkVDVFM6IFBsYXlzIGF1ZGlvICg0MzIgSHogdG9uZSlcbiAqL1xuZXhwb3J0IGNsYXNzIE1lZGl0YXRpb25FbmdpbmUge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIGF1ZGlvQ29udHJvbGxlcj86IGFueTsgLy8gT3B0aW9uYWwgZm9yIDQzMiBIeiBzb3VuZFxuICAgIHByaXZhdGUgbWVkaXRhdGlvbkNvb2xkb3duTXMgPSAzMDAwMDsgLy8gMzAgc2Vjb25kc1xuXG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3MsIGF1ZGlvQ29udHJvbGxlcj86IGFueSkge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyID0gYXVkaW9Db250cm9sbGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGN1cnJlbnRseSBsb2NrZWQgZG93blxuICAgICAqL1xuICAgIGlzTG9ja2VkRG93bigpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwpIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIG1vbWVudCgpLmlzQmVmb3JlKG1vbWVudCh0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbG9ja2Rvd24gdGltZSByZW1haW5pbmcgaW4gbWludXRlc1xuICAgICAqL1xuICAgIGdldExvY2tkb3duVGltZVJlbWFpbmluZygpOiB7IGhvdXJzOiBudW1iZXI7IG1pbnV0ZXM6IG51bWJlcjsgdG90YWxNaW51dGVzOiBudW1iZXIgfSB7XG4gICAgICAgIGlmICghdGhpcy5pc0xvY2tlZERvd24oKSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgaG91cnM6IDAsIG1pbnV0ZXM6IDAsIHRvdGFsTWludXRlczogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0b3RhbE1pbnV0ZXMgPSBtb21lbnQodGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsKS5kaWZmKG1vbWVudCgpLCAnbWludXRlcycpO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IodG90YWxNaW51dGVzIC8gNjApO1xuICAgICAgICBjb25zdCBtaW51dGVzID0gdG90YWxNaW51dGVzICUgNjA7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBob3VycywgbWludXRlcywgdG90YWxNaW51dGVzIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJpZ2dlciBsb2NrZG93biBhZnRlciB0YWtpbmcgNTArIGRhbWFnZVxuICAgICAqL1xuICAgIHRyaWdnZXJMb2NrZG93bigpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsID0gbW9tZW50KCkuYWRkKDYsICdob3VycycpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93biA9IDA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybSBvbmUgbWVkaXRhdGlvbiBjeWNsZSAoY2xpY2spXG4gICAgICogUmV0dXJuczogeyBzdWNjZXNzLCBjeWNsZXNEb25lLCBjeWNsZXNSZW1haW5pbmcsIG1lc3NhZ2UgfVxuICAgICAqL1xuICAgIG1lZGl0YXRlKCk6IHsgc3VjY2VzczogYm9vbGVhbjsgY3ljbGVzRG9uZTogbnVtYmVyOyBjeWNsZXNSZW1haW5pbmc6IG51bWJlcjsgbWVzc2FnZTogc3RyaW5nOyBsb2NrZG93blJlZHVjZWQ6IGJvb2xlYW4gfSB7XG4gICAgICAgIGlmICghdGhpcy5pc0xvY2tlZERvd24oKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBjeWNsZXNEb25lOiAwLFxuICAgICAgICAgICAgICAgIGN5Y2xlc1JlbWFpbmluZzogMCxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIk5vdCBpbiBsb2NrZG93bi4gTm8gbmVlZCB0byBtZWRpdGF0ZS5cIixcbiAgICAgICAgICAgICAgICBsb2NrZG93blJlZHVjZWQ6IGZhbHNlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5pc01lZGl0YXRpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgY3ljbGVzRG9uZTogdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duLFxuICAgICAgICAgICAgICAgIGN5Y2xlc1JlbWFpbmluZzogTWF0aC5tYXgoMCwgMTAgLSB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24pLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiQWxyZWFkeSBtZWRpdGF0aW5nLiBXYWl0IDMwIHNlY29uZHMuXCIsXG4gICAgICAgICAgICAgICAgbG9ja2Rvd25SZWR1Y2VkOiBmYWxzZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5pc01lZGl0YXRpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24rKztcbiAgICAgICAgXG4gICAgICAgIC8vIFBsYXkgaGVhbGluZyBmcmVxdWVuY3lcbiAgICAgICAgdGhpcy5wbGF5TWVkaXRhdGlvblNvdW5kKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZW1haW5pbmcgPSAxMCAtIHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bjtcbiAgICAgICAgbGV0IGxvY2tkb3duUmVkdWNlZCA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgMTAgY3ljbGVzIGNvbXBsZXRlXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24gPj0gMTApIHtcbiAgICAgICAgICAgIGNvbnN0IHJlZHVjZWRUaW1lID0gbW9tZW50KHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCkuc3VidHJhY3QoNSwgJ2hvdXJzJyk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwgPSByZWR1Y2VkVGltZS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duID0gMDtcbiAgICAgICAgICAgIGxvY2tkb3duUmVkdWNlZCA9IHRydWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcj8ucGxheVNvdW5kKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQXV0by1yZXNldCBtZWRpdGF0aW9uIGZsYWcgYWZ0ZXIgY29vbGRvd25cbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaXNNZWRpdGF0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICB9LCB0aGlzLm1lZGl0YXRpb25Db29sZG93bk1zKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGN5Y2xlc0RvbmU6IDAsXG4gICAgICAgICAgICAgICAgY3ljbGVzUmVtYWluaW5nOiAwLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiTWVkaXRhdGlvbiBjb21wbGV0ZS4gTG9ja2Rvd24gcmVkdWNlZCBieSA1IGhvdXJzLlwiLFxuICAgICAgICAgICAgICAgIGxvY2tkb3duUmVkdWNlZDogdHJ1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQXV0by1yZXNldCBtZWRpdGF0aW9uIGZsYWcgYWZ0ZXIgY29vbGRvd25cbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmlzTWVkaXRhdGluZyA9IGZhbHNlO1xuICAgICAgICB9LCB0aGlzLm1lZGl0YXRpb25Db29sZG93bk1zKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgY3ljbGVzRG9uZTogdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duLFxuICAgICAgICAgICAgY3ljbGVzUmVtYWluaW5nOiByZW1haW5pbmcsXG4gICAgICAgICAgICBtZXNzYWdlOiBgTWVkaXRhdGlvbiAoJHt0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd259LzEwKSAtICR7cmVtYWluaW5nfSBjeWNsZXMgbGVmdGAsXG4gICAgICAgICAgICBsb2NrZG93blJlZHVjZWQ6IGZhbHNlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGxheSA0MzIgSHogaGVhbGluZyBmcmVxdWVuY3kgZm9yIDEgc2Vjb25kXG4gICAgICovXG4gICAgcHJpdmF0ZSBwbGF5TWVkaXRhdGlvblNvdW5kKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgYXVkaW9Db250ZXh0ID0gbmV3ICh3aW5kb3cuQXVkaW9Db250ZXh0IHx8ICh3aW5kb3cgYXMgYW55KS53ZWJraXRBdWRpb0NvbnRleHQpKCk7XG4gICAgICAgICAgICBjb25zdCBvc2NpbGxhdG9yID0gYXVkaW9Db250ZXh0LmNyZWF0ZU9zY2lsbGF0b3IoKTtcbiAgICAgICAgICAgIGNvbnN0IGdhaW5Ob2RlID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgb3NjaWxsYXRvci5mcmVxdWVuY3kudmFsdWUgPSA0MzI7XG4gICAgICAgICAgICBvc2NpbGxhdG9yLnR5cGUgPSBcInNpbmVcIjtcbiAgICAgICAgICAgIGdhaW5Ob2RlLmdhaW4uc2V0VmFsdWVBdFRpbWUoMC4zLCBhdWRpb0NvbnRleHQuY3VycmVudFRpbWUpO1xuICAgICAgICAgICAgZ2Fpbk5vZGUuZ2Fpbi5leHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lKDAuMDEsIGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZSArIDEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBvc2NpbGxhdG9yLmNvbm5lY3QoZ2Fpbk5vZGUpO1xuICAgICAgICAgICAgZ2Fpbk5vZGUuY29ubmVjdChhdWRpb0NvbnRleHQuZGVzdGluYXRpb24pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBvc2NpbGxhdG9yLnN0YXJ0KGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZSk7XG4gICAgICAgICAgICBvc2NpbGxhdG9yLnN0b3AoYXVkaW9Db250ZXh0LmN1cnJlbnRUaW1lICsgMSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW8gbm90IGF2YWlsYWJsZSBmb3IgbWVkaXRhdGlvblwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBtZWRpdGF0aW9uIHN0YXR1cyBmb3IgY3VycmVudCBsb2NrZG93blxuICAgICAqL1xuICAgIGdldE1lZGl0YXRpb25TdGF0dXMoKTogeyBjeWNsZXNEb25lOiBudW1iZXI7IGN5Y2xlc1JlbWFpbmluZzogbnVtYmVyOyB0aW1lUmVkdWNlZDogbnVtYmVyIH0ge1xuICAgICAgICBjb25zdCBjeWNsZXNEb25lID0gdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duO1xuICAgICAgICBjb25zdCBjeWNsZXNSZW1haW5pbmcgPSBNYXRoLm1heCgwLCAxMCAtIGN5Y2xlc0RvbmUpO1xuICAgICAgICBjb25zdCB0aW1lUmVkdWNlZCA9ICgxMCAtIGN5Y2xlc1JlbWFpbmluZykgKiAzMDsgLy8gMzAgbWluIHBlciBjeWNsZVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGN5Y2xlc0RvbmUsXG4gICAgICAgICAgICBjeWNsZXNSZW1haW5pbmcsXG4gICAgICAgICAgICB0aW1lUmVkdWNlZFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlc2V0IGRlbGV0aW9uIHF1b3RhIGlmIG5ldyBkYXlcbiAgICAgKi9cbiAgICBwcml2YXRlIGVuc3VyZURlbGV0aW9uUXVvdGFSZXNldCgpIHtcbiAgICAgICAgY29uc3QgdG9kYXkgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubGFzdERlbGV0aW9uUmVzZXQgIT09IHRvZGF5KSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxhc3REZWxldGlvblJlc2V0ID0gdG9kYXk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkgPSAwO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdXNlciBoYXMgZnJlZSBkZWxldGlvbnMgbGVmdCB0b2RheVxuICAgICAqL1xuICAgIGNhbkRlbGV0ZVF1ZXN0RnJlZSgpOiBib29sZWFuIHtcbiAgICAgICAgdGhpcy5lbnN1cmVEZWxldGlvblF1b3RhUmVzZXQoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSA8IDM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGRlbGV0aW9uIHF1b3RhIHN0YXR1c1xuICAgICAqL1xuICAgIGdldERlbGV0aW9uUXVvdGEoKTogeyBmcmVlOiBudW1iZXI7IHBhaWQ6IG51bWJlcjsgcmVtYWluaW5nOiBudW1iZXIgfSB7XG4gICAgICAgIHRoaXMuZW5zdXJlRGVsZXRpb25RdW90YVJlc2V0KCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZW1haW5pbmcgPSBNYXRoLm1heCgwLCAzIC0gdGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5KTtcbiAgICAgICAgY29uc3QgcGFpZCA9IE1hdGgubWF4KDAsIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSAtIDMpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGZyZWU6IHJlbWFpbmluZyxcbiAgICAgICAgICAgIHBhaWQ6IHBhaWQsXG4gICAgICAgICAgICByZW1haW5pbmc6IHJlbWFpbmluZ1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgY29zdCBvZiB0aGUgbmV4dCBkZWxldGlvbiB3aXRob3V0IG11dGF0aW5nIHN0YXRlLlxuICAgICAqIFVzZSB0aGlzIHRvIGNoZWNrIGFmZm9yZGFiaWxpdHkgYmVmb3JlIGNhbGxpbmcgYXBwbHlEZWxldGlvbkNvc3QuXG4gICAgICovXG4gICAgZ2V0RGVsZXRpb25Db3N0KCk6IHsgY29zdDogbnVtYmVyOyBtZXNzYWdlOiBzdHJpbmcgfSB7XG4gICAgICAgIHRoaXMuZW5zdXJlRGVsZXRpb25RdW90YVJlc2V0KCk7XG5cbiAgICAgICAgbGV0IGNvc3QgPSAwO1xuICAgICAgICBsZXQgbWVzc2FnZSA9IFwiXCI7XG5cbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSA+PSAzKSB7XG4gICAgICAgICAgICBjb3N0ID0gMTA7XG4gICAgICAgICAgICBtZXNzYWdlID0gYFF1ZXN0IGRlbGV0ZWQuIENvc3Q6IC0ke2Nvc3R9Z2A7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCByZW1haW5pbmcgPSAzIC0gdGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5O1xuICAgICAgICAgICAgbWVzc2FnZSA9IGBRdWVzdCBkZWxldGVkLiAoJHtyZW1haW5pbmcgLSAxfSBmcmVlIGRlbGV0aW9ucyByZW1haW5pbmcpYDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7IGNvc3QsIG1lc3NhZ2UgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBcHBseSBkZWxldGlvbjogaW5jcmVtZW50IHF1b3RhIGFuZCBjaGFyZ2UgZ29sZC4gQ2FsbCBvbmx5IGFmdGVyIGNoZWNraW5nIGdldERlbGV0aW9uQ29zdCgpLlxuICAgICAqIFJldHVybnM6IHsgY29zdCwgbWVzc2FnZSB9XG4gICAgICovXG4gICAgYXBwbHlEZWxldGlvbkNvc3QoKTogeyBjb3N0OiBudW1iZXI7IG1lc3NhZ2U6IHN0cmluZyB9IHtcbiAgICAgICAgY29uc3QgeyBjb3N0LCBtZXNzYWdlIH0gPSB0aGlzLmdldERlbGV0aW9uQ29zdCgpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkrKztcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5nb2xkIC09IGNvc3Q7XG4gICAgICAgIHJldHVybiB7IGNvc3QsIG1lc3NhZ2UgfTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBBcHAsIFRGaWxlLCBOb3RpY2UgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBSZXNlYXJjaFF1ZXN0IH0gZnJvbSAnLi4vdHlwZXMnO1xuXG5leHBvcnQgY2xhc3MgUmVzZWFyY2hFbmdpbmUge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIGF1ZGlvQ29udHJvbGxlcj86IGFueTtcbiAgICBhcHA6IEFwcDsgLy8gQWRkZWQgQXBwIHJlZmVyZW5jZSBmb3IgZmlsZSBvcGVyYXRpb25zXG5cbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncywgYXBwOiBBcHAsIGF1ZGlvQ29udHJvbGxlcj86IGFueSkge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgICAgIHRoaXMuYXBwID0gYXBwO1xuICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlciA9IGF1ZGlvQ29udHJvbGxlcjtcbiAgICB9XG5cbiAgICBhc3luYyBjcmVhdGVSZXNlYXJjaFF1ZXN0KHRpdGxlOiBzdHJpbmcsIHR5cGU6IFwic3VydmV5XCIgfCBcImRlZXBfZGl2ZVwiLCBsaW5rZWRTa2lsbDogc3RyaW5nLCBsaW5rZWRDb21iYXRRdWVzdDogc3RyaW5nKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgcXVlc3RJZD86IHN0cmluZyB9PiB7XG4gICAgICAgIC8vIFtGSVhdIEFsbG93IGZpcnN0IHJlc2VhcmNoIHF1ZXN0IGZvciBmcmVlIChDb2xkIFN0YXJ0KSwgb3RoZXJ3aXNlIGVuZm9yY2UgMjoxXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMudG90YWxSZXNlYXJjaCA+IDAgJiYgIXRoaXMuY2FuQ3JlYXRlUmVzZWFyY2hRdWVzdCgpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiUkVTRUFSQ0ggQkxPQ0tFRDogQ29tcGxldGUgMiBjb21iYXQgcXVlc3RzIHBlciByZXNlYXJjaCBxdWVzdFwiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCB3b3JkTGltaXQgPSB0eXBlID09PSBcInN1cnZleVwiID8gMjAwIDogNDAwO1xuICAgICAgICBjb25zdCBxdWVzdElkID0gYHJlc2VhcmNoXyR7KHRoaXMuc2V0dGluZ3MubGFzdFJlc2VhcmNoUXVlc3RJZCB8fCAwKSArIDF9YDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJlc2VhcmNoUXVlc3Q6IFJlc2VhcmNoUXVlc3QgPSB7XG4gICAgICAgICAgICBpZDogcXVlc3RJZCxcbiAgICAgICAgICAgIHRpdGxlOiB0aXRsZSxcbiAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICBsaW5rZWRTa2lsbDogbGlua2VkU2tpbGwsXG4gICAgICAgICAgICB3b3JkTGltaXQ6IHdvcmRMaW1pdCxcbiAgICAgICAgICAgIHdvcmRDb3VudDogMCxcbiAgICAgICAgICAgIGxpbmtlZENvbWJhdFF1ZXN0OiBsaW5rZWRDb21iYXRRdWVzdCxcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgY29tcGxldGVkOiBmYWxzZVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFtGSVhdIENyZWF0ZSBhY3R1YWwgTWFya2Rvd24gZmlsZVxuICAgICAgICBjb25zdCBmb2xkZXJQYXRoID0gXCJBY3RpdmVfUnVuL1Jlc2VhcmNoXCI7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZvbGRlclBhdGgpKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZm9sZGVyUGF0aCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzYWZlVGl0bGUgPSB0aXRsZS5yZXBsYWNlKC9bXmEtejAtOV0vZ2ksICdfJykudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBgJHtmb2xkZXJQYXRofS8ke3NhZmVUaXRsZX0ubWRgO1xuICAgICAgICBjb25zdCBjb250ZW50ID0gYC0tLVxudHlwZTogcmVzZWFyY2hcbnJlc2VhcmNoX2lkOiAke3F1ZXN0SWR9XG5zdGF0dXM6IGFjdGl2ZVxubGlua2VkX3NraWxsOiAke2xpbmtlZFNraWxsfVxud29yZF9saW1pdDogJHt3b3JkTGltaXR9XG5jcmVhdGVkOiAke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKX1cbi0tLVxuIyDwn5OaICR7dGl0bGV9XG4+IFshSU5GT10gUmVzZWFyY2ggR3VpZGVsaW5lc1xuPiAqKlR5cGU6KiogJHt0eXBlfSB8ICoqVGFyZ2V0OioqICR7d29yZExpbWl0fSB3b3Jkc1xuPiAqKkxpbmtlZCBTa2lsbDoqKiAke2xpbmtlZFNraWxsfVxuXG5Xcml0ZSB5b3VyIHJlc2VhcmNoIGhlcmUuLi5cbmA7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShmaWxlbmFtZSwgY29udGVudCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJFcnJvciBjcmVhdGluZyByZXNlYXJjaCBmaWxlLiBDaGVjayBjb25zb2xlLlwiKTtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMucHVzaChyZXNlYXJjaFF1ZXN0KTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0UmVzZWFyY2hRdWVzdElkID0gcGFyc2VJbnQocXVlc3RJZC5zcGxpdCgnXycpWzFdKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnRvdGFsUmVzZWFyY2grKztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogYFJlc2VhcmNoIFF1ZXN0IENyZWF0ZWQ6ICR7dHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IFwiU3VydmV5XCIgOiBcIkRlZXAgRGl2ZVwifWAsXG4gICAgICAgICAgICBxdWVzdElkOiBxdWVzdElkXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgY29tcGxldGVSZXNlYXJjaFF1ZXN0KHF1ZXN0SWQ6IHN0cmluZywgZmluYWxXb3JkQ291bnQ6IG51bWJlcik6IHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyB4cFJld2FyZDogbnVtYmVyOyBnb2xkUGVuYWx0eTogbnVtYmVyIH0ge1xuICAgICAgICBjb25zdCByZXNlYXJjaFF1ZXN0ID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maW5kKHEgPT4gcS5pZCA9PT0gcXVlc3RJZCk7XG4gICAgICAgIGlmICghcmVzZWFyY2hRdWVzdCkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiUmVzZWFyY2ggcXVlc3Qgbm90IGZvdW5kXCIsIHhwUmV3YXJkOiAwLCBnb2xkUGVuYWx0eTogMCB9O1xuICAgICAgICBpZiAocmVzZWFyY2hRdWVzdC5jb21wbGV0ZWQpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIlF1ZXN0IGFscmVhZHkgY29tcGxldGVkXCIsIHhwUmV3YXJkOiAwLCBnb2xkUGVuYWx0eTogMCB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgbWluV29yZHMgPSBNYXRoLmNlaWwocmVzZWFyY2hRdWVzdC53b3JkTGltaXQgKiAwLjgpO1xuICAgICAgICBpZiAoZmluYWxXb3JkQ291bnQgPCBtaW5Xb3Jkcykge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IGBUb28gc2hvcnQhIE5lZWQgJHttaW5Xb3Jkc30gd29yZHMuYCwgeHBSZXdhcmQ6IDAsIGdvbGRQZW5hbHR5OiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChmaW5hbFdvcmRDb3VudCA+IHJlc2VhcmNoUXVlc3Qud29yZExpbWl0ICogMS4yNSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IGBUb28gbG9uZyEgTWF4ICR7TWF0aC5jZWlsKHJlc2VhcmNoUXVlc3Qud29yZExpbWl0ICogMS4yNSl9IHdvcmRzLmAsIHhwUmV3YXJkOiAwLCBnb2xkUGVuYWx0eTogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBsZXQgeHBSZXdhcmQgPSByZXNlYXJjaFF1ZXN0LnR5cGUgPT09IFwic3VydmV5XCIgPyA1IDogMjA7XG4gICAgICAgIGxldCBnb2xkUGVuYWx0eSA9IDA7XG4gICAgICAgIGlmIChmaW5hbFdvcmRDb3VudCA+IHJlc2VhcmNoUXVlc3Qud29yZExpbWl0KSB7XG4gICAgICAgICAgICBjb25zdCBvdmVyYWdlUGVyY2VudCA9ICgoZmluYWxXb3JkQ291bnQgLSByZXNlYXJjaFF1ZXN0LndvcmRMaW1pdCkgLyByZXNlYXJjaFF1ZXN0LndvcmRMaW1pdCkgKiAxMDA7XG4gICAgICAgICAgICBnb2xkUGVuYWx0eSA9IE1hdGguZmxvb3IoMjAgKiAob3ZlcmFnZVBlcmNlbnQgLyAxMDApKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2tpbGwgPSB0aGlzLnNldHRpbmdzLnNraWxscy5maW5kKHMgPT4gcy5uYW1lID09PSByZXNlYXJjaFF1ZXN0LmxpbmtlZFNraWxsKTtcbiAgICAgICAgaWYgKHNraWxsKSB7XG4gICAgICAgICAgICBza2lsbC54cCArPSB4cFJld2FyZDtcbiAgICAgICAgICAgIGlmIChza2lsbC54cCA+PSBza2lsbC54cFJlcSkgeyBza2lsbC5sZXZlbCsrOyBza2lsbC54cCA9IDA7IH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5nb2xkIC09IGdvbGRQZW5hbHR5O1xuICAgICAgICByZXNlYXJjaFF1ZXN0LmNvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgIHJlc2VhcmNoUXVlc3QuY29tcGxldGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy5yZXNlYXJjaENvbXBsZXRlZCsrO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyPy5wbGF5U291bmQpIHRoaXMuYXVkaW9Db250cm9sbGVyLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgIFxuICAgICAgICBsZXQgbWVzc2FnZSA9IGBSZXNlYXJjaCBDb21wbGV0ZSEgKyR7eHBSZXdhcmR9IFhQYDtcbiAgICAgICAgaWYgKGdvbGRQZW5hbHR5ID4gMCkgbWVzc2FnZSArPSBgICgtJHtnb2xkUGVuYWx0eX1nIHRheClgO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZSwgeHBSZXdhcmQsIGdvbGRQZW5hbHR5IH07XG4gICAgfVxuXG4gICAgYXN5bmMgZGVsZXRlUmVzZWFyY2hRdWVzdChxdWVzdElkOiBzdHJpbmcpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nIH0+IHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbmRJbmRleChxID0+IHEuaWQgPT09IHF1ZXN0SWQpO1xuICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdCA9IHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHNbaW5kZXhdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBbRklYXSBUcnkgdG8gZmluZCBhbmQgZGVsZXRlIHRoZSBmaWxlXG4gICAgICAgICAgICBjb25zdCBmaWxlcyA9IHRoaXMuYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKTtcbiAgICAgICAgICAgIGNvbnN0IGZpbGUgPSBmaWxlcy5maW5kKGYgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhY2hlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhY2hlPy5mcm9udG1hdHRlcj8ucmVzZWFyY2hfaWQgPT09IHF1ZXN0SWQ7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKGZpbGUpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5kZWxldGUoZmlsZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIGlmICghcXVlc3QuY29tcGxldGVkKSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMudG90YWxSZXNlYXJjaCA9IE1hdGgubWF4KDAsIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy50b3RhbFJlc2VhcmNoIC0gMSk7XG4gICAgICAgICAgICBlbHNlIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy5yZXNlYXJjaENvbXBsZXRlZCA9IE1hdGgubWF4KDAsIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy5yZXNlYXJjaENvbXBsZXRlZCAtIDEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBcIlJlc2VhcmNoIGRlbGV0ZWRcIiB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIk5vdCBmb3VuZFwiIH07XG4gICAgfVxuXG4gICAgdXBkYXRlUmVzZWFyY2hXb3JkQ291bnQocXVlc3RJZDogc3RyaW5nLCBuZXdXb3JkQ291bnQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCByZXNlYXJjaFF1ZXN0ID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maW5kKHEgPT4gcS5pZCA9PT0gcXVlc3RJZCk7XG4gICAgICAgIGlmIChyZXNlYXJjaFF1ZXN0KSB7XG4gICAgICAgICAgICByZXNlYXJjaFF1ZXN0LndvcmRDb3VudCA9IG5ld1dvcmRDb3VudDtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBnZXRSZXNlYXJjaFJhdGlvKCkge1xuICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cztcbiAgICAgICAgY29uc3QgcmF0aW8gPSBzdGF0cy50b3RhbENvbWJhdCAvIE1hdGgubWF4KDEsIHN0YXRzLnRvdGFsUmVzZWFyY2gpO1xuICAgICAgICByZXR1cm4geyBjb21iYXQ6IHN0YXRzLnRvdGFsQ29tYmF0LCByZXNlYXJjaDogc3RhdHMudG90YWxSZXNlYXJjaCwgcmF0aW86IHJhdGlvLnRvRml4ZWQoMikgfTtcbiAgICB9XG5cbiAgICBjYW5DcmVhdGVSZXNlYXJjaFF1ZXN0KCk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cztcbiAgICAgICAgY29uc3QgcmF0aW8gPSBzdGF0cy50b3RhbENvbWJhdCAvIE1hdGgubWF4KDEsIHN0YXRzLnRvdGFsUmVzZWFyY2gpO1xuICAgICAgICByZXR1cm4gcmF0aW8gPj0gMjtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBRdWVzdENoYWluLCBRdWVzdENoYWluUmVjb3JkIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG4vKipcbiAqIERMQyA0OiBRdWVzdCBDaGFpbnMgRW5naW5lXG4gKiBIYW5kbGVzIG11bHRpLXF1ZXN0IHNlcXVlbmNlcyB3aXRoIG9yZGVyaW5nLCBsb2NraW5nLCBhbmQgY29tcGxldGlvbiB0cmFja2luZ1xuICogXG4gKiBJU09MQVRFRDogT25seSByZWFkcy93cml0ZXMgdG8gYWN0aXZlQ2hhaW5zLCBjaGFpbkhpc3RvcnksIGN1cnJlbnRDaGFpbklkLCBjaGFpblF1ZXN0c0NvbXBsZXRlZFxuICogREVQRU5ERU5DSUVTOiBTaXN5cGh1c1NldHRpbmdzIHR5cGVzXG4gKiBJTlRFR1JBVElPTiBQT0lOVFM6IE5lZWRzIHRvIGhvb2sgaW50byBjb21wbGV0ZVF1ZXN0KCkgaW4gbWFpbiBlbmdpbmUgZm9yIGNoYWluIHByb2dyZXNzaW9uXG4gKi9cbmV4cG9ydCBjbGFzcyBDaGFpbnNFbmdpbmUge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIGF1ZGlvQ29udHJvbGxlcj86IGFueTtcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzLCBhdWRpb0NvbnRyb2xsZXI/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlciA9IGF1ZGlvQ29udHJvbGxlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgcXVlc3QgY2hhaW5cbiAgICAgKi9cbiAgICBhc3luYyBjcmVhdGVRdWVzdENoYWluKG5hbWU6IHN0cmluZywgcXVlc3ROYW1lczogc3RyaW5nW10pOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyBjaGFpbklkPzogc3RyaW5nIH0+IHtcbiAgICAgICAgaWYgKHF1ZXN0TmFtZXMubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIkNoYWluIG11c3QgaGF2ZSBhdCBsZWFzdCAyIHF1ZXN0c1wiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjaGFpbklkID0gYGNoYWluXyR7RGF0ZS5ub3coKX1gO1xuICAgICAgICBjb25zdCBjaGFpbjogUXVlc3RDaGFpbiA9IHtcbiAgICAgICAgICAgIGlkOiBjaGFpbklkLFxuICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgIHF1ZXN0czogcXVlc3ROYW1lcyxcbiAgICAgICAgICAgIGN1cnJlbnRJbmRleDogMCxcbiAgICAgICAgICAgIGNvbXBsZXRlZDogZmFsc2UsXG4gICAgICAgICAgICBzdGFydGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGlzQm9zczogcXVlc3ROYW1lc1txdWVzdE5hbWVzLmxlbmd0aCAtIDFdLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoXCJib3NzXCIpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5wdXNoKGNoYWluKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jdXJyZW50Q2hhaW5JZCA9IGNoYWluSWQ7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBDaGFpbiBjcmVhdGVkOiAke25hbWV9ICgke3F1ZXN0TmFtZXMubGVuZ3RofSBxdWVzdHMpYCxcbiAgICAgICAgICAgIGNoYWluSWQ6IGNoYWluSWRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIGN1cnJlbnQgYWN0aXZlIGNoYWluXG4gICAgICovXG4gICAgZ2V0QWN0aXZlQ2hhaW4oKTogUXVlc3RDaGFpbiB8IG51bGwge1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuY3VycmVudENoYWluSWQpIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5maW5kKGMgPT4gYy5pZCA9PT0gdGhpcy5zZXR0aW5ncy5jdXJyZW50Q2hhaW5JZCk7XG4gICAgICAgIHJldHVybiAoY2hhaW4gJiYgIWNoYWluLmNvbXBsZXRlZCkgPyBjaGFpbiA6IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBuZXh0IHF1ZXN0IHRoYXQgc2hvdWxkIGJlIGNvbXBsZXRlZCBpbiB0aGUgYWN0aXZlIGNoYWluXG4gICAgICovXG4gICAgZ2V0TmV4dFF1ZXN0SW5DaGFpbigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIGlmICghY2hhaW4pIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNoYWluLnF1ZXN0c1tjaGFpbi5jdXJyZW50SW5kZXhdIHx8IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgYSBxdWVzdCBpcyBwYXJ0IG9mIGFuIGFjdGl2ZSAoaW5jb21wbGV0ZSkgY2hhaW5cbiAgICAgKi9cbiAgICBpc1F1ZXN0SW5DaGFpbihxdWVzdE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zLmZpbmQoYyA9PiAhYy5jb21wbGV0ZWQpO1xuICAgICAgICBpZiAoIWNoYWluKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiBjaGFpbi5xdWVzdHMuaW5jbHVkZXMocXVlc3ROYW1lKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBhIHF1ZXN0IGNhbiBiZSBzdGFydGVkIChpcyBpdCB0aGUgbmV4dCBxdWVzdCBpbiB0aGUgY2hhaW4/KVxuICAgICAqL1xuICAgIGNhblN0YXJ0UXVlc3QocXVlc3ROYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIGlmICghY2hhaW4pIHJldHVybiB0cnVlOyAvLyBOb3QgaW4gYSBjaGFpbiwgY2FuIHN0YXJ0IGFueSBxdWVzdFxuICAgICAgICBcbiAgICAgICAgY29uc3QgbmV4dFF1ZXN0ID0gdGhpcy5nZXROZXh0UXVlc3RJbkNoYWluKCk7XG4gICAgICAgIHJldHVybiBuZXh0UXVlc3QgPT09IHF1ZXN0TmFtZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNYXJrIGEgcXVlc3QgYXMgY29tcGxldGVkIGluIHRoZSBjaGFpblxuICAgICAqIEFkdmFuY2VzIGNoYWluIGlmIHN1Y2Nlc3NmdWwsIGF3YXJkcyBib251cyBYUCBpZiBjaGFpbiBjb21wbGV0ZXNcbiAgICAgKi9cbiAgICBhc3luYyBjb21wbGV0ZUNoYWluUXVlc3QocXVlc3ROYW1lOiBzdHJpbmcpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyBjaGFpbkNvbXBsZXRlOiBib29sZWFuOyBib251c1hwOiBudW1iZXIgfT4ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiTm8gYWN0aXZlIGNoYWluXCIsIGNoYWluQ29tcGxldGU6IGZhbHNlLCBib251c1hwOiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRRdWVzdCA9IGNoYWluLnF1ZXN0c1tjaGFpbi5jdXJyZW50SW5kZXhdO1xuICAgICAgICBpZiAoY3VycmVudFF1ZXN0ICE9PSBxdWVzdE5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogXCJRdWVzdCBpcyBub3QgbmV4dCBpbiBjaGFpblwiLFxuICAgICAgICAgICAgICAgIGNoYWluQ29tcGxldGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGJvbnVzWHA6IDBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNoYWluLmN1cnJlbnRJbmRleCsrO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmNoYWluUXVlc3RzQ29tcGxldGVkKys7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBjaGFpbiBpcyBjb21wbGV0ZVxuICAgICAgICBpZiAoY2hhaW4uY3VycmVudEluZGV4ID49IGNoYWluLnF1ZXN0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBsZXRlQ2hhaW4oY2hhaW4pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZW1haW5pbmcgPSBjaGFpbi5xdWVzdHMubGVuZ3RoIC0gY2hhaW4uY3VycmVudEluZGV4O1xuICAgICAgICBjb25zdCBwZXJjZW50ID0gTWF0aC5mbG9vcigoY2hhaW4uY3VycmVudEluZGV4IC8gY2hhaW4ucXVlc3RzLmxlbmd0aCkgKiAxMDApO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBgQ2hhaW4gcHJvZ3Jlc3M6ICR7Y2hhaW4uY3VycmVudEluZGV4fS8ke2NoYWluLnF1ZXN0cy5sZW5ndGh9ICgke3JlbWFpbmluZ30gcmVtYWluaW5nLCAke3BlcmNlbnR9JSBjb21wbGV0ZSlgLFxuICAgICAgICAgICAgY2hhaW5Db21wbGV0ZTogZmFsc2UsXG4gICAgICAgICAgICBib251c1hwOiAwXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29tcGxldGUgdGhlIGVudGlyZSBjaGFpblxuICAgICAqL1xuICAgIHByaXZhdGUgYXN5bmMgY29tcGxldGVDaGFpbihjaGFpbjogUXVlc3RDaGFpbik6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmc7IGNoYWluQ29tcGxldGU6IGJvb2xlYW47IGJvbnVzWHA6IG51bWJlciB9PiB7XG4gICAgICAgIGNoYWluLmNvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgIGNoYWluLmNvbXBsZXRlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYm9udXNYcCA9IDEwMDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy54cCArPSBib251c1hwO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVjb3JkOiBRdWVzdENoYWluUmVjb3JkID0ge1xuICAgICAgICAgICAgY2hhaW5JZDogY2hhaW4uaWQsXG4gICAgICAgICAgICBjaGFpbk5hbWU6IGNoYWluLm5hbWUsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0czogY2hhaW4ucXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIGNvbXBsZXRlZEF0OiBjaGFpbi5jb21wbGV0ZWRBdCxcbiAgICAgICAgICAgIHhwRWFybmVkOiBib251c1hwXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeS5wdXNoKHJlY29yZCk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5hdWRpb0NvbnRyb2xsZXI/LnBsYXlTb3VuZCkge1xuICAgICAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBgQ2hhaW4gY29tcGxldGU6ICR7Y2hhaW4ubmFtZX0hICske2JvbnVzWHB9IFhQIEJvbnVzYCxcbiAgICAgICAgICAgIGNoYWluQ29tcGxldGU6IHRydWUsXG4gICAgICAgICAgICBib251c1hwOiBib251c1hwXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQnJlYWsgYW4gYWN0aXZlIGNoYWluXG4gICAgICogS2VlcHMgZWFybmVkIFhQIGZyb20gY29tcGxldGVkIHF1ZXN0c1xuICAgICAqL1xuICAgIGFzeW5jIGJyZWFrQ2hhaW4oKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgeHBLZXB0OiBudW1iZXIgfT4ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiTm8gYWN0aXZlIGNoYWluIHRvIGJyZWFrXCIsIHhwS2VwdDogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb21wbGV0ZWQgPSBjaGFpbi5jdXJyZW50SW5kZXg7XG4gICAgICAgIGNvbnN0IHhwS2VwdCA9IGNvbXBsZXRlZCAqIDEwOyAvLyBBcHByb3hpbWF0ZSBYUCBmcm9tIGVhY2ggcXVlc3RcbiAgICAgICAgXG4gICAgICAgIC8vIFNhdmUgdG8gaGlzdG9yeSBhcyBicm9rZW5cbiAgICAgICAgY29uc3QgcmVjb3JkOiBRdWVzdENoYWluUmVjb3JkID0ge1xuICAgICAgICAgICAgY2hhaW5JZDogY2hhaW4uaWQsXG4gICAgICAgICAgICBjaGFpbk5hbWU6IGNoYWluLm5hbWUsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0czogY2hhaW4ucXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIGNvbXBsZXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICB4cEVhcm5lZDogeHBLZXB0XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeS5wdXNoKHJlY29yZCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zID0gdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMuZmlsdGVyKGMgPT4gYy5pZCAhPT0gY2hhaW4uaWQpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmN1cnJlbnRDaGFpbklkID0gXCJcIjtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogYENoYWluIGJyb2tlbjogJHtjaGFpbi5uYW1lfS4gS2VwdCAke2NvbXBsZXRlZH0gcXVlc3QgY29tcGxldGlvbnMgKCR7eHBLZXB0fSBYUCkuYCxcbiAgICAgICAgICAgIHhwS2VwdDogeHBLZXB0XG4gICAgICAgIH07XG4gICAgfVxuICAvKipcbiAgICAgKiBIYW5kbGUgZmlsZSByZW5hbWUgZXZlbnRzIHRvIGtlZXAgY2hhaW5zIGludGFjdFxuICAgICAqIEBwYXJhbSBvbGROYW1lIFRoZSBwcmV2aW91cyBiYXNlbmFtZSBvZiB0aGUgZmlsZVxuICAgICAqIEBwYXJhbSBuZXdOYW1lIFRoZSBuZXcgYmFzZW5hbWUgb2YgdGhlIGZpbGVcbiAgICAgKi9cbiAgICBoYW5kbGVSZW5hbWUob2xkTmFtZTogc3RyaW5nLCBuZXdOYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgbGV0IGNoYW5nZXNNYWRlID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMuZm9yRWFjaChjaGFpbiA9PiB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGNoYWluIGNvbnRhaW5zIHRoZSBvbGQgcXVlc3QgbmFtZVxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBjaGFpbi5xdWVzdHMuaW5kZXhPZihvbGROYW1lKTtcbiAgICAgICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAvLyBSZXBsYWNlIHdpdGggbmV3IG5hbWVcbiAgICAgICAgICAgICAgICBjaGFpbi5xdWVzdHNbaW5kZXhdID0gbmV3TmFtZTtcbiAgICAgICAgICAgICAgICBjaGFuZ2VzTWFkZSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFsc28gY2hlY2sgaGlzdG9yeSAob3B0aW9uYWwsIGJ1dCBnb29kIGZvciBkYXRhIGludGVncml0eSlcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jaGFpbkhpc3RvcnkuZm9yRWFjaChyZWNvcmQgPT4ge1xuICAgICAgICAgICAgLy8gSWYgeW91IHN0b3JlIHF1ZXN0IGxpc3RzIGluIGhpc3RvcnkgbGF0ZXIsIHVwZGF0ZSB0aGVtIGhlcmUuXG4gICAgICAgICAgICAvLyBDdXJyZW50bHkgaGlzdG9yeSBpcyBqdXN0IHN1bW1hcnkgZGF0YSwgc28gc3RyaWN0bHkgbm90IG5lZWRlZCB5ZXQsXG4gICAgICAgICAgICAvLyBidXQgZ29vZCB0byBrZWVwIGluIG1pbmQuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChjaGFuZ2VzTWFkZSkge1xuICAgICAgICAgICAgLy8gVXNpbmcgY29uc29sZSBsb2cgZm9yIGRlYnVnLCBOb3RpY2UgbWlnaHQgYmUgdG9vIHNwYW1teSBkdXJpbmcgYmF0Y2ggcmVuYW1lc1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFtTaXN5cGh1c10gVXBkYXRlZCBjaGFpbnMgZm9yIHJlbmFtZTogJHtvbGROYW1lfSAtPiAke25ld05hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcHJvZ3Jlc3Mgb2YgYWN0aXZlIGNoYWluXG4gICAgICovXG4gICAgZ2V0Q2hhaW5Qcm9ncmVzcygpOiB7IGNvbXBsZXRlZDogbnVtYmVyOyB0b3RhbDogbnVtYmVyOyBwZXJjZW50OiBudW1iZXIgfSB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5nZXRBY3RpdmVDaGFpbigpO1xuICAgICAgICBpZiAoIWNoYWluKSByZXR1cm4geyBjb21wbGV0ZWQ6IDAsIHRvdGFsOiAwLCBwZXJjZW50OiAwIH07XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY29tcGxldGVkOiBjaGFpbi5jdXJyZW50SW5kZXgsXG4gICAgICAgICAgICB0b3RhbDogY2hhaW4ucXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIHBlcmNlbnQ6IE1hdGguZmxvb3IoKGNoYWluLmN1cnJlbnRJbmRleCAvIGNoYWluLnF1ZXN0cy5sZW5ndGgpICogMTAwKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgY29tcGxldGVkIGNoYWluIHJlY29yZHMgKGhpc3RvcnkpXG4gICAgICovXG4gICAgZ2V0Q2hhaW5IaXN0b3J5KCk6IFF1ZXN0Q2hhaW5SZWNvcmRbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIGFjdGl2ZSBjaGFpbnMgKG5vdCBjb21wbGV0ZWQpXG4gICAgICovXG4gICAgZ2V0QWN0aXZlQ2hhaW5zKCk6IFF1ZXN0Q2hhaW5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5maWx0ZXIoYyA9PiAhYy5jb21wbGV0ZWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBkZXRhaWxlZCBzdGF0ZSBvZiBhY3RpdmUgY2hhaW4gKGZvciBVSSByZW5kZXJpbmcpXG4gICAgICovXG4gICAgZ2V0Q2hhaW5EZXRhaWxzKCk6IHtcbiAgICAgICAgY2hhaW46IFF1ZXN0Q2hhaW4gfCBudWxsO1xuICAgICAgICBwcm9ncmVzczogeyBjb21wbGV0ZWQ6IG51bWJlcjsgdG90YWw6IG51bWJlcjsgcGVyY2VudDogbnVtYmVyIH07XG4gICAgICAgIHF1ZXN0U3RhdGVzOiBBcnJheTx7IHF1ZXN0OiBzdHJpbmc7IHN0YXR1czogJ2NvbXBsZXRlZCcgfCAnYWN0aXZlJyB8ICdsb2NrZWQnIH0+O1xuICAgIH0ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikge1xuICAgICAgICAgICAgcmV0dXJuIHsgY2hhaW46IG51bGwsIHByb2dyZXNzOiB7IGNvbXBsZXRlZDogMCwgdG90YWw6IDAsIHBlcmNlbnQ6IDAgfSwgcXVlc3RTdGF0ZXM6IFtdIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHByb2dyZXNzID0gdGhpcy5nZXRDaGFpblByb2dyZXNzKCk7XG4gICAgICAgIGNvbnN0IHF1ZXN0U3RhdGVzID0gY2hhaW4ucXVlc3RzLm1hcCgocXVlc3QsIGlkeCkgPT4ge1xuICAgICAgICAgICAgaWYgKGlkeCA8IGNoYWluLmN1cnJlbnRJbmRleCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHF1ZXN0LCBzdGF0dXM6ICdjb21wbGV0ZWQnIGFzIGNvbnN0IH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlkeCA9PT0gY2hhaW4uY3VycmVudEluZGV4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgcXVlc3QsIHN0YXR1czogJ2FjdGl2ZScgYXMgY29uc3QgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgcXVlc3QsIHN0YXR1czogJ2xvY2tlZCcgYXMgY29uc3QgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBjaGFpbiwgcHJvZ3Jlc3MsIHF1ZXN0U3RhdGVzIH07XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgVEZpbGUgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBDb250ZXh0RmlsdGVyLCBGaWx0ZXJTdGF0ZSwgRW5lcmd5TGV2ZWwsIFF1ZXN0Q29udGV4dCB9IGZyb20gJy4uL3R5cGVzJztcblxuLyoqXG4gKiBETEMgNTogQ29udGV4dCBGaWx0ZXJzIEVuZ2luZVxuICogSGFuZGxlcyBxdWVzdCBmaWx0ZXJpbmcgYnkgZW5lcmd5IGxldmVsLCBsb2NhdGlvbiBjb250ZXh0LCBhbmQgY3VzdG9tIHRhZ3NcbiAqIFxuICogSVNPTEFURUQ6IE9ubHkgcmVhZHMvd3JpdGVzIHRvIHF1ZXN0RmlsdGVycywgZmlsdGVyU3RhdGVcbiAqIERFUEVOREVOQ0lFUzogU2lzeXBodXNTZXR0aW5ncyB0eXBlcywgVEZpbGUgKGZvciBxdWVzdCBtZXRhZGF0YSlcbiAqIE5PVEU6IFRoaXMgaXMgcHJpbWFyaWx5IGEgVklFVyBMQVlFUiBjb25jZXJuLCBidXQga2VlcGluZyBsb2dpYyBpc29sYXRlZCBpcyBnb29kXG4gKi9cbmV4cG9ydCBjbGFzcyBGaWx0ZXJzRW5naW5lIHtcbiAgICBzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncztcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcbiAgICB9XG4gIC8qKlxuICAgICAqIEhhbmRsZSBmaWxlIHJlbmFtZSBldmVudHMgdG8gcHJlc2VydmUgZmlsdGVyc1xuICAgICAqIEBwYXJhbSBvbGROYW1lIFRoZSBwcmV2aW91cyBiYXNlbmFtZVxuICAgICAqIEBwYXJhbSBuZXdOYW1lIFRoZSBuZXcgYmFzZW5hbWVcbiAgICAgKi9cbiAgICBoYW5kbGVSZW5hbWUob2xkTmFtZTogc3RyaW5nLCBuZXdOYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZmlsdGVyRGF0YSA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW29sZE5hbWVdO1xuICAgICAgICBcbiAgICAgICAgaWYgKGZpbHRlckRhdGEpIHtcbiAgICAgICAgICAgIC8vIDEuIEFzc2lnbiBkYXRhIHRvIG5ldyBrZXlcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW25ld05hbWVdID0gZmlsdGVyRGF0YTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gMi4gRGVsZXRlIG9sZCBrZXlcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1tvbGROYW1lXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc29sZS5sb2coYFtTaXN5cGh1c10gVHJhbnNmZXJyZWQgZmlsdGVyczogJHtvbGROYW1lfSAtPiAke25ld05hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHYXJiYWdlIENvbGxlY3Rpb246IENsZWFuIHVwIGZpbHRlcnMgZm9yIGZpbGVzIHRoYXQgbm8gbG9uZ2VyIGV4aXN0XG4gICAgICogQ2FsbCB0aGlzIHNwYXJpbmdseSAoZS5nLiwgb24gcGx1Z2luIGxvYWQpXG4gICAgICovXG4gICAgY2xlYW51cE9ycGhhbnMoZXhpc3RpbmdGaWxlTmFtZXM6IHN0cmluZ1tdKSB7XG4gICAgICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVycyk7XG4gICAgICAgIGxldCBkZWxldGVkID0gMDtcbiAgICAgICAgXG4gICAgICAgIGtleXMuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKCFleGlzdGluZ0ZpbGVOYW1lcy5pbmNsdWRlcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW2tleV07XG4gICAgICAgICAgICAgICAgZGVsZXRlZCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChkZWxldGVkID4gMCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFtTaXN5cGh1c10gQ2xlYW5lZCB1cCAke2RlbGV0ZWR9IG9ycGhhbmVkIGZpbHRlciBlbnRyaWVzLmApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0IGZpbHRlciBmb3IgYSBzcGVjaWZpYyBxdWVzdFxuICAgICAqL1xuICAgIHNldFF1ZXN0RmlsdGVyKHF1ZXN0TmFtZTogc3RyaW5nLCBlbmVyZ3k6IEVuZXJneUxldmVsLCBjb250ZXh0OiBRdWVzdENvbnRleHQsIHRhZ3M6IHN0cmluZ1tdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV0gPSB7XG4gICAgICAgICAgICBlbmVyZ3lMZXZlbDogZW5lcmd5LFxuICAgICAgICAgICAgY29udGV4dDogY29udGV4dCxcbiAgICAgICAgICAgIHRhZ3M6IHRhZ3NcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgZmlsdGVyIGZvciBhIHNwZWNpZmljIHF1ZXN0XG4gICAgICovXG4gICAgZ2V0UXVlc3RGaWx0ZXIocXVlc3ROYW1lOiBzdHJpbmcpOiBDb250ZXh0RmlsdGVyIHwgbnVsbCB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdIHx8IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSBhY3RpdmUgZmlsdGVyIHN0YXRlXG4gICAgICovXG4gICAgc2V0RmlsdGVyU3RhdGUoZW5lcmd5OiBFbmVyZ3lMZXZlbCB8IFwiYW55XCIsIGNvbnRleHQ6IFF1ZXN0Q29udGV4dCB8IFwiYW55XCIsIHRhZ3M6IHN0cmluZ1tdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUgPSB7XG4gICAgICAgICAgICBhY3RpdmVFbmVyZ3k6IGVuZXJneSBhcyBhbnksXG4gICAgICAgICAgICBhY3RpdmVDb250ZXh0OiBjb250ZXh0IGFzIGFueSxcbiAgICAgICAgICAgIGFjdGl2ZVRhZ3M6IHRhZ3NcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCBmaWx0ZXIgc3RhdGVcbiAgICAgKi9cbiAgICBnZXRGaWx0ZXJTdGF0ZSgpOiBGaWx0ZXJTdGF0ZSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGEgcXVlc3QgbWF0Y2hlcyBjdXJyZW50IGZpbHRlciBzdGF0ZVxuICAgICAqL1xuICAgIHF1ZXN0TWF0Y2hlc0ZpbHRlcihxdWVzdE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBmaWx0ZXJzID0gdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZTtcbiAgICAgICAgY29uc3QgcXVlc3RGaWx0ZXIgPSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgbm8gZmlsdGVyIHNldCBmb3IgdGhpcyBxdWVzdCwgYWx3YXlzIHNob3dcbiAgICAgICAgaWYgKCFxdWVzdEZpbHRlcikgcmV0dXJuIHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmVyZ3kgZmlsdGVyXG4gICAgICAgIGlmIChmaWx0ZXJzLmFjdGl2ZUVuZXJneSAhPT0gXCJhbnlcIiAmJiBxdWVzdEZpbHRlci5lbmVyZ3lMZXZlbCAhPT0gZmlsdGVycy5hY3RpdmVFbmVyZ3kpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29udGV4dCBmaWx0ZXJcbiAgICAgICAgaWYgKGZpbHRlcnMuYWN0aXZlQ29udGV4dCAhPT0gXCJhbnlcIiAmJiBxdWVzdEZpbHRlci5jb250ZXh0ICE9PSBmaWx0ZXJzLmFjdGl2ZUNvbnRleHQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVGFncyBmaWx0ZXIgKHJlcXVpcmVzIEFOWSBvZiB0aGUgYWN0aXZlIHRhZ3MpXG4gICAgICAgIGlmIChmaWx0ZXJzLmFjdGl2ZVRhZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgaGFzVGFnID0gZmlsdGVycy5hY3RpdmVUYWdzLnNvbWUoKHRhZzogc3RyaW5nKSA9PiBxdWVzdEZpbHRlci50YWdzLmluY2x1ZGVzKHRhZykpO1xuICAgICAgICAgICAgaWYgKCFoYXNUYWcpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmlsdGVyIGEgbGlzdCBvZiBxdWVzdHMgYmFzZWQgb24gY3VycmVudCBmaWx0ZXIgc3RhdGVcbiAgICAgKi9cbiAgICBmaWx0ZXJRdWVzdHMocXVlc3RzOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+KTogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9PiB7XG4gICAgICAgIHJldHVybiBxdWVzdHMuZmlsdGVyKHF1ZXN0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0TmFtZSA9IHF1ZXN0LmJhc2VuYW1lIHx8IHF1ZXN0Lm5hbWU7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5xdWVzdE1hdGNoZXNGaWx0ZXIocXVlc3ROYW1lKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHF1ZXN0cyBieSBzcGVjaWZpYyBlbmVyZ3kgbGV2ZWxcbiAgICAgKi9cbiAgICBnZXRRdWVzdHNCeUVuZXJneShlbmVyZ3k6IEVuZXJneUxldmVsLCBxdWVzdHM6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4pOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+IHtcbiAgICAgICAgcmV0dXJuIHF1ZXN0cy5maWx0ZXIocSA9PiB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdE5hbWUgPSBxLmJhc2VuYW1lIHx8IHEubmFtZTtcbiAgICAgICAgICAgIGNvbnN0IGZpbHRlciA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV07XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyICYmIGZpbHRlci5lbmVyZ3lMZXZlbCA9PT0gZW5lcmd5O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcXVlc3RzIGJ5IHNwZWNpZmljIGNvbnRleHRcbiAgICAgKi9cbiAgICBnZXRRdWVzdHNCeUNvbnRleHQoY29udGV4dDogUXVlc3RDb250ZXh0LCBxdWVzdHM6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4pOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+IHtcbiAgICAgICAgcmV0dXJuIHF1ZXN0cy5maWx0ZXIocSA9PiB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdE5hbWUgPSBxLmJhc2VuYW1lIHx8IHEubmFtZTtcbiAgICAgICAgICAgIGNvbnN0IGZpbHRlciA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV07XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyICYmIGZpbHRlci5jb250ZXh0ID09PSBjb250ZXh0O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcXVlc3RzIGJ5IHNwZWNpZmljIHRhZ3NcbiAgICAgKi9cbiAgICBnZXRRdWVzdHNCeVRhZ3ModGFnczogc3RyaW5nW10sIHF1ZXN0czogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9Pik6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4ge1xuICAgICAgICByZXR1cm4gcXVlc3RzLmZpbHRlcihxID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0TmFtZSA9IHEuYmFzZW5hbWUgfHwgcS5uYW1lO1xuICAgICAgICAgICAgY29uc3QgZmlsdGVyID0gdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnNbcXVlc3ROYW1lXTtcbiAgICAgICAgICAgIGlmICghZmlsdGVyKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm4gdGFncy5zb21lKHRhZyA9PiBmaWx0ZXIudGFncy5pbmNsdWRlcyh0YWcpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2xlYXIgYWxsIGFjdGl2ZSBmaWx0ZXJzXG4gICAgICovXG4gICAgY2xlYXJGaWx0ZXJzKCk6IHZvaWQge1xuICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlID0ge1xuICAgICAgICAgICAgYWN0aXZlRW5lcmd5OiBcImFueVwiLFxuICAgICAgICAgICAgYWN0aXZlQ29udGV4dDogXCJhbnlcIixcbiAgICAgICAgICAgIGFjdGl2ZVRhZ3M6IFtdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCB1bmlxdWUgdGFncyB1c2VkIGFjcm9zcyBhbGwgcXVlc3RzXG4gICAgICovXG4gICAgZ2V0QXZhaWxhYmxlVGFncygpOiBzdHJpbmdbXSB7XG4gICAgICAgIGNvbnN0IHRhZ3MgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgXG4gICAgICAgIGZvciAoY29uc3QgcXVlc3ROYW1lIGluIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzKSB7XG4gICAgICAgICAgICBjb25zdCBmaWx0ZXIgPSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdO1xuICAgICAgICAgICAgKGZpbHRlci50YWdzIHx8IFtdKS5mb3JFYWNoKCh0YWc6IHN0cmluZykgPT4gdGFncy5hZGQodGFnKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBBcnJheS5mcm9tKHRhZ3MpLnNvcnQoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgc3VtbWFyeSBzdGF0cyBhYm91dCBmaWx0ZXJlZCBzdGF0ZVxuICAgICAqL1xuICAgIGdldEZpbHRlclN0YXRzKGFsbFF1ZXN0czogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9Pik6IHtcbiAgICAgICAgdG90YWw6IG51bWJlcjtcbiAgICAgICAgZmlsdGVyZWQ6IG51bWJlcjtcbiAgICAgICAgYWN0aXZlRmlsdGVyc0NvdW50OiBudW1iZXI7XG4gICAgfSB7XG4gICAgICAgIGNvbnN0IGZpbHRlcmVkID0gdGhpcy5maWx0ZXJRdWVzdHMoYWxsUXVlc3RzKTtcbiAgICAgICAgY29uc3QgYWN0aXZlRmlsdGVyc0NvdW50ID0gKHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlRW5lcmd5ICE9PSBcImFueVwiID8gMSA6IDApICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlQ29udGV4dCAhPT0gXCJhbnlcIiA/IDEgOiAwKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZVRhZ3MubGVuZ3RoID4gMCA/IDEgOiAwKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b3RhbDogYWxsUXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIGZpbHRlcmVkOiBmaWx0ZXJlZC5sZW5ndGgsXG4gICAgICAgICAgICBhY3RpdmVGaWx0ZXJzQ291bnQ6IGFjdGl2ZUZpbHRlcnNDb3VudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBhIHNwZWNpZmljIGZpbHRlciB2YWx1ZVxuICAgICAqIFVzZWZ1bCBmb3IgVUkgdG9nZ2xlIGJ1dHRvbnNcbiAgICAgKi9cbiAgICB0b2dnbGVFbmVyZ3lGaWx0ZXIoZW5lcmd5OiBFbmVyZ3lMZXZlbCB8IFwiYW55XCIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlRW5lcmd5ID09PSBlbmVyZ3kpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlRW5lcmd5ID0gXCJhbnlcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlRW5lcmd5ID0gZW5lcmd5IGFzIGFueTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBjb250ZXh0IGZpbHRlclxuICAgICAqL1xuICAgIHRvZ2dsZUNvbnRleHRGaWx0ZXIoY29udGV4dDogUXVlc3RDb250ZXh0IHwgXCJhbnlcIik6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVDb250ZXh0ID09PSBjb250ZXh0KSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUNvbnRleHQgPSBcImFueVwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVDb250ZXh0ID0gY29udGV4dCBhcyBhbnk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgYSB0YWcgaW4gdGhlIGFjdGl2ZSB0YWcgbGlzdFxuICAgICAqL1xuICAgIHRvZ2dsZVRhZyh0YWc6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZVRhZ3MuaW5kZXhPZih0YWcpO1xuICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlVGFncy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlVGFncy5wdXNoKHRhZyk7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCIvKipcbiAqIFB1cmUgZ2FtZSBmb3JtdWxhcyBmb3IgU2lzeXBodXMgRW5naW5lLlxuICogTm8gT2JzaWRpYW4gb3IgcnVudGltZSBkZXBzIOKAlCBzYWZlIHRvIHVuaXQgdGVzdC5cbiAqL1xuXG5leHBvcnQgY29uc3QgQk9TU19EQVRBOiBSZWNvcmQ8bnVtYmVyLCB7IG5hbWU6IHN0cmluZzsgZGVzYzogc3RyaW5nOyBocF9wZW46IG51bWJlciB9PiA9IHtcbiAgMTA6IHsgbmFtZTogXCJUaGUgR2F0ZWtlZXBlclwiLCBkZXNjOiBcIlRoZSBmaXJzdCBtYWpvciBmaWx0ZXIuXCIsIGhwX3BlbjogMjAgfSxcbiAgMjA6IHsgbmFtZTogXCJUaGUgU2hhZG93IFNlbGZcIiwgZGVzYzogXCJZb3VyIG93biBiYWQgaGFiaXRzIG1hbmlmZXN0LlwiLCBocF9wZW46IDMwIH0sXG4gIDMwOiB7IG5hbWU6IFwiVGhlIE1vdW50YWluXCIsIGRlc2M6IFwiVGhlIHBlYWsgaXMgdmlzaWJsZS5cIiwgaHBfcGVuOiA0MCB9LFxuICA1MDogeyBuYW1lOiBcIlNpc3lwaHVzIFByaW1lXCIsIGRlc2M6IFwiT25lIG11c3QgaW1hZ2luZSBTaXN5cGh1cyBoYXBweS5cIiwgaHBfcGVuOiA5OSB9LFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldERpZmZpY3VsdHlOdW1iZXIoZGlmZkxhYmVsOiBzdHJpbmcpOiBudW1iZXIge1xuICBjb25zdCBtYXA6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7XG4gICAgVHJpdmlhbDogMSxcbiAgICBFYXN5OiAyLFxuICAgIE1lZGl1bTogMyxcbiAgICBIYXJkOiA0LFxuICAgIFNVSUNJREU6IDUsXG4gIH07XG4gIHJldHVybiBtYXBbZGlmZkxhYmVsXSA/PyAzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcXVlc3RSZXdhcmRzQnlEaWZmaWN1bHR5KFxuICBkaWZmOiBudW1iZXIsXG4gIHhwUmVxOiBudW1iZXIsXG4gIGlzQm9zczogYm9vbGVhbixcbiAgaGlnaFN0YWtlczogYm9vbGVhblxuKTogeyB4cFJld2FyZDogbnVtYmVyOyBnb2xkUmV3YXJkOiBudW1iZXI7IGRpZmZMYWJlbDogc3RyaW5nIH0ge1xuICBpZiAoaXNCb3NzKSB7XG4gICAgcmV0dXJuIHsgeHBSZXdhcmQ6IDEwMDAsIGdvbGRSZXdhcmQ6IDEwMDAsIGRpZmZMYWJlbDogXCLimKDvuI8gQk9TU1wiIH07XG4gIH1cbiAgbGV0IHhwUmV3YXJkOiBudW1iZXI7XG4gIGxldCBnb2xkUmV3YXJkOiBudW1iZXI7XG4gIGxldCBkaWZmTGFiZWw6IHN0cmluZztcbiAgc3dpdGNoIChkaWZmKSB7XG4gICAgY2FzZSAxOlxuICAgICAgeHBSZXdhcmQgPSBNYXRoLmZsb29yKHhwUmVxICogMC4wNSk7XG4gICAgICBnb2xkUmV3YXJkID0gMTA7XG4gICAgICBkaWZmTGFiZWwgPSBcIlRyaXZpYWxcIjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMjpcbiAgICAgIHhwUmV3YXJkID0gTWF0aC5mbG9vcih4cFJlcSAqIDAuMSk7XG4gICAgICBnb2xkUmV3YXJkID0gMjA7XG4gICAgICBkaWZmTGFiZWwgPSBcIkVhc3lcIjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMzpcbiAgICAgIHhwUmV3YXJkID0gTWF0aC5mbG9vcih4cFJlcSAqIDAuMik7XG4gICAgICBnb2xkUmV3YXJkID0gNDA7XG4gICAgICBkaWZmTGFiZWwgPSBcIk1lZGl1bVwiO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSA0OlxuICAgICAgeHBSZXdhcmQgPSBNYXRoLmZsb29yKHhwUmVxICogMC40KTtcbiAgICAgIGdvbGRSZXdhcmQgPSA4MDtcbiAgICAgIGRpZmZMYWJlbCA9IFwiSGFyZFwiO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSA1OlxuICAgICAgeHBSZXdhcmQgPSBNYXRoLmZsb29yKHhwUmVxICogMC42KTtcbiAgICAgIGdvbGRSZXdhcmQgPSAxNTA7XG4gICAgICBkaWZmTGFiZWwgPSBcIlNVSUNJREVcIjtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICB4cFJld2FyZCA9IE1hdGguZmxvb3IoeHBSZXEgKiAwLjIpO1xuICAgICAgZ29sZFJld2FyZCA9IDQwO1xuICAgICAgZGlmZkxhYmVsID0gXCJNZWRpdW1cIjtcbiAgfVxuICBpZiAoaGlnaFN0YWtlcykgZ29sZFJld2FyZCA9IE1hdGguZmxvb3IoZ29sZFJld2FyZCAqIDEuNSk7XG4gIHJldHVybiB7IHhwUmV3YXJkLCBnb2xkUmV3YXJkLCBkaWZmTGFiZWwgfTtcbn1cblxuLyoqXG4gKiBDb21wdXRlIGZhaWwgZGFtYWdlOiBiYXNlICsgcml2YWwsIHRoZW4gYnVmZiBtdWx0LCB0aGVuIGJvc3MgcGVuYWx0eSwgdGhlbiBkZWJ0IGRvdWJsZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVGYWlsRGFtYWdlKFxuICByaXZhbERtZzogbnVtYmVyLFxuICBnb2xkOiBudW1iZXIsXG4gIGRhbWFnZU11bHQ6IG51bWJlcixcbiAgYm9zc0hwUGVuYWx0eTogbnVtYmVyXG4pOiBudW1iZXIge1xuICBsZXQgZCA9IDEwICsgTWF0aC5mbG9vcihyaXZhbERtZyAvIDIpO1xuICBkID0gTWF0aC5mbG9vcihkICogZGFtYWdlTXVsdCk7XG4gIGQgKz0gYm9zc0hwUGVuYWx0eTtcbiAgaWYgKGdvbGQgPCAwKSBkICo9IDI7XG4gIHJldHVybiBkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Qm9zc0hwUGVuYWx0eShsZXZlbDogbnVtYmVyKTogbnVtYmVyIHtcbiAgcmV0dXJuIEJPU1NfREFUQVtsZXZlbF0/LmhwX3BlbiA/PyAwO1xufVxuIiwiaW1wb3J0IHsgQXBwLCBURmlsZSwgVEZvbGRlciwgTm90aWNlLCBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBTa2lsbCwgTW9kaWZpZXIsIERhaWx5TWlzc2lvbiB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgQXVkaW9Db250cm9sbGVyLCBUaW55RW1pdHRlciB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgQ2hhb3NNb2RhbCwgVmljdG9yeU1vZGFsLCBEZWF0aE1vZGFsIH0gZnJvbSAnLi91aS9tb2RhbHMnO1xuaW1wb3J0IHsgQW5hbHl0aWNzRW5naW5lIH0gZnJvbSAnLi9lbmdpbmVzL0FuYWx5dGljc0VuZ2luZSc7XG5pbXBvcnQgeyBNZWRpdGF0aW9uRW5naW5lIH0gZnJvbSAnLi9lbmdpbmVzL01lZGl0YXRpb25FbmdpbmUnO1xuaW1wb3J0IHsgUmVzZWFyY2hFbmdpbmUgfSBmcm9tICcuL2VuZ2luZXMvUmVzZWFyY2hFbmdpbmUnO1xuaW1wb3J0IHsgQ2hhaW5zRW5naW5lIH0gZnJvbSAnLi9lbmdpbmVzL0NoYWluc0VuZ2luZSc7XG5pbXBvcnQgeyBGaWx0ZXJzRW5naW5lIH0gZnJvbSAnLi9lbmdpbmVzL0ZpbHRlcnNFbmdpbmUnO1xuaW1wb3J0IHtcbiAgQk9TU19EQVRBLFxuICBnZXREaWZmaWN1bHR5TnVtYmVyIGFzIGdldERpZmZpY3VsdHlOdW0sXG4gIHF1ZXN0UmV3YXJkc0J5RGlmZmljdWx0eSxcbiAgY29tcHV0ZUZhaWxEYW1hZ2UsXG4gIGdldEJvc3NIcFBlbmFsdHksXG59IGZyb20gJy4vbWVjaGFuaWNzJztcblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfTU9ESUZJRVI6IE1vZGlmaWVyID0geyBuYW1lOiBcIkNsZWFyIFNraWVzXCIsIGRlc2M6IFwiTm8gZWZmZWN0cy5cIiwgeHBNdWx0OiAxLCBnb2xkTXVsdDogMSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIuKYgO+4j1wiIH07XG5leHBvcnQgY29uc3QgQ0hBT1NfVEFCTEU6IE1vZGlmaWVyW10gPSBbXG4gICAgeyBuYW1lOiBcIkNsZWFyIFNraWVzXCIsIGRlc2M6IFwiTm9ybWFsLlwiLCB4cE11bHQ6IDEsIGdvbGRNdWx0OiAxLCBwcmljZU11bHQ6IDEsIGljb246IFwi4piA77iPXCIgfSxcbiAgICB7IG5hbWU6IFwiRmxvdyBTdGF0ZVwiLCBkZXNjOiBcIis1MCUgWFAuXCIsIHhwTXVsdDogMS41LCBnb2xkTXVsdDogMSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIvCfjIpcIiB9LFxuICAgIHsgbmFtZTogXCJXaW5kZmFsbFwiLCBkZXNjOiBcIis1MCUgR29sZC5cIiwgeHBNdWx0OiAxLCBnb2xkTXVsdDogMS41LCBwcmljZU11bHQ6IDEsIGljb246IFwi8J+SsFwiIH0sXG4gICAgeyBuYW1lOiBcIkluZmxhdGlvblwiLCBkZXNjOiBcIlByaWNlcyAyeC5cIiwgeHBNdWx0OiAxLCBnb2xkTXVsdDogMSwgcHJpY2VNdWx0OiAyLCBpY29uOiBcIvCfk4hcIiB9LFxuICAgIHsgbmFtZTogXCJCcmFpbiBGb2dcIiwgZGVzYzogXCJYUCAwLjV4LlwiLCB4cE11bHQ6IDAuNSwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMSwgaWNvbjogXCLwn4yr77iPXCIgfSxcbiAgICB7IG5hbWU6IFwiUml2YWwgU2Fib3RhZ2VcIiwgZGVzYzogXCJHb2xkIDAuNXguXCIsIHhwTXVsdDogMSwgZ29sZE11bHQ6IDAuNSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIvCflbXvuI9cIiB9LFxuICAgIHsgbmFtZTogXCJBZHJlbmFsaW5lXCIsIGRlc2M6IFwiMnggWFAsIC01IEhQL1EuXCIsIHhwTXVsdDogMiwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMSwgaWNvbjogXCLwn5KJXCIgfVxuXTtcbmV4cG9ydCBjb25zdCBQT1dFUl9VUFMgPSBbXG4gICAgeyBpZDogXCJmb2N1c19wb3Rpb25cIiwgbmFtZTogXCJGb2N1cyBQb3Rpb25cIiwgaWNvbjogXCLwn6eqXCIsIGRlc2M6IFwiMnggWFAgKDFoKVwiLCBjb3N0OiAxMDAsIGR1cmF0aW9uOiA2MCwgZWZmZWN0OiB7IHhwTXVsdDogMiB9IH0sXG4gICAgeyBpZDogXCJtaWRhc190b3VjaFwiLCBuYW1lOiBcIk1pZGFzIFRvdWNoXCIsIGljb246IFwi4pyoXCIsIGRlc2M6IFwiM3ggR29sZCAoMzBtKVwiLCBjb3N0OiAxNTAsIGR1cmF0aW9uOiAzMCwgZWZmZWN0OiB7IGdvbGRNdWx0OiAzIH0gfSxcbiAgICB7IGlkOiBcImlyb25fd2lsbFwiLCBuYW1lOiBcIklyb24gV2lsbFwiLCBpY29uOiBcIvCfm6HvuI9cIiwgZGVzYzogXCI1MCUgRG1nIFJlZHVjdCAoMmgpXCIsIGNvc3Q6IDIwMCwgZHVyYXRpb246IDEyMCwgZWZmZWN0OiB7IGRhbWFnZU11bHQ6IDAuNSB9IH1cbl07XG5cbmNvbnN0IE1JU1NJT05fUE9PTCA9IFtcbiAgICB7IGlkOiBcIm1vcm5pbmdfd2luXCIsIG5hbWU6IFwi4piA77iPIE1vcm5pbmcgV2luXCIsIGRlc2M6IFwiQ29tcGxldGUgMSBUcml2aWFsIHF1ZXN0IGJlZm9yZSAxMCBBTVwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMCwgZ29sZDogMTUgfSwgY2hlY2s6IFwibW9ybmluZ190cml2aWFsXCIgfSxcbiAgICB7IGlkOiBcIm1vbWVudHVtXCIsIG5hbWU6IFwi8J+UpSBNb21lbnR1bVwiLCBkZXNjOiBcIkNvbXBsZXRlIDMgcXVlc3RzIHRvZGF5XCIsIHRhcmdldDogMywgcmV3YXJkOiB7IHhwOiAyMCwgZ29sZDogMCB9LCBjaGVjazogXCJxdWVzdF9jb3VudFwiIH0sXG4gICAgeyBpZDogXCJ6ZXJvX2luYm94XCIsIG5hbWU6IFwi8J+nmCBaZXJvIEluYm94XCIsIGRlc2M6IFwiUHJvY2VzcyBhbGwgZmlsZXMgaW4gJ1NjcmFwcydcIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDAsIGdvbGQ6IDEwIH0sIGNoZWNrOiBcInplcm9faW5ib3hcIiB9LFxuICAgIHsgaWQ6IFwic3BlY2lhbGlzdFwiLCBuYW1lOiBcIvCfjq8gU3BlY2lhbGlzdFwiLCBkZXNjOiBcIlVzZSB0aGUgc2FtZSBza2lsbCAzIHRpbWVzXCIsIHRhcmdldDogMywgcmV3YXJkOiB7IHhwOiAxNSwgZ29sZDogMCB9LCBjaGVjazogXCJza2lsbF9yZXBlYXRcIiB9LFxuICAgIHsgaWQ6IFwiaGlnaF9zdGFrZXNcIiwgbmFtZTogXCLwn5KqIEhpZ2ggU3Rha2VzXCIsIGRlc2M6IFwiQ29tcGxldGUgMSBIaWdoIFN0YWtlcyBxdWVzdFwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMCwgZ29sZDogMzAgfSwgY2hlY2s6IFwiaGlnaF9zdGFrZXNcIiB9LFxuICAgIHsgaWQ6IFwic3BlZWRfZGVtb25cIiwgbmFtZTogXCLimqEgU3BlZWQgRGVtb25cIiwgZGVzYzogXCJDb21wbGV0ZSBxdWVzdCB3aXRoaW4gMmggb2YgY3JlYXRpb25cIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDI1LCBnb2xkOiAwIH0sIGNoZWNrOiBcImZhc3RfY29tcGxldGVcIiB9LFxuICAgIHsgaWQ6IFwic3luZXJnaXN0XCIsIG5hbWU6IFwi8J+UlyBTeW5lcmdpc3RcIiwgZGVzYzogXCJDb21wbGV0ZSBxdWVzdCB3aXRoIFByaW1hcnkgKyBTZWNvbmRhcnkgc2tpbGxcIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDAsIGdvbGQ6IDEwIH0sIGNoZWNrOiBcInN5bmVyZ3lcIiB9LFxuICAgIHsgaWQ6IFwic3Vydml2b3JcIiwgbmFtZTogXCLwn5uh77iPIFN1cnZpdm9yXCIsIGRlc2M6IFwiRG9uJ3QgdGFrZSBhbnkgZGFtYWdlIHRvZGF5XCIsIHRhcmdldDogMSwgcmV3YXJkOiB7IHhwOiAwLCBnb2xkOiAyMCB9LCBjaGVjazogXCJub19kYW1hZ2VcIiB9LFxuICAgIHsgaWQ6IFwicmlza190YWtlclwiLCBuYW1lOiBcIvCfjrIgUmlzayBUYWtlclwiLCBkZXNjOiBcIkNvbXBsZXRlIERpZmZpY3VsdHkgNCsgcXVlc3RcIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDE1LCBnb2xkOiAwIH0sIGNoZWNrOiBcImhhcmRfcXVlc3RcIiB9XG5dO1xuXG5leHBvcnQgY2xhc3MgU2lzeXBodXNFbmdpbmUgZXh0ZW5kcyBUaW55RW1pdHRlciB7XG4gICAgYXBwOiBBcHA7XG4gICAgcGx1Z2luOiBhbnk7XG4gICAgYXVkaW86IEF1ZGlvQ29udHJvbGxlcjtcbiAgICBhbmFseXRpY3NFbmdpbmU6IEFuYWx5dGljc0VuZ2luZTtcbiAgICBtZWRpdGF0aW9uRW5naW5lOiBNZWRpdGF0aW9uRW5naW5lO1xuICAgIHJlc2VhcmNoRW5naW5lOiBSZXNlYXJjaEVuZ2luZTtcbiAgICBjaGFpbnNFbmdpbmU6IENoYWluc0VuZ2luZTtcbiAgICBmaWx0ZXJzRW5naW5lOiBGaWx0ZXJzRW5naW5lO1xuXG4gICAgLy8gW0ZFQVRVUkVdIFVuZG8gQnVmZmVyXG4gICAgcHJpdmF0ZSBkZWxldGVkUXVlc3RCdWZmZXI6IEFycmF5PHsgbmFtZTogc3RyaW5nOyBjb250ZW50OiBzdHJpbmc7IHBhdGg6IHN0cmluZzsgZGVsZXRlZEF0OiBudW1iZXIgfT4gPSBbXTtcblxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IGFueSwgYXVkaW86IEF1ZGlvQ29udHJvbGxlcikge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmFwcCA9IGFwcDtcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgICAgIHRoaXMuYXVkaW8gPSBhdWRpbztcbiAgICAgICAgXG4gICAgICAgIHRoaXMuYW5hbHl0aWNzRW5naW5lID0gbmV3IEFuYWx5dGljc0VuZ2luZSh0aGlzLnBsdWdpbi5zZXR0aW5ncywgdGhpcy5hdWRpbyk7XG4gICAgICAgIHRoaXMubWVkaXRhdGlvbkVuZ2luZSA9IG5ldyBNZWRpdGF0aW9uRW5naW5lKHRoaXMucGx1Z2luLnNldHRpbmdzLCB0aGlzLmF1ZGlvKTtcbiAgICAgICAgdGhpcy5yZXNlYXJjaEVuZ2luZSA9IG5ldyBSZXNlYXJjaEVuZ2luZSh0aGlzLnBsdWdpbi5zZXR0aW5ncywgdGhpcy5hcHAsIHRoaXMuYXVkaW8pO1xuICAgICAgICB0aGlzLmNoYWluc0VuZ2luZSA9IG5ldyBDaGFpbnNFbmdpbmUodGhpcy5wbHVnaW4uc2V0dGluZ3MsIHRoaXMuYXVkaW8pO1xuICAgICAgICB0aGlzLmZpbHRlcnNFbmdpbmUgPSBuZXcgRmlsdGVyc0VuZ2luZSh0aGlzLnBsdWdpbi5zZXR0aW5ncyk7XG4gICAgfVxuXG4gICAgZ2V0IHNldHRpbmdzKCk6IFNpc3lwaHVzU2V0dGluZ3MgeyByZXR1cm4gdGhpcy5wbHVnaW4uc2V0dGluZ3M7IH1cbiAgICBzZXQgc2V0dGluZ3ModmFsOiBTaXN5cGh1c1NldHRpbmdzKSB7IHRoaXMucGx1Z2luLnNldHRpbmdzID0gdmFsOyB9XG5cbiAgICBhc3luYyBzYXZlKCkgeyBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTsgdGhpcy50cmlnZ2VyKFwidXBkYXRlXCIpOyB9XG5cbiAgICAvKiogU2FtZSBzYW5pdGl6YXRpb24gYXMgY3JlYXRlUXVlc3Q7IHVzZSBmb3IgbG9va3VwLiAqL1xuICAgIHByaXZhdGUgdG9TYWZlUXVlc3ROYW1lKG5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBuYW1lLnJlcGxhY2UoL1teYS16MC05XS9naSwgJ18nKS50b0xvd2VyQ2FzZSgpO1xuICAgIH1cblxuICAgIC8vIFtGSVhdIFNhZmUgQXJjaGl2ZXI6IEhhbmRsZXMgZHVwbGljYXRlcyBieSByZW5hbWluZyAoUXVlc3QgLT4gUXVlc3QgKDEpKVxuICAgIGFzeW5jIHNhZmVBcmNoaXZlKGZpbGU6IFRGaWxlLCBzdWJmb2xkZXI6IHN0cmluZyA9IFwiQXJjaGl2ZVwiKSB7XG4gICAgICAgIGNvbnN0IHJvb3QgPSBcIkFjdGl2ZV9SdW5cIjtcbiAgICAgICAgY29uc3QgdGFyZ2V0Rm9sZGVyID0gYCR7cm9vdH0vJHtzdWJmb2xkZXJ9YDtcbiAgICAgICAgXG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHJvb3QpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIocm9vdCk7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRhcmdldEZvbGRlcikpIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcih0YXJnZXRGb2xkZXIpO1xuXG4gICAgICAgIGxldCB0YXJnZXRQYXRoID0gYCR7dGFyZ2V0Rm9sZGVyfS8ke2ZpbGUubmFtZX1gO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29sbGlzaW9uIERldGVjdGlvbiBMb29wXG4gICAgICAgIGxldCBjb3VudGVyID0gMTtcbiAgICAgICAgd2hpbGUgKHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0YXJnZXRQYXRoKSkge1xuICAgICAgICAgICAgdGFyZ2V0UGF0aCA9IGAke3RhcmdldEZvbGRlcn0vJHtmaWxlLmJhc2VuYW1lfSAoJHtjb3VudGVyfSkuJHtmaWxlLmV4dGVuc2lvbn1gO1xuICAgICAgICAgICAgY291bnRlcisrO1xuICAgICAgICB9XG5cbiAgICAgICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucmVuYW1lRmlsZShmaWxlLCB0YXJnZXRQYXRoKTtcbiAgICB9XG5cbiAgICBhY3RpdmF0ZUJ1ZmYoaXRlbTogYW55KSB7XG4gICAgICAgIGNvbnN0IGV4cGlyZXMgPSBtb21lbnQoKS5hZGQoaXRlbS5kdXJhdGlvbiwgJ21pbnV0ZXMnKS50b0lTT1N0cmluZygpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmFjdGl2ZUJ1ZmZzLnB1c2goe1xuICAgICAgICAgICAgaWQ6IGl0ZW0uaWQsXG4gICAgICAgICAgICBuYW1lOiBpdGVtLm5hbWUsXG4gICAgICAgICAgICBpY29uOiBpdGVtLmljb24sXG4gICAgICAgICAgICBleHBpcmVzQXQ6IGV4cGlyZXMsXG4gICAgICAgICAgICBlZmZlY3Q6IGl0ZW0uZWZmZWN0XG4gICAgICAgIH0pO1xuICAgICAgICBuZXcgTm90aWNlKGDwn6WkIEd1bHAhICR7aXRlbS5uYW1lfSBhY3RpdmUgZm9yICR7aXRlbS5kdXJhdGlvbn1tYCk7XG4gICAgfVxuXG4gICAgcm9sbERhaWx5TWlzc2lvbnMoKSB7XG4gICAgICAgIGNvbnN0IGF2YWlsYWJsZSA9IFsuLi5NSVNTSU9OX1BPT0xdO1xuICAgICAgICBjb25zdCBzZWxlY3RlZDogRGFpbHlNaXNzaW9uW10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChhdmFpbGFibGUubGVuZ3RoID09PSAwKSBicmVhaztcbiAgICAgICAgICAgIGNvbnN0IGlkeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGF2YWlsYWJsZS5sZW5ndGgpO1xuICAgICAgICAgICAgY29uc3QgbWlzc2lvbiA9IGF2YWlsYWJsZS5zcGxpY2UoaWR4LCAxKVswXTtcbiAgICAgICAgICAgIHNlbGVjdGVkLnB1c2goeyAuLi5taXNzaW9uLCBjaGVja0Z1bmM6IG1pc3Npb24uY2hlY2ssIHByb2dyZXNzOiAwLCBjb21wbGV0ZWQ6IGZhbHNlIH0pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9ucyA9IHNlbGVjdGVkO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbkRhdGUgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnF1ZXN0c0NvbXBsZXRlZFRvZGF5ID0gMDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5za2lsbFVzZXNUb2RheSA9IHt9O1xuICAgIH1cblxuICAgIGNoZWNrRGFpbHlNaXNzaW9ucyhjb250ZXh0OiB7IHR5cGU/OiBzdHJpbmc7IGRpZmZpY3VsdHk/OiBudW1iZXI7IHNraWxsPzogc3RyaW5nOyBzZWNvbmRhcnlTa2lsbD86IHN0cmluZzsgaGlnaFN0YWtlcz86IGJvb2xlYW47IHF1ZXN0Q3JlYXRlZD86IG51bWJlciB9KSB7XG4gICAgICAgIGNvbnN0IG5vdyA9IG1vbWVudCgpO1xuICAgICAgICBsZXQganVzdEZpbmlzaGVkQWxsID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25zLmZvckVhY2gobWlzc2lvbiA9PiB7XG4gICAgICAgICAgICBpZiAobWlzc2lvbi5jb21wbGV0ZWQpIHJldHVybjtcbiAgICAgICAgICAgIHN3aXRjaCAobWlzc2lvbi5jaGVja0Z1bmMpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwiemVyb19pbmJveFwiOlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzY3JhcHMgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJTY3JhcHNcIik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY3JhcHMgaW5zdGFuY2VvZiBURm9sZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtaXNzaW9uLnByb2dyZXNzID0gc2NyYXBzLmNoaWxkcmVuLmxlbmd0aCA9PT0gMCA/IDEgOiAwO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWlzc2lvbi5wcm9ncmVzcyA9IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIm1vcm5pbmdfdHJpdmlhbFwiOiBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIgJiYgY29udGV4dC5kaWZmaWN1bHR5ID09PSAxICYmIG5vdy5ob3VyKCkgPCAxMCkgbWlzc2lvbi5wcm9ncmVzcysrOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwicXVlc3RfY291bnRcIjogaWYgKGNvbnRleHQudHlwZSA9PT0gXCJjb21wbGV0ZVwiKSBtaXNzaW9uLnByb2dyZXNzID0gdGhpcy5zZXR0aW5ncy5xdWVzdHNDb21wbGV0ZWRUb2RheTsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcImhpZ2hfc3Rha2VzXCI6IGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LmhpZ2hTdGFrZXMpIG1pc3Npb24ucHJvZ3Jlc3MrKzsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcImZhc3RfY29tcGxldGVcIjogaWYgKGNvbnRleHQudHlwZSA9PT0gXCJjb21wbGV0ZVwiICYmIGNvbnRleHQucXVlc3RDcmVhdGVkICYmIG1vbWVudCgpLmRpZmYobW9tZW50KGNvbnRleHQucXVlc3RDcmVhdGVkKSwgJ2hvdXJzJykgPD0gMikgbWlzc2lvbi5wcm9ncmVzcysrOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwic3luZXJneVwiOiBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIgJiYgY29udGV4dC5za2lsbCAmJiBjb250ZXh0LnNlY29uZGFyeVNraWxsICYmIGNvbnRleHQuc2Vjb25kYXJ5U2tpbGwgIT09IFwiTm9uZVwiKSBtaXNzaW9uLnByb2dyZXNzKys7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJub19kYW1hZ2VcIjogaWYgKGNvbnRleHQudHlwZSA9PT0gXCJkYW1hZ2VcIikgbWlzc2lvbi5wcm9ncmVzcyA9IDA7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJoYXJkX3F1ZXN0XCI6IGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LmRpZmZpY3VsdHkgJiYgY29udGV4dC5kaWZmaWN1bHR5ID49IDQpIG1pc3Npb24ucHJvZ3Jlc3MrKzsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcInNraWxsX3JlcGVhdFwiOiBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRleHQudHlwZSA9PT0gXCJjb21wbGV0ZVwiICYmIGNvbnRleHQuc2tpbGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc2tpbGxVc2VzVG9kYXlbY29udGV4dC5za2lsbF0gPSAodGhpcy5zZXR0aW5ncy5za2lsbFVzZXNUb2RheVtjb250ZXh0LnNraWxsXSB8fCAwKSArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBtaXNzaW9uLnByb2dyZXNzID0gTWF0aC5tYXgoMCwgLi4uT2JqZWN0LnZhbHVlcyh0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5KSk7XG4gICAgICAgICAgICAgICAgICAgIH0gXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1pc3Npb24ucHJvZ3Jlc3MgPj0gbWlzc2lvbi50YXJnZXQgJiYgIW1pc3Npb24uY29tcGxldGVkKSB7XG4gICAgICAgICAgICAgICAgbWlzc2lvbi5jb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MueHAgKz0gbWlzc2lvbi5yZXdhcmQueHA7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5nb2xkICs9IG1pc3Npb24ucmV3YXJkLmdvbGQ7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShg4pyFIE1pc3Npb24gQ29tcGxldGU6ICR7bWlzc2lvbi5uYW1lfWApO1xuICAgICAgICAgICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMuZXZlcnkobSA9PiBtLmNvbXBsZXRlZCkpIGp1c3RGaW5pc2hlZEFsbCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChqdXN0RmluaXNoZWRBbGwpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZ29sZCArPSA1MDtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCLwn46JIEFsbCBNaXNzaW9ucyBDb21wbGV0ZSEgKzUwIEJvbnVzIEdvbGRcIik7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXREaWZmaWN1bHR5TnVtYmVyKGRpZmZMYWJlbDogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIGdldERpZmZpY3VsdHlOdW0oZGlmZkxhYmVsKTtcbiAgICB9XG5cbiAgICBhc3luYyBjaGVja0RhaWx5TG9naW4oKSB7XG4gICAgICAgIGNvbnN0IHRvZGF5ID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubGFzdExvZ2luKSB7XG4gICAgICAgICAgICBjb25zdCBkYXlzRGlmZiA9IG1vbWVudCgpLmRpZmYobW9tZW50KHRoaXMuc2V0dGluZ3MubGFzdExvZ2luKSwgJ2RheXMnKTtcbiAgICAgICAgICAgIGlmIChkYXlzRGlmZiA+IDIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByb3REYW1hZ2UgPSAoZGF5c0RpZmYgLSAxKSAqIDEwO1xuICAgICAgICAgICAgICAgIGlmIChyb3REYW1hZ2UgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaHAgLT0gcm90RGFtYWdlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLmhpc3RvcnkucHVzaCh7IGRhdGU6IHRvZGF5LCBzdGF0dXM6IFwicm90XCIsIHhwRWFybmVkOiAtcm90RGFtYWdlIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5ocCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ldyBEZWF0aE1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5sYXN0TG9naW4gIT09IHRvZGF5KSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLm1heEhwID0gMTAwICsgKHRoaXMuc2V0dGluZ3MubGV2ZWwgKiA1KTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaHAgPSBNYXRoLm1pbih0aGlzLnNldHRpbmdzLm1heEhwLCB0aGlzLnNldHRpbmdzLmhwICsgMjApO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5kYW1hZ2VUYWtlblRvZGF5ID0gMDtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCA9IFwiXCI7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxhc3RMb2dpbiA9IHRvZGF5O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSdXN0IExvZ2ljXG4gICAgICAgICAgICBjb25zdCB0b2RheU1vbWVudCA9IG1vbWVudCgpO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5za2lsbHMuZm9yRWFjaChzID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocy5sYXN0VXNlZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodG9kYXlNb21lbnQuZGlmZihtb21lbnQocy5sYXN0VXNlZCksICdkYXlzJykgPiAzICYmICF0aGlzLmlzUmVzdGluZygpKSB7IFxuICAgICAgICAgICAgICAgICAgICAgICAgcy5ydXN0ID0gTWF0aC5taW4oMTAsIChzLnJ1c3QgfHwgMCkgKyAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMueHBSZXEgPSBNYXRoLmZsb29yKHMueHBSZXEgKiAxLjEpOyBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25EYXRlICE9PSB0b2RheSkgdGhpcy5yb2xsRGFpbHlNaXNzaW9ucygpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5yb2xsQ2hhb3ModHJ1ZSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGNvbXBsZXRlUXVlc3QoZmlsZTogVEZpbGUpIHtcbiAgICAgICAgaWYgKHRoaXMubWVkaXRhdGlvbkVuZ2luZS5pc0xvY2tlZERvd24oKSkgeyBuZXcgTm90aWNlKFwiTE9DS0RPV04gQUNUSVZFXCIpOyByZXR1cm47IH1cbiAgICAgICAgXG4gICAgICAgIC8vIC0tLSBDT01CTyBTWVNURU0gLS0tXG4gICAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIGNvbnN0IHRpbWVEaWZmID0gbm93IC0gdGhpcy5zZXR0aW5ncy5sYXN0Q29tcGxldGlvblRpbWU7XG4gICAgICAgIGNvbnN0IENPTUJPX1dJTkRPVyA9IDEwICogNjAgKiAxMDAwOyAvLyAxMCBtaW51dGVzXG5cbiAgICAgICAgaWYgKHRpbWVEaWZmIDwgQ09NQk9fV0lORE9XKSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmNvbWJvQ291bnQrKztcbiAgICAgICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwic3VjY2Vzc1wiKTsgXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmNvbWJvQ291bnQgPSAxOyBcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNldHRpbmdzLmxhc3RDb21wbGV0aW9uVGltZSA9IG5vdztcbiAgICAgICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgICAgICAgY29uc3QgZm0gPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgIGlmICghZm0pIHJldHVybjtcbiAgICAgICAgY29uc3QgcXVlc3ROYW1lID0gZmlsZS5iYXNlbmFtZTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmNoYWluc0VuZ2luZS5pc1F1ZXN0SW5DaGFpbihxdWVzdE5hbWUpKSB7XG4gICAgICAgICAgICAgY29uc3QgY2FuU3RhcnQgPSB0aGlzLmNoYWluc0VuZ2luZS5jYW5TdGFydFF1ZXN0KHF1ZXN0TmFtZSk7XG4gICAgICAgICAgICAgaWYgKCFjYW5TdGFydCkgeyBuZXcgTm90aWNlKFwiTG9ja2VkIGJ5IENoYWluLlwiKTsgcmV0dXJuOyB9XG4gICAgICAgICAgICAgXG4gICAgICAgICAgICAgY29uc3QgY2hhaW5SZXN1bHQgPSBhd2FpdCB0aGlzLmNoYWluc0VuZ2luZS5jb21wbGV0ZUNoYWluUXVlc3QocXVlc3ROYW1lKTtcbiAgICAgICAgICAgICBpZiAoY2hhaW5SZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGNoYWluUmVzdWx0Lm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICBpZiAoY2hhaW5SZXN1bHQuY2hhaW5Db21wbGV0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy54cCArPSBjaGFpblJlc3VsdC5ib251c1hwO1xuICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShg8J+OiSBDaGFpbiBCb251czogKyR7Y2hhaW5SZXN1bHQuYm9udXNYcH0gWFAhYCk7XG4gICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZm0uaXNfYm9zcykge1xuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSBmaWxlLmJhc2VuYW1lLm1hdGNoKC9CT1NTX0xWTChcXGQrKS8pO1xuICAgICAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGV2ZWwgPSBwYXJzZUludChtYXRjaFsxXSk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5hbmFseXRpY3NFbmdpbmUuZGVmZWF0Qm9zcyhsZXZlbCk7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShyZXN1bHQubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZ2FtZVdvbikgbmV3IFZpY3RvcnlNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4pLm9wZW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuYW5hbHl0aWNzRW5naW5lLnRyYWNrRGFpbHlNZXRyaWNzKFwicXVlc3RfY29tcGxldGVcIiwgMSk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy50b3RhbENvbWJhdCsrO1xuICAgICAgIFxuICAgICAgICAvLyBSZXdhcmRzXG4gICAgICAgIGxldCB4cE11bHQgPSB0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIueHBNdWx0O1xuICAgICAgICBsZXQgZ29sZE11bHQgPSB0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIuZ29sZE11bHQ7XG5cbiAgICAgICAgdGhpcy5zZXR0aW5ncy5hY3RpdmVCdWZmcy5mb3JFYWNoKGIgPT4ge1xuICAgICAgICAgICAgaWYgKGIuZWZmZWN0LnhwTXVsdCkgeHBNdWx0ICo9IGIuZWZmZWN0LnhwTXVsdDtcbiAgICAgICAgICAgIGlmIChiLmVmZmVjdC5nb2xkTXVsdCkgZ29sZE11bHQgKj0gYi5lZmZlY3QuZ29sZE11bHQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxldCB4cCA9IChmbS54cF9yZXdhcmQgfHwgMjApICogeHBNdWx0O1xuICAgICAgICBsZXQgZ29sZCA9IChmbS5nb2xkX3Jld2FyZCB8fCAwKSAqIGdvbGRNdWx0O1xuXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmNvbWJvQ291bnQgPiAxKSB7XG4gICAgICAgICAgICBjb25zdCBib251cyA9IE1hdGguZmxvb3IoeHAgKiAwLjEgKiAodGhpcy5zZXR0aW5ncy5jb21ib0NvdW50IC0gMSkpOyBcbiAgICAgICAgICAgIHhwICs9IGJvbnVzO1xuICAgICAgICAgICAgbmV3IE5vdGljZShg8J+UpSBDT01CTyB4JHt0aGlzLnNldHRpbmdzLmNvbWJvQ291bnR9ISArJHtib251c30gQm9udXMgWFBgKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2tpbGxOYW1lID0gZm0uc2tpbGwgfHwgXCJOb25lXCI7XG4gICAgICAgIGNvbnN0IHNraWxsID0gdGhpcy5zZXR0aW5ncy5za2lsbHMuZmluZChzID0+IHMubmFtZSA9PT0gc2tpbGxOYW1lKTtcbiAgICAgICAgaWYgKHNraWxsKSB7XG4gICAgICAgICAgICBza2lsbC5ydXN0ID0gMDtcbiAgICAgICAgICAgIHNraWxsLnhwUmVxID0gTWF0aC5mbG9vcihza2lsbC54cFJlcSAvIDEuMSk7XG4gICAgICAgICAgICBza2lsbC5sYXN0VXNlZCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgIHNraWxsLnhwICs9IDE7XG4gICAgICAgICAgICBpZiAoc2tpbGwueHAgPj0gc2tpbGwueHBSZXEpIHsgc2tpbGwubGV2ZWwrKzsgc2tpbGwueHAgPSAwOyBuZXcgTm90aWNlKGDwn6egICR7c2tpbGwubmFtZX0gTGV2ZWxlZCBVcCFgKTsgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc2Vjb25kYXJ5ID0gZm0uc2Vjb25kYXJ5X3NraWxsIHx8IFwiTm9uZVwiO1xuICAgICAgICBpZiAoc2Vjb25kYXJ5ICYmIHNlY29uZGFyeSAhPT0gXCJOb25lXCIpIHtcbiAgICAgICAgICAgIGNvbnN0IHNlY1NraWxsID0gdGhpcy5zZXR0aW5ncy5za2lsbHMuZmluZChzID0+IHMubmFtZSA9PT0gc2Vjb25kYXJ5KTtcbiAgICAgICAgICAgIGlmIChzZWNTa2lsbCAmJiBza2lsbCkge1xuICAgICAgICAgICAgICAgIGlmICghc2tpbGwuY29ubmVjdGlvbnMpIHNraWxsLmNvbm5lY3Rpb25zID0gW107XG4gICAgICAgICAgICAgICAgaWYgKCFza2lsbC5jb25uZWN0aW9ucy5pbmNsdWRlcyhzZWNvbmRhcnkpKSB7IHNraWxsLmNvbm5lY3Rpb25zLnB1c2goc2Vjb25kYXJ5KTsgbmV3IE5vdGljZShg8J+UlyBOZXVyYWwgTGluayBFc3RhYmxpc2hlZGApOyB9XG4gICAgICAgICAgICAgICAgeHAgKz0gTWF0aC5mbG9vcihzZWNTa2lsbC5sZXZlbCAqIDAuNSk7XG4gICAgICAgICAgICAgICAgc2VjU2tpbGwueHAgKz0gMC41O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZXR0aW5ncy54cCArPSB4cDsgdGhpcy5zZXR0aW5ncy5nb2xkICs9IGdvbGQ7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyLm5hbWUgPT09IFwiQWRyZW5hbGluZVwiKSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmhwIC09IDU7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmRhbWFnZVRha2VuVG9kYXkgKz0gNTtcbiAgICAgICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmRhbWFnZVRha2VuVG9kYXkgPiA1MCAmJiAhdGhpcy5tZWRpdGF0aW9uRW5naW5lLmlzTG9ja2VkRG93bigpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tZWRpdGF0aW9uRW5naW5lLnRyaWdnZXJMb2NrZG93bigpO1xuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcImxvY2tkb3duXCIpO1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJPdmVyZXhlcnRpb24hIExPQ0tET1dOIElOSVRJQVRFRC5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5ocCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgbmV3IERlYXRoTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luKS5vcGVuKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5hdWRpby5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLnhwID49IHRoaXMuc2V0dGluZ3MueHBSZXEpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubGV2ZWwrKzsgXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnhwID0gMDtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MueHBSZXEgPSBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3MueHBSZXEgKiAxLjEpOyBcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubWF4SHAgPSAxMDAgKyAodGhpcy5zZXR0aW5ncy5sZXZlbCAqIDUpOyBcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaHAgPSB0aGlzLnNldHRpbmdzLm1heEhwO1xuICAgICAgICAgICAgdGhpcy50YXVudChcImxldmVsX3VwXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBtc2dzID0gdGhpcy5hbmFseXRpY3NFbmdpbmUuY2hlY2tCb3NzTWlsZXN0b25lcygpO1xuICAgICAgICAgICAgbXNncy5mb3JFYWNoKG0gPT4gbmV3IE5vdGljZShtKSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChbMTAsIDIwLCAzMCwgNTBdLmluY2x1ZGVzKHRoaXMuc2V0dGluZ3MubGV2ZWwpKSB0aGlzLnNwYXduQm9zcyh0aGlzLnNldHRpbmdzLmxldmVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3RzQ29tcGxldGVkVG9kYXkrKztcbiAgICAgICAgdGhpcy5hbmFseXRpY3NFbmdpbmUudXBkYXRlU3RyZWFrKCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmNoZWNrRGFpbHlNaXNzaW9ucyh7IFxuICAgICAgICAgICAgdHlwZTogXCJjb21wbGV0ZVwiLCBcbiAgICAgICAgICAgIGRpZmZpY3VsdHk6IHRoaXMuZ2V0RGlmZmljdWx0eU51bWJlcihmbS5kaWZmaWN1bHR5KSwgXG4gICAgICAgICAgICBza2lsbDogc2tpbGxOYW1lLCBcbiAgICAgICAgICAgIHNlY29uZGFyeVNraWxsOiBzZWNvbmRhcnksXG4gICAgICAgICAgICBoaWdoU3Rha2VzOiBmbS5oaWdoX3N0YWtlcyBcbiAgICAgICAgfSk7XG5cbiAgICAgICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmKSA9PiB7IGYuc3RhdHVzID0gXCJjb21wbGV0ZWRcIjsgZi5jb21wbGV0ZWRfYXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7IH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gW0ZJWF0gVXNlIFNhZmUgQXJjaGl2ZSB0byBwcmV2ZW50IGR1cGxpY2F0ZXMvem9tYmllc1xuICAgICAgICBhd2FpdCB0aGlzLnNhZmVBcmNoaXZlKGZpbGUsIFwiQXJjaGl2ZVwiKTtcbiAgICAgICAgXG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgIH1cblxuICAgIGFzeW5jIHNwYXduQm9zcyhsZXZlbDogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGJvc3MgPSBCT1NTX0RBVEFbbGV2ZWxdO1xuICAgICAgICBpZiAoIWJvc3MpIHJldHVybjtcbiAgICAgICAgdGhpcy5hdWRpby5wbGF5U291bmQoXCJoZWFydGJlYXRcIik7XG4gICAgICAgIG5ldyBOb3RpY2UoXCLimqDvuI8gQU5PTUFMWSBERVRFQ1RFRC4uLlwiLCAyMDAwKTtcbiAgICAgICAgXG4gICAgICAgIHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5hdWRpby5wbGF5U291bmQoXCJkZWF0aFwiKTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoYOKYoO+4jyBCT1NTIFNQQVdORUQ6ICR7Ym9zcy5uYW1lfWApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmNyZWF0ZVF1ZXN0KFxuICAgICAgICAgICAgICAgIGBCT1NTX0xWTCR7bGV2ZWx9IC0gJHtib3NzLm5hbWV9YCwgNSwgXCJCb3NzXCIsIFwiTm9uZVwiLCBcbiAgICAgICAgICAgICAgICBtb21lbnQoKS5hZGQoMywgJ2RheXMnKS50b0lTT1N0cmluZygpLCB0cnVlLCBcIkNyaXRpY2FsXCIsIHRydWVcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNhZmVOYW1lID0gdGhpcy50b1NhZmVRdWVzdE5hbWUoYEJPU1NfTFZMJHtsZXZlbH0gLSAke2Jvc3MubmFtZX1gKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlcyA9IHRoaXMuYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlID0gZmlsZXMuZmluZChmID0+IGYuYmFzZW5hbWUudG9Mb3dlckNhc2UoKSA9PT0gc2FmZU5hbWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF4SHAgPSAxMDAgKyAobGV2ZWwgKiAyMCk7IFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGZtKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmbS5ib3NzX2hwID0gbWF4SHA7XG4gICAgICAgICAgICAgICAgICAgICAgICBmbS5ib3NzX21heF9ocCA9IG1heEhwO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwidXBkYXRlXCIpOyBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCA1MDApOyBcbiAgICAgICAgfSwgMzAwMCk7XG4gICAgfVxuXG4gICAgYXN5bmMgZGFtYWdlQm9zcyhmaWxlOiBURmlsZSkge1xuICAgICAgICBjb25zdCBmbSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcbiAgICAgICAgaWYgKCFmbSB8fCAhZm0uaXNfYm9zcykgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IGRhbWFnZSA9IDI1OyBcbiAgICAgICAgY29uc3QgY3VycmVudEhwID0gZm0uYm9zc19ocCB8fCAxMDA7XG4gICAgICAgIGNvbnN0IG5ld0hwID0gY3VycmVudEhwIC0gZGFtYWdlO1xuXG4gICAgICAgIGlmIChuZXdIcCA8PSAwKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmNvbXBsZXRlUXVlc3QoZmlsZSk7XG4gICAgICAgICAgICBuZXcgTm90aWNlKFwi4pqU77iPIEZJTkFMIEJMT1chIEJvc3MgRGVmZWF0ZWQhXCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmKSA9PiB7XG4gICAgICAgICAgICAgICAgZi5ib3NzX2hwID0gbmV3SHA7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwiZmFpbFwiKTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoYOKalO+4jyBCb3NzIERhbWFnZWQhICR7bmV3SHB9LyR7Zm0uYm9zc19tYXhfaHB9IEhQIHJlbWFpbmluZ2ApO1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLnRyaWdnZXIoXCJ1cGRhdGVcIiksIDIwMCk7IFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgZmFpbFF1ZXN0KGZpbGU6IFRGaWxlLCBtYW51YWxBYm9ydDogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgICAgIGlmICh0aGlzLmlzUmVzdGluZygpICYmICFtYW51YWxBYm9ydCkgeyBuZXcgTm90aWNlKFwiUmVzdCBEYXkgcHJvdGVjdGlvbi5cIik7IHJldHVybjsgfVxuICAgICAgICBpZiAodGhpcy5pc1NoaWVsZGVkKCkgJiYgIW1hbnVhbEFib3J0KSB7IG5ldyBOb3RpY2UoXCJTaGllbGRlZCFcIik7IHJldHVybjsgfVxuXG4gICAgICAgIGxldCBkYW1hZ2VNdWx0ID0gMTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5hY3RpdmVCdWZmcy5mb3JFYWNoKGIgPT4ge1xuICAgICAgICAgICAgaWYgKGIuZWZmZWN0LmRhbWFnZU11bHQpIGRhbWFnZU11bHQgKj0gYi5lZmZlY3QuZGFtYWdlTXVsdDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgZm0gPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgIGxldCBib3NzSHBQZW5hbHR5ID0gMDtcbiAgICAgICAgaWYgKGZtPy5pc19ib3NzKSB7XG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IGZpbGUuYmFzZW5hbWUubWF0Y2goL0JPU1NfTFZMKFxcZCspLyk7XG4gICAgICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBsZXZlbCA9IHBhcnNlSW50KG1hdGNoWzFdKTtcbiAgICAgICAgICAgICAgICBib3NzSHBQZW5hbHR5ID0gZ2V0Qm9zc0hwUGVuYWx0eShsZXZlbCk7XG4gICAgICAgICAgICAgICAgaWYgKGJvc3NIcFBlbmFsdHkgPiAwKSBuZXcgTm90aWNlKGDimKDvuI8gQm9zcyBDcnVzaDogKyR7Ym9zc0hwUGVuYWx0eX0gRGFtYWdlYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBkYW1hZ2UgPSBjb21wdXRlRmFpbERhbWFnZShcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Mucml2YWxEbWcsXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmdvbGQsXG4gICAgICAgICAgICBkYW1hZ2VNdWx0LFxuICAgICAgICAgICAgYm9zc0hwUGVuYWx0eVxuICAgICAgICApO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5ocCAtPSBkYW1hZ2U7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZGFtYWdlVGFrZW5Ub2RheSArPSBkYW1hZ2U7XG4gICAgICAgIGlmICghbWFudWFsQWJvcnQpIHRoaXMuc2V0dGluZ3Mucml2YWxEbWcgKz0gMTtcblxuICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImZhaWxcIik7XG4gICAgICAgIHRoaXMuY2hlY2tEYWlseU1pc3Npb25zKHsgdHlwZTogXCJkYW1hZ2VcIiB9KTtcblxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5kYW1hZ2VUYWtlblRvZGF5ID4gNTApIHtcbiAgICAgICAgICAgIHRoaXMubWVkaXRhdGlvbkVuZ2luZS50cmlnZ2VyTG9ja2Rvd24oKTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcImxvY2tkb3duXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuaHAgPD0gMCkge1xuICAgICAgICAgICAgbmV3IERlYXRoTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luKS5vcGVuKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBncmF2ZVBhdGggPSBcIkdyYXZleWFyZC9GYWlsdXJlc1wiO1xuICAgICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChncmF2ZVBhdGgpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZ3JhdmVQYXRoKTtcblxuICAgICAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5yZW5hbWVGaWxlKGZpbGUsIGAke2dyYXZlUGF0aH0vW0ZBSUxFRF0gJHtmaWxlLm5hbWV9YCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgIH1cbiAgICBcbiAgICBhc3luYyBjcmVhdGVRdWVzdChuYW1lOiBzdHJpbmcsIGRpZmY6IG51bWJlciwgc2tpbGw6IHN0cmluZywgc2VjU2tpbGw6IHN0cmluZywgZGVhZGxpbmVJc286IHN0cmluZywgaGlnaFN0YWtlczogYm9vbGVhbiwgcHJpb3JpdHk6IHN0cmluZywgaXNCb3NzOiBib29sZWFuKSB7XG4gICAgICAgIGlmICh0aGlzLm1lZGl0YXRpb25FbmdpbmUuaXNMb2NrZWREb3duKCkpIHsgbmV3IE5vdGljZShcIkxPQ0tET1dOIEFDVElWRVwiKTsgcmV0dXJuOyB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCB7IHhwUmV3YXJkLCBnb2xkUmV3YXJkLCBkaWZmTGFiZWwgfSA9IHF1ZXN0UmV3YXJkc0J5RGlmZmljdWx0eShkaWZmLCB0aGlzLnNldHRpbmdzLnhwUmVxLCBpc0Jvc3MsIGhpZ2hTdGFrZXMpO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgcm9vdFBhdGggPSBcIkFjdGl2ZV9SdW4vUXVlc3RzXCI7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHJvb3RQYXRoKSkgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKHJvb3RQYXRoKTtcblxuICAgICAgICBjb25zdCBzYWZlTmFtZSA9IHRoaXMudG9TYWZlUXVlc3ROYW1lKG5hbWUpO1xuICAgICAgICBjb25zdCBjb250ZW50ID0gYC0tLVxudHlwZTogcXVlc3RcbnN0YXR1czogYWN0aXZlXG5kaWZmaWN1bHR5OiAke2RpZmZMYWJlbH1cbnByaW9yaXR5OiAke3ByaW9yaXR5fVxueHBfcmV3YXJkOiAke3hwUmV3YXJkfVxuZ29sZF9yZXdhcmQ6ICR7Z29sZFJld2FyZH1cbnNraWxsOiAke3NraWxsfVxuc2Vjb25kYXJ5X3NraWxsOiAke3NlY1NraWxsfVxuaGlnaF9zdGFrZXM6ICR7aGlnaFN0YWtlcyA/ICd0cnVlJyA6ICdmYWxzZSd9XG5pc19ib3NzOiAke2lzQm9zc31cbmNyZWF0ZWQ6ICR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpfVxuZGVhZGxpbmU6ICR7ZGVhZGxpbmVJc299XG4tLS1cbiMg4pqU77iPICR7bmFtZX1gO1xuICAgICAgICBcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKGAke3Jvb3RQYXRofS8ke3NhZmVOYW1lfS5tZGAsIGNvbnRlbnQpO1xuICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImNsaWNrXCIpO1xuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBhc3luYyBkZWxldGVRdWVzdChmaWxlOiBURmlsZSkge1xuICAgICAgICBjb25zdCB7IGNvc3QgfSA9IHRoaXMubWVkaXRhdGlvbkVuZ2luZS5nZXREZWxldGlvbkNvc3QoKTtcbiAgICAgICAgaWYgKGNvc3QgPiAwICYmIHRoaXMuc2V0dGluZ3MuZ29sZCA8IGNvc3QpIHtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJJbnN1ZmZpY2llbnQgZ29sZCBmb3IgcGFpZCBkZWxldGlvbiFcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb3N0UmVzdWx0ID0gdGhpcy5tZWRpdGF0aW9uRW5naW5lLmFwcGx5RGVsZXRpb25Db3N0KCk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpO1xuICAgICAgICAgICAgdGhpcy5kZWxldGVkUXVlc3RCdWZmZXIucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogZmlsZS5uYW1lLFxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgcGF0aDogZmlsZS5wYXRoLFxuICAgICAgICAgICAgICAgIGRlbGV0ZWRBdDogRGF0ZS5ub3coKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAodGhpcy5kZWxldGVkUXVlc3RCdWZmZXIubGVuZ3RoID4gNSkgdGhpcy5kZWxldGVkUXVlc3RCdWZmZXIuc2hpZnQoKTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcInVuZG86c2hvd1wiLCBmaWxlLmJhc2VuYW1lKTtcbiAgICAgICAgfSBjYXRjaChlKSB7IGNvbnNvbGUuZXJyb3IoXCJCdWZmZXIgZmFpbFwiLCBlKTsgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmRlbGV0ZShmaWxlKTtcbiAgICAgICAgaWYgKGNvc3RSZXN1bHQubWVzc2FnZSkgbmV3IE5vdGljZShjb3N0UmVzdWx0Lm1lc3NhZ2UpO1xuICAgICAgICB0aGlzLnNhdmUoKTsgXG4gICAgfVxuICBcbiAgICBhc3luYyB1bmRvTGFzdERlbGV0aW9uKCkge1xuICAgICAgICBjb25zdCBsYXN0ID0gdGhpcy5kZWxldGVkUXVlc3RCdWZmZXIucG9wKCk7XG4gICAgICAgIGlmICghbGFzdCkgeyBuZXcgTm90aWNlKFwiTm90aGluZyB0byB1bmRvLlwiKTsgcmV0dXJuOyB9XG4gICAgICAgIFxuICAgICAgICBpZiAoRGF0ZS5ub3coKSAtIGxhc3QuZGVsZXRlZEF0ID4gNjAwMDApIHsgbmV3IE5vdGljZShcIlRvbyBsYXRlIHRvIHVuZG8uXCIpOyByZXR1cm47IH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKGxhc3QucGF0aCwgbGFzdC5jb250ZW50KTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoYFJlc3RvcmVkOiAke2xhc3QubmFtZX1gKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwidXBkYXRlXCIpO1xuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgIFxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiQ291bGQgbm90IHJlc3RvcmUgZmlsZSAocGF0aCBtYXkgYmUgdGFrZW4pLlwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGNoZWNrRGVhZGxpbmVzKCkge1xuICAgICAgICBjb25zdCBub3cgPSBtb21lbnQoKTtcbiAgICAgICAgY29uc3QgaW5pdGlhbENvdW50ID0gdGhpcy5zZXR0aW5ncy5hY3RpdmVCdWZmcy5sZW5ndGg7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuYWN0aXZlQnVmZnMgPSB0aGlzLnNldHRpbmdzLmFjdGl2ZUJ1ZmZzLmZpbHRlcihiID0+IG1vbWVudChiLmV4cGlyZXNBdCkuaXNBZnRlcihub3cpKTtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuYWN0aXZlQnVmZnMubGVuZ3RoIDwgaW5pdGlhbENvdW50KSB7XG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiQSBwb3Rpb24gZWZmZWN0IGhhcyB3b3JuIG9mZi5cIik7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJ1cGRhdGVcIik7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiQWN0aXZlX1J1bi9RdWVzdHNcIik7XG4gICAgICAgIGlmICghKGZvbGRlciBpbnN0YW5jZW9mIFRGb2xkZXIpKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBjb25zdCB6ZXJvSW5ib3ggPSB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMuZmluZChtID0+IG0uY2hlY2tGdW5jID09PSBcInplcm9faW5ib3hcIiAmJiAhbS5jb21wbGV0ZWQpO1xuICAgICAgICBpZiAoemVyb0luYm94KSB7XG4gICAgICAgICAgICBjb25zdCBzY3JhcHMgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJTY3JhcHNcIik7XG4gICAgICAgICAgICBpZiAoc2NyYXBzIGluc3RhbmNlb2YgVEZvbGRlciAmJiBzY3JhcHMuY2hpbGRyZW4ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jaGVja0RhaWx5TWlzc2lvbnMoeyB0eXBlOiBcImNoZWNrXCIgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZm9sZGVyLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZm0gPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgICAgICAgICAgaWYgKGZtPy5kZWFkbGluZSAmJiBtb21lbnQoKS5pc0FmdGVyKG1vbWVudChmbS5kZWFkbGluZSkpKSBhd2FpdCB0aGlzLmZhaWxRdWVzdChmaWxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBhc3luYyByb2xsQ2hhb3Moc2hvd01vZGFsOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3Qgcm9sbCA9IE1hdGgucmFuZG9tKCk7XG4gICAgICAgIGlmIChyb2xsIDwgMC40KSB0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIgPSBERUZBVUxUX01PRElGSUVSO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGlkeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChDSEFPU19UQUJMRS5sZW5ndGggLSAxKSkgKyAxO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyID0gQ0hBT1NfVEFCTEVbaWR4XTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICAgICAgaWYgKHNob3dNb2RhbCkgbmV3IENoYW9zTW9kYWwodGhpcy5hcHAsIHRoaXMuc2V0dGluZ3MuZGFpbHlNb2RpZmllcikub3BlbigpO1xuICAgIH1cblxuICAgIGFzeW5jIGF0dGVtcHRSZWNvdmVyeSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLm1lZGl0YXRpb25FbmdpbmUuaXNMb2NrZWREb3duKCkpIHsgbmV3IE5vdGljZShcIk5vdCBpbiBMb2NrZG93bi5cIik7IHJldHVybjsgfVxuICAgICAgICBjb25zdCB7IGhvdXJzLCBtaW51dGVzIH0gPSB0aGlzLm1lZGl0YXRpb25FbmdpbmUuZ2V0TG9ja2Rvd25UaW1lUmVtYWluaW5nKCk7XG4gICAgICAgIG5ldyBOb3RpY2UoYFJlY292ZXJpbmcuLi4gJHtob3Vyc31oICR7bWludXRlc31tIHJlbWFpbmluZy5gKTtcbiAgICB9XG5cbiAgICBpc0xvY2tlZERvd24oKSB7IHJldHVybiB0aGlzLm1lZGl0YXRpb25FbmdpbmUuaXNMb2NrZWREb3duKCk7IH1cbiAgICBpc1Jlc3RpbmcoKSB7IHJldHVybiB0aGlzLnNldHRpbmdzLnJlc3REYXlVbnRpbCAmJiBtb21lbnQoKS5pc0JlZm9yZShtb21lbnQodGhpcy5zZXR0aW5ncy5yZXN0RGF5VW50aWwpKTsgfVxuICAgIGlzU2hpZWxkZWQoKSB7IHJldHVybiB0aGlzLnNldHRpbmdzLnNoaWVsZGVkVW50aWwgJiYgbW9tZW50KCkuaXNCZWZvcmUobW9tZW50KHRoaXMuc2V0dGluZ3Muc2hpZWxkZWRVbnRpbCkpOyB9XG5cbiAgICBhc3luYyBjcmVhdGVSZXNlYXJjaFF1ZXN0KHRpdGxlOiBzdHJpbmcsIHR5cGU6IGFueSwgbGlua2VkU2tpbGw6IHN0cmluZywgbGlua2VkQ29tYmF0UXVlc3Q6IHN0cmluZyk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfT4ge1xuICAgICAgICBjb25zdCByZXMgPSBhd2FpdCB0aGlzLnJlc2VhcmNoRW5naW5lLmNyZWF0ZVJlc2VhcmNoUXVlc3QodGl0bGUsIHR5cGUsIGxpbmtlZFNraWxsLCBsaW5rZWRDb21iYXRRdWVzdCk7XG4gICAgICAgIGlmIChyZXMuc3VjY2Vzcykge1xuICAgICAgICAgICAgbmV3IE5vdGljZShyZXMubWVzc2FnZSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UocmVzLm1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIFxuICAgIGNvbXBsZXRlUmVzZWFyY2hRdWVzdChpZDogc3RyaW5nLCB3b3JkczogbnVtYmVyKSB7IHRoaXMucmVzZWFyY2hFbmdpbmUuY29tcGxldGVSZXNlYXJjaFF1ZXN0KGlkLCB3b3Jkcyk7IHRoaXMuc2F2ZSgpOyB9XG4gICAgYXN5bmMgZGVsZXRlUmVzZWFyY2hRdWVzdChpZDogc3RyaW5nKSB7IGF3YWl0IHRoaXMucmVzZWFyY2hFbmdpbmUuZGVsZXRlUmVzZWFyY2hRdWVzdChpZCk7IGF3YWl0IHRoaXMuc2F2ZSgpOyB9XG4gICAgdXBkYXRlUmVzZWFyY2hXb3JkQ291bnQoaWQ6IHN0cmluZywgd29yZHM6IG51bWJlcikgeyBcbiAgICAgICAgdGhpcy5yZXNlYXJjaEVuZ2luZS51cGRhdGVSZXNlYXJjaFdvcmRDb3VudChpZCwgd29yZHMpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoXCJ1cGRhdGVcIik7XG4gICAgfVxuICAgIGdldFJlc2VhcmNoUmF0aW8oKSB7IHJldHVybiB0aGlzLnJlc2VhcmNoRW5naW5lLmdldFJlc2VhcmNoUmF0aW8oKTsgfVxuICAgIGNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKSB7IHJldHVybiB0aGlzLnJlc2VhcmNoRW5naW5lLmNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKTsgfVxuICAgIFxuICAgIGFzeW5jIHN0YXJ0TWVkaXRhdGlvbigpIHsgY29uc3QgciA9IHRoaXMubWVkaXRhdGlvbkVuZ2luZS5tZWRpdGF0ZSgpOyBuZXcgTm90aWNlKHIubWVzc2FnZSk7IGF3YWl0IHRoaXMuc2F2ZSgpOyB9XG4gICAgZ2V0TWVkaXRhdGlvblN0YXR1cygpIHsgcmV0dXJuIHRoaXMubWVkaXRhdGlvbkVuZ2luZS5nZXRNZWRpdGF0aW9uU3RhdHVzKCk7IH1cbiAgICBhc3luYyBjcmVhdGVTY3JhcChjb250ZW50OiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgZm9sZGVyUGF0aCA9IFwiU2NyYXBzXCI7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZvbGRlclBhdGgpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZm9sZGVyUGF0aCk7XG4gICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tREQgSEgtbW0tc3NcIik7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShgJHtmb2xkZXJQYXRofS8ke3RpbWVzdGFtcH0ubWRgLCBjb250ZW50KTtcbiAgICAgICAgbmV3IE5vdGljZShcIuKaoSBTY3JhcCBDYXB0dXJlZFwiKTsgdGhpcy5hdWRpby5wbGF5U291bmQoXCJjbGlja1wiKTtcbiAgICB9XG4gICAgXG4gICAgYXN5bmMgZ2VuZXJhdGVTa2lsbEdyYXBoKCkgeyBcbiAgICAgICAgY29uc3Qgc2tpbGxzID0gdGhpcy5zZXR0aW5ncy5za2lsbHM7XG4gICAgICAgIGlmIChza2lsbHMubGVuZ3RoID09PSAwKSB7IG5ldyBOb3RpY2UoXCJObyBuZXVyYWwgbm9kZXMgZm91bmQuXCIpOyByZXR1cm47IH1cbiAgICAgICAgY29uc3Qgbm9kZXM6IGFueVtdID0gW107IGNvbnN0IGVkZ2VzOiBhbnlbXSA9IFtdO1xuICAgICAgICBjb25zdCB3aWR0aCA9IDI1MDsgY29uc3QgaGVpZ2h0ID0gMTQwOyBcbiAgICAgICAgY29uc3QgcmFkaXVzID0gTWF0aC5tYXgoNDAwLCBza2lsbHMubGVuZ3RoICogNjApO1xuICAgICAgICBjb25zdCBjZW50ZXJYID0gMDsgY29uc3QgY2VudGVyWSA9IDA7IGNvbnN0IGFuZ2xlU3RlcCA9ICgyICogTWF0aC5QSSkgLyBza2lsbHMubGVuZ3RoO1xuXG4gICAgICAgIHNraWxscy5mb3JFYWNoKChza2lsbCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGFuZ2xlID0gaW5kZXggKiBhbmdsZVN0ZXA7XG4gICAgICAgICAgICBjb25zdCB4ID0gY2VudGVyWCArIHJhZGl1cyAqIE1hdGguY29zKGFuZ2xlKTtcbiAgICAgICAgICAgIGNvbnN0IHkgPSBjZW50ZXJZICsgcmFkaXVzICogTWF0aC5zaW4oYW5nbGUpO1xuICAgICAgICAgICAgbGV0IGNvbG9yID0gXCI0XCI7IFxuICAgICAgICAgICAgaWYgKHNraWxsLnJ1c3QgPiAwKSBjb2xvciA9IFwiMVwiOyBlbHNlIGlmIChza2lsbC5sZXZlbCA+PSAxMCkgY29sb3IgPSBcIjZcIjtcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1c0ljb24gPSBza2lsbC5ydXN0ID4gMCA/IFwi4pqg77iPIFJVU1RZXCIgOiBcIvCfn6IgQUNUSVZFXCI7XG4gICAgICAgICAgICBjb25zdCBwcm9ncmVzcyA9IHNraWxsLnhwUmVxID4gMCA/IE1hdGguZmxvb3IoKHNraWxsLnhwIC8gc2tpbGwueHBSZXEpICogMTAwKSA6IDA7XG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gYCMjICR7c2tpbGwubmFtZX1cXG4qKkx2ICR7c2tpbGwubGV2ZWx9KipcXG4ke3N0YXR1c0ljb259XFxuWFA6ICR7c2tpbGwueHB9LyR7c2tpbGwueHBSZXF9ICgke3Byb2dyZXNzfSUpYDsgXG4gICAgICAgICAgICBub2Rlcy5wdXNoKHsgaWQ6IHNraWxsLm5hbWUsIHg6IE1hdGguZmxvb3IoeCksIHk6IE1hdGguZmxvb3IoeSksIHdpZHRoLCBoZWlnaHQsIHR5cGU6IFwidGV4dFwiLCB0ZXh0LCBjb2xvciB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2tpbGxzLmZvckVhY2goc2tpbGwgPT4ge1xuICAgICAgICAgICAgaWYgKHNraWxsLmNvbm5lY3Rpb25zKSB7XG4gICAgICAgICAgICAgICAgc2tpbGwuY29ubmVjdGlvbnMuZm9yRWFjaCh0YXJnZXROYW1lID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNraWxscy5maW5kKHMgPT4gcy5uYW1lID09PSB0YXJnZXROYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWRnZXMucHVzaCh7IGlkOiBgJHtza2lsbC5uYW1lfS0ke3RhcmdldE5hbWV9YCwgZnJvbU5vZGU6IHNraWxsLm5hbWUsIGZyb21TaWRlOiBcInJpZ2h0XCIsIHRvTm9kZTogdGFyZ2V0TmFtZSwgdG9TaWRlOiBcImxlZnRcIiwgY29sb3I6IFwiNFwiIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGNhbnZhc0RhdGEgPSB7IG5vZGVzLCBlZGdlcyB9O1xuICAgICAgICBjb25zdCBwYXRoID0gdGhpcy5zZXR0aW5ncy5uZXVyYWxIdWJQYXRoIHx8IFwiQWN0aXZlX1J1bi9OZXVyYWxfSHViLmNhbnZhc1wiO1xuICAgICAgICBjb25zdCBmaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHBhdGgpO1xuICAgICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7IGF3YWl0IHRoaXMuYXBwLnZhdWx0Lm1vZGlmeShmaWxlLCBKU09OLnN0cmluZ2lmeShjYW52YXNEYXRhLCBudWxsLCAyKSk7IG5ldyBOb3RpY2UoXCJOZXVyYWwgSHViIHVwZGF0ZWQuXCIpOyB9IFxuICAgICAgICBlbHNlIHsgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKHBhdGgsIEpTT04uc3RyaW5naWZ5KGNhbnZhc0RhdGEsIG51bGwsIDIpKTsgbmV3IE5vdGljZShcIk5ldXJhbCBIdWIgY3JlYXRlZC5cIik7IH1cbiAgICB9XG5cbiAgICBhc3luYyBjcmVhdGVRdWVzdENoYWluKG5hbWU6IHN0cmluZywgcXVlc3RzOiBzdHJpbmdbXSkgeyBhd2FpdCB0aGlzLmNoYWluc0VuZ2luZS5jcmVhdGVRdWVzdENoYWluKG5hbWUsIHF1ZXN0cyk7IGF3YWl0IHRoaXMuc2F2ZSgpOyB9XG4gICAgZ2V0QWN0aXZlQ2hhaW4oKSB7IHJldHVybiB0aGlzLmNoYWluc0VuZ2luZS5nZXRBY3RpdmVDaGFpbigpOyB9XG4gICAgZ2V0Q2hhaW5Qcm9ncmVzcygpIHsgcmV0dXJuIHRoaXMuY2hhaW5zRW5naW5lLmdldENoYWluUHJvZ3Jlc3MoKTsgfVxuICAgIGFzeW5jIGJyZWFrQ2hhaW4oKSB7IGF3YWl0IHRoaXMuY2hhaW5zRW5naW5lLmJyZWFrQ2hhaW4oKTsgYXdhaXQgdGhpcy5zYXZlKCk7IH1cbiAgICBcbiAgICBzZXRGaWx0ZXJTdGF0ZShlbmVyZ3k6IGFueSwgY29udGV4dDogYW55LCB0YWdzOiBzdHJpbmdbXSkgeyB0aGlzLmZpbHRlcnNFbmdpbmUuc2V0RmlsdGVyU3RhdGUoZW5lcmd5LCBjb250ZXh0LCB0YWdzKTsgdGhpcy5zYXZlKCk7IH1cbiAgICBjbGVhckZpbHRlcnMoKSB7IHRoaXMuZmlsdGVyc0VuZ2luZS5jbGVhckZpbHRlcnMoKTsgdGhpcy5zYXZlKCk7IH1cbiAgICBcbiAgICBnZXRHYW1lU3RhdHMoKSB7IHJldHVybiB0aGlzLmFuYWx5dGljc0VuZ2luZS5nZXRHYW1lU3RhdHMoKTsgfVxuICAgIGNoZWNrQm9zc01pbGVzdG9uZXMoKSB7IHJldHVybiB0aGlzLmFuYWx5dGljc0VuZ2luZS5jaGVja0Jvc3NNaWxlc3RvbmVzKCk7IH1cbiAgICBnZW5lcmF0ZVdlZWtseVJlcG9ydCgpIHsgcmV0dXJuIHRoaXMuYW5hbHl0aWNzRW5naW5lLmdlbmVyYXRlV2Vla2x5UmVwb3J0KCk7IH1cblxuICAgIHRhdW50KHRyaWdnZXI6IHN0cmluZykge1xuICAgICAgICBjb25zdCBtc2dzOiBhbnkgPSB7IFxuICAgICAgICAgICAgXCJmYWlsXCI6IFtcIlBhdGhldGljLlwiLCBcIlRyeSBhZ2Fpbi5cIiwgXCJJcyB0aGF0IGFsbD9cIl0sIFxuICAgICAgICAgICAgXCJsZXZlbF91cFwiOiBbXCJQb3dlciBvdmVyd2hlbG1pbmcuXCIsIFwiQXNjZW5kaW5nLlwiXSxcbiAgICAgICAgICAgIFwibG93X2hwXCI6IFtcIkJsZWVkaW5nIG91dC4uLlwiLCBcIkhvbGQgb24uXCJdIFxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBtc2cgPSBtc2dzW3RyaWdnZXJdID8gbXNnc1t0cmlnZ2VyXVtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBtc2dzW3RyaWdnZXJdLmxlbmd0aCldIDogXCJPYnNlcnZlLlwiO1xuICAgICAgICBuZXcgTm90aWNlKGBTWVNURU06ICR7bXNnfWApO1xuICAgIH1cbiAgICBcbiAgICBwYXJzZVF1aWNrSW5wdXQodGV4dDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IG1hdGNoID0gdGV4dC5tYXRjaCgvKC4rPylcXHMqXFwvKFxcZCkvKTtcbiAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICBjb25zdCBkaWZmID0gTWF0aC5taW4oNSwgTWF0aC5tYXgoMSwgcGFyc2VJbnQobWF0Y2hbMl0sIDEwKSB8fCAzKSk7XG4gICAgICAgICAgICB0aGlzLmNyZWF0ZVF1ZXN0KG1hdGNoWzFdLCBkaWZmLCBcIk5vbmVcIiwgXCJOb25lXCIsIG1vbWVudCgpLmFkZCgyNCwgJ2hvdXJzJykudG9JU09TdHJpbmcoKSwgZmFsc2UsIFwiTm9ybWFsXCIsIGZhbHNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlUXVlc3QodGV4dCwgMywgXCJOb25lXCIsIFwiTm9uZVwiLCBtb21lbnQoKS5hZGQoMjQsICdob3VycycpLnRvSVNPU3RyaW5nKCksIGZhbHNlLCBcIk5vcm1hbFwiLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyB0cmlnZ2VyRGVhdGgoKSB7XG4gICAgICAgIGNvbnN0IG5leHREZWF0aCA9ICh0aGlzLnNldHRpbmdzLmxlZ2FjeT8uZGVhdGhDb3VudCB8fCAwKSArIDE7XG4gICAgICAgIGNvbnN0IHJ1bkxldmVsID0gdGhpcy5zZXR0aW5ncy5sZXZlbDtcbiAgICAgICAgY29uc3QgcnVuU3RyZWFrID0gdGhpcy5zZXR0aW5ncy5zdHJlYWs/Lmxvbmdlc3QgfHwgMDtcbiAgICAgICAgY29uc3QgYm9zc2VzRGVmZWF0ZWQgPSAodGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcyB8fCBbXSkuZmlsdGVyKChiOiB7IGRlZmVhdGVkPzogYm9vbGVhbiB9KSA9PiBiLmRlZmVhdGVkKS5sZW5ndGg7XG5cbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLnNjYXJzKSB0aGlzLnNldHRpbmdzLnNjYXJzID0gW107XG4gICAgICAgIHRoaXMuc2V0dGluZ3Muc2NhcnMucHVzaCh7XG4gICAgICAgICAgICBpZDogYGRlYXRoXyR7RGF0ZS5ub3coKX1gLFxuICAgICAgICAgICAgbGFiZWw6IFwiRGVhdGhcIixcbiAgICAgICAgICAgIHZhbHVlOiBgIyR7bmV4dERlYXRofSDCtyBMdiAke3J1bkxldmVsfSDCtyBTdHJlYWsgJHtydW5TdHJlYWt9IMK3IEJvc3NlcyAke2Jvc3Nlc0RlZmVhdGVkfWAsXG4gICAgICAgICAgICBlYXJuZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGFjdGl2ZUZvbGRlciA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChcIkFjdGl2ZV9SdW4vUXVlc3RzXCIpO1xuICAgICAgICBjb25zdCBncmF2ZUZvbGRlciA9IFwiR3JhdmV5YXJkL0RlYXRocy9cIiArIG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tREQtSEhtbVwiKTtcbiAgICAgICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZ3JhdmVGb2xkZXIpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZ3JhdmVGb2xkZXIpO1xuXG4gICAgICAgIGlmIChhY3RpdmVGb2xkZXIgaW5zdGFuY2VvZiBURm9sZGVyKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgYWN0aXZlRm9sZGVyLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5yZW5hbWVGaWxlKGZpbGUsIGAke2dyYXZlRm9sZGVyfS8ke2ZpbGUubmFtZX1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNldHRpbmdzLmxldmVsID0gMTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5ocCA9IDEwMDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5nb2xkID0gMDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sZWdhY3kuZGVhdGhDb3VudCA9IG5leHREZWF0aDtcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlKCk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgbW9tZW50IH0gZnJvbSAnb2JzaWRpYW4nO1xuXG5leHBvcnQgY2xhc3MgQ2hhcnRSZW5kZXJlciB7XG4gICAgLy8gW0ZJWF0gQWRkZWQgb3B0aW9uYWwgJ3dpZHRoJyBwYXJhbWV0ZXJcbiAgICBzdGF0aWMgcmVuZGVyTGluZUNoYXJ0KHBhcmVudDogSFRNTEVsZW1lbnQsIG1ldHJpY3M6IGFueVtdLCB3aWR0aE92ZXJyaWRlPzogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGhlaWdodCA9IDEwMDsgLy8gTWF0Y2hlcyBDU1MgaGVpZ2h0XG4gICAgICAgIGNvbnN0IHdpZHRoID0gd2lkdGhPdmVycmlkZSB8fCBwYXJlbnQuY2xpZW50V2lkdGggfHwgMzAwO1xuICAgICAgICBjb25zdCBwYWRkaW5nID0gNTsgLy8gUmVkdWNlZCBwYWRkaW5nXG4gICAgICAgIFxuICAgICAgICBjb25zdCBkYXRhOiBudW1iZXJbXSA9IFtdO1xuICAgICAgICBjb25zdCBsYWJlbHM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSA2OyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgY29uc3QgZCA9IG1vbWVudCgpLnN1YnRyYWN0KGksICdkYXlzJykuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgICAgIGNvbnN0IG0gPSBtZXRyaWNzLmZpbmQoeCA9PiB4LmRhdGUgPT09IGQpO1xuICAgICAgICAgICAgZGF0YS5wdXNoKG0gPyBtLnF1ZXN0c0NvbXBsZXRlZCA6IDApO1xuICAgICAgICAgICAgbGFiZWxzLnB1c2gobW9tZW50KGQpLmZvcm1hdChcImRkZFwiKSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtYXhWYWwgPSBNYXRoLm1heCguLi5kYXRhLCA1KTtcbiAgICAgICAgY29uc3QgcG9pbnRzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBjb25zdCBkaXZpc29yID0gTWF0aC5tYXgoMSwgZGF0YS5sZW5ndGggLSAxKTtcblxuICAgICAgICBkYXRhLmZvckVhY2goKHZhbCwgaWR4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB4ID0gKGlkeCAvIGRpdmlzb3IpICogKHdpZHRoIC0gcGFkZGluZyAqIDIpICsgcGFkZGluZztcbiAgICAgICAgICAgIGNvbnN0IHkgPSBoZWlnaHQgLSAoKHZhbCAvIG1heFZhbCkgKiAoaGVpZ2h0IC0gcGFkZGluZyAqIDIpKSAtIHBhZGRpbmc7XG4gICAgICAgICAgICBwb2ludHMucHVzaChgJHt4fSwke3l9YCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IHN2ZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsIFwic3ZnXCIpO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKFwid2lkdGhcIiwgXCIxMDAlXCIpO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKFwiaGVpZ2h0XCIsIFwiMTAwJVwiKTsgLy8gRml0IGNvbnRhaW5lclxuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKFwidmlld0JveFwiLCBgMCAwICR7d2lkdGh9ICR7aGVpZ2h0fWApOyAvLyBTY2FsZSBjb3JyZWN0bHlcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZShcInByZXNlcnZlQXNwZWN0UmF0aW9cIiwgXCJub25lXCIpOyAvLyBTdHJldGNoIHRvIGZpdFxuICAgICAgICBzdmcuY2xhc3NMaXN0LmFkZChcInNpc3ktY2hhcnQtc3ZnXCIpO1xuICAgICAgICBwYXJlbnQuYXBwZW5kQ2hpbGQoc3ZnKTtcblxuICAgICAgICBjb25zdCBwb2x5bGluZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsIFwicG9seWxpbmVcIik7XG4gICAgICAgIHBvbHlsaW5lLnNldEF0dHJpYnV0ZShcInBvaW50c1wiLCBwb2ludHMuam9pbihcIiBcIikpO1xuICAgICAgICBwb2x5bGluZS5zZXRBdHRyaWJ1dGUoXCJmaWxsXCIsIFwibm9uZVwiKTtcbiAgICAgICAgcG9seWxpbmUuc2V0QXR0cmlidXRlKFwic3Ryb2tlXCIsIFwiIzAwYjBmZlwiKTtcbiAgICAgICAgcG9seWxpbmUuc2V0QXR0cmlidXRlKFwic3Ryb2tlLXdpZHRoXCIsIFwiMlwiKTtcbiAgICAgICAgc3ZnLmFwcGVuZENoaWxkKHBvbHlsaW5lKTtcblxuICAgICAgICBwb2ludHMuZm9yRWFjaCgocCwgaSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgW2N4LCBjeV0gPSBwLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgIGNvbnN0IGNpcmNsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsIFwiY2lyY2xlXCIpO1xuICAgICAgICAgICAgY2lyY2xlLnNldEF0dHJpYnV0ZShcImN4XCIsIGN4KTtcbiAgICAgICAgICAgIGNpcmNsZS5zZXRBdHRyaWJ1dGUoXCJjeVwiLCBjeSk7XG4gICAgICAgICAgICBjaXJjbGUuc2V0QXR0cmlidXRlKFwiclwiLCBcIjNcIik7XG4gICAgICAgICAgICBjaXJjbGUuc2V0QXR0cmlidXRlKFwiZmlsbFwiLCBcIiMwMGIwZmZcIik7XG4gICAgICAgICAgICBzdmcuYXBwZW5kQ2hpbGQoY2lyY2xlKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc3RhdGljIHJlbmRlckhlYXRtYXAocGFyZW50OiBIVE1MRWxlbWVudCwgbWV0cmljczogYW55W10pIHtcbiAgICAgICAgY29uc3QgaGVhdG1hcCA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1oZWF0bWFwXCIgfSk7XG4gICAgXG4gICAgICAgIGZvciAobGV0IGkgPSAyNzsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBtb21lbnQoKS5zdWJ0cmFjdChpLCAnZGF5cycpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgICAgICBjb25zdCBtID0gbWV0cmljcy5maW5kKHggPT4geC5kYXRlID09PSBkYXRlKTtcbiAgICAgICAgICAgIGNvbnN0IGNvdW50ID0gbSA/IG0ucXVlc3RzQ29tcGxldGVkIDogMDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbGV0IGNvbG9yID0gXCJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpXCI7XG4gICAgICAgICAgICBpZiAoY291bnQgPiAwKSBjb2xvciA9IFwicmdiYSgwLCAxNzYsIDI1NSwgMC4zKVwiO1xuICAgICAgICAgICAgaWYgKGNvdW50ID4gMykgY29sb3IgPSBcInJnYmEoMCwgMTc2LCAyNTUsIDAuNilcIjtcbiAgICAgICAgICAgIGlmIChjb3VudCA+IDYpIGNvbG9yID0gXCJyZ2JhKDAsIDE3NiwgMjU1LCAxLjApXCI7XG5cbiAgICAgICAgICAgIGNvbnN0IGRheSA9IGhlYXRtYXAuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktaGVhdC1jZWxsXCIgfSk7XG4gICAgICAgICAgICBkYXkuc3R5bGUuYmFja2dyb3VuZCA9IGNvbG9yO1xuICAgICAgICAgICAgZGF5LnNldEF0dHJpYnV0ZShcInRpdGxlXCIsIGAke2RhdGV9OiAke2NvdW50fSBxdWVzdHNgKTtcbiAgICAgICAgICAgIGlmIChpID09PSAwKSBkYXkuc3R5bGUuYm9yZGVyID0gXCIxcHggc29saWQgd2hpdGVcIjtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsImltcG9ydCB7IFRGaWxlLCBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgdHlwZSB7IFBhbm9wdGljb25WaWV3IH0gZnJvbSAnLi92aWV3JztcblxuZXhwb3J0IGNsYXNzIFF1ZXN0Q2FyZFJlbmRlcmVyIHtcbiAgICBzdGF0aWMgcmVuZGVyKHBhcmVudDogSFRNTEVsZW1lbnQsIGZpbGU6IFRGaWxlLCB2aWV3OiBQYW5vcHRpY29uVmlldykge1xuICAgICAgICBjb25zdCBmbSA9IHZpZXcuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcbiAgICAgICAgY29uc3QgY2FyZCA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jYXJkXCIgfSk7XG5cbiAgICAgICAgaWYgKHZpZXcuc2VsZWN0TW9kZSkge1xuICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IHZpZXcuc2VsZWN0ZWRRdWVzdHMuaGFzKGZpbGUpO1xuICAgICAgICAgICAgaWYgKGlzU2VsZWN0ZWQpIGNhcmQuc3R5bGUuYm9yZGVyQ29sb3IgPSBcInZhcigtLXNpc3ktYmx1ZSlcIjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgdG9wID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jYXJkLXRvcFwiIH0pO1xuICAgICAgICAgICAgY29uc3QgY2IgPSB0b3AuY3JlYXRlRWwoXCJpbnB1dFwiLCB7IHR5cGU6IFwiY2hlY2tib3hcIiB9KTtcbiAgICAgICAgICAgIGNiLmNoZWNrZWQgPSBpc1NlbGVjdGVkO1xuICAgICAgICAgICAgY2Iuc3R5bGUubWFyZ2luUmlnaHQgPSBcIjEwcHhcIjtcbiAgICAgICAgICAgIHRvcC5jcmVhdGVEaXYoeyB0ZXh0OiBmaWxlLmJhc2VuYW1lLCBjbHM6IFwic2lzeS1jYXJkLXRpdGxlXCIgfSk7XG5cbiAgICAgICAgICAgIGNhcmQub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodmlldy5zZWxlY3RlZFF1ZXN0cy5oYXMoZmlsZSkpIHZpZXcuc2VsZWN0ZWRRdWVzdHMuZGVsZXRlKGZpbGUpO1xuICAgICAgICAgICAgICAgIGVsc2Ugdmlldy5zZWxlY3RlZFF1ZXN0cy5hZGQoZmlsZSk7XG4gICAgICAgICAgICAgICAgdmlldy5yZWZyZXNoKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGZtPy5pc19ib3NzKSBjYXJkLmFkZENsYXNzKFwic2lzeS1jYXJkLWJvc3NcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vID09PSBJTVBST1ZFRCBEUkFHICYgRFJPUCA9PT1cbiAgICAgICAgICAgIGNhcmQuc2V0QXR0cmlidXRlKFwiZHJhZ2dhYmxlXCIsIFwidHJ1ZVwiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FyZC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ3N0YXJ0XCIsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgdmlldy5kcmFnZ2VkRmlsZSA9IGZpbGU7XG4gICAgICAgICAgICAgICAgY2FyZC5zdHlsZS5vcGFjaXR5ID0gXCIwLjRcIjtcbiAgICAgICAgICAgICAgICBjYXJkLnN0eWxlLnRyYW5zZm9ybSA9IFwic2NhbGUoMC45NSlcIjtcbiAgICAgICAgICAgICAgICAvLyBTZXQgZGF0YSBmb3IgY29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgICAgIGUuZGF0YVRyYW5zZmVyPy5zZXREYXRhKFwidGV4dC9wbGFpblwiLCBmaWxlLnBhdGgpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNhcmQuYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdlbmRcIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhcmQuc3R5bGUub3BhY2l0eSA9IFwiMVwiO1xuICAgICAgICAgICAgICAgIGNhcmQuc3R5bGUudHJhbnNmb3JtID0gXCJub25lXCI7XG4gICAgICAgICAgICAgICAgdmlldy5kcmFnZ2VkRmlsZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHZpc3VhbCBndWlkZXMgZnJvbSBhbGwgY2FyZHNcbiAgICAgICAgICAgICAgICBwYXJlbnQucXVlcnlTZWxlY3RvckFsbChcIi5zaXN5LWNhcmRcIikuZm9yRWFjaChlbCA9PiAoZWwgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLmJvcmRlclRvcCA9IFwiXCIpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNhcmQuYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdvdmVyXCIsIChlKSA9PiB7IFxuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTsgXG4gICAgICAgICAgICAgICAgLy8gVmlzdWFsIEN1ZTogQmx1ZSBsaW5lIGFib3ZlIGNhcmRcbiAgICAgICAgICAgICAgICBjYXJkLnN0eWxlLmJvcmRlclRvcCA9IFwiM3B4IHNvbGlkIHZhcigtLXNpc3ktYmx1ZSlcIjsgXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY2FyZC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ2xlYXZlXCIsICgpID0+IHsgXG4gICAgICAgICAgICAgICAgY2FyZC5zdHlsZS5ib3JkZXJUb3AgPSBcIlwiOyBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXJkLmFkZEV2ZW50TGlzdGVuZXIoXCJkcm9wXCIsIGFzeW5jIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGNhcmQuc3R5bGUuYm9yZGVyVG9wID0gXCJcIjtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAodmlldy5kcmFnZ2VkRmlsZSAmJiB2aWV3LmRyYWdnZWRGaWxlICE9PSBmaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgY29uc3QgZHJhZ2dlZCA9IHZpZXcuZHJhZ2dlZEZpbGU7XG4gICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgLy8gTG9naWM6IFBsYWNlICdkcmFnZ2VkJyBCRUZPUkUgJ2ZpbGUnXG4gICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0Rm0gPSB2aWV3LmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgICAgICAgICAgICAgLy8gR2V0IHRhcmdldCBvcmRlciwgZGVmYXVsdCB0byBcIm5vd1wiIGlmIG1pc3NpbmdcbiAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRPcmRlciA9IHRhcmdldEZtPy5tYW51YWxfb3JkZXIgIT09IHVuZGVmaW5lZCA/IHRhcmdldEZtLm1hbnVhbF9vcmRlciA6IG1vbWVudCgpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAvLyBOZXcgb3JkZXIgaXMgc2xpZ2h0bHkgbGVzcyB0aGFuIHRhcmdldCAocHV0cyBpdCBhYm92ZSlcbiAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdPcmRlciA9IHRhcmdldE9yZGVyIC0gMTAwOyAvLyBHYXAgb2YgMTAwIHRvIHByZXZlbnQgY29sbGlzaW9uc1xuXG4gICAgICAgICAgICAgICAgICAgLy8gQXBwbHkgY2hhbmdlXG4gICAgICAgICAgICAgICAgICAgYXdhaXQgdmlldy5wbHVnaW4uYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihkcmFnZ2VkLCAoZjphbnkpID0+IHsgXG4gICAgICAgICAgICAgICAgICAgICAgIGYubWFudWFsX29yZGVyID0gbmV3T3JkZXI7IFxuICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgIC8vIFtGSVhdIEZvcmNlIGVuZ2luZSB1cGRhdGUgdG8gcmUtc29ydCBsaXN0IGltbWVkaWF0ZWx5XG4gICAgICAgICAgICAgICAgICAgdmlldy5wbHVnaW4uZW5naW5lLnRyaWdnZXIoXCJ1cGRhdGVcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgICAgICAgICBjb25zdCB0b3AgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNhcmQtdG9wXCIgfSk7XG4gICAgICAgICAgICBjb25zdCB0aXRsZVJvdyA9IHRvcC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jYXJkLW1ldGFcIiB9KTtcbiAgICAgICAgICAgIHRpdGxlUm93LmNyZWF0ZURpdih7IHRleHQ6IGZpbGUuYmFzZW5hbWUsIGNsczogXCJzaXN5LWNhcmQtdGl0bGVcIiB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGZtPy5kZWFkbGluZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpZmYgPSBtb21lbnQoZm0uZGVhZGxpbmUpLmRpZmYobW9tZW50KCksICdtaW51dGVzJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgdCA9IHRvcC5jcmVhdGVEaXYoeyB0ZXh0OiBkaWZmIDwgMCA/IFwiRVhQSVJFRFwiIDogYCR7TWF0aC5mbG9vcihkaWZmLzYwKX1oICR7ZGlmZiU2MH1tYCwgY2xzOiBcInNpc3ktdGltZXJcIiB9KTtcbiAgICAgICAgICAgICAgICBpZiAoZGlmZiA8IDYwKSB0LmFkZENsYXNzKFwic2lzeS10aW1lci1sYXRlXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB0cmFzaCA9IHRvcC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1idG5cIiwgdGV4dDogXCJYXCIsIGF0dHI6IHsgc3R5bGU6IFwicGFkZGluZzogMnB4IDhweDsgZm9udC1zaXplOiAwLjhlbTtcIiB9IH0pO1xuICAgICAgICAgICAgdHJhc2gub25jbGljayA9IChlKSA9PiB7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IHZpZXcucGx1Z2luLmVuZ2luZS5kZWxldGVRdWVzdChmaWxlKTsgfTtcblxuICAgICAgICAgICAgaWYgKGZtPy5pc19ib3NzICYmIGZtPy5ib3NzX21heF9ocCkge1xuICAgICAgICAgICAgICAgICBjb25zdCBiYXIgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJhci1iZ1wiIH0pO1xuICAgICAgICAgICAgICAgICBjb25zdCBwY3QgPSAoKGZtLmJvc3NfaHAgPz8gMCkgLyBmbS5ib3NzX21heF9ocCkgKiAxMDA7XG4gICAgICAgICAgICAgICAgIGJhci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1iYXItZmlsbCBzaXN5LWZpbGwtcmVkXCIsIGF0dHI6IHsgc3R5bGU6IGB3aWR0aDoke3BjdH0lO2AgfSB9KTtcbiAgICAgICAgICAgICAgICAgY2FyZC5jcmVhdGVEaXYoeyB0ZXh0OiBgJHtmbS5ib3NzX2hwfS8ke2ZtLmJvc3NfbWF4X2hwfSBIUGAsIGF0dHI6IHsgc3R5bGU6IFwidGV4dC1hbGlnbjpjZW50ZXI7IGZvbnQtc2l6ZTowLjhlbTsgY29sb3I6dmFyKC0tc2lzeS1yZWQpOyBmb250LXdlaWdodDpib2xkO1wiIH0gfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGFjdHMgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWFjdGlvbnNcIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IGJPayA9IGFjdHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkNPTVBMRVRFXCIsIGNsczogXCJzaXN5LWJ0biBtb2QtZG9uZSBzaXN5LWFjdGlvbi1idG5cIiB9KTtcbiAgICAgICAgICAgIGJPay5vbmNsaWNrID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgdmlldy5wbHVnaW4uZW5naW5lLmNvbXBsZXRlUXVlc3QoZmlsZSk7IH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGJGYWlsID0gYWN0cy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiRkFJTFwiLCBjbHM6IFwic2lzeS1idG4gbW9kLWZhaWwgc2lzeS1hY3Rpb24tYnRuXCIgfSk7XG4gICAgICAgICAgICBiRmFpbC5vbmNsaWNrID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgdmlldy5wbHVnaW4uZW5naW5lLmZhaWxRdWVzdChmaWxlLCB0cnVlKTsgfTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsImltcG9ydCB7IEl0ZW1WaWV3LCBXb3Jrc3BhY2VMZWFmLCBURmlsZSwgVEZvbGRlciwgbW9tZW50LCBkZWJvdW5jZSB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCBTaXN5cGh1c1BsdWdpbiBmcm9tICcuLi9tYWluJztcbmltcG9ydCB7IFF1ZXN0TW9kYWwsIFNob3BNb2RhbCwgU2tpbGxEZXRhaWxNb2RhbCwgU2tpbGxNYW5hZ2VyTW9kYWwsIFNjYXJzTW9kYWwgfSBmcm9tICcuL21vZGFscyc7XG5pbXBvcnQgeyBTa2lsbCwgRGFpbHlNaXNzaW9uIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgQ2hhcnRSZW5kZXJlciB9IGZyb20gJy4vY2hhcnRzJztcbmltcG9ydCB7IFF1ZXN0Q2FyZFJlbmRlcmVyIH0gZnJvbSAnLi9jYXJkJztcblxuZXhwb3J0IGNvbnN0IFZJRVdfVFlQRV9QQU5PUFRJQ09OID0gXCJzaXN5cGh1cy1wYW5vcHRpY29uXCI7XG5cbmV4cG9ydCBjbGFzcyBQYW5vcHRpY29uVmlldyBleHRlbmRzIEl0ZW1WaWV3IHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuICAgIGRyYWdnZWRGaWxlOiBURmlsZSB8IG51bGwgPSBudWxsO1xuICAgIHNlbGVjdE1vZGU6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICBzZWxlY3RlZFF1ZXN0czogU2V0PFRGaWxlPiA9IG5ldyBTZXQoKTtcbiAgICBcbiAgICBwcml2YXRlIG9ic2VydmVyOiBJbnRlcnNlY3Rpb25PYnNlcnZlciB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgY3VycmVudFF1ZXN0TGlzdDogVEZpbGVbXSA9IFtdO1xuICAgIHByaXZhdGUgcmVuZGVyZWRDb3VudDogbnVtYmVyID0gMDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IEJBVENIX1NJWkUgPSAyMDtcblxuICAgIHByaXZhdGUgZGVib3VuY2VkUmVmcmVzaCA9IGRlYm91bmNlKHRoaXMucmVmcmVzaC5iaW5kKHRoaXMpLCA1MCwgdHJ1ZSk7XG5cbiAgICBjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7XG4gICAgICAgIHN1cGVyKGxlYWYpO1xuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICB9XG5cbiAgICBnZXRWaWV3VHlwZSgpIHsgcmV0dXJuIFZJRVdfVFlQRV9QQU5PUFRJQ09OOyB9XG4gICAgZ2V0RGlzcGxheVRleHQoKSB7IHJldHVybiBcIkV5ZSBTaXN5cGh1c1wiOyB9XG4gICAgZ2V0SWNvbigpIHsgcmV0dXJuIFwic2t1bGxcIjsgfVxuXG4gICAgYXN5bmMgb25PcGVuKCkgeyBcbiAgICAgICAgdGhpcy5yZWZyZXNoKCk7IFxuICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUub24oJ3VwZGF0ZScsIHRoaXMuZGVib3VuY2VkUmVmcmVzaCk7IFxuICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUub24oJ3VuZG86c2hvdycsIChuYW1lOiBzdHJpbmcpID0+IHRoaXMuc2hvd1VuZG9Ub2FzdChuYW1lKSk7XG4gICAgfVxuXG4gICAgYXN5bmMgb25DbG9zZSgpIHtcbiAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLm9mZigndXBkYXRlJywgdGhpcy5kZWJvdW5jZWRSZWZyZXNoKTtcbiAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLm9mZigndW5kbzpzaG93JywgdGhpcy5zaG93VW5kb1RvYXN0LmJpbmQodGhpcykpO1xuICAgICAgICBpZiAodGhpcy5vYnNlcnZlcikgdGhpcy5vYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgfVxuXG4gICAgYXN5bmMgcmVmcmVzaCgpIHtcbiAgICAgICAgLy8gMS4gQ2FwdHVyZSBTdGF0ZSAmIERpbWVuc2lvbnNcbiAgICAgICAgY29uc3Qgc2Nyb2xsQXJlYSA9IHRoaXMuY29udGVudEVsLnF1ZXJ5U2VsZWN0b3IoXCIuc2lzeS1zY3JvbGwtYXJlYVwiKSBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgbGV0IGxhc3RTY3JvbGwgPSAwO1xuICAgICAgICBpZiAoc2Nyb2xsQXJlYSkgbGFzdFNjcm9sbCA9IHNjcm9sbEFyZWEuc2Nyb2xsVG9wO1xuXG4gICAgICAgIC8vIFtGSVhdIE1lYXN1cmUgd2lkdGggQkVGT1JFIHdpcGluZyBET00gc28gd2UgY2FuIGRyYXcgY2hhcnRzIG9mZi1zY3JlZW5cbiAgICAgICAgY29uc3QgY3VycmVudFdpZHRoID0gdGhpcy5jb250ZW50RWwuY2xpZW50V2lkdGggfHwgMzAwOyBcblxuICAgICAgICBjb25zdCBpdGVtc1RvUmVzdG9yZSA9IE1hdGgubWF4KHRoaXMucmVuZGVyZWRDb3VudCwgdGhpcy5CQVRDSF9TSVpFKTtcblxuICAgICAgICBjb25zdCBhY3RpdmVFbCA9IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgIGNvbnN0IGlzUXVpY2tJbnB1dCA9IGFjdGl2ZUVsICYmIGFjdGl2ZUVsLmNsYXNzTGlzdC5jb250YWlucyhcInNpc3ktcXVpY2staW5wdXRcIik7XG4gICAgICAgIGxldCBxdWlja0lucHV0VmFsdWUgPSBcIlwiO1xuICAgICAgICBpZiAoaXNRdWlja0lucHV0KSBxdWlja0lucHV0VmFsdWUgPSAoYWN0aXZlRWwgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWU7XG5cbiAgICAgICAgLy8gMi4gQ2xlYW4gJiBQcmVwXG4gICAgICAgIGlmICh0aGlzLm9ic2VydmVyKSB7IHRoaXMub2JzZXJ2ZXIuZGlzY29ubmVjdCgpOyB0aGlzLm9ic2VydmVyID0gbnVsbDsgfVxuICAgICAgICB0aGlzLnByZXBhcmVRdWVzdHMoKTsgXG4gICAgICAgIHRoaXMucmVuZGVyZWRDb3VudCA9IDA7IFxuXG4gICAgICAgIC8vIDMuIEJ1aWxkIEJ1ZmZlclxuICAgICAgICBjb25zdCBidWZmZXIgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGJ1ZmZlci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jb250YWluZXJcIiB9KTtcbiAgICAgICAgY29uc3Qgc2Nyb2xsID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXNjcm9sbC1hcmVhXCIgfSk7XG4gICAgICAgIHNjcm9sbC5zdHlsZS5zY3JvbGxCZWhhdmlvciA9IFwiYXV0b1wiO1xuXG4gICAgICAgIC8vIC0tLSBVSSBDT05TVFJVQ1RJT04gLS0tXG4gICAgICAgIGNvbnN0IGhlYWRlciA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1oZWFkZXJcIiB9KTtcbiAgICAgICAgaGVhZGVyLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIkV5ZSBTSVNZUEhVUyBPU1wiIH0pO1xuICAgICAgICBjb25zdCBzb3VuZEJ0biA9IGhlYWRlci5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5tdXRlZCA/IFwi8J+Uh1wiIDogXCLwn5SKXCIsIGNsczogXCJzaXN5LXNvdW5kLWJ0blwiIH0pO1xuICAgICAgICBzb3VuZEJ0bi5vbmNsaWNrID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLm11dGVkID0gIXRoaXMucGx1Z2luLnNldHRpbmdzLm11dGVkO1xuICAgICAgICAgICAgIHRoaXMucGx1Z2luLmF1ZGlvLnNldE11dGVkKHRoaXMucGx1Z2luLnNldHRpbmdzLm11dGVkKTtcbiAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICB0aGlzLmRlYm91bmNlZFJlZnJlc2goKTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnJlbmRlckFsZXJ0cyhzY3JvbGwpO1xuXG4gICAgICAgIGNvbnN0IGh1ZCA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1odWRcIiB9KTtcbiAgICAgICAgdGhpcy5zdGF0KGh1ZCwgXCJIRUFMVEhcIiwgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuaHB9LyR7dGhpcy5wbHVnaW4uc2V0dGluZ3MubWF4SHB9YCwgdGhpcy5wbHVnaW4uc2V0dGluZ3MuaHAgPCAzMCA/IFwic2lzeS1jcml0aWNhbFwiIDogXCJcIik7XG4gICAgICAgIHRoaXMuc3RhdChodWQsIFwiR09MRFwiLCBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkfWAsIHRoaXMucGx1Z2luLnNldHRpbmdzLmdvbGQgPCAwID8gXCJzaXN5LXZhbC1kZWJ0XCIgOiBcIlwiKTtcbiAgICAgICAgdGhpcy5zdGF0KGh1ZCwgXCJMRVZFTFwiLCBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5sZXZlbH1gKTtcbiAgICAgICAgdGhpcy5zdGF0KGh1ZCwgXCJSSVZBTCBETUdcIiwgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3Mucml2YWxEbWd9YCk7XG5cbiAgICAgICAgdGhpcy5yZW5kZXJPcmFjbGUoc2Nyb2xsKTtcblxuICAgICAgICB0aGlzLnJlbmRlclNjYXJzKHNjcm9sbCk7XG5cbiAgICAgICAgc2Nyb2xsLmNyZWF0ZURpdih7IHRleHQ6IFwiVE9EQVlTIE9CSkVDVElWRVNcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICB0aGlzLnJlbmRlckRhaWx5TWlzc2lvbnMoc2Nyb2xsKTtcblxuICAgICAgICBjb25zdCBjdHJscyA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jb250cm9sc1wiIH0pO1xuICAgICAgICBjdHJscy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiREVQTE9ZXCIsIGNsczogXCJzaXN5LWJ0biBtb2QtY3RhXCIgfSkub25jbGljayA9ICgpID0+IG5ldyBRdWVzdE1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpO1xuICAgICAgICBjdHJscy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiU0hPUFwiLCBjbHM6IFwic2lzeS1idG5cIiB9KS5vbmNsaWNrID0gKCkgPT4gbmV3IFNob3BNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4pLm9wZW4oKTtcbiAgICAgICAgY3RybHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkZPQ1VTXCIsIGNsczogXCJzaXN5LWJ0blwiIH0pLm9uY2xpY2sgPSAoKSA9PiB0aGlzLnBsdWdpbi5hdWRpby50b2dnbGVCcm93bk5vaXNlKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBzZWxCdG4gPSBjdHJscy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IFxuICAgICAgICAgICAgdGV4dDogdGhpcy5zZWxlY3RNb2RlID8gYENBTkNFTCAoJHt0aGlzLnNlbGVjdGVkUXVlc3RzLnNpemV9KWAgOiBcIlNFTEVDVFwiLCBcbiAgICAgICAgICAgIGNsczogXCJzaXN5LWJ0blwiIFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0TW9kZSkgc2VsQnRuLmFkZENsYXNzKFwic2lzeS1maWx0ZXItYWN0aXZlXCIpO1xuICAgICAgICBzZWxCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0TW9kZSA9ICF0aGlzLnNlbGVjdE1vZGU7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkUXVlc3RzLmNsZWFyKCk7XG4gICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJGSUxURVIgQ09OVFJPTFNcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICB0aGlzLnJlbmRlckZpbHRlckJhcihzY3JvbGwpO1xuXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0QWN0aXZlQ2hhaW4oKSkge1xuICAgICAgICAgICAgc2Nyb2xsLmNyZWF0ZURpdih7IHRleHQ6IFwiQUNUSVZFIENIQUlOXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyQ2hhaW5TZWN0aW9uKHNjcm9sbCk7XG4gICAgICAgIH1cblxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJSRVNFQVJDSCBMSUJSQVJZXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgdGhpcy5yZW5kZXJSZXNlYXJjaFNlY3Rpb24oc2Nyb2xsKTtcblxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJBTkFMWVRJQ1NcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICBjb25zdCBhbmFseXRpY3NDb250YWluZXIgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYW5hbHl0aWNzXCIgfSk7XG4gICAgICAgIHRoaXMuc2V0dXBBbmFseXRpY3NTdHJ1Y3R1cmUoYW5hbHl0aWNzQ29udGFpbmVyKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFtGSVhdIFJlbmRlciBDaGFydHMgTk9XLCBpbnRvIHRoZSBidWZmZXIsIHVzaW5nIHRoZSBjYXB0dXJlZCB3aWR0aFxuICAgICAgICAvLyBUaGlzIGVuc3VyZXMgdGhleSBhcmUgZnVsbHkgZHJhd24gYmVmb3JlIHRoZSB1c2VyIHNlZXMgdGhlbS5cbiAgICAgICAgdGhpcy5yZW5kZXJBbmFseXRpY3NDaGFydHMoYW5hbHl0aWNzQ29udGFpbmVyLCBjdXJyZW50V2lkdGgpO1xuXG4gICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIkFDVElWRSBUSFJFQVRTXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgY29uc3QgcXVlc3RDb250YWluZXIgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktcXVlc3QtY29udGFpbmVyXCIgfSk7XG4gICAgICAgIHRoaXMucmVuZGVyUXVlc3RCYXRjaChxdWVzdENvbnRhaW5lciwgaXRlbXNUb1Jlc3RvcmUpO1xuXG4gICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIk5FVVJBTCBIVUJcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICB0aGlzLnJlbmRlclNraWxscyhzY3JvbGwpO1xuXG4gICAgICAgIGNvbnN0IGZvb3RlciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1xdWljay1jYXB0dXJlXCIgfSk7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gZm9vdGVyLmNyZWF0ZUVsKFwiaW5wdXRcIiwgeyBjbHM6IFwic2lzeS1xdWljay1pbnB1dFwiLCBwbGFjZWhvbGRlcjogXCJNaXNzaW9uIC8xLi4uNVwiIH0pO1xuICAgICAgICBpZiAoaXNRdWlja0lucHV0KSBpbnB1dC52YWx1ZSA9IHF1aWNrSW5wdXRWYWx1ZTtcbiAgICAgICAgXG4gICAgICAgIGlucHV0Lm9ua2V5ZG93biA9IGFzeW5jIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXkgPT09ICdFbnRlcicgJiYgaW5wdXQudmFsdWUudHJpbSgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLnBhcnNlUXVpY2tJbnB1dChpbnB1dC52YWx1ZS50cmltKCkpO1xuICAgICAgICAgICAgICAgIGlucHV0LnZhbHVlID0gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnJlbmRlckJ1bGtCYXIoY29udGFpbmVyKTtcblxuICAgICAgICAvLyA0LiBUSEUgU1dBUFxuICAgICAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgICAgICB0aGlzLmNvbnRlbnRFbC5hcHBlbmRDaGlsZChidWZmZXIpO1xuXG4gICAgICAgIC8vIDUuIFJFU1RPUkVcbiAgICAgICAgaWYgKGlzUXVpY2tJbnB1dCkge1xuICAgICAgICAgICAgY29uc3QgbmV3SW5wdXQgPSB0aGlzLmNvbnRlbnRFbC5xdWVyeVNlbGVjdG9yKFwiLnNpc3ktcXVpY2staW5wdXRcIikgYXMgSFRNTElucHV0RWxlbWVudDtcbiAgICAgICAgICAgIGlmIChuZXdJbnB1dCkge1xuICAgICAgICAgICAgICAgIG5ld0lucHV0LmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgbGVuID0gbmV3SW5wdXQudmFsdWUubGVuZ3RoOyBcbiAgICAgICAgICAgICAgICBuZXdJbnB1dC5zZXRTZWxlY3Rpb25SYW5nZShsZW4sIGxlbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGFzdFNjcm9sbCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IG5ld1Njcm9sbCA9IHRoaXMuY29udGVudEVsLnF1ZXJ5U2VsZWN0b3IoXCIuc2lzeS1zY3JvbGwtYXJlYVwiKTtcbiAgICAgICAgICAgIGlmKG5ld1Njcm9sbCkgbmV3U2Nyb2xsLnNjcm9sbFRvcCA9IGxhc3RTY3JvbGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcmVwYXJlUXVlc3RzKCkge1xuICAgICAgICBjb25zdCBmb2xkZXIgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJBY3RpdmVfUnVuL1F1ZXN0c1wiKTtcbiAgICAgICAgdGhpcy5jdXJyZW50UXVlc3RMaXN0ID0gW107XG5cbiAgICAgICAgaWYgKGZvbGRlciBpbnN0YW5jZW9mIFRGb2xkZXIpIHtcbiAgICAgICAgICAgIGxldCBmaWxlcyA9IGZvbGRlci5jaGlsZHJlbi5maWx0ZXIoZiA9PiBmIGluc3RhbmNlb2YgVEZpbGUpIGFzIFRGaWxlW107XG4gICAgICAgICAgICBmaWxlcyA9IHRoaXMucGx1Z2luLmVuZ2luZS5maWx0ZXJzRW5naW5lLmZpbHRlclF1ZXN0cyhmaWxlcykgYXMgVEZpbGVbXTsgXG4gICAgICAgICAgICBmaWxlcy5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZm1BID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoYSk/LmZyb250bWF0dGVyO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZtQiA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGIpPy5mcm9udG1hdHRlcjtcbiAgICAgICAgICAgICAgICBjb25zdCBvcmRlckEgPSBmbUE/Lm1hbnVhbF9vcmRlciAhPT0gdW5kZWZpbmVkID8gZm1BLm1hbnVhbF9vcmRlciA6IDk5OTk5OTk5OTk5OTk7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3JkZXJCID0gZm1CPy5tYW51YWxfb3JkZXIgIT09IHVuZGVmaW5lZCA/IGZtQi5tYW51YWxfb3JkZXIgOiA5OTk5OTk5OTk5OTk5O1xuICAgICAgICAgICAgICAgIGlmIChvcmRlckEgIT09IG9yZGVyQikgcmV0dXJuIG9yZGVyQSAtIG9yZGVyQjtcbiAgICAgICAgICAgICAgICBpZiAoZm1BPy5pc19ib3NzICE9PSBmbUI/LmlzX2Jvc3MpIHJldHVybiAoZm1CPy5pc19ib3NzID8gMSA6IDApIC0gKGZtQT8uaXNfYm9zcyA/IDEgOiAwKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRlQSA9IGZtQT8uZGVhZGxpbmUgPyBtb21lbnQoZm1BLmRlYWRsaW5lKS52YWx1ZU9mKCkgOiA5OTk5OTk5OTk5OTk5O1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGVCID0gZm1CPy5kZWFkbGluZSA/IG1vbWVudChmbUIuZGVhZGxpbmUpLnZhbHVlT2YoKSA6IDk5OTk5OTk5OTk5OTk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGVBIC0gZGF0ZUI7IFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRRdWVzdExpc3QgPSBmaWxlcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlbmRlclF1ZXN0QmF0Y2goY29udGFpbmVyOiBIVE1MRWxlbWVudCwgYmF0Y2hTaXplOiBudW1iZXIgPSB0aGlzLkJBVENIX1NJWkUpIHtcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFF1ZXN0TGlzdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGlkbGUgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgdGV4dDogXCJTeXN0ZW0gSWRsZS5cIiwgY2xzOiBcInNpc3ktZW1wdHktc3RhdGVcIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IGN0YUJ0biA9IGlkbGUuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIltERVBMT1kgUVVFU1RdXCIsIGNsczogXCJzaXN5LWJ0biBtb2QtY3RhXCIgfSk7XG4gICAgICAgICAgICBjdGFCdG4uc3R5bGUubWFyZ2luVG9wID0gXCIxMHB4XCI7XG4gICAgICAgICAgICBjdGFCdG4ub25jbGljayA9ICgpID0+IG5ldyBRdWVzdE1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbmV4dEJhdGNoID0gdGhpcy5jdXJyZW50UXVlc3RMaXN0LnNsaWNlKHRoaXMucmVuZGVyZWRDb3VudCwgdGhpcy5yZW5kZXJlZENvdW50ICsgYmF0Y2hTaXplKTtcbiAgICAgICAgZm9yIChjb25zdCBmaWxlIG9mIG5leHRCYXRjaCkgUXVlc3RDYXJkUmVuZGVyZXIucmVuZGVyKGNvbnRhaW5lciwgZmlsZSwgdGhpcyk7XG4gICAgICAgIHRoaXMucmVuZGVyZWRDb3VudCArPSBuZXh0QmF0Y2gubGVuZ3RoO1xuXG4gICAgICAgIGlmICh0aGlzLnJlbmRlcmVkQ291bnQgPCB0aGlzLmN1cnJlbnRRdWVzdExpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBzZW50aW5lbCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1zZW50aW5lbFwiIH0pO1xuICAgICAgICAgICAgdGhpcy5vYnNlcnZlciA9IG5ldyBJbnRlcnNlY3Rpb25PYnNlcnZlcigoZW50cmllcykgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlbnRyaWVzWzBdLmlzSW50ZXJzZWN0aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub2JzZXJ2ZXI/LmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgc2VudGluZWwucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyUXVlc3RCYXRjaChjb250YWluZXIsIHRoaXMuQkFUQ0hfU0laRSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgeyByb290OiBjb250YWluZXIucGFyZW50RWxlbWVudCwgdGhyZXNob2xkOiAwLjEgfSk7XG4gICAgICAgICAgICB0aGlzLm9ic2VydmVyLm9ic2VydmUoc2VudGluZWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0dXBBbmFseXRpY3NTdHJ1Y3R1cmUocGFyZW50OiBIVE1MRWxlbWVudCkge1xuICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRHYW1lU3RhdHMoKTtcbiAgICAgICAgY29uc3QgZyA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1odWRcIiB9KTtcbiAgICAgICAgdGhpcy5zdGF0KGcsIFwiU3RyZWFrXCIsIFN0cmluZyhzdGF0cy5jdXJyZW50U3RyZWFrKSk7XG4gICAgICAgIHRoaXMuc3RhdChnLCBcIlRvZGF5XCIsIFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWVzdHNDb21wbGV0ZWRUb2RheSkpO1xuICAgICAgICBcbiAgICAgICAgcGFyZW50LmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiBcIkFjdGl2aXR5ICg3IERheXMpXCIgfSk7XG4gICAgICAgIHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jaGFydC1jb250YWluZXItbGluZVwiIH0pOyBcbiAgICAgICAgcGFyZW50LmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiBcIkhlYXRtYXBcIiB9KTtcbiAgICAgICAgcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNoYXJ0LWNvbnRhaW5lci1oZWF0XCIgfSk7IFxuICAgIH1cblxuICAgIC8vIFtGSVhdIEFjY2VwdCB3aWR0aE92ZXJyaWRlIHRvIGVuYWJsZSBvZmYtc2NyZWVuIHJlbmRlcmluZ1xuICAgIHJlbmRlckFuYWx5dGljc0NoYXJ0cyhwYXJlbnQ6IEhUTUxFbGVtZW50LCB3aWR0aE92ZXJyaWRlPzogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGxpbmVDb250YWluZXIgPSBwYXJlbnQucXVlcnlTZWxlY3RvcihcIi5zaXN5LWNoYXJ0LWNvbnRhaW5lci1saW5lXCIpIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICBjb25zdCBoZWF0Q29udGFpbmVyID0gcGFyZW50LnF1ZXJ5U2VsZWN0b3IoXCIuc2lzeS1jaGFydC1jb250YWluZXItaGVhdFwiKSBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgXG4gICAgICAgIGlmIChsaW5lQ29udGFpbmVyKSB7XG4gICAgICAgICAgICBsaW5lQ29udGFpbmVyLmVtcHR5KCk7XG4gICAgICAgICAgICBDaGFydFJlbmRlcmVyLnJlbmRlckxpbmVDaGFydChsaW5lQ29udGFpbmVyLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kYXlNZXRyaWNzLCB3aWR0aE92ZXJyaWRlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGVhdENvbnRhaW5lcikge1xuICAgICAgICAgICAgaGVhdENvbnRhaW5lci5lbXB0eSgpO1xuICAgICAgICAgICAgQ2hhcnRSZW5kZXJlci5yZW5kZXJIZWF0bWFwKGhlYXRDb250YWluZXIsIHRoaXMucGx1Z2luLnNldHRpbmdzLmRheU1ldHJpY3MpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVuZGVyQWxlcnRzKHNjcm9sbDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmFjdGl2ZUJ1ZmZzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGJ1ZmZCYXIgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYWxlcnQgc2lzeS1hbGVydC1idWZmXCIgfSk7XG4gICAgICAgICAgICBidWZmQmFyLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkFDVElWRSBFRkZFQ1RTXCIsIGF0dHI6IHsgc3R5bGU6IFwiY29sb3I6IHZhcigtLXNpc3ktcHVycGxlKTtcIiB9IH0pO1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuYWN0aXZlQnVmZnMuZm9yRWFjaChiID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByb3cgPSBidWZmQmFyLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWFsZXJ0LXJvd1wiIH0pO1xuICAgICAgICAgICAgICAgIHJvdy5jcmVhdGVTcGFuKHsgdGV4dDogYCR7Yi5pY29ufSAke2IubmFtZX1gIH0pO1xuICAgICAgICAgICAgICAgIHJvdy5jcmVhdGVTcGFuKHsgdGV4dDogYCR7bW9tZW50KGIuZXhwaXJlc0F0KS5kaWZmKG1vbWVudCgpLCAnbWludXRlcycpfW0gbGVmdGAsIGNsczogXCJzaXN5LWFsZXJ0LXRpbWVyXCIgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZCA8IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGQgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYWxlcnQgc2lzeS1hbGVydC1kZWJ0XCIgfSk7XG4gICAgICAgICAgICBkLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIuKaoO+4jyBERUJUIENSSVNJU1wiIH0pO1xuICAgICAgICAgICAgZC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgQmFsYW5jZTogJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkfWdgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVuZGVyT3JhY2xlKHNjcm9sbDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3Qgb3JhY2xlID0gc2Nyb2xsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LW9yYWNsZVwiIH0pO1xuICAgICAgICBvcmFjbGUuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IFwiT1JBQ0xFIFBSRURJQ1RJT05cIiB9KTtcbiAgICAgICAgY29uc3Qgc3Vydml2YWwgPSBNYXRoLmZsb29yKHRoaXMucGx1Z2luLnNldHRpbmdzLmhwIC8gTWF0aC5tYXgoMSwgKHRoaXMucGx1Z2luLnNldHRpbmdzLnJpdmFsRG1nICogKHRoaXMucGx1Z2luLnNldHRpbmdzLmdvbGQgPCAwID8gMiA6IDEpKSkpO1xuICAgICAgICBjb25zdCBzdXJ2RWwgPSBvcmFjbGUuY3JlYXRlRGl2KHsgdGV4dDogYFN1cnZpdmFsOiAke3N1cnZpdmFsfSBkYXlzYCwgY2xzOiBcInNpc3ktcHJlZGljdGlvblwiIH0pO1xuICAgICAgICBpZiAoc3Vydml2YWwgPCAyKSBzdXJ2RWwuYWRkQ2xhc3MoXCJzaXN5LXByZWRpY3Rpb24tYmFkXCIpO1xuICAgIH1cblxuICAgIHJlbmRlclNjYXJzKHNjcm9sbDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3Qgc2NhcnMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zY2FycyB8fCBbXTtcbiAgICAgICAgaWYgKHNjYXJzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBjb25zdCBkaXYgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktc2NhcnNcIiB9KTtcbiAgICAgICAgZGl2LmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiBcIvCfp6wgU0NBUlNcIiB9KTtcbiAgICAgICAgY29uc3QgcmVjZW50ID0gc2NhcnMuc2xpY2UoLTMpLnJldmVyc2UoKTtcbiAgICAgICAgcmVjZW50LmZvckVhY2goKHM6IHsgbGFiZWw6IHN0cmluZzsgdmFsdWU6IHN0cmluZyB8IG51bWJlciB9KSA9PiB7XG4gICAgICAgICAgICBkaXYuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYCR7cy5sYWJlbH06ICR7cy52YWx1ZX1gLCBhdHRyOiB7IHN0eWxlOiBcImZvbnQtc2l6ZTogMC45ZW07IG9wYWNpdHk6IDAuODU7XCIgfSB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IGJ0biA9IGRpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiVmlldyBhbGxcIiwgY2xzOiBcInNpc3ktYnRuXCIgfSk7XG4gICAgICAgIGJ0bi5zdHlsZS5tYXJnaW5Ub3AgPSBcIjZweFwiO1xuICAgICAgICBidG4ub25jbGljayA9ICgpID0+IG5ldyBTY2Fyc01vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpO1xuICAgIH1cblxuICAgIHJlbmRlclNraWxscyhzY3JvbGw6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5mb3JFYWNoKChzOiBTa2lsbCwgaWR4OiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1za2lsbC1yb3dcIiB9KTtcbiAgICAgICAgICAgIHJvdy5vbmNsaWNrID0gKCkgPT4gbmV3IFNraWxsRGV0YWlsTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luLCBpZHgpLm9wZW4oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgbWV0YSA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1za2lsbC1tZXRhXCIgfSk7XG4gICAgICAgICAgICBtZXRhLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgJHtzLm5hbWV9IChMdmwgJHtzLmxldmVsfSlgIH0pO1xuICAgICAgICAgICAgaWYgKHMucnVzdCA+IDApIG1ldGEuY3JlYXRlU3Bhbih7IHRleHQ6IGBSVVNUICR7cy5ydXN0fWAsIGNsczogXCJzaXN5LXRleHQtcnVzdFwiIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBiYXIgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYmFyLWJnXCIgfSk7XG4gICAgICAgICAgICBjb25zdCBwY3QgPSBzLnhwUmVxID4gMCA/IChzLnhwIC8gcy54cFJlcSkgKiAxMDAgOiAwO1xuICAgICAgICAgICAgYmFyLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJhci1maWxsIHNpc3ktZmlsbC1ibHVlXCIsIGF0dHI6IHsgc3R5bGU6IGB3aWR0aDogJHtwY3R9JTtgIH0gfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCIrIEFkZCBOb2RlXCIsIGNsczogXCJzaXN5LWJ0blwiLCBhdHRyOiB7IHN0eWxlOiBcIndpZHRoOjEwMCU7IG1hcmdpbi10b3A6MTBweDtcIiB9IH0pLm9uY2xpY2sgPSAoKSA9PiBuZXcgU2tpbGxNYW5hZ2VyTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luKS5vcGVuKCk7XG4gICAgfVxuXG4gICAgcmVuZGVyQnVsa0JhcihwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGlmICghdGhpcy5zZWxlY3RNb2RlIHx8IHRoaXMuc2VsZWN0ZWRRdWVzdHMuc2l6ZSA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBjb25zdCBiYXIgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYnVsay1iYXJcIiB9KTtcbiAgICAgICAgYmFyLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgJHt0aGlzLnNlbGVjdGVkUXVlc3RzLnNpemV9IFNlbGVjdGVkYCwgYXR0cjogeyBzdHlsZTogXCJhbGlnbi1zZWxmOmNlbnRlcjsgZm9udC13ZWlnaHQ6Ym9sZDsgY29sb3I6IHdoaXRlO1wiIH0gfSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBidG5DID0gYmFyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDT01QTEVURSBBTExcIiwgY2xzOiBcInNpc3ktYnRuIG1vZC1kb25lXCIgfSk7XG4gICAgICAgIGJ0bkMub25jbGljayA9IGFzeW5jICgpID0+IHsgZm9yIChjb25zdCBmIG9mIHRoaXMuc2VsZWN0ZWRRdWVzdHMpIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5jb21wbGV0ZVF1ZXN0KGYpOyB0aGlzLnNlbGVjdGVkUXVlc3RzLmNsZWFyKCk7IHRoaXMuc2VsZWN0TW9kZSA9IGZhbHNlOyB0aGlzLmRlYm91bmNlZFJlZnJlc2goKTsgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGJ0bkQgPSBiYXIuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkRFTEVURSBBTExcIiwgY2xzOiBcInNpc3ktYnRuIG1vZC1mYWlsXCIgfSk7XG4gICAgICAgIGJ0bkQub25jbGljayA9IGFzeW5jICgpID0+IHsgZm9yIChjb25zdCBmIG9mIHRoaXMuc2VsZWN0ZWRRdWVzdHMpIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5kZWxldGVRdWVzdChmKTsgdGhpcy5zZWxlY3RlZFF1ZXN0cy5jbGVhcigpOyB0aGlzLnNlbGVjdE1vZGUgPSBmYWxzZTsgdGhpcy5kZWJvdW5jZWRSZWZyZXNoKCk7IH07XG4gICAgfVxuXG4gICAgcmVuZGVyRGFpbHlNaXNzaW9ucyhwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IG1pc3Npb25zID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGFpbHlNaXNzaW9ucyB8fCBbXTtcbiAgICAgICAgaWYgKG1pc3Npb25zLmxlbmd0aCA9PT0gMCkgeyBwYXJlbnQuY3JlYXRlRGl2KHsgdGV4dDogXCJObyBtaXNzaW9ucy5cIiwgY2xzOiBcInNpc3ktZW1wdHktc3RhdGVcIiB9KTsgcmV0dXJuOyB9XG4gICAgICAgIGNvbnN0IG1pc3Npb25zRGl2ID0gcGFyZW50LmNyZWF0ZURpdigpO1xuICAgICAgICBtaXNzaW9ucy5mb3JFYWNoKChtOiBEYWlseU1pc3Npb24pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNhcmQgPSBtaXNzaW9uc0Rpdi5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1taXNzaW9uLWNhcmRcIiB9KTtcbiAgICAgICAgICAgIGlmIChtLmNvbXBsZXRlZCkgY2FyZC5hZGRDbGFzcyhcInNpc3ktbWlzc2lvbi1jb21wbGV0ZWRcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGggPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNhcmQtdG9wXCIgfSk7XG4gICAgICAgICAgICBoLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IG0ubmFtZSwgY2xzOiBcInNpc3ktY2FyZC10aXRsZVwiIH0pO1xuICAgICAgICAgICAgaC5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBgJHttLnByb2dyZXNzfS8ke20udGFyZ2V0fWAsIGF0dHI6IHsgc3R5bGU6IFwiZm9udC13ZWlnaHQ6IGJvbGQ7XCIgfSB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FyZC5jcmVhdGVEaXYoeyB0ZXh0OiBtLmRlc2MsIGF0dHI6IHsgc3R5bGU6IFwiZm9udC1zaXplOiAwLjhlbTsgb3BhY2l0eTogMC43OyBtYXJnaW4tYm90dG9tOiA1cHg7XCIgfSB9KTtcblxuICAgICAgICAgICAgY29uc3QgYmFyID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1iYXItYmdcIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IHBjdCA9IG0udGFyZ2V0ID4gMCA/IChtLnByb2dyZXNzIC8gbS50YXJnZXQpICogMTAwIDogMDtcbiAgICAgICAgICAgIGJhci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1iYXItZmlsbCBzaXN5LWZpbGwtZ3JlZW5cIiwgYXR0cjogeyBzdHlsZTogYHdpZHRoOiAke3BjdH0lO2AgfSB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmVuZGVyQ2hhaW5TZWN0aW9uKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikgcmV0dXJuO1xuICAgICAgICBjb25zdCBkaXYgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktY2hhaW4tY29udGFpbmVyXCIgfSk7XG4gICAgICAgIGRpdi5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogY2hhaW4ubmFtZSwgYXR0cjogeyBzdHlsZTogXCJjb2xvcjogdmFyKC0tc2lzeS1ncmVlbik7XCIgfSB9KTtcbiAgICAgICAgY29uc3QgcCA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRDaGFpblByb2dyZXNzKCk7XG4gICAgICAgIGNvbnN0IGIgPSBkaXYuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYmFyLWJnXCIgfSk7XG4gICAgICAgIGIuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYmFyLWZpbGwgc2lzeS1maWxsLWdyZWVuXCIsIGF0dHI6IHsgc3R5bGU6IGB3aWR0aDoke3AucGVyY2VudH0lO2AgfSB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGxpc3QgPSBkaXYuY3JlYXRlRGl2KHsgYXR0cjogeyBzdHlsZTogXCJtYXJnaW46IDEwcHggMDsgZm9udC1zaXplOiAwLjllbTtcIiB9IH0pO1xuICAgICAgICBjaGFpbi5xdWVzdHMuZm9yRWFjaCgocSwgaSkgPT4gbGlzdC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgWyR7aSA8IHAuY29tcGxldGVkID8gXCJPS1wiIDogXCIuLlwifV0gJHtxfWAsIGF0dHI6IHsgc3R5bGU6IGk9PT1wLmNvbXBsZXRlZCA/IFwiZm9udC13ZWlnaHQ6Ym9sZFwiIDogXCJvcGFjaXR5OjAuNVwiIH0gfSkpO1xuICAgICAgICBkaXYuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkJSRUFLIENIQUlOXCIsIGNsczogXCJzaXN5LWJ0biBtb2QtZmFpbFwiLCBhdHRyOiB7IHN0eWxlOiBcIndpZHRoOjEwMCU7IG1hcmdpbi10b3A6MTBweDtcIiB9IH0pLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7IGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5icmVha0NoYWluKCk7IHRoaXMuZGVib3VuY2VkUmVmcmVzaCgpOyB9O1xuICAgIH1cblxuICAgIHJlbmRlclJlc2VhcmNoU2VjdGlvbihwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IHJlc2VhcmNoID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMgfHwgW107XG4gICAgICAgIGNvbnN0IGFjdGl2ZSA9IHJlc2VhcmNoLmZpbHRlcihxID0+ICFxLmNvbXBsZXRlZCk7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldFJlc2VhcmNoUmF0aW8oKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHN0YXRzRGl2ID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXJlc2VhcmNoLXN0YXRzIHNpc3ktY2FyZFwiIH0pO1xuICAgICAgICBzdGF0c0Rpdi5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgUmVzZWFyY2ggUmF0aW86ICR7c3RhdHMuY29tYmF0fToke3N0YXRzLnJlc2VhcmNofWAgfSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoYWN0aXZlLmxlbmd0aCA9PT0gMCkgcGFyZW50LmNyZWF0ZURpdih7IHRleHQ6IFwiTm8gYWN0aXZlIHJlc2VhcmNoLlwiLCBjbHM6IFwic2lzeS1lbXB0eS1zdGF0ZVwiIH0pO1xuICAgICAgICBlbHNlIGFjdGl2ZS5mb3JFYWNoKChxOiBhbnkpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNhcmQgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktcmVzZWFyY2gtY2FyZFwiIH0pO1xuICAgICAgICAgICAgY29uc3QgaCA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktY2FyZC10b3BcIiB9KTtcbiAgICAgICAgICAgIGguY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogcS50aXRsZSwgY2xzOiBcInNpc3ktY2FyZC10aXRsZVwiIH0pO1xuICAgICAgICAgICAgY2FyZC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgV29yZHM6ICR7cS53b3JkQ291bnR9LyR7cS53b3JkTGltaXR9YCB9KTtcbiAgICAgICAgICAgIGNvbnN0IGJhciA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYmFyLWJnXCIgfSk7XG4gICAgICAgICAgICBjb25zdCB3cGN0ID0gcS53b3JkTGltaXQgPiAwID8gTWF0aC5taW4oMTAwLCAocS53b3JkQ291bnQgLyBxLndvcmRMaW1pdCkgKiAxMDApIDogMDtcbiAgICAgICAgICAgIGJhci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1iYXItZmlsbCBzaXN5LWZpbGwtcHVycGxlXCIsIGF0dHI6IHsgc3R5bGU6IGB3aWR0aDoke3dwY3R9JTtgIH0gfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGFjdHMgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWFjdGlvbnNcIiB9KTtcbiAgICAgICAgICAgIGFjdHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkNPTVBMRVRFXCIsIGNsczogXCJzaXN5LWJ0biBtb2QtZG9uZSBzaXN5LWFjdGlvbi1idG5cIiB9KS5vbmNsaWNrID0gKCkgPT4geyB0aGlzLnBsdWdpbi5lbmdpbmUuY29tcGxldGVSZXNlYXJjaFF1ZXN0KHEuaWQsIHEud29yZENvdW50KTsgdGhpcy5kZWJvdW5jZWRSZWZyZXNoKCk7IH07XG4gICAgICAgICAgICBhY3RzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJERUxFVEVcIiwgY2xzOiBcInNpc3ktYnRuIG1vZC1mYWlsIHNpc3ktYWN0aW9uLWJ0blwiIH0pLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7IGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5kZWxldGVSZXNlYXJjaFF1ZXN0KHEuaWQpOyB0aGlzLmRlYm91bmNlZFJlZnJlc2goKTsgfTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmVuZGVyRmlsdGVyQmFyKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgZ2V0RnJlc2hTdGF0ZSA9ICgpID0+IHRoaXMucGx1Z2luLnNldHRpbmdzLmZpbHRlclN0YXRlO1xuICAgICAgICBjb25zdCBkID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWZpbHRlci1iYXJcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGFkZFJvdyA9IChsOiBzdHJpbmcsIG9wdHM6IHN0cmluZ1tdLCBjdXJyOiBzdHJpbmcsIGNiOiBhbnkpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSBkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWZpbHRlci1yb3dcIiB9KTtcbiAgICAgICAgICAgIHIuY3JlYXRlU3Bhbih7IHRleHQ6IGwsIGNsczogXCJzaXN5LWZpbHRlci1sYWJlbFwiIH0pO1xuICAgICAgICAgICAgb3B0cy5mb3JFYWNoKG8gPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ0biA9IHIuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBvLnRvVXBwZXJDYXNlKCksIGNsczogXCJzaXN5LWZpbHRlci1idG5cIiB9KTtcbiAgICAgICAgICAgICAgICBpZiAoY3VyciA9PT0gbykgYnRuLmFkZENsYXNzKFwic2lzeS1maWx0ZXItYWN0aXZlXCIpO1xuICAgICAgICAgICAgICAgIGJ0bi5vbmNsaWNrID0gKCkgPT4gY2Iobyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBmID0gZ2V0RnJlc2hTdGF0ZSgpO1xuICAgICAgICBhZGRSb3coXCJFbmVyZ3k6XCIsIFtcImFueVwiLCBcImhpZ2hcIiwgXCJtZWRpdW1cIl0sIGYuYWN0aXZlRW5lcmd5LCAodjphbnkpPT4geyBcbiAgICAgICAgICAgIGNvbnN0IHMgPSBnZXRGcmVzaFN0YXRlKCk7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWwgPSAocy5hY3RpdmVFbmVyZ3kgPT09IHYgJiYgdiAhPT0gXCJhbnlcIikgPyBcImFueVwiIDogdjtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5zZXRGaWx0ZXJTdGF0ZShuZXdWYWwsIHMuYWN0aXZlQ29udGV4dCwgcy5hY3RpdmVUYWdzKTsgXG4gICAgICAgICAgICB0aGlzLmRlYm91bmNlZFJlZnJlc2goKTsgXG4gICAgICAgIH0pO1xuICAgICAgICBhZGRSb3coXCJDb250ZXh0OlwiLCBbXCJhbnlcIiwgXCJob21lXCIsIFwib2ZmaWNlXCJdLCBmLmFjdGl2ZUNvbnRleHQsICh2OmFueSk9PiB7IFxuICAgICAgICAgICAgY29uc3QgcyA9IGdldEZyZXNoU3RhdGUoKTtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbCA9IChzLmFjdGl2ZUNvbnRleHQgPT09IHYgJiYgdiAhPT0gXCJhbnlcIikgPyBcImFueVwiIDogdjtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5zZXRGaWx0ZXJTdGF0ZShzLmFjdGl2ZUVuZXJneSwgbmV3VmFsLCBzLmFjdGl2ZVRhZ3MpOyBcbiAgICAgICAgICAgIHRoaXMuZGVib3VuY2VkUmVmcmVzaCgpOyBcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBkLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDTEVBUlwiLCBjbHM6IFwic2lzeS1idG4gbW9kLWZhaWxcIiwgYXR0cjogeyBzdHlsZTogXCJ3aWR0aDoxMDAlOyBtYXJnaW4tdG9wOjVweDtcIiB9IH0pLm9uY2xpY2sgPSAoKSA9PiB7IHRoaXMucGx1Z2luLmVuZ2luZS5jbGVhckZpbHRlcnMoKTsgdGhpcy5kZWJvdW5jZWRSZWZyZXNoKCk7IH07XG4gICAgfVxuXG4gICAgc3RhdChwOiBIVE1MRWxlbWVudCwgbGFiZWw6IHN0cmluZywgdmFsOiBzdHJpbmcsIGNsczogc3RyaW5nID0gXCJcIikge1xuICAgICAgICBjb25zdCBiID0gcC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1zdGF0LWJveFwiIH0pOyBcbiAgICAgICAgaWYgKGNscykgYi5hZGRDbGFzcyhjbHMpO1xuICAgICAgICBiLmNyZWF0ZURpdih7IHRleHQ6IGxhYmVsLCBjbHM6IFwic2lzeS1zdGF0LWxhYmVsXCIgfSk7XG4gICAgICAgIGIuY3JlYXRlRGl2KHsgdGV4dDogdmFsLCBjbHM6IFwic2lzeS1zdGF0LXZhbFwiIH0pO1xuICAgIH1cblxuICAgIHNob3dVbmRvVG9hc3QocXVlc3ROYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgdG9hc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB0b2FzdC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcInBvc2l0aW9uOmZpeGVkOyBib3R0b206MjBweDsgcmlnaHQ6MjBweDsgYmFja2dyb3VuZDojMWUxZTFlOyBwYWRkaW5nOjEycHggMjBweDsgYm9yZGVyLXJhZGl1czo2cHg7IHotaW5kZXg6OTk5OTsgYm9yZGVyOjFweCBzb2xpZCB2YXIoLS1zaXN5LWJsdWUpOyBib3gtc2hhZG93OiAwIDVweCAyMHB4IHJnYmEoMCwwLDAsMC41KTsgZGlzcGxheTpmbGV4OyBhbGlnbi1pdGVtczpjZW50ZXI7IGdhcDoxNXB4O1wiKTsgXG4gICAgICAgIHRvYXN0LmlubmVySFRNTCA9IGA8c3Bhbj5EZWxldGVkOiA8c3Ryb25nPiR7cXVlc3ROYW1lfTwvc3Ryb25nPjwvc3Bhbj5gO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcbiAgICAgICAgYnRuLmlubmVyVGV4dCA9IFwiVU5ET1wiO1xuICAgICAgICBidG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJjdXJzb3I6cG9pbnRlcjsgY29sb3I6dmFyKC0tc2lzeS1ibHVlKTsgYmFja2dyb3VuZDpub25lOyBib3JkZXI6bm9uZTsgZm9udC13ZWlnaHQ6Ym9sZDsgbGV0dGVyLXNwYWNpbmc6MXB4O1wiKTtcbiAgICAgICAgYnRuLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7IGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS51bmRvTGFzdERlbGV0aW9uKCk7IHRvYXN0LnJlbW92ZSgpOyB9O1xuICAgICAgICBcbiAgICAgICAgdG9hc3QuYXBwZW5kQ2hpbGQoYnRuKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0b2FzdCk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdG9hc3QucmVtb3ZlKCksIDgwMDApO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IEFwcCwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZywgTm90aWNlIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IFNpc3lwaHVzUGx1Z2luIGZyb20gJy4vbWFpbic7XG5pbXBvcnQgeyBUZW1wbGF0ZU1hbmFnZXJNb2RhbCB9IGZyb20gJy4vdWkvbW9kYWxzJztcblxuZXhwb3J0IGNsYXNzIFNpc3lwaHVzU2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG5cbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikge1xuICAgICAgICBzdXBlcihhcHAsIHBsdWdpbik7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgIH1cblxuICAgIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG5cbiAgICAgICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiU2lzeXBodXMgRW5naW5lIFNldHRpbmdzXCIgfSk7XG5cbiAgICAgICAgLy8gLS0tIEdBTUVQTEFZIFNFQ1RJT04gLS0tXG4gICAgICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkdhbWVwbGF5XCIgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZShcIlN0YXJ0aW5nIEhQXCIpXG4gICAgICAgICAgICAuc2V0RGVzYyhcIkJhc2UgSFAgZm9yIGEgbmV3IHJ1biAoRGVmYXVsdDogMTAwKVwiKVxuICAgICAgICAgICAgLmFkZFRleHQodGV4dCA9PiB0ZXh0XG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5tYXhIcCkpXG4gICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBudW0gPSBwYXJzZUludCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLm1heEhwID0gaXNOYU4obnVtKSA/IDEwMCA6IG51bTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAgICAgLnNldE5hbWUoXCJEaWZmaWN1bHR5IFNjYWxpbmcgKFJpdmFsIERhbWFnZSlcIilcbiAgICAgICAgICAgIC5zZXREZXNjKFwiU3RhcnRpbmcgZGFtYWdlIHB1bmlzaG1lbnQgZm9yIGZhaWxlZCBxdWVzdHMgKERlZmF1bHQ6IDEwKVwiKVxuICAgICAgICAgICAgLmFkZFRleHQodGV4dCA9PiB0ZXh0XG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5yaXZhbERtZykpXG4gICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBudW0gPSBwYXJzZUludCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnJpdmFsRG1nID0gaXNOYU4obnVtKSA/IDEwIDogbnVtO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgLy8gSW5zaWRlIGRpc3BsYXkoKSwgdW5kZXIgR2FtZXBsYXkgc2VjdGlvbi4uLlxuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgIC5zZXROYW1lKFwiUXVlc3QgVGVtcGxhdGVzXCIpXG4gICAgICAgIC5zZXREZXNjKFwiQ3JlYXRlIG9yIGRlbGV0ZSBxdWljay1kZXBsb3kgdGVtcGxhdGVzLlwiKVxuICAgICAgICAuYWRkQnV0dG9uKGJ0biA9PiBidG5cbiAgICAgICAgICAgIC5zZXRCdXR0b25UZXh0KFwiTWFuYWdlIFRlbXBsYXRlc1wiKVxuICAgICAgICAgICAgLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgICAgIG5ldyBUZW1wbGF0ZU1hbmFnZXJNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4pLm9wZW4oKTtcbiAgICAgICAgICAgIH0pKTtcblxuICAgICAgICAvLyAtLS0gQVVESU8gU0VDVElPTiAtLS1cbiAgICAgICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiQXVkaW9cIiB9KTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAgIC5zZXROYW1lKFwiTXV0ZSBBbGwgU291bmRzXCIpXG4gICAgICAgICAgICAuc2V0RGVzYyhcIkRpc2FibGUgc291bmQgZWZmZWN0cyBhbmQgYW1iaWVudCBub2lzZVwiKVxuICAgICAgICAgICAgLmFkZFRvZ2dsZSh0b2dnbGUgPT4gdG9nZ2xlXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLm11dGVkKVxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubXV0ZWQgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uYXVkaW8uc2V0TXV0ZWQodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgLy8gLS0tIERBVEEgTUFOQUdFTUVOVCBTRUNUSU9OIC0tLVxuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJEYXRhIE1hbmFnZW1lbnRcIiB9KTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAgIC5zZXROYW1lKFwiRXhwb3J0IEZ1bGwgRGF0YVwiKVxuICAgICAgICAgICAgLnNldERlc2MoXCJEb3dubG9hZCBhbGwgc2V0dGluZ3MsIGhpc3RvcnksIGFuZCBzdGF0cyBhcyBhIEpTT04gZmlsZS5cIilcbiAgICAgICAgICAgIC5hZGRCdXR0b24oYnRuID0+IGJ0blxuICAgICAgICAgICAgICAgIC5zZXRCdXR0b25UZXh0KFwiRXhwb3J0IEJhY2t1cFwiKVxuICAgICAgICAgICAgICAgIC5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QganNvbiA9IEpTT04uc3RyaW5naWZ5KHRoaXMucGx1Z2luLnNldHRpbmdzLCBudWxsLCAyKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmxvYiA9IG5ldyBCbG9iKFtqc29uXSwgeyB0eXBlOiAnYXBwbGljYXRpb24vanNvbicgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICAgICAgICAgICAgICBhLmhyZWYgPSB1cmw7XG4gICAgICAgICAgICAgICAgICAgIGEuZG93bmxvYWQgPSBgc2lzeXBodXNfYmFja3VwXyR7RGF0ZS5ub3coKX0uanNvbmA7XG4gICAgICAgICAgICAgICAgICAgIGEuY2xpY2soKTtcbiAgICAgICAgICAgICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xuICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKFwiQmFja3VwIGRvd25sb2FkZWQuXCIpO1xuICAgICAgICAgICAgICAgIH0pKTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAgIC5zZXROYW1lKFwiSW1wb3J0IERhdGFcIilcbiAgICAgICAgICAgIC5zZXREZXNjKFwiUmVzdG9yZSBmcm9tIGJhY2t1cCBmaWxlLiDimqDvuI8gV0FSTklORzogT3ZlcndyaXRlcyBjdXJyZW50IHByb2dyZXNzIVwiKVxuICAgICAgICAgICAgLmFkZEJ1dHRvbihidG4gPT4gYnRuXG4gICAgICAgICAgICAgICAgLnNldEJ1dHRvblRleHQoXCJJbXBvcnQgQmFja3VwXCIpXG4gICAgICAgICAgICAgICAgLnNldFdhcm5pbmcoKVxuICAgICAgICAgICAgICAgIC5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgICAgICAgICAgICAgICAgICBpbnB1dC50eXBlID0gJ2ZpbGUnO1xuICAgICAgICAgICAgICAgICAgICBpbnB1dC5hY2NlcHQgPSAnLmpzb24nO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQub25jaGFuZ2UgPSBhc3luYyAoZTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlID0gZS50YXJnZXQuZmlsZXNbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZpbGUpIHJldHVybjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gYXdhaXQgZmlsZS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UodGV4dCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXF1aXJlZCA9IFsnaHAnLCAnc2tpbGxzJywgJ2xldmVsJywgJ3hwUmVxJywgJ2RhaWx5TW9kaWZpZXInLCAnbGVnYWN5JywgJ3Jlc2VhcmNoU3RhdHMnLCAnZmlsdGVyU3RhdGUnXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtaXNzaW5nID0gcmVxdWlyZWQuZmlsdGVyKGsgPT4gZGF0YVtrXSA9PSBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWlzc2luZy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYEludmFsaWQgYmFja3VwOiBtaXNzaW5nICR7bWlzc2luZy5qb2luKCcsICcpfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShkYXRhLnNjYXJzKSkgZGF0YS5zY2FycyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZGF0YS5uZXVyYWxIdWJQYXRoICE9PSAnc3RyaW5nJykgZGF0YS5uZXVyYWxIdWJQYXRoID0gJ0FjdGl2ZV9SdW4vTmV1cmFsX0h1Yi5jYW52YXMnO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MgPSBkYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLnRyaWdnZXIoXCJ1cGRhdGVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShcIkRhdGEgaW1wb3J0ZWQgc3VjY2Vzc2Z1bGx5IVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJFcnJvciBpbXBvcnRpbmcgZGF0YS5cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQuY2xpY2soKTtcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgTm90aWNlLCBQbHVnaW4sIFRGaWxlLCBXb3Jrc3BhY2VMZWFmLCBkZWJvdW5jZSB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IFNpc3lwaHVzU2V0dGluZ3MgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IFNpc3lwaHVzRW5naW5lLCBERUZBVUxUX01PRElGSUVSIH0gZnJvbSAnLi9lbmdpbmUnO1xuaW1wb3J0IHsgQXVkaW9Db250cm9sbGVyIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBQYW5vcHRpY29uVmlldywgVklFV19UWVBFX1BBTk9QVElDT04gfSBmcm9tIFwiLi91aS92aWV3XCI7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdUYWIgfSBmcm9tICcuL3NldHRpbmdzJztcbmltcG9ydCB7IFJlc2VhcmNoUXVlc3RNb2RhbCwgQ2hhaW5CdWlsZGVyTW9kYWwsIFJlc2VhcmNoTGlzdE1vZGFsLCBRdWlja0NhcHR1cmVNb2RhbCwgUXVlc3RUZW1wbGF0ZU1vZGFsLCBRdWVzdE1vZGFsLCBTY2Fyc01vZGFsIH0gZnJvbSBcIi4vdWkvbW9kYWxzXCI7XG5cbmNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFNpc3lwaHVzU2V0dGluZ3MgPSB7XG4gICAgLy8gW05FV10gRGVmYXVsdCBUZW1wbGF0ZXNcbiAgICBxdWVzdFRlbXBsYXRlczogW1xuICAgICAgICB7IG5hbWU6IFwiTW9ybmluZyBSb3V0aW5lXCIsIGRpZmY6IDEsIHNraWxsOiBcIkRpc2NpcGxpbmVcIiwgZGVhZGxpbmU6IFwiMTA6MDBcIiB9LFxuICAgICAgICB7IG5hbWU6IFwiRGVlcCBXb3JrIEJsb2NrXCIsIGRpZmY6IDMsIHNraWxsOiBcIkZvY3VzXCIsIGRlYWRsaW5lOiBcIisyaFwiIH0sXG4gICAgICAgIHsgbmFtZTogXCJRdWljayBFeGVyY2lzZVwiLCBkaWZmOiAyLCBza2lsbDogXCJIZWFsdGhcIiwgZGVhZGxpbmU6IFwiKzEyaFwiIH1cbiAgICBdLCAvLyBDb21tYSBoZXJlLCBOTyBjbG9zaW5nIGJyYWNlIHlldCFcbiAgLy8gW05FV10gRGVmYXVsdHNcbiAgICBjb21ib0NvdW50OiAwLFxuICAgIGxhc3RDb21wbGV0aW9uVGltZTogMCxcbiAgLy8gW05FV11cbiAgICBhY3RpdmVCdWZmczogW10sXG5cbiAgICBocDogMTAwLCBtYXhIcDogMTAwLCB4cDogMCwgZ29sZDogMCwgeHBSZXE6IDEwMCwgbGV2ZWw6IDEsIHJpdmFsRG1nOiAxMCxcbiAgICBsYXN0TG9naW46IFwiXCIsIHNoaWVsZGVkVW50aWw6IFwiXCIsIHJlc3REYXlVbnRpbDogXCJcIiwgc2tpbGxzOiBbXSxcbiAgICBkYWlseU1vZGlmaWVyOiBERUZBVUxUX01PRElGSUVSLCBcbiAgICBsZWdhY3k6IHsgc291bHM6IDAsIHBlcmtzOiB7IHN0YXJ0R29sZDogMCwgc3RhcnRTa2lsbFBvaW50czogMCwgcml2YWxEZWxheTogMCB9LCByZWxpY3M6IFtdLCBkZWF0aENvdW50OiAwIH0sIFxuICAgIG11dGVkOiBmYWxzZSwgaGlzdG9yeTogW10sIHJ1bkNvdW50OiAxLCBsb2NrZG93blVudGlsOiBcIlwiLCBkYW1hZ2VUYWtlblRvZGF5OiAwLFxuICAgIGRhaWx5TWlzc2lvbnM6IFtdLCBcbiAgICBkYWlseU1pc3Npb25EYXRlOiBcIlwiLCBcbiAgICBxdWVzdHNDb21wbGV0ZWRUb2RheTogMCwgXG4gICAgc2tpbGxVc2VzVG9kYXk6IHt9LFxuICAgIHJlc2VhcmNoUXVlc3RzOiBbXSxcbiAgICByZXNlYXJjaFN0YXRzOiB7IHRvdGFsUmVzZWFyY2g6IDAsIHRvdGFsQ29tYmF0OiAwLCByZXNlYXJjaENvbXBsZXRlZDogMCwgY29tYmF0Q29tcGxldGVkOiAwIH0sXG4gICAgbGFzdFJlc2VhcmNoUXVlc3RJZDogMCxcbiAgICBtZWRpdGF0aW9uQ3ljbGVzQ29tcGxldGVkOiAwLFxuICAgIHF1ZXN0RGVsZXRpb25zVG9kYXk6IDAsXG4gICAgbGFzdERlbGV0aW9uUmVzZXQ6IFwiXCIsXG4gICAgaXNNZWRpdGF0aW5nOiBmYWxzZSxcbiAgICBtZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duOiAwLFxuICAgIGFjdGl2ZUNoYWluczogW10sXG4gICAgY2hhaW5IaXN0b3J5OiBbXSxcbiAgICBjdXJyZW50Q2hhaW5JZDogXCJcIixcbiAgICBjaGFpblF1ZXN0c0NvbXBsZXRlZDogMCxcbiAgICBxdWVzdEZpbHRlcnM6IHt9LFxuICAgIGZpbHRlclN0YXRlOiB7IGFjdGl2ZUVuZXJneTogXCJhbnlcIiwgYWN0aXZlQ29udGV4dDogXCJhbnlcIiwgYWN0aXZlVGFnczogW10gfSxcbiAgICBkYXlNZXRyaWNzOiBbXSxcbiAgICB3ZWVrbHlSZXBvcnRzOiBbXSxcbiAgICBib3NzTWlsZXN0b25lczogW10sXG4gICAgc3RyZWFrOiB7IGN1cnJlbnQ6IDAsIGxvbmdlc3Q6IDAsIGxhc3REYXRlOiBcIlwiIH0sXG4gICAgYWNoaWV2ZW1lbnRzOiBbXSxcbiAgICBnYW1lV29uOiBmYWxzZSxcbiAgICBzY2FyczogW10sXG4gICAgbmV1cmFsSHViUGF0aDogXCJBY3RpdmVfUnVuL05ldXJhbF9IdWIuY2FudmFzXCJcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2lzeXBodXNQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIHN0YXR1c0Jhckl0ZW06IEhUTUxFbGVtZW50O1xuICAgIGVuZ2luZTogU2lzeXBodXNFbmdpbmU7XG4gICAgYXVkaW86IEF1ZGlvQ29udHJvbGxlcjtcblxuICAgIGFzeW5jIG9ubG9hZCgpIHtcbiAgICAvLyAtLS0gRVZFTlQgTElTVEVORVI6IEZJTEUgUkVOQU1FIC0tLVxuICAgICAgICB0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAudmF1bHQub24oJ3JlbmFtZScsIChmaWxlLCBvbGRQYXRoKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZW5naW5lKSByZXR1cm47XG4gICAgICAgICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlICYmIGZpbGUuZXh0ZW5zaW9uID09PSAnbWQnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3TmFtZSA9IGZpbGUuYmFzZW5hbWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBvbGQgYmFzZW5hbWUgZnJvbSB0aGUgb2xkIHBhdGhcbiAgICAgICAgICAgICAgICAvLyBvbGRQYXRoIGxvb2tzIGxpa2UgXCJBY3RpdmVfUnVuL1F1ZXN0cy9PbGROYW1lLm1kXCJcbiAgICAgICAgICAgICAgICBjb25zdCBwYXRoUGFydHMgPSBvbGRQYXRoLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICAgICAgY29uc3Qgb2xkRmlsZU5hbWUgPSBwYXRoUGFydHNbcGF0aFBhcnRzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgIGNvbnN0IG9sZE5hbWUgPSBvbGRGaWxlTmFtZS5yZXBsYWNlKC9cXC5tZCQvLCAnJyk7IC8vIFJlbW92ZSBleHRlbnNpb25cblxuICAgICAgICAgICAgICAgIGlmIChvbGROYW1lICE9PSBuZXdOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFByb3BhZ2F0ZSByZW5hbWUgdG8gZW5naW5lc1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVuZ2luZS5jaGFpbnNFbmdpbmUuaGFuZGxlUmVuYW1lKG9sZE5hbWUsIG5ld05hbWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVuZ2luZS5maWx0ZXJzRW5naW5lLmhhbmRsZVJlbmFtZShvbGROYW1lLCBuZXdOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEZvcmNlIHNhdmUgdG8gcGVyc2lzdCBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW5naW5lLnNhdmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKTtcblxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ3F1ZXN0LXRlbXBsYXRlcycsXG4gICAgICAgICAgICBuYW1lOiAnRGVwbG95IFF1ZXN0IGZyb20gVGVtcGxhdGUnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IG5ldyBRdWVzdFRlbXBsYXRlTW9kYWwodGhpcy5hcHAsIHRoaXMpLm9wZW4oKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdkZXBsb3ktcXVlc3QtaG90a2V5JyxcbiAgICAgICAgICAgIG5hbWU6ICdEZXBsb3kgUXVlc3QnLFxuICAgICAgICAgICAgaG90a2V5czogW3sgbW9kaWZpZXJzOiBbXCJNb2RcIl0sIGtleTogXCJkXCIgfV0sXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gbmV3IFF1ZXN0TW9kYWwodGhpcy5hcHAsIHRoaXMpLm9wZW4oKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICd1bmRvLXF1ZXN0LWRlbGV0ZScsXG4gICAgICAgICAgICBuYW1lOiAnVW5kbyBMYXN0IFF1ZXN0IERlbGV0aW9uJyxcbiAgICAgICAgICAgIGhvdGtleXM6IFt7IG1vZGlmaWVyczogW1wiTW9kXCIsIFwiU2hpZnRcIl0sIGtleTogXCJ6XCIgfV0sXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUudW5kb0xhc3REZWxldGlvbigpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ2V4cG9ydC1zdGF0cycsXG4gICAgICAgICAgICBuYW1lOiAnQW5hbHl0aWNzOiBFeHBvcnQgU3RhdHMgSlNPTicsXG4gICAgICAgICAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5lbmdpbmUuZ2V0R2FtZVN0YXRzKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IGBTaXN5cGh1c19TdGF0c18ke0RhdGUubm93KCl9Lmpzb25gO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShwYXRoLCBKU09OLnN0cmluZ2lmeShzdGF0cywgbnVsbCwgMikpO1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYFN0YXRzIGV4cG9ydGVkIHRvICR7cGF0aH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBcbiAgICAgICAgICAgIGlkOiAnYWNjZXB0LWRlYXRoJywgXG4gICAgICAgICAgICBuYW1lOiAnQUNDRVBUIERFQVRIIChSZXNldCBSdW4pJywgXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUudHJpZ2dlckRlYXRoKCkgXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IFxuICAgICAgICAgICAgaWQ6ICdyZXJvbGwtY2hhb3MnLCBcbiAgICAgICAgICAgIG5hbWU6ICdSZXJvbGwgQ2hhb3MnLCBcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5yb2xsQ2hhb3ModHJ1ZSkgXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdxdWljay1jYXB0dXJlJyxcbiAgICAgICAgICAgIG5hbWU6ICdRdWljayBDYXB0dXJlIChTY3JhcCknLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IG5ldyBRdWlja0NhcHR1cmVNb2RhbCh0aGlzLmFwcCwgdGhpcykub3BlbigpXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnZ2VuZXJhdGUtc2tpbGwtZ3JhcGgnLFxuICAgICAgICAgICAgbmFtZTogJ05ldXJhbCBIdWI6IEdlbmVyYXRlIFNraWxsIEdyYXBoJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5nZW5lcmF0ZVNraWxsR3JhcGgoKVxuICAgICAgICB9KTtcbiAgICAgICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMubG9hZFN0eWxlcygpO1xuICAgICAgICB0aGlzLmF1ZGlvID0gbmV3IEF1ZGlvQ29udHJvbGxlcih0aGlzLnNldHRpbmdzLm11dGVkKTtcbiAgICAgICAgdGhpcy5lbmdpbmUgPSBuZXcgU2lzeXBodXNFbmdpbmUodGhpcy5hcHAsIHRoaXMsIHRoaXMuYXVkaW8pO1xuXG4gICAgICAgIHRoaXMucmVnaXN0ZXJWaWV3KFZJRVdfVFlQRV9QQU5PUFRJQ09OLCAobGVhZikgPT4gbmV3IFBhbm9wdGljb25WaWV3KGxlYWYsIHRoaXMpKTtcblxuICAgICAgICB0aGlzLnN0YXR1c0Jhckl0ZW0gPSB0aGlzLmFkZFN0YXR1c0Jhckl0ZW0oKTtcbiAgICAgICAgKHdpbmRvdyBhcyBhbnkpLnNpc3lwaHVzRW5naW5lID0gdGhpcy5lbmdpbmU7XG4gICAgICAgIFxuICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5jaGVja0RhaWx5TG9naW4oKTtcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNCYXIoKTtcblxuXG4gICAgICAgIC8vIC0tLSBDT01NQU5EUyAtLS1cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdvcGVuLXBhbm9wdGljb24nLCBuYW1lOiAnT3BlbiBQYW5vcHRpY29uJywgY2FsbGJhY2s6ICgpID0+IHRoaXMuYWN0aXZhdGVWaWV3KCkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAndG9nZ2xlLWZvY3VzJywgbmFtZTogJ1RvZ2dsZSBGb2N1cyBBdWRpbycsIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmF1ZGlvLnRvZ2dsZUJyb3duTm9pc2UoKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdjcmVhdGUtcmVzZWFyY2gnLCBuYW1lOiAnUmVzZWFyY2g6IENyZWF0ZSBRdWVzdCcsIGNhbGxiYWNrOiAoKSA9PiBuZXcgUmVzZWFyY2hRdWVzdE1vZGFsKHRoaXMuYXBwLCB0aGlzKS5vcGVuKCkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAndmlldy1yZXNlYXJjaCcsIG5hbWU6ICdSZXNlYXJjaDogVmlldyBMaWJyYXJ5JywgY2FsbGJhY2s6ICgpID0+IG5ldyBSZXNlYXJjaExpc3RNb2RhbCh0aGlzLmFwcCwgdGhpcykub3BlbigpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ21lZGl0YXRlJywgbmFtZTogJ01lZGl0YXRpb246IFN0YXJ0JywgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLnN0YXJ0TWVkaXRhdGlvbigpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ2NyZWF0ZS1jaGFpbicsIG5hbWU6ICdDaGFpbnM6IENyZWF0ZScsIGNhbGxiYWNrOiAoKSA9PiBuZXcgQ2hhaW5CdWlsZGVyTW9kYWwodGhpcy5hcHAsIHRoaXMpLm9wZW4oKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICd2aWV3LWNoYWlucycsIG5hbWU6ICdDaGFpbnM6IFZpZXcgQWN0aXZlJywgY2FsbGJhY2s6ICgpID0+IHsgY29uc3QgYyA9IHRoaXMuZW5naW5lLmdldEFjdGl2ZUNoYWluKCk7IG5ldyBOb3RpY2UoYyA/IGBBY3RpdmU6ICR7Yy5uYW1lfWAgOiBcIk5vIGFjdGl2ZSBjaGFpblwiKTsgfSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdmaWx0ZXItaGlnaCcsIG5hbWU6ICdGaWx0ZXJzOiBIaWdoIEVuZXJneScsIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5zZXRGaWx0ZXJTdGF0ZShcImhpZ2hcIiwgXCJhbnlcIiwgW10pIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ2NsZWFyLWZpbHRlcnMnLCBuYW1lOiAnRmlsdGVyczogQ2xlYXInLCBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUuY2xlYXJGaWx0ZXJzKCkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAnZ2FtZS1zdGF0cycsIG5hbWU6ICdBbmFseXRpY3M6IFN0YXRzJywgY2FsbGJhY2s6ICgpID0+IHsgY29uc3QgcyA9IHRoaXMuZW5naW5lLmdldEdhbWVTdGF0cygpOyBuZXcgTm90aWNlKGBMdmwgJHtzLmxldmVsfSB8IFN0cmVhayAke3MuY3VycmVudFN0cmVha31gKTsgfSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdzY2FycycsIG5hbWU6ICdTY2FyczogVmlldycsIGNhbGxiYWNrOiAoKSA9PiBuZXcgU2NhcnNNb2RhbCh0aGlzLmFwcCwgdGhpcykub3BlbigpIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkUmliYm9uSWNvbignc2t1bGwnLCAnU2lzeXBodXMgU2lkZWJhcicsICgpID0+IHRoaXMuYWN0aXZhdGVWaWV3KCkpO1xuICAgICAgICAvLyAuLi4gcHJldmlvdXMgY29kZSAuLi5cblxuICAgIC8vIC0tLSBTRVRUSU5HUyBUQUIgLS0tXG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBTaXN5cGh1c1NldHRpbmdUYWIodGhpcy5hcHAsIHRoaXMpKTtcblxuICAgIHRoaXMuYWRkUmliYm9uSWNvbignc2t1bGwnLCAnU2lzeXBodXMgU2lkZWJhcicsICgpID0+IHRoaXMuYWN0aXZhdGVWaWV3KCkpO1xuICAgIHRoaXMucmVnaXN0ZXJJbnRlcnZhbCh3aW5kb3cuc2V0SW50ZXJ2YWwoKCkgPT4geyB2b2lkIHRoaXMuZW5naW5lLmNoZWNrRGVhZGxpbmVzKCk7IH0sIDYwMDAwKSk7XG5cblxuICAgIC8vIFtGSVhdIERlYm91bmNlZCBXb3JkIENvdW50ZXIgKFR5cGV3cml0ZXIgRml4KVxuICAgICAgICBjb25zdCBkZWJvdW5jZWRVcGRhdGUgPSBkZWJvdW5jZSgoZmlsZTogVEZpbGUsIGNvbnRlbnQ6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgLy8gMS4gQ2hlY2sgaWYgZmlsZSBzdGlsbCBleGlzdHMgdG8gcHJldmVudCByYWNlIGNvbmRpdGlvbiBlcnJvcnNcbiAgICAgICAgICAgIGlmICghZmlsZSB8fCAhZmlsZS5wYXRoKSByZXR1cm47XG4gICAgICAgICAgICBjb25zdCBleGlzdHMgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZmlsZS5wYXRoKTtcbiAgICAgICAgICAgIGlmICghZXhpc3RzKSByZXR1cm47XG5cbiAgICAgICAgICAgIGNvbnN0IGNhY2hlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XG4gICAgICAgICAgICBpZiAoY2FjaGU/LmZyb250bWF0dGVyPy5yZXNlYXJjaF9pZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHdvcmRzID0gY29udGVudC50cmltKCkuc3BsaXQoL1xccysvKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgdGhpcy5lbmdpbmUudXBkYXRlUmVzZWFyY2hXb3JkQ291bnQoY2FjaGUuZnJvbnRtYXR0ZXIucmVzZWFyY2hfaWQsIHdvcmRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMTAwMCwgdHJ1ZSk7XG5cbiAgICAgICAgLy8gUmVnaXN0ZXIgdGhlIGV2ZW50IGxpc3RlbmVyIHRvIGFjdHVhbGx5IFVTRSB0aGUgZGVib3VuY2UgZnVuY3Rpb25cbiAgICAgICAgdGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLndvcmtzcGFjZS5vbignZWRpdG9yLWNoYW5nZScsIChlZGl0b3IsIGluZm8pID0+IHtcbiAgICAgICAgICAgIGlmIChpbmZvICYmIGluZm8uZmlsZSkge1xuICAgICAgICAgICAgICAgIGRlYm91bmNlZFVwZGF0ZShpbmZvLmZpbGUsIGVkaXRvci5nZXRWYWx1ZSgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgIH0gLy8gPC0tLSBUSElTIEJSQUNFIFdBUyBNSVNTSU5HXG5cbiAgICBhc3luYyBsb2FkU3R5bGVzKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZGlyID0gKHRoaXMubWFuaWZlc3QgJiYgKHRoaXMubWFuaWZlc3QgYXMgeyBkaXI/OiBzdHJpbmcgfSkuZGlyKSB8fCBcIlwiO1xuICAgICAgICAgICAgY29uc3QgcGF0aCA9IGRpciA/IGAke2Rpcn0vc3R5bGVzLmNzc2AgOiBcInN0eWxlcy5jc3NcIjtcbiAgICAgICAgICAgIGNvbnN0IGNzc0ZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocGF0aCk7XG4gICAgICAgICAgICBpZiAoY3NzRmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3NzID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChjc3NGaWxlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcbiAgICAgICAgICAgICAgICBzdHlsZS5pZCA9IFwic2lzeXBodXMtc3R5bGVzXCI7XG4gICAgICAgICAgICAgICAgc3R5bGUuaW5uZXJIVE1MID0gY3NzO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7IGNvbnNvbGUuZXJyb3IoXCJDb3VsZCBub3QgbG9hZCBzdHlsZXMuY3NzXCIsIGUpOyB9XG4gICAgfVxuXG4gICAgYXN5bmMgb251bmxvYWQoKSB7XG4gICAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5kZXRhY2hMZWF2ZXNPZlR5cGUoVklFV19UWVBFX1BBTk9QVElDT04pO1xuICAgICAgICBpZih0aGlzLmF1ZGlvLmF1ZGlvQ3R4KSB0aGlzLmF1ZGlvLmF1ZGlvQ3R4LmNsb3NlKCk7XG4gICAgICAgIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzaXN5cGh1cy1zdHlsZXNcIik7XG4gICAgICAgIGlmIChzdHlsZSkgc3R5bGUucmVtb3ZlKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgYWN0aXZhdGVWaWV3KCkge1xuICAgICAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHA7XG4gICAgICAgIGxldCBsZWFmOiBXb3Jrc3BhY2VMZWFmIHwgbnVsbCA9IG51bGw7XG4gICAgICAgIGNvbnN0IGxlYXZlcyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVklFV19UWVBFX1BBTk9QVElDT04pO1xuICAgICAgICBpZiAobGVhdmVzLmxlbmd0aCA+IDApIGxlYWYgPSBsZWF2ZXNbMF07XG4gICAgICAgIGVsc2UgeyBsZWFmID0gd29ya3NwYWNlLmdldFJpZ2h0TGVhZihmYWxzZSk7IGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogVklFV19UWVBFX1BBTk9QVElDT04sIGFjdGl2ZTogdHJ1ZSB9KTsgfVxuICAgICAgICB3b3Jrc3BhY2UucmV2ZWFsTGVhZihsZWFmKTtcbiAgICB9XG5cbiAgICB1cGRhdGVTdGF0dXNCYXIoKSB7XG4gICAgICAgIGNvbnN0IHNoaWVsZCA9ICh0aGlzLmVuZ2luZS5pc1NoaWVsZGVkKCkgfHwgdGhpcy5lbmdpbmUuaXNSZXN0aW5nKCkpID8gKHRoaXMuZW5naW5lLmlzUmVzdGluZygpID8gXCJEXCIgOiBcIlNcIikgOiBcIlwiO1xuICAgICAgICBjb25zdCBtQ291bnQgPSB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMuZmlsdGVyKG0gPT4gbS5jb21wbGV0ZWQpLmxlbmd0aDtcbiAgICAvLyBbTkVXXSBDb21ibyBJbmRpY2F0b3JcbiAgICAgICAgLy8gSWYgY29tYm8gPiAxLCBzaG93IGZpcmUgaWNvbi4gT3RoZXJ3aXNlIHNob3cgbm90aGluZy5cbiAgICAgICAgY29uc3QgY29tYm8gPSB0aGlzLnNldHRpbmdzLmNvbWJvQ291bnQgPiAxID8gYCDwn5SleCR7dGhpcy5zZXR0aW5ncy5jb21ib0NvdW50fWAgOiBcIlwiO1xuICAgICAgICB0aGlzLnN0YXR1c0Jhckl0ZW0uc2V0VGV4dChgJHt0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIuaWNvbn0gJHtzaGllbGR9IEhQJHt0aGlzLnNldHRpbmdzLmhwfSBHJHt0aGlzLnNldHRpbmdzLmdvbGR9IE0ke21Db3VudH0vM2ApO1xuICAgICAgICB0aGlzLnN0YXR1c0Jhckl0ZW0uc3R5bGUuY29sb3IgPSB0aGlzLnNldHRpbmdzLmhwIDwgMzAgPyBcInJlZFwiIDogdGhpcy5zZXR0aW5ncy5nb2xkIDwgMCA/IFwib3JhbmdlXCIgOiBcIlwiO1xuICAgIH1cbiAgICBcbiAgICBhc3luYyBsb2FkU2V0dGluZ3MoKSB7IHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBhd2FpdCB0aGlzLmxvYWREYXRhKCkpOyB9XG4gICAgYXN5bmMgc2F2ZVNldHRpbmdzKCkgeyBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpOyB9XG59XG4iXSwibmFtZXMiOlsiTm90aWNlIiwiTW9kYWwiLCJtb21lbnQiLCJTZXR0aW5nIiwiVEZvbGRlciIsIlRGaWxlIiwiZ2V0RGlmZmljdWx0eU51bSIsIkl0ZW1WaWV3IiwiZGVib3VuY2UiLCJQbHVnaW5TZXR0aW5nVGFiIiwiUGx1Z2luIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFrR0E7QUFDTyxTQUFTLFNBQVMsQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUU7QUFDN0QsSUFBSSxTQUFTLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPLEtBQUssWUFBWSxDQUFDLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLFVBQVUsT0FBTyxFQUFFLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7QUFDaEgsSUFBSSxPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxPQUFPLENBQUMsRUFBRSxVQUFVLE9BQU8sRUFBRSxNQUFNLEVBQUU7QUFDL0QsUUFBUSxTQUFTLFNBQVMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO0FBQ25HLFFBQVEsU0FBUyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO0FBQ3RHLFFBQVEsU0FBUyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFFO0FBQ3RILFFBQVEsSUFBSSxDQUFDLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLFVBQVUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQzlFLEtBQUssQ0FBQyxDQUFDO0FBQ1AsQ0FBQztBQTZNRDtBQUN1QixPQUFPLGVBQWUsS0FBSyxVQUFVLEdBQUcsZUFBZSxHQUFHLFVBQVUsS0FBSyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUU7QUFDdkgsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMvQixJQUFJLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBRyxpQkFBaUIsRUFBRSxDQUFDLENBQUMsS0FBSyxHQUFHLEtBQUssRUFBRSxDQUFDLENBQUMsVUFBVSxHQUFHLFVBQVUsRUFBRSxDQUFDLENBQUM7QUFDckY7O0FDelVBO01BQ2EsV0FBVyxDQUFBO0FBQXhCLElBQUEsV0FBQSxHQUFBO1FBQ1ksSUFBUyxDQUFBLFNBQUEsR0FBa0MsRUFBRSxDQUFDO0tBY3pEO0lBWkcsRUFBRSxDQUFDLEtBQWEsRUFBRSxFQUFZLEVBQUE7UUFDMUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNsRTtJQUVELEdBQUcsQ0FBQyxLQUFhLEVBQUUsRUFBWSxFQUFBO0FBQzNCLFFBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDO1lBQUUsT0FBTztRQUNuQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7S0FDdkU7SUFFRCxPQUFPLENBQUMsS0FBYSxFQUFFLElBQVUsRUFBQTtRQUM3QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDekQ7QUFDSixDQUFBO01BRVksZUFBZSxDQUFBO0FBS3hCLElBQUEsV0FBQSxDQUFZLEtBQWMsRUFBQTtRQUoxQixJQUFRLENBQUEsUUFBQSxHQUF3QixJQUFJLENBQUM7UUFDckMsSUFBYyxDQUFBLGNBQUEsR0FBK0IsSUFBSSxDQUFDO1FBQ2xELElBQUssQ0FBQSxLQUFBLEdBQVksS0FBSyxDQUFDO0FBRU8sUUFBQSxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztLQUFFO0lBRW5ELFFBQVEsQ0FBQyxLQUFjLEVBQUEsRUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxFQUFFO0FBRWhELElBQUEsU0FBUyxHQUFLLEVBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRO0FBQUUsUUFBQSxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssTUFBTSxDQUFDLFlBQVksSUFBSyxNQUFjLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxFQUFFO0lBRXRILFFBQVEsQ0FBQyxJQUFZLEVBQUUsSUFBb0IsRUFBRSxRQUFnQixFQUFFLE1BQWMsR0FBRyxFQUFBO1FBQzVFLElBQUksSUFBSSxDQUFDLEtBQUs7WUFBRSxPQUFPO1FBQ3ZCLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNqQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUyxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDOUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztBQUN6QyxRQUFBLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0FBQ2hCLFFBQUEsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO0FBQzNCLFFBQUEsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDekMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ1osUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLFFBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUMxRCxRQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFTLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZGLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVMsQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLENBQUM7S0FDbkQ7QUFFRCxJQUFBLFNBQVMsQ0FBQyxJQUE2RCxFQUFBO0FBQ25FLFFBQUEsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFO1lBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQUMsWUFBQSxVQUFVLENBQUMsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FBRTtBQUMvRyxhQUFBLElBQUksSUFBSSxLQUFLLE1BQU0sRUFBRTtZQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUFDLFlBQUEsVUFBVSxDQUFDLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsVUFBVSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQUU7QUFDekgsYUFBQSxJQUFJLElBQUksS0FBSyxPQUFPLEVBQUU7WUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FBRTtBQUMzRCxhQUFBLElBQUksSUFBSSxLQUFLLE9BQU8sRUFBRTtZQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztTQUFFO0FBQzNELGFBQUEsSUFBSSxJQUFJLEtBQUssV0FBVyxFQUFFO1lBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUFDLFlBQUEsVUFBVSxDQUFDLE1BQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUFFO0FBQzVILGFBQUEsSUFBSSxJQUFJLEtBQUssVUFBVSxFQUFFO1lBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztTQUFFO0tBQzNFO0lBRUQsZ0JBQWdCLEdBQUE7UUFDWixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDakIsUUFBQSxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUU7QUFDckIsWUFBQSxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxDQUFDO0FBQ2pDLFlBQUEsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7QUFDM0IsWUFBQSxJQUFJQSxlQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQztTQUNsQzthQUFNO1lBQ0gsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDO0FBQ3hCLFlBQUEsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsUUFBUyxDQUFDLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDN0UsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDO1lBQ2hCLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQyxLQUFJO2dCQUN2QyxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoRCxnQkFBQSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsVUFBVSxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUNqQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNwQyxvQkFBQSxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQztBQUM5QyxvQkFBQSxPQUFPLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BCLG9CQUFBLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUM7aUJBQ3BCO0FBQ0wsYUFBQyxDQUFDO1lBQ0YsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN4RCxZQUFBLElBQUlBLGVBQU0sQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1NBQy9DO0tBQ0o7QUFDSjs7QUMxRUssTUFBTyxVQUFXLFNBQVFDLGNBQUssQ0FBQTtBQUVqQyxJQUFBLFdBQUEsQ0FBWSxHQUFRLEVBQUUsQ0FBVyxFQUFJLEVBQUEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBQyxDQUFDLENBQUMsRUFBRTtJQUNuRSxNQUFNLEdBQUE7QUFDRixRQUFBLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7QUFDekIsUUFBQSxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO0FBQ2xELFFBQUEsRUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUMxRCxRQUFBLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUMzRCxRQUFBLEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFDLG9DQUFvQyxDQUFDLENBQUM7QUFDOUQsUUFBQSxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7QUFDMUQsUUFBQSxFQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQzlDLFFBQUEsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDO0FBQ3RELFFBQUEsQ0FBQyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUM1QyxRQUFBLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFDLGFBQWEsRUFBQyxDQUFDLENBQUM7QUFDckQsUUFBQSxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3RCLFFBQUEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUMsT0FBTyxDQUFDO0FBQ3hCLFFBQUEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUMsV0FBVyxDQUFDO1FBQzNCLENBQUMsQ0FBQyxPQUFPLEdBQUMsTUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7S0FDOUI7SUFDRCxPQUFPLEdBQUEsRUFBSyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUU7QUFDeEMsQ0FBQTtBQUVLLE1BQU8sU0FBVSxTQUFRQSxjQUFLLENBQUE7QUFFaEMsSUFBQSxXQUFBLENBQVksR0FBUSxFQUFFLE1BQXNCLEVBQUksRUFBQSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxFQUFFO0lBRXJGLE1BQU0sR0FBQTtBQUNBLFFBQUEsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQztRQUMzQixTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7QUFDdEQsUUFBQSxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFBLFVBQUEsRUFBYSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUUsQ0FBQSxFQUFFLENBQUMsQ0FBQzs7QUFHNUUsUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLEVBQUUsRUFBRSxNQUFXLFNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsYUFBQTtBQUM3RCxZQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7U0FDaEcsQ0FBQSxDQUFDLENBQUM7QUFDSCxRQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsR0FBRyxFQUFFLE1BQVcsU0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxhQUFBO1lBQ2hFLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDbEYsQ0FBQSxDQUFDLENBQUM7QUFDSCxRQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsTUFBVyxTQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLGFBQUE7QUFDakUsWUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLEdBQUdDLGVBQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7U0FDaEYsQ0FBQSxDQUFDLENBQUM7QUFDSCxRQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsR0FBRyxFQUFFLE1BQVcsU0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxhQUFBO0FBQ2hFLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsWUFBWSxHQUFHQSxlQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1NBQy9FLENBQUEsQ0FBQyxDQUFDOztRQUdILFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUM7QUFDakQsUUFBQSxNQUFNLEtBQUssR0FBRztBQUNWLFlBQUEsRUFBRSxFQUFFLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDNUgsWUFBQSxFQUFFLEVBQUUsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUM5SCxZQUFBLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLHFCQUFxQixFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLEVBQUU7U0FDMUksQ0FBQztBQUVGLFFBQUEsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUc7WUFDaEIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFBLENBQUEsRUFBSSxJQUFJLENBQUMsSUFBSSxDQUFFLENBQUEsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBVyxTQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLGFBQUE7Z0JBQy9FLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUN6QyxDQUFBLENBQUMsQ0FBQztBQUNSLFNBQUMsQ0FBQyxDQUFDO0tBQ047SUFFSCxJQUFJLENBQUMsRUFBZSxFQUFFLElBQVksRUFBRSxJQUFZLEVBQUUsUUFBZ0IsRUFBRSxNQUEyQixFQUFBOztBQUV6RixRQUFBLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxTQUFTLElBQUksQ0FBQyxDQUFDO1FBQy9ELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxDQUFDO0FBRTVDLFFBQUEsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ3pCLFFBQUEsQ0FBQyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsNEZBQTRGLENBQUMsQ0FBQztBQUN0SCxRQUFBLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUN4QixDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDOztBQUdoQyxRQUFBLElBQUksSUFBSSxHQUFHLENBQUMsRUFBRTtZQUNWLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQWEsVUFBQSxFQUFBLElBQUksSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSwrQkFBK0IsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUN6RztRQUVELENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7QUFDbEMsUUFBQSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFHLEVBQUEsUUFBUSxDQUFJLEVBQUEsQ0FBQSxFQUFFLENBQUMsQ0FBQztRQUUxRCxJQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxRQUFRLEVBQUU7QUFDckMsWUFBQSxDQUFDLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBQyxNQUFNLENBQUMsQ0FBQztBQUFDLFlBQUEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUMsS0FBSyxDQUFDO1NBQzVEO2FBQU07QUFDSCxZQUFBLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDdEIsWUFBQSxDQUFDLENBQUMsT0FBTyxHQUFHLE1BQVcsU0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxhQUFBO2dCQUNuQixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksUUFBUSxDQUFDO2dCQUN0QyxNQUFNLE1BQU0sRUFBRSxDQUFDO2dCQUNmLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2hDLElBQUlGLGVBQU0sQ0FBQyxDQUFVLE9BQUEsRUFBQSxJQUFJLFFBQVEsUUFBUSxDQUFBLENBQUEsQ0FBRyxDQUFDLENBQUM7Z0JBQzlDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNiLGdCQUFBLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0FBQy9DLGFBQUMsQ0FBQSxDQUFBO1NBQ0o7S0FDSjtJQUNELE9BQU8sR0FBQSxFQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRTtBQUN4QyxDQUFBO0FBRUQ7QUFFTSxNQUFPLFVBQVcsU0FBUUMsY0FBSyxDQUFBO0lBR2pDLFdBQVksQ0FBQSxHQUFRLEVBQUUsTUFBc0IsRUFBQTtRQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUQ3QyxJQUFVLENBQUEsVUFBQSxHQUFXLENBQUMsQ0FBQztRQUFDLElBQUssQ0FBQSxLQUFBLEdBQVcsTUFBTSxDQUFDO1FBQUMsSUFBUSxDQUFBLFFBQUEsR0FBVyxNQUFNLENBQUM7UUFBQyxJQUFRLENBQUEsUUFBQSxHQUFXLEVBQUUsQ0FBQztRQUFDLElBQVUsQ0FBQSxVQUFBLEdBQVksS0FBSyxDQUFDO1FBQUMsSUFBTSxDQUFBLE1BQUEsR0FBWSxLQUFLLENBQUM7QUFDekcsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztLQUFFO0lBQ25GLE1BQU0sR0FBQTtBQUNGLFFBQUEsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQztRQUMzQixTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBQ3BELElBQUlFLGdCQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsRUFBRyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN2SSxRQUFBLElBQUlBLGdCQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUMsU0FBUyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBQyxTQUFTLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBRSxJQUFJLENBQUMsVUFBVSxHQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOU8sUUFBQSxNQUFNLE1BQU0sR0FBMkIsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLENBQUM7UUFDMUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDbEUsUUFBQSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDO0FBQzFCLFFBQUEsSUFBSUEsZ0JBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sSUFBRyxDQUFDLEtBQUcsT0FBTyxFQUFDO1lBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQUMsWUFBQSxJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1NBQUU7O1lBQU0sSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNqTixRQUFBLElBQUlBLGdCQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEksUUFBQSxJQUFJQSxnQkFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNwSSxRQUFBLElBQUlBLGdCQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFFLElBQUksQ0FBQyxVQUFVLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwSixRQUFBLElBQUlBLGdCQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFLLEVBQUcsSUFBRyxJQUFJLENBQUMsSUFBSSxFQUFDO0FBQUUsWUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsVUFBVSxFQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsSUFBSSxDQUFDLFFBQVEsRUFBQyxJQUFJLENBQUMsUUFBUSxFQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUFDLFNBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUN4UTtJQUNELE9BQU8sR0FBQSxFQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRTtBQUN4QyxDQUFBO0FBRUssTUFBTyxpQkFBa0IsU0FBUUYsY0FBSyxDQUFBO0FBRXhDLElBQUEsV0FBQSxDQUFZLEdBQVEsRUFBRSxNQUFzQixFQUFJLEVBQUEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsRUFBRTtJQUNuRixNQUFNLEdBQUE7QUFDRixRQUFBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDM0IsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUM7UUFDVCxJQUFJRSxnQkFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBUyxTQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLGFBQUE7WUFDeEksSUFBRyxDQUFDLEVBQUM7Z0JBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsUUFBUSxFQUFDLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxXQUFXLEVBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQztnQkFBQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQzthQUFFO1NBQ25MLENBQUEsQ0FBQyxDQUFDLENBQUM7S0FDUDtJQUNELE9BQU8sR0FBQSxFQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRTtBQUN4QyxDQUFBO0FBRUssTUFBTyxnQkFBaUIsU0FBUUYsY0FBSyxDQUFBO0lBRXZDLFdBQVksQ0FBQSxHQUFRLEVBQUUsTUFBc0IsRUFBRSxLQUFhLEVBQUksRUFBQSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsS0FBSyxDQUFDLEVBQUU7SUFDbEgsTUFBTSxHQUFBO0FBQ0YsUUFBQSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO0FBQzNCLFFBQUEsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNsRCxJQUFJLENBQUMsQ0FBQyxFQUFFO1lBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO1lBQUMsT0FBTztTQUFFO0FBQzFFLFFBQUEsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQSxNQUFBLEVBQVMsQ0FBQyxDQUFDLElBQUksQ0FBRSxDQUFBLEVBQUUsQ0FBQyxDQUFDO0FBQ3RELFFBQUEsSUFBSUUsZ0JBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1RixRQUFBLElBQUlBLGdCQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUUsQ0FBQSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFXLFNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsYUFBQSxFQUFBLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsSUFBSUgsZUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFBLENBQUMsQ0FBQyxDQUFDO0FBQ3hRLFFBQUEsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQUMsUUFBQSxHQUFHLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSwrREFBK0QsQ0FBQyxDQUFDO0FBQzlILFFBQUEsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQztBQUFDLFFBQUEsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUMscURBQVcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUEsQ0FBQztBQUMxSixRQUFBLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFDLGFBQWEsRUFBQyxDQUFDLENBQUM7QUFBQyxRQUFBLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFDLFlBQVksQ0FBQyxDQUFDO0FBQUMsUUFBQSxJQUFJLENBQUMsT0FBTyxHQUFDLE1BQVMsU0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxhQUFBLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUEsQ0FBQztLQUNuTztJQUNELE9BQU8sR0FBQSxFQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRTtBQUN4QyxDQUFBO0FBRUssTUFBTyxpQkFBa0IsU0FBUUMsY0FBSyxDQUFBO0FBRXhDLElBQUEsV0FBQSxDQUFZLEdBQVEsRUFBRSxNQUFzQixFQUFJLEVBQUEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsRUFBRTtJQUNuRixNQUFNLEdBQUE7QUFDRixRQUFBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDM0IsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO0FBQ3RELFFBQUEsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2xDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxXQUFXLEVBQUUsc0JBQXNCLEVBQUUsS0FBSyxFQUFFLHlHQUF5RyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZOLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNkLFFBQUEsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxDQUFPLENBQUMsS0FBSSxTQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLGFBQUEsRUFBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLEtBQUssT0FBTyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtBQUFFLFlBQUEsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQUMsU0FBQyxFQUFFLENBQUEsQ0FBQyxDQUFDO0FBQ2xMLFFBQUEsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDO0FBQ3hFLFFBQUEsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN4QixRQUFBLEdBQUcsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLGdDQUFnQyxDQUFDLENBQUM7QUFDNUQsUUFBQSxHQUFHLENBQUMsT0FBTyxHQUFHLE1BQVcsU0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxhQUFBLEVBQUcsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7QUFBRSxZQUFBLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztTQUFFLEVBQUUsQ0FBQSxDQUFDO0tBQ3pJO0lBQ0QsT0FBTyxHQUFBLEVBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFO0FBQ3hDLENBQUE7QUFFSyxNQUFPLGtCQUFtQixTQUFRQSxjQUFLLENBQUE7QUFFekMsSUFBQSxXQUFBLENBQVksR0FBUSxFQUFFLE1BQXNCLEVBQUksRUFBQSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxFQUFFO0lBQ25GLE1BQU0sR0FBQTtBQUNGLFFBQUEsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQztRQUMzQixTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSwwQkFBMEIsRUFBRSxDQUFDLENBQUM7QUFDL0QsUUFBQSxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDbkMsUUFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7QUFBQyxRQUFBLElBQUksQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxDQUFDO0FBQUMsUUFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUM7UUFDakcsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsY0FBYyxJQUFJLEVBQUUsQ0FBQztBQUM1RCxRQUFBLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksRUFBRSw2Q0FBNkMsRUFBRSxDQUFDLENBQUM7QUFDcEcsUUFBQSxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsSUFBRztBQUN6QixZQUFBLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQzdELFlBQUEsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUFDLFlBQUEsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDO0FBQUMsWUFBQSxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7WUFDbkYsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFTLE1BQUEsRUFBQSxRQUFRLENBQUMsSUFBSSxDQUFhLFVBQUEsRUFBQSxRQUFRLENBQUMsS0FBSyxDQUFBLENBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsa0RBQWtELEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDbEosWUFBQSxHQUFHLENBQUMsT0FBTyxHQUFHLE1BQUs7Z0JBQ2YsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDO2dCQUNsQixJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQ25DLG9CQUFBLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ2xGLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ2hDLFFBQVEsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxHQUFHLENBQUM7QUFDaEMsMEJBQUVDLGVBQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsV0FBVyxFQUFFO0FBQ3pDLDBCQUFFQSxlQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO2lCQUNwRDtxQkFBTSxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQ3hDLG9CQUFBLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQzVDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNsQyxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNwQyxvQkFBQSxRQUFRLEdBQUdBLGVBQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQ3hELG9CQUFBLElBQUlBLGVBQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7QUFBRSx3QkFBQSxRQUFRLEdBQUdBLGVBQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO2lCQUMzRjtxQkFBTTtBQUNILG9CQUFBLFFBQVEsR0FBR0EsZUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztpQkFDdEQ7QUFDRCxnQkFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUN2SCxJQUFJRixlQUFNLENBQUMsQ0FBYSxVQUFBLEVBQUEsUUFBUSxDQUFDLElBQUksQ0FBQSxDQUFFLENBQUMsQ0FBQztnQkFDekMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ2pCLGFBQUMsQ0FBQztBQUNOLFNBQUMsQ0FBQyxDQUFDO0tBQ047SUFDRCxPQUFPLEdBQUEsRUFBSyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUU7QUFDeEMsQ0FBQTtBQUVLLE1BQU8sa0JBQW1CLFNBQVFDLGNBQUssQ0FBQTtJQUV6QyxXQUFZLENBQUEsR0FBUSxFQUFFLE1BQXNCLEVBQUE7UUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFEbkMsSUFBSyxDQUFBLEtBQUEsR0FBVyxFQUFFLENBQUM7UUFBQyxJQUFJLENBQUEsSUFBQSxHQUEyQixRQUFRLENBQUM7UUFBQyxJQUFXLENBQUEsV0FBQSxHQUFXLE1BQU0sQ0FBQztRQUFDLElBQWlCLENBQUEsaUJBQUEsR0FBVyxNQUFNLENBQUM7QUFDMUYsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztLQUFFO0lBQ25GLE1BQU0sR0FBQTtBQUNGLFFBQUEsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQztRQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLHFCQUFxQixFQUFFLENBQUMsQ0FBQztRQUN0RixJQUFJRSxnQkFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsRUFBRyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM3SSxJQUFJQSxnQkFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLHdCQUF3QixDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBMkIsQ0FBQyxDQUFDLENBQUM7QUFDaFAsUUFBQSxNQUFNLE1BQU0sR0FBMkIsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLENBQUM7UUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM3SCxRQUFBLElBQUlBLGdCQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0ksUUFBQSxNQUFNLFlBQVksR0FBMkIsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLENBQUM7QUFDaEUsUUFBQSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQzlFLFFBQUEsSUFBSSxXQUFXLFlBQVlDLGdCQUFPLEVBQUU7QUFBRSxZQUFBLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxFQUFHLElBQUksQ0FBQyxZQUFZQyxjQUFLLElBQUksQ0FBQyxDQUFDLFNBQVMsS0FBSyxJQUFJO0FBQUUsZ0JBQUEsWUFBWSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQUU7QUFDdEssUUFBQSxJQUFJRixnQkFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1SixJQUFJQSxnQkFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFXLFNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsYUFBQTtZQUNqRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUs7Z0JBQUUsT0FBTztZQUN4QixNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQzFILElBQUksR0FBRyxDQUFDLE9BQU87Z0JBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1NBQ2pDLENBQUEsQ0FBQyxDQUFDLENBQUM7S0FDUDtJQUNELE9BQU8sR0FBQSxFQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRTtBQUN4QyxDQUFBO0FBRUssTUFBTyxpQkFBa0IsU0FBUUYsY0FBSyxDQUFBO0FBRXhDLElBQUEsV0FBQSxDQUFZLEdBQVEsRUFBRSxNQUFzQixFQUFJLEVBQUEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsRUFBRTtJQUNuRixNQUFNLEdBQUE7QUFDRixRQUFBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxDQUFDLENBQUM7UUFDbkYsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztBQUNwRCxRQUFBLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUscUJBQXFCLEVBQUUsQ0FBQyxDQUFDO0FBQUMsUUFBQSxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFBLGVBQUEsRUFBa0IsS0FBSyxDQUFDLE1BQU0sQ0FBRSxDQUFBLEVBQUUsQ0FBQyxDQUFDO0FBQUMsUUFBQSxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFBLGlCQUFBLEVBQW9CLEtBQUssQ0FBQyxRQUFRLENBQUUsQ0FBQSxFQUFFLENBQUMsQ0FBQztBQUFDLFFBQUEsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQSxPQUFBLEVBQVUsS0FBSyxDQUFDLEtBQUssQ0FBSSxFQUFBLENBQUEsRUFBRSxDQUFDLENBQUM7UUFDMVEsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLHNCQUFzQixFQUFFLEVBQUU7QUFBRSxZQUFBLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUFDLFlBQUEsT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsbURBQW1ELENBQUMsQ0FBQztBQUFDLFlBQUEsT0FBTyxDQUFDLE9BQU8sQ0FBQyxxREFBcUQsQ0FBQyxDQUFDO1NBQUU7UUFDeFAsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzdFLFFBQUEsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUM7WUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSw0QkFBNEIsRUFBRSxDQUFDLENBQUM7O0FBQ3BGLFlBQUEsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQU0sS0FBSTtBQUMzQixnQkFBQSxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLG9CQUFvQixFQUFFLENBQUMsQ0FBQztBQUFDLGdCQUFBLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLDJFQUEyRSxDQUFDLENBQUM7QUFDekssZ0JBQUEsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7QUFBQyxnQkFBQSxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO2dCQUMxRyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQUMsZ0JBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFBLDRCQUFBLEVBQStCLENBQUMsQ0FBQyxFQUFFLENBQUEsaUJBQUEsRUFBb0IsQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLEdBQUcsUUFBUSxHQUFHLFdBQVcsQ0FBYSxVQUFBLEVBQUEsQ0FBQyxDQUFDLFNBQVMsQ0FBSSxDQUFBLEVBQUEsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQUMsZ0JBQUEsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztBQUNoUSxnQkFBQSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7QUFBQyxnQkFBQSxPQUFPLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSwyQ0FBMkMsQ0FBQyxDQUFDO0FBQzdHLGdCQUFBLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7QUFBQyxnQkFBQSxXQUFXLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSw0R0FBNEcsQ0FBQyxDQUFDO0FBQUMsZ0JBQUEsV0FBVyxDQUFDLE9BQU8sR0FBRyxNQUFLLEVBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQ2xVLGdCQUFBLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7QUFBQyxnQkFBQSxTQUFTLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSwwR0FBMEcsQ0FBQyxDQUFDO0FBQUMsZ0JBQUEsU0FBUyxDQUFDLE9BQU8sR0FBRyxNQUFXLFNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsYUFBQSxFQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQSxDQUFDO0FBQ3pULGFBQUMsQ0FBQyxDQUFDO1FBQ0gsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUMvRSxRQUFBLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDOztZQUNuRixTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBTSxLQUFPLEVBQUEsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQSxFQUFBLEVBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQSxFQUFBLEVBQUssQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLEdBQUcsUUFBUSxHQUFHLFdBQVcsQ0FBRyxDQUFBLENBQUEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsaUNBQWlDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNoTztJQUNELE9BQU8sR0FBQSxFQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRTtBQUN4QyxDQUFBO0FBRUssTUFBTyxpQkFBa0IsU0FBUUEsY0FBSyxDQUFBO0lBRXhDLFdBQVksQ0FBQSxHQUFRLEVBQUUsTUFBc0IsRUFBQTtRQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQURuQyxJQUFTLENBQUEsU0FBQSxHQUFXLEVBQUUsQ0FBQztRQUFDLElBQWMsQ0FBQSxjQUFBLEdBQWEsRUFBRSxDQUFDO0FBQ2xCLFFBQUEsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7S0FBRTtJQUNuRixNQUFNLEdBQUE7QUFDRixRQUFBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBQ2hGLElBQUlFLGdCQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsRUFBRyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM3SSxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDO0FBQ3BELFFBQUEsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUM5RSxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUM7QUFDNUIsUUFBQSxJQUFJLFdBQVcsWUFBWUMsZ0JBQU8sRUFBRTtBQUFFLFlBQUEsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLEVBQUcsSUFBSSxDQUFDLFlBQVlDLGNBQUssSUFBSSxDQUFDLENBQUMsU0FBUyxLQUFLLElBQUk7Z0JBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7U0FBRTtBQUN4SixRQUFBLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxLQUFJLEVBQUcsSUFBSUYsZ0JBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBRyxFQUFHLElBQUksQ0FBQztBQUFFLFlBQUEsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7O1lBQU0sSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDak8sUUFBQSxJQUFJQSxnQkFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBYyxTQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLGFBQUEsRUFBQSxJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO0FBQUUsWUFBQSxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1NBQUU7O1lBQU0sSUFBSUgsZUFBTSxDQUFDLDBDQUEwQyxDQUFDLENBQUMsRUFBRSxDQUFBLENBQUMsQ0FBQyxDQUFDO0tBQ2xVO0lBQ0QsT0FBTyxHQUFBLEVBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFO0FBQ3hDLENBQUE7QUFFSyxNQUFPLFlBQWEsU0FBUUMsY0FBSyxDQUFBO0FBRW5DLElBQUEsV0FBQSxDQUFZLEdBQVEsRUFBRSxNQUFzQixFQUFJLEVBQUEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsRUFBRTtJQUNuRixNQUFNLEdBQUE7QUFDRixRQUFBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFBQyxRQUFBLFNBQVMsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsQ0FBQztBQUNyRSxRQUFBLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLG9CQUFvQixFQUFFLEdBQUcsRUFBRSxvQkFBb0IsRUFBRSxDQUFDLENBQUM7QUFDcEYsUUFBQSxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLGtDQUFrQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQy9GLFFBQUEsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1FBQUMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDbkksSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQUMsUUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxjQUFjLEVBQUUsQ0FBQSxFQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUEsQ0FBRSxDQUFDLENBQUM7QUFBQyxRQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLGdCQUFnQixFQUFFLENBQUEsRUFBRyxNQUFNLENBQUMsVUFBVSxDQUFBLENBQUUsQ0FBQyxDQUFDO0FBQUMsUUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxDQUFBLEVBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQSxLQUFBLENBQU8sQ0FBQyxDQUFDO0FBQ25QLFFBQUEsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsMkVBQTJFLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLG1EQUFtRCxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ3JMLFFBQUEsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO0FBQUMsUUFBQSxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQUMsUUFBQSxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUM7QUFBQyxRQUFBLEdBQUcsQ0FBQyxPQUFPLEdBQUcsTUFBSyxFQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUM7S0FDbks7QUFDRCxJQUFBLFFBQVEsQ0FBQyxFQUFlLEVBQUUsS0FBYSxFQUFFLEdBQVcsRUFBQSxFQUFJLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFBLEVBQUcsS0FBSyxDQUEwQyx1Q0FBQSxFQUFBLEdBQUcsQ0FBUyxPQUFBLENBQUEsQ0FBQyxFQUFFO0lBQ25NLE9BQU8sR0FBQSxFQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRTtBQUN4QyxDQUFBO0FBRUssTUFBTyxVQUFXLFNBQVFBLGNBQUssQ0FBQTtBQUVqQyxJQUFBLFdBQUEsQ0FBWSxHQUFRLEVBQUUsTUFBc0IsRUFBSSxFQUFBLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLEVBQUU7SUFDbkYsTUFBTSxHQUFBO0FBQ0YsUUFBQSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO0FBQzNCLFFBQUEsU0FBUyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3ZDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLGdDQUFnQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQzNILFFBQUEsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxzREFBc0QsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUMzSCxRQUFBLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sSUFBSSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLGdCQUFnQixFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxDQUFDO1FBQ25KLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUM7QUFDdkYsUUFBQSxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQzFFLFFBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFLENBQUEsRUFBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUEsQ0FBRSxDQUFDLENBQUM7QUFDdkUsUUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxxQkFBcUIsRUFBRSxDQUFHLEVBQUEsTUFBTSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUEsQ0FBRSxDQUFDLENBQUM7QUFDcEUsUUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxDQUFHLEVBQUEsTUFBTSxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUEsS0FBQSxDQUFPLENBQUMsQ0FBQztBQUNsRSxRQUFBLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLG9GQUFvRixFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSx1RUFBdUUsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUNsTixRQUFBLE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7QUFDbkUsUUFBQSxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3hCLFFBQUEsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDO0FBQ3pCLFFBQUEsR0FBRyxDQUFDLE9BQU8sR0FBRyxNQUFXLFNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsYUFBQTtZQUNyQixNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNqQixTQUFDLENBQUEsQ0FBQztBQUNGLFFBQUEsU0FBUyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUM5QjtBQUNELElBQUEsUUFBUSxDQUFDLEVBQWUsRUFBRSxLQUFhLEVBQUUsR0FBVyxFQUFBLEVBQUksTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUEsRUFBRyxLQUFLLENBQTBDLHVDQUFBLEVBQUEsR0FBRyxDQUFTLE9BQUEsQ0FBQSxDQUFDLEVBQUU7SUFDbk0sT0FBTyxHQUFBLEVBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFO0FBQ3hDLENBQUE7QUFFSyxNQUFPLFVBQVcsU0FBUUEsY0FBSyxDQUFBO0FBRWpDLElBQUEsV0FBQSxDQUFZLEdBQVEsRUFBRSxNQUFzQixFQUFJLEVBQUEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsRUFBRTtJQUNuRixNQUFNLEdBQUE7QUFDRixRQUFBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDM0IsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQztBQUMvQyxRQUFBLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLDhCQUE4QixFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxvQ0FBb0MsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN6SCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO0FBQy9DLFFBQUEsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtBQUNwQixZQUFBLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLDZDQUE2QyxFQUFFLEdBQUcsRUFBRSxrQkFBa0IsRUFBRSxDQUFDLENBQUM7U0FDN0c7YUFBTTtBQUNILFlBQUEsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ25DLFlBQUEsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQStELEtBQUk7QUFDaEcsZ0JBQUEsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxtSEFBbUgsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUNySyxnQkFBQSxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUcsRUFBQSxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUUsQ0FBQSxFQUFFLENBQUMsQ0FBQztnQkFDbkQsSUFBSSxDQUFDLENBQUMsUUFBUTtvQkFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxrQ0FBa0MsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUM3SSxhQUFDLENBQUMsQ0FBQztTQUNOO0tBQ0o7SUFDRCxPQUFPLEdBQUEsRUFBSyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUU7QUFDeEMsQ0FBQTtBQUVLLE1BQU8sb0JBQXFCLFNBQVFBLGNBQUssQ0FBQTtJQU8zQyxXQUFZLENBQUEsR0FBUSxFQUFFLE1BQXNCLEVBQUE7UUFDeEMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBTmYsSUFBTyxDQUFBLE9BQUEsR0FBVyxFQUFFLENBQUM7UUFDckIsSUFBTyxDQUFBLE9BQUEsR0FBVyxDQUFDLENBQUM7UUFDcEIsSUFBUSxDQUFBLFFBQUEsR0FBVyxNQUFNLENBQUM7UUFDMUIsSUFBVyxDQUFBLFdBQUEsR0FBVyxLQUFLLENBQUM7QUFJeEIsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztLQUN4QjtJQUVELE1BQU0sR0FBQTtRQUNGLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztLQUNsQjtJQUVELE9BQU8sR0FBQTtBQUNILFFBQUEsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQztRQUMzQixTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDbEIsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDOztBQUd2RCxRQUFBLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUN0QyxRQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQztBQUNwQyxRQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQztBQUNsQyxRQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQztBQUVqQyxRQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxLQUFJO0FBQ25ELFlBQUEsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ2hDLFlBQUEsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO0FBQzNCLFlBQUEsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLEdBQUcsZUFBZSxDQUFDO0FBQzNDLFlBQUEsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsUUFBUSxDQUFDO0FBQ2hDLFlBQUEsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO0FBQzNCLFlBQUEsR0FBRyxDQUFDLEtBQUssQ0FBQyxZQUFZLEdBQUcsZ0JBQWdCLENBQUM7WUFFMUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFHLEVBQUEsQ0FBQyxDQUFDLElBQUksQ0FBTSxHQUFBLEVBQUEsQ0FBQyxDQUFDLElBQUksQ0FBQSxFQUFBLEVBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQSxFQUFBLEVBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQSxDQUFBLENBQUcsRUFBRSxDQUFDLENBQUM7QUFFN0UsWUFBQSxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO0FBQzFELFlBQUEsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0FBQzNCLFlBQUEsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFXLFNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsYUFBQTtBQUN4QixnQkFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNuRCxnQkFBQSxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7QUFDakMsZ0JBQUEsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ25CLGFBQUMsQ0FBQSxDQUFDO0FBQ04sU0FBQyxDQUFDLENBQUM7O1FBR0gsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO0FBRXZELFFBQUEsSUFBSUUsZ0JBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkYsUUFBQSxJQUFJQSxnQkFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFHLEVBQUcsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDMUwsUUFBQSxJQUFJQSxnQkFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUcsUUFBQSxJQUFJQSxnQkFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbkosSUFBSUEsZ0JBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUM7YUFDbEMsYUFBYSxDQUFDLGNBQWMsQ0FBQztBQUM3QixhQUFBLE1BQU0sRUFBRTthQUNSLE9BQU8sQ0FBQyxNQUFXLFNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsYUFBQTtZQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU87Z0JBQUUsT0FBTztZQUMxQixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDO2dCQUNyQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU87QUFDbEIsZ0JBQUEsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDakQsZ0JBQUEsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLElBQUksTUFBTTtBQUM5QixnQkFBQSxRQUFRLEVBQUUsSUFBSSxDQUFDLFdBQVcsSUFBSSxLQUFLO0FBQ3RDLGFBQUEsQ0FBQyxDQUFDO0FBQ0gsWUFBQSxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7QUFDakMsWUFBQSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDZixZQUFBLElBQUlILGVBQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDOztBQUc5QixZQUFBLElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1NBQ3JCLENBQUEsQ0FBQyxDQUFDLENBQUM7S0FDWDtJQUVELE9BQU8sR0FBQTtBQUNILFFBQUEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztLQUMxQjtBQUNKOztBQ2phTSxNQUFNLHVCQUF1QixHQUFtRDs7QUFFbkYsSUFBQSxFQUFFLEVBQUUsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRTtBQUN2RyxJQUFBLEVBQUUsRUFBRSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFO0FBQ3ZHLElBQUEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7O0FBRzlGLElBQUEsRUFBRSxFQUFFLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7QUFDckcsSUFBQSxFQUFFLEVBQUUsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRTtBQUNoRyxJQUFBLEVBQUUsRUFBRSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFO0FBQ2pHLElBQUEsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7O0FBR3pGLElBQUEsRUFBRSxFQUFFLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7QUFDbkcsSUFBQSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFO0FBQy9GLElBQUEsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLCtCQUErQixFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUU7Q0FDMUc7O01DZFksZUFBZSxDQUFBO0lBSXhCLFdBQVksQ0FBQSxRQUEwQixFQUFFLGVBQXFCLEVBQUE7QUFDekQsUUFBQSxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztBQUN6QixRQUFBLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDO0tBQzFDO0FBRUQ7O0FBRUc7SUFDSCxzQkFBc0IsR0FBQTs7QUFFbEIsUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZO0FBQUUsWUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUM7QUFFakUsUUFBQSx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFHO1lBQ2xDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDckUsSUFBSSxDQUFDLE1BQU0sRUFBRTtBQUNULGdCQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksQ0FDeEIsTUFBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsRUFBQSxHQUFHLENBQ04sRUFBQSxFQUFBLFFBQVEsRUFBRSxLQUFLLElBQ2pCLENBQUM7YUFDTjtBQUNMLFNBQUMsQ0FBQyxDQUFDO0tBQ047QUFFRCxJQUFBLGlCQUFpQixDQUFDLElBQW1HLEVBQUUsTUFBQSxHQUFpQixDQUFDLEVBQUE7UUFDckksTUFBTSxLQUFLLEdBQUdFLGVBQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUU1QyxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLENBQUM7UUFDbEUsSUFBSSxDQUFDLE1BQU0sRUFBRTtBQUNULFlBQUEsTUFBTSxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsQ0FBQyxFQUFFLFlBQVksRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLFlBQVksRUFBRSxDQUFDLEVBQUUsYUFBYSxFQUFFLEVBQUUsRUFBRSxlQUFlLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDbEosSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3pDO1FBRUQsUUFBUSxJQUFJO0FBQ1IsWUFBQSxLQUFLLGdCQUFnQjtBQUFFLGdCQUFBLE1BQU0sQ0FBQyxlQUFlLElBQUksTUFBTSxDQUFDO2dCQUFDLE1BQU07QUFDL0QsWUFBQSxLQUFLLFlBQVk7QUFBRSxnQkFBQSxNQUFNLENBQUMsWUFBWSxJQUFJLE1BQU0sQ0FBQztnQkFBQyxNQUFNO0FBQ3hELFlBQUEsS0FBSyxJQUFJO0FBQUUsZ0JBQUEsTUFBTSxDQUFDLFFBQVEsSUFBSSxNQUFNLENBQUM7Z0JBQUMsTUFBTTtBQUM1QyxZQUFBLEtBQUssTUFBTTtBQUFFLGdCQUFBLE1BQU0sQ0FBQyxVQUFVLElBQUksTUFBTSxDQUFDO2dCQUFDLE1BQU07QUFDaEQsWUFBQSxLQUFLLFFBQVE7QUFBRSxnQkFBQSxNQUFNLENBQUMsWUFBWSxJQUFJLE1BQU0sQ0FBQztnQkFBQyxNQUFNO0FBQ3BELFlBQUEsS0FBSyxhQUFhO0FBQUUsZ0JBQUEsTUFBTSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQUMsTUFBTTtBQUN0RSxZQUFBLEtBQUssZ0JBQWdCO0FBQUUsZ0JBQUEsTUFBTSxDQUFDLGVBQWUsSUFBSSxNQUFNLENBQUM7Z0JBQUMsTUFBTTtTQUNsRTs7UUFHRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztLQUM1QjtJQUVILFlBQVksR0FBQTtRQUNOLE1BQU0sS0FBSyxHQUFHQSxlQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDNUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO0FBRS9DLFFBQUEsSUFBSSxRQUFRLEtBQUssS0FBSyxFQUFFO0FBQ3BCLFlBQUEsTUFBTSxTQUFTLEdBQUdBLGVBQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ25FLFlBQUEsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFOztBQUV4QixnQkFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQzthQUNsQztpQkFBTSxJQUFJLENBQUMsUUFBUSxFQUFFOztnQkFFbEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQzthQUNwQztpQkFBTTs7Z0JBRUgsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQzthQUNwQztBQUVELFlBQUEsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFO0FBQzdELGdCQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7YUFDL0Q7WUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO1NBQ3pDOztRQUdELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0tBQzVCO0lBRUQsaUJBQWlCLEdBQUE7UUFDYixJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztBQUM5QixRQUFBLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDeEIsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDOztRQUdoRixJQUFJLFdBQVcsSUFBSSxDQUFDO0FBQUUsWUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDOztRQUdqRCxJQUFJLFdBQVcsSUFBSSxFQUFFO0FBQUUsWUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDOztBQUc5QyxRQUFBLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLElBQUksQ0FBQztBQUFFLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQzs7QUFHdkQsUUFBQSxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQztBQUFFLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQzs7QUFHekUsUUFBQSxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsTUFBTSxJQUFJLENBQUM7QUFBRSxZQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7O0FBRzFELFFBQUEsSUFBSSxDQUFDLENBQUMsYUFBYSxDQUFDLGlCQUFpQixJQUFJLENBQUM7QUFBRSxZQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7O0FBR3RFLFFBQUEsSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLEdBQUc7QUFBRSxZQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7O0FBR3ZDLFFBQUEsSUFBSSxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUFFLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQzs7QUFHdkUsUUFBQSxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRTtBQUFFLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQzs7QUFHM0MsUUFBQSxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxLQUFLLENBQUM7QUFBRSxZQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7S0FDM0U7QUFFRCxJQUFBLE1BQU0sQ0FBQyxFQUFVLEVBQUE7UUFDYixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7QUFDOUQsUUFBQSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUU7QUFDdEIsWUFBQSxHQUFHLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztZQUNwQixHQUFHLENBQUMsVUFBVSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDMUMsSUFBSSxJQUFJLENBQUMsZUFBZTtBQUFFLGdCQUFBLElBQUks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QUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQ0EsZUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFQSxlQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUMzRSxDQUFDO1FBRUYsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQVcsRUFBRSxDQUFhLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkcsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQVcsRUFBRSxDQUFhLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDaEcsUUFBQSxNQUFNLFdBQVcsR0FBRyxXQUFXLEdBQUcsV0FBVyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsV0FBVyxJQUFJLFdBQVcsR0FBRyxXQUFXLENBQUMsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdEgsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQVcsRUFBRSxDQUFhLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEYsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQVcsRUFBRSxDQUFhLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFNUYsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBTSxFQUFFLENBQU0sTUFBTSxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBTSxLQUFLLENBQUMsQ0FB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
