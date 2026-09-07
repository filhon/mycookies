import { MessageCircle } from "lucide-react";
import { Bloco } from "@/components/ui/Bloco";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  linkDoWhatsApp,
  mensagemDoPedido,
  telefoneParaWhatsApp,
  type ResumoParaCliente,
} from "@/lib/domain/whatsapp";

/**
 * O resumo do pedido indo para a conversa em que ele nasceu.
 *
 * A ação é um `<a>`, e não um botão: sem JavaScript, sem `window.open` para o
 * navegador bloquear, com toque longo e menu de contexto funcionando como a
 * pessoa espera (`DECISOES.md#d77`).
 *
 * O texto sai dos valores que estão na tela, e não do documento gravado
 * (`#d78`): é o mesmo total que está preso ao pé da tela naquele instante.
 *
 * O ícone é o balão genérico do lucide, que não tem marca do WhatsApp — uma
 * marca desenhada à mão dentro do nosso ícone seria pior.
 */
export function BlocoWhatsApp({
  resumo,
  telefone,
}: {
  resumo: ResumoParaCliente;
  /** O que está no campo, como ela digitou. Pode não ser discável. */
  telefone?: string;
}) {
  const numero = telefoneParaWhatsApp(telefone);
  const digitado = telefone?.trim();

  return (
    <Bloco
      icone={MessageCircle}
      titulo="Mandar o resumo pra cliente"
      descricao="Abre o WhatsApp com o pedido escrito. Você confere e envia — nada sai daqui sozinho."
    >
      {resumo.itens.length === 0 ? (
        <p className="max-w-[60ch] text-label text-ink-muted">
          Adicione o que ela pediu — o resumo precisa ter o que confirmar.
        </p>
      ) : (
        <div>
          <a
            href={linkDoWhatsApp(numero, mensagemDoPedido(resumo))}
            target="_blank"
            rel="noopener noreferrer"
            className={classesBotao({ variante: "primaria", tamanho: "lg" })}
          >
            <MessageCircle aria-hidden className="size-5" strokeWidth={1.75} />
            Abrir o WhatsApp com o resumo
          </a>

          <p className="mt-2 max-w-[60ch] text-label text-ink-muted">
            {numero ? (
              <>Abre a conversa com {digitado}.</>
            ) : digitado ? (
              // O campo é livre e ninguém validou nada até hoje: um número que
              // não dá para discar degrada, e não vira erro.
              <>
                Não dá para discar {digitado}. O WhatsApp vai perguntar para
                quem mandar.
              </>
            ) : (
              <>
                Este pedido não tem telefone. O WhatsApp vai perguntar para quem
                mandar.
              </>
            )}
          </p>
        </div>
      )}
    </Bloco>
  );
}
