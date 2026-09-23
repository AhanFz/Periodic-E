# Element Evolution — project context

A turn-based chemistry roguelike for phones. You start as Hydrogen, fight halogens on a grid, spend
photons on evolving up the periodic table, and try to escape as Neon without dying.

This file is the handoff document: what the project is, how it is built, what every number currently
is, and — most importantly — *why* the non-obvious decisions were made. If you are picking this up
cold, read the "Boundaries that must hold" and "Decisions and their reasons" sections before changing
anything, because several of them look like arbitrary complexity and are not.

---

## 1. Working copy: ChatGPT clone only

All future edits in this conversation belong exclusively to
`/Users/ahanfz/Desktop/element evolution v2 - chatgpt`.
The original `element-evolution-v2` and its nested `Periodic-E` GitHub project must remain untouched.
Do not mirror changes back, run rsync against those projects, or push without an explicit request.
This copy includes the original project's uncommitted changes and Git history.

### Playable tutorial (September 2026)

The main menu now offers Start (always Hydrogen), Playable tutorial, and the ligand shop.
Element selection is only available inside tutorial setup. All nine elements and all four ligands
(or no ligand) can be tried without ownership, payment or changing saved equipment.

`src/game/tutorial.ts` defines deterministic rooms, instructions and completion predicates. Lessons:
move and collect; skip; ram; both element abilities; chosen ligand; hatch. Battery requires three
turn-ends, Boron demonstrates trap damage and shattering, Carbon demonstrates bridge placement and
forging/throwing. Each lesson resets the room and resources; retry keeps the chosen equipment.
`Game` accepts a third `mode` argument, defaulting to `run`. Tutorial mode disables reinforcements
and noble-gas deadlines; damage and abilities still use the normal engine. Reaching the hatch ends
practice without marking a win. The store bypasses all profile recording/saving for tutorial actions.
Normal starts and retries use Hydrogen and the saved equipped ligand, after profile loading.

Tests: `sim/tutorial.ts` exercises all 45 equipment combinations (306 rooms), and
`node tools/test-tutorial-store.cjs` verifies menu routing, reset and reward/profile isolation.
Tutorial completion is based on actual effects, not opening an aim preview. Each room can be reset.


## 2. Stack and how to verify

Expo SDK 57, React Native 0.86, React 19.2.3, TypeScript 6, zustand for state.

```bash
npm install
npx expo start          # QR code, opens in Expo Go

npm run typecheck       # tsc --noEmit
npm run sim             # scenarios + 1200 simulated games + noble probe + ligand comparison
npm run preview         # renders the drawn tile effects to .preview/ so they can be looked at
npx expo export --platform android --output-dir /tmp/check --clear    # confirms it bundles
```

**Run all three of typecheck, sim and export before calling anything done.** The simulator catches
rule regressions that types cannot, and the export catches bundling problems that neither catches.

Dependencies beyond Expo's own: `zustand`, `expo-haptics`, `@react-native-async-storage/async-storage`,
`react-native-svg`. Every one of those is bundled inside Expo Go, so **no development build is needed**
and the game still runs by scanning a QR code. Install native modules with `npx expo install <name>`,
never by hand-editing `package.json`, so versions stay aligned to the SDK.

There is deliberately **no `babel.config.js`**. SDK 57 supplies `babel-preset-expo` through its own
Metro config and a stray root babel config breaks bundling.

---

## 3. Architecture and the boundaries that must hold

```
src/game/          pure game logic — no React imports, no storage imports, headlessly testable
  types.ts         every shared type
  constants.ts     every tuning number and data table
  grid.ts          procedural layouts + flood-fill validation
  engine.ts        the Game class: rules, ramming, abilities, enemies, bonding, polarity, hut, ligands
  view.ts          per-tile render data (BoardView / TileView / AtomView)
src/persistence/
  profile.ts       the ONLY file that touches AsyncStorage
src/store/
  gameStore.ts     zustand: screen routing, action plumbing, profile writes, haptic draining
src/ui/
  theme.ts         printed-page palette + effect palettes
  haptics.ts       turns the engine's cues into device feedback
  seed.ts          stable per-tile pseudo-randomness
  shapes.ts        pure geometry for the drawn tile effects (no React, no react-native)
  components/      board, tiles, modals, drawn effects
  screens/         LevelSelect, Store, Game, GameOver
sim/sim.ts         headless simulator: worked-example scenarios, random and goal-seeking play, invariants
tools/preview.ts   renders src/ui/shapes.ts to an SVG sheet so effects can be seen without a phone
```

