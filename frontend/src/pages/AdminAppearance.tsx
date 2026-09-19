/**
 * Admin Appearance & Theme Customizer
 */
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Palette, Layout, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ImageUpload from "@/components/ImageUpload";
import VideoUpload from "@/components/VideoUpload";
import { settingsAPI } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

const AdminAppearance: React.FC = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [logo, setLogo] = useState("");
  const [heroIntroVideoUrl, setHeroIntroVideoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const appearance = await settingsAPI.getAppearance();
        setLogo(appearance.logo || "");
        setHeroIntroVideoUrl(
          typeof appearance.heroIntroVideoUrl === "string"
            ? appearance.heroIntroVideoUrl
            : "",
        );
      } catch (error) {
        toast({
          title: t("admin.appearance.loadError"),
          description: t("admin.appearance.loadErrorDescription"),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [toast]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await settingsAPI.updateAppearance({
        logo,
        fontFamily: "Inter",
        heroIntroVideoUrl: heroIntroVideoUrl.trim(),
      });

      localStorage.setItem(
        "alpha_appearance",
        JSON.stringify({
          logo,
          fontFamily: "Inter",
          heroIntroVideoUrl: heroIntroVideoUrl.trim(),
        }),
      );

      // Trigger a storage event so other components (like Layout) can update
      window.dispatchEvent(new Event("storage"));

      toast({
        title: t("admin.appearance.updated"),
        description: t("admin.appearance.updatedDescription"),
      });
    } catch (error) {
      toast({
        title: t("admin.appearance.saveFailed"),
        description: t("admin.appearance.saveFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Palette size={24} className="text-accent" />{" "}
            {t("admin.appearance.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("admin.appearance.subtitle")}
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="gradient-accent text-accent-foreground min-w-[140px]"
        >
          {isSaving ? (
            <Loader2 size={16} className="mr-2 animate-spin" />
          ) : (
            <Save size={16} className="mr-2" />
          )}
          {isSaving ? t("profile.saving") : t("profile.saveChanges")}
        </Button>
      </motion.div>

      <div className="flex flex-col gap-6">
        <Card className="shadow-card">
          <CardContent className="p-6 space-y-6">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Layout size={18} /> {t("admin.appearance.branding")}
            </h3>

            <div className="space-y-2">
              <Label>{t("admin.appearance.logo")}</Label>
              <ImageUpload
                value={logo}
                onChange={setLogo}
                label={t("admin.appearance.uploadLogo")}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="space-y-4 p-6">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <Layout size={18} /> {t("admin.appearance.heroVideo")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("admin.appearance.videoHelp")}
            </p>
            <div className="space-y-2">
              <Label>{t("admin.appearance.videoUrl")}</Label>
              <VideoUpload
                value={heroIntroVideoUrl}
                onChange={setHeroIntroVideoUrl}
                label="Upload landing-page video"
                maxSizeLabel="Up to 200MB"
                visibility="public"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero-video-url">
                {t("admin.appearance.videoUrl")}
              </Label>
              <Input
                id="hero-video-url"
                value={heroIntroVideoUrl}
                onChange={(e) => setHeroIntroVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=… or https://youtu.be/…"
                className="font-mono text-sm"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAppearance;
