const isLeancloudTicket = process.env.TICKET_OWNER === 'leancloud'

export const categoryFAQEnabled = isLeancloudTicket
