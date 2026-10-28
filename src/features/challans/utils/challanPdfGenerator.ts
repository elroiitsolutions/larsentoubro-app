import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { ChallanRecord } from "../types";
import { challanService } from "../services/challanService";
import { LNT_LOGO_BASE64 } from "@/assets/logoBase64";

export interface GenerateChallanPdfOptions {
  share?: boolean;
  directDownload?: boolean;
}

/**
 * Formats a Date object or ISO string as DD-MM-YYYY (e.g. 08-10-2026) matching web DC format
 */
export function formatDateDDMMYYYY(dateInput?: string | Date): string {
  if (!dateInput) return new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Format DC/RC Number with 2-digit year and minimum 3-digit padding (e.g. DC-26-006, RC-26-001)
 */
export function formatDCNumber(numStr?: string): string {
  if (!numStr) return "DC-26-001";
  const str = String(numStr);
  return str.replace(/(SDC|DC|RC|STC|TC)-(\d{2,4})-(\d+)/i, (_, prefix, yr, num) => {
    const shortYr = String(yr).slice(-2);
    return `${prefix.toUpperCase()}-${shortYr}-${String(num).padStart(3, "0")}`;
  });
}

/**
 * Builds the official L&T Construction Delivery / Return Challan HTML template
 * mathematically matching the web application's jsPDF layout, coordinates, dimensions (182mm content, A4),
 * line gaps, typography, and borders.
 */
export function buildChallanHtml(challan: ChallanRecord): string {
  const isReturn =
    challan.challanType === "Return" || challan.type === "Return";

  const isScrapChallan = Boolean(
    challan.isScrapDC ||
    challan.challanType === "Scrap" ||
    (challan.challanNumber && String(challan.challanNumber).startsWith("SDC-")) ||
    challan.vendor?.profileType === "ScrapDealer" ||
    (challan.vendor?.vendorCode && String(challan.vendor.vendorCode).startsWith("SCR-")) ||
    (challan.remarks && typeof challan.remarks === "string" && challan.remarks.toLowerCase().includes("scrap")) ||
    (challan.notes && typeof challan.notes === "string" && challan.notes.toLowerCase().includes("scrap"))
  );

  const docTitle = isScrapChallan
    ? "SCRAP DELIVERY CHALLAN"
    : isReturn
    ? "RETURN CHALLAN"
    : "DELIVERY CHALLAN";

  const dcNoLabel = isScrapChallan ? "SDC NO." : isReturn ? "RC NO." : "DC NO.";
  const docCode = isReturn ? "ECC-O&M/STR/907" : (challan.docReferenceCode || "ECC-D&M/STR/906");

  const challanNo = formatDCNumber(challan.challanNumber || challan._id);
  const hasIndent = Boolean(
    challan.indentNo &&
    String(challan.indentNo).trim() !== "" &&
    challan.indentNo !== "-"
  );
  const indentNo = hasIndent ? String(challan.indentNo).trim() : "-";
  const challanDate = formatDateDDMMYYYY(challan.challanDate);

  const vendor = challan.vendor || ({} as any);
  const vendorName = challan.subcontractorName || vendor.name || "Authorized Subcontractor";
  const vendorAddr = vendor.address || "Site Work Location";
  const vendorGst = vendor.gstNumber || "-";
  const vendorCodeStr = vendor.vendorCode || challan.vendorCode || "-";
  const siteCodeStr =
    challan.siteCode !== undefined && challan.siteCode !== null && String(challan.siteCode).trim() !== "" && challan.siteCode !== "-"
      ? String(challan.siteCode)
      : "-";
  const locationStr = challan.locationChainage ? `Loc: ${challan.locationChainage}` : "";

  const trnCode = challan.trnCode || (isReturn ? "RET" : "M 25");
  const sendingCentreCode = challan.sendingCentreCode || "-";
  const mrNo = challan.mrNo || challan.mrnNo || "-";
  const mrDate = challan.mrDate || "-";
  const stockType = challan.stockType || "-";
  const ewayBillNo = challan.ewayBillNo || "-";

  const gatePassNo = challan.gatePassNo || "-";
  const gatePassApprovedBy = challan.gatePassApprovedBy || "-";
  const consignorTaxNo = challan.consignorTaxNo || "-";
  const vehicleNo = challan.vehicleNo || "-";
  const lrNo = challan.lrNo || "-";
  const freightStatus =
    challan.freightStatus && challan.freightStatus !== "NOT APPLICABLE"
      ? challan.freightStatus
      : "-";

  const receiverInfo = challan.receiverName
    ? `Receiver: ${challan.receiverName} (${challan.receiverMobile || "-"})`
    : "MRN NO. | DATE | SIGNATURE OF RECEIVER";

  const receiptDate = formatDateDDMMYYYY(challan.receiptDate || challan.challanDate);
  const remarksText = challan.remarks || challan.notes || "No remarks provided.";

  const items = Array.isArray(challan.items) && challan.items.length > 0 ? challan.items : [];

  let totalQty = 0;
  items.forEach((it) => {
    totalQty += Number(it.quantity || 1);
  });

  const rowsHtml = items
    .map((item, idx) => {
      const matCode = item.materialCode || item.toolCode || `MAT-${String(item.toolId || "").slice(-5)}`;
      const desc = item.description || "Tool Item";
      const toolQrId = item.toolId || item.tool || "";
      const unit = item.unit || "NOS";

      if (isReturn) {
        const itemAny = item as any;
        const issued = itemAny.issuedQuantity || item.quantity || 1;
        const returned = itemAny.returnedQuantity !== undefined ? itemAny.returnedQuantity : (itemAny.returnStatus === "Returned" ? item.quantity : 0);
        const missing = itemAny.missingQuantity !== undefined ? itemAny.missingQuantity : (itemAny.returnStatus === "Missing" ? item.quantity : 0);
        const status = itemAny.returnStatus || "Returned – Good";

        return `
          <tr>
            <td style="text-align: center; width: 10mm; font-weight: bold;">${idx + 1}</td>
            <td style="text-align: center; width: 24mm; font-weight: bold; font-family: monospace;">${matCode}</td>
            <td style="text-align: center; width: 26mm; font-size: 7.5pt; font-family: monospace; color: #000;">${toolQrId ? `QR: ${toolQrId}` : "-"}</td>
            <td style="text-align: left; width: 38mm; font-weight: bold;">${desc}</td>
            <td style="text-align: center; width: 12mm;">${unit}</td>
            <td style="text-align: center; width: 14mm;">${issued}</td>
            <td style="text-align: center; width: 16mm;">${returned}</td>
            <td style="text-align: center; width: 14mm;">${missing}</td>
            <td style="text-align: center; width: 28mm;">${status}</td>
          </tr>
        `;
      }

      const qty = item.quantity || 1;
      const rate = item.rate ? `Rs. ${item.rate}` : "-";

      return `
        <tr>
          <td style="text-align: center; width: 12mm; font-weight: bold;">${idx + 1}</td>
          <td style="text-align: center; width: 32mm; font-weight: bold; font-family: monospace;">${matCode}</td>
          <td style="text-align: left; width: 78mm;">
            <div style="font-weight: normal; font-size: 7.5pt;">${desc}</div>
            ${toolQrId ? `<div style="font-size: 7.5pt; font-family: monospace; color: #000000; margin-top: 1px;">ID: ${toolQrId}</div>` : ""}
          </td>
          <td style="text-align: center; width: 22mm;">${qty}</td>
          <td style="text-align: center; width: 16mm;">${unit}</td>
          <td style="text-align: center; width: 22mm;">${rate}</td>
        </tr>
      `;
    })
    .join("");

  const tableHeaderHtml = isReturn
    ? `
      <tr>
        <th style="width: 10mm;">SL. NO.</th>
        <th style="width: 24mm;">MAT. CODE</th>
        <th style="width: 26mm;">QR / ASSET ID</th>
        <th style="width: 38mm;">DESCRIPTION</th>
        <th style="width: 12mm;">UOM</th>
        <th style="width: 14mm;">ISSUED</th>
        <th style="width: 16mm;">RETURNED</th>
        <th style="width: 14mm;">MISSING</th>
        <th style="width: 28mm;">STATUS</th>
      </tr>
    `
    : `
      <tr>
        <th style="width: 12mm;">SL.<br/>NO.</th>
        <th style="width: 32mm;">MATERIAL CODE</th>
        <th style="width: 78mm;">DESCRIPTION &amp; QR</th>
        <th style="width: 22mm;">QUANTITY</th>
        <th style="width: 16mm;">UNIT</th>
        <th style="width: 22mm;">RATE RS.</th>
      </tr>
    `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=794, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>${docTitle} - ${challanNo}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      width: 100%;
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 8pt;
      color: #000000;
      line-height: 1.2;
    }
    .page-container {
      width: 182mm;
      max-width: 182mm;
      margin: 7mm auto 10mm auto;
      box-sizing: border-box;
    }
    .header-table {
      width: 182mm;
      border-collapse: collapse;
      table-layout: fixed;
      margin-bottom: 4mm;
    }
    .company-title {
      text-align: center;
      font-size: 15pt;
      font-weight: bold;
      color: #000000;
      letter-spacing: 0.2px;
    }
    
    /* Main Top Box (height 44mm, width 182mm) */
    .top-box-wrapper {
      width: 182mm;
      height: 44mm;
      border: 1px solid #000000;
      box-sizing: border-box;
      margin-bottom: 0;
    }
    
    .dc-title-area {
      text-align: center;
      font-size: 13pt;
      font-weight: bold;
      height: 12mm;
      line-height: 12mm;
      border-bottom: 1px solid #000000;
      box-sizing: border-box;
    }
    
    .meta-inner-table {
      width: 96mm;
      height: 18mm;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .meta-inner-table td {
      border: none !important;
      border-right: 1px solid #000000 !important;
      padding: 2.5mm 3mm;
      text-align: left;
      vertical-align: top;
      height: 18mm;
      box-sizing: border-box;
    }
    .meta-inner-table td:last-child {
      border-right: none !important;
    }
    
    .meta-lbl {
      font-size: 7.5pt;
      font-weight: bold;
      display: block;
      margin-bottom: 2mm;
    }
    .meta-val {
      font-size: 8.5pt;
      font-weight: normal;
    }

    .consignee-area {
      padding: 2.5mm 3.5mm !important;
      vertical-align: top;
      height: 30mm;
      box-sizing: border-box;
      position: relative;
    }
    
    /* 7-column accounting bar (height 14mm, width 182mm) */
    .accounting-bar {
      width: 182mm;
      height: 14mm;
      border-collapse: collapse;
      border-top: 1px solid #000000;
      table-layout: fixed;
    }
    .accounting-bar td {
      border: none !important;
      border-right: 1px solid #000000 !important;
      padding: 1.5mm 1mm;
      text-align: center;
      vertical-align: top;
      height: 14mm;
      box-sizing: border-box;
    }
    .accounting-bar td:last-child {
      border-right: none !important;
    }
    .bar-lbl {
      font-size: 5.2pt;
      font-weight: bold;
      line-height: 1.1;
      display: block;
      margin-bottom: 2mm;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: clip;
    }
    .bar-val {
      font-size: 8pt;
    }

    /* Red banner (height 9mm total) */
    .banner-red {
      color: #b40000;
      font-weight: bold;
      font-size: 8pt;
      text-align: center;
      margin-top: 3mm;
      margin-bottom: 1mm;
    }
    .banner-sub {
      font-size: 6.5pt;
      font-style: italic;
      color: #3c3c3c;
      text-align: center;
      margin-bottom: 2mm;
    }

    /* Items table */
    .items-table {
      width: 182mm;
      border-collapse: collapse;
      border: 1px solid #000000;
      table-layout: fixed;
      margin-bottom: 0;
    }
    .items-table th {
      background-color: #f0f0f0;
      border: 1px solid #000000;
      padding: 2.5mm 1mm;
      font-size: 7.5pt;
      font-weight: bold;
      text-align: center;
      vertical-align: middle;
      line-height: 1.2;
    }
    .items-table td {
      border: 1px solid #000000;
      padding: 2.5mm 2mm;
      font-size: 7.5pt;
      vertical-align: middle;
      line-height: 1.25;
    }

    /* Independent Modular Footer Rows (Prevents column collision) */
    .footer-row {
      width: 182mm;
      border-collapse: collapse;
      table-layout: fixed;
      border-left: 1px solid #000000;
      border-right: 1px solid #000000;
      border-bottom: 1px solid #000000;
      border-top: none;
      margin: 0;
      padding: 0;
    }
    /* First row has 4mm margin-top and top border */
    .footer-row-first {
      border-top: 1px solid #000000;
      margin-top: 4mm;
    }
    .footer-row td {
      border: none;
      border-right: 1px solid #000000;
      padding: 2.5mm 2.5mm;
      vertical-align: top;
      font-size: 7.5pt;
      box-sizing: border-box;
    }
    .footer-row td:last-child {
      border-right: none;
    }

    .bottom-info {
      width: 182mm;
      margin-top: 3mm;
      font-size: 8pt;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .copy-dist {
      font-size: 6pt;
      font-weight: bold;
      margin-top: 4mm;
      white-space: nowrap;
      width: 182mm;
    }
    .copy-dist .lbl {
      font-size: 7.5pt;
      font-weight: bold;
      margin-right: 4mm;
    }
    .copy-dist .item {
      display: inline-block;
      margin-right: 6mm;
      font-size: 6pt;
      vertical-align: middle;
    }
    .cb-box {
      display: inline-block;
      width: 2.8mm;
      height: 2.8mm;
      border: 1px solid #000000;
      vertical-align: middle;
      margin-right: 1.5mm;
      margin-bottom: 0.5mm;
    }
  </style>
</head>
<body>
<div class="page-container">

  <!-- Top Logo & Company Title -->
  <table class="header-table">
    <tr>
      <td style="width: 18mm; vertical-align: middle;">
        <img src="${LNT_LOGO_BASE64}" style="width: 16mm; height: 16mm; object-fit: contain;" alt="L&T Logo" />
      </td>
      <td style="vertical-align: middle; text-align: center;">
        <div class="company-title">Larsen &amp; Toubro Limited, Construction</div>
      </td>
      <td style="width: 18mm;"></td>
    </tr>
  </table>

  <!-- Main Top Box Container (Height: 44mm, Width: 182mm) -->
  <div class="top-box-wrapper">
    <!-- Upper Split: Title/Meta (96mm x 30mm) & Consignee (86mm x 30mm) -->
    <table style="width: 182mm; height: 30mm; border-collapse: collapse; table-layout: fixed;">
      <tr>
        <td style="width: 96mm; height: 30mm; border: none; border-right: 1px solid #000000; vertical-align: top; padding: 0;">
          <div class="dc-title-area">${docTitle}</div>
          <table class="meta-inner-table">
            <tr>
              <td style="width: 32mm;">
                <span class="meta-lbl">${dcNoLabel}</span>
                <span class="meta-val">${challanNo}</span>
              </td>
              <td style="width: 32mm;">
                <span class="meta-lbl">INDENT NO.</span>
                <span class="meta-val">${indentNo}</span>
              </td>
              <td style="width: 32mm;">
                <span class="meta-lbl">DATE</span>
                <span class="meta-val">${challanDate}</span>
              </td>
            </tr>
          </table>
        </td>

        <!-- Right: Consignee / Subcontractor (86mm x 30mm) -->
        <td style="width: 86mm; height: 30mm; border: none; vertical-align: top;" class="consignee-area">
          <div style="font-size: 8pt; font-weight: bold; margin-bottom: 1.5mm;">
            ${isReturn ? "SUBCONTRACTOR NAME" : "CONSIGNEE / SUBCONTRACTOR"}
          </div>
          <div style="font-size: 8.5pt; margin-bottom: 1mm;">${vendorName}</div>
          <div style="font-size: 7.5pt; color: #222; margin-bottom: 1mm;">Addr: ${vendorAddr}</div>
          ${locationStr ? `<div style="font-size: 7.5pt; color: #222; margin-bottom: 1mm;">${locationStr}</div>` : ""}
          ${!isScrapChallan ? `<div style="font-size: 7.5pt; color: #222; position: absolute; bottom: 2.5mm; left: 3.5mm;">Site Code: ${siteCodeStr}</div>` : ""}
        </td>
      </tr>
    </table>

    <!-- 7-Column Accounting Bar (Height: 14mm, Sum: 16+30+22+23+27+36+28 = 182mm) -->
    <table class="accounting-bar">
      <tr>
        <td style="width: 16mm;">
          <span class="bar-lbl">TRN CD</span>
          <span class="bar-val">${trnCode}</span>
        </td>
        <td style="width: 30mm;">
          <span class="bar-lbl">SENDING / ACCT CENTRE CODE</span>
          <span class="bar-val">${sendingCentreCode}</span>
        </td>
        <td style="width: 22mm;">
          <span class="bar-lbl">M.R.N. NO.</span>
          <span class="bar-val">${mrNo}</span>
        </td>
        <td style="width: 23mm;">
          <span class="bar-lbl">M.R.N. DATE</span>
          <span class="bar-val">${mrDate}</span>
        </td>
        <td style="width: 27mm;">
          <span class="bar-lbl">STOCK TYPE</span>
          <span class="bar-val">${stockType}</span>
        </td>
        <td style="width: 36mm;">
          <span class="bar-lbl">${isReturn ? "SITE CODE NO." : "VENDOR CODE"}</span>
          <span class="bar-val">${isReturn ? siteCodeStr : vendorCodeStr}</span>
        </td>
        <td style="width: 28mm;">
          <span class="bar-lbl">E-WAY BILL NO.</span>
          <span class="bar-val">${ewayBillNo}</span>
        </td>
      </tr>
    </table>
  </div>

  <!-- Red Notice (Gap: 3mm above, 2mm below) -->
  <div class="banner-red">
    ${isReturn ? "THE FOLLOWING IS THE RETURN STATUS OF MATERIALS ISSUED UNDER THE REFERENCED DELIVERY CHALLAN." : "NOT FOR SALE – MATERIAL ISSUED ON RETURNABLE BASIS"}
  </div>
  ${!isReturn ? `<div class="banner-sub">We have despatched the following goods. Kindly return the duplicate copy duly signed acknowledging receipt of goods</div>` : ""}

  <!-- Items Table (182mm) -->
  <table class="items-table">
    <thead>
      ${tableHeaderHtml}
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="${isReturn ? 9 : 6}" style="text-align: center; padding: 10px; color: #888;">No equipment items associated</td></tr>`}
    </tbody>
  </table>

  <!-- Footer Tables (Modular independent tables with 4mm gap from items table) -->
  ${isReturn ? `
    <!-- Return Challan Signatures Row (60.66mm + 60.66mm + 60.68mm = 182mm, Height: 28mm) -->
    <table class="footer-row footer-row-first" style="height: 28mm;">
      <tr>
        <td style="width: 60.66mm; height: 28mm; position: relative;">
          <b>SUBCONTRACTOR SIGNATURE</b>
          <div style="position: absolute; bottom: 2.5mm; left: 2.5mm; font-size: 7.5pt;">
            Returned By: ${receiverInfo}
          </div>
        </td>
        <td style="width: 60.66mm; height: 28mm; position: relative;">
          <b>VERIFIED BY</b>
          <div style="position: absolute; bottom: 2.5mm; left: 2.5mm; font-size: 7.5pt;">
            Verified Date: ${receiptDate}
          </div>
        </td>
        <td style="width: 60.68mm; height: 28mm; position: relative;">
          <b>STORE MANAGER</b>
          <div style="position: absolute; bottom: 2.5mm; left: 2.5mm; font-size: 7.5pt;">
            Approved Store Manager
          </div>
        </td>
      </tr>
    </table>

    <!-- Return Challan Remarks Row (Height: 14mm) -->
    <table class="footer-row" style="height: 14mm;">
      <tr>
        <td style="width: 182mm; height: 14mm;">
          <b>REMARKS</b>
          <div style="font-size: 8pt; margin-top: 1mm;">${remarksText}</div>
        </td>
      </tr>
    </table>
  ` : `
    <!-- Row 1: Gate Pass (140mm) & Total (42mm) - Height: 10mm -->
    <table class="footer-row footer-row-first" style="height: 10mm;">
      <tr>
        <td style="width: 140mm; height: 10mm; font-weight: bold; font-size: 8pt; vertical-align: middle;">
          GATE PASS NO. (${gatePassNo}) APPROVED BY (${gatePassApprovedBy})
        </td>
        <td style="width: 42mm; height: 10mm; font-weight: bold; font-size: 8pt; vertical-align: middle;">
          <div style="display: flex; justify-content: space-between; padding-right: 4px;">
            <span>TOTAL</span>
            <span>${totalQty}</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- Row 2: Tax Details (91mm + 91mm = 182mm) - Height: 12mm -->
    <table class="footer-row" style="height: 12mm;">
      <tr>
        <td style="width: 91mm; height: 12mm;">
          <b>CONSIGNOR SALES / GST TAX NO. &amp; DATE</b>
          <div style="font-size: 8pt; margin-top: 1mm;">${consignorTaxNo}</div>
        </td>
        <td style="width: 91mm; height: 12mm;">
          <b>CONSIGNEE / SUBCONTRACTOR GST NO. &amp; DATE</b>
          <div style="font-size: 8pt; margin-top: 1mm;">${vendorGst}</div>
        </td>
      </tr>
    </table>

    <!-- Row 3: Transit Details (70mm + 70mm + 42mm = 182mm) - Height: 12mm -->
    <table class="footer-row" style="height: 12mm;">
      <tr>
        <td style="width: 70mm; height: 12mm;">
          <b>VEHICLE / DESPATCH THROUGH</b>
          <div style="font-size: 8pt; margin-top: 1mm;">${vehicleNo}</div>
        </td>
        <td style="width: 70mm; height: 12mm;">
          <b>LR / RR NO. &amp; DATE</b>
          <div style="font-size: 8pt; margin-top: 1mm;">${lrNo}</div>
        </td>
        <td style="width: 42mm; height: 12mm;">
          <b>FREIGHT RS. TO PAY / PAID</b>
          <div style="font-size: 8pt; margin-top: 1mm;">${freightStatus}</div>
        </td>
      </tr>
    </table>

    <!-- Row 4: Receipt Details (91mm) & Signatures (91mm) - Height: 28mm -->
    <table class="footer-row" style="height: 28mm;">
      <tr>
        <td style="width: 91mm; height: 28mm; position: relative;">
          <b>RECEIPT DETAILS</b>
          <div style="font-size: 6.5pt; font-style: italic; color: #333; margin-top: 1mm; line-height: 1.25;">
            We have despatched the following goods. Kindly return the duplicate copy duly signed acknowledging receipt of goods.
          </div>
          <div style="position: absolute; bottom: 2.5mm; left: 2.5mm; font-size: 7.5pt;">
            ${receiverInfo}
          </div>
        </td>
        <td style="width: 91mm; height: 28mm; position: relative;">
          <b>FOR LARSEN &amp; TOUBRO LIMITED CONSTRUCTION DIVISION</b>
          <div style="position: absolute; bottom: 2.5mm; left: 0; width: 100%; text-align: center; font-weight: bold; font-size: 7.5pt;">
            AUTHORIZED SIGNATORY
          </div>
        </td>
      </tr>
    </table>

    <!-- Row 5: Remarks (182mm) - Height: 14mm -->
    <table class="footer-row" style="height: 14mm;">
      <tr>
        <td style="width: 182mm; height: 14mm;">
          <b>REMARKS</b>
          <div style="font-size: 8pt; margin-top: 1mm;">${remarksText}</div>
        </td>
      </tr>
    </table>
  `}

  <!-- Bottom Office & Distribution (Gap: 3mm above) -->
  <table class="bottom-info">
    <tr>
      <td style="width: 45mm; font-size: 8pt; font-weight: bold; border: none; padding: 0;">${docCode}</td>
      <td style="width: 137mm; text-align: center; font-size: 8pt; border: none; padding: 0;">
        Registered Office : L &amp; T House, Ballard Estate, Bombay - 400 038.
      </td>
    </tr>
  </table>

  <!-- Copy Distribution (Gap: 4mm above) -->
  <div class="copy-dist">
    <span class="lbl">COPY DISTRIBUTION:</span>
    <span class="item"><span class="cb-box"></span>CONSIGNEE</span>
    <span class="item"><span class="cb-box"></span>CONSIGNEE – CONSIGNOR</span>
    <span class="item"><span class="cb-box"></span>GATE PASS (SECURITY - ACCOUNTS)</span>
    <span class="item"><span class="cb-box"></span>CONSIGNOR'S FILE</span>
  </div>

</div>
</body>
</html>
  `;
}

// Session cache for user-selected download directory
let cachedDirectoryUri: string | null = null;

/**
 * Generates and automatically downloads (on Web) or shares/saves (on Mobile) the official L&T Challan PDF
 * with exact 1:1 scale matching the web application PDF.
 */
export async function downloadOrShareChallanPdf(
  challan: ChallanRecord,
  options: GenerateChallanPdfOptions = { share: true }
): Promise<string> {
  const safeNumber = String(challan.challanNumber || challan._id || "Delivery-Challan").replace(/[/\\?%*:|"<>]/g, "-");
  const filename = `${safeNumber}.pdf`;

  // 1. Web Browser: Automatic direct file download of official vector PDF
  if (Platform.OS === "web") {
    try {
      if (challan._id) {
        const blob = await challanService.downloadChallanPdfBlob(challan._id);
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        }, 300);
        return blobUrl;
      }
    } catch (err) {
      console.warn("Backend PDF download failed, falling back to print dialog:", err);
    }

    // Client-side fallback if backend was unreachable
    const html = buildChallanHtml(challan);
    await Print.printAsync({ html });
    return "";
  }

  // 2. Native Mobile (iOS & Android)
  // Generates exact A4 dimensions (595pt x 842pt) with zero container margin offset
  const html = buildChallanHtml(challan);
  const { uri } = await Print.printToFileAsync({
    html,
    width: 595,
    height: 842,
    base64: false,
    margins: {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    },
  });

  // Preserve the official challan filename (e.g. DC-26-040.pdf) in cache before sharing/saving
  let finalUri = uri;
  try {
    const targetUri = `${FileSystem.cacheDirectory}${filename}`;
    const info = await FileSystem.getInfoAsync(targetUri);
    if (info.exists) {
      await FileSystem.deleteAsync(targetUri, { idempotent: true });
    }
    await FileSystem.copyAsync({ from: uri, to: targetUri });
    finalUri = targetUri;
  } catch (err) {
    console.warn("Could not copy to named cache file, using temp uri:", err);
  }

  // Direct download to device storage on Android using StorageAccessFramework
  if (Platform.OS === "android" && options.directDownload) {
  let targetDirUri = cachedDirectoryUri;

  if (!targetDirUri) {
    try {
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        targetDirUri = permissions.directoryUri;
        cachedDirectoryUri = targetDirUri;
      } else {
        return "";
      }
    } catch (safPickerErr) {
      console.warn("StorageAccessFramework picker error:", safPickerErr);
    }
  }

  if (targetDirUri) {
    try {
      const base64Data = await FileSystem.readAsStringAsync(finalUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const createdFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
        targetDirUri,
        safeNumber,
        "application/pdf"
      );
      await FileSystem.writeAsStringAsync(createdFileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return createdFileUri;
    } catch (writeErr) {
      console.warn("Failed writing to directory, prompting folder selection again:", writeErr);
      cachedDirectoryUri = null;
      try {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          cachedDirectoryUri = permissions.directoryUri;
          const base64Data = await FileSystem.readAsStringAsync(finalUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const createdFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            safeNumber,
            "application/pdf"
          );
          await FileSystem.writeAsStringAsync(createdFileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          return createdFileUri;
        }
      } catch (retryErr) {
        console.warn("Direct download retry failed:", retryErr);
      }
    }
  }
}

if (options.share || (options.directDownload && Platform.OS === "ios")) {
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(finalUri, {
      UTI: ".pdf",
      mimeType: "application/pdf",
      dialogTitle: `Download ${challan.challanNumber || "Challan"} PDF`,
    });
  }
}

return finalUri;
}

/**
 * Backward compatibility alias for downloadOrShareChallanPdf.
 */
export const generateAndShareChallanPdf = downloadOrShareChallanPdf;

/**
 * Directly prints the Challan via system print dialogue.
 */
export async function printChallanDirectly(challan: ChallanRecord): Promise<void> {
  const html = buildChallanHtml(challan);
  await Print.printAsync({ html });
}
