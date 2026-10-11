import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";

import { Providers } from "@/components/providers";
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
  themeColor: "#0a0907",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={cn("dark h-full antialiased", sora.variable, inter.variable, jetbrains.variable)}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
