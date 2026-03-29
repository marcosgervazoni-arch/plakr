/**
 * Plakr! — Retrospectiva v3 "Viral Edition"
 * 960 frames @ 30fps = 32 segundos
 * Paleta oficial: #FFB800 (dourado), #0B0F1A (fundo), #00FF88 (verde), #FF3B3B (vermelho), #00C2FF (info)
 * BPM 140 — beat = 12.857 frames
 *
 * Cenas (com beat-sync) — 8 cenas @ 960 frames = 32s:
 * 1.  Abertura + Riser     (0–119)    4s  — identidade Plakr, energia máxima
 * 2.  Posição Final        (120–269)  5s  — ranking, medalha, barra de top%
 * 3.  Seus Números         (270–419)  5s  — stats com contadores animados
 * 4.  Melhor Momento       (420–569)  5s  — placar exato com comentário viral
 * 5.  Badge Lendário       (570–689)  4s  — conquista com anel giratório
 * 6.  Duelo Acirrado       (690–839)  5s  — VS com barras animadas
 * 7.  Comparativo Viral    (840–929)  3s  — % vs. outros apostadores
 * 8.  Encerramento + CTA   (930–959)  1s  — marca + "Venha se divertir!"
 */
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Audio,
} from "remotion";
import type { RetrospectiveData } from "../retrospective";

// ─── PALETA OFICIAL PLAKR ────────────────────────────────────────────────────
const BG       = "#0B0F1A";
const SURFACE  = "#121826";
const GOLD     = "#FFB800";
const GOLD2    = "#FF8A00";
const GREEN    = "#00FF88";
const RED      = "#FF3B3B";
const INFO     = "#00C2FF";
const WHITE    = "#FFFFFF";
const GRAY     = "#6B7280";
const GRAY2    = "#9CA3AF";

// BPM 140 @ 30fps → beat = 12.857 frames
const BEAT = 12.857;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeOutBack(t: number) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function lerp(frame: number, from: number, to: number, startF: number, endF: number, ease = easeOutCubic) {
  const t = clamp((frame - startF) / (endF - startF), 0, 1);
  return from + (to - from) * ease(t);
}

function fadeIn(frame: number, start = 0, dur = 15) {
  return clamp((frame - start) / dur, 0, 1);
}

function slideUp(frame: number, start = 0, dur = 18, dist = 60) {
  return dist * (1 - clamp(easeOutCubic((frame - start) / dur), 0, 1));
}

function slideLeft(frame: number, start = 0, dur = 18, dist = 80) {
  return dist * (1 - clamp(easeOutCubic((frame - start) / dur), 0, 1));
}

function spr(frame: number, fps: number, from = 0, damping = 12, stiffness = 130) {
  return spring({ frame: frame - from, fps, config: { damping, stiffness }, durationInFrames: 40 });
}

function counter(frame: number, to: number, startF: number, endF: number) {
  return Math.round(lerp(frame, 0, to, startF, endF));
}

function beatPulse(frame: number, intensity = 0.06) {
  return 1 + intensity * Math.sin(frame * (Math.PI * 2 / BEAT));
}

// ─── PARTÍCULAS DOURADAS ──────────────────────────────────────────────────────
function GoldParticles({ frame, count = 10 }: { frame: number; count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + frame * 0.018;
        const r = 280 + i * 25;
        const x = 540 + Math.cos(angle) * r;
        const y = 960 + Math.sin(angle) * r * 0.38;
        const sz = 3 + (i % 3) * 2;
        const op = 0.12 + 0.08 * Math.sin(frame * 0.06 + i * 1.3);
        return (
          <div key={i} style={{
            position: "absolute",
            width: sz, height: sz, borderRadius: "50%",
            background: GOLD, opacity: op,
            left: x - sz / 2, top: y - sz / 2,
          }} />
        );
      })}
    </>
  );
}

// Linha de scan
function ScanLine({ frame }: { frame: number }) {
  const y = (frame * 5) % 1920;
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, top: y, height: 2,
      background: `linear-gradient(90deg, transparent, ${GOLD}33, transparent)`,
      pointerEvents: "none",
    }} />
  );
}

// Chip/tag colorido
function Tag({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <div style={{
      display: "inline-block",
      background: bg, border: `1.5px solid ${color}`,
      borderRadius: 30, padding: "6px 20px",
      color, fontSize: 22, fontFamily: "sans-serif", fontWeight: 700,
      letterSpacing: 1,
    }}>
      {text}
    </div>
  );
}

// Comentário divertido (balão de fala)
function FunComment({ text, frame, startF, color = GOLD }: { text: string; frame: number; startF: number; color?: string }) {
  const op = fadeIn(frame, startF, 12);
  const y = slideUp(frame, startF, 12, 20);
  return (
    <div style={{
      opacity: op, transform: `translateY(${y}px)`,
      background: `${color}18`, border: `1.5px solid ${color}44`,
      borderRadius: 20, padding: "10px 24px",
      color, fontSize: 24, fontFamily: "sans-serif", fontStyle: "italic",
      textAlign: "center", lineHeight: 1.4,
    }}>
      {text}
    </div>
  );
}

