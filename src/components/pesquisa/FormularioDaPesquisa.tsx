"use client";

import {
  useEffect,
  useId,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { CircleAlert } from "lucide-react";
import { AreaTexto, Campo, focarPrimeiroErro } from "@/components/ui/Campo";
import { Botao } from "@/components/ui/Botao";
import {
  AUTORIZACAO_DO_DEPOIMENTO,
  CHAVE_DO_RASCUNHO,
  esquemaRespostas,
  MAXIMO_DE_TEXTO,
  MAXIMO_DE_TEXTO_CURTO,
  MAXIMO_DO_DEPOIMENTO,
  MENSAGEM_FALHA_DA_PESQUISA,
  MINIMO_DO_QUE_MUDOU,
  PERGUNTAS_DO_FIM_DO_TESTE as P,
  type FalhaDaPesquisa,
} from "@/lib/domain/pesquisa";
import { useConexao } from "@/lib/hooks/useDispositivo";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/providers/AuthProvider";

/** O que está na tela, cru: o esquema decide o que vale na hora de mandar. */
interface Rascunho {
  semORende?: string;
  nota?: number;
  maisUsou: string[];
  oQueMudou: string;
  oQueFaltou: string;
  continua?: string;
  motivo?: string;
  motivoOutro: string;
  depoimento: string;
  cidade: string;
  nomeNoDepoimento: string;
  autorizaDepoimento: boolean;
  conversa?: string;
  whatsapp: string;
}

type Erros = Partial<Record<keyof Rascunho, string>>;

const NOTAS = Array.from({ length: 11 }, (_, n) => n);

/** O rascunho do aparelho, se for desta conta. Com `try`: sem armazenamento, começa vazio. */
function lerRascunho(contaId: string): Partial<Rascunho> | null {
  try {
    const lido = JSON.parse(localStorage.getItem(CHAVE_DO_RASCUNHO) ?? "null");
    return lido?.contaId === contaId ? lido.respostas : null;
  } catch {
    return null;
  }
}

function guardarRascunho(contaId: string, respostas: Rascunho | null) {
  try {
    if (respostas) {
      localStorage.setItem(
        CHAVE_DO_RASCUNHO,
        JSON.stringify({ contaId, respostas }),
      );
    } else {
      localStorage.removeItem(CHAVE_DO_RASCUNHO);
    }
  } catch {
    // Sem armazenamento, o rascunho vale até fechar a tela.
  }
}

/**
 * A pesquisa do fim do teste (spec 185): uma página só, as perguntas em
 * blocos e "Mandar e ganhar os 30%" no pé. Monta só no cliente (a página
 * espera a conta), e por isso lê o rascunho do aparelho já no primeiro
 * render. O rascunho fica até o envio dar certo.
 */
export function FormularioDaPesquisa({
  contaId,
  padraoDoNome,
  aoMandar,
  rodape,
}: {
  contaId: string;
  /**
   * A `proprietaria`: como ela aparece no depoimento, se não mudar. O negócio
   * vem da conta, como no bloco da `/conheca` (`nome` e `negocio` à parte).
   */
  padraoDoNome: string;
  aoMandar: () => void;
  /** "Agora não", embaixo do pé. */
  rodape: ReactNode;
}) {
  const { usuario } = useAuth();
  const online = useConexao();
  const [r, setR] = useState<Rascunho>(() => ({
    maisUsou: [],
    oQueMudou: "",
    oQueFaltou: "",
    motivoOutro: "",
    depoimento: "",
    cidade: "",
    nomeNoDepoimento: padraoDoNome,
    autorizaDepoimento: false,
    whatsapp: "",
    ...lerRascunho(contaId),
  }));
  const [erros, setErros] = useState<Erros>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => guardarRascunho(contaId, r), [contaId, r]);

  function mudar<K extends keyof Rascunho>(campo: K, valor: Rascunho[K]) {
    setR((antes) => ({ ...antes, [campo]: valor }));
    setErros((antes) => ({ ...antes, [campo]: undefined }));
  }

  async function mandar(evento: FormEvent) {
    evento.preventDefault();
    if (!usuario) return;
    setFalha(null);

    const lido = esquemaRespostas.safeParse(r);
    if (!lido.success) {
      const novos: Erros = {};
      for (const { path } of lido.error.issues) {
        const campo = path[0] as keyof Rascunho;
        novos[campo] ??= mensagemDoErro(campo, r);
      }
      setErros(novos);
      focarPrimeiroErro();
      return;
    }

    setEnviando(true);
    try {
      const resposta = await fetch("/api/pesquisa", {
        method: "POST",
        headers: {
          authorization: `Bearer ${await usuario.getIdToken()}`,
          "content-type": "application/json",
        },
        // O cru, e não o lido: a rota roda o mesmo esquema.
        body: JSON.stringify({ contaId, respostas: r }),
      });
      if (!resposta.ok) {
        setFalha(MENSAGEM_FALHA_DA_PESQUISA[await codigoDaFalha(resposta)]);
        return;
      }
      guardarRascunho(contaId, null);
      aoMandar();
    } catch {
      // `TypeError` do `fetch`: sem rede. O rascunho continua no aparelho.
      setFalha(MENSAGEM_FALHA_DA_PESQUISA["sem-rede"]);
    } finally {
      setEnviando(false);
    }
  }

  const aviso =
    falha ?? (online ? null : MENSAGEM_FALHA_DA_PESQUISA["sem-rede"]);
  const pedeMotivo = r.continua === "nao" || r.continua === "nao-sei";
  const mudouAte = r.oQueMudou.trim().length;

  return (
    <form noValidate onSubmit={(e) => void mandar(e)} className="mt-6">
      <p className="text-label text-ink-muted">
        As marcadas com <span aria-hidden>*</span>
        <span className="sr-only">asterisco</span> são as que valem os 30%.
      </p>

      <div className="mt-8 space-y-10">
        <Escolha
          tipo="radio"
          pergunta={P.semORende.texto}
          obrigatoria
          opcoes={P.semORende.opcoes}
          valor={r.semORende}
          aoMudar={(v) => mudar("semORende", v)}
          erro={erros.semORende}
        />

        <Nota
          valor={r.nota}
          aoMudar={(n) => mudar("nota", n)}
          erro={erros.nota}
        />

        <Escolha
          tipo="checkbox"
          pergunta={P.maisUsou.texto}
          dica="Marque quantas quiser."
          opcoes={P.maisUsou.opcoes}
          valores={r.maisUsou}
          aoMarcar={(valor, marcado) =>
            mudar(
              "maisUsou",
              marcado
                ? [...r.maisUsou, valor]
                : r.maisUsou.filter((v) => v !== valor),
            )
          }
        />

        <AreaTexto
          rotulo={P.oQueMudou.texto}
          required
          rows={4}
          maxLength={MAXIMO_DE_TEXTO}
          value={r.oQueMudou}
          onChange={(e) => mudar("oQueMudou", e.target.value)}
          erro={erros.oQueMudou}
          dica={
            mudouAte < MINIMO_DO_QUE_MUDOU
              ? `Pelo menos ${MINIMO_DO_QUE_MUDOU} letras. Um exemplo de preço que mudou já vale.`
              : `${mudouAte} de ${MAXIMO_DE_TEXTO}`
          }
        />

        <AreaTexto
          rotulo={P.oQueFaltou.texto}
          rows={3}
          maxLength={MAXIMO_DE_TEXTO}
          value={r.oQueFaltou}
          onChange={(e) => mudar("oQueFaltou", e.target.value)}
        />

        <div className="space-y-6">
          <Escolha
            tipo="radio"
            pergunta={P.continua.texto}
            obrigatoria
            opcoes={P.continua.opcoes}
            valor={r.continua}
            aoMudar={(v) => mudar("continua", v)}
            erro={erros.continua}
          />
          {pedeMotivo && (
            <Escolha
              tipo="radio"
              pergunta={P.motivo.texto}
              opcoes={P.motivo.opcoes}
              valor={r.motivo}
              aoMudar={(v) => mudar("motivo", v)}
            />
          )}
          {pedeMotivo && r.motivo === "outro" && (
            <Campo
              rotulo="Qual?"
              maxLength={MAXIMO_DE_TEXTO_CURTO}
              value={r.motivoOutro}
              onChange={(e) => mudar("motivoOutro", e.target.value)}
            />
          )}
        </div>

        <div className="space-y-6">
          <AreaTexto
            rotulo={P.depoimento.texto}
            rows={3}
            maxLength={MAXIMO_DO_DEPOIMENTO}
            value={r.depoimento}
            onChange={(e) => mudar("depoimento", e.target.value)}
            dica={
              r.depoimento.trim()
                ? `${r.depoimento.trim().length} de ${MAXIMO_DO_DEPOIMENTO}`
                : undefined
            }
          />
          {r.depoimento.trim() && (
            <>
              <Campo
                rotulo="Cidade"
                autoComplete="address-level2"
                maxLength={MAXIMO_DE_TEXTO_CURTO}
                value={r.cidade}
                onChange={(e) => mudar("cidade", e.target.value)}
              />
              <Campo
                rotulo="Como quer ser chamada no depoimento"
                dica="O nome do seu negócio vai ao lado."
                maxLength={MAXIMO_DE_TEXTO_CURTO}
                value={r.nomeNoDepoimento}
                onChange={(e) => mudar("nomeNoDepoimento", e.target.value)}
              />
              {/* Fora do desconto, e desmarcada: o depoimento continua dela (`#d175`). */}
              <label className="flex min-h-11 cursor-pointer items-start gap-3 text-body text-ink">
                <input
                  type="checkbox"
                  checked={r.autorizaDepoimento}
                  onChange={(e) =>
                    mudar("autorizaDepoimento", e.target.checked)
                  }
                  className="mt-0.5 size-5 shrink-0 accent-brand-700"
                />
                <span>{AUTORIZACAO_DO_DEPOIMENTO.texto}</span>
              </label>
            </>
          )}
        </div>

        <div className="space-y-6">
          <Escolha
            tipo="radio"
            pergunta={P.conversa.texto}
            opcoes={P.conversa.opcoes}
            valor={r.conversa}
            aoMudar={(v) => mudar("conversa", v)}
          />
          {r.conversa === "sim" && (
            <Campo
              rotulo="Seu WhatsApp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={30}
              value={r.whatsapp}
              onChange={(e) => mudar("whatsapp", e.target.value)}
            />
          )}
        </div>
      </div>

      {/* No celular, preso ao pé como o da assinatura; no desktop, no fim. */}
      <div className="rodape-seguro sticky bottom-0 -mx-6 mt-10 border-t border-line bg-canvas px-6 pt-3 lg:static lg:mx-0 lg:border-0 lg:px-0 lg:pt-0 lg:pb-0 [html:has(&)]:scroll-pb-28">
        {aviso && (
          <p
            role="alert"
            className="mb-3 flex items-start gap-1.5 text-label text-negative"
          >
            <CircleAlert
              aria-hidden
              strokeWidth={1.75}
              className="mt-0.5 size-4 shrink-0"
            />
            {aviso}
          </p>
        )}
        <Botao
          type="submit"
          variante="primaria"
          tamanho="lg"
          larguraTotal
          carregando={enviando}
        >
          Mandar e ganhar os 30%
        </Botao>
      </div>
      {rodape}
    </form>
  );
}

