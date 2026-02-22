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
      blog_comments: {
        Row: {
          blog_post_id: string
          comment: string
          commenter_name: string
          created_at: string
          id: string
          is_approved: boolean
          user_id: string
        }
        Insert: {
          blog_post_id: string
          comment?: string
          commenter_name?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          user_id: string
        }
        Update: {
          blog_post_id?: string
          comment?: string
          commenter_name?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_name: string
          category: string
          content: string
          cover_image_url: string
          created_at: string
          excerpt: string
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          newsletter_sent_at: string | null
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_name?: string
          category?: string
          content?: string
          cover_image_url?: string
          created_at?: string
          excerpt?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          newsletter_sent_at?: string | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_name?: string
          category?: string
          content?: string
          cover_image_url?: string
          created_at?: string
          excerpt?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          newsletter_sent_at?: string | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          blog_post_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          blog_post_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blog_post_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string
          book_type: string
          category: string
          created_at: string
          demo_pdf_url: string | null
          description: string
          ebook_file_url: string | null
          id: string
          image_url: string
          is_published: boolean
          original_price: number | null
          page_count: number | null
          price: number
          slug: string
          stock_quantity: number | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          book_type?: string
          category?: string
          created_at?: string
          demo_pdf_url?: string | null
          description?: string
          ebook_file_url?: string | null
          id?: string
          image_url?: string
          is_published?: boolean
          original_price?: number | null
          page_count?: number | null
          price?: number
          slug: string
          stock_quantity?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          book_type?: string
          category?: string
          created_at?: string
          demo_pdf_url?: string | null
          description?: string
          ebook_file_url?: string | null
          id?: string
          image_url?: string
          is_published?: boolean
          original_price?: number | null
          page_count?: number | null
          price?: number
          slug?: string
          stock_quantity?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number
          product_id: string | null
          product_type: string | null
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number
          product_id?: string | null
          product_type?: string | null
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number
          product_id?: string | null
          product_type?: string | null
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      courses: {
        Row: {
          category: string
          created_at: string
          description: string
          duration: string
          id: string
          image_url: string
          instructor: string
          is_published: boolean
          original_price: number | null
          price: number
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          duration?: string
          id?: string
          image_url?: string
          instructor?: string
          is_published?: boolean
          original_price?: number | null
          price?: number
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          duration?: string
          id?: string
          image_url?: string
          instructor?: string
          is_published?: boolean
          original_price?: number | null
          price?: number
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          media_type: string
          media_url: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          media_type?: string
          media_url?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          media_type?: string
          media_url?: string
          sort_order?: number
        }
        Relationships: []
      }
      landing_pages: {
        Row: {
          benefits: Json
          countdown_end_time: string | null
          created_at: string
          cta_color: string
          cta_text: string
          faqs: Json
          headline: string
          hero_image_url: string | null
          hero_images: Json | null
          hero_video_url: string | null
          hero_videos: Json | null
          hidden_sections: Json
          id: string
          is_published: boolean
          media_items: Json
          product_id: string
          product_type: string
          reviews: Json
          section_order: Json
          show_countdown: boolean
          show_coupon: boolean
          show_quantity: boolean
          show_stock_badge: boolean
          slug: string
          stock_limit: number
          stock_sold: number
          subheadline: string
          theme: string
          updated_at: string
        }
        Insert: {
          benefits?: Json
          countdown_end_time?: string | null
          created_at?: string
          cta_color?: string
          cta_text?: string
          faqs?: Json
          headline?: string
          hero_image_url?: string | null
          hero_images?: Json | null
          hero_video_url?: string | null
          hero_videos?: Json | null
          hidden_sections?: Json
          id?: string
          is_published?: boolean
          media_items?: Json
          product_id: string
          product_type?: string
          reviews?: Json
          section_order?: Json
          show_countdown?: boolean
          show_coupon?: boolean
          show_quantity?: boolean
          show_stock_badge?: boolean
          slug: string
          stock_limit?: number
          stock_sold?: number
          subheadline?: string
          theme?: string
          updated_at?: string
        }
        Update: {
          benefits?: Json
          countdown_end_time?: string | null
          created_at?: string
          cta_color?: string
          cta_text?: string
          faqs?: Json
          headline?: string
          hero_image_url?: string | null
          hero_images?: Json | null
          hero_video_url?: string | null
          hero_videos?: Json | null
          hidden_sections?: Json
          id?: string
          is_published?: boolean
          media_items?: Json
          product_id?: string
          product_type?: string
          reviews?: Json
          section_order?: Json
          show_countdown?: boolean
          show_coupon?: boolean
          show_quantity?: boolean
          show_stock_badge?: boolean
          slug?: string
          stock_limit?: number
          stock_sold?: number
          subheadline?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed_at: string
          course_id: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          course_id: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          course_id?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_resources: {
        Row: {
          created_at: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          lesson_id: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          lesson_id: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          lesson_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string | null
          course_id: string
          created_at: string
          duration: string
          id: string
          lesson_type: string
          sort_order: number
          title: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string
          duration?: string
          id?: string
          lesson_type?: string
          sort_order?: number
          title: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string
          duration?: string
          id?: string
          lesson_type?: string
          sort_order?: number
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          unsubscribe_token: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          unsubscribe_token?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          unsubscribe_token?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          courier_consignment_id: string | null
          courier_provider: string | null
          courier_sent_at: string | null
          courier_status: string | null
          courier_tracking_id: string | null
          created_at: string
          customer_address: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          id: string
          is_fraud_flagged: boolean
          notes: string | null
          order_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_verified: boolean
          price: number
          product_id: string
          product_title: string
          product_type: Database["public"]["Enums"]["product_type"]
          status: Database["public"]["Enums"]["order_status"]
          transaction_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          courier_consignment_id?: string | null
          courier_provider?: string | null
          courier_sent_at?: string | null
          courier_status?: string | null
          courier_tracking_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          is_fraud_flagged?: boolean
          notes?: string | null
          order_id?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_verified?: boolean
          price: number
          product_id: string
          product_title: string
          product_type: Database["public"]["Enums"]["product_type"]
          status?: Database["public"]["Enums"]["order_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          courier_consignment_id?: string | null
          courier_provider?: string | null
          courier_sent_at?: string | null
          courier_status?: string | null
          courier_tracking_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          is_fraud_flagged?: boolean
          notes?: string | null
          order_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_verified?: boolean
          price?: number
          product_id?: string
          product_title?: string
          product_type?: Database["public"]["Enums"]["product_type"]
          status?: Database["public"]["Enums"]["order_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          mfs_type: string
          payment_instruction: string
          phone_number: string
          process_message: string
          provider: string
          qr_code_url: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          mfs_type?: string
          payment_instruction?: string
          phone_number?: string
          process_message?: string
          provider: string
          qr_code_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          mfs_type?: string
          payment_instruction?: string
          phone_number?: string
          process_message?: string
          provider?: string
          qr_code_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      public_site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          created_at: string
          id: string
          quiz_id: string
          score: number
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          quiz_id: string
          score?: number
          total_questions?: number
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          quiz_id?: string
          score?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_option: string
          explanation: string | null
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          quiz_id: string
          sort_order: number
        }
        Insert: {
          correct_option: string
          explanation?: string | null
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          quiz_id: string
          sort_order?: number
        }
        Update: {
          correct_option?: string
          explanation?: string | null
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question?: string
          quiz_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_published: boolean
          lesson_id: string | null
          negative_mark_value: number
          negative_marking: boolean
          original_price: number | null
          pass_mark: number
          price: number
          slug: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_published?: boolean
          lesson_id?: string | null
          negative_mark_value?: number
          negative_marking?: boolean
          original_price?: number | null
          pass_mark?: number
          price?: number
          slug: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_published?: boolean
          lesson_id?: string | null
          negative_mark_value?: number
          negative_marking?: boolean
          original_price?: number | null
          pass_mark?: number
          price?: number
          slug?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_progress: {
        Row: {
          book_id: string
          id: string
          last_page: number
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          id?: string
          last_page?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          id?: string
          last_page?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string
          course_id: string
          created_at: string
          id: string
          is_active: boolean
          is_admin_added: boolean
          rating: number
          reviewer_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          comment?: string
          course_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_admin_added?: boolean
          rating?: number
          reviewer_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          comment?: string
          course_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_admin_added?: boolean
          rating?: number
          reviewer_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_zones: {
        Row: {
          created_at: string
          delivery_time_max: number
          delivery_time_min: number
          delivery_time_unit: string
          free_shipping_minimum: number | null
          id: string
          is_active: boolean
          shipping_rate: number
          sort_order: number
          updated_at: string
          zone_label: string
          zone_name: string
        }
        Insert: {
          created_at?: string
          delivery_time_max?: number
          delivery_time_min?: number
          delivery_time_unit?: string
          free_shipping_minimum?: number | null
          id?: string
          is_active?: boolean
          shipping_rate?: number
          sort_order?: number
          updated_at?: string
          zone_label?: string
          zone_name: string
        }
        Update: {
          created_at?: string
          delivery_time_max?: number
          delivery_time_min?: number
          delivery_time_unit?: string
          free_shipping_minimum?: number | null
          id?: string
          is_active?: boolean
          shipping_rate?: number
          sort_order?: number
          updated_at?: string
          zone_label?: string
          zone_name?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_quiz_leaderboard: {
        Args: { _limit?: number; _quiz_id: string }
        Returns: {
          attempts_count: number
          best_score: number
          full_name: string
          last_attempt_at: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_blog_view: { Args: { post_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
      order_status:
        | "pending"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_method: "cod" | "bkash" | "nagad" | "rocket" | "upay"
      product_type: "book" | "course" | "quiz"
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
      app_role: ["admin", "user"],
      order_status: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_method: ["cod", "bkash", "nagad", "rocket", "upay"],
      product_type: ["book", "course", "quiz"],
    },
  },
} as const
