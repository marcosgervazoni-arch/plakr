/**
 * Plakr! — Composição Principal da Retrospectiva v2
 * 9 cenas animadas, 900 frames @ 30fps (30 segundos)
 * Identidade visual: #F5A623 (dourado), #0D0D1A (fundo), #FFFFFF (texto)
 * BPM: 128 — transições sincronizadas nos beats
 *
 * Cenas:
 * 1. Abertura energética com riser (0–89)       → 3s
 * 2. Apresentação do usuário (90–179)            → 3s
 * 3. Posição final + ranking (180–299)           → 4s
 * 4. Seus números (300–419)                      → 4s
 * 5. Melhor momento — placar exato (420–509)     → 3s
 * 6. Badge Lendário (510–599)                    → 3s
 * 7. Duelo acirrado (600–719)                    → 4s
 * 8. Comparativo geral (720–839)                 → 4s
 * 9. Encerramento + CTA (840–899)                → 2s
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
  staticFile,
} from "remotion";
import type { RetrospectiveData } from "../retrospective";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const GOLD        = "#F5A623";
const GOLD_LIGHT  = "#FFD166";
const GOLD_DARK   = "#C47D0A";
const DARK_BG     = "#0D0D1A";
const DARK_CARD   = "#16162A";
const DARK_CARD2  = "#1E1E38";
const WHITE       = "#FFFFFF";
const GRAY        = "#8888AA";
const TEAL        = "#00D4AA";
const RED         = "#FF4757";
const PURPLE      = "#9B59B6";
const BLUE        = "#3498DB";

// BPM 128 → beat = 14.0625 frames @ 30fps
const BEAT = 14.0625;

// ─── HELPERS DE ANIMAÇÃO ─────────────────────────────────────────────────────
function easeOut(frame: number, from: number, to: number, duration: number) {
  const t = Math.min(Math.max((frame - from) / duration, 0), 1);
  return 1 - Math.pow(1 - t, 3);
}

function fadeIn(frame: number, from = 0, duration = 18) {
  return interpolate(frame, [from, from + duration], [0, 1], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
  });
}

function slideUp(frame: number, from = 0, duration = 18, dist = 50) {
  const p = easeOut(frame, from, from + duration, duration);
  return dist * (1 - p);
}

function slideLeft(frame: number, from = 0, duration = 18, dist = 80) {
  const p = easeOut(frame, from, from + duration, duration);
  return dist * (1 - p);
}

function scaleSpring(frame: number, fps: number, from = 0, damping = 12, stiffness = 120) {
  return spring({ frame: frame - from, fps, config: { damping, stiffness }, durationInFrames: 35 });
}

function pulse(frame: number, speed = 0.08) {
  return 1 + 0.04 * Math.sin(frame * speed * Math.PI * 2);
}

// Contador animado
function counter(frame: number, from: number, to: number, startF: number, endF: number) {
  const p = easeOut(frame, startF, endF, endF - startF);
  return Math.round(from + (to - from) * p);
}

// Partículas douradas
function Particles({ count = 8, frame }: { count?: number; frame: number }) {
  return (
    <>
      {[...Array(count)].map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const radius = 300 + i * 30;
        const speed = 0.015 + i * 0.003;
        const x = 540 + Math.cos(angle + frame * speed) * radius;
        const y = 960 + Math.sin(angle + frame * speed) * radius * 0.4;
        const size = 3 + (i % 3) * 2;
        const opacity = 0.15 + 0.1 * Math.sin(frame * 0.05 + i);
        return (
          <div key={i} style={{
            position: "absolute",
            width: size, height: size,
            borderRadius: "50%",
            background: GOLD,
            opacity,
            left: x - size / 2,
            top: y - size / 2,
          }} />
        );
      })}
    </>
  );
}

// Linha de scan energética
function ScanLine({ frame }: { frame: number }) {
  const y = ((frame * 4) % 1920);
  return (
    <div style={{
      position: "absolute", left: 0, right: 0,
      top: y, height: 2,
      background: `linear-gradient(90deg, transparent, ${GOLD}44, transparent)`,
      pointerEvents: "none",
    }} />
  );
}

// ─── CENA 1: ABERTURA ENERGÉTICA (frames 0–89) ───────────────────────────────
const SceneAbertura: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = scaleSpring(frame, fps, 8, 10, 150);
  const glowPulse = 1 + 0.3 * Math.sin(frame * 0.15);
  const titleOpacity = fadeIn(frame, 30, 20);
  const titleY = slideUp(frame, 30, 20);
  const subOpacity = fadeIn(frame, 50, 15);
  const bgPulse = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 35%, rgba(245,166,35,${0.25 * bgPulse}) 0%, ${DARK_BG} 65%)`,
      overflow: "hidden",
    }}>
      <ScanLine frame={frame} />
      <Particles frame={frame} count={12} />

      {/* Linhas diagonais de energia */}
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: 2,
          height: "140%",
          background: `linear-gradient(180deg, transparent, ${GOLD}${Math.round(20 + i * 10).toString(16)}, transparent)`,
          left: `${20 + i * 20}%`,
          top: "-20%",
          transform: `rotate(${15 + i * 5}deg)`,
          opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
        }} />
      ))}

      {/* Logo central */}
      <div style={{
        position: "absolute", top: "30%", left: "50%",
        transform: `translate(-50%, -50%) scale(${logoScale})`,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
      }}>
        <div style={{
          width: 140, height: 140, borderRadius: "50%",
          background: `linear-gradient(135deg, ${GOLD_DARK} 0%, ${GOLD} 50%, ${GOLD_LIGHT} 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 72,
          boxShadow: `0 0 ${60 * glowPulse}px ${GOLD}99, 0 0 120px ${GOLD}44`,
        }}>
          🏆
        </div>
        <div style={{
          color: GOLD, fontSize: 88, fontWeight: 900, fontFamily: "sans-serif",
          letterSpacing: -3,
          textShadow: `0 0 40px ${GOLD}88`,
        }}>
          Plakr!
        </div>
      </div>

      {/* Título */}
      <div style={{
        position: "absolute", bottom: "28%", width: "100%", textAlign: "center",
        opacity: titleOpacity, transform: `translateY(${titleY}px)`,
        padding: "0 60px",
      }}>
        <div style={{ color: WHITE, fontSize: 48, fontWeight: 800, fontFamily: "sans-serif", lineHeight: 1.2 }}>
          Sua Retrospectiva
        </div>
        <div style={{ color: GOLD, fontSize: 48, fontWeight: 800, fontFamily: "sans-serif" }}>
          do Bolão
        </div>
      </div>

      {/* Nome do bolão */}
      <div style={{
        position: "absolute", bottom: "14%", width: "100%", textAlign: "center",
        opacity: subOpacity,
      }}>
        <div style={{
          display: "inline-block",
          background: `${GOLD}18`, border: `1px solid ${GOLD}44`,
          borderRadius: 40, padding: "10px 36px",
          color: GRAY, fontSize: 28, fontFamily: "sans-serif",
        }}>
          {data.poolName}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── CENA 2: APRESENTAÇÃO DO USUÁRIO (frames 90–179) ─────────────────────────
const SceneUsuario: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame;

  const avatarScale = scaleSpring(lf, fps, 5, 12, 130);
  const nameOpacity = fadeIn(lf, 22, 18);
  const nameY = slideUp(lf, 22, 18);
  const tagOpacity = fadeIn(lf, 38, 15);
  const tagX = slideLeft(lf, 38, 15);
  const ringPulse = 1 + 0.06 * Math.sin(lf * 0.12);

  const initials = data.userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <AbsoluteFill style={{ background: DARK_BG, overflow: "hidden" }}>
      {/* Linha dourada superior */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 4,
        background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
      }} />

      {/* Background grid sutil */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(${GOLD}08 1px, transparent 1px), linear-gradient(90deg, ${GOLD}08 1px, transparent 1px)`,
        backgroundSize: "80px 80px",
      }} />

      <div style={{
        position: "absolute", top: "38%", left: "50%",
        transform: `translate(-50%, -50%)`,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 36,
      }}>
        {/* Avatar com anel pulsante */}
        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute", inset: -12,
            borderRadius: "50%",
            border: `3px solid ${GOLD}66`,
            transform: `scale(${ringPulse})`,
          }} />
          <div style={{
            position: "absolute", inset: -24,
            borderRadius: "50%",
            border: `1px solid ${GOLD}33`,
            transform: `scale(${ringPulse * 0.95})`,
          }} />
          <div style={{
            width: 200, height: 200, borderRadius: "50%",
            background: `linear-gradient(135deg, ${GOLD_DARK} 0%, ${GOLD} 60%, ${GOLD_LIGHT} 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 88, fontWeight: 900, color: DARK_BG, fontFamily: "sans-serif",
            transform: `scale(${avatarScale})`,
            boxShadow: `0 0 80px ${GOLD}55`,
          }}>
            {initials}
          </div>
        </div>

        {/* Nome */}
        <div style={{ opacity: nameOpacity, transform: `translateY(${nameY}px)`, textAlign: "center" }}>
          <div style={{ color: GRAY, fontSize: 28, fontFamily: "sans-serif", marginBottom: 10, letterSpacing: 2, textTransform: "uppercase" }}>
            A retrospectiva de
          </div>
          <div style={{ color: WHITE, fontSize: 62, fontWeight: 900, fontFamily: "sans-serif", lineHeight: 1.05, letterSpacing: -1 }}>
            {data.userName}
          </div>
        </div>

        {/* Tag do campeonato */}
        <div style={{ opacity: tagOpacity, transform: `translateX(${tagX}px)` }}>
          <div style={{
            background: `linear-gradient(135deg, ${GOLD}22, ${GOLD}11)`,
            border: `2px solid ${GOLD}55`,
            borderRadius: 50, padding: "14px 40px",
            color: GOLD, fontSize: 28, fontFamily: "sans-serif", fontWeight: 700,
          }}>
            🏆 {data.tournamentName ?? data.poolName}
          </div>
        </div>
      </div>

      {/* Linha dourada inferior */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 4,
        background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
      }} />
    </AbsoluteFill>
  );
};

// ─── CENA 3: POSIÇÃO FINAL (frames 180–299) ──────────────────────────────────
const ScenePosicao: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame;

  const medalScale = scaleSpring(lf, fps, 5, 8, 140);
  const posOpacity = fadeIn(lf, 22, 18);
  const posY = slideUp(lf, 22, 18);
  const subOpacity = fadeIn(lf, 45, 15);
  const glowAnim = 40 + 20 * Math.sin(lf * 0.1);

  const medalEmoji = data.finalPosition === 1 ? "🥇" : data.finalPosition === 2 ? "🥈" : data.finalPosition === 3 ? "🥉" : "🏅";
  const posLabel = data.finalPosition === 1 ? "CAMPEÃO!" : data.finalPosition === 2 ? "VICE-CAMPEÃO!" : data.finalPosition === 3 ? "3º LUGAR!" : `${data.finalPosition}º LUGAR`;
  const posColor = data.finalPosition === 1 ? GOLD : data.finalPosition === 2 ? "#C0C0C0" : data.finalPosition === 3 ? "#CD7F32" : WHITE;

  // Barra de ranking
  const rankPct = ((data.totalParticipants - data.finalPosition) / (data.totalParticipants - 1)) * 100;
  const barWidth = interpolate(lf, [50, 90], [0, rankPct], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 38%, rgba(30,15,0,0.9) 0%, ${DARK_BG} 65%)`,
      overflow: "hidden",
    }}>
      <Particles frame={lf} count={10} />

      {/* Label topo */}
      <div style={{
        position: "absolute", top: "8%", width: "100%", textAlign: "center",
        opacity: fadeIn(lf, 0, 15),
      }}>
        <div style={{
          color: GRAY, fontSize: 28, fontFamily: "sans-serif",
          letterSpacing: 6, textTransform: "uppercase",
        }}>
          Posição Final
        </div>
      </div>

      {/* Medalha */}
      <div style={{
        position: "absolute", top: "32%", left: "50%",
        transform: `translate(-50%, -50%) scale(${medalScale})`,
        fontSize: 180, textAlign: "center",
        filter: `drop-shadow(0 0 ${glowAnim}px ${posColor}cc)`,
      }}>
        {medalEmoji}
      </div>

      {/* Número da posição */}
      <div style={{
        position: "absolute", top: "54%", width: "100%", textAlign: "center",
        opacity: posOpacity, transform: `translateY(${posY}px)`,
      }}>
        <div style={{
          color: posColor, fontSize: 140, fontWeight: 900, fontFamily: "sans-serif",
          lineHeight: 1, textShadow: `0 0 60px ${posColor}88`,
        }}>
          #{data.finalPosition}
        </div>
        <div style={{ color: WHITE, fontSize: 48, fontWeight: 800, fontFamily: "sans-serif", marginTop: 4, letterSpacing: 2 }}>
          {posLabel}
        </div>
      </div>

      {/* Ranking bar */}
      <div style={{
        position: "absolute", bottom: "18%", left: "80px", right: "80px",
        opacity: subOpacity,
      }}>
        <div style={{ color: GRAY, fontSize: 24, fontFamily: "sans-serif", marginBottom: 12, textAlign: "center" }}>
          entre <span style={{ color: WHITE, fontWeight: 700 }}>{data.totalParticipants} participantes</span>
        </div>
        <div style={{ height: 10, background: `${WHITE}18`, borderRadius: 5, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${barWidth}%`,
            background: `linear-gradient(90deg, ${GOLD_DARK}, ${GOLD}, ${GOLD_LIGHT})`,
            borderRadius: 5,
            boxShadow: `0 0 12px ${GOLD}88`,
          }} />
        </div>
        <div style={{ color: GOLD, fontSize: 22, fontFamily: "sans-serif", marginTop: 10, textAlign: "right", fontWeight: 700 }}>
          Top {Math.round(100 - rankPct + 1)}% do bolão
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── CENA 4: SEUS NÚMEROS (frames 300–419) ───────────────────────────────────
const SceneNumeros: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const lf = frame;

  const titleOpacity = fadeIn(lf, 0, 15);

  const stats = [
    { label: "Palpites enviados", value: data.totalBets, max: data.totalBets, suffix: "", color: WHITE, icon: "📋" },
    { label: "Resultados certos", value: data.correctResultCount, max: data.totalBets, suffix: "", color: TEAL, icon: "✅" },
    { label: "Placares exatos", value: data.exactScoreCount, max: data.totalBets, suffix: "", color: GOLD, icon: "🎯" },
    { label: "Zebras acertadas", value: data.zebraCount, max: data.totalBets, suffix: "", color: RED, icon: "🦓" },
    { label: "Taxa de acerto", value: data.accuracyPct, max: 100, suffix: "%", color: BLUE, icon: "📊" },
  ];

  return (
    <AbsoluteFill style={{ background: DARK_BG, overflow: "hidden" }}>
      {/* Grid de fundo */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(${GOLD}06 1px, transparent 1px), linear-gradient(90deg, ${GOLD}06 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />

      {/* Título */}
      <div style={{
        position: "absolute", top: "7%", width: "100%", textAlign: "center",
        opacity: titleOpacity,
      }}>
        <div style={{
          color: GOLD, fontSize: 38, fontWeight: 900, fontFamily: "sans-serif",
          letterSpacing: 4, textTransform: "uppercase",
        }}>
          ⚡ Seus Números
        </div>
      </div>

      {/* Stats */}
      <div style={{
        position: "absolute", top: "18%", left: "60px", right: "60px",
        display: "flex", flexDirection: "column", gap: 28,
      }}>
        {stats.map((stat, i) => {
          const delay = i * 10;
          const itemOpacity = fadeIn(lf, delay, 15);
          const itemX = slideLeft(lf, delay, 15);
          const barWidth = interpolate(lf, [delay + 15, delay + 50], [0, (stat.value / stat.max) * 100], {
            extrapolateRight: "clamp", extrapolateLeft: "clamp",
          });
          const valCount = counter(lf, 0, stat.value, delay + 15, delay + 50);

          return (
            <div key={i} style={{ opacity: itemOpacity, transform: `translateX(${itemX}px)` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 28 }}>{stat.icon}</span>
                  <span style={{ color: GRAY, fontSize: 26, fontFamily: "sans-serif" }}>{stat.label}</span>
                </div>
                <span style={{ color: stat.color, fontSize: 40, fontWeight: 900, fontFamily: "sans-serif" }}>
                  {valCount}{stat.suffix}
                </span>
              </div>
              <div style={{ height: 8, background: `${WHITE}12`, borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${barWidth}%`,
                  background: `linear-gradient(90deg, ${stat.color}88, ${stat.color})`,
                  borderRadius: 4,
                  boxShadow: `0 0 8px ${stat.color}66`,
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Pontuação total no fundo */}
      <div style={{
        position: "absolute", bottom: "8%", width: "100%", textAlign: "center",
        opacity: fadeIn(lf, 60, 15),
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 16,
          background: `linear-gradient(135deg, ${GOLD}22, ${GOLD}11)`,
          border: `2px solid ${GOLD}55`, borderRadius: 60,
          padding: "16px 48px",
        }}>
          <span style={{ color: GOLD, fontSize: 52, fontWeight: 900, fontFamily: "sans-serif" }}>
            {counter(lf, 0, data.totalPoints, 60, 100)}
          </span>
          <span style={{ color: GRAY, fontSize: 30, fontFamily: "sans-serif" }}>pontos totais</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── CENA 5: MELHOR MOMENTO (frames 420–509) ─────────────────────────────────
const SceneMelhorMomento: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame;

  const cardScale = scaleSpring(lf, fps, 8, 10, 130);
  const titleOpacity = fadeIn(lf, 0, 15);
  const contentOpacity = fadeIn(lf, 18, 15);
  const ptsOpacity = fadeIn(lf, 45, 15);
  const ptsScale = scaleSpring(lf, fps, 45, 14, 110);

  const bd = data.bestMomentData as Record<string, unknown>;
  const homeTeam = (bd.homeTeam as string) ?? "Brasil";
  const awayTeam = (bd.awayTeam as string) ?? "Argentina";
  const homeScore = (bd.homeScore as number) ?? 2;
  const awayScore = (bd.awayScore as number) ?? 1;
  const points = (bd.points as number) ?? 10;

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 55%, rgba(0,40,20,0.8) 0%, ${DARK_BG} 65%)`,
      overflow: "hidden",
    }}>
      {/* Título */}
      <div style={{
        position: "absolute", top: "7%", width: "100%", textAlign: "center",
        opacity: titleOpacity,
      }}>
        <div style={{ color: TEAL, fontSize: 34, fontWeight: 900, fontFamily: "sans-serif", letterSpacing: 3, textTransform: "uppercase" }}>
          ⭐ Melhor Momento
        </div>
        <div style={{ color: GRAY, fontSize: 26, fontFamily: "sans-serif", marginTop: 8 }}>
          Você acertou o placar exato!
        </div>
      </div>

      {/* Card do placar */}
      <div style={{
        position: "absolute", top: "24%", left: "60px", right: "60px",
        transform: `scale(${cardScale})`,
        background: DARK_CARD2,
        borderRadius: 36, padding: "44px 36px",
        border: `2px solid ${TEAL}44`,
        boxShadow: `0 0 60px ${TEAL}22, inset 0 1px 0 ${WHITE}08`,
        opacity: contentOpacity,
      }}>
        {/* Times */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>🇧🇷</div>
            <div style={{ color: WHITE, fontSize: 28, fontWeight: 700, fontFamily: "sans-serif" }}>{homeTeam}</div>
          </div>
          <div style={{ textAlign: "center", padding: "0 16px" }}>
            <div style={{
              color: GOLD, fontSize: 88, fontWeight: 900, fontFamily: "sans-serif",
              textShadow: `0 0 30px ${GOLD}88`, lineHeight: 1,
            }}>
              {homeScore}×{awayScore}
            </div>
            <div style={{ color: GRAY, fontSize: 22, fontFamily: "sans-serif", marginTop: 4 }}>
              Placar exato!
            </div>
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>🇦🇷</div>
            <div style={{ color: WHITE, fontSize: 28, fontWeight: 700, fontFamily: "sans-serif" }}>{awayTeam}</div>
          </div>
        </div>

        {/* Pontos */}
        <div style={{
          textAlign: "center",
          background: `${TEAL}18`, borderRadius: 20, padding: "18px 24px",
          border: `1px solid ${TEAL}44`,
          opacity: ptsOpacity, transform: `scale(${ptsScale})`,
        }}>
          <div style={{ color: TEAL, fontSize: 44, fontWeight: 900, fontFamily: "sans-serif" }}>
            +{points} pontos
          </div>
          <div style={{ color: GRAY, fontSize: 22, fontFamily: "sans-serif", marginTop: 4 }}>
            sua maior pontuação em um único jogo
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── CENA 6: BADGE LENDÁRIO (frames 510–599) ─────────────────────────────────
const SceneBadge: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame;

  const badgeScale = scaleSpring(lf, fps, 10, 8, 150);
  const titleOpacity = fadeIn(lf, 0, 15);
  const nameOpacity = fadeIn(lf, 30, 18);
  const nameY = slideUp(lf, 30, 18);
  const descOpacity = fadeIn(lf, 48, 15);
  const glowPulse = 40 + 25 * Math.sin(lf * 0.15);
  const ringRotate = lf * 1.2;

  const badgeName = data.badgeEarnedName ?? "Lendário";
  const badgeEmoji = data.badgeEarnedEmoji ?? "⚡";

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 40%, rgba(60,0,80,0.7) 0%, ${DARK_BG} 65%)`,
      overflow: "hidden",
    }}>
      {/* Partículas roxas */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2 + lf * 0.02;
        const r = 200 + i * 20;
        return (
          <div key={i} style={{
            position: "absolute",
            width: 6, height: 6, borderRadius: "50%",
            background: PURPLE,
            opacity: 0.3 + 0.2 * Math.sin(lf * 0.1 + i),
            left: 540 + Math.cos(angle) * r - 3,
            top: 700 + Math.sin(angle) * r * 0.5 - 3,
          }} />
        );
      })}

      {/* Título */}
      <div style={{
        position: "absolute", top: "8%", width: "100%", textAlign: "center",
        opacity: titleOpacity,
      }}>
        <div style={{ color: PURPLE, fontSize: 32, fontWeight: 900, fontFamily: "sans-serif", letterSpacing: 4, textTransform: "uppercase" }}>
          🏅 Badge Conquistado
        </div>
      </div>

      {/* Badge central */}
      <div style={{
        position: "absolute", top: "38%", left: "50%",
        transform: `translate(-50%, -50%)`,
      }}>
        {/* Anel giratório */}
        <div style={{
          position: "absolute", inset: -30,
          borderRadius: "50%",
          border: `3px dashed ${PURPLE}66`,
          transform: `rotate(${ringRotate}deg)`,
        }} />
        <div style={{
          position: "absolute", inset: -50,
          borderRadius: "50%",
          border: `2px dashed ${GOLD}33`,
          transform: `rotate(${-ringRotate * 0.7}deg)`,
        }} />

        {/* Badge */}
        <div style={{
          width: 200, height: 200, borderRadius: "50%",
          background: `linear-gradient(135deg, ${PURPLE} 0%, #6C3483 50%, #9B59B6 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 96,
          transform: `scale(${badgeScale})`,
          boxShadow: `0 0 ${glowPulse}px ${PURPLE}88, 0 0 ${glowPulse * 2}px ${PURPLE}44`,
        }}>
          {badgeEmoji}
        </div>
      </div>

      {/* Nome do badge */}
      <div style={{
        position: "absolute", top: "62%", width: "100%", textAlign: "center",
        opacity: nameOpacity, transform: `translateY(${nameY}px)`,
      }}>
        <div style={{ color: WHITE, fontSize: 60, fontWeight: 900, fontFamily: "sans-serif", lineHeight: 1.1 }}>
          {badgeName}
        </div>
        <div style={{
          display: "inline-block",
          background: `${PURPLE}33`, border: `2px solid ${PURPLE}66`,
          borderRadius: 30, padding: "8px 28px", marginTop: 12,
          color: PURPLE, fontSize: 24, fontFamily: "sans-serif",
        }}>
          BADGE LENDÁRIO
        </div>
      </div>

      {/* Descrição */}
      <div style={{
        position: "absolute", bottom: "10%", left: "80px", right: "80px",
        textAlign: "center", opacity: descOpacity,
      }}>
        <div style={{ color: GRAY, fontSize: 26, fontFamily: "sans-serif", lineHeight: 1.5 }}>
          Conquistado por acertar mais de 60% dos placares exatos do campeonato
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── CENA 7: DUELO ACIRRADO (frames 600–719) ─────────────────────────────────
const SceneDuelo: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame;

  const titleOpacity = fadeIn(lf, 0, 15);
  const vsOpacity = fadeIn(lf, 20, 18);
  const vsScale = scaleSpring(lf, fps, 20, 10, 130);
  const leftOpacity = fadeIn(lf, 12, 18);
  const leftX = slideLeft(lf, 12, 18, 120);
  const rightOpacity = fadeIn(lf, 12, 18);
  const rightX = -slideLeft(lf, 12, 18, 120);
  const statsOpacity = fadeIn(lf, 50, 18);
  const statsY = slideUp(lf, 50, 18);
  const resultOpacity = fadeIn(lf, 75, 18);
  const resultScale = scaleSpring(lf, fps, 75, 12, 110);

  // Dados fictícios do duelo
  const rival = { name: "Carlos Lima", initials: "CL", pts: 182, position: 4 };
  const user = { name: data.userName, initials: data.userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(), pts: data.totalPoints, position: data.finalPosition };

  // Barra de progresso do duelo
  const totalPts = user.pts + rival.pts;
  const userBarPct = (user.pts / totalPts) * 100;
  const rivalBarPct = (rival.pts / totalPts) * 100;
  const userBarW = interpolate(lf, [55, 90], [0, userBarPct], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const rivalBarW = interpolate(lf, [55, 90], [0, rivalBarPct], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 50%, rgba(20,0,0,0.8) 0%, ${DARK_BG} 65%)`,
      overflow: "hidden",
    }}>
      {/* Título */}
      <div style={{
        position: "absolute", top: "6%", width: "100%", textAlign: "center",
        opacity: titleOpacity,
      }}>
        <div style={{ color: RED, fontSize: 34, fontWeight: 900, fontFamily: "sans-serif", letterSpacing: 3, textTransform: "uppercase" }}>
          ⚔️ Duelo Acirrado
        </div>
        <div style={{ color: GRAY, fontSize: 24, fontFamily: "sans-serif", marginTop: 6 }}>
          A disputa mais acirrada do bolão
        </div>
      </div>

      {/* Jogadores */}
      <div style={{
        position: "absolute", top: "22%", left: 0, right: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 60px",
      }}>
        {/* Usuário */}
        <div style={{
          opacity: leftOpacity, transform: `translateX(${leftX}px)`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 14, flex: 1,
        }}>
          <div style={{
            width: 130, height: 130, borderRadius: "50%",
            background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 56, fontWeight: 900, color: DARK_BG, fontFamily: "sans-serif",
            boxShadow: `0 0 40px ${GOLD}66`,
            border: `3px solid ${GOLD}`,
          }}>
            {user.initials}
          </div>
          <div style={{ color: WHITE, fontSize: 28, fontWeight: 800, fontFamily: "sans-serif", textAlign: "center" }}>
            {user.name.split(" ")[0]}
          </div>
          <div style={{
            background: `${GOLD}22`, border: `1px solid ${GOLD}66`,
            borderRadius: 20, padding: "6px 18px",
            color: GOLD, fontSize: 22, fontFamily: "sans-serif", fontWeight: 700,
          }}>
            #{user.position}
          </div>
        </div>

        {/* VS */}
        <div style={{
          opacity: vsOpacity, transform: `scale(${vsScale})`,
          textAlign: "center", padding: "0 20px",
        }}>
          <div style={{
            color: RED, fontSize: 64, fontWeight: 900, fontFamily: "sans-serif",
            textShadow: `0 0 30px ${RED}88`,
          }}>
            VS
          </div>
        </div>

        {/* Rival */}
        <div style={{
          opacity: rightOpacity, transform: `translateX(${rightX}px)`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 14, flex: 1,
        }}>
          <div style={{
            width: 130, height: 130, borderRadius: "50%",
            background: `linear-gradient(135deg, #444, #666)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 56, fontWeight: 900, color: WHITE, fontFamily: "sans-serif",
            border: `3px solid #666`,
          }}>
            {rival.initials}
          </div>
          <div style={{ color: WHITE, fontSize: 28, fontWeight: 800, fontFamily: "sans-serif", textAlign: "center" }}>
            {rival.name.split(" ")[0]}
          </div>
          <div style={{
            background: `${WHITE}11`, border: `1px solid ${WHITE}33`,
            borderRadius: 20, padding: "6px 18px",
            color: GRAY, fontSize: 22, fontFamily: "sans-serif", fontWeight: 700,
          }}>
            #{rival.position}
          </div>
        </div>
      </div>

      {/* Barras de pontuação */}
      <div style={{
        position: "absolute", top: "60%", left: "60px", right: "60px",
        opacity: statsOpacity, transform: `translateY(${statsY}px)`,
      }}>
        <div style={{ color: GRAY, fontSize: 24, fontFamily: "sans-serif", textAlign: "center", marginBottom: 20 }}>
          Pontuação final
        </div>

        {/* Barra usuário */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: GOLD, fontSize: 24, fontFamily: "sans-serif", fontWeight: 700 }}>{user.name.split(" ")[0]}</span>
            <span style={{ color: GOLD, fontSize: 28, fontFamily: "sans-serif", fontWeight: 900 }}>{user.pts} pts</span>
          </div>
          <div style={{ height: 10, background: `${WHITE}12`, borderRadius: 5, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${userBarW}%`,
              background: `linear-gradient(90deg, ${GOLD_DARK}, ${GOLD})`,
              borderRadius: 5, boxShadow: `0 0 10px ${GOLD}88`,
            }} />
          </div>
        </div>

        {/* Barra rival */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: GRAY, fontSize: 24, fontFamily: "sans-serif", fontWeight: 700 }}>{rival.name.split(" ")[0]}</span>
            <span style={{ color: GRAY, fontSize: 28, fontFamily: "sans-serif", fontWeight: 900 }}>{rival.pts} pts</span>
          </div>
          <div style={{ height: 10, background: `${WHITE}12`, borderRadius: 5, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${rivalBarW}%`,
              background: `linear-gradient(90deg, #444, #666)`,
              borderRadius: 5,
            }} />
          </div>
        </div>
      </div>

      {/* Resultado */}
      <div style={{
        position: "absolute", bottom: "8%", width: "100%", textAlign: "center",
        opacity: resultOpacity, transform: `scale(${resultScale})`,
      }}>
        <div style={{
          display: "inline-block",
          background: `${GOLD}22`, border: `2px solid ${GOLD}66`,
          borderRadius: 40, padding: "14px 40px",
          color: GOLD, fontSize: 30, fontFamily: "sans-serif", fontWeight: 800,
        }}>
          🏆 Você venceu por {user.pts - rival.pts} pontos!
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── CENA 8: COMPARATIVO GERAL (frames 720–839) ──────────────────────────────
const SceneComparativo: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame;

  const titleOpacity = fadeIn(lf, 0, 15);

  // Dados comparativos fictícios
  const comparisons = [
    { label: "Taxa de acerto", user: data.accuracyPct, avg: 41, suffix: "%", color: TEAL, icon: "🎯" },
    { label: "Placares exatos", user: data.exactScoreCount, avg: 7, suffix: "", color: GOLD, icon: "⚡" },
    { label: "Zebras acertadas", user: data.zebraCount, avg: 1, suffix: "", color: RED, icon: "🦓" },
  ];

  const superiorPct = Math.round(((data.totalParticipants - data.finalPosition) / (data.totalParticipants - 1)) * 100);
  const highlightScale = scaleSpring(lf, fps, 70, 10, 130);
  const highlightOpacity = fadeIn(lf, 70, 18);

  return (
    <AbsoluteFill style={{ background: DARK_BG, overflow: "hidden" }}>
      {/* Grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(${BLUE}06 1px, transparent 1px), linear-gradient(90deg, ${BLUE}06 1px, transparent 1px)`,
        backgroundSize: "70px 70px",
      }} />

      {/* Título */}
      <div style={{
        position: "absolute", top: "6%", width: "100%", textAlign: "center",
        opacity: titleOpacity,
      }}>
        <div style={{ color: BLUE, fontSize: 34, fontWeight: 900, fontFamily: "sans-serif", letterSpacing: 3, textTransform: "uppercase" }}>
          📊 Você vs. Todos
        </div>
        <div style={{ color: GRAY, fontSize: 24, fontFamily: "sans-serif", marginTop: 6 }}>
          Comparativo com a média do bolão
        </div>
      </div>

      {/* Comparativos */}
      <div style={{
        position: "absolute", top: "18%", left: "60px", right: "60px",
        display: "flex", flexDirection: "column", gap: 36,
      }}>
        {comparisons.map((comp, i) => {
          const delay = i * 14;
          const itemOpacity = fadeIn(lf, delay, 15);
          const itemY = slideUp(lf, delay, 15);
          const userBarW = interpolate(lf, [delay + 15, delay + 55], [0, Math.min(comp.user / Math.max(comp.user, comp.avg) * 80, 80)], {
            extrapolateRight: "clamp", extrapolateLeft: "clamp",
          });
          const avgBarW = interpolate(lf, [delay + 15, delay + 55], [0, Math.min(comp.avg / Math.max(comp.user, comp.avg) * 80, 80)], {
            extrapolateRight: "clamp", extrapolateLeft: "clamp",
          });
          const diff = comp.user - comp.avg;
          const diffPct = Math.round((diff / Math.max(comp.avg, 1)) * 100);

          return (
            <div key={i} style={{ opacity: itemOpacity, transform: `translateY(${itemY}px)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>{comp.icon}</span>
                <span style={{ color: WHITE, fontSize: 26, fontFamily: "sans-serif", fontWeight: 700 }}>{comp.label}</span>
                <div style={{
                  marginLeft: "auto",
                  background: `${comp.color}22`, border: `1px solid ${comp.color}66`,
                  borderRadius: 20, padding: "4px 14px",
                  color: comp.color, fontSize: 20, fontFamily: "sans-serif", fontWeight: 700,
                }}>
                  +{diffPct}% acima
                </div>
              </div>

              {/* Barra usuário */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ color: GOLD, fontSize: 20, fontFamily: "sans-serif", width: 60, textAlign: "right" }}>Você</span>
                <div style={{ flex: 1, height: 8, background: `${WHITE}12`, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${userBarW}%`,
                    background: `linear-gradient(90deg, ${comp.color}88, ${comp.color})`,
                    borderRadius: 4,
                  }} />
                </div>
                <span style={{ color: comp.color, fontSize: 24, fontFamily: "sans-serif", fontWeight: 800, width: 60 }}>
                  {comp.user}{comp.suffix}
                </span>
              </div>

              {/* Barra média */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: GRAY, fontSize: 20, fontFamily: "sans-serif", width: 60, textAlign: "right" }}>Média</span>
                <div style={{ flex: 1, height: 8, background: `${WHITE}12`, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${avgBarW}%`,
                    background: `${GRAY}66`,
                    borderRadius: 4,
                  }} />
                </div>
                <span style={{ color: GRAY, fontSize: 24, fontFamily: "sans-serif", width: 60 }}>
                  {comp.avg}{comp.suffix}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Destaque final */}
      <div style={{
        position: "absolute", bottom: "8%", width: "100%", textAlign: "center",
        opacity: highlightOpacity, transform: `scale(${highlightScale})`,
      }}>
        <div style={{
          display: "inline-block",
          background: `linear-gradient(135deg, ${TEAL}22, ${TEAL}11)`,
          border: `2px solid ${TEAL}66`,
          borderRadius: 50, padding: "18px 50px",
        }}>
          <div style={{ color: TEAL, fontSize: 44, fontWeight: 900, fontFamily: "sans-serif" }}>
            Top {100 - superiorPct}%
          </div>
          <div style={{ color: GRAY, fontSize: 22, fontFamily: "sans-serif", marginTop: 4 }}>
            você superou {superiorPct}% dos apostadores
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── CENA 9: ENCERRAMENTO + CTA (frames 840–899) ─────────────────────────────
const SceneEncerramento: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame;

  const logoScale = scaleSpring(lf, fps, 5, 10, 130);
  const phraseOpacity = fadeIn(lf, 18, 18);
  const phraseY = slideUp(lf, 18, 18);
  const ctaOpacity = fadeIn(lf, 36, 18);
  const ctaScale = scaleSpring(lf, fps, 36, 12, 110);
  const glowPulse = 50 + 30 * Math.sin(lf * 0.18);

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 30%, rgba(40,25,0,0.9) 0%, ${DARK_BG} 65%)`,
      overflow: "hidden",
    }}>
      <Particles frame={lf} count={14} />

      {/* Linhas de energia */}
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: 2, height: "120%",
          background: `linear-gradient(180deg, transparent, ${GOLD}${(15 + i * 8).toString(16)}, transparent)`,
          left: `${25 + i * 25}%`,
          top: "-10%",
          transform: `rotate(${10 + i * 8}deg)`,
          opacity: 0.6,
        }} />
      ))}

      {/* Logo */}
      <div style={{
        position: "absolute", top: "26%", left: "50%",
        transform: `translate(-50%, -50%) scale(${logoScale})`,
        textAlign: "center",
        filter: `drop-shadow(0 0 ${glowPulse}px ${GOLD}88)`,
      }}>
        <div style={{ fontSize: 90, marginBottom: 12 }}>🏆</div>
        <div style={{
          color: GOLD, fontSize: 96, fontWeight: 900, fontFamily: "sans-serif",
          letterSpacing: -3, textShadow: `0 0 60px ${GOLD}88`,
        }}>
          Plakr!
        </div>
      </div>

      {/* Frase */}
      <div style={{
        position: "absolute", top: "52%", left: "60px", right: "60px",
        opacity: phraseOpacity, transform: `translateY(${phraseY}px)`,
        textAlign: "center",
      }}>
        <div style={{
          color: WHITE, fontSize: 36, fontFamily: "sans-serif",
          lineHeight: 1.5, fontStyle: "italic",
        }}>
          "{data.closingPhrase}"
        </div>
      </div>

      {/* CTA */}
      <div style={{
        position: "absolute", bottom: "12%", width: "100%", textAlign: "center",
        opacity: ctaOpacity, transform: `scale(${ctaScale})`,
      }}>
        <div style={{
          display: "inline-block",
          background: `linear-gradient(135deg, ${GOLD_DARK} 0%, ${GOLD} 50%, ${GOLD_LIGHT} 100%)`,
          borderRadius: 60, padding: "22px 70px",
          color: DARK_BG, fontSize: 34, fontWeight: 900, fontFamily: "sans-serif",
          boxShadow: `0 8px 40px ${GOLD}66`,
        }}>
          Venha se divertir com amigos!
        </div>
        <div style={{ color: GRAY, fontSize: 26, fontFamily: "sans-serif", marginTop: 14 }}>
          plakr.io
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── COMPOSIÇÃO PRINCIPAL ─────────────────────────────────────────────────────
export const PlakrRetrospectiva: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const AUDIO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663029677047/dJv8mGehu4r2vn8N2SWpLW/plakr_track_e99f1822.mp3";

  return (
    <AbsoluteFill style={{ background: DARK_BG, fontFamily: "sans-serif" }}>
      {/* Trilha sonora sincronizada */}
      <Audio src={AUDIO_URL} volume={0.85} />

      {/* Cena 1: Abertura (0–89) */}
      <Sequence from={0} durationInFrames={90}>
        <SceneAbertura data={data} />
      </Sequence>

      {/* Cena 2: Usuário (90–179) */}
      <Sequence from={90} durationInFrames={90}>
        <SceneUsuario data={data} />
      </Sequence>

      {/* Cena 3: Posição Final (180–299) */}
      <Sequence from={180} durationInFrames={120}>
        <ScenePosicao data={data} />
      </Sequence>

      {/* Cena 4: Números (300–419) */}
      <Sequence from={300} durationInFrames={120}>
        <SceneNumeros data={data} />
      </Sequence>

      {/* Cena 5: Melhor Momento (420–509) */}
      <Sequence from={420} durationInFrames={90}>
        <SceneMelhorMomento data={data} />
      </Sequence>

      {/* Cena 6: Badge Lendário (510–599) */}
      <Sequence from={510} durationInFrames={90}>
        <SceneBadge data={data} />
      </Sequence>

      {/* Cena 7: Duelo Acirrado (600–719) */}
      <Sequence from={600} durationInFrames={120}>
        <SceneDuelo data={data} />
      </Sequence>

      {/* Cena 8: Comparativo (720–839) */}
      <Sequence from={720} durationInFrames={120}>
        <SceneComparativo data={data} />
      </Sequence>

      {/* Cena 9: Encerramento (840–899) */}
      <Sequence from={840} durationInFrames={60}>
        <SceneEncerramento data={data} />
      </Sequence>
    </AbsoluteFill>
  );
};
