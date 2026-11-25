import { useAuth } from '@clerk/expo';
import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';

import { colors } from '@/theme';

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/sign-in" />;

  return (
    <NativeTabs tintColor={colors.marca} backgroundColor="#FFFFFF">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Caixa de entrada</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="tray.fill" md="inbox" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="platforms">
        <NativeTabs.Trigger.Label>Plataformas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="link" md="link" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Definições</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
