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
    <div className="min-h-screen bg-gray-900 relative" dir="rtl">
      {/* Background Coffee Image with Filter */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1920&h=1080&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/95 via-neutral-900/90 to-stone-900/95"></div>
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-stone-800 animate-in fade-in slide-in-from-top duration-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer select-none group"
              onClick={handleLogoClick}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-stone-700 to-stone-600 rounded-full blur-md opacity-50 group-hover:opacity-75 transition-all duration-300 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-stone-800 to-stone-700 p-2 rounded-full border border-stone-600 group-hover:scale-110 transition-transform duration-300">
                  <Coffee className="h-7 w-7 text-stone-300 group-hover:rotate-12 transition-transform duration-300" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-stone-200 drop-shadow-lg group-hover:text-white transition-colors duration-300">
                  كافيه أورانج
                </h1>
                <p className="text-xs text-stone-400 group-hover:text-stone-300 transition-colors duration-300">القهوة الفاخرة</p>
              </div>
            </div>
            <Button 
              className="bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-600 hover:to-stone-700 text-white shadow-lg border border-stone-600 hover:scale-105 transition-all duration-300 hover:shadow-stone-700/50"
              onClick={() => navigate("/customer-menu")}
            >
              <ShoppingCart className="h-4 w-4 ml-2 animate-bounce" />
              اطلب الآن
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-4xl mx-auto text-center animate-in fade-in slide-in-from-bottom duration-1000">
            <Badge className="mb-6 bg-stone-800/80 text-stone-200 border-stone-700 backdrop-blur-sm hover:scale-105 transition-transform animate-in fade-in slide-in-from-bottom duration-700 delay-100">
              <Award className="h-3 w-3 ml-1 animate-pulse" />
              أفضل قهوة في المدينة 2025
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-2xl animate-in fade-in slide-in-from-bottom duration-1000 delay-200">
              استمتع بأفضل
              <span className="text-amber-900 inline-block hover:scale-105 transition-transform duration-300"> لحظات القهوة</span>
            </h2>
            <p className="text-xl text-stone-300 mb-10 max-w-2xl mx-auto drop-shadow-lg animate-in fade-in slide-in-from-bottom duration-1000 delay-300">
              نقدم لك تجربة قهوة استثنائية مع أجود أنواع البن المحمص طازجاً يومياً
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom duration-1000 delay-500">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-600 hover:to-stone-700 text-white text-lg py-6 px-8 shadow-2xl hover:shadow-stone-900/50 transition-all duration-300 border border-stone-600 hover:scale-105 hover:-translate-y-1"
                onClick={() => navigate("/customer-menu")}
              >
                <ShoppingCart className="h-5 w-5 ml-2" />
                استكشف القائمة
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg py-6 px-8 border-2 border-stone-600 text-stone-200 hover:bg-stone-800/50 bg-black/30 backdrop-blur-sm hover:scale-105 hover:-translate-y-1 transition-all duration-300"
                onClick={() => navigate("/customer-menu")}
              >
                <MapPin className="h-5 w-5 ml-2" />
                المواقع
              </Button>
            </div>
          </div>
        </div>
        
        {/* Floating Coffee Beans Animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 right-10 text-stone-700/20 animate-float">
            <Coffee className="h-12 w-12" />
          </div>
          <div className="absolute top-40 left-20 text-stone-700/20 animate-float-delayed">
            <Coffee className="h-16 w-16" />
          </div>
          <div className="absolute bottom-20 right-1/4 text-stone-700/20 animate-float-slow">
            <Coffee className="h-10 w-10" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 border-stone-800 bg-black/40 backdrop-blur-md hover:border-stone-700 transition-all duration-500 hover:shadow-2xl hover:shadow-stone-900/50 hover:scale-105 hover:-translate-y-2 animate-in fade-in slide-in-from-bottom delay-100">
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner border border-stone-700 group-hover:rotate-6 transition-transform duration-500">
                  <Coffee className="h-8 w-8 text-stone-300 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-stone-200 hover:text-white transition-colors duration-300">جودة عالية</h3>
                <p className="text-stone-400">قهوة محمصة طازجة من أفضل المزارع العالمية</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-stone-800 bg-black/40 backdrop-blur-md hover:border-stone-700 transition-all duration-500 hover:shadow-2xl hover:shadow-stone-900/50 hover:scale-105 hover:-translate-y-2 animate-in fade-in slide-in-from-bottom delay-300">
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner border border-stone-700 group-hover:rotate-6 transition-transform duration-500">
                  <Clock className="h-8 w-8 text-stone-300 animate-spin-slow" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-stone-200 hover:text-white transition-colors duration-300">تحضير سريع</h3>
                <p className="text-stone-400">نعدّ طلبك في دقائق معدودة بأعلى جودة</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-stone-800 bg-black/40 backdrop-blur-md hover:border-stone-700 transition-all duration-500 hover:shadow-2xl hover:shadow-stone-900/50 hover:scale-105 hover:-translate-y-2 animate-in fade-in slide-in-from-bottom delay-500">
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner border border-stone-700 group-hover:rotate-6 transition-transform duration-500">
                  <Heart className="h-8 w-8 text-stone-300 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-stone-200 hover:text-white transition-colors duration-300">صُنع بحب</h3>
                <p className="text-stone-400">كل فنجان يُصنع بعناية واهتمام خاص</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Items */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">قائمتنا</h2>
            <p className="text-stone-300 text-lg">تصفح أصناف القائمة المتوفرة</p>
          </div>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-500 mx-auto"></div>
              <p className="mt-4 text-stone-400">جاري تحميل القائمة...</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {menuItems?.map((item) => (
                  <Card 
                    key={item.id} 
                    className="group hover:shadow-2xl hover:shadow-stone-900/50 transition-all duration-300 overflow-hidden border-2 border-stone-800 bg-black/40 backdrop-blur-md hover:border-stone-700 cursor-pointer"
                    onClick={() => navigate("/customer-menu")}
                  >
                    <div className="relative overflow-hidden">
                      {item.image_url ? (
                        <>
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                              e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                        </>
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center">
                          <Coffee className="h-16 w-16 text-stone-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    <CardContent className="p-5">
                      {item.category && (
                        <Badge variant="outline" className="mb-2 text-xs border-stone-700 text-stone-300 bg-black/30">
                          {item.category}
                        </Badge>
                      )}
                      <h3 className="text-xl font-bold mb-2 text-stone-200 group-hover:text-white transition-colors">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-stone-400 mb-4 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-stone-300">
                          {Number(item.price).toFixed(2)} د.ع
                        </span>
                        <Button 
                          size="sm" 
                          className="bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-600 hover:to-stone-700 border border-stone-600"
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
                  <p className="text-stone-400">لا توجد أصناف متاحة حالياً</p>
                </div>
              )}

              <div className="text-center mt-10">
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-2 border-stone-700 text-stone-200 hover:bg-stone-800/50 bg-black/30 backdrop-blur-sm"
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
      <footer className="bg-black/60 backdrop-blur-md text-white py-12 border-t border-stone-800">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-stone-800 to-stone-700 p-2 rounded-full border border-stone-600">
                <Coffee className="h-6 w-6 text-stone-300" />
              </div>
              <h3 className="text-2xl font-bold text-stone-200">كافيه أورانج</h3>
            </div>
            <p className="text-stone-400 mb-4">القهوة الفاخرة - تجربة لا تُنسى</p>
            <div className="flex justify-center gap-6 text-stone-400">
              <p>© 2025 جميع الحقوق محفوظة</p>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
};

export default Index;
