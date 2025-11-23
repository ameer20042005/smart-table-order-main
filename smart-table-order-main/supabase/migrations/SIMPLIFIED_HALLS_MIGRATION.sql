-- ===================================
-- Simple Migration for Halls Feature
-- ===================================
-- This migration can be run directly without dependencies

-- 1. Create halls table
CREATE TABLE IF NOT EXISTS public.halls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add hall_id column to restaurant_tables (if table exists)
DO $$ 
BEGIN
  -- Check if restaurant_tables exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'restaurant_tables'
  ) THEN
    -- Add hall_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'restaurant_tables' 
      AND column_name = 'hall_id'
    ) THEN
      ALTER TABLE public.restaurant_tables 
      ADD COLUMN hall_id UUID;
      
      -- Add foreign key constraint
      ALTER TABLE public.restaurant_tables
      ADD CONSTRAINT fk_restaurant_tables_hall_id 
      FOREIGN KEY (hall_id) 
      REFERENCES public.halls(id) 
      ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- 3. Enable Row Level Security
ALTER TABLE public.halls ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist
DROP POLICY IF EXISTS "All authenticated users can view halls" ON public.halls;
DROP POLICY IF EXISTS "Authenticated users can manage halls" ON public.halls;

-- 5. Create RLS Policies
-- Allow all authenticated users to view halls
CREATE POLICY "All authenticated users can view halls"
  ON public.halls FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to manage halls
-- NOTE: You may want to restrict this to admins/managers only later
CREATE POLICY "Authenticated users can manage halls"
  ON public.halls FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Create indexes for better performance
DROP INDEX IF EXISTS idx_restaurant_tables_hall_id;
DROP INDEX IF EXISTS idx_halls_is_active;

CREATE INDEX IF NOT EXISTS idx_restaurant_tables_hall_id 
ON public.restaurant_tables(hall_id);

CREATE INDEX IF NOT EXISTS idx_halls_is_active 
ON public.halls(is_active);

-- 7. Add some sample halls (optional - comment out if not needed)
-- INSERT INTO public.halls (name, description, is_active) VALUES
--   ('الصالة الرئيسية', 'الصالة الرئيسية للمطعم', true),
--   ('صالة VIP', 'صالة خاصة للضيوف المميزين', true),
--   ('الصالة الخارجية', 'صالة في الهواء الطلق', true)
-- ON CONFLICT DO NOTHING;

-- Done!
-- You can now use the halls feature in your application
