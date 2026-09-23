# Playability verification — September 22, 2026

All edits are confined to `element evolution v2 - chatgpt`; no commit, push or mirroring to the original project.

## Changes

- Compact safe-area header, fitted board, fixed controls, landscape arrangement, Details sheet.
- Optional long-press previews; ordinary moves/abilities are single tap, following the user's correction. Aimed abilities still have direction + Fire. Existing automatic completion after both action slots is preserved.
- Recorded attack/impact/response/status beats; cancellable playback, blocked rapid input, reduced-motion support.
- Cohesive lava, frost, poison and lightning, reviewed with actual atoms and targeting.
- Freeze cancels prepared Fluorine/Chlorine attacks; shared freeze semantics across sources.
- Per-element population limits and slower Hydrogen reinforcements. Bonded atoms count separately for spawning without changing bonding itself.

## Verification

TypeScript checking, Android export, full simulator, tutorial store tests and asynchronous playback store tests passed. The simulator includes 306 tutorial scenarios and 1,836 previews checked for mutation and RNG consumption. Targeted cases cover Freeze against both loaded specials at both tiers, Exothermic threshold crossing during a ram, hidden-enemy preview redaction, caps and presentation parity.

Browser visual checks used the production components at 320×568, 375×667 and 667×375. The composed effects lab was checked during the lightning flash and with targeting over lava/poison/frozen atoms. Native Expo Go touch feel, haptics and frame rate still need a device playtest; browser rendering is not proof of native performance.

## Balance observations

Before this pass, the goal-seeking policy evolved from Hydrogen in 5/67 starts; after the change it evolved in 26/67 in the first run and 31/67 in the final run. These are independent stochastic samples, not a seeded controlled experiment. The policy starts with different elements across its suite, so the overall win rates below are **not** Hydrogen-only full-campaign completion rates.

There is no clear dominant ligand from these small, low-win samples. Supercooled has the highest final sample win rate, while Passivation and Exothermic raise kill counts. Fractional's discounted evolution remains important; Exothermic's ram share is 71% versus 68% with none in the final sample. Treat these as diagnostic signals and continue with human playtesting.

```text
=== ligand comparison (goal-seeking policy, 600 games each) ===
  configuration             wins    win%   avg kills   deepest   ram kills   by ram
  no ligand                    6    1.0%        4.72      2.10        1926      68%
  Passivation Layer            7    1.2%        6.32      1.91        2662      70%
  Supercooled Core            14    2.3%        5.64      3.04        2190      65%
  Fractional Distillation     12    2.0%        5.00      2.29        1988      66%
  Exothermic Edge              8    1.3%        6.30      2.33        2700      71%

  kills by element (the element that scored them):
  configuration              hydr   heli   lith   bery   boro   carb   nitr   oxyg   neon
  no ligand                    74    186    256    515    227    231    478    543    322
  Passivation Layer           106    176    402    860    311    355    587    626    367
  Supercooled Core             73    163    303    692    265    315    656    573    342
  Fractional Distillation      71    143    278    574    243    283    523    584    302
  Exothermic Edge              77    175    300    779    352    382    602    704    409

  Supercooled Core saved 508 runs of 600.
```

## Semantics to preserve

- Previews stop before enemy responses; they cannot promise safety after End turn.
- Exothermic can activate because the ram's own self-damage crosses its threshold.
- Freeze cancels a loaded special; it does not merely postpone it until thawing.
- Freeze does not undo poison/explosion damage already resolved.
- A previously queued explosion loop rechecks Freeze, because Supercooled can freeze another armed enemy during the same phase.
- Reinforcement caps count atoms, not molecule entities. The refill floor is separate from the timed arrival interval.
