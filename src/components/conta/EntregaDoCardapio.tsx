"use client";

import { useId, useRef, useState } from "react";
import { Check, CloudOff, MapPinOff, Plus, X } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import {
  esquemaEntrega,
  FAIXAS_MAXIMAS,
  limparCep,
  taxaDeEntrega,
  type MedidaDoCep,
} from "@/lib/domain/entrega";
import { chaveDeBusca } from "@/lib/domain/custoInsumo";
import { formatarMoeda, parseParaNumero } from "@/lib/domain/money";
import { salvarEntrega } from "@/lib/firebase/mutations/configuracao";
import { useConexao } from "@/lib/hooks/useDispositivo";
import type { Centavos, RegraDeEntrega } from "@/lib/types";
import { useAuth, useContaId } from "@/providers/AuthProvider";

/** Sem regra gravada, o formulário começa daqui; só grava quando ela muda algo. */
const REGRA_INICIAL: RegraDeEntrega = {
  raioKm: 5,
  faixas: [{ ateKm: 5, taxa: 0 }],
};

const KM = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const km = (valor: number) => `${KM.format(valor)} km`;
const cepComTraco = (cep: string) => `${cep.slice(0, 5)}-${cep.slice(5)}`;
const umaCasa = (valor: number) => Math.round(valor * 10) / 10;

/** A última faixa acompanha o raio (spec 118). */
function comRaio(regra: RegraDeEntrega): RegraDeEntrega {
  const ultima = regra.faixas.length - 1;
  return {
    ...regra,
    faixas: regra.faixas.map((faixa, i) =>
      i === ultima ? { ...faixa, ateKm: regra.raioKm } : faixa,
    ),
  };
}

/**
 * "Entrega" no painel "Seu cardápio" (spec 118, sessão A, `DECISOES.md#d321`):
 * de onde sai, até onde vai, quanto custa por faixa e os bairros com outro
 * preço, e o "Testar um CEP" que mostra a ela a distância e a regra que
 * decidiu. Montado só com a configuração carregada.
 *
 * O que se digita grava ao sair do campo, e o que se toca grava na hora, como
 * o resto do painel; só grava a regra que passa em `esquemaEntrega`.
 */
