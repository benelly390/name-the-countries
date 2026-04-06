
type FinalResultsProps = {
  correct: number
  skipped: number
  total: number
  missed: string[]
  onNewGame: () => void
}

export default function FinalResults({ correct, skipped, total, missed, onNewGame }: FinalResultsProps) {
  const percentage = Math.round((correct / total) * 100)

  return (
    <section className="final-results">
      <h2>Game Complete</h2>
      <p><strong>Correct:</strong> {correct}</p>
      <p><strong>Skipped:</strong> {skipped}</p>
      <p><strong>Total countries:</strong> {total}</p>
      <p><strong>Percentage correct:</strong> {percentage}%</p>

      <h3>Not answered correctly</h3>
      {missed.length === 0 ? <p>Perfect score!</p> : (
        <ul>
          {missed.map((name) => <li key={name}>{name}</li>)}
        </ul>
      )}

      <button onClick={onNewGame}>Start New Game</button>
    </section>
  )
}
