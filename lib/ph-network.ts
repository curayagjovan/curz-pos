import type { LoadNetworkGroup } from "@/lib/mobile-load-catalog";

const GLOBE_TM_PREFIXES = [
  "817", "904", "905", "906", "915", "916", "917", "926", "927",
  "935", "936", "937", "945", "953", "954", "955", "956", "965",
  "966", "967", "975", "976", "977", "978", "979", "994", "995",
  "996", "997",
];

const SMART_TNT_PREFIXES = [
  "808", "813", "900", "907", "908", "909", "910", "911", "912",
  "913", "914", "918", "919", "920", "921", "928", "929", "930",
  "938", "939", "946", "947", "948", "949", "950", "951", "961",
  "963", "968", "969", "970", "981", "989", "992", "998", "999",
];

const DITO_PREFIXES = ["895", "896", "897", "898"];

export function normalizeMobileNumber(value: string) {
  return value.replace(/\D/g, "");
}

export function detectNetworkGroup(value: string): LoadNetworkGroup | null {
  const digits = normalizeMobileNumber(value);

  let localDigits = digits;
  if (localDigits.startsWith("63")) {
    localDigits = `0${localDigits.slice(2)}`;
  }
  if (!localDigits.startsWith("0")) {
    localDigits = `0${localDigits}`;
  }

  if (localDigits.length < 4) {
    return null;
  }

  const prefix = localDigits.slice(1, 4);

  if (GLOBE_TM_PREFIXES.includes(prefix)) {
    return "GLOBE_TM";
  }

  if (SMART_TNT_PREFIXES.includes(prefix)) {
    return "SMART_TNT";
  }

  if (DITO_PREFIXES.includes(prefix)) {
    return "DITO";
  }

  return null;
}

export function isCompleteMobileNumber(value: string) {
  return normalizeMobileNumber(value).replace(/^63/, "0").length >= 11;
}
