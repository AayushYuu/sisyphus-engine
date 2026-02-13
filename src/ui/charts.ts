/**
 * Sisyphus Charts v2.0 — GitHub heatmap, sparklines, skill radar, time-of-day chart
 */
import { moment } from 'obsidian';
import { DayMetrics, Skill } from '../types';

export class ChartRenderer {

    /* ============================================================
     * 1. GITHUB-STYLE 365-DAY CONTRIBUTION HEATMAP
     * ============================================================ */
    static renderGitHubHeatmap(parent: HTMLElement, metrics: DayMetrics[]) {
        const CELL = 11, GAP = 2, WEEKS = 52, DAYS = 7;
        const W = (CELL + GAP) * WEEKS + 30; // +30 for day labels
        const H = (CELL + GAP) * DAYS + 20; // +20 for month labels

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
        svg.setAttribute("width", "100%");
        svg.classList.add("sisy-github-heatmap");
        parent.appendChild(svg);

        // Build lookup map
        const lookup = new Map<string, number>();
        metrics.forEach(m => lookup.set(m.date, m.questsCompleted));

        // Color scale
        const colorScale = (count: number): string => {
            if (count === 0) return 'var(--sisy-heat-0, rgba(255,255,255,0.06))';
            if (count <= 2) return 'var(--sisy-heat-1, #0e4429)';
            if (count <= 4) return 'var(--sisy-heat-2, #006d32)';
            if (count <= 6) return 'var(--sisy-heat-3, #26a641)';
            return 'var(--sisy-heat-4, #39d353)';
        };

        // Day labels
        const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
        dayLabels.forEach((label, i) => {
            if (!label) return;
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", "0");
            text.setAttribute("y", String(20 + i * (CELL + GAP) + CELL / 2 + 3));
            text.setAttribute("font-size", "9");
            text.setAttribute("fill", "var(--text-muted)");
            text.textContent = label;
            svg.appendChild(text);
        });

        // Draw cells — go backwards from today
        const today = moment();
        const startDay = today.clone().subtract(WEEKS * 7 - 1, 'days');
        // Adjust to start on a Sunday
        startDay.subtract(startDay.day(), 'days');

        let lastMonth = -1;
        for (let week = 0; week < WEEKS; week++) {
            for (let day = 0; day < DAYS; day++) {
                const date = startDay.clone().add(week * 7 + day, 'days');
                if (date.isAfter(today)) continue;

                const dateStr = date.format("YYYY-MM-DD");
                const count = lookup.get(dateStr) || 0;
                const x = 28 + week * (CELL + GAP);
                const y = 18 + day * (CELL + GAP);

                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", String(x));
                rect.setAttribute("y", String(y));
                rect.setAttribute("width", String(CELL));
                rect.setAttribute("height", String(CELL));
                rect.setAttribute("rx", "2");
                rect.setAttribute("fill", colorScale(count));
                rect.classList.add("sisy-heat-cell-svg");

                // Tooltip
                const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
                title.textContent = `${dateStr}: ${count} quests`;
                rect.appendChild(title);

                svg.appendChild(rect);

                // Month labels
                if (day === 0 && date.month() !== lastMonth) {
                    lastMonth = date.month();
                    const monthText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    monthText.setAttribute("x", String(x));
                    monthText.setAttribute("y", "12");
                    monthText.setAttribute("font-size", "9");
                    monthText.setAttribute("fill", "var(--text-muted)");
                    monthText.textContent = date.format("MMM");
                    svg.appendChild(monthText);
                }
            }
        }
    }

