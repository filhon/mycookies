"use client";

import { useState } from "react";
import { CloudOff, Info } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { classesBotao } from "@/components/ui/estilosBotao";
import { hojeEmBrasilia, rotuloDiaNoAno } from "@/lib/domain/datas";
import {
  assuntoDaMudanca,
  mudancaParaAvisar,
  PRIMEIRA_VERSAO,
  VERSOES_PRIVACIDADE,
  VERSOES_TERMOS,
} from "@/lib/domain/textoLegal";
import { useConexao } from "@/lib/hooks/useDispositivo";
import { useAuth, useContaId } from "@/providers/AuthProvider";

const DOCUMENTOS = [
  {
    nome: "A política de privacidade",
    href: "/privacidade#o-que-mudou",
    versoes: VERSOES_PRIVACIDADE,
  },
  {
    nome: "Os termos de uso",
    href: "/termos#o-que-mudou",
    versoes: VERSOES_TERMOS,
  },
] as const;

/**
 * O aviso de mudança relevante nos termos ou na privacidade, na Hoje, só para
 * a dona (spec 166, `DECISOES.md#d380`). Aviso, não portão: nunca bloqueia
 * nada. "Entendi" grava `termosVersao` e some na hora; se a gravação falhar,
 * volta.
 */
export function AvisoDosTermos() {
  const { conta, usuario } = useAuth();
  const contaId = useContaId();
  const online = useConexao();
  const [entendeu, setEntendeu] = useState(false);

  if (!conta || entendeu) return null;
  const aceita = conta.termosVersao ?? PRIMEIRA_VERSAO;
  const avisos = DOCUMENTOS.flatMap((documento) => {
    const mudanca = mudancaParaAvisar(documento.versoes, aceita);
    return mudanca ? [{ ...documento, mudanca }] : [];
  });
  if (avisos.length === 0) return null;

  async function entender() {
    if (!online || !usuario) return;
    setEntendeu(true);
    try {
      const token = await usuario.getIdToken();
      const resposta = await fetch("/api/conta/termos", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ contaId }),
      });
      if (!resposta.ok) setEntendeu(false);
    } catch {
      setEntendeu(false);
    }
  }

  const hoje = hojeEmBrasilia(new Date());

  return (
    <div className="flex gap-3 rounded-lg border border-info/30 bg-info-soft px-4 py-3">
      <Info
        aria-hidden
        className="mt-0.5 size-5 shrink-0 text-info"
        strokeWidth={1.75}
      />
      <div className="min-w-0 flex-1">
        {avisos.map(({ nome, mudanca }) => (
          <p key={nome} className="text-body text-ink">
            {nome} mudou em {rotuloDiaNoAno(mudanca.em, hoje)}:{" "}
            {assuntoDaMudanca(mudanca)}.
          </p>
        ))}
        <div className="-ml-3 mt-1 flex flex-wrap items-center gap-x-2">
          {avisos.map(({ nome, href }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener"
              className={classesBotao({ variante: "terciaria", tamanho: "sm" })}
            >
              {avisos.length > 1
                ? `Ler o que mudou: ${nome.toLowerCase()}`
                : "Ler o que mudou"}
              <span className="sr-only"> (abre em outra aba)</span>
            </a>
          ))}
          <Botao
            variante="terciaria"
            tamanho="sm"
            aria-disabled={!online || undefined}
            onClick={() => void entender()}
            className={online ? undefined : "cursor-not-allowed opacity-45"}
          >
            Entendi
          </Botao>
        </div>
        {!online && (
          <p
            aria-live="polite"
            className="flex items-start gap-1.5 text-label text-ink-muted"
          >
            <CloudOff
              aria-hidden
              className="mt-0.5 size-4 shrink-0"
              strokeWidth={1.75}
            />
            Precisa de internet.
          </p>
        )}
      </div>
    </div>
  );
}
