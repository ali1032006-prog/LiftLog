// Arabic count forms. Keys are "<English plural key>|<form>", where form is one of
// zero, two, few (3-10), many (11-99) or other (100+). Missing forms fall back to the plain key.
const plurals: Record<string, string> = {
  '{count} messages left today|two': 'رسالتان متبقيتان اليوم',
  '{count} messages left today|few': '{count} رسائل متبقية اليوم',
  '{count} messages left today|many': '{count} رسالة متبقية اليوم',
  '{count} messages left today|other': '{count} رسالة متبقية اليوم',
  '{count} messages left today|zero': 'لا توجد رسائل متبقية اليوم',

  '{count} sets|two': 'مجموعتان',
  '{count} sets|few': '{count} مجموعات',
  '{count} sets|many': '{count} مجموعة',
  '{count} sets|other': '{count} مجموعة',
  '{count} sets|zero': '{count} مجموعة',

  '{count} exercises|two': 'تمرينان',
  '{count} exercises|few': '{count} تمارين',
  '{count} exercises|many': '{count} تمرينًا',
  '{count} exercises|other': '{count} تمرين',
  '{count} exercises|zero': '{count} تمرين',

  '{count} followers|two': 'متابِعان',
  '{count} followers|few': '{count} متابِعين',
  '{count} followers|many': '{count} متابِعًا',
  '{count} followers|other': '{count} متابِع',
  '{count} followers|zero': '{count} متابِع',

  '{count} completed sets|two': 'مجموعتان مكتملتان',
  '{count} completed sets|few': '{count} مجموعات مكتملة',
  '{count} completed sets|many': '{count} مجموعة مكتملة',
  '{count} completed sets|other': '{count} مجموعة مكتملة',
  '{count} completed sets|zero': '{count} مجموعة مكتملة',

  '{count} completed sets will be saved.|two': 'سيتم حفظ مجموعتين مكتملتين.',
  '{count} completed sets will be saved.|few': 'سيتم حفظ {count} مجموعات مكتملة.',
  '{count} completed sets will be saved.|many': 'سيتم حفظ {count} مجموعة مكتملة.',
  '{count} completed sets will be saved.|other': 'سيتم حفظ {count} مجموعة مكتملة.',

  '+{count} more exercises|two': '+تمرينان آخران',
  '+{count} more exercises|few': '+{count} تمارين أخرى',
  '+{count} more exercises|many': '+{count} تمرينًا آخر',
  '+{count} more exercises|other': '+{count} تمرين آخر',

  // Context-specific wording ("context::English")
  'button::Following': 'أتابعه',
};
export default plurals;
