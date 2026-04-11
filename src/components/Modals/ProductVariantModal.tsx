import { FC, useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Image,
  Chip,
  addToast,
  ScrollShadow,
  Divider,
} from "@heroui/react";
import { ShoppingCart, Plus, Minus, Star, Users } from "lucide-react";
import RatingStars from "../RatingStars";
import { Product, ProductVariant } from "@/types/ApiResponse";
import { useSettings } from "@/contexts/SettingsContext";
import {
  handleAddToCart,
  handleOfflineAddToCart,
} from "@/helpers/functionalHelpers";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/lib/redux/store";
import { addRecentlyViewed } from "@/lib/redux/slices/recentlyViewedSlice";
import { trackProductView } from "@/lib/analytics";
const Lightbox = dynamic(() => import("yet-another-react-lightbox"), {
  ssr: false,
});

interface ProductVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

const ProductVariantModal: FC<ProductVariantModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const { currencySymbol, systemSettings } = useSettings();
  const dispatch = useDispatch();
  const [isLightboxOpen, setLightboxOpen] = useState(false);

  // Number of users who have this product in their cart
  const cartCount = Number(product.item_count_in_cart) || 0;

  const [loadingVariantId, setLoadingVariantId] = useState<number | null>(null);
  const [variantQuantities, setVariantQuantities] = useState<
    Record<number, number>
  >({});

  const { t } = useTranslation();
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);

  // Initialize quantities for each variant
  useEffect(() => {
    if (product.variants && product.variants.length > 0) {
      const initialQuantities: Record<number, number> = {};
      product.variants.forEach((variant) => {
        initialQuantities[variant.id] = product.minimum_order_quantity || 1;
      });
      setVariantQuantities(initialQuantities);
    }
    setLightboxOpen(false);

    // Track recently viewed when modal opens
    if (isOpen && product) {
      dispatch(addRecentlyViewed(product));

      // Track product view analytics
      trackProductView(
        product.id.toString(),
        product.title,
        product.category_name,
        product.variants?.[0]?.price
      );
    }
  }, [product, isOpen, dispatch]);

  const lowStockLimitRaw = Number(systemSettings?.lowStockLimit);
  const lowStockLimit =
    Number.isNaN(lowStockLimitRaw) || lowStockLimitRaw <= 0
      ? null
      : lowStockLimitRaw;

  const isLowStock = (stock: number) =>
    lowStockLimit !== null && stock > 0 && stock <= lowStockLimit;

  const minQuantity = product.minimum_order_quantity || 1;
  const stepSize = product.quantity_step_size || 1;

  const handleQuantityChange = (variantId: number, change: number) => {
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) return;

    const currentQuantity = variantQuantities[variantId] || minQuantity;
    const newQuantity = currentQuantity + change;
    const maxQuantity = Math.min(
      product.total_allowed_quantity || 9999,
      variant.stock
    );

    if (newQuantity > variant.stock) {
      addToast({
        title: t("stock_limit_error_title"),
        description: t("stock_limit_error_description", {
          stock: variant.stock,
        }),
        color: "danger",
      });
      return;
    }

    if (newQuantity < minQuantity) {
      addToast({
        title: t("min_quantity_error_title"),
        description: t("min_quantity_error_description", {
          min: minQuantity,
        }),
        color: "danger",
      });
      return;
    }

    if (newQuantity > maxQuantity) {
      addToast({
        title: t("max_quantity_error_title"),
        description: t("max_quantity_error_description", {
          max: maxQuantity,
        }),
        color: "danger",
      });
      return;
    }

    if ((newQuantity - minQuantity) % stepSize !== 0) {
      addToast({
        title: t("step_error_title"),
        description: t("step_error_description", { step: stepSize }),
        color: "danger",
      });
      return;
    }

    setVariantQuantities((prev) => ({
      ...prev,
      [variantId]: newQuantity,
    }));
  };

  const handleAddToCartFn = async (variant: ProductVariant) => {
    setLoadingVariantId(variant.id);
    const quantity = variantQuantities[variant.id] || minQuantity;

    try {
      if (isLoggedIn) {
        await handleAddToCart({
          product_variant_id: variant.id,
          store_id: variant.store_id,
          quantity: quantity,
          onClose: onClose,
          renderToast: true,
        });
      } else {
        handleOfflineAddToCart({
          product,
          variant,
          quantity,
          onClose,
        });
      }
    } catch (error) {
      console.error("Add to cart failed:", error);
    } finally {
      setLoadingVariantId(null);
    }
  };

  const getVariantPrice = (variant: ProductVariant) => {
    const price = Number(variant?.price) || 0;
    const specialPrice = Number(variant?.special_price) || 0;
    return specialPrice > 0 && specialPrice < price ? specialPrice : price;
  };

  const getDiscountPercentage = (variant: ProductVariant) => {
    const price = Number(variant?.price) || 0;
    const specialPrice = Number(variant?.special_price) || 0;
    const hasDiscount = specialPrice > 0 && specialPrice < price;
    return hasDiscount ? Math.round(((price - specialPrice) / price) * 100) : 0;
  };

  const hasDiscount = (variant: ProductVariant) => {
    const price = Number(variant?.price) || 0;
    const specialPrice = Number(variant?.special_price) || 0;
    return specialPrice > 0 && specialPrice < price;
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="2xl"
        placement="bottom-center"
        backdrop="blur"
        classNames={{
          backdrop: "bg-black/60 backdrop-blur-sm",
        }}
        scrollBehavior="inside"
      >
        <ModalContent className="max-w-md mx-auto">
          <ModalHeader>
            <h2>{t("product_modal.add_to_cart_title")}</h2>
          </ModalHeader>

          <ModalBody className="space-y-4">
            <div className="grid grid-cols-[35%_65%] gap-4">
              <div className="flex items-center flex-col bg-gray-100 dark:bg-inherit rounded-lg relative">
                {product.main_image ? (
                  <>
                    <Image
                      src={product.main_image}
                      alt={product.title ?? t("product_modal.untitled")}
                      classNames={{
                        wrapper:
                          "w-full h-32 p-0.5 flex justify-center cursor-pointer",
                        img: "w-full h-full object-contain",
                      }}
                      onClick={() => setLightboxOpen(true)}
                    />
                  </>
                ) : (
                  <div className="w-full h-32 bg-gray-300 rounded-md" />
                )}
              </div>
              <div className="flex items-start flex-col">
                <div className="space-y-1 flex flex-col">
                  <div className="flex w-full items-center gap-4">
                    {product.category_name && (
                      <Link
                        href={`/categories/${product.category}`}
                        className="text-xxs text-foreground/80 uppercase tracking-wider font-medium"
                        title={product.category_name}
                      >
                        {product.category_name}
                      </Link>
                    )}
                    {product.featured == "1" && (
                      <Chip
                        className="text-xxs bg-linear-to-r from-secondary-300 to-secondary-400 capitalize text-white font-semibold shadow-sm tracking-wide mb-1"
                        classNames={{
                          base: "p-0.5 h-4",
                          content: "p-1 text-xxs",
                        }}
                        radius="sm"
                        startContent={
                          <Star size={10} className="fill-current" />
                        }
                        title={t("featured")}
                      >
                        {t("featured")}
                      </Chip>
                    )}
                  </div>
                  <Link
                    href={`/products/${product?.slug ?? ""}`}
                    className="text-lg font-bold leading-tight"
                    title={product.title || ""}
                  >
                    {product.title ?? t("product_modal.untitled")}
                  </Link>

                  {/* Social Proof - Cart Count */}
                  {cartCount > 0 && (
                    <div className="flex items-center gap-1.5 py-1">
                      <Chip
                        className="text-xxs bg-linear-to-r from-orange-500 to-red-500 text-white font-semibold shadow-sm"
                        classNames={{
                          base: "h-5 px-2",
                          content: "px-1 text-xxs flex items-center gap-1",
                        }}
                        radius="sm"
                        startContent={<Users size={11} className="shrink-0" />}
                      >
                        {cartCount > 99 ? "99+" : cartCount}{" "}
                        {t("product_modal.in_cart")}
                      </Chip>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between py-2 gap-4">
                  {product.ratings !== undefined && (
                    <div className="flex items-center gap-1">
                      <RatingStars rating={Number(product.ratings)} size={14} />
                      <span className="text-xs text-foreground/50 ml-1">
                        ({product.ratings})
                      </span>
                    </div>
                  )}
                  {product.brand_name && (
                    <Link
                      href={`/brands/${product.brand}`}
                      className="text-primary text-xs  font-semibold"
                      title={product.brand_name}
                    >
                      {product.brand_name}
                    </Link>
                  )}
                </div>
                {product?.short_description && (
                  <ScrollShadow
                    className="text-xs text-foreground/50 max-h-16"
                    title={product.short_description}
                  >
                    {product.short_description}
                  </ScrollShadow>
                )}
              </div>
            </div>

            {/* Variant Selection with Individual Add Buttons */}
            <div className="space-y-3">
              <div className="flex w-full justify-between">
                <h3 className="text-sm font-semibold text-foreground/50">
                  {t("product_modal.select_options")}
                </h3>
                <h3 className="text-sm font-semibold text-foreground/50">
                  {t("choices", { count: product.variants.length })}
                </h3>
              </div>

              <ScrollShadow className="space-y-3 h-[40vh] pr-2 pb-2">
                {product.variants.map((variant) => {
                  const variantPrice = getVariantPrice(variant);
                  const originalPrice = Number(variant?.price) || 0;
                  const discountPercentage = getDiscountPercentage(variant);
                  const quantity = variantQuantities[variant.id] || minQuantity;
                  const totalPrice = variantPrice * quantity;

                  return (
                    <div
                      key={variant.id}
                      className="border rounded-lg p-3 space-y-3 border-gray-200 dark:border-gray-700"
                    >
                      {/* Variant Info */}
                      <div className="flex items-center gap-3">
                        {variant.image ? (
                          <Image
                            src={variant.image}
                            alt={variant.title}
                            className="w-16 h-16 object-contain rounded-md"
                          />
                        ) : (
                          <>
                            {product.main_image ? (
                              <Image
                                src={product.main_image}
                                alt={variant.title}
                                className="w-16 h-16  object-contain rounded-md"
                              />
                            ) : (
                              <div className="w-16 h-16 flex items-center justify-center bg-gray-200 rounded-md text-gray-500 font-medium">
                                {t("na")}
                              </div>
                            )}
                          </>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-semibold">
                              {variant.title}
                            </h4>
                            {hasDiscount(variant) && (
                              <Chip
                                className="font-medium"
                                classNames={{
                                  content: "text-xxs sm:text-xxs",
                                  base: "h-4 px-1",
                                }}
                                color="primary"
                                size="sm"
                                radius="sm"
                              >
                                {t("product_modal.discount_percent", {
                                  percent: discountPercentage,
                                })}
                              </Chip>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-bold">
                              {currencySymbol}
                              {variantPrice.toFixed(2)}
                            </span>
                            {hasDiscount(variant) && (
                              <span className="text-xxs sm:text-xs text-foreground/50 line-through">
                                {currencySymbol}
                                {originalPrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 mt-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-foreground/50">
                                {t("product_modal.stock", {
                                  stock: variant.stock,
                                })}
                              </p>
                              <Divider orientation="vertical" />
                              <p className="text-xs text-foreground/50">
                                {t("product_modal.sku", { sku: variant.sku })}
                              </p>
                            </div>
                            {isLowStock(variant.stock) && (
                              <span className="text-xxs text-orange-500 font-semibold">
                                {t("product_modal.low_stock_alert", {
                                  stock: variant.stock,
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quantity Controls and Add Button */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-foreground/50 hidden sm:block">
                            {t("product_modal.qty")}:
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="flat"
                              isDisabled={
                                loadingVariantId === variant.id ||
                                variant.stock === 0
                              }
                              onPress={() =>
                                handleQuantityChange(variant.id, -stepSize)
                              }
                              className="w-7 h-7 min-w-7"
                            >
                              <Minus size={12} />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">
                              {quantity}
                            </span>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="flat"
                              isDisabled={
                                loadingVariantId === variant.id ||
                                variant.stock === 0
                              }
                              onPress={() =>
                                handleQuantityChange(variant.id, stepSize)
                              }
                              className="w-7 h-7 min-w-7"
                            >
                              <Plus size={12} />
                            </Button>
                          </div>
                        </div>

                        {product.store_status.is_open ? (
                          <Button
                            color="primary"
                            size="sm"
                            onPress={() => handleAddToCartFn(variant)}
                            isDisabled={variant.stock === 0}
                            isLoading={loadingVariantId === variant.id}
                            startContent={
                              loadingVariantId !== variant.id && (
                                <ShoppingCart
                                  size={14}
                                  className="hidden sm:block"
                                />
                              )
                            }
                            className="text-xs px-2 sm:px-4"
                          >
                            {variant.stock === 0
                              ? t("product_modal.out_of_stock")
                              : `${t("product_modal.add_to_cart_title")} • ${
                                  currencySymbol + totalPrice.toFixed(2)
                                }`}
                          </Button>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="text-orange-500 font-medium text-xs sm:text-sm">
                              {t("store_closed")}
                            </span>
                            {product.store_status?.next_opening_time && (
                              <span className="text-xxs text-foreground/60">
                                {t("opens_at", {
                                  time: product.store_status.next_opening_time,
                                })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </ScrollShadow>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button
              variant="bordered"
              onPress={onClose}
              className="w-full text-sm hidden"
              size="sm"
              isDisabled={loadingVariantId !== null}
            >
              {t("product_modal.cancel")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {isLightboxOpen && (
        <Lightbox
          open={isLightboxOpen}
          close={() => setLightboxOpen(false)}
          slides={[{ src: product.main_image }]}
        />
      )}
    </>
  );
};

export default ProductVariantModal;
