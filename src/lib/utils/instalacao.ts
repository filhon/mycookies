/**
 * O convite de instalar do próprio navegador (`DECISOES.md#d295`).
 *
 * Chrome, Edge e Android entregam `beforeinstallprompt` uma vez, cedo, e por
 * isso o ouvinte nasce no import, e o import mora no shell autenticado: quando
 * ela abre `/comecar`, o evento já passou. Guardado, ele vira o botão
 * "Instalar o Rende"; sem ele (Safari, Firefox, ou o Chrome que já recusou),
 * a tela mostra as instruções. Nada gravado e nada de user-agent (`#d71`).
 */

interface EventoDeInstalar extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface EstadoDaInstalacao {
  /** Dá para instalar num toque. */
  podeInstalar: boolean;
  /** Instalou nesta visita: a aba continua navegador, e a mídia não diz. */
  instalou: boolean;
}

const INICIAL: EstadoDaInstalacao = { podeInstalar: false, instalou: false };

let evento: EventoDeInstalar | null = null;
let estado = INICIAL;
const ouvintes = new Set<() => void>();

function mudar(novo: EstadoDaInstalacao) {
  estado = novo;
  for (const ouvinte of ouvintes) ouvinte();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Sem isto o Chrome do Android mostra a própria faixa, antes da hora.
    e.preventDefault();
    evento = e as EventoDeInstalar;
    mudar({ ...estado, podeInstalar: true });
  });
  window.addEventListener("appinstalled", () => {
    evento = null;
    mudar({ podeInstalar: false, instalou: true });
  });
}

export function assinarInstalacao(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export const lerInstalacao = () => estado;
export const lerInstalacaoNoServidor = () => INICIAL;

/** O evento só serve uma vez: recusado, a tela volta às instruções. */
export async function instalar() {
  const guardado = evento;
  if (!guardado) return;
  evento = null;
  await guardado.prompt();
  const { outcome } = await guardado.userChoice;
  mudar({
    podeInstalar: false,
    instalou: estado.instalou || outcome === "accepted",
  });
}
