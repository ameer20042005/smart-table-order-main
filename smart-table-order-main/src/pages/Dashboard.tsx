import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UtensilsCrossed, ShoppingCart, DollarSign, TrendingUp, TrendingDown, Clock, Package, AlertCircle, Download, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { exportToExcel, exportToCSV } from "@/lib/export-utils";
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { ar } from "date-fns/locale";

const Dashboard = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "year">("today");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    };
    checkAuth();
  }, [navigate]);

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "week":
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "year":
        return { start: startOfYear(now), end: endOfYear(now) };
    }
  };

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", dateRange],
    queryFn: async () => {
      const { start, end } = getDateFilter();
      
      const [tablesRes, itemsRes, ordersRes, lowStockRes, completedOrdersRes] = await Promise.all([
        supabase.from("restaurant_tables").select("*", { count: "exact" }),
        supabase.from("menu_items").select("*", { count: "exact" }),
        supabase.from("orders").select("*").eq("status", "pending"),
        supabase.from("menu_items").select("*").lte("stock_quantity", 10),
        supabase
          .from("orders")
          .select("id, total_amount")
          .eq("status", "completed")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString()),
      ]);

      const availableTables = tablesRes.data?.filter(t => t.status === "available").length || 0;
      const totalTables = tablesRes.count || 0;
      const totalItems = itemsRes.count || 0;
      const activeOrders = ordersRes.data?.length || 0;
      const lowStock = lowStockRes.data?.length || 0;
      const completedOrders = completedOrdersRes.data?.length || 0;

      // Calculate revenue, costs and profit from completed orders
      let revenue = 0;
      let totalCost = 0;

      if (completedOrdersRes.data?.length) {
        const { data: orderItems } = await supabase
          .from("order_items")
          .select(`
            quantity,
            unit_price,
            subtotal,
            menu_items(cost)
          `)
          .in('order_id', completedOrdersRes.data.map(o => o.id));

        // Calculate revenue from order items subtotals
        revenue = orderItems?.reduce((sum, item: any) => {
          return sum + Number(item.subtotal || 0);
        }, 0) || 0;

        // Calculate total cost from menu items cost
        totalCost = orderItems?.reduce((sum, item: any) => {
          return sum + (item.quantity * Number(item.menu_items?.cost || 0));
        }, 0) || 0;
      }

      const profit = revenue - totalCost;

      return {
        availableTables,
        totalTables,
        totalItems,
        activeOrders,
        revenue,
        profit,
        totalCost,
        lowStock,
        completedOrders,
        profitMargin: revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0,
      };
    },
  });

  const { data: topItems } = useQuery({
    queryKey: ["top-items", dateRange],
    queryFn: async () => {
      const { start, end } = getDateFilter();
      
      const { data: completedOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("status", "completed")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      if (!completedOrders?.length) return [];

      const { data } = await supabase
        .from("order_items")
        .select(`
          quantity,
          menu_item_id,
          menu_items(name, price)
        `)
        .in('order_id', completedOrders.map(o => o.id));

      const itemSales: any = {};
      data?.forEach((item: any) => {
        const id = item.menu_item_id;
        if (!itemSales[id]) {
          itemSales[id] = {
            name: item.menu_items?.name || "Unknown",
            quantity: 0,
            revenue: 0,
            cost: 0,
          };
        }
        itemSales[id].quantity += item.quantity;
        itemSales[id].revenue += item.quantity * (item.menu_items?.price || 0);
      });

      // Calculate cost and profit for each item
      const itemsWithProfit = await Promise.all(
        Object.values(itemSales).map(async (item: any) => {
          const { data: menuItem } = await supabase
            .from("menu_items")
            .select("cost")
            .eq("name", item.name)
            .single();
          
          const costPerUnit = Number(menuItem?.cost || 0);
          item.cost = item.quantity * costPerUnit;
          item.profit = item.revenue - item.cost;
          return item;
        })
      );

      return itemsWithProfit
        .sort((a: any, b: any) => b.quantity - a.quantity)
        .slice(0, 5);
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["recent-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select(`
          id,
          created_at,
          status,
          total_amount,
          restaurant_tables(table_number)
        `)
        .order("created_at", { ascending: false })
        .limit(15);

      return data;
    },
  });

  const statCards = [
    {
      title: "الإيرادات",
      value: `${(stats?.revenue || 0).toFixed(2)} د.ع`,
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      trend: "+12%",
      trendUp: true,
    },
    {
      title: "الأرباح",
      value: `${(stats?.profit || 0).toFixed(2)} د.ع`,
      icon: TrendingUp,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      trend: `هامش ${stats?.profitMargin}%`,
      trendUp: true,
    },
    {
      title: "الطلبات المكتملة",
      value: stats?.completedOrders || 0,
      icon: ShoppingCart,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      trend: "طلب",
      trendUp: true,
    },
    {
      title: "الطاولات المتاحة",
      value: `${stats?.availableTables || 0}/${stats?.totalTables || 0}`,
      icon: Users,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "الطلبات النشطة",
      value: stats?.activeOrders || 0,
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "تنبيهات المخزون",
      value: stats?.lowStock || 0,
      icon: AlertCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
  ];

  const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

  const handleExport = async (type: "excel" | "csv") => {
    if (dateRange === "month" || dateRange === "week" || dateRange === "year") {
      // Export daily breakdown for the selected period
      const { start, end } = getDateFilter();
      const dailyData = [];
      
      // Loop through each day in the period
      let currentDay = new Date(start);
      while (currentDay <= end) {
        const dayStart = startOfDay(currentDay);
        const dayEnd = endOfDay(currentDay);
        
        const { data: completedOrders } = await supabase
          .from("orders")
          .select("id, total_amount")
          .eq("status", "completed")
          .gte("created_at", dayStart.toISOString())
          .lte("created_at", dayEnd.toISOString());

        let revenue = 0;
        let totalCost = 0;

        if (completedOrders?.length) {
          const { data: orderItems } = await supabase
            .from("order_items")
            .select(`
              quantity,
              unit_price,
              subtotal,
              menu_items(cost)
            `)
            .in('order_id', completedOrders.map(o => o.id));

          revenue = orderItems?.reduce((sum, item: any) => {
            return sum + Number(item.subtotal || 0);
          }, 0) || 0;

          totalCost = orderItems?.reduce((sum, item: any) => {
            return sum + (item.quantity * Number(item.menu_items?.cost || 0));
          }, 0) || 0;
        }

        const profit = revenue - totalCost;

        dailyData.push({
          "التاريخ": format(currentDay, "yyyy-MM-dd", { locale: ar }),
          "اليوم": format(currentDay, "EEEE", { locale: ar }),
          "الإيرادات (د.ع)": revenue.toFixed(2),
          "التكاليف (د.ع)": totalCost.toFixed(2),
          "الأرباح (د.ع)": profit.toFixed(2),
          "هامش الربح %": revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0",
          "عدد الطلبات": completedOrders?.length || 0,
        });

        currentDay = new Date(currentDay.setDate(currentDay.getDate() + 1));
      }

      const periodName = dateRange === "week" ? "أسبوعي" : dateRange === "month" ? "شهري" : "سنوي";
      const fileName = `تقرير_${periodName}_${format(new Date(), "yyyy-MM-dd")}`;
      exportToExcel(dailyData, fileName);
    } else {
      // Export summary for today only
      const data = [
        {
          "الفترة": "اليوم",
          "الإيرادات": stats?.revenue || 0,
          "التكاليف": stats?.totalCost || 0,
          "الأرباح": stats?.profit || 0,
          "هامش الربح": `${stats?.profitMargin}%`,
          "الطلبات المكتملة": stats?.completedOrders || 0,
        },
      ];

      const fileName = `تقرير_${format(new Date(), "yyyy-MM-dd")}`;
      
      if (type === "excel") {
        exportToExcel(data, fileName);
      } else {
        exportToCSV(data, fileName);
      }
    }
  };

  const handleExportOrders = async (period: "today" | "week" | "month") => {
    const now = new Date();
    let start: Date, end: Date, periodName: string;
    
    switch (period) {
      case "today":
        start = startOfDay(now);
        end = endOfDay(now);
        periodName = "اليوم";
        break;
      case "week":
        start = startOfDay(subDays(now, 7));
        end = endOfDay(now);
        periodName = "الأسبوع";
        break;
      case "month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        periodName = "الشهر";
        break;
    }

    const { data: completedOrders } = await supabase
      .from("orders")
      .select(`
        id,
        created_at,
        completed_at,
        total_amount,
        table_id,
        restaurant_tables(table_number, halls(name))
      `)
      .eq("status", "completed")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false });

    if (!completedOrders?.length) {
      alert(`لا توجد طلبات مكتملة في ${periodName}`);
      return;
    }

    const ordersWithDetails = await Promise.all(
      completedOrders.map(async (order) => {
        const { data: orderItems } = await supabase
          .from("order_items")
          .select(`
            quantity,
            unit_price,
            subtotal,
            menu_items(name, cost)
          `)
          .eq("order_id", order.id);

        const itemsText = orderItems?.map((item: any) => 
          `${item.menu_items?.name} (${item.quantity}×${item.unit_price} د.ع)`
        ).join(", ") || "";

        const totalCost = orderItems?.reduce((sum, item: any) => 
          sum + (item.quantity * Number(item.menu_items?.cost || 0)), 0
        ) || 0;

        const profit = Number(order.total_amount) - totalCost;

        return {
          "رقم الطلب": order.id.substring(0, 8),
          "التاريخ والوقت": format(new Date(order.created_at), "PPp", { locale: ar }),
          "نوع الطلب": order.table_id ? "صالة" : "توصيل",
          "الطاولة": order.restaurant_tables?.table_number || "-",
          "الصالة": order.restaurant_tables?.halls?.name || "-",
          "الأصناف": itemsText,
          "الإيرادات (د.ع)": Number(order.total_amount).toFixed(2),
          "التكاليف (د.ع)": totalCost.toFixed(2),
          "الأرباح (د.ع)": profit.toFixed(2),
        };
      })
    );

    const fileName = `طلبات_${periodName}_${format(now, "yyyy-MM-dd")}`;
    exportToExcel(ordersWithDetails, fileName);
  };

  return (
    <Layout>
      <div className="space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">لوحة التحكم</h1>
            <p className="text-muted-foreground mt-2">نظرة عامة على أداء المطعم</p>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="week">أسبوع</SelectItem>
                <SelectItem value="month">شهر</SelectItem>
                <SelectItem value="year">سنة</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => handleExportOrders("today")}>
              <Download className="h-4 w-4 ml-2" />
              طلبات اليوم
            </Button>
            <Button variant="outline" onClick={() => handleExportOrders("week")}>
              <Download className="h-4 w-4 ml-2" />
              طلبات الأسبوع
            </Button>
            <Button variant="outline" onClick={() => handleExportOrders("month")}>
              <Download className="h-4 w-4 ml-2" />
              طلبات الشهر
            </Button>
            <Button variant="outline" onClick={() => handleExport("excel")}>
              <Download className="h-4 w-4 ml-2" />
              تقرير الفترة
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.trend && (
                  <div className="flex items-center gap-1 text-sm mt-1">
                    {stat.trendUp ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={stat.trendUp ? "text-green-500" : "text-red-500"}>
                      {stat.trend}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>أفضل الأصناف</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={topItems || []}
                    dataKey="quantity"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={90}
                    label={false}
                  >
                    {topItems?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [value, "الكمية"]}
                    labelFormatter={(label) => `الصنف: ${label}`}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={60}
                    wrapperStyle={{ paddingTop: "20px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الطلبات الأخيرة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                {recentOrders?.map((order: any) => (
                  <div key={order.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-semibold">
                        {order.restaurant_tables?.table_number 
                          ? `طاولة ${order.restaurant_tables.table_number}` 
                          : "طلب توصيل"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), "PPp", { locale: ar })}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-green-600">
                        {Number(order.total_amount).toFixed(2)} د.ع
                      </p>
                      <p className="text-xs text-muted-foreground">{order.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>إيرادات الأصناف الأعلى مبيعاً</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={topItems || []} margin={{ top: 20, right: 30, left: 60, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={0}
                  height={60}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis width={80} />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === "الإيرادات (د.ع)" || name === "الأرباح (د.ع)") {
                      return [`${Number(value).toFixed(2)} د.ع`, name];
                    }
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#FF6B6B" name="الإيرادات (د.ع)" />
                <Bar dataKey="profit" fill="#4ECDC4" name="الأرباح (د.ع)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;