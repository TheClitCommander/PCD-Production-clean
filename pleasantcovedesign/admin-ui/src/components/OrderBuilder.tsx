import React, { useState, useEffect } from 'react';
import { Package, Plus, Minus, ShoppingCart, FileText, Send, X } from 'lucide-react';
import api from '../api';

interface OrderBuilderProps {
  companyId: string;
  companyName: string;
  onClose: () => void;
  onOrderCreated?: (orderId: string) => void;
}

interface OrderItem {
  type: 'package' | 'addon' | 'custom';
  id?: string;
  name: string;
  price: number;
  quantity?: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
}

// Service catalog - matches Python backend
const PACKAGES = {
  starter: { name: 'Starter Package', price: 997 },
  growth: { name: 'Growth Package', price: 2497 },
  professional: { name: 'Professional Package', price: 4997 }
};

const ADDONS = {
  additional_page: { name: 'Additional Page', price: 297 },
  contact_forms: { name: 'Custom Contact Forms', price: 197 },
  photo_gallery: { name: 'Photo Gallery', price: 297 },
  video_integration: { name: 'Video Integration', price: 397 },
  appointment_booking: { name: 'Appointment Booking', price: 797 },
  messaging_portal: { name: 'Customer Messaging', price: 997 },
  seo_package: { name: 'SEO Package', price: 797 },
  logo_design: { name: 'Logo Design', price: 797 },
  copywriting: { name: 'Copywriting (per page)', price: 397 }
};

export default function OrderBuilder({ companyId, companyName, onClose, onOrderCreated }: OrderBuilderProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});
  const [customItems, setCustomItems] = useState<Array<{name: string, price: number}>>([]);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);

  // Calculate totals
  const calculateTotal = () => {
    let subtotal = 0;

    // Package price
    if (selectedPackage && PACKAGES[selectedPackage as keyof typeof PACKAGES]) {
      subtotal += PACKAGES[selectedPackage as keyof typeof PACKAGES].price;
    }

    // Addon prices
    Object.entries(selectedAddons).forEach(([addon, quantity]) => {
      if (ADDONS[addon as keyof typeof ADDONS]) {
        subtotal += ADDONS[addon as keyof typeof ADDONS].price * quantity;
      }
    });

    // Custom items
    customItems.forEach(item => {
      subtotal += item.price;
    });

    const tax = 0; // No tax on services
    const total = subtotal + tax;

    return { subtotal, tax, total };
  };

  const { subtotal, tax, total } = calculateTotal();

  // Create order in backend
  const createOrder = async () => {
    setLoading(true);
    try {
      const orderData = {
        company_id: companyId,
        package: selectedPackage,
        addons: Object.entries(selectedAddons).flatMap(([addon, qty]) => 
          Array(qty).fill(addon)
        ),
        custom_items: customItems,
        approval_status: requiresApproval ? 'pending' : 'auto_approved',
        total_amount: total,
        requires_approval: requiresApproval
      };

      const response = await api.post('/orders', orderData);
      
      setOrderId(response.data.id);
      
      if (requiresApproval) {
        alert(
          `✅ Order created successfully!\n\n` +
          `Order ID: ${response.data.id}\n` +
          `Status: Pending Internal Approval\n\n` +
          `The order will be sent to Minerva for invoice generation once approved.`
        );
      } else {
        alert(
          `✅ Order created and sent to Minerva!\n\n` +
          `Order ID: ${response.data.id}\n` +
          `Invoice will be generated and sent to client automatically.`
        );
      }
      
      if (onOrderCreated) {
        onOrderCreated(response.data.id);
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('❌ Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add addon
  const addAddon = (addon: string) => {
    setSelectedAddons(prev => ({
      ...prev,
      [addon]: (prev[addon] || 0) + 1
    }));
  };

  // Remove addon
  const removeAddon = (addon: string) => {
    setSelectedAddons(prev => {
      const newAddons = { ...prev };
      if (newAddons[addon] > 1) {
        newAddons[addon]--;
      } else {
        delete newAddons[addon];
      }
      return newAddons;
    });
  };

  // Add custom item
  const addCustomItem = () => {
    if (customItemName && customItemPrice) {
      setCustomItems(prev => [...prev, {
        name: customItemName,
        price: parseFloat(customItemPrice)
      }]);
      setCustomItemName('');
      setCustomItemPrice('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Build Order</h2>
            <p className="text-blue-100">{companyName}</p>
          </div>
          <button onClick={onClose} className="hover:bg-blue-700 p-2 rounded">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-200px)]">
          {/* Left: Service Selection */}
          <div className="w-2/3 p-6 overflow-y-auto border-r">
            {/* Packages */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Choose Package
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(PACKAGES).map(([key, pkg]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPackage(key)}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      selectedPackage === key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold">{pkg.name}</h4>
                        <p className="text-sm text-gray-600">
                          {key === 'starter' && 'Perfect for getting started online'}
                          {key === 'growth' && 'Ideal for established businesses'}
                          {key === 'professional' && 'Complete digital presence solution'}
                        </p>
                      </div>
                      <span className="text-lg font-bold">${pkg.price}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Add-ons */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Add-on Services</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(ADDONS).map(([key, addon]) => (
                  <div key={key} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{addon.name}</h4>
                      <span className="font-semibold">${addon.price}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => removeAddon(key)}
                          disabled={!selectedAddons[key]}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center">
                          {selectedAddons[key] || 0}
                        </span>
                        <button
                          onClick={() => addAddon(key)}
                          className="p-1 rounded hover:bg-gray-200"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Items */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Custom Items</h3>
              <div className="flex space-x-2 mb-4">
                <input
                  type="text"
                  placeholder="Item description"
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  className="flex-1 p-2 border rounded"
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={customItemPrice}
                  onChange={(e) => setCustomItemPrice(e.target.value)}
                  className="w-24 p-2 border rounded"
                />
                <button
                  onClick={addCustomItem}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              {customItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded mb-2">
                  <span>{item.name}</span>
                  <span className="font-semibold">${item.price}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="w-1/3 p-6 bg-gray-50">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Order Summary
            </h3>

            {/* Selected items */}
            <div className="space-y-2 mb-6">
              {selectedPackage && (
                <div className="flex justify-between">
                  <span>{PACKAGES[selectedPackage as keyof typeof PACKAGES].name}</span>
                  <span>${PACKAGES[selectedPackage as keyof typeof PACKAGES].price}</span>
                </div>
              )}
              
              {Object.entries(selectedAddons).map(([addon, qty]) => (
                <div key={addon} className="flex justify-between text-sm">
                  <span>
                    {ADDONS[addon as keyof typeof ADDONS].name}
                    {qty > 1 && ` x${qty}`}
                  </span>
                  <span>${ADDONS[addon as keyof typeof ADDONS].price * qty}</span>
                </div>
              ))}

              {customItems.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{item.name}</span>
                  <span>${item.price}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Approval Settings */}
            <div className="mt-6 p-4 bg-white border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Approval Process</label>
                  <p className="text-xs text-gray-500">Require internal approval before sending to client</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresApproval}
                    onChange={(e) => setRequiresApproval(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-3">
              <button
                onClick={createOrder}
                disabled={!selectedPackage || loading}
                className="w-full py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                <FileText className="h-5 w-5 mr-2" />
                {loading ? 'Creating...' : requiresApproval ? 'Create for Approval' : 'Create & Send Order'}
              </button>
              
              {orderId && (
                <button className="w-full py-3 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center">
                  <Send className="h-5 w-5 mr-2" />
                  Send to Client
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 