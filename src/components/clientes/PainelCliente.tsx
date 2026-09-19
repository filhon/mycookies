"use client";

import { useState } from "react";
import { Archive } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { AreaTexto, Campo } from "@/components/ui/Campo";
import { Painel } from "@/components/ui/Painel";
import { errosPorCampo, esquemaCliente } from "@/lib/domain/schemas";
import {
  arquivarCliente,
  atualizarCliente,
  criarCliente,
  type DadosCliente,
} from "@/lib/firebase/mutations/clientes";
import type { Cliente } from "@/lib/types";

interface EstadoCliente {
  nome: string;
  telefone: string;
  instagram: string;
  endereco: string;
  observacoes: string;
}

function inicial(
  cliente: Cliente | undefined,
  nomeSugerido: string,
): EstadoCliente {
  return {
    nome: cliente?.nome ?? nomeSugerido,
    telefone: cliente?.telefone ?? "",
    instagram: cliente?.instagram ?? "",
    endereco: cliente?.endereco ?? "",
    observacoes: cliente?.observacoes ?? "",
  };
}

/**
 * Cadastro leve, aberto de dentro do pedido.
 *
 * Existe para a cliente que volta: a que tem telefone, endereço e um jeito de
 * embalar que ela precisa lembrar. Quem compra uma vez na feira não passa por
 * aqui — o pedido guarda o nome e segue, e é por isso que o único campo
 * obrigatório é o nome.
 */
