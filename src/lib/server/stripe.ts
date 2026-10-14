import { Timestamp } from "firebase-admin/firestore";
import Stripe from "stripe";
import {
  acessoAteDaAssinatura,
  pacoteDaMetadata,
  RECURSOS_DO_PACOTE,
  type Periodo,
} from "@/lib/domain/assinatura";
import {
  caminhos,
  VERSAO_SCHEMA,
  type Centavos,
  type Conta,
  type Pacote,
} from "@/lib/types";
import { adminAuth, adminDb, tirarContaDaClaim } from "./firebaseAdmin";

/**
 * O Stripe do lado do servidor, ao lado de `firebaseAdmin.ts`.
 *
 * Nada aqui entra no pacote do cliente: só `src/lib/server/` e
 * `src/app/api/` importam este arquivo, nem `Stripe.js` — o checkout e o
 * portal são uma URL para onde o navegador vai (`DECISOES.md#d146`).
 */

function chaveSecreta(): string | undefined {
  return process.env.STRIPE_SECRET_KEY?.trim() || undefined;
}

/**
 * Vazio quando a variável de ambiente não está configurada. O essencial fica
 * nas variáveis da 028; o completo nas da 032. Serve ao checkout e à tela de
 * preços: quem decide o pacote de uma assinatura é o produto, não o preço
 * (`DECISOES.md#d169`).
 */
export const PRECOS: Record<Pacote, Record<Periodo, string>> = {
  ESSENCIAL: {
    mensal: process.env.STRIPE_PRICE_MENSAL?.trim() ?? "",
    anual: process.env.STRIPE_PRICE_ANUAL?.trim() ?? "",
  },
  COMPLETO: {
    mensal: process.env.STRIPE_PRICE_COMPLETO_MENSAL?.trim() ?? "",
    anual: process.env.STRIPE_PRICE_COMPLETO_ANUAL?.trim() ?? "",
  },
};

/**
 * Chave secreta e os quatro preços — o mínimo para checkout e webhook
 * existirem. Meio catálogo venderia um pacote e daria erro no outro.
 */
export function stripeDisponivel(): boolean {
  return (
    !!chaveSecreta() &&
    Object.values(PRECOS).every((periodos) =>
      Object.values(periodos).every(Boolean),
    )
  );
}

let instancia: Stripe | undefined;

/** Singleton, como `adminAuth()`/`adminDb()`. */
export function stripe(): Stripe {
  if (!instancia) {
    const chave = chaveSecreta();
    if (!chave) throw new Error("Servidor sem STRIPE_SECRET_KEY.");
    instancia = new Stripe(chave);
  }
  return instancia;
}

/** Cache por instância, como o CNPJ de `/api/nota` (`DECISOES.md#d52`). */
const CACHE = new Map<string, { centavos: Centavos; ate: number }>();
const VALIDADE_MS = 60 * 60 * 1000;

async function precoDe(pacote: Pacote, periodo: Periodo): Promise<Centavos> {
  const chave = `${pacote}:${periodo}`;
  const guardado = CACHE.get(chave);
  if (guardado && guardado.ate > Date.now()) return guardado.centavos;

  const preco = await stripe().prices.retrieve(PRECOS[pacote][periodo]);
  const centavos = preco.unit_amount ?? 0;
  CACHE.set(chave, { centavos, ate: Date.now() + VALIDADE_MS });
  return centavos;
}

async function precosDe(pacote: Pacote) {
  const [mensal, anual] = await Promise.all([
    precoDe(pacote, "mensal"),
    precoDe(pacote, "anual"),
  ]);
  return { mensal, anual };
}

/**
 * Os quatro preços, lidos do Stripe: o preço mora lá e em lugar nenhum do
 * código (roadmap §7). Quem chama confere `stripeDisponivel()` antes; lida por
 * `/api/assinatura/precos` e pela página de venda (`DECISOES.md#d174`).
 */
export async function lerPrecos(): Promise<
  Record<Pacote, { mensal: Centavos; anual: Centavos }>
> {
  const [ESSENCIAL, COMPLETO] = await Promise.all([
    precosDe("ESSENCIAL"),
    precosDe("COMPLETO"),
  ]);
  return { ESSENCIAL, COMPLETO };
}

/**
 * Grava a claim inteira preservando o que não é desta conta.
 *
 * A única função que renova `acessoAte` depois do cadastro e do convite: o
 * webhook do Stripe a chama para a dona e para cada ajudante ativa
 * (`DECISOES.md#d144`, `#d145`, `#d155`).
 */
