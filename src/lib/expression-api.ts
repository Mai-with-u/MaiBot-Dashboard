/**
 * 表达方式管理 API
 */
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import type {
  ExpressionListResponse,
  ExpressionDetailResponse,
  ExpressionCreateRequest,
  ExpressionCreateResponse,
  ExpressionUpdateRequest,
  ExpressionUpdateResponse,
  ExpressionDeleteResponse,
  ExpressionStatsResponse,
  ChatListResponse,
  ReviewStats,
  ReviewListResponse,
  BatchReviewItem,
  BatchReviewResponse,
} from '@/types/expression'

const API_BASE = '/api/webui/expression'

/**
 * 获取聊天列表
 */
export async function getChatList(): Promise<ChatListResponse> {
  const response = await fetchWithAuth(`${API_BASE}/chats`, {
    
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '获取聊天列表失败')
  }
  
  return response.json()
}

/**
 * 获取表达方式列表
 */
export async function getExpressionList(params: {
  page?: number
  page_size?: number
  search?: string
  chat_id?: string
}): Promise<ExpressionListResponse> {
  const queryParams = new URLSearchParams()
  
  if (params.page) queryParams.append('page', params.page.toString())
  if (params.page_size) queryParams.append('page_size', params.page_size.toString())
  if (params.search) queryParams.append('search', params.search)
  if (params.chat_id) queryParams.append('chat_id', params.chat_id)
  
  const response = await fetchWithAuth(`${API_BASE}/list?${queryParams}`, {
    
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '获取表达方式列表失败')
  }
  
  return response.json()
}

/**
 * 获取表达方式详细信息
 */
export async function getExpressionDetail(expressionId: number): Promise<ExpressionDetailResponse> {
  const response = await fetchWithAuth(`${API_BASE}/${expressionId}`, {
    
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '获取表达方式详情失败')
  }
  
  return response.json()
}

/**
 * 创建表达方式
 */
export async function createExpression(
  data: ExpressionCreateRequest
): Promise<ExpressionCreateResponse> {
  const response = await fetchWithAuth(`${API_BASE}/`, {
    method: 'POST',
    
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '创建表达方式失败')
  }
  
  return response.json()
}

/**
 * 更新表达方式（增量更新）
 */
export async function updateExpression(
  expressionId: number,
  data: ExpressionUpdateRequest
): Promise<ExpressionUpdateResponse> {
  const response = await fetchWithAuth(`${API_BASE}/${expressionId}`, {
    method: 'PATCH',
    
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '更新表达方式失败')
  }
  
  return response.json()
}

/**
 * 删除表达方式
 */
export async function deleteExpression(expressionId: number): Promise<ExpressionDeleteResponse> {
  const response = await fetchWithAuth(`${API_BASE}/${expressionId}`, {
    method: 'DELETE',
    
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '删除表达方式失败')
  }
  
  return response.json()
}

/**
 * 批量删除表达方式
 */
export async function batchDeleteExpressions(expressionIds: number[]): Promise<ExpressionDeleteResponse> {
  const response = await fetchWithAuth(`${API_BASE}/batch/delete`, {
    method: 'POST',
    
    body: JSON.stringify({ ids: expressionIds }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '批量删除表达方式失败')
  }
  
  return response.json()
}

/**
 * 获取表达方式统计数据
 */
export async function getExpressionStats(): Promise<ExpressionStatsResponse> {
  const response = await fetchWithAuth(`${API_BASE}/stats/summary`, {
    
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '获取统计数据失败')
  }
  
  return response.json()
}

// ============ 审核相关 API ============

/**
 * 获取审核统计数据
 */
export async function getReviewStats(): Promise<ReviewStats> {
  const response = await fetchWithAuth(`${API_BASE}/review/stats`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '获取审核统计失败')
  }
  
  return response.json()
}

/**
 * 获取审核列表
 */
export async function getReviewList(params: {
  page?: number
  page_size?: number
  filter_type?: 'unchecked' | 'passed' | 'rejected' | 'all'
  search?: string
  chat_id?: string
}): Promise<ReviewListResponse> {
  const queryParams = new URLSearchParams()
  
  if (params.page) queryParams.append('page', params.page.toString())
  if (params.page_size) queryParams.append('page_size', params.page_size.toString())
  if (params.filter_type) queryParams.append('filter_type', params.filter_type)
  if (params.search) queryParams.append('search', params.search)
  if (params.chat_id) queryParams.append('chat_id', params.chat_id)
  
  const response = await fetchWithAuth(`${API_BASE}/review/list?${queryParams}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '获取审核列表失败')
  }
  
  return response.json()
}

/**
 * 批量审核表达方式
 */
export async function batchReviewExpressions(
  items: BatchReviewItem[]
): Promise<BatchReviewResponse> {
  const response = await fetchWithAuth(`${API_BASE}/review/batch`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '批量审核失败')
  }
  
  return response.json()
}