export function PainelCliente({
  aberto,
  aoFechar,
  contaId,
  cliente,
  nomeSugerido,
  aoSalvar,
  chave: chaveAtual,
  podeArquivar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  contaId: string;
  /** Ausente = cadastro novo. */
  cliente?: Cliente;
  /** O nome que ela já digitou no pedido. */
  nomeSugerido: string;
  aoSalvar: (vinculo: { id: string; nome: string; telefone: string }) => void;
  /** Muda a cada abertura, para o painel não reabrir com o que ficou. */
  chave: string;
  /** Só a tela de clientes passa: de dentro do pedido, arquivar não faz sentido. */
  podeArquivar?: boolean;
}) {
  const [estado, setEstado] = useState<EstadoCliente>(() =>
    inicial(cliente, nomeSugerido),
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmandoArquivo, setConfirmandoArquivo] = useState(false);

  const [chave, setChave] = useState(chaveAtual);
  if (chave !== chaveAtual) {
    setChave(chaveAtual);
    setEstado(inicial(cliente, nomeSugerido));
    setErros({});
    setFalha(null);
    setConfirmandoArquivo(false);
  }

  const definir = <C extends keyof EstadoCliente>(
    campo: C,
    valor: EstadoCliente[C],
  ) => setEstado((anterior) => ({ ...anterior, [campo]: valor }));

  async function salvar() {
    const resultado = esquemaCliente.safeParse({
      nome: estado.nome,
      telefone: estado.telefone || undefined,
      instagram: estado.instagram || undefined,
      endereco: estado.endereco || undefined,
      observacoes: estado.observacoes || undefined,
    });

    if (!resultado.success) {
      setErros(errosPorCampo(resultado.error));
      return;
    }

    setErros({});
    setFalha(null);
    setSalvando(true);

    const dados: DadosCliente = resultado.data;

    try {
      let id: string;
      if (cliente) {
        await atualizarCliente(contaId, cliente.id, dados);
        id = cliente.id;
      } else {
        id = await criarCliente(contaId, dados);
      }

      aoSalvar({
        id,
        nome: dados.nome.trim(),
        telefone: dados.telefone?.trim() ?? "",
      });
      setSalvando(false);
      aoFechar();
    } catch {
      setFalha("Não foi possível salvar agora. Tente de novo em instantes.");
      setSalvando(false);
    }
  }

  async function arquivar() {
    if (!cliente) return;
    setFalha(null);
    setSalvando(true);
    try {
      await arquivarCliente(contaId, cliente.id);
      setSalvando(false);
      aoFechar();
    } catch {
      setFalha("Não foi possível salvar agora. Tente de novo em instantes.");
      setSalvando(false);
    }
  }

  return (
    <Painel
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={cliente ? "Editar cliente" : "Cadastrar cliente"}
      descricao={
        cliente
          ? "O que mudar aqui vale para os próximos pedidos dela."
          : "Só o nome é obrigatório. O resto é o que você vai querer ter à mão na próxima encomenda."
      }
      rodape={
        <div className="flex gap-3">
          <Botao onClick={aoFechar} className="flex-1" disabled={salvando}>
            Cancelar
          </Botao>
          <Botao
            variante="primaria"
            tamanho="lg"
            onClick={() => void salvar()}
            carregando={salvando}
            className="flex-[1.6]"
          >
            Salvar cliente
          </Botao>
        </div>
      }
    >
      <div className="space-y-5">
        <Campo
          rotulo="Nome"
          required
          value={estado.nome}
          erro={erros.nome}
          placeholder="Ana Beatriz"
          onChange={(evento) => definir("nome", evento.target.value)}
        />

        <Campo
          rotulo="Telefone"
          type="tel"
          inputMode="tel"
          value={estado.telefone}
          erro={erros.telefone}
          placeholder="(11) 90000-0000"
          dica="É por onde a encomenda foi combinada."
          onChange={(evento) => definir("telefone", evento.target.value)}
        />

        <Campo
          rotulo="Instagram"
          value={estado.instagram}
          erro={erros.instagram}
          placeholder="@anabeatriz"
          onChange={(evento) => definir("instagram", evento.target.value)}
        />

        <Campo
          rotulo="Endereço"
          value={estado.endereco}
          erro={erros.endereco}
          placeholder="Rua das Acácias, 120, apto 42"
          dica="O endereço da entrega vem para o pedido quando você escolher entregar."
          onChange={(evento) => definir("endereco", evento.target.value)}
        />

        <AreaTexto
          rotulo="Observações"
          dica="Alergia, preferência, o laço que ela gosta. O detalhe que salva a próxima encomenda."
          value={estado.observacoes}
          onChange={(evento) => definir("observacoes", evento.target.value)}
        />

        {falha && (
          <p role="alert" className="text-label text-negative">
            {falha}
          </p>
        )}

        {podeArquivar &&
          cliente &&
          (confirmandoArquivo ? (
            // Confirmação de dois passos no lugar de um modal: no celular, uma
            // caixa de diálogo empilhada sobre a folha inferior é pior de ler
            // e pior de tocar do que a pergunta feita onde a ação está.
            <div className="rounded-lg border border-negative/30 bg-negative-soft p-4">
              <p className="text-label text-ink">
                Arquivar{" "}
                <strong className="font-semibold">{cliente.nome}</strong>? Ela
                sai da lista e das sugestões do pedido. Os pedidos antigos
                continuam com o nome dela, e o que ela já gastou fica guardado.
              </p>
              <div className="mt-3 flex gap-2">
                <Botao
                  tamanho="sm"
                  onClick={() => setConfirmandoArquivo(false)}
                  disabled={salvando}
                >
                  Cancelar
                </Botao>
                <Botao
                  tamanho="sm"
                  variante="perigo"
                  carregando={salvando}
                  onClick={() => void arquivar()}
                >
                  Arquivar mesmo assim
                </Botao>
              </div>
            </div>
          ) : (
            <div className="border-t border-line pt-5">
              <Botao
                variante="perigo"
                tamanho="sm"
                onClick={() => setConfirmandoArquivo(true)}
                iconeInicial={
                  <Archive aria-hidden className="size-4" strokeWidth={1.75} />
                }
              >
                Arquivar cliente
              </Botao>
            </div>
          ))}
      </div>
    </Painel>
  );
}
