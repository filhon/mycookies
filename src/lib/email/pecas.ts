import { URL_DO_SITE } from "@/app/site";
import { DIAS_DE_TESTE } from "@/lib/domain/cadastro";
import {
  competenciaVizinha,
  diasNoMes,
  rotuloDiaPorExtenso,
  rotuloMes,
} from "@/lib/domain/datas";
import { formatarMoeda, formatarValor } from "@/lib/domain/money";
import type { Centavos, CompetenciaMensal, DataISO, Pacote } from "@/lib/types";

/**
 * As cinco peças de e-mail do Rende (spec 044, `DECISOES.md#d203`).
 *
 * HTML de e-mail escrito à mão: tabelas, estilo inline, 560 px, o molde
 * aprovado em `docs/specs/044-emails/`. Mudança de desenho volta para
 * aprovação. Cada peça é pura: `(dados) => Peca`, com a versão em texto sempre.
 *
 * Todo texto que veio dela (nome, negócio, nome de produto, e-mail) passa por
 * `escapar()` no HTML e entra inteiro no texto.
 */

export interface Peca {
  assunto: string;
  preheader: string;
  html: string;
  texto: string;
}

// E-mail não lê variável de CSS: os tokens de `globals.css` escritos em hex,
// o tema claro, e só aqui (`color-scheme: light only`, `#d203`).
const PAPEL = "#F7F4EE";
const FOLHA = "#FEFCF8";
const LINHA = "#E1DCD3";
const TINTA = "#22242E";
const MUDO = "#6A6C78";
const LINK = "#2A2C3A";
const FAIXA = "#1C1E28"; // --brand-800
const AMBAR = "#D89B3C"; // --accent-500
const SOBRE_AMBAR = "#231A08";
const NEGATIVO = "#B02A1C";
const FUNDO_NEGATIVO = "#FADFDA";
const POSITIVO = "#17724A";

const CORPO =
  "Figtree,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const DISPLAY = "Archivo,'Helvetica Neue',Helvetica,Arial,sans-serif";

const DOMINIO = new URL(URL_DO_SITE).host.replace(/^www\./, "");

export function escapar(texto: string): string {
  return texto.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

// ---------------------------------------------------------------------------
// A moldura e os pedaços que se repetem

const ESTILO = `
  body { margin: 0; padding: 0; background: ${PAPEL}; }
  a { color: ${LINK}; }
  @media (max-width: 600px) {
    .moldura { padding: 12px 8px 32px !important; }
    .faixa { padding: 18px 20px !important; }
    .corpo { padding: 28px 20px 32px !important; }
    .pe { padding: 20px 20px 0 !important; }
    .titulo { font-size: 26px !important; }
    .grande { font-size: 38px !important; }
    .plano td { display: block !important; width: auto !important; text-align: left !important; padding-right: 0 !important; }
    .plano .nome { border-bottom: 0 !important; padding-bottom: 0 !important; }
    .plano .preco { padding-top: 6px !important; }
    .botao { width: 100% !important; }
    .botao-td, .botao-td a { display: block !important; width: auto !important; text-align: center !important; }
  }`;

/** Empurra o começo do corpo para fora da prévia da caixa de entrada. */
const ENCHIMENTO = "&#8199;&#847;".repeat(6);

const TABELA =
  'role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"';

function moldura(p: {
  assunto: string;
  preheader: string;
  corpo: string;
  pe: string;
}): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escapar(p.assunto)}</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@700&family=Figtree:wght@400;500;600&display=swap" rel="stylesheet">
<style>${ESTILO}
</style>
</head>
<body style="margin:0;padding:0;background:${PAPEL};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapar(p.preheader)}${ENCHIMENTO}</div>
<table ${TABELA} style="background:${PAPEL};">
<tr><td align="center" class="moldura" style="padding:24px 12px 40px;">
<table ${TABELA} style="max-width:560px;">

  <tr><td class="faixa" style="background:${FAIXA};border-radius:14px 14px 0 0;padding:22px 32px;">
    <img src="${URL_DO_SITE}/email/rende.png" width="112" height="27" alt="Rende" style="display:block;border:0;outline:none;">
  </td></tr>

  <tr><td class="corpo" style="background:${FOLHA};border:1px solid ${LINHA};border-top:0;border-radius:0 0 14px 14px;padding:36px 32px 40px;font-family:${CORPO};font-size:16px;line-height:1.55;color:${TINTA};">
