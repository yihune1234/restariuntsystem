import React, { useState } from "react";
import { CheckCircle2, Star, Send, Lightbulb, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/axios/axiosInstace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Customer feedback card shown on the confirmation page.
 *  Implements the simple "How was your experience?" UX plus an Idea tab
 *  and a Complaint tab. POSTs to /feedback which is OWNER/MANAGER-readable. */
const FeedbackCard = ({ order, branchId }) => {
  const [mode, setMode] = useState("rating");
  const [overallRating, setOverallRating] = useState(0);
  const [foodRating, setFoodRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [suggestionText, setSuggestionText] = useState("");
  const [isComplaint, setIsComplaint] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reset = () => {
    setOverallRating(0); setFoodRating(0); setServiceRating(0);
    setFeedbackText(""); setSuggestionText(""); setIsComplaint(false);
  };

  const submit = async () => {
    if (!order?._id || !branchId) return;
    setSubmitting(true);
    try {
      const payload = {
        organizationId: order.organizationId,
        branchId,
        orderId: order._id,
        tableId: order.tableId?._id || order.tableId || null,
        type: mode === "rating"
          ? (isComplaint || overallRating <= 2 ? "COMPLAINT" : "RATING")
          : (mode === "idea" ? "IDEA" : "COMPLAINT"),
        overallRating: mode === "idea" ? undefined : (overallRating || undefined),
        foodRating: mode === "rating" && foodRating ? foodRating : undefined,
        serviceRating: mode === "rating" && serviceRating ? serviceRating : undefined,
        feedbackText: mode === "idea" ? "" : (feedbackText.trim() || ""),
        suggestionText: mode === "idea" ? (suggestionText.trim() || "") : "",
        isComplaint: mode === "complaint" || (mode === "rating" && overallRating > 0 && overallRating <= 2),
        source: "QR_CODE",
      };
      await axiosInstance.post("/feedback", payload);
      toast.success(mode === "idea" ? "Thanks for the idea!" : "Thanks for your feedback!");
      setSubmitted(true);
      reset();
    } catch (err) {
      toast.error(err.backendMessage || "Could not send feedback");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border border-emerald-200 bg-emerald-50/50">
        <CardContent className="py-5 text-center text-sm text-emerald-800">
          <CheckCircle2 className="size-6 text-emerald-600 mx-auto mb-1" />
          <p className="font-medium">Thank you \u2014 your {mode === "idea" ? "idea" : "feedback"} helps us improve.</p>
        </CardContent>
      </Card>
    );
  }

  const StarPicker = ({ value, onChange, size = "size-7" }) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`${size} transition-transform hover:scale-110`}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <Star className={`${size} ${n <= value ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
        </button>
      ))}
    </div>
  );

  const canSend = mode === "rating"
    ? (!!overallRating || !!feedbackText.trim())
    : mode === "idea"
      ? !!suggestionText.trim()
      : !!feedbackText.trim();

  return (
    <Card className="border-2 border-amber-200 overflow-hidden">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 flex items-center justify-between">
        <h2 className="text-white font-bold text-sm flex items-center gap-2">
          <MessageSquare className="size-4" /> How was your experience?
        </h2>
        <span className="text-[10px] text-white/80 uppercase tracking-wider">Optional</span>
      </div>
      <CardContent className="p-5 space-y-4">
        <div className="flex gap-1 text-xs">
          <button onClick={() => setMode("rating")}
            className={`flex-1 py-1.5 rounded-md transition ${mode === "rating" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600"}`}>
            <Star className="inline size-3 mr-1" /> Rating
          </button>
          <button onClick={() => setMode("idea")}
            className={`flex-1 py-1.5 rounded-md transition ${mode === "idea" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600"}`}>
            <Lightbulb className="inline size-3 mr-1" /> Idea
          </button>
          <button onClick={() => setMode("complaint")}
            className={`flex-1 py-1.5 rounded-md transition ${mode === "complaint" ? "bg-rose-500 text-white" : "bg-gray-100 text-gray-600"}`}>
            Complaint
          </button>
        </div>

        {mode === "rating" && (
          <>
            <div>
              <p className="text-xs text-gray-500 mb-1">Overall</p>
              <StarPicker value={overallRating} onChange={setOverallRating} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Food</p>
                <StarPicker value={foodRating} onChange={setFoodRating} size="size-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Service</p>
                <StarPicker value={serviceRating} onChange={setServiceRating} size="size-5" />
              </div>
            </div>
            <textarea
              placeholder="Write feedback (optional)"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value.slice(0, 500))}
              rows={2}
              maxLength={500}
              className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={isComplaint}
                onChange={(e) => setIsComplaint(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              Mark this as a complaint
            </label>
          </>
        )}

        {mode === "idea" && (
          <textarea
            placeholder="Share an idea or suggestion\u2026"
            value={suggestionText}
            onChange={(e) => setSuggestionText(e.target.value.slice(0, 500))}
            rows={3}
            maxLength={500}
            className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          />
        )}

        {mode === "complaint" && (
          <textarea
            placeholder="What went wrong? We'll look into it."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value.slice(0, 500))}
            rows={3}
            maxLength={500}
            className="w-full rounded-lg border border-rose-200 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
          />
        )}

        <Button
          onClick={submit}
          disabled={submitting || !canSend}
          className="w-full bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white"
        >
          {submitting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
          Send
        </Button>
      </CardContent>
    </Card>
  );
};

export default FeedbackCard;
