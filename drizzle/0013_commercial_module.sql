-- Gestion Commerciale Module Tables

CREATE TABLE `salary_scales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role` varchar(256) NOT NULL,
	`category` varchar(256) NOT NULL,
	`monthlySalary` int DEFAULT 0,
	`dailyRate` int DEFAULT 0,
	`hourlyRate` int DEFAULT 0,
	`source` varchar(256) DEFAULT 'PCINE mai 2025',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `salary_scales_id` PRIMARY KEY(`id`),
	CONSTRAINT `salary_scales_role_unique` UNIQUE(`role`)
);

CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('particulier','entreprise') NOT NULL DEFAULT 'entreprise',
	`name` varchar(256) NOT NULL,
	`address` text,
	`email` varchar(256),
	`phone` varchar(20),
	`siret` varchar(20),
	`vatNumber` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);

CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`priceHT` int DEFAULT 0,
	`vatRate` int DEFAULT 20,
	`unit` enum('heure','jour','forfait') NOT NULL DEFAULT 'forfait',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);

CREATE TABLE `quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` int NOT NULL,
	`number` varchar(32) NOT NULL,
	`issueDate` timestamp NOT NULL DEFAULT (now()),
	`validityDate` timestamp,
	`status` enum('brouillon','envoyé','accepté','refusé') NOT NULL DEFAULT 'brouillon',
	`totalHT` int DEFAULT 0,
	`totalVAT` int DEFAULT 0,
	`totalTTC` int DEFAULT 0,
	`paymentTerms` text,
	`clientSignature` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotes_number_unique` UNIQUE(`number`)
);

CREATE TABLE `quote_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int DEFAULT 1,
	`unitPriceHT` int DEFAULT 0,
	`vatRate` int DEFAULT 20,
	`lineTotal` int DEFAULT 0,
	`orderIndex` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quote_lines_id` PRIMARY KEY(`id`)
);

CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` int NOT NULL,
	`quoteId` int,
	`number` varchar(32) NOT NULL,
	`issueDate` timestamp NOT NULL DEFAULT (now()),
	`dueDate` timestamp,
	`status` enum('brouillon','envoyée','payée','en retard') NOT NULL DEFAULT 'brouillon',
	`totalHT` int DEFAULT 0,
	`totalVAT` int DEFAULT 0,
	`totalTTC` int DEFAULT 0,
	`paymentMethod` varchar(64),
	`paymentDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_number_unique` UNIQUE(`number`)
);

CREATE TABLE `invoice_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int DEFAULT 1,
	`unitPriceHT` int DEFAULT 0,
	`vatRate` int DEFAULT 20,
	`lineTotal` int DEFAULT 0,
	`orderIndex` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invoice_lines_id` PRIMARY KEY(`id`)
);

CREATE TABLE `credits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`invoiceId` int NOT NULL,
	`number` varchar(32) NOT NULL,
	`amount` int DEFAULT 0,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credits_id` PRIMARY KEY(`id`),
	CONSTRAINT `credits_number_unique` UNIQUE(`number`)
);
