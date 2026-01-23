import { TFile, moment } from 'obsidian';
import type { PanopticonView } from './view';

export class QuestCardRenderer {
    static render(parent: HTMLElement, file: TFile, view: PanopticonView) {
        const fm = view.app.metadataCache.getFileCache(file)?.frontmatter;
        const card = parent.createDiv({ cls: "sisy-card" });

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
            
            // === IMPROVED DRAG & DROP ===
            card.setAttribute("draggable", "true");
            
            card.addEventListener("dragstart", (e) => {
                view.draggedFile = file;
                card.style.opacity = "0.4";
                card.style.transform = "scale(0.95)";
                // Set data for compatibility
                e.dataTransfer?.setData("text/plain", file.path);
            });

            card.addEventListener("dragend", () => {
                card.style.opacity = "1";
                card.style.transform = "none";
                view.draggedFile = null;
                // Remove visual guides from all cards
                parent.querySelectorAll(".sisy-card").forEach(el => (el as HTMLElement).style.borderTop = "");
            });

            card.addEventListener("dragover", (e) => { 
                e.preventDefault(); 
                // Visual Cue: Blue line above card
                card.style.borderTop = "3px solid var(--sisy-blue)"; 
            });

            card.addEventListener("dragleave", () => { 
                card.style.borderTop = ""; 
            });
            
            card.addEventListener("drop", async (e) => {
                e.preventDefault();
                card.style.borderTop = "";
                
                if (view.draggedFile && view.draggedFile !== file) {
                   const dragged = view.draggedFile;
                   
                   // Logic: Place 'dragged' BEFORE 'file'
                   const targetFm = view.app.metadataCache.getFileCache(file)?.frontmatter;
                   // Get target order, default to "now" if missing
                   const targetOrder = targetFm?.manual_order !== undefined ? targetFm.manual_order : moment().valueOf();
                   
                   // New order is slightly less than target (puts it above)
                   const newOrder = targetOrder - 100; // Gap of 100 to prevent collisions

                   // Apply change
                   await view.plugin.app.fileManager.processFrontMatter(dragged, (f:any) => { 
                       f.manual_order = newOrder; 
                   });
                   
                   // [FIX] Force engine update to re-sort list immediately
                   view.plugin.engine.trigger("update");
                }
            });
            // =============================

            const top = card.createDiv({ cls: "sisy-card-top" });
            const titleRow = top.createDiv({ cls: "sisy-card-meta" });
            titleRow.createDiv({ text: file.basename, cls: "sisy-card-title" });
            
            if (fm?.deadline) {
                const diff = moment(fm.deadline).diff(moment(), 'minutes');
                const t = top.createDiv({ text: diff < 0 ? "EXPIRED" : `${Math.floor(diff/60)}h ${diff%60}m`, cls: "sisy-timer" });
                if (diff < 60) t.addClass("sisy-timer-late");
            }

            const trash = top.createDiv({ cls: "sisy-btn", text: "X", attr: { style: "padding: 2px 8px; font-size: 0.8em;" } });
            trash.onclick = (e) => { e.stopPropagation(); view.plugin.engine.deleteQuest(file); };

            if (fm?.is_boss && fm?.boss_max_hp) {
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
