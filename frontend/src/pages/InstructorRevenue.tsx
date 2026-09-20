import React, { useEffect, useMemo, useState } from "react";
import { DollarSign, RefreshCw, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { instructorAnalyticsAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import StatCard from "@/components/StatCard";

interface RevenueRow {
  course_id: number;
  course_title: string;
  total_enrollments: number | string;
  total_revenue: number | string;
  completed_revenue: number | string;
  instructor_revenue: number | string;
  admin_revenue: number | string;
}

const amount = (value: number | string | null | undefined) =>
  Number(value || 0).toLocaleString();

const InstructorRevenue: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [rows, setRows] = useState<RevenueRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRevenue = async () => {
    setLoading(true);
    try {
      setRows((await instructorAnalyticsAPI.getRevenue()) as RevenueRow[]);
    } catch (error: any) {
      setRows([]);
      toast({
        title: error?.message || "Unable to load revenue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRevenue();
  }, []);

  const totals = useMemo(
    () =>
      rows.reduce(
        (summary, row) => ({
          earnings: summary.earnings + Number(row.instructor_revenue || 0),
          courseRevenue: summary.courseRevenue + Number(row.total_revenue || 0),
          enrollments: summary.enrollments + Number(row.total_enrollments || 0),
        }),
        { earnings: 0, courseRevenue: 0, enrollments: 0 },
      ),
    [rows],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display flex items-center gap-2 text-2xl font-bold text-foreground">
            <DollarSign size={24} className="text-accent" />
            {t("dashboard.revenueTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.revenueSubtitle")}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void loadRevenue()}
          disabled={loading}
        >
          <RefreshCw size={16} className="mr-2" />
          {t("dashboard.refresh")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label={t("dashboard.totalEarnings")}
          value={`${amount(totals.earnings)} ETB`}
          icon={<DollarSign />}
          gradient="success"
        />
        <StatCard
          label={t("dashboard.totalCourseRevenue")}
          value={`${amount(totals.courseRevenue)} ETB`}
          icon={<TrendingUp />}
          gradient="info"
        />
        <StatCard
          label={t("dashboard.totalStudents")}
          value={totals.enrollments}
          icon={<TrendingUp />}
          gradient="accent"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border/50 p-6">
            <h2 className="font-semibold text-foreground">
              {t("dashboard.revenueTitle")}
            </h2>
          </div>
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">
              {t("dashboard.loadingRevenue")}
            </p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {t("courses.noCourses")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-medium">
                      {t("nav.courses")}
                    </th>
                    <th className="px-6 py-3 text-right font-medium">
                      {t("dashboard.studentsEnrolled")}
                    </th>
                    <th className="px-6 py-3 text-right font-medium">
                      {t("dashboard.totalEarnings")}
                    </th>
                    <th className="px-6 py-3 text-right font-medium">
                      {t("dashboard.totalCourseRevenue")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {rows.map((row) => {
                    const completed = Number(row.instructor_revenue || 0);
                    return (
                      <tr key={row.course_id} className="text-foreground">
                        <td className="px-6 py-4 font-medium">
                          {row.course_title}
                        </td>
                        <td className="px-6 py-4 text-right text-muted-foreground">
                          {amount(row.total_enrollments)}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold">
                          {amount(completed)} ETB
                        </td>
                        <td className="px-6 py-4 text-right text-muted-foreground">
                          {amount(row.total_revenue)} ETB
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InstructorRevenue;
