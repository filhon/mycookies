"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { query, where } from "firebase/firestore";
import { BellOff, BellRing, CloudOff, Smartphone } from "lucide-react";
import { useInstalado } from "@/components/comecar/InstalarNaTela";
import { Botao } from "@/components/ui/Botao";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  ativarAviso,
  avisoSuportado,
  desativarAviso,
  ehIphone,
  lerAparelhoLocal,
} from "@/lib/firebase/avisos";
import { colAparelhos } from "@/lib/firebase/colecoes";
import { useColecao } from "@/lib/hooks/useColecao";
import { useConexao } from "@/lib/hooks/useDispositivo";
import { cn } from "@/lib/utils/cn";
import { useAuth, useContaId } from "@/providers/AuthProvider";

/**
 * O aviso de pedido novo neste aparelho (spec 119, `#d323`), em dois lugares:
 * a linha de `/configuracao#avisos` e o convite de "Seu cardápio". Os quatro
 * casos que não ativam são ditos, e não escondidos, menos o navegador sem
 * suporte, onde a linha some.
 */
type Situacao =
  | "carregando"
  | "sem-suporte"
  | "instalar"
  | "bloqueado"
  | "ativo"
  | "desligado";

function useAvisoNoAparelho() {
  const contaId = useContaId();
  const { usuario } = useAuth();
  const instalado = useInstalado();
  const online = useConexao();
  const [suporte, setSuporte] = useState<boolean | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [local, setLocal] = useState<string | null>(null);
  const [ativando, setAtivando] = useState(false);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let vivo = true;
    void avisoSuportado().then((sim) => {
      if (!vivo) return;
      setSuporte(sim);
      setBloqueado(sim && Notification.permission === "denied");
      setLocal(lerAparelhoLocal());
    });
    return () => {
      vivo = false;
    };
  }, []);

  const consulta = useMemo(
    () => query(colAparelhos(contaId), where("ativo", "==", true)),
    [contaId],
  );
  const ativos = useColecao(consulta);
  const outros = ativos.dados.filter((aparelho) => aparelho.id !== local);
  const esteAtivo = outros.length < ativos.dados.length;

  // O iPhone fora do app instalado não tem como avisar, e instalar resolve.
  const iphoneFora = suporte !== null && !instalado && ehIphone();
  const situacao: Situacao =
    suporte === null || ativos.carregando
      ? "carregando"
      : iphoneFora
        ? "instalar"
        : !suporte
          ? "sem-suporte"
          : bloqueado
            ? "bloqueado"
            : esteAtivo
              ? "ativo"
              : "desligado";

  async function ativar() {
    if (!usuario) return;
    setFalhou(false);
    setAtivando(true);
    const resultado = await ativarAviso(contaId, usuario.uid);
    setAtivando(false);
    // Fechar a pergunta sem responder não é bloquear: a linha fica como está.
    setBloqueado(Notification.permission === "denied");
    setFalhou(resultado === "falhou");
    setLocal(lerAparelhoLocal());
  }

  function desativar() {
    desativarAviso(contaId);
    setLocal(null);
  }

  return {
    situacao,
    online,
    ativando,
    falhou,
    outros,
    nenhumNaConta: ativos.dados.length === 0,
    ativar,
    desativar,
  };
}

/** "1 computador", "2 celulares e 1 computador". */
function tambemEm(outros: { plataforma: string }[]): string {
  const computadores = outros.filter((a) => a.plataforma === "computador");
  const celulares = outros.length - computadores.length;
  return [
    celulares && `${celulares} ${celulares === 1 ? "celular" : "celulares"}`,
    computadores.length &&
      `${computadores.length} ${computadores.length === 1 ? "computador" : "computadores"}`,
  ]
    .filter(Boolean)
    .join(" e ");
}

const TITULO = "Avisar neste aparelho quando chegar pedido pelo cardápio";

