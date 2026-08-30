export const NAVIGATION_FEEDBACK_EVENT = "otopass:navigation-feedback";

export function announceNavigationStart(label: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NAVIGATION_FEEDBACK_EVENT, { detail: { label } }));
}
