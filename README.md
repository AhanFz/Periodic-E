# Element Evolution

A turn-based chemistry roguelike for your phone. You start as Hydrogen, fight halogens on a grid,
spend the photons you earn on evolving up the periodic table, and try to escape as Neon without dying.

This is a **play-test build**. Please play a few runs and tell us what felt confusing, unfair, or broken —
see [What to test](#what-to-test) and [Reporting a bug](#reporting-a-bug) below.

---

## Play-testing it on your phone

You need three things: **Node.js**, the **Expo Go** app on your phone, and this repository.

1. **Install Node.js 20.19 or newer** — https://nodejs.org (the LTS download is fine).
   Check with `node --version`.
2. **Install Expo Go on your phone** — search "Expo Go" in the App Store (iOS) or Play Store (Android).
3. **Get the code** — either `git clone <this repo's URL>` or download it as a ZIP from GitHub and unzip it.
4. **Start it** — in a terminal, inside the project folder:

   ```bash
   npm install
   npx expo start
   ```

5. **Open it on your phone.** A QR code appears in the terminal.
   - **Android:** open Expo Go and tap *Scan QR code*.
   - **iPhone:** open the normal Camera app, point it at the QR code, tap the banner.

   Your phone and computer must be on the **same Wi-Fi network**. The game loads in a few seconds.

### If it doesn't load

| Problem | Fix |
|---|---|
| Phone and computer are on different networks (or the Wi-Fi blocks devices from seeing each other) | Stop the server (Ctrl-C) and run `npx expo start --tunnel`. It will offer to install a small helper the first time; say yes. |
| "Something went wrong" on the phone, or a stale screen | Shake the phone → *Reload*. Or restart the server with `npx expo start --clear`. |
| Node version error, or `Cannot find module 'babel-preset-expo'` | Make sure `node --version` is 20.19+, and that there is **no** `babel.config.js` in the project (Expo SDK 57 supplies its own). |
| No QR code / port already in use | `npx expo start --port 8082`. |

No simulator, Xcode or Android Studio is needed — Expo Go runs the game directly.

---

## How to play

**Goal.** Reach the escape hatch (🚪) on each grid. Along the way, visit the isotope hut (⚗️) to evolve
into the next element. Escaping the hatch as **Neon** wins the run. Running out of health ends it.

**Each turn you get one move and one ability, in either order.** The turn ends when both are spent, or
when you press *End turn*. The two checkboxes above the buttons show what you have left. You can also
spend nothing at all: the same button reads *Skip turn* until you act, and waiting is often the right
move against a Fluorine that has armed.

**The tile you arrive on is ringed in blue** for the first turn of every grid, including a grid you have
just dropped into through the hatch. After that turn the board goes back to normal.

**Ramming.** Walk into an enemy to attack it: it takes 2 damage, you take 1, and you stay where you were.
Every element can do this. Frozen enemies shatter for free. Ramming a Fluorine defuses it. Ramming Bromine
locks your abilities for the next turn.

**Photons (🔆)** are the currency. You start with 2, get 1 per kill (2 for a molecule), and can pick up loose
ones on the board, up to 5. Tier-1 abilities cost 1, tier-3 abilities cost 3, and the price is printed on
each button. Lithium is the one element that makes photons rather than only spending them.

**Health comes from atomic weight.** A heavier nucleus is more matter to knock apart, so every evolution up
the table is also a bigger health bar, from Hydrogen's 4 to Neon's 10. Evolving refills it.

**Hold any atom on the board** — yours or a halogen's — for a card with its readings, what it does, the tell
that says what it is about to do, and how to beat it. It costs no turn.

**Pause (⏸, top right)** shows where the run stands and offers Resume, Restart, or Quit to contents.

**The phone buzzes** with what happens: a thump when you ram, a heavier one when you take damage, a rising
three-beat when you evolve. Devices without a haptic engine simply stay quiet.

**The isotope hut** sells: *Evolve* (price drops by 1 for every kill on the current grid), *Heal*, and two
permanent catalysts (+2 max health, or +1 damage to abilities and rams).

**Noble gases** (Helium, Neon) are on a timer: reach the hatch within `grid size + 3` turns or start losing
health each turn.

### Ligands and quanta

A **ligand** binds to your element and changes how it behaves for a whole run. You carry exactly
one, chosen on the contents page before you begin, and it cannot be swapped mid-run. Keep it clear
in your head from a catalyst:

| | Catalyst | Ligand |
|---|---|---|
| Acquired | Bought in the isotope hut, mid-run | Equipped in the menu, before the run |
| Cost | Photons, earned and spent inside one run | Quanta, carried across runs |
| Effect | Flat and permanent: +2 max health, +1 damage | Conditional: it waits for a situation and fires |
| Scope | The rest of the run | The whole run, from turn one |

| Ligand | Price | What it does |
|---|---|---|
| **Passivation Layer** | 40 | The first time on each grid that damage drops you to 2 health or less, gain 2 shield. It reads the moment you *cross* into that state, so sitting at 2 does not keep re-arming it. |
| **Supercooled Core** | 60 | Once per run, a killing blow leaves you at 1 health instead and freezes every neighbour for 2 turns. It will not save you from destabilising. |
| **Fractional Distillation** | 50 | Everything is 1 photon cheaper during your first visit to each grid's hut, evolution included. Later visits to the same hut are full price. |
| **Exothermic Edge** | 45 | While your health is down to a third of its maximum or less, your rams deal 3 damage instead of 2. You still take 1. |

**Quanta** are the cross-run currency, written with a ⬢ so it never reads as a photon. They are
earned by finishing a run: 10 for escaping as Neon. Losing pays nothing for now. Photons stay inside
a run; quanta are the only thing that crosses between them.

### The elements

Health is `4 + ⌊mass ÷ 3⌋`, so it is the atomic weight that decides how much punishment an element takes.

| | Mass | HP | Tier 1 | Tier 3 |
|---|---|---|---|---|
| **H** Hydrogen | 1.008 | 4 | **Hydrogen Bond** (1 🔆) — tether an adjacent enemy for 2 turns; it trails behind you and cannot act | **Double Dash** (3 🔆) — dash 2 tiles, 3 damage to everything you pass through, none to you |
| **He** Helium | 4.003 | 5 | **Freeze** (1 🔆) the 4 tiles around you for 2 turns | **Deep Freeze** (3 🔆) all 8 neighbours for 3 rounds |
| **Li** Lithium | 6.94 | 6 | **Battery** (1 🔆) — charge for 3 turns, counting the one you start it in; take no damage and it discharges for 4 photons, take a hit and it shorts out | **Ion Beam** (3 🔆) — 2 damage and paralysis to everything in one direction, straight across voids to the far edge |
| **Be** Beryllium | 9.012 | 7 | **Shield** (1 🔆) +2; ramming is free while it holds | **Inert Shield** (3 🔆) +3, free ramming, poison immunity |
| **B** Boron | 10.81 | 7 | **Dopant Trap** (1 🔆) under your feet; burns the next enemy to step on it for 1, then paralyzes and suppresses it | **Encase** (3 🔆) an adjacent enemy in glass; **Shatter** it for free later |
| **C** Carbon | 12.011 | 8 | **Graphene Sheet** (1 🔆) — bridge over void or off an edge; collapses in 3 turns | **Diamond Spear** (3 🔆) — 3 damage per hit, range 4; throw it for free, pick it up, throw again |
| **N** Nitrogen | 14.007 | 8 | **Blast** (1 🔆) 2 tiles in a line, scorching them | **Blast 4** (3 🔆) — all 4 neighbours |
| **O** Oxygen | 15.999 | 9 | **Heal** (1 🔆) 1 | **Ozone Layer** (3 🔆) — 3 damage to all 8 neighbours, then 2 damage in a star two tiles out |
| **Ne** Neon | 20.180 | 10 | **Blinding Flash** (1 🔆) — neighbours flee for 2 rounds | **All-Out Flash** (3 🔆) — 1 damage to every enemy and freeze them |

### The halogens

| | HP | Behaviour |
|---|---|---|
| **F** Fluorine | 2 | Arms when next to you (💣), explodes the following turn for 2. Ram it before it goes off. |
| **Cl** Chlorine | 3 | Channels (⚠️ tiles, thin haze), then releases poison (churning purple gas). Standing in poison costs 1 a turn for 2 turns. |
| **Br** Bromine | 3 | Liquid. Any contact locks your abilities for a turn. Resists Lithium's ray. |
| **I** Iodine | 4 | Vanishes for a turn (❓ marks where it was), paying 1 health each time. |

Two adjacent halogens of the same type **bond** (🔗) into a molecule: double health, double payout, nastier
ability. From grid 3, some grids have a **polarised field**: the figure shows `🧲 shift ↑ in 3`; when it hits 0
everything slides — you one way, halogens the other.

---

## What to test

Play at least three runs starting as Hydrogen, then try a few elements in the *Playable tutorial*.
We would especially like to hear about:

- **Clarity.** Was it obvious what a button would do? Did any message leave you unsure what just happened?
- **The two-action turn.** Did "move + ability, either order" feel natural? Did you ever end a turn by accident?
- **Ramming.** Does it feel worth doing? Which elements did you ram with most?
- **Reaching the hut.** How often could you afford to evolve? Which element felt stuck? Hydrogen and Boron
  were both cheapened this build, so tell us whether the early table still drags.
- **Lithium's Battery.** Is three turns of staying untouched a real decision, or do you either always take
  it or never bother? Did you ever charge it and immediately regret it? Does the countdown in the ability
  box match what you expect the turn you start it?
- **Health from atomic weight.** Every element now has more health than before, growing as you climb.
  Does the extra padding make fights feel readable, or does it just make them longer?
- **The atom cards.** Did you find them without being told? Did the *Counter* line tell you something
  the board did not already say?
- **Haptics.** Right amount, too much, or too little? Tell us your phone model — the buzz differs a lot
  between iPhones and Android handsets.
- **Difficulty.** Which halogen killed you most? Did anything feel unfair rather than hard?
- **The board.** Could you read the tiles, the electron rings and the status icons at a glance? Any layout
  problems on your phone size?
- **Anything that looks like a bug**: a button that does nothing, an enemy in a wall, a turn that never ends,
  a crash.

## Reporting a bug

Open an issue on this repository's **Issues** tab (there is a template). Please include:

1. Your phone model and whether it is iOS or Android.
2. Which element you were and which grid number (both are at the top of the screen).
3. What you did, step by step, and what you expected to happen.
4. What happened instead. A screenshot helps a lot — the message box under the stats usually explains
   the game's view of events.

General feedback ("Lithium feels useless", "the timer is too tight") is just as welcome as bugs.

---

## For developers

Built on **Expo SDK 57** (React Native 0.86, React 19.2.3, TypeScript 6). The only native module is
`expo-haptics`, which Expo Go already carries — no dev build needed.

```
src/game/      pure game logic, no React imports — headlessly testable
  constants.ts  data tables and tuning numbers
  grid.ts       procedural layouts + flood-fill validation
  engine.ts     the Game class: rules, ramming, abilities, enemies, bonding, polarity, hut
  view.ts       per-tile render data
src/store/     zustand store: screen routing, async Iodine confirm, hut modal, pause, inspection
src/ui/        theme, components, screens (textbook presentation)
  haptics.ts    turns the engine's cues into device feedback
sim/           headless simulator: worked-example scenarios, random and goal-seeking play, invariants
```

```bash
npm run typecheck          # tsc --noEmit
npm run sim                # scenarios + 1200 simulated games with invariant checks + noble-gas probe
npm run preview            # renders the drawn tile effects to .preview/ so they can be looked at
npx expo export --platform android --output-dir /tmp/check --clear   # confirm it bundles
```

Notes:

- There is deliberately **no `babel.config.js`** — SDK 57 supplies `babel-preset-expo` through its own Metro
  config, and a stray root babel config breaks bundling.
- If you upgrade the SDK, run `npx expo install --fix` to realign every dependency rather than bumping
  versions by hand.
- Core `Animated` is used for all motion so the game runs in Expo Go with no native config. Emoji stand in
  for icons and FX.
- **Hazards are drawn, not lettered.** Scorched ground, poison, ice and electrical discharges used to
  be a tint plus an emoji in the tile corner, which read as a label rather than as terrain. They are
  now `ScorchedGround`, `PoisonCloud`, `FrostCrystals` and `BoltStreak`, drawn with `react-native-svg`
  (bundled in Expo Go, so no development build is needed) as real polygons, paths and gradients.
  Shapes are seeded from the tile's coordinates through `src/ui/seed.ts`, so a given tile keeps its
  own cracks and its own cloud instead of reshuffling on every render. Where a drawn effect replaces
  an icon, `Tile` drops the icon, so a tile never says the same thing twice in two visual languages.
- **Geometry lives apart from the components.** `src/ui/shapes.ts` holds the maths with no React and
  no react-native imports, which is what makes `npm run preview` possible: it renders the same
  functions the game uses into `.preview/effects.svg`, rasterises it with `qlmanage`, and shows every
  effect at both phone size and 3x. Tuning these by guessing at component code and reloading a phone
  is how the first attempt ended up with lava that looked like orange lightning. Look at the sheet.
- **Two ordering rules learned the hard way.** The scorched tile draws rock *over* a lava bed, so the
  glow is the seam between slabs; bright strokes on a dark tile read as lightning, not as ground. Its
  pulse is a third layer *between* bed and slabs, so the slabs mask it everywhere except the gaps and
  it can still animate on the native driver.
- Voids are drawn as holes in the page rather than shaded paper: near-black, with a few slow-twinkling
  points of light whose positions are hashed from the tile's own coordinates, so a given hole keeps its
  constellation instead of reshuffling on each render.
- `Game.showStartMarker` is true only during a grid's first turn, which is what the blue ring reads from.
  It deliberately does not key off `turnsOnGrid`, because evolving resets that counter for the noble-gas
  timer and the ring would reappear in the middle of a grid.
- Tuning numbers live in `src/game/constants.ts`. Max health is not a table any more: it is derived from
  `ATOMIC_MASS` through `healthForMass`, so moving `BASE_HEALTH` or `AMU_PER_HEALTH` moves every element at
  once, and a simulator scenario pins the resulting curve and checks it never falls as you evolve.
- Balance, from the simulator (600 goal-seeking games per configuration). Hydrogen was the problem child:
  at 3 HP it could not afford the two rams its kit assumes, and it scored a kill in 21% of its games. A
  floor of 4 takes that to 67% and roughly doubles total evolutions across the run set, while the win rate
  stays inside its noise band. Lithium's Burst went to 2 photons, Hydrogen's evolve price to 3 and Boron's
  to 5; all three now evolve an order of magnitude more often. Nitrogen is still the strongest element and
  is left alone deliberately: pricing its Blast at 2 photons cut total evolutions by a quarter, because
  Nitrogen is the payoff on the way to Oxygen and Neon.
- Lithium was rebuilt because a 2-photon Burst made its Paralysis Ray pointless: the expensive ability did
  strictly more, including the paralysis. It is now an economy element. *Battery* spends a photon to charge
  and pays 4 back if nothing touches you, which turns Lithium's weak offence into a reason to kite;
  *Ion Beam* is the line attack, at 3 photons, and it is the only thing in the game that fires across a
  void. In the simulator Lithium went from evolving twice per 120 games to roughly 17, and both abilities
  now see use rather than one shadowing the other.
- The battery's window is counted in turn-ends, and the turn you start it in is the first of them. Charging
  is an ability, so on a turn you have already moved it ends the turn immediately; treating that as a full
  turn of charge made the cell pay out after what felt like one turn. Widening the window to three cost
  Lithium real power, and the payout went from 3 to 4 to buy some of it back. It cannot go much higher:
  with a photon store of 5, and 1 spent to charge, anything above 4 is mostly spilled. Note also that the
  simulator's policy charges and then walks straight back into a fight, so it under-sells the ability by
  design — trust play-testing over the numbers here.
- **Storage boundary.** `src/persistence/profile.ts` is the only file that touches AsyncStorage, and
  nothing under `src/game/` imports it. The engine is handed an equipped ligand id in its constructor
  and knows nothing about where it came from, which is what keeps it loadable by the headless
  simulator. The quanta award is banked in the zustand store as a run ends, not in the engine.
- **Profile schema.** One versioned record under a single key, with `schemaVersion` starting at 1.
  `migrate()` rebuilds it field by field: anything missing, mistyped or unrecognised falls back to its
  default instead of throwing, and an unknown ligand id is dropped rather than treated as an error, so
  removing a ligand in a later version cannot brick an existing save. `loadProfile()` never rejects, so
  corrupt storage yields a fresh profile and the app carries on. Writes are debounced and coalesced.
- **Ligand triggers** live on the engine as explicit state: `passivationUsedThisGrid` and
  `hutVisitsThisGrid` reset in `enterGrid`, `supercooledUsedThisRun` only on construction. Every point
  of player damage goes through `damagePlayer(amount, source)`, one choke point, which is where both
  intercepting ligands are handled and where the ordering is decided: shields absorb, health falls, a
  save can intervene, then Passivation reads the transition. Passivation applies after the blow, so it
  can never prevent the blow that triggered it.
- **Why Passivation tests an edge and not a threshold.** A plain `health <= 2` test re-arms every time
  the granted shield absorbs a hit and lets health settle back on the threshold, which is an
  unkillable loop rather than a ligand. It compares health before and after the damage and fires only
  on a crossing. A simulator scenario clears the once-per-grid flag and rams six more times to prove
  the edge test alone holds the line.
- Physical feedback is a two-layer thing: `src/game/engine.ts` records *what happened* as `hapticCues`,
  and `src/ui/haptics.ts` decides which buzz that is, playing only the most significant cue per action.
  The engine stays free of React and of Expo; the simulator never drains the queue, so it is capped.


### Playable tutorial

Normal runs always start as Hydrogen. Choose **Playable tutorial** on the main menu to borrow any
of the nine elements and any one ligand (or none), including ones you have not bought. Practice
never grants quanta, changes ownership/equipment or records a win/loss.

Guided rooms teach moving and collecting photons, skipping a full turn, ramming, both abilities,
your chosen ligand, and using the hatch. Targets and resources are prepared for your chosen kit.
Battery demonstrates its full countdown; Boron demonstrates trap damage and shattering; Carbon
practises bridging and throwing a forged spear. No reinforcements or noble-gas deadlines apply in
practice, but damage still does. Reset any lesson or choose different equipment without penalty.

Tutorial checks are included in `npm run sim` (306 lesson/equipment scenarios). Run
`node tools/test-tutorial-store.cjs` to check practice/profile isolation and normal Hydrogen starts.
This working copy is independent: edit only `element evolution v2 - chatgpt`, not either original.


## Phone playability and combat presentation

The game screen has a compact safe-area header, a board sized to the remaining space, and a fixed control area. In landscape the controls sit beside the board. Long instructions and full stats are under **Details**; the current tutorial instruction remains beside the controls. At unusually large text sizes the control area can scroll without moving the board off-screen.

Tap a direction or ability to act immediately. There is no extra confirmation for ordinary actions. Hold a direction, immediate ability, or aimed Fire/Curve button for an optional preview; **Back to controls** dismisses it without spending anything. Aimed abilities still require a direction and Fire. The existing hidden-Iodine warning remains. One End/Skip turn button passes unused actions; using both slots still ends the turn automatically.

Previews fork the engine, resolve only immediate player effects, and stop before enemy responses or a new grid is generated. They never consume random state or change the live game. They report outgoing damage/statuses, health/shield changes, photons and turn completion. Exothermic is evaluated after ram self-damage, exactly as in combat. Hidden enemies are not identified by previews, and their presence makes the displayed outcome incomplete.

Combat resolves once in the pure engine. An optional observer records copies for attack, damage, enemy response and status beats; the store plays those copies in order, then publishes the result and any rewards. Inputs are blocked during playback. Finish animation, pausing or backgrounding the app safely settles it. Resetting/returning to the menu cancels obsolete timers. System Reduce Motion bypasses playback and stops ambient animations.

Lava uses seeded irregular basalt fractures, ice uses quieter edge crystals, poison uses drifting translucent clouds with dashed warning borders, and lightning has an amber core with contrasting outlines. Atom backplates and topmost gold targeting borders keep symbols readable. For composed animation review, run the web preview and open `/?effects` in a development build: it uses the actual Board/Tile/Atom components, includes a void-crossing beam, and has targeting and reduced-motion controls. The old static SVG sheet is only a geometry diagnostic, not animation acceptance testing.

### Freeze and early progression

Freeze cancels armed Fluorine explosions and Chlorine poison telegraphs. A thawed enemy must prepare again. This rule is shared by Helium, Neon and Supercooled Core. Already-existing damage is not reversed.

| Element | Starting enemies | Refill floor | Spawn cap | Additional spawn interval |
| --- | ---: | ---: | ---: | ---: |
| Hydrogen | 1 | 1 | 2 | 6 turns |
| Helium | 2 | 2 | 3 | 5 turns |
| Lithium | 2 | 2 | 4 | 4 turns |
| Beryllium | 2 | 3 | 4 | 4 turns |
| Boron / Carbon | 2 | 3 | 5 | 4 turns |
| Nitrogen / Oxygen / Neon | 2 | 4 | 6 | 4 turns |

The refill floor can cause one arrival each turn until restored; the cap always applies. Spawn checks count bonded enemies as two atoms, so splitting a bond cannot bypass the cap. Evolving changes the pressure settings immediately. Photon generation, the photon cap, evolution prices, bonding rules and grid generation are unchanged.

Additional checks: `node tools/test-tutorial-store.cjs` and `node tools/test-playback-store.cjs`. `npm run sim` now includes 1,836 preview-purity cases, loaded-attack Freeze cases, Exothermic ordering and population caps, in addition to the existing tutorial and combat scenarios.

## Chemistry Catalogue

The main menu's **Chemistry Catalogue** contains all nine playable elements and four halogens. Each selectable entry separates real chemistry, the ability connection, current game mechanics and creative liberties. Mechanics are read from the game constants so costs and descriptions stay aligned with balance updates. Catalogue selection never starts a run or equips anything.

Halogen entries include a shared-electron-pair illustration for F₂, Cl₂, Br₂ and I₂, distinguishing covalent bonding from nuclear fusion. Other clarifications include hydrogen bonding versus H₂, cryogenic helium versus room-temperature gas, nitrogen compounds versus N₂, game poison colours versus real colours, and fictional health/evolution/noble-gas timers.

Educational copy lives in `src/content/chemistry.ts`, with per-element Royal Society of Chemistry references, an OpenStax bonding reference, and a Toshiba semiconductor reference for boron doping. Text is bundled for offline reading; optional source links open the browser. `CatalogueScreen` owns selection locally and supports Android back navigation. No persistence or engine rules are changed by browsing.
