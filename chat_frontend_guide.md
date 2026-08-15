# Chat tizimi — Frontend integratsiya qo'llanmasi

**Maqsad:** ushbu hujjat backend'dagi Support Chat tizimini 0 dan tasvirlaydi — endpointlar, WebSocket protokoli, ruxsatlar, xato kodlari va to'liq foydalanuvchi oqimlari. Frontend'ni shu hujjatga mos qilib qayta ishlab chiqing.

**Backend holati:** 2026-08-15 sanasida chat modulida topilgan 23 ta muammo (K1–K4 kritik, J1–J6 jiddiy, O1–O7 o'rta) to'liq tuzatildi va tekshirildi: 36 ta avtomatik test (`python manage.py test apps.chat`) + uchta haqiqiy user (oddiy user, support_admin, super_admin) bilan lokal serverda to'liq REST + WebSocket uchma-uch tekshiruvi. Hammasi o'tdi.

> ⚠️ **403 xatolari haqida.** Frontendda "user xabar yozayotganda 403 keladi" degan muammo kuzatilgan. Backend darajasida bu holat qachon **to'g'ri** ravishda 403 qaytarishi kerakligi pastda "Ruxsatlar matritsasi" va "403 xatolarini tashxislash" bo'limlarida aniq yozilgan. Agar frontend shu jadvaldagi holatlarda 403 ko'rsatayotgan bo'lsa — bu backend xatosi emas, frontend oqimi noto'g'ri joyda so'rov yuborayotgan bo'lishi mumkin (masalan, xabarni REST orqali yuborishga urinish — bunday endpoint umuman yo'q, faqat WebSocket bor).

---

## 1. Asosiy tushunchalar

### 1.1 Rollar

| Rol (`user.role`) | Chatdagi vazifasi |
|---|---|
| Oddiy user (`tashkilot_hodimi` va h.k.) | Chat ochadi, savol yozadi |
| `support_admin` | Navbatdagi chatlarni ko'radi, o'ziga oladi (`assign`), javob yozadi, yopadi |
| `super_admin` (yoki `is_superuser=True`) | `support_admin` bilan bir xil huquqlar + tashlab ketilgan chatlarni majburan yopa oladi |

### 1.2 Chat holatlari (status)

```
NEW ──assign──> TAKEN ──close──> CLOSED
 │                                  ▲
 └──────────── cancel ──────────────┘
```

| Status | Ma'nosi |
|---|---|
| `new` | Chat ochilgan, hali hech qaysi admin olmagan (navbatda) |
| `taken` | Support admin oldi, faol suhbat ketyapti |
| `closed` | Yopilgan — o'qish mumkin, yozish **mumkin emas** |

### 1.3 Cheklovlar (userga)

- Bir vaqtda ko'pi bilan **2 ta yopilmagan** (`new` + `taken`) chat bo'lishi mumkin.
- Bir kunda ko'pi bilan **2 ta** chat ochish mumkin (yopilganlari ham sanaladi).
- ⚠️ **Muhim:** `NEW` holatidagi chat yangi chat ochishga **to'sqinlik qilmaydi** — u hech kimni band qilmaydi, shunchaki navbatda turadi. Faqat `TAKEN` (admin band qilgan) chat to'sqinlik qiladi.
- Chat bekor qilinsa (`cancel`) yoki yopilsa, kunlik limit **qaytarilmaydi**.

---

## 2. REST API

**Base URL:** `/api/v1/chats/`
**Autentifikatsiya:** hamma endpoint `Authorization: Bearer <access_token>` talab qiladi.

### 2.1 Umumiy javob shakllari

**Sahifalangan ro'yxat** (barcha `list` turidagi endpointlar):

```json
{
  "count": 42,
  "next": "http://.../conversations/list/?page=2",
  "previous": null,
  "results": [ ... ]
}
```

Query parametrlari: `?page=1&per_page=10` (`per_page` maksimal 100).

**Xato javobi:**

```json
{ "detail": "Inson o'qiy oladigan xato xabari." }
```

### 2.2 Xato kodlari — TO'LIQ jadval

