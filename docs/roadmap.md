# Escopo do MVP e plano de implementação

## Escopo do MVP

**Dentro**

- Autenticação por e-mail/senha (Supabase Auth) e convites por e-mail.
- Multi-organização com papéis `owner`, `admin`, `analyst`, `client_viewer`.
- Admin: organizações, clientes, conexão Meta, seleção/associação de contas, status das
  integrações, histórico de sincronizações, falhas, acessos, auditoria.
- Cliente: dashboard (KPIs, comparação com período anterior, gráfico histórico),
  tabela de campanhas com ordenação/filtros, "atualizado em".
- Sync diário com reprocessamento de 28 dias, idempotente, com retries.
- Temas claro/escuro, responsivo, movimento reduzido.

**Fora (pós-MVP)**

- Níveis conjunto de anúncios / anúncio e criativos.
- Google Ads e TikTok Ads (a interface `AdPlatformProvider` já prevê).
- Exportação PDF/CSV (CSV simples pode entrar no fim do MVP se houver tempo).
- Relatórios em vídeo com HyperFrames.
- Cobrança/assinaturas.

## Fases

| Fase                 | Entregas                                                                                                | Critério de pronto                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1. Descoberta        | `docs/` (arquitetura, modelo, Meta, HyperFrames, design)                                                | Documentos revisados pelo usuário                       |
| 2. Fundação          | Next.js 16 + TS estrito, ESLint, Prettier, Vitest, git, `.env.example`, CI                              | `lint`, `typecheck`, `test` e `build` passam            |
| 3. Design system     | shadcn/ui inicializado e personalizado, tokens, temas, presets de movimento, página de catálogo interna | Catálogo renderiza nos dois temas, sem erros de console |
| 4. Interface         | Login, shell com sidebar, dashboard, campanhas, admin — **dados simulados rotulados**                   | Fluxos navegáveis, conferidos no navegador              |
| 5. Backend           | Migrações, RLS, DAL, Server Actions, seed simulado                                                      | Testes de isolamento entre organizações passam          |
| 6. Meta Ads          | OAuth/SUAT, cliente Graph API, mapeamento, erros                                                        | Consulta autorizada real conferida com o Gerenciador    |
| 7. Sincronização     | Cron, fila, retries, logs, estado "atualizado em"                                                       | Reexecução não duplica; falha preserva dados anteriores |
| 8. Validação         | Segurança, responsividade, acessibilidade, desempenho                                                   | Relatório de testes executados                          |
| 9. Implantação       | Vercel + Supabase, variáveis, cron, migrações, runbook                                                  | Deploy de produção com sync agendado                    |
| 10. (Opcional) Vídeo | Projeto `video-reports/` com HyperFrames                                                                | Avaliado separadamente                                  |

## Backlog

- **Validar com o Max os limites da Visão geral** (`src/lib/overview/signals.ts`): selo de
  saúde (até 20% acima da meta = Atenção), frequência alta (> 3,5) e custo "estável"
  (variação < 1%). Até lá, valem os valores assumidos.

## Dependências externas por fase

| Fase | O que o usuário precisa providenciar                                                                      |
| ---- | --------------------------------------------------------------------------------------------------------- |
| 2    | Repositório no GitHub (o CLI `gh` não está instalado no WSL)                                              |
| 5    | Projeto Supabase (URL, anon key, service role key)                                                        |
| 6    | App Business no Meta for Developers (App ID/Secret, `config_id`), acesso a uma conta de anúncios de teste |
| 9    | Projeto Vercel, `CRON_SECRET`, `TOKEN_ENCRYPTION_KEY`                                                     |
