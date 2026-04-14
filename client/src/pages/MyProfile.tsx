/**
 * /my-profile → redireciona para /profile/me
 * A página de perfil foi unificada em PublicProfile (/profile/:userId).
 * Quando o userId é "me", o perfil exibe as seções de edição (avatar, plano, convites, notificações).
 */
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function MyProfile() {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate("/profile/me", { replace: true });
  }, [navigate]);
  return null;
}
