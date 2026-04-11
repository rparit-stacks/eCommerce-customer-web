import UserLayout from "@/layouts/UserLayout";
import { GetServerSideProps } from "next";
import {
  Card,
  CardBody,
  CardHeader,
  Avatar,
  Button,
  Input,
  CardFooter,
  Form,
  useDisclosure,
  addToast,
} from "@heroui/react";
import { FormEvent, useRef, useState } from "react";
import { User, Mail, Camera, Trash, Calendar } from "lucide-react";
import PageHeader from "@/components/custom/PageHeader";
import MyBreadcrumbs from "@/components/custom/MyBreadcrumbs";
import {
  deleteUser,
  getSettings,
  getUserData,
  updateUserData,
} from "@/routes/api";
import { isSSR } from "@/helpers/getters";
import ConfirmationModal from "@/components/Modals/ConfirmationModal";
import { getAccessTokenFromContext, handleLogout } from "@/helpers/auth";
import { useDispatch, useSelector } from "react-redux";
import { userData } from "@/types/ApiResponse";
import { RootState } from "@/lib/redux/store";
import { setUserDataRedux } from "@/lib/redux/slices/authSlice";
import { NextPageWithLayout } from "@/types";
import { staticProfileImage } from "@/config/constants";
import dynamic from "next/dynamic";
import { loadTranslations } from "../../../i18n";
import PageHead from "@/SEO/PageHead";
import { useTranslation } from "react-i18next";
import Lightbox from "yet-another-react-lightbox";
import { useSettings } from "@/contexts/SettingsContext";

const PhoneInput = dynamic(() => import("@/components/Functional/PhoneInput"), {
  ssr: false,
});

type MyAccountPageProps = {
  initialData: userData;
};

