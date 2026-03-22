ALTER TABLE `platform_settings` MODIFY COLUMN `defaultScoringBonusGoals` int NOT NULL DEFAULT 3;--> statement-breakpoint
ALTER TABLE `platform_settings` MODIFY COLUMN `defaultScoringBonusDiff` int NOT NULL DEFAULT 3;--> statement-breakpoint
ALTER TABLE `platform_settings` MODIFY COLUMN `defaultScoringBonusUpset` int NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `pool_scoring_rules` MODIFY COLUMN `totalGoalsPoints` int NOT NULL DEFAULT 3;--> statement-breakpoint
ALTER TABLE `pool_scoring_rules` MODIFY COLUMN `goalDiffPoints` int NOT NULL DEFAULT 3;--> statement-breakpoint
ALTER TABLE `pool_scoring_rules` MODIFY COLUMN `oneTeamGoalsPoints` int NOT NULL DEFAULT 2;--> statement-breakpoint
ALTER TABLE `pool_scoring_rules` MODIFY COLUMN `landslidePoints` int NOT NULL DEFAULT 5;--> statement-breakpoint
ALTER TABLE `pool_scoring_rules` MODIFY COLUMN `zebraPoints` int NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `pool_scoring_rules` MODIFY COLUMN `zebraThreshold` int NOT NULL DEFAULT 75;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `defaultScoringBonusOneTeam` int DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `defaultScoringBonusLandslide` int DEFAULT 5 NOT NULL;