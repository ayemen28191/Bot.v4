// نظام الترجمة متعدد اللغات
interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

import { z } from "zod";

const translations: Translations = {
  ar: {
    // رسائل الخطأ العامة للترجمة
    error_translation_title: 'ترجمة رسالة الخطأ',
    original_error_message: 'رسالة الخطأ الأصلية:',
    translated_error_message: 'ترجمة رسالة الخطأ:',
    error_not_recognized: 'لم يتم التعرف على رسالة الخطأ',
    translation_not_available: 'الترجمة غير متوفرة لهذه الرسالة',
    copy_translation: 'نسخ الترجمة',
    copied_to_clipboard: 'تم النسخ إلى الحافظة',
    copy_failed: 'فشل النسخ',

    // أنواع رسائل الخطأ الشائعة
    error_network_failure: 'فشل في الاتصال بالشبكة',
    error_server_down: 'الخادم غير متاح حالياً',
    error_authentication_failed: 'فشل في المصادقة',
    error_permission_denied: 'ليس لديك صلاحية للوصول',
    error_validation_failed: 'فشل في التحقق من صحة البيانات',
    error_data_not_found: 'لم يتم العثور على البيانات',
    error_invalid_request: 'طلب غير صالح',
    error_api_limit_exceeded: 'تم تجاوز حد الاستخدام للواجهة البرمجية',
    error_database_connection: 'خطأ في الاتصال بقاعدة البيانات',
    error_database_query: 'خطأ في استعلام قاعدة البيانات',
    error_file_not_found: 'الملف غير موجود',
    error_file_too_large: 'الملف كبير جداً',
    error_unsupported_file_type: 'نوع الملف غير مدعوم',
    error_timeout: 'انتهت مهلة الطلب',
    error_server_error: 'خطأ في الخادم',
    error_bad_request: 'طلب غير صحيح',
    error_not_authorized: 'غير مصرح',
    error_forbidden: 'محظور',
    error_conflict: 'تعارض في البيانات',

    // رسائل الخطأ الخاصة بالتطبيق
    error_invalid_credentials: 'اسم المستخدم أو كلمة المرور غير صحيحة',
    error_username_exists: 'اسم المستخدم موجود بالفعل',
    error_email_exists: 'البريد الإلكتروني مستخدم بالفعل',
    error_weak_password: 'كلمة المرور ضعيفة جداً',
    error_session_expired: 'انتهت جلسة العمل، يرجى تسجيل الدخول مرة أخرى',
    error_invalid_api_key: 'مفتاح API غير صالح',
    error_api_key_missing: 'مفتاح API مفقود',
    error_api_key_expired: 'مفتاح API منتهي الصلاحية',

    // الترجمات الموجودة مسبقاً
    connection_error_message: 'لا توجد إشارات متاحة حالياً. قد يكون هناك صيانة مؤقتة أو تحديث للإشارات.',
    server_connection_error: 'الإشارات غير متاحة مؤقتاً',
    retry_connection: 'تحديث الإشارات',
    retrying_connection: 'جاري تحديث الإشارات...',
    connection_restored: 'تم تحديث الإشارات بنجاح',
    offline_mode_enabled: 'تم تفعيل الوضع المستقل',
    offline_mode_desc: 'استخدام التحليلات المحفوظة محلياً، مناسب عند عدم توفر إشارات جديدة',
    offline_mode_active: 'وضع عدم الاتصال مفعّل',
    offline_mode_https_description: 'تم تفعيل وضع عدم الاتصال تلقائيًا لأن التطبيق يعمل عبر HTTPS. سيتم استخدام البيانات المحلية.',
    online_mode_active: 'وضع الاتصال مفعّل',
    online_mode_desc: 'الحصول على آخر التحليلات والإشارات المتاحة',
    disable: 'تعطيل',
    forex_market_hours_info: 'معلومات ساعات سوق الفوركس',
    crypto_market_hours_info: 'معلومات ساعات سوق العملات المشفرة',
    stocks_market_hours_info: 'معلومات ساعات سوق الأسهم',
    forex_market_hours_info_improved: 'يتداول سوق الفوركس من الاثنين إلى الجمعة، 24 ساعة في اليوم. التقلبات الأعلى تظهر في فترات تداخل جلسات أوروبا وأمريكا.',
    crypto_market_hours_info_improved: 'سوق العملات المشفرة يعمل على مدار 24/7 بدون توقف ولا يغلق في عطلات نهاية الأسبوع.',
    stocks_market_hours_info_improved: 'أسواق الأسهم تعمل بشكل عام من الاثنين إلى الجمعة، مع ساعات تداول محددة تختلف حسب البورصة.',
    time_remaining: 'الوقت المتبقي',
    next_open: 'الفتح القادم',
    next_close: 'الإغلاق القادم',
    market_closed_notification: 'إشعار إغلاق السوق',
    opening_soon: 'سيفتح قريباً',
    opening_very_soon: 'على وشك الفتح',
    closing_soon: 'سيغلق قريباً',
    market_closes_at: 'يغلق السوق في',
    market_opens_at: 'يفتح السوق في',
    market_is_open: 'السوق مفتوح',
    market_is_closed: 'السوق مغلق',
    trading_hours: 'ساعات التداول',
    weekend_closed: 'مغلق في عطلة نهاية الأسبوع',
    timezone_info: 'معلومات المنطقة الزمنية',
    current_time_in_your_timezone: 'الوقت الحالي حسب منطقتك الزمنية',
    remaining: 'متبقي',
    best_trading_hours: 'أفضل ساعات التداول',
    market_activity: 'نشاط السوق',
    active_now: 'نشط الآن',
    inactive_now: 'غير نشط الآن',
    market_opening_soon_notification: 'سيفتح السوق قريباً، كن مستعداً للتداول',
    market_closing_soon_notification: 'سيغلق السوق قريباً، أنهِ صفقاتك',
    h: 'س',
    m: 'د',
    s: 'ث',
    refresh: 'تحديث',
    hours: 'ساعات',
    minutes: 'دقائق',
    seconds: 'ثواني',
    show_details: 'عرض التفاصيل',
    show_compact: 'عرض مختصر',
    close: 'إغلاق',
    refreshing_market_data: 'جاري تحديث بيانات السوق...',
    market_opening_now: 'السوق يفتح الآن',
    refreshing_for_market_open: 'جاري تحديث البيانات للبدء في التداول',
    time_calculation_error: 'خطأ في حساب الوقت',
    notifications_enabled: 'تم تفعيل الإشعارات',
    market_status_notifications_enabled: 'ستصلك إشعارات عند فتح وإغلاق السوق',
    enable_market_notifications: 'تفعيل إشعارات حالة السوق',
    market_closed_message_improved: 'السوق مغلق حالياً. سيفتح في {time}، تستطيع متابعة العد التنازلي أدناه وستصلك إشعارات عند فتح السوق.',
    user_management: 'المستخدمين',
    admin_panel: 'لوحة المسؤول',
    bot: 'البوت',
    bot_info: 'معلومات البوت',
    trading_bot: 'بوت التداول',
    bot_description: 'بوت التداول هو نظام آلي يحلل الأسواق المالية ويقدم إشارات تداول دقيقة لمساعدتك في اتخاذ قرارات تداول أفضل.',
    bot_features: 'مميزات البوت:',
    bot_feature_1: 'تحليل متقدم للبيانات التاريخية للسوق',
    bot_feature_2: 'إشارات تداول في الوقت الحقيقي',
    bot_feature_3: 'تحديد نقاط الدخول والخروج المثالية',
    bot_feature_4: 'تحليل مخصص للأزواج والأطر الزمنية المختلفة',
    coming_soon: 'قريباً',
    bot_coming_soon: 'سيتم إطلاق نسخة متقدمة من البوت مع ميزات التداول الآلي قريباً.',
    admin_redirect: 'المشرفين يجب أن يستخدموا لوحة المستخدمين.',

    // إدارة المستخدمين
    add_user: 'إضافة مستخدم',
    edit_user: 'تعديل المستخدم',
    delete: 'حذف',
    edit: 'تعديل',
    enter_username: 'أدخل اسم المستخدم',
    enter_display_name: 'أدخل الاسم الظاهر',
    enter_email: 'أدخل البريد الإلكتروني',
    enter_password: 'أدخل كلمة المرور',
    is_admin: 'مشرف؟',
    role: 'الدور',
    admin: 'مشرف',
    user: 'مستخدم',
    no_users_found: 'لم يتم العثور على مستخدمين',
    add: 'إضافة',
    confirm_delete: 'تأكيد الحذف',
    confirm_delete_user_message: 'هل أنت متأكد من حذف المستخدم',
    this_action_cannot_be_undone: 'هذا الإجراء لا يمكن التراجع عنه',
    search_users: 'البحث عن المستخدمين',
    admins_only: 'المشرفين فقط',
    // إضافة الترجمات الجديدة تنتهي هنا

    // الترجمات الموجودة مسبقاً
    go_online: 'وضع متصل',
    offline_mode: 'وضع غير متصل',
    expected_price_change: 'التغير المتوقع في السعر',
    export_chat: 'تصدير المحادثة',
    signal_strength: 'قوة الإشارة',
    import_chat: 'استيراد المحادثة',
    online_mode: 'وضع الاتصال',
    go_offline: 'وضع عدم الاتصال',
    themes: 'السمات',
    app_name: 'بينار للتحليل المشترك',
    app_name_short: 'تحليل البيانات الثنائية',
    signals: 'الإشارات',
    indicators: 'المؤشرات',
    signal: 'إشارة',
    group_chat: 'المحادثات الجماعية',
    group_chats: 'الدردشة',
    settings: 'الإعدادات',
    chat: 'الدردشة',
    notifications: 'الإشعارات',
    timezone: 'المنطقة الزمنية',
    language: 'اللغة',
    theme: 'السمة',
    save_settings: 'حفظ الإعدادات',
    settings_saved: 'تم حفظ الإعدادات بنجاح',
    auto_timezone: 'الضبط التلقائي (حسب توقيت الجهاز)',
    utc: 'التوقيت العالمي المنسق (UTC)',
    riyadh: 'الرياض (UTC+3)',
    dubai: 'دبي (UTC+4)',
    kuwait: 'الكويت (UTC+3)',
    doha: 'الدوحة (UTC+3)',
    jerusalem: 'القدس (UTC+2/+3)',
    cairo: 'القاهرة (UTC+2)',
    london: 'لندن (UTC+0/+1)',
    paris: 'باريس (UTC+1/+2)',
    new_york: 'نيويورك (UTC-5/-4)',
    tokyo: 'طوكيو (UTC+9)',
    hong_kong: 'هونغ كونغ (UTC+8)',
    sydney: 'سيدني (UTC+10/+11)',
    send_message: 'إرسال رسالة',
    type_message: 'اكتب رسالتك هنا...',
    typing: 'جاري الكتابة',
    online: 'متصل',
    offline: 'غير متصل',
    connected: 'متصل',
    yesterday: 'أمس',
    profile: 'الملف الشخصي',
    api_keys: 'مفاتيح API',
    reset_password: 'إعادة تعيين كلمة المرور',
    new_user: 'مستخدم جديد',
    save: 'حفظ',
    cancel: 'إلغاء',
    choose_app_language: 'اختر لغة التطبيق',
    app_version: 'إصدار التطبيق',
    dark_mode: 'الوضع الداكن',
    light_mode: 'الوضع الفاتح',
    system_theme: 'حسب النظام',
    wait: 'انتظر',
    analyzing: 'جاري التحليل...',
    waiting_for_signal: 'انتظار الإشارة...',
    available_timeframes_only: 'الأطر المتاحة فقط',
    next_signal_in: 'الإشارة التالية خلال',
    market_analysis: 'تحليل السوق',
    technical_indicators: 'المؤشرات الفنية',
    strength: 'القوة',
    bullish: 'صعودي',
    bearish: 'هبوطي',
    account_info: 'معلومات الحساب',
    app_user: 'اسم مستخدم الظاهر للمستخدم',
    free_account: 'السحاب اشتراك سنوي مميز',
    signal_notifications: 'إشعارات الإشارات',
    receive_signal_notifications: 'تلقي إشعارات عند ظهور إشارات جديدة',
    market_alerts: 'تنبيهات السوق',
    receive_market_alerts: 'تلقي إشعارات بفتح وإغلاق الأسواق',
    choose_timezone: 'اختر المنطقة الزمنية',
    detected_timezone: 'المنطقة الزمنية المكتشفة',
    timezone_description: 'تؤثر المنطقة الزمنية على كيفية عرض أوقات الإشارات وفتح/إغلاق الأسواق',
    auto_timezone_description: 'المنطقة الزمنية مضبوطة تلقائيًا من خلال توقيت جهازك',
    market: 'سوق',
    market_open: 'السوق مفتوح',
    market_closed: 'السوق مغلق',
    market_opening: 'سيفتح السوق في',
    market_closing: 'سيغلق السوق في',
    technical_analysis: 'التحليل الفني',
    get_signal: 'الحصول على إشارة',
    signal_cooldown: 'انتظر للإشارة التالية',
    second: 'ثانية',
    probability: 'احتمالية',
    current_price: 'السعر الحالي',
    select_trading_platform: 'اختر منصة التداول',
    select_trading_pair: 'اختر زوج التداول',
    signal_description: 'وصف الإشارة',
    signal_up: 'إشارة شراء',
    signal_down: 'إشارة بيع',
    signal_wait: 'في انتظار الإشارة',
    current_signal: 'الإشارة الحالية',
    wait_signal: 'انتظار الإشارة...',
    analyzing_signal: 'جاري تحليل الإشارة',
    market_closed_title: 'السوق مغلق',
    cooldown_period: 'فترة الانتظار',
    previous_signals: 'الإشارات السابقة',
    show: 'عرض',
    hide: 'إخفاء',
    forex: 'العملات الأجنبية',
    crypto: 'العملات المشفرة',
    stocks: 'الأسهم',
    order_types: 'أنواع الأوامر:',
    features: 'المزايا:',
    min_deposit: 'الحد الأدنى للإيداع:',
    market_order: 'سوق',
    limit_order: 'محدد',
    stop_order: 'إيقاف',
    stop_limit: 'حد الإيقاف',
    stop_limit_order: 'إيقاف حد',
    binary_options: 'خيارات ثنائية',
    turbo: 'توربو',
    copy_traders: 'نسخ المتداولين',
    forex_trading: 'فوركس',
    crypto_trading: 'كريبتو',
    technical_analysis_feature: 'تحليل فني',
    advanced_indicators: 'مؤشرات متقدمة',
    stability: 'الاستقرار',
    ease_of_use: 'سهولة الاستخدام',
    modern_platform: 'منصة حديثة',
    high_payouts: 'دفعات مرتفعة',
    simple_interface: 'واجهة بسيطة',
    arabic_support: 'دعم عربي',
    comprehensive_platform: 'منصة شاملة',
    advanced_charts: 'رسوم بيانية متقدمة',
    cryptocurrencies: 'عملات مشفرة',
    low_fees: 'رسوم منخفضة',
    fast_deposits: 'إيداعات سريعة',
    bonuses: 'مكافآت',
    reliable_platform: 'منصة موثوقة',
    fast_trading: 'تداول سريع',
    social_trading: 'تداول اجتماعي',
    wide_range_currencies: 'تشكيلة عملات واسعة',
    wide_crypto_selection: 'تشكيلة عملات مشفرة واسعة',
    digital_options: 'خيارات رقمية',
    copy_trading: 'نسخ تداول المتداولين',
    multiple_platforms: 'منصات متعددة',
    diverse_trading_options: 'خيارات متنوعة للتداول',
    select_timeframe: 'اختر الإطار الزمني',
    wait_time_message: 'يرجى الانتظار {time} ثانية للحصول على إشارة جديدة',
    analyzing_message: 'جاري تحليل {pair} في إطار {timeframe}',
    market_closed_message: 'لا يمكن الحصول على إشارات عندما يكون السوق مغلقًا. يفتح {time}',
    new_signal_message: 'إشارة {type} جديدة',
    target_price: 'السعر المتوقع',
    higher: 'أعلى',
    lower: 'أقل',
    prediction_valid_for: 'التوقع صالح لـ',
    timeframe_impacts_signal: 'الإطار الزمني يؤثر على الإشارة',
    expected_rise: 'ارتفاع متوقع',
    expected_drop: 'انخفاض متوقع',
    expected_price_rise_in: 'ارتفاع متوقع خلال',
    expected_price_drop_in: 'انخفاض متوقع خلال',
    expected_price_rise_in_timeframe: 'ارتفاع السعر متوقع خلال الإطار الزمني',
    expected_price_drop_in_timeframe: 'انخفاض السعر متوقع خلال الإطار الزمني',
    bullish_trend: 'اتجاه صعودي',
    bearish_trend: 'اتجاه هبوطي',
    timeframe_1m: '1 دقيقة',
    timeframe_1m_short: '1د',
    timeframe_5m: '5 دقائق',
    timeframe_5m_short: '5د',
    timeframe_15m: '15 دقيقة',
    timeframe_15m_short: '15د',
    timeframe_1h: 'ساعة',
    timeframe_1h_short: '1س',
    timeframe_4h: '4 ساعات',
    timeframe_4h_short: '4س',
    timeframe_1d: 'يوم',
    timeframe_1d_short: '1ي',
    all_indicators: 'كل المؤشرات',
    trend: 'الاتجاه',
    oscillator: 'التذبذب',
    momentum: 'الزخم',
    volatility: 'التقلب',
    volume: 'الحجم',
    moving_average: 'المتوسط المتحرك',
    indicator_full_rsi: 'مؤشر القوة النسبية',
    indicator_full_macd: 'ماكد',
    bollinger_bands: 'بولينجر باند',
    money_flow: 'مؤشر التدفق المالي',
    stochastic: 'ستوكاستيك',
    momentum_indicator: 'مؤشر الزخم',
    volatility_indicator: 'مؤشر التقلب',
    ma_description: 'مؤشر المتوسط المتحرك البسيط يشير إلى اتجاه صعودي على المدى القصير',
    rsi_description: 'مؤشر القوة النسبية يتجاوز 70، ما يشير إلى تشبع شرائي',
    macd_description: 'تقاطع إيجابي لمؤشر الماكد يشير إلى زخم صعودي',
    bb_description: 'السعر يتحرك ضمن نطاق البولينجر باند المتوسط',
    mfi_description: 'تدفق مالي إيجابي يشير إلى قوة شرائية متزايدة',
    stoch_description: 'مؤشر ستوكاستيك دون مستوى 30، ما يشير إلى تشبع بيعي',
    momentum_description: 'الزخم السلبي يشير إلى ضعف في قوة الاتجاه الصعودي',
    volatility_description: 'ارتفاع متوسط في التقلب السعري',
    indicator_value: 'القيمة',
    timeframe: 'الإطار الزمني',
    buy: 'شراء',
    sell: 'بيع',
    neutral: 'محايد',
    indicator_rsi: 'RSI',
    indicator_macd: 'MACD',
    indicator_ema: 'EMA',
    indicator_bb: 'بولينجر',
    indicator_stoch: 'ستوكاستيك',
    indicator_adx: 'ADX',
    loading: 'جاري التحميل...',
    loading_page: 'جاري تحميل الصفحة...',
    offline_mode_auto_enabled_title: 'تم تفعيل وضع عدم الاتصال تلقائياً',
    offline_mode_auto_enabled_description: 'تم تفعيل وضع عدم الاتصال تلقائياً لتحسين الأداء في بيئة Replit HTTPS. ستعمل جميع ميزات التطبيق ولكن بدون اتصال مباشر بالخادم.',
    initializing_app: 'جاري تهيئة التطبيق...',
    please_wait: 'يرجى الانتظار...',
    platform_metatrader5: 'ميتاتريدر 5',
    platform_metatrader4: 'ميتاتريدر 4',
    platform_eobroker: 'إكسبرت أوبشن',
    platform_binomo: 'بينومو',
    platform_iqoption: 'آي كيو أوبشن',
    platform_binance: 'بينانس',
    platform_pocketoption: 'بوكيت أوبشن',
    platform_olymptrade: 'أوليمب تريد',
    platform_etoro: 'إيتورو',
    platform_kucoin: 'كوكوين',
    platform_deriv: 'ديريف',
    login: "تسجيل الدخول",
    create_account: "إنشاء حساب جديد",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    confirm_password: "تأكيد كلمة المرور",
    display_name: "الاسم الظاهر",
    email: "البريد الإلكتروني",
    password_mismatch: "كلمات المرور غير متطابقة",
    dont_have_account: "ليس لديك حساب؟ سجل الآن",
    already_have_account: "لديك حساب بالفعل؟ سجل دخولك",
    app_welcome: "مرحباً بك في تطبيق Binar Join Analytic",
    app_description: "منصة متكاملة لتحليل إشارات التداول في الأسواق المالية مع دعم متعدد اللغات وميزات متقدمة للتحليل والمتابعة.",
    logout: "تسجيل الخروج",
    logout_success: "تم تسجيل الخروج بنجاح",

    // إضافة النصوص المفقودة
    error_checking_connection: "خطأ في فحص الاتصال",
    backup_data_updated: "تم تحديث بيانات النسخة الاحتياطية",
    connection_check_error: "خطأ في فحص الاتصال:",
    no_signals_available: "لا توجد إشارات متاحة حالياً",
    temporary_maintenance: "قد يكون هناك صيانة مؤقتة أو تحديث للإشارات",
    signals_temporarily_unavailable: "الإشارات غير متاحة مؤقتاً",
    updating_signals: "جاري تحديث الإشارات...",
    signals_updated_successfully: "تم تحديث الإشارات بنجاح",
    independent_mode_activated: "تم تفعيل الوضع المستقل",

    // صفحة 404
    page_not_found_404: "404 الصفحة غير موجودة",
    page_not_found_description: "هل نسيت إضافة الصفحة إلى نظام التوجيه؟",

    // السمات (Themes)
    toggle_theme: "تبديل الوضع",
    light_theme: "فاتح", 
    dark_theme: "مظلم",
    system_theme_short: "النظام",

    // أخطاء الاتصال
    reconnection_successful: "تم إعادة الاتصال بنجاح",
    connection_restored_data_updated: "تم استعادة الاتصال بنجاح وتحديث البيانات",
    data_update_in_progress: "تحديث البيانات مستمر",
    fetching_latest_data_auto_retry: "نحن نعمل على جلب أحدث البيانات. سنحاول مرة أخرى تلقائيًا",
    offline_mode_enabled_success: "تم تفعيل وضع عدم الاتصال",
    offline_mode_enabled_description: "يمكنك الآن استخدام التطبيق بدون اتصال بالإنترنت. ستتم مزامنة البيانات عند عودة الاتصال.",
    offline_mode_enable_failed: "تعذر تفعيل وضع عدم الاتصال",
    offline_mode_enable_error: "حدث خطأ أثناء محاولة تفعيل وضع عدم الاتصال. يرجى المحاولة مرة أخرى.",
    retrying_attempt: "جاري المحاولة...",
    enable_offline_mode: "تفعيل وضع عدم الاتصال",
    offline_mode_connection_issue: "إذا استمرت مشكلة الاتصال، يمكنك تفعيل وضع عدم الاتصال للاستمرار في استخدام التطبيق.",
    offline_mode_data_storage: "في وضع عدم الاتصال، سيتم تخزين بياناتك محلياً ومزامنتها عند عودة الاتصال.",
    retry_count: "عدد المحاولات:",
    data_analysis_update_message: "تحديث بيانات التحليل جارٍ. يمكنك الانتظار قليلاً أو استخدام وضع التحليل المحلي للاستمرار.",

    // Console.log messages for internationalization
    https_detected_replit: "تم اكتشاف HTTPS في بيئة Replit - تفعيل وضع عدم الاتصال تلقائيًا",
    offline_mode_auto_activated_replit: "تم تفعيل وضع عدم الاتصال تلقائيًا بسبب بيئة Replit HTTPS",
    offline_mode_enabled_trading_page: "تفعيل وضع عدم الاتصال في صفحة إشارات التداول",
    offline_mode_disabled_trading_page: "تعطيل وضع عدم الاتصال في صفحة إشارات التداول",
    websocket_security_error_detected: "اكتشاف خطأ أمان WebSocket في بيئة HTTPS، تفعيل وضع عدم الاتصال تلقائيًا",
    using_locally_stored_price: "استخدام السعر المخزن محلياً:",
    could_not_read_stored_price: "تعذر قراءة السعر المخزن محلياً:",
    fetching_price_offline_mode: "جاري استرجاع السعر في وضع عدم الاتصال",
    using_default_price_offline: "استخدام سعر افتراضي في وضع عدم الاتصال",
    chat_simulation_initialized: "تم تهيئة نظام المحاكاة للدردشة",
    backup_data_updated_log: "تم تحديث بيانات النسخة الاحتياطية",
    using_backup_data_offline: "استخدام بيانات النسخة الاحتياطية في وضع عدم الاتصال",
    error_exporting_chat: "حدث خطأ أثناء تصدير المحادثة:",
    error_parsing_imported_chat: "خطأ في تحليل بيانات المحادثة المستوردة:",
    error_importing_chat: "خطأ في استيراد المحادثة:",
    error_notifications_permission: "خطأ في طلب إذن الإشعارات:",
    error_toggling_connection_mode: "خطأ في تبديل وضع الاتصال:",
    default_api_keys_loaded: "تم جلب المفاتيح الافتراضية بنجاح",
    invalid_file_format: "تنسيق الملف غير صالح",
    failed_to_read_content: "فشل قراءة المحتوى",
    
    // Additional console messages
    theme_config_error: "فشل في تطبيق إعدادات theme.json:",
    could_not_read_stored_price_warn: "تعذر قراءة السعر المخزن محليًا:",
    market_analysis_for: "تحليل السوق لـ:",
    market_analysis_response: "استجابة تحليل السوق:",
    signal_received_from_server: "الإشارة المستلمة من الخادم:",
    signal_type_received: "نوع الإشارة المستلمة:",
    signal_after_processing: "الإشارة بعد المعالجة:",
    signal_converted_to_up: "تم تحويل الإشارة إلى UP",
    signal_converted_to_down: "تم تحويل الإشارة إلى DOWN",
    signal_no_match_using_wait: "الإشارة لم تتطابق مع أي حالة، استخدام WAIT",
    
    // Toast messages for ChatPage
    export_success: "تم تصدير المحادثة بنجاح",
    export_success_desc: "تم حفظ المحادثة في ملف",
    export_error: "خطأ في التصدير",
    export_error_desc: "حدث خطأ أثناء محاولة تصدير المحادثة",
    import_success: "تم استيراد المحادثة بنجاح",
    import_success_desc: "تم استيراد الرسائل",
    import_error: "خطأ في الاستيراد",
    import_error_desc: "الملف غير صالح أو معطوب",
    read_content_failed: "فشل قراءة المحتوى",
    notifications_blocked: "تم منع الإشعارات",
    
    // Toast messages for TradingSignalPage
    offline_mode_enabled_title: "تم تفعيل وضع عدم الاتصال",
    offline_mode_enabled_desc: "سيتم استخدام البيانات المخزنة محليًا. بعض الميزات قد تكون محدودة.",
    connection_restored_title: "تم استعادة الاتصال",
    connection_restored_desc: "تم الاتصال بالخادم بنجاح.",
    signal_analysis_pending_title: "تحليل الإشارات جاري",
    signal_analysis_pending_desc: "نعمل على تحديث تحليلات السوق. يمكنك الاستمرار في استخدام البيانات المخزنة.",
    cached_data_used_title: "استخدام بيانات مخزنة",
    cached_data_used_desc: "تم استلام سعر غير صالح من الخادم، يتم استخدام بيانات محلية.",
    data_analysis_error_title: "خطأ في تحليل البيانات",
    data_analysis_error_desc: "لم نتمكن من الحصول على أحدث البيانات، يتم استخدام بيانات محلية.",
    local_mode_switch_title: "تحويل للوضع المحلي",
    local_mode_switch_desc: "تم التبديل لاستخدام الخوارزمية المحلية بسبب فشل الاتصال مع الخادم.",
    data_updating_title: "جاري تحديث البيانات",
    data_updating_desc: "يتم حاليًا تحديث بيانات السوق وتحليل الاتجاهات.",
    
    // Additional messages for TradingSignalPage
    current_price_label: "السعر الحالي",
    cached_data_loaded_desc: "تم تحميل البيانات المخزنة مسبقاً لضمان استمرارية التحليل.",
    enable_offline_mode_button: "تفعيل وضع عدم الاتصال",
    updating_price_data_desc: "نعمل على تحديث بيانات الأسعار. يمكنك تفعيل وضع التحليل المحلي للاستمرار.",
    calculating_enhanced_target_price: "حساب السعر المتوقع المحسّن:",
    offline_mode_reason_https_websocket: "قيود اتصال WebSocket في HTTPS",
    offline_mode_reason_network: "خطأ في الشبكة",
    offline_mode_reason_api_limit: "تم تجاوز حد استخدام API",
    offline_mode_reason_timeout: "انتهت مهلة الاتصال",
    offline_mode_reason_unknown: "سبب غير معروف",
    offline_mode_activation_reason: "سبب التفعيل:",
    
    // AdminLayout translations
    admin_login_required: "يجب تسجيل الدخول كمشرف للوصول إلى لوحة التحكم",
    api_keys_label: "مفاتيح API",
    deployment_servers_label: "خوادم النشر",
    
    // IndicatorsPage translations
    market_status_fetch_error: "خطأ في جلب حالة السوق:",
    market_status_update_error: "خطأ في تحديث حالة السوق:",
    market_status_api_error: "فشل في جلب حالة السوق",
    updated: "تم التحديث",
    indicator_updated: "تم تحديث بيانات المؤشر بنجاح",
    
    // Console messages from hooks and other files
    heatmap_data_fetch_error: "خطأ في جلب بيانات الخريطة الحرارية:",
    using_cached_heatmap_data: "استخدام بيانات مخزنة من heatmap_data، عمر البيانات:",
    using_cached_pair_data: "استخدام بيانات مخزنة للزوج",
    pair_data_fetch_error: "خطأ في استرجاع بيانات",
    backup_data_fetch_error: "خطأ في استرجاع بيانات النسخة الاحتياطية:",
    local_heatmap_data_error: "خطأ في استرجاع بيانات الخريطة الحرارية من التخزين المحلي:",
    analysis_results_from_real_data: "نتائج التحليل من البيانات الحقيقية:",
    market_analysis_error: "خطأ في تحليل السوق:",
    retry_fetch_attempt: "محاولة جلب السعر فشلت، جاري إعادة المحاولة",
    invalid_price_received: "تم استلام سعر غير صالح:",
    fetch_pair_price_error: "خطأ في جلب سعر الزوج:",
    using_cached_price_on_failure: "استخدام السعر المخزن محليًا بسبب فشل الطلب:",
    using_known_volatility: "استخدام التقلب التاريخي المعروف لـ",
    using_estimated_volatility: "استخدام تقلب تقديري لـ",
    enhanced_base_volatility_factor: "معامل التقلب الأساسي المحسّن:",
    expected_change_enhanced: "التغير المتوقع بعد تحسين العوامل:",
    final_enhanced_target_price: "السعر المستهدف النهائي (محسّن):",
    current_price_updated: "تم تحديث السعر الحالي:",
    received_analysis_results: "نتائج التحليل المستلمة:",
    data_age: "عمر البيانات",

    // Settings and general success/error messages  
    settings_saved_successfully: 'تم حفظ الإعدادات بنجاح',
    language_preference_saved: 'تم حفظ تفضيل اللغة الخاص بك.',
    error_saving_settings: 'خطأ في حفظ الإعدادات',
    success: 'نجح',
    error: 'خطأ',
    failed: 'فشل',
    successfully_added: 'تم الإضافة بنجاح',
    successfully_updated: 'تم التحديث بنجاح',
    successfully_deleted: 'تم الحذف بنجاح',
    user_added_successfully: 'تم إضافة المستخدم بنجاح',
    user_updated_successfully: 'تم تحديث معلومات المستخدم بنجاح',
    user_deleted_successfully: 'تم حذف المستخدم بنجاح',
    failed_to_add_user: 'فشل في إضافة المستخدم',
    failed_to_update_user: 'فشل في تحديث معلومات المستخدم',
    failed_to_delete_user: 'فشل في حذف المستخدم',
    failed_to_fetch_users: 'فشل في جلب قائمة المستخدمين',
    
    // Server and deployment messages
    server_added_successfully: 'تم إضافة الخادم بنجاح',
    server_updated_successfully: 'تم تحديث معلومات الخادم بنجاح',
    server_deleted_successfully: 'تم حذف الخادم بنجاح',
    connected_successfully: 'تم الاتصال بنجاح',
    connection_failed: 'فشل الاتصال',
    deployed_successfully: 'تم النشر بنجاح',
    deployment_failed: 'فشل النشر',
    failed_to_fetch_servers: 'فشل في جلب قائمة الخوادم',
    failed_to_fetch_deployment_logs: 'فشل في جلب سجلات النشر',
    text_copied_to_clipboard: 'تم نسخ النص إلى الحافظة',
    
    // API Keys messages
    api_key_saved_successfully: 'تم حفظ مفتاح API بنجاح',

    api_key_deleted_successfully: 'تم حذف مفتاح API بنجاح',
    failed_to_delete_api_key: 'فشل في حذف مفتاح API',
    failed_to_fetch_api_keys: 'فشل في جلب مفاتيح API',
    key_list_updated_successfully: 'تم تحديث قائمة المفاتيح بنجاح',
    failed_to_update_key_list: 'فشل في تحديث قائمة المفاتيح',
    
    // Auth messages
    login_successful: 'تم تسجيل الدخول بنجاح',
    account_created_successfully: 'تم إنشاء الحساب بنجاح',
    account_creation_failed: 'فشل إنشاء الحساب',
    logout_successful: 'تم تسجيل الخروج بنجاح',
    logout_failed: 'فشل تسجيل الخروج',
    
    // Admin messages
    admin_password_reset_successfully: 'تم إعادة تعيين كلمة مرور المسؤول بنجاح',
    passwords_do_not_match: 'كلمات المرور غير متطابقة',
    password_must_be_longer_than_6_characters: 'كلمة المرور يجب أن تكون أطول من 6 أحرف',
    
    // System updater messages
    system_update_completed: 'تم اكتمال تحديث النظام',
    system_update_failed: 'فشل تحديث النظام',
    
    // Trading and market messages
    refreshing_data: 'جاري تحديث البيانات',
    fetching_latest_prices: 'نعمل على جلب أحدث الأسعار. الرجاء الانتظار أو المحاولة مرة أخرى لاحقاً.',

    // Trading pairs names
    'EUR/USD': 'يورو / دولار أمريكي',
    'GBP/USD': 'جنيه إسترليني / دولار أمريكي',
    'USD/JPY': 'دولار أمريكي / ين ياباني',
    'USD/CHF': 'دولار أمريكي / فرنك سويسري',
    'EUR/JPY': 'يورو / ين ياباني',
    'GBP/JPY': 'جنيه إسترليني / ين ياباني',
    'BTC/USDT': 'بيتكوين / تيثر',
    'ETH/USDT': 'إيثريوم / تيثر',
    'XRP/USDT': 'ريببل / تيثر',
    'AAPL': 'شركة أبل',
    'MSFT': 'شركة مايكروسوفت',
    'GOOGL': 'شركة جوجل',
    'AMZN': 'شركة أمازون',

    // Time units (missing keys)
    second_unit: 'ثانية',

    // Admin Reset Password
    admin_reset_password_title: 'إعادة تعيين كلمة مرور المسؤول',
    admin_reset_password_desc: 'يمكنك تعيين كلمة مرور جديدة للمسؤول هنا. يرجى استخدام كلمة مرور قوية وآمنة.',
    new_password: 'كلمة المرور الجديدة',
    enter_new_password: 'أدخل كلمة المرور الجديدة',
    re_enter_password: 'أعد إدخال كلمة المرور',
    reset_password_btn: 'إعادة تعيين كلمة المرور',
    back_to_dashboard: 'العودة إلى لوحة التحكم',
    resetting: 'جاري إعادة التعيين...',

    // API Keys Management
    api_keys_management: 'إدارة مفاتيح API',
    api_key_name: 'اسم المفتاح',
    api_key_value: 'قيمة المفتاح',
    api_key_description: 'وصف المفتاح',
    is_secret: 'سري؟',
    key_name_required: 'اسم المفتاح مطلوب',
    key_value_required: 'قيمة المفتاح مطلوبة',
    test_key: 'اختبار المفتاح',
    testing: 'جاري الاختبار...',
    valid: 'صالح',
    invalid: 'غير صالح',
    untested: 'لم يتم اختباره',

    // Service descriptions for API keys
    twelvedata_api_title: 'مفتاح TwelveData API',
    twelvedata_api_desc: 'يستخدم لجلب بيانات أسعار الفوركس والأسهم. يمكنك الحصول على مفتاح مجاني من الموقع الرسمي.',
    primary_api_title: 'مفتاح Alpha Vantage الرئيسي',
    primary_api_desc: 'المفتاح الرئيسي لخدمة Alpha Vantage لبيانات الأسهم والمؤشرات المالية.',
    backup_api_title: 'مفاتيح Alpha Vantage الاحتياطية',
    backup_api_desc: 'قائمة مفاتيح احتياطية لخدمة Alpha Vantage. يجب فصل المفاتيح بفواصل.',
    binance_api_title: 'مفتاح Binance API',
    binance_api_desc: 'يستخدم للوصول إلى بيانات أسعار العملات المشفرة من منصة Binance.',
    binance_secret_title: 'المفتاح السري لـ Binance',
    binance_secret_desc: 'المفتاح السري المطلوب للمصادقة مع واجهة Binance API.',
    market_api_title: 'مفتاح عام للسوق',
    market_api_desc: 'مفتاح عام يستخدم للوصول إلى خدمات بيانات السوق المختلفة.',
    service_url: 'رابط الخدمة',
    usage: 'الاستخدام',
    required: 'مطلوب',
    optional: 'اختياري',
    category: 'الفئة',
    market_data: 'بيانات السوق',
    cryptocurrency: 'عملات مشفرة',
    general: 'عام',

    // Additional API Keys Management messages
    failed_to_get_api_keys: 'فشل في جلب مفاتيح API',
    saved_successfully: 'تم الحفظ',
    saved_key_successfully: 'تم حفظ المفتاح {key} بنجاح',

    test_successful: 'اختبار ناجح',
    test_failed: 'اختبار فاشل',
    failed_to_test_key: 'فشل في اختبار المفتاح',
    deleted_successfully: 'تم الحذف',
    deleted_key_successfully: 'تم حذف المفتاح {key} بنجاح',
    failed_to_delete_key: 'فشل في حذف المفتاح {key}',
    update_key: 'تحديث المفتاح',
    test_key_button: 'فحص المفتاح',
    add_key: 'إضافة المفتاح',
    update_key_title: 'تحديث المفتاح: {key}',
    add_new_key: 'إضافة مفتاح جديد',
    api_key_example: 'مثال: MARKET_API_KEY',
    enter_key_value: 'أدخل قيمة المفتاح',
    key_purpose_description: 'وصف الغرض من هذا المفتاح',
    updated_successfully: 'تم التحديث',
    updated_keys_successfully: 'تم تحديث قائمة المفاتيح بنجاح',
    failed_to_update_keys: 'فشل في تحديث قائمة المفاتيح',

    // Error and success messages
    failed_to_reset_password: 'فشل في إعادة تعيين كلمة المرور',
    error_occurred_while_resetting_password: 'حدث خطأ أثناء إعادة تعيين كلمة المرور',

    // Additional common messages
    confirm_delete_key: 'هل أنت متأكد من حذف المفتاح',
    unknown_error: 'خطأ غير معروف',
    please_login_to_access: 'يرجى تسجيل الدخول للوصول إلى هذه الصفحة',
    no_permission_access: 'ليس لديك صلاحية للوصول إلى هذه الصفحة',

    // Trading platforms
    metatrader4: 'ميتاتريدر 4',
    metatrader5: 'ميتاتريدر 5',
    binomo: 'بينومو',
    deriv: 'ديريف',
    exness: 'إكسنس',
    fxpro: 'إف إكس برو',
    icmarkets: 'آي سي ماركتس',
    xm: 'إكس إم',
    xtb: 'إكس تي بي',
    alpari: 'ألباري',
    plus500: 'بلس 500',
    etoro: 'إي تورو',
    avatrade: 'أفاتريد',
    pepperstone: 'بيبرستون',
    hotforex: 'هوت فوركس',
    trading_platform: 'منصة التداول',
    selected_platform: 'المنصة المختارة',

    // Trading messages
    analysis_data_updating: 'تحديث بيانات التحليل جارٍ. يمكنك استخدام وضع التحليل المحلي للاستمرار في استخدام التطبيق بكامل مميزاته.',

    // Deployment stages
    deployment_stage_connection: 'الاتصال',
    deployment_stage_package: 'إنشاء الحزمة',
    deployment_stage_upload: 'رفع الملفات',
    deployment_stage_execution: 'التنفيذ',
    deployment_stage_completion: 'الاكتمال'
  },
  en: {
    // Error message translations
    error_translation_title: 'Error Message Translation',
    original_error_message: 'Original Error Message:',
    translated_error_message: 'Translated Error Message:',
    error_not_recognized: 'Error message not recognized',
    translation_not_available: 'Translation not available for this message',

    // Common error types
    error_network_failure: 'Network connection failure',
    error_server_down: 'Server currently unavailable',
    error_authentication_failed: 'Authentication failed',
    error_permission_denied: 'Permission denied for this action',
    error_validation_failed: 'Data validation failed',
    error_data_not_found: 'Data not found',
    error_invalid_request: 'Invalid request',
    error_api_limit_exceeded: 'API usage limit exceeded',
    error_database_connection: 'Database connection error',
    error_database_query: 'Database query error',
    error_file_not_found: 'File not found',
    error_file_too_large: 'File is too large',
    error_unsupported_file_type: 'Unsupported file type',
    error_timeout: 'Request timeout',
    error_server_error: 'Server error',
    error_bad_request: 'Bad request',
    error_not_authorized: 'Not authorized',
    error_forbidden: 'Forbidden',
    error_conflict: 'Data conflict',

    // Application-specific errors
    error_invalid_credentials: 'Invalid username or password',
    error_username_exists: 'Username already exists',
    error_email_exists: 'Email already in use',
    error_weak_password: 'Password is too weak',
    error_session_expired: 'Session expired, please log in again',
    error_invalid_api_key: 'Invalid API key',
    error_api_key_missing: 'API key is missing',
    error_api_key_expired: 'API key has expired',

    // Existing translations
    connection_error_message: 'No signals available at the moment. There might be temporary maintenance or signal updates in progress.',
    server_connection_error: 'Signals Temporarily Unavailable',
    retry_connection: 'Update Signals',
    retrying_connection: 'Updating Signals...',
    connection_restored: 'Signals Updated Successfully',
    offline_mode_enabled: 'Independent Mode Activated',
    offline_mode_desc: 'Using locally saved analytics, ideal when new signals are unavailable',
    offline_mode_active: 'Offline Mode Active',
    offline_mode_https_description: 'Offline mode was automatically enabled because the app is running over HTTPS. Local data will be used.',
    online_mode_active: 'Online Mode Active',
    online_mode_desc: 'Getting the latest analytics and available signals',
    disable: 'Disable',
    forex_market_hours_info: 'Forex Market Hours Information',
    crypto_market_hours_info: 'Crypto Market Hours Information',
    stocks_market_hours_info: 'Stock Market Hours Information',
    forex_market_hours_info_improved: 'Forex market trades Monday through Friday, 24 hours a day. Highest volatility occurs during overlapping sessions between Europe and America.',
    crypto_market_hours_info_improved: 'Cryptocurrency markets operate 24/7 non-stop and don\'t close on weekends.',
    stocks_market_hours_info_improved: 'Stock markets generally operate Monday through Friday, with specific trading hours that vary by exchange.',
    time_remaining: 'Time Remaining',
    next_open: 'Next Open',
    next_close: 'Next Close',
    market_closed_notification: 'Market Closed Notification',
    opening_soon: 'Opening Soon',
    opening_very_soon: 'Opening Very Soon',
    closing_soon: 'Closing Soon',
    market_closes_at: 'Market closes at',
    market_opens_at: 'Market opens at',
    market_is_open: 'Market is open',
    market_is_closed: 'Market is closed',
    trading_hours: 'Trading Hours',
    weekend_closed: 'Closed on weekends',
    timezone_info: 'Timezone Information',
    current_time_in_your_timezone: 'Current time in your timezone',
    remaining: 'remaining',
    best_trading_hours: 'Best Trading Hours',
    market_activity: 'Market Activity',
    active_now: 'Active Now',
    inactive_now: 'Inactive Now',
    market_opening_soon_notification: 'Market opening soon, get ready to trade',
    market_closing_soon_notification: 'Market closing soon, finalize your trades',
    h: 'h',
    m: 'm',
    s: 's',
    refresh: 'Refresh',
    hours: 'Hours',
    minutes: 'Minutes',
    seconds: 'Seconds',
    show_details: 'Show Details',
    show_compact: 'Show Compact',
    close: 'Close',
    refreshing_market_data: 'Refreshing market data...',
    market_opening_now: 'Market Opening Now',
    refreshing_for_market_open: 'Refreshing data to begin trading',
    time_calculation_error: 'Time calculation error',
    notifications_enabled: 'Notifications Enabled',
    market_status_notifications_enabled: 'You will receive notifications when markets open and close',
    enable_market_notifications: 'Enable Market Notifications',
    market_closed_message_improved: 'Market is currently closed. It will open at {time}. You can follow the countdown below and will be notified when the market opens.',
    user_management: 'Users',
    admin_panel: 'Admin Panel',
    bot: 'Bot',
    bot_info: 'Bot Info',
    trading_bot: 'Trading Bot',
    bot_description: 'Trading bot is an automated system that analyzes financial markets and provides accurate trading signals to help you make better trading decisions.',
    bot_features: 'Bot Features:',
    bot_feature_1: 'Advanced historical market data analysis',
    bot_feature_2: 'Real-time trading signals',
    bot_feature_3: 'Optimal entry and exit points identification',
    bot_feature_4: 'Custom analysis for different pairs and timeframes',
    coming_soon: 'Coming Soon',
    bot_coming_soon: 'An advanced version of the bot with automated trading features will be released soon.',
    admin_redirect: 'Admins should use the Users panel.',

    // User management translations
    add_user: 'Add User',
    edit_user: 'Edit User',
    delete: 'Delete',
    edit: 'Edit',
    enter_username: 'Enter username',
    enter_display_name: 'Enter display name',
    enter_email: 'Enter email',
    enter_password: 'Enter password',
    is_admin: 'Admin?',
    role: 'Role',
    admin: 'Admin',
    user: 'User',
    no_users_found: 'No users found',
    add: 'Add',
    confirm_delete: 'Confirm Delete',
    confirm_delete_user_message: 'Are you sure you want to delete user',
    this_action_cannot_be_undone: 'This action cannot be undone',
    search_users: 'Search users',
    admins_only: 'Admins only',

    // Settings and general success/error messages
    settings_saved_successfully: 'Settings saved successfully',
    language_preference_saved: 'Your language preference has been saved.',
    error_saving_settings: 'Error saving settings',
    success: 'Success',
    error: 'Error',
    failed: 'Failed',
    successfully_added: 'Successfully added',
    successfully_updated: 'Successfully updated',
    successfully_deleted: 'Successfully deleted',
    user_added_successfully: 'User added successfully',
    user_updated_successfully: 'User updated successfully',
    user_deleted_successfully: 'User deleted successfully',
    failed_to_add_user: 'Failed to add user',
    failed_to_update_user: 'Failed to update user',
    failed_to_delete_user: 'Failed to delete user',
    failed_to_fetch_users: 'Failed to fetch users list',
    
    // Server and deployment messages
    server_added_successfully: 'Server added successfully',
    server_updated_successfully: 'Server updated successfully',
    server_deleted_successfully: 'Server deleted successfully',
    connected_successfully: 'Connected successfully',
    connection_failed: 'Connection failed',
    deployed_successfully: 'Deployed successfully',
    deployment_failed: 'Deployment failed',
    failed_to_fetch_servers: 'Failed to fetch servers list',
    failed_to_fetch_deployment_logs: 'Failed to fetch deployment logs',
    text_copied_to_clipboard: 'Text copied to clipboard',
    
    // API Keys messages
    api_key_saved_successfully: 'API key saved successfully',
    failed_to_save_api_key: 'Failed to save API key',
    api_key_deleted_successfully: 'API key deleted successfully',
    failed_to_delete_api_key: 'Failed to delete API key',
    failed_to_fetch_api_keys: 'Failed to fetch API keys',
    key_list_updated_successfully: 'Key list updated successfully',
    failed_to_update_key_list: 'Failed to update key list',
    
    // Auth messages
    login_successful: 'Login successful',
    login_failed: 'Login failed',
    account_created_successfully: 'Account created successfully',
    account_creation_failed: 'Account creation failed',
    logout_successful: 'Logout successful',
    logout_failed: 'Logout failed',
    
    // Admin messages
    password_must_be_longer_than_6_characters: 'Password must be longer than 6 characters',
    
    // System updater messages
    system_update_completed: 'System update completed',
    system_update_failed: 'System update failed',
    
    // Trading and market messages
    refreshing_data: 'Refreshing data',
    fetching_latest_prices: 'Fetching latest prices. Please wait or try again later.',
    go_online: 'Go Online',
    offline_mode: 'Offline Mode',
    expected_price_change: 'Expected Price Change',
    export_chat: 'Export Chat',
    signal_strength: 'Signal Strength',
    import_chat: 'Import Chat',
    online_mode: 'Online Mode',
    go_offline: 'Go Offline',
    themes: 'Themes',
    app_name: 'Binar Join Analytic',
    app_name_short: 'Binary Data Analysis',
    signals: 'Signals',
    indicators: 'Indicators',
    signal: 'Signal',
    group_chat: 'Group Chat',
    group_chats: 'Chat',
    settings: 'Settings',
    chat: 'Chat',
    notifications: 'Notifications',
    timezone: 'Timezone',
    language: 'Language',
    theme: 'Theme',
    save_settings: 'Save Settings',
    settings_saved: 'Settings saved successfully',
    auto_timezone: 'Auto (Device Time)',
    utc: 'Coordinated Universal Time (UTC)',
    riyadh: 'Riyadh (UTC+3)',
    dubai: 'Dubai (UTC+4)',
    kuwait: 'Kuwait (UTC+3)',
    doha: 'Doha (UTC+3)',
    jerusalem: 'Jerusalem (UTC+2/+3)',
    cairo: 'Cairo (UTC+2)',
    london: 'London (UTC+0/+1)',
    paris: 'Paris (UTC+1/+2)',
    new_york: 'New York (UTC-5/-4)',
    tokyo: 'Tokyo (UTC+9)',
    hong_kong: 'Hong Kong (UTC+8)',
    sydney: 'Sydney (UTC+10/+11)',
    send_message: 'Send Message',
    type_message: 'Type your message here...',
    typing: 'typing',
    online: 'Online',
    offline: 'Offline',
    connected: 'Connected',
    yesterday: 'Yesterday',
    profile: 'Profile',
    api_keys: 'API Keys',
    reset_password: 'Reset Password',
    new_user: 'New User',
    save: 'Save',
    cancel: 'Cancel',
    choose_app_language: 'Choose App Language',
    app_version: 'App Version',
    dark_mode: 'Dark Mode',
    light_mode: 'Light Mode',
    system_theme: 'System Theme',
    wait: 'Wait',
    analyzing: 'Analyzing...',
    waiting_for_signal: 'Waiting for signal...',
    available_timeframes_only: 'Available timeframes only',
    next_signal_in: 'Next signal in',
    market_analysis: 'Market Analysis',
    technical_indicators: 'Technical Indicators',
    strength: 'Strength',
    bullish: 'Bullish',
    bearish: 'Bearish',
    account_info: 'Account Info',
    app_user: 'User Display Name',
    free_account: 'Premium Annual Subscription',
    signal_notifications: 'Signal Notifications',
    receive_signal_notifications: 'Receive notifications for new signals',
    market_alerts: 'Market Alerts',
    receive_market_alerts: 'Receive notifications for market open/close',
    choose_timezone: 'Choose Timezone',
    detected_timezone: 'Detected Timezone',
    timezone_description: 'Timezone affects how signal times and market open/close times are displayed',
    auto_timezone_description: 'Timezone is automatically set based on your device time',
    market: 'Market',
    market_open: 'Market Open',
    market_closed: 'Market Closed',
    market_opening: 'Opens at',
    market_closing: 'Closes at',
    technical_analysis: 'Technical Analysis',
    get_signal: 'Get Signal',
    signal_cooldown: 'Wait for next signal',
    second_unit: 'seconds',
    probability: 'Probability',
    current_price: 'Current Price',
    select_trading_platform: 'Select Trading Platform',
    select_trading_pair: 'Select Trading Pair',
    signal_description: 'Signal Description',
    signal_up: 'Buy Signal',
    signal_down: 'Sell Signal',
    signal_wait: 'Waiting for Signal',
    current_signal: 'Current Signal',
    wait_signal: 'Waiting for Signal...',
    analyzing_signal: 'Analyzing Signal',
    market_closed_title: 'Market Closed',
    cooldown_period: 'Cooldown Period',
    previous_signals: 'Previous Signals',
    hide: 'Hide',
    forex: 'Forex',
    crypto: 'Crypto',
    stocks: 'Stocks',
    order_types: 'Order Types:',
    features: 'Features:',
    min_deposit: 'Min Deposit:',
    market_order: 'Market',
    limit_order: 'Limit',
    stop_order: 'Stop',
    stop_limit: 'Stop Limit',
    stop_limit_order: 'Stop Limit',
    binary_options: 'Binary Options',
    turbo: 'Turbo',
    copy_traders: 'Copy Traders',
    forex_trading: 'Forex',
    crypto_trading: 'Crypto',
    technical_analysis_feature: 'Technical Analysis',
    advanced_indicators: 'Advanced Indicators',
    stability: 'Stability',
    ease_of_use: 'Ease of Use',
    modern_platform: 'Modern Platform',
    high_payouts: 'High Payouts',
    simple_interface: 'Simple Interface',
    arabic_support: 'Arabic Support',
    comprehensive_platform: 'Comprehensive Platform',
    advanced_charts: 'Advanced Charts',
    cryptocurrencies: 'Cryptocurrencies',
    low_fees: 'Low Fees',
    fast_deposits: 'Fast Deposits',
    bonuses: 'Bonuses',
    reliable_platform: 'Reliable Platform',
    fast_trading: 'Fast Trading',
    social_trading: 'Social Trading',
    wide_range_currencies: 'Wide Range of Currencies',
    wide_crypto_selection: 'Wide Cryptocurrency Selection',
    digital_options: 'Digital Options',
    copy_trading: 'Copy Trading',
    multiple_platforms: 'Multiple Platforms',
    diverse_trading_options: 'Diverse Trading Options',
    select_timeframe: 'Select Timeframe',
    wait_time_message: 'Please wait {time} seconds for a new signal',
    analyzing_message: 'Analyzing {pair} on {timeframe} timeframe',
    market_closed_message: 'Cannot get signals when market is closed. Opens at {time}',
    new_signal_message: 'New {type} signal',
    target_price: 'Target Price',
    higher: 'higher',
    lower: 'lower',
    prediction_valid_for: 'Prediction valid for',
    timeframe_impacts_signal: 'Timeframe affects signals',
    expected_rise: 'Expected rise',
    expected_drop: 'Expected drop',
    expected_price_rise_in: 'Expected rise in',
    expected_price_drop_in: 'Expected drop in',
    expected_price_rise_in_timeframe: 'Price expected to rise within timeframe',
    expected_price_drop_in_timeframe: 'Price expected to drop within timeframe',
    bullish_trend: 'Bullish trend',
    bearish_trend: 'Bearish trend',
    timeframe_1m: '1 Minute',
    timeframe_1m_short: '1M',
    timeframe_5m: '5 Minutes',
    timeframe_5m_short: '5M',
    timeframe_15m: '15 Minutes',
    timeframe_15m_short: '15M',
    timeframe_1h: '1 Hour',
    timeframe_1h_short: '1H',
    timeframe_4h: '4 Hours',
    timeframe_4h_short: '4H',
    timeframe_1d: '1 Day',
    timeframe_1d_short: '1D',
    all_indicators: 'All Indicators',
    trend: 'Trend',
    oscillator: 'Oscillator',
    momentum: 'Momentum',
    volatility: 'Volatility',
    volume: 'Volume',
    moving_average: 'Moving Average',
    indicator_full_rsi: 'Relative Strength Index',
    indicator_full_macd: 'MACD',
    bollinger_bands: 'Bollinger Bands',
    money_flow: 'Money Flow Index',
    stochastic: 'Stochastic',
    momentum_indicator: 'Momentum Indicator',
    volatility_indicator: 'Volatility Indicator',
    ma_description: 'Simple Moving Average indicator shows upward trend in short term',
    rsi_description: 'Relative Strength Index above 70, indicating overbought conditions',
    macd_description: 'MACD positive crossover indicates bullish momentum',
    bb_description: 'Price moving within middle Bollinger Bands range',
    mfi_description: 'Positive money flow indicating increasing buying pressure',
    stoch_description: 'Stochastic below 30 level, indicating oversold conditions',
    momentum_description: 'Negative momentum indicates weakening uptrend strength',
    volatility_description: 'Average increase in price volatility',
    indicator_value: 'Value',
    timeframe: 'Timeframe',
    buy: 'Buy',
    sell: 'Sell',
    neutral: 'Neutral',
    indicator_rsi: 'RSI',
    indicator_macd: 'MACD',
    indicator_ema: 'EMA',
    indicator_bb: 'Bollinger',
    indicator_stoch: 'Stoch',
    indicator_adx: 'ADX',
    loading: 'Loading...',
    loading_page: 'Loading page...',
    offline_mode_auto_enabled_title: 'Offline Mode Auto-Enabled',
    offline_mode_auto_enabled_description: 'Offline mode has been automatically enabled to improve performance in Replit HTTPS environment. All app features will work but without direct server connection.',
    initializing_app: 'Initializing application...',
    please_wait: 'Please wait...',
    platform_metatrader5: 'MetaTrader 5',
    platform_metatrader4: 'MetaTrader 4',
    platform_eobroker: 'EO Broker',
    platform_binomo: 'Binomo',
    platform_iqoption: 'IQ Option',
    platform_binance: 'Binance',
    platform_pocketoption: 'Pocket Option',
    platform_olymptrade: 'Olymp Trade',
    platform_etoro: 'eToro',
    platform_kucoin: 'KuCoin',
    platform_deriv: 'Deriv',
    login: "Login",
    create_account: "Create Account",
    username: "Username",
    password: "Password",
    confirm_password: "Confirm Password",
    display_name: "Display Name",
    email: "Email",
    password_mismatch: "Passwords do not match",
    dont_have_account: "Don't have an account? Sign up",
    already_have_account: "Already have an account? Login",
    app_welcome: "Welcome to Binar Join Analytic",
    app_description: "An integrated platform for analyzing trading signals in financial markets with multilingual support and advanced analysis features.",
    logout: "Logout",
    logout_success: "Logged out successfully",

    // Adding missing translations
    error_checking_connection: "Error checking connection",
    backup_data_updated: "Backup data updated",
    connection_check_error: "Connection check error:",
    no_signals_available: "No signals available at the moment",
    temporary_maintenance: "There might be temporary maintenance or signal updates in progress",
    signals_temporarily_unavailable: "Signals temporarily unavailable",
    updating_signals: "Updating signals...",
    signals_updated_successfully: "Signals updated successfully",
    independent_mode_activated: "Independent mode activated",

    // 404 page
    page_not_found_404: "404 Page Not Found",
    page_not_found_description: "Did you forget to add the page to the router?",

    // Themes
    toggle_theme: "Toggle theme",
    light_theme: "Light",
    dark_theme: "Dark", 
    system_theme_short: "System",

    // Connection errors
    reconnection_successful: "Reconnection successful",
    connection_restored_data_updated: "Connection restored successfully and data updated",
    data_update_in_progress: "Data update in progress",
    fetching_latest_data_auto_retry: "We are working to fetch the latest data. Will retry automatically",
    offline_mode_enabled_success: "Offline mode enabled",
    offline_mode_enabled_description: "You can now use the app without internet connection. Data will sync when connection is restored.",
    offline_mode_enable_failed: "Failed to enable offline mode",
    offline_mode_enable_error: "An error occurred while trying to enable offline mode. Please try again.",
    retrying_attempt: "Retrying...",
    enable_offline_mode: "Enable offline mode",
    offline_mode_connection_issue: "If connection issues persist, you can enable offline mode to continue using the app.",
    offline_mode_data_storage: "In offline mode, your data will be stored locally and synced when connection is restored.",
    retry_count: "Attempts:",
    data_analysis_update_message: "Data analysis update in progress. You can wait a moment or use local analysis mode to continue.",

    // Console.log messages for internationalization
    https_detected_replit: "HTTPS detected in Replit environment - enabling offline mode automatically",
    offline_mode_auto_activated_replit: "Offline mode auto-enabled due to Replit HTTPS environment",
    offline_mode_enabled_trading_page: "Enabling offline mode in trading signals page",
    offline_mode_disabled_trading_page: "Disabling offline mode in trading signals page",
    websocket_security_error_detected: "WebSocket security error detected in HTTPS environment, enabling offline mode automatically",
    using_locally_stored_price: "Using locally stored price:",
    could_not_read_stored_price: "Could not read stored price:",
    fetching_price_offline_mode: "Fetching price in offline mode",
    using_default_price_offline: "Using default price in offline mode",
    chat_simulation_initialized: "Chat simulation system initialized",
    backup_data_updated_log: "Backup data updated",
    using_backup_data_offline: "Using backup data in offline mode",
    error_exporting_chat: "Error exporting chat:",
    error_parsing_imported_chat: "Error parsing imported chat data:",
    error_importing_chat: "Error importing chat:",
    error_notifications_permission: "Error requesting notifications permission:",
    error_toggling_connection_mode: "Error toggling connection mode:",
    default_api_keys_loaded: "Default API keys loaded successfully",
    invalid_file_format: "Invalid file format",
    failed_to_read_content: "Failed to read content",
    
    // Additional console messages  
    theme_config_error: "Failed to apply theme.json settings:",
    could_not_read_stored_price_warn: "Could not read stored price:",
    market_analysis_for: "Market analysis for:",
    market_analysis_response: "Market analysis response:",
    signal_received_from_server: "Signal received from server:",
    signal_type_received: "Signal type received:",
    signal_after_processing: "Signal after processing:",
    signal_converted_to_up: "Signal converted to UP",
    signal_converted_to_down: "Signal converted to DOWN",
    signal_no_match_using_wait: "Signal did not match any condition, using WAIT",
    
    // Toast messages for ChatPage
    export_success: "Chat exported successfully",
    export_success_desc: "Chat saved to file",
    export_error: "Export error",
    export_error_desc: "An error occurred while trying to export the chat",
    import_success: "Chat imported successfully",
    import_success_desc: "Messages imported",
    import_error: "Import error",
    import_error_desc: "Invalid or corrupted file",
    read_content_failed: "Failed to read content",
    notifications_blocked: "Notifications blocked",
    
    // Toast messages for TradingSignalPage
    offline_mode_enabled_title: "Offline mode enabled",
    offline_mode_enabled_desc: "Locally stored data will be used. Some features may be limited.",
    connection_restored_title: "Connection restored",
    connection_restored_desc: "Successfully connected to server.",
    signal_analysis_pending_title: "Signal analysis in progress",
    signal_analysis_pending_desc: "We are updating market analysis. You can continue using stored data.",
    cached_data_used_title: "Using cached data",
    cached_data_used_desc: "Invalid price received from server, using local data.",
    data_analysis_error_title: "Data analysis error",
    data_analysis_error_desc: "Could not get latest data, using local data.",
    local_mode_switch_title: "Switched to local mode",
    local_mode_switch_desc: "Switched to using local algorithm due to server connection failure.",
    data_updating_title: "Data updating",
    data_updating_desc: "Currently updating market data and analyzing trends.",
    
    // Additional messages for TradingSignalPage
    current_price_label: "Current price",
    cached_data_loaded_desc: "Previously cached data loaded to ensure analysis continuity.",
    enable_offline_mode_button: "Enable offline mode",
    updating_price_data_desc: "We are updating price data. You can enable local analysis mode to continue.",
    calculating_enhanced_target_price: "Calculating enhanced target price:",
    offline_mode_reason_https_websocket: "WebSocket connection limitations in HTTPS",
    offline_mode_reason_network: "Network error",
    offline_mode_reason_api_limit: "API usage limit exceeded",
    offline_mode_reason_timeout: "Connection timeout",
    offline_mode_reason_unknown: "Unknown reason",
    offline_mode_activation_reason: "Activation reason:",
    
    // AdminLayout translations
    admin_login_required: "Must login as admin to access control panel",
    api_keys_label: "API Keys",
    deployment_servers_label: "Deployment Servers",
    
    // IndicatorsPage translations
    market_status_fetch_error: "Error fetching market status:",
    market_status_update_error: "Error updating market status:",
    market_status_api_error: "Failed to fetch market status",
    updated: "Updated",
    indicator_updated: "Indicator data updated successfully",
    
    // Console messages from hooks and other files
    heatmap_data_fetch_error: "Error fetching heatmap data:",
    using_cached_heatmap_data: "Using cached data from heatmap_data, data age:",
    using_cached_pair_data: "Using cached data for pair",
    pair_data_fetch_error: "Error retrieving data for",
    backup_data_fetch_error: "Error retrieving backup data:",
    local_heatmap_data_error: "Error retrieving heatmap data from local storage:",
    analysis_results_from_real_data: "Analysis results from real data:",
    market_analysis_error: "Market analysis error:",
    retry_fetch_attempt: "Price fetch attempt failed, retrying",
    invalid_price_received: "Invalid price received:",
    fetch_pair_price_error: "Error fetching pair price:",
    using_cached_price_on_failure: "Using locally cached price due to request failure:",
    using_known_volatility: "Using known historical volatility for",
    using_estimated_volatility: "Using estimated volatility for",
    enhanced_base_volatility_factor: "Enhanced base volatility factor:",
    expected_change_enhanced: "Expected change after enhancement factors:",
    final_enhanced_target_price: "Final enhanced target price:",
    current_price_updated: "Current price updated:",
    received_analysis_results: "Received analysis results:",
    data_age: "data age",

    // Missing keys from Arabic
    copied_to_clipboard: 'Copied to clipboard',
    copy_failed: 'Copy failed',
    copy_translation: 'Copy translation',
    second: 'second',

    // Trading pairs names
    'EUR/USD': 'Euro / US Dollar',
    'GBP/USD': 'British Pound / US Dollar',
    'USD/JPY': 'US Dollar / Japanese Yen',
    'USD/CHF': 'US Dollar / Swiss Franc',
    'EUR/JPY': 'Euro / Japanese Yen',
    'GBP/JPY': 'British Pound / Japanese Yen',
    'BTC/USDT': 'Bitcoin / Tether',
    'ETH/USDT': 'Ethereum / Tether',
    'XRP/USDT': 'Ripple / Tether',
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'GOOGL': 'Google LLC',
    'AMZN': 'Amazon.com Inc.',

    // Admin Reset Password
    admin_reset_password_title: 'Reset Admin Password',
    admin_reset_password_desc: 'You can set a new password for the admin here. Please use a strong and secure password.',
    new_password: 'New Password',
    enter_new_password: 'Enter new password',
    re_enter_password: 'Re-enter password',
    reset_password_btn: 'Reset Password',
    back_to_dashboard: 'Back to Dashboard',
    resetting: 'Resetting...',

    // API Keys Management
    api_keys_management: 'API Keys Management',
    api_key_name: 'Key Name',
    api_key_value: 'Key Value',
    api_key_description: 'Key Description',
    is_secret: 'Secret?',
    key_name_required: 'Key name is required',
    key_value_required: 'Key value is required',
    test_key: 'Test Key',
    testing: 'Testing...',
    valid: 'Valid',
    invalid: 'Invalid',
    untested: 'Untested',

    // Service descriptions for API keys
    twelvedata_api_title: 'TwelveData API Key',
    twelvedata_api_desc: 'Used to fetch forex and stock price data. You can get a free key from their official website.',
    primary_api_title: 'Primary Alpha Vantage Key',
    primary_api_desc: 'Primary key for Alpha Vantage service for stock and financial indicator data.',
    backup_api_title: 'Backup Alpha Vantage Keys',
    backup_api_desc: 'List of backup keys for Alpha Vantage service. Keys should be separated by commas.',
    binance_api_title: 'Binance API Key',
    binance_api_desc: 'Used to access cryptocurrency price data from Binance platform.',
    binance_secret_title: 'Binance Secret Key',
    binance_secret_desc: 'Secret key required for authentication with Binance API.',
    market_api_title: 'General Market Key',
    market_api_desc: 'General key used to access various market data services.',
    service_url: 'Service URL',
    usage: 'Usage',
    required: 'Required',
    optional: 'Optional',
    category: 'Category',
    market_data: 'Market Data',
    cryptocurrency: 'Cryptocurrency',
    general: 'General',

    // Additional API Keys Management messages
    failed_to_get_api_keys: 'Failed to get API keys',
    saved_successfully: 'Saved Successfully',
    saved_key_successfully: 'Key {key} saved successfully',
    test_successful: 'Test Successful',
    test_failed: 'Test Failed',
    failed_to_test_key: 'Failed to test key',
    deleted_successfully: 'Deleted Successfully',
    deleted_key_successfully: 'Key {key} deleted successfully',
    failed_to_delete_key: 'Failed to delete key {key}',
    update_key: 'Update Key',
    test_key_button: 'Test Key',
    add_key: 'Add Key',
    update_key_title: 'Update Key: {key}',
    add_new_key: 'Add New Key',
    api_key_example: 'Example: MARKET_API_KEY',
    enter_key_value: 'Enter key value',
    key_purpose_description: 'Description of the purpose of this key',
    updated_successfully: 'Updated Successfully',
    updated_keys_successfully: 'Keys list updated successfully',
    failed_to_update_keys: 'Failed to update keys list',

    // Error and success messages
    failed_to_reset_password: 'Failed to reset password',
    error_occurred_while_resetting_password: 'An error occurred while resetting password',

    // Additional common messages
    confirm_delete_key: 'Are you sure you want to delete the key',
    unknown_error: 'Unknown error',
    please_login_to_access: 'Please login to access this page',
    no_permission_access: 'You do not have permission to access this page',

    // Trading platforms
    metatrader4: 'MetaTrader 4',
    metatrader5: 'MetaTrader 5',
    binomo: 'Binomo',
    deriv: 'Deriv',
    exness: 'Exness',
    fxpro: 'FxPro',
    icmarkets: 'IC Markets',
    xm: 'XM',
    xtb: 'XTB',
    alpari: 'Alpari',
    plus500: 'Plus500',
    etoro: 'eToro',
    avatrade: 'AvaTrade',
    pepperstone: 'Pepperstone',
    hotforex: 'HotForex',
    trading_platform: 'Trading Platform',
    selected_platform: 'Selected Platform',

    // Trading messages
    analysis_data_updating: 'Analysis data updating. You can use offline analysis mode to continue using the app with all features.',

    // Deployment stages
    deployment_stage_connection: 'Connection',
    deployment_stage_package: 'Creating Package',
    deployment_stage_upload: 'Uploading Files',
    deployment_stage_execution: 'Execution',
    deployment_stage_completion: 'Completion'

  },
  hi: {
    // Error messages
    error_translation_title: 'त्रुटि संदेश अनुवाद',
    original_error_message: 'मूल त्रुटि संदेश:',
    translated_error_message: 'त्रुटि संदेश अनुवाद:',
    error_not_recognized: 'त्रुटि संदेश पहचाना नहीं गया',
    translation_not_available: 'इस संदेश के लिए अनुवाद उपलब्ध नहीं है',
    copy_translation: 'अनुवाद कॉपी करें',
    copied_to_clipboard: 'क्लिपबोर्ड पर कॉपी हो गया',
    copy_failed: 'कॉपी विफल',

    // Common error types
    error_network_failure: 'नेटवर्क कनेक्शन विफल',
    error_server_down: 'सर्वर वर्तमान में उपलब्ध नहीं है',
    error_authentication_failed: 'प्रमाणीकरण विफल',
    error_permission_denied: 'आपको एक्सेस की अनुमति नहीं है',
    error_validation_failed: 'डेटा सत्यापन विफल',
    error_data_not_found: 'डेटा नहीं मिला',
    error_invalid_request: 'अमान्य अनुरोध',
    error_api_limit_exceeded: 'API उपयोग सीमा पार हो गई',
    error_database_connection: 'डेटाबेस कनेक्शन त्रुटि',
    error_database_query: 'डेटाबेस क्वेरी त्रुटि',
    error_file_not_found: 'फ़ाइल नहीं मिली',
    error_file_too_large: 'फ़ाइल बहुत बड़ी है',
    error_unsupported_file_type: 'असमर्थित फ़ाइल प्रकार',
    error_timeout: 'अनुरोध समयसीमा समाप्त',
    error_server_error: 'सर्वर त्रुटि',
    error_bad_request: 'गलत अनुरोध',
    error_not_authorized: 'अनधिकृत',
    error_forbidden: 'प्रतिबंधित',
    error_conflict: 'डेटा में संघर्ष',

    // App specific errors
    error_invalid_credentials: 'अमान्य उपयोगकर्ता नाम या पासवर्ड',
    error_username_exists: 'उपयोगकर्ता नाम पहले से मौजूद है',
    error_email_exists: 'ईमेल पहले से उपयोग में है',
    error_weak_password: 'पासवर्ड बहुत कमजोर है',
    error_session_expired: 'सत्र समाप्त हो गया, कृपया पुनः लॉग इन करें',
    error_invalid_api_key: 'अमान्य API कुंजी',
    error_api_key_missing: 'API कुंजी गुम है',
    error_api_key_expired: 'API कुंजी की समयसीमा समाप्त',

    // Connection and offline mode
    connection_error_message: 'वर्तमान में कोई सिग्नल उपलब्ध नहीं है। अस्थायी रखरखाव या सिग्नल अपडेट हो सकता है।',
    server_connection_error: 'सिग्नल अस्थायी रूप से अनुपलब्ध',
    retry_connection: 'सिग्नल अपडेट करें',
    retrying_connection: 'सिग्नल अपडेट कर रहे हैं...',
    connection_restored: 'सिग्नल सफलतापूर्वक अपडेट हुए',
    offline_mode_enabled: 'स्वतंत्र मोड सक्षम',
    offline_mode_desc: 'स्थानीय रूप से सहेजे गए विश्लेषण का उपयोग, नए सिग्नल उपलब्ध न होने पर उपयुक्त',
    offline_mode_active: 'ऑफ़लाइन मोड सक्रिय',
    offline_mode_https_description: 'ऑफ़लाइन मोड स्वचालित रूप से सक्रिय हो गया क्योंकि ऐप HTTPS पर चल रहा है। स्थानीय डेटा का उपयोग किया जाएगा।',
    online_mode_active: 'ऑनलाइन मोड सक्रिय',
    online_mode_desc: 'नवीनतम विश्लेषण और उपलब्ध सिग्नल प्राप्त करना',
    disable: 'अक्षम करें',

    // Market information
    forex_market_hours_info: 'विदेशी मुद्रा बाजार घंटे की जानकारी',
    crypto_market_hours_info: 'क्रिप्टोकरेंसी बाजार घंटे की जानकारी',
    stocks_market_hours_info: 'स्टॉक बाजार घंटे की जानकारी',
    forex_market_hours_info_improved: 'विदेशी मुद्रा बाजार सोमवार से शुक्रवार तक 24 घंटे खुला रहता है। यूरोप और अमेरिका के सत्रों के दौरान उच्चतम अस्थिरता होती है।',
    crypto_market_hours_info_improved: 'क्रिप्टोकरेंसी बाजार 24/7 बिना रुके चलता रहता है और सप्ताहांत में भी बंद नहीं होता।',
    stocks_market_hours_info_improved: 'स्टॉक मार्केट आमतौर पर सोमवार से शुक्रवार तक चलता है, जिसके ट्रेडिंग घंटे एक्सचेंज के अनुसार अलग-अलग होते हैं।',
    time_remaining: 'शेष समय',
    next_open: 'अगला खुलना',
    next_close: 'अगला बंद होना',
    market_closed_notification: 'बाजार बंद होने की अधिसूचना',
    opening_soon: 'जल्द खुलेगा',
    opening_very_soon: 'बहुत जल्द खुलेगा',
    closing_soon: 'जल्द बंद होगा',
    market_closes_at: 'बाजार बंद होता है',
    market_opens_at: 'बाजार खुलता है',
    market_is_open: 'बाजार खुला है',
    market_is_closed: 'बाजार बंद है',
    trading_hours: 'ट्रेडिंग घंटे',
    weekend_closed: 'सप्ताहांत में बंद',
    timezone_info: 'समय क्षेत्र जानकारी',
    current_time_in_your_timezone: 'आपके समय क्षेत्र के अनुसार वर्तमान समय',
    remaining: 'शेष',
    best_trading_hours: 'सर्वोत्तम ट्रेडिंग घंटे',
    market_activity: 'बाजार गतिविधि',
    active_now: 'अभी सक्रिय',
    inactive_now: 'अभी निष्क्रिय',
    market_opening_soon_notification: 'बाजार जल्द खुलेगा, ट्रेडिंग के लिए तैयार रहें',
    market_closing_soon_notification: 'बाजार जल्द बंद होगा, अपने ट्रेड्स समाप्त करें',
    h: 'घ',
    m: 'मि',
    s: 'से',
    refresh: 'ताज़ा करें',
    hours: 'घंटे',
    minutes: 'मिनट',
    seconds: 'सेकंड',
    show_details: 'विवरण दिखाएं',
    show_compact: 'संक्षिप्त दिखाएं',
    close: 'बंद करें',

    // Basic Hindi translations  
    loading_page: 'पेज लोड हो रहा है...',
    offline_mode_auto_enabled_title: 'ऑफलाइन मोड स्वचालित सक्षम',
    offline_mode_auto_enabled_description: 'Replit HTTPS वातावरण में प्रदर्शन सुधारने के लिए ऑफलाइन मोड स्वचालित रूप से सक्षम हो गया है। सभी ऐप सुविधाएं काम करेंगी लेकिन प्रत्यक्ष सर्वर कनेक्शन के बिना।',
    initializing_app: 'ऐप इनिशियलाइज़ हो रहा है...',
    please_wait: 'कृपया प्रतीक्षा करें...',
    refreshing_market_data: 'बाजार डेटा अपडेट हो रहा है...',
    market_opening_now: 'बाजार अब खुल रहा है',
    refreshing_for_market_open: 'ट्रेडिंग शुरू करने के लिए डेटा अपडेट हो रहा है',
    time_calculation_error: 'समय गणना त्रुटि',

    // Main app translations
    app_name: 'बिनार ज्वाइन एनालिटिक',
    app_name_short: 'बाइनरी डेटा एनालिसिस',
    app_description: 'बहुभाषी समर्थन और उन्नत सुविधाओं के साथ वित्तीय बाजारों में ट्रेडिंग सिग्नल विश्लेषण के लिए एक एकीकृत प्लेटफॉर्म',
    app_welcome: 'Binar Join Analytic ऐप में आपका स्वागत है',

    // User management
    user_management: 'उपयोगकर्ता प्रबंधन',
    admin_panel: 'एडमिन पैनल',
    add_user: 'उपयोगकर्ता जोड़ें',
    edit_user: 'उपयोगकर्ता संपादित करें',
    enter_username: 'उपयोगकर्ता नाम दर्ज करें',
    enter_display_name: 'डिस्प्ले नाम दर्ज करें',
    enter_email: 'ईमेल दर्ज करें',
    enter_password: 'पासवर्ड दर्ज करें',
    is_admin: 'एडमिन है?',
    role: 'भूमिका',
    admin: 'एडमिन',
    user: 'उपयोगकर्ता',
    no_users_found: 'कोई उपयोगकर्ता नहीं मिले',
    confirm_delete: 'हटाने की पुष्टि',
    confirm_delete_user_message: 'क्या आप वाकई इस उपयोगकर्ता को हटाना चाहते हैं',
    this_action_cannot_be_undone: 'यह क्रिया पूर्ववत नहीं की जा सकती',
    admin_redirect: 'एडमिन को उपयोगकर्ता पैनल का उपयोग करना चाहिए।',

    // Bot information
    bot: 'बॉट',
    bot_info: 'बॉट जानकारी',
    trading_bot: 'ट्रेडिंग बॉट',
    bot_description: 'ट्रेडिंग बॉट एक स्वचालित सिस्टम है जो वित्तीय बाजारों का विश्लेषण करता है और बेहतर ट्रेडिंग निर्णय लेने में आपकी मदद के लिए सटीक ट्रेडिंग सिग्नल प्रदान करता है।',
    bot_features: 'बॉट की विशेषताएं:',
    bot_feature_1: 'बाजार के ऐतिहासिक डेटा का उन्नत विश्लेषण',
    bot_feature_2: 'रियल-टाइम ट्रेडिंग सिग्नल',
    bot_feature_3: 'आदर्श एंट्री और एग्जिट पॉइंट की पहचान',
    bot_feature_4: 'विभिन्न जोड़ियों और समय फ्रेम के लिए कस्टम विश्लेषण',
    coming_soon: 'जल्द आ रहा है',
    bot_coming_soon: 'स्वचालित ट्रेडिंग सुविधाओं के साथ बॉट का उन्नत संस्करण जल्द ही लॉन्च होगा।',

    // Navigation and UI
    signals: 'सिग्नल',
    signal: 'सिग्नल',
    indicators: 'संकेतक',
    group_chat: 'समूह चैट',
    group_chats: 'चैट',
    settings: 'सेटिंग्स',
    chat: 'चैट',
    profile: 'प्रोफ़ाइल',
    api_keys: 'API कुंजी',
    reset_password: 'पासवर्ड रीसेट करें',

    // Connection modes
    online_mode: 'ऑनलाइन मोड',
    offline_mode: 'ऑफ़लाइन मोड',
    go_online: 'ऑनलाइन मोड',
    go_offline: 'ऑफ़लाइन मोड',
    expected_price_change: 'अपेक्षित मूल्य परिवर्तन',
    export_chat: 'चैट निर्यात करें',
    import_chat: 'चैट आयात करें',
    signal_strength: 'सिग्नल ताकत',

    // Basic UI actions
    add: 'जोड़ें',
    edit: 'संपादित करें',
    delete: 'हटाएं',
    save: 'सेव करें',
    cancel: 'रद्द करें',

    hide: 'छिपाएं',

    // Languages and themes
    language: 'भाषा',
    theme: 'थीम',
    themes: 'थीम्स',
    dark_mode: 'डार्क मोड',
    light_mode: 'लाइट मोड',
    choose_app_language: 'ऐप भाषा चुनें',

    // Trading specific translations  
    waiting_for_signal: 'सिग्नल की प्रतीक्षा...',
    current_signal: 'वर्तमान सिग्नल',
    get_signal: 'सिग्नल प्राप्त करें',
    select_timeframe: 'समय सीमा चुनें',
    select_trading_platform: 'ट्रेडिंग प्लेटफॉर्म चुनें',
    select_trading_pair: 'ट्रेडिंग जोड़ी चुनें',
    signal_description: 'सिग्नल विवरण',
    signal_up: 'खरीदारी सिग्नल',
    signal_down: 'बिक्री सिग्नल',
    signal_wait: 'सिग्नल की प्रतीक्षा में',
    wait_signal: 'सिग्नल का इंतज़ार...',
    analyzing_signal: 'सिग्नल का विश्लेषण कर रहे हैं',
    market_closed_title: 'बाजार बंद है',
    cooldown_period: 'प्रतीक्षा अवधि',
    previous_signals: 'पिछले सिग्नल',
    available_timeframes_only: 'केवल उपलब्ध समय सीमा',
    next_signal_in: 'अगला सिग्नल',
    market_analysis: 'बाजार विश्लेषण',
    technical_indicators: 'तकनीकी संकेतक',
    strength: 'ताकत',
    bullish: 'तेजी',
    bearish: 'मंदी',
    analyzing: 'विश्लेषण कर रहे हैं...',
    wait: 'प्रतीक्षा करें',
    signal_cooldown: 'अगले सिग्नल के लिए प्रतीक्षा',
    second: 'सेकंड',
    probability: 'संभावना',
    current_price: 'वर्तमान मूल्य',
    target_price: 'लक्ष्य मूल्य',
    higher: 'अधिक',
    lower: 'कम',
    prediction_valid_for: 'पूर्वानुमान वैध है',
    timeframe_impacts_signal: 'समय सीमा सिग्नल को प्रभावित करती है',
    expected_rise: 'अपेक्षित वृद्धि',
    expected_drop: 'अपेक्षित गिरावट',
    expected_price_rise_in: 'अपेक्षित मूल्य वृद्धि में',
    expected_price_drop_in: 'अपेक्षित मूल्य गिरावट में',
    expected_price_rise_in_timeframe: 'समय सीमा में मूल्य वृद्धि की अपेक्षा',
    expected_price_drop_in_timeframe: 'समय सीमा में मूल्य गिरावट की अपेक्षा',
    bullish_trend: 'तेजी का रुझान',
    bearish_trend: 'मंदी का रुझान',

    // Timeframes
    timeframe_1m: '1 मिनट',
    timeframe_1m_short: '1मि',
    timeframe_5m: '5 मिनट',
    timeframe_5m_short: '5मि',
    timeframe_15m: '15 मिनट',
    timeframe_15m_short: '15मि',
    timeframe_1h: '1 घंटा',
    timeframe_1h_short: '1घ',
    timeframe_4h: '4 घंटे',
    timeframe_4h_short: '4घ',
    timeframe_1d: '1 दिन',
    timeframe_1d_short: '1दि',
    timeframe: 'समय सीमा',

    // Trading platforms
    platform_metatrader5: 'मेटाट्रेडर 5',
    platform_metatrader4: 'मेटाट्रेडर 4',
    platform_eobroker: 'एक्सपर्ट ऑप्शन',
    platform_binomo: 'बिनोमो',
    platform_iqoption: 'आई क्यू ऑप्शन',
    platform_binance: 'बिनांस',
    platform_pocketoption: 'पॉकेट ऑप्शन',
    platform_olymptrade: 'ओलिंप ट्रेड',
    platform_etoro: 'ईटोरो',
    platform_kucoin: 'कुकॉइन',
    platform_deriv: 'डेरिव',

    // Markets
    market: 'बाजार',
    forex: 'विदेशी मुद्रा',
    crypto: 'क्रिप्टो',
    stocks: 'स्टॉक',
    market_open: 'बाजार खुला है',
    market_closed: 'बाजार बंद है',
    market_opening: 'बाजार खुलने का समय',
    market_closing: 'बाजार बंद होने का समय',

    // Trading features
    order_types: 'ऑर्डर प्रकार:',
    features: 'सुविधाएं:',
    min_deposit: 'न्यूनतम जमा:',
    market_order: 'मार्केट',
    limit_order: 'लिमिट',
    stop_order: 'स्टॉप',
    stop_limit: 'स्टॉप लिमिट',
    stop_limit_order: 'स्टॉप लिमिट',
    binary_options: 'बाइनरी ऑप्शन',
    turbo: 'टर्बो',
    copy_traders: 'ट्रेडर्स कॉपी करें',
    forex_trading: 'फॉरेक्स',
    crypto_trading: 'क्रिप्टो',
    technical_analysis_feature: 'तकनीकी विश्लेषण',
    advanced_indicators: 'उन्नत संकेतक',
    stability: 'स्थिरता',
    ease_of_use: 'उपयोग में आसानी',
    modern_platform: 'आधुनिक प्लेटफॉर्म',
    high_payouts: 'उच्च भुगतान',
    simple_interface: 'सरल इंटरफेस',
    arabic_support: 'अरबी समर्थन',
    comprehensive_platform: 'व्यापक प्लेटफॉर्म',
    advanced_charts: 'उन्नत चार्ट',
    cryptocurrencies: 'क्रिप्टोकरेंसी',
    low_fees: 'कम शुल्क',
    fast_deposits: 'तेज़ जमा',
    bonuses: 'बोनस',
    reliable_platform: 'विश्वसनीय प्लेटफॉर्म',
    fast_trading: 'तेज़ ट्रेडिंग',
    social_trading: 'सोशल ट्रेडिंग',
    wide_range_currencies: 'मुद्राओं की विस्तृत श्रृंखला',
    wide_crypto_selection: 'क्रिप्टो की विस्तृत चुनिंदगी',
    digital_options: 'डिजिटल ऑप्शन',
    copy_trading: 'कॉपी ट्रेडिंग',
    multiple_platforms: 'कई प्लेटफॉर्म',
    diverse_trading_options: 'विविध ट्रेडिंग विकल्प',

    // Messages
    wait_time_message: 'नए सिग्नल के लिए कृपया {time} सेकंड प्रतीक्षा करें',
    analyzing_message: '{timeframe} समय सीमा में {pair} का विश्लेषण कर रहे हैं',
    market_closed_message: 'बाजार बंद होने पर सिग्नल नहीं मिल सकते। {time} पर खुलेगा',
    new_signal_message: 'नया {type} सिग्नल',
    market_closed_message_improved: 'बाजार वर्तमान में बंद है। यह {time} पर खुलेगा। आप नीचे काउंटडाउन देख सकते हैं और बाजार खुलने पर सूचना मिलेगी।',

    // Notifications
    notifications: 'सूचनाएं',
    notifications_enabled: 'सूचनाएं सक्षम',
    market_status_notifications_enabled: 'बाजार खुलने/बंद होने की सूचनाएं मिलेंगी',
    enable_market_notifications: 'बाजार सूचनाएं सक्षम करें',
    signal_notifications: 'सिग्नल सूचनाएं',
    receive_signal_notifications: 'नए सिग्नल के लिए सूचनाएं प्राप्त करें',
    market_alerts: 'बाजार अलर्ट',
    receive_market_alerts: 'बाजार खुलने/बंद होने की सूचनाएं प्राप्त करें',

    // Timezone and settings
    timezone: 'समय क्षेत्र',
    choose_timezone: 'समय क्षेत्र चुनें',
    detected_timezone: 'पहचाना गया समय क्षेत्र',
    timezone_description: 'समय क्षेत्र प्रभावित करता है कि सिग्नल समय और बाजार खुलने/बंद होने का समय कैसे दिखाया जाता है',
    auto_timezone_description: 'स्वचालित रूप से डिवाइस का समय क्षेत्र उपयोग करें',
    auto_timezone: 'स्वचालित समायोजन (डिवाइस समय के अनुसार)',
    utc: 'यूनिवर्सल कोऑर्डिनेटेड टाइम (UTC)',
    riyadh: 'रियाध (UTC+3)',
    dubai: 'दुबई (UTC+4)',
    kuwait: 'कुवैत (UTC+3)',
    doha: 'दोहा (UTC+3)',
    jerusalem: 'जेरूसलम (UTC+2/+3)',
    cairo: 'काहिरा (UTC+2)',
    london: 'लंदन (UTC+0/+1)',
    paris: 'पेरिस (UTC+1/+2)',
    new_york: 'न्यू यॉर्क (UTC-5/-4)',
    tokyo: 'टोक्यो (UTC+9)',
    hong_kong: 'हांग कांग (UTC+8)',
    sydney: 'सिडनी (UTC+10/+11)',

    // Authentication
    login: 'लॉग इन',
    create_account: 'नया खाता बनाएं',
    username: 'उपयोगकर्ता नाम',
    password: 'पासवर्ड',

    display_name: 'डिस्प्ले नाम',
    email: 'ईमेल',
    password_mismatch: 'पासवर्ड मेल नहीं खाते',
    dont_have_account: 'खाता नहीं है? अभी साइन अप करें',
    already_have_account: 'पहले से खाता है? लॉग इन करें',
    logout: 'लॉग आउट',
    logout_success: 'सफलतापूर्वक लॉग आउट हुआ',

    // Additional missing keys
    account_info: 'खाता जानकारी',
    app_user: 'ऐप उपयोगकर्ता',
    free_account: 'निःशुल्क खाता',
    save_settings: 'सेटिंग्स सहेजें',
    settings_saved: 'सेटिंग्स सहेजी गईं',
    app_version: 'ऐप संस्करण',
    users: 'उपयोगकर्ता',

    // Technical indicators
    all_indicators: 'सभी संकेतक',
    trend: 'रुझान',
    oscillator: 'ऑसिलेटर',
    momentum: 'गति',
    volatility: 'अस्थिरता',
    volume: 'वॉल्यूम',
    moving_average: 'मूविंग एवरेज',
    indicator_full_rsi: 'रिलेटिव स्ट्रेंथ इंडेक्स',
    indicator_full_macd: 'MACD',
    bollinger_bands: 'बॉलिंगर बैंड',
    money_flow: 'मनी फ्लो इंडेक्स',
    stochastic: 'स्टोकेस्टिक',
    momentum_indicator: 'मोमेंटम इंडिकेटर',
    volatility_indicator: 'वोलैटिलिटी इंडिकेटर',
    ma_description: 'सिंपल मूविंग एवरेज शॉर्ट टर्म में तेजी का रुझान दिखाता है',
    rsi_description: 'RSI 70 से ऊपर है, जो ओवरबॉट स्थिति दिखाता है',
    macd_description: 'MACD का सकारात्मक क्रॉसओवर तेजी की गति दिखाता है',
    bb_description: 'कीमत बॉलिंगर बैंड के मध्यम रेंज में चल रही है',
    mfi_description: 'सकारात्मक मनी फ्लो बढ़ती खरीदारी शक्ति दिखाता है',
    stoch_description: 'स्टोकेस्टिक 30 से नीचे है, ओवरसोल्ड स्थिति दिखाता है',
    momentum_description: 'नकारात्मक मोमेंटम तेजी की कमजोरी दिखाता है',
    volatility_description: 'कीमत में मध्यम अस्थिरता',
    indicator_value: 'मूल्य',
    buy: 'खरीदें',
    sell: 'बेचें',
    neutral: 'न्यूट्रल',
    indicator_rsi: 'RSI',
    indicator_macd: 'MACD',
    indicator_ema: 'EMA',
    indicator_bb: 'बॉलिंगर',
    indicator_stoch: 'स्टोकेस्टिक',
    indicator_adx: 'ADX',
    loading: 'लोड हो रहा है...',

    // Console and system messages
    error_checking_connection: "कनेक्शन जाँच में त्रुटि",
    backup_data_updated: "बैकअप डेटा अपडेट किया गया",
    connection_check_error: "कनेक्शन जाँच त्रुटि:",
    no_signals_available: "वर्तमान में कोई सिग्नल उपलब्ध नहीं",
    temporary_maintenance: "अस्थायी रखरखाव या सिग्नल अपडेट हो सकता है",
    signals_temporarily_unavailable: "सिग्नल अस्थायी रूप से अनुपलब्ध",
    updating_signals: "सिग्नल अपडेट कर रहे हैं...",
    signals_updated_successfully: "सिग्नल सफलतापूर्वक अपडेट हुए",
    independent_mode_activated: "स्वतंत्र मोड सक्रिय",

    // 404 page
    page_not_found_404: '404 पेज नहीं मिला',
    page_not_found_description: 'क्या आप राउटर में पेज जोड़ना भूल गए?',

    // Themes
    toggle_theme: 'थीम टॉगल करें',
    light_theme: 'हल्का',
    dark_theme: 'गहरा',
    system_theme: 'सिस्टम के अनुसार',
    system_theme_short: 'सिस्टम',

    // Connection states and messages
    reconnection_successful: 'पुनः कनेक्शन सफल',
    connection_restored_data_updated: 'कनेक्शन बहाल हुआ और डेटा अपडेट हुआ',
    data_update_in_progress: 'डेटा अपडेट प्रगति में है',
    fetching_latest_data_auto_retry: 'नवीनतम डेटा प्राप्त कर रहे हैं। स्वचालित रूप से पुनः प्रयास करेंगे',
    offline_mode_enabled_success: 'ऑफ़लाइन मोड सक्षम',
    offline_mode_enabled_description: 'अब आप इंटरनेट कनेक्शन के बिना ऐप का उपयोग कर सकते हैं। कनेक्शन बहाल होने पर डेटा सिंक होगा।',
    offline_mode_enable_failed: 'ऑफ़लाइन मोड सक्षम करने में विफल',
    offline_mode_enable_error: 'ऑफ़लाइन मोड सक्षम करने में त्रुटि हुई। कृपया पुनः प्रयास करें।',
    retrying_attempt: 'पुनः प्रयास कर रहे हैं...',
    enable_offline_mode: 'ऑफ़लाइन मोड सक्षम करें',
    offline_mode_connection_issue: 'यदि कनेक्शन की समस्या बनी रहती है, तो आप ऐप का उपयोग जारी रखने के लिए ऑफ़लाइन मोड सक्षम कर सकते हैं।',
    offline_mode_data_storage: 'ऑफ़लाइन मोड में, आपका डेटा स्थानीय रूप से संग्रहीत होगा और कनेक्शन बहाल होने पर सिंक होगा।',
    retry_count: 'प्रयासों की संख्या:',
    data_analysis_update_message: 'डेटा विश्लेषण अपडेट प्रगति में है। आप थोड़ा इंतज़ार कर सकते हैं या स्थानीय विश्लेषण मोड का उपयोग कर सकते हैं।',

    // Chat and messaging
    send_message: 'संदेश भेजें',
    type_message: 'यहाँ अपना संदेश लिखें...',
    typing: 'टाइप कर रहे हैं',
    online: 'ऑनलाइन',
    offline: 'ऑफलाइन',
    connected: 'जुड़ा हुआ',
    yesterday: 'कल',
    new_user: 'नया उपयोगकर्ता',

    // Additional system messages
    technical_analysis: 'तकनीकी विश्लेषण',

    // All the console.log messages
    https_detected_replit: "Replit वातावरण में HTTPS का पता चला - स्वचालित रूप से ऑफ़लाइन मोड सक्षम कर रहे हैं",
    offline_mode_auto_activated_replit: "Replit HTTPS वातावरण के कारण ऑफ़लाइन मोड स्वचालित सक्षम हुआ",
    offline_mode_enabled_trading_page: "ट्रेडिंग सिग्नल पेज में ऑफ़लाइन मोड सक्षम कर रहे हैं",
    offline_mode_disabled_trading_page: "ट्रेडिंग सिग्नल पेज में ऑफ़लाइन मोड अक्षम कर रहे हैं",
    websocket_security_error_detected: "HTTPS वातावरण में WebSocket सुरक्षा त्रुटि का पता चला, स्वचालित रूप से ऑफ़लाइन मोड सक्षम कर रहे हैं",
    using_locally_stored_price: "स्थानीय रूप से संग्रहीत मूल्य का उपयोग:",
    could_not_read_stored_price: "संग्रहीत मूल्य नहीं पढ़ सके:",
    fetching_price_offline_mode: "ऑफ़लाइन मोड में मूल्य प्राप्त कर रहे हैं",
    using_default_price_offline: "ऑफ़लाइन मोड में डिफ़ॉल्ट मूल्य का उपयोग",
    chat_simulation_initialized: "चैट सिमुलेशन सिस्टम इनिशियलाइज़ हुआ",
    backup_data_updated_log: "बैकअप डेटा अपडेट हुआ",
    using_backup_data_offline: "ऑफ़लाइन मोड में बैकअप डेटा का उपयोग",
    error_exporting_chat: "चैट निर्यात करने में त्रुटि:",
    error_parsing_imported_chat: "आयातित चैट डेटा को पार्स करने में त्रुटि:",
    error_importing_chat: "चैट आयात करने में त्रुटि:",
    error_notifications_permission: "सूचनाएं अनुमति मांगने में त्रुटि:",
    error_toggling_connection_mode: "कनेक्शन मोड टॉगल करने में त्रुटि:",
    default_api_keys_loaded: "डिफ़ॉल्ट API कुंजी सफलतापूर्वक लोड हुईं",
    invalid_file_format: "अमान्य फ़ाइल प्रारूप",
    failed_to_read_content: "सामग्री पढ़ने में विफल",
    theme_config_error: "theme.json सेटिंग्स लागू करने में विफल:",
    could_not_read_stored_price_warn: "संग्रहीत मूल्य पढ़ने में विफल:",
    market_analysis_for: "बाजार विश्लेषण के लिए:",
    market_analysis_response: "बाजार विश्लेषण प्रतिक्रिया:",
    signal_received_from_server: "सर्वर से प्राप्त सिग्नल:",
    signal_type_received: "प्राप्त सिग्नल प्रकार:",
    signal_after_processing: "प्रसंस्करण के बाद सिग्नल:",
    signal_converted_to_up: "सिग्नल को UP में परिवर्तित किया गया",
    signal_converted_to_down: "सिग्नल को DOWN में परिवर्तित किया गया",
    signal_no_match_using_wait: "सिग्नल किसी स्थिति से मेल नहीं खाता, WAIT का उपयोग",

    // Toast messages for ChatPage
    export_success: "चैट सफलतापूर्वक निर्यात हुई",
    export_success_desc: "चैट फ़ाइल में सेव हुई",
    export_error: "निर्यात त्रुटि",
    export_error_desc: "चैट निर्यात करने का प्रयास करते समय एक त्रुटि हुई",
    import_success: "चैट सफलतापूर्वक आयात हुई",
    import_success_desc: "संदेश आयात हुए",
    import_error: "आयात त्रुटि",
    import_error_desc: "अमान्य या दूषित फ़ाइल",
    read_content_failed: "सामग्री पढ़ने में विफल",
    notifications_blocked: "सूचनाएं अवरुद्ध हुईं",

    // Toast messages for TradingSignalPage
    offline_mode_enabled_title: "ऑफ़लाइन मोड सक्षम हुआ",
    offline_mode_enabled_desc: "स्थानीय रूप से संग्रहीत डेटा का उपयोग किया जाएगा। कुछ सुविधाएं सीमित हो सकती हैं।",
    connection_restored_title: "कनेक्शन बहाल हुआ",
    connection_restored_desc: "सर्वर से सफलतापूर्वक जुड़ाव हुआ।",
    signal_analysis_pending_title: "सिग्नल विश्लेषण जारी है",
    signal_analysis_pending_desc: "हम बाजार विश्लेषण अपडेट कर रहे हैं। आप संग्रहीत डेटा का उपयोग जारी रख सकते हैं।",
    cached_data_used_title: "कैश्ड डेटा का उपयोग",
    cached_data_used_desc: "सर्वर से अमान्य कीमत प्राप्त हुई, स्थानीय डेटा का उपयोग।",
    data_analysis_error_title: "डेटा विश्लेषण त्रुटि",
    data_analysis_error_desc: "नवीनतम डेटा नहीं मिल सका, स्थानीय डेटा का उपयोग।",
    local_mode_switch_title: "स्थानीय मोड में स्विच हुआ",
    local_mode_switch_desc: "सर्वर कनेक्शन विफलता के कारण स्थानीय एल्गोरिथम का उपयोग।",
    data_updating_title: "डेटा अपडेट हो रहा है",
    data_updating_desc: "वर्तमान में बाजार डेटा अपडेट कर रहे हैं और रुझानों का विश्लेषण कर रहे हैं।",

    // Additional messages for TradingSignalPage
    current_price_label: "वर्तमान मूल्य",
    cached_data_loaded_desc: "विश्लेषण निरंतरता सुनिश्चित करने के लिए पहले से कैश्ड डेटा लोड किया गया।",
    enable_offline_mode_button: "ऑफ़लाइन मोड सक्षम करें",
    updating_price_data_desc: "हम मूल्य डेटा अपडेट कर रहे हैं। आप जारी रखने के लिए स्थानीय विश्लेषण मोड सक्षम कर सकते हैं।",
    calculating_enhanced_target_price: "उन्नत लक्ष्य मूल्य की गणना:",
    offline_mode_reason_https_websocket: "HTTPS में WebSocket कनेक्शन सीमाएं",
    offline_mode_reason_network: "नेटवर्क त्रुटि",
    offline_mode_reason_api_limit: "API उपयोग सीमा पार हुई",
    offline_mode_reason_timeout: "कनेक्शन टाइमआउट",
    offline_mode_reason_unknown: "अज्ञात कारण",
    offline_mode_activation_reason: "सक्रियता कारण:",

    // AdminLayout translations
    admin_login_required: "नियंत्रण पैनल तक पहुंचने के लिए व्यवस्थापक के रूप में लॉगिन करना चाहिए",
    api_keys_label: "API कीज़",
    deployment_servers_label: "डिप्लॉयमेंट सर्वर",

    // IndicatorsPage translations
    market_status_fetch_error: "बाजार स्थिति प्राप्त करने में त्रुटि:",
    market_status_update_error: "बाजार स्थिति अपडेट करने में त्रुटि:",
    market_status_api_error: "बाजार स्थिति प्राप्त करने में विफल",
    updated: "अपडेटेड",
    indicator_updated: "संकेतक डेटा सफलतापूर्वक अपडेट हुआ",

    // Console messages from hooks and other files
    heatmap_data_fetch_error: "हीटमैप डेटा प्राप्त करने में त्रुटि:",
    using_cached_heatmap_data: "heatmap_data से कैश्ड डेटा का उपयोग, डेटा आयु:",
    using_cached_pair_data: "जोड़ी के लिए कैश्ड डेटा का उपयोग",
    pair_data_fetch_error: "डेटा पुनर्प्राप्त करने में त्रुटि",
    backup_data_fetch_error: "बैकअप डेटा पुनर्प्राप्त करने में त्रुटि:",
    local_heatmap_data_error: "स्थानीय संग्रहण से हीटमैप डेटा पुनर्प्राप्त करने में त्रुटि:",
    analysis_results_from_real_data: "वास्तविक डेटा से विश्लेषण परिणाम:",
    market_analysis_error: "बाजार विश्लेषण त्रुटि:",
    retry_fetch_attempt: "मूल्य प्राप्त करने का प्रयास असफल, पुनः प्रयास कर रहे हैं",
    invalid_price_received: "अमान्य मूल्य प्राप्त हुआ:",
    fetch_pair_price_error: "जोड़ी मूल्य प्राप्त करने में त्रुटि:",
    using_cached_price_on_failure: "अनुरोध विफलता के कारण स्थानीय रूप से कैश्ड मूल्य का उपयोग:",
    using_known_volatility: "के लिए ज्ञात ऐतिहासिक अस्थिरता का उपयोग",
    using_estimated_volatility: "के लिए अनुमानित अस्थिरता का उपयोग",
    enhanced_base_volatility_factor: "उन्नत आधार अस्थिरता कारक:",
    expected_change_enhanced: "वृद्धि कारकों के बाद अपेक्षित परिवर्तन:",
    final_enhanced_target_price: "अंतिम उन्नत लक्ष्य मूल्य:",
    current_price_updated: "वर्तमान मूल्य अपडेट हुआ:",
    received_analysis_results: "विश्लेषण परिणाम प्राप्त हुए:",
    data_age: "डेटा आयु",

    // Settings and general success/error messages  
    settings_saved_successfully: 'सेटिंग्स सफलतापूर्वक सेव हुईं',
    language_preference_saved: 'आपकी भाषा प्राथमिकता सेव हो गई है।',
    error_saving_settings: 'सेटिंग्स सेव करने में त्रुटि',
    success: 'सफल',
    error: 'त्रुटि',
    failed: 'विफल',
    successfully_added: 'सफलतापूर्वक जोड़ा गया',
    successfully_updated: 'सफलतापूर्वक अपडेट हुआ',
    successfully_deleted: 'सफलतापूर्वक हटाया गया',
    user_added_successfully: 'उपयोगकर्ता सफलतापूर्वक जोड़ा गया',
    user_updated_successfully: 'उपयोगकर्ता की जानकारी सफलतापूर्वक अपडेट हुई',
    user_deleted_successfully: 'उपयोगकर्ता सफलतापूर्वक हटाया गया',
    failed_to_add_user: 'उपयोगकर्ता जोड़ने में विफल',
    failed_to_update_user: 'उपयोगकर्ता की जानकारी अपडेट करने में विफल',
    failed_to_delete_user: 'उपयोगकर्ता हटाने में विफल',
    failed_to_fetch_users: 'उपयोगकर्ता सूची प्राप्त करने में विफल',
    
    // Server and deployment messages
    server_added_successfully: 'सर्वर सफलतापूर्वक जोड़ा गया',
    server_updated_successfully: 'सर्वर की जानकारी सफलतापूर्वक अपडेट हुई',
    server_deleted_successfully: 'सर्वर सफलतापूर्वक हटाया गया',
    connected_successfully: 'सफलतापूर्वक कनेक्ट हुआ',
    connection_failed: 'कनेक्शन विफल',
    deployed_successfully: 'सफलतापूर्वक डिप्लॉय हुआ',
    deployment_failed: 'डिप्लॉयमेंट विफल',
    failed_to_fetch_servers: 'सर्वर सूची प्राप्त करने में विफल',
    failed_to_fetch_deployment_logs: 'डिप्लॉयमेंट लॉग प्राप्त करने में विफल',
    text_copied_to_clipboard: 'टेक्स्ट क्लिपबोर्ड में कॉपी हुआ',
    
    // API Keys messages
    api_key_saved_successfully: 'API कुंजी सफलतापूर्वक सेव हुई',
    failed_to_save_api_key: 'API कुंजी सेव करने में विफल',
    api_key_deleted_successfully: 'API कुंजी सफलतापूर्वक हटाई गई',
    failed_to_delete_api_key: 'API कुंजी हटाने में विफल',
    failed_to_fetch_api_keys: 'API कुंजी प्राप्त करने में विफल',
    key_list_updated_successfully: 'कुंजी सूची सफलतापूर्वक अपडेट हुई',
    failed_to_update_key_list: 'कुंजी सूची अपडेट करने में विफल',
    
    // Auth messages
    login_successful: 'लॉगिन सफल',
    account_created_successfully: 'खाता सफलतापूर्वक बनाया गया',
    account_creation_failed: 'खाता बनाने में विफल',
    logout_successful: 'लॉगआउट सफल',
    logout_failed: 'लॉगआउट विफल',
    
    // Admin messages
    admin_password_reset_successfully: 'व्यवस्थापक पासवर्ड सफलतापूर्वक रीसेट हुआ',


    
    // System updater messages
    system_update_completed: 'सिस्टम अपडेट पूरा हुआ',
    system_update_failed: 'सिस्टम अपडेट विफल',
    
    // Trading and market messages
    refreshing_data: 'डेटा रीफ्रेश हो रहा है',
    fetching_latest_prices: 'नवीनतम कीमतों को प्राप्त कर रहे हैं। कृपया प्रतीक्षा करें या बाद में पुनः प्रयास करें।',

    // Missing keys from English
    second_unit: 'सेकंड',

    // Admin Reset Password
    admin_reset_password_title: 'व्यवस्थापक पासवर्ड रीसेट करें',
    admin_reset_password_desc: 'आप यहाँ व्यवस्थापक के लिए नया पासवर्ड सेट कर सकते हैं। कृपया मजबूत और सुरक्षित पासवर्ड का उपयोग करें।',
    new_password: 'नया पासवर्ड',

    enter_new_password: 'नया पासवर्ड दर्ज करें',
    re_enter_password: 'पासवर्ड फिर से दर्ज करें',
    reset_password_btn: 'पासवर्ड रीसेट करें',
    back_to_dashboard: 'डैशबोर्ड पर वापस जाएं',
    resetting: 'रीसेट कर रहे हैं...',

    // API Keys Management
    api_keys_management: 'API कुंजी प्रबंधन',
    api_key_name: 'कुंजी नाम',
    api_key_value: 'कुंजी मान',
    api_key_description: 'कुंजी विवरण',
    is_secret: 'गुप्त?',
    key_name_required: 'कुंजी नाम आवश्यक है',
    key_value_required: 'कुंजी मान आवश्यक है',
    test_key: 'कुंजी परीक्षण',
    testing: 'परीक्षण कर रहे हैं...',
    valid: 'वैध',
    invalid: 'अवैध',
    untested: 'अपरीक्षित',

    // Service descriptions for API keys
    twelvedata_api_title: 'TwelveData API कुंजी',
    twelvedata_api_desc: 'विदेशी मुद्रा और स्टॉक मूल्य डेटा प्राप्त करने के लिए उपयोग किया जाता है। आप उनकी आधिकारिक वेबसाइट से मुफ्त कुंजी प्राप्त कर सकते हैं।',
    primary_api_title: 'प्राथमिक Alpha Vantage कुंजी',
    primary_api_desc: 'स्टॉक और वित्तीय संकेतक डेटा के लिए Alpha Vantage सेवा की प्राथमिक कुंजी।',
    backup_api_title: 'बैकअप Alpha Vantage कुंजियां',
    backup_api_desc: 'Alpha Vantage सेवा के लिए बैकअप कुंजियों की सूची। कुंजियों को अल्पविराम से अलग करना चाहिए।',
    binance_api_title: 'Binance API कुंजी',
    binance_api_desc: 'Binance प्लेटफॉर्म से क्रिप्टोकरेंसी मूल्य डेटा तक पहुंचने के लिए उपयोग किया जाता है।',
    binance_secret_title: 'Binance गुप्त कुंजी',
    binance_secret_desc: 'Binance API के साथ प्रमाणीकरण के लिए आवश्यक गुप्त कुंजी।',
    market_api_title: 'सामान्य बाजार कुंजी',
    market_api_desc: 'विभिन्न बाजार डेटा सेवाओं तक पहुंचने के लिए उपयोग की जाने वाली सामान्य कुंजी।',
    service_url: 'सेवा URL',
    usage: 'उपयोग',
    required: 'आवश्यक',
    optional: 'वैकल्पिक',
    category: 'श्रेणी',
    market_data: 'बाजार डेटा',
    cryptocurrency: 'क्रिप्टोकरेंसी',
    general: 'सामान्य',

    // Additional API Keys Management messages
    failed_to_get_api_keys: 'API कुंजियां प्राप्त करने में विफल',
    saved_successfully: 'सफलतापूर्वक सहेजा गया',
    saved_key_successfully: 'कुंजी {key} सफलतापूर्वक सहेजी गई',
    test_successful: 'परीक्षण सफल',
    test_failed: 'परीक्षण असफल',
    failed_to_test_key: 'कुंजी परीक्षण में विफल',
    deleted_successfully: 'सफलतापूर्वक हटाया गया',
    deleted_key_successfully: 'कुंजी {key} सफलतापूर्वक हटाई गई',
    failed_to_delete_key: 'कुंजी {key} हटाने में विफल',
    update_key: 'कुंजी अपडेट करें',
    test_key_button: 'कुंजी परीक्षण',
    add_key: 'कुंजी जोड़ें',
    update_key_title: 'कुंजी अपडेट करें: {key}',
    add_new_key: 'नई कुंजी जोड़ें',
    api_key_example: 'उदाहरण: MARKET_API_KEY',
    enter_key_value: 'कुंजी मान दर्ज करें',
    key_purpose_description: 'इस कुंजी के उद्देश्य का विवरण',
    updated_successfully: 'सफलतापूर्वक अपडेट किया गया',
    updated_keys_successfully: 'कुंजी सूची सफलतापूर्वक अपडेट की गई',
    failed_to_update_keys: 'कुंजी सूची अपडेट करने में विफल',

    // Error and success messages


    failed_to_reset_password: 'पासवर्ड रीसेट करने में विफल',
    error_occurred_while_resetting_password: 'पासवर्ड रीसेट करते समय त्रुटि हुई',


    // Additional common messages
    confirm_delete_key: 'क्या आप वाकई कुंजी हटाना चाहते हैं',
    unknown_error: 'अज्ञात त्रुटि',
    please_login_to_access: 'इस पृष्ठ तक पहुंचने के लिए कृपया लॉगिन करें',
    no_permission_access: 'आपके पास इस पृष्ठ तक पहुंचने की अनुमति नहीं है',

    // Trading platforms
    metatrader4: 'मेटाट्रेडर 4',
    metatrader5: 'मेटाट्रेडर 5',
    binomo: 'बिनोमो',
    deriv: 'डेरिव',
    exness: 'एक्सनेस',
    fxpro: 'एफएक्स प्रो',
    icmarkets: 'आईसी मार्केट्स',
    xm: 'एक्सएम',
    xtb: 'एक्सटीबी',
    alpari: 'अल्पारी',
    plus500: 'प्लस500',
    etoro: 'ईटोरो',
    avatrade: 'अवाट्रेड',
    pepperstone: 'पेपरस्टोन',
    hotforex: 'हॉटफोरेक्स',
    trading_platform: 'ट्रेडिंग प्लेटफॉर्म',
    selected_platform: 'चयनित प्लेटफॉर्म',

    // Trading messages
    analysis_data_updating: 'विश्लेषण डेटा अपडेट हो रहा है। आप सभी सुविधाओं के साथ ऐप का उपयोग जारी रखने के लिए ऑफलाइन विश्लेषण मोड का उपयोग कर सकते हैं।',

    // Deployment stages
    deployment_stage_connection: 'कनेक्शन',
    deployment_stage_package: 'पैकेज बनाना',
    deployment_stage_upload: 'फाइल अपलोड',
    deployment_stage_execution: 'कार्यान्वयन',
    deployment_stage_completion: 'पूर्णता',


    // Trading pairs names
    'EUR/USD': 'यूरो / अमेरिकी डॉलर',
    'GBP/USD': 'ब्रिटिश पाउंड / अमेरिकी डॉलर',
    'USD/JPY': 'अमेरिकी डॉलर / जापानी येन',
    'USD/CHF': 'अमेरिकी डॉलर / स्विस फ्रैंक',
    'EUR/JPY': 'यूरो / जापानी येन',
    'GBP/JPY': 'ब्रिटिश पाउंड / जापानी येन',
    'BTC/USDT': 'बिटकॉइन / टेदर',
    'ETH/USDT': 'एथेरियम / टेदर',
    'XRP/USDT': 'रिप्पल / टेदर',
    'AAPL': 'एप्पल इंक.',
    'MSFT': 'माइक्रोसॉफ्ट कॉर्पोरेशन',
    'GOOGL': 'गूगल एलएलसी',
    'AMZN': 'अमेज़न.कॉम इंक.'
  }
};

