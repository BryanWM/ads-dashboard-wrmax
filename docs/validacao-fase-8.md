# Relatório da Fase 8 — Validação (15/10/2026)

Escopo: segurança, responsividade, acessibilidade e desempenho. Tudo abaixo foi **executado**;
o que não foi possível testar está listado no fim.

## Como foi testado

- **Build de produção em modo demonstração** (`next start`, variáveis do Supabase vazias só
  no processo — `.claude/launch.json` → `metrics-demo-prod`), no navegador embutido.
- **axe-core 4.10** (WCAG 2.0/2.1/2.2 A e AA + boas práticas) injetado em cada tela, mais um
  script próprio: rolagem horizontal da página, alvos de toque < 24 px, tempos de navegação,
  CLS e JS transferido.
- Larguras: **1280 px** (computador) e **375 px** (celular); temas **escuro** e **claro**;
  abas Funil · Anúncios · Detalhes e a janela de detalhes de um número.
- Revisão de segurança do código (leitura completa de actions, rotas, proxy, migrações e
  integração Meta), `pnpm audit --prod` e o teste de isolamento `rls_isolation.sql` no PGlite.

## Resultados

### Responsividade

| Tela (8 rotas + login + catálogo) | 1280 px         | 375 px          |
| --------------------------------- | --------------- | --------------- |
| Rolagem horizontal da página      | nenhuma         | nenhuma         |
| Alvos de toque < 24 px            | nenhum          | nenhum          |
| Tabelas largas                    | rolam no cartão | rolam no cartão |

### Acessibilidade (axe) — achados e correções

| Achado                                                       | Onde                     | Correção                                 |
| ------------------------------------------------------------ | ------------------------ | ---------------------------------------- |
| Esqueleto de carregamento com `aria-label` sem papel         | todas as páginas do app  | `role="status"`                          |
| Menu lateral fora de um landmark                             | todas (computador)       | `<nav aria-label="Menu principal">`      |
| Minigráfico decorativo focável dentro de `aria-hidden`       | cartões da visão geral   | `accessibilityLayer={false}` no Recharts |
| Área rolável sem foco de teclado                             | tabelas admin, carrossel | `tabIndex=0` + contorno de foco dourado  |
| Títulos pulando de `h1` para `h3`                            | abas Anúncios/Detalhes   | seções viraram `h2` (mesmo visual)       |
| Contraste 4,29:1 no rótulo do dia sobre o dourado mais forte | Detalhes, tema claro     | rótulo em `text-texto`                   |

Falsos positivos descartados: "sem `h1`" (o painel do navegador estava oculto e o React não
tinha revelado o conteúdo transmitido) e contraste 1,89:1 (texto capturado no meio da
animação de troca de aba; parado, o mesmo texto tem 6,8:1).

Depois das correções, a CSP nova bloqueia carregar o axe de fora; as correções foram
conferidas pelo DOM (landmark com 8 links, nenhum SVG focável oculto, tabelas focáveis,
nenhum `h3` restante, cor do rótulo `#1d1912`).

### Desempenho (build de produção local, sem limitação de rede)

| Página       | TTFB     | DOM pronto | CLS | JS transferido (gzip) |
| ------------ | -------- | ---------- | --- | --------------------- |
| `/login`     | 32 ms    | 58 ms      | 0   | 208 KB                |
| `/dashboard` | 18–23 ms | 104–415 ms | 0   | 448 KB                |
| `/campaigns` | 22–50 ms | 117–200 ms | 0   | 350 KB                |
| `/admin/*`   | 17–28 ms | 76–186 ms  | 0   | 292–308 KB            |

CLS zero em todas as telas (nada pula ao carregar). O maior peso é a visão geral (Recharts +
Motion); fica como ponto de atenção, não bloqueante.

### Segurança

- `pnpm audit --prod`: **1 alta** (`braces`, via CLI `shadcn` listado como dependência de
  produção) → `shadcn` movido para `devDependencies` → **0 vulnerabilidades**.
- `rls_isolation.sql` no PGlite (todas as migrações): **OK**, duas execuções, nada gravado.
- Revisão de código: **nenhum achado crítico ou alto**. Isolamento entre agências e entre
  clientes confirmado no app e no banco.

| #     | Achado                                                           | Situação                                             |
| ----- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| M1    | Limite de tentativas de login vê o IP da Vercel                  | regra de Firewall no `go-live.md` (configuração)     |
| M2    | Cadastro público do Supabase ligado; senha mínima 6              | passo no `go-live.md` (configuração)                 |
| M3    | Sem cabeçalhos de segurança (clickjacking)                       | **corrigido** — ADR-015                              |
| L1    | Link/remoção agem no login global                                | **corrigido** — recusa login usado fora da agência   |
| L2    | Mensagem revelava se o e-mail existe                             | **corrigido** — mensagem neutra                      |
| L3    | Paginação da Meta seguia qualquer host com o token               | **corrigido** — só o host da Graph API               |
| L4    | Tag GCM truncada aceita; token sem vínculo à conexão (AAD)       | tag de 16 bytes **corrigida**; AAD pendente*         |
| L5    | Auditoria gravada depois da alteração                            | pendente (baixo)                                     |
| L6    | Produção sem Supabase viraria demonstração aberta                | **corrigido** — falha fechada (`DEMO_MODE=1` libera) |
| I1    | `"use server"` sem `import "server-only"`                        | **corrigido** (5 arquivos)                           |
| I2–I4 | Grants por coluna, cookie não httpOnly, texto livre na auditoria | registrados, sem ação agora                          |

\* AAD muda o formato do token cifrado: exige reconectar a Meta. Fazer junto com a virada
para a conta da empresa (token novo de qualquer forma).

Cabeçalhos conferidos na resposta: CSP, `X-Frame-Options: DENY`, `nosniff`,
`Referrer-Policy`, `Permissions-Policy`, HSTS. Nenhum erro de console com a CSP em login,
visão geral (abas e janela de detalhes), contas de anúncio e catálogo.

## Não coberto (e por quê)

- **Telas logadas no Supabase** (o login real passa pela internet): validar no site — ver
  checklist da resposta da fase.
- **Leitor de tela real** (NVDA/VoiceOver) e **celular físico em rede 4G**: os testes acima
  são automáticos e locais.
- **Configurações externas** M1/M2: dependem do painel da Vercel e do Supabase.
