import { useCallback, useEffect, useReducer, useState } from 'react'
import type { ReactNode } from 'react'
import { jumpRequested, jumpToClosing } from './conversation/devJump'
import { canGetToKnow, mapNote } from './conversation/flow'
import { useConversation } from './conversation/useConversation'
import { canUndo, createLandscape, landscapeReducer } from './model/landscape'
import type { Action, LandscapeState } from './model/types'
import { Conversation } from './ui/Conversation'
import { CriticWalkSpike } from './ui/CriticWalkSpike'
import { requestedDescent } from './ui/descents'
import { DescentSpike } from './ui/DescentSpike'
import { DoodleLineSpike } from './ui/DoodleLineSpike'
import { MapRouteSpike } from './ui/MapRouteSpike'
import { requestedSideEntrance } from './ui/sideEntrances'
import { SideEntranceSpike } from './ui/SideEntranceSpike'
import { SproutRiseSpike } from './ui/SproutRiseSpike'
import { copy } from './ui/copy'
import { Landscape } from './ui/Landscape'
import { MapNote } from './ui/MapNote'
import { ModeBar } from './ui/ModeBar'
import { StatusToast } from './ui/StatusToast'
import { useChoreography } from './ui/useChoreography'
import { useNoticing } from './ui/useNoticing'

/** DEV ONLY (`?jump=after`): a full run already at its closing card. */
const jump = import.meta.env.DEV && jumpRequested ? jumpToClosing() : null
const startingMap = jump?.landscape ?? createLandscape([])

const walkParams = new URLSearchParams(window.location.search)
const showWalkSpike = walkParams.has('walk') || walkParams.has('walkpose')
const descentSpike = requestedDescent(walkParams)
const sideSpike = requestedSideEntrance(walkParams)
const showSproutSpike = walkParams.has('sprout') || walkParams.has('sproutpose')
const showMapSpike = walkParams.has('map') || walkParams.has('mappose')
const showDoodleSpike = walkParams.has('doodle') || walkParams.has('doodlepose')

/** Opens on the entry conversation. */
export default function App() {
  return (
    <>
      {/* THROWAWAY review spike: Rive Critic walk-in over the page, hidden until ?walk or ?walkpose. */}
      {showWalkSpike && <CriticWalkSpike />}
      {/* THROWAWAY review spike: Rive descents (Defender parachute, Sleeper leaf drift, Pod drop), hidden until ?parachute, ?sleeper or ?pod. */}
      {descentSpike && <DescentSpike name={descentSpike} />}
      {/* THROWAWAY review spike: Rive entrances from the side (Curled, Self-hug, Kaleidoscope, Stack, Ribbon, Shell), hidden until ?curled, ?selfhug, ?kaleidoscope, ?stack, ?ribbon or ?shell. */}
      {sideSpike && <SideEntranceSpike name={sideSpike} />}
      {/* THROWAWAY review spike: Rive Sprout rising out of the ground, hidden until ?sprout or ?sproutpose. */}
      {showSproutSpike && <SproutRiseSpike />}
      {/* THROWAWAY review spike: Rive Map walking its route, a stitched trail behind, hidden until ?map or ?mappose. */}
      {showMapSpike && <MapRouteSpike />}
      {/* THROWAWAY review spike: Rive Doodle riding in on its crayon line, hidden until ?doodle or ?doodlepose. */}
      {showDoodleSpike && <DoodleLineSpike />}
      <TalkWorkspace />
    </>
  )
}

function useWorkspace(initial: LandscapeState) {
  const [state, dispatch] = useReducer(landscapeReducer, initial)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ key: number; message: string } | null>(null)

  // Any further action retires the notice, so its Undo can only ever undo
  // that removal.
  const act = useCallback((action: Action) => {
    dispatch(action)
    setNotice(null)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.key === 'Escape') setSelectedId(null)
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        act({ type: 'undo' })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [act])

  return { state, dispatch, act, selectedId, setSelectedId, notice, setNotice }
}

type WorkspaceState = ReturnType<typeof useWorkspace>

interface ShellProps {
  workspace: WorkspaceState
  /** The mode bar (title, mode switch, Undo): kept away until the map is handed over. */
  bar: boolean
  waiting?: boolean
  settling?: boolean
  /** After switching to "What if…" (the experiment invitation). */
  onEnteredWhatIf?: () => void
  /** Get to know it, when the guide can ask. */
  onGetToKnow?: (partId: string) => void
  children?: ReactNode
}

function Shell({ workspace, bar, waiting, settling, onEnteredWhatIf, onGetToKnow, children }: ShellProps) {
  const { state, act, selectedId, setSelectedId, notice, setNotice } = workspace
  const dismissNotice = useCallback(() => setNotice(null), [setNotice])
  const removed = (message: string) => {
    setSelectedId(null)
    setNotice({ key: Date.now(), message })
  }

  return (
    <div className="app" data-mode={state.mode}>
      {bar && (
        <div className="modebar-slot">
          <ModeBar
            mode={state.mode}
            canUndo={canUndo(state)}
            onModeChange={(mode) => {
              const entering = mode === 'whatIf' && state.mode !== 'whatIf'
              act({ type: mode === 'whatIf' ? 'enterWhatIf' : 'returnToCurrent' })
              if (entering) onEnteredWhatIf?.()
            }}
            onUndo={() => act({ type: 'undo' })}
            onReset={() => act({ type: 'resetWhatIf' })}
          />
        </div>
      )}
      <div className="stage">
        <Landscape
          state={state}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onPlace={(partId, placement) => act({ type: 'place', partId, placement })}
          onRename={(partId, name) => act({ type: 'rename', partId, name })}
          onRemove={(partId) => {
            act({ type: 'remove', partId })
            removed(copy.removed)
          }}
          onRemoveLink={(linkId) => {
            act({ type: 'unlink', linkId })
            removed(copy.link.removed)
          }}
          onGetToKnow={onGetToKnow}
          onClearWords={(partId) => act({ type: 'clearWords', partId })}
          waiting={waiting}
          settling={settling}
        >
          {children}
        </Landscape>
      </div>
      <StatusToast
        noticeKey={notice?.key ?? null}
        message={notice?.message ?? ''}
        onUndo={() => act({ type: 'undo' })}
        onDismiss={dismissNotice}
      />
    </div>
  )
}

function TalkWorkspace() {
  const workspace = useWorkspace(startingMap)
  const talk = useConversation(workspace.state, workspace.dispatch, jump?.conversation)
  const { state } = talk
  const { shown, phase, waiting, settling } = useChoreography(state)

  // The last step: the bar and the map note arrive with the closing card (or
  // a pause), when the map becomes the person's — and stay from then on.
  const [handedOver, setHandedOver] = useState(false)
  if (!handedOver && state.ended && shown === state.card && phase === 'card') setHandedOver(true)

  useNoticing(workspace.state, handedOver && !state.paused, talk.notice)

  return (
    <Shell
      workspace={workspace}
      bar={handedOver}
      waiting={waiting}
      // Parts glide slowly only while the entry conversation moves them, never under the person's own hand.
      settling={settling && !handedOver}
      onEnteredWhatIf={talk.enteredWhatIf}
      onGetToKnow={canGetToKnow(state) ? talk.getToKnow : undefined}
    >
      {/* After a pause, the map keeps no summary of a conversation that stopped. */}
      {handedOver && !state.paused && <MapNote text={mapNote(state, workspace.state)} />}
      <Conversation state={state} shown={shown} phase={phase} actions={talk} />
      {jump && <p className="dev-badge">DEV · jumped to closing</p>}
    </Shell>
  )
}
