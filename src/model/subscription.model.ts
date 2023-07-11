import { BelongsTo, Column, DataType, ForeignKey, HasMany, Table } from 'sequelize-typescript'

import BaseModel from '../model/generic/base.model'
import PersonModel from './person.model'
import SubscribedUsers from './subscribed-user.model'

export enum SubscriptionStatusEnum {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    CHECKING_OUT = 'checking_out',
    ERROR = 'error'
}

@Table({ tableName: 'subscriptions', paranoid: false })
export default class SubscriptionModel extends BaseModel<SubscriptionModel> {
    @Column({
        type: DataType.ENUM(
            SubscriptionStatusEnum.ACTIVE,
            SubscriptionStatusEnum.INACTIVE,
            SubscriptionStatusEnum.CHECKING_OUT,
            SubscriptionStatusEnum.ERROR

        )
    })
    status: SubscriptionStatusEnum

    @Column({ type: DataType.TEXT })
    sessionId: string

    @Column({ type: DataType.TEXT })
    externalSubscriptionId: string

    @BelongsTo(() => PersonModel)
    creator: PersonModel

    @ForeignKey(() => PersonModel)
    @Column
    creatorId: string

    @HasMany(() => SubscribedUsers)
    subscribedUsers: SubscribedUsers[]
}
