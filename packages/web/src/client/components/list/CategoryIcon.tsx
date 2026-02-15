/**
 * Category Icon Component
 *
 * Maps item categories to emoji icons for visual distinction
 */

interface CategoryIconProps {
  category: string | null;
  className?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  produce: "🥬",
  dairy: "🥛",
  meat: "🥩",
  seafood: "🐟",
  bakery: "🍞",
  pantry: "🥫",
  frozen: "❄️",
  beverages: "🥤",
  snacks: "🍿",
  condiments: "🧂",
  spices: "🌶️",
  grains: "🌾",
  other: "📦",
};

export function CategoryIcon({ category, className = "" }: CategoryIconProps) {
  const normalizedCategory = category?.toLowerCase() || "other";
  const icon = CATEGORY_ICONS[normalizedCategory] || CATEGORY_ICONS.other;

  return (
    <span className={`text-2xl ${className}`} role="img" aria-label={category || "other"}>
      {icon}
    </span>
  );
}

/**
 * Get category icon emoji (utility function)
 */
export function getCategoryIcon(category: string | null): string {
  const normalizedCategory = category?.toLowerCase() || "other";
  return CATEGORY_ICONS[normalizedCategory] || CATEGORY_ICONS.other;
}

/**
 * Get all available categories with icons
 */
export function getAllCategories(): Array<{ name: string; icon: string }> {
  return Object.entries(CATEGORY_ICONS).map(([name, icon]) => ({
    name,
    icon,
  }));
}
