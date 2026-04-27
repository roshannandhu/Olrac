import { jsPDF } from 'jspdf'
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { saveAs } from 'file-saver'

import { formatInr, getBookingStatusMeta } from '../utils/adminUi'

const FALLBACK_SETTINGS = {
  whatsapp_number: '919876543210',
  contact_email: 'support@olrac.com',
  config: {
    general_app_name: 'OLRAC Advertising',
    general_contact_phone: '',
    invoice_company_name: 'OLRAC Advertising Pvt Ltd',
    invoice_address: '',
    invoice_gst: '',
    invoice_logo_url: '',
    invoice_seal_url: '',
    general_logo_url: '',
  },
}

const FONT_COLOR = '0F172A'
const MUTED_COLOR = '64748B'
const BORDER_COLOR = 'D7DEE8'
const HEADER_FILL = '334155'

function readPublicSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem('olrac_public_settings') || '{}')
    return {
      ...FALLBACK_SETTINGS,
      ...parsed,
      config: {
        ...FALLBACK_SETTINGS.config,
        ...(parsed.config || {}),
      },
    }
  } catch {
    return FALLBACK_SETTINGS
  }
}

function compressSummary(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  if (normalized.length <= 210) return normalized
  const trimmed = normalized.slice(0, 207)
  const lastSpace = trimmed.lastIndexOf(' ')
  return `${trimmed.slice(0, lastSpace > 150 ? lastSpace : 207).trim()}...`
}

function buildInvoiceSummary(booking, billingLabel) {
  const aiSummary = compressSummary(booking.ai_summary)
  if (aiSummary) return aiSummary

  const company = booking.company || booking.client_name || 'the client'
  const location = booking.screen_name || 'the selected location'
  const area = booking.screen_area ? ` in ${booking.screen_area}` : ''
  const description = compressSummary(booking.polished_description || booking.ad_description || 'brand visibility campaign')

  return compressSummary(
    `${company} has secured an advertising booking for ${location}${area} under the ${billingLabel} plan at ${formatInr(booking.total_price)}. ` +
    `This campaign is positioned to deliver strong visibility and promote: ${description}`
  )
}

function buildInvoiceData(booking) {
  const settings = readPublicSettings()
  const config = settings.config || {}
  const billingLabel = booking.duration_label || 'Custom Package'
  const status = getBookingStatusMeta(booking.status)

  return {
    companyName: config.invoice_company_name || config.general_app_name || 'OLRAC Advertising',
    logoUrl: config.invoice_logo_url || config.general_logo_url || '',
    sealUrl: config.invoice_seal_url || '',
    email: settings.contact_email || 'support@olrac.com',
    phone: config.general_contact_phone || settings.whatsapp_number || '+91 98765 43210',
    invoiceId: `INV-${String(booking.id).padStart(5, '0')}`,
    invoiceDate: new Date(booking.created_at || Date.now()).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    clientName: booking.client_name || 'N/A',
    clientCompany: booking.company || 'Not provided',
    clientPhone: booking.phone || 'Not provided',
    location: booking.screen_name || 'N/A',
    bookingDate: new Date(booking.created_at || Date.now()).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    timeSlot: billingLabel,
    status,
    quantity: String(booking.slot_quantity || 1),
    amount: formatInr(booking.total_price || 0),
    total: formatInr(booking.total_price || 0),
    summary: buildInvoiceSummary(booking, billingLabel),
  }
}

async function fetchImageBytes(url) {
  if (!url) return null
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const buffer = await blob.arrayBuffer()
    return new Uint8Array(buffer)
  } catch {
    return null
  }
}

async function fetchImageDataUrl(url) {
  if (!url) return null
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function pdfLabelValue(doc, label, value, x, y, labelWidth = 23) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
  doc.text(label, x, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(15, 23, 42)
  doc.text(String(value), x + labelWidth, y)
}

function docxNoBorderCell(children, width) {
  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
    },
    children,
  })
}

function docxBodyText(text, { bold = false, color = FONT_COLOR, size = 18, align = AlignmentType.LEFT } = {}) {
  return new Paragraph({
    alignment: align,
    spacing: { after: 70, line: 300 },
    children: [new TextRun({ text, bold, size, color })],
  })
}

function docxSpacer(after = 80) {
  return new Paragraph({
    spacing: { after },
    children: [],
  })
}

function docxDivider() {
  return new Paragraph({
    border: { bottom: { color: BORDER_COLOR, style: BorderStyle.SINGLE, size: 6 } },
    spacing: { after: 90 },
  })
}

