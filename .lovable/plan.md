

# Add Alley Cat Logo to App Header

## Summary
Edit the uploaded logo image to keep only the cat, pins, and "Alley Cat" text, recolored to match the app's dark green/gold 90s aesthetic. Then add it as a small header element visible on all pages.

## Steps

### 1. Process the logo image
- Copy the uploaded logo to the project
- Use the Lovable AI image generation model to edit the logo: remove "The", "Review", "JST 372", and the tagline. Keep only the cat face, bowling pins, and "Alley Cat" text. Recolor to match the app palette (gold/dark green tones instead of the current beige/red)
- Save the processed logo to `src/assets/logo.png`

### 2. Create a Header component
- New file: `src/components/Header.tsx`
- Small fixed or static header bar at the top of the app
- Displays the logo image at ~32-40px height in the top-left corner
- Matches the 90s aesthetic: dark green background, simple border-bottom
- Minimal — just the logo, no other elements

### 3. Integrate Header into App.tsx
- Import and render `<Header />` above `<Routes>` so it appears on every page
- Ensure page content has appropriate top padding to avoid overlap

