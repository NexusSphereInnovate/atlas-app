import { NextRequest, NextResponse } from "next/server";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  Font,
} from "@react-pdf/renderer";

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 50,
    paddingBottom: 70,
    paddingLeft: 60,
    paddingRight: 60,
    color: "#1a1a1a",
    lineHeight: 1.5,
  },
  // Header
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#1a1a1a",
  },
  brandName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
    color: "#1a1a1a",
  },
  brandSubtitle: {
    fontSize: 7.5,
    color: "#555",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  contractLabel: {
    fontSize: 9,
    color: "#555",
    textAlign: "right",
  },
  contractTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    textAlign: "right",
    marginTop: 2,
  },
  // Parties section
  partiesContainer: {
    marginBottom: 30,
  },
  partiesTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#555",
    marginBottom: 12,
  },
  partiesGrid: {
    flexDirection: "row",
    gap: 20,
  },
  partyBox: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
  },
  partyBoxProvider: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 4,
    backgroundColor: "#f9f9f9",
  },
  partyRole: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#888",
    marginBottom: 6,
  },
  partyName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  partyLine: {
    fontSize: 9,
    color: "#444",
    marginBottom: 2,
  },
  partyNote: {
    fontSize: 8,
    color: "#888",
    marginTop: 6,
    fontStyle: "italic",
  },
  // "Entre" label
  betweenLabel: {
    fontSize: 9,
    color: "#888",
    textAlign: "center",
    marginVertical: 8,
    fontStyle: "italic",
  },
  // Intro text
  introText: {
    fontSize: 9.5,
    color: "#333",
    marginBottom: 25,
    lineHeight: 1.6,
  },
  // Article
  articleContainer: {
    marginBottom: 18,
  },
  articleTitle: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  articleBody: {
    fontSize: 9.5,
    color: "#333",
    lineHeight: 1.6,
    marginBottom: 4,
  },
  bulletLine: {
    fontSize: 9.5,
    color: "#333",
    lineHeight: 1.6,
    paddingLeft: 12,
    marginBottom: 2,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 60,
    right: 60,
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 7.5,
    color: "#aaa",
  },
  footerPage: {
    fontSize: 7.5,
    color: "#aaa",
  },
  // Signature section
  signatureSection: {
    marginTop: 30,
  },
  signatureTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#888",
    marginBottom: 16,
  },
  signatureGrid: {
    flexDirection: "row",
    gap: 30,
  },
  signatureBox: {
    flex: 1,
  },
  signatureLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#333",
    marginBottom: 4,
  },
  signatureSub: {
    fontSize: 8,
    color: "#888",
    marginBottom: 20,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#aaa",
    marginBottom: 6,
    paddingBottom: 2,
  },
  signatureNote: {
    fontSize: 7.5,
    color: "#aaa",
  },
  // Disclaimer box
  disclaimerBox: {
    marginTop: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    backgroundColor: "#fafafa",
  },
  disclaimerTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#333",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  disclaimerText: {
    fontSize: 8,
    color: "#555",
    lineHeight: 1.6,
  },
  separator: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
    marginVertical: 16,
  },
});

// ─── Footer component ─────────────────────────────────────────────────────────
function PageFooter() {
  return (
    React.createElement(View, { style: styles.footer },
      React.createElement(Text, { style: styles.footerText }, "ATLAS INCORPORATE — AS International Group LTD"),
      React.createElement(Text, { style: styles.footerText }, "128 City Road, London, United Kingdom, EC1V 2NX"),
    )
  );
}

