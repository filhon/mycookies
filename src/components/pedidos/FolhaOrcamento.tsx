import type { ReactNode } from "react";
import { Logotipo, SLOGAN } from "@/components/marca/Marca";
import { rotuloDataCompleta, rotuloDiaPorExtenso } from "@/lib/domain/datas";
import { formatarValor } from "@/lib/domain/money";
import {
  frasesDoCombinado,
  temAlpha,
  type Orcamento,
} from "@/lib/domain/orcamento";
import { quantidadeEmTexto } from "@/lib/domain/pedido";
import type { Centavos } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * A folha A4 do orçamento. Só apresentação: nenhum hook, nenhuma conta.
 *
 * Restrained no papel, Committed num bloco só: o total é o único trecho vinho
 * cheio, como o cartão fidelidade é vinho cheio na mão. Nenhum outro fundo,
 * nenhuma borda lateral, nenhum cartão dentro de cartão. As medidas são em
 * ponto e milímetro porque a folha é papel, na tela e na impressora, e a
 * classe `.folha` fixa os tokens claros (spec 017). **Nenhuma classe `dark:`
 * aqui dentro**: passaria por cima deles.
 */
export function FolhaOrcamento({ orcamento }: { orcamento: Orcamento }) {
  const { negocio, entrega } = orcamento;
  const entregaEmCasa = entrega.tipo === "ENTREGA";
  // A coluna da miniatura só existe quando alguma linha tem foto: sem
  // nenhuma, o texto começa na margem.
  const colunas = orcamento.temFoto ? COLUNAS_COM_FOTO : COLUNAS;

  return (
    <article className="folha mx-auto flex flex-col text-[10.5pt] leading-[1.45] shadow-raised">
      <header className="flex items-start justify-between gap-6 border-b-2 border-accent-500 pb-4">
        <Logotipo orientacao="horizontal" tamanho="lg" />
        <div className="text-right">
          <Rotulo>Orçamento</Rotulo>
          <p className="num text-[13pt] font-semibold leading-tight">
            {orcamento.codigo}
          </p>
          <p className="mt-[2pt] text-[8.5pt] font-medium text-ink-muted">
            Emitido em {rotuloDataCompleta(orcamento.emitidoEmISO)}
          </p>
        </div>
      </header>

      <section className="mt-8 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <Rotulo>Para</Rotulo>
          <p className="font-display text-[17pt] font-semibold leading-tight">
            {orcamento.empresa}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {orcamento.validoAteISO && (
            <>
              <Rotulo>Válido até</Rotulo>
              <p className="font-semibold">
                {rotuloDataCompleta(orcamento.validoAteISO)}
              </p>
            </>
          )}
          <Rotulo className={cn(orcamento.validoAteISO && "mt-[8pt]")}>
            {entregaEmCasa ? "Entrega prevista" : "Retirada prevista"}
          </Rotulo>
          <p className="font-semibold">
            {capitalizar(rotuloDiaPorExtenso(entrega.dataISO))}
          </p>
          {entregaEmCasa && entrega.endereco && (
            <p className="text-ink-muted">{entrega.endereco}</p>
          )}
        </div>
      </section>

      {/* Os respiros daqui para baixo são de 20 pt, e não 24: três linhas com
          foto precisam caber numa página com o rodapé no pé, e 24 pt
          empurravam o rodapé sozinho para uma segunda folha. */}
      <section className="mt-[20pt]">
        <Rotulo>O que está incluído</Rotulo>
        {/* Lista com divisórias, e não grade de cartões. Cada linha é a sua
            própria grade para poder dizer `break-inside-avoid` sozinha. */}
        <div className="mt-2 divide-y divide-line">
          <div
            className={cn(
              colunas,
              "pb-[4pt] text-[7.5pt] font-medium uppercase tracking-widest text-ink-muted",
            )}
          >
            {orcamento.temFoto && <span />}
            <span>Produto</span>
            <span className="text-right">Quantidade</span>
            <span className="text-right">Unitário</span>
            <span className="text-right">Total</span>
          </div>
          {orcamento.linhas.map((linha, indice) => (
            <div
              key={indice}
              className={cn(colunas, "break-inside-avoid py-2")}
            >
              {/* Sem foto, o quadrado fica vazio em `--surface-sunken`, sem
                  ícone: cinco cookies enfileirados seriam um padrão. Recorte
                  transparente sai solto sobre o papel, como no cardápio. */}
              {orcamento.temFoto && (
                <div
                  className={cn(
                    "size-[20mm] overflow-hidden rounded-sm",
                    !(linha.fotoUrl && temAlpha(linha.fotoUrl)) && "bg-sunken",
                  )}
                >
                  {linha.fotoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={linha.fotoUrl}
                      alt=""
                      className={cn(
                        "size-full",
                        temAlpha(linha.fotoUrl)
                          ? "object-contain"
                          : "object-cover",
                      )}
                    />
                  )}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11.5pt] font-semibold leading-snug">
                  {linha.nome}
                </p>
                {linha.descricao && (
                  <p className="mt-[2pt] line-clamp-2 text-[9.5pt] leading-snug text-ink-muted">
                    {linha.descricao}
                  </p>
                )}
              </div>
              <p className="num text-right font-semibold">
                {quantidadeEmTexto(linha.quantidade)} {linha.unidade}
              </p>
              <p className="text-right">
                <Valor centavos={linha.precoUnitario} />
              </p>
              <p className="text-right">
                <Valor centavos={linha.subtotal} />
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-[16pt] ml-auto w-[80mm] break-inside-avoid">
        <LinhaDeTotal rotulo="Subtotal" centavos={orcamento.subtotal} />
        {orcamento.desconto > 0 && (
          <LinhaDeTotal
            rotulo="Desconto"
            centavos={orcamento.desconto}
            negativo
          />
        )}
        {orcamento.taxaEntrega > 0 && (
          <LinhaDeTotal rotulo="Entrega" centavos={orcamento.taxaEntrega} />
        )}
        {/* O único vinho cheio da folha, e o único trecho que precisa imprimir
            o fundo mesmo com "gráficos de fundo" desmarcado. */}
        <div className="mt-[8pt] flex items-center justify-between gap-4 rounded-md bg-brand-700 px-4 py-4 text-on-brand [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
          <span className="text-[8.5pt] font-medium uppercase tracking-[0.12em] text-on-brand-muted">
            Total
          </span>
          <Valor
            centavos={orcamento.total}
            className="font-display text-[22pt] leading-none"
            classeDoSimbolo="text-on-brand-muted"
          />
        </div>
      </section>

      <section className="mt-[20pt] break-inside-avoid">
        <Rotulo>Combinado</Rotulo>
        <div className="mt-[4pt] max-w-[68ch]">
          {frasesDoCombinado(orcamento).map((frase) => (
            <p key={frase}>{frase}</p>
          ))}
          <p className="mt-[10pt]">
            Para aprovar, é só responder pelo WhatsApp ou assinar abaixo e
            devolver esta folha.
          </p>
        </div>
      </section>

      {/* Coladas ao fim do conteúdo, e não ao pé da página: uma folha de três
          itens não deve ter um vão de 15 cm antes da assinatura. */}
      <section className="mt-[20pt] flex gap-8 break-inside-avoid">
        <div className="w-[70mm]">
          {/* A assinatura apoiada na linha. Sem imagem, o nome sobre a linha
              ainda é uma assinatura. */}
          <div className="flex h-[16mm] items-end">
            {negocio.assinaturaDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={negocio.assinaturaDataUrl}
                alt=""
                className="max-h-[16mm] max-w-[60mm] object-contain object-bottom-left"
              />
            )}
          </div>
          <div className="border-t-[0.5pt] border-line-strong pt-[4pt]">
            <p className="font-semibold">{negocio.proprietaria}</p>
            <p className="text-ink-muted">{negocio.nome}</p>
          </div>
        </div>
        <div className="w-[70mm]">
          <div className="h-[16mm]" />
          <div className="border-t-[0.5pt] border-line-strong pt-[4pt]">
            <p className="font-semibold">Aprovado por</p>
            <p className="text-ink-subtle">Nome, cargo e data</p>
          </div>
        </div>
      </section>

      <footer className="mt-auto flex items-end justify-between gap-6 pt-4 text-[7.5pt] font-medium text-ink-muted">
        <p>
          {[
            negocio.nome,
            negocio.telefone,
            negocio.instagram && `@${negocio.instagram}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="shrink-0">{SLOGAN}</p>
      </footer>
    </article>
  );
}

/** As colunas da lista: flexível · 20 mm · 26 mm · 30 mm, e 20 mm de foto na frente. */
const COLUNAS = "grid grid-cols-[1fr_20mm_26mm_30mm] items-start gap-x-[8pt]";
const COLUNAS_COM_FOTO =
  "grid grid-cols-[20mm_1fr_20mm_26mm_30mm] items-start gap-x-[8pt]";

function Rotulo({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[8.5pt] font-medium uppercase tracking-[0.12em] text-ink-muted",
        className,
      )}
    >
      {children}
    </p>
  );
}

/**
 * O `Dinheiro` da folha: o mesmo desenho, com o tamanho herdado em `em` para
 * seguir a escala em pontos da folha, e não a escala em `rem` da tela.
 */
function Valor({
  centavos,
  negativo = false,
  className,
  classeDoSimbolo = "text-ink-muted",
}: {
  centavos: Centavos;
  negativo?: boolean;
  className?: string;
  classeDoSimbolo?: string;
}) {
  return (
    <span
      className={cn(
        "num inline-flex items-baseline gap-[0.3em] whitespace-nowrap font-semibold",
        className,
      )}
    >
      <span className={cn("text-[0.72em] font-medium", classeDoSimbolo)}>
        {negativo && "−"}R$
      </span>
      {formatarValor(centavos)}
    </span>
  );
}

function LinhaDeTotal({
  rotulo,
  centavos,
  negativo,
}: {
  rotulo: string;
  centavos: Centavos;
  negativo?: boolean;
}) {
  return (
    <p className="flex items-baseline justify-between gap-4 py-1">
      <span className="text-ink-muted">{rotulo}</span>
      <Valor centavos={centavos} negativo={negativo} />
    </p>
  );
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
