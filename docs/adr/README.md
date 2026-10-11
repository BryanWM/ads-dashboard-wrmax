# Registro de decisões arquiteturais (ADR)

Formato curto: contexto → decisão → consequências. Novas decisões entram no fim com o
próximo número; decisões substituídas são marcadas, não apagadas.

## ADR-001 — Monólito modular Next.js + Supabase

- **Contexto**: MVP comercial, equipe pequena, necessidade de auth, RLS e cron.
- **Decisão**: um único app Next.js (App Router) na Vercel; Supabase para Postgres e Auth.
- **Consequências**: um deploy, um pipeline. Separação lógica via `src/server/*`. Se o
  volume de sync crescer, o motor pode migrar para um worker sem mudar o modelo de dados.

## ADR-002 — Acesso a dados via supabase-js com JWT do usuário

- **Contexto**: isolamento entre organizações é requisito crítico.
- **Decisão**: leituras da UI usam o client do Supabase com a sessão do usuário; a RLS é
  a barreira final. A _service role_ só é usada em `src/server/sync` e em ações admin
  específicas, sempre após verificação de papel na DAL.
- **Consequências**: sem ORM com conexão privilegiada; tipos gerados por
  `supabase gen types`.

## ADR-003 — Agendamento: Vercel Cron + fila em tabela

- **Contexto**: sync diário, independente de navegador; plano Hobby permite 1 cron/dia.
- **Decisão**: `vercel.json` agenda `GET /api/cron/sync`; o handler enfileira jobs por
  conta e processa com orçamento de tempo; jobs restantes ficam `queued`.
- **Consequências**: no Pro, um cron extra de drenagem a cada 15 min habilita retries
  rápidos. Caminho de evolução: Inngest/Trigger.dev.

## ADR-004 — Tokens cifrados na aplicação, schema `private`

- **Contexto**: tokens da Meta não podem vazar para navegador, repo ou logs.
- **Decisão**: AES-256-GCM com chave `TOKEN_ENCRYPTION_KEY` (env, servidor),
  `key_version` para rotação; tabela em schema não exposto pelo PostgREST.
- **Consequências**: a chave precisa de backup seguro; perda = reconectar contas.

## ADR-005 — Motion for React para animações de UI; HyperFrames só para vídeo

- **Contexto**: requisito de UI fluida; HyperFrames é um renderizador de vídeo.
- **Decisão**: `motion` para a UI; HyperFrames isolado em `video-reports/` (fase opcional).
- **Consequências**: nenhuma dependência de Chrome/FFmpeg no app principal.

## ADR-007 — shadcn/ui sobre Base UI com preset `rhea`

- **Contexto**: shadcn CLI 4 exige escolher a base (Base UI, Radix ou React Aria) e um
  preset de estilo.
- **Decisão**: Base UI (padrão recomendado) + `rhea` (visual macOS-like com densidade de
  produto). Mantemos as pílulas do preset em vez de alterar raio arquivo por arquivo.
- **Consequências**: composição usa `render={<Button />}`; documentação de componentes em
  `ui.shadcn.com/docs/components/base/*`. Ajustes de identidade ficam em tokens
  (`globals.css`) e em poucos pontos dos primitivos (card, dialog, menu, chart).

## ADR-008 — WRMax Design System como fonte da identidade visual

- **Contexto**: a agência tem um design system próprio (artefato "WRMax Design System":
  escuro premium, ouro como detalhe, Sora/Inter/JetBrains Mono, curva macOS).
- **Decisão**: substituir a identidade provisória da Fase 3 pelos tokens do DS; tema
  único escuro (o DS não define claro); `next-themes` removido; raios remapeados via
  `--radius: 10px`; status como ponto + texto; nada anima no carregamento.
- **Consequências**: o requisito de tema claro fica pendente de uma definição no DS. Os
  tokens vivem em `globals.css` espelhando `tokens.json`; mudanças de marca começam no DS.

## ADR-006 — Alcance deduplicado por snapshots de períodos-padrão

- **Contexto**: alcance não é aditivo entre dias.
- **Decisão**: gravar alcance deduplicado para presets do filtro; intervalos
  personalizados exibem alcance/frequência como indisponíveis.
- **Consequências**: mais chamadas por sync (uma por preset/conta), aceitável no volume do MVP.
