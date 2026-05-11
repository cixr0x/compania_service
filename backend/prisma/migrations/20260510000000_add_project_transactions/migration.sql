CREATE TABLE `project_transactions` (
  `id_project_transaction` INTEGER NOT NULL AUTO_INCREMENT,
  `project_id` INTEGER NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `description` TEXT NOT NULL,

  INDEX `project_transactions_project_id_idx`(`project_id`),
  PRIMARY KEY (`id_project_transaction`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `project_transactions`
  ADD CONSTRAINT `project_transactions_project_id_fkey`
  FOREIGN KEY (`project_id`) REFERENCES `project`(`id_project`)
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `project_transactions` (`project_id`, `amount`, `description`)
SELECT `id_project`, `production_cost`, 'Production Cost'
FROM `project`
WHERE `production_cost` <> 0;

INSERT INTO `project_transactions` (`project_id`, `amount`, `description`)
SELECT `id_project`, `admin_cost`, 'Admin Cost'
FROM `project`
WHERE `admin_cost` <> 0;

INSERT INTO `project_transactions` (`project_id`, `amount`, `description`)
SELECT
  `id_project`,
  `cost_adjustment`,
  COALESCE(NULLIF(`adjustment_description`, ''), 'Cost Adjustment')
FROM `project`
WHERE `cost_adjustment` <> 0;

ALTER TABLE `project`
  MODIFY `admin_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0;
