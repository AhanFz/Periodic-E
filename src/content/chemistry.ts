import {
  ATOMIC_MASS, ATOMIC_NUMBER, ELEMENT_NAMES, ELEMENT_ORDER, ELEMENTS,
  ENEMIES, ENEMY_ATOMIC_MASS, ENEMY_ATOMIC_NUMBER, ENEMY_NAMES,
} from '../game/constants';
import type { ElementKey, EnemyType } from '../game/types';

export type SpecimenId = ElementKey | EnemyType;
interface ChemistryNote {
  theme: string;
  state: 'Gas' | 'Liquid' | 'Solid';
  family: string;
  science: string;
  connections: string[];
  licence: string;
  extraSource?: { title: string; url: string };
}
/** Original educational copy; mechanics below come from the live game definitions. */
export const CHEMISTRY: Record<SpecimenId, ChemistryNote> = {
  hydrogen: {
    theme: 'Small atom, powerful fuel', state: 'Gas', family: 'Nonmetal',
    science: 'Hydrogen is the lightest element. Hydrogen fuel reacts with oxygen to form water and release energy; liquid hydrogen and oxygen power some rocket engines. Hydrogen bonding is an attraction involving hydrogen already bonded to an electronegative atom, commonly oxygen, nitrogen or fluorine.',
    connections: ['Hydrogen Bond turns the idea of molecular attraction into a tether that draws an enemy along behind you.', 'Double Dash borrows its burst of movement from hydrogen-powered rocket propulsion.'],
    licence: 'A lone hydrogen atom is not a rocket. The tether is a metaphor: a real hydrogen bond is not a rope, and is different from the covalent bond inside H₂ or HCl.',
  },
  helium: {
    theme: 'The cryogenic specialist', state: 'Gas', family: 'Noble gas',
    science: 'Helium has a filled first electron shell and is very unreactive. Liquid helium is used for extremely low-temperature cooling, including superconducting magnets in MRI scanners.',
    connections: ['Freeze and Deep Freeze turn cryogenic cooling into crowd control. Freezing interrupts even a prepared enemy attack.'],
    licence: 'Room-temperature helium gas does not freeze things on contact. Shattering frozen enemies and the noble-gas turn limit are game rules, not properties of helium atoms.',
  },
  lithium: {
    theme: 'Energy on the move', state: 'Solid', family: 'Alkali metal',
    science: 'Lithium is a light metal used in batteries. In a lithium-ion battery, lithium ions move between electrode materials while electrons flow through an external circuit.',
    connections: ['Battery translates energy storage into a delayed photon reward.', 'Ion Beam takes the battery’s movement of charged particles and exaggerates it into a directional electrical attack.'],
    licence: 'Lithium does not charge itself by waiting or shoot lightning across empty space. The charging timer, interruption and paralysis are gameplay choices.',
  },
  beryllium: {
    theme: 'Lightweight protection', state: 'Solid', family: 'Alkaline-earth metal',
    science: 'Beryllium is a low-density metal used in aerospace materials and in alloys with copper or nickel. Beryllium oxide is useful in high-temperature ceramics.',
    connections: ['Shield and Inert Shield borrow from structural materials and durable ceramics to give Beryllium a defensive role.'],
    licence: 'The shield is an analogy, not literal armour made by a single atom. Beryllium is not a noble gas; “Inert Shield” and poison immunity are fictional. Real beryllium can be toxic.',
  },
  boron: {
    theme: 'Changing materials from within', state: 'Solid', family: 'Metalloid',
    science: 'Small amounts of boron added to silicon change its electrical behaviour, producing p-type material with mobile electron “holes”. Boron compounds also help make borosilicate glass resistant to temperature changes.',
    connections: ['Dopant Trap turns the control of electrical properties into a tile that damages and interrupts an enemy.', 'Encase draws on boron’s connection to glass, sealing an enemy until the shell shatters.'],
    licence: 'Doping changes a material’s electronic structure; it is not a literal trap. Boron alone does not instantly become glass.',
    extraSource: { title: 'Toshiba · Boron and p-type silicon', url: 'https://toshiba.semicon-storage.com/us/semiconductor/knowledge/e-learning/discrete/chap1/chap1-4.html' },
  },
  carbon: {
    theme: 'One element, different structures', state: 'Solid', family: 'Nonmetal',
    science: 'Carbon can form different structures called allotropes. Graphene is an atom-thin sheet of bonded carbon; diamond has a three-dimensional bonding network and is exceptionally hard.',
    connections: ['Graphene Sheet makes the sheet-like structure into a temporary bridge.', 'Diamond Spear borrows diamond’s hardness and use in cutting tools for a piercing weapon.'],
    licence: 'Hardness is resistance to scratching, not invulnerability. The bridge’s lifetime and the spear’s durability are balance choices; atoms cannot rearrange into these objects on command.',
  },
  nitrogen: {
    theme: 'Stable gas, energetic compounds', state: 'Gas', family: 'Nonmetal',
    science: 'Ordinary nitrogen gas is N₂, with a strong triple bond. Nitrogen is also present in many energetic compounds used in explosives. An element’s behaviour can be very different from that of its compounds.',
    connections: ['Blast and Blast 4 borrow from energetic nitrogen-containing compounds to create a burst-and-scorch fighting style.'],
    licence: 'Nitrogen gas in the air is not an explosive fuel. The blasts, scorched ground and immunity to those tiles are fictional; the inspiration comes from compounds, not a lone nitrogen atom.',
  },
  oxygen: {
    theme: 'Life support and a reactive trio', state: 'Gas', family: 'Nonmetal',
    science: 'O₂ supports cellular respiration. Ozone, O₃, is another form of oxygen: in the upper atmosphere it absorbs ultraviolet radiation, while near the ground it is a harmful air pollutant.',
    connections: ['Heal is inspired by oxygen’s role in respiration.', 'Ozone Layer turns ozone’s reactive character into a spreading attack.'],
    licence: 'Oxygen does not instantly repair damage. The attacking wave is fictional: the atmospheric ozone layer protects life by absorbing UV, not by blasting nearby objects.',
  },
  neon: {
    theme: 'Light from excited atoms', state: 'Gas', family: 'Noble gas',
    science: 'Neon is a very unreactive noble gas. Electrical excitation in a discharge tube produces its characteristic reddish-orange glow as excited atoms release energy as light.',
    connections: ['Blinding Flash and All-Out Flash amplify that glow into a combat ability.'],
    licence: 'Light forcing enemies to flee, breaking bonds and freezing them is a game metaphor. Neon does not become unstable after a fixed number of turns.',
  },
  fluorine: {
    theme: 'Intense reactivity', state: 'Gas', family: 'Halogen · group 17',
    science: 'Elemental fluorine is F₂, a very reactive, pale yellow-green gas. Its vigorous reactions inspire a halogen that demands an immediate response.',
    connections: ['The armed explosion makes Fluorine’s reactivity into a visible countdown.', 'F₂ bonding joins two enemies into a larger threat.'],
    licence: 'F₂ does not spontaneously explode on a turn timer. Ramming to defuse it is fictional. The game’s red colour helps identify the enemy; it is not fluorine’s real colour.',
  },
  chlorine: {
    theme: 'A dangerous cloud', state: 'Gas', family: 'Halogen · group 17',
    science: 'Elemental chlorine is Cl₂, a yellow-green gas that is harmful to breathe. Chlorine chemistry is also used in water treatment; chemical form and concentration matter.',
    connections: ['The prepared poison cloud turns chlorine’s hazardous gaseous form into an area-control attack.', 'Cl₂ bonding makes two chlorine enemies act as one molecule.'],
    licence: 'The rotating cloud patterns and turn-by-turn damage are game rules. Purple poison is an interface colour; real chlorine gas is yellow-green.',
  },
  bromine: {
    theme: 'The liquid halogen', state: 'Liquid', family: 'Halogen · group 17',
    science: 'Elemental bromine is Br₂, a reddish-brown liquid at room temperature. It is the liquid member among the four halogens featured in this game.',
    connections: ['A bonded Bromine enemy’s trail borrows from its liquid form.', 'Contact-based ability locking and electrical resistance give it a distinct combat role.'],
    licence: 'Liquids are not automatically resistant to electricity. Ability locks and the precise beam resistance are balance mechanics, not consequences of being liquid.',
  },
  iodine: {
    theme: 'From crystal to vapour', state: 'Solid', family: 'Halogen · group 17',
    science: 'Elemental iodine is I₂, a dark crystalline solid. It can sublime: pass directly from solid to vapour. Iodine vapour is purple.',
    connections: ['Vanishing and leaving a last-known position turn sublimation into an evasive enemy ability.', 'I₂ bonding represents a molecule containing two iodine atoms.'],
    licence: 'Sublimation is a change of physical state, not invisibility. Iodine vapour is visible; the health cost and unseen movement are fictional.',
  },
};

