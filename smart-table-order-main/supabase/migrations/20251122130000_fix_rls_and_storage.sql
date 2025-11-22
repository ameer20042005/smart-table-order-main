-- Create storage bucket for menu item images
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-items', 'menu-items', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for menu-items bucket
CREATE POLICY "Allow public read access to menu items images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'menu-items');

CREATE POLICY "Allow authenticated users to upload menu items images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'menu-items' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow authenticated users to update their menu items images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'menu-items' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow authenticated users to delete their menu items images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'menu-items' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create storage bucket for table QR codes
INSERT INTO storage.buckets (id, name, public)
VALUES ('table-qr-codes', 'table-qr-codes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for table-qr-codes bucket
CREATE POLICY "Allow public read access to table QR codes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'table-qr-codes');

CREATE POLICY "Allow authenticated users to upload table QR codes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'table-qr-codes');

CREATE POLICY "Allow authenticated users to update table QR codes"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'table-qr-codes');

CREATE POLICY "Allow authenticated users to delete table QR codes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'table-qr-codes');

-- Fix RLS policies - Allow public read access to menu items for customer menu
DROP POLICY IF EXISTS "All authenticated users can view menu items" ON public.menu_items;
CREATE POLICY "Allow public and authenticated users to view menu items"
ON public.menu_items FOR SELECT
TO public, authenticated
USING (true);

-- Allow public to view available tables for customer orders
DROP POLICY IF EXISTS "All authenticated users can view tables" ON public.restaurant_tables;
CREATE POLICY "Allow public and authenticated users to view tables"
ON public.restaurant_tables FOR SELECT
TO public, authenticated
USING (true);

-- Allow public to create orders (for customer orders)
CREATE POLICY "Allow public to create orders"
ON public.orders FOR INSERT
TO public, authenticated
WITH CHECK (true);

-- Allow public to view their orders
CREATE POLICY "Allow public to view orders"
ON public.orders FOR SELECT
TO public, authenticated
USING (true);

-- Allow public to create order items
CREATE POLICY "Allow public to create order items"
ON public.order_items FOR INSERT
TO public, authenticated
WITH CHECK (true);

-- Allow public to view order items
CREATE POLICY "Allow public to view order items"
ON public.order_items FOR SELECT
TO public, authenticated
USING (true);
