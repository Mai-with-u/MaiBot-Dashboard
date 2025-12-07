import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Plus, Trash2, Eye } from 'lucide-react'
import type { ExpressionConfig } from '../types'

interface ExpressionGroupMemberInputProps {
  member: string
  groupIndex: number
  memberIndex: number
  availableChatIds: string[]
  onUpdate: (groupIndex: number, memberIndex: number, value: string) => void
  onRemove: (groupIndex: number, memberIndex: number) => void
}

const ExpressionGroupMemberInput = React.memo(function ExpressionGroupMemberInput({
  member,
  groupIndex,
  memberIndex,
  availableChatIds,
  onUpdate,
  onRemove,
}: ExpressionGroupMemberInputProps) {
  // 判断当前成员是否在可选列表中
  const isFromList = availableChatIds.includes(member) || member === '*'
  const [inputMode, setInputMode] = useState(!isFromList)
  
  return (
    <div className="flex gap-2">
      {/* 输入模式切换 */}
      <div className="flex-1 flex gap-2">
        {inputMode ? (
          // 手动输入模式
          <>
            <Input
              value={member}
              onChange={(e) => onUpdate(groupIndex, memberIndex, e.target.value)}
              placeholder='输入 "*" 或 "qq:123456:group"'
              className="flex-1"
            />
            {availableChatIds.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setInputMode(false)}
                title="切换到下拉选择"
              >
                下拉
              </Button>
            )}
          </>
        ) : (
          // 下拉选择模式
          <>
            <Select
              value={member}
              onValueChange={(value) => onUpdate(groupIndex, memberIndex, value)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="选择聊天流" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="*">* (全局共享)</SelectItem>
                {availableChatIds.map((chatId, idx) => (
                  <SelectItem key={idx} value={chatId}>
                    {chatId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setInputMode(true)}
              title="切换到手动输入"
            >
              输入
            </Button>
          </>
        )}
      </div>
      
      {/* 删除按钮 */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="icon" variant="outline">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除组成员 "{member || '(空)'}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => onRemove(groupIndex, memberIndex)}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
})

interface ExpressionSectionProps {
  config: ExpressionConfig
  onChange: (config: ExpressionConfig) => void
}

export const ExpressionSection = React.memo(function ExpressionSection({
  config,
  onChange,
}: ExpressionSectionProps) {
  // 添加学习规则
  const addLearningRule = () => {
    onChange({
      ...config,
      learning_list: [...config.learning_list, ['', 'enable', 'enable', '1.0']],
    })
  }

  // 删除学习规则
  const removeLearningRule = (index: number) => {
    onChange({
      ...config,
      learning_list: config.learning_list.filter((_, i) => i !== index),
    })
  }

  // 更新学习规则
  const updateLearningRule = (
    index: number,
    field: 0 | 1 | 2 | 3,
    value: string
  ) => {
    const newList = [...config.learning_list]
    newList[index][field] = value
    onChange({
      ...config,
      learning_list: newList,
    })
  }

  // 预览组件
  const LearningRulePreview = ({ rule }: { rule: [string, string, string, string] }) => {
    const previewText = `["${rule[0]}", "${rule[1]}", "${rule[2]}", "${rule[3]}"]`
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            预览
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 sm:w-96">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">配置预览</h4>
            <div className="rounded-md bg-muted p-3 font-mono text-xs break-all">
              {previewText}
            </div>
            <p className="text-xs text-muted-foreground">
              这是保存到 bot_config.toml 文件中的格式
            </p>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  // 添加表达组
  const addExpressionGroup = () => {
    onChange({
      ...config,
      expression_groups: [...config.expression_groups, []],
    })
  }

  // 删除表达组
  const removeExpressionGroup = (index: number) => {
    onChange({
      ...config,
      expression_groups: config.expression_groups.filter((_, i) => i !== index),
    })
  }

  // 添加组成员
  const addGroupMember = (groupIndex: number) => {
    const newGroups = [...config.expression_groups]
    newGroups[groupIndex] = [...newGroups[groupIndex], '']
    onChange({
      ...config,
      expression_groups: newGroups,
    })
  }

  // 删除组成员
  const removeGroupMember = (groupIndex: number, memberIndex: number) => {
    const newGroups = [...config.expression_groups]
    newGroups[groupIndex] = newGroups[groupIndex].filter((_, i) => i !== memberIndex)
    onChange({
      ...config,
      expression_groups: newGroups,
    })
  }

  // 更新组成员
  const updateGroupMember = (groupIndex: number, memberIndex: number, value: string) => {
    const newGroups = [...config.expression_groups]
    newGroups[groupIndex][memberIndex] = value
    onChange({
      ...config,
      expression_groups: newGroups,
    })
  }

  return (
    <div className="space-y-6">
      {/* 表达学习配置 */}
      <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">表达学习配置</h3>
              <p className="text-sm text-muted-foreground mt-1">
                配置麦麦如何学习和使用表达方式
              </p>
            </div>
            <Button onClick={addLearningRule} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              添加规则
            </Button>
          </div>

          <div className="space-y-4">
            {config.learning_list.map((rule, index) => {
              // 检查是否已有全局配置（rule[0] === ''）
              const hasGlobalConfig = config.learning_list.some((r, i) => i !== index && r[0] === '')
              const isGlobal = rule[0] === ''
              
              // 解析聊天流 ID（格式：platform:id:type）
              const parts = rule[0].split(':')
              const platform = parts[0] || 'qq'
              const chatId = parts[1] || ''
              const chatType = parts[2] || 'group'
              
              return (
                <div key={index} className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      规则 {index + 1} {isGlobal && '（全局配置）'}
                    </span>
                    <div className="flex items-center gap-2">
                      <LearningRulePreview rule={rule} />
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
                              确定要删除学习规则 {index + 1} 吗？此操作无法撤销。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeLearningRule(index)}>
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* 配置类型选择 */}
                    <div className="grid gap-2">
                      <Label className="text-xs font-medium">配置类型</Label>
                      <Select
                        value={isGlobal ? 'global' : 'specific'}
                        onValueChange={(value) => {
                          if (value === 'global') {
                            updateLearningRule(index, 0, '')
                          } else {
                            // 切换到详细配置时，设置默认值
                            updateLearningRule(index, 0, 'qq::group')
                          }
                        }}
                        disabled={hasGlobalConfig && !isGlobal}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="global">全局配置</SelectItem>
                          <SelectItem value="specific" disabled={hasGlobalConfig && !isGlobal}>
                            详细配置
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {hasGlobalConfig && !isGlobal && (
                        <p className="text-xs text-amber-600">
                          已存在全局配置，无法创建新的全局配置
                        </p>
                      )}
                    </div>

                    {/* 详细配置选项 - 只在非全局时显示 */}
                    {!isGlobal && (
                      <div className="grid gap-4 p-3 sm:p-4 rounded-lg bg-muted/50">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* 平台选择 */}
                          <div className="grid gap-2">
                            <Label className="text-xs font-medium">平台</Label>
                            <Select
                              value={platform}
                              onValueChange={(value) => {
                                updateLearningRule(index, 0, `${value}:${chatId}:${chatType}`)
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="qq">QQ</SelectItem>
                                <SelectItem value="wx">微信</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* 群 ID 输入 */}
                          <div className="grid gap-2">
                            <Label className="text-xs font-medium">群 ID</Label>
                            <Input
                              value={chatId}
                              onChange={(e) => {
                                updateLearningRule(index, 0, `${platform}:${e.target.value}:${chatType}`)
                              }}
                              placeholder="输入群 ID"
                              className="font-mono text-sm"
                            />
                          </div>

                          {/* 类型选择 */}
                          <div className="grid gap-2">
                            <Label className="text-xs font-medium">类型</Label>
                            <Select
                              value={chatType}
                              onValueChange={(value) => {
                                updateLearningRule(index, 0, `${platform}:${chatId}:${value}`)
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="group">群组（group）</SelectItem>
                                <SelectItem value="private">私聊（private）</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          当前聊天流 ID：{rule[0] || '（未设置）'}
                        </p>
                      </div>
                    )}

                  {/* 使用学到的表达 - 改为开关 */}
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-medium">使用学到的表达</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          允许麦麦使用从聊天中学到的表达方式
                        </p>
                      </div>
                      <Switch
                        checked={rule[1] === 'enable'}
                        onCheckedChange={(checked) =>
                          updateLearningRule(index, 1, checked ? 'enable' : 'disable')
                        }
                      />
                    </div>
                  </div>

                  {/* 学习表达 - 改为开关 */}
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-medium">学习表达</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          允许麦麦从聊天中学习新的表达方式
                        </p>
                      </div>
                      <Switch
                        checked={rule[2] === 'enable'}
                        onCheckedChange={(checked) =>
                          updateLearningRule(index, 2, checked ? 'enable' : 'disable')
                        }
                      />
                    </div>
                  </div>

                  {/* 学习强度 - 改为滑块+输入框 */}
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">学习强度</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={rule[3]}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value)
                          if (!isNaN(val)) {
                            updateLearningRule(index, 3, Math.max(0, Math.min(5, val)).toFixed(1))
                          }
                        }}
                        className="w-20 h-8 text-xs"
                      />
                    </div>
                    <Slider
                      value={[parseFloat(rule[3]) || 1.0]}
                      onValueChange={(values) =>
                        updateLearningRule(index, 3, values[0].toFixed(1))
                      }
                      min={0}
                      max={5}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0 (不学习)</span>
                      <span>2.5</span>
                      <span>5.0 (快速学习)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      影响学习频率，最短学习间隔 = 300/学习强度（秒）
                    </p>
                  </div>
                </div>
              </div>
              )
            })}

            {config.learning_list.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                暂无学习规则，点击"添加规则"开始配置
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 表达反思配置 */}
      <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">表达反思配置</h3>
              <p className="text-sm text-muted-foreground mt-1">
                配置麦麦主动向管理员询问表达方式是否合适的功能
              </p>
            </div>
            <Switch
              checked={config.reflect}
              onCheckedChange={(checked) =>
                onChange({ ...config, reflect: checked })
              }
            />
          </div>

          {config.reflect && (
            <div className="space-y-4">
              {/* 表达反思操作员 ID */}
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">反思操作员</span>
                </div>
                
                <div className="space-y-4">
                  {(() => {
                    const operatorId = config.reflect_operator_id || ''
                    const parts = operatorId.split(':')
                    const platform = parts[0] || 'qq'
                    const chatId = parts[1] || ''
                    const chatType = parts[2] || 'private'
                    
                    return (
                      <div className="grid gap-4 p-3 sm:p-4 rounded-lg bg-muted/50">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* 平台选择 */}
                          <div className="grid gap-2">
                            <Label className="text-xs font-medium">平台</Label>
                            <Select
                              value={platform}
                              onValueChange={(value) => {
                                onChange({ ...config, reflect_operator_id: `${value}:${chatId}:${chatType}` })
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="qq">QQ</SelectItem>
                                <SelectItem value="wx">微信</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* ID 输入 */}
                          <div className="grid gap-2">
                            <Label className="text-xs font-medium">用户/群 ID</Label>
                            <Input
                              value={chatId}
                              onChange={(e) => {
                                onChange({ ...config, reflect_operator_id: `${platform}:${e.target.value}:${chatType}` })
                              }}
                              placeholder="输入 ID"
                              className="font-mono text-sm"
                            />
                          </div>

                          {/* 类型选择 */}
                          <div className="grid gap-2">
                            <Label className="text-xs font-medium">类型</Label>
                            <Select
                              value={chatType}
                              onValueChange={(value) => {
                                onChange({ ...config, reflect_operator_id: `${platform}:${chatId}:${value}` })
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="private">私聊（private）</SelectItem>
                                <SelectItem value="group">群组（group）</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          当前操作员 ID：{config.reflect_operator_id || '（未设置）'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          麦麦会向此操作员询问表达方式是否合适
                        </p>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* 允许反思的聊天流列表 */}
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">允许反思的聊天流</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      只有在此列表中的聊天流才会提出问题并跟踪。如果列表为空，则所有聊天流都可以进行表达反思
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      onChange({
                        ...config,
                        allow_reflect: [...(config.allow_reflect || []), 'qq::group'],
                      })
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    添加聊天流
                  </Button>
                </div>

                <div className="space-y-2">
                  {(config.allow_reflect || []).map((chatId, index) => {
                    const parts = chatId.split(':')
                    const platform = parts[0] || 'qq'
                    const id = parts[1] || ''
                    const chatType = parts[2] || 'group'
                    
                    return (
                      <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                        <Select
                          value={platform}
                          onValueChange={(value) => {
                            const newList = [...config.allow_reflect]
                            newList[index] = `${value}:${id}:${chatType}`
                            onChange({ ...config, allow_reflect: newList })
                          }}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="qq">QQ</SelectItem>
                            <SelectItem value="wx">微信</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Input
                          value={id}
                          onChange={(e) => {
                            const newList = [...config.allow_reflect]
                            newList[index] = `${platform}:${e.target.value}:${chatType}`
                            onChange({ ...config, allow_reflect: newList })
                          }}
                          placeholder="ID"
                          className="flex-1 font-mono text-sm"
                        />
                        
                        <Select
                          value={chatType}
                          onValueChange={(value) => {
                            const newList = [...config.allow_reflect]
                            newList[index] = `${platform}:${id}:${value}`
                            onChange({ ...config, allow_reflect: newList })
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="group">群组</SelectItem>
                            <SelectItem value="private">私聊</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button
                          onClick={() => {
                            onChange({
                              ...config,
                              allow_reflect: config.allow_reflect.filter((_, i) => i !== index),
                            })
                          }}
                          size="sm"
                          variant="ghost"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}

                  {(!config.allow_reflect || config.allow_reflect.length === 0) && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      列表为空，所有聊天流都可以进行表达反思
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 表达共享组配置 */}
      <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">表达共享组配置</h3>
              <p className="text-sm text-muted-foreground mt-1">
                配置不同聊天流之间如何共享学到的表达方式
              </p>
            </div>
            <Button onClick={addExpressionGroup} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              添加共享组
            </Button>
          </div>

          <div className="space-y-4">
            {config.expression_groups.map((group, groupIndex) => {
              // 获取所有已配置的聊天流 ID（用于下拉框选项）
              const availableChatIds = config.learning_list
                .map(rule => rule[0])
                .filter(id => id !== '') // 过滤掉全局配置
              
              return (
                <div key={groupIndex} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      共享组 {groupIndex + 1}
                      {group.length === 1 && group[0] === '*' && '（全局共享）'}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => addGroupMember(groupIndex)}
                        size="sm"
                        variant="outline"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
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
                              确定要删除共享组 {groupIndex + 1} 吗？此操作无法撤销。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeExpressionGroup(groupIndex)}>
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {group.map((member, memberIndex) => (
                      <ExpressionGroupMemberInput
                        key={`${groupIndex}-${memberIndex}`}
                        member={member}
                        groupIndex={groupIndex}
                        memberIndex={memberIndex}
                        availableChatIds={availableChatIds}
                        onUpdate={updateGroupMember}
                        onRemove={removeGroupMember}
                      />
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    提示：可以从下拉框选择已配置的聊天流，或手动输入。输入 "*" 启用全局共享
                  </p>
                </div>
              )
            })}

            {config.expression_groups.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                暂无共享组，点击"添加共享组"开始配置
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 黑话设置 */}
      <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-4">黑话设置</h3>
          <div className="flex items-center space-x-2">
            <Switch
              id="all_global_jargon"
              checked={config.all_global_jargon ?? false}
              onCheckedChange={(checked) =>
                onChange({ ...config, all_global_jargon: checked })
              }
            />
            <Label htmlFor="all_global_jargon" className="cursor-pointer">
              全局黑话模式
            </Label>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            开启后，新增的黑话将默认设为全局（所有聊天流共享）。关闭后，已记录的全局黑话不会改变，需要手动删除。
          </p>
        </div>
      </div>
    </div>
  )
})