    /* ============================================================
     * 2. INLINE SPARKLINE (tiny 7-day trend line)
     * ============================================================ */
    static renderSparkline(parent: HTMLElement, data: number[], color: string = 'var(--sisy-blue)') {
        const W = 60, H = 18;
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
        svg.setAttribute("width", String(W));
        svg.setAttribute("height", String(H));
        svg.classList.add("sisy-sparkline");
        parent.appendChild(svg);

        if (data.length < 2) return;

        const max = Math.max(...data, 1);
        const points = data.map((v, i) => {
            const x = (i / (data.length - 1)) * (W - 4) + 2;
            const y = H - 2 - ((v / max) * (H - 4));
            return `${x},${y}`;
        });

        // Gradient fill under the line
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        grad.setAttribute("id", `spark-grad-${Math.random().toString(36).slice(2, 7)}`);
        grad.setAttribute("x1", "0"); grad.setAttribute("y1", "0");
        grad.setAttribute("x2", "0"); grad.setAttribute("y2", "1");
        const s1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        s1.setAttribute("offset", "0%"); s1.setAttribute("stop-color", color); s1.setAttribute("stop-opacity", "0.3");
        const s2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        s2.setAttribute("offset", "100%"); s2.setAttribute("stop-color", color); s2.setAttribute("stop-opacity", "0.0");
        grad.appendChild(s1); grad.appendChild(s2);
        defs.appendChild(grad); svg.appendChild(defs);

        // Area fill
        const area = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        const firstX = (0 / (data.length - 1)) * (W - 4) + 2;
        const lastX = ((data.length - 1) / (data.length - 1)) * (W - 4) + 2;
        area.setAttribute("points", `${firstX},${H} ${points.join(" ")} ${lastX},${H}`);
        area.setAttribute("fill", `url(#${grad.getAttribute("id")})`);
        svg.appendChild(area);

        // Line
        const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        polyline.setAttribute("points", points.join(" "));
        polyline.setAttribute("fill", "none");
        polyline.setAttribute("stroke", color);
        polyline.setAttribute("stroke-width", "1.5");
        polyline.setAttribute("stroke-linecap", "round");
        svg.appendChild(polyline);

        // End dot
        const lastPoint = points[points.length - 1].split(",");
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", lastPoint[0]); dot.setAttribute("cy", lastPoint[1]);
        dot.setAttribute("r", "2"); dot.setAttribute("fill", color);
        svg.appendChild(dot);
    }

    /* ============================================================
     * 3. SKILL RADAR CHART (polygon)
     * ============================================================ */
    static renderRadar(parent: HTMLElement, skills: Skill[], maxLevel: number = 20) {
        const SIZE = 160, CX = SIZE / 2, CY = SIZE / 2, R = 60;
        const top = skills.slice(0, 6); // max 6 axes
        if (top.length < 3) return; // need at least 3 for a polygon

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", `0 0 ${SIZE} ${SIZE}`);
        svg.setAttribute("width", "100%");
        svg.classList.add("sisy-radar-chart");
        parent.appendChild(svg);

        const n = top.length;
        const angleStep = (2 * Math.PI) / n;

        // Grid rings (3 levels)
        [0.33, 0.66, 1.0].forEach(pct => {
            const ringPts = [];
            for (let i = 0; i < n; i++) {
                const angle = i * angleStep - Math.PI / 2;
                ringPts.push(`${CX + R * pct * Math.cos(angle)},${CY + R * pct * Math.sin(angle)}`);
            }
            const ring = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            ring.setAttribute("points", ringPts.join(" "));
            ring.setAttribute("fill", "none");
            ring.setAttribute("stroke", "var(--background-modifier-border)");
            ring.setAttribute("stroke-width", "0.5");
            svg.appendChild(ring);
        });

        // Axis lines
        for (let i = 0; i < n; i++) {
            const angle = i * angleStep - Math.PI / 2;
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", String(CX)); line.setAttribute("y1", String(CY));
            line.setAttribute("x2", String(CX + R * Math.cos(angle)));
            line.setAttribute("y2", String(CY + R * Math.sin(angle)));
            line.setAttribute("stroke", "var(--background-modifier-border)");
            line.setAttribute("stroke-width", "0.5");
            svg.appendChild(line);
        }

        // Data polygon
        const dataPts = [];
        for (let i = 0; i < n; i++) {
            const angle = i * angleStep - Math.PI / 2;
            const val = Math.min(top[i].level / maxLevel, 1);
            dataPts.push(`${CX + R * val * Math.cos(angle)},${CY + R * val * Math.sin(angle)}`);
        }
        const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        poly.setAttribute("points", dataPts.join(" "));
        poly.setAttribute("fill", "var(--sisy-blue)");
        poly.setAttribute("fill-opacity", "0.25");
        poly.setAttribute("stroke", "var(--sisy-blue)");
        poly.setAttribute("stroke-width", "1.5");
        svg.appendChild(poly);

        // Data points + labels
        for (let i = 0; i < n; i++) {
            const angle = i * angleStep - Math.PI / 2;
            const val = Math.min(top[i].level / maxLevel, 1);

            // Point
            const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            dot.setAttribute("cx", String(CX + R * val * Math.cos(angle)));
            dot.setAttribute("cy", String(CY + R * val * Math.sin(angle)));
            dot.setAttribute("r", "3");
            dot.setAttribute("fill", "var(--sisy-blue)");
            svg.appendChild(dot);

            // Label
            const lx = CX + (R + 14) * Math.cos(angle);
            const ly = CY + (R + 14) * Math.sin(angle);
            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("x", String(lx));
            label.setAttribute("y", String(ly + 3));
            label.setAttribute("font-size", "8");
            label.setAttribute("fill", "var(--text-muted)");
            label.setAttribute("text-anchor", "middle");
            label.textContent = `${top[i].name} L${top[i].level}`;
            svg.appendChild(label);
        }
    }

