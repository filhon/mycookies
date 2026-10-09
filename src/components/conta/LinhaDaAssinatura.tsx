"use client";

import { useState } from "react";
import { ChevronRight, CreditCard, Plus, TriangleAlert } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { Painel } from "@/components/ui/Painel";
import {
  cobrancaPrevistaMs,
  fraseDaCobranca,
  fraseDaEconomia,
  fraseDoPlano,
  legendaDaAssinatura,
  MENSAGEM_FALHA_ASSINATURA,
  NOME_DO_PACOTE,
  oQueOCompletoTraz,
  type FalhaAssinatura,
  type ResumoAssinatura,
} from "@/lib/domain/assinatura";
import type { Centavos, Pacote } from "@/lib/types";
import { useAuth, useContaId } from "@/providers/AuthProvider";

type Precos = Record<Pacote, { mensal: Centavos; anual: Centavos }>;

/**
 * "Assinatura" em "A sua conta", para a assinante (spec 084, `#d285`): a
 * linha diz o plano e a renovação pelo que o aparelho sabe; o painel lê no
 * Stripe o valor, a próxima cobrança e o cartão, e mostra o que o completo
 * traz. Sem rede ou sem resposta, fica o que o aparelho sabe, nunca um erro.
 */
export function LinhaDaAssinatura({
  pacote,
  renovaEmMs,
}: {
  pacote: Pacote;
  renovaEmMs: number;
}) {
  const contaId = useContaId();
  const { usuario } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [resumo, setResumo] = useState<ResumoAssinatura | null>(null);
  const [precos, setPrecos] = useState<Precos | null>(null);
  const [enviando, setEnviando] = useState<"completo" | "portal" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  /** `null` em qualquer falha: quem chama fica com o que o aparelho sabe. */
  async function ler<T>(url: string, corpo?: object): Promise<T | null> {
    try {
      const resposta = await fetch(url, {
        method: corpo ? "POST" : "GET",
        headers: {
          authorization: `Bearer ${await usuario!.getIdToken()}`,
          "content-type": "application/json",
        },
        body: corpo && JSON.stringify(corpo),
      });
      return resposta.ok ? ((await resposta.json()) as T) : null;
    } catch {
      return null;
    }
  }

  // No toque, e não num efeito: a cada abertura, o que o Stripe diz agora.
  async function abrir() {
    setAberto(true);
    if (!usuario) return;
    setCarregando(true);
    const [lido, tabela] = await Promise.all([
      ler<ResumoAssinatura>("/api/assinatura/resumo", { contaId }),
      ler<Precos>("/api/assinatura/precos"),
    ]);
    if (lido) setResumo(lido);
    if (tabela) setPrecos(tabela);
    setCarregando(false);
  }

  async function abrirPortal(qual: "completo" | "portal") {
    if (!usuario) return;
    setErro(null);
    setEnviando(qual);
    try {
      const resposta = await fetch("/api/assinatura/portal", {
        method: "POST",
        headers: {
          authorization: `Bearer ${await usuario.getIdToken()}`,
          "content-type": "application/json",
        },
        // O completo abre direto na confirmação da troca (`#d313`).
        body: JSON.stringify(
          qual === "completo" ? { contaId, para: "COMPLETO" } : { contaId },
        ),
      });
      if (!resposta.ok) {
        const corpo = (await resposta.json().catch(() => ({}))) as {
          erro?: string;
        };
        setErro(
          MENSAGEM_FALHA_ASSINATURA[
            corpo.erro && corpo.erro in MENSAGEM_FALHA_ASSINATURA
              ? (corpo.erro as FalhaAssinatura)
              : "sem-resposta"
          ],
        );
        setEnviando(null);
        return;
      }
      const { url } = (await resposta.json()) as { url: string };
      window.location.assign(url);
    } catch {
      setErro(MENSAGEM_FALHA_ASSINATURA["sem-rede"]);
      setEnviando(null);
    }
  }

  const traz = oQueOCompletoTraz(pacote);
  const economia =
    resumo?.periodo === "mensal" && resumo.valor > 0 && precos
      ? fraseDaEconomia(precos[pacote])
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => void abrir()}
        className="flex w-full items-center gap-3 border-t border-line px-4 py-4 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken lg:px-5"
      >
        <CreditCard
          aria-hidden
          className="size-5 shrink-0 text-ink-muted"
          strokeWidth={1.75}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-body font-medium text-ink">
            Assinatura
          </span>
          <span className="mt-0.5 block truncate text-label text-ink-muted">
            {legendaDaAssinatura(pacote, renovaEmMs)}
          </span>
        </span>
        <ChevronRight
          aria-hidden
          className="size-5 shrink-0 text-ink-subtle"
          strokeWidth={1.75}
        />
      </button>

      <Painel
        aberto={aberto}
        aoFechar={() => {
          setAberto(false);
          setErro(null);
        }}
        titulo="Assinatura"
      >
        <div className="space-y-8">
          <div className="space-y-2" aria-busy={carregando}>
            <p className="text-subheading font-semibold tabular-nums text-ink">
              {resumo
                ? fraseDoPlano(pacote, resumo)
                : `Plano ${NOME_DO_PACOTE[pacote]}`}
            </p>

            {resumo?.cancela ? (
              <div className="flex items-start gap-2.5 rounded-md border border-attention/30 bg-attention-soft px-3 py-3 text-body text-ink">
                <TriangleAlert
                  aria-hidden
                  className="mt-1 size-4 shrink-0 text-attention"
                  strokeWidth={1.75}
                />
                <p>{fraseDaCobranca(resumo)}</p>
              </div>
            ) : (
              <p className="text-body text-ink">
                {fraseDaCobranca(
                  resumo ?? {
                    ateMs: cobrancaPrevistaMs(renovaEmMs),
                    final: null,
                    cancela: false,
                  },
                )}
              </p>
            )}

            {carregando && !resumo ? (
              <Esqueleto className="h-4 w-3/5" />
            ) : (
              !resumo && (
                <p className="text-label text-ink-muted">
                  O valor e o cartão aparecem com internet.
                </p>
              )
            )}

            {economia && (
              <p className="text-label text-ink-muted">{economia}.</p>
            )}
          </div>

          {traz.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-label font-semibold text-ink">
                O Completo traz:
              </h3>
              <ul className="space-y-2">
                {traz.map((frase) => (
                  <li
                    key={frase}
                    className="flex items-start gap-2.5 text-body text-ink"
                  >
                    <Plus
                      aria-hidden
                      className="mt-1 size-4 shrink-0 text-ink-subtle"
                      strokeWidth={1.75}
                    />
                    <span className="max-w-[52ch]">{frase}</span>
                  </li>
                ))}
              </ul>
              <Botao
                larguraTotal
                onClick={() => void abrirPortal("completo")}
                carregando={enviando === "completo"}
                disabled={enviando !== null}
              >
                Passar para o Completo
              </Botao>
            </div>
          )}

          <div className="space-y-2 border-t border-line pt-4">
            <Botao
              variante="terciaria"
              larguraTotal
              onClick={() => void abrirPortal("portal")}
              carregando={enviando === "portal"}
              disabled={enviando !== null}
            >
              Trocar o cartão, ver as cobranças ou cancelar
            </Botao>
            {erro && (
              <p role="alert" className="text-label text-negative">
                {erro}
              </p>
            )}
          </div>
        </div>
      </Painel>
    </>
  );
}
