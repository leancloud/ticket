import AV from 'leancloud-storage';

export class TicketQueryBuilder {
  readonly modifiers: ((query: AV.Query<any>) => void)[] = [];

  readonly createdAt: Record<string, (value: Date) => void> = {
    eq: (value) => {
      this.modifiers.push((query) => {
        query.equalTo('createdAt', value);
      });
    },
    gt: (value) => {
      this.modifiers.push((query) => {
        query.greaterThan('createdAt', value);
      });
    },
    gte: (value) => {
      this.modifiers.push((query) => {
        query.greaterThanOrEqualTo('createdAt', value);
      });
    },
    lt: (value) => {
      this.modifiers.push((query) => {
        query.lessThan('createdAt', value);
      });
    },
    lte: (value) => {
      this.modifiers.push((query) => {
        query.lessThanOrEqualTo('createdAt', value);
      });
    },
  };

  readonly updatedAt: Record<string, (value: Date) => void> = {
    eq: (value) => {
      this.modifiers.push((query) => {
        query.equalTo('updatedAt', value);
      });
    },
    gt: (value) => {
      this.modifiers.push((query) => {
        query.greaterThan('updatedAt', value);
      });
    },
    gte: (value) => {
      this.modifiers.push((query) => {
        query.greaterThanOrEqualTo('updatedAt', value);
      });
    },
    lt: (value) => {
      this.modifiers.push((query) => {
        query.lessThan('updatedAt', value);
      });
    },
    lte: (value) => {
      this.modifiers.push((query) => {
        query.lessThanOrEqualTo('updatedAt', value);
      });
    },
  };
}

export interface FindTicketsConditions {}

export function findTickets(conditions: FindTicketsConditions) {}