    /* ============================================================
     * 4. TIME-OF-DAY BAR CHART
     * ============================================================ */
    static renderTimeOfDay(parent: HTMLElement, metrics: DayMetrics[]) {
        const W = 280, H = 60;
        const hourly = new Array(24).fill(0);

        // Aggregate hourly completions across all days
        metrics.forEach(m => {
            if (m.hourlyCompletions) {
                m.hourlyCompletions.forEach((count, hour) => {
                    hourly[hour] += count;
                });
            }
        });

        const max = Math.max(...hourly, 1);

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
        svg.setAttribute("width", "100%");
        svg.classList.add("sisy-time-chart");
        parent.appendChild(svg);

        const barW = (W - 20) / 24;
        hourly.forEach((count, i) => {
            const barH = (count / max) * (H - 15);
            const x = 10 + i * barW;
            const y = H - 12 - barH;

            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", String(x + 1));
            rect.setAttribute("y", String(y));
            rect.setAttribute("width", String(barW - 2));
            rect.setAttribute("height", String(Math.max(barH, 1)));
            rect.setAttribute("rx", "1");
            rect.setAttribute("fill", count > 0 ? 'var(--sisy-blue)' : 'var(--background-modifier-border)');
            rect.setAttribute("opacity", count > 0 ? String(0.4 + (count / max) * 0.6) : "0.3");

            const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
            title.textContent = `${i}:00 — ${count} quests`;
            rect.appendChild(title);
            svg.appendChild(rect);
        });

        // Hour labels (every 6 hours)
        [0, 6, 12, 18].forEach(h => {
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", String(10 + h * barW + barW / 2));
            text.setAttribute("y", String(H - 2));
            text.setAttribute("font-size", "7");
            text.setAttribute("fill", "var(--text-muted)");
            text.setAttribute("text-anchor", "middle");
            text.textContent = `${h}:00`;
            svg.appendChild(text);
        });
    }

