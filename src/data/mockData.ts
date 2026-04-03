import { Alley, Game, Review, Profile } from "@/types";

export const mockAlleys: Alley[] = [
  { id: "1", name: "Thunder Lanes", address: "123 Strike Ave", city: "Brooklyn", state: "NY", lat: 40.6782, lng: -73.9442, lane_count: 32, website: "thunderlanes.com", phone: "(718) 555-0101", oil_pattern: "House", beer_rating: 4 },
  { id: "2", name: "Gutter Ball Palace", address: "456 Pin Dr", city: "Chicago", state: "IL", lat: 41.8781, lng: -87.6298, lane_count: 48, website: "gutterball.com", phone: "(312) 555-0202", oil_pattern: "Fresh", beer_rating: 5 },
  { id: "3", name: "Pin Crusher Arena", address: "789 Bowl Blvd", city: "Austin", state: "TX", lat: 30.2672, lng: -97.7431, lane_count: 24, website: "pincrusher.com", phone: "(512) 555-0303", oil_pattern: "Sport", beer_rating: 3 },
  { id: "4", name: "Neon Strike Zone", address: "321 Lane St", city: "Portland", state: "OR", lat: 45.5152, lng: -122.6784, lane_count: 20, website: "neonstrike.com", phone: "(503) 555-0404", oil_pattern: "Dry", beer_rating: 5 },
  { id: "5", name: "Lucky 7 Lanes", address: "777 Spare Rd", city: "Las Vegas", state: "NV", lat: 36.1699, lng: -115.1398, lane_count: 40, website: "lucky7lanes.com", phone: "(702) 555-0505", oil_pattern: "House", beer_rating: 4 },
  { id: "6", name: "Atomic Bowl", address: "100 Reactor Ln", city: "Denver", state: "CO", lat: 39.7392, lng: -104.9903, lane_count: 28, website: "atomicbowl.com", phone: "(303) 555-0606", oil_pattern: "Fresh", beer_rating: 3 },
];

export const mockGames: Game[] = [
  { id: "1", user_id: "1", alley_id: "1", alley_name: "Thunder Lanes", score: 245, date: "2025-03-28", oil_condition: "House", notes: "Used Storm Phaze III. Lanes were running hot." },
  { id: "2", user_id: "1", alley_id: "2", alley_name: "Gutter Ball Palace", score: 198, date: "2025-03-25", oil_condition: "Fresh", notes: "Heavy oil, switched to urethane mid-game." },
  { id: "3", user_id: "1", alley_id: "3", alley_name: "Pin Crusher Arena", score: 267, date: "2025-03-20", oil_condition: "Sport", notes: "Clean game. 10 strikes." },
];

export const mockReviews: Review[] = [
  { id: "1", user_id: "2", username: "PinSlayer99", alley_id: "1", rating: 4, comment: "Solid lanes, great atmosphere. The cosmic bowling nights are unreal.", oil_rating: 4, beer_rating: 5, created_at: "2025-03-15" },
  { id: "2", user_id: "3", username: "GutterQueen", alley_id: "2", rating: 5, comment: "Best craft beer selection at any alley. Period.", oil_rating: 5, beer_rating: 5, created_at: "2025-03-10" },
  { id: "3", user_id: "4", username: "StrikeForce", alley_id: "1", rating: 3, comment: "Oil patterns inconsistent on league nights.", oil_rating: 2, beer_rating: 4, created_at: "2025-03-05" },
];

export const mockProfiles: Profile[] = [
  { id: "1", username: "AlleyCat_OG", hometown: "Brooklyn, NY", total_points: 1250, bowling_average: 215 },
  { id: "2", username: "PinSlayer99", hometown: "Chicago, IL", total_points: 980, bowling_average: 198 },
  { id: "3", username: "GutterQueen", hometown: "Austin, TX", total_points: 860, bowling_average: 175 },
  { id: "4", username: "StrikeForce", hometown: "Portland, OR", total_points: 720, bowling_average: 205 },
  { id: "5", username: "SpareMe", hometown: "Las Vegas, NV", total_points: 540, bowling_average: 162 },
  { id: "6", username: "TurkeyHunter", hometown: "Denver, CO", total_points: 440, bowling_average: 188 },
  { id: "7", username: "SplitDecision", hometown: "Miami, FL", total_points: 380, bowling_average: 171 },
  { id: "8", username: "KingpinKelly", hometown: "Seattle, WA", total_points: 290, bowling_average: 195 },
];
