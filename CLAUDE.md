@AGENTS.md

# WRMax Metrics — guia para agentes

SaaS multi-organização de métricas de tráfego pago (Meta Ads primeiro). Leia
`docs/architecture.md`, `docs/data-model.md` e `docs/roadmap.md` antes de mudanças
estruturais. Decisões em `docs/adr/README.md` — registre novas decisões lá.

## Ambiente

- O projeto vive no WSL (`/home/bryan/projects/WRMax/wrmax-metrics`). Rode comandos via
  `wsl -d ubuntu -- bash <script>`; pnpm 10, Node 22.
- `node_modules` do pnpm usa symlinks: para ler docs do Next, use `cat` via WSL.
- Não há Docker nem Supabase CLI local; `gh` não está instalado.

## Comandos

- `pnpm dev` · `pnpm build` · `pnpm check` (lint + typecheck + unit)
- `pnpm db:seed --admin-email <e-mail>`: agência + administrador + dados de demonstração
  (usa `SUPABASE_SECRET_KEY` do `.env.local`; nunca imprima valores do `.env.local`).
- Sem testes E2E (Playwright removido a pedido do usuário); valide telas no navegador.
- Banco: migrações em `supabase/migrations` são aplicadas pelo usuário no SQL Editor (sem
  CLI). Antes de entregar uma migração, valide no PGlite com `supabase/tests/rls_isolation.sql`.
- Modo Supabase (env presente) × modo demonstração (sem env): ADR-010. Com Supabase, o
  login real passa pela internet — não faça login no lugar do usuário; peça que ele teste.

## Next.js 16.4 — regras que diferem do conhecimento antigo

- `cacheComponents` e `partialPrefetching` estão ligados.
- **`proxy.ts`** (em `src/`) substitui `middleware.ts`; runtime Node fixo. Só para
  checagens otimistas e refresh de sessão — nunca como única barreira de autorização.
- `export const dynamic | revalidate | fetchCache | dynamicParams` **quebram o build**.
  Permitidos: `maxDuration`, `instant`. Edge runtime não é suportado.
- `cookies()`, `headers()`, `params`, `searchParams`, DB e `new Date()` em páginas
  precisam estar dentro de `<Suspense>` (ou em `"use cache"` quando não dependem do
  request). Não faça `await` da sessão no topo de um layout.
- Route Handlers `GET` são pré-renderizados se não lerem dados do request: no cron, leia
  o header `authorization` **antes** de qualquer `try/catch` (o bail-out lança exceção).
- `usePathname`/`useParams` em layouts compartilhados exigem `<Suspense>` na folha.
- `<Activity>` mantém rotas ocultas montadas: no logout use navegação completa.
- Tema: não leia cookie no `<html>` do root layout (torna tudo dinâmico).

## Regras do projeto

- **Segurança**: código em `src/server/**` começa com `import "server-only"`. Tokens e
  segredos nunca no cliente, em logs, em chaves de cache ou no repositório. Toda Server
  Action reverifica sessão, papel e posse do recurso, e valida a entrada com Zod.
- **Isolamento**: leituras usam o client Supabase com o JWT do usuário (RLS). A service
  role só em `src/server/sync` e ações admin auditadas.
- **Métricas**: use `src/lib/metrics`. Nunca some/faça média de taxas; ausente é `null`,
  não zero; alcance não é aditivo; não misture moedas nem tipos de resultado.
- **Comparações** usam `comparableRanges` (dia a dia quando o período está incompleto).
- **Leitura de dados**: páginas usam `getDataSource()` (`src/server/data/source.ts`) e
  `resolveClientContext()`; nunca consultam a origem diretamente. Regras de métricas ficam
  em `src/lib/read-model` (compartilhado pelas origens simulada e Supabase). O `?client=` da URL só
  é aceito se estiver na lista de clientes visíveis do usuário.
- **Dados simulados** sempre exibem o badge "Dados simulados".
- **Identidade visual = WRMax Design System** (artefato
  https://claude.ai/artifact/FW7MMTqZpiYH5GFy6WtYvt; aplicação em `docs/design-system.md`).
  Tema único escuro; tokens WRMax como classes (`bg-superficie`, `text-texto-apagado`,
  `border-linha`, `chip-ouro`, `bg-ouro`, `etiqueta`). **Um** botão de ouro (`Button`
  padrão) por tela; secundário = `variant="outline"`. Status = `<StatusDot>` + texto
  neutro, nunca selo colorido. `dourado` nunca como fundo cheio. Branco puro nunca.
- **Movimento**: curva `EASE_MAC` e presets de `src/components/motion`; **nada anima no
  carregamento da página** — só em resposta a uma ação. Filtros/abas usam
  `SegmentedControl` (pílula deslizante).
- **UI**: primitivas em `src/components/ui` (shadcn sobre **Base UI**): compor com
  `render={<Button />}`, não `asChild`; rótulos de menu dentro de `DropdownMenuGroup`.
  Ao adicionar componentes (`pnpm dlx shadcn@4.21.4 add <nome>`), revise o arquivo e
  ajuste aos tokens WRMax (raios: `rounded-lg` controles, `rounded-xl` cards,
  `rounded-2xl` painéis). Gráficos: `--chart-1` (ouro) vs. `--chart-previous`.
- Utilitários CSS próprios usam `@utility` (Tailwind v4), não `@layer utilities`.
- Arquivos pequenos e com uma responsabilidade; não instale dependências redundantes.
- Não declare testes aprovados sem executá-los.
