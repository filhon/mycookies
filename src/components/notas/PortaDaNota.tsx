"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  Camera,
  Clock,
  FileText,
  FileUp,
  ImageUp,
  Lock,
  RefreshCw,
  ScanLine,
  X,
} from "lucide-react";
import { Simbolo } from "@/components/marca/Marca";
import { Botao } from "@/components/ui/Botao";
import { TituloAssinado } from "@/components/ui/EstadoVazio";
import { Selo } from "@/components/ui/Selo";
import { rotuloDiaNoAno } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import { LIMITE_FOTOS, type IdadeDosPrecos } from "@/lib/domain/notaFiscal";
import type { DataISO } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * A etapa "escolher" de `/insumos/nota`: o que a leitura faz, por que ler
 * agora, e um caminho por aparelho (`#d290`).
 *
 * No celular, dois controles: "Fotografar a nota" com `capture`, que abre a
 * câmera direto e é o caso de quase sempre, e "Escolher foto ou PDF" sem ele,
 * que continua oferecendo a galeria e os arquivos. Os três caminhos de antes
 * seguem lá, e o comum custa um toque. No computador, o bloco é a área de
 * soltar, e colar na página também lê: o PDF está no e-mail, na aba ao lado.
 *
 * Os arquivos vão crus para `aoReceber`: quem junta as fotos, separa o PDF e
 * recusa o tipo é a tela, num lugar só para os quatro caminhos.
 *
 * Foto não é lida na hora (`#d293`): ela entra na faixa, onde se vê se saiu
 * tremida, e a nota comprida ganha a continuação. "Ler a nota" lê todas.
 */
