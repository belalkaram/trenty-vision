# Kenooz WhatsApp CRM

نظام داخلي متكامل لإدارة محادثات WhatsApp، العملاء، والموظفين، مع بوابة WhatsApp مبنية على Baileys ومحرك أتمتة وتوزيع ذكي.

---

## مواصفات المشروع المعمارية

- **Backend**: Node.js (v24+ LTS) + TypeScript (Strict Mode) + Fastify
- **Database**: PostgreSQL (Neon Cloud) + Drizzle ORM
- **Authentication**: JWT (Access 15m + Refresh 7d) في HTTP-only Cookies آمنة + تشفير كلمات المرور بـ bcrypt
- **RBAC**: 5 أدوار رئيسية (`super_admin`, `admin`, `supervisor`, `employee`, `viewer`) مع 22 صلاحية مفصلة
- **Realtime / Events**: مهيأ لـ WebSocket في المرحلة القادمة
- **Frontend**: Mobile-first UI مبني بـ HTML5، Tailwind CSS، و Alpine.js مع شريط تنقل سفلي PWA مخصص للهواتف المحمولة
- **Audit Logs**: سجل تدقيق أمني غير قابل للتعديل (Append-only) يوثق كافة العمليات الحساسة
- **Providers Abstraction**:
  - `WhatsAppProvider` (واجهة مجردة + `MockWhatsAppProvider` للاختبارات التلقائية، تمهيداً لـ Baileys في المرحلة 2)
  - `StorageProvider` (`LocalStorageProvider` مهيأ للتوسعة لـ Cloudflare R2)
  - `CRMProvider` (`MockCRMProvider` مهيأ للربط الخارجي)

---

## هيكلية قاعدة البيانات (Neon PostgreSQL)

تم إنشاء وتطبيق 24 جدولاً بنجاح عبر Drizzle Migrations:
1. `companies`
2. `departments`
3. `stations`
4. `roles`
5. `permissions`
6. `role_permissions`
7. `users`
8. `employees`
9. `settings`
10. `audit_logs`
11. `contacts`
12. `leads`
13. `whatsapp_accounts`
14. `whatsapp_sessions`
15. `conversations`
16. `messages`
17. `reminders`
18. `quick_replies`
19. `automation_rules`
20. `tags`
21. `conversation_tags`
22. `crm_connections`
23. `crm_sync_logs`
24. `notifications`

---

## تشغيل النظام محلياً

### 1. تثبيت الحزم
```bash
npm install
```

### 2. توليد وتطبيق الميجريشن
```bash
npm run db:generate
npm run db:migrate
```

### 3. ملء البيانات الأولية (Seeding)
```bash
npm run db:seed
```

### 4. تشغيل خادم التطوير
```bash
npm run dev
```
سيعمل الخادم على: `http://localhost:3000`

### 5. حساب الدخول الافتراضي (Super Admin):
- **البريد الإلكتروني**: `admin@trenty.com`
- **كلمة المرور**: `Password123!`

---

## تشغيل الاختبارات التلقائية
```bash
npm test
```
تغطي الاختبارات:
- سلامة التشفير وفك التشفير بـ AES-256-GCM
- هاش كلمات المرور والتحقق
- توليد وتوثيق JWT Access & Refresh
- كافة مسارات الـ API وصلاحيات الـ RBAC
- الاتصال المباشر بقاعدة بيانات Neon PostgreSQL
