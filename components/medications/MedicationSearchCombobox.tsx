"use client"

import { useState, useCallback, useRef } from "react"
import { Search, Loader2, X, Pill } from "lucide-react"
import { Input } from "@/components/ui/input"

interface DrugResult {
  rxcui?: string
  name: string
  brandName?: string
  genericName?: string
  strength?: string
  form?: string
  manufacturer?: string
  ingredients?: string
}

interface MedicationSearchComboboxProps {
  onSelect: (drug: DrugResult) => void
  placeholder?: string
}

export function MedicationSearchCombobox({ onSelect, placeholder = "Search medications..." }: MedicationSearchComboboxProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<DrugResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const search = useCallback(async (term: string) => {
    if (!term || term.length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search/rxnorm?q=${encodeURIComponent(term)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.data ?? [])
        setOpen(true)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 350)
  }

  const handleSelect = (drug: DrugResult) => {
    // Show the most meaningful name in the input
    setQuery(drug.brandName && drug.brandName !== drug.name ? `${drug.brandName} (${drug.name})` : drug.name)
    setOpen(false)
    onSelect(drug)
  }

  const handleClear = () => { setQuery(""); setResults([]); setOpen(false) }

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          className="pl-9 pr-9 rounded-xl"
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        ) : query ? (
          <button onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        ) : null}
      </div>

      {open && results.length > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 top-full mt-1.5 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-[0_8px_32px_-4px_rgba(0,0,0,0.15)] max-h-72 overflow-y-auto divide-y divide-gray-50">
            {results.map((drug, idx) => {
              // Headline: brand name if available, else generic/name
              const headline = drug.brandName ?? drug.name
              // Sub-line: generic name (active ingredient) if different from headline
              const subName  = drug.genericName && drug.genericName.toLowerCase() !== headline.toLowerCase()
                ? drug.genericName
                : drug.name !== headline ? drug.name : null

              return (
                <button
                  key={drug.rxcui ?? idx}
                  onClick={() => handleSelect(drug)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3"
                >
                  {/* small icon */}
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center mt-0.5">
                    <Pill className="w-4 h-4 text-violet-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Brand name — bold + strength */}
                    <p className="text-sm font-semibold text-gray-900 leading-tight">
                      {headline}
                      {drug.strength && (
                        <span className="ml-1.5 text-xs font-normal text-gray-500">({drug.strength})</span>
                      )}
                    </p>

                    {/* Generic / active ingredient — italic */}
                    {subName && (
                      <p className="text-xs text-muted-foreground italic mt-0.5 truncate">{subName}</p>
                    )}

                    {/* Manufacturer */}
                    {drug.manufacturer && (
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">{drug.manufacturer}</p>
                    )}

                    {/* Form + RxCUI in one line */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {drug.form && (
                        <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase tracking-wide">
                          {drug.form}
                        </span>
                      )}
                      {drug.rxcui && !drug.rxcui.startsWith("fda-") && (
                        <span className="text-[10px] font-mono text-gray-400">
                          RxCUI {drug.rxcui}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
