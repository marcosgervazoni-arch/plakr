CREATE TABLE `mural_reactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`userId` int NOT NULL,
	`emoji` varchar(10) NOT NULL DEFAULT '👑',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mural_reactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_mural_reaction` UNIQUE(`postId`,`userId`,`emoji`)
);
--> statement-breakpoint
ALTER TABLE `mural_reactions` ADD CONSTRAINT `mural_reactions_postId_mural_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `mural_posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mural_reactions` ADD CONSTRAINT `mural_reactions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_mural_reactions_post` ON `mural_reactions` (`postId`);--> statement-breakpoint
CREATE INDEX `idx_mural_reactions_user` ON `mural_reactions` (`userId`);