// تخزين مؤقت للترجمات المستخدمة حالياً
let translationCache: { [key: string]: string } = {};

// Function to detect browser language with English as default
// This function is kept for backward compatibility but no longer used as primary fallback
export function getBrowserLanguage(): string {
  if (typeof window !== 'undefined') {
    // Check saved language first
    const savedLang = localStorage.getItem('language');
    if (savedLang && ['ar', 'en', 'hi'].includes(savedLang)) {
      return savedLang;
    }
    // Note: Removed navigator.language detection to prevent browser language override
    // Always default to English for consistency
  }
  // English as default
  return 'en';
}

// Initialize current language
let currentLanguage = 'en'; // English as default language

// Normalize language codes to supported values
const normalizeLanguage = (lang: string): 'ar' | 'en' | 'hi' => {
  // Handle variations like 'ar-SA' -> 'ar', 'en-US' -> 'en', 'hi-IN' -> 'hi'
  const langCode = lang.toLowerCase().split('-')[0];
  if (langCode === 'ar') {
    console.log('Normalizing language:', lang, '=>', 'ar');
    return 'ar';
  } else if (langCode === 'hi') {
    console.log('Normalizing language:', lang, '=>', 'hi');
    return 'hi';
  } else {
    console.log('Normalizing language:', lang, '=>', 'en');
    return 'en';
  }
};

