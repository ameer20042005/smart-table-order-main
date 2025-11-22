import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cost: number;
  barcode: string | null;
  image_url: string | null;
  category: string | null;
  stock_quantity: number;
  is_available: boolean;
  is_donatable?: boolean;
  created_at: string;
  updated_at: string;
}

export const useMenuItems = () => {
  const queryClient = useQueryClient();

  const { data: menuItems, isLoading } = useQuery({
    queryKey: ['menu-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as MenuItem[];
    },
  });

  const createMenuItem = useMutation({
    mutationFn: async (item: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('menu_items')
        .insert(item)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      toast.success('تم إضافة الصنف بنجاح');
    },
    onError: (error) => {
      toast.error('فشل في إضافة الصنف: ' + error.message);
    },
  });

  const updateMenuItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MenuItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('menu_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      toast.success('تم تحديث الصنف بنجاح');
    },
    onError: (error) => {
      toast.error('فشل في تحديث الصنف: ' + error.message);
    },
  });

  const deleteMenuItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      toast.success('تم حذف الصنف بنجاح');
    },
    onError: (error) => {
      toast.error('فشل في حذف الصنف: ' + error.message);
    },
  });

  return {
    menuItems,
    isLoading,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
  };
};
