"use client";

import { ChevronDown, TrendingDown, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  FaixaDeComposicao,
  Parcela,
} from "@/components/fichas/FaixaDeComposicao";
import { Campo } from "@/components/ui/Campo";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Pilulas } from "@/components/ui/Pilulas";
import {
  contaDaPorta,
  entradaPadrao,
  RECEITAS_DA_PORTA,
  trocarReceita,
  type ContaDaPorta,
  type EntradaDaPorta,
} from "@/lib/domain/calculadora";
import { precificacaoSugerida } from "@/lib/domain/configuracaoSugerida";
import { formatarMoeda } from "@/lib/domain/money";
import type { Centavos } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { guardarRascunho } from "@/lib/utils/rascunhoDaPorta";

/**
 * A calculadora pública (spec 040, `DECISOES.md#d185` a `#d188`): as receitas
 * de cookie da biblioteca, com o que muda de cozinha para cozinha editável, e
 * a conta refeita a cada tecla pelas funções do app. Nada aqui importa
 * `@/lib/firebase`: a página é pública e o domínio é puro.
 *
 * O `children` é o que vem depois do resultado: o convite, em `/conheca`.
 */
export function CalculadoraDaPorta({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const [entrada, setEntrada] = useState(() =>
    entradaPadrao("cookie-classico"),
  );
  const conta = contaDaPorta(entrada);

  // O rascunho que o botão da biblioteca leva (`#d189`). Abrir a página não
  // grava: só a entrada que ela mexeu é diferente da do primeiro render.
  const primeira = useRef(entrada);
  useEffect(() => {
    if (entrada !== primeira.current) guardarRascunho(entrada);
  }, [entrada]);

  const mudar = (parcial: Partial<EntradaDaPorta>) =>
    setEntrada((atual) => ({ ...atual, ...parcial }));

  return (
    <div
      className={cn(
        "grid gap-10 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start lg:gap-16",
        className,
      )}
    >
      <Entradas
        entrada={entrada}
        conta={conta}
        mudar={mudar}
        trocar={setEntrada}
      />

      <div className="flex flex-col gap-6 lg:sticky lg:top-8">
        <Resultado entrada={entrada} conta={conta} />
        {children}
      </div>
    </div>
  );
}

/** Só dígitos, inteiro; vazio é zero, e zero a tela mostra vazio. */
function inteiro(texto: string): number {
  const digitos = texto.replace(/\D/g, "");
  return digitos ? Number(digitos) : 0;
}

function Entradas({
  entrada,
  conta,
  mudar,
  trocar,
}: {
  entrada: EntradaDaPorta;
  conta: ContaDaPorta;
  mudar: (parcial: Partial<EntradaDaPorta>) => void;
  trocar: (entrada: EntradaDaPorta) => void;
}) {
  const trocados = conta.materiais.filter(
    (m) => entrada.precos[m.id] !== undefined && m.preco !== m.padrao,
  ).length;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <p aria-hidden className="text-label font-medium text-ink">
          Qual cookie
        </p>
        <Pilulas
          rotulo="Qual cookie"
          opcoes={RECEITAS_DA_PORTA}
          valor={entrada.receita}
          aoMudar={(receita) => trocar(trocarReceita(entrada, receita))}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          rotulo="Quantos saem da receita"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          sufixo="un"
          value={entrada.rendimento ? String(entrada.rendimento) : ""}
          onChange={(e) => mudar({ rendimento: inteiro(e.target.value) })}
          erro={
            entrada.rendimento > 0
              ? undefined
              : "Diga quantos cookies saem para a conta aparecer."
          }
          className="num"
        />
        <Campo
          rotulo="Quanto tempo leva"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          sufixo="min"
          value={
            entrada.tempoProducaoMinutos
              ? String(entrada.tempoProducaoMinutos)
              : ""
          }
          onChange={(e) =>
            mudar({ tempoProducaoMinutos: inteiro(e.target.value) })
          }
          dica="Da massa ao forno desligado."
          className="num"
        />
        <CampoMoeda
          rotulo="Quanto vale a sua hora"
          valor={entrada.valorHoraTrabalho}
          aoMudar={(valorHoraTrabalho) => mudar({ valorHoraTrabalho })}
          dica={
            entrada.valorHoraTrabalho > 0
              ? "O que você quer tirar no mês, dividido pelas horas de cozinha."
              : "Sem a sua hora, você trabalha de graça."
          }
        />
      </div>

      <div className="flex flex-col gap-3">
        <details className="group rounded-lg border border-line bg-surface">
          <summary className="toque flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="block text-label font-medium text-ink">
                O preço do que você compra
              </span>
              <span className="block text-label text-ink-muted">
                {trocados > 0
                  ? `${trocados} com o seu preço, ${conta.materiais.length - trocados} com o preço médio`
                  : `${conta.materiais.length} materiais, com o preço médio de setembro de 2026`}
              </span>
            </span>
            <ChevronDown
              aria-hidden
              strokeWidth={1.75}
              className="size-5 shrink-0 text-ink-muted transition-transform duration-200 ease-quart group-open:rotate-180"
            />
          </summary>
          <ul className="divide-y divide-line border-t border-line px-4">
            {conta.materiais.map((m) => {
              const dela = entrada.precos[m.id];
              return (
                <li key={m.id} className="py-3">
                  <CampoMoeda
                    rotulo={`${m.nome} · ${m.embalagem}`}
                    valor={dela ?? m.padrao}
                    aoMudar={(preco) =>
                      mudar({ precos: { ...entrada.precos, [m.id]: preco } })
                    }
                    dica={
                      dela === 0
                        ? `Sem preço, a conta usa o médio: ${formatarMoeda(m.padrao)}.`
                        : undefined
                    }
                    className="sm:grid sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-center sm:gap-x-4"
                  />
                </li>
              );
            })}
          </ul>
        </details>
        <p className="text-label text-ink-muted">
          A receita é a da biblioteca. No app você troca tudo: o que entra,
          quanto e a embalagem.
        </p>
      </div>

      <div className="grid gap-5 border-t border-line pt-7 sm:grid-cols-2">
        <CampoMoeda
          rotulo="Quanto você cobra hoje, por cookie"
          valor={entrada.precoHoje ?? 0}
          aoMudar={(preco) => mudar({ precoHoje: preco > 0 ? preco : null })}
          dica={
            entrada.precoHoje === null
              ? "Ponha o seu preço e veja quanto sobra nele."
              : undefined
          }
        />
        {entrada.precoHoje !== null && (
          <Campo
            rotulo="Quantos você vende por mês"
            inputMode="numeric"
            autoComplete="off"
            maxLength={5}
            sufixo="un"
            value={entrada.vendasMes ? String(entrada.vendasMes) : ""}
            onChange={(e) => mudar({ vendasMes: inteiro(e.target.value) })}
            className="num"
          />
        )}
      </div>
    </div>
  );
}

