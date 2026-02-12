"use client";

/**
 * Utility for triggering haptic feedback (vibrations) on mobile devices.
 * Uses the Web Vibration API.
 */
export const haptics = {
    /**
     * Light tap for subtle interactions.
     */
    light: () => {
        if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(10);
        }
    },

    /**
     * Medium tap for standard button clicks.
     */
    medium: () => {
        if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(15);
        }
    },

    /**
     * Success feedback (double tap).
     */
    success: () => {
        if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate([10, 30, 10]);
        }
    },

    /**
     * Error feedback (long or heavy vibration).
     */
    error: () => {
        if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate([50, 100, 50]);
        }
    },

    /**
     * Selection change feedback.
     */
    selection: () => {
        if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(5);
        }
    }
};
