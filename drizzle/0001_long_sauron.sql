CREATE TABLE `ad_clicks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adId` int NOT NULL,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ad_clicks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`poolId` int,
	`action` varchar(128) NOT NULL,
	`entityType` varchar(64),
	`entityId` int,
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`type` enum('banner','video','script') NOT NULL,
	`assetUrl` text,
	`scriptCode` text,
	`linkUrl` text,
	`position` enum('sidebar','top','between_sections','bottom','popup') NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`startAt` timestamp,
	`endAt` timestamp,
	`popupFrequency` enum('session','daily','always') DEFAULT 'session',
	`device` enum('all','desktop','mobile') NOT NULL DEFAULT 'all',
	`carouselInterval` int NOT NULL DEFAULT 5000,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poolId` int NOT NULL,
	`userId` int NOT NULL,
	`gameId` int NOT NULL,
	`predictedScoreA` int NOT NULL,
	`predictedScoreB` int NOT NULL,
	`pointsEarned` int NOT NULL DEFAULT 0,
	`pointsExactScore` int NOT NULL DEFAULT 0,
	`pointsCorrectResult` int NOT NULL DEFAULT 0,
	`pointsTotalGoals` int NOT NULL DEFAULT 0,
	`pointsGoalDiff` int NOT NULL DEFAULT 0,
	`pointsOneTeamGoals` int NOT NULL DEFAULT 0,
	`pointsLandslide` int NOT NULL DEFAULT 0,
	`pointsZebra` int NOT NULL DEFAULT 0,
	`isZebra` boolean NOT NULL DEFAULT false,
	`resultType` enum('exact','correct_result','wrong','pending') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bets_id` PRIMARY KEY(`id`),
	CONSTRAINT `bet_unique` UNIQUE(`poolId`,`userId`,`gameId`)
);
--> statement-breakpoint
CREATE TABLE `email_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`toEmail` varchar(320) NOT NULL,
	`toName` varchar(255),
	`subject` varchar(255) NOT NULL,
	`htmlBody` text NOT NULL,
	`status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tournamentId` int NOT NULL,
	`externalId` varchar(64),
	`teamAId` int,
	`teamBId` int,
	`teamAName` varchar(128),
	`teamBName` varchar(128),
	`teamAFlag` text,
	`teamBFlag` text,
	`groupName` varchar(10),
	`phase` varchar(64) NOT NULL DEFAULT 'group_stage',
	`matchDate` timestamp NOT NULL,
	`venue` varchar(255),
	`status` enum('scheduled','live','finished','cancelled') NOT NULL DEFAULT 'scheduled',
	`scoreA` int,
	`scoreB` int,
	`matchNumber` int,
	`sourceMatchAId` int,
	`sourceMatchBId` int,
	`sourceMatchARole` enum('winner','runner_up'),
	`sourceMatchBRole` enum('winner','runner_up'),
	`isZebraResult` boolean NOT NULL DEFAULT false,
	`manuallyEdited` boolean NOT NULL DEFAULT false,
	`importedFromSheets` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `games_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`inAppGameReminder` boolean NOT NULL DEFAULT true,
	`inAppRankingUpdate` boolean NOT NULL DEFAULT true,
	`inAppResultAvailable` boolean NOT NULL DEFAULT true,
	`inAppSystem` boolean NOT NULL DEFAULT true,
	`emailGameReminder` boolean NOT NULL DEFAULT true,
	`emailRankingUpdate` boolean NOT NULL DEFAULT false,
	`emailResultAvailable` boolean NOT NULL DEFAULT true,
	`emailSystem` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_preferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`poolId` int,
	`type` enum('game_reminder','ranking_update','result_available','system','ad','pool_closing','pool_invite','plan_expired','plan_expiring') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`relatedGameId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_settings` (
	`id` int NOT NULL DEFAULT 1,
	`freeMaxParticipants` int NOT NULL DEFAULT 50,
	`freeMaxPools` int NOT NULL DEFAULT 2,
	`poolArchiveDays` int NOT NULL DEFAULT 10,
	`defaultScoringExact` int NOT NULL DEFAULT 10,
	`defaultScoringCorrect` int NOT NULL DEFAULT 5,
	`defaultScoringBonusGoals` int NOT NULL DEFAULT 2,
	`defaultScoringBonusDiff` int NOT NULL DEFAULT 2,
	`defaultScoringBonusUpset` int NOT NULL DEFAULT 3,
	`defaultTiebreakOrder` json DEFAULT ('["points","exact","correct","wrong","registration_date"]'),
	`gaMeasurementId` varchar(64),
	`fbPixelId` varchar(64),
	`adNetworkScripts` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `platform_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pool_member_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poolId` int NOT NULL,
	`userId` int NOT NULL,
	`totalPoints` int NOT NULL DEFAULT 0,
	`exactScoreCount` int NOT NULL DEFAULT 0,
	`correctResultCount` int NOT NULL DEFAULT 0,
	`goalDiffCount` int NOT NULL DEFAULT 0,
	`oneTeamGoalsCount` int NOT NULL DEFAULT 0,
	`totalGoalsCount` int NOT NULL DEFAULT 0,
	`landslideCount` int NOT NULL DEFAULT 0,
	`zebraCount` int NOT NULL DEFAULT 0,
	`totalBets` int NOT NULL DEFAULT 0,
	`rankPosition` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pool_member_stats_id` PRIMARY KEY(`id`),
	CONSTRAINT `pool_member_stats_unique` UNIQUE(`poolId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `pool_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poolId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('organizer','participant') NOT NULL DEFAULT 'participant',
	`isBlocked` boolean NOT NULL DEFAULT false,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pool_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `pool_member_unique` UNIQUE(`poolId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `pool_scoring_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poolId` int NOT NULL,
	`exactScorePoints` int NOT NULL DEFAULT 10,
	`correctResultPoints` int NOT NULL DEFAULT 5,
	`totalGoalsPoints` int NOT NULL DEFAULT 2,
	`goalDiffPoints` int NOT NULL DEFAULT 2,
	`oneTeamGoalsPoints` int NOT NULL DEFAULT 0,
	`landslidePoints` int NOT NULL DEFAULT 0,
	`zebraPoints` int NOT NULL DEFAULT 3,
	`zebraThreshold` int NOT NULL DEFAULT 70,
	`zebraCountDraw` boolean NOT NULL DEFAULT false,
	`zebraEnabled` boolean NOT NULL DEFAULT true,
	`bettingDeadlineMinutes` int NOT NULL DEFAULT 60,
	`tiebreakOrder` json DEFAULT ('["points","exact","correct","wrong","registration_date"]'),
	`publicProfilesEnabled` boolean NOT NULL DEFAULT true,
	`groupLinksEnabled` boolean NOT NULL DEFAULT false,
	`whatsappGroupLink` varchar(255),
	`telegramGroupLink` varchar(255),
	`groupLinksText` varchar(255),
	`poolSubtitle` varchar(255),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `pool_scoring_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `pool_scoring_rules_poolId_unique` UNIQUE(`poolId`)
);
--> statement-breakpoint
CREATE TABLE `pools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`logoUrl` text,
	`description` text,
	`accessType` enum('public','private_code','private_link') NOT NULL DEFAULT 'private_link',
	`inviteCode` varchar(16),
	`inviteToken` varchar(64),
	`status` enum('active','finished','archived','deleted') NOT NULL DEFAULT 'active',
	`finishedAt` timestamp,
	`scheduledDeleteAt` timestamp,
	`ownerId` int NOT NULL,
	`tournamentId` int NOT NULL,
	`plan` enum('free','pro') NOT NULL DEFAULT 'free',
	`stripeSubscriptionId` varchar(128),
	`planExpiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pools_id` PRIMARY KEY(`id`),
	CONSTRAINT `pools_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `sheets_sync_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tournamentId` int NOT NULL,
	`sheetUrl` text,
	`status` enum('success','error','partial') NOT NULL,
	`gamesImported` int NOT NULL DEFAULT 0,
	`gamesUpdated` int NOT NULL DEFAULT 0,
	`errors` json,
	`triggeredBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sheets_sync_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tournamentId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`code` varchar(10),
	`flagUrl` text,
	`groupName` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournament_phases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tournamentId` int NOT NULL,
	`key` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`order` int NOT NULL,
	`slots` int,
	`isKnockout` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tournament_phases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(128) NOT NULL,
	`logoUrl` text,
	`isGlobal` boolean NOT NULL DEFAULT false,
	`poolId` int,
	`createdBy` int,
	`status` enum('active','finished','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tournaments_id` PRIMARY KEY(`id`),
	CONSTRAINT `tournaments_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `user_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`plan` enum('free','pro','unlimited') NOT NULL DEFAULT 'free',
	`stripeCustomerId` varchar(128),
	`stripeSubscriptionId` varchar(128),
	`planStartAt` timestamp,
	`planExpiresAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `whatsappLink` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `telegramLink` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `isBlocked` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `ad_clicks` ADD CONSTRAINT `ad_clicks_adId_ads_id_fk` FOREIGN KEY (`adId`) REFERENCES `ads`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ad_clicks` ADD CONSTRAINT `ad_clicks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_logs` ADD CONSTRAINT `admin_logs_adminId_users_id_fk` FOREIGN KEY (`adminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_logs` ADD CONSTRAINT `admin_logs_poolId_pools_id_fk` FOREIGN KEY (`poolId`) REFERENCES `pools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ads` ADD CONSTRAINT `ads_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bets` ADD CONSTRAINT `bets_poolId_pools_id_fk` FOREIGN KEY (`poolId`) REFERENCES `pools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bets` ADD CONSTRAINT `bets_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bets` ADD CONSTRAINT `bets_gameId_games_id_fk` FOREIGN KEY (`gameId`) REFERENCES `games`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_queue` ADD CONSTRAINT `email_queue_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `games` ADD CONSTRAINT `games_tournamentId_tournaments_id_fk` FOREIGN KEY (`tournamentId`) REFERENCES `tournaments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `games` ADD CONSTRAINT `games_teamAId_teams_id_fk` FOREIGN KEY (`teamAId`) REFERENCES `teams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `games` ADD CONSTRAINT `games_teamBId_teams_id_fk` FOREIGN KEY (`teamBId`) REFERENCES `teams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD CONSTRAINT `notification_preferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_poolId_pools_id_fk` FOREIGN KEY (`poolId`) REFERENCES `pools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_relatedGameId_games_id_fk` FOREIGN KEY (`relatedGameId`) REFERENCES `games`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD CONSTRAINT `platform_settings_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pool_member_stats` ADD CONSTRAINT `pool_member_stats_poolId_pools_id_fk` FOREIGN KEY (`poolId`) REFERENCES `pools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pool_member_stats` ADD CONSTRAINT `pool_member_stats_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pool_members` ADD CONSTRAINT `pool_members_poolId_pools_id_fk` FOREIGN KEY (`poolId`) REFERENCES `pools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pool_members` ADD CONSTRAINT `pool_members_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pool_scoring_rules` ADD CONSTRAINT `pool_scoring_rules_poolId_pools_id_fk` FOREIGN KEY (`poolId`) REFERENCES `pools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pool_scoring_rules` ADD CONSTRAINT `pool_scoring_rules_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pools` ADD CONSTRAINT `pools_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pools` ADD CONSTRAINT `pools_tournamentId_tournaments_id_fk` FOREIGN KEY (`tournamentId`) REFERENCES `tournaments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sheets_sync_log` ADD CONSTRAINT `sheets_sync_log_tournamentId_tournaments_id_fk` FOREIGN KEY (`tournamentId`) REFERENCES `tournaments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sheets_sync_log` ADD CONSTRAINT `sheets_sync_log_triggeredBy_users_id_fk` FOREIGN KEY (`triggeredBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teams` ADD CONSTRAINT `teams_tournamentId_tournaments_id_fk` FOREIGN KEY (`tournamentId`) REFERENCES `tournaments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tournament_phases` ADD CONSTRAINT `tournament_phases_tournamentId_tournaments_id_fk` FOREIGN KEY (`tournamentId`) REFERENCES `tournaments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tournaments` ADD CONSTRAINT `tournaments_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_plans` ADD CONSTRAINT `user_plans_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;