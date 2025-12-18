import { fetchWithAuth, getAuthHeaders } from '@/lib/fetch-with-auth'
import type { PluginInfo } from '@/types/plugin'

/**
 * Git 安装状态
 */
export interface GitStatus {
  installed: boolean
  version?: string
  path?: string
  error?: string
}

/**
 * 麦麦版本信息
 */
export interface MaimaiVersion {
  version: string
  version_major: number
  version_minor: number
  version_patch: number
}

/**
 * 已安装插件信息
 */
export interface InstalledPlugin {
  id: string
  manifest: {
    manifest_version: number
    name: string
    version: string
    description: string
    author: {
      name: string
      url?: string
    }
    license: string
    host_application: {
      min_version: string
      max_version?: string
    }
    homepage_url?: string
    repository_url?: string
    keywords?: string[]
    categories?: string[]
    [key: string]: unknown  // 允许其他字段
  }
  path: string
}

/**
 * 插件加载进度
 */
export interface PluginLoadProgress {
  operation: 'idle' | 'fetch' | 'install' | 'uninstall' | 'update'
  stage: 'idle' | 'loading' | 'success' | 'error'
  progress: number  // 0-100
  message: string
  error?: string
  plugin_id?: string
  total_plugins: number
  loaded_plugins: number
}

/**
 * 插件仓库配置
 */
const PLUGIN_REPO_OWNER = 'Mai-with-u'
const PLUGIN_REPO_NAME = 'plugin-repo'
const PLUGIN_REPO_BRANCH = 'main'
const PLUGIN_DETAILS_FILE = 'plugin_details.json'

/**
 * 插件列表 API 响应类型（只包含我们需要的字段）
 */
interface PluginApiResponse {
  id: string
  manifest: {
    manifest_version: number
    name: string
    version: string
    description: string
    author: {
      name: string
      url?: string
    }
    license: string
    host_application: {
      min_version: string
      max_version?: string
    }
    homepage_url?: string
    repository_url?: string
    keywords: string[]
    categories?: string[]
    default_locale: string
    locales_path?: string
  }
  // 可能还有其他字段，但我们不关心
  [key: string]: unknown
}

/**
 * 从远程获取插件列表（通过后端代理避免 CORS）
 */
