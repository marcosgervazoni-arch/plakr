/**
 * Meu Perfil — /profile/me
 * Permite ao usuário editar avatar, links de WhatsApp/Telegram e visualizar seu perfil público.
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Camera, ExternalLink, MessageCircle, Send, Trophy, Target, Users } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useState, useRef } from "react";

export default function MyProfile() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [whatsapp, setWhatsapp] = useState<string>("");
  const [telegram, setTelegram] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load public profile for display
  const { data: profile, isLoading } = trpc.users.getPublicProfile.useQuery(
    { userId: user?.id ?? 0 },
    { enabled: !!user?.id }
  );

  // Sync contact links when profile loads
  const profileWhatsapp = profile?.user?.whatsappLink ?? null;
  const profileTelegram = profile?.user?.telegramLink ?? null;
  // Use useEffect-like pattern: initialize once
  const [initialized, setInitialized] = useState(false);
  if (profile && !initialized) {
    setWhatsapp(profileWhatsapp ?? "");
    setTelegram(profileTelegram ?? "");
    setInitialized(true);
  }

  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado!");
      utils.users.getPublicProfile.invalidate({ userId: user?.id ?? 0 });
      utils.auth.me.invalidate();
    },
    onError: (err) => toast.error("Erro ao atualizar perfil", { description: err.message }),
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB.");
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: base64, contentType: file.type, folder: "avatars" }),
        });
        if (!res.ok) throw new Error("Upload falhou");
        const { url } = await res.json();
        await updateProfile.mutateAsync({ avatarUrl: url });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Erro ao fazer upload da imagem.");
      setUploading(false);
    }
  };

  const handleSaveLinks = () => {
    updateProfile.mutate({
      whatsappLink: whatsapp || null,
      telegramLink: telegram || null,
    });
  };

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 lg:py-10 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-bold text-2xl" style={{ fontFamily: "'Syne', sans-serif" }}>
            Meu Perfil
          </h1>
          {user && (
            <Link href={`/profile/${user.id}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ExternalLink className="w-3.5 h-3.5" /> Ver perfil público
              </Button>
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Avatar section */}
            <div className="bg-card border border-border/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24 border-2 border-border/30">
                  <AvatarImage src={profile?.user.avatarUrl ?? user?.avatarUrl ?? ""} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div className="text-center sm:text-left">
                <p className="font-semibold text-lg">{user?.name ?? "Usuário"}</p>
                <p className="text-sm text-muted-foreground">{user?.email ?? ""}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Clique na câmera para alterar o avatar (máx. 5MB, JPG/PNG/WebP)
                </p>
              </div>
            </div>

            {/* Stats (read-only) */}
            {profile && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-card border border-border/30 rounded-xl p-4 text-center">
                  <Trophy className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xl font-bold">{profile.stats?.totalPoints ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Pontos</p>
                </div>
                <div className="bg-card border border-border/30 rounded-xl p-4 text-center">
                  <Target className="w-5 h-5 text-green-400 mx-auto mb-1" />
                  <p className="text-xl font-bold">{profile.stats?.exactScores ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Exatos</p>
                </div>
                <div className="bg-card border border-border/30 rounded-xl p-4 text-center">
                  <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <p className="text-xl font-bold">{profile.recentPools?.length ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Bolões</p>
                </div>
              </div>
            )}

            {/* Contact links */}
            <div className="bg-card border border-border/30 rounded-2xl p-6 space-y-4">
              <h2 className="font-semibold text-sm">Links de Contato</h2>
              <p className="text-xs text-muted-foreground">
                Esses links aparecem no seu perfil público para que outros participantes possam te encontrar.
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="whatsapp" className="flex items-center gap-1.5 text-xs">
                    <MessageCircle className="w-3.5 h-3.5 text-green-400" /> WhatsApp
                  </Label>
                  <Input
                    id="whatsapp"
                    placeholder="https://wa.me/5511999999999"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="telegram" className="flex items-center gap-1.5 text-xs">
                    <Send className="w-3.5 h-3.5 text-blue-400" /> Telegram
                  </Label>
                  <Input
                    id="telegram"
                    placeholder="https://t.me/seunome"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              <Button
                onClick={handleSaveLinks}
                disabled={updateProfile.isPending}
                size="sm"
                className="w-full sm:w-auto"
              >
                {updateProfile.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Salvando...</>
                ) : "Salvar links"}
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
