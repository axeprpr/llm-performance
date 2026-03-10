"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Square,
  Download,
  FileText,
  FileSpreadsheet,
  Plus,
  Trash2,
  Eye,
  ClipboardList,
  Zap,
  Settings,
  Bookmark,
  Languages,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

import { useLocale, LOCALES } from "@/lib/i18n/context";
import type { TestRowData, TestConfig } from "@/lib/test-engine";
import { runSingleTest, warmUp } from "@/lib/test-engine";
import { getPresets, addOrUpdatePreset, deletePreset, type ModelPreset } from "@/lib/presets";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, Filler);

export function PerfTestPage() {
  const { t, locale, setLocale } = useLocale();

  // API Config
  const [requestUrl, setRequestUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  // Presets
  const [presets, setPresets] = useState<ModelPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [presetName, setPresetName] = useState("");

  // Test params
  const [minInput, setMinInput] = useState(128);
  const [maxInput, setMaxInput] = useState(1024);
  const [step, setStep] = useState(128);
  const [maxOutput, setMaxOutput] = useState(128);
  const [structureLen, setStructureLen] = useState(4);

  // Test state
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestRowData[]>([]);
  const [statusText, setStatusText] = useState("");
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const testStartTime = useRef<Date | null>(null);

  // Detail dialog
  const [detailRow, setDetailRow] = useState<TestRowData | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setPresets(getPresets());
    setStatusText(t("control.ready"));
  }, [t]);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Fetch models from /models endpoint
  const fetchModels = useCallback(async () => {
    if (!requestUrl.trim()) {
      showToast(t("valid.fillRequired"), "error");
      return;
    }
    setIsFetchingModels(true);
    try {
      // Derive base URL: strip /chat/completions or similar suffix to get /models
      let baseUrl = requestUrl.trim();
      // Remove trailing slash
      baseUrl = baseUrl.replace(/\/+$/, '');
      // Try to find the base: remove /chat/completions, /completions, etc.
      const suffixes = ['/chat/completions', '/completions', '/v1/chat/completions', '/v1/completions'];
      let modelsUrl = '';
      for (const suffix of suffixes) {
        if (baseUrl.endsWith(suffix)) {
          modelsUrl = baseUrl.slice(0, -suffix.length) + '/v1/models';
          break;
        }
      }
      // If URL ends with /v1, just append /models
      if (!modelsUrl && baseUrl.endsWith('/v1')) {
        modelsUrl = baseUrl + '/models';
      }
      // Fallback: replace last path segment with "models"
      if (!modelsUrl) {
        const url = new URL(baseUrl);
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          pathParts[pathParts.length - 1] = 'models';
        } else {
          pathParts.push('models');
        }
        url.pathname = '/' + pathParts.join('/');
        modelsUrl = url.toString();
      }

      const headers: Record<string, string> = {};
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const resp = await fetch(modelsUrl, { headers });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      // OpenAI format: { data: [{ id: "model-name" }, ...] }
      let models: string[] = [];
      if (data.data && Array.isArray(data.data)) {
        models = data.data.map((m: { id: string }) => m.id).sort();
      } else if (Array.isArray(data)) {
        models = data.map((m: { id?: string; name?: string }) => m.id || m.name || '').filter(Boolean).sort();
      }

      if (models.length > 0) {
        setAvailableModels(models);
        showToast(t("config.fetchModelsSuccess", { count: models.length }));
      } else {
        showToast(t("config.fetchModelsFailed"), "error");
      }
    } catch {
      showToast(t("config.fetchModelsFailed"), "error");
    } finally {
      setIsFetchingModels(false);
    }
  }, [requestUrl, apiKey, t, showToast]);

  // Preset handlers
  const handleLoadPreset = useCallback((index: string) => {
    setSelectedPreset(index);
    const idx = parseInt(index);
    if (isNaN(idx)) return;
    const p = presets[idx];
    if (!p) return;
    setRequestUrl(p.url);
    setApiKey(p.key);
    setModelName(p.model);
  }, [presets]);

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) {
      showToast(t("preset.enterName"), "error");
      return;
    }
    const updated = addOrUpdatePreset({
      name: presetName.trim(),
      url: requestUrl,
      key: apiKey,
      model: modelName,
    });
    setPresets(updated);
    setPresetName("");
    showToast(t("preset.saveSuccess"));
  }, [presetName, requestUrl, apiKey, modelName, t, showToast]);

  const handleDeletePreset = useCallback(() => {
    const idx = parseInt(selectedPreset);
    if (isNaN(idx)) {
      showToast(t("preset.selectFirst"), "error");
      return;
    }
    if (!confirm(t("preset.confirmDelete"))) return;
    const updated = deletePreset(idx);
    setPresets(updated);
    setSelectedPreset("");
    showToast(t("preset.deleteSuccess"));
  }, [selectedPreset, t, showToast]);

  // Test handlers
  const stopTest = useCallback(() => {
    setIsTesting(false);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const startTest = useCallback(async () => {
    if (!requestUrl.trim() || !modelName.trim()) {
      showToast(t("valid.fillRequired"), "error");
      return;
    }
    if (isNaN(minInput) || isNaN(maxInput) || isNaN(step) || isNaN(maxOutput) || isNaN(structureLen) ||
        minInput <= 0 || maxInput < minInput || step <= 0 || maxOutput <= 0 || structureLen < 0) {
      showToast(t("valid.invalidParams"), "error");
      return;
    }
    if (minInput < 20) { showToast(t("valid.minInputTooSmall"), "error"); return; }
    if (maxOutput < 3) { showToast(t("valid.maxOutputTooSmall"), "error"); return; }

    setIsTesting(true);
    setTestResults([]);
    setProgress(0);
    testStartTime.current = new Date();

    const config: TestConfig = {
      requestUrl: requestUrl.trim(),
      modelName: modelName.trim(),
      apiKey,
      minInput,
      maxInput,
      step,
      maxOutput,
      structureLength: structureLen,
    };

    const totalSteps = Math.floor((maxInput - minInput) / step) + 1;

    setStatusText(t("control.warmup"));
    await warmUp(config);

    let stepIdx = 0;
    const results: TestRowData[] = [];

    for (let inputLen = minInput; inputLen <= maxInput; inputLen += step) {
      if (!abortRef.current || abortRef.current.signal.aborted) {
        abortRef.current = new AbortController();
      }
      // Check if still testing (use a ref trick via the abort controller)
      stepIdx++;
      setStatusText(t("control.progress", { current: stepIdx, total: totalSteps }));
      setProgress((stepIdx / totalSteps) * 100);

      try {
        const row = await runSingleTest(config, inputLen, abortRef.current.signal);
        results.push(row);
        setTestResults([...results]);
      } catch (err) {
        if ((err as Error).name === 'AbortError') break;
      }

      await new Promise(r => setTimeout(r, 800));
    }

    setIsTesting(false);
    setStatusText(t("control.done"));
    setProgress(100);
    abortRef.current = null;
  }, [requestUrl, modelName, apiKey, minInput, maxInput, step, maxOutput, structureLen, t, showToast]);

  const handleToggleTest = useCallback(() => {
    if (isTesting) {
      stopTest();
      setStatusText(t("control.done"));
    } else {
      startTest();
    }
  }, [isTesting, stopTest, startTest, t]);

  // Export handlers
  const getTimeStr = () => {
    const d = testStartTime.current || new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const a = document.createElement('a');
    a.href = content.startsWith('data:') ? content : `data:${mime};charset=utf-8,${encodeURIComponent(content)}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportChart = useCallback(() => {
    if (testResults.length === 0) { showToast(t("valid.noDataExport"), "error"); return; }
    const ttftCanvas = document.querySelector('#ttft-chart canvas') as HTMLCanvasElement;
    const outCanvas = document.querySelector('#output-chart canvas') as HTMLCanvasElement;
    if (!ttftCanvas || !outCanvas) return;
    const padding = 20;
    const w = Math.max(ttftCanvas.width, outCanvas.width);
    const h = ttftCanvas.height + outCanvas.height + padding;
    const combined = document.createElement('canvas');
    combined.width = w;
    combined.height = h;
    const ctx = combined.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(ttftCanvas, 0, 0);
    ctx.drawImage(outCanvas, 0, ttftCanvas.height + padding);
    downloadFile(combined.toDataURL('image/png'), `llm-perf-${getTimeStr()}.png`, 'image/png');
  }, [testResults, t, showToast]);

  const handleExportCsv = useCallback(() => {
    if (testResults.length === 0) { showToast(t("valid.noDataExport"), "error"); return; }
    const header = locale === 'zh'
      ? '输入长度,首字耗时(ms),预填充速度(token/s),输出长度,输出耗时(ms),输出速度(token/s)'
      : 'Input Length,TTFT(ms),Prefill Speed(token/s),Output Length,Output Time(ms),Output Speed(token/s)';
    let csv = header + '\n';
    testResults.forEach(r => {
      csv += `${r.inputLength},${r.prefillTime},${r.prefillSpeed},${r.outputLength},${r.outputTime},${r.outputSpeed}\n`;
    });
    downloadFile(csv, `llm-perf-${getTimeStr()}.csv`, 'text/csv');
  }, [testResults, locale, t, showToast]);

  const handleExportMd = useCallback(() => {
    if (testResults.length === 0) { showToast(t("valid.noDataExport"), "error"); return; }
    const h = locale === 'zh'
      ? '| 输入长度 | 首字耗时(ms) | 预填充速度(t/s) | 输出长度 | 输出耗时(ms) | 输出速度(t/s) |'
      : '| Input Len | TTFT(ms) | Prefill(t/s) | Output Len | Output Time(ms) | Output Speed(t/s) |';
    let md = `# LLM Performance Test\n\n${h}\n|---:|---:|---:|---:|---:|---:|\n`;
    testResults.forEach(r => {
      md += `| ${r.inputLength} | ${r.prefillTime} | ${r.prefillSpeed} | ${r.outputLength} | ${r.outputTime} | ${r.outputSpeed} |\n`;
    });
    downloadFile(md, `llm-perf-${getTimeStr()}.md`, 'text/markdown');
  }, [testResults, locale, t, showToast]);

  // Chart data
  const chartLabels = testResults.map(r => String(r.inputLength));
  const ttftData = testResults.map(r => r.error ? null : parseFloat(r.prefillTime));
  const speedData = testResults.map(r => r.error ? null : parseFloat(r.outputSpeed));

  const chartOptions = (titleText: string, yLabel: string) => ({
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      title: { display: true, text: titleText, font: { size: 14, weight: 600 as const } },
      tooltip: { mode: 'index' as const, intersect: false },
    },
    scales: {
      x: { title: { display: true, text: t("chart.inputLen") }, grid: { color: 'rgba(0,0,0,0.06)' } },
      y: { title: { display: true, text: yLabel }, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
    },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">{t("brand.tagline")}</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">{t("brand.description")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {LOCALES.map((l) => (
              <Button
                key={l.value}
                variant={locale === l.value ? "default" : "outline"}
                size="xs"
                onClick={() => setLocale(l.value)}
              >
                <Languages className="size-3" />
                {t(l.label)}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl space-y-4 p-4 lg:p-6">
        {/* Config Row */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* API Config */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="size-4 text-muted-foreground" />
                {t("config.api")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="requestUrl">{t("config.requestUrl")}</Label>
                <Input id="requestUrl" value={requestUrl} onChange={e => setRequestUrl(e.target.value)} placeholder={t("config.requestUrlPlaceholder")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="apiKey">{t("config.apiKey")}</Label>
                <Input id="apiKey" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={t("config.apiKeyPlaceholder")} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="modelName">{t("config.modelName")}</Label>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={fetchModels}
                    disabled={isFetchingModels}
                  >
                    {isFetchingModels ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3" />
                    )}
                    {isFetchingModels ? t("config.fetchingModels") : t("config.fetchModels")}
                  </Button>
                </div>
                {availableModels.length > 0 && (
                  <select
                    className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={availableModels.includes(modelName) ? modelName : ""}
                    onChange={e => { if (e.target.value) setModelName(e.target.value); }}
                  >
                    <option value="">{t("config.selectModel")}</option>
                    {availableModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                )}
                <Input id="modelName" value={modelName} onChange={e => setModelName(e.target.value)} placeholder={t("config.modelNamePlaceholder")} />
              </div>
            </CardContent>
          </Card>

          {/* Presets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bookmark className="size-4 text-muted-foreground" />
                {t("preset.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("preset.saved")}</Label>
                <div className="flex gap-2">
                  <select
                    className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={selectedPreset}
                    onChange={e => handleLoadPreset(e.target.value)}
                  >
                    <option value="">{t("preset.select")}</option>
                    {presets.map((p, i) => (
                      <option key={i} value={i}>{p.name}</option>
                    ))}
                  </select>
                  <Button variant="outline" size="icon" onClick={handleDeletePreset}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-1.5">
                <Label htmlFor="presetName">{t("preset.name")}</Label>
                <Input id="presetName" value={presetName} onChange={e => setPresetName(e.target.value)} placeholder={t("preset.namePlaceholder")} />
              </div>
              <Button variant="outline" className="w-full" size="sm" onClick={handleSavePreset}>
                <Plus className="size-3.5" />
                {t("preset.save")}
              </Button>
            </CardContent>
          </Card>

          {/* Test Params */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="size-4 text-muted-foreground" />
                {t("params.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="minInput">{t("params.minInput")}</Label>
                  <Input id="minInput" type="number" value={minInput} onChange={e => setMinInput(parseInt(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxInput">{t("params.maxInput")}</Label>
                  <Input id="maxInput" type="number" value={maxInput} onChange={e => setMaxInput(parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="step">{t("params.step")}</Label>
                  <Input id="step" type="number" value={step} onChange={e => setStep(parseInt(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxOutput">{t("params.maxOutput")}</Label>
                  <Input id="maxOutput" type="number" value={maxOutput} onChange={e => setMaxOutput(parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="structureLen">{t("params.structureLen")}</Label>
                <Input id="structureLen" type="number" value={structureLen} onChange={e => setStructureLen(parseInt(e.target.value) || 0)} />
              </div>
              <p className="text-xs text-muted-foreground">{t("params.structureTip")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Control Bar */}
        <Card>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-3">
            <div className="flex items-center gap-3">
              <Button
                size="lg"
                variant={isTesting ? "destructive" : "default"}
                onClick={handleToggleTest}
                className="min-w-[130px]"
              >
                {isTesting ? <Square className="size-4" /> : <Play className="size-4" />}
                {isTesting ? t("control.stop") : t("control.start")}
              </Button>
              <div className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${isTesting ? 'bg-green-500 animate-pulse' : testResults.length > 0 ? 'bg-blue-500' : 'bg-muted-foreground/40'}`} />
                <span className="text-sm text-muted-foreground">{statusText}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportChart}>
                <Download className="size-3.5" />
                {t("control.exportChart")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <FileSpreadsheet className="size-3.5" />
                {t("control.exportCsv")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportMd}>
                <FileText className="size-3.5" />
                {t("control.exportMd")}
              </Button>
            </div>
          </CardContent>
          {isTesting && (
            <div className="mx-4 mb-3 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </Card>

        {/* Charts */}
        {testResults.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent id="ttft-chart" className="pt-4">
                <Line
                  data={{
                    labels: chartLabels,
                    datasets: [{
                      data: ttftData,
                      borderColor: 'oklch(0.623 0.214 259.815)',
                      backgroundColor: 'oklch(0.623 0.214 259.815 / 0.1)',
                      fill: true,
                      tension: 0.3,
                      pointRadius: 4,
                      pointHoverRadius: 6,
                    }],
                  }}
                  options={chartOptions(t("chart.ttft"), t("chart.ttftAxis"))}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent id="output-chart" className="pt-4">
                <Line
                  data={{
                    labels: chartLabels,
                    datasets: [{
                      data: speedData,
                      borderColor: 'oklch(0.546 0.245 262.881)',
                      backgroundColor: 'oklch(0.546 0.245 262.881 / 0.1)',
                      fill: true,
                      tension: 0.3,
                      pointRadius: 4,
                      pointHoverRadius: 6,
                    }],
                  }}
                  options={chartOptions(t("chart.outputSpeed"), t("chart.outputSpeedAxis"))}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-4 text-muted-foreground" />
              {t("result.title")}
              {testResults.length > 0 && (
                <Badge variant="secondary">{testResults.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title={t("result.title")}
                description={t("result.empty")}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="text-right">{t("result.inputLen")}</TableHead>
                    <TableHead className="text-right">{t("result.ttft")}</TableHead>
                    <TableHead className="text-right">{t("result.prefillSpeed")}</TableHead>
                    <TableHead className="text-right">{t("result.outputLen")}</TableHead>
                    <TableHead className="text-right">{t("result.outputTime")}</TableHead>
                    <TableHead className="text-right">{t("result.outputSpeed")}</TableHead>
                    <TableHead className="w-16 text-center">{t("result.detail")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testResults.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="text-right font-mono">{row.inputLength}</TableCell>
                      {row.error ? (
                        <>
                          <TableCell className="text-right text-destructive">{t("common.error")}</TableCell>
                          <TableCell className="text-right text-destructive">{t("common.error")}</TableCell>
                          <TableCell className="text-right text-destructive">{t("common.error")}</TableCell>
                          <TableCell className="text-right text-destructive">{t("common.error")}</TableCell>
                          <TableCell className="text-right text-destructive">{t("common.error")}</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-right font-mono">{row.prefillTime}</TableCell>
                          <TableCell className="text-right font-mono">{row.prefillSpeed}</TableCell>
                          <TableCell className="text-right font-mono">{row.outputLength}</TableCell>
                          <TableCell className="text-right font-mono">{row.outputTime}</TableCell>
                          <TableCell className="text-right font-mono">{row.outputSpeed}</TableCell>
                        </>
                      )}
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon-xs" onClick={() => setDetailRow(row)}>
                          <Eye className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Detail Dialog */}
      <Dialog open={!!detailRow} onOpenChange={(open) => { if (!open) setDetailRow(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("detail.title")}</DialogTitle>
          </DialogHeader>
          {detailRow && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: t("detail.inputLength"), value: detailRow.inputLength },
                  { label: t("detail.sysPromptLen"), value: detailRow.systemPromptLength },
                  { label: t("detail.userPromptLen"), value: detailRow.userPromptLength },
                  { label: t("detail.outputLength"), value: detailRow.outputLength },
                ].map((s, i) => (
                  <div key={i} className="rounded-lg bg-muted p-3 text-center">
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className="mt-1 text-lg font-semibold">{s.value}</div>
                  </div>
                ))}
              </div>
              {[
                { label: t("detail.sysPrompt"), value: detailRow.systemPrompt },
                { label: t("detail.userPrompt"), value: detailRow.userPrompt },
                { label: t("detail.outputContent"), value: detailRow.output || '-' },
              ].map((s, i) => (
                <div key={i} className="space-y-1.5">
                  <Label>{s.label}</Label>
                  <div className="max-h-[150px] overflow-y-auto rounded-lg border bg-muted/50 p-3 text-xs leading-relaxed break-all whitespace-pre-wrap">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] rounded-lg border px-4 py-3 text-sm shadow-lg animate-in fade-in-0 slide-in-from-right-5 ${toast.type === 'error' ? 'border-destructive/50 bg-destructive/10 text-destructive' : 'border-border bg-card text-card-foreground'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
