import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axiosInstance from "@/axios/axiosInstace";
import { Star, Send, Lightbulb, AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

const VALID_MODES = ["rating", "idea", "complaint"];

const CustomerFeedback = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Allow the hamburger drawer (or any link) to preselect a tab via ?tab=
  // (e.g. /customer/feedback?tab=rate or ?tab=idea or ?tab=complaint).
  const initialTab = searchParams.get("tab") || searchParams.get("type");
  const [mode, setMode] = useState(
    VALID_MODES.includes(initialTab) ? initialTab : "rating"
  );

  const switchMode = (next) => {
    setMode(next);
    if (next !== "rating") {
      setSearchParams({ tab: next }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };
  const [overallRating, setOverallRating] = useState(0);
  const [foodRating, setFoodRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [suggestionText, setSuggestionText] = useState("");
  const [complaintText, setComplaintText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (mode === "rating" && overallRating === 0) return toast.error("Please select a star rating");
    if (mode === "idea" && !suggestionText.trim()) return toast.error("Please share your idea");
    if (mode === "complaint" && !complaintText.trim()) return toast.error("Please describe your complaint");
    setSubmitting(true);
    try {
      const payload = {
        type: mode === "rating" ? (overallRating <= 2 ? "COMPLAINT" : "RATING") : (mode === "idea" ? "IDEA" : "COMPLAINT"),
        overallRating: mode === "rating" ? overallRating : undefined,
        foodRating: mode === "rating" && foodRating ? foodRating : undefined,
        serviceRating: mode === "rating" && serviceRating ? serviceRating : undefined,
        feedbackText: mode === "complaint" ? complaintText : feedbackText,
        suggestionText: mode === "idea" ? suggestionText : "",
        isComplaint: mode === "complaint" || (mode === "rating" && overallRating <= 2),
        source: "QR_CODE",
      };
      await axiosInstance.post("/feedback", payload);
      toast.success(mode === "idea" ? "Thanks for your idea!" : mode === "complaint" ? "Complaint submitted!" : "Thanks for your feedback!");
      setSubmitted(true);
    } catch (err) {
      toast.error(err.backendMessage || "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  const StarPicker = ({ value, onChange, label }) => (
    <div className="space-y-1">
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)} className="size-8 transition-transform hover:scale-110">
            <Star className={`size-7 ${n <= value ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
          </button>
        ))}
      </div>
    </div>
  );

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-2 border-green-200 dark:border-green-800 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-8 text-center">
            <div className="size-20 mx-auto rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm mb-4 shadow-lg ring-4 ring-white/30">
              <CheckCircle2 className="size-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Thank You!</h2>
          </div>
          <CardContent className="py-8 text-center space-y-6 bg-white dark:bg-gray-800">
            <p className="text-base text-gray-600 dark:text-gray-400">
              Your feedback is incredibly valuable to us and helps us serve you better.
            </p>
            <div className="flex flex-col gap-3 pt-2">
              <Button 
                onClick={() => navigate(-1)}
                className="w-full h-14 text-base font-bold bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white border-0 rounded-2xl shadow-lg shadow-amber-500/30"
              >
                Return to Menu
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setSubmitted(false)}
                className="w-full h-12 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white"
              >
                Submit Another Feedback
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-32">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
        <div className="max-w-xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="size-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">Feedback</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Rate, suggest, or report an issue</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex p-1.5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <button 
            onClick={() => switchMode("rating")} 
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-medium transition-all ${
              mode === "rating" ? "bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 shadow-sm border border-amber-200 dark:border-amber-800/50" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <Star className={`size-5 ${mode === "rating" ? "fill-amber-500" : ""}`} /> Rate Us
          </button>
          <button 
            onClick={() => switchMode("idea")} 
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-medium transition-all ${
              mode === "idea" ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-800/50" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <Lightbulb className={`size-5 ${mode === "idea" ? "fill-blue-500" : ""}`} /> Idea
          </button>
          <button 
            onClick={() => switchMode("complaint")} 
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-medium transition-all ${
              mode === "complaint" ? "bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 shadow-sm border border-rose-200 dark:border-rose-800/50" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <AlertCircle className={`size-5 ${mode === "complaint" ? "fill-rose-500" : ""}`} /> Issue
          </button>
        </div>

        <Card className="border-2 border-amber-200 dark:border-amber-800 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
            <h2 className="text-white font-bold text-lg">
              {mode === "rating" ? "Tell us about your visit" : mode === "idea" ? "Share your brilliant idea" : "We're sorry to hear that"}
            </h2>
          </div>
          <CardContent className="p-6 space-y-6">
            {mode === "rating" && (
              <div className="space-y-6">
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800/30 flex flex-col items-center justify-center text-center">
                  <StarPicker value={overallRating} onChange={setOverallRating} label="Overall Experience *" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center">
                    <StarPicker value={foodRating} onChange={setFoodRating} label="Food Quality" />
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center">
                    <StarPicker value={serviceRating} onChange={setServiceRating} label="Service" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Additional Comments</Label>
                  <Textarea 
                    placeholder="Tell us what you loved, or what we could do better..." 
                    value={feedbackText} 
                    onChange={(e) => setFeedbackText(e.target.value.slice(0, 1000))} 
                    rows={4} 
                    maxLength={1000}
                    className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 rounded-xl resize-none text-sm p-4"
                  />
                </div>
              </div>
            )}
            {mode === "idea" && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Suggestion</Label>
                <Textarea 
                  placeholder="E.g., It would be great if you added..." 
                  value={suggestionText} 
                  onChange={(e) => setSuggestionText(e.target.value.slice(0, 1000))} 
                  rows={5} 
                  maxLength={1000}
                  className="bg-blue-50/50 dark:bg-gray-900/50 border-blue-100 dark:border-gray-700 rounded-xl resize-none text-sm p-4 focus:ring-blue-500"
                />
                <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Lightbulb className="size-3" /> Sent directly to restaurant management.
                </p>
              </div>
            )}
            {mode === "complaint" && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Describe the Issue</Label>
                <Textarea 
                  placeholder="What went wrong with your order or service?" 
                  value={complaintText} 
                  onChange={(e) => setComplaintText(e.target.value.slice(0, 1000))} 
                  rows={5} 
                  maxLength={1000}
                  className="bg-rose-50/50 dark:bg-gray-900/50 border-rose-100 dark:border-gray-700 rounded-xl resize-none text-sm p-4 focus:ring-rose-500"
                />
                <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="size-3" /> Flagged immediately for review.
                </p>
              </div>
            )}
            
            <Button 
              onClick={submit} 
              disabled={submitting} 
              className={`w-full h-14 text-base font-bold text-white border-0 rounded-2xl shadow-lg transition-all ${
                mode === "idea" ? "bg-gradient-to-r from-blue-600 to-indigo-500 shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-600" :
                mode === "complaint" ? "bg-gradient-to-r from-rose-600 to-red-500 shadow-rose-500/30 hover:from-rose-700 hover:to-red-600" :
                "bg-gradient-to-r from-amber-600 to-orange-500 shadow-amber-500/30 hover:from-amber-700 hover:to-orange-600"
              }`}
            >
              {submitting ? <Loader2 className="size-5 mr-2 animate-spin" /> : <Send className="size-5 mr-2" />}
              {submitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </CardContent>
        </Card>
        
        <p className="text-xs text-center text-gray-500 font-medium pb-4">
          All feedback is collected securely and anonymously.
        </p>
      </div>
    </div>
  );
};

export default CustomerFeedback;
