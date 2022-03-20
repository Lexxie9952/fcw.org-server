alter table auth add column `digest_pw` BOOLEAN;
update auth set digest_pw = FALSE;
