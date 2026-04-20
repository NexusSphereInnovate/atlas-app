export type Shareholder = {
  type: "person" | "company";
  first_name?: string;
  last_name?: string;
  company_name?: string;
  shares: number;
};

export type CompanyRequestRow = {
  id: string;
  org_id: string;
  client_id: string;
  assigned_agent_user_id: string | null;

  company_name_1: string;
  company_name_2: string | null;
  company_name_3: string | null;

  sic_codes: string[];
  business_description: string | null;

  share_capital_amount: number;
  share_value: number;
  currency: string;

  shareholders: Shareholder[];

  director_first_name: string;
  director_last_name: string;
  director_date_of_birth: string;
  director_nationality: string;
  director_address: string;

  needs_branch_ch: boolean;
  needs_branch_fr: boolean;

  status: string;

  created_at: string;
  updated_at: string;
};