    /* ============================================================
     * 5. WEEK-OVER-WEEK COMPARISON
     * ============================================================ */
    static getWeekComparison(metrics: DayMetrics[]): { label: string; thisWeek: number; lastWeek: number; delta: string; up: boolean }[] {
        const now = moment();
        const thisWeekStart = now.clone().subtract(6, 'days').startOf('day');
        const lastWeekStart = now.clone().subtract(13, 'days').startOf('day');
        const lastWeekEnd = now.clone().subtract(7, 'days').endOf('day');

        const thisWeek = metrics.filter(m => moment(m.date).isAfter(thisWeekStart));
        const lastWeek = metrics.filter(m => {
            const d = moment(m.date);
            return d.isAfter(lastWeekStart) && d.isBefore(lastWeekEnd);
        });

        const sum = (arr: DayMetrics[], key: keyof DayMetrics) => arr.reduce((s, d) => s + ((d[key] as number) || 0), 0);

        const compare = (label: string, key: keyof DayMetrics) => {
            const tw = sum(thisWeek, key);
            const lw = sum(lastWeek, key);
            const diff = lw > 0 ? Math.round(((tw - lw) / lw) * 100) : (tw > 0 ? 100 : 0);
            return { label, thisWeek: tw, lastWeek: lw, delta: `${diff >= 0 ? '▲' : '▼'}${Math.abs(diff)}%`, up: diff >= 0 };
        };

        return [
            compare('Quests', 'questsCompleted'),
            compare('XP', 'xpEarned'),
            compare('Gold', 'goldEarned'),
            compare('Damage', 'damagesTaken'),
        ];
    }

    /* ============================================================
     * 6. LEGACY LINE CHART (kept for backward compatibility)
     * ============================================================ */
    static renderLineChart(parent: HTMLElement, metrics: any[], widthOverride?: number) {
        const height = 100;
        const width = widthOverride || parent.clientWidth || 300;
        const padding = 5;

        const data: number[] = [];
        const labels: string[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = moment().subtract(i, 'days').format("YYYY-MM-DD");
            const m = metrics.find((x: any) => x.date === d);
            data.push(m ? m.questsCompleted : 0);
            labels.push(moment(d).format("ddd"));
        }

        const maxVal = Math.max(...data, 5);
        const points: string[] = [];
        const divisor = Math.max(1, data.length - 1);

        data.forEach((val, idx) => {
            const x = (idx / divisor) * (width - padding * 2) + padding;
            const y = height - ((val / maxVal) * (height - padding * 2)) - padding;
            points.push(`${x},${y}`);
        });

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.setAttribute("preserveAspectRatio", "none");
        svg.classList.add("sisy-chart-svg");
        parent.appendChild(svg);

        const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        polyline.setAttribute("points", points.join(" "));
        polyline.setAttribute("fill", "none");
        polyline.setAttribute("stroke", "var(--sisy-blue)");
        polyline.setAttribute("stroke-width", "2");
        svg.appendChild(polyline);

        points.forEach((p) => {
            const [cx, cy] = p.split(",");
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", cx);
            circle.setAttribute("cy", cy);
            circle.setAttribute("r", "3");
            circle.setAttribute("fill", "var(--sisy-blue)");
            svg.appendChild(circle);
        });
    }

    /** Legacy heatmap — kept for compatibility */
    static renderHeatmap(parent: HTMLElement, metrics: any[]) {
        const heatmap = parent.createDiv({ cls: "sisy-heatmap" });
        for (let i = 27; i >= 0; i--) {
            const date = moment().subtract(i, 'days').format("YYYY-MM-DD");
            const m = metrics.find((x: any) => x.date === date);
            const count = m ? m.questsCompleted : 0;
            let color = "rgba(255,255,255,0.05)";
            if (count > 0) color = "rgba(0, 176, 255, 0.3)";
            if (count > 3) color = "rgba(0, 176, 255, 0.6)";
            if (count > 6) color = "rgba(0, 176, 255, 1.0)";
            const day = heatmap.createDiv({ cls: "sisy-heat-cell" });
            day.style.background = color;
            day.setAttribute("title", `${date}: ${count} quests`);
            if (i === 0) day.style.border = "1px solid white";
        }
    }
}
