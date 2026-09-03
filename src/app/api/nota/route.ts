import { NextResponse } from "next/server";
import {
  cnpjValido,
  digitosDoCnpj,
  esquemaNotaLida,
  LIMITE_ARQUIVO_BYTES,
  LIMITE_LINHAS,
  TEMPO_LIMITE_CNPJ_MS,
  TEMPO_LIMITE_LEITURA_MS,
  TIPOS_ACEITOS,
  type FalhaNota,
  type NotaLida,
} from "@/lib/domain/notaFiscal";
import {
  abreAConta,
  conferirToken,
  credencialDisponivel,
} from "@/lib/server/firebaseAdmin";

/**
 * A leitura da nota, em Route Handler e não em Cloud Function.
 *
 * O `functions/` do projeto está no estado em que o `firebase init` o deixou.
 * Publicar a primeira função exige plano Blaze, um segundo artefato de deploy,
 * uma segunda cadeia de build e o emulador dentro do laço de desenvolvimento —
 * infraestrutura que ninguém aqui exercitou ainda. Aqui o código fica no mesmo
 * repositório e na mesma língua, e `npm run dev` basta para exercitar tudo.
 *
 * A rota faz cinco coisas e nada além: confere o token, confere que `contaId`
 * está na claim `contas`, chama o Gemini com `temperature: 0` e resposta em
 * JSON estruturado, valida a resposta com `esquemaNotaLida`, e — só então, e só
 * se `cnpjValido` der verdadeiro — pergunta o nome da loja à API pública de
 * CNPJ.
 *
 * **Ela não escreve no Firestore.** A resposta é um rascunho em memória; quem
 * grava é a tela, do aparelho, com as regras de segurança valendo. Uma leitura
 * que escrevesse direto em `insumos` colocaria um preço alucinado dentro do
 * custo de todas as fichas.
 *
 * **A foto não é guardada.** Os bytes sobem, a resposta volta, o arquivo é
 * descartado. O que precisa sobreviver já sobrevive em `historicoPrecos`.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * O mais barato da família que aceita imagem e PDF na entrada, com faixa
 * gratuita. Fica em variável de ambiente para poder trocar sem deploy de
 * código: a família anda rápido, e trocar de modelo é a resposta certa se a
 * leitura piorar.
 */
const MODELO_PADRAO = "gemini-3.5-flash-lite";

const PROMPT = `Você está lendo a foto ou o PDF de uma nota fiscal ou cupom fiscal brasileiro de compra.

Copie o que está impresso. Não some, não converta, não arredonde e não complete o que não está no papel.

- Todo valor é TEXTO, exatamente como aparece no papel: "12,50", nunca 12.5.
- "descricao" é a linha do produto como está impressa, sem mudar nada.
- "nome" é a mesma coisa escrita como uma pessoa diria: "FARINHA TRIGO DONA BENTA 1KG" vira "Farinha de trigo".
- "marca" é a marca, quando dá para dizer pela descrição. Senão, "".
- "quantidade" é a coluna de quantidade da nota, e "unidadeTexto" é a coluna de unidade (UN, PCT, KG, CX).
- "valorUnitario" é o preço de um, e "valorTotal" é o da linha. Se só um dos dois estiver impresso, deixe o outro vazio: não calcule o que falta.
- "cnpj" é o do emitente, no cabeçalho, como está impresso. Ilegível, "".
- "dataISO" é a data da compra no formato AAAA-MM-DD. Ilegível, "".
- "total" é o total impresso da nota.
- "estabelecimento" é o nome do emitente como está no cabeçalho.

Campo que não deu para ler vira texto vazio. Não invente linha e não invente valor.
Traga no máximo ${LIMITE_LINHAS} linhas, e só as linhas de produto — nada de subtotal, desconto, tributo ou forma de pagamento.`;

const CAMPO_TEXTO = { type: "STRING" } as const;

