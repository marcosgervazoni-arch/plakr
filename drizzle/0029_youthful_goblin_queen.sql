ALTER TABLE `platform_settings` MODIFY COLUMN `stripeMonthlyPrice` int DEFAULT 3990;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `stripePriceIdProAnnual` varchar(128);--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `stripePriceIdUnlimited` varchar(128);--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `stripePriceIdUnlimitedAnnual` varchar(128);