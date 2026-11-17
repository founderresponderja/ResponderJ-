# Ligação ao Facebook (RJ-4.7)

A ligação está pronta no código:
- ler as recomendações (reviews) de uma página;
- responder como a página;
- apagar a resposta;
- escolher a página quando a pessoa gere várias;
- pedido de apagamento de dados da Meta.

Até a Meta aprovar a app, só funciona para as contas com papel na app da Meta e cujo email esteja em `FACEBOOK_TEST_EMAILS`. Os outros clientes continuam a ver "Em breve".

Os nomes dos ecrãs da Meta ficam em inglês, como aparecem no site. A Meta muda estes ecrãs com frequência; se algum nome não bater certo, procure o equivalente.

## 1. Criar a app na Meta (pode ser feito já, sem NIPC)

1. Entre em https://developers.facebook.com com a sua conta pessoal do Facebook e abra **My Apps → Create App**.
2. Escolha o caso de uso de gestão de páginas ou empresa (**Business**), dê o nome "Responder Já" e crie a app.
3. Adicione o produto **Facebook Login for Business**.
4. Em **Facebook Login for Business → Settings → Valid OAuth Redirect URIs**, ponha:
   `<APP_BASE_URL>/api/platforms/callback/facebook`
   Use exatamente o mesmo endereço que está em `APP_BASE_URL` na Vercel, por exemplo `https://www.responderja.pt/api/platforms/callback/facebook`.
5. Em **App settings → Basic**, preencha:
   - **Privacy Policy URL**: `https://www.responderja.pt/privacy`
   - **Terms of Service URL**: `https://www.responderja.pt/terms`
   - **User data deletion → Data deletion callback URL**: `<APP_BASE_URL>/api/platforms/facebook/data-deletion`
   - ícone e categoria.
6. Em **App roles → Roles**, quem criou a app já é administrador. Para mais pessoas de teste, adicione-as como **Testers**; cada uma tem de aceitar o convite no Facebook.

## 2. Variáveis na Vercel (Settings → Environment Variables, Production)

Coloque os valores diretamente na Vercel. Não os cole no chat.

| Variável | Valor |
| --- | --- |
| `FACEBOOK_APP_ID` | O **App ID** (App settings → Basic) |
| `FACEBOOK_APP_SECRET` | O **App Secret** (App settings → Basic → Show) |
| `FACEBOOK_TEST_EMAILS` | Emails das contas da Responder Já que podem testar, separados por vírgula |
| `FACEBOOK_REVIEWS_ENABLED` | Não criar já. Fica `true` só depois da aprovação da Meta |

Depois de gravar as variáveis, faça **Redeploy**.

## 3. Testar

1. Entre na Responder Já com uma conta cujo email esteja em `FACEBOOK_TEST_EMAILS`.
2. Abra **Plataformas → Facebook → Conectar** e faça login com a conta do Facebook que tem papel na app.
3. Se gerir várias páginas, escolha a página no cartão do Facebook.
4. Abra a **Caixa de entrada → Sincronizar**. As recomendações da página aparecem com a plataforma Facebook.
5. Gere uma resposta, aceite-a e publique-a. A resposta aparece como comentário da página na recomendação.
6. Cancelar a publicação apaga esse comentário.

## 4. Aprovação da Meta (quando o Claude avisar)

Só se pede a aprovação quando estas três condições estiverem cumpridas:
- empresa constituída, com NIPC;
- política de privacidade e termos publicados (GATE-3), incluindo o tratamento dos dados do Facebook;
- teste do passo 3 feito com sucesso.

Passos:
1. **Business Verification** da empresa no Meta Business Manager.
2. **App Review → Permissions and Features**: pedir **Advanced Access** para `pages_show_list`, `pages_read_engagement`, `pages_read_user_content` e `pages_manage_engagement`.
3. Para cada permissão, gravar um vídeo do fluxo: ligar o Facebook, sincronizar, gerar a resposta e publicá-la. Explicar que a permissão serve para responder às reviews da própria página.
4. Depois de aprovada, pôr a app em **Live** e criar `FACEBOOK_REVIEWS_ENABLED=true` na Vercel, seguido de Redeploy.
5. Atualizar a landing page e os planos: o Facebook passa a ter ligação direta.
