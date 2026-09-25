# Balance review — September 25, 2026

Changes are in the ChatGPT clone only. This report replaces the old claim that Fractional had a one-photon-per-grid cap: that was an inaccurate explanation of the old implementation, not a cap subsequently removed. The old bot also never bought catalysts.

## Implemented rules

- Fractional: one actual one-photon discount during the first hut visit per grid; all prices at least 1. A purchase already costing 1 does not waste the unused discount. Evolution retains max(2, paid remainder); paid consecutive evolutions remain legal. Ligand price stays 50 quanta.
- Catalysts: three purchases of each type per run, maximum purchased bonuses +6 HP / +3 damage. This removes indefinite permanent-stat growth; it does not prohibit waiting or farming photons up to their existing cap.
- Beryllium: raise shield to at least 2/3, never reduce a stronger shield; weaker recasts preserve existing poison immunity.
- Fluorine: paralysis (including traps) and tether pause an armed fuse. The first enemy phase after all disabling effects expire detonates it. Freeze cancels; ramming still defuses. Blast markers follow a dragged/shifted armed enemy.
- Snapshot version 2 stores fractionalUsedThisGrid. Version-1 saves migrate; previously visited huts conservatively count the discount as spent. Old catalyst bonuses are retained, but further over-cap purchases are denied. Profile/session envelope versions stay 1.

## Method and limits

24,000 games: 4 variants × 2 policies × 5 ligand configurations × 600 games. Each run gets a fresh deterministic seed (9252026 + run index), shared across configurations. Limit: 600 action steps, not turns. Divergent decisions consume different random draws; these are reproducible scenario sets, not identical trajectories. Unfinished runs are reported, not counted as losses that actually occurred.
Variants isolate old greedy pathing, new pathing, economy-only changes, and the final economy/shield/fuse changes. The old greedy method is reconstructed exactly in the harness; the pre-change compiled engine/dependencies are archived with it.
The mixed-start evolution-first policy rotates across all nine elements and therefore is not a normal campaign win-rate estimate. The Hydrogen-only policy buys up to two damage catalysts and two health catalysts when affordable before evolution. Both use the final hut price for navigation. Neither policy is an optimal human or an unlimited stall farmer; deterministic stress tests establish purchase caps separately. Win counts are very low and cannot establish statistical dominance.

## Main conclusions

- Pathing alone reduced average deepest grid from 2.06 to 1.91 across mixed starts (about 7%), and from 4.11 to 3.43 for the Hydrogen/catalyst policy (about 16%). Wins changed from 55 to 45 out of 3,000 mixed games, but from 4 to 13 out of 3,000 Hydrogen games: difficulty is not a uniform win-rate shift.
- Fractional remains strong. On the current pathing, its economy-only nerf reduced mixed-start average kills from 5.54 to 5.30 and evolutions from 0.91 to 0.86; the Hydrogen bot instead improved from 10.29 to 10.42 kills. The final build reached 11.22 kills there, partly after the separate shield/fuse changes. The nerf enforces an economy ceiling but does not prove performance parity.
- No broad health/spawn compensation was added. The status and shield fixes already change survivability; use human playtests before applying another global balance shift.

## mixed starts / evolution-first

### old-path-old-balance

| Ligand | Wins / 600 | Win % | Avg kills | Avg deepest grid | Avg evolutions | Avg catalysts | Ram kills | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| no ligand | 9 | 1.50 | 4.61 | 1.98 | 0.47 | 0.00 | 1874 | 0 |
| Passivation Layer | 10 | 1.67 | 6.10 | 1.74 | 0.71 | 0.00 | 2588 | 0 |
| Supercooled Core | 12 | 2.00 | 5.50 | 2.78 | 0.60 | 0.00 | 2179 | 0 |
| Fractional Distillation | 10 | 1.67 | 5.07 | 1.77 | 0.77 | 0.00 | 2013 | 1 |
| Exothermic Edge | 14 | 2.33 | 6.55 | 2.03 | 0.72 | 0.00 | 2836 | 0 |

Kills by the element that scored them:

