import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  useListProjects,
  useCreateProject,
  useGetProject,
  useDeleteProject,
  useListMessages,
  useListFiles,
  useRefreshSandbox,
  getListMessagesQueryKey,
  getListFilesQueryKey,
  getGetProjectQueryKey,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RefreshCw, Play, Send, Plus, Code2, Loader2, FileCode2,
  Trash2, ExternalLink, Mic, MicOff, Zap, ArrowLeft, CheckCircle2, RotateCcw, Download,
  ListChecks, Pencil, Sparkles, Wand2, History, Globe, Copy, Check,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Highlight, themes } from "prism-react-renderer";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

interface StreamState {
  isStreaming: boolean;
  status: string;
  liveText: string;
  files: string[];
  error: string | null;
}

interface EditState {
  isEditing: boolean;
  status: string;
  error: string | null;
}

interface ProjectPlan {
  title: string;
  sections: Array<{ name: string; description: string }>;
  techNotes: string;
}

const initialStreamState: StreamState = {
  isStreaming: false,
  status: "",
  liveText: "",
  files: [],
  error: null,
};

async function readSSEStream(
  response: Response,
  onEvent: (type: string, data: Record<string, unknown>) => void
) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEventType = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6)) as Record<string, unknown>;
            onEvent(currentEventType || "message", data);
          } catch {
            // ignore malformed
          }
          currentEventType = "";
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function extractApiError(err: unknown): string {
  if (!err) return "Неизвестная ошибка";
  if (err instanceof Error) {
    const match = err.message.match(/:\s*(.+)$/s);
    return match ? match[1].trim() : err.message;
  }
  return String(err);
}

