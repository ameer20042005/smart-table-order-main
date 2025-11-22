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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Plus, Minus, Trash2, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock_quantity: number;
}

const POS = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [orderType, setOrderType] = useState<"dine-in" | "delivery">("dine-in");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "qr_code" | "barcode">("cash");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tables } = useQuery({
    queryKey: ["available-tables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("status", "available")
        .order("table_number");

      if (error) throw error;
      return data;
    },
  });

  const { data: menuItems } = useQuery({
    queryKey: ["available-menu-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("is_available", true)
        .gt("stock_quantity", 0)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: {
      table_id: string | null;
      order_items: { menu_item_id: string; quantity: number; unit_price: number; subtotal: number }[];
      payment_method: "cash" | "card" | "qr_code" | "barcode";
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("يجب تسجيل الدخول");

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([{
          table_id: orderData.table_id,
          waiter_id: user.id,
          status: "pending",
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Add order items
      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(
          orderData.order_items.map(item => ({
            ...item,
            order_id: order.id,
          }))
        );

      if (itemsError) throw itemsError;

      // Create payment
      const total = orderData.order_items.reduce((sum, item) => sum + item.subtotal, 0);
      const { error: paymentError } = await supabase
        .from("payments")
        .insert([{
          order_id: order.id,
          amount: total,
          payment_method: orderData.payment_method,
          cashier_id: user.id,
        }]);

      if (paymentError) throw paymentError;

      // Update table status if applicable
      if (orderData.table_id) {
        await supabase
          .from("restaurant_tables")
          .update({ status: "occupied" })
          .eq("id", orderData.table_id);
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["available-tables"] });
      toast({
        title: "تم إنشاء الطلب",
        description: "تم إنشاء الطلب والدفع بنجاح",
      });
      setCart([]);
      setSelectedTable("");
      setOrderType("dine-in");
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addToCart = (item: any) => {
    const existingItem = cart.find(ci => ci.id === item.id);
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    
    if (currentQuantity >= item.stock_quantity) {
      toast({
        title: "غير متوفر",
        description: `الكمية المتاحة فقط ${item.stock_quantity}`,
        variant: "destructive",
      });
      return;
    }
    
    if (existingItem) {
      setCart(cart.map(ci =>
        ci.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
      ));
    } else {
      setCart([...cart, { id: item.id, name: item.name, price: Number(item.price), quantity: 1, stock_quantity: item.stock_quantity }]);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = item.quantity + delta;
        
        // Check if trying to exceed stock
        if (newQuantity > item.stock_quantity) {
          toast({
            title: "غير متوفر",
            description: `الكمية المتاحة فقط ${item.stock_quantity}`,
            variant: "destructive",
          });
          return item;
        }
        
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: "خطأ",
        description: "السلة فارغة",
        variant: "destructive",
      });
      return;
    }

    if (orderType === "dine-in" && !selectedTable) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار الطاولة للطلب في الصالة",
        variant: "destructive",
      });
      return;
    }

    const orderItems = cart.map(item => ({
      menu_item_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      subtotal: item.price * item.quantity,
    }));

    createOrderMutation.mutate({
      table_id: orderType === "dine-in" ? selectedTable : null,
      order_items: orderItems,
      payment_method: paymentMethod,
    });
  };

  return (
    <Layout>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">القائمة</h2>
          <div className="grid gap-3">
            {menuItems?.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => addToCart(item)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-3">
                    {item.image_url && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <CardDescription className="line-clamp-1">
                        {item.description}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge>{Number(item.price).toFixed(2)} د.ع</Badge>
                      {item.stock_quantity <= 10 && (
                        <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                          متبقي {item.stock_quantity}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            السلة
          </h2>

          <Card>
            <CardHeader>
              <CardTitle>تفاصيل الطلب</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>نوع الطلب</Label>
                <Select value={orderType} onValueChange={(value: any) => {
                  setOrderType(value);
                  if (value === "delivery") {
                    setSelectedTable("");
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dine-in">طلب في الصالة</SelectItem>
                    <SelectItem value="delivery">طلب توصيل</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {orderType === "dine-in" && (
                <div className="space-y-2">
                  <Label>الطاولة</Label>
                  <Select value={selectedTable} onValueChange={setSelectedTable}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الطاولة" />
                    </SelectTrigger>
                    <SelectContent>
                      {tables?.map((table) => (
                        <SelectItem key={table.id} value={table.id}>
                          طاولة {table.table_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    السلة فارغة
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.price.toFixed(2)} د.ع
                        </p>
                        <p className="text-xs text-gray-500">
                          متوفر: {item.stock_quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>طريقة الدفع</Label>
                <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="card">بطاقة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-bold">
                <span>المجموع:</span>
                <span>{total.toFixed(2)} د.ع</span>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={cart.length === 0 || createOrderMutation.isPending}
              >
                <CreditCard className="ml-2 h-5 w-5" />
                إتمام الدفع
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default POS;