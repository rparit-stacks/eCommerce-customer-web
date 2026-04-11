import { Skeleton } from "@heroui/react";
import { FC } from "react";

const CategoryCardSkeleton: FC = () => {
  return (
    <div className="flex flex-col items-center">
      <Skeleton className="aspect-square w-full h-full rounded-lg animate-pulse" />
      <Skeleton className="w-3/4 h-4 mt-2 rounded animate-pulse" />
    </div>
  );
};

export default CategoryCardSkeleton;
