# Extensão de Chrome do Responder Já (RJ-13.3)

Gera respostas às avaliações dentro do Google, Booking, Tripadvisor e Facebook, sem sair da página.

## Como funciona
1. Na app: **Extensão de Chrome → Criar chave** (a chave só é mostrada uma vez).
2. Na extensão: colar a chave e carregar em **Ligar**.
3. Na página da avaliação: selecionar o texto → botão direito → **Gerar resposta com Responder Já**
   (ou clicar no ícone da extensão com o texto selecionado).
4. Escolher uma das 3 respostas → **Inserir na página** (no campo onde estava o cursor) ou **Copiar**.

Cada geração gasta 1 crédito. As respostas saem na língua do cliente (RJ-13.4).

## Permissões (mínimas)
- `activeTab` + `scripting`: ler o texto selecionado e escrever a resposta **só quando a pessoa usa a extensão** nesse separador.
- `contextMenus`: o item do botão direito.
- `storage`: guardar a chave neste navegador.
- `host_permissions`: apenas `https://www.responderja.pt/*` (a API).

A extensão não lê páginas sozinha, não guarda o conteúdo das avaliações e não fala com mais nenhum servidor.

## Testar sem a loja
1. Chrome → `chrome://extensions` → ligar **Modo de programador**.
2. **Carregar expandida** → escolher esta pasta `extension/` (ou o ZIP descompactado).

## Publicar na Chrome Web Store (Luís)
1. Criar a conta de programador em https://chrome.google.com/webstore/devconsole (pagamento único).
2. Zipar o conteúdo desta pasta e carregar.
3. Ficha: descrição em português, capturas de ecrã 1280×800, ícone 128 px (`icons/icon-128.png`), política de privacidade `https://www.responderja.pt/privacy`.
4. Justificação das permissões: usar o texto acima.

## Acessibilidade (RJ-A11Y.2)
- Tudo funciona só com teclado (Tab, Enter); o foco é sempre visível (contorno dourado).
- Leitores de ecrã: campos com nome, erros associados ao campo, anúncio de "A gerar…" e de "3 respostas prontas", e cada resposta identificada ("Resposta 1 de 3, curta").
- Depois de gerar, o foco passa para a primeira resposta.
- Contraste do texto ≥ 4,5:1 em todos os pares de cores (WCAG 2.2 AA).
- Respeita "reduzir movimento" do sistema.
