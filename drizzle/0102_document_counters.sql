CREATE TABLE IF NOT EXISTS `document_counters` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `prefix` varchar(10) NOT NULL,
  `year` int NOT NULL,
  `lastSequence` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `document_counters_user_prefix_year` (`userId`, `prefix`, `year`)
);
