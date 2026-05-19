export type ReceiptPeriod = {
  key: string
  label: string
  startDate: string
  endDate: string
}

export type ReceiptFolder = {
  key: string
  label: string
  vendorKey: string
  cardLast4: string | null
  needsReview: boolean
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function getLastDayOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim()
}

function cleanFolderPart(value: string | null | undefined, fallback: string) {
  const cleaned = String(value || "")
    .replace(/\s+/g, " ")
    .trim()

  return cleaned || fallback
}

const VENDOR_ALIASES: Array<{ match: RegExp; value: string; label: string }> = [
  { match: /\bhome\s*depot\b|\bhomedepot\b/i, value: "home-depot", label: "Home Depot" },
  { match: /\blowe'?s\b|\blowe\s+s\b/i, value: "lowes", label: "Lowes" },
  { match: /\bsherwin\s*williams\b|\bsherwin\b/i, value: "sherwin-williams", label: "Sherwin Williams" },
  { match: /\bharbor\s*freight\b/i, value: "harbor-freight", label: "Harbor Freight" },
  { match: /\b84\s*lumber\b/i, value: "84-lumber", label: "84 Lumber" },
]

export function normalizeVendorForReceiptFolder(vendorName?: string | null) {
  const original = cleanFolderPart(vendorName, "Unknown Vendor")

  for (const alias of VENDOR_ALIASES) {
    if (alias.match.test(original)) {
      return {
        key: alias.value,
        label: alias.label,
      }
    }
  }

  const cleaned = original
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(the|store|location|loc|number|no)\b/g, " ")
    .replace(/#[0-9]+/g, " ")
    .replace(/\b\d{2,6}\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  const label = cleaned
    ? cleaned
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "Unknown Vendor"

  return {
    key: slugify(cleaned || "unknown-vendor") || "unknown-vendor",
    label,
  }
}

export function extractCardLast4(cardUsed?: string | null) {
  const value = String(cardUsed || "").trim()

  if (!value) return null

  const lower = value.toLowerCase()

  const badKeywords = [
    "auth",
    "approval",
    "appr",
    "transaction",
    "trans",
    "terminal",
    "term",
    "invoice",
    "order",
    "merchant",
    "store",
    "register",
    "reference",
    "ref",
  ]

  const cardKeywords = [
    "visa",
    "mastercard",
    "master card",
    "amex",
    "american express",
    "discover",
    "debit",
    "credit",
    "card",
    "acct",
    "account",
    "ending",
    "ends in",
    "last 4",
    "last four",
  ]

  const hasBadKeyword = badKeywords.some((keyword) => lower.includes(keyword))
  const hasCardKeyword = cardKeywords.some((keyword) => lower.includes(keyword))

  if (hasBadKeyword && !hasCardKeyword) return null

  const maskedMatch = value.match(/(?:\*|x|X|•){2,}[\s-]*(\d{4})\b/)
  if (maskedMatch?.[1]) return maskedMatch[1]

  const endingMatch = value.match(/(?:ending|ends in|last\s*4|last\s*four|card)[^\d]*(\d{4})/i)
  if (endingMatch?.[1]) return endingMatch[1]

  const allFourDigitMatches = value.match(/\b\d{4}\b/g) || []

  if (hasCardKeyword && allFourDigitMatches.length > 0) {
    return allFourDigitMatches[allFourDigitMatches.length - 1]
  }

  if (allFourDigitMatches.length === 1 && !hasBadKeyword) {
    return allFourDigitMatches[0]
  }

  return null
}

export function normalizeCardUsedForReceiptFolder(cardUsed?: string | null) {
  const last4 = extractCardLast4(cardUsed)

  if (!last4) {
    return {
      last4: null,
      label: "Card not found",
      key: "card-not-found",
      needsReview: true,
    }
  }

  return {
    last4,
    label: `Card ending ${last4}`,
    key: `card-${last4}`,
    needsReview: false,
  }
}

export function getReceiptPeriod(dateInput: Date | string = new Date()): ReceiptPeriod {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput)

  const year = date.getFullYear()
  const monthIndex = date.getMonth()
  const month = monthIndex + 1
  const day = date.getDate()
  const lastDay = getLastDayOfMonth(year, monthIndex)

  const isFirstHalf = day <= 15
  const startDay = isFirstHalf ? 1 : 16
  const endDay = isFirstHalf ? 15 : lastDay
  const half = isFirstHalf ? "first" : "second"

  const monthName = new Intl.DateTimeFormat("en-US", {
    month: "long",
  }).format(date)

  return {
    key: `${year}-${pad(month)}-${half}`,
    label: `${monthName} ${startDay}-${endDay}, ${year}`,
    startDate: `${year}-${pad(month)}-${pad(startDay)}`,
    endDate: `${year}-${pad(month)}-${pad(endDay)}`,
  }
}

export function getReceiptFolder(vendorName?: string | null, cardUsed?: string | null): ReceiptFolder {
  const vendor = normalizeVendorForReceiptFolder(vendorName)
  const card = normalizeCardUsedForReceiptFolder(cardUsed)

  const label = `${vendor.label} -- ${card.label}`
  const key = `${vendor.key}-${card.key}`

  return {
    label,
    key: slugify(key) || "unknown-vendor-card-not-found",
    vendorKey: vendor.key,
    cardLast4: card.last4,
    needsReview: card.needsReview,
  }
}