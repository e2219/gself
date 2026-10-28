# 奶蛙 optional flight theme — 1.11.0 / Android 19

The departure hall offers Original 2D, Moon-night 3D and 奶蛙, with persisted selection and shared records. The third choice changes flight appearance/audio only; the 30-level puzzle and physics remain as released.

Image 1 supplies the angry meteor; images 5/4 supply the heart-hand normal player and laughing boosted player. A transparent sprite atlas (60% fully transparent pixels) is rendered as 2.5D silhouettes, not full rigged 3D meshes. UV crops remove surrounding padding. Normal meteors are instanced and remain upright. Special hazard shapes retain their identifying warning cues. Images 6–9 supply darkened cover-cropped paintings. Bright/dark phase sizes and rim marks remain distinct; boost has gold trails and open rings that leave the face visible. Falling stars remain unrotated.

The exact supplied MP3 replaces the boost tone only in this edition. Real successful input plays one clip; cooldown and mute suppress playback, and pause/home/page-hide stop it. Repeated successful boosts restart the single player rather than overlap clips.

Verification: complete npm regression suite; original asset provenance; original native wrapper test; Playwright mobile390×844 and desktop960×720 capture/video, all four backdrops, laser warning/active states, real keyboard boost, actual audio decode/play, mute/cooldown/pause, all three selectors, plain-launch persistence, shared records and original3D renderer isolation. No page errors; see report.json. Software browser metrics are render budgets, not phone FPS.

Android release build succeeds. Phone disconnected before a fresh profile backup could run; no overwrite installation or device validation was performed. Previous progress was not restored or modified. APK is provided for later installation.
