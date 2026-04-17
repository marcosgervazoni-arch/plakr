CREATE TABLE `pool_slug_redirects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poolId` int NOT NULL,
	`oldSlug` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pool_slug_redirects_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_pool_slug_redirects_oldSlug` UNIQUE(`oldSlug`)
);
--> statement-breakpoint
ALTER TABLE `pool_slug_redirects` ADD CONSTRAINT `pool_slug_redirects_poolId_pools_id_fk` FOREIGN KEY (`poolId`) REFERENCES `pools`(`id`) ON DELETE cascade ON UPDATE no action;