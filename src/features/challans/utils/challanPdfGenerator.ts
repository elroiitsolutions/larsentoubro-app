import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ChallanRecord } from "../types";
import { challanService } from "../services/challanService";
import { LNT_LOGO_BASE64 } from "@/assets/logoBase64";

export interface GenerateChallanPdfOptions {
  share?: boolean;
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
 * perfectly matching the web application and reference document layout.
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
  const freightStatus = challan.freightStatus || "-";

  const receiverInfo = challan.receiverName
    ? `Receiver: ${challan.receiverName} (${challan.receiverMobile || "-"})`
    : "MRN NO. | DATE | SIGNATURE OF RECEIVER";

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
      const qty = item.quantity || 1;
      const unit = item.unit || "NOS";
      const rate = item.rate ? `Rs. ${item.rate}` : "-";

      return `
        <tr>
          <td style="text-align: center; width: 45px; font-weight: bold; border: 1.5px solid #000; padding: 4px;">${idx + 1}</td>
          <td style="text-align: center; width: 130px; font-weight: bold; font-family: monospace; border: 1.5px solid #000; padding: 4px;">${matCode}</td>
          <td style="text-align: left; border: 1.5px solid #000; padding: 4px 6px;">
            <div style="font-weight: bold; font-size: 8.5px;">${desc}</div>
            ${toolQrId ? `<div style="font-size: 7.5px; font-family: monospace; color: #1e3a8a; margin-top: 1px;">ID: ${toolQrId}</div>` : ""}
          </td>
          <td style="text-align: center; width: 65px; border: 1.5px solid #000; padding: 4px;">${qty}</td>
          <td style="text-align: center; width: 50px; border: 1.5px solid #000; padding: 4px;">${unit}</td>
          <td style="text-align: center; width: 75px; border: 1.5px solid #000; padding: 4px;">${rate}</td>
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
      margin: 8mm 10mm 10mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9px;
      color: #000000;
      margin: 0;
      padding: 0;
      background: #ffffff;
      line-height: 1.25;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
    }
    .company-title {
      text-align: center;
      font-size: 15px;
      font-weight: bold;
      color: #000000;
      padding-top: 8px;
      letter-spacing: 0.3px;
    }
    
    /* Main bordered box */
    .main-box {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #000000;
      margin-bottom: 0;
    }
    .main-box td {
      border: 1.5px solid #000000;
      vertical-align: top;
      padding: 0;
    }
    
    .dc-title-area {
      text-align: center;
      font-size: 13px;
      font-weight: bold;
      padding: 6px 2px;
      border-bottom: 1.5px solid #000000;
    }
    
    .meta-inner-table {
      width: 100%;
      border-collapse: collapse;
    }
    .meta-inner-table td {
      border: none !important;
      border-right: 1.5px solid #000000 !important;
      padding: 4px 6px;
      text-align: left;
    }
    .meta-inner-table td:last-child {
      border-right: none !important;
    }
    
    .meta-lbl {
      font-size: 7.5px;
      font-weight: bold;
      display: block;
      margin-bottom: 2px;
    }
    .meta-val {
      font-size: 8.5px;
      font-weight: normal;
    }

    .consignee-area {
      padding: 6px 8px !important;
    }
    
    /* 7-column bar */
    .accounting-bar {
      width: 100%;
      border-collapse: collapse;
      border-top: 1.5px solid #000000;
    }
    .accounting-bar td {
      border: none !important;
      border-right: 1.5px solid #000000 !important;
      padding: 3px 2px;
      text-align: center;
      vertical-align: top;
    }
    .accounting-bar td:last-child {
      border-right: none !important;
    }
    .bar-lbl {
      font-size: 6px;
      font-weight: bold;
      line-height: 1.1;
      display: block;
      margin-bottom: 2px;
    }
    .bar-val {
      font-size: 8px;
    }

    /* Red banner */
    .banner-red {
      color: #b40000;
      font-weight: bold;
      font-size: 8.5px;
      text-align: center;
      padding: 4px 0 1px 0;
    }
    .banner-sub {
      font-size: 7.5px;
      font-style: italic;
      color: #3c3c3c;
      text-align: center;
      margin-bottom: 4px;
    }

    /* Items table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #000000;
    }
    .items-table th {
      background-color: #f0f0f0;
      border: 1.5px solid #000000;
      padding: 4px 3px;
      font-size: 8px;
      font-weight: bold;
      text-align: center;
    }
    .items-table td {
      border: 1.5px solid #000000;
      padding: 4px 5px;
      font-size: 8px;
      vertical-align: middle;
    }

    /* Footer structure */
    .footer-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #000000;
      border-top: none;
    }
    .footer-table td {
      border: 1.5px solid #000000;
      padding: 3px 6px;
      vertical-align: top;
      font-size: 7.5px;
    }

    .bottom-info {
      width: 100%;
      margin-top: 4px;
      font-size: 7.5px;
    }
    .copy-dist {
      font-size: 7px;
      font-weight: bold;
      margin-top: 3px;
    }
  </style>
</head>
<body>

  <!-- Top Logo & Company Title -->
  <table class="header-table">
    <tr>
      <td style="width: 60px; vertical-align: middle;">
        <img src="${LNT_LOGO_BASE64}" style="width: 52px; height: 52px; object-fit: contain;" alt="L&T Logo" />
      </td>
      <td style="vertical-align: middle;">
        <div class="company-title">Larsen &amp; Toubro Limited, Construction</div>
      </td>
      <td style="width: 60px;"></td>
    </tr>
  </table>

  <!-- Main Box -->
  <table class="main-box">
    <tr>
      <!-- Left Half: Title & DC / Indent / Date -->
      <td style="width: 53%;">
        <div class="dc-title-area">${docTitle}</div>
        <table class="meta-inner-table">
          <tr>
            ${hasIndent ? `
              <td style="width: 33.3%;">
                <span class="meta-lbl">${dcNoLabel}</span>
                <span class="meta-val"><b>${challanNo}</b></span>
              </td>
              <td style="width: 33.3%;">
                <span class="meta-lbl">INDENT NO.</span>
                <span class="meta-val"><b>${indentNo}</b></span>
              </td>
              <td style="width: 33.4%;">
                <span class="meta-lbl">DATE</span>
                <span class="meta-val"><b>${challanDate}</b></span>
              </td>
            ` : `
              <td style="width: 50%;">
                <span class="meta-lbl">${dcNoLabel}</span>
                <span class="meta-val"><b>${challanNo}</b></span>
              </td>
              <td style="width: 50%;">
                <span class="meta-lbl">DATE</span>
                <span class="meta-val"><b>${challanDate}</b></span>
              </td>
            `}
          </tr>
        </table>
      </td>

      <!-- Right Half: Consignee / Subcontractor -->
      <td style="width: 47%;" class="consignee-area">
        <div style="font-size: 8px; font-weight: bold; margin-bottom: 2px;">
          ${isReturn ? "SUBCONTRACTOR NAME" : "CONSIGNEE / SUBCONTRACTOR"}
        </div>
        <div style="font-size: 9px; font-weight: bold; margin-bottom: 2px;">${vendorName}</div>
        <div style="font-size: 8px; color: #222; margin-bottom: 1px;">Addr: ${vendorAddr}</div>
        ${locationStr ? `<div style="font-size: 8px; color: #222; margin-bottom: 1px;">${locationStr}</div>` : ""}
        ${!isScrapChallan ? `<div style="font-size: 8px; color: #222;">Site Code: ${siteCodeStr}</div>` : ""}
      </td>
    </tr>

    <!-- 7-Column Row -->
    <tr>
      <td colspan="2" style="padding: 0;">
        <table class="accounting-bar">
          <tr>
            <td style="width: 9%;">
              <span class="bar-lbl">TRN CD</span>
              <span class="bar-val">${trnCode}</span>
            </td>
            <td style="width: 17%;">
              <span class="bar-lbl">SENDING / ACCT CENTRE CODE</span>
              <span class="bar-val">${sendingCentreCode}</span>
            </td>
            <td style="width: 12%;">
              <span class="bar-lbl">M.R.N. NO.</span>
              <span class="bar-val">${mrNo}</span>
            </td>
            <td style="width: 12%;">
              <span class="bar-lbl">M.R.N. DATE</span>
              <span class="bar-val">${mrDate}</span>
            </td>
            <td style="width: 14%;">
              <span class="bar-lbl">STOCK TYPE</span>
              <span class="bar-val">${stockType}</span>
            </td>
            <td style="width: 20%;">
              <span class="bar-lbl">${isReturn ? "SITE CODE NO." : "VENDOR CODE"}<div style="font-size: 5.5px; font-weight: normal;">EMAIL ADDRESS</div></span>
              <span class="bar-val">${isReturn ? siteCodeStr : vendorCodeStr}</span>
            </td>
            <td style="width: 16%;">
              <span class="bar-lbl">E-WAY BILL NO.</span>
              <span class="bar-val">${ewayBillNo}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Red Notice -->
  <div class="banner-red">
    ${isReturn ? "THE FOLLOWING IS THE RETURN STATUS OF MATERIALS ISSUED UNDER THE REFERENCED DELIVERY CHALLAN." : "NOT FOR SALE – MATERIAL ISSUED ON RETURNABLE BASIS"}
  </div>
  ${!isReturn ? `<div class="banner-sub">We have despatched the following goods. Kindly return the duplicate copy duly signed acknowledging receipt of goods</div>` : ""}

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 45px;">SL. NO.</th>
        <th style="width: 130px;">MATERIAL CODE</th>
        <th>DESCRIPTION &amp; QR</th>
        <th style="width: 65px;">QUANTITY</th>
        <th style="width: 50px;">UNIT</th>
        <th style="width: 75px;">RATE RS.</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="6" style="text-align: center; padding: 12px; color: #888;">No equipment items associated</td></tr>`}
    </tbody>
  </table>

  <!-- Footer Tables -->
  <table class="footer-table">
    <!-- Row 1: Gate Pass & Total -->
    <tr>
      <td style="width: 76%; font-weight: bold;">
        GATE PASS NO. (${gatePassNo}) APPROVED BY (${gatePassApprovedBy})
      </td>
      <td style="width: 24%; text-align: right; font-weight: bold;">
        TOTAL &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${totalQty}
      </td>
    </tr>

    <!-- Row 2: Tax Details -->
    <tr>
      <td style="width: 50%;">
        <b>CONSIGNOR SALES / GST TAX NO. &amp; DATE</b><br/>
        <span>${consignorTaxNo}</span>
      </td>
      <td style="width: 50%;">
        <b>CONSIGNEE / SUBCONTRACTOR GST NO. &amp; DATE</b><br/>
        <span>${vendorGst}</span>
      </td>
    </tr>

    <!-- Row 3: Transit Details -->
    <tr>
      <td colspan="2" style="padding: 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 38%; border: none !important; border-right: 1.5px solid #000 !important; padding: 3px 6px;">
              <b>VEHICLE / DESPATCH THROUGH</b><br/>
              <span>${vehicleNo}</span>
            </td>
            <td style="width: 38%; border: none !important; border-right: 1.5px solid #000 !important; padding: 3px 6px;">
              <b>LR / RR NO. &amp; DATE</b><br/>
              <span>${lrNo}</span>
            </td>
            <td style="width: 24%; border: none !important; padding: 3px 6px;">
              <b>FREIGHT RS. TO PAY / PAID</b><br/>
              <span>${freightStatus}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Row 4: Receipt & Signatures -->
    <tr>
      <td style="width: 50%; height: 60px; vertical-align: top;">
        <b>RECEIPT DETAILS</b>
        <div style="font-size: 7px; font-style: italic; color: #333; margin-top: 1px;">
          We have despatched the following goods. Kindly return the duplicate copy duly signed acknowledging receipt of goods.
        </div>
        <div style="margin-top: 20px; font-size: 7.5px;">
          ${receiverInfo}
        </div>
      </td>
      <td style="width: 50%; height: 60px; vertical-align: top;">
        <b>FOR LARSEN &amp; TOUBRO LIMITED CONSTRUCTION DIVISION</b>
        <div style="margin-top: 36px; text-align: center; font-weight: bold; font-size: 8px;">
          AUTHORIZED SIGNATORY
        </div>
      </td>
    </tr>

    <!-- Row 5: Remarks -->
    <tr>
      <td colspan="2">
        <b>REMARKS</b><br/>
        <span>${remarksText}</span>
      </td>
    </tr>
  </table>

  <!-- Bottom Office & Distribution -->
  <table class="bottom-info" style="width: 100%; border-collapse: collapse; margin-top: 4px;">
    <tr>
      <td style="width: 25%; font-size: 8px; font-weight: bold;">${docCode}</td>
      <td style="width: 75%; text-align: center; font-size: 8px;">
        Registered Office : L &amp; T House, Ballard Estate, Bombay - 400 038.
      </td>
    </tr>
  </table>

  <div class="copy-dist">
    COPY DISTRIBUTION: &nbsp;&nbsp;&nbsp;&nbsp;
    &#9633; CONSIGNEE &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    &#9633; CONSIGNEE – CONSIGNOR &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    &#9633; GATE PASS (SECURITY - ACCOUNTS) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    &#9633; CONSIGNOR'S FILE
  </div>

</body>
</html>
  `;
}

/**
 * Generates and automatically downloads (on Web) or shares/saves (on Mobile) the official L&T Challan PDF.
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
  const html = buildChallanHtml(challan);
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
