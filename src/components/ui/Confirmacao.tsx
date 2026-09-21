"use client";

import { useEffect, useRef } from "react";
import { Botao } from "./Botao";

/**
 * A modal de confirmação destrutiva do `DESIGN.md`: título com a consequência,
 * dois botões, sem "X". É o `<dialog>` nativo (`#d133`): foco preso, `Escape`,
 * fundo e, no Android, o gesto de voltar fechando o diálogo, tudo do navegador.
 * Só abre por `showModal()`, e fechar por qualquer caminho é cancelar.
 */
export function Confirmacao({
  aberto,
  titulo,
  descricao,
  rotuloConfirmar,
  rotuloCancelar,
  aoConfirmar,
  aoCancelar,
  carregandoConfirmar = false,
}: {
  aberto: boolean;
  titulo: string;
  descricao: string;
  rotuloConfirmar: string;
  rotuloCancelar: string;
  aoConfirmar: () => void;
  aoCancelar: () => void;
  /** A confirmação chama um servidor que ainda não respondeu: carrega o botão em vez de fechar cedo. */
  carregandoConfirmar?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    else if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onClose={aoCancelar}
      aria-labelledby="confirmacao-titulo"
      aria-describedby="confirmacao-descricao"
      className="m-auto w-[min(92vw,26rem)] rounded-xl border border-line bg-surface p-5 text-ink shadow-overlay backdrop:bg-brand-800/35"
    >
      <h2
        id="confirmacao-titulo"
        className="font-display text-title font-semibold"
      >
        {titulo}
      </h2>
      <p id="confirmacao-descricao" className="mt-2 text-body text-ink-muted">
        {descricao}
      </p>
      <div className="mt-5 flex gap-3">
        <Botao
          autoFocus
          onClick={aoCancelar}
          disabled={carregandoConfirmar}
          className="flex-1"
        >
          {rotuloCancelar}
        </Botao>
        <Botao
          variante="perigo"
          onClick={aoConfirmar}
          carregando={carregandoConfirmar}
          className="flex-1"
        >
          {rotuloConfirmar}
        </Botao>
      </div>
    </dialog>
  );
}
