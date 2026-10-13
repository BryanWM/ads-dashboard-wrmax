# WRMax Metrics

Plataforma SaaS para agências, gestores de tráfego e seus clientes acompanharem
métricas de campanhas pagas (Meta Ads primeiro; Google Ads e TikTok Ads no roadmap),
com sincronização automática diária.

> **Status:** Fase 5 em andamento — banco Supabase com isolamento (RLS), login real e
> telas lendo do banco (dados de demonstração). Ainda sem integração com a Meta (Fases 6–7).
> Como usar: [guia de uso](docs/guia-de-uso.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · Motion ·
Supabase (PostgreSQL + Auth + RLS) · Vercel (hosting + Cron) · Vitest.

## Começando

Requisitos: Node 22+, pnpm 10.

```bash
pnpm install
cp .env.example .env.local   # preencha conforme a fase
pnpm dev
```

| Script         | O que faz                                         |
| -------------- | ------------------------------------------------- |
| `pnpm dev`     | servidor de desenvolvimento                       |
| `pnpm check`   | lint + typecheck + testes unitários               |
| `pnpm db:seed` | agência, administrador e demonstração no Supabase |
| `pnpm format`  | Prettier                                          |

## Documentação

- [Arquitetura](docs/architecture.md)
- [Modelo de dados](docs/data-model.md)
- [Integração Meta Ads](docs/meta-integration.md)
- [Design system e animações](docs/design-system.md)
- [HyperFrames (vídeos de relatório)](docs/hyperframes.md)
- [Escopo e roadmap](docs/roadmap.md)
- [Decisões (ADR)](docs/adr/README.md)
