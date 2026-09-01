import { cn } from "@/lib/utils/cn";

/** Círculo de 42 de raio com uma mordida de 16 recortada no canto superior direito. */
const TRACADO_COOKIE =
  "M90.62 39.33 A 42 42 0 1 1 72.9 14.79 A 16 16 0 0 0 90.62 39.33 Z";

/**
 * O biscoito da identidade, em traço, com as gotas em dourado.
 * Usado como marca d'água em estados vazios e na tela de acesso.
 * Nunca como ícone de interface: para isso existe o Lucide.
 */
export function Cookie({
  className,
  gotas = true,
}: {
  className?: string;
  gotas?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      className={cn("h-12 w-12", className)}
    >
      <path
        d={TRACADO_COOKIE}
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {gotas && (
        <g fill="var(--mc-gold-500)">
          <circle cx="35" cy="41" r="6.5" />
          <circle cx="60" cy="58" r="7" />
          <circle cx="33" cy="65" r="5" />
          <circle cx="55" cy="32" r="4" />
          <circle cx="66" cy="76" r="4.5" />
        </g>
      )}
    </svg>
  );
}

/**
 * O papel de embrulho da marca: biscoitos repetidos em traço.
 * Decorativo por definição, então vive só em superfícies de marca (acesso,
 * cabeçalho vinho) e nunca atrás de dado financeiro.
 */
export function PadraoCookie({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={cn("h-full w-full", className)}>
      <defs>
        <pattern
          id="padrao-cookie"
          width="92"
          height="92"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-8)"
        >
          <path
            d={TRACADO_COOKIE}
            transform="translate(12 12) scale(0.44)"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinejoin="round"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#padrao-cookie)" />
    </svg>
  );
}

/** Logotipo completo. Serifa para o nome, caixa alta espaçada para o descritor. */
export function Logotipo({
  className,
  tamanho = "md",
  descritor = true,
}: {
  className?: string;
  tamanho?: "sm" | "md" | "lg";
  descritor?: boolean;
}) {
  const escala = {
    sm: { cookie: "h-6 w-6", nome: "text-subheading", desc: "text-[0.5rem]" },
    md: { cookie: "h-10 w-10", nome: "text-title", desc: "text-micro" },
    lg: {
      cookie: "h-16 w-16",
      nome: "text-[2.5rem] leading-none",
      desc: "text-label",
    },
  }[tamanho];

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <Cookie className={escala.cookie} />
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "font-display font-semibold tracking-tight",
            escala.nome,
          )}
        >
          MyCookie&rsquo;s
        </span>
        {descritor && (
          <span
            className={cn(
              "font-medium uppercase tracking-[0.32em] opacity-70",
              escala.desc,
            )}
          >
            Biscoitos artesanais
          </span>
        )}
      </div>
    </div>
  );
}
