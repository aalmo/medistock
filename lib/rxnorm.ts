// RxNorm API integration (NLM - free, no API key required)
// Docs: https://rxnav.nlm.nih.gov/RxNormAPIs.html

const RXNORM_BASE = 'https://rxnav.nlm.nih.gov/REST';

export interface RxNormResult {
  rxcui: string;
  name: string;
  brandName?: string;
  genericName?: string;
  strength?: string;
  form?: string;
  manufacturer?: string;
  ingredients?: string;
  tty?: string; // term type: SBD, SCD, BN, IN, etc.
}

export interface RxNormIngredient {
  rxcui: string;
  name: string;
  tty: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY STRATEGY: use /drugs.json which returns ALL concept types in one call
// including: BN (brand), SBD (branded drug), SCD (clinical drug), IN (ingredient)
// This avoids N+1 per-rxcui lookups and gives brand names directly.
// ─────────────────────────────────────────────────────────────────────────────
export async function searchRxNorm(term: string): Promise<RxNormResult[]> {
  if (!term || term.length < 2) return [];

  try {
    // Step 1: use /drugs.json — returns structured groups with brand + generic names
    const drugsUrl = `${RXNORM_BASE}/drugs.json?name=${encodeURIComponent(term)}`;
    const drugsRes = await fetch(drugsUrl, {
      next: { revalidate: 3600 },
      headers: { 'Accept': 'application/json' },
    });

    if (drugsRes.ok) {
      const drugsData = await drugsRes.json();
      const groups: Array<{
        tty: string;
        conceptProperties?: Array<{ rxcui: string; name: string; tty: string; language?: string; suppress?: string }>;
      }> = drugsData?.drugGroup?.conceptGroup ?? [];

      const results: RxNormResult[] = [];
      const seen = new Set<string>();

      // Priority order: SBD (Semantic Branded Drug) > BN (Brand Name) > SCD (Semantic Clinical Drug) > IN (Ingredient)
      const priority = ['SBD', 'BN', 'SCD', 'BPCK', 'GPCK', 'IN'];

      for (const tty of priority) {
        const group = groups.find(g => g.tty === tty);
        if (!group?.conceptProperties) continue;

        for (const concept of group.conceptProperties) {
          if (seen.has(concept.rxcui)) continue;
          seen.add(concept.rxcui);

          // Parse "Drug Name Strength Form [Brand]" pattern from SBD names
          // e.g. "Ibuprofen 400 MG Oral Tablet [Advil]"
          const brandMatch   = concept.name.match(/\[([^\]]+)\]$/);
          const strengthMatch = concept.name.match(/(\d+\.?\d*\s*(?:MG\/ML|MG|MCG\/ACTUAT|MCG|ML|%|IU|MEQ|MMOL|G)\b)/i);
          const formMatch     = concept.name.match(/\b(Oral Tablet|Oral Capsule|Oral Solution|Injectable Solution|Inhalation Powder|Nasal Spray|Topical Cream|Topical Gel|Ophthalmic Solution|Chewable Tablet|Extended Release Tablet|Patch)\b/i);

          const brandName    = brandMatch?.[1] ?? undefined;
          const genericName  = brandMatch
            ? concept.name.replace(/\s*\[[^\]]+\]$/, '').replace(/\s+\d+.*$/, '').trim()
            : tty === 'BN' ? undefined : concept.name.replace(/\s+\d+.*$/, '').trim();
          const strength     = strengthMatch?.[1] ?? undefined;
          const form         = formMatch?.[1]?.toLowerCase() ?? undefined;

          // Display name: brand if available, else generic
          const displayName = brandName ?? (tty === 'BN' ? concept.name : genericName ?? concept.name);

          results.push({
            rxcui:       concept.rxcui,
            name:        tty === 'SBD' || tty === 'SCD' ? concept.name : concept.name,
            brandName,
            genericName: genericName !== displayName ? genericName : undefined,
            strength,
            form,
            tty:         concept.tty,
          });

          if (results.length >= 10) break;
        }
        if (results.length >= 10) break;
      }

      if (results.length > 0) return results;
    }

    // Step 2: fallback to approximateTerm if /drugs.json returns nothing
    const approxUrl = `${RXNORM_BASE}/approximateTerm.json?term=${encodeURIComponent(term)}&maxEntries=10`;
    const approxRes = await fetch(approxUrl, {
      next: { revalidate: 3600 },
      headers: { 'Accept': 'application/json' },
    });
    if (!approxRes.ok) return [];

    const approxData = await approxRes.json();
    const candidates: Array<{ rxcui: string; name: string; score: string }> =
      approxData?.approximateGroup?.candidate ?? [];

    const seen2 = new Set<string>();
    return candidates
      .filter(c => { if (seen2.has(c.rxcui)) return false; seen2.add(c.rxcui); return true; })
      .slice(0, 10)
      .map(c => {
        const strengthMatch = c.name.match(/(\d+\.?\d*\s*(?:MG\/ML|MG|MCG|ML|%|IU|G)\b)/i);
        const formMatch     = c.name.match(/\b(tablet|capsule|solution|injection|inhaler|patch|cream|gel|drop|syrup|powder|spray)\b/i);
        const brandMatch    = c.name.match(/\[([^\]]+)\]$/);
        return {
          rxcui:       c.rxcui,
          name:        c.name,
          brandName:   brandMatch?.[1] ?? undefined,
          strength:    strengthMatch?.[1] ?? undefined,
          form:        formMatch?.[1]?.toLowerCase() ?? undefined,
          score:       parseInt(c.score, 10),
        };
      });
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Get full drug details by RxCUI (used for the detail view)
// ─────────────────────────────────────────────────────────────────────────────
export async function getRxNormDetails(rxcui: string) {
  try {
    const [propertiesRes, relatedRes] = await Promise.all([
      fetch(`${RXNORM_BASE}/rxcui/${rxcui}/properties.json`),
      fetch(`${RXNORM_BASE}/rxcui/${rxcui}/related.json?tty=IN+BN`),
    ]);

    const properties    = propertiesRes.ok  ? await propertiesRes.json()  : null;
    const relatedData   = relatedRes.ok     ? await relatedRes.json()     : null;

    const groups: Array<{ tty: string; conceptProperties?: Array<{ rxcui: string; name: string; tty: string }> }> =
      relatedData?.relatedGroup?.conceptGroup ?? [];

    const ingredients: RxNormIngredient[] = groups
      .filter(g => g.tty === 'IN')
      .flatMap(g => g.conceptProperties?.map(p => ({ rxcui: p.rxcui, name: p.name, tty: p.tty })) ?? []);

    const brandEntry = groups.find(g => g.tty === 'BN');
    const brandName  = brandEntry?.conceptProperties?.[0]?.name;

    return {
      rxcui,
      name:     properties?.properties?.name ?? '',
      synonym:  properties?.properties?.synonym ?? '',
      brandName,
      ingredients,
    };
  } catch {
    return null;
  }
}
