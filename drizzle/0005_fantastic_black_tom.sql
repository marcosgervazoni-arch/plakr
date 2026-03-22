CREATE TABLE `push_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` varchar(128) NOT NULL,
	`userAgent` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `notification_preferences` MODIFY COLUMN `emailGameReminder` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `notification_preferences` MODIFY COLUMN `emailResultAvailable` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `notification_preferences` MODIFY COLUMN `emailSystem` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `games` ADD `reminderSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD `inAppAd` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD `pushGameReminder` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD `pushRankingUpdate` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD `pushResultAvailable` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD `pushSystem` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD `pushAd` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD `emailAd` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `defaultLandslideMinDiff` int DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `defaultZebraThreshold` int DEFAULT 75 NOT NULL;--> statement-breakpoint
ALTER TABLE `pool_scoring_rules` ADD `landslideMinDiff` int DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE `push_subscriptions` ADD CONSTRAINT `push_subscriptions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;