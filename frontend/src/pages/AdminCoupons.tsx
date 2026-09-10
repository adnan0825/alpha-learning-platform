/**
 * Admin Coupons Page
 */
import React, { useEffect, useState } from "react";
import { couponsAPI, Coupon } from "@/lib/api";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import {
  Ticket,
  Plus,
  Trash2,
  Tag,
  Calendar,
  Users,
  RefreshCw,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const AdminCoupons: React.FC = () => {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("10");
  const [expiry, setExpiry] = useState("");
  const [usageLimit, setUsageLimit] = useState("100");

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const data = await couponsAPI.getAll();
      setCoupons(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const newCoupon = await couponsAPI.create(
        code,
        parseInt(discount),
        expiry,
        parseInt(usageLimit),
      );
      setCoupons([...coupons, newCoupon]);
      toast({ title: "Coupon created successfully" });
      setShowCreate(false);
      setCode("");
      setDiscount("10");
    } catch (err: any) {
      toast({
        title: "Error creating coupon",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await couponsAPI.delete(id);
      setCoupons(coupons.filter((c) => c.id !== id));
      toast({ title: "Coupon deleted" });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Ticket size={24} className="text-accent" /> Coupons
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage discount codes and promotions
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="gradient-accent text-accent-foreground"
        >
          <Plus size={16} className="mr-2" /> Create Coupon
        </Button>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="animate-spin text-accent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coupons.map((coupon, i) => (
            <motion.div
              key={coupon.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="shadow-card overflow-hidden group">
                <div className="bg-accent/10 p-4 border-b border-accent/20 flex justify-between items-center">
                  <div className="font-mono text-lg font-bold text-accent tracking-wider">
                    {coupon.code}
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-background text-foreground border-border"
                  >
                    {coupon.discount}% OFF
                  </Badge>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar size={14} /> Expires:{" "}
                    {new Date(coupon.expiryDate).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users size={14} /> Usage: {coupon.usedCount} /{" "}
                    {coupon.usageLimit}
                  </div>

                  <div className="w-full bg-muted/50 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-accent h-full rounded-full"
                      style={{
                        width: `${Math.min((coupon.usedCount / coupon.usageLimit) * 100, 100)}%`,
                      }}
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(coupon.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                    >
                      <Trash2 size={14} className="mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {coupons.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No active coupons found.
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Coupon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Coupon Code</Label>
              <Input
                placeholder="e.g. SUMMER2025"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Usage Limit</Label>
                <Input
                  type="number"
                  min="1"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              className="gradient-accent text-accent-foreground"
            >
              Create Coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCoupons;
