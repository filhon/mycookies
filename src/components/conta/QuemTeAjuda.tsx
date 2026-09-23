"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ChevronRight, UserMinus, Users } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Confirmacao } from "@/components/ui/Confirmacao";
import { EsqueletoLista } from "@/components/ui/Esqueleto";
import { Painel } from "@/components/ui/Painel";
import {
  apelidoDoEmail,
  MENSAGEM_FALHA_CONVITE,
  type FalhaConvite,
} from "@/lib/domain/ajudante";
import { colMembros } from "@/lib/firebase/colecoes";
import { useColecao } from "@/lib/hooks/useColecao";
import type { Membro } from "@/lib/types";
import { useAuth, useContaId } from "@/providers/AuthProvider";

/** "ana.silva" → "Ana.silva": o apelido vira nome na frase. */
function nome(membro: Pick<Membro, "email">): string {
  const apelido = apelidoDoEmail(membro.email);
  return apelido.charAt(0).toUpperCase() + apelido.slice(1);
}

/** "Só você", "Você e Ana", "Você e mais 2": a legenda da linha é o estado. */
function legenda(ativas: Membro[]): string {
  if (ativas.length === 0) return "Só você";
  if (ativas.length === 1) return `Você e ${nome(ativas[0]!)}`;
  return `Você e mais ${ativas.length}`;
}

interface Convidada {
  email: string;
  criouLogin: boolean;
}

/**
 * "Quem te ajuda" (spec 030, 3.B.1): a linha na prateleira de `/configuracao`
 * e o painel de onde a dona convida e tira. Só a dona o vê.
 *
 * A lista vem de `colMembros` pelo `useColecao`, e não da rota: é dado da
 * conta, e chega do cache offline como todo o resto. Só as duas escritas são
 * de rota, porque o espelho é escrito só pelo servidor (`DECISOES.md#d155`).
 */
