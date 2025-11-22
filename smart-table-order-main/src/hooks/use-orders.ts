import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes: string | null;
  menu_item?: {
    name: string;
    image_url: string | null;
  };
}

export interface Order {
  id: string;
  table_id: string | null;
  waiter_id: string | null;
  status: OrderStatus;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  order_items?: OrderItem[];
  restaurant_tables?: {
    table_number: string;
  };
  profiles?: {
    full_name: string;
  };
}

export const useOrders = () => {
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          restaurant_tables(table_number),
          profiles(full_name),
          order_items(
            *,
            menu_items(name, image_url)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Order[];
    },
  });

  const createOrder = useMutation({
    mutationFn: async (order: { table_id: string; waiter_id: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('orders')
        .insert(order)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('تم إنشاء الطلب بنجاح');
    },
    onError: (error) => {
      toast.error('فشل في إنشاء الطلب: ' + error.message);
    },
  });

  const addOrderItem = useMutation({
    mutationFn: async (item: {
      order_id: string;
      menu_item_id: string;
      quantity: number;
      unit_price: number;
      notes?: string;
    }) => {
      const subtotal = item.quantity * item.unit_price;
      const { data, error } = await supabase
        .from('order_items')
        .insert({ ...item, subtotal })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('تم إضافة الصنف للطلب');
    },
    onError: (error) => {
      toast.error('فشل في إضافة الصنف: ' + error.message);
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const updates: any = { status };
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('تم تحديث حالة الطلب');
    },
    onError: (error) => {
      toast.error('فشل في تحديث الطلب: ' + error.message);
    },
  });

  return {
    orders,
    isLoading,
    createOrder,
    addOrderItem,
    updateOrderStatus,
  };
};
