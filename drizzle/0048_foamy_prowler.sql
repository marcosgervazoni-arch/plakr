ALTER TABLE `platform_settings` MODIFY COLUMN `apiFootballQuotaLimit` int NOT NULL DEFAULT 7500;--> statement-breakpoint
ALTER TABLE `pools` ADD `pixKey` text;