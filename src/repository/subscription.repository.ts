import { singleton } from 'tsyringe'

import SubscriptionModel, { SubscriptionStatusEnum } from '../model/subscription.model'
import SubscribedUserModel from '@app/model/subscribed-user.model'

@singleton()
export class SubscriptionRepository {
    async createCheckoutSession(sessionId: string, personId: string): Promise<SubscriptionModel> {
        return SubscriptionModel.create({
            sessionId,
            status: SubscriptionStatusEnum.CHECKING_OUT,
            creatorId: personId
        })
    }

    async updateSubscriptionStatus(externalSubscriptionId: string, status: SubscriptionStatusEnum): Promise<void> {
        await SubscriptionModel.update({
            status
        }, {
            where: {
                externalSubscriptionId
            }
        })
    }

    async startSubscriptionFromSession(sessionId: string, externalSubscriptionId: string): Promise<SubscriptionModel> {
        const subscription = await SubscriptionModel.findOne({
            where: {
                sessionId
            }
        })

        if (!subscription) throw new Error('Subscription not found')
        subscription.status = SubscriptionStatusEnum.ACTIVE
        subscription.externalSubscriptionId = externalSubscriptionId
        await subscription.save()
        return subscription
    }

    async attachNewUserToSubscription(subscriptionId: string, personId: string): Promise<SubscribedUserModel> {
        return SubscribedUserModel.create({
            subscriptionId,
            personId
        })
    }
}
