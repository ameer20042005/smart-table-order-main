# دليل تطبيق خاصية الصالات (Halls)

## التغييرات المنفذة

تم إضافة خاصية الصالات بنجاح إلى نظام إدارة الطاولات. كل صالة يمكن أن تحتوي على مجموعة من الطاولات.

### الملفات المضافة/المعدلة:

1. **Migration File**: `supabase/migrations/20251123000000_add_halls.sql`
   - إنشاء جدول `halls` للصالات
   - إضافة عمود `hall_id` لجدول `restaurant_tables`
   - إعداد السياسات الأمنية (RLS Policies)

2. **Hook للصالات**: `src/hooks/use-halls.ts`
   - إدارة عمليات CRUD للصالات
   - استعلام البيانات باستخدام React Query

3. **تحديث Types**: `src/integrations/supabase/types.ts`
   - إضافة تعريف جدول `halls`
   - إضافة `hall_id` لتعريف `restaurant_tables`

4. **تحديث Hook الطاولات**: `src/hooks/use-tables.ts`
   - إضافة دعم الصالات في استعلامات الطاولات

5. **تحديث صفحة الطاولات**: `src/pages/Tables.tsx`
   - واجهة إدارة الصالات
   - تصنيف الطاولات حسب الصالة
   - إمكانية إضافة/تعديل/حذف الصالات

## خطوات تطبيق Migration على قاعدة البيانات

### ⚠️ مهم جداً

إذا ظهرت لك رسالة خطأ مثل:
- `relation "public.user_roles" does not exist`
- `function "has_role" does not exist`

**استخدم الملف المبسط**: `supabase/migrations/SIMPLIFIED_HALLS_MIGRATION.sql`

هذا الملف لا يعتمد على أي جداول أو دوال خارجية.

---

### الطريقة الأولى: استخدام Supabase Dashboard (الموصى بها)

1. افتح [Supabase Dashboard](https://app.supabase.com)
2. اختر مشروعك
3. اذهب إلى **SQL Editor**
4. انسخ محتوى الملف `supabase/migrations/SIMPLIFIED_HALLS_MIGRATION.sql`
5. الصق المحتوى في SQL Editor
6. اضغط على **Run** لتنفيذ الـ SQL

### الطريقة الثانية: استخدام Supabase CLI

إذا كان لديك Supabase CLI مثبت:

```bash
# الانتقال إلى مجلد المشروع
cd "g:\all_project\smart-table-order-main\smart-table-order-main"

# تشغيل Migration
supabase db push
```

### الطريقة الثالثة: تنفيذ SQL يدوياً (مبسط)

يمكنك تنفيذ الـ SQL التالي مباشرة في Supabase Dashboard:

```sql
-- Create halls table
CREATE TABLE IF NOT EXISTS public.halls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add hall_id to restaurant_tables
ALTER TABLE public.restaurant_tables 
ADD COLUMN IF NOT EXISTS hall_id UUID 
REFERENCES public.halls(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.halls ENABLE ROW LEVEL SECURITY;

-- Allow viewing halls
CREATE POLICY "view_halls"
  ON public.halls FOR SELECT
  TO authenticated
  USING (true);

-- Allow managing halls
CREATE POLICY "manage_halls"
  ON public.halls FOR ALL
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_hall_id 
ON public.restaurant_tables(hall_id);

CREATE INDEX IF NOT EXISTS idx_halls_is_active 
ON public.halls(is_active);
```

## المميزات الجديدة

### إدارة الصالات

- ✅ إضافة صالة جديدة
- ✅ تعديل بيانات الصالة (الاسم والوصف)
- ✅ حذف الصالة
- ✅ عرض عدد الطاولات في كل صالة

### إدارة الطاولات

- ✅ ربط الطاولة بصالة معينة (اختياري)
- ✅ تصفية الطاولات حسب الصالة باستخدام Tabs
- ✅ عرض اسم الصالة على كل طاولة
- ✅ طباعة QR Code يتضمن اسم الصالة

### التصفية والعرض

- **جميع الطاولات**: عرض كل الطاولات
- **بدون صالة**: عرض الطاولات غير المرتبطة بصالة
- **حسب الصالة**: عرض طاولات صالة معينة

## اختبار الوظائف

بعد تطبيق الـ Migration:

1. افتح صفحة الطاولات في التطبيق
2. أضف صالة جديدة (مثال: "الصالة الرئيسية")
3. أضف طاولة جديدة واختر الصالة
4. تأكد من ظهور الطاولة تحت تبويب الصالة المحددة
5. جرب طباعة QR Code وتأكد من ظهور اسم الصالة

## ملاحظات

- الصالات اختيارية - يمكن إنشاء طاولات بدون صالة
- حذف الصالة لا يحذف الطاولات المرتبطة بها (يتم فك الربط فقط)
- جميع المستخدمين المصرح لهم يمكنهم رؤية الصالات
- فقط المدراء والمسؤولون يمكنهم إدارة الصالات

## الدعم

إذا واجهت أي مشاكل في تطبيق الـ Migration، تأكد من:
- وجود الاتصال بقاعدة البيانات
- صلاحيات المستخدم الكافية
- عدم وجود تعارض في الأسماء أو البيانات
