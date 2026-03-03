/**
 * Export utilities for CSV, JSON, and PDF generation
 */

// CSV Export
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  columns: { key: string; header: string }[]
) {
  const headers = columns.map(c => c.header).join(',');
  const rows = data.map(row => 
    columns.map(col => {
      let value = row[col.key];
      if (value === null || value === undefined) {
        value = '';
      } else if (typeof value !== 'string') {
        value = String(value);
      }
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );
  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

// JSON Export (for backup/import)
export function exportToJSON(data: unknown, filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  downloadBlob(blob, `${filename}.json`);
}

// PDF Export (opens professionally styled print page)
export function exportToPDF(title: string, content: string, _filename: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @page {
          size: letter;
          margin: 0.75in 0.85in;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: 'Georgia', 'Times New Roman', serif;
          max-width: 8.5in;
          margin: 0 auto;
          color: #1a1a1a;
          line-height: 1.5;
          font-size: 10.5pt;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* ── Cover / Header ─────────────────────────────── */
        .report-header {
          background: linear-gradient(135deg, #0f2744 0%, #1e3a5f 60%, #2563eb 100%);
          color: white;
          padding: 48px 40px 36px;
          margin: -0.75in -0.85in 0;
          width: calc(100% + 1.7in);
        }
        .report-header .logo-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 32px;
        }
        .report-header .logo-mark {
          width: 36px; height: 36px;
          background: rgba(255,255,255,0.15);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 18px; font-family: sans-serif;
        }
        .report-header .logo-text {
          font-size: 22px; font-weight: 700; font-family: sans-serif;
          letter-spacing: -0.3px;
        }
        .report-header h1 {
          font-size: 28px; font-weight: 400; letter-spacing: -0.5px;
          margin: 0 0 6px; font-family: 'Georgia', serif;
        }
        .report-header .subtitle {
          font-size: 13px; opacity: 0.85; font-family: sans-serif;
        }
        .report-header .meta-row {
          display: flex; gap: 32px; margin-top: 20px;
          font-size: 11px; opacity: 0.7; font-family: sans-serif;
        }

        /* ── Typography ─────────────────────────────────── */
        h2 {
          font-size: 15px; font-weight: 700; color: #1e3a5f;
          text-transform: uppercase; letter-spacing: 0.06em;
          border-bottom: 2px solid #1e3a5f; padding-bottom: 6px;
          margin: 32px 0 14px; font-family: sans-serif;
        }
        h3 {
          font-size: 12px; font-weight: 700; color: #374151;
          margin: 16px 0 8px; font-family: sans-serif;
        }
        p { margin: 0 0 10px; }

        /* ── Summary Metrics ────────────────────────────── */
        .metrics-bar {
          display: flex; gap: 0;
          background: #f8fafc; border: 1px solid #e2e8f0;
          border-radius: 10px; overflow: hidden;
          margin: 20px 0 28px;
        }
        .metric {
          flex: 1; padding: 18px 16px; text-align: center;
          border-right: 1px solid #e2e8f0;
        }
        .metric:last-child { border-right: none; }
        .metric-value {
          font-size: 22px; font-weight: 700; font-family: sans-serif;
          color: #0f2744; line-height: 1.2;
        }
        .metric-label {
          font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em;
          color: #6b7280; margin-top: 4px; font-family: sans-serif;
        }

        /* ── Cards / Boxes ──────────────────────────────── */
        .info-box {
          background: #f8fafc; border-left: 4px solid #1e3a5f;
          padding: 16px 20px; margin: 14px 0 20px;
          border-radius: 0 6px 6px 0;
        }
        .info-box p { margin: 0; }

        .risk-badge {
          display: inline-block; padding: 6px 18px;
          border-radius: 20px; font-weight: 700;
          font-size: 14px; font-family: sans-serif;
        }
        .risk-low { background: #dcfce7; color: #166534; }
        .risk-moderate { background: #fef3c7; color: #92400e; }
        .risk-high { background: #fee2e2; color: #991b1b; }

        /* ── Tables ─────────────────────────────────────── */
        table {
          width: 100%; border-collapse: collapse;
          margin: 12px 0 20px; font-size: 9.5pt;
        }
        thead th {
          background: #0f2744; color: white;
          padding: 10px 12px; text-align: left;
          font-size: 8.5pt; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.05em;
          font-family: sans-serif;
        }
        thead th:first-child { border-radius: 6px 0 0 0; }
        thead th:last-child { border-radius: 0 6px 0 0; }
        tbody td {
          padding: 9px 12px; border-bottom: 1px solid #e5e7eb;
          vertical-align: top;
        }
        tbody tr:nth-child(even) { background: #f9fafb; }
        tbody tr:last-child td { border-bottom: none; }

        .severity-high { color: #dc2626; font-weight: 700; }
        .severity-moderate { color: #d97706; font-weight: 700; }
        .severity-low { color: #16a34a; font-weight: 700; }
        .gain { color: #16a34a; }
        .loss { color: #dc2626; }

        /* ── Two-Column Layout ──────────────────────────── */
        .two-col { display: flex; gap: 24px; }
        .two-col > div { flex: 1; }

        /* ── Footer ─────────────────────────────────────── */
        .report-footer {
          margin-top: 40px; padding-top: 16px;
          border-top: 2px solid #1e3a5f;
          font-size: 8pt; color: #6b7280;
          font-family: sans-serif;
        }
        .report-footer .brand {
          font-weight: 700; color: #1e3a5f; font-size: 9pt;
        }

        /* ── Disclosures ────────────────────────────────── */
        .disclosures {
          font-size: 7.5pt; color: #9ca3af; line-height: 1.6;
          margin-top: 24px;
        }
        .disclosures p { margin-bottom: 6px; }

        /* ── Print Adjustments ──────────────────────────── */
        @media print {
          .report-header {
            margin: -0.75in -0.85in 0;
            width: calc(100% + 1.7in);
          }
          .no-print { display: none; }
          .page-break { page-break-before: always; }
        }
        @media screen {
          body { padding: 0; }
          .report-header { margin: 0; width: 100%; border-radius: 0; }
        }
      </style>
    </head>
    <body>
      ${content}
      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `);
  
  printWindow.document.close();
}

// Helper to download blob
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
