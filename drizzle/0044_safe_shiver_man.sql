ALTER TABLE `games` ADD `aiPrediction` json;--> statement-breakpoint
ALTER TABLE `games` ADD `aiSummary` text;--> statement-breakpoint
ALTER TABLE `games` ADD `goalsTimeline` json;--> statement-breakpoint
ALTER TABLE `games` ADD `matchStatistics` json;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `adsLocalEnabled` boolean DEFAULT true NOT NULL;