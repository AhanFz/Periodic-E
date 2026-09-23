import { Platform } from 'react-native';

/** Printed-page typography: a serif for text, a typewriter face for readings and figures. */
export const fonts = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }) as string,
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'Menlo' }) as string,
};

export const theme = {
  // page
  bg: '#f6f1e4',
  paper: '#f6f1e4',
  panel: '#fbf8ef',
  panel2: '#eee7d5',
  paperDeep: '#e2dac5',
  border: '#b9b09a',
  rule: '#b9b09a',
  ruleSoft: '#d9d2c0',
  text: '#1e2430',
  ink: '#1e2430',
  textDim: '#646b78',

  // accents: textbook blue, highlighter yellow, red ink, green ink
  accent: '#1f4e8c',
  accentSoft: '#dde7f3',
  gold: '#f4dd6d',
  goldText: '#3f3200',
  green: '#2f6b4f',
  greenSoft: '#dcebe0',
  purple: '#1f4e8c',
  red: '#a23b32',
  redSoft: '#f3dcd8',
  disabled: '#e6e0d0',
  disabledText: '#9a9484',

  // figure (the board)
  figureBg: '#fbf8ef',
  graph: '#c9d4e3',
  tileLight: '#fdfcf7',
  tileDark: '#f3efe4',
  tileBorder: '#8b95a7',
  voidFill: '#0b1020',
  voidBorder: '#2a3347',
  voidStar: '#eaf1ff',
  voidStarWarm: '#f4dd6d',
  chamberTop: '#fbf8ef',
  boardShadow: '#d9d2c0',

  // electrons
  playerElectron: '#1f4e8c',
  halogenElectron: '#a23b32',

  /**
   * Effect palettes, from the sprite figures. These are deliberately louder than the printed
   * page around them: a tile that will hurt you should not be a shade of beige.
   */
  lava: { rock: '#2a2a2e', rockLight: '#3a3a40', crack: '#df7542', core: '#f5c877', glow: '#ff8c1a' },
  ice: { deep: '#548ba7', medium: '#a8d9e9', light: '#e7faff' },
  bolt: { white: '#fff9df', yellow: '#f2c75c', cyan: '#91cbd6' },
  toxin: { deep: '#584279', medium: '#937aaa', light: '#e4dced' },

  // margin notes
  info: { bg: '#eef2f8', fg: '#1e2430', border: '#1f4e8c' },
  success: { bg: '#e4efe6', fg: '#1f4a36', border: '#2f6b4f' },
  warning: { bg: '#f9efcd', fg: '#5c4300', border: '#c9a227' },
  danger: { bg: '#f5dfdb', fg: '#7a2620', border: '#a23b32' },

  // tile tints — later entries in a tile's tint list override earlier ones
  tint: {
    sheet: { bg: '#e1e7ee', border: '#4a6a8a' },
    hut: { bg: '#e3efe4', border: '#2f6b4f' },
    hatch: { bg: '#dfe8f4', border: '#1f4e8c' },
    scorched: { bg: '#2a2a2e', border: '#df7542' },
    trail: { bg: '#ece2d6', border: '#8d6e63' },
    trap: { bg: '#fbf1c7', border: '#c9a227' },
    hazard: { bg: '#e4d4ef', border: '#6a0d91' },
    warning: { bg: '#fdf5c9', border: '#d1a417' },
    danger: { bg: '#fbe3cf', border: '#d97b16' },
    encased: { bg: '#e2f1f8', border: '#0f7bb0' },
    frozen: { bg: '#dff1f7', border: '#00a0a0' },
    paralyzed: { bg: '#fdf3b8', border: '#d1a417' },
    bonding: { bg: '#fbe1e1', border: '#c0392b' },
    tethered: { bg: '#dcedf9', border: '#1f6fa8' },
    ghost: { bg: '#efe4f2', border: '#8e44ad' },
    aim: { bg: '#fff3c4', border: '#e0a800' },
  },
} as const;
