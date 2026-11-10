# Night Final

A first-person exam horror game. Five papers are waiting in Room 013. Look away from the desk long enough to survive the room, then get back to the final.

## Play

Play at [Night Final](https://briday1.github.io/night-final/) or open `index.html` from the downloaded repository in a desktop browser. For one offline file, run `npm run package:web` and open `dist/Night-Final.html`. The single-file build needs Node but no installed packages.

- Use **W/A/D/S** or the arrow keys to look around. In **Horse Anatomy**, find the Mare when you hear its approach and keep it in view.
- Look down and use **1–4** to write an answer. Press **Enter** to advance. You can also use the desk buttons, mouse or touch.
- Every answer is permanent for that sitting. Get **9 of 12** right in each subject. A fourth miss ends the sitting.
- In **Abyssal Biology**, use **E** to walk to the wall pump, stop or resume walking, and pull the handle once you arrive. Stop when the Angler's light sweeps the aisle. **S** walks you back to the desk.
- In **Fungal Ecology**, cut the lit root knots on the paper with **Q/E/Z/C** or a tap. When the Bloom inhales, look right and close the shutter with **F**.
- In **Bog Archaeology**, cross to the next desk after questions 3, 6 and 9. Use **A/W/D** to step, **S** to backtrack, and **R** to check the Walker. Follow the brass braces and keep still when it faces you.
- In **Eclipse Mechanics**, rotate circuit tiles with **1–9** or a tap to bring the desk down. When a beam comes loose, press **R** to look up and use **1/2** to lean away until it drops.
- The room gets more dangerous as the sitting progresses. Surges grow stronger, roots spread faster, wakes swamp later crossings, and later circuits have to be repaired under gravity pull.
- Turn in each packet to start a practical. Its objective opens the next subject. The exam clock runs for 18 minutes during play. One point of composure returns between subjects.
- **Esc** pauses. **F11** toggles fullscreen in the desktop app.
- Choose **Debug run** at the title, add `?debug=1` to the browser URL, or launch the desktop executable with `--debug-exam`. Questions are prefilled. Advance with **Enter** to explore the rooms, or use **Skip questions** or **N** to jump to the current subject's practical. The clock is off and composure loss can't end the run. Clear the five practicals to see the ending.

## Desktop build

Use Node 24. Run `npm install`, then `npm start` for a local desktop playtest or `npm run package:win` for the Windows x64 folder under `dist/`. The Windows workflow runs the syntax checks, starts the packaged app as a launch test and archives the complete Windows folder.

For a Windows Steam depot, use the entire packaged folder as the content root and set the Windows launch executable to `Night Final.exe`. See Valve’s [SteamPipe upload guide](https://partner.steamgames.com/doc/sdk/uploading). The developer build is unsigned. Verify it on your Windows test machines before a store release.

## Exam references

The questions and syllabus are original wording. `curriculum.js` records references for each subject, including university extension materials, NOAA Ocean Exploration, USDA Forest Service, the National Museum of Denmark, and NASA Science.

## Art and audio

The classroom, creatures, moving characters and practical objects use procedural geometry. The final apparition uses faceted wings, claws and moving tendrils built in `proctor-art.js`. Web Audio plays the score, directional warnings and the sounds of the classroom breaking apart.
