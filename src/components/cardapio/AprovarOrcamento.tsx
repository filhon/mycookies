"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CheckCheck } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { NOME_DE_QUEM_APROVA_MAX } from "@/lib/domain/acompanhamento";

/**
 * "Aprovar orçamento" na página do link (spec 149, sessão B, `#d358`). O nome
 * vem com o da cliente e é editável: quem aprova pela empresa não é a empresa.
 * Aprovado, a página se refaz no servidor e diz "Aprovado por …"; o botão some.
 */
export function AprovarOrcamento({
  endereco,
  pedidoId,
  chave,
  nomeInicial,
  quem,
}: {
  endereco: string;
  pedidoId: string;
  chave: string;
  nomeInicial: string;
  quem: string;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeInicial);
  const [erro, setErro] = useState<string>();
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aprovar(evento: FormEvent) {
    evento.preventDefault();
    if (!nome.trim()) {
      setErro("Escreva o seu nome.");
      return;
    }
    setErro(undefined);
    setFalha(null);
    setEnviando(true);
    try {
      const resposta = await fetch("/api/pedido/aprovar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contaId: endereco, pedidoId, chave, nome }),
      });
      if (resposta.ok || resposta.status === 409) {
        // 409 é "não dá mais": a página refeita diz por quê (venceu, foi
        // confirmado). O botão continua desabilitado até ela chegar.
        router.refresh();
        return;
      }
      setFalha(`Não deu para aprovar agora. Fale com a ${quem}.`);
    } catch {
      // `TypeError` do `fetch`: sem rede.
      setFalha("Sem internet. Tente de novo quando a conexão voltar.");
    }
    setEnviando(false);
  }

  return (
    <form
      onSubmit={aprovar}
      aria-labelledby="aprovar"
      className="mt-8 space-y-4"
      noValidate
    >
      <div>
        <h2 id="aprovar" className="text-subheading text-ink">
          Está tudo certo?
        </h2>
        <p className="mt-1 text-body text-ink-muted">
          Aprove por aqui, e a {quem} confirma a data com você.
        </p>
      </div>
      <Campo
        rotulo="Seu nome"
        dica="Se for por uma empresa, o nome de quem aprova."
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        maxLength={NOME_DE_QUEM_APROVA_MAX}
        autoComplete="name"
        erro={erro}
      />
      <Botao
        type="submit"
        variante="loja"
        tamanho="lg"
        larguraTotal
        carregando={enviando}
        iconeInicial={
          <CheckCheck aria-hidden className="size-5" strokeWidth={1.75} />
        }
      >
        Aprovar orçamento
      </Botao>
      {falha && (
        <p role="alert" className="text-label text-negative">
          {falha}
        </p>
      )}
    </form>
  );
}
