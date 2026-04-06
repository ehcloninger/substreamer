export interface SleepTimerChangedEvent {
    /** Unix epoch time (seconds) when the timer will fire, or -1 for end-of-track mode. Null when cleared. */
    endTime: number | null;
    /** Whether the timer is in "end of current track" mode. */
    endOfTrack: boolean;
    /** Whether a sleep timer is currently active. */
    active: boolean;
}
//# sourceMappingURL=SleepTimerChangedEvent.d.ts.map