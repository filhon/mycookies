"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronRight, CircleAlert, CircleCheck, Gift } from "lucide-react";
import { MandarAPagina } from "@/components/site/MandarAPagina";
import { Botao } from "@/components/ui/Botao";
import { BotaoCopiar } from "@/components/ui/BotaoCopiar";
import { Campo } from "@/components/ui/Campo";
import { Confirmacao } from "@/components/ui/Confirmacao";
import { Painel } from "@/components/ui/Painel";
import { DIAS_DE_TESTE } from "@/lib/domain/cadastro";
import {
  convitesLivres,
  formatarCodigo,
  mensagemDoConvite,
  MENSAGEM_FALHA_DO_CONVITE,
  TAMANHO_MAXIMO_PARA_QUEM,
  type FalhaDoConvite,
} from "@/lib/domain/convite";
import { dataISODe, rotuloDiaNoAno } from "@/lib/domain/datas";
import { colConvites } from "@/lib/firebase/colecoes";
import { useBeta } from "@/lib/hooks/useBeta";
import { useColecao } from "@/lib/hooks/useColecao";
import { useConexao } from "@/lib/hooks/useDispositivo";
import type { Convite } from "@/lib/types";
import { useAuth, useContaId } from "@/providers/AuthProvider";

/** A âncora da entrada "Convidar" do ⋯ (spec 183). */
const ANCORA_DOS_CONVITES = "convites";

type ConviteNaTela = Convite & { id: string };

const LINHA =
  "flex w-full items-center gap-3 border-t border-line px-4 py-4 text-left lg:px-5";

/** O link que ela manda: o do domínio em que o app está aberto. */
function linkDo(codigo: string): string {
  return `${location.origin}/convite/${codigo}`;
}

/**
 * "Seus convites" (spec 183): os convites de fundadora dela, acima de "Quem te
 * ajuda". Só para a dona (a tela da ajudante não a monta), só com cota e só
 * na fase `BETA`. A lista vem do ouvinte, como a de `QuemTeAjuda`: a linha da
 * amiga que entrou vira "entrou em…" sem recarregar. Criar e cancelar são de
 * rota, porque só o servidor escreve convite (`DECISOES.md#d399`).
 */
export function SeusConvites() {
  const { conta } = useAuth();
  const beta = useBeta();
  const cota = conta?.beta?.convites ?? 0;
  if (!conta?.beta || cota <= 0 || beta?.fase !== "BETA") return null;
  return (
    <ListaDeConvites
      fundadora={conta.beta.fundadora}
      cota={cota}
      vagas={beta.vagas}
      restam={beta.restam}
    />
  );
}

