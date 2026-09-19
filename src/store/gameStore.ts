import { create } from 'zustand';
import { Game } from '@/game/engine';
import { playCues, setHapticsEnabled } from '@/ui/haptics';
import type { Direction, ElementKey, HutItem, InspectTarget, Orientation } from '@/game/types';

type Screen = 'menu' | 'game' | 'over';

interface GameStore {
  screen: Screen;
  game: Game | null;
  tick: number;
  pendingMove: { dx: number; dy: number } | null;
  /** Long-press inspection card. Purely a view: it costs no turn and pauses nothing. */
  inspecting: InspectTarget | null;
  paused: boolean;
  hapticsOn: boolean;

  startGame: (element: ElementKey) => void;
  retry: () => void;
  toMenu: () => void;

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
  /** Hands the engine's cues to the device, then clears them so they play exactly once. */
  const drainHaptics = (g: Game) => {
    if (g.hapticCues.length === 0) return;
    playCues(g.hapticCues);
    g.hapticCues = [];
  };

  const commit = (fn: (g: Game) => void) => {
    const g = get().game;
    if (!g) return;
    fn(g);
    drainHaptics(g);
    set(s => ({ tick: s.tick + 1, screen: g.gameOver ? 'over' : s.screen }));
  };

  const fresh = (element: ElementKey) => ({
    game: new Game(element), screen: 'game' as Screen, tick: 0,
    pendingMove: null, inspecting: null, paused: false,
  });

  return {
    screen: 'menu',
    game: null,
    tick: 0,
    pendingMove: null,
    inspecting: null,
    paused: false,
    hapticsOn: true,

    startGame: (element) => set(fresh(element)),
    retry: () => set(fresh('hydrogen')),
    toMenu: () => set({ screen: 'menu', game: null, pendingMove: null, inspecting: null, paused: false }),

    move: (dx, dy) => {
      const g = get().game;
      if (!g) return;
      const res = g.movePlayer(dx, dy);
      if (res.needsConfirm) { set({ pendingMove: { dx, dy } }); return; }
      drainHaptics(g);
      set(s => ({ tick: s.tick + 1, screen: g.gameOver ? 'over' : s.screen }));
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
