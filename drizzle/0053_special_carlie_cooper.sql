CREATE TABLE `pool_sponsor_badges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poolId` int NOT NULL,
	`sponsorId` int NOT NULL,
	`dynamic` enum('participation','faithful_bettor','podium','exact_score','zebra_detector','champion','perfect_round','veteran','manual') NOT NULL,
	`badgeName` varchar(255) NOT NULL,
	`svgUrl` text,
	`availableFrom` timestamp,
	`availableUntil` timestamp,
	`isActive` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pool_sponsor_badges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_sponsor_badges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sponsorBadgeId` int NOT NULL,
	`poolId` int NOT NULL,
	`awardedAt` timestamp NOT NULL DEFAULT (now()),
	`awardedByAdminId` int,
	CONSTRAINT `user_sponsor_badges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pool_sponsor_badges` ADD CONSTRAINT `pool_sponsor_badges_poolId_pools_id_fk` FOREIGN KEY (`poolId`) REFERENCES `pools`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pool_sponsor_badges` ADD CONSTRAINT `pool_sponsor_badges_sponsorId_pool_sponsors_id_fk` FOREIGN KEY (`sponsorId`) REFERENCES `pool_sponsors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_sponsor_badges` ADD CONSTRAINT `user_sponsor_badges_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_sponsor_badges` ADD CONSTRAINT `user_sponsor_badges_sponsorBadgeId_pool_sponsor_badges_id_fk` FOREIGN KEY (`sponsorBadgeId`) REFERENCES `pool_sponsor_badges`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_sponsor_badges` ADD CONSTRAINT `user_sponsor_badges_poolId_pools_id_fk` FOREIGN KEY (`poolId`) REFERENCES `pools`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_sponsor_badges` ADD CONSTRAINT `user_sponsor_badges_awardedByAdminId_users_id_fk` FOREIGN KEY (`awardedByAdminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;