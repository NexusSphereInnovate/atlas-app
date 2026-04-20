import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { invoiceId } = await request.json();
  if (!invoiceId) return NextResponse.json({ error: "invoiceId required" }, { status: 400 });

  const supabase = await createClient();
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("id, total, currency, invoice_number, client_id")
    .eq("id", invoiceId)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const apiKey = process.env.REVOLUT_MERCHANT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Revolut API key not configured" }, { status: 500 });
  }

  // Create Revolut order
  const baseUrl = process.env.REVOLUT_SANDBOX === "true"
    ? "https://sandbox-merchant.revolut.com"
    : "https://merchant.revolut.com";

  const res = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Revolut-Api-Version": "2024-09-01",
    },
    body: JSON.stringify({
      amount: Math.round(invoice.total * 100), // in cents
      currency: invoice.currency ?? "CHF",
      description: `Atlas Incorporate — Facture ${invoice.invoice_number}`,
      merchant_order_ext_ref: invoice.id,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ error: `Revolut error: ${body}` }, { status: 502 });
  }

  const order = await res.json() as { id: string; public_id: string };

  // Store order IDs on invoice
  await supabase.from("invoices").update({
    revolut_order_id: order.id,
    revolut_public_id: order.public_id,
  }).eq("id", invoiceId);

  const checkoutUrl = `https://checkout.revolut.com/payment-link/${order.public_id}`;
  return NextResponse.json({ checkoutUrl });
}
