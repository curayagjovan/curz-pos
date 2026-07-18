export const DEFAULT_SMS_RECIPIENT = "";

export function normalizeSmsRecipient(value: string) {
  return value.replace(/[^\d+]/g, "");
}

// Accepts full mobile numbers (09xx/+639xx) and telco access shortcodes
// (e.g. 8080), which can be as short as 3 digits.
export function isValidSmsRecipient(value: string) {
  const digits = normalizeSmsRecipient(value).replace(/^\+/, "");
  return digits.length >= 3 && digits.length <= 13;
}

// iOS only honors the body when it is appended with "&" straight after the
// number, while Android expects a standard "?" query.
export function buildSmsHref(recipient: string, message: string) {
  const target = normalizeSmsRecipient(recipient);
  const body = encodeURIComponent(message);
  const isApple =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
  return isApple ? `sms:${target}&body=${body}` : `sms:${target}?body=${body}`;
}
