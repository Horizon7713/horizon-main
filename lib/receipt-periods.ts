export type ReceiptPeriod = {
  key: string
  label: string
  startDate: string
  endDate: string
}

export type ReceiptFolder = {
  key: string
  label: string
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
  const vendor = cleanFolderPart(vendorName, "Unknown Vendor")
  const card = cleanFolderPart(cardUsed, "Card not found")
  const label = `${vendor} -- ${card}`

  return {
    label,
    key: slugify(label) || "unknown-vendor-card-not-found",
  }
}