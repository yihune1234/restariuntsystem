import React, { useEffect, useState, useRef } from "react";
import { useTableStore } from "@/store/useTableStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { QrCode, Printer, RefreshCw, Plus, Trash2, Edit2, Check, Download } from "lucide-react";

const QRPrintCard = ({ qrUrl, title, subtitle }) => {
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
            }
            .qr-container img {
              border: 8px solid #fff;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
              border-radius: 16px;
            }
            @media print {
              body { padding: 20px; }
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
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  if (!qrUrl) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={printRef} className="flex flex-col items-center p-6 bg-white rounded-xl border-2 border-dashed">
        <p className="text-lg font-bold text-center">{title}</p>
        {subtitle && <p className="text-sm text-muted-foreground text-center">{subtitle}</p>}
        <div className="my-4">
          <img
            src={qrUrl}
            alt="QR Code"
            width={200}
            height={200}
            className="rounded-lg"
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">Scan to view menu and order</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="size-4" /> Download PNG
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="size-4" /> Print
        </Button>
      </div>
    </div>
  );
};

const TableManagement = () => {
  const { tables, getTables, createTable, updateTable, deleteTable, regenerateQr } = useTableStore();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [deletingTable, setDeletingTable] = useState(null);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [selectedTableForQr, setSelectedTableForQr] = useState(null);

  const [newTable, setNewTable] = useState({ tableNumber: "", capacity: 4 });
  const [editForm, setEditForm] = useState({ tableNumber: "", capacity: 4, isActive: true });

  useEffect(() => {
    getTables();
  }, [getTables]);

  const handleCreateTable = async () => {
    if (!newTable.tableNumber.trim()) {
      toast.error("Table name/number is required");
      return;
    }
    const res = await createTable({ tableNumber: newTable.tableNumber, capacity: newTable.capacity });
    if (res.success) {
      setShowCreateDialog(false);
      setNewTable({ tableNumber: "", capacity: 4 });
    }
  };

  const handleEditTable = async () => {
    if (!editForm.tableNumber.trim()) {
      toast.error("Table name/number is required");
      return;
    }
    const res = await updateTable(editingTable._id, {
      tableNumber: editForm.tableNumber,
      capacity: editForm.capacity,
      isActive: editForm.isActive,
    });
    if (res.success) {
      setShowEditDialog(false);
      setEditingTable(null);
    }
  };

  const handleDeleteTable = async () => {
    const res = await deleteTable(deletingTable._id);
    if (res.success) {
      setShowDeleteDialog(false);
      setDeletingTable(null);
    }
  };

  const openEditDialog = (table) => {
    setEditingTable(table);
    setEditForm({ tableNumber: table.tableNumber, capacity: table.capacity || 4, isActive: table.isActive });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (table) => {
    setDeletingTable(table);
    setShowDeleteDialog(true);
  };

  const handleGenerateTableQr = async (tableId) => {
    setSelectedTableId(tableId);
    setQrLoading(true);
    const res = await regenerateQr(tableId);
    setQrLoading(false);
    if (res.success) {
      const token = res.data.qrToken;
      const baseUrl = window.location.origin.replace(/\/+$/, "");
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(baseUrl + "/customer/qr?token=" + token)}`);
      setSelectedTableForQr(tables.find(t => t._id === tableId));
      toast.success("QR code generated");
    }
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

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tables</CardTitle>
          </CardHeader>
          <CardContent>
            {tables.length === 0 ? (
              <p className="text-muted-foreground text-sm">No tables yet. Create your first table to get started.</p>
            ) : (
              <div className="space-y-3">
                {tables.map((table) => (
                  <div key={table._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold">{table.tableNumber}</p>
                        <p className="text-xs text-muted-foreground">Capacity: {table.capacity || 4}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={table.isActive ? "default" : "secondary"}>
                        {table.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(table)}>
                        <Edit2 className="size-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openDeleteDialog(table)}>
                        <Trash2 className="size-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="size-5" /> Generate Table QR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a table to generate or regenerate its QR code. Print and place on the table.
            </p>
            <div className="flex gap-3 items-center flex-wrap">
              <select
                className="flex-1 min-w-[200px] h-10 rounded-md border bg-transparent px-3 text-sm"
                value={selectedTableId}
                onChange={(e) => {
                  setSelectedTableId(e.target.value);
                  setQrUrl("");
                  setSelectedTableForQr(null);
                }}
              >
                <option value="">Select a table</option>
                {tables.filter(t => t.isActive).map((t) => (
                  <option key={t._id} value={t._id}>Table {t.tableNumber}</option>
                ))}
              </select>
              <Button
                onClick={() => selectedTableId && handleGenerateTableQr(selectedTableId)}
                disabled={!selectedTableId || qrLoading}
              >
                <QrCode className="size-4" /> {qrLoading ? "Generating..." : "Generate QR"}
              </Button>
            </div>

            {qrUrl && selectedTableForQr && (
              <QRPrintCard
                qrUrl={qrUrl}
                title={`Table ${selectedTableForQr.tableNumber}`}
                subtitle="Scan to view menu and order"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Table</DialogTitle>
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
