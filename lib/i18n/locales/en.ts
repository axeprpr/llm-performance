const en = {
  // Brand
  "brand.name": "LLM Perf Test",
  "brand.tagline": "LLM API Performance Testing Tool",
  "brand.description": "Test LLM API inference speed across different input lengths, with visualization & export",

  // Language
  "language.zh": "中文",
  "language.en": "English",

  // Common
  "common.save": "Save",
  "common.delete": "Delete",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.confirm": "Confirm",
  "common.error": "Error",

  // API Config
  "config.api": "API Configuration",
  "config.requestUrl": "Request URL",
  "config.requestUrlPlaceholder": "https://api.openai.com",
  "config.requestUrlTip": "Enter base URL or full endpoint. /v1/chat/completions will be auto-appended if needed.",
  "config.apiKey": "API Key",
  "config.apiKeyPlaceholder": "sk-...",
  "config.modelName": "Model Name",
  "config.modelNamePlaceholder": "gpt-4o",
  "config.fetchModels": "Fetch",
  "config.fetchingModels": "Fetching...",
  "config.fetchModelsSuccess": "{count} models loaded",
  "config.fetchModelsFailed": "Failed to fetch models, please enter manually",
  "config.selectModel": "Select a model",
  "config.manualInput": "Or enter manually",

  // Presets
  "preset.title": "Model Presets",
  "preset.saved": "Saved Models",
  "preset.select": "Select a model preset",
  "preset.name": "Preset Name",
  "preset.namePlaceholder": "e.g. GPT-4o Production",
  "preset.save": "Save Current Config",
  "preset.saveSuccess": "Preset saved successfully",
  "preset.deleteSuccess": "Preset deleted",
  "preset.enterName": "Please enter a preset name",
  "preset.selectFirst": "Please select a preset first",
  "preset.confirmDelete": "Delete this preset?",

  // Test Params
  "params.title": "Test Parameters",
  "params.minInput": "Min Input Length",
  "params.maxInput": "Max Input Length",
  "params.step": "Step Size",
  "params.maxOutput": "Max Output Length",
  "params.structureLen": "Structure Length",
  "params.structureTip": "Input Length = System Prompt + User Prompt + Structure Length",

  // Controls
  "control.start": "Start Test",
  "control.stop": "Stop Test",
  "control.ready": "Ready",
  "control.testing": "Testing...",
  "control.done": "Test Complete",
  "control.warmup": "Warming up...",
  "control.progress": "Progress: {current}/{total}",
  "control.exportChart": "Export Chart",
  "control.exportCsv": "CSV",
  "control.exportMd": "Markdown",

  // Results
  "result.title": "Test Results",
  "result.empty": "No test data yet. Click \"Start Test\" to begin.",
  "result.inputLen": "Input Length",
  "result.ttft": "TTFT (ms)",
  "result.prefillSpeed": "Prefill Speed (t/s)",
  "result.outputLen": "Output Length",
  "result.outputTime": "Output Time (ms)",
  "result.outputSpeed": "Output Speed (t/s)",
  "result.detail": "Detail",

  // Detail Dialog
  "detail.title": "Test Detail",
  "detail.inputLength": "Input Length",
  "detail.sysPromptLen": "System Prompt Length",
  "detail.userPromptLen": "User Prompt Length",
  "detail.outputLength": "Output Length",
  "detail.sysPrompt": "System Prompt",
  "detail.userPrompt": "User Prompt",
  "detail.outputContent": "Output Content",

  // Chart
  "chart.ttft": "Time to First Token / TTFT (ms)",
  "chart.outputSpeed": "Output Speed (token/s)",
  "chart.inputLen": "Input Length",
  "chart.ttftAxis": "TTFT (ms)",
  "chart.outputSpeedAxis": "Output Speed (token/s)",

  // Validation
  "valid.fillRequired": "Please fill in the request URL and model name",
  "valid.invalidParams": "Please enter valid test parameters",
  "valid.minInputTooSmall": "Min input length must be >= 20",
  "valid.maxOutputTooSmall": "Max output length must be >= 3",
  "valid.noDataExport": "No data to export",
} as const;

export type LocaleKeys = keyof typeof en;
export default en;
