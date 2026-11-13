-- 记录学生提交是否超过测验限时。超时提交仍然计入成绩与统计。
-- 可重复执行：仅在列不存在时添加。

USE zhiceyun;

SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'submissions'
    AND COLUMN_NAME = 'is_late'
);
SET @migration_sql = IF(
  @column_exists = 0,
  'ALTER TABLE submissions ADD COLUMN is_late TINYINT(1) NOT NULL DEFAULT 0 AFTER submitted_at',
  'SELECT 1'
);
PREPARE statement FROM @migration_sql;
EXECUTE statement;
DEALLOCATE PREPARE statement;

INSERT IGNORE INTO schema_migrations (version)
VALUES ('004_submission_late_status');