/** O mês em reais redondos: "R$ 166", como a marca diz o número (`MARCA.md` § 1.1). */
const reaisRedondos = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function Valor({
  centavos,
  className,
}: {
  centavos: Centavos;
  className?: string;
}) {
  return (
    <span
      className={cn("num font-semibold whitespace-nowrap text-ink", className)}
    >
      {formatarMoeda(centavos)}
    </span>
  );
}

function Resultado({
  entrada,
  conta,
}: {
  entrada: EntradaDaPorta;
  conta: ContaDaPorta;
}) {
  const { derivados, segmentos, sugerido, hoje, aMaisNoMes } = conta;
  const { custo } = derivados;
  const nome =
    RECEITAS_DA_PORTA.find((r) => r.valor === entrada.receita)?.rotulo ?? "";
  const { margemDesejada, taxaCartaoConsiderada } = precificacaoSugerida();
  const temConta = sugerido !== null && derivados.precoArredondado !== null;

  const anuncio = temConta
    ? `Custo por cookie ${formatarMoeda(custo.custoUnitario)}. Preço sugerido ${formatarMoeda(derivados.precoArredondado ?? 0)}.`
    : "Falta dizer quantos cookies saem da receita.";

  return (
    <section
      aria-labelledby="porta-resultado"
      className="overflow-hidden rounded-lg border border-line bg-surface shadow-raised"
    >
      <Anuncio frase={anuncio} />

      <div className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-4">
        <h3
          id="porta-resultado"
          className="text-subheading font-semibold text-ink"
        >
          Sua conta · {nome}
        </h3>
        {entrada.rendimento > 0 && (
          <p className="num shrink-0 text-label text-ink-muted">
            rende {entrada.rendimento}
          </p>
        )}
      </div>

      {!temConta ? (
        <p className="flex items-start gap-2 px-5 py-6 text-body text-ink">
          <TriangleAlert
            aria-hidden
            strokeWidth={1.75}
            className="mt-0.5 size-5 shrink-0 text-attention"
          />
          Diga quantos cookies saem da receita e a conta aparece aqui.
        </p>
      ) : (
        <>
          <div className="px-5 py-4">
            <dl className="flex flex-col gap-2 text-body">
              {segmentos.map((s) => (
                <Parcela
                  key={s.rotulo}
                  rotulo={s.rotulo}
                  valor={Math.round(s.centavos / entrada.rendimento)}
                  destaque={s.destaque}
                />
              ))}
            </dl>
            <FaixaDeComposicao segmentos={segmentos} className="mt-4" />
            <div className="mt-4 flex items-baseline justify-between gap-4">
              <p className="text-label font-medium text-ink-muted">
                Custo por cookie
              </p>
              <Dinheiro centavos={custo.custoUnitario} tamanho="xl" />
            </div>
          </div>

          <div className="sobre-marca bg-brand-700 px-5 py-5 text-on-brand">
            <p className="text-label font-medium text-ink-muted">
              Preço sugerido · margem {margemDesejada}% + maquininha{" "}
              {taxaCartaoConsiderada.toLocaleString("pt-BR")}%
            </p>
            <div className="mt-1 flex items-center gap-3">
              <Dinheiro
                centavos={derivados.precoArredondado ?? 0}
                tamanho="xl"
              />
              {/* O ponto marca o número que decide, como no painel do editor. */}
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-full bg-accent-500"
              />
            </div>
            <p className="mt-3 max-w-[48ch] text-label text-ink-muted">
              Sobram <Valor centavos={sugerido.lucroUnitario} /> pra você, por
              cookie, depois da maquininha.
            </p>
          </div>

          {hoje && entrada.precoHoje !== null && (
            <div className="flex flex-col gap-3 px-5 py-4 text-body text-ink">
              <PrecoDeHoje
                precoHoje={entrada.precoHoje}
                precoSugerido={derivados.precoArredondado ?? 0}
                sobraHoje={hoje.lucroUnitario}
                sobraSugerida={sugerido.lucroUnitario}
              />
              {aMaisNoMes > 0 && (
                <p>
                  Vendendo{" "}
                  <span className="num font-semibold">{entrada.vendasMes}</span>{" "}
                  por mês, são{" "}
                  <span className="num font-semibold whitespace-nowrap">
                    {reaisRedondos.format(aMaisNoMes / 100)}
                  </span>{" "}
                  a mais pra você no preço sugerido.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/**
 * O preço de hoje ao lado da conta (`#d188`). Perder leva a cor, o ícone e a
 * palavra; nunca só a cor. Cobrir a conta não leva alarme nenhum.
 */
function PrecoDeHoje({
  precoHoje,
  precoSugerido,
  sobraHoje,
  sobraSugerida,
}: {
  precoHoje: Centavos;
  precoSugerido: Centavos;
  sobraHoje: Centavos;
  sobraSugerida: Centavos;
}) {
  if (sobraHoje < 0) {
    return (
      <p className="flex items-start gap-2">
        <TrendingDown
          aria-hidden
          strokeWidth={1.75}
          className="mt-1 size-4 shrink-0 text-negative"
        />
        <span>
          Cobrando <Valor centavos={precoHoje} />, você{" "}
          <strong className="font-semibold text-negative">perde</strong>{" "}
          <Valor centavos={-sobraHoje} className="text-negative" /> em cada
          cookie.
        </span>
      </p>
    );
  }

  if (precoHoje < precoSugerido) {
    return (
      <p>
        Cobrando <Valor centavos={precoHoje} />, sobram{" "}
        <Valor centavos={sobraHoje} /> por cookie. No preço sugerido sobrariam{" "}
        <Valor centavos={sobraSugerida} />.
      </p>
    );
  }

  return (
    <p>
      Cobrando <Valor centavos={precoHoje} />, sobram{" "}
      <Valor centavos={sobraHoje} /> por cookie. Seu preço já cobre a conta.
    </p>
  );
}

/**
 * Só o custo e o preço, e só depois que ela para de digitar: anunciar o bloco
 * inteiro a cada tecla seria ruído (spec 040, 3.3). Abrir a página não anuncia.
 */
function Anuncio({ frase }: { frase: string }) {
  const [texto, setTexto] = useState("");
  const ultima = useRef(frase);

  useEffect(() => {
    if (frase === ultima.current) return;
    const espera = setTimeout(() => {
      ultima.current = frase;
      setTexto(frase);
    }, 700);
    return () => clearTimeout(espera);
  }, [frase]);

  return (
    <p aria-live="polite" className="sr-only">
      {texto}
    </p>
  );
}
