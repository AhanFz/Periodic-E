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
when you press *End turn*. The two checkboxes above the buttons show what you have left.

**Ramming.** Walk into an enemy to attack it: it takes 2 damage, you take 1, and you stay where you were.
Every element can do this. Frozen enemies shatter for free. Ramming a Fluorine defuses it. Ramming Bromine
locks your abilities for the next turn.

**Photons (🔆)** are the currency. You start with 2, get 1 per kill (2 for a molecule), and can pick up loose
ones on the board, up to 5. Tier-1 abilities cost 1, tier-3 abilities cost 3.

**The isotope hut** sells: *Evolve* (price drops by 1 for every kill on the current grid), *Heal*, and two
permanent catalysts (+2 max health, or +1 damage to abilities and rams).

**Noble gases** (Helium, Neon) are on a timer: reach the hatch within `grid size + 3` turns or start losing
health each turn.

### The elements

| | Tier 1 (1 🔆) | Tier 3 (3 🔆) |
|---|---|---|
| **H** Hydrogen (3 HP) | **Hydrogen Bond** — tether an adjacent enemy for 2 turns; it trails behind you and cannot act | **Double Dash** — dash 2 tiles, 3 damage to everything you pass through, none to you |
| **He** Helium (5) | **Freeze** the 4 tiles around you for 2 turns | **Deep Freeze** all 8 neighbours for 3 rounds |
| **Li** Lithium (4) | **Paralysis Ray** down a line; kills anything already paralyzed | **Burst** — 3 damage down a line |
| **Be** Beryllium (5) | **Shield** +2; ramming is free while it holds | **Inert Shield** +3, free ramming, poison immunity |
| **B** Boron (6) | **Dopant Trap** under your feet; paralyzes and suppresses the next enemy to step on it | **Encase** an adjacent enemy in glass; **Shatter** it for free later |
| **C** Carbon (7) | **Graphene Sheet** — bridge over void or off an edge; collapses in 3 turns | **Diamond Spear** — 3 damage per hit, range 4; throw it for free, pick it up, throw again |
| **N** Nitrogen (6) | **Blast** 2 tiles in a line, scorching them | **Blast 4** — all 4 neighbours |
| **O** Oxygen (6) | **Heal** 1 | **Ozone Layer** — 3 damage to all 8 neighbours, then 2 damage in a star two tiles out |
| **Ne** Neon (8) | **Blinding Flash** — neighbours flee for 2 rounds | **All-Out Flash** — 1 damage to every enemy and freeze them |

### The halogens

| | HP | Behaviour |
|---|---|---|
| **F** Fluorine | 2 | Arms when next to you (💣), explodes the following turn for 2. Ram it before it goes off. |
| **Cl** Chlorine | 3 | Channels (⚠️ tiles), then releases poison (☠️). Standing in poison costs 1 a turn for 2 turns. |
| **Br** Bromine | 3 | Liquid. Any contact locks your abilities for a turn. Resists Lithium's ray. |
| **I** Iodine | 4 | Vanishes for a turn (❓ marks where it was), paying 1 health each time. |

Two adjacent halogens of the same type **bond** (🔗) into a molecule: double health, double payout, nastier
ability. From grid 3, some grids have a **polarised field**: the figure shows `🧲 shift ↑ in 3`; when it hits 0
everything slides — you one way, halogens the other.

---

## What to test

Play at least three runs starting as Hydrogen, then try a few elements from the *Table of contents*.
We would especially like to hear about:

- **Clarity.** Was it obvious what a button would do? Did any message leave you unsure what just happened?
- **The two-action turn.** Did "move + ability, either order" feel natural? Did you ever end a turn by accident?
- **Ramming.** Does it feel worth doing? Which elements did you ram with most?
- **Reaching the hut.** How often could you afford to evolve? Which element felt stuck?
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

Built on **Expo SDK 57** (React Native 0.86, React 19.2.3, TypeScript 6).

```
src/game/      pure game logic, no React imports — headlessly testable
  constants.ts  data tables and tuning numbers
  grid.ts       procedural layouts + flood-fill validation
  engine.ts     the Game class: rules, ramming, abilities, enemies, bonding, polarity, hut
  view.ts       per-tile render data
src/store/     zustand store: screen routing, async Iodine confirm, hut modal
src/ui/        theme, components, screens (textbook presentation)
sim/           headless simulator: worked-example scenarios, random and goal-seeking play, invariants
```

```bash
npm run typecheck          # tsc --noEmit
npm run sim                # scenarios + 1200 simulated games with invariant checks + noble-gas probe
npx expo export --platform android --output-dir /tmp/check --clear   # confirm it bundles
```

Notes:

- There is deliberately **no `babel.config.js`** — SDK 57 supplies `babel-preset-expo` through its own Metro
  config, and a stray root babel config breaks bundling.
- If you upgrade the SDK, run `npx expo install --fix` to realign every dependency rather than bumping
  versions by hand.
- Core `Animated` is used for all motion so the game runs in Expo Go with no native config. Emoji stand in
  for icons and FX.
- Balance, from the simulator: Hydrogen is the weakest element (3 HP makes ramming expensive), Nitrogen the
  strongest (3-damage blasts for 1 photon), and Lithium's Burst is overpriced at 3 photons. Tuning numbers
  live in `src/game/constants.ts`.
