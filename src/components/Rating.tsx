import { Star } from 'lucide-react';
import { cn } from '../lib/utils';

export function Rating({ rating, className, size = 12 }: { rating: number; className?: string; size?: number }) {
  return (
    <div className={cn("flex gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          style={{ width: size, height: size }}
          className={cn(
            star <= rating ? "fill-accent text-accent" : "text-text-muted opacity-30"
          )}
        />
      ))}
    </div>
  );
}
