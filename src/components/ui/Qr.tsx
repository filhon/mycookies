import { encode } from "uqr";
import { cn } from "@/lib/utils/cn";

/**
 * O QR em SVG, desenhado aqui (`#d355`), do Pix e do link (`#d357`): sem PNG,
 * sem rede, nítido no papel em qualquer tamanho. Um caminho só, uma casa por
 * módulo escuro, na tinta da folha. Sem a zona de silêncio no desenho: o papel
 * em volta é ela, e o `gap` ao lado a garante. A folha e o link do pedido
 * (spec 171) usam o mesmo.
 */
export function Qr({ texto, className }: { texto: string; className: string }) {
  const { data, size } = encode(texto, { ecc: "M", border: 0 });
  const caminho = data
    .flatMap((linha, y) =>
      linha.map((escuro, x) => (escuro ? `M${x} ${y}h1v1h-1z` : "")),
    )
    .join("");
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      aria-hidden
      className={cn("shrink-0 fill-ink", className)}
    >
      <path d={caminho} />
    </svg>
  );
}
