import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Coffee, Award, Clock, MapPin, Star, Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  const { data: menuItems, isLoading } = useQuery({
    queryKey: ["featured-menu-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("is_available", true)
        .order("name")
        .limit(8);

      if (error) throw error;
      return data;
    },
  });

  const handleLogoClick = () => {
    const now = Date.now();
    
    // Reset counter if more than 2 seconds passed since last click
    if (now - lastClickTime > 2000) {
      setClickCount(1);
    } else {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      
      // Navigate to auth after 7 clicks
      if (newCount === 7) {
        navigate("/auth");
        setClickCount(0);
      }
    }
    
    setLastClickTime(now);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-amber-100">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer select-none group"
              onClick={handleLogoClick}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-400 rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-gradient-to-br from-orange-500 to-amber-500 p-2 rounded-full">
                  <Coffee className="h-7 w-7 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  كافيه أورانج
                </h1>
                <p className="text-xs text-gray-500">القهوة الفاخرة</p>
              </div>
            </div>
            <Button 
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg"
              onClick={() => navigate("/customer-menu")}
            >
              <ShoppingCart className="h-4 w-4 ml-2" />
              اطلب الآن
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-100/50 to-amber-100/50"></div>
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-orange-100 text-orange-700 border-orange-200">
              <Award className="h-3 w-3 ml-1" />
              أفضل قهوة في المدينة 2025
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              استمتع بأفضل
              <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent"> لحظات القهوة</span>
            </h2>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              نقدم لك تجربة قهوة استثنائية مع أجود أنواع البن المحمص طازجاً يومياً
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-lg py-6 px-8 shadow-xl hover:shadow-2xl transition-all"
                onClick={() => navigate("/customer-menu")}
              >
                <ShoppingCart className="h-5 w-5 ml-2" />
                استكشف القائمة
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg py-6 px-8 border-2 border-orange-500 text-orange-600 hover:bg-orange-50"
                onClick={() => navigate("/customer-menu")}
              >
                <MapPin className="h-5 w-5 ml-2" />
                المواقع
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 border-orange-100 hover:border-orange-300 transition-all hover:shadow-xl">
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <Coffee className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">جودة عالية</h3>
                <p className="text-gray-600">قهوة محمصة طازجة من أفضل المزارع العالمية</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-100 hover:border-orange-300 transition-all hover:shadow-xl">
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">تحضير سريع</h3>
                <p className="text-gray-600">نعدّ طلبك في دقائق معدودة بأعلى جودة</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-100 hover:border-orange-300 transition-all hover:shadow-xl">
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <Heart className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">صُنع بحب</h3>
                <p className="text-gray-600">كل فنجان يُصنع بعناية واهتمام خاص</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Items */}
      <section className="py-16 bg-gradient-to-b from-white to-amber-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">قائمتنا</h2>
            <p className="text-gray-600 text-lg">تصفح أصناف القائمة المتوفرة</p>
          </div>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">جاري تحميل القائمة...</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {menuItems?.map((item) => (
                  <Card 
                    key={item.id} 
                    className="group hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-orange-200 cursor-pointer"
                    onClick={() => navigate("/customer-menu")}
                  >
                    <div className="relative overflow-hidden">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";
                          }}
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                          <Coffee className="h-16 w-16 text-orange-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    <CardContent className="p-5">
                      {item.category && (
                        <Badge variant="outline" className="mb-2 text-xs border-orange-200 text-orange-600">
                          {item.category}
                        </Badge>
                      )}
                      <h3 className="text-xl font-bold mb-2 text-gray-900 group-hover:text-orange-600 transition-colors">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-orange-600">
                          {Number(item.price).toFixed(2)} د.ع
                        </span>
                        <Button 
                          size="sm" 
                          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/customer-menu");
                          }}
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {menuItems && menuItems.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">لا توجد أصناف متاحة حالياً</p>
                </div>
              )}

              <div className="text-center mt-10">
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-2 border-orange-500 text-orange-600 hover:bg-orange-50"
                  onClick={() => navigate("/customer-menu")}
                >
                  عرض القائمة الكاملة
                </Button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-12 border-t border-gray-700">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-2 rounded-full">
                <Coffee className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold">كافيه أورانج</h3>
            </div>
            <p className="text-gray-400 mb-4">القهوة الفاخرة - تجربة لا تُنسى</p>
            <div className="flex justify-center gap-6 text-gray-400">
              <p>© 2025 جميع الحقوق محفوظة</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