const ESQUEMA_RESPOSTA = {
  type: "OBJECT",
  properties: {
    estabelecimento: CAMPO_TEXTO,
    cnpj: CAMPO_TEXTO,
    dataISO: CAMPO_TEXTO,
    total: CAMPO_TEXTO,
    linhas: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          descricao: CAMPO_TEXTO,
          nome: CAMPO_TEXTO,
          marca: CAMPO_TEXTO,
          quantidade: CAMPO_TEXTO,
          unidadeTexto: CAMPO_TEXTO,
          valorUnitario: CAMPO_TEXTO,
          valorTotal: CAMPO_TEXTO,
        },
        required: [
          "descricao",
          "nome",
          "marca",
          "quantidade",
          "unidadeTexto",
          "valorUnitario",
          "valorTotal",
        ],
        propertyOrdering: [
          "descricao",
          "nome",
          "marca",
          "quantidade",
          "unidadeTexto",
          "valorUnitario",
          "valorTotal",
        ],
      },
    },
  },
  required: ["estabelecimento", "cnpj", "dataISO", "total", "linhas"],
  propertyOrdering: ["estabelecimento", "cnpj", "dataISO", "total", "linhas"],
} as const;

function falha(codigo: FalhaNota, status: number) {
  return NextResponse.json({ erro: codigo }, { status });
}

interface Arquivo {
  mimeType: string;
  dados: string;
}

function arquivoDoCorpo(corpo: unknown): Arquivo | null {
  if (typeof corpo !== "object" || corpo === null) return null;
  const arquivo = (corpo as { arquivo?: unknown }).arquivo;
  if (typeof arquivo !== "object" || arquivo === null) return null;

  const { mimeType, dados } = arquivo as {
    mimeType?: unknown;
    dados?: unknown;
  };
  if (typeof mimeType !== "string" || typeof dados !== "string") return null;
  if (!TIPOS_ACEITOS.includes(mimeType as (typeof TIPOS_ACEITOS)[number])) {
    return null;
  }
  if (!dados) return null;

  return { mimeType, dados };
}

/** Base64 carrega 4 caracteres a cada 3 bytes. Basta desfazer a conta. */
function bytesDoBase64(dados: string): number {
  const preenchimento = dados.endsWith("==") ? 2 : dados.endsWith("=") ? 1 : 0;
  return Math.floor((dados.length * 3) / 4) - preenchimento;
}

export async function POST(requisicao: Request) {
  // Sem credencial de servidor não há como conferir token nenhum, e todo mundo
  // levaria 401 — a tela diria que o login dela não abre a conta, que é acusar
  // a pessoa errada por uma variável que faltou na hospedagem. A chave do
  // Gemini continua sendo lida só depois da porta, como na 6A.
  if (!credencialDisponivel()) return falha("sem-configuracao", 500);

  const quem = await conferirToken(requisicao.headers.get("authorization"));
  if (!quem) return falha("sem-acesso", 401);

  let corpo: unknown;
  try {
    corpo = await requisicao.json();
  } catch {
    return falha("sem-arquivo", 400);
  }

  const contaId = (corpo as { contaId?: unknown })?.contaId;
  if (typeof contaId !== "string" || !abreAConta(quem, contaId)) {
    return falha("sem-acesso", 401);
  }

  const arquivo = arquivoDoCorpo(corpo);
  if (!arquivo) return falha("sem-arquivo", 400);
  if (bytesDoBase64(arquivo.dados) > LIMITE_ARQUIVO_BYTES) {
    return falha("arquivo-grande", 413);
  }

  const chave = process.env.GEMINI_API_KEY;
  if (!chave) return falha("sem-configuracao", 500);

  let bruto: string;
  try {
    bruto = await lerComGemini(arquivo, chave);
  } catch {
    return falha("sem-resposta", 502);
  }

  const resultado = esquemaNotaLida.safeParse(comoJson(bruto));
  if (!resultado.success) return falha("fora-de-forma", 422);
  if (resultado.data.linhas.length > LIMITE_LINHAS) {
    return falha("linhas-demais", 422);
  }

  return NextResponse.json(await enriquecer(resultado.data));
}

/**
 * A chamada ao modelo, por `fetch` e sem SDK.
 *
 * O contrato é um POST com JSON; um pacote a mais no `package.json` para montar
 * esse POST seria dependência de produção pedindo aprovação
 * (`CLAUDE.md`) para o que `fetch` já faz.
 */
