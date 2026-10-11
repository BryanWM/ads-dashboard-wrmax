import { StatusDot } from "@/components/feedback/status-dot";

import { CatalogSection } from "./section";

// WRMax Design System tokens (tokens.json v1). Names match the source.
const SURFACES = [
  ["fundo", "Fundo de todas as páginas"],
  ["superficie", "Cards, painéis e modais"],
  ["superficie-2", "Hover e blocos internos"],
  ["campo", "Inputs, busca e filtros"],
  ["linha", "Bordas finíssimas"],
  ["linha-2", "Bordas de inputs e secundários"],
] as const;

const TEXT = [
  ["texto", "Texto principal (creme)"],
  ["texto-apagado", "Apoio e legendas"],
  ["texto-inativo", "Itens inativos (13px+)"],
] as const;

const GOLD = [
  ["dourado", "Ícones, foco, item ativo"],
  ["ouro", "Chip ativo, etiqueta de seção"],
  ["ouro-escuro", "Ponta do gradiente"],
  ["ouro-claro", "Brilho do gradiente"],
] as const;

const STATUS = [
  ["ok", "Concluído / melhora"],
  ["atencao", "Pendente / atenção"],
  ["erro", "Erro / piora"],
] as const;

function Swatch({ token, label }: { token: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="size-10 shrink-0 rounded-lg border border-linha-2"
        style={{ background: `var(--${token})` }}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-texto">{label}</p>
        <p className="font-mono text-xs text-texto-apagado">{token}</p>
      </div>
    </div>
  );
}

function Group({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([token, label]) => (
        <Swatch key={token} token={token} label={label} />
      ))}
    </div>
  );
}

export function Foundations() {
  return (
    <>
      <CatalogSection
        id="cores"
        title="Cores"
        description="Fundo quase preto e quente, texto creme, ouro só onde importa. Um elemento em ouro cheio por tela; status sempre como ponto colorido + texto neutro."
      >
        <Group items={SURFACES} />
        <Group items={TEXT} />
        <Group items={GOLD} />
        <div className="flex flex-wrap gap-6">
          {STATUS.map(([token, label]) => (
            <span key={token} className="inline-flex items-center gap-2 text-sm text-texto">
              <StatusDot tone={token} />
              {label}
              <span className="font-mono text-xs text-texto-apagado">{token}</span>
            </span>
          ))}
        </div>
        <div className="h-2 w-full max-w-md rounded-full bg-ouro" aria-hidden />
        <p className="text-xs text-texto-apagado">
          Gradiente de ouro (100°): só no botão principal, em uma palavra de destaque e em barras de
          progresso.
        </p>
      </CatalogSection>

      <CatalogSection
        id="paleta-graficos"
        title="Paleta de gráficos"
        description="Período atual em dourado; período anterior em cinza quente mais escuro (diferem por luminosidade, validado para daltonismo). Para 3+ séries, a ordem categórica escura validada, com rótulos diretos ou tabela."
      >
        <div className="flex flex-wrap gap-2">
          {["chart-1", "chart-previous", "chart-2", "chart-3", "chart-4", "chart-5", "chart-6"].map(
            (slot) => (
              <div key={slot} className="flex flex-col items-center gap-1.5">
                <span className="h-10 w-14 rounded-lg" style={{ background: `var(--${slot})` }} />
                <span className="font-mono text-[10px] text-texto-apagado">{slot}</span>
              </div>
            ),
          )}
        </div>
      </CatalogSection>

      <CatalogSection
        id="tipografia"
        title="Tipografia"
        description="Sora para títulos e números, Inter para texto (nunca acima de 600), JetBrains Mono para etiquetas."
      >
        <div className="space-y-4">
          <p className="text-ouro etiqueta">Etiqueta de seção</p>
          <p className="font-display text-[44px] leading-[1.05] font-extrabold tracking-tight text-texto">
            Suas campanhas em <span className="text-ouro">foco</span>
          </p>
          <p className="font-display text-2xl font-bold text-texto">Título de seção</p>
          <p className="font-display text-base font-semibold text-texto">Subtítulo</p>
          <p className="max-w-xl text-[15px] leading-relaxed text-texto">
            Texto corrido para descrições e explicações de métricas, com leitura confortável.
          </p>
          <p className="text-[13px] font-medium text-texto-apagado">Texto de apoio e legendas.</p>
          <p className="font-display text-4xl font-bold text-texto figures-tabular">R$ 12.480,35</p>
        </div>
      </CatalogSection>
    </>
  );
}
