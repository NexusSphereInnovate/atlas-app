import { z } from "zod";

export const shareholderSchema = z.object({
  type: z.enum(["person", "company"]),
  first_name: z.string().trim().min(1).optional(),
  last_name: z.string().trim().min(1).optional(),
  company_name: z.string().trim().min(1).optional(),
  shares: z.number().int().min(1),
}).superRefine((val, ctx) => {
  if (val.type === "person") {
    if (!val.first_name || !val.last_name) {
      ctx.addIssue({ code: "custom", message: "Nom + prénom requis pour un actionnaire personne." });
    }
  }
  if (val.type === "company") {
    if (!val.company_name) {
      ctx.addIssue({ code: "custom", message: "Nom de société requis pour un actionnaire entreprise." });
    }
  }
});

export const companyRequestPatchSchema = z.object({
  company_name_1: z.string().trim().min(2).max(160).optional(),
  company_name_2: z.string().trim().min(2).max(160).nullable().optional(),
  company_name_3: z.string().trim().min(2).max(160).nullable().optional(),

  sic_codes: z.array(z.string().trim().min(5).max(5)).max(4).optional(),
  business_description: z.string().trim().min(10).max(1200).nullable().optional(),

  share_capital_amount: z.number().positive().max(100000000).optional(),
  share_value: z.number().positive().max(1000000).optional(),
  currency: z.string().trim().min(3).max(3).optional(),

  shareholders: z.array(shareholderSchema).min(1).optional(),

  director_first_name: z.string().trim().min(1).max(80).optional(),
  director_last_name: z.string().trim().min(1).max(80).optional(),
  director_date_of_birth: z.string().trim().min(10).max(10).optional(),
  director_nationality: z.string().trim().min(2).max(80).optional(),
  director_address: z.string().trim().min(8).max(400).optional(),

  needs_branch_ch: z.boolean().optional(),
  needs_branch_fr: z.boolean().optional(),

  status: z.string().trim().min(1).optional(),
});

export type CompanyRequestPatch = z.infer<typeof companyRequestPatchSchema>;