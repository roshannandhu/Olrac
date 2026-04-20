export const SCREEN_PRICING_TIERS = [
  { key: 'daily', label: 'Monthly Slot', shortLabel: '1 Month', adminLabel: 'Monthly Price' },
  { key: 'weekly', label: '3 Months Slot', shortLabel: '3 Months', adminLabel: '3 Months Price' },
  { key: 'monthly', label: '6 Months Slot', shortLabel: '6 Months', adminLabel: '6 Months Price' },
  { key: 'yearly', label: '1 Year Slot', shortLabel: '1 Year', adminLabel: '1 Year Price' },
]

export function getBillingLabel(value) {
  return SCREEN_PRICING_TIERS.find((tier) => tier.key === value)?.label || value
}
