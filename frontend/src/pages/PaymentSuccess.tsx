/**
 * Payment Success Page
 */

import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { paymentsAPI } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft, Loader2, Play } from "lucide-react";
import { motion } from "framer-motion";

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);

  const txRef = searchParams.get("tx_ref");
  const status = searchParams.get("status");

  useEffect(() => {
    if (txRef) {
      // Always verify the payment when there's a tx_ref
      paymentsAPI
        .verifyPayment(txRef)
        .then((data) => {
          console.log("Payment verified:", data);
          setPaymentData(data.data);
          setVerifying(false);
        })
        .catch((err) => {
          console.error("Verification error:", err);
          // Check if we have status=success from URL - might be mock mode
          if (status === "success") {
            console.log("Showing success based on URL status");
            setVerifying(false);
          } else {
            setVerifying(false);
          }
        });
    } else {
      setVerifying(false);
    }
  }, [txRef, status]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardContent className="p-8 text-center space-y-6">
            {verifying ? (
              <>
                <Loader2 className="w-16 h-16 text-accent animate-spin mx-auto" />
                <h1 className="text-2xl font-semibold">Verifying Payment...</h1>
                <p className="text-muted-foreground">
                  Please wait while we confirm your payment
                </p>
              </>
            ) : paymentData || status === "success" ? (
              <>
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold text-green-600">
                    Payment Successful!
                  </h1>
                  <p className="text-muted-foreground">
                    You've successfully enrolled in the course
                  </p>
                </div>

                {paymentData && (
                  <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Amount Paid:
                      </span>
                      <span className="font-medium">
                        {paymentData.amount} {paymentData.currency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Transaction ID:
                      </span>
                      <span className="font-mono text-xs">
                        {paymentData.tx_ref}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span className="font-medium">
                        {new Date(
                          paymentData.completed_at || paymentData.created_at,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => navigate("/student/dashboard")}
                    className="flex-1 gradient-accent text-accent-foreground"
                  >
                    Go to My Courses
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/")}
                    className="flex-1"
                  >
                    <ArrowLeft size={16} className="mr-2" />
                    Back to Home
                  </Button>
                </div>

                {paymentData?.course_title && (
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(`/course/${paymentData.course_id || txRef}`)
                      }
                      className="w-full"
                    >
                      <Play size={16} className="mr-2" />
                      Start Learning: {paymentData.course_title}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-12 h-12 text-amber-600" />
                </div>
                <h1 className="text-2xl font-semibold">
                  Payment Status Unknown
                </h1>
                <p className="text-muted-foreground">
                  We couldn't verify your payment status. Please check your
                  email for confirmation.
                </p>
                <Button
                  onClick={() => navigate("/courses")}
                  className="gradient-accent text-accent-foreground"
                >
                  Go to My Courses
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