Three boundaries are load-bearing:

1. **`src/game/` imports nothing from React, react-native, or persistence.** That is what lets the
   simulator load the engine in plain Node and play 1200 games per run. The engine is *handed* an
   equipped ligand id in its constructor and knows nothing about where it came from.
2. **Only `src/persistence/profile.ts` touches storage.** The quanta award for winning is banked in
   the zustand store as a run ends, not in the engine.
3. **`src/ui/shapes.ts` imports nothing from react-native.** That is what makes `npm run preview`
   possible.

---

## 4. Core rules, as they currently stand

**Goal.** Reach the hatch on each grid. Visit the isotope hut to evolve. Escaping as Neon wins.
Running out of health ends the run.

**The turn.** One move and one ability, in either order. The turn ends automatically once both are
spent, or when the player presses the button. A turn can also be passed with **nothing** spent — the
same button reads *Skip turn* until something is used.

**Ramming.** Walking into an enemy attacks it and the player does **not** move into the tile.

- 2 damage out (3 while Exothermic Edge is active), plus the damage catalyst.
- 1 damage to the player, always, regardless of the above.
- Frozen enemies shatter for free, no damage either way.
- Beryllium rams free while any shield holds.
- Ramming a Fluorine defuses it. Ramming a Bromine locks abilities for the next turn.

**Photons.** Cap 5, start 2, 1 per kill, 2 for a molecule, plus pickups on the board.

**The isotope hut.** Evolve (base price minus kills on this grid, floor 1; nobles pay a flat price),
Heal 2 photons for +2 health, and two permanent catalysts at 3 photons each (+2 max health, or +1
damage to abilities and rams).

**Noble gases** (Helium, Neon) must reach the hatch within `grid size + 3` turns or take 1 damage per
turn afterwards.

**Grids.** Size is `min(7, 5 + min(2, floor((depth - 1) / 3)))`. Shapes: plain, void, split, eroded.
Layouts are validated by flood fill so start, hut and hatch are always mutually reachable.

**Polarity.** From depth 3, never two grids in a row, 50% chance after the first. Every 4 turns
everything slides: the player one way, the halogens the other. Being crushed against an edge costs 1.

**Spawn pressure.** Floor of `2 + min(3, floor(depth / 2))` enemies, hard cap 6, with a top-up every
4 turns.

**Bonding.** Two adjacent halogens of the same type fuse into a diatomic molecule: double health,
double payout, and a wider version of their attack. Neon's flash breaks bonds.

---

## 5. The elements

Max health is **derived from atomic weight**, not hand-tabled: `BASE_HEALTH + floor(mass / AMU_PER_HEALTH)`
with `BASE_HEALTH = 4` and `AMU_PER_HEALTH = 3`. Change either constant and the whole table moves.
The curve never falls as you evolve, so every evolution is a visible upgrade.

