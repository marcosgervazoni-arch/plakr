/**
 * [O1] Logger estruturado com Pino
 * - Em desenvolvimento: saída pretty com cores
 * - Em produção: JSON estruturado para ingestão por serviços de log
 */
import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
    base: { service: "apostai" },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  isDev
    ? pino.transport({
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname,service" },
      })
    : undefined
);

export default logger;
