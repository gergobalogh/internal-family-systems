import { useEffect } from 'react'
import { copy } from './copy'

const VISIBLE_MS = 6000

interface StatusToastProps {
  /** Changes for each new notice; null hides the toast. */
  noticeKey: number | null
  message: string
  onUndo: () => void
  onDismiss: () => void
}

export function StatusToast({ noticeKey, message, onUndo, onDismiss }: StatusToastProps) {
  useEffect(() => {
    if (noticeKey === null) return
    const timer = setTimeout(onDismiss, VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [noticeKey, onDismiss])

  // The live region stays mounted so screen readers announce new notices.
  return (
    <div className="toast-region" role="status">
      {noticeKey !== null && (
        <div className="toast" key={noticeKey}>
          <span>{message}</span>
          <button type="button" onClick={onUndo}>
            {copy.undo}
          </button>
        </div>
      )}
    </div>
  )
}