// ─── CENA 1: ABERTURA (0–89) ─────────────────────────────────────────────────
const SceneAbertura: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spr(frame, fps, 6, 9, 160);
  const glow = 50 + 30 * Math.sin(frame * 0.14);
  const titleOp = fadeIn(frame, 28, 18);
  const titleY = slideUp(frame, 28, 18);
  const subOp = fadeIn(frame, 48, 15);
  const bgAlpha = lerp(frame, 0, 0.3, 0, 25);

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 32%, rgba(255,184,0,${bgAlpha}) 0%, ${BG} 60%)`,
      overflow: "hidden",
    }}>
      <ScanLine frame={frame} />
      <GoldParticles frame={frame} count={14} />

      {/* Linhas diagonais de energia */}
      {[0,1,2,3].map(i => (
        <div key={i} style={{
          position: "absolute", width: 2, height: "140%",
          background: `linear-gradient(180deg, transparent, ${GOLD}${(12+i*6).toString(16).padStart(2,'0')}, transparent)`,
          left: `${18 + i*22}%`, top: "-20%",
          transform: `rotate(${12 + i*6}deg)`,
          opacity: fadeIn(frame, 0, 20),
        }} />
      ))}

      {/* Logo */}
      <div style={{
        position: "absolute", top: "30%", left: "50%",
        transform: `translate(-50%, -50%) scale(${logoScale})`,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
      }}>
        <div style={{
          width: 148, height: 148, borderRadius: "50%",
          background: `linear-gradient(135deg, ${GOLD2} 0%, ${GOLD} 60%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 76,
          boxShadow: `0 0 ${glow}px ${GOLD}99, 0 0 ${glow*2}px ${GOLD}33`,
        }}>
          🏆
        </div>
        <div style={{
          color: GOLD, fontSize: 92, fontWeight: 900, fontFamily: "sans-serif",
          letterSpacing: -3, textShadow: `0 0 50px ${GOLD}99`,
        }}>
          Plakr!
        </div>
      </div>

      {/* Título */}
      <div style={{
        position: "absolute", bottom: "28%", width: "100%", textAlign: "center",
        opacity: titleOp, transform: `translateY(${titleY}px)`, padding: "0 60px",
      }}>
        <div style={{ color: WHITE, fontSize: 50, fontWeight: 900, fontFamily: "sans-serif", lineHeight: 1.15 }}>
          Sua Retrospectiva
        </div>
        <div style={{ color: GOLD, fontSize: 50, fontWeight: 900, fontFamily: "sans-serif" }}>
          do Bolão 🔥
        </div>
      </div>

      {/* Nome do bolão */}
      <div style={{
        position: "absolute", bottom: "13%", width: "100%", textAlign: "center",
        opacity: subOp,
      }}>
        <Tag text={data.poolName} color={GOLD} bg={`${GOLD}18`} />
      </div>
    </AbsoluteFill>
  );
};

