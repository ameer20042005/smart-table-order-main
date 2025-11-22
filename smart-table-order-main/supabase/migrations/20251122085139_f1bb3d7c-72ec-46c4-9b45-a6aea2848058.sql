-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'waiter', 'cashier');

-- Create table_status enum
CREATE TYPE public.table_status AS ENUM ('available', 'occupied', 'reserved');

-- Create order_status enum
CREATE TYPE public.order_status AS ENUM ('pending', 'preparing', 'ready', 'served', 'completed', 'cancelled');

-- Create payment_method enum
CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'qr_code', 'barcode');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create tables table (restaurant tables)
CREATE TABLE public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number TEXT NOT NULL UNIQUE,
  qr_code TEXT UNIQUE,
  capacity INTEGER NOT NULL DEFAULT 4,
  status table_status DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2) DEFAULT 0,
  barcode TEXT UNIQUE,
  image_url TEXT,
  category TEXT,
  stock_quantity INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  waiter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status order_status DEFAULT 'pending',
  total_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE RESTRICT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  cashier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  transaction_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create inventory_transactions table
CREATE TABLE public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE NOT NULL,
  quantity_change INTEGER NOT NULL,
  reason TEXT,
  reference_id UUID,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for restaurant_tables
CREATE POLICY "All authenticated users can view tables"
  ON public.restaurant_tables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage tables"
  ON public.restaurant_tables FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- RLS Policies for menu_items
CREATE POLICY "All authenticated users can view menu items"
  ON public.menu_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage menu items"
  ON public.menu_items FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- RLS Policies for orders
CREATE POLICY "All authenticated users can view orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Waiters can create orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'waiter') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Authorized users can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'waiter') OR
    public.has_role(auth.uid(), 'cashier') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for order_items
CREATE POLICY "All authenticated users can view order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authorized users can manage order items"
  ON public.order_items FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'waiter') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for payments
CREATE POLICY "All authenticated users can view payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Cashiers can create payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'cashier') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for inventory_transactions
CREATE POLICY "All authenticated users can view inventory"
  ON public.inventory_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage inventory"
  ON public.inventory_transactions FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_restaurant_tables_updated_at
  BEFORE UPDATE ON public.restaurant_tables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update order total
CREATE OR REPLACE FUNCTION public.update_order_total()
RETURNS TRIGGER
LANGUAGE plpgsql
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

-- Trigger to update order total when order items change
CREATE TRIGGER update_order_total_on_insert
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_order_total();

CREATE TRIGGER update_order_total_on_update
  AFTER UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_order_total();

CREATE TRIGGER update_order_total_on_delete
  AFTER DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_order_total();

-- Create function to update inventory on order completion
CREATE OR REPLACE FUNCTION public.update_inventory_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
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

-- Trigger to update inventory when order is completed
CREATE TRIGGER update_inventory_on_order_completion
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_inventory_on_order();