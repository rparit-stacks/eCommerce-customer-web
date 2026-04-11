import React, { useRef, useState, useEffect } from "react";
import { getCategories } from "@/routes/api";
import { useInfiniteData } from "@/hooks/useInfiniteData";
import TabButton from "@/components/custom/TabButton";
import SkeletonTabButton from "@/components/custom/SkeletonTabButton";
import { Category } from "@/types/ApiResponse";
import { useTranslation } from "react-i18next";

interface Props {
  parentSlug: string;
  selectedSubcategory?: string;
  onSelect?: (slug: string) => void;
  onClear?: () => void;
  className?: string;
}

const PER_PAGE = 12;

const SubcategoryTabs: React.FC<Props> = ({
  parentSlug,
  selectedSubcategory = "",
  onSelect,
  onClear,
  className = "",
}) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);

  const {
    data: subcategories,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useInfiniteData<Category>({
    fetcher: getCategories,
    perPage: PER_PAGE,
    extraParams: { slug: parentSlug, scope_category_slug: parentSlug },
    passLocation: true,
    dataKey: `subcategories-tabs-${parentSlug}`,
    forceFetchOnMount: true,
  });

  const handleClick = (slug: string) => {
    if (slug === "all") {
      onClear?.();
    } else {
      onSelect?.(slug);
    }
  };

  const handleSeeMore = () => {
    if (hasMore && !isLoadingMore) loadMore();
  };

  // Shadow logic
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      setShowLeftShadow(el.scrollLeft > 0);
      setShowRightShadow(el.scrollWidth > el.clientWidth + el.scrollLeft);
    };

    handleScroll(); // initialize
    el.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <div
      className={`relative w-full py-2 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20 ${className}`}
      aria-label={t("subcategories")}
    >
      {/* Left shadow */}
      {showLeftShadow && (
        <div
          className="absolute left-0 top-0 bottom-0 w-8 
          bg-linear-to-r from-white via-white/80 to-transparent 
          dark:from-gray-900 dark:via-gray-900/80 pointer-events-none z-10"
        />
      )}

      {/* Right shadow */}
      {showRightShadow && (
        <div
          className="absolute right-0 top-0 bottom-0 w-8 
          bg-linear-to-l from-white via-white/80 to-transparent 
          dark:from-gray-900 dark:via-gray-900/80 pointer-events-none z-10"
        />
      )}

      <div
        ref={scrollRef}
        className="overflow-x-auto no-scrollbar scrollbar-hide py-1"
      >
        <div className="flex gap-3 px-4">
          {/* All */}
          <div className="flex-none">
            <TabButton
              slug="all"
              title={t("all_products")}
              isSelected={!selectedSubcategory}
              onClick={() => handleClick("all")}
              size="lg"
            />
          </div>

          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-none">
                  <SkeletonTabButton size="lg" />
                </div>
              ))
            : subcategories.map((cat) => (
                <div key={cat.id} className="flex-none">
                  <TabButton
                    slug={cat.slug}
                    title={cat.title}
                    isSelected={selectedSubcategory === cat.slug}
                    category={cat}
                    onClick={() => handleClick(cat.slug)}
                    size="lg"
                  />
                </div>
              ))}

          {hasMore && (
            <div className="flex-none">
              <TabButton
                slug="see-more"
                title={isLoadingMore ? t("loading") : t("see_more")}
                isSelected={false}
                isLoading={isLoadingMore}
                onClick={handleSeeMore}
                size="lg"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubcategoryTabs;
