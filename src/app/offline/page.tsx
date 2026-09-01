import { Cookie } from "@/components/marca/Marca";

export const metadata = { title: "Sem conexão" };

export default function PaginaOffline() {
  return (
    <div className="textura-papel flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-8 text-center">
      <Cookie className="size-16 text-wine-700 dark:text-wine-300" />
      <h1 className="font-display text-title font-semibold text-ink">
        Esta tela ainda não foi baixada
      </h1>
      <p className="max-w-[38ch] text-body text-ink-muted">
        O resto do sistema continua funcionando sem internet. Volte para uma
        tela já visitada e o que você registrar agora sincroniza quando o sinal
        voltar.
      </p>
    </div>
  );
}
