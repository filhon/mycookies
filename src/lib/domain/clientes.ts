import type { Cliente, DataISO } from "@/lib/types";
import { ticketMedioDe } from "./caixa";
import { chaveDeBusca } from "./custoInsumo";
import { diasEntre, rotuloDia } from "./datas";
import { formatarMoeda } from "./money";
import { telefoneParaWhatsApp } from "./whatsapp";

/** O que a ordem da tela precisa saber de uma cliente. */
export type ClienteOrdenavel = Pick<
  Cliente,
  "nomeBusca" | "totalPedidos" | "totalGasto"
> & {
  /** Um `Timestamp`: o domínio não o importa, só chama `toMillis`. */
  ultimoPedidoEm?: { toMillis(): number };
};

/**
 * Quem mais deixou dinheiro no caixa primeiro. Empate por pedidos pagos, depois
 * por nome; quem nunca pagou um pedido vai para o fim, por nome (`#d137`).
 */
export function ordenarPorGasto<C extends ClienteOrdenavel>(
  clientes: C[],
): C[] {
  return [...clientes].sort(
    (a, b) =>
      b.totalGasto - a.totalGasto ||
      b.totalPedidos - a.totalPedidos ||
      a.nomeBusca.localeCompare(b.nomeBusca),
  );
}

/** As ordens da lista (`#d310`). "GASTO" é a de sempre (`#d137`). */
export type OrdemClientes = "GASTO" | "RECENTE" | "PARADA" | "NOME";

/**
 * A lista na ordem escolhida (`#d310`). Quem nunca pagou um pedido não tem
 * "último pedido" que conte (`ultimoPedidoEm` fica no desfazer, `#d37`): vai
 * para o fim, por nome, em "RECENTE" e "PARADA". Pedido pago sem a data conta
 * como parada desde sempre, como em `momentoDaCliente`.
 */
export function ordenarClientes<C extends ClienteOrdenavel>(
  clientes: C[],
  ordem: OrdemClientes,
): C[] {
  if (ordem === "GASTO") return ordenarPorGasto(clientes);
  const porNome = (a: C, b: C) => a.nomeBusca.localeCompare(b.nomeBusca);
  if (ordem === "NOME") return [...clientes].sort(porNome);
  const semPedido = (c: C) => (c.totalPedidos <= 0 ? 1 : 0);
  const ms = (c: C) => c.ultimoPedidoEm?.toMillis() ?? -Infinity;
  // Comparação, e não subtração: `-Infinity - -Infinity` é `NaN`.
  const antes = (x: number, y: number) => (x === y ? 0 : x < y ? -1 : 1);
  return [...clientes].sort(
    (a, b) =>
      semPedido(a) - semPedido(b) ||
      (semPedido(a)
        ? 0
        : ordem === "RECENTE"
          ? antes(ms(b), ms(a))
          : antes(ms(a), ms(b))) ||
      porNome(a, b),
  );
}

/**
 * Nome, Instagram e telefone, em memória (`#d310`). Com 4 dígitos ou mais no
 * termo, os dígitos dele contra os do telefone: "98713" acha "81 98713-8356".
 */
export function filtrarClientes<
  C extends Pick<Cliente, "nomeBusca" | "telefone" | "instagram">,
>(clientes: C[], busca: string): C[] {
  const termo = chaveDeBusca(busca);
  if (!termo) return clientes;
  const semArroba = termo.replace(/^@/, "");
  const digitos = busca.replace(/\D/g, "");
  return clientes.filter(
    (cliente) =>
      cliente.nomeBusca.includes(termo) ||
      (!!semArroba &&
        chaveDeBusca(cliente.instagram ?? "").includes(semArroba)) ||
      (digitos.length >= 4 &&
        (cliente.telefone ?? "").replace(/\D/g, "").includes(digitos)),
  );
}

/**
 * O telefone para ler (`#d310`): com 10 ou 11 dígitos depois da limpeza de
 * `telefoneParaWhatsApp`, "(81) 99913-7502" ou "(81) 3222-1234"; o resto
 * como foi digitado. Só leitura: o documento continua como ela escreveu.
 */
export function telefoneParaLer(telefone: string | undefined): string {
  const numero = telefoneParaWhatsApp(telefone);
  if (!numero) return (telefone ?? "").trim();
  const local = numero.slice(2);
  return `(${local.slice(0, 2)}) ${local.slice(2, -4)}-${local.slice(-4)}`;
}

/** O usuário do Instagram com o "@", do jeito que `instagramParaLink` o acha. */
export function instagramParaLer(usuario: string | undefined): string {
  const nome = usuarioDoInstagram(usuario);
  return nome ? `@${nome}` : (usuario ?? "").trim();
}

