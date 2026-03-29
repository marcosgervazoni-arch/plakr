/**
 * Plakr! — Root da Composição Remotion
 */
import { Composition } from "remotion";
import { PlakrRetrospectiva } from "./PlakrRetrospectiva";
import type { RetrospectiveData } from "../retrospective";

export const Root: React.FC = () => (
  <Composition
    id="PlakrRetrospectiva"
    component={PlakrRetrospectiva}
    durationInFrames={900}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      data: {
        userId: 0,
        userName: "Usuário Exemplo",
        userAvatar: null,
        poolName: "Bolão Copa do Mundo 2026",
        tournamentName: "Copa do Mundo FIFA 2026",
        poolStartDate: new Date("2026-06-01"),
        poolEndDate: new Date("2026-07-15"),
        totalParticipants: 24,
        totalBets: 48,
        exactScoreCount: 12,
        correctResultCount: 31,
        zebraCount: 3,
        totalPoints: 187,
        finalPosition: 3,
        accuracyPct: 65,
        bestMomentType: "exact_score" as const,
        bestMomentData: { homeTeam: "Brasil", awayTeam: "Argentina", homeScore: 2, awayScore: 1, points: 10 },
        badgeEarnedName: "Vidente",
        badgeEarnedEmoji: "🔮",
        closingPhrase: "Que jornada incrível! Até a próxima Copa!",
      } satisfies RetrospectiveData,
    }}
  />
);
