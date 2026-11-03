import { useCallback, useEffect, useReducer, useState } from 'react'
import type { ReactNode } from 'react'
import { track, trackEdited, trackMoved, trackReturn, useWalkAnalytics } from './analytics'
import { jumpRequested, jumpToClose } from './conversation/devJump'
import { fearsRequested } from './conversation/features'
import { offeredIds, startReturning } from './conversation/flow'
import type { ConversationState } from './conversation/flow'
import { forgetMeadow, landscapeOf, loadMeadow, meadowOf, saveMeadow } from './conversation/saved'
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
import { keepPicture, postcardOf, usePicture } from './ui/picture'
import { Postcard } from './ui/Postcard'
import { StatusToast } from './ui/StatusToast'
import { THANKS_MS, useCamera } from './ui/useCamera'
import { useChoreography } from './ui/useChoreography'
import { useNoticing } from './ui/useNoticing'

/** DEV ONLY (`?jump=after`): a full run already at Act 1's close. */
const jump = import.meta.env.DEV && jumpRequested ? jumpToClose() : null

/** Where a visit opens: the dev jump, the meadow saved on this device (a later visit), or an empty one. */
function opening(): { map: LandscapeState; conversation?: ConversationState; savedAt?: string } {
  if (jump) return { map: jump.landscape, conversation: jump.conversation }
  const saved = loadMeadow()
  if (!saved) return { map: createLandscape([]) }
  const map = landscapeOf(saved)
  return { map, conversation: startReturning(saved, map, { askFears: fearsRequested }), savedAt: saved.savedAt }
}

const walkParams = new URLSearchParams(window.location.search)
const showWalkSpike = walkParams.has('walk') || walkParams.has('walkpose')
const descentSpike = requestedDescent(walkParams)
const sideSpike = requestedSideEntrance(walkParams)
const showSproutSpike = walkParams.has('sprout') || walkParams.has('sproutpose')
const showMapSpike = walkParams.has('map') || walkParams.has('mappose')
const showDoodleSpike = walkParams.has('doodle') || walkParams.has('doodlepose')

/** Opens on the entry conversation, or on the saved meadow. Start over begins a new visit from scratch. */
export default function App() {
  const [visit, setVisit] = useState(0)
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
      <TalkWorkspace
        key={visit}
        onStartOver={() => {
          track('start-over')
          forgetMeadow()
          setVisit((count) => count + 1)
        }}
      />
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
  /** After the walk the map is the person's: the centre light shows. */
  handedOver: boolean
  /** Undo in the corner, while there's something to undo: after the walk, with no card up. */
  cornerUndo?: boolean
  waiting?: boolean
  /** Whether any part is still entering, for the conversation's timing. */
  onEntering?: (entering: boolean) => void
  /** A part got a new name: it meets the safety checks, as a typed answer does. */
  onRenamed?: (name: string) => void
  /** The person moved or resized a part by hand. */
  onMoved?: () => void
  settling?: boolean
  /** Sitting with one part (Act 2): see Landscape. */
  focus?: LandscapeProps['focus']
  /** Act 2's first question: the figures to tap. */
  offered?: readonly string[] | null
  onChoose?: (partId: string) => void
  thanked?: readonly string[]
  /** The part Act 3's "what if" names. */
  marked?: string | null
  /**
   * A beat in its own light, not a second mode: Act 3's "what if" (dusk
   * without the curtains, frame A13), and the ending (dusk under a veil, A14).
   */
  beat?: 'dusk' | 'ending'
  children?: ReactNode
}