async function lerComGemini(arquivo: Arquivo, chave: string): Promise<string> {
  const modelo = process.env.GEMINI_MODELO || MODELO_PADRAO;

  const resposta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": chave },
      signal: AbortSignal.timeout(TEMPO_LIMITE_LEITURA_MS),
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                inline_data: {
                  mime_type: arquivo.mimeType,
                  data: arquivo.dados,
                },
              },
              { text: PROMPT },
            ],
          },
        ],
        generationConfig: {
          // Zero porque a mesma foto precisa dar a mesma leitura: uma nota que
          // muda de valor entre duas tentativas não é conferível.
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: ESQUEMA_RESPOSTA,
        },
      }),
    },
  );

  if (!resposta.ok) throw new Error(`Gemini respondeu ${resposta.status}`);

  const json: unknown = await resposta.json();
  const texto = (json as GeminiResposta)?.candidates?.[0]?.content?.parts?.[0]
    ?.text;

  if (typeof texto !== "string" || !texto) throw new Error("Resposta vazia");
  return texto;
}

interface GeminiResposta {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

function comoJson(bruto: string): unknown {
  try {
    return JSON.parse(bruto);
  } catch {
    // Vira falha de forma logo adiante, com a frase certa.
    return null;
  }
}

// ---------------------------------------------------------------------------
// O enriquecimento, que é o passo que pode não acontecer
// ---------------------------------------------------------------------------

interface Emitente {
  nome: string;
  cidade: string;
  uf: string;
}

/**
 * Cache por CNPJ, com validade longa.
 *
 * Dado cadastral da Receita muda uma vez por ano, e ela compra no mesmo mercado
 * toda semana: a segunda nota do Atacadão não sai do servidor. O limite da API
 * pública é de 3 consultas por minuto por IP, e com uma usuária e cache isso é
 * folgado — num SaaS, o IP passa a ser o do servidor e a fila vira
 * compartilhada, e é aí que a consulta migra para o navegador ou vira chave
 * paga. O CNPJ lido continua valendo dos dois jeitos.
 */
const CACHE = new Map<string, { valor: Emitente | null; ate: number }>();
const VALIDADE_MS = 30 * 24 * 60 * 60 * 1000;
/** Falha não se guarda por um mês: um timeout não é um fato cadastral. */
const VALIDADE_FALHA_MS = 10 * 60 * 1000;

async function enriquecer(nota: NotaLida): Promise<NotaLida> {
  const cnpj = digitosDoCnpj(nota.cnpj);
  if (!cnpjValido(cnpj)) return nota;

  const emitente = await consultarCnpj(cnpj);
  if (!emitente) return nota;

  return {
    ...nota,
    estabelecimento: emitente.nome || nota.estabelecimento,
    cidade:
      emitente.cidade && emitente.uf
        ? `${emitente.cidade}/${emitente.uf}`
        : emitente.cidade,
  };
}

async function consultarCnpj(cnpj: string): Promise<Emitente | null> {
  const guardado = CACHE.get(cnpj);
  if (guardado && guardado.ate > Date.now()) return guardado.valor;

  const emitente = await perguntarCnpj(cnpj);
  CACHE.set(cnpj, {
    valor: emitente,
    ate: Date.now() + (emitente ? VALIDADE_MS : VALIDADE_FALHA_MS),
  });

  return emitente;
}

/**
 * Timeout, 429 ou 404 não são erro: a leitura volta com o nome que o modelo
 * leu, e a tela não menciona o assunto.
 *
 * **Nada além de três campos atravessa a rota.** A resposta traz endereço
 * completo, telefone, e-mail e a lista de sócios — nomes de pessoas reais que
 * não têm o que fazer no navegador dela.
 */
async function perguntarCnpj(cnpj: string): Promise<Emitente | null> {
  try {
    const resposta = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TEMPO_LIMITE_CNPJ_MS),
    });
    if (!resposta.ok) return null;

    const json = (await resposta.json()) as RespostaCnpj;
    const estabelecimento = json?.estabelecimento;

    const nome =
      estabelecimento?.nome_fantasia?.trim() ||
      json?.razao_social?.trim() ||
      "";
    const cidade = estabelecimento?.cidade?.nome?.trim() ?? "";
    const uf = estabelecimento?.estado?.sigla?.trim() ?? "";

    return nome || cidade ? { nome, cidade, uf } : null;
  } catch {
    return null;
  }
}

interface RespostaCnpj {
  razao_social?: string;
  estabelecimento?: {
    nome_fantasia?: string;
    cidade?: { nome?: string };
    estado?: { sigla?: string };
  };
}
