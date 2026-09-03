import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export const ManagerKpiCard = ({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  iconBg = "bg-primary/10",
  className = "",
  onClick
}) => (
  <Card
    className={`cursor-pointer hover:shadow-md transition-shadow ${className}`}
    onClick={onClick}
  >
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`size-10 rounded-lg ${iconBg} text-primary flex items-center justify-center`}>
          <Icon className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-bold truncate">{value}</p>
        </div>
        {trend !== undefined && trend !== null && (
          <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
            {trend >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      {trendLabel && <p className="text-xs text-muted-foreground mt-1">{trendLabel}</p>}
    </CardContent>
  </Card>
);