// Function to change language with optional database save
// FIXED: Always update DOM regardless of saveToDatabase flag
export const setLanguage = (lang: string, saveToDatabase: boolean = false) => {
  // Normalize language code first
  const normalizedLang = normalizeLanguage(lang);
  console.log('setLanguage called with:', lang, '=> normalized to:', normalizedLang, 'saveToDatabase:', saveToDatabase);
  
  // Update internal language state
  currentLanguage = normalizedLang;
  
  // ALWAYS update DOM attributes regardless of flags
  const isRTL = normalizedLang === 'ar';
  document.documentElement.setAttribute('lang', normalizedLang);
  document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');

  // Remove any existing direction classes to avoid conflicts
  document.documentElement.classList.remove('ar', 'rtl', 'ltr');
  document.body.classList.remove('font-arabic');
  
  // Add appropriate classes for the selected language
  if (isRTL) {
    document.documentElement.classList.add('ar', 'rtl');
    document.body.classList.add('font-arabic');
  } else {
    document.documentElement.classList.add('ltr');
  }

  console.log('DOM updated unconditionally:', {
    direction: isRTL ? 'RTL' : 'LTR',
    language: normalizedLang,
    htmlDir: document.documentElement.getAttribute('dir'),
    htmlLang: document.documentElement.getAttribute('lang'),
    htmlClasses: document.documentElement.className,
    bodyClasses: document.body.className
  });

  // Update localStorage for persistence
  localStorage.setItem('language', normalizedLang);
  try {
    const settings = JSON.parse(localStorage.getItem('settings') || '{}');
    settings.language = normalizedLang;
    localStorage.setItem('settings', JSON.stringify(settings));
    console.log('Language saved to localStorage:', normalizedLang);
  } catch (e) {
    console.error('Error saving language to settings:', e);
  }

  // Clear translation cache to force refresh
  translationCache = {};

  // Dispatch language change event
  window.dispatchEvent(new CustomEvent('languageChanged', { 
    detail: { language: normalizedLang, saveToDatabase } 
  }));

  console.log('Language change complete:', normalizedLang, 'Save to DB:', saveToDatabase);
};

