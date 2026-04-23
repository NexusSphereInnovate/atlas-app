import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

// ─── Design tokens — Corporate / Cabinet style ────────────────────────────────
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

  // ── Letterhead ──────────────────────────────────────────────────────────────
  headerWrap: {
    paddingTop: 26, paddingBottom: 14,
    paddingLeft: 52, paddingRight: 52,
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
    marginBottom: 0,
  },
  headerBrand: { fontSize: 16, fontFamily: "Helvetica-Bold", color: BLACK, letterSpacing: 3 },
  headerSub:   { fontSize: 6.5, color: LIGHT, marginTop: 3, letterSpacing: 0.3 },
  headerRight: { alignItems: "flex-end" },
  headerTag:   { fontSize: 7, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1.5, marginBottom: 2 },
  headerDate:  { fontSize: 7, color: LIGHT },
  headerRuleG: { height: 1.5, backgroundColor: RULE_G, marginHorizontal: 0, marginBottom: 0 },
  headerRuleL: { height: 0.5, backgroundColor: RULE_L, marginHorizontal: 0, marginBottom: 22 },

  // ── Body wrapper ────────────────────────────────────────────────────────────
  body: { paddingLeft: 52, paddingRight: 52 },

  // ── Title block (page 1 only) ────────────────────────────────────────────────
  titleBlock: {
    alignItems: "center", marginBottom: 20,
    paddingTop: 8, paddingBottom: 16,
    borderBottomWidth: 0.5, borderBottomColor: RULE_L,
  },
  titleMain: {
    fontSize: 13, fontFamily: "Helvetica-Bold", color: BLACK,
    letterSpacing: 2, marginBottom: 5, textAlign: "center",
  },
  titleRef:  { fontSize: 7, color: LIGHT, letterSpacing: 0.4, textAlign: "center" },

  // ── "Entre les parties" label ─────────────────────────────────────────────
  partiesLabel: {
    fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GOLD,
    letterSpacing: 1.5, marginBottom: 10,
  },

  // ── Party boxes ──────────────────────────────────────────────────────────────
  partiesRow: { flexDirection: "row", marginBottom: 16 },
  partyBoxL: {
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
  partyItalic:  { fontSize: 7, color: LIGHT, fontStyle: "italic", marginTop: 5 },

  // ── Intro ────────────────────────────────────────────────────────────────────
  intro: {
    borderLeftWidth: 2, borderLeftColor: GOLD,
    paddingLeft: 10, paddingVertical: 6,
    marginBottom: 16, backgroundColor: GOLD_LT,
    borderRadius: 1,
  },
  introText: { fontSize: 8.5, color: DARK, lineHeight: 1.6 },

  // ── Article ──────────────────────────────────────────────────────────────────
  art:        { marginBottom: 13 },
  artHead:    { flexDirection: "row", alignItems: "baseline", marginBottom: 4 },
  artNum:     { fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD, width: 28 },
  artTitle:   { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BLACK, letterSpacing: 0.3, flex: 1 },
  artRule:    { height: 0.5, backgroundColor: RULE_L, marginBottom: 6 },
  artBody:    { fontSize: 8.5, color: GRAY, lineHeight: 1.6, marginBottom: 3, paddingLeft: 28 },

  // ── Bullets ──────────────────────────────────────────────────────────────────
  bullet:     { flexDirection: "row", paddingLeft: 28, marginBottom: 3 },
  bulletDash: { fontSize: 8.5, color: GOLD, width: 12, marginRight: 4, marginTop: 0.5 },
  bulletText: { fontSize: 8.5, color: GRAY, flex: 1, lineHeight: 1.55 },

  // ── Section rule ────────────────────────────────────────────────────────────
  hr: { height: 0.5, backgroundColor: RULE_L, marginVertical: 11 },

  // ── Services table ───────────────────────────────────────────────────────────
  tableWrap:    { marginBottom: 10, paddingLeft: 28, borderWidth: 0.5, borderColor: RULE_L, borderRadius: 2 },
  tableHdr:     { flexDirection: "row", backgroundColor: DARK, paddingHorizontal: 10, paddingVertical: 5 },
  tableHdrCell: { fontSize: 7, fontFamily: "Helvetica-Bold", color: WHITE, letterSpacing: 0.5 },
  tableRow:     { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: RULE_L },
  tableRowAlt:  { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: RULE_L, backgroundColor: CREAM },
  tableCell:    { fontSize: 8.5, color: DARK },
  tableTotalRow:{ flexDirection: "row", paddingHorizontal: 10, paddingVertical: 6, backgroundColor: GOLD, marginTop: 1 },
  tableTotalLbl:{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: WHITE, flex: 1 },
  tableTotalVal:{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: WHITE, width: 90, textAlign: "right" },

  // ── Note box ────────────────────────────────────────────────────────────────
  noteBox:  {
    borderWidth: 0.5, borderColor: RULE_G, borderRadius: 2,
    backgroundColor: GOLD_LT, padding: 9, marginBottom: 6, paddingLeft: 28,
  },
  noteTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GOLD, marginBottom: 3 },
  noteText:  { fontSize: 7.5, color: GRAY, lineHeight: 1.55 },

  // ── Signatures ───────────────────────────────────────────────────────────────
  sigSection:   { marginTop: 16 },
  sigIntro:     { fontSize: 8, color: GRAY, marginBottom: 14, paddingLeft: 0 },
  sigRow:       { flexDirection: "row" },
  sigBoxLeft:   { flex: 1, marginRight: 16 },
  sigBoxRight:  { flex: 1 },
  sigLabel:     { fontSize: 7, fontFamily: "Helvetica-Bold", color: BLACK, letterSpacing: 1, marginBottom: 2 },
  sigSub:       { fontSize: 7, color: LIGHT, marginBottom: 8 },
  sigStamp:     {
    borderWidth: 0.5, borderColor: RULE_G,
    borderLeftWidth: 2, borderLeftColor: GOLD,
    borderRadius: 2, backgroundColor: GOLD_LT,
    padding: 10, marginBottom: 5,
  },
  sigStampName: { fontSize: 12, fontFamily: "Helvetica-BoldOblique", color: BLACK, marginBottom: 3 },
  sigStampLine: { fontSize: 7, color: GRAY, marginBottom: 1.5 },
  sigStampSeal: { marginTop: 5, fontSize: 6.5, color: GOLD, letterSpacing: 0.5 },
  sigBlank:     {
    borderWidth: 0.5, borderColor: RULE_L,
    borderRadius: 2, height: 62,
    backgroundColor: CREAM,
    alignItems: "center", justifyContent: "center", marginBottom: 5,
  },
  sigBlankHint: { fontSize: 7.5, color: "#CCCCCC", fontStyle: "italic" },
  sigNote:      { fontSize: 7, color: LIGHT },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute", bottom: 18, left: 52, right: 52,
    paddingTop: 6, borderTopWidth: 0.5, borderTopColor: RULE_G,
    flexDirection: "row", justifyContent: "space-between",
  },
  footerText: { fontSize: 6.5, color: LIGHT },
  footerPage: { fontSize: 6.5, color: LIGHT },

  // ── Final disclaimer ─────────────────────────────────────────────────────────
  disclaimer: {
    marginTop: 12,
    padding: 10, paddingLeft: 28,
    borderWidth: 0.5, borderColor: RULE_L,
    borderRadius: 2, backgroundColor: CREAM,
  },
  disclaimerTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: DARK, letterSpacing: 0.5, marginBottom: 4 },
  disclaimerText:  { fontSize: 7.5, color: GRAY, lineHeight: 1.55 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Séparateur milliers avec apostrophe suisse (évite le / de fr-CH en Node.js)
function fmtNum(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u2019");
}

function fmtMoney(amount: number, currency: string) {
  return `${fmtNum(amount)} ${currency}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ContractItem {
  label: string;
  quantity: number;
  unit_price: number;
  currency: string;
}

interface ContractData {
  civility: string;
  firstName: string;
  lastName: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  companyName?: string;
  companyAddress?: string;
  contractTitle: string;
  contractDate: string;
  items: ContractItem[];
  totalAmount: number;
  currency: string;
  clientReferralRate: number;
  // Signature électronique client (optionnel — si contrat signé)
  clientSignedAt?: string;
  clientSignedName?: string;
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
        CE(Text, { style: S.headerTag }, "CONTRAT DE PRESTATIONS DE SERVICES"),
        CE(Text, { style: S.headerDate }, date),
      ),
    ),
    CE(View, { style: S.headerRuleG }),
    CE(View, { style: S.headerRuleL }),
  );
}

function Footer() {
  return CE(View, { style: S.footer, fixed: true },
    CE(Text, { style: S.footerText }, "ATLAS INCORPORATE — AS International Group LTD — Confidentiel"),
    CE(Text, { style: S.footerPage, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} / ${totalPages}` }),
  );
}

