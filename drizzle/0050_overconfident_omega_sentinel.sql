CREATE TABLE `pool_sponsors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poolId` int NOT NULL,
	`sponsorName` varchar(255) NOT NULL,
	`sponsorLogoUrl` text,
	`customSlug` varchar(128),
	`welcomeMessage` text,
	`welcomeMessageActive` boolean NOT NULL DEFAULT false,
	`bannerImageUrl` text,
	`bannerLinkUrl` text,
	`bannerActive` boolean NOT NULL DEFAULT false,
	`popupTitle` varchar(255),
	`popupText` text,
	`popupImageUrl` text,
	`popupButtonText` varchar(100),
	`popupButtonUrl` text,
	`popupFrequency` enum('once_per_member','once_per_session','always') DEFAULT 'once_per_session',
	`popupDelaySeconds` int NOT NULL DEFAULT 3,
	`popupActive` boolean NOT NULL DEFAULT false,
	`showLogoOnShareCard` boolean NOT NULL DEFAULT false,
	`sponsoredNotificationText` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`enabledForOrganizer` boolean NOT NULL DEFAULT false,
	`enabledByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pool_sponsors_id` PRIMARY KEY(`id`),
	CONSTRAINT `pool_sponsors_poolId_unique` UNIQUE(`poolId`),
	CONSTRAINT `pool_sponsors_customSlug_unique` UNIQUE(`customSlug`)
);
--> statement-breakpoint
ALTER TABLE `pool_sponsors` ADD CONSTRAINT `pool_sponsors_poolId_pools_id_fk` FOREIGN KEY (`poolId`) REFERENCES `pools`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pool_sponsors` ADD CONSTRAINT `pool_sponsors_enabledByAdminId_users_id_fk` FOREIGN KEY (`enabledByAdminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;