"use client";

import { TriangleAlert } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { Botao } from "./Botao";
import { tamanhoDoDataUrl, temAlpha } from "@/lib/domain/orcamento";
import { cn } from "@/lib/utils/cn";
import { reduzirImagem, type OpcoesDeReducao } from "@/lib/utils/imagem";

const PESADA_DEMAIS =
  "Essa imagem ficou pesada demais. Tente outra, ou recorte só o produto.";

export interface CampoImagemProps {
  rotulo: string;
  dica?: ReactNode;
  /** O `data:` URL gravado, ou `null` sem imagem. */
  valor: string | null;
  aoMudar: (dataUrl: string | null) => void;
  reducao: OpcoesDeReducao;
  /** O teto depois da redução (`DECISOES.md#d109`). */
  maxBytes: number;
  /**
   * Arquivo PNG (recorte com fundo transparente) sai com o alpha preservado:
   * WebP onde o navegador codifica, PNG onde não, com este teto no lugar de
   * `maxBytes`. Sem isto, todo arquivo sai no `reducao.formato`.
   */
  comAlpha?: { maxBytes: number };
  /** `quadrado` para a foto do produto, `largo` para a assinatura. */
  formato?: "quadrado" | "largo";
  rotuloEscolher: string;
  rotuloTirar: string;
}

/**
 * Um `<input type="file">` escondido atrás de um botão, a prévia ao lado e o
 * "tirar" quando há imagem. A redução acontece aqui, no aparelho, antes de o
 * formulário saber da imagem: o que chega ao estado já cabe no teto.
 *
 * Sem `capture`: a foto boa está na galeria, feita com luz.
 */
export function CampoImagem({
  rotulo,
  dica,
  valor,
  aoMudar,
  reducao,
  maxBytes,
  comAlpha,
  formato = "quadrado",
  rotuloEscolher,
  rotuloTirar,
}: CampoImagemProps) {
  const id = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [reduzindo, setReduzindo] = useState(false);

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    setReduzindo(true);
    try {
      const preservarAlpha = !!comAlpha && arquivo.type === "image/png";
      const dataUrl = await reduzirImagem(
        arquivo,
        preservarAlpha ? { ...reducao, formato: "image/webp" } : reducao,
      );
      const teto = preservarAlpha ? comAlpha.maxBytes : maxBytes;
      if (tamanhoDoDataUrl(dataUrl) > teto) {
        setErro(PESADA_DEMAIS);
        return;
      }
      aoMudar(dataUrl);
    } catch {
      // Formato que o navegador não desenha cai na mesma frase.
      setErro(PESADA_DEMAIS);
    } finally {
      setReduzindo(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label font-medium text-ink">
        {rotulo}
      </label>

      <div className="flex flex-wrap items-center gap-4">
        {/* A prévia fica sempre, vazia em `--surface-sunken`: o lugar da
            imagem existe antes de ela existir, e a tela não pula ao escolher.
            Recorte transparente sai solto, sem o quadrado por trás, como vai
            sair na folha. */}
        <div
          className={cn(
            "shrink-0 overflow-hidden rounded-md",
            formato === "quadrado" ? "size-24" : "h-16 w-50",
            !(valor && temAlpha(valor)) && "bg-sunken",
          )}
        >
          {valor && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={valor}
              alt=""
              className={cn(
                "size-full",
                formato === "quadrado" && !temAlpha(valor)
                  ? "object-cover"
                  : "object-contain",
              )}
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={entrada}
            id={id}
            type="file"
            accept="image/*"
            hidden
            onChange={(evento) => {
              void escolher(evento.target.files?.[0]);
              // Escolher a mesma foto de novo precisa disparar de novo.
              evento.target.value = "";
            }}
          />
          <Botao
            onClick={() => entrada.current?.click()}
            carregando={reduzindo}
          >
            {rotuloEscolher}
          </Botao>
          {valor && (
            <Botao
              variante="terciaria"
              onClick={() => {
                setErro(null);
                aoMudar(null);
              }}
              disabled={reduzindo}
            >
              {rotuloTirar}
            </Botao>
          )}
        </div>
      </div>

      {erro ? (
        <p
          role="alert"
          className="flex items-start gap-2 text-label text-negative"
        >
          <TriangleAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0"
            strokeWidth={1.75}
          />
          {erro}
        </p>
      ) : dica ? (
        <p className="text-label text-ink-muted">{dica}</p>
      ) : null}
    </div>
  );
}
