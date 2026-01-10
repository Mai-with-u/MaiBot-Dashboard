import { useState, useCallback, useEffect, memo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import ReactFlow, {
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeTypes,
} from 'reactflow'
import 'reactflow/dist/style.css'
import dagre from 'dagre'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
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
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Search, 
  RefreshCw, 
  Info,
  Database,
  Network,
  FileText,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getKnowledgeGraph, getKnowledgeStats, searchKnowledgeNode, type KnowledgeNode, type KnowledgeEdge, type KnowledgeStats } from '@/lib/knowledge-api'
import { cn } from '@/lib/utils'

// 自定义节点组件 - 实体节点
const EntityNode = memo(({ data }: { data: { label: string; content: string } }) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-blue-700 min-w-[120px]">
      <Handle type="target" position={Position.Top} />
      <div className="font-semibold text-white text-sm truncate max-w-[200px]" title={data.content}>
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
})

EntityNode.displayName = 'EntityNode'

// 自定义节点组件 - 段落节点
const ParagraphNode = memo(({ data }: { data: { label: string; content: string } }) => {
  return (
    <div className="px-3 py-2 shadow-md rounded-md bg-gradient-to-br from-green-500 to-green-600 border-2 border-green-700 min-w-[100px]">
      <Handle type="target" position={Position.Top} />
      <div className="font-medium text-white text-xs truncate max-w-[150px]" title={data.content}>
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
})

ParagraphNode.displayName = 'ParagraphNode'

const nodeTypes: NodeTypes = {
  entity: EntityNode,
  paragraph: ParagraphNode,
}

// 使用 dagre 进行自动布局
function calculateLayout(nodes: KnowledgeNode[], edges: KnowledgeEdge[]): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: 'TB', ranksep: 100, nodesep: 80 })

  const flowNodes: Node[] = []
  const flowEdges: Edge[] = []

  // 设置节点到 dagre 图
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 150, height: 50 })
  })

  // 设置边到 dagre 图
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  // 执行布局计算
  dagre.layout(dagreGraph)

  // 获取布局后的节点位置
  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    flowNodes.push({
      id: node.id,
      type: node.type,
      position: {
        x: nodeWithPosition.x - 75,
        y: nodeWithPosition.y - 25,
      },
      data: {
        label: node.content.slice(0, 20) + (node.content.length > 20 ? '...' : ''),
        content: node.content,
      },
    })
  })

  // 创建边
  edges.forEach((edge, index) => {
    const flowEdge: Edge = {
      id: `edge-${index}`,
      source: edge.source,
      target: edge.target,
      // 节点数超过200时禁用动画提升性能
      animated: nodes.length <= 200 && edge.weight > 5,
      style: {
        strokeWidth: Math.min(edge.weight / 2, 5),
        opacity: 0.6,
      },
    }
    // 只在节点数少于100时显示边的标签
    if (edge.weight > 10 && nodes.length < 100) {
      flowEdge.label = `${edge.weight.toFixed(0)}`
    }
    flowEdges.push(flowEdge)
  })

  return { nodes: flowNodes, edges: flowEdges }
}