// Enhanced translation function with user context support
export const t = (key: string, user?: any): string => {
  // Get current language with user context
  const lang = getCurrentLanguage(user);

  // Check if translation exists in cache
  const cacheKey = `${lang}:${key}`;
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }

  // Ensure language is supported, fallback to English
  const validLang = translations[lang] ? lang : 'en';

  // Save translation in cache
  const translation = translations[validLang]?.[key] || key;
  translationCache[cacheKey] = translation;

  return translation;
};

// Function to get current language with user context support
// Order: user.preferredLanguage > localStorage > 'en'
export const getCurrentLanguage = (user?: any): string => {
  // Priority 1: User is logged in and has preferred language in database
  if (user && user.preferredLanguage && translations[user.preferredLanguage]) {
    console.log('Language from user preferences:', user.preferredLanguage);
    return user.preferredLanguage;
  }
  
  try {
    // Priority 2: check saved settings in localStorage
    const settings = JSON.parse(localStorage.getItem('settings') || '{}');
    if (settings.language && translations[settings.language]) {
      console.log('Language from localStorage settings:', settings.language);
      return settings.language;
    }

    // Priority 3: check old localStorage
    const storedLang = localStorage.getItem('language');
    if (storedLang && translations[storedLang]) {
      console.log('Language from old localStorage:', storedLang);
      return storedLang;
    }
  } catch (error) {
    console.error('Error reading language from localStorage:', error);
  }

  // Priority 4: Default to English (no browser language detection)
  console.log('Using default language: en');
  return 'en';
};

