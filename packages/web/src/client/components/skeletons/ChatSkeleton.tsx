import { Skeleton } from '@/components/ui/skeleton';

export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="px-4 py-3 border-b border-sage-200">
        <Skeleton className="h-6 w-32" />
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Assistant message 1 */}
        <div className="flex items-start gap-3">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-[60%]" />
            <Skeleton className="h-4 w-[50%]" />
          </div>
        </div>

        {/* User message 1 */}
        <div className="flex items-start gap-3 justify-end">
          <Skeleton className="h-4 w-[40%]" />
        </div>

        {/* Assistant message 2 */}
        <div className="flex items-start gap-3">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-4 w-[70%]" />
            <Skeleton className="h-4 w-[60%]" />
          </div>
        </div>

        {/* User message 2 */}
        <div className="flex items-start gap-3 justify-end">
          <Skeleton className="h-4 w-[35%]" />
        </div>
      </div>

      {/* Input skeleton */}
      <div className="border-t border-sage-200 p-4">
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}
