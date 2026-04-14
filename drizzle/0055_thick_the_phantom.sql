CREATE INDEX `admin_logs_adminId_idx` ON `admin_logs` (`adminId`);--> statement-breakpoint
CREATE INDEX `admin_logs_createdAt_idx` ON `admin_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `bets_poolId_idx` ON `bets` (`poolId`);--> statement-breakpoint
CREATE INDEX `bets_userId_idx` ON `bets` (`userId`);--> statement-breakpoint
CREATE INDEX `bets_gameId_idx` ON `bets` (`gameId`);--> statement-breakpoint
CREATE INDEX `email_queue_status_idx` ON `email_queue` (`status`);--> statement-breakpoint
CREATE INDEX `games_tournamentId_idx` ON `games` (`tournamentId`);--> statement-breakpoint
CREATE INDEX `games_status_idx` ON `games` (`status`);--> statement-breakpoint
CREATE INDEX `games_matchDate_idx` ON `games` (`matchDate`);--> statement-breakpoint
CREATE INDEX `notifications_userId_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `notifications_isRead_idx` ON `notifications` (`isRead`);--> statement-breakpoint
CREATE INDEX `pool_member_stats_poolId_idx` ON `pool_member_stats` (`poolId`);--> statement-breakpoint
CREATE INDEX `pool_member_stats_userId_idx` ON `pool_member_stats` (`userId`);--> statement-breakpoint
CREATE INDEX `pool_members_userId_idx` ON `pool_members` (`userId`);