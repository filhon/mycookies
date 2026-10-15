"use client";

import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { CircleAlert } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Campo, focarPrimeiroErro } from "@/components/ui/Campo";
import { CHAVE_DA_ORIGEM, sugerirEmail } from "@/lib/domain/cadastro";
import {
  CHAVE_DA_ESPERA,
  TAMANHO_MAXIMO_INSTAGRAM,
  TAMANHO_MAXIMO_NOME_DA_ESPERA,
  esquemaListaDeEspera,
  posicaoNaFila,
} from "@/lib/domain/listaDeEspera";
import type { OrigemDaEspera } from "@/lib/types";

const FALHA = "Não deu para entrar na lista agora. Tente de novo em instantes.";

const semAssinatura = () => () => {};

/** O que ficou no aparelho: o texto cru, que `useSyncExternalStore` compara. */
function esperaGuardada(): string | null {
  try {
    return localStorage.getItem(CHAVE_DA_ESPERA);
  } catch {
    return null;
  }
}

function posicaoGuardada(texto: string | null): number | null {
  try {
    const posicao = (JSON.parse(texto ?? "null") as { posicao?: unknown })
      ?.posicao;
    return typeof posicao === "number" ? posicao : null;
  } catch {
    return null;
  }
}

/**
 * A lista de espera do beta (spec 182): nome, e-mail e o Instagram, se ela
 * quiser. Um componente só, no cadastro sem convite e nas páginas públicas
 * (184), com a `origem` da página. Quem veio pelo rodapé de um cardápio
 * (`rende:origem`, spec 114) vai como `"cardapio"`.
 *
 * Depois do envio a posição fica no aparelho (`rende:espera`), e o formulário
 * não volta nas outras páginas.
 */
export function ListaDeEspera({
  origem,
  className,
}: {
  origem: OrigemDaEspera;
  className?: string;
}) {
  const guardada = posicaoGuardada(
    useSyncExternalStore(semAssinatura, esperaGuardada, () => null),
  );
  const [agora, setAgora] = useState<number | null>(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [sugestao, setSugestao] = useState<string | null>(null);
  const [instagram, setInstagram] = useState("");
  const [erros, setErros] = useState<{ nome?: string; email?: string }>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const isca = useRef<HTMLInputElement>(null);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setFalha(null);
    setSugestao(sugerirEmail(email));

    const corpo = {
      nome,
      email,
      instagram: instagram || undefined,
      origem: doCardapio() ? "cardapio" : origem,
      site: isca.current?.value || undefined,
    };
    const lido = esquemaListaDeEspera.safeParse(corpo);
    const errados = new Set(lido.error?.issues.map((issue) => issue.path[0]));
    const faltas = {
      nome: errados.has("nome") ? "Escreva o seu nome." : undefined,
      email: !email.trim()
        ? "Escreva o seu e-mail."
        : errados.has("email")
          ? "Confira o e-mail: falta alguma coisa nele."
          : undefined,
    };
    setErros(faltas);
    if (faltas.nome || faltas.email) {
      focarPrimeiroErro();
      return;
    }

    setEnviando(true);
    try {
      const resposta = await fetch("/api/lista-de-espera", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const { posicao } = (await resposta.json()) as { posicao?: number };
      if (!resposta.ok || typeof posicao !== "number") throw new Error();
      try {
        localStorage.setItem(CHAVE_DA_ESPERA, JSON.stringify({ posicao }));
      } catch {
        // Sem armazenamento, o formulário volta nas outras páginas; só isso.
      }
      setAgora(posicao);
    } catch {
      // Sem rede, 5xx ou resposta sem posição: o formulário fica preenchido.
      setFalha(FALHA);
    } finally {
      setEnviando(false);
    }
  }

  const posicao = agora ?? guardada;

  return (
    <div className={className}>
      {/* Sempre no DOM: o leitor de tela anuncia o "Pronto" quando ele entra. */}
      <div role="status">
        {posicao !== null && (
          <p className="rounded-lg bg-sunken px-4 py-3 text-body text-ink">
            {agora !== null
              ? `Pronto. Você é a ${posicaoNaFila(posicao)} da fila. O e-mail de confirmação já saiu.`
              : `Você já está na lista, na ${posicaoNaFila(posicao)} posição. Quando abrirem vagas, o aviso chega por e-mail.`}
          </p>
        )}
      </div>

      {posicao === null && (
        <form onSubmit={aoEnviar} className="space-y-5" noValidate>
          <Campo
            rotulo="Seu nome"
            name="nome"
            type="text"
            autoComplete="name"
            maxLength={TAMANHO_MAXIMO_NOME_DA_ESPERA}
            aria-required
            erro={erros.nome}
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              setErros((atual) => ({ ...atual, nome: undefined }));
            }}
          />

          <Campo
            rotulo="E-mail"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            aria-required
            erro={erros.email}
            dica={
              sugestao && (
                <span
                  aria-live="polite"
                  className="flex flex-wrap items-center gap-x-1 text-ink"
                >
                  <span>
                    Você quis dizer{" "}
                    <strong className="font-semibold">{sugestao}</strong>?
                  </span>
                  <Botao
                    variante="terciaria"
                    tamanho="sm"
                    onClick={() => {
                      setEmail(sugestao);
                      setSugestao(null);
                    }}
                  >
                    Corrigir
                  </Botao>
                </span>
              )
            }
            value={email}
            onBlur={() => setSugestao(sugerirEmail(email))}
            onChange={(e) => {
              setEmail(e.target.value);
              setSugestao(null);
              setErros((atual) => ({ ...atual, email: undefined }));
            }}
          />

          <Campo
            rotulo="Instagram do seu negócio (opcional)"
            name="instagram"
            type="text"
            prefixo="@"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={TAMANHO_MAXIMO_INSTAGRAM + 1}
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
          />

          {/* A isca: fora da tela e fora do teclado. Só robô preenche. */}
          <div
            aria-hidden
            className="absolute left-[-9999px] size-px overflow-hidden"
          >
            <label>
              Site
              <input
                ref={isca}
                type="text"
                name="site"
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
          </div>

          {falha && (
            <p
              role="alert"
              className="flex items-start gap-1.5 text-label text-negative"
            >
              <CircleAlert
                aria-hidden
                strokeWidth={1.75}
                className="mt-0.5 size-4 shrink-0"
              />
              {falha}
            </p>
          )}

          <div>
            <Botao
              type="submit"
              variante="primaria"
              tamanho="lg"
              larguraTotal
              carregando={enviando}
            >
              Entrar na lista
            </Botao>
            <p className="mt-3 text-label text-ink-muted">
              Só usamos o seu e-mail para avisar das vagas.{" "}
              <a
                href="/privacidade#secao-11"
                target="_blank"
                rel="noopener"
                className="font-medium text-brand-ink underline underline-offset-2"
              >
                Privacidade
              </a>
            </p>
          </div>
        </form>
      )}
    </div>
  );
}

/** Veio pelo rodapé de um cardápio (spec 114, `#d317`), marcado em `/conheca`. */
function doCardapio(): boolean {
  try {
    return localStorage.getItem(CHAVE_DA_ORIGEM) === "cardapio";
  } catch {
    return false;
  }
}
