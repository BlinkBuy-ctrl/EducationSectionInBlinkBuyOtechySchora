/**
 * SchoraHub translations — English (en) + Chichewa (ny).
 *
 * IMPORTANT: the Chichewa strings below are a best-effort first pass, not
 * verified by a native speaker. Bkazio — please read through the "ny"
 * column and correct anything that sounds off or that Malawian users
 * wouldn't actually say in the app. This file is the ONLY place that
 * needs editing to fix wording; nothing else in the codebase needs to
 * change.
 *
 * To add a new translatable string anywhere in the app:
 *   1. Add a key here with its "en" and "ny" text.
 *   2. In the component, call t("your_new_key") instead of hardcoding text.
 */

export type Language = "en" | "ny";

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ny", label: "Chichewa" },
];

const en = {
  // ── Top bar / nav ──
  nav_home: "Home",
  nav_stats: "My Stats",
  nav_search: "Search",
  nav_adverts: "Adverts",

  // ── Header menu ──
  menu_section_sections: "Sections",
  menu_section_personal: "Personal",
  menu_section_utility: "Utility",
  menu_section_earn: "Earn",
  menu_section_language: "Language",
  menu_home: "Home",
  menu_browse: "Browse",
  menu_audio_books: "Audio Books",
  menu_scholarships: "Scholarships",
  menu_tutors: "Tutors",
  menu_jobs: "Jobs",
  menu_universities: "Universities",
  menu_bookstore: "E-BookStore",
  menu_adverts: "Adverts",
  menu_saved: "Saved",
  menu_my_stats: "My Stats",
  menu_book_request_center: "Book Request Center",
  menu_about_us: "About Us",
  menu_income_skills: "Income Skills",
  lang_english: "English",
  lang_chichewa: "Chichewa",

  // ── Accessibility labels ──
  aria_browse_sections: "Browse all sections",
  aria_scroll_top: "Scroll to top",
  aria_scroll_bottom: "Scroll to bottom",
  aria_refresh: "Refresh content",

  // ── Splash screen ──
  splash_tagline: "Education Hub · Malawi",
  splash_powered_by: "Powered By Otechy",
  pill_past_papers: "📚 Past Papers",
  pill_scholarships: "🏆 Scholarships",
  pill_tutors: "👨‍🏫 Tutors",
  pill_textbooks: "📖 Textbooks",
  pill_notes: "📝 Notes",

  // ── 404 page ──
  page_not_found: "Page not found",
  back_to_hub: "Back to Education Hub",

  // ── education.tsx (main hub) ──
  did_you_know: "Did You Know SchoraHub Consist?",
  shortcut_higher_education: "Higher Education",
  filter_all: "All",
  filter_free: "Free",
  filter_paid: "Paid",
  content_documents: "Documents",
  aria_search_resources: "Search resources",
  aria_search_audiobooks: "Search audio books",
  aria_open_ai_mode: "Open AI Mode",
  fetching_resources: "Fetching resources",
  fetching_audio_books: "Fetching audio books",
  no_resources_found: "No resources found",
  no_audio_books_found: "No audio books found",
  be_first_to_upload: "Be the first to upload one!",
  upload_resource: "Upload Resource",
  upload_audio_book: "Upload Audio Book",
  no_saved_items: "No saved items",
  tap_bookmark_hint: "Tap the bookmark icon on any resource or audio book.",
  section_resources: "Resources",
  toast_some_content_failed: "Some content failed to load",
  toast_couldnt_load: "Couldn't load: {items}. The rest of the page loaded fine.",
  toast_download_started: "✅ Download started!",
  toast_download_failed: "Download failed",
  toast_purchase_successful: "✅ Purchase successful!",
  toast_purchase_failed: "Purchase failed",
  toast_bookmark_removed: "Bookmark removed",
  toast_bookmarked: "🔖 Bookmarked!",
  toast_failed: "Failed",
  toast_tab_hint_on: "↔️ Tab scroll hint on",
  toast_tab_hint_off: "↔️ Tab scroll hint off",
  toast_cat_hint_on: "↔️ Category scroll hint on",
  toast_cat_hint_off: "↔️ Category scroll hint off",
  confirm_purchase: "Purchase \"{title}\" for MK {price}?",

  // ── resource categories ──
  cat_past_papers: "Past Papers",
  cat_textbooks: "Textbooks",
  cat_notes: "Notes",
  cat_research: "Research",
  cat_other: "Other",

  // ── education level + subject filter (Browse) ──
  level_msce: "MSCE",
  level_jce: "JCE",
  level_primary: "Primary",
  pick_level_reminder: "👋 Pick your level above to see resources for MSCE, JCE, or Primary.",
  filter_all_subjects: "All Subjects",
  filters_show: "Show Filters",
  filters_hide: "Hide Filters",
  aria_toggle_filters: "Show or hide filters",

  // ── Continue Reading / New Books (Browse home strip) ──
  section_continue_reading: "Continue Reading",
  section_new_books: "New Books",
  toast_book_unavailable: "That book is no longer available",

  // ── Read Section v3.0 (Jim Kwik study flow, hosted by Mrs SchoraHub) ──
  read_companion_name: "Mrs SchoraHub",
  read_greeting: "Hie! 👋 Before we dive in, let's set your goal together.",
  read_forget_principle: "Quick reminder from Jim Kwik: try to forget what you already think you know here — being proud of what we know can get in the way of learning what's new.",
  read_goal_open_question: "What's your goal for studying this today?",
  read_intention_headline: "Want to get specific? Jot up to 3 things you're aiming for — or just skip ahead.",
  read_goal_label: "Goal {n}",
  read_goal_placeholder_1: "e.g. Understand the key causes of…",
  read_goal_placeholder_2: "e.g. Learn the formula for…",
  read_goal_placeholder_3: "e.g. Be able to define…",
  read_start_learning: "Let's go",
  read_skip_intention: "Nah, just take me to the book",
  read_last_time_goals: "Last time here, you told me you wanted to:",

  tool_pencil_pointer: "Pencil Pointer",
  tool_pencil_tip: "Using a visual pointer prevents your eyes from jumping around and boosts reading speed by up to 50%.",
  tool_audio_reader: "Audio Reader",
  tool_highlighter: "Highlighter",
  tool_notes: "Notes",
  audio_speed: "Speed",
  audio_reading_page: "Reading page {page}…",

  notes_title: "My Notes",
  notes_cues: "Cues",
  notes_main: "Main Notes",
  notes_summary: "Summary",
  notes_cues_placeholder: "Keywords, questions…",
  notes_main_placeholder: "Write what you're learning…",
  notes_summary_placeholder: "Summarise in your own words…",
  notes_highlights: "Highlights from this session",
  notes_empty_highlights: "Select text in the document and pick a colour — it'll show up here.",
  notes_saved: "Saved",

  break_title: "Break Time!",
  break_subtitle: "5 minutes to recharge",
  break_recall_title: "Active Recall Time!",
  break_recall_prompt: "Close your eyes or take a paper and explain out loud what you just read regarding your targets:",
  break_resume: "Resume Reading",
  break_skip: "Skip Break",
  break_time_left: "Break ends in {time}",

  reflection_title: "Great Focus!",
  reflection_subtitle: "You've completed 2 focus sessions (50 minutes)",
  reflection_confidence_q: "How confident do you feel about retaining the material from your last two sessions?",
  reflection_encouragement: "Great job! We're in this together. Consistency beats intensity every single time.",
  reflection_tip_water: "💧 Drink a glass of water",
  reflection_tip_walk: "🚶 Take a 15-minute walk",
  reflection_tip_feynman: "🧠 Try the Feynman Technique — teach this topic to someone else",
  reflection_continue: "Keep Reading",
  reflection_finish: "Finish for Now",

  pomodoro_focus: "Focus",
  pomodoro_break: "Break",
} as const;

