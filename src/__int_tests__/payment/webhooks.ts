const BASE_SUBSCRIPTION_ID = 'sub_1NQACuDYeFkuKzmdG0Z0Z2Z2'
export const SessionSuccessfullyFinished = (sessionId: string, organizationId: string, personId: string) => ({
    id: 'evt_1NQACwDYeFkuKzmdGEm63cEV',
    object: 'event',
    api_version: '2022-11-15',
    created: 1688480878,
    data: {
        object: {
            id: sessionId,
            cancel_url: 'http://localhost:3001/checkout/cancel',
            metadata: {
                organizationId,
                personId
            },
            mode: 'subscription',
            payment_status: 'paid',
            subscription: BASE_SUBSCRIPTION_ID,
            success_url: 'http://localhost:3001/checkout/success?session_id={CHECKOUT_SESSION_ID}'
        }
    },
    type: 'checkout.session.completed'
})

export const PauseSubscription = () => ({
    id: 'evt_1NQBOzDYeFkuKzmdFYYmZRFB',
    object: 'event',
    api_version: '2022-11-15',
    created: 1688485468,
    data: {
        object: {
            id: BASE_SUBSCRIPTION_ID,
            items: {
                object: 'list',
                data: [
                    {
                        id: 'si_OCZL0oHayhJ4KE',
                        subscription: BASE_SUBSCRIPTION_ID
                    }
                ]

            },

            pause_collection: {
                behavior: 'keep_as_draft',
                resumes_at: null
            },
            trial_settings: {
                end_behavior: {
                    missing_payment_method: 'create_invoice'
                }
            },
            trial_start: null
        },
        previous_attributes: {
            pause_collection: null
        }
    },

    type: 'customer.subscription.updated'
})

export const ResumeSubscription = () => ({
    id: 'evt_1NQBOzDYeFkuKzmdFYYmZRFB',
    object: 'event',
    api_version: '2022-11-15',
    created: 1688485468,
    data: {
        object: {
            id: BASE_SUBSCRIPTION_ID,
            items: {
                object: 'list',
                data: [
                    {
                        id: 'si_OCZL0oHayhJ4KE',
                        subscription: BASE_SUBSCRIPTION_ID
                    }
                ]

            },

            pause_collection: null,
            trial_settings: {
                end_behavior: {
                    missing_payment_method: 'create_invoice'
                }
            },
            trial_start: null
        },
        previous_attributes: {
            pause_collection: {
                behavior: 'keep_as_draft',
                resumes_at: null
            }
        }
    },

    type: 'customer.subscription.updated'
})
