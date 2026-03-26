/**
 * Redireciona /pool/:slug/player/:userId → /profile/:userId
 * A página contextual do apostador no bolão foi removida.
 * O perfil público geral (/profile/:userId) é o ponto único de acesso.
 */
import { useEffect } from "react";
import { useParams, useLocation } from "wouter";

export default function PoolMemberProfile() {
  const { userId } = useParams<{ slug: string; userId: string }>();
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate(`/profile/${userId}`, { replace: true });
  }, [userId, navigate]);

  return null;
}