export function KnowledgeGraphPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<KnowledgeStats | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [nodeType, setNodeType] = useState<'all' | 'entity' | 'paragraph'>('all')
  const [nodeLimit, setNodeLimit] = useState(50)
  const [customLimit, setCustomLimit] = useState('50')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [showInitialConfirm, setShowInitialConfirm] = useState(true)
  const [userConfirmedLoad, setUserConfirmedLoad] = useState(false)  // 用户是否确认加载
  const [showHighNodeWarning, setShowHighNodeWarning] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [nodeCount, setNodeCount] = useState(0)
  const [selectedNodeData, setSelectedNodeData] = useState<KnowledgeNode | null>(null)
  const [selectedEdgeData, setSelectedEdgeData] = useState<{ source: KnowledgeNode; target: KnowledgeNode; edge: KnowledgeEdge } | null>(null)
  const { toast } = useToast()

  // 缓存 MiniMap 的 nodeColor 函数
  const miniMapNodeColor = useCallback((node: Node) => {
    if (node.type === 'entity') return '#6366f1'
    if (node.type === 'paragraph') return '#10b981'
    return '#6b7280'
  }, [])

  // 加载知识图谱数据
  const loadGraph = useCallback(async (skipWarning = false) => {
    try {
      // 检查是否需要警告用户
      if (!skipWarning && nodeLimit > 200) {
        setShowHighNodeWarning(true)
        return
      }

      setLoading(true)
      const [graphData, statsData] = await Promise.all([
        getKnowledgeGraph(nodeLimit, nodeType),
        getKnowledgeStats(),
      ])

      setStats(statsData)

      if (graphData.nodes.length === 0) {
        toast({
          title: '提示',
          description: '知识库为空，请先导入知识数据',
        })
        setNodes([])
        setEdges([])
        return
      }

      const { nodes: flowNodes, edges: flowEdges } = calculateLayout(graphData.nodes, graphData.edges)
      setNodes(flowNodes)
      setEdges(flowEdges)
      setNodeCount(flowNodes.length)

      if (statsData && statsData.total_nodes > nodeLimit) {
        toast({
          title: '提示',
          description: `知识图谱包含 ${statsData.total_nodes} 个节点，当前显示 ${flowNodes.length} 个`,
        })
      }
      
      toast({
        title: '加载成功',
        description: `已加载 ${flowNodes.length} 个节点，${flowEdges.length} 条边`,
      })
    } catch (error) {
      console.error('加载知识图谱失败:', error)
      toast({
        title: '加载失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeLimit, nodeType, toast])  // setNodes 和 setEdges 是稳定的,不需要包含

  // 搜索节点
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      toast({
        title: '提示',
        description: '请输入搜索关键词',
      })
      return
    }

    try {
      const results = await searchKnowledgeNode(searchQuery)
      if (results.length === 0) {
        toast({
          title: '未找到',
          description: '没有找到匹配的节点',
        })
        return
      }

      // 高亮搜索结果
      const resultIds = new Set(results.map(r => r.id))
      setNodes(nds =>
        nds.map(node => ({
          ...node,
          style: {
            ...node.style,
            opacity: resultIds.has(node.id) ? 1 : 0.3,
            filter: resultIds.has(node.id) ? 'brightness(1.2)' : 'brightness(0.8)',
          },
        }))
      )

      toast({
        title: '搜索完成',
        description: `找到 ${results.length} 个匹配节点`,
      })
    } catch (error) {
      console.error('搜索失败:', error)
      toast({
        title: '搜索失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, toast])  // setNodes 是稳定的

  // 重置高亮
  const handleResetHighlight = useCallback(() => {
    setNodes(nds =>
      nds.map(node => ({
        ...node,
        style: {
          ...node.style,
          opacity: 1,
          filter: 'brightness(1)',
        },
      }))
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // setNodes 是稳定的

  // 初始确认后加载
  const handleInitialConfirm = useCallback(() => {
    setShowInitialConfirm(false)
    setUserConfirmedLoad(true)  // 设置用户确认标记
    loadGraph()
  }, [loadGraph])

  // 高节点数确认后加载
  const handleHighNodeConfirm = useCallback(() => {
    setShowHighNodeWarning(false)  // 立即关闭高节点数警告对话框
    // 使用 setTimeout 确保对话框关闭后再开始加载
    setTimeout(() => {
      loadGraph(true)
    }, 0)
  }, [loadGraph])

  // 节点点击事件
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const nodeData = nodes.find(n => n.id === node.id)
    if (nodeData) {
      setSelectedNodeData({
        id: node.id,
        type: node.type as 'entity' | 'paragraph',
        content: node.data.content,
      })
    }
  }, [nodes])

  // 当节点数量或类型改变时自动刷新
  useEffect(() => {
    // 跳过初始确认对话框时的加载
    if (showInitialConfirm) return
    // 只有用户确认后才能自动刷新
    if (!userConfirmedLoad) return
    
    // 参数变化时加载,会根据节点数自动判断是否需要警告
    loadGraph()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeLimit, nodeType, showInitialConfirm, userConfirmedLoad])  // 不依赖 loadGraph

  // 边点击事件
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    const sourceNode = nodes.find(n => n.id === edge.source)
    const targetNode = nodes.find(n => n.id === edge.target)
    const edgeData = edges.find(e => e.id === edge.id)
    
    if (sourceNode && targetNode && edgeData) {
      setSelectedEdgeData({
        source: {
          id: sourceNode.id,
          type: sourceNode.type as 'entity' | 'paragraph',
          content: sourceNode.data.content,
        },
        target: {
          id: targetNode.id,
          type: targetNode.type as 'entity' | 'paragraph',
          content: targetNode.data.content,
        },
        edge: {
          source: edge.source,
          target: edge.target,
          weight: parseFloat(edge.label as string || '0'),
        },
      })
    }
  }, [nodes, edges])

  return (
    <div className="h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="flex-shrink-0 p-4 border-b bg-background">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">麦麦知识库图谱</h1>
            <p className="text-muted-foreground mt-1">可视化知识实体与关系网络</p>
          </div>

          {stats && (
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="gap-1">
                <Database className="h-3 w-3" />
                节点: {stats.total_nodes}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Network className="h-3 w-3" />
                边: {stats.total_edges}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Info className="h-3 w-3" />
                实体: {stats.entity_nodes}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <FileText className="h-3 w-3" />
                段落: {stats.paragraph_nodes}
              </Badge>
            </div>
          )}
        </div>

        {/* 搜索和控制栏 */}
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="搜索节点内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} size="sm">
              <Search className="h-4 w-4" />
            </Button>
            <Button onClick={handleResetHighlight} variant="outline" size="sm">
              重置
            </Button>
          </div>

          <div className="flex gap-2">
            <Select value={nodeType} onValueChange={(v) => setNodeType(v as 'all' | 'entity' | 'paragraph')}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部节点</SelectItem>
                <SelectItem value="entity">仅实体</SelectItem>
                <SelectItem value="paragraph">仅段落</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={
                nodeLimit === 10000 ? 'all' :
                showCustomInput ? 'custom' :
                nodeLimit.toString()
              } 
              onValueChange={(v) => {
                if (v === 'custom') {
                  setShowCustomInput(true)
                  setCustomLimit(nodeLimit.toString())
                } else if (v === 'all') {
                  setShowCustomInput(false)
                  setNodeLimit(10000)
                } else {
                  setShowCustomInput(false)
                  setNodeLimit(Number(v))
                }
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 节点</SelectItem>
                <SelectItem value="100">100 节点</SelectItem>
                <SelectItem value="200">200 节点</SelectItem>
                <SelectItem value="500">500 节点</SelectItem>
                <SelectItem value="1000">1000 节点</SelectItem>
                <SelectItem value="all">全部 (最多10000)</SelectItem>
                <SelectItem value="custom">自定义...</SelectItem>
              </SelectContent>
            </Select>

            {showCustomInput && (
              <Input
                type="number"
                min="50"
                value={customLimit}
                onChange={(e) => setCustomLimit(e.target.value)}
                onBlur={() => {
                  const num = parseInt(customLimit)
                  if (!isNaN(num) && num >= 50) {
                    setNodeLimit(num)
                  } else {
                    setCustomLimit('50')
                    setNodeLimit(50)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const num = parseInt(customLimit)
                    if (!isNaN(num) && num >= 50) {
                      setNodeLimit(num)
                    } else {
                      setCustomLimit('50')
                      setNodeLimit(50)
                    }
                  }
                }}
                placeholder="最少50个"
                className="w-[120px]"
              />
            )}

            <Button onClick={() => loadGraph()} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">加载知识图谱中...</p>
            </div>
          </div>
        ) : nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">知识库为空</h3>
              <p className="text-muted-foreground">请先导入知识数据</p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.05}
            maxZoom={1.5}
            defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
            elevateNodesOnSelect={nodeCount <= 500}
            nodesDraggable={nodeCount <= 1000}
            attributionPosition="bottom-left"
          >
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            <Controls />
            {/* 节点数超过500时禁用MiniMap提升性能 */}
            {nodeCount <= 500 && (
              <MiniMap
                nodeColor={miniMapNodeColor}
                nodeBorderRadius={8}
                pannable
                zoomable
              />
            )}

            {/* 图例 */}
            <Panel position="top-right" className="bg-background/95 backdrop-blur-sm rounded-lg border p-3 shadow-lg">
              <div className="text-sm font-semibold mb-2">图例</div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-blue-700" />
                  <span>实体节点</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-green-500 to-green-600 border-2 border-green-700" />
                  <span>段落节点</span>
                </div>
                {nodeCount > 200 && (
                  <div className="mt-2 pt-2 border-t text-yellow-600 dark:text-yellow-500">
                    <div className="font-semibold">性能模式</div>
                    <div>已禁用动画</div>
                    {nodeCount > 500 && <div>已禁用缩略图</div>}
                  </div>
                )}
              </div>
            </Panel>
          </ReactFlow>
        )}
      </div>

      {/* 节点详情对话框 */}
      <Dialog open={!!selectedNodeData} onOpenChange={(open) => !open && setSelectedNodeData(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>节点详情</DialogTitle>
          </DialogHeader>
          {selectedNodeData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">类型</label>
                  <div className="mt-1">
                    <Badge variant={selectedNodeData.type === 'entity' ? 'default' : 'secondary'}>
                      {selectedNodeData.type === 'entity' ? '🏷️ 实体' : '📄 段落'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">ID</label>
                <code className="mt-1 block p-2 bg-muted rounded text-xs break-all">
                  {selectedNodeData.id}
                </code>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">内容</label>
                <ScrollArea className="mt-1 max-h-[400px] p-3 bg-muted rounded border">
                  <p className="text-sm whitespace-pre-wrap">{selectedNodeData.content}</p>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 边详情对话框 */}
      <Dialog open={!!selectedEdgeData} onOpenChange={(open) => !open && setSelectedEdgeData(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>边详情</DialogTitle>
          </DialogHeader>
          {selectedEdgeData && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0 p-3 bg-blue-50 dark:bg-blue-950 rounded border-2 border-blue-200 dark:border-blue-800">
                    <div className="text-xs text-muted-foreground mb-1">源节点</div>
                    <div className="font-medium text-sm mb-2 truncate">{selectedEdgeData.source.content}</div>
                    <code className="text-xs text-muted-foreground truncate block">
                      {selectedEdgeData.source.id.slice(0, 40)}...
                    </code>
                  </div>

                  <div className="text-2xl text-muted-foreground flex-shrink-0">→</div>

                  <div className="flex-1 min-w-0 p-3 bg-green-50 dark:bg-green-950 rounded border-2 border-green-200 dark:border-green-800">
                    <div className="text-xs text-muted-foreground mb-1">目标节点</div>
                    <div className="font-medium text-sm mb-2 truncate">{selectedEdgeData.target.content}</div>
                    <code className="text-xs text-muted-foreground truncate block">
                      {selectedEdgeData.target.id.slice(0, 40)}...
                    </code>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">权重</label>
                  <div className="mt-1">
                    <Badge variant="outline" className="text-base font-mono">
                      {selectedEdgeData.edge.weight.toFixed(4)}
                    </Badge>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* 初始加载确认对话框 */}
      <AlertDialog open={showInitialConfirm} onOpenChange={setShowInitialConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>加载知识图谱</AlertDialogTitle>
            <AlertDialogDescription>
              知识图谱的动态展示会消耗较多系统资源。
              <br />
              确定要加载知识图谱吗?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => navigate({ to: '/' })}>
              取消 (返回首页)
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleInitialConfirm}>
              确认加载
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 高节点数警告对话框 */}
      <AlertDialog open={showHighNodeWarning} onOpenChange={setShowHighNodeWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ 节点数量较多</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  您正在尝试加载 <strong className="text-orange-600">{nodeLimit >= 10000 ? '全部 (最多10000个)' : nodeLimit}</strong> 个节点。
                </p>
                <p className="mt-4">节点数量过多可能导致:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>页面加载时间较长</li>
                  <li>浏览器卡顿或崩溃</li>
                  <li>系统资源占用过高</li>
                </ul>
                <p className="mt-4">建议先选择较少的节点数量 (50-200 个)。</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowHighNodeWarning(false)
              // 将节点数重置为安全值
              if (nodeLimit > 200) {
                setNodeLimit(50)
                setShowCustomInput(false)
              }
            }}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleHighNodeConfirm} className="bg-orange-600 hover:bg-orange-700">
              我了解风险，继续加载
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
