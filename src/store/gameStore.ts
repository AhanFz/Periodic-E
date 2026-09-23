import { create } from 'zustand';
import { saveRun, restoreRun } from '@/game/runSave';
import { Game } from '@/game/engine';
import { type Action } from '@/game/actions';
import { lessons, lessonComplete, tutorialGame, type TutorialSession } from '@/game/tutorial';
import { QUANTA_PER_WIN } from '@/game/constants';
import { playCues, setHapticsEnabled } from '@/ui/haptics';
import {
  addQuanta, defaultProfile, equipLigand, loadSession, purchaseLigand, recordRun, saveProfile, saveSession, flushProfile,
  type Profile,
} from '@/persistence/profile';
import type { Direction, ElementKey, HutItem, InspectTarget, LigandId, Orientation } from '@/game/types';

type Screen = 'menu' | 'store' | 'game' | 'over' | 'tutorialSetup' | 'catalogue';

interface GameStore {
  screen: Screen;
  pendingAction: Action | null;
  frame: { game: Game; label: string } | null;
  reducedMotion: boolean;
  prepareAction: (action: Action) => void;
  cancelAction: () => void;
  finishPlayback: () => void;
  setReducedMotion: (value: boolean) => void;
  game: Game | null;
  savedRun: Game | null;
  saveWarning: string | null;
  continueRun: () => void;
  saveAndExit: () => void;
  flushSave: () => Promise<void>;
  tick: number;
  pendingMove: { dx: number; dy: number } | null;
  /** Long-press inspection card. Purely a view: it costs no turn and pauses nothing. */
  inspecting: InspectTarget | null;
  paused: boolean;
  hapticsOn: boolean;
  /** Cross-run save. Null until the first load resolves; the UI shows defaults meanwhile. */
  profile: Profile;
  profileLoaded: boolean;
  /** Quanta awarded by the run that just ended, for the game-over screen to show. */
  lastAward: number;

  tutorial: TutorialSession | null;
  toTutorial: () => void;
  startTutorial: (element: ElementKey, ligand: LigandId | null) => void;
  nextLesson: () => void;
  resetLesson: () => void;
  startGame: () => void;
  retry: () => void;
  toMenu: () => void;
  toStore: () => void;
  toCatalogue: () => void;
  hydrate: () => Promise<void>;
  buyLigand: (id: LigandId) => void;
  equip: (id: LigandId | null) => void;
  dismissFlash: () => void;

  move: (dx: number, dy: number) => void;
  confirmPendingMove: () => void;
  cancelPendingMove: () => void;
  ability: (tier: 1 | 3) => void;
  previewAim: (dir: Direction) => void;
  confirmAim: (orientation: Orientation) => void;
  cancelAim: () => void;
  passTurn: () => void;
  shatter: () => void;
  beginThrow: () => void;
  buy: (item: HutItem) => void;
  leaveHut: () => void;

  inspect: (target: InspectTarget) => void;
  closeInspect: () => void;
  pause: () => void;
  resume: () => void;
  toggleHaptics: () => void;
}

