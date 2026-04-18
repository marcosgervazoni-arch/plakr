/**
 * PoolMural — Feed Social do Bolão
 *
 * Feed público com:
 *  - Posts em ordem cronológica reversa (mais recentes no topo)
 *  - Paginação (load more via cursor)
 *  - Box de novo post (textarea + botão Publicar)
 *  - Comentários expansíveis por post
 *  - Menções com @nome (autocomplete dos membros do bolão)
 *  - Ads Adsterra a cada 8 posts (apenas Free)
 *  - Estados: loading skeleton, empty state com CTA, error state
 *  - Organizador pode deletar posts/comentários (moderação básica)
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useUserPlan } from "@/hooks/useUserPlan";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AdBanner } from "@/components/AdBanner";
import {
  Loader2,
  MessageSquare,
  Trash2,
  ChevronDown,
  ChevronUp,
  Send,
  Newspaper,
  Bot,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface MuralComment {
  id: number;
  postId: number;
  content: string;
  createdAt: Date;
  authorId: number | null;
  authorName: string | null;
  authorAvatar: string | null;
}

interface MuralPost {
  id: number;
  type: string;
  content: string;
  eventMeta: Record<string, string> | null;
  createdAt: Date;
  authorId: number | null;
  authorName: string | null;
  authorAvatar: string | null;
  comments: MuralComment[];
}

interface PoolMuralProps {
  poolSlug: string;
  poolId: number;
  isOrganizer: boolean;
}

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

const AD_INTERVAL = 8; // Ads a cada 8 posts
const MAX_POST_LENGTH = 500;
const MAX_COMMENT_LENGTH = 280;

// Tipos de post automático (sem caixa de autor)
const AUTO_TYPES = new Set([
  "rank_change_first",
  "rank_change_top3",
  "rank_change_up",
  "x1_result_win",
  "x1_result_draw",
  "exact_score_single",
  "exact_score_multi",
  "match_result",
  "new_member",
  "pool_ended",
  "badge_unlocked",
  "zebra_result",
  "thrashing_result",
]);

// ─── AVATAR ──────────────────────────────────────────────────────────────────

function Avatar({ name, size = "sm" }: { name: string | null; size?: "sm" | "md" }) {
  const initial = name?.charAt(0)?.toUpperCase() ?? "?";
  const sz = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold shrink-0 bg-primary/15 text-primary",
        sz
      )}
    >
      {initial}
    </div>
  );
}

// ─── POST CARD ───────────────────────────────────────────────────────────────

function PostCard({
  post,
  currentUserId,
  isOrganizer,
  poolSlug,
  onDelete,
}: {
  post: MuralPost;
  currentUserId: number | undefined;
  isOrganizer: boolean;
  poolSlug: string;
  onDelete: (postId: number) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const isAuto = AUTO_TYPES.has(post.type);
  const canDelete = isOrganizer || post.authorId === currentUserId;

  const createComment = trpc.mural.createComment.useMutation({
    onSuccess: () => {
      setCommentText("");
      toast.success("Comentário publicado!");
    },
    onError: (err) => toast.error("Erro ao comentar", { description: err.message }),
  });

  const deleteComment = trpc.mural.deleteComment.useMutation({
    onError: (err) => toast.error("Erro ao deletar comentário", { description: err.message }),
  });

  const handleComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      toast.error(`Comentário muito longo (máx. ${MAX_COMMENT_LENGTH} caracteres)`);
      return;
    }
    createComment.mutate({ postId: post.id, content: trimmed });
  };

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div
      className={cn(
        "rounded-xl border transition-all",
        isAuto
          ? "border-primary/20 bg-primary/5"
          : "border-border/30 bg-card/60"
      )}
    >
      {/* Cabeçalho do post */}
      <div className="flex items-start gap-3 px-4 pt-3.5 pb-2">
        {isAuto ? (
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Bot className="w-3.5 h-3.5 text-primary" />
          </div>
        ) : (
          <Avatar name={post.authorName} />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold truncate">
              {isAuto ? "Plakr!" : (post.authorName ?? "Participante")}
            </span>
            {isAuto && (
              <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 font-medium">
                automático
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">{timeAgo}</p>
        </div>

        {/* Botão deletar — apenas para autor ou organizador */}
        {canDelete && (
          <button
            onClick={() => onDelete(post.id)}
            className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"
            title="Deletar post"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Conteúdo do post */}
      <div className="px-4 pb-3">
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {post.content}
        </p>
      </div>

      {/* Rodapé: botão de comentários */}
      <div className="px-4 pb-3 flex items-center gap-3">
        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>
            {post.comments.length > 0
              ? `${post.comments.length} comentário${post.comments.length !== 1 ? "s" : ""}`
              : "Comentar"}
          </span>
          {post.comments.length > 0 && (
            showComments
              ? <ChevronUp className="w-3 h-3" />
              : <ChevronDown className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Comentários expansíveis */}
      {showComments && (
        <div className="border-t border-border/20 px-4 py-3 space-y-3">
          {/* Lista de comentários */}
          {post.comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5">
              <Avatar name={c.authorName} size="sm" />
              <div className="flex-1 min-w-0 bg-muted/30 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold truncate">
                    {c.authorName ?? "Participante"}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: ptBR })}
                    </span>
                    {(isOrganizer || c.authorId === currentUserId) && (
                      <button
                        onClick={() => deleteComment.mutate({ commentId: c.id })}
                        className="w-4 h-4 flex items-center justify-center text-muted-foreground/40 hover:text-destructive transition-colors"
                        title="Deletar comentário"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs mt-0.5 leading-relaxed whitespace-pre-wrap break-words">
                  {c.content}
                </p>
              </div>
            </div>
          ))}

          {/* Caixa de novo comentário */}
          <div className="flex items-end gap-2">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escreva um comentário..."
              className="text-xs min-h-[60px] resize-none"
              maxLength={MAX_COMMENT_LENGTH}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleComment();
              }}
            />
            <Button
              size="sm"
              onClick={handleComment}
              disabled={!commentText.trim() || createComment.isPending}
              className="shrink-0 h-9 px-3"
            >
              {createComment.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/60 text-right">
            {commentText.length}/{MAX_COMMENT_LENGTH}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function PoolMural({ poolSlug, poolId, isOrganizer }: PoolMuralProps) {
  const { user } = useAuth();
  const { isPro } = useUserPlan();
  const utils = trpc.useUtils();

  const [postText, setPostText] = useState("");
  const [localPosts, setLocalPosts] = useState<MuralPost[]>([]);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.mural.getByPool.useInfiniteQuery(
    { poolSlug, limit: 20 },
    {
      enabled: !!poolSlug,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchInterval: 30_000,
    }
  );

  const createPost = trpc.mural.createPost.useMutation({
    onSuccess: () => {
      setPostText("");
      utils.mural.getByPool.invalidate({ poolSlug });
      toast.success("Post publicado!");
    },
    onError: (err) => toast.error("Erro ao publicar", { description: err.message }),
  });

  const deletePost = trpc.mural.deletePost.useMutation({
    onSuccess: () => {
      utils.mural.getByPool.invalidate({ poolSlug });
      toast.success("Post removido.");
    },
    onError: (err) => toast.error("Erro ao deletar post", { description: err.message }),
  });

  const handlePublish = () => {
    const trimmed = postText.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_POST_LENGTH) {
      toast.error(`Post muito longo (máx. ${MAX_POST_LENGTH} caracteres)`);
      return;
    }
    createPost.mutate({ poolSlug, content: trimmed });
  };

  // Flatten das páginas
  const allPosts: MuralPost[] = data?.pages.flatMap((p) => p.posts as MuralPost[]) ?? [];

  // ── LOADING STATE ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-3">
        {/* Skeleton da caixa de post */}
        <div className="h-24 bg-muted/40 rounded-xl animate-pulse" />
        {/* Skeleton de posts */}
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 bg-muted/30 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  // ── ERROR STATE ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm font-medium">Não foi possível carregar o Mural.</p>
        <p className="text-xs mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── CAIXA DE NOVO POST ── */}
      <div className="rounded-xl border border-border/40 bg-card/60 p-4 space-y-3">
        <Textarea
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          placeholder="Compartilhe algo com o bolão... 🔥"
          className="min-h-[80px] resize-none text-sm"
          maxLength={MAX_POST_LENGTH}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handlePublish();
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground/60">
            {postText.length}/{MAX_POST_LENGTH} · Ctrl+Enter para publicar
          </span>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={!postText.trim() || createPost.isPending}
            className="gap-1.5"
          >
            {createPost.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Publicar
          </Button>
        </div>
      </div>

      {/* ── FEED DE POSTS ── */}
      {allPosts.length === 0 ? (
        /* Empty state */
        <div className="text-center py-14 text-muted-foreground">
          <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-15" />
          <p className="text-sm font-medium">O Mural está vazio.</p>
          <p className="text-xs mt-1 max-w-xs mx-auto">
            Seja o primeiro a publicar algo! Compartilhe sua previsão, zoação ou hype para o bolão. 🔥
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {allPosts.map((post, idx) => (
            <div key={post.id}>
              <PostCard
                post={post}
                currentUserId={user?.id}
                isOrganizer={isOrganizer}
                poolSlug={poolSlug}
                onDelete={(postId) => deletePost.mutate({ postId })}
              />

              {/* Ads Adsterra a cada AD_INTERVAL posts — apenas usuários Free */}
              {!isPro && (idx + 1) % AD_INTERVAL === 0 && idx < allPosts.length - 1 && (
                <AdBanner
                  key={`ad-mural-${idx}`}
                  position="between_sections"
                  className="w-full my-2"
                />
              )}
            </div>
          ))}

          {/* Botão "Carregar mais" */}
          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border/40 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors disabled:opacity-50"
            >
              {isFetchingNextPage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              {isFetchingNextPage ? "Carregando..." : "Carregar mais posts"}
            </button>
          )}

          {/* Rodapé do feed */}
          {!hasNextPage && allPosts.length > 0 && (
            <p className="text-center text-[10px] text-muted-foreground/40 py-2">
              Você chegou ao início do Mural
            </p>
          )}
        </div>
      )}
    </div>
  );
}
