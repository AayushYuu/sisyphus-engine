import { ItemView, WorkspaceLeaf, TFile, TFolder, moment, debounce } from 'obsidian';
import SisyphusPlugin from '../main';
import { QuestModal, ShopModal, SkillDetailModal, SkillManagerModal, ScarsModal } from './modals';
import { Skill, DailyMission, Bounty } from '../types';
import { ChartRenderer } from './charts';
import { QuestCardRenderer } from './card';
import { renderEmptyState, showToast } from './effects';
import { SkillTreeRenderer } from './skilltree';
import { RivalEngine } from '../engines/RivalEngine';
import { ProfileModal } from './profile';
import { CommandHubModal } from './commandhub';
import { NotificationEngine } from '../engines/NotificationEngine';
import { BountyEngine } from '../engines/BountyEngine';
import { BossRushEngine } from '../engines/BossRushEngine';
import { DifficultyCalibrator } from '../engines/DifficultyCalibrator';

export const VIEW_TYPE_PANOPTICON = "sisyphus-panopticon";

export class PanopticonView extends ItemView {
    plugin: SisyphusPlugin;
    draggedFile: TFile | null = null;
    selectMode: boolean = false;
    selectedQuests: Set<TFile> = new Set();
    analyticsTab: string = 'overview';

    private observer: IntersectionObserver | null = null;
    private currentQuestList: TFile[] = [];
    private renderedCount: number = 0;
    private readonly BATCH_SIZE = 20;

    private debouncedRefresh = debounce(this.refresh.bind(this), 50, true);
    private boundShowUndoToast = (name: string) => this.showUndoToast(name);

    /** Check if a kernel module is enabled */
    private isModEnabled(id: string): boolean {
        return this.plugin.kernel?.isModuleEnabled(id) ?? false;
    }