export const useGameStore = create<GameStore>((set, get) => {
  /** Every profile change goes through here, so nothing can update state without persisting. */
  const writeProfile = (next: Profile) => { saveProfile(next); set({ profile: next }); };
  /** Hands the engine's cues to the device, then clears them so they play exactly once. */
  const drainHaptics = (g: Game) => {
    if (g.hapticCues.length === 0) return;
    playCues(g.hapticCues);
    g.hapticCues = [];
  };

  const rewarded = new WeakSet<Game>();
  const checkpoint = (g: Game) => {
    if (g.mode !== 'run' || !get().profileLoaded) return;
    let profile = get().profile;
    if (g.gameOver && !rewarded.has(g)) {
      rewarded.add(g);
      const award = g.won ? QUANTA_PER_WIN : 0;
      profile = recordRun(profile, { won: g.won, totalKills: g.totalKills, deepestGrid: g.depth });
      if (award) profile = addQuanta(profile, award);
      set({ profile, lastAward: award });
    }
    const active = g.gameOver ? null : saveRun(g);
    set({ savedRun: g.gameOver ? null : g.fork() });
    void saveSession(profile, active).then(ok => set({ saveWarning: ok ? null : 'Could not save on this device. Keep the app open and try again.' }));
  };
  const settle = (g: Game) => {
    drainHaptics(g);
    const tutorial = get().tutorial;
    if (g.mode === 'tutorial') {
      set(s => ({ tick: s.tick + 1, tutorial: tutorial ? { ...tutorial, complete: tutorial.complete || lessonComplete(tutorial, g) } : null }));
      return;
    }
    set(s => ({ tick: s.tick + 1, screen: g.gameOver ? 'over' : s.screen }));
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  let finish: (() => void) | undefined;
  const clearPlayback = () => { clearTimeout(timer); finish = undefined; };
  const commit = (fn: (g: Game) => void) => {
    const g = get().game;
    if (!g || get().paused || get().frame || (get().tutorial?.complete && !g.ligandFlash)) return;
    const frames: Array<{ game: Game; label: string }> = [];
    let effectArray = g.pendingEffects;
    let effectCount = effectArray.length;
    const capture = (label: string) => {
      const copy = g.fork();
      copy.pendingEffects = g.pendingEffects.slice(effectArray === g.pendingEffects ? effectCount : 0);
      effectArray = g.pendingEffects; effectCount = effectArray.length;
      frames.push({ game: copy, label });
      if (!get().reducedMotion) g.hapticCues = [];
    };
    capture('Your action');
    if (!get().reducedMotion) g.onFrame = capture;
    try { fn(g); } finally { g.onFrame = undefined; }
    checkpoint(g); // Persist the resolved action before its animation begins.
    const changed = frames.length > 1 || g.pendingEffects.length > 0;
    if (!changed || get().reducedMotion || g.aiming) { if (get().reducedMotion) g.pendingEffects = []; settle(g); return; }
    capture('Result');
    // Canonical rules resolve once; playback only shows copies, never re-runs a turn.
    clearPlayback();
    finish = () => {
      clearPlayback();
      if (get().game !== g) return;
      g.pendingEffects = [];
      set({ frame: null }); settle(g);
    };
    let i = 0;
    const advance = () => {
      if (get().game !== g || get().screen !== 'game') { clearPlayback(); set({ frame: null }); return; }
      if (i >= frames.length) { finish?.(); return; }
      const frame = frames[i++];
      playCues(frame.game.hapticCues); frame.game.hapticCues = [];
      set(s => ({ frame, tick: s.tick + 1 }));
      timer = setTimeout(advance, frame.game.pendingEffects.some(f => f.type === 'shock') ? 580 : Math.max(160, Math.min(320, 2200 / frames.length)));
    };
    // Haptics are drained from snapshots once, alongside their corresponding beat.
    g.hapticCues = [];
    advance();
  };

  const fresh = () => { clearPlayback();
    const game = new Game('hydrogen', get().profile.equippedLigand); checkpoint(game);
    return ({
    frame: null, pendingAction: null,
    tutorial: null,
    game, screen: 'game' as Screen, tick: 0,
    pendingMove: null, inspecting: null, paused: false, lastAward: 0,
  }); };

  const practice = (tutorial: TutorialSession) => { clearPlayback(); set({
    frame: null, pendingAction: null,
    tutorial, game: tutorialGame(tutorial), screen: 'game', tick: get().tick + 1,
    paused: false, pendingMove: null, inspecting: null, lastAward: 0,
  }); };

  return {
    savedRun: null, saveWarning: null,
    continueRun: () => {
      const saved = get().savedRun;
      if (!saved || !get().profileLoaded) return;
      const game = restoreRun(saveRun(saved));
      if (!game) { set({ saveWarning: 'This saved run could not be restored.' }); return; }
      clearPlayback();
      set(s => ({ game, screen: 'game', tutorial: null, paused: false, frame: null,
        pendingAction: null, pendingMove: null, inspecting: null, lastAward: 0, tick: s.tick + 1 }));
    },
    saveAndExit: () => {
      finish?.();
      get().toMenu();
    },
    flushSave: async () => { finish?.(); const g = get().game; if (g) checkpoint(g); await flushProfile(); },
    pendingAction: null, frame: null, reducedMotion: false,
    setReducedMotion: value => { set({ reducedMotion: value }); if (value) finish?.(); },
    finishPlayback: () => finish?.(),
    prepareAction: action => {
      const g = get().game;
      if (!g || get().paused || get().frame || get().tutorial?.complete) return;
      set({ pendingAction: action });
    },
    cancelAction: () => set({ pendingAction: null }),
    tutorial: null,
    toTutorial: () => { clearPlayback(); set({ frame: null, pendingAction: null, screen: 'tutorialSetup', game: null, tutorial: null, paused: false, inspecting: null, pendingMove: null }); },
    startTutorial: (element, ligand) => practice({ element, ligand, lesson: 'move', complete: false }),
    resetLesson: () => { const t = get().tutorial; if (t) practice({ ...t, complete: false }); },
    nextLesson: () => {
      const t = get().tutorial;
      if (!t?.complete) return;
      const list = lessons(t.ligand);
      const next = list[list.indexOf(t.lesson) + 1];
      if (next) practice({ ...t, lesson: next, complete: false });
    },
    screen: 'menu',
    game: null,
    tick: 0,
    pendingMove: null,
    inspecting: null,
    paused: false,
    hapticsOn: true,
    profile: defaultProfile(),
    profileLoaded: false,
    lastAward: 0,

    startGame: () => { if (get().profileLoaded) set(fresh()); },
    retry: () => { if (get().tutorial) get().resetLesson(); else if (get().profileLoaded) set(fresh()); },
    toMenu: () => { finish?.(); const g = get().game; if (g) checkpoint(g); clearPlayback(); set({ frame: null, pendingAction: null, screen: 'menu', game: null, tutorial: null, pendingMove: null, inspecting: null, paused: false }); },
    toStore: () => set({ screen: 'store' }),
    toCatalogue: () => { if (get().screen === 'menu') set({ screen: 'catalogue' }); },

    hydrate: async () => {
      if (get().profileLoaded) return;
      const session = await loadSession();
      if (get().profileLoaded) return;
      set({ profile: session.profile, savedRun: restoreRun(session.active), profileLoaded: true });
    },
    buyLigand: (id) => writeProfile(purchaseLigand(get().profile, id)),
    equip: (id) => writeProfile(equipLigand(get().profile, id)),
    dismissFlash: () => commit(g => { g.ligandFlash = null; }),

    move: (dx, dy) => commit(g => {
      const res = g.movePlayer(dx, dy);
      if (res.needsConfirm) set({ pendingMove: { dx, dy } });
    }),
    confirmPendingMove: () => {
      const pm = get().pendingMove;
      set({ pendingMove: null });
      if (pm) commit(g => { g.movePlayer(pm.dx, pm.dy, true); });
    },
    cancelPendingMove: () => {
      set({ pendingMove: null });
      commit(g => { g.message = 'You hesitated and stayed alert.'; g.messageType = 'info'; });
    },

    ability: (tier) => commit(g => g.activateAbility(tier)),
    previewAim: (dir) => commit(g => g.previewAim(dir)),
    confirmAim: (orientation) => commit(g => g.confirmAim(orientation)),
    cancelAim: () => commit(g => g.cancelAim()),
    passTurn: () => commit(g => g.passTurn()),
    shatter: () => commit(g => g.shatter()),
    beginThrow: () => commit(g => g.beginThrow()),
    buy: (item) => commit(g => g.buy(item)),
    leaveHut: () => { const g = get().game; if (g) { g.leaveHut(); checkpoint(g); settle(g); } },

    inspect: (target) => set({ inspecting: target }),
    closeInspect: () => set({ inspecting: null }),
    pause: () => { finish?.(); set({ paused: true }); },
    resume: () => set({ paused: false }),
    toggleHaptics: () => {
      const on = !get().hapticsOn;
      setHapticsEnabled(on);
      set({ hapticsOn: on });
    },
  };
});
