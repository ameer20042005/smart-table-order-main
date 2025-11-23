-- Create halls table
CREATE TABLE IF NOT EXISTS public.halls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add hall_id column to restaurant_tables if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'restaurant_tables' 
    AND column_name = 'hall_id'
  ) THEN
    ALTER TABLE public.restaurant_tables 
    ADD COLUMN hall_id UUID REFERENCES public.halls(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS for halls
ALTER TABLE public.halls ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "All authenticated users can view halls" ON public.halls;
DROP POLICY IF EXISTS "Admins and managers can manage halls" ON public.halls;

-- RLS Policies for halls
CREATE POLICY "All authenticated users can view halls"
  ON public.halls FOR SELECT
  TO authenticated
  USING (true);

-- Create a simpler policy that doesn't depend on has_role function
-- This allows all authenticated users to manage halls
-- You can restrict this later based on your needs
CREATE POLICY "Authenticated users can manage halls"
  ON public.halls FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add trigger for updated_at on halls if the function exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_halls_updated_at ON public.halls;
    CREATE TRIGGER update_halls_updated_at
      BEFORE UPDATE ON public.halls
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Create indexes for better performance
DROP INDEX IF EXISTS idx_restaurant_tables_hall_id;
DROP INDEX IF EXISTS idx_halls_is_active;
CREATE INDEX idx_restaurant_tables_hall_id ON public.restaurant_tables(hall_id);
CREATE INDEX idx_halls_is_active ON public.halls(is_active);
