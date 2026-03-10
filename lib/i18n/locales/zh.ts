import type { LocaleKeys } from "./en";

const zh: Record<LocaleKeys, string> = {
  // Brand
  "brand.name": "LLM 性能测试",
  "brand.tagline": "LLM API 性能测试工具",
  "brand.description": "测试大语言模型 API 在不同输入长度下的推理速度，支持结果可视化与导出",

  // Language
  "language.zh": "中文",
  "language.en": "English",

  // Common
  "common.save": "保存",
  "common.delete": "删除",
  "common.cancel": "取消",
  "common.close": "关闭",
  "common.confirm": "确认",
  "common.error": "错误",

  // API Config
  "config.api": "API 配置",
  "config.requestUrl": "请求地址",
  "config.requestUrlPlaceholder": "https://api.openai.com/v1/chat/completions",
  "config.apiKey": "API 密钥",
  "config.apiKeyPlaceholder": "sk-...",
  "config.modelName": "模型名称",
  "config.modelNamePlaceholder": "gpt-4o",

  // Presets
  "preset.title": "模型预设",
  "preset.saved": "已保存的模型",
  "preset.select": "选择模型预设",
  "preset.name": "预设名称",
  "preset.namePlaceholder": "例如 GPT-4o 生产环境",
  "preset.save": "保存当前配置",
  "preset.saveSuccess": "预设保存成功",
  "preset.deleteSuccess": "预设已删除",
  "preset.enterName": "请输入预设名称",
  "preset.selectFirst": "请先选择一个预设",
  "preset.confirmDelete": "确定要删除该预设吗？",

  // Test Params
  "params.title": "测试参数",
  "params.minInput": "最小输入长度",
  "params.maxInput": "最大输入长度",
  "params.step": "步长",
  "params.maxOutput": "最大输出长度",
  "params.structureLen": "模型结构长度",
  "params.structureTip": "输入长度 = 系统提示词 + 用户提示词 + 模型结构长度",

  // Controls
  "control.start": "开始测试",
  "control.stop": "停止测试",
  "control.ready": "就绪",
  "control.testing": "测试中...",
  "control.done": "测试完成",
  "control.warmup": "预热连接中...",
  "control.progress": "进度：{current}/{total}",
  "control.exportChart": "导出图表",
  "control.exportCsv": "CSV",
  "control.exportMd": "Markdown",

  // Results
  "result.title": "测试结果",
  "result.empty": "暂无测试数据，点击「开始测试」运行",
  "result.inputLen": "输入长度",
  "result.ttft": "首字耗时 (ms)",
  "result.prefillSpeed": "预填充速度 (t/s)",
  "result.outputLen": "输出长度",
  "result.outputTime": "输出耗时 (ms)",
  "result.outputSpeed": "输出速度 (t/s)",
  "result.detail": "详情",

  // Detail Dialog
  "detail.title": "测试详情",
  "detail.inputLength": "输入长度",
  "detail.sysPromptLen": "系统提示词长度",
  "detail.userPromptLen": "用户提示词长度",
  "detail.outputLength": "输出长度",
  "detail.sysPrompt": "系统提示词",
  "detail.userPrompt": "用户提示词",
  "detail.outputContent": "输出内容",

  // Chart
  "chart.ttft": "首字耗时 / TTFT (ms)",
  "chart.outputSpeed": "输出速度 (token/s)",
  "chart.inputLen": "输入长度",
  "chart.ttftAxis": "TTFT (ms)",
  "chart.outputSpeedAxis": "输出速度 (token/s)",

  // Validation
  "valid.fillRequired": "请填写请求地址和模型名称",
  "valid.invalidParams": "请填写合理的测试参数",
  "valid.minInputTooSmall": "最小输入长度需要 >= 20",
  "valid.maxOutputTooSmall": "最大输出长度需要 >= 3",
  "valid.noDataExport": "没有数据可以导出",
};

export default zh;
