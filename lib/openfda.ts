// openFDA drug label API integration (free, no key required for low volume)
// Docs: https://open.fda.gov/apis/drug/label/
import type { RxNormResult } from "@/lib/rxnorm"

const OPENFDA_BASE = "https://api.fda.gov/drug/label.json"

// Re-export as FDADrugResult for backward compat
export type FDADrugResult = RxNormResult & {
  brand_name?: string
  generic_name?: string
  manufacturer_name?: string
  product_type?: string
  route?: string[]
  dosage_form?: string
  substance_name?: string[]
  active_ingredient?: string[]
  warnings?: string[]
}

export async function searchOpenFDA(term: string): Promise<FDADrugResult[]> {
  if (!term || term.length < 2) return []

  try {
    const q = encodeURIComponent(term)
    const url = `${OPENFDA_BASE}?search=openfda.brand_name:"${q}"+openfda.generic_name:"${q}"&limit=5`

    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return []

    const data = await res.json()
    const results: Record<string, unknown>[] = data?.results ?? []

    return results.map(r => {
      const openfda    = (r?.openfda ?? {}) as Record<string, string[]>
      const brand      = openfda?.brand_name?.[0]
      const generic    = openfda?.generic_name?.[0]
      const mfr        = openfda?.manufacturer_name?.[0]
      const ingredients = (r?.active_ingredient as string[] | undefined)?.join(", ")
                       ?? openfda?.substance_name?.join(", ")
      // Parse strength from dosage_form string e.g. "400 mg"
      const doseStr    = (r as any)?.dosage_forms_and_strengths?.[0] as string | undefined
      const strength   = doseStr ?? undefined

      return {
        rxcui:        "" as string,
        name:         generic ?? brand ?? term,
        brandName:    brand,
        genericName:  generic,
        manufacturer: mfr,
        form:         (openfda?.route?.[0] ?? "").toLowerCase() || undefined,
        strength,
        ingredients,
        // raw FDA fields for backward compat
        brand_name:        brand,
        generic_name:      generic,
        manufacturer_name: mfr,
        product_type:      openfda?.product_type?.[0],
        route:             openfda?.route,
        dosage_form:       doseStr,
        substance_name:    openfda?.substance_name,
        active_ingredient: r?.active_ingredient as string[] | undefined,
        warnings:          (r?.warnings as string[] | undefined)?.slice(0, 1),
      } satisfies FDADrugResult
    })
  } catch {
    return []
  }
}

export async function getDrugLabelByName(name: string): Promise<FDADrugResult | null> {
  const results = await searchOpenFDA(name)
  return results[0] ?? null
}
