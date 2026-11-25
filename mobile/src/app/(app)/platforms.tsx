import * as WebBrowser from 'expo-web-browser';
import { View } from 'react-native';

import { Botao, Cabecalho, Cartao, Text } from '@/components/ui';
import { colors, espaco } from '@/theme';

// Só consulta (maqueta 4). O estado de cada plataforma chega na RJ-11.3.
export default function Plataformas() {
  return (
    <>
      <Cabecalho titulo="Plataformas" />
      <View style={{ flex: 1, backgroundColor: colors.fundo, padding: espaco.lg, gap: espaco.md }}>
        <Cartao>
          <Text>O estado do Google, Facebook, TripAdvisor e Booking vai aparecer aqui.</Text>
        </Cartao>
        <Text style={{ fontSize: 13, color: colors.textoSecundario }}>
          Para ligar ou desligar plataformas, use o site responderja.pt.
        </Text>
        <Botao
          titulo="Abrir Plataformas no site"
          variante="contorno"
          onPress={() => WebBrowser.openBrowserAsync('https://www.responderja.pt/')}
        />
      </View>
    </>
  );
}
