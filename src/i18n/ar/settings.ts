// Arabic translations for the settings screens.
const settings: Record<string, string> = {
  // settings home
  System: 'النظام',
  Light: 'فاتح',
  Dark: 'داكن',
  'Cache cleared': 'تم مسح البيانات المؤقتة',
  'Your feed and profile will reload from the server.': 'سيُعاد تحميل آخر الأخبار وملفك الشخصي من الخادم.',
  'Sign out?': 'تسجيل الخروج؟',
  'Sign out': 'تسجيل الخروج',
  Preferences: 'التفضيلات',
  Appearance: 'المظهر',
  'Appearance: {mode}': 'المظهر: {mode}',
  Support: 'الدعم',
  'About LiftLog': 'حول LiftLog',
  'Clear cached data': 'مسح البيانات المؤقتة',
  'Signed in as {email}': 'مسجّل الدخول باسم {email}',

  // account
  'Email and password': 'البريد الإلكتروني وكلمة المرور',
  ', ': '، ',
  'Enter your current password.': 'أدخل كلمة المرور الحالية.',
  'Your current password is incorrect.': 'كلمة المرور الحالية غير صحيحة.',
  'Enter a valid email address.': 'أدخل عنوان بريد إلكتروني صالحًا.',
  'That is already your email.': 'هذا هو بريدك الإلكتروني الحالي بالفعل.',
  'Check your inbox. We sent confirmation links to your old and new email. The change applies once you confirm.':
    'تحقّق من بريدك الوارد. أرسلنا روابط تأكيد إلى بريدك القديم والجديد، ويُطبَّق التغيير بعد التأكيد.',
  'We sent a verification code to {email}.': 'أرسلنا رمز تحقق إلى {email}.',
  'New password must be at least 6 characters.': 'يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل.',
  'The new passwords do not match.': 'كلمتا المرور الجديدتان غير متطابقتين.',
  'Enter the verification code from your email.': 'أدخل رمز التحقق المرسل إلى بريدك الإلكتروني.',
  'Your password has been updated.': 'تم تحديث كلمة المرور.',
  'Delete your account?': 'حذف حسابك؟',
  'This permanently deletes your profile, workouts, routines and followers. It cannot be undone.':
    'سيؤدي هذا إلى حذف ملفك الشخصي وتمارينك وروتيناتك ومتابعيك نهائيًا. لا يمكن التراجع عن ذلك.',
  'Delete account': 'حذف الحساب',
  'Could not delete your account. Please try again.': 'تعذّر حذف حسابك. يُرجى المحاولة مرة أخرى.',
  'Signed in': 'تسجيل الدخول',
  'Sign-in methods': 'طرق تسجيل الدخول',
  Security: 'الأمان',
  'Change email': 'تغيير البريد الإلكتروني',
  'Change password': 'تغيير كلمة المرور',
  'Set a password': 'تعيين كلمة مرور',
  'New email': 'البريد الإلكتروني الجديد',
  'Current password': 'كلمة المرور الحالية',
  'Send confirmation': 'إرسال التأكيد',
  'To confirm it is you, we will email a verification code to {email}.': 'للتأكد من هويتك، سنرسل رمز تحقق إلى {email}.',
  'Verification code': 'رمز التحقق',
  'Send code': 'إرسال الرمز',
  'New password': 'كلمة المرور الجديدة',
  'Confirm new password': 'تأكيد كلمة المرور الجديدة',
  'Update password': 'تحديث كلمة المرور',
  'Danger zone': 'منطقة الخطر',
  'Deleting your account removes all of your data from LiftLog.': 'يؤدي حذف حسابك إلى إزالة جميع بياناتك من LiftLog.',

  // workout settings
  'New exercises': 'التمارين الجديدة',
  'Used the first time you log an exercise. After that, each exercise remembers its own unit.':
    'تُستخدم أول مرة تسجّل فيها تمرينًا، وبعد ذلك يتذكّر كل تمرين وحدته الخاصة.',
  'Default rest timer': 'مؤقت الراحة الافتراضي',
  'Default weight unit': 'وحدة الوزن الافتراضية',
  'During a workout': 'أثناء التمرين',
  'Saved on this device.': 'محفوظة على هذا الجهاز.',
  'Start rest timer after a set': 'بدء مؤقت الراحة بعد كل مجموعة',
  'Haptic feedback': 'الاهتزاز عند اللمس',
  'Keep screen awake': 'إبقاء الشاشة مضاءة',

  // about
  Version: 'الإصدار',
  Platform: 'المنصة',
  Web: 'الويب',
  'Exercise library': 'مكتبة التمارين',
  'Built with Expo and Supabase.': 'مبني باستخدام Expo وSupabase.',

  // edit profile
  'Could not update your photo.': 'تعذّر تحديث صورتك.',
  'Could not remove your photo.': 'تعذّرت إزالة صورتك.',
  'Username must be 3 to 30 characters: letters, numbers, dots or underscores.':
    'يجب أن يتكون اسم المستخدم من 3 إلى 30 حرفًا: أحرف أو أرقام أو نقاط أو شرطات سفلية.',
  'That username is taken.': 'اسم المستخدم هذا محجوز.',
  'Letters, numbers, dots, underscores · 3 to 30 characters': 'أحرف، أرقام، نقاط، شرطات سفلية · من 3 إلى 30 حرفًا',
  'Change photo': 'تغيير الصورة',
  'Display name': 'الاسم المعروض',
  'Your name': 'اسمك',
  Bio: 'نبذة',
  'A line about your training': 'سطر عن تدريبك',

  // shared components and errors
  'Show password': 'إظهار كلمة المرور',
  'Hide password': 'إخفاء كلمة المرور',
  'or continue with': 'أو تابع باستخدام',
  'Continue with {provider}': 'المتابعة باستخدام {provider}',
  'Could not start sign-in.': 'تعذّر بدء تسجيل الدخول.',
  'Sign-in was not completed.': 'لم يكتمل تسجيل الدخول.',
  'Allow photo access in your phone settings to add pictures.': 'اسمح بالوصول إلى الصور من إعدادات هاتفك لإضافة الصور.',
  'Could not read the image.': 'تعذّرت قراءة الصورة.',
};
export default settings;
