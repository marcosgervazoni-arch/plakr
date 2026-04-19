CREATE TABLE `feedback_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(10) NOT NULL,
	`context` varchar(64) NOT NULL,
	`score` int NOT NULL,
	`comment` text,
	`poolId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedback_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `feedback_responses` ADD CONSTRAINT `feedback_responses_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feedback_responses` ADD CONSTRAINT `feedback_responses_poolId_pools_id_fk` FOREIGN KEY (`poolId`) REFERENCES `pools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_feedback_user` ON `feedback_responses` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_feedback_type` ON `feedback_responses` (`type`);--> statement-breakpoint
CREATE INDEX `idx_feedback_context` ON `feedback_responses` (`context`);--> statement-breakpoint
CREATE INDEX `idx_feedback_created_at` ON `feedback_responses` (`createdAt`);