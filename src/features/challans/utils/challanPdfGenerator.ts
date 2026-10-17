import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ChallanRecord } from "../types";

export interface GenerateChallanPdfOptions {
  share?: boolean;
}

/**
 * Formats a Date object or ISO string as DD/MM/YYYY
 */
export function formatDateDDMMYYYY(dateInput?: string | Date): string {
  if (!dateInput) return "-";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Builds the official L&T Construction Delivery / Return Challan HTML template.
 */
export function buildChallanHtml(challan: ChallanRecord): string {
  const isReturn =
    challan.challanType === "Return" || challan.type === "Return";
  const docTitle = isReturn ? "RETURN CHALLAN" : "DELIVERY CHALLAN";
  const docCode = isReturn ? "ECC-O&M/STR/907" : "ECC-O&M/STR/906";

  const challanNo = challan.challanNumber || challan._id || "DC-DRAFT";
  const indentNo =
    challan.indentNo && challan.indentNo.trim() !== "" && challan.indentNo !== "-"
      ? challan.indentNo.trim()
      : "-";
  const challanDate = formatDateDDMMYYYY(challan.challanDate);

  const vendor = challan.vendor || ({} as any);
  const vendorName = vendor.name || challan.subcontractorName || "Authorized Contractor";
  const vendorAddress = vendor.address || "-";
  const vendorGst = vendor.gstNumber || "-";
  const vendorPhone = vendor.contactPhone || "-";

  const siteCode = challan.siteCode || "-";
  const locationChainage = challan.locationChainage || "-";
  const vehicleNo = challan.vehicleNo || "-";
  const gatePassNo = challan.gatePassNo || "-";
  const consignorTaxNo = challan.consignorTaxNo || "-";

  const items = challan.items && challan.items.length > 0 ? challan.items : [];

  let totalQty = 0;
  items.forEach((it) => {
    totalQty += Number(it.quantity || 1);
  });

  const rowsHtml = items
    .map((item, idx) => {
      const code = item.toolCode || item.toolId || `ITEM-${idx + 1}`;
      const desc = item.description || "Tool / Equipment Item";
      const qty = item.quantity || 1;
      const unit = item.unit || "NOS";
      const rate = item.rate ? `₹${Number(item.rate).toLocaleString()}` : "-";
      const remarks = item.remarks || (isReturn ? item.returnStatus || "Returned" : "-");

      return `
        <tr>
          <td style="text-align: center; width: 40px;">${idx + 1}</td>
          <td style="font-family: monospace; font-weight: bold; width: 110px;">${code}</td>
          <td>${desc}</td>
          <td style="text-align: center; width: 60px; font-weight: bold;">${qty}</td>
          <td style="text-align: center; width: 50px;">${unit}</td>
          <td style="text-align: right; width: 75px;">${rate}</td>
          <td style="width: 100px;">${remarks}</td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docTitle} - ${challanNo}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #1e293b;
      margin: 0;
      padding: 0;
      line-height: 1.35;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .header-logo {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 1px;
      color: #0f172a;
      border: 2px solid #0f172a;
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .company-title {
      font-size: 14px;
      font-weight: bold;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .company-sub {
      font-size: 9px;
      color: #64748b;
    }
    .doc-badge {
      text-align: right;
    }
    .doc-title {
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .doc-ref {
      font-size: 9px;
      font-weight: bold;
      color: #475569;
    }
    .box-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .box-table td {
      border: 1px solid #94a3b8;
      padding: 6px;
      vertical-align: top;
    }
    .meta-col {
      width: 33.33%;
    }
    .label {
      font-size: 9px;
      font-weight: bold;
      text-transform: uppercase;
      color: #475569;
      display: block;
      margin-bottom: 2px;
    }
    .val {
      font-size: 11px;
      font-weight: bold;
      color: #0f172a;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .items-table th {
      background-color: #f1f5f9;
      border: 1px solid #94a3b8;
      padding: 6px 4px;
      font-size: 9px;
      font-weight: bold;
      text-transform: uppercase;
      color: #334155;
    }
    .items-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 5px;
      font-size: 10px;
    }
    .footer-signatures {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    .footer-signatures td {
      width: 25%;
      text-align: center;
      padding-top: 35px;
      font-size: 9px;
      font-weight: bold;
      color: #475569;
      border-top: 1px solid #cbd5e1;
    }
    .terms {
      font-size: 8.5px;
      color: #64748b;
      margin-top: 10px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 6px;
    }
  </style>
</head>
<body>

  <!-- Top Header -->
  <table class="header-table">
    <tr>
      <td style="width: 60px;">
        <span class="header-logo">L&T</span>
      </td>
      <td>
        <div class="company-title">LARSEN & TOUBRO LIMITED</div>
        <div class="company-sub">CONSTRUCTION EQUIPMENT DIVISION</div>
        <div class="company-sub">Regd. Office: L&T House, Ballard Estate, Mumbai - 400 001</div>
      </td>
      <td class="doc-badge">
        <div class="doc-ref">${docCode}</div>
        <div class="doc-title">${docTitle}</div>
      </td>
    </tr>
  </table>

  <!-- Challan 3-Column Header Box -->
  <table class="box-table">
    <tr>
      <td class="meta-col">
        <span class="label">${isReturn ? "RC NUMBER" : "DC NUMBER"}</span>
        <span class="val" style="font-family: monospace; font-size: 12px; color: #2563eb;">${challanNo}</span>
      </td>
      <td class="meta-col">
        <span class="label">INDENT NUMBER</span>
        <span class="val" style="font-family: monospace; font-size: 12px;">${indentNo}</span>
      </td>
      <td class="meta-col">
        <span class="label">DATE</span>
        <span class="val">${challanDate}</span>
      </td>
    </tr>
  </table>

  <!-- Consignee and Transit Grid -->
  <table class="box-table">
    <tr>
      <td style="width: 50%;">
        <span class="label">CONSIGNEE / DESTINATION PARTY</span>
        <div class="val" style="font-size: 12px; margin-bottom: 2px;">${vendorName}</div>
        <div style="font-size: 9.5px; color: #475569;">${vendorAddress}</div>
        <div style="font-size: 9.5px; color: #475569; margin-top: 2px;">
          <strong>GSTIN:</strong> ${vendorGst} &nbsp;|&nbsp; <strong>Phone:</strong> ${vendorPhone}
        </div>
      </td>
      <td style="width: 50%;">
        <span class="label">DISPATCH & TRANSIT DETAILS</span>
        <table style="width: 100%; border: none; font-size: 9.5px;">
          <tr>
            <td style="border:none; padding:1px; width:45%; color:#64748b;">Site Code:</td>
            <td style="border:none; padding:1px; font-weight:bold;">${siteCode}</td>
          </tr>
          <tr>
            <td style="border:none; padding:1px; color:#64748b;">Chainage / Location:</td>
            <td style="border:none; padding:1px; font-weight:bold;">${locationChainage}</td>
          </tr>
          <tr>
            <td style="border:none; padding:1px; color:#64748b;">Vehicle No:</td>
            <td style="border:none; padding:1px; font-weight:bold;">${vehicleNo}</td>
          </tr>
          <tr>
            <td style="border:none; padding:1px; color:#64748b;">Gate Pass No:</td>
            <td style="border:none; padding:1px; font-weight:bold;">${gatePassNo}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th>Sl</th>
        <th>Item Code</th>
        <th>Description & Technical Specification</th>
        <th>Qty</th>
        <th>Unit</th>
        <th>Rate</th>
        <th>Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="7" style="text-align:center; padding:15px; color:#94a3b8;">No equipment items associated</td></tr>`}
    </tbody>
    <tfoot>
      <tr style="background-color: #f8fafc; font-weight: bold;">
        <td colspan="3" style="text-align: right; padding-right: 10px;">TOTAL ITEMS: ${items.length}</td>
        <td style="text-align: center;">${totalQty}</td>
        <td colspan="3"></td>
      </tr>
    </tfoot>
  </table>

  <!-- Terms -->
  <div class="terms">
    <strong>Terms & Conditions:</strong><br/>
    1. The materials dispatched are for project execution / site work under Larsen & Toubro Limited.<br/>
    2. Any damage or discrepancy must be reported within 24 hours of receipt.<br/>
    3. Returnable materials must be re-dispatched accompanied by an official Return Challan (RC).
  </div>

  <!-- Signatures -->
  <table class="footer-signatures">
    <tr>
      <td>PREPARED BY (STORE IN-CHARGE)</td>
      <td>CHECKED & VERIFIED BY</td>
      <td>RECEIVED IN GOOD ORDER</td>
      <td>AUTHORIZED SIGNATORY</td>
    </tr>
  </table>

</body>
</html>
  `;
}

/**
 * Generates and shares or prints the official L&T Challan PDF document.
 */
export async function generateAndShareChallanPdf(
  challan: ChallanRecord,
  options: GenerateChallanPdfOptions = { share: true }
): Promise<string> {
  const html = buildChallanHtml(challan);

  // Generate PDF file
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  if (options.share) {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
        dialogTitle: `Share ${challan.challanNumber || "Challan"} PDF`,
      });
    }
  }

  return uri;
}

/**
 * Directly prints the Challan via system print dialogue.
 */
export async function printChallanDirectly(challan: ChallanRecord): Promise<void> {
  const html = buildChallanHtml(challan);
  await Print.printAsync({ html });
}