/**
 * "3 pedidos pagos · R$ 40,00 em média · último em 12 de ago.", ou "ainda sem
 * pedido pago". Conta o que entrou no caixa, como o painel do mês (`#d36`).
 * Com um pedido só, a média é o total e não se repete.
 */
export function resumoDaCliente(
  cliente: Pick<Cliente, "totalPedidos" | "ticketMedio">,
  ultimoPedidoISO: DataISO | null,
): string {
  if (cliente.totalPedidos <= 0) return "ainda sem pedido pago";
  const partes = [
    cliente.totalPedidos === 1
      ? "1 pedido pago"
      : `${cliente.totalPedidos} pedidos pagos`,
  ];
  if (cliente.totalPedidos > 1) {
    partes.push(`${formatarMoeda(cliente.ticketMedio)} em média`);
  }
  if (ultimoPedidoISO) partes.push(`último em ${rotuloDia(ultimoPedidoISO)}`);
  return partes.join(" · ");
}

/** A partir de quantos dias sem pedido pago a cliente parou (`#d309`). */
export const DIAS_SEM_PEDIR = 30;

/**
 * Onde a cliente está, só pelos agregados do documento (`#d309`). Toda cliente
 * cai em exatamente um. `ultimoPedidoEm` é a data do **pagamento** e não volta
 * no desfazer (`#d37`), e o momento herda isso.
 */
export type MomentoDaCliente =
  "voltam" | "novas" | "sumiram" | "uma-vez" | "sem-pedido";

/** Dias desde o último pedido pago, nunca negativo; `null` sem a data. */
export function diasSemPedir(
  ultimoPedidoISO: DataISO | null,
  hoje: DataISO,
): number | null {
  return ultimoPedidoISO ? Math.max(0, diasEntre(ultimoPedidoISO, hoje)) : null;
}

export function momentoDaCliente(
  cliente: Pick<Cliente, "totalPedidos">,
  ultimoPedidoISO: DataISO | null,
  hoje: DataISO,
): MomentoDaCliente {
  if (cliente.totalPedidos <= 0) return "sem-pedido";
  // Pedido pago sem a data não diz que foi recente: conta como parada.
  const dias = diasSemPedir(ultimoPedidoISO, hoje) ?? Infinity;
  const recente = dias < DIAS_SEM_PEDIR;
  if (cliente.totalPedidos === 1) return recente ? "novas" : "uma-vez";
  return recente ? "voltam" : "sumiram";
}

/** Quantos dias a cliente chamada fica fora da vista de chamar (`#d312`). */
export const DIAS_DEPOIS_DE_CHAMAR = 14;

/** Até quantos dias depois da chamada o pedido pago conta como volta. */
export const DIAS_PARA_VOLTAR = 30;

/** De quantos dias para trás são as chamadas da frase do topo. */
export const DIAS_DA_CONTA_DE_CHAMADAS = 60;

/**
 * Dias desde a chamada enquanto ela está em silêncio (`#d312`): parada (Sumiram
 * ou Uma vez só) e chamada há menos de `DIAS_DEPOIS_DE_CHAMAR`. `null` fora
 * disso, e a cliente volta à vista com o "Chamar".
 */
export function silencioDaChamada(
  momento: MomentoDaCliente,
  chamadaISO: DataISO | null,
  hoje: DataISO,
): number | null {
  if (!chamadaISO || (momento !== "sumiram" && momento !== "uma-vez")) {
    return null;
  }
  const dias = Math.max(0, diasEntre(chamadaISO, hoje));
  return dias < DIAS_DEPOIS_DE_CHAMAR ? dias : null;
}

/**
 * Voltou (`#d312`): pagou um pedido no dia da chamada ou depois, até
 * `DIAS_PARA_VOLTAR` dias. `ultimoPedidoEm` é o dia do pagamento à meia-noite
 * (`dataDeISO`), por isso a conta é em dias: pago no mesmo dia da chamada
 * conta, porque só se chama quem estava parada há 30 dias ou mais.
 */
export function voltouDepoisDeChamar(
  cliente: Pick<Cliente, "totalPedidos">,
  chamadaISO: DataISO | null,
  ultimoPedidoISO: DataISO | null,
): boolean {
  if (cliente.totalPedidos <= 0 || !chamadaISO || !ultimoPedidoISO) {
    return false;
  }
  const dias = diasEntre(chamadaISO, ultimoPedidoISO);
  return dias >= 0 && dias <= DIAS_PARA_VOLTAR;
}

