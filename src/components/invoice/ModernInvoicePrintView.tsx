import { forwardRef } from "react";
import { format } from "date-fns";
import { SelectionData } from "@/components/cargo/GoodsSelectionDialog";
import amoligaLogo from "@/assets/amoliga-logo.png";
import { useCbmPricing } from "@/hooks/useCbmPricing";
import { formatGhs, freightForCbm } from "@/lib/pricing";

interface ModernInvoicePrintViewProps {
  invoiceNumber: string;
  trackingNumber: string;
  userName: string;
  userCode: string;
  containerName: string;
  selectionData: SelectionData;
  createdAt: Date;
  companyName?: string;
  fulfillmentType?: string;
  deliveryAddress?: string;
  contactPhone?: string;
}

export const ModernInvoicePrintView = forwardRef<HTMLDivElement, ModernInvoicePrintViewProps>(
  (
    {
      invoiceNumber,
      trackingNumber,
      userName,
      userCode,
      containerName,
      selectionData,
      createdAt,
      companyName = "Amoliga Elite Freight & Logistics",
      fulfillmentType = "self_pickup",
      deliveryAddress,
      contactPhone,
    },
    ref
  ) => {
    const { pricing } = useCbmPricing();
    const pricePerCbm = pricing.effectiveRate;
    const goodsCost = freightForCbm(selectionData.totalCbm, pricing);
    const totalWeight = selectionData.items.reduce((sum, si) => sum + (si.item.total_weight || 0), 0);
    const totalCartons = selectionData.items.reduce((sum, si) => sum + (si.item.carton_count || 0), 0);
    const deliveryFee = selectionData.deliveryFee || 0;
    const grandTotal = selectionData.totalAmount;

    return (
      <div
        ref={ref}
        style={{
          backgroundColor: "#ffffff",
          padding: "40px",
          maxWidth: "800px",
          margin: "0 auto",
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          color: "#1a1a2e",
        }}
      >
        {/* Modern Header with Gradient Accent */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "40px",
            paddingBottom: "30px",
            borderBottom: "3px solid #1a1a2e",
            position: "relative",
          }}
        >
          {/* Company Logo and Info */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <img
              src={amoligaLogo}
              alt="Amoliga Elite Logo"
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "12px",
                objectFit: "contain",
                border: "2px solid #e5e7eb",
              }}
            />
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "24px",
                  fontWeight: 800,
                  color: "#1a1a2e",
                  letterSpacing: "-0.5px",
                }}
              >
                {companyName}
              </h1>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#6b7280" }}>
                Premium China-Ghana Freight Services
              </p>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#9ca3af" }}>
                📍 Nansha, China → Accra, Ghana
              </p>
            </div>
          </div>

          {/* Invoice Badge */}
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                background: "linear-gradient(135deg, #1a1a2e 0%, #2d3748 100%)",
                color: "#ffffff",
                padding: "16px 24px",
                borderRadius: "12px",
                display: "inline-block",
              }}
            >
              <p style={{ margin: 0, fontSize: "11px", opacity: 0.8, letterSpacing: "1px" }}>
                INVOICE
              </p>
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontSize: "18px",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                }}
              >
                {invoiceNumber}
              </p>
            </div>
            <p style={{ margin: "12px 0 0 0", fontSize: "13px", color: "#6b7280" }}>
              {format(createdAt, "MMMM d, yyyy")}
            </p>
          </div>
        </div>

        {/* Customer & Shipment Info Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
            marginBottom: "30px",
          }}
        >
          {/* Bill To Card */}
          <div
            style={{
              backgroundColor: "#f8fafc",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
            }}
          >
            <p
              style={{
                margin: "0 0 12px 0",
                fontSize: "11px",
                fontWeight: 600,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Bill To
            </p>
            <p style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#1e293b" }}>
              {userName}
            </p>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
              Customer Code: <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{userCode}</span>
            </p>
            {contactPhone && (
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                📞 {contactPhone}
              </p>
            )}
          </div>

          {/* Shipment Details Card */}
          <div
            style={{
              backgroundColor: "#f0fdf4",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid #bbf7d0",
            }}
          >
            <p
              style={{
                margin: "0 0 12px 0",
                fontSize: "11px",
                fontWeight: 600,
                color: "#15803d",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Shipment Details
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "#1e293b" }}>
              <strong>Tracking:</strong> <span style={{ fontFamily: "monospace" }}>{trackingNumber}</span>
            </p>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
              <strong>Container:</strong> {containerName}
            </p>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
              <strong>Route:</strong> China → {selectionData.deliveryZone?.zone_name || "Ghana"}
            </p>
          </div>
        </div>

        {/* Fulfillment Badge */}
        <div
          style={{
            marginBottom: "24px",
            padding: "12px 20px",
            backgroundColor: fulfillmentType === "delivery" ? "#fef3c7" : fulfillmentType === "third_party_pickup" ? "#e0e7ff" : "#f3f4f6",
            borderRadius: "8px",
            display: "inline-block",
          }}
        >
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#1a1a2e" }}>
            📦 Fulfillment: {fulfillmentType?.replace("_", " ").toUpperCase() || "SELF PICKUP"}
          </span>
          {deliveryAddress && (
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b" }}>
              📍 {deliveryAddress}
            </p>
          )}
        </div>

        {/* Items Table - Modern Style */}
        <div
          style={{
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid #e2e8f0",
            marginBottom: "30px",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#1a1a2e" }}>
                <th
                  style={{
                    padding: "14px 16px",
                    textAlign: "left",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#ffffff",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  #
                </th>
                <th
                  style={{
                    padding: "14px 16px",
                    textAlign: "left",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#ffffff",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Item Description
                </th>
                <th
                  style={{
                    padding: "14px 16px",
                    textAlign: "center",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#ffffff",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Qty
                </th>
                <th
                  style={{
                    padding: "14px 16px",
                    textAlign: "center",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#ffffff",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Cartons
                </th>
                <th
                  style={{
                    padding: "14px 16px",
                    textAlign: "center",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#ffffff",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Weight (kg)
                </th>
                <th
                  style={{
                    padding: "14px 16px",
                    textAlign: "right",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#ffffff",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  CBM
                </th>
              </tr>
            </thead>
            <tbody>
              {selectionData.items.map((si, index) => (
                <tr
                  key={si.item.id}
                  style={{
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "#64748b" }}>
                    {index + 1}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                      {si.item.item_name}
                    </p>
                    {si.item.item_name_chinese && (
                      <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#94a3b8" }}>
                        {si.item.item_name_chinese}
                      </p>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center", fontSize: "13px", color: "#475569" }}>
                    {si.quantity}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center", fontSize: "13px", color: "#475569" }}>
                    {si.item.carton_count || "-"}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center", fontSize: "13px", color: "#475569" }}>
                    {si.item.total_weight?.toFixed(1) || "-"}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#1a1a2e",
                    }}
                  >
                    {si.cbm.toFixed(4)}
                  </td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr style={{ backgroundColor: "#1a1a2e" }}>
                <td
                  colSpan={2}
                  style={{
                    padding: "14px 16px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#ffffff",
                    textAlign: "right",
                  }}
                >
                  TOTALS
                </td>
                <td
                  style={{
                    padding: "14px 16px",
                    textAlign: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#ffffff",
                  }}
                >
                  {selectionData.items.reduce((sum, si) => sum + si.quantity, 0)}
                </td>
                <td
                  style={{
                    padding: "14px 16px",
                    textAlign: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#ffffff",
                  }}
                >
                  {totalCartons}
                </td>
                <td
                  style={{
                    padding: "14px 16px",
                    textAlign: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#ffffff",
                  }}
                >
                  {totalWeight.toFixed(1)}
                </td>
                <td
                  style={{
                    padding: "14px 16px",
                    textAlign: "right",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#fbbf24",
                  }}
                >
                  {selectionData.totalCbm.toFixed(4)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pricing Summary - Modern Card */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "30px" }}>
          <div
            style={{
              width: "320px",
              backgroundColor: "#f8fafc",
              borderRadius: "12px",
              padding: "20px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "12px",
                paddingBottom: "12px",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <span style={{ fontSize: "13px", color: "#64748b" }}>
                Sea Freight ({selectionData.totalCbm.toFixed(4)} CBM × {formatGhs(pricePerCbm, pricing.currency)})
              </span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                {formatGhs(goodsCost, pricing.currency)}
              </span>
            </div>
            
            {deliveryFee > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  Delivery Fee
                </span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                  {formatGhs(deliveryFee, pricing.currency)}
                </span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "8px",
              }}
            >
              <span style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a2e" }}>
                TOTAL AMOUNT
              </span>
              <span
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #1a1a2e 0%, #4f46e5 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {formatGhs(grandTotal, pricing.currency)}
              </span>
            </div>
            <p style={{ margin: "8px 0 0 0", fontSize: "11px", color: "#94a3b8", textAlign: "right" }}>
              Rate: {pricing.baseRate} × {pricing.exchangeRate} = {formatGhs(pricePerCbm, pricing.currency)}/CBM (China → Ghana)
            </p>
          </div>
        </div>

        {/* Shipment Summary Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
            marginBottom: "30px",
          }}
        >
          {[
            { value: selectionData.items.length.toString(), label: "Items", icon: "📦" },
            { value: totalCartons.toString(), label: "Cartons", icon: "📤" },
            { value: `${totalWeight.toFixed(1)} kg`, label: "Weight", icon: "⚖️" },
            { value: selectionData.totalCbm.toFixed(4), label: "Total CBM", icon: "📐", highlight: true },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: stat.highlight ? "#1a1a2e" : "#f8fafc",
                padding: "16px",
                borderRadius: "12px",
                textAlign: "center",
                border: stat.highlight ? "none" : "1px solid #e2e8f0",
              }}
            >
              <p style={{ margin: 0, fontSize: "20px" }}>{stat.icon}</p>
              <p
                style={{
                  margin: "8px 0 4px 0",
                  fontSize: "18px",
                  fontWeight: 700,
                  color: stat.highlight ? "#fbbf24" : "#1e293b",
                }}
              >
                {stat.value}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "11px",
                  color: stat.highlight ? "#94a3b8" : "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Payment Status */}
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <span
            style={{
              display: "inline-block",
              padding: "10px 32px",
              borderRadius: "50px",
              fontSize: "12px",
              fontWeight: 700,
              backgroundColor: "#fef3c7",
              color: "#92400e",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            ⏳ Pending Payment
          </span>
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "2px solid #e2e8f0",
            paddingTop: "24px",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#1a1a2e" }}>
            Thank you for choosing {companyName}! 🚢
          </p>
          <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "#64748b" }}>
            📞 WhatsApp: +233 208 878 817 | 📧 support@amoliga.com
          </p>
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              backgroundColor: "#f0fdf4",
              borderRadius: "8px",
              fontSize: "11px",
              color: "#15803d",
            }}
          >
            🔒 This is an official invoice. Keep for your records. Payment via Hubtel Mobile Money or Bank Transfer.
          </div>
        </div>
      </div>
    );
  }
);

ModernInvoicePrintView.displayName = "ModernInvoicePrintView";
