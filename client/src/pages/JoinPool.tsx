import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Loader2, Trophy, Users } from "lucide-react";
import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function JoinPool() {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const joinPool = trpc.pools.joinByToken.useMutation({
    onSuccess: (data) => {
      if (data.alreadyMember) {
        toast.info("Você já é membro deste bolão.");
      } else {
        toast.success("Você entrou no bolão!");
      }
      navigate(`/pool/${data.slug}`);
    },
    onError: (err) => {
      toast.error("Erro ao entrar no bolão", { description: err.message });
    },
  });

  useEffect(() => {
    if (isAuthenticated && token && !joinPool.isPending && !joinPool.isSuccess) {
      joinPool.mutate({ token });
    }
  }, [isAuthenticated, token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="bg-card border-border max-w-sm w-full">
          <CardContent className="py-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-8 h-8 text-brand-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">Você foi convidado!</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Faça login para entrar no bolão e começar a fazer seus palpites.
            </p>
            <a href={getLoginUrl()}>
              <Button className="bg-brand-600 hover:bg-brand-700 text-white w-full">
                Entrar com Manus
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="bg-card border-border max-w-sm w-full">
        <CardContent className="py-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-brand-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Entrando no bolão...</h2>
          <Loader2 className="w-6 h-6 animate-spin text-brand-400 mx-auto mt-4" />
        </CardContent>
      </Card>
    </div>
  );
}
