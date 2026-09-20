/**
 * Admin Reports & Export - Integrated with backend API
 */
import React, { useState } from "react";
import { adminAPI } from "@/lib/api";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  Calendar,
  Users,
  BookOpen,
  DollarSign,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const reports = [
  {
    id: "overview",
    titleKey: "reports.overview",
    descriptionKey: "reports.overviewDescription",
    icon: <TrendingUp size={18} />,
    category: "finance",
  },
  {
    id: "users",
    titleKey: "reports.userActivity",
    descriptionKey: "reports.userActivityDescription",
    icon: <Users size={18} />,
    category: "users",
  },
  {
    id: "courses",
    titleKey: "reports.coursePerformance",
    descriptionKey: "reports.coursePerformanceDescription",
    icon: <BookOpen size={18} />,
    category: "courses",
  },
];

const ReportsPage: React.FC = () => {
  const [filter, setFilter] = useState("all");
  const [exporting, setExporting] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  const filtered =
    filter === "all" ? reports : reports.filter((r) => r.category === filter);

  const downloadData = (data: any, fileName: string) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (reportId: string, title: string) => {
    setExporting(reportId);
    try {
      let data;
      switch (reportId) {
        case "overview":
          data = await adminAPI.getOverviewReport();
          break;
        case "users":
          data = await adminAPI.getUsersReport();
          break;
        case "courses":
          data = await adminAPI.getCoursesReport();
          break;
        default:
          throw new Error("Unknown report type");
      }

      downloadData(data, title.toLowerCase().replace(/\s+/g, "_"));
      toast({
        title: t("reports.exported"),
        description: `${title} ${t("reports.downloadedJson")}`,
      });
    } catch (err: any) {
      toast({
        title: t("reports.exportFailed"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText size={24} className="text-accent" /> {t("reports.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("reports.subtitle")}
          </p>
        </motion.div>

        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("reports.all")}</SelectItem>
              <SelectItem value="users">{t("reports.users")}</SelectItem>
              <SelectItem value="courses">{t("reports.courses")}</SelectItem>
              <SelectItem value="finance">{t("reports.finance")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((report, i) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="shadow-card hover:shadow-elevated transition-all h-full">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-11 w-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      {report.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display font-semibold text-foreground text-sm">
                        {t(report.titleKey as any)}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t(report.descriptionKey as any)}
                      </p>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="default"
                          className="text-xs h-8 px-4 gradient-accent text-accent-foreground"
                          onClick={() =>
                            handleExport(report.id, t(report.titleKey as any))
                          }
                          disabled={exporting === report.id}
                        >
                          {exporting === report.id ? (
                            <RefreshCw
                              size={13}
                              className="mr-1.5 animate-spin"
                            />
                          ) : (
                            <Download size={13} className="mr-1.5" />
                          )}
                          {t("reports.downloadJson")}
                        </Button>
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase tracking-wider self-center ml-auto"
                        >
                          {report.category === "users"
                            ? t("reports.users")
                            : report.category === "courses"
                              ? t("reports.courses")
                              : t("reports.finance")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
};

export default ReportsPage;