${p.corpo}
  </td></tr>

  <tr><td class="pe" style="padding:20px 32px 0;font-family:${CORPO};font-size:13px;line-height:1.5;color:${MUDO};">
    ${p.pe}<br>
    <a href="${URL_DO_SITE}" style="color:${MUDO};">${DOMINIO}</a>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>
`;
}

/** Blocos separados por linha em branco, e o rodapé depois de "-- ". */
function texto(blocos: (string | false)[], pe: string): string {
  return `${blocos.filter(Boolean).join("\n\n")}\n\n-- \n${pe}\n${DOMINIO}\n`;
}

function ponto(tamanho: 9 | 12, margem: number): string {
  return `<span aria-hidden="true" style="display:inline-block;width:${tamanho}px;height:${tamanho}px;border-radius:${Math.ceil(tamanho / 2)}px;background:${AMBAR};margin-left:${margem}px;"></span>`;
}

function titulo(html: string, margem: 20 | 28, comPonto = false): string {
  return `<h1 class="titulo" style="margin:0 0 ${margem}px;font-family:${DISPLAY};font-size:30px;line-height:1.15;font-weight:700;letter-spacing:-0.02em;color:${TINTA};">${html}${comPonto ? ponto(9, 3) : ""}</h1>`;
}

function botao(href: string, rotulo: string, margem: 24 | 28 = 28): string {
  return `<table role="presentation" class="botao" cellpadding="0" cellspacing="0" border="0" style="margin:${margem}px 0 0;">
      <tr><td class="botao-td" bgcolor="${AMBAR}" style="border-radius:10px;">
        <a href="${escapar(href)}" style="display:inline-block;padding:15px 24px;font-family:${CORPO};font-size:16px;line-height:22px;font-weight:600;color:${SOBRE_AMBAR};text-decoration:none;border-radius:10px;">${rotulo}</a>
      </td></tr>
    </table>`;
}

/** O parágrafo sob a divisória, no fim do corpo. */
function nota(html: string, margem: 32 | 36): string {
  return `<table ${TABELA} style="margin:${margem}px 0 0;">
      <tr><td style="border-top:1px solid ${LINHA};padding:20px 0 0;font-size:15px;line-height:1.55;color:${MUDO};">
        ${html}
      </td></tr>
    </table>`;
}

function lista(linhas: string[]): string {
  return `<table ${TABELA} style="border-top:1px solid ${LINHA};">${linhas.join("")}
    </table>`;
}

/** Uma linha da lista: o rótulo à esquerda, o número à direita. */
function linha(
  rotulo: string,
  valor: string,
  { cor = TINTA, numero = true }: { cor?: string; numero?: boolean } = {},
): string {
  const doNumero = numero
    ? "font-variant-numeric:tabular-nums;white-space:nowrap;"
    : "";
  return `
      <tr>
        <td style="padding:13px 12px 13px 0;border-bottom:1px solid ${LINHA};font-size:15px;color:${MUDO};">${rotulo}</td>
        <td align="right" style="padding:13px 0;border-bottom:1px solid ${LINHA};font-size:16px;font-weight:600;color:${cor};${doNumero}">${valor}</td>
      </tr>`;
}

/** "R$ 1.840,00" com o "R$" menor, como na lista do app. */
function reais(centavos: Centavos): string {
  return `<span style="font-size:13px;font-weight:500;color:${MUDO};">R$</span> ${formatarValor(centavos)}`;
}

/** O número que decide, grande, com o ponto quando a notícia é boa. */
function numeroGrande(
  rotulo: string,
  centavos: Centavos,
  comPonto: boolean,
): string {
  const sinal = centavos < 0 ? "-" : "";
  return `<div style="font-size:14px;font-weight:500;color:${MUDO};margin:0 0 4px;">${rotulo}</div>
    <div class="grande" style="font-family:${DISPLAY};font-size:44px;line-height:1.05;font-weight:700;letter-spacing:-0.02em;color:${TINTA};font-variant-numeric:tabular-nums;white-space:nowrap;">${sinal}<span style="font-family:${CORPO};font-size:20px;font-weight:600;letter-spacing:0;color:${MUDO};">R$</span> ${formatarValor(Math.abs(centavos))}${comPonto ? ponto(12, 10) : ""}</div>`;
}

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

/** "sexta, 9 de outubro": o dia como se fala, sem o "-feira". */
function diaFalado(iso: DataISO): string {
  return rotuloDiaPorExtenso(iso).replace("-feira", "");
}

function maiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "29" para R$ 29,00: o preço do plano é redondo, e o molde escreve assim. */
function reaisRedondos(centavos: Centavos): string {
  return formatarValor(centavos).replace(/,00$/, "");
}

function desligar(motivo: string): { html: string; texto: string } {
  return {
    html: `${motivo} Não quer mais? <a href="${URL_DO_SITE}/configuracao#avisos" style="color:${MUDO};">Desligue em Configuração</a>.`,
    texto: `${motivo} Não quer mais? Desligue em Configuração: ${URL_DO_SITE}/configuracao#avisos`,
  };
}

