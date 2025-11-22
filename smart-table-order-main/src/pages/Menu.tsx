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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Barcode, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ImageUpload";

const Menu = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [category, setCategory] = useState("");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [isAvailable, setIsAvailable] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: menuItems, isLoading } = useQuery({
    queryKey: ["menu-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (newItem: any) => {
      const { data, error } = await supabase
        .from("menu_items")
        .insert([newItem])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      toast({
        title: "تم إضافة الصنف",
        description: "تم إضافة الصنف بنجاح",
      });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      toast({
        title: "تم حذف الصنف",
        description: "تم حذف الصنف بنجاح",
      });
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) => {
      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: isAvailable })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from("menu_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      toast({
        title: "تم تحديث الصنف",
        description: "تم تحديث بيانات الصنف بنجاح",
      });
      resetForm();
      setIsDialogOpen(false);
      setEditingItem(null);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setCost("");
    setCategory("");
    setStockQuantity("0");
    setIsAvailable(true);
    setImageUrl("");
    setEditingItem(null);
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || "");
    setPrice(item.price.toString());
    setCost(item.cost?.toString() || "0");
    setCategory(item.category || "");
    setStockQuantity(item.stock_quantity?.toString() || "0");
    setIsAvailable(item.is_available);
    setImageUrl(item.image_url || "");
    setIsDialogOpen(true);
  };

  const handleCreateItem = () => {
    const barcode = `ITEM-${Date.now()}`;
    createItemMutation.mutate({
      name,
      description,
      price: parseFloat(price),
      cost: parseFloat(cost) || 0,
      barcode,
      category,
      stock_quantity: parseInt(stockQuantity),
      is_available: isAvailable,
      image_url: imageUrl || null,
    });
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;
    
    updateItemMutation.mutate({
      id: editingItem.id,
      updates: {
        name,
        description,
        price: parseFloat(price),
        cost: parseFloat(cost) || 0,
        category,
        stock_quantity: parseInt(stockQuantity),
        is_available: isAvailable,
        image_url: imageUrl || null,
      },
    });
  };

  const handleSubmit = () => {
    if (editingItem) {
      handleUpdateItem();
    } else {
      handleCreateItem();
    }
  };

  const printBarcode = (item: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <title>طباعة باركود - ${item.name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
          }
          .barcode-container {
            text-align: center;
            border: 2px solid #333;
            padding: 20px;
            max-width: 400px;
          }
          .item-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .item-price {
            font-size: 16px;
            color: #ff6b00;
            margin-bottom: 15px;
          }
          .barcode-code {
            font-family: 'Courier New', monospace;
            font-size: 14px;
            letter-spacing: 2px;
            margin-top: 10px;
            padding: 5px;
            background: #f0f0f0;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      </head>
      <body>
        <div class="barcode-container">
          <div class="item-name">${item.name}</div>
          <div class="item-price">${item.price} د.ع</div>
          <svg id="barcode"></svg>
          <div class="barcode-code">${item.barcode}</div>
        </div>
        <script>
          JsBarcode("#barcode", "${item.barcode}", {
            format: "CODE128",
            width: 2,
            height: 60,
            displayValue: false
          });
          setTimeout(() => {
            window.print();
            window.close();
          }, 500);
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">قائمة الطعام</h1>
            <p className="text-muted-foreground mt-2">
              إدارة أصناف القائمة والأسعار
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="ml-2 h-4 w-4" />
                إضافة صنف
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? "تعديل الصنف" : "إضافة صنف جديد"}</DialogTitle>
                <DialogDescription>
                  {editingItem ? "تعديل بيانات الصنف" : "أدخل بيانات الصنف الجديد"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">اسم الصنف</Label>
                  <Input
                    id="name"
                    placeholder="مثال: بيتزا مارغريتا"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea
                    id="description"
                    placeholder="وصف الصنف..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    dir="rtl"
                  />
                </div>
                <ImageUpload
                  currentImageUrl={imageUrl}
                  onImageUploaded={(url) => setImageUrl(url)}
                  onImageRemoved={() => setImageUrl("")}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">السعر (د.ع)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost">التكلفة (د.ع)</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">الفئة</Label>
                    <Input
                      id="category"
                      placeholder="مثال: مقبلات، أطباق رئيسية"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock">الكمية المتاحة</Label>
                    <Input
                      id="stock"
                      type="number"
                      placeholder="0"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border-2 border-orange-200">
                  <Label htmlFor="available" className="text-sm font-medium cursor-pointer text-orange-900">متاح للبيع</Label>
                  <Switch
                    id="available"
                    checked={isAvailable}
                    onCheckedChange={setIsAvailable}
                    dir="ltr"
                    className="data-[state=checked]:bg-orange-600 data-[state=unchecked]:bg-gray-300"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleSubmit}
                  disabled={!name || !price || createItemMutation.isPending || updateItemMutation.isPending}
                >
                  {editingItem ? "حفظ التعديلات" : "إضافة"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12">جاري التحميل...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {menuItems?.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {item.image_url && (
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";
                      }}
                    />
                    <div className="absolute top-2 right-2">
                      <Badge 
                        variant={item.stock_quantity > 0 ? "default" : "destructive"}
                        className="bg-white/90 backdrop-blur-sm text-gray-900"
                      >
                        {item.stock_quantity > 0 ? `متوفر: ${item.stock_quantity}` : 'نفذ'}
                      </Badge>
                    </div>
                  </div>
                )}
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle>{item.name}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {item.description}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-orange-50 hover:text-orange-600"
                        onClick={() => handleEditItem(item)}
                      >
                        <Edit className="h-4 w-4 text-orange-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-red-50 hover:text-red-600"
                        onClick={() => deleteItemMutation.mutate(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">السعر:</span>
                    <span className="text-lg font-bold text-orange-600">{item.price} د.ع</span>
                  </div>
                  {item.category && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">الفئة:</span>
                      <Badge variant="outline" className="border-orange-200 text-orange-600">{item.category}</Badge>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t gap-2">
                    <div className="flex items-center space-x-2 space-x-reverse p-2 bg-orange-50 rounded-lg border border-orange-200">
                      <Switch
                        checked={item.is_available}
                        onCheckedChange={(checked) =>
                          toggleAvailabilityMutation.mutate({
                            id: item.id,
                            isAvailable: checked,
                          })
                        }
                        dir="ltr"
                        className="data-[state=checked]:bg-orange-600 data-[state=unchecked]:bg-gray-300"
                      />
                      <span className="text-sm font-medium text-orange-900">
                        {item.is_available ? "متاح" : "غير متاح"}
                      </span>
                    </div>
                    <Button variant="outline" size="sm" className="h-9 px-3" onClick={() => printBarcode(item)}>
                      <Barcode className="h-4 w-4 ml-1" />
                      <span className="text-xs">باركود</span>
                    </Button>
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

export default Menu;