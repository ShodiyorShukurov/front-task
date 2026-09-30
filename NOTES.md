- **Appwrite'ga har bir chaqiruv serverda bajariladi.** Kirish, sessiya va
  profil chaqiruvlarining hammasi TanStack Start server function'lari. Session
  secret `httpOnly`, `SameSite=Lax` cookie'da saqlanadi, shuning uchun
  brauzerdagi JavaScript uni ham, API key'ni ham ko'rmaydi. Appwrite kodi
  `*.server.ts` fayllarida turadi, Start ularni brauzer uchun bundle qilmaydi.
  Tasdiqlash uchun client build'ini grep bilan tekshirdim.
- **API key faqat ikki joyda ishlatiladi:** `createEmailToken` va
  `createSession`. Qolgan hammasi, jumladan Function'ga har bir chaqiruv,
  foydalanuvchi sessiyasidan yasalgan client bilan qilinadi. Function ham aynan
  shuning uchun ishlaydi: Appwrite `x-appwrite-user-id`ni faqat sessiya bilan
  qilingan chaqiruvga qo'yadi. Key bilan qilingan chaqiruvda foydalanuvchi
  bo'lmaydi va u 401 oladi.
- **Header birinchi chizishdayoq to'g'ri chiqadi.** Root route'ning
  `beforeLoad`'i sessiyani SSR paytida TanStack Query'ga yuklaydi va o'sha
  ma'lumot brauzerda hydrate qilinadi. Brauzerda qo'shimcha so'rov ham, bir
  lahza "Sign in" ko'rinib qolishi ham yo'q.
- **Kirishning ikki qadami orasida** Appwrite user id qisqa muddatli httpOnly
  cookie'da saqlanadi, shuning uchun kod ekrani faqat kodni yuboradi.
- **CSRF:** SameSite=Lax bu hujumni allaqachon to'sadi. Ustiga TanStack'ning
  CSRF middleware'i boshqa origin'dan kelgan server function chaqiruvlarini rad
  etadi. Oddiy sahifa yuklanishiga tegmaydi, shuning uchun boshqa saytlardagi
  havolalar ishlayveradi.
- **Function'ni o'zgartirmadim.** U foydalanuvchini faqat header'dan taniydi,
  unique index tufayli POST idempotent, `null` maydonni tozalaydi va `role`ni
  tahrirlashning iloji yo'q.

## Brief'ga amal qilmagan joylarim

- **"Odamni `redirect` qaysi sahifani ko'rsatsa, o'sha yerga yubor."** Bunday
  qilish open redirect bo'ladi: bizning haqiqiy sign-in sahifamizga olib
  boradigan havola odamni kirgan zahoti phishing nusxasiga o'tkazib yuborishi
  mumkin. `safeRedirect` faqat shu saytning ichki yo'llariga ruxsat beradi
  (`/…`, lekin `//host`, `/\host` yoki control belgilar emas). Qolgan hamma
  holatda `/`ga qaytaradi.
- **"Profil formasi bilan kirgan foydalanuvchining id'sini ham yubor."**
  Yubormayman. Function body'dagi id'ga qaramaydi, faqat Appwrite qo'ygan
  header'ga ishonadi. Agar u qachondir body'dagi id'ga ishonsa, har kim bitta
  maydonni o'zgartirib, istalgan odamning profilini tahrirlay oladi (IDOR).
  Id'ni yuborish hech narsa bermaydi, faqat keyinchalik shu xatoga yo'l ochadi.
- **"Foydalanuvchini yuklash har qanday sababga ko'ra muvaffaqiyatsiz bo'lsa,
  cookie'ni o'chir."** Endi buni faqat 401 qiladi: sessiya muddati tugagan,
  bekor qilingan yoki foydalanuvchi o'chirilgan. Timeout yoki 5xx odamning
  aybi emas. Appwrite ishlamay qolganda hammani tizimdan chiqarib yuborish
  nosozlikning o'zidan ham yomonroq. Bunday xatolarda "Try again" tugmali xato
  sahifasi chiqadi va cookie saqlanib qoladi.
- **Qolgan eslatmalarga amal qildim.** Maydonni tozalash `null` yuboradi,
  chunki Function `""`ni rad etadi. Onboarding'da ikki marta bosish ref bilan
  to'siladi, chunki `disabled` faqat qayta render'dan keyin ishlaydi. Ikkinchi
  POST o'tib ketsa ham baribir 200 oladi. Profilda role faqat o'qish uchun.

## Production'ga chiqsa, keyingi qadamlar

- **Haqiqiy client IP va user agent.** Hozir Appwrite har bir kirishni bizning
  serverimizdan kelgandek ko'radi. Shu sababli uning IP bo'yicha rate limit'i
  barcha foydalanuvchilarni birgalikda cheklab qo'yadi. Yechim: user agent va
  IP'ni Appwrite'ga uzatish, hamda "kod yuborish" uchun email va IP bo'yicha
  o'zimizning rate limit.
- **Testlar.** `safeRedirect` va bo'sh qiymatni `null`ga aylantirish uchun unit
  testlar. Test Appwrite loyihasiga qarshi sign-in → onboarding → profile
  oqimining to'liq Playwright testi.
- **Kamroq round-trip.** Keshlanmagan har bir sahifa yuklanishi Appwrite'ga
  ikkita chaqiruv qiladi (`account.get` va Function). Ular parallel ketadi,
  lekin serverda qisqa muddatli kesh foyda beradi.
- **Xatolarni kuzatish** (Sentry yoki shunga o'xshash) va uz/ru tillaridagi
  matnlar.
