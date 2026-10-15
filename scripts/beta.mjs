/**
 * O beta por convite (spec 181), para quem conduz o projeto.
 *
 *   npm run beta                            a fase, as vagas e a árvore das fundadoras
 *   npm run beta -- semear <contaId> [cota] dá a cota (5) e, sem número, a próxima vaga
 *   npm run beta -- vagas <n>               muda o teto, nunca abaixo das ocupadas
 *   npm run beta -- tirar-da-espera <email> apaga a entrada dela da lista (spec 182)
 *
 * Os caminhos e o padrão de `plataforma/beta` estão repetidos aqui de
 * propósito, como em `conceder-acesso.mjs`: o script roda fora do app e não
 * importa `src/lib/types` nem `src/lib/server/beta.ts`. Se mudar lá, muda aqui.
 * O id da lista é o de `idDaEspera` (`src/lib/domain/listaDeEspera.ts`).
 */
import { createHash } from "node:crypto";
import { db, semCredencial } from "./admin.mjs";

const PLATAFORMA_BETA = "plataforma/beta";
const LISTA_DE_ESPERA = "listaDeEspera";
/** `BETA_PADRAO` de `src/lib/server/beta.ts`. */
const PADRAO = {
  fase: "BETA",
  vagas: 100,
  ocupadas: 0,
  espera: 0,
  pesquisas: 0,
  v: 1,
};
/** `CONVITES_POR_FUNDADORA` de `src/lib/domain/convite.ts`. */
const COTA = 5;

const USO =
  "Uso: npm run beta\n" +
  "     npm run beta -- semear <contaId> [cota]\n" +
  "     npm run beta -- vagas <n>\n" +
  "     npm run beta -- tirar-da-espera <email>";

const MS_POR_DIA = 24 * 60 * 60 * 1000;
/** Brasília não tem horário de verão desde 2019. */
const FUSO_MS = 3 * 60 * 60 * 1000;

/** A meia-noite de hoje em Brasília, para contar quem entrou hoje (a cota do Resend). */
function inicioDeHoje() {
  const dia = Math.floor((Date.now() - FUSO_MS) / MS_POR_DIA);
  return new Date(dia * MS_POR_DIA + FUSO_MS);
}

/** `normalizarEmail` e `idDaEspera` do app, repetidos. */
function idDaEspera(email) {
  const normalizado = email.replace(/\s/g, "").toLowerCase();
  return createHash("sha256").update(normalizado).digest("hex").slice(0, 32);
}

function inteiro(texto) {
  const n = Number(texto);
  if (!/^\d+$/.test(texto ?? "") || !Number.isSafeInteger(n)) {
    console.error(USO);
    process.exit(1);
  }
  return n;
}

/** Teste, assinante ou vencida; e as duas que não vencem nem pagam. */
function situacao(conta, agora) {
  if (conta.status === "ENCERRADA") return "encerrada";
  if (conta.assinaturaAte && conta.assinaturaAte.toMillis() > agora) {
    return "assinante";
  }
  if (!conta.trialAte && !conta.plano) return "liberada";
  if (conta.trialAte && conta.trialAte.toMillis() > agora) return "teste";
  return "vencida";
}

async function mostrar() {
  const lista = db.collection(LISTA_DE_ESPERA);
  const [plataforma, convites, fundadoras, naLista, hoje] = await Promise.all([
    db.doc(PLATAFORMA_BETA).get(),
    db.collectionGroup("convites").get(),
    db.collection("contas").orderBy("beta.fundadora").get(),
    lista.count().get(),
    lista.where("criadaEm", ">=", inicioDeHoje()).count().get(),
  ]);
  const estado = { ...PADRAO, ...plataforma.data() };
  console.log(
    `Fase ${estado.fase}${plataforma.exists ? "" : " (sem documento)"} · ` +
      `${estado.ocupadas} de ${estado.vagas} vagas · ` +
      `pesquisas ${estado.pesquisas}`,
  );
  // A posição não desce quando alguém sai: o total é a contagem, e não `espera`.
  console.log(
    `Lista de espera: ${naLista.data().count} na lista · ` +
      `${hoje.data().count} entraram hoje · última posição ${estado.espera}`,
  );

  const porStatus = { ABERTO: 0, USADO: 0, CANCELADO: 0 };
  const usadosPorDona = new Map();
  for (const convite of convites.docs) {
    const status = convite.get("status");
    porStatus[status] = (porStatus[status] ?? 0) + 1;
    if (status === "USADO") {
      const dona = convite.ref.parent.parent.id;
      usadosPorDona.set(dona, (usadosPorDona.get(dona) ?? 0) + 1);
    }
  }
  console.log(
    `Convites: ${porStatus.ABERTO} abertos · ${porStatus.USADO} usados · ` +
      `${porStatus.CANCELADO} cancelados\n`,
  );

  if (fundadoras.empty) {
    console.log(
      "Nenhuma fundadora ainda. Semeie com `npm run beta -- semear <contaId>`.",
    );
    return;
  }
  const nomes = new Map(fundadoras.docs.map((d) => [d.id, d.get("nome")]));
  const agora = Date.now();
  console.table(
    fundadoras.docs.map((snap) => {
      const conta = snap.data();
      const quem = conta.beta.convidadaPor;
      return {
        nº: conta.beta.fundadora,
        negócio: `${snap.id} · ${conta.nome}`,
        "convidada por": quem ? (nomes.get(quem) ?? quem) : "—",
        convites: `${usadosPorDona.get(snap.id) ?? 0} de ${conta.beta.convites}`,
        dias: Math.floor((agora - conta.criadaEm.toMillis()) / MS_POR_DIA),
        situação: situacao(conta, agora),
      };
    }),
  );
}

