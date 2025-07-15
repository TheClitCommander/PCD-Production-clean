export const businesses = sqliteTable('businesses', {
  appointmentStatus: text('appointment_status'),
  scheduledTime: text('scheduled_time'),
  
  // Payment tracking
  paymentStatus: text('payment_status').$type<'pending' | 'partial' | 'paid' | 'overdue'>().default('pending'),
  totalAmount: integer('total_amount').default(0),
  paidAmount: integer('paid_amount').default(0),
  stripeCustomerId: text('stripe_customer_id'),
  stripePaymentLinkId: text('stripe_payment_link_id'),
  lastPaymentDate: text('last_payment_date'),
  paymentNotes: text('payment_notes'),
}); 