# HyperFrames — avaliação técnica

## O que é

[HyperFrames](https://github.com/heygen-com/hyperframes) (HeyGen, Apache 2.0) é um
framework que transforma **composições HTML/CSS + animações "seekáveis"** em **vídeo
determinístico** (MP4). Pipeline: Chrome headless (Puppeteer) captura cada quadro →
FFmpeg codifica e mistura áudio.

Conceitos:

- **Composição**: um arquivo HTML com elemento raiz `data-composition-id`,
  `data-width`, `data-height`.
- **Clips/tracks**: elementos `.clip` com `data-start`, `data-duration`,
  `data-track-index`.
- **Timeline**: animações pausadas e registradas (ex.: GSAP em `window.__timelines`);
  adaptadores para GSAP, Lottie, Three.js, Anime.js, CSS e WAAPI.
- Pacotes: `hyperframes` (CLI), `@hyperframes/core`, `engine`, `producer`, `studio`,
  `player`, `shader-transitions`, `aws-lambda`. Requer Node 22+ e FFmpeg.

## Respostas às perguntas do projeto

1. **Recursos adequados**: composição + render CLI/producer para gerar **vídeos de
   resumo de campanha**; `@hyperframes/player` para pré-visualizar esses vídeos no
   app.
2. **Composições HTML/CSS e animações**: servem para _vídeo_. As animações são
   controladas por timeline e quadro, não por interação do usuário — o modelo é
   diferente de uma UI reativa.
3. **Integração com React/Next.js**: não há SDK React. Existe o web component
   `<hyperframes-player>` (importável em React como efeito colateral), que toca a
   composição ao vivo num iframe _sandbox_ ou um MP4. Para conteúdo gerado pelo app,
   usar `sandbox-origin="opaque"` (o modo padrão inclui `allow-same-origin`).
4. **Vídeo vs. reutilizável na UI**: render, producer, engine, shader-transitions e
   aws-lambda são exclusivamente para vídeo. O que pode aparecer no produto é o
   **player** (para assistir ao relatório) — não para animar o dashboard.
5. **Skills no Claude Code**:
   ```bash
   claude plugin marketplace add heygen-com/hyperframes
   claude plugin install hyperframes@hyperframes
   ```
   Ou skills avulsas no projeto: `npx skills add heygen-com/hyperframes` (grupo
   _Core Skills_) / `npx hyperframes skills update`. Após instalar: `/hyperframes`,
   `/hyperframes-cli`, `/hyperframes-core`, `/hyperframes-animation`, `/motion-graphics`
   (lista completa no README do repositório).
   **Situação atual deste ambiente**: as skills locais do HyperFrames **não estão
   instaladas**; existe apenas o conector hospedado "HyperFrames by HeyGen", cujas
   ferramentas de criação/render são bloqueadas para clientes CLI como o Claude Code.

## Decisão

- **HyperFrames NÃO substitui shadcn/ui nem a biblioteca de animação da UI.** As
  animações interativas do dashboard usam **Motion for React** (ver
  [`design-system.md`](./design-system.md)).
- **Uso proposto (fase opcional, pós-MVP)**: _"Resumo em vídeo do período"_ — um vídeo
  de 20–40 s, 1080×1920 ou 1920×1080, com os KPIs do mês, gráfico de evolução e top
  campanhas, para o gestor enviar ao cliente (WhatsApp, Instagram, reunião).
- **Isolamento**: projeto separado em `video-reports/`, que recebe um **JSON de
  métricas já persistidas** (somente leitura) e produz o MP4. Não toca a coleta.

## Custos técnicos

| Custo                 | Detalhe                                                                                                                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Infraestrutura        | Chrome headless + FFmpeg não cabem numa função serverless padrão da Vercel. Opções: worker em contêiner (Fly/Render/Railway), `@hyperframes/aws-lambda`, ou render manual/local pela equipe. |
| Tempo de render       | Segundos a minutos por vídeo; precisa de fila assíncrona e armazenamento (Supabase Storage).                                                                                                 |
| Determinismo de dados | O vídeo deve congelar a data/hora de sincronização e marcar dados simulados, como a UI.                                                                                                      |
| Manutenção            | Mais um conjunto de dependências (Puppeteer/Chrome), versões frequentes (0.8.x).                                                                                                             |
| Dinheiro              | Software gratuito; custo é o compute do render.                                                                                                                                              |

**Recomendação**: começar com geração **manual/assistida** (o gestor exporta o JSON e
roda `npx hyperframes render` localmente ou via skill), validar se os clientes
valorizam o vídeo, e só então automatizar com worker dedicado.
