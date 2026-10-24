# Software Requirements Document (SRD)
## Project: LINE LIFF Diet & Nutrition Expert Application

---

## 1. Executive Summary & Overview
แอปพลิเคชัน LINE LIFF (LINE Front-end Framework) สำหรับการควบคุมอาหาร ลดน้ำหนัก และทำหน้าที่เป็นผู้เชี่ยวชาญด้านโภชนาการส่วนบุคคล (AI Nutritionist Expert) โดยเน้นความสะดวกในการใช้งานผ่านแอปพลิเคชัน LINE ช่วยคำนวณแคลอรี ประมวลผลภาพถ่ายอาหาร ครีเอทเมนูจากวัตถุดิบในตู้เย็น เตือนภัยโรคประจำตัว (ความดัน/เบาหวาน) และแจ้งเตือนรายวันผ่าน LINE Messaging API

---

## 2. Tech Stack & Architecture Overview

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js (App Router)** | Web Application framework บน LIFF |
| **Styling** | **Tailwind CSS** | Responsive UI Design optimized for Mobile View |
| **Authentication & DB** | **Supabase (PostgreSQL)** | Auth (LINE Provider / Custom Auth) + Relational Database |
| **File Storage** | **Supabase Storage** | จัดเก็บภาพถ่ายอาหาร และภาพวัตถุดิบในตู้เย็น |
| **Messaging Platform** | **LINE Messaging API & LIFF SDK v2** | เชื่อมต่อ Rich Menu, Push/Reply Flex Messages |
| **AI Vision & LLM** | **OpenAI GPT-4o (or Gemini 1.5 Pro)** | วิเคราะห์รูปภาพอาหาร/ตู้เย็น และประมวลผลข้อความทางโภชนาการ |

---

## 3. System Architecture Workflow

```
[User on LINE] ---> Opens LIFF ---> [Next.js App + LIFF SDK v2]
                                         |
                       +-----------------+-----------------+
                       |                                   |
              [Supabase Backend]                 [AI Engine / OpenAI]
         - PostgreSQL Database                - Food Photo Vision Engine
         - Storage (Food & Fridge Photos)     - Fridge-to-Recipe Engine
         - User Profiles & Health Data        - Nutritionist Prompt Engine
                       |
             [LINE Messaging API]
         - Flex Message Daily Reports
         - Push Notifications (IF Alert / Water Reminder)
```

---

## 4. Database Schema (Supabase PostgreSQL DDL)

