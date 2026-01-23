import { ItemView, WorkspaceLeaf, TFile, TFolder, moment, debounce } from 'obsidian';
import SisyphusPlugin from '../main';
import { QuestModal, ShopModal, SkillDetailModal, SkillManagerModal } from './modals';
import { Skill, DailyMission } from '../types';
import { ChartRenderer } from './charts';
import { QuestCardRenderer } from './card';

export const VIEW_TYPE_PANOPTICON = "sisyphus-panopticon";

export class PanopticonView extends ItemView {
    plugin: SisyphusPlugin;
    draggedFile: TFile | null = null;
    selectMode: boolean = false;
    selectedQuests: Set<TFile> = new Set();
    
    private observer: IntersectionObserver | null = null;
    private currentQuestList: TFile[] = [];
    private renderedCount: number = 0;
    private readonly BATCH_SIZE = 20;

    private debouncedRefresh = debounce(this.refresh.bind(this), 50, true);

    constructor(leaf: WorkspaceLeaf, plugin: SisyphusPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() { return VIEW_TYPE_PANOPTICON; }
    getDisplayText() { return "Eye Sisyphus"; }
    getIcon() { return "skull"; }

    async onOpen() { 
        this.refresh(); 
        this.plugin.engine.on('update', this.debouncedRefresh); 
        this.plugin.engine.on('undo:show', (name: string) => this.showUndoToast(name));
    }

    async onClose() {
        this.plugin.engine.off('update', this.debouncedRefresh);
        this.plugin.engine.off('undo:show', this.showUndoToast.bind(this));
        if (this.observer) this.observer.disconnect();
    }

    async refresh() {
        // 1. Capture State & Dimensions
        const scrollArea = this.contentEl.querySelector(".sisy-scroll-area") as HTMLElement;
        let lastScroll = 0;
        if (scrollArea) lastScroll = scrollArea.scrollTop;

        // [FIX] Measure width BEFORE wiping DOM so we can draw charts off-screen
        const currentWidth = this.contentEl.clientWidth || 300; 

        const itemsToRestore = Math.max(this.renderedCount, this.BATCH_SIZE);

        const activeEl = document.activeElement as HTMLElement;
        const isQuickInput = activeEl && activeEl.classList.contains("sisy-quick-input");
        let quickInputValue = "";
        if (isQuickInput) quickInputValue = (activeEl as HTMLInputElement).value;

        // 2. Clean & Prep
        if (this.observer) { this.observer.disconnect(); this.observer = null; }
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
        soundBtn.onclick = async () => {
             this.plugin.settings.muted = !this.plugin.settings.muted;
             this.plugin.audio.setMuted(this.plugin.settings.muted);
             await this.plugin.saveSettings();
             this.debouncedRefresh();
        };

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
        if (this.selectMode) selBtn.addClass("sisy-filter-active");
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
        if (isQuickInput) input.value = quickInputValue;
        
        input.onkeydown = async (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                this.plugin.engine.parseQuickInput(input.value.trim());
                input.value = "";
            }
        };

        this.renderBulkBar(container);

        // 4. THE SWAP
        this.contentEl.empty();
        this.contentEl.appendChild(buffer);

        // 5. RESTORE
        if (isQuickInput) {
            const newInput = this.contentEl.querySelector(".sisy-quick-input") as HTMLInputElement;
            if (newInput) {
                newInput.focus();
                const len = newInput.value.length; 
                newInput.setSelectionRange(len, len);
            }
        }

        if (lastScroll > 0) {
            const newScroll = this.contentEl.querySelector(".sisy-scroll-area");
            if(newScroll) newScroll.scrollTop = lastScroll;
        }
    }

    prepareQuests() {
        const folder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        this.currentQuestList = [];

        if (folder instanceof TFolder) {
            let files = folder.children.filter(f => f instanceof TFile) as TFile[];
            files = this.plugin.engine.filtersEngine.filterQuests(files) as TFile[]; 
            files.sort((a, b) => {
                const fmA = this.app.metadataCache.getFileCache(a)?.frontmatter;
                const fmB = this.app.metadataCache.getFileCache(b)?.frontmatter;
                const orderA = fmA?.manual_order !== undefined ? fmA.manual_order : 9999999999999;
                const orderB = fmB?.manual_order !== undefined ? fmB.manual_order : 9999999999999;
                if (orderA !== orderB) return orderA - orderB;
                if (fmA?.is_boss !== fmB?.is_boss) return (fmB?.is_boss ? 1 : 0) - (fmA?.is_boss ? 1 : 0);
                const dateA = fmA?.deadline ? moment(fmA.deadline).valueOf() : 9999999999999;
                const dateB = fmB?.deadline ? moment(fmB.deadline).valueOf() : 9999999999999;
                return dateA - dateB; 
            });
            this.currentQuestList = files;
        }
    }