// ---------------------------------------------------------------------------
// Boas-vindas

export interface DadosBoasVindas {
  nome: string;
  email: string;
  /** O dia do fim do teste, em São Paulo. */
  acabaEmISO: DataISO;
  origem?: "calculadora";
}

export function boasVindas(d: DadosBoasVindas): Peca {
  const assunto = "Boas-vindas ao Rende. Comece por um produto só.";
  const preheader = `Você tem ${DIAS_DE_TESTE} dias. Dez minutos bastam para o primeiro preço.`;
  const ate = diaFalado(d.acabaEmISO);
  const calculadora = d.origem === "calculadora";
  const segundo = calculadora
    ? "O produto que você montou na calculadora já está na sua conta, com o seu material. Abra, confira o preço e troque o que for diferente na sua cozinha."
    : "Não precisa cadastrar tudo. Escolha o doce que você mais vende, monte a receita e veja quanto custa cada unidade de verdade: material, embalagem, a sua hora, o gás e a maquininha.";
  const terceiro =
    "Leva uns dez minutos. Se o preço que aparecer te surpreender, era exatamente pra isso.";
  const acao = calculadora
    ? "Abrir o meu produto"
    : "Montar o primeiro produto";
  const assinatura =
    "Travou em alguma coisa? Responda este e-mail. Quem lê sou eu, o Filipe, que faz o Rende.";
  const pe = `Você recebeu este e-mail porque criou uma conta no Rende com ${d.email}.`;

  return {
    assunto,
    preheader,
    html: moldura({
      assunto,
      preheader,
      corpo: `
    ${titulo(`Oi, ${escapar(d.nome)}`, 20, true)}

    <p style="margin:0 0 16px;">Você tem ${DIAS_DE_TESTE} dias de teste grátis, até <strong style="font-weight:600;">${ate}</strong>.</p>

    <p style="margin:0 0 16px;">${segundo}</p>

    <p style="margin:0;">${terceiro}</p>

    ${botao(`${URL_DO_SITE}/fichas`, acao)}

    ${nota(assinatura, 36)}
`,
      pe: `Você recebeu este e-mail porque criou uma conta no Rende com ${escapar(d.email)}.`,
    }),
    texto: texto(
      [
        `Oi, ${d.nome}.`,
        `Você tem ${DIAS_DE_TESTE} dias de teste grátis, até ${ate}.`,
        segundo,
        terceiro,
        `${acao}: ${URL_DO_SITE}/fichas`,
        assinatura,
      ],
      pe,
    ),
  };
}

// ---------------------------------------------------------------------------
// Senha nova

export interface DadosSenhaNova {
  email: string;
  /** `/redefinir-senha?mode=resetPassword&oobCode=…` (`#d204`). */
  link: string;
}

