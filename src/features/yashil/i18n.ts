/**
 * Modul lug'ati: har kalit uchun kirill va lotin varianti.
 * `useYashilT()` — joriy yozuvga qarab matn qaytaradi; umumiy i18next bilan aralashmaydi.
 */
import { useCallback } from "react";
import { useScript, type Script } from "./script";

type Entry = [cyr: string, lat: string];

const DICT = {
  module_title: ["Яшил маҳалла", "Yashil mahalla"],
  module_subtitle: ["Кўчатдан яшил маҳаллагача", "Ko'chatdan yashil mahallagacha"],
  nav_overview: ["Умумий кўриниш", "Umumiy ko'rinish"],
  nav_reference: ["Кабинет маълумотлари", "Kabinet ma'lumotlari"],
  nav_orders: ["Буюртмалар", "Buyurtmalar"],
  cabinet: ["Кабинет", "Kabinet"],
  choose_cabinet: ["Кабинетни танланг", "Kabinetni tanlang"],
  script_cyr: ["Кирилл", "Kirill"],
  script_lat: ["Лотин", "Lotin"],
  back: ["Орқага", "Orqaga"],
  loading: ["Юкланмоқда…", "Yuklanmoqda…"],
  error_generic: ["Хатолик юз берди", "Xatolik yuz berdi"],
  request_id: ["Сўров рақами", "So'rov raqami"],
  retry: ["Қайта уриниш", "Qayta urinish"],
  not_member_title: ["Сиз модулга бириктирилмагансиз", "Siz modulga biriktirilmagansiz"],
  not_member_text: [
    "«Яшил маҳалла» бўлимидан фойдаланиш учун администратор сизни маҳалла, уюшма, етказиб берувчи ёки кузатувчи сифатида бириктириши керак.",
    "«Yashil mahalla» bo'limidan foydalanish uchun administrator sizni mahalla, uyushma, yetkazib beruvchi yoki kuzatuvchi sifatida biriktirishi kerak.",
  ],
  admin_badge: ["Модул администратори", "Modul administratori"],
  stat_total: ["Жами буюртмалар", "Jami buyurtmalar"],
  stat_review: ["Кўриб чиқишда", "Ko'rib chiqishda"],
  stat_execution: ["Ижрода", "Ijroda"],
  stat_done: ["Бажарилган", "Bajarilgan"],
  orders_count_unit: ["та буюртма", "ta buyurtma"],
  stage1_note: [
    "1-босқич: маълумотномалар ва кабинетлар. Буюртмалар, омбор ва далолатномалар кейинги босқичларда қўшилади.",
    "1-bosqich: ma'lumotnomalar va kabinetlar. Buyurtmalar, ombor va dalolatnomalar keyingi bosqichlarda qo'shiladi.",
  ],
  services_title: ["Йўналишлар", "Yo'nalishlar"],
  svc_seedlings: ["Кўчат етказиш", "Ko'chat yetkazish"],
  svc_protection: ["Ҳимоя хизмати", "Himoya xizmati"],
  svc_fertilizer: ["Ўғит ва мульча", "O'g'it va mulcha"],
  svc_irrigation: ["Суғориш воситалари", "Sug'orish vositalari"],
  rules_title: ["Муддат қоидалари", "Muddat qoidalari"],
  rule_review: ["иш куни — кўриб чиқиш (уюшма ва етказиб берувчи жами)", "ish kuni — ko'rib chiqish (uyushma va yetkazib beruvchi jami)"],
  rule_delivery: ["иш куни — етказиш (ижрога қабулдан)", "ish kuni — yetkazish (ijroga qabuldan)"],
  due_from_today: ["Бугундан ҳисобланганда", "Bugundan hisoblanganda"],
  review_due: ["Кўриб чиқиш муддати", "Ko'rib chiqish muddati"],
  delivery_due: ["Етказиш муддати", "Yetkazish muddati"],
  ref_title: ["Кабинет маълумотлари", "Kabinet ma'lumotlari"],
  ref_subtitle: [
    "Сизга бириктирилган ташкилот, маҳалла ва етказиб берувчилар. Хато бўлса администраторга мурожаат қилинг.",
    "Sizga biriktirilgan tashkilot, mahalla va yetkazib beruvchilar. Xato bo'lsa administratorga murojaat qiling.",
  ],
  member_type_mahalla: ["Маҳалла", "Mahalla"],
  member_type_union: ["Маҳаллалар уюшмаси", "Mahallalar uyushmasi"],
  member_type_supplier: ["Етказиб берувчи", "Yetkazib beruvchi"],
  member_type_observer: ["Агентлик кузатувчиси", "Agentlik kuzatuvchisi"],
  supplier_forest: ["Ўрмон хўжалиги", "O'rmon xo'jaligi"],
  supplier_dm: ["Яшил боғларни ташкил этиш ДМ", "Yashil bog'larni tashkil etish DM"],
  can_prepare: ["Ҳужжат тайёрлайди", "Hujjat tayyorlaydi"],
  can_sign: ["Имзолайди", "Imzolaydi"],
  no_right: ["йўқ", "yo'q"],
  position: ["Лавозим", "Lavozim"],
  phone: ["Алоқа рақами", "Aloqa raqami"],
  region: ["Вилоят", "Viloyat"],
  district: ["Туман", "Tuman"],
  address: ["Манзил", "Manzil"],
  source_code: ["Манба коди", "Manba kodi"],
  primary_forest: ["Асосий ўрмон хўжалиги", "Asosiy o'rmon xo'jaligi"],
  alternatives: ["Бошқа хўжаликлар", "Boshqa xo'jaliklar"],
  dm_options: ["ДМ (органик ўғит, ускуна, суғориш, ҳимоя)", "DM (organik o'g'it, uskuna, sug'orish, himoya)"],
  union_unit: ["Уюшма бўлинмаси", "Uyushma bo'linmasi"],
  none: ["Йўқ", "Yo'q"],
  visible_mahallas: ["Кўринадиган маҳаллалар", "Ko'rinadigan mahallalar"],
  all_republic: ["Бутун республика", "Butun respublika"],
  catalog_title: ["Каталог", "Katalog"],
  catalog_subtitle: ["Фаол позициялар (нарх кўрсатилмайди)", "Faol pozitsiyalar (narx ko'rsatilmaydi)"],
  col_code: ["Код", "Kod"],
  col_name: ["Номи", "Nomi"],
  col_type: ["Тури", "Turi"],
  col_unit: ["Бирлик", "Birlik"],
  item_goods: ["Товар", "Tovar"],
  item_service: ["Хизмат", "Xizmat"],
  search: ["Қидириш", "Qidirish"],
  empty: ["Маълумот йўқ", "Ma'lumot yo'q"],
  holidays_title: ["Ишлаб чиқариш календари", "Ishlab chiqarish kalendari"],
  holiday: ["Дам олиш / байрам", "Dam olish / bayram"],
  moved_workday: ["Кўчирилган иш куни", "Ko'chirilgan ish kuni"],
  unit_tup: ["туп", "tup"],
  unit_dona: ["дона", "dona"],
  unit_komplekt: ["комплект", "komplekt"],
  unit_daraxt: ["дарахт", "daraxt"],
  unit_kg: ["кг", "kg"],
  unit_metr: ["метр", "metr"],
  unit_ga: ["га", "ga"],
} satisfies Record<string, Entry>;

export type YashilKey = keyof typeof DICT;

export const yashilText = (key: YashilKey, script: Script): string => {
  const entry = DICT[key] as Entry | undefined;
  if (!entry) return key;
  return script === "lat" ? entry[1] : entry[0];
};

/** Kalit bo'yicha matn; `script` joriy yozuv. */
export function useYashilT() {
  const script = useScript();
  const t = useCallback((key: YashilKey) => yashilText(key, script), [script]);
  return { t, script };
}

/** Backend'dan kelgan `name_cyr`/`name_lat` juftligidan joriy yozuvdagisini tanlaydi. */
export const pickName = (obj: { name_cyr: string; name_lat: string }, script: Script): string =>
  script === "lat" ? obj.name_lat || obj.name_cyr : obj.name_cyr || obj.name_lat;