export async function fetchPluginList(): Promise<PluginInfo[]> {
  try {
    // 通过后端 API 获取 Raw 文件
    const response = await fetchWithAuth('/api/webui/plugins/fetch-raw', {
      method: 'POST',
      
      body: JSON.stringify({
        owner: PLUGIN_REPO_OWNER,
        repo: PLUGIN_REPO_NAME,
        branch: PLUGIN_REPO_BRANCH,
        file_path: PLUGIN_DETAILS_FILE
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const result = await response.json()
    
    // 检查后端返回的结果
    if (!result.success || !result.data) {
      throw new Error(result.error || '获取插件列表失败')
    }
    
    const data: PluginApiResponse[] = JSON.parse(result.data)
    
    // 转换为 PluginInfo 格式，并过滤掉无效数据
    const pluginList = data
      .filter(item => {
        // 验证必需字段
        if (!item?.id || !item?.manifest) {
          console.warn('跳过无效插件数据:', item)
          return false
        }
        if (!item.manifest.name || !item.manifest.version) {
          console.warn('跳过缺少必需字段的插件:', item.id)
          return false
        }
        return true
      })
      .map((item) => ({
        id: item.id,
        manifest: {
          manifest_version: item.manifest.manifest_version || 1,
          name: item.manifest.name,
          version: item.manifest.version,
          description: item.manifest.description || '',
          author: item.manifest.author || { name: 'Unknown' },
          license: item.manifest.license || 'Unknown',
          host_application: item.manifest.host_application || { min_version: '0.0.0' },
          homepage_url: item.manifest.homepage_url,
          repository_url: item.manifest.repository_url,
          keywords: item.manifest.keywords || [],
          categories: item.manifest.categories || [],
          default_locale: item.manifest.default_locale || 'zh-CN',
          locales_path: item.manifest.locales_path,
        },
        // 默认值，这些信息可能需要从其他 API 获取
        downloads: 0,
        rating: 0,
        review_count: 0,
        installed: false,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))
    
    return pluginList
  } catch (error) {
    console.error('Failed to fetch plugin list:', error)
    throw error
  }
}

/**
 * 检查本机 Git 安装状态
 */
export async function checkGitStatus(): Promise<GitStatus> {
  try {
    const response = await fetchWithAuth('/api/webui/plugins/git-status')
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Failed to check Git status:', error)
    // 返回未安装状态
    return {
      installed: false,
      error: '无法检测 Git 安装状态'
    }
  }
}

/**
 * 获取麦麦版本信息
 */
export async function getMaimaiVersion(): Promise<MaimaiVersion> {
  try {
    const response = await fetchWithAuth('/api/webui/plugins/version')
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Failed to get Maimai version:', error)
    // 返回默认版本
    return {
      version: '0.0.0',
      version_major: 0,
      version_minor: 0,
      version_patch: 0
    }
  }
}

/**
 * 比较版本号
 * 
 * @param pluginMinVersion 插件要求的最小版本
 * @param pluginMaxVersion 插件要求的最大版本（可选）
 * @param maimaiVersion 麦麦当前版本
 * @returns true 表示兼容，false 表示不兼容
 */
export function isPluginCompatible(
  pluginMinVersion: string,
  pluginMaxVersion: string | undefined,
  maimaiVersion: MaimaiVersion
): boolean {
  // 解析插件最小版本
  const minParts = pluginMinVersion.split('.').map(p => parseInt(p) || 0)
  const minMajor = minParts[0] || 0
  const minMinor = minParts[1] || 0
  const minPatch = minParts[2] || 0
  
  // 检查最小版本
  if (maimaiVersion.version_major < minMajor) return false
  if (maimaiVersion.version_major === minMajor && maimaiVersion.version_minor < minMinor) return false
  if (maimaiVersion.version_major === minMajor && 
      maimaiVersion.version_minor === minMinor && 
      maimaiVersion.version_patch < minPatch) return false
  
  // 检查最大版本（如果有）
  if (pluginMaxVersion) {
    const maxParts = pluginMaxVersion.split('.').map(p => parseInt(p) || 0)
    const maxMajor = maxParts[0] || 0
    const maxMinor = maxParts[1] || 0
    const maxPatch = maxParts[2] || 0
    
    if (maimaiVersion.version_major > maxMajor) return false
    if (maimaiVersion.version_major === maxMajor && maimaiVersion.version_minor > maxMinor) return false
    if (maimaiVersion.version_major === maxMajor && 
        maimaiVersion.version_minor === maxMinor && 
        maimaiVersion.version_patch > maxPatch) return false
  }
  
  return true
}

/**
 * 获取 WebSocket 临时认证 token
 */
async function getWsToken(): Promise<string | null> {
  try {
    const response = await fetchWithAuth('/api/webui/ws-token')
    if (!response.ok) {
      console.error('获取 WebSocket token 失败:', response.status)
      return null
    }
    const data = await response.json()
    if (data.success && data.token) {
      return data.token
    }
    return null
  } catch (error) {
    console.error('获取 WebSocket token 失败:', error)
    return null
  }
}

/**
 * 连接插件加载进度 WebSocket
 * 
 * 使用临时 token 进行认证，异步获取 token 后连接
 */
export async function connectPluginProgressWebSocket(
  onProgress: (progress: PluginLoadProgress) => void,
  onError?: (error: Event) => void
): Promise<WebSocket | null> {
  // 先获取临时 token
  const wsToken = await getWsToken()
  if (!wsToken) {
    console.warn('无法获取 WebSocket token，可能未登录')
    return null
  }
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  const wsUrl = `${protocol}//${host}/api/webui/ws/plugin-progress?token=${encodeURIComponent(wsToken)}`
  
  try {
    const ws = new WebSocket(wsUrl)
    
    ws.onopen = () => {
      console.log('Plugin progress WebSocket connected')
      // 发送心跳
      const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping')
        } else {
          clearInterval(heartbeat)
        }
      }, 30000)
    }
    
    ws.onmessage = (event) => {
      try {
        // 忽略心跳响应
        if (event.data === 'pong') {
          return
        }
        
        const data = JSON.parse(event.data) as PluginLoadProgress
        onProgress(data)
      } catch (error) {
        console.error('Failed to parse progress data:', error)
      }
    }
    
    ws.onerror = (error) => {
      console.error('Plugin progress WebSocket error:', error)
      onError?.(error)
    }
    
    ws.onclose = () => {
      console.log('Plugin progress WebSocket disconnected')
    }
    
    return ws
  } catch (error) {
    console.error('创建 WebSocket 连接失败:', error)
    return null
  }
}

/**
 * 获取已安装插件列表
 */
export async function getInstalledPlugins(): Promise<InstalledPlugin[]> {
  try {
    const response = await fetchWithAuth('/api/webui/plugins/installed', {
      headers: getAuthHeaders()
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || '获取已安装插件列表失败')
    }
    
    return result.plugins || []
  } catch (error) {
    console.error('Failed to get installed plugins:', error)
    return []
  }
}

/**
 * 检查插件是否已安装
 */
export function checkPluginInstalled(pluginId: string, installedPlugins: InstalledPlugin[]): boolean {
  return installedPlugins.some(p => p.id === pluginId)
}

/**
 * 获取已安装插件的版本
 */
export function getInstalledPluginVersion(pluginId: string, installedPlugins: InstalledPlugin[]): string | undefined {
  const plugin = installedPlugins.find(p => p.id === pluginId)
  if (!plugin) return undefined
  
  // 兼容两种格式：新格式有 manifest，旧格式直接有 version
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return plugin.manifest?.version || (plugin as any).version
}

/**
 * 安装插件
 */
export async function installPlugin(pluginId: string, repositoryUrl: string, branch: string = 'main'): Promise<{ success: boolean; message: string }> {
  const response = await fetchWithAuth('/api/webui/plugins/install', {
    method: 'POST',
    
    body: JSON.stringify({
      plugin_id: pluginId,
      repository_url: repositoryUrl,
      branch: branch
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '安装失败')
  }
  
  return await response.json()
}

/**
 * 卸载插件
 */
export async function uninstallPlugin(pluginId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetchWithAuth('/api/webui/plugins/uninstall', {
    method: 'POST',
    
    body: JSON.stringify({
      plugin_id: pluginId
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '卸载失败')
  }
  
  return await response.json()
}

/**
 * 更新插件
 */
export async function updatePlugin(pluginId: string, repositoryUrl: string, branch: string = 'main'): Promise<{ success: boolean; message: string; old_version: string; new_version: string }> {
  const response = await fetchWithAuth('/api/webui/plugins/update', {
    method: 'POST',
    
    body: JSON.stringify({
      plugin_id: pluginId,
      repository_url: repositoryUrl,
      branch: branch
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '更新失败')
  }
  
  return await response.json()
}


// ============ 插件配置管理 ============

/**
 * 列表项字段定义（用于 object 类型的数组项）
 */
export interface ItemFieldDefinition {
  type: string
  label?: string
  placeholder?: string
  default?: unknown
}

/**
 * 配置字段定义
 */
export interface ConfigFieldSchema {
  name: string
  type: string
  default: unknown
  description: string
  example?: string
  required: boolean
  choices?: unknown[]
  min?: number
  max?: number
  step?: number
  pattern?: string
  max_length?: number
  label: string
  placeholder?: string
  hint?: string
  icon?: string
  hidden: boolean
  disabled: boolean
  order: number
  input_type?: string
  ui_type: string
  rows?: number
  group?: string
  depends_on?: string
  depends_value?: unknown
  // 列表类型专用
  item_type?: string  // "string" | "number" | "object"
  item_fields?: Record<string, ItemFieldDefinition>
  min_items?: number
  max_items?: number
}

/**
 * 配置节定义
 */
export interface ConfigSectionSchema {
  name: string
  title: string
  description?: string
  icon?: string
  collapsed: boolean
  order: number
  fields: Record<string, ConfigFieldSchema>
}

/**
 * 配置标签页定义
 */
export interface ConfigTabSchema {
  id: string
  title: string
  sections: string[]
  icon?: string
  order: number
  badge?: string
}

/**
 * 配置布局定义
 */
export interface ConfigLayoutSchema {
  type: 'auto' | 'tabs' | 'pages'
  tabs: ConfigTabSchema[]
}

/**
 * 插件配置 Schema
 */
export interface PluginConfigSchema {
  plugin_id: string
  plugin_info: {
    name: string
    version: string
    description: string
    author: string
  }
  sections: Record<string, ConfigSectionSchema>
  layout: ConfigLayoutSchema
  _note?: string
}

/**
 * 获取插件配置 Schema
 */
export async function getPluginConfigSchema(pluginId: string): Promise<PluginConfigSchema> {
  const response = await fetchWithAuth(`/api/webui/plugins/config/${pluginId}/schema`, {
    headers: getAuthHeaders()
  })
  
  if (!response.ok) {
    const text = await response.text()
    try {
      const error = JSON.parse(text)
      throw new Error(error.detail || '获取配置 Schema 失败')
    } catch {
      throw new Error(`获取配置 Schema 失败 (${response.status})`)
    }
  }
  
  const result = await response.json()
  
  if (!result.success) {
    throw new Error(result.message || '获取配置 Schema 失败')
  }
  
  return result.schema
}

/**
 * 获取插件当前配置值
 */
export async function getPluginConfig(pluginId: string): Promise<Record<string, unknown>> {
  const response = await fetchWithAuth(`/api/webui/plugins/config/${pluginId}`, {
    headers: getAuthHeaders()
  })
  
  if (!response.ok) {
    const text = await response.text()
    try {
      const error = JSON.parse(text)
      throw new Error(error.detail || '获取配置失败')
    } catch {
      throw new Error(`获取配置失败 (${response.status})`)
    }
  }
  
  const result = await response.json()
  
  if (!result.success) {
    throw new Error(result.message || '获取配置失败')
  }
  
  return result.config
}

/**
 * 获取插件原始 TOML 配置
 */
export async function getPluginConfigRaw(pluginId: string): Promise<string> {
  const response = await fetchWithAuth(`/api/webui/plugins/config/${pluginId}/raw`, {
    headers: getAuthHeaders()
  })
  
  if (!response.ok) {
    const text = await response.text()
    try {
      const error = JSON.parse(text)
      throw new Error(error.detail || '获取配置失败')
    } catch {
      throw new Error(`获取配置失败 (${response.status})`)
    }
  }
  
  const result = await response.json()
  
  if (!result.success) {
    throw new Error(result.message || '获取配置失败')
  }
  
  return result.config
}

/**
 * 更新插件配置
 */
export async function updatePluginConfig(
  pluginId: string,
  config: Record<string, unknown>
): Promise<{ success: boolean; message: string; note?: string }> {
  const response = await fetchWithAuth(`/api/webui/plugins/config/${pluginId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ config })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '保存配置失败')
  }
  
  return await response.json()
}

/**
 * 更新插件原始 TOML 配置
 */
export async function updatePluginConfigRaw(
  pluginId: string,
  configToml: string
): Promise<{ success: boolean; message: string; note?: string }> {
  const response = await fetchWithAuth(`/api/webui/plugins/config/${pluginId}/raw`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ config: configToml })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '保存配置失败')
  }
  
  return await response.json()
}

/**
 * 重置插件配置为默认值
 */
export async function resetPluginConfig(
  pluginId: string
): Promise<{ success: boolean; message: string; backup?: string }> {
  const response = await fetchWithAuth(`/api/webui/plugins/config/${pluginId}/reset`, {
    method: 'POST',
    headers: getAuthHeaders()
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '重置配置失败')
  }
  
  return await response.json()
}

/**
 * 切换插件启用状态
 */
export async function togglePlugin(
  pluginId: string
): Promise<{ success: boolean; enabled: boolean; message: string; note?: string }> {
  const response = await fetchWithAuth(`/api/webui/plugins/config/${pluginId}/toggle`, {
    method: 'POST',
    headers: getAuthHeaders()
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '切换状态失败')
  }
  
  return await response.json()
}
