import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the overview's shape: header, sentence, 2x2 numbers, tabs. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-busy aria-label="Carregando painel">
      <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-13 w-full rounded-lg sm:w-72" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-4/5 max-w-xl" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-31 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-13 w-full rounded-lg lg:hidden" />
      <div className="hidden gap-4 lg:grid lg:grid-cols-4">
        <Skeleton className="col-span-2 h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}
