export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-1 flex-col">
      <main className="flex flex-1 items-center justify-center px-4 py-12">{children}</main>
      <footer className="pb-6 text-center etiqueta text-texto-inativo">
        WRMax Marketing · métricas de tráfego pago
      </footer>
    </div>
  );
}
