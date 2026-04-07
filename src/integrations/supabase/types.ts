export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alleys: {
        Row: {
          address: string
          alley_rating: number
          beer_rating: number
          city: string
          created_at: string
          id: string
          lane_count: number
          lat: number
          lng: number
          name: string
          oil_pattern: string
          phone: string | null
          slug: string
          state: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address: string
          alley_rating?: number
          beer_rating?: number
          city: string
          created_at?: string
          id?: string
          lane_count?: number
          lat?: number
          lng?: number
          name: string
          oil_pattern?: string
          phone?: string | null
          slug: string
          state: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string
          alley_rating?: number
          beer_rating?: number
          city?: string
          created_at?: string
          id?: string
          lane_count?: number
          lat?: number
          lng?: number
          name?: string
          oil_pattern?: string
          phone?: string | null
          slug?: string
          state?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      favorite_alleys: {
        Row: {
          alley_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          alley_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          alley_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_alleys_alley_id_fkey"
            columns: ["alley_id"]
            isOneToOne: false
            referencedRelation: "alleys"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      game_likes: {
        Row: {
          created_at: string
          game_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_likes_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          alley_id: string
          created_at: string
          date: string
          id: string
          image_url: string | null
          notes: string | null
          oil_condition: string
          score: number
          user_id: string
        }
        Insert: {
          alley_id: string
          created_at?: string
          date?: string
          id?: string
          image_url?: string | null
          notes?: string | null
          oil_condition?: string
          score: number
          user_id: string
        }
        Update: {
          alley_id?: string
          created_at?: string
          date?: string
          id?: string
          image_url?: string | null
          notes?: string | null
          oil_condition?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_alley_id_fkey"
            columns: ["alley_id"]
            isOneToOne: false
            referencedRelation: "alleys"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          bowling_average: number
          created_at: string
          full_name: string | null
          games_count: number
          hometown: string | null
          id: string
          total_points: number
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          bowling_average?: number
          created_at?: string
          full_name?: string | null
          games_count?: number
          hometown?: string | null
          id?: string
          total_points?: number
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          bowling_average?: number
          created_at?: string
          full_name?: string | null
          games_count?: number
          hometown?: string | null
          id?: string
          total_points?: number
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          alley_id: string
          beer_rating: number
          comment: string | null
          created_at: string
          id: string
          oil_rating: number
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          alley_id: string
          beer_rating: number
          comment?: string | null
          created_at?: string
          id?: string
          oil_rating: number
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          alley_id?: string
          beer_rating?: number
          comment?: string | null
          created_at?: string
          id?: string
          oil_rating?: number
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_alley_id_fkey"
            columns: ["alley_id"]
            isOneToOne: false
            referencedRelation: "alleys"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
