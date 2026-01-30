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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      custom_activities: {
        Row: {
          config_json: Json | null
          created_at: string
          deployed_at: string | null
          description: string | null
          extracted_requirements: Json | null
          generated_at: string | null
          id: string
          javascript_code: Json | null
          name: string
          nodejs_code: Json | null
          original_prompt: string
          selected_version: string | null
          status: Database["public"]["Enums"]["activity_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          config_json?: Json | null
          created_at?: string
          deployed_at?: string | null
          description?: string | null
          extracted_requirements?: Json | null
          generated_at?: string | null
          id?: string
          javascript_code?: Json | null
          name: string
          nodejs_code?: Json | null
          original_prompt: string
          selected_version?: string | null
          status?: Database["public"]["Enums"]["activity_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          config_json?: Json | null
          created_at?: string
          deployed_at?: string | null
          description?: string | null
          extracted_requirements?: Json | null
          generated_at?: string | null
          id?: string
          javascript_code?: Json | null
          name?: string
          nodejs_code?: Json | null
          original_prompt?: string
          selected_version?: string | null
          status?: Database["public"]["Enums"]["activity_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deployments: {
        Row: {
          base_url: string | null
          build_logs: string | null
          created_at: string
          custom_activity_id: string
          deployed_at: string | null
          deployment_id: string | null
          environment: Json | null
          error_message: string | null
          execute_url: string | null
          id: string
          provider: Database["public"]["Enums"]["deploy_provider"]
          publish_url: string | null
          save_url: string | null
          status: string | null
          validate_url: string | null
        }
        Insert: {
          base_url?: string | null
          build_logs?: string | null
          created_at?: string
          custom_activity_id: string
          deployed_at?: string | null
          deployment_id?: string | null
          environment?: Json | null
          error_message?: string | null
          execute_url?: string | null
          id?: string
          provider: Database["public"]["Enums"]["deploy_provider"]
          publish_url?: string | null
          save_url?: string | null
          status?: string | null
          validate_url?: string | null
        }
        Update: {
          base_url?: string | null
          build_logs?: string | null
          created_at?: string
          custom_activity_id?: string
          deployed_at?: string | null
          deployment_id?: string | null
          environment?: Json | null
          error_message?: string | null
          execute_url?: string | null
          id?: string
          provider?: Database["public"]["Enums"]["deploy_provider"]
          publish_url?: string | null
          save_url?: string | null
          status?: string | null
          validate_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deployments_custom_activity_id_fkey"
            columns: ["custom_activity_id"]
            isOneToOne: false
            referencedRelation: "custom_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      git_integrations: {
        Row: {
          access_token_encrypted: string | null
          account_username: string | null
          connected_at: string
          expires_at: string | null
          id: string
          provider: Database["public"]["Enums"]["git_provider"]
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          account_username?: string | null
          connected_at?: string
          expires_at?: string | null
          id?: string
          provider: Database["public"]["Enums"]["git_provider"]
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          account_username?: string | null
          connected_at?: string
          expires_at?: string | null
          id?: string
          provider?: Database["public"]["Enums"]["git_provider"]
          user_id?: string
        }
        Relationships: []
      }
      git_repositories: {
        Row: {
          branch: string | null
          created_at: string
          custom_activity_id: string
          git_integration_id: string
          id: string
          last_commit_at: string | null
          last_commit_sha: string | null
          provider: Database["public"]["Enums"]["git_provider"]
          repository_id: string | null
          repository_name: string
          repository_url: string
        }
        Insert: {
          branch?: string | null
          created_at?: string
          custom_activity_id: string
          git_integration_id: string
          id?: string
          last_commit_at?: string | null
          last_commit_sha?: string | null
          provider: Database["public"]["Enums"]["git_provider"]
          repository_id?: string | null
          repository_name: string
          repository_url: string
        }
        Update: {
          branch?: string | null
          created_at?: string
          custom_activity_id?: string
          git_integration_id?: string
          id?: string
          last_commit_at?: string | null
          last_commit_sha?: string | null
          provider?: Database["public"]["Enums"]["git_provider"]
          repository_id?: string | null
          repository_name?: string
          repository_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "git_repositories_custom_activity_id_fkey"
            columns: ["custom_activity_id"]
            isOneToOne: false
            referencedRelation: "custom_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "git_repositories_git_integration_id_fkey"
            columns: ["git_integration_id"]
            isOneToOne: false
            referencedRelation: "git_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          ai_generations_count: number | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          custom_activities_count: number | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_generations_count?: number | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          custom_activities_count?: number | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_generations_count?: number | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          custom_activities_count?: number | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      activity_status:
        | "draft"
        | "generating"
        | "generated"
        | "deploying"
        | "deployed"
        | "failed"
      app_role: "admin" | "member" | "viewer"
      deploy_provider: "vercel" | "render" | "railway" | "heroku"
      git_provider: "github" | "gitlab" | "bitbucket"
      subscription_plan: "free" | "pro" | "enterprise"
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
    Enums: {
      activity_status: [
        "draft",
        "generating",
        "generated",
        "deploying",
        "deployed",
        "failed",
      ],
      app_role: ["admin", "member", "viewer"],
      deploy_provider: ["vercel", "render", "railway", "heroku"],
      git_provider: ["github", "gitlab", "bitbucket"],
      subscription_plan: ["free", "pro", "enterprise"],
    },
  },
} as const
