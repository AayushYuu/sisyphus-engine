import { moment } from 'obsidian';

export class ChartRenderer {
    // [FIX] Added optional 'width' parameter
    static renderLineChart(parent: HTMLElement, metrics: any[], widthOverride?: number) {
        const height = 100; // Matches CSS height
        const width = widthOverride || parent.clientWidth || 300;
        const padding = 5; // Reduced padding
        
        const data: number[] = [];
        const labels: string[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = moment().subtract(i, 'days').format("YYYY-MM-DD");
            const m = metrics.find(x => x.date === d);
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

    static renderHeatmap(parent: HTMLElement, metrics: any[]) {
        const heatmap = parent.createDiv({ cls: "sisy-heatmap" });
    
        for (let i = 27; i >= 0; i--) {
            const date = moment().subtract(i, 'days').format("YYYY-MM-DD");
            const m = metrics.find(x => x.date === date);
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
