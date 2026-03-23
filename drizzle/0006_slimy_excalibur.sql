ALTER TABLE `platform_settings` ADD `vapidPublicKey` text;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `vapidPrivateKey` text;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `vapidEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `pushEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `adsEnabled` boolean DEFAULT true NOT NULL;