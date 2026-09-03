import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, CloudOff, Download, ScanLine } from "lucide-react";
import { Selo } from "@/components/ui/Selo";

/**
 * O comportamento mais surpreendente do produto, e o único sem tela própria.
 *
 * Sem superfície de propósito: quatro caixas iguais depois de duas listas
 * emolduradas viraria grade de cartões, e esta seção é texto corrido com um
 * ícone por parágrafo. O respiro entre os quatro é o que os separa.
 */
export function QuandoNaoTemInternet() {
  return (
    <div className="space-y-5">
      <Fala icone={Check} titulo="Quase tudo continua funcionando">
        Cadastrar insumo, montar ficha, anotar encomenda, marcar como paga,
        lançar no caixa e marcar item no mercado funcionam sem sinal nenhum.
        Nada fica preso em &ldquo;salvando&rdquo;: o número aparece no toque, e
        sobe sozinho quando a internet voltar.
      </Fala>

      <Fala icone={CloudOff} titulo="O selo é aviso, e não erro">
        Quando o sinal cai, este selo aparece no alto da tela:
        <span className="mt-2 flex">
          <Selo
            tom="atencao"
            icone={<CloudOff aria-hidden className="size-3.5" />}
          >
            Sem conexão, salvando no aparelho
          </Selo>
        </span>
        <span className="mt-2 block">
          Ele diz que o que você acabou de escrever está guardado aqui no
          aparelho e ainda não subiu. Não lance de novo: quando o sinal voltar,
          o que ficou na fila sobe sem você fazer nada.
        </span>
      </Fala>

      <Fala
        icone={ScanLine}
        titulo="A leitura da nota é a única que exige rede"
      >
        A foto precisa ser lida fora do aparelho, e por isso essa tela é a única
        exceção do sistema. Sem internet, o botão de ler a nota aparece
        desligado e diz o motivo, e o cadastro na mão continua ali do lado.
      </Fala>

      <Fala icone={Download} titulo="A tela que você nunca abriu">
        O aplicativo guarda as telas por onde você já passou. Uma tela aberta
        pela primeira vez sem sinal mostra um aviso no lugar do conteúdo — abra
        ela uma vez com internet, e ela passa a funcionar offline também.
      </Fala>
    </div>
  );
}

function Fala({
  icone: Icone,
  titulo,
  children,
}: {
  icone: LucideIcon;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icone
        aria-hidden
        className="mt-0.5 size-5 shrink-0 text-ink-muted"
        strokeWidth={1.75}
      />
      <div className="min-w-0">
        <h3 className="text-body font-semibold text-ink">{titulo}</h3>
        <p className="mt-1 max-w-[62ch] text-label text-ink-muted">
          {children}
        </p>
      </div>
    </div>
  );
}
