export const TURKISH_MOBILE_PREFIX = "+90";

export function formatTurkishMobileInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits || digits === "9" || digits === "90") return TURKISH_MOBILE_PREFIX;

  const localDigits = digits.startsWith("90")
    ? digits.slice(2)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;

  return `${TURKISH_MOBILE_PREFIX}${localDigits.slice(0, 10)}`;
}

export function isTurkishMobileNumber(value: string): boolean {
  return /^\+905\d{9}$/.test(value);
}

export function getWhatsAppUrl(phone: string | null | undefined): string | null {
  const digits = phone?.replace(/\D/g, "") ?? "";
  const international = digits.startsWith("90")
    ? digits
    : digits.startsWith("0")
      ? `90${digits.slice(1)}`
      : digits.length === 10
        ? `90${digits}`
        : "";

  return /^905\d{9}$/.test(international) ? `https://wa.me/${international}` : null;
}
