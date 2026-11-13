-- 移除已废弃的演示生成标记：产品仅保留 AI 生成。
-- 可重复执行：仅在列存在时删除。

USE zhiceyun;

SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'quizzes'
    AND COLUMN_NAME = 'generation_mode'
);
SET @migration_sql = IF(
  @column_exists > 0,
  'ALTER TABLE quizzes DROP COLUMN generation_mode',
  'SELECT 1'
);
PREPARE statement FROM @migration_sql;
EXECUTE statement;
DEALLOCATE PREPARE statement;

INSERT IGNORE INTO schema_migrations (version)
VALUES ('003_remove_generation_mode');