// ─── CENA 2: APRESENTAÇÃO (90–179) ───────────────────────────────────────────
const SceneUsuario: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame;

  const avatarScale = spr(lf, fps, 5, 11, 140);
  const nameOp = fadeIn(lf, 22, 18);
  const nameY = slideUp(lf, 22, 18);
  const tagOp = fadeIn(lf, 40, 15);
  const ring = 1 + 0.07 * Math.sin(lf * 0.13);
  const initials = data.userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden" }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(${GOLD}07 1px, transparent 1px), linear-gradient(90deg, ${GOLD}07 1px, transparent 1px)`,
        backgroundSize: "80px 80px",
      }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />

      <div style={{
        position: "absolute", top: "38%", left: "50%",
        transform: `translate(-50%, -50%)`,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 36,
      }}>
        {/* Avatar */}
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", inset: -14, borderRadius: "50%", border: `3px solid ${GOLD}66`, transform: `scale(${ring})` }} />
          <div style={{ position: "absolute", inset: -28, borderRadius: "50%", border: `1px solid ${GOLD}33`, transform: `scale(${ring * 0.94})` }} />
          <div style={{
            width: 210, height: 210, borderRadius: "50%",
            background: `linear-gradient(135deg, ${GOLD2} 0%, ${GOLD} 60%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 92, fontWeight: 900, color: BG, fontFamily: "sans-serif",
            transform: `scale(${avatarScale})`,
            boxShadow: `0 0 80px ${GOLD}55`,
          }}>
            {initials}
          </div>
        </div>

        {/* Nome */}
        <div style={{ opacity: nameOp, transform: `translateY(${nameY}px)`, textAlign: "center" }}>
          <div style={{ color: GRAY2, fontSize: 26, fontFamily: "sans-serif", marginBottom: 10, letterSpacing: 3, textTransform: "uppercase" }}>
            A retrospectiva de
          </div>
          <div style={{ color: WHITE, fontSize: 64, fontWeight: 900, fontFamily: "sans-serif", lineHeight: 1.05, letterSpacing: -1 }}>
            {data.userName}
          </div>
        </div>

        {/* Tag campeonato */}
        <div style={{ opacity: tagOp }}>
          <Tag text={`🏆 ${data.tournamentName ?? data.poolName}`} color={GOLD} bg={`${GOLD}22`} />
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
    </AbsoluteFill>
  );
};

// ─── CENA 3: POSIÇÃO FINAL (180–299) ─────────────────────────────────────────
const ScenePosicao: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame;

  const medalScale = spr(lf, fps, 5, 8, 145);
  const posOp = fadeIn(lf, 22, 18);
  const posY = slideUp(lf, 22, 18);
  const subOp = fadeIn(lf, 45, 15);
  const glowAnim = 45 + 22 * Math.sin(lf * 0.11);
  const pulse = beatPulse(lf, 0.04);

  const medal = data.finalPosition === 1 ? "🥇" : data.finalPosition === 2 ? "🥈" : data.finalPosition === 3 ? "🥉" : "🏅";
  const label = data.finalPosition === 1 ? "CAMPEÃO! 👑" : data.finalPosition === 2 ? "VICE-CAMPEÃO!" : data.finalPosition === 3 ? "3º LUGAR! 🔥" : `${data.finalPosition}º LUGAR`;
  const posColor = data.finalPosition === 1 ? GOLD : data.finalPosition === 2 ? "#E5E5E5" : data.finalPosition === 3 ? "#CD7F32" : WHITE;
  const funComment = data.finalPosition <= 3
    ? "Você mandou muito bem! 🚀"
    : data.finalPosition <= Math.ceil(data.totalParticipants / 2)
    ? "Tá no top! Próxima vez vai longe 💪"
    : "Participou e isso já conta! 😄";

  const rankPct = ((data.totalParticipants - data.finalPosition) / Math.max(data.totalParticipants - 1, 1)) * 100;
  const barW = lerp(lf, 0, rankPct, 50, 90);

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 38%, rgba(30,18,0,0.85) 0%, ${BG} 62%)`,
      overflow: "hidden",
    }}>
      <GoldParticles frame={lf} count={10} />

      <div style={{ position: "absolute", top: "7%", width: "100%", textAlign: "center", opacity: fadeIn(lf, 0, 15) }}>
        <div style={{ color: GRAY2, fontSize: 28, fontFamily: "sans-serif", letterSpacing: 6, textTransform: "uppercase" }}>
          Posição Final
        </div>
      </div>

      {/* Medalha */}
      <div style={{
        position: "absolute", top: "32%", left: "50%",
        transform: `translate(-50%, -50%) scale(${medalScale * pulse})`,
        fontSize: 190, textAlign: "center",
        filter: `drop-shadow(0 0 ${glowAnim}px ${posColor}cc)`,
      }}>
        {medal}
      </div>

      {/* Posição */}
      <div style={{
        position: "absolute", top: "55%", width: "100%", textAlign: "center",
        opacity: posOp, transform: `translateY(${posY}px)`,
      }}>
        <div style={{ color: posColor, fontSize: 148, fontWeight: 900, fontFamily: "sans-serif", lineHeight: 1, textShadow: `0 0 60px ${posColor}88` }}>
          #{data.finalPosition}
        </div>
        <div style={{ color: WHITE, fontSize: 46, fontWeight: 800, fontFamily: "sans-serif", marginTop: 4, letterSpacing: 2 }}>
          {label}
        </div>
      </div>

      {/* Barra de ranking */}
      <div style={{ position: "absolute", bottom: "18%", left: "80px", right: "80px", opacity: subOp }}>
        <div style={{ color: GRAY2, fontSize: 24, fontFamily: "sans-serif", textAlign: "center", marginBottom: 12 }}>
          entre <span style={{ color: WHITE, fontWeight: 700 }}>{data.totalParticipants} participantes</span>
        </div>
        <div style={{ height: 10, background: `${WHITE}15`, borderRadius: 5, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${barW}%`,
            background: `linear-gradient(90deg, ${GOLD2}, ${GOLD})`,
            borderRadius: 5, boxShadow: `0 0 12px ${GOLD}88`,
          }} />
        </div>
        <div style={{ color: GOLD, fontSize: 22, fontFamily: "sans-serif", marginTop: 10, textAlign: "right", fontWeight: 700 }}>
          Top {Math.round(100 - rankPct + 1)}% do bolão
        </div>
      </div>

      {/* Comentário divertido */}
      <div style={{ position: "absolute", bottom: "6%", width: "100%", paddingLeft: 60, paddingRight: 60, opacity: fadeIn(lf, 70, 15) }}>
        <FunComment text={funComment} frame={lf} startF={70} color={GOLD} />
      </div>
    </AbsoluteFill>
  );
};

// ─── CENA 4: SEUS NÚMEROS (300–419) ──────────────────────────────────────────
const SceneNumeros: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const lf = frame;

  const stats = [
    { label: "Palpites enviados", value: data.totalBets, max: data.totalBets, suffix: "", color: WHITE, icon: "📋" },
    { label: "Resultados certos", value: data.correctResultCount, max: data.totalBets, suffix: "", color: GREEN, icon: "✅" },
    { label: "Placares exatos 🎯", value: data.exactScoreCount, max: data.totalBets, suffix: "", color: GOLD, icon: "" },
    { label: "Zebras acertadas 🦓", value: data.zebraCount, max: data.totalBets, suffix: "", color: RED, icon: "" },
    { label: "Taxa de acerto", value: data.accuracyPct, max: 100, suffix: "%", color: INFO, icon: "📊" },
  ];

  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden" }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(${GOLD}06 1px, transparent 1px), linear-gradient(90deg, ${GOLD}06 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />

      <div style={{ position: "absolute", top: "6%", width: "100%", textAlign: "center", opacity: fadeIn(lf, 0, 15) }}>
        <div style={{ color: GOLD, fontSize: 38, fontWeight: 900, fontFamily: "sans-serif", letterSpacing: 4, textTransform: "uppercase" }}>
          ⚡ Seus Números
        </div>
      </div>

      <div style={{ position: "absolute", top: "17%", left: "60px", right: "60px", display: "flex", flexDirection: "column", gap: 26 }}>
        {stats.map((s, i) => {
          const delay = i * 10;
          const op = fadeIn(lf, delay, 14);
          const tx = slideLeft(lf, delay, 14);
          const bw = lerp(lf, 0, (s.value / s.max) * 100, delay + 14, delay + 50);
          const val = counter(lf, s.value, delay + 14, delay + 50);
          return (
            <div key={i} style={{ opacity: op, transform: `translateX(${tx}px)` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                <span style={{ color: GRAY2, fontSize: 26, fontFamily: "sans-serif" }}>{s.icon} {s.label}</span>
                <span style={{ color: s.color, fontSize: 42, fontWeight: 900, fontFamily: "sans-serif" }}>{val}{s.suffix}</span>
              </div>
              <div style={{ height: 8, background: `${WHITE}10`, borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${bw}%`,
                  background: `linear-gradient(90deg, ${s.color}77, ${s.color})`,
                  borderRadius: 4, boxShadow: `0 0 8px ${s.color}55`,
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Total de pontos */}
      <div style={{ position: "absolute", bottom: "7%", width: "100%", textAlign: "center", opacity: fadeIn(lf, 62, 15) }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 16,
          background: `${GOLD}18`, border: `2px solid ${GOLD}55`, borderRadius: 60, padding: "16px 48px",
        }}>
          <span style={{ color: GOLD, fontSize: 54, fontWeight: 900, fontFamily: "sans-serif" }}>
            {counter(lf, data.totalPoints, 62, 100)}
          </span>
          <span style={{ color: GRAY2, fontSize: 28, fontFamily: "sans-serif" }}>pontos totais</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── CENA 5: MELHOR MOMENTO (420–509) ────────────────────────────────────────