/** A linha da Configuração. `className` é a `LINHA` da tela. */
export function LinhaDoAviso({ className }: { className: string }) {
  const aviso = useAvisoNoAparelho();
  const { situacao } = aviso;

  if (situacao === "carregando" || situacao === "sem-suporte") return null;

  const icone = (
    <span className="shrink-0 self-start pt-0.5">
      {situacao === "bloqueado" ? (
        <BellOff
          aria-hidden
          className="size-5 text-attention"
          strokeWidth={1.75}
        />
      ) : situacao === "instalar" ? (
        <Smartphone
          aria-hidden
          className="size-5 text-ink-muted"
          strokeWidth={1.75}
        />
      ) : (
        <BellRing
          aria-hidden
          className="size-5 text-ink-muted"
          strokeWidth={1.75}
        />
      )}
    </span>
  );

  if (situacao === "instalar" || situacao === "bloqueado") {
    return (
      <div
        className={cn(className, "hover:bg-transparent active:bg-transparent")}
      >
        {icone}
        <span className="min-w-0 flex-1">
          <span className="block text-body font-medium text-ink">{TITULO}</span>
          <span className="mt-0.5 block text-label text-ink-muted">
            {situacao === "instalar"
              ? "No iPhone, o aviso só funciona com o Rende instalado na tela de início."
              : "O aviso está bloqueado neste navegador. Libere nas configurações do site."}
          </span>
          {situacao === "instalar" && (
            <Link
              href="/comecar#instalar"
              className={cn(
                classesBotao({ variante: "terciaria", tamanho: "sm" }),
                "-ml-3 mt-1",
              )}
            >
              Instalar
            </Link>
          )}
        </span>
      </div>
    );
  }

  const ativo = situacao === "ativo";
  const semRede = !ativo && !aviso.online;

  return (
    <label
      className={cn(
        className,
        "cursor-pointer has-disabled:cursor-not-allowed has-disabled:hover:bg-transparent",
      )}
    >
      {icone}
      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium text-ink">{TITULO}</span>
        <span
          aria-live="polite"
          className="mt-0.5 block text-label text-ink-muted"
        >
          {ativo ? (
            <>
              Ativo neste aparelho
              {aviso.outros.length > 0 && (
                <span className="block">
                  Também em: {tambemEm(aviso.outros)}
                </span>
              )}
            </>
          ) : semRede ? (
            <span className="flex items-start gap-1.5">
              <CloudOff
                aria-hidden
                className="mt-0.5 size-4 shrink-0"
                strokeWidth={1.75}
              />
              Precisa de internet para ativar.
            </span>
          ) : aviso.falhou ? (
            "Não deu para ativar agora. Tente de novo."
          ) : aviso.outros.length > 0 ? (
            `Ativo em: ${tambemEm(aviso.outros)}`
          ) : (
            "O celular toca quando uma cliente manda pedido, mesmo com o Rende fechado."
          )}
        </span>
      </span>
      <input
        type="checkbox"
        checked={ativo}
        disabled={semRede || aviso.ativando}
        onChange={(evento) =>
          evento.target.checked ? void aviso.ativar() : aviso.desativar()
        }
        className="size-5 shrink-0"
      />
    </label>
  );
}

/**
 * O convite de "Seu cardápio" aberto, enquanto nenhum aparelho da conta avisa.
 * Some quando este aparelho não pode ativar: a linha da Configuração explica.
 */
export function ConviteDoAviso() {
  const aviso = useAvisoNoAparelho();
  if (aviso.situacao !== "desligado" || !aviso.nenhumNaConta) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-info/30 bg-info-soft py-1.5 pr-1.5 pl-3 text-label text-ink">
      <BellRing
        aria-hidden
        className="size-4 shrink-0 text-info"
        strokeWidth={1.75}
      />
      <span className="min-w-0 flex-1 py-1.5">
        Quer saber na hora quando chegar um pedido?
      </span>
      <Botao
        tamanho="sm"
        variante="terciaria"
        onClick={() => void aviso.ativar()}
        carregando={aviso.ativando}
        disabled={!aviso.online}
      >
        Avisar neste aparelho
      </Botao>
      {(!aviso.online || aviso.falhou) && (
        <span aria-live="polite" className="basis-full pb-1.5 text-ink-muted">
          {aviso.online
            ? "Não deu para ativar agora. Tente de novo."
            : "Precisa de internet para ativar."}
        </span>
      )}
    </div>
  );
}
