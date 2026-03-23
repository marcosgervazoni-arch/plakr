CREATE TABLE `notification_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('game_reminder','result_available','ranking_update') NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`titleTemplate` varchar(255) NOT NULL,
	`bodyTemplate` text NOT NULL,
	`pushTitleTemplate` varchar(255),
	`pushBodyTemplate` text,
	`emailSubjectTemplate` varchar(255),
	`emailBodyTemplate` text,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_templates_type_unique` UNIQUE(`type`)
);
--> statement-breakpoint
ALTER TABLE `notification_templates` ADD CONSTRAINT `notification_templates_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;