import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, TextInput } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Mitr_300Light, Mitr_400Regular, Mitr_500Medium, Mitr_600SemiBold, Mitr_700Bold } from '@expo-google-fonts/mitr';
import { registerForPushNotificationsAsync } from '../lib/notifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Mitr_300Light,
    Mitr_400Regular,
    Mitr_500Medium,
    Mitr_600SemiBold,
    Mitr_700Bold,
  });

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  // Apply Mitr as default font for all Text and TextInput globally
  const defaultStyle = { fontFamily: 'Mitr_400Regular' };
  (Text as any).defaultProps = (Text as any).defaultProps ?? {};
  (Text as any).defaultProps.style = defaultStyle;
  (TextInput as any).defaultProps = (TextInput as any).defaultProps ?? {};
  (TextInput as any).defaultProps.style = defaultStyle;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
