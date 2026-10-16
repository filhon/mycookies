"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AJUDA_DA_ASSINATURA,
  MolduraDeEntrada,
} from "@/components/auth/MolduraDeEntrada";
import { Simbolo } from "@/components/marca/Marca";
import { FormularioDaPesquisa } from "@/components/pesquisa/FormularioDaPesquisa";
import { Botao } from "@/components/ui/Botao";
import { classesBotao } from "@/components/ui/estilosBotao";
import { paraSituar, situacaoDaConta } from "@/lib/domain/assinatura";
import { situacaoDaPesquisa } from "@/lib/domain/pesquisa";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/providers/AuthProvider";

/**
 * A pesquisa do fim do teste (spec 185). Fora do shell, em `(auth)`, como
 * `/assinatura`: no fim do teste o app manda para lá, e esta tela tem que
 * abrir mesmo com a conta vencida. Nenhuma tela trava por ela: "Agora não"
 * volta de onde ela veio.
 *
 * Só a dona, fundadora, com a pesquisa aberta. Qualquer outra conta, e a
 * ajudante, sai para `/`.
 */
export default function PaginaPesquisa() {
  const { usuario, contaId, papel, conta, carregando } = useAuth();
  const router = useRouter();
  const [mandada, setMandada] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);

  const agora = new Date().getTime();
  // Depois de mandar, a conta volta com `pesquisaRespondidaEm` e a situação
  // vira "fora": `mandada` segura a tela do obrigada.
  const fora =
    !mandada &&
    !!conta &&
    (papel !== "DONA" || situacaoDaPesquisa(conta, agora) === "fora");

  useEffect(() => {
    if (!carregando && !usuario) router.replace("/login");
    else if (!carregando && usuario && !contaId) router.replace("/");
    else if (fora) router.replace("/");
  }, [carregando, usuario, contaId, fora, router]);

  useEffect(() => {
    if (mandada) titulo.current?.focus();
  }, [mandada]);

  if (carregando || !usuario || !contaId || !conta || fora) {
    return (
      <div
        role="status"
        className="flex min-h-dvh items-center justify-center bg-canvas"
      >
        <Simbolo className="size-12 animate-pulse" />
        <span className="sr-only">Carregando…</span>
      </div>
    );
  }

  function agoraNao() {
    if (history.length > 1) router.back();
    else router.replace("/");
  }

  if (mandada) {
    const assinante =
      situacaoDaConta(paraSituar(conta), agora).tipo === "assinante";
    return (
      <MolduraDeEntrada
        titulo="Obrigada."
        descricao="O preço de fundadora já está na sua conta."
        refTitulo={titulo}
        ajuda={AJUDA_DA_ASSINATURA}
      >
        <Link
          href={assinante ? "/" : "/assinatura"}
          className={cn(
            classesBotao({ variante: "primaria", tamanho: "lg" }),
            "mt-8 w-full",
          )}
        >
          {assinante ? "Voltar" : "Ver os planos"}
        </Link>
      </MolduraDeEntrada>
    );
  }

  return (
    <MolduraDeEntrada
      titulo="Como foram os seus 14 dias?"
      descricao={`Você é a fundadora nº ${conta.beta?.fundadora}. O que você responder decide o que o Rende faz depois. Respondendo, o seu plano sai com 30% a menos, para sempre.`}
      ajuda={AJUDA_DA_ASSINATURA}
      classeDaColuna="max-w-xl"
    >
      <FormularioDaPesquisa
        contaId={contaId}
        padraoDoNome={conta.proprietaria?.trim() ?? ""}
        aoMandar={() => setMandada(true)}
        rodape={
          <Botao
            variante="terciaria"
            className="mt-4 w-full"
            onClick={agoraNao}
          >
            Agora não
          </Botao>
        }
      />
    </MolduraDeEntrada>
  );
}
