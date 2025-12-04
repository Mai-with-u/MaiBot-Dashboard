import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import type { MaimMessageConfig } from '../types'

interface MaimMessageSectionProps {
  config: MaimMessageConfig
  onChange: (config: MaimMessageConfig) => void
}

export const MaimMessageSection = React.memo(function MaimMessageSection({ config, onChange }: MaimMessageSectionProps) {
  const [newToken, setNewToken] = useState('')

  const addToken = () => {
    if (newToken && !config.auth_token.includes(newToken)) {
      onChange({ ...config, auth_token: [...config.auth_token, newToken] })
      setNewToken('')
    }
  }

  const removeToken = (index: number) => {
    onChange({
      ...config,
      auth_token: config.auth_token.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">MaimMessage 服务配置</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>启用自定义服务器</Label>
              <p className="text-sm text-muted-foreground">
                是否使用自定义的 MaimMessage 服务器
              </p>
            </div>
            <Switch
              checked={config.use_custom}
              onCheckedChange={(checked) => onChange({ ...config, use_custom: checked })}
            />
          </div>

          {config.use_custom && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>主机地址</Label>
                  <Input
                    value={config.host}
                    onChange={(e) => onChange({ ...config, host: e.target.value })}
                    placeholder="127.0.0.1"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>端口号</Label>
                  <Input
                    type="number"
                    value={config.port}
                    onChange={(e) => onChange({ ...config, port: parseInt(e.target.value) })}
                    placeholder="8090"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>连接模式</Label>
                  <Select
                    value={config.mode}
                    onValueChange={(value) => onChange({ ...config, mode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ws">WebSocket (ws)</SelectItem>
                      <SelectItem value="tcp">TCP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.use_wss}
                    onCheckedChange={(checked) => onChange({ ...config, use_wss: checked })}
                    disabled={config.mode !== 'ws'}
                  />
                  <Label>使用 WSS 安全连接</Label>
                </div>
              </div>

              {config.use_wss && config.mode === 'ws' && (
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>SSL 证书文件路径</Label>
                    <Input
                      value={config.cert_file}
                      onChange={(e) => onChange({ ...config, cert_file: e.target.value })}
                      placeholder="cert.pem"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>SSL 密钥文件路径</Label>
                    <Input
                      value={config.key_file}
                      onChange={(e) => onChange({ ...config, key_file: e.target.value })}
                      placeholder="key.pem"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 认证令牌 */}
      <div>
        <Label className="mb-2 block">认证令牌</Label>
        <p className="text-sm text-muted-foreground mb-2">用于 API 验证，为空则不启用验证</p>
        <div className="flex gap-2 mb-2">
          <Input
            value={newToken}
            onChange={(e) => setNewToken(e.target.value)}
            placeholder="输入认证令牌"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addToken()
              }
            }}
          />
          <Button onClick={addToken} size="sm">
            <Plus className="h-4 w-4" strokeWidth={2} fill="none" />
          </Button>
        </div>
        <div className="space-y-2">
          {config.auth_token.map((token, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-secondary px-3 py-2 rounded-md"
            >
              <span className="text-sm font-mono">{token}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => removeToken(index)}
              >
              <Trash2 className="h-3 w-3" strokeWidth={2} fill="none" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  </div>
  )
})