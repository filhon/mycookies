"use client";

import { useEffect, useRef, useState } from "react";
import { classesBotao } from "@/components/ui/estilosBotao";
import { formatarMoeda, formatarValor } from "@/lib/domain/money";
import type { Centavos } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { CHAVE_DA_ABERTURA } from "./abertura";

/** Os degraus da `FaixaDeComposicao`; dentro de `sobre-marca`, `ink` é `on-brand`. */
const NEUTROS = ["bg-ink/90", "bg-ink/65", "bg-ink/45", "bg-ink/30"];

/**
 * Quanto cada passo fica na tela, em ms, os de `faixa-custo.js`: a pergunta,
 * as cinco parcelas, o custo, o preço e a sobra. Cinco parcelas porque o
 * `EXEMPLO` tem cinco; `tests/domain/exemplo.test.ts` prende.
 */
const TEMPOS = [1100, 1000, 800, 900, 700, 700, 1400, 1500, 4200];
const FIM = TEMPOS.length - 1;
const PRECO = FIM - 1;
const CUSTO = FIM - 2;
/** A abertura corre os passos a 60% e segura a sobra antes de sair, como a referência. */
const RITMO_DA_ABERTURA = 0.6;
const SOBRA_NA_ABERTURA = 1800;
const SAIDA = 400;

/** Parcela `i` à mostra no passo `p`: as do custo uma a uma, a maquininha e a sobra com o preço. */
const aMostra = (i: number, p: number, parcelas: number) =>
  i < parcelas ? p > i : p >= PRECO;

/**
 * A faixa larga da página de venda (`DECISOES.md#d382`): o custo do cookie do
 * `EXEMPLO` se montando parcela a parcela até o preço, e a sobra em rosa. Todo
 * número chega pronto da página; aqui só se conta e se desenha. O servidor
 * entrega o quadro final, que é também o do movimento reduzido: a faixa nunca
 * aparece vazia. O laço só anda com ela na tela e com a aba à vista.
 *
 * Com `abertura` (`#d383`) ela cobre a tela no carregamento, corre uma vez e
 * sai sozinha, com "Pular" e Esc. Quem decide se ela aparece é o
 * `SCRIPT_DA_ABERTURA`, antes da primeira pintura; o servidor a entrega no
 * primeiro passo e escondida pelo CSS de `data-abertura`.
 */
