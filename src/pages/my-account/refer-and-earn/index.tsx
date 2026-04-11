import MyBreadcrumbs from "@/components/custom/MyBreadcrumbs";
import PageHeader from "@/components/custom/PageHeader";
import UserLayout from "@/layouts/UserLayout";
import { GetServerSideProps } from "next";
import {
  Card,
  CardBody,
  Button,
  Input,
  Progress,
  Divider,
} from "@heroui/react";
import {
  Share,
  Copy,
  Gift,
  Users,
  DollarSign,
  Trophy,
  MessageCircle,
  Mail,
  CheckCircle,
  Clock,
  Star,
} from "lucide-react";
import { useState } from "react";
import { isSSR } from "@/helpers/getters";
import { getSettings } from "@/routes/api";
import { NextPageWithLayout } from "@/types";
import { useSettings } from "@/contexts/SettingsContext";
import { FaFacebookF, FaXTwitter } from "react-icons/fa6";
import { loadTranslations } from "../../../../i18n";
import PageHead from "@/SEO/PageHead";
import { useTranslation } from "react-i18next";
import { getAccessTokenFromContext } from "@/helpers/auth";

const ReferAndEarnPage: NextPageWithLayout = () => {
  const [referralCode] = useState("JUNIOR2024");
  const [copied, setCopied] = useState(false);
  const { currencySymbol } = useSettings();
  const { t } = useTranslation();

  // Mock data
  const stats = {
    totalReferrals: 12,
    successfulReferrals: 8,
    totalEarnings: 2400,
    pendingEarnings: 600,
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    const referralLink = `https://yourwebsite.com/register?ref=${referralCode}`;
    navigator.clipboard.writeText(referralLink);
  };

  const shareOptions = [
    {
      name: "Facebook",
      icon: FaFacebookF,
      color: "bg-blue-600",
      onPress: () => {},
    },
    {
      name: "Twitter",
      icon: FaXTwitter,
      color: "bg-sky-500",
      onPress: () => {},
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "bg-green-500",
      onPress: () => {},
    },
    { name: "Email", icon: Mail, color: "bg-gray-600", onPress: () => {} },
  ];

  return (
    <>
      <MyBreadcrumbs
        breadcrumbs={[
          {
            href: "/my-account/refer-and-earn",
            label: t("pageTitle.refer-and-earn"),
          },
        ]}
      />
      <PageHead pageTitle={t("pageTitle.refer-and-earn")} />

      <UserLayout activeTab="refer-and-earn">
        <div className="w-full space-y-8">
          {/* Header */}
          <PageHeader
            title={t("pages.referAndEarnPage.header.title")}
            subtitle={t("pages.referAndEarnPage.header.subtitle")}
          />

          {/* Hero Section */}
          <Card className="bg-linear-to-br from-purple-500 via-pink-500 to-red-500 text-white">
            <CardBody className="p-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                    <Gift className="w-6 h-6" />
                    <h2 className="text-xl font-semibold">
                      {t("pages.referAndEarnPage.hero.earn", {
                        currency: currencySymbol,
                      })}
                    </h2>
                  </div>
                  <p className="text-sm opacity-80 mb-4">
                    {t("pages.referAndEarnPage.hero.description")}
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {currencySymbol} 300
                      </div>
                      <div className="text-xs opacity-70">
                        {t("pages.referAndEarnPage.hero.perReferral")}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">Unlimited</div>
                      <div className="text-xs opacity-70">
                        {t("pages.referAndEarnPage.hero.referrals")}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">Instant</div>
                      <div className="text-xs opacity-70">
                        {t("pages.referAndEarnPage.hero.instantRewards")}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Trophy className="w-16 h-16 text-yellow-300" />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-none shadow-md">
              <CardBody className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs">
                      {t("pages.referAndEarnPage.stats.totalReferrals")}
                    </p>
                    <p className="text-lg font-semibold">
                      {stats.totalReferrals}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="border-none shadow-md">
              <CardBody className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs">
                      {t("pages.referAndEarnPage.stats.successful")}
                    </p>
                    <p className="text-lg font-semibold">
                      {stats.successfulReferrals}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="border-none shadow-md">
              <CardBody className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs">
                      {t("pages.referAndEarnPage.stats.totalEarnings")}
                    </p>
                    <p className="text-lg font-semibold">
                      {currencySymbol}
                      {stats.totalEarnings}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="border-none shadow-md">
              <CardBody className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-full">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs">
                      {t("pages.referAndEarnPage.stats.pending")}
                    </p>
                    <p className="text-lg font-semibold">
                      {currencySymbol}
                      {stats.pendingEarnings}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Referral Code Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-md">
              <CardBody className="p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Share className="w-5 h-5" />
                  {t("pages.referAndEarnPage.referralCode.title")}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      {t("pages.referAndEarnPage.referralCode.yourCode")}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={referralCode}
                        readOnly
                        className="font-mono text-xs"
                        size="sm"
                      />
                      <Button
                        isIconOnly
                        color={copied ? "success" : "primary"}
                        variant="solid"
                        size="sm"
                        onPress={handleCopyCode}
                        className="text-sm"
                        startContent={
                          copied ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      {t("pages.referAndEarnPage.referralCode.referralLink")}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={`https://yourwebsite.com/register?ref=${referralCode}`}
                        readOnly
                        className="text-xs"
                        size="sm"
                      />
                      <Button
                        isIconOnly
                        color="secondary"
                        variant="solid"
                        size="sm"
                        onPress={handleCopyLink}
                        startContent={<Copy className="w-4 h-4" />}
                      />
                    </div>
                  </div>

                  <Divider />

                  <div>
                    <p className="text-xs font-medium mb-3">
                      {t("pages.referAndEarnPage.referralCode.shareSocial")}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {shareOptions.map((option) => (
                        <Button
                          key={option.name}
                          className={`${option.color} text-white text-sm`}
                          variant="solid"
                          size="sm"
                          onPress={option.onPress}
                          startContent={<option.icon className="w-4 h-4" />}
                        >
                          {option.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* How it Works */}
            <Card className="border-none shadow-md">
              <CardBody className="p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  {t("pages.referAndEarnPage.howItWorks.title")}
                </h3>

                <div className="space-y-4">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex gap-3">
                      <div className="shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-bold text-xs">
                          {step}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium mb-0.5 text-sm">
                          {t("pages.referAndEarnPage.howItWorks.stepTitle", {
                            step,
                          })}
                        </h4>
                        <p className="text-xs text-foreground/50">
                          {t(
                            "pages.referAndEarnPage.howItWorks.stepDescription"
                          )}
                        </p>
                      </div>
                    </div>
                  ))}

                  <div className="p-3 bg-green-50 rounded-md border border-green-200">
                    <div className="flex items-start gap-2">
                      <Gift className="w-4 h-4 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-green-800 text-sm">
                          {t("pages.referAndEarnPage.howItWorks.bonusRewards")}
                        </p>
                        <p className="text-xs text-green-700">
                          {t(
                            "pages.referAndEarnPage.howItWorks.bonusDescription",
                            {
                              currency: currencySymbol,
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Progress Section */}
          <Card className="border-none shadow-md">
            <CardBody className="p-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold mb-1">
                  {t("pages.referAndEarnPage.progress.title")}
                </h3>
                <p className="text-xs text-foreground/50">
                  {t("pages.referAndEarnPage.progress.subtitle")}
                </p>
              </div>

              <div className="max-w-sm mx-auto">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium">
                    {t("pages.referAndEarnPage.progress.nextMilestone")}
                  </span>
                  <span className="text-xs">
                    {stats.successfulReferrals}/15
                  </span>
                </div>
                <Progress
                  value={(stats.successfulReferrals / 15) * 100}
                  color="secondary"
                  className="mb-3"
                />
                <div className="text-center">
                  <p className="text-xs">
                    {t("pages.referAndEarnPage.progress.referMore", {
                      remaining: 15 - stats.successfulReferrals,
                      currency: currencySymbol,
                      bonus: 500,
                    })}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </UserLayout>
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
        const settingsRes = await getSettings();
        await loadTranslations(context);

        if (settingsRes.success) {
          return {
            props: {
              initialSettings: settingsRes.data ?? null,
            },
          };
        } else {
          return {
            props: {
              initialSettings: null,
              error: settingsRes.message || "Failed to fetch Settings",
            },
          };
        }
      } catch (error) {
        console.error("Error fetching Settings:", error);

        return {
          props: {
            initialSettings: undefined,
            error: "Unable to load Settings. Please try again later.",
          },
        };
      }
    }
  : undefined;

export default ReferAndEarnPage;
