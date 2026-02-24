import { App, Modal } from 'obsidian';
import SisyphusPlugin from '../main';

interface HubItem {
    icon: string;
    label: string;
    hotkey?: string;
    desc: string;
    commandId: string;
}

interface HubCategory {
    title: string;
    icon: string;
    items: HubItem[];
}

export class CommandHubModal extends Modal {
    plugin: SisyphusPlugin;

    constructor(app: App, plugin: SisyphusPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('sisy-command-hub');

        const header = contentEl.createDiv({ cls: 'sisy-hub-header' });
        header.createEl('h2', { text: '⚡ COMMAND HUB' });
        header.createEl('p', { text: 'All Sisyphus features at your fingertips', cls: 'sisy-hub-subtitle' });

        const grid = contentEl.createDiv({ cls: 'sisy-hub-grid' });

        const categories = this.buildCategories();
        categories.forEach(cat => {
            const section = grid.createDiv({ cls: 'sisy-hub-category' });
            section.createDiv({ text: `${cat.icon} ${cat.title}`, cls: 'sisy-hub-cat-title' });

            const items = section.createDiv({ cls: 'sisy-hub-items' });
            cat.items.forEach(item => {
                const card = items.createDiv({ cls: 'sisy-hub-card' });
                card.onclick = () => { this.exec(item.commandId); this.close(); };

                const top = card.createDiv({ cls: 'sisy-hub-card-top' });
                top.createSpan({ text: item.icon, cls: 'sisy-hub-card-icon' });
                if (item.hotkey) {
                    top.createSpan({ text: item.hotkey, cls: 'sisy-hub-card-hotkey' });
                }

                card.createDiv({ text: item.label, cls: 'sisy-hub-card-label' });
                card.createDiv({ text: item.desc, cls: 'sisy-hub-card-desc' });
            });
        });
    }

    onClose() {
        this.contentEl.empty();
    }

    private exec(commandId: string): void {
        (this.app as any).commands?.executeCommandById(commandId);
    }

    private buildCategories(): HubCategory[] {
        return [
            {
                title: 'COMBAT',
                icon: '⚔️',
                items: [
                    { icon: '🗡️', label: 'Deploy Quest', hotkey: 'Ctrl+D', desc: 'Create a new quest', commandId: 'sisyphus-engine:deploy-quest-hotkey' },
                    { icon: '📋', label: 'Quick Capture', hotkey: 'Ctrl+Shift+X', desc: 'Fast quest from text', commandId: 'sisyphus-engine:quick-capture-hotkey' },
                    { icon: '✅', label: 'Complete Top', hotkey: 'Ctrl+Shift+C', desc: 'Complete first quest', commandId: 'sisyphus-engine:complete-top-quest' },
                    { icon: '💀', label: 'Accept Death', desc: 'Reset your run', commandId: 'sisyphus-engine:accept-death' },
                    { icon: '⚔️', label: 'Boss Rush', desc: 'Queue quests for bonus rewards', commandId: 'sisyphus-engine:boss-rush-start' },
                ],
            },
            {
                title: 'ANALYTICS',
                icon: '📊',
                items: [
                    { icon: '📈', label: 'Game Stats', desc: 'View current stats', commandId: 'sisyphus-engine:game-stats' },
                    { icon: '💾', label: 'Export Stats', desc: 'Save stats as JSON', commandId: 'sisyphus-engine:export-stats' },
                    { icon: '📅', label: 'Weekly Review', hotkey: 'Ctrl+Shift+W', desc: 'Full week breakdown', commandId: 'sisyphus-engine:weekly-review' },
                    { icon: '👤', label: 'Character Profile', hotkey: 'Ctrl+Shift+P', desc: 'Full character sheet', commandId: 'sisyphus-engine:character-profile' },
                ],
            },
            {
                title: 'SKILLS',
                icon: '🧠',
                items: [
                    { icon: '🕸️', label: 'Neural Hub Graph', desc: 'Generate skill canvas', commandId: 'sisyphus-engine:generate-skill-graph' },
                    { icon: '🧬', label: 'View Scars', desc: 'Past life records', commandId: 'sisyphus-engine:scars' },
                ],
            },
            {
                title: 'RESEARCH',
                icon: '🔬',
                items: [
                    { icon: '📝', label: 'Create Research', desc: 'New research quest', commandId: 'sisyphus-engine:create-research' },
                    { icon: '📚', label: 'View Library', desc: 'Browse research quests', commandId: 'sisyphus-engine:view-research' },
                ],
            },
            {
                title: 'CHAINS',
                icon: '⛓️',
                items: [
                    { icon: '🔗', label: 'Create Chain', desc: 'Build quest chain', commandId: 'sisyphus-engine:create-chain' },
                    { icon: '👁️', label: 'View Active', desc: 'Current chain status', commandId: 'sisyphus-engine:view-chains' },
                ],
            },
            {
                title: 'TOOLS',
                icon: '🛠️',
                items: [
                    { icon: '🎵', label: 'Focus Audio', desc: 'Toggle brown noise', commandId: 'sisyphus-engine:toggle-focus' },
                    { icon: '🧘', label: 'Meditation', hotkey: 'Ctrl+Shift+M', desc: 'Start meditation', commandId: 'sisyphus-engine:start-meditation-hotkey' },
                    { icon: '⏱️', label: 'Pomodoro', desc: 'Start/pause timer', commandId: 'sisyphus-engine:pomodoro-start' },
                    { icon: '🎲', label: 'Reroll Chaos', desc: 'New daily modifier', commandId: 'sisyphus-engine:reroll-chaos' },
                    { icon: '📦', label: 'Templates', desc: 'Deploy from template', commandId: 'sisyphus-engine:quest-templates' },
                    { icon: '↩️', label: 'Undo Delete', hotkey: 'Ctrl+Shift+Z', desc: 'Restore last deleted', commandId: 'sisyphus-engine:undo-quest-delete' },
                    { icon: '🔄', label: 'Recurring Quests', desc: 'Manage auto-deploy quests', commandId: 'sisyphus-engine:manage-recurring' },
                ],
            },
        ];
    }
}