// ─── Main PDF Document ────────────────────────────────────────────────────────
function ContractDocument({ data }: { data: ContractData }) {
  const {
    civility, firstName, lastName,
    address, postalCode, city, country,
    companyName, companyAddress,
    contractTitle, contractDate,
  } = data;

  const clientFullName = `${civility} ${firstName} ${lastName}`;
  const clientAddress  = [address, `${postalCode} ${city}`, country].filter(Boolean).join(", ");

  return React.createElement(Document,
    { title: contractTitle, author: "Atlas Incorporate", subject: "Contrat de prestation de services" },

    // ── PAGE 1: Parties ──────────────────────────────────────────────────────
    React.createElement(Page, { size: "A4", style: styles.page },

      // Header
      React.createElement(View, { style: styles.headerContainer },
        React.createElement(View, null,
          React.createElement(Text, { style: styles.brandName }, "ATLAS INCORPORATE"),
          React.createElement(Text, { style: styles.brandSubtitle }, "AS International Group LTD • 128 City Road, London EC1V 2NX"),
        ),
        React.createElement(View, null,
          React.createElement(Text, { style: styles.contractLabel }, "CONTRAT DE PRESTATION"),
          React.createElement(Text, { style: styles.contractTitle }, contractTitle),
        ),
      ),

      // Parties
      React.createElement(View, { style: styles.partiesContainer },
        React.createElement(Text, { style: styles.partiesTitle }, "Entre les soussignés"),

        // Provider
        React.createElement(View, { style: styles.partyBoxProvider },
          React.createElement(Text, { style: styles.partyRole }, "Le Prestataire"),
          React.createElement(Text, { style: styles.partyName }, "Atlas Incorporate"),
          React.createElement(Text, { style: styles.partyLine }, "Détenue par AS International Group LTD"),
          React.createElement(Text, { style: styles.partyLine }, "128 City Road, London, United Kingdom"),
          React.createElement(Text, { style: styles.partyLine }, "EC1V 2NX"),
          React.createElement(Text, { style: styles.partyNote }, "Ci-après désigné « le Prestataire »"),
        ),

        React.createElement(Text, { style: styles.betweenLabel }, "— et —"),

        // Client
        React.createElement(View, { style: styles.partyBox },
          React.createElement(Text, { style: styles.partyRole }, "Le Client / Bénéficiaire"),
          React.createElement(Text, { style: styles.partyName }, clientFullName),
          address  ? React.createElement(Text, { style: styles.partyLine }, `Domicilié(e) à ${clientAddress}`) : null,
          companyName ? React.createElement(View, null,
            React.createElement(Text, { style: styles.partyLine }, `Société : ${companyName}`),
            companyAddress ? React.createElement(Text, { style: styles.partyLine }, companyAddress) : null,
          ) : null,
          React.createElement(Text, { style: styles.partyNote }, "Ci-après désigné « le Client »"),
        ),
      ),

      // Intro
      React.createElement(Text, { style: styles.introText },
        "Il a été convenu et arrêté ce qui suit entre les parties, qui reconnaissent avoir capacité juridique pour contracter. Le présent contrat constitue un accord légalement contraignant entre le Prestataire et le Client. Les deux parties s'engagent à respecter l'ensemble des dispositions énoncées ci-après.",
      ),

      React.createElement(View, { style: styles.separator }),

      // Article 1
      React.createElement(View, { style: styles.articleContainer },
        React.createElement(Text, { style: styles.articleTitle }, "Article 1 — Objet du contrat"),
        React.createElement(Text, { style: styles.articleBody },
          "Le prestataire s'engage à fournir au client un service de création et mise en place de structure internationale comprenant :",
        ),
        React.createElement(Text, { style: styles.bulletLine }, "• La création d'une société LTD au Royaume-Uni."),
        React.createElement(Text, { style: styles.bulletLine }, "• La création d'une succursale en Suisse."),
        React.createElement(Text, { style: styles.bulletLine }, "• La fourniture d'une domiciliation d'entreprise au Royaume-Uni (incluse la première année)."),
        React.createElement(Text, { style: styles.bulletLine }, "• La création d'un site internet."),
        React.createElement(Text, { style: styles.bulletLine }, "• La mise en place d'un service de facturation."),
      ),

      // Article 2
      React.createElement(View, { style: styles.articleContainer },
        React.createElement(Text, { style: styles.articleTitle }, "Article 2 — Rémunération et paiement"),
        React.createElement(Text, { style: styles.articleBody }, "Le montant global de la prestation est fixé à 1\u2019000 CHF TTC."),
        React.createElement(Text, { style: styles.articleBody }, "Les frais d\u2019ouverture de la succursale en Suisse (environ 600 CHF TTC) sont à la charge exclusive du Client."),
        React.createElement(Text, { style: styles.articleBody }, "Le renouvellement de la domiciliation est fixé à 1\u2019500 CHF TTC/an à partir de la 2\u1D49 année."),
        React.createElement(Text, { style: styles.articleBody }, "La comptabilité et la vérification comptable sont proposées en option au tarif de 1\u2019200 CHF TTC/an (sur demande expresse du Client)."),
      ),

      React.createElement(PageFooter, null),
    ),

    // ── PAGE 2: Articles 3–6 ─────────────────────────────────────────────────
    React.createElement(Page, { size: "A4", style: styles.page },

      React.createElement(View, { style: styles.articleContainer },
        React.createElement(Text, { style: styles.articleTitle }, "Article 3 — Responsabilités"),
        React.createElement(Text, { style: styles.articleBody }, "Atlas Incorporate agit uniquement en qualité de prestataire de création et conseil. Le Prestataire ne peut être tenu responsable de :"),
        React.createElement(Text, { style: styles.bulletLine }, "• La mauvaise gestion de la société par le Client."),
        React.createElement(Text, { style: styles.bulletLine }, "• Le non-respect des obligations fiscales, sociales, administratives ou légales du Client."),
        React.createElement(Text, { style: styles.bulletLine }, "• Les conséquences de litiges, contrôles fiscaux ou sanctions liés à l\u2019activité du Client."),
        React.createElement(Text, { style: styles.articleBody, marginTop: 4 }, "Le Client demeure seul responsable de la gestion quotidienne de sa société."),
      ),

      React.createElement(View, { style: styles.separator }),

      React.createElement(View, { style: styles.articleContainer },
        React.createElement(Text, { style: styles.articleTitle }, "Article 4 — Confidentialité et propriété intellectuelle"),
        React.createElement(Text, { style: styles.articleBody }, "Les informations, documents et stratégies communiqués par Atlas Incorporate sont confidentiels et demeurent la propriété exclusive du Prestataire."),
        React.createElement(Text, { style: styles.articleBody }, "Le Client s\u2019engage à ne pas divulguer, copier ou transmettre ces informations."),
        React.createElement(Text, { style: styles.articleBody }, "Toute violation entraînera des poursuites civiles et pénales."),
      ),

      React.createElement(View, { style: styles.separator }),

      React.createElement(View, { style: styles.articleContainer },
        React.createElement(Text, { style: styles.articleTitle }, "Article 5 — Retard ou défaut de paiement"),
        React.createElement(Text, { style: styles.articleBody }, "En cas de retard de plus de 7 jours, une pénalité forfaitaire de 50 CHF par jour est appliquée."),
        React.createElement(Text, { style: styles.articleBody }, "En cas de non-paiement d\u2019une échéance, le Prestataire peut suspendre immédiatement ses prestations."),
        React.createElement(Text, { style: styles.articleBody }, "Les sommes déjà versées restent acquises au Prestataire."),
      ),

      React.createElement(View, { style: styles.separator }),

      React.createElement(View, { style: styles.articleContainer },
        React.createElement(Text, { style: styles.articleTitle }, "Article 6 — Recommandation client"),
        React.createElement(Text, { style: styles.articleBody }, "Le Client peut recommander Atlas Incorporate. Une commission de 5 % sera versée pour chaque nouveau client signé grâce à la recommandation."),
        React.createElement(Text, { style: styles.articleBody }, "Le versement n\u2019aura lieu qu\u2019après encaissement effectif du montant par Atlas Incorporate."),
      ),

      React.createElement(PageFooter, null),
    ),

    // ── PAGE 3: Articles 7–9 + Signatures ───────────────────────────────────
    React.createElement(Page, { size: "A4", style: styles.page },

      React.createElement(View, { style: styles.articleContainer },
        React.createElement(Text, { style: styles.articleTitle }, "Article 7 — Durée et résiliation"),
        React.createElement(Text, { style: styles.articleBody }, "Le contrat prend effet à la signature. Il prend fin à la réalisation complète des prestations et au règlement total des paiements."),
        React.createElement(Text, { style: styles.articleBody }, "En cas de résiliation anticipée par le Client, les sommes déjà versées ne seront pas remboursées et la totalité du montant est dû."),
      ),

      React.createElement(View, { style: styles.separator }),

      React.createElement(View, { style: styles.articleContainer },
        React.createElement(Text, { style: styles.articleTitle }, "Article 8 — Droit applicable et tribunal compétent"),
        React.createElement(Text, { style: styles.articleBody }, "Le présent contrat est régi par le droit suisse. Tout litige sera réglé, en priorité, à l\u2019amiable."),
        React.createElement(Text, { style: styles.articleBody }, "À défaut, la juridiction compétente sera celle du canton du siège du Prestataire."),
      ),

      React.createElement(View, { style: styles.separator }),

      React.createElement(View, { style: styles.articleContainer },
        React.createElement(Text, { style: styles.articleTitle }, "Article 9 — Dispositions finales"),
        React.createElement(Text, { style: styles.articleBody }, "Toute modification du présent contrat doit être faite par écrit et signée par les deux parties."),
        React.createElement(Text, { style: styles.articleBody }, "Si une clause du présent contrat était déclarée nulle, les autres resteraient valides."),
      ),

      React.createElement(View, { style: styles.separator }),

      // Signatures
      React.createElement(View, { style: styles.signatureSection },
        React.createElement(Text, { style: styles.signatureTitle }, "Signatures"),

        React.createElement(Text, { style: { fontSize: 9, color: "#555", marginBottom: 20 } },
          `Fait à Payerne, le ${contractDate}, en deux exemplaires originaux.`
        ),

        React.createElement(View, { style: styles.signatureGrid },
          // Prestataire
          React.createElement(View, { style: styles.signatureBox },
            React.createElement(Text, { style: styles.signatureLabel }, "Signature du Prestataire"),
            React.createElement(Text, { style: styles.signatureSub }, "Atlas Incorporate"),
            React.createElement(View, { style: styles.signatureLine }),
            React.createElement(Text, { style: styles.signatureNote }, "Représentant légal — AS International Group LTD"),
          ),
          // Client
          React.createElement(View, { style: styles.signatureBox },
            React.createElement(Text, { style: styles.signatureLabel }, "Signature du Client"),
            React.createElement(Text, { style: styles.signatureSub }, clientFullName),
            React.createElement(View, { style: styles.signatureLine }),
            React.createElement(Text, { style: styles.signatureNote }, "Précédée de la mention « Lu et approuvé »"),
          ),
        ),
      ),

      React.createElement(View, { style: { ...styles.separator, marginTop: 20 } }),

      // Disclaimer box
      React.createElement(View, { style: styles.disclaimerBox },
        React.createElement(Text, { style: styles.disclaimerTitle }, "Clause finale et reconnaissance"),
        React.createElement(Text, { style: styles.disclaimerText },
          "Le présent contrat constitue l\u2019intégralité de l\u2019accord entre les parties. Le Client reconnaît avoir pris connaissance et compris l\u2019ensemble des termes et conditions ci-dessus. En apposant sa signature, le Client accepte sans réserve toutes les clauses du contrat, y compris celles relatives à la confidentialité, à la responsabilité limitée d\u2019Atlas Incorporate, ainsi qu\u2019aux modalités de paiement.",
        ),
        React.createElement(Text, { style: { ...styles.disclaimerText, marginTop: 6 } },
          "Le Client reconnaît également que toute mauvaise gestion de la société, tout manquement à ses obligations légales, fiscales, sociales ou administratives relèvera exclusivement de sa responsabilité, sans que la responsabilité d\u2019Atlas Incorporate puisse être engagée. Toute reproduction, diffusion ou divulgation du présent contrat sans autorisation écrite d\u2019Atlas Incorporate est strictement interdite et pourra donner lieu à des poursuites civiles et pénales.",
        ),
      ),

      React.createElement(PageFooter, null),
    ),
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
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
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const data: ContractData = await req.json();

    if (!data.firstName || !data.lastName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Format date if not provided
    if (!data.contractDate) {
      const now = new Date();
      data.contractDate = now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    }

    const buffer = await renderToBuffer(
      React.createElement(ContractDocument, { data })
    );

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
