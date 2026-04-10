CREATE TABLE `technical_breakdown_shots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`breakdownId` int NOT NULL,
	`shotNumber` int NOT NULL,
	`shotType` varchar(100) NOT NULL,
	`cameraMovement` varchar(100),
	`cameraAngle` varchar(100),
	`description` text NOT NULL,
	`duration` int,
	`technicalNotes` text,
	`orderIndex` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `technical_breakdown_shots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `technical_breakdowns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sequenceId` int NOT NULL,
	`scenarioId` int NOT NULL,
	`status` enum('pending','generating','completed','error') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `technical_breakdowns_id` PRIMARY KEY(`id`)
);