| | Mass | HP | Evolve | Tier 1 | Tier 3 |
|---|---|---|---|---|---|
| **H** Hydrogen | 1.008 | 4 | 3 | Hydrogen Bond (1) — tether an adjacent enemy 2 turns; it trails you and cannot act | Double Dash (3) — dash 2 tiles, 3 damage to everything passed through, none to you |
| **He** Helium | 4.003 | 5 | 2 | Freeze (1) — the 4 cardinal tiles for 2 turns | Deep Freeze (3) — all 8 neighbours for 3 rounds |
| **Li** Lithium | 6.94 | 6 | 5 | Battery (1) — charge 3 turns; untouched, it pays 4 photons | Ion Beam (3) — 2 damage + paralysis in one direction, across voids, to the far edge |
| **Be** Beryllium | 9.012 | 7 | 5 | Shield (1) — +2, free ramming while it holds | Inert Shield (3) — +3, free ramming, poison immunity |
| **B** Boron | 10.81 | 7 | 5 | Dopant Trap (1) — burns the next enemy for 1 and paralyzes it | Encase (3) — seal an adjacent enemy in glass; Shatter is free |
| **C** Carbon | 12.011 | 8 | 6 | Graphene Sheet (1) — bridge off an edge or over void, collapses in 3 | Diamond Spear (3) — 3 damage per hit, range 4, 4 durability |
| **N** Nitrogen | 14.007 | 8 | 6 | Blast (1) — 3 damage and scorch, 2 tiles in a line | Blast 4 (3) — all 4 neighbours |
| **O** Oxygen | 15.999 | 9 | 6 | Heal (1) — restore 1 | Ozone Layer (3) — 3 damage to 8 neighbours, then 2 in a star two out |
| **Ne** Neon | 20.180 | 10 | — | Blinding Flash (1) — neighbours flee 2 rounds, breaks bonds | All-Out Flash (3) — 1 damage to every enemy on the grid and freeze |

Tier costs are **per element** (`ability1Cost` / `ability2Cost`), not a global 1-and-3. Nothing should
hardcode `3` for a tier-3 price; use `game.abilityCost(tier)`.

### The halogens

| | HP | Behaviour |
|---|---|---|
| **F** Fluorine | 2 | Arms when near you, explodes the following turn for 2. Ram it to defuse. |
| **Cl** Chlorine | 3 | Channels, then releases poison. Standing in it costs 1 a turn for 2 turns. |
| **Br** Bromine | 3 | Liquid. Any contact, including your rams, locks your abilities for a round. Resists electricity. |
| **I** Iodine | 4 | Vanishes for a round, paying 1 health each time. Stops at 1. |

---

## 6. The meta layer: ligands and quanta

A **ligand** is a passive item equipped before a run, from the menu, bought with **quanta** (glyph ⬢).
It is deliberately distinct from a catalyst:

| | Catalyst | Ligand |
|---|---|---|
| Acquired | In the hut, mid-run | In the menu, before the run |
| Cost | Photons (in-run) | Quanta (persistent) |
| Effect | Flat and permanent | Conditional — fires on a situation |
| Scope | Rest of the run | Whole run, fixed |

**One slot, and that is load-bearing.** The single slot is what stops these from combining. Do not add
more slots without re-running the balance comparison.

| Ligand | ⬢ | Effect |
|---|---|---|
| Passivation Layer | 40 | First time each grid that damage drops you to ≤2 health, gain 2 shield. |
| Supercooled Core | 60 | Once per run, a killing blow leaves you at 1 and freezes every neighbour 2 turns. |
| Fractional Distillation | 50 | Everything costs 1 photon less during each grid's first hut visit, evolution included. |
| Exothermic Edge | 45 | While health ≤ `ceil(maxHealth / 3)`, rams deal 3 instead of 2. Self-damage stays 1. |

**Quanta** are earned only by winning: 10 for escaping as Neon. Losing pays nothing.

### Profile schema

One versioned record under one AsyncStorage key.

```ts
interface Profile {
  schemaVersion: number;   // currently 1
  quanta: number;
  ownedLigands: LigandId[];
  equippedLigand: LigandId | null;
  runsWon: number;
  runsPlayed: number;
  bestTotalKills: number;
  deepestGrid: number;
}
```

Rules that must survive any future change:

- `loadProfile()` **never rejects**. Missing, unparseable, or an unrecognised `schemaVersion` all
  return a fresh default profile. Corrupt storage must not crash the app on launch.
- `migrate()` rebuilds field by field. An **unknown ligand id is dropped, not an error**, so removing
  a ligand in a later version cannot brick an existing save. An equipped ligand that is not owned
  resolves to `null`.
- `saveProfile()` is debounced and coalesced (400ms). `flushProfile()` forces a write.
- `canAfford`, `purchaseLigand`, `equipLigand`, `addQuanta`, `recordRun` are **pure**: they take a
  profile and return a new one, with no storage calls, so they are unit-testable.

---

## 7. Decisions and their reasons

