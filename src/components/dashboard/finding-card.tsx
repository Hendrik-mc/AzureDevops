import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FindingItem } from "@/types/dashboard";

interface FindingCardProps {
  finding: FindingItem;
}

function getSeverityVariant(severity: string) {
  switch (severity) {
    case "critical": return "critical" as const;
    case "high": return "high" as const;
    case "medium": return "medium" as const;
    case "low": return "low" as const;
    default: return "info" as const;
  }
}

export function FindingCard({ finding }: FindingCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={getSeverityVariant(finding.severity)}>
                {finding.severity}
              </Badge>
              <Badge variant="outline">{finding.source}</Badge>
              <Badge variant="secondary">{finding.category}</Badge>
            </div>
            <h4 className="font-medium text-sm">{finding.title}</h4>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {finding.description}
            </p>
          </div>
          <div className="text-xs text-muted-foreground shrink-0">
            {finding.status}
          </div>
        </div>
        {finding.evidence && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            <span>API: {finding.evidence.apiSource}</span>
            {finding.evidence.lastRefreshed && (
              <span className="ml-3">Last checked: {finding.evidence.lastRefreshed}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
