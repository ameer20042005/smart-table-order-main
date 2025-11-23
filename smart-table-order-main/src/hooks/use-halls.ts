import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Hall {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useHalls = () => {
  const queryClient = useQueryClient();

  const { data: halls, isLoading } = useQuery({
    queryKey: ['halls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('halls')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Hall[];
    },
  });

  const createHall = useMutation({
    mutationFn: async (hall: Omit<Hall, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('halls')
        .insert(hall)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['halls'] });
      toast.success('تم إضافة الصالة بنجاح');
    },
    onError: (error) => {
      toast.error('فشل في إضافة الصالة: ' + error.message);
    },
  });

  const updateHall = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Hall> & { id: string }) => {
      const { data, error } = await supabase
        .from('halls')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['halls'] });
      toast.success('تم تحديث الصالة بنجاح');
    },
    onError: (error) => {
      toast.error('فشل في تحديث الصالة: ' + error.message);
    },
  });

  const deleteHall = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('halls')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['halls'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('تم حذف الصالة بنجاح');
    },
    onError: (error) => {
      toast.error('فشل في حذف الصالة: ' + error.message);
    },
  });

  return {
    halls,
    isLoading,
    createHall,
    updateHall,
    deleteHall,
  };
};
