
-- 1. Fix site_settings: remove public SELECT, keep admin-only
DROP POLICY IF EXISTS "Anyone can view settings" ON site_settings;

-- 2. Fix orders: remove permissive public SELECT
DROP POLICY IF EXISTS "Anyone can search orders for tracking" ON orders;

-- 3. Ensure ebook-files bucket is private
UPDATE storage.buckets SET public = false WHERE id = 'ebook-files';
