/**
 * SkillTreeRenderer — SVG-based skill grid with connections and XP bars.
 */
import { Skill } from '../types';

export class SkillTreeRenderer {

    static render(parent: HTMLElement, skills: Skill[], onClickSkill: (idx: number) => void) {
        if (skills.length === 0) {
            parent.createDiv({ text: 'No skills unlocked yet.', cls: 'sisy-empty-state' });
            return;
        }

        const grid = parent.createDiv({ cls: 'sisy-skill-tree' });

        skills.forEach((skill, idx) => {
            const node = grid.createDiv({ cls: 'sisy-skill-node' });
            node.onclick = () => onClickSkill(idx);

            // Level-based glow
            if (skill.level >= 10) node.addClass('sisy-skill-node-master');
            else if (skill.level >= 5) node.addClass('sisy-skill-node-adept');

            // Top: Icon + Name
            const header = node.createDiv({ cls: 'sisy-skill-node-header' });
            const iconMap: Record<string, string> = {
                'Coding': '💻', 'Writing': '✍️', 'Research': '🔬', 'Design': '🎨',
                'Math': '📐', 'Reading': '📚', 'Fitness': '💪', 'Music': '🎵',
                'Language': '🌐', 'Boss': '☠️', 'None': '⚡'
            };
            const icon = iconMap[skill.name] || '⚡';
            header.createSpan({ text: icon, cls: 'sisy-skill-icon' });
            header.createSpan({ text: skill.name, cls: 'sisy-skill-name' });

            // Level badge
            const badge = node.createDiv({ cls: 'sisy-skill-level-badge' });
            badge.textContent = `L${skill.level}`;
            if (skill.level >= 10) badge.addClass('sisy-level-master');
            else if (skill.level >= 5) badge.addClass('sisy-level-adept');

            // XP Progress bar
            const barWrap = node.createDiv({ cls: 'sisy-skill-bar-wrap' });
            const bar = barWrap.createDiv({ cls: 'sisy-bar-bg' });
            const pct = skill.xpReq > 0 ? Math.min((skill.xp / skill.xpReq) * 100, 100) : 0;
            const fill = bar.createDiv({ cls: 'sisy-bar-fill sisy-fill-blue' });
            fill.style.width = `${pct}%`;
            barWrap.createDiv({ text: `${skill.xp}/${skill.xpReq} XP`, cls: 'sisy-skill-xp-label' });

            // Rust indicator
            if (skill.rust > 0) {
                const rust = node.createDiv({ cls: 'sisy-skill-rust' });
                rust.textContent = `⚠️ RUST ${skill.rust}`;
            }

            // Connections indicator
            if (skill.connections && skill.connections.length > 0) {
                const conn = node.createDiv({ cls: 'sisy-skill-connections' });
                conn.textContent = `🔗 ${skill.connections.join(', ')}`;
            }
        });

        // Draw connection lines between linked skills via SVG overlay
        SkillTreeRenderer.drawConnections(grid, skills);
    }

    private static drawConnections(grid: HTMLElement, skills: Skill[]) {
        // Defer connection drawing until layout is complete
        requestAnimationFrame(() => {
            const nodes = grid.querySelectorAll('.sisy-skill-node');
            if (nodes.length < 2) return;

            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.classList.add('sisy-skill-connections-svg');
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.pointerEvents = 'none';
            grid.style.position = 'relative';
            grid.insertBefore(svg, grid.firstChild);

            const gridRect = grid.getBoundingClientRect();

            skills.forEach((skill, i) => {
                if (!skill.connections) return;
                skill.connections.forEach(connName => {
                    const j = skills.findIndex(s => s.name === connName);
                    if (j < 0 || j <= i) return; // Avoid duplicates

                    const nodeA = nodes[i] as HTMLElement;
                    const nodeB = nodes[j] as HTMLElement;
                    if (!nodeA || !nodeB) return;

                    const rectA = nodeA.getBoundingClientRect();
                    const rectB = nodeB.getBoundingClientRect();

                    const x1 = rectA.left + rectA.width / 2 - gridRect.left;
                    const y1 = rectA.top + rectA.height / 2 - gridRect.top;
                    const x2 = rectB.left + rectB.width / 2 - gridRect.left;
                    const y2 = rectB.top + rectB.height / 2 - gridRect.top;

                    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    line.setAttribute("x1", String(x1));
                    line.setAttribute("y1", String(y1));
                    line.setAttribute("x2", String(x2));
                    line.setAttribute("y2", String(y2));
                    line.setAttribute("stroke", "var(--sisy-blue)");
                    line.setAttribute("stroke-width", "1");
                    line.setAttribute("stroke-opacity", "0.3");
                    line.setAttribute("stroke-dasharray", "4,4");
                    svg.appendChild(line);
                });
            });
        });
    }
}
