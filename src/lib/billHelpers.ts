import type { RecurringBill } from "@/hooks/useMoney";

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getOrdinal(n: number): string {
  if (n > 3 && n < 21) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

/** Returns a human-readable label for a bill's schedule and amount. */
export function getBillDisplayLabel(bill: RecurringBill): string {
  const amt = `$${Number(bill.amount).toFixed(2)}`;
  const freq = bill.frequency || "monthly";

  if (freq === "weekly") {
    const dayName = DAY_NAMES[bill.due_date] || "—";
    const monthlyEst = (Number(bill.amount) * 4.33).toFixed(0);
    return `Every ${dayName} · ${amt}/wk (~$${monthlyEst}/mo)`;
  }
  if (freq === "biweekly") {
    const dayName = DAY_NAMES[bill.due_date] || "—";
    const monthlyEst = (Number(bill.amount) * 2.17).toFixed(0);
    return `Every other ${dayName} · ${amt} (~$${monthlyEst}/mo)`;
  }
  return `Due on the ${bill.due_date}${getOrdinal(bill.due_date)} · ${amt}`;
}

/** Estimate monthly cost for a single bill, accounting for frequency. */
export function billMonthlyCost(bill: RecurringBill): number {
  const freq = bill.frequency || "monthly";
  if (freq === "weekly") return Number(bill.amount) * 4.33;
  if (freq === "biweekly") return Number(bill.amount) * 2.17;
  return Number(bill.amount);
}

/** Check if a bill is due within the next N days. */
export function isBillDueWithinDays(bill: RecurringBill, days: number): boolean {
  const freq = bill.frequency || "monthly";
  const today = new Date();

  if (freq === "weekly") {
    // due_date is 0-6 (day of week). Always due within 7 days.
    return days >= 7 ? true : isDayOfWeekWithinDays(bill.due_date, days);
  }
  if (freq === "biweekly") {
    // Approximate: check if the weekday occurs within the window
    return isDayOfWeekWithinDays(bill.due_date, days);
  }
  // monthly
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const diff = bill.due_date >= currentDay
    ? bill.due_date - currentDay
    : daysInMonth - currentDay + bill.due_date;
  return diff <= days;
}

function isDayOfWeekWithinDays(targetDay: number, days: number): boolean {
  const today = new Date();
  for (let i = 0; i <= days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (d.getDay() === targetDay) return true;
  }
  return false;
}

/** Check if a bill has been paid recently based on its frequency. */
export function isBillPaidRecently(bill: RecurringBill): boolean {
  if (!bill.last_paid_date) return false;
  const paidDate = new Date(bill.last_paid_date);
  const today = new Date();
  const freq = bill.frequency || "monthly";

  if (freq === "weekly") {
    const diffDays = Math.floor((today.getTime() - paidDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays < 7;
  }
  if (freq === "biweekly") {
    const diffDays = Math.floor((today.getTime() - paidDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays < 14;
  }
  // monthly: same month
  return paidDate.getMonth() === today.getMonth() && paidDate.getFullYear() === today.getFullYear();
}