function mensagemDoErro(campo: keyof Rascunho, r: Rascunho): string {
  if (campo === "nota") return "Escolha um número de 0 a 10.";
  if (campo === "oQueMudou") {
    const faltam = MINIMO_DO_QUE_MUDOU - r.oQueMudou.trim().length;
    return faltam > 0
      ? `Conte um pouco mais: faltam ${faltam} letras.`
      : `Cabe até ${MAXIMO_DE_TEXTO} letras.`;
  }
  return "Escolha uma.";
}

const PILULA =
  "flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-line-strong px-4 text-label font-medium text-ink-muted " +
  "transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken " +
  "has-checked:border-brand-700 has-checked:bg-brand-700 has-checked:text-on-brand " +
  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--focus)";

type Opcao = { readonly valor: string; readonly rotulo: string };

/**
 * Uma pergunta de escolha, com o rádio ou a caixa nativos dentro de cada
 * pílula: setas, espaço e o leitor de tela funcionam sem reimplementar o
 * grupo. A escolhida fica cheia, e não só de outra cor.
 */
function Escolha(
  props: {
    pergunta: string;
    obrigatoria?: boolean;
    dica?: string;
    erro?: string;
    opcoes: readonly Opcao[];
  } & (
    | {
        tipo: "radio";
        valor?: string;
        aoMudar: (valor: string) => void;
      }
    | {
        tipo: "checkbox";
        valores: string[];
        aoMarcar: (valor: string, marcado: boolean) => void;
      }
  ),
) {
  const nome = useId();
  return (
    <fieldset aria-describedby={props.erro ? `${nome}-erro` : undefined}>
      <Legenda obrigatoria={props.obrigatoria}>{props.pergunta}</Legenda>
      {props.dica && (
        <p className="mt-1 text-label text-ink-muted">{props.dica}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {props.opcoes.map((opcao, i) => (
          <label key={opcao.valor} className={PILULA}>
            <input
              type={props.tipo}
              name={nome}
              value={opcao.valor}
              className="sr-only"
              aria-invalid={i === 0 && props.erro ? true : undefined}
              {...(props.tipo === "radio"
                ? {
                    checked: props.valor === opcao.valor,
                    onChange: () => props.aoMudar(opcao.valor),
                  }
                : {
                    checked: props.valores.includes(opcao.valor),
                    onChange: (e: ChangeEvent<HTMLInputElement>) =>
                      props.aoMarcar(opcao.valor, e.target.checked),
                  })}
            />
            {opcao.rotulo}
          </label>
        ))}
      </div>
      {props.erro && <Erro id={`${nome}-erro`}>{props.erro}</Erro>}
    </fieldset>
  );
}

/**
 * Os onze números, rádios nativos. Onze alvos de 44px não cabem em 360px numa
 * linha: no celular, 0 a 5 e 6 a 10.
 */
function Nota({
  valor,
  aoMudar,
  erro,
}: {
  valor?: number;
  aoMudar: (nota: number) => void;
  erro?: string;
}) {
  const nome = useId();
  return (
    <fieldset aria-describedby={erro ? `${nome}-erro` : `${nome}-escala`}>
      <Legenda obrigatoria>{P.nota.texto}</Legenda>
      <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-11 sm:gap-1.5">
        {NOTAS.map((n) => (
          <label key={n} className={cn(PILULA, "num rounded-md px-0")}>
            <input
              type="radio"
              name={nome}
              value={n}
              checked={valor === n}
              onChange={() => aoMudar(n)}
              aria-invalid={n === 0 && erro ? true : undefined}
              className="sr-only"
            />
            {n}
          </label>
        ))}
      </div>
      <p
        id={`${nome}-escala`}
        className="mt-2 flex justify-between text-label text-ink-muted"
      >
        <span>0 · nada provável</span>
        <span>10 · com certeza</span>
      </p>
      {erro && <Erro id={`${nome}-erro`}>{erro}</Erro>}
    </fieldset>
  );
}

function Legenda({
  obrigatoria,
  children,
}: {
  obrigatoria?: boolean;
  children: ReactNode;
}) {
  return (
    <legend className="text-label font-medium text-ink">
      {children}
      {obrigatoria && (
        <span className="ml-1 text-ink-subtle" aria-hidden>
          *
        </span>
      )}
    </legend>
  );
}

function Erro({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p
      id={id}
      role="alert"
      className="mt-2 flex items-start gap-1.5 text-label text-negative"
    >
      <CircleAlert
        aria-hidden
        strokeWidth={1.75}
        className="mt-0.5 size-4 shrink-0"
      />
      {children}
    </p>
  );
}

/** O padrão de `SeusConvites`: o corpo diz o código; sem corpo, o status decide. */
async function codigoDaFalha(resposta: Response): Promise<FalhaDaPesquisa> {
  try {
    const corpo = (await resposta.json()) as { erro?: string };
    if (corpo.erro && corpo.erro in MENSAGEM_FALHA_DA_PESQUISA) {
      return corpo.erro as FalhaDaPesquisa;
    }
  } catch {
    // Resposta sem corpo JSON. O status conta o resto.
  }
  if (resposta.status === 401) return "sem-acesso";
  if (resposta.status === 400) return "fora-de-forma";
  return "sem-resposta";
}
