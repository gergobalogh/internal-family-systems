import { useCallback, useEffect, useReducer, useState } from 'react'
import type { ReactNode } from 'react'
import { jumpRequested, jumpToClose } from './conversation/devJump'
import { canAddPart, canGetToKnow, canTryExperiment, mapNote, offeredIds } from './conversation/flow'
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
import type { LandscapeProps } from './ui/Landscape'
import { MapNote } from './ui/MapNote'
import { ModeBar } from './ui/ModeBar'
import { StatusToast } from './ui/StatusToast'
import { THANKS_MS, useCamera } from './ui/useCamera'
import { useChoreography } from './ui/useChoreography'
import { useNoticing } from './ui/useNoticing'

/** DEV ONLY (`?jump=after`): a full run already at Act 1's close. */
const jump = import.meta.env.DEV && jumpRequested ? jumpToClose() : null
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
  /** Whether any part is still entering, for the conversation's timing. */
  onEntering?: (entering: boolean) => void
  settling?: boolean
  /** After switching to "What if…" (the experiment invitation). */
  onEnteredWhatIf?: () => void
  /** Get to know it, when the guide can ask. */
  onGetToKnow?: (partId: string) => void
  /** Add a part, when the guide can ask. */
  onAddPart?: () => void
  /** Try an experiment, when one can start. */
  onTryExperiment?: () => void
  /** Sitting with one part (Act 2, Get to know it): see Landscape. */
  focus?: LandscapeProps['focus']
  /** Act 2's first question: the figures to tap. */
  offered?: readonly string[] | null
  onChoose?: (partId: string) => void
  thanked?: readonly string[]
  /** The part Act 3's "what if" names. */
  marked?: string | null
  /** Act 3's "what if": dusk without the curtains (not a second mode, frame A13). */
  dusk?: boolean
  children?: ReactNode
}

function Shell({
  workspace,
  bar,
  waiting,
  onEntering,
  settling,
  onEnteredWhatIf,
  onGetToKnow,
  onAddPart,
  onTryExperiment,
  focus,
  offered,
  onChoose,
  thanked,
  marked,
  dusk = false,
  children,
}: ShellProps) {
  const { state, act, selectedId, setSelectedId, notice, setNotice } = workspace
  /** The camera goes to the part, so its box closes. */
  const sitWith = (open?: (partId: string) => void) =>
    open &&
    ((partId: string) => {
      setSelectedId(null)
      open(partId)
    })
  const dismissNotice = useCallback(() => setNotice(null), [setNotice])
  const removed = (message: string) => {
    setSelectedId(null)
    setNotice({ key: Date.now(), message })
  }

  return (
    <div className="app" data-mode={state.mode} data-beat={dusk ? 'dusk' : undefined}>
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
            onAddPart={onAddPart}
            onTryExperiment={onTryExperiment}
          />
        </div>
      )}
      <div className="stage">
        <Landscape
          state={state}
          centre={bar}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onPlace={(partId, placement) => act({ type: 'place', partId, placement })}
          onRename={(partId, name) => act({ type: 'rename', partId, name })}
          onChangeLook={(partId, look) => act({ type: 'setLook', partId, look })}
          onRemove={(partId) => {
            act({ type: 'remove', partId })
            removed(copy.removed)
          }}
          onRemoveLink={(linkId) => {
            act({ type: 'unlink', linkId })
            removed(copy.link.removed)
          }}
          onGetToKnow={sitWith(onGetToKnow)}
          onClearWords={(partId) => act({ type: 'clearWords', partId })}
          waiting={waiting}
          onEntering={onEntering}
          settling={settling}
          focus={focus}
          offered={offered}
          onChoose={sitWith(onChoose)}
          thanked={thanked}
          marked={marked}
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
  const [entering, setEntering] = useState(false)
  // Act 2 and Get to know it: the camera goes to the part being sat with,
  // and, once it's thanked, stays while its glow is seen up close.
  const cameraMoving = useCamera(state.subject?.id ?? null)
  const { shown, phase, waiting, settling, steppedBack } = useChoreography(state, entering, cameraMoving || state.step === 'thanked')
  const { thanksSeen } = talk
  useEffect(() => {
    if (state.step !== 'thanked') return
    const timer = setTimeout(thanksSeen, THANKS_MS)
    return () => clearTimeout(timer)
  }, [state.step, thanksSeen])
  const sitting = state.subject
  const thanking = state.step === 'thanks' || state.step === 'thanked'

  // The last step: the bar and the map note arrive once Act 2 is over and
  // the camera is back (or with a pause, or an early close), when the map
  // becomes the person's — and stay from then on.
  const [handedOver, setHandedOver] = useState(false)
  if (!handedOver && state.ended && shown === state.card && phase === 'card') setHandedOver(true)

  useNoticing(workspace.state, handedOver && !state.paused, talk.notice)

  return (
    <Shell
      workspace={workspace}
      bar={handedOver}
      waiting={waiting}
      onEntering={setEntering}
      // Parts glide slowly only while the entry conversation moves them, never under the person's own hand.
      settling={settling && !handedOver}
      onEnteredWhatIf={talk.enteredWhatIf}
      onGetToKnow={canGetToKnow(state) ? talk.getToKnow : undefined}
      onAddPart={canAddPart(state) ? talk.newPart : undefined}
      onTryExperiment={canTryExperiment(state) ? talk.tryExperiment : undefined}
      focus={
        sitting && {
          id: sitting.id,
          // Its words are speech until the thanks; what it's trying to do stays with it.
          voice: thanking ? null : sitting.voice,
          intent: sitting.intent,
          layoutKey: shown,
        }
      }
      offered={state.step === 'choose' && shown === state.card && phase === 'card' ? offeredIds(state, workspace.state) : null}
      onChoose={talk.getToKnow}
      thanked={state.thanked}
      marked={state.step === 'dusk' ? state.duskPart : null}
      dusk={state.step === 'dusk'}
    >
      {/* After a pause, the map keeps no summary of a conversation that stopped. */}
      {handedOver && !state.paused && <MapNote text={mapNote(state, workspace.state)} />}
      <Conversation
        state={state}
        shown={shown}
        phase={phase}
        steppedBack={steppedBack}
        actions={talk}
        undo={canUndo(workspace.state) ? () => workspace.act({ type: 'undo' }) : undefined}
      />
      {jump && <p className="dev-badge">DEV · jumped to Act 1's close</p>}
    </Shell>
  )
}
