

# Fix Map View on Alleys Page

## Problem
The map crashes with `render2 is not a function` because `react-leaflet` v5.x requires React 19, but the project runs React 18.

## Solution
Downgrade `react-leaflet` from v5 to v4.x, which is compatible with React 18. No code changes needed — the existing `MapContainer`, `TileLayer`, `Marker`, `Popup` imports and usage are identical between v4 and v5.

## Steps

1. **Update `package.json`**: Change `react-leaflet` from `^5.0.0` to `^4.2.1`
2. That's it — the map code in `Index.tsx` already works correctly with v4

## Technical Detail
- `react-leaflet` v5 uses React 19's new context API internally, causing the `render2 is not a function` error on React 18
- v4.2.1 is the latest version supporting React 18
- All existing map code (`MapContainer`, `TileLayer`, `Marker`, `Popup`) is API-compatible between v4 and v5

