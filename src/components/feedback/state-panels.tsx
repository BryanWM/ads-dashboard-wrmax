import { CircleAlertIcon, InboxIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

interface StatePanelProps {
  title: string;
  description?: ReactNode;
  /** Primary action, e.g. "Conectar conta" or "Tentar novamente". */
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/** No data yet / nothing matches the filters. Explains why and what to do next. */
export function EmptyState({ title, description, action, icon, className }: StatePanelProps) {
  return (
    <Empty className={cn("border border-dashed", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon ?? <InboxIcon />}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}

/** A section failed to load. The rest of the page keeps working. */
export function ErrorState({ title, description, action, icon, className }: StatePanelProps) {
  return (
    <Empty role="alert" className={cn("border border-critical/20 bg-critical/3", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-critical/10 text-critical">
          {icon ?? <CircleAlertIcon />}
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}
