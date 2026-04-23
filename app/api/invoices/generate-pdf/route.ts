import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

// ─── Design tokens (same as contracts) ───────────────────────────────────────
const BLACK   = "#0A0A0A";
const DARK    = "#2A2A2A";
const GRAY    = "#555555";
const LIGHT   = "#888888";
const GOLD    = "#8C6D1F";
const GOLD_LT = "#F5F0E3";
const CREAM   = "#FAFAF7";
const RULE_G  = "#C4AA68";
const RULE_L  = "#E4DDD0";
const WHITE   = "#FFFFFF";

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica", fontSize: 8.5, color: DARK,
    paddingTop: 0, paddingBottom: 52, lineHeight: 1.55,
    backgroundColor: WHITE,
  },
  // Letterhead
  headerWrap: {
    paddingTop: 26, paddingBottom: 14,
    paddingLeft: 52, paddingRight: 52,
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
  },
  headerBrand: { fontSize: 16, fontFamily: "Helvetica-Bold", color: BLACK, letterSpacing: 3 },
  headerSub:   { fontSize: 6.5, color: LIGHT, marginTop: 3, letterSpacing: 0.3 },
  headerRight: { alignItems: "flex-end" },
  headerTag:   { fontSize: 7, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1.5, marginBottom: 2 },
  headerDate:  { fontSize: 7, color: LIGHT },
  headerRuleG: { height: 1.5, backgroundColor: RULE_G },
  headerRuleL: { height: 0.5, backgroundColor: RULE_L, marginBottom: 22 },
  body:        { paddingLeft: 52, paddingRight: 52 },

  // Title block
  titleBlock: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 18, paddingBottom: 14,
    borderBottomWidth: 0.5, borderBottomColor: RULE_L,
  },
  titleMain:   { fontSize: 20, fontFamily: "Helvetica-Bold", color: BLACK, letterSpacing: 2 },
  titleNumber: { fontSize: 10, color: GOLD, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, marginTop: 3 },

  // Status badges
  badgePaid:    { fontSize: 7, fontFamily: "Helvetica-Bold", color: WHITE, backgroundColor: "#10B981", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 3 },
  badgePending: { fontSize: 7, fontFamily: "Helvetica-Bold", color: BLACK, backgroundColor: "#F59E0B", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 3 },
  badgeClaimed: { fontSize: 7, fontFamily: "Helvetica-Bold", color: WHITE, backgroundColor: "#3B82F6", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 3 },
  badgeDraft:   { fontSize: 7, fontFamily: "Helvetica-Bold", color: LIGHT, backgroundColor: CREAM, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 3, borderWidth: 0.5, borderColor: RULE_L },

  // Parties
  partiesRow: { flexDirection: "row", marginBottom: 14 },
  partyBoxL:  {
    flex: 1, marginRight: 10,
    borderLeftWidth: 2, borderLeftColor: GOLD,
    borderTopWidth: 0.5, borderTopColor: RULE_L,
    borderRightWidth: 0.5, borderRightColor: RULE_L,
    borderBottomWidth: 0.5, borderBottomColor: RULE_L,
    borderRadius: 2, overflow: "hidden",
  },
  partyBoxR: {
    flex: 1, marginLeft: 10,
    borderWidth: 0.5, borderColor: RULE_L,
    borderRadius: 2, overflow: "hidden",
  },
  partyHeader:  { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: CREAM },
  partyLbl:     { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1.2 },
  partyLblGray: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: LIGHT, letterSpacing: 1.2 },
  partyBody:    { padding: 10, paddingTop: 8 },
  partyName:    { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 2 },
  partyLine:    { fontSize: 7.5, color: GRAY, marginBottom: 1.5 },

  // Meta row (dates)
  metaRow:   { flexDirection: "row", marginBottom: 14 },
  metaBox:   { flex: 1, borderWidth: 0.5, borderColor: RULE_L, borderRadius: 2, padding: 8, marginRight: 8 },
  metaBoxL:  { borderLeftWidth: 2, borderLeftColor: GOLD },
  metaLabel: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: LIGHT, letterSpacing: 0.8, marginBottom: 3 },
  metaValue: { fontSize: 8.5, color: BLACK, fontFamily: "Helvetica-Bold" },

  // Table
  tableWrap:    { marginBottom: 10, borderWidth: 0.5, borderColor: RULE_L, borderRadius: 2 },
  tableHdr:     { flexDirection: "row", backgroundColor: DARK, paddingHorizontal: 10, paddingVertical: 5 },
  tableHdrCell: { fontSize: 7, fontFamily: "Helvetica-Bold", color: WHITE, letterSpacing: 0.5 },
  tableRow:     { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: RULE_L },
  tableRowAlt:  { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: RULE_L, backgroundColor: CREAM },
  tableCell:    { fontSize: 8.5, color: DARK },
  tableTotalRow:{ flexDirection: "row", paddingHorizontal: 10, paddingVertical: 6, backgroundColor: GOLD },
  tableTotalLbl:{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: WHITE, flex: 1 },
  tableTotalVal:{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: WHITE, width: 90, textAlign: "right" },

  // Note box
  noteBox:   { borderWidth: 0.5, borderColor: RULE_G, borderRadius: 2, backgroundColor: GOLD_LT, padding: 9, marginBottom: 12 },
  noteTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GOLD, marginBottom: 3 },
  noteText:  { fontSize: 7.5, color: GRAY, lineHeight: 1.55 },

  // Signature / status stamps
  sigSection: { marginTop: 12 },
  sigTitle:   { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1.5, marginBottom: 10 },
  sigRow:     { flexDirection: "row" },
  sigBoxLeft: { flex: 1, marginRight: 12 },
  sigBoxRight:{ flex: 1 },
  sigLabel:   { fontSize: 7, fontFamily: "Helvetica-Bold", color: BLACK, letterSpacing: 1, marginBottom: 4 },
  sigStamp:   {
    borderWidth: 0.5, borderColor: RULE_G,
    borderLeftWidth: 2, borderLeftColor: GOLD,
    borderRadius: 2, backgroundColor: GOLD_LT,
    padding: 10,
  },
  sigStampGreen: {
    borderWidth: 0.5, borderColor: "#6EE7B7",
    borderLeftWidth: 2, borderLeftColor: "#10B981",
    borderRadius: 2, backgroundColor: "#F0FDF4",
    padding: 10,
  },
  sigStampBlue: {
    borderWidth: 0.5, borderColor: "#93C5FD",
    borderLeftWidth: 2, borderLeftColor: "#3B82F6",
    borderRadius: 2, backgroundColor: "#EFF6FF",
    padding: 10,
  },
  sigStampName: { fontSize: 10, fontFamily: "Helvetica-BoldOblique", color: BLACK, marginBottom: 3 },
  sigStampLine: { fontSize: 7, color: GRAY, marginBottom: 1.5 },
  sigStampSeal: { marginTop: 5, fontSize: 6.5, color: GOLD, letterSpacing: 0.5 },
  sigStampSealGreen: { marginTop: 5, fontSize: 6.5, color: "#10B981", letterSpacing: 0.5 },
  sigStampSealBlue:  { marginTop: 5, fontSize: 6.5, color: "#3B82F6", letterSpacing: 0.5 },
  sigBlank:  {
    borderWidth: 0.5, borderColor: RULE_L, borderRadius: 2, height: 58,
    backgroundColor: CREAM, alignItems: "center", justifyContent: "center",
  },
  sigBlankHint: { fontSize: 7.5, color: "#CCCCCC", fontStyle: "italic" },

  // Footer
  footer: {
    position: "absolute", bottom: 18, left: 52, right: 52,
    paddingTop: 6, borderTopWidth: 0.5, borderTopColor: RULE_G,
    flexDirection: "row", justifyContent: "space-between",
  },
  footerText: { fontSize: 6.5, color: LIGHT },
  footerPage: { fontSize: 6.5, color: LIGHT },

  // Legal note
  legal: { marginTop: 14, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: RULE_L },
  legalText: { fontSize: 7, color: LIGHT, lineHeight: 1.55 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtNum(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u2019");
}
function fmtMoney(amount: number, currency: string) {
  return `${fmtNum(amount)} ${currency}`;
}
function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
function fmtDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} à ${time}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface InvoicePdfItem {
  label: string;
  quantity: number;
  unit_price: number;
  currency?: string;
}

interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  currency: string;
  // Client
  clientName: string;
  clientAddress?: string;
  clientPostal?: string;
  clientCity?: string;
  clientCountry?: string;
  clientEmail?: string;
  // Items
  items: InvoicePdfItem[];
  totalAmount: number;
  // Status
  status: string;
  cgvAccepted?: boolean;
  cgvAcceptedAt?: string;
  paymentClaimedAt?: string;
  paidAt?: string;
  paymentMethod?: string;
}

const CE = React.createElement;

function Header({ date }: { date: string }) {
  return CE(View, null,
    CE(View, { style: S.headerWrap },
      CE(View, null,
        CE(Text, { style: S.headerBrand }, "ATLAS INCORPORATE"),
        CE(Text, { style: S.headerSub }, "AS International Group LTD  ·  128 City Road, London, EC1V 2NX, United Kingdom"),
      ),
      CE(View, { style: S.headerRight },
        CE(Text, { style: S.headerTag }, "FACTURE"),
        CE(Text, { style: S.headerDate }, date),
      ),
    ),
    CE(View, { style: S.headerRuleG }),
    CE(View, { style: S.headerRuleL }),
  );
}

function Footer() {
  return CE(View, { style: S.footer, fixed: true },
    CE(Text, { style: S.footerText }, "ATLAS INCORPORATE — AS International Group LTD — Document confidentiel"),
    CE(Text, { style: S.footerPage, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} / ${totalPages}` }),
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    draft: "Brouillon", sent: "En attente de paiement",
    payment_claimed: "Paiement déclaré", paid: "Payée  ✓",
    cancelled: "Annulée", overdue: "En retard",
  };
  const st: Record<string, object> = {
    paid: S.badgePaid, payment_claimed: S.badgeClaimed,
    sent: S.badgePending, overdue: { ...S.badgePending, backgroundColor: "#EF4444", color: WHITE },
    draft: S.badgeDraft, cancelled: S.badgeDraft,
  };
  return CE(Text, { style: st[status] ?? S.badgeDraft }, labels[status] ?? status);
}

function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  const {
    invoiceNumber, invoiceDate, dueDate, currency,
    clientName, clientAddress, clientPostal, clientCity, clientCountry, clientEmail,
    items, totalAmount,
    status, cgvAccepted, cgvAcceptedAt, paymentClaimedAt, paidAt, paymentMethod,
  } = data;

  const cityLine    = [clientPostal, clientCity].filter(Boolean).join(" ");
  const countryLine = [cityLine, clientCountry].filter(Boolean).join(", ");

  return CE(Document,
    { title: `Facture ${invoiceNumber} — Atlas Incorporate`, author: "Atlas Incorporate" },

    CE(Page, { size: "A4", style: S.page },
      CE(Header, { date: invoiceDate }),
      CE(View, { style: S.body },

        // ── Title block
        CE(View, { style: S.titleBlock },
          CE(View, null,
            CE(Text, { style: S.titleMain }, "FACTURE"),
            CE(Text, { style: S.titleNumber }, `N°  ${invoiceNumber}`),
          ),
          CE(StatusBadge, { status }),
        ),

        // ── Parties
        CE(View, { style: S.partiesRow },
          // Prestataire
          CE(View, { style: S.partyBoxL },
            CE(View, { style: S.partyHeader },
              CE(Text, { style: S.partyLbl }, "DE — LE PRESTATAIRE"),
            ),
            CE(View, { style: S.partyBody },
              CE(Text, { style: S.partyName }, "AS International Group LTD"),
              CE(Text, { style: S.partyLine }, "dba  Atlas Incorporate"),
              CE(Text, { style: S.partyLine }, "128 City Road, London, EC1V 2NX"),
              CE(Text, { style: S.partyLine }, "United Kingdom"),
            ),
          ),
          // Client
          CE(View, { style: S.partyBoxR },
            CE(View, { style: S.partyHeader },
              CE(Text, { style: S.partyLblGray }, "\u00c0 — LE CLIENT"),
            ),
            CE(View, { style: S.partyBody },
              CE(Text, { style: S.partyName }, clientName),
              clientAddress  ? CE(Text, { style: S.partyLine }, clientAddress)  : null,
              countryLine    ? CE(Text, { style: S.partyLine }, countryLine)    : null,
              clientEmail    ? CE(Text, { style: S.partyLine }, clientEmail)    : null,
            ),
          ),
        ),

        // ── Meta row
        CE(View, { style: S.metaRow },
          CE(View, { style: { ...S.metaBox, ...S.metaBoxL } },
            CE(Text, { style: S.metaLabel }, "DATE D\u2019\u00c9MISSION"),
            CE(Text, { style: S.metaValue }, invoiceDate),
          ),
          dueDate ? CE(View, { style: S.metaBox },
            CE(Text, { style: S.metaLabel }, "DATE D\u2019\u00c9CH\u00c9ANCE"),
            CE(Text, { style: S.metaValue }, dueDate),
          ) : null,
          CE(View, { style: { ...S.metaBox, marginRight: 0 } },
            CE(Text, { style: S.metaLabel }, "DEVISE"),
            CE(Text, { style: S.metaValue }, currency),
          ),
        ),

        // ── Items table
        CE(View, { style: S.tableWrap },
          CE(View, { style: S.tableHdr },
            CE(Text, { style: { ...S.tableHdrCell, flex: 1 } }, "PRESTATION"),
            CE(Text, { style: { ...S.tableHdrCell, width: 36, textAlign: "center" } }, "QT\u00c9"),
            CE(Text, { style: { ...S.tableHdrCell, width: 82, textAlign: "right" } }, "PRIX UNIT."),
            CE(Text, { style: { ...S.tableHdrCell, width: 82, textAlign: "right" } }, "TOTAL"),
          ),
          ...items.map((item, i) =>
            CE(View, { key: i, style: i % 2 === 0 ? S.tableRow : S.tableRowAlt },
              CE(Text, { style: { ...S.tableCell, flex: 1 } }, item.label),
              CE(Text, { style: { ...S.tableCell, width: 36, textAlign: "center" } }, String(item.quantity)),
              CE(Text, { style: { ...S.tableCell, width: 82, textAlign: "right" } },
                `${fmtNum(item.unit_price)} ${currency}`),
              CE(Text, { style: { ...S.tableCell, width: 82, textAlign: "right" } },
                `${fmtNum(item.unit_price * item.quantity)} ${currency}`),
            )
          ),
          CE(View, { style: S.tableTotalRow },
            CE(Text, { style: S.tableTotalLbl }, "TOTAL TTC"),
            CE(Text, { style: S.tableTotalVal }, fmtMoney(totalAmount, currency)),
          ),
        ),

        // ── Payment note
        CE(View, { style: S.noteBox },
          CE(Text, { style: S.noteTitle }, "Modalit\u00e9s de paiement"),
          CE(Text, { style: S.noteText },
            paymentMethod
              ? `Paiement re\u00e7u par ${paymentMethod}. Merci pour votre confiance.`
              : "Sauf stipulation contraire, le paiement est exigible \u00e0 r\u00e9ception de la pr\u00e9sente facture. Les sommes vers\u00e9es sont d\u00e9finitivement acquises au Prestataire."),
        ),

        // ── Signature / status section
        CE(View, { style: S.sigSection },
          CE(Text, { style: S.sigTitle }, "STATUT ET ACCEPTATION"),

          CE(View, { style: S.sigRow },
            // Left: CGV acceptance
            CE(View, { style: S.sigBoxLeft },
              CE(Text, { style: S.sigLabel }, "CONDITIONS G\u00c9N\u00c9RALES DE VENTE"),
              cgvAccepted
                ? CE(View, { style: S.sigStamp },
                    CE(Text, { style: S.sigStampName }, clientName),
                    CE(Text, { style: S.sigStampLine },
                      cgvAcceptedAt
                        ? `CGV accept\u00e9es le ${fmtDateTime(cgvAcceptedAt)}`
                        : "Conditions g\u00e9n\u00e9rales accept\u00e9es"),
                    CE(Text, { style: S.sigStampLine }, "Signature \u00e9lectronique — saisie du nom confirm\u00e9e"),
                    CE(Text, { style: S.sigStampSeal }, "\u2713  ACCEPTATION CERTIFI\u00c9E"),
                  )
                : CE(View, { style: S.sigBlank },
                    CE(Text, { style: S.sigBlankHint }, "En attente d\u2019acceptation"),
                  ),
            ),

            // Right: Payment status
            CE(View, { style: S.sigBoxRight },
              CE(Text, { style: S.sigLabel }, "STATUT DE PAIEMENT"),
              paidAt
                ? CE(View, { style: S.sigStampGreen },
                    CE(Text, { style: { ...S.sigStampName, color: "#065F46", fontSize: 9 } }, "FACTURE PAY\u00c9E"),
                    CE(Text, { style: { ...S.sigStampLine, color: "#047857" } }, `Confirm\u00e9 le ${fmtDateTime(paidAt)}`),
                    CE(Text, { style: S.sigStampSealGreen }, "\u2713  PAIEMENT CONFIRM\u00c9"),
                  )
                : paymentClaimedAt
                ? CE(View, { style: S.sigStampBlue },
                    CE(Text, { style: { ...S.sigStampName, fontSize: 9 } }, "Paiement d\u00e9clar\u00e9"),
                    CE(Text, { style: { ...S.sigStampLine, color: "#1D4ED8" } }, `D\u00e9clar\u00e9 le ${fmtDateTime(paymentClaimedAt)}`),
                    CE(Text, { style: { ...S.sigStampLine, color: "#3B82F6" } }, "V\u00e9rification en cours par Atlas"),
                    CE(Text, { style: S.sigStampSealBlue }, "\u23F3  VERIFICATION EN COURS"),
                  )
                : CE(View, { style: S.sigBlank },
                    CE(Text, { style: S.sigBlankHint }, "Paiement en attente"),
                  ),
            ),
          ),
        ),

        // ── Legal footer text
        CE(View, { style: S.legal },
          CE(Text, { style: S.legalText },
            "La pr\u00e9sente facture est \u00e9mise par AS International Group LTD (dba Atlas Incorporate), 128 City Road, London EC1V 2NX, United Kingdom. Tout paiement est d\u00e9finitivement acquis au Prestataire d\u00e8s sa r\u00e9ception. En cas de litige, la juridiction comp\u00e9tente est celle du si\u00e8ge du Prestataire.",
          ),
        ),

      ),
      CE(Footer, null),
    ),
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const data: InvoicePdfData = await req.json();

    if (!data.invoiceNumber || !data.clientName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!data.items || data.items.length === 0) {
      data.items = [{ label: "Prestation de services", quantity: 1, unit_price: data.totalAmount ?? 0 }];
    }
    if (!data.currency)    data.currency = "CHF";
    if (!data.totalAmount) data.totalAmount = data.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

    const buffer = await renderToBuffer(CE(InvoiceDocument, { data }));

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="facture-${data.invoiceNumber.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase()}.pdf"`,
      },
    });
  } catch (err: unknown) {
    console.error("[generate-invoice-pdf]", err);
    const message = err instanceof Error ? err.message : "PDF generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
