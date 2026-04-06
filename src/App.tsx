import AnswerPanel from './components/AnswerPanel'
import FinalResults from './components/FinalResults'
import GlobeCanvas from './components/GlobeCanvas'
import HUD from './components/HUD'
import { GAME_COUNTRIES } from './data/countries'
import { useGameStore } from './state/gameStore'

export default function App() {
  const {
    countryStatuses,
    selectedCountryId,
    answerInput,
    feedback,
    isGameComplete,
    selectCountry,
    closeAnswerPanel,
    setAnswerInput,
    submitAnswer,
    skipSelectedCountry,
    newGame
  } = useGameStore()

  const total = GAME_COUNTRIES.length
  const attempted = Object.values(countryStatuses).filter((status) => status !== 'unattempted').length
  const correct = Object.values(countryStatuses).filter((status) => status === 'correct').length
  const skipped = attempted - correct
  const missed = GAME_COUNTRIES.filter((country) => countryStatuses[country.id] !== 'correct').map((country) => country.displayName)

  return (
    <main className="app-shell">
      <header className="top-bar">
        <h1>Name the Countries 3D</h1>
        <button className="ghost" onClick={newGame}>New Game</button>
      </header>

      <HUD statuses={countryStatuses} total={total} />

      <div className="content-grid">
        <div className="canvas-wrap">
          <GlobeCanvas statuses={countryStatuses} selectedCountryId={selectedCountryId} onSelectCountry={selectCountry} />
        </div>
        <AnswerPanel
          isOpen={Boolean(selectedCountryId) && !isGameComplete}
          answerInput={answerInput}
          feedback={feedback}
          onChange={setAnswerInput}
          onSubmit={submitAnswer}
          onSkip={skipSelectedCountry}
          onClose={closeAnswerPanel}
        />
      </div>

      {isGameComplete && (
        <FinalResults correct={correct} skipped={skipped} total={total} missed={missed} onNewGame={newGame} />
      )}
    </main>
  )
}
