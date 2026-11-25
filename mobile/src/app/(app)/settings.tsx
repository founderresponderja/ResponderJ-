import { useClerk, useUser } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, View } from 'react-native';

import { Cabecalho, Text } from '@/components/ui';
import { colors, espaco } from '@/theme';

function Linha({ titulo, valor, perigo, onPress }: { titulo: string; valor?: string; perigo?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.linha }}>
      <Text style={perigo ? { color: colors.perigo } : undefined}>{titulo}</Text>
      {valor ? <Text style={{ color: colors.textoSecundario }}>{valor}</Text> : null}
    </Pressable>
  );
}

function Seccao({ titulo }: { titulo: string }) {
  return <Text style={{ fontSize: 12, color: colors.textoSecundario, marginTop: espaco.lg }}>{titulo}</Text>;
}

// Maqueta 5. Notificações (RJ-11.4) e "Apagar a minha conta" dentro da app (RJ-11.5) chegam depois.
export default function Definicoes() {
  const { signOut } = useClerk();
  const { user } = useUser();

  return (
    <>
      <Cabecalho titulo="Definições" subtitulo={user?.primaryEmailAddress?.emailAddress} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.fundo }} contentContainerStyle={{ paddingHorizontal: espaco.lg, paddingBottom: espaco.xl }}>
        <Seccao titulo="Conta" />
        <Linha titulo="Planos" valor="Ver no site ›" onPress={() => WebBrowser.openBrowserAsync('https://www.responderja.pt/')} />
        <Seccao titulo="Privacidade e dados" />
        <View>
          <Linha titulo="Terminar sessão" onPress={() => signOut()} />
        </View>
      </ScrollView>
    </>
  );
}
