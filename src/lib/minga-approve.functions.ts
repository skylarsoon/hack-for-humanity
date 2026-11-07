import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { censusItemsPayload, copToUsd, expenseItemsPayload } from "./minga-ledger";

const Item = z.object({
  item: z.string().trim().min(1).max(120),
  qty: z.number().int().min(1).max(100_000),
  category: z.enum(["roof", "water", "energy", "rebuild", "heal"]),
});
const Input = z.object({
  docType: z.enum(["CENSUS_FORM", "SIGNED_ACTA", "HARDWARE_RECEIPT"]),
  household: z.string().min(1).max(40),
  vendor: z.string().trim().max(120),
  receipt: z.string().trim().min(1).max(80),
  cop: z.number().finite().min(0).max(10_000_000_000),
  estimated: z.boolean(),
  items: z.array(Item).min(1).max(50),
  transcription: z.string().max(20_000),
  warnings: z.array(z.string().max(500)).max(50),
  image: z.object({ mimeType: z.enum(["image/png", "image/jpeg"]), base64: z.string().min(1).max(14_000_000) }).nullable(),
});

export type ApproveResult = { ok: true; imageSaved: boolean; message: string } | { ok: false; error: string };

export const approveMingaDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<ApproveResult> => {
    const { supabase } = context;
    if (data.docType !== "CENSUS_FORM" && data.cop <= 0) return { ok: false, error: "Enter the amount paid before approving." };
    const { data: household, error: hhError } = await supabase.from("public_households").select("id,phase").eq("id", data.household).maybeSingle();
    if (hhError || !household || household.phase == null) return { ok: false, error: "That household is not registered." };

    // Photo goes to the private bucket first; the document row records the path only if the upload worked.
    const documentId = crypto.randomUUID();
    let imagePath: string | null = null;
    if (data.image) {
      const path = `${documentId}.${data.image.mimeType === "image/png" ? "png" : "jpg"}`;
      const { error } = await supabase.storage.from("documents").upload(path, Buffer.from(data.image.base64, "base64"), { contentType: data.image.mimeType });
      if (error) console.error("Document photo upload failed", error.message); else imagePath = path;
    }
    const { error: docError } = await supabase.from("documents").insert({
      id: documentId, doc_type: data.docType, image_path: imagePath, transcription: data.transcription,
      extracted: { vendor: data.vendor, cop: data.cop, cop_estimated: data.estimated, items: data.items, warnings: data.warnings } as Json,
    });
    if (docError) { console.error("Document insert failed", docError.message); return { ok: false, error: "Could not save the document." }; }

    if (data.docType === "CENSUS_FORM") {
      const { data: count, error } = await supabase.rpc("approve_census", { p_household_id: data.household, p_document_id: documentId, p_items: censusItemsPayload(data.items) as unknown as Json });
      if (error) return { ok: false, error: error.message };
      return { ok: true, imageSaved: Boolean(imagePath), message: `${count ?? data.items.length} need${count === 1 ? "" : "s"} added to the needs budget` };
    }
    const usd = copToUsd(data.cop);
    const { error } = await supabase.rpc("approve_expense", {
      p_household_id: data.household, p_vendor: data.vendor || "Sin proveedor",
      p_method: data.docType === "HARDWARE_RECEIPT" ? "Factura" : "Efectivo + Acta",
      p_receipt: data.receipt, p_date: new Date().toISOString().slice(0, 10), p_cop: data.cop, p_usd: usd,
      p_phase: household.phase, p_items: expenseItemsPayload(data.items, usd) as unknown as Json, p_document_id: documentId,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, imageSaved: Boolean(imagePath), message: "Expense published to the open books" };
  });
