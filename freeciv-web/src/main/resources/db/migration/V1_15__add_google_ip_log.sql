create table google_ip_log(
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(32) NOT NULL,
  `ip_list` JSON NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
);