const SceneMelhorMomento: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame;

  const cardScale = spr(lf, fps, 8, 10, 130);
  const ptsScale = spr(lf, fps, 45, 14, 110);
  const bd = data.bestMomentData as Record<string, unknown>;
  const homeTeam = (bd.homeTeam as string) ?? "Brasil";
  const awayTeam = (bd.awayTeam as string) ?? "Argentina";
  const homeScore = (bd.homeScore as number) ?? 2;
  const awayScore = (bd.awayScore as number) ?? 1;
  const points = (bd.points as number) ?? 10;

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 55%, rgba(0,50,25,0.8) 0%, ${BG} 65%)`,
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: "6%", width: "100%", textAlign: "center", opacity: fadeIn(lf, 0, 15) }}>
        <div style={{ color: GREEN, fontSize: 34, fontWeight: 900, fontFamily: "sans-serif", letterSpacing: 3, textTransform: "uppercase" }}>
          ⭐ Melhor Momento
        </div>
        <div style={{ color: GRAY2, fontSize: 26, fontFamily: "sans-serif", marginTop: 8 }}>
          Você acertou o placar exato!
        </div>
      </div>

      {/* Card do placar */}
      <div style={{
        position: "absolute", top: "23%", left: "60px", right: "60px",
        transform: `scale(${cardScale})`,
        background: SURFACE, borderRadius: 36, padding: "44px 36px",
        border: `2px solid ${GREEN}44`,
        boxShadow: `0 0 60px ${GREEN}18, inset 0 1px 0 ${WHITE}06`,
        opacity: fadeIn(lf, 18, 15),
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 58, marginBottom: 8 }}>🇧🇷</div>
            <div style={{ color: WHITE, fontSize: 28, fontWeight: 700, fontFamily: "sans-serif" }}>{homeTeam}</div>
          </div>
          <div style={{ textAlign: "center", padding: "0 12px" }}>
            <div style={{ color: GOLD, fontSize: 90, fontWeight: 900, fontFamily: "sans-serif", textShadow: `0 0 30px ${GOLD}88`, lineHeight: 1 }}>
              {homeScore}×{awayScore}
            </div>
            <div style={{ color: GRAY2, fontSize: 22, fontFamily: "sans-serif", marginTop: 4 }}>Placar exato!</div>
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 58, marginBottom: 8 }}>🇦🇷</div>
            <div style={{ color: WHITE, fontSize: 28, fontWeight: 700, fontFamily: "sans-serif" }}>{awayTeam}</div>
          </div>
        </div>

        <div style={{
          textAlign: "center",
          background: `${GREEN}15`, borderRadius: 20, padding: "18px 24px",
          border: `1px solid ${GREEN}44`,
          transform: `scale(${ptsScale})`, opacity: fadeIn(lf, 45, 15),
        }}>
          <div style={{ color: GREEN, fontSize: 46, fontWeight: 900, fontFamily: "sans-serif" }}>+{points} pontos</div>
          <div style={{ color: GRAY2, fontSize: 22, fontFamily: "sans-serif", marginTop: 4 }}>sua maior pontuação em um único jogo</div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: "8%", width: "100%", paddingLeft: 60, paddingRight: 60, opacity: fadeIn(lf, 60, 15) }}>
        <FunComment text="Isso não foi sorte. Foi talento puro! 🧠✨" frame={lf} startF={60} color={GREEN} />
      </div>
    </AbsoluteFill>
  );
};

// ─── CENA 6: SUBIDA ÉPICA (510–599) ──────────────────────────────────────────
const SceneSubida: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame;

  const arrowScale = spr(lf, fps, 8, 9, 140);
  const numScale = spr(lf, fps, 28, 12, 120);
  const subOp = fadeIn(lf, 45, 15);

  // Dados fictícios: subiu 7 posições em uma rodada
  const positionsGained = 7;
  const fromPos = data.finalPosition + positionsGained;
  const toPos = data.finalPosition;
  const roundName = "Semifinal";

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 45%, rgba(0,60,30,0.75) 0%, ${BG} 62%)`,
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: "6%", width: "100%", textAlign: "center", opacity: fadeIn(lf, 0, 15) }}>
        <div style={{ color: GREEN, fontSize: 34, fontWeight: 900, fontFamily: "sans-serif", letterSpacing: 3, textTransform: "uppercase" }}>
          🚀 Subida Épica
        </div>
        <div style={{ color: GRAY2, fontSize: 26, fontFamily: "sans-serif", marginTop: 8 }}>
          Rodada da {roundName}
        </div>
      </div>

      {/* Seta para cima */}
      <div style={{
        position: "absolute", top: "28%", left: "50%",
        transform: `translate(-50%, -50%) scale(${arrowScale})`,
        fontSize: 160, textAlign: "center",
        filter: `drop-shadow(0 0 40px ${GREEN}cc)`,
      }}>
        ⬆️
      </div>

      {/* Posições ganhas */}
      <div style={{
        position: "absolute", top: "54%", width: "100%", textAlign: "center",
        transform: `scale(${numScale})`,
      }}>
        <div style={{ color: GREEN, fontSize: 130, fontWeight: 900, fontFamily: "sans-serif", lineHeight: 1, textShadow: `0 0 60px ${GREEN}88` }}>
          +{positionsGained}
        </div>
        <div style={{ color: WHITE, fontSize: 40, fontWeight: 800, fontFamily: "sans-serif", marginTop: 4 }}>
          posições em uma rodada
        </div>
      </div>

      {/* De → Para */}
      <div style={{
        position: "absolute", bottom: "22%", width: "100%",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 32,
        opacity: subOp,
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: GRAY, fontSize: 22, fontFamily: "sans-serif" }}>Estava em</div>
          <div style={{ color: RED, fontSize: 64, fontWeight: 900, fontFamily: "sans-serif" }}>#{fromPos}</div>
        </div>
        <div style={{ color: GOLD, fontSize: 48, fontFamily: "sans-serif" }}>→</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: GRAY, fontSize: 22, fontFamily: "sans-serif" }}>Chegou em</div>
          <div style={{ color: GREEN, fontSize: 64, fontWeight: 900, fontFamily: "sans-serif" }}>#{toPos}</div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: "7%", width: "100%", paddingLeft: 60, paddingRight: 60, opacity: fadeIn(lf, 65, 15) }}>
        <FunComment text="Modo turbo ativado! 🏎️💨" frame={lf} startF={65} color={GREEN} />
      </div>
    </AbsoluteFill>
  );
};

