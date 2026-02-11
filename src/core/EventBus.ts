export type EventMap = object;

type EventHandler<T> = (payload: T) => void;

export class EventBus<TEvents extends EventMap> {
    private listeners = new Map<keyof TEvents, Set<EventHandler<any>>>();

    on<TKey extends keyof TEvents>(event: TKey, handler: EventHandler<TEvents[TKey]>): () => void {
        const handlers = this.listeners.get(event) ?? new Set();
        handlers.add(handler);
        this.listeners.set(event, handlers);

        return () => this.off(event, handler);
    }

    off<TKey extends keyof TEvents>(event: TKey, handler: EventHandler<TEvents[TKey]>): void {
        const handlers = this.listeners.get(event);
        if (!handlers) return;

        handlers.delete(handler);
        if (handlers.size === 0) {
            this.listeners.delete(event);
        }
    }

    emit<TKey extends keyof TEvents>(event: TKey, payload: TEvents[TKey]): void {
        const handlers = this.listeners.get(event);
        if (!handlers || handlers.size === 0) return;

        handlers.forEach((registeredHandler) => registeredHandler(payload));
    }

    clear(): void {
        this.listeners.clear();
    }
}
