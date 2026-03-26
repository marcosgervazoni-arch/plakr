/**
 * OnboardingTour — Tour guiado de primeiro acesso usando driver.js.
 *
 * Exibe tooltips posicionados sobre os elementos reais do Dashboard.
 * O usuário pode pular em qualquer passo. Ao concluir ou pular,
 * chama users.completeTour para persistir no banco (nunca exibe novamente).
 */
import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useTour } from "@/hooks/useTour";

export function OnboardingTour() {
  const { shouldShowTour, markTourComplete } = useTour();

  useEffect(() => {
    if (!shouldShowTour) return;

    // Pequeno delay para garantir que os elementos do DOM estão montados
    const timeout = setTimeout(() => {
      const driverObj = driver({
        showProgress: true,
        progressText: "{{current}} de {{total}}",
        animate: true,
        overlayColor: "rgba(0,0,0,0.65)",
        smoothScroll: true,
        allowClose: true,
        // Textos dos botões em português
        nextBtnText: "Próximo →",
        prevBtnText: "← Anterior",
        doneBtnText: "Entendido! 🎉",
        // Botão Pular em todos os passos
        showButtons: ["next", "previous", "close"],
        popoverClass: "apostai-tour-popover",
        onDestroyStarted: () => {
          // Chamado ao pular (X) ou concluir
          markTourComplete();
          driverObj.destroy();
        },
        steps: [
          {
            // Passo 1 — Boas-vindas (sem elemento, centrado)
            popover: {
              title: "👋 Bem-vindo ao ApostAI!",
              description:
                "Vamos te mostrar os principais recursos da plataforma em menos de 1 minuto. Você pode pular a qualquer momento clicando no ✕.",
              side: "over",
              align: "center",
            },
          },
          {
            // Passo 2 — Botão Criar bolão
            element: "[data-tour='create-pool']",
            popover: {
              title: "🏆 Crie seu bolão",
              description:
                "Clique aqui para criar um novo bolão. Escolha o campeonato, defina as regras de pontuação e convide seus amigos.",
              side: "bottom",
              align: "start",
            },
          },
          {
            // Passo 4 — Sino de notificações
            element: "[data-tour='notifications']",
            popover: {
              title: "🔔 Notificações",
              description:
                "Aqui aparecem avisos de jogos próximos, palpites pendentes, badges conquistados e atualizações do ranking.",
              side: "bottom",
              align: "end",
            },
          },
          {
            // Passo 5 — Meus bolões
            element: "[data-tour='my-pools']",
            popover: {
              title: "📋 Seus bolões",
              description:
                "Todos os bolões que você participa ficam aqui. O número em laranja indica palpites pendentes — não deixe passar!",
              side: "top",
              align: "start",
            },
          },
          {
            // Passo 6 — Conquistas / badges
            element: "[data-tour='achievements-link']",
            popover: {
              title: "🏅 Conquistas",
              description:
                "Desbloqueie badges apostando bem, vencendo bolões e convidando amigos. Cada conquista tem raridade — do Comum ao Lendário.",
              side: "right",
              align: "start",
            },
          },
          {
            // Passo 7 — Próximas conquistas
            element: "[data-tour='nearest-badges']",
            popover: {
              title: "🎯 Próximas conquistas",
              description:
                "Aqui você acompanha os badges mais próximos de serem desbloqueados, com barra de progresso em tempo real.",
              side: "top",
              align: "start",
            },
          },
          {
            // Passo 8 — Perfil público
            element: "[data-tour='my-profile']",
            popover: {
              title: "👤 Seu perfil",
              description:
                "Acesse seu perfil público, veja suas estatísticas, histórico de bolões e todos os badges conquistados.",
              side: "right",
              align: "start",
            },
          },
          {
            // Passo 9 — Conclusão
            popover: {
              title: "✅ Tudo pronto!",
              description:
                "Você já sabe o essencial. Crie seu primeiro bolão, convide os amigos e que comecem os palpites! 🎉",
              side: "over",
              align: "center",
            },
          },
        ],
      });

      driverObj.drive();
    }, 800);

    return () => clearTimeout(timeout);
  }, [shouldShowTour, markTourComplete]);

  return null; // Componente sem renderização própria — driver.js injeta o DOM
}

export default OnboardingTour;
