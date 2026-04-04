

# Fix Alley Directory to Load All Data

## Problem
Supabase has a default limit of 1,000 rows per query. The current `fetchAlleys` call fetches only the first 1,000 alleys, so client-side filtering misses alleys beyond that limit (e.g., Chicago shows only 4 instead of all).

## Solution
Paginate the initial fetch to load ALL alleys from the database, then continue filtering client-side as before. The display will still show paginated results for performance.

## Steps

### 1. Update `fetchAlleys` in `src/pages/Index.tsx`
- Replace the single `.select("*")` call with a loop that fetches in batches of 1,000 using `.range(from, to)` until all rows are retrieved
- Concatenate all batches into the `alleys` state
- This ensures filters and search operate on the complete dataset

### 2. Add pagination to the displayed results
- Show only ~50 alleys at a time in the list with "Load More" or page navigation
- This keeps the UI fast while the full dataset is available for filtering

## Technical Detail
```text
Current:  supabase.from("alleys").select("*").order("name")  → max 1000 rows

Fixed:    Loop with .range(0, 999), .range(1000, 1999), etc.
          until a batch returns fewer than 1000 rows.
          All rows stored in state → filters work on full dataset.
          Display paginated (50 per page) for UI performance.
```

