/**
 *  不直接使用 process.env.* 统一由 feature-flag 控制
 */
export const ENABLE_BUILTIN_DESCRIPTION_TEMPLATE = !!process.env.ENABLE_BUILTIN_DESCRIPTION_TEMPLATE
export const ENABLE_FAQ = !!process.env.ENABLE_FAQ