// قائمة اللغات المدعومة
export const supportedLanguages = [
  { id: 'ar', name: 'العربية' },
  { id: 'en', name: 'English' },
  { id: 'hi', name: 'हिन्दी' },
];

// Function to initialize language system with user context
// Function to change language programmatically
export const changeLanguage = (newLanguage: string, saveToStorage: boolean = true, user?: any) => {
  if (typeof window !== 'undefined') {
    // Validate language
    const supportedLanguages = ['en', 'ar', 'hi'];
    if (!supportedLanguages.includes(newLanguage)) {
      console.warn('Unsupported language:', newLanguage, 'defaulting to en');
      newLanguage = 'en';
    }

    console.log('Language changed to:', newLanguage, 'Save to DB:', saveToStorage);
    
    // Update current language
    currentLanguage = newLanguage;
    
    // Save to localStorage if requested
    if (saveToStorage) {
      try {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        settings.language = newLanguage;
        localStorage.setItem('settings', JSON.stringify(settings));
      } catch {
        localStorage.setItem('settings', JSON.stringify({ language: newLanguage }));
      }
    }

    // Apply language settings to document
    document.documentElement.setAttribute('lang', newLanguage);
    document.documentElement.setAttribute('dir', newLanguage === 'ar' ? 'rtl' : 'ltr');

    // Add/remove Arabic-specific classes
    if (newLanguage === 'ar') {
      document.documentElement.classList.add('ar');
      document.body.classList.add('font-arabic');
    } else {
      document.documentElement.classList.remove('ar');
      document.body.classList.remove('font-arabic');
    }

    // Dispatch custom event for components to react to language change
    window.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { language: newLanguage, user }
    }));

    return newLanguage;
  }
  return 'en';
};

