CREATE TABLE `pool_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(128) NOT NULL,
	`poolId` int NOT NULL,
	`invitedEmail` varchar(255) NOT NULL,
	`invitedBy` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`acceptedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pool_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `pool_invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `pool_invites` ADD CONSTRAINT `pool_invites_poolId_pools_id_fk` FOREIGN KEY (`poolId`) REFERENCES `pools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pool_invites` ADD CONSTRAINT `pool_invites_invitedBy_users_id_fk` FOREIGN KEY (`invitedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pool_invites` ADD CONSTRAINT `pool_invites_acceptedByUserId_users_id_fk` FOREIGN KEY (`acceptedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_pool_invites_token` ON `pool_invites` (`token`);--> statement-breakpoint
CREATE INDEX `idx_pool_invites_email` ON `pool_invites` (`invitedEmail`);--> statement-breakpoint
CREATE INDEX `idx_pool_invites_pool` ON `pool_invites` (`poolId`);