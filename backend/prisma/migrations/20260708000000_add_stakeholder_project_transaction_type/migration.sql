ALTER TABLE `stakeholder_project_transaction`
  ADD COLUMN `transaction_type` VARCHAR(50) NOT NULL DEFAULT 'investment';

UPDATE `stakeholder_project_transaction`
SET `transaction_type` = CASE
  WHEN `amount` > 0 THEN 'payment'
  ELSE 'investment'
END;
