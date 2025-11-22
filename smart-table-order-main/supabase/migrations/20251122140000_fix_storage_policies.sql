-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Allow authenticated users to upload menu items images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their menu items images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their menu items images" ON storage.objects;

-- سياسات جديدة مبسطة - السماح لجميع المستخدمين المصادق عليهم برفع الصور
CREATE POLICY "Allow authenticated upload menu items images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'menu-items');

CREATE POLICY "Allow authenticated update menu items images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'menu-items');

CREATE POLICY "Allow authenticated delete menu items images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'menu-items');