    constructor(leaf: WorkspaceLeaf, plugin: SisyphusPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() { return VIEW_TYPE_PANOPTICON; }
    getDisplayText() { return "Sisyphus"; }
    getIcon() { return "skull"; }

    async onOpen() {
        this.refresh();
        this.plugin.engine.on('update', this.debouncedRefresh);
        this.plugin.engine.on('undo:show', this.boundShowUndoToast);
    }

    async onClose() {
        this.plugin.engine.off('update', this.debouncedRefresh);
        this.plugin.engine.off('undo:show', this.boundShowUndoToast);
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
        // Apply theme class
        const theme = this.plugin.settings.theme || 'default';
        if (theme !== 'default') container.addClass(`sisy-theme-${theme}`);

        const scroll = container.createDiv({ cls: "sisy-scroll-area" });
        scroll.style.scrollBehavior = "auto";

        // --- UI CONSTRUCTION ---
        const header = scroll.createDiv({ cls: "sisy-header" });
        header.createEl("h2", { text: "SISYPHUS" });

        const headerActions = header.createDiv({ cls: "sisy-header-actions" });

        // Command Hub button
        const hubBtn = headerActions.createEl("span", { text: "⚡", cls: "sisy-hub-btn" });
        hubBtn.setAttribute('title', 'Command Hub');
        hubBtn.onclick = () => new CommandHubModal(this.app, this.plugin).open();

        // Notification badge
        const unreadCount = NotificationEngine.getUnreadCount(this.plugin.settings);
        const notifBtn = headerActions.createEl("span", { text: "🔔", cls: "sisy-notif-btn" });
        if (unreadCount > 0) {
            const badge = notifBtn.createSpan({ text: String(unreadCount), cls: 'sisy-notif-badge' });
        }
        notifBtn.onclick = () => { this.scrollToSection('notifications'); };

        const soundBtn = headerActions.createEl("span", { text: this.plugin.settings.muted ? "🔇" : "🔊", cls: "sisy-sound-btn" });
        soundBtn.onclick = async () => {
            this.plugin.settings.muted = !this.plugin.settings.muted;
            this.plugin.audio.setMuted(this.plugin.settings.muted);
            await this.plugin.saveSettings();
            this.debouncedRefresh();
        };

        this.renderAlerts(scroll);

        const hud = scroll.createDiv({ cls: "sisy-hud" });
        const weekComp = ChartRenderer.getWeekComparison(this.plugin.settings.dayMetrics);
        if (this.isModEnabled('survival')) {
            this.statWithSparkline(hud, "HEALTH", `${this.plugin.settings.hp}/${this.plugin.settings.maxHp}`, this.plugin.settings.hp < 30 ? "sisy-critical" : "", undefined, undefined);
        }
        if (this.isModEnabled('economy')) {
            const goldComp = weekComp.find(c => c.label === 'Gold');
            this.statWithSparkline(hud, "GOLD", `${this.plugin.settings.gold}`, this.plugin.settings.gold < 0 ? "sisy-val-debt" : "",
                this.getLast7(d => d.goldEarned), goldComp ? { text: goldComp.delta, up: goldComp.up } : undefined, 'var(--sisy-gold)');
        }
        if (this.isModEnabled('progression')) {
            const xpComp = weekComp.find(c => c.label === 'XP');
            this.statWithSparkline(hud, "LEVEL", `${this.plugin.settings.level}`, '',
                this.getLast7(d => d.xpEarned), xpComp ? { text: xpComp.delta, up: xpComp.up } : undefined, 'var(--sisy-blue)');
        }
        if (this.isModEnabled('combat')) {
            const qComp = weekComp.find(c => c.label === 'Quests');
            this.statWithSparkline(hud, "QUESTS", `${this.plugin.settings.questsCompletedToday} today`, '',
                this.getLast7(d => d.questsCompleted), qComp ? { text: qComp.delta, up: qComp.up } : undefined, 'var(--sisy-green)');
        }

        if (this.isModEnabled('survival')) {
            this.renderOracle(scroll);
            this.renderScars(scroll);
        }

        if (this.isModEnabled('productivity')) {
            scroll.createDiv({ text: "TODAYS OBJECTIVES", cls: "sisy-section-title" });
            this.renderDailyMissions(scroll);
        }

        const ctrls = scroll.createDiv({ cls: "sisy-controls" });
        ctrls.createEl("button", { text: "DEPLOY", cls: "sisy-btn mod-cta" }).onclick = () => new QuestModal(this.app, this.plugin).open();
        if (this.isModEnabled('economy')) {
            ctrls.createEl("button", { text: "SHOP", cls: "sisy-btn" }).onclick = () => new ShopModal(this.app, this.plugin).open();
        }
        const focusLabel = this.plugin.pomodoro.isRunning()
            ? `⏱ ${this.plugin.pomodoro.formatTime()}`
            : 'FOCUS';
        ctrls.createEl('button', { text: focusLabel, cls: 'sisy-btn' }).onclick = () => {
            if (this.plugin.pomodoro.isRunning()) this.plugin.pomodoro.pause();
            else this.plugin.pomodoro.start();
            this.debouncedRefresh();
        };

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

        if (this.isModEnabled('productivity')) {
            scroll.createDiv({ text: "FILTER CONTROLS", cls: "sisy-section-title" });
            this.renderFilterBar(scroll);

            if (this.plugin.engine.getActiveChain()) {
                scroll.createDiv({ text: "ACTIVE CHAIN", cls: "sisy-section-title" });
                this.renderChainSection(scroll);
            }

            scroll.createDiv({ text: "RESEARCH LIBRARY", cls: "sisy-section-title" });
            this.renderResearchSection(scroll);
        }

        if (this.isModEnabled('analytics')) {
            scroll.createDiv({ text: "ANALYTICS", cls: "sisy-section-title" });
            const analyticsContainer = scroll.createDiv({ cls: "sisy-analytics" });
            this.renderAnalyticsDashboard(analyticsContainer, weekComp, currentWidth);
        }

        // Trophy shelf
        if (this.isModEnabled('analytics')) {
            const unlocked = (this.plugin.settings.achievements || []).filter(a => a.unlocked);
            if (unlocked.length > 0) {
                scroll.createDiv({ text: `TROPHIES (${unlocked.length})`, cls: 'sisy-section-title' });
                const shelf = scroll.createDiv({ cls: 'sisy-trophy-shelf' });
                const sorted = [...unlocked].sort((a, b) => {
                    const order: Record<string, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };
                    return (order[a.rarity] ?? 4) - (order[b.rarity] ?? 4);
                });
                sorted.slice(0, 8).forEach(ach => {
                    const icons: Record<string, string> = { common: '🏅', rare: '💎', epic: '👑', legendary: '⭐' };
                    const item = shelf.createDiv({ text: `${icons[ach.rarity] || '🏆'} ${ach.name}`, cls: `sisy-trophy-item sisy-trophy-${ach.rarity}` });
                    item.setAttribute('title', ach.description);
                });
            }
        }

        // Rival HUD
        if (this.isModEnabled('combat') && this.plugin.settings.rival?.name) {
            scroll.createDiv({ text: 'RIVAL', cls: 'sisy-section-title' });
            RivalEngine.renderRivalHUD(scroll, this.plugin.settings);
        }

        // Boss Rush
        if (BossRushEngine.isActive(this.plugin.settings)) {
            scroll.createDiv({ text: 'BOSS RUSH', cls: 'sisy-section-title' });
            this.renderBossRush(scroll);
        }

        // Bounty Board
        const activeBounties = BountyEngine.getActiveBounties(this.plugin.settings);
        if (activeBounties.length > 0) {
            scroll.createDiv({ text: `BOUNTY BOARD (${activeBounties.length})`, cls: 'sisy-section-title' });
            this.renderBountyBoard(scroll, activeBounties);
        }

        scroll.createDiv({ text: "ACTIVE THREATS", cls: "sisy-section-title" });
        const questContainer = scroll.createDiv({ cls: "sisy-quest-container" });
        this.renderQuestBatch(questContainer, itemsToRestore);

        if (this.isModEnabled('progression')) {
            scroll.createDiv({ text: "NEURAL HUB", cls: "sisy-section-title" });
            const skillContainer = scroll.createDiv();
            SkillTreeRenderer.render(skillContainer, this.plugin.settings.skills, (idx) => {
                new SkillDetailModal(this.app, this.plugin, idx).open();
            });
            scroll.createDiv({ text: "+ Add Node", cls: "sisy-btn", attr: { style: "width:100%; margin-top:10px;" } }).onclick = () => new SkillManagerModal(this.app, this.plugin).open();

            // Notification Center
            const notifications = NotificationEngine.getRecent(this.plugin.settings, 15);
            if (notifications.length > 0) {
                const unread = NotificationEngine.getUnreadCount(this.plugin.settings);
                scroll.createDiv({ text: `NOTIFICATIONS${unread > 0 ? ` (${unread} new)` : ''}`, cls: 'sisy-section-title', attr: { id: 'sisy-notifications-anchor' } });
                this.renderNotifications(scroll, notifications);
            }

            // Skill Radar moved to Analytics Overview tab
        }

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
            if (newScroll) newScroll.scrollTop = lastScroll;
        }
    }

    prepareQuests() {
        const folder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        this.currentQuestList = [];

        if (folder instanceof TFolder) {
            let files = folder.children.filter(f => f instanceof TFile) as TFile[];

            // Filter with frontmatter awareness
            const fe = this.plugin.engine.filtersEngine;
            files = files.filter(f => {
                const fm = this.app.metadataCache.getFileCache(f)?.frontmatter;
                return fe.questMatchesFilter(f.basename, fm);
            });

            // Sort based on active sort mode
            const sortMode = this.plugin.settings.filterState.sortMode || 'deadline';
            files.sort((a, b) => {
                const fmA = this.app.metadataCache.getFileCache(a)?.frontmatter;
                const fmB = this.app.metadataCache.getFileCache(b)?.frontmatter;

                // Manual order always wins
                const orderA = fmA?.manual_order !== undefined ? fmA.manual_order : 9999999999999;
                const orderB = fmB?.manual_order !== undefined ? fmB.manual_order : 9999999999999;
                if (orderA !== orderB) return orderA - orderB;

                // Boss quests always float up
                if (fmA?.is_boss !== fmB?.is_boss) return (fmB?.is_boss ? 1 : 0) - (fmA?.is_boss ? 1 : 0);

                // Apply sort mode
                switch (sortMode) {
                    case 'easyFirst': {
                        const dA = fmA?.diff ?? 3;
                        const dB = fmB?.diff ?? 3;
                        return dA - dB;
                    }
                    case 'hardFirst': {
                        const dA = fmA?.diff ?? 3;
                        const dB = fmB?.diff ?? 3;
                        return dB - dA;
                    }
                    case 'newest': {
                        return b.stat.ctime - a.stat.ctime;
                    }
                    case 'deadline':
                    default: {
                        const dateA = fmA?.deadline ? moment(fmA.deadline).valueOf() : 9999999999999;
                        const dateB = fmB?.deadline ? moment(fmB.deadline).valueOf() : 9999999999999;
                        return dateA - dateB;
                    }
                }
            });
            this.currentQuestList = files;
        }
    }

    renderQuestBatch(container: HTMLElement, batchSize: number = this.BATCH_SIZE) {
        if (this.currentQuestList.length === 0) {
            renderEmptyState(container, 'quests', '[DEPLOY QUEST]', () => new QuestModal(this.app, this.plugin).open());
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

    renderAnalyticsDashboard(parent: HTMLElement, weekComp: any[], widthOverride?: number) {
        const s = this.plugin.settings;
        const stats = this.plugin.engine.getGameStats();
        const metrics = s.dayMetrics || [];

        // --- Tab bar ---
        const tabBar = parent.createDiv({ cls: 'sisy-analytics-tabs' });
        const tabs = [
            { id: 'overview', label: '📊 Overview' },
            { id: 'activity', label: '📈 Activity' },
            { id: 'insights', label: '💡 Insights' },
        ];

        const tabContent = parent.createDiv({ cls: 'sisy-analytics-content' });

        tabs.forEach(t => {
            const btn = tabBar.createEl('button', { text: t.label, cls: 'sisy-analytics-tab-btn' });
            if (this.analyticsTab === t.id) btn.addClass('sisy-analytics-tab-active');
            btn.onclick = () => {
                this.analyticsTab = t.id;
                this.debouncedRefresh();
            };
        });

        // --- Compute common stats ---
        const totalCompleted = metrics.reduce((s: number, d: any) => s + (d.questsCompleted || 0), 0);
        const totalFailed = metrics.reduce((s: number, d: any) => s + (d.questsFailed || 0), 0);
        const totalAttempted = totalCompleted + totalFailed;
        const successRate = totalAttempted > 0 ? Math.round((totalCompleted / totalAttempted) * 100) : 100;

        // Find best day
        let bestDay = '—';
        let bestCount = 0;
        metrics.forEach((d: any) => {
            if ((d.questsCompleted || 0) > bestCount) {
                bestCount = d.questsCompleted;
                bestDay = d.date;
            }
        });

        // === TAB: OVERVIEW ===
        if (this.analyticsTab === 'overview') {
            // Summary cards (2x2 grid)
            const cards = tabContent.createDiv({ cls: 'sisy-summary-cards' });

            const makeCard = (icon: string, label: string, value: string, sub?: string) => {
                const card = cards.createDiv({ cls: 'sisy-summary-card' });
                card.createDiv({ text: icon, cls: 'sisy-summary-card-icon' });
                card.createDiv({ text: value, cls: 'sisy-summary-card-val' });
                card.createDiv({ text: label, cls: 'sisy-summary-card-label' });
                if (sub) card.createDiv({ text: sub, cls: 'sisy-summary-card-sub' });
            };

            makeCard('📋', "Today's Quests", String(s.questsCompletedToday));
            makeCard('🔥', 'Current Streak', `${stats.currentStreak}d`);
            makeCard('🎯', 'Success Rate', `${successRate}%`, `${totalCompleted}/${totalAttempted}`);
            makeCard('🏆', 'Best Day', bestCount > 0 ? String(bestCount) : '—', bestDay !== '—' ? moment(bestDay).format('MMM D') : '');

            // Week comparison
            tabContent.createDiv({ text: 'This Week vs Last Week', cls: 'sisy-analytics-subtitle' });
            const compGrid = tabContent.createDiv({ cls: 'sisy-week-compare' });
            weekComp.forEach((c: any) => {
                const item = compGrid.createDiv({ cls: 'sisy-week-compare-item' });
                item.createDiv({ text: c.label, cls: 'sisy-week-compare-label' });
                item.createDiv({ text: String(c.thisWeek), cls: 'sisy-week-compare-val' });
                item.createDiv({ text: c.delta, cls: `sisy-stat-delta ${c.up ? 'sisy-stat-delta-up' : 'sisy-stat-delta-down'}` });
            });

            // Skill radar
            if (s.skills.length >= 3) {
                tabContent.createDiv({ text: 'Skill Profile', cls: 'sisy-analytics-subtitle' });
                const radarWrap = tabContent.createDiv({ cls: 'sisy-profile-radar' });
                const sorted = [...s.skills].sort((a: any, b: any) => b.level - a.level);
                ChartRenderer.renderRadar(radarWrap, sorted);
            }
        }

        // === TAB: ACTIVITY ===
        if (this.analyticsTab === 'activity') {
            // GitHub Heatmap
            tabContent.createDiv({ text: 'Contribution Heatmap (365 Days)', cls: 'sisy-analytics-subtitle' });
            const heatContainer = tabContent.createDiv({ cls: 'sisy-chart-container-heat' });
            ChartRenderer.renderGitHubHeatmap(heatContainer, metrics);

            // Time-of-day chart
            tabContent.createDiv({ text: 'Productivity by Hour', cls: 'sisy-analytics-subtitle' });
            const todContainer = tabContent.createDiv();
            ChartRenderer.renderTimeOfDay(todContainer, metrics);

            // 7-day line chart
            tabContent.createDiv({ text: 'Activity (7 Days)', cls: 'sisy-analytics-subtitle' });
            const lineContainer = tabContent.createDiv({ cls: 'sisy-chart-container-line' });
            ChartRenderer.renderLineChart(lineContainer, metrics, widthOverride);
        }

        // === TAB: INSIGHTS ===
        if (this.analyticsTab === 'insights') {
            const insightsGrid = tabContent.createDiv({ cls: 'sisy-insights-grid' });

            // Success ring
            const ringWrap = insightsGrid.createDiv({ cls: 'sisy-insights-ring' });
            ringWrap.createDiv({ text: 'Overall Success', cls: 'sisy-analytics-subtitle' });
            ChartRenderer.renderSuccessRing(ringWrap, successRate, totalAttempted);

            // Difficulty breakdown
            const diffWrap = insightsGrid.createDiv({ cls: 'sisy-insights-diff' });
            diffWrap.createDiv({ text: 'Difficulty Breakdown', cls: 'sisy-analytics-subtitle' });
            ChartRenderer.renderDifficultyBreakdown(diffWrap, s.difficultyStats);

            // Calibration suggestion
            if (s.difficultyStats?.suggestedAdjustment && s.difficultyStats.suggestedAdjustment !== 0) {
                const adj = s.difficultyStats.suggestedAdjustment;
                const msg = adj > 0
                    ? '📈 You\'re crushing it! Consider increasing difficulty.'
                    : '📉 Struggling? Try lowering difficulty a notch.';
                const banner = tabContent.createDiv({ cls: `sisy-calibration-banner sisy-calibration-${adj > 0 ? 'up' : 'down'}` });
                banner.createSpan({ text: msg });
            }

            // Top skills
            tabContent.createDiv({ text: 'Top Skills', cls: 'sisy-analytics-subtitle' });
            const skillList = tabContent.createDiv({ cls: 'sisy-top-skills' });
            const sortedSkills = [...(s.skills || [])].sort((a: any, b: any) => b.level - a.level).slice(0, 5);
            sortedSkills.forEach((sk: any, idx: number) => {
                const row = skillList.createDiv({ cls: 'sisy-top-skill-row' });
                row.createSpan({ text: `#${idx + 1}`, cls: 'sisy-top-skill-rank' });
                row.createSpan({ text: sk.name, cls: 'sisy-top-skill-name' });
                row.createSpan({ text: `Lv.${sk.level}`, cls: 'sisy-top-skill-level' });
                const xpBar = row.createDiv({ cls: 'sisy-top-skill-bar' });
                const pct = sk.xpReq > 0 ? Math.min(100, (sk.xp / sk.xpReq) * 100) : 0;
                xpBar.createDiv({ cls: 'sisy-top-skill-fill', attr: { style: `width:${pct}%` } });
            });
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

    renderScars(scroll: HTMLElement) {
        const scars = this.plugin.settings.scars || [];
        if (scars.length === 0) return;
        const div = scroll.createDiv({ cls: "sisy-scars" });
        div.createEl("h4", { text: "🧬 SCARS" });
        const recent = scars.slice(-3).reverse();
        recent.forEach((s: { label: string; value: string | number }) => {
            div.createEl("p", { text: `${s.label}: ${s.value}`, attr: { style: "font-size: 0.9em; opacity: 0.85;" } });
        });
        const btn = div.createEl("button", { text: "View all", cls: "sisy-btn" });
        btn.style.marginTop = "6px";
        btn.onclick = () => new ScarsModal(this.app, this.plugin).open();
    }

    renderSkills(scroll: HTMLElement) {
        this.plugin.settings.skills.forEach((s: Skill, idx: number) => {
            const row = scroll.createDiv({ cls: "sisy-skill-row" });
            row.onclick = () => new SkillDetailModal(this.app, this.plugin, idx).open();

            const meta = row.createDiv({ cls: "sisy-skill-meta" });
            meta.createSpan({ text: `${s.name} (Lvl ${s.level})` });
            if (s.rust > 0) meta.createSpan({ text: `RUST ${s.rust}`, cls: "sisy-text-rust" });

            const bar = row.createDiv({ cls: "sisy-bar-bg" });
            const pct = s.xpReq > 0 ? (s.xp / s.xpReq) * 100 : 0;
            bar.createDiv({ cls: "sisy-bar-fill sisy-fill-blue", attr: { style: `width: ${pct}%;` } });
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
        if (missions.length === 0) { renderEmptyState(parent, 'missions'); return; }
        const missionsDiv = parent.createDiv();
        missions.forEach((m: DailyMission) => {
            const card = missionsDiv.createDiv({ cls: "sisy-mission-card" });
            if (m.completed) card.addClass("sisy-mission-completed");

            const h = card.createDiv({ cls: "sisy-card-top" });
            h.createEl("span", { text: m.name, cls: "sisy-card-title" });
            h.createEl("span", { text: `${m.progress}/${m.target}`, attr: { style: "font-weight: bold;" } });

            card.createDiv({ text: m.desc, attr: { style: "font-size: 0.8em; opacity: 0.7; margin-bottom: 5px;" } });

            const bar = card.createDiv({ cls: "sisy-bar-bg" });
            const pct = m.target > 0 ? (m.progress / m.target) * 100 : 0;
            bar.createDiv({ cls: "sisy-bar-fill sisy-fill-green", attr: { style: `width: ${pct}%;` } });
        });
    }

    renderChainSection(parent: HTMLElement) {
        const chain = this.plugin.engine.getActiveChain();
        if (!chain) return;
        const div = parent.createDiv({ cls: "sisy-chain-container" });
        div.createEl("h3", { text: chain.name, attr: { style: "color: var(--sisy-green);" } });
        const p = this.plugin.engine.getChainProgress();
        const b = div.createDiv({ cls: "sisy-bar-bg" });
        b.createDiv({ cls: "sisy-bar-fill sisy-fill-green", attr: { style: `width:${p.percent}%;` } });

        const list = div.createDiv({ attr: { style: "margin: 10px 0; font-size: 0.9em;" } });
        chain.quests.forEach((q, i) => list.createEl("p", { text: `[${i < p.completed ? "OK" : ".."}] ${q}`, attr: { style: i === p.completed ? "font-weight:bold" : "opacity:0.5" } }));
        div.createEl("button", { text: "BREAK CHAIN", cls: "sisy-btn mod-fail", attr: { style: "width:100%; margin-top:10px;" } }).onclick = async () => { await this.plugin.engine.breakChain(); this.debouncedRefresh(); };
    }

    renderResearchSection(parent: HTMLElement) {
        const research = this.plugin.settings.researchQuests || [];
        const active = research.filter(q => !q.completed);
        const stats = this.plugin.engine.getResearchRatio();

        const statsDiv = parent.createDiv({ cls: "sisy-research-stats sisy-card" });
        statsDiv.createEl("p", { text: `Research Ratio: ${stats.combat}:${stats.research}` });

        if (active.length === 0) renderEmptyState(parent, 'research');
        else active.forEach((q: any) => {
            const card = parent.createDiv({ cls: "sisy-research-card" });
            const h = card.createDiv({ cls: "sisy-card-top" });
            h.createEl("span", { text: q.title, cls: "sisy-card-title" });
            card.createEl("p", { text: `Words: ${q.wordCount}/${q.wordLimit}` });
            const bar = card.createDiv({ cls: "sisy-bar-bg" });
            const wpct = q.wordLimit > 0 ? Math.min(100, (q.wordCount / q.wordLimit) * 100) : 0;
            bar.createDiv({ cls: "sisy-bar-fill sisy-fill-purple", attr: { style: `width:${wpct}%;` } });

            const acts = card.createDiv({ cls: "sisy-actions" });
            acts.createEl("button", { text: "COMPLETE", cls: "sisy-btn mod-done sisy-action-btn" }).onclick = () => { this.plugin.engine.completeResearchQuest(q.id, q.wordCount); this.debouncedRefresh(); };
            acts.createEl("button", { text: "DELETE", cls: "sisy-btn mod-fail sisy-action-btn" }).onclick = async () => { await this.plugin.engine.deleteResearchQuest(q.id); this.debouncedRefresh(); };
        });
    }

    renderFilterBar(parent: HTMLElement) {
        const fe = this.plugin.engine.filtersEngine;
        const f = this.plugin.settings.filterState;
        const activeCount = fe.getActiveFilterCount();

        // Count total and filtered quests for summary
        const folder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        let totalQuests = 0;
        if (folder instanceof TFolder) {
            totalQuests = folder.children.filter(c => c instanceof TFile).length;
        }
        const shownQuests = this.currentQuestList.length;

        const panel = parent.createDiv({ cls: 'sisy-filter-panel' });

        // --- Header row (always visible) ---
        const header = panel.createDiv({ cls: 'sisy-filter-header' });
        const headerLeft = header.createDiv({ cls: 'sisy-filter-header-left' });
        headerLeft.createSpan({ text: '⚙', cls: 'sisy-filter-icon' });
        headerLeft.createSpan({ text: 'FILTERS', cls: 'sisy-filter-title' });
        if (activeCount > 0) {
            headerLeft.createSpan({ text: String(activeCount), cls: 'sisy-filter-badge' });
        }
        const headerRight = header.createDiv({ cls: 'sisy-filter-header-right' });
        headerRight.createSpan({ text: `${shownQuests}/${totalQuests}`, cls: 'sisy-filter-count' });
        const toggleIcon = headerRight.createSpan({ text: '▼', cls: 'sisy-filter-toggle' });

        // --- Collapsible body ---
        const body = panel.createDiv({ cls: 'sisy-filter-body' });
        if (activeCount === 0) {
            body.addClass('sisy-filter-collapsed');
            toggleIcon.textContent = '▶';
        }

        header.onclick = () => {
            body.classList.toggle('sisy-filter-collapsed');
            toggleIcon.textContent = body.classList.contains('sisy-filter-collapsed') ? '▶' : '▼';
        };

        // --- Helper: pill row ---
        const addPillRow = (label: string, options: { value: string; label: string }[], current: string, onToggle: (v: string) => void) => {
            const row = body.createDiv({ cls: 'sisy-filter-row' });
            row.createSpan({ text: label, cls: 'sisy-filter-label' });
            const pills = row.createDiv({ cls: 'sisy-filter-pills' });
            options.forEach(o => {
                const pill = pills.createEl('button', { text: o.label, cls: 'sisy-filter-pill' });
                if (current === o.value) pill.addClass('sisy-filter-pill-active');
                pill.onclick = (e) => { e.stopPropagation(); onToggle(o.value); };
            });
        };

        // --- Energy pills ---
        addPillRow('Energy', [
            { value: 'high', label: '⚡ High' },
            { value: 'medium', label: '🔋 Med' },
            { value: 'low', label: '🪫 Low' },
        ], f.activeEnergy, (v) => {
            fe.toggleEnergyFilter(v as any);
            this.plugin.engine.save();
            this.debouncedRefresh();
        });

        // --- Context pills ---
        addPillRow('Context', [
            { value: 'home', label: '🏠 Home' },
            { value: 'office', label: '💼 Office' },
            { value: 'anywhere', label: '🌍 Any' },
        ], f.activeContext, (v) => {
            fe.toggleContextFilter(v as any);
            this.plugin.engine.save();
            this.debouncedRefresh();
        });

        // --- Difficulty stars ---
        const diffRow = body.createDiv({ cls: 'sisy-filter-row' });
        diffRow.createSpan({ text: 'Difficulty', cls: 'sisy-filter-label' });
        const diffPills = diffRow.createDiv({ cls: 'sisy-filter-pills' });
        for (let i = 1; i <= 5; i++) {
            const star = diffPills.createEl('button', { text: '★'.repeat(i), cls: 'sisy-filter-pill sisy-filter-star' });
            if (f.activeDifficulty === i) star.addClass('sisy-filter-pill-active');
            star.onclick = (e) => {
                e.stopPropagation();
                fe.toggleDifficultyFilter(i);
                this.plugin.engine.save();
                this.debouncedRefresh();
            };
        }

        // --- Skill dropdown ---
        const skillRow = body.createDiv({ cls: 'sisy-filter-row' });
        skillRow.createSpan({ text: 'Skill', cls: 'sisy-filter-label' });
        const skillSelect = skillRow.createEl('select', { cls: 'sisy-filter-select' });
        const skillOpt0 = skillSelect.createEl('option', { text: 'All Skills' });
        skillOpt0.value = 'any';
        const skillNames = this.plugin.settings.skills.map((s: any) => s.name).sort();
        skillNames.forEach((name: string) => {
            const opt = skillSelect.createEl('option', { text: name });
            opt.value = name;
        });
        skillSelect.value = String(f.activeSkill);
        skillSelect.onchange = () => {
            fe.toggleSkillFilter(skillSelect.value);
            this.plugin.engine.save();
            this.debouncedRefresh();
        };

        // --- Sort dropdown ---
        const sortRow = body.createDiv({ cls: 'sisy-filter-row' });
        sortRow.createSpan({ text: 'Sort', cls: 'sisy-filter-label' });
        const sortSelect = sortRow.createEl('select', { cls: 'sisy-filter-select' });
        const sortOpts: { value: string; label: string }[] = [
            { value: 'deadline', label: '⏰ Urgent First' },
            { value: 'easyFirst', label: '🟢 Easy First' },
            { value: 'hardFirst', label: '🔴 Hard First' },
            { value: 'newest', label: '🆕 Newest First' },
        ];
        sortOpts.forEach(o => {
            const opt = sortSelect.createEl('option', { text: o.label });
            opt.value = o.value;
        });
        sortSelect.value = f.sortMode || 'deadline';
        sortSelect.onchange = () => {
            fe.setSortMode(sortSelect.value as any);
            this.plugin.engine.save();
            this.debouncedRefresh();
        };

        // --- Tag chips ---
        const availableTags = fe.getAvailableTags();
        if (availableTags.length > 0) {
            const tagRow = body.createDiv({ cls: 'sisy-filter-row sisy-filter-tag-row' });
            tagRow.createSpan({ text: 'Tags', cls: 'sisy-filter-label' });
            const tagWrap = tagRow.createDiv({ cls: 'sisy-filter-chips' });
            availableTags.forEach(tag => {
                const chip = tagWrap.createEl('button', { text: `#${tag}`, cls: 'sisy-filter-chip' });
                if (f.activeTags.includes(tag)) chip.addClass('sisy-filter-chip-active');
                chip.onclick = (e) => {
                    e.stopPropagation();
                    fe.toggleTag(tag);
                    this.plugin.engine.save();
                    this.debouncedRefresh();
                };
            });
        }

        // --- Clear all ---
        if (activeCount > 0) {
            const clearBtn = body.createEl('button', { text: `✕ CLEAR ALL (${activeCount})`, cls: 'sisy-filter-clear' });
            clearBtn.onclick = (e) => {
                e.stopPropagation();
                this.plugin.engine.clearFilters();
                this.debouncedRefresh();
            };
        }
    }

    stat(p: HTMLElement, label: string, val: string, cls: string = "") {
        const b = p.createDiv({ cls: "sisy-stat-box" });
        if (cls) b.addClass(cls);
        b.createDiv({ text: label, cls: "sisy-stat-label" });
        b.createDiv({ text: val, cls: "sisy-stat-val" });
    }

    /** Stat box with optional sparkline and week-over-week delta */
    statWithSparkline(p: HTMLElement, label: string, val: string, cls: string = '',
        sparkData?: number[], delta?: { text: string; up: boolean }, sparkColor?: string) {
        const b = p.createDiv({ cls: 'sisy-stat-box' });
        if (cls) b.addClass(cls);
        b.createDiv({ text: label, cls: 'sisy-stat-label' });
        b.createDiv({ text: val, cls: 'sisy-stat-val' });
        if (delta) {
            b.createDiv({ text: delta.text, cls: `sisy-stat-delta ${delta.up ? 'sisy-stat-delta-up' : 'sisy-stat-delta-down'}` });
        }
        if (sparkData && sparkData.length > 1) {
            const sparkWrap = b.createDiv({ cls: 'sisy-stat-sparkline' });
            ChartRenderer.renderSparkline(sparkWrap, sparkData, sparkColor || 'var(--sisy-blue)');
        }
    }

    /** Get last 7 days of a metric */
    getLast7(accessor: (d: any) => number): number[] {
        const result: number[] = [];
        for (let i = 6; i >= 0; i--) {
            const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
            const m = this.plugin.settings.dayMetrics.find((x: any) => x.date === date);
            result.push(m ? accessor(m) : 0);
        }
        return result;
    }

    showUndoToast(questName: string) {
        showToast({
            icon: '🗑️',
            title: `Deleted: ${questName}`,
            variant: 'fail',
            duration: 8000,
            action: {
                label: 'UNDO',
                callback: () => this.plugin.engine.undoLastDeletion()
            }
        });
    }

    scrollToSection(sectionId: string) {
        const container = this.containerEl.querySelector('.sisy-scroll-area');
        const anchor = this.containerEl.querySelector(`#sisy-${sectionId}-anchor`);
        if (container && anchor) {
            anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    renderBossRush(parent: HTMLElement) {
        const progress = BossRushEngine.getProgress(this.plugin.settings);
        const rushBox = parent.createDiv({ cls: 'sisy-boss-rush-panel' });

        const header = rushBox.createDiv({ cls: 'sisy-rush-header' });
        header.createSpan({ text: `⚔️ QUEST ${progress.current + 1}/${progress.total}` });

        const bar = rushBox.createDiv({ cls: 'sisy-bar-bg' });
        const pct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
        bar.createDiv({ cls: 'sisy-bar-fill sisy-fill-red', attr: { style: `width: ${pct}%;` } });

        const queue = rushBox.createDiv({ cls: 'sisy-rush-queue' });
        progress.queueNames.forEach((name, i) => {
            const item = queue.createDiv({ cls: 'sisy-rush-item' });
            const status = i < progress.current ? '✅' : i === progress.current ? '⚔️' : '⬜';
            item.createSpan({ text: `${status} ${name}` });
            if (i === progress.current) item.addClass('sisy-rush-active');
            else if (i < progress.current) item.addClass('sisy-rush-done');
        });

        const abortBtn = rushBox.createEl('button', { text: '💀 ABORT RUSH', cls: 'sisy-btn mod-fail', attr: { style: 'width:100%; margin-top:8px;' } });
        abortBtn.onclick = async () => {
            BossRushEngine.failRush(this.plugin.settings);
            await this.plugin.saveSettings();
            this.debouncedRefresh();
        };
    }

    renderBountyBoard(parent: HTMLElement, bounties: Bounty[]) {
        bounties.forEach(bounty => {
            const card = parent.createDiv({ cls: 'sisy-bounty-card' });

            const top = card.createDiv({ cls: 'sisy-card-top' });
            top.createSpan({ text: `🎯 ${bounty.name}`, cls: 'sisy-card-title' });
            top.createSpan({ text: `${bounty.reward.multiplier}x`, cls: 'sisy-bounty-mult' });

            card.createDiv({ text: bounty.description, cls: 'sisy-bounty-desc' });
            card.createDiv({ text: bounty.reason, cls: 'sisy-bounty-reason' });

            const rewards = card.createDiv({ cls: 'sisy-card-detail' });
            rewards.createSpan({ text: `⭐ ${bounty.reward.xp} XP`, cls: 'sisy-card-reward sisy-reward-xp' });
            rewards.createSpan({ text: `💰 ${bounty.reward.gold} G`, cls: 'sisy-card-reward sisy-reward-gold' });
            if (bounty.targetSkill) {
                rewards.createSpan({ text: `🎯 ${bounty.targetSkill}`, cls: 'sisy-tag' });
            }

            const actions = card.createDiv({ cls: 'sisy-actions' });
            const acceptBtn = actions.createEl('button', { text: '✅ Accept', cls: 'sisy-btn mod-done sisy-action-btn' });
            acceptBtn.onclick = async () => {
                BountyEngine.acceptBounty(this.plugin.settings, bounty.id);
                await this.plugin.saveSettings();
                this.debouncedRefresh();
            };

            const dismissBtn = actions.createEl('button', { text: '❌ Dismiss', cls: 'sisy-btn mod-fail sisy-action-btn' });
            dismissBtn.onclick = async () => {
                BountyEngine.dismissBounty(this.plugin.settings, bounty.id);
                await this.plugin.saveSettings();
                this.debouncedRefresh();
            };
        });
    }

    renderNotifications(parent: HTMLElement, notifications: import('../types').GameNotification[]) {
        const feed = parent.createDiv({ cls: 'sisy-notification-feed' });

        const toolbar = feed.createDiv({ cls: 'sisy-notif-toolbar' });
        const markReadBtn = toolbar.createEl('button', { text: '✓ Mark all read', cls: 'sisy-btn' });
        markReadBtn.style.fontSize = '0.75em';
        markReadBtn.onclick = async () => {
            NotificationEngine.markAllRead(this.plugin.settings);
            await this.plugin.saveSettings();
            this.debouncedRefresh();
        };
        const clearBtn = toolbar.createEl('button', { text: '🗑️ Clear', cls: 'sisy-btn' });
        clearBtn.style.fontSize = '0.75em';
        clearBtn.onclick = async () => {
            NotificationEngine.clear(this.plugin.settings);
            await this.plugin.saveSettings();
            this.debouncedRefresh();
        };

        notifications.forEach(n => {
            const item = feed.createDiv({ cls: `sisy-notif-item ${n.read ? '' : 'sisy-notif-unread'}` });
            item.createSpan({ text: n.icon, cls: 'sisy-notif-icon' });

            const content = item.createDiv({ cls: 'sisy-notif-content' });
            content.createDiv({ text: n.title, cls: 'sisy-notif-title' });
            content.createDiv({ text: n.message, cls: 'sisy-notif-message' });

            const ago = this.timeAgo(n.timestamp);
            item.createSpan({ text: ago, cls: 'sisy-notif-time' });
        });
    }

    private timeAgo(timestamp: string): string {
        const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }
}
