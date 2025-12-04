import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Trash2, Eye, FileSearch } from 'lucide-react'
import type {
  KeywordReactionConfig,
  KeywordRule,
  ResponsePostProcessConfig,
  ChineseTypoConfig,
  ResponseSplitterConfig,
} from '../types'

interface ProcessingSectionProps {
  keywordReactionConfig: KeywordReactionConfig
  responsePostProcessConfig: ResponsePostProcessConfig
  chineseTypoConfig: ChineseTypoConfig
  responseSplitterConfig: ResponseSplitterConfig
  onKeywordReactionChange: (config: KeywordReactionConfig) => void
  onResponsePostProcessChange: (config: ResponsePostProcessConfig) => void
  onChineseTypoChange: (config: ChineseTypoConfig) => void
  onResponseSplitterChange: (config: ResponseSplitterConfig) => void
}

// 正则表达式编辑器（构建器+测试器合并）
function RegexEditor({ 
  regex, 
  reaction,
  onRegexChange,
  onReactionChange,
}: { 
  regex: string
  reaction: string
  onRegexChange: (value: string) => void
  onReactionChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [testText, setTestText] = useState('')
  const [matches, setMatches] = useState<RegExpMatchArray | null>(null)
  const [error, setError] = useState<string>('')
  const [captureGroups, setCaptureGroups] = useState<Record<string, string>>({})
  const [replacedReaction, setReplacedReaction] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<'build' | 'test'>('build')

  // 将 Python 风格的命名捕获组转换为 JavaScript 风格
  const convertPythonRegexToJS = (pythonRegex: string): string => {
    return pythonRegex.replace(/\(\?P<([^>]+)>/g, '(?<$1>')
  }

  // 插入文本到光标位置
  const insertAtCursor = (text: string, moveCursor: number = 0) => {
    const input = inputRef.current
    if (!input) return

    const start = input.selectionStart || 0
    const end = input.selectionEnd || 0
    const newValue = regex.substring(0, start) + text + regex.substring(end)
    
    onRegexChange(newValue)
    
    setTimeout(() => {
      const newPosition = start + text.length + moveCursor
      input.setSelectionRange(newPosition, newPosition)
      input.focus()
    }, 0)
  }

  // 测试正则表达式
  useEffect(() => {
    if (!regex || !testText) {
      setMatches(null)
      setCaptureGroups({})
      setReplacedReaction(reaction)
      setError('')
      return
    }

    try {
      const jsRegex = convertPythonRegexToJS(regex)
      const regexObj = new RegExp(jsRegex, 'g')
      const matchResult = testText.match(regexObj)
      setMatches(matchResult)
      setError('')

      const execRegex = new RegExp(jsRegex)
      const execResult = execRegex.exec(testText)
      
      if (execResult && execResult.groups) {
        setCaptureGroups(execResult.groups)
        
        let replaced = reaction
        Object.entries(execResult.groups).forEach(([key, value]) => {
          replaced = replaced.replace(new RegExp(`\\[${key}\\]`, 'g'), value || '')
        })
        setReplacedReaction(replaced)
      } else {
        setCaptureGroups({})
        setReplacedReaction(reaction)
      }
    } catch (err) {
      setError((err as Error).message)
      setMatches(null)
      setCaptureGroups({})
      setReplacedReaction(reaction)
    }
  }, [regex, testText, reaction])

  // 高亮显示匹配的文本
  const renderHighlightedText = () => {
    if (!testText || !matches || matches.length === 0) {
      return <span className="text-muted-foreground">{testText || '请输入测试文本'}</span>
    }

    try {
      const jsRegex = convertPythonRegexToJS(regex)
      const regexObj = new RegExp(jsRegex, 'g')
      let lastIndex = 0
      const parts: React.ReactElement[] = []
      let match: RegExpExecArray | null

      while ((match = regexObj.exec(testText)) !== null) {
        if (match.index > lastIndex) {
          parts.push(
            <span key={`text-${lastIndex}`}>
              {testText.substring(lastIndex, match.index)}
            </span>
          )
        }

        parts.push(
          <span key={`match-${match.index}`} className="bg-yellow-200 dark:bg-yellow-900 font-semibold">
            {match[0]}
          </span>
        )

        lastIndex = match.index + match[0].length
      }

      if (lastIndex < testText.length) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {testText.substring(lastIndex)}
          </span>
        )
      }

      return <>{parts}</>
    } catch {
      return <span>{testText}</span>
    }
  }

  // 常用正则模式
  const patterns = [
    {
      category: '基础匹配',
      items: [
        { label: '任意字符', pattern: '.', desc: '匹配除换行符外的任意字符' },
        { label: '数字', pattern: '\\d', desc: '匹配 0-9' },
        { label: '非数字', pattern: '\\D', desc: '匹配非数字字符' },
        { label: '字母数字', pattern: '\\w', desc: '匹配字母、数字、下划线' },
        { label: '非字母数字', pattern: '\\W', desc: '匹配非字母数字字符' },
        { label: '空白符', pattern: '\\s', desc: '匹配空格、制表符等' },
        { label: '非空白符', pattern: '\\S', desc: '匹配非空白字符' },
      ],
    },
    {
      category: '位置锚点',
      items: [
        { label: '行首', pattern: '^', desc: '匹配行的开始' },
        { label: '行尾', pattern: '$', desc: '匹配行的结束' },
        { label: '单词边界', pattern: '\\b', desc: '匹配单词边界' },
      ],
    },
    {
      category: '重复次数',
      items: [
        { label: '0或多次', pattern: '*', desc: '匹配前面的元素0次或多次' },
        { label: '1或多次', pattern: '+', desc: '匹配前面的元素1次或多次' },
        { label: '0或1次', pattern: '?', desc: '匹配前面的元素0次或1次' },
        { label: '指定次数', pattern: '{n}', desc: '匹配n次，将n替换为数字' },
        { label: '次数范围', pattern: '{m,n}', desc: '匹配m到n次' },
      ],
    },
    {
      category: '分组和捕获',
      items: [
        { label: '普通分组', pattern: '()', desc: '分组但不捕获', moveCursor: -1 },
        { label: '命名捕获', pattern: '(?P<name>)', desc: 'Python风格命名捕获组', moveCursor: -1 },
        { label: '非捕获组', pattern: '(?:)', desc: '分组但不保存匹配结果', moveCursor: -1 },
      ],
    },
    {
      category: '字符类',
      items: [
        { label: '字符集', pattern: '[]', desc: '匹配括号内的任意字符', moveCursor: -1 },
        { label: '排除字符', pattern: '[^]', desc: '匹配不在括号内的字符', moveCursor: -1 },
        { label: '范围', pattern: '[a-z]', desc: '匹配a到z的字符' },
        { label: '中文字符', pattern: '[\\u4e00-\\u9fa5]', desc: '匹配中文汉字' },
      ],
    },
    {
      category: '常用模板',
      items: [
        { label: '捕获词语', pattern: '(?P<word>\\S+)', desc: '捕获一个词语' },
        { label: '捕获句子', pattern: '(?P<sentence>.+)', desc: '捕获整个句子' },
        { label: '捕获数字', pattern: '(?P<num>\\d+)', desc: '捕获一个或多个数字' },
        { label: '可选词语', pattern: '(?:词语1|词语2)', desc: '匹配多个可选项之一' },
      ],
    },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileSearch className="h-4 w-4 mr-1" />
          正则编辑器
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>正则表达式编辑器</DialogTitle>
          <DialogDescription className="text-sm">
            使用可视化工具构建正则表达式，并实时测试效果
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'build' | 'test')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="build">🔧 构建器</TabsTrigger>
              <TabsTrigger value="test">🧪 测试器</TabsTrigger>
            </TabsList>

          {/* 构建器标签页 */}
          <TabsContent value="build" className="space-y-4 mt-4">
            {/* 正则表达式编辑 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">正则表达式</Label>
              <Input
                ref={inputRef}
                value={regex}
                onChange={(e) => onRegexChange(e.target.value)}
                className="font-mono text-sm"
                placeholder="点击下方按钮构建正则表达式..."
              />
            </div>

            {/* Reaction 编辑 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Reaction 内容</Label>
              <Textarea
                value={reaction}
                onChange={(e) => onReactionChange(e.target.value)}
                placeholder="使用 [捕获组名] 引用捕获的内容..."
                rows={3}
                className="text-sm"
              />
            </div>

            {/* 快捷按钮 */}
            <div className="space-y-4 border-t pt-4">
              {patterns.map((category) => (
                <div key={category.category} className="space-y-2">
                  <h5 className="text-xs font-semibold text-primary">{category.category}</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {category.items.map((item) => (
                      <Button
                        key={item.label}
                        variant="outline"
                        size="sm"
                        className="justify-start h-auto py-2 px-3"
                        onClick={() => insertAtCursor(item.pattern, item.moveCursor || 0)}
                      >
                        <div className="flex flex-col items-start w-full">
                          <div className="flex items-center gap-2 w-full">
                            <span className="text-xs font-medium">{item.label}</span>
                            <code className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                              {item.pattern}
                            </code>
                          </div>
                          <span className="text-xs text-muted-foreground mt-0.5">
                            {item.desc}
                          </span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}

              {/* 完整示例 */}
              <div className="space-y-2 border-t pt-4">
                <h5 className="text-xs font-semibold text-primary">完整示例模板</h5>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start h-auto py-2 px-3"
                    onClick={() => onRegexChange('^(?P<n>\\S{1,20})是这样的$')}
                  >
                    <div className="flex flex-col items-start w-full">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded w-full overflow-x-auto">
                        ^(?P&lt;n&gt;\S{'{1,20}'})是这样的$
                      </code>
                      <span className="text-xs text-muted-foreground mt-1">
                        匹配「某事物是这样的」并捕获事物名称
                      </span>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start h-auto py-2 px-3"
                    onClick={() => onRegexChange('(?:[^，。.\\s]+，\\s*)?我(?:也)?[没沒]要求你\\s*(?P<action>.+?)[.。,，]?$')}
                  >
                    <div className="flex flex-col items-start w-full">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded w-full overflow-x-auto">
                        (?:[^，。.\s]+，\s*)?我(?:也)?[没沒]要求你\s*(?P&lt;action&gt;.+?)[.。,，]?$
                      </code>
                      <span className="text-xs text-muted-foreground mt-1">
                        匹配「我没要求你做某事」并捕获具体行为
                      </span>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start h-auto py-2 px-3"
                    onClick={() => onRegexChange('(?P<subject>.+?)(?:是|为什么|怎么)')}
                  >
                    <div className="flex flex-col items-start w-full">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded w-full overflow-x-auto">
                        (?P&lt;subject&gt;.+?)(?:是|为什么|怎么)
                      </code>
                      <span className="text-xs text-muted-foreground mt-1">
                        捕获问题主题词
                      </span>
                    </div>
                  </Button>
                </div>
              </div>
            </div>

            {/* 帮助信息 */}
            <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 space-y-1">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-100">💡 使用提示</p>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li>点击输入框设置光标位置，然后点击按钮插入模式</li>
                <li>命名捕获组格式：<code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">(?P&lt;名称&gt;模式)</code></li>
                <li>在 reaction 中使用 <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">[名称]</code> 引用捕获的内容</li>
                <li>切换到测试器标签页验证正则表达式效果</li>
              </ul>
            </div>
          </TabsContent>

          {/* 测试器标签页 */}
          <TabsContent value="test" className="space-y-4 mt-4">
            {/* 当前正则显示 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">当前正则表达式</Label>
              <div className="rounded-md bg-muted p-3 font-mono text-xs break-all">
                {regex || '(未设置)'}
              </div>
            </div>

            {/* 测试文本输入 */}
            <div className="space-y-2">
              <Label htmlFor="test-text" className="text-sm font-medium">测试文本</Label>
              <Textarea
                id="test-text"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="在此输入要测试的文本...&#10;例如：打游戏是这样的"
                className="min-h-[100px] text-sm"
              />
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm text-destructive font-medium">正则表达式错误</p>
                <p className="text-xs text-destructive/80 mt-1">{error}</p>
              </div>
            )}

            {/* 匹配结果 */}
            {!error && testText && (
              <div className="space-y-3">
                {/* 匹配状态 */}
                <div className="flex items-center gap-2">
                  {matches && matches.length > 0 ? (
                    <>
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        匹配成功 ({matches.length} 处)
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                      <span className="text-sm font-medium text-muted-foreground">
                        无匹配
                      </span>
                    </>
                  )}
                </div>

                {/* 高亮显示 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">匹配高亮</Label>
                  <ScrollArea className="h-40 rounded-md bg-muted p-3">
                    <div className="text-sm break-words">
                      {renderHighlightedText()}
                    </div>
                  </ScrollArea>
                </div>

                {/* 捕获组 */}
                {Object.keys(captureGroups).length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">命名捕获组</Label>
                    <ScrollArea className="h-32 rounded-md border p-3">
                      <div className="space-y-2">
                        {Object.entries(captureGroups).map(([name, value]) => (
                          <div key={name} className="flex items-start gap-2 text-sm">
                            <span className="font-mono font-semibold text-primary min-w-[80px]">[{name}]</span>
                            <span className="text-muted-foreground">=</span>
                            <span className="font-mono bg-muted px-2 py-0.5 rounded">{value}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* 替换预览 */}
                {Object.keys(captureGroups).length > 0 && reaction && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Reaction 替换预览</Label>
                    <ScrollArea className="h-48 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                      <div className="text-sm break-words">
                        {replacedReaction}
                      </div>
                    </ScrollArea>
                    <p className="text-xs text-muted-foreground">
                      reaction 中的 [name] 已被替换为对应的捕获组值
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 帮助信息 */}
            <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 space-y-1">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-100">💡 测试说明</p>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li>匹配的文本会以黄色背景高亮显示</li>
                <li>命名捕获组的值会显示在下方列表中</li>
                <li>Reaction 替换预览显示最终生成的反应内容</li>
                <li>如需修改正则，切换回构建器标签页</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export const ProcessingSection = React.memo(function ProcessingSection({
  keywordReactionConfig,
  responsePostProcessConfig,
  chineseTypoConfig,
  responseSplitterConfig,
  onKeywordReactionChange,
  onResponsePostProcessChange,
  onChineseTypoChange,
  onResponseSplitterChange,
}: ProcessingSectionProps) {
  // ===== 关键词反应相关函数 =====
  // 添加正则规则
  const addRegexRule = () => {
    onKeywordReactionChange({
      ...keywordReactionConfig,
      regex_rules: [
        ...keywordReactionConfig.regex_rules,
        { regex: [''], reaction: '' },
      ],
    })
  }

  // 删除正则规则
  const removeRegexRule = (index: number) => {
    onKeywordReactionChange({
      ...keywordReactionConfig,
      regex_rules: keywordReactionConfig.regex_rules.filter((_, i) => i !== index),
    })
  }

  // 更新正则规则
  const updateRegexRule = (index: number, field: 'regex' | 'reaction', value: string | string[]) => {
    const newRules = [...keywordReactionConfig.regex_rules]
    if (field === 'regex' && typeof value === 'string') {
      newRules[index] = { ...newRules[index], regex: [value] }
    } else if (field === 'reaction' && typeof value === 'string') {
      newRules[index] = { ...newRules[index], reaction: value }
    }
    onKeywordReactionChange({
      ...keywordReactionConfig,
      regex_rules: newRules,
    })
  }

  // 添加关键词规则
  const addKeywordRule = () => {
    onKeywordReactionChange({
      ...keywordReactionConfig,
      keyword_rules: [
        ...keywordReactionConfig.keyword_rules,
        { keywords: [], reaction: '' },
      ],
    })
  }

  // 删除关键词规则
  const removeKeywordRule = (index: number) => {
    onKeywordReactionChange({
      ...keywordReactionConfig,
      keyword_rules: keywordReactionConfig.keyword_rules.filter((_, i) => i !== index),
    })
  }

  // 更新关键词规则
  const updateKeywordRule = (index: number, field: 'keywords' | 'reaction', value: string | string[]) => {
    const newRules = [...keywordReactionConfig.keyword_rules]
    if (field === 'keywords' && Array.isArray(value)) {
      newRules[index] = { ...newRules[index], keywords: value }
    } else if (field === 'reaction' && typeof value === 'string') {
      newRules[index] = { ...newRules[index], reaction: value }
    }
    onKeywordReactionChange({
      ...keywordReactionConfig,
      keyword_rules: newRules,
    })
  }

  // 添加/删除关键词
  const addKeyword = (ruleIndex: number) => {
    const newRules = [...keywordReactionConfig.keyword_rules]
    newRules[ruleIndex] = {
      ...newRules[ruleIndex],
      keywords: [...(newRules[ruleIndex].keywords || []), ''],
    }
    onKeywordReactionChange({
      ...keywordReactionConfig,
      keyword_rules: newRules,
    })
  }

  const removeKeyword = (ruleIndex: number, keywordIndex: number) => {
    const newRules = [...keywordReactionConfig.keyword_rules]
    newRules[ruleIndex] = {
      ...newRules[ruleIndex],
      keywords: (newRules[ruleIndex].keywords || []).filter((_, i) => i !== keywordIndex),
    }
    onKeywordReactionChange({
      ...keywordReactionConfig,
      keyword_rules: newRules,
    })
  }

  const updateKeyword = (ruleIndex: number, keywordIndex: number, value: string) => {
    const newRules = [...keywordReactionConfig.keyword_rules]
    const keywords = [...(newRules[ruleIndex].keywords || [])]
    keywords[keywordIndex] = value
    newRules[ruleIndex] = { ...newRules[ruleIndex], keywords }
    onKeywordReactionChange({
      ...keywordReactionConfig,
      keyword_rules: newRules,
    })
  }

  // 预览组件
  const RegexRulePreview = ({ rule }: { rule: KeywordRule }) => {
    const previewText = `{ regex = [${(rule.regex || []).map(r => `"${r}"`).join(', ')}], reaction = "${rule.reaction}" }`
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            预览
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[95vw] sm:w-[500px]">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">配置预览</h4>
            <ScrollArea className="h-60 rounded-md bg-muted p-3">
              <pre className="font-mono text-xs break-all">
                {previewText}
              </pre>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              这是保存到 bot_config.toml 文件中的格式
            </p>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  const KeywordRulePreview = ({ rule }: { rule: KeywordRule }) => {
    const previewText = `[[keyword_reaction.keyword_rules]]\nkeywords = [${(rule.keywords || []).map(k => `"${k}"`).join(', ')}]\nreaction = "${rule.reaction}"`
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            预览
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[95vw] sm:w-[500px]">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">配置预览</h4>
            <ScrollArea className="h-60 rounded-md bg-muted p-3">
              <pre className="font-mono text-xs whitespace-pre-wrap break-all">
                {previewText}
              </pre>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              这是保存到 bot_config.toml 文件中的格式
            </p>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <div className="space-y-6">
      {/* 关键词反应配置 */}
      <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">关键词反应配置</h3>
          <p className="text-sm text-muted-foreground">
            配置触发特定反应的关键词和正则表达式规则
          </p>
        </div>

        {/* 正则规则 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-semibold">正则表达式规则</h4>
              <p className="text-xs text-muted-foreground mt-1">
                使用正则表达式匹配消息内容
              </p>
            </div>
            <Button onClick={addRegexRule} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              添加正则规则
            </Button>
          </div>

          <div className="space-y-3">
            {keywordReactionConfig.regex_rules.map((rule, index) => (
              <div key={index} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">正则规则 {index + 1}</span>
                  <div className="flex items-center gap-2">
                    <RegexEditor
                      regex={(rule.regex && rule.regex[0]) || ''}
                      reaction={rule.reaction}
                      onRegexChange={(value) => updateRegexRule(index, 'regex', value)}
                      onReactionChange={(value) => updateRegexRule(index, 'reaction', value)}
                    />
                    <RegexRulePreview rule={rule} />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认删除</AlertDialogTitle>
                          <AlertDialogDescription>
                            确定要删除正则规则 {index + 1} 吗？此操作无法撤销。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeRegexRule(index)}>
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid gap-2">
                    <Label className="text-xs font-medium">正则表达式（Python 语法）</Label>
                    <Input
                      value={(rule.regex && rule.regex[0]) || ''}
                      onChange={(e) => updateRegexRule(index, 'regex', e.target.value)}
                      placeholder="例如：^(?P<n>\\S{1,20})是这样的$ （点击正则编辑器按钮可视化构建）"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      支持命名捕获组 (?P&lt;name&gt;pattern)，可在 reaction 中使用 [name] 引用。点击"正则编辑器"可视化构建和测试！
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-xs font-medium">反应内容</Label>
                    <Textarea
                      value={rule.reaction}
                      onChange={(e) => updateRegexRule(index, 'reaction', e.target.value)}
                      placeholder="触发后麦麦的反应...&#10;可以使用 [捕获组名] 来引用正则表达式中的内容"
                      rows={3}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      使用 [捕获组名] 引用正则表达式中的命名捕获组，例如 [n] 会被替换为捕获的内容
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {keywordReactionConfig.regex_rules.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                暂无正则规则，点击"添加正则规则"开始配置
              </div>
            )}
          </div>
        </div>

        {/* 关键词规则 */}
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-semibold">关键词规则</h4>
              <p className="text-xs text-muted-foreground mt-1">
                使用关键词列表匹配消息内容
              </p>
            </div>
            <Button onClick={addKeywordRule} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              添加关键词规则
            </Button>
          </div>

          <div className="space-y-3">
            {keywordReactionConfig.keyword_rules.map((rule, ruleIndex) => (
              <div key={ruleIndex} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">关键词规则 {ruleIndex + 1}</span>
                  <div className="flex items-center gap-2">
                    <KeywordRulePreview rule={rule} />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认删除</AlertDialogTitle>
                          <AlertDialogDescription>
                            确定要删除关键词规则 {ruleIndex + 1} 吗？此操作无法撤销。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeKeywordRule(ruleIndex)}>
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">关键词列表</Label>
                      <Button
                        onClick={() => addKeyword(ruleIndex)}
                        size="sm"
                        variant="ghost"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        添加关键词
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {(rule.keywords || []).map((keyword, keywordIndex) => (
                        <div key={keywordIndex} className="flex items-center gap-2">
                          <Input
                            value={keyword}
                            onChange={(e) =>
                              updateKeyword(ruleIndex, keywordIndex, e.target.value)
                            }
                            placeholder="关键词"
                            className="flex-1"
                          />
                          <Button
                            onClick={() => removeKeyword(ruleIndex, keywordIndex)}
                            size="sm"
                            variant="ghost"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}

                      {(!rule.keywords || rule.keywords.length === 0) && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          暂无关键词，点击"添加关键词"开始配置
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-xs font-medium">反应内容</Label>
                    <Textarea
                      value={rule.reaction}
                      onChange={(e) => updateKeywordRule(ruleIndex, 'reaction', e.target.value)}
                      placeholder="触发后麦麦的反应..."
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}

            {keywordReactionConfig.keyword_rules.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                暂无关键词规则，点击"添加关键词规则"开始配置
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 回复后处理配置 */}
      <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">回复后处理配置</h3>
          <div className="flex items-center space-x-2">
            <Switch
              id="enable_response_post_process"
              checked={responsePostProcessConfig.enable_response_post_process}
              onCheckedChange={(checked) =>
                onResponsePostProcessChange({
                  ...responsePostProcessConfig,
                  enable_response_post_process: checked,
                })
              }
            />
            <Label htmlFor="enable_response_post_process" className="cursor-pointer">
              启用回复后处理
            </Label>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            包括错别字生成器和回复分割器
          </p>
        </div>

        {/* 错别字生成器 */}
        {responsePostProcessConfig.enable_response_post_process && (
          <>
            <div className="border-t pt-6 space-y-4">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Switch
                    id="enable_chinese_typo"
                    checked={chineseTypoConfig.enable}
                    onCheckedChange={(checked) =>
                      onChineseTypoChange({ ...chineseTypoConfig, enable: checked })
                    }
                  />
                  <Label htmlFor="enable_chinese_typo" className="cursor-pointer font-semibold">
                    中文错别字生成器
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  为回复添加随机错别字，让麦麦的回复更自然
                </p>

                {chineseTypoConfig.enable && (
                  <div className="grid gap-4 pl-6 border-l-2 border-primary/20">
                    <div className="grid gap-2">
                      <Label htmlFor="error_rate" className="text-xs font-medium">
                        单字替换概率
                      </Label>
                      <Input
                        id="error_rate"
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        value={chineseTypoConfig.error_rate}
                        onChange={(e) =>
                          onChineseTypoChange({
                            ...chineseTypoConfig,
                            error_rate: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="min_freq" className="text-xs font-medium">
                        最小字频阈值
                      </Label>
                      <Input
                        id="min_freq"
                        type="number"
                        min="0"
                        value={chineseTypoConfig.min_freq}
                        onChange={(e) =>
                          onChineseTypoChange({
                            ...chineseTypoConfig,
                            min_freq: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="tone_error_rate" className="text-xs font-medium">
                        声调错误概率
                      </Label>
                      <Input
                        id="tone_error_rate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={chineseTypoConfig.tone_error_rate}
                        onChange={(e) =>
                          onChineseTypoChange({
                            ...chineseTypoConfig,
                            tone_error_rate: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="word_replace_rate" className="text-xs font-medium">
                        整词替换概率
                      </Label>
                      <Input
                        id="word_replace_rate"
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        value={chineseTypoConfig.word_replace_rate}
                        onChange={(e) =>
                          onChineseTypoChange({
                            ...chineseTypoConfig,
                            word_replace_rate: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 回复分割器 */}
            <div className="border-t pt-6 space-y-4">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Switch
                    id="enable_response_splitter"
                    checked={responseSplitterConfig.enable}
                    onCheckedChange={(checked) =>
                      onResponseSplitterChange({ ...responseSplitterConfig, enable: checked })
                    }
                  />
                  <Label htmlFor="enable_response_splitter" className="cursor-pointer font-semibold">
                    回复分割器
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  控制回复的长度和句子数量
                </p>

                {responseSplitterConfig.enable && (
                  <div className="grid gap-4 pl-6 border-l-2 border-primary/20">
                    <div className="grid gap-2">
                      <Label htmlFor="max_length" className="text-xs font-medium">
                        最大长度
                      </Label>
                      <Input
                        id="max_length"
                        type="number"
                        min="1"
                        value={responseSplitterConfig.max_length}
                        onChange={(e) =>
                          onResponseSplitterChange({
                            ...responseSplitterConfig,
                            max_length: parseInt(e.target.value),
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">回复允许的最大字符数</p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="max_sentence_num" className="text-xs font-medium">
                        最大句子数
                      </Label>
                      <Input
                        id="max_sentence_num"
                        type="number"
                        min="1"
                        value={responseSplitterConfig.max_sentence_num}
                        onChange={(e) =>
                          onResponseSplitterChange({
                            ...responseSplitterConfig,
                            max_sentence_num: parseInt(e.target.value),
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">回复允许的最大句子数量</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enable_kaomoji_protection"
                        checked={responseSplitterConfig.enable_kaomoji_protection}
                        onCheckedChange={(checked) =>
                          onResponseSplitterChange({
                            ...responseSplitterConfig,
                            enable_kaomoji_protection: checked,
                          })
                        }
                      />
                      <Label htmlFor="enable_kaomoji_protection" className="cursor-pointer">
                        启用颜文字保护
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enable_overflow_return_all"
                        checked={responseSplitterConfig.enable_overflow_return_all}
                        onCheckedChange={(checked) =>
                          onResponseSplitterChange({
                            ...responseSplitterConfig,
                            enable_overflow_return_all: checked,
                          })
                        }
                      />
                      <Label htmlFor="enable_overflow_return_all" className="cursor-pointer">
                        超出时一次性返回全部
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground -mt-2">
                      当句子数量超出限制时，合并后一次性返回所有内容
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
})
