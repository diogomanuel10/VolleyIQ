import type { ReactNode } from "react";

/**
 * Layout partilhado pelas páginas legais (Privacidade, Termos). Pensado para
 * ser legível com ou sem sessão iniciada — não depende de hooks de auth/equipa.
 */
export function LegalDoc({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-full bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <a href="/#/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="VolleyIQ" className="h-7 w-7" />
            <span className="font-semibold text-sm">VolleyIQ</span>
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: {lastUpdated}
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
          {children}
        </div>

        <footer className="mt-12 pt-6 border-t flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <a href="/#/legal/privacy" className="text-primary hover:underline">
            Política de Privacidade
          </a>
          <a href="/#/legal/terms" className="text-primary hover:underline">
            Termos de Serviço
          </a>
          <a href="/#/" className="text-muted-foreground hover:text-foreground">
            Voltar à aplicação
          </a>
        </footer>
      </main>
    </div>
  );
}

/** Secção com título — mantém consistência tipográfica entre documentos. */
export function LegalSection({
  id,
  heading,
  children,
}: {
  id?: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="space-y-3 scroll-mt-20">
      <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
      {children}
    </section>
  );
}
