CREATE TABLE `round_reminder_sent` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tournamentId` int NOT NULL,
	`roundNumber` int NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `round_reminder_sent_id` PRIMARY KEY(`id`),
	CONSTRAINT `round_reminder_unique` UNIQUE(`userId`,`tournamentId`,`roundNumber`)
);
--> statement-breakpoint
ALTER TABLE `round_reminder_sent` ADD CONSTRAINT `round_reminder_sent_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `round_reminder_sent` ADD CONSTRAINT `round_reminder_sent_tournamentId_tournaments_id_fk` FOREIGN KEY (`tournamentId`) REFERENCES `tournaments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_round_reminder_user` ON `round_reminder_sent` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_round_reminder_tournament` ON `round_reminder_sent` (`tournamentId`);