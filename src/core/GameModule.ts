import { SisyphusKernel } from './Kernel';

export abstract class GameModule {
    abstract readonly id: string;
    abstract readonly name: string;
    abstract readonly description: string;
    readonly dependencies: string[] = [];

    protected kernel: SisyphusKernel | null = null;

    onLoad(kernel: SisyphusKernel): void {
        this.kernel = kernel;
    }

    abstract onEnable(): void;
    abstract onDisable(): void;

    onUnload(): void {
        this.kernel = null;
    }

    renderSettings(_container: HTMLElement): void {
        // Optional override for module-specific settings
    }
}