| Ligand | H | He | Li | Be | B | C | N | O | Ne |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| no ligand | 71 | 197 | 265 | 573 | 209 | 210 | 499 | 470 | 271 |
| Passivation Layer | 99 | 226 | 381 | 789 | 294 | 298 | 578 | 614 | 383 |
| Supercooled Core | 72 | 198 | 293 | 716 | 270 | 266 | 590 | 574 | 318 |
| Fractional Distillation | 22 | 92 | 350 | 611 | 251 | 251 | 569 | 562 | 333 |
| Exothermic Edge | 71 | 197 | 303 | 832 | 341 | 344 | 639 | 758 | 447 |

### new-path-old-balance

| Ligand | Wins / 600 | Win % | Avg kills | Avg deepest grid | Avg evolutions | Avg catalysts | Ram kills | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| no ligand | 8 | 1.33 | 4.80 | 1.81 | 0.56 | 0.00 | 1990 | 6 |
| Passivation Layer | 8 | 1.33 | 6.22 | 1.64 | 0.77 | 0.00 | 2644 | 5 |
| Supercooled Core | 9 | 1.50 | 5.60 | 2.63 | 0.67 | 0.00 | 2279 | 6 |
| Fractional Distillation | 9 | 1.50 | 5.54 | 1.56 | 0.91 | 0.00 | 2231 | 3 |
| Exothermic Edge | 11 | 1.83 | 6.25 | 1.92 | 0.77 | 0.00 | 2729 | 8 |

Kills by the element that scored them:

| Ligand | H | He | Li | Be | B | C | N | O | Ne |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| no ligand | 77 | 155 | 292 | 640 | 242 | 233 | 452 | 538 | 254 |
| Passivation Layer | 108 | 183 | 439 | 862 | 343 | 289 | 514 | 668 | 327 |
| Supercooled Core | 81 | 156 | 315 | 749 | 309 | 288 | 521 | 652 | 288 |
| Fractional Distillation | 22 | 80 | 402 | 759 | 304 | 278 | 524 | 646 | 307 |
| Exothermic Edge | 82 | 156 | 332 | 829 | 377 | 368 | 531 | 702 | 373 |

### new-path-economy-only

| Ligand | Wins / 600 | Win % | Avg kills | Avg deepest grid | Avg evolutions | Avg catalysts | Ram kills | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| no ligand | 8 | 1.33 | 4.80 | 1.81 | 0.56 | 0.00 | 1990 | 6 |
| Passivation Layer | 8 | 1.33 | 6.22 | 1.64 | 0.77 | 0.00 | 2644 | 5 |
| Supercooled Core | 9 | 1.50 | 5.60 | 2.63 | 0.67 | 0.00 | 2279 | 6 |
| Fractional Distillation | 11 | 1.83 | 5.30 | 1.61 | 0.86 | 0.00 | 2132 | 5 |
| Exothermic Edge | 11 | 1.83 | 6.25 | 1.92 | 0.77 | 0.00 | 2729 | 8 |

Kills by the element that scored them:

| Ligand | H | He | Li | Be | B | C | N | O | Ne |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| no ligand | 77 | 155 | 292 | 640 | 242 | 233 | 452 | 538 | 254 |
| Passivation Layer | 108 | 183 | 439 | 862 | 343 | 289 | 514 | 668 | 327 |
| Supercooled Core | 81 | 156 | 315 | 749 | 309 | 288 | 521 | 652 | 288 |
| Fractional Distillation | 22 | 80 | 395 | 730 | 276 | 266 | 511 | 603 | 295 |
| Exothermic Edge | 82 | 156 | 332 | 829 | 377 | 368 | 531 | 702 | 373 |

### new-path-new-balance

| Ligand | Wins / 600 | Win % | Avg kills | Avg deepest grid | Avg evolutions | Avg catalysts | Ram kills | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| no ligand | 8 | 1.33 | 4.86 | 1.81 | 0.57 | 0.00 | 2009 | 6 |
| Passivation Layer | 8 | 1.33 | 6.21 | 1.64 | 0.75 | 0.00 | 2654 | 5 |
| Supercooled Core | 9 | 1.50 | 5.61 | 2.63 | 0.67 | 0.00 | 2285 | 6 |
| Fractional Distillation | 11 | 1.83 | 5.32 | 1.61 | 0.86 | 0.00 | 2143 | 5 |
| Exothermic Edge | 11 | 1.83 | 6.37 | 1.94 | 0.79 | 0.00 | 2783 | 8 |

