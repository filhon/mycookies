import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { encode } from "uqr";
import { rotuloDataCompleta, rotuloDiaPorExtenso } from "@/lib/domain/datas";
import { formatarMoeda, formatarValor } from "@/lib/domain/money";
import {
  frasesDoCombinado,
  rotuloDaFolha,
  temAlpha,
  type Orcamento,
} from "@/lib/domain/orcamento";
import { quantidadeEmTexto } from "@/lib/domain/pedido";
import type { Centavos } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * A folha A4 do orçamento. Só apresentação: nenhum hook, nenhuma conta.
 *
 * **A folha é dela, e não nossa** (`DECISOES.md#d127`): o cabeçalho é o nome
 * do negócio em display, sem logotipo — nem o dela, que não existe, nem o do
 * Rende. O total é o único bloco cheio, em `ink`; o Rende aparece como o
 * manual manda, uma linha apagada no rodapé, e a frase dela vem da
 * configuração, entre o contato e essa linha. Nenhum outro fundo, nenhuma
 * borda lateral, nenhum cartão dentro de cartão. As medidas são em ponto e
 * milímetro porque a folha é papel, na tela e na impressora, e a classe
 * `.folha` fixa os tokens claros (spec 017). **Nenhuma classe `dark:` aqui
 * dentro**: passaria por cima deles.
 */
export function FolhaOrcamento({ orcamento }: { orcamento: Orcamento }) {
  const { negocio, entrega } = orcamento;
  const entregaEmCasa = entrega.tipo === "ENTREGA";
  // O título e o fecho seguem o status; o resto da folha não (`#d354`).
  const proposta = orcamento.status === "ORCAMENTO";
  // A coluna da miniatura só existe quando alguma linha tem foto: sem
  // nenhuma, o texto começa na margem.
  const colunas = orcamento.temFoto ? COLUNAS_COM_FOTO : COLUNAS;

  return (
    <article className="folha mx-auto flex flex-col text-[10.5pt] leading-[1.45] shadow-raised">
      <header className="flex items-start justify-between gap-6 border-b-2 border-line-strong pb-4">
        <p className="font-display text-[20pt] font-bold leading-none">
          {negocio.nome}
        </p>
        <div className="text-right">
          <Rotulo>{rotuloDaFolha(orcamento.status)}</Rotulo>
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
            {entrega.hora && <span className="num"> · às {entrega.hora}</span>}
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
              {/* Sem foto, a célula fica vazia e sem fundo: o quadrado bege da
                  017 lia como imagem quebrada no papel (spec 147). O combo sem
                  foto própria mostra até duas receitas de dentro, a segunda à
                  direita e atrás. Recorte transparente sai solto sobre o
                  papel, como no cardápio. */}
              {orcamento.temFoto && (
                <div className="relative size-[20mm]">
                  {linha.fotoUrl ? (
                    <Foto url={linha.fotoUrl} className="size-full" />
                  ) : linha.fotosDasEscolhas.length === 1 ? (
                    <Foto
                      url={linha.fotosDasEscolhas[0]!}
                      className="size-full"
                    />
                  ) : (
                    linha.fotosDasEscolhas.map((url, i) => (
                      <Foto
                        key={i}
                        url={url}
                        className={cn(
                          // 12,5 mm cada, 40% sobrepostas: 12,5 × 1,6 = 20 mm.
                          "absolute top-1/2 size-[12.5mm] -translate-y-1/2",
                          i === 0 ? "left-0 z-10" : "right-0",
                        )}
                      />
                    ))
                  )}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11.5pt] font-semibold leading-snug">
                  {linha.nome}
                </p>
                {linha.composicao && (
                  <p className="mt-[2pt] text-[9.5pt] leading-snug text-ink-muted">
                    {linha.composicao}
                  </p>
                )}
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
        {/* Sem desconto e sem entrega, o subtotal repete o total. */}
        {(orcamento.desconto > 0 || orcamento.taxaEntrega > 0) && (
          <LinhaDeTotal rotulo="Subtotal" centavos={orcamento.subtotal} />
        )}
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
        {/* O único bloco cheio da folha, e o único trecho que precisa imprimir
            o fundo mesmo com "gráficos de fundo" desmarcado. É `ink`, e não
            `brand-700`: na `.folha` os dois são quase o mesmo tom, mas a tinta
            é dela e a marca é nossa (`#d127`). */}
        <div className="mt-[8pt] flex items-center justify-between gap-4 rounded-md bg-ink px-4 py-4 text-surface [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
          <span className="text-[8.5pt] font-medium uppercase tracking-[0.12em] text-surface/70">
            Total
          </span>
          <Valor
            centavos={orcamento.total}
            className="font-display text-[22pt] leading-none"
            classeDoSimbolo="text-surface/70"
          />
        </div>
        {/* O pedido com o que já entrou, e não um recibo (`#d354`). "Pago"
            leva o ícone e a palavra, nunca só a cor. */}
        {!proposta &&
          (orcamento.pago ? (
            <p className="mt-2 flex items-center justify-end gap-[4pt] font-semibold">
              <Check aria-hidden className="size-[1.1em]" strokeWidth={2} />
              Pago
            </p>
          ) : (
            orcamento.sinal !== undefined && (
              <div className="mt-[4pt]">
                <LinhaDeTotal rotulo="Sinal pago" centavos={orcamento.sinal} />
                <LinhaDeTotal rotulo="Falta pagar" centavos={orcamento.falta} />
              </div>
            )
          ))}
      </section>

      <section className="mt-[20pt] break-inside-avoid">
        <Rotulo>Combinado</Rotulo>
        <div className="mt-[4pt] max-w-[68ch]">
          {frasesDoCombinado(orcamento).map((frase, i) => (
            <p key={i}>{frase}</p>
          ))}
          {orcamento.pix && (
            <div className="mt-[8pt] flex items-center gap-[5mm]">
              <QrDoPix codigo={orcamento.pix} />
              <p>
                Pix de {formatarMoeda(orcamento.falta)} · aponte a câmera do app
                do banco
              </p>
            </div>
          )}
          {proposta && (
            <p className="mt-[10pt]">
              Para aprovar, é só responder pelo WhatsApp ou assinar abaixo e
              devolver esta folha.
            </p>
          )}
        </div>
      </section>

      <PeDaFolha negocio={negocio} aprovacao={proposta} />
    </article>
  );
}

/**
 * O QR do Pix em SVG, desenhado aqui (`#d355`): sem PNG, sem rede, nítido no
 * papel em qualquer tamanho. Um caminho só, uma casa por módulo escuro, na
 * tinta da folha. Sem a zona de silêncio no desenho: o papel em volta é ela,
 * e o `gap` ao lado a garante.
 */
function QrDoPix({ codigo }: { codigo: string }) {
  const { data, size } = encode(codigo, { ecc: "M", border: 0 });
  const caminho = data
    .flatMap((linha, y) =>
      linha.map((escuro, x) => (escuro ? `M${x} ${y}h1v1h-1z` : "")),
    )
    .join("");
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      aria-hidden
      className="size-[28mm] shrink-0 fill-ink"
    >
      <path d={caminho} />
    </svg>
  );
}

