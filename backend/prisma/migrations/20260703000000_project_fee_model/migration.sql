ALTER TABLE `project`
CHANGE COLUMN `fee_type` `fee_model` VARCHAR(50) NOT NULL DEFAULT 'percentage';

UPDATE `project`
SET `fee_model` = CASE
  WHEN LOWER(TRIM(COALESCE(`fee_model`, ''))) IN ('fixed', 'fixed_per_unit') THEN 'fixed'
  ELSE 'percentage'
END;
