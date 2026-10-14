import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const buttonVariants = cva(
  // WRMax DS · Botao: Inter 600 14px, raio-botao, foco dourado, clique encolhe a 0.985.
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-[color,background-color,background-position,border-color,box-shadow,transform] duration-200 ease-out outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dourado active:not-aria-[haspopup]:scale-[0.985] disabled:pointer-events-none aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** Principal (ouro): ONE per screen — the action the person should take next. */
        default:
          "bg-ouro text-texto-sobre-ouro shadow-ouro [transition-duration:400ms] hover:bg-[position:100%_0] disabled:bg-superficie-2 disabled:bg-none disabled:text-texto-apagado disabled:shadow-none",
        /** Secundário (vidro escuro). */
        outline:
          "border-linha-2 bg-superficie text-texto hover:border-[rgb(var(--ouro-rgb)/0.5)] hover:bg-superficie-2 disabled:text-texto-inativo aria-expanded:bg-superficie-2",
        secondary:
          "border-linha-2 bg-superficie text-texto hover:border-[rgb(var(--ouro-rgb)/0.5)] hover:bg-superficie-2 disabled:text-texto-inativo aria-expanded:bg-superficie-2",
        ghost:
          "text-texto-apagado hover:bg-superficie-2 hover:text-texto aria-expanded:bg-superficie-2 aria-expanded:text-texto",
        destructive: "border-erro/30 bg-erro/10 text-erro hover:bg-erro/15 disabled:opacity-50",
        /** Link de ação: repeated actions (Copiar, Baixar, Abrir). */
        link: "px-1 text-texto-apagado hover:text-texto",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 text-[13px] has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        /** 44px: the size of a principal CTA. */
        lg: "h-11 gap-2 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-9",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
