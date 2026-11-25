import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, espaco } from '@/theme';

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout() {
  // O plugin expo-font embute a letra nas compilações; useFonts cobre o Expo Go.
  const [fontesProntas, erroFontes] = useFonts({ 'Max-Regular': require('../../assets/fonts/Max-Regular.otf') });

  useEffect(() => {
    if (fontesProntas || erroFontes) SplashScreen.hideAsync();
  }, [fontesProntas, erroFontes]);

  if (!fontesProntas && !erroFontes) return null;

  if (!publishableKey) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: espaco.xl, backgroundColor: colors.fundo }}>
        <Text>Falta EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY no ficheiro .env (ver .env.example).</Text>
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <StatusBar style="light" />
      <Slot />
    </ClerkProvider>
  );
}
