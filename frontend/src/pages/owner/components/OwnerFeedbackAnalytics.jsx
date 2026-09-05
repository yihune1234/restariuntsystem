import React, { useEffect, useState } from "react";
import {
  Star, TrendingUp, TrendingDown, MessageSquare, ThumbsUp, ThumbsDown,
  Lightbulb, AlertTriangle, Calendar, BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useFeedbackStore } from "@/store/useFeedbackStore";

const typeTone = {
  RATING: "bg-slate-100 text-slate-700",
  IDEA: "bg-amber-100 text-amber-800",
  COMPLAINT: "bg-rose-100 text-rose-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
  OPEN: "bg-rose-100 text-rose-700",
};
const Pill = ({ status }) => (
  <Badge className={`${typeTone[status] || "bg-slate-100 text-slate-700"} border-transparent`}>
    {status}
  </Badge>
);

const StarRow = ({ label, value }) => {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-slate-600">
          <Star className="w-4 h-4 text-amber-500" /> {label}
        </span>
        <span className="font-semibold text-slate-800 tabular-nums">
          {value ? value.toFixed(1) : "\u2014"} \u2605
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
};

const Stat = ({ title, value, sub, Icon, tone = "slate" }) => {
  const toneCls = {
    slate: "bg-slate-50 text-slate-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
    indigo: "bg-indigo-50 text-indigo-700",
  }[tone] || "bg-slate-50 text-slate-700";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
            <div className="text-2xl font-semibold mt-1 text-slate-800 tabular-nums">{value}</div>
            {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
          </div>
          <div className={`p-2 rounded-lg ${toneCls}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const TrendBars = ({ trend = [] }) => {
  if (!trend.length) {
    return <EmptyState title="No rating data yet" hint="Once customers submit ratings they will appear here." />;
  }
  const max = Math.max(...trend.map((p) => p.avgOverall || 0), 5);
  return (
    <div className="flex items-end gap-1.5 h-32">
      {trend.map((d, i) => {
        const h = Math.max(2, ((d.avgOverall || 0) / max) * 100);
        return (
          <div key={d._id || i} className="flex-1 flex flex-col items-center gap-1" title={`${d._id}: ${(d.avgOverall || 0).toFixed(2)} \u2605 (${d.count})`}>
            <div
              className="w-full rounded-t bg-gradient-to-t from-amber-400 to-amber-200"
              style={{ height: `${h}%` }}
            />
            <span className="text-[10px] text-slate-400">{d._id?.slice(5) || ""}</span>
          </div>
        );
      })}
    </div>
  );
};

const OwnerFeedbackAnalytics = () => {
  const { fetchOrganizationAnalytics, resolveFeedback } = useFeedbackStore();

  const [days, setDays] = useState(30);
  const [analytics, setAnalytics] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchOrganizationAnalytics(null, { days });
      if (cancelled) return;
      setAnalytics(data);
    })();
    return () => { cancelled = true; };
  }, [days, refreshKey, fetchOrganizationAnalytics]);

  const handleResolve = async (feedbackId, notes = "Resolved by Owner") => {
    const result = await resolveFeedback(feedbackId, notes);
    if (result?.success) {
      setRefreshKey((k) => k + 1);
    }
  };

  const summary = analytics?.summary;
  const trend = analytics?.trend || [];
  const ideas = analytics?.ideas || [];
  const distribution = analytics?.ratingDistribution || [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Customer Feedback</h1>
          <p className="text-sm text-slate-500">Customer ratings, complaints and ideas.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 text-sm">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="bg-transparent outline-none">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat title="Overall Rating" value={summary ? `${summary.overallRating} \u2605` : "\u2014"} sub="Across all rated visits" Icon={Star} tone="amber" />
        <Stat title="Total Reviews" value={summary?.totalReviews ?? 0} sub={`${days} day window`} Icon={MessageSquare} tone="indigo" />
        <Stat title="Positive" value={summary ? `${summary.positivePercent}%` : "\u2014"} sub="Rated 4\u2605 or higher" Icon={ThumbsUp} tone="green" />
        <Stat title="Negative" value={summary ? `${summary.negativePercent}%` : "\u2014"} sub="Rated 2\u2605 or lower" Icon={ThumbsDown} tone="red" />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ratings">Ratings</TabsTrigger>
          <TabsTrigger value="complaints">Complaints</TabsTrigger>
          <TabsTrigger value="ideas">Ideas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Sentiment</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-emerald-600"><TrendingUp className="w-4 h-4" /> Positive</span>
                  <span className="font-medium">{summary?.positivePercent ?? 0}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-rose-600"><TrendingDown className="w-4 h-4" /> Negative</span>
                  <span className="font-medium">{summary?.negativePercent ?? 0}%</span>
                </div>
                <Progress value={summary?.positivePercent ?? 0} className="h-2" />
                <p className="text-xs text-slate-500">Calculated over rated submissions only.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Volume by Type</CardTitle></CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span>Ratings</span><span className="tabular-nums">{summary ? summary.totalReviews - summary.ideas : 0}</span></div>
                <div className="flex justify-between"><span>Ideas</span><span className="tabular-nums">{summary?.ideas ?? 0}</span></div>
                <div className="flex justify-between"><span>Complaints</span><span className="tabular-nums">{summary?.complaints ?? 0}</span></div>
                <div className="flex justify-between text-rose-600"><span>Open complaints</span><span className="tabular-nums">{summary?.openComplaints ?? 0}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Rating Distribution</CardTitle></CardHeader>
              <CardContent>
                {distribution.length === 0 ? (
                  <EmptyState title="No ratings yet" />
                ) : (
                  <div className="space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const row = distribution.find((d) => d._id === star);
                      const count = row?.count || 0;
                      const total = distribution.reduce((s, d) => s + d.count, 0) || 1;
                      return (
                        <div key={star} className="flex items-center gap-2 text-sm">
                          <span className="w-4 text-right text-amber-500">{"\u2605".repeat(star)}</span>
                          <Progress value={(count / total) * 100} className="h-2 flex-1" />
                          <span className="w-6 text-right tabular-nums">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Rating Trend</CardTitle></CardHeader>
            <CardContent>
              <TrendBars trend={trend} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ratings" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Averages</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <StarRow label="Overall" value={summary?.overallRating || 0} />
              <StarRow label="Food" value={summary?.foodRating || 0} />
              <StarRow label="Service" value={summary?.serviceRating || 0} />
              <StarRow label="Cleanliness" value={summary?.cleanlinessRating || 0} />
              <StarRow label="Wait Time" value={summary?.waitTimeRating || 0} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Recent Reviews</CardTitle></CardHeader>
            <CardContent className="divide-y">
              <EmptyState title="No reviews yet" hint="Customer ratings will show up here once customers submit feedback via QR codes." />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="complaints" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat title="Total Complaints" value={summary?.complaints ?? 0} Icon={AlertTriangle} tone="red" />
            <Stat title="Open" value={summary?.openComplaints ?? 0} Icon={AlertTriangle} tone="amber" />
            <Stat title="Resolved" value={Math.max(0, (summary?.complaints ?? 0) - (summary?.openComplaints ?? 0))} Icon={ThumbsUp} tone="green" />
            <Stat title="Negative %" value={summary ? `${summary.negativePercent}%` : "\u2014"} Icon={TrendingDown} tone="red" />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Recent Complaints</CardTitle></CardHeader>
            <CardContent className="divide-y">
              <EmptyState title="No complaints" hint="Great \u2014 keep it up!" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ideas" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Stat title="Total Ideas" value={summary?.ideas ?? 0} Icon={Lightbulb} tone="amber" />
            <Stat title="Implemented" value={ideas.filter((i) => i.isResolved).length} Icon={ThumbsUp} tone="green" />
            <Stat title="Pending" value={ideas.filter((i) => !i.isResolved).length} Icon={Lightbulb} tone="indigo" />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Customer Suggestions</CardTitle></CardHeader>
            <CardContent className="divide-y">
              {ideas.length === 0 ? (
                <EmptyState title="No ideas yet" hint="Customers can submit ideas from the QR ordering flow." />
              ) : ideas.map((idea) => (
                <div key={idea._id} className="py-3 flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">{idea.suggestionText || idea.feedbackText}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-slate-400">
                        {new Date(idea.createdAt).toLocaleString()} \u00b7 {idea.isResolved ? "Marked resolved" : "Awaiting action"}
                      </div>
                      {!idea.isResolved && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleResolve(idea._id, "Idea Acknowledged")}>Acknowledge</Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OwnerFeedbackAnalytics;
