import { LADO_MAXIMO_PX, QUALIDADE_JPEG } from "@/lib/domain/notaFiscal";

export interface ArquivoParaLeitura {
  mimeType: string;
  /** Só o conteúdo, sem o prefixo `data:...;base64,`. */
  dados: string;
}

/**
 * A foto antes de subir.
 *
 * Foto de celular chega com 4000px e alguns megabytes. Não é otimização
 * prematura reduzi-la: é sinal ruim na cozinha e é token pago por pixel que
 * ninguém vai olhar. PDF sobe como está — ele já é texto, e recomprimir não
 * faria nada além de estragar.
 *
 * Falhar aqui não trava a leitura: um formato que o navegador não sabe desenhar
 * (HEIC em navegador antigo) sobe como veio, e quem decide se é grande demais é
 * o teto da rota.
 */
export async function prepararParaLeitura(
  arquivo: File,
): Promise<ArquivoParaLeitura> {
  const tipo = arquivo.type || "application/octet-stream";

  if (tipo === "application/pdf") {
    return { mimeType: tipo, dados: await paraBase64(arquivo) };
  }

  try {
    const reduzida = await reduzir(arquivo);
    if (reduzida) {
      return { mimeType: "image/jpeg", dados: await paraBase64(reduzida) };
    }
  } catch {
    // Cai para o original abaixo.
  }

  return { mimeType: tipo, dados: await paraBase64(arquivo) };
}

async function reduzir(arquivo: File): Promise<Blob | null> {
  const fonte = await desenhavel(arquivo);
  const escala = Math.min(
    1,
    LADO_MAXIMO_PX / Math.max(fonte.largura, fonte.altura),
  );

  const tela = document.createElement("canvas");
  tela.width = Math.round(fonte.largura * escala);
  tela.height = Math.round(fonte.altura * escala);

  const pincel = tela.getContext("2d");
  if (!pincel) return null;

  // Fundo branco: nota fotografada com transparência (PNG) viraria preta no
  // JPEG, e uma nota preta não se lê.
  pincel.fillStyle = "#ffffff";
  pincel.fillRect(0, 0, tela.width, tela.height);
  pincel.drawImage(fonte.imagem, 0, 0, tela.width, tela.height);
  fonte.liberar();

  return new Promise((resolver) =>
    tela.toBlob((blob) => resolver(blob), "image/jpeg", QUALIDADE_JPEG),
  );
}

interface Desenhavel {
  imagem: CanvasImageSource;
  largura: number;
  altura: number;
  liberar: () => void;
}

/**
 * `createImageBitmap` primeiro, porque é ele que aplica a rotação do EXIF sem
 * depender do CSS: nota fotografada de lado é o caso comum, e uma nota deitada
 * é uma nota que o modelo lê pior.
 */
async function desenhavel(arquivo: File): Promise<Desenhavel> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(arquivo, {
        imageOrientation: "from-image",
      });
      return {
        imagem: bitmap,
        largura: bitmap.width,
        altura: bitmap.height,
        liberar: () => bitmap.close(),
      };
    } catch {
      // Navegador sem a opção, ou formato que ele não decodifica assim.
    }
  }

  const endereco = URL.createObjectURL(arquivo);
  try {
    const imagem = await new Promise<HTMLImageElement>((resolver, rejeitar) => {
      const elemento = new Image();
      elemento.onload = () => resolver(elemento);
      elemento.onerror = () => rejeitar(new Error("Imagem ilegível"));
      elemento.src = endereco;
    });

    return {
      imagem,
      largura: imagem.naturalWidth,
      altura: imagem.naturalHeight,
      liberar: () => URL.revokeObjectURL(endereco),
    };
  } catch (erro) {
    URL.revokeObjectURL(endereco);
    throw erro;
  }
}

function paraBase64(arquivo: Blob): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      const resultado = String(leitor.result);
      resolver(resultado.slice(resultado.indexOf(",") + 1));
    };
    leitor.onerror = () =>
      rejeitar(leitor.error ?? new Error("Leitura falhou"));
    leitor.readAsDataURL(arquivo);
  });
}
