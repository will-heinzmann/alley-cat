export interface Alley {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  lane_count: number;
  website: string;
  phone: string;
  oil_pattern: 'Fresh' | 'Dry' | 'Sport' | 'House';
  beer_rating: number;
}

export interface Game {
  id: string;
  user_id: string;
  alley_id: string;
  alley_name: string;
  score: number;
  date: string;
  oil_condition: string;
  notes: string;
}

export interface Review {
  id: string;
  user_id: string;
  username: string;
  alley_id: string;
  rating: number;
  comment: string;
  oil_rating: number;
  beer_rating: number;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  hometown: string;
  total_points: number;
  bowling_average: number;
}
