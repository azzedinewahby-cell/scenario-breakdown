CREATE TABLE IF NOT EXISTS `acompte_lines` (
  `id` int AUTO_INCREMENT NOT NULL,
  `invoiceId` int NOT NULL,
  `amount` int NOT NULL,
  `paymentMethod` varchar(32),
  `paidAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
