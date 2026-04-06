import type { CountryStatus } from '../types/country'

type HUDProps = {
  statuses: Record<string, CountryStatus>
  total: number
}

export default function HUD({ statuses, total }: HUDProps) {
  const attempted = Object.values(statuses).filter((value) => value !== 'unattempted').length
  const correct = Object.values(statuses).filter((value) => value === 'correct').length
  const remaining = total - attempted

  return (
    <div className="hud">
      <div><strong>Correct:</strong> {correct}</div>
      <div><strong>Attempted:</strong> {attempted} / {total}</div>
      <div><strong>Remaining:</strong> {remaining}</div>
    </div>
  )
}
