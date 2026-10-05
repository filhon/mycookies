"use client";

import { useId, useState, type ReactNode } from "react";
import { Calculator } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { formatarMoeda, parseParaNumero } from "@/lib/domain/money";
import type { Centavos } from "@/lib/types";

export interface CampoDaConta<K extends string> {
  chave: K;
  rotulo: string;
  /** Moeda vira centavos; número é o que ela digita, lido com vírgula. */
  tipo: "moeda" | "numero";
  sufixo?: string;
  dica?: ReactNode;
}

/**
 * "Fazer a conta" sob um campo (`#d286`): campos efêmeros, a frase do
 * resultado e "Usar", que preenche o campo de sempre e fecha. Nada daqui é
 * gravado: fechar desmonta, e o que ela digitou vai junto.
 *
 * `calcular` e `frase` recebem os valores pela `chave` de cada campo, moeda em
 * centavos. `calcular` devolve `null` quando não há divisor, e aí não há
 * "Usar".
 */
export function FazerAConta<K extends string>({
  campos,
  calcular,
  frase,
  aoUsar,
}: {
  campos: CampoDaConta<K>[];
  calcular: (valores: Record<K, number>) => Centavos | null;
  frase: (valores: Record<K, number>, resultado: Centavos | null) => ReactNode;
  aoUsar: (centavos: Centavos) => void;
}) {
  const [aberta, setAberta] = useState(false);
  const id = useId();

  return (
    <div>
      <Botao
        variante="terciaria"
        tamanho="sm"
        aria-expanded={aberta}
        aria-controls={id}
        onClick={() => setAberta((antes) => !antes)}
        iconeInicial={
          <Calculator aria-hidden className="size-4" strokeWidth={1.75} />
        }
        className="-ml-3"
      >
        Fazer a conta
      </Botao>
      {aberta && (
        <Conta
          id={id}
          campos={campos}
          calcular={calcular}
          frase={frase}
          aoUsar={(centavos) => {
            aoUsar(centavos);
            setAberta(false);
          }}
        />
      )}
    </div>
  );
}

function Conta<K extends string>({
  id,
  campos,
  calcular,
  frase,
  aoUsar,
}: {
  id: string;
  campos: CampoDaConta<K>[];
  calcular: (valores: Record<K, number>) => Centavos | null;
  frase: (valores: Record<K, number>, resultado: Centavos | null) => ReactNode;
  aoUsar: (centavos: Centavos) => void;
}) {
  // Moeda guarda centavos; número guarda o texto, porque "1," é estado
  // legítimo do teclado.
  const [entradas, setEntradas] = useState<(number | string)[]>(() =>
    campos.map((campo) => (campo.tipo === "moeda" ? 0 : "")),
  );
  const valores = Object.fromEntries(
    campos.map((campo, i) => {
      const entrada = entradas[i] ?? "";
      return [
        campo.chave,
        typeof entrada === "number" ? entrada : parseParaNumero(entrada),
      ];
    }),
  ) as Record<K, number>;
  const resultado = calcular(valores);

  function mudar(indice: number, valor: number | string) {
    setEntradas((antes) =>
      antes.map((entrada, i) => (i === indice ? valor : entrada)),
    );
  }

  return (
    <div id={id} className="mt-2 space-y-3 rounded-md border border-line p-3">
      {campos.map((campo, indice) =>
        campo.tipo === "moeda" ? (
          <CampoMoeda
            key={campo.chave}
            rotulo={campo.rotulo}
            dica={campo.dica}
            valor={entradas[indice] as number}
            aoMudar={(centavos) => mudar(indice, centavos)}
          />
        ) : (
          <Campo
            key={campo.chave}
            rotulo={campo.rotulo}
            dica={campo.dica}
            inputMode="decimal"
            sufixo={campo.sufixo}
            value={entradas[indice] as string}
            onChange={(evento) => mudar(indice, evento.target.value)}
          />
        ),
      )}

      <p aria-live="polite" className="text-label text-ink-muted">
        {frase(valores, resultado)}
      </p>

      {/* Zero vem do campo vazio, não da conta: não há o que usar. */}
      {resultado !== null && resultado > 0 && (
        <Botao tamanho="sm" onClick={() => aoUsar(resultado)}>
          Usar {formatarMoeda(resultado)}
        </Botao>
      )}
    </div>
  );
}