export async function escreverAcessoAte(
  uid: string,
  contaId: string,
  ateMs: number,
): Promise<void> {
  const auth = adminAuth();
  const usuario = await auth.getUser(uid);
  const claims = usuario.customClaims ?? {};
  const acessoAte = (claims.acessoAte ?? {}) as Record<string, number>;

  await auth.setCustomUserClaims(uid, {
    ...claims,
    acessoAte: { ...acessoAte, [contaId]: ateMs },
  });
}

/**
 * Relê a assinatura no Stripe e grava a claim e o documento da conta. Dois
 * chamadores: o webhook e a volta do checkout (`/api/assinatura/confirmar`,
 * spec 163), a recomendação do Stripe de atender pelos dois.
 *
 * **Não confia no evento.** Os três eventos de assinatura podem chegar fora
 * de ordem, e um `updated` velho depois de um `deleted` reabriria uma conta
 * cancelada. Por isso relê o estado atual no Stripe (`#d145`).
 *
 * **Idempotente.** Os dois chamadores rodando ao mesmo tempo releem o mesmo
 * estado e gravam o mesmo número; tirar uma ajudante duas vezes dá no mesmo
 * (`removidaEm` regravado, claim já sem a conta).
 *
 * Desde a 032 grava também o pacote: assinatura viva de pacote sem ajudante
 * tira as ajudantes (`#d170`). Assinatura sem `contaId`/`uid` na metadata, ou
 * sem item, não é nossa: nada a fazer.
 */
export async function sincronizarAssinatura(id: string): Promise<void> {
  const assinatura = await stripe().subscriptions.retrieve(id, {
    expand: ["items.data.price.product"],
  });
  const { contaId, uid } = assinatura.metadata;
  if (!contaId || !uid) return;

  const item = assinatura.items.data[0];
  if (!item) return;

  const documento = adminDb().doc(caminhos.conta(contaId));
  const conta = (await documento.get()).data() as Conta | undefined;
  const ateMs = acessoAteDaAssinatura({
    status: assinatura.status,
    periodoInicioMs: item.current_period_start * 1000,
    periodoFimMs: item.current_period_end * 1000,
    trialAteMs: conta?.trialAte?.toMillis(),
    agoraMs: Date.now(),
  });

  // O pacote vem do produto, e não do id do preço: preço muda criando um
  // `Price` novo no mesmo produto. Desconhecido é essencial (#d169).
  const produto = item.price.product;
  const pacote = pacoteDaMetadata(
    typeof produto === "object" && !produto.deleted
      ? produto.metadata.pacote
      : undefined,
  );
  // Só a assinatura viva tira ajudante; cancelada ou sem pagamento suspende,
  // como antes, e a ajudante volta sozinha se a dona voltar a pagar (#d170).
  const viva = ["active", "trialing", "past_due"].includes(assinatura.status);
  const ficam = !viva || RECURSOS_DO_PACOTE[pacote].includes("ajudante");

  // A dona (metadata) e as ajudantes: renovar a assinatura renova a claim de
  // todo mundo que escreve na conta (`DECISOES.md#d155`). Sem laço, a ajudante
  // para de salvar no dia em que o teste original venceria, numa conta em dia.
  // Sem `where`: campo ausente não casa com `== null`, e são até cinco
  // documentos. Sequencial: o Stripe repete o webhook se ele cair, e quem já
  // foi tirada tem `removidaEm` e não entra de novo.
  const membros = await adminDb().collection(caminhos.membros(contaId)).get();
  const ativas = membros.docs.filter((d) => !d.get("removidaEm"));

  // Claim antes do documento (#d145). A dona sempre; as ajudantes, se ficam.
  await escreverAcessoAte(uid, contaId, ateMs);
  for (const membro of ativas) {
    if (ficam) {
      await escreverAcessoAte(membro.id, contaId, ateMs);
    } else {
      // O DELETE de /api/conta/membros, disparado pelo Stripe (#d170).
      await tirarContaDaClaim(membro.id, contaId);
      await membro.ref.set(
        { removidaEm: Timestamp.now(), v: VERSAO_SCHEMA },
        { merge: true },
      );
    }
  }
  await documento.set(
    {
      plano: "ASSINATURA",
      stripeCustomerId:
        typeof assinatura.customer === "string"
          ? assinatura.customer
          : assinatura.customer.id,
      stripeSubscriptionId: assinatura.id,
      assinaturaAte: Timestamp.fromMillis(ateMs),
      pacote,
      v: VERSAO_SCHEMA,
    },
    { merge: true },
  );
}
