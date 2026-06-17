import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SERVICE_PCT = 0.05; // 5% service charge on items
const COMMISSION_PCT = 0.3; // 30% of delivery fee = app profit

const placeOrderInput = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid().nullable(),
        product_name: z.string().min(1),
        quantity: z.number().int().positive(),
        unit_price: z.number().nonnegative(),
        note: z.string().optional(),
      }),
    )
    .min(1),
  delivery_address: z.string().min(3),
  delivery_notes: z.string().optional(),
  custom_request: z.string().optional(),
  delivery_fee: z.number().nonnegative(),
});

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => placeOrderInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const itemsTotal = data.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const serviceCharge = Math.round(itemsTotal * SERVICE_PCT);
    const commission = Math.round(data.delivery_fee * COMMISSION_PCT);
    const total = itemsTotal + data.delivery_fee + serviceCharge;

    // Check wallet
    const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", userId).single();
    const bal = Number(wallet?.balance ?? 0);
    if (bal < total) {
      throw new Error(`Insufficient wallet balance. Need K${total}, have K${bal}. Top up your wallet first.`);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Create order
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        student_id: userId,
        status: "pending",
        items_total: itemsTotal,
        delivery_fee: data.delivery_fee,
        service_charge: serviceCharge,
        commission,
        total,
        delivery_address: data.delivery_address,
        delivery_notes: data.delivery_notes,
        custom_request: data.custom_request,
      })
      .select()
      .single();
    if (oErr || !order) throw new Error(oErr?.message ?? "Order failed");

    const { error: iErr } = await supabaseAdmin
      .from("order_items")
      .insert(data.items.map((i) => ({ ...i, order_id: order.id })));
    if (iErr) throw new Error(iErr.message);

    // Escrow hold: deduct from student wallet
    await supabaseAdmin.from("wallets").update({ balance: bal - total }).eq("user_id", userId);
    await supabaseAdmin.from("wallet_transactions").insert({
      user_id: userId,
      amount: -total,
      kind: "escrow_hold",
      order_id: order.id,
      note: "Funds held in escrow",
    });

    return { orderId: order.id };
  });

export const topUpWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ amount: z.number().positive().max(500000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: w } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", userId).single();
    const bal = Number(w?.balance ?? 0) + data.amount;
    await supabaseAdmin.from("wallets").upsert({ user_id: userId, balance: bal });
    await supabaseAdmin.from("wallet_transactions").insert({
      user_id: userId,
      amount: data.amount,
      kind: "topup",
      note: "Mock top-up (demo)",
    });
    return { balance: bal };
  });

export const acceptOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!roles?.some((r) => r.role === "agent")) throw new Error("Only delivery agents can accept orders");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ord, error } = await supabaseAdmin
      .from("orders")
      .update({ agent_id: userId, status: "accepted" })
      .eq("id", data.orderId)
      .eq("status", "pending")
      .is("agent_id", null)
      .select()
      .single();
    if (error || !ord) throw new Error("Order no longer available");
    return { ok: true };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        status: z.enum(["purchased", "delivering", "delivered"]),
        receipt_url: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: {
      status: "purchased" | "delivering" | "delivered";
      receipt_url?: string;
      delivered_at?: string;
    } = { status: data.status };
    if (data.receipt_url) patch.receipt_url = data.receipt_url;
    if (data.status === "delivered") patch.delivered_at = new Date().toISOString();
    const { error } = await supabaseAdmin.from("orders").update(patch).eq("id", data.orderId).eq("agent_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const confirmReceived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ord } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .eq("student_id", userId)
      .single();
    if (!ord) throw new Error("Order not found");
    if (ord.status === "completed") return { ok: true };
    if (!ord.agent_id) throw new Error("No agent assigned");

    const itemsTotal = Number(ord.items_total);
    const deliveryFee = Number(ord.delivery_fee);
    const commission = Number(ord.commission);
    const agentPayout = itemsTotal + (deliveryFee - commission);

    // Pay the agent
    const { data: w } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", ord.agent_id).single();
    const newBal = Number(w?.balance ?? 0) + agentPayout;
    await supabaseAdmin.from("wallets").upsert({ user_id: ord.agent_id, balance: newBal });
    await supabaseAdmin.from("wallet_transactions").insert([
      {
        user_id: ord.agent_id,
        amount: agentPayout,
        kind: "payout",
        order_id: ord.id,
        note: `Refund K${itemsTotal} + delivery share K${deliveryFee - commission}`,
      },
    ]);

    await supabaseAdmin
      .from("orders")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", ord.id);

    return { ok: true, agentPayout, commission };
  });

const productInput = z.object({
  business_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  price: z.number().nonnegative(),
  image_url: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  stock: z.number().int().nonnegative().default(0),
  category: z.string().max(80).optional(),
});

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid().optional(), data: productInput }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: biz } = await supabase
      .from("businesses")
      .select("owner_id")
      .eq("id", data.data.business_id)
      .single();
    if (!biz || biz.owner_id !== userId) throw new Error("Not your business");
    if (data.id) {
      const { error } = await supabase.from("products").update(data.data).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase.from("products").insert(data.data).select("id").single();
    if (error || !row) throw new Error(error?.message ?? "insert failed");
    return { id: row.id };
  });
