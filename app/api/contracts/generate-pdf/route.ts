import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

// ─── Design tokens ────────────────────────────────────────────────────────────
const BLACK = "#0d0d0d";
const DARK  = "#1f1f1f";
const MED   = "#555555";
const LIGHT = "#888888";
const RULE  = "#cccccc";
const TINT  = "#f4f4f4";
const BLUE  = "#1a3c6e";
const LBLUE = "#e8edf5";

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9.5, color: DARK, paddingTop: 0, paddingBottom: 56, paddingLeft: 0, paddingRight: 0, lineHeight: 1.55 },

  // Banner
  topBanner: { backgroundColor: BLUE, paddingTop: 22, paddingBottom: 18, paddingLeft: 52, paddingRight: 52, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 },
  bannerBrand: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#ffffff", letterSpacing: 2 },
  bannerSub: { fontSize: 7, color: "rgba(255,255,255,0.6)", marginTop: 3, letterSpacing: 0.4 },
  bannerRight: { alignItems: "flex-end" },
  bannerLabel: { fontSize: 7.5, color: "rgba(255,255,255,0.55)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 },
  bannerTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#ffffff", textAlign: "right" },

  // Body wrapper
  body: { paddingLeft: 52, paddingRight: 52 },

  // Section heading
  sectionHeading: { fontSize: 8, fontFamily: "Helvetica-Bold", color: BLUE, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 },

  // Party boxes
  partiesRow: { flexDirection: "row", marginBottom: 18 },
  partyBoxProvider: { flex: 1, marginRight: 8, borderWidth: 1, borderColor: BLUE, borderRadius: 4, overflow: "hidden" },
  partyBoxClient:   { flex: 1, marginLeft: 8,  borderWidth: 1, borderColor: RULE, borderRadius: 4, overflow: "hidden" },
  partyHeader:      { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: BLUE },
  partyHeaderLight: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: TINT },
  partyHeaderLabel:      { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#ffffff", letterSpacing: 1, textTransform: "uppercase" },
  partyHeaderLabelDark:  { fontSize: 7, fontFamily: "Helvetica-Bold", color: MED,       letterSpacing: 1, textTransform: "uppercase" },
  partyBody: { padding: 12 },
  partyName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 3 },
  partyLine: { fontSize: 8.5, color: MED, marginBottom: 1.5 },
  partyNote: { fontSize: 7.5, color: LIGHT, fontStyle: "italic", marginTop: 6 },
  betweenCol:  { width: 20, alignItems: "center", justifyContent: "center" },
  betweenText: { fontSize: 8, color: LIGHT, fontStyle: "italic" },

  // Intro box
  introBox:  { backgroundColor: LBLUE, borderLeftWidth: 3, borderLeftColor: BLUE, padding: 10, marginBottom: 20, borderRadius: 2 },
  introText: { fontSize: 9, color: DARK, lineHeight: 1.6 },

  // Article
  articleWrap:    { marginBottom: 16 },
  articleTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  articleTitleBar: { width: 3, height: 11, backgroundColor: BLUE, borderRadius: 2, marginRight: 7 },
  articleTitle:   { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: BLACK, textTransform: "uppercase", letterSpacing: 0.4 },
  articleBody:    { fontSize: 9, color: MED, lineHeight: 1.6, marginBottom: 3, paddingLeft: 10 },
  bulletItem:     { fontSize: 9, color: MED, lineHeight: 1.6, paddingLeft: 18, marginBottom: 1.5 },

  // Services table (Article 2)
  serviceTable:      { marginBottom: 10, paddingLeft: 10, borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 3 },
  serviceHeaderRow:  { flexDirection: "row", backgroundColor: LBLUE, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 3 },
  serviceHeaderCell: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: BLUE, textTransform: "uppercase", letterSpacing: 0.5 },
  serviceRow:        { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: "#e8e8e8" },
  serviceCell:       { fontSize: 9, color: DARK },
  serviceTotalRow:   { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 6, backgroundColor: BLUE, borderRadius: 2, marginTop: 2 },
  serviceTotalLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#ffffff" },
  serviceTotalVal:   { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#ffffff", textAlign: "right" },
  serviceSubRow:     { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#f0f4f9", borderTopWidth: 0.5, borderTopColor: "#dce3ef" },
  serviceSubLabel:   { fontSize: 8, color: BLUE },

  // Fixed clauses box
  fixedClausesBox:  { marginTop: 8, marginBottom: 4, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: "#b0c0d8" },
  fixedClauseLine:  { fontSize: 8.5, color: MED, lineHeight: 1.6, marginBottom: 3 },
  fixedClauseBullet:{ fontSize: 8.5, color: MED, lineHeight: 1.6, paddingLeft: 10, marginBottom: 2 },

  // Separator
  separator: { borderBottomWidth: 0.5, borderBottomColor: "#e8e8e8", marginVertical: 14 },

  // Warning box (for important clauses)
  warningBox:   { backgroundColor: "#fff8f0", borderWidth: 0.5, borderColor: "#e0a060", borderRadius: 3, padding: 10, marginBottom: 4 },
  warningText:  { fontSize: 8.5, color: "#6b3a0a", lineHeight: 1.6 },
  warningTitle: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: "#6b3a0a", marginBottom: 3 },

  // Signature
  sigSection:   { marginTop: 22 },
  sigIntro:     { fontSize: 9, color: MED, marginBottom: 18 },
  sigRow:       { flexDirection: "row" },
  sigBoxLeft:   { flex: 1, marginRight: 20 },
  sigBox:       { flex: 1 },
  sigLabel:     { fontSize: 8, fontFamily: "Helvetica-Bold", color: DARK, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  sigSub:       { fontSize: 8, color: MED, marginBottom: 10 },
  sigStamp:     { borderWidth: 1, borderColor: BLUE, borderRadius: 4, backgroundColor: LBLUE, padding: 10, marginBottom: 6 },
  sigStampName: { fontSize: 13, fontFamily: "Helvetica-BoldOblique", color: BLUE, marginBottom: 3 },
  sigStampLine: { fontSize: 7.5, color: BLUE, marginBottom: 1.5 },
  sigStampSeal: { marginTop: 5, fontSize: 7, color: "rgba(26,60,110,0.55)", letterSpacing: 0.5 },
  sigBlankZone: { borderWidth: 1, borderColor: RULE, borderRadius: 4, height: 64, backgroundColor: TINT, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  sigBlankHint: { fontSize: 8, color: "#bbb", fontStyle: "italic" },
  sigNote:      { fontSize: 7.5, color: LIGHT },

  // Disclaimer
  disclaimerWrap:  { marginTop: 18, padding: 11, borderWidth: 0.5, borderColor: RULE, borderRadius: 4, backgroundColor: TINT },
  disclaimerTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: DARK, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 5 },
  disclaimerText:  { fontSize: 7.5, color: MED, lineHeight: 1.6 },

  // Footer
  footer: { position: "absolute", bottom: 20, left: 52, right: 52, paddingTop: 7, borderTopWidth: 0.5, borderTopColor: "#ddd", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerText: { fontSize: 7, color: "#aaa" },
});

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
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function fmtMoney(amount: number, currency: string) {
  return `${amount.toLocaleString("fr-CH")} ${currency} TTC`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Header({ title }: { title: string }) {
  return React.createElement(View, { style: S.topBanner },
    React.createElement(View, null,
      React.createElement(Text, { style: S.bannerBrand }, "ATLAS INCORPORATE"),
      React.createElement(Text, { style: S.bannerSub }, "AS International Group LTD  •  128 City Road, London EC1V 2NX"),
    ),
    React.createElement(View, { style: S.bannerRight },
      React.createElement(Text, { style: S.bannerLabel }, "Contrat de prestation"),
      React.createElement(Text, { style: S.bannerTitle }, title),
    ),
  );
}

function Footer() {
  return React.createElement(View, { style: S.footer, fixed: true },
    React.createElement(Text, { style: S.footerText }, "ATLAS INCORPORATE — AS International Group LTD"),
    React.createElement(Text, { style: S.footerText }, "128 City Road, London, United Kingdom, EC1V 2NX"),
  );
}

function Sep() {
  return React.createElement(View, { style: S.separator });
}

function Art({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return React.createElement(View, { style: S.articleWrap },
    React.createElement(View, { style: S.articleTitleRow },
      React.createElement(View, { style: S.articleTitleBar }),
      React.createElement(Text, { style: S.articleTitle }, `${num} — ${title}`),
    ),
    children,
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return React.createElement(View, { style: S.body }, children);
}

// ─── Main Document ────────────────────────────────────────────────────────────
function ContractDocument({ data }: { data: ContractData }) {
  const {
    civility, firstName, lastName,
    address, postalCode, city, country,
    companyName, companyAddress,
    contractTitle, contractDate,
    items, totalAmount, currency,
    clientReferralRate,
  } = data;

  const clientFullName = `${civility} ${firstName} ${lastName}`;
  const cityPostal     = [postalCode, city].filter(Boolean).join(" ");
  const addressLine2   = [cityPostal, country].filter(Boolean).join(", ");

  return React.createElement(Document,
    { title: contractTitle, author: "Atlas Incorporate", subject: "Contrat de prestation de services" },

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE 1 — Parties + Article 1
    // ══════════════════════════════════════════════════════════════════════════
    React.createElement(Page, { size: "A4", style: S.page },
      React.createElement(Header, { title: contractTitle }),
      React.createElement(Body, null,

        React.createElement(Text, { style: S.sectionHeading }, "Entre les soussignés"),

        // Party boxes
        React.createElement(View, { style: S.partiesRow },
          React.createElement(View, { style: S.partyBoxProvider },
            React.createElement(View, { style: S.partyHeader },
              React.createElement(Text, { style: S.partyHeaderLabel }, "Le Prestataire"),
            ),
            React.createElement(View, { style: S.partyBody },
              React.createElement(Text, { style: S.partyName }, "Atlas Incorporate"),
              React.createElement(Text, { style: S.partyLine }, "Détenue par AS International Group LTD"),
              React.createElement(Text, { style: S.partyLine }, "128 City Road, London, United Kingdom"),
              React.createElement(Text, { style: S.partyLine }, "EC1V 2NX"),
              React.createElement(Text, { style: S.partyNote }, "Ci-après désigné « le Prestataire »"),
            ),
          ),
          React.createElement(View, { style: S.betweenCol },
            React.createElement(Text, { style: S.betweenText }, "et"),
          ),
          React.createElement(View, { style: S.partyBoxClient },
            React.createElement(View, { style: S.partyHeaderLight },
              React.createElement(Text, { style: S.partyHeaderLabelDark }, "Le Client / Bénéficiaire"),
            ),
            React.createElement(View, { style: S.partyBody },
              React.createElement(Text, { style: S.partyName }, clientFullName),
              address ? React.createElement(Text, { style: S.partyLine }, `Domicilié(e) à ${address}`) : null,
              addressLine2 ? React.createElement(Text, { style: S.partyLine }, addressLine2) : null,
              companyName ? React.createElement(Text, { style: S.partyLine }, `Société : ${companyName}`) : null,
              companyAddress ? React.createElement(Text, { style: S.partyLine }, companyAddress) : null,
              React.createElement(Text, { style: S.partyNote }, "Ci-après désigné « le Client »"),
            ),
          ),
        ),

        // Intro
        React.createElement(View, { style: S.introBox },
          React.createElement(Text, { style: S.introText },
            "Il a été convenu et arrêté ce qui suit entre les parties, qui reconnaissent avoir pleine capacité juridique pour contracter. Le présent contrat constitue un accord légalement contraignant et irrévocable entre le Prestataire et le Client. Toute signature — physique ou électronique — vaut acceptation pleine et entière de l\u2019ensemble des clauses ci-après.",
          ),
        ),

        React.createElement(Sep, null),

        // Article 1
        React.createElement(Art, { num: "Article 1", title: "Objet du contrat" },
          React.createElement(Text, { style: S.articleBody },
            "Le Prestataire s\u2019engage à fournir au Client les prestations de création et de mise en place d\u2019une structure internationale, telles que détaillées à l\u2019Article 2 du présent contrat, dans le cadre de son offre de services. Ces prestations comprennent, selon la formule souscrite, tout ou partie des éléments suivants :"
          ),
          React.createElement(Text, { style: S.bulletItem }, "• La création d\u2019une société LTD (Limited Company) au Royaume-Uni, enregistrée auprès de Companies House."),
          React.createElement(Text, { style: S.bulletItem }, "• La création d\u2019une succursale en Suisse et/ou en France selon la formule choisie."),
          React.createElement(Text, { style: S.bulletItem }, "• La fourniture d\u2019une domiciliation d\u2019entreprise au Royaume-Uni (incluse la première année)."),
          React.createElement(Text, { style: S.bulletItem }, "• La création d\u2019un site internet professionnel."),
          React.createElement(Text, { style: S.bulletItem }, "• La mise en place d\u2019un service de facturation et d\u2019outils de gestion."),
          React.createElement(Text, { style: { ...S.articleBody, marginTop: 4 } },
            "Le Prestataire s\u2019engage à accomplir ces prestations avec diligence et professionnalisme, dans les délais convenus d\u2019un commun accord entre les parties. Les délais sont donnés à titre indicatif et ne constituent pas une obligation de résultat si des facteurs extérieurs (administrations, tiers) en empêchent le respect.",
          ),
        ),
      ),
      React.createElement(Footer, null),
    ),

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE 2 — Article 2 (Rémunération dynamique)
    // ══════════════════════════════════════════════════════════════════════════
    React.createElement(Page, { size: "A4", style: S.page },
      React.createElement(Header, { title: contractTitle }),
      React.createElement(Body, null,

        React.createElement(Art, { num: "Article 2", title: "Rémunération et paiement" },

          React.createElement(Text, { style: { ...S.articleBody, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 6 } },
            "Prestations contractualisées :"
          ),

          // Services table
          React.createElement(View, { style: S.serviceTable },
            // Header row
            React.createElement(View, { style: S.serviceHeaderRow },
              React.createElement(Text, { style: { ...S.serviceHeaderCell, flex: 1 } }, "Prestation"),
              React.createElement(Text, { style: { ...S.serviceHeaderCell, width: 40, textAlign: "center" } }, "Qté"),
              React.createElement(Text, { style: { ...S.serviceHeaderCell, width: 80, textAlign: "right" } }, "Prix unit."),
              React.createElement(Text, { style: { ...S.serviceHeaderCell, width: 80, textAlign: "right" } }, "Total"),
            ),
            // Service rows
            ...items.map((item, i) =>
              React.createElement(View, { key: i, style: S.serviceRow },
                React.createElement(Text, { style: { ...S.serviceCell, flex: 1 } }, item.label),
                React.createElement(Text, { style: { ...S.serviceCell, width: 40, textAlign: "center" } }, String(item.quantity)),
                React.createElement(Text, { style: { ...S.serviceCell, width: 80, textAlign: "right" } },
                  `${item.unit_price.toLocaleString("fr-CH")} ${item.currency}`),
                React.createElement(Text, { style: { ...S.serviceCell, width: 80, textAlign: "right" } },
                  `${(item.unit_price * item.quantity).toLocaleString("fr-CH")} ${item.currency}`),
              )
            ),
            // Total row
            React.createElement(View, { style: S.serviceTotalRow },
              React.createElement(Text, { style: { ...S.serviceTotalLabel, flex: 1 } }, "TOTAL DÛ TTC"),
              React.createElement(Text, { style: { ...S.serviceTotalVal, width: 80, textAlign: "right" } },
                fmtMoney(totalAmount, currency)),
            ),
          ),

          // Fixed clauses
          React.createElement(Text, { style: { ...S.articleBody, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 4, marginTop: 8 } },
            "Conditions complémentaires :"
          ),
          React.createElement(View, { style: S.fixedClausesBox },
            React.createElement(Text, { style: S.fixedClauseBullet },
              `\u2022 Le montant total dû au titre des prestations ci-dessus est de ${fmtMoney(totalAmount, currency)}, payable selon les modalités convenues entre les parties.`
            ),
            React.createElement(Text, { style: S.fixedClauseBullet },
              "\u2022 Les frais d\u2019ouverture de la succursale en Suisse (environ 600 CHF TTC) sont à la charge exclusive du Client et ne sont pas inclus dans le montant ci-dessus."
            ),
            React.createElement(Text, { style: S.fixedClauseBullet },
              "\u2022 Le renouvellement de la domiciliation au Royaume-Uni est fixé à 1\u2019500 CHF TTC/an à partir de la 2\u00e8me ann\u00e9e. Ce montant est susceptible d\u2019\u00e9voluer sur notification pr\u00e9alable du Prestataire."
            ),
            React.createElement(Text, { style: S.fixedClauseBullet },
              "\u2022 La comptabilit\u00e9 et la v\u00e9rification comptable sont propos\u00e9es en option au tarif de 1\u2019200 CHF TTC/an, sur demande expresse et \u00e9crite du Client."
            ),
          ),

          // Warning box payment
          React.createElement(View, { style: S.warningBox },
            React.createElement(Text, { style: S.warningTitle }, "⚠ Modalités de paiement — Important"),
            React.createElement(Text, { style: S.warningText },
              "Le paiement est dû intégralement et préalablement au démarrage des prestations, sauf accord écrit contraire. Tout paiement partiel ne libère le Client que proportionnellement aux sommes effectivement versées. Le Prestataire se réserve le droit de suspendre ou d\u2019annuler toute prestation en cas de non-paiement, sans préjudice des sommes déjà acquises."
            ),
          ),
        ),

        React.createElement(Sep, null),

        // Article 3
        React.createElement(Art, { num: "Article 3", title: "Responsabilités et limites" },
          React.createElement(Text, { style: S.articleBody },
            "Atlas Incorporate intervient exclusivement en qualité de prestataire de création et d\u2019accompagnement administratif. Le Prestataire ne saurait être tenu responsable, directement ou indirectement, des éléments suivants :"
          ),
          React.createElement(Text, { style: S.bulletItem }, "• La gestion opérationnelle, financière, fiscale ou sociale de la société du Client."),
          React.createElement(Text, { style: S.bulletItem }, "• Tout manquement du Client à ses obligations légales, fiscales, sociales ou administratives dans l\u2019un quelconque des pays concernés."),
          React.createElement(Text, { style: S.bulletItem }, "• Les conséquences de litiges, contrôles, redressements fiscaux, sanctions ou fermetures administratives liés à l\u2019activité ou à la gestion du Client."),
          React.createElement(Text, { style: S.bulletItem }, "• Les délais imposés par les administrations, registres ou tiers (Companies House, cantons suisses, etc.) indépendants de la volonté du Prestataire."),
          React.createElement(Text, { style: S.bulletItem }, "• Tout préjudice indirect, perte de chiffre d\u2019affaires, perte de données ou dommage immatériel subi par le Client."),
          React.createElement(Text, { style: { ...S.articleBody, marginTop: 4 } },
            "En tout état de cause, la responsabilité totale du Prestataire ne pourra excéder le montant des sommes effectivement versées par le Client au titre du présent contrat. Le Client demeure seul et entièrement responsable de la conformité de son activité avec les lois en vigueur."
          ),
          React.createElement(View, { style: S.warningBox },
            React.createElement(Text, { style: S.warningTitle }, "Force majeure"),
            React.createElement(Text, { style: S.warningText },
              "Aucune partie ne pourra être tenue responsable de l\u2019inexécution totale ou partielle de ses obligations en cas de force majeure, incluant sans limitation : catastrophes naturelles, guerres, pandémies, décisions gouvernementales, défaillances systèmes tiers, ou tout événement imprévisible et irrésistible hors du contrôle raisonnable des parties.",
            ),
          ),
        ),
      ),
      React.createElement(Footer, null),
    ),

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE 3 — Articles 4-7
    // ══════════════════════════════════════════════════════════════════════════
    React.createElement(Page, { size: "A4", style: S.page },
      React.createElement(Header, { title: contractTitle }),
      React.createElement(Body, null,

        React.createElement(Art, { num: "Article 4", title: "Confidentialité et propriété intellectuelle" },
          React.createElement(Text, { style: S.articleBody },
            "Toutes les informations, documents, méthodes, stratégies, outils, modèles et données communiqués par Atlas Incorporate au Client dans le cadre des présentes sont strictement confidentiels et constituent la propriété intellectuelle exclusive et incessible du Prestataire."
          ),
          React.createElement(Text, { style: S.bulletItem }, "• Le Client s\u2019interdit formellement de divulguer, reproduire, transmettre, vendre, louer ou exploiter ces informations à des tiers, sous quelque forme que ce soit."),
          React.createElement(Text, { style: S.bulletItem }, "• Cette obligation de confidentialité est perpétuelle et survivra à la résiliation ou à l\u2019expiration du présent contrat."),
          React.createElement(Text, { style: S.bulletItem }, "• Toute violation avérée de cette clause exposera le Client à des dommages-intérêts fixés au minimum à 50\u2019000 CHF, sans préjudice de toutes autres poursuites civiles et/ou pénales."),
        ),

        React.createElement(Sep, null),

        React.createElement(Art, { num: "Article 5", title: "Retard ou défaut de paiement" },
          React.createElement(Text, { style: S.bulletItem }, "• En cas de retard de paiement supérieur à 7 jours calendaires, une pénalité forfaitaire de 50 CHF par jour de retard est automatiquement exigible, sans mise en demeure préalable."),
          React.createElement(Text, { style: S.bulletItem }, "• En cas de non-paiement d\u2019une échéance, le Prestataire se réserve le droit de suspendre immédiatement toutes les prestations en cours, sans engagement de délai de reprise."),
          React.createElement(Text, { style: S.bulletItem }, "• Les sommes déjà versées resteront définitivement acquises au Prestataire à titre d\u2019acompte non remboursable."),
          React.createElement(Text, { style: S.bulletItem }, "• En cas de procédure de recouvrement, tous les frais d\u2019avocats, d\u2019huissiers et de procédure seront mis à la charge exclusive du Client."),
        ),

        React.createElement(Sep, null),

        React.createElement(Art, { num: "Article 6", title: "Programme de recommandation client" },
          React.createElement(Text, { style: S.articleBody },
            `Le Client peut recommander Atlas Incorporate à des tiers. En contrepartie, une commission de ${clientReferralRate} % du montant hors taxes de chaque nouveau contrat signé grâce à cette recommandation sera versée au Client référant, sous les conditions suivantes :`
          ),
          React.createElement(Text, { style: S.bulletItem }, "• Le versement de la commission n\u2019interviendra qu\u2019après encaissement effectif et intégral du montant par Atlas Incorporate auprès du nouveau client."),
          React.createElement(Text, { style: S.bulletItem }, "• La recommandation doit être formalisée par écrit et validée par Atlas Incorporate avant la signature du contrat avec le nouveau client."),
          React.createElement(Text, { style: S.bulletItem }, `• La commission de ${clientReferralRate} % est calculée sur le montant total TTC facturé au nouveau client, déduction faite de tout avoir ou remise accordée.`),
          React.createElement(Text, { style: S.bulletItem }, "• Atlas Incorporate se réserve le droit de modifier ou supprimer ce programme par notification préalable de 30 jours."),
        ),

        React.createElement(Sep, null),

        React.createElement(Art, { num: "Article 7", title: "Durée et résiliation" },
          React.createElement(Text, { style: S.articleBody },
            "Le présent contrat prend effet à la date de signature et demeure valide jusqu\u2019à la réalisation complète des prestations et le règlement intégral de l\u2019ensemble des sommes dues."
          ),
          React.createElement(Text, { style: S.bulletItem }, "• En cas de résiliation anticipée à l\u2019initiative du Client, toutes les sommes déjà versées resteront définitivement acquises au Prestataire à titre de dédommagement forfaitaire, et la totalité du solde restant dû deviendra immédiatement exigible."),
          React.createElement(Text, { style: S.bulletItem }, "• Le Prestataire se réserve le droit de résilier le présent contrat en cas de manquement grave du Client à ses obligations, avec un préavis de 48 heures par notification écrite. Dans ce cas, les sommes versées resteront acquises au Prestataire."),
          React.createElement(Text, { style: S.bulletItem }, "• Toute structure ou société créée dans le cadre du présent contrat et déjà enregistrée auprès des autorités compétentes demeure la propriété du Client. Les frais de dissolution, le cas échéant, seront à la charge exclusive du Client."},
        ),
      ),
      React.createElement(Footer, null),
    ),

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE 4 — Articles 8-9 + Signatures + Clause finale
    // ══════════════════════════════════════════════════════════════════════════
    React.createElement(Page, { size: "A4", style: S.page },
      React.createElement(Header, { title: contractTitle }),
      React.createElement(Body, null,

        React.createElement(Art, { num: "Article 8", title: "Droit applicable et juridiction compétente" },
          React.createElement(Text, { style: S.articleBody },
            "Le présent contrat est régi, interprété et exécuté conformément au droit suisse, à l\u2019exclusion de toute autre législation. Tout litige relatif à la validité, l\u2019interprétation, l\u2019exécution ou la résiliation du présent contrat sera soumis à la procédure suivante :"
          ),
          React.createElement(Text, { style: S.bulletItem }, "• En premier lieu, les parties s\u2019engagent à tenter de résoudre le différend à l\u2019amiable dans un délai de 30 jours à compter de la notification écrite du litige."),
          React.createElement(Text, { style: S.bulletItem }, "• À défaut de résolution amiable, le litige sera soumis à la juridiction exclusive des tribunaux du canton de Vaud, Suisse, dont les parties acceptent expressément la compétence."),
          React.createElement(Text, { style: S.bulletItem }, "• La version française du présent contrat fait foi en cas de divergence avec toute traduction."),
        ),

        React.createElement(Sep, null),

        React.createElement(Art, { num: "Article 9", title: "Dispositions finales" },
          React.createElement(Text, { style: S.bulletItem }, "• Tout avenant ou modification du présent contrat doit être établi par écrit et signé par les représentants dûment habilités des deux parties pour être opposable."),
          React.createElement(Text, { style: S.bulletItem }, "• Si l\u2019une quelconque des clauses du présent contrat était déclarée nulle, non écrite ou inapplicable par une autorité compétente, les autres clauses resteraient pleinement valides et applicables."),
          React.createElement(Text, { style: S.bulletItem }, "• Le Client reconnaît avoir reçu toutes les informations nécessaires avant de s\u2019engager et ne pas avoir été induit en erreur sur la nature ou l\u2019étendue des prestations."),
          React.createElement(Text, { style: S.bulletItem }, "• Le Prestataire se réserve le droit de sous-traiter tout ou partie des prestations à des partenaires qualifiés, sous sa responsabilité et sans modification du tarif convenu."),
          React.createElement(Text, { style: S.bulletItem }, "• Le présent contrat annule et remplace tout accord verbal ou écrit antérieur portant sur le même objet."),
        ),

        React.createElement(Sep, null),

        // Signatures
        React.createElement(View, { style: S.sigSection },
          React.createElement(Text, { style: S.sectionHeading }, "Signatures"),
          React.createElement(Text, { style: S.sigIntro },
            `Fait à Payerne, le ${contractDate}, en deux exemplaires originaux.`
          ),
          React.createElement(View, { style: S.sigRow },
            React.createElement(View, { style: S.sigBoxLeft },
              React.createElement(Text, { style: S.sigLabel }, "Signature du Prestataire"),
              React.createElement(Text, { style: S.sigSub }, "Atlas Incorporate — AS International Group LTD"),
              React.createElement(View, { style: S.sigStamp },
                React.createElement(Text, { style: S.sigStampName }, "Atlas Incorporate"),
                React.createElement(Text, { style: S.sigStampLine }, "Pour AS International Group LTD"),
                React.createElement(Text, { style: S.sigStampLine }, `Signé le ${contractDate}`),
                React.createElement(Text, { style: S.sigStampLine }, "128 City Road, London EC1V 2NX"),
                React.createElement(Text, { style: S.sigStampSeal }, "\u2713  SIGNATURE ÉLECTRONIQUE CERTIFIÉE"),
              ),
              React.createElement(Text, { style: S.sigNote }, "Représentant légal dûment autorisé"),
            ),
            React.createElement(View, { style: S.sigBox },
              React.createElement(Text, { style: S.sigLabel }, "Signature du Client"),
              React.createElement(Text, { style: S.sigSub }, clientFullName),
              React.createElement(View, { style: S.sigBlankZone },
                React.createElement(Text, { style: S.sigBlankHint }, "Espace réservé à la signature"),
              ),
              React.createElement(Text, { style: S.sigNote }, "Précédée de la mention « Lu et approuvé »"),
            ),
          ),
        ),

        React.createElement(Sep, null),

        // Final clause
        React.createElement(View, { style: S.disclaimerWrap },
          React.createElement(Text, { style: S.disclaimerTitle }, "Reconnaissance et acceptation intégrale"),
          React.createElement(Text, { style: S.disclaimerText },
            "Le présent contrat constitue l\u2019intégralité de l\u2019accord entre les parties et remplace tout engagement verbal ou écrit antérieur. En apposant sa signature — qu\u2019elle soit manuscrite ou électronique —, le Client déclare et reconnaît expressément : (1) avoir lu, compris et accepté sans réserve l\u2019intégralité des clauses du présent contrat ; (2) que les informations le concernant sont exactes et complètes ; (3) avoir été dûment informé des prix, délais et conditions des prestations.",
          ),
          React.createElement(Text, { style: { ...S.disclaimerText, marginTop: 5 } },
            "Le Client reconnaît que toute mauvaise gestion de la structure créée, tout manquement à ses obligations légales, fiscales, sociales ou administratives, ainsi que toutes les conséquences en découlant, relèvent exclusivement de sa responsabilité personnelle, sans que la responsabilité d\u2019Atlas Incorporate puisse être engagée de quelque manière que ce soit.",
          ),
          React.createElement(Text, { style: { ...S.disclaimerText, marginTop: 5 } },
            "Toute reproduction, diffusion ou divulgation du présent contrat, de son contenu ou des informations qui y sont liées, sans autorisation préalable écrite d\u2019Atlas Incorporate, est strictement interdite et exposera son auteur à des poursuites civiles et pénales sur le fondement de la violation du secret des affaires.",
          ),
        ),
      ),
      React.createElement(Footer, null),
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

    // Defaults
    if (!data.contractDate) {
      data.contractDate = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    }
    if (!data.items || data.items.length === 0) {
      data.items = [{ label: "Prestation de services", quantity: 1, unit_price: data.totalAmount ?? 0, currency: data.currency ?? "CHF" }];
    }
    if (!data.currency)    data.currency = "CHF";
    if (!data.totalAmount) data.totalAmount = data.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    if (!data.clientReferralRate) data.clientReferralRate = 5;

    const buffer = await renderToBuffer(React.createElement(ContractDocument, { data }));

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
