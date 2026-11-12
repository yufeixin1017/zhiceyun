-- 教师登录由邮箱调整为手机号。
-- 可重复执行：仅在字段或索引不存在时添加，不删除历史账号数据。

USE zhiceyun;

SET @phone_column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'teachers'
    AND COLUMN_NAME = 'phone'
);
SET @migration_sql = IF(
  @phone_column_exists = 0,
  'ALTER TABLE teachers ADD COLUMN phone VARCHAR(20) NULL AFTER name',
  'SELECT 1'
);
PREPARE statement FROM @migration_sql;
EXECUTE statement;
DEALLOCATE PREPARE statement;

-- 旧 email 列保留为可空兼容字段。
ALTER TABLE teachers MODIFY email VARCHAR(190) NULL;

-- 如果旧邮箱本身就是有效手机号，则自动迁移；其他账号需由管理员补充手机号。
UPDATE teachers
SET phone = email
WHERE phone IS NULL AND email REGEXP '^1[3-9][0-9]{9}$';

SET @phone_index_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'teachers'
    AND INDEX_NAME = 'uk_teachers_phone'
);
SET @migration_sql = IF(
  @phone_index_exists = 0,
  'ALTER TABLE teachers ADD UNIQUE KEY uk_teachers_phone (phone)',
  'SELECT 1'
);
PREPARE statement FROM @migration_sql;
EXECUTE statement;
DEALLOCATE PREPARE statement;

INSERT IGNORE INTO schema_migrations (version)
VALUES ('002_teacher_phone_login');
