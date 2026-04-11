import { useScreenType } from "@/hooks/useScreenType";
import { trackCategoryView } from "@/lib/analytics";
import { Category } from "@/types/ApiResponse";
import { safeImageSrc } from "@/lib/safeImageSrc";
import { Card, CardBody, Image } from "@heroui/react";
import Link from "next/link";
import { FC, memo } from "react";

interface CategoryCardProps {
  category: Category;
}

const CategoryCard: FC<CategoryCardProps> = ({ category }) => {
  const link = category?.parent_slug
    ? `/categories/${category.parent_slug}?subcategory=${category.slug}`
    : `/categories/${category.slug}`;

  const screen = useScreenType();

  return (
    <div className="flex flex-col items-center w-full min-w-0">
      <div className="w-full max-w-full overflow-hidden flex items-center justify-center">
        <Card
          className="backdrop-blur-sm w-full h-16 sm:h-full p-0 hover:scale-110 transition-transform overflow-hidden flex items-center justify-center"
          shadow="none"
          isPressable={screen !== "mobile"}
          as={Link}
          href={link}
          title={category.title}
          onPress={() =>
            trackCategoryView(category?.id?.toString(), category?.title)
          }
        >
          <CardBody className="flex items-center justify-center p-3 overflow-hidden">
            <Image
              src={safeImageSrc(category.image)}
              alt={category.title}
              className="w-full h-full object-contain max-w-full"
              classNames={{
                img: "rounded-lg max-w-full h-24 object-contain",
              }}
              loading="eager"
            />
          </CardBody>
        </Card>
      </div>
      <div className="h-8 flex items-center w-full min-w-0">
        <h2
          title={category.title}
          className="text-center truncate w-full text-xs font-medium px-1"
        >
          {category.title}
        </h2>
      </div>
    </div>
  );
};

export default memo(CategoryCard);