| HTTP status | Qachon | Misol `detail` |
|---|---|---|
| `400` | Umumiy validatsiya xatosi | — |
| `403` | Ruxsat yo'q (rol yoki egalik) | "You are not allowed to perform this action." / "You don't have access to this conversation." |
| `404` | Chat topilmadi | "Conversation not found." |
| `409` | Holat konflikti (allaqachon band, yopilgan, limitga yetgan) | "You already have a conversation being handled by support." |
| `429` | Kunlik limit tugagan | "Daily conversation limit exceeded." |

> Frontend **string matching** qilmasligi kerak — status kodiga qarab UI holatini boshqaring (masalan 429 → "bugun yana urinib ko'ring" banneri, 409 → "sizda allaqachon faol chat bor").

### 2.3 Endpointlar

#### `POST /conversations/` — yangi chat ochish

Body: yo'q (bo'sh).

**201** → `ConversationDetail` (2.4 ga qarang)
**409** → faol/band chat bor
**429** → kunlik limit

#### `GET /conversations/list/` — o'z chatlarim

Faqat login qilgan userning o'z chatlari. Sahifalangan, `ConversationList` elementlari (2.4).

#### `GET /conversations/<uuid>/` — bitta chat detali

Ruxsat: chat egasi, biriktirilgan admin, yoki **istalgan** support_admin/super_admin.
**404** agar topilmasa yoki ruxsat yo'q bo'lsa (mavjudligini oshkor qilmaslik uchun ataylab 403 emas, 404).

#### `GET /conversations/<uuid>/messages/` — xabarlar tarixi

Sahifalangan (`MessageSerializer` elementlari, 2.5). **Chaqirilganda avtomatik ravishda boshqa tomonning xabarlarini `is_read=true` qiladi.**

Ruxsat (O'QISH): chat egasi, biriktirilgan admin, **yoki istalgan support_admin/super_admin**.
**403** → boshqa oddiy userning chatiga kirishga urinish.
**404** → chat topilmadi.

#### `POST /conversations/<uuid>/mark-read/` — faqat o'qilgan deb belgilash

Tarixni qayta yuklamasdan "o'qildi" holatini yangilash uchun yengil endpoint.

**200** → `{"marked_count": 3}`

#### `POST /conversations/<uuid>/cancel/` — **YANGI**: o'z chatini bekor qilish

Faqat chat egasi, faqat chat hali `NEW` bo'lsa (admin olmagan bo'lsa) ishlaydi.

**200** → `ConversationDetail`, `status: "closed"`
**403** → boshqa userning chatini yoki `TAKEN` chatni bekor qilishga urinish ("Conversation is already being handled by support.")

> Frontend uchun: chat ro'yxatida `status === "new"` bo'lgan o'z chatining yonida "Bekor qilish" tugmasi shu endpointga ulanadi.

---

### 2.4 Support (admin) endpointlari

Barchasi `support_admin` yoki `super_admin` rolini talab qiladi. Oddiy user chaqirsa — **403**.

#### `GET /support/new/` — navbatdagi chatlar

`assigned_to = null`, `status = new` bo'lgan barcha chatlar, eskisidan boshlab.

#### `GET /support/my/` — menga biriktirilgan chatlar

`assigned_to = men`, `status in [taken, closed]`.

#### `POST /conversations/<uuid>/assign/` — chatni olish

**200** → `ConversationDetail`, `status: "taken"`, `assigned_to` = men
**403** → support_admin/super_admin emassiz
**409** → chat allaqachon olingan yoki yopilgan

#### `POST /conversations/<uuid>/close/` — chatni yopish

