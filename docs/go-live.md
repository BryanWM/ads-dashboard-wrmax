# Roteiro de produção (conta da empresa)

Hoje o projeto roda num Supabase **de testes** (conta pessoal). A produção será um projeto
novo na conta da empresa. Nada de produção deve passar pelo computador de desenvolvimento
(ADR-012).

## Enquanto estiver em testes

- O token da Meta usado para testar dá acesso a **uma conta de anúncio só** (da WRMax ou de
  teste), nunca a todas as dos clientes.
- `.env.local`: chaves do Supabase de testes, `TOKEN_ENCRYPTION_KEY` de teste e
  `META_APP_SECRET` vazio, a não ser que a Meta exija `appsecret_proof`.
- Ao terminar os testes: **revogar o token** (Business Manager → Usuários do sistema →
  Revogar tokens).

## Virada para a conta da empresa

1. Criar o projeto Supabase da empresa. No SQL Editor, rodar todas as migrações de
   `supabase/migrations` em ordem e depois `supabase/tests/rls_isolation.sql`, que deve
   terminar com "OK".
2. Criar o usuário administrador (Authentication → Add user, Auto Confirm).
3. Rodar `pnpm db:seed --admin-email <e-mail> --no-demo` com as variáveis da empresa **só
   para este comando**. Ele cria a agência e o administrador, sem dados de demonstração.
   Depois, apagar essas variáveis da máquina.
4. Na Vercel da empresa, cadastrar as variáveis:

   | Variável                               | Tipo   |
   | -------------------------------------- | ------ |
   | `NEXT_PUBLIC_SUPABASE_URL`             | Config |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Config |
   | `SUPABASE_SECRET_KEY`                  | Secret |
   | `TOKEN_ENCRYPTION_KEY` (nova)          | Secret |
   | `META_APP_SECRET`                      | Secret |
   | `META_APP_ID`                          | Config |
   | `META_GRAPH_API_VERSION` (`v25.0`)     | Config |
   | `CRON_SECRET` (nova, ≥ 16 caracteres)  | Secret |

   Sem `CRON_SECRET` o agendador diário (`vercel.json`) recebe 401 e nada é atualizado
   sozinho. Gere com `openssl rand -hex 24`.

   Guardar `TOKEN_ENCRYPTION_KEY` e `SUPABASE_SECRET_KEY` também no gerenciador de senhas
   da empresa.

5. Meta: **redefinir a chave secreta do app** se ela passou por máquina pessoal. Gerar um
   **token novo** do usuário do sistema com as contas dos clientes e colar **só no site de
   produção** (Integrações → Conectar Meta).
6. Associar as contas aos clientes, rodar "Buscar dados" e conferir com o Gerenciador de
   Anúncios.

## Se uma máquina ou pessoa sair do projeto

Girar a secret key do Supabase, a `TOKEN_ENCRYPTION_KEY` (depois, reconectar a Meta) e o
token do usuário do sistema.
