ALTER TABLE `sales`
ADD COLUMN `profit` DECIMAL(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN `owner_profit` DECIMAL(12, 2) NOT NULL DEFAULT 0;

UPDATE `sales` AS `s`
INNER JOIN `product` AS `p` ON `p`.`id` = `s`.`id_product`
SET
  `s`.`profit` = ROUND(`s`.`amount` - `s`.`fee` - `s`.`tax`, 2),
  `s`.`owner_profit` = ROUND(
    (`s`.`amount` - `s`.`fee` - `s`.`tax`) * (`p`.`ownership` / 100),
    2
  );
