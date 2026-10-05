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
} from "lucide-react";
import { Simbolo } from "@/components/marca/Marca";
import { Botao } from "@/components/ui/Botao";
import { TituloAssinado } from "@/components/ui/EstadoVazio";
import { Selo } from "@/components/ui/Selo";
import { rotuloDiaNoAno } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import type { IdadeDosPrecos } from "@/lib/domain/notaFiscal";
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
 * Os arquivos vão crus para `aoReceber`: quem escolhe o primeiro e recusa o
 * tipo é a tela, num lugar só para os quatro caminhos.
 */
export function PortaDaNota({
  online,
  idade,
  temMateriais,
  hoje,
  aviso,
  aoReceber,
}: {
  online: boolean;
  idade: IdadeDosPrecos;
  /** Sem material nenhum, não há preço velho a dizer, e a linha some. */
  temMateriais: boolean;
  hoje: DataISO;
  aviso?: ReactNode;
  aoReceber: (arquivos: File[]) => void;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const seletor = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);

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

        <ExemploDaLinha className="mt-6 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:mt-0 xl:self-center" />

        <div>
          {temMateriais && (
            <MotivoDeLer idade={idade} hoje={hoje} className="mt-6" />
          )}

          {/* Celular: as duas ações em largura inteira, a câmera primeiro. */}
          <div className="mt-6 grid gap-3 lg:hidden">
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

          {/* Computador: o bloco inteiro é onde soltar. */}
          <div className="mt-8 hidden lg:block">
            <p className="text-subheading font-semibold text-ink">
              Solte aqui o PDF ou a foto da nota
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
 * não dado: nada lê o Firestore. As classes e o `Selo` são os do
 * `CartaoLinhaNota`, para o exemplo não divergir da tela que ele promete.
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
  miniatura,
  varios,
  aoCancelar,
}: {
  nome: string;
  /** `blob:` da imagem, revogado pela tela ao sair da etapa; `null` no PDF. */
  miniatura: string | null;
  /** Soltou ou colou mais de um: só o primeiro é lido (até a 091). */
  varios: boolean;
  aoCancelar: () => void;
}) {
  const [quebrou, setQuebrou] = useState(false);

  return (
    <div className="flex flex-col items-center rounded-lg border border-line bg-surface px-6 py-10 text-center">
      {miniatura && !quebrou ? (
        // Um `blob:` local: o `next/image` não otimiza nada aqui.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={miniatura}
          alt={`A nota escolhida: ${nome}`}
          onError={() => setQuebrou(true)}
          className="max-h-48 max-w-full rounded-md border border-line object-contain"
        />
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
      {varios && (
        <p className="mt-2 text-label text-ink-muted">
          Lemos só o primeiro arquivo.
        </p>
      )}

      <Botao variante="terciaria" className="mt-6" onClick={aoCancelar}>
        Cancelar
      </Botao>
    </div>
  );
}
