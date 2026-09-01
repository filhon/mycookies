import { cn } from "@/lib/utils/cn";

/** Bloco de carregamento com a forma do conteúdo real, nunca um giro no vazio. */
export function Esqueleto({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-sm bg-sunken", className)}
    />
  );
}

/** Esqueleto de linha de lista: mesma altura e mesmo ritmo da linha real. */
export function EsqueletoLista({ linhas = 5 }: { linhas?: number }) {
  return (
    <div role="status" aria-label="Carregando" className="divide-y divide-line">
      {Array.from({ length: linhas }).map((_, indice) => (
        <div key={indice} className="flex items-center gap-3 px-4 py-3.5">
          <Esqueleto className="size-10 shrink-0 rounded-md" />
          <div className="flex-1 space-y-2">
            <Esqueleto className="h-4 w-2/5" />
            <Esqueleto className="h-3 w-1/4" />
          </div>
          <Esqueleto className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
