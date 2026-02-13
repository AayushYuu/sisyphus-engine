/**
 * Sisyphus UI Effects — Toast notifications, floating rewards, and visual feedback.
 */

/* === THEMED TOAST NOTIFICATIONS === */

export type ToastVariant = 'success' | 'fail' | 'xp' | 'gold' | 'level';

interface ToastOptions {
    icon?: string;
    title: string;
    message?: string;
    variant?: ToastVariant;
    duration?: number;
    action?: { label: string; callback: () => void };
}

export function showToast(opts: ToastOptions): void {
    const toast = document.createElement('div');
    toast.className = `sisy-toast sisy-toast-${opts.variant ?? 'success'}`;

    if (opts.icon) {
        const icon = document.createElement('span');
        icon.className = 'sisy-toast-icon';
        icon.textContent = opts.icon;
        toast.appendChild(icon);
    }

    const body = document.createElement('div');
    body.className = 'sisy-toast-body';
    const title = document.createElement('div');
    title.className = 'sisy-toast-title';
    title.textContent = opts.title;
    body.appendChild(title);

    if (opts.message) {
        const msg = document.createElement('div');
        msg.className = 'sisy-toast-msg';
        msg.textContent = opts.message;
        body.appendChild(msg);
    }
    toast.appendChild(body);

    if (opts.action) {
        const btn = document.createElement('button');
        btn.className = 'sisy-toast-action';
        btn.textContent = opts.action.label;
        btn.onclick = () => {
            opts.action!.callback();
            removeToast(toast);
        };
        toast.appendChild(btn);
    }

    document.body.appendChild(toast);

    const duration = opts.duration ?? 4000;
    setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast: HTMLElement): void {
    if (!toast.parentNode) return;
    toast.classList.add('sisy-toast-exit');
    setTimeout(() => toast.remove(), 300);
}

/* === FLOATING REWARD ANIMATION === */

export function floatReward(text: string, type: 'xp' | 'gold' | 'damage' | 'level' = 'xp'): void {
    const el = document.createElement('div');
    el.className = `sisy-float-reward sisy-float-${type}`;
    el.textContent = text;

    // Position near the center-top of the viewport
    el.style.left = `${50 + (Math.random() * 10 - 5)}%`;
    el.style.top = `40%`;
    el.style.transform = 'translateX(-50%)';

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
}

/* === CONTEXT-AWARE EMPTY STATES === */

const EMPTY_MESSAGES: Record<string, { icon: string; text: string; hint: string }[]> = {
    quests: [
        { icon: '🛡️', text: 'All quiet on the front.', hint: 'Deploy a quest to break the silence.' },
        { icon: '⚔️', text: 'The battlefield awaits.', hint: 'No active threats detected.' },
        { icon: '🎯', text: 'Target acquired: nothing.', hint: 'Time to create some chaos.' },
    ],
    missions: [
        { icon: '📋', text: 'No missions briefed.', hint: 'Missions refresh daily at dawn.' },
    ],
    research: [
        { icon: '🔬', text: 'The lab is empty.', hint: 'Start a research quest to fill it.' },
    ],
};

export function getEmptyMessage(category: string): { icon: string; text: string; hint: string } {
    const messages = EMPTY_MESSAGES[category] ?? EMPTY_MESSAGES['quests'];
    return messages[Math.floor(Math.random() * messages.length)];
}

/** Render a styled empty state element */
export function renderEmptyState(parent: HTMLElement, category: string, ctaText?: string, ctaCb?: () => void): HTMLElement {
    const msg = getEmptyMessage(category);
    const el = parent.createDiv({ cls: 'sisy-empty-state' });

    const icon = el.createDiv({ cls: 'sisy-empty-icon' });
    icon.textContent = msg.icon;
    el.createDiv({ text: msg.text });
    el.createDiv({ text: msg.hint, cls: 'sisy-empty-hint' });

    if (ctaText && ctaCb) {
        const btn = el.createEl('button', { text: ctaText, cls: 'sisy-btn mod-cta' });
        btn.style.marginTop = '10px';
        btn.onclick = ctaCb;
    }

    return el;
}