function HR() { return CE(View, { style: S.hr }); }

function Art({ num, title, children }: { num: string; title: string; children?: React.ReactNode }) {
  return CE(View, { style: S.art },
    CE(View, { style: S.artHead },
      CE(Text, { style: S.artNum }, `${num}.`),
      CE(Text, { style: S.artTitle }, title.toUpperCase()),
    ),
    CE(View, { style: S.artRule }),
    children,
  );
}

function P(text: string, extra?: object) {
  return CE(Text, { style: { ...S.artBody, ...(extra ?? {}) } }, text);
}

function B(text: string) {
  return CE(View, { style: S.bullet },
    CE(Text, { style: S.bulletDash }, "\u2014"),
    CE(Text, { style: S.bulletText }, text),
  );
}

// ─── Document ─────────────────────────────────────────────────────────────────
function ContractDocument({ data }: { data: ContractData }) {
  const {
    civility, firstName, lastName,
    address, postalCode, city, country,
    companyName, companyAddress,
    contractDate, items, totalAmount, currency, clientReferralRate,
    clientSignedAt, clientSignedName,
  } = data;

  const clientName  = `${civility} ${firstName} ${lastName}`.trim();
  const cityLine    = [postalCode, city].filter(Boolean).join(" ");
  const countryLine = [cityLine, country].filter(Boolean).join(", ");

  // Formatage date/heure de la signature client
  const signedDateStr = clientSignedAt
    ? new Date(clientSignedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const signedTimeStr = clientSignedAt
    ? new Date(clientSignedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return CE(Document,
    { title: "Contrat de prestations de services — Atlas Incorporate", author: "Atlas Incorporate" },

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE 1 — Parties + Art. 1 & 2
    // ══════════════════════════════════════════════════════════════════════════
    CE(Page, { size: "A4", style: S.page },
      CE(Header, { date: contractDate }),
      CE(View, { style: S.body },

        // Title block
        CE(View, { style: S.titleBlock },
          CE(Text, { style: S.titleMain }, "CONTRAT DE PRESTATIONS DE SERVICES"),
          CE(Text, { style: S.titleRef },
            `Établi entre AS International Group LTD et ${clientName}  ·  ${contractDate}`),
        ),

        // Parties label
        CE(Text, { style: S.partiesLabel }, "1.  IDENTIFICATION DES PARTIES"),

        // Party boxes
        CE(View, { style: S.partiesRow },

          // Prestataire
          CE(View, { style: S.partyBoxL },
            CE(View, { style: S.partyHeader },
              CE(Text, { style: S.partyLbl }, "LE PRESTATAIRE"),
            ),
            CE(View, { style: S.partyBody },
              CE(Text, { style: S.partyName }, "AS International Group LTD"),
              CE(Text, { style: S.partyLine }, "Immatriculée au Royaume-Uni"),
              CE(Text, { style: S.partyLine }, "128 City Road, London, EC1V 2NX"),
              CE(Text, { style: S.partyLine }, "United Kingdom"),
              CE(Text, { style: S.partyLine }, "Agissant sous la dénomination commerciale :"),
              CE(Text, { style: { ...S.partyLine, fontFamily: "Helvetica-Bold", color: BLACK } },
                "Atlas Incorporate"),
              CE(Text, { style: S.partyItalic }, "Ci-après dénommée « le Prestataire »"),
            ),
          ),

          // Client
          CE(View, { style: S.partyBoxR },
            CE(View, { style: S.partyHeader },
              CE(Text, { style: S.partyLblGray }, "LE CLIENT / BÉNÉFICIAIRE"),
            ),
            CE(View, { style: S.partyBody },
              CE(Text, { style: S.partyName }, clientName),
              address    ? CE(Text, { style: S.partyLine }, address) : null,
              countryLine ? CE(Text, { style: S.partyLine }, countryLine) : null,
              companyName ? CE(Text, { style: S.partyLine }, `Société : ${companyName}`) : null,
              companyAddress ? CE(Text, { style: S.partyLine }, companyAddress) : null,
              CE(Text, { style: S.partyItalic }, "Ci-après dénommé « le Client »"),
            ),
          ),
        ),

        // Intro
        CE(View, { style: S.intro },
          CE(Text, { style: S.introText },
            "Il a été convenu et arrêté ce qui suit. En apposant sa signature — manuscrite ou électronique — le Client reconnaît avoir lu, compris et accepté sans réserve l\u2019intégralité des clauses du présent contrat.",
          ),
        ),

        HR(),

        // Article 2
        CE(Art, { num: "2", title: "Objet et portée des prestations" },
          P("Le présent contrat a pour objet la fourniture de services d\u2019assistance administrative, organisationnelle et stratégique dans le cadre de la mise en place de structures entrepreneuriales et/ou internationales."),
          P("Les prestations peuvent inclure, sans que cette liste soit exhaustive :"),
          B("Constitution de sociétés (notamment de type LTD au Royaume-Uni)"),
          B("Mise en place de structures transfrontalières"),
          B("Assistance aux démarches administratives"),
          B("Coordination avec des prestataires tiers"),
          P("La portée exacte des prestations est définie dans les documents commerciaux annexes.", { marginTop: 4 }),
        ),

      ),
      CE(Footer, null),
    ),

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE 2 — Art. 3 → 7
    // ══════════════════════════════════════════════════════════════════════════
    CE(Page, { size: "A4", style: S.page },
      CE(Header, { date: contractDate }),
      CE(View, { style: S.body },

        CE(Art, { num: "3", title: "Nature de l\u2019engagement" },
          P("Le Prestataire est tenu à une obligation de moyens. Il est expressément convenu qu\u2019aucune garantie de résultat n\u2019est fournie, notamment en ce qui concerne :"),
          B("L\u2019acceptation d\u2019un dossier par une administration"),
          B("L\u2019ouverture d\u2019un compte bancaire"),
          B("L\u2019obtention d\u2019un IBAN ou d\u2019un service financier"),
          B("La validation fiscale ou réglementaire d\u2019une structure"),
        ),

        HR(),

        CE(Art, { num: "4", title: "Recours à des tiers" },
          P("Le Client reconnaît que l\u2019exécution des prestations peut impliquer l\u2019intervention de tiers indépendants. Le Prestataire agit uniquement en qualité d\u2019intermédiaire et ne saurait être tenu responsable :"),
          B("Des décisions prises par ces tiers"),
          B("De leurs délais, refus ou conditions"),
          B("Des conséquences de leurs prestations"),
        ),

        HR(),

        CE(Art, { num: "5", title: "Absence de conseil réglementé" },
          P("Le Prestataire n\u2019exerce pas une activité réglementée d\u2019avocat, de conseiller fiscal ou d\u2019expert-comptable. Les informations fournies sont de nature générale, informative et non personnalisée."),
          P("Le Client demeure seul responsable de :"),
          B("Solliciter ses propres conseils professionnels"),
          B("Valider la conformité de sa situation juridique et fiscale"),
        ),

        HR(),

        CE(Art, { num: "6", title: "Obligations du Client" },
          P("Le Client s\u2019engage à :"),
          B("Fournir des informations exactes, complètes et à jour"),
          B("Coopérer activement à l\u2019exécution des prestations"),
          B("Respecter l\u2019ensemble des obligations légales applicables"),
          P("Toute inexactitude ou omission engage la seule responsabilité du Client.", { marginTop: 4 }),
        ),

        HR(),

        CE(Art, { num: "7", title: "Responsabilité" },
          P("Le Prestataire ne pourra être tenu responsable :"),
          B("Des décisions prises par le Client"),
          B("De la gestion ou de l\u2019exploitation de la structure créée"),
          B("Des conséquences fiscales, sociales ou juridiques"),
          B("De toute perte indirecte ou manque à gagner"),
        ),

      ),
      CE(Footer, null),
    ),

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE 3 — Art. 8 → 12 + Services table
    // ══════════════════════════════════════════════════════════════════════════
    CE(Page, { size: "A4", style: S.page },
      CE(Header, { date: contractDate }),
      CE(View, { style: S.body },

        CE(Art, { num: "8", title: "Services financiers et bancaires" },
          P("Le Prestataire n\u2019est pas un établissement financier. Il n\u2019apporte aucune garantie quant à :"),
          B("L\u2019ouverture d\u2019un compte bancaire"),
          B("L\u2019accès à des services financiers"),
          B("L\u2019obtention d\u2019un IBAN"),
          P("Toute décision relève exclusivement des établissements concernés.", { marginTop: 4 }),
        ),

        HR(),

        CE(Art, { num: "9", title: "Délais" },
          P("Les délais communiqués sont indicatifs. Ils dépendent notamment des administrations, des juridictions concernées et des prestataires tiers. Aucun retard ne saurait engager la responsabilité du Prestataire."),
        ),

        HR(),

        CE(Art, { num: "10", title: "Conditions financières" },
          P("Les prestations faisant l\u2019objet du présent contrat sont détaillées ci-après :"),

          // Services table
          CE(View, { style: S.tableWrap },
            CE(View, { style: S.tableHdr },
              CE(Text, { style: { ...S.tableHdrCell, flex: 1 } }, "PRESTATION"),
              CE(Text, { style: { ...S.tableHdrCell, width: 36, textAlign: "center" } }, "QTÉ"),
              CE(Text, { style: { ...S.tableHdrCell, width: 82, textAlign: "right" } }, "PRIX UNIT."),
              CE(Text, { style: { ...S.tableHdrCell, width: 82, textAlign: "right" } }, "TOTAL"),
            ),
            ...items.map((item, i) =>
              CE(View, { key: i, style: i % 2 === 0 ? S.tableRow : S.tableRowAlt },
                CE(Text, { style: { ...S.tableCell, flex: 1 } }, item.label),
                CE(Text, { style: { ...S.tableCell, width: 36, textAlign: "center" } }, String(item.quantity)),
                CE(Text, { style: { ...S.tableCell, width: 82, textAlign: "right" } },
                  `${fmtNum(item.unit_price)} ${item.currency}`),
                CE(Text, { style: { ...S.tableCell, width: 82, textAlign: "right" } },
                  `${fmtNum(item.unit_price * item.quantity)} ${item.currency}`),
              )
            ),
            CE(View, { style: S.tableTotalRow },
              CE(Text, { style: S.tableTotalLbl }, "TOTAL DÛ TTC"),
              CE(Text, { style: S.tableTotalVal }, fmtMoney(totalAmount, currency)),
            ),
          ),

          CE(View, { style: S.noteBox },
            CE(Text, { style: S.noteTitle }, "Modalités de paiement"),
            CE(Text, { style: S.noteText },
              "Sauf stipulation contraire, les paiements sont exigibles immédiatement à la signature du présent contrat. Les sommes versées sont définitivement acquises au Prestataire."),
          ),
        ),

        HR(),

        CE(Art, { num: "11", title: "Retard et défaut de paiement" },
          P("En cas de retard de paiement :"),
          B("Des pénalités pourront être appliquées"),
          B("Les prestations pourront être suspendues sans préavis"),
          P("Le Prestataire se réserve le droit de refuser toute prestation ultérieure.", { marginTop: 4 }),
        ),

        HR(),

        CE(Art, { num: "12", title: "Renonciation au droit de rétractation" },
          P("Le Client reconnaît que l\u2019exécution des prestations débute immédiatement après validation. Il renonce expressément à tout droit de rétractation, conformément aux dispositions applicables."),
        ),

      ),
      CE(Footer, null),
    ),

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE 4 — Art. 13 → 19 + Signatures
    // ══════════════════════════════════════════════════════════════════════════
    CE(Page, { size: "A4", style: S.page },
      CE(Header, { date: contractDate }),
      CE(View, { style: S.body },

        CE(Art, { num: "13", title: "Résiliation" },
          P("En cas de résiliation anticipée par le Client :"),
          B("Aucune somme ne sera remboursée"),
          B("L\u2019intégralité des montants reste due"),
          P("Le Prestataire pourra résilier le contrat en cas de :"),
          B("Non-coopération ou comportement abusif du Client"),
          B("Suspicion d\u2019activité illicite"),
        ),

        HR(),

        CE(Art, { num: "14", title: "Confidentialité" },
          P("Les informations, méthodes et documents fournis sont strictement confidentiels. Le Client s\u2019interdit toute reproduction, diffusion ou exploitation sans autorisation écrite préalable du Prestataire."),
        ),

        HR(),

        CE(Art, { num: "15", title: "Non-contournement" },
          P("Le Client s\u2019engage à ne pas entrer en relation directe avec les partenaires du Prestataire ni à reproduire ou exploiter les structures mises en place. Toute violation pourra donner lieu à réparation."),
        ),

        HR(),

        CE(Art, { num: "16", title: "Force majeure" },
          P("Le Prestataire ne pourra être tenu responsable en cas d\u2019événement échappant à son contrôle, notamment : décisions administratives, refus bancaires, évolutions réglementaires ou tout cas de force majeure."),
        ),

        HR(),

        CE(Art, { num: "17", title: "Acceptation et reconnaissance" },
          P("Le Client reconnaît : avoir pris connaissance de l\u2019ensemble des termes, avoir obtenu les informations nécessaires et comprendre les limites des prestations proposées."),
        ),

        HR(),

        CE(Art, { num: "18", title: "Droit applicable et juridiction" },
          P("Le contrat est régi par le droit applicable au siège du Prestataire. Tout litige relève de la juridiction compétente de ce siège."),
          clientReferralRate > 0
            ? P(`Programme de recommandation : une commission de ${clientReferralRate} % sera versée au Client pour tout nouveau contrat signé grâce à sa recommandation, après encaissement intégral par le Prestataire.`, { marginTop: 4 })
            : null,
        ),

        HR(),

        CE(Art, { num: "19", title: "Dispositions finales" },
          P("Le présent contrat constitue l\u2019intégralité de l\u2019accord entre les parties et annule tout accord antérieur portant sur le même objet. Toute modification devra être formalisée par écrit et signée des deux parties."),
        ),

        HR(),

        // ── Signatures ────────────────────────────────────────────────────────
        CE(View, { style: S.sigSection },
          CE(Text, { style: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1.5, marginBottom: 6 } },
            "SIGNATURES"),
          CE(Text, { style: S.sigIntro },
            `Fait en deux exemplaires originaux, le ${contractDate}.`),

          CE(View, { style: S.sigRow },
            // Prestataire
            CE(View, { style: S.sigBoxLeft },
              CE(Text, { style: S.sigLabel }, "LE PRESTATAIRE"),
              CE(Text, { style: S.sigSub }, "AS International Group LTD — Atlas Incorporate"),
              CE(View, { style: S.sigStamp },
                CE(Text, { style: S.sigStampName }, "Atlas Incorporate"),
                CE(Text, { style: S.sigStampLine }, "Pour AS International Group LTD"),
                CE(Text, { style: S.sigStampLine }, `Signé le ${contractDate}`),
                CE(Text, { style: S.sigStampLine }, "128 City Road, London EC1V 2NX"),
                CE(Text, { style: S.sigStampSeal }, "\u2713  SIGNATURE \u00c9LECTRONIQUE CERTIFI\u00c9E"),
              ),
              CE(Text, { style: S.sigNote }, "Représentant légal dûment autorisé"),
            ),

            // Client
            CE(View, { style: S.sigBoxRight },
              CE(Text, { style: S.sigLabel }, "LE CLIENT"),
              CE(Text, { style: S.sigSub }, clientSignedName ?? clientName),
              // Tampon si signé, zone vide sinon
              signedDateStr && signedTimeStr
                ? CE(View, { style: S.sigStamp },
                    CE(Text, { style: S.sigStampName }, clientSignedName ?? clientName),
                    CE(Text, { style: S.sigStampLine }, `Signé le ${signedDateStr} à ${signedTimeStr}`),
                    CE(Text, { style: S.sigStampLine }, "Signature électronique — saisie du nom complet confirmée"),
                    CE(Text, { style: S.sigStampSeal }, "\u2713  SIGNATURE \u00c9LECTRONIQUE CERTIFI\u00c9E"),
                  )
                : CE(View, { style: S.sigBlank },
                    CE(Text, { style: S.sigBlankHint }, "Espace réservé à la signature"),
                  ),
              CE(Text, { style: S.sigNote },
                signedDateStr
                  ? `Signé électroniquement le ${signedDateStr} à ${signedTimeStr}`
                  : 'Précédée de la mention « Lu et approuvé »'
              ),
            ),
          ),
        ),

        // Final disclaimer
        CE(View, { style: S.disclaimer },
          CE(Text, { style: S.disclaimerTitle }, "RECONNAISSANCE ET ACCEPTATION INTÉGRALE"),
          CE(Text, { style: S.disclaimerText },
            "En apposant sa signature, le Client déclare avoir lu, compris et accepté sans réserve l\u2019intégralité des clauses du présent contrat. Toute mauvaise gestion de la structure créée, tout manquement aux obligations légales, fiscales, sociales ou administratives ainsi que toutes les conséquences en découlant relèvent exclusivement de la responsabilité personnelle du Client.",
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
    const data: ContractData = await req.json();

    if (!data.firstName || !data.lastName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!data.contractDate) {
      data.contractDate = new Date().toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric",
      });
    }
    if (!data.items || data.items.length === 0) {
      data.items = [{
        label: "Prestation de services", quantity: 1,
        unit_price: data.totalAmount ?? 0, currency: data.currency ?? "CHF",
      }];
    }
    if (!data.currency)    data.currency = "CHF";
    if (!data.totalAmount) data.totalAmount = data.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    if (data.clientReferralRate == null) data.clientReferralRate = 5;

    const buffer = await renderToBuffer(CE(ContractDocument, { data }));

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="contrat-atlas-${data.lastName.toLowerCase()}.pdf"`,
      },
    });
  } catch (err: unknown) {
    console.error("[generate-pdf]", err);
    const message = err instanceof Error ? err.message : "PDF generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
