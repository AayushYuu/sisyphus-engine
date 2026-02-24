import { SisyphusSettings, GameNotification } from '../types';

export class NotificationEngine {
    private static MAX_NOTIFICATIONS = 50;

    static push(settings: SisyphusSettings, notification: Omit<GameNotification, 'id' | 'timestamp' | 'read'>): void {
        if (!settings.notifications) settings.notifications = [];
        const entry: GameNotification = {
            ...notification,
            id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
            read: false,
        };
        settings.notifications.unshift(entry);
        if (settings.notifications.length > this.MAX_NOTIFICATIONS) {
            settings.notifications = settings.notifications.slice(0, this.MAX_NOTIFICATIONS);
        }
    }

    static markAllRead(settings: SisyphusSettings): void {
        if (!settings.notifications) return;
        settings.notifications.forEach(n => n.read = true);
    }

    static getUnreadCount(settings: SisyphusSettings): number {
        if (!settings.notifications) return 0;
        return settings.notifications.filter(n => !n.read).length;
    }

    static clear(settings: SisyphusSettings): void {
        settings.notifications = [];
    }

    static getRecent(settings: SisyphusSettings, count: number = 15): GameNotification[] {
        if (!settings.notifications) return [];
        return settings.notifications.slice(0, count);
    }
}
