# Reporte de erros por email (RJ-5.6)

Na app, o reporte de erros já funciona sem configuração extra. Esta página explica como ligar também a receção por email: o cliente escreve para um endereço de suporte, e o Resend entrega esse email à Responder Já.

Os nomes dos ecrãs do Resend ficam em inglês, como aparecem no site.

## 1. Escolher um subdomínio só para receber

Use um subdomínio, por exemplo `suporte.responderja.pt`, e um endereço como `erros@suporte.responderja.pt`.

Não use o domínio principal `responderja.pt` para receber. Se o fizer, todo o email desse domínio passa a ir para o Resend, incluindo caixas de correio que já existam.

## 2. No Resend

1. Abra **Domains → Add Domain** e adicione `suporte.responderja.pt`, com a receção de email ligada (**Receiving**).
2. O Resend mostra os registos DNS a criar: **MX** e os de verificação.
3. Abra **Webhooks → Add Webhook** e preencha:
   - **Endpoint URL**: `https://www.responderja.pt/api/incidents/inbound-email`
   - **Events**: `email.received`
4. Copie o **Signing secret** (começa por `whsec_`).

## 3. No Dominios.pt

Crie os registos que o Resend mostrou para o subdomínio `suporte`.

Lembre-se da regra do Dominios.pt: os registos **TXT** levam o valor entre aspas; os **MX** não.

## 4. Na Vercel (Settings → Environment Variables, Production)

| Variável | Valor |
| --- | --- |
| `RESEND_INBOUND_WEBHOOK_SECRET` | O **Signing secret** do passo 2 |
| `RESEND_INBOUND_API_KEY` | Uma chave do Resend com permissão **Full access** (API Keys → Create API Key). A chave de envio (`RESEND_API_KEY`, "Sending access") não consegue ler os emails recebidos (erro 401). |

Coloque o valor diretamente na Vercel. Não o cole no chat. Depois faça **Redeploy**.

`RESEND_API_KEY` já existe. É usada para ir buscar o texto e as imagens do email, porque o aviso do Resend não os traz.

## 5. Testar

Envie um email para `erros@suporte.responderja.pt` com uma imagem anexada. Deve acontecer o seguinte:
- o reporte aparece no backoffice, no separador **Erros**, marcado "por email";
- quem enviou recebe um email com o prazo estimado.

## Regras aplicadas aos emails

- Só se aceitam até 2 imagens JPEG, PNG ou WebP, com no máximo 1 MB cada. Outros anexos ficam de fora, e isso fica anotado no reporte.
- Se o remetente tiver conta na app, o reporte fica ligado a essa conta.
- O mesmo email nunca cria dois reportes, mesmo que o Resend repita o aviso.
