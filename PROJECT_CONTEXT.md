# Element Evolution — complete project handoff

Updated September 25, 2026. This describes the current ChatGPT working copy, including the latest UI changes. Use this as context for another coding assistant. The source code is authoritative if a future change makes a number here stale.

## Working directory and boundaries

Only modify `/Users/ahanfz/Desktop/element evolution v2 - chatgpt`.
The original `/Users/ahanfz/Desktop/element-evolution-v2` and the original GitHub-connected Periodic-E project must remain untouched. Do not copy changes back, publish, commit or push unless requested. The clone contains earlier uncommitted changes; do not reset them.

Keep `src/game/` pure: no React, React Native, Expo or storage imports. Only `src/persistence/profile.ts` accesses AsyncStorage. Quanta and profile updates belong in the store, never the engine. Keep one ligand slot, the five-photon cap, SDK 57 versions, and the existing catalyst system. Do not casually rewrite bonding, polarity or grid generation while fixing presentation.

## What the game is

A turn-based chemistry roguelike for phones, presented like an illustrated textbook. Start as Hydrogen, fight halogens, collect photons, evolve at the isotope hut, and traverse grids through escape hatches. Taking a hatch as Neon wins; running out of health loses.

Chemistry inspires the mechanics, but the game is not a literal chemistry simulation. The catalogue distinguishes scientific facts from creative liberties. Atomic mass informing health is a game-design metaphor.

## Stack and running the clone

Expo SDK 57, React Native 0.86, React 19.2.3, TypeScript 6, Zustand, AsyncStorage, react-native-svg, safe-area support, expo-haptics and expo-audio. Audio is SDK-matched `~57.0.5`. Install native dependencies using `npx expo install`, not manual version selection. Keep the existing Metro/Babel setup; do not add a Babel config without a demonstrated need.

From the clone:

```bash
npm install
npx expo start                    # scan the QR code using compatible Expo Go
npx expo start --web --port 8087   # browser preview
```

Fully reload Expo Go after updates when verifying a rendering fix. The previous browser preview address was `http://localhost:8087/`; check that its server is running from the clone. Browser success does not establish iPhone animation or audio correctness.

## Screens and user flow

- Main menu: begin a Hydrogen run, Continue when a normal run is saved, ligand shop, playable tutorial, Chemistry Catalogue.
- Normal runs always start as Hydrogen. The menu's equipped ligand is copied into the run and remains fixed.
- Tutorial setup: choose any of nine elements and any ligand, including none, regardless of ownership. No purchases, rewards or normal-run progress are affected.
- Tutorial lessons: move/collect, skip, ram, both abilities, equipped ligand where relevant, hatch. Rooms reset independently. Reinforcements and noble deadlines are disabled in practice.
- Chemistry Catalogue: all nine playable elements and four halogens; scientific background, ability inspiration, mechanical descriptions, creative liberties, reference links, and a single/diatomic bonding illustration. Browsing never changes the run's element.
- Pause: resume, sound on/off, haptics on/off, restart, Save & main menu (Leave tutorial in practice). Restart/new-run replacement is confirmed.
- Game over: outcome, award, evolution path, damage history, ligand activations and purchase history.

## Turn and combat rules

A turn provides one move and one ability action, in either order. Spending both automatically advances the enemy phase. End turn is always available; before any action it reads Skip turn. Do not require a move before allowing a skipped turn.

Ordinary control taps act immediately. Holding a control offers an optional immediate-action preview. Directional abilities still use aiming controls. Do not restore mandatory confirmations for every ordinary move/ability: the user rejected those as too slow. The unseen-danger movement confirmation is a separate existing safeguard.

Ramming means walking into an enemy; the player stays on their original tile, including on a kill.

- Base enemy damage: 2, or 3 while Exothermic Edge is active, plus damage catalysts.
- Normal self-damage: 1, subject to shield/damage rules.
- Paralyzed enemy: no self-damage or shield consumption; normal outgoing damage, not an instant kill.
- Frozen enemy: free instant shatter, distinct from paralysis.
- Beryllium with shield: free ram without consuming its shield for the ram cost.
- Rammed Fluorine is defused; Bromine can lock abilities on contact, including a player ram.