function Shell({
  workspace,
  handedOver,
  cornerUndo = false,
  waiting,
  onEntering,
  onRenamed,
  onMoved,
  settling,
  focus,
  offered,
  onChoose,
  thanked,
  marked,
  beat,
  children,
}: ShellProps) {
  const { state, act, selectedId, setSelectedId, notice, setNotice } = workspace
  const dismissNotice = useCallback(() => setNotice(null), [setNotice])
  const removed = (message: string) => {
    setSelectedId(null)
    setNotice({ key: Date.now(), message })
  }

  return (
    <div className="app" data-mode={state.mode} data-beat={beat}>
      <div className="stage">
        <Landscape
          state={state}
          centre={handedOver}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onPlace={(partId, placement) => {
            act({ type: 'place', partId, placement })
            onMoved?.()
          }}
          onRename={(partId, name) => {
            act({ type: 'rename', partId, name })
            trackEdited('rename')
            onRenamed?.(name)
          }}
          onChangeLook={(partId, look) => {
            act({ type: 'setLook', partId, look })
            trackEdited('change figure')
          }}
          onRemove={(partId) => {
            act({ type: 'remove', partId })
            trackEdited('remove')
            removed(copy.removed)
          }}
          onRemoveLink={(linkId) => {
            act({ type: 'unlink', linkId })
            removed(copy.link.removed)
          }}
          onClearWords={(partId) => {
            act({ type: 'clearWords', partId })
            trackEdited('clear words')
          }}
          waiting={waiting}
          onEntering={onEntering}
          settling={settling}
          focus={focus}
          offered={offered}
          onChoose={
            onChoose &&
            ((partId) => {
              // The camera goes to the part, so its box closes.
              setSelectedId(null)
              onChoose(partId)
            })
          }
          thanked={thanked}
          marked={marked}
        >
          {children}
        </Landscape>
      </div>
      {/* A removal's notice carries its own Undo. */}
      {cornerUndo && !notice && canUndo(state) && (
        <button type="button" className="corner-undo" onClick={() => act({ type: 'undo' })}>
          <span aria-hidden="true">↶</span> {copy.undo}
        </button>
      )}
      <StatusToast
        noticeKey={notice?.key ?? null}
        message={notice?.message ?? ''}
        onUndo={() => act({ type: 'undo' })}
        onDismiss={dismissNotice}
      />
    </div>
  )
}

function TalkWorkspace({ onStartOver }: { onStartOver: () => void }) {
  const [start] = useState(opening)
  const workspace = useWorkspace(start.map)
  const talk = useConversation(workspace.state, workspace.dispatch, start.conversation)
  const { state } = talk
  const [entering, setEntering] = useState(false)
  // Act 2: the camera goes to the part being sat with,
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

  // The walk is over and the camera is back (or with a pause, or an early
  // close): the map becomes the person's, and stays so from then on.
  const [handedOver, setHandedOver] = useState(false)
  if (!handedOver && state.ended && shown === state.card && phase === 'card') setHandedOver(true)

  useNoticing(workspace.state, handedOver && !state.paused, talk.notice)

  // Umami: how far the visit gets, never what was written (src/analytics.ts).
  useWalkAnalytics(state, shown !== null && shown === state.card && phase === 'card')
  useEffect(() => {
    if (start.savedAt !== undefined) trackReturn(start.savedAt)
  }, [start.savedAt])

  // Saved on this device from the ending on ("They'll be here when you come
  // back"), and on a later visit from the start: every change, in "How it is".
  const saving = !jump && (state.returning || state.ended || state.step === 'ending')
  const { parts: named, unheard } = state
  useEffect(() => {
    if (!saving) return
    const kinds = Object.fromEntries(named.map((part) => [part.id, part.kind]))
    saveMeadow(meadowOf(workspace.state, { kinds, quieter: unheard }, new Date()))
  }, [saving, workspace.state, named, unheard])

  // The ending's picture to keep, drawn from the map as it is now.
  const ending = state.step === 'ending'
  const picture = usePicture(ending ? postcardOf(workspace.state, state.thanked) : null)
  const { pictureKept } = talk

  return (
    <Shell
      workspace={workspace}
      handedOver={handedOver}
      // In the sky, clear of the names on the meadow; a card (noticing) can float there on a phone.
      cornerUndo={handedOver && shown === null}
      waiting={waiting}
      onEntering={setEntering}
      onRenamed={talk.renamed}
      onMoved={() => trackMoved(state.step, handedOver)}
      // Parts glide slowly only while the entry conversation moves them, never under the person's own hand.
      settling={settling && !handedOver}
      focus={
        sitting && {
          id: sitting.id,
          // Its words are speech until the thanks; what it's trying to do stays with it.
          voice: thanking ? null : sitting.voice,
          intent: sitting.intent,
          layoutKey: shown,
        }
      }
      offered={
        (state.step === 'choose' || state.step === 'welcome') && shown === state.card && phase === 'card'
          ? offeredIds(state, workspace.state)
          : null
      }
      onChoose={talk.getToKnow}
      thanked={state.thanked}
      marked={state.step === 'dusk' ? state.duskPart : null}
      beat={state.step === 'dusk' ? 'dusk' : ending ? 'ending' : undefined}
    >
      {ending && <Postcard picture={picture} />}
      <Conversation
        state={state}
        shown={shown}
        phase={phase}
        steppedBack={steppedBack}
        actions={talk}
        undo={canUndo(workspace.state) ? () => workspace.act({ type: 'undo' }) : undefined}
        // Straight from the tap: a phone's share sheet only opens inside one.
        keepPicture={picture ? () => void keepPicture(picture).then((kept) => kept && pictureKept()) : undefined}
        clearMeadow={onStartOver}
      />
      {jump && <p className="dev-badge">DEV · jumped to Act 1's close</p>}
    </Shell>
  )
}
