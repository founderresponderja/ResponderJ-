import { useSignIn, useSignUp, useSSO } from '@clerk/expo';
import * as AuthSession from 'expo-auth-session';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao, Campo, Text } from '@/components/ui';
import { errorCode, mensagemDeErro } from '@/lib/errors';
import { colors, espaco } from '@/theme';

// Um só ecrã para entrar ou criar conta (como no site):
// Google, ou email com código. Se o email ainda não tem conta, pede uma palavra-passe
// (obrigatória nesta instância do Clerk) e confirma o email com um código.
type Passo = 'email' | 'codigo' | 'criar' | 'codigoRegisto';

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [passo, setPasso] = useState<Passo>('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [palavraPasse, setPalavraPasse] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aCarregar, setACarregar] = useState(false);

  async function correr(acao: () => Promise<void>) {
    setErro(null);
    setACarregar(true);
    try {
      await acao();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setACarregar(false);
    }
  }

  const entrarComGoogle = () =>
    correr(async () => {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) await setActive({ session: createdSessionId });
    });

  const enviarCodigo = () =>
    correr(async () => {
      const emailLimpo = email.trim();
      if (!emailLimpo.includes('@')) {
        setErro('Escreva o seu email.');
        return;
      }
      const { error } = await signIn.emailCode.sendCode({ emailAddress: emailLimpo });
      if (error) {
        if (errorCode(error) === 'form_identifier_not_found') {
          setPasso('criar');
          return;
        }
        throw error;
      }
      setCodigo('');
      setPasso('codigo');
    });

  const confirmarCodigo = () =>
    correr(async () => {
      const { error } = await signIn.emailCode.verifyCode({ code: codigo.trim() });
      if (error) throw error;
      if (signIn.status === 'complete') {
        const { error: erroFinal } = await signIn.finalize();
        if (erroFinal) throw erroFinal;
      } else {
        setErro('A sua conta pede um passo extra. Entre pelo site para o concluir.');
      }
    });

  const criarConta = () =>
    correr(async () => {
      if (palavraPasse.length < 8) {
        setErro('A palavra-passe tem de ter pelo menos 8 caracteres.');
        return;
      }
      const { error } = await signUp.password({ emailAddress: email.trim(), password: palavraPasse });
      if (error) throw error;
      const { error: erroEnvio } = await signUp.verifications.sendEmailCode();
      if (erroEnvio) throw erroEnvio;
      setCodigo('');
      setPasso('codigoRegisto');
    });

  const confirmarRegisto = () =>
    correr(async () => {
      const { error } = await signUp.verifications.verifyEmailCode({ code: codigo.trim() });
      if (error) throw error;
      if (signUp.status === 'complete') {
        const { error: erroFinal } = await signUp.finalize();
        if (erroFinal) throw erroFinal;
      } else {
        setErro('Falta um passo para criar a conta. Tente pelo site.');
      }
    });

  const voltar = () => {
    setErro(null);
    setPasso('email');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.marcaEscura }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, padding: espaco.xl, paddingTop: insets.top + espaco.xxl, paddingBottom: insets.bottom + espaco.xl }}>
        <Image
          source={require('../../../assets/images/icon.png')}
          accessibilityIgnoresInvertColors
          style={{ width: 112, height: 112, borderRadius: 26, alignSelf: 'center', marginBottom: espaco.lg }}
        />
        <Text style={{ color: '#FFFFFF', fontSize: 26, textAlign: 'center' }}>Responder Já</Text>
        <Text style={{ color: '#C9D6D7', fontSize: 14, textAlign: 'center', marginTop: espaco.xs }}>
          Responda às avaliações em segundos
        </Text>

        <View style={{ marginTop: espaco.xxl, gap: espaco.md }}>
          {passo === 'email' && (
            <>
              <Botao titulo="Continuar com Google" variante="contorno" escuro onPress={entrarComGoogle} aCarregar={aCarregar} />
              <Campo
                rotulo="Email"
                rotuloClaro
                value={email}
                onChangeText={setEmail}
                placeholder="nome@empresa.pt"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
              />
              <Botao titulo="Continuar" variante="destaque" onPress={enviarCodigo} aCarregar={aCarregar} />
            </>
          )}

          {passo === 'codigo' && (
            <>
              <Text style={{ color: '#FFFFFF' }}>Enviámos um código para {email.trim()}.</Text>
              <Campo
                rotulo="Código"
                rotuloClaro
                value={codigo}
                onChangeText={setCodigo}
                placeholder="123456"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
              />
              <Botao titulo="Entrar" variante="destaque" onPress={confirmarCodigo} aCarregar={aCarregar} />
            </>
          )}

          {passo === 'criar' && (
            <>
              <Text style={{ color: '#FFFFFF' }}>Ainda não há conta com {email.trim()}. Escolha uma palavra-passe para a criar.</Text>
              <Campo
                rotulo="Palavra-passe"
                rotuloClaro
                value={palavraPasse}
                onChangeText={setPalavraPasse}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />
              {/* Proteção contra robôs do Clerk (obrigatória nos registos). */}
              <View nativeID="clerk-captcha" />
              <Botao titulo="Criar conta" variante="destaque" onPress={criarConta} aCarregar={aCarregar} />
            </>
          )}

          {passo === 'codigoRegisto' && (
            <>
              <Text style={{ color: '#FFFFFF' }}>Enviámos um código para {email.trim()} para confirmar o email.</Text>
              <Campo
                rotulo="Código"
                rotuloClaro
                value={codigo}
                onChangeText={setCodigo}
                placeholder="123456"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
              />
              <Botao titulo="Confirmar e entrar" variante="destaque" onPress={confirmarRegisto} aCarregar={aCarregar} />
            </>
          )}

          {erro ? (
            <Text accessibilityLiveRegion="polite" style={{ color: '#F7B7A8', fontSize: 14 }}>
              {erro}
            </Text>
          ) : null}

          {passo !== 'email' && (
            <Pressable accessibilityRole="button" onPress={voltar} style={{ paddingVertical: espaco.sm }}>
              <Text style={{ color: '#C9D6D7', textAlign: 'center', fontSize: 14 }}>Usar outro email</Text>
            </Pressable>
          )}
        </View>

        <Text style={{ color: '#9FB9BB', fontSize: 12, textAlign: 'center', marginTop: 'auto', paddingTop: espaco.xl, lineHeight: 18 }}>
          Ao continuar, aceita os Termos e a Política de privacidade do Responder Já.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
