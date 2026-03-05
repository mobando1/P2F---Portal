import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Content area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function TutorCardSkeleton() {
  return (
    <Card className="border-0">
      <CardContent className="p-6">
        {/* Avatar and basic info */}
        <div className="flex items-start space-x-4 mb-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        {/* Languages */}
        <div className="mb-4">
          <Skeleton className="h-4 w-16 mb-2" />
          <div className="flex gap-1">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
        {/* Specialization */}
        <div className="mb-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
        {/* Experience */}
        <div className="mb-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        {/* Book button */}
        <Skeleton className="h-10 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

export function TutorListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <TutorCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PackagesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="text-center space-y-3">
            <Skeleton className="h-6 w-32 mx-auto" />
            <Skeleton className="h-10 w-24 mx-auto" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(5)].map((_, j) => (
              <div key={j} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
            <Skeleton className="h-10 w-full rounded-md mt-4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
