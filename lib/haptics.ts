"use client";

type HapticStyle = 'light' | 'medium' | 'heavy';
type HapticNotification = 'success' | 'warning' | 'error';

interface HapticConfig {
    enabled: boolean;
    respectBattery: boolean;
    minInterval: number; // milliseconds
}

class HapticFeedback {
    private lastHapticTime = 0;
    private config: HapticConfig = {
        enabled: true,
        respectBattery: true,
        minInterval: 50,
    };

    constructor() {
        // Load user preference
        if (typeof window !== 'undefined') {
            const savedPreference = localStorage.getItem('hapticsEnabled');
            if (savedPreference !== null) {
                this.config.enabled = savedPreference === 'true';
            }
        }
    }

    private async canVibrate(): Promise<boolean> {
        if (typeof window === 'undefined') return false;
        if (!this.config.enabled) return false;
        if (!('vibrate' in navigator)) return false;

        // Check battery level if enabled
        if (this.config.respectBattery && 'getBattery' in navigator) {
            try {
                const battery = await (navigator as any).getBattery();
                if (battery.level < 0.2 && !battery.charging) {
                    return false; // Battery too low
                }
            } catch {
                // Battery API not available or failed, proceed anyway
            }
        }

        // Debounce
        const now = Date.now();
        if (now - this.lastHapticTime < this.config.minInterval) {
            return false;
        }

        this.lastHapticTime = now;
        return true;
    }

    async light() {
        if (!(await this.canVibrate())) return;
        navigator.vibrate(10);
    }

    async medium() {
        if (!(await this.canVibrate())) return;
        navigator.vibrate(25);
    }

    async heavy() {
        if (!(await this.canVibrate())) return;
        navigator.vibrate(50);
    }

    async success() {
        if (!(await this.canVibrate())) return;
        navigator.vibrate([30, 50, 30]); // Double tap pattern
    }

    async error() {
        if (!(await this.canVibrate())) return;
        navigator.vibrate([50, 100, 50, 100, 50]); // Triple tap pattern
    }

    async selection() {
        if (!(await this.canVibrate())) return;
        navigator.vibrate(15);
    }

    async warning() {
        if (!(await this.canVibrate())) return;
        navigator.vibrate([40, 80, 40]);
    }

    // Context-aware haptic based on amount
    async expense(amount: number) {
        if (amount > 1000) {
            await this.heavy(); // Large expense
        } else {
            await this.medium(); // Normal expense
        }
    }

    setEnabled(enabled: boolean) {
        this.config.enabled = enabled;
        if (typeof window !== 'undefined') {
            localStorage.setItem('hapticsEnabled', String(enabled));
        }
    }

    isEnabled(): boolean {
        return this.config.enabled;
    }
}

export const haptics = new HapticFeedback();
