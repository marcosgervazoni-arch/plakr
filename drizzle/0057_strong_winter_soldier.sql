CREATE TABLE `mural_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`authorId` int,
	`content` text NOT NULL,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mural_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mural_mentions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int,
	`commentId` int,
	`mentionedUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mural_mentions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mural_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poolId` int NOT NULL,
	`authorId` int,
	`type` enum('manual','rank_change_first','rank_change_top3','rank_change_up','x1_result_win','x1_result_draw','exact_score_single','exact_score_multi','match_result','new_member','pool_ended','badge_unlocked','zebra_result','thrashing_result') NOT NULL DEFAULT 'manual',
	`content` text NOT NULL,
	`eventMeta` json,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mural_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `mural_comments` ADD CONSTRAINT `mural_comments_postId_mural_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `mural_posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mural_comments` ADD CONSTRAINT `mural_comments_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mural_mentions` ADD CONSTRAINT `mural_mentions_postId_mural_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `mural_posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mural_mentions` ADD CONSTRAINT `mural_mentions_commentId_mural_comments_id_fk` FOREIGN KEY (`commentId`) REFERENCES `mural_comments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mural_mentions` ADD CONSTRAINT `mural_mentions_mentionedUserId_users_id_fk` FOREIGN KEY (`mentionedUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mural_posts` ADD CONSTRAINT `mural_posts_poolId_pools_id_fk` FOREIGN KEY (`poolId`) REFERENCES `pools`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mural_posts` ADD CONSTRAINT `mural_posts_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_mural_comments_post` ON `mural_comments` (`postId`);--> statement-breakpoint
CREATE INDEX `idx_mural_comments_author` ON `mural_comments` (`authorId`);--> statement-breakpoint
CREATE INDEX `idx_mural_mentions_user` ON `mural_mentions` (`mentionedUserId`);--> statement-breakpoint
CREATE INDEX `idx_mural_posts_pool_created` ON `mural_posts` (`poolId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_mural_posts_author` ON `mural_posts` (`authorId`);