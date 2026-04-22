import { NextRequest, NextResponse } from "next/server";
import React from "react";
import {
  Document, Page, Text, View, StyleSheet, renderToBuffer, Line, Svg,
} from "@react-pdf/renderer";

// ─── Design tokens ────────────────────────────────────────────────────────────
const BLACK  = "#0d0d0d";
const DARK   = "#1f1f1f";
const MEDIUM = "#555555";
const LIGHT  = "#888888";
const RULE   = "#cccccc";
const TINT   = "#f4f4f4";
const BLUE   = "#1a3c6e";   // Atlas brand dark blue
const LBLUE  = "#e8edf5";   // light blue tint

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // Page
  page: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: DARK,
    paddingTop: 0,
    paddingBottom: 56,
    paddingLeft: 0,
    paddingRight: 0,
    lineHeight: 1.55,
  },

  // ── Top banner ──────────────────────────────────────────────────────────────
  topBanner: {
    backgroundColor: BLUE,
    paddingTop: 22,
    paddingBottom: 18,
    paddingLeft: 52,
    paddingRight: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 28,
  },
  bannerBrand: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 2,
  },
  bannerSub: {
    fontSize: 7,
    color: "rgba(255,255,255,0.6)",
    marginTop: 3,
    letterSpacing: 0.4,
  },
  bannerRight: {
    alignItems: "flex-end",
  },
  bannerLabel: {
    fontSize: 7.5,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  bannerTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textAlign: "right",
  },

  // ── Body padding wrapper ────────────────────────────────────────────────────
  body: {
    paddingLeft: 52,
    paddingRight: 52,
  },

  // ── Section title ───────────────────────────────────────────────────────────
  sectionHeading: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: BLUE,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  // ── Party boxes ─────────────────────────────────────────────────────────────
  partiesRow: {
    flexDirection: "row",
    marginBottom: 18,
  },
  partyBoxProvider: {
    flex: 1,
    marginRight: 8,
    borderWidth: 1,
    borderColor: BLUE,
    borderRadius: 4,
    overflow: "hidden",
  },
  partyBoxClient: {
    flex: 1,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 4,
    overflow: "hidden",
  },
  partyHeader: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: BLUE,
  },
  partyHeaderLight: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: TINT,
  },
  partyHeaderLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  partyHeaderLabelDark: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: MEDIUM,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  partyBody: {
    padding: 12,
  },
  partyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
    marginBottom: 3,
  },
  partyLine: {
    fontSize: 8.5,
    color: MEDIUM,
    marginBottom: 1.5,
  },
  partyNote: {
    fontSize: 7.5,
    color: LIGHT,
    fontStyle: "italic",
    marginTop: 6,
  },

  // "et" divider between boxes
  betweenCol: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  betweenText: {
    fontSize: 8,
    color: LIGHT,
    fontStyle: "italic",
  },

  // ── Intro ───────────────────────────────────────────────────────────────────
  introBox: {
    backgroundColor: LBLUE,
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
    padding: 10,
    marginBottom: 20,
    borderRadius: 2,
  },
  introText: {
    fontSize: 9,
    color: DARK,
    lineHeight: 1.6,
  },

  // ── Article ─────────────────────────────────────────────────────────────────
  articleWrap: {
    marginBottom: 16,
  },
  articleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  articleTitleBar: {
    width: 3,
    height: 11,
    backgroundColor: BLUE,
    borderRadius: 2,
    marginRight: 7,
  },
  articleTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  articleBody: {
    fontSize: 9,
    color: MEDIUM,
    lineHeight: 1.6,
    marginBottom: 3,
    paddingLeft: 10,
  },
  bulletItem: {
    fontSize: 9,
    color: MEDIUM,
    lineHeight: 1.6,
    paddingLeft: 18,
    marginBottom: 1.5,
  },

  // ── Separator ───────────────────────────────────────────────────────────────
  separator: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#e8e8e8",
    marginVertical: 14,
  },

  // ── Signature section ───────────────────────────────────────────────────────
  sigSection: {
    marginTop: 22,
  },
  sigIntro: {
    fontSize: 9,
    color: MEDIUM,
    marginBottom: 18,
  },
  sigRow: {
    flexDirection: "row",
  },
  sigBox: {
    flex: 1,
  },
  sigBoxLeft: {
    flex: 1,
    marginRight: 20,
  },
  sigLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  sigSub: {
    fontSize: 8,
    color: MEDIUM,
    marginBottom: 10,
  },
  // Pre-filled prestataire stamp
  sigStamp: {
    borderWidth: 1,
    borderColor: BLUE,
    borderRadius: 4,
    backgroundColor: LBLUE,
    padding: 10,
    marginBottom: 6,
  },
  sigStampName: {
    fontSize: 13,
    fontFamily: "Helvetica-BoldOblique",
    color: BLUE,
    marginBottom: 3,
  },
  sigStampLine: {
    fontSize: 7.5,
    color: BLUE,
    marginBottom: 1.5,
  },
  sigStampSeal: {
    marginTop: 5,
    fontSize: 7,
    color: "rgba(26,60,110,0.55)",
    letterSpacing: 0.5,
  },
  // Client blank zone
  sigBlankZone: {
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 4,
    height: 64,
    backgroundColor: TINT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  sigBlankHint: {
    fontSize: 8,
    color: "#bbb",
    fontStyle: "italic",
  },
  sigNote: {
    fontSize: 7.5,
    color: LIGHT,
  },

  // ── Disclaimer ──────────────────────────────────────────────────────────────
  disclaimerWrap: {
    marginTop: 18,
    padding: 11,
    borderWidth: 0.5,
    borderColor: RULE,
    borderRadius: 4,
    backgroundColor: TINT,
  },
  disclaimerTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  disclaimerText: {
    fontSize: 7.5,
    color: MEDIUM,
    lineHeight: 1.6,
  },

  // ── Footer ──────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 20,
    left: 52,
    right: 52,
    paddingTop: 7,
    borderTopWidth: 0.5,
    borderTopColor: "#ddd",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: { fontSize: 7, color: "#aaa" },
});

