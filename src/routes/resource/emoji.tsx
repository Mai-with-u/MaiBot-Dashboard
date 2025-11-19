import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Edit,
  Info,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Ban,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import type { Emoji, EmojiStats } from '@/types/emoji'
import {
  getEmojiList,
  getEmojiDetail,
  getEmojiStats,
  updateEmoji,
  deleteEmoji,
  registerEmoji,
  banEmoji,
  getEmojiThumbnailUrl,
} from '@/lib/emoji-api'

export function EmojiManagementPage() {
  const [emojiList, setEmojiList] = useState<Emoji[]>([])
  const [stats, setStats] = useState<EmojiStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [registeredFilter, setRegisteredFilter] = useState<string>('all')
  const [bannedFilter, setBannedFilter] = useState<string>('all')
  const [formatFilter, setFormatFilter] = useState<string>('all')
  const [selectedEmoji, setSelectedEmoji] = useState<Emoji | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { toast } = useToast()

  // 加载表情包列表
  const loadEmojiList = useCallback(async () => {
    try {
      setLoading(true)
      const response = await getEmojiList({
        page,
        page_size: pageSize,
        search: search || undefined,
        is_registered: registeredFilter === 'all' ? undefined : registeredFilter === 'registered',
        is_banned: bannedFilter === 'all' ? undefined : bannedFilter === 'banned',
        format: formatFilter === 'all' ? undefined : formatFilter,
        sort_by: 'usage_count',
        sort_order: 'desc',
      })
      setEmojiList(response.data)
      setTotal(response.total)
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载表情包列表失败'
      toast({
        title: '错误',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, registeredFilter, bannedFilter, formatFilter, toast])

  // 加载统计数据
  const loadStats = async () => {
    try {
      const response = await getEmojiStats()
      setStats(response.data)
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  }

  useEffect(() => {
    loadEmojiList()
  }, [loadEmojiList])

  useEffect(() => {
    loadStats()
  }, [])

  // 查看详情
  const handleViewDetail = async (emoji: Emoji) => {
    try {
      const response = await getEmojiDetail(emoji.id)
      setSelectedEmoji(response.data)
      setDetailDialogOpen(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载详情失败'
      toast({
        title: '错误',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // 编辑表情包
  const handleEdit = (emoji: Emoji) => {
    setSelectedEmoji(emoji)
    setEditDialogOpen(true)
  }

  // 删除表情包
  const handleDelete = (emoji: Emoji) => {
    setSelectedEmoji(emoji)
    setDeleteDialogOpen(true)
  }

  // 确认删除
  const confirmDelete = async () => {
    if (!selectedEmoji) return

    try {
      await deleteEmoji(selectedEmoji.id)
      toast({
        title: '成功',
        description: '表情包已删除',
      })
      setDeleteDialogOpen(false)
      setSelectedEmoji(null)
      loadEmojiList()
      loadStats()
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除失败'
      toast({
        title: '错误',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // 快速注册
  const handleRegister = async (emoji: Emoji) => {
    try {
      await registerEmoji(emoji.id)
      toast({
        title: '成功',
        description: '表情包已注册',
      })
      loadEmojiList()
      loadStats()
    } catch (error) {
      const message = error instanceof Error ? error.message : '注册失败'
      toast({
        title: '错误',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // 快速封禁
  const handleBan = async (emoji: Emoji) => {
    try {
      await banEmoji(emoji.id)
      toast({
        title: '成功',
        description: '表情包已封禁',
      })
      loadEmojiList()
      loadStats()
    } catch (error) {
      const message = error instanceof Error ? error.message : '封禁失败'
      toast({
        title: '错误',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // 获取格式选项
  const formatOptions = stats?.formats ? Object.keys(stats.formats) : []

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 sm:p-6">
      {/* 页面标题 */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">表情包管理</h1>
        <p className="text-sm text-muted-foreground mt-1">
          管理麦麦的表情包资源
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 sm:space-y-6 pr-4">

          {/* 统计卡片 */}
          {stats && (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>总数</CardDescription>
                  <CardTitle className="text-2xl">{stats.total}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>已注册</CardDescription>
                  <CardTitle className="text-2xl text-green-600">
                    {stats.registered}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>已封禁</CardDescription>
                  <CardTitle className="text-2xl text-red-600">
                    {stats.banned}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>未注册</CardDescription>
                  <CardTitle className="text-2xl text-gray-600">
                    {stats.unregistered}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* 搜索和筛选 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                搜索和筛选
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>搜索</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="描述或哈希值..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value)
                        setPage(1)
                      }}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>注册状态</Label>
                  <Select
                    value={registeredFilter}
                    onValueChange={(value) => {
                      setRegisteredFilter(value)
                      setPage(1)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="registered">已注册</SelectItem>
                      <SelectItem value="unregistered">未注册</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>封禁状态</Label>
                  <Select
                    value={bannedFilter}
                    onValueChange={(value) => {
                      setBannedFilter(value)
                      setPage(1)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="banned">已封禁</SelectItem>
                      <SelectItem value="unbanned">未封禁</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>格式</Label>
                  <Select
                    value={formatFilter}
                    onValueChange={(value) => {
                      setFormatFilter(value)
                      setPage(1)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      {formatOptions.map((format) => (
                        <SelectItem key={format} value={format}>
                          {format.toUpperCase()} ({stats?.formats[format]})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadEmojiList}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  刷新
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 表情包列表 */}
          <Card>
            <CardHeader>
              <CardTitle>表情包列表</CardTitle>
              <CardDescription>
                共 {total} 个表情包，当前第 {page} 页
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">预览</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>格式</TableHead>
                      <TableHead>情绪标签</TableHead>
                      <TableHead className="text-center">状态</TableHead>
                      <TableHead className="text-right">使用次数</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emojiList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          暂无数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      emojiList.map((emoji) => (
                        <TableRow key={emoji.id}>
                          <TableCell>
                            <div className="w-24 h-24 bg-muted rounded flex items-center justify-center overflow-hidden">
                              <img
                                src={getEmojiThumbnailUrl(emoji.id)}
                                alt={emoji.description || '表情包'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // 图片加载失败时显示默认图标
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  const parent = target.parentElement
                                  if (parent) {
                                    parent.innerHTML = '<svg class="h-6 w-6 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>'
                                  }
                                }}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{emoji.description || '无描述'}</div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {emoji.emoji_hash.slice(0, 16)}...
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{emoji.format.toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell>
                            <EmotionTags emotions={emoji.emotion} />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 justify-center">
                              {emoji.is_registered && (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  已注册
                                </Badge>
                              )}
                              {emoji.is_banned && (
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  已封禁
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {emoji.usage_count}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetail(emoji)}
                              >
                                <Info className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(emoji)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {!emoji.is_registered && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRegister(emoji)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                              {!emoji.is_banned && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleBan(emoji)}
                                  className="text-orange-600 hover:text-orange-700"
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(emoji)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 分页 */}
              {total > pageSize && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    显示 {(page - 1) * pageSize + 1} 到{' '}
                    {Math.min(page * pageSize, total)} 条，共 {total} 条
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      上一页
                    </Button>
                    <div className="text-sm">
                      第 {page} / {Math.ceil(total / pageSize)} 页
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= Math.ceil(total / pageSize)}
                    >
                      下一页
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 详情对话框 */}
          <EmojiDetailDialog
            emoji={selectedEmoji}
            open={detailDialogOpen}
            onOpenChange={setDetailDialogOpen}
          />

          {/* 编辑对话框 */}
          <EmojiEditDialog
            emoji={selectedEmoji}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onSuccess={() => {
              loadEmojiList()
              loadStats()
            }}
          />

        </div>
      </ScrollArea>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这个表情包吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 详情对话框组件
function EmojiDetailDialog({
  emoji,
  open,
  onOpenChange,
}: {
  emoji: Emoji | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!emoji) return null

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return '-'
    return new Date(timestamp * 1000).toLocaleString('zh-CN')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>表情包详情</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">ID</Label>
              <div className="mt-1 font-mono">{emoji.id}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">格式</Label>
              <div className="mt-1">
                <Badge variant="outline">{emoji.format.toUpperCase()}</Badge>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground">文件路径</Label>
            <div className="mt-1 font-mono text-sm break-all bg-muted p-2 rounded">
              {emoji.full_path}
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground">哈希值</Label>
            <div className="mt-1 font-mono text-sm break-all bg-muted p-2 rounded">
              {emoji.emoji_hash}
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground">描述</Label>
            <div className="mt-1">{emoji.description || '-'}</div>
          </div>

          <div>
            <Label className="text-muted-foreground">情绪标签</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {emoji.emotion && emoji.emotion.length > 0 ? (
                emoji.emotion.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">无</span>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">状态</Label>
              <div className="mt-2 flex gap-2">
                {emoji.is_registered && (
                  <Badge variant="default" className="bg-green-600">
                    已注册
                  </Badge>
                )}
                {emoji.is_banned && (
                  <Badge variant="destructive">已封禁</Badge>
                )}
                {!emoji.is_registered && !emoji.is_banned && (
                  <Badge variant="outline">未注册</Badge>
                )}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">使用次数</Label>
              <div className="mt-1 font-mono text-lg">{emoji.usage_count}</div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">记录时间</Label>
              <div className="mt-1 text-sm">{formatTime(emoji.record_time)}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">注册时间</Label>
              <div className="mt-1 text-sm">{formatTime(emoji.register_time)}</div>
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground">最后使用</Label>
            <div className="mt-1 text-sm">{formatTime(emoji.last_used_time)}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 编辑对话框组件
function EmojiEditDialog({
  emoji,
  open,
  onOpenChange,
  onSuccess,
}: {
  emoji: Emoji | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [description, setDescription] = useState('')
  const [emotionInput, setEmotionInput] = useState('')
  const [isRegistered, setIsRegistered] = useState(false)
  const [isBanned, setIsBanned] = useState(false)
  const [saving, setSaving] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    if (emoji) {
      setDescription(emoji.description || '')
      setEmotionInput(emoji.emotion ? emoji.emotion.join(', ') : '')
      setIsRegistered(emoji.is_registered)
      setIsBanned(emoji.is_banned)
    }
  }, [emoji])

  const handleSave = async () => {
    if (!emoji) return

    try {
      setSaving(true)
      const emotionArray = emotionInput
        .split(/[,,]/)
        .map((s) => s.trim())
        .filter(Boolean)

      await updateEmoji(emoji.id, {
        description: description || undefined,
        emotion: emotionArray.length > 0 ? emotionArray : undefined,
        is_registered: isRegistered,
        is_banned: isBanned,
      })

      toast({
        title: '成功',
        description: '表情包信息已更新',
      })
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败'
      toast({
        title: '错误',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (!emoji) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>编辑表情包</DialogTitle>
          <DialogDescription>修改表情包的描述和标签信息</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>描述</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入表情包描述..."
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label>情绪标签</Label>
            <Input
              value={emotionInput}
              onChange={(e) => setEmotionInput(e.target.value)}
              placeholder="使用逗号分隔多个标签，如：开心, 微笑, 快乐"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              输入多个标签时使用逗号分隔（支持中英文逗号）
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_registered"
                checked={isRegistered}
                onCheckedChange={(checked) => setIsRegistered(checked === true)}
              />
              <Label htmlFor="is_registered" className="cursor-pointer">
                已注册
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_banned"
                checked={isBanned}
                onCheckedChange={(checked) => setIsBanned(checked === true)}
              />
              <Label htmlFor="is_banned" className="cursor-pointer">
                已封禁
              </Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 情绪标签组件
function EmotionTags({ emotions }: { emotions: string[] | null | undefined }) {
  if (!emotions || emotions.length === 0) {
    return <span className="text-xs text-muted-foreground">-</span>
  }

  // 截断文本辅助函数
  const truncateText = (text: string, maxLength: number = 6) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  // 最多显示3个标签
  const displayEmotions = emotions.slice(0, 3)
  const remainingCount = emotions.length - 3

  return (
    <div className="flex flex-wrap gap-1">
      {displayEmotions.map((emotion, index) => (
        <Badge
          key={index}
          variant="secondary"
          className="text-xs"
          title={emotion} // 悬停显示完整文本
        >
          {truncateText(emotion)}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <Badge
          variant="outline"
          className="text-xs"
          title={`还有 ${remainingCount} 个标签: ${emotions.slice(3).join(', ')}`}
        >
          +{remainingCount}
        </Badge>
      )}
    </div>
  )
}
