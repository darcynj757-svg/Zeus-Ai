import { useState, useEffect, useRef } from "react";
import { 
  useListProjects, 
  useCreateProject, 
  useGetProject, 
  useDeleteProject,
  useListMessages,
  useListFiles,
  useGenerateCode,
  useRefreshSandbox,
  getListMessagesQueryKey,
  getListFilesQueryKey,
  getGetProjectQueryKey,
  getListProjectsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Play, Send, Plus, Terminal, Code2, Loader2, FileCode2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Highlight, themes } from "prism-react-renderer";

export default function Home() {
  const queryClient = useQueryClient();
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const createdRef = useRef(false);
  
  const { data: projects, isLoading: projectsLoading } = useListProjects();
  const createProject = useCreateProject();
  
  useEffect(() => {
    if (projectsLoading || !projects) return;
    if (projects.length === 0 && !createdRef.current) {
      createdRef.current = true;
      createProject.mutate(
        { data: { name: "My First App" } },
        {
          onSuccess: (newProj) => {
            queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
            setActiveProjectId(newProj.id);
          },
          onError: () => {
            createdRef.current = false;
          }
        }
      );
    } else if (projects.length > 0 && !activeProjectId) {
      setActiveProjectId(projects[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, projectsLoading]);

  const { data: project } = useGetProject(activeProjectId as number, { query: { enabled: !!activeProjectId, queryKey: getGetProjectQueryKey(activeProjectId as number) } });
  
  if (projectsLoading || (!activeProjectId && projects?.length === 0)) {
    return <div className="flex h-screen w-full items-center justify-center bg-background text-foreground"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground overflow-hidden">
      <Header 
        projects={projects || []} 
        activeProjectId={activeProjectId} 
        onSelectProject={setActiveProjectId}
        projectName={project?.name || "Loading..."}
      />
      <div className="flex flex-1 overflow-hidden border-t border-border">
        {activeProjectId ? (
          <>
            <ChatPanel projectId={activeProjectId} />
            <CodePanel projectId={activeProjectId} />
            <PreviewPanel projectId={activeProjectId} previewUrl={project?.previewUrl} />
          </>
        ) : (
           <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        )}
      </div>
    </div>
  );
}

function Header({ projects, activeProjectId, onSelectProject, projectName }: any) {
  const queryClient = useQueryClient();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const handleNewProject = () => {
    createProject.mutate({ data: { name: "New App " + Math.floor(Math.random() * 100) } }, {
      onSuccess: (p) => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        onSelectProject(p.id);
      }
    });
  };

  const handleDelete = () => {
    if (!activeProjectId) return;
    deleteProject.mutate({ id: activeProjectId }, {
      onSuccess: () => {
        toast.success("Project deleted");
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        onSelectProject(null);
      }
    });
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between px-4 bg-sidebar border-b border-sidebar-border">
      <div className="flex items-center gap-2">
        <Terminal className="h-5 w-5 text-primary" />
        <span className="font-mono font-semibold tracking-tight">VIBE CODING</span>
      </div>
      <div className="flex flex-1 items-center justify-center">
         <span className="text-sm font-medium">{projectName}</span>
      </div>
      <div className="flex items-center gap-2">
        <Select value={activeProjectId?.toString()} onValueChange={(v) => onSelectProject(parseInt(v))}>
          <SelectTrigger className="w-[180px] h-8 text-xs font-mono bg-background border-border">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects?.map((p: any) => (
              <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="secondary" size="sm" className="h-8" onClick={handleNewProject}>
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={handleDelete} disabled={!activeProjectId || deleteProject.isPending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

function ChatPanel({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const { data: messages, isLoading } = useListMessages(projectId, { query: { enabled: !!projectId, queryKey: getListMessagesQueryKey(projectId) } });
  const generateCode = useGenerateCode();
  const [prompt, setPrompt] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, generateCode.isPending]);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    const userMsg = prompt;
    setPrompt("");
    generateCode.mutate({ id: projectId, data: { message: userMsg } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getListFilesQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      },
      onError: (err) => {
        toast.error("Failed to generate code.");
      }
    });
  };

  return (
    <div className="flex w-[350px] shrink-0 flex-col border-r border-border bg-sidebar relative z-10">
      <div className="flex h-10 items-center px-4 border-b border-sidebar-border bg-background/50">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">Terminal / Chat</span>
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="flex flex-col gap-4 pb-4">
          {messages?.length === 0 && !generateCode.isPending && (
            <div className="text-sm text-muted-foreground text-center mt-10 font-mono">
              Initialize your project. Describe what you want to build.
            </div>
          )}
          {messages?.map((msg: any) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className={`text-[10px] uppercase font-mono font-semibold ${msg.role === 'user' ? 'text-primary' : 'text-muted-foreground'}`}>
                  {msg.role}
                </span>
              </div>
              <div className={`text-sm rounded-md px-3 py-2 max-w-[90%] font-sans whitespace-pre-wrap ${
                msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground border border-border'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {generateCode.isPending && (
            <div className="flex flex-col items-start">
               <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[10px] uppercase font-mono font-semibold text-primary">
                  assistant
                </span>
              </div>
              <div className="text-sm rounded-md px-3 py-2 max-w-[90%] bg-secondary text-secondary-foreground border border-primary/50 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="font-mono text-xs animate-pulse">Generating...</span>
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
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            placeholder="Describe your app..."
            className="min-h-[80px] resize-none pr-10 font-sans text-sm bg-secondary/50 border-sidebar-border focus-visible:ring-primary"
            disabled={generateCode.isPending}
          />
          <Button 
            size="icon" 
            variant="ghost" 
            className="absolute bottom-2 right-2 h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
            onClick={handleGenerate}
            disabled={generateCode.isPending || !prompt.trim()}
          >
            {generateCode.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CodePanel({ projectId }: { projectId: number }) {
  const { data: files } = useListFiles(projectId, { query: { enabled: !!projectId, queryKey: getListFilesQueryKey(projectId) } });
  const [activeFile, setActiveFile] = useState<string | null>(null);

  useEffect(() => {
    if (files && files.length > 0 && (!activeFile || !files.find(f => f.path === activeFile))) {
      setActiveFile(files[0].path);
    }
  }, [files, activeFile]);

  const currentFile = files?.find(f => f.path === activeFile);

  const getLanguage = (path: string) => {
    if (path.endsWith('.tsx') || path.endsWith('.ts')) return 'tsx';
    if (path.endsWith('.jsx') || path.endsWith('.js')) return 'jsx';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.html')) return 'markup';
    return 'tsx';
  };

  return (
    <div className="flex flex-1 flex-col bg-background relative z-0">
      <div className="flex h-10 items-center overflow-x-auto border-b border-border bg-sidebar shrink-0 no-scrollbar">
        {files?.length === 0 && (
          <div className="px-4 text-xs text-muted-foreground font-mono">No files yet</div>
        )}
        {files?.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFile(f.path)}
            className={`flex items-center gap-2 h-full px-4 text-xs font-mono border-r border-sidebar-border transition-colors ${
              activeFile === f.path 
                ? 'bg-background text-primary border-t-2 border-t-primary' 
                : 'text-muted-foreground hover:bg-background/50 hover:text-foreground border-t-2 border-t-transparent'
            }`}
          >
            <FileCode2 className="h-3.5 w-3.5" />
            {f.path.split('/').pop()}
          </button>
        ))}
      </div>
      
      <div className="flex-1 overflow-auto bg-[#0d0d0f] relative text-sm">
        {currentFile ? (
          <Highlight theme={themes.vsDark} code={currentFile.content || ''} language={getLanguage(currentFile.path) as any}>
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
              <pre className={className} style={{ ...style, padding: '1rem', margin: 0, minHeight: '100%', backgroundColor: 'transparent' }}>
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

function PreviewPanel({ projectId, previewUrl }: { projectId: number, previewUrl?: string | null }) {
  const refreshSandbox = useRefreshSandbox();
  const queryClient = useQueryClient();
  const generateCode = useGenerateCode();

  const handleRefresh = () => {
    refreshSandbox.mutate({ id: projectId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      }
    });
  };

  return (
    <div className="flex w-[400px] shrink-0 flex-col border-l border-border bg-background relative z-10 xl:w-[500px]">
      <div className="flex h-10 items-center justify-between px-3 border-b border-border bg-sidebar">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
          <Play className="h-3.5 w-3.5" />
          Preview
        </div>
        <div className="flex items-center gap-2">
          {previewUrl && (
            <a 
              href={previewUrl} 
              target="_blank" 
              rel="noreferrer"
              className="text-xs text-primary hover:underline truncate max-w-[200px]"
            >
              {previewUrl.replace('https://', '')}
            </a>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-muted-foreground hover:text-primary"
            onClick={handleRefresh}
            disabled={refreshSandbox.isPending || !previewUrl}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshSandbox.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 bg-white relative">
        {previewUrl ? (
          <iframe 
            src={previewUrl} 
            className="w-full h-full border-0"
            title="Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-background">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Play className="h-6 w-6 text-muted-foreground ml-1" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">No preview available</h3>
            <p className="text-xs text-muted-foreground">Describe your app in the chat to get started.</p>
          </div>
        )}
        
        {generateCode.isPending && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <div className="text-sm font-mono font-semibold text-foreground">Deploying Sandbox...</div>
          </div>
        )}
      </div>
    </div>
  );
}