// ─── Re-usable sub-components ─────────────────────────────────────────────────
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

function Separator() {
  return React.createElement(View, { style: S.separator });
}

function Article({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
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

// ─── Main Document ────────────────────────────────────────────────────────────
function ContractDocument({ data }: { data: ContractData }) {
  const {
    civility, firstName, lastName,
    address, postalCode, city, country,
    companyName, companyAddress,
    contractTitle, contractDate,
  } = data;

  const clientFullName  = `${civility} ${firstName} ${lastName}`;
  const cityPostal      = [postalCode, city].filter(Boolean).join(" ");
  const addressLine2    = [cityPostal, country].filter(Boolean).join(", ");

  return React.createElement(Document,
    { title: contractTitle, author: "Atlas Incorporate", subject: "Contrat de prestation de services" },

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE 1 — Parties + Articles 1-2
    // ══════════════════════════════════════════════════════════════════════════
    React.createElement(Page, { size: "A4", style: S.page },

      React.createElement(Header, { title: contractTitle }),

      React.createElement(Body, null,

        // Section heading
        React.createElement(Text, { style: S.sectionHeading }, "Entre les soussignés"),

        // ── Two party boxes side by side ──────────────────────────────────────
        React.createElement(View, { style: S.partiesRow },

          // Prestataire (left)
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

          // "et" column
          React.createElement(View, { style: S.betweenCol },
            React.createElement(Text, { style: S.betweenText }, "et"),
          ),

          // Client (right)
          React.createElement(View, { style: S.partyBoxClient },
            React.createElement(View, { style: S.partyHeaderLight },
              React.createElement(Text, { style: S.partyHeaderLabelDark }, "Le Client / Bénéficiaire"),
            ),
            React.createElement(View, { style: S.partyBody },
              React.createElement(Text, { style: S.partyName }, clientFullName),
              address
                ? React.createElement(Text, { style: S.partyLine }, `Domicilié(e) à ${address}`)
                : null,
              addressLine2
                ? React.createElement(Text, { style: S.partyLine }, addressLine2)
                : null,
              companyName
                ? React.createElement(Text, { style: S.partyLine }, `Société : ${companyName}`)
                : null,
              companyAddress
                ? React.createElement(Text, { style: S.partyLine }, companyAddress)
                : null,
              React.createElement(Text, { style: S.partyNote }, "Ci-après désigné « le Client »"),
            ),
          ),
        ),

        // Intro box
        React.createElement(View, { style: S.introBox },
          React.createElement(Text, { style: S.introText },
            "Il a été convenu et arrêté ce qui suit entre les parties, qui reconnaissent avoir capacité juridique pour contracter. Le présent contrat constitue un accord légalement contraignant entre le Prestataire et le Client. Les deux parties s\u2019engagent à respecter l\u2019ensemble des dispositions énoncées ci-après.",
          ),
        ),

        React.createElement(Separator, null),

        // Article 1
        React.createElement(Article, { num: "Article 1", title: "Objet du contrat" },
          React.createElement(Text, { style: S.articleBody },
            "Le prestataire s\u2019engage à fournir au client un service de création et mise en place de structure internationale comprenant :"
          ),
          React.createElement(Text, { style: S.bulletItem }, "• La création d\u2019une société LTD au Royaume-Uni."),
          React.createElement(Text, { style: S.bulletItem }, "• La création d\u2019une succursale en Suisse."),
          React.createElement(Text, { style: S.bulletItem }, "• La fourniture d\u2019une domiciliation d\u2019entreprise au Royaume-Uni (incluse la première année)."),
          React.createElement(Text, { style: S.bulletItem }, "• La création d\u2019un site internet."),
          React.createElement(Text, { style: S.bulletItem }, "• La mise en place d\u2019un service de facturation."),
        ),

        React.createElement(Separator, null),

        // Article 2
        React.createElement(Article, { num: "Article 2", title: "Rémunération et paiement" },
          React.createElement(Text, { style: S.articleBody }, "Le montant global de la prestation est fixé à 1\u2019000 CHF TTC."),
          React.createElement(Text, { style: S.articleBody }, "Les frais d\u2019ouverture de la succursale en Suisse (environ 600 CHF TTC) sont à la charge exclusive du Client."),
          React.createElement(Text, { style: S.articleBody }, "Le renouvellement de la domiciliation est fixé à 1\u2019500 CHF TTC/an à partir de la 2\u1D49 année."),
          React.createElement(Text, { style: S.articleBody }, "La comptabilité et la vérification comptable sont proposées en option au tarif de 1\u2019200 CHF TTC/an (sur demande expresse du Client)."),
        ),
      ),

      React.createElement(Footer, null),
    ),

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE 2 — Articles 3-6
    // ══════════════════════════════════════════════════════════════════════════
    React.createElement(Page, { size: "A4", style: S.page },

      React.createElement(Header, { title: contractTitle }),

      React.createElement(Body, null,

        React.createElement(Article, { num: "Article 3", title: "Responsabilités" },
          React.createElement(Text, { style: S.articleBody },
            "Atlas Incorporate agit uniquement en qualité de prestataire de création et conseil. Le Prestataire ne peut être tenu responsable de :"
          ),
          React.createElement(Text, { style: S.bulletItem }, "• La mauvaise gestion de la société par le Client."),
          React.createElement(Text, { style: S.bulletItem }, "• Le non-respect des obligations fiscales, sociales, administratives ou légales du Client."),
          React.createElement(Text, { style: S.bulletItem }, "• Les conséquences de litiges, contrôles fiscaux ou sanctions liés à l\u2019activité du Client."),
          React.createElement(Text, { style: { ...S.articleBody, marginTop: 3 } },
            "Le Client demeure seul responsable de la gestion quotidienne de sa société."
          ),
        ),

        React.createElement(Separator, null),

        React.createElement(Article, { num: "Article 4", title: "Confidentialité et propriété intellectuelle" },
          React.createElement(Text, { style: S.articleBody },
            "Les informations, documents et stratégies communiqués par Atlas Incorporate sont confidentiels et demeurent la propriété exclusive du Prestataire."
          ),
          React.createElement(Text, { style: S.articleBody }, "Le Client s\u2019engage à ne pas divulguer, copier ou transmettre ces informations."),
          React.createElement(Text, { style: S.articleBody }, "Toute violation entraînera des poursuites civiles et pénales."),
        ),

        React.createElement(Separator, null),

        React.createElement(Article, { num: "Article 5", title: "Retard ou défaut de paiement" },
          React.createElement(Text, { style: S.articleBody }, "En cas de retard de plus de 7 jours, une pénalité forfaitaire de 50 CHF par jour est appliquée."),
          React.createElement(Text, { style: S.articleBody }, "En cas de non-paiement d\u2019une échéance, le Prestataire peut suspendre immédiatement ses prestations."),
          React.createElement(Text, { style: S.articleBody }, "Les sommes déjà versées restent acquises au Prestataire."),
        ),

        React.createElement(Separator, null),

        React.createElement(Article, { num: "Article 6", title: "Recommandation client" },
          React.createElement(Text, { style: S.articleBody },
            "Le Client peut recommander Atlas Incorporate. Une commission de 5 % sera versée pour chaque nouveau client signé grâce à la recommandation."
          ),
          React.createElement(Text, { style: S.articleBody },
            "Le versement n\u2019aura lieu qu\u2019après encaissement effectif du montant par Atlas Incorporate."
          ),
        ),
      ),

      React.createElement(Footer, null),
    ),

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE 3 — Articles 7-9 + Signatures + Clause finale
    // ══════════════════════════════════════════════════════════════════════════
    React.createElement(Page, { size: "A4", style: S.page },

      React.createElement(Header, { title: contractTitle }),

      React.createElement(Body, null,

        React.createElement(Article, { num: "Article 7", title: "Durée et résiliation" },
          React.createElement(Text, { style: S.articleBody },
            "Le contrat prend effet à la signature. Il prend fin à la réalisation complète des prestations et au règlement total des paiements."
          ),
          React.createElement(Text, { style: S.articleBody },
            "En cas de résiliation anticipée par le Client, les sommes déjà versées ne seront pas remboursées et la totalité du montant est dû."
          ),
        ),

        React.createElement(Separator, null),

        React.createElement(Article, { num: "Article 8", title: "Droit applicable et tribunal compétent" },
          React.createElement(Text, { style: S.articleBody }, "Le présent contrat est régi par le droit suisse. Tout litige sera réglé, en priorité, à l\u2019amiable."),
          React.createElement(Text, { style: S.articleBody }, "À défaut, la juridiction compétente sera celle du canton du siège du Prestataire."),
        ),

        React.createElement(Separator, null),

        React.createElement(Article, { num: "Article 9", title: "Dispositions finales" },
          React.createElement(Text, { style: S.articleBody }, "Toute modification du présent contrat doit être faite par écrit et signée par les deux parties."),
          React.createElement(Text, { style: S.articleBody }, "Si une clause du présent contrat était déclarée nulle, les autres resteraient valides."),
        ),

        React.createElement(Separator, null),

        // ── Signatures ─────────────────────────────────────────────────────────
        React.createElement(View, { style: S.sigSection },
          React.createElement(Text, { style: S.sectionHeading }, "Signatures"),
          React.createElement(Text, { style: S.sigIntro },
            `Fait à Payerne, le ${contractDate}, en deux exemplaires originaux.`
          ),

          React.createElement(View, { style: S.sigRow },

            // ── Prestataire (pré-signé) ───────────────────────────────────────
            React.createElement(View, { style: S.sigBoxLeft },
              React.createElement(Text, { style: S.sigLabel }, "Signature du Prestataire"),
              React.createElement(Text, { style: S.sigSub }, "Atlas Incorporate — AS International Group LTD"),

              // Stamp box
              React.createElement(View, { style: S.sigStamp },
                React.createElement(Text, { style: S.sigStampName }, "Atlas Incorporate"),
                React.createElement(Text, { style: S.sigStampLine }, "Pour AS International Group LTD"),
                React.createElement(Text, { style: S.sigStampLine }, `Signé le ${contractDate}`),
                React.createElement(Text, { style: S.sigStampLine }, "128 City Road, London EC1V 2NX"),
                React.createElement(Text, { style: S.sigStampSeal }, "\u2713  SIGNATURE ÉLECTRONIQUE CERTIFIÉE"),
              ),
              React.createElement(Text, { style: S.sigNote }, "Représentant légal dûment autorisé"),
            ),

            // ── Client (à signer) ─────────────────────────────────────────────
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

        React.createElement(Separator, null),

        // ── Clause finale ───────────────────────────────────────────────────────
        React.createElement(View, { style: S.disclaimerWrap },
          React.createElement(Text, { style: S.disclaimerTitle }, "Clause finale et reconnaissance"),
          React.createElement(Text, { style: S.disclaimerText },
            "Le présent contrat constitue l\u2019intégralité de l\u2019accord entre les parties. Le Client reconnaît avoir pris connaissance et compris l\u2019ensemble des termes et conditions ci-dessus. En apposant sa signature, le Client accepte sans réserve toutes les clauses du contrat, y compris celles relatives à la confidentialité, à la responsabilité limitée d\u2019Atlas Incorporate, ainsi qu\u2019aux modalités de paiement.",
          ),
          React.createElement(Text, { style: { ...S.disclaimerText, marginTop: 5 } },
            "Le Client reconnaît également que toute mauvaise gestion de la société, tout manquement à ses obligations légales, fiscales, sociales ou administratives relèvera exclusivement de sa responsabilité, sans que la responsabilité d\u2019Atlas Incorporate puisse être engagée. Toute reproduction, diffusion ou divulgation du présent contrat sans autorisation écrite d\u2019Atlas Incorporate est strictement interdite et pourra donner lieu à des poursuites civiles et pénales.",
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

    if (!data.contractDate) {
      data.contractDate = new Date().toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric",
      });
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
