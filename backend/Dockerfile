# استخدام نسخة خفيفة ومستقرة من Node.js
FROM node:18-alpine

# تحديد الفولدر الداخلي اللي الشغل كله هيكون جواه
WORKDIR /app

# نسخ ملف التعريف وتسطيب المكتبات أولاً (عشان الـ Caching بتاع Docker يكون سريع)
COPY package*.json ./
RUN npm install

# نسخ باقي كود المشروع
COPY . .

# فتح البورت الداخلي للكونتينر
EXPOSE 5000

# الأمر النهائي لتشغيل السيرفر
CMD ["node", "server.js"]
