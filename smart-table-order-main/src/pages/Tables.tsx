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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, QrCode, Users, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Tables = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [status, setStatus] = useState<"available" | "occupied" | "reserved">("available");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tables, isLoading } = useQuery({
    queryKey: ["restaurant-tables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("*")
        .order("table_number");

      if (error) throw error;
      return data;
    },
  });

  const createTableMutation = useMutation({
    mutationFn: async (newTable: {
      table_number: string;
      capacity: number;
      status: "available" | "occupied" | "reserved";
      qr_code: string;
    }) => {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .insert([newTable])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-tables"] });
      toast({
        title: "تم إضافة الطاولة",
        description: "تم إضافة الطاولة بنجاح",
      });
      setIsDialogOpen(false);
      setTableNumber("");
      setCapacity("4");
      setStatus("available");
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("restaurant_tables")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-tables"] });
      toast({
        title: "تم حذف الطاولة",
        description: "تم حذف الطاولة بنجاح",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "available" | "occupied" | "reserved" }) => {
      const { error } = await supabase
        .from("restaurant_tables")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-tables"] });
      toast({
        title: "تم تحديث الحالة",
        description: "تم تحديث حالة الطاولة بنجاح",
      });
    },
  });

  const handleCreateTable = () => {
    const qrCode = `TABLE-${tableNumber}-${Date.now()}`;
    createTableMutation.mutate({
      table_number: tableNumber,
      capacity: parseInt(capacity),
      status,
      qr_code: qrCode,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      available: { variant: "default" as const, label: "متاحة" },
      occupied: { variant: "destructive" as const, label: "مشغولة" },
      reserved: { variant: "secondary" as const, label: "محجوزة" },
    };
    const { variant, label } = variants[status as keyof typeof variants] || variants.available;
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">إدارة الطاولات</h1>
            <p className="text-muted-foreground mt-2">
              إضافة وإدارة طاولات المطعم
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="ml-2 h-4 w-4" />
                إضافة طاولة
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>إضافة طاولة جديدة</DialogTitle>
                <DialogDescription>
                  أدخل بيانات الطاولة الجديدة
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tableNumber">رقم الطاولة</Label>
                  <Input
                    id="tableNumber"
                    placeholder="مثال: 1, A1, VIP-1"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">السعة</Label>
                  <Input
                    id="capacity"
                    type="number"
                    placeholder="4"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">الحالة</Label>
                  <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">متاحة</SelectItem>
                      <SelectItem value="occupied">مشغولة</SelectItem>
                      <SelectItem value="reserved">محجوزة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateTable}
                  disabled={!tableNumber || createTableMutation.isPending}
                >
                  إضافة
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12">جاري التحميل...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tables?.map((table) => (
              <Card key={table.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        طاولة {table.table_number}
                      </CardTitle>
                      <CardDescription>
                        السعة: {table.capacity} أشخاص
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTableMutation.mutate(table.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">الحالة:</span>
                    {getStatusBadge(table.status)}
                  </div>
                  <Select
                    value={table.status}
                    onValueChange={(value) =>
                      updateStatusMutation.mutate({ id: table.id, status: value as "available" | "occupied" | "reserved" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">متاحة</SelectItem>
                      <SelectItem value="occupied">مشغولة</SelectItem>
                      <SelectItem value="reserved">محجوزة</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    size="sm"
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (!printWindow) {
                        toast({
                          title: "خطأ",
                          description: "لا يمكن فتح نافذة الطباعة",
                          variant: "destructive",
                        });
                        return;
                      }

                      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/customer-menu/${table.table_number}`)}`;

                      printWindow.document.write(`
                        <!DOCTYPE html>
                        <html dir="rtl">
                        <head>
                          <title>QR Code - طاولة ${table.table_number}</title>
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
                            .qr-container {
                              text-align: center;
                              border: 3px solid #333;
                              padding: 30px;
                              border-radius: 10px;
                              max-width: 400px;
                            }
                            .table-title {
                              font-size: 32px;
                              font-weight: bold;
                              margin-bottom: 10px;
                              color: #ff6b00;
                            }
                            .table-number {
                              font-size: 48px;
                              font-weight: bold;
                              margin: 20px 0;
                              color: #333;
                            }
                            .qr-code {
                              margin: 20px 0;
                            }
                            .instructions {
                              font-size: 16px;
                              color: #666;
                              margin-top: 20px;
                            }
                            .capacity {
                              font-size: 18px;
                              color: #888;
                              margin-top: 10px;
                            }
                            @media print {
                              body {
                                padding: 0;
                              }
                            }
                          </style>
                        </head>
                        <body>
                          <div class="qr-container">
                            <div class="table-title">طاولة رقم</div>
                            <div class="table-number">${table.table_number}</div>
                            <div class="capacity">السعة: ${table.capacity} أشخاص</div>
                            <div class="qr-code">
                              <img src="${qrCodeUrl}" alt="QR Code" width="300" height="300">
                            </div>
                            <div class="instructions">
                              امسح الكود للوصول إلى القائمة
                            </div>
                          </div>
                          <script>
                            window.onload = () => {
                              setTimeout(() => {
                                window.print();
                              }, 500);
                            };
                          </script>
                        </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }}
                  >
                    <Printer className="ml-2 h-4 w-4" />
                    طباعة QR Code
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Tables;