This is the section worth reading. Each of these looks like needless complexity and each one is
load-bearing.

**Every point of player damage goes through `damagePlayer(amount, source)`.** One choke point, with an
eight-value `DamageSource`. The ordering inside it is the whole design: shields absorb, health falls,
a save can intervene, then Passivation reads the transition. Passivation applies *after* the blow, so
it can never prevent the blow that triggered it.

**Passivation tests an edge, not a threshold.** A plain `health <= 2` check re-arms every time the
shield it granted absorbs a hit and lets health settle back on the threshold — an unkillable loop
rather than a ligand. It compares health before and after the damage and fires only on a *crossing*.
A simulator scenario clears the once-per-grid flag and rams six more times to prove the edge test
alone holds the line, and an invariant fails any run where it fires twice on one grid.

**Supercooled Core deliberately does not save against `destabilise`.** If it absorbed the noble-gas
timer, a hard deadline would become a speed bump you could walk through.

**Ligand messages are queued, not written directly.** Ligands fire inside `damagePlayer`, and every
caller follows with its own `setMessage`, which overwrites. `raiseLigandNote()` queues the line and
`setMessage`/`note` flush it, so the explanation for something the player just watched happen is not
silently clobbered.

**Supercooled also raises `ligandFlash`**, a modal card, because a once-per-run moment that decided
whether the run is still alive is too important to leave in the message line.

**The start ring uses its own flag, not `turnsOnGrid`.** Evolving resets `turnsOnGrid` for the noble
timer, so keying the ring off it would make it reappear mid-grid. `showStartMarker` is set in
`enterGrid` and cleared on the first `endTurn`.

**Battery counts the turn it was started in.** Charging is an ability, so on a turn where the player
has already moved it ends the turn immediately, and counting that as a full turn of charge made the
cell pay out after what felt like one turn. `BATTERY_TURNS = 3` is in turn-ends, the activation turn
included, and `tickBattery()` runs last in `endTurn` so every damage source has already resolved.

**Nitrogen is the strongest element on purpose.** Pricing its Blast at 2 photons was tried and
reverted: it cut total evolutions across 600 simulated runs by a quarter, because Nitrogen is the
payoff on the way to Oxygen and Neon.

**Scorched ground draws rock *over* a lava bed.** Stroking bright cracks onto a dark tile produces
orange lightning, not ground. The glow is the seam between slabs. Its ember pulse is a third layer
*between* bed and slabs, so the slabs mask it everywhere except the gaps and it still animates on the
native driver.

**`FxBurst` branches below its hooks, not above.** Hook order must not depend on the effect type.

**Buying a ligand also equips it.** With one slot that is always what the player meant.

---

## 8. Balance methodology

Tuning is done against `npm run sim`, not by feel. It runs:

1. **Worked-example scenarios** — deterministic assertions for specific rules. These are the
   regression net; add one whenever you add a rule.
2. **600 random-play games** — invariant checks only. Nothing should ever throw.
3. **600 goal-seeking games** — a policy that rams when healthy, shops when it can afford to evolve.
   This produces the per-element table.
4. **Noble-gas hatch probe** — checks the turn limit is fair but not slack.
5. **Ligand comparison** — the same goal-seeking policy once per configuration, five in total.

**Read `evolutions` and `avg kills`, not `wins`.** Win counts are 6 to 17 out of 600 and swing that
much between identical runs. Evolutions and kills are stable.

### Latest ligand comparison (600 games each)

| configuration | wins | avg kills | avg deepest grid | ram kills | by ram |
|---|---|---|---|---|---|
| no ligand | 10 | 4.63 | 2.27 | 1910 | 69% |
| Passivation Layer | 10 | 6.50 | 2.05 | 2819 | 72% |
| Supercooled Core | 9 | 5.08 | 2.85 | 2105 | 69% |
| Fractional Distillation | 10 | 4.86 | 2.25 | 2018 | 69% |
| Exothermic Edge | 10 | 6.91 | 2.24 | 3048 | 74% |

Notes on that table:

