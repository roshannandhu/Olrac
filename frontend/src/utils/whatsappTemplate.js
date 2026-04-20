export const DEFAULT_WHATSAPP_TEMPLATE = [
  'Hi, I want to book an ad slot.',
  '',
  'Booking ID: {booking_id}',
  'Name: {name}',
  'Company: {company}',
  'Location: {location}',
  'Budget: {budget}',
  '',
  'Email: {email}',
  'Phone: {phone}',
  'Area: {area}',
  'Billing: {billing}',
  'Slots: {slots}',
  'Total Price: {total_price}',
  '',
  'Ad Description:',
  '{description}',
].join('\n')

export const WHATSAPP_TEMPLATE_VARIABLES = [
  '{booking_id}',
  '{name}',
  '{company}',
  '{email}',
  '{phone}',
  '{location}',
  '{area}',
  '{billing}',
  '{slots}',
  '{budget}',
  '{total_price}',
  '{description}',
]

export function fillWhatsAppTemplate(template, values) {
  return WHATSAPP_TEMPLATE_VARIABLES.reduce((message, key) => {
    const lookupKey = key.slice(1, -1)
    return message.replaceAll(key, values[lookupKey] ?? 'N/A')
  }, template || DEFAULT_WHATSAPP_TEMPLATE)
}
