ALTER TABLE `quotes` MODIFY `status` enum('brouillon','confirmé','envoyé','accepté','refusé') NOT NULL DEFAULT 'brouillon';
