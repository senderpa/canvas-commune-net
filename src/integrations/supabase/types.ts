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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      highscores: {
        Row: {
          created_at: string
          emoji_id: string
          id: string
          player_id: string
          session_token: string | null
          stroke_count: number
        }
        Insert: {
          created_at?: string
          emoji_id: string
          id?: string
          player_id: string
          session_token?: string | null
          stroke_count: number
        }
        Update: {
          created_at?: string
          emoji_id?: string
          id?: string
          player_id?: string
          session_token?: string | null
          stroke_count?: number
        }
        Relationships: []
      }
      player_queue: {
        Row: {
          created_at: string | null
          id: string
          joined_at: string | null
          player_id: string
          queue_position: number
          session_token: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          player_id: string
          queue_position: number
          session_token?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          player_id?: string
          queue_position?: number
          session_token?: string | null
        }
        Relationships: []
      }
      player_sessions: {
        Row: {
          anonymous_id: string
          collision_count: number | null
          created_at: string | null
          current_color: string | null
          current_size: number | null
          current_tool: string | null
          hit_timestamp: string | null
          id: string
          is_active: boolean | null
          is_hit: boolean | null
          last_activity: string | null
          player_id: string
          position_x: number | null
          position_y: number | null
          selected_emoji: string | null
          session_start: string | null
          session_token: string
        }
        Insert: {
          anonymous_id: string
          collision_count?: number | null
          created_at?: string | null
          current_color?: string | null
          current_size?: number | null
          current_tool?: string | null
          hit_timestamp?: string | null
          id?: string
          is_active?: boolean | null
          is_hit?: boolean | null
          last_activity?: string | null
          player_id: string
          position_x?: number | null
          position_y?: number | null
          selected_emoji?: string | null
          session_start?: string | null
          session_token: string
        }
        Update: {
          anonymous_id?: string
          collision_count?: number | null
          created_at?: string | null
          current_color?: string | null
          current_size?: number | null
          current_tool?: string | null
          hit_timestamp?: string | null
          id?: string
          is_active?: boolean | null
          is_hit?: boolean | null
          last_activity?: string | null
          player_id?: string
          position_x?: number | null
          position_y?: number | null
          selected_emoji?: string | null
          session_start?: string | null
          session_token?: string
        }
        Relationships: []
      }
      strokes: {
        Row: {
          color: string
          created_at: string | null
          id: string
          player_id: string
          points: Json
          session_token: string | null
          size: number
          tool: string
          world_x: number
          world_y: number
        }
        Insert: {
          color: string
          created_at?: string | null
          id?: string
          player_id: string
          points: Json
          session_token?: string | null
          size: number
          tool: string
          world_x: number
          world_y: number
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          player_id?: string
          points?: Json
          session_token?: string | null
          size?: number
          tool?: string
          world_x?: number
          world_y?: number
        }
        Relationships: []
      }
    }
    Views: {
      public_player_data: {
        Row: {
          anonymous_id: string | null
          current_color: string | null
          current_size: number | null
          current_tool: string | null
          general_area_x: number | null
          general_area_y: number | null
          is_active: boolean | null
          selected_emoji: string | null
        }
        Insert: {
          anonymous_id?: string | null
          current_color?: string | null
          current_size?: number | null
          current_tool?: string | null
          general_area_x?: never
          general_area_y?: never
          is_active?: boolean | null
          selected_emoji?: string | null
        }
        Update: {
          anonymous_id?: string | null
          current_color?: string | null
          current_size?: number | null
          current_tool?: string | null
          general_area_x?: never
          general_area_y?: never
          is_active?: boolean | null
          selected_emoji?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_emoji_collision: {
        Args: {
          p_position_x: number
          p_position_y: number
          p_session_token: string
        }
        Returns: {
          collided_with_anonymous_id: string
          collided_with_emoji: string
        }[]
      }
      cleanup_inactive_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_anonymous_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_active_player_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_queue_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      promote_from_queue: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      validate_player_session: {
        Args: { session_player_id: string }
        Returns: boolean
      }
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
