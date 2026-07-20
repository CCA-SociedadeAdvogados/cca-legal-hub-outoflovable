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
      alert_rules: {
        Row: {
          created_at: string
          custom_label: string | null
          days_before: number
          enabled: boolean
          id: string
          notify_email: boolean
          notify_platform: boolean
          organization_id: string
          rule_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_label?: string | null
          days_before?: number
          enabled?: boolean
          id?: string
          notify_email?: boolean
          notify_platform?: boolean
          organization_id: string
          rule_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_label?: string | null
          days_before?: number
          enabled?: boolean
          id?: string
          notify_email?: boolean
          notify_platform?: boolean
          organization_id?: string
          rule_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      anexos_contrato: {
        Row: {
          contrato_id: string
          descricao: string | null
          id: string
          mime_type: string | null
          nome_ficheiro: string
          tamanho_bytes: number | null
          tipo_anexo: Database["public"]["Enums"]["tipo_anexo"]
          uploaded_at: string
          uploaded_by_id: string | null
          url_ficheiro: string
        }
        Insert: {
          contrato_id: string
          descricao?: string | null
          id?: string
          mime_type?: string | null
          nome_ficheiro: string
          tamanho_bytes?: number | null
          tipo_anexo?: Database["public"]["Enums"]["tipo_anexo"]
          uploaded_at?: string
          uploaded_by_id?: string | null
          url_ficheiro: string
        }
        Update: {
          contrato_id?: string
          descricao?: string | null
          id?: string
          mime_type?: string | null
          nome_ficheiro?: string
          tamanho_bytes?: number | null
          tipo_anexo?: Database["public"]["Enums"]["tipo_anexo"]
          uploaded_at?: string
          uploaded_by_id?: string | null
          url_ficheiro?: string
        }
        Relationships: [
          {
            foreignKeyName: "anexos_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anexos_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anexos_contrato_uploaded_by_id_fkey"
            columns: ["uploaded_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anexos_contrato_uploaded_by_id_fkey"
            columns: ["uploaded_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      assunto_eventos: {
        Row: {
          assunto_id: string
          created_at: string
          created_by_id: string | null
          data: string
          descricao: string | null
          id: string
          organization_id: string
          tipo: string
          titulo: string
          visivel_cliente: boolean
        }
        Insert: {
          assunto_id: string
          created_at?: string
          created_by_id?: string | null
          data?: string
          descricao?: string | null
          id?: string
          organization_id: string
          tipo?: string
          titulo: string
          visivel_cliente?: boolean
        }
        Update: {
          assunto_id?: string
          created_at?: string
          created_by_id?: string | null
          data?: string
          descricao?: string | null
          id?: string
          organization_id?: string
          tipo?: string
          titulo?: string
          visivel_cliente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "assunto_eventos_assunto_id_fkey"
            columns: ["assunto_id"]
            isOneToOne: false
            referencedRelation: "assuntos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assunto_eventos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assunto_eventos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "assunto_eventos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home_by_organization"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      assuntos: {
        Row: {
          created_at: string
          created_by_id: string | null
          data_abertura: string
          data_conclusao: string | null
          data_prevista_conclusao: string | null
          descricao: string | null
          estado: string
          id: string
          organization_id: string
          pedido_origem_id: string | null
          referencia: string | null
          responsavel_id: string | null
          tipo: string
          titulo: string
          updated_at: string
          updated_by_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_id?: string | null
          data_abertura?: string
          data_conclusao?: string | null
          data_prevista_conclusao?: string | null
          descricao?: string | null
          estado?: string
          id?: string
          organization_id: string
          pedido_origem_id?: string | null
          referencia?: string | null
          responsavel_id?: string | null
          tipo?: string
          titulo: string
          updated_at?: string
          updated_by_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_id?: string | null
          data_abertura?: string
          data_conclusao?: string | null
          data_prevista_conclusao?: string | null
          descricao?: string | null
          estado?: string
          id?: string
          organization_id?: string
          pedido_origem_id?: string | null
          referencia?: string | null
          responsavel_id?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
          updated_by_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assuntos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assuntos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "assuntos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home_by_organization"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "assuntos_pedido_origem_id_fkey"
            columns: ["pedido_origem_id"]
            isOneToOne: false
            referencedRelation: "on_demand_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assuntos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assuntos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          organization_id: string | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      auth_activity_logs: {
        Row: {
          action: string
          auth_method: string
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          auth_method?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          auth_method?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bc_accounts: {
        Row: {
          account_category: string | null
          account_number: string | null
          account_sub_category: string | null
          account_type: string | null
          balance: number | null
          bc_id: string
          blocked: boolean | null
          config_id: string
          created_at: string | null
          display_name: string
          id: string
          organization_id: string
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          account_category?: string | null
          account_number?: string | null
          account_sub_category?: string | null
          account_type?: string | null
          balance?: number | null
          bc_id: string
          blocked?: boolean | null
          config_id: string
          created_at?: string | null
          display_name: string
          id?: string
          organization_id: string
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          account_category?: string | null
          account_number?: string | null
          account_sub_category?: string | null
          account_type?: string | null
          balance?: number | null
          bc_id?: string
          blocked?: boolean | null
          config_id?: string
          created_at?: string | null
          display_name?: string
          id?: string
          organization_id?: string
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bc_accounts_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "bc_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bc_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bc_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "bc_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home_by_organization"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      bc_config: {
        Row: {
          bc_url: string
          company_guid: string
          company_name: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_enabled: boolean | null
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          organization_id: string
          sync_interval_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          bc_url: string
          company_guid: string
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_enabled?: boolean | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          organization_id: string
          sync_interval_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          bc_url?: string
          company_guid?: string
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_enabled?: boolean | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          organization_id?: string
          sync_interval_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bc_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bc_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "vw_client_finance_home"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "bc_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "vw_client_finance_home_by_organization"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      bc_customers: {
        Row: {
          address: string | null
          balance: number | null
          bc_id: string
          bc_last_modified: string | null
          bc_number: string | null
          city: string | null
          config_id: string
          country: string | null
          created_at: string | null
          credit_limit: number | null
          currency_code: string | null
          customer_posting_group: string | null
          display_name: string
          email: string | null
          id: string
          is_deleted: boolean | null
          nif: string | null
          organization_id: string
          payment_terms_code: string | null
          phone: string | null
          post_code: string | null
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          balance?: number | null
          bc_id: string
          bc_last_modified?: string | null
          bc_number?: string | null
          city?: string | null
          config_id: string
          country?: string | null
          created_at?: string | null
          credit_limit?: number | null
          currency_code?: string | null
          customer_posting_group?: string | null
          display_name: string
          email?: string | null
          id?: string
          is_deleted?: boolean | null
          nif?: string | null
          organization_id: string
          payment_terms_code?: string | null
          phone?: string | null
          post_code?: string | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          balance?: number | null
          bc_id?: string
          bc_last_modified?: string | null
          bc_number?: string | null
          city?: string | null
          config_id?: string
          country?: string | null
          created_at?: string | null
          credit_limit?: number | null
          currency_code?: string | null
          customer_posting_group?: string | null
          display_name?: string
          email?: string | null
          id?: string
          is_deleted?: boolean | null
          nif?: string | null
          organization_id?: string
          payment_terms_code?: string | null
          phone?: string | null
          post_code?: string | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bc_customers_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "bc_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bc_customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bc_customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "bc_customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home_by_organization"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      bc_ledger: {
        Row: {
          amount: number | null
          bc_entry_number: number | null
          config_id: string
          created_at: string | null
          currency_code: string | null
          customer_bc_id: string | null
          customer_number: string | null
          description: string | null
          document_number: string | null
          document_type: string | null
          due_date: string | null
          id: string
          is_open: boolean | null
          organization_id: string
          posting_date: string | null
          posting_group: string | null
          remaining_amount: number | null
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          bc_entry_number?: number | null
          config_id: string
          created_at?: string | null
          currency_code?: string | null
          customer_bc_id?: string | null
          customer_number?: string | null
          description?: string | null
          document_number?: string | null
          document_type?: string | null
          due_date?: string | null
          id?: string
          is_open?: boolean | null
          organization_id: string
          posting_date?: string | null
          posting_group?: string | null
          remaining_amount?: number | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          bc_entry_number?: number | null
          config_id?: string
          created_at?: string | null
          currency_code?: string | null
          customer_bc_id?: string | null
          customer_number?: string | null
          description?: string | null
          document_number?: string | null
          document_type?: string | null
          due_date?: string | null
          id?: string
          is_open?: boolean | null
          organization_id?: string
          posting_date?: string | null
          posting_group?: string | null
          remaining_amount?: number | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bc_ledger_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "bc_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bc_ledger_customer_bc_id_fkey"
            columns: ["customer_bc_id"]
            isOneToOne: false
            referencedRelation: "bc_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bc_ledger_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bc_ledger_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "bc_ledger_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home_by_organization"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      bc_sync_logs: {
        Row: {
          accounts_synced: number | null
          completed_at: string | null
          config_id: string
          customers_synced: number | null
          error_message: string | null
          id: string
          ledger_entries_synced: number | null
          organization_id: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          accounts_synced?: number | null
          completed_at?: string | null
          config_id: string
          customers_synced?: number | null
          error_message?: string | null
          id?: string
          ledger_entries_synced?: number | null
          organization_id: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          accounts_synced?: number | null
          completed_at?: string | null
          config_id?: string
          customers_synced?: number | null
          error_message?: string | null
          id?: string
          ledger_entries_synced?: number | null
          organization_id?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bc_sync_logs_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "bc_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bc_sync_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bc_sync_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "bc_sync_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home_by_organization"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      cca_internal_users: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      cca_news: {
        Row: {
          anexos: Json | null
          conteudo: string
          created_at: string | null
          created_by_id: string | null
          data_publicacao: string | null
          estado: string
          external_id: string | null
          external_url: string | null
          id: string
          links: Json | null
          organization_id: string | null
          resumo: string | null
          sectors: string[]
          source: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          anexos?: Json | null
          conteudo: string
          created_at?: string | null
          created_by_id?: string | null
          data_publicacao?: string | null
          estado?: string
          external_id?: string | null
          external_url?: string | null
          id?: string
          links?: Json | null
          organization_id?: string | null
          resumo?: string | null
          sectors?: string[]
          source?: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          anexos?: Json | null
          conteudo?: string
          created_at?: string | null
          created_by_id?: string | null
          data_publicacao?: string | null
          estado?: string
          external_id?: string | null
          external_url?: string | null
          id?: string
          links?: Json | null
          organization_id?: string | null
          resumo?: string | null
          sectors?: string[]
          source?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      client_content_blocks: {
        Row: {
          content: string | null
          content_key: string
          content_type: string | null
          created_at: string | null
          id: string
          media_refs: Json | null
          organization_id: string
          title: string | null
          updated_at: string | null
          updated_by_id: string | null
        }
        Insert: {
          content?: string | null
          content_key: string
          content_type?: string | null
          created_at?: string | null
          id?: string
          media_refs?: Json | null
          organization_id: string
          title?: string | null
          updated_at?: string | null
          updated_by_id?: string | null
        }
        Update: {
          content?: string | null
          content_key?: string
          content_type?: string | null
          created_at?: string | null
          id?: string
          media_refs?: Json | null
          organization_id?: string
          title?: string | null
          updated_at?: string | null
          updated_by_id?: string | null
        }
        Relationships: []
      }
      client_document_text: {
        Row: {
          char_count: number
          content: string
          content_tsv: unknown
          extracted_at: string
          folder_path: string | null
          id: string
          name: string
          organization_id: string
          sharepoint_document_id: string | null
          source_modified_at: string | null
          web_url: string | null
        }
        Insert: {
          char_count?: number
          content?: string
          content_tsv?: unknown
          extracted_at?: string
          folder_path?: string | null
          id?: string
          name: string
          organization_id: string
          sharepoint_document_id?: string | null
          source_modified_at?: string | null
          web_url?: string | null
        }
        Update: {
          char_count?: number
          content?: string
          content_tsv?: unknown
          extracted_at?: string
          folder_path?: string | null
          id?: string
          name?: string
          organization_id?: string
          sharepoint_document_id?: string | null
          source_modified_at?: string | null
          web_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_document_text_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_document_text_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "client_document_text_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home_by_organization"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "client_document_text_sharepoint_document_id_fkey"
            columns: ["sharepoint_document_id"]
            isOneToOne: false
            referencedRelation: "sharepoint_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      client_folders: {
        Row: {
          created_at: string | null
          created_by_id: string | null
          descricao: string | null
          estado: string
          id: string
          module: string
          nome: string
          organization_id: string
          parent_id: string | null
          path: string[] | null
          sharepoint_url: string | null
          sort_order: number | null
          tags: string[] | null
          updated_at: string | null
          updated_by_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_id?: string | null
          descricao?: string | null
          estado?: string
          id?: string
          module?: string
          nome: string
          organization_id: string
          parent_id?: string | null
          path?: string[] | null
          sharepoint_url?: string | null
          sort_order?: number | null
          tags?: string[] | null
          updated_at?: string | null
          updated_by_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_id?: string | null
          descricao?: string | null
          estado?: string
          id?: string
          module?: string
          nome?: string
          organization_id?: string
          parent_id?: string | null
          path?: string[] | null
          sharepoint_url?: string | null
          sort_order?: number | null
          tags?: string[] | null
          updated_at?: string | null
          updated_by_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_folders_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_folders_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "client_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_folders_updated_by_id_fkey"
            columns: ["updated_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_folders_updated_by_id_fkey"
            columns: ["updated_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      client_home_config: {
        Row: {
          created_at: string | null
          id: string
          layout_draft: Json | null
          layout_published: Json | null
          organization_id: string
          published_at: string | null
          published_by_id: string | null
          schema_version: number | null
          updated_at: string | null
          updated_by_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          layout_draft?: Json | null
          layout_published?: Json | null
          organization_id: string
          published_at?: string | null
          published_by_id?: string | null
          schema_version?: number | null
          updated_at?: string | null
          updated_by_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          layout_draft?: Json | null
          layout_published?: Json | null
          organization_id?: string
          published_at?: string | null
          published_by_id?: string | null
          schema_version?: number | null
          updated_at?: string | null
          updated_by_id?: string | null
        }
        Relationships: []
      }
      contract_ai_diffs: {
        Row: {
          canonical_value: Json | null
          contract_id: string
          created_at: string
          draft_value: Json | null
          field_path: string
          id: string
          job_id: string | null
        }
        Insert: {
          canonical_value?: Json | null
          contract_id: string
          created_at?: string
          draft_value?: Json | null
          field_path: string
          id?: string
          job_id?: string | null
        }
        Update: {
          canonical_value?: Json | null
          contract_id?: string
          created_at?: string
          draft_value?: Json | null
          field_path?: string
          id?: string
          job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_ai_diffs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "contract_ai_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_ai_extractions: {
        Row: {
          contract_id: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          model_info: Json | null
          payload: Json
          status: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          model_info?: Json | null
          payload?: Json
          status?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          model_info?: Json | null
          payload?: Json
          status?: string
        }
        Relationships: []
      }
      contract_ai_jobs: {
        Row: {
          canonical_extraction_id: string | null
          contract_id: string
          draft_extraction_id: string | null
          error: string | null
          finished_at: string | null
          id: string
          started_at: string
          status: string
        }
        Insert: {
          canonical_extraction_id?: string | null
          contract_id: string
          draft_extraction_id?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
        }
        Update: {
          canonical_extraction_id?: string | null
          contract_id?: string
          draft_extraction_id?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_ai_jobs_canonical_extraction_id_fkey"
            columns: ["canonical_extraction_id"]
            isOneToOne: false
            referencedRelation: "contract_ai_extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_ai_jobs_draft_extraction_id_fkey"
            columns: ["draft_extraction_id"]
            isOneToOne: false
            referencedRelation: "contract_ai_extractions"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_audit_log: {
        Row: {
          action: string
          contract_id: string
          created_at: string
          created_by: string | null
          details: Json | null
          id: string
        }
        Insert: {
          action: string
          contract_id: string
          created_at?: string
          created_by?: string | null
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string
          contract_id?: string
          created_at?: string
          created_by?: string | null
          details?: Json | null
          id?: string
        }
        Relationships: []
      }
      contract_compliance_analyses: {
        Row: {
          ai_model_used: string | null
          confianca: number | null
          contrato_id: string
          created_at: string | null
          created_by_id: string | null
          eventos_verificados: Json
          id: string
          organization_id: string | null
          proximos_passos: string[] | null
          recomendacoes_gerais: string[] | null
          resumo_contrato: string | null
          status_global: string | null
          sumario_geral: Json
          texto_analisado_hash: string | null
        }
        Insert: {
          ai_model_used?: string | null
          confianca?: number | null
          contrato_id: string
          created_at?: string | null
          created_by_id?: string | null
          eventos_verificados?: Json
          id?: string
          organization_id?: string | null
          proximos_passos?: string[] | null
          recomendacoes_gerais?: string[] | null
          resumo_contrato?: string | null
          status_global?: string | null
          sumario_geral?: Json
          texto_analisado_hash?: string | null
        }
        Update: {
          ai_model_used?: string | null
          confianca?: number | null
          contrato_id?: string
          created_at?: string | null
          created_by_id?: string | null
          eventos_verificados?: Json
          id?: string
          organization_id?: string | null
          proximos_passos?: string[] | null
          recomendacoes_gerais?: string[] | null
          resumo_contrato?: string | null
          status_global?: string | null
          sumario_geral?: Json
          texto_analisado_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_compliance_analyses_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: true
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_compliance_analyses_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: true
            referencedRelation: "contratos_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_compliance_analyses_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_compliance_analyses_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_extractions: {
        Row: {
          classificacao_juridica: Json | null
          confidence: number | null
          contrato_id: string
          created_at: string
          created_by_id: string | null
          denuncia_rescisao: Json | null
          diff_from_draft: Json | null
          error_message: string | null
          evidence: Json | null
          extraction_data: Json
          foro_arbitragem: string | null
          id: string
          job_completed_at: string | null
          job_id: string | null
          job_started_at: string | null
          lei_aplicavel: string | null
          prazos: Json | null
          review_notes: string | null
          rgpd_summary: Json | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          classificacao_juridica?: Json | null
          confidence?: number | null
          contrato_id: string
          created_at?: string
          created_by_id?: string | null
          denuncia_rescisao?: Json | null
          diff_from_draft?: Json | null
          error_message?: string | null
          evidence?: Json | null
          extraction_data?: Json
          foro_arbitragem?: string | null
          id?: string
          job_completed_at?: string | null
          job_id?: string | null
          job_started_at?: string | null
          lei_aplicavel?: string | null
          prazos?: Json | null
          review_notes?: string | null
          rgpd_summary?: Json | null
          source: string
          status?: string
          updated_at?: string
        }
        Update: {
          classificacao_juridica?: Json | null
          confidence?: number | null
          contrato_id?: string
          created_at?: string
          created_by_id?: string | null
          denuncia_rescisao?: Json | null
          diff_from_draft?: Json | null
          error_message?: string | null
          evidence?: Json | null
          extraction_data?: Json
          foro_arbitragem?: string | null
          id?: string
          job_completed_at?: string | null
          job_id?: string | null
          job_started_at?: string | null
          lei_aplicavel?: string | null
          prazos?: Json | null
          review_notes?: string | null
          rgpd_summary?: Json | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_extractions_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_extractions_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_extractions_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_extractions_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_normativos: {
        Row: {
          contrato_id: string
          created_at: string
          created_by_id: string | null
          documento_id: string
          id: string
          motivo_associacao: string | null
          relevancia_score: number | null
          tipo_associacao: string | null
        }
        Insert: {
          contrato_id: string
          created_at?: string
          created_by_id?: string | null
          documento_id: string
          id?: string
          motivo_associacao?: string | null
          relevancia_score?: number | null
          tipo_associacao?: string | null
        }
        Update: {
          contrato_id?: string
          created_at?: string
          created_by_id?: string | null
          documento_id?: string
          id?: string
          motivo_associacao?: string | null
          relevancia_score?: number | null
          tipo_associacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contrato_normativos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_normativos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_normativos_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_normativos_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          alerta_renovacao_30_dias: boolean | null
          alerta_renovacao_60_dias: boolean | null
          alerta_renovacao_90_dias: boolean | null
          aprovadores_internos: string | null
          areas_direito_aplicaveis: string[] | null
          arquivado: boolean | null
          arquivo_mime_type: string | null
          arquivo_nome_original: string | null
          arquivo_storage_path: string | null
          aviso_previo_nao_renovacao_dias: number | null
          base_legal_transferencia: string | null
          categorias_dados_pessoais: string | null
          categorias_titulares: string | null
          centro_custo: string | null
          clausula_indemnizacao: boolean | null
          clausula_indemnizacao_resumo: string | null
          comentarios_aprovacao: string | null
          condicoes_subcontratacao: string | null
          contacto_comercial_email: string | null
          contacto_comercial_nome: string | null
          contacto_comercial_telefone: string | null
          contacto_faturacao_email: string | null
          contacto_faturacao_nome: string | null
          contacto_legal_email: string | null
          contacto_legal_nome: string | null
          contacto_operacional_email: string | null
          contacto_operacional_nome: string | null
          contratos_relacionados: string | null
          created_at: string
          created_by_id: string | null
          data_assinatura_parte_a: string | null
          data_assinatura_parte_b: string | null
          data_conclusao_assinatura: string | null
          data_inicio_vigencia: string | null
          data_limite_decisao_renovacao: string | null
          data_termo: string | null
          departamento_responsavel: Database["public"]["Enums"]["departamento"]
          dpia_realizada: boolean | null
          estado_aprovacao:
            | Database["public"]["Enums"]["estado_aprovacao"]
            | null
          estado_contrato: Database["public"]["Enums"]["estado_contrato"]
          estrutura_precos:
            | Database["public"]["Enums"]["estrutura_precos"]
            | null
          existe_dpa_anexo_rgpd: boolean | null
          extraido_json: Json | null
          ferramenta_assinatura: string | null
          flag_confidencialidade: boolean | null
          flag_direito_subcontratar: boolean | null
          flag_exclusividade: boolean | null
          flag_nao_concorrencia: boolean | null
          garantia_data_validade: string | null
          garantia_existente: boolean | null
          garantia_tipo: Database["public"]["Enums"]["tipo_garantia"] | null
          garantia_valor: number | null
          id: string
          id_interno: string
          iniciado_por_id: string | null
          limite_responsabilidade: string | null
          metodo_assinatura:
            | Database["public"]["Enums"]["metodo_assinatura"]
            | null
          moeda: string | null
          motivo_ultima_alteracao: string | null
          nivel_risco: string | null
          numero_adendas: number | null
          numero_encomenda_po: string | null
          objeto_resumido: string | null
          obrigacoes_parte_a: string | null
          obrigacoes_parte_b: string | null
          observacoes_ultima_revisao: string | null
          organization_id: string | null
          paises_transferencia: string | null
          papel_entidade: Database["public"]["Enums"]["papel_entidade"] | null
          parte_a_morada: string | null
          parte_a_nif: string | null
          parte_a_nome_legal: string
          parte_a_pais: string | null
          parte_b_grupo_economico: string | null
          parte_b_morada: string | null
          parte_b_nif: string | null
          parte_b_nome_legal: string
          parte_b_pais: string | null
          periodicidade_faturacao:
            | Database["public"]["Enums"]["periodicidade_faturacao"]
            | null
          prazo_pagamento_dias: number | null
          prazos_denuncia_rescisao: string | null
          referencia_dpa: string | null
          referencia_dpia: string | null
          renovacao_periodo_meses: number | null
          responsavel_interno_id: string | null
          responsavel_revisao_renovacao_id: string | null
          resultado_ultima_revisao:
            | Database["public"]["Enums"]["resultado_revisao"]
            | null
          sla_kpi_resumo: string | null
          tipo_contrato: Database["public"]["Enums"]["tipo_contrato"]
          tipo_contrato_personalizado: string | null
          tipo_duracao: Database["public"]["Enums"]["tipo_duracao"]
          tipo_renovacao: Database["public"]["Enums"]["tipo_renovacao"]
          titulo_contrato: string
          transferencia_internacional: boolean | null
          tratamento_dados_pessoais: boolean | null
          updated_at: string
          updated_by_id: string | null
          validation_status: string | null
          valor_anual_recorrente: number | null
          valor_total_estimado: number | null
          versao_actual: number | null
        }
        Insert: {
          alerta_renovacao_30_dias?: boolean | null
          alerta_renovacao_60_dias?: boolean | null
          alerta_renovacao_90_dias?: boolean | null
          aprovadores_internos?: string | null
          areas_direito_aplicaveis?: string[] | null
          arquivado?: boolean | null
          arquivo_mime_type?: string | null
          arquivo_nome_original?: string | null
          arquivo_storage_path?: string | null
          aviso_previo_nao_renovacao_dias?: number | null
          base_legal_transferencia?: string | null
          categorias_dados_pessoais?: string | null
          categorias_titulares?: string | null
          centro_custo?: string | null
          clausula_indemnizacao?: boolean | null
          clausula_indemnizacao_resumo?: string | null
          comentarios_aprovacao?: string | null
          condicoes_subcontratacao?: string | null
          contacto_comercial_email?: string | null
          contacto_comercial_nome?: string | null
          contacto_comercial_telefone?: string | null
          contacto_faturacao_email?: string | null
          contacto_faturacao_nome?: string | null
          contacto_legal_email?: string | null
          contacto_legal_nome?: string | null
          contacto_operacional_email?: string | null
          contacto_operacional_nome?: string | null
          contratos_relacionados?: string | null
          created_at?: string
          created_by_id?: string | null
          data_assinatura_parte_a?: string | null
          data_assinatura_parte_b?: string | null
          data_conclusao_assinatura?: string | null
          data_inicio_vigencia?: string | null
          data_limite_decisao_renovacao?: string | null
          data_termo?: string | null
          departamento_responsavel?: Database["public"]["Enums"]["departamento"]
          dpia_realizada?: boolean | null
          estado_aprovacao?:
            | Database["public"]["Enums"]["estado_aprovacao"]
            | null
          estado_contrato?: Database["public"]["Enums"]["estado_contrato"]
          estrutura_precos?:
            | Database["public"]["Enums"]["estrutura_precos"]
            | null
          existe_dpa_anexo_rgpd?: boolean | null
          extraido_json?: Json | null
          ferramenta_assinatura?: string | null
          flag_confidencialidade?: boolean | null
          flag_direito_subcontratar?: boolean | null
          flag_exclusividade?: boolean | null
          flag_nao_concorrencia?: boolean | null
          garantia_data_validade?: string | null
          garantia_existente?: boolean | null
          garantia_tipo?: Database["public"]["Enums"]["tipo_garantia"] | null
          garantia_valor?: number | null
          id?: string
          id_interno: string
          iniciado_por_id?: string | null
          limite_responsabilidade?: string | null
          metodo_assinatura?:
            | Database["public"]["Enums"]["metodo_assinatura"]
            | null
          moeda?: string | null
          motivo_ultima_alteracao?: string | null
          nivel_risco?: string | null
          numero_adendas?: number | null
          numero_encomenda_po?: string | null
          objeto_resumido?: string | null
          obrigacoes_parte_a?: string | null
          obrigacoes_parte_b?: string | null
          observacoes_ultima_revisao?: string | null
          organization_id?: string | null
          paises_transferencia?: string | null
          papel_entidade?: Database["public"]["Enums"]["papel_entidade"] | null
          parte_a_morada?: string | null
          parte_a_nif?: string | null
          parte_a_nome_legal: string
          parte_a_pais?: string | null
          parte_b_grupo_economico?: string | null
          parte_b_morada?: string | null
          parte_b_nif?: string | null
          parte_b_nome_legal: string
          parte_b_pais?: string | null
          periodicidade_faturacao?:
            | Database["public"]["Enums"]["periodicidade_faturacao"]
            | null
          prazo_pagamento_dias?: number | null
          prazos_denuncia_rescisao?: string | null
          referencia_dpa?: string | null
          referencia_dpia?: string | null
          renovacao_periodo_meses?: number | null
          responsavel_interno_id?: string | null
          responsavel_revisao_renovacao_id?: string | null
          resultado_ultima_revisao?:
            | Database["public"]["Enums"]["resultado_revisao"]
            | null
          sla_kpi_resumo?: string | null
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
          tipo_contrato_personalizado?: string | null
          tipo_duracao?: Database["public"]["Enums"]["tipo_duracao"]
          tipo_renovacao?: Database["public"]["Enums"]["tipo_renovacao"]
          titulo_contrato: string
          transferencia_internacional?: boolean | null
          tratamento_dados_pessoais?: boolean | null
          updated_at?: string
          updated_by_id?: string | null
          validation_status?: string | null
          valor_anual_recorrente?: number | null
          valor_total_estimado?: number | null
          versao_actual?: number | null
        }
        Update: {
          alerta_renovacao_30_dias?: boolean | null
          alerta_renovacao_60_dias?: boolean | null
          alerta_renovacao_90_dias?: boolean | null
          aprovadores_internos?: string | null
          areas_direito_aplicaveis?: string[] | null
          arquivado?: boolean | null
          arquivo_mime_type?: string | null
          arquivo_nome_original?: string | null
          arquivo_storage_path?: string | null
          aviso_previo_nao_renovacao_dias?: number | null
          base_legal_transferencia?: string | null
          categorias_dados_pessoais?: string | null
          categorias_titulares?: string | null
          centro_custo?: string | null
          clausula_indemnizacao?: boolean | null
          clausula_indemnizacao_resumo?: string | null
          comentarios_aprovacao?: string | null
          condicoes_subcontratacao?: string | null
          contacto_comercial_email?: string | null
          contacto_comercial_nome?: string | null
          contacto_comercial_telefone?: string | null
          contacto_faturacao_email?: string | null
          contacto_faturacao_nome?: string | null
          contacto_legal_email?: string | null
          contacto_legal_nome?: string | null
          contacto_operacional_email?: string | null
          contacto_operacional_nome?: string | null
          contratos_relacionados?: string | null
          created_at?: string
          created_by_id?: string | null
          data_assinatura_parte_a?: string | null
          data_assinatura_parte_b?: string | null
          data_conclusao_assinatura?: string | null
          data_inicio_vigencia?: string | null
          data_limite_decisao_renovacao?: string | null
          data_termo?: string | null
          departamento_responsavel?: Database["public"]["Enums"]["departamento"]
          dpia_realizada?: boolean | null
          estado_aprovacao?:
            | Database["public"]["Enums"]["estado_aprovacao"]
            | null
          estado_contrato?: Database["public"]["Enums"]["estado_contrato"]
          estrutura_precos?:
            | Database["public"]["Enums"]["estrutura_precos"]
            | null
          existe_dpa_anexo_rgpd?: boolean | null
          extraido_json?: Json | null
          ferramenta_assinatura?: string | null
          flag_confidencialidade?: boolean | null
          flag_direito_subcontratar?: boolean | null
          flag_exclusividade?: boolean | null
          flag_nao_concorrencia?: boolean | null
          garantia_data_validade?: string | null
          garantia_existente?: boolean | null
          garantia_tipo?: Database["public"]["Enums"]["tipo_garantia"] | null
          garantia_valor?: number | null
          id?: string
          id_interno?: string
          iniciado_por_id?: string | null
          limite_responsabilidade?: string | null
          metodo_assinatura?:
            | Database["public"]["Enums"]["metodo_assinatura"]
            | null
          moeda?: string | null
          motivo_ultima_alteracao?: string | null
          nivel_risco?: string | null
          numero_adendas?: number | null
          numero_encomenda_po?: string | null
          objeto_resumido?: string | null
          obrigacoes_parte_a?: string | null
          obrigacoes_parte_b?: string | null
          observacoes_ultima_revisao?: string | null
          organization_id?: string | null
          paises_transferencia?: string | null
          papel_entidade?: Database["public"]["Enums"]["papel_entidade"] | null
          parte_a_morada?: string | null
          parte_a_nif?: string | null
          parte_a_nome_legal?: string
          parte_a_pais?: string | null
          parte_b_grupo_economico?: string | null
          parte_b_morada?: string | null
          parte_b_nif?: string | null
          parte_b_nome_legal?: string
          parte_b_pais?: string | null
          periodicidade_faturacao?:
            | Database["public"]["Enums"]["periodicidade_faturacao"]
            | null
          prazo_pagamento_dias?: number | null
          prazos_denuncia_rescisao?: string | null
          referencia_dpa?: string | null
          referencia_dpia?: string | null
          renovacao_periodo_meses?: number | null
          responsavel_interno_id?: string | null
          responsavel_revisao_renovacao_id?: string | null
          resultado_ultima_revisao?:
            | Database["public"]["Enums"]["resultado_revisao"]
            | null
          sla_kpi_resumo?: string | null
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
          tipo_contrato_personalizado?: string | null
          tipo_duracao?: Database["public"]["Enums"]["tipo_duracao"]
          tipo_renovacao?: Database["public"]["Enums"]["tipo_renovacao"]
          titulo_contrato?: string
          transferencia_internacional?: boolean | null
          tratamento_dados_pessoais?: boolean | null
          updated_at?: string
          updated_by_id?: string | null
          validation_status?: string | null
          valor_anual_recorrente?: number | null
          valor_total_estimado?: number | null
          versao_actual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_iniciado_por_id_fkey"
            columns: ["iniciado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_iniciado_por_id_fkey"
            columns: ["iniciado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_responsavel_interno_id_fkey"
            columns: ["responsavel_interno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_responsavel_interno_id_fkey"
            columns: ["responsavel_interno_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_responsavel_revisao_renovacao_id_fkey"
            columns: ["responsavel_revisao_renovacao_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_responsavel_revisao_renovacao_id_fkey"
            columns: ["responsavel_revisao_renovacao_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_updated_by_id_fkey"
            columns: ["updated_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_updated_by_id_fkey"
            columns: ["updated_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      data_retention_policies: {
        Row: {
          created_at: string
          date_column: string
          deletion_type: string
          enabled: boolean
          id: string
          last_deleted_count: number | null
          last_run_at: string | null
          retention_days: number
          table_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_column?: string
          deletion_type: string
          enabled?: boolean
          id?: string
          last_deleted_count?: number | null
          last_run_at?: string | null
          retention_days: number
          table_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_column?: string
          deletion_type?: string
          enabled?: boolean
          id?: string
          last_deleted_count?: number | null
          last_run_at?: string | null
          retention_days?: number
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          created_by_id: string | null
          id: string
          is_default: boolean
          is_system: boolean
          name: string
          organization_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_id?: string | null
          id?: string
          is_default?: boolean
          is_system?: boolean
          name: string
          organization_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_id?: string | null
          id?: string
          is_default?: boolean
          is_system?: boolean
          name?: string
          organization_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      document_checklist_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_required: boolean | null
          name: string
          name_en: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          name: string
          name_en?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          name?: string
          name_en?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      documentos_gerados: {
        Row: {
          assinantes: Json | null
          contrato_id: string | null
          created_at: string
          created_by_id: string | null
          estado_assinatura: string
          id: string
          mime_type: string | null
          modulo: string
          nome: string
          organization_id: string | null
          tamanho_bytes: number | null
          template_id: string | null
          tipo: string
          updated_at: string
          url_ficheiro: string | null
        }
        Insert: {
          assinantes?: Json | null
          contrato_id?: string | null
          created_at?: string
          created_by_id?: string | null
          estado_assinatura?: string
          id?: string
          mime_type?: string | null
          modulo?: string
          nome: string
          organization_id?: string | null
          tamanho_bytes?: number | null
          template_id?: string | null
          tipo?: string
          updated_at?: string
          url_ficheiro?: string | null
        }
        Update: {
          assinantes?: Json | null
          contrato_id?: string | null
          created_at?: string
          created_by_id?: string | null
          estado_assinatura?: string
          id?: string
          mime_type?: string | null
          modulo?: string
          nome?: string
          organization_id?: string | null
          tamanho_bytes?: number | null
          template_id?: string | null
          tipo?: string
          updated_at?: string
          url_ficheiro?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_gerados_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_gerados_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_gerados_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_gerados_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_gerados_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      dsar_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          ip_address: string | null
          reason: string | null
          request_type: string
          scheduled_execution_at: string | null
          status: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          request_type: string
          scheduled_execution_at?: string | null
          status?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          request_type?: string
          scheduled_execution_at?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_mfa_codes: {
        Row: {
          attempt_count: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown
          purpose: string
          used_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          attempt_count?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown
          purpose: string
          used_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          attempt_count?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          purpose?: string
          used_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_mfa_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_mfa_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_ciclo_vida_contrato: {
        Row: {
          contrato_id: string
          created_at: string
          criado_por_id: string | null
          data_evento: string
          descricao: string | null
          id: string
          tipo_evento: Database["public"]["Enums"]["tipo_evento_ciclo_vida"]
        }
        Insert: {
          contrato_id: string
          created_at?: string
          criado_por_id?: string | null
          data_evento?: string
          descricao?: string | null
          id?: string
          tipo_evento: Database["public"]["Enums"]["tipo_evento_ciclo_vida"]
        }
        Update: {
          contrato_id?: string
          created_at?: string
          criado_por_id?: string | null
          data_evento?: string
          descricao?: string | null
          id?: string
          tipo_evento?: Database["public"]["Enums"]["tipo_evento_ciclo_vida"]
        }
        Relationships: [
          {
            foreignKeyName: "eventos_ciclo_vida_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_ciclo_vida_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_ciclo_vida_contrato_criado_por_id_fkey"
            columns: ["criado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_ciclo_vida_contrato_criado_por_id_fkey"
            columns: ["criado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_legislativos: {
        Row: {
          area_direito: Database["public"]["Enums"]["area_direito"]
          created_at: string
          created_by_id: string | null
          data_entrada_vigor: string | null
          data_publicacao: string | null
          descricao_resumo: string | null
          estado: Database["public"]["Enums"]["estado_evento"]
          id: string
          jurisdicao: Database["public"]["Enums"]["jurisdicao"]
          link_oficial: string | null
          organization_id: string | null
          referencia_legal: string | null
          tags: string[] | null
          titulo: string
          updated_at: string
          updated_by_id: string | null
        }
        Insert: {
          area_direito?: Database["public"]["Enums"]["area_direito"]
          created_at?: string
          created_by_id?: string | null
          data_entrada_vigor?: string | null
          data_publicacao?: string | null
          descricao_resumo?: string | null
          estado?: Database["public"]["Enums"]["estado_evento"]
          id?: string
          jurisdicao?: Database["public"]["Enums"]["jurisdicao"]
          link_oficial?: string | null
          organization_id?: string | null
          referencia_legal?: string | null
          tags?: string[] | null
          titulo: string
          updated_at?: string
          updated_by_id?: string | null
        }
        Update: {
          area_direito?: Database["public"]["Enums"]["area_direito"]
          created_at?: string
          created_by_id?: string | null
          data_entrada_vigor?: string | null
          data_publicacao?: string | null
          descricao_resumo?: string | null
          estado?: Database["public"]["Enums"]["estado_evento"]
          id?: string
          jurisdicao?: Database["public"]["Enums"]["jurisdicao"]
          link_oficial?: string | null
          organization_id?: string | null
          referencia_legal?: string | null
          tags?: string[] | null
          titulo?: string
          updated_at?: string
          updated_by_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_legislativos_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_legislativos_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_legislativos_updated_by_id_fkey"
            columns: ["updated_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_legislativos_updated_by_id_fkey"
            columns: ["updated_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      financeiro_nav_cache: {
        Row: {
          data_vencimento: string | null
          id: string
          jvris_id: string
          raw_row: Json | null
          synced_at: string | null
          valor_pendente: number | null
        }
        Insert: {
          data_vencimento?: string | null
          id?: string
          jvris_id: string
          raw_row?: Json | null
          synced_at?: string | null
          valor_pendente?: number | null
        }
        Update: {
          data_vencimento?: string | null
          id?: string
          jvris_id?: string
          raw_row?: Json | null
          synced_at?: string | null
          valor_pendente?: number | null
        }
        Relationships: []
      }
      financeiro_nav_items: {
        Row: {
          data_vencimento: string | null
          descricao: string | null
          id: string
          jvris_id: string
          numero_documento: string | null
          raw_row: Json | null
          synced_at: string | null
          valor: number | null
        }
        Insert: {
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          jvris_id: string
          numero_documento?: string | null
          raw_row?: Json | null
          synced_at?: string | null
          valor?: number | null
        }
        Update: {
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          jvris_id?: string
          numero_documento?: string | null
          raw_row?: Json | null
          synced_at?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      financial_clients: {
        Row: {
          client_code: string | null
          client_name: string | null
          created_at: string
          id: string
          jvris_id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          client_code?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          jvris_id: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          client_code?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          jvris_id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "financial_clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home_by_organization"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      folder_items: {
        Row: {
          created_at: string | null
          created_by_id: string | null
          folder_id: string
          id: string
          item_id: string
          item_type: string
        }
        Insert: {
          created_at?: string | null
          created_by_id?: string | null
          folder_id: string
          id?: string
          item_id: string
          item_type: string
        }
        Update: {
          created_at?: string | null
          created_by_id?: string | null
          folder_id?: string
          id?: string
          item_id?: string
          item_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "folder_items_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folder_items_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folder_items_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "client_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      impactos: {
        Row: {
          contrato_id: string | null
          created_at: string
          created_by_id: string | null
          data_identificacao: string
          data_resolucao: string | null
          descricao: string | null
          estado: Database["public"]["Enums"]["estado_impacto"]
          evento_legislativo_id: string
          id: string
          nivel_risco: Database["public"]["Enums"]["nivel_risco"]
          observacoes: string | null
          organization_id: string | null
          resolvido_por_id: string | null
          updated_at: string
          updated_by_id: string | null
        }
        Insert: {
          contrato_id?: string | null
          created_at?: string
          created_by_id?: string | null
          data_identificacao?: string
          data_resolucao?: string | null
          descricao?: string | null
          estado?: Database["public"]["Enums"]["estado_impacto"]
          evento_legislativo_id: string
          id?: string
          nivel_risco?: Database["public"]["Enums"]["nivel_risco"]
          observacoes?: string | null
          organization_id?: string | null
          resolvido_por_id?: string | null
          updated_at?: string
          updated_by_id?: string | null
        }
        Update: {
          contrato_id?: string | null
          created_at?: string
          created_by_id?: string | null
          data_identificacao?: string
          data_resolucao?: string | null
          descricao?: string | null
          estado?: Database["public"]["Enums"]["estado_impacto"]
          evento_legislativo_id?: string
          id?: string
          nivel_risco?: Database["public"]["Enums"]["nivel_risco"]
          observacoes?: string | null
          organization_id?: string | null
          resolvido_por_id?: string | null
          updated_at?: string
          updated_by_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impactos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impactos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impactos_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impactos_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impactos_evento_legislativo_id_fkey"
            columns: ["evento_legislativo_id"]
            isOneToOne: false
            referencedRelation: "eventos_legislativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impactos_resolvido_por_id_fkey"
            columns: ["resolvido_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impactos_resolvido_por_id_fkey"
            columns: ["resolvido_por_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_sessions: {
        Row: {
          created_at: string | null
          ended_at: string | null
          id: string
          impersonated_organization_id: string | null
          impersonated_user_id: string | null
          impersonated_user_name: string | null
          ip_address: string | null
          real_user_id: string
          reason: string
          session_notes: string | null
          started_at: string
          status: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          impersonated_organization_id?: string | null
          impersonated_user_id?: string | null
          impersonated_user_name?: string | null
          ip_address?: string | null
          real_user_id: string
          reason: string
          session_notes?: string | null
          started_at?: string
          status?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          impersonated_organization_id?: string | null
          impersonated_user_id?: string | null
          impersonated_user_name?: string | null
          ip_address?: string | null
          real_user_id?: string
          reason?: string
          session_notes?: string | null
          started_at?: string
          status?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_sessions_impersonated_user_id_fkey"
            columns: ["impersonated_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_sessions_impersonated_user_id_fkey"
            columns: ["impersonated_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      intranet_news_subscription: {
        Row: {
          client_state: string | null
          created_at: string
          expiration_at: string
          id: string
          last_synced_at: string | null
          resource: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          client_state?: string | null
          created_at?: string
          expiration_at: string
          id?: string
          last_synced_at?: string | null
          resource: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          client_state?: string | null
          created_at?: string
          expiration_at?: string
          id?: string
          last_synced_at?: string | null
          resource?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string | null
          data_emissao: string
          estado: string
          id: string
          moeda: string | null
          notas: string | null
          numero: string
          organization_id: string
          periodo_fim: string | null
          periodo_inicio: string | null
          updated_at: string | null
          url_ficheiro: string | null
          valor: number
        }
        Insert: {
          created_at?: string | null
          data_emissao: string
          estado?: string
          id?: string
          moeda?: string | null
          notas?: string | null
          numero: string
          organization_id: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          updated_at?: string | null
          url_ficheiro?: string | null
          valor: number
        }
        Update: {
          created_at?: string | null
          data_emissao?: string
          estado?: string
          id?: string
          moeda?: string | null
          notas?: string | null
          numero?: string
          organization_id?: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          updated_at?: string | null
          url_ficheiro?: string | null
          valor?: number
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          channel_email: boolean | null
          channel_in_app: boolean | null
          created_at: string | null
          enable_cca_news: boolean | null
          enable_contract_expiry: boolean | null
          enable_document_checklist: boolean | null
          enable_financial_due: boolean | null
          enable_legislative_events: boolean | null
          expiry_alert_days: number[] | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          channel_email?: boolean | null
          channel_in_app?: boolean | null
          created_at?: string | null
          enable_cca_news?: boolean | null
          enable_contract_expiry?: boolean | null
          enable_document_checklist?: boolean | null
          enable_financial_due?: boolean | null
          enable_legislative_events?: boolean | null
          expiry_alert_days?: number[] | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          channel_email?: boolean | null
          channel_in_app?: boolean | null
          created_at?: string | null
          enable_cca_news?: boolean | null
          enable_contract_expiry?: boolean | null
          enable_document_checklist?: boolean | null
          enable_financial_due?: boolean | null
          enable_legislative_events?: boolean | null
          expiry_alert_days?: number[] | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          organization_id: string | null
          read: boolean | null
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          organization_id?: string | null
          read?: boolean | null
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          organization_id?: string | null
          read?: boolean | null
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      on_demand_requests: {
        Row: {
          anexo_path: string | null
          contrato_id: string | null
          created_at: string
          descricao: string | null
          estado: string
          id: string
          organization_id: string
          origem: string
          prazo_resposta: string | null
          prioridade: string
          responsavel_id: string | null
          resposta: string | null
          solicitado_por_id: string | null
          tipo_analise: string
          titulo: string
          updated_at: string
        }
        Insert: {
          anexo_path?: string | null
          contrato_id?: string | null
          created_at?: string
          descricao?: string | null
          estado?: string
          id?: string
          organization_id: string
          origem?: string
          prazo_resposta?: string | null
          prioridade?: string
          responsavel_id?: string | null
          resposta?: string | null
          solicitado_por_id?: string | null
          tipo_analise?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          anexo_path?: string | null
          contrato_id?: string | null
          created_at?: string
          descricao?: string | null
          estado?: string
          id?: string
          organization_id?: string
          origem?: string
          prazo_resposta?: string | null
          prioridade?: string
          responsavel_id?: string | null
          resposta?: string | null
          solicitado_por_id?: string | null
          tipo_analise?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "on_demand_requests_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "on_demand_requests_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "on_demand_requests_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "on_demand_requests_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "on_demand_requests_solicitado_por_id_fkey"
            columns: ["solicitado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "on_demand_requests_solicitado_por_id_fkey"
            columns: ["solicitado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_document_checklist: {
        Row: {
          ai_suggested_date: string | null
          checklist_type_id: string
          confirmed_by_user: boolean | null
          created_at: string | null
          file_reference: string | null
          id: string
          notes: string | null
          organization_id: string
          status: string
          updated_at: string | null
          updated_by_id: string | null
          validity_date: string | null
        }
        Insert: {
          ai_suggested_date?: string | null
          checklist_type_id: string
          confirmed_by_user?: boolean | null
          created_at?: string | null
          file_reference?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          status?: string
          updated_at?: string | null
          updated_by_id?: string | null
          validity_date?: string | null
        }
        Update: {
          ai_suggested_date?: string | null
          checklist_type_id?: string
          confirmed_by_user?: boolean | null
          created_at?: string | null
          file_reference?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          status?: string
          updated_at?: string | null
          updated_by_id?: string | null
          validity_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_document_checklist_checklist_type_id_fkey"
            columns: ["checklist_type_id"]
            isOneToOne: false
            referencedRelation: "document_checklist_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_document_checklist_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_document_checklist_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_document_checklist_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home_by_organization"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          user_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
          user_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home_by_organization"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          ai_auto_analyze: boolean
          ai_confidence_threshold: number
          ai_model: string
          ai_notify_impacts: boolean
          created_at: string
          folder_allow_item_removal: boolean
          id: string
          notification_days_before_expiry: number
          notification_email_alerts: boolean
          notification_impact_alerts: boolean
          notification_renewal_alerts: boolean
          organization_id: string
          signature_auto_send: boolean
          signature_provider: string
          signature_reminder_days: number
          updated_at: string
        }
        Insert: {
          ai_auto_analyze?: boolean
          ai_confidence_threshold?: number
          ai_model?: string
          ai_notify_impacts?: boolean
          created_at?: string
          folder_allow_item_removal?: boolean
          id?: string
          notification_days_before_expiry?: number
          notification_email_alerts?: boolean
          notification_impact_alerts?: boolean
          notification_renewal_alerts?: boolean
          organization_id: string
          signature_auto_send?: boolean
          signature_provider?: string
          signature_reminder_days?: number
          updated_at?: string
        }
        Update: {
          ai_auto_analyze?: boolean
          ai_confidence_threshold?: number
          ai_model?: string
          ai_notify_impacts?: boolean
          created_at?: string
          folder_allow_item_removal?: boolean
          id?: string
          notification_days_before_expiry?: number
          notification_email_alerts?: boolean
          notification_impact_alerts?: boolean
          notification_renewal_alerts?: boolean
          organization_id?: string
          signature_auto_send?: boolean
          signature_provider?: string
          signature_reminder_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "vw_client_finance_home"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "vw_client_finance_home_by_organization"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organization_subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string
          plan_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id: string
          plan_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string
          plan_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "vw_client_finance_home"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "vw_client_finance_home_by_organization"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          client_code: string | null
          cost_center: string | null
          created_at: string
          group: string | null
          id: string
          industry_sectors: string[] | null
          is_active: boolean
          jvris_id: string | null
          lawyer_user_id: string | null
          legacy_org_id: number | null
          legalbi_url: string | null
          logo_url: string | null
          name: string
          org_type: string
          prazo_pagamento_dias: number | null
          responsible: string | null
          responsible_email: string | null
          tipo_cliente: string | null
          updated_at: string
          updated_by_id: string | null
        }
        Insert: {
          client_code?: string | null
          cost_center?: string | null
          created_at?: string
          group?: string | null
          id?: string
          industry_sectors?: string[] | null
          is_active?: boolean
          jvris_id?: string | null
          lawyer_user_id?: string | null
          legacy_org_id?: number | null
          legalbi_url?: string | null
          logo_url?: string | null
          name: string
          org_type: string
          prazo_pagamento_dias?: number | null
          responsible?: string | null
          responsible_email?: string | null
          tipo_cliente?: string | null
          updated_at?: string
          updated_by_id?: string | null
        }
        Update: {
          client_code?: string | null
          cost_center?: string | null
          created_at?: string
          group?: string | null
          id?: string
          industry_sectors?: string[] | null
          is_active?: boolean
          jvris_id?: string | null
          lawyer_user_id?: string | null
          legacy_org_id?: number | null
          legalbi_url?: string | null
          logo_url?: string | null
          name?: string
          org_type?: string
          prazo_pagamento_dias?: number | null
          responsible?: string | null
          responsible_email?: string | null
          tipo_cliente?: string | null
          updated_at?: string
          updated_by_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_lawyer_user_id_fkey"
            columns: ["lawyer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_lawyer_user_id_fkey"
            columns: ["lawyer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      "organizations sso": {
        Row: {
          client_code: string | null
          cost_center: string | null
          group: string | null
          is_active: boolean | null
          name: string | null
          responsible: string | null
          responsible_email: string | null
        }
        Insert: {
          client_code?: string | null
          cost_center?: string | null
          group?: string | null
          is_active?: boolean | null
          name?: string | null
          responsible?: string | null
          responsible_email?: string | null
        }
        Update: {
          client_code?: string | null
          cost_center?: string | null
          group?: string | null
          is_active?: boolean | null
          name?: string | null
          responsible?: string | null
          responsible_email?: string | null
        }
        Relationships: []
      }
      organizations_legacy: {
        Row: {
          client_code: string
          cost_center: string | null
          created_at: string
          group: string | null
          id: number
          is_active: boolean
          name: string
          responsible: string | null
          responsible_email: string | null
          updated_at: string
        }
        Insert: {
          client_code: string
          cost_center?: string | null
          created_at?: string
          group?: string | null
          id: number
          is_active?: boolean
          name: string
          responsible?: string | null
          responsible_email?: string | null
          updated_at?: string
        }
        Update: {
          client_code?: string
          cost_center?: string | null
          created_at?: string
          group?: string | null
          id?: number
          is_active?: boolean
          name?: string
          responsible?: string | null
          responsible_email?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_responsible_email_fkey"
            columns: ["responsible_email"]
            isOneToOne: false
            referencedRelation: "platform_users"
            referencedColumns: ["email"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_users: {
        Row: {
          auth_method: string
          created_at: string
          department: string | null
          email: string
          full_name: string | null
          id: number
          is_active: boolean
          job_title: string | null
          organization: string
          role: string
          updated_at: string
        }
        Insert: {
          auth_method?: string
          created_at?: string
          department?: string | null
          email: string
          full_name?: string | null
          id?: number
          is_active?: boolean
          job_title?: string | null
          organization?: string
          role?: string
          updated_at?: string
        }
        Update: {
          auth_method?: string
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string | null
          id?: number
          is_active?: boolean
          job_title?: string | null
          organization?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      politicas: {
        Row: {
          arquivo_mime_type: string | null
          arquivo_nome: string | null
          arquivo_url: string | null
          conteudo: string | null
          created_at: string
          created_by_id: string | null
          departamento: string | null
          descricao: string | null
          estado: string
          id: string
          organization_id: string | null
          titulo: string
          updated_at: string
          updated_by_id: string | null
          versao: number
        }
        Insert: {
          arquivo_mime_type?: string | null
          arquivo_nome?: string | null
          arquivo_url?: string | null
          conteudo?: string | null
          created_at?: string
          created_by_id?: string | null
          departamento?: string | null
          descricao?: string | null
          estado?: string
          id?: string
          organization_id?: string | null
          titulo: string
          updated_at?: string
          updated_by_id?: string | null
          versao?: number
        }
        Update: {
          arquivo_mime_type?: string | null
          arquivo_nome?: string | null
          arquivo_url?: string | null
          conteudo?: string | null
          created_at?: string
          created_by_id?: string | null
          departamento?: string | null
          descricao?: string | null
          estado?: string
          id?: string
          organization_id?: string | null
          titulo?: string
          updated_at?: string
          updated_by_id?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "politicas_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "politicas_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "politicas_updated_by_id_fkey"
            columns: ["updated_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "politicas_updated_by_id_fkey"
            columns: ["updated_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          activated_at: string | null
          auth_method: string | null
          avatar_url: string | null
          cargo: string | null
          created_at: string
          current_organization_id: string | null
          departamento: Database["public"]["Enums"]["departamento"] | null
          email: string | null
          id: string
          invited_at: string | null
          jvris_id: string | null
          last_login_at: string | null
          locked_until: string | null
          login_attempts: number | null
          mfa_method: string | null
          mfa_required: boolean
          must_change_password: boolean
          nome_completo: string | null
          onboarding_completed: boolean | null
          password_set_at: string | null
          sso_external_id: string | null
          sso_group: string | null
          sso_provider: string | null
          theme_preference: string | null
          two_factor_enabled: boolean | null
          two_factor_verified_at: string | null
          updated_at: string
        }
        Insert: {
          account_status?: string
          activated_at?: string | null
          auth_method?: string | null
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          current_organization_id?: string | null
          departamento?: Database["public"]["Enums"]["departamento"] | null
          email?: string | null
          id: string
          invited_at?: string | null
          jvris_id?: string | null
          last_login_at?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          mfa_method?: string | null
          mfa_required?: boolean
          must_change_password?: boolean
          nome_completo?: string | null
          onboarding_completed?: boolean | null
          password_set_at?: string | null
          sso_external_id?: string | null
          sso_group?: string | null
          sso_provider?: string | null
          theme_preference?: string | null
          two_factor_enabled?: boolean | null
          two_factor_verified_at?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: string
          activated_at?: string | null
          auth_method?: string | null
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          current_organization_id?: string | null
          departamento?: Database["public"]["Enums"]["departamento"] | null
          email?: string | null
          id?: string
          invited_at?: string | null
          jvris_id?: string | null
          last_login_at?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          mfa_method?: string | null
          mfa_required?: boolean
          must_change_password?: boolean
          nome_completo?: string | null
          onboarding_completed?: boolean | null
          password_set_at?: string | null
          sso_external_id?: string | null
          sso_group?: string | null
          sso_provider?: string | null
          theme_preference?: string | null
          two_factor_enabled?: boolean | null
          two_factor_verified_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_organization_id_fkey"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_current_organization_id_fkey"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "profiles_current_organization_id_fkey"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home_by_organization"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      requisitos: {
        Row: {
          area_direito: string
          created_at: string
          created_by_id: string | null
          descricao: string | null
          estado: string
          evento_legislativo_id: string | null
          fonte_legal: string | null
          id: string
          nivel_criticidade: string
          organization_id: string | null
          prazo_cumprimento: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          area_direito?: string
          created_at?: string
          created_by_id?: string | null
          descricao?: string | null
          estado?: string
          evento_legislativo_id?: string | null
          fonte_legal?: string | null
          id?: string
          nivel_criticidade?: string
          organization_id?: string | null
          prazo_cumprimento?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          area_direito?: string
          created_at?: string
          created_by_id?: string | null
          descricao?: string | null
          estado?: string
          evento_legislativo_id?: string | null
          fonte_legal?: string | null
          id?: string
          nivel_criticidade?: string
          organization_id?: string | null
          prazo_cumprimento?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisitos_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitos_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitos_evento_legislativo_id_fkey"
            columns: ["evento_legislativo_id"]
            isOneToOne: false
            referencedRelation: "eventos_legislativos"
            referencedColumns: ["id"]
          },
        ]
      }
      sharepoint_config: {
        Row: {
          created_at: string
          drive_id: string | null
          id: string
          last_delta_token: string | null
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          organization_id: string
          root_folder_path: string
          site_id: string
          site_name: string | null
          site_url: string | null
          sync_enabled: boolean
          sync_interval_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          drive_id?: string | null
          id?: string
          last_delta_token?: string | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          organization_id: string
          root_folder_path?: string
          site_id: string
          site_name?: string | null
          site_url?: string | null
          sync_enabled?: boolean
          sync_interval_minutes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          drive_id?: string | null
          id?: string
          last_delta_token?: string | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          organization_id?: string
          root_folder_path?: string
          site_id?: string
          site_name?: string | null
          site_url?: string | null
          sync_enabled?: boolean
          sync_interval_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      sharepoint_documents: {
        Row: {
          config_id: string
          deleted_at: string | null
          download_url: string | null
          etag: string | null
          file_extension: string | null
          folder_path: string
          id: string
          is_deleted: boolean
          is_folder: boolean
          mime_type: string | null
          name: string
          organization_id: string
          sharepoint_drive_id: string | null
          sharepoint_item_id: string
          sharepoint_modified_at: string | null
          sharepoint_modified_by: string | null
          size_bytes: number | null
          synced_at: string
          web_url: string | null
        }
        Insert: {
          config_id: string
          deleted_at?: string | null
          download_url?: string | null
          etag?: string | null
          file_extension?: string | null
          folder_path?: string
          id?: string
          is_deleted?: boolean
          is_folder?: boolean
          mime_type?: string | null
          name: string
          organization_id: string
          sharepoint_drive_id?: string | null
          sharepoint_item_id: string
          sharepoint_modified_at?: string | null
          sharepoint_modified_by?: string | null
          size_bytes?: number | null
          synced_at?: string
          web_url?: string | null
        }
        Update: {
          config_id?: string
          deleted_at?: string | null
          download_url?: string | null
          etag?: string | null
          file_extension?: string | null
          folder_path?: string
          id?: string
          is_deleted?: boolean
          is_folder?: boolean
          mime_type?: string | null
          name?: string
          organization_id?: string
          sharepoint_drive_id?: string | null
          sharepoint_item_id?: string
          sharepoint_modified_at?: string | null
          sharepoint_modified_by?: string | null
          size_bytes?: number | null
          synced_at?: string
          web_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sharepoint_documents_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "sharepoint_config"
            referencedColumns: ["id"]
          },
        ]
      }
      sharepoint_sync_logs: {
        Row: {
          completed_at: string | null
          config_id: string
          delta_token_new: string | null
          delta_token_used: string | null
          error_message: string | null
          id: string
          items_added: number
          items_deleted: number
          items_found: number
          items_updated: number
          organization_id: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          config_id: string
          delta_token_new?: string | null
          delta_token_used?: string | null
          error_message?: string | null
          id?: string
          items_added?: number
          items_deleted?: number
          items_found?: number
          items_updated?: number
          organization_id: string
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          config_id?: string
          delta_token_new?: string | null
          delta_token_used?: string | null
          error_message?: string | null
          id?: string
          items_added?: number
          items_deleted?: number
          items_found?: number
          items_updated?: number
          organization_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sharepoint_sync_logs_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "sharepoint_config"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_admin_emails: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
          id: string
          notes: string | null
          role: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
          id?: string
          notes?: string | null
          role?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
          role?: string
        }
        Relationships: []
      }
      sso_states: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          nonce: string
          state: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          nonce: string
          state: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          nonce?: string
          state?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          currency: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          limits: Json | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          limits?: Json | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          limits?: Json | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          conteudo: string
          created_at: string
          created_by_id: string | null
          descricao: string | null
          id: string
          nome: string
          organization_id: string | null
          placeholders: string[] | null
          tipo: string
          updated_at: string
          updated_by_id: string | null
        }
        Insert: {
          conteudo?: string
          created_at?: string
          created_by_id?: string | null
          descricao?: string | null
          id?: string
          nome: string
          organization_id?: string | null
          placeholders?: string[] | null
          tipo?: string
          updated_at?: string
          updated_by_id?: string | null
        }
        Update: {
          conteudo?: string
          created_at?: string
          created_by_id?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          organization_id?: string | null
          placeholders?: string[] | null
          tipo?: string
          updated_at?: string
          updated_by_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_updated_by_id_fkey"
            columns: ["updated_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_updated_by_id_fkey"
            columns: ["updated_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      tl_instance_phases: {
        Row: {
          data_conclusao: string | null
          estado: string
          id: string
          instance_id: string
          notas_internas: string | null
          phase_id: string
          prazo_calculado: string | null
        }
        Insert: {
          data_conclusao?: string | null
          estado?: string
          id?: string
          instance_id: string
          notas_internas?: string | null
          phase_id: string
          prazo_calculado?: string | null
        }
        Update: {
          data_conclusao?: string | null
          estado?: string
          id?: string
          instance_id?: string
          notas_internas?: string | null
          phase_id?: string
          prazo_calculado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tl_instance_phases_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "tl_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tl_instance_phases_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "tl_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      tl_instances: {
        Row: {
          created_at: string | null
          created_by: string | null
          dilacao_dias: number | null
          gatilho_data: string | null
          id: string
          matter_ref: string | null
          org_id: string
          template_id: string
          urgente: boolean | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dilacao_dias?: number | null
          gatilho_data?: string | null
          id?: string
          matter_ref?: string | null
          org_id: string
          template_id: string
          urgente?: boolean | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dilacao_dias?: number | null
          gatilho_data?: string | null
          id?: string
          matter_ref?: string | null
          org_id?: string
          template_id?: string
          urgente?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tl_instances_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tl_instances_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "tl_instances_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home_by_organization"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "tl_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "tl_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tl_phases: {
        Row: {
          anchor: string | null
          base_legal: string | null
          confirmar: boolean | null
          contagem: string | null
          id: string
          is_optional: boolean | null
          label: string
          notas: string | null
          ordem: number
          prazo_dias: number | null
          template_id: string
          tipo: string
        }
        Insert: {
          anchor?: string | null
          base_legal?: string | null
          confirmar?: boolean | null
          contagem?: string | null
          id?: string
          is_optional?: boolean | null
          label: string
          notas?: string | null
          ordem: number
          prazo_dias?: number | null
          template_id: string
          tipo: string
        }
        Update: {
          anchor?: string | null
          base_legal?: string | null
          confirmar?: boolean | null
          contagem?: string | null
          id?: string
          is_optional?: boolean | null
          label?: string
          notas?: string | null
          ordem?: number
          prazo_dias?: number | null
          template_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tl_phases_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "tl_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tl_templates: {
        Row: {
          area: string | null
          base_legal: string | null
          created_at: string | null
          id: string
          jurisdicao: string | null
          key: string
          title: string
          versao: string | null
        }
        Insert: {
          area?: string | null
          base_legal?: string | null
          created_at?: string | null
          id?: string
          jurisdicao?: string | null
          key: string
          title: string
          versao?: string | null
        }
        Update: {
          area?: string | null
          base_legal?: string | null
          created_at?: string | null
          id?: string
          jurisdicao?: string | null
          key?: string
          title?: string
          versao?: string | null
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          consent_type: string
          created_at: string
          granted: boolean
          granted_at: string | null
          id: string
          ip_address: string | null
          policy_version: string | null
          revoked_at: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_type: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          policy_version?: string | null
          revoked_at?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          policy_version?: string | null
          revoked_at?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_departments: {
        Row: {
          created_at: string
          created_by_id: string | null
          department_id: string
          id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by_id?: string | null
          department_id: string
          id?: string
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by_id?: string | null
          department_id?: string
          id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_departments_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_departments_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_departments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_departments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invites: {
        Row: {
          created_at: string
          created_by_id: string | null
          email: string
          expires_at: string
          id: string
          invite_token_hash: string
          organization_id: string
          status: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by_id?: string | null
          email: string
          expires_at: string
          id?: string
          invite_token_hash: string
          organization_id: string
          status?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by_id?: string | null
          email?: string
          expires_at?: string
          id?: string
          invite_token_hash?: string
          organization_id?: string
          status?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invites_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invites_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "user_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home_by_organization"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "user_invites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          auth_method: string | null
          department: string | null
          email: string | null
          full_name: string | null
          is_active: boolean | null
          job_title: string | null
          organization: string | null
          role: string | null
        }
        Insert: {
          auth_method?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          is_active?: boolean | null
          job_title?: string | null
          organization?: string | null
          role?: string | null
        }
        Update: {
          auth_method?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          is_active?: boolean | null
          job_title?: string | null
          organization?: string | null
          role?: string | null
        }
        Relationships: []
      }
      users_import: {
        Row: {
          autenticacao: string | null
          departamentos: string | null
          email: string | null
          funcao: string | null
          id: number
          organizacao: string | null
          perfil_legalhub: string | null
          utilizador: string | null
        }
        Insert: {
          autenticacao?: string | null
          departamentos?: string | null
          email?: string | null
          funcao?: string | null
          id?: number
          organizacao?: string | null
          perfil_legalhub?: string | null
          utilizador?: string | null
        }
        Update: {
          autenticacao?: string | null
          departamentos?: string | null
          email?: string | null
          funcao?: string | null
          id?: number
          organizacao?: string | null
          perfil_legalhub?: string | null
          utilizador?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      contratos_safe: {
        Row: {
          alerta_renovacao_30_dias: boolean | null
          alerta_renovacao_60_dias: boolean | null
          alerta_renovacao_90_dias: boolean | null
          aprovadores_internos: string | null
          areas_direito_aplicaveis: string[] | null
          arquivado: boolean | null
          arquivo_mime_type: string | null
          arquivo_nome_original: string | null
          arquivo_storage_path: string | null
          aviso_previo_nao_renovacao_dias: number | null
          base_legal_transferencia: string | null
          categorias_dados_pessoais: string | null
          categorias_titulares: string | null
          centro_custo: string | null
          clausula_indemnizacao: boolean | null
          clausula_indemnizacao_resumo: string | null
          comentarios_aprovacao: string | null
          condicoes_subcontratacao: string | null
          contacto_comercial_email: string | null
          contacto_comercial_nome: string | null
          contacto_comercial_telefone: string | null
          contacto_faturacao_email: string | null
          contacto_faturacao_nome: string | null
          contacto_legal_email: string | null
          contacto_legal_nome: string | null
          contacto_operacional_email: string | null
          contacto_operacional_nome: string | null
          contratos_relacionados: string | null
          created_at: string | null
          created_by_id: string | null
          data_assinatura_parte_a: string | null
          data_assinatura_parte_b: string | null
          data_conclusao_assinatura: string | null
          data_inicio_vigencia: string | null
          data_limite_decisao_renovacao: string | null
          data_termo: string | null
          departamento_responsavel:
            | Database["public"]["Enums"]["departamento"]
            | null
          dpia_realizada: boolean | null
          estado_aprovacao:
            | Database["public"]["Enums"]["estado_aprovacao"]
            | null
          estado_contrato: Database["public"]["Enums"]["estado_contrato"] | null
          estrutura_precos:
            | Database["public"]["Enums"]["estrutura_precos"]
            | null
          existe_dpa_anexo_rgpd: boolean | null
          extraido_json: Json | null
          ferramenta_assinatura: string | null
          flag_confidencialidade: boolean | null
          flag_direito_subcontratar: boolean | null
          flag_exclusividade: boolean | null
          flag_nao_concorrencia: boolean | null
          garantia_data_validade: string | null
          garantia_existente: boolean | null
          garantia_tipo: Database["public"]["Enums"]["tipo_garantia"] | null
          garantia_valor: number | null
          id: string | null
          id_interno: string | null
          iniciado_por_id: string | null
          limite_responsabilidade: string | null
          metodo_assinatura:
            | Database["public"]["Enums"]["metodo_assinatura"]
            | null
          moeda: string | null
          motivo_ultima_alteracao: string | null
          numero_adendas: number | null
          numero_encomenda_po: string | null
          objeto_resumido: string | null
          obrigacoes_parte_a: string | null
          obrigacoes_parte_b: string | null
          observacoes_ultima_revisao: string | null
          organization_id: string | null
          paises_transferencia: string | null
          papel_entidade: Database["public"]["Enums"]["papel_entidade"] | null
          parte_a_morada: string | null
          parte_a_nif: string | null
          parte_a_nome_legal: string | null
          parte_a_pais: string | null
          parte_b_grupo_economico: string | null
          parte_b_morada: string | null
          parte_b_nif: string | null
          parte_b_nome_legal: string | null
          parte_b_pais: string | null
          periodicidade_faturacao:
            | Database["public"]["Enums"]["periodicidade_faturacao"]
            | null
          prazo_pagamento_dias: number | null
          prazos_denuncia_rescisao: string | null
          referencia_dpa: string | null
          referencia_dpia: string | null
          renovacao_periodo_meses: number | null
          responsavel_interno_id: string | null
          responsavel_revisao_renovacao_id: string | null
          resultado_ultima_revisao:
            | Database["public"]["Enums"]["resultado_revisao"]
            | null
          sla_kpi_resumo: string | null
          tipo_contrato: Database["public"]["Enums"]["tipo_contrato"] | null
          tipo_contrato_personalizado: string | null
          tipo_duracao: Database["public"]["Enums"]["tipo_duracao"] | null
          tipo_renovacao: Database["public"]["Enums"]["tipo_renovacao"] | null
          titulo_contrato: string | null
          transferencia_internacional: boolean | null
          tratamento_dados_pessoais: boolean | null
          updated_at: string | null
          updated_by_id: string | null
          valor_anual_recorrente: number | null
          valor_total_estimado: number | null
          versao_actual: number | null
        }
        Insert: {
          alerta_renovacao_30_dias?: boolean | null
          alerta_renovacao_60_dias?: boolean | null
          alerta_renovacao_90_dias?: boolean | null
          aprovadores_internos?: never
          areas_direito_aplicaveis?: string[] | null
          arquivado?: boolean | null
          arquivo_mime_type?: never
          arquivo_nome_original?: never
          arquivo_storage_path?: never
          aviso_previo_nao_renovacao_dias?: number | null
          base_legal_transferencia?: never
          categorias_dados_pessoais?: never
          categorias_titulares?: never
          centro_custo?: never
          clausula_indemnizacao?: never
          clausula_indemnizacao_resumo?: never
          comentarios_aprovacao?: never
          condicoes_subcontratacao?: never
          contacto_comercial_email?: never
          contacto_comercial_nome?: never
          contacto_comercial_telefone?: never
          contacto_faturacao_email?: never
          contacto_faturacao_nome?: never
          contacto_legal_email?: never
          contacto_legal_nome?: never
          contacto_operacional_email?: never
          contacto_operacional_nome?: never
          contratos_relacionados?: never
          created_at?: string | null
          created_by_id?: string | null
          data_assinatura_parte_a?: string | null
          data_assinatura_parte_b?: string | null
          data_conclusao_assinatura?: string | null
          data_inicio_vigencia?: string | null
          data_limite_decisao_renovacao?: string | null
          data_termo?: string | null
          departamento_responsavel?:
            | Database["public"]["Enums"]["departamento"]
            | null
          dpia_realizada?: boolean | null
          estado_aprovacao?:
            | Database["public"]["Enums"]["estado_aprovacao"]
            | null
          estado_contrato?:
            | Database["public"]["Enums"]["estado_contrato"]
            | null
          estrutura_precos?: never
          existe_dpa_anexo_rgpd?: boolean | null
          extraido_json?: never
          ferramenta_assinatura?: never
          flag_confidencialidade?: boolean | null
          flag_direito_subcontratar?: boolean | null
          flag_exclusividade?: boolean | null
          flag_nao_concorrencia?: boolean | null
          garantia_data_validade?: never
          garantia_existente?: never
          garantia_tipo?: never
          garantia_valor?: never
          id?: string | null
          id_interno?: string | null
          iniciado_por_id?: string | null
          limite_responsabilidade?: never
          metodo_assinatura?:
            | Database["public"]["Enums"]["metodo_assinatura"]
            | null
          moeda?: never
          motivo_ultima_alteracao?: never
          numero_adendas?: number | null
          numero_encomenda_po?: never
          objeto_resumido?: string | null
          obrigacoes_parte_a?: never
          obrigacoes_parte_b?: never
          observacoes_ultima_revisao?: never
          organization_id?: string | null
          paises_transferencia?: never
          papel_entidade?: Database["public"]["Enums"]["papel_entidade"] | null
          parte_a_morada?: never
          parte_a_nif?: never
          parte_a_nome_legal?: string | null
          parte_a_pais?: string | null
          parte_b_grupo_economico?: string | null
          parte_b_morada?: never
          parte_b_nif?: never
          parte_b_nome_legal?: string | null
          parte_b_pais?: string | null
          periodicidade_faturacao?: never
          prazo_pagamento_dias?: never
          prazos_denuncia_rescisao?: never
          referencia_dpa?: never
          referencia_dpia?: never
          renovacao_periodo_meses?: number | null
          responsavel_interno_id?: string | null
          responsavel_revisao_renovacao_id?: string | null
          resultado_ultima_revisao?:
            | Database["public"]["Enums"]["resultado_revisao"]
            | null
          sla_kpi_resumo?: never
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"] | null
          tipo_contrato_personalizado?: string | null
          tipo_duracao?: Database["public"]["Enums"]["tipo_duracao"] | null
          tipo_renovacao?: Database["public"]["Enums"]["tipo_renovacao"] | null
          titulo_contrato?: string | null
          transferencia_internacional?: boolean | null
          tratamento_dados_pessoais?: boolean | null
          updated_at?: string | null
          updated_by_id?: string | null
          valor_anual_recorrente?: never
          valor_total_estimado?: never
          versao_actual?: number | null
        }
        Update: {
          alerta_renovacao_30_dias?: boolean | null
          alerta_renovacao_60_dias?: boolean | null
          alerta_renovacao_90_dias?: boolean | null
          aprovadores_internos?: never
          areas_direito_aplicaveis?: string[] | null
          arquivado?: boolean | null
          arquivo_mime_type?: never
          arquivo_nome_original?: never
          arquivo_storage_path?: never
          aviso_previo_nao_renovacao_dias?: number | null
          base_legal_transferencia?: never
          categorias_dados_pessoais?: never
          categorias_titulares?: never
          centro_custo?: never
          clausula_indemnizacao?: never
          clausula_indemnizacao_resumo?: never
          comentarios_aprovacao?: never
          condicoes_subcontratacao?: never
          contacto_comercial_email?: never
          contacto_comercial_nome?: never
          contacto_comercial_telefone?: never
          contacto_faturacao_email?: never
          contacto_faturacao_nome?: never
          contacto_legal_email?: never
          contacto_legal_nome?: never
          contacto_operacional_email?: never
          contacto_operacional_nome?: never
          contratos_relacionados?: never
          created_at?: string | null
          created_by_id?: string | null
          data_assinatura_parte_a?: string | null
          data_assinatura_parte_b?: string | null
          data_conclusao_assinatura?: string | null
          data_inicio_vigencia?: string | null
          data_limite_decisao_renovacao?: string | null
          data_termo?: string | null
          departamento_responsavel?:
            | Database["public"]["Enums"]["departamento"]
            | null
          dpia_realizada?: boolean | null
          estado_aprovacao?:
            | Database["public"]["Enums"]["estado_aprovacao"]
            | null
          estado_contrato?:
            | Database["public"]["Enums"]["estado_contrato"]
            | null
          estrutura_precos?: never
          existe_dpa_anexo_rgpd?: boolean | null
          extraido_json?: never
          ferramenta_assinatura?: never
          flag_confidencialidade?: boolean | null
          flag_direito_subcontratar?: boolean | null
          flag_exclusividade?: boolean | null
          flag_nao_concorrencia?: boolean | null
          garantia_data_validade?: never
          garantia_existente?: never
          garantia_tipo?: never
          garantia_valor?: never
          id?: string | null
          id_interno?: string | null
          iniciado_por_id?: string | null
          limite_responsabilidade?: never
          metodo_assinatura?:
            | Database["public"]["Enums"]["metodo_assinatura"]
            | null
          moeda?: never
          motivo_ultima_alteracao?: never
          numero_adendas?: number | null
          numero_encomenda_po?: never
          objeto_resumido?: string | null
          obrigacoes_parte_a?: never
          obrigacoes_parte_b?: never
          observacoes_ultima_revisao?: never
          organization_id?: string | null
          paises_transferencia?: never
          papel_entidade?: Database["public"]["Enums"]["papel_entidade"] | null
          parte_a_morada?: never
          parte_a_nif?: never
          parte_a_nome_legal?: string | null
          parte_a_pais?: string | null
          parte_b_grupo_economico?: string | null
          parte_b_morada?: never
          parte_b_nif?: never
          parte_b_nome_legal?: string | null
          parte_b_pais?: string | null
          periodicidade_faturacao?: never
          prazo_pagamento_dias?: never
          prazos_denuncia_rescisao?: never
          referencia_dpa?: never
          referencia_dpia?: never
          renovacao_periodo_meses?: number | null
          responsavel_interno_id?: string | null
          responsavel_revisao_renovacao_id?: string | null
          resultado_ultima_revisao?:
            | Database["public"]["Enums"]["resultado_revisao"]
            | null
          sla_kpi_resumo?: never
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"] | null
          tipo_contrato_personalizado?: string | null
          tipo_duracao?: Database["public"]["Enums"]["tipo_duracao"] | null
          tipo_renovacao?: Database["public"]["Enums"]["tipo_renovacao"] | null
          titulo_contrato?: string | null
          transferencia_internacional?: boolean | null
          tratamento_dados_pessoais?: boolean | null
          updated_at?: string | null
          updated_by_id?: string | null
          valor_anual_recorrente?: never
          valor_total_estimado?: never
          versao_actual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_iniciado_por_id_fkey"
            columns: ["iniciado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_iniciado_por_id_fkey"
            columns: ["iniciado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_responsavel_interno_id_fkey"
            columns: ["responsavel_interno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_responsavel_interno_id_fkey"
            columns: ["responsavel_interno_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_responsavel_revisao_renovacao_id_fkey"
            columns: ["responsavel_revisao_renovacao_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_responsavel_revisao_renovacao_id_fkey"
            columns: ["responsavel_revisao_renovacao_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_updated_by_id_fkey"
            columns: ["updated_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_updated_by_id_fkey"
            columns: ["updated_by_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_safe: {
        Row: {
          auth_method: string | null
          avatar_url: string | null
          created_at: string | null
          current_organization_id: string | null
          departamento: Database["public"]["Enums"]["departamento"] | null
          email: string | null
          id: string | null
          last_login_at: string | null
          locked_until: string | null
          login_attempts: number | null
          nome_completo: string | null
          onboarding_completed: boolean | null
          sso_external_id: string | null
          sso_provider: string | null
          two_factor_enabled: boolean | null
          two_factor_verified_at: string | null
          updated_at: string | null
        }
        Insert: {
          auth_method?: never
          avatar_url?: never
          created_at?: string | null
          current_organization_id?: string | null
          departamento?: Database["public"]["Enums"]["departamento"] | null
          email?: never
          id?: string | null
          last_login_at?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          nome_completo?: never
          onboarding_completed?: boolean | null
          sso_external_id?: never
          sso_provider?: never
          two_factor_enabled?: boolean | null
          two_factor_verified_at?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_method?: never
          avatar_url?: never
          created_at?: string | null
          current_organization_id?: string | null
          departamento?: Database["public"]["Enums"]["departamento"] | null
          email?: never
          id?: string | null
          last_login_at?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          nome_completo?: never
          onboarding_completed?: boolean | null
          sso_external_id?: never
          sso_provider?: never
          two_factor_enabled?: boolean | null
          two_factor_verified_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_organization_id_fkey"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_current_organization_id_fkey"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "profiles_current_organization_id_fkey"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home_by_organization"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      vw_cca_client_catalog_overview: {
        Row: {
          can_open_in_platform: boolean | null
          client_code: string | null
          client_status: string | null
          cost_center: string | null
          distinct_users: number | null
          group_code: string | null
          has_financial_data: boolean | null
          has_platform_tenant: boolean | null
          legacy_client_name: string | null
          legacy_is_active: boolean | null
          organization_count: number | null
          organization_id: string | null
          organization_is_active: boolean | null
          organization_name: string | null
          primeira_data_vencimento: string | null
          responsible: string | null
          responsible_email: string | null
          total_a_vencer: number | null
          total_admins: number | null
          total_documentos: number | null
          total_editors: number | null
          total_members: number | null
          total_owners: number | null
          total_pendente: number | null
          total_vencido: number | null
          total_viewers: number | null
          ultima_data_vencimento: string | null
          ultima_sincronizacao: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_responsible_email_fkey"
            columns: ["responsible_email"]
            isOneToOne: false
            referencedRelation: "platform_users"
            referencedColumns: ["email"]
          },
        ]
      }
      vw_client_finance_home: {
        Row: {
          client_code: string | null
          cost_center: string | null
          group_code: string | null
          legacy_client_name: string | null
          organization_id: string | null
          organization_name: string | null
          responsible: string | null
          responsible_email: string | null
          total_a_vencer: number | null
          total_documentos: number | null
          total_pendente: number | null
          total_vencido: number | null
          ultima_sincronizacao: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_responsible_email_fkey"
            columns: ["responsible_email"]
            isOneToOne: false
            referencedRelation: "platform_users"
            referencedColumns: ["email"]
          },
        ]
      }
      vw_client_finance_home_by_organization: {
        Row: {
          client_code: string | null
          cost_center: string | null
          group_code: string | null
          legacy_client_name: string | null
          organization_id: string | null
          organization_name: string | null
          responsible: string | null
          responsible_email: string | null
          total_a_vencer: number | null
          total_documentos: number | null
          total_pendente: number | null
          total_vencido: number | null
          ultima_sincronizacao: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_responsible_email_fkey"
            columns: ["responsible_email"]
            isOneToOne: false
            referencedRelation: "platform_users"
            referencedColumns: ["email"]
          },
        ]
      }
      vw_organization_members_financial_scope: {
        Row: {
          can_view_group_financials: boolean | null
          email: string | null
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vw_client_finance_home_by_organization"
            referencedColumns: ["organization_id"]
          },
        ]
      }
    }
    Functions: {
      assign_sso_user_to_organization: {
        Args: {
          p_organization_id: string
          p_role?: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      cleanup_expired_sso_states: { Args: never; Returns: undefined }
      create_contract_expiry_notifications: { Args: never; Returns: undefined }
      create_organization: {
        Args: { p_name: string; p_slug: string }
        Returns: {
          client_code: string | null
          cost_center: string | null
          created_at: string
          group: string | null
          id: string
          industry_sectors: string[] | null
          is_active: boolean
          jvris_id: string | null
          lawyer_user_id: string | null
          legacy_org_id: number | null
          legalbi_url: string | null
          logo_url: string | null
          name: string
          org_type: string
          prazo_pagamento_dias: number | null
          responsible: string | null
          responsible_email: string | null
          tipo_cliente: string | null
          updated_at: string
          updated_by_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_stale_impersonation_sessions: { Args: never; Returns: number }
      fn_create_client_deadline_notifications: { Args: never; Returns: number }
      fn_get_cca_default_client_org_id: { Args: never; Returns: string }
      fn_get_client_home_for_actor: {
        Args: { p_user_id: string; p_viewing_organization_id: string }
        Returns: {
          client_code: string
          cost_center: string
          group_code: string
          legacy_client_name: string
          organization_id: string
          organization_name: string
          responsible: string
          responsible_email: string
          total_a_vencer: number
          total_documentos: number
          total_pendente: number
          total_vencido: number
          ultima_sincronizacao: string
        }[]
      }
      fn_get_financial_items_for_actor: {
        Args: { p_user_id: string; p_viewing_organization_id: string }
        Returns: {
          client_code: string
          data_vencimento: string
          descricao: string
          estado: string
          group_code: string
          legacy_client_name: string
          numero_documento: string
          organization_id: string
          organization_name: string
          synced_at: string
          valor: number
        }[]
      }
      fn_get_financial_items_for_user: {
        Args: { p_organization_id: string; p_user_id: string }
        Returns: {
          client_code: string
          client_name: string
          data_vencimento: string
          descricao: string
          group_code: string
          numero_documento: string
          responsible: string
          responsible_email: string
          situacao: string
          synced_at: string
          valor: number
        }[]
      }
      fn_get_financial_summary_by_entity_for_actor: {
        Args: { p_user_id: string; p_viewing_organization_id: string }
        Returns: {
          entity_client_code: string
          entity_name: string
          entity_organization_id: string
          group_code: string
          total_a_vencer: number
          total_documentos: number
          total_pendente: number
          total_vencido: number
          ultima_sincronizacao: string
        }[]
      }
      fn_get_financial_summary_by_entity_for_user: {
        Args: { p_organization_id: string; p_user_id: string }
        Returns: {
          client_code: string
          client_name: string
          group_code: string
          primeiro_vencimento: string
          total_a_vencer: number
          total_documentos: number
          total_pendente: number
          total_vencido: number
          ultimo_vencimento: string
        }[]
      }
      fn_get_financial_summary_for_actor: {
        Args: { p_user_id: string; p_viewing_organization_id: string }
        Returns: {
          client_code: string
          group_code: string
          legacy_client_name: string
          organization_id: string
          organization_name: string
          total_a_vencer: number
          total_documentos: number
          total_pendente: number
          total_vencido: number
          ultima_sincronizacao: string
        }[]
      }
      fn_get_financial_summary_for_user: {
        Args: { p_organization_id: string; p_user_id: string }
        Returns: {
          primeiro_vencimento: string
          total_a_vencer: number
          total_documentos: number
          total_entidades: number
          total_pendente: number
          total_vencido: number
          ultima_sincronizacao: string
          ultimo_vencimento: string
        }[]
      }
      fn_is_cca_internal_authorized: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      fn_provision_org_for_client_code: {
        Args: { p_client_code: string }
        Returns: string
      }
      fn_provision_orgs_for_client_codes: {
        Args: { p_client_codes: string[] }
        Returns: number
      }
      fn_replace_nav_data: {
        Args: { p_cache: Json; p_items: Json }
        Returns: undefined
      }
      fn_search_client_documents: {
        Args: { p_limit?: number; p_org: string; p_query: string }
        Returns: {
          excerpt: string
          folder_path: string
          name: string
          web_url: string
        }[]
      }
      get_cca_org_id: { Args: never; Returns: string }
      get_legal_document: {
        Args: { p_id: string }
        Returns: {
          canonical_url: string
          content_text: string
          doc_type: string
          fetched_at: string
          first_seen_at: string
          id: string
          last_seen_at: string
          meta: Json
          mime_type: string
          published_at: string
          source_key: string
          storage_path: string
          title: string
        }[]
      }
      get_legal_queue_items: {
        Args: { p_limit?: number }
        Returns: {
          depth: number
          fail_count: number
          priority: number
          source_key: string
          url: string
        }[]
      }
      get_legal_sources: {
        Args: never
        Returns: {
          document_count: number
          enabled: boolean
          name: string
          source_key: string
        }[]
      }
      get_legal_sources_for_mirror: {
        Args: never
        Returns: {
          allowed_hosts: Json
          allowed_prefixes: Json
          enabled: boolean
          name: string
          seeds: Json
          source_key: string
        }[]
      }
      get_user_org_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_organization_id: { Args: { _user_id: string }; Returns: string }
      get_user_type: { Args: { _oid: string; _uid: string }; Returns: string }
      is_cca_user: { Args: { _uid?: string }; Returns: boolean }
      is_platform_admin: { Args: { _user_id?: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          _action: string
          _metadata?: Json
          _new_data?: Json
          _old_data?: Json
          _record_id?: string
          _table_name: string
        }
        Returns: string
      }
      my_department_in_org: { Args: { _oid: string }; Returns: string }
      my_user_type_in_org: { Args: { _oid: string }; Returns: string }
      search_legal_documents: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_source?: string
        }
        Returns: {
          canonical_url: string
          doc_type: string
          fetched_at: string
          id: string
          mime_type: string
          published_at: string
          source_key: string
          storage_path: string
          title: string
        }[]
      }
      tl_client_instances: {
        Args: never
        Returns: {
          instance_id: string
          matter_ref: string
          template_key: string
          template_title: string
        }[]
      }
      tl_client_timeline: {
        Args: { p_instance: string }
        Returns: {
          estado: string
          label: string
          ordem: number
          tipo: string
        }[]
      }
      tl_is_lawyer: { Args: never; Returns: boolean }
      tl_lawyer_timeline: {
        Args: { p_instance: string }
        Returns: {
          base_legal: string
          confirmar: boolean
          data_conclusao: string
          estado: string
          instance_phase_id: string
          is_optional: boolean
          label: string
          notas: string
          ordem: number
          prazo_calculado: string
          tipo: string
        }[]
      }
      tl_org: { Args: never; Returns: string }
      tl_role: { Args: never; Returns: string }
      tl_set_phase: {
        Args: { p_estado: string; p_instance_phase: string }
        Returns: undefined
      }
      update_legal_queue_error: {
        Args: { p_error: string; p_fail_count: number; p_url: string }
        Returns: undefined
      }
      update_legal_queue_success: {
        Args: { p_status: number; p_url: string }
        Returns: undefined
      }
      upsert_legal_document: {
        Args: {
          p_canonical_url: string
          p_checksum_sha256: string
          p_content_text: string
          p_doc_type: string
          p_mime_type: string
          p_source_key: string
          p_storage_path: string
          p_title: string
        }
        Returns: undefined
      }
      upsert_legal_fetch_queue: {
        Args: {
          p_depth: number
          p_priority: number
          p_source_key: string
          p_url: string
        }
        Returns: undefined
      }
      user_belongs_to_organization: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_org_role: {
        Args: {
          _min_role: Database["public"]["Enums"]["app_role"]
          _org_id: string
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "editor" | "viewer"
      area_direito:
        | "laboral"
        | "fiscal"
        | "comercial"
        | "protecao_dados"
        | "ambiente"
        | "seguranca_trabalho"
        | "societario"
        | "outro"
      departamento:
        | "comercial"
        | "operacoes"
        | "it"
        | "rh"
        | "financeiro"
        | "juridico"
        | "marketing"
        | "outro"
      estado_aprovacao: "pendente" | "aprovado" | "rejeitado"
      estado_contrato:
        | "rascunho"
        | "em_revisao"
        | "em_aprovacao"
        | "enviado_para_assinatura"
        | "activo"
        | "expirado"
        | "denunciado"
        | "rescindido"
      estado_evento: "rascunho" | "activo" | "arquivado"
      estado_impacto:
        | "pendente_analise"
        | "em_tratamento"
        | "resolvido"
        | "ignorado"
      estrutura_precos: "fixo" | "hora" | "unidade" | "success_fee" | "misto"
      jurisdicao: "nacional" | "europeia" | "internacional"
      metodo_assinatura:
        | "assinatura_digital_qualificada"
        | "assinatura_avancada"
        | "assinatura_simples"
        | "manuscrita"
      nivel_risco: "baixo" | "medio" | "alto"
      papel_entidade:
        | "responsavel_tratamento"
        | "subcontratante"
        | "corresponsavel"
      periodicidade_faturacao:
        | "mensal"
        | "trimestral"
        | "semestral"
        | "anual"
        | "por_marco"
        | "a_cabeca"
      resultado_revisao: "renovado" | "renegociado" | "terminado"
      tipo_anexo: "pdf_principal" | "anexo" | "adenda" | "outro"
      tipo_contrato:
        | "nda"
        | "prestacao_servicos"
        | "fornecimento"
        | "saas"
        | "arrendamento"
        | "trabalho"
        | "licenciamento"
        | "parceria"
        | "consultoria"
        | "outro"
      tipo_duracao: "prazo_determinado" | "prazo_indeterminado"
      tipo_evento_ciclo_vida:
        | "criacao"
        | "assinatura"
        | "inicio_vigencia"
        | "renovacao"
        | "adenda"
        | "rescisao"
        | "denuncia"
        | "expiracao"
        | "nota_interna"
        | "alteracao"
      tipo_garantia:
        | "garantia_bancaria"
        | "seguro_caucao"
        | "deposito"
        | "outro"
      tipo_renovacao:
        | "sem_renovacao_automatica"
        | "renovacao_automatica"
        | "renovacao_mediante_acordo"
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
      app_role: ["owner", "admin", "editor", "viewer"],
      area_direito: [
        "laboral",
        "fiscal",
        "comercial",
        "protecao_dados",
        "ambiente",
        "seguranca_trabalho",
        "societario",
        "outro",
      ],
      departamento: [
        "comercial",
        "operacoes",
        "it",
        "rh",
        "financeiro",
        "juridico",
        "marketing",
        "outro",
      ],
      estado_aprovacao: ["pendente", "aprovado", "rejeitado"],
      estado_contrato: [
        "rascunho",
        "em_revisao",
        "em_aprovacao",
        "enviado_para_assinatura",
        "activo",
        "expirado",
        "denunciado",
        "rescindido",
      ],
      estado_evento: ["rascunho", "activo", "arquivado"],
      estado_impacto: [
        "pendente_analise",
        "em_tratamento",
        "resolvido",
        "ignorado",
      ],
      estrutura_precos: ["fixo", "hora", "unidade", "success_fee", "misto"],
      jurisdicao: ["nacional", "europeia", "internacional"],
      metodo_assinatura: [
        "assinatura_digital_qualificada",
        "assinatura_avancada",
        "assinatura_simples",
        "manuscrita",
      ],
      nivel_risco: ["baixo", "medio", "alto"],
      papel_entidade: [
        "responsavel_tratamento",
        "subcontratante",
        "corresponsavel",
      ],
      periodicidade_faturacao: [
        "mensal",
        "trimestral",
        "semestral",
        "anual",
        "por_marco",
        "a_cabeca",
      ],
      resultado_revisao: ["renovado", "renegociado", "terminado"],
      tipo_anexo: ["pdf_principal", "anexo", "adenda", "outro"],
      tipo_contrato: [
        "nda",
        "prestacao_servicos",
        "fornecimento",
        "saas",
        "arrendamento",
        "trabalho",
        "licenciamento",
        "parceria",
        "consultoria",
        "outro",
      ],
      tipo_duracao: ["prazo_determinado", "prazo_indeterminado"],
      tipo_evento_ciclo_vida: [
        "criacao",
        "assinatura",
        "inicio_vigencia",
        "renovacao",
        "adenda",
        "rescisao",
        "denuncia",
        "expiracao",
        "nota_interna",
        "alteracao",
      ],
      tipo_garantia: [
        "garantia_bancaria",
        "seguro_caucao",
        "deposito",
        "outro",
      ],
      tipo_renovacao: [
        "sem_renovacao_automatica",
        "renovacao_automatica",
        "renovacao_mediante_acordo",
      ],
    },
  },
} as const
