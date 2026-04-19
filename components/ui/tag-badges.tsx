"use client"

import {
  Heart, Wind, Droplets, Syringe, Zap, Package, FlaskConical,
  Activity, Brain, Sun, Moon, Leaf, Flame, Shield,
} from "lucide-react"
import { TAG_CSS, DEFAULT_TAG_CSS } from "@/lib/tag-colors"

const TAG_ICONS: Record<string, React.ElementType> = {
  "Blood Pressure":          Heart,
  "Cardiac":                 Heart,
  "Diabetes":                Droplets,
  "Pain Relief":             Zap,
  "Antibiotic":              FlaskConical,
  "Anti-inflammatory":       Flame,
  "Cholesterol":             Activity,
  "Thyroid":                 Activity,
  "Asthma":                  Wind,
  "Anticoagulant":           Droplets,
  "Antidepressant":          Brain,
  "Anxiety":                 Brain,
  "Epilepsy":                Zap,
  "Osteoporosis":            Shield,
  "Vitamin / Supplement":    Sun,
  "Allergy":                 Leaf,
  "Gastric / Acid Reflux":   FlaskConical,
  "Sleep":                   Moon,
  "Blood Thinner":           Droplets,
  "Immunosuppressant":       Shield,
  "Airway Opener":           Wind,
  "Lung Scarring":           Activity,
  "Water Pill":              Droplets,
  "Blood Pressure Lowerer":  Heart,
  "Chest Pain Preventer":    Heart,
  "Kidney Protector":        Shield,
  "Blood Sugar Controller":  Activity,
  "Insulin Helper":          Syringe,
  "Inhaled Swelling Reducer":Wind,
}

interface TagBadgesProps {
  /** Raw tag keys (e.g. "Blood Pressure") */
  tags: string[]
  /** Translated labels map from t.tagLabels */
  labels: Record<string, string>
  className?: string
}

export function TagBadges({ tags, labels, className = "" }: TagBadgesProps) {
  if (tags.length === 0) return null
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {tags.map(tag => {
        const c    = TAG_CSS[tag] ?? DEFAULT_TAG_CSS
        const Icon = TAG_ICONS[tag] ?? Package
        return (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${c.bg} ${c.text} ${c.border}`}
          >
            <Icon className="h-2.5 w-2.5" />
            {labels[tag] ?? tag}
          </span>
        )
      })}
    </div>
  )
}
