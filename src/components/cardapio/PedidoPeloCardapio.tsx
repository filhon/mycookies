"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import {
  Check,
  MapPinOff,
  MessageCircle,
  Minus,
  PackageSearch,
  Plus,
  Tag,
} from "lucide-react";
import { AreaTexto, Campo, focarPrimeiroErro } from "@/components/ui/Campo";
import { Botao } from "@/components/ui/Botao";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Painel } from "@/components/ui/Painel";
import { Selo } from "@/components/ui/Selo";
import { classesBotao } from "@/components/ui/estilosBotao";
import { estiloDaLoja } from "./estiloDaLoja";
import {
  DIAS_A_FRENTE,
  economiaDoCombo,
  escolhasEmTexto,
  MENSAGEM_FALHA_PEDIDO_CARDAPIO,
  mensagemDeAviso,
  mensagemDeContato,
  type Cardapio,
  type CorDaLoja,
  type FalhaPedidoCardapio,
  type ProdutoDoCardapio,
  seloDaPromocao,
  unidadesPorFicha,
} from "@/lib/domain/cardapio";
import { dataDeISO, diaVizinho } from "@/lib/domain/datas";
import {
  cepFormatado,
  limparCep,
  type EnderecoDoCep,
  type TaxaParaCliente,
} from "@/lib/domain/entrega";
import { formatarMoeda } from "@/lib/domain/money";
import { FOTO_LADO_PX } from "@/lib/domain/orcamento";
import { subtotalDoItem } from "@/lib/domain/pedido";
import { linkDoWhatsApp, telefoneParaWhatsApp } from "@/lib/domain/whatsapp";
import { useDesktop } from "@/lib/hooks/useDispositivo";
import type { Centavos } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * O pedido pela página do cardápio (spec 031, 3.B.3): a única parte da página
 * que roda no navegador da cliente. Recebe o `Cardapio` sem foto nenhuma
 * dentro (`#d162`) e a data de amanhã, calculada no servidor em Brasília.
 *
 * O carrinho mora em `useState` e mais nada: `localStorage` aqui seria um
 * carrinho que volta no celular de outra pessoa.
 *
 * O desenho é o da sessão F (`#d166`): no celular, a lista e a barra "Ver
 * pedido" que abre a folha; no desktop, o pedido fica ao lado da lista, sem
 * painel. O formulário é um só, e mora onde a tela manda.
 */

type Tipo = "RETIRADA" | "ENTREGA";

/**
 * Os dias que viram botão em "Para quando?"; depois deles, "Outro dia". Sete e
 * mais ele fecham duas linhas de quatro, sem rolagem (`#d325`).
 */
const DIAS_EM_BOTAO = 7;

const DIA_DA_SEMANA = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });

/** Uma linha do carrinho: o produto e, no combo à escolha, os sabores de UMA unidade. */
interface Linha {
  chave: string;
  produto: ProdutoDoCardapio;
  escolhas?: { fichaId: string; nome: string; quantidade: number }[];
  quantidade: number;
}

type LinhaSemQuantidade = Omit<Linha, "quantidade">;

/** Duas Duplas com os mesmos sabores são a mesma linha; com sabores diferentes, duas. */
function chaveDa(produtoId: string, escolhas?: Linha["escolhas"]): string {
  if (!escolhas) return produtoId;
  const sabores = escolhas
    .map((e) => `${e.fichaId}:${e.quantidade}`)
    .sort()
    .join(",");
  return `${produtoId}|${sabores}`;
}

/** A linha do carrinho na forma que `unidadesPorFicha` conta. */
function comoItem(linha: Linha) {
  return {
    fichaTecnicaId: linha.produto.id,
    quantidade: linha.quantidade,
    escolhas: linha.escolhas?.map((e) => ({
      fichaTecnicaId: e.fichaId,
      quantidade: e.quantidade,
    })),
  };
}

/** A resposta de `/api/cardapio/entrega` para um CEP; `resposta: null` é não ter conseguido. */
interface ConsultaDoCep {
  cep: string;
  resposta: TaxaParaCliente | null;
}

/** O que ela digitou, sem o carrinho: é o que o recarregar do `mudou` guarda. */
interface DadosDaCliente {
  nome: string;
  telefone: string;
  data: string;
  outroDia: boolean;
  tipo: Tipo;
  endereco: string;
  observacoes: string;
  cep: string;
  numero: string;
  /** Guardada com o CEP: o recarregar não pergunta de novo. */
  consulta: ConsultaDoCep | null;
}

/** "Rua das Flores · Espinheiro · Recife": o que o CEP diz, sem o vazio. */
function enderecoEmTexto(endereco: EnderecoDoCep): string {
  return [endereco.logradouro, endereco.bairro, endereco.cidade]
    .map((parte) => parte.trim())
    .filter(Boolean)
    .join(" · ");
}

/**
 * "Rua das Flores, 10, ap. 2 · Espinheiro · Recife · CEP 52020-000": o número
 * entra depois da rua, e o CEP no fim. Nenhum campo novo no pedido (spec 118).
 */
function enderecoComCep(endereco: string, numero: string, cep: string): string {
  const [rua = "", ...resto] = endereco.split(" · ");
  const comNumero = [rua.trim(), numero.trim()].filter(Boolean).join(", ");
  return [comNumero, ...resto, `CEP ${cepFormatado(cep)}`].join(" · ");
}

const chaveDosDados = (contaId: string) => `rende:cardapio:${contaId}`;

/**
 * `sessionStorage`, e não `localStorage`: morre com a aba, então não volta no
 * celular emprestado. No servidor, ou sem armazenamento, lança e sai vazio.
 */
function lerDados(contaId: string): Partial<DadosDaCliente> {
  try {
    const texto = sessionStorage.getItem(chaveDosDados(contaId));
    return texto ? (JSON.parse(texto) as Partial<DadosDaCliente>) : {};
  } catch {
    return {};
  }
}

interface Enviado {
  codigo: string | null;
  total: Centavos;
  itens: {
    nome: string;
    quantidade: number;
    escolhas?: { quantidade: number; nomeSnapshot: string }[];
  }[];
  dataEntregaISO: string;
  entrega: Tipo;
  /** O servidor calculou a taxa, e `total` já a tem (spec 118). */
  entregaCalculada: boolean;
  /** O link do acompanhamento, absoluto (`#d320`); ausente no pote de mel. */
  link?: string;
}

