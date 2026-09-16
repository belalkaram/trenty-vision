const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function createPortablePackage() {
  console.log('🚀 Starting Baileys Bridge Portable Packaging...');

  const portableDir = path.resolve(__dirname, 'dist/WhatsApp-Bridge-Portable');
  if (fs.existsSync(portableDir)) {
    fs.rmSync(portableDir, { recursive: true, force: true });
  }
  fs.mkdirSync(portableDir, { recursive: true });

  // 1. Compile single standalone JS bundle
  console.log('📦 Step 1: Compiling standalone bridge-bundle.js with esbuild...');
  await esbuild.build({
    entryPoints: ['baileys-bridge/server.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: path.join(portableDir, 'bridge-bundle.js'),
    loader: {
      '.html': 'text',
    },
    define: {
      'process.env.DEPLOYMENT_MODE': '"local"',
    },
    external: [
      'canvas',
      'sharp',
      'cpu-features',
      'utf-8-validate',
      'bufferutil',
    ],
    minify: true,
  });
  console.log('✅ bridge-bundle.js created.');

  // 2. Copy node.exe for 100% zero-dependency execution on ANY PC
  console.log('💻 Step 2: Copying standalone node.exe engine...');
  fs.copyFileSync(process.execPath, path.join(portableDir, 'node.exe'));
  console.log('✅ node.exe copied.');

  // 3. Create .env with database credentials
  console.log('⚙️ Step 3: Generating pre-configured .env file...');
  const envContent = `# WhatsApp Bridge Configuration
NODE_ENV=production
DATABASE_URL=postgresql://neondb_owner:npg_AitEcqvL8d0T@ep-curly-mud-b24t81iw-pooler.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
BRIDGE_PORT=3001
BRIDGE_ID=bridge_main
OUTBOUND_POLL_INTERVAL_MS=2000
COMMAND_POLL_INTERVAL_MS=2000
HEARTBEAT_INTERVAL_MS=15000
`;
  fs.writeFileSync(path.join(portableDir, '.env'), envContent, 'utf8');

  // Copy dashboard folder
  const dashboardSrc = path.resolve(__dirname, 'baileys-bridge/dashboard');
  if (fs.existsSync(dashboardSrc)) {
    fs.cpSync(dashboardSrc, path.join(portableDir, 'dashboard'), { recursive: true });
    console.log('✅ dashboard UI copied.');
  }

  // 4. Create One-Click Windows Batch Launchers
  console.log('⚡ Step 4: Creating start-bridge.bat and run.bat launchers...');
  const batContent = `@echo off
chcp 65001 > nul
cd /d "%~dp0"
title WhatsApp Bridge Server - Trenty Vision
color 0A

echo ================================================================
echo    WhatsApp Bridge Server - Trenty Vision CRM
echo ================================================================
echo.
echo [1/3] Connecting to Neon Cloud Database...
echo [2/3] Starting WhatsApp Bridge Server...
echo [3/3] Local Dashboard will be at: http://localhost:3001
echo.
echo Press Ctrl+C to stop the server at any time.
echo ================================================================
echo.

"%~dp0node.exe" "%~dp0bridge-bundle.js"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Server encountered an error.
    pause
)
`;
  fs.writeFileSync(path.join(portableDir, 'تشغيل-السيرفر.bat'), batContent, 'utf8');
  fs.writeFileSync(path.join(portableDir, 'start-bridge.bat'), batContent, 'utf8');
  fs.writeFileSync(path.join(portableDir, 'run.bat'), batContent, 'utf8');
  fs.writeFileSync(path.join(portableDir, 'start.bat'), batContent, 'utf8');

  // 5. Create README.txt
  const readmeContent = `================================================================
           خادم واتساب المحلي المحمول (WhatsApp Bridge Portable)
================================================================

هذه الحزمة المحمولة تمكنك من تشغيل خادم WhatsApp على أي جهاز كمبيوتر 
وربطه تلقائياً بالنظام السحابي على Vercel بدون الحاجة لتثبيت أي برامج أو نقل كود المشروع.

📁 محتويات المجلد:
----------------------------------------------------------------
1. [تشغيل-السيرفر.bat] : انقر عليه مرتين لتشغيل السيرفر فوراً.
2. [bridge-bundle.js]   : الكود المترجم والمدمج بالكامل للسيرفر.
3. [node.exe]           : محرك التشغيل المحمول (لا يتطلب تثبيت Node.js على الجهاز).
4. [.env]               : إعدادات الربط بقاعدة بيانات Neon السحابية.

🚀 طريقة الاستخدام على أي جهاز آخر:
----------------------------------------------------------------
1. انسخ مجلد (WhatsApp-Bridge-Portable) كاملاً إلى أي مكان في الجهاز الآخر (مثل سطح المكتب).
2. انقر نقراً مزدوجاً على ملف [تشغيل-السيرفر.bat].
3. ستفتح لك لوحة التحكم المحلية على المتصفح: http://localhost:3001
4. افتح موقعك على Vercel وستجد السيرفر أونلاين 🟢 وجاهز لإرسال واستقبال الرسائل ومسح الـ QR Code.

================================================================
`;
  fs.writeFileSync(path.join(portableDir, 'README.txt'), readmeContent, 'utf8');

  console.log('\n🎉 Portable Package successfully created at:');
  console.log(portableDir);
}

createPortablePackage().catch((err) => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
