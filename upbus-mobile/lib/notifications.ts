import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { useState, useEffect } from 'react';
import { registerPushToken, unregisterPushToken, BusStop } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;

  const projectId: string | undefined =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;

  if (!projectId) {
    console.warn('[notifications] No EAS projectId found — skipping push token registration (dev env)');
    return null;
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await SecureStore.setItemAsync('push_token', token);
    return token;
  } catch (e) {
    console.warn('[notifications] getExpoPushTokenAsync failed:', e);
    return null;
  }
}

// ─── ETA Row ──────────────────────────────────────────────────────────────────

export interface EtaRow {
  lineColor: string;
  lineName: string;
  color: string;
  eta: number | null;
}

// ─── Tracking State ───────────────────────────────────────────────────────────

export interface TrackingState {
  isTracking: boolean;
  destinationStop: BusStop | null;
  boardingStops: Record<string, BusStop>;
  etaRows: EtaRow[];
  startTracking: (dest: BusStop, boardingStops: { lineColor: string; stop: BusStop }[]) => Promise<void>;
  stopTracking: () => Promise<void>;
  setEtaRows: (rows: EtaRow[]) => void;
}

const LINE_NAMES: Record<string, string> = {
  Green: 'สายหน้ามอ',
  Red:   'สายหอพัก',
  Blue:  'สายประตูสาม',
};

const LINE_COLORS: Record<string, string> = {
  Green: '#2ecc71',
  Red:   '#e74c3c',
  Blue:  '#3498db',
};

// ─── Module-level singleton (no external state library needed) ────────────────

let _state: TrackingState | null = null;
const _listeners: Set<() => void> = new Set();

function notify(): void {
  _listeners.forEach(fn => fn());
}

function getOrCreateState(): TrackingState {
  if (_state) return _state;

  _state = {
    isTracking: false,
    destinationStop: null,
    boardingStops: {},
    etaRows: [],

    setEtaRows: (rows: EtaRow[]) => {
      if (_state) {
        _state.etaRows = rows;
        notify();
      }
    },

    startTracking: async (dest: BusStop, boardingStops: { lineColor: string; stop: BusStop }[]) => {
      const token = await SecureStore.getItemAsync('push_token');
      if (token) {
        try {
          await registerPushToken(
            token,
            dest.id,
            boardingStops.map(bs => ({
              lineColor: bs.lineColor,
              stopName: bs.stop.name,
              lat: bs.stop.lat,
              lng: bs.stop.lng,
            }))
          );
        } catch (e) {
          console.warn('[notifications] registerPushToken failed (backend may be offline):', e);
        }
      }
      if (_state) {
        _state.isTracking = true;
        _state.destinationStop = dest;
        _state.boardingStops = Object.fromEntries(boardingStops.map(bs => [bs.lineColor, bs.stop]));
        _state.etaRows = boardingStops.map(bs => ({
          lineColor: bs.lineColor,
          lineName: LINE_NAMES[bs.lineColor] ?? bs.lineColor,
          color: LINE_COLORS[bs.lineColor] ?? '#888',
          eta: null,
        }));
        notify();
      }
    },

    stopTracking: async () => {
      const token = await SecureStore.getItemAsync('push_token');
      if (token) {
        try {
          await unregisterPushToken(token);
        } catch (e) {
          console.warn('[notifications] unregisterPushToken failed (backend may be offline):', e);
        }
      }
      if (_state) {
        _state.isTracking = false;
        _state.destinationStop = null;
        _state.boardingStops = {};
        _state.etaRows = [];
        notify();
      }
    },
  };

  return _state;
}

export function useTrackingStore(): TrackingState {
  const [, rerender] = useState(0);

  useEffect(() => {
    const fn = () => rerender(n => n + 1);
    _listeners.add(fn);
    return () => {
      _listeners.delete(fn);
    };
  }, []);

  return getOrCreateState();
}
