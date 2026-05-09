ALTER TABLE `invoices` ADD `acompteAmount` int NOT NULL DEFAULT 0;
ALTER TABLE `invoices` ADD `acompteDate` timestamp;
ALTER TABLE `invoices` ADD `resteAPayer` int NOT NULL DEFAULT 0;
