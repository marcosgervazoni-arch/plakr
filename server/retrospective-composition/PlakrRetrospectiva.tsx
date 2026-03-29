/**
 * Plakr! — Composição Principal da Retrospectiva
 * 7 cenas animadas, 660 frames @ 30fps (22 segundos)
 * Identidade visual: #F5A623 (dourado), #1A1A2E (fundo escuro), #FFFFFF (texto)
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

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const GOLD = "#F5A623";
const GOLD_LIGHT = "#FFD166";
const DARK_BG = "#0D0D1A";
const DARK_CARD = "#1A1A2E";
const WHITE = "#FFFFFF";
const GRAY = "#A0A0B8";

// ─── HELPERS DE ANIMAÇÃO ─────────────────────────────────────────────────────
function fadeIn(frame: number, from = 0, duration = 20) {
  return interpolate(frame, [from, from + duration], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
}

function slideUp(frame: number, from = 0, duration = 20) {
  return interpolate(frame, [from, from + duration], [40, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
}

function scaleIn(frame: number, fps: number, from = 0) {
  return spring({ frame: frame - from, fps, config: { damping: 12, stiffness: 100 }, durationInFrames: 30 });
}

// ─── CENA 1: ABERTURA (frames 0–89) ──────────────────────────────────────────
const SceneAbertura: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = scaleIn(frame, fps, 10);
  const titleOpacity = fadeIn(frame, 35);
  const titleY = slideUp(frame, 35);
  const subOpacity = fadeIn(frame, 55);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, #2A1A00 0%, ${DARK_BG} 70%)` }}>
      {/* Partículas decorativas */}
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: 4, height: 4,
          borderRadius: "50%",
          background: GOLD,
          opacity: 0.4,
          left: `${15 + i * 14}%`,
          top: `${20 + (i % 3) * 15}%`,
          transform: `scale(${interpolate(frame, [0, 90], [0, 1], { extrapolateRight: "clamp" })})`,
        }} />
      ))}

      {/* Logo Plakr */}
      <div style={{
        position: "absolute", top: "28%", left: "50%",
        transform: `translate(-50%, -50%) scale(${logoScale})`,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
      }}>
        {/* Ícone do troféu */}
        <div style={{
          width: 120, height: 120, borderRadius: "50%",
          background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 64, boxShadow: `0 0 60px ${GOLD}88`,
        }}>
          🏆
        </div>
        <div style={{ color: GOLD, fontSize: 72, fontWeight: 900, letterSpacing: -2, fontFamily: "sans-serif" }}>
          Plakr!
        </div>
      </div>

      {/* Título */}
      <div style={{
        position: "absolute", bottom: "30%", width: "100%", textAlign: "center",
        opacity: titleOpacity, transform: `translateY(${titleY}px)`,
      }}>
        <div style={{ color: WHITE, fontSize: 44, fontWeight: 700, fontFamily: "sans-serif", lineHeight: 1.3, padding: "0 80px" }}>
          Sua Retrospectiva
        </div>
        <div style={{ color: GOLD, fontSize: 44, fontWeight: 700, fontFamily: "sans-serif" }}>
          do Bolão
        </div>
      </div>

      {/* Nome do bolão */}
      <div style={{
        position: "absolute", bottom: "18%", width: "100%", textAlign: "center",
        opacity: subOpacity,
      }}>
        <div style={{ color: GRAY, fontSize: 32, fontFamily: "sans-serif", padding: "0 80px" }}>
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
  const localFrame = frame;

  const avatarScale = scaleIn(localFrame, fps, 5);
  const nameOpacity = fadeIn(localFrame, 25);
  const nameY = slideUp(localFrame, 25);
  const tagOpacity = fadeIn(localFrame, 40);

  const initials = data.userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <AbsoluteFill style={{ background: DARK_BG }}>
      {/* Linha dourada superior */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 6,
        background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
      }} />

      <div style={{
        position: "absolute", top: "35%", left: "50%",
        transform: `translate(-50%, -50%)`,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 32,
      }}>
        {/* Avatar */}
        <div style={{
          width: 180, height: 180, borderRadius: "50%",
          background: `linear-gradient(135deg, ${GOLD} 0%, #E8960D 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 80, fontWeight: 900, color: DARK_BG, fontFamily: "sans-serif",
          transform: `scale(${avatarScale})`,
          boxShadow: `0 0 80px ${GOLD}44`,
        }}>
          {initials}
        </div>

        {/* Nome */}
        <div style={{ opacity: nameOpacity, transform: `translateY(${nameY}px)`, textAlign: "center" }}>
          <div style={{ color: GRAY, fontSize: 28, fontFamily: "sans-serif", marginBottom: 8 }}>
            A retrospectiva de
          </div>
          <div style={{ color: WHITE, fontSize: 56, fontWeight: 800, fontFamily: "sans-serif", lineHeight: 1.1 }}>
            {data.userName}
          </div>
        </div>

        {/* Tag do bolão */}
        <div style={{ opacity: tagOpacity }}>
          <div style={{
            background: `${GOLD}22`, border: `2px solid ${GOLD}66`,
            borderRadius: 50, padding: "12px 32px",
            color: GOLD, fontSize: 26, fontFamily: "sans-serif",
          }}>
            {data.tournamentName ?? data.poolName}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── CENA 3: POSIÇÃO FINAL (frames 180–299) ──────────────────────────────────
const ScenePosicao: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame;

  const medalScale = scaleIn(localFrame, fps, 5);
  const posOpacity = fadeIn(localFrame, 20);
  const posY = slideUp(localFrame, 20);
  const subOpacity = fadeIn(localFrame, 45);

  const medalEmoji = data.finalPosition === 1 ? "🥇" : data.finalPosition === 2 ? "🥈" : data.finalPosition === 3 ? "🥉" : "🏅";
  const posLabel = data.finalPosition === 1 ? "Campeão!" : data.finalPosition === 2 ? "Vice-campeão!" : data.finalPosition === 3 ? "3º lugar!" : `${data.finalPosition}º lugar`;

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, #1A1200 0%, ${DARK_BG} 65%)` }}>
      {/* Título da cena */}
      <div style={{
        position: "absolute", top: "12%", width: "100%", textAlign: "center",
        opacity: fadeIn(localFrame, 0),
      }}>
        <div style={{ color: GRAY, fontSize: 32, fontFamily: "sans-serif", letterSpacing: 4, textTransform: "uppercase" }}>
          Posição Final
        </div>
      </div>

      {/* Medalha */}
      <div style={{
        position: "absolute", top: "30%", left: "50%",
        transform: `translate(-50%, -50%) scale(${medalScale})`,
        fontSize: 160, textAlign: "center",
        filter: `drop-shadow(0 0 40px ${GOLD}88)`,
      }}>
        {medalEmoji}
      </div>

      {/* Posição */}
      <div style={{
        position: "absolute", top: "52%", width: "100%", textAlign: "center",
        opacity: posOpacity, transform: `translateY(${posY}px)`,
      }}>
        <div style={{
          color: GOLD, fontSize: 120, fontWeight: 900, fontFamily: "sans-serif",
          lineHeight: 1, textShadow: `0 0 60px ${GOLD}88`,
        }}>
          #{data.finalPosition}
        </div>
        <div style={{ color: WHITE, fontSize: 52, fontWeight: 700, fontFamily: "sans-serif", marginTop: 8 }}>
          {posLabel}
        </div>
      </div>

      {/* Total de participantes */}
      <div style={{
        position: "absolute", bottom: "18%", width: "100%", textAlign: "center",
        opacity: subOpacity,
      }}>
        <div style={{ color: GRAY, fontSize: 32, fontFamily: "sans-serif" }}>
          entre <span style={{ color: WHITE, fontWeight: 700 }}>{data.totalParticipants} participantes</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── CENA 4: SEUS NÚMEROS (frames 300–419) ───────────────────────────────────
