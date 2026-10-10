import { Timestamp } from "firebase-admin/firestore";
import type { AvisoDePedidoNovo } from "@/lib/domain/cardapio";
import { adminDb, adminMessaging } from "@/lib/server/firebaseAdmin";
import { caminhos, VERSAO_SCHEMA } from "@/lib/types";

/** O FCM diz que o token não serve mais: o aparelho desligou ou desinstalou. */
const TOKEN_MORTO = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

/**
 * Toca os aparelhos ativos da conta (spec 119, `#d323`). Roda no `after` do
 * handler do cardápio: o pedido já foi gravado e respondido, e nada aqui o
 * atrasa nem o derruba. Erro vai para o log e para.
 *
 * Só `data`, sem `notification`: quem desenha é o `sw.ts`, que também decide
 * entre a notificação e a faixa do app aberto.
 */
export async function avisarAparelhos(
  contaId: string,
  aviso: AvisoDePedidoNovo,
): Promise<void> {
  try {
    const ativos = await adminDb()
      .collection(caminhos.aparelhos(contaId))
      .where("ativo", "==", true)
      .get();
    if (ativos.empty) return;

    const resposta = await adminMessaging().sendEach(
      ativos.docs.map((aparelho) => ({
        token: aparelho.get("token") as string,
        data: { ...aviso },
        webpush: { headers: { Urgency: "high" } },
      })),
    );

    const agora = Timestamp.now();
    await Promise.all(
      resposta.responses.map((enviado, indice) => {
        const codigo = enviado.error?.code;
        if (!codigo) return;
        if (!TOKEN_MORTO.has(codigo)) {
          console.error("Aviso de pedido não saiu", codigo);
          return;
        }
        return ativos.docs[indice]!.ref.update({
          ativo: false,
          atualizadoEm: agora,
          v: VERSAO_SCHEMA,
        });
      }),
    );
  } catch (erro) {
    console.error("Aviso de pedido não saiu", erro);
  }
}
