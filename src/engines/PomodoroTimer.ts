/**
 * Pomodoro Focus Timer — Integrated timer with work/break cycles.
 * Replaces the basic brown noise toggle with a full Pomodoro system.
 */
import { TinyEmitter, AudioController } from '../utils';
import { showToast, floatReward } from '../ui/effects';

export type PomodoroPhase = 'idle' | 'work' | 'break';

export interface PomodoroState {
    phase: PomodoroPhase;
    remaining: number; // seconds remaining
    totalWork: number; // total seconds of work phase
    totalBreak: number; // total seconds of break phase
    cyclesCompleted: number;
}

const DEFAULT_WORK_DURATION = 25 * 60; // 25 minutes
const DEFAULT_BREAK_DURATION = 5 * 60;  // 5 minutes

export class PomodoroTimer {
    state: PomodoroState;
    private intervalId: number | null = null;
    private audio: AudioController;
    events: TinyEmitter;

    constructor(audio: AudioController) {
        this.audio = audio;
        this.events = new TinyEmitter();
        this.state = {
            phase: 'idle',
            remaining: DEFAULT_WORK_DURATION,
            totalWork: DEFAULT_WORK_DURATION,
            totalBreak: DEFAULT_BREAK_DURATION,
            cyclesCompleted: 0,
        };
    }

    start(): void {
        if (this.state.phase === 'idle') {
            this.state.phase = 'work';
            this.state.remaining = this.state.totalWork;
        }
        if (this.intervalId) return;
        this.intervalId = window.setInterval(() => this.tick(), 1000);
        this.audio.toggleBrownNoise(); // Start focus audio
        this.events.trigger('update', this.state);
    }

    pause(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.events.trigger('update', this.state);
    }

    reset(): void {
        this.pause();
        if (this.audio) {
            // Stop brown noise if playing
            try { this.audio.toggleBrownNoise(); } catch (_) { }
        }
        this.state.phase = 'idle';
        this.state.remaining = this.state.totalWork;
        this.events.trigger('update', this.state);
    }

    skip(): void {
        this.transitionPhase();
    }

    isRunning(): boolean {
        return this.intervalId !== null;
    }

    private tick(): void {
        this.state.remaining--;
        if (this.state.remaining <= 0) {
            this.transitionPhase();
        }
        this.events.trigger('update', this.state);
    }

    private transitionPhase(): void {
        if (this.state.phase === 'work') {
            this.state.cyclesCompleted++;
            this.state.phase = 'break';
            this.state.remaining = this.state.totalBreak;
            this.audio.playSound('success');
            showToast({
                icon: '☕',
                title: `Focus cycle ${this.state.cyclesCompleted} complete!`,
                message: 'Time for a break.',
                variant: 'success',
                duration: 5000,
            });
            floatReward(`+1 🍅`, 'xp');
        } else {
            this.state.phase = 'work';
            this.state.remaining = this.state.totalWork;
            this.audio.playSound('click');
            showToast({
                icon: '⚡',
                title: 'Break over!',
                message: 'Back to work.',
                variant: 'xp',
                duration: 3000,
            });
        }
        this.events.trigger('phase', this.state);
    }

    formatTime(): string {
        const m = Math.floor(this.state.remaining / 60);
        const s = this.state.remaining % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    destroy(): void {
        this.pause();
    }
}
