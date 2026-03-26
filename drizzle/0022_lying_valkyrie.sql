CREATE TABLE `pool_retrospectives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poolId` int NOT NULL,
	`userId` int NOT NULL,
	`poolName` varchar(255) NOT NULL,
	`tournamentName` varchar(255),
	`poolStartDate` timestamp,
	`poolEndDate` timestamp,
	`totalParticipants` int NOT NULL DEFAULT 0,
	`totalBets` int NOT NULL DEFAULT 0,
	`exactScoreCount` int NOT NULL DEFAULT 0,
	`correctResultCount` int NOT NULL DEFAULT 0,
	`zebraCount` int NOT NULL DEFAULT 0,
	`totalPoints` int NOT NULL DEFAULT 0,
	`finalPosition` int NOT NULL,
	`accuracyPct` int NOT NULL DEFAULT 0,
	`bestMomentType` enum('exact_score','rank_jump','badge','zebra') DEFAULT 'exact_score',
	`bestMomentData` json,
	`badgeEarnedId` int,
	`closingPhrase` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pool_retrospectives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_share_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poolId` int NOT NULL,
	`userId` int NOT NULL,
	`cardType` enum('podium','participant') NOT NULL,
	`position` int NOT NULL,
	`imageUrl` text NOT NULL,
	`imageKey` varchar(255) NOT NULL,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_share_cards_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_share_card_unique` UNIQUE(`poolId`,`userId`)
);
--> statement-breakpoint
ALTER TABLE `pools` MODIFY COLUMN `status` enum('active','finished','awaiting_conclusion','concluded','archived','deleted') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `pools` ADD `awaitingConclusionSince` timestamp;--> statement-breakpoint
ALTER TABLE `pools` ADD `concludedAt` timestamp;--> statement-breakpoint
ALTER TABLE `pools` ADD `concludedBy` int;--> statement-breakpoint
ALTER TABLE `pool_retrospectives` ADD CONSTRAINT `pool_retrospectives_poolId_pools_id_fk` FOREIGN KEY (`poolId`) REFERENCES `pools`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pool_retrospectives` ADD CONSTRAINT `pool_retrospectives_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pool_retrospectives` ADD CONSTRAINT `pool_retrospectives_badgeEarnedId_badges_id_fk` FOREIGN KEY (`badgeEarnedId`) REFERENCES `badges`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_share_cards` ADD CONSTRAINT `user_share_cards_poolId_pools_id_fk` FOREIGN KEY (`poolId`) REFERENCES `pools`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_share_cards` ADD CONSTRAINT `user_share_cards_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pools` ADD CONSTRAINT `pools_concludedBy_users_id_fk` FOREIGN KEY (`concludedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;