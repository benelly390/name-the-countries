import { useEffect, useRef } from 'react'

type AnswerPanelProps = {
  isOpen: boolean
  answerInput: string
  feedback: { type: 'idle' | 'incorrect' | 'correct'; message?: string }
  onChange: (value: string) => void
  onSubmit: () => void
  onSkip: () => void
  onClose: () => void
}

export default function AnswerPanel({ isOpen, answerInput, feedback, onChange, onSubmit, onSkip, onClose }: AnswerPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <aside className="answer-panel">
      <h2>Name this country</h2>
      <p className="hint">Tip: use the shape on the globe. The country name is hidden until finalized.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!answerInput.trim()) return
          onSubmit()
        }}
      >
        <input
          ref={inputRef}
          value={answerInput}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type country name"
          aria-label="Country answer"
        />
        <div className="answer-actions">
          <button type="submit" disabled={!answerInput.trim()}>Submit</button>
          <button type="button" className="danger" onClick={onSkip}>I don't know</button>
          <button type="button" className="ghost" onClick={onClose}>Close</button>
        </div>
      </form>
      {feedback.type !== 'idle' && (
        <p className={feedback.type === 'incorrect' ? 'feedback-error' : 'feedback-ok'}>
          {feedback.message}
        </p>
      )}
    </aside>
  )
}
