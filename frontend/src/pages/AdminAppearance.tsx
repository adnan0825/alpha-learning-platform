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
import { settingsAPI } from "@/lib/api";

const AdminAppearance: React.FC = () => {
  const { toast } = useToast();
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
          title: "Error fetching settings",
          description: "Could not load appearance settings from server.",
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
        title: "Theme updated",
        description: "Your changes have been saved successfully and applied.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Could not save settings to the server.",
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
            <Palette size={24} className="text-accent" /> Appearance
          </h1>
          <p className="text-muted-foreground text-sm">
            Logo and hero video apply site-wide. Student and admin dashboards
            use fixed Alpha brand colors for a consistent experience.
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
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </motion.div>

      <div className="flex flex-col gap-6">
        <Card className="shadow-card">
          <CardContent className="p-6 space-y-6">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Layout size={18} /> Branding
            </h3>

            <div className="space-y-2">
              <Label>Logo</Label>
              <ImageUpload
                value={logo}
                onChange={setLogo}
                label="Upload Logo"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="space-y-4 p-6">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <Layout size={18} /> Landing hero video
            </h3>
            <p className="text-xs text-muted-foreground">
              YouTube or direct file URL (mp4/webm) for the dashboard preview on
              the homepage. Direct files avoid YouTube’s in-player UI for a
              fully custom control bar. Leave empty to use the built-in default.
            </p>
            <div className="space-y-2">
              <Label htmlFor="hero-video-url">Intro video URL</Label>
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
