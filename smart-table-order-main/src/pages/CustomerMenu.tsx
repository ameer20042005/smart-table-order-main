import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Plus, Minus, Search, Home, X, Camera } from "lucide-react";
import { useMenuItems, MenuItem } from "@/hooks/use-menu-items";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CartItem extends MenuItem {
  quantity: number;
}

const CustomerMenu = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { menuItems, isLoading } = useMenuItems();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [tableNumber, setTableNumber] = useState(tableId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [availableTables, setAvailableTables] = useState<any[]>([]);

  // Fetch available tables when checkout dialog opens
  useEffect(() => {
    if (showCheckoutDialog) {
      fetchAvailableTables();
    }
  }, [showCheckoutDialog]);

  const fetchAvailableTables = async () => {
    const { data, error } = await supabase
      .from("restaurant_tables")
      .select("*")
      .eq("status", "available")
      .order("table_number");

    if (error) {
      console.error("Error fetching tables:", error);
      toast.error("حدث خطأ في تحميل الطاولات");
    } else {
      setAvailableTables(data || []);
    }
  };

  // Get unique categories
  const categories = ["all", ...Array.from(new Set(menuItems?.map(item => item.category).filter(Boolean) || []))];

  // Filter menu items
  const filteredItems = menuItems?.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const hasStock = item.stock_quantity > 0;
    return matchesSearch && matchesCategory && item.is_available && hasStock;
  });

  const addToCart = (item: MenuItem) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    
    if (currentQuantity >= item.stock_quantity) {
      toast.error(`الكمية المتاحة فقط ${item.stock_quantity}`);
      return;
    }
    
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
    toast.success(`تمت إضافة ${item.name} للسلة`);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart
        .map(item => {
          if (item.id === itemId) {
            const newQuantity = item.quantity + delta;
            
            if (newQuantity > item.stock_quantity) {
              toast.error(`الكمية المتاحة فقط ${item.stock_quantity}`);
              return item;
            }
            
            return { ...item, quantity: Math.max(0, newQuantity) };
          }
          return item;
        })
        .filter(item => item.quantity > 0);
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("السلة فارغة");
      return;
    }
    setShowCheckoutDialog(true);
  };

  const confirmOrder = async () => {
    if (!tableNumber.trim()) {
      toast.error("يرجى اختيار الطاولة");
      return;
    }

    setIsSubmitting(true);

    try {
      // Find the table by name or number
      const { data: table, error: tableError } = await supabase
        .from("restaurant_tables")
        .select("id")
        .eq("table_number", tableNumber.trim())
        .eq("status", "available")
        .single();

      if (tableError || !table) {
        toast.error("الطاولة غير متاحة أو غير موجودة");
        setIsSubmitting(false);
        return;
      }

      // Calculate total
      const totalAmount = getTotalPrice();

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          table_id: table.id,
          total_amount: totalAmount,
          status: "pending"
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update table status
      await supabase
        .from("restaurant_tables")
        .update({ status: "occupied" })
        .eq("id", table.id);

      toast.success("تم تأكيد طلبك بنجاح! رقم الطلب: " + order.id.slice(0, 8));
      setCart([]);
      setShowCheckoutDialog(false);
      setTableNumber("");
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast.error("حدث خطأ أثناء تأكيد الطلب");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScanBarcode = () => {
    // في بيئة الإنتاج، يمكن استخدام مكتبة مثل html5-qrcode
    toast.info("الرجاء استخدام كاميرا الهاتف لمسح QR Code على الطاولة");
    // يمكن إضافة رابط لفتح الكاميرا أو تطبيق ماسح QR
    const qrScannerUrl = `https://api.qrserver.com/v1/read-qr-code/`;
    // أو فتح كاميرا الجهاز مباشرة
    setShowScanner(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري تحميل القائمة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
            >
              <Home className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">قائمة الطعام</h1>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {getTotalItems() > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center bg-orange-600">
                      {getTotalItems()}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle>سلة المشتريات</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingCart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">السلة فارغة</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-auto">
                        {cart.map(item => (
                          <Card key={item.id}>
                            <CardContent className="p-4">
                              <div className="flex gap-4">
                                {item.image_url && (
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-20 h-20 object-cover rounded"
                                  />
                                )}
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <h3 className="font-semibold">{item.name}</h3>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeFromCart(item.id)}
                                      className="h-6 w-6"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <p className="text-sm text-orange-600 font-semibold">
                                    {item.price.toFixed(2)} د.ع
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => updateQuantity(item.id, -1)}
                                      className="h-8 w-8"
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="w-12 text-center font-semibold">
                                      {item.quantity}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => updateQuantity(item.id, 1)}
                                      className="h-8 w-8"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-lg font-semibold">المجموع:</span>
                          <span className="text-2xl font-bold text-orange-600">
                            {getTotalPrice().toFixed(2)} د.ع
                          </span>
                        </div>
                        <Button
                          className="w-full bg-orange-600 hover:bg-orange-700"
                          size="lg"
                          onClick={handleCheckout}
                        >
                          تأكيد الطلب
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
          
          {/* Search */}
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="ابحث عن صنف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Categories */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category ? "bg-orange-600 hover:bg-orange-700" : ""}
              >
                {category === "all" ? "الكل" : category}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems?.map(item => (
            <Card key={item.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-orange-200">
              {item.image_url && (
                <div className="aspect-video overflow-hidden relative group">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  {item.stock_quantity <= 10 && item.stock_quantity > 0 && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="destructive" className="bg-red-500/90 backdrop-blur-sm">
                        كمية محدودة
                      </Badge>
                    </div>
                  )}
                </div>
              )}
              {!item.image_url && (
                <div className="aspect-video bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">لا توجد صورة</p>
                  </div>
                </div>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-lg line-clamp-1">{item.name}</CardTitle>
                {item.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                    {item.description}
                  </p>
                )}
              </CardHeader>
              <CardFooter className="flex justify-between items-center pt-0">
                <span className="text-xl font-bold text-orange-600">
                  {item.price.toFixed(2)} د.ع
                </span>
                <Button
                  onClick={() => addToCart(item)}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                  disabled={item.stock_quantity === 0}
                >
                  {item.stock_quantity === 0 ? (
                    <span className="text-sm">نفذ</span>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 ml-1" />
                      إضافة
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        {filteredItems?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">لا توجد أصناف متاحة</p>
          </div>
        )}
      </main>

      {/* Checkout Dialog */}
      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد الطلب</DialogTitle>
            <DialogDescription>
              يرجى اختيار الطاولة المتاحة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tableNumber">اختر الطاولة</Label>
              <div className="flex gap-2">
                <Select value={tableNumber} onValueChange={setTableNumber}>
                  <SelectTrigger className="flex-1" dir="rtl">
                    <SelectValue placeholder="اختر الطاولة..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTables.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        لا توجد طاولات متاحة حالياً
                      </div>
                    ) : (
                      availableTables.map((table) => (
                        <SelectItem key={table.id} value={table.table_number}>
                          <div className="flex items-center justify-between w-full">
                            <span>{table.table_number}</span>
                            <span className="text-xs text-gray-500 mr-2">
                              (سعة {table.capacity} أشخاص)
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleScanBarcode}
                  title="مسح باركود الطاولة"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                اختر الطاولة من القائمة أو اضغط على أيقونة الكاميرا لمسح الباركود
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">عدد الأصناف:</span>
                <span className="font-semibold">{getTotalItems()}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="text-gray-600">المجموع الكلي:</span>
                <span className="font-bold text-orange-600">{getTotalPrice().toFixed(2)} د.ع</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCheckoutDialog(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button
              onClick={confirmOrder}
              disabled={isSubmitting || !tableNumber}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting ? "جاري التأكيد..." : "تأكيد الطلب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerMenu;
