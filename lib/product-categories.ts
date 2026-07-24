import CategoryRounded from "@mui/icons-material/CategoryRounded";
import ChildFriendlyRounded from "@mui/icons-material/ChildFriendlyRounded";
import CleaningServicesRounded from "@mui/icons-material/CleaningServicesRounded";
import CoffeeRounded from "@mui/icons-material/CoffeeRounded";
import CookieRounded from "@mui/icons-material/CookieRounded";
import EggRounded from "@mui/icons-material/EggRounded";
import FemaleRounded from "@mui/icons-material/FemaleRounded";
import LiquorRounded from "@mui/icons-material/LiquorRounded";
import LocalDrinkRounded from "@mui/icons-material/LocalDrinkRounded";
import LocalGroceryStoreRounded from "@mui/icons-material/LocalGroceryStoreRounded";
import LocalPharmacyRounded from "@mui/icons-material/LocalPharmacyRounded";
import RestaurantRounded from "@mui/icons-material/RestaurantRounded";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import SetMealRounded from "@mui/icons-material/SetMealRounded";
import SimCardRounded from "@mui/icons-material/SimCardRounded";
import SpaRounded from "@mui/icons-material/SpaRounded";

// Order matters: it drives the deterministic hue spread below and the
// filter-chip/menu ordering everywhere this list is rendered. Keep this in
// sync with the `ProductCategory` enum in prisma/schema.prisma.
export const PRODUCT_CATEGORY_VALUES = [
  "SNACKS",
  "BEVERAGES",
  "COFFEE",
  "ALCOHOL",
  "CONDIMENTS",
  "CANNED_GOODS",
  "GROCERY_STAPLES",
  "DAIRY",
  "PERSONAL_CARE",
  "FEMININE_CARE",
  "BABY_CARE",
  "MEDICINE",
  "HOUSEHOLD",
  "SCHOOL_OFFICE_SUPPLIES",
  "LOAD_AND_PROMO",
  "OTHER",
] as const;

export type ProductCategoryValue = (typeof PRODUCT_CATEGORY_VALUES)[number];

export const DEFAULT_PRODUCT_CATEGORY: ProductCategoryValue = "OTHER";

export function isValidProductCategory(
  value: unknown,
): value is ProductCategoryValue {
  return (
    typeof value === "string" &&
    (PRODUCT_CATEGORY_VALUES as readonly string[]).includes(value)
  );
}

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategoryValue, string> = {
  SNACKS: "Snacks",
  BEVERAGES: "Beverages",
  COFFEE: "Coffee",
  ALCOHOL: "Alcohol",
  CONDIMENTS: "Condiments",
  CANNED_GOODS: "Canned Goods",
  GROCERY_STAPLES: "Grocery Staples",
  DAIRY: "Dairy",
  PERSONAL_CARE: "Personal Care",
  FEMININE_CARE: "Feminine Care",
  BABY_CARE: "Baby Care",
  MEDICINE: "Medicine",
  HOUSEHOLD: "Household",
  SCHOOL_OFFICE_SUPPLIES: "School & Office Supplies",
  LOAD_AND_PROMO: "Load & Promo",
  OTHER: "Other",
};

type IconComponent = typeof CategoryRounded;

export const PRODUCT_CATEGORY_ICONS: Record<ProductCategoryValue, IconComponent> = {
  SNACKS: CookieRounded,
  BEVERAGES: LocalDrinkRounded,
  COFFEE: CoffeeRounded,
  ALCOHOL: LiquorRounded,
  CONDIMENTS: RestaurantRounded,
  CANNED_GOODS: SetMealRounded,
  GROCERY_STAPLES: LocalGroceryStoreRounded,
  DAIRY: EggRounded,
  PERSONAL_CARE: SpaRounded,
  FEMININE_CARE: FemaleRounded,
  BABY_CARE: ChildFriendlyRounded,
  MEDICINE: LocalPharmacyRounded,
  HOUSEHOLD: CleaningServicesRounded,
  SCHOOL_OFFICE_SUPPLIES: SchoolRounded,
  LOAD_AND_PROMO: SimCardRounded,
  OTHER: CategoryRounded,
};

const GOLDEN_ANGLE_DEGREES = 137.508;

function categoryHue(category: ProductCategoryValue): number {
  const index = PRODUCT_CATEGORY_VALUES.indexOf(category);
  return Math.round((index * GOLDEN_ANGLE_DEGREES) % 360);
}

// Deterministic, evenly-distinct hues via the golden angle so all 16
// categories stay visually distinct without hand-picking hex values. OTHER
// is forced to grey since it should read as "unclassified", not as a real
// category.
export function getCategoryColor(
  category: ProductCategoryValue,
  {
    saturation = 60,
    lightness = 45,
  }: { saturation?: number; lightness?: number } = {},
): string {
  if (category === "OTHER") {
    return `hsl(0, 0%, ${lightness}%)`;
  }
  return `hsl(${categoryHue(category)}, ${saturation}%, ${lightness}%)`;
}

export const PRODUCT_CATEGORY_OPTIONS = PRODUCT_CATEGORY_VALUES.map(
  (value) => ({
    value,
    label: PRODUCT_CATEGORY_LABELS[value],
    Icon: PRODUCT_CATEGORY_ICONS[value],
  }),
);
