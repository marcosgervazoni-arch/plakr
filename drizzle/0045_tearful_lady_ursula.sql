CREATE TABLE `game_bet_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gameId` int NOT NULL,
	`userId` int NOT NULL,
	`poolId` int NOT NULL,
	`analysisText` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_bet_analyses_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_user_game_pool` UNIQUE(`gameId`,`userId`,`poolId`)
);
--> statement-breakpoint
ALTER TABLE `game_bet_analyses` ADD CONSTRAINT `game_bet_analyses_gameId_games_id_fk` FOREIGN KEY (`gameId`) REFERENCES `games`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `game_bet_analyses` ADD CONSTRAINT `game_bet_analyses_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `game_bet_analyses` ADD CONSTRAINT `game_bet_analyses_poolId_pools_id_fk` FOREIGN KEY (`poolId`) REFERENCES `pools`(`id`) ON DELETE no action ON UPDATE no action;