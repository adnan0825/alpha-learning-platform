/**
 * Payment Receipt Page - Shows Chapa payment receipt with print option
 */

import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { paymentsAPI } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  ArrowLeft,
  Loader2,
  Printer,
  Download,
} from "lucide-react";
import { motion } from "framer-motion";

const PaymentReceipt: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);

  const txRef = searchParams.get("tx_ref");

  useEffect(() => {
    if (txRef) {
      paymentsAPI
        .verifyPayment(txRef)
        .then((data) => {
          setPaymentData(data.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Verification error:", err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [txRef]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    handlePrint(); // For now, just trigger print - browser can save as PDF
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Loader2 className="w-16 h-16 text-accent animate-spin" />
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-semibold mb-4">Receipt Not Found</h1>
            <Button onClick={() => navigate("/student/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        {/* Print Header - Only visible when printing */}
        <div className="hidden print:block print:mb-6">
          <h1 className="text-2xl font-bold">Payment Receipt</h1>
          <p className="text-sm text-muted-foreground">Alpha</p>
        </div>

        <Card className="print:shadow-none print:border-2">
          <CardContent className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-green-600 mb-2">
                Payment Successful!
              </h1>
              <p className="text-muted-foreground">
                Your payment has been processed successfully
              </p>
            </div>

            {/* Receipt Details */}
            <div className="bg-muted/50 rounded-lg p-6 space-y-4 mb-8 print:bg-white">
              <h2 className="font-semibold text-lg mb-4">Payment Details</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Transaction ID
                  </p>
                  <p className="font-mono text-sm font-medium">
                    {paymentData.tx_ref}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-sm font-medium text-green-600 capitalize">
                    {paymentData.status || paymentData.payment_status}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount Paid</p>
                  <p className="text-lg font-bold">
                    {paymentData.amount} {paymentData.currency}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Date</p>
                  <p className="text-sm font-medium">
                    {new Date(
                      paymentData.completed_at || paymentData.created_at,
                    ).toLocaleString()}
                  </p>
                </div>
                {paymentData.course_title && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Course</p>
                    <p className="font-medium">{paymentData.course_title}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{paymentData.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payer Name</p>
                  <p className="text-sm font-medium">
                    {paymentData.first_name} {paymentData.last_name}
                  </p>
                </div>
              </div>
            </div>

            {/* Institution Info */}
            <div className="text-center text-sm text-muted-foreground mb-6 print:block">
              <p className="font-medium">Alpha</p>
              <p>Thank you for your enrollment!</p>
            </div>

            {/* Actions - Hidden when printing */}
            <div className="flex flex-col sm:flex-row gap-3 print:hidden">
              <Button
                onClick={handlePrint}
                className="flex-1 gradient-accent text-accent-foreground"
              >
                <Printer size={16} className="mr-2" />
                Print Receipt
              </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
                className="flex-1"
              >
                <Download size={16} className="mr-2" />
                Save as PDF
              </Button>
            </div>

            {/* Navigation - Hidden when printing */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4 print:hidden">
              <Button
                onClick={() => navigate("/student/dashboard")}
                variant="outline"
                className="flex-1"
              >
                Go to My Courses
              </Button>
              <Button
                onClick={() => navigate("/")}
                variant="ghost"
                className="flex-1"
              >
                <ArrowLeft size={16} className="mr-2" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Print Instructions */}
        <p className="text-center text-sm text-muted-foreground mt-4 print:hidden">
          Tip: You can also use Ctrl+P (Windows) or Cmd+P (Mac) to print this
          receipt
        </p>
      </motion.div>
    </div>
  );
};

export default PaymentReceipt;
