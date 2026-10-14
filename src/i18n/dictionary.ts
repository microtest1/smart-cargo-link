// Extendable translation dictionary. Add a language by adding a code to
// LANGUAGES and a matching entry in each key. Missing keys fall back to English.
export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "zh", label: "简体中文" },
  { code: "fr", label: "Français" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

type Entry = { en: string } & Partial<Record<LanguageCode, string>>;

export const dictionary = {
  "nav.signIn": { en: "Sign In", zh: "登录", fr: "Se connecter" },
  "nav.getStarted": { en: "Get Started", zh: "立即开始", fr: "Commencer" },
  "nav.track": { en: "Track Shipment", zh: "追踪货物", fr: "Suivre un envoi" },
  "nav.warehouse": { en: "Get the Right Warehouse Address", zh: "获取正确的仓库地址", fr: "Obtenir la bonne adresse d'entrepôt" },
  "nav.warehouseShort": { en: "Warehouse Addresses", zh: "仓库地址", fr: "Adresses d'entrepôt" },
  "nav.language": { en: "Language", zh: "语言", fr: "Langue" },
  "banner.warehouse": { en: "📦 China Warehouse Addresses – Click to View & Copy", zh: "📦 中国仓库地址 – 点击查看并复制", fr: "📦 Adresses d'entrepôt en Chine – Cliquez pour voir et copier" },
  "hero.badge": { en: "Ghana ↔ China Shipping Made Simple", zh: "加纳 ↔ 中国 轻松运输", fr: "Expédition Ghana ↔ Chine simplifiée" },
  "hero.title1": { en: "Reliable Shipping from", zh: "可靠的货运服务：", fr: "Expédition fiable de la" },
  "hero.title2": { en: "China to Ghana & West Africa", zh: "中国至加纳及西非", fr: "Chine vers le Ghana et l'Afrique de l'Ouest" },
  "hero.subtitle": { en: "Business & Personal Shipping Services. Sea, air and RoRo/breakbulk options to suit your cargo.", zh: "商务及个人货运服务。提供海运、空运及滚装/散杂货运输。", fr: "Services d'expédition professionnels et personnels. Fret maritime, aérien et RoRo/vrac selon votre marchandise." },
  "hero.trackCta": { en: "Track Your Shipment", zh: "追踪您的货物", fr: "Suivre votre envoi" },
  "hero.createAccount": { en: "Create Free Account", zh: "免费注册", fr: "Créer un compte gratuit" },
  "transit.title": { en: "Estimated Transit Times", zh: "预计运输时间", fr: "Délais de transit estimés" },
  "transit.note": { en: "Estimates only. Actual times depend on vessel/flight schedules and customs clearance.", zh: "仅为估计。实际时间取决于船期/航班及清关。", fr: "Estimations uniquement. Les délais réels dépendent des horaires et du dédouanement." },
  "transit.sea": { en: "Sea Freight", zh: "海运", fr: "Fret maritime" },
  "transit.seaTime": { en: "Estimated 45 days", zh: "预计 45 天", fr: "Environ 45 jours" },
  "transit.air": { en: "Air Freight", zh: "空运", fr: "Fret aérien" },
  "transit.airTime": { en: "Within 10 days", zh: "10 天内", fr: "Sous 10 jours" },
  "transit.roro": { en: "RoRo / Breakbulk", zh: "滚装 / 散杂货", fr: "RoRo / Vrac" },
  "transit.roroTime": { en: "Estimated 45 days", zh: "预计 45 天", fr: "Environ 45 jours" },
  "services.title": { en: "Talk to Us on WhatsApp", zh: "通过 WhatsApp 联系我们", fr: "Contactez-nous sur WhatsApp" },
  "services.subtitle": { en: "Each button opens WhatsApp with a ready message — review it and tap send.", zh: "每个按钮都会打开 WhatsApp 并预填消息，确认后发送即可。", fr: "Chaque bouton ouvre WhatsApp avec un message prérempli — vérifiez-le puis envoyez." },
  "services.buyYuan": { en: "Buy Chinese Yuan", zh: "购买人民币", fr: "Acheter du Yuan chinois" },
  "services.repacking": { en: "Repacking Request", zh: "重新包装申请", fr: "Demande de reconditionnement" },
  "services.newCustomer": { en: "New Customer / Living Outside Ghana", zh: "新客户 / 居住在加纳境外", fr: "Nouveau client / Résident hors du Ghana" },
  "services.visa": { en: "China Visa Assistance", zh: "中国签证协助", fr: "Assistance visa Chine" },
  "services.port": { en: "Port Clearance", zh: "港口清关", fr: "Dédouanement portuaire" },
  "services.freight": { en: "Freight Enquiries", zh: "货运咨询", fr: "Demandes de fret" },
  "services.customerService": { en: "Customer Service & Information", zh: "客户服务与信息", fr: "Service client et informations" },
  "services.call": { en: "Call", zh: "致电", fr: "Appeler" },
  "services.email": { en: "Email us", zh: "发送邮件", fr: "Nous écrire" },
  "services.new": { en: "New", zh: "新", fr: "Nouveau" },
  "features.title": { en: "Why Choose Amoliga Elite?", zh: "为什么选择 Amoliga Elite？", fr: "Pourquoi choisir Amoliga Elite ?" },
  "features.subtitle": { en: "A complete logistics solution designed for businesses and individuals shipping between Ghana and China.", zh: "为加纳与中国之间运输的企业和个人打造的完整物流方案。", fr: "Une solution logistique complète pour les entreprises et particuliers entre le Ghana et la Chine." },
  "features.tracking": { en: "Real-Time Tracking", zh: "实时追踪", fr: "Suivi en temps réel" },
  "features.trackingDesc": { en: "Track your packages from origin to destination with live updates", zh: "从发货地到目的地实时追踪您的包裹", fr: "Suivez vos colis de l'origine à la destination en direct" },
  "features.options": { en: "Sea, Air & RoRo", zh: "海运、空运及滚装", fr: "Maritime, aérien et RoRo" },
  "features.optionsDesc": { en: "Sea freight est. 45 days, air freight within 10 days, RoRo/breakbulk est. 45 days", zh: "海运约 45 天，空运 10 天内，滚装/散杂货约 45 天", fr: "Maritime ~45 jours, aérien sous 10 jours, RoRo/vrac ~45 jours" },
  "features.warehouse": { en: "Warehouse Network", zh: "仓库网络", fr: "Réseau d'entrepôts" },
  "features.warehouseDesc": { en: "Dedicated warehouse addresses in China and Ghana for easy shipping", zh: "在中国和加纳设有专属仓库地址", fr: "Adresses d'entrepôt dédiées en Chine et au Ghana" },
  "features.secure": { en: "Secure & Reliable", zh: "安全可靠", fr: "Sûr et fiable" },
  "features.secureDesc": { en: "Your cargo is protected with our trusted logistics network", zh: "我们可信赖的物流网络保护您的货物", fr: "Votre marchandise est protégée par notre réseau de confiance" },
  "warehouse.badge": { en: "China Warehouse", zh: "中国仓库", fr: "Entrepôt en Chine" },
  "warehouse.title": { en: "China Warehouse Addresses", zh: "中国仓库地址", fr: "Adresses d'entrepôt en Chine" },
  "warehouse.desc": { en: "All of our China warehouse addresses are kept in one place, arranged and ready to copy for your supplier.", zh: "我们所有的中国仓库地址都集中在此，方便复制给您的供应商。", fr: "Toutes nos adresses d'entrepôt en Chine, prêtes à copier pour votre fournisseur." },
  "seo.title": { en: "Our China to Ghana Shipping Services", zh: "我们的中国至加纳运输服务", fr: "Nos services d'expédition Chine–Ghana" },
  "seo.desc": { en: "Explore how each service works, what it costs to consider, and which option fits your cargo.", zh: "了解每项服务的运作方式及最适合您货物的选项。", fr: "Découvrez chaque service et l'option adaptée à votre marchandise." },
  "seo.newTo": { en: "New to importing?", zh: "首次进口？", fr: "Nouveau dans l'importation ?" },
  "seo.guides": { en: "Read our China to Ghana shipping guides", zh: "阅读我们的中国至加纳运输指南", fr: "Lisez nos guides d'expédition Chine–Ghana" },
  "cta.title": { en: "Ready to Ship with Amoliga Elite?", zh: "准备好与 Amoliga Elite 一起发货了吗？", fr: "Prêt à expédier avec Amoliga Elite ?" },
  "cta.desc": { en: "Join businesses and individuals who trust Amoliga Elite Freight & Logistics for their Ghana-China shipping needs.", zh: "加入信赖 Amoliga Elite 的企业与个人。", fr: "Rejoignez les entreprises et particuliers qui font confiance à Amoliga Elite." },
  "footer.guides": { en: "Shipping Guides", zh: "运输指南", fr: "Guides d'expédition" },
  "footer.privacy": { en: "Privacy Policy", zh: "隐私政策", fr: "Politique de confidentialité" },
  "auth.back": { en: "Back", zh: "返回", fr: "Retour" },
  "auth.welcomeBack": { en: "Welcome Back", zh: "欢迎回来", fr: "Bon retour" },
  "auth.signInSubtitle": { en: "Sign in to track your shipments", zh: "登录以追踪您的货物", fr: "Connectez-vous pour suivre vos envois" },
  "auth.or": { en: "or", zh: "或", fr: "ou" },
  "auth.companyAdminQ": { en: "Are you a company administrator?", zh: "您是公司管理员吗？", fr: "Êtes-vous administrateur d'entreprise ?" },
  "auth.companyAdminLogin": { en: "Company Admin Login", zh: "公司管理员登录", fr: "Connexion administrateur" },
  "auth.agreeSignIn": { en: "By signing in, you agree to our", zh: "登录即表示您同意我们的", fr: "En vous connectant, vous acceptez notre" },
  "auth.agreeSignUp": { en: "By creating an account, you agree to our", zh: "创建账户即表示您同意我们的", fr: "En créant un compte, vous acceptez notre" },
  "auth.email": { en: "Email", zh: "电子邮箱", fr: "E-mail" },
  "auth.password": { en: "Password", zh: "密码", fr: "Mot de passe" },
  "auth.forgot": { en: "Forgot password?", zh: "忘记密码？", fr: "Mot de passe oublié ?" },
  "auth.signingIn": { en: "Signing in...", zh: "登录中...", fr: "Connexion..." },
  "auth.createAccount": { en: "Create Account", zh: "创建账户", fr: "Créer un compte" },
  "auth.signUpSubtitle": { en: "Get your unique tracking code", zh: "获取您的专属追踪码", fr: "Obtenez votre code de suivi unique" },
  "auth.fullName": { en: "Full Name", zh: "姓名", fr: "Nom complet" },
  "auth.phone": { en: "Phone Number", zh: "电话号码", fr: "Numéro de téléphone" },
  "auth.creating": { en: "Creating account...", zh: "正在创建账户...", fr: "Création du compte..." },
  "auth.haveAccount": { en: "Already have an account?", zh: "已有账户？", fr: "Vous avez déjà un compte ?" },
  "auth.noAccount": { en: "Don't have an account?", zh: "还没有账户？", fr: "Pas encore de compte ?" },
} satisfies Record<string, Entry>;

export type TranslationKey = keyof typeof dictionary;

export function translate(lang: LanguageCode, key: TranslationKey): string {
  const entry = dictionary[key] as Entry;
  return entry[lang] ?? entry.en;
}
