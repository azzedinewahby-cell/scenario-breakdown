CREATE TABLE `budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scenarioId` int NOT NULL,
	`version` enum('eco','confort') NOT NULL DEFAULT 'eco',
	`shootingDays` int DEFAULT 0,
	`pagesPerDay` int DEFAULT 0,
	`totalBudgetEco` int DEFAULT 0,
	`totalBudgetConfort` int DEFAULT 0,
	`content` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budgets_id` PRIMARY KEY(`id`)
);
