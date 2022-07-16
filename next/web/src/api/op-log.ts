export const actions = ['replyWithNoContent', 'replySoon', 'resolve', 'close', 'reopen'] as const;
export type OperateAction = typeof actions[number];
