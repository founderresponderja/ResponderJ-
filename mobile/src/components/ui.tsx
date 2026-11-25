import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text as RNText,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { alturaControlo, colors, espaco, fonte, raio } from '@/theme';

export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={[{ fontFamily: fonte, color: colors.texto, fontSize: 16 }, style]} />;
}

type Variante = 'principal' | 'destaque' | 'contorno';

export function Botao({
  titulo,
  onPress,
  variante = 'principal',
  aCarregar = false,
  escuro = false,
  style,
}: {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  aCarregar?: boolean;
  /** Botão de contorno sobre fundo escuro (ecrã de entrada). */
  escuro?: boolean;
  style?: ViewStyle;
}) {
  const fundo = variante === 'principal' ? colors.marca : variante === 'destaque' ? colors.destaque : 'transparent';
  const corTexto =
    variante === 'principal' ? '#FFFFFF' : variante === 'destaque' ? colors.marcaEscura : escuro ? '#FFFFFF' : colors.marca;
  const borda = variante === 'contorno' ? (escuro ? '#9FB9BB' : colors.marca) : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: aCarregar }}
      onPress={aCarregar ? undefined : onPress}
      style={({ pressed }) => [
        {
          height: alturaControlo,
          borderRadius: raio.controlo,
          backgroundColor: fundo,
          borderWidth: 1.5,
          borderColor: borda,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}>
      {aCarregar ? <ActivityIndicator color={corTexto} /> : <Text style={{ color: corTexto }}>{titulo}</Text>}
    </Pressable>
  );
}

export function Campo({ rotulo, rotuloClaro, ...props }: TextInputProps & { rotulo: string; rotuloClaro?: boolean }) {
  return (
    <View style={{ gap: espaco.xs }}>
      <Text style={{ fontSize: 13, color: rotuloClaro ? '#C9D6D7' : colors.textoSecundario }}>{rotulo}</Text>
      <TextInput
        placeholderTextColor={colors.textoSecundario}
        {...props}
        style={[
          {
            height: alturaControlo,
            borderRadius: raio.controlo,
            borderWidth: 1,
            borderColor: colors.linha,
            backgroundColor: '#FFFFFF',
            paddingHorizontal: 14,
            fontFamily: fonte,
            fontSize: 16,
            color: colors.texto,
          },
          props.style,
        ]}
      />
    </View>
  );
}

/** Cabeçalho petróleo com título e subtítulo, como nas maquetas aprovadas. */
export function Cabecalho({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: colors.marca, paddingTop: insets.top + espaco.md, paddingBottom: 14, paddingHorizontal: espaco.lg }}>
      <Text style={{ color: '#FFFFFF', fontSize: 20 }}>{titulo}</Text>
      {subtitulo ? <Text style={{ color: '#FFFFFF', opacity: 0.85, fontSize: 13, marginTop: 2 }}>{subtitulo}</Text> : null}
    </View>
  );
}

export function Cartao({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View
      style={[
        { backgroundColor: colors.cartao, borderRadius: raio.cartao, borderWidth: 1, borderColor: colors.linha, padding: 14 },
        style,
      ]}>
      {children}
    </View>
  );
}
