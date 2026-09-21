"use client";

import { useState } from "react";
import { Download, UserX } from "lucide-react";
import { Confirmacao } from "@/components/ui/Confirmacao";
import {
  DIAS_ATE_A_PURGA,
  MENSAGEM_FALHA_MEUS_DADOS,
  type FalhaMeusDados,
} from "@/lib/domain/meusDados";
import { AVISO_SAIR_PENDENTE, useAuth } from "@/providers/AuthProvider";

/**
 * "Baixar meus dados" e "Encerrar minha conta" (spec 029): a prateleira de
 * `/configuracao`, entre "Como funciona" e "Sair", e o mesmo bloco nos dois
 * estados vencidos de `/assinatura`. Ao encerrar, o componente não chama
 * `sair()`: o documento vira `"ENCERRADA"` e é o `AuthProvider` quem tira do
 * app, neste aparelho e em qualquer outro (`DECISOES.md#d148`).
 */
export function MeusDados() {
  const { usuario, contaId, escritasSubiram } = useAuth();

  const [baixando, setBaixando] = useState(false);
  const [erroBaixar, setErroBaixar] = useState<string | null>(null);

  const [modalAberta, setModalAberta] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [erroEncerrar, setErroEncerrar] = useState<string | null>(null);
  const [sairPendente, setSairPendente] = useState(false);

  async function baixar() {
    if (!usuario || !contaId) return;
    setErroBaixar(null);
    setBaixando(true);
    try {
      const resposta = await fetch(`/api/conta/exportar?contaId=${contaId}`, {
        headers: { authorization: `Bearer ${await usuario.getIdToken()}` },
      });
      if (!resposta.ok) {
        setErroBaixar(MENSAGEM_FALHA_MEUS_DADOS[await codigoDaFalha(resposta)]);
        return;
      }
      const nome = nomeDoAnexo(resposta) ?? "rende-dados.json";
      const url = URL.createObjectURL(await resposta.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = nome;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // `TypeError` do `fetch`: sem rede, ou a rota bloqueada. A leitura é do
      // servidor, então sem rede nada é baixado (`DECISOES.md#d149`).
      setErroBaixar(MENSAGEM_FALHA_MEUS_DADOS["sem-rede"]);
    } finally {
      setBaixando(false);
    }
  }

  async function confirmarEncerramento() {
    if (!usuario || !contaId) return;
    setErroEncerrar(null);
    setSairPendente(false);

    // O que ela salvou sem rede não pode ser a última coisa que o
    // encerramento apaga (`DECISOES.md#d118`).
    if (!(await escritasSubiram())) {
      setModalAberta(false);
      setSairPendente(true);
      return;
    }

    setEncerrando(true);
    try {
      const resposta = await fetch("/api/conta/encerrar", {
        method: "POST",
        headers: {
          authorization: `Bearer ${await usuario.getIdToken()}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ contaId }),
      });
      setModalAberta(false);
      if (!resposta.ok) {
        setErroEncerrar(
          MENSAGEM_FALHA_MEUS_DADOS[await codigoDaFalha(resposta)],
        );
        setEncerrando(false);
        return;
      }
      // `ok`: o AuthProvider observa `conta.status === "ENCERRADA"` e sai sozinho.
    } catch {
      setModalAberta(false);
      setErroEncerrar(MENSAGEM_FALHA_MEUS_DADOS["sem-rede"]);
      setEncerrando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void baixar()}
        disabled={baixando}
        aria-busy={baixando}
        className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-4 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken disabled:opacity-60 lg:px-5"
      >
        <Download
          aria-hidden
          className="size-5 shrink-0 text-ink-muted"
          strokeWidth={1.75}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-body font-medium text-ink">
            Baixar meus dados
          </span>
          <span className="mt-0.5 block text-label text-ink-muted">
            Um arquivo com tudo o que você cadastrou: materiais, produtos,
            pedidos, clientes e caixa.
          </span>
        </span>
      </button>
      {erroBaixar && (
        <p role="alert" className="text-label text-negative">
          {erroBaixar}
        </p>
      )}

      <button
        type="button"
        onClick={() => setModalAberta(true)}
        className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-4 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken lg:px-5"
      >
        <UserX
          aria-hidden
          className="size-5 shrink-0 text-negative"
          strokeWidth={1.75}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-body font-medium text-negative">
            Encerrar minha conta
          </span>
          <span className="mt-0.5 block text-label text-ink-muted">
            Você sai agora, e o que cadastrou é apagado de vez em até{" "}
            {DIAS_ATE_A_PURGA} dias.
          </span>
        </span>
      </button>
      {erroEncerrar && (
        <p role="alert" className="text-label text-negative">
          {erroEncerrar}
        </p>
      )}
      {sairPendente && (
        <p aria-live="polite" className="text-label text-ink-muted">
          {AVISO_SAIR_PENDENTE}
        </p>
      )}

      <Confirmacao
        aberto={modalAberta}
        titulo="Encerrar a sua conta?"
        descricao={`Você sai agora e não entra mais. Materiais, produtos, pedidos, clientes e caixa são apagados de vez em até ${DIAS_ATE_A_PURGA} dias. Se quiser guardar, baixe os seus dados antes.`}
        rotuloConfirmar="Encerrar conta"
        rotuloCancelar="Voltar"
        carregandoConfirmar={encerrando}
        aoConfirmar={() => void confirmarEncerramento()}
        aoCancelar={() => setModalAberta(false)}
      />
    </>
  );
}

/** `content-disposition: attachment; filename="…"` → o nome, ou `null`. */
function nomeDoAnexo(resposta: Response): string | null {
  const cabecalho = resposta.headers.get("content-disposition") ?? "";
  return /filename="([^"]+)"/.exec(cabecalho)?.[1] ?? null;
}

/** O padrão de `TelaNota` e `PaginaCadastro`: o corpo diz o código; sem corpo, o status decide. */
async function codigoDaFalha(resposta: Response): Promise<FalhaMeusDados> {
  try {
    const corpo = (await resposta.json()) as { erro?: string };
    if (corpo.erro && corpo.erro in MENSAGEM_FALHA_MEUS_DADOS) {
      return corpo.erro as FalhaMeusDados;
    }
  } catch {
    // Resposta sem corpo JSON. O status conta o resto.
  }

  if (resposta.status === 401) return "sem-acesso";
  if (resposta.status === 400) return "fora-de-forma";
  return "sem-resposta";
}