- Oddiy support_admin: faqat **o'ziga biriktirilgan** chatni yopa oladi.
- super_admin: **istalgan** chatni (hatto `NEW` bo'lsa ham — biriktirilmagan/tashlab ketilgan chatlarni tozalash uchun) majburan yopa oladi.

**200** → `ConversationDetail`, `status: "closed"`
**403** → boshqa adminning chatini yopishga urinish (oddiy support_admin uchun)
**409** → allaqachon yopilgan

---

### 2.5 Serializer shakllari

**`ConversationList`** (ro'yxatlarda):
```json
{
  "id": "uuid",
  "user": { "id": "uuid", "first_name": "...", "last_name": "...", "full_name": "...", "role": "...", "email": "..." },
  "status": "new | taken | closed",
  "assigned_to": { ... } | null,
  "last_message_at": "15.08.2026 18:35" | null,
  "created_at": "15.08.2026 18:35",
  "unread_count": 2
}
```

**`ConversationDetail`** (bitta chat, assign/close/cancel javoblari):
```json
{
  "id": "uuid",
  "status": "new | taken | closed",
  "user": { ... },
  "assigned_to": { ... } | null,
  "taken_at": "..." | null,
  "closed_at": "..." | null,
  "last_message_at": "..." | null,
  "created_at": "..."
}
```

**`Message`** (tarix va WebSocket'da bir xil shakl):
```json
{
  "id": "uuid",
  "sender": { "id": "uuid", "first_name": "...", "last_name": "...", "full_name": "...", "role": "..." },
  "text": "Salom, yordam kerak",
  "is_read": false,
  "created_at": "15.08.2026 18:35"
}
```

> `created_at`/`last_message_at`/`taken_at`/`closed_at` formati loyihaning umumiy datetime formatida keladi (server sozlamasiga bog'liq — frontend qat'iy formatga tayanmasin, faqat parse qilsin).

---

## 3. WebSocket — real vaqtda xabar almashish

**REST orqali xabar yuborish endpointi YO'Q.** Xabar yuborish faqat WebSocket orqali.

### 3.1 Ulanish

```
ws://<host>/ws/chat/<conversation_id>/?token=<access_token>
```

- `token` — REST login'dan olingan JWT **access** token (query string orqali).
- `conversation_id` — UUID, chatning o'zi.

**Ulanish qabul qilinishi uchun** foydalanuvchi shu chatning egasi, biriktirilgan admini, yoki **istalgan** support_admin/super_admin bo'lishi kerak (o'qish ruxsati bilan bir xil qoida).

**Ulanish rad etilsa**, server maxsus close code bilan yopadi (WS handshake HTTP darajasida emas):

| Close code | Sabab |
|---|---|
| `4401` | Token yo'q yoki yaroqsiz (autentifikatsiya) |
| `4404` | Chat topilmadi |
| `4403` | Ruxsat yo'q |

Frontend shu kodlarni ushlab, mosini ko'rsatishi kerak (masalan 4401 → login sahifasiga qaytarish).

### 3.2 Xabar yuborish

Ulangandan keyin mijoz JSON obyekt yuboradi:

```json
{ "text": "Salomlar, yordam kerak edi" }
```

Cheklovlar:
- `text` bo'sh bo'lmasligi kerak (probel tashlab tashlanadi).
- Maksimal uzunlik: **5000** belgi.

### 3.3 Qabul qilinadigan hodisalar

Server bir nechta xil `type` bilan JSON yuboradi — frontend `type` bo'yicha tarmoqlanishi kerak:

**`chat_message`** — yangi xabar (yuborilgan yoki qabul qilingan, ikkalasi uchun ham bir xil hodisa):
```json
{
  "type": "chat_message",
  "message": { "id": "...", "sender": {...}, "text": "...", "is_read": false, "created_at": "..." }
}
```
> ⚠️ Bu hodisa guruhdagi **hamma a'zoga** yuboriladi — jumladan xabarni yozgan foydalanuvchining o'ziga ham (broadcast echo). Frontend o'zi yuborgan xabarni **ikki marta** ko'rsatib qo'ymaslik uchun (optimistic UI + echo) `message.id` bo'yicha dedupe qilishi kerak.

**`conversation_assigned`** — chat admin tomonidan olindi (**YANGI**):
```json
{
  "type": "conversation_assigned",
  "conversation": { "id": "...", "status": "taken", "assigned_to": {...}, ... }
}
```
Frontend: chat ro'yxatini yangilash, "Support siz bilan bog'landi" kabi bildirishnoma.

**`conversation_closed`** — chat yopildi (**YANGI**):
```json
{
  "type": "conversation_closed",
  "conversation": { "id": "...", "status": "closed", "closed_at": "...", ... }
}
```
Frontend: input maydonini bloklash, "Chat yopildi" bannerini ko'rsatish.

**`chat.error`** — xato (ulanish o'chirilmaydi, foydalanuvchi qayta urinishi mumkin):
```json
{ "type": "chat.error", "message": "Conversation already closed." }
```
Bu hodisa quyidagi holatlarda keladi:
- Bo'sh yoki 5000 belgidan uzun xabar
- Yopilgan chatga yozishga urinish
- Biriktirilmagan/boshqa adminning chatiga yozishga urinish (pastdagi 4-bo'limga qarang)
- Buzuq JSON yoki noto'g'ri payload tuzilishi (masalan massiv yuborilsa)
- Kutilmagan server xatosi

> Ilgari buzuq JSON yoki noto'g'ri payload butun WebSocket ulanishini yiqitardi (mijoz qayta ulanishga majbur bo'lardi). Endi bunday holatlar `chat.error` bilan javob beradi, ulanish **ochiq qoladi**.

---

## 4. Ruxsatlar matritsasi (aniq, to'liq)

| Amal | Chat egasi | Biriktirilgan admin | Boshqa support_admin | super_admin |
|---|---|---|---|---|
| Chat yaratish | ✅ (limit doirasida) | — | — | — |
| Chatni **o'qish** (tarix, WS ulanish) | ✅ | ✅ | ✅ | ✅ |
| Chatga **yozish** (WS xabar) | ✅ (faqat ochiq bo'lsa) | ✅ (faqat ochiq bo'lsa) | ❌ **403** | ❌ **403** (u ham avval `assign` qilishi kerak) |
| Chatni olish (`assign`) | ❌ | — (chat allaqachon olingan) | ✅ (faqat `NEW` bo'lsa) | ✅ (faqat `NEW` bo'lsa) |
| Chatni yopish (`close`) | ❌ | ✅ | ❌ **403** | ✅ (istalganini, `NEW` ham) |
| Chatni bekor qilish (`cancel`) | ✅ (faqat `NEW` bo'lsa) | — | — | — |
| `/support/*` ro'yxatlari | ❌ **403** | — | ✅ | ✅ |

**Eng muhim nozik joy:** o'qish va yozish huquqi **bir xil emas**. Istalgan support_admin navbatdagi (`NEW`) chatni ochib savolni o'qiy oladi — bu qulaylik uchun ataylab shunday (admin savolni ko'rmasdan "olishga" majbur bo'lmasligi kerak). Lekin **yozish** faqat chat egasiga yoki AYNAN o'sha chatga biriktirilgan (`assign` qilingan) adminga ochiq. Shuning uchun:

> Agar support_admin `NEW` chatni ochib, uni olmasdan turib to'g'ridan-to'g'ri javob yozishga urinsa — WebSocket orqali `chat.error: "You cannot send messages to this conversation."` keladi. **Bu xato emas, bu qoida.** Frontend oqimi: chatni ochish → agar `status === "new"` bo'lsa, avval "Olish" (`assign`) tugmasini bosish → keyingina yozish maydonini faollashtirish.

---

## 5. 403 xatolarini tashxislash (frontend uchun cheklist)

Agar konsolda 403 ko'rinsa, quyidagi tartibda tekshiring:

1. **So'rov qaysi endpointga ketyapti?**
   Xabar yuborish uchun REST so'rov yuborilmoqdami? — **bunday endpoint yo'q**, faqat WebSocket orqali yuboriladi.

2. **Token to'g'ri yuborilyaptimi?**
   REST'da `Authorization: Bearer <token>` header, WebSocket'da `?token=<token>` query param. Ikkalasi ham **access** token bo'lishi kerak, refresh emas.

3. **User support_admin ekanligi tasdiqlanganmi?**
   `/support/new/`, `/support/my/`, `assign`, `close` — bularning barchasi `role === "support_admin"` yoki `super_admin`/superuser talab qiladi. Login javobidagi `user.role` ni frontend to'g'ri saqlayaptimi?

4. **Support admin chatga yozishdan oldin uni olganmi (`assign`)?**
   Yuqoridagi 4-bo'limga qarang — bu eng ko'p uchraydigan holat.

5. **Chat boshqa userga tegishlimi?**
   Foydalanuvchi eski/keshlangan `conversation_id` bilan ishlayaptimi? Har doim `/conversations/list/` dan olingan aktual ro'yxatga tayaning.

6. **Chat yopilganmi?**
   Yopilgan chatga yozishga urinish WebSocket orqali `chat.error` (409 mantig'i, lekin WS'da HTTP status yo'q) qaytaradi, REST orqali esa `messages/` va `mark-read/` yopilgan chat uchun ham ishlayveradi (tarix har doim o'qiladi) — shuning uchun 403 aynan **yozishda** yoki **support ruxsatida** bo'ladi, o'qishda deyarli hech qachon.

---

## 6. Toʻliq foydalanuvchi oqimlari

### 6.1 Oddiy user

```
1. POST /conversations/  → yangi chat (status: new)
2. WS ulanish: ws://.../ws/chat/<id>/?token=...
3. WS orqali xabar yuborish: {"text": "..."}
4. conversation_assigned hodisasini kutish (admin oldi)
5. chat_message hodisalarini qabul qilish (javoblar)
6. Agar kerak bo'lmay qolsa: POST /cancel/ (faqat hali NEW bo'lsa)
7. Admin yopganda: conversation_closed hodisasi keladi
```

### 6.2 Support admin

```
1. GET /support/new/  → navbatni ko'rish (unread_count bilan)
2. Kerakli chatni tanlab, uning tarixini o'qish: GET /conversations/<id>/messages/
   (bu bosqichda hali yozib bo'lmaydi — faqat o'qish)
3. POST /conversations/<id>/assign/  → chatni olish
4. WS ulanish + xabar yozish endi ishlaydi
5. GET /support/my/  → "mening chatlarim" ro'yxati (taken + closed)
6. POST /conversations/<id>/close/  → suhbatni yakunlash
```

### 6.3 Super admin (qo'shimcha)

```
- Yuqoridagi support_admin oqimining hammasi + 
- Tashlab ketilgan / hech kim olmagan (NEW) chatlarni ham majburan yopa oladi:
  POST /conversations/<id>/close/  (assign qilmasdan ham ishlaydi)
```

---

## 7. Nima o'zgardi (eski frontend implementatsiyasi bo'lsa — moslashtirish uchun)

| Eski | Yangi |
|---|---|
| `GET /conversations/<id>/messages/` massiv qaytarardi | Endi **sahifalangan** obyekt qaytaradi: `{count, next, previous, results}` |
| Barcha xatolar HTTP 400 | Endi 403 / 404 / 409 / 429 — status kodiga qarab ishlang |
| `POST /cancel/` endpointi yo'q edi | **Yangi** — user o'z NEW chatini bekor qila oladi |
| WS hodisalari faqat `chat_message` | Endi `conversation_assigned`, `conversation_closed` ham bor |
| Buzuq WS payload ulanishni uzardi | Endi `chat.error` bilan javob beradi, ulanish davom etadi |
| `NEW` chat 2-chi chat ochishga to'sqinlik qilardi | Endi to'smaydi — faqat `TAKEN` to'sqinlik qiladi |
| Support admin (haqiqiy rol bilan) `assign`/`close` qila olmasdi | Endi to'g'ri ishlaydi (bu eng katta bug edi) |

---

## 8. Tezkor havola — endpoint jadvali

| Method | Path | Kim | Izoh |
|---|---|---|---|
| POST | `/api/v1/chats/conversations/` | Har kim | Chat ochish |
| GET | `/api/v1/chats/conversations/list/` | Har kim | O'z chatlarim |
| GET | `/api/v1/chats/conversations/<id>/` | Egasi/admin | Chat detali |
| GET | `/api/v1/chats/conversations/<id>/messages/` | Egasi/biriktirilgan/support | Tarix (+ o'qildi belgisi) |
| POST | `/api/v1/chats/conversations/<id>/mark-read/` | Egasi/biriktirilgan/support | Faqat o'qildi belgisi |
| POST | `/api/v1/chats/conversations/<id>/cancel/` | Faqat egasi | NEW chatni bekor qilish |
| GET | `/api/v1/chats/support/new/` | support_admin | Navbat |
| GET | `/api/v1/chats/support/my/` | support_admin | Mening chatlarim |
| POST | `/api/v1/chats/conversations/<id>/assign/` | support_admin | Olish |
| POST | `/api/v1/chats/conversations/<id>/close/` | biriktirilgan/super_admin | Yopish |
| WS | `/ws/chat/<id>/?token=...` | Egasi/biriktirilgan/support | Real vaqt xabar almashish |
