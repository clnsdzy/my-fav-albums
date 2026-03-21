import { Star } from 'lucide-react';
import { cn } from '../lib/utils';

export function Rating({ rating, className }: { rating: number; className?: string }) {
  return (
    <div className={cn("flex gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-3 w-3",
            star <= rating ? "fill-accent text-accent" : "text-text-muted opacity-30"
          )}
        />
      ))}
    </div>
  );
}
