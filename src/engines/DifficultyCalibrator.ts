import { SisyphusSettings, DifficultyStats } from '../types';
import { Notice } from 'obsidian';

const DEFAULT_STATS: DifficultyStats = {
    completions: [0, 0, 0, 0, 0],
    failures: [0, 0, 0, 0, 0],
    avgCompletionTime: [0, 0, 0, 0, 0],
    suggestedAdjustment: 0,
};

export class DifficultyCalibrator {
    static ensureStats(settings: SisyphusSettings): DifficultyStats {
        if (!settings.difficultyStats) {
            settings.difficultyStats = { ...DEFAULT_STATS, completions: [0, 0, 0, 0, 0], failures: [0, 0, 0, 0, 0], avgCompletionTime: [0, 0, 0, 0, 0] };
        }
        return settings.difficultyStats;
    }

    static trackCompletion(settings: SisyphusSettings, difficulty: number, success: boolean, _timeMs?: number): void {
        const stats = this.ensureStats(settings);
        const idx = Math.max(0, Math.min(4, difficulty - 1));

        if (success) {
            stats.completions[idx]++;
        } else {
            stats.failures[idx]++;
        }

        this.recalcSuggestion(stats);
    }

    private static recalcSuggestion(stats: DifficultyStats): void {
        // Find the most-used difficulty tier
        let maxIdx = 0;
        let maxTotal = 0;
        for (let i = 0; i < 5; i++) {
            const total = stats.completions[i] + stats.failures[i];
            if (total > maxTotal) {
                maxTotal = total;
                maxIdx = i;
            }
        }

        if (maxTotal < 5) {
            stats.suggestedAdjustment = 0;
            return;
        }

        const rate = stats.completions[maxIdx] / maxTotal;
        if (rate > 0.9 && maxIdx < 4) {
            stats.suggestedAdjustment = 1;
        } else if (rate < 0.4 && maxIdx > 0) {
            stats.suggestedAdjustment = -1;
        } else {
            stats.suggestedAdjustment = 0;
        }
    }

    static getSuggestion(settings: SisyphusSettings): { adjustment: number; message: string } | null {
        const stats = this.ensureStats(settings);
        if (stats.suggestedAdjustment === 0) return null;

        if (stats.suggestedAdjustment > 0) {
            return { adjustment: 1, message: '📈 You\'re crushing it! Consider increasing quest difficulty for better rewards.' };
        } else {
            return { adjustment: -1, message: '📉 You\'re struggling — try lowering quest difficulty to build momentum.' };
        }
    }

    static getStats(settings: SisyphusSettings): { difficulty: number; rate: number; total: number }[] {
        const stats = this.ensureStats(settings);
        const result: { difficulty: number; rate: number; total: number }[] = [];
        for (let i = 0; i < 5; i++) {
            const total = stats.completions[i] + stats.failures[i];
            result.push({
                difficulty: i + 1,
                rate: total > 0 ? Math.round((stats.completions[i] / total) * 100) : 0,
                total
            });
        }
        return result;
    }

    static showSuggestionIfNeeded(settings: SisyphusSettings): void {
        const suggestion = this.getSuggestion(settings);
        if (suggestion) {
            new Notice(suggestion.message, 8000);
        }
    }
}