All player damage uses `damagePlayer(amount, source)`. Shields absorb first, then health loss, Supercooled interception, and Passivation's entering-state check. Preview projections must not change real state, consume random numbers, expose hidden enemies or record real history.

## Photons, evolution, hut and health

Photons are in-run energy, capped at 5. Start with 2. Credited single kills pay 1; molecules pay 2. Fluorine self-detonation does not award kill credit. Board pickups and Lithium's Battery also provide photons.

The green hut sells evolution, healing (2 photons for 2 HP), a health catalyst (3 photons for +2 max HP), and a damage catalyst (3 photons for +1 ability/ram damage). Catalysts last for the run. Each type is limited to three purchases per run (+6 purchased max HP, +3 purchased damage); old saves above this cap retain their bonuses but cannot purchase more.

Non-noble evolution costs `max(1, basePrice - stageKills)` before ligand discount. Stage kills reset on entering a grid and on evolution. Helium pays a flat base price. Fractional Distillation now saves at most one photon per grid, with a minimum purchase price of 1. The board header displays the current final evolution price, not the global turn number. Noble countdowns remain visible.

Evolution restores health and keeps `max(2, photons remaining after payment)`. Example: five photons minus a one-photon evolution leaves four, not two. Base prices are listed below.

While standing on the hut, Open hut reopens the shop without movement or action cost. Reopening is the same visit, so it neither increments visits nor renews the discount. Leaving and returning is a new visit.

Base max HP is `4 + floor(atomicMass / 3)`; health catalysts add to it. Evolution may keep the same base HP at some steps, but never reduces it.

## Playable elements

All current first abilities cost 1 photon and second abilities cost 3. Read per-element `ability1Cost`/`ability2Cost` rather than hardcoding this assumption.

| Element | Base HP | Base evolve cost | First ability | Second ability |
|---|---:|---:|---|---|
| Hydrogen | 4 | 3 | Bond: adjacent enemy tethered for 3 turns, follows the tiles you leave | Dash: two tiles, 3 damage, no self-damage; uses movement too |
| Helium | 5 | 2 | Freeze cardinal neighbours for 2 turns | Freeze all eight neighbours for 3 turns |
| Lithium | 6 | 5 | Battery: charge across 3 turn endings, including activation turn; payout 4 photons, capped at 5 | Ion Beam: 2 damage plus paralysis along a direction across voids; Bromine resists |
| Beryllium | 7 | 5 | Raise shield to at least 2 | Raise shield to at least 3 and gain poison immunity |
| Boron | 7 | 5 | Trap on current tile: 1 damage and paralysis; max 2 traps | Encase an adjacent enemy; max 2; shatter or wait for its burst |
| Carbon | 8 | 6 | Graphene bridge over void/off edge; collapses after 3 turns | Forge spear: range 4, 3 damage per target, durability 4, costs 2 durability per hit |
| Nitrogen | 8 | 6 | Blast two tiles in a line for 3 damage and scorch | Blast all four adjacent tiles |
| Oxygen | 9 | 6 | Heal 1 HP | Ozone: 3 damage to eight neighbours, then delayed 2 damage farther out |
| Neon | 10 | — | Nearby enemies flee; breaks bonds | Global 1 damage and freeze |

Battery timing is based on end turns, not separately on movement and ability use. Actual HP loss shorts it. The current payout is **4**, superseding the original requested +3. Its message and collection FX respect the photon cap.

Carbon can forge and throw in the same turn, including after moving. Forging spends photons but not the ability action; throwing spends the ability action but no more photons. A surviving grounded spear can be recovered. Shatter for Boron costs no photons but uses the ability action.

Freeze cancels already-loaded Fluorine and Chlorine attacks. Helium, Neon and Supercooled use the shared freeze helper.

Helium and Neon have a deadline of grid size + 3 turns, followed by one destabilisation damage per turn. Supercooled cannot save against this source.

## Halogens, navigation and grids

