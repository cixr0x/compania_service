CREATE TABLE `stakeholder_project_transaction` (
  `id_stakeholder_project_transaction` INTEGER NOT NULL AUTO_INCREMENT,
  `id_project` INTEGER NOT NULL,
  `id_stakeholder` INTEGER NOT NULL,
  `date` DATE NOT NULL,
  `description` TEXT NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,

  INDEX `stakeholder_project_transaction_project_stakeholder_idx`(`id_project`, `id_stakeholder`),
  PRIMARY KEY (`id_stakeholder_project_transaction`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `stakeholder_project_transaction`
  ADD CONSTRAINT `stakeholder_project_transaction_project_stakeholder_fkey`
  FOREIGN KEY (`id_project`, `id_stakeholder`)
  REFERENCES `project_stakeholder`(`id_project`, `id_stakeholder`)
  ON DELETE CASCADE ON UPDATE CASCADE;
