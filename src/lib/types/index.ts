export * from "./common";
export * from "./configuracao";
export * from "./insumos";
export * from "./fichas";
export * from "./vendas";
export * from "./financeiro";

/**
 * Mapa único de caminhos do Firestore.
 *
 * Todo dado vive sob `users/{uid}/…`. A regra de segurança fica trivial e
 * impossível de furar: `request.auth.uid == uid`. Nenhuma coleção na raiz,
 * nenhum documento acessível sem dono.
 */
export const caminhos = {
  usuario: (uid: string) => `users/${uid}`,
  configuracao: (uid: string) => `users/${uid}/configuracao`,
  configuracaoGeral: (uid: string) => `users/${uid}/configuracao/geral`,
  insumos: (uid: string) => `users/${uid}/insumos`,
  fichas: (uid: string) => `users/${uid}/fichas`,
  clientes: (uid: string) => `users/${uid}/clientes`,
  pedidos: (uid: string) => `users/${uid}/pedidos`,
  listasCompra: (uid: string) => `users/${uid}/listasCompra`,
  transacoes: (uid: string) => `users/${uid}/transacoes`,
  metas: (uid: string) => `users/${uid}/metas`,
  agregados: (uid: string) => `users/${uid}/agregados`,
  resumoMensal: (uid: string, competencia: string) =>
    `users/${uid}/agregados/${competencia}`,
  resumoGlobal: (uid: string) => `users/${uid}/agregados/global`,
} as const;
