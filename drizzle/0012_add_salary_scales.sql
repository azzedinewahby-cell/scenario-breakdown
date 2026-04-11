-- Add salary scales table for PCINE convention collective (mai 2025)
CREATE TABLE IF NOT EXISTS `salary_scales` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `level` int NOT NULL UNIQUE,
  `category` varchar(100) NOT NULL,
  `description` text,
  `monthlyMinimum` decimal(10, 2) NOT NULL,
  `annualMinimum` decimal(10, 2),
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert PCINE salary scales (valid from May 1, 2025)
INSERT INTO `salary_scales` (`level`, `category`, `description`, `monthlyMinimum`, `annualMinimum`) VALUES
(1, 'Cadre supérieur', 'Hors niveau', 3000.00, 36000.00),
(2, 'Cadre A', 'Niveau I ou expérience équivalente', 2779.57, 33354.84),
(3, 'Cadre B', 'Niveau III ou expérience équivalente', 2229.81, 26757.72),
(4, 'Agent de maîtrise', 'Niveau IV ou expérience équivalente', 1939.02, 23268.24),
(5, 'Employé(e) A', 'Niveau V ou expérience équivalente', 1838.26, 22059.12),
(6, 'Employé(e) B', 'Pas de diplôme ou expérience nécessaire', 1801.80, 21621.60);
