import type { ReactNode } from "react";
import { BarraLateral } from "./BarraLateral";
import { NavegacaoInferior } from "./NavegacaoInferior";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas">
      {/* O primeiro foco da página: sem ele, o teclado passa por toda a barra
          antes do conteúdo (`DECISOES.md#d236`). */}
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-3 focus:text-label focus:font-semibold focus:text-ink focus:shadow-overlay print:hidden"
      >
        Pular para o conteúdo
      </a>

      {/* A tira sob a barra de status do iPhone instalado, que é translúcida
          e tem o relógio branco: sem ela, o relógio ficaria sobre o papel do
          cabeçalho (`DECISOES.md#d243`). Fora do app instalado a área segura
          é zero, e ela não existe. Faz par com o `theme_color` do Android. */}
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-brand-700 print:hidden"
      />

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
        <main
          id="conteudo"
          tabIndex={-1}
          className="px-4 pb-24 outline-none apertado:pb-4 lg:px-8 lg:pb-16 print:p-0"
        >
          {children}
        </main>
      </div>

      <NavegacaoInferior />
    </div>
  );
}