const SceneNumeros: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const localFrame = frame;

  const titleOpacity = fadeIn(localFrame, 0);

  const stats = [
    { label: "Palpites enviados", value: data.totalBets, suffix: "", color: WHITE },
    { label: "Placares exatos", value: data.exactScoreCount, suffix: "", color: GOLD },
    { label: "Resultados certos", value: data.correctResultCount, suffix: "", color: GOLD_LIGHT },
    { label: "Taxa de acerto", value: data.accuracyPct, suffix: "%", color: "#4ECDC4" },
    { label: "Zebras acertadas", value: data.zebraCount, suffix: "", color: "#FF6B6B" },
  ];

  return (
    <AbsoluteFill style={{ background: DARK_BG }}>
      {/* Título */}
      <div style={{
        position: "absolute", top: "8%", width: "100%", textAlign: "center",
        opacity: titleOpacity,
      }}>
        <div style={{ color: GOLD, fontSize: 36, fontWeight: 800, fontFamily: "sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>
          Seus Números
        </div>
      </div>

      {/* Stats */}
      <div style={{
        position: "absolute", top: "18%", left: "60px", right: "60px",
        display: "flex", flexDirection: "column", gap: 32,
      }}>
        {stats.map((stat, i) => {
          const barWidth = interpolate(localFrame, [i * 8, i * 8 + 40], [0, (stat.value / Math.max(data.totalBets, 1)) * 100], {
            extrapolateRight: "clamp", extrapolateLeft: "clamp",
          });
          const itemOpacity = fadeIn(localFrame, i * 8);
          const itemY = slideUp(localFrame, i * 8);

          return (
            <div key={i} style={{ opacity: itemOpacity, transform: `translateY(${itemY}px)` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: GRAY, fontSize: 28, fontFamily: "sans-serif" }}>{stat.label}</span>
                <span style={{ color: stat.color, fontSize: 36, fontWeight: 800, fontFamily: "sans-serif" }}>
                  {stat.value}{stat.suffix}
                </span>
              </div>
              <div style={{ height: 8, background: "#2A2A3E", borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${barWidth}%`,
                  background: `linear-gradient(90deg, ${stat.color}88, ${stat.color})`,
                  borderRadius: 4,
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ─── CENA 5: MELHOR MOMENTO (frames 420–509) ─────────────────────────────────
const SceneMelhorMomento: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame;

  const cardScale = scaleIn(localFrame, fps, 10);
  const titleOpacity = fadeIn(localFrame, 0);
  const contentOpacity = fadeIn(localFrame, 20);

  const bd = data.bestMomentData as Record<string, unknown>;
  const homeTeam = (bd.homeTeam as string) ?? "Time A";
  const awayTeam = (bd.awayTeam as string) ?? "Time B";
  const homeScore = (bd.homeScore as number) ?? 0;
  const awayScore = (bd.awayScore as number) ?? 0;
  const points = (bd.points as number) ?? 0;

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 60%, #001A0D 0%, ${DARK_BG} 65%)` }}>
      {/* Título */}
      <div style={{
        position: "absolute", top: "8%", width: "100%", textAlign: "center",
        opacity: titleOpacity,
      }}>
        <div style={{ color: "#4ECDC4", fontSize: 32, fontWeight: 800, fontFamily: "sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>
          ⭐ Melhor Momento
        </div>
      </div>

      {/* Card do placar */}
      <div style={{
        position: "absolute", top: "25%", left: "60px", right: "60px",
        transform: `scale(${cardScale})`,
        background: DARK_CARD,
        borderRadius: 32, padding: "48px 40px",
        border: `2px solid ${GOLD}44`,
        boxShadow: `0 0 60px ${GOLD}22`,
        opacity: contentOpacity,
      }}>
        <div style={{ color: GRAY, fontSize: 26, fontFamily: "sans-serif", textAlign: "center", marginBottom: 32 }}>
          Você acertou o placar exato!
        </div>

        {/* Placar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🇧🇷</div>
            <div style={{ color: WHITE, fontSize: 30, fontWeight: 700, fontFamily: "sans-serif" }}>{homeTeam}</div>
          </div>
          <div style={{ textAlign: "center", padding: "0 20px" }}>
            <div style={{
              color: GOLD, fontSize: 80, fontWeight: 900, fontFamily: "sans-serif",
              textShadow: `0 0 30px ${GOLD}88`,
            }}>
              {homeScore} × {awayScore}
            </div>
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🇦🇷</div>
            <div style={{ color: WHITE, fontSize: 30, fontWeight: 700, fontFamily: "sans-serif" }}>{awayTeam}</div>
          </div>
        </div>

        {/* Pontos ganhos */}
        <div style={{
          marginTop: 40, textAlign: "center",
          background: `${GOLD}22`, borderRadius: 16, padding: "16px 24px",
        }}>
          <div style={{ color: GOLD, fontSize: 40, fontWeight: 800, fontFamily: "sans-serif" }}>
            +{points} pontos
          </div>
        </div>
      </div>

      {/* Badge conquistado */}
      {data.badgeEarnedName && (
        <div style={{
          position: "absolute", bottom: "15%", width: "100%", textAlign: "center",
          opacity: fadeIn(localFrame, 50),
        }}>
          <div style={{ color: GRAY, fontSize: 26, fontFamily: "sans-serif", marginBottom: 8 }}>
            Badge conquistado
          </div>
          <div style={{ color: WHITE, fontSize: 36, fontWeight: 700, fontFamily: "sans-serif" }}>
            {data.badgeEarnedEmoji} {data.badgeEarnedName}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── CENA 6: PONTUAÇÃO FINAL (frames 510–599) ────────────────────────────────
const ScenePontuacao: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const localFrame = frame;

  const titleOpacity = fadeIn(localFrame, 0);
  const countProgress = interpolate(localFrame, [10, 60], [0, data.totalPoints], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, #1A0A00 0%, ${DARK_BG} 70%)` }}>
      <div style={{
        position: "absolute", top: "10%", width: "100%", textAlign: "center",
        opacity: titleOpacity,
      }}>
        <div style={{ color: GRAY, fontSize: 32, fontFamily: "sans-serif", letterSpacing: 4, textTransform: "uppercase" }}>
          Pontuação Final
        </div>
      </div>

      {/* Contador de pontos */}
      <div style={{
        position: "absolute", top: "40%", left: "50%",
        transform: "translate(-50%, -50%)",
        textAlign: "center",
      }}>
        <div style={{
          color: GOLD, fontSize: 160, fontWeight: 900, fontFamily: "sans-serif",
          textShadow: `0 0 80px ${GOLD}88`, lineHeight: 1,
        }}>
          {Math.round(countProgress)}
        </div>
        <div style={{ color: WHITE, fontSize: 48, fontWeight: 600, fontFamily: "sans-serif", marginTop: 8 }}>
          pontos
        </div>
      </div>

      {/* Mini stats */}
      <div style={{
        position: "absolute", bottom: "15%", left: "60px", right: "60px",
        display: "flex", justifyContent: "space-around",
        opacity: fadeIn(localFrame, 50),
      }}>
        {[
          { label: "Exatos", value: data.exactScoreCount },
          { label: "Certos", value: data.correctResultCount },
          { label: "Zebras", value: data.zebraCount },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ color: GOLD, fontSize: 52, fontWeight: 800, fontFamily: "sans-serif" }}>{s.value}</div>
            <div style={{ color: GRAY, fontSize: 24, fontFamily: "sans-serif" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ─── CENA 7: ENCERRAMENTO (frames 600–659) ───────────────────────────────────
const SceneEncerramento: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame;

  const logoScale = scaleIn(localFrame, fps, 5);
  const phraseOpacity = fadeIn(localFrame, 20);
  const ctaOpacity = fadeIn(localFrame, 40);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, #2A1A00 0%, ${DARK_BG} 70%)` }}>
      {/* Logo */}
      <div style={{
        position: "absolute", top: "25%", left: "50%",
        transform: `translate(-50%, -50%) scale(${logoScale})`,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>🏆</div>
        <div style={{ color: GOLD, fontSize: 80, fontWeight: 900, fontFamily: "sans-serif", letterSpacing: -2 }}>
          Plakr!
        </div>
      </div>

      {/* Frase de encerramento */}
      <div style={{
        position: "absolute", top: "50%", left: "60px", right: "60px",
        transform: "translateY(-50%)",
        opacity: phraseOpacity, textAlign: "center",
      }}>
        <div style={{
          color: WHITE, fontSize: 34, fontFamily: "sans-serif",
          lineHeight: 1.5, fontStyle: "italic",
        }}>
          "{data.closingPhrase}"
        </div>
      </div>

      {/* CTA */}
      <div style={{
        position: "absolute", bottom: "15%", width: "100%", textAlign: "center",
        opacity: ctaOpacity,
      }}>
        <div style={{
          display: "inline-block",
          background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 100%)`,
          borderRadius: 50, padding: "20px 60px",
          color: DARK_BG, fontSize: 32, fontWeight: 800, fontFamily: "sans-serif",
        }}>
          plakr.io
        </div>
        <div style={{ color: GRAY, fontSize: 24, fontFamily: "sans-serif", marginTop: 16 }}>
          Crie seu bolão agora
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── COMPOSIÇÃO PRINCIPAL ─────────────────────────────────────────────────────
export const PlakrRetrospectiva: React.FC<{ data: RetrospectiveData }> = ({ data }) => {
  return (
    <AbsoluteFill style={{ background: DARK_BG, fontFamily: "sans-serif" }}>
      <Sequence from={0} durationInFrames={90}>
        <SceneAbertura data={data} />
      </Sequence>
      <Sequence from={90} durationInFrames={90}>
        <SceneUsuario data={data} />
      </Sequence>
      <Sequence from={180} durationInFrames={120}>
        <ScenePosicao data={data} />
      </Sequence>
      <Sequence from={300} durationInFrames={120}>
        <SceneNumeros data={data} />
      </Sequence>
      <Sequence from={420} durationInFrames={90}>
        <SceneMelhorMomento data={data} />
      </Sequence>
      <Sequence from={510} durationInFrames={90}>
        <ScenePontuacao data={data} />
      </Sequence>
      <Sequence from={600} durationInFrames={60}>
        <SceneEncerramento data={data} />
      </Sequence>
    </AbsoluteFill>
  );
};
