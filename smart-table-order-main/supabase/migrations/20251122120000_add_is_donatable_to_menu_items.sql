-- Add is_donatable column to menu_items table
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS is_donatable BOOLEAN DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN public.menu_items.is_donatable IS 'Indicates if this item can be donated to customers';

-- Create index for better performance when filtering donatable items
CREATE INDEX IF NOT EXISTS idx_menu_items_is_donatable 
ON public.menu_items(is_donatable) 
WHERE is_donatable = true;