// Chichewa — best-effort draft, flagged above for your review.
const ny: Record<keyof typeof en, string> = {
  nav_home: "Kunyumba",
  nav_stats: "Ziwerengero Zanga",
  nav_search: "Funafuna",
  nav_adverts: "Zotsatsa",

  menu_section_sections: "Magawo",
  menu_section_personal: "Zaumwini",
  menu_section_utility: "Ntchito Zina",
  menu_section_earn: "Peza Ndalama",
  menu_section_language: "Chilankhulo",
  menu_home: "Kunyumba",
  menu_browse: "Fufuza",
  menu_audio_books: "Mabuku a Mawu",
  menu_scholarships: "Zopereka za Maphunziro",
  menu_tutors: "Aphunzitsi",
  menu_jobs: "Ntchito",
  menu_universities: "Mayunivesite",
  menu_bookstore: "Sitolo ya Mabuku",
  menu_adverts: "Zotsatsa",
  menu_saved: "Zosungidwa",
  menu_my_stats: "Ziwerengero Zanga",
  menu_book_request_center: "Malo Opemphera Mabuku",
  menu_about_us: "Za Ife",
  menu_income_skills: "Luso Lopezera Ndalama",
  lang_english: "Chingerezi",
  lang_chichewa: "Chichewa",

  aria_browse_sections: "Onani magawo onse",
  aria_scroll_top: "Pitani pamwamba",
  aria_scroll_bottom: "Pitani pansi",
  aria_refresh: "Tsitsani zatsopano",

  splash_tagline: "Malo a Maphunziro · Malawi",
  splash_powered_by: "Wothandizidwa ndi Otechy",
  pill_past_papers: "📚 Mapepala Akale",
  pill_scholarships: "🏆 Zopereka za Maphunziro",
  pill_tutors: "👨‍🏫 Aphunzitsi",
  pill_textbooks: "📖 Mabuku a Maphunziro",
  pill_notes: "📝 Zolemba",

  page_not_found: "Tsamba silinapezeke",
  back_to_hub: "Bwererani ku Education Hub",

  did_you_know: "Kodi Mukudziwa Zomwe SchoraHub Ili Nazo?",
  shortcut_higher_education: "Maphunziro Apamwamba",
  filter_all: "Zonse",
  filter_free: "Zaulere",
  filter_paid: "Zolipira",
  content_documents: "Zolemba",
  aria_search_resources: "Funafuna zinthu",
  aria_search_audiobooks: "Funafuna mabuku a mawu",
  aria_open_ai_mode: "Tsegulani AI Mode",
  fetching_resources: "Kutenga zinthu",
  fetching_audio_books: "Kutenga mabuku a mawu",
  no_resources_found: "Palibe zinthu zapezeka",
  no_audio_books_found: "Palibe mabuku a mawu apezeka",
  be_first_to_upload: "Khalani woyamba kutumiza chinthu!",
  upload_resource: "Tumizani Chinthu",
  upload_audio_book: "Tumizani Buku la Mawu",
  no_saved_items: "Palibe zosungidwa",
  tap_bookmark_hint: "Dinani chizindikiro cha bookmark pa chinthu chilichonse kapena buku la mawu.",
  section_resources: "Zinthu",
  toast_some_content_failed: "Zina sizinatsitsidwe bwino",
  toast_couldnt_load: "Sizinathe kutsitsidwa: {items}. Zina zonse zatsitsidwa bwino.",
  toast_download_started: "✅ Kutsitsa kwayamba!",
  toast_download_failed: "Kutsitsa kwalephera",
  toast_purchase_successful: "✅ Kugula kwatheka!",
  toast_purchase_failed: "Kugula kwalephera",
  toast_bookmark_removed: "Bookmark yachotsedwa",
  toast_bookmarked: "🔖 Yasungidwa!",
  toast_failed: "Zalephera",
  toast_tab_hint_on: "↔️ Chizindikiro cha tab chayatsidwa",
  toast_tab_hint_off: "↔️ Chizindikiro cha tab chazimitsidwa",
  toast_cat_hint_on: "↔️ Chizindikiro cha gulu chayatsidwa",
  toast_cat_hint_off: "↔️ Chizindikiro cha gulu chazimitsidwa",
  confirm_purchase: "Mugula \"{title}\" ndi MK {price}?",

  cat_past_papers: "Mapepala Akale",
  cat_textbooks: "Mabuku a Maphunziro",
  cat_notes: "Zolemba",
  cat_research: "Kafukufuku",
  cat_other: "Zina",

  level_msce: "MSCE",
  level_jce: "JCE",
  level_primary: "Pulaimale",
  pick_level_reminder: "👋 Sankhani gawo lanu pamwamba kuti muwone zinthu za MSCE, JCE, kapena Pulaimale.",
  filter_all_subjects: "Maphunziro Onse",
  filters_show: "Onetsani Zosefera",
  filters_hide: "Bisani Zosefera",
  aria_toggle_filters: "Onetsani kapena bisani zosefera",

  // ── Continue Reading / New Books (Browse home strip) ──
  section_continue_reading: "Pitirizani Kuwerenga",
  section_new_books: "Mabuku Atsopano",
  toast_book_unavailable: "Bukuli silipezekanso",

  // ── Read Section v3.0 (Jim Kwik study flow, hosted by Mrs SchoraHub) ──
  read_companion_name: "Mrs SchoraHub",
  read_greeting: "Hie! 👋 Musanayambe, tiyeni tiike cholinga limodzi.",
  read_forget_principle: "Chikumbutso kuchokera kwa Jim Kwik: yesetsani kuiwala zomwe mukuganiza kuti mukudziwa pano — kudzikuza ndi zomwe timadziwa kumatsekereza kuphunzira zatsopano.",
  read_goal_open_question: "Kodi cholinga chanu popanga maphunziro lero ndi chiyani?",
  read_intention_headline: "Mukufuna kufotokoza mwatsatanetsatane? Lembani zinthu mpaka zitatu — kapena dumphani.",
  read_goal_label: "Cholinga {n}",
  read_goal_placeholder_1: "mwachitsanzo: Mvetsetsani zomwe zimayambitsa…",
  read_goal_placeholder_2: "mwachitsanzo: Phunzirani mfundo ya…",
  read_goal_placeholder_3: "mwachitsanzo: Muthe kutanthauzira…",
  read_start_learning: "Tiyeni",
  read_skip_intention: "Ayi, ndipititseni ku bukhu",
  read_last_time_goals: "Nthawi yatha pano, munandiuza kuti mumafuna:",

  tool_pencil_pointer: "Chosonyeza Mzere",
  tool_pencil_tip: "Kugwiritsa ntchito chosonyeza mzere kumateteza maso anu kuthamangathamanga ndipo kumathandiza kuwerenga mofulumira mpaka 50%.",
  tool_audio_reader: "Owerenga Mawu",
  tool_highlighter: "Chowunikira",
  tool_notes: "Zolemba",
  audio_speed: "Liwiro",
  audio_reading_page: "Akuwerenga tsamba {page}…",

  notes_title: "Zolemba Zanga",
  notes_cues: "Mafunso",
  notes_main: "Zolemba Zazikulu",
  notes_summary: "Chidule",
  notes_cues_placeholder: "Mawu ofunikira, mafunso…",
  notes_main_placeholder: "Lembani zomwe mukuphunzira…",
  notes_summary_placeholder: "Fotokozani mwachidule ndi mawu anu…",
  notes_highlights: "Zowunikiridwa muno",
  notes_empty_highlights: "Sankhani mawu mu chikalatacho ndipo mudinde utoto — zidzaonekera pano.",
  notes_saved: "Zasungidwa",

  break_title: "Nthawi Yopumula!",
  break_subtitle: "Mphindi 5 zopumula",
  break_recall_title: "Nthawi Yokumbukira!",
  break_recall_prompt: "Tsekani maso anu kapena tengani pepala ndipo fotokozani mokweza zomwe mwangowerenga zokhudza zolinga zanu:",
  break_resume: "Pitirizani Kuwerenga",
  break_skip: "Dumphani Kupumula",
  break_time_left: "Kupumula kwatsala {time}",

  reflection_title: "Mwayesetsa Kwambiri!",
  reflection_subtitle: "Mwamaliza magawo awiri oganizira (mphindi 50)",
  reflection_confidence_q: "Kodi mukudzitama bwanji kuti mudzakumbukira zomwe mwaphunzira m'magawo anu awiri apitawa?",
  reflection_encouragement: "Mwayesetsa kwambiri! Tili pamodzi pa izi. Kupitiriza ndikofunika kuposa kuthamanga.",
  reflection_tip_water: "💧 Mwerani madzi",
  reflection_tip_walk: "🚶 Yendani kwa mphindi 15",
  reflection_tip_feynman: "🧠 Yesani njira ya Feynman — phunzitsani mnzanu mutu umenewu",
  reflection_continue: "Pitirizani Kuwerenga",
  reflection_finish: "Malizani Pompano",

  pomodoro_focus: "Kukhazikika",
  pomodoro_break: "Kupumula",
};

export const translations = { en, ny };
export type TranslationKey = keyof typeof en;

// Rotating placeholder phrases in the search bar — kept separate from the
// flat key/value dictionary above since each is a list, not a single string.
export const SEARCH_PHRASES: Record<Language, { resources: string[]; audio: string[] }> = {
  en: {
    resources: [
      "Search Physics…", "Search Chemistry…", "Search Agriculture…", "Search Mathematics…",
      "Search Biology…", "Search Past Papers…", "Search Textbooks…",
    ],
    audio: [
      "Search Fiction…", "Search Educational…", "Search by author…", "Search by narrator…", "Search Audio Books…",
    ],
  },
  ny: {
    resources: [
      "Funafuni Physics…", "Funafuni Chemistry…", "Funafuni Ulimi…", "Funafuni Masamu…",
      "Funafuni Biology…", "Funafuni Mapepala Akale…", "Funafuni Mabuku a Maphunziro…",
    ],
    audio: [
      "Funafuni Nkhani…", "Funafuni Zamaphunziro…", "Funafuni ndi dzina la wolemba…", "Funafuni ndi dzina la wowerenga…", "Funafuni Mabuku a Mawu…",
    ],
  },
};
