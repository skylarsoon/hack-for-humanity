export const SAMPLE_DELAY_MS = 1500;
export type SampleKind = "census" | "acta" | "factura";
export interface LineItem {
  item: string;
  qty: number;
}
export interface MingaDoc {
  title: string;
  preview: string;
  doc_type: "CENSUS_FORM" | "SIGNED_ACTA" | "HARDWARE_RECEIPT";
  household: string;
  line_items: LineItem[];
  /** Document total in COP (the printed total when present, otherwise the sum of its lines). */
  cop: number;
  vendor: string;
  low_confidence_warnings: string[];
  entity_resolution: null | {
    is_potential_duplicate: boolean;
    matched_family_id: string;
    matched_family_name: string;
    similarity_score: number;
    explanation: string;
  };
}

export function sampleDocument(kind: SampleKind): MingaDoc {
  if (kind === "factura") return {
    title: "Hardware Store Factura", doc_type: "HARDWARE_RECEIPT",
    preview: "FERRETERÍA PIJAO\nFactura FV-00912\n2 lámparas solares\nTOTAL $226.100",
    household: "", line_items: [{ item: "Lámpara Solar", qty: 2 }], cop: 226100,
    vendor: "Ferretería Pijao", low_confidence_warnings: [], entity_resolution: null,
  };
  const census = kind === "census";
  return {
    title: census ? "Paper Census Form" : "Signed Acta Receipt",
    doc_type: census ? "CENSUS_FORM" : "SIGNED_ACTA",
    preview: census ? "CENSO — Vereda La Maizena\nJefe de hogar: Maria Gomez\nPersonas: 5\nNecesita: 12 Tejas de Zinc (¿12 o 17?)" : "ACTA DE ENTREGA\nResguardo Ibanacuara\nRecibe: Fam. Queragama\n6 tejas de zinc\nFirma: ✍\nTOTAL $587.860",
    household: census ? "fam_01" : "fam_03",
    line_items: [{ item: "Tejas de Zinc", qty: census ? 12 : 6 }], cop: census ? 1007760 : 587860,
    vendor: census ? "Censo comunitario" : "Acta Ibanacuara",
    low_confidence_warnings: [census ? "Handwriting check: quantity looks like 12 or 17 Tejas de Zinc." : "Handwriting check: signature partially smudged."],
    entity_resolution: {
      is_potential_duplicate: true, matched_family_id: census ? "fam_01" : "fam_03",
      matched_family_name: census ? "Familia Gómez" : "Familia Queragama",
      similarity_score: census ? 0.92 : 0.96,
      explanation: census ? "Maria Gomez likely matches Familia Gómez in Vereda La Maizena." : "Queragama matches the household in Resguardo Ibanacuara.",
    },
  };
}

export function validApproval(doc: MingaDoc, householdIds: string[]) {
  return householdIds.includes(doc.household) && doc.line_items.length > 0 &&
    doc.line_items.every((l) => l.item.trim().length > 0 && Number.isInteger(l.qty) && l.qty > 0) &&
    Number.isFinite(doc.cop) && doc.cop >= 0;
}

export function supportedPhoto(mimeType: string) {
  return mimeType === "image/png" || mimeType === "image/jpeg";
}