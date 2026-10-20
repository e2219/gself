# Boss refinement evidence

Scope: four distinct 3D boss models; Aurora visual telegraphs; fixed orientation for falling collectible stars. No gameplay/collision changes.

`tests/browser-boss.cjs` advances the real simulation to the first boss event, records charge/release motion at 960×720 and 390×844, checks snapshot purity and Aurora geometry alignment. `report.json` contains measured renderer counts. Captures use the game camera, not enlarged model viewer renders. SwiftShader browser timings are not device performance evidence.

Independent review found and fixed negative-scale mesh winding and stale frozen screenshots. Final captures show different charge/active states with current HUD. Native `bossModelReview` passed on OPPO/Mali-G57 MC2: 49–68 draw calls and zero dropped instances. Two FPS samples were unavailable; the other short samples were 57 and 55 FPS, insufficient for sustained-performance claims. Existing regression suite passed.

Procedural assets continue the established ceramic/titanium/gold palette; no external assets or credentials used. Boss triangle counts 1,188–4,256. Existing broad visual scorecard is not re-scored or presented as a new premium certification.

Native screenshots were excluded after review found WebView screenshot latency could capture the preceding route; native assertions and GPU diagnostics are retained, while per-route visual evidence uses the verified browser captures.
