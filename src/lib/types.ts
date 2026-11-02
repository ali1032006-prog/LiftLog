// Generated from the Supabase project schema (supabase generate types) and trimmed to what the app uses.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      exercises: {
        Row: { created_at: string; id: string; name: string; owner_id: string; weight_unit: string }
        Insert: { created_at?: string; id?: string; name: string; owner_id: string }
        Update: { created_at?: string; id?: string; name?: string; owner_id?: string }
        Relationships: [
          { foreignKeyName: "exercises_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      follows: {
        Row: { created_at: string; followee_id: string; follower_id: string }
        Insert: { created_at?: string; followee_id: string; follower_id: string }
        Update: { created_at?: string; followee_id?: string; follower_id?: string }
        Relationships: [
          { foreignKeyName: "follows_followee_id_fkey"; columns: ["followee_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "follows_follower_id_fkey"; columns: ["follower_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      profiles: {
        Row: { avatar_url: string | null; bio: string | null; created_at: string; display_name: string | null; id: string; username: string; weight_unit: string }
        Insert: { avatar_url?: string | null; bio?: string | null; created_at?: string; display_name?: string | null; id: string; username: string; weight_unit?: string }
        Update: { avatar_url?: string | null; bio?: string | null; created_at?: string; display_name?: string | null; id?: string; username?: string; weight_unit?: string }
        Relationships: []
      }
      routine_exercises: {
        Row: { exercise_id: string; id: string; notes: string | null; position: number; rest_seconds: number; routine_id: string; weight_unit: string }
        Insert: { exercise_id: string; id?: string; notes?: string | null; position?: number; rest_seconds?: number; routine_id: string }
        Update: { exercise_id?: string; id?: string; notes?: string | null; position?: number; rest_seconds?: number; routine_id?: string }
        Relationships: [
          { foreignKeyName: "routine_exercises_exercise_id_fkey"; columns: ["exercise_id"]; isOneToOne: false; referencedRelation: "exercises"; referencedColumns: ["id"] },
          { foreignKeyName: "routine_exercises_routine_id_fkey"; columns: ["routine_id"]; isOneToOne: false; referencedRelation: "routines"; referencedColumns: ["id"] },
        ]
      }
      routine_sets: {
        Row: { id: string; position: number; reps: number | null; routine_exercise_id: string; weight_kg: number | null }
        Insert: { id?: string; position?: number; reps?: number | null; routine_exercise_id: string; weight_kg?: number | null }
        Update: { id?: string; position?: number; reps?: number | null; routine_exercise_id?: string; weight_kg?: number | null }
        Relationships: [
          { foreignKeyName: "routine_sets_routine_exercise_id_fkey"; columns: ["routine_exercise_id"]; isOneToOne: false; referencedRelation: "routine_exercises"; referencedColumns: ["id"] },
        ]
      }
      routines: {
        Row: { created_at: string; id: string; notes: string | null; source_workout_id: string | null; title: string; updated_at: string; user_id: string }
        Insert: { created_at?: string; id?: string; notes?: string | null; source_workout_id?: string | null; title?: string; updated_at?: string; user_id: string }
        Update: { created_at?: string; id?: string; notes?: string | null; source_workout_id?: string | null; title?: string; updated_at?: string; user_id?: string }
        Relationships: [
          { foreignKeyName: "routines_source_workout_id_fkey"; columns: ["source_workout_id"]; isOneToOne: false; referencedRelation: "workout_cards"; referencedColumns: ["workout_id"] },
          { foreignKeyName: "routines_source_workout_id_fkey"; columns: ["source_workout_id"]; isOneToOne: false; referencedRelation: "workouts"; referencedColumns: ["id"] },
          { foreignKeyName: "routines_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      sets: {
        Row: { completed: boolean; id: string; position: number; reps: number | null; weight_kg: number | null; workout_exercise_id: string }
        Insert: { completed?: boolean; id?: string; position?: number; reps?: number | null; weight_kg?: number | null; workout_exercise_id: string }
        Update: { completed?: boolean; id?: string; position?: number; reps?: number | null; weight_kg?: number | null; workout_exercise_id?: string }
        Relationships: [
          { foreignKeyName: "sets_workout_exercise_id_fkey"; columns: ["workout_exercise_id"]; isOneToOne: false; referencedRelation: "workout_exercises"; referencedColumns: ["id"] },
        ]
      }
      workout_exercises: {
        Row: { exercise_id: string; id: string; notes: string | null; position: number; rest_seconds: number; workout_id: string; weight_unit: string }
        Insert: { exercise_id: string; id?: string; notes?: string | null; position?: number; rest_seconds?: number; workout_id: string }
        Update: { exercise_id?: string; id?: string; notes?: string | null; position?: number; rest_seconds?: number; workout_id?: string }
        Relationships: [
          { foreignKeyName: "workout_exercises_exercise_id_fkey"; columns: ["exercise_id"]; isOneToOne: false; referencedRelation: "exercises"; referencedColumns: ["id"] },
          { foreignKeyName: "workout_exercises_workout_id_fkey"; columns: ["workout_id"]; isOneToOne: false; referencedRelation: "workout_cards"; referencedColumns: ["workout_id"] },
          { foreignKeyName: "workout_exercises_workout_id_fkey"; columns: ["workout_id"]; isOneToOne: false; referencedRelation: "workouts"; referencedColumns: ["id"] },
        ]
      }
      workout_photos: {
        Row: { created_at: string; id: string; path: string; position: number; user_id: string; workout_id: string }
        Insert: { created_at?: string; id?: string; path: string; position?: number; user_id: string; workout_id: string }
        Update: { created_at?: string; id?: string; path?: string; position?: number; user_id?: string; workout_id?: string }
        Relationships: []
      }
      workouts: {
        Row: { created_at: string; duration_seconds: number | null; finished_at: string | null; id: string; notes: string | null; started_at: string; title: string; user_id: string }
        Insert: { created_at?: string; duration_seconds?: number | null; finished_at?: string | null; id?: string; notes?: string | null; started_at?: string; title?: string; user_id: string }
        Update: { created_at?: string; duration_seconds?: number | null; finished_at?: string | null; id?: string; notes?: string | null; started_at?: string; title?: string; user_id?: string }
        Relationships: [
          { foreignKeyName: "workouts_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
    }
    Views: {
      workout_cards: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          duration_seconds: number | null
          exercise_count: number | null
          exercises: Json | null
          finished_at: string | null
          notes: string | null
          set_count: number | null
          started_at: string | null
          title: string | null
          total_volume_kg: number | null
          user_id: string | null
          username: string | null
          volume_unit: string | null
          photos: Json | null
          workout_id: string | null
        }
        Relationships: [
          { foreignKeyName: "workouts_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
    }
    Functions: {
      copy_workout_to_routine: { Args: { p_workout_id: string }; Returns: string }
      find_or_create_exercise: { Args: { p_name: string }; Returns: string }
      finish_workout: { Args: { payload: Json }; Returns: string }
      get_feed: {
        Args: { p_before?: string; p_limit?: number }
        Returns: Database["public"]["Views"]["workout_cards"]["Row"][]
        SetofOptions: { from: "*"; to: "workout_cards"; isOneToOne: false; isSetofReturn: true }
      }
      get_followers: { Args: { p_user_id: string }; Returns: ProfileSummaryRow[] }
      get_following: { Args: { p_user_id: string }; Returns: ProfileSummaryRow[] }
      get_profile: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          follower_count: number
          following_count: number
          id: string
          is_following: boolean
          username: string
          weight_unit: string
          workout_count: number
        }[]
      }
      save_routine: { Args: { payload: Json }; Returns: string }
      search_profiles: { Args: { p_limit?: number; q: string }; Returns: ProfileSummaryRow[] }
      suggested_profiles: { Args: { p_limit?: number }; Returns: ProfileSummaryRow[] }
      username_available: { Args: { p_username: string }; Returns: boolean }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type ProfileSummaryRow = {
  avatar_url: string | null
  display_name: string | null
  follower_count: number
  id: string
  is_following: boolean
  username: string
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])> =
  (PublicSchema["Tables"] & PublicSchema["Views"])[T] extends { Row: infer R } ? R : never

export type Functions<T extends keyof PublicSchema["Functions"]> = PublicSchema["Functions"][T]

// App-level shapes
export type Profile = Tables<"profiles">
export type WorkoutCard = Tables<"workout_cards">
export type ProfileStats = Functions<"get_profile">["Returns"][number]

export type WorkoutCardExercise = {
  name: string
  set_count: number
  best_weight_kg: number | null
  best_reps: number | null
  weight_unit?: string
}

export type WorkoutPhoto = Pick<Tables<"workout_photos">, "id" | "path" | "position">

export type WorkoutDetail = Tables<"workouts"> & {
  profile: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">
  workout_photos: WorkoutPhoto[]
  workout_exercises: (Tables<"workout_exercises"> & {
    exercise: Pick<Tables<"exercises">, "id" | "name">
    sets: Tables<"sets">[]
  })[]
}

export type RoutineDetail = Tables<"routines"> & {
  routine_exercises: (Tables<"routine_exercises"> & {
    exercise: Pick<Tables<"exercises">, "id" | "name">
    routine_sets: Tables<"routine_sets">[]
  })[]
}
