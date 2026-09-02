"use client";

import { useId, useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Campo, EnvelopeCampo } from "@/components/ui/Campo";
import { Painel } from "@/components/ui/Painel";
import { errosPorCampo, esquemaCliente } from "@/lib/domain/schemas";
import {
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
}) {
  const idObservacoes = useId();

  const [estado, setEstado] = useState<EstadoCliente>(() =>
    inicial(cliente, nomeSugerido),
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [chave, setChave] = useState(chaveAtual);
  if (chave !== chaveAtual) {
    setChave(chaveAtual);
    setEstado(inicial(cliente, nomeSugerido));
    setErros({});
    setFalha(null);
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
          placeholder="Rua das Acácias, 120 — apto 42"
          dica="O endereço da entrega vem para o pedido quando você escolher entregar."
          onChange={(evento) => definir("endereco", evento.target.value)}
        />

        <EnvelopeCampo
          id={idObservacoes}
          rotulo="Observações"
          dica="Alergia, preferência, o laço que ela gosta. O detalhe que salva a próxima encomenda."
        >
          <textarea
            id={idObservacoes}
            rows={3}
            value={estado.observacoes}
            onChange={(evento) => definir("observacoes", evento.target.value)}
            className="w-full rounded-md border border-line-strong bg-surface px-3 py-2.5 text-body text-ink transition-colors duration-150 ease-quart placeholder:text-ink-subtle"
          />
        </EnvelopeCampo>

        {falha && (
          <p role="alert" className="text-label text-negative">
            {falha}
          </p>
        )}
      </div>
    </Painel>
  );
}
