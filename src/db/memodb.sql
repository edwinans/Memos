CREATE TABLE `users` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `username` varchar(30),
  `password` varchar(255),
  `created_at` timestamp
);

CREATE TABLE `memos` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int,
  `title` varchar(50),
  `content` text,
  `created_at` timestamp
);

CREATE TABLE `user_memo` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int,
  `memo_id` int,
  `access` int,
  `created_at` timestamp
);
