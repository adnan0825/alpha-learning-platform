/**
 * Payment Failed Page
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";

const PaymentFailed: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-red-600">
                {t("payment.failed.title")}
              </h1>
              <p className="text-muted-foreground">
                {t("payment.failed.message")}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-3 text-left">
              <div className="flex items-start gap-2">
                <HelpCircle
                  size={16}
                  className="mt-0.5 flex-shrink-0 text-muted-foreground"
                />
                <div>
                  <p className="font-medium mb-1">
                    {t("payment.failed.reasons")}
                  </p>
                  <ul className="text-muted-foreground list-disc list-inside space-y-1">
                    <li>{t("payment.failed.insufficientFunds")}</li>
                    <li>{t("payment.failed.networkIssue")}</li>
                    <li>{t("payment.failed.declined")}</li>
                    <li>{t("payment.failed.timeout")}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("payment.failed.support")}{" "}
                <a
                  href="mailto:support@alpha.com"
                  className="text-accent hover:underline"
                >
                  support@alpha.com
                </a>
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => navigate(-1)}
                className="flex-1 gradient-accent text-accent-foreground"
              >
                {t("payment.failed.tryAgain")}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="flex-1"
              >
                <ArrowLeft size={16} className="mr-2" />
                {t("payment.failed.backHome")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PaymentFailed;
