import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import SisyphusPlugin from './main';
import { TemplateManagerModal } from './ui/modals';
import { StateManager } from './core/StateManager';

export class SisyphusSettingTab extends PluginSettingTab {
    plugin: SisyphusPlugin;

    constructor(app: App, plugin: SisyphusPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Sisyphus Engine Settings' });

        // --- MODULES SECTION ---
        containerEl.createEl('h3', { text: 'Modules' });

        const modules = this.plugin.kernel?.modules.getAll() ?? [];
        modules.forEach((module) => {
            new Setting(containerEl)
                .setName(module.name)
                .setDesc(module.description)
                .addToggle((toggle) => {
                    const enabled = this.plugin.kernel.modules.isEnabled(module.id);
                    toggle
                        .setValue(enabled)
                        .onChange(async (value) => {
                            try {
                                if (value) {
                                    this.plugin.kernel.modules.enable(module.id);
                                } else {
                                    this.plugin.kernel.modules.disable(module.id);
                                }

                                const enabledIds = this.plugin.kernel.modules
                                    .getAll()
                                    .filter((entry) => this.plugin.kernel.modules.isEnabled(entry.id))
                                    .map((entry) => entry.id);

                                this.plugin.config.enabledModules = enabledIds;
                                await this.plugin.saveSettings();
                                this.plugin.engine.trigger('update');
                            } catch (error) {
                                new Notice(`Failed to toggle module '${module.name}'.`);
                                console.error(error);
                                this.display();
                            }
                        });
                });
        });

        // --- GAMEPLAY SECTION ---
        containerEl.createEl('h3', { text: 'Gameplay' });

        new Setting(containerEl)
            .setName('Starting HP')
            .setDesc('Base HP for a new run (Default: 100)')
            .addText((text) =>
                text.setValue(String(this.plugin.settings.maxHp)).onChange(async (value) => {
                    const num = parseInt(value);
                    this.plugin.settings.maxHp = Number.isNaN(num) ? 100 : num;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Difficulty Scaling (Rival Damage)')
            .setDesc('Starting damage punishment for failed quests (Default: 10)')
            .addText((text) =>
                text.setValue(String(this.plugin.settings.rivalDmg)).onChange(async (value) => {
                    const num = parseInt(value);
                    this.plugin.settings.rivalDmg = Number.isNaN(num) ? 10 : num;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Quest Templates')
            .setDesc('Create or delete quick-deploy templates.')
            .addButton((btn) =>
                btn.setButtonText('Manage Templates').onClick(() => {
                    new TemplateManagerModal(this.app, this.plugin).open();
                })
            );

        // --- AUDIO SECTION ---
        containerEl.createEl('h3', { text: 'Audio' });

        new Setting(containerEl)
            .setName('Mute All Sounds')
            .setDesc('Disable sound effects and ambient noise')
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.muted).onChange(async (value) => {
                    this.plugin.settings.muted = value;
                    this.plugin.audio.setMuted(value);
                    await this.plugin.saveSettings();
                })
            );

        // --- DATA MANAGEMENT SECTION ---
        containerEl.createEl('h3', { text: 'Data Management' });

        new Setting(containerEl)
            .setName('Export Full Data')
            .setDesc('Download config and full game state as a JSON file.')
            .addButton((btn) =>
                btn.setButtonText('Export Backup').onClick(() => {
                    const stateManager = new StateManager(this.plugin.settings);
                    const payload = stateManager.toPersistedState(this.plugin.config, this.plugin.settings);
                    const json = JSON.stringify(payload, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);

                    const anchor = document.createElement('a');
                    anchor.href = url;
                    anchor.download = `sisyphus_backup_${Date.now()}.json`;
                    anchor.click();
                    URL.revokeObjectURL(url);
                    new Notice('Backup downloaded.');
                })
            );

        new Setting(containerEl)
            .setName('Import Data')
            .setDesc('Restore from backup file. ⚠️ WARNING: Overwrites current progress!')
            .addButton((btn) =>
                btn
                    .setButtonText('Import Backup')
                    .setWarning()
                    .onClick(() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.json';

                        input.onchange = async (event: Event) => {
                            const target = event.target as HTMLInputElement;
                            const file = target.files?.[0];
                            if (!file) return;

                            try {
                                const text = await file.text();
                                const data = JSON.parse(text);
                                const stateManager = new StateManager(this.plugin.settings);
                                const migrated = stateManager.migrate(data);

                                this.plugin.config = migrated.config;
                                this.plugin.settings = migrated.state;

                                // Keep runtime references in sync
                                this.plugin.kernel.config = this.plugin.config;
                                this.plugin.kernel.state = this.plugin.settings;

                                const enabled = new Set(this.plugin.config.enabledModules);
                                this.plugin.kernel.modules.getAll().forEach((module) => {
                                    if (enabled.has(module.id)) {
                                        this.plugin.kernel.modules.enable(module.id);
                                    } else {
                                        this.plugin.kernel.modules.disable(module.id);
                                    }
                                });

                                await this.plugin.saveSettings();
                                this.plugin.engine.trigger('update');
                                this.display();
                                new Notice('Data imported successfully!');
                            } catch (error) {
                                new Notice('Error importing data.');
                                console.error(error);
                            }
                        };

                        input.click();
                    })
            );
    }
}
