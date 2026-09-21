import { create } from 'zustand';
import { Game } from '@/game/engine';
import { QUANTA_PER_WIN } from '@/game/constants';
import { playCues, setHapticsEnabled } from '@/ui/haptics';
import {
  addQuanta, defaultProfile, equipLigand, loadProfile, purchaseLigand, recordRun, saveProfile,
  type Profile,
} from '@/persistence/profile';
import type { Direction, ElementKey, HutItem, InspectTarget, LigandId, Orientation } from '@/game/types';

type Screen = 'menu' | 'store' | 'game' | 'over';

interface GameStore {
  screen: Screen;
  game: Game | null;
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

  startGame: (element: ElementKey) => void;
  retry: () => void;
  toMenu: () => void;
  toStore: () => void;
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

  /**
   * Called once per action, after the engine has resolved it. A run that has just ended is
   * banked here rather than in the engine, which must stay free of profile concerns.
   */
  const settle = (g: Game) => {
    drainHaptics(g);
    const ending = g.gameOver && get().screen === 'game';
    if (ending) {
      const award = g.won ? QUANTA_PER_WIN : 0;
      let next = recordRun(get().profile, { won: g.won, totalKills: g.totalKills, deepestGrid: g.depth });
      if (award > 0) next = addQuanta(next, award);
      writeProfile(next);
      set({ lastAward: award });
    }
    set(s => ({ tick: s.tick + 1, screen: g.gameOver ? 'over' : s.screen }));
  };

  const commit = (fn: (g: Game) => void) => {
    const g = get().game;
    if (!g) return;
    fn(g);
    settle(g);
  };

  const fresh = (element: ElementKey) => ({
    game: new Game(element, get().profile.equippedLigand), screen: 'game' as Screen, tick: 0,
    pendingMove: null, inspecting: null, paused: false, lastAward: 0,
  });

  return {
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

    startGame: (element) => set(fresh(element)),
    retry: () => set(fresh('hydrogen')),
    toMenu: () => set({ screen: 'menu', game: null, pendingMove: null, inspecting: null, paused: false }),
    toStore: () => set({ screen: 'store' }),

    hydrate: async () => {
      const profile = await loadProfile();
      set({ profile, profileLoaded: true });
    },
    buyLigand: (id) => writeProfile(purchaseLigand(get().profile, id)),
    equip: (id) => writeProfile(equipLigand(get().profile, id)),
    dismissFlash: () => commit(g => { g.ligandFlash = null; }),

    move: (dx, dy) => {
      const g = get().game;
      if (!g) return;
      const res = g.movePlayer(dx, dy);
      if (res.needsConfirm) { set({ pendingMove: { dx, dy } }); return; }
      settle(g);
    },
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
    leaveHut: () => commit(g => g.leaveHut()),

    inspect: (target) => set({ inspecting: target }),
    closeInspect: () => set({ inspecting: null }),
    pause: () => set({ paused: true }),
    resume: () => set({ paused: false }),
    toggleHaptics: () => {
      const on = !get().hapticsOn;
      setHapticsEnabled(on);
      set({ hapticsOn: on });
    },
  };
});
