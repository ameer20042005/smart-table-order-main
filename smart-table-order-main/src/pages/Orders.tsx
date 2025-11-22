import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

const Orders = () => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          restaurant_tables(table_number),
          profiles(full_name),
          order_items(
            *,
            menu_items(name, price)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      // Update order status
      const { error: orderError, data: orderData } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", id)
        .select("table_id")
        .single();

      if (orderError) throw orderError;

      // If status is completed or cancelled, make the table available again
      if ((status === "completed" || status === "cancelled") && orderData?.table_id) {
        const { error: tableError } = await supabase
          .from("restaurant_tables")
          .update({ status: "available" })
          .eq("id", orderData.table_id);

        if (tableError) throw tableError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      toast({
        title: "تم تحديث الطلب",
        description: "تم تحديث حالة الطلب بنجاح",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "secondary" as const, label: "قيد الانتظار", icon: Clock },
      preparing: { variant: "default" as const, label: "قيد التحضير", icon: Clock },
      ready: { variant: "default" as const, label: "جاهز", icon: CheckCircle2 },
      served: { variant: "default" as const, label: "تم التقديم", icon: CheckCircle2 },
      completed: { variant: "default" as const, label: "مكتمل", icon: CheckCircle2 },
      cancelled: { variant: "destructive" as const, label: "ملغي", icon: XCircle },
    };
    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">الطلبات</h1>
            <p className="text-muted-foreground mt-2">
              متابعة وإدارة جميع الطلبات
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">جاري التحميل...</div>
        ) : (
          <div className="grid gap-4">
            {orders?.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {order.restaurant_tables?.table_number && (
                          <span>طاولة {order.restaurant_tables.table_number}</span>
                        )}
                        {!order.restaurant_tables && <span>طلب توصيل</span>}
                      </CardTitle>
                      <CardDescription>
                        {formatDistanceToNow(new Date(order.created_at), {
                          addSuffix: true,
                          locale: ar,
                        })}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(order.status)}
                      <span className="text-lg font-bold">
                        {Number(order.total_amount).toFixed(2)} د.ع
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {order.order_items?.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center py-2 border-b"
                      >
                        <div>
                          <span className="font-medium">
                            {item.menu_items?.name}
                          </span>
                          <span className="text-sm text-muted-foreground mr-2">
                            x{item.quantity}
                          </span>
                        </div>
                        <span>{Number(item.subtotal).toFixed(2)} د.ع</span>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div className="text-sm text-muted-foreground border-t pt-2">
                      ملاحظات: {order.notes}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Select
                      value={order.status}
                      onValueChange={(value) =>
                        updateOrderStatusMutation.mutate({ id: order.id, status: value })
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">قيد الانتظار</SelectItem>
                        <SelectItem value="preparing">قيد التحضير</SelectItem>
                        <SelectItem value="ready">جاهز</SelectItem>
                        <SelectItem value="served">تم التقديم</SelectItem>
                        <SelectItem value="completed">مكتمل</SelectItem>
                        <SelectItem value="cancelled">ملغي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Orders;