"use client";

import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import {
  BookPlus,
  ClipboardCheck,
  ClipboardPlus,
  PackageOpen,
  Plus,
  ScanLine,
  ShoppingBasket,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { pedirAcao, type AcaoPedida } from "@/lib/acaoPedida";
import { MENSAGEM_FALHA } from "@/lib/domain/notaFiscal";
import { useConexao } from "@/lib/hooks/useDispositivo";
import { cn } from "@/lib/utils/cn";
import { usePapel } from "@/providers/AuthProvider";

interface Acao {
  rotulo: string;
  linha: string;
  icone: LucideIcon;
  destino: Route;
  /** O painel que a tela abre ao chegar (`@/lib/acaoPedida`). */
  pedido?: AcaoPedida;
  soDaDona?: boolean;
  precisaDeRede?: boolean;
}

/**
 * Ordem fixa: o gesto de arrastar depende da memória do polegar, e uma ordem
 * que mudasse por tela a desfaria (`DECISOES.md#d241`). `novo` e `nova` são o
 * `ID_PEDIDO_NOVO` e o `ID_FICHA_NOVA` escritos à mão: importá-los traria os
 * dois editores para o pacote de toda tela.
 */
const ACOES: Acao[] = [
  {
    rotulo: "Novo pedido",
    linha: "Encomenda de uma cliente",
    icone: ClipboardPlus,
    destino: "/pedidos/novo" as Route,
  },
  {
    rotulo: "Lançar no caixa",
    linha: "Entrada ou saída de dinheiro",
    icone: Wallet,
    destino: "/financeiro",
    pedido: "lancar",
    soDaDona: true,
  },
  {
    rotulo: "Novo produto",
    linha: "Receita ou kit, com o preço",
    icone: BookPlus,
    destino: "/fichas/nova" as Route,
  },
  {
    rotulo: "Novo material",
    linha: "Ingrediente, embalagem, etiqueta",
    icone: ShoppingBasket,
    destino: "/insumos",
    pedido: "novo-material",
  },
  {
    rotulo: "Ler uma nota",
    linha: "A compra entra nos materiais e no caixa",
    icone: ScanLine,
    destino: "/insumos/nota",
    soDaDona: true,
    precisaDeRede: true,
  },
  {
    rotulo: "Contar a despensa",
    linha: "Quanto tem de cada material",
    icone: ClipboardCheck,
    destino: "/insumos/contagem",
  },
  {
    rotulo: "Contar o que está pronto",
    linha: "O que já saiu do forno",
    icone: PackageOpen,
    destino: "/fichas/contagem",
  },
];

/** Menos que isso entre apertar e soltar é toque, e não arraste. */
const LIMIAR_ARRASTE = 10;

/** A altura da navegação inferior: a grade e o véu param em cima dela. */
const ACIMA_DA_BARRA =
  "bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom,0px))]";

/**
 * O "+" da navegação inferior e a grade de tudo o que se registra no app
 * (`DECISOES.md#d240`, `#d241`). Apertar abre na hora; arrastar até um item e
 * soltar executa; soltar sem arrastar, ou no vazio, deixa a grade aberta para
 * tocar com calma. É uma revelação (`aria-expanded`), e não um diálogo: a
 * barra continua à vista, e o "+" vira o "×" que fecha.
 */
export function GradeAdicionar() {
  const router = useRouter();
  const caminho = usePathname();
  const dona = usePapel() === "DONA";
  const online = useConexao();
  const id = useId();

  const [aberta, setAberta] = useState(false);
  // O item sob o dedo durante o arraste, pelo índice em `acoes`.
  const [sob, setSob] = useState<number | null>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const grade = useRef<HTMLDivElement>(null);
  const veu = useRef<HTMLDivElement>(null);
  const gesto = useRef<{
    x: number;
    y: number;
    arrastou: boolean;
    fechar: boolean;
  } | null>(null);
  // O `click` que o navegador dispara depois do ponteiro já foi tratado.
  const ultimoPonteiro = useRef(0);
  const focarAoAbrir = useRef(false);

  const acoes = ACOES.filter((acao) => dona || !acao.soDaDona);
  const desabilitada = (acao: Acao) => !!acao.precisaDeRede && !online;

  function fechar() {
    setAberta(false);
    setSob(null);
  }

  function executar(acao: Acao) {
    if (desabilitada(acao)) return;
    fechar();
    // Primeiro o pedido: com a tela já aberta, ela abre o painel na hora.
    if (acao.pedido) pedirAcao(acao.pedido);
    if (caminho !== acao.destino) router.push(acao.destino);
  }

  // Aberta: `Escape` fecha, tocar nos outros itens da barra (que o véu não
  // cobre) fecha, e a página não rola por baixo do véu.
  useEffect(() => {
    if (!aberta) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      fechar();
      botao.current?.focus();
    };
    const aoTocarFora = (evento: Event) => {
      const alvo = evento.target as Node;
      if (
        grade.current?.contains(alvo) ||
        botao.current?.contains(alvo) ||
        veu.current === alvo
      )
        return;
      fechar();
    };
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("pointerdown", aoTocarFora);
    if (focarAoAbrir.current) {
      focarAoAbrir.current = false;
      grade.current?.querySelector<HTMLElement>("button")?.focus();
    }
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("pointerdown", aoTocarFora);
    };
  }, [aberta]);

  function aoApertar(evento: PointerEvent<HTMLButtonElement>) {
    if (evento.button !== 0) return;
    if (aberta) {
      gesto.current = { x: 0, y: 0, arrastou: false, fechar: true };
      return;
    }
    // Capturado, o ponteiro continua falando com o "+" enquanto o dedo passa
    // pela grade; quem diz o item é `elementFromPoint`.
    evento.currentTarget.setPointerCapture(evento.pointerId);
    gesto.current = {
      x: evento.clientX,
      y: evento.clientY,
      arrastou: false,
      fechar: false,
    };
    setAberta(true);
  }

  function aoMover(evento: PointerEvent<HTMLButtonElement>) {
    const atual = gesto.current;
    if (!atual || atual.fechar) return;
    if (
      !atual.arrastou &&
      Math.hypot(evento.clientX - atual.x, evento.clientY - atual.y) <
        LIMIAR_ARRASTE
    )
      return;
    atual.arrastou = true;

    const alvo = document
      .elementFromPoint(evento.clientX, evento.clientY)
      ?.closest<HTMLElement>("[data-acao]");
    const indice =
      alvo && alvo.getAttribute("aria-disabled") !== "true"
        ? Number(alvo.dataset.acao)
        : null;
    if (indice === sob) return;
    if (indice !== null) navigator.vibrate?.(8);
    setSob(indice);
  }

  function aoSoltar() {
    const atual = gesto.current;
    gesto.current = null;
    if (!atual) return;
    ultimoPonteiro.current = performance.now();
    if (atual.fechar) return fechar();
    const acao = sob === null ? undefined : acoes[sob];
    setSob(null);
    if (atual.arrastou && acao) executar(acao);
  }

  function aoCancelar() {
    gesto.current = null;
    setSob(null);
  }

  // Teclado e leitor de tela chegam só pelo `click`; o dedo, pelo ponteiro.
  function aoClicar() {
    if (performance.now() - ultimoPonteiro.current < 500) return;
    if (aberta) return fechar();
    focarAoAbrir.current = true;
    setAberta(true);
  }

  return (
    <>
      <button
        ref={botao}
        type="button"
        aria-label={aberta ? "Fechar" : "Adicionar"}
        aria-expanded={aberta}
        aria-controls={id}
        onPointerDown={aoApertar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoCancelar}
        onClick={aoClicar}
        onContextMenu={(evento) => evento.preventDefault()}
        className="flex size-12 touch-none select-none items-center justify-center rounded-full bg-accent-500 text-on-accent transition-colors duration-150 ease-quart [-webkit-touch-callout:none] hover:bg-accent-600 active:bg-accent-600"
      >
        <Plus
          aria-hidden
          className={cn(
            "size-6 transition-transform duration-220 ease-quart motion-reduce:transition-none",
            aberta && "rotate-45",
          )}
          strokeWidth={2.25}
        />
      </button>

      {/* O véu cobre a tela e não a barra: o "×" fica onde o dedo está. Fecha
          no `click`, e não no `pointerdown`: fechado ali, o véu deixaria de
          segurar o toque e o `click` cairia na linha da lista por baixo. */}
      <div
        ref={veu}
        aria-hidden
        onClick={fechar}
        className={cn(
          "fixed inset-x-0 top-0 bg-brand-800/35 transition-opacity duration-220 ease-quart",
          ACIMA_DA_BARRA,
          aberta ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <div
        ref={grade}
        id={id}
        inert={!aberta}
        className={cn(
          "fixed inset-x-0 px-4 pb-2",
          ACIMA_DA_BARRA,
          "transition-[opacity,translate] duration-220 ease-quart motion-reduce:transition-opacity",
          aberta
            ? "opacity-100"
            : "pointer-events-none translate-y-3 opacity-0 motion-reduce:translate-y-0",
        )}
      >
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line shadow-overlay">
          {acoes.map((acao, indice) => {
            const Icone = acao.icone;
            const semRede = desabilitada(acao);
            return (
              <li
                key={acao.rotulo}
                className={cn("bg-surface", indice === 0 && "col-span-2")}
              >
                <button
                  type="button"
                  data-acao={indice}
                  aria-disabled={semRede || undefined}
                  onClick={() => executar(acao)}
                  className={cn(
                    "flex min-h-18 w-full flex-col items-start gap-1.5 px-3 py-3 text-left transition-colors duration-150 ease-quart",
                    semRede
                      ? "cursor-not-allowed opacity-45"
                      : sob === indice
                        ? "bg-brand-100"
                        : "hover:bg-sunken active:bg-brand-100",
                  )}
                >
                  <Icone
                    aria-hidden
                    className={cn(
                      "size-5 shrink-0",
                      sob === indice ? "text-brand-ink" : "text-ink-muted",
                    )}
                    strokeWidth={1.75}
                  />
                  <span className="text-body font-medium leading-tight text-ink">
                    {acao.rotulo}
                  </span>
                  <span className="text-label text-ink-muted">
                    {semRede ? MENSAGEM_FALHA["sem-rede"] : acao.linha}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