Kills by the element that scored them:

| Ligand | H | He | Li | Be | B | C | N | O | Ne |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| no ligand | 77 | 155 | 293 | 650 | 247 | 239 | 455 | 545 | 257 |
| Passivation Layer | 106 | 183 | 438 | 897 | 333 | 279 | 508 | 659 | 322 |
| Supercooled Core | 81 | 156 | 315 | 757 | 309 | 288 | 521 | 652 | 288 |
| Fractional Distillation | 22 | 80 | 395 | 740 | 278 | 266 | 511 | 603 | 295 |
| Exothermic Edge | 82 | 156 | 334 | 861 | 393 | 377 | 534 | 709 | 376 |

## Hydrogen / catalyst-aware

### old-path-old-balance

| Ligand | Wins / 600 | Win % | Avg kills | Avg deepest grid | Avg evolutions | Avg catalysts | Ram kills | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| no ligand | 0 | 0.00 | 3.60 | 4.03 | 1.27 | 0.13 | 1819 | 3 |
| Passivation Layer | 1 | 0.17 | 6.68 | 2.78 | 2.18 | 0.27 | 3261 | 3 |
| Supercooled Core | 0 | 0.00 | 3.94 | 5.32 | 1.31 | 0.15 | 1930 | 3 |
| Fractional Distillation | 3 | 0.50 | 9.00 | 4.46 | 1.13 | 1.30 | 4743 | 4 |
| Exothermic Edge | 0 | 0.00 | 5.22 | 3.97 | 1.44 | 0.21 | 2694 | 3 |

Kills by the element that scored them:

| Ligand | H | He | Li | Be | B | C | N | O | Ne |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| no ligand | 663 | 0 | 683 | 632 | 50 | 32 | 28 | 41 | 29 |
| Passivation Layer | 918 | 0 | 1243 | 1089 | 208 | 123 | 144 | 191 | 93 |
| Supercooled Core | 689 | 0 | 754 | 701 | 65 | 42 | 32 | 47 | 34 |
| Fractional Distillation | 876 | 100 | 664 | 2610 | 280 | 225 | 277 | 217 | 153 |
| Exothermic Edge | 700 | 0 | 848 | 1201 | 130 | 69 | 88 | 69 | 28 |

### new-path-old-balance

| Ligand | Wins / 600 | Win % | Avg kills | Avg deepest grid | Avg evolutions | Avg catalysts | Ram kills | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| no ligand | 3 | 0.50 | 5.77 | 3.37 | 1.40 | 0.29 | 2899 | 14 |
| Passivation Layer | 3 | 0.50 | 9.48 | 2.32 | 2.33 | 0.47 | 4709 | 20 |
| Supercooled Core | 3 | 0.50 | 6.58 | 4.57 | 1.50 | 0.34 | 3221 | 14 |
| Fractional Distillation | 1 | 0.17 | 10.29 | 3.49 | 1.27 | 1.33 | 5256 | 44 |
| Exothermic Edge | 3 | 0.50 | 7.72 | 3.42 | 1.56 | 0.37 | 3978 | 17 |

Kills by the element that scored them:

| Ligand | H | He | Li | Be | B | C | N | O | Ne |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| no ligand | 685 | 0 | 894 | 1300 | 162 | 89 | 114 | 166 | 52 |
| Passivation Layer | 953 | 0 | 1476 | 2106 | 327 | 209 | 245 | 230 | 140 |
| Supercooled Core | 727 | 0 | 990 | 1430 | 208 | 130 | 155 | 216 | 90 |
| Fractional Distillation | 913 | 116 | 741 | 2692 | 392 | 295 | 388 | 450 | 184 |
| Exothermic Edge | 730 | 0 | 1022 | 2068 | 221 | 118 | 144 | 255 | 75 |

