/**
 * EU Drug Database — ChEMBL (EMBL-EBI)
 *
 * ChEMBL is the authoritative European drug database maintained by the
 * European Bioinformatics Institute (EMBL-EBI, Hinxton, UK).
 * It is free, requires no API key, and contains:
 *   - INN (International Nonproprietary Names) — generic names
 *   - Brand / trade names (synonyms) including European market names
 *   - Molecule type, max clinical phase, etc.
 *
 * API docs: https://chembl.gitbook.io/chembl-interface-documentation/web-services/chembl-data-web-services
 *
 * Search strategy (both run in parallel, results merged):
 *   1. By preferred name (INN):  pref_name__icontains=<term>
 *   2. By synonym/brand name:    molecule_synonyms__molecule_synonym__icontains=<term>
 */

import type { RxNormResult } from "./rxnorm"

export type EMADrugResult = Omit<RxNormResult, "rxcui"> & {
  rxcui?: string
  emaProductNumber?: string
  atcCode?: string
  activeSubstance?: string
  authorisationStatus?: string
  therapeuticArea?: string
  chemblId?: string
}

const CHEMBL_BASE = "https://www.ebi.ac.uk/chembl/api/data/molecule"

interface ChEMBLMolecule {
  molecule_chembl_id?: string
  pref_name?: string | null
  molecule_type?: string
  max_phase?: number | null
  molecule_synonyms?: Array<{
    molecule_synonym?: string
    syn_type?: string
    language?: string
  }>
  atc_classifications?: string[]
}

/**
 * Search the EU ChEMBL database.
 * Runs two parallel queries — one by INN/generic name, one by brand/synonym.
 * Returns up to 20 deduplicated results in RxNormResult-compatible format.
 */
export async function searchEMA(term: string): Promise<EMADrugResult[]> {
  if (!term || term.length < 2) return []

  const [byName, bySynonym] = await Promise.allSettled([
    searchChEMBLByName(term),
    searchChEMBLBySynonym(term),
  ])

  const nameResults    = byName.status    === "fulfilled" ? byName.value    : []
  const synonymResults = bySynonym.status === "fulfilled" ? bySynonym.value : []

  // Merge, deduplicate by ChEMBL ID then by lowercase name
  const seen = new Set<string>()
  const merged: EMADrugResult[] = []

  for (const r of [...nameResults, ...synonymResults]) {
    const key = r.chemblId ?? (r.name + (r.brandName ?? "")).toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(r)
    }
  }

  return merged.slice(0, 20)
}

// ─── Search by INN / preferred name ──────────────────────────────────────────
async function searchChEMBLByName(term: string): Promise<EMADrugResult[]> {
  const url = `${CHEMBL_BASE}?pref_name__icontains=${encodeURIComponent(term)}&limit=15&format=json`
  return fetchChEMBL(url, null)
}

// ─── Search by brand / synonym name ──────────────────────────────────────────
async function searchChEMBLBySynonym(term: string): Promise<EMADrugResult[]> {
  const url = `${CHEMBL_BASE}?molecule_synonyms__molecule_synonym__icontains=${encodeURIComponent(term)}&limit=15&format=json`
  return fetchChEMBL(url, term)
}

// ─── Shared fetcher + mapper ──────────────────────────────────────────────────
async function fetchChEMBL(url: string, searchedTerm: string | null): Promise<EMADrugResult[]> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return []

    const data = await res.json()
    const molecules: ChEMBLMolecule[] = data?.molecules ?? []

    return molecules.flatMap(mol => {
      const genericName = mol.pref_name ?? undefined
      if (!genericName && !searchedTerm) return []

      const name = genericName ?? searchedTerm ?? "Unknown"

      // Collect brand names from synonyms — prefer trade names, then any synonym
      const synonyms = mol.molecule_synonyms ?? []
      const tradeSynonyms = synonyms
        .filter(s => s.syn_type === "TRADE_NAME" || s.syn_type === "BRAND")
        .map(s => s.molecule_synonym)
        .filter(Boolean) as string[]

      const allSynonyms = synonyms
        .map(s => s.molecule_synonym)
        .filter(Boolean) as string[]

      // If searched by synonym, the first matching synonym is the brand
      const brandName = tradeSynonyms[0]
        ?? (searchedTerm
          ? allSynonyms.find(s => s.toLowerCase().includes(searchedTerm.toLowerCase()))
          : undefined)
        ?? allSynonyms[0]

      // ATC code (first one if available)
      const atcCode = mol.atc_classifications?.[0]

      const result: EMADrugResult = {
        name,
        genericName,
        brandName: brandName !== name ? brandName : undefined,
        ingredients: genericName,
        atcCode,
        chemblId: mol.molecule_chembl_id,
        authorisationStatus: mol.max_phase != null ? `Phase ${mol.max_phase}` : undefined,
      }
      return [result]
    })
  } catch {
    return []
  }
}
