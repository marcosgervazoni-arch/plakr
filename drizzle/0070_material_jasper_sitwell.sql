CREATE TABLE `bet_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`poolId` int NOT NULL,
	`gameId` int NOT NULL,
	`action` enum('create','update','error') NOT NULL,
	`predictedScoreA` int,
	`predictedScoreB` int,
	`errorCode` varchar(64),
	`errorMessage` text,
	`ipAddress` varchar(64),
	`userAgent` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bet_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bet_audit_log` ADD CONSTRAINT `bet_audit_log_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bet_audit_log` ADD CONSTRAINT `bet_audit_log_poolId_pools_id_fk` FOREIGN KEY (`poolId`) REFERENCES `pools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bet_audit_log` ADD CONSTRAINT `bet_audit_log_gameId_games_id_fk` FOREIGN KEY (`gameId`) REFERENCES `games`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bet_audit_userId_idx` ON `bet_audit_log` (`userId`);--> statement-breakpoint
CREATE INDEX `bet_audit_poolId_idx` ON `bet_audit_log` (`poolId`);--> statement-breakpoint
CREATE INDEX `bet_audit_gameId_idx` ON `bet_audit_log` (`gameId`);--> statement-breakpoint
CREATE INDEX `bet_audit_createdAt_idx` ON `bet_audit_log` (`createdAt`);