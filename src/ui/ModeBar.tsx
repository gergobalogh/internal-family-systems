import type { Mode } from '../model/types'
import { copy } from './copy'

interface ModeBarProps {
  mode: Mode
  canUndo: boolean
  onModeChange: (mode: Mode) => void
  onUndo: () => void
  onReset: () => void
}

const modes: Mode[] = ['current', 'whatIf']

export function ModeBar({ mode, canUndo, onModeChange, onUndo, onReset }: ModeBarProps) {
  const { title, hint } = copy.modes[mode]

  return (
    <header className="modebar">
      <div className="modebar__status" aria-live="polite">
        <h1 className="modebar__title">
          <span className="mode-mark" aria-hidden="true" />
          {title}
        </h1>
        <p className="modebar__hint">{hint}</p>
      </div>

      <div className="modebar__controls">
        <div className="mode-switch" role="group" aria-label={copy.modeSwitch}>
          {modes.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              onClick={() => onModeChange(option)}
            >
              {copy.modes[option].title}
            </button>
          ))}
        </div>

        <button type="button" className="control" onClick={onUndo} disabled={!canUndo}>
          <span aria-hidden="true">↶</span> {copy.undo}
        </button>

        {mode === 'whatIf' && (
          <button type="button" className="control control--quiet" onClick={onReset}>
            {copy.reset}
          </button>
        )}
      </div>
    </header>
  )
}
