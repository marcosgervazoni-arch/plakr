ALTER TABLE `pool_sponsors` ADD `rankingNotificationText` text;--> statement-breakpoint
ALTER TABLE `pool_sponsors` ADD `rankingNotificationActive` boolean DEFAULT false NOT NULL;