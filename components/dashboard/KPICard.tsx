import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: { value: number; label: string }
  colorClass?: string
}

export function KPICard({ title, value, subtitle, icon: Icon, trend, colorClass }: KPICardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorClass ?? "bg-blue-100")}>
            <Icon className={cn("w-5 h-5", colorClass?.includes("blue") ? "text-blue-600" : colorClass?.includes("green") ? "text-green-600" : colorClass?.includes("red") ? "text-red-600" : colorClass?.includes("yellow") ? "text-yellow-600" : "text-blue-600")} />
          </div>
        </div>
        <p className="text-3xl font-bold">{value}</p>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        {trend && (
          <p className={cn("text-xs mt-2", trend.value >= 0 ? "text-green-600" : "text-red-600")}>
            {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

