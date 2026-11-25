import { Star } from 'lucide-react';
import { cn } from '../lib/utils';

export function Rating({ rating, className, size = 12 }: { rating: number; className?: string; size?: number }) {
  return (
    <div role="img" aria-label={`${rating} out of 5 stars`} className={cn("flex gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          style={{ width: size, height: size }}
          className={cn(
            star <= rating ? "fill-current text-accent-text" : "text-text-muted opacity-30"
          )}
        />
      ))}
    </div>
  );
}
