export type UserRole = "admin_global" | "admin_org" | "agent" | "client";

export type CompanyRequestStatus =
  | "draft"
  | "info_submitted"
  | "kyc_required"
  | "kyc_in_review"
  | "identity_verification"
  | "company_created"
  | "submitted_companies_house"
  | "branch_preparation"
  | "completed";

export type ContractStatus = "draft" | "sent" | "signed" | "cancelled";

export type DocumentCategory =
  | "identity"
  | "bank_statement"
  | "proof_of_address"
  | "company"
  | "invoice"
  | "contract"
  | "branch"
  | "other";

export type DocumentVisibility = "client" | "internal" | "private";

export type InvoiceStatus = "draft" | "sent" | "payment_claimed" | "paid" | "cancelled" | "overdue";

export type CommissionStatus = "pending" | "validated" | "paid" | "cancelled";

export type CommissionType = "fixed" | "percentage";

export type OrderStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type ShareholderType = "person" | "company";

export interface Notification {
  id: string;
  org_id: string | null;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export type ServiceCategory = "web" | "hosting" | "software" | "marketing" | "security" | "consulting";
export type ServicePriceType = "fixed" | "monthly" | "quote";

export type CompanyStatus = "active" | "dormant" | "dissolved" | "in_dissolution";
export type ServiceRequestStatus = "pending" | "reviewing" | "quoted" | "accepted" | "rejected" | "completed";

export interface Company {
  id: string;
  org_id: string | null;
  client_id: string;
  request_id: string | null;
  name: string;
  company_number: string | null;
  incorporation_date: string | null;
  registered_address: string | null;
  status: CompanyStatus;
  has_branch_ch: boolean;
  branch_canton: string | null;
  branch_address: string | null;
  branch_created_date: string | null;
  compliance_due_date: string | null;
  last_compliance_date: string | null;
  compliance_price: number;
  compliance_currency: string;
  accounting_pack: boolean;
  accounting_price: number | null;
  accounting_currency: string;
  dissolution_price: number;
  dissolution_currency: string;
  admin_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  client?: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

export interface ServiceRequest {
  id: string;
  org_id: string | null;
  client_id: string;
  service_id: string | null;
  service_name: string;
  category: string | null;
  message: string | null;
  status: ServiceRequestStatus;
  admin_reply: string | null;
  quoted_price: number | null;
  quoted_currency: string;
  circle_value: number;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  client?: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

export interface AtlasCircleEntry {
  id: string;
  org_id: string | null;
  client_id: string;
  type: "manual" | "invoice" | "service_request" | "bonus";
  amount: number;
  label: string;
  ref_id: string | null;
  added_by: string | null;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  short_description: string | null;
  description: string | null;
  price_from: number | null;
  price_currency: string;
  price_type: ServicePriceType;
  is_active: boolean;
  sort_order: number;
  icon: string | null;
  features: string[];
  created_at: string;
  updated_at: string;
}

export interface Shareholder {
  type: ShareholderType;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  nationality?: string;
  address?: string;
  share_count: number;
  share_percentage: number;
  email?: string;
}

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["organizations"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
      };
      user_profiles: {
        Row: {
          id: string;
          org_id: string | null;
          role: UserRole;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          is_active: boolean;
          assigned_agent_id: string | null;
          invited_by: string | null;
          referral_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["user_profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["user_profiles"]["Insert"]>;
      };
      invitations: {
        Row: {
          id: string;
          org_id: string | null;
          email: string;
          role: UserRole;
          token: string;
          invited_by: string | null;
          agent_id: string | null;
          accepted_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["invitations"]["Row"], "id" | "token" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["invitations"]["Insert"]>;
      };
      company_requests: {
        Row: {
          id: string;
          org_id: string | null;
          client_id: string;
          assigned_agent_id: string | null;
          status: CompanyRequestStatus;
          proposed_names: string[];
          sic_codes: string[];
          share_capital: number | null;
          share_value: number | null;
          share_count: number | null;
          shareholders: Shareholder[];
          director_first_name: string | null;
          director_last_name: string | null;
          director_dob: string | null;
          director_nationality: string | null;
          director_address_line1: string | null;
          director_address_line2: string | null;
          director_city: string | null;
          director_postcode: string | null;
          director_country: string | null;
          needs_branch_ch: boolean;
          needs_branch_fr: boolean;
          company_number: string | null;
          company_name_final: string | null;
          incorporation_date: string | null;
          admin_notes: string | null;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["company_requests"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["company_requests"]["Insert"]>;
      };
      orders: {
        Row: {
          id: string;
          org_id: string | null;
          client_id: string;
          agent_id: string | null;
          company_request_id: string | null;
          status: OrderStatus;
          title: string;
          description: string | null;
          total_amount: number;
          admin_notes: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["orders"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
      };
      invoices: {
        Row: {
          id: string;
          org_id: string | null;
          order_id: string | null;
          client_id: string;
          agent_id: string | null;
          invoice_number: string;
          status: InvoiceStatus;
          subtotal: number;
          tax_rate: number | null;
          tax_amount: number | null;
          total: number;
          currency: string;
          due_date: string | null;
          paid_at: string | null;
          payment_method: string | null;
          payment_ref: string | null;
          cgv_version: string | null;
          cgv_accepted: boolean | null;
          cgv_accepted_at: string | null;
          pdf_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["invoices"]["Row"], "id" | "invoice_number" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
      };
      billing_items: {
        Row: {
          id: string;
          invoice_id: string;
          label: string;
          quantity: number;
          unit_price: number;
          total: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["billing_items"]["Row"], "id" | "total" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["billing_items"]["Insert"]>;
      };
      commissions: {
        Row: {
          id: string;
          org_id: string | null;
          agent_id: string;
          invoice_id: string | null;
          order_id: string | null;
          client_id: string | null;
          type: CommissionType;
          rate: number | null;
          amount: number;
          currency: string;
          status: CommissionStatus;
          paid_at: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["commissions"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["commissions"]["Insert"]>;
      };
      commission_rules: {
        Row: {
          id: string;
          org_id: string | null;
          invoice_id: string | null;
          order_id: string | null;
          agent_id: string;
          type: CommissionType;
          value: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["commission_rules"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["commission_rules"]["Insert"]>;
      };
      agent_bonus_rules: {
        Row: {
          id: string;
          org_id: string | null;
          tier_name: string;
          min_sales_count: number | null;
          min_revenue: number | null;
          bonus_amount: number | null;
          bonus_type: CommissionType;
          description: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["agent_bonus_rules"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["agent_bonus_rules"]["Insert"]>;
      };
      member_tiers: {
        Row: {
          id: string;
          org_id: string | null;
          tier_name: string;
          min_orders: number;
          min_spend: number;
          benefits: string[];
          color: string | null;
          icon: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["member_tiers"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["member_tiers"]["Insert"]>;
      };
      documents: {
        Row: {
          id: string;
          org_id: string | null;
          client_id: string;
          uploaded_by: string | null;
          company_request_id: string | null;
          category: DocumentCategory;
          visibility: DocumentVisibility;
          name: string;
          label: string | null;
          storage_path: string;
          mime_type: string | null;
          size_bytes: number | null;
          is_verified: boolean | null;
          verified_by: string | null;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["documents"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
      };
      contract_acceptances: {
        Row: {
          id: string;
          org_id: string | null;
          invoice_id: string | null;
          order_id: string | null;
          accepted_by_user_id: string;
          company_name: string | null;
          first_name: string;
          last_name: string;
          email: string;
          cgv_version: string;
          acceptance_snapshot: string;
          ip_address: string | null;
          user_agent: string | null;
          accepted_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["contract_acceptances"]["Row"], "id" | "accepted_at">;
        Update: Partial<Database["public"]["Tables"]["contract_acceptances"]["Insert"]>;
      };
      org_settings: {
        Row: {
          id: string;
          org_id: string;
          atlas_circle_rules: Record<string, unknown>;
          commission_defaults: Record<string, unknown>;
          cgv_current_version: string | null;
          cgv_content: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["org_settings"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["org_settings"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      auth_role: { Args: Record<string, never>; Returns: UserRole };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_agent_of: { Args: { p_client_id: string }; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      company_request_status: CompanyRequestStatus;
      document_category: DocumentCategory;
      invoice_status: InvoiceStatus;
      commission_status: CommissionStatus;
      commission_type: CommissionType;
      order_status: OrderStatus;
    };
  };
}
