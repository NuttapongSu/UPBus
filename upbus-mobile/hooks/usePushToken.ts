import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { registerPushToken } from '@/lib/api';

const TOKEN_KEY  = '@upbus/pushToken';
const LINES_KEY  = '@upbus/subscribedLines';
const ALL_LINES  = ['Red', 'Green', 'Blue'];

export function usePushToken() {
  const [token, setToken] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      const { data } = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : {}
      );
      tokenRef.current = data;
      setToken(data);
      await AsyncStorage.setItem(TOKEN_KEY, data);

      const raw = await AsyncStorage.getItem(LINES_KEY);
      const lines = raw ? JSON.parse(raw) : ALL_LINES;
      await registerPushToken(data, lines);
    })().catch(console.error);
  }, []);

  async function updateLines(lines: string[]) {
    await AsyncStorage.setItem(LINES_KEY, JSON.stringify(lines));
    if (tokenRef.current) await registerPushToken(tokenRef.current, lines);
  }

  return { token, updateLines };
}
