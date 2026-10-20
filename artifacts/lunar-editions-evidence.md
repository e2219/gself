# 月面拾光 1.10.0 — dual editions and lunar model kit

## Requirement audit

| User requirement | Implementation and authoritative evidence |
| --- | --- |
| Direct pre-3D original interface remains available | `dist/legacy/` restores commit `3e2f1f863e63f3568aa936a4146a0320c23d81fa`. Every original dist asset was independently compared to `git show`, then covered by `tests/original-edition.test.cjs` and SHA256 provenance. Original HTML only adds the edition selector. Original native runtime/CSS also match baseline. |
| New 3D is optional | Departure hall has Original2D / Moon-night3D selectors. Same-origin full navigation, remembered choice, no concurrent renderer/second native bridge. `tests/browser-editions.cjs` validates both directions and plain-launch preference against built Pages files; native `editionAndMoonModels` passes actual touch navigation both directions. |
| Shared progress, preserved save | Original/current profile schemas are identical. Browser shared-record test passes. Actual phone test compares profile before switching to original; original flight, puzzle input, background pause and return to3D all pass. Fresh backup precedes overwrite; final exact after-install profile comparison is recorded below. |
| Bright/dark shapes distinguish by model | Three ship identities each have filled circular bright form and a physically hollow compact crescent dark form (6 models). Actual Q input swaps diagnostic model IDs; 390/960 screenshots and motion in `lunar-flight-final` show both without test shields. Puzzle full-moon warden versus crescent mantle have different crowns, torso silhouettes and poses. Independent screenshot/source review passes. |
| Complete new-style model kit | Coverage inventory below; both puzzle and flight use authored lit solid geometry, no canvas image planes. All30 puzzle levels and7 flight-mode snapshots render without errors and under mobile call budgets. |
| Necessary attack anticipation retained | Original edition is byte-exact baseline including warnings. 3D retains actual-simulation warning vectors, charge beams, attack geometry, iris predicted boundaries/true gap endpoints, polarity labels, mines/field/boomerang signals. `lunar-boss` verifies4 bosses and iris alignment/purity; `lunar-laser` verifies charge/fire/fade and collision-aligned open segments. Existing gameplay regression suite passes. |
| Previous feedback retained | Dark lunar palette, readable A/B backplates/front state strips, fixed falling star/shard orientation; no new safe-corridor prose in3D. |

## Model coverage

- Ships:3 hull identities ×2 moon forms, lunar disc/crescent frames, layered noses, engines and active phase geometry. Dark flame offsets/dimensions follow hull scale.
- Bosses: storm fortress, iris eye, directional armored warp drive, twin-pole weaver; ion poles now also use distinct full/crescent forms. Charge parts stay tied to simulation time.
- Flight hazards: faceted fractured rock assemblies, split seams, trident/boomerang/probe bodies with functional trim/lenses, core projectiles and mines.
- Flight collectibles/interactables: bevel star pickup, prismatic shard, chamfered reliquary cargo, lathed rescue pod, navigation arches, phase node discs/crescents, port rings and station panel assemblies, whale body/fins/ribs, research pods and wreck salvage. Shared kit geometry covers bounty, supply, meadow and expedition instances.
- World: authored cratered moon and layered observatory edge ruins retained from the new3D redesign; these are already actual geometry. Aurora curtains and warp arch remain world effects. Lines, beams, shields and particles remain pooled effect geometry, not decorative replacement collision shapes.
- Puzzle: moon warden/crescent mantle actors with preserved limb pivots; chamfered lunar slabs, dark wall crowns, stepped plinth/inlays; stepped role/dock/socket bases, readable plaques and front state lights; distinct goal silhouettes; lunar-seal gate panels; layered reliquary crates; caged moon-seed core. Existing trail, guard pins and recorded route feedback remain clear.

## Checks and limits

- Entire existing regression suite PASS; new original provenance and built-native wrapper checks PASS.
-30 puzzle levels: actual move/undo/solve/retry;5 compact viewport sizes; max130 calls/59662 triangles, zero errors.
-6 ship form switches and7 flight mode snapshots: no dropped instances, <=150 calls at both target widths.
-4 boss charge/release and laser lifecycle captures; snapshot purity and exact iris/collision alignment PASS.
- Native OPPO: `editionAndMoonModels` PASS, original flight/puzzle and background pause, actual version and moon-phase touches. Native compact-layout and final-save results follow below.
- Browser captures use software rendering: frame rates are not presented as device-performance evidence. Tiny armor detail is less prominent on small screens; phase silhouettes and gameplay labels were reviewed at actual phone widths.
- No external generation jobs were submitted. Procedural kit continues the established local-authored approach; no new premium/AAA score is claimed.

Final native results: `puzzleCompactLayouts` PASS. A comparison with the earlier pre-install backup found a higher current best score and a changed run preference; every other progress field matched. We did not restore that older snapshot. The native edition test's immediate before/after-switch profile equality passed, and a second comparison against the latest current snapshot passed exactly. No save clearing/uninstall or stale-profile restoration occurred.

Canvas inspector: all10 declared desktop/mobile captures and both evidence manifests PASS, budgets numeric and under limits. Puzzle full-canvas contrast ~49 reflects the requested dark stone surfaces; pale-on-dark plaques and phase silhouettes were separately visually checked. This is not evidence for cinematic-lighting/showcase claims. Flight entropy can be low in sparse early flight by design; no decorative clutter was added to inflate metrics.