export function QuemTeAjuda() {
  const contaId = useContaId();
  const { usuario } = useAuth();

  const consulta = useMemo(() => colMembros(contaId), [contaId]);
  const { dados, carregando, erro } = useColecao<Membro>(consulta);
  // Sem `where` nem `orderBy`: são até cinco documentos (`#d155`).
  const ativas = useMemo(
    () =>
      dados
        .filter((membro) => !membro.removidaEm)
        .sort((a, b) => a.convidadaEm.toMillis() - b.convidadaEm.toMillis()),
    [dados],
  );

  const [aberto, setAberto] = useState(false);
  const [email, setEmail] = useState("");
  const [convidando, setConvidando] = useState(false);
  const [convidada, setConvidada] = useState<Convidada | null>(null);
  const [erroConvite, setErroConvite] = useState<string | null>(null);

  const [aTirar, setATirar] = useState<Membro | null>(null);
  const [tirando, setTirando] = useState(false);
  const [erroTirar, setErroTirar] = useState<string | null>(null);

  function fechar() {
    setAberto(false);
    setEmail("");
    setConvidada(null);
    setErroConvite(null);
    setErroTirar(null);
  }

  async function convidar(evento: FormEvent) {
    evento.preventDefault();
    if (!usuario) return;
    setErroConvite(null);
    setConvidando(true);
    try {
      const resposta = await fetch("/api/conta/membros", {
        method: "POST",
        headers: {
          authorization: `Bearer ${await usuario.getIdToken()}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ contaId, email }),
      });
      if (!resposta.ok) {
        setErroConvite(MENSAGEM_FALHA_CONVITE[await codigoDaFalha(resposta)]);
        return;
      }
      const { criouLogin } = (await resposta.json()) as {
        criouLogin: boolean;
      };
      setConvidada({ email: email.trim().toLowerCase(), criouLogin });
      setEmail("");
    } catch {
      // `TypeError` do `fetch`: sem rede. Convidar é do servidor.
      setErroConvite(MENSAGEM_FALHA_CONVITE["sem-rede"]);
    } finally {
      setConvidando(false);
    }
  }

  async function tirar() {
    if (!usuario || !aTirar) return;
    setErroTirar(null);
    setTirando(true);
    try {
      const parametros = new URLSearchParams({ contaId, uid: aTirar.id });
      const resposta = await fetch(`/api/conta/membros?${parametros}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${await usuario.getIdToken()}` },
      });
      if (!resposta.ok) {
        setErroTirar(MENSAGEM_FALHA_CONVITE[await codigoDaFalha(resposta)]);
      }
    } catch {
      setErroTirar(MENSAGEM_FALHA_CONVITE["sem-rede"]);
    } finally {
      setTirando(false);
      setATirar(null);
    }
  }

  const rodape = convidada ? (
    <div className="space-y-3">
      {/* O recado é o convite (`DECISOES.md#d119`): a dona copia para o
          WhatsApp. `select-all` seleciona a frase inteira num toque. */}
      <p
        aria-live="polite"
        className="select-all rounded-md bg-sunken px-4 py-3 text-body text-ink"
      >
        {convidada.criouLogin
          ? `Pronto. Peça para ${nome(convidada)} abrir o Rende, tocar em "Esqueci minha senha" e usar o e-mail ${convidada.email}: o link que chega cria a senha.`
          : `Pronto. ${nome(convidada)} já tem senha no Rende: é só entrar com o e-mail ${convidada.email}.`}
      </p>
      <Botao larguraTotal onClick={() => setConvidada(null)}>
        Convidar outra pessoa
      </Botao>
    </div>
  ) : (
    <form onSubmit={(evento) => void convidar(evento)} className="space-y-3">
      <Campo
        rotulo="E-mail de quem te ajuda"
        type="email"
        inputMode="email"
        autoComplete="off"
        required
        placeholder="ana@exemplo.com"
        value={email}
        onChange={(evento) => setEmail(evento.target.value)}
        erro={erroConvite ?? undefined}
      />
      <Botao
        type="submit"
        variante="primaria"
        tamanho="lg"
        larguraTotal
        carregando={convidando}
      >
        Convidar
      </Botao>
    </form>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-4 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken lg:px-5"
      >
        <Users
          aria-hidden
          className="size-5 shrink-0 text-ink-muted"
          strokeWidth={1.75}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-body font-medium text-ink">
            Quem te ajuda
          </span>
          <span className="mt-0.5 block truncate text-label text-ink-muted">
            {/* Enquanto a lista não chega, nada: "Só você" por um instante
                seria mentir para quem tem ajudante. */}
            {carregando ? " " : legenda(ativas)}
          </span>
        </span>
        <ChevronRight
          aria-hidden
          className="size-5 shrink-0 text-ink-subtle"
          strokeWidth={1.75}
        />
      </button>

      <Painel
        aberto={aberto}
        aoFechar={fechar}
        titulo="Quem te ajuda"
        rodape={rodape}
      >
        {carregando ? (
          <EsqueletoLista linhas={2} />
        ) : erro ? (
          <p role="alert" className="text-label text-negative">
            Não deu para carregar quem tem acesso. Verifique a conexão e abra de
            novo.
          </p>
        ) : ativas.length === 0 ? (
          <div className="space-y-2">
            <p className="text-body font-medium text-ink">
              Só você usa o Rende neste negócio.
            </p>
            <p className="max-w-[52ch] text-label text-ink-muted">
              Quem te ajuda vê os pedidos, os produtos, os materiais e a lista
              de compras, e pode registrar fornada e contar a despensa. Não vê o
              seu caixa nem a sua meta, e não mexe na sua configuração.
            </p>
          </div>
        ) : (
          <ul className="-mx-5 divide-y divide-line border-y border-line">
            {ativas.map((membro) => (
              <li key={membro.id} className="flex items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium text-ink">
                    {nome(membro)}
                  </span>
                  <span className="block truncate text-label text-ink-muted">
                    {membro.email}
                  </span>
                </span>
                <Botao
                  tamanho="sm"
                  onClick={() => {
                    setErroTirar(null);
                    setATirar(membro);
                  }}
                  iconeInicial={
                    <UserMinus
                      aria-hidden
                      className="size-4"
                      strokeWidth={1.75}
                    />
                  }
                  className="shrink-0"
                >
                  Tirar o acesso
                </Botao>
              </li>
            ))}
          </ul>
        )}

        {erroTirar && (
          <p role="alert" className="mt-3 text-label text-negative">
            {erroTirar}
          </p>
        )}
      </Painel>

      <Confirmacao
        aberto={aTirar !== null}
        titulo={`Tirar o acesso de ${aTirar ? nome(aTirar) : ""}?`}
        descricao="Sai do Rende no próximo acesso e não vê mais os seus pedidos. Você pode convidar de novo quando quiser."
        rotuloConfirmar="Tirar o acesso"
        rotuloCancelar="Voltar"
        carregandoConfirmar={tirando}
        aoConfirmar={() => void tirar()}
        aoCancelar={() => setATirar(null)}
      />
    </>
  );
}

/** O padrão de `MeusDados`: o corpo diz o código; sem corpo, o status decide. */
async function codigoDaFalha(resposta: Response): Promise<FalhaConvite> {
  try {
    const corpo = (await resposta.json()) as { erro?: string };
    if (corpo.erro && corpo.erro in MENSAGEM_FALHA_CONVITE) {
      return corpo.erro as FalhaConvite;
    }
  } catch {
    // Resposta sem corpo JSON. O status conta o resto.
  }

  if (resposta.status === 401) return "sem-acesso";
  if (resposta.status === 400) return "fora-de-forma";
  return "sem-resposta";
}
