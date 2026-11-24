# Cronograma diário

`gerar-cronograma.cjs` cria o cronograma do projeto em Word a partir das tarefas do Notion
(quadro "Responder Já", data source `collection://41ab764b-4802-8020-a47a-000bb4a97301`).

1. Exportar as tarefas (Tarefa, Estado, Prioridade, Esforço) para `tarefas.json`.
2. Atualizar `config.json`: `today`, `version`, gates, notas, "feito desde" e "à tua espera".
3. `NODE_PATH=$(npm root -g) node scripts/cronograma/gerar-cronograma.cjs tarefas.json scripts/cronograma/config.json Responder-Ja-Cronograma.docx`

Usado pela tarefa agendada diária até ao fim do projeto.