- **Exothermic was dominant at `ceil(maxHealth / 2)`**: 8.10 average kills and 3674 ram kills. Moving
  the threshold to `/3` brought it to 6.91, level with Passivation. The mechanism is that 3 damage
  collapses Chlorine and Bromine from two-ram enemies into one-ram enemies.
- **Fractional Distillation is not dominant**, which was a surprise given it discounts evolution. The
  discount is capped at one photon per grid and the policy usually makes one hut visit per grid.
- **Supercooled is the depth ligand**, not a kill ligand, and fires in about 80% of runs.
- **The policy under-sells Battery and Supercooled** by construction: it charges the cell and then
  walks straight back into a fight. Trust play-testing over these numbers for those two.

### Earlier balance work, for context

The original build had Hydrogen scoring a kill in 21% of its games, Lithium evolving twice per 120
games, and Boron once per 115. Current numbers are 67%, ~20 and ~27. What moved them: base health 3
to 4 (Hydrogen could not afford the two rams its kit assumes), Hydrogen's evolve price 4 to 3,
Boron's 6 to 5, and rebuilding Lithium.

Lithium was rebuilt because a 2-photon Burst made its own Paralysis Ray pointless — the expensive
ability did strictly more, including the paralysis. It is now an economy element: Battery funds, Ion
Beam spends.

---

## 9. Visual system

The art direction is a **printed textbook page**: cream paper, serif type, ruled tables, figure
captions. The board is "Figure N", the stats are "Table 1 · Specimen readings", the hut is "Appendix
A · Price list". Keep new UI in that voice.

Against that, hazards are deliberately loud. Palettes live in `theme.ts` as `lava`, `ice`, `bolt` and
`toxin`, taken from the sprite reference figures.

**Hazards are drawn, not lettered.** `ScorchedGround`, `FrostCrystals`, `PoisonCloud` and `BoltStreak`
are real `react-native-svg` polygons, paths and gradients. Where a drawn effect replaces an icon,
`Tile` drops the icon, so a tile never says the same thing twice in two visual languages. Voids are
near-black with slow-twinkling stars.

**Shapes are seeded from tile coordinates** through `src/ui/seed.ts`, so a given tile keeps its own
cracks and its own cloud instead of reshuffling on every render.

**Use `npm run preview` before tuning any of this.** It renders the same functions the game uses into
`.preview/effects.svg`, rasterises it with macOS `qlmanage`, and shows every effect at phone size and
at 3x. The first version of these effects was tuned blind and produced lava that looked like orange
lightning and ice that looked like teal grass. Look at the sheet.

### Haptics

Two layers. `src/game/engine.ts` records *what happened* as `hapticCues`; `src/ui/haptics.ts` decides
which buzz that is and **plays only the most significant cue per action**, because buzzing three times
for one tap reads as a rattle. Evolution gets a rising three-beat. The engine stays free of Expo. The
queue is capped, because the simulator never drains it. There is an on/off switch in the pause menu.

---

## 10. Open items and cautions

- **Nothing is committed** in either repository.
- **The ligand and effect visuals have never been seen on a real device** by the assistant that built
  them. Tiles have only been verified in isolation through the preview sheet, never composed on a real
  board with atoms standing on them. A screenshot from Expo Go is the single most useful thing a
  human can provide.
- **Exothermic Edge is priced at 45 while being among the strongest.** Price ordering does not match
  power ordering.
- **Passivation's "do not fire on a lethal blow" guard is currently unreachable**, because no single
  damage source deals more than 2, so health cannot cross from above 2 straight to 0. It is there for
  when a 3-damage source is added.
- **Polarity can move the player onto the hut tile without counting a hut visit**, because only
  `checkStructures` counts arrivals. Consistent with existing behaviour — a polarity shove does not
  open the shop either — but it means a shoved player keeps their first-visit discount for later.
- **`.DS_Store` is tracked** in the Periodic-E repository from an earlier commit. Adding it to
  `.gitignore` does not untrack it.
- Asset upgrade paths, if hand-authored art is wanted: sprite sheets as PNG with transparency (one row
  per animation, uniform frame size, 64 or 128 square for a tile rendering at 40–70pt), animated WebP
  or GIF through `expo-image`, or Lottie JSON through `lottie-react-native`. All three are bundled in
  Expo Go. **Video is the wrong tool for tiles** — transparency support is poor across platforms and
  files are large.