```sql
-- 1. Profiles Table (Health Profile & Target)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_user_id VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
    age INT NOT NULL,
    height_cm NUMERIC(5,2) NOT NULL,
    current_weight_kg NUMERIC(5,2) NOT NULL,
    target_weight_kg NUMERIC(5,2) NOT NULL,
    activity_level VARCHAR(50) CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')),
    bmr NUMERIC(6,2),
    tdee NUMERIC(6,2),
    target_calories NUMERIC(6,2),
    protein_target_g NUMERIC(5,2),
    carbs_target_g NUMERIC(5,2),
    fat_target_g NUMERIC(5,2),
    medical_conditions TEXT[] DEFAULT '{}', -- e.g., ['hypertension', 'diabetes']
    allergies TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Daily Meal Logs Table
CREATE TABLE public.meal_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    meal_type VARCHAR(20) CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    food_name VARCHAR(255) NOT NULL,
    image_url TEXT,
    calories NUMERIC(6,2) NOT NULL,
    protein_g NUMERIC(5,2) DEFAULT 0,
    carbs_g NUMERIC(5,2) DEFAULT 0,
    fat_g NUMERIC(5,2) DEFAULT 0,
    sodium_mg NUMERIC(6,2) DEFAULT 0,
    sugar_g NUMERIC(5,2) DEFAULT 0,
    warning_flags TEXT[] DEFAULT '{}', -- e.g., ['HIGH_SODIUM_WARNING', 'HIGH_SUGAR_WARNING']
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Meal Plans Table
CREATE TABLE public.meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL,
    meal_type VARCHAR(20) CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    recipe_name VARCHAR(255) NOT NULL,
    ingredients JSONB NOT NULL,
    instructions TEXT[],
    estimated_calories NUMERIC(6,2),
    estimated_protein_g NUMERIC(5,2),
    estimated_carbs_g NUMERIC(5,2),
    estimated_fat_g NUMERIC(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 5. Functional Requirements

### 5.1 Onboarding & Calorie Goal Engine
* **FR-1.1 Data Input:** ผู้ใช้กรอก เพศ, อายุ, ส่วนสูง, น้ำหนักปัจจุบัน, น้ำหนักเป้าหมาย, ระดับกิจกรรม, โรคประจำตัว (ความดัน/เบาหวาน) และประวัติแพ้อาหาร
* **FR-1.2 Calculation Logic:**
  * **BMR Calculation (Mifflin-St Jeor):**
    * *Male:* $BMR = 10 \times \text{weight} + 6.25 \times \text{height} - 5 \times \text{age} + 5$
    * *Female:* $BMR = 10 \times \text{weight} + 6.25 \times \text{height} - 5 \times \text{age} - 161$
  * **TDEE Calculation:** $TDEE = BMR \times \text{Activity Multiplier}$ (1.2 ถึง 1.9)
  * **Caloric Deficit:** $Target = TDEE - 500 \text{ kcal}$ ( safety floor: ชาย $\ge 1,500 \text{ kcal}$, หญิง $\ge 1,200 \text{ kcal}$)
  * **Macros Distribution:** Protein 30%, Carbs 45%, Fat 25%

### 5.2 AI Food Photo Scanner (Vision API)
* **FR-2.1 Photo Analysis:** ผู้ใช้ถ่ายภาพอาหาร ระบบส่งภาพไปประมวลผลผ่าน GPT-4o / Vision AI
* **FR-2.2 Data Extraction:** AI คืนค่าชื่ออาหาร, ปริมาณประมาณการ, แคลอรี, โปรตีน, คาร์บ, ไขมัน, โซเดียม, และน้ำตาล
* **FR-2.3 Medical Condition Safety Alert:**
  * หากเป็น **ความดันโลหิตสูง** และ โซเดียม $> 600\text{ mg/มื้อ}$ $\rightarrow$ แสดงเตือน `⚠️ โซเดียมสูงเกินเกณฑ์ความดัน`
  * หากเป็น **เบาหวาน** และ น้ำตาล $> 10\text{ g/มื้อ}$ $\rightarrow$ แสดงเตือน `⚠️ น้ำตาลสูงเกินเกณฑ์เบาหวาน`

### 5.3 Fridge-to-Recipe AI Engine (เมนูจากของในตู้เย็น)
* **FR-3.1 Dual Input:**
  1. ถ่ายภาพตู้เย็น/กองวัตถุดิบ ให้ AI วิเคราะห์รายชื่อวัตถุดิบอัตโนมัติ
  2. เลือกจากชิปวัตถุดิบด่วน (Quick-Select Chips) หรือพิมพ์เพิ่ม
* **FR-3.2 Recipe Generation:** ครีเอทเมนูอาหารจากวัตถุดิบที่มี โดยคำนึงถึง:
  * แคลอรีที่เหลือในโควตาวันนั้น
  * ข้อจำกัดโรคประจำตัว
  * อุปกรณ์การทำที่มี (หม้อทอดไร้น้ำมัน / ไมโครเวฟ / เตาแก๊ส)

### 5.4 AI Daily & Weekly Meal Planner
* **FR-4.1 Auto Planning:** จัดสำรับอาหาร 3 มื้อ + ของว่าง ประจำวัน/สัปดาห์
* **FR-4.2 Budget & Condition Filter:** กรองเมนูตามงบประมาณที่ตั้งไว้ และควบคุมเครื่องปรุงให้ปลอดภัยต่อผู้ป่วยโรคความดันและเบาหวาน

### 5.5 LINE Integration & Flex Messages
* **FR-5.1 Rich Menu Interface:** ทางเข้าหน้า LIFF Dashboard, AI Scanner, ตู้เย็น AI, และ AI Chat
* **FR-5.2 Flex Message Daily Summary:** ส่งสรุปการกินรายวันเข้าแชท LINE เวลา 20:00 น. แสดงแถบ Progress Bar แคลอรีและ Macros

---

## 6. Prompt Templates for AI Engine

### 6.1 Vision Food Scanner Prompt Template
```text
System: You are an expert clinical nutritionist specializing in Asian cuisine and dietary management for diabetes and hypertension.