/** A cota e, se ela ainda não tem, a próxima vaga, na mesma transação. */
async function semear(contaId, cota) {
  const plataforma = db.doc(PLATAFORMA_BETA);
  const referencia = db.doc(`contas/${contaId}`);
  const numero = await db.runTransaction(async (tx) => {
    const [estadoSnap, conta] = await Promise.all([
      tx.get(plataforma),
      tx.get(referencia),
    ]);
    if (!conta.exists) throw new Error(`A conta ${contaId} não existe.`);
    const estado = { ...PADRAO, ...estadoSnap.data() };
    const beta = conta.get("beta") ?? {};

    if (beta.fundadora) {
      tx.update(referencia, { "beta.convites": cota, v: 1 });
      return beta.fundadora;
    }
    if (estado.ocupadas >= estado.vagas) {
      throw new Error(
        `As ${estado.vagas} vagas estão ocupadas. Suba o teto com ` +
          "`npm run beta -- vagas <n>` antes.",
      );
    }
    const fundadora = estado.ocupadas + 1;
    tx.update(referencia, {
      beta: { ...beta, fundadora, convites: cota },
      v: 1,
    });
    tx.set(
      plataforma,
      { ...estado, ocupadas: fundadora, v: 1 },
      { merge: true },
    );
    return fundadora;
  });
  console.log(`${contaId}: fundadora nº ${numero}, ${cota} convites.`);
}

async function mudarVagas(vagas) {
  const plataforma = db.doc(PLATAFORMA_BETA);
  await db.runTransaction(async (tx) => {
    const estado = { ...PADRAO, ...(await tx.get(plataforma)).data() };
    if (vagas < estado.ocupadas) {
      throw new Error(
        `${estado.ocupadas} vagas já estão ocupadas: o teto não desce abaixo disso.`,
      );
    }
    tx.set(plataforma, { ...estado, vagas, v: 1 }, { merge: true });
  });
  console.log(`Teto do beta: ${vagas} vagas.`);
}

/**
 * A segunda exceção ao "nunca apagar documento" (`DECISOES.md#d403`): a lista
 * não é dado de negócio, nada a referencia, e a LGPD dá a ela o direito de
 * sair. `espera` e a posição das outras não mudam.
 */
async function tirarDaEspera(email) {
  const referencia = db.doc(`${LISTA_DE_ESPERA}/${idDaEspera(email)}`);
  const snap = await referencia.get();
  if (!snap.exists) {
    console.log("Esse e-mail não está na lista. Nada apagado.");
    return;
  }
  await referencia.delete();
  console.log(`Saiu da lista (era a posição ${snap.get("posicao")}).`);
}

const [comando, ...args] = process.argv.slice(2);

try {
  if (!comando) await mostrar();
  else if (comando === "semear" && args[0]) {
    await semear(args[0], args[1] === undefined ? COTA : inteiro(args[1]));
  } else if (comando === "vagas" && args[0]) await mudarVagas(inteiro(args[0]));
  else if (comando === "tirar-da-espera" && args[0])
    await tirarDaEspera(args[0]);
  else {
    console.error(USO);
    process.exit(1);
  }
} catch (erro) {
  console.error("Não deu:", erro.message);

  if (semCredencial) {
    console.error(
      "\nNenhuma credencial encontrada. Preencha GOOGLE_APPLICATION_CREDENTIALS\n" +
        "no .env.local, ou rode `gcloud auth application-default login`.",
    );
  }

  process.exit(1);
}
