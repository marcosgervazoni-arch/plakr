/**
 * AppleLoginButton — Botão "Entrar com Apple"
 *
 * Exibido condicionalmente: só aparece quando appleOAuthEnabled = true no banco.
 * Reutilizável em qualquer tela de login.
 *
 * Nota: Apple Sign In é suportado em TODOS os navegadores (incluindo Safari),
 * pois é a Apple que exige o botão em apps que usam login social.
 */
import { trpc } from "@/lib/trpc";

interface AppleLoginButtonProps {
  returnPath?: string;
  className?: string;
}

export default function AppleLoginButton({ returnPath = "/dashboard", className }: AppleLoginButtonProps) {
  const { data: authConfig } = trpc.platform.getAuthConfig.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  if (!authConfig?.appleOAuthEnabled) return null;

  function handleClick() {
    const origin = window.location.origin;
    window.location.href = `/api/oauth/apple?origin=${encodeURIComponent(origin)}&returnPath=${encodeURIComponent(returnPath)}`;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full flex items-center justify-center gap-2.5 text-sm px-4 py-2.5 rounded-lg transition-all hover:bg-white/5 active:scale-[0.98] ${className ?? ""}`}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "#E5E7EB",
      }}
      aria-label="Entrar com Apple"
    >
      {/* Apple logo SVG */}
      <svg width="16" height="18" viewBox="0 0 814 1000" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.8 0 663.9 0 541.8c0-207.3 135.3-316.9 268.4-316.9 71 0 130.1 46.9 175.1 46.9 42.9 0 110.2-50 192.6-50 31.2 0 108.2 2.6 168.7 81.1zm-208-181.3c31.2-36.9 53.8-88.1 53.8-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 134.8-71.3z"/>
      </svg>
      Entrar com Apple
    </button>
  );
}
