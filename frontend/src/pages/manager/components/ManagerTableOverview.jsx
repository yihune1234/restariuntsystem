import { useEffect, useState, useMemo } from "react";
import { useTableStore } from "@/store/useTableStore";
import { useOrderStore } from "@/store/useOrderStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Users,
  Clock,
  AlertCircle,
  CreditCard,
  LayoutGrid,
  List,
  QrCode,
  Copy,
  ExternalLink,
  Link,
  Download,
  Printer,
} from "lucide-react";
import TableDetailsDrawer from "./TableDetailsDrawer";
import { buildCustomerQrUrl } from "@/lib/qrUrl";

const TABLE_STATUS_CONFIG = {
  available: { color: "bg-green-500", label: "Available", textColor: "text-green-600", bgClass: "bg-green-50 border-green-200" },
  occupied: { color: "bg-blue-500", label: "Occupied", textColor: "text-blue-600", bgClass: "bg-blue-50 border-blue-200" },
  ordering: { color: "bg-yellow-500", label: "Ordering", textColor: "text-yellow-600", bgClass: "bg-yellow-50 border-yellow-200" },
  preparing: { color: "bg-orange-500", label: "Preparing", textColor: "text-orange-600", bgClass: "bg-orange-50 border-orange-200" },
  ready: { color: "bg-purple-500", label: "Ready", textColor: "text-purple-600", bgClass: "bg-purple-50 border-purple-200" },
  served: { color: "bg-indigo-500", label: "Served", textColor: "text-indigo-600", bgClass: "bg-indigo-50 border-indigo-200" },
  payment_pending: { color: "bg-red-500", label: "Payment Pending", textColor: "text-red-600", bgClass: "bg-red-50 border-red-200" },
  attention: { color: "bg-pink-500", label: "Needs Attention", textColor: "text-pink-600", bgClass: "bg-pink-50 border-pink-200" },
  cleaning: { color: "bg-gray-400", label: "Cleaning", textColor: "text-gray-500", bgClass: "bg-gray-50 border-gray-200" },
};

const calculateTableStatus = (table, tableOrders) => {
  if (!table) return "available";
  if (table.status === "AVAILABLE") return "available";
  if (table.status === "RESERVED") return "occupied";
  if (table.status === "CLEANING") return "cleaning";

  const hasDelayed = tableOrders.some(o => {
    if (["COMPLETED", "CANCELLED", "DELIVERED", "READY"].includes(o.orderStatus)) return false;
    return Date.now() - new Date(o.createdAt).getTime() > 20 * 60 * 1000;
  });
  const hasUnpaid = tableOrders.some(o =>
    ["UNPAID", "PENDING"].includes(o.paymentStatus) &&
    ["COMPLETED", "DELIVERED", "TAKEN_BY_WAITER"].includes(o.orderStatus)
  );
  const isPreparing = tableOrders.some(o => ["CONFIRMED", "PREPARING"].includes(o.orderStatus));
  const isReady = tableOrders.some(o => o.orderStatus === "READY");
  const isServed = tableOrders.some(o => ["TAKEN_BY_WAITER", "DELIVERED"].includes(o.orderStatus));

  if (hasDelayed || (hasUnpaid && isServed)) return "attention";
  if (hasUnpaid && isServed) return "payment_pending";
  if (isReady) return "ready";
  if (isPreparing) return "preparing";
  if (isServed) return "served";
  if (tableOrders.length > 0 && table.qrToken) return "ordering";
  if (tableOrders.length > 0) return "occupied";
  return "available";
};

