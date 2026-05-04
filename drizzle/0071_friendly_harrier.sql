ALTER TABLE `platform_settings` ADD `googleClientId` varchar(256);--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `googleClientSecret` varchar(256);--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `googleOAuthEnabled` boolean DEFAULT false NOT NULL;