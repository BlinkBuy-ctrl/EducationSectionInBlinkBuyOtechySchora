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
};

export const translations = { en, ny };
export type TranslationKey = keyof typeof en;