// ─── CENA 7: BADGE LENDÁRIO (600–689) ────────────────────────────────────────
const SceneBadge: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame;

  const badgeScale = spr(lf, fps, 10, 8, 150);
  const nameOp = fadeIn(lf, 30, 18);
  const nameY = slideUp(lf, 30, 18);
  const glow = 45 + 28 * Math.sin(lf * 0.16);
  const rotate = lf * 1.3;

  const badgeName = data.badgeEarnedName ?? "Lendário";
  const badgeEmoji = data.badgeEarnedEmoji ?? "🔮";
  const PURPLE = "#9B59B6";

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 40%, rgba(50,0,70,0.7) 0%, ${BG} 65%)`,
      overflow: "hidden",
    }}>
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2 + lf * 0.022;
        const r = 190 + i * 22;
        return (
          <div key={i} style={{
            position: "absolute", width: 6, height: 6, borderRadius: "50%",
            background: PURPLE, opacity: 0.28 + 0.18 * Math.sin(lf * 0.1 + i),
            left: 540 + Math.cos(angle) * r - 3,
            top: 680 + Math.sin(angle) * r * 0.5 - 3,
          }} />
        );
      })}

      <div style={{ position: "absolute", top: "7%", width: "100%", textAlign: "center", opacity: fadeIn(lf, 0, 15) }}>
        <div style={{ color: PURPLE, fontSize: 32, fontWeight: 900, fontFamily: "sans-serif", letterSpacing: 4, textTransform: "uppercase" }}>
          🏅 Badge Conquistado
        </div>
      </div>

      {/* Badge */}
      <div style={{ position: "absolute", top: "37%", left: "50%", transform: `translate(-50%, -50%)` }}>
        <div style={{ position: "absolute", inset: -32, borderRadius: "50%", border: `3px dashed ${PURPLE}66`, transform: `rotate(${rotate}deg)` }} />
        <div style={{ position: "absolute", inset: -52, borderRadius: "50%", border: `2px dashed ${GOLD}33`, transform: `rotate(${-rotate * 0.7}deg)` }} />
        <div style={{
          width: 210, height: 210, borderRadius: "50%",
          background: `linear-gradient(135deg, #6C3483 0%, ${PURPLE} 60%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 100,
          transform: `scale(${badgeScale})`,
          boxShadow: `0 0 ${glow}px ${PURPLE}88, 0 0 ${glow*2}px ${PURPLE}44`,
        }}>
          {badgeEmoji}
        </div>
      </div>

      <div style={{
        position: "absolute", top: "62%", width: "100%", textAlign: "center",
        opacity: nameOp, transform: `translateY(${nameY}px)`,
      }}>
        <div style={{ color: WHITE, fontSize: 62, fontWeight: 900, fontFamily: "sans-serif", lineHeight: 1.1 }}>{badgeName}</div>
        <div style={{ marginTop: 12 }}>
          <Tag text="BADGE LENDÁRIO" color={PURPLE} bg={`${PURPLE}33`} />
        </div>
      </div>

      <div style={{ position: "absolute", bottom: "8%", width: "100%", paddingLeft: 60, paddingRight: 60, opacity: fadeIn(lf, 55, 15) }}>
        <FunComment text="Nem todo mundo chega lá. Você chegou. 👑" frame={lf} startF={55} color={PURPLE} />
      </div>
    </AbsoluteFill>
  );
};