const TableCard = ({ table, activeOrders, onClick, onShowQr }) => {
  const statusKey = calculateTableStatus(table, activeOrders);
  const statusConfig = TABLE_STATUS_CONFIG[statusKey] || TABLE_STATUS_CONFIG.available;
  const hasUnpaid = activeOrders.some(o => ["UNPAID", "PENDING"].includes(o.paymentStatus));
  const hasDelayed = activeOrders.some(o => {
    if (["COMPLETED", "CANCELLED", "DELIVERED", "READY"].includes(o.orderStatus)) return false;
    return Date.now() - new Date(o.createdAt).getTime() > 20 * 60 * 1000;
  });

  return (
    <div
      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${statusConfig.bgClass}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`size-3 rounded-full ${statusConfig.color}`} />
          <span className={`text-xs font-medium ${statusConfig.textColor}`}>
            {statusConfig.label}
          </span>
        </div>
        {(hasUnpaid || hasDelayed) && (
          <AlertCircle className="size-4 text-red-500 animate-pulse" />
        )}
      </div>
      <div className="text-lg font-bold">{table.tableNumber}</div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="size-3" />
          <span>{table.capacity} seats</span>
        </div>
        {activeOrders.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {activeOrders.length} order{activeOrders.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>
      {/* QR Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 size-7 opacity-0 group-hover:opacity-100 hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onShowQr(table);
        }}
        title="Show QR Code"
      >
        <QrCode className="size-3.5" />
      </Button>
    </div>
  );
};

const TableListRow = ({ table, activeOrders, onClick, onShowQr }) => {
  const statusKey = calculateTableStatus(table, activeOrders);
  const statusConfig = TABLE_STATUS_CONFIG[statusKey] || TABLE_STATUS_CONFIG.available;
  const totalAmount = activeOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const firstOrderTime = activeOrders.length > 0
    ? new Date(Math.min(...activeOrders.map(o => new Date(o.createdAt))))
    : null;
  const hasUnpaid = activeOrders.some(o => ["UNPAID", "PENDING"].includes(o.paymentStatus));
  const hasDelayed = activeOrders.some(o => {
    if (["COMPLETED", "CANCELLED", "DELIVERED", "READY"].includes(o.orderStatus)) return false;
    return Date.now() - new Date(o.createdAt).getTime() > 20 * 60 * 1000;
  });

  const formatElapsedTime = (date) => {
    if (!date) return "-";
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 border-b hover:bg-muted/50 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      <div className={`size-2.5 rounded-full ${statusConfig.color}`} />
      <div className="w-20 font-medium">{table.tableNumber}</div>
      <div className="flex-1 text-sm text-muted-foreground">Main Hall</div>
      <div className="w-16 text-center text-sm">{table.capacity}</div>
      <div className="w-28 text-center">
        <span className={`text-xs font-medium ${statusConfig.textColor}`}>
          {statusConfig.label}
        </span>
      </div>
      <div className="w-16 text-center text-sm">{activeOrders.length}</div>
      <div className="w-24 text-right text-sm font-medium">
        {totalAmount > 0 ? `${totalAmount.toLocaleString()} ETB` : "-"}
      </div>
      <div className="w-16 text-right text-xs text-muted-foreground">
        {formatElapsedTime(firstOrderTime)}
      </div>
      <div className="w-12 text-right">
        {(hasUnpaid || hasDelayed) && (
          <AlertCircle className="size-4 text-red-500 animate-pulse ml-auto" />
        )}
      </div>
      {/* QR Button */}
      <Button
        variant="ghost"
        size="icon"
        className="size-7 opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onShowQr(table);
        }}
        title="Show QR Code"
      >
        <QrCode className="size-3.5" />
      </Button>
    </div>
  );
};