    renderQuestBatch(container: HTMLElement, batchSize: number = this.BATCH_SIZE) {
        if (this.currentQuestList.length === 0) {
            const idle = container.createDiv({ text: "System Idle.", cls: "sisy-empty-state" });
            const ctaBtn = idle.createEl("button", { text: "[DEPLOY QUEST]", cls: "sisy-btn mod-cta" });
            ctaBtn.style.marginTop = "10px";
            ctaBtn.onclick = () => new QuestModal(this.app, this.plugin).open();
            return;
        }

        const nextBatch = this.currentQuestList.slice(this.renderedCount, this.renderedCount + batchSize);
        for (const file of nextBatch) QuestCardRenderer.render(container, file, this);
        this.renderedCount += nextBatch.length;

        if (this.renderedCount < this.currentQuestList.length) {
            const sentinel = container.createDiv({ cls: "sisy-sentinel" });
            this.observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    this.observer?.disconnect();
                    sentinel.remove();
                    this.renderQuestBatch(container, this.BATCH_SIZE);
                }
            }, { root: container.parentElement, threshold: 0.1 });
            this.observer.observe(sentinel);
        }
    }

    setupAnalyticsStructure(parent: HTMLElement) {
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
    renderAnalyticsCharts(parent: HTMLElement, widthOverride?: number) {
        const lineContainer = parent.querySelector(".sisy-chart-container-line") as HTMLElement;
        const heatContainer = parent.querySelector(".sisy-chart-container-heat") as HTMLElement;
        
        if (lineContainer) {
            lineContainer.empty();
            ChartRenderer.renderLineChart(lineContainer, this.plugin.settings.dayMetrics, widthOverride);
        }
        if (heatContainer) {
            heatContainer.empty();
            ChartRenderer.renderHeatmap(heatContainer, this.plugin.settings.dayMetrics);
        }
    }

    renderAlerts(scroll: HTMLElement) {
        if (this.plugin.settings.activeBuffs.length > 0) {
            const buffBar = scroll.createDiv({ cls: "sisy-alert sisy-alert-buff" });
            buffBar.createEl("h3", { text: "ACTIVE EFFECTS", attr: { style: "color: var(--sisy-purple);" } });
            this.plugin.settings.activeBuffs.forEach(b => {
                const row = buffBar.createDiv({ cls: "sisy-alert-row" });
                row.createSpan({ text: `${b.icon} ${b.name}` });
                row.createSpan({ text: `${moment(b.expiresAt).diff(moment(), 'minutes')}m left`, cls: "sisy-alert-timer" });
            });
        }
        if (this.plugin.settings.gold < 0) {
            const d = scroll.createDiv({ cls: "sisy-alert sisy-alert-debt" });
            d.createEl("h3", { text: "⚠️ DEBT CRISIS" });
            d.createEl("p", { text: `Balance: ${this.plugin.settings.gold}g` });
        }
    }

    renderOracle(scroll: HTMLElement) {
        const oracle = scroll.createDiv({ cls: "sisy-oracle" });
        oracle.createEl("h4", { text: "ORACLE PREDICTION" });
        const survival = Math.floor(this.plugin.settings.hp / Math.max(1, (this.plugin.settings.rivalDmg * (this.plugin.settings.gold < 0 ? 2 : 1))));
        const survEl = oracle.createDiv({ text: `Survival: ${survival} days`, cls: "sisy-prediction" });
        if (survival < 2) survEl.addClass("sisy-prediction-bad");
    }

    renderSkills(scroll: HTMLElement) {
        this.plugin.settings.skills.forEach((s: Skill, idx: number) => {
            const row = scroll.createDiv({ cls: "sisy-skill-row" });
            row.onclick = () => new SkillDetailModal(this.app, this.plugin, idx).open();
            
            const meta = row.createDiv({ cls: "sisy-skill-meta" });
            meta.createSpan({ text: `${s.name} (Lvl ${s.level})` });
            if (s.rust > 0) meta.createSpan({ text: `RUST ${s.rust}`, cls: "sisy-text-rust" });
            
            const bar = row.createDiv({ cls: "sisy-bar-bg" });
            bar.createDiv({ cls: "sisy-bar-fill sisy-fill-blue", attr: { style: `width: ${(s.xp/s.xpReq)*100}%;` } });
        });
        scroll.createDiv({ text: "+ Add Node", cls: "sisy-btn", attr: { style: "width:100%; margin-top:10px;" } }).onclick = () => new SkillManagerModal(this.app, this.plugin).open();
    }

    renderBulkBar(parent: HTMLElement) {
        if (!this.selectMode || this.selectedQuests.size === 0) return;
        const bar = parent.createDiv({ cls: "sisy-bulk-bar" });
        bar.createSpan({ text: `${this.selectedQuests.size} Selected`, attr: { style: "align-self:center; font-weight:bold; color: white;" } });
        
        const btnC = bar.createEl("button", { text: "COMPLETE ALL", cls: "sisy-btn mod-done" });
        btnC.onclick = async () => { for (const f of this.selectedQuests) await this.plugin.engine.completeQuest(f); this.selectedQuests.clear(); this.selectMode = false; this.debouncedRefresh(); };
        
        const btnD = bar.createEl("button", { text: "DELETE ALL", cls: "sisy-btn mod-fail" });
        btnD.onclick = async () => { for (const f of this.selectedQuests) await this.plugin.engine.deleteQuest(f); this.selectedQuests.clear(); this.selectMode = false; this.debouncedRefresh(); };
    }

    renderDailyMissions(parent: HTMLElement) {
        const missions = this.plugin.settings.dailyMissions || [];
        if (missions.length === 0) { parent.createDiv({ text: "No missions.", cls: "sisy-empty-state" }); return; }
        const missionsDiv = parent.createDiv();
        missions.forEach((m: DailyMission) => {
            const card = missionsDiv.createDiv({ cls: "sisy-mission-card" });
            if (m.completed) card.addClass("sisy-mission-completed");
            
            const h = card.createDiv({ cls: "sisy-card-top" });
            h.createEl("span", { text: m.name, cls: "sisy-card-title" });
            h.createEl("span", { text: `${m.progress}/${m.target}`, attr: { style: "font-weight: bold;" } });
            
            card.createDiv({ text: m.desc, attr: { style: "font-size: 0.8em; opacity: 0.7; margin-bottom: 5px;" } });

            const bar = card.createDiv({ cls: "sisy-bar-bg" });
            bar.createDiv({ cls: "sisy-bar-fill sisy-fill-green", attr: { style: `width: ${(m.progress/m.target)*100}%;` } });
        });
    }

    renderChainSection(parent: HTMLElement) {
        const chain = this.plugin.engine.getActiveChain();
        const div = parent.createDiv({ cls: "sisy-chain-container" });
        div.createEl("h3", { text: chain.name, attr: { style: "color: var(--sisy-green);" } });
        const p = this.plugin.engine.getChainProgress();
        const b = div.createDiv({ cls: "sisy-bar-bg" });
        b.createDiv({ cls: "sisy-bar-fill sisy-fill-green", attr: { style: `width:${p.percent}%;` } });
        
        const list = div.createDiv({ attr: { style: "margin: 10px 0; font-size: 0.9em;" } });
        chain.quests.forEach((q, i) => list.createEl("p", { text: `[${i < p.completed ? "OK" : ".."}] ${q}`, attr: { style: i===p.completed ? "font-weight:bold" : "opacity:0.5" } }));
        div.createEl("button", { text: "BREAK CHAIN", cls: "sisy-btn mod-fail", attr: { style: "width:100%; margin-top:10px;" } }).onclick = async () => { await this.plugin.engine.breakChain(); this.debouncedRefresh(); };
    }

    renderResearchSection(parent: HTMLElement) {
        const research = this.plugin.settings.researchQuests || [];
        const active = research.filter(q => !q.completed);
        const stats = this.plugin.engine.getResearchRatio();
        
        const statsDiv = parent.createDiv({ cls: "sisy-research-stats sisy-card" });
        statsDiv.createEl("p", { text: `Research Ratio: ${stats.combat}:${stats.research}` });
        
        if (active.length === 0) parent.createDiv({ text: "No active research.", cls: "sisy-empty-state" });
        else active.forEach((q: any) => {
            const card = parent.createDiv({ cls: "sisy-research-card" });
            const h = card.createDiv({ cls: "sisy-card-top" });
            h.createEl("span", { text: q.title, cls: "sisy-card-title" });
            card.createEl("p", { text: `Words: ${q.wordCount}/${q.wordLimit}` });
            const bar = card.createDiv({ cls: "sisy-bar-bg" });
            bar.createDiv({ cls: "sisy-bar-fill sisy-fill-purple", attr: { style: `width:${Math.min(100, (q.wordCount/q.wordLimit)*100)}%;` } });
            
            const acts = card.createDiv({ cls: "sisy-actions" });
            acts.createEl("button", { text: "COMPLETE", cls: "sisy-btn mod-done sisy-action-btn" }).onclick = () => { this.plugin.engine.completeResearchQuest(q.id, q.wordCount); this.debouncedRefresh(); };
            acts.createEl("button", { text: "DELETE", cls: "sisy-btn mod-fail sisy-action-btn" }).onclick = () => { this.plugin.engine.deleteResearchQuest(q.id); this.debouncedRefresh(); };
        });
    }

    renderFilterBar(parent: HTMLElement) {
        const getFreshState = () => this.plugin.settings.filterState;
        const d = parent.createDiv({ cls: "sisy-filter-bar" });
        
        const addRow = (l: string, opts: string[], curr: string, cb: any) => {
            const r = d.createDiv({ cls: "sisy-filter-row" });
            r.createSpan({ text: l, cls: "sisy-filter-label" });
            opts.forEach(o => {
                const btn = r.createEl("button", { text: o.toUpperCase(), cls: "sisy-filter-btn" });
                if (curr === o) btn.addClass("sisy-filter-active");
                btn.onclick = () => cb(o);
            });
        };

        const f = getFreshState();
        addRow("Energy:", ["any", "high", "medium"], f.activeEnergy, (v:any)=> { 
            const s = getFreshState();
            const newVal = (s.activeEnergy === v && v !== "any") ? "any" : v;
            this.plugin.engine.setFilterState(newVal, s.activeContext, s.activeTags); 
            this.debouncedRefresh(); 
        });
        addRow("Context:", ["any", "home", "office"], f.activeContext, (v:any)=> { 
            const s = getFreshState();
            const newVal = (s.activeContext === v && v !== "any") ? "any" : v;
            this.plugin.engine.setFilterState(s.activeEnergy, newVal, s.activeTags); 
            this.debouncedRefresh(); 
        });
        
        d.createEl("button", { text: "CLEAR", cls: "sisy-btn mod-fail", attr: { style: "width:100%; margin-top:5px;" } }).onclick = () => { this.plugin.engine.clearFilters(); this.debouncedRefresh(); };
    }

    stat(p: HTMLElement, label: string, val: string, cls: string = "") {
        const b = p.createDiv({ cls: "sisy-stat-box" }); 
        if (cls) b.addClass(cls);
        b.createDiv({ text: label, cls: "sisy-stat-label" });
        b.createDiv({ text: val, cls: "sisy-stat-val" });
    }

    showUndoToast(questName: string) {
        const toast = document.createElement("div");
        toast.setAttribute("style", "position:fixed; bottom:20px; right:20px; background:#1e1e1e; padding:12px 20px; border-radius:6px; z-index:9999; border:1px solid var(--sisy-blue); box-shadow: 0 5px 20px rgba(0,0,0,0.5); display:flex; align-items:center; gap:15px;"); 
        toast.innerHTML = `<span>Deleted: <strong>${questName}</strong></span>`;
        
        const btn = document.createElement("button");
        btn.innerText = "UNDO";
        btn.setAttribute("style", "cursor:pointer; color:var(--sisy-blue); background:none; border:none; font-weight:bold; letter-spacing:1px;");
        btn.onclick = async () => { await this.plugin.engine.undoLastDeletion(); toast.remove(); };
        
        toast.appendChild(btn);
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 8000);
    }
}