export const initializeLanguageSystem = (user?: any) => {
  if (typeof window !== 'undefined') {
    // Get language using proper fallback order
    const lang = getCurrentLanguage(user);
    
    // Only save to localStorage if user has a preference and it's different from current
    const shouldSaveToStorage = user && user.preferredLanguage;
    
    if (shouldSaveToStorage) {
      try {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        if (!settings.language || user.preferredLanguage !== settings.language) {
          settings.language = lang;
          localStorage.setItem('settings', JSON.stringify(settings));
        }
      } catch {
        localStorage.setItem('settings', JSON.stringify({ language: lang }));
      }
    }

    // Apply language settings to document
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    currentLanguage = lang;

    // Add Arabic-specific classes if needed
    if (lang === 'ar') {
      document.documentElement.classList.add('ar');
      document.body.classList.add('font-arabic');
    } else {
      document.documentElement.classList.remove('ar');
      document.body.classList.remove('font-arabic');
    }

    console.log('Language system initialized with:', lang, user ? '(from user data)' : '(from fallback)');
  }
};

// Initialize on module load for non-authenticated users
// Clear localStorage on logout utility function
export const clearLanguageOnLogout = () => {
  if (typeof window !== 'undefined') {
    try {
      // Clear language from settings
      const settings = JSON.parse(localStorage.getItem('settings') || '{}');
      delete settings.language;
      localStorage.setItem('settings', JSON.stringify(settings));
      
      // Clear old language storage
      localStorage.removeItem('language');
      
      // Reset to English
      changeLanguage('en', false);
      
      console.log('Language cleared on logout, reset to English');
    } catch (error) {
      console.error('Error clearing language on logout:', error);
      // Fallback: just reset to English
      changeLanguage('en', false);
    }
  }
};

