import { create } from 'zustand';
import { Game } from '@/game/engine';
import type { Direction, ElementKey, HutItem, Orientation } from '@/game/types';

type Screen = 'menu' | 'game' | 'over';

interface GameStore {
  screen: Screen;
  game: Game | null;
  tick: number;
  pendingMove: { dx: number; dy: number } | null;

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
}

export const useGameStore = create<GameStore>((set, get) => {
  const commit = (fn: (g: Game) => void) => {
    const g = get().game;
    if (!g) return;
    fn(g);
    set(s => ({ tick: s.tick + 1, screen: g.gameOver ? 'over' : s.screen }));
  };

  return {
    screen: 'menu',
    game: null,
    tick: 0,
    pendingMove: null,

    startGame: (element) => set({ game: new Game(element), screen: 'game', tick: 0, pendingMove: null }),
    retry: () => set({ game: new Game('hydrogen'), screen: 'game', tick: 0, pendingMove: null }),
    toMenu: () => set({ screen: 'menu', game: null, pendingMove: null }),

    move: (dx, dy) => {
      const g = get().game;
      if (!g) return;
      const res = g.movePlayer(dx, dy);
      if (res.needsConfirm) { set({ pendingMove: { dx, dy } }); return; }
      set(s => ({ tick: s.tick + 1, screen: g.gameOver ? 'over' : s.screen }));
    },
    confirmPendingMove: () => {
      const pm = get().pendingMove;
      set({ pendingMove: null });
      if (pm) commit(g => g.movePlayer(pm.dx, pm.dy, true));
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
  };
});
