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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_permissions: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          permission_key: string
          role_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          permission_key: string
          role_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          permission_key?: string
          role_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      cbm_pricing_rates: {
        Row: {
          base_rate: number
          created_at: string
          created_by: string | null
          currency: string
          effective_date: string
          effective_rate: number
          exchange_rate: number
          id: string
          is_active: boolean
          notes: string | null
          service_type: string
          updated_at: string
        }
        Insert: {
          base_rate: number
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_date?: string
          effective_rate: number
          exchange_rate: number
          id?: string
          is_active?: boolean
          notes?: string | null
          service_type?: string
          updated_at?: string
        }
        Update: {
          base_rate?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_date?: string
          effective_rate?: number
          exchange_rate?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          service_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      china_warehouses: {
        Row: {
          company_id: string | null
          contact_person: string | null
          created_at: string
          full_address: string
          id: string
          phone_number: string | null
          updated_at: string
          user_code: string
          user_id: string
          warehouse_name: string
        }
        Insert: {
          company_id?: string | null
          contact_person?: string | null
          created_at?: string
          full_address: string
          id?: string
          phone_number?: string | null
          updated_at?: string
          user_code: string
          user_id: string
          warehouse_name: string
        }
        Update: {
          company_id?: string | null
          contact_person?: string | null
          created_at?: string
          full_address?: string
          id?: string
          phone_number?: string | null
          updated_at?: string
          user_code?: string
          user_id?: string
          warehouse_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "china_warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          china_warehouse_address: string
          created_at: string
          customer_service_email: string | null
          email: string
          ghana_warehouse_address: string
          id: string
          logo_url: string | null
          manager_name: string
          name: string
          phone: string
          phone2: string | null
          services: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          china_warehouse_address: string
          created_at?: string
          customer_service_email?: string | null
          email: string
          ghana_warehouse_address: string
          id?: string
          logo_url?: string | null
          manager_name: string
          name: string
          phone: string
          phone2?: string | null
          services?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          china_warehouse_address?: string
          created_at?: string
          customer_service_email?: string | null
          email?: string
          ghana_warehouse_address?: string
          id?: string
          logo_url?: string | null
          manager_name?: string
          name?: string
          phone?: string
          phone2?: string | null
          services?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      company_admin_sessions: {
        Row: {
          company_admin_id: string
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          last_activity: string
          token: string
          user_agent: string | null
        }
        Insert: {
          company_admin_id: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          last_activity?: string
          token: string
          user_agent?: string | null
        }
        Update: {
          company_admin_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_activity?: string
          token?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_admin_sessions_company_admin_id_fkey"
            columns: ["company_admin_id"]
            isOneToOne: false
            referencedRelation: "company_admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_admin_sessions_company_admin_id_fkey"
            columns: ["company_admin_id"]
            isOneToOne: false
            referencedRelation: "company_admins_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      company_admins: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_login: string | null
          locked_until: string | null
          login_attempts: number | null
          password_hash: string
          updated_at: string
          username: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_login?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          password_hash: string
          updated_at?: string
          username: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_login?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          password_hash?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_admins_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_login_logs: {
        Row: {
          company_admin_id: string | null
          created_at: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
          username: string
        }
        Insert: {
          company_admin_id?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success: boolean
          user_agent?: string | null
          username: string
        }
        Update: {
          company_admin_id?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_login_logs_company_admin_id_fkey"
            columns: ["company_admin_id"]
            isOneToOne: false
            referencedRelation: "company_admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_login_logs_company_admin_id_fkey"
            columns: ["company_admin_id"]
            isOneToOne: false
            referencedRelation: "company_admins_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      container_items: {
        Row: {
          available_quantity: number
          carton_count: number | null
          container_id: string
          created_at: string
          id: string
          item_name: string
          item_name_chinese: string | null
          notes: string | null
          quantity: number
          total_cbm: number
          total_weight: number | null
          unit_price: number | null
          unit_weight: number | null
          updated_at: string
          user_code: string | null
        }
        Insert: {
          available_quantity?: number
          carton_count?: number | null
          container_id: string
          created_at?: string
          id?: string
          item_name: string
          item_name_chinese?: string | null
          notes?: string | null
          quantity?: number
          total_cbm?: number
          total_weight?: number | null
          unit_price?: number | null
          unit_weight?: number | null
          updated_at?: string
          user_code?: string | null
        }
        Update: {
          available_quantity?: number
          carton_count?: number | null
          container_id?: string
          created_at?: string
          id?: string
          item_name?: string
          item_name_chinese?: string | null
          notes?: string | null
          quantity?: number
          total_cbm?: number
          total_weight?: number | null
          unit_price?: number | null
          unit_weight?: number | null
          updated_at?: string
          user_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "container_items_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "containers"
            referencedColumns: ["id"]
          },
        ]
      }
      containers: {
        Row: {
          capacity: number | null
          company_id: string | null
          container_number: string
          container_type: string | null
          created_at: string
          current_load: number | null
          departure_date: string | null
          destination: string | null
          estimated_arrival: string | null
          id: string
          loading_date: string | null
          notes: string | null
          origin: string | null
          seal_number: string | null
          shipping_container_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          company_id?: string | null
          container_number: string
          container_type?: string | null
          created_at?: string
          current_load?: number | null
          departure_date?: string | null
          destination?: string | null
          estimated_arrival?: string | null
          id?: string
          loading_date?: string | null
          notes?: string | null
          origin?: string | null
          seal_number?: string | null
          shipping_container_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          company_id?: string | null
          container_number?: string
          container_type?: string | null
          created_at?: string
          current_load?: number | null
          departure_date?: string | null
          destination?: string | null
          estimated_arrival?: string | null
          id?: string
          loading_date?: string | null
          notes?: string | null
          origin?: string | null
          seal_number?: string | null
          shipping_container_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "containers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_goods_selections: {
        Row: {
          cbm_calculated: number
          container_id: string | null
          container_item_id: string
          created_at: string
          delivery_country: string | null
          delivery_fee: number | null
          delivery_region: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          quantity_selected: number
          shipment_id: string | null
          status: string
          updated_at: string
          user_code: string
          user_id: string
        }
        Insert: {
          cbm_calculated?: number
          container_id?: string | null
          container_item_id: string
          created_at?: string
          delivery_country?: string | null
          delivery_fee?: number | null
          delivery_region?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          quantity_selected?: number
          shipment_id?: string | null
          status?: string
          updated_at?: string
          user_code: string
          user_id: string
        }
        Update: {
          cbm_calculated?: number
          container_id?: string | null
          container_item_id?: string
          created_at?: string
          delivery_country?: string | null
          delivery_fee?: number | null
          delivery_region?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          quantity_selected?: number
          shipment_id?: string | null
          status?: string
          updated_at?: string
          user_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_goods_selections_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "containers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_goods_selections_container_item_id_fkey"
            columns: ["container_item_id"]
            isOneToOne: false
            referencedRelation: "container_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_goods_selections_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_goods_selections_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_default: boolean | null
          latitude: number | null
          longitude: number | null
          updated_at: string
          user_code: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          latitude?: number | null
          longitude?: number | null
          updated_at?: string
          user_code: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          latitude?: number | null
          longitude?: number | null
          updated_at?: string
          user_code?: string
          user_id?: string
        }
        Relationships: []
      }
      delivery_partners: {
        Row: {
          address: string | null
          alt_phone: string | null
          coverage: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          phone: string | null
          service_description: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          alt_phone?: string | null
          coverage?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          service_description?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          alt_phone?: string | null
          coverage?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          service_description?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      delivery_requests: {
        Row: {
          amount: number | null
          city: string | null
          container_id: string | null
          created_at: string
          customer_phone: string | null
          delivery_address: string | null
          delivery_cost: number | null
          delivery_location_id: string | null
          delivery_partner_id: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_status: string
          region: string | null
          shipment_id: string | null
          status: string
          updated_at: string
          user_code: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          city?: string | null
          container_id?: string | null
          created_at?: string
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_cost?: number | null
          delivery_location_id?: string | null
          delivery_partner_id?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_status?: string
          region?: string | null
          shipment_id?: string | null
          status?: string
          updated_at?: string
          user_code: string
          user_id: string
        }
        Update: {
          amount?: number | null
          city?: string | null
          container_id?: string | null
          created_at?: string
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_cost?: number | null
          delivery_location_id?: string | null
          delivery_partner_id?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_status?: string
          region?: string | null
          shipment_id?: string | null
          status?: string
          updated_at?: string
          user_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_requests_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "containers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_delivery_location_id_fkey"
            columns: ["delivery_location_id"]
            isOneToOne: false
            referencedRelation: "delivery_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_delivery_partner_id_fkey"
            columns: ["delivery_partner_id"]
            isOneToOne: false
            referencedRelation: "delivery_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          base_fee: number
          country: string
          created_at: string
          id: string
          is_active: boolean | null
          per_cbm_fee: number
          zone_name: string
          zone_type: string
        }
        Insert: {
          base_fee?: number
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          per_cbm_fee?: number
          zone_name: string
          zone_type: string
        }
        Update: {
          base_fee?: number
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          per_cbm_fee?: number
          zone_name?: string
          zone_type?: string
        }
        Relationships: []
      }
      endpoint_rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_hash: string
          request_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_hash: string
          request_count?: number
          updated_at?: string
          window_start: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_hash?: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      hubtel_ussd_fulfillments: {
        Row: {
          amount: number | null
          client_reference: string
          created_at: string
          delivery_request_id: string | null
          hubtel_transaction_id: string | null
          id: string
          invoice_id: string | null
          mobile: string | null
          raw_request: Json | null
          raw_response: Json | null
          session_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          client_reference: string
          created_at?: string
          delivery_request_id?: string | null
          hubtel_transaction_id?: string | null
          id?: string
          invoice_id?: string | null
          mobile?: string | null
          raw_request?: Json | null
          raw_response?: Json | null
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          client_reference?: string
          created_at?: string
          delivery_request_id?: string | null
          hubtel_transaction_id?: string | null
          id?: string
          invoice_id?: string | null
          mobile?: string | null
          raw_request?: Json | null
          raw_response?: Json | null
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hubtel_ussd_fulfillments_delivery_request_id_fkey"
            columns: ["delivery_request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hubtel_ussd_fulfillments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      hubtel_ussd_logs: {
        Row: {
          created_at: string
          endpoint_type: string
          error_message: string | null
          http_status: number | null
          id: string
          mobile_number_masked: string | null
          processing_status: string | null
          request_payload: Json | null
          response_payload: Json | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint_type: string
          error_message?: string | null
          http_status?: number | null
          id?: string
          mobile_number_masked?: string | null
          processing_status?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint_type?: string
          error_message?: string | null
          http_status?: number | null
          id?: string
          mobile_number_masked?: string | null
          processing_status?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          session_id?: string | null
        }
        Relationships: []
      }
      hubtel_ussd_sessions: {
        Row: {
          created_at: string
          id: string
          mobile: string | null
          service_code: string | null
          session_id: string
          state: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mobile?: string | null
          service_code?: string | null
          session_id: string
          state?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mobile?: string | null
          service_code?: string | null
          session_id?: string
          state?: Json
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          additional_charges: number
          amount: number
          amount_paid: number
          base_cbm_rate: number | null
          calculated_at: string | null
          container_id: string | null
          created_at: string
          currency: string
          effective_cbm_rate: number | null
          exchange_rate: number | null
          freight_subtotal: number | null
          id: string
          invoice_number: string
          notes: string | null
          pricing_rate_id: string | null
          shipment_cbm: number | null
          shipment_id: string
          status: string
          tax_amount: number | null
          total_amount: number
          updated_at: string
          user_code: string
          user_id: string
        }
        Insert: {
          additional_charges?: number
          amount?: number
          amount_paid?: number
          base_cbm_rate?: number | null
          calculated_at?: string | null
          container_id?: string | null
          created_at?: string
          currency?: string
          effective_cbm_rate?: number | null
          exchange_rate?: number | null
          freight_subtotal?: number | null
          id?: string
          invoice_number: string
          notes?: string | null
          pricing_rate_id?: string | null
          shipment_cbm?: number | null
          shipment_id: string
          status?: string
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          user_code: string
          user_id: string
        }
        Update: {
          additional_charges?: number
          amount?: number
          amount_paid?: number
          base_cbm_rate?: number | null
          calculated_at?: string | null
          container_id?: string | null
          created_at?: string
          currency?: string
          effective_cbm_rate?: number | null
          exchange_rate?: number | null
          freight_subtotal?: number | null
          id?: string
          invoice_number?: string
          notes?: string | null
          pricing_rate_id?: string | null
          shipment_cbm?: number | null
          shipment_id?: string
          status?: string
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          user_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "containers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_pricing_rate_id_fkey"
            columns: ["pricing_rate_id"]
            isOneToOne: false
            referencedRelation: "cbm_pricing_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      new_client_sms: {
        Row: {
          cbm: number | null
          company_id: string | null
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          message_sent: string
          notes: string | null
          phone: string
          product_description: string | null
          sms_error: string | null
          sms_message_id: string | null
          sms_sent: boolean
          sms_sent_at: string | null
          tracking_number: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          cbm?: number | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          message_sent: string
          notes?: string | null
          phone: string
          product_description?: string | null
          sms_error?: string | null
          sms_message_id?: string | null
          sms_sent?: boolean
          sms_sent_at?: string | null
          tracking_number?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          cbm?: number | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          message_sent?: string
          notes?: string | null
          phone?: string
          product_description?: string | null
          sms_error?: string | null
          sms_message_id?: string | null
          sms_sent?: boolean
          sms_sent_at?: string | null
          tracking_number?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "new_client_sms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_code: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_code?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_code?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      order_fulfillments: {
        Row: {
          contact_phone: string
          container_id: string
          created_at: string
          delivery_address: string | null
          delivery_location_id: string | null
          delivery_zone_id: string | null
          fulfillment_type: string
          id: string
          invoice_id: string
          notes: string | null
          status: string
          third_party_name: string | null
          third_party_phone: string | null
          updated_at: string
          user_code: string
          user_id: string
        }
        Insert: {
          contact_phone: string
          container_id: string
          created_at?: string
          delivery_address?: string | null
          delivery_location_id?: string | null
          delivery_zone_id?: string | null
          fulfillment_type: string
          id?: string
          invoice_id: string
          notes?: string | null
          status?: string
          third_party_name?: string | null
          third_party_phone?: string | null
          updated_at?: string
          user_code: string
          user_id: string
        }
        Update: {
          contact_phone?: string
          container_id?: string
          created_at?: string
          delivery_address?: string | null
          delivery_location_id?: string | null
          delivery_zone_id?: string | null
          fulfillment_type?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          status?: string
          third_party_name?: string | null
          third_party_phone?: string | null
          updated_at?: string
          user_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_fulfillments_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "containers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_fulfillments_delivery_location_id_fkey"
            columns: ["delivery_location_id"]
            isOneToOne: false
            referencedRelation: "delivery_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_fulfillments_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_fulfillments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: true
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_list_imports: {
        Row: {
          calculated_cartons: number
          calculated_cbm: number
          calculated_weight: number
          completed_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          container_id: string | null
          created_at: string
          customer_group_count: number
          duplicate_row_count: number
          fingerprint: string
          id: string
          imported_row_count: number
          invalid_contact_count: number
          matched_group_count: number
          packing_list_id: string | null
          review_row_count: number
          sheet_name: string | null
          source_filename: string
          source_row_count: number
          status: string
          unmatched_group_count: number
          updated_at: string
          uploaded_by: string
          validation_summary: Json
        }
        Insert: {
          calculated_cartons?: number
          calculated_cbm?: number
          calculated_weight?: number
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          container_id?: string | null
          created_at?: string
          customer_group_count?: number
          duplicate_row_count?: number
          fingerprint: string
          id?: string
          imported_row_count?: number
          invalid_contact_count?: number
          matched_group_count?: number
          packing_list_id?: string | null
          review_row_count?: number
          sheet_name?: string | null
          source_filename: string
          source_row_count?: number
          status?: string
          unmatched_group_count?: number
          updated_at?: string
          uploaded_by: string
          validation_summary?: Json
        }
        Update: {
          calculated_cartons?: number
          calculated_cbm?: number
          calculated_weight?: number
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          container_id?: string | null
          created_at?: string
          customer_group_count?: number
          duplicate_row_count?: number
          fingerprint?: string
          id?: string
          imported_row_count?: number
          invalid_contact_count?: number
          matched_group_count?: number
          packing_list_id?: string | null
          review_row_count?: number
          sheet_name?: string | null
          source_filename?: string
          source_row_count?: number
          status?: string
          unmatched_group_count?: number
          updated_at?: string
          uploaded_by?: string
          validation_summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "packing_list_imports_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "containers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packing_list_imports_packing_list_id_fkey"
            columns: ["packing_list_id"]
            isOneToOne: false
            referencedRelation: "packing_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_list_item_audit: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          changed_by: string | null
          created_at: string
          id: string
          packing_list_id: string
          packing_list_item_id: string
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          changed_by?: string | null
          created_at?: string
          id?: string
          packing_list_id: string
          packing_list_item_id: string
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          changed_by?: string | null
          created_at?: string
          id?: string
          packing_list_id?: string
          packing_list_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "packing_list_item_audit_packing_list_id_fkey"
            columns: ["packing_list_id"]
            isOneToOne: false
            referencedRelation: "packing_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packing_list_item_audit_packing_list_item_id_fkey"
            columns: ["packing_list_item_id"]
            isOneToOne: false
            referencedRelation: "packing_list_items"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_list_items: {
        Row: {
          cbm: number | null
          created_at: string
          customer_code: string | null
          customer_name: string | null
          customer_phone: string | null
          goods_type: string | null
          id: string
          match_method: string | null
          matched_phone: string | null
          matched_profile_id: string | null
          matched_user_id: string | null
          normalized_phone: string | null
          notes_original: string | null
          original_phone: string | null
          packing_list_id: string
          product_name: string
          quantity: number
          raw_row: Json
          receipt_number: string | null
          shipment_id: string | null
          sms_batch_id: string | null
          source_date: string | null
          source_item_key: string | null
          source_reference: string | null
          source_row: number | null
          validation_messages: string[]
          validation_status: string
          weight_kg: number | null
        }
        Insert: {
          cbm?: number | null
          created_at?: string
          customer_code?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          goods_type?: string | null
          id?: string
          match_method?: string | null
          matched_phone?: string | null
          matched_profile_id?: string | null
          matched_user_id?: string | null
          normalized_phone?: string | null
          notes_original?: string | null
          original_phone?: string | null
          packing_list_id: string
          product_name: string
          quantity?: number
          raw_row?: Json
          receipt_number?: string | null
          shipment_id?: string | null
          sms_batch_id?: string | null
          source_date?: string | null
          source_item_key?: string | null
          source_reference?: string | null
          source_row?: number | null
          validation_messages?: string[]
          validation_status?: string
          weight_kg?: number | null
        }
        Update: {
          cbm?: number | null
          created_at?: string
          customer_code?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          goods_type?: string | null
          id?: string
          match_method?: string | null
          matched_phone?: string | null
          matched_profile_id?: string | null
          matched_user_id?: string | null
          normalized_phone?: string | null
          notes_original?: string | null
          original_phone?: string | null
          packing_list_id?: string
          product_name?: string
          quantity?: number
          raw_row?: Json
          receipt_number?: string | null
          shipment_id?: string | null
          sms_batch_id?: string | null
          source_date?: string | null
          source_item_key?: string | null
          source_reference?: string | null
          source_row?: number | null
          validation_messages?: string[]
          validation_status?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "packing_list_items_packing_list_id_fkey"
            columns: ["packing_list_id"]
            isOneToOne: false
            referencedRelation: "packing_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packing_list_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_lists: {
        Row: {
          container_id: string | null
          container_name: string | null
          created_at: string
          customer_groups: number
          fingerprint: string | null
          id: string
          import_id: string | null
          matched_groups: number
          processed_at: string | null
          review_rows: number
          source_filename: string | null
          status: string
          total_cartons: number
          total_cbm: number | null
          total_entries: number
          total_weight: number | null
          unmatched_groups: number
          updated_at: string
          upload_date: string
        }
        Insert: {
          container_id?: string | null
          container_name?: string | null
          created_at?: string
          customer_groups?: number
          fingerprint?: string | null
          id?: string
          import_id?: string | null
          matched_groups?: number
          processed_at?: string | null
          review_rows?: number
          source_filename?: string | null
          status?: string
          total_cartons?: number
          total_cbm?: number | null
          total_entries?: number
          total_weight?: number | null
          unmatched_groups?: number
          updated_at?: string
          upload_date?: string
        }
        Update: {
          container_id?: string | null
          container_name?: string | null
          created_at?: string
          customer_groups?: number
          fingerprint?: string | null
          id?: string
          import_id?: string | null
          matched_groups?: number
          processed_at?: string | null
          review_rows?: number
          source_filename?: string | null
          status?: string
          total_cartons?: number
          total_cbm?: number | null
          total_entries?: number
          total_weight?: number | null
          unmatched_groups?: number
          updated_at?: string
          upload_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "packing_lists_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "containers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packing_lists_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "packing_list_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_confirmations: {
        Row: {
          amount: number
          container_id: string | null
          created_at: string
          hubtel_reference: string | null
          id: string
          invoice_id: string
          notes: string | null
          payment_method: string
          payment_provider: string | null
          status: string
          transaction_id: string
          updated_at: string
          user_code: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          container_id?: string | null
          created_at?: string
          hubtel_reference?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          payment_method?: string
          payment_provider?: string | null
          status?: string
          transaction_id: string
          updated_at?: string
          user_code: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          container_id?: string | null
          created_at?: string
          hubtel_reference?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_method?: string
          payment_provider?: string | null
          status?: string
          transaction_id?: string
          updated_at?: string
          user_code?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_confirmations_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "containers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_confirmations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          unique_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          unique_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          unique_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shipment_tracking_cache: {
        Row: {
          courier_code: string | null
          courier_name: string | null
          created_at: string
          current_location: string | null
          destination: string | null
          events: Json | null
          guangzhou_detected: boolean | null
          guangzhou_detected_at: string | null
          id: string
          is_delivered: boolean | null
          last_webhook_at: string | null
          status: string | null
          tracking_number: string
          updated_at: string
          warehouse_confirmation: boolean | null
          warehouse_confirmed_at: string | null
          warehouse_confirmed_by: string | null
          warehouse_status: string | null
        }
        Insert: {
          courier_code?: string | null
          courier_name?: string | null
          created_at?: string
          current_location?: string | null
          destination?: string | null
          events?: Json | null
          guangzhou_detected?: boolean | null
          guangzhou_detected_at?: string | null
          id?: string
          is_delivered?: boolean | null
          last_webhook_at?: string | null
          status?: string | null
          tracking_number: string
          updated_at?: string
          warehouse_confirmation?: boolean | null
          warehouse_confirmed_at?: string | null
          warehouse_confirmed_by?: string | null
          warehouse_status?: string | null
        }
        Update: {
          courier_code?: string | null
          courier_name?: string | null
          created_at?: string
          current_location?: string | null
          destination?: string | null
          events?: Json | null
          guangzhou_detected?: boolean | null
          guangzhou_detected_at?: string | null
          id?: string
          is_delivered?: boolean | null
          last_webhook_at?: string | null
          status?: string | null
          tracking_number?: string
          updated_at?: string
          warehouse_confirmation?: boolean | null
          warehouse_confirmed_at?: string | null
          warehouse_confirmed_by?: string | null
          warehouse_status?: string | null
        }
        Relationships: []
      }
      shipments: {
        Row: {
          company_id: string
          container_id: string | null
          created_at: string
          customer_location: string | null
          customer_name: string | null
          customer_phone: string | null
          destination: string
          dimensions: string | null
          estimated_delivery: string | null
          id: string
          notes: string | null
          origin: string
          product: string
          service_type: string | null
          status: Database["public"]["Enums"]["shipment_status"]
          tracking_number: string
          updated_at: string
          user_code: string
          user_id: string | null
          vehicle_identifier: string | null
          vehicle_model: string | null
          vehicle_year: number | null
          weight: number | null
        }
        Insert: {
          company_id: string
          container_id?: string | null
          created_at?: string
          customer_location?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          destination: string
          dimensions?: string | null
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          origin: string
          product: string
          service_type?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          tracking_number: string
          updated_at?: string
          user_code: string
          user_id?: string | null
          vehicle_identifier?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          weight?: number | null
        }
        Update: {
          company_id?: string
          container_id?: string | null
          created_at?: string
          customer_location?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          destination?: string
          dimensions?: string | null
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          origin?: string
          product?: string
          service_type?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          tracking_number?: string
          updated_at?: string
          user_code?: string
          user_id?: string | null
          vehicle_identifier?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "containers"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_batches: {
        Row: {
          attempt_count: number
          created_at: string
          customer_code: string | null
          customer_name: string | null
          customer_phone: string
          id: string
          last_attempt_at: string | null
          normalized_phone: string | null
          packing_list_id: string
          product_summary: string
          provider_response: Json | null
          sms_error: string | null
          sms_message_id: string | null
          sms_sent: boolean | null
          sms_sent_at: string | null
          sms_status: string
          total_cbm: number | null
          total_quantity: number
          total_weight: number | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          customer_code?: string | null
          customer_name?: string | null
          customer_phone: string
          id?: string
          last_attempt_at?: string | null
          normalized_phone?: string | null
          packing_list_id: string
          product_summary: string
          provider_response?: Json | null
          sms_error?: string | null
          sms_message_id?: string | null
          sms_sent?: boolean | null
          sms_sent_at?: string | null
          sms_status?: string
          total_cbm?: number | null
          total_quantity?: number
          total_weight?: number | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          customer_code?: string | null
          customer_name?: string | null
          customer_phone?: string
          id?: string
          last_attempt_at?: string | null
          normalized_phone?: string | null
          packing_list_id?: string
          product_summary?: string
          provider_response?: Json | null
          sms_error?: string | null
          sms_message_id?: string | null
          sms_sent?: boolean | null
          sms_sent_at?: string | null
          sms_status?: string
          total_cbm?: number | null
          total_quantity?: number
          total_weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_batches_packing_list_id_fkey"
            columns: ["packing_list_id"]
            isOneToOne: false
            referencedRelation: "packing_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      warehouse_alerts: {
        Row: {
          alert_type: string
          courier_name: string | null
          created_at: string
          id: string
          shipment_location: string | null
          sms_recipients: Json | null
          sms_results: Json | null
          sms_status: string
          tracking_number: string
          updated_at: string
        }
        Insert: {
          alert_type?: string
          courier_name?: string | null
          created_at?: string
          id?: string
          shipment_location?: string | null
          sms_recipients?: Json | null
          sms_results?: Json | null
          sms_status?: string
          tracking_number: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          courier_name?: string | null
          created_at?: string
          id?: string
          shipment_location?: string | null
          sms_recipients?: Json | null
          sms_results?: Json | null
          sms_status?: string
          tracking_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      warehouse_submissions: {
        Row: {
          cbm: number | null
          cbm_cost: number | null
          container_id: string | null
          container_name: string | null
          created_at: string
          customer_name: string | null
          customer_user_code: string | null
          fulfillment_date: string
          height_cm: number | null
          id: string
          length_cm: number | null
          notes: string | null
          product_details: string | null
          product_name: string
          quantity_received: number
          shipment_id: string | null
          sms_error: string | null
          sms_sent: boolean | null
          sms_sent_at: string | null
          status: string
          tracking_number: string
          updated_at: string
          visible_to_customer: boolean
          width_cm: number | null
        }
        Insert: {
          cbm?: number | null
          cbm_cost?: number | null
          container_id?: string | null
          container_name?: string | null
          created_at?: string
          customer_name?: string | null
          customer_user_code?: string | null
          fulfillment_date?: string
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          notes?: string | null
          product_details?: string | null
          product_name: string
          quantity_received?: number
          shipment_id?: string | null
          sms_error?: string | null
          sms_sent?: boolean | null
          sms_sent_at?: string | null
          status?: string
          tracking_number: string
          updated_at?: string
          visible_to_customer?: boolean
          width_cm?: number | null
        }
        Update: {
          cbm?: number | null
          cbm_cost?: number | null
          container_id?: string | null
          container_name?: string | null
          created_at?: string
          customer_name?: string | null
          customer_user_code?: string | null
          fulfillment_date?: string
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          notes?: string | null
          product_details?: string | null
          product_name?: string
          quantity_received?: number
          shipment_id?: string | null
          sms_error?: string | null
          sms_sent?: boolean | null
          sms_sent_at?: string | null
          status?: string
          tracking_number?: string
          updated_at?: string
          visible_to_customer?: boolean
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_submissions_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "containers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_submissions_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      company_admins_safe: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string | null
          is_active: boolean | null
          last_login: string | null
          locked_until: string | null
          login_attempts: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          is_active?: boolean | null
          last_login?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          is_active?: boolean | null
          last_login?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_admins_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_freight_by_cbm: {
        Args: { p_cbm: number; p_service_type?: string }
        Returns: number
      }
      commit_packing_list_import: {
        Args: {
          p_container: Json
          p_filename: string
          p_fingerprint: string
          p_rows: Json
          p_sheet_name: string
        }
        Returns: Json
      }
      commit_packing_list_import_service: {
        Args: {
          p_actor: string
          p_container: Json
          p_filename: string
          p_fingerprint: string
          p_rows: Json
          p_sheet_name: string
        }
        Returns: Json
      }
      consume_endpoint_rate_limit: {
        Args: {
          p_endpoint: string
          p_ip_hash: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      create_company_admin: {
        Args: { p_company_id: string; p_created_by: string }
        Returns: {
          password: string
          username: string
        }[]
      }
      generate_company_username: {
        Args: { company_name: string }
        Returns: string
      }
      generate_container_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_secure_password: { Args: never; Returns: string }
      generate_tracking_number: { Args: never; Returns: string }
      generate_user_code:
        | { Args: never; Returns: string }
        | { Args: { p_full_name?: string }; Returns: string }
      get_active_cbm_rate: {
        Args: { p_service_type?: string }
        Returns: {
          base_rate: number
          currency: string
          effective_rate: number
          exchange_rate: number
          id: string
        }[]
      }
      get_active_delivery_partners_public: {
        Args: never
        Returns: {
          coverage: string
          id: string
          is_active: boolean
          logo_url: string
          name: string
          service_description: string
        }[]
      }
      get_company_admin_company_id: { Args: never; Returns: string }
      get_company_admins_safe: {
        Args: never
        Returns: {
          company_id: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          last_login: string
          locked_until: string
          login_attempts: number
          updated_at: string
          username: string
        }[]
      }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
      is_company_customer: {
        Args: { p_company_id: string; p_unique_code: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id?: string
          p_entity_type: string
        }
        Returns: string
      }
      log_sensitive_access: {
        Args: { p_access_type: string; p_table_name: string }
        Returns: undefined
      }
      logout_company_admin: { Args: { p_token: string }; Returns: boolean }
      normalize_import_phone: { Args: { _phone: string }; Returns: string }
      phone_matches_single_profile: {
        Args: { _phone: string; _user_id: string }
        Returns: boolean
      }
      record_invoice_payment: {
        Args: { p_amount: number; p_invoice_id: string }
        Returns: {
          amount_paid: number
          new_status: string
          total_amount: number
        }[]
      }
      reset_company_admin_password: {
        Args: { p_admin_id: string }
        Returns: string
      }
      user_has_container_access: {
        Args: { _container_id: string; _user_id: string }
        Returns: boolean
      }
      verify_company_admin_login: {
        Args: {
          p_ip_address?: string
          p_password: string
          p_user_agent?: string
          p_username: string
        }
        Returns: {
          admin_id: string
          company_id: string
          company_name: string
          error_message: string
          session_token: string
          success: boolean
        }[]
      }
      verify_company_session: {
        Args: { p_token: string }
        Returns: {
          admin_id: string
          company_id: string
          company_name: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "customer" | "manager" | "admin" | "staff"
      shipment_status:
        | "pending"
        | "in-transit"
        | "customs"
        | "arrived"
        | "delivered"
        | "received_china"
        | "processing"
        | "in_transit"
        | "arrived_ghana"
        | "ready_collection"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["customer", "manager", "admin", "staff"],
      shipment_status: [
        "pending",
        "in-transit",
        "customs",
        "arrived",
        "delivered",
        "received_china",
        "processing",
        "in_transit",
        "arrived_ghana",
        "ready_collection",
      ],
    },
  },
} as const
