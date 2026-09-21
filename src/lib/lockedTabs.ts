/**
 * Sections whose backend isn't built yet.
 *
 * They still show up in the tab bar and the menu, but people can't open them —
 * tapping one just shows a small "under maintenance" message.
 *
 * When a section's backend is ready, delete its name from this list and it
 * opens normally again. Nothing else needs to change.
 *
 * The names are the tab keys: "scholarships", "jobs", "universities"
 * (universities = Higher Education).
 */
export const LOCKED_TABS: readonly string[] = ["universities", "jobs", "scholarships"];

export function isTabLocked(tab: string | null | undefined): boolean {
  return !!tab && LOCKED_TABS.indexOf(tab) !== -1;
}
