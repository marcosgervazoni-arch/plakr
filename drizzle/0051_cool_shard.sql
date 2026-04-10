CREATE TABLE `pool_sponsor_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poolId` int NOT NULL,
	`sponsorId` int NOT NULL,
	`eventType` enum('banner_impression','banner_click','popup_impression','popup_click','welcome_impression') NOT NULL,
	`sessionId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pool_sponsor_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pool_sponsor_events` ADD CONSTRAINT `pool_sponsor_events_poolId_pools_id_fk` FOREIGN KEY (`poolId`) REFERENCES `pools`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pool_sponsor_events` ADD CONSTRAINT `pool_sponsor_events_sponsorId_pool_sponsors_id_fk` FOREIGN KEY (`sponsorId`) REFERENCES `pool_sponsors`(`id`) ON DELETE cascade ON UPDATE no action;