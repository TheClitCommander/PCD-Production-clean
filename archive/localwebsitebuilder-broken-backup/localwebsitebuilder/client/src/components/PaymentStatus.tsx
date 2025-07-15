import { Card } from "@/components/ui/card";
import { DollarSign, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaymentStatusProps {
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
  totalAmount: number;
  paidAmount: number;
  paymentLink?: string;
  lastPaymentDate?: string;
}

export function PaymentStatus({ 
  paymentStatus, 
  totalAmount, 
  paidAmount, 
  paymentLink,
  lastPaymentDate 
}: PaymentStatusProps) {
  const remaining = totalAmount - paidAmount;
  const percentPaid = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  
  const statusConfig = {
    pending: {
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      label: "Payment Pending",
      message: "Your project payment is pending"
    },
    partial: {
      icon: AlertCircle,
      color: "text-blue-600", 
      bgColor: "bg-blue-50",
      label: "Partial Payment",
      message: `$${(remaining / 100).toFixed(2)} remaining`
    },
    paid: {
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      label: "Paid in Full",
      message: "Thank you for your payment!"
    },
    overdue: {
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      label: "Payment Overdue",
      message: "Please make payment as soon as possible"
    }
  };
  
  const config = statusConfig[paymentStatus];
  const Icon = config.icon;
  
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Payment Status
        </h3>
        <div className={cn("px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1", config.bgColor, config.color)}>
          <Icon className="w-4 h-4" />
          {config.label}
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Paid: ${(paidAmount / 100).toFixed(2)}</span>
            <span>Total: ${(totalAmount / 100).toFixed(2)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className={cn("h-full transition-all", {
                "bg-green-500": paymentStatus === 'paid',
                "bg-blue-500": paymentStatus === 'partial',
                "bg-yellow-500": paymentStatus === 'pending',
                "bg-red-500": paymentStatus === 'overdue'
              })}
              style={{ width: `${percentPaid}%` }}
            />
          </div>
        </div>
        
        {/* Status message */}
        <p className="text-sm text-gray-600">{config.message}</p>
        
        {/* Last payment date */}
        {lastPaymentDate && paymentStatus !== 'pending' && (
          <p className="text-sm text-gray-500">
            Last payment: {new Date(lastPaymentDate).toLocaleDateString()}
          </p>
        )}
        
        {/* Payment button */}
        {paymentStatus !== 'paid' && paymentLink && (
          <Button 
            className="w-full" 
            onClick={() => window.open(paymentLink, '_blank')}
          >
            Make Payment
          </Button>
        )}
      </div>
    </Card>
  );
} 