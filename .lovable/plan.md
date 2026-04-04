

# Import Bowling Alley Data

## Summary
Import 1,430 US bowling alleys from the uploaded CSV into the `alleys` table using a direct `psql COPY` command.

## Data Mapping

| CSV Column | Table Column | Notes |
|---|---|---|
| name | name | Direct map |
| address | address | Direct map |
| city | city | Direct map |
| state | state | Direct map |
| lat | lat | Direct map |
| lng | lng | Direct map |
| website | website | Direct map |
| phone | phone | Direct map |
| google_rating | — | Not in table (skip) |
| description | — | Not in table (skip) |
| image_url | — | Not in table (skip) |

Columns `lane_count`, `oil_pattern`, and `beer_rating` will use their defaults (0, "House", 3).

## Steps

### 1. Import CSV data
- Use a Python script to read the CSV, extract the mapped columns, and insert all ~1,430 rows into the `alleys` table via `psql`
- Skip rows with missing required fields (name, address, city, state)

### 2. Verify import
- Query the database to confirm row count and spot-check a few entries

No schema changes or code changes needed — the existing app will display the imported alleys automatically.