if (typeof window !== 'undefined') {
  // Basic initialization without user context - always start with English
  const lang = 'en'; // Force English as initial language
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', 'ltr');
  currentLanguage = lang;
  
  // Remove any Arabic classes from initial load
  document.documentElement.classList.remove('ar');
  document.body.classList.remove('font-arabic');
  
  console.log('Initial language system setup with English');

  // Add listener for language changes - enhanced dynamic direction support
  window.addEventListener('languageChanged', (event: any) => {
    const detail = event.detail;
    const newLang = detail.language;
    const isRTL = newLang === 'ar';
    
    // Update HTML attributes
    document.documentElement.setAttribute('lang', newLang);
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    currentLanguage = newLang;
    
    // Apply/remove Arabic-specific styling and classes
    if (isRTL) {
      document.documentElement.classList.add('ar');
      document.body.classList.add('font-arabic');
      // Add RTL class for better CSS targeting
      document.documentElement.classList.add('rtl');
      document.documentElement.classList.remove('ltr');
    } else {
      document.documentElement.classList.remove('ar');
      document.body.classList.remove('font-arabic');
      // Add LTR class for better CSS targeting  
      document.documentElement.classList.add('ltr');
      document.documentElement.classList.remove('rtl');
    }
    
    // Dispatch additional RTL event for components that need to update icons/layouts
    window.dispatchEvent(new CustomEvent('directionChanged', { 
      detail: { direction: isRTL ? 'rtl' : 'ltr', language: newLang } 
    }));
    
    console.log(`Direction changed to: ${isRTL ? 'RTL' : 'LTR'} for language: ${newLang}`);
  });
}

