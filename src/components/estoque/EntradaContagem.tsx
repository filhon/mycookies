import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { classesBotao, type TamanhoBotao } from "@/components/ui/estilosBotao";

/**
 * A entrada para a contagem da despensa.
 *
 * Mora em `/compras`, e não em `/insumos`: contar é ato de compra — o número
 * existe para a lista, e é contado antes de sair de casa ou depois de guardar as
 * sacolas. O cabeçalho de `/insumos` já tem duas ações e um botão flutuante no
 * celular; uma terceira ali seria empilhar por arrumação, e não por uso.
 *
 * O rótulo encolhe para "Contar" em 360px, onde ele divide a linha com o título
 * e com "Refazer". O nome inteiro continua sendo dito pelo `aria-label` e pelo
 * título da tela de destino.
 */
export function EntradaContagem({
  tamanho = "md",
}: {
  tamanho?: TamanhoBotao;
}) {
  return (
    <Link
      href="/insumos/contagem"
      aria-label="Contar a despensa"
      className={classesBotao({ tamanho })}
    >
      <ClipboardList aria-hidden className="size-5" strokeWidth={1.75} />
      <span className="sm:hidden">Contar</span>
      <span className="hidden sm:inline">Contar a despensa</span>
    </Link>
  );
}
