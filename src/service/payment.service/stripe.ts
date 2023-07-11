import Stripe from 'stripe'
import PubSub from 'pubsub-js'

import { PaymentEventsEnum } from '../../enum/payment-events.enum'
import { ICreatedCheckoutSession, IPaymentService, IPlan } from '.'
import { getOrganizationFromContext } from '@app/utils/context'

export class StripeService implements IPaymentService {
  private readonly stripe: Stripe

  private readonly STRIPE_SECRET_KEY: string | undefined = process.env.STRIPE_SECRET_KEY
  private readonly STRIPE_FE_SUCCESS_URL: string | undefined = `${process.env.STRIPE_FE_URL}/success?session_id={CHECKOUT_SESSION_ID}`
  private readonly STRIPE_FE_FAILURE_URL: string | undefined = `${process.env.STRIPE_FE_URL}/cancel`

  constructor() {
      if (!this.STRIPE_SECRET_KEY) throw new Error('Stripe secret key is not defined')
      this.stripe = new Stripe(this.STRIPE_SECRET_KEY, {
          apiVersion: '2022-11-15'
      })
  }

  async createCheckoutSession(personId: string, planId: string): Promise<ICreatedCheckoutSession> {
      const plan = await this.stripe.plans.retrieve(planId)
      const session = await this.stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'subscription',
          metadata: {
              personId,
              organizationId: getOrganizationFromContext()
          },
          success_url: this.STRIPE_FE_SUCCESS_URL,
          cancel_url: this.STRIPE_FE_FAILURE_URL,
          line_items: [
              {
                  price: plan.id,
                  quantity: 1,
                  adjustable_quantity: {
                      enabled: false
                  }
              }
          ]
      })

      return {
          url: session.url,
          sessionId: session.id
      }
  }

  async listAvailableSubscriptions(): Promise<IPlan[]> {
      const products = await this.stripe.products.list()

      return this.stripe.plans.list()
          .then(plans => plans.data.map(plan => {
              const product = products.data.find(product => product.id === plan.product.toString())
              return {
                  planId: plan.id,
                  name: product?.name || '',
                  description: product?.description || '',
                  currency: plan.currency,
                  interval: plan.interval,
                  amount: plan.amount

              }
          }))
  }

  async handleWebhookEvent(event: any): Promise<void> {
      console.info('Stripe webhook event received', event.type)
      switch (event.type) {
      case 'checkout.session.completed':
          PubSub.publish(PaymentEventsEnum.CheckoutSessionCompleted, {
              sessionId: event.data.object.id,
              paymentStatus: event.data.object.payment_status,
              externalSubscriptionId: event.data.object.subscription,
              personId: event.data.object.metadata.personId,
              organizationId: event.data.object.metadata.organizationId
          })
          break

      case 'customer.subscription.updated':
          if (event.data.object.pause_collection) {
              PubSub.publish(PaymentEventsEnum.PauseSubscription, {
                  externalSubscriptionId: event.data.object.id
              })
          }

          if (event.data?.previous_attributes?.pause_collection && !event.data.object.pause_collection) {
              PubSub.publish(PaymentEventsEnum.ResumeSubscription, {
                  externalSubscriptionId: event.data.object.id
              })
          }
          break
      default:
          break
      }
  }
}
