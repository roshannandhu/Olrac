function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toCount(value, fallback = 1) {
  return Math.max(1, Math.round(toNumber(value, fallback)))
}

function roundMoney(value) {
  return Math.round(toNumber(value) * 100) / 100
}

export function getQuotationUnitPrice({ basePrice, priceUnit, durationDays, durationHours }) {
  const rate = toNumber(basePrice)
  const unit = String(priceUnit || 'day').toLowerCase()

  if (unit === 'hour') {
    return roundMoney(rate * Math.max(1, toCount(durationHours, 0)))
  }

  if (unit === 'month') {
    return roundMoney(rate * Math.max(1, Math.round(toNumber(durationDays) / 30)))
  }

  return roundMoney(rate * Math.max(1, toCount(durationDays, 0)))
}

function normalizeManualItem(item, index, baseSlotDuration, defaultSlotQuantity) {
  const slots = toCount(item?.no_of_slots, defaultSlotQuantity)
  let rate = toNumber(item?.rate)
  let subtotal = toNumber(item?.subtotal)

  if (rate <= 0 && subtotal > 0) {
    rate = subtotal / slots
  }
  if (subtotal <= 0) {
    subtotal = rate * slots
  }

  return {
    id: item?.id || `manual-${index + 1}`,
    description: item?.description || `Digital Ad Placement ${index + 1}`,
    no_of_slots: slots,
    slot_duration: item?.slot_duration || `${baseSlotDuration * slots} Sec`,
    rate: roundMoney(rate),
    subtotal: roundMoney(subtotal),
  }
}

export function buildQuotationItems({
  screens = [],
  savedItems = [],
  totalPrice = 0,
  durationDays = 0,
  durationHours = 0,
  baseSlotDuration = 20,
  defaultSlotQuantity = 1,
  pricingMode = 'booking',
}) {
  const safeBaseSlotDuration = Math.max(1, toCount(baseSlotDuration, 20))
  const safeDefaultSlotQuantity = Math.max(1, toCount(defaultSlotQuantity, 1))
  const normalizedMode = pricingMode === 'manual' ? 'manual' : 'booking'

  if (normalizedMode === 'manual' && savedItems.length > 0) {
    return savedItems.map((item, index) =>
      normalizeManualItem(item, index, safeBaseSlotDuration, safeDefaultSlotQuantity))
  }

  if (!screens.length) {
    if (savedItems.length > 0) {
      return savedItems.map((item, index) =>
        normalizeManualItem(item, index, safeBaseSlotDuration, safeDefaultSlotQuantity))
    }

    const slots = safeDefaultSlotQuantity
    const rate = slots > 0 ? roundMoney(toNumber(totalPrice) / slots) : 0
    return [{
      id: 'manual-1',
      description: 'Digital Ad Placement',
      no_of_slots: slots,
      slot_duration: `${safeBaseSlotDuration * slots} Sec`,
      rate,
      subtotal: roundMoney(totalPrice),
    }]
  }

  const savedById = new Map(savedItems.map((item) => [String(item?.id), item]))
  const totalSlots = screens.reduce(
    (sum, screen) => sum + toCount(screen?.slots, safeDefaultSlotQuantity),
    0,
  )
  const fallbackRatePerSlot = totalSlots > 0 ? toNumber(totalPrice) / totalSlots : 0

  return screens.map((screen, index) => {
    const savedItem = savedById.get(String(screen?.id)) || savedItems[index]
    const slots = toCount(screen?.slots, safeDefaultSlotQuantity)
    let rate = getQuotationUnitPrice({
      basePrice: screen?.base_price,
      priceUnit: screen?.price_unit,
      durationDays,
      durationHours,
    })

    if (rate <= 0 && savedItem) {
      rate = toNumber(savedItem.rate)
      if (rate <= 0) {
        const savedSubtotal = toNumber(savedItem.subtotal)
        if (savedSubtotal > 0) {
          rate = savedSubtotal / slots
        }
      }
    }

    if (rate <= 0) {
      rate = fallbackRatePerSlot
    }

    return {
      id: screen?.id || `screen-${index + 1}`,
      description: savedItem?.description || `${screen?.name || `Screen #${index + 1}`} - ${screen?.area || 'Standard Plot'}`,
      no_of_slots: slots,
      slot_duration: `${safeBaseSlotDuration * slots} Sec`,
      rate: roundMoney(rate),
      subtotal: roundMoney(rate * slots),
    }
  })
}

export function calculateQuotationTotals({ items = [], discount = 0, taxRate = 0, taxEnabled = true }) {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + toNumber(item?.subtotal), 0))
  const safeDiscount = roundMoney(Math.max(0, toNumber(discount)))
  const safeTaxRate = taxEnabled ? roundMoney(Math.max(0, toNumber(taxRate))) : 0
  const taxableAmount = Math.max(0, subtotal - safeDiscount)
  const taxAmount = roundMoney(taxableAmount * (safeTaxRate / 100))

  return {
    subtotal,
    discount: safeDiscount,
    taxRate: safeTaxRate,
    taxAmount,
    grandTotal: roundMoney(taxableAmount + taxAmount),
  }
}
