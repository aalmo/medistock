/**
 * Shared tag color definitions.
 * `css`  — Tailwind classes for React components
 * `email`— Hex colors for inline-styled email templates
 */

export interface TagColorCss    { bg: string; text: string; border: string }
export interface TagColorEmail  { bg: string; text: string; border: string }

export const TAG_CSS: Record<string, TagColorCss> = {
  "Blood Pressure":          { bg: "bg-rose-50",    text: "text-rose-600",   border: "border-rose-200" },
  "Cardiac":                 { bg: "bg-red-50",     text: "text-red-600",    border: "border-red-200" },
  "Diabetes":                { bg: "bg-amber-50",   text: "text-amber-600",  border: "border-amber-200" },
  "Pain Relief":             { bg: "bg-orange-50",  text: "text-orange-600", border: "border-orange-200" },
  "Antibiotic":              { bg: "bg-green-50",   text: "text-green-600",  border: "border-green-200" },
  "Anti-inflammatory":       { bg: "bg-orange-50",  text: "text-orange-600", border: "border-orange-200" },
  "Cholesterol":             { bg: "bg-yellow-50",  text: "text-yellow-700", border: "border-yellow-200" },
  "Thyroid":                 { bg: "bg-teal-50",    text: "text-teal-600",   border: "border-teal-200" },
  "Asthma":                  { bg: "bg-sky-50",     text: "text-sky-600",    border: "border-sky-200" },
  "Anticoagulant":           { bg: "bg-red-50",     text: "text-red-600",    border: "border-red-200" },
  "Antidepressant":          { bg: "bg-purple-50",  text: "text-purple-600", border: "border-purple-200" },
  "Anxiety":                 { bg: "bg-violet-50",  text: "text-violet-600", border: "border-violet-200" },
  "Epilepsy":                { bg: "bg-indigo-50",  text: "text-indigo-600", border: "border-indigo-200" },
  "Osteoporosis":            { bg: "bg-stone-50",   text: "text-stone-600",  border: "border-stone-300" },
  "Vitamin / Supplement":    { bg: "bg-lime-50",    text: "text-lime-600",   border: "border-lime-200" },
  "Allergy":                 { bg: "bg-amber-50",   text: "text-amber-600",  border: "border-amber-200" },
  "Gastric / Acid Reflux":   { bg: "bg-orange-50",  text: "text-orange-600", border: "border-orange-200" },
  "Sleep":                   { bg: "bg-indigo-50",  text: "text-indigo-600", border: "border-indigo-200" },
  "Blood Thinner":           { bg: "bg-rose-50",    text: "text-rose-600",   border: "border-rose-200" },
  "Immunosuppressant":       { bg: "bg-blue-50",    text: "text-blue-600",   border: "border-blue-200" },
  "Airway Opener":           { bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-200" },
  "Lung Scarring":           { bg: "bg-slate-50",   text: "text-slate-600",  border: "border-slate-300" },
  "Water Pill":              { bg: "bg-cyan-50",    text: "text-cyan-700",   border: "border-cyan-200" },
  "Blood Pressure Lowerer":  { bg: "bg-pink-50",    text: "text-pink-700",   border: "border-pink-200" },
  "Chest Pain Preventer":    { bg: "bg-orange-50",  text: "text-orange-600", border: "border-orange-200" },
  "Kidney Protector":        { bg: "bg-cyan-50",    text: "text-cyan-600",   border: "border-cyan-200" },
  "Blood Sugar Controller":  { bg: "bg-lime-50",    text: "text-lime-700",   border: "border-lime-200" },
  "Insulin Helper":          { bg: "bg-violet-50",  text: "text-violet-600", border: "border-violet-200" },
  "Inhaled Swelling Reducer":{ bg: "bg-emerald-50", text: "text-emerald-700",border: "border-emerald-200" },
}

export const DEFAULT_TAG_CSS: TagColorCss = { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" }

export const TAG_EMAIL: Record<string, TagColorEmail> = {
  "Blood Pressure":          { bg: "#fff1f2", text: "#e11d48", border: "#fecdd3" },
  "Cardiac":                 { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  "Diabetes":                { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  "Pain Relief":             { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
  "Antibiotic":              { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  "Anti-inflammatory":       { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
  "Cholesterol":             { bg: "#fefce8", text: "#a16207", border: "#fef08a" },
  "Thyroid":                 { bg: "#f0fdfa", text: "#0d9488", border: "#99f6e4" },
  "Asthma":                  { bg: "#f0f9ff", text: "#0284c7", border: "#bae6fd" },
  "Anticoagulant":           { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  "Antidepressant":          { bg: "#faf5ff", text: "#9333ea", border: "#e9d5ff" },
  "Anxiety":                 { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" },
  "Epilepsy":                { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
  "Osteoporosis":            { bg: "#fafaf9", text: "#78716c", border: "#d6d3d1" },
  "Vitamin / Supplement":    { bg: "#f7fee7", text: "#65a30d", border: "#d9f99d" },
  "Allergy":                 { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  "Gastric / Acid Reflux":   { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
  "Sleep":                   { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
  "Blood Thinner":           { bg: "#fff1f2", text: "#e11d48", border: "#fecdd3" },
  "Immunosuppressant":       { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  "Airway Opener":           { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  "Lung Scarring":           { bg: "#f8fafc", text: "#475569", border: "#cbd5e1" },
  "Water Pill":              { bg: "#ecfeff", text: "#0e7490", border: "#a5f3fc" },
  "Blood Pressure Lowerer":  { bg: "#fdf2f8", text: "#be185d", border: "#fbcfe8" },
  "Chest Pain Preventer":    { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
  "Kidney Protector":        { bg: "#ecfeff", text: "#0891b2", border: "#a5f3fc" },
  "Blood Sugar Controller":  { bg: "#f7fee7", text: "#4d7c0f", border: "#d9f99d" },
  "Insulin Helper":          { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" },
  "Inhaled Swelling Reducer":{ bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
}

export const DEFAULT_TAG_EMAIL: TagColorEmail = { bg: "#f8fafc", text: "#475569", border: "#cbd5e1" }
