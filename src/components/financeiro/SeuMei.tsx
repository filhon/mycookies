"use client";

import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Pilulas } from "@/components/ui/Pilulas";
import { competenciaAtual, rotuloCompetencia } from "@/lib/domain/datas";
import {
  ehCompetencia,
  formatarCnpj,
  NOME_EMPRESARIAL_MAX,
  type MeiDoCnpj,
} from "@/lib/domain/mei";
import { cnpjValido, digitosDoCnpj } from "@/lib/domain/notaFiscal";
import { salvarMei } from "@/lib/firebase/mutations/fiscal";
import type { AtividadeMei, DadosMei } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

const ATIVIDADES = [
  { valor: "INDUSTRIA", rotulo: "Indústria" },
  { valor: "COMERCIO", rotulo: "Comércio" },
] as const;

const ROTULO_ATIVIDADE: Record<AtividadeMei, string> = {
  INDUSTRIA: "Indústria",
  COMERCIO: "Comércio",
};

/**
 * O MEI dela, no topo de "Antes de imprimir" (`DECISOES.md#d359`). Enquanto
 * não há CNPJ, o campo dele e os três à mão; com ele, uma linha de resumo e
 * "Mudar". Digitado o CNPJ válido e com rede, `/api/mei/cnpj` preenche o
 * resto, já gravado. Sem rede ou sem resposta, os campos ficam para ela, sem
 * mensagem de erro.
 */
export function SeuMei({ mei }: { mei: DadosMei | null }) {
  const { usuario, contaId } = useAuth();
  const atividade = mei?.atividade ?? "INDUSTRIA";

  const [mudando, setMudando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [cnpjDigitado, setCnpjDigitado] = useState<string | null>(null);
  const [nomeDigitado, setNomeDigitado] = useState<string | null>(null);
  const [mesCorrente] = useState(() => competenciaAtual());

  if (!contaId) return null;
  const conta = contaId;

  if (mei?.cnpj && !mudando) {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-label font-medium text-ink">O seu MEI</p>
        <p className="flex flex-wrap items-center gap-x-2 text-body text-ink">
          <span className="font-semibold">
            {mei.nomeEmpresarial || `CNPJ ${formatarCnpj(mei.cnpj)}`}
          </span>
          <span aria-hidden className="text-ink-subtle">
            ·
          </span>
          <span>{ROTULO_ATIVIDADE[atividade]}</span>
          {mei.abertura && (
            <>
              <span aria-hidden className="text-ink-subtle">
                ·
              </span>
              <span>aberto em {rotuloCompetencia(mei.abertura)}</span>
            </>
          )}
          <Botao
            variante="terciaria"
            tamanho="sm"
            onClick={() => setMudando(true)}
          >
            Mudar
          </Botao>
        </p>
      </div>
    );
  }

  async function aoDigitarCnpj(texto: string) {
    const digitos = digitosDoCnpj(texto).slice(0, 14);
    setCnpjDigitado(digitos);
    if (!digitos && mei?.cnpj) salvarMei(conta, { atividade, cnpj: null });
    if (!cnpjValido(digitos) || digitos === mei?.cnpj) return;

    // Fica no formulário até a resposta: sem ela, os campos são dela.
    setMudando(true);
    salvarMei(conta, { atividade, cnpj: digitos });
    if (!usuario || !navigator.onLine) return;

    setBuscando(true);
    try {
      const resposta = await fetch(
        `/api/mei/cnpj?cnpj=${digitos}&contaId=${encodeURIComponent(conta)}`,
        { headers: { authorization: `Bearer ${await usuario.getIdToken()}` } },
      );
      const veio: MeiDoCnpj = resposta.ok ? await resposta.json() : {};
      if (veio.nomeEmpresarial || veio.abertura || veio.atividade) {
        salvarMei(conta, {
          atividade: veio.atividade ?? atividade,
          ...(veio.nomeEmpresarial && {
            nomeEmpresarial: veio.nomeEmpresarial,
          }),
          ...(ehCompetencia(veio.abertura) && { abertura: veio.abertura }),
        });
        setNomeDigitado(null);
        setMudando(false);
      }
    } catch {
      // Sem rede de verdade: os campos à mão continuam valendo.
    } finally {
      setBuscando(false);
    }
  }

  function guardarNome() {
    if (nomeDigitado === null) return;
    const nome = nomeDigitado.trim();
    if (nome !== (mei?.nomeEmpresarial ?? "")) {
      salvarMei(conta, { atividade, nomeEmpresarial: nome || null });
    }
  }

  const cnpj = cnpjDigitado ?? mei?.cnpj ?? "";
  const cnpjNaoFecha = cnpj.length === 14 && !cnpjValido(cnpj);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Campo
          rotulo="O seu CNPJ"
          inputMode="numeric"
          autoComplete="off"
          placeholder="00.000.000/0000-00"
          value={formatarCnpj(cnpj)}
          onChange={(evento) => aoDigitarCnpj(evento.target.value)}
          erro={
            cnpjNaoFecha
              ? "Esse CNPJ não confere. Veja os números no seu CCMEI."
              : undefined
          }
          dica={
            buscando
              ? "Buscando o nome e a abertura…"
              : "Fica guardado na sua conta para sair na folha todo mês."
          }
        />
        <Campo
          rotulo="Nome empresarial"
          autoComplete="off"
          maxLength={NOME_EMPRESARIAL_MAX}
          value={nomeDigitado ?? mei?.nomeEmpresarial ?? ""}
          onChange={(evento) => setNomeDigitado(evento.target.value)}
          onBlur={guardarNome}
          dica="Como está no seu CCMEI."
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <p className="text-label font-medium text-ink">
            Minha atividade no MEI é
          </p>
          <Pilulas
            opcoes={ATIVIDADES}
            valor={atividade}
            aoMudar={(nova) => salvarMei(conta, { atividade: nova })}
            rotulo="Minha atividade no MEI é"
          />
          <p className="text-label text-ink-muted">
            É a que está no seu CCMEI. Doceira e confeiteira costumam ser
            indústria.
          </p>
        </div>

        {/* ponytail: `type="month"` nativo; o Firefox de computador mostra
            texto, e só `AAAA-MM` grava. Seletor próprio se ela usar lá. */}
        <Campo
          rotulo="Abriu o MEI em"
          type="month"
          max={mesCorrente}
          value={mei?.abertura ?? ""}
          onChange={(evento) => {
            const valor = evento.target.value;
            if (!valor) salvarMei(conta, { atividade, abertura: null });
            else if (ehCompetencia(valor)) {
              salvarMei(conta, { atividade, abertura: valor });
            }
          }}
          dica="No ano da abertura, o limite é proporcional aos meses."
        />
      </div>

      {mei?.cnpj && mudando && (
        <div>
          <Botao variante="secundaria" onClick={() => setMudando(false)}>
            Pronto
          </Botao>
        </div>
      )}
    </div>
  );
}