| Halogen | Base HP | Behaviour |
|---|---:|---|
| Fluorine | 2 | Arms nearby, detonates the following turn for 2 damage. Ram to defuse. |
| Chlorine | 3 | Telegraphs poison, then releases it. Shapes cycle through diagonals, cardinals and a line. |
| Bromine | 3 | Contact can lock abilities; resists electricity. Br₂ trails expire after 2 turn endings. |
| Iodine | 4 | Temporarily vanishes and keeps moving. Its last-known tile is marked; vanishing costs HP down to a floor of 1. |

Adjacent matching halogens can telegraph and form diatomic molecules, with two occupied tiles, doubled health/payout and changed attack coverage. Bond splitting remains part of Neon's kit. General halogen friendly fire is **not enabled**.

Navigation was fixed after a screenshot showed enemies trapped below a void stripe with an open left-column passage. The old planner only tried directly approaching the player. The new breadth-first search finds a shortest valid route, including temporarily moving away from the player. It checks the entire fixed-orientation molecule footprint, other enemies and scorched/impassable terrain. The player's tile remains a valid contact target. Frozen bodies remain obstacles.

The arrow is the next intended step. If obstructed before execution, the enemy waits and replans rather than making an unannounced replacement attack. Chlorine's preparation pauses, Fluorine arming, fleeing and disabling statuses still govern whether an enemy moves. No route means waiting. Molecules **do not rotate**; some narrow corridors genuinely cannot accommodate their current orientation.

Grid size rises from 5 to 7. Layouts include plain, void, split and eroded shapes. Flood-fill validates player reachability between start, hut and hatch, not navigability for every molecule orientation. Polarity can periodically shift player and enemies in opposite directions and cause crush damage.

Population pressure follows the current element; molecules count as two atoms for spawning:

| Element | Initial | Refill floor | Cap | Extra-spawn interval |
|---|---:|---:|---:|---:|
| H | 1 | 1 | 2 | 6 |
| He | 2 | 2 | 3 | 5 |
| Li | 2 | 2 | 4 | 4 |
| Be | 2 | 3 | 4 | 4 |
| B / C | 2 | 3 | 5 | 4 |
| N / O / Ne | 2 | 4 | 6 | 4 |

Do not restore the old depth-based pressure formula for Hydrogen.

## Ligands and persistent currency

Quanta (⬢) are persistent currency, separate from photons (🔆). A Neon hatch win awards **50 quanta**; ordinary grid escapes, losses and practice award none. There are no daily logins or missions.

Exactly one ligand can be equipped, or none. Purchasing also equips it. Equipping another replaces it. A continued run keeps its original ligand even if menu equipment changes.

| Ligand | Quanta | Effect |
|---|---:|---|
| Passivation Layer | 40 | Once per grid: crossing from above 2 HP to living HP at or below 2 grants 2 shield, additive |
| Supercooled Core | 60 | Once per run: lethal damage leaves 1 HP and freezes adjacent enemies for 2 turns, except destabilisation |
| Fractional Distillation | 50 | One eligible purchase during the first hut visit per grid is 1 photon cheaper; minimum price 1, including evolution |
| Exothermic Edge | 45 | At HP ≤ ceil(current max HP / 3), base ram damage is 3 instead of 2; catalysts add normally |

Exothermic's threshold is **one third**, not the original half. Passivation must test a transition, not repeatedly test low HP; otherwise it creates a shield loop. Supercooled must reset only on a new run. Fractional now saves **at most one photon per grid**. The first purchase with an actual saving consumes the discount; a purchase already costing 1 leaves it unused. Closing/reopening the hut does not renew it. Paid consecutive evolutions are still allowed.

## Persistence and recap

`src/persistence/profile.ts` is the only storage boundary. Profile schema version 1 contains:

```ts
interface Profile {
  schemaVersion: number;
  quanta: number;
  ownedLigands: LigandId[];
  equippedLigand: LigandId | null;
  runsWon: number;
  runsPlayed: number;
  bestTotalKills: number;
  deepestGrid: number;
}
```

Current key: `element-evolution/session/v1`. Envelope: `{ version: 1, profile, active }`. If absent, the legacy `element-evolution/profile/v1` profile is migrated. Malformed storage defaults safely; unknown ligand IDs are removed; invalid active snapshots do not crash loading. Future migrations must be explicit.

