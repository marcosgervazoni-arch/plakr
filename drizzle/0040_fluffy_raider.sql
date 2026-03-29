CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`keyHash` varchar(64) NOT NULL,
	`keyPrefix` varchar(16) NOT NULL,
	`scopes` json NOT NULL,
	`createdBy` int NOT NULL,
	`lastUsedAt` timestamp,
	`expiresAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `stripePublishableKey` varchar(256);--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `stripeSecretKey` varchar(256);--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `stripeWebhookSecret` varchar(256);--> statement-breakpoint
ALTER TABLE `pool_retrospectives` ADD `videoUrl` text;--> statement-breakpoint
ALTER TABLE `pool_retrospectives` ADD `videoKey` varchar(255);--> statement-breakpoint
ALTER TABLE `pool_retrospectives` ADD `videoStatus` enum('pending','processing','done','failed') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `retrospective_config` ADD `enableSlides` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `retrospective_config` ADD `enableVideo` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `retrospective_config` ADD `videoQuality` enum('low','medium','high') DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE `retrospective_config` ADD `testVideoUrl` text;--> statement-breakpoint
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;