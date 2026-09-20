import React, { useEffect, useState } from "react";
import { DollarSign, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { adminAPI, type AdminRevenueResponse } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import StatCard from "@/components/StatCard";

const formatAmount = (value: number | string | null | undefined) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

const AdminRevenue: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [data, setData] = useState<AdminRevenueResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRevenue = async () => {
    setLoading(true);
    try {
      setData(await adminAPI.getRevenue());
    } catch (error: any) {
      toast({
        title: error?.message || t("admin.revenue.loadError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRevenue();
  }, []);

  const summary = data?.summary;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display flex items-center gap-2 text-2xl font-bold text-foreground">
            <ShieldCheck size={24} className="text-accent" />
            {t("admin.revenue.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("admin.revenue.subtitle")}
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          label={t("admin.revenue.adminShare")}
          value={`${formatAmount(summary?.admin_revenue)} ETB`}
          icon={<ShieldCheck />}
          gradient="success"
        />
        <StatCard
          label={t("admin.revenue.gross")}
          value={`${formatAmount(summary?.gross_revenue)} ETB`}
          icon={<DollarSign />}
          gradient="accent"
        />
        <StatCard
          label={t("admin.revenue.instructorShare")}
          value={`${formatAmount(summary?.instructor_revenue)} ETB`}
          icon={<Users />}
          gradient="info"
        />
        <StatCard
          label={t("dashboard.studentsEnrolled")}
          value={summary?.enrolled_students || 0}
          icon={<DollarSign />}
          gradient="warning"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border/50 p-6">
            <h2 className="font-semibold text-foreground">
              {t("admin.revenue.breakdown")}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("admin.revenue.splitHint")}
            </p>
          </div>
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">
              {t("dashboard.loadingRevenue")}
            </p>
          ) : !data?.courses.length ? (
            <p className="p-6 text-sm text-muted-foreground">
              {t("admin.revenue.empty")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-medium">
                      {t("nav.courses")}
                    </th>
                    <th className="px-6 py-3 font-medium">
                      {t("admin.revenue.instructor")}
                    </th>
                    <th className="px-6 py-3 text-right font-medium">
                      {t("dashboard.studentsEnrolled")}
                    </th>
                    <th className="px-6 py-3 text-right font-medium">
                      {t("admin.revenue.gross")}
                    </th>
                    <th className="px-6 py-3 text-right font-medium">
                      {t("admin.revenue.adminShare")}
                    </th>
                    <th className="px-6 py-3 text-right font-medium">
                      {t("admin.revenue.instructorShare")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data.courses.map((course) => (
                    <tr key={course.course_id} className="text-foreground">
                      <td className="px-6 py-4 font-medium">
                        {course.course_title}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {course.instructor_name}
                      </td>
                      <td className="px-6 py-4 text-right text-muted-foreground">
                        {course.enrolled_students}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {formatAmount(course.gross_revenue)} ETB
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-success">
                        {formatAmount(course.admin_revenue)} ETB
                      </td>
                      <td className="px-6 py-4 text-right text-muted-foreground">
                        {formatAmount(course.instructor_revenue)} ETB
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRevenue;
