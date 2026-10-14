# Design system e movimento

**Fonte da verdade: [WRMax Design System](https://claude.ai/artifact/FW7MMTqZpiYH5GFy6WtYvt)**
("Premium escuro com ouro como detalhe"). Este documento descreve **como** ele é aplicado
no produto; em caso de dúvida, vale o design system. Mudanças de marca devem ser feitas
lá primeiro e depois refletidas em `src/app/globals.css`.

## Papel do shadcn/ui

O shadcn/ui **não é uma dependência**: o CLI copia o código dos componentes (Base UI +
Tailwind) para `src/components/ui/`, e cada primitiva foi ajustada aos tokens WRMax.

- **shadcn CLI 4.21**, base **Base UI** (composição via `render={<Button />}`, não
  `asChild`), preset `rhea` como ponto de partida, com raios remapeados (ver abaixo).
- `cn` vem do pacote `cn` (mantido pelo shadcn). Ícones **lucide-react**.
- Catálogo vivo em **`/design-system`** (interno).

## Como os tokens WRMax foram aplicados

| WRMax (tokens.json)                         | No código                           | Papel shadcn                                  |
| ------------------------------------------- | ----------------------------------- | --------------------------------------------- |
| `fundo` `#0a0907`                           | `--fundo`, `bg-fundo`               | `--background`                                |
| `superficie` / `superficie-2`               | `bg-superficie`, `bg-superficie-2`  | `--card`, `--popover` / `--muted`, `--accent` |
| `campo`                                     | `bg-campo`                          | fundo de inputs, select, busca                |
| `texto` / `texto-apagado` / `texto-inativo` | `text-texto…`                       | `--foreground` / `--muted-foreground`         |
| `linha` / `linha-2`                         | `border-linha`, `border-linha-2`    | `--border` / `--input`                        |
| `dourado`                                   | `text-dourado`, foco                | `--primary`, `--ring` (nunca fundo cheio)     |
| `ouro`, `ouro-escuro`, `ouro-claro`         | `chip-ouro`, `bg-ouro`, `text-ouro` | gradiente e item ativo                        |
| `ok` / `atencao` / `erro`                   | `StatusDot`                         | status: ponto + texto neutro                  |

- **Temas escuro (padrão) e claro** (ADR-013, paleta aprovada em 14/10/2026). O claro troca
  só os valores dos tokens; os papéis são os mesmos. Escolha em menu do usuário → Tema
  (Automático segue o aparelho).

  | Token                        | Escuro                            | Claro                             | Contraste no claro (fundo/card) |
  | ---------------------------- | --------------------------------- | --------------------------------- | ------------------------------- |
  | `fundo`                      | `#0a0907`                         | `#f6f1e6`                         | —                               |
  | `superficie`                 | `#15130e`                         | `#fdfaf3`                         | —                               |
  | `superficie-2`               | `#1d1a13`                         | `#f1eadb`                         | —                               |
  | `texto`                      | `#f1e8d6`                         | `#1d1912`                         | 15,5 / 16,8                     |
  | `texto-apagado`              | `#ac9f84`                         | `#5c5242`                         | 6,8 / 7,4                       |
  | `texto-inativo`              | `#8c836f`                         | `#6f6553`                         | 5,1 / 5,5                       |
  | `dourado`                    | `#d4b06a`                         | `#8a6420`                         | 4,8 / 5,1                       |
  | `ok` / `atencao` / `erro`    | `#6fd39b` / `#e7b45a` / `#ff6b8a` | `#17744a` / `#8f5c06` / `#b8304f` | ≥ 5,0                           |
  | `chart-1` / `chart-previous` | `#d4b06a` / `#6f6756`             | `#b07f22` / `#6b6457`             | 3,2 / 5,2                       |

  No claro, o período anterior é um cinza **mais escuro** que o dourado (um cinza claro
  some no creme): validado com o `validate_palette.js` — CVD ΔE 14,0, normal ΔE 15,8, ambos
  ≥ 3:1 no card. O botão principal usa os ouros fixos da marca nos dois temas.

- **Fundo**: brilho dourado difuso no canto superior direito + rede de pontos sutil (24 px).
- **Raios**: `--radius: 10px` alinha a escala do Tailwind ao DS — `rounded-lg` = 10 px
  (`raio-botao`), `rounded-xl` = 14 px (`raio-card`), `rounded-2xl` = 18 px
  (`raio-painel`), `rounded-chip` = 9 px. Switch continua em pílula.
- **Sombras**: separação por bordas `linha`, não por sombra. `sombra-ouro` só no botão
  principal e na pílula ativa; `sombra-levantado` em popovers e tooltips.
- **Tipografia** (só os pesos do DS): **Sora** 600/700/800 em títulos e números
  (`font-display`), **Inter** 400/500/600 no texto (nunca acima de 600), **JetBrains Mono**
  400/600 nas etiquetas (`etiqueta`: 11 px, caixa alta, 0,16em). `tabular-nums` em
  valores de KPI e colunas.
- **Regra de ouro**: um elemento em ouro cheio por tela — o `Button` padrão (gradiente
  100°, desliza no hover, encolhe a 0,985 no clique). Secundário = vidro escuro
  (`variant="outline"`). Badge padrão = `chip-ouro`. Barras de progresso podem usar `bg-ouro`.
- **Logo**: `public/brand/wrmax-logo.png` (cópia do asset `Logos/wrmax-logo.png` do DS),
  via `<BrandLogo />`. Favicon: "W" dourado sobre quadrado arredondado `fundo`
  (`src/app/icon.svg`).

### Paleta de gráficos (validada)

O dourado da marca é cor de **acento**, não de paleta categórica. Validação com
`validate_palette.js` sobre `superficie` (`#15130e`):

- Período atual: `--chart-1` = `dourado`.
- Período anterior: `--chart-previous` = `#6f6756` (cinza quente mais escuro). Diferença
  por luminosidade: ΔE 26,7 (visão normal), 25,2 (daltonismo), contraste ≥ 3:1.
  `texto-apagado` foi **rejeitado** para essa função (ΔE 8,9 — indistinguível).
- Gráficos com 3+ séries: `--chart-2…8` = ordem categórica escura validada da skill
  `dataviz`, com rótulos diretos ou tabela.

## Visão geral do cliente (mobile-first)

Público: leigo, no celular, muitas vezes via WhatsApp. Pergunta única: _"meu investimento
está dando resultado?"_. Código em `src/app/(app)/dashboard/_components/overview/` e a
lógica de apresentação (pura, testada) em `src/lib/overview/`.

**Hierarquia**: cabeçalho fixo (cliente, "Atualizado em…", chips 7 dias · 30 dias · Mês
atual) → frase-resumo por template → 4 números em 2×2 → abas Funil · Anúncios · Detalhes.
No desktop (≥ 1024 px) vira grade bento com gráfico principal, funil e campeões sem rolar.

**Regras**

- **Resultado principal** = objetivo declarado do cliente (`objective`); sem ele, o tipo de
  resultado com maior investimento. Investimento, resultados e custo desse cartão contam
  só campanhas desse tipo — objetivos diferentes nunca são somados.
- **4º cartão**: Retorno (ROAS) só com valor de compra rastreado; senão Pessoas alcançadas.
- **Cor da variação** segue a polaridade (custo subindo = vermelho; investimento é neutro).
- Tocar num cartão abre a **gaveta** (inferior no celular, lateral no desktop) com
  explicação em uma frase, gráfico diário e métricas técnicas. Sem tooltips de hover.
- Formatação: no máximo 1 casa em percentuais e decimais, nenhuma em contagens; valores
  ≥ R$ 10 mil abreviados nos cartões ("R$ 31,1 mil"), completos na gaveta.
- Celular: primeira tela (390×844) mostra cabeçalho, frase e 4 números; página ≤ 2 telas;
  sem rolagem horizontal (só dentro do carrossel); toque ≥ 44 px; textos ≥ 12 px (por isso
  a `etiqueta` usa 12 px, e não os 11 px do DS). Tabelas viram lista de cartões.
- Funil: "Viram" como número de destaque; barras a partir de "Clicaram" (100%), lineares.

**Limites aprovados pela agência** (`src/lib/overview/signals.ts`)

- Selo de saúde: custo ≤ meta = Saudável; até 20% acima = Atenção; acima disso = Crítico.
- Frequência alta: média acima de **3,5** visualizações por pessoa no período.
- Frase: variação abaixo de 1% é descrita como "estável".

## Movimento (WRMax DS · Animações)

Biblioteca: **`motion`** (`motion/react`), presets em `src/components/motion/presets.ts`.
Uma curva para tudo: `cubic-bezier(0.32, 0.72, 0, 1)` (`EASE_MAC`, classe `ease-mac`).

| Padrão                                                   | Implementação                                                             | Duração  |
| -------------------------------------------------------- | ------------------------------------------------------------------------- | -------- |
| Pílula deslizante (sidebar, filtros, seletor de métrica) | `SegmentedControl` / `layoutId` com vidro dourado                         | 0,7 s    |
| Entrada lateral (troca de página)                        | `template.tsx`: desliza 56 px + fade — **nunca no primeiro carregamento** | 0,7 s    |
| Números                                                  | só animam quando o valor **muda** (troca de período/cliente)              | 0,75 s   |
| Gráfico                                                  | desenha só depois que a pessoa troca a métrica                            | 0,5 s    |
| Modal                                                    | fundo `rgba(4,3,2,.72)` + blur 12 px, fade                                | 200 ms   |
| Troca de período/cliente                                 | conteúdo antigo fica esmaecido + barra de progresso dourada               | imediato |

Regras do DS seguidas: **nada se mexe sozinho ao abrir a página** (removidas a entrada
escalonada dos cards e a contagem inicial dos números); uma animação marcante por tela;
`prefers-reduced-motion` desliga transições e animações (CSS e `MotionConfig`).

Não implementado (por enquanto): o "respiro" da pílula (estica 15% no meio do caminho) —
conflita com a animação de layout do Motion; avaliar implementação própria se desejado.
