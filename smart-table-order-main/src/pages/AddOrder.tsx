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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Plus, Minus, Trash2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock_quantity: number;
}

const AddOrder = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [orderType, setOrderType] = useState<"dine-in" | "delivery">("dine-in");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tables } = useQuery({
    queryKey: ["available-tables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select(`
          *,
          halls (
            id,
            name
          )
        `)
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
      notes: string;
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
          notes: orderData.notes || null,
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
        description: "تم إضافة الطلب بنجاح وفي انتظار التحضير",
      });
      setCart([]);
      setSelectedTable("");
      setOrderType("dine-in");
      setNotes("");
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

  const handleCreateOrder = () => {
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
      notes: notes,
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">إضافة طلب جديد</h1>
          <p className="text-muted-foreground mt-2">
            اختر الأصناف وأضف الطلب (سيتم الدفع لاحقاً)
          </p>
        </div>

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
              تفاصيل الطلب
            </h2>

            <Card>
              <CardHeader>
                <CardTitle>بيانات الطلب</CardTitle>
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
                        {tables?.map((table: any) => (
                          <SelectItem key={table.id} value={table.id}>
                            طاولة {table.table_number}
                            {table.halls && ` - ${table.halls.name}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>ملاحظات (اختياري)</Label>
                  <Textarea
                    placeholder="أي ملاحظات خاصة بالطلب..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  {cart.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      السلة فارغة
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.price.toFixed(2)} د.ع × {item.quantity} = {(item.price * item.quantity).toFixed(2)} د.ع
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>المجموع:</span>
                  <span>{total.toFixed(2)} د.ع</span>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCreateOrder}
                  disabled={cart.length === 0 || createOrderMutation.isPending}
                >
                  <Check className="ml-2 h-5 w-5" />
                  إضافة الطلب
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  سيتم إضافة الطلب بدون دفع، يمكن الدفع لاحقاً من صفحة الدفع
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AddOrder;
