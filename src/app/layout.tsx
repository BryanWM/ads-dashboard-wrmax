import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";

import { Providers } from "@/components/providers";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { cn } from "@/lib/utils";

import "./globals.css";

// WRMax DS: load only the weights the brand book lists.
const sora = Sora({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-sora" });
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: { default: "WRMax Metrics", template: "%s · WRMax Metrics" },
  description: "Acompanhamento de métricas de tráfego pago.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e6" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0907" },
  ],
  colorScheme: "dark light",
  // Lets the bottom bar use env(safe-area-inset-bottom) on iPhones.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Dark is the server default; THEME_BOOT_SCRIPT switches to the saved/device theme
    // before first paint (hence suppressHydrationWarning on <html> only).
    <html
      lang="pt-BR"
      data-theme="dark"
      suppressHydrationWarning
      className={cn("dark h-full antialiased", sora.variable, inter.variable, jetbrains.variable)}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
