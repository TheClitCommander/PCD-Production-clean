import React, { useState, useEffect } from 'react';
import { X, Send, FileText, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../api';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  invoiceId?: string;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, orderId, invoiceId }) => {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchInvoice();
    }
  }, [isOpen, orderId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/${orderId}/invoice`, {
        params: { invoiceId }
      });
      setInvoice(response.data);
    } catch (error) {
      console.error('Failed to fetch invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvoice = async () => {
    try {
      setSending(true);
      const response = await api.post(`/orders/${orderId}/send-invoice`, {
        invoiceId: invoice?.invoice_id
      });
      
      if (response.data.success) {
        alert('✅ Invoice sent successfully!');
        // Refresh invoice data
        fetchInvoice();
      }
    } catch (error) {
      console.error('Failed to send invoice:', error);
      alert('❌ Failed to send invoice. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'sent':
        return <Send className="w-5 h-5 text-blue-600" />;
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Invoice Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading invoice...</p>
            </div>
          ) : invoice ? (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Invoice #{invoice.invoice_id}
                  </h3>
                  <p className="text-gray-600 mt-1">{invoice.company_name}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                    {getStatusIcon(invoice.status)}
                    <span className="ml-2">{invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span>
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Issue Date</p>
                  <p className="font-medium">{new Date(invoice.date_issued).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="font-medium">{new Date(invoice.due_date).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Line Items</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Description</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Qty</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Price</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {JSON.parse(invoice.line_items || '[]').map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm">{item.description}</td>
                          <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-right">${item.unit_price.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">${item.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">${invoice.subtotal?.toLocaleString()}</span>
                  </div>
                  {invoice.tax_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax ({(invoice.tax_rate * 100).toFixed(0)}%)</span>
                      <span className="font-medium">${invoice.tax_amount?.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span>${invoice.total?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              {invoice.status === 'paid' && invoice.payment_date && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-green-800 font-medium">
                    <CheckCircle className="w-4 h-4 inline mr-2" />
                    Paid on {new Date(invoice.payment_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No invoice found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {invoice && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Close
            </button>
            <div className="space-x-3">
              {invoice.status === 'draft' && (
                <button
                  onClick={handleSendInvoice}
                  disabled={sending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 inline mr-2" />
                      Send Invoice
                    </>
                  )}
                </button>
              )}
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <Download className="w-4 h-4 inline mr-2" />
                Download PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceModal; 