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
} from "@heroui/react";
import { ShoppingCart, Plus, Minus, Star, Users } from "lucide-react";
import RatingStars from "../RatingStars";
import { Product, ProductVariant } from "@/types/ApiResponse";
import AttributeSelector from "../Functional/AttributeSelector";
import { useSettings } from "@/contexts/SettingsContext";
import {
  handleAddToCart,
  handleOfflineAddToCart,
} from "@/helpers/functionalHelpers";
import ProductVariantModal from "./ProductVariantModal";
import { useTranslation } from "react-i18next";
import Lightbox from "yet-another-react-lightbox";
import Link from "next/link";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/lib/redux/store";
import { addRecentlyViewed } from "@/lib/redux/slices/recentlyViewedSlice";
import { trackProductView } from "@/lib/analytics";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

const SimpleProductModal: FC<ProductModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const { currencySymbol, systemSettings } = useSettings();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const cartData = useSelector((state: RootState) => state.cart.cartData);
  const [isLightboxOpen, setLightboxOpen] = useState(false);

  // Number of users who have this product in their cart
  const cartCount = Number(product.item_count_in_cart) || 0;

  const [quantity, setQuantity] = useState(
    product?.minimum_order_quantity || 1
  );
  const [selectedAttributes, setSelectedAttributes] = useState<
    Record<string, string>
  >({});
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product.variants && product.variants.length > 0) {
      const defaultVariant =
        product.variants.find((v) => v.is_default) || product.variants[0];

      if (defaultVariant) {
        setSelectedVariant(defaultVariant);
        setSelectedAttributes(defaultVariant.attributes || {});

        // Prefill quantity from cart if exists
        const cartItem = cartData?.items?.find(
          (item) => item.product_variant_id === defaultVariant.id
        );
        setQuantity(cartItem?.quantity || product?.minimum_order_quantity || 1);
      }
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
        selectedVariant?.price || product.variants?.[0]?.price
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, isOpen, cartData, dispatch]);

  useEffect(() => {
    if (product.variants && Object.keys(selectedAttributes).length > 0) {
      const matchingVariant = product.variants.find((variant) => {
        return Object.entries(selectedAttributes).every(([key, value]) => {
          return variant.attributes && variant.attributes[key] === value;
        });
      });

      if (matchingVariant) {
        setSelectedVariant(matchingVariant);

        // Prefill quantity from cart for the new variant
        const cartItem = cartData?.items?.find(
          (item) => item.product_variant_id === matchingVariant.id
        );
        const newQuantity =
          cartItem?.quantity || product?.minimum_order_quantity || 1;
        setQuantity(() => Math.min(newQuantity, matchingVariant.stock));
      }
    }
  }, [selectedAttributes, cartData, product]);

  if (!selectedVariant) return null;

  const handleAttributeChange = (attributeSlug: string, value: string) => {
    setSelectedAttributes((prev) => ({
      ...prev,
      [attributeSlug]: value,
    }));
  };

  const lowStockLimitRaw = Number(systemSettings?.lowStockLimit);
  const lowStockLimit =
    Number.isNaN(lowStockLimitRaw) || lowStockLimitRaw <= 0
      ? null
      : lowStockLimitRaw;

  const isLowStock = (stock: number) =>
    lowStockLimit !== null && stock > 0 && stock <= lowStockLimit;

  const minQuantity = product.minimum_order_quantity || 1;
  const maxQuantity = Math.min(
    product.total_allowed_quantity || 9999,
    selectedVariant.stock
  );
  const stepSize = product.quantity_step_size || 1;

  const handleQuantityDecrease = () => {
    const newQuantity = quantity - stepSize;

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

    if ((newQuantity - minQuantity) % stepSize !== 0) {
      addToast({
        title: t("step_error_title"),
        description: t("step_error_description", { step: stepSize }),
        color: "danger",
      });
      return;
    }

    setQuantity(Math.max(newQuantity, minQuantity));
  };

  const handleQuantityIncrease = () => {
    const newQuantity = quantity + stepSize;

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

    if (newQuantity > selectedVariant.stock) {
      addToast({
        title: t("stock_limit_error_title"),
        description: t("stock_limit_error_description", {
          stock: selectedVariant.stock,
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

    setQuantity(Math.min(newQuantity, maxQuantity, selectedVariant.stock));
  };

  const AddToCart = async () => {
    setLoading(true);
    try {
      if (isLoggedIn) {
        await handleAddToCart({
          product_variant_id: selectedVariant.id,
          store_id: selectedVariant.store_id,
          quantity: quantity,
          onClose: onClose,
          renderToast: true,
        });
      } else {
        handleOfflineAddToCart({
          product,
          variant: selectedVariant,
          quantity,
          onClose,
        });
      }
    } catch (error) {
      console.error("Add to cart failed:", error);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const price = Number(selectedVariant?.price) || 0;
  const specialPrice = Number(selectedVariant?.special_price) || 0;

  const hasDiscount = specialPrice > 0 && specialPrice < price;
  const finalPrice = hasDiscount ? specialPrice : price;
  const totalPrice = finalPrice * quantity;
  const savings = hasDiscount ? (price - specialPrice) * quantity : 0;
  const discountPercentage = hasDiscount
    ? Math.round(((price - specialPrice) / price) * 100)
    : 0;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      backdrop="blur"
      classNames={{
        backdrop: "bg-black/60 backdrop-blur-sm",
      }}
      placement="bottom-center"
      // scrollBehavior="inside"
    >
      <ModalContent className="max-w-md mx-auto">
        <ModalHeader>
          <h2>{t("product_modal.add_to_cart_title")}</h2>
        </ModalHeader>

        <ModalBody className="space-y-4">
          <div className="grid grid-cols-[35%_65%] gap-4">
            <div className="flex items-center flex-col bg-gray-100 dark:bg-inherit rounded-lg relative">
              {selectedVariant.image || product.main_image ? (
                <>
                  <Image
                    src={selectedVariant.image || product.main_image}
                    alt={product.title ?? t("product_modal.untitled")}
                    classNames={{
                      wrapper:
                        "w-full h-32 p-0.5 flex justify-center cursor-pointer",
                      img: "w-full h-full object-contain",
                    }}
                    onClick={() => setLightboxOpen(true)}
                  />
                  {isLightboxOpen && (
                    <Lightbox
                      open={isLightboxOpen}
                      close={() => setLightboxOpen(false)}
                      slides={[
                        { src: selectedVariant.image || product.main_image },
                      ]}
                    />
                  )}
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
                      startContent={<Star size={10} className="fill-current" />}
                      title={t("featured")}
                    >
                      {t("featured")}
                    </Chip>
                  )}
                </div>
                <Link
                  href={`/products/${product?.slug ?? ""}`}
                  title={product.title ?? t("product_modal.untitled")}
                  className="text-lg font-bold leading-tight"
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
              {product.short_description && (
                <p
                  className="text-xs text-foreground/50 leading-relaxed"
                  title={product.short_description}
                >
                  {product.short_description}
                </p>
              )}
            </div>
          </div>

          {product.variants &&
            product.variants.length > 1 &&
            product.attributes && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground/50">
                  {t("product_modal.select_options")}
                </h3>
                {product.attributes.map((attribute) => (
                  <AttributeSelector
                    key={attribute.slug}
                    attribute={attribute}
                    selectedAttributes={selectedAttributes}
                    onChange={handleAttributeChange}
                  />
                ))}
              </div>
            )}

          <div className="flex items-center justify-between text-xxs sm:text-xs">
            <div className="flex flex-col">
              <span className="text-foreground/50">
                {t("product_modal.stock", { stock: selectedVariant.stock })}
              </span>
              {(minQuantity > 1 || stepSize > 1) && (
                <span className="text-foreground/50 text-xs">
                  {t("product_modal.constraints", {
                    min: minQuantity,
                    step: stepSize,
                  })}
                </span>
              )}
              {isLowStock(selectedVariant.stock) && (
                <span className="text-xs text-orange-500 font-medium">
                  {t("product_modal.low_stock_alert", {
                    stock: selectedVariant.stock,
                  })}
                </span>
              )}
            </div>
            {selectedVariant.sku && (
              <span className="text-foreground/50">
                {t("product_modal.sku", { sku: selectedVariant.sku })}
              </span>
            )}
          </div>

          <div className="bg-linear-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {currencySymbol}
                  {finalPrice.toFixed(2)}
                </div>
                {hasDiscount && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground/50 line-through">
                      {currencySymbol}
                      {price.toFixed(2)}
                    </span>
                    <span className="text-xs text-green-600 font-medium">
                      {t("product_modal.save", {
                        amount: `${currencySymbol} ${(price - specialPrice).toFixed(2)}`,
                      })}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  isIconOnly
                  size="sm"
                  variant="flat"
                  isDisabled={loading || selectedVariant.stock === 0}
                  onPress={handleQuantityDecrease}
                  className="w-8 h-8 min-w-8"
                >
                  <Minus size={14} />
                </Button>
                <span className="w-8 text-center text-sm font-medium">
                  {quantity}
                </span>
                <Button
                  isIconOnly
                  size="sm"
                  variant="flat"
                  isDisabled={loading || selectedVariant.stock === 0}
                  onPress={handleQuantityIncrease}
                  className="w-8 h-8 min-w-8"
                >
                  <Plus size={14} />
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground">
                {t("product_modal.subtotal", { count: quantity })}
              </span>
              <span className="text-sm font-medium text-foreground">
                {currencySymbol}
                {totalPrice.toFixed(2)}
              </span>
            </div>
            {savings > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex gap-1">
                  <span className="text-sm text-green-600">
                    {t("product_modal.total_savings")}
                  </span>
                  {discountPercentage > 0 && (
                    <Chip
                      className="text-xs font-medium"
                      classNames={{ content: "text-xs", base: "h-5" }}
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
                <span className="text-sm font-medium text-green-600">
                  -{currencySymbol}
                  {savings.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </ModalBody>

        <ModalFooter>
          <div className="flex gap-2 w-full">
            <Button
              variant="bordered"
              onPress={onClose}
              className="flex-1 text-sm"
              size="sm"
              isDisabled={loading}
            >
              {t("product_modal.cancel")}
            </Button>
            {product.store_status.is_open ? (
              <Button
                color="primary"
                onPress={AddToCart}
                isDisabled={selectedVariant.stock === 0}
                className="flex-1 text-sm"
                size="sm"
                startContent={<ShoppingCart size={16} />}
                isLoading={loading}
              >
                {selectedVariant.stock === 0
                  ? t("product_modal.out_of_stock")
                  : `${currencySymbol} ${totalPrice.toFixed(2)}`}
              </Button>
            ) : (
              <div className="flex flex-col items-end flex-1">
                <span className="text-orange-500 font-medium text-sm sm:text-medium">
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
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const ProductModal: FC<ProductModalProps> = (props) => {
  const { product } = props;

  if (product.type === "variant") {
    return <ProductVariantModal {...props} />;
  }

  return <SimpleProductModal {...props} />;
};

export default ProductModal;
