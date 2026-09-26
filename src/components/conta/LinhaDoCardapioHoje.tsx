"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Check, Store } from "lucide-react";
import { usePortao } from "@/components/assinatura/SoNoCompleto";
import { Botao } from "@/components/ui/Botao";
import { classesBotao } from "@/components/ui/estilosBotao";
import { docConfiguracao } from "@/lib/firebase/colecoes";
import { useDocumento } from "@/lib/hooks/useColecao";
import type { ConfiguracaoGeral } from "@/lib/types";
import { useContaId, usePapel } from "@/providers/AuthProvider";
import { useLinkDoCardapio } from "./useLinkDoCardapio";

/**
 * O cardápio perto da agenda, na semana calma (spec 046, `#d215`): quem manda
 * o link recebe pedido. Só a dona, e nunca no essencial, que não tem cardápio
 * (vender o upgrade aqui é a 048). Quem decide se a semana está calma é a
 * agenda, que monta esta linha.
 */
export function LinhaDoCardapioHoje() {
  const contaId = useContaId();
  const dona = usePapel() === "DONA";
  const portao = usePortao("cardapio");
  const mostra = dona && portao !== "fechado";

  const referencia = useMemo(
    () => (mostra ? docConfiguracao(contaId) : null),
    [mostra, contaId],
  );
  const { dado, carregando } = useDocumento<ConfiguracaoGeral>(referencia);
  const { podeCompartilhar, copiado, copiar, compartilhar } =
    useLinkDoCardapio();

  // Carregando não vira esqueleto: a linha pode não existir.
  if (!mostra || carregando) return null;

  const cardapio = dado?.cardapio;
  const produtos = cardapio?.fichaIds.length ?? 0;

  return (
    <div className="flex min-h-14 items-center gap-3 rounded-lg border border-line bg-surface px-5 py-3">
      <Store
        aria-hidden
        className="size-5 shrink-0 text-ink-muted"
        strokeWidth={1.75}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium text-ink">
          {cardapio?.aberto
            ? "Seu cardápio está no ar"
            : "Receba pedido por um link"}
        </span>
        <span className="num mt-0.5 block truncate text-label text-ink-muted">
          {cardapio?.aberto
            ? `${produtos} ${produtos === 1 ? "produto" : "produtos"}`
            : "Seus produtos e preços, para a bio e o WhatsApp"}
        </span>
      </span>
      {cardapio?.aberto ? (
        <Botao
          variante="terciaria"
          onClick={podeCompartilhar ? compartilhar : () => void copiar()}
          iconeInicial={
            copiado ? (
              <Check aria-hidden className="size-4" strokeWidth={2} />
            ) : undefined
          }
          className="shrink-0"
        >
          <span aria-live="polite">
            {copiado ? "Copiado" : "Mandar o link"}
          </span>
        </Botao>
      ) : (
        <Link
          href="/configuracao?painel=cardapio"
          className={classesBotao({
            variante: "terciaria",
            className: "shrink-0",
          })}
        >
          Abrir o cardápio
        </Link>
      )}
    </div>
  );
}
