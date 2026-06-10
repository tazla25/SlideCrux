# SlideCrux Deployment Guide 🚀

যেহেতু আপনার Termux এ স্টোরেজের একটু সমস্যা আছে (2.24 GB হয়ে গেছে), তাই একবারে সব ফাইল GitHub-এ push করতে গেলে Git ক্র্যাশ করতে পারে বা মেমরি এরর দিতে পারে। তাই আমরা **ধাপে ধাপে (chunks)** ফাইল পুশ করব। 

নিচে GitHub, Vercel এবং Supabase সেটআপ করার পুরো স্টেপ-বাই-স্টেপ প্রোসেস দেওয়া হলো:

---

## 🟢 Step 1: GitHub এ ফাইল পুশ করা (ছোট ছোট ভাগে)

প্রথমে আপনার প্রোজেক্টের রুটে (`/sdcard/documents/obsidian/My_SaaS_Project/SlideCrux/`) গিট ইনিশিয়ালাইজ করুন (যদি করা না থাকে):

```bash
cd /sdcard/documents/obsidian/My_SaaS_Project/SlideCrux
git init
```

**১.১. .gitignore নিশ্চিত করা**
খুব জরুরি! আপনার রুটে এবং `apps/web/` ফোল্ডারে `.gitignore` ফাইল থাকতে হবে যাতে `node_modules` বা `dist` গিটহাবে না যায়।

```bash
# শুধুমাত্র কনফিগারেশন ফাইলগুলো অ্যাড করুন (Chunk 1)
git add package.json package-lock.json vercel.json README.md OPERATIONS.md COSTS.md
git add apps/web/package.json apps/web/vite.config.js apps/web/index.html
git commit -m "chore: initial config files and docs"

git branch -M main
git remote add origin https://github.com/আপনার-ইউজারনেম/আপনার-রেপো.git
git push -u origin main
```

**১.২. Supabase ফোল্ডার পুশ করা (Chunk 2)**
```bash
git add supabase/
git commit -m "feat: supabase migrations and edge functions"
git push
```

**১.৩. Frontend (Components, Lib, Data) পুশ করা (Chunk 3)**
```bash
git add apps/web/src/components/ apps/web/src/lib/ apps/web/src/data/ apps/web/src/index.css
git commit -m "feat: frontend components, data, and libraries"
git push
```

**১.৪. Frontend (Pages & App) পুশ করা (Chunk 4)**
```bash
git add apps/web/src/pages/ apps/web/src/App.jsx apps/web/src/main.jsx
git commit -m "feat: frontend pages and routing"
git push
```

*(এভাবে ভাগ করে পুশ করলে Termux এ RAM বা স্টোরেজ ক্র্যাশ করবে না।)*

---

## 🔵 Step 2: Supabase সেটআপ (Backend & Database)

**২.১. ডাটাবেস টেবিল তৈরি (Migrations)**
Supabase ড্যাশবোর্ডে লগইন করে আপনার প্রজেক্টের **SQL Editor** এ যান।
আমাদের `supabase/migrations/` ফোল্ডারের ভেতরে ৩টি ফাইল আছে:
1. `001_initial_schema.sql`
2. `002_subscriptions_update.sql`
3. `003_brand_kits.sql`
এই তিনটির কোড কপি করে একটার পর একটা SQL Editor-এ রান করুন।

**২.২. Edge Functions Deploy করা**
Termux এ যদি Supabase CLI ইনস্টল থাকে, তবে নিচের কমান্ডগুলো দিয়ে ফাংশনগুলো লাইভ করুন:
```bash
supabase functions deploy generate-deck
supabase functions deploy transcribe-upload
supabase functions deploy lemon-webhook
```

**২.৩. Supabase Secrets (Environment Variables) সেট করা**
Edge function গুলো ঠিকমত কাজ করার জন্য সিক্রেট সেট করতে হবে:
```bash
supabase secrets set OPENROUTER_API_KEY="আপনার-ওপেনরাউটার-কি"
supabase secrets set LEMON_SQUEEZY_WEBHOOK_SECRET="আপনার-লেমনস্কুইজি-সিক্রেট"
```

---

## 🟣 Step 3: Vercel এ লাইভ করা (Frontend)

১. [Vercel Dashboard](https://vercel.com/) এ গিয়ে **Add New Project** এ ক্লিক করুন।
২. আপনার GitHub এর `SlideCrux` রেপোটি সিলেক্ট করে **Import** দিন।
৩. **Configure Project** অপশনে নিচের সেটিংগুলো দিন:
   - **Framework Preset:** `Vite` সিলেক্ট করুন।
   - **Root Directory:** `apps/web` দিন (খুবই জরুরি, কারণ আমাদের রিয়েক্ট অ্যাপ এই ফোল্ডারে)।
   - **Build Command:** `npm run build` (Vercel এমনিতেই এটা নিয়ে নিবে)।
   - **Output Directory:** `dist` (এটাও অটোমেটিক নিয়ে নিবে)।

৪. **Environment Variables:**
   নিচের ভ্যারিয়েবলগুলো Vercel এর Environment Variables সেকশনে অ্যাড করুন:
   - `VITE_SUPABASE_URL` = (আপনার Supabase Project URL)
   - `VITE_SUPABASE_ANON_KEY` = (আপনার Supabase Anon/Public Key)
   - `VITE_LEMON_STORE_ID` = (Lemon Squeezy Store ID)
   - `VITE_LEMON_PRO_VARIANT_ID` = (Pro Plan Variant ID)
   - `VITE_LEMON_TEAM_VARIANT_ID` = (Team Plan Variant ID)
   - `VITE_GOOGLE_CLIENT_ID` = (Google OAuth Client ID)

৫. এবার **Deploy** বাটনে ক্লিক করুন। 

`vercel.json` ফাইলে আমরা আগেই SPA (Single Page Application) রউটিং কনফিগার করে দিয়েছি, তাই ডিপ্লয় হওয়ার পর কোনো পেজ রিফ্রেশ দিলে 404 এরর আসবে না।

---

## 🟡 Step 4: Lemon Squeezy Webhook লিঙ্ক করা
Vercel এ সাইট লাইভ হওয়ার পর এবং Supabase এ `lemon-webhook` ডিপ্লয় হওয়ার পর:
1. Lemon Squeezy এর ড্যাশবোর্ডে যান (Settings > Webhooks)।
2. নতুন Webhook অ্যাড করুন।
3. **URL:** `https://[আপনার-সুপাবেস-রেফারেন্স].supabase.co/functions/v1/lemon-webhook`
4. **Secret:** যেটা আপনি Supabase এ `LEMON_SQUEEZY_WEBHOOK_SECRET` হিসেবে সেট করেছিলেন।
5. **Events:** `subscription_created`, `subscription_updated`, `subscription_cancelled` সিলেক্ট করে সেভ করুন।

---

**ব্যাস! আপনার SlideCrux এখন পুরোপুরি লাইভ হওয়ার জন্য প্রস্তুত।** 🎉
GitHub এ পুশ করার সময় কোনো কমান্ড এ এরর দিলে আমাকে জানাবেন।
