// Calculates the next payment date after `from` for a recurring payment.
// cycleType: 'WEEKLY' | 'MONTHLY'
// payDay: 1–7 (Mon–Sun) for WEEKLY, 1–31 for MONTHLY
export function calcNextPayAt(cycleType: string, payDay: number, from: Date = new Date()): Date {
  const d = new Date(from)
  d.setSeconds(0, 0)

  if (cycleType === 'WEEKLY') {
    // JS getDay(): 0=Sun,1=Mon…6=Sat  →  payDay 1=Mon…7=Sun
    const targetJs = payDay === 7 ? 0 : payDay
    const currentJs = d.getDay()
    let daysAhead = targetJs - currentJs
    if (daysAhead <= 0) daysAhead += 7
    d.setDate(d.getDate() + daysAhead)
    d.setHours(0, 0, 0, 0)
    return d
  }

  // MONTHLY
  const day = Math.min(payDay, 28) // cap at 28 to be safe across months
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  d.setDate(day)
  if (d <= from) {
    d.setMonth(d.getMonth() + 1)
    d.setDate(1)
    d.setDate(day)
  }
  return d
}
