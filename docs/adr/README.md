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

## ADR-009 — Dois papéis: agência e cliente

- **Contexto**: o produto terá só dois tipos de pessoa: a agência (dono/administrador) e o
  cliente final, que é o próprio cliente — não escolhe entre clientes.
- **Decisão**: `membership_role` = `admin` | `client`. O usuário `client` pertence a
  exatamente um cliente (`memberships.client_id`, obrigatório para `client` e nulo para
  `admin`). Substitui `owner`/`analyst`/`client_viewer` e a tabela `client_members`.
- **Consequências**: RLS mais simples (`can_view_client` compara um único id). Se um dia
  houver equipe com acesso parcial ou um usuário com vários negócios, volta-se a uma
  tabela de vínculo — mudança de schema, não de telas.

## ADR-010 — Modo Supabase × modo demonstração e um único read model

- **Contexto**: o app precisa funcionar com o banco real (Fase 5) sem perder a demonstração
  offline usada para revisar telas, e as regras de métricas não podem ser duplicadas.
- **Decisão**: com `NEXT_PUBLIC_SUPABASE_URL` + chave publicável o app entra em **modo
  Supabase** (login real, `proxy.ts` renova a sessão, leituras com o JWT do usuário). Sem
  elas, **modo demonstração** (simulação em memória e troca agência/cliente por cookie).
  As duas origens só carregam linhas; `src/lib/read-model` aplica as regras de métricas
  uma vez. Dados de demonstração no banco são gravados pelo `pnpm db:seed` com
  `source = 'simulated'`, o que mantém o selo "Dados simulados".
- **Consequências**: o alcance de um cliente com várias contas aparece como indisponível
  (a Meta só deduplica dentro de uma conta). A troca "Visualizar como cliente" existe só
  no modo demonstração; no modo Supabase a agência precisará de um login de cliente.

## ADR-011 — Meta via token de usuário do sistema colado pela agência

- **Contexto**: o produto é usado pela agência com as contas que ela já gerencia no
  Business Manager; Facebook Login for Business exige App Review e verificação da empresa.
- **Decisão**: a agência gera um token de **usuário do sistema** (`ads_read`) e cola em
  Administração → Integrações. O servidor confere com a Meta (`/me`, `/me/permissions`),
  cifra (ADR-004) e descobre as contas (`/me/adaccounts`). O token só trafega no header
  `Authorization`; `appsecret_proof` é enviado quando `META_APP_SECRET` existe.
  **Resultado** de cada campanha = um evento escolhido pelo objetivo a partir de `actions`
  (variantes duplicadas do mesmo evento nunca são somadas) — `src/lib/meta/results.ts`.
- **Consequências**: sem autoatendimento de clientes (fica para o Login for Business). A
  mesma `TOKEN_ENCRYPTION_KEY` precisa existir em todo ambiente que usa o mesmo banco. A
  regra de resultado é conferida com o Gerenciador de Anúncios antes de fechar a Fase 6.

## ADR-012 — Ambientes separados: desenvolvimento local × produção

- **Contexto**: o desenvolvimento acontece num computador pessoal. Com um só projeto
  Supabase, o `.env.local` guardava a service role e a chave de criptografia da produção.
- **Decisão**: dois projetos Supabase. O local usa `wrmax-metrics-dev` (só dados de
  demonstração, chave de criptografia própria, sem `META_APP_SECRET` nem token real). As
  chaves de produção existem só na Vercel (Secret) e no gerenciador de senhas da empresa.
  O token da Meta é colado apenas no site de produção.
- **Consequências**: cada migração é aplicada nos dois projetos (dev primeiro). A primeira
  sincronização real acontece em produção; diagnóstico pelos logs da Vercel (sem tokens).
  Ao trocar de pessoa ou de máquina: girar a secret key do Supabase, a chave de
  criptografia (reconectar a Meta) e o token do usuário do sistema.

## ADR-006 — Alcance deduplicado por snapshots de períodos-padrão

- **Contexto**: alcance não é aditivo entre dias.
- **Decisão**: gravar alcance deduplicado para presets do filtro; intervalos
  personalizados exibem alcance/frequência como indisponíveis.
- **Consequências**: mais chamadas por sync (uma por preset/conta), aceitável no volume do MVP.
