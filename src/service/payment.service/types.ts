export interface IPlan {
  planId: string
  name: string
  description: string
  currency: string
  interval: string
  amount: number
}

export interface ICreatedCheckoutSession {
  sessionId: string
  url: string
}

export interface ICheckoutSessionCompleted {
  sessionId: string
  paymentStatus: string
  externalSubscriptionId: string
  personId: string
  organizationId: string
}

export interface IPaymentService {
  createCheckoutSession(personId: string, planId: string): Promise<ICreatedCheckoutSession>
  listAvailableSubscriptions(): Promise<IPlan[]>
  handleWebhookEvent(event: any): Promise<void>
}
