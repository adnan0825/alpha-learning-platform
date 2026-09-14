/**
 * PaymentCheckout - Manual transfer details + optional Chapa online checkout
 */

import React, { useState } from "react";
import { paymentsAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, Lock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { ManualPaymentMethods } from "@/components/ManualPaymentMethods";
import { ManualPaymentReceiptUpload } from "@/components/ManualPaymentReceiptUpload";
import { useLanguage } from "@/contexts/LanguageContext";

interface PaymentCheckoutProps {
  courseId: string;
  courseTitle: string;
  coursePrice: number;
  onSuccess?: () => void;
}

/**
 * Online Chapa checkout (card / wallets on Chapa). Off by default — set in `.env`:
 *   VITE_ENABLE_CHAPA=true
 */
const CHAPA_ONLINE_CHECKOUT_ENABLED =
  import.meta.env.VITE_ENABLE_CHAPA === "true";

const skipPhoneForChapa = import.meta.env.VITE_MOCK_PAYMENTS === "true";

/** Chapa UI + logic — only mounted when `CHAPA_ONLINE_CHECKOUT_ENABLED` is true (keeps hooks valid). */
function ChapaOnlineCheckoutBlock({
  courseId,
  courseTitle,
  coursePrice,
}: Pick<PaymentCheckoutProps, "courseId" | "courseTitle" | "coursePrice">) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [processing, setProcessing] = useState(false);
  const [amount, setAmount] = useState(coursePrice.toString());
  const [phone, setPhone] = useState("");

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: t("payment.checkout.authRequired"),
        description: t("payment.checkout.loginPrompt"),
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: t("payment.checkout.invalidAmount"),
        description: t("payment.checkout.invalidAmountDescription"),
        variant: "destructive",
      });
      return;
    }

    let phoneForApi = "0912345678";
    if (!skipPhoneForChapa) {
      const digits = phone.replace(/\D/g, "");
      const normalized =
        digits.length === 10 &&
        (digits.startsWith("09") || digits.startsWith("07"))
          ? digits
          : digits.length === 9 &&
              (digits.startsWith("9") || digits.startsWith("7"))
            ? `0${digits}`
            : "";
      if (!normalized) {
        toast({
          title: t("payment.checkout.enterMobileNumber"),
          description: t("payment.checkout.mobileNumberHelp"),
          variant: "destructive",
        });
        return;
      }
      phoneForApi = normalized;
    }

    setProcessing(true);

    try {
      const response = await paymentsAPI.initializePayment(
        parseFloat(amount),
        courseId,
        courseTitle,
        phoneForApi,
      );

      if (response.checkout_url) {
        window.location.href = response.checkout_url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: unknown) {
      console.error("Payment error:", error);
      const message =
        error instanceof Error
          ? error.message
          : t("payment.checkout.paymentInitFailed");
      toast({
        title: t("payment.checkout.paymentFailed"),
        description: message,
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Separator />
        <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("payment.checkout.onlineIntro")}
        </p>
      </div>

      {!skipPhoneForChapa ? (
        <div className="space-y-2">
          <Label htmlFor="phone">{t("payment.checkout.mobileLabel")}</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder={t("payment.checkout.mobilePlaceholder")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("payment.checkout.mobileHelpIntro")}{" "}
            <span className="font-medium text-foreground">
              {t("payment.checkout.mobileHelpOwn")}
            </span>{" "}
            {t("payment.checkout.mobileHelpBody")}{" "}
            <span className="font-mono">09xxxxxxxx</span>{" "}
            {t("payment.checkout.mobileHelpOr")}{" "}
            <span className="font-mono">07xxxxxxxx</span>.{" "}
            {t("payment.checkout.mobileHelpTail")}
            else is paying for you, they should use their number instead when
            they complete checkout.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="amount">{t("payment.checkout.amountLabel")}</Label>
        <div className="relative">
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pr-12"
            placeholder="0.00"
            min="1"
            step="0.01"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            ETB
          </span>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-muted-foreground dark:bg-blue-950/20">
        <Lock size={16} className="mt-0.5 flex-shrink-0" />
        <p>{t("payment.checkout.secureNotice")}</p>
      </div>

      <div className="space-y-2">
        <Label>{t("payment.checkout.acceptedMethods")}</Label>
        <div className="flex flex-wrap gap-2">
          <div className="rounded bg-muted px-3 py-1.5 text-xs">Telebirr</div>
          <div className="rounded bg-muted px-3 py-1.5 text-xs">CBE Birr</div>
          <div className="rounded bg-muted px-3 py-1.5 text-xs">M-Pesa</div>
          <div className="rounded bg-muted px-3 py-1.5 text-xs">
            Visa/Mastercard
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-600 dark:bg-amber-950/20">
        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
        <p>{t("payment.checkout.completeGuide")}</p>
      </div>

      <Button
        onClick={handlePayment}
        disabled={processing}
        className="h-12 w-full text-lg font-semibold gradient-accent text-accent-foreground"
      >
        {processing ? (
          <>
            <Loader2 className="mr-2 animate-spin" size={20} />
            {t("payment.checkout.processing")}
          </>
        ) : (
          `${t("payment.checkout.payNow")} ${amount} ETB`
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        By clicking &quot;Pay&quot;, you agree to our Terms of Service and
        Privacy Policy
      </p>
    </>
  );
}

const PaymentCheckout: React.FC<PaymentCheckoutProps> = ({
  courseId,
  courseTitle,
  coursePrice,
  onSuccess: _onSuccess,
}) => {
  return (
    <Card className="mx-auto max-w-lg">
      <CardContent className="space-y-6 p-6">
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <CreditCard className="text-accent" size={24} />
            Secure Payment
          </h2>
          <p className="text-sm text-muted-foreground">
            {CHAPA_ONLINE_CHECKOUT_ENABLED
              ? "Pay by bank transfer or mobile wallet below, or use Chapa for card and online checkout."
              : "Pay by bank transfer or mobile wallet using the details below."}
          </p>
        </div>

        <div className="space-y-2 rounded-lg bg-muted/50 p-4">
          <div>
            <Label className="text-xs text-muted-foreground">Course</Label>
            <p className="font-medium">{courseTitle}</p>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              Amount (ETB)
            </Label>
            <p className="text-lg font-bold">{coursePrice} ETB</p>
          </div>
        </div>

        <ManualPaymentMethods
          courseTitle={courseTitle}
          amountEtb={coursePrice}
        />

        <ManualPaymentReceiptUpload
          courseId={courseId}
          courseTitle={courseTitle}
          amountEtb={coursePrice}
        />

        {CHAPA_ONLINE_CHECKOUT_ENABLED ? (
          <ChapaOnlineCheckoutBlock
            courseId={courseId}
            courseTitle={courseTitle}
            coursePrice={coursePrice}
          />
        ) : null}
      </CardContent>
    </Card>
  );
};

export default PaymentCheckout;
