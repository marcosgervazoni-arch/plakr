CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inviteCode` varchar(16) NOT NULL,
	`inviterId` int NOT NULL,
	`inviteeId` int,
	`registeredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`),
	CONSTRAINT `referrals_inviteCode_unique` UNIQUE(`inviteCode`)
);
--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_inviterId_users_id_fk` FOREIGN KEY (`inviterId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_inviteeId_users_id_fk` FOREIGN KEY (`inviteeId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;