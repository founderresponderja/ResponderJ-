import { useUser } from '@clerk/expo';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { Cabecalho, Cartao, Text } from '@/components/ui';
import { useApi } from '@/lib/api';
import { colors, espaco } from '@/theme';

type Conta = { planId: string; status: string; creditsRemaining: number; creditsTotal: number };

const NOME_PLANO: Record<string, string> = { trial: 'Experiência', starter: 'Starter', pro: 'Pro', agency: 'Agência' };

// Base da app (RJ-11.2): prova que o login e a ligação à API funcionam.
// A lista de avaliações chega na RJ-11.3.
export default function CaixaDeEntrada() {
  const api = useApi();
  const { user } = useUser();
  const [conta, setConta] = useState<Conta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aAtualizar, setAAtualizar] = useState(false);

  const carregar = useCallback(async () => {
    setAAtualizar(true);
    setErro(null);
    try {
      setConta(await api<Conta>('/billing/me'));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Sem ligação ao servidor.');
    } finally {
      setAAtualizar(false);
    }
  }, [api]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <>
      <Cabecalho titulo="Caixa de entrada" subtitulo={user?.primaryEmailAddress?.emailAddress} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.fundo }}
        contentContainerStyle={{ padding: espaco.lg, gap: espaco.md }}
        refreshControl={<RefreshControl refreshing={aAtualizar} onRefresh={carregar} tintColor={colors.marca} />}>
        <Text style={{ fontSize: 12, color: colors.textoSecundario, textAlign: 'center' }}>Puxe para baixo para atualizar</Text>
        <Cartao>
          <Text style={{ fontSize: 13, color: colors.textoSecundario }}>Ligação ao Responder Já</Text>
          {erro ? (
            <Text style={{ color: colors.perigo, marginTop: espaco.xs }}>{erro}</Text>
          ) : conta ? (
            <Text style={{ color: colors.sucesso, marginTop: espaco.xs }}>
              Ligada · plano {NOME_PLANO[conta.planId] ?? conta.planId} ·{' '}
              {conta.creditsTotal === -1 ? 'créditos ilimitados' : `${conta.creditsRemaining} créditos`}
            </Text>
          ) : (
            <Text style={{ marginTop: espaco.xs }}>A ligar…</Text>
          )}
        </Cartao>
        <Cartao>
          <Text>As suas avaliações vão aparecer aqui.</Text>
          <Text style={{ fontSize: 14, color: colors.textoSecundario, marginTop: espaco.xs }}>
            A lista, os filtros e as respostas com IA chegam no próximo passo (RJ-11.3).
          </Text>
        </Cartao>
      </ScrollView>
    </>
  );
}
