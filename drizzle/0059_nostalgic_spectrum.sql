ALTER TABLE `user_plans` MODIFY COLUMN `plan` enum('free','pro','unlimited','vip') NOT NULL DEFAULT 'free';--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `stripePriceIdVip` varchar(128);--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `stripeVipMonthlyPrice` int DEFAULT 490;--> statement-breakpoint
ALTER TABLE `pools` ADD `wallEnabled` boolean DEFAULT true NOT NULL;