/**
 * "Das 8 que você chamou, 3 voltaram." (`#d312`): as chamadas dos últimos
 * `DIAS_DA_CONTA_DE_CHAMADAS` dias e quantas delas voltaram.
 */
export function retornoDasChamadas(
  clientes: {
    totalPedidos: number;
    chamadaISO: DataISO | null;
    ultimoPedidoISO: DataISO | null;
  }[],
  hoje: DataISO,
): { chamadas: number; voltaram: number } {
  let chamadas = 0;
  let voltaram = 0;
  for (const cliente of clientes) {
    if (!cliente.chamadaISO) continue;
    if (diasEntre(cliente.chamadaISO, hoje) >= DIAS_DA_CONTA_DE_CHAMADAS) {
      continue;
    }
    chamadas++;
    if (
      voltouDepoisDeChamar(cliente, cliente.chamadaISO, cliente.ultimoPedidoISO)
    ) {
      voltaram++;
    }
  }
  return { chamadas, voltaram };
}

/**
 * Outras clientes vivas que podem ser ela (`#d311`): o mesmo telefone, lido
 * por `telefoneParaLer`, ou o mesmo `nomeBusca`.
 */
export function possiveisDuplicadas<
  C extends Pick<Cliente, "id" | "nomeBusca" | "telefone" | "arquivado">,
>(cliente: C, clientes: C[]): C[] {
  const telefone = telefoneParaLer(cliente.telefone);
  return clientes.filter(
    (outra) =>
      outra.id !== cliente.id &&
      !outra.arquivado &&
      (outra.nomeBusca === cliente.nomeBusca ||
        (!!telefone && telefoneParaLer(outra.telefone) === telefone)),
  );
}

type Agregados = Pick<Cliente, "totalPedidos" | "totalGasto" | "ticketMedio">;

/**
 * Os números das duas numa só (`#d311`): pedidos e gasto somam, a média sai
 * da soma, e o último pedido é o mais recente das duas.
 */
export function juntarAgregados<
  T extends { toMillis(): number },
  C extends Agregados & { ultimoPedidoEm?: T },
>(fica: C, sai: C): Agregados & { ultimoPedidoEm?: T } {
  const totalPedidos = fica.totalPedidos + sai.totalPedidos;
  const totalGasto = fica.totalGasto + sai.totalGasto;
  const ultimos = [fica.ultimoPedidoEm, sai.ultimoPedidoEm].filter(
    (data): data is T => !!data,
  );
  const ultimoPedidoEm = ultimos.sort((a, b) => b.toMillis() - a.toMillis())[0];
  return {
    totalPedidos,
    totalGasto,
    ticketMedio: ticketMedioDe(totalGasto, totalPedidos),
    ...(ultimoPedidoEm ? { ultimoPedidoEm } : {}),
  };
}

type Contato = Pick<
  Cliente,
  "telefone" | "instagram" | "endereco" | "observacoes"
>;

/**
 * O que a que fica ganha da outra (`#d311`): telefone, Instagram e endereço
 * vazios são preenchidos, os preenchidos não mudam; observações nas duas vão
 * juntas, uma por linha. Só os campos que mudam.
 */
export function contatoJuntado(fica: Contato, sai: Contato): Contato {
  const novo: Contato = {};
  for (const campo of ["telefone", "instagram", "endereco"] as const) {
    const delas = sai[campo]?.trim();
    if (!fica[campo]?.trim() && delas) novo[campo] = delas;
  }
  const obs = [fica.observacoes?.trim(), sai.observacoes?.trim()];
  if (obs[1] && obs[1] !== obs[0]) {
    novo.observacoes = obs[0] ? `${obs[0]}\n${obs[1]}` : obs[1];
  }
  return novo;
}

/**
 * A observação fala de alergia: "Alérgica a amendoim", "ALERGIA", "alergico"
 * (`#d308`). A ficha da cliente passa a faixa de informativa para atenção.
 */
export function temAlergia(observacoes: string | undefined): boolean {
  return chaveDeBusca(observacoes ?? "").includes("alerg");
}

/**
 * O perfil dela no Instagram, do jeito que o campo foi escrito: "@ana.doces",
 * "ana.doces" ou o link colado. `null` quando não dá para ser um usuário: o
 * botão não aparece em vez de abrir uma página que não existe.
 */
export function instagramParaLink(usuario: string | undefined): string | null {
  const nome = usuarioDoInstagram(usuario);
  return nome ? `https://instagram.com/${nome}` : null;
}

function usuarioDoInstagram(usuario: string | undefined): string | null {
  const nome = (usuario ?? "")
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(nome) ? nome : null;
}
