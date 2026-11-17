# Migrações da base de dados

Desde a RJ-1.5 (17/11/2026), todas as alterações ao esquema da base de dados seguem este caminho. Nada se aplica à mão no SQL Editor do Neon.

## Como funciona

1. Cada alteração é um ficheiro `.sql` na pasta `migrations/`.
2. Na compilação de **produção** da Vercel, `npm run build` corre primeiro `scripts/migrate.mjs --auto`. Este passo aplica, por ordem de nome, os ficheiros que ainda não estão na tabela `schema_migrations`.
3. As migrações correm **antes** de o código novo ficar ativo. Se uma falhar, a compilação para e o site continua na versão anterior.
4. As pré-visualizações (preview) e as compilações locais **não** tocam na base de dados.

## Regras

- **Nome do ficheiro:** `AAAAMMDD_NN_descricao.sql`, por exemplo `20261117_01_foreign_keys_reviews.sql`. `NN` ordena os ficheiros do mesmo dia.
- **Nunca editar uma migração já aplicada.** O executor guarda um checksum (uma impressão digital do conteúdo) de cada ficheiro e para a compilação se um ficheiro aplicado mudar. Para corrigir alguma coisa, cria um ficheiro novo.
- **Compatível com o código que está em produção.** A migração corre enquanto o código antigo ainda está a servir:
  - Acrescentar uma coluna ou tabela é seguro.
  - Remover ou mudar o nome de uma coluna faz-se em dois passos: primeiro um deploy em que o código deixa de a usar, e só no deploy seguinte a migração que a remove.
  - Uma coluna `NOT NULL` nova precisa de um `DEFAULT`.
- **Transação:** cada ficheiro corre dentro de uma transação, por isso ou se aplica por inteiro ou não se aplica nada. Para instruções que não podem correr numa transação (por exemplo `CREATE INDEX CONCURRENTLY`), a primeira linha do ficheiro tem de ser `-- migrate:no-transaction`.
- **Esquema do Drizzle:** quem altera `shared/schema.ts` cria também a migração correspondente no mesmo PR. O Drizzle pede à base de dados todas as colunas do esquema, por isso uma coluna que esteja no esquema e não exista na base de dados parte o site.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run db:migrate:status` | Mostra as migrações aplicadas e as pendentes, sem alterar nada (precisa de `DATABASE_URL`) |
| `npm run db:migrate` | Aplica as pendentes a partir de um computador (normalmente não é preciso) |

## Antes de uma migração arriscada

Cria um ramo de segurança no Neon (**Branches → New Branch**, a partir do ramo de produção, com a opção **Head**).

## Histórico

- `drizzle/` tem migrações antigas, geradas pelo `drizzle-kit`. Está congelada e não volta a ser usada. `npm run db:generate` pode servir para ver a diferença do esquema como rascunho, mas o ficheiro final é escrito à mão em `migrations/`.
- Os três ficheiros de `migrations/` anteriores a 17/11/2026 foram aplicados à mão. Na primeira execução, o executor regista-os como aplicados sem os correr de novo (baseline).