export function PortaDaNota({
  online,
  idade,
  temMateriais,
  hoje,
  aviso,
  fotos,
  notaDaFaixa,
  pdf,
  aoReceber,
  aoTirar,
  aoLer,
}: {
  online: boolean;
  idade: IdadeDosPrecos;
  /** Sem material nenhum, não há preço velho a dizer, e a linha some. */
  temMateriais: boolean;
  hoje: DataISO;
  aviso?: ReactNode;
  /** As partes da nota esperando a leitura, na ordem em que entraram. */
  fotos: FotoDaNota[];
  /** O que ficou de fora da faixa, dito embaixo dela. */
  notaDaFaixa: string | null;
  /**
   * O PDF que chegou pelo "Compartilhar" do Android e espera a rede, ou que
   * ficou de uma leitura que falhou (`#d294`). Ocupa o lugar da faixa.
   */
  pdf: { nome: string; aoLer: () => void; aoTirar: () => void } | null;
  aoReceber: (arquivos: File[]) => void;
  aoTirar: (indice: number) => void;
  aoLer: () => void;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const seletor = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const comPdf = pdf !== null && fotos.length === 0;
  const juntando = fotos.length > 0 || comPdf;
  const cabeMais = !comPdf && fotos.length < LIMITE_FOTOS;
  const lerAgora = comPdf ? pdf.aoLer : aoLer;
  const rotuloLer = comPdf ? "Ler esta nota" : "Ler a nota";

  // Colar só vale nesta etapa: a porta monta e desmonta com ela. Colar sem
  // arquivo (texto) não é tentativa de ler, e passa reto.
  useEffect(() => {
    function colar(evento: ClipboardEvent) {
      const arquivos = Array.from(evento.clipboardData?.files ?? []);
      if (arquivos.length === 0) return;
      evento.preventDefault();
      aoReceber(arquivos);
    }
    window.addEventListener("paste", colar);
    return () => window.removeEventListener("paste", colar);
  }, [aoReceber]);

  const escolher = (evento: ChangeEvent<HTMLInputElement>) => {
    const arquivos = Array.from(evento.target.files ?? []);
    evento.target.value = "";
    if (arquivos.length > 0) aoReceber(arquivos);
  };

  const comArquivo = (evento: DragEvent) =>
    evento.dataTransfer.types.includes("Files");

  return (
    <>
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={escolher}
      />
      <input
        ref={seletor}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={escolher}
      />

      <div
        onDragOver={(evento) => {
          if (!comArquivo(evento)) return;
          evento.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={(evento) => {
          if (!evento.currentTarget.contains(evento.relatedTarget as Node)) {
            setArrastando(false);
          }
        }}
        onDrop={(evento) => {
          if (!comArquivo(evento)) return;
          evento.preventDefault();
          setArrastando(false);
          aoReceber(Array.from(evento.dataTransfer.files));
        }}
        className={cn(
          "lg:rounded-lg lg:border-2 lg:p-8",
          "lg:transition-colors lg:duration-150 lg:ease-quart",
          // Juntando, o exemplo sai e a faixa fica com a largura.
          !juntando &&
            "xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] xl:gap-x-10",
          arrastando
            ? "lg:border-solid lg:border-brand-ink lg:bg-brand-100"
            : "lg:border-dashed lg:border-line-strong",
        )}
      >
        <div>
          <h2 className="font-display text-display font-semibold text-ink">
            <TituloAssinado titulo="A compra inteira numa foto." />
          </h2>
          <p className="mt-2 max-w-[46ch] text-body text-ink-muted">
            Cada linha vira material, com o preço e a data da compra. Você
            confere antes de salvar.
          </p>
        </div>

        {/* Com a foto tirada, ela já decidiu ler: o exemplo e o motivo saem, e
            a faixa sobe para perto do polegar. */}
        {!juntando && (
          <ExemploDaLinha className="mt-6 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:mt-0 xl:self-center" />
        )}

        <div>
          {temMateriais && !juntando && (
            <MotivoDeLer idade={idade} hoje={hoje} className="mt-6" />
          )}

          {juntando && (
            <div className="mt-6">
              {comPdf ? (
                <ArquivoDaNota nome={pdf.nome} aoTirar={pdf.aoTirar} />
              ) : (
                <FaixaDeFotos fotos={fotos} aoTirar={aoTirar} />
              )}
              {notaDaFaixa && !comPdf && (
                <p className="mt-3 text-label text-ink-muted">{notaDaFaixa}</p>
              )}
            </div>
          )}

          {/* Celular, juntando: ler é o âmbar; a continuação, a câmera de novo. */}
          {juntando && (
            <div className="mt-6 grid gap-3 lg:hidden">
              <Botao
                variante="primaria"
                tamanho="lg"
                larguraTotal
                disabled={!online}
                onClick={lerAgora}
                iconeInicial={
                  <ScanLine aria-hidden className="size-5" strokeWidth={1.75} />
                }
              >
                {rotuloLer}
              </Botao>
              {cabeMais && (
                <Botao
                  tamanho="lg"
                  larguraTotal
                  disabled={!online}
                  onClick={() => camera.current?.click()}
                  iconeInicial={
                    <Camera aria-hidden className="size-5" strokeWidth={1.75} />
                  }
                >
                  Fotografar a continuação
                </Botao>
              )}
            </div>
          )}

          {/* Celular: as duas ações em largura inteira, a câmera primeiro. */}
          <div
            className={cn("mt-6 grid gap-3 lg:hidden", juntando && "hidden")}
          >
            <Botao
              variante="primaria"
              tamanho="lg"
              larguraTotal
              disabled={!online}
              onClick={() => camera.current?.click()}
              iconeInicial={
                <Camera aria-hidden className="size-5" strokeWidth={1.75} />
              }
            >
              Fotografar a nota
            </Botao>
            <Botao
              tamanho="lg"
              larguraTotal
              disabled={!online}
              onClick={() => seletor.current?.click()}
              iconeInicial={
                <ImageUp aria-hidden className="size-5" strokeWidth={1.75} />
              }
            >
              Escolher foto ou PDF
            </Botao>
          </div>

          {/* Computador, juntando: soltar e colar continuam juntando. */}
          {juntando && (
            <div className="mt-6 hidden flex-wrap items-center gap-x-4 gap-y-2 lg:flex">
              <Botao
                variante="primaria"
                tamanho="lg"
                disabled={!online}
                onClick={lerAgora}
                iconeInicial={
                  <ScanLine aria-hidden className="size-5" strokeWidth={1.75} />
                }
              >
                {rotuloLer}
              </Botao>
              {cabeMais && (
                <>
                  <Botao
                    tamanho="lg"
                    disabled={!online}
                    onClick={() => seletor.current?.click()}
                    iconeInicial={
                      <FileUp
                        aria-hidden
                        className="size-5"
                        strokeWidth={1.75}
                      />
                    }
                  >
                    Juntar a continuação
                  </Botao>
                  <span className="text-micro text-ink-muted">
                    ou solte e cole aqui
                  </span>
                </>
              )}
            </div>
          )}

          {/* Computador: o bloco inteiro é onde soltar. */}
          <div className={cn("mt-8 hidden", !juntando && "lg:block")}>
            <p className="text-subheading font-semibold text-ink">
              Solte aqui o PDF ou as fotos da nota
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Botao
                variante="primaria"
                tamanho="lg"
                disabled={!online}
                onClick={() => seletor.current?.click()}
                iconeInicial={
                  <FileUp aria-hidden className="size-5" strokeWidth={1.75} />
                }
              >
                Escolher o arquivo
              </Botao>
              <span className="text-micro text-ink-muted">
                ou cole com Ctrl+V
              </span>
            </div>
          </div>
        </div>
      </div>

      {aviso}

      <p className="flex items-start gap-2 text-label text-ink-muted">
        <Lock
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-ink-subtle"
          strokeWidth={1.75}
        />
        A foto não fica guardada. Fica o preço de cada material, dentro dele.
      </p>
    </>
  );
}

/** Uma parte da nota esperando a leitura; a tela cria e revoga o `blob:`. */
export interface FotoDaNota {
  arquivo: File;
  miniatura: string;
}

/**
 * As partes na ordem do papel, numeradas, cada uma com o "×" para tirar.
 * Quatro colunas iguais cabem em 360px. Reordenar fica fora (spec 091): tirar e
 * fotografar de novo resolve.
 */
function FaixaDeFotos({
  fotos,
  aoTirar,
}: {
  fotos: FotoDaNota[];
  aoTirar: (indice: number) => void;
}) {
  return (
    <ol
      aria-label={
        fotos.length === 1 ? "A foto da nota" : "As partes da nota, em ordem"
      }
      className="grid max-w-sm grid-cols-4 gap-3"
    >
      {fotos.map((foto, indice) => (
        <li key={foto.miniatura} className="relative">
          <Miniatura
            src={foto.miniatura}
            nome={foto.arquivo.name}
            alt={`Parte ${indice + 1} da nota`}
            className="aspect-3/4 w-full rounded-md border border-line bg-sunken object-cover"
          />
          <span
            aria-hidden
            className="num absolute bottom-1.5 left-1.5 rounded-sm bg-surface px-1.5 text-micro font-semibold text-ink"
          >
            {indice + 1}
          </span>
          {/* Alvo de 44px, desenho de 24px no canto: a miniatura continua à vista. */}
          <button
            type="button"
            onClick={() => aoTirar(indice)}
            aria-label={`Tirar a parte ${indice + 1}`}
            className="group absolute -right-3 -top-3 grid size-11 place-items-center rounded-full"
          >
            <span className="grid size-6 place-items-center rounded-full border border-line-strong bg-surface text-ink-muted transition-colors duration-150 ease-quart group-hover:text-ink group-active:bg-sunken">
              <X aria-hidden className="size-3.5" strokeWidth={2} />
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/** O PDF esperando "Ler esta nota": o nome, e o "×" da faixa. */
function ArquivoDaNota({
  nome,
  aoTirar,
}: {
  nome: string;
  aoTirar: () => void;
}) {
  return (
    <p className="flex max-w-sm items-center gap-2 rounded-md border border-line bg-surface py-1 pl-3 text-label text-ink">
      <FileText
        aria-hidden
        className="size-5 shrink-0 text-ink-subtle"
        strokeWidth={1.75}
      />
      <span className="min-w-0 flex-1 truncate">{nome}</span>
      <button
        type="button"
        onClick={aoTirar}
        aria-label={`Tirar ${nome}`}
        className="group grid size-11 shrink-0 place-items-center rounded-full"
      >
        <span className="grid size-6 place-items-center rounded-full border border-line-strong bg-surface text-ink-muted transition-colors duration-150 ease-quart group-hover:text-ink group-active:bg-sunken">
          <X aria-hidden className="size-3.5" strokeWidth={2} />
        </span>
      </button>
    </p>
  );
}

/**
 * A imagem escolhida, ou o nome dela quando o navegador não a desenha (HEIC no
 * Chrome): a mesma reserva da espera.
 */
function Miniatura({
  src,
  nome,
  alt,
  className,
}: {
  src: string;
  nome: string;
  alt: string;
  className?: string;
}) {
  const [quebrou, setQuebrou] = useState(false);

  if (quebrou) {
    return (
      <span
        className={cn(
          "flex flex-col items-center justify-center gap-1 p-1.5 text-micro text-ink-muted",
          className,
        )}
      >
        <FileText
          aria-hidden
          className="size-5 shrink-0 text-ink-subtle"
          strokeWidth={1.75}
        />
        <span className="max-w-full truncate">{nome}</span>
      </span>
    );
  }

  return (
    // Um `blob:` local: o `next/image` não otimiza nada aqui.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setQuebrou(true)}
      className={className}
    />
  );
}

/**
 * O motivo de ler, dito com os materiais dela. Tom neutro: não é atenção, é a
 * razão de abrir a câmera agora.
 */
function MotivoDeLer({
  idade,
  hoje,
  className,
}: {
  idade: IdadeDosPrecos;
  hoje: DataISO;
  className?: string;
}) {
  const { velhos, ultimaCompraISO } = idade;

  return (
    <p
      className={cn(
        "flex max-w-[56ch] items-start gap-2 text-body text-ink-muted",
        className,
      )}
    >
      <Clock
        aria-hidden
        className="mt-1 size-4 shrink-0 text-ink-subtle"
        strokeWidth={1.75}
      />
      <span>
        {velhos > 0 ? (
          <>
            <strong className="num font-semibold text-ink">
              {velhos} {velhos === 1 ? "material" : "materiais"}
            </strong>{" "}
            {velhos === 1 ? "está" : "estão"} com o preço de mais de 2 meses.
          </>
        ) : (
          "Os preços estão em dia."
        )}
        {ultimaCompraISO &&
          ` A última compra registrada foi em ${rotuloDiaNoAno(ultimaCompraISO, hoje)}.`}
      </span>
    </p>
  );
}

/**
 * Uma linha impressa e a mesma linha como a conferência a mostra. É desenho,
 * não dado: nada lê o Firestore. O `Selo` e o "o kg" são os da `LinhaNota`
 * aberta, para o exemplo não divergir da tela que ele promete.
 */
function ExemploDaLinha({ className }: { className?: string }) {
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-lg border border-line bg-surface",
        className,
      )}
    >
      <div className="px-4 pb-3 pt-3">
        <figcaption className="text-micro font-medium text-ink-muted">
          Exemplo
        </figcaption>
        <p className="num mt-2 flex justify-between gap-3 text-micro text-ink-subtle">
          <span className="truncate">FARINHA TRIGO D.BENTA 1KG</span>
          <span>5,49</span>
        </p>
        <ArrowDown
          aria-label="vira"
          className="my-1.5 size-4 text-ink-subtle"
          strokeWidth={1.75}
        />
        <p className="text-body text-ink">
          <span className="font-semibold">Farinha de trigo</span>
          <span className="text-ink-muted"> · Dona Benta</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-sunken px-4 py-2.5">
        <Selo tom="info" icone={<RefreshCw aria-hidden className="size-3.5" />}>
          Atualiza
        </Selo>
        <p className="num text-label text-ink-muted">
          <strong className="font-semibold text-ink">
            {formatarMoeda(549)}
          </strong>{" "}
          o kg
        </p>
      </div>
    </figure>
  );
}

/**
 * A espera é longa e é a única do sistema: entre dez e trinta segundos, com um
 * serviço externo do outro lado. Um esqueleto mentiria sobre o que está
 * acontecendo, então a tela diz, mostra a nota que ela escolheu (foi a certa?)
 * e deixa desistir.
 */
export function LendoANota({
  nome,
  fotos,
  nota,
  aoCancelar,
}: {
  /** O nome do PDF, quando é ele que se lê. */
  nome: string;
  /** As partes sendo lidas; vazio no PDF. */
  fotos: FotoDaNota[];
  /** "Lemos só o PDF.", quando ele veio junto de fotos. */
  nota: string | null;
  aoCancelar: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-line bg-surface px-6 py-10 text-center">
      {fotos.length > 0 ? (
        <div className="flex max-w-full items-start justify-center gap-2">
          {fotos.map((foto, indice) => (
            <Miniatura
              key={foto.miniatura}
              src={foto.miniatura}
              nome={foto.arquivo.name}
              alt={
                fotos.length === 1
                  ? "A nota escolhida"
                  : `Parte ${indice + 1} da nota`
              }
              className={cn(
                "min-w-0 rounded-md border border-line object-contain",
                fotos.length === 1 ? "max-h-48 max-w-full" : "max-h-32",
              )}
            />
          ))}
        </div>
      ) : (
        <p className="flex max-w-full items-center gap-2 text-label text-ink-muted">
          <FileText
            aria-hidden
            className="size-6 shrink-0 text-ink-subtle"
            strokeWidth={1.75}
          />
          <span className="truncate">{nome}</span>
        </p>
      )}

      <p
        aria-live="polite"
        className="mt-6 flex items-center gap-2.5 font-display text-title font-semibold text-ink"
      >
        <Simbolo className="size-6 animate-pulse" />
        Lendo a nota
      </p>
      <p className="mt-2 max-w-[42ch] text-body text-ink-muted">
        Leva de 10 a 30 segundos. Nada é cadastrado antes de você conferir.
      </p>
      {nota && <p className="mt-2 text-label text-ink-muted">{nota}</p>}

      <Botao variante="terciaria" className="mt-6" onClick={aoCancelar}>
        Cancelar
      </Botao>
    </div>
  );
}
