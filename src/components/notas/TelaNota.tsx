"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { orderBy, query, where } from "firebase/firestore";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Check,
  CircleAlert,
  ClipboardList,
  RotateCcw,
  ScanLine,
  Store,
  Undo2,
} from "lucide-react";
import { Bloco } from "@/components/ui/Bloco";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { EfeitoDoPreco } from "@/components/insumos/EfeitoDoPreco";
import { classesBotao } from "@/components/ui/estilosBotao";
import { BlocoCaixa } from "./BlocoCaixa";
import {
  COLUNAS_NOTA,
  LinhaNota,
  linhaCompleta,
  linhaEditada,
  linhaParaConferir,
  type LinhaEditada,
} from "./LinhaNota";
import { LendoANota, PortaDaNota, type FotoDaNota } from "./PortaDaNota";
import { RodapeNota, type ResumoDaNota } from "./RodapeNota";
import {
  efeitoDosPrecosNovos,
  type EfeitoNaFicha,
  type MaterialDeHoje,
} from "@/lib/domain/custoFicha";
import { calcularCustoInsumo } from "@/lib/domain/custoInsumo";
import { dataISODe } from "@/lib/domain/datas";
import { entradasDaNota } from "@/lib/domain/estoque";
import { formatarMoeda } from "@/lib/domain/money";
import {
  atualizacaoDaLinha,
  cabeNoCorpo,
  cadastroDaLinha,
  conferirTotal,
  idadeDosPrecos,
  ladoParaFotos,
  lancamentoDaNota,
  LIMITE_FOTOS,
  MENSAGEM_FALHA,
  normalizarNota,
  parearComInsumos,
  saltoDePreco,
  somarLinhas,
  type FalhaNota,
  type NotaLida,
  type RascunhoNota,
} from "@/lib/domain/notaFiscal";
import { guardarSemente } from "@/lib/estado/sementeDaContagem";
import { colFichas, colInsumos } from "@/lib/firebase/colecoes";
import { dadosDoInsumo } from "@/lib/firebase/mutations/insumos";
import {
  importarNota,
  type LinhaImportada,
  type ResultadoImportacao,
} from "@/lib/firebase/mutations/notas";
import { buscarLancamentoDaNota } from "@/lib/firebase/mutations/transacoes";
import { useColecao } from "@/lib/hooks/useColecao";
import { useConexao } from "@/lib/hooks/useDispositivo";
import type { FichaTecnica, Insumo, Transacao } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { prepararParaLeitura } from "@/lib/utils/imagem";
import {
  esquecerNotaCompartilhada,
  notaCompartilhada,
} from "@/lib/utils/notaCompartilhada";
import { useAuth, useContaId } from "@/providers/AuthProvider";

type Etapa = "escolher" | "lendo" | "conferindo" | "pronto";

interface Cabecalho {
  estabelecimento: string;
  cidade: string;
  dataISO: string;
  /**
   * Catorze dígitos, ou "" quando o verificador não fecha.
   *
   * Não é campo: ninguém digita CNPJ. Ele viaja no cabeçalho porque é dele que
   * sai a chave da guarda de duplicidade do caixa.
   */
  cnpj: string;
}

const CABECALHO_VAZIO: Cabecalho = {
  estabelecimento: "",
  cidade: "",
  dataISO: "",
  cnpj: "",
};

/** O que a espera mostra: as fotos, ou o nome do PDF, e o que ficou de fora. */
interface Escolhido {
  nome: string;
  fotos: FotoDaNota[];
  nota: string | null;
}

/** O que os quatro caminhos aceitam, o mesmo `accept` do seletor. */
function aceito(arquivo: File): boolean {
  return (
    arquivo.type.startsWith("image/") || arquivo.type === "application/pdf"
  );
}

/** O lançamento que a guarda achou, junto da chave que o pediu. */
interface Guarda {
  chave: string;
  achado: Transacao | null;
}

/**
 * Do papel ao insumo: fotografar, ler, conferir, corrigir, remover e cadastrar.
 *
 * É página e não painel, e isso contraria a invariante do `CLAUDE.md` de
 * propósito: aquela regra é sobre formulário de **um** objeto, e aqui são seis
 * a vinte objetos editáveis — em 360px isso não cabe numa folha inferior. É a
 * mesma razão pela qual `/fichas/[id]` e `/pedidos/[id]` são páginas.
 *
 * Nenhuma linha lida vira documento sem ela ter visto. O modelo é um
 * datilógrafo rápido, não uma testemunha.
 */
