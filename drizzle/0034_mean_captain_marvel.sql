CREATE TABLE `x1_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poolId` int NOT NULL,
	`challengerId` int NOT NULL,
	`challengedId` int NOT NULL,
	`status` enum('pending','active','concluded','expired','cancelled') NOT NULL DEFAULT 'pending',
	`challengeType` enum('score_duel','prediction') NOT NULL,
	`predictionType` enum('champion','runner_up','group_qualified','phase_qualified','eliminated_in_phase','next_game_winner'),
	`challengerAnswer` json,
	`challengedAnswer` json,
	`predictionContext` json,
	`scopeType` enum('next_round','next_phase','next_n_games'),
	`scopeValue` int,
	`gameIds` json,
	`challengerPoints` int NOT NULL DEFAULT 0,
	`challengedPoints` int NOT NULL DEFAULT 0,
	`winnerId` int,
	`expiresAt` timestamp,
	`concludedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `x1_challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `x1_game_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challengeId` int NOT NULL,
	`gameId` int NOT NULL,
	`challengerPoints` int NOT NULL DEFAULT 0,
	`challengedPoints` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `x1_game_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `x1_challenges` ADD CONSTRAINT `x1_challenges_poolId_pools_id_fk` FOREIGN KEY (`poolId`) REFERENCES `pools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `x1_challenges` ADD CONSTRAINT `x1_challenges_challengerId_users_id_fk` FOREIGN KEY (`challengerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `x1_challenges` ADD CONSTRAINT `x1_challenges_challengedId_users_id_fk` FOREIGN KEY (`challengedId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `x1_challenges` ADD CONSTRAINT `x1_challenges_winnerId_users_id_fk` FOREIGN KEY (`winnerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `x1_game_scores` ADD CONSTRAINT `x1_game_scores_challengeId_x1_challenges_id_fk` FOREIGN KEY (`challengeId`) REFERENCES `x1_challenges`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `x1_game_scores` ADD CONSTRAINT `x1_game_scores_gameId_games_id_fk` FOREIGN KEY (`gameId`) REFERENCES `games`(`id`) ON DELETE no action ON UPDATE no action;