export function FaixaDoCusto({
  abertura = false,
  nome,
  rende,
  parcelas,
  custo,
  maquininha,
  sobra,
  preco,
  margem,
  taxa,
}: {
  abertura?: boolean;
  nome: string;
  rende: number;
  /** As parcelas de `composicaoDoLote`, por unidade. */
  parcelas: { rotulo: string; centavos: Centavos; destaque: boolean }[];
  custo: Centavos;
  maquininha: Centavos;
  sobra: Centavos;
  preco: Centavos;
  margem: number;
  taxa: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fechar = useRef(() => {});
  const [passo, setPasso] = useState(abertura ? 0 : FIM);
  const [valor, setValor] = useState(abertura ? 0 : preco);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    const el = ref.current;
    const raiz = document.documentElement;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (abertura) {
      try {
        if (sessionStorage.getItem(CHAVE_DA_ABERTURA)) return;
      } catch {
        return;
      }
      // Já vem do script; aqui é a chegada por navegação do app, em que ele
      // não roda, e a volta do Strict Mode, que a limpeza desfez.
      raiz.dataset.abertura = "";
    }

    const alvo = (p: number) =>
      p <= parcelas.length
        ? parcelas.slice(0, p).reduce((s, x) => s + x.centavos, 0)
        : p === CUSTO
          ? custo
          : preco;
    let atual = abertura ? 0 : FIM;
    let mostrado = abertura ? 0 : preco;
    let timer = 0;
    let quadro = 0;
    let naTela = false;
    let comecou = false;

    const ir = (p: number, deUmaVez = false) => {
      atual = p;
      setPasso(p);
      cancelAnimationFrame(quadro);
      const de = mostrado;
      const para = alvo(p);
      if (deUmaVez) {
        mostrado = para;
        setValor(para);
        return;
      }
      const t0 = performance.now();
      const contar = (agora: number) => {
        const t = Math.min(1, (agora - t0) / 600);
        mostrado = de + (para - de) * (1 - (1 - t) ** 3);
        setValor(Math.round(mostrado));
        if (t < 1) quadro = requestAnimationFrame(contar);
      };
      quadro = requestAnimationFrame(contar);
    };
    const tocar = () => {
      if (timer || !naTela || document.hidden) return;
      timer = window.setTimeout(() => {
        timer = 0;
        ir(atual === FIM ? 0 : atual + 1);
        tocar();
      }, TEMPOS[atual]);
    };
    const parar = () => {
      clearTimeout(timer);
      timer = 0;
    };

    if (abertura) {
      let fechando = false;
      fechar.current = () => {
        if (fechando) return;
        fechando = true;
        parar();
        try {
          sessionStorage.setItem(CHAVE_DA_ABERTURA, "1");
        } catch {}
        setSaindo(true);
        timer = window.setTimeout(() => delete raiz.dataset.abertura, SAIDA);
      };
      const seguir = () => {
        timer = window.setTimeout(
          () => {
            if (atual === FIM) return fechar.current();
            ir(atual + 1);
            seguir();
          },
          atual === FIM
            ? SOBRA_NA_ABERTURA
            : TEMPOS[atual]! * RITMO_DA_ABERTURA,
        );
      };
      const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar.current();
      addEventListener("keydown", esc);
      seguir();
      return () => {
        removeEventListener("keydown", esc);
        parar();
        cancelAnimationFrame(quadro);
        delete raiz.dataset.abertura;
      };
    }

    const observador = new IntersectionObserver(
      ([e]) => {
        // A primeira resposta chega logo, com a faixa ainda abaixo da dobra:
        // é ali que ela se esvazia, antes de alguém ver.
        if (!comecou) {
          comecou = true;
          ir(0, true);
        }
        naTela = !!e?.isIntersecting;
        if (naTela) tocar();
        else parar();
      },
      { threshold: 0.35 },
    );
    const aba = () => (document.hidden ? parar() : tocar());
    observador.observe(el);
    document.addEventListener("visibilitychange", aba);
    return () => {
      observador.disconnect();
      document.removeEventListener("visibilitychange", aba);
      parar();
      cancelAnimationFrame(quadro);
    };
  }, [abertura, parcelas, custo, preco]);

  let neutro = 0;
  const segmentos = [
    ...parcelas.map((p) => ({
      ...p,
      cor: p.destaque ? "bg-brand-400" : NEUTROS[neutro++ % NEUTROS.length],
    })),
    { rotulo: `Maquininha ${taxa}%`, centavos: maquininha, cor: "bg-ink/15" },
    { rotulo: "Sobra pra você", centavos: sobra, cor: "bg-accent-500" },
  ];
  const fatia = (centavos: Centavos) => `${(centavos / preco) * 100}%`;
  const parcela = parcelas[passo - 1];
  const [titulo, linha] =
    passo === 0
      ? ["Quanto custa um cookie?", "O que entra em cada unidade"]
      : parcela
        ? [parcela.rotulo, `+ ${formatarMoeda(parcela.centavos)}`]
        : passo === CUSTO
          ? [
              "Custo de verdade",
              `${formatarMoeda(custo)} por unidade, com tudo dentro`,
            ]
          : passo === PRECO
            ? ["Preço sugerido", `Margem ${margem}% + maquininha ${taxa}%`]
            : [
                `Sobram ${formatarMoeda(sobra)} pra você`,
                "Por cookie, depois da maquininha",
              ];

  return (
    <div
      ref={ref}
      className={cn(
        "sobre-marca bg-brand-800 text-ink",
        abertura &&
          "abertura fixed inset-0 z-50 grid items-center overflow-y-auto transition-opacity duration-400 ease-quart",
        saindo && "opacity-0",
      )}
    >
      {/* Fora do `role="img"`, que tira da leitura o que tem dentro. */}
      {abertura && (
        <button
          type="button"
          onClick={() => fechar.current()}
          className={classesBotao({
            tamanho: "sm",
            className:
              "absolute top-[max(1rem,env(safe-area-inset-top))] right-4",
          })}
        >
          Pular
        </button>
      )}
      <div
        role="img"
        aria-label={`O custo de um ${nome.toLocaleLowerCase("pt-BR")} soma ${formatarMoeda(custo)}. Vendido a ${formatarMoeda(preco)}, sobram ${formatarMoeda(sobra)} por unidade.`}
        className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 lg:gap-10 lg:px-10 lg:py-24"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="min-w-0">
            <p className="text-label font-semibold text-ink-muted">
              {nome} · rende {rende} unidades
            </p>
            {/* Abaixo do `lg` fica guardada a altura do título em duas linhas
                mais a linha de baixo: o título que troca de tamanho não empurra
                a página, e o vão sobra embaixo, e não entre os dois. */}
            <div className="mt-2 min-h-[6.1rem] lg:min-h-0">
              <p
                className={cn(
                  "font-display text-[1.75rem] leading-[1.15] font-bold tracking-[-0.02em] text-balance transition-colors duration-400 ease-quart lg:text-[2.375rem]",
                  passo === FIM && "text-accent-500",
                )}
              >
                {titulo}
              </p>
              <p className="mt-2 text-body text-ink-muted lg:text-subheading">
                {linha}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-1 sm:items-end">
            <p className="text-label font-medium text-ink-muted">
              {passo >= PRECO ? "Preço por unidade" : "Custo por unidade"}
            </p>
            <p className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-heading font-semibold text-ink-muted">
                R$
              </span>
              {/* Largura mínima: o número que sobe não mexe no que está do lado. */}
              <span className="num inline-block min-w-[3.3ch] text-right font-display text-[2.5rem] leading-none lg:text-[3.5rem]">
                {formatarValor(valor)}
              </span>
            </p>
          </div>
        </div>

        <div>
          {/* O corte de 3px a 8° da `FaixaDeComposicao`. A parcela entra por
              `scale-x`, e não por largura: o lugar dela já está reservado. */}
          <div className="h-8 overflow-hidden rounded-sm lg:h-12">
            <div className="-mx-0.5 flex h-full -skew-x-8 gap-0.75">
              {segmentos.map((s, i) => (
                <span
                  key={s.rotulo}
                  style={{ flex: s.centavos }}
                  className={cn(
                    "origin-left transition-transform duration-700 ease-quart",
                    s.cor,
                    !aMostra(i, passo, parcelas.length) && "scale-x-0",
                  )}
                />
              ))}
            </div>
          </div>
          <div className="num mt-2.5 flex text-label font-semibold">
            <p
              style={{ width: fatia(custo) }}
              className={cn(
                "border-t-2 border-ink pt-2 transition-opacity duration-500",
                passo < CUSTO && "opacity-0",
              )}
            >
              Custo {formatarMoeda(custo)}
            </p>
            <p
              style={{ width: fatia(sobra), marginLeft: fatia(maquininha) }}
              className={cn(
                "border-t-2 border-accent-500 pt-2 text-right text-accent-500 transition-opacity delay-300 duration-500",
                passo < PRECO && "opacity-0",
              )}
            >
              Sobra {formatarMoeda(sobra)}
            </p>
          </div>
        </div>

        <ul className="grid grid-cols-[repeat(auto-fill,minmax(11.25rem,1fr))] gap-x-6 gap-y-2.5 text-label">
          {segmentos.map((s, i) => (
            <li
              key={s.rotulo}
              className={cn(
                "flex items-center gap-2.5 transition-opacity duration-400",
                !aMostra(i, passo, parcelas.length) && "opacity-30",
              )}
            >
              <span className={cn("size-2.5 shrink-0 rounded-xs", s.cor)} />
              <span className="min-w-0 flex-1">{s.rotulo}</span>
              <span className="num font-semibold">
                {formatarMoeda(s.centavos)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
