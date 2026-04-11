import {
  Avatar,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  useDisclosure,
} from "@heroui/react";
import { useRouter } from "next/router";
import { FC, Key } from "react";
import LogoutModal from "./Modals/LogoutModal";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store";
import { staticProfileImage } from "@/config/constants";
import { safeImageSrc } from "@/lib/safeImageSrc";
import { useTranslation } from "react-i18next";
import {
  User,
  Package,
  MapPin,
  Wallet,
  Receipt,
  LogOut,
  Settings,
  Bell,
} from "lucide-react";

const ProfileBtn: FC = () => {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const userData = useSelector((state: RootState) => state.auth.user);
  const { t } = useTranslation();

  const handleAction = (key: Key) => {
    const route = key.toString();
    if (route === "logout") {
      onOpen();
    } else {
      router.push(route);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Dropdown placement="bottom-end">
        <DropdownTrigger>
          <Avatar
            isBordered
            as="button"
            size="sm"
            src={safeImageSrc(userData?.profile_image, staticProfileImage)}
            className="transition-transform cursor-pointer"
            classNames={{ base: "w-7 h-7" }}
            alt={userData?.name || "User Avatar"}
          />
        </DropdownTrigger>

        <DropdownMenu
          aria-label="Profile Actions"
          variant="flat"
          onAction={handleAction}
          classNames={{ list: "text-xs" }}
        >
          <DropdownItem
            key="/my-account/"
            textValue={`${t("profileBtn.signedInAs")} ${userData?.email}`}
            className="h-14 gap-2"
            startContent={<User size={16} />}
            classNames={{ title: "text-xs" }}
          >
            <p className="font-semibold">{t("profileBtn.signedInAs")}</p>
            <p className="font-semibold truncate">{userData?.name}</p>
          </DropdownItem>

          <DropdownItem
            key="/my-account"
            startContent={<Settings size={16} />}
            textValue={t("profileBtn.myAccount")}
            classNames={{ title: "text-xs" }}
          >
            {t("profileBtn.myAccount")}
          </DropdownItem>

          <DropdownItem
            key="/my-account/orders"
            startContent={<Package size={16} />}
            textValue={t("profileBtn.myOrders")}
            classNames={{ title: "text-xs" }}
          >
            {t("profileBtn.myOrders")}
          </DropdownItem>

          <DropdownItem
            key="/my-account/addresses"
            startContent={<MapPin size={16} />}
            textValue={t("profileBtn.addresses")}
            classNames={{ title: "text-xs" }}
          >
            {t("profileBtn.addresses")}
          </DropdownItem>

          <DropdownItem
            key="/my-account/wallet"
            startContent={<Wallet size={16} />}
            textValue={t("profileBtn.wallet")}
            classNames={{ title: "text-xs" }}
          >
            {t("profileBtn.wallet")}
          </DropdownItem>

          <DropdownItem
            key="/my-account/transactions"
            startContent={<Receipt size={16} />}
            textValue={t("profileBtn.transactions")}
            classNames={{ title: "text-xs" }}
          >
            {t("profileBtn.transactions")}
          </DropdownItem>

          <DropdownItem
            key="/my-account/notifications"
            startContent={<Bell size={16} />}
            textValue={t("profileBtn.notifications")}
            classNames={{ title: "text-xs" }}
          >
            {t("profileBtn.notifications")}
          </DropdownItem>

          <DropdownItem
            key="logout"
            color="danger"
            startContent={<LogOut size={16} className="text-danger-400" />}
            textValue={t("profileBtn.logout")}
            classNames={{ title: "text-xs text-danger-400" }}
          >
            {t("profileBtn.logout")}
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>

      <LogoutModal
        isOpen={isOpen}
        onClose={onClose}
        userName={userData?.name}
        userEmail={userData?.email}
        profileImg={safeImageSrc(userData?.profile_image, staticProfileImage)}
      />
    </div>
  );
};

export default ProfileBtn;
