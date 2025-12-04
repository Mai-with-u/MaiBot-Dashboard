import React from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { MoodConfig } from '../types'

interface MoodSectionProps {
  config: MoodConfig
  onChange: (config: MoodConfig) => void
}

export const MoodSection = React.memo(function MoodSection({ config, onChange }: MoodSectionProps) {
  return (
    <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-4">
      <h3 className="text-lg font-semibold">情绪设置</h3>
      <div className="grid gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            checked={config.enable_mood}
            onCheckedChange={(checked) => onChange({ ...config, enable_mood: checked })}
          />
          <Label className="cursor-pointer">启用情绪系统</Label>
        </div>
        {config.enable_mood && (
          <>
            <div className="grid gap-2">
              <Label>情绪更新阈值</Label>
              <Input
                type="number"
                min="1"
                value={config.mood_update_threshold}
                onChange={(e) =>
                  onChange({ ...config, mood_update_threshold: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">越高，更新越慢</p>
            </div>
            <div className="grid gap-2">
              <Label>情感特征</Label>
              <Textarea
                value={config.emotion_style}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange({ ...config, emotion_style: e.target.value })}
                placeholder="影响情绪的变化情况"
                rows={2}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
})
