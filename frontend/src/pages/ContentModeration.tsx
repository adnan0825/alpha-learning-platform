/**
 * Admin Content Moderation - Integrated with backend API
 */
import React, { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  MessageCircle,
  Star,
  Flag,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ContentModeration: React.FC = () => {
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [d, r] = await Promise.all([
        adminAPI.getDiscussions(),
        adminAPI.getReviews(),
      ]);
      setDiscussions(d);
      setReviews(r);
    } catch (err) {
      console.error("Failed to load moderation data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const handleDeleteDiscussion = async (id: string) => {
    try {
      await adminAPI.deleteDiscussion(id);
      setDiscussions((prev) => prev.filter((d) => d.id !== id));
      toast({ title: "Discussion deleted" });
    } catch (err: any) {
      toast({
        title: "Error deleting discussion",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteReview = async (id: string) => {
    try {
      await adminAPI.deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Review deleted" });
    } catch (err: any) {
      toast({
        title: "Error deleting review",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck size={24} className="text-accent" /> Content
              Moderation
            </h1>
            <p className="text-muted-foreground text-sm">
              Review and moderate platform content
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              size={14}
              className={`mr-1.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </motion.div>

        <Tabs defaultValue="discussions">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="discussions">
              Discussions ({discussions.length})
            </TabsTrigger>
            <TabsTrigger value="reviews">
              Reviews ({reviews.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discussions" className="mt-4 space-y-3">
            {discussions.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                  <MessageCircle
                    size={40}
                    className="text-muted-foreground/30 mb-3"
                  />
                  <p className="text-sm text-muted-foreground">
                    No discussions to moderate
                  </p>
                </CardContent>
              </Card>
            ) : (
              discussions.map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="shadow-card group">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-xl bg-info/10 text-info flex items-center justify-center shrink-0">
                            <MessageCircle size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-display font-semibold text-foreground">
                                {d.user_name}
                              </h4>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(d.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              in {d.course_title}
                            </p>
                            <p className="text-sm text-foreground mt-2 bg-muted/30 p-3 rounded-lg border border-border/50">
                              {d.content}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteDiscussion(d.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          <TabsContent value="reviews" className="mt-4 space-y-3">
            {reviews.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                  <Star size={40} className="text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No reviews to moderate
                  </p>
                </CardContent>
              </Card>
            ) : (
              reviews.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="shadow-card group">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                            <Star size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-display font-semibold text-foreground">
                                {r.user_name}
                              </h4>
                              <div className="flex items-center gap-1 ml-2">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    size={10}
                                    className={
                                      i < r.rating
                                        ? "fill-accent text-accent"
                                        : "text-muted-foreground/30"
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              in {r.course_title} •{" "}
                              {new Date(r.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-foreground mt-2 italic">
                              "{r.comment}"
                            </p>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteReview(r.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default ContentModeration;
