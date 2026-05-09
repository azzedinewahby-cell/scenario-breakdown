ALTER TABLE `invoices` MODIFY `status` varchar(32) NOT NULL DEFAULT 'brouillon';
ALTER TABLE `invoices` ADD `paymentMethod` varchar(32);
