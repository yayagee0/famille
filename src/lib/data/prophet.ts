// src/lib/questions/prophet.ts

export const prophetQuestions = [
  {
    id: "prophet-1",
    category: "Prophet",
    question_en: "Who is Prophet Muhammad ﷺ?",
    question_ar: "من هو النبي محمد ﷺ؟",
    format: "mcq",
    options: ["A king", "Allah’s last Prophet (النبي الأخير)", "An angel"],
    feedback_en: "Prophet Muhammad ﷺ is Allah’s final messenger.",
    feedback_ar: "مُّحَمَّدٌ رَّسُولُ اللَّهِ",
    reference: "Qur’an 48:29"
  },
  {
    id: "prophet-2",
    category: "Prophet",
    question_en: "Why do we love Prophet Muhammad ﷺ?",
    question_ar: "لماذا نحب النبي محمد ﷺ؟",
    format: "open",
    feedback_en: "Because he taught us kindness, honesty, prayer, and love of Allah.",
    feedback_ar: "لَقَدْ كَانَ لَكُمْ فِي رَسُولِ اللَّهِ أُسْوَةٌ حَسَنَةٌ",
    reference: "Qur’an 33:21"
  },
  {
    id: "prophet-3",
    category: "Prophet",
    question_en: "How did Prophet Muhammad ﷺ treat children?",
    question_ar: "كيف كان النبي محمد ﷺ يعامل الأطفال؟",
    format: "mcq",
    options: [
      "He smiled, played with them, and showed mercy",
      "He ignored them",
      "He was harsh with them"
    ],
    feedback_en: "He smiled, played with them, and showed mercy.",
    feedback_ar: "وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ",
    reference: "Qur’an 21:107"
  },
  {
    id: "prophet-4",
    category: "Prophet",
    question_en: "What did the Prophet ﷺ say about smiling?",
    question_ar: "ماذا قال النبي ﷺ عن الابتسامة؟",
    format: "mcq",
    options: ["It is a charity (صدقة)", "It is rude", "It is nothing"],
    feedback_en: "Smiling at others is charity.",
    feedback_ar: "تبسمك في وجه أخيك صدقة",
    reference: "Hadith – Tirmidhi"
  },
  {
    id: "prophet-5",
    category: "Prophet",
    question_en: "Did the Prophet ﷺ ever lie?",
    question_ar: "هل كذب النبي ﷺ؟",
    format: "mcq",
    options: ["Yes", "No, never (أبداً لم يكذب)", "Sometimes"],
    feedback_en: "Prophet Muhammad ﷺ was always truthful. He is called Al-Amin (the trustworthy).",
    feedback_ar: "وَمَا يَنطِقُ عَنِ الْهَوَى إِنْ هُوَ إِلَّا وَحْيٌ يُوحَى",
    reference: "Qur’an 53:3-4"
  },
  {
    id: "prophet-6",
    category: "Prophet",
    question_en: "What food did the Prophet ﷺ like?",
    question_ar: "ما هو الطعام الذي كان يحبه النبي ﷺ؟",
    format: "mcq",
    options: [
      "He liked simple foods such as dates, milk, and honey",
      "He liked only meat",
      "He only ate feasts"
    ],
    feedback_en: "He liked simple foods such as dates, milk, and honey.",
    feedback_ar: "النبي ﷺ أحب التمر واللبن والعسل",
    reference: "Hadith – Bukhari"
  },
  {
    id: "prophet-7",
    category: "Prophet",
    question_en: "Why do we say 'peace be upon him' after the Prophet’s name?",
    question_ar: "لماذا نقول صلى الله عليه وسلم بعد اسم النبي؟",
    format: "mcq",
    options: ["Because we are told to honor him", "Because it’s fun", "Because everyone does it"],
    feedback_en: "We say it to honor him, as Allah and the angels also send peace upon him.",
    feedback_ar: "إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ",
    reference: "Qur’an 33:56"
  },
  {
    id: "prophet-8",
    category: "Prophet",
    question_en: "How did the Prophet ﷺ treat animals?",
    question_ar: "كيف كان النبي ﷺ يعامل الحيوانات؟",
    format: "mcq",
    options: [
      "He was gentle with animals and told us to care for them",
      "He ignored animals",
      "He was cruel to animals"
    ],
    feedback_en: "He was gentle with animals and told us to care for them.",
    feedback_ar: "في كل كبد رطبة أجر",
    reference: "Hadith – Bukhari & Muslim"
  },
  {
    id: "prophet-9",
    category: "Prophet",
    question_en: "What did the Prophet ﷺ teach about neighbors?",
    question_ar: "ماذا علّم النبي ﷺ عن الجيران؟",
    format: "mcq",
    options: [
      "To be kind and generous to neighbors",
      "To ignore neighbors",
      "To only care for family"
    ],
    feedback_en: "He taught us to be kind and generous to neighbors.",
    feedback_ar: "ما زال جبريل يوصيني بالجار حتى ظننت أنه سيورثه",
    reference: "Hadith – Bukhari"
  },
  {
    id: "prophet-10",
    category: "Prophet",
    question_en: "Why is Prophet Muhammad ﷺ special?",
    question_ar: "لماذا النبي محمد ﷺ مميز؟",
    format: "open",
    feedback_en: "Because he is the last messenger and the best example for all people.",
    feedback_ar: "خاتم النبيين",
    reference: "Qur’an 33:40"
  },
  {
    id: "prophet-11",
    category: "Prophet",
    question_en: "When was Prophet Muhammad ﷺ born?",
    question_ar: "متى وُلِد النبي محمد ﷺ؟",
    format: "mcq",
    options: [
      "Year of the Elephant (عام الفيل, ~570 CE)",
      "500 CE",
      "After the Qur’an was revealed"
    ],
    feedback_en: "He was born in the Year of the Elephant (~570 CE).",
    feedback_ar: "وُلِد النبي ﷺ عام الفيل",
    reference: "Seerah – Ibn Hisham"
  },
  {
    id: "prophet-12",
    category: "Prophet",
    question_en: "Who was the father of Prophet Muhammad ﷺ?",
    question_ar: "من هو والد النبي محمد ﷺ؟",
    format: "mcq",
    options: ["Abdullah ibn Abd al-Muttalib", "Abu Talib", "Abdul Muttalib"],
    feedback_en: "His father was Abdullah ibn Abd al-Muttalib.",
    feedback_ar: "أبوه عبد الله بن عبد المطلب",
    reference: "Seerah"
  },
  {
    id: "prophet-13",
    category: "Prophet",
    question_en: "Who was the mother of Prophet Muhammad ﷺ?",
    question_ar: "من هي والدة النبي محمد ﷺ؟",
    format: "mcq",
    options: ["Aminah bint Wahb", "Khadijah", "Fatimah"],
    feedback_en: "His mother was Aminah bint Wahb.",
    feedback_ar: "أمه آمنة بنت وهب",
    reference: "Seerah"
  },
  {
    id: "prophet-14",
    category: "Prophet",
    question_en: "Was Prophet Muhammad ﷺ an orphan?",
    question_ar: "هل كان النبي محمد ﷺ يتيماً؟",
    format: "mcq",
    options: ["Yes, his parents died when he was young", "No", "Only his father died"],
    feedback_en: "Yes, he lost his father before birth and his mother when he was very young.",
    feedback_ar: "مَّا وَدَّعَكَ رَبُّكَ وَمَا قَلَى",
    reference: "Qur’an 93:3-6"
  },
  {
    id: "prophet-15",
    category: "Prophet",
    question_en: "Who raised Prophet Muhammad ﷺ after his parents passed away?",
    question_ar: "من ربّى النبي محمد ﷺ بعد وفاة والديه؟",
    format: "mcq",
    options: ["His grandfather Abdul Muttalib, then his uncle Abu Talib", "Only his father", "His teacher"],
    feedback_en: "He was first raised by his grandfather Abdul Muttalib, then by his uncle Abu Talib.",
    feedback_ar: "ربّاه جدّه عبد المطلب ثم عمه أبو طالب",
    reference: "Seerah"
  },
  {
    id: "prophet-16",
    category: "Prophet",
    question_en: "What was Prophet Muhammad ﷺ called before becoming a prophet?",
    question_ar: "بماذا كان يُلقّب النبي محمد ﷺ قبل أن يصبح نبيًا؟",
    format: "mcq",
    options: ["Al-Amin (The Trustworthy)", "Al-Malik (The King)", "Al-Qawi (The Strong)"],
    feedback_en: "He was known as Al-Amin (The Trustworthy).",
    feedback_ar: "كان يُلقّب بالأمين",
    reference: "Seerah"
  },
  {
    id: "prophet-17",
    category: "Prophet",
    question_en: "At what age did Prophet Muhammad ﷺ receive revelation and become a Prophet?",
    question_ar: "في أي عمر أصبح النبي محمد ﷺ نبيًا؟",
    format: "mcq",
    options: ["40 years old", "25 years old", "50 years old"],
    feedback_en: "He received revelation at the age of 40.",
    feedback_ar: "بُعث نبيًا وهو في سن الأربعين",
    reference: "Qur’an 96:1-5, Seerah"
  },
  {
    id: "prophet-18",
    category: "Prophet",
    question_en: "Who was the first wife of Prophet Muhammad ﷺ?",
    question_ar: "من كانت أول زوجة للنبي محمد ﷺ؟",
    format: "mcq",
    options: ["Khadijah bint Khuwaylid", "Aisha bint Abi Bakr", "Hafsa bint Umar"],
    feedback_en: "His first wife was Khadijah bint Khuwaylid.",
    feedback_ar: "خديجة بنت خويلد رضي الله عنها",
    reference: "Seerah"
  },
  {
    id: "prophet-19",
    category: "Prophet",
    question_en: "How long were Prophet Muhammad ﷺ and Khadijah married until she passed away?",
    question_ar: "كم سنة عاش النبي محمد ﷺ مع خديجة حتى وفاتها؟",
    format: "mcq",
    options: ["About 25 years", "10 years", "40 years"],
    feedback_en: "They were married for about 25 years until she passed away.",
    feedback_ar: "تزوجا حوالي ٢٥ سنة حتى وفاتها",
    reference: "Seerah"
  },
  {
    id: "prophet-20",
    category: "Prophet",
    question_en: "Did Prophet Muhammad ﷺ have children?",
    question_ar: "هل كان للنبي محمد ﷺ أولاد؟",
    format: "mcq",
    options: ["Yes, sons and daughters", "No children", "Only one son"],
    feedback_en: "Yes, he had sons and daughters. The most known are Fatimah, Ruqayyah, Umm Kulthum, Zaynab, Qasim, Abdullah, and Ibrahim.",
    feedback_ar: "نعم، كان له أولاد وبنات، منهم فاطمة، رقية، أم كلثوم، زينب، القاسم، عبد الله، وإبراهيم",
    reference: "Seerah"
  },
  {
    id: "prophet-21",
    category: "Prophet",
    question_en: "How old was Prophet Muhammad ﷺ when he passed away?",
    question_ar: "كم كان عمر النبي محمد ﷺ عندما توفي؟",
    format: "mcq",
    options: ["63 years old", "50 years old", "70 years old"],
    feedback_en: "He passed away at the age of 63.",
    feedback_ar: "توفي النبي ﷺ عن عمر 63 سنة",
    reference: "Seerah"
  },
  {
    id: "prophet-22",
    category: "Prophet",
    question_en: "When and where did Prophet Muhammad ﷺ die?",
    question_ar: "متى وأين توفي النبي محمد ﷺ؟",
    format: "mcq",
    options: [
      "In Madinah, year 11 AH (632 CE)",
      "In Makkah, year 10 AH",
      "In Jerusalem, year 15 AH"
    ],
    feedback_en: "He passed away in Madinah in the year 11 AH (632 CE).",
    feedback_ar: "توفي في المدينة المنورة سنة 11 هـ (632 م)",
    reference: "Seerah"
  },
  {
    id: "prophet-23",
    category: "Prophet",
    question_en: "What was the Prophet Muhammad ﷺ’s job before Prophethood?",
    question_ar: "ما هو عمل النبي محمد ﷺ قبل النبوة؟",
    format: "mcq",
    options: ["Shepherd and honest merchant (تاجر أمين)", "King", "Farmer only"],
    feedback_en: "He worked as a shepherd in his youth and later as a trustworthy merchant (Al-Amin).",
    feedback_ar: "كان راعياً ثم تاجراً أميناً قبل النبوة",
    reference: "Hadith – Bukhari, Seerah"
  }
];
