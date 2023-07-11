import httpStatus from 'http-status'
import supertest from 'supertest'

import headers from '../headers'

export class PaymentApi {
    st: supertest.SuperTest<supertest.Test>
    resource = '/checkout'

    constructor(st: supertest.SuperTest<supertest.Test>) {
        this.st = st
    }

    async createCheckoutSession(planId: string): Promise<supertest.Response> {
        return new Promise((resolve) => {
            this.st
                .post(`${this.resource}/session`)
                .send({ planId })

                .set(headers)
                .expect(httpStatus.OK)
                .end((_, res) => {
                    resolve(res)
                })
        })
    }

    async handleWebhook(input: any): Promise<supertest.Response> {
        return new Promise((resolve) => {
            this.st
                .post('/public/stripe/webhooks')
                .send(input)
                .set(headers)
                .expect(httpStatus.OK)
                .end((_, res) => {
                    resolve(res)
                })
        })
    }
}
