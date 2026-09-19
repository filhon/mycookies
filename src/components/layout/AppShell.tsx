import type { ReactNode } from "react";
import { BarraLateral } from "./BarraLateral";
import { NavegacaoInferior } from "./NavegacaoInferior";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <BarraLateral />

      {/* `overflow-x-clip` corta a sangria do cabeçalho (`sangria`, em
          `globals.css`) sem criar contêiner de rolagem: o `sticky` continua
          preso ao viewport. */}
      <div className="overflow-x-clip lg:pl-60 print:pl-0">
        {/* pb-24 no celular reserva a faixa da navegação inferior; com o
            teclado aberto ela não está lá, e a reserva vira vão morto. */}
        {/* A largura de leitura não é do shell: é do grupo de rota `(coluna)`
            (`DECISOES.md#d129`). A tabela de `/fichas` fica fora dele. */}
        {/* Na impressão o shell some e a folha do orçamento é a página inteira
            (`DECISOES.md#d106`). */}
        <main className="px-4 pb-24 apertado:pb-4 lg:px-8 lg:pb-16 print:p-0">
          {children}
        </main>
      </div>

      <NavegacaoInferior />
    </div>
  );
}
