import React, { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import axiosInstance from "@/axios/axiosInstace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { QRCodeCanvas } from "qrcode.react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  QrCode, ExternalLink, Copy, Check, Download, Store, Camera, Upload,
  Shield, Eye, EyeOff, Facebook, MessageCircle, Instagram, Trash2
} from "lucide-react";

const BrandingPage = () => {
  const [loading, setLoading] = useState(true);
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [settings, setSettings] = useState(null);

  const [branding, setBranding] = useState({
    name: "Faarees Kaafee fi Restoorraantii",
    nameEn: "Faarees Kaafee fi Restoorraantii",
    nameOm: "",
    nameAm: "ፋሪስ ካፌ እና ሪስቶራንት",
    description: "",
    descriptionEn: "",
    descriptionOm: "",
    descriptionAm: "",
    logoUrl: "",
    coverUrl: "",
    phone: "",
    address: "",
    socialMedia: { telegram: "", facebook: "", instagram: "" },
    currency: "ETB",
  });

  const [credentials, setCredentials] = useState({
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const menuUrl = `${window.location.origin}/menu`;

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/admin/settings");
      const data = res.data?.data;
      if (data) {
        setSettings(data);
        setBranding({
          name: data.restaurant?.name || "",
          nameEn: data.restaurant?.nameEn || "",
          nameOm: data.restaurant?.nameOm || "",
          nameAm: data.restaurant?.nameAm || "",
          description: data.restaurant?.description || "",
          descriptionEn: data.restaurant?.descriptionEn || "",
          descriptionOm: data.restaurant?.descriptionOm || "",
          descriptionAm: data.restaurant?.descriptionAm || "",
          logoUrl: data.restaurant?.logoUrl || "",
          coverUrl: data.restaurant?.coverUrl || "",
          phone: data.restaurant?.phone || "",
          address: data.restaurant?.address || "",
          socialMedia: {
            telegram: data.restaurant?.socialMedia?.telegram || "",
            facebook: data.restaurant?.socialMedia?.facebook || "",
            instagram: data.restaurant?.socialMedia?.instagram || "",
          },
          currency: data.restaurant?.currency || "ETB",
        });
        setCredentials((prev) => ({ ...prev, email: data.admin?.email || "" }));
      }
    } catch (e) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (type === "logo") setUploadingLogo(true);
    else setUploadingCover(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axiosInstance.post("/uploads", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data?.data?.url;
      if (url) {
        setBranding((prev) => ({ ...prev, [type === "logo" ? "logoUrl" : "coverUrl"]: url }));
        toast.success(`${type === "logo" ? "Logo" : "Cover"} uploaded`);
      }
    } catch {
      toast.error(`Failed to upload ${type === "logo" ? "logo" : "cover image"}`);
    } finally {
      if (type === "logo") setUploadingLogo(false);
      else setUploadingCover(false);
    }
  };

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    try {
      const res = await axiosInstance.put("/admin/settings/branding", branding);
      toast.success(res.data?.message || "Branding updated successfully");
      fetchSettings();
    } catch (e) {
      toast.error(e.backendMessage || "Failed to update branding");
    } finally {
      setSavingBranding(false);
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    const levels = [
      { score: 0, label: "", color: "" },
      { score: 1, label: "Weak", color: "bg-red-500" },
      { score: 2, label: "Fair", color: "bg-orange-500" },
      { score: 3, label: "Good", color: "bg-yellow-500" },
      { score: 4, label: "Strong", color: "bg-green-500" },
      { score: 5, label: "Very Strong", color: "bg-green-600" },
    ];
    return levels[Math.min(score, 5)];
  };

  const passwordStrength = getPasswordStrength(credentials.newPassword);
  const passwordsMatch = credentials.newPassword === credentials.confirmPassword;
  const canSaveCredentials =
    credentials.email && credentials.currentPassword && credentials.newPassword &&
    credentials.newPassword.length >= 6 && passwordsMatch;

  const handleSaveCredentials = async () => {
    if (credentials.newPassword !== credentials.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (credentials.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    setSavingCredentials(true);
    try {
      const res = await axiosInstance.put("/admin/settings/credentials", {
        email: credentials.email,
        currentPassword: credentials.currentPassword,
        newPassword: credentials.newPassword,
      });
      toast.success(res.data?.message || "Credentials updated successfully");
      setCredentials((prev) => ({
        ...prev, currentPassword: "", newPassword: "", confirmPassword: "",
      }));
    } catch (e) {
      toast.error(e.backendMessage || "Failed to update credentials");
    } finally {
      setSavingCredentials(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(menuUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
    toast.success("Menu link copied!");
  };

  const downloadQR = (format) => {
    const canvas = document.getElementById("qr-canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `faarees-menu-qr.${format === "svg" ? "svg" : "png"}`;
    if (format === "svg") {
      const svgData = new XMLSerializer().serializeToString(canvas);
      link.href = URL.createObjectURL(new Blob([svgData], { type: "image/svg+xml" }));
    } else {
      link.href = canvas.toDataURL("image/png");
    }
    link.click();
    toast.success(`QR code downloaded as ${format.toUpperCase()}`);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Branding & Settings</h1>
        <p className="text-sm text-gray-500">Restaurant identity and admin credentials</p>
      </div>

      {/* Restaurant Identity */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
            <Store className="size-4 text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Restaurant Identity</h2>
            <p className="text-xs text-gray-500">Multilingual names and branding</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Cover Image */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Cover / Hero Banner</label>
            <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-200 dark:border-gray-600" style={{ aspectRatio: "16/9" }}>
              {branding.coverUrl ? (
                <>
                  <img src={branding.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setBranding((p) => ({ ...p, coverUrl: "" }))}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                  <Camera className="size-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">{uploadingCover ? "Uploading..." : "Tap to upload cover"}</span>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "cover")} className="hidden" disabled={uploadingCover} />
                </label>
              )}
              {branding.coverUrl && !uploadingCover && (
                <label className="absolute inset-0 cursor-pointer hover:bg-black/20 transition" title="Change cover">
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "cover")} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Logo & Names Row */}
          <div className="flex gap-4">
            {/* Logo */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Logo</label>
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-600">
                  {branding.logoUrl ? (
                    <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="size-8 text-gray-400" />
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-amber-600 rounded-full cursor-pointer flex items-center justify-center text-white hover:bg-amber-700 shadow-lg">
                  <Camera className="size-3.5" />
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "logo")} className="hidden" disabled={uploadingLogo} />
                </label>
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Names */}
            <div className="flex-1 space-y-2 min-w-0">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name (English) *</label>
                <Input
                  value={branding.nameEn}
                  onChange={(e) => setBranding((p) => ({ ...p, nameEn: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Afaan Oromoo</label>
                  <Input
                    value={branding.nameOm}
                    onChange={(e) => setBranding((p) => ({ ...p, nameOm: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Amharic</label>
                  <Input
                    value={branding.nameAm}
                    onChange={(e) => setBranding((p) => ({ ...p, nameAm: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Descriptions */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Description (English)</label>
            <Textarea
              value={branding.descriptionEn}
              onChange={(e) => setBranding((p) => ({ ...p, descriptionEn: e.target.value }))}
              placeholder="Brief description..."
              className="min-h-16 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Afaan Oromoo</label>
              <Textarea
                value={branding.descriptionOm}
                onChange={(e) => setBranding((p) => ({ ...p, descriptionOm: e.target.value }))}
                className="min-h-14 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Amharic</label>
              <Textarea
                value={branding.descriptionAm}
                onChange={(e) => setBranding((p) => ({ ...p, descriptionAm: e.target.value }))}
                className="min-h-14 text-sm"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
              <Input
                value={branding.phone}
                onChange={(e) => setBranding((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+251..."
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
              <Input
                value={branding.currency}
                onChange={(e) => setBranding((p) => ({ ...p, currency: e.target.value }))}
                placeholder="ETB"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
            <Input
              value={branding.address}
              onChange={(e) => setBranding((p) => ({ ...p, address: e.target.value }))}
              placeholder="Addis Ababa, Ethiopia"
              className="h-9 text-sm"
            />
          </div>

          {/* Social Media */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Social Media</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="size-4 text-blue-500 flex-shrink-0" />
                <Input
                  value={branding.socialMedia.telegram}
                  onChange={(e) => setBranding((p) => ({ ...p, socialMedia: { ...p.socialMedia, telegram: e.target.value } }))}
                  placeholder="Telegram URL"
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Facebook className="size-4 text-blue-600 flex-shrink-0" />
                <Input
                  value={branding.socialMedia.facebook}
                  onChange={(e) => setBranding((p) => ({ ...p, socialMedia: { ...p.socialMedia, facebook: e.target.value } }))}
                  placeholder="Facebook URL"
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Instagram className="size-4 text-pink-500 flex-shrink-0" />
                <Input
                  value={branding.socialMedia.instagram}
                  onChange={(e) => setBranding((p) => ({ ...p, socialMedia: { ...p.socialMedia, instagram: e.target.value } }))}
                  placeholder="Instagram URL"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSaveBranding} disabled={savingBranding} className="w-full bg-amber-600 hover:bg-amber-700 h-10">
            {savingBranding ? "Saving..." : "Save Branding"}
          </Button>
        </div>
      </section>

      {/* Admin Credentials */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
            <Shield className="size-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Admin Credentials</h2>
            <p className="text-xs text-gray-500">Email and password</p>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
            <Input
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials((p) => ({ ...p, email: e.target.value }))}
              className="h-9 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Current Password *</label>
            <div className="relative">
              <Input
                type={showPasswords.current ? "text" : "password"}
                value={credentials.currentPassword}
                onChange={(e) => setCredentials((p) => ({ ...p, currentPassword: e.target.value }))}
                placeholder="Required for changes"
                className="h-9 text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((p) => ({ ...p, current: !p.current }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPasswords.current ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">New Password</label>
            <div className="relative">
              <Input
                type={showPasswords.new ? "text" : "password"}
                value={credentials.newPassword}
                onChange={(e) => setCredentials((p) => ({ ...p, newPassword: e.target.value }))}
                placeholder="Min. 6 characters"
                className="h-9 text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((p) => ({ ...p, new: !p.new }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPasswords.new ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {credentials.newPassword && (
              <div className="mt-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div className={`h-full transition-all ${passwordStrength.color}`} style={{ width: `${(passwordStrength.score / 5) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium text-gray-500">{passwordStrength.label}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Confirm Password</label>
            <div className="relative">
              <Input
                type={showPasswords.confirm ? "text" : "password"}
                value={credentials.confirmPassword}
                onChange={(e) => setCredentials((p) => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="Re-enter password"
                className={`h-9 text-sm pr-10 ${credentials.confirmPassword && !passwordsMatch ? "border-red-500" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPasswords.confirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {credentials.confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          <Button
            onClick={handleSaveCredentials}
            disabled={savingCredentials || !canSaveCredentials}
            className="w-full bg-blue-600 hover:bg-blue-700 h-10"
          >
            {savingCredentials ? "Updating..." : "Update Credentials"}
          </Button>
        </div>
      </section>

      {/* QR Code */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
            <QrCode className="size-4 text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Menu QR Code</h2>
            <p className="text-xs text-gray-500">Scan to view digital menu</p>
          </div>
        </div>

        <div className="p-4">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 mb-4">
            <div className="inline-block bg-white rounded-xl shadow p-3">
              <QRCodeCanvas
                id="qr-canvas"
                value={menuUrl}
                size={180}
                level="H"
                bgColor="#FFFFFF"
                fgColor="#18181B"
                imageSettings={{
                  src: branding.logoUrl || undefined,
                  height: 40,
                  width: 40,
                  excavate: true,
                  crossOrigin: "anonymous",
                }}
              />
            </div>
            <div className="mt-3 text-center">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{branding.nameEn}</p>
              {branding.nameAm && <p className="text-xs text-gray-500">{branding.nameAm}</p>}
            </div>
          </div>

          <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg mb-3">
            <p className="text-xs text-gray-500 break-all font-mono">{menuUrl}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <Button variant="outline" onClick={() => downloadQR("png")} className="h-11 flex-col text-xs gap-1">
              <Download className="size-4" />
              PNG
            </Button>
            <Button variant="outline" onClick={() => downloadQR("svg")} className="h-11 flex-col text-xs gap-1">
              <Download className="size-4" />
              SVG
            </Button>
            <Button variant="outline" onClick={copyLink} className="h-11 flex-col text-xs gap-1">
              {copySuccess ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
              {copySuccess ? "Copied!" : "Copy Link"}
            </Button>
          </div>

          <Button variant="outline" onClick={() => window.open(menuUrl, "_blank")} className="w-full h-9 text-xs">
            <ExternalLink className="size-3.5 mr-1.5" />
            Open Menu Preview
          </Button>
        </div>
      </section>
    </div>
  );
};

export default BrandingPage;