export function PedidoPeloCardapio({
  contaId,
  cardapio,
  amanha,
  primeiro,
  pe,
}: {
  contaId: string;
  cardapio: Cardapio;
  amanha: string;
  /** `primeiroDiaDoCardapio`: amanhã, ou depois com a agenda cheia (`#d318`). */
  primeiro: string;
  /**
   * O pé da loja, no fim da coluna da lista (spec 120, `#d324`): termina onde
   * a lista termina no desktop e herda o `pb-24` da barra "Ver pedido".
   */
  pe?: ReactNode;
}) {
  const { negocio } = cardapio;
  const quem = negocio.quem || negocio.nome;
  const desktop = useDesktop();

  const [carrinho, setCarrinho] = useState<Linha[]>([]);
  const [aberto, setAberto] = useState(false);
  const [montando, setMontando] = useState<ProdutoDoCardapio | null>(null);
  const [vendo, setVendo] = useState<ProdutoDoCardapio | null>(null);

  // O formulário só existe no cliente (folha ou pedido ao lado, com carrinho):
  // ler o armazenamento aqui não desencontra a hidratação.
  const [guardado] = useState(() => lerDados(contaId));
  const [nome, setNome] = useState(guardado.nome ?? "");
  const [telefone, setTelefone] = useState(guardado.telefone ?? "");
  const [data, setData] = useState(guardado.data ?? "");
  const [outroDia, setOutroDia] = useState(guardado.outroDia ?? false);
  const [tipo, setTipo] = useState<Tipo>(guardado.tipo ?? "RETIRADA");
  const [endereco, setEndereco] = useState(guardado.endereco ?? "");
  const [observacoes, setObservacoes] = useState(guardado.observacoes ?? "");
  // O recado começa recolhido; com um já escrito (o recarregar do `mudou`), aberto.
  const [recadoAberto, setRecadoAberto] = useState(
    Boolean(guardado.observacoes),
  );
  const recado = useRef<HTMLDivElement>(null);
  const [site, setSite] = useState("");

  function abrirRecado() {
    // Desenha o campo antes de focar: o botão tocado some no mesmo render.
    flushSync(() => setRecadoAberto(true));
    recado.current?.querySelector("textarea")?.focus();
  }

  // O CEP (spec 118): só com a regra dela, que nunca chega aqui (`#d322`).
  const porCep = negocio.entregaPorCep === true;
  const [cep, setCep] = useState(guardado.cep ?? "");
  const [numero, setNumero] = useState(guardado.numero ?? "");
  const [consultaFeita, setConsultaFeita] = useState<ConsultaDoCep | null>(
    guardado.consulta ?? null,
  );
  /** O último CEP perguntado: a resposta de um anterior chega e é ignorada. */
  const perguntado = useRef<string | null>(null);
  const cepLimpo = porCep ? limparCep(cep) : null;
  const consulta =
    cepLimpo && consultaFeita?.cep === cepLimpo ? consultaFeita : null;
  const buscandoCep = cepLimpo !== null && consulta === null;
  const doCep = tipo === "ENTREGA" ? consulta?.resposta : null;
  const taxaVista = doCep?.tipo === "taxa" ? doCep.taxa : null;
  const foraDaArea = doCep?.tipo === "fora";

  async function consultarCep(limpo: string) {
    perguntado.current = limpo;
    let resposta: TaxaParaCliente | null = null;
    try {
      const r = await fetch("/api/cardapio/entrega", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contaId, cep: limpo }),
      });
      if (r.ok) resposta = (await r.json()) as TaxaParaCliente;
    } catch {
      // Sem rede: "a combinar", e o endereço à mão. Nada trava.
    }
    if (perguntado.current !== limpo) return;
    setConsultaFeita({ cep: limpo, resposta });
    if (resposta?.endereco) {
      setEndereco(enderecoEmTexto(resposta.endereco));
    }
  }

  function mudarCep(texto: string) {
    setCep(texto);
    const limpo = limparCep(texto);
    // O mesmo CEP só pergunta de novo quando da outra vez não deu.
    if (limpo && (limpo !== consultaFeita?.cep || !consultaFeita.resposta)) {
      void consultarCep(limpo);
    }
  }

  // Lido uma vez: um recarregar qualquer depois deste não repõe nada.
  useEffect(() => {
    try {
      sessionStorage.removeItem(chaveDosDados(contaId));
    } catch {
      // Sem armazenamento, nada a apagar.
    }
  }, [contaId]);

  const [enviando, setEnviando] = useState(false);
  const [erroTelefone, setErroTelefone] = useState<string>();
  const [falha, setFalha] = useState<FalhaPedidoCardapio | null>(null);
  const [enviado, setEnviado] = useState<Enviado | null>(null);

  const idFormulario = useId();

  const quantidadeTotal = carrinho.reduce((s, l) => s + l.quantidade, 0);
  const total = carrinho.reduce(
    (s, l) =>
      s +
      subtotalDoItem({
        quantidade: l.quantidade,
        precoUnitario: l.produto.preco,
      }),
    0,
  );
  const totalComEntrega = total + (taxaVista ?? 0);
  const itensEmTexto = `${quantidadeTotal} ${quantidadeTotal === 1 ? "item" : "itens"}`;

  const quantidadeDe = (chave: string) =>
    carrinho.find((l) => l.chave === chave)?.quantidade ?? 0;
  /** O combo à escolha soma as linhas dele, uma por combinação de sabores. */
  const noPedido = (produto: ProdutoDoCardapio) =>
    produto.escolhas
      ? carrinho
          .filter((l) => l.produto.id === produto.id)
          .reduce((s, l) => s + l.quantidade, 0)
      : quantidadeDe(produto.id);
  // O combo à escolha já abre o "Monte a sua", que tem a foto e a descrição:
  // uma ficha antes seria um passo a mais.
  const abrir = (produto: ProdutoDoCardapio) =>
    produto.escolhas ? setMontando(produto) : setVendo(produto);

  const todos = cardapio.secoes.flatMap((s) => s.produtos);
  const maisPedidos = (cardapio.maisPedidos ?? []).flatMap((id) =>
    todos.filter((p) => p.id === id),
  );

  // O que resta dos limitados, menos o que o carrinho já leva (`#d164`). A
  // página só desabilita o "+"; quem trava é o servidor.
  const restamPorId = new Map<string, number>();
  for (const produto of todos) {
    if (produto.restam !== undefined)
      restamPorId.set(produto.id, produto.restam);
    for (const opcao of (produto.escolhas ?? []).flatMap((e) => e.opcoes)) {
      if (opcao.restam !== undefined) restamPorId.set(opcao.id, opcao.restam);
    }
  }
  const levados = unidadesPorFicha(carrinho.map(comoItem), []);
  const livre = (fichaId: string) => {
    const restam = restamPorId.get(fichaId);
    return restam === undefined
      ? Infinity
      : restam - (levados.get(fichaId) ?? 0);
  };
  /** Mais `mais` unidades desta linha ainda cabem no que resta? */
  const cabe = (linha: LinhaSemQuantidade, mais: number) =>
    [...unidadesPorFicha([comoItem({ ...linha, quantidade: 1 })], [])].every(
      ([fichaId, leva]) => leva * mais <= livre(fichaId),
    );
  const cabeMaisUm = (linha: LinhaSemQuantidade) => cabe(linha, 1);

  function mudar(linha: LinhaSemQuantidade, passo: number) {
    const atual = quantidadeDe(linha.chave);
    const quantidade = Math.max(0, Math.min(500, atual + passo));
    const proximo =
      quantidade === 0
        ? carrinho.filter((l) => l.chave !== linha.chave)
        : atual === 0
          ? [...carrinho, { ...linha, quantidade }]
          : carrinho.map((l) =>
              l.chave === linha.chave ? { ...l, quantidade } : l,
            );
    setCarrinho(proximo);
    // Esvaziou dentro do painel: não há o que mandar.
    if (proximo.length === 0) setAberto(false);
  }

  function fechar() {
    setAberto(false);
    // Depois de enviar, fechar zera o carrinho. O nome e o WhatsApp ficam,
    // para um segundo pedido.
    if (enviado) {
      setCarrinho([]);
      setEnviado(null);
      setFalha(null);
    }
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (enviando || foraDaArea) return;
    if (!telefoneParaWhatsApp(telefone)) {
      setErroTelefone("Confira o número, com o DDD.");
      focarPrimeiroErro();
      return;
    }
    setErroTelefone(undefined);
    setFalha(null);
    setEnviando(true);

    try {
      const resposta = await fetch("/api/cardapio/pedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contaId,
          nome,
          telefone,
          itens: carrinho.map((l) => ({
            fichaId: l.produto.id,
            quantidade: l.quantidade,
            ...(l.escolhas
              ? {
                  escolhas: l.escolhas.map(({ fichaId, quantidade }) => ({
                    fichaId,
                    quantidade,
                  })),
                }
              : {}),
          })),
          dataEntregaISO: data,
          // A taxa nunca vai: o servidor a refaz pelo CEP (`#d160`).
          entrega:
            tipo === "RETIRADA"
              ? { tipo }
              : cepLimpo
                ? {
                    tipo,
                    endereco: enderecoComCep(endereco, numero, cepLimpo),
                    cep: cepLimpo,
                  }
                : { tipo, endereco },
          ...(observacoes.trim() ? { observacoes } : {}),
          ...(site ? { site } : {}),
        }),
      });

      if (!resposta.ok) {
        const codigo = await falhaDa(resposta);
        setFalha(codigo);
        // `acabou` é um `mudou`: a página renovada traz o que resta. O carrinho
        // recomeça, e o que ela digitou volta preenchido.
        if (codigo === "mudou" || codigo === "acabou") {
          const dados: DadosDaCliente = {
            nome,
            telefone,
            data,
            outroDia,
            tipo,
            endereco,
            observacoes,
            cep,
            numero,
            consulta: consultaFeita,
          };
          try {
            sessionStorage.setItem(
              chaveDosDados(contaId),
              JSON.stringify(dados),
            );
          } catch {
            // Sem armazenamento: recarrega do mesmo jeito, sem os dados.
          }
          setTimeout(() => location.reload(), 3000);
        }
        return;
      }

      const corpo = (await resposta.json()) as {
        codigo: string | null;
        total?: Centavos;
        entregaCalculada?: boolean;
        link?: string;
      };
      setEnviado({
        codigo: corpo.codigo,
        total: corpo.total ?? totalComEntrega,
        entregaCalculada: corpo.entregaCalculada ?? false,
        ...(corpo.link ? { link: location.origin + corpo.link } : {}),
        itens: carrinho.map((l) => ({
          nome: l.produto.nome,
          quantidade: l.quantidade,
          escolhas: l.escolhas?.map((e) => ({
            quantidade: e.quantidade,
            nomeSnapshot: e.nome,
          })),
        })),
        dataEntregaISO: data,
        entrega: tipo,
      });
    } catch {
      // `TypeError` do `fetch`: sem rede.
      setFalha("sem-rede");
    } finally {
      setEnviando(false);
    }
  }

  const linkContato =
    negocio.whatsapp &&
    linkDoWhatsApp(negocio.whatsapp, mensagemDeContato(negocio));

  const ultimoDia = diaVizinho(amanha, DIAS_A_FRENTE - 1);
  const dias = Array.from({ length: DIAS_EM_BOTAO }, (_, i) =>
    diaVizinho(primeiro, i),
  ).filter((dia) => dia <= ultimoDia);

  const corpo = enviado ? (
    <div className="space-y-4">
      {enviado.codigo && (
        <p className="flex flex-col gap-1">
          <span className="text-label text-ink-muted">Código do pedido</span>
          <span className="num text-heading font-semibold text-ink">
            {enviado.codigo}
          </span>
        </p>
      )}
      <p className="flex items-start gap-2 text-body text-ink">
        <Check
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-positive"
          strokeWidth={2}
        />
        {/* O pedido gravou, mas a dona só fica sabendo quando abrir o app.
            O aviso é o toque que falta, e é aqui que ele se perde. */}
        {negocio.whatsapp
          ? `O pedido chegou. Falta um toque: mande a mensagem para a ${quem} no WhatsApp, que é por lá que ela confirma.`
          : `O pedido chegou. A ${quem} vai confirmar pelo WhatsApp.`}
      </p>
    </div>
  ) : (
    <form
      id={idFormulario}
      onSubmit={(evento) => void enviar(evento)}
      className="space-y-8"
    >
      {/* Filete só entre itens: com um item, nenhum (`#d325`). */}
      <ul className="divide-y divide-line">
        {/* Trocar o sabor é tirar e montar de novo: um editor de
            escolha aqui seria um painel dentro de outro. */}
        {carrinho.map((linha) => (
          <li
            key={linha.chave}
            className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <p className="wrap-break-word text-body font-medium text-ink">
                {linha.produto.nome}
              </p>
              {/* Os sabores na linha de baixo, e não entre parênteses no
                  nome: numa coluna estreita, o nome espremia (`#d325`). */}
              {linha.escolhas && (
                <p className="wrap-break-word text-label text-ink-muted">
                  {linha.escolhas
                    .map((e) => `${e.quantidade} ${e.nome}`)
                    .join(" · ")}
                </p>
              )}
              <Dinheiro
                centavos={subtotalDoItem({
                  quantidade: linha.quantidade,
                  precoUnitario: linha.produto.preco,
                })}
                tamanho="sm"
                className="mt-1"
              />
            </div>
            <Passo
              nome={linha.produto.nome}
              quantidade={linha.quantidade}
              podeMais={linha.quantidade < 500 && cabeMaisUm(linha)}
              aoMudar={(passo) => mudar(linha, passo)}
            />
          </li>
        ))}
      </ul>

      <div className="space-y-4">
        <h3 className="text-subheading font-semibold text-ink">Seus dados</h3>
        <Campo
          rotulo="Seu nome"
          required
          minLength={2}
          maxLength={80}
          autoComplete="name"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <Campo
          rotulo="Seu WhatsApp"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(81) 98888-7777"
          erro={erroTelefone}
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-subheading font-semibold text-ink">
          Como e quando
        </h3>
        <fieldset className="space-y-3">
          <legend className="text-label font-medium text-ink">
            Como você recebe?
          </legend>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-sunken p-1">
            {(
              [
                ["RETIRADA", "Retiro"],
                ["ENTREGA", "Entrega"],
              ] as const
            ).map(([valor, rotulo]) => (
              <Opcao
                key={valor}
                name="tipo"
                marcada={tipo === valor}
                aoMarcar={() => setTipo(valor)}
                className="h-11 rounded-md"
              >
                {tipo === valor && (
                  <Check aria-hidden className="size-4" strokeWidth={2} />
                )}
                {rotulo}
              </Opcao>
            ))}
          </div>
          {tipo === "ENTREGA" && !porCep && (
            <Campo
              rotulo="Endereço"
              required
              minLength={5}
              maxLength={200}
              autoComplete="street-address"
              dica={`A taxa de entrega a ${quem} combina com você.`}
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
            />
          )}
          {tipo === "ENTREGA" && porCep && (
            <>
              <Campo
                rotulo="CEP"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="00000-000"
                maxLength={9}
                value={cep}
                onChange={(e) => mudarCep(e.target.value)}
              />
              {/* O que o CEP disse, lido em voz alta quando muda. */}
              <div aria-live="polite">
                {buscandoCep ? (
                  <p className="text-label text-ink-muted">Procurando o CEP…</p>
                ) : foraDaArea ? (
                  <div className="space-y-3">
                    <p className="flex items-start gap-2 text-body text-ink">
                      <MapPinOff
                        aria-hidden
                        className="mt-0.5 size-5 shrink-0 text-negative"
                        strokeWidth={1.75}
                      />
                      A {quem} não entrega nesse endereço. Você pode retirar.
                    </p>
                    <Botao larguraTotal onClick={() => setTipo("RETIRADA")}>
                      Mudar para retirar
                    </Botao>
                  </div>
                ) : taxaVista !== null ? (
                  <p className="num text-body text-ink">
                    Entrega:{" "}
                    <span className="font-semibold">
                      {formatarMoeda(taxaVista)}
                    </span>
                  </p>
                ) : consulta ? (
                  <p className="text-label text-ink-muted">
                    A taxa de entrega a {quem} combina com você.
                  </p>
                ) : null}
              </div>
              <Campo
                rotulo="Endereço"
                required
                minLength={5}
                maxLength={150}
                autoComplete="street-address"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
              />
              {doCep?.endereco && (
                <Campo
                  rotulo="Número e complemento"
                  required
                  maxLength={30}
                  autoComplete="address-line2"
                  placeholder="120, apto 302"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                />
              )}
            </>
          )}
        </fieldset>

        {/* Os próximos dias como botão, e o calendário só para quem precisa
          de um dia mais longe: a escolha comum custa um toque. */}
        <fieldset className="space-y-3">
          <legend className="text-label font-medium text-ink">
            Para quando?
          </legend>
          {/* Grade fixa de quatro: com a agenda curta, as células não esticam. */}
          <div className="grid grid-cols-4 gap-2">
            {dias.map((dia) => (
              <Opcao
                key={dia}
                name="dia"
                required
                marcada={!outroDia && data === dia}
                aoMarcar={() => {
                  setOutroDia(false);
                  setData(dia);
                }}
                className="h-16 flex-col gap-0 rounded-md border"
              >
                <span className="text-micro">
                  {dia === amanha ? "amanhã" : semana(dia)}
                </span>
                <span className="num text-body font-semibold">
                  {diaEMes(dia)}
                </span>
              </Opcao>
            ))}
            <Opcao
              name="dia"
              required
              marcada={outroDia}
              aoMarcar={() => {
                setOutroDia(true);
                setData("");
              }}
              className="h-16 rounded-md border px-2 text-center leading-tight"
            >
              Outro dia
            </Opcao>
          </div>
          {outroDia && (
            <Campo
              rotulo="Qual dia?"
              required
              type="date"
              min={primeiro}
              max={ultimoDia}
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          )}
          <p className="text-label text-ink-muted">
            A {quem} confirma se dá para esse dia.
          </p>
        </fieldset>
      </div>

      {/* Recolhido: a maioria não escreve, e uma área vazia grande pesa.
          O botão fica na ordem do formulário, achável (`#d325`). */}
      <div ref={recado} className="space-y-4">
        {recadoAberto ? (
          <AreaTexto
            rotulo={`Recado pra ${quem}`}
            dica="Opcional. Uma alergia, o nome pro cartão, o que precisar."
            maxLength={500}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        ) : (
          <Botao
            variante="terciaria"
            onClick={abrirRecado}
            className="-ml-4"
            iconeInicial={
              <Plus aria-hidden className="size-4" strokeWidth={1.75} />
            }
          >
            Recado pra {quem}
            <span className="text-label font-normal text-ink-muted">
              opcional
            </span>
          </Botao>
        )}
        <p className="text-label text-ink-muted">
          Seus dados vão só para {negocio.nome}, para combinar este pedido.
        </p>
      </div>

      {/* O pote de mel (`#d161`): fora da tela e da ordem de foco, com
          um nome que nenhum preenchedor automático conhece. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-9999px] size-px overflow-hidden"
      >
        <label>
          Site
          <input
            name="site"
            tabIndex={-1}
            autoComplete="off"
            value={site}
            onChange={(e) => setSite(e.target.value)}
          />
        </label>
      </div>
    </form>
  );

  const rodape = enviado ? (
    <div className="space-y-2 pb-4">
      {negocio.whatsapp && (
        <a
          href={linkDoWhatsApp(
            negocio.whatsapp,
            mensagemDeAviso({
              negocio: negocio.nome,
              codigo: enviado.codigo ?? "",
              nome,
              itens: enviado.itens,
              total: enviado.total,
              dataEntregaISO: enviado.dataEntregaISO,
              entrega: enviado.entrega,
              entregaCalculada: enviado.entregaCalculada,
              link: enviado.link,
            }),
          )}
          target="_blank"
          rel="noopener noreferrer"
          className={classesBotao({
            variante: "loja",
            tamanho: "lg",
            larguraTotal: true,
          })}
        >
          <MessageCircle aria-hidden className="size-5" strokeWidth={1.75} />
          Avisar a {quem} no WhatsApp
        </a>
      )}
      {/* Em aba nova: esta, com o "Avisar", continua aberta (`#d320`). */}
      {enviado.link && (
        <a
          href={enviado.link}
          target="_blank"
          rel="noopener"
          className={classesBotao({ tamanho: "lg", larguraTotal: true })}
        >
          <PackageSearch aria-hidden className="size-5" strokeWidth={1.75} />
          Acompanhar o pedido
        </a>
      )}
      {/* No celular, fechar a folha já zera; ao lado da lista não há folha. */}
      {desktop && (
        <Botao variante="terciaria" larguraTotal onClick={fechar}>
          Fazer outro pedido
        </Botao>
      )}
    </div>
  ) : (
    <div className="pb-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="text-label text-ink-muted">
          Total
          {tipo === "ENTREGA" && (
            <span className="block">
              {taxaVista !== null ? "com a entrega" : "sem a entrega"}
            </span>
          )}
        </span>
        <Dinheiro centavos={totalComEntrega} tamanho="xl" />
      </div>
      <Botao
        type="submit"
        form={idFormulario}
        variante="loja"
        tamanho="lg"
        larguraTotal
        carregando={enviando}
        // Fora da área, o "Mudar para retirar" está logo acima.
        disabled={foraDaArea}
      >
        {enviando ? "Enviando…" : "Enviar pedido"}
      </Botao>
      {falha ? (
        <div role="alert" className="mt-3 space-y-3">
          <p className="text-label text-negative">
            {MENSAGEM_FALHA_PEDIDO_CARDAPIO[falha]}
          </p>
          {(falha === "cheio" ||
            falha === "fechado" ||
            falha === "fora-da-area") &&
            linkContato && (
              <a
                href={linkContato}
                target="_blank"
                rel="noopener noreferrer"
                className={classesBotao({ larguraTotal: true })}
              >
                <MessageCircle
                  aria-hidden
                  className="size-5"
                  strokeWidth={1.75}
                />
                Falar no WhatsApp
              </a>
            )}
        </div>
      ) : (
        negocio.whatsapp && (
          <p className="mt-2 text-center text-label text-ink-muted">
            Depois você avisa a {quem} pelo WhatsApp, com o pedido já escrito.
          </p>
        )
      )}
    </div>
  );

  return (
    <>
      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start lg:gap-10">
        <div
          className={cn("px-4 lg:px-0", quantidadeTotal > 0 && "pb-24 lg:pb-0")}
        >
          {maisPedidos.length > 0 && (
            <MaisPedidos
              contaId={contaId}
              produtos={maisPedidos}
              noPedido={noPedido}
              aoAbrir={abrir}
            />
          )}

          {/* Âncoras, e não filtro: a lista é uma só, e a cliente rola. Sem
              "ativa", porque uma pílula que não segue a rolagem mente. */}
          {cardapio.secoes.length > 1 && (
            <nav
              aria-label="Categorias"
              // A página rola por baixo da barra: o foco e a âncora param
              // abaixo dela, e não atrás.
              className="sticky top-0 z-20 -mx-4 border-b border-line bg-canvas px-4 py-2 lg:mx-0 lg:px-0 [html:has(&)]:scroll-pt-16"
            >
              <div className="flex gap-2 overflow-x-auto">
                {cardapio.secoes.map((secao, i) => (
                  <a
                    key={secao.categoria}
                    href={`#secao-${i}`}
                    className="toque inline-flex shrink-0 items-center rounded-full border border-line-strong bg-surface px-4 text-label font-medium text-ink transition-colors duration-150 ease-quart hover:bg-sunken"
                  >
                    {secao.categoria}
                  </a>
                ))}
              </div>
            </nav>
          )}

          <div className="mt-2 space-y-10">
            {cardapio.secoes.map((secao, i) => (
              <section
                key={secao.categoria}
                id={`secao-${i}`}
                aria-label={secao.categoria}
                className="pt-4"
              >
                <h2 className="font-display text-heading font-semibold text-ink">
                  {secao.categoria}
                </h2>
                <ul className="mt-2 divide-y divide-line border-y border-line">
                  {secao.produtos.map((produto) => (
                    <Produto
                      key={produto.id}
                      contaId={contaId}
                      produto={produto}
                      hoje={diaVizinho(amanha, -1)}
                      quantidade={noPedido(produto)}
                      podeMais={
                        produto.escolhas
                          ? true
                          : cabeMaisUm({ chave: produto.id, produto })
                      }
                      aoMudar={(passo) =>
                        produto.escolhas
                          ? setMontando(produto)
                          : mudar({ chave: produto.id, produto }, passo)
                      }
                      aoAbrir={() => abrir(produto)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {pe}
        </div>

        {/* O pedido ao lado da lista, sem painel: no desktop cabe, e a
            cliente vê o total mudar a cada "Adicionar". A anatomia é a do
            `Painel`: o formulário rola, e o total com o "Enviar pedido" ficam
            fixos embaixo (`#d325`). */}
        <aside
          aria-label="Seu pedido"
          className="hidden rounded-lg border border-line bg-surface lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100dvh-3rem)] lg:flex-col"
        >
          {desktop && (
            <>
              <div className="flex shrink-0 items-baseline justify-between gap-3 border-b border-line px-5 py-4">
                <h2 className="font-display text-heading font-semibold text-ink">
                  {enviado ? "Pedido enviado" : "Seu pedido"}
                </h2>
                {!enviado && quantidadeTotal > 0 && (
                  <span className="num text-label text-ink-muted">
                    {itensEmTexto}
                  </span>
                )}
              </div>
              {carrinho.length === 0 && !enviado ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-body font-semibold text-ink">
                    Nada no pedido ainda
                  </p>
                  <p className="mt-1 text-label text-ink-muted">
                    O que você adicionar aparece aqui, com o total.
                  </p>
                </div>
              ) : (
                <>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
                    {corpo}
                  </div>
                  <div className="shrink-0 border-t border-line px-5 pt-4">
                    {rodape}
                  </div>
                </>
              )}
            </>
          )}
        </aside>
      </div>

      {quantidadeTotal > 0 && (
        <div className="area-segura-inferior fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas px-4 pt-3 lg:hidden [html:has(&)]:scroll-pb-24">
          <div className="mx-auto w-full max-w-xl pb-3">
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setAberto(true)}
              className={classesBotao({
                variante: "loja",
                tamanho: "lg",
                larguraTotal: true,
                className: "num justify-between rounded-lg",
              })}
            >
              <span>Ver pedido · {itensEmTexto}</span>
              <span className="font-semibold">
                {formatarMoeda(totalComEntrega)}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* O painel monta fechado, e no desktop o formulário já está ao lado da
          lista: dois `<form>` com o mesmo id mandariam o pedido pelo errado. */}
      <Painel
        aberto={aberto && !desktop}
        aoFechar={fechar}
        titulo={enviado ? "Pedido enviado" : "Seu pedido"}
        rodape={!desktop && <NaCor cor={negocio.cor}>{rodape}</NaCor>}
      >
        {!desktop && <NaCor cor={negocio.cor}>{corpo}</NaCor>}
      </Painel>

      <FichaNaVitrine
        contaId={contaId}
        cor={negocio.cor}
        hoje={diaVizinho(amanha, -1)}
        produto={vendo}
        atual={vendo ? quantidadeDe(vendo.id) : 0}
        cabe={(quantidade) =>
          vendo !== null &&
          cabe(
            { chave: vendo.id, produto: vendo },
            quantidade - quantidadeDe(vendo.id),
          )
        }
        aoFechar={() => setVendo(null)}
        aoPor={(quantidade) => {
          const produto = vendo!;
          mudar(
            { chave: produto.id, produto },
            quantidade - quantidadeDe(produto.id),
          );
          setVendo(null);
        }}
      />

      <MonteOCombo
        contaId={contaId}
        cor={negocio.cor}
        produto={montando}
        livre={livre}
        aoFechar={() => setMontando(null)}
        aoPor={(escolhas) => {
          const produto = montando!;
          mudar({ chave: chaveDa(produto.id, escolhas), produto, escolhas }, 1);
          setMontando(null);
        }}
      />
    </>
  );
}

/** "sex", sem o ponto da abreviação. */
function semana(iso: string): string {
  return DIA_DA_SEMANA.format(dataDeISO(iso)).replace(".", "");
}

/** "25/9". */
function diaEMes(iso: string): string {
  const data = dataDeISO(iso);
  return `${data.getDate()}/${data.getMonth() + 1}`;
}

/**
 * Um rádio com cara de botão. A marcada vai na cor da loja, e quem diz qual é
 * a marcada é o rádio de verdade por baixo, e não só a cor.
 */
function Opcao({
  name,
  marcada,
  aoMarcar,
  required,
  className,
  children,
}: {
  name: string;
  marcada: boolean;
  aoMarcar: () => void;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-center gap-1.5 text-body font-medium",
        "transition-colors duration-150 ease-quart",
        "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--focus)",
        marcada
          ? "border-loja bg-loja text-on-loja"
          : "border-line-strong bg-surface text-ink hover:bg-sunken",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        required={required}
        checked={marcada}
        onChange={aoMarcar}
        className="sr-only"
      />
      {children}
    </label>
  );
}

/** O `Painel` abre num portal, fora do `<main>` que carrega a cor da loja. */
function NaCor({
  cor,
  children,
}: {
  cor: CorDaLoja | undefined;
  children: ReactNode;
}) {
  return (
    <div style={estiloDaLoja(cor)} className="contents">
      {children}
    </div>
  );
}

/**
 * "Monte a sua Dupla" (spec 031, 4.C.3): uma seção por escolha, o "+" travado
 * quando a categoria enche (a regra de `escolhasCompletas`), o que falta em
 * texto e a economia da combinação escolhida, quando a página sabe a conta.
 */
function MonteOCombo({
  contaId,
  cor,
  produto,
  livre,
  aoFechar,
  aoPor,
}: {
  contaId: string;
  cor: CorDaLoja | undefined;
  produto: ProdutoDoCardapio | null;
  /** Quantas desta receita o carrinho ainda pode levar; `Infinity` sem limite. */
  livre: (fichaId: string) => number;
  aoFechar: () => void;
  aoPor: (escolhas: NonNullable<Linha["escolhas"]>) => void;
}) {
  const [sabores, setSabores] = useState<Record<string, number>>({});
  // Um combo novo começa do zero; o mesmo reaberto também.
  const [de, setDe] = useState<ProdutoDoCardapio | null>(null);
  if (produto !== de) {
    setDe(produto);
    setSabores({});
  }

  const escolhas = produto?.escolhas ?? [];
  const faltam = escolhas.map(
    (escolha) =>
      escolha.quantidade -
      escolha.opcoes.reduce((s, o) => s + (sabores[o.id] ?? 0), 0),
  );
  const completo = faltam.every((f) => f === 0);

  const montadas = escolhas.flatMap((escolha) =>
    escolha.opcoes
      .filter((o) => (sabores[o.id] ?? 0) > 0)
      .map((o) => ({
        fichaId: o.id,
        nome: o.nome,
        quantidade: sabores[o.id]!,
      })),
  );
  const economia =
    produto && completo ? economiaDoCombo(produto, montadas) : null;

  return (
    <Painel
      aberto={produto !== null}
      aoFechar={aoFechar}
      titulo={produto ? `Monte a sua ${produto.nome}` : ""}
      rodape={
        <div style={estiloDaLoja(cor)} className="pb-4">
          {economia !== null && economia > 0 && produto && (
            <p className="num mb-3 text-label text-ink-muted">
              Separados sairiam {formatarMoeda(produto.preco + economia)} · você
              economiza {formatarMoeda(economia)}
            </p>
          )}
          <Botao
            variante="loja"
            tamanho="lg"
            larguraTotal
            disabled={!completo}
            onClick={() => aoPor(montadas)}
          >
            Pôr no pedido
          </Botao>
        </div>
      }
    >
      <div className="space-y-8">
        {produto && (produto.fotoVersao !== undefined || produto.descricao) && (
          <div className="space-y-4">
            {produto.fotoVersao !== undefined && (
              <FotoGrande
                contaId={contaId}
                id={produto.id}
                versao={produto.fotoVersao}
              />
            )}
            {produto.descricao && <Descricao texto={produto.descricao} />}
          </div>
        )}
        {escolhas.map((escolha, i) => (
          <fieldset key={escolha.categoria}>
            <legend className="text-label font-semibold uppercase tracking-[0.08em] text-ink-muted">
              Escolha {escolha.quantidade} · {escolha.categoria}
            </legend>
            <p
              aria-live="polite"
              className="mt-1 flex items-center gap-1.5 text-label text-ink-muted"
            >
              {faltam[i]! > 0 ? (
                `Falta escolher ${faltam[i]}`
              ) : (
                <>
                  <Check
                    aria-hidden
                    className="size-4 text-positive"
                    strokeWidth={2}
                  />
                  Escolhido
                </>
              )}
            </p>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {escolha.opcoes.map((opcao) => {
                const escolhidas = sabores[opcao.id] ?? 0;
                return (
                  <li key={opcao.id} className="flex items-center gap-3 py-3">
                    {opcao.fotoVersao !== undefined && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={urlDaFoto(contaId, opcao.id, opcao.fotoVersao)}
                        // O nome está ao lado.
                        alt=""
                        width={48}
                        height={48}
                        loading="lazy"
                        decoding="async"
                        className={cn(
                          "size-12 shrink-0 rounded-md bg-sunken object-cover",
                          opcao.restam === 0 && "opacity-45",
                        )}
                      />
                    )}
                    <p
                      className={cn(
                        "min-w-0 flex-1 wrap-break-word text-body font-medium",
                        opcao.restam === 0 ? "text-ink-muted" : "text-ink",
                      )}
                    >
                      {opcao.nome}
                    </p>
                    {opcao.restam === 0 ? (
                      <span className="text-label font-medium text-ink-muted">
                        Esgotado
                      </span>
                    ) : (
                      <Passo
                        nome={opcao.nome}
                        quantidade={escolhidas}
                        podeMais={
                          faltam[i]! > 0 && escolhidas + 1 <= livre(opcao.id)
                        }
                        aoMudar={(passo) =>
                          setSabores({
                            ...sabores,
                            [opcao.id]: Math.max(0, escolhidas + passo),
                          })
                        }
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}
      </div>
    </Painel>
  );
}

/** O corpo diz o código; sem corpo, o status decide. */
async function falhaDa(resposta: Response): Promise<FalhaPedidoCardapio> {
  try {
    const corpo = (await resposta.json()) as { erro?: string };
    if (corpo.erro && corpo.erro in MENSAGEM_FALHA_PEDIDO_CARDAPIO) {
      return corpo.erro as FalhaPedidoCardapio;
    }
  } catch {
    // Resposta sem corpo JSON.
  }
  return resposta.status === 400 ? "fora-de-forma" : "sem-resposta";
}

/** A rota da foto (`#d162`): a página nunca leva a foto dentro. */
function urlDaFoto(contaId: string, fichaId: string, versao: number): string {
  return `/c/${encodeURIComponent(contaId)}/foto/${encodeURIComponent(fichaId)}?v=${versao}`;
}

/** A foto da ficha e do "Monte a sua": quadrada, no lado que a foto gravada tem. */
function FotoGrande({
  contaId,
  id,
  versao,
}: {
  contaId: string;
  id: string;
  versao: number;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={urlDaFoto(contaId, id, versao)}
      // O nome é o título do painel.
      alt=""
      width={FOTO_LADO_PX}
      height={FOTO_LADO_PX}
      decoding="async"
      className="mx-auto aspect-square w-full max-w-80 rounded-lg bg-sunken object-cover"
    />
  );
}

/** A descrição inteira, com as quebras de linha que ela escreveu. */
function Descricao({ texto }: { texto: string }) {
  return (
    <p className="max-w-[68ch] whitespace-pre-line text-body text-ink">
      {texto}
    </p>
  );
}

/**
 * A foto da linha. O combo sem foto mostra as opções dele que têm (`#d315`):
 * uma ocupa o quadrado, duas a quatro dividem em 2 × 2. Sem nenhuma, nada.
 */
function Retrato({
  contaId,
  produto,
  className,
}: {
  contaId: string;
  produto: ProdutoDoCardapio;
  className?: string;
}) {
  const fotos =
    produto.fotoVersao !== undefined
      ? new Map([[produto.id, produto.fotoVersao]])
      : new Map(
          (produto.escolhas ?? [])
            .flatMap((e) => e.opcoes)
            .flatMap((o) =>
              o.fotoVersao === undefined ? [] : [[o.id, o.fotoVersao] as const],
            ),
        );
  const quatro = [...fotos].slice(0, 4);
  if (quatro.length === 0) return null;
  return (
    <div
      className={cn(
        "grid size-26 shrink-0 gap-px overflow-hidden rounded-md bg-sunken lg:size-32",
        quatro.length > 1 && "grid-cols-2 grid-rows-2",
        className,
      )}
    >
      {quatro.map(([id, versao]) => (
        // Sem `next/image`: a foto já tem 320px (`#d162`).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={id}
          src={urlDaFoto(contaId, id, versao)}
          // O nome já está no título ao lado.
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ))}
    </div>
  );
}

/** O preço com o riscado, a unidade quando não é "un", o selo e o "Restam". */
function PrecoDoProduto({
  produto,
  hoje,
}: {
  produto: ProdutoDoCardapio;
  hoje: string;
}) {
  const selo = seloDaPromocao(produto, hoje);
  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-1.5">
        {/* O riscado é o preço de sempre da ficha, e nunca um "de"
            inventado (`#d165`). */}
        {produto.precoCheio !== undefined && (
          <s className="num text-label text-ink-muted">
            <span className="sr-only">antes </span>
            {formatarMoeda(produto.precoCheio)}
          </s>
        )}
        <Dinheiro centavos={produto.preco} />
        {/* "· un" em todo preço não informa; "· porção" sim (`#d315`). */}
        {produto.unidade !== "un" && (
          <span className="text-label text-ink-muted">· {produto.unidade}</span>
        )}
      </p>
      {selo && (
        <Selo
          icone={<Tag aria-hidden className="size-3.5" strokeWidth={2} />}
          className="num mt-1"
        >
          {selo}
        </Selo>
      )}
      {/* Contado do pote, e só do que ela marcou como limitado (`#d164`). */}
      {produto.restam !== undefined && produto.restam > 0 && (
        <p className="num text-label text-ink-muted">Restam {produto.restam}</p>
      )}
    </div>
  );
}

/** A economia do kit fixo, contra o preço que a própria página cobra (`#d163`). */
function EconomiaDoKit({ produto }: { produto: ProdutoDoCardapio }) {
  if (produto.avulso === undefined) return null;
  return (
    <p className="num mt-1 text-label text-ink-muted">
      Separados sairiam {formatarMoeda(produto.avulso)} · você economiza{" "}
      {formatarMoeda(produto.avulso - produto.preco)}
    </p>
  );
}

/**
 * A ficha do produto (spec 112, `#d315`): a foto grande, a descrição inteira e
 * o passo, com o mesmo `mudar` da linha. Começa no que o carrinho já tem, ou
 * em 1; o "+" para no que resta.
 */
function FichaNaVitrine({
  contaId,
  cor,
  hoje,
  produto,
  atual,
  cabe,
  aoFechar,
  aoPor,
}: {
  contaId: string;
  cor: CorDaLoja | undefined;
  hoje: string;
  produto: ProdutoDoCardapio | null;
  /** Quantas o carrinho já tem. */
  atual: number;
  /** A quantidade inteira ainda cabe no que resta? */
  cabe: (quantidade: number) => boolean;
  aoFechar: () => void;
  aoPor: (quantidade: number) => void;
}) {
  const [quantidade, setQuantidade] = useState(1);
  // Cada abertura recomeça do carrinho, como o "Monte a sua".
  const [de, setDe] = useState<ProdutoDoCardapio | null>(null);
  if (produto !== de) {
    setDe(produto);
    setQuantidade(Math.max(atual, 1));
  }

  const esgotado = produto?.restam === 0;
  const valor = produto
    ? formatarMoeda(
        subtotalDoItem({ quantidade, precoUnitario: produto.preco }),
      )
    : "";
  const rotulo =
    atual === 0
      ? `Pôr no pedido · ${valor}`
      : quantidade === 0
        ? "Tirar do pedido"
        : `Atualizar o pedido · ${valor}`;

  return (
    <Painel
      aberto={produto !== null}
      aoFechar={aoFechar}
      titulo={produto?.nome ?? ""}
      rodape={
        produto && (
          <div
            style={estiloDaLoja(cor)}
            className="flex items-center gap-3 pb-4"
          >
            {esgotado ? (
              <p className="text-body font-medium text-ink-muted">Esgotado</p>
            ) : (
              <>
                <Passo
                  nome={produto.nome}
                  quantidade={quantidade}
                  // Fora do pedido, o mínimo é 1: tirar é coisa de quem já pôs.
                  podeMenos={quantidade > (atual === 0 ? 1 : 0)}
                  podeMais={quantidade < 500 && cabe(quantidade + 1)}
                  aoMudar={(passo) => setQuantidade(quantidade + passo)}
                />
                <Botao
                  variante="loja"
                  tamanho="lg"
                  className="num min-w-0 flex-1"
                  onClick={() => aoPor(quantidade)}
                >
                  {rotulo}
                </Botao>
              </>
            )}
          </div>
        )
      }
    >
      {produto && (
        <div className="space-y-4">
          {produto.fotoVersao !== undefined && (
            <FotoGrande
              contaId={contaId}
              id={produto.id}
              versao={produto.fotoVersao}
            />
          )}
          {produto.descricao && <Descricao texto={produto.descricao} />}
          <div>
            <EconomiaDoKit produto={produto} />
            <div className="mt-2">
              <PrecoDoProduto produto={produto} hoje={hoje} />
            </div>
          </div>
        </div>
      )}
    </Painel>
  );
}

/**
 * Os mais pedidos (spec 113, `#d316`): a primeira tela do celular com doce.
 * Grade de três, nunca carrossel; a peça inteira abre a ficha, e não tem
 * "Adicionar": o controle mora na linha e na ficha, e dois do mesmo produto na
 * mesma tela confundem. É atalho: o produto continua na seção dele.
 */
function MaisPedidos({
  contaId,
  produtos,
  noPedido,
  aoAbrir,
}: {
  contaId: string;
  produtos: ProdutoDoCardapio[];
  noPedido: (produto: ProdutoDoCardapio) => number;
  aoAbrir: (produto: ProdutoDoCardapio) => void;
}) {
  const idTitulo = useId();
  return (
    <section aria-labelledby={idTitulo} className="pb-6">
      <h2
        id={idTitulo}
        className="font-display text-heading font-semibold text-ink"
      >
        Os mais pedidos
      </h2>
      <ul className="mt-3 grid grid-cols-3 gap-3 lg:gap-4">
        {produtos.map((produto) => {
          const quantidade = noPedido(produto);
          return (
            <li key={produto.id}>
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => aoAbrir(produto)}
                className="group flex w-full flex-col rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus)"
              >
                {/* Na primeira tela: sem `loading="lazy"`. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urlDaFoto(contaId, produto.id, produto.fotoVersao!)}
                  // O nome está logo abaixo.
                  alt=""
                  width={FOTO_LADO_PX}
                  height={FOTO_LADO_PX}
                  decoding="async"
                  className="aspect-square w-full rounded-md bg-sunken object-cover transition-opacity duration-150 ease-quart group-hover:opacity-90"
                />
                <span className="mt-2 line-clamp-2 wrap-break-word text-label font-semibold text-ink">
                  {produto.nome}
                </span>
                <Dinheiro centavos={produto.preco} className="mt-0.5" />
                {quantidade > 0 && (
                  <span className="num text-label text-ink-muted">
                    {quantidade} no pedido
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Uma linha de lista, com a foto à direita e só foto: o "+" não flutua sobre
 * ela, porque sem foto ele flutuaria no nada (`#d166`). No celular, o preço e o
 * controle ocupam a linha de baixo inteira: a 360px, ao lado da foto,
 * espremeriam. No desktop sobem para a coluna do texto, e a linha tem a altura
 * da foto (`#d315`).
 *
 * O nome é o botão que abre a ficha, e o alvo dele cobre a linha inteira; o
 * controle fica por cima, alvo próprio: dois alvos, nenhum dentro do outro.
 */
function Produto({
  contaId,
  produto,
  hoje,
  quantidade,
  podeMais,
  aoMudar,
  aoAbrir,
}: {
  contaId: string;
  produto: ProdutoDoCardapio;
  /** O dia de Brasília, para "termina hoje". */
  hoje: string;
  quantidade: number;
  /** Falso quando o carrinho já leva tudo o que resta (`#d164`). */
  podeMais: boolean;
  aoMudar: (passo: number) => void;
  aoAbrir: () => void;
}) {
  const esgotado = produto.restam === 0;

  // "Adicionar" vira `− 1 +`, e o `−` no 1 volta a ser "Adicionar": o botão
  // tocado some. O foco vai para o controle novo, e não para o `body`.
  const controle = useRef<HTMLDivElement>(null);
  const devolverFoco = useRef(false);
  useEffect(() => {
    if (!devolverFoco.current) return;
    devolverFoco.current = false;
    const botoes = controle.current?.querySelectorAll<HTMLElement>(
      "button:not(:disabled)",
    );
    botoes?.[botoes.length - 1]?.focus();
  }, [quantidade]);

  const aoTocar = (passo: number) => {
    if (!produto.escolhas && (quantidade === 0 || quantidade + passo === 0)) {
      devolverFoco.current = true;
    }
    aoMudar(passo);
  };

  return (
    <li className="relative grid grid-cols-[minmax(0,1fr)_auto] py-4 lg:grid-rows-[auto_1fr]">
      <div className="col-start-1 row-start-1">
        <h3 className="wrap-break-word text-body font-semibold text-ink">
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={aoAbrir}
            className="text-left after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-(--focus)"
          >
            {produto.nome}
          </button>
        </h3>
        {produto.descricao && (
          <p className="mt-1 line-clamp-3 text-label text-ink-muted">
            {produto.descricao}
          </p>
        )}
        <EconomiaDoKit produto={produto} />
        {produto.escolhas && (
          <p className="num mt-1 text-label text-ink-muted">
            {escolhasEmTexto(produto.escolhas)}
            {produto.economiaMinima !== undefined &&
              ` · economize pelo menos ${formatarMoeda(produto.economiaMinima)}`}
          </p>
        )}
      </div>
      <Retrato
        contaId={contaId}
        produto={produto}
        // Margem, e não `gap`: sem foto, a coluna vazia não rouba 16px do texto.
        className="col-start-2 row-start-1 ml-4 lg:row-span-2"
      />

      <div
        ref={controle}
        className="col-span-2 mt-3 flex items-center justify-between gap-3 lg:col-span-1 lg:col-start-1 lg:row-start-2 lg:self-start"
      >
        <PrecoDoProduto produto={produto} hoje={hoje} />
        {/* O combo à escolha sempre abre "Monte a sua": cada unidade pode ter
            outros sabores, e a quantidade dele mora no pedido. */}
        {esgotado ? (
          <span className="text-label font-medium text-ink-muted">
            Esgotado
          </span>
        ) : quantidade === 0 || produto.escolhas ? (
          <div className="relative flex items-center gap-2">
            {quantidade > 0 && (
              <span className="num text-label text-ink-muted">
                {quantidade} no pedido
              </span>
            )}
            <Botao
              tamanho="sm"
              disabled={!podeMais}
              onClick={() => aoTocar(1)}
              aria-haspopup={produto.escolhas ? "dialog" : undefined}
              aria-label={`Adicionar ${produto.nome}`}
              iconeInicial={
                <Plus aria-hidden className="size-4" strokeWidth={1.75} />
              }
            >
              Adicionar
            </Botao>
          </div>
        ) : (
          // Na cor da loja: o que já está no pedido é o que tem cor na lista.
          <Passo
            nome={produto.nome}
            quantidade={quantidade}
            podeMais={quantidade < 500 && podeMais}
            aoMudar={aoTocar}
            naCor
          />
        )}
      </div>
    </li>
  );
}

/** `−  2  +`, com alvo de 44px em cada lado. */
function Passo({
  nome,
  quantidade,
  podeMenos = quantidade > 0,
  podeMais = quantidade < 500,
  aoMudar,
  naCor = false,
}: {
  nome: string;
  quantidade: number;
  podeMenos?: boolean;
  podeMais?: boolean;
  aoMudar: (passo: number) => void;
  /** Cheio na cor da loja, e não contornado. */
  naCor?: boolean;
}) {
  const botao = cn(
    "toque flex items-center justify-center rounded-md transition-colors duration-150 ease-quart disabled:opacity-45",
    naCor
      ? "text-on-loja hover:bg-on-loja/10 active:bg-on-loja/20"
      : "text-ink hover:bg-sunken active:bg-line",
  );
  return (
    <div
      className={cn(
        // `relative`: na linha do produto, fica por cima do alvo da ficha.
        "relative flex shrink-0 items-center rounded-md",
        naCor ? "bg-loja text-on-loja" : "border border-line-strong text-ink",
      )}
    >
      <button
        type="button"
        onClick={() => aoMudar(-1)}
        disabled={!podeMenos}
        aria-label={`Diminuir ${nome}`}
        className={botao}
      >
        <Minus aria-hidden className="size-4" strokeWidth={2} />
      </button>
      <span
        aria-live="polite"
        className="num min-w-8 text-center text-body font-semibold"
      >
        {quantidade}
      </span>
      <button
        type="button"
        onClick={() => aoMudar(1)}
        disabled={!podeMais}
        aria-label={`Aumentar ${nome}`}
        className={botao}
      >
        <Plus aria-hidden className="size-4" strokeWidth={2} />
      </button>
    </div>
  );
}
