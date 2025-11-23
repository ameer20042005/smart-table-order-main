import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TableStatus = 'available' | 'occupied' | 'reserved';

export interface Table {
  id: string;
  table_number: string;
  qr_code: string | null;
  capacity: number;
  status: TableStatus;
  hall_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useTables = () => {
  const queryClient = useQueryClient();

  const { data: tables, isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select(`
          *,
          halls (
            id,
            name,
            description,
            is_active
          )
        `)
        .order('table_number');
      
      if (error) throw error;
      return data as Table[];
    },
  });

  const createTable = useMutation({
    mutationFn: async (table: Omit<Table, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .insert(table)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('تم إضافة الطاولة بنجاح');
    },
    onError: (error) => {
      toast.error('فشل في إضافة الطاولة: ' + error.message);
    },
  });

  const updateTable = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Table> & { id: string }) => {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('تم تحديث الطاولة بنجاح');
    },
    onError: (error) => {
      toast.error('فشل في تحديث الطاولة: ' + error.message);
    },
  });

  const deleteTable = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('restaurant_tables')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('تم حذف الطاولة بنجاح');
    },
    onError: (error) => {
      toast.error('فشل في حذف الطاولة: ' + error.message);
    },
  });

  return {
    tables,
    isLoading,
    createTable,
    updateTable,
    deleteTable,
  };
};