const QrCodeDialog = ({ table, open, onClose }) => {
  if (!table) return null;

  const customerLink = buildCustomerQrUrl(table.qrToken);
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(customerLink)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(customerLink);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleDownload = async () => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const padding = 60;
        const qrSize = 280;
        const totalWidth = qrSize + padding * 2;
        const totalHeight = qrSize + padding * 2 + 100;
        canvas.width = totalWidth;
        canvas.height = totalHeight;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, totalWidth, totalHeight);
        ctx.fillStyle = "#1a1a1a";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`Table ${table.tableNumber}`, totalWidth / 2, padding + 20);
        ctx.font = "14px Arial";
        ctx.fillStyle = "#666666";
        ctx.fillText("Scan to view menu and order", totalWidth / 2, padding + 45);
        ctx.drawImage(img, padding, padding + 70, qrSize, qrSize);
        const link = document.createElement("a");
        link.download = `table-${table.tableNumber}-qr.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      };
      img.src = qrImageUrl;
      toast.success("QR code downloaded!");
    } catch (err) {
      toast.error("Failed to download QR");
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Table ${table.tableNumber} - QR Code</title>
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
            .restaurant-name { font-size: 24px; font-weight: bold; color: #1a1a1a; margin-bottom: 8px; text-align: center; }
            .table-name { font-size: 32px; font-weight: bold; color: #333; margin-bottom: 8px; text-align: center; }
            .subtitle { font-size: 14px; color: #666; margin-bottom: 30px; text-align: center; }
            .qr-container { display: flex; justify-content: center; margin-bottom: 20px; }
            .qr-container img { width: 280px; height: 280px; }
            .link-text { font-size: 12px; color: #888; word-break: break-all; max-width: 400px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="restaurant-name">Faarees Kaafee fi Restoorraantii</div>
          <div class="table-name">Table ${table.tableNumber}</div>
          <div class="subtitle">Scan to view menu and order</div>
          <div class="qr-container"><img src="${qrImageUrl}" width="280" height="280" /></div>
          <div class="link-text">${customerLink}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="size-5" /> Table {table.tableNumber} QR Code
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-4">
          <img
            src={qrImageUrl}
            alt="QR Code"
            className="w-[280px] h-[280px] border rounded-lg p-2 bg-white"
          />
          <p className="text-xs text-muted-foreground text-center">Scan to view menu and order</p>
          
          {/* Customer Link Display */}
          <div className="w-full space-y-2">
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
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="size-4" /> Download
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="size-4" /> Print
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ManagerTableOverview = () => {
  const { tables, getTables, isLoading: tablesLoading } = useTableStore();
  const { orders, getOrders, isLoading: ordersLoading } = useOrderStore();
  const [selectedTable, setSelectedTable] = useState(null);
  const [qrTable, setQrTable] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [statusFilter, setStatusFilter] = useState(undefined);

  useEffect(() => {
    getTables();
    getOrders();
  }, [getTables, getOrders]);

  const tableOrderMap = useMemo(() => {
    const map = {};
    tables.forEach(table => {
      map[table._id] = orders.filter(o => o.tableId === table._id && !["COMPLETED", "CANCELLED"].includes(o.orderStatus));
    });
    return map;
  }, [tables, orders]);

  const statusCounts = useMemo(() => {
    const counts = {
      all: tables.length,
      available: 0,
      occupied: 0,
      ordering: 0,
      preparing: 0,
      ready: 0,
      served: 0,
      payment_pending: 0,
      attention: 0,
      cleaning: 0,
    };
    tables.forEach(table => {
      const status = calculateTableStatus(table, tableOrderMap[table._id] || []);
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [tables, tableOrderMap]);

  const statusTabs = [
    { key: undefined, label: "All", count: statusCounts.all },
    { key: "available", label: "Free", count: statusCounts.available },
    { key: "ordering", label: "Ordering", count: statusCounts.ordering },
    { key: "preparing", label: "Preparing", count: statusCounts.preparing },
    { key: "ready", label: "Ready", count: statusCounts.ready },
    { key: "attention", label: "Alert", count: statusCounts.attention + statusCounts.payment_pending },
  ];

  const filteredTables = useMemo(() => {
    if (statusFilter === undefined) return tables;
    return tables.filter(table => {
      const status = calculateTableStatus(table, tableOrderMap[table._id] || []);
      return status === statusFilter;
    });
  }, [tables, tableOrderMap, statusFilter]);

  if (tablesLoading || ordersLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Floor Overview
            </CardTitle>
            <div className="flex border rounded-lg overflow-hidden">
              <Button variant="ghost" size="sm" className={`h-8 px-3 ${viewMode === "grid" ? "bg-muted" : ""}`} onClick={() => setViewMode("grid")}>
                <LayoutGrid className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" className={`h-8 px-3 ${viewMode === "list" ? "bg-muted" : ""}`} onClick={() => setViewMode("list")}>
                <List className="size-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            {statusTabs.map(tab => (
              <Badge
                key={tab.key || "all"}
                variant={statusFilter === tab.key ? "default" : "outline"}
                className={`cursor-pointer px-3 py-1 ${
                  tab.key === "attention" && tab.count > 0 ? "border-pink-500 text-pink-600" : ""
                }`}
              >
                {tab.label} ({tab.count})
              </Badge>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {tables.length === 0 ? (
            <EmptyState title="No tables" description="Tables will appear here once configured." />
          ) : filteredTables.length === 0 ? (
            <EmptyState title="No tables match filter" description="Try selecting a different status filter." />
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredTables.map(table => (
                <TableCard
                  key={table._id}
                  table={table}
                  activeOrders={tableOrderMap[table._id] || []}
                  onClick={() => setSelectedTable(table)}
                  onShowQr={setQrTable}
                />
              ))}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/50">
                <div className="w-3" />
                <div className="w-20">Table</div>
                <div className="flex-1">Area</div>
                <div className="w-16 text-center">Seats</div>
                <div className="w-28 text-center">Status</div>
                <div className="w-16 text-center">Orders</div>
                <div className="w-24 text-right">Total</div>
                <div className="w-16 text-right">Time</div>
                <div className="w-12 text-right">!</div>
                <div className="w-8 text-right">QR</div>
              </div>
              {filteredTables.map(table => (
                <TableListRow
                  key={table._id}
                  table={table}
                  activeOrders={tableOrderMap[table._id] || []}
                  onClick={() => setSelectedTable(table)}
                  onShowQr={setQrTable}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TableDetailsDrawer
        table={selectedTable}
        orders={orders}
        open={!!selectedTable}
        onClose={() => setSelectedTable(null)}
        onOrderClick={() => {}}
      />

      <QrCodeDialog
        table={qrTable}
        open={!!qrTable}
        onClose={() => setQrTable(null)}
      />
    </>
  );
};

export default ManagerTableOverview;
