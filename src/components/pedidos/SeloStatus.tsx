import {
  Ban,
  CalendarCheck,
  CheckCheck,
  ChefHat,
  FileText,
  PackageCheck,
  type LucideIcon,
} from "lucide-react";
import { Selo, type TomSelo } from "@/components/ui/Selo";
import { ROTULO_STATUS_PEDIDO } from "@/lib/domain/pedido";
import type { StatusPedido } from "@/lib/types";

/**
 * O status sempre carrega ícone e palavra, nunca só cor.
 *
 * Aqui a regra pesa duas vezes: o vinho da marca e o vermelho de erro são
 * vizinhos de matiz, e "cancelado" precisa se distinguir de "confirmado" a meio
 * metro de distância, com a tela apoiada na bancada.
 */
export const APARENCIA_STATUS: Record<
  StatusPedido,
  { tom: TomSelo; icone: LucideIcon }
> = {
  ORCAMENTO: { tom: "neutro", icone: FileText },
  CONFIRMADO: { tom: "marca", icone: CalendarCheck },
  EM_PRODUCAO: { tom: "info", icone: ChefHat },
  PRONTO: { tom: "positivo", icone: PackageCheck },
  ENTREGUE: { tom: "neutro", icone: CheckCheck },
  CANCELADO: { tom: "negativo", icone: Ban },
};

export function SeloStatus({ status }: { status: StatusPedido }) {
  const { tom, icone: Icone } = APARENCIA_STATUS[status];

  return (
    <Selo
      tom={tom}
      icone={<Icone aria-hidden className="size-3.5" strokeWidth={1.75} />}
    >
      {ROTULO_STATUS_PEDIDO[status]}
    </Selo>
  );
}