export function EntregaDoCardapio({
  gravada,
}: {
  gravada: RegraDeEntrega | undefined;
}) {
  const contaId = useContaId();
  const id = useId();
  const [regra, setRegra] = useState(gravada ?? REGRA_INICIAL);
  // O mais novo, para o `blur` que chega antes do novo render.
  const atual = useRef(regra);
  const ultimoGravado = useRef(JSON.stringify(gravada ?? REGRA_INICIAL));

  const validacao = esquemaEntrega.safeParse(regra);
  const problemas = validacao.success ? [] : validacao.error.issues;
  const problemaEm = (...caminho: (string | number)[]) =>
    problemas.find((p) => caminho.every((parte, i) => p.path[i] === parte))
      ?.message;

  function tentarGravar() {
    const resultado = esquemaEntrega.safeParse(atual.current);
    if (!resultado.success) return;
    const texto = JSON.stringify(resultado.data);
    if (texto === ultimoGravado.current) return;
    ultimoGravado.current = texto;
    salvarEntrega(contaId, resultado.data);
  }

  function mudar(nova: RegraDeEntrega, agora = false) {
    const arrumada = comRaio(nova);
    atual.current = arrumada;
    setRegra(arrumada);
    if (agora) tentarGravar();
  }

  const ultima = regra.faixas.length - 1;

  function adicionarFaixa() {
    // Entra antes da última, no meio do que sobra até o raio.
    const antes = regra.faixas[ultima - 1]?.ateKm ?? 0;
    const nova = {
      ateKm: umaCasa((antes + regra.raioKm) / 2),
      taxa: regra.faixas[ultima]!.taxa,
    };
    mudar(
      {
        ...regra,
        faixas: [...regra.faixas.slice(0, ultima), nova, regra.faixas[ultima]!],
      },
      true,
    );
  }

  return (
    <section aria-labelledby={id} className="space-y-5" onBlur={tentarGravar}>
      <div>
        <h3 id={id} className="text-label font-medium text-ink">
          Entrega
        </h3>
        <p className="mt-0.5 text-label text-ink-muted">
          {gravada
            ? "A taxa sai da distância até o CEP da cliente, ou do bairro dela."
            : "Hoje a taxa fica a combinar com cada cliente. Diga de onde sai e quanto cobra, e o Rende calcula."}
        </p>
      </div>

      <Origem
        origem={regra.origem}
        // Depois do `await`: o que ela mudou enquanto media continua.
        aoMedir={(origem) => mudar({ ...atual.current, origem }, true)}
      />

      <CampoKm
        rotulo="Até onde você entrega"
        valor={regra.raioKm}
        aoMudar={(raioKm) => mudar({ ...regra, raioKm }, true)}
      />

      <fieldset>
        <legend className="text-label font-medium text-ink">
          Quanto custa
        </legend>
        <ul className="mt-2 space-y-3">
          {regra.faixas.map((faixa, i) => {
            const erro = problemaEm("faixas", i, "ateKm");
            const mudarFaixa = (
              mudanca: Partial<typeof faixa>,
              agora = false,
            ) =>
              mudar(
                {
                  ...regra,
                  faixas: regra.faixas.map((f, j) =>
                    j === i ? { ...f, ...mudanca } : f,
                  ),
                },
                agora,
              );
            return (
              <li key={`${i}-${faixa.ateKm}`} className="space-y-1">
                <div className="flex items-end gap-2">
                  {i === ultima ? (
                    <p className="num flex h-12 w-28 shrink-0 items-center text-body text-ink">
                      Até {km(regra.raioKm)}
                    </p>
                  ) : (
                    <CampoKm
                      rotulo="Até"
                      valor={faixa.ateKm}
                      aoMudar={(ateKm) => mudarFaixa({ ateKm }, true)}
                      className="w-28 shrink-0"
                    />
                  )}
                  <CampoMoeda
                    rotulo="Taxa"
                    valor={faixa.taxa}
                    aoMudar={(taxa) => mudarFaixa({ taxa })}
                    className="min-w-0 flex-1"
                  />
                  {i !== ultima && (
                    <Botao
                      variante="terciaria"
                      aria-label={`Tirar a faixa até ${km(faixa.ateKm)}`}
                      onClick={() =>
                        mudar(
                          {
                            ...regra,
                            faixas: regra.faixas.filter((_, j) => j !== i),
                          },
                          true,
                        )
                      }
                      className="size-12 shrink-0 px-0"
                    >
                      <X aria-hidden className="size-4" strokeWidth={1.75} />
                    </Botao>
                  )}
                </div>
                {erro && (
                  <p role="alert" className="text-label text-negative">
                    {erro === "alem-do-raio"
                      ? "Essa faixa passa de onde você entrega."
                      : "Cada faixa vai mais longe que a de cima."}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        {regra.faixas.length < FAIXAS_MAXIMAS && (
          <Botao
            variante="terciaria"
            className="mt-2"
            onClick={adicionarFaixa}
            iconeInicial={
              <Plus aria-hidden className="size-4" strokeWidth={1.75} />
            }
          >
            Adicionar faixa
          </Botao>
        )}
      </fieldset>

      <Bairros
        bairros={regra.bairros ?? []}
        aoMudar={(bairros) => mudar({ ...regra, bairros }, true)}
      />

      <TestarUmCep regra={regra} />
    </section>
  );
}

/** Um número de km com uma casa, gravado ao sair do campo. */
function CampoKm({
  rotulo,
  valor,
  aoMudar,
  className,
}: {
  rotulo: string;
  valor: number;
  aoMudar: (km: number) => void;
  className?: string;
}) {
  const [texto, setTexto] = useState(KM.format(valor));
  return (
    <Campo
      rotulo={rotulo}
      inputMode="decimal"
      sufixo="km"
      className={className}
      value={texto}
      onChange={(evento) => setTexto(evento.target.value)}
      onBlur={() => {
        const numero = umaCasa(parseParaNumero(texto.trim()));
        if (numero > 0 && numero !== valor) aoMudar(numero);
        else setTexto(KM.format(valor));
      }}
    />
  );
}

/** A rota da dona (`#d322`). `null` é não ter conseguido perguntar. */
function useMedir() {
  const contaId = useContaId();
  const { usuario } = useAuth();
  return async (cep: string): Promise<MedidaDoCep | null> => {
    if (!usuario) return null;
    try {
      const resposta = await fetch("/api/entrega/medir", {
        method: "POST",
        headers: {
          authorization: `Bearer ${await usuario.getIdToken()}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ contaId, cep }),
      });
      return resposta.ok ? ((await resposta.json()) as MedidaDoCep) : null;
    } catch {
      return null;
    }
  };
}

function SemInternet() {
  return (
    <p className="flex items-start gap-2 text-label text-ink-muted">
      <CloudOff
        aria-hidden
        className="mt-0.5 size-4 shrink-0"
        strokeWidth={1.75}
      />
      Precisa de internet para medir.
    </p>
  );
}

/**
 * "De onde sai a entrega". Medida pelo Google uma vez, ao salvar, e gravada
 * pelo aparelho com a regra; nunca sai da conta (`#d322`).
 */
function Origem({
  origem,
  aoMedir,
}: {
  origem: RegraDeEntrega["origem"];
  aoMedir: (origem: NonNullable<RegraDeEntrega["origem"]>) => void;
}) {
  const online = useConexao();
  const medir = useMedir();
  const [texto, setTexto] = useState(origem ? cepComTraco(origem.cep) : "");
  const [medindo, setMedindo] = useState(false);
  const [falha, setFalha] = useState<"nao-achado" | "sem-resposta" | null>(
    null,
  );

  const cep = limparCep(texto);
  const medido = cep !== null && cep === origem?.cep;

  async function salvar() {
    if (!cep || medido) return;
    setFalha(null);
    setMedindo(true);
    const medida = await medir(cep);
    setMedindo(false);
    if (medida?.coordenadas) aoMedir({ cep, ...medida.coordenadas });
    else setFalha(medida?.naoAchado ? "nao-achado" : "sem-resposta");
  }

  return (
    <div className="space-y-3">
      <Campo
        rotulo="De onde sai a entrega"
        dica="Não aparece para ninguém. Serve só para medir a distância."
        erro={
          falha === "nao-achado"
            ? "Não achamos esse CEP. Confira os números."
            : falha === "sem-resposta"
              ? "Não deu para medir agora. Tente de novo em instantes."
              : undefined
        }
        placeholder="00000-000"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={9}
        value={texto}
        onChange={(evento) => {
          setFalha(null);
          setTexto(evento.target.value);
        }}
      />
      <Botao
        carregando={medindo}
        disabled={!online || !cep || medido}
        onClick={() => void salvar()}
        iconeInicial={
          medido ? (
            <Check aria-hidden className="size-4" strokeWidth={2} />
          ) : undefined
        }
      >
        {medido ? "CEP medido" : "Salvar CEP"}
      </Botao>
      {!online && !medido && <SemInternet />}
    </div>
  );
}

/** "Bairros com outro preço": valem antes da distância, e `null` é "Não entrego". */
function Bairros({
  bairros,
  aoMudar,
}: {
  bairros: { nome: string; taxa: Centavos | null }[];
  aoMudar: (bairros: { nome: string; taxa: Centavos | null }[]) => void;
}) {
  const [nome, setNome] = useState("");
  const [taxa, setTaxa] = useState<Centavos>(0);
  const [naoEntrego, setNaoEntrego] = useState(false);
  const [erro, setErro] = useState<string>();
  const idNaoEntrego = useId();

  function adicionar() {
    const limpo = nome.trim();
    if (!limpo) return setErro("Diga o nome do bairro.");
    if (bairros.some((b) => chaveDeBusca(b.nome) === chaveDeBusca(limpo))) {
      return setErro("Esse bairro já está na lista.");
    }
    aoMudar([...bairros, { nome: limpo, taxa: naoEntrego ? null : taxa }]);
    setNome("");
    setTaxa(0);
    setNaoEntrego(false);
  }

  return (
    <fieldset>
      <legend className="text-label font-medium text-ink">
        Bairros com outro preço
      </legend>
      <p className="mt-0.5 text-label text-ink-muted">
        Valem antes da distância: para o bairro do outro lado da ponte, ou o que
        você não atende.
      </p>
      {bairros.length > 0 && (
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {bairros.map((bairro) => (
            <li
              key={bairro.nome}
              className="flex min-h-11 items-center gap-3 py-1"
            >
              <span className="min-w-0 flex-1 wrap-break-word text-body text-ink">
                {bairro.nome}
              </span>
              {bairro.taxa === null ? (
                <span className="flex items-center gap-1.5 text-label text-ink">
                  <MapPinOff
                    aria-hidden
                    className="size-4 shrink-0 text-ink-muted"
                    strokeWidth={1.75}
                  />
                  Não entrego
                </span>
              ) : (
                <span className="num text-body font-semibold text-ink">
                  {formatarMoeda(bairro.taxa)}
                </span>
              )}
              <Botao
                variante="terciaria"
                tamanho="sm"
                aria-label={`Tirar ${bairro.nome}`}
                onClick={() => aoMudar(bairros.filter((b) => b !== bairro))}
              >
                Tirar
              </Botao>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 space-y-3">
        <Campo
          rotulo="Bairro"
          erro={erro}
          value={nome}
          onChange={(evento) => {
            setErro(undefined);
            setNome(evento.target.value);
          }}
        />
        <div className="flex min-h-11 items-center gap-3">
          <input
            id={idNaoEntrego}
            type="checkbox"
            checked={naoEntrego}
            onChange={(evento) => setNaoEntrego(evento.target.checked)}
            className="size-5 shrink-0"
          />
          <label htmlFor={idNaoEntrego} className="text-body text-ink">
            Não entrego nesse bairro
          </label>
        </div>
        {!naoEntrego && (
          <CampoMoeda
            rotulo="Preço da entrega"
            valor={taxa}
            aoMudar={setTaxa}
          />
        )}
        <Botao onClick={adicionar}>Adicionar bairro</Botao>
      </div>
    </fieldset>
  );
}

/**
 * "Testar um CEP": a resposta ao vivo, com a regra que está na tela, gravada
 * ou não. A distância aparece só aqui, para ela calibrar.
 */
function TestarUmCep({ regra }: { regra: RegraDeEntrega }) {
  const online = useConexao();
  const medir = useMedir();
  const [texto, setTexto] = useState("");
  const [teste, setTeste] = useState<
    { cep: string; medida: MedidaDoCep | null } | "medindo" | null
  >(null);
  const pedido = useRef("");

  async function testar(cep: string) {
    pedido.current = cep;
    setTeste("medindo");
    const medida = await medir(cep);
    // Ela pode ter digitado outro CEP enquanto este voltava.
    if (pedido.current === cep) setTeste({ cep, medida });
  }

  return (
    <div className="space-y-3">
      <Campo
        rotulo="Testar um CEP"
        dica="Veja quanto a cliente pagaria, e por quê."
        placeholder="00000-000"
        inputMode="numeric"
        maxLength={9}
        value={texto}
        disabled={!online}
        onChange={(evento) => {
          setTexto(evento.target.value);
          const cep = limparCep(evento.target.value);
          if (cep && cep !== pedido.current) void testar(cep);
          if (!cep) {
            pedido.current = "";
            setTeste(null);
          }
        }}
      />
      {!online && <SemInternet />}
      <div aria-live="polite">
        {teste === "medindo" ? (
          <p className="text-label text-ink-muted">Medindo…</p>
        ) : teste ? (
          <Resposta regra={regra} medida={teste.medida} />
        ) : null}
      </div>
    </div>
  );
}

function Resposta({
  regra,
  medida,
}: {
  regra: RegraDeEntrega;
  medida: MedidaDoCep | null;
}) {
  const bairro = medida?.endereco?.bairro || undefined;
  const resultado = taxaDeEntrega(regra, {
    bairro,
    coordenadas: medida?.coordenadas ?? undefined,
  });

  if (resultado.tipo === "a-combinar") {
    return (
      <p className="text-label text-ink">
        {medida?.naoAchado && !bairro
          ? "Não achamos esse CEP. Confira os números."
          : !regra.origem
            ? "A combinar: salve de onde sai a entrega para medir a distância."
            : "A combinar: não deu para medir esse CEP agora."}
      </p>
    );
  }

  const { porque } = resultado;
  const partes =
    "bairro" in porque
      ? [porque.bairro, "preço do bairro"]
      : [
          bairro,
          km(porque.km),
          porque.ateKm !== undefined
            ? `faixa até ${km(porque.ateKm)}`
            : `passa de ${km(regra.raioKm)}`,
        ];
  const linha = partes.filter(Boolean).join(" · ");

  return resultado.tipo === "fora" ? (
    <p className="flex items-start gap-2 text-body text-ink">
      <MapPinOff
        aria-hidden
        className="mt-1 size-4 shrink-0 text-ink-muted"
        strokeWidth={1.75}
      />
      <span className="num">
        {linha} · <span className="font-semibold">não entrega</span>
      </span>
    </p>
  ) : (
    <p className="num text-body text-ink">
      {linha} ·{" "}
      <span className="font-semibold">{formatarMoeda(resultado.taxa)}</span>
    </p>
  );
}
