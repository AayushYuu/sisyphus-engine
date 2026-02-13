import { TFile, moment } from 'obsidian';
import type { PanopticonView } from './view';

const DIFF_COLORS: Record<string, string> = {
    'trivial': 'var(--sisy-green)',
    'easy': '#4caf50',
    'medium': 'var(--sisy-gold)',
    'hard': '#ff6b35',
    'legendary': 'var(--sisy-purple)',
};

const PRIORITY_BADGES: Record<string, { text: string; cls: string }> = {
    'critical': { text: '🔴 CRITICAL', cls: 'sisy-priority-critical' },
    'high': { text: '🟡 HIGH', cls: 'sisy-priority-high' },
    'normal': { text: '', cls: '' },
    'low': { text: '⚪ LOW', cls: 'sisy-priority-low' },
};

const SKILL_ICONS: Record<string, string> = {
    'Coding': '💻', 'Writing': '✍️', 'Research': '🔬', 'Design': '🎨',
    'Math': '📐', 'Reading': '📚', 'Fitness': '💪', 'Music': '🎵',
    'Language': '🌐', 'Boss': '☠️', 'None': '⚡',
};

export class QuestCardRenderer {
    static render(parent: HTMLElement, file: TFile, view: PanopticonView) {
        const fm = view.app.metadataCache.getFileCache(file)?.frontmatter;
        const card = parent.createDiv({ cls: "sisy-card" });

        // Difficulty color band (left border)
        const diffLabel = (fm?.difficulty || 'medium').toLowerCase();
        const diffColor = DIFF_COLORS[diffLabel] || DIFF_COLORS.medium;
        card.style.borderLeft = `3px solid ${diffColor}`;

        if (view.selectMode) {
            const isSelected = view.selectedQuests.has(file);
            if (isSelected) card.style.borderColor = "var(--sisy-blue)";

            const top = card.createDiv({ cls: "sisy-card-top" });
            const cb = top.createEl("input", { type: "checkbox" });
            cb.checked = isSelected;
            cb.style.marginRight = "10px";
            top.createDiv({ text: file.basename, cls: "sisy-card-title" });

            card.onclick = () => {
                if (view.selectedQuests.has(file)) view.selectedQuests.delete(file);
                else view.selectedQuests.add(file);
                view.refresh();
            };
        } else {
            if (fm?.is_boss) card.addClass("sisy-card-boss");

            // === DRAG & DROP ===
            card.setAttribute("draggable", "true");
            card.addEventListener("dragstart", (e) => {
                view.draggedFile = file;
                card.style.opacity = "0.4";
                card.style.transform = "scale(0.95)";
                e.dataTransfer?.setData("text/plain", file.path);
            });
            card.addEventListener("dragend", () => {
                card.style.opacity = "1";
                card.style.transform = "none";
                view.draggedFile = null;
                parent.querySelectorAll(".sisy-card").forEach(el => (el as HTMLElement).style.borderTop = "");
            });
            card.addEventListener("dragover", (e) => {
                e.preventDefault();
                card.style.borderTop = "3px solid var(--sisy-blue)";
            });
            card.addEventListener("dragleave", () => { card.style.borderTop = ""; });
            card.addEventListener("drop", async (e) => {
                e.preventDefault();
                card.style.borderTop = "";
                if (view.draggedFile && view.draggedFile !== file) {
                    const dragged = view.draggedFile;
                    const targetFm = view.app.metadataCache.getFileCache(file)?.frontmatter;
                    const targetOrder = targetFm?.manual_order !== undefined ? targetFm.manual_order : moment().valueOf();
                    const newOrder = targetOrder - 100;
                    await view.plugin.app.fileManager.processFrontMatter(dragged, (f: any) => {
                        f.manual_order = newOrder;
                    });
                    view.plugin.engine.trigger("update");
                }
            });

            // --- TOP ROW ---
            const top = card.createDiv({ cls: "sisy-card-top" });
            const titleRow = top.createDiv({ cls: "sisy-card-meta" });

            // Skill icon
            const skill = fm?.skill || 'None';
            const icon = SKILL_ICONS[skill] || '⚡';
            titleRow.createSpan({ text: icon, cls: 'sisy-card-skill-icon', attr: { title: skill } });

            titleRow.createDiv({ text: file.basename, cls: "sisy-card-title" });

            // Priority badge
            const priority = (fm?.priority || 'normal').toLowerCase();
            const prBadge = PRIORITY_BADGES[priority];
            if (prBadge && prBadge.text) {
                titleRow.createDiv({ text: prBadge.text, cls: `sisy-tag ${prBadge.cls}` });
            }

            // Recurring badge
            if (fm?.recurring) {
                titleRow.createDiv({ text: "🔄 RECURRING", cls: "sisy-recurring-badge" });
            }

            // Dependency lock
            let isLocked = false;
            if (fm?.depends_on) {
                const depFile = view.app.vault.getAbstractFileByPath(`Active_Run/Quests/${fm.depends_on}.md`);
                if (depFile) {
                    isLocked = true;
                    titleRow.createDiv({ text: "🔒", cls: "sisy-tag", attr: { title: `Requires: ${fm.depends_on}` } });
                }
            }

            // Deadline timer
            if (fm?.deadline) {
                const diff = moment(fm.deadline).diff(moment(), 'minutes');
                const t = top.createDiv({
                    text: diff < 0 ? "EXPIRED" : `${Math.floor(diff / 60)}h ${diff % 60}m`,
                    cls: "sisy-timer"
                });
                if (diff < 60) t.addClass("sisy-timer-late");
            }

            // Delete button
            const trash = top.createDiv({ cls: "sisy-btn", text: "X", attr: { style: "padding: 2px 8px; font-size: 0.8em;" } });
            trash.onclick = (e) => { e.stopPropagation(); view.plugin.engine.deleteQuest(file); };

            // --- DETAIL ROW: XP + Gold preview + Difficulty badge ---
            const detail = card.createDiv({ cls: 'sisy-card-detail' });

            const diffBadge = detail.createDiv({ cls: `sisy-diff-badge sisy-diff-${diffLabel}` });
            diffBadge.textContent = diffLabel.toUpperCase();

            if (fm?.xp_reward) {
                detail.createSpan({ text: `⚡${fm.xp_reward}`, cls: 'sisy-card-reward sisy-reward-xp' });
            }
            if (fm?.gold_reward && fm.gold_reward > 0) {
                detail.createSpan({ text: `💰${fm.gold_reward}`, cls: 'sisy-card-reward sisy-reward-gold' });
            }
            if (fm?.high_stakes) {
                detail.createSpan({ text: '🎲 HIGH STAKES', cls: 'sisy-tag sisy-tag-stakes' });
            }

            // --- BOSS HP BAR ---
            if (fm?.is_boss && fm?.boss_max_hp) {
                const bar = card.createDiv({ cls: "sisy-bar-bg" });
                const pct = ((fm.boss_hp ?? 0) / fm.boss_max_hp) * 100;
                bar.createDiv({ cls: "sisy-bar-fill sisy-fill-red", attr: { style: `width:${pct}%;` } });
                card.createDiv({
                    text: `${fm.boss_hp}/${fm.boss_max_hp} HP`,
                    attr: { style: "text-align:center; font-size:0.8em; color:var(--sisy-red); font-weight:bold;" }
                });
            }

            // --- PROGRESS BAR (multi-step quests) ---
            if (fm?.steps_total && fm.steps_total > 0) {
                const done = fm.steps_done || 0;
                const progRow = card.createDiv({ cls: 'sisy-card-progress' });
                const progBar = progRow.createDiv({ cls: 'sisy-bar-bg' });
                progBar.createDiv({ cls: 'sisy-bar-fill sisy-fill-blue', attr: { style: `width:${(done / fm.steps_total) * 100}%` } });
                progRow.createSpan({ text: `${done}/${fm.steps_total} steps`, cls: 'sisy-card-steps' });
            }

            // --- ACTION BUTTONS ---
            const acts = card.createDiv({ cls: "sisy-actions" });
            const bOk = acts.createEl("button", {
                text: isLocked ? "🔒 LOCKED" : "✓ COMPLETE",
                cls: `sisy-btn ${isLocked ? '' : 'mod-done'} sisy-action-btn`
            });
            if (isLocked) {
                bOk.style.opacity = '0.4';
                bOk.style.cursor = 'not-allowed';
            } else {
                bOk.onclick = (e) => {
                    e.stopPropagation();
                    // Confetti animation
                    card.classList.add('sisy-card-complete-anim');
                    setTimeout(() => view.plugin.engine.completeQuest(file), 300);
                };
            }

            const bFail = acts.createEl("button", { text: "✗ FAIL", cls: "sisy-btn mod-fail sisy-action-btn" });
            bFail.onclick = (e) => {
                e.stopPropagation();
                // Shake animation
                card.classList.add('sisy-card-fail-anim');
                setTimeout(() => view.plugin.engine.failQuest(file, true), 400);
            };
        }
    }
}
