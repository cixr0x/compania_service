ALTER TABLE `project_transactions`
  ADD COLUMN `date` DATE NULL;

UPDATE `project_transactions`
SET `date` = CURRENT_DATE()
WHERE `date` IS NULL;

ALTER TABLE `project_transactions`
  MODIFY `date` DATE NOT NULL;
