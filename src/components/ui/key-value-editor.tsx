"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Plus, Trash2, AlertCircle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// 生成唯一 ID 的辅助函数，兼容不支持 crypto.randomUUID 的环境
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback: 使用时间戳 + 随机数生成唯一 ID
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`
}

type ValueType = 'string' | 'number' | 'boolean'

interface KeyValuePair {
  id: string
  key: string
  value: string | number | boolean
  type: ValueType
}

interface KeyValueEditorProps {
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
  className?: string
  placeholder?: string
}

// 推断值的类型
function inferType(value: unknown): ValueType {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  return 'string'
}

// 将值转换为指定类型
function convertValue(value: string, type: ValueType): string | number | boolean {
  switch (type) {
    case 'boolean':
      return value === 'true'
    case 'number': {
      const num = parseFloat(value)
      return isNaN(num) ? 0 : num
    }
    default:
      return value
  }
}

// 将 Record 转换为 KeyValuePair 数组
function recordToPairs(record: Record<string, unknown>): KeyValuePair[] {
  return Object.entries(record).map(([key, value]) => ({
    id: generateId(),
    key,
    value: value as string | number | boolean,
    type: inferType(value),
  }))
}

// 将 KeyValuePair 数组转换为 Record
function pairsToRecord(pairs: KeyValuePair[]): Record<string, unknown> {
  const record: Record<string, unknown> = {}
  for (const pair of pairs) {
    if (pair.key.trim()) {
      record[pair.key.trim()] = pair.value
    }
  }
  return record
}

// 验证 JSON 字符串
function validateJson(jsonStr: string): { valid: boolean; error?: string; parsed?: Record<string, unknown> } {
  if (!jsonStr.trim()) {
    return { valid: true, parsed: {} }
  }
  try {
    const parsed = JSON.parse(jsonStr)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { valid: false, error: '必须是一个 JSON 对象 {}' }
    }
    // 检查值类型是否支持
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) {
        return { valid: false, error: `键 "${key}" 的值类型不支持（仅支持 string/number/boolean）` }
      }
    }
    return { valid: true, parsed: parsed as Record<string, unknown> }
  } catch {
    return { valid: false, error: 'JSON 格式错误' }
  }
}

// 获取类型的显示标签
function getTypeLabel(type: ValueType): string {
  switch (type) {
    case 'boolean': return '布尔'
    case 'number': return '数字'
    default: return '字符串'
  }
}

// 获取类型的颜色
function getTypeColor(type: ValueType): string {
  switch (type) {
    case 'boolean': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    case 'number': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    default: return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  }
}

export function KeyValueEditor({
  value,
  onChange,
  className,
  placeholder = "添加额外参数...",
}: KeyValueEditorProps) {
  const [mode, setMode] = useState<'list' | 'json'>('list')
  
  // 使用 useMemo 来派生 pairs 和 jsonText，而不是用 useEffect 同步
  const pairs = useMemo(() => recordToPairs(value || {}), [value])
  const initialJsonText = useMemo(() => 
    Object.keys(value || {}).length > 0 ? JSON.stringify(value, null, 2) : '', 
    [value]
  )
  
  const [editingPairs, setEditingPairs] = useState<KeyValuePair[]>(pairs)
  const [editingJsonText, setEditingJsonText] = useState(initialJsonText)
  const [jsonError, setJsonError] = useState<string | null>(null)

  // 当 value 变化时重置编辑状态
  useEffect(() => {
    setEditingPairs(pairs)
    setEditingJsonText(initialJsonText)
  }, [pairs, initialJsonText])

  // JSON 预览数据
  const previewData = useMemo(() => {
    const validation = validateJson(editingJsonText)
    if (validation.valid && validation.parsed) {
      return { success: true, data: validation.parsed }
    }
    return { success: false, data: {} }
  }, [editingJsonText])

  // 切换模式时同步数据
  const handleModeChange = useCallback((newMode: string) => {
    const targetMode = newMode as 'list' | 'json'
    if (targetMode === 'json' && mode === 'list') {
      // 从列表模式切换到 JSON 模式
      const record = pairsToRecord(editingPairs)
      setEditingJsonText(Object.keys(record).length > 0 ? JSON.stringify(record, null, 2) : '')
      setJsonError(null)
    } else if (targetMode === 'list' && mode === 'json') {
      // 从 JSON 模式切换到列表模式
      const validation = validateJson(editingJsonText)
      if (validation.valid && validation.parsed) {
        setEditingPairs(recordToPairs(validation.parsed))
        setJsonError(null)
      }
    }
    setMode(targetMode)
  }, [mode, editingPairs, editingJsonText])

  // 添加新的键值对
  const addPair = useCallback(() => {
    const newPair: KeyValuePair = {
      id: generateId(),
      key: '',
      value: '',
      type: 'string',
    }
    const newPairs = [...editingPairs, newPair]
    setEditingPairs(newPairs)
  }, [editingPairs])

  // 删除键值对
  const removePair = useCallback((id: string) => {
    const newPairs = editingPairs.filter(p => p.id !== id)
    setEditingPairs(newPairs)
    onChange(pairsToRecord(newPairs))
  }, [editingPairs, onChange])

  // 更新键值对
  const updatePair = useCallback((id: string, field: 'key' | 'value' | 'type', newValue: string | ValueType) => {
    const newPairs = editingPairs.map(pair => {
      if (pair.id !== id) return pair

      if (field === 'type') {
        // 类型变化时转换值
        const newType = newValue as ValueType
        let convertedValue: string | number | boolean
        if (newType === 'boolean') {
          convertedValue = pair.value === 'true' || pair.value === true
        } else if (newType === 'number') {
          convertedValue = typeof pair.value === 'number' ? pair.value : parseFloat(String(pair.value)) || 0
        } else {
          convertedValue = String(pair.value)
        }
        return { ...pair, type: newType, value: convertedValue }
      } else if (field === 'value') {
        // 值变化时按类型转换
        return { ...pair, value: convertValue(newValue as string, pair.type) }
      } else {
        return { ...pair, [field]: newValue }
      }
    })
    setEditingPairs(newPairs)
    onChange(pairsToRecord(newPairs))
  }, [editingPairs, onChange])

  // JSON 文本变化
  const handleJsonChange = useCallback((text: string) => {
    setEditingJsonText(text)
    const validation = validateJson(text)
    if (validation.valid && validation.parsed) {
      setJsonError(null)
      onChange(validation.parsed)
    } else {
      setJsonError(validation.error || 'JSON 格式错误')
    }
  }, [onChange])

  return (
    <div className={cn("space-y-3", className)}>
      {/* 标题 */}
      <Label className="text-sm font-medium">额外参数</Label>

      <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
        <TabsList className="h-8 p-0.5 bg-muted/60">
          <TabsTrigger 
            value="list" 
            className="h-7 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            键值对
          </TabsTrigger>
          <TabsTrigger 
            value="json" 
            className="h-7 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            JSON
          </TabsTrigger>
        </TabsList>

        {/* 键值对列表模式 */}
        <TabsContent value="list" className="mt-3 space-y-2">
          {editingPairs.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
              {placeholder}
            </div>
          ) : (
            <div className="space-y-2">
              {/* 表头 */}
              <div className="grid grid-cols-[1fr_1fr_90px_32px] gap-2 text-xs text-muted-foreground px-1">
                <span>键名</span>
                <span>值</span>
                <span>类型</span>
                <span></span>
              </div>
              {/* 键值对列表 */}
              {editingPairs.map((pair) => (
                <div key={pair.id} className="grid grid-cols-[1fr_1fr_90px_32px] gap-2 items-center">
                  <Input
                    value={pair.key}
                    onChange={(e) => updatePair(pair.id, 'key', e.target.value)}
                    placeholder="key"
                    className="h-8 text-sm"
                  />
                  {pair.type === 'boolean' ? (
                    <div className="flex items-center h-8 px-3 border rounded-md bg-background">
                      <Switch
                        checked={pair.value === true}
                        onCheckedChange={(checked) => updatePair(pair.id, 'value', String(checked))}
                      />
                      <span className="ml-2 text-sm text-muted-foreground">
                        {pair.value ? 'true' : 'false'}
                      </span>
                    </div>
                  ) : (
                    <Input
                      type={pair.type === 'number' ? 'number' : 'text'}
                      value={pair.value as string | number}
                      onChange={(e) => updatePair(pair.id, 'value', e.target.value)}
                      placeholder="value"
                      className="h-8 text-sm"
                      step={pair.type === 'number' ? 'any' : undefined}
                    />
                  )}
                  <Select
                    value={pair.type}
                    onValueChange={(v) => updatePair(pair.id, 'type', v as ValueType)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">字符串</SelectItem>
                      <SelectItem value="number">数字</SelectItem>
                      <SelectItem value="boolean">布尔</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removePair(pair.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-8"
            onClick={addPair}
          >
            <Plus className="h-4 w-4 mr-1" />
            添加参数
          </Button>
        </TabsContent>

        {/* JSON 编辑模式 - 左右分栏 */}
        <TabsContent value="json" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 左侧：JSON 编辑器 */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">编辑</span>
                {jsonError ? (
                  <div className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{jsonError}</span>
                  </div>
                ) : editingJsonText.trim() && (
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <Check className="h-3 w-3" />
                    <span>有效</span>
                  </div>
                )}
              </div>
              <Textarea
                value={editingJsonText}
                onChange={(e) => handleJsonChange(e.target.value)}
                placeholder={'{\n  "key": "value"\n}'}
                className={cn(
                  "font-mono text-sm min-h-[140px] h-[140px] resize-y flex-1",
                  jsonError && "border-destructive focus-visible:ring-destructive"
                )}
              />
              <p className="text-xs text-muted-foreground">
                支持 string、number、boolean 类型
              </p>
            </div>

            {/* 右侧：预览 */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">预览</span>
              <div className="min-h-[140px] h-[140px] flex-1 rounded-md border bg-muted/30 p-3 overflow-auto">
                {previewData.success && Object.keys(previewData.data).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(previewData.data).map(([key, val]) => {
                      const type = inferType(val)
                      return (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <code className="px-1.5 py-0.5 bg-background rounded text-xs font-medium">
                            {key}
                          </code>
                          <span className="text-muted-foreground">=</span>
                          <span className={cn(
                            "font-mono",
                            type === 'boolean' && (val ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'),
                            type === 'number' && 'text-blue-600 dark:text-blue-400',
                            type === 'string' && 'text-amber-600 dark:text-amber-400'
                          )}>
                            {type === 'string' ? `"${val}"` : String(val)}
                          </span>
                          <Badge variant="secondary" className={cn("h-5 text-[10px] px-1.5", getTypeColor(type))}>
                            {getTypeLabel(type)}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                ) : previewData.success ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    暂无参数
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-destructive">
                    JSON 格式错误
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                实时预览解析结果
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
