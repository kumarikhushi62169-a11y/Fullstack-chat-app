USE chat_app;

ALTER TABLE users
  ADD COLUMN avatar VARCHAR(500) NULL AFTER email;
