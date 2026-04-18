CREATE TABLE `magic_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`token` varchar(128) NOT NULL,
	`returnPath` varchar(500) NOT NULL DEFAULT '/dashboard',
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `magic_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `magic_links_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE INDEX `idx_magic_links_email` ON `magic_links` (`email`);--> statement-breakpoint
CREATE INDEX `idx_magic_links_token` ON `magic_links` (`token`);