/** A miniatura: recorte transparente solto, foto comum recortada no quadrado. */
function Foto({ url, className }: { url: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className={cn(
        "rounded-sm",
        temAlpha(url) ? "object-contain" : "object-cover",
        className,
      )}
    />
  );
}

/**
 * As assinaturas e o rodapé, que a prévia de "A sua marca" também desenha,
 * com o formulário no lugar do gravado (spec 087, `#d289`). `flex-wrap` e
 * `max-w-full` só agem na coluna estreita da prévia: no A4 as duas linhas
 * cabem lado a lado. Fora do orçamento, a linha "Aprovado por" sai e fica a
 * assinatura dela (`#d354`).
 */
export function PeDaFolha({
  negocio,
  aprovacao = true,
}: {
  negocio: Orcamento["negocio"];
  aprovacao?: boolean;
}) {
  return (
    <>
      {/* Coladas ao fim do conteúdo, e não ao pé da página: uma folha de três
          itens não deve ter um vão de 15 cm antes da assinatura. */}
      <section className="mt-[20pt] flex flex-wrap gap-8 break-inside-avoid">
        <div className="w-[70mm] max-w-full">
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
        {aprovacao && (
          <div className="w-[70mm] max-w-full">
            <div className="h-[16mm]" />
            <div className="border-t-[0.5pt] border-line-strong pt-[4pt]">
              <p className="font-semibold">Aprovado por</p>
              <p className="text-ink-subtle">Nome, cargo e data</p>
            </div>
          </div>
        )}
      </section>

      {/* Sem frase, o contato e o "feito com" fecham a linha sem buraco. */}
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
        {negocio.frase && (
          <p className="max-w-[70mm] text-center">{negocio.frase}</p>
        )}
        {negocio.feitoCom && (
          <p className="shrink-0 text-ink-subtle">feito com Rende</p>
        )}
      </footer>
    </>
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
