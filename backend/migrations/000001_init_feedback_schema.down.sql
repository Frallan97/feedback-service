DROP TRIGGER IF EXISTS feedback_comments_updated_at ON feedback_comments;
DROP TRIGGER IF EXISTS feedback_updated_at ON feedback;
DROP TRIGGER IF EXISTS applications_updated_at ON applications;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS feedback_attachments CASCADE;
DROP TABLE IF EXISTS feedback_comments CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