`src/game/runSave.ts` defines a version-2 snapshot with an explicit field validator. Restore rehydrates a Game prototype without running its constructor, generating a grid or consuming RNG. Transient FX and playback are excluded. Version-1 snapshots migrate; a previously visited hut conservatively marks its discount spent, while future grids get the new allowance. Update the field schema and round-trip tests when adding engine state.

The store checkpoints resolved actions **before** animation playback. Profile rewards and clearing the completed active run are written together, preventing reward duplication on resume. Writes are ordered, not per frame. Backgrounding flushes queued saves and retries failure; a save failure is visible in the UI. Only one active normal run is stored locally. Tutorial/catalogue do not overwrite it.

History stores the latest 12 damage events, 200 milestones and whole-run ligand counters. Game-over recap shows damage sources, HP/shield changes, evolution, purchases and triggers. History survives Continue, but there is no persistent completed-run archive.

## Current UI, effects and sound

Cream textbook styling, serif text, a compact header, fitted board, and control area below it (beside it in landscape). Details holds longer explanations. SVG lava, frost, electricity and poison effects use stable seeded geometry. Voids are dark with twinkling dots.

- Blue orbital portal = hatch; green reagent gate = hut. Board structures no longer use door/hut emojis as their art.
- Current player tile has a blue **YOU** marker. Spawn glow is only shown while still on the starting tile during the first turn; it disappears after leaving and does not reappear on evolution.
- Header shows evolution price and a contextual objective; noble countdown remains.
- Controls show Move/Ability ready or used, with a sentence describing remaining actions.
- **Ability buttons show only name and photon cost. Do not re-add “need X more”: the user explicitly requested its removal.**
- Photon particles travel to the measured counter; no collection flight when the cap prevents a gain.
- Evolution expands the atom; new electron counts settle into their orbits.
- Floating feedback shows HP loss and absorbed shield, with a shield ripple.
- Player rams lunge/rebound; visible halogen contact has a lunge/recoil. Fluorine detonations and Chlorine releases have wind-up beats.
- Playback uses snapshots of one resolved action, never re-executes the rules. Pause, backgrounding, reduced motion and Finish animation settle/cancel safely.
- Reduced motion disables travel/ambient motion, including electron-ring spin.
- Original synthesized WAV sounds cover movement, impact, freeze, evolution and photons. `expo-audio` plays them. Pause has a Sound toggle. Sounds stop on pause/background and respect iOS silent mode. Recording permissions are disabled. Sound/haptic settings are currently session-only.

### Important iPhone positioning issue

User screenshots showed atoms remaining below their actual cell, sometimes visually overlapping enemies while the YOU outline showed the correct location. The first native-animation positioning change **did not resolve it**.

Latest implementation in `MovingAtom.tsx`: a non-animated, non-flattened View owns the actual cell position; an inner **JS-driven** travel offset eases to zero over 240 ms. Contact/evolution transforms are separate. Mounts/resizes/interrupted moves reset travel offsets. This supersedes earlier all-native positioning descriptions.

Types, playback/save regressions and Android bundle export passed. Browser phone-size spawn/resize checks passed for an earlier positioning revision. **The latest iPhone fix remains unconfirmed on a physical device. Do not call it proven fixed or infer native success from Android export.** Fully reload Expo Go before retesting. No camera/screenshot capability gives the assistant direct native-device verification here.

## File map

- `src/game/constants.ts`: numbers, element/enemy/ligand definitions, pressure table.
- `src/game/engine.ts`: rules and pure presentation callbacks.
- `src/game/grid.ts`: layouts and flood-fill.
- `src/game/view.ts`: tile/atom presentation data.
- `src/game/actions.ts`: immediate non-mutating previews.
- `src/game/tutorial.ts`: deterministic rooms and completion rules.
- `src/game/history.ts`, `runSave.ts`: recap data and snapshots.
- `src/persistence/profile.ts`: profiles, migration, atomic session storage.
- `src/store/gameStore.ts`: screen routing, actions, snapshots, saves, rewards, settings.
- `src/content/chemistry.ts`: educational catalogue content.
- `src/ui/components/Board.tsx`, `Tile.tsx`, `MovingAtom.tsx`: board and actor rendering.
- `Portal.tsx`, `PhotonFlight.tsx`, `DamageFloat.tsx`, `ElectronRing.tsx`: presentation effects.
- `SoundEffects.tsx`, `assets/audio/`: sound playback and original audio assets.
- `src/ui/screens/`: menu, tutorial setup, catalogue, store, game, game-over, effect lab.
- `src/ui/shapes.ts`: pure geometry; no React Native imports.
- `sim/`: scenario, tutorial, presentation and multi-run tests.
- `tools/test-*.cjs`: store, save/resume and navigation regression scripts.

