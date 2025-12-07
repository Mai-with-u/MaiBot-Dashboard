import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Save, Search, Info, Power, Check, ChevronsUpDown, RefreshCw, Loader2, GraduationCap } from 'lucide-react'
import { getModelConfig, updateModelConfig } from '@/lib/config-api'
import { restartMaiBot } from '@/lib/system-api'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RestartingOverlay } from '@/components/RestartingOverlay'
import { KeyValueEditor } from '@/components/ui/key-value-editor'

// 导入模块化的类型定义和组件
import type { ModelInfo, ProviderConfig, ModelTaskConfig, TaskConfig } from './model/types'
import { TaskConfigCard, Pagination, ModelTable, ModelCardList } from './model/components'
import { useModelTour, useModelFetcher, useModelAutoSave } from './model/hooks'

export function ModelConfigPage() {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [providers, setProviders] = useState<string[]>([])
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>([])
  const [modelNames, setModelNames] = useState<string[]>([])
  const [taskConfig, setTaskConfig] = useState<ModelTaskConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [showRestartOverlay, setShowRestartOverlay] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<ModelInfo | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModels, setSelectedModels] = useState<Set<number>>(new Set())
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [jumpToPage, setJumpToPage] = useState('')
  
  // 模型 Combobox 状态
  const [modelComboboxOpen, setModelComboboxOpen] = useState(false)
  
  // 表单验证错误状态
  const [formErrors, setFormErrors] = useState<{
    name?: string
    api_provider?: string
    model_identifier?: string
  }>({})
  
  const { toast } = useToast()
  
  // Tour 引导 (使用 hook 封装的逻辑)
  const { startTour: handleStartTour, isRunning: tourIsRunning } = useModelTour({
    onCloseEditDialog: () => setEditDialogOpen(false),
  })

  // 自动保存 (使用 hook 封装的逻辑)
  const { clearTimers: clearAutoSaveTimers, initialLoadRef } = useModelAutoSave({
    models,
    taskConfig,
    onSavingChange: setAutoSaving,
    onUnsavedChange: setHasUnsavedChanges,
  })

  // 加载配置
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true)
      const config = await getModelConfig()
      const modelList = (config.models as ModelInfo[]) || []
      setModels(modelList)
      setModelNames(modelList.map((m) => m.name))
      
      const providerList = (config.api_providers as ProviderConfig[]) || []
      setProviders(providerList.map((p) => p.name))
      setProviderConfigs(providerList)
      
      setTaskConfig((config.model_task_config as ModelTaskConfig) || null)
      setHasUnsavedChanges(false)
      initialLoadRef.current = false
    } catch (error) {
      console.error('加载配置失败:', error)
    } finally {
      setLoading(false)
    }
  }, [initialLoadRef])

  // 初始加载
  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // 获取指定提供商的配置
  const getProviderConfig = useCallback((providerName: string): ProviderConfig | undefined => {
    return providerConfigs.find(p => p.name === providerName)
  }, [providerConfigs])

  // 模型列表获取 (使用 hook 封装的逻辑)
  const {
    availableModels,
    fetchingModels,
    modelFetchError,
    matchedTemplate,
    fetchModelsForProvider,
    clearModels,
  } = useModelFetcher({ getProviderConfig })

  // 当选择的提供商变化时，获取模型列表
  useEffect(() => {
    if (editDialogOpen && editingModel?.api_provider) {
      fetchModelsForProvider(editingModel.api_provider)
    }
  }, [editDialogOpen, editingModel?.api_provider, fetchModelsForProvider])

  // 重启麦麦
  const handleRestart = async () => {
    try {
      setRestarting(true)
      // 发送重启请求（不等待响应，因为服务器会立即关闭）
      restartMaiBot().catch(() => {
        // 忽略网络错误，这是预期行为
      })
      // 立即显示遮罩层并开始状态检测
      setShowRestartOverlay(true)
    } catch (error) {
      console.error('重启失败:', error)
      setShowRestartOverlay(false)
      toast({
        title: '重启失败',
        description: '无法发送重启请求，请手动重启',
        variant: 'destructive',
      })
      setRestarting(false)
    }
  }

  // 清理模型中的 null 值（TOML 不支持 null）
  const cleanModelForSave = (model: ModelInfo): ModelInfo => {
    const cleaned: ModelInfo = {
      model_identifier: model.model_identifier,
      name: model.name,
      api_provider: model.api_provider,
      price_in: model.price_in ?? 0,
      price_out: model.price_out ?? 0,
      force_stream_mode: model.force_stream_mode ?? false,
      extra_params: model.extra_params ?? {},
    }
    // 只有在有值时才添加可选字段
    if (model.temperature != null) {
      cleaned.temperature = model.temperature
    }
    if (model.max_tokens != null) {
      cleaned.max_tokens = model.max_tokens
    }
    return cleaned
  }

  // 保存并重启
  const handleSaveAndRestart = async () => {
    try {
      setSaving(true)
      clearAutoSaveTimers()
      const config = await getModelConfig()
      // 清理每个模型中的 null 值
      config.models = models.map(cleanModelForSave)
      config.model_task_config = taskConfig
      await updateModelConfig(config)
      setHasUnsavedChanges(false)
      toast({
        title: '保存成功',
        description: '正在重启麦麦...',
      })
      await handleRestart()
    } catch (error) {
      console.error('保存配置失败:', error)
      toast({
        title: '保存失败',
        description: (error as Error).message,
        variant: 'destructive',
      })
      setSaving(false)
    }
  }

  // 重启完成回调
  const handleRestartComplete = () => {
    // 清除token，避免自动登录
    localStorage.removeItem('access-token')
    window.location.href = '/auth'
  }

  // 重启失败回调
  const handleRestartFailed = () => {
    setShowRestartOverlay(false)
    setRestarting(false)
    toast({
      title: '重启超时',
      description: '服务未能在预期时间内恢复，请手动检查或刷新页面',
      variant: 'destructive',
    })
  }

  // 保存配置（手动保存）
  const saveConfig = async () => {
    try {
      setSaving(true)
      
      // 先取消自动保存定时器
      clearAutoSaveTimers()

      const config = await getModelConfig()
      // 清理每个模型中的 null 值
      config.models = models.map(cleanModelForSave)
      config.model_task_config = taskConfig
      await updateModelConfig(config)
      setHasUnsavedChanges(false)
      toast({
        title: '保存成功',
        description: '模型配置已保存',
      })
      await loadConfig() // 重新加载以更新模型名称列表
    } catch (error) {
      console.error('保存配置失败:', error)
      toast({
        title: '保存失败',
        description: (error as Error).message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // 打开编辑对话框
  const openEditDialog = (model: ModelInfo | null, index: number | null) => {
    // 清除表单验证错误
    setFormErrors({})
    
    setEditingModel(
      model || {
        model_identifier: '',
        name: '',
        api_provider: providers[0] || '',
        price_in: 0,
        price_out: 0,
        temperature: null,
        max_tokens: null,
        force_stream_mode: false,
        extra_params: {},
      }
    )
    setEditingIndex(index)
    setEditDialogOpen(true)
  }

  // 保存编辑
  const handleSaveEdit = () => {
    if (!editingModel) return

    // 验证必填项
    const errors: { name?: string; api_provider?: string; model_identifier?: string } = {}
    if (!editingModel.name?.trim()) {
      errors.name = '请输入模型名称'
    }
    if (!editingModel.api_provider?.trim()) {
      errors.api_provider = '请选择 API 提供商'
    }
    if (!editingModel.model_identifier?.trim()) {
      errors.model_identifier = '请输入模型标识符'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    // 清除错误状态
    setFormErrors({})

    // 填充空值的默认值，并移除 null 值的可选字段（TOML 不支持 null）
    const modelToSave: ModelInfo = {
      model_identifier: editingModel.model_identifier,
      name: editingModel.name,
      api_provider: editingModel.api_provider,
      price_in: editingModel.price_in ?? 0,
      price_out: editingModel.price_out ?? 0,
      force_stream_mode: editingModel.force_stream_mode ?? false,
      extra_params: editingModel.extra_params ?? {},
    }
    
    // 只有在有值时才添加可选字段
    if (editingModel.temperature != null) {
      modelToSave.temperature = editingModel.temperature
    }
    if (editingModel.max_tokens != null) {
      modelToSave.max_tokens = editingModel.max_tokens
    }

    let newModels: ModelInfo[]
    let oldModelName: string | null = null
    
    if (editingIndex !== null) {
      // 记录旧的模型名称，用于更新任务配置
      oldModelName = models[editingIndex].name
      newModels = [...models]
      newModels[editingIndex] = modelToSave
    } else {
      newModels = [...models, modelToSave]
    }
    
    setModels(newModels)
    // 立即更新模型名称列表
    setModelNames(newModels.map((m) => m.name))

    // 如果模型名称发生变化，更新任务配置中对该模型的引用
    if (oldModelName && oldModelName !== modelToSave.name && taskConfig) {
      const updateModelList = (list: string[]): string[] => {
        return list.map(name => name === oldModelName ? modelToSave.name : name)
      }
      
      setTaskConfig({
        ...taskConfig,
        utils: { ...taskConfig.utils, model_list: updateModelList(taskConfig.utils?.model_list || []) },
        utils_small: { ...taskConfig.utils_small, model_list: updateModelList(taskConfig.utils_small?.model_list || []) },
        tool_use: { ...taskConfig.tool_use, model_list: updateModelList(taskConfig.tool_use?.model_list || []) },
        replyer: { ...taskConfig.replyer, model_list: updateModelList(taskConfig.replyer?.model_list || []) },
        planner: { ...taskConfig.planner, model_list: updateModelList(taskConfig.planner?.model_list || []) },
        vlm: { ...taskConfig.vlm, model_list: updateModelList(taskConfig.vlm?.model_list || []) },
        voice: { ...taskConfig.voice, model_list: updateModelList(taskConfig.voice?.model_list || []) },
        embedding: { ...taskConfig.embedding, model_list: updateModelList(taskConfig.embedding?.model_list || []) },
        lpmm_entity_extract: { ...taskConfig.lpmm_entity_extract, model_list: updateModelList(taskConfig.lpmm_entity_extract?.model_list || []) },
        lpmm_rdf_build: { ...taskConfig.lpmm_rdf_build, model_list: updateModelList(taskConfig.lpmm_rdf_build?.model_list || []) },
        lpmm_qa: { ...taskConfig.lpmm_qa, model_list: updateModelList(taskConfig.lpmm_qa?.model_list || []) },
      })
    }

    setEditDialogOpen(false)
    setEditingModel(null)
    setEditingIndex(null)
  }

  // 处理编辑对话框关闭
  const handleEditDialogClose = (open: boolean) => {
    if (!open && editingModel) {
      // 关闭时填充默认值
      const updatedModel = {
        ...editingModel,
        price_in: editingModel.price_in ?? 0,
        price_out: editingModel.price_out ?? 0,
      }
      setEditingModel(updatedModel)
    }
    setEditDialogOpen(open)
  }

  // 打开删除确认对话框
  const openDeleteDialog = (index: number) => {
    setDeletingIndex(index)
    setDeleteDialogOpen(true)
  }

  // 确认删除模型
  const handleConfirmDelete = () => {
    if (deletingIndex !== null) {
      const newModels = models.filter((_, i) => i !== deletingIndex)
      setModels(newModels)
      // 立即更新模型名称列表
      setModelNames(newModels.map((m) => m.name))
      toast({
        title: '删除成功',
        description: '模型已从列表中移除',
      })
    }
    setDeleteDialogOpen(false)
    setDeletingIndex(null)
  }

  // 切换单个模型选择
  const toggleModelSelection = (index: number) => {
    const newSelected = new Set(selectedModels)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedModels(newSelected)
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedModels.size === filteredModels.length) {
      setSelectedModels(new Set())
    } else {
      const allIndices = filteredModels.map((_, idx) => 
        models.findIndex(m => m === filteredModels[idx])
      )
      setSelectedModels(new Set(allIndices))
    }
  }

  // 打开批量删除确认对话框
  const openBatchDeleteDialog = () => {
    if (selectedModels.size === 0) {
      toast({
        title: '提示',
        description: '请先选择要删除的模型',
        variant: 'default',
      })
      return
    }
    setBatchDeleteDialogOpen(true)
  }

  // 确认批量删除
  const handleConfirmBatchDelete = () => {
    const newModels = models.filter((_, index) => !selectedModels.has(index))
    setModels(newModels)
    // 立即更新模型名称列表
    setModelNames(newModels.map((m) => m.name))
    setSelectedModels(new Set())
    setBatchDeleteDialogOpen(false)
    toast({
      title: '批量删除成功',
      description: `已删除 ${selectedModels.size} 个模型`,
    })
  }

  // 更新任务配置
  const updateTaskConfig = (
    taskName: keyof ModelTaskConfig,
    field: keyof TaskConfig,
    value: string[] | number
  ) => {
    if (!taskConfig) return
    setTaskConfig({
      ...taskConfig,
      [taskName]: {
        ...taskConfig[taskName],
        [field]: value,
      },
    })
  }

  // 过滤模型列表
  const filteredModels = models.filter((model) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      model.name.toLowerCase().includes(query) ||
      model.model_identifier.toLowerCase().includes(query) ||
      model.api_provider.toLowerCase().includes(query)
    )
  })

  // 分页逻辑
  const totalPages = Math.ceil(filteredModels.length / pageSize)
  const paginatedModels = filteredModels.slice(
    (page - 1) * pageSize,
    page * pageSize
  )

  // 页码跳转
  const handleJumpToPage = () => {
    const targetPage = parseInt(jumpToPage)
    if (targetPage >= 1 && targetPage <= totalPages) {
      setPage(targetPage)
      setJumpToPage('')
    }
  }

  // 检查模型是否被任务使用
  const isModelUsed = (modelName: string): boolean => {
    if (!taskConfig) return false
    
    const allTaskLists = [
      taskConfig.utils?.model_list || [],
      taskConfig.utils_small?.model_list || [],
      taskConfig.tool_use?.model_list || [],
      taskConfig.replyer?.model_list || [],
      taskConfig.planner?.model_list || [],
      taskConfig.vlm?.model_list || [],
      taskConfig.voice?.model_list || [],
      taskConfig.embedding?.model_list || [],
      taskConfig.lpmm_entity_extract?.model_list || [],
      taskConfig.lpmm_rdf_build?.model_list || [],
      taskConfig.lpmm_qa?.model_list || [],
    ]
    
    return allTaskLists.some(list => list.includes(modelName))
  }

  if (loading) {
    return (
      <ScrollArea className="h-full">
        <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      </ScrollArea>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        {/* 页面标题 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">模型管理与分配</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">添加模型并为模型分配功能</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              onClick={saveConfig} 
              disabled={saving || autoSaving || !hasUnsavedChanges || restarting} 
              size="sm"
              variant="outline"
              className="flex-1 sm:flex-none sm:min-w-[120px]"
            >
              <Save className="mr-2 h-4 w-4" strokeWidth={2} fill="none" />
              {saving ? '保存中...' : autoSaving ? '自动保存中...' : hasUnsavedChanges ? '保存配置' : '已保存'}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={saving || autoSaving || restarting}
                  size="sm"
                  className="flex-1 sm:flex-none sm:min-w-[120px]"
                >
                  <Power className="mr-2 h-4 w-4" />
                  {restarting ? '重启中...' : hasUnsavedChanges ? '保存并重启' : '重启麦麦'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认重启麦麦？</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div>
                      <p>
                        {hasUnsavedChanges 
                          ? '当前有未保存的配置更改。点击确认将先保存配置,然后重启麦麦使新配置生效。重启过程中麦麦将暂时离线。'
                          : '即将重启麦麦主程序。重启过程中麦麦将暂时离线,配置将在重启后生效。'
                        }
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={hasUnsavedChanges ? handleSaveAndRestart : handleRestart}>
                    {hasUnsavedChanges ? '保存并重启' : '确认重启'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* 重启提示 */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            配置更新后需要<strong>重启麦麦</strong>才能生效。你可以点击右上角的"保存并重启"按钮一键完成保存和重启。
          </AlertDescription>
        </Alert>

        {/* 新手引导入口 - 仅在桌面端显示，移动端隐藏 */}
        <Alert className="hidden lg:flex border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors" onClick={handleStartTour}>
          <GraduationCap className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              <strong className="text-primary">新手引导：</strong>不知道如何配置模型？点击这里开始学习如何为麦麦的组件分配模型。
            </span>
            <Button variant="outline" size="sm" className="ml-4 shrink-0">
              开始引导
            </Button>
          </AlertDescription>
        </Alert>

        {/* 标签页 */}
        <Tabs defaultValue="models" className="w-full">
          <TabsList className="grid w-full max-w-full sm:max-w-md grid-cols-2">
            <TabsTrigger value="models">添加模型</TabsTrigger>
            <TabsTrigger value="tasks" data-tour="tasks-tab-trigger">为模型分配功能</TabsTrigger>
          </TabsList>
          {/* 模型配置标签页 */}
          <TabsContent value="models" className="space-y-4 mt-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <p className="text-sm text-muted-foreground">
                配置可用的模型列表
              </p>
              <div className="flex gap-2 w-full sm:w-auto">
                {selectedModels.size > 0 && (
                  <Button 
                    onClick={openBatchDeleteDialog} 
                    size="sm" 
                    variant="destructive" 
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="mr-2 h-4 w-4" strokeWidth={2} fill="none" />
                    批量删除 ({selectedModels.size})
                  </Button>
                )}
                <Button onClick={() => openEditDialog(null, null)} size="sm" variant="outline" className="w-full sm:w-auto" data-tour="add-model-button">
                  <Plus className="mr-2 h-4 w-4" strokeWidth={2} fill="none" />
                  添加模型
                </Button>
              </div>
            </div>

          {/* 搜索框 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="relative w-full sm:flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索模型名称、标识符或提供商..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-muted-foreground whitespace-nowrap">
                找到 {filteredModels.length} 个结果
              </p>
            )}
          </div>

          {/* 模型列表 - 移动端卡片视图 */}
          <ModelCardList
            paginatedModels={paginatedModels}
            allModels={models}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            isModelUsed={isModelUsed}
            searchQuery={searchQuery}
          />

          {/* 模型列表 - 桌面端表格视图 */}
          <ModelTable
            paginatedModels={paginatedModels}
            allModels={models}
            filteredModels={filteredModels}
            selectedModels={selectedModels}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            onToggleSelection={toggleModelSelection}
            onToggleSelectAll={toggleSelectAll}
            isModelUsed={isModelUsed}
            searchQuery={searchQuery}
          />

          {/* 分页 - 使用模块化组件 */}
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={filteredModels.length}
            jumpToPage={jumpToPage}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onJumpToPageChange={setJumpToPage}
            onJumpToPage={handleJumpToPage}
            onSelectionClear={() => setSelectedModels(new Set())}
          />
        </TabsContent>

        {/* 模型任务配置标签页 */}
        <TabsContent value="tasks" className="space-y-6 mt-0">
          <p className="text-sm text-muted-foreground">
            为不同的任务配置使用的模型和参数
          </p>

          {taskConfig && (
            <div className="grid gap-4 sm:gap-6">
              {/* Utils 任务 */}
              <TaskConfigCard
                title="组件模型 (utils)"
                description="用于表情包、取名、关系、情绪变化等组件"
                taskConfig={taskConfig.utils}
                modelNames={modelNames}
                onChange={(field, value) => updateTaskConfig('utils', field, value)}
                dataTour="task-model-select"
              />

              {/* Utils Small 任务 */}
              <TaskConfigCard
                title="组件小模型 (utils_small)"
                description="消耗量较大的组件，建议使用速度较快的小模型"
                taskConfig={taskConfig.utils_small}
                modelNames={modelNames}
                onChange={(field, value) => updateTaskConfig('utils_small', field, value)}
              />

              {/* Tool Use 任务 */}
              <TaskConfigCard
                title="工具调用模型 (tool_use)"
                description="需要使用支持工具调用的模型"
                taskConfig={taskConfig.tool_use}
                modelNames={modelNames}
                onChange={(field, value) => updateTaskConfig('tool_use', field, value)}
              />

              {/* Replyer 任务 */}
              <TaskConfigCard
                title="首要回复模型 (replyer)"
                description="用于表达器和表达方式学习"
                taskConfig={taskConfig.replyer}
                modelNames={modelNames}
                onChange={(field, value) => updateTaskConfig('replyer', field, value)}
              />

              {/* Planner 任务 */}
              <TaskConfigCard
                title="决策模型 (planner)"
                description="负责决定麦麦该什么时候回复"
                taskConfig={taskConfig.planner}
                modelNames={modelNames}
                onChange={(field, value) => updateTaskConfig('planner', field, value)}
              />

              {/* VLM 任务 */}
              <TaskConfigCard
                title="图像识别模型 (vlm)"
                description="视觉语言模型"
                taskConfig={taskConfig.vlm}
                modelNames={modelNames}
                onChange={(field, value) => updateTaskConfig('vlm', field, value)}
                hideTemperature
              />

              {/* Voice 任务 */}
              <TaskConfigCard
                title="语音识别模型 (voice)"
                description="语音转文字"
                taskConfig={taskConfig.voice}
                modelNames={modelNames}
                onChange={(field, value) => updateTaskConfig('voice', field, value)}
                hideTemperature
                hideMaxTokens
              />

              {/* Embedding 任务 */}
              <TaskConfigCard
                title="嵌入模型 (embedding)"
                description="用于向量化"
                taskConfig={taskConfig.embedding}
                modelNames={modelNames}
                onChange={(field, value) => updateTaskConfig('embedding', field, value)}
                hideTemperature
                hideMaxTokens
              />

              {/* LPMM 相关任务 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">LPMM 知识库模型</h3>
                
                <TaskConfigCard
                  title="实体提取模型 (lpmm_entity_extract)"
                  description="从文本中提取实体"
                  taskConfig={taskConfig.lpmm_entity_extract}
                  modelNames={modelNames}
                  onChange={(field, value) =>
                    updateTaskConfig('lpmm_entity_extract', field, value)
                  }
                />

                <TaskConfigCard
                  title="RDF 构建模型 (lpmm_rdf_build)"
                  description="构建知识图谱"
                  taskConfig={taskConfig.lpmm_rdf_build}
                  modelNames={modelNames}
                  onChange={(field, value) =>
                    updateTaskConfig('lpmm_rdf_build', field, value)
                  }
                />

                <TaskConfigCard
                  title="问答模型 (lpmm_qa)"
                  description="知识库问答"
                  taskConfig={taskConfig.lpmm_qa}
                  modelNames={modelNames}
                  onChange={(field, value) => updateTaskConfig('lpmm_qa', field, value)}
                />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 编辑模型对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={handleEditDialogClose}>
        <DialogContent 
          className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto" 
          data-tour="model-dialog"
          preventOutsideClose={tourIsRunning}
        >
          <DialogHeader>
            <DialogTitle>
              {editingIndex !== null ? '编辑模型' : '添加模型'}
            </DialogTitle>
            <DialogDescription>配置模型的基本信息和参数</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2" data-tour="model-name-input">
              <Label htmlFor="model_name" className={formErrors.name ? 'text-destructive' : ''}>模型名称 *</Label>
              <Input
                id="model_name"
                value={editingModel?.name || ''}
                onChange={(e) => {
                  setEditingModel((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                  if (formErrors.name) {
                    setFormErrors((prev) => ({ ...prev, name: undefined }))
                  }
                }}
                placeholder="例如: qwen3-30b"
                className={formErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {formErrors.name ? (
                <p className="text-xs text-destructive">{formErrors.name}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  用于在任务配置中引用此模型
                </p>
              )}
            </div>

            <div className="grid gap-2" data-tour="model-provider-select">
              <Label htmlFor="api_provider" className={formErrors.api_provider ? 'text-destructive' : ''}>API 提供商 *</Label>
              <Select
                value={editingModel?.api_provider || ''}
                onValueChange={(value) => {
                  setEditingModel((prev) =>
                    prev ? { ...prev, api_provider: value } : null
                  )
                  // 清空模型列表和错误状态，等待 useEffect 重新获取
                  clearModels()
                  if (formErrors.api_provider) {
                    setFormErrors((prev) => ({ ...prev, api_provider: undefined }))
                  }
                }}
              >
                <SelectTrigger id="api_provider" className={formErrors.api_provider ? 'border-destructive focus-visible:ring-destructive' : ''}>
                  <SelectValue placeholder="选择提供商" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.api_provider && (
                <p className="text-xs text-destructive">{formErrors.api_provider}</p>
              )}
            </div>

            <div className="grid gap-2" data-tour="model-identifier-input">
              <div className="flex items-center justify-between">
                <Label htmlFor="model_identifier" className={formErrors.model_identifier ? 'text-destructive' : ''}>模型标识符 *</Label>
                {matchedTemplate?.modelFetcher && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {matchedTemplate.display_name}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => editingModel?.api_provider && fetchModelsForProvider(editingModel.api_provider, true)}
                      disabled={fetchingModels}
                    >
                      {fetchingModels ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
              
              {/* 模型标识符 Combobox */}
              {matchedTemplate?.modelFetcher ? (
                <Popover open={modelComboboxOpen} onOpenChange={setModelComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={modelComboboxOpen}
                      className="w-full justify-between font-normal"
                      disabled={fetchingModels || !!modelFetchError}
                    >
                      {fetchingModels ? (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          正在获取模型列表...
                        </span>
                      ) : modelFetchError ? (
                        <span className="text-muted-foreground text-sm">点击下方输入框手动填写</span>
                      ) : editingModel?.model_identifier ? (
                        <span className="truncate">{editingModel.model_identifier}</span>
                      ) : (
                        <span className="text-muted-foreground">搜索或选择模型...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                    <Command>
                      <CommandInput placeholder="搜索模型..." />
                      <ScrollArea className="h-[300px]">
                        <CommandList className="max-h-none overflow-visible">
                          <CommandEmpty>
                            {modelFetchError ? (
                              <div className="py-4 px-2 text-center space-y-2">
                                <p className="text-sm text-destructive">{modelFetchError}</p>
                                {!modelFetchError.includes('API Key') && (
                                  <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() => editingModel?.api_provider && fetchModelsForProvider(editingModel.api_provider, true)}
                                  >
                                    重试
                                  </Button>
                                )}
                              </div>
                            ) : (
                              '未找到匹配的模型'
                            )}
                          </CommandEmpty>
                          <CommandGroup heading="可用模型">
                            {availableModels.map((model) => (
                              <CommandItem
                                key={model.id}
                                value={model.id}
                                onSelect={() => {
                                  setEditingModel((prev) =>
                                    prev ? { ...prev, model_identifier: model.id } : null
                                  )
                                  setModelComboboxOpen(false)
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    editingModel?.model_identifier === model.id ? 'opacity-100' : 'opacity-0'
                                  }`}
                                />
                                <div className="flex flex-col">
                                  <span>{model.id}</span>
                                  {model.name !== model.id && (
                                    <span className="text-xs text-muted-foreground">{model.name}</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandGroup heading="手动输入">
                            <CommandItem
                              value="__manual_input__"
                              onSelect={() => {
                                setModelComboboxOpen(false)
                                // 聚焦到手动输入框（如果需要的话可以实现）
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              手动输入模型标识符...
                            </CommandItem>
                          </CommandGroup>
                        </CommandList>
                      </ScrollArea>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <Input
                  id="model_identifier"
                  value={editingModel?.model_identifier || ''}
                  onChange={(e) => {
                    setEditingModel((prev) =>
                      prev ? { ...prev, model_identifier: e.target.value } : null
                    )
                    if (formErrors.model_identifier) {
                      setFormErrors((prev) => ({ ...prev, model_identifier: undefined }))
                    }
                  }}
                  placeholder="Qwen/Qwen3-30B-A3B-Instruct-2507"
                  className={formErrors.model_identifier ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
              )}
              
              {/* 表单验证错误提示 */}
              {formErrors.model_identifier && (
                <p className="text-xs text-destructive">{formErrors.model_identifier}</p>
              )}
              
              {/* 模型获取错误提示 */}
              {modelFetchError && matchedTemplate?.modelFetcher && !formErrors.model_identifier && (
                <Alert variant="destructive" className="mt-2 py-2">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {modelFetchError}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* 手动输入区域 - 当使用 Combobox 时也显示一个可编辑的输入框 */}
              {matchedTemplate?.modelFetcher && (
                <Input
                  value={editingModel?.model_identifier || ''}
                  onChange={(e) => {
                    setEditingModel((prev) =>
                      prev ? { ...prev, model_identifier: e.target.value } : null
                    )
                    if (formErrors.model_identifier) {
                      setFormErrors((prev) => ({ ...prev, model_identifier: undefined }))
                    }
                  }}
                  placeholder="或手动输入模型标识符"
                  className={`mt-2 ${formErrors.model_identifier ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
              )}
              
              {!formErrors.model_identifier && (
                <p className="text-xs text-muted-foreground">
                  {modelFetchError 
                    ? '请手动输入模型标识符，或前往"模型提供商配置"检查 API Key'
                    : matchedTemplate?.modelFetcher 
                      ? `已识别为 ${matchedTemplate.display_name}，支持自动获取模型列表` 
                      : 'API 提供商提供的模型 ID'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price_in">输入价格 (¥/M token)</Label>
                <Input
                  id="price_in"
                  type="number"
                  step="0.1"
                  min="0"
                  value={editingModel?.price_in ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : parseFloat(e.target.value)
                    setEditingModel((prev) =>
                      prev
                        ? { ...prev, price_in: val }
                        : null
                    )
                  }}
                  placeholder="默认: 0"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="price_out">输出价格 (¥/M token)</Label>
                <Input
                  id="price_out"
                  type="number"
                  step="0.1"
                  min="0"
                  value={editingModel?.price_out ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : parseFloat(e.target.value)
                    setEditingModel((prev) =>
                      prev
                        ? { ...prev, price_out: val }
                        : null
                    )
                  }}
                  placeholder="默认: 0"
                />
              </div>
            </div>

            {/* 模型级别温度 */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable_model_temperature" className="cursor-pointer">自定义模型温度</Label>
                  <p className="text-xs text-muted-foreground">
                    启用后将覆盖「为模型分配功能」中的任务温度配置
                  </p>
                </div>
                <Switch
                  id="enable_model_temperature"
                  checked={editingModel?.temperature != null}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      // 启用时设置默认值 0.5
                      setEditingModel((prev) => prev ? { ...prev, temperature: 0.5 } : null)
                    } else {
                      // 禁用时清除温度
                      setEditingModel((prev) => prev ? { ...prev, temperature: null } : null)
                    }
                  }}
                />
              </div>
              
              {editingModel?.temperature != null && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">温度值</Label>
                    <span className="text-sm font-medium tabular-nums">{editingModel.temperature.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">0</span>
                    <Slider
                      value={[editingModel.temperature]}
                      onValueChange={(values) =>
                        setEditingModel((prev) =>
                          prev ? { ...prev, temperature: values[0] } : null
                        )
                      }
                      min={0}
                      max={1}
                      step={0.1}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground">1</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    较低的温度（0.1-0.3）产生更确定的输出，较高的温度（0.7-1.0）产生更多样化的输出
                  </p>
                </div>
              )}
            </div>

            {/* 模型级别最大 Token */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable_model_max_tokens" className="cursor-pointer">自定义最大 Token</Label>
                  <p className="text-xs text-muted-foreground">
                    启用后将覆盖「为模型分配功能」中的任务最大 Token 配置
                  </p>
                </div>
                <Switch
                  id="enable_model_max_tokens"
                  checked={editingModel?.max_tokens != null}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      // 启用时设置默认值 2048
                      setEditingModel((prev) => prev ? { ...prev, max_tokens: 2048 } : null)
                    } else {
                      // 禁用时清除
                      setEditingModel((prev) => prev ? { ...prev, max_tokens: null } : null)
                    }
                  }}
                />
              </div>
              
              {editingModel?.max_tokens != null && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">最大 Token 数</Label>
                    <Input
                      type="number"
                      min="1"
                      max="128000"
                      value={editingModel.max_tokens}
                      onChange={(e) => {
                        const val = parseInt(e.target.value)
                        if (!isNaN(val) && val >= 1) {
                          setEditingModel((prev) => prev ? { ...prev, max_tokens: val } : null)
                        }
                      }}
                      className="w-28 h-8 text-sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    限制模型单次输出的最大 token 数量，不同模型支持的上限不同
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="force_stream_mode"
                checked={editingModel?.force_stream_mode || false}
                onCheckedChange={(checked) =>
                  setEditingModel((prev) =>
                    prev ? { ...prev, force_stream_mode: checked } : null
                  )
                }
              />
              <Label htmlFor="force_stream_mode" className="cursor-pointer">
                强制流式输出模式
              </Label>
            </div>

            {/* 额外参数编辑器 */}
            <KeyValueEditor
              value={editingModel?.extra_params || {}}
              onChange={(params) =>
                setEditingModel((prev) =>
                  prev ? { ...prev, extra_params: params } : null
                )
              }
              placeholder="添加额外参数（如 enable_thinking、top_p 等）..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} data-tour="model-cancel-button">
              取消
            </Button>
            <Button onClick={handleSaveEdit} data-tour="model-save-button">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除模型 "{deletingIndex !== null ? models[deletingIndex]?.name : ''}" 吗？
              此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认对话框 */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 {selectedModels.size} 个模型吗？
              此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBatchDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              批量删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 重启遮罩层 */}
      {showRestartOverlay && (
        <RestartingOverlay 
          onRestartComplete={handleRestartComplete}
          onRestartFailed={handleRestartFailed}
        />
      )}
      </div>
    </ScrollArea>
  )
}
