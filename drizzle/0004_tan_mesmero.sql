CREATE TABLE `props` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scenarioId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `props_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scene_props` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sceneId` int NOT NULL,
	`propId` int NOT NULL,
	CONSTRAINT `scene_props_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sequence_scenes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sequenceId` int NOT NULL,
	`sceneId` int NOT NULL,
	`orderIndex` int DEFAULT 0,
	CONSTRAINT `sequence_scenes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sequences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scenarioId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`orderIndex` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sequences_id` PRIMARY KEY(`id`)
);
