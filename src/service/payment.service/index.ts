import { singleton } from 'tsyringe'
import PubSub from 'pubsub-js'
import newrelic from 'newrelic'

import { SubscriptionStatusEnum } from '@app/model/subscription.model'
import app from '@app/app'
import { withContext } from '@app/utils/context'

import { StripeService } from './stripe'
import { SubscriptionRepository } from '../../repository/subscription.repository'
import { PaymentEventsEnum } from '../../enum/payment-events.enum'

import { IPaymentService, IPlan, ICheckoutSessionCompleted } from './types'
export * from './types'

@singleton()
export class PaymentService {
  readonly instance: IPaymentService

  constructor(
   private readonly repository: SubscriptionRepository
  ) {
      this.instance = new StripeService()

      PubSub.subscribe(PaymentEventsEnum.CheckoutSessionCompleted, this.handleCheckoutSessionCompleted.bind(this))
      PubSub.subscribe(PaymentEventsEnum.PauseSubscription, this.handlePauseSubscription.bind(this))
      PubSub.subscribe(PaymentEventsEnum.ResumeSubscription, this.handleResumeSubscription.bind(this))
  }

  listAvailableSubscriptions(): Promise<IPlan[]> {
      return this.instance.listAvailableSubscriptions()
  }

  async createCheckoutSession(personId: string, planId: string): Promise<string> {
      const { sessionId, url } = await this.instance.createCheckoutSession(personId, planId)
      await this.repository.createCheckoutSession(sessionId, personId)

      return url
  }

  async handleWebhookEvent(event: any): Promise<void> {
      try {
          await this.instance.handleWebhookEvent(event)
      } catch (error) {
          newrelic.noticeError(error)
          console.error('Error handling webhook event', error)
      }
  }

  async attachNewUserToSubscription(insternalSubscriptionId: string, personId: string): Promise<void> {
      await this.repository.attachNewUserToSubscription(insternalSubscriptionId, personId)
  }

  private async handleCheckoutSessionCompleted(_: string, session: ICheckoutSessionCompleted): Promise<void> {
      withContext({ organizationId: session.organizationId })
      if (session.paymentStatus === 'paid') await this.handlePaymentSucceeded(session)
  }

  private async handlePaymentSucceeded(session: ICheckoutSessionCompleted): Promise<void> {
      app.databaseConnector.transaction(async() => {
          const sub = await this.repository.startSubscriptionFromSession(session.sessionId, session.externalSubscriptionId)
          await this.repository.attachNewUserToSubscription(sub.id, session.personId)
      }).catch(error => {
          console.error('Error starting subscription', error)
      })
  }

  private async handlePauseSubscription(_:string, { externalSubscriptionId }: any): Promise<void> {
      await this.repository.updateSubscriptionStatus(externalSubscriptionId, SubscriptionStatusEnum.INACTIVE)
  }

  private async handleResumeSubscription(_:string, { externalSubscriptionId }: any): Promise<void> {
      await this.repository.updateSubscriptionStatus(externalSubscriptionId, SubscriptionStatusEnum.ACTIVE)
  }
}
