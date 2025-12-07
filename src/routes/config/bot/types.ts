/**
 * Bot 配置页面相关类型定义
 */

export interface BotConfig {
  platform: string
  qq_account: string | number
  nickname: string
  platforms: string[]
  alias_names: string[]
}

export interface PersonalityConfig {
  personality: string
  reply_style: string
  interest: string
  plan_style: string
  visual_style: string
  private_plan_style: string
  states: string[]
  state_probability: number
}

export interface ChatConfig {
  talk_value: number
  mentioned_bot_reply: boolean
  max_context_size: number
  planner_smooth: number
  enable_talk_value_rules: boolean
  talk_value_rules: Array<{
    target: string
    time: string
    value: number
  }>
  include_planner_reasoning: boolean
}

export interface ExpressionConfig {
  learning_list: Array<[string, string, string, string]>
  expression_groups: Array<string[]>
  reflect: boolean
  reflect_operator_id: string
  allow_reflect: string[]
  all_global_jargon: boolean
}

export interface EmojiConfig {
  emoji_chance: number
  max_reg_num: number
  do_replace: boolean
  check_interval: number
  steal_emoji: boolean
  content_filtration: boolean
  filtration_prompt: string
}

export interface MemoryConfig {
  max_agent_iterations: number
  agent_timeout_seconds: number
  enable_jargon_detection: boolean
  global_memory: boolean
}

export interface ToolConfig {
  enable_tool: boolean
}

// MoodConfig 已在后端移除

export interface VoiceConfig {
  enable_asr: boolean
}

export interface LPMMKnowledgeConfig {
  enable: boolean
  lpmm_mode: string
  rag_synonym_search_top_k: number
  rag_synonym_threshold: number
  info_extraction_workers: number
  qa_relation_search_top_k: number
  qa_relation_threshold: number
  qa_paragraph_search_top_k: number
  qa_paragraph_node_weight: number
  qa_ent_filter_top_k: number
  qa_ppr_damping: number
  qa_res_top_k: number
  embedding_dimension: number
}

export interface KeywordRule {
  keywords?: string[]
  regex?: string[]
  reaction: string
}

export interface KeywordReactionConfig {
  keyword_rules: KeywordRule[]
  regex_rules: KeywordRule[]
}

export interface ResponsePostProcessConfig {
  enable_response_post_process: boolean
}

export interface ChineseTypoConfig {
  enable: boolean
  error_rate: number
  min_freq: number
  tone_error_rate: number
  word_replace_rate: number
}

export interface ResponseSplitterConfig {
  enable: boolean
  max_length: number
  max_sentence_num: number
  enable_kaomoji_protection: boolean
  enable_overflow_return_all: boolean
}

export interface LogConfig {
  date_style: string
  log_level_style: string
  color_text: string
  log_level: string
  console_log_level: string
  file_log_level: string
  suppress_libraries: string[]
  library_log_levels: Record<string, string>
}

export interface DebugConfig {
  show_prompt: boolean
  show_replyer_prompt: boolean
  show_replyer_reasoning: boolean
  show_jargon_prompt: boolean
  show_memory_prompt: boolean
  show_planner_prompt: boolean
  show_lpmm_paragraph: boolean
}

export interface MaimMessageConfig {
  auth_token: string[]
  use_custom: boolean
  host: string
  port: number
  mode: string
  use_wss: boolean
  cert_file: string
  key_file: string
}

export interface TelemetryConfig {
  enable: boolean
}

/**
 * 所有配置的聚合类型
 */
export interface AllBotConfigs {
  botConfig: BotConfig | null
  personalityConfig: PersonalityConfig | null
  chatConfig: ChatConfig | null
  expressionConfig: ExpressionConfig | null
  emojiConfig: EmojiConfig | null
  memoryConfig: MemoryConfig | null
  toolConfig: ToolConfig | null
  voiceConfig: VoiceConfig | null
  lpmmConfig: LPMMKnowledgeConfig | null
  keywordReactionConfig: KeywordReactionConfig | null
  responsePostProcessConfig: ResponsePostProcessConfig | null
  chineseTypoConfig: ChineseTypoConfig | null
  responseSplitterConfig: ResponseSplitterConfig | null
  logConfig: LogConfig | null
  debugConfig: DebugConfig | null
  maimMessageConfig: MaimMessageConfig | null
  telemetryConfig: TelemetryConfig | null
}

/**
 * 配置节名称到类型的映射
 */
export type ConfigSectionName = 
  | 'bot'
  | 'personality'
  | 'chat'
  | 'expression'
  | 'emoji'
  | 'memory'
  | 'tool'
  | 'voice'
  | 'lpmm_knowledge'
  | 'keyword_reaction'
  | 'response_post_process'
  | 'chinese_typo'
  | 'response_splitter'
  | 'log'
  | 'debug'
  | 'maim_message'
  | 'telemetry'
