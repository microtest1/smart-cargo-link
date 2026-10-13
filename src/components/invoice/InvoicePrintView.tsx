import { forwardRef } from "react";
import { format } from "date-fns";
import type { Invoice } from "@/hooks/useInvoices";
import { formatGhs } from "@/lib/pricing";

interface InvoicePrintViewProps {
  invoice: Invoice;
  companyName?: string;
}

export const InvoicePrintView = forwardRef<HTMLDivElement, InvoicePrintViewProps>(
  ({ invoice, companyName = "Amoliga Elite Freight" }, ref) => {
    return (
      <div ref={ref} className="bg-white p-8 max-w-2xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{companyName}</h1>
            <p className="text-gray-600 mt-1">Freight & Logistics Services</p>
            <p className="text-gray-500 text-sm mt-2">Ghana - China Shipping</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
            <p className="text-lg font-semibold text-accent mt-1">{invoice.invoice_number}</p>
            <p className="text-gray-500 text-sm mt-2">
              Date: {format(new Date(invoice.created_at), "MMMM d, yyyy")}
            </p>
          </div>
        </div>
        
        {/* Customer Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
            <p className="font-semibold text-gray-900">Customer Code: {invoice.user_code}</p>
          </div>
          <div className="text-right">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Shipment Details</h3>
            {invoice.shipments && (
              <>
                <p className="text-gray-900">
                  <span className="font-semibold">Tracking #:</span> {invoice.shipments.tracking_number}
                </p>
                <p className="text-gray-600">{invoice.shipments.origin} → {invoice.shipments.destination}</p>
              </>
            )}
          </div>
        </div>
        
        {/* Items Table */}
        <table className="w-full mb-8">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-3 font-semibold text-gray-700">Description</th>
              <th className="text-center p-3 font-semibold text-gray-700">Weight</th>
              <th className="text-right p-3 font-semibold text-gray-700">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="p-3">
                <p className="font-semibold text-gray-900">{invoice.shipments?.product || "Shipment"}</p>
                <p className="text-sm text-gray-500">
                  {invoice.shipments?.origin} to {invoice.shipments?.destination}
                </p>
              </td>
              <td className="p-3 text-center text-gray-600">
                {invoice.shipments?.weight ? `${invoice.shipments.weight} kg` : "-"}
              </td>
              <td className="p-3 text-right font-semibold">
                {formatGhs(invoice.amount)}
              </td>
            </tr>
          </tbody>
        </table>
        
        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-semibold">{formatGhs(invoice.amount)}</span>
            </div>
            {invoice.tax_amount > 0 && (
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Tax:</span>
                <span className="font-semibold">{formatGhs(invoice.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between py-3 border-t-2 border-gray-800 mt-2">
              <span className="text-lg font-bold text-gray-900">Total:</span>
              <span className="text-lg font-bold text-gray-900">{formatGhs(invoice.total_amount)}</span>
            </div>
          </div>
        </div>
        
        {/* Status */}
        <div className="text-center mb-8">
          <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
            invoice.status === 'paid' 
              ? 'bg-green-100 text-green-800' 
              : invoice.status === 'cancelled'
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {invoice.status.toUpperCase()}
          </span>
        </div>
        
        {/* Notes */}
        {invoice.notes && (
          <div className="bg-gray-50 p-4 rounded-lg mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Notes</h3>
            <p className="text-gray-700">{invoice.notes}</p>
          </div>
        )}
        
        {/* Footer */}
        <div className="border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
          <p>Thank you for choosing {companyName}!</p>
          <p className="mt-1">For inquiries, please contact our customer service.</p>
        </div>
      </div>
    );
  }
);

InvoicePrintView.displayName = "InvoicePrintView";
