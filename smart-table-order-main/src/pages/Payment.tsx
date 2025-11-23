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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, DollarSign, Printer, CheckCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ar } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const Payment = () => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "qr_code" | "barcode">("cash");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: unpaidOrders, isLoading } = useQuery({
    queryKey: ["unpaid-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          restaurant_tables(table_number, halls(name)),
          profiles(full_name),
          order_items(
            *,
            menu_items(name, price)
          ),
          payments(id)
        `)
        .in("status", ["pending", "preparing", "ready", "served"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Filter orders that don't have payments
      return data?.filter((order: any) => !order.payments || order.payments.length === 0);
    },
  });

  const processPaymentMutation = useMutation({
    mutationFn: async ({ orderId, method }: { orderId: string; method: "cash" | "card" | "qr_code" | "barcode" }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("يجب تسجيل الدخول");

      // Get order details
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      // Create payment
      const { error: paymentError } = await supabase
        .from("payments")
        .insert([{
          order_id: orderId,
          amount: order.total_amount,
          payment_method: method,
          cashier_id: user.id,
        }]);

      if (paymentError) throw paymentError;

      // Update order status to completed
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Update table status to available if applicable
      if (order.table_id) {
        await supabase
          .from("restaurant_tables")
          .update({ status: "available" })
          .eq("id", order.table_id);
      }

      return order;
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["unpaid-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      toast({
        title: "تم الدفع بنجاح",
        description: "تم إتمام عملية الدفع وإغلاق الطلب",
      });
      setSelectedOrderId("");
      
      // Print invoice after successful payment
      printInvoice(order);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const selectedOrder = unpaidOrders?.find((order: any) => order.id === selectedOrderId);

  const printInvoice = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const invoiceHTML = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة - ${order.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Arial', sans-serif;
            padding: 20mm;
            background: white;
          }
          .invoice { max-width: 80mm; margin: 0 auto; }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .header h1 { font-size: 24px; margin-bottom: 5px; }
          .header p { font-size: 12px; color: #666; }
          .info-section { margin: 15px 0; font-size: 13px; }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .info-label { font-weight: bold; }
          .items-section { margin: 20px 0; }
          .items-header {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr;
            gap: 10px;
            font-weight: bold;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
            margin-bottom: 10px;
            font-size: 13px;
          }
          .item-row {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr;
            gap: 10px;
            padding: 5px 0;
            font-size: 13px;
          }
          .totals {
            margin-top: 20px;
            border-top: 2px solid #000;
            padding-top: 10px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            font-size: 14px;
          }
          .total-row.final {
            font-size: 18px;
            font-weight: bold;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #000;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            border-top: 1px dashed #000;
            padding-top: 10px;
          }
          .paid-badge {
            background: #10b981;
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            display: inline-block;
            margin: 10px 0;
            font-weight: bold;
          }
          @media print {
            body { padding: 0; }
            .invoice { max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="header">
            <h1>نظام المطعم</h1>
            <p>فاتورة مبيعات</p>
            <div class="paid-badge">✓ مدفوعة</div>
          </div>
          
          <div class="info-section">
            <div class="info-row">
              <span class="info-label">رقم الفاتورة:</span>
              <span>#${order.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">التاريخ:</span>
              <span>${format(new Date(), "yyyy-MM-dd HH:mm", { locale: ar })}</span>
            </div>
            <div class="info-row">
              <span class="info-label">الطاولة:</span>
              <span>${order.restaurant_tables?.table_number ? `طاولة ${order.restaurant_tables.table_number}` : 'طلب توصيل'}</span>
            </div>
            ${order.restaurant_tables?.halls?.name ? `
            <div class="info-row">
              <span class="info-label">الصالة:</span>
              <span>${order.restaurant_tables.halls.name}</span>
            </div>
            ` : ''}
            <div class="info-row">
              <span class="info-label">طريقة الدفع:</span>
              <span>${paymentMethod === 'cash' ? 'نقدي' : paymentMethod === 'card' ? 'بطاقة' : 'أخرى'}</span>
            </div>
          </div>

          <div class="items-section">
            <div class="items-header">
              <div>الصنف</div>
              <div>الكمية</div>
              <div>السعر</div>
              <div>المجموع</div>
            </div>
            ${order.order_items?.map((item: any) => `
              <div class="item-row">
                <div>${item.menu_items?.name || 'غير محدد'}</div>
                <div>${item.quantity}</div>
                <div>${Number(item.unit_price).toFixed(2)}</div>
                <div>${Number(item.subtotal).toFixed(2)}</div>
              </div>
            `).join('')}
          </div>

          ${order.notes ? `
          <div style="margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; font-size: 12px;">
            <strong>ملاحظات:</strong><br/>
            ${order.notes}
          </div>
          ` : ''}

          <div class="totals">
            <div class="total-row final">
              <span>المجموع المدفوع:</span>
              <span>${Number(order.total_amount).toFixed(2)} د.ع</span>
            </div>
          </div>

          <div class="footer">
            <p>شكراً لزيارتكم</p>
            <p>نتمنى لكم تجربة ممتعة</p>
            <p style="margin-top: 10px; font-size: 10px;">
              ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}
            </p>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(() => window.print(), 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
  };

  const handlePayment = () => {
    if (!selectedOrderId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار طلب للدفع",
        variant: "destructive",
      });
      return;
    }

    processPaymentMutation.mutate({
      orderId: selectedOrderId,
      method: paymentMethod,
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">دفع الحساب</h1>
          <p className="text-muted-foreground mt-2">
            اختر الطلب وأتمم عملية الدفع
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">الطلبات غير المدفوعة</h2>
            
            {isLoading ? (
              <div className="text-center py-12">جاري التحميل...</div>
            ) : unpaidOrders && unpaidOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium">لا توجد طلبات غير مدفوعة</p>
                  <p className="text-sm mt-1">جميع الطلبات تم دفعها</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {unpaidOrders?.map((order: any) => (
                  <Card
                    key={order.id}
                    className={`cursor-pointer transition-all ${
                      selectedOrderId === order.id 
                        ? "ring-2 ring-primary shadow-lg" 
                        : "hover:shadow-md"
                    }`}
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            {order.restaurant_tables?.table_number && (
                              <>
                                <span>طاولة {order.restaurant_tables.table_number}</span>
                                {order.restaurant_tables.halls?.name && (
                                  <Badge variant="outline">
                                    {order.restaurant_tables.halls.name}
                                  </Badge>
                                )}
                              </>
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
                        <div className="text-left">
                          <div className="text-xl font-bold text-primary">
                            {Number(order.total_amount).toFixed(2)} د.ع
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.order_items?.length} صنف
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-sm text-muted-foreground">
                        {order.order_items?.slice(0, 2).map((item: any, idx: number) => (
                          <div key={idx}>
                            • {item.menu_items?.name} (×{item.quantity})
                          </div>
                        ))}
                        {order.order_items?.length > 2 && (
                          <div>... و {order.order_items.length - 2} أصناف أخرى</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              تفاصيل الدفع
            </h2>

            <Card>
              <CardHeader>
                <CardTitle>معلومات الدفع</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedOrder ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>اختر طلباً من القائمة لإتمام الدفع</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                      <h3 className="font-semibold">تفاصيل الطلب</h3>
                      {selectedOrder.order_items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>
                            {item.menu_items?.name} 
                            <span className="text-muted-foreground"> ×{item.quantity}</span>
                          </span>
                          <span>{Number(item.subtotal).toFixed(2)} د.ع</span>
                        </div>
                      ))}
                    </div>

                    {selectedOrder.notes && (
                      <div className="text-sm p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <strong>ملاحظات:</strong> {selectedOrder.notes}
                      </div>
                    )}

                    <Separator />

                    <div className="space-y-2">
                      <Label>طريقة الدفع</Label>
                      <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">نقدي</SelectItem>
                          <SelectItem value="card">بطاقة ائتمان</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between text-base">
                        <span>المجموع الفرعي:</span>
                        <span>{Number(selectedOrder.total_amount).toFixed(2)} د.ع</span>
                      </div>
                      <div className="flex justify-between text-xl font-bold text-primary pt-2 border-t-2">
                        <span>المبلغ الإجمالي:</span>
                        <span>{Number(selectedOrder.total_amount).toFixed(2)} د.ع</span>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handlePayment}
                      disabled={processPaymentMutation.isPending}
                    >
                      <CreditCard className="ml-2 h-5 w-5" />
                      إتمام الدفع وطباعة الفاتورة
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      سيتم إغلاق الطلب وتحرير الطاولة تلقائياً
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Payment;
