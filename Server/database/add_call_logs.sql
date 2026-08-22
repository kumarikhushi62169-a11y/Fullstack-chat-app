USE chat_app;

CREATE TABLE IF NOT EXISTS call_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  caller_id INT NOT NULL,
  receiver_id INT NOT NULL,
  call_type ENUM('audio', 'video') NOT NULL,
  status ENUM('ringing', 'accepted', 'ended', 'missed', 'declined') NOT NULL DEFAULT 'ringing',
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_call_logs_user_time (caller_id, started_at),
  KEY idx_call_logs_receiver_time (receiver_id, started_at),
  CONSTRAINT fk_call_logs_caller FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_call_logs_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
