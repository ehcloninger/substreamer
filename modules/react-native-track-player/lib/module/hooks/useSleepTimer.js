"use strict";

import { useCallback, useEffect, useRef, useState } from 'react';
import { Event } from "../constants/index.js";
import { getSleepTimer } from "../trackPlayer.js";
import { useTrackPlayerEvents } from "./useTrackPlayerEvents.js";
const INITIAL_STATE = {
  active: false,
  remaining: null,
  endOfTrack: false,
  completed: false
};

/**
 * Hook that tracks sleep timer state and provides a JS-side countdown.
 * Listens to native SleepTimerChanged/SleepTimerComplete events and
 * maintains a 1-second countdown interval for UI display.
 */
export function useSleepTimer() {
  const [state, setState] = useState(INITIAL_STATE);
  const endTimeRef = useRef(null);
  const intervalRef = useRef(null);
  const clearCountdown = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  const startCountdown = useCallback(endTime => {
    clearCountdown();
    endTimeRef.current = endTime;
    const tick = () => {
      const now = Date.now() / 1000;
      const remaining = Math.max(0, Math.round(endTimeRef.current - now));
      setState(prev => prev.remaining === remaining ? prev : {
        ...prev,
        remaining
      });
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
  }, [clearCountdown]);
  useTrackPlayerEvents([Event.SleepTimerChanged, Event.SleepTimerComplete], event => {
    if (event.type === Event.SleepTimerChanged) {
      const payload = event;
      if (payload.active) {
        if (payload.endOfTrack) {
          clearCountdown();
          setState({
            active: true,
            remaining: null,
            endOfTrack: true,
            completed: false
          });
        } else if (payload.endTime != null) {
          startCountdown(payload.endTime);
          setState({
            active: true,
            remaining: Math.max(0, Math.round(payload.endTime - Date.now() / 1000)),
            endOfTrack: false,
            completed: false
          });
        }
      } else {
        clearCountdown();
        endTimeRef.current = null;
        setState(INITIAL_STATE);
      }
    } else if (event.type === Event.SleepTimerComplete) {
      clearCountdown();
      endTimeRef.current = null;
      setState({
        active: false,
        remaining: null,
        endOfTrack: false,
        completed: true
      });
    }
  });

  // Sync with native state on mount (in case timer was set before this component rendered)
  useEffect(() => {
    let mounted = true;
    getSleepTimer().then(info => {
      if (!mounted) return;
      if (info.active) {
        if (info.endOfTrack) {
          setState({
            active: true,
            remaining: null,
            endOfTrack: true,
            completed: false
          });
        } else if (info.endTime != null) {
          startCountdown(info.endTime);
          setState({
            active: true,
            remaining: Math.max(0, Math.round(info.endTime - Date.now() / 1000)),
            endOfTrack: false,
            completed: false
          });
        }
      }
    }).catch(() => {
      /* player not yet set up */
    });
    return () => {
      mounted = false;
      clearCountdown();
    };
  }, [startCountdown, clearCountdown]);
  return state;
}
//# sourceMappingURL=useSleepTimer.js.map