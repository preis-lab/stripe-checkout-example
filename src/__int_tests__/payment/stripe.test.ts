import nock from 'nock'
import supertest from 'supertest'
import auth0 from 'auth0'
import { Server as SocketIoServer } from 'socket.io'

import { PaymentApi } from './payment.api'
import { StripeService } from '../../service/payment.service/stripe'
import app from '../../app'
import { UserBuilder } from '../user/user.test.builder'
import { cleanDatabase } from '../utils/database'
import { createOrganization } from '../organization/organization.test.aux'
import { CompanyApi } from '../company/company.api'
import OrganizationApi from '../organization/organization.api'
import { UserApi } from '../user/user.api'
import { PauseSubscription, ResumeSubscription, SessionSuccessfullyFinished } from './webhooks'
import { SubscriptionStatusEnum } from '../../model/subscription.model'
import { delay } from '../helper'
import { PersonOutput } from '../person/person.api'

jest.mock('socket.io')

describe('StripeService', () => {
    let stripeService: StripeService
    let server
    let paymentApi: PaymentApi
    let user: auth0.User
    let companyApi: CompanyApi
    let userApi: UserApi
    let organizationApi: OrganizationApi
    let organizationId: string
    let loggedUser: PersonOutput

    const countSubs = async(status: SubscriptionStatusEnum) =>
        await app.databaseConnector.sequelize.query(`select count(*) from subscriptions where status = '${status}'`)
            .then(i => i[0][0])
            .then(({ count } : { count: number }) => Number(count))

    beforeEach(async() => {
        stripeService = new StripeService()
        await cleanDatabase()
        user = new UserBuilder().buildAndChangeRequester()
        const { organization, person } = await createOrganization({ displayName: 'Nimble', companyApi, userApi, organizationApi, user })
        organizationId = organization.orgId
        loggedUser = person
    })

    beforeAll(async() => {
        server = await app.setup()
        const st = supertest(server)
        paymentApi = new PaymentApi(st)
        companyApi = new CompanyApi(st)
        organizationApi = new OrganizationApi(st)
        userApi = new UserApi(st)
    })

    afterEach(() => {
        nock.cleanAll()
    })

    it('should create a checkout session', async() => {
        const planId = 'plan_123'
        const checkoutSessionMock = {
            id: 'session_123',
            url: 'https://example.com/checkout/session_123'
        }

        // Mock the request to retrieve the plan
        nock('https://api.stripe.com')
            .get(`/v1/plans/${planId}`)
            .reply(200, { id: planId })

        // Mock the request to create a checkout session
        nock('https://api.stripe.com')
            .post('/v1/checkout/sessions')
            .reply(200, checkoutSessionMock)

        const { body } = await paymentApi.createCheckoutSession(planId)

        expect(body.url).toBe(checkoutSessionMock.url)
    })

    it('should list available subscriptions', async() => {
        const productMock = { id: 'product_123', name: 'Product 1', description: 'Description 1' }
        const planMock = {
            id: 'plan_123',
            product: productMock.id,
            currency: 'usd',
            interval: 'month',
            amount: 999
        }

        // Mock the request to list products
        nock('https://api.stripe.com')
            .get('/v1/products')
            .reply(200, { data: [productMock] })

        // Mock the request to list plans
        nock('https://api.stripe.com')
            .get('/v1/plans')
            .reply(200, { data: [planMock] })

        const subscriptions = await stripeService.listAvailableSubscriptions()

        expect(subscriptions).toEqual([
            {
                planId: planMock.id,
                name: productMock.name,
                description: productMock.description,
                currency: planMock.currency,
                interval: planMock.interval,
                amount: planMock.amount
            }
        ])
    })

    it('should create a subscription after added the credit card', async() => {
        const planId = 'plan_123'
        const sessionId = 'session_123'

        jest.spyOn(SocketIoServer.prototype, 'emit')

        const checkoutSessionMock = {
            id: sessionId,
            url: 'https://example.com/checkout/session_123'
        }

        // Mock the request to retrieve the plan
        nock('https://api.stripe.com')
            .get(`/v1/plans/${planId}`)
            .reply(200, { id: planId })

        // Mock the request to create a checkout session
        nock('https://api.stripe.com')
            .post('/v1/checkout/sessions')
            .reply(200, checkoutSessionMock)

        const { body } = await paymentApi.createCheckoutSession(planId)

        expect(body.url).toBe(checkoutSessionMock.url)

        expect(await countSubs(SubscriptionStatusEnum.ACTIVE)).toBe(0)
        expect(await countSubs(SubscriptionStatusEnum.CHECKING_OUT)).toBe(1)

        await paymentApi.handleWebhook(SessionSuccessfullyFinished(sessionId, organizationId, loggedUser.id))

        await delay(1000)
        expect(await countSubs(SubscriptionStatusEnum.ACTIVE)).toBe(1)
        expect(SocketIoServer.prototype.emit).toHaveBeenCalled()
    })

    it('should pause and resume a subscription from the Stripe dashboard', async() => {
        const planId = 'plan_123'
        const sessionId = 'session_123'

        const checkoutSessionMock = {
            id: sessionId,
            url: 'https://example.com/checkout/session_123'
        }

        // Mock the request to retrieve the plan
        nock('https://api.stripe.com')
            .get(`/v1/plans/${planId}`)
            .reply(200, { id: planId })

        // Mock the request to create a checkout session
        nock('https://api.stripe.com')
            .post('/v1/checkout/sessions')
            .reply(200, checkoutSessionMock)

        const { body } = await paymentApi.createCheckoutSession(planId)

        expect(body.url).toBe(checkoutSessionMock.url)

        expect(await countSubs(SubscriptionStatusEnum.ACTIVE)).toBe(0)
        expect(await countSubs(SubscriptionStatusEnum.CHECKING_OUT)).toBe(1)

        await paymentApi.handleWebhook(SessionSuccessfullyFinished(sessionId, organizationId, loggedUser.id))

        await delay(1000)
        expect(await countSubs(SubscriptionStatusEnum.ACTIVE)).toBe(1)

        await paymentApi.handleWebhook(PauseSubscription())
        await delay(1000)
        expect(await countSubs(SubscriptionStatusEnum.INACTIVE)).toBe(1)
        expect(await countSubs(SubscriptionStatusEnum.ACTIVE)).toBe(0)

        await paymentApi.handleWebhook(ResumeSubscription())
        await delay(1000)
        expect(await countSubs(SubscriptionStatusEnum.INACTIVE)).toBe(0)
        expect(await countSubs(SubscriptionStatusEnum.ACTIVE)).toBe(1)
    })
})