export const HALOGEN_ORDER: EnemyType[] = ['fluorine', 'chlorine', 'bromine', 'iodine'];
export const SPECIMEN_ORDER: SpecimenId[] = [...ELEMENT_ORDER, ...HALOGEN_ORDER];
export function specimen(id: SpecimenId) {
  const enemy = HALOGEN_ORDER.includes(id as EnemyType);
  const key = id as ElementKey, halogen = id as EnemyType;
  return {
    id, enemy, ...CHEMISTRY[id],
    name: enemy ? ENEMY_NAMES[halogen] : ELEMENT_NAMES[key],
    symbol: enemy ? ENEMIES[halogen].symbol : ELEMENTS[key].symbol,
    number: enemy ? ENEMY_ATOMIC_NUMBER[halogen] : ATOMIC_NUMBER[key],
    mass: enemy ? ENEMY_ATOMIC_MASS[halogen] : ATOMIC_MASS[key],
    mechanics: enemy ? [
      { name: 'Behaviour', text: ENEMIES[halogen].desc },
      { name: 'Watch for', text: ENEMIES[halogen].tell },
      { name: 'Counterplay', text: ENEMIES[halogen].counter },
    ] : [
      { name: `${ELEMENTS[key].ability1Name} · ${ELEMENTS[key].ability1Cost} 🔆`, text: ELEMENTS[key].ability1Desc },
      { name: `${ELEMENTS[key].ability2Name} · ${ELEMENTS[key].ability2Cost} 🔆`, text: ELEMENTS[key].ability2Desc },
    ],
    source: `https://periodic-table.rsc.org/element/${enemy ? ENEMY_ATOMIC_NUMBER[halogen] : ATOMIC_NUMBER[key]}/${id}`,
  };
}
export const BONDING_SOURCE = 'https://openstax.org/books/chemistry-2e/pages/7-2-covalent-bonding';