function RightPanel({
  projectId,
  previewUrl,
  streamState,
}: {
  projectId: number;
  previewUrl?: string | null;
  streamState: StreamState;
}) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [iframeKey, setIframeKey] = useState(0);
  const prevStreamingRef = useRef(false);

  const refreshSandbox = useRefreshSandbox();
  const queryClient = useQueryClient();

  const { data: files } = useListFiles(projectId, {
    query: { enabled: !!projectId, queryKey: getListFilesQueryKey(projectId) },
  });
  const [activeFile, setActiveFile] = useState<string | null>(null);
  useEffect(() => {
    if (files && files.length > 0 && (!activeFile || !files.find((f) => f.path === activeFile))) {
      setActiveFile(files[0].path);
    }
  }, [files, activeFile]);
  const currentFile = files?.find((f) => f.path === activeFile);
  const hasFiles = (files?.length ?? 0) > 0;

  useEffect(() => {
    if (prevStreamingRef.current && !streamState.isStreaming && previewUrl) {
      setTab("preview");
    }
    prevStreamingRef.current = streamState.isStreaming;
  }, [streamState.isStreaming, previewUrl]);

  const getLanguage = (path: string) => {
    if (path.endsWith(".tsx") || path.endsWith(".ts")) return "tsx";
    if (path.endsWith(".jsx") || path.endsWith(".js")) return "jsx";
    if (path.endsWith(".css")) return "css";
    if (path.endsWith(".json")) return "json";
    if (path.endsWith(".html")) return "markup";
    return "tsx";
  };

  const handleDeployRefresh = () => {
    toast.loading("Разворачиваю в песочнице…", { id: "sandbox-refresh" });
    refreshSandbox.mutate(
      { id: projectId },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          if (data.previewUrl) {
            toast.success("Готово!", { id: "sandbox-refresh" });
          } else {
            toast.info("Нет файлов для деплоя.", { id: "sandbox-refresh" });
          }
        },
        onError: (err) => {
          toast.error(extractApiError(err), { id: "sandbox-refresh", duration: 6000 });
        },
      }
    );
  };

  const handleDownloadZip = async (id: number) => {
    try {
      toast.loading("Готовлю архив…", { id: "download-zip" });
      const response = await fetch(`/api/projects/${id}/download`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Ошибка загрузки" }));
        throw new Error(err.error ?? "Ошибка загрузки");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : "project.zip";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Архив скачан!", { id: "download-zip" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка скачивания", {
        id: "download-zip",
        duration: 6000,
      });
    }
  };

  return (
    <div className="flex flex-1 flex-col border-l border-border bg-background relative z-0 min-w-0">
      <div className="flex h-10 shrink-0 items-center justify-between px-2 border-b border-border bg-sidebar gap-2">
        <div className="flex items-center gap-0.5 bg-background/60 rounded-md p-0.5 border border-border">
          <button
            onClick={() => setTab("preview")}
            className={`flex items-center gap-1.5 px-3 h-6 rounded text-xs font-medium transition-colors ${
              tab === "preview"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Play className="h-3 w-3" />
            Превью
          </button>
          <button
            onClick={() => setTab("code")}
            className={`flex items-center gap-1.5 px-3 h-6 rounded text-xs font-medium transition-colors ${
              tab === "code"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code2 className="h-3 w-3" />
            Код
          </button>
        </div>

        <div className="flex items-center gap-1">
          {tab === "preview" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={() => setIframeKey((k) => k + 1)}
                disabled={!previewUrl || streamState.isStreaming}
                title="Обновить превью"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Открыть в новой вкладке"
                  className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={handleDeployRefresh}
                disabled={refreshSandbox.isPending || !hasFiles}
                title={hasFiles ? "Переразвернуть в песочнице" : "Сначала сгенерируй код"}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshSandbox.isPending ? "animate-spin" : ""}`} />
              </Button>
            </>
          )}
        </div>
      </div>

      {tab === "preview" && (
        <div className="flex-1 bg-white relative overflow-hidden">
          {streamState.isStreaming ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 bg-background">
              <span className="text-5xl animate-bounce">⚡</span>
              <div className="text-sm font-mono font-semibold text-foreground text-center">
                {streamState.status || "Готовлю превью..."}
              </div>
              {streamState.files.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1 w-full max-w-[220px]">
                  {streamState.files.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : previewUrl ? (
            <iframe
              key={`${previewUrl}-${iframeKey}`}
              src={previewUrl}
              className="w-full h-full border-0"
              title="Превью"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-background">
              <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Play className="h-6 w-6 text-muted-foreground ml-1" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Превью пока нет</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Опиши своё приложение в чате — Zeus сделает всё сам.
              </p>
              {hasFiles && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={handleDeployRefresh}
                  disabled={refreshSandbox.isPending}
                >
                  <RefreshCw className={`h-3 w-3 mr-1.5 ${refreshSandbox.isPending ? "animate-spin" : ""}`} />
                  Развернуть в песочнице
                </Button>
              )}
            </div>
          )}
          {refreshSandbox.isPending && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-sm font-mono font-semibold text-foreground">Разворачиваю песочницу…</div>
            </div>
          )}
        </div>
      )}

      {tab === "code" && (
        <div className="flex flex-1 flex-col min-h-0">
          <div className="flex h-9 items-center border-b border-border bg-sidebar shrink-0 gap-1 pr-2">
            <div className="flex flex-1 h-full items-center overflow-x-auto no-scrollbar">
              {(!files || files.length === 0) && (
                <div className="px-4 text-xs text-muted-foreground font-mono">Файлов пока нет</div>
              )}
              {files?.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFile(f.path)}
                  className={`flex items-center gap-2 h-full px-4 text-xs font-mono border-r border-sidebar-border transition-colors whitespace-nowrap ${
                    activeFile === f.path
                      ? "bg-background text-primary border-t-2 border-t-primary"
                      : "text-muted-foreground hover:bg-background/50 hover:text-foreground border-t-2 border-t-transparent"
                  }`}
                >
                  <FileCode2 className="h-3.5 w-3.5 shrink-0" />
                  {f.path.split("/").pop()}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary"
              disabled={!hasFiles}
              title={hasFiles ? "Скачать ZIP" : "Сначала сгенерируй код"}
              onClick={() => handleDownloadZip(projectId)}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto bg-[#0d0d0f] relative text-sm">
            {currentFile ? (
              <Highlight
                theme={themes.vsDark}
                code={currentFile.content || ""}
                language={getLanguage(currentFile.path) as any}
              >
                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                  <pre
                    className={className}
                    style={{ ...style, padding: "1rem", margin: 0, minHeight: "100%", backgroundColor: "transparent" }}
                  >
                    {tokens.map((line, i) => (
                      <div key={i} {...getLineProps({ line })}>
                        <span className="inline-block w-8 mr-4 text-right opacity-30 select-none text-xs">{i + 1}</span>
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))}
                      </div>
                    ))}
                  </pre>
                )}
              </Highlight>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Code2 className="h-12 w-12 text-muted-foreground/20" />
                <p className="text-xs text-muted-foreground">Код появится после генерации</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryDropdown({ projectId, onRestored }: { projectId: number; onRestored: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<{ id: number; label: string; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const fetchSnapshots = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/snapshots`);
      if (!res.ok) throw new Error("Failed");
      setSnapshots(await res.json() as { id: number; label: string; createdAt: string }[]);
    } catch {
      toast.error("Не удалось загрузить снапшоты");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (snapshotId: number) => {
    setRestoringId(snapshotId);
    try {
      const res = await fetch(`/api/projects/${projectId}/restore/${snapshotId}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { restoredFiles: string[]; previewUrl: string | null; deployError: string | null };
      queryClient.invalidateQueries({ queryKey: getListFilesQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      if (data.previewUrl) onRestored(data.previewUrl);
      if (data.deployError) {
        toast.warning(`⚠ Откат выполнен (деплой не удался): ${data.deployError}`, { duration: 8000 });
      } else {
        toast.success(`✓ Откат выполнен: ${data.restoredFiles.length} файлов восстановлено`, { duration: 5000 });
      }
      setOpen(false);
    } catch {
      toast.error("Не удалось выполнить откат");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) fetchSnapshots(); }}>
      <PopoverTrigger asChild>
        <button
          title="История снапшотов"
          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border border-transparent hover:border-border"
        >
          <History className="h-3 w-3" />
          История
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" side="bottom" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold text-foreground">Снапшоты</span>
          {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
        <ScrollArea className="max-h-64">
          {!loading && snapshots.length === 0 && (
            <div className="px-3 py-4 text-xs text-center text-muted-foreground leading-relaxed">
              Снапшотов пока нет.<br />
              Они создаются автоматически перед каждой генерацией и редактированием.
            </div>
          )}
          {snapshots.map((s) => (
            <div key={s.id} className="flex items-center gap-2 px-3 py-2 border-b border-border/50 last:border-0 hover:bg-accent/50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">{s.label}</div>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(s.createdAt).toLocaleString("ru-RU")}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px] shrink-0"
                onClick={() => handleRestore(s.id)}
                disabled={restoringId !== null}
              >
                {restoringId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Откат"}
              </Button>
            </div>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function PublishButton({ projectId }: { projectId: number | null }) {
  const [loading, setLoading] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!projectId) { setPublicUrl(null); setSlug(null); return; }
    fetch(`/api/projects/${projectId}/published`)
      .then((r) => r.json())
      .then((d: any) => {
        if (d.published) { setPublicUrl(d.publicUrl); setSlug(d.slug); }
        else { setPublicUrl(null); setSlug(null); }
      })
      .catch(() => {});
  }, [projectId]);

  const handlePublish = async () => {
    if (!projectId || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/publish`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Ошибка публикации" }));
        throw new Error((err as any).error ?? "Ошибка публикации");
      }
      const data = await res.json() as { slug: string; publicUrl: string; isUpdate: boolean };
      setPublicUrl(data.publicUrl);
      setSlug(data.slug);
      toast.success(data.isUpdate ? `Публикация обновлена /${data.slug}` : `Опубликовано! /${data.slug}`, { duration: 6000 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка публикации", { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!projectId) return null;

  return (
    <div className="flex items-center gap-1">
      {publicUrl ? (
        <>
          <span className="hidden lg:block text-[10px] text-emerald-400 font-mono font-medium max-w-[90px] truncate" title={slug ?? ""}>
            /{slug}
          </span>
          <button
            onClick={handleCopy}
            title={`Скопировать ссылку: ${publicUrl}`}
            className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            <span className="hidden sm:inline">{copied ? "Скопировано" : "Копировать"}</span>
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Открыть опубликованный сайт"
            className="flex items-center px-2 py-1 text-[11px] rounded-md border border-border text-muted-foreground hover:text-foreground transition-all"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
          <button
            onClick={handlePublish}
            disabled={loading}
            title="Обновить публикацию (re-publish)"
            className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border border-border text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
            <span className="hidden sm:inline">Обновить</span>
          </button>
        </>
      ) : (
        <button
          onClick={handlePublish}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md border border-border bg-background hover:bg-accent text-foreground transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
          Публикация
        </button>
      )}
    </div>
  );
}

function Header({ projects, activeProjectId, onSelectProject, projectName }: any) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const handleNewProject = () => {
    createProject.mutate(
      { data: { name: "Новое приложение " + Math.floor(Math.random() * 100) } },
      {
        onSuccess: (p) => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          onSelectProject(p.id);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!activeProjectId) return;
    deleteProject.mutate(
      { id: activeProjectId },
      {
        onSuccess: () => {
          toast.success("Проект удалён");
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          onSelectProject(null);
        },
      }
    );
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between px-4 bg-sidebar border-b border-sidebar-border">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-xs"
          title="На главную"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary fill-primary" />
          <span className="font-mono font-semibold tracking-tight text-sm">ZEUS AI</span>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm font-medium">{projectName}</span>
      </div>
      <div className="flex items-center gap-2">
        <PublishButton projectId={activeProjectId ?? null} />
        <Select value={activeProjectId?.toString() ?? ""} onValueChange={(v) => onSelectProject(parseInt(v))}>
          <SelectTrigger className="w-[180px] h-8 text-xs font-mono bg-background border-border">
            <SelectValue placeholder="Выбери проект" />
          </SelectTrigger>
          <SelectContent>
            {projects?.map((p: any) => (
              <SelectItem key={p.id} value={p.id.toString()}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="secondary" size="sm" className="h-8" onClick={handleNewProject}>
          <Plus className="h-4 w-4 mr-1" /> Новый
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="h-8 w-8"
          onClick={handleDelete}
          disabled={!activeProjectId || deleteProject.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

type ModelTier = "lite" | "power";

function ChatPanel({
  projectId,
  projectType,
  streamState,
  editState,
  onGenerate,
  onEdit,
  onRestored,
  hasFiles,
}: {
  projectId: number;
  projectType?: string | null;
  streamState: StreamState;
  editState: EditState;
  onGenerate: (projectId: number, message: string, tier: ModelTier) => void;
  onEdit: (projectId: number, instruction: string, tier: ModelTier) => void;
  onRestored: (previewUrl: string) => void;
  hasFiles: boolean;
}) {
  const { data: messages } = useListMessages(projectId, {
    query: { enabled: !!projectId, queryKey: getListMessagesQueryKey(projectId) },
  });
  const [prompt, setPrompt] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [tier, setTier] = useState<ModelTier>("power");
  const [planMode, setPlanMode] = useState(false);
  const [plan, setPlan] = useState<ProjectPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamState.isStreaming, streamState.liveText, streamState.error, plan, planLoading]);

  const speech = useSpeechRecognition((text) => setPrompt(text));

  const handleGenerate = async () => {
    if (!prompt.trim() || streamState.isStreaming || planLoading) return;
    if (speech.isListening) speech.stop();
    const userMsg = prompt.trim();

    if (planMode) {
      setPendingPrompt(userMsg);
      setPrompt("");
      setPlan(null);
      setPlanLoading(true);
      try {
        const res = await fetch("/api/projects/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: userMsg, projectType: projectType ?? "landing" }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Ошибка получения плана" }));
          throw new Error(err.error ?? "Ошибка получения плана");
        }
        const data = await res.json() as ProjectPlan;
        setPlan(data);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Ошибка Plan Mode", { duration: 6000 });
        setPrompt(userMsg);
      } finally {
        setPlanLoading(false);
      }
      return;
    }

    setPrompt("");
    onGenerate(projectId, userMsg, tier);
  };

  const handleConfirmPlan = () => {
    if (!plan || !pendingPrompt) return;
    const enriched = `${pendingPrompt}\n\n[Plan approved — follow this structure:]\nTitle: ${plan.title}\nSections:\n${plan.sections.map((s, i) => `${i + 1}. ${s.name}: ${s.description}`).join("\n")}\nTech notes: ${plan.techNotes}`;
    setPlan(null);
    setPendingPrompt("");
    onGenerate(projectId, enriched, tier);
  };

  const handleEditPlan = () => {
    setPrompt(pendingPrompt);
    setPlan(null);
    setPendingPrompt("");
  };

  return (
    <div className="flex w-[350px] shrink-0 flex-col border-r border-border bg-sidebar relative z-10">
      <div className="flex h-10 items-center justify-between px-4 border-b border-sidebar-border bg-background/50">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">Чат</span>
        <div className="flex items-center gap-1.5">
          <HistoryDropdown projectId={projectId} onRestored={onRestored} />
          {/* Model tier toggle */}
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setTier("lite")}
              title="Lite — gpt-4o-mini: быстро и дёшево"
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium transition-all ${
                tier === "lite"
                  ? "bg-sky-500/20 text-sky-400 border-r border-sky-500/30"
                  : "text-muted-foreground hover:text-foreground border-r border-border"
              }`}
            >
              ⚡ Lite
            </button>
            <button
              onClick={() => setTier("power")}
              title="Power — gpt-4o: умнее и мощнее"
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium transition-all ${
                tier === "power"
                  ? "bg-orange-500/20 text-orange-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🔥 Power
            </button>
          </div>
          <button
            onClick={() => { setPlanMode((v) => !v); setPlan(null); setPendingPrompt(""); }}
            title={planMode ? "Plan Mode включён — нажми чтобы выключить" : "Включить Plan Mode: Zeus покажет план перед генерацией"}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition-all ${
              planMode
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <ListChecks className="h-3 w-3" />
            Plan Mode
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="flex flex-col gap-4 pb-4">
          {messages?.length === 0 && !streamState.isStreaming && !streamState.error && !plan && !planLoading && (
            <div className="text-sm text-muted-foreground text-center mt-10 font-sans leading-relaxed">
              <div className="text-2xl mb-3">⚡</div>
              <div className="font-medium text-foreground/80 mb-1">Расскажи, что хочешь создать</div>
              <div className="text-xs text-muted-foreground/70">
                {planMode ? "Plan Mode включён — Zeus покажет план перед кодом" : "Можно писать или говорить голосом"}
              </div>
            </div>
          )}

          {messages?.map((msg: any) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div className="flex items-center gap-2 mb-1 px-1">
                <span
                  className={`text-[10px] uppercase font-mono font-semibold ${
                    msg.role === "user" ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {msg.role === "user" ? "Ты" : "Zeus"}
                </span>
              </div>
              <div
                className={`text-sm rounded-md px-3 py-2 max-w-[90%] font-sans whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground border border-border"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Plan loading */}
          {planLoading && (
            <div className="flex flex-col items-start gap-2">
              <span className="text-[10px] uppercase font-mono font-semibold text-primary px-1">Zeus</span>
              <div className="w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                <span className="text-xs font-mono text-primary font-medium">Составляю план проекта...</span>
              </div>
            </div>
          )}

          {/* Plan card */}
          {plan && !planLoading && !streamState.isStreaming && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase font-mono font-semibold text-primary px-1">Zeus — план</span>
              <div className="w-full rounded-lg border border-primary/25 bg-primary/5 overflow-hidden">
                <div className="px-3 py-2.5 border-b border-primary/15">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-primary shrink-0" />
                    <span className="text-sm font-semibold text-foreground">{plan.title}</span>
                  </div>
                </div>
                <div className="px-3 py-2 flex flex-col gap-1.5">
                  {plan.sections.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-[10px] font-mono text-primary/60 mt-0.5 shrink-0 w-4">{i + 1}.</span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-foreground/90 leading-tight">{s.name}</span>
                        <span className="text-[11px] text-muted-foreground leading-tight mt-0.5">{s.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {plan.techNotes && (
                  <div className="px-3 py-2 border-t border-primary/10 bg-secondary/30">
                    <span className="text-[10px] text-muted-foreground/70 leading-relaxed">{plan.techNotes}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs gap-1.5"
                  onClick={handleConfirmPlan}
                >
                  <Sparkles className="h-3 w-3" />
                  Сгенерировать
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 text-xs gap-1.5"
                  onClick={handleEditPlan}
                >
                  <Pencil className="h-3 w-3" />
                  Изменить запрос
                </Button>
              </div>
            </div>
          )}

          {streamState.isStreaming && (
            <div className="flex flex-col items-start gap-2">
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[10px] uppercase font-mono font-semibold text-primary">Zeus</span>
              </div>

              <div className="w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 flex items-center gap-2">
                <span className="text-base animate-pulse shrink-0">⚡</span>
                <span className="text-xs font-mono text-primary font-medium truncate">{streamState.status}</span>
              </div>

              {streamState.files.length > 0 && (
                <div className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 flex flex-col gap-1">
                  {streamState.files.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
              )}

              {streamState.liveText.length > 0 && (
                <div className="w-full rounded-lg border border-border bg-secondary/20 px-3 py-2">
                  <p className="text-[11px] font-mono text-muted-foreground/60 leading-relaxed line-clamp-4 break-all">
                    {streamState.liveText.slice(-300)}
                  </p>
                </div>
              )}
            </div>
          )}

          {streamState.error && !streamState.isStreaming && (
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1 mb-1 px-1">
                <span className="text-[10px] uppercase font-mono font-semibold text-destructive">ошибка</span>
              </div>
              <div className="text-sm rounded-md px-3 py-2 max-w-[90%] bg-destructive/10 text-destructive border border-destructive/40 font-sans whitespace-pre-wrap">
                ⚠ {streamState.error}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-sidebar-border bg-background">
        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            placeholder={planMode ? "Опиши проект — Zeus покажет план..." : "Опиши своё приложение..."}
            className="min-h-[80px] resize-none pr-20 font-sans text-sm bg-secondary/50 border-sidebar-border focus-visible:ring-primary"
            disabled={streamState.isStreaming || planLoading || !!plan || editState.isEditing}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            {speech.isSupported && (
              <Button
                size="icon"
                variant="ghost"
                type="button"
                title={speech.isListening ? "Остановить запись" : "Голосовой ввод"}
                className={`h-8 w-8 transition-all ${
                  speech.isListening
                    ? "text-red-400 hover:text-red-300 hover:bg-red-500/10 animate-pulse"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                }`}
                onClick={() => speech.toggle(prompt)}
                disabled={streamState.isStreaming || planLoading || !!plan || editState.isEditing}
              >
                {speech.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
              onClick={handleGenerate}
              disabled={streamState.isStreaming || planLoading || !!plan || !prompt.trim() || editState.isEditing}
            >
              {planLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : planMode ? (
                <ListChecks className="h-4 w-4" />
              ) : streamState.isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        {speech.isListening && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400"></span>
            </span>
            Слушаю... говори
          </div>
        )}
      </div>

      {/* Edit panel — shown only after project has been generated */}
      {hasFiles && (
        <div className="px-3 pb-3 border-t border-sidebar-border bg-background/70">
          <div className="mt-2.5 mb-1.5 flex items-center gap-1.5">
            <Wand2 className="h-3 w-3 text-amber-400 shrink-0" />
            <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-amber-400/80">
              Редактировать
            </span>
          </div>
          {editState.error && !editState.isEditing && (
            <div className="mb-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-2.5 py-1.5 font-sans">
              ⚠ {editState.error}
            </div>
          )}
          {editState.isEditing && (
            <div className="mb-2 flex items-center gap-2 text-xs text-amber-400 font-mono bg-amber-400/5 border border-amber-400/20 rounded-md px-2.5 py-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              <span className="truncate">{editState.status}</span>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !editState.isEditing && editPrompt.trim()) {
                  onEdit(projectId, editPrompt.trim(), tier);
                  setEditPrompt("");
                }
              }}
              placeholder="Что изменить? (напр. «сделай кнопки красными»)"
              className="flex-1 h-8 rounded-md border border-sidebar-border bg-secondary/50 px-2.5 text-xs font-sans text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-400/60 disabled:opacity-50"
              disabled={editState.isEditing || streamState.isStreaming}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs gap-1.5 border-amber-400/40 text-amber-400 hover:bg-amber-400/10 hover:text-amber-300 shrink-0"
              disabled={editState.isEditing || streamState.isStreaming || !editPrompt.trim()}
              onClick={() => {
                if (!editPrompt.trim()) return;
                onEdit(projectId, editPrompt.trim(), tier);
                setEditPrompt("");
              }}
            >
              {editState.isEditing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
              Патч
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const initialEditState: EditState = {
  isEditing: false,
  status: "",
  error: null,
};

export default function Home() {
  const queryClient = useQueryClient();
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const createdRef = useRef(false);
  const [streamState, setStreamState] = useState<StreamState>(initialStreamState);
  const [editState, setEditState] = useState<EditState>(initialEditState);
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);

  const { data: projects, isLoading: projectsLoading } = useListProjects();
  const createProject = useCreateProject();

  useEffect(() => {
    if (projectsLoading || !projects) return;
    if (projects.length === 0 && !createdRef.current) {
      createdRef.current = true;
      const savedType = sessionStorage.getItem("zeus_project_type") as "landing" | "app" | "shop" | "card" | "portfolio" | null;
      const typeLabels: Record<string, string> = { landing: "Лендинг", app: "Приложение", shop: "Магазин", card: "Визитка", portfolio: "Портфолио" };
      const projectName = savedType ? `${typeLabels[savedType] ?? "Проект"} ${Math.floor(Math.random() * 100)}` : "Моё приложение";
      createProject.mutate(
        { data: { name: projectName, projectType: savedType ?? "landing" } },
        {
          onSuccess: (newProj) => {
            queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
            setActiveProjectId(newProj.id);
          },
          onError: () => {
            createdRef.current = false;
          },
        }
      );
    } else if (projects.length > 0 && !activeProjectId) {
      setActiveProjectId(projects[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, projectsLoading]);

  const { data: project } = useGetProject(activeProjectId as number, {
    query: { enabled: !!activeProjectId, queryKey: getGetProjectQueryKey(activeProjectId as number) },
  });

  const { data: homeFiles } = useListFiles(activeProjectId as number, {
    query: { enabled: !!activeProjectId, queryKey: getListFilesQueryKey(activeProjectId as number) },
  });
  const hasFiles = (homeFiles?.length ?? 0) > 0;

  const handleGenerate = useCallback(
    async (projectId: number, message: string, tier: ModelTier = "power") => {
      setStreamState({ isStreaming: true, status: "Запускаю Зевса...", liveText: "", files: [], error: null });
      setLivePreviewUrl(null);

      try {
        const response = await fetch(`/api/projects/${projectId}/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({ message, tier }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || `HTTP ${response.status}`);
        }

        await readSSEStream(response, (type, data) => {
          if (type === "status") {
            setStreamState((s) => ({ ...s, status: (data.text as string) ?? s.status }));
          } else if (type === "token") {
            setStreamState((s) => ({ ...s, liveText: s.liveText + ((data.text as string) ?? "") }));
          } else if (type === "file") {
            setStreamState((s) => ({
              ...s,
              files: s.files.includes(data.path as string) ? s.files : [...s.files, data.path as string],
            }));
          } else if (type === "done") {
            const url = (data.previewUrl as string | null) ?? null;
            if (url) setLivePreviewUrl(url);
            const deployErr = data.deployError as string | null | undefined;
            if (deployErr) {
              toast.warning(`⚠ ${deployErr}`, { duration: 10000 });
              setStreamState((s) => ({ ...s, isStreaming: false, status: "Готово (деплой не удался)" }));
            } else {
              setStreamState((s) => ({ ...s, isStreaming: false, status: "Готово ⚡" }));
            }
            queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(projectId) });
            queryClient.invalidateQueries({ queryKey: getListFilesQueryKey(projectId) });
            queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          } else if (type === "error") {
            const errMsg = (data.text as string) ?? "Ошибка генерации";
            setStreamState((s) => ({ ...s, isStreaming: false, error: errMsg }));
            toast.error(errMsg, { duration: 8000 });
          }
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Ошибка соединения";
        setStreamState((s) => ({ ...s, isStreaming: false, error: msg }));
        toast.error(msg, { duration: 8000 });
      }
    },
    [queryClient]
  );

  const handleRestored = useCallback(
    (previewUrl: string) => {
      setLivePreviewUrl(previewUrl);
      if (activeProjectId) {
        queryClient.invalidateQueries({ queryKey: getListFilesQueryKey(activeProjectId) });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(activeProjectId) });
      }
    },
    [queryClient, activeProjectId]
  );

  const handleEdit = useCallback(
    async (projectId: number, instruction: string, tier: ModelTier = "lite") => {
      setEditState({ isEditing: true, status: "Патчу файлы...", error: null });

      try {
        const response = await fetch(`/api/projects/${projectId}/edit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction, tier }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          throw new Error(errData.error ?? `HTTP ${response.status}`);
        }

        const data = await response.json() as {
          message: string;
          patchedFiles: string[];
          filesBefore: string[];
          previewUrl: string | null;
          deployError: string | null;
        };

        if (data.previewUrl) setLivePreviewUrl(data.previewUrl);

        queryClient.invalidateQueries({ queryKey: getListFilesQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });

        if (data.deployError) {
          toast.warning(`⚠ ${data.deployError}`, { duration: 10000 });
          setEditState({ isEditing: false, status: "", error: null });
        } else {
          toast.success(
            `✓ Патч применён: ${data.patchedFiles.join(", ")} (${data.patchedFiles.length} из ${data.filesBefore.length} файлов)`,
            { duration: 8000 }
          );
          setEditState({ isEditing: false, status: "", error: null });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Ошибка редактирования";
        setEditState({ isEditing: false, status: "", error: msg });
        toast.error(msg, { duration: 8000 });
      }
    },
    [queryClient]
  );

  // Auto-submit prompt from landing page once project is ready
  const autoSubmitRef = useRef(false);
  useEffect(() => {
    if (!activeProjectId || autoSubmitRef.current) return;
    const saved = sessionStorage.getItem("zeus_initial_prompt");
    if (saved) {
      sessionStorage.removeItem("zeus_initial_prompt");
      sessionStorage.removeItem("zeus_project_type");
      autoSubmitRef.current = true;
      handleGenerate(activeProjectId, saved);
    }
  }, [activeProjectId, handleGenerate]);

  if (projectsLoading || (!activeProjectId && projects?.length === 0)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const previewUrl = livePreviewUrl ?? project?.previewUrl ?? null;

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground overflow-hidden">
      <Header
        projects={projects || []}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        projectName={project?.name || "Загрузка..."}
      />
      <div className="flex flex-1 overflow-hidden border-t border-border">
        {activeProjectId ? (
          <>
            <ChatPanel
              projectId={activeProjectId}
              projectType={project?.projectType}
              streamState={streamState}
              editState={editState}
              onGenerate={handleGenerate}
              onEdit={handleEdit}
              onRestored={handleRestored}
              hasFiles={hasFiles}
            />
            <RightPanel
              projectId={activeProjectId}
              previewUrl={previewUrl}
              streamState={streamState}
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