Task: Analyze the image of food provided. Estimate the components, portion size, and nutritional values.

Constraints:
1. Return strictly a JSON object without markdown formatting.
2. Check against user's health conditions: {{USER_CONDITIONS}}.
3. If sodium > 600mg, flag "HIGH_SODIUM_WARNING".
4. If sugar > 10g, flag "HIGH_SUGAR_WARNING".

Output JSON Format:
{
  "food_name": "string",
  "portion_estimate": "string",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "sodium_mg": number,
  "sugar_g": number,
  "warning_flags": ["string"],
  "health_advice": "string (1 short friendly sentence in Thai)"
}
```

### 6.2 Fridge-to-Recipe AI Prompt Template
```text
System: You are a creative Thai chef and precision nutritionist.

Task: Generate a healthy recipe using ONLY or PRIMARILY the provided available ingredients.

Input Parameters:
- Available Ingredients: {{INGREDIENTS_LIST}}
- Remaining Calorie Budget Today: {{REMAINING_CALORIES}} kcal
- Medical Conditions: {{USER_CONDITIONS}}
- Cooking Equipment: {{COOKING_EQUIPMENT}}

Output JSON Format:
{
  "recipe_name": "string",
  "used_ingredients": ["string"],
  "missing_optional_ingredients": ["string"],
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "cooking_time_mins": number,
  "instructions": ["string (step by step)"],
  "medical_safety_note": "string in Thai"
}
```

---

## 7. UX/UI Screen Flow for LIFF App

```
[LINE Chat / Rich Menu]
        │
        ├──► 1. Onboarding Screen (ถ้าเพิ่งเปิดครั้งแรก)
        │       └── กรอก Weight, Goal, Medical Conditions ──► คำนวณ BMR/TDEE
        │
        ├──► 2. Dashboard Screen (หน้าหลัก)
        │       ├── Calorie Counter Gauge (เป้าหมาย vs ที่กินไป)
        │       ├── Macros Bar (Protein, Carbs, Fat)
        │       └── Quick Actions: [สแกนอาหาร] [จัดเมนูตู้เย็น]
        │
        ├──► 3. AI Food Scanner Screen
        │       ├── Camera / Upload Button
        │       └── Result Card (แคลอรี + คำเตือนโซเดียม/น้ำตาล + ปุ่ม Save)
        │
        └──► 4. Fridge-to-Recipe Screen
                ├── Camera Scan Fridge / Ingredient Chips Select
                └── AI Recipe Suggestions Card + Cooking Steps
```

---

## 8. Phase 2 & Advanced Features Roadmap

1. **Smart Grocery Shopping List:** แปลงเมนูอาหารประจำสัปดาห์เป็นเช็คลิสต์ซื้อของที่ซูเปอร์มาร์เก็ต
2. **Intermittent Fasting (IF) Timer:** ระบบจับเวลาอดอาหาร 16/8 พร้อมแจ้งเตือนเริ่ม/เลิกกิน ผ่าน LINE Push Message
3. **Thai Convenience Store Barcode Scanner:** สแกนบาร์โค้ดสินค้าในร้านสะดวกซื้อ (เซเว่น) เพื่อเช็คแคลอรีและสารอาหาร
4. **Health API Integration:** เชื่อมต่อ Apple Health / Google Fit เพื่อดึงก้าวเดินมาปรับเพิ่มโควตา TDEE แบบเรียลไทม์
5. **Gamification & Streak System:** สะสมแต้มและบันทึก Streak การส่งรูปอาหาร/คุมแคลอรีต่อเนื่อง