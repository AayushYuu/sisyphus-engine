import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import SisyphusPlugin from './main';
import { TemplateManagerModal } from './ui/modals';

export class SisyphusSettingTab extends PluginSettingTab {
    plugin: SisyphusPlugin;

    constructor(app: App, plugin: SisyphusPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl("h2", { text: "Sisyphus Engine Settings" });

        // --- GAMEPLAY SECTION ---
        containerEl.createEl("h3", { text: "Gameplay" });

        new Setting(containerEl)
            .setName("Starting HP")
            .setDesc("Base HP for a new run (Default: 100)")
            .addText(text => text
                .setValue(String(this.plugin.settings.maxHp))
                .onChange(async (value) => {
                    const num = parseInt(value);
                    this.plugin.settings.maxHp = isNaN(num) ? 100 : num;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Difficulty Scaling (Rival Damage)")
            .setDesc("Starting damage punishment for failed quests (Default: 10)")
            .addText(text => text
                .setValue(String(this.plugin.settings.rivalDmg))
                .onChange(async (value) => {
                    const num = parseInt(value);
                    this.plugin.settings.rivalDmg = isNaN(num) ? 10 : num;
                    await this.plugin.saveSettings();
                }));
    // Inside display(), under Gameplay section...

    new Setting(containerEl)
        .setName("Quest Templates")
        .setDesc("Create or delete quick-deploy templates.")
        .addButton(btn => btn
            .setButtonText("Manage Templates")
            .onClick(() => {
                new TemplateManagerModal(this.app, this.plugin).open();
            }));

        // --- AUDIO SECTION ---
        containerEl.createEl("h3", { text: "Audio" });

        new Setting(containerEl)
            .setName("Mute All Sounds")
            .setDesc("Disable sound effects and ambient noise")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.muted)
                .onChange(async (value) => {
                    this.plugin.settings.muted = value;
                    this.plugin.audio.setMuted(value);
                    await this.plugin.saveSettings();
                }));

        // --- DATA MANAGEMENT SECTION ---
        containerEl.createEl("h3", { text: "Data Management" });

        new Setting(containerEl)
            .setName("Export Full Data")
            .setDesc("Download all settings, history, and stats as a JSON file.")
            .addButton(btn => btn
                .setButtonText("Export Backup")
                .onClick(async () => {
                    const json = JSON.stringify(this.plugin.settings, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `sisyphus_backup_${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    new Notice("Backup downloaded.");
                }));

        new Setting(containerEl)
            .setName("Import Data")
            .setDesc("Restore from backup file. ⚠️ WARNING: Overwrites current progress!")
            .addButton(btn => btn
                .setButtonText("Import Backup")
                .setWarning()
                .onClick(() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    
                    input.onchange = async (e: any) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        try {
                            const text = await file.text();
                            const data = JSON.parse(text);

                            const required = ['hp', 'skills', 'level', 'xpReq', 'dailyModifier', 'legacy', 'researchStats', 'filterState'];
                            const missing = required.filter(k => data[k] == null);
                            if (missing.length > 0) {
                                new Notice(`Invalid backup: missing ${missing.join(', ')}`);
                                return;
                            }
                            if (!Array.isArray(data.scars)) data.scars = [];
                            if (typeof data.neuralHubPath !== 'string') data.neuralHubPath = 'Active_Run/Neural_Hub.canvas';

                            this.plugin.settings = data;
                            await this.plugin.saveSettings();

                            this.plugin.engine.trigger("update");
                            new Notice("Data imported successfully!");
                        } catch (err) {
                            new Notice("Error importing data.");
                            console.error(err);
                        }
                    };
                    
                    input.click();
                }));
    }
}
