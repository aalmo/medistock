import { NextRequest, NextResponse } from "next/server"
import { searchRxNorm, getRxNormDetails } from "@/lib/rxnorm"
import { searchOpenFDA } from "@/lib/openfda"

// GET /api/search/rxnorm?q=aspirin
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""
  const rxcui = searchParams.get("rxcui")

  if (rxcui) {
    const details = await getRxNormDetails(rxcui)
    return NextResponse.json({ data: details })
  }

  if (!q || q.length < 2) return NextResponse.json({ data: [] })

  // Run both APIs in parallel — openFDA fills in brand/manufacturer/ingredients
  const [rxnormResults, fdaResults] = await Promise.allSettled([
    searchRxNorm(q),
    searchOpenFDA(q),
  ])

  const rxnorm = rxnormResults.status === "fulfilled" ? rxnormResults.value : []
  const fda    = fdaResults.status    === "fulfilled" ? fdaResults.value    : []

  // Build a brand-name lookup from openFDA: generic → { brandName, manufacturer, ingredients }
  const fdaMap = new Map<string, { brandName?: string; manufacturer?: string; ingredients?: string; genericName?: string }>()
  for (const f of fda) {
    const key = (f.generic_name ?? f.brand_name ?? "").toLowerCase()
    if (key) {
      fdaMap.set(key, {
        brandName:   f.brand_name,
        manufacturer: f.manufacturer_name,
        ingredients: f.active_ingredient?.join(", ") ?? f.substance_name?.join(", "),
        genericName: f.generic_name,
      })
    }
  }

  // Enrich each RxNorm result with FDA data when brand name is missing
  const enriched = rxnorm.map(r => {
    if (r.brandName && r.genericName) return r   // already complete
    // Try to find a matching FDA entry by name
    const nameKey = r.name.toLowerCase().split(" ")[0]   // first word e.g. "ibuprofen"
    const fdaEntry = fdaMap.get(nameKey)
      ?? Array.from(fdaMap.entries()).find(([k]) => k.startsWith(nameKey))?.[1]
    if (!fdaEntry) return r
    return {
      ...r,
      brandName:   r.brandName   ?? fdaEntry.brandName,
      genericName: r.genericName ?? fdaEntry.genericName,
      manufacturer: r.manufacturer ?? fdaEntry.manufacturer,
      ingredients: r.ingredients  ?? fdaEntry.ingredients,
    }
  })

  // If RxNorm returned nothing, build results from FDA only
  if (enriched.length === 0 && fda.length > 0) {
    const fdaOnly = fda.slice(0, 8).map((f, i) => ({
      rxcui:       `fda-${i}`,
      name:        f.generic_name ?? f.brand_name ?? q,
      brandName:   f.brand_name,
      genericName: f.generic_name,
      manufacturer: f.manufacturer_name,
      form:        f.dosage_form?.toLowerCase(),
      ingredients: f.active_ingredient?.join(", ") ?? f.substance_name?.join(", "),
    }))
    return NextResponse.json({ data: fdaOnly })
  }

  return NextResponse.json({ data: enriched })
}
