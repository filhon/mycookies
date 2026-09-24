"use client";

import { useState, type ReactNode } from "react";
import { Lock, TriangleAlert } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import {
  MENSAGEM_FALHA_ASSINATURA,
  paraSituar,
  permite,
  situacaoDaConta,
  type FalhaAssinatura,
  type Recurso,
} from "@/lib/domain/assinatura";
import { useAuth, useContaId } from "@/providers/AuthProvider";

/**
 * Onde o recurso está em relação ao pacote (spec 032, 3.6). Quem fecha é o
 * servidor (`DECISOES.md#d167`); a tela só diz a verdade sobre o portão.
 *
 * - `no-teste`: aberto, com a linha que avisa que é do completo (`#d168`);
 * - `fechado`: assinante de um pacote sem o recurso;
 * - `aberto`: o resto (livre, completo, e a vencida, que nem chega aqui).
 */
export function usePortao(recurso: Recurso): "aberto" | "no-teste" | "fechado" {
  const { conta } = useAuth();
  if (!conta) return "aberto";
  // `new Date().getTime()`: o compilador do React recusa `Date.now()` no corpo.
  const situacao = situacaoDaConta(paraSituar(conta), new Date().getTime());
  if (situacao.tipo === "teste") return "no-teste";
  return situacao.tipo === "assinante" && !permite(situacao, recurso)
    ? "fechado"
    : "aberto";
}

/** A linha do topo do painel durante o teste inteiro. */
export function LinhaNoTeste() {
  return (
    <p className="text-label text-ink-muted">
      No teste está aberto. Depois, é do plano completo.
    </p>
  );
}

/** A legenda da linha na prateleira: o cadeado e a palavra, nunca só a cor. */
export function LegendaNoCompleto() {
  return (
    <>
      <Lock
        aria-hidden
        className="mr-1 inline size-3.5 align-[-2px]"
        strokeWidth={1.75}
      />
      No plano completo
    </>
  );
}

/**
 * O painel inteiro quando o pacote não tem o recurso: a explicação e o botão
 * que leva ao portal, onde se muda de plano. Nenhum controle de edição, nenhuma
 * escrita. `aviso` é o triângulo de atenção, para quando algo saiu do ar.
 */
export function SoNoCompleto({
  aviso = false,
  children,
}: {
  aviso?: boolean;
  children: ReactNode;
}) {
  const contaId = useContaId();
  const { usuario } = useAuth();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function mudar() {
    if (!usuario) return;
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await fetch("/api/assinatura/portal", {
        method: "POST",
        headers: {
          authorization: `Bearer ${await usuario.getIdToken()}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ contaId }),
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
        setEnviando(false);
        return;
      }
      const { url } = (await resposta.json()) as { url: string };
      window.location.assign(url);
    } catch {
      setErro(MENSAGEM_FALHA_ASSINATURA["sem-rede"]);
      setEnviando(false);
    }
  }

  const Icone = aviso ? TriangleAlert : Lock;

  return (
    <div className="space-y-4">
      <div
        className={
          aviso
            ? "flex items-start gap-2.5 rounded-md border border-attention/30 bg-attention-soft px-3 py-3 text-body text-ink"
            : "flex items-start gap-2.5 text-body text-ink"
        }
      >
        <Icone
          aria-hidden
          className={
            aviso
              ? "mt-1 size-4 shrink-0 text-attention"
              : "mt-1 size-4 shrink-0 text-ink-muted"
          }
          strokeWidth={1.75}
        />
        <p className="max-w-[52ch]">{children}</p>
      </div>
      <Botao
        variante="primaria"
        tamanho="lg"
        larguraTotal
        onClick={() => void mudar()}
        carregando={enviando}
      >
        Mudar para o completo
      </Botao>
      {erro && (
        <p role="alert" className="text-label text-negative">
          {erro}
        </p>
      )}
    </div>
  );
}
