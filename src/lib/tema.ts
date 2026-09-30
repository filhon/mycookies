/**
 * O tema escolhido neste aparelho (`DECISOES.md#d244`). "Do aparelho" é a
 * ausência de escolha: sem `data-theme`, quem decide é o
 * `prefers-color-scheme` de `globals.css`. Mora no `localStorage`, como a
 * ordem das listas: é do aparelho, e não da conta. Sem React aqui: o layout
 * raiz, que é de servidor, importa o script. O hook é `useTema`, em
 * `BlocoTema`.
 */
export type Tema = "sistema" | "claro" | "escuro";

export const CHAVE_TEMA = "rende:tema";

/**
 * Roda no `<head>`, antes da primeira pintura: sem ele, quem escolheu escuro
 * num aparelho claro veria o papel piscar a cada abertura.
 */
export const SCRIPT_TEMA = `try{var t=localStorage.getItem("${CHAVE_TEMA}");if(t==="claro"||t==="escuro")document.documentElement.dataset.theme=t==="escuro"?"dark":"light"}catch(e){}`;