export function TelaNota() {
  const contaId = useContaId();
  const { usuario } = useAuth();
  const online = useConexao();
  const router = useRouter();

  const consulta = useMemo(
    () =>
      query(
        colInsumos(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );
  const { dados: insumos } = useColecao<Insumo>(consulta);

  // A mesma consulta de `/insumos` e de `ListaFichas`, para cair no mesmo cache.
  const consultaFichas = useMemo(
    () =>
      query(
        colFichas(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );
  const { dados: fichas } = useColecao<FichaTecnica>(consultaFichas);

  const [etapa, setEtapa] = useState<Etapa>("escolher");
  const [falha, setFalha] = useState<FalhaNota | null>(null);
  const [erroAoGravar, setErroAoGravar] = useState<string | null>(null);

  const [cabecalho, setCabecalho] = useState<Cabecalho>(CABECALHO_VAZIO);
  const [total, setTotal] = useState(0);
  const [linhas, setLinhas] = useState<LinhaEditada[]>([]);
  const [removidas, setRemovidas] = useState<LinhaEditada[]>([]);

  /** A chave da única linha aberta para corrigir (`#d292`). */
  const [aberta, setAberta] = useState<string | null>(null);
  /** Só a primeira com problema, ao chegar, é rolada à vista. */
  const rolarParaAberta = useRef(false);

  /**
   * `null` enquanto ela não tocar no bloco do caixa: aí vale o padrão, que é
   * ligado — e desligado quando a guarda achou a mesma nota já lançada. No
   * instante em que ela decide, a decisão dela para de se mexer sozinha. É o
   * mesmo par de estados de `precoManual` no editor de ficha (`#d21`).
   */
  const [lancamentoManual, setLancamentoManual] = useState<boolean | null>(
    null,
  );
  const [guarda, setGuarda] = useState<Guarda>({ chave: "", achado: null });

  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  /**
   * O efeito nos produtos, guardado ao cadastrar: depois de gravar, o "antes"
   * já é o preço novo e a conta daria zero.
   */
  const [efeitosGravados, setEfeitosGravados] = useState<EfeitoNaFicha[]>([]);

  /**
   * O que a compra trouxe, por `insumoId` e em unidade base.
   *
   * Só existe depois de gravar, e por um motivo: o id do insumo que nasce nesta
   * nota vem de `importarNota`. Antes disso o celofane não tem onde ser semeado.
   */
  const [entradas, setEntradas] = useState<Map<string, number>>(
    () => new Map(),
  );

  const [escolhido, setEscolhido] = useState<Escolhido | null>(null);

  /**
   * As partes da nota esperando "Ler a nota" (`#d293`). Ficam depois de uma
   * falha ou de "Cancelar": tentar de novo não pede fotografar de novo.
   */
  const [fotos, setFotos] = useState<FotoDaNota[]>([]);
  const [notaDaFaixa, setNotaDaFaixa] = useState<string | null>(null);

  /** A leitura em curso, para "Cancelar" e para quem sai da tela no meio. */
  const leitura = useRef<AbortController | null>(null);
  useEffect(() => () => leitura.current?.abort(), []);

  // Os `blob:` da faixa morrem com a tela. Criados e revogados nos eventos, e
  // não num efeito por foto: no `StrictMode` ele revogaria o que está à vista.
  const fotosAtuais = useRef<FotoDaNota[]>([]);
  useEffect(() => {
    fotosAtuais.current = fotos;
  }, [fotos]);
  useEffect(() => {
    const atuais = fotosAtuais;
    return () =>
      atuais.current.forEach((foto) => URL.revokeObjectURL(foto.miniatura));
  }, []);

  /**
   * O PDF que chegou pelo "Compartilhar" do Android (`#d294`), até uma leitura
   * dar certo: sem rede ele espera aqui, e depois de falha não se perde. Foto
   * compartilhada vai para a faixa, que já faz isso.
   */
  const [pdfCompartilhado, setPdfCompartilhado] = useState<File | null>(null);

  const chegouCompartilhada = useEffectEvent((arquivo: File) => {
    if (!aceito(arquivo)) return;
    const pdf = arquivo.type === "application/pdf";
    const espera: Escolhido = { nome: arquivo.name, fotos: [], nota: null };
    if (pdf) {
      setPdfCompartilhado(arquivo);
    } else {
      const foto = { arquivo, miniatura: URL.createObjectURL(arquivo) };
      setFotos([foto]);
      espera.fotos = [foto];
    }
    // `navigator`, e não `online`: na hidratação este ainda é o do servidor.
    if (navigator.onLine) void ler([arquivo], espera);
  });

  // O service worker guardou, a tela tira. Apaga só quem fica com o arquivo:
  // no `StrictMode` a primeira montagem desmonta antes da leitura do cache.
  useEffect(() => {
    let valendo = true;
    void notaCompartilhada().then(async (arquivo) => {
      if (!valendo || !arquivo) return;
      await esquecerNotaCompartilhada();
      chegouCompartilhada(arquivo);
    });
    return () => {
      valendo = false;
    };
  }, []);

  const hoje = dataISODe(new Date());
  const idade = useMemo(() => idadeDosPrecos(insumos, hoje), [insumos, hoje]);

  // O pareamento sai do nome **atual** da linha, e é refeito a cada tecla:
  // corrigir o nome é o que desfaz um pareamento errado, sem nenhum controle a
  // mais na tela.
  const pares = useMemo(
    () => parearComInsumos(linhas, insumos),
    [linhas, insumos],
  );

  const porId = useMemo(
    () => new Map(insumos.map((insumo) => [insumo.id, insumo])),
    [insumos],
  );

  /**
   * As linhas pareadas e completas, com o custo pela mesma conta do cartão e a
   * perda do material pareado: a nota não traz perda (`#d51`).
   */
  const pareadas = useMemo(
    () =>
      linhas.flatMap((linha) => {
        const par = pares.get(linha.chave);
        const anterior = par ? porId.get(par.insumoId) : undefined;
        if (!anterior || !linhaCompleta(linha)) return [];
        const custo = calcularCustoInsumo({
          precoCompra: linha.precoCompra,
          quantidadeCompra: linha.quantidadeCompra,
          unidadeCompra: linha.unidadeCompra,
          perdaPercentual: anterior.perdaPercentual,
        });
        return [{ anterior, custo }];
      }),
    [linhas, pares, porId],
  );

  // O que todos os preços novos fazem, de uma vez (`#d291`). Base trocada fica
  // de fora, como no formulário: as fichas medem na base gravada.
  const efeitos = useMemo(() => {
    const novos: MaterialDeHoje[] = pareadas
      .filter(
        ({ anterior, custo }) => custo.unidadeBase === anterior.unidadeBase,
      )
      .map(({ anterior, custo }) => ({
        id: anterior.id,
        nome: anterior.nome,
        custoUnidadeBaseCorrigido: custo.custoUnidadeBaseCorrigido,
      }));
    return novos.length > 0 ? efeitoDosPrecosNovos(fichas, insumos, novos) : [];
  }, [pareadas, fichas, insumos]);

  const resumo: ResumoDaNota = {
    linhas: linhas.length,
    atualizacoes: linhas.filter((linha) => pares.has(linha.chave)).length,
    incompletas: linhas.filter((linha) => !linhaCompleta(linha)).length,
    saltos: pareadas.filter(({ anterior, custo }) =>
      saltoDePreco(anterior, custo),
    ).length,
    conferencia: conferirTotal(linhas, total),
    removido: somarLinhas(removidas),
  };
  // Disjuntas: o salto só se mede em linha completa.
  const paraConferir = resumo.incompletas + resumo.saltos;

  // Um lançamento por nota, com o valor sendo a soma das linhas **mantidas** e
  // não o total impresso: o shampoo que ela tirou não é do negócio.
  const lancamento = useMemo(
    () => lancamentoDaNota(linhas, cabecalho, total),
    [linhas, cabecalho, total],
  );

  /**
   * A guarda contra lançar a mesma nota duas vezes.
   *
   * Refeita quando a chave muda, porque a data do cabeçalho é editável e é
   * metade dela. O achado carrega a chave que o pediu: enquanto a resposta da
   * chave nova não chega, a guarda da anterior não continua valendo.
   *
   * Falhar não é erro em tela: sem resposta a guarda simplesmente não vale,
   * como a consulta de CNPJ da 6A — o que ela protege é o caixa, e o cadastro
   * dos insumos nunca depende disso.
   */
  const chaveDaGuarda = lancamento.notaChave;
  const duplicado = guarda.chave === chaveDaGuarda ? guarda.achado : null;

  const lancarNoCaixa = lancamentoManual ?? duplicado === null;

  useEffect(() => {
    if (etapa !== "conferindo" || !chaveDaGuarda) return;

    let valendo = true;
    const responder = (achado: Transacao | null) => {
      if (valendo) setGuarda({ chave: chaveDaGuarda, achado });
    };

    void buscarLancamentoDaNota(contaId, chaveDaGuarda)
      .then(responder)
      .catch(() => responder(null));

    return () => {
      valendo = false;
    };
  }, [contaId, chaveDaGuarda, etapa]);

  // A linha aberta ao chegar, à vista: ela não acha o problema rolando.
  useEffect(() => {
    if (etapa !== "conferindo" || !aberta || !rolarParaAberta.current) return;
    rolarParaAberta.current = false;
    document
      .getElementById(`linha-${aberta}`)
      ?.scrollIntoView({ block: "center" });
  }, [etapa, aberta]);

  function recomecar() {
    setEtapa("escolher");
    setAberta(null);
    setFalha(null);
    setErroAoGravar(null);
    setLinhas([]);
    setRemovidas([]);
    setResultado(null);
    setEfeitosGravados([]);
    setEntradas(new Map());
    setTotal(0);
    setCabecalho(CABECALHO_VAZIO);
    setLancamentoManual(null);
  }

  function receber(rascunho: RascunhoNota) {
    setCabecalho({
      estabelecimento: rascunho.estabelecimento,
      cidade: rascunho.cidade,
      // Data ilegível não deixa o campo vazio: a compra é de hoje quase sempre,
      // e um campo de data em branco é mais trabalho do que uma data para
      // corrigir.
      dataISO: rascunho.dataISO || dataISODe(new Date()),
      cnpj: rascunho.cnpj,
    });
    setTotal(rascunho.total);
    const novas = rascunho.linhas.map(linhaEditada);
    setLinhas(novas);
    setRemovidas([]);

    // A primeira com problema chega aberta; sem problema, todas fechadas.
    const paresNovos = parearComInsumos(novas, insumos);
    const primeira = novas.find((linha) => {
      const par = paresNovos.get(linha.chave);
      return linhaParaConferir(
        linha,
        par ? porId.get(par.insumoId) : undefined,
      );
    });
    setAberta(primeira?.chave ?? null);
    rolarParaAberta.current = !!primeira;
    setLancamentoManual(null);
    setPdfCompartilhado(null);
    setEtapa("conferindo");
  }

  /**
   * Seletor, câmera, soltar e colar. Foto entra na faixa, em ordem, até
   * `LIMITE_FOTOS`; PDF entra sozinho e é lido na hora: ele já é a nota
   * inteira, e não se mistura com foto.
   */
  function receberArquivos(arquivos: File[]) {
    const aceitos = arquivos.filter(aceito);
    if (aceitos.length === 0) {
      if (arquivos.length > 0) setFalha("sem-arquivo");
      return;
    }
    setFalha(null);
    setPdfCompartilhado(null);

    const pdf = aceitos.find((arquivo) => arquivo.type === "application/pdf");
    if (pdf) {
      const misturado = aceitos.length > 1 || fotos.length > 0;
      void ler([pdf], {
        nome: pdf.name,
        fotos: [],
        nota: misturado ? "Lemos só o PDF." : null,
      });
      return;
    }

    const novas = aceitos
      .slice(0, LIMITE_FOTOS - fotos.length)
      .map((arquivo) => ({ arquivo, miniatura: URL.createObjectURL(arquivo) }));
    const deFora = aceitos.length - novas.length;
    setFotos([...fotos, ...novas]);
    setNotaDaFaixa(
      deFora > 0
        ? `${deFora === 1 ? "Uma foto ficou" : `${deFora} fotos ficaram`} de fora: uma nota se lê em até ${LIMITE_FOTOS} partes.`
        : null,
    );
  }

  function tirarFoto(indice: number) {
    const foto = fotos[indice];
    if (foto) URL.revokeObjectURL(foto.miniatura);
    setFotos(fotos.filter((_, atual) => atual !== indice));
    setNotaDaFaixa(null);
  }

  // Pelo ref: chamada ao fim da leitura, o `fotos` da closure é o de antes dela.
  function limparFotos() {
    fotosAtuais.current.forEach((foto) => URL.revokeObjectURL(foto.miniatura));
    setFotos([]);
    setNotaDaFaixa(null);
  }

  /** Abortado não é falha: volta para escolher, sem aviso. */
  function cancelar() {
    leitura.current?.abort();
    setEtapa("escolher");
  }

  async function ler(arquivos: File[], espera: Escolhido) {
    setFalha(null);

    if (!online) {
      setFalha("sem-rede");
      return;
    }
    if (!usuario) {
      setFalha("sem-acesso");
      return;
    }

    const controle = new AbortController();
    leitura.current = controle;
    setEscolhido(espera);
    setEtapa("lendo");

    try {
      // Uma por vez: quatro fotos de 12 MP decodificadas juntas estouram a
      // memória de celular barato. O lado cai com o número de fotos, para a
      // soma caber no corpo (`#d293`).
      const lado = ladoParaFotos(arquivos.length);
      const preparados = [];
      for (const arquivo of arquivos) {
        preparados.push(await prepararParaLeitura(arquivo, lado));
      }
      if (controle.signal.aborted) return;

      // Passou do teto do Vercel: o aviso sem subir nada, e sem gastar o dado.
      if (!cabeNoCorpo(preparados.map((preparado) => preparado.dados))) {
        setFalha("arquivo-grande");
        setEtapa("escolher");
        return;
      }

      const token = await usuario.getIdToken();

      const resposta = await fetch("/api/nota", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contaId, arquivos: preparados }),
        signal: controle.signal,
      });

      if (!resposta.ok) {
        const codigo = await codigoDaFalha(resposta);
        if (controle.signal.aborted) return;
        setFalha(codigo);
        setEtapa("escolher");
        return;
      }

      const lida = (await resposta.json()) as NotaLida;
      if (controle.signal.aborted) return;
      receber(normalizarNota(lida));
      limparFotos();
    } catch {
      // Cancelada, a tela já voltou. Rede caiu no meio, arquivo ilegível,
      // resposta truncada: para ela é a mesma coisa, e a mesma frase.
      if (controle.signal.aborted) return;
      setFalha("sem-resposta");
      setEtapa("escolher");
    } finally {
      if (leitura.current === controle) leitura.current = null;
    }
  }

  async function cadastrar() {
    setErroAoGravar(null);
    setSalvando(true);
    const efeitosAntes = efeitos;

    try {
      const importadas: LinhaImportada[] = linhas.map((linha) => {
        const par = pares.get(linha.chave);
        const anterior = par ? porId.get(par.insumoId) : undefined;

        // Uma nota traz preço. Ela não traz o que você configurou: perda,
        // estoque, categoria e o nome cadastrado vêm de `dadosDoInsumo` e só
        // são sobrescritos pelo que `atualizacaoDaLinha` deixa passar.
        if (anterior) {
          return {
            anterior,
            dados: {
              ...dadosDoInsumo(anterior),
              ...atualizacaoDaLinha(anterior, linha, cabecalho.estabelecimento),
            },
          };
        }

        return { dados: cadastroDaLinha(linha, cabecalho.estabelecimento) };
      });

      const gravado = await importarNota(
        contaId,
        importadas,
        lancarNoCaixa ? lancamento : null,
      );

      // O que entrou, para a oferta de contagem que vem a seguir. `insumoIds`
      // vem na ordem das linhas, e é o que dá endereço ao insumo que acabou de
      // nascer. A conta em si é do domínio: quantidade × embalagem, em unidade
      // base — duas embalagens de 500 g são 1000 g, e não 500.
      setEntradas(
        entradasDaNota(
          linhas.flatMap((linha, indice) => {
            const insumoId = gravado.insumoIds[indice];
            if (!insumoId) return [];
            return [
              {
                insumoId,
                embalagens: linha.embalagens,
                quantidadeCompra: linha.quantidadeCompra,
                unidadeCompra: linha.unidadeCompra,
              },
            ];
          }),
        ),
      );

      setResultado(gravado);
      setEfeitosGravados(efeitosAntes);
      setEtapa("pronto");
    } catch {
      setErroAoGravar(
        "Não deu para cadastrar agora. Nada foi gravado pela metade: tente de novo em instantes.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <CabecalhoPagina
        titulo={etapa === "conferindo" ? "Confira a leitura" : "Ler uma nota"}
        voltar={{ href: "/insumos", rotulo: "Materiais" }}
        acao={
          etapa === "conferindo" && (
            <Botao
              tamanho="sm"
              onClick={recomecar}
              iconeInicial={
                <RotateCcw aria-hidden className="size-4" strokeWidth={1.75} />
              }
            >
              Outra nota
            </Botao>
          )
        }
      />

      <div
        className={`mt-4 space-y-4 ${etapa === "conferindo" ? "pb-56 lg:pb-48" : ""}`}
      >
        {etapa === "escolher" && (
          <PortaDaNota
            online={online}
            idade={idade}
            temMateriais={insumos.length > 0}
            hoje={hoje}
            fotos={fotos}
            notaDaFaixa={notaDaFaixa}
            pdf={
              pdfCompartilhado && {
                nome: pdfCompartilhado.name,
                aoLer: () =>
                  void ler([pdfCompartilhado], {
                    nome: pdfCompartilhado.name,
                    fotos: [],
                    nota: null,
                  }),
                aoTirar: () => setPdfCompartilhado(null),
              }
            }
            aoReceber={receberArquivos}
            aoTirar={tirarFoto}
            aoLer={() =>
              void ler(
                fotos.map((foto) => foto.arquivo),
                { nome: fotos[0]?.arquivo.name ?? "", fotos, nota: null },
              )
            }
            aviso={
              // Sem rede a frase é uma só: dizer "a leitura falhou" por cima de
              // "não há internet" seria contar duas vezes a mesma coisa.
              !online ? (
                <Aviso>{MENSAGEM_FALHA["sem-rede"]}</Aviso>
              ) : (
                falha && <Aviso>{MENSAGEM_FALHA[falha]}</Aviso>
              )
            }
          />
        )}

        {etapa === "lendo" && escolhido && (
          <LendoANota
            nome={escolhido.nome}
            fotos={escolhido.fotos}
            nota={escolhido.nota}
            aoCancelar={cancelar}
          />
        )}

        {etapa === "conferindo" && (
          <>
            <Bloco
              icone={Store}
              titulo="A compra"
              descricao="Onde comprou vale para todas as linhas. Corrija aqui uma vez."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo
                  rotulo="Onde comprou"
                  value={cabecalho.estabelecimento}
                  placeholder="Mercado"
                  onChange={(evento) =>
                    setCabecalho((anterior) => ({
                      ...anterior,
                      estabelecimento: evento.target.value,
                    }))
                  }
                />
                <Campo
                  rotulo="Data da compra"
                  type="date"
                  value={cabecalho.dataISO}
                  onChange={(evento) =>
                    setCabecalho((anterior) => ({
                      ...anterior,
                      dataISO: evento.target.value,
                    }))
                  }
                />
              </div>

              {/* Cidade e UF não são campo: são a confirmação de que ela está
                  conferindo a nota que acha que está conferindo, e somem quando
                  a consulta de CNPJ não responde. O total impresso não depende
                  delas — ele veio do papel. */}
              {(cabecalho.cidade || total > 0) && (
                <p className="text-label text-ink-muted">
                  {cabecalho.cidade}
                  {cabecalho.cidade && total > 0 && (
                    <span className="mx-1.5 text-ink-subtle">·</span>
                  )}
                  {total > 0 && (
                    <span className="num">
                      Total impresso na nota: {formatarMoeda(total)}
                    </span>
                  )}
                </p>
              )}
            </Bloco>

            {linhas.length > 0 && (
              <section aria-label="As linhas da nota">
                <p className="num text-label text-ink-muted">
                  {linhas.length} {linhas.length === 1 ? "linha" : "linhas"}
                  {paraConferir > 0 && (
                    <>
                      {" · "}
                      <strong className="font-semibold text-ink">
                        {paraConferir} para conferir
                      </strong>
                    </>
                  )}
                </p>

                {/* Na ordem do papel: ela confere com a nota na mão. */}
                <div className="mt-2 overflow-hidden rounded-lg border border-line bg-surface">
                  {/* O cabeçalho das colunas é para quem vê: cada célula da
                      linha carrega o rótulo em `sr-only` (`#d225`). O vão da
                      direita é o do "×". */}
                  <div
                    aria-hidden
                    className="hidden border-b border-line text-micro font-semibold uppercase tracking-wide text-ink-muted xl:flex"
                  >
                    <div
                      className={cn(
                        "grid min-w-0 flex-1 gap-x-4 py-2 pl-4",
                        COLUNAS_NOTA,
                      )}
                    >
                      <span>Impresso</span>
                      <span>Material</span>
                      <span className="text-right">Quantidade</span>
                      <span className="text-right">Preço pago</span>
                      <span className="text-right">Preço por unidade</span>
                      <span className="text-right">O que acontece</span>
                    </div>
                    <span className="w-12 shrink-0" />
                  </div>

                  <ul className="divide-y divide-line">
                    {linhas.map((linha) => {
                      const par = pares.get(linha.chave);
                      return (
                        <LinhaNota
                          key={linha.chave}
                          linha={linha}
                          par={par}
                          anterior={par ? porId.get(par.insumoId) : undefined}
                          aberta={aberta === linha.chave}
                          aoAbrir={() => setAberta(linha.chave)}
                          aoFechar={() => setAberta(null)}
                          aoMudar={(mudanca) =>
                            setLinhas((anteriores) =>
                              anteriores.map((atual) =>
                                atual.chave === linha.chave
                                  ? { ...atual, ...mudanca }
                                  : atual,
                              ),
                            )
                          }
                          aoRemover={() => {
                            setLinhas((anteriores) =>
                              anteriores.filter(
                                (atual) => atual.chave !== linha.chave,
                              ),
                            );
                            setRemovidas((anteriores) => [
                              ...anteriores,
                              linha,
                            ]);
                            if (aberta === linha.chave) setAberta(null);
                          }}
                        />
                      );
                    })}
                  </ul>
                </div>
              </section>
            )}

            {removidas.length > 0 && (
              <ForaDaCompra
                linhas={removidas}
                aoTrazer={(chave) => {
                  const linha = removidas.find(
                    (atual) => atual.chave === chave,
                  );
                  if (!linha) return;
                  setRemovidas((anteriores) =>
                    anteriores.filter((atual) => atual.chave !== chave),
                  );
                  setLinhas((anteriores) =>
                    [...anteriores, linha].sort((a, b) =>
                      a.chave.localeCompare(b.chave, "pt-BR", {
                        numeric: true,
                      }),
                    ),
                  );
                }}
              />
            )}

            <EfeitoDoPreco
              efeitos={efeitos}
              titulo="O que esta compra muda nos seus produtos"
              nivel="h2"
              fecho={
                efeitos.length === 1
                  ? "Ao cadastrar, ele fica marcado para rever o preço em Produtos."
                  : "Ao cadastrar, eles ficam marcados para rever o preço em Produtos."
              }
            />

            {linhas.length > 0 && (
              <BlocoCaixa
                lancamento={lancamento}
                removido={resumo.removido}
                ligado={lancarNoCaixa}
                aoAlternar={setLancamentoManual}
                duplicado={duplicado}
              />
            )}

            {erroAoGravar && <Aviso>{erroAoGravar}</Aviso>}
          </>
        )}

        {etapa === "pronto" && resultado && (
          <Pronto
            resultado={resultado}
            efeitos={efeitosGravados}
            aoLerOutra={recomecar}
            aoGuardar={
              entradas.size > 0
                ? () => {
                    guardarSemente({ origem: "NOTA", entradas });
                    router.push("/insumos/contagem");
                  }
                : undefined
            }
          />
        )}
      </div>

      {etapa === "conferindo" && (
        <RodapeNota
          resumo={resumo}
          salvando={salvando}
          aoCadastrar={() => void cadastrar()}
        />
      )}
    </>
  );
}

/** O código da falha vem do corpo; o status é a reserva quando ele não vem. */
async function codigoDaFalha(resposta: Response): Promise<FalhaNota> {
  try {
    const corpo = (await resposta.json()) as { erro?: string };
    if (corpo.erro && corpo.erro in MENSAGEM_FALHA) {
      return corpo.erro as FalhaNota;
    }
  } catch {
    // Resposta sem corpo JSON. O status conta o resto.
  }

  if (resposta.status === 401) return "sem-acesso";
  if (resposta.status === 413) return "arquivo-grande";
  if (resposta.status === 422) return "fora-de-forma";
  return "sem-resposta";
}

function Aviso({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-attention/30 bg-attention-soft px-4 py-3 text-label text-ink"
    >
      <CircleAlert
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-attention"
        strokeWidth={1.75}
      />
      <span className="max-w-[60ch]">{children}</span>
    </p>
  );
}

/**
 * O que ela tirou da lista.
 *
 * Remover aqui não é apagar documento: não existe documento ainda, e a
 * invariante de nunca apagar não se aplica. O que se aplica é não perder o que
 * foi lido — daí o bloco, e daí "trazer de volta".
 */
function ForaDaCompra({
  linhas,
  aoTrazer,
}: {
  linhas: LinhaEditada[];
  aoTrazer: (chave: string) => void;
}) {
  return (
    <section
      aria-labelledby="fora-da-compra"
      className="overflow-hidden rounded-lg border border-line bg-surface"
    >
      <div className="border-b border-line px-4 pb-3 pt-4 lg:px-5">
        <h2
          id="fora-da-compra"
          className="text-subheading font-semibold text-ink"
        >
          {linhas.length}{" "}
          {linhas.length === 1
            ? "item fora desta compra"
            : "itens fora desta compra"}
        </h2>
        <p className="mt-1 max-w-[56ch] text-label text-ink-muted">
          Não viram cadastro e não entram na soma. Continuam aqui caso você
          tenha tirado sem querer.
        </p>
      </div>

      <ul className="divide-y divide-line">
        {linhas.map((linha) => (
          <li
            key={linha.chave}
            className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 lg:px-5"
          >
            <span className="min-w-0">
              <span className="block truncate text-body text-ink">
                {linha.nome}
              </span>
              <span className="num mt-0.5 block truncate text-label text-ink-muted">
                {formatarMoeda(linha.valorTotal)}
              </span>
            </span>
            <Botao
              tamanho="sm"
              onClick={() => aoTrazer(linha.chave)}
              iconeInicial={
                <Undo2 aria-hidden className="size-4" strokeWidth={1.75} />
              }
            >
              Trazer de volta
            </Botao>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * O fim da leitura, e o começo da despensa.
 *
 * A compra sabe **quanto entrou** e não sabe **o que saiu desde então**. Somar a
 * entrada ao estoque e gravar seria inventar a metade que falta — entrada
 * automática sem baixa automática deixa o número subindo para sempre. Então a
 * ação existe, vem primeiro, e leva a uma tela em que ela confirma: é o `#d17`
 * aplicado ao armário.
 */
function Pronto({
  resultado,
  efeitos,
  aoLerOutra,
  aoGuardar,
}: {
  resultado: ResultadoImportacao;
  /** O efeito nos produtos, calculado antes de gravar. */
  efeitos: EfeitoNaFicha[];
  aoLerOutra: () => void;
  /** Ausente quando nada da nota virou entrada — não há o que guardar. */
  aoGuardar?: () => void;
}) {
  const { criados, atualizados, fichasMarcadas, lancado } = resultado;

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <Check aria-hidden className="size-10 text-positive" strokeWidth={2} />
        <h2 className="mt-4 font-display text-title font-semibold text-ink">
          A compra virou cadastro
        </h2>

        <div className="mt-3 max-w-[46ch] space-y-1 text-body text-ink-muted">
          {criados > 0 && (
            <p>
              <strong className="num font-semibold text-ink">{criados}</strong>{" "}
              {criados === 1 ? "material novo" : "materiais novos"}.
            </p>
          )}
          {atualizados > 0 && (
            <p>
              <strong className="num font-semibold text-ink">
                {atualizados}
              </strong>{" "}
              {atualizados === 1
                ? "já existia e teve o preço atualizado"
                : "já existiam e tiveram o preço atualizado"}
              , com a compra guardada no histórico.
            </p>
          )}
          {/* Sem a lista (as fichas não tinham carregado), fica a contagem. */}
          {fichasMarcadas > 0 && efeitos.length === 0 && (
            <p>
              <strong className="num font-semibold text-ink">
                {fichasMarcadas}
              </strong>{" "}
              {fichasMarcadas === 1 ? "produto ficou" : "produtos ficaram"} com
              o custo desatualizado. Abra e salve para o preço acompanhar.
            </p>
          )}
          {lancado !== null && (
            <p>
              <strong className="num font-semibold text-ink">
                {formatarMoeda(lancado)}
              </strong>{" "}
              saíram do caixa nesta compra, e já aparecem no resultado do mês.
            </p>
          )}
        </div>

        {efeitos.length > 0 && (
          <div className="mt-6 w-full max-w-lg text-left">
            <EfeitoDoPreco
              efeitos={efeitos}
              titulo="O que esta compra mudou nos seus produtos"
              fecho={
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p>
                    {efeitos.length === 1
                      ? "Ele fica marcado para rever o preço em Produtos."
                      : "Eles ficam marcados para rever o preço em Produtos."}
                  </p>
                  <Link
                    href="/fichas"
                    className={classesBotao({
                      variante: "terciaria",
                      tamanho: "sm",
                      className: "-mr-3",
                    })}
                  >
                    Ver em Produtos
                  </Link>
                </div>
              }
            />
          </div>
        )}

        {aoGuardar && (
          <p className="mt-5 max-w-[46ch] text-label text-ink-muted">
            O que você comprou ainda não entrou na despensa. Guardar abre a
            contagem já preenchida com o que a nota trouxe. Você confere na
            prateleira e salva.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {aoGuardar && (
            <Botao
              variante="primaria"
              tamanho="lg"
              onClick={aoGuardar}
              iconeInicial={
                <ClipboardList
                  aria-hidden
                  className="size-5"
                  strokeWidth={1.75}
                />
              }
            >
              Guardar na despensa
            </Botao>
          )}
          <Botao
            variante={aoGuardar ? "secundaria" : "primaria"}
            tamanho="lg"
            onClick={aoLerOutra}
            iconeInicial={
              <ScanLine aria-hidden className="size-5" strokeWidth={1.75} />
            }
          >
            Ler outra nota
          </Botao>
          <Link
            href="/insumos"
            className={classesBotao({ variante: "secundaria", tamanho: "lg" })}
          >
            Ver os materiais
          </Link>
        </div>
      </div>
    </div>
  );
}
