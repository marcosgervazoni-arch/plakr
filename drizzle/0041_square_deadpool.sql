CREATE TABLE `api_quota_tracker` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`requestsUsed` int NOT NULL DEFAULT 0,
	`quotaLimit` int NOT NULL DEFAULT 100,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_quota_tracker_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_quota_tracker_date_unique` UNIQUE(`date`)
);
--> statement-breakpoint
CREATE TABLE `api_sync_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`syncType` enum('fixtures','results','manual') NOT NULL,
	`status` enum('success','error','partial','skipped') NOT NULL,
	`leagueId` int NOT NULL,
	`season` int NOT NULL,
	`requestsUsed` int NOT NULL DEFAULT 0,
	`gamesCreated` int NOT NULL DEFAULT 0,
	`gamesUpdated` int NOT NULL DEFAULT 0,
	`resultsApplied` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`circuitBreakerTripped` boolean NOT NULL DEFAULT false,
	`triggeredBy` enum('cron','manual') NOT NULL DEFAULT 'cron',
	`triggeredByUserId` int,
	`durationMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_sync_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `apiFootballKey` varchar(64);--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `apiFootballEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `apiFootballQuotaLimit` int DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `apiFootballSyncFixtures` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `apiFootballSyncResults` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `apiFootballLeagueId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `apiFootballSeason` int DEFAULT 2026 NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `apiFootballLastSync` timestamp;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `apiFootballCircuitOpen` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `apiFootballCircuitOpenAt` timestamp;--> statement-breakpoint
ALTER TABLE `api_sync_log` ADD CONSTRAINT `api_sync_log_triggeredByUserId_users_id_fk` FOREIGN KEY (`triggeredByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;