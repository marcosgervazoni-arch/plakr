CREATE TABLE `ai_daily_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_daily_usage_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_ai_daily_usage` UNIQUE(`userId`,`date`)
);
--> statement-breakpoint
ALTER TABLE `ai_daily_usage` ADD CONSTRAINT `ai_daily_usage_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_ai_daily_usage_user` ON `ai_daily_usage` (`userId`);