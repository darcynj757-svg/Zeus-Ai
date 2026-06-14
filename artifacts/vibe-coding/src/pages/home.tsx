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
  Trash2, ExternalLink, Mic, MicOff, Zap, ArrowLeft, CheckCircle2,
} from "lucide-react";
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

export default function Home() {
  const queryClient = useQueryClient();
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const createdRef = useRef(false);
  const [streamState, setStreamState] = useState<StreamState>(initialStreamState);

  const { data: projects, isLoading: projectsLoading } = useListProjects();
  const createProject = useCreateProject();

  useEffect(() => {
    if (projectsLoading || !projects) return;
    if (projects.length === 0 && !createdRef.current) {
      createdRef.current = true;
      createProject.mutate(
        { data: { name: "Моё приложение" } },
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

  const handleGenerate = useCallback(
    async (projectId: number, message: string) => {
      setStreamState({ isStreaming: true, status: "Запускаю Зевса...", liveText: "", files: [], error: null });

      try {
        const response = await fetch(`/api/projects/${projectId}/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({ message }),
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
            setStreamState((s) => ({ ...s, isStreaming: false, status: "Готово ⚡" }));
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

  // Auto-submit prompt from landing page once project is ready
  const autoSubmitRef = useRef(false);
  useEffect(() => {
    if (!activeProjectId || autoSubmitRef.current) return;
    const saved = sessionStorage.getItem("zeus_initial_prompt");
    if (saved) {
      sessionStorage.removeItem("zeus_initial_prompt");
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
              streamState={streamState}
              onGenerate={handleGenerate}
            />
            <CodePanel projectId={activeProjectId} />
            <PreviewPanel
              projectId={activeProjectId}
              previewUrl={project?.previewUrl}
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

function extractApiError(err: unknown): string {
  if (!err) return "Неизвестная ошибка";
  if (err instanceof Error) {
    const match = err.message.match(/:\s*(.+)$/s);
    return match ? match[1].trim() : err.message;
  }
  return String(err);
}

function ChatPanel({
  projectId,
  streamState,
  onGenerate,
}: {
  projectId: number;
  streamState: StreamState;
  onGenerate: (projectId: number, message: string) => void;
}) {
  const { data: messages, isLoading } = useListMessages(projectId, {
    query: { enabled: !!projectId, queryKey: getListMessagesQueryKey(projectId) },
  });
  const [prompt, setPrompt] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamState.isStreaming, streamState.liveText, streamState.error]);


  const speech = useSpeechRecognition((text) => setPrompt(text));

  const handleGenerate = () => {
    if (!prompt.trim() || streamState.isStreaming) return;
    if (speech.isListening) speech.stop();
    const userMsg = prompt;
    setPrompt("");
    onGenerate(projectId, userMsg);
  };

  return (
    <div className="flex w-[350px] shrink-0 flex-col border-r border-border bg-sidebar relative z-10">
      <div className="flex h-10 items-center px-4 border-b border-sidebar-border bg-background/50">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">Чат</span>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="flex flex-col gap-4 pb-4">
          {messages?.length === 0 && !streamState.isStreaming && !streamState.error && (
            <div className="text-sm text-muted-foreground text-center mt-10 font-sans leading-relaxed">
              <div className="text-2xl mb-3">⚡</div>
              <div className="font-medium text-foreground/80 mb-1">Расскажи, что хочешь создать</div>
              <div className="text-xs text-muted-foreground/70">Можно писать или говорить голосом</div>
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

          {/* Live streaming block */}
          {streamState.isStreaming && (
            <div className="flex flex-col items-start gap-2">
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[10px] uppercase font-mono font-semibold text-primary">Zeus</span>
              </div>

              {/* Status bar */}
              <div className="w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 flex items-center gap-2">
                <span className="text-base animate-pulse shrink-0">⚡</span>
                <span className="text-xs font-mono text-primary font-medium truncate">{streamState.status}</span>
              </div>

              {/* Files list */}
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

              {/* Live token text (last ~200 chars) */}
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
            placeholder="Опиши своё приложение..."
            className="min-h-[80px] resize-none pr-20 font-sans text-sm bg-secondary/50 border-sidebar-border focus-visible:ring-primary"
            disabled={streamState.isStreaming}
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
                disabled={streamState.isStreaming}
              >
                {speech.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
              onClick={handleGenerate}
              disabled={streamState.isStreaming || !prompt.trim()}
            >
              {streamState.isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
    </div>
  );
}

function CodePanel({ projectId }: { projectId: number }) {
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

  const getLanguage = (path: string) => {
    if (path.endsWith(".tsx") || path.endsWith(".ts")) return "tsx";
    if (path.endsWith(".jsx") || path.endsWith(".js")) return "jsx";
    if (path.endsWith(".css")) return "css";
    if (path.endsWith(".json")) return "json";
    if (path.endsWith(".html")) return "markup";
    return "tsx";
  };

  return (
    <div className="flex flex-1 flex-col bg-background relative z-0">
      <div className="flex h-10 items-center overflow-x-auto border-b border-border bg-sidebar shrink-0 no-scrollbar">
        {(!files || files.length === 0) && (
          <div className="px-4 text-xs text-muted-foreground font-mono">Файлов пока нет</div>
        )}
        {files?.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFile(f.path)}
            className={`flex items-center gap-2 h-full px-4 text-xs font-mono border-r border-sidebar-border transition-colors ${
              activeFile === f.path
                ? "bg-background text-primary border-t-2 border-t-primary"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground border-t-2 border-t-transparent"
            }`}
          >
            <FileCode2 className="h-3.5 w-3.5" />
            {f.path.split("/").pop()}
          </button>
        ))}
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
          <div className="absolute inset-0 flex items-center justify-center">
            <Code2 className="h-12 w-12 text-muted-foreground/20" />
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewPanel({
  projectId,
  previewUrl,
  streamState,
}: {
  projectId: number;
  previewUrl?: string | null;
  streamState: StreamState;
}) {
  const refreshSandbox = useRefreshSandbox();
  const queryClient = useQueryClient();
  const { data: files } = useListFiles(projectId, {
    query: { enabled: !!projectId, queryKey: getListFilesQueryKey(projectId) },
  });

  const hasFiles = (files?.length ?? 0) > 0;

  const handleRefresh = () => {
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

  return (
    <div className="flex w-[400px] shrink-0 flex-col border-l border-border bg-background relative z-10 xl:w-[500px]">
      <div className="flex h-10 items-center justify-between px-3 border-b border-border bg-sidebar">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
          <Play className="h-3.5 w-3.5" />
          Превью
        </div>
        <div className="flex items-center gap-2">
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline truncate max-w-[160px]"
              title={previewUrl}
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate">{previewUrl.replace("https://", "")}</span>
            </a>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-primary"
            onClick={handleRefresh}
            disabled={refreshSandbox.isPending || !hasFiles}
            title={hasFiles ? "Переразвернуть в песочнице" : "Сначала сгенерируй код"}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshSandbox.isPending ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-white relative">
        {previewUrl ? (
          <iframe
            key={previewUrl}
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
            <p className="text-xs text-muted-foreground">Опиши своё приложение в чате — Zeus сделает всё сам.</p>
          </div>
        )}

        {/* Streaming overlay */}
        {streamState.isStreaming && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 gap-4 p-6">
            <div className="relative flex items-center justify-center">
              <span className="text-4xl animate-bounce">⚡</span>
            </div>
            <div className="text-sm font-mono font-semibold text-foreground text-center">
              {streamState.status}
            </div>
            {streamState.files.length > 0 && (
              <div className="w-full max-w-[200px] flex flex-col gap-1.5 mt-2">
                {streamState.files.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                    <span className="truncate">{f}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {refreshSandbox.isPending && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <div className="text-sm font-mono font-semibold text-foreground">Разворачиваю песочницу…</div>
          </div>
        )}
      </div>
    </div>
  );
}
