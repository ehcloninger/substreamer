interface SleepTimerState {
    /** Whether a sleep timer is currently active. */
    active: boolean;
    /** Seconds remaining until the timer fires, or null if inactive. */
    remaining: number | null;
    /** Whether the timer is in "end of current track" mode. */
    endOfTrack: boolean;
    /** Whether the timer has just completed. Resets when a new timer is set. */
    completed: boolean;
}
/**
 * Hook that tracks sleep timer state and provides a JS-side countdown.
 * Listens to native SleepTimerChanged/SleepTimerComplete events and
 * maintains a 1-second countdown interval for UI display.
 */
export declare function useSleepTimer(): SleepTimerState;
export {};
//# sourceMappingURL=useSleepTimer.d.ts.map