function docxLabelValue(label, value) {
  return new Paragraph({
    spacing: { after: 70, line: 300 },
    children: [
      new TextRun({ text: `${label}  `, bold: true, size: 18, color: MUTED_COLOR }),
      new TextRun({ text: String(value), size: 18, color: FONT_COLOR }),
    ],
  })
}

function docxTableCell(text, { width, align = AlignmentType.LEFT, fill, color = FONT_COLOR, bold = false } = {}) {
  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: fill ? { fill } : undefined,
    verticalAlign: 'center',
    margins: { top: 90, bottom: 90, left: 110, right: 110 },
    borders: {
      top: { style: BorderStyle.SINGLE, color: BORDER_COLOR, size: 1 },
      bottom: { style: BorderStyle.SINGLE, color: BORDER_COLOR, size: 1 },
      left: { style: BorderStyle.SINGLE, color: BORDER_COLOR, size: 1 },
      right: { style: BorderStyle.SINGLE, color: BORDER_COLOR, size: 1 },
    },
    children: [
      new Paragraph({
        alignment: align,
        spacing: { after: 0, line: 260 },
        children: [new TextRun({ text, bold, size: 18, color })],
      }),
    ],
  })
}

function docxSummaryBox(text) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: 'F8FAFC' },
            margins: { top: 160, bottom: 160, left: 190, right: 190 },
            borders: {
              top: { style: BorderStyle.SINGLE, color: BORDER_COLOR, size: 1 },
              bottom: { style: BorderStyle.SINGLE, color: BORDER_COLOR, size: 1 },
              left: { style: BorderStyle.SINGLE, color: BORDER_COLOR, size: 1 },
              right: { style: BorderStyle.SINGLE, color: BORDER_COLOR, size: 1 },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 0, line: 320 },
                children: [new TextRun({ text, size: 18, color: '334155' })],
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

