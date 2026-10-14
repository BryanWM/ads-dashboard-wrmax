"use client";

import {
  ChevronDownIcon,
  DownloadIcon,
  PlugIcon,
  RefreshCwIcon,
  SettingsIcon,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SegmentedControl } from "@/components/filters/segmented-control";
import { DeltaIndicator } from "@/components/metrics/delta-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { CatalogSection } from "./section";

const PERIODS = [
  { value: "last_7d", label: "Últimos 7 dias" },
  { value: "last_30d", label: "Últimos 30 dias" },
  { value: "this_month", label: "Este mês" },
];

const CHIPS = [
  { value: "last_7d", label: "7 dias" },
  { value: "last_30d", label: "30 dias" },
  { value: "this_month", label: "Mês atual" },
] as const;

/** Same configuration as PeriodChips (which needs the app's navigation context). */
function PeriodChipsPreview() {
  const [value, setValue] = useState<(typeof CHIPS)[number]["value"]>("this_month");
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-sm text-texto-apagado">Pizzaria Demonstração</p>
      <SegmentedControl
        aria-label="Período"
        size="lg"
        fill
        options={CHIPS}
        value={value}
        onChange={setValue}
        className="lg:w-auto"
      />
    </div>
  );
}

export function ControlsDemo() {
  return (
    <>
      <CatalogSection
        id="botoes"
        title="Botões"
        description="Feedback imediato ao toque (escala 0,98) e foco visível por teclado."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button>Salvar</Button>
          <Button>
            <PlugIcon data-icon="inline-start" />
            Conectar Meta Ads
          </Button>
          <Button variant="outline">Cancelar</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="destructive">
            <TrashIcon data-icon="inline-start" />
            Remover
          </Button>
          <Button disabled>
            <Spinner data-icon="inline-start" />
            Sincronizando…
          </Button>
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" size="icon" aria-label="Exportar" />}>
              <DownloadIcon />
            </TooltipTrigger>
            <TooltipContent>Exportar CSV</TooltipContent>
          </Tooltip>
        </div>
      </CatalogSection>

      <CatalogSection
        id="indicadores"
        title="Badges e variações"
        description="Em métricas de custo, queda é melhora — a cor segue o sentido da métrica."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Ativa</Badge>
          <Badge variant="secondary">Pausada</Badge>
          <Badge variant="outline">Rascunho</Badge>
          <Badge variant="destructive">Falha na sincronização</Badge>
          <DeltaIndicator change={12.4} polarity="higher-is-better" />
          <DeltaIndicator change={-8.1} polarity="lower-is-better" />
          <DeltaIndicator change={9.7} polarity="lower-is-better" />
          <DeltaIndicator change={null} polarity="higher-is-better" />
        </div>
      </CatalogSection>

      <CatalogSection
        id="filtros"
        title="Filtros (pílula deslizante)"
        description="Chips de período da visão do cliente: largura total no celular, largura do conteúdo no desktop."
      >
        <PeriodChipsPreview />
      </CatalogSection>

      <CatalogSection id="formularios" title="Formulários">
        <FieldGroup className="max-w-md">
          <Field>
            <FieldLabel htmlFor="client-name">Nome do cliente</FieldLabel>
            <Input id="client-name" placeholder="Ex.: Aliança Autocentro" />
            <FieldDescription>Aparece no seletor de clientes e nos relatórios.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Período padrão</FieldLabel>
            <Select items={PERIODS} defaultValue="last_30d">
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field orientation="horizontal">
            <Switch id="sync-enabled" defaultChecked />
            <FieldLabel htmlFor="sync-enabled">Sincronização diária ativa</FieldLabel>
          </Field>
        </FieldGroup>
      </CatalogSection>

      <CatalogSection id="sobreposicoes" title="Menus, diálogos e notificações">
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              Ações
              <ChevronDownIcon data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Conta de anúncios</DropdownMenuLabel>
                <DropdownMenuItem>
                  <RefreshCwIcon />
                  Sincronizar agora
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <SettingsIcon />
                  Configurações
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <TrashIcon />
                Desvincular
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>Abrir diálogo</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Desvincular conta de anúncios?</DialogTitle>
                <DialogDescription>
                  As métricas já sincronizadas são mantidas. Novas sincronizações deixam de ocorrer
                  até a conta ser vinculada novamente.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
                <DialogClose render={<Button variant="destructive" />}>Desvincular</DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={() =>
              toast.success("Sincronização concluída", {
                description: "3 contas atualizadas · dados até 09/10/2026",
              })
            }
          >
            Toast de sucesso
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.error("Falha ao sincronizar", {
                description: "Token expirado. Reconecte a conta Meta.",
              })
            }
          >
            Toast de erro
          </Button>
        </div>
      </CatalogSection>
    </>
  );
}
