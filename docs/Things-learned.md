# Things learned

## 2026-10-14

**Judge a look test on what makes the thing recognisable.** The 3D version of the felt characters moved well and still got rejected, because image-to-3D conversion lost the felt texture.

The movement is what we were testing, so it was tempting to call the test a success. But the characters are recognisable by their material, not by their motion, and a character that walks smoothly but looks like plastic is a different character. The useful outcome was a decision to keep the two problems apart: finish the app with static, draggable figures first, and come back to animation (in Rive, not 3D) once the choreography works end to end.

**Showing chrome late moves everything under it.** Hiding the top bar until the last step looked like a one-line change, but adding an in-flow bar shrinks the stage, and anything placed in fractions of the stage moves at that moment.

The alternative was to lay the bar over the top of the scene, which keeps the world still but covers things that live at the top edge (the What if curtains, and parts that can be dragged almost to y = 0). We kept the bar in flow and grew it from nothing with a `grid-template-rows: 0fr → 1fr` animation, so the scene reframes gradually instead of jumping. The cost is a whole-scene move at the closing moment. One trap: with `grid-template-rows: auto 1fr`, conditionally rendering the first child drops the stage into the `auto` row and collapses it. Pin the stage to row 2 explicitly.

**Don't truncate the person's own words.** Part names here are the person's verbatim answer to "which feeling has been loudest", so they're often a whole phrase, and an ellipsis cut off exactly the part that mattered.

Letting names wrap exposed a second bug. Labels flipped above the figure only past a fixed line (85% down the map), which assumed one-line labels and small figures. Big figures near the bottom now pushed two-line labels off the map. The fix measures the label and decides from the part's target position, not its mid-glide position on screen. It also re-checks with a `ResizeObserver` on the landscape, because the bar opening changes the landscape's height without any window resize.

**A deterministic template is what makes live text cheap.** Turn 4's map summary is a template over sizes and distances, not LLM prose, so making it update as parts are dragged was just a matter of recomputing it from the current layout.

Showing the same summary for What if took two changes: running the template over the other mode's layout, and splitting the clauses from the "that…" lead-in so the What if version could open differently without changing the agreed confirmation line. Had the summary been generated text, "keep it true to the map" would have meant a network call per drag and a new way for it to misreport.

**Measure animation timing inside the page, not around screenshots.** In headless Chromium with software rendering, a screenshot can stall the page for several seconds. Any timing taken around one is meaningless.

To check the bar's reveal, we sampled the bar's height, the stage height and a part's position in a `requestAnimationFrame` loop in the page, then read the samples back afterwards. Screenshots were kept for looking at the end state. The same session showed test scripts producing false failures: one "click timed out" came from the script itself dragging a part underneath the conversation card.