function ListaDeConvites({
  fundadora,
  cota,
  vagas,
  restam,
}: {
  fundadora: number;
  cota: number;
  vagas: number;
  restam: number;
}) {
  const contaId = useContaId();
  const { usuario } = useAuth();
  const online = useConexao();

  const consulta = useMemo(() => colConvites(contaId), [contaId]);
  const { dados, carregando } = useColecao<ConviteNaTela>(consulta);
  const visiveis = useMemo(
    () =>
      dados
        .filter((c) => c.status !== "CANCELADO")
        .sort((a, b) => a.criadoEm.toMillis() - b.criadoEm.toMillis()),
    [dados],
  );
  const livres = convitesLivres(cota, dados);
  const primeiroAberto = visiveis.find((c) => c.status === "ABERTO")?.id;

  const [aberto, setAberto] = useState(false);
  const [paraQuem, setParaQuem] = useState("");
  const [criando, setCriando] = useState(false);
  const [criado, setCriado] = useState<{
    codigo: string;
    paraQuem?: string;
  } | null>(null);
  const [erroCriar, setErroCriar] = useState<string | null>(null);

  const [aCancelar, setACancelar] = useState<ConviteNaTela | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [erroCancelar, setErroCancelar] = useState<string | null>(null);

  // A entrada do ⋯ chega com `#convites`, e a seção só monta depois que a
  // fase do beta é conhecida: o navegador já passou da âncora.
  useEffect(() => {
    if (location.hash === `#${ANCORA_DOS_CONVITES}`) {
      document.getElementById(ANCORA_DOS_CONVITES)?.scrollIntoView();
    }
  }, []);

  function fechar() {
    setAberto(false);
    setParaQuem("");
    setCriado(null);
    setErroCriar(null);
  }

  async function chamar(metodo: "POST" | "DELETE", corpo: object) {
    return fetch("/api/convites", {
      method: metodo,
      headers: {
        authorization: `Bearer ${await usuario!.getIdToken()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ contaId, ...corpo }),
    });
  }

  async function criar(evento: FormEvent) {
    evento.preventDefault();
    if (!usuario) return;
    setErroCriar(null);
    setCriando(true);
    try {
      const nome = paraQuem.trim() || undefined;
      const resposta = await chamar("POST", { paraQuem: nome });
      if (!resposta.ok) {
        setErroCriar(MENSAGEM_FALHA_DO_CONVITE[await codigoDaFalha(resposta)]);
        return;
      }
      const { codigo } = (await resposta.json()) as { codigo: string };
      setCriado({ codigo, paraQuem: nome });
      setParaQuem("");
    } catch {
      // `TypeError` do `fetch`: sem rede. Criar é do servidor.
      setErroCriar(MENSAGEM_FALHA_DO_CONVITE["sem-rede"]);
    } finally {
      setCriando(false);
    }
  }

  async function cancelar() {
    if (!usuario || !aCancelar) return;
    setErroCancelar(null);
    setCancelando(true);
    try {
      const resposta = await chamar("DELETE", { codigo: aCancelar.codigo });
      if (!resposta.ok) {
        setErroCancelar(
          MENSAGEM_FALHA_DO_CONVITE[await codigoDaFalha(resposta)],
        );
      }
    } catch {
      setErroCancelar(MENSAGEM_FALHA_DO_CONVITE["sem-rede"]);
    } finally {
      setCancelando(false);
      setACancelar(null);
    }
  }

  const hoje = dataISODe(new Date());

  return (
    <section
      id={ANCORA_DOS_CONVITES}
      aria-labelledby="convites-titulo"
      className="scroll-mt-[calc(var(--fundo-cabecalho,0px)+1rem)]"
    >
      <h3
        id="convites-titulo"
        className="text-subheading font-semibold text-ink"
      >
        Seus convites
      </h3>
      <p className="mt-1 max-w-[60ch] text-label text-ink-muted">
        Você é a fundadora nº{" "}
        <span className="num font-semibold text-ink">{fundadora}</span> do
        Rende. O beta tem {vagas} vagas, por convite. Você tem{" "}
        <span className="num font-semibold text-ink">{livres}</span> de {cota}{" "}
        para mandar.
      </p>
      {restam <= 10 && (
        <p className="mt-1 max-w-[60ch] text-label text-ink-muted">
          {restam === 0
            ? "As vagas do beta acabaram: quem chegar agora entra na lista."
            : `${restam === 1 ? "Resta 1 vaga" : `Restam ${restam} vagas`} no beta inteiro: quem chegar depois entra na lista.`}
        </p>
      )}

      <ul className="mt-4 overflow-hidden rounded-lg border border-line bg-surface [&>:first-child]:border-t-0">
        {!carregando &&
          visiveis.map((convite) =>
            convite.status === "USADO" ? (
              <li key={convite.id} className={LINHA}>
                <CircleCheck
                  aria-hidden
                  className="size-5 shrink-0 text-positive"
                  strokeWidth={1.75}
                />
                <span className="min-w-0 flex-1 text-body text-ink">
                  {convite.nomeDaConvidada ?? convite.paraQuem ?? "Ela"} entrou
                  {convite.usadoEm &&
                    ` em ${rotuloDiaNoAno(dataISODe(convite.usadoEm.toDate()), hoje)}`}
                </span>
              </li>
            ) : (
              <li
                key={convite.id}
                className="border-t border-line px-4 py-4 lg:px-5"
              >
                <div className="flex items-center gap-3">
                  <Gift
                    aria-hidden
                    className="size-5 shrink-0 text-ink-muted"
                    strokeWidth={1.75}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-medium text-ink">
                      {convite.paraQuem ?? "Convite sem nome"}
                    </span>
                    <span className="num block text-label text-ink-muted">
                      {formatarCodigo(convite.codigo)}
                    </span>
                  </span>
                </div>
                <AcoesDoConvite
                  codigo={convite.codigo}
                  paraQuem={convite.paraQuem}
                  primario={convite.id === primeiroAberto}
                >
                  <Botao
                    variante="terciaria"
                    onClick={() => {
                      setErroCancelar(null);
                      setACancelar(convite);
                    }}
                  >
                    Cancelar
                  </Botao>
                </AcoesDoConvite>
              </li>
            ),
          )}
        {!carregando &&
          Array.from({ length: livres }, (_, i) => (
            <li key={`livre-${i}`} className="border-t border-line">
              <button
                type="button"
                onClick={() => setAberto(true)}
                className={`${LINHA} border-t-0 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken`}
              >
                <Gift
                  aria-hidden
                  className="size-5 shrink-0 text-ink-subtle"
                  strokeWidth={1.75}
                />
                <span className="min-w-0 flex-1 text-body font-medium text-ink">
                  Convidar alguém
                </span>
                <ChevronRight
                  aria-hidden
                  className="size-5 shrink-0 text-ink-subtle"
                  strokeWidth={1.75}
                />
              </button>
            </li>
          ))}
        {carregando && (
          <li className={LINHA}>
            <span className="h-5 w-40 animate-pulse rounded-sm bg-sunken" />
          </li>
        )}
      </ul>

      {erroCancelar && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-1.5 text-label text-negative"
        >
          <CircleAlert
            aria-hidden
            strokeWidth={1.75}
            className="mt-0.5 size-4 shrink-0"
          />
          {erroCancelar}
        </p>
      )}

      <Painel
        aberto={aberto}
        aoFechar={fechar}
        titulo="Convidar alguém"
        rodape={
          criado ? (
            <AcoesDoConvite
              codigo={criado.codigo}
              paraQuem={criado.paraQuem}
              primario
            >
              <Botao variante="terciaria" onClick={fechar}>
                Fechar
              </Botao>
            </AcoesDoConvite>
          ) : (
            <form onSubmit={(e) => void criar(e)} className="space-y-3">
              <Campo
                rotulo="Pra quem é? (opcional)"
                name="paraQuem"
                type="text"
                autoComplete="off"
                maxLength={TAMANHO_MAXIMO_PARA_QUEM}
                dica="O nome vai na mensagem e na página do convite."
                value={paraQuem}
                onChange={(evento) => setParaQuem(evento.target.value)}
                erro={erroCriar ?? undefined}
              />
              <Botao
                type="submit"
                variante="primaria"
                tamanho="lg"
                larguraTotal
                carregando={criando}
                disabled={!online}
              >
                {online ? "Criar convite" : "Criar convite precisa de internet"}
              </Botao>
            </form>
          )
        }
      >
        {criado ? (
          <div className="space-y-2" aria-live="polite">
            <p className="text-body font-medium text-ink">
              Pronto. Agora é só mandar
              {criado.paraQuem && ` pra ${criado.paraQuem}`}.
            </p>
            <p className="max-w-[52ch] text-label text-ink-muted">
              O link vale uma conta e fica na sua lista até alguém usar.
            </p>
            <p className="num text-body font-semibold text-ink">
              {formatarCodigo(criado.codigo)}
            </p>
          </div>
        ) : (
          <p className="max-w-[52ch] text-body text-ink-muted">
            Cada convite vale uma conta no beta. Quem recebe o link vê o seu
            nome e entra com {DIAS_DE_TESTE} dias grátis. Se ninguém usar, você
            cancela e a vaga volta.
          </p>
        )}
      </Painel>

      <Confirmacao
        aberto={aCancelar !== null}
        titulo={`Cancelar o convite${aCancelar?.paraQuem ? ` de ${aCancelar.paraQuem}` : ""}?`}
        descricao="O link para de valer: quem já recebeu não entra mais com ele. A vaga volta pra você mandar a outra pessoa."
        rotuloConfirmar="Cancelar o convite"
        rotuloCancelar="Voltar"
        carregandoConfirmar={cancelando}
        aoConfirmar={() => void cancelar()}
        aoCancelar={() => setACancelar(null)}
      />
    </section>
  );
}

/** "Mandar pelo WhatsApp" e "Copiar link", com a terceira ação de quem chama. */
function AcoesDoConvite({
  codigo,
  paraQuem,
  primario,
  children,
}: {
  codigo: string;
  paraQuem?: string;
  primario: boolean;
  children: React.ReactNode;
}) {
  const link = linkDo(codigo);
  return (
    <div className="mt-3 flex flex-wrap items-start gap-2">
      <MandarAPagina
        titulo="Convite do Rende"
        texto={mensagemDoConvite(paraQuem)}
        url={link}
        variante={primario ? "primaria" : "secundaria"}
      />
      <BotaoCopiar texto={link} rotulo="Copiar link" tamanho="md" />
      {children}
    </div>
  );
}

/** O padrão de `QuemTeAjuda`: o corpo diz o código; sem corpo, o status decide. */
async function codigoDaFalha(resposta: Response): Promise<FalhaDoConvite> {
  try {
    const corpo = (await resposta.json()) as { erro?: string };
    if (corpo.erro && corpo.erro in MENSAGEM_FALHA_DO_CONVITE) {
      return corpo.erro as FalhaDoConvite;
    }
  } catch {
    // Resposta sem corpo JSON. O status conta o resto.
  }
  if (resposta.status === 401) return "sem-acesso";
  if (resposta.status === 400) return "fora-de-forma";
  return "sem-resposta";
}
