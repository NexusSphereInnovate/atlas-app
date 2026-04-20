import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json() as { event: string; order?: { id: string; state: string; merchant_order_ext_ref?: string } };

  if (body.event !== "ORDER_COMPLETED" && body.order?.state !== "COMPLETED") {
    return NextResponse.json({ received: true });
  }

  const invoiceId = body.order?.merchant_order_ext_ref;
  if (!invoiceId) return NextResponse.json({ received: true });

  const supabase = await createClient();
  await supabase.from("invoices").update({
    status: "paid",
    paid_at: new Date().toISOString(),
    payment_method: "revolut",
    payment_ref: body.order?.id,
  }).eq("id", invoiceId);

  return NextResponse.json({ received: true });
}
