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
- **Decisão**: o projeto Supabase atual (conta pessoal) é o de **testes**. A produção será
  um projeto novo na conta da empresa, com chaves que existem só na Vercel (Secret) e no
  gerenciador de senhas da empresa. Durante os testes, o token da Meta dá acesso a uma
  única conta de anúncio e é revogado ao final. Roteiro em `docs/go-live.md`.
- **Consequências**: cada migração é aplicada nos dois projetos (testes primeiro). Ao trocar
  de pessoa ou de máquina: girar a secret key do Supabase, a chave de criptografia
  (reconectar a Meta) e o token do usuário do sistema.

## ADR-013 — Tema claro (substitui o "tema único escuro" do ADR-008)

- **Contexto**: o usuário pediu troca de tema. O DS só definia o escuro; a paleta clara foi
  proposta, medida e **aprovada em 14/10/2026**, e será registrada também no artefato do DS.
- **Decisão**: escuro continua o padrão do servidor; `data-theme="light"` no `<html>` troca
  os tokens (`globals.css`). Preferência "automático/claro/escuro" no `localStorage`
  (`wrmax-tema`), aplicada por um script inline no `<head>` antes da primeira pintura (sem
  cookie, sem tornar páginas dinâmicas). Escolha no menu do usuário. Tons de ouro
  translúcidos usam `--ouro-rgb`; o gradiente do botão usa os ouros fixos da marca; o
  logo branco é escurecido por filtro no claro.
- **Consequências**: novas cores entram como token nos dois temas (nunca hex/rgba direto
  em componentes). Pendências: logo escuro oficial; validar `--chart-2…8` no claro antes
  de usar gráficos com 3+ séries.

## ADR-014 — Agendador diário sem fila separada

- **Contexto**: Vercel Hobby permite um cron por dia (horário ±59 min) e funções de até
  300 s. O desenho original previa uma fila de jobs drenada por um segundo cron.
- **Decisão**: `GET /api/cron/sync` (protegido por `CRON_SECRET`, comparação em tempo
  constante) roda uma vez por dia (`vercel.json`, 09:00 UTC). A "fila" é o próprio estado
  da conta (`ad_account_sync_state`): uma conta está pendente até ter sucesso **na data de
  hoje no fuso dela** — chamar de novo não refaz o que já foi feito, e contas que não
  couberam no orçamento de tempo (200 s) ficam para a próxima chamada. Regras puras em
  `src/lib/sync/schedule.ts`: interruptor `sync_enabled` (ligado ao associar a um
  cliente), conexão ativa e com token, sem job em andamento, backoff exponencial
  (15 min → 24 h) e desistência após 5 falhas seguidas (job `dead`). Jobs "running" há
  mais de 15 min são fechados como falha (função encerrada por timeout).
- **Consequências**: sem tabela nova nem migração. No Hobby, retentativas só acontecem no
  dia seguinte (ou num "Buscar dados"); no Pro, basta adicionar mais horários ao cron, sem
  mudar código. Com muitas contas, a primeira carga (90 dias) pode levar mais de um dia
  para completar todas.

## ADR-015 — Cabeçalhos de segurança estáticos (CSP sem nonce)

- **Contexto**: a revisão da Fase 8 apontou ausência de cabeçalhos (risco de clickjacking
  nas telas de administração e no formulário de senha). Uma CSP com nonce exige ler o
  request em toda página, o que desliga o Partial Prerendering.
- **Decisão**: cabeçalhos estáticos em `next.config.ts` para todas as rotas:
  `frame-ancestors 'none'` + `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS e uma CSP (só em produção) com `script-src 'self'
'unsafe-inline'` (payload RSC e script de tema), `connect-src 'self'` (o navegador nunca
  fala direto com Supabase ou Meta) e `img-src https:` (miniaturas da Meta).
- **Consequências**: proteção contra framing, injeção de `<base>`, plugins e envio de
  formulário para fora, mas a CSP **não** barra script inline injetado — a defesa contra
  XSS continua sendo o React (sem `dangerouslySetInnerHTML` com dado de usuário). Uma
  integração que precise de outro domínio no navegador exige atualizar a CSP.

## ADR-016 — Segundo fator (MFA) para a agência: adiado, risco aceito

- **Contexto**: o papel `admin` lê todos os clientes, gera links de acesso e opera a
  conexão Meta. Só com senha, um ataque de tentativa em massa ou senha vazada entrega tudo
  (revisão de segurança, risco nº 1). Foi implementado TOTP obrigatório (aal2 exigido no
  banco e tela `/mfa`) e **retirado em 16/10/2026 a pedido do usuário**, para manter o
  acesso simples no início.
- **Decisão**: sem MFA por enquanto. Compensações: senha nova com 8+ caracteres,
  maiúscula, minúscula, número e símbolo (escolha da agência), cadastro público desligado, limite de tentativas no Firewall da
  Vercel e alertas de `login.failed` (`docs/seguranca.md`).
- **Consequências**: risco aceito e registrado. Reavaliar antes de crescer o número de
  admins ou de clientes; a implementação de referência está no commit `3cd7b45`
  (migração que exige `aal2` em `app.admin_org_ids()` + tela `/mfa`).

## ADR-006 — Alcance deduplicado por snapshots de períodos-padrão

- **Contexto**: alcance não é aditivo entre dias.
- **Decisão**: gravar alcance deduplicado para presets do filtro; intervalos
  personalizados exibem alcance/frequência como indisponíveis.
- **Consequências**: mais chamadas por sync (uma por preset/conta), aceitável no volume do MVP.
