"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Search, Loader2, X, Pill, Globe } from "lucide-react"
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
  emaProductNumber?: string
  atcCode?: string
}

interface MedicationSearchComboboxProps {
  onSelect: (drug: DrugResult) => void
  placeholder?: string
}

export function MedicationSearchCombobox({ onSelect, placeholder = "Search medications..." }: MedicationSearchComboboxProps) {
  const [query,    setQuery]    = useState("")
  const [results,  setResults]  = useState<DrugResult[]>([])
  const [loading,  setLoading]  = useState(false)
  const [open,     setOpen]     = useState(false)
  const [dbPref,   setDbPref]   = useState<"us" | "eu">("us")
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Load user's database preference from settings
  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => {
        if (d.data?.drugDatabase) setDbPref(d.data.drugDatabase)
      })
      .catch(() => {})
  }, [])

  const search = useCallback(async (term: string, db: "us" | "eu") => {
    if (!term || term.length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const endpoint = db === "eu"
        ? `/api/search/ema?q=${encodeURIComponent(term)}`
        : `/api/search/rxnorm?q=${encodeURIComponent(term)}`
      const res = await fetch(endpoint)
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
    debounceRef.current = setTimeout(() => search(value, dbPref), 350)
  }

  const handleDbToggle = () => {
    const next = dbPref === "us" ? "eu" : "us"
    setDbPref(next)
    if (query.length >= 2) {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => search(query, next), 100)
    }
  }

  const handleSelect = (drug: DrugResult) => {
    setQuery(drug.brandName && drug.brandName !== drug.name
      ? `${drug.brandName} (${drug.name})`
      : drug.name)
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
          className="pl-9 pr-24 rounded-xl"
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {/* DB toggle badge */}
        <button
          type="button"
          onClick={handleDbToggle}
          title={dbPref === "us" ? "Using US database (RxNorm/FDA) — click to switch to EU (ChEMBL/EMBL-EBI)" : "Using EU database (ChEMBL/EMBL-EBI) — click to switch to US (RxNorm/FDA)"}
          className={`absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
            dbPref === "eu"
              ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Globe className="h-2.5 w-2.5" />
          {dbPref === "eu" ? "EU" : "US"}
        </button>

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
            {/* Database source header */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
              dbPref === "eu" ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-500"
            }`}>
              <Globe className="h-3 w-3" />
              {dbPref === "eu" ? "EU — ChEMBL / EMBL-EBI Database" : "US — RxNorm / openFDA Database"}
            </div>

            {results.map((drug, idx) => {
              const headline = drug.brandName ?? drug.name
              const subName  = drug.genericName && drug.genericName.toLowerCase() !== headline.toLowerCase()
                ? drug.genericName
                : drug.name !== headline ? drug.name : null

              return (
                <button
                  key={drug.rxcui ?? drug.emaProductNumber ?? idx}
                  onClick={() => handleSelect(drug)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3"
                >
                  <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${
                    dbPref === "eu" ? "bg-blue-50" : "bg-violet-50"
                  }`}>
                    <Pill className={`w-4 h-4 ${dbPref === "eu" ? "text-blue-500" : "text-violet-500"}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">
                      {headline}
                      {drug.strength && (
                        <span className="ml-1.5 text-xs font-normal text-gray-500">({drug.strength})</span>
                      )}
                    </p>
                    {subName && (
                      <p className="text-xs text-muted-foreground italic mt-0.5 truncate">{subName}</p>
                    )}
                    {drug.manufacturer && (
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">{drug.manufacturer}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {drug.form && (
                        <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase tracking-wide">
                          {drug.form}
                        </span>
                      )}
                      {drug.atcCode && (
                        <span className="text-[10px] font-mono bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">
                          ATC {drug.atcCode}
                        </span>
                      )}
                      {drug.rxcui && !drug.rxcui.startsWith("fda-") && (
                        <span className="text-[10px] font-mono text-gray-400">
                          RxCUI {drug.rxcui}
                        </span>
                      )}
                      {drug.emaProductNumber && (
                        <span className="text-[10px] font-mono text-blue-400">
                          EMA {drug.emaProductNumber}
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
