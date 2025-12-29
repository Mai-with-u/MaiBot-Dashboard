/**
 * 表达方式审核器弹窗组件
 * 
 * 功能：
 * 1. 分页显示待审核/已通过/已拒绝的表达方式
 * 2. 支持单条通过/拒绝
 * 3. 支持批量操作
 * 4. 冲突检测（防止与AI自动检查冲突）
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination'
import { useToast } from '@/hooks/use-toast'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Bot,
  User,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getReviewStats,
  getReviewList,
  batchReviewExpressions,
  getChatList,
} from '@/lib/expression-api'
import type { Expression, ReviewStats, ChatInfo, BatchReviewItem } from '@/types/expression'

interface ExpressionReviewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExpressionReviewer({ open, onOpenChange }: ExpressionReviewerProps) {
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [expressions, setExpressions] = useState<Expression[]>([])
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [jumpPage, setJumpPage] = useState('')
  const [filterType, setFilterType] = useState<'unchecked' | 'passed' | 'rejected' | 'all'>('unchecked')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set())
  const [chatNameMap, setChatNameMap] = useState<Map<string, string>>(new Map())
  const { toast } = useToast()

  // 加载统计数据
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true)
      const data = await getReviewStats()
      setStats(data)
    } catch (error) {
      console.error('加载统计失败:', error)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // 加载列表
  const loadList = useCallback(async () => {
    try {
      setLoading(true)
      const response = await getReviewList({
        page,
        page_size: pageSize,
        filter_type: filterType,
        search: search || undefined,
      })
      setExpressions(response.data)
      setTotal(response.total)
    } catch (error) {
      toast({
        title: '加载失败',
        description: error instanceof Error ? error.message : '无法加载列表',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filterType, search, toast])

  // 加载聊天名称映射
  const loadChatNames = useCallback(async () => {
    try {
      const response = await getChatList()
      if (response?.data) {
        const nameMap = new Map<string, string>()
        response.data.forEach((chat: ChatInfo) => {
          nameMap.set(chat.chat_id, chat.chat_name)
        })
        setChatNameMap(nameMap)
      }
    } catch (error) {
      console.error('加载聊天名称失败:', error)
    }
  }, [])

  // 初始加载
  useEffect(() => {
    if (open) {
      loadStats()
      loadList()
      loadChatNames()
    }
  }, [open, loadStats, loadList, loadChatNames])

  // 切换筛选时重置页码
  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [filterType, search])

  // 搜索处理
  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  // 获取聊天名称
  const getChatName = (chatId: string): string => {
    return chatNameMap.get(chatId) || chatId
  }

  // 单条审核
  const handleReview = async (id: number, rejected: boolean) => {
    try {
      setProcessingIds((prev) => new Set(prev).add(id))
      
      const response = await batchReviewExpressions([
        { id, rejected, require_unchecked: filterType === 'unchecked' }
      ])
      
      if (response.results[0]?.success) {
        toast({
          title: rejected ? '已拒绝' : '已通过',
          description: `表达方式 #${id} ${rejected ? '已拒绝' : '已通过'}`,
        })
        // 刷新列表和统计
        loadList()
        loadStats()
      } else {
        toast({
          title: '操作失败',
          description: response.results[0]?.message || '未知错误',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '操作失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      })
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  // 批量审核
  const handleBatchReview = async (rejected: boolean) => {
    if (selectedIds.size === 0) {
      toast({
        title: '请选择',
        description: '请先选择要审核的表达方式',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      
      const items: BatchReviewItem[] = Array.from(selectedIds).map((id) => ({
        id,
        rejected,
        require_unchecked: filterType === 'unchecked',
      }))
      
      const response = await batchReviewExpressions(items)
      
      toast({
        title: '批量审核完成',
        description: `成功 ${response.succeeded} 条，失败 ${response.failed} 条`,
        variant: response.failed > 0 ? 'destructive' : 'default',
      })
      
      // 清空选择并刷新
      setSelectedIds(new Set())
      loadList()
      loadStats()
    } catch (error) {
      toast({
        title: '批量审核失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedIds.size === expressions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(expressions.map((e) => e.id)))
    }
  }

  // 切换选择
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 格式化时间
  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return '-'
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 获取状态标签
  const getStatusBadge = (expr: Expression) => {
    if (!expr.checked) {
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          待审核
        </Badge>
      )
    }
    if (expr.rejected) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          已拒绝
        </Badge>
      )
    }
    return (
      <Badge variant="default" className="gap-1 bg-green-600">
        <CheckCircle2 className="h-3 w-3" />
        已通过
      </Badge>
    )
  }

  // 获取修改者标签
  const getModifierBadge = (modifier: string | null) => {
    if (!modifier) return null
    if (modifier === 'ai') {
      return (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Bot className="h-3 w-3" />
          AI
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <User className="h-3 w-3" />
        人工
      </Badge>
    )
  }

  const totalPages = Math.ceil(total / pageSize)

  // 生成页码数组
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    if (totalPages <= 7) {
      // 总页数不多，全部显示
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // 总是显示第一页
      pages.push(1)
      
      if (page > 3) {
        pages.push('ellipsis')
      }
      
      // 当前页附近的页码
      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (page < totalPages - 2) {
        pages.push('ellipsis')
      }
      
      // 总是显示最后一页
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }
    return pages
  }

  // 处理页码跳转
  const handleJumpPage = () => {
    const targetPage = parseInt(jumpPage, 10)
    if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages) {
      setPage(targetPage)
      setJumpPage('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] sm:w-full h-[90vh] sm:h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-lg sm:text-xl">表达方式审核</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            审核麦麦学习到的表达方式。通过审核的项目才会被使用（可在配置中调整），被拒绝的项目永远不会被使用。
          </DialogDescription>
          
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4">
            <div className="rounded-lg border p-2 sm:p-3 text-center">
              <div className="text-xl sm:text-2xl font-bold text-orange-500">
                {statsLoading ? '-' : stats?.unchecked ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">待审核</div>
            </div>
            <div className="rounded-lg border p-2 sm:p-3 text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-500">
                {statsLoading ? '-' : stats?.passed ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">已通过</div>
            </div>
            <div className="rounded-lg border p-2 sm:p-3 text-center">
              <div className="text-xl sm:text-2xl font-bold text-red-500">
                {statsLoading ? '-' : stats?.rejected ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">已拒绝</div>
            </div>
            <div className="rounded-lg border p-2 sm:p-3 text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-500">
                {statsLoading ? '-' : stats?.total ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">总计</div>
            </div>
          </div>
        </DialogHeader>

        {/* 筛选和操作栏 */}
        <div className="px-4 sm:px-6 py-3 border-b shrink-0 space-y-3">
          <Tabs
            value={filterType}
            onValueChange={(v) => setFilterType(v as typeof filterType)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="unchecked" className="gap-1 text-xs sm:text-sm px-1 sm:px-3">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">待审核</span>
                <span className="sm:hidden">待审</span>
                <span className="hidden sm:inline">({stats?.unchecked ?? 0})</span>
              </TabsTrigger>
              <TabsTrigger value="passed" className="gap-1 text-xs sm:text-sm px-1 sm:px-3">
                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">已通过</span>
                <span className="sm:hidden">通过</span>
                <span className="hidden sm:inline">({stats?.passed ?? 0})</span>
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-1 text-xs sm:text-sm px-1 sm:px-3">
                <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">已拒绝</span>
                <span className="sm:hidden">拒绝</span>
                <span className="hidden sm:inline">({stats?.rejected ?? 0})</span>
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-1 text-xs sm:text-sm px-1 sm:px-3">
                <span>全部</span>
                <span className="hidden sm:inline">({stats?.total ?? 0})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索情景或风格..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  loadList()
                  loadStats()
                }}
                disabled={loading}
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            </div>
            
            {/* 批量操作按钮 */}
            {filterType === 'unchecked' && selectedIds.size > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="default"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                  onClick={() => handleBatchReview(false)}
                  disabled={loading}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">批量通过</span>
                  <span className="sm:hidden">通过</span>
                  ({selectedIds.size})
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => handleBatchReview(true)}
                  disabled={loading}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">批量拒绝</span>
                  <span className="sm:hidden">拒绝</span>
                  ({selectedIds.size})
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 列表区域 */}
        <ScrollArea className="flex-1 px-4 sm:px-6">
          {loading && expressions.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : expressions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>没有找到表达方式</p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {/* 全选 */}
              {filterType === 'unchecked' && expressions.length > 0 && (
                <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/50">
                  <Checkbox
                    checked={selectedIds.size === expressions.length && expressions.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    全选当前页 ({expressions.length} 条)
                  </span>
                </div>
              )}

              {/* 表达方式列表 */}
              {expressions.map((expr) => (
                <div
                  key={expr.id}
                  className={cn(
                    'rounded-lg border p-3 sm:p-4 space-y-2 sm:space-y-3 transition-colors',
                    selectedIds.has(expr.id) && 'bg-accent border-primary',
                    processingIds.has(expr.id) && 'opacity-50'
                  )}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    {/* 选择框（仅待审核显示） */}
                    {filterType === 'unchecked' && (
                      <Checkbox
                        checked={selectedIds.has(expr.id)}
                        onCheckedChange={() => toggleSelect(expr.id)}
                        disabled={processingIds.has(expr.id)}
                        className="mt-1"
                      />
                    )}

                    {/* 内容 */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* 情景 */}
                      <div>
                        <span className="text-xs text-muted-foreground">情景：</span>
                        <p className="text-sm font-medium break-words">{expr.situation}</p>
                      </div>
                      
                      {/* 风格 */}
                      <div>
                        <span className="text-xs text-muted-foreground">风格：</span>
                        <p className="text-sm text-muted-foreground break-words">{expr.style}</p>
                      </div>

                      {/* 元信息 */}
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                        <span>#{expr.id}</span>
                        <span>·</span>
                        <span title={getChatName(expr.chat_id)} className="truncate max-w-24 sm:max-w-32">
                          {getChatName(expr.chat_id)}
                        </span>
                        <span>·</span>
                        <span>{formatTime(expr.create_date)}</span>
                        <div className="flex items-center gap-1">
                          {getStatusBadge(expr)}
                          {getModifierBadge(expr.modified_by)}
                        </div>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex flex-col gap-1 sm:gap-2 shrink-0">
                      {filterType === 'unchecked' ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 sm:h-9 px-2 sm:px-3"
                            onClick={() => handleReview(expr.id, false)}
                            disabled={processingIds.has(expr.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">通过</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 sm:h-9 px-2 sm:px-3"
                            onClick={() => handleReview(expr.id, true)}
                            disabled={processingIds.has(expr.id)}
                          >
                            <XCircle className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">拒绝</span>
                          </Button>
                        </>
                      ) : filterType === 'passed' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 sm:h-9 px-2 sm:px-3"
                          onClick={() => handleReview(expr.id, true)}
                          disabled={processingIds.has(expr.id)}
                        >
                          <XCircle className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">改为拒绝</span>
                        </Button>
                      ) : filterType === 'rejected' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 sm:h-9 px-2 sm:px-3"
                          onClick={() => handleReview(expr.id, false)}
                          disabled={processingIds.has(expr.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">改为通过</span>
                        </Button>
                      ) : (
                        // all 模式下显示两个按钮
                        <>
                          {expr.rejected ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 sm:h-9 px-2 sm:px-3"
                              onClick={() => handleReview(expr.id, false)}
                              disabled={processingIds.has(expr.id)}
                            >
                              <CheckCircle2 className="h-4 w-4 sm:mr-1" />
                              <span className="hidden sm:inline">改为通过</span>
                            </Button>
                          ) : expr.checked ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 sm:h-9 px-2 sm:px-3"
                              onClick={() => handleReview(expr.id, true)}
                              disabled={processingIds.has(expr.id)}
                            >
                              <XCircle className="h-4 w-4 sm:mr-1" />
                              <span className="hidden sm:inline">改为拒绝</span>
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 sm:h-9 px-2 sm:px-3"
                                onClick={() => handleReview(expr.id, false)}
                                disabled={processingIds.has(expr.id)}
                              >
                                <CheckCircle2 className="h-4 w-4 sm:mr-1" />
                                <span className="hidden sm:inline">通过</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 sm:h-9 px-2 sm:px-3"
                                onClick={() => handleReview(expr.id, true)}
                                disabled={processingIds.has(expr.id)}
                              >
                                <XCircle className="h-4 w-4 sm:mr-1" />
                                <span className="hidden sm:inline">拒绝</span>
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* 分页 */}
        <div className="px-4 sm:px-6 py-3 border-t shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* 左侧：每页显示数量 */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden sm:inline">每页</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(v) => {
                setPageSize(parseInt(v, 10))
                setPage(1) // 切换每页数量时重置到第一页
              }}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="hidden sm:inline">条</span>
            <span className="text-muted-foreground">共 {total} 条</span>
          </div>

          {/* 中间：页码导航 */}
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </PaginationItem>
              
              {getPageNumbers().map((pageNum, idx) => (
                <PaginationItem key={idx}>
                  {pageNum === 'ellipsis' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      href="#"
                      isActive={pageNum === page}
                      onClick={(e) => {
                        e.preventDefault()
                        setPage(pageNum)
                      }}
                      className="h-8 w-8 cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>

          {/* 右侧：跳转 */}
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">跳至</span>
            <Input
              type="number"
              min={1}
              max={totalPages}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJumpPage()}
              className="w-16 h-8 text-center"
              placeholder={page.toString()}
            />
            <span className="text-muted-foreground">页</span>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleJumpPage}
              disabled={loading}
            >
              跳转
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