export async function generateInvoicePDF(booking) {
  const invoice = buildInvoiceData(booking)
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const logoDataUrl = await fetchImageDataUrl(invoice.logoUrl)
  const sealDataUrl = await fetchImageDataUrl(invoice.sealUrl)

  doc.setFillColor(245, 247, 250)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(12, 12, pageWidth - 24, pageHeight - 24, 4, 4, 'F')

  const innerLeft = 20
  const innerRight = pageWidth - 20
  let y = 22

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', innerLeft, y, 18, 18)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(15, 23, 42)
  doc.text(invoice.companyName, 45, y + 8)

  doc.setFontSize(20)
  doc.text('INVOICE', innerRight, y + 6, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(71, 85, 105)
  doc.text(`Invoice ID: ${invoice.invoiceId}`, innerRight, y + 13, { align: 'right' })
  doc.text(`Date: ${invoice.invoiceDate}`, innerRight, y + 18, { align: 'right' })

  y = 50
  doc.setDrawColor(215, 222, 232)
  doc.line(innerLeft, y, innerRight, y)

  y += 10
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(11)
  doc.text('Client Details', innerLeft, y)
  doc.text('Booking Details', 110, y)

  y += 8
  pdfLabelValue(doc, 'Name', invoice.clientName, innerLeft, y)
  pdfLabelValue(doc, 'Location', invoice.location, 110, y, 26)
  y += 8
  pdfLabelValue(doc, 'Company', invoice.clientCompany, innerLeft, y)
  pdfLabelValue(doc, 'Date', invoice.bookingDate, 110, y, 26)
  y += 8
  pdfLabelValue(doc, 'Phone', invoice.clientPhone, innerLeft, y)
  pdfLabelValue(doc, 'Time Slot', invoice.timeSlot, 110, y, 26)
  y += 8
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(71, 85, 105)
  doc.text('Status', 110, y)
  doc.setFillColor(...invoice.status.pdfFill)
  doc.roundedRect(136, y - 5.2, 25, 8, 2, 2, 'F')
  doc.setFontSize(8.5)
  doc.setTextColor(...invoice.status.pdfText)
  doc.text(invoice.status.invoiceLabel, 148.5, y, { align: 'center' })

  y = 102
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text('Pricing Table', innerLeft, y)

  y += 8
  doc.setFillColor(51, 65, 85)
  doc.roundedRect(innerLeft, y, pageWidth - 40, 10, 2, 2, 'F')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('Description', 24, y + 6.4)
  doc.text('Quantity', 107, y + 6.4)
  doc.text('Amount', 143, y + 6.4)
  doc.text('Total', innerRight - 4, y + 6.4, { align: 'right' })

  y += 10
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(215, 222, 232)
  doc.roundedRect(innerLeft, y, pageWidth - 40, 13, 2, 2, 'FD')
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'normal')
  doc.text('Ad Slot Booking', 24, y + 8)
  doc.text(invoice.quantity, 111, y + 8)
  doc.text(invoice.amount, 143, y + 8)
  doc.setFont('helvetica', 'bold')
  doc.text(invoice.total, innerRight - 4, y + 8, { align: 'right' })

  y += 18
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(105, y, pageWidth - 125, 12, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(71, 85, 105)
  doc.text('Total', 111, y + 7.5)
  doc.setTextColor(15, 23, 42)
  doc.text(invoice.total, innerRight - 4, y + 7.5, { align: 'right' })

  y += 24
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text('Summary', innerLeft, y)

  y += 8
  const summaryLines = doc.splitTextToSize(invoice.summary, pageWidth - 52)
  const summaryHeight = Math.max(18, summaryLines.length * 5.2 + 7)
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(215, 222, 232)
  doc.roundedRect(innerLeft, y, pageWidth - 40, summaryHeight, 2, 2, 'FD')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.2)
  doc.setTextColor(51, 65, 81)
  doc.text(summaryLines, 24, y + 6.8)

  const signatureY = y + summaryHeight + 15
  if (sealDataUrl) {
    doc.addImage(sealDataUrl, 'PNG', innerLeft + 2, signatureY - 2, 24, 24)
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text('Authorized by OLRAC Advertising', 56, signatureY + 8)
  doc.text('EST. 2026', 56, signatureY + 14)
  doc.line(56, signatureY + 18, 118, signatureY + 18)

  const footerY = pageHeight - 24
  doc.setDrawColor(215, 222, 232)
  doc.line(innerLeft, footerY - 8, innerRight, footerY - 8)
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(8)
  doc.text('Thank you for choosing OLRAC Advertising.', pageWidth / 2, footerY - 1, { align: 'center' })
  doc.text(`${invoice.email} | ${invoice.phone}`, pageWidth / 2, footerY + 4, { align: 'center' })

  doc.save(`Olrac_Invoice_${booking.id}.pdf`)
}

export async function generateInvoiceDOCX(booking) {
  const invoice = buildInvoiceData(booking)
  const logoBytes = await fetchImageBytes(invoice.logoUrl)
  const sealBytes = await fetchImageBytes(invoice.sealUrl)

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      headers: {
        default: new Header({ children: [] }),
      },
      footers: {
        default: new Footer({ children: [] }),
      },
      children: [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              children: [
                docxNoBorderCell([
                  new Paragraph({
                    children: logoBytes ? [new ImageRun({ data: logoBytes, transformation: { width: 52, height: 52 } })] : [],
                  }),
                ], 15),
                docxNoBorderCell([
                  new Paragraph({
                    spacing: { before: 90, after: 0 },
                    children: [new TextRun({ text: invoice.companyName, bold: true, size: 30, color: FONT_COLOR })],
                  }),
                ], 50),
                docxNoBorderCell([
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 40, line: 280 },
                    children: [new TextRun({ text: 'INVOICE', bold: true, size: 34, color: FONT_COLOR })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 25, line: 260 },
                    children: [new TextRun({ text: `Invoice ID: ${invoice.invoiceId}`, size: 15, color: MUTED_COLOR })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 0, line: 260 },
                    children: [new TextRun({ text: `Date: ${invoice.invoiceDate}`, size: 15, color: MUTED_COLOR })],
                  }),
                ], 35),
              ],
            }),
          ],
        }),
        docxSpacer(90),
        docxDivider(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              children: [
                docxNoBorderCell([
                  new Paragraph({
                    spacing: { after: 70 },
                    children: [new TextRun({ text: 'Client Details', bold: true, size: 18, color: FONT_COLOR })],
                  }),
                  docxLabelValue('Name', invoice.clientName),
                  docxLabelValue('Company', invoice.clientCompany),
                  docxLabelValue('Phone', invoice.clientPhone),
                ], 50),
                docxNoBorderCell([
                  new Paragraph({
                    spacing: { after: 70 },
                    children: [new TextRun({ text: 'Booking Details', bold: true, size: 18, color: FONT_COLOR })],
                  }),
                  docxLabelValue('Location', invoice.location),
                  docxLabelValue('Date', invoice.bookingDate),
                  docxLabelValue('Time Slot', invoice.timeSlot),
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    layout: TableLayoutType.FIXED,
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                      insideHorizontal: { style: BorderStyle.NONE },
                      insideVertical: { style: BorderStyle.NONE },
                    },
                    rows: [
                      new TableRow({
                        children: [
                          docxNoBorderCell([
                            new Paragraph({
                              spacing: { after: 0, line: 260 },
                              children: [new TextRun({ text: 'Status', bold: true, size: 18, color: MUTED_COLOR })],
                            }),
                          ], 40),
                          new TableCell({
                            width: { size: 60, type: WidthType.PERCENTAGE },
                            shading: { fill: invoice.status.docFill },
                            margins: { top: 60, bottom: 60, left: 60, right: 60 },
                            borders: {
                              top: { style: BorderStyle.NONE },
                              bottom: { style: BorderStyle.NONE },
                              left: { style: BorderStyle.NONE },
                              right: { style: BorderStyle.NONE },
                            },
                            children: [
                              new Paragraph({
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 0, line: 260 },
                                children: [new TextRun({ text: invoice.status.invoiceLabel, bold: true, size: 16, color: invoice.status.docText })],
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ], 50),
              ],
            }),
          ],
        }),

        new Paragraph({
          spacing: { before: 100, after: 55 },
          children: [new TextRun({ text: 'Pricing Table', bold: true, size: 18, color: FONT_COLOR })],
        }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          rows: [
            new TableRow({
              children: [
                docxTableCell('Description', { width: 46, fill: HEADER_FILL, color: 'FFFFFF', bold: true }),
                docxTableCell('Quantity', { width: 14, fill: HEADER_FILL, color: 'FFFFFF', bold: true, align: AlignmentType.CENTER }),
                docxTableCell('Amount', { width: 20, fill: HEADER_FILL, color: 'FFFFFF', bold: true, align: AlignmentType.RIGHT }),
                docxTableCell('Total', { width: 20, fill: HEADER_FILL, color: 'FFFFFF', bold: true, align: AlignmentType.RIGHT }),
              ],
            }),
            new TableRow({
              children: [
                docxTableCell('Ad Slot Booking', { width: 46 }),
                docxTableCell(invoice.quantity, { width: 14, align: AlignmentType.CENTER }),
                docxTableCell(invoice.amount, { width: 20, align: AlignmentType.RIGHT }),
                docxTableCell(invoice.total, { width: 20, align: AlignmentType.RIGHT, bold: true }),
              ],
            }),
          ],
        }),

        new Table({
          width: { size: 60, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  shading: { fill: 'F8FAFC' },
                  margins: { top: 110, bottom: 110, left: 120, right: 120 },
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.LEFT,
                      spacing: { after: 0, line: 260 },
                      children: [
                        new TextRun({ text: 'Total  ', bold: true, size: 18, color: MUTED_COLOR }),
                        new TextRun({ text: invoice.total, bold: true, size: 18, color: FONT_COLOR }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
          alignment: AlignmentType.RIGHT,
        }),

        new Paragraph({
          spacing: { before: 100, after: 35 },
          children: [new TextRun({ text: 'Summary', bold: true, size: 18, color: FONT_COLOR })],
        }),

        docxSummaryBox(invoice.summary),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              children: [
                docxNoBorderCell([
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { before: 110, after: 0 },
                    children: sealBytes ? [new ImageRun({ data: sealBytes, transformation: { width: 60, height: 60 } })] : [],
                  }),
                ], 20),
                docxNoBorderCell([
                  new Paragraph({
                    spacing: { before: 138, after: 40 },
                    children: [new TextRun({ text: 'Authorized by OLRAC Advertising', size: 18, color: FONT_COLOR })],
                  }),
                  new Paragraph({
                    spacing: { after: 50 },
                    children: [new TextRun({ text: 'EST. 2026', size: 16, color: MUTED_COLOR })],
                  }),
                  new Paragraph({
                    border: { bottom: { color: FONT_COLOR, style: BorderStyle.SINGLE, size: 6 } },
                  }),
                ], 80),
              ],
            }),
          ],
        }),
        docxSpacer(90),
        docxDivider(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 35, line: 240 },
          children: [new TextRun({ text: 'Thank you for choosing OLRAC Advertising.', size: 14, color: MUTED_COLOR })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 0, line: 240 },
          children: [new TextRun({ text: `${invoice.email} | ${invoice.phone}`, size: 14, color: MUTED_COLOR })],
        }),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `Olrac_Invoice_${booking.id}.docx`)
}
