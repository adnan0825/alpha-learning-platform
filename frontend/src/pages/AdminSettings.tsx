/**
 * Admin Settings Page - Integrated with backend API
 */
import React, { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Settings,
  Globe,
  Bell,
  Shield,
  Database,
  RefreshCw,
  Save,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const SettingsSection: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  delay?: number;
}> = ({ icon, title, children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
  >
    <Card className="shadow-card">
      <CardContent className="p-6">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-5">
          <span className="h-8 w-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
            {icon}
          </span>
          {title}
        </h3>
        {children}
      </CardContent>
    </Card>
  </motion.div>
);

const AdminSettings: React.FC = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await adminAPI.getSettings();
      setSettings(data);
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFeature = (key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      features: {
        ...prev.features,
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updateSettings(settings);
      toast({ title: t("admin.settings.saved") });
    } catch (err: any) {
      toast({
        title: t("admin.settings.saveError"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Settings size={24} className="text-accent" />{" "}
              {t("admin.settings.title")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t("admin.settings.subtitle")}
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gradient-accent text-accent-foreground gap-2"
          >
            <Save size={16} />{" "}
            {saving ? t("admin.settings.saving") : t("admin.settings.save")}
          </Button>
        </motion.div>

        <SettingsSection
          icon={<Globe size={16} />}
          title={t("admin.settings.statistics")}
          delay={0.1}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-muted/30">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {t("admin.settings.totalUsers")}
              </p>
              <p className="text-xl font-bold text-foreground">
                {settings?.platform?.total_users || 0}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {t("admin.settings.publishedCourses")}
              </p>
              <p className="text-xl font-bold text-foreground">
                {settings?.platform?.published_courses || 0}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {t("admin.settings.totalEnrollments")}
              </p>
              <p className="text-xl font-bold text-foreground">
                {settings?.platform?.total_enrollments || 0}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {t("admin.settings.totalRevenue")}
              </p>
              <p className="text-xl font-bold text-success">
                {(settings?.platform?.total_revenue || 0).toLocaleString()} ETB
              </p>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={<Shield size={16} />}
          title={t("admin.settings.features")}
          delay={0.2}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("admin.settings.payments")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("admin.settings.paymentsHelp")}
                </p>
              </div>
              <Switch
                checked={settings?.features?.payments_enabled}
                onCheckedChange={(v) =>
                  handleUpdateFeature("payments_enabled", v)
                }
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("admin.settings.certificates")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("admin.settings.certificatesHelp")}
                </p>
              </div>
              <Switch
                checked={settings?.features?.certificates_enabled}
                onCheckedChange={(v) =>
                  handleUpdateFeature("certificates_enabled", v)
                }
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("admin.settings.quizzes")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("admin.settings.quizzesHelp")}
                </p>
              </div>
              <Switch
                checked={settings?.features?.quizzes_enabled}
                onCheckedChange={(v) =>
                  handleUpdateFeature("quizzes_enabled", v)
                }
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("admin.settings.discussions")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("admin.settings.discussionsHelp")}
                </p>
              </div>
              <Switch
                checked={settings?.features?.discussions_enabled}
                onCheckedChange={(v) =>
                  handleUpdateFeature("discussions_enabled", v)
                }
              />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={<Database size={16} />}
          title={t("admin.settings.system")}
          delay={0.3}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">{t("admin.settings.maxUpload")}</Label>
              <Input
                type="number"
                value={settings?.features?.max_file_size}
                onChange={(e) =>
                  handleUpdateFeature("max_file_size", parseInt(e.target.value))
                }
                className="bg-muted/30 font-mono text-sm"
              />
            </div>
            <div className="p-3 rounded-xl bg-info/5 border border-info/20">
              <p className="text-sm text-foreground font-medium">
                {t("admin.settings.backendStatus")}
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                {t("admin.settings.connected")}
              </p>
            </div>
          </div>
        </SettingsSection>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full gradient-accent text-accent-foreground font-semibold h-12 hover:opacity-90 shadow-glow-accent text-base gap-2"
          >
            <Save size={18} />{" "}
            {saving ? t("admin.settings.saving") : t("admin.settings.saveAll")}
          </Button>
        </motion.div>
      </div>
    </>
  );
};

export default AdminSettings;