## Verification and balance interpretation

```bash
npx tsc --noEmit
npm run sim
node tools/test-balance.cjs         # economy, shield, fuse and snapshot migration
node tools/test-navigation.cjs      # requires the simulator compilation above
node tools/test-run-save.cjs
node tools/test-tutorial-store.cjs
node tools/test-playback-store.cjs
npx expo export --platform android --output-dir /tmp/element-check --clear
git diff --check
```

Use checks appropriate to the change; docs-only edits do not require a new game simulation. The simulator includes deterministic rules, 306 tutorial scenarios across 45 equipment choices, 1836 action-preview cases, random and goal-seeking suites, noble probes, and 600 games for each of five ligand configurations. Navigation regression reconstructs the user's 6×6 split-grid screenshot, including single/vertical-pair detours, frozen blockage, disconnected routes and a horizontal pair that cannot fit.

Do not present old stochastic tables as current measurements. Low win counts vary between runs; bots are not representative human players. Earlier tests motivated reducing Exothermic from half to one-third HP. Fractional accelerates evolution and Exothermic changes two-hit enemies to one-hit kills, so monitor both after navigation/balance changes. Smarter routes remove an exploit and may raise real difficulty; no compensating balance adjustment has been applied.

`/?effects` opens the web-only development effect lab. `npm run preview` makes a static SVG effect sheet, useful for art but insufficient to validate animation. Test small-screen controls, reduced motion, rapid input, pause/skip, background saves, Continue and audio on an actual phone.

## Known issues, limitations and proposed follow-ups

1. Latest iPhone cell-positioning fix needs physical-device confirmation.
2. Fixed September 25: paralysis/tether pause the Fluorine fuse; freeze cancels it. Actual Bond/trap abilities preserve the fuse; resumed explosions and shifted blast markers have regression coverage.
3. Fixed-orientation molecules cannot rotate into narrow corridors. This is a movement-rule limitation, not proof that route search failed.
4. Sound and haptic preferences are not persisted between launches.
5. Polarity arrival on a hut does not follow the usual visit-counting path. With Open hut now available while stationary, first-visit discount semantics deserve a regression test.
6. Earlier notes recorded an intermittent molecule-splitting/entity-cap concern. Current population accounting uses atoms and recent suites passed; treat the historical report as a reproduction candidate, not a confirmed current regression.
7. Fixed September 25: Beryllium raises shield to at least 2/3 and preserves existing poison immunity. It does not stack indefinitely.
8. Tap-to-inspect and plain-language enemy intent were suggested, not implemented; inspection remains long-press.
9. No general friendly fire, daily missions, multi-ligand slots, cloud sync or persistent recap archive has been added.

## Instructions for the next assistant

Read current code before editing; preserve user changes. Work only in the clone. Make requested changes directly without unnecessary confirmation for reversible local work. Keep updates clear and brief. Do not claim a bug is fixed merely because a build passed. Distinguish tested engine behaviour, browser observations and unverified native behaviour. Keep chemistry explanations honest about game metaphors. Update this handoff when behaviour changes instead of appending contradictory historical descriptions.

## September 25 balance review and future gamble

See BALANCE_REVIEW_2026-09-25.md for 24,000 seeded games across old/new pathing and economy variants, both mixed-start and Hydrogen/catalyst policies. Fractional remains strong; the new structural limits do not prove statistical parity. No blanket pathing compensation was added. A hut gamble costing at most 2 photons (photon/HP reward, HP loss, hidden post-Neon/Astatine-level key, or de-evolution) is recorded as a future discussion only, not implemented.
