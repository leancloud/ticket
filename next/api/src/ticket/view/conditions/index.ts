import { z } from 'zod';

import { ViewCondition } from './ViewCondition';
import { AssigneeIdIs, AssigneeIdIsNot } from './assigneeId';
import { CategoryIdIs, CategoryIdIsIncluded, CategoryIdIsNot } from './categoryId';
import { GroupIdIs, GroupIdIsNot } from './groupId';
import { SinceCreatedIs, SinceCreatedGt, SinceCreatedLt } from './sinceCreated';
import { SinceFulfilledIs, SinceFulfilledGt, SinceFulfilledLt } from './sinceFulfilled';
import { SinceNewIs, SinceNewGt, SinceNewLt } from './sinceNew';
import { SincePreFulfilledIs, SincePreFulfilledGt, SincePreFulfilledLt } from './sincePreFulfilled';
import { SinceUpdatedIs, SinceUpdatedGt, SinceUpdatedLt } from './sinceUpdated';
import {
  SinceWaitingCustomerIs,
  SinceWaitingCustomerGt,
  SinceWaitingCustomerLt,
} from './sinceWaitingCustomer';
import {
  SinceWaitingCustomerServiceIs,
  SinceWaitingCustomerServiceGt,
  SinceWaitingCustomerServiceLt,
} from './sinceWaitingCustomerService';
import { StatusIs, StatusIsNot } from './status';
import { TagsContains } from './tags';
import { LanguageIs, LanguageIsNot } from './language';

interface ViewConditionConstructor<T> {
  new (data: T): ViewCondition<T>;
}

const viewConditionTypes: Record<string, Record<string, ViewConditionConstructor<any>>> = {
  assigneeId: {
    is: AssigneeIdIs,
    isNot: AssigneeIdIsNot,
  },
  categoryId: {
    is: CategoryIdIs,
    isNot: CategoryIdIsNot,
    isIncluded: CategoryIdIsIncluded,
  },
  groupId: {
    is: GroupIdIs,
    isNot: GroupIdIsNot,
  },
  sinceCreated: {
    is: SinceCreatedIs,
    gt: SinceCreatedGt,
    lt: SinceCreatedLt,
  },
  sinceFulfilled: {
    is: SinceFulfilledIs,
    gt: SinceFulfilledGt,
    lt: SinceFulfilledLt,
  },
  sinceNew: {
    is: SinceNewIs,
    gt: SinceNewGt,
    lt: SinceNewLt,
  },
  sincePreFulfilled: {
    is: SincePreFulfilledIs,
    gt: SincePreFulfilledGt,
    lt: SincePreFulfilledLt,
  },
  sinceUpdated: {
    is: SinceUpdatedIs,
    gt: SinceUpdatedGt,
    lt: SinceUpdatedLt,
  },
  sinceWaitingCustomer: {
    is: SinceWaitingCustomerIs,
    gt: SinceWaitingCustomerGt,
    lt: SinceWaitingCustomerLt,
  },
  sinceWaitingCustomerService: {
    is: SinceWaitingCustomerServiceIs,
    gt: SinceWaitingCustomerServiceGt,
    lt: SinceWaitingCustomerServiceLt,
  },
  status: {
    is: StatusIs,
    isNot: StatusIsNot,
  },
  tags: {
    contains: TagsContains,
  },
  language: {
    is: LanguageIs,
    isNot: LanguageIsNot,
  },
};

const viewConditionSchema = z
  .object({
    type: z.string(),
    op: z.string(),
  })
  .passthrough();

export function createViewCondition(data: any): ViewCondition<any> {
  const parsedData = viewConditionSchema.parse(data);
  const { type, op } = parsedData;
  const constructorsByOp = viewConditionTypes[type];
  if (!constructorsByOp) {
    throw new Error(`unknown type: ${type}`);
  }
  const constructor = constructorsByOp[op];
  if (!constructor) {
    throw new Error(`unknown op: ${op}`);
  }
  return new constructor(parsedData);
}
