import type { APIProvider } from './types'

/**
 * 清理 provider 数据，填充默认值
 * 用于确保所有数值字段都有有效值，避免 null 导致的后端验证错误
 */
export const cleanProviderData = (provider: APIProvider): APIProvider => ({
  ...provider,
  max_retry: provider.max_retry ?? 2,
  timeout: provider.timeout ?? 30,
  retry_interval: provider.retry_interval ?? 10,
})

/**
 * 验证提供商表单数据
 */
export const validateProvider = (provider: APIProvider | null): {
  isValid: boolean
  errors: { name?: string; base_url?: string; api_key?: string }
} => {
  const errors: { name?: string; base_url?: string; api_key?: string } = {}
  
  if (!provider) {
    return { isValid: false, errors: { name: '提供商数据为空' } }
  }

  if (!provider.name?.trim()) {
    errors.name = '请输入提供商名称'
  }
  if (!provider.base_url?.trim()) {
    errors.base_url = '请输入基础 URL'
  }
  if (!provider.api_key?.trim()) {
    errors.api_key = '请输入 API Key'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
