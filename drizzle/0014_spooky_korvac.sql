CREATE TABLE `pool_final_positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`poolId` int,
	`poolName` varchar(255) NOT NULL,
	`tournamentName` varchar(255),
	`position` int NOT NULL,
	`totalPoints` int NOT NULL DEFAULT 0,
	`totalParticipants` int NOT NULL DEFAULT 1,
	`finishedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pool_final_positions_id` PRIMARY KEY(`id`),
	CONSTRAINT `pool_final_positions_unique` UNIQUE(`poolId`,`userId`)
);
--> statement-breakpoint
ALTER TABLE `pool_final_positions` ADD CONSTRAINT `pool_final_positions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pool_final_positions` ADD CONSTRAINT `pool_final_positions_poolId_pools_id_fk` FOREIGN KEY (`poolId`) REFERENCES `pools`(`id`) ON DELETE set null ON UPDATE no action;