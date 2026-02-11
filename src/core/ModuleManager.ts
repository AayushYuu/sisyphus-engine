import { GameModule } from './GameModule';

export class ModuleManager {
    private readonly modules = new Map<string, GameModule>();
    private readonly enabledModules = new Set<string>();

    register(module: GameModule): void {
        this.modules.set(module.id, module);
    }

    getAll(): GameModule[] {
        return [...this.modules.values()];
    }

    getById(moduleId: string): GameModule | null {
        return this.modules.get(moduleId) ?? null;
    }

    isEnabled(moduleId: string): boolean {
        return this.enabledModules.has(moduleId);
    }

    enable(moduleId: string): void {
        const module = this.modules.get(moduleId);
        if (!module || this.enabledModules.has(moduleId)) return;

        const sortedDependencies = this.resolveDependencies(moduleId);
        sortedDependencies.forEach((id) => {
            if (this.enabledModules.has(id)) return;
            const dependency = this.modules.get(id);
            if (!dependency) return;

            dependency.onEnable();
            this.enabledModules.add(id);
        });
    }

    disable(moduleId: string): void {
        if (!this.enabledModules.has(moduleId)) return;

        const dependents = this.findDependents(moduleId);
        dependents.forEach((dependentId) => this.disable(dependentId));

        const module = this.modules.get(moduleId);
        if (!module) return;

        module.onDisable();
        this.enabledModules.delete(moduleId);
    }

    disableAll(): void {
        [...this.enabledModules].forEach((moduleId) => this.disable(moduleId));
    }

    private resolveDependencies(moduleId: string): string[] {
        const sorted: string[] = [];
        const visiting = new Set<string>();
        const visited = new Set<string>();

        const visit = (id: string): void => {
            if (visited.has(id)) return;
            if (visiting.has(id)) {
                throw new Error(`Circular module dependency detected for module: ${id}`);
            }

            visiting.add(id);
            const module = this.modules.get(id);
            if (!module) {
                throw new Error(`Missing dependency module: ${id}`);
            }

            module.dependencies.forEach((dependencyId) => visit(dependencyId));
            visiting.delete(id);
            visited.add(id);
            sorted.push(id);
        };

        visit(moduleId);
        return sorted;
    }

    private findDependents(moduleId: string): string[] {
        const dependents: string[] = [];
        this.modules.forEach((module) => {
            if (!this.enabledModules.has(module.id)) return;
            if (module.dependencies.includes(moduleId)) {
                dependents.push(module.id);
            }
        });
        return dependents;
    }
}
