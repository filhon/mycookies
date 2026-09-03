import { Timestamp, updateDoc } from "firebase/firestore";
import { docConta } from "../colecoes";
import { VERSAO_SCHEMA } from "@/lib/types";

/**
 * O documento da conta, escrito por dentro do aplicativo pela primeira vez.
 *
 * Até aqui `contas/{contaId}` só nascia pelo script `conceder-acesso.mjs` e só
 * era lido pelo `AuthProvider`. Nenhuma regra de segurança muda por causa
 * disto: `firestore.rules` já dá `read, write` no documento da conta a quem tem
 * a claim.
 */

/**
 * Encerra o caminho dos primeiros passos.
 *
 * Duas portas chamam esta função e as duas gravam o mesmo campo: "Concluir",
 * com os cinco feitos, e "Não preciso disto agora", disponível desde o primeiro
 * render. Ela é dona do negócio; se ela diz que não precisa, é porque não
 * precisa (`DECISOES.md#d68`).
 *
 * **Nunca `serverTimestamp()`**: ele grava `null` no cache local até a rede
 * confirmar, e um `null` aqui faria o cartão voltar à tela no instante seguinte
 * ao toque. `Timestamp.now()` é a invariante de offline do projeto.
 *
 * A tela **não espera a promessa** (`#d40`, `#d62`): o cartão some no toque e a
 * escrita fica na fila do Firestore. Chamar de novo depois de concluído apenas
 * reescreve a data, e ninguém tem por onde fazer isso — o cartão já não existe.
 */
export function concluirPrimeirosPassos(contaId: string): Promise<void> {
  return updateDoc(docConta(contaId), {
    v: VERSAO_SCHEMA,
    primeirosPassosEm: Timestamp.now(),
  });
}
