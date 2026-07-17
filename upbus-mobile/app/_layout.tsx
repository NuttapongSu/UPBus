import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, TextInput } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Mitr_300Light, Mitr_400Regular, Mitr_500Medium, Mitr_600SemiBold, Mitr_700Bold } from '@expo-google-fonts/mitr';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import PreloadScreen from '../components/PreloadScreen';
import { SlowLoadContext } from '../lib/slowLoadContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Mitr_300Light,
    Mitr_400Regular,
    Mitr_500Medium,
    Mitr_600SemiBold,
    Mitr_700Bold,
  });
  const [appReady, setAppReady] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);

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

  if (!appReady) {
    return (
      <>
        <StatusBar style="light" />
        <PreloadScreen
          onReady={({ slowLoad }) => {
            setSlowLoad(slowLoad);
            setAppReady(true);
          }}
        />
      </>
    );
  }

  return (
    <SlowLoadContext.Provider value={slowLoad}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SlowLoadContext.Provider>
  );
}
