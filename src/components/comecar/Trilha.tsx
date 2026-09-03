import { Check, CircleDashed, CircleDot } from "lucide-react";
import { Selo } from "@/components/ui/Selo";
import type { EstadoPasso } from "@/lib/domain/onboarding";
import { cn } from "@/lib/utils/cn";

/**
 * O progresso do caminho, em segmentos e não em barra de porcentagem.
 *
 * A unidade é o passo: uma barra em 40% de um caminho de cinco é uma precisão
 * que não existe. O número em texto ("2 de 5") caminha ao lado e é quem carrega
 * o significado — estes segmentos são o eco visual dele, e por isso saem do
 * alcance do leitor de tela.
 */
export function Trilha({
  feitos,
  total,
  className,
}: {
  feitos: number;
  total: number;
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("flex items-center gap-1.5", className)}>
      {Array.from({ length: total }, (_, indice) => (
        <span
          key={indice}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors duration-150 ease-quart",
            indice < feitos ? "bg-wine-700 dark:bg-wine-300" : "bg-line",
          )}
        />
      ))}
    </div>
  );
}

const APARENCIA: Record<
  EstadoPasso,
  { rotulo: string; tom: "positivo" | "marca" | "neutro" }
> = {
  FEITO: { rotulo: "Feito", tom: "positivo" },
  AGORA: { rotulo: "Agora", tom: "marca" },
  DEPOIS: { rotulo: "Depois", tom: "neutro" },
};

/**
 * O estado de um passo, com ícone e palavra.
 *
 * A invariante de nunca deixar a cor sozinha vale duplamente aqui: o vinho de
 * "agora" e o verde de "feito" não podem ser a única diferença entre um passo
 * que ela precisa fazer e um que ela já fez.
 */
export function SeloDoPasso({ estado }: { estado: EstadoPasso }) {
  const { rotulo, tom } = APARENCIA[estado];
  const Icone =
    estado === "FEITO" ? Check : estado === "AGORA" ? CircleDot : CircleDashed;

  return (
    <Selo
      tom={tom}
      icone={
        <Icone aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
      }
    >
      {rotulo}
    </Selo>
  );
}
