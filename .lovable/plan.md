

## Update Favicon to Alley Cat Logo

### Steps
1. Copy the uploaded image (`user-uploads://Alley_Cat-3.png`) to `public/favicon.png`, replacing the existing favicon
2. Also copy it as `public/apple-touch-icon.png` for iOS/Google rich results
3. Add a `manifest.json` with icon entries so Google picks up the correct branding
4. Update `index.html` to include apple-touch-icon and manifest links
5. Hide the "Edit with Lovable" badge on the published site (so Google doesn't associate the Lovable brand)

### Files affected
- `public/favicon.png` — replaced with uploaded image
- `public/apple-touch-icon.png` — new, same image
- `public/manifest.json` — new
- `index.html` — add apple-touch-icon link + manifest link

### Note
Google caches favicons aggressively. After publishing, request a re-index via Google Search Console to speed up the change.