export function senhaNova(d: DadosSenhaNova): Peca {
  const assunto = "Sua senha nova do Rende";
  const preheader = "O link vale por uma hora e funciona uma vez.";
  const link = escapar(d.link);
  const ignorar =
    "Não foi você? Pode ignorar este e-mail. A sua senha de hoje continua valendo, e ninguém entra sem ela.";
  const pe =
    "Este e-mail sai sempre que alguém pede senha nova na tela de entrar do Rende.";

  return {
    assunto,
    preheader,
    html: moldura({
      assunto,
      preheader,
      corpo: `
    ${titulo("Senha nova", 20, true)}

    <p style="margin:0;">Alguém pediu uma senha nova para a conta <strong style="font-weight:600;">${escapar(d.email)}</strong> no Rende. Se foi você, toque no botão e escolha a senha nova. Depois disso você já entra.</p>

    ${botao(d.link, "Criar a senha nova")}

    <p style="margin:20px 0 0;font-size:14px;line-height:1.5;color:${MUDO};">O link vale por uma hora e funciona uma vez. Se o botão não abrir, copie este endereço no navegador:<br>
      <a href="${link}" style="color:${LINK};word-break:break-all;">${link}</a></p>

    ${nota(ignorar, 32)}
`,
      pe,
    }),
    texto: texto(
      [
        `Alguém pediu uma senha nova para a conta ${d.email} no Rende. Se foi você, abra o link abaixo e escolha a senha nova. Depois disso você já entra.`,
        `Criar a senha nova: ${d.link}`,
        "O link vale por uma hora e funciona uma vez.",
        ignorar,
      ],
      pe,
    ),
  };
}

// ---------------------------------------------------------------------------
// Teste acabando

export interface DadosTesteAcabando {
  nome: string;
  negocio: string;
  acabaEmISO: DataISO;
  /** Dias de calendário até `acabaEmISO`: é o que o rodapé diz. */
  faltam: number;
  diasDeUso: number;
  /** Produtos com preço. */
  produtos: number;
  noVermelho: number;
  /** O que mais perde por unidade, quando há algum no vermelho. */
  pior?: { nome: string; perdaPorUnidade: Centavos; minimo: Centavos };
  pedidos: number;
  entrou: Centavos;
  /** Do Stripe. Sem ele, os planos saem sem número (`#d174`). */
  precos: Record<Pacote, { mensal: Centavos; anual: Centavos }> | null;
}

const PLANOS: { pacote: Pacote; nome: string; oQueTem: string }[] = [
  {
    pacote: "ESSENCIAL",
    nome: "Essencial",
    oQueTem:
      "Preço de cada doce, pedidos, lista de compras, caixa e meta do mês.",
  },
  {
    pacote: "COMPLETO",
    nome: "Completo",
    oQueTem:
      "Tudo do essencial, mais a ajudante com login próprio e o cardápio online.",
  },
];

