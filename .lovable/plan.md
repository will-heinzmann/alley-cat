
I do not need extra map requirements to fix this. The current behavior is already well-defined: the Alleys page should switch between list and map, and the map should plot the currently filtered alleys with popups.

## What I found
- The crash is still the same React/Leaflet compatibility error: `render2 is not a function`.
- `src/pages/Index.tsx` is already using the correct React Leaflet v4 API (`MapContainer`, `TileLayer`, `Marker`, `Popup`).
- `package.json` now says `react-leaflet: 4.2.1`, and `bun.lock` also reflects v4.
- But `package-lock.json` is out of sync and does not reflect `react-leaflet` correctly at the root dependency level, which strongly suggests the preview is still installing/resolving the wrong package set from stale lockfile data.

## Plan
1. Align dependency files so the installed version is definitively React Leaflet v4
   - Update the npm lockfile to match `package.json`
   - Ensure `react-leaflet@4.2.1` and its matching `@react-leaflet/core@2.x` are what the project resolves to
   - Remove the stale version mismatch that is likely keeping the preview on the broken package tree

2. Keep the map implementation itself essentially as-is
   - The current map component structure in `Index.tsx` is already appropriate for v4
   - Preserve the current UX: filtered alleys only, national default center, popup link to alley details

3. Add a small safety pass around map data
   - Make sure only alleys with valid numeric coordinates render as markers
   - Keep the current cap on rendered markers for performance

4. Verify the result after dependency alignment
   - Confirm the Map toggle no longer crashes
   - Confirm the map loads tiles and displays markers for filtered alleys
   - Confirm popups still link into alley detail pages

## Technical details
```text
Current likely problem:
package.json = react-leaflet 4.2.1
bun.lock      = react-leaflet 4.2.1
package-lock  = stale / inconsistent

Result:
preview can still resolve/install the wrong dependency tree
→ runtime crash: "render2 is not a function"

Implementation target:
single consistent dependency graph using react-leaflet v4 for React 18
```

## Expected outcome
- No crash when pressing `[Map]`
- Existing alley filters still determine which markers appear
- No new product requirements needed from you before I implement the fix
