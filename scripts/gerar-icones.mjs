/**
 * Rasteriza o ícone da marca nos PNGs que o iPhone e o Android pedem.
 *
 *   node scripts/gerar-icones.mjs
 *
 * Roda uma vez, e os PNGs vão para o git. **Rasterizar não é trabalho do
 * build**: nenhuma dependência de produção entra por causa disto, e o app não
 * ganha peso para desenhar o que já está desenhado.
 *
 * A origem é `public/marca/icone-app-512.svg`, o ícone do pacote da marca, com
 * um ajuste só: o `rx` do fundo sai. Os dois sistemas recortam o ícone da tela
 * de início com a máscara deles — o iOS com o superelipse, o Android com o que
 * o launcher mandar —, e um canto já arredondado dentro de outro canto
 * arredondado aparece como falha de desenho. Os PNGs do pacote têm o canto;
 * estes não (`#d44`). O maskable e o favicon de 48 são os do pacote, sem
 * ajuste: um já é quadrado, e o outro não passa por máscara nenhuma.
 *
 * O `sharp` vem no `node_modules` junto do Next e não está declarado em
 * `package.json`: é ferramenta de uma vez, não dependência do app. Se um dia
 * sumir de lá, `npm i -D sharp`, rodar isto e desinstalar.
 */
import { readFile, writeFile } from "node:fs/promises";

const ORIGEM = "public/marca/icone-app-512.svg";
const CANTO = ' rx="112"';

const DESTINOS = [
  // O App Router publica este arquivo como <link rel="apple-touch-icon">, que
  // é o que o Safari lê: SVG nesse papel ele ignora, e o iPhone instala uma
  // miniatura da página no lugar do ícone.
  { arquivo: "src/app/apple-icon.png", lado: 180 },
  { arquivo: "public/icons/icone-192.png", lado: 192 },
  { arquivo: "public/icons/icone-512.png", lado: 512 },
];

let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  console.error(
    "sharp não está disponível neste node_modules.\n" +
      "Rode `npm i -D sharp`, rode este script e desinstale em seguida.",
  );
  process.exit(1);
}

const origem = await readFile(ORIGEM, "utf8");

// Erra alto se o desenho mudar de forma: um `replace` que não encontra nada
// devolveria silenciosamente o ícone errado, e ninguém confere PNG no diff.
if (!origem.includes(CANTO)) {
  console.error(
    `${ORIGEM} não tem mais o \`${CANTO.trim()}\` do fundo.\n` +
      "Confira o desenho e ajuste este script antes de gerar de novo.",
  );
  process.exit(1);
}

const quadrado = origem.replace(CANTO, "");

for (const { arquivo, lado } of DESTINOS) {
  // Largura e altura explícitas no tamanho de saída: sem elas o rasterizador
  // usa o tamanho natural do SVG e o resultado sai borrado ao ser ampliado.
  const svg = quadrado.replace(
    'viewBox="0 0 512 512" width="512" height="512"',
    `viewBox="0 0 512 512" width="${lado}" height="${lado}"`,
  );

  const png = await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(arquivo, png);
  console.log(`${arquivo} · ${lado}×${lado} · ${png.length} bytes`);
}