// ─── CENA 8: DUELO ACIRRADO (690–809) ────────────────────────────────────────
const SceneDuelo: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame;

  const vsScale = spr(lf, fps, 20, 10, 130);
  const leftOp = fadeIn(lf, 10, 18);
  const leftX = slideLeft(lf, 10, 18, 130);
  const rightOp = fadeIn(lf, 10, 18);
  const rightX = -slideLeft(lf, 10, 18, 130);
  const statsOp = fadeIn(lf, 50, 18);
  const resultScale = spr(lf, fps, 80, 12, 110);

  const rival = { name: "Carlos Lima", initials: "CL", pts: 182, position: 4 };
  const user = {
    name: data.userName,
    initials: data.userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
    pts: data.totalPoints,
    position: data.finalPosition,
  };
  const total = user.pts + rival.pts;
  const userBarW = lerp(lf, 0, (user.pts / total) * 100, 55, 90);
  const rivalBarW = lerp(lf, 0, (rival.pts / total) * 100, 55, 90);
  const diff = user.pts - rival.pts;

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 50%, rgba(30,0,0,0.8) 0%, ${BG} 65%)`,
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: "5%", width: "100%", textAlign: "center", opacity: fadeIn(lf, 0, 15) }}>
        <div style={{ color: RED, fontSize: 34, fontWeight: 900, fontFamily: "sans-serif", letterSpacing: 3, textTransform: "uppercase" }}>
          ⚔️ Duelo Acirrado
        </div>
        <div style={{ color: GRAY2, fontSize: 24, fontFamily: "sans-serif", marginTop: 6 }}>A disputa mais acirrada do bolão</div>
      </div>

      {/* Jogadores */}
      <div style={{
        position: "absolute", top: "22%", left: 0, right: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 55px",
      }}>
        {/* Usuário */}
        <div style={{ opacity: leftOp, transform: `translateX(${leftX}px)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, flex: 1 }}>
          <div style={{
            width: 140, height: 140, borderRadius: "50%",
            background: `linear-gradient(135deg, ${GOLD2}, ${GOLD})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 58, fontWeight: 900, color: BG, fontFamily: "sans-serif",
            boxShadow: `0 0 40px ${GOLD}66`, border: `3px solid ${GOLD}`,
          }}>
            {user.initials}
          </div>
          <div style={{ color: WHITE, fontSize: 28, fontWeight: 800, fontFamily: "sans-serif", textAlign: "center" }}>{user.name.split(" ")[0]}</div>
          <Tag text={`#${user.position}`} color={GOLD} bg={`${GOLD}22`} />
        </div>

        {/* VS */}
        <div style={{ transform: `scale(${vsScale})`, textAlign: "center", padding: "0 16px" }}>
          <div style={{ color: RED, fontSize: 68, fontWeight: 900, fontFamily: "sans-serif", textShadow: `0 0 30px ${RED}88` }}>VS</div>
        </div>

        {/* Rival */}
        <div style={{ opacity: rightOp, transform: `translateX(${rightX}px)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, flex: 1 }}>
          <div style={{
            width: 140, height: 140, borderRadius: "50%",
            background: `linear-gradient(135deg, #333, #555)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 58, fontWeight: 900, color: WHITE, fontFamily: "sans-serif",
            border: `3px solid #555`,
          }}>
            {rival.initials}
          </div>
          <div style={{ color: WHITE, fontSize: 28, fontWeight: 800, fontFamily: "sans-serif", textAlign: "center" }}>{rival.name.split(" ")[0]}</div>
          <Tag text={`#${rival.position}`} color={GRAY} bg={`${WHITE}11`} />
        </div>
      </div>

      {/* Barras */}
      <div style={{ position: "absolute", top: "60%", left: "60px", right: "60px", opacity: statsOp }}>
        <div style={{ color: GRAY2, fontSize: 24, fontFamily: "sans-serif", textAlign: "center", marginBottom: 20 }}>Pontuação final</div>
        {[
          { name: user.name.split(" ")[0], pts: user.pts, color: GOLD, barW: userBarW },
          { name: rival.name.split(" ")[0], pts: rival.pts, color: GRAY, barW: rivalBarW },
        ].map((p, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: p.color, fontSize: 24, fontFamily: "sans-serif", fontWeight: 700 }}>{p.name}</span>
              <span style={{ color: p.color, fontSize: 28, fontFamily: "sans-serif", fontWeight: 900 }}>{p.pts} pts</span>
            </div>
            <div style={{ height: 10, background: `${WHITE}10`, borderRadius: 5, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${p.barW}%`, background: i === 0 ? `linear-gradient(90deg, ${GOLD2}, ${GOLD})` : `${GRAY}66`, borderRadius: 5, boxShadow: i === 0 ? `0 0 10px ${GOLD}88` : "none" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Resultado */}
      <div style={{
        position: "absolute", bottom: "7%", width: "100%", textAlign: "center",
        transform: `scale(${resultScale})`, opacity: fadeIn(lf, 80, 15),
      }}>
        <div style={{
          display: "inline-block",
          background: `${GOLD}22`, border: `2px solid ${GOLD}66`, borderRadius: 40, padding: "14px 40px",
          color: GOLD, fontSize: 30, fontFamily: "sans-serif", fontWeight: 800,
        }}>
          🏆 Você venceu por {diff} pontos!
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── CENA 9: COMPARATIVO VIRAL (810–899) ─────────────────────────────────────
const SceneComparativo: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame;

  const superiorPct = Math.round(((data.totalParticipants - data.finalPosition) / Math.max(data.totalParticipants - 1, 1)) * 100);

  const facts = [
    { icon: "🎯", text: `Acertou ${data.accuracyPct}% dos resultados`, sub: `Média do bolão: 41%`, color: GOLD, highlight: `+${data.accuracyPct - 41}% acima` },
    { icon: "⚡", text: `${data.exactScoreCount} placares exatos`, sub: `Média: 7 por pessoa`, color: GREEN, highlight: `${Math.round((data.exactScoreCount / 7) * 10) / 10}x a média` },
    { icon: "🦓", text: `${data.zebraCount} zebras acertadas`, sub: `Só 12% conseguiram`, color: RED, highlight: `Raro demais!` },
  ];

  const highlightScale = spr(lf, fps, 72, 10, 130);

  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden" }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(${INFO}05 1px, transparent 1px), linear-gradient(90deg, ${INFO}05 1px, transparent 1px)`,
        backgroundSize: "70px 70px",
      }} />

      <div style={{ position: "absolute", top: "5%", width: "100%", textAlign: "center", opacity: fadeIn(lf, 0, 15) }}>
        <div style={{ color: INFO, fontSize: 34, fontWeight: 900, fontFamily: "sans-serif", letterSpacing: 3, textTransform: "uppercase" }}>
          📊 Você vs. Todos
        </div>
        <div style={{ color: GRAY2, fontSize: 24, fontFamily: "sans-serif", marginTop: 6 }}>Comparativo com a média do bolão</div>
      </div>

      <div style={{ position: "absolute", top: "18%", left: "60px", right: "60px", display: "flex", flexDirection: "column", gap: 30 }}>
        {facts.map((f, i) => {
          const delay = i * 14;
          const op = fadeIn(lf, delay, 14);
          const ty = slideUp(lf, delay, 14);
          return (
            <div key={i} style={{ opacity: op, transform: `translateY(${ty}px)` }}>
              <div style={{
                background: SURFACE, borderRadius: 24, padding: "22px 28px",
                border: `1.5px solid ${f.color}33`,
                boxShadow: `0 0 20px ${f.color}11`,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 32 }}>{f.icon}</span>
                    <span style={{ color: WHITE, fontSize: 26, fontFamily: "sans-serif", fontWeight: 700 }}>{f.text}</span>
                  </div>
                  <div style={{
                    background: `${f.color}22`, border: `1px solid ${f.color}66`,
                    borderRadius: 20, padding: "4px 14px",
                    color: f.color, fontSize: 20, fontFamily: "sans-serif", fontWeight: 700,
                  }}>
                    {f.highlight}
                  </div>
                </div>
                <div style={{ color: GRAY, fontSize: 22, fontFamily: "sans-serif" }}>{f.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Destaque viral */}
      <div style={{
        position: "absolute", bottom: "7%", width: "100%", textAlign: "center",
        transform: `scale(${highlightScale})`, opacity: fadeIn(lf, 72, 18),
      }}>
        <div style={{
          display: "inline-block",
          background: `linear-gradient(135deg, ${GREEN}22, ${GREEN}11)`,
          border: `2px solid ${GREEN}66`, borderRadius: 50, padding: "18px 50px",
        }}>
          <div style={{ color: GREEN, fontSize: 46, fontWeight: 900, fontFamily: "sans-serif" }}>Top {100 - superiorPct}%</div>
          <div style={{ color: GRAY2, fontSize: 22, fontFamily: "sans-serif", marginTop: 4 }}>
            você superou {superiorPct}% dos apostadores 🔥
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── CENA 10: ENCERRAMENTO + CTA (900–959) ───────────────────────────────────
const SceneEncerramento: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame;

  const logoScale = spr(lf, fps, 0, 10, 130);
  const phraseOp = fadeIn(lf, 0, 8);
  const phraseY = slideUp(lf, 0, 8);
  const ctaScale = spr(lf, fps, 8, 12, 110);
  const ctaOp = fadeIn(lf, 8, 10);
  const glow = 55 + 35 * Math.sin(lf * 0.2);
  const pulse = beatPulse(lf, 0.05);

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 30%, rgba(45,28,0,0.9) 0%, ${BG} 65%)`,
      overflow: "hidden",
    }}>
      <GoldParticles frame={lf} count={16} />
      {[0,1,2].map(i => (
        <div key={i} style={{
          position: "absolute", width: 2, height: "120%",
          background: `linear-gradient(180deg, transparent, ${GOLD}${(14+i*8).toString(16).padStart(2,'0')}, transparent)`,
          left: `${22 + i*28}%`, top: "-10%",
          transform: `rotate(${10 + i*9}deg)`, opacity: 0.65,
        }} />
      ))}

      {/* Logo */}
      <div style={{
        position: "absolute", top: "26%", left: "50%",
        transform: `translate(-50%, -50%) scale(${logoScale * pulse})`,
        textAlign: "center",
        filter: `drop-shadow(0 0 ${glow}px ${GOLD}88)`,
      }}>
        <div style={{ fontSize: 94, marginBottom: 12 }}>🏆</div>
        <div style={{ color: GOLD, fontSize: 100, fontWeight: 900, fontFamily: "sans-serif", letterSpacing: -3, textShadow: `0 0 60px ${GOLD}88` }}>
          Plakr!
        </div>
      </div>

      {/* Frase */}
      <div style={{
        position: "absolute", top: "53%", left: "60px", right: "60px",
        opacity: phraseOp, transform: `translateY(${phraseY}px)`, textAlign: "center",
      }}>
        <div style={{ color: WHITE, fontSize: 36, fontFamily: "sans-serif", lineHeight: 1.5, fontStyle: "italic" }}>
          "{data.closingPhrase}"
        </div>
      </div>

      {/* CTA */}
      <div style={{
        position: "absolute", bottom: "11%", width: "100%", textAlign: "center",
        opacity: ctaOp, transform: `scale(${ctaScale})`,
      }}>
        <div style={{
          display: "inline-block",
          background: `linear-gradient(135deg, ${GOLD2} 0%, ${GOLD} 60%)`,
          borderRadius: 60, padding: "24px 72px",
          color: BG, fontSize: 36, fontWeight: 900, fontFamily: "sans-serif",
          boxShadow: `0 8px 40px ${GOLD}66`,
        }}>
          Venha se divertir com amigos! 🎉
        </div>
        <div style={{ color: GRAY2, fontSize: 26, fontFamily: "sans-serif", marginTop: 14 }}>plakr.io</div>
      </div>
    </AbsoluteFill>
  );
};

// ─── COMPOSIÇÃO PRINCIPAL ─────────────────────────────────────────────────────
export const PlakrRetrospectiva: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const AUDIO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663029677047/dJv8mGehu4r2vn8N2SWpLW/plakr_v3_d63848ac.mp3";

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: "sans-serif" }}>
      <Audio src={AUDIO_URL} volume={0.88} />

      <Sequence from={0}   durationInFrames={120}> <SceneAbertura      data={data} /> </Sequence>
      <Sequence from={120} durationInFrames={150}> <ScenePosicao       data={data} /> </Sequence>
      <Sequence from={270} durationInFrames={150}> <SceneNumeros       data={data} /> </Sequence>
      <Sequence from={420} durationInFrames={150}> <SceneMelhorMomento data={data} /> </Sequence>
      <Sequence from={570} durationInFrames={120}> <SceneBadge         data={data} /> </Sequence>
      <Sequence from={690} durationInFrames={150}> <SceneDuelo         data={data} /> </Sequence>
      <Sequence from={840} durationInFrames={90}>  <SceneComparativo   data={data} /> </Sequence>
      <Sequence from={930} durationInFrames={30}>  <SceneEncerramento  data={data} /> </Sequence>
    </AbsoluteFill>
  );
};
