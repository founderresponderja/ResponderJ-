# Apps Responder Já (iPhone e Android): decisões e plano

Atualizado a 25/11/2026. Tarefas no Notion: RJ-10.x (contas das lojas), RJ-11.x (apps), RJ-12.x (testes e publicação). Lançamento previsto das apps: 08/02/2027 (cronograma de 25/11/2026).

## Decisões
| Decisão | Data | Porquê |
|---|---|---|
| Contas das lojas em **nome individual** (empresário em nome individual, sem NIPC) — RJ-10.1 | 24/11/2026 | Fiscalmente mais favorável no arranque. Muda-se para empresa mais tarde; o Google permite converter a conta pessoal em conta de organização. |
| Tecnologia: **Expo (React Native)** — RJ-11.1 | 25/11/2026 | A mesma linguagem do site e do The Playroom; compila na nuvem (sem Mac); login do Clerk com SDK oficial; evita o risco de rejeição da Apple de uma app que é só o site numa moldura (regra 4.2). Afastadas: React Native sem Expo, Capacitor, Flutter, nativas (Swift e Kotlin), PWA (só como complemento). |
| **Identidade visual igual à do site**, incluindo o tipo de letra Max | 25/11/2026 | Quem usa o site reconhece a app. |
| **Sem pagamentos dentro da app** | 25/11/2026 | Os planos compram-se na web (Stripe). Com conta pessoal, o Google Play só mostra a morada completa do programador se a app vender na loja. |

## Consequências da conta em nome individual
- **Google Play:** uma conta pessoal nova tem de fazer um teste fechado com pelo menos 12 testers inscritos durante 14 dias seguidos antes de publicar (RJ-10.4). Convidar 15 a 20 pessoas, porque se alguém sair a contagem recomeça.
- **Google Play:** mostra publicamente o nome legal, o país e o email de programador.
- **Apple:** a app aparece com o nome legal do Luís como vendedor.

## Arquitetura
- Pasta `mobile/` neste repositório, com projeto e dependências próprios. Excluída da compilação do site (`tsconfig.json`) e da Vercel (`.vercelignore`).
- **Servidor:** o mesmo da web (`https://www.responderja.pt/api`). O `requireAuth` (`server/auth.ts`) já aceita o token do Clerk em `Authorization: Bearer …`, por isso a app não precisa de rotas novas para começar.
- **Login:** Clerk com o SDK para Expo (`@clerk/expo` 4.x), mesma instância de produção do site. Ecrã próprio (como na maqueta): Google, ou email com código; se o email não tem conta, pede palavra-passe (obrigatória nesta instância) e confirma o email com código.
- **Estilos:** `mobile/src/theme.ts` com as mesmas cores de `tailwind.config.cjs` (Petróleo, Pedra e Ouro) e estilos do próprio React Native. O NativeWind ficou de fora na RJ-11.2: é mais uma peça a manter e a compatibilidade com o Expo 58 não estava garantida. Se o site mudar uma cor, muda-se também em `theme.ts`.
- **Apagar conta dentro da app** (obrigatório na Apple): usa a rota existente `POST /api/account/delete`.
- **Notificações push** (RJ-11.4): Expo Notifications; precisa de uma rota nova para guardar o token do telemóvel.

## Ecrãs da primeira versão (maquetas aprovadas pelo Luís a 25/11/2026)
1. Entrar / criar conta (Clerk)
2. Caixa de entrada: lista de avaliações, filtros, puxar para atualizar
3. Avaliação: gerar resposta com IA, editar, aprovar e publicar (ou modo assistido: copiar, abrir a plataforma, "Já publiquei")
4. Plataformas: estado das ligações (só leitura; ligar contas continua na web)
5. Definições: conta, negócio, notificações, apagar conta
6. Planos: informação e link para a web (sem pagamentos na app)

Barra de baixo com 3 separadores: Caixa de entrada, Plataformas e Definições. Planos fica dentro de Definições.

## Decisão de 26/11/2026: app completa, sem abrir o site
- **Nível 1 (agora):** a app nunca abre o site do Responder Já. Ligar plataformas, conta e planos ficam dentro da app; as avaliações ficam guardadas no telemóvel para abrir sem internet; respostas escritas sem rede seguem quando a rede voltar. A app continua a usar o servidor do Responder Já (a mesma conta do site). Ligar Google/Facebook mostra a página de login deles numa janela dentro da app (regra do Google e da Meta).
- **Planos:** só informação na app (plano atual e planos disponíveis). A compra e a mudança de plano fazem-se no site, no computador. Sem compras dentro da app.
- **Nível 2 (versão 2.0):** servidor próprio para as apps, à parte do site, e erros das apps separados no separador "Saúde da app" do super administrador (origem e versão da app). Tarefa própria no Notion.
- **Rejeitado:** app sem servidor nenhum (chaves dentro da app, créditos sem controlo, sem sincronização automática, sem equipa da Agência).

## Login com Google na app
- Endereço de regresso autorizado no Clerk (produção): `responderja://sso-callback`.

## Recursos
- Tipo de letra Max em OTF: `mobile/assets/fonts/Max-Regular.otf` (recebido a 25/11/2026). Não tem o símbolo €.
- Ícones de 1024×1024 px: `mobile/assets/images/icon.png` (fundo petróleo) e `adaptive-icon.png` (Android, fundo transparente). Original em `icon.svg`.
- Ecrã de arranque: ícone sobre o fundo `#F4F1EC` (Pedra 100).

## Antes de testar num telemóvel (Luís, nas consolas)
- **Clerk → Native applications:** ligar a *Native API* da instância de produção. Hoje está desligada e, sem ela, o login na app não funciona.
- **Sign in with Apple (regra 4.8 da Apple):** se a app no iPhone tiver "Continuar com Google", a Apple exige também "Iniciar sessão com a Apple". Precisa da conta Apple Developer (RJ-10.2); fica para a RJ-11.5.

## Ordem de trabalho
1. RJ-10.2 e RJ-10.3: o Luís cria as contas Apple Developer (99 USD por ano) e Google Play Console (25 USD, pagamento único). A verificação de identidade pode demorar dias.
2. RJ-11.2: base da app (projeto Expo, login Clerk, ligação à API, cores e tipo de letra). **Precisa de uma sessão com instalação de pacotes** (npm).
3. RJ-11.3: ecrãs principais.
4. RJ-11.4: notificações push e links diretos.
5. RJ-11.5: regras das lojas (apagar conta, fichas de privacidade, sem pagamentos na app).
6. RJ-10.4 + RJ-12.1: teste fechado do Google (12 testers, 14 dias) e TestFlight da Apple.
7. RJ-12.2: fichas das lojas (imagens e textos PT/EN), submissão e revisão.