### new-path-economy-only

| Ligand | Wins / 600 | Win % | Avg kills | Avg deepest grid | Avg evolutions | Avg catalysts | Ram kills | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| no ligand | 3 | 0.50 | 5.77 | 3.37 | 1.40 | 0.29 | 2899 | 14 |
| Passivation Layer | 3 | 0.50 | 9.48 | 2.32 | 2.33 | 0.47 | 4709 | 20 |
| Supercooled Core | 3 | 0.50 | 6.58 | 4.57 | 1.50 | 0.34 | 3221 | 14 |
| Fractional Distillation | 4 | 0.67 | 10.42 | 3.68 | 1.35 | 1.33 | 5345 | 34 |
| Exothermic Edge | 3 | 0.50 | 7.72 | 3.42 | 1.56 | 0.37 | 3978 | 17 |

Kills by the element that scored them:

| Ligand | H | He | Li | Be | B | C | N | O | Ne |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| no ligand | 685 | 0 | 894 | 1300 | 162 | 89 | 114 | 166 | 52 |
| Passivation Layer | 953 | 0 | 1476 | 2106 | 327 | 209 | 245 | 230 | 140 |
| Supercooled Core | 727 | 0 | 990 | 1430 | 208 | 130 | 155 | 216 | 90 |
| Fractional Distillation | 921 | 4 | 830 | 2750 | 451 | 311 | 345 | 433 | 206 |
| Exothermic Edge | 730 | 0 | 1022 | 2068 | 221 | 118 | 144 | 255 | 75 |

### new-path-new-balance

| Ligand | Wins / 600 | Win % | Avg kills | Avg deepest grid | Avg evolutions | Avg catalysts | Ram kills | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| no ligand | 1 | 0.17 | 6.10 | 3.38 | 1.37 | 0.28 | 3149 | 17 |
| Passivation Layer | 1 | 0.17 | 9.79 | 2.31 | 2.30 | 0.46 | 4956 | 23 |
| Supercooled Core | 1 | 0.17 | 6.86 | 4.58 | 1.47 | 0.33 | 3452 | 17 |
| Fractional Distillation | 4 | 0.67 | 11.22 | 3.70 | 1.34 | 1.33 | 5843 | 36 |
| Exothermic Edge | 2 | 0.33 | 8.50 | 3.44 | 1.54 | 0.35 | 4469 | 21 |

Kills by the element that scored them:

| Ligand | H | He | Li | Be | B | C | N | O | Ne |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| no ligand | 685 | 0 | 894 | 1635 | 144 | 68 | 68 | 130 | 34 |
| Passivation Layer | 951 | 0 | 1473 | 2443 | 307 | 188 | 199 | 194 | 122 |
| Supercooled Core | 728 | 0 | 990 | 1765 | 188 | 104 | 106 | 172 | 65 |
| Fractional Distillation | 923 | 4 | 830 | 3243 | 438 | 315 | 351 | 420 | 210 |
| Exothermic Edge | 730 | 0 | 1022 | 2615 | 213 | 113 | 130 | 217 | 60 |

## Reproduce

```bash
npm run sim
mkdir -p /tmp/element-balance-baseline
tar -xzf sim/baselines/pre-balance-2026-09-25.tar.gz -C /tmp/element-balance-baseline
node tools/compare-balance.cjs /tmp/element-balance-baseline
node tools/test-balance.cjs
```

Baseline archive SHA-256: `b776a6799efca4465e8df762d1addf257f5a5ece290671b0c8450242fd5e9cdf`.
Raw measurements: `sim/baselines/balance-results-2026-09-25.json`. Harness also writes its latest JSON to `/tmp/element-balance-comparison.json`.

## Future hut gamble — idea only

A purchase costing at most 2 photons could produce extra photons, permanent HP, health loss, a key opening a post-Neon hidden level (possibly featuring Astatine), or de-evolution. Nothing is implemented. Before building it, agree on probabilities, cost, purchase limits, health-loss lethality, key persistence, de-evolution rules, interactions with Fractional and protection against infinite reroll/profit loops.