// Function to set user's preferred language from database
export const setUserLanguage = (userPreferredLang: string | null) => {
  if (typeof window !== 'undefined' && userPreferredLang) {
    try {
      // Update settings with user's preferred language
      const settings = JSON.parse(localStorage.getItem('settings') || '{}');
      settings.language = userPreferredLang;
      localStorage.setItem('settings', JSON.stringify(settings));
      localStorage.setItem('language', userPreferredLang);
      
      // Update current language
      currentLanguage = userPreferredLang;
      document.documentElement.setAttribute('lang', userPreferredLang);
      document.documentElement.setAttribute('dir', userPreferredLang === 'ar' ? 'rtl' : 'ltr');
      
      // Clear translation cache
      translationCache = {};
      
      // Dispatch language change event
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: userPreferredLang } }));
      
      console.log('User preferred language set to:', userPreferredLang);
      return true;
    } catch (error) {
      console.error('Error setting user preferred language:', error);
      return false;
    }
  }
  return false;
};

// دالة تنسيق الأرقام حسب اللغة
export const formatNumber = (num: number | string, lang?: string): string => {
  const currentLang = lang || getCurrentLanguage();
  const numString = num.toString();
  
  // للعربية، نستخدم الأرقام الغربية مع RTL
  if (currentLang === 'ar') {
    // تحويل الأرقام العربية إلى غربية إذا كانت موجودة
    const arabicNumbers = '٠١٢٣٤٥٦٧٨٩';
    const westernNumbers = '0123456789';
    let result = numString;
    for (let i = 0; i < arabicNumbers.length; i++) {
      result = result.replace(new RegExp(arabicNumbers[i], 'g'), westernNumbers[i]);
    }
    return result;
  }
  
  return numString;
};

// دالة لإضافة classes مفيدة للنصوص المختلطة
export const getTextClasses = (hasNumbers: boolean = false): string => {
  const lang = getCurrentLanguage();
  let classes = '';
  
  if (lang === 'ar') {
    classes += 'text-right ';
    if (hasNumbers) {
      classes += 'mixed-text ';
    }
  } else {
    classes += 'text-left ';
  }
  
  return classes;
};

// Function to get user's preferred language with fallback order
export const getUserPreferredLanguage = (userPreferredLang?: string | null): string => {
  // Priority 1: User is logged in and has preferred language in database
  if (userPreferredLang && translations[userPreferredLang]) {
    return userPreferredLang;
  }
  
  // Priority 2: Saved in localStorage
  if (typeof window !== 'undefined') {
    try {
      const settings = JSON.parse(localStorage.getItem('settings') || '{}');
      if (settings.language && translations[settings.language]) {
        return settings.language;
      }
      
      const storedLang = localStorage.getItem('language');
      if (storedLang && translations[storedLang]) {
        return storedLang;
      }
    } catch (error) {
      console.error('Error reading language from localStorage:', error);
    }
  }
  
  // Priority 3: Browser language
  return getBrowserLanguage();
};