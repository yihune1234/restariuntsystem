import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { getDefaultOrganizationId } from "@/config/defaultOrg";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import axiosInstance from "@/axios/axiosInstace";
import {
  DollarSign,
  CreditCard,
  Percent,
  Shield,
  Clock,
  QrCode,
  Bell,
  AlertTriangle,
  RotateCcw,
  Save,
} from "lucide-react";

const SettingsSection = ({ title, description, icon: Icon, children }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        {Icon && <Icon className="size-5" />}
        {title}
      </CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent className="space-y-4">{children}</CardContent>
  </Card>
);

const ToggleRow = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex-1">
      <p className="font-medium text-sm">{label}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

const NumberRow = ({ label, description, value, onChange, min, max, step = 0.01 }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex-1">
      <p className="font-medium text-sm">{label}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    <Input
      type="number"
      className="w-24 text-right"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      min={min}
      max={max}
      step={step}
    />
  </div>
);

export const OrganizationSettingsPage = () => {
  const { authUser } = useAuthStore();
  const organizationId = getDefaultOrganizationId(authUser);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (organizationId) {
      fetchSettings();
    }
  }, [organizationId]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.get(`/organizations/${organizationId}/settings`);
      setSettings(res.data?.data);
    } catch (err) {
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = (path, value) => {
    setSettings((prev) => {
      const newSettings = { ...prev };
      const keys = path.split(".");
      let current = newSettings;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await axiosInstance.patch(`/organizations/${organizationId}/settings`, settings);
      toast.success("Settings saved successfully");
      setHasChanges(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset all settings to defaults? This cannot be undone.")) return;
    try {
      const res = await axiosInstance.post(`/organizations/${organizationId}/settings/reset`);
      setSettings(res.data?.data);
      toast.success("Settings reset to defaults");
    } catch (err) {
      toast.error("Failed to reset settings");
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading settings...</div>;
  }

  if (!settings) {
    return <div className="p-6">Failed to load settings</div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organization Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure business rules, permissions, and operational parameters
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="size-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            <Save className="size-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <SettingsSection
            title="Business Information"
            description="Basic business configuration"
            icon={DollarSign}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input
                  value={settings.currency}
                  onChange={(e) => updateSetting("currency", e.target.value.toUpperCase())}
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input
                  value={settings.timezone}
                  onChange={(e) => updateSetting("timezone", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <Label>Opening Time</Label>
                <Input
                  type="time"
                  value={settings.operatingHours?.open || "07:00"}
                  onChange={(e) => updateSetting("operatingHours.open", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Closing Time</Label>
                <Input
                  type="time"
                  value={settings.operatingHours?.close || "22:00"}
                  onChange={(e) => updateSetting("operatingHours.close", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <Label>Business Days</Label>
              <div className="flex gap-2 flex-wrap">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                  <Button
                    key={day}
                    variant={settings.businessDays?.includes(index) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const days = settings.businessDays || [];
                      if (days.includes(index)) {
                        updateSetting("businessDays", days.filter((d) => d !== index));
                      } else {
                        updateSetting("businessDays", [...days, index].sort());
                      }
                    }}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Default Rates"
            description="Tax and service charge rates applied to new branches"
            icon={Percent}
          >
            <NumberRow
              label="Default Tax Rate"
              description="Applied to all orders unless overridden"
              value={settings.defaultTaxRate || 0.15}
              onChange={(v) => updateSetting("defaultTaxRate", v)}
              min={0}
              max={1}
            />
            <NumberRow
              label="Default Service Charge Rate"
              description="Optional service charge percentage"
              value={settings.defaultServiceChargeRate || 0}
              onChange={(v) => updateSetting("defaultServiceChargeRate", v)}
              min={0}
              max={1}
            />
          </SettingsSection>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <SettingsSection
            title="Payment Methods"
            description="Enable or disable accepted payment methods"
            icon={CreditCard}
          >
            <ToggleRow
              label="Cash"
              description="Accept cash payments"
              checked={settings.enabledPaymentMethods?.cash ?? true}
              onChange={(v) => updateSetting("enabledPaymentMethods.cash", v)}
            />
            <ToggleRow
              label="Card"
              description="Accept card payments via POS terminal"
              checked={settings.enabledPaymentMethods?.card ?? true}
              onChange={(v) => updateSetting("enabledPaymentMethods.card", v)}
            />
            <ToggleRow
              label="Chapa"
              description="Accept Chapa digital payments"
              checked={settings.enabledPaymentMethods?.Chapa ?? true}
              onChange={(v) => updateSetting("enabledPaymentMethods.Chapa", v)}
            />
            <ToggleRow
              label="Telebirr"
              description="Accept Telebirr digital payments"
              checked={settings.enabledPaymentMethods?.Telebirr ?? true}
              onChange={(v) => updateSetting("enabledPaymentMethods.Telebirr", v)}
            />
          </SettingsSection>

          <SettingsSection
            title="Cash Management"
            description="Configure cash handling rules"
            icon={DollarSign}
          >
            <ToggleRow
              label="Require Opening Cash"
              description="Staff must declare opening cash at start of shift"
              checked={settings.cashManagement?.requireOpeningCash ?? true}
              onChange={(v) => updateSetting("cashManagement.requireOpeningCash", v)}
            />
            <ToggleRow
              label="Require Closing Cash"
              description="Staff must declare closing cash at end of shift"
              checked={settings.cashManagement?.requireClosingCash ?? true}
              onChange={(v) => updateSetting("cashManagement.requireClosingCash", v)}
            />
            <ToggleRow
              label="Allow Negative Difference"
              description="Permit cash shortages in register"
              checked={settings.cashManagement?.allowNegativeDifference ?? false}
              onChange={(v) => updateSetting("cashManagement.allowNegativeDifference", v)}
            />
            <NumberRow
              label="Max Cash Difference"
              description="Maximum allowed variance before requiring explanation"
              value={settings.cashManagement?.maxCashDifference ?? 500}
              onChange={(v) => updateSetting("cashManagement.maxCashDifference", v)}
              min={0}
              max={1000000}
              step={100}
            />
          </SettingsSection>

          <SettingsSection
            title="Discount Settings"
            description="Control discount limits and approval requirements"
            icon={Percent}
          >
            <NumberRow
              label="Maximum Discount"
              description="Absolute maximum discount percentage allowed"
              value={settings.discountSettings?.maxDiscountPercent ?? 0.3}
              onChange={(v) => updateSetting("discountSettings.maxDiscountPercent", v)}
              min={0}
              max={1}
            />
            <NumberRow
              label="Manager Maximum Discount"
              description="Maximum discount a manager can apply"
              value={settings.discountSettings?.managerMaxDiscountPercent ?? 0.2}
              onChange={(v) => updateSetting("discountSettings.managerMaxDiscountPercent", v)}
              min={0}
              max={1}
            />
            <NumberRow
              label="Requires Approval Above"
              description="Discounts above this % need owner approval"
              value={settings.discountSettings?.requiresApprovalAbovePercent ?? 0.15}
              onChange={(v) => updateSetting("discountSettings.requiresApprovalAbovePercent", v)}
              min={0}
              max={1}
            />
            <ToggleRow
              label="Allow Employee Discounts"
              description="Allow non-manager staff to apply discounts"
              checked={settings.discountSettings?.allowEmployeeDiscounts ?? true}
              onChange={(v) => updateSetting("discountSettings.allowEmployeeDiscounts", v)}
            />
          </SettingsSection>

          <SettingsSection
            title="Refund Settings"
            description="Configure refund policies"
            icon={RotateCcw}
          >
            <ToggleRow
              label="Allow Partial Refunds"
              description="Allow refunding part of an order"
              checked={settings.refundSettings?.allowPartialRefunds ?? true}
              onChange={(v) => updateSetting("refundSettings.allowPartialRefunds", v)}
            />
            <NumberRow
              label="Manager Approval Threshold"
              description="Refunds above this amount need manager approval (ETB)"
              value={settings.refundSettings?.requiresManagerApprovalAbove ?? 50000}
              onChange={(v) => updateSetting("refundSettings.requiresManagerApprovalAbove", v)}
              min={0}
              max={10000000}
              step={1000}
            />
            <NumberRow
              label="Owner Approval Threshold"
              description="Refunds above this amount need owner approval (ETB)"
              value={settings.refundSettings?.requiresOwnerApprovalAbove ?? 200000}
              onChange={(v) => updateSetting("refundSettings.requiresOwnerApprovalAbove", v)}
              min={0}
              max={10000000}
              step={1000}
            />
          </SettingsSection>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <SettingsSection
            title="Order Management"
            description="Configure order handling rules"
            icon={Shield}
          >
            <ToggleRow
              label="Allow Waiter Order Edit"
              description="Waiters can modify orders after creation"
              checked={settings.orderSettings?.allowWaiterOrderEdit ?? true}
              onChange={(v) => updateSetting("orderSettings.allowWaiterOrderEdit", v)}
            />
            <ToggleRow
              label="Allow Customer Order Edit"
              description="Customers can modify their own orders"
              checked={settings.orderSettings?.allowCustomerOrderEdit ?? false}
              onChange={(v) => updateSetting("orderSettings.allowCustomerOrderEdit", v)}
            />
            <NumberRow
              label="Max Order Edit Time"
              description="Minutes after which orders cannot be edited"
              value={settings.orderSettings?.maxOrderEditTimeMinutes ?? 5}
              onChange={(v) => updateSetting("orderSettings.maxOrderEditTimeMinutes", v)}
              min={0}
              max={60}
              step={1}
            />
            <ToggleRow
              label="Auto-Confirm Orders"
              description="Automatically confirm orders without manager review"
              checked={settings.orderSettings?.autoConfirmOrders ?? false}
              onChange={(v) => updateSetting("orderSettings.autoConfirmOrders", v)}
            />
          </SettingsSection>

          <SettingsSection
            title="Cancellation Policy"
            description="Control when orders can be cancelled"
            icon={AlertTriangle}
          >
            <ToggleRow
              label="Allow Cancellation After Preparation"
              description="Permit cancelling orders that are being prepared"
              checked={settings.cancellationSettings?.allowCancellationAfterPrep ?? false}
              onChange={(v) => updateSetting("cancellationSettings.allowCancellationAfterPrep", v)}
            />
            <ToggleRow
              label="Allow Cancellation After Delivery"
              description="Permit cancelling orders that have been delivered"
              checked={settings.cancellationSettings?.allowCancellationAfterDelivery ?? false}
              onChange={(v) => updateSetting("cancellationSettings.allowCancellationAfterDelivery", v)}
            />
            <ToggleRow
              label="Require Cancellation Reason"
              description="Staff must provide a reason when cancelling"
              checked={settings.cancellationSettings?.requireReasonForCancellation ?? true}
              onChange={(v) => updateSetting("cancellationSettings.requireReasonForCancellation", v)}
            />
          </SettingsSection>

          <SettingsSection
            title="QR / Customer Settings"
            description="Customer-facing QR ordering configuration"
            icon={QrCode}
          >
            <ToggleRow
              label="Require Customer Login"
              description="Customers must login before ordering"
              checked={settings.qrSettings?.requireCustomerLogin ?? false}
              onChange={(v) => updateSetting("qrSettings.requireCustomerLogin", v)}
            />
            <ToggleRow
              label="Multiple Sessions Per Table"
              description="Allow multiple customers to start separate sessions at same table"
              checked={settings.qrSettings?.allowMultipleSessionsPerTable ?? true}
              onChange={(v) => updateSetting("qrSettings.allowMultipleSessionsPerTable", v)}
            />
            <ToggleRow
              label="Require Security Code"
              description="Require security code for order tracking"
              checked={settings.qrSettings?.requireSecurityCode ?? true}
              onChange={(v) => updateSetting("qrSettings.requireSecurityCode", v)}
            />
            <NumberRow
              label="Session Duration"
              description="How many hours a customer session remains active"
              value={settings.qrSettings?.sessionDurationHours ?? 6}
              onChange={(v) => updateSetting("qrSettings.sessionDurationHours", v)}
              min={1}
              max={24}
              step={1}
            />
          </SettingsSection>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SettingsSection
            title="Fraud Detection"
            description="Automatic monitoring for suspicious activity"
            icon={Shield}
          >
            <ToggleRow
              label="Enable Automatic Detection"
              description="Automatically flag suspicious activities"
              checked={settings.fraudDetection?.enableAutomaticDetection ?? true}
              onChange={(v) => updateSetting("fraudDetection.enableAutomaticDetection", v)}
            />
            <NumberRow
              label="Excessive Cancellation Threshold"
              description="Flag when employee cancels this many orders"
              value={settings.fraudDetection?.excessiveCancellationThreshold ?? 5}
              onChange={(v) => updateSetting("fraudDetection.excessiveCancellationThreshold", v)}
              min={1}
              max={100}
              step={1}
            />
            <NumberRow
              label="High Discount Threshold"
              description="Flag discounts above this percentage"
              value={settings.fraudDetection?.highDiscountThreshold ?? 0.3}
              onChange={(v) => updateSetting("fraudDetection.highDiscountThreshold", v)}
              min={0}
              max={1}
            />
            <NumberRow
              label="Excessive Refund Threshold"
              description="Flag when employee processes this many refunds"
              value={settings.fraudDetection?.excessiveRefundThreshold ?? 3}
              onChange={(v) => updateSetting("fraudDetection.excessiveRefundThreshold", v)}
              min={1}
              max={100}
              step={1}
            />
          </SettingsSection>

          <SettingsSection
            title="Write-Off Settings"
            description="Configure bill write-off rules"
            icon={AlertTriangle}
          >
            <ToggleRow
              label="Allow Write-Off"
              description="Permit writing off unpaid bills"
              checked={settings.writeOffSettings?.allowWriteOff ?? true}
              onChange={(v) => updateSetting("writeOffSettings.allowWriteOff", v)}
            />
            <ToggleRow
              label="Require Owner Approval"
              description="All write-offs need owner approval"
              checked={settings.writeOffSettings?.requiresOwnerApproval ?? true}
              onChange={(v) => updateSetting("writeOffSettings.requiresOwnerApproval", v)}
            />
            <NumberRow
              label="Max Write-Off Amount"
              description="Maximum amount that can be written off (ETB)"
              value={settings.writeOffSettings?.maxWriteOffAmount ?? 10000}
              onChange={(v) => updateSetting("writeOffSettings.maxWriteOffAmount", v)}
              min={0}
              max={1000000}
              step={1000}
            />
          </SettingsSection>

          <SettingsSection
            title="Notifications"
            description="Configure system notifications"
            icon={Bell}
          >
            <ToggleRow
              label="Email on High-Value Order"
              description="Notify owner when large orders are placed"
              checked={settings.notificationSettings?.emailOnHighValueOrder ?? true}
              onChange={(v) => updateSetting("notificationSettings.emailOnHighValueOrder", v)}
            />
            <ToggleRow
              label="Email on Large Cancellation"
              description="Notify owner when large orders are cancelled"
              checked={settings.notificationSettings?.emailOnLargeCancellation ?? true}
              onChange={(v) => updateSetting("notificationSettings.emailOnLargeCancellation", v)}
            />
            <ToggleRow
              label="Notify Manager on Complaint"
              description="Alert manager when customer submits complaint"
              checked={settings.notificationSettings?.notifyManagerOnComplaint ?? true}
              onChange={(v) => updateSetting("notificationSettings.notifyManagerOnComplaint", v)}
            />
            <ToggleRow
              label="Notify Owner on Fraud Alert"
              description="Alert owner when suspicious activity detected"
              checked={settings.notificationSettings?.notifyOwnerOnFraudAlert ?? true}
              onChange={(v) => updateSetting("notificationSettings.notifyOwnerOnFraudAlert", v)}
            />
          </SettingsSection>
        </TabsContent>
      </Tabs>
    </div>
  );
};