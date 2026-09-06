import React, { useEffect, useState, useRef } from "react";
import { useTableStore } from "@/store/useTableStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { QrCode, Printer, RefreshCw, Plus, Trash2, Edit2, Check, Download, Copy, ExternalLink, Link } from "lucide-react";
import { buildCustomerQrUrl } from "@/lib/qrUrl";

const QRPrintCard = ({ qrUrl, title, subtitle, customerLink }) => {
  const printRef = useRef(null);

  const handleDownload = async () => {
    if (!qrUrl) return;
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.crossOrigin = "anonymous";
      img.onload = () => {
        const padding = 60;
        const qrSize = 280;
        const totalWidth = qrSize + padding * 2;
        const totalHeight = qrSize + padding * 2 + 80;

        canvas.width = totalWidth;
        canvas.height = totalHeight;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, totalWidth, totalHeight);

        ctx.fillStyle = "#1a1a1a";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.fillText(title, totalWidth / 2, padding + 20);

        ctx.font = "14px Arial";
        ctx.fillStyle = "#666666";
        ctx.fillText(subtitle, totalWidth / 2, padding + 45);

        ctx.drawImage(img, padding, padding + 55, qrSize, qrSize);

        const link = document.createElement("a");
        link.download = `${title.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      };
      img.onerror = () => {
        toast.error("Failed to load QR image for download");
      };
      img.src = qrUrl;
    } catch (err) {
      toast.error("Failed to download QR");
    }
  };

  const handlePrint = () => {
    if (!qrUrl) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - QR Code</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              font-family: Arial, sans-serif;
              padding: 40px;
            }
            .restaurant-name {
              font-size: 24px;
              font-weight: bold;
              color: #1a1a1a;
              margin-bottom: 8px;
              text-align: center;
            }
            .table-name {
              font-size: 32px;
              font-weight: bold;
              color: #333;
              margin-bottom: 8px;
              text-align: center;
            }
            .subtitle {
              font-size: 14px;
              color: #666;
              margin-bottom: 30px;
              text-align: center;
            }
            .qr-container {
              display: flex;
              justify-content: center;
              margin-bottom: 20px;
            }
            .qr-container img {
              width: 280px;
              height: 280px;
            }
            .link-text {
              font-size: 12px;
              color: #888;
              word-break: break-all;
              max-width: 400px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="restaurant-name">Faarees Kaafee fi Restoorraantii</div>
          <div class="table-name">${title}</div>
          <div class="subtitle">Scan to view menu and order</div>
          <div class="qr-container">
            <img src="${qrUrl}" width="280" height="280" />
          </div>
          <div class="link-text">${customerLink}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleCopyLink = async () => {
    if (!customerLink) return;
    try {
      await navigator.clipboard.writeText(customerLink);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="flex flex-col items-center">
      <img
        src={qrUrl}
        alt="QR Code"
        className="w-[280px] h-[280px] border rounded-lg p-2 bg-white"
      />
      <p className="text-xs text-muted-foreground text-center mt-2">Scan to view menu and order</p>
      
      {/* Customer Link Display */}
      {customerLink && (
        <div className="w-full mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link className="size-3" />
            <span className="font-medium">Customer Link:</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={customerLink}
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
              onClick={() => window.open(customerLink, "_blank")}
              title="Open link"
            >
              <ExternalLink className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
      
      <div className="flex gap-2 mt-4">
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="size-4" /> Download
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="size-4" /> Print
        </Button>
      </div>
    </div>
  );
};

const TableManagement = () => {
  const { tables, getTables, createTable, updateTable, deleteTable, regenerateQr, isLoading } = useTableStore();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [deletingTable, setDeletingTable] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [qrCustomerLink, setQrCustomerLink] = useState("");
  const [selectedTableForQr, setSelectedTableForQr] = useState(null);
  const [newTable, setNewTable] = useState({ tableNumber: "", capacity: 4 });
  const [editForm, setEditForm] = useState({ tableNumber: "", capacity: 4, isActive: true });

  useEffect(() => {
    getTables();
  }, [getTables]);

  const handleCreateTable = async () => {
    if (!newTable.tableNumber.trim()) {
      toast.error("Table number is required");
      return;
    }
    const res = await createTable(newTable);
    if (res.success) {
      setShowCreateDialog(false);
      setNewTable({ tableNumber: "", capacity: 4 });
    }
  };

  const handleEditTable = async () => {
    if (!editForm.tableNumber.trim()) {
      toast.error("Table number is required");
      return;
    }
    const res = await updateTable(selectedTableId, editForm);
    if (res.success) {
      setShowEditDialog(false);
      setSelectedTableId(null);
    }
  };

  const handleDeleteTable = async () => {
    const res = await deleteTable(deletingTable._id);
    if (res.success) {
      setShowDeleteDialog(false);
      setDeletingTable(null);
    }
  };

  const handleRegenerateQr = async (tableId) => {
    setQrLoading(true);
    const res = await regenerateQr(tableId);
    if (res.success) {
      const url = buildCustomerQrUrl(res.data.qrToken);
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}`);
      setQrCustomerLink(url);
      setSelectedTableForQr(tables.find(t => t._id === tableId));
      toast.success("QR code regenerated");
    }
    setQrLoading(false);
  };

  const handleGenerateQr = (table) => {
    const url = buildCustomerQrUrl(table.qrToken);
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}`);
    setQrCustomerLink(url);
    setSelectedTableForQr(table);
  };

  const handleOpenEdit = (table) => {
    setSelectedTableId(table._id);
    setEditForm({
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      isActive: table.isActive,
    });
    setShowEditDialog(true);
  };

  const handleOpenDelete = (table) => {
    setDeletingTable(table);
    setShowDeleteDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <QrCode className="size-5" /> Tables & QR Codes
        </h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="size-4" /> Add Table
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tables List */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="size-5 text-primary" /> All Tables
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground">Loading tables...</p>
              ) : tables.length === 0 ? (
                <p className="text-muted-foreground">No tables yet. Add your first table to get started.</p>
              ) : (
                <div className="space-y-2">
                  {tables.map((table) => (
                    <div
                      key={table._id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <QrCode className="size-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{table.tableNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            Capacity: {table.capacity} | Status: {table.status}
                          </p>
                          {table.qrToken && (
                            <p className="text-xs text-blue-500 truncate max-w-[200px]">
                              Token: {table.qrToken}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => handleGenerateQr(table)}
                          title="View QR Code"
                        >
                          <QrCode className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => handleRegenerateQr(table._id)}
                          title="Regenerate QR Token"
                        >
                          <RefreshCw className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => handleOpenEdit(table)}
                          title="Edit Table"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-red-500 hover:text-red-600"
                          onClick={() => handleOpenDelete(table)}
                          title="Delete Table"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* QR Code Display */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="size-5 text-primary" /> Table QR Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              {qrUrl ? (
                <QRPrintCard
                  qrUrl={qrUrl}
                  title={`Table ${selectedTableForQr?.tableNumber || ""}`}
                  subtitle="Scan to view menu and order"
                  customerLink={qrCustomerLink}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <QrCode className="size-16 mx-auto mb-4 opacity-50" />
                  <p>Select a table and click the QR icon to generate its code</p>
                  <p className="text-xs mt-2">The QR code will include a direct link to the menu</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Generate Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="size-5" /> Generate Table QR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <select
                  className="flex-1 border rounded-md px-3 py-2 text-sm bg-background"
                  value={selectedTableId || ""}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                >
                  <option value="">Select a table...</option>
                  {tables.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.tableNumber} (Capacity: {t.capacity})
                    </option>
                  ))}
                </select>
                <Button
                  onClick={() => {
                    const table = tables.find((t) => t._id === selectedTableId);
                    if (table) handleGenerateQr(table);
                  }}
                  disabled={!selectedTableId || qrLoading}
                >
                  <QrCode className="size-4" /> {qrLoading ? "Generating..." : "Generate QR"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Table Name/Number</Label>
              <Input
                placeholder="e.g., Table 01, VIP 01, Outdoor 01"
                value={newTable.tableNumber}
                onChange={(e) => setNewTable({ ...newTable, tableNumber: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Capacity (optional)</Label>
              <Input
                type="number"
                min="1"
                value={newTable.capacity}
                onChange={(e) => setNewTable({ ...newTable, capacity: parseInt(e.target.value) || 4 })}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateTable}><Check className="size-4" /> Create Table</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Table Name/Number</Label>
              <Input
                value={editForm.tableNumber}
                onChange={(e) => setEditForm({ ...editForm, tableNumber: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input
                type="number"
                min="1"
                value={editForm.capacity}
                onChange={(e) => setEditForm({ ...editForm, capacity: parseInt(e.target.value) || 4 })}
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
              />
              <Label htmlFor="isActive">Active (QR code works)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEditTable}><Check className="size-4" /> Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Table</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete <strong>{deletingTable?.tableNumber}</strong>?</p>
            <p className="text-sm text-muted-foreground mt-2">This will also invalidate its QR code. Orders using this table will keep their data.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteTable}><Trash2 className="size-4" /> Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TableManagement;