export function testeAcabando(d: DadosTesteAcabando): Peca {
  const ate = diaFalado(d.acabaEmISO);
  const assunto = `Faltam ${plural(d.faltam, "dia", "dias")}, e o que o Rende já achou`;
  const semProduto = d.produtos === 0;
  const pior = d.noVermelho > 0 ? d.pior : undefined;

  const preheader = semProduto
    ? "Dá tempo de montar o primeiro produto e ver o custo real."
    : d.noVermelho > 0
      ? d.produtos === 1
        ? "O preço do seu produto não cobre o custo."
        : `Em ${d.noVermelho} dos seus ${d.produtos} produtos o preço não cobre o custo.`
      : d.produtos === 1
        ? "O preço do seu produto cobre o custo."
        : `Nenhum dos seus ${d.produtos} produtos está no vermelho.`;

  const abertura = semProduto
    ? `Oi, ${d.nome}. Você ainda não montou nenhum produto. Dá tempo: escolha o doce que mais vende e veja o custo real em dez minutos.`
    : `Oi, ${d.nome}. Em ${plural(d.diasDeUso, "dia", "dias")} de Rende, foi isto que a conta mostrou:`;
  const nenhumNoVermelho = `Nenhum produto no vermelho: ${d.produtos === 1 ? "o seu cobre" : `os ${d.produtos} cobrem`} o custo.`;
  const fraseDoPior =
    pior &&
    `na ${pior.nome} você perde ${formatarMoeda(pior.perdaPorUnidade)} por unidade. O mínimo pra não perder é ${formatarMoeda(pior.minimo)}.`;
  const semAssinar =
    "Se não assinar, nada se apaga. Você continua vendo tudo e pode baixar uma cópia dos seus dados; só não dá pra lançar coisa nova.";
  const pe = `Você recebeu este e-mail porque o teste grátis da conta ${d.negocio} acaba em ${plural(d.faltam, "dia", "dias")}. É o único aviso.`;

  const numeros = semProduto
    ? ""
    : `
    ${lista([
      linha("Produtos com preço", String(d.produtos)),
      d.noVermelho > 0
        ? linha(
            `No vermelho <span style="color:${MUDO};">(o preço não cobre o custo)</span>`,
            String(d.noVermelho),
            { cor: NEGATIVO },
          )
        : "",
      linha("Pedidos anotados", String(d.pedidos)),
      linha("Entrou no caixa", reais(d.entrou)),
    ])}

    ${
      pior
        ? `<table ${TABELA} style="margin:20px 0 0;">
      <tr><td style="background:${FUNDO_NEGATIVO};border-radius:10px;padding:16px 18px;font-size:15px;line-height:1.5;color:${TINTA};">
        <strong style="font-weight:600;color:${NEGATIVO};">No vermelho:</strong> na ${escapar(pior.nome)} você perde <strong style="font-weight:600;white-space:nowrap;">${formatarMoeda(pior.perdaPorUnidade)}</strong> por unidade. O mínimo pra não perder é <strong style="font-weight:600;white-space:nowrap;">${formatarMoeda(pior.minimo)}</strong>.
      </td></tr>
    </table>`
        : `<p style="margin:20px 0 0;font-size:15px;">${nenhumNoVermelho}</p>`
    }`;

  const planos = PLANOS.map(({ pacote, nome, oQueTem }) => {
    const preco = d.precos?.[pacote];
    const colunaDoPreco = preco
      ? `
        <td align="right" class="preco" style="padding:14px 0;border-bottom:1px solid ${LINHA};vertical-align:top;white-space:nowrap;font-variant-numeric:tabular-nums;">
          <div style="font-size:16px;font-weight:600;color:${TINTA};"><span style="font-size:13px;font-weight:500;color:${MUDO};">R$</span> ${reaisRedondos(preco.mensal)}<span style="font-size:13px;font-weight:500;color:${MUDO};">/mês</span></div>
          <div style="font-size:13px;color:${MUDO};">ou R$ ${reaisRedondos(preco.anual)} no ano</div>
        </td>`
      : "";
    return `
      <tr>
        <td${preco ? ' class="nome"' : ""} style="padding:14px 16px 14px 0;border-bottom:1px solid ${LINHA};vertical-align:top;">
          <div style="font-size:16px;font-weight:600;color:${TINTA};">${nome}</div>
          <div style="font-size:14px;line-height:1.45;color:${MUDO};">${oQueTem}</div>
        </td>${colunaDoPreco}
      </tr>`;
  }).join("");

  const planosEmTexto = PLANOS.map(({ pacote, nome, oQueTem }) => {
    const preco = d.precos?.[pacote];
    return preco
      ? `${nome}, R$ ${reaisRedondos(preco.mensal)}/mês ou R$ ${reaisRedondos(preco.anual)} no ano: ${oQueTem}`
      : `${nome}: ${oQueTem}`;
  }).join("\n");

  return {
    assunto,
    preheader,
    html: moldura({
      assunto,
      preheader,
      corpo: `
    ${titulo(`Seu teste acaba ${ate}.`, 20)}

    <p style="margin:0 0 24px;">${escapar(abertura)}</p>
${numeros}

    <h2 style="margin:36px 0 6px;font-family:${CORPO};font-size:17px;line-height:1.4;font-weight:600;color:${TINTA};">Com a assinatura, tudo continua</h2>
    <p style="margin:0 0 16px;font-size:15px;color:${MUDO};">Os produtos, os pedidos e o caixa ficam do jeito que estão.</p>

    <table ${TABELA} class="plano" style="border-top:1px solid ${LINHA};">${planos}
    </table>

    ${botao(`${URL_DO_SITE}/assinatura`, "Escolher a assinatura")}

    <p style="margin:20px 0 0;font-size:14px;line-height:1.5;color:${MUDO};">${semAssinar}</p>
`,
      pe: escapar(pe),
    }),
    texto: texto(
      [
        `Seu teste acaba ${ate}.`,
        abertura,
        !semProduto &&
          [
            `Produtos com preço: ${d.produtos}`,
            d.noVermelho > 0 &&
              `No vermelho (o preço não cobre o custo): ${d.noVermelho}`,
            `Pedidos anotados: ${d.pedidos}`,
            `Entrou no caixa: ${formatarMoeda(d.entrou)}`,
          ]
            .filter(Boolean)
            .join("\n"),
        !semProduto &&
          (fraseDoPior ? `No vermelho: ${fraseDoPior}` : nenhumNoVermelho),
        "Com a assinatura, tudo continua. Os produtos, os pedidos e o caixa ficam do jeito que estão.",
        planosEmTexto,
        `Escolher a assinatura: ${URL_DO_SITE}/assinatura`,
        semAssinar,
      ],
      pe,
    ),
  };
}

