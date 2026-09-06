import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useBranchStore } from "@/store/useBranchStore";
import { useTableStore } from "@/store/useTableStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { buildCustomerQrUrl } from "@/lib/qrUrl";
import { Building2, QrCode, Printer, RefreshCw, Copy, ExternalLink, Link as LinkIcon, Download } from "lucide-react";

/**
 * Manager: view & edit their assigned branch + regenerate any table's QR.
 *
 * Backend:
 *   GET    /branches/:branchId
 *   PATCH  /branches/:branchId
 *   GET    /branches/:branchId/tables
 *   POST   /tables/:tableId/regenerate-qr
 */
const BranchSettings = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;
  const { currentBranch, fetchBranch, updateBranch } = useBranchStore();
  const { tables, getTablesByBranch, regenerateQr } = useTableStore();
  const [form, setForm] = useState(() => ({
    name: "",
    phone: "",
    openTime: "07:00",
    closeTime: "22:00",
    taxRate: 0.15,
    serviceChargeRate: 0,
    city: "",
    subcity: "",
    street: "",
    isActive: true,
  }));
  // Id of the branch the form is currently synced to, used for the
  // render-phase "adjust state when a prop changes" sync below.
  const [syncedBranchId, setSyncedBranchId] = useState(null);
  const [qrUrl, setQrUrl] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState("");

  useEffect(() => {
    if (branchId) fetchBranch(branchId);
  }, [branchId, fetchBranch]);

  useEffect(() => {
    if (branchId) getTablesByBranch(branchId);
  }, [branchId, getTablesByBranch]);

  // Sync the editable form when a (newly loaded) branch arrives. This is done
  // during render per the React docs to avoid cascading-setState-in-effect.
  if (currentBranch && currentBranch._id !== syncedBranchId) {
    setSyncedBranchId(currentBranch._id);
    setForm({
      name: currentBranch.name || "",
      phone: currentBranch.phone || "",
      openTime: currentBranch.settings?.openTime || "07:00",
      closeTime: currentBranch.settings?.closeTime || "22:00",
      taxRate: currentBranch.settings?.taxRate ?? 0.15,
      serviceChargeRate: currentBranch.settings?.serviceChargeRate ?? 0,
      city: currentBranch.address?.city || "",
      subcity: currentBranch.address?.subcity || "",
      street: currentBranch.address?.street || "",
      isActive: currentBranch.isActive !== false,
    });
  }

  if (!branchId) {
    return <div className="p-6"><p className="text-muted-foreground">No branch assigned yet.</p></div>;
  }

  if (form === null) return <div className="p-6"><p className="text-muted-foreground">Loading...</p></div>;

  const save = async () => {
    const res = await updateBranch(branchId, {
      name: form.name,
      phone: form.phone,
      address: {
        city: form.city,
        subcity: form.subcity,
        street: form.street,
      },
      settings: {
        openTime: form.openTime,
        closeTime: form.closeTime,
        taxRate: Number(form.taxRate) || 0,
        serviceChargeRate: Number(form.serviceChargeRate) || 0,
      },
      isActive: form.isActive,
    });
    if (res.success) fetchBranch(branchId);
  };

  const handleGenerateQr = async () => {
    if (!selectedTableId) return toast.error("Select a table first");
    setQrLoading(true);
    const res = await regenerateQr(selectedTableId);
    setQrLoading(false);
    if (res.success) {
      // Encoded from the CURRENT origin so printed QR codes stay reachable
      // across dev / LAN-IP changes / production (see lib/qrUrl.js).
      const url = buildCustomerQrUrl(res.data.qrToken);
      setQrUrl(url);
      toast.success("QR token rotated. Print and place it on the table.");
    } else {
      toast.error(res.message || "Failed to rotate QR");
    }
  };

  const handlePrint = () => window.print();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleDownloadQr = () => {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrUrl)}`;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>Table QR Code</title></head>
        <body style="margin:0; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:Arial,sans-serif;">
          <div style="font-size:24px; font-weight:bold; margin-bottom:8px;">${currentBranch?.name || "Faarees Kaafee fi Restoorraantii"}</div>
          <div style="font-size:14px; color:#666; margin-bottom:20px;">Scan to view menu and order</div>
          <img src="${qrImageUrl}" width="320" height="320" />
          <div style="font-size:12px; color:#888; margin-top:12px; word-break:break-all; max-width:400px; text-align:center;">${qrUrl}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="p-4 lg:p-6 max-w-2xl space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Building2 className="size-5" /> Branch Settings
      </h1>

      <Card>
        <CardHeader><CardTitle>{currentBranch?.name}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Subcity</Label>
              <Input value={form.subcity} onChange={(e) => setForm({ ...form, subcity: e.target.value })} />
            </div>
            <div>
              <Label>Street</Label>
              <Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Opens</Label>
              <Input type="time" value={form.openTime} onChange={(e) => setForm({ ...form, openTime: e.target.value })} />
            </div>
            <div>
              <Label>Closes</Label>
              <Input type="time" value={form.closeTime} onChange={(e) => setForm({ ...form, closeTime: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Tax rate (0\u20131)</Label>
              <Input
                type="number" step="0.01" min="0" max="1"
                value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
              />
            </div>
            <div>
              <Label>Service charge (0\u20131)</Label>
              <Input
                type="number" step="0.01" min="0" max="1"
                value={form.serviceChargeRate}
                onChange={(e) => setForm({ ...form, serviceChargeRate: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Branch active (visible to customers)
          </label>
          <Button onClick={save}>Save Settings</Button>
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="size-5 text-primary" /> Customer Table QR Codes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Each table has its own secure QR. Rotating a table's token invalidates the old
            printed QR immediately.
          </p>

          <select
            className="w-full h-9 rounded-md border bg-transparent px-2 text-sm"
            value={selectedTableId}
            onChange={(e) => setSelectedTableId(e.target.value)}
          >
            <option value="">Select table</option>
            {tables.map((t) => (
              <option key={t._id} value={t._id}>Table {t.tableNumber} (capacity {t.capacity})</option>
            ))}
          </select>

          <div className="print-area flex flex-col items-center gap-3">
            {qrUrl ? (
              <>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrUrl)}`}
                  alt="Menu QR"
                  className="border rounded-xl p-2 bg-white"
                  width={220}
                  height={220}
                />
                <div className="w-full space-y-2 print-hide">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                    <LinkIcon className="size-3" />
                    <span className="font-medium">Customer Link:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={qrUrl}
                      className="text-xs bg-gray-50 dark:bg-gray-800"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 flex-shrink-0"
                      onClick={handleCopyLink}
                      title="Copy link"
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 flex-shrink-0"
                      onClick={() => window.open(qrUrl, "_blank")}
                      title="Open link"
                    >
                      <ExternalLink className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No QR generated yet.</p>
            )}
          </div>

          {qrUrl && (
            <div className="print-hide flex gap-2">
              <Button variant="outline" onClick={handleGenerateQr} disabled={qrLoading}>
                <RefreshCw className="size-4" /> Regenerate
              </Button>
              <Button onClick={handlePrint}><Printer className="size-4" /> Print QR</Button>
              <Button variant="outline" onClick={handleDownloadQr}><Download className="size-4" /> Download</Button>
            </div>
          )}
          {!qrUrl && (
            <Button onClick={handleGenerateQr} disabled={qrLoading || !selectedTableId}>
              {qrLoading ? "Generating..." : "Generate QR"}
            </Button>
          )}
        </CardContent>
      </Card>

      <style>{`@media print { .print-hide { display: none; } body { color: #000; } .print-area { justify-content: center; } }`}</style>
    </div>
  );
};

export default BranchSettings;