---

## 11. What changed in this working session

In rough order:

1. Max health derived from atomic weight; curve 4·5·6·7·7·8·8·9·10.
2. Per-element `ability2Cost`; nothing hardcodes tier-3 at 3 photons any more.
3. Balance: Hydrogen evolve 4→3, Boron 6→5, Nitrogen tested and deliberately left alone.
4. Lithium rebuilt: Paralysis Ray and Burst replaced by Battery and Ion Beam. Ion Beam is the only
   thing in the game that fires across a void.
5. Battery timing corrected to three turn-ends including the activation turn; payout raised to 4.
6. Boron's dopant trap now burns for 1 as well as paralyzing.
7. Long-press any atom for a card: readings, behaviour, tell, counter, live conditions.
8. Haptics, with an engine/UI split and a mute switch.
9. Pause menu with resume, restart and quit, each destructive exit confirming once.
10. Start tile ringed for the first turn of each grid, replacing a corner arrow.
11. Voids redrawn as near-black starfields.
12. Skip-turn affordance fixed — it was always possible, but styled to look disabled.
13. Ligand and quanta meta-layer: four ligands, persistence, store screen, award on a win.
14. Exothermic threshold narrowed from `/2` to `/3` after it measured dominant.
15. Tile effects rebuilt in `react-native-svg`, with `npm run preview` added so they can be seen.

### Verification note: pre-existing enemy-cap mismatch

During tutorial verification the random simulator once failed its six-enemy invariant with seven
enemies. A deterministic check confirmed that Neon's Flash can split a molecule when there are
already six enemy entities, leaving seven. The bond-splitting implementation is unchanged from the
source project. The subsequent full simulation passed; this intermittent unrelated issue remains.
Tutorial scenarios and store-isolation checks passed, and the Android export succeeded. Device
layout, touch interaction and animation quality still need Expo Go playtesting.


## Latest playability changes (September 22, 2026)

Only edit the ChatGPT clone. The active UI now uses a compact header, a board fitted to available space, and fixed controls (side by side in landscape). Details holds longer instructions. Tap controls acts immediately; hold for optional action preview. Do not restore mandatory confirmation for each movement or ability: the user explicitly rejected it as too slow. The existing End/Skip turn remains, with automatic turn completion after both slots are spent.

`src/game/actions.ts` projects immediate actions on a pure engine fork. It must never consume RNG, reveal hidden enemies, or mutate live state. `Game.onFrame` is an optional pure callback for presentation; the store records snapshots and owns playback timers/haptics/reward settlement. No React/storage imports belong in the engine. Pause/background/reduced-motion finish playback; reset/menu cancels it. Preserve these lifecycle guarantees.

Freeze cancels already-loaded Fluorine and Chlorine attacks, including their telegraph tiles. Use the shared freeze helper for Helium, Neon and Supercooled Core. Enemy pressure is in `ENEMY_PRESSURE`, increasing from Hydrogen's one initial enemy/two-atom cap to a six-atom cap in late elements. Bonded pairs count as two for spawning. Do not restore the old depth-based pressure for Hydrogen.

`/?effects` in web development opens an animation lab using the actual components, with atoms, targeting overlays and a void-crossing beam. Visuals need checking composed at phone size, not just in the old static SVG sheet. Web and safe-area packages were installed using Expo's SDK-matched installer. See PLAYABILITY_REPORT.md for checks and simulation results.

## Chemistry Catalogue (September 23, 2026)

Main menu now has Chemistry Catalogue. It covers the 13 elements in the game, with real chemistry, ability connections, live mechanical descriptions, creative liberties and source links. Educational data is in `src/content/chemistry.ts`; UI is `src/ui/screens/CatalogueScreen.tsx`. Selection is local browsing state, never an element-selection shortcut for normal runs. Preserve the distinction between scientific facts and game metaphors. Halogens have an interactive single-covalent-bond illustration; hydrogen bonding is explicitly distinguished from covalent bonding. Content works offline, references need a browser connection.
