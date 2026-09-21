/**
 * A purga de conta encerrada — a única exceção nomeada ao "nunca apagar
 * documento" (`CLAUDE.md`, `DECISOES.md#d148`). Roda à mão, dentro do prazo
 * que `/privacidade` promete.
 *
 *   npm run encerrar-conta -- <contaId>              # ensaio: diz o que apagaria e sai
 *   npm run encerrar-conta -- <contaId> --confirmo   # apaga
 *
 * Recusa qualquer conta cujo `status` não seja `"ENCERRADA"` — é a única
 * guarda que importa, e é a que torna impossível apagar `contas/mycookies`
 * por engano: uma conta viva não tem esse valor, e nenhum script o escreve.
 *
 * Não toca no Stripe: a assinatura já foi cancelada no toque de
 * `/api/conta/encerrar`, e o `Customer` fica lá — é registro fiscal deles.
 */
import { auth, db, semCredencial } from "./admin.mjs";

/** Repetido de `src/lib/domain/meusDados.ts`: o script roda fora do app e não
 * importa TypeScript. */
const DIAS_ATE_A_PURGA = 30;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

const USO = "Uso: npm run encerrar-conta -- <contaId> [--confirmo]";

const argumentos = process.argv.slice(2);
const confirmo = argumentos.includes("--confirmo");
const [contaId] = argumentos.filter((arg) => arg !== "--confirmo");

if (!contaId) {
  console.error(USO);
  process.exit(1);
}

/** contaId → o mapa de quem ainda tem a chave na claim `contas`. */
async function loginsComAConta(contaId) {
  const encontrados = [];
  let proximo;
  do {
    const pagina = await auth.listUsers(1000, proximo);
    for (const usuario of pagina.users) {
      const contas = usuario.customClaims?.contas ?? {};
      if (contaId in contas) encontrados.push(usuario);
    }
    proximo = pagina.pageToken;
  } while (proximo);
  return encontrados;
}

try {
  const referencia = db.doc(`contas/${contaId}`);
  const snap = await referencia.get();

  if (!snap.exists) {
    console.error(`Conta "${contaId}" não existe.`);
    process.exit(1);
  }

  const conta = snap.data();
  if (conta.status !== "ENCERRADA") {
    console.error(
      `Conta "${contaId}" não está encerrada (status: ${conta.status ?? "ausente"}).\n` +
        'Só uma conta que passou por "Encerrar minha conta" no app pode ser purgada.',
    );
    process.exit(1);
  }

  const encerradaEm = conta.encerradaEm?.toDate() ?? null;
  const diasEncerrada = encerradaEm
    ? Math.floor((Date.now() - encerradaEm.getTime()) / MS_POR_DIA)
    : null;

  console.log(`Conta: ${contaId} · ${conta.nome}`);
  console.log(
    encerradaEm
      ? `Encerrada em ${encerradaEm.toISOString().slice(0, 10)}, há ${diasEncerrada} dias.`
      : "Encerrada, sem data registrada.",
  );
  if (diasEncerrada != null && diasEncerrada > DIAS_ATE_A_PURGA) {
    console.warn(
      `Atenção: o prazo de ${DIAS_ATE_A_PURGA} dias que a política de privacidade promete já venceu.`,
    );
  }

  const colecoes = await referencia.listCollections();
  console.log("Coleções:");
  for (const colecao of colecoes) {
    const contagem = (await colecao.count().get()).data().count;
    console.log(`  ${colecao.id}: ${contagem}`);
  }

  const logins = await loginsComAConta(contaId);
  if (logins.length === 0) {
    console.log(
      "Nenhum login com esta conta na claim (já foi removida ao encerrar).",
    );
  } else {
    for (const usuario of logins) {
      console.log(`Login: ${usuario.email} (${usuario.uid})`);
    }
    if (logins.some((u) => u.uid !== conta.encerradaPor)) {
      console.warn(
        "Atenção: algum login além de quem encerrou ainda tem esta conta na claim.",
      );
    }
  }

  if (!confirmo) {
    console.log("\nNada foi apagado. Repita com --confirmo.");
    process.exit(0);
  }

  await db.recursiveDelete(referencia);
  console.log(`Documento e subcoleções de "${contaId}" apagados.`);

  for (const usuario of logins) {
    const contas = { ...(usuario.customClaims?.contas ?? {}) };
    delete contas[contaId];
    if (Object.keys(contas).length === 0) {
      await auth.deleteUser(usuario.uid);
      console.log(
        `Login ${usuario.email} apagado (sem outra conta vinculada).`,
      );
    } else {
      const acessoAte = { ...(usuario.customClaims?.acessoAte ?? {}) };
      delete acessoAte[contaId];
      await auth.setCustomUserClaims(usuario.uid, {
        ...usuario.customClaims,
        contas,
        acessoAte,
      });
      console.log(`Login ${usuario.email} mantido: ainda tem outra conta.`);
    }
  }

  console.log("Purga concluída.");
} catch (erro) {
  console.error("Não foi possível purgar a conta:", erro.message);

  if (semCredencial) {
    console.error(
      "\nNenhuma credencial encontrada. Preencha GOOGLE_APPLICATION_CREDENTIALS\n" +
        "no .env.local, ou rode `gcloud auth application-default login`.",
    );
  }

  process.exit(1);
}
