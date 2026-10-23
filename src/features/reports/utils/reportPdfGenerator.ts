import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export interface ColumnDefinition {
  title: string;
  key: string;
  render?: (row: any) => string;
}

export interface GenerateReportPdfOptions {
  title: string;
  subtitle?: string;
  stats?: Array<{ label: string; value: string | number }>;
  columns: ColumnDefinition[];
  data: any[];
}

export async function generateAndShareReportPdf(options: GenerateReportPdfOptions): Promise<void> {
  const { title, subtitle, stats = [], columns, data } = options;

  if (!data || data.length === 0) {
    Alert.alert('Notice', 'No data to export for this report.');
    return;
  }

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const currentTime = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const statsHtml =
    stats.length > 0
      ? `
      <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
        ${stats
          .map(
            (s) => `
          <div style="flex: 1; min-width: 120px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 700; letter-spacing: 0.5px;">${s.label}</div>
            <div style="font-size: 18px; font-weight: 800; color: #0F172A; margin-top: 4px;">${s.value}</div>
          </div>
        `
          )
          .join('')}
      </div>
    `
      : '';

  const tableHeaderHtml = columns
    .map(
      (c) => `
      <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #1E293B; background-color: #F1F5F9; border-bottom: 2px solid #CBD5E1; text-transform: uppercase;">
        ${c.title}
      </th>
    `
    )
    .join('');

  const tableRowsHtml = data
    .slice(0, 500) // safety limit for mobile PDF engine
    .map((row, idx) => {
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      const cells = columns
        .map((col) => {
          let val = '';
          if (col.render) {
            val = col.render(row);
          } else {
            val = row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '-';
          }
          return `
          <td style="padding: 9px 12px; font-size: 11px; color: #334155; border-bottom: 1px solid #E2E8F0; word-break: break-word;">
            ${val}
          </td>
        `;
        })
        .join('');

      return `<tr style="background-color: ${bg};">${cells}</tr>`;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title} - L&T Construction</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 15mm 12mm 15mm 12mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0F172A;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #002B49;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .brand-title {
            font-size: 20px;
            font-weight: 900;
            color: #002B49;
            letter-spacing: -0.5px;
          }
          .brand-sub {
            font-size: 12px;
            color: #64748B;
            font-weight: 600;
            margin-top: 2px;
          }
          .doc-title {
            font-size: 18px;
            font-weight: 800;
            color: #0F172A;
            margin-top: 10px;
          }
          .meta-info {
            text-align: right;
            font-size: 11px;
            color: #475569;
            line-height: 1.5;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          .footer {
            margin-top: 24px;
            padding-top: 8px;
            border-top: 1px solid #E2E8F0;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #94A3B8;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="brand-title">LARSEN &amp; TOUBRO</div>
            <div class="brand-sub">ECC Construction Division • Asset Management &amp; Tracking</div>
            <div class="doc-title">${title}</div>
            ${subtitle ? `<div style="font-size: 12px; color: #64748B; margin-top: 2px;">${subtitle}</div>` : ''}
          </div>
          <div class="meta-info">
            <div><strong>Generated:</strong> ${currentDate} ${currentTime}</div>
            <div><strong>Total Records:</strong> ${data.length}</div>
            <div><strong>Confidentiality:</strong> Internal L&amp;T Use Only</div>
          </div>
        </div>

        ${statsHtml}

        <table>
          <thead>
            <tr>${tableHeaderHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        ${
          data.length > 500
            ? `<div style="padding: 12px; font-size: 11px; color: #D97706; text-align: center; background: #FFFBEB; border: 1px solid #FDE68A; margin-top: 10px; border-radius: 6px;">
                 Showing first 500 records. For complete large-scale datasets, use CSV/Excel export.
               </div>`
            : ''
        }

        <div class="footer">
          <div>System Generated Report • Larsen &amp; Toubro Asset Tracking Engine</div>
          <div>Page 1 of 1</div>
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
      });
    } else {
      Alert.alert('PDF Created', `Report PDF generated successfully at:\n${uri}`);
    }
  } catch (error: any) {
    Alert.alert('PDF Export Failed', error?.message || 'Could not compile report PDF.');
  }
}