const MyAccount: NextPageWithLayout<MyAccountPageProps> = ({ initialData }) => {
  const { isOpen, onClose, onOpen } = useDisclosure();
  const { demoMode } = useSettings();
  const { t } = useTranslation();
  const [isLightboxOpen, setLightboxOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();
  const userData = useSelector((state: RootState) => state.auth.user);
  const user = isSSR() ? initialData : userData;
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    mobile: user?.mobile || "",
    iso_2: user?.iso_2 || "",
    country: user?.country || "",
    friends_code: user?.friends_code || "",
  });

  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setInitialState = () => {
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
      mobile: user?.mobile || "",
      iso_2: user?.iso_2 || "US",
      country: user?.country || "",
      friends_code: user?.friends_code || "",
    });
    setProfileImageFile(null);
  };

  const handleInputChange = (
    field: string,
    value: string | number | boolean
  ) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) setProfileImageFile(file);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (demoMode) {
      addToast({
        title: t("pages.myAccount.toasts.demoModeTitle") || "Demo Mode",
        description:
          t("pages.myAccount.toasts.demoModeDesc") ||
          "Updates are not allowed in demo mode",
        color: "warning",
      });
      return;
    }

    setIsLoading(true);

    try {
      const form = new FormData(e.currentTarget);
      if (profileImageFile) form.append("profile_image", profileImageFile);

      const res = await updateUserData(form);

      if (res.success) {
        dispatch(setUserDataRedux(res.data || {}));
        addToast({
          title: t("pages.myAccount.toasts.successTitle"),
          description: t("pages.myAccount.toasts.successDesc"),
          color: "success",
        });
      } else {
        addToast({
          title: t("pages.myAccount.toasts.updateFailedTitle"),
          description:
            res.message || t("pages.myAccount.toasts.updateFailedDesc"),
          color: "danger",
        });
        setInitialState();
      }
    } catch (error) {
      console.error("Error updating user data:", error);
      addToast({
        title: t("pages.myAccount.toasts.errorTitle"),
        description: t("pages.myAccount.toasts.errorDesc"),
        color: "danger",
      });
      setInitialState();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (demoMode) {
      addToast({
        title: t("pages.myAccount.toasts.demoModeTitle") || "Demo Mode",
        description:
          t("pages.myAccount.toasts.demoModeDesc") ||
          "This action is not allowed in demo mode",
        color: "warning",
      });
      return;
    }

    const res = await deleteUser();
    if (res.success) {
      await handleLogout(false);
      addToast({
        title: t("pages.myAccount.toasts.deleteSuccessTitle"),
        description: t("pages.myAccount.toasts.deleteSuccessDesc"),
        color: "success",
      });
    } else {
      addToast({
        title: t("pages.myAccount.toasts.deleteFailedTitle"),
        description: t("pages.myAccount.toasts.deleteFailedDesc"),
        color: "danger",
      });
    }
  };

  return (
    <>
      <MyBreadcrumbs
        breadcrumbs={[
          { href: "/my-account", label: t("pageTitle.my-account") },
        ]}
      />
      <PageHead pageTitle={t("pageTitle.my-account")} />

      <UserLayout activeTab="my-account">
        <div className="w-full">
          <div className="flex items-center justify-between">
            <PageHeader
              title={t("pages.myAccount.headerTitle")}
              subtitle={t("pages.myAccount.headerSubtitle")}
            />
            <Button
              startContent={<Trash size={16} />}
              color="danger"
              size="sm"
              className="text-xs"
              onPress={onOpen}
            >
              {t("pages.myAccount.deleteAccount")}
            </Button>
          </div>

          <Card shadow="sm" className="p-2">
            <Form onSubmit={onSubmit}>
              <CardHeader className="pb-0">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar
                      src={
                        profileImageFile
                          ? URL.createObjectURL(profileImageFile)
                          : user?.profile_image || staticProfileImage
                      }
                      className="w-16 h-16 cursor-pointer"
                      isBordered
                      color="primary"
                      onClick={() => setLightboxOpen(true)}
                    />
                    {isLightboxOpen && (
                      <Lightbox
                        open={isLightboxOpen}
                        close={() => setLightboxOpen(false)}
                        slides={[
                          {
                            src: profileImageFile
                              ? URL.createObjectURL(profileImageFile)
                              : user?.profile_image || staticProfileImage,
                          },
                        ]}
                      />
                    )}
                    <Button
                      isIconOnly
                      size="sm"
                      className="absolute -bottom-1 -right-1 min-w-unit-6 w-6 h-7"
                      radius="full"
                      color="primary"
                      onPress={() => fileInputRef.current?.click()}
                    >
                      <Camera size={16} />
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold">{formData.name}</h2>
                    <p className="flex items-center gap-1 mt-1 opacity-50 text-small">
                      <Mail size={16} />
                      {formData.email}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-5">
                    <div className="flex items-center gap-2">
                      <User className="text-primary" size={16} />
                      <h3 className="text-medium font-semibold">
                        {t("pages.myAccount.personalInfo")}
                      </h3>
                    </div>

                    <Input
                      name="name"
                      isReadOnly={isLoading}
                      label={t("pages.myAccount.labels.fullName")}
                      labelPlacement="outside"
                      isRequired
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      variant="flat"
                      startContent={
                        <User size={16} className="text-gray-400" />
                      }
                    />

                    <Input
                      isReadOnly
                      label={t("pages.myAccount.labels.memberSince")}
                      labelPlacement="outside"
                      variant="flat"
                      value={
                        user?.created_at
                          ? new Date(user.created_at).toLocaleString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""
                      }
                      startContent={
                        <Calendar size={16} className="text-gray-400" />
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-5">
                    <div className="flex items-center gap-2">
                      <Mail className="text-primary" size={16} />
                      <h3 className="text-medium font-semibold">
                        {t("pages.myAccount.contactInfo")}
                      </h3>
                    </div>

                    <Input
                      name="email"
                      isReadOnly={true}
                      label={t("pages.myAccount.labels.email")}
                      labelPlacement="outside"
                      isRequired
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      variant="flat"
                      startContent={
                        <Mail size={16} className="text-gray-400" />
                      }
                    />
                    <PhoneInput
                      isReadOnly={true}
                      label={t("pages.myAccount.labels.phone")}
                      labelPlacement="outside"
                      defaultValue={formData.mobile}
                      defaultCountry={formData.iso_2 || "US"}
                      onPhoneChange={(
                        countryCode,
                        phoneNumber,
                        dialCode,
                        name
                      ) => {
                        if (
                          typeof phoneNumber !== "string" ||
                          typeof dialCode !== "string"
                        )
                          return;
                        handleInputChange("mobile", phoneNumber);
                        handleInputChange("iso_2", countryCode);
                        handleInputChange("country", name);
                      }}
                      variant="flat"
                    />

                    <input type="hidden" name="iso2" value={formData.iso_2} />
                    <input
                      type="hidden"
                      name="country"
                      value={formData.country}
                    />
                  </div>
                </div>
              </CardBody>
              <CardFooter className="w-full flex justify-start">
                <Button
                  type="submit"
                  color="primary"
                  className="max-w-xs"
                  isLoading={isLoading}
                >
                  {t("pages.myAccount.saveChanges")}
                </Button>
              </CardFooter>
            </Form>
          </Card>
        </div>
      </UserLayout>

      <ConfirmationModal
        isOpen={isOpen}
        onClose={onClose}
        onConfirm={handleDelete}
        title={t("pages.myAccount.deleteAccount")}
        description={t("pages.myAccount.deleteDesc")}
        alertTitle={t("pages.myAccount.alertTitle")}
        alertDescription={t("pages.myAccount.alertDesc")}
        confirmText={t("pages.myAccount.confirmText")}
        variant="danger"
      />
    </>
  );
};

export const getServerSideProps: GetServerSideProps | undefined = isSSR()
  ? async (context) => {
      try {
        const access_token = (await getAccessTokenFromContext(context)) || "";
        if (!access_token) {
          return {
            redirect: {
              destination: "/",
              permanent: false,
            },
          };
        }
        const response = await getUserData({ access_token });
        const res = await getSettings();
        await loadTranslations(context);

        return {
          props: {
            initialData: response.success ? response.data : {},
            initialSettings: res?.success ? res.data : [],
          },
        };
      } catch (error) {
        console.error("Error fetching Settings:", error);
        return {
          props: {
            initialSettings: null,
            initialData: {},
          },
        };
      }
    }
  : undefined;

export default MyAccount;
