export function formatInr(value) {
  return `\u20B9${Number(value || 0).toLocaleString('en-IN')}`
}

export function getBookingStatusMeta(status) {
  const normalized = String(status || 'pending').toLowerCase()

  if (normalized === 'confirmed' || normalized === 'approved') {
    return {
      key: 'approved',
      label: 'Approved',
      invoiceLabel: 'APPROVED',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      pdfFill: [220, 252, 231],
      pdfText: [22, 101, 52],
      docFill: 'DCFCE7',
      docText: '166534',
    }
  }

  if (normalized === 'cancelled' || normalized === 'rejected') {
    return {
      key: 'rejected',
      label: 'Rejected',
      invoiceLabel: 'REJECTED',
      badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
      pdfFill: [255, 228, 230],
      pdfText: [190, 24, 93],
      docFill: 'FFE4E6',
      docText: 'BE185D',
    }
  }

  if (normalized === 'completed') {
    return {
      key: 'completed',
      label: 'Completed',
      invoiceLabel: 'COMPLETED',
      badgeClass: 'bg-sky-50 text-sky-700 border border-sky-200',
      pdfFill: [224, 242, 254],
      pdfText: [3, 105, 161],
      docFill: 'E0F2FE',
      docText: '0369A1',
    }
  }

  return {
    key: 'pending',
    label: 'Pending',
    invoiceLabel: 'PENDING',
    badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
    pdfFill: [255, 237, 213],
    pdfText: [194, 65, 12],
    docFill: 'FFEDD5',
    docText: 'C2410C',
  }
}
