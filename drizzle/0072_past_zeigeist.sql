ALTER TABLE `platform_settings` ADD `appleClientId` varchar(256);--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `appleTeamId` varchar(32);--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `appleKeyId` varchar(32);--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `applePrivateKey` text;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `appleOAuthEnabled` boolean DEFAULT false NOT NULL;