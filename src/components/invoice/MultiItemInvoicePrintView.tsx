import { forwardRef } from "react";
import { format } from "date-fns";
import { SelectionData } from "@/components/cargo/GoodsSelectionDialog";
import { DeliveryZone } from "@/hooks/useContainerItems";
import { useCbmPricing } from "@/hooks/useCbmPricing";
import { formatGhs, freightForCbm } from "@/lib/pricing";

interface MultiItemInvoicePrintViewProps {
  invoiceNumber: string;
  trackingNumber: string;
  userName: string;
  userCode: string;
  containerName: string;
  selectionData: SelectionData;
  createdAt: Date;
  companyName?: string;
}

export const MultiItemInvoicePrintView = forwardRef<HTMLDivElement, MultiItemInvoicePrintViewProps>(
  (
    {
      invoiceNumber,
      trackingNumber,
      userName,
      userCode,
      containerName,
      selectionData,
      createdAt,
      companyName = "Amoliga Elite Freight",
    },
    ref
  ) => {
    const { pricing } = useCbmPricing();
    const pricePerCbm = pricing.effectiveRate;
    const goodsCost = freightForCbm(selectionData.totalCbm, pricing);
    const totalWeight = selectionData.items.reduce(
      (sum, si) => sum + (si.item.total_weight || 0),
      0
    );
    const totalCartons = selectionData.items.reduce(
      (sum, si) => sum + (si.item.carton_count || 0),
      0
    );

    return (
      <div
        ref={ref}
        className="bg-white p-8 max-w-3xl mx-auto"
        style={{ fontFamily: "Arial, sans-serif", color: "#1a1a1a" }}
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{companyName}</h1>
            <p className="text-gray-600 mt-1">Freight & Logistics Services</p>
            <p className="text-gray-500 text-sm mt-2">
              China - Ghana | West Africa Shipping
            </p>
            <p className="text-gray-500 text-sm">Tel: +233 208 878 817</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
            <p
              className="text-lg font-semibold mt-1"
              style={{ color: "#9b87f5" }}
            >
              {invoiceNumber}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Date: {format(createdAt, "MMMM d, yyyy")}
            </p>
          </div>
        </div>

        {/* Customer & Shipment Info */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
              Bill To
            </h3>
            <p className="font-semibold text-gray-900">{userName}</p>
            <p className="text-gray-600">Customer Code: {userCode}</p>
          </div>
          <div className="text-right">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
              Shipment Details
            </h3>
            <p className="text-gray-900">
              <span className="font-semibold">Tracking #:</span> {trackingNumber}
            </p>
            <p className="text-gray-600">Container: {containerName}</p>
            <p className="text-gray-600">
              China (Nansha) → {selectionData.deliveryZone?.zone_name || "Ghana"}
            </p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-6" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f3f4f6" }}>
              <th
                className="text-left p-3 font-semibold text-gray-700"
                style={{ border: "1px solid #e5e7eb" }}
              >
                #
              </th>
              <th
                className="text-left p-3 font-semibold text-gray-700"
                style={{ border: "1px solid #e5e7eb" }}
              >
                Item Description
              </th>
              <th
                className="text-center p-3 font-semibold text-gray-700"
                style={{ border: "1px solid #e5e7eb" }}
              >
                Qty
              </th>
              <th
                className="text-center p-3 font-semibold text-gray-700"
                style={{ border: "1px solid #e5e7eb" }}
              >
                CTN
              </th>
              <th
                className="text-center p-3 font-semibold text-gray-700"
                style={{ border: "1px solid #e5e7eb" }}
              >
                Weight (kg)
              </th>
              <th
                className="text-right p-3 font-semibold text-gray-700"
                style={{ border: "1px solid #e5e7eb" }}
              >
                CBM
              </th>
            </tr>
          </thead>
          <tbody>
            {selectionData.items.map((si, index) => (
              <tr key={si.item.id}>
                <td
                  className="p-3 text-center"
                  style={{ border: "1px solid #e5e7eb" }}
                >
                  {index + 1}
                </td>
                <td className="p-3" style={{ border: "1px solid #e5e7eb" }}>
                  <p className="font-semibold text-gray-900">
                    {si.item.item_name}
                  </p>
                  {si.item.item_name_chinese && (
                    <p className="text-sm text-gray-500">
                      {si.item.item_name_chinese}
                    </p>
                  )}
                </td>
                <td
                  className="p-3 text-center text-gray-600"
                  style={{ border: "1px solid #e5e7eb" }}
                >
                  {si.quantity}
                </td>
                <td
                  className="p-3 text-center text-gray-600"
                  style={{ border: "1px solid #e5e7eb" }}
                >
                  {si.item.carton_count || "-"}
                </td>
                <td
                  className="p-3 text-center text-gray-600"
                  style={{ border: "1px solid #e5e7eb" }}
                >
                  {si.item.total_weight?.toFixed(1) || "-"}
                </td>
                <td
                  className="p-3 text-right font-semibold"
                  style={{ border: "1px solid #e5e7eb" }}
                >
                  {si.cbm.toFixed(4)}
                </td>
              </tr>
            ))}
            {/* Totals Row */}
            <tr style={{ backgroundColor: "#f9fafb", fontWeight: "bold" }}>
              <td
                colSpan={2}
                className="p-3 text-right"
                style={{ border: "1px solid #e5e7eb" }}
              >
                TOTALS:
              </td>
              <td
                className="p-3 text-center"
                style={{ border: "1px solid #e5e7eb" }}
              >
                {selectionData.items.reduce((sum, si) => sum + si.quantity, 0)}
              </td>
              <td
                className="p-3 text-center"
                style={{ border: "1px solid #e5e7eb" }}
              >
                {totalCartons}
              </td>
              <td
                className="p-3 text-center"
                style={{ border: "1px solid #e5e7eb" }}
              >
                {totalWeight.toFixed(1)}
              </td>
              <td
                className="p-3 text-right"
                style={{ border: "1px solid #e5e7eb", color: "#9b87f5" }}
              >
                {selectionData.totalCbm.toFixed(4)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Charges Summary */}
        <div className="flex justify-end mb-6">
          <div style={{ width: "280px" }}>
            <div
              className="flex justify-between py-2"
              style={{ borderBottom: "1px solid #e5e7eb" }}
            >
              <span className="text-gray-600">
                Sea Freight ({formatGhs(pricePerCbm, pricing.currency)}/CBM):
              </span>
              <span className="font-semibold">{formatGhs(goodsCost, pricing.currency)}</span>
            </div>
            <p className="text-xs text-gray-500 py-1">
              CBM = W × L × H ÷ 1,000,000
            </p>
            {selectionData.deliveryZone && selectionData.deliveryFee > 0 && (
              <div
                className="flex justify-between py-2"
                style={{ borderBottom: "1px solid #e5e7eb" }}
              >
                <span className="text-gray-600">
                  Delivery ({selectionData.deliveryZone.zone_name}):
                </span>
                <span className="font-semibold">
                  {formatGhs(selectionData.deliveryFee, pricing.currency)}
                </span>
              </div>
            )}
            <div
              className="flex justify-between py-3 mt-2"
              style={{ borderTop: "2px solid #1a1a1a" }}
            >
              <span className="text-lg font-bold text-gray-900">
                Total Amount:
              </span>
              <span className="text-lg font-bold" style={{ color: "#9b87f5" }}>
                {formatGhs(selectionData.totalAmount, pricing.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Shipment Summary Box */}
        <div
          style={{
            backgroundColor: "#f3f4f6",
            padding: "16px",
            borderRadius: "8px",
            marginBottom: "24px",
          }}
        >
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
            Shipment Summary
          </h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {selectionData.items.length}
              </p>
              <p className="text-xs text-gray-500">Items</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalCartons}</p>
              <p className="text-xs text-gray-500">Cartons</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {totalWeight.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">Weight (kg)</p>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: "#9b87f5" }}>
                {selectionData.totalCbm.toFixed(4)}
              </p>
              <p className="text-xs text-gray-500">Total CBM</p>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="text-center mb-6">
          <span
            style={{
              display: "inline-block",
              padding: "8px 24px",
              borderRadius: "9999px",
              fontSize: "14px",
              fontWeight: "600",
              backgroundColor: "#fef3c7",
              color: "#92400e",
            }}
          >
            PENDING PAYMENT
          </span>
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            paddingTop: "24px",
            textAlign: "center",
            fontSize: "14px",
            color: "#6b7280",
          }}
        >
          <p>Thank you for choosing {companyName}!</p>
          <p className="mt-1">
            For inquiries, contact us on WhatsApp: +233 208 878 817
          </p>
          <p className="mt-2 text-xs">
            This invoice was automatically generated. Please keep it for your
            records.
          </p>
        </div>
      </div>
    );
  }
);

MultiItemInvoicePrintView.displayName = "MultiItemInvoicePrintView";
