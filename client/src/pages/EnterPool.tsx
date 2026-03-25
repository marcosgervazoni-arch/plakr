/**
 * P3 — Entrar em Bolão
 * A entrada por código foi removida. Esta página redireciona para /pools/public.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function EnterPool() {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/pools/public", { replace: true });
  }, [navigate]);

  return null;
}
