import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export function EmptyList() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-pixie-sage-50 dark:bg-pixie-dusk-200 flex items-center justify-center mb-5">
        <Sparkles className="w-7 h-7 text-pixie-sage-400 dark:text-pixie-glow-sage animate-sparkle" />
      </div>
      <p className="text-sm text-pixie-charcoal-200 dark:text-pixie-mist-200 max-w-[260px] leading-relaxed">
        Your pantry is a blank canvas. Chat with Pixie to add your first item.
      </p>
      <Link
        to="/chat"
        className="mt-5 text-sm font-medium text-pixie-sage-600 dark:text-pixie-glow-sage hover:underline"
      >
        Go to Chat
      </Link>
    </div>
  );
}
