export const WEBSITE_TYPES = [
  { value: "business", label: "Business Website" },
  { value: "local_business", label: "Local Business" },
  { value: "ecommerce", label: "Ecommerce" },
  { value: "blog", label: "Blog" },
  { value: "news", label: "News" },
  { value: "saas", label: "SaaS" },
  { value: "service", label: "Service Website" },
  { value: "portfolio", label: "Portfolio" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education" },
  { value: "real_estate", label: "Real Estate" },
  { value: "travel", label: "Travel" },
  { value: "agency", label: "Agency" },
  { value: "other", label: "Other" },
] as const;

export const CONVERSION_GOALS = [
  { value: "leads", label: "Lead generation" },
  { value: "sales", label: "Online sales" },
  { value: "calls", label: "Phone calls" },
  { value: "visits", label: "Store visits" },
  { value: "signups", label: "Sign-ups" },
  { value: "bookings", label: "Bookings / appointments" },
  { value: "downloads", label: "Downloads" },
  { value: "awareness", label: "Brand awareness" },
  { value: "other", label: "Other" },
] as const;

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "it", label: "Italian" },
  { value: "nl", label: "Dutch" },
  { value: "ru", label: "Russian" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "bn", label: "Bengali" },
  { value: "ta", label: "Tamil" },
  { value: "te", label: "Telugu" },
  { value: "tr", label: "Turkish" },
  { value: "pl", label: "Polish" },
  { value: "sv", label: "Swedish" },
  { value: "da", label: "Danish" },
  { value: "no", label: "Norwegian" },
  { value: "fi", label: "Finnish" },
  { value: "th", label: "Thai" },
  { value: "vi", label: "Vietnamese" },
  { value: "id", label: "Indonesian" },
  { value: "ms", label: "Malay" },
  { value: "he", label: "Hebrew" },
  { value: "uk", label: "Ukrainian" },
  { value: "cs", label: "Czech" },
  { value: "ro", label: "Romanian" },
  { value: "hu", label: "Hungarian" },
  { value: "el", label: "Greek" },
  { value: "other", label: "Other" },
] as const;

export function getWebsiteTypeLabel(value: string): string {
  return WEBSITE_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function getConversionGoalLabel(value: string): string {
  return CONVERSION_GOALS.find((g) => g.value === value)?.label ?? value;
}

export function getLanguageLabel(value: string): string {
  return LANGUAGES.find((l) => l.value === value)?.label ?? value;
}
