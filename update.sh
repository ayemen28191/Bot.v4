#!/bin/bash
echo "بدء عملية تحديث النظام..."
cd "$(dirname "$0")"

# حفظ النسخة الحالية
CURRENT_VERSION=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "النسخة الحالية: $CURRENT_VERSION"

# تحديث المستودع
echo "جاري تحديث المستودع..."
if [ -d ".git" ]; then
  git pull
  if [ $? -ne 0 ]; then
    echo "فشل في تحديث المستودع"
    exit 1
  fi
else
  echo "ليس مستودع git. تخطي مرحلة التحديث."
fi

# تثبيت الحزم المطلوبة
echo "جاري تثبيت الحزم المطلوبة..."
npm install
if [ $? -ne 0 ]; then
  echo "فشل في تثبيت الحزم"
  exit 1
fi

# إعادة بناء المشروع
echo "جاري إعادة بناء المشروع..."
npm run build
if [ $? -ne 0 ]; then
  echo "فشل في إعادة بناء المشروع"
  exit 1
fi

# تسجيل التحديث
NEW_VERSION=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "التحديث اكتمل بنجاح! النسخة الجديدة: $NEW_VERSION"

# تسجيل معلومات التحديث في ملف السجل
echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") | $NEW_VERSION | تم التحديث بنجاح" >> data/update.log

# إعادة تشغيل الخدمة (اختياري - استخدم طريقة إعادة التشغيل المناسبة لنظامك)
# pm2 restart all

exit 0