// ---------------------------------------------------------------------------
// Meta batida

export interface DadosMetaBatida {
  competencia: CompetenciaMensal;
  entrou: Centavos;
  alvo: Centavos;
  /** O dia do mês em que a soma das entradas alcançou o alvo. */
  diaQueBateu: number;
}

export function metaBatida(d: DadosMetaBatida): Peca {
  const mes = rotuloMes(d.competencia);
  const ultimo = diasNoMes(d.competencia);
  const noUltimo = d.diaQueBateu >= ultimo;
  const restam = ultimo - d.diaQueBateu;
  const acima = d.entrou - d.alvo;

  const assunto = `Meta de ${mes} batida: ${formatarMoeda(d.entrou)}`;
  const preheader = noUltimo
    ? `Bateu no dia ${d.diaQueBateu}, o último do mês.`
    : `Bateu no dia ${d.diaQueBateu}, com ${plural(restam, "dia", "dias")} de mês pela frente.`;
  const rotulo = noUltimo ? `Entrou em ${mes}` : `Entrou em ${mes} até agora`;
  const comparacao =
    acima > 0
      ? `${formatarMoeda(acima)} acima da meta de ${formatarMoeda(d.alvo)}.`
      : `Bem na meta de ${formatarMoeda(d.alvo)}.`;
  const aMais = `Daqui até o dia ${ultimo}, o que entrar é a mais.`;
  const { html: pe, texto: peTexto } = desligar(
    "Você recebe este aviso porque tem uma meta no Rende.",
  );

  return {
    assunto,
    preheader,
    html: moldura({
      assunto,
      preheader,
      corpo: `
    ${titulo(`Meta de ${mes} batida.`, 28)}

    ${numeroGrande(rotulo, d.entrou, true)}
    <div style="font-size:15px;color:${TINTA};margin:8px 0 0;">${
      acima > 0
        ? `<strong style="font-weight:600;">${formatarMoeda(acima)} acima</strong> da meta de ${formatarMoeda(d.alvo)}.`
        : comparacao
    }</div>

    <table ${TABELA} style="margin:24px 0 0;">
      <tr><td height="10" bgcolor="${POSITIVO}" style="height:10px;line-height:10px;font-size:0;border-radius:5px;background:${POSITIVO};">&nbsp;</td></tr>
    </table>
    <table ${TABELA} style="margin:8px 0 0;">
      <tr>
        <td style="font-size:14px;font-weight:600;color:${POSITIVO};">Batida no dia ${d.diaQueBateu}</td>${
          noUltimo
            ? ""
            : `
        <td align="right" style="font-size:14px;color:${MUDO};">${plural(restam, "dia", "dias")} de mês pela frente</td>`
        }
      </tr>
    </table>
${noUltimo ? "" : `\n    <p style="margin:32px 0 0;">${aMais}</p>\n`}
    <p style="margin:${noUltimo ? 32 : 24}px 0 0;font-size:15px;"><a href="${URL_DO_SITE}/financeiro" style="color:${LINK};font-weight:600;">Abrir o caixa de ${mes}</a></p>
`,
      pe,
    }),
    texto: texto(
      [
        `Meta de ${mes} batida.`,
        `${rotulo}: ${formatarMoeda(d.entrou)}. ${comparacao}`,
        `Batida no dia ${d.diaQueBateu}${noUltimo ? "." : `, com ${plural(restam, "dia", "dias")} de mês pela frente.`}`,
        !noUltimo && aMais,
        `Abrir o caixa de ${mes}: ${URL_DO_SITE}/financeiro`,
      ],
      peTexto,
    ),
  };
}

// ---------------------------------------------------------------------------
// Mês fechado

export interface DadosMesFechado {
  competencia: CompetenciaMensal;
  entrou: Centavos;
  saiu: Centavos;
  pedidos: number;
  maisVendido?: { nome: string; unidades: number };
  /** Sem meta no mês, a linha sai. `diaQueBateu` nulo é meta não batida. */
  meta?: { alvo: Centavos; diaQueBateu: number | null };
  /** O mês novo já tem meta: o botão vira o link do caixa. */
  metaDoProximo: boolean;
}

