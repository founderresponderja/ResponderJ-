# Sofia (RJ-5.7)

A Sofia tem dois modos:

| Onde | Endereço | O que sabe e pode fazer |
|---|---|---|
| Página inicial, sem sessão | `/api/ai/chat` | Informação geral sobre o produto. |
| Dentro da app, com sessão | `/api/sofia/chat` | Sabe quem é a pessoa, consulta os dados dela e propõe ações. |

## Perfis

Perfis possíveis: super administrador, operador, dono de agência, membro de agência e cliente (`server/sofia/sofia-logic.ts → audienceFor`). Cada perfil só recebe as suas ferramentas (`toolNamesFor`). O servidor volta a confirmar o perfil antes de executar qualquer ferramenta.

## Ferramentas

- **Leitura** (`server/sofia/tools.ts`): correm no servidor e só veem o que a pessoa pode ver.
  - Cliente: resumo da conta, reviews por responder.
  - Backoffice: erros reportados, detalhe de um erro, procurar clientes, erros técnicos.
- **Alteração** (`propose_*`) e **navegação** (`navigate`): a Sofia **não executa**. Cria uma proposta com um botão "Confirmar" ou "Abrir". O clique chama o endereço da app que já existe, por isso as permissões, as validações e o registo de ações são os de sempre. Só os caminhos da lista em `isAllowedProposalPath` são aceites.
- **Segurança:** o texto de reviews, reportes e clientes é escrito por terceiros. Vai marcado como dados e as instruções da Sofia proíbem segui-lo como ordem.

## Base de conhecimento

Está em `server/sofia/knowledge.ts`, com texto curto e em português de Portugal. Os preços e limites são **gerados** a partir de `shared/plans.ts`, e as gravidades e prazos a partir de `incident-logic.ts`. Nunca escrever números à mão.

## Avisos proativos

`/api/sofia/nudges` calcula, sem usar IA, o que merece atenção:
- **Clientes:** ligação expirada, reviews negativas sem resposta há mais de 3 dias, créditos a acabar, período experimental a terminar.
- **Backoffice:** erros fora do prazo, erros críticos, erros a vencer nas próximas 24 horas, erros técnicos novos.

Os avisos aparecem num balão junto ao botão da Sofia e podem ser dispensados (ficam dispensados até ao dia seguinte).

## Acrescentar uma ação nova

1. Declarar a ferramenta em `tools.ts` (`declarations`).
2. Acrescentá-la a `toolNamesFor` no perfil certo.
3. Construir a proposta em `buildProposal`, validando os dados.
4. Acrescentar o caminho a `isAllowedProposalPath`.
5. Escrever o teste em `tests/sofia-logic.test.ts`.
