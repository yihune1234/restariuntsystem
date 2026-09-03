import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axiosInstance from '@/axios/axiosInstace';

const OfflineEntryForm = ({ onSuccess }) => {
  const [operationType, setOperationType] = useState('ORDER');
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let payload = {
        operationType,
        source: 'MANUAL',
        originalTransactionTime: formData.originalTransactionTime || new Date().toISOString(),
        reason: formData.reason || 'Manual entry',
        outageType: formData.outageType || 'OTHER',
        notes: formData.notes || '',
      };

      if (operationType === 'ORDER') {
        if (!formData.items || formData.items.length === 0) {
          toast.error('Items are required for order');
          setLoading(false);
          return;
        }
        let items;
        try {
          items = typeof formData.items === 'string' ? JSON.parse(formData.items) : formData.items;
        } catch {
          toast.error('Invalid items format');
          setLoading(false);
          return;
        }

        const subtotal = parseFloat(formData.subtotal) || 0;
        const tax = parseFloat(formData.tax) || 0;
        const discount = parseFloat(formData.discount) || 0;
        const total = subtotal + tax - discount;

        payload = {
          ...payload,
          items: items.map(item => ({
            foodItemId: item.foodItemId || item.menuItemId,
            foodNameSnapshot: item.name || item.foodName || 'Unknown',
            unitPriceSnapshot: parseFloat(item.price) || 0,
            quantity: parseInt(item.quantity) || 1,
            subtotal: parseFloat(item.subtotal) || (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1),
          })),
          subtotal,
          tax,
          discount,
          total,
          paymentMethod: formData.paymentMethod || 'CASH',
          tableId: formData.tableId || null,
          customerCount: parseInt(formData.customerCount) || 1,
        };
      } else if (operationType === 'PAYMENT') {
        if (!formData.orderId) {
          toast.error('Order ID is required for payment');
          setLoading(false);
          return;
        }
        payload = {
          ...payload,
          total: parseFloat(formData.amount) || 0,
          paymentMethod: formData.paymentMethod || 'CASH',
          paymentData: {
            orderId: formData.orderId,
            amount: parseFloat(formData.amount) || 0,
            paymentMethod: formData.paymentMethod || 'CASH',
            transactionReference: formData.reference || `MANUAL-${Date.now()}`,
          },
        };
      } else if (operationType === 'STOCK') {
        if (!formData.foodItemId || !formData.quantity) {
          toast.error('Food item and quantity are required for stock entry');
          setLoading(false);
          return;
        }
        payload = {
          ...payload,
          total: 0,
          stockData: {
            foodItemId: formData.foodItemId,
            foodNameSnapshot: formData.foodName || 'Unknown Item',
            operationType: formData.stockOperationType || 'RECEIVED',
            changeQuantity: parseFloat(formData.quantity) || 0,
            unit: formData.unit || 'pcs',
          },
        };
      } else if (operationType === 'WASTE') {
        if (!formData.foodItemId || !formData.quantity) {
          toast.error('Food item and quantity are required for waste entry');
          setLoading(false);
          return;
        }
        payload = {
          ...payload,
          total: 0,
          stockData: {
            foodItemId: formData.foodItemId,
            foodNameSnapshot: formData.foodName || 'Unknown Item',
            operationType: 'WASTE',
            changeQuantity: parseFloat(formData.quantity) || 0,
            unit: formData.unit || 'pcs',
          },
        };
      } else if (operationType === 'EXPENSE') {
        if (!formData.description || !formData.amount) {
          toast.error('Description and amount are required for expense');
          setLoading(false);
          return;
        }
        payload = {
          ...payload,
          total: parseFloat(formData.amount) || 0,
          metadata: {
            category: formData.category || 'OTHER',
          },
        };
      }

      await axiosInstance.post('/offline-transactions', payload);
      toast.success('Manual entry recorded successfully');
      setFormData({});
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="offline-entry-form p-4 border rounded-lg bg-white">
      <h6 className="mb-3 font-semibold">Create Manual Entry</h6>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Operation Type</label>
            <select 
              className="w-full h-10 rounded-md border bg-transparent px-3 text-sm" 
              value={operationType} 
              onChange={e => { setOperationType(e.target.value); setFormData({}); }}
            >
              <option value="ORDER">Order</option>
              <option value="PAYMENT">Payment</option>
              <option value="STOCK">Stock Received</option>
              <option value="WASTE">Waste</option>
              <option value="EXPENSE">Expense</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Date/Time of Actual Operation</label>
            <Input 
              type="datetime-local" 
              value={formData.originalTransactionTime || ''} 
              onChange={e => handleChange('originalTransactionTime', e.target.value)} 
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Reason for Manual Entry *</label>
          <Input 
            type="text" 
            value={formData.reason || ''} 
            onChange={e => handleChange('reason', e.target.value)}
            placeholder="e.g., System unavailable, POS malfunction..." 
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Outage Type</label>
            <select 
              className="w-full h-10 rounded-md border bg-transparent px-3 text-sm" 
              value={formData.outageType || 'OTHER'} 
              onChange={e => handleChange('outageType', e.target.value)}
            >
              <option value="INTERNET">Internet outage</option>
              <option value="POS_DEVICE">POS device failure</option>
              <option value="QR_SYSTEM">QR system failure</option>
              <option value="PAYMENT_PROVIDER">Payment provider failure</option>
              <option value="KITCHEN_DISPLAY">Kitchen display failure</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
            <Input 
              type="text" 
              value={formData.notes || ''} 
              onChange={e => handleChange('notes', e.target.value)} 
            />
          </div>
        </div>

        {operationType === 'ORDER' && (
          <>
            <div>
              <label className="text-sm font-medium mb-1 block">Items * (JSON array)</label>
              <textarea 
                className="w-full min-h-[80px] rounded-md border bg-transparent px-3 py-2 text-sm font-mono"
                value={formData.items || ''} 
                onChange={e => handleChange('items', e.target.value)}
                placeholder='[{"foodItemId": "id", "name": "Item Name", "quantity": 2, "price": 50}]'
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Enter as JSON array with foodItemId, name, quantity, and price for each item</p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Subtotal</label>
                <Input 
                  type="number" step="0.01"
                  value={formData.subtotal || ''} 
                  onChange={e => handleChange('subtotal', e.target.value)} 
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tax</label>
                <Input 
                  type="number" step="0.01"
                  value={formData.tax || ''} 
                  onChange={e => handleChange('tax', e.target.value)} 
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Discount</label>
                <Input 
                  type="number" step="0.01"
                  value={formData.discount || ''} 
                  onChange={e => handleChange('discount', e.target.value)} 
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Total</label>
                <Input 
                  type="number" step="0.01"
                  value={formData.total || ''} 
                  onChange={e => handleChange('total', e.target.value)} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Payment Method</label>
                <select 
                  className="w-full h-10 rounded-md border bg-transparent px-3 text-sm" 
                  value={formData.paymentMethod || 'CASH'} 
                  onChange={e => handleChange('paymentMethod', e.target.value)}
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="TELEBIRR">Telebirr</option>
                  <option value="CHAPA">Chapa</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Table/Order ID</label>
                <Input 
                  type="text" 
                  value={formData.tableId || ''} 
                  onChange={e => handleChange('tableId', e.target.value)} 
                  placeholder="Table number or leave empty"
                />
              </div>
            </div>
          </>
        )}

        {operationType === 'PAYMENT' && (
          <>
            <div>
              <label className="text-sm font-medium mb-1 block">Order ID *</label>
              <Input 
                type="text" 
                value={formData.orderId || ''} 
                onChange={e => handleChange('orderId', e.target.value)}
                placeholder="Enter the order ID to record payment for"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Amount *</label>
                <Input 
                  type="number" step="0.01"
                  value={formData.amount || ''} 
                  onChange={e => handleChange('amount', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Payment Method</label>
                <select 
                  className="w-full h-10 rounded-md border bg-transparent px-3 text-sm" 
                  value={formData.paymentMethod || 'CASH'} 
                  onChange={e => handleChange('paymentMethod', e.target.value)}
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="TELEBIRR">Telebirr</option>
                  <option value="CHAPA">Chapa</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Reference</label>
              <Input 
                type="text" 
                value={formData.reference || ''} 
                onChange={e => handleChange('reference', e.target.value)}
                placeholder="Payment reference or receipt number"
              />
            </div>
          </>
        )}

        {operationType === 'STOCK' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Food Item ID *</label>
                <Input 
                  type="text" 
                  value={formData.foodItemId || ''} 
                  onChange={e => handleChange('foodItemId', e.target.value)}
                  placeholder="Enter food item ID"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Item Name</label>
                <Input 
                  type="text" 
                  value={formData.foodName || ''} 
                  onChange={e => handleChange('foodName', e.target.value)}
                  placeholder="e.g., Shiro"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Quantity *</label>
                <Input 
                  type="number" step="0.01"
                  value={formData.quantity || ''} 
                  onChange={e => handleChange('quantity', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Unit</label>
                <Input 
                  type="text" 
                  value={formData.unit || 'pcs'} 
                  onChange={e => handleChange('unit', e.target.value)}
                  placeholder="e.g., kg, pcs"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Operation</label>
                <select 
                  className="w-full h-10 rounded-md border bg-transparent px-3 text-sm" 
                  value={formData.stockOperationType || 'RECEIVED'} 
                  onChange={e => handleChange('stockOperationType', e.target.value)}
                >
                  <option value="RECEIVED">Stock Received</option>
                  <option value="USED">Stock Used</option>
                  <option value="ADJUSTMENT">Adjustment</option>
                </select>
              </div>
            </div>
          </>
        )}

        {operationType === 'WASTE' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Food Item ID *</label>
                <Input 
                  type="text" 
                  value={formData.foodItemId || ''} 
                  onChange={e => handleChange('foodItemId', e.target.value)}
                  placeholder="Enter food item ID"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Item Name</label>
                <Input 
                  type="text" 
                  value={formData.foodName || ''} 
                  onChange={e => handleChange('foodName', e.target.value)}
                  placeholder="e.g., Shiro"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Quantity Wasted *</label>
                <Input 
                  type="number" step="0.01"
                  value={formData.quantity || ''} 
                  onChange={e => handleChange('quantity', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Unit</label>
                <Input 
                  type="text" 
                  value={formData.unit || 'pcs'} 
                  onChange={e => handleChange('unit', e.target.value)}
                  placeholder="e.g., kg, pcs"
                />
              </div>
            </div>
          </>
        )}

        {operationType === 'EXPENSE' && (
          <>
            <div>
              <label className="text-sm font-medium mb-1 block">Description *</label>
              <Input 
                type="text" 
                value={formData.description || ''} 
                onChange={e => handleChange('description', e.target.value)}
                placeholder="What was this expense for?"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Amount *</label>
                <Input 
                  type="number" step="0.01"
                  value={formData.amount || ''} 
                  onChange={e => handleChange('amount', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <select 
                  className="w-full h-10 rounded-md border bg-transparent px-3 text-sm" 
                  value={formData.category || 'OTHER'} 
                  onChange={e => handleChange('category', e.target.value)}
                >
                  <option value="SUPPLIES">Supplies</option>
                  <option value="UTILITIES">Utilities</option>
                  <option value="SALARIES">Salaries</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="TRANSPORT">Transport</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </>
        )}

        <Button type="submit" variant="default" disabled={loading} className="w-full">
          {loading ? 'Recording...' : 'Record Manual Entry'}
        </Button>
      </form>
    </div>
  );
};

export default OfflineEntryForm;