export function mesFechado(d: DadosMesFechado): Peca {
  const mes = maiuscula(rotuloMes(d.competencia));
  const proximo = rotuloMes(competenciaVizinha(d.competencia, 1));
  const resultado = d.entrou - d.saiu;
  const prejuizo = resultado < 0;

  const assunto = prejuizo
    ? `${mes} fechou: faltaram ${formatarMoeda(-resultado)}`
    : `${mes} fechou: sobraram ${formatarMoeda(resultado)}`;
  const preheader = `Entrou ${formatarMoeda(d.entrou)}, saiu ${formatarMoeda(d.saiu)}${
    d.pedidos > 0 ? `, em ${plural(d.pedidos, "pedido", "pedidos")}.` : "."
  }`;
  const rotulo = prejuizo ? "Faltou" : "Sobrou pra você";
  const explicacao = prejuizo
    ? "Saiu mais do que entrou. Vale abrir o caixa e ver onde."
    : "É o que entrou menos o que saiu no caixa do mês.";
  const meta = d.meta && {
    rotulo: `Meta de ${formatarMoeda(d.meta.alvo)}`,
    valor:
      d.meta.diaQueBateu != null
        ? `batida no dia ${d.meta.diaQueBateu}`
        : `faltaram ${formatarMoeda(Math.max(0, d.meta.alvo - d.entrou))}`,
    batida: d.meta.diaQueBateu != null,
  };
  const semMeta = `${maiuscula(proximo)} ainda não tem meta. Diga quanto quer faturar e o Rende mostra quantos doces por semana isso pede.`;
  const { html: pe, texto: peTexto } = desligar(
    "Você recebe o resumo no dia 2 de cada mês em que houve caixa.",
  );

  const fecho = d.metaDoProximo
    ? `<p style="margin:28px 0 0;font-size:15px;"><a href="${URL_DO_SITE}/financeiro" style="color:${LINK};font-weight:600;">Abrir o caixa de ${proximo}</a></p>`
    : `<p style="margin:28px 0 0;">${semMeta}</p>

    ${botao(`${URL_DO_SITE}/financeiro`, `Definir a meta de ${proximo}`, 24)}`;

  return {
    assunto,
    preheader,
    html: moldura({
      assunto,
      preheader,
      corpo: `
    ${titulo(`${mes} fechou.`, 28)}

    ${numeroGrande(rotulo, resultado, !prejuizo)}
    <div style="font-size:15px;color:${MUDO};margin:8px 0 28px;">${explicacao}</div>

    ${lista([
      linha("Entrou", reais(d.entrou)),
      linha("Saiu", reais(d.saiu)),
      d.pedidos > 0 ? linha("Pedidos", String(d.pedidos)) : "",
      d.maisVendido
        ? linha(
            "Mais vendido",
            `${escapar(d.maisVendido.nome)} <span style="font-weight:500;color:${MUDO};font-variant-numeric:tabular-nums;white-space:nowrap;">· ${d.maisVendido.unidades} un.</span>`,
            { numero: false },
          )
        : "",
      meta
        ? linha(meta.rotulo, meta.valor, {
            cor: meta.batida ? POSITIVO : TINTA,
          })
        : "",
    ])}

    ${fecho}
`,
      pe,
    }),
    texto: texto(
      [
        `${mes} fechou.`,
        `${rotulo}: ${formatarMoeda(resultado)}. ${explicacao}`,
        [
          `Entrou: ${formatarMoeda(d.entrou)}`,
          `Saiu: ${formatarMoeda(d.saiu)}`,
          d.pedidos > 0 && `Pedidos: ${d.pedidos}`,
          d.maisVendido &&
            `Mais vendido: ${d.maisVendido.nome} · ${d.maisVendido.unidades} un.`,
          meta && `${meta.rotulo}: ${meta.valor}`,
        ]
          .filter(Boolean)
          .join("\n"),
        d.metaDoProximo
          ? `Abrir o caixa de ${proximo}: ${URL_DO_SITE}/financeiro`
          : `${semMeta}\n\nDefinir a meta de ${proximo}: ${URL_DO_SITE}/financeiro`,
      ],
      peTexto,
    ),
  };
}
