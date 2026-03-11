import { useState } from "react";
import { Pause, Play, CheckCircle, Plus, Trash2, X, Settings2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useProjects, useCalendarMappings, type Project, type ControllableFocus } from "@/hooks/useProjects";
import { CONTROLLABLE_LIST } from "@/lib/controllableTheme";

const PROJECT_EMOJIS = ["🎯", "💪", "📚", "🏃", "✍️", "🧘", "💼", "🎨", "🌱", "🔥", "🧠", "💡", "🏠", "🤝", "📈", "🎵", "🍎", "⚡", "🛠️", "🌟"];
const PROJECT_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#059669", "#f59e0b", "#f43f5e", "#8b5cf6", "#64748b"];

interface ProjectManagerProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  seasonId?: string | null;
}

export function ProjectManager({ open, onClose, userId, seasonId }: ProjectManagerProps) {
  const { projects, activeProjects, canAddProject, createProject, updateProject, deleteProject } = useProjects(userId, seasonId);
  const { mappings, createMapping, deleteMapping } = useCalendarMappings(userId);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("🎯");
  const [newColor, setNewColor] = useState("#6366f1");
  const [newControllable, setNewControllable] = useState<ControllableFocus>("habit");

  const [mappingProjectId, setMappingProjectId] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState("");

  const handleCreate = async () => {
    if (!newName.trim() || !canAddProject) return;
    await createProject.mutateAsync({
      user_id: userId,
      name: newName.trim(),
      emoji: newEmoji,
      color_hex: newColor,
      controllable: newControllable,
      season_id: seasonId || null,
    });
    setNewName("");
    setShowCreate(false);
  };

  const handleStatusChange = (project: Project, status: "active" | "paused" | "complete") => {
    updateProject.mutate({ id: project.id, status } as any);
  };

  const handleAddMapping = async (projectId: string) => {
    if (!newKeyword.trim()) return;
    await createMapping.mutateAsync({
      user_id: userId,
      project_id: projectId,
      calendar_event_keyword: newKeyword.trim(),
    });
    setNewKeyword("");
    setMappingProjectId(null);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Projects
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Active projects */}
          {projects.map((project) => {
            const projectMappings = mappings.filter(m => m.project_id === project.id);
            return (
              <div
                key={project.id}
                className="rounded-lg border p-3 space-y-2"
                style={{ borderLeftColor: project.color_hex, borderLeftWidth: 3 }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{project.emoji}</span>
                  <span className="font-medium text-sm text-foreground flex-1">{project.name}</span>
                  {project.controllable && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {CONTROLLABLE_LIST.find(c => c.type === project.controllable)?.emoji} {project.controllable}
                    </span>
                  )}
                </div>

                <Progress value={project.momentum_score} className="h-1.5" />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Momentum {project.momentum_score}%</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${project.status === "active" ? "bg-primary/10 text-primary" : project.status === "paused" ? "bg-muted text-muted-foreground" : "bg-accent/10 text-accent-foreground"}`}>
                    {project.status}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 pt-1">
                  {project.status === "active" && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(project, "paused")}>
                      <Pause className="w-3 h-3 mr-1" /> Pause
                    </Button>
                  )}
                  {project.status === "paused" && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(project, "active")}>
                      <Play className="w-3 h-3 mr-1" /> Resume
                    </Button>
                  )}
                  {project.status !== "complete" && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(project, "complete")}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Complete
                    </Button>
                  )}
                </div>

                {/* Calendar mappings */}
                <div className="pt-1 border-t border-border/50">
                  <p className="text-[10px] text-muted-foreground mb-1">Calendar keywords</p>
                  <div className="flex flex-wrap gap-1">
                    {projectMappings.map(m => (
                      <span key={m.id} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                        "{m.calendar_event_keyword}"
                        <button onClick={() => deleteMapping.mutate(m.id)} className="text-muted-foreground hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  {mappingProjectId === project.id ? (
                    <div className="flex gap-1.5 mt-1.5">
                      <Input
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        placeholder="e.g. Deep Work"
                        className="h-7 text-xs"
                        onKeyDown={(e) => e.key === "Enter" && handleAddMapping(project.id)}
                      />
                      <Button size="sm" className="h-7 text-xs" onClick={() => handleAddMapping(project.id)}>Add</Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setMappingProjectId(project.id)}
                      className="text-[10px] text-primary hover:underline mt-1"
                    >
                      + Add keyword
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Create new project */}
          {!showCreate ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCreate(true)}
              disabled={!canAddProject}
            >
              <Plus className="w-4 h-4 mr-2" />
              {canAddProject ? "Add Project" : "5 active projects max"}
            </Button>
          ) : (
            <div className="rounded-lg border p-3 space-y-3">
              {!canAddProject && (
                <p className="text-xs text-amber-600 dark:text-amber-400">5 active projects keeps focus sharp. Complete or pause one to add another.</p>
              )}
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name"
                autoFocus
              />
              <div className="flex flex-wrap gap-1.5">
                {PROJECT_EMOJIS.map(e => (
                  <button key={e} onClick={() => setNewEmoji(e)} className={`w-7 h-7 rounded text-sm flex items-center justify-center ${newEmoji === e ? "bg-primary/15 ring-2 ring-primary" : "hover:bg-muted"}`}>{e}</button>
                ))}
              </div>
              <div className="flex gap-2">
                {PROJECT_COLORS.map(c => (
                  <button key={c} onClick={() => setNewColor(c)} className={`w-6 h-6 rounded-full ${newColor === c ? "ring-2 ring-offset-2 ring-primary" : ""}`} style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CONTROLLABLES.map(c => (
                  <button key={c.type} onClick={() => setNewControllable(c.type)} className={`text-xs px-2 py-1 rounded-full border ${newControllable === c.type ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button size="sm" disabled={!newName.trim() || !canAddProject || createProject.isPending} onClick={handleCreate}>
                  {createProject.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
