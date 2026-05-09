UPDATE `sales` AS `s`
INNER JOIN `product` AS `p` ON `p`.`id` = `s`.`id_product`
SET
  `s`.`profit` = ROUND(`s`.`amount` - `s`.`fee`, 2),
  `s`.`owner_profit` = ROUND(
    (`s`.`amount` - `s`.`fee`) * (`p`.`ownership` / 100),
    2
  );

ALTER TABLE `sales`
DROP COLUMN `tax`,
DROP COLUMN `tax_pct`;

DELETE FROM `settings`
WHERE `code` = 'sales_tax';
