-- Fix security warnings by using CREATE OR REPLACE for functions

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_order_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders
  SET total_amount = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM public.order_items
    WHERE order_id = NEW.order_id
  )
  WHERE id = NEW.order_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_inventory_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO public.inventory_transactions (menu_item_id, quantity_change, reason, reference_id)
    SELECT 
      menu_item_id,
      -quantity,
      'Order completed',
      NEW.id
    FROM public.order_items
    WHERE order_id = NEW.id;
    
    UPDATE public.menu_items
    SET stock_quantity = stock_quantity - oi.quantity
    FROM public.order_items oi
    WHERE menu_items.id = oi.menu_item_id
    AND oi.order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;