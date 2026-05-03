import { useState, useMemo } from "react";
import { usePaginatedQuery, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Label } from "@/components/ui/label.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import { formatDistanceToNow } from "date-fns";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Layers, Plus, Trash2, X, Search, CheckCircle2, Edit,
  AlertTriangle, AlertCircle, Users, Cpu, Globe, Shield, Tag,
  Building2, BookOpen, Newspaper, ChevronDown,
} from "lucide-react";
import { ConvexError } from "convex/values";

// ── Schema ────────────────────────────────────────────────────────────────────

const eventSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  summary: z.string().min(10, "Summary must be at least 10 characters"),
  cves: z.array(z.object({ value: z.string() })),
  malware: z.array(z.object({ value: z.string() })),
  threatActors: z.array(z.object({ value: z.string() })),
  victims: z.array(z.object({ value: z.string() })),
  technologies: z.array(z.object({ value: z.string() })),
  countries: z.array(z.object({ value: z.string() })),
  industries: z.array(z.object({ value: z.string() })),
});

type EventFormValues = z.infer<typeof eventSchema>;

const TAG_FIELD_DEFS = [
  { key: "cves" as const, label: "CVEs", icon: AlertTriangle, color: "text-red-400", placeholder: "CVE-2024-1234" },
  { key: "malware" as const, label: "Malware", icon: AlertCircle, color: "text-orange-400", placeholder: "LockBit 3.0" },
  { key: "threatActors" as const, label: "Threat Actors", icon: Users, color: "text-yellow-400", placeholder: "APT29" },
  { key: "victims" as const, label: "Victims / Targets", icon: Tag, color: "text-pink-400", placeholder: "Financial sector" },
  { key: "technologies" as const, label: "Technologies", icon: Cpu, color: "text-cyan-400", placeholder: "Windows Server" },
  { key: "countries" as const, label: "Countries", icon: Globe, color: "text-green-400", placeholder: "United States" },
  { key: "industries" as const, label: "Industries", icon: Shield, color: "text-purple-400", placeholder: "Healthcare" },
];

const CAT_CONFIG = {
  government: { label: "Gov", icon: Building2, color: "text-blue-400" },
  research: { label: "Research", icon: BookOpen, color: "text-violet-400" },
  news: { label: "News", icon: Newspaper, color: "text-amber-400" },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminUnifiedEvents() {
  return (
    <div className="space-y-6">
      <AdminUnifiedEventsContent />
    </div>
  );
}

function AdminUnifiedEventsContent() {
  const user = useQuery(api.users.getCurrentUser, {});
  const [editingEvent, setEditingEvent] = useState<Doc<"unifiedEvents"> | null>(null);
  const [showForm, setShowForm] = useState(false);

  if (!user) return <Skeleton className="h-40 w-full" />;
  if (user.role !== "admin") {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Admin access required to manage unified events.
      </div>
    );
  }

  const handleEdit = (event: Doc<"unifiedEvents">) => {
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleClose = () => {
    setEditingEvent(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          Unified Events
        </h2>
        <Button size="sm" onClick={() => { setEditingEvent(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> New Event
        </Button>
      </div>

      {showForm && (
        <EventForm
          existingEvent={editingEvent}
          onClose={handleClose}
        />
      )}

      <ExistingEventsList onEdit={handleEdit} />
    </div>
  );
}

// ── Event Form ────────────────────────────────────────────────────────────────

function EventForm({
  existingEvent,
  onClose,
}: {
  existingEvent: Doc<"unifiedEvents"> | null;
  onClose: () => void;
}) {
  const createEvent = useMutation(api.unifiedEvents.createUnifiedEvent);
  const updateEvent = useMutation(api.unifiedEvents.updateUnifiedEvent);
  const [selectedArticleIds, setSelectedArticleIds] = useState<Id<"articles">[]>(
    existingEvent?.articleIds ?? []
  );
  const [submitting, setSubmitting] = useState(false);

  const defaultValues: EventFormValues = existingEvent
    ? {
        title: existingEvent.title,
        summary: existingEvent.summary,
        cves: existingEvent.cves.map(v => ({ value: v })),
        malware: existingEvent.malware.map(v => ({ value: v })),
        threatActors: existingEvent.threatActors.map(v => ({ value: v })),
        victims: existingEvent.victims.map(v => ({ value: v })),
        technologies: existingEvent.technologies.map(v => ({ value: v })),
        countries: existingEvent.countries.map(v => ({ value: v })),
        industries: existingEvent.industries.map(v => ({ value: v })),
      }
    : {
        title: "", summary: "",
        cves: [], malware: [], threatActors: [], victims: [],
        technologies: [], countries: [], industries: [],
      };

  const { register, control, handleSubmit, formState: { errors } } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues,
  });

  const onSubmit = async (data: EventFormValues) => {
    if (selectedArticleIds.length === 0) {
      toast.error("Select at least one article to map to this event");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: data.title,
        summary: data.summary,
        cves: data.cves.map(t => t.value).filter(Boolean),
        malware: data.malware.map(t => t.value).filter(Boolean),
        threatActors: data.threatActors.map(t => t.value).filter(Boolean),
        victims: data.victims.map(t => t.value).filter(Boolean),
        technologies: data.technologies.map(t => t.value).filter(Boolean),
        countries: data.countries.map(t => t.value).filter(Boolean),
        industries: data.industries.map(t => t.value).filter(Boolean),
        articleIds: selectedArticleIds,
      };
      if (existingEvent) {
        await updateEvent({ id: existingEvent._id, ...payload });
        toast.success("Unified event updated");
      } else {
        await createEvent(payload);
        toast.success("Unified event created");
      }
      onClose();
    } catch (e) {
      if (e instanceof ConvexError) {
        toast.error((e.data as { message: string }).message);
      } else {
        toast.error("Failed to save event");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          {existingEvent ? <Edit className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
          {existingEvent ? "Edit Unified Event" : "Create Unified Event"}
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Title */}
        <div className="space-y-1.5">
          <Label className="text-xs">Event Title</Label>
          <Input {...register("title")} placeholder="e.g. LockBit 3.0 Campaign Targeting Healthcare Sector" className="bg-background" />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        {/* Summary */}
        <div className="space-y-1.5">
          <Label className="text-xs">Summary</Label>
          <Textarea {...register("summary")} rows={3} placeholder="2–3 sentence summary of the unified incident…" className="bg-background resize-none" />
          {errors.summary && <p className="text-xs text-destructive">{errors.summary.message}</p>}
        </div>

        {/* Tag arrays */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TAG_FIELD_DEFS.map(def => (
            <TagArrayField key={def.key} control={control} fieldDef={def} />
          ))}
        </div>

        {/* Article picker */}
        <ArticlePicker
          selected={selectedArticleIds}
          onChange={setSelectedArticleIds}
          existingEventId={existingEvent?._id}
        />

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Saving…" : existingEvent ? "Update Event" : "Create Event"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── Tag array field ───────────────────────────────────────────────────────────

function TagArrayField({
  control,
  fieldDef,
}: {
  control: ReturnType<typeof useForm<EventFormValues>>["control"];
  fieldDef: typeof TAG_FIELD_DEFS[number];
}) {
  const { fields, append, remove } = useFieldArray({ control, name: fieldDef.key });
  const [newVal, setNewVal] = useState("");

  const addTag = () => {
    const v = newVal.trim();
    if (v) { append({ value: v }); setNewVal(""); }
  };

  return (
    <div className="space-y-1.5">
      <div className={cn("text-[10px] uppercase tracking-widest font-mono flex items-center gap-1.5", fieldDef.color)}>
        <fieldDef.icon className="w-3 h-3" />{fieldDef.label}
      </div>
      <div className="flex flex-wrap gap-1 mb-1 min-h-[24px]">
        {fields.map((f, i) => (
          <span key={f.id} className="flex items-center gap-1 text-[10px] font-mono bg-muted border border-border px-1.5 py-0.5 rounded">
            {f.value}
            <button type="button" onClick={() => remove(i)} className="hover:text-destructive cursor-pointer"><X className="w-2.5 h-2.5" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <Input
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          placeholder={fieldDef.placeholder}
          className="h-7 text-xs bg-background"
        />
        <Button type="button" size="sm" onClick={addTag} className="h-7 px-2 shrink-0">
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ── Article picker ────────────────────────────────────────────────────────────

function ArticlePicker({
  selected,
  onChange,
  existingEventId,
}: {
  selected: Id<"articles">[];
  onChange: (ids: Id<"articles">[]) => void;
  existingEventId?: Id<"unifiedEvents">;
}) {
  const unmapped = useQuery(api.unifiedEvents.getUnmappedArticles, { limit: 200 });
  const existingArticles = useQuery(
    api.articles.getArticlesByIds,
    selected.length > 0 ? { ids: selected } : "skip"
  );
  const [search, setSearch] = useState("");

  // Combine: unmapped articles + already-selected articles (which might be mapped to this event)
  const allAvailable = useMemo(() => {
    const map = new Map<string, Doc<"articles">>();
    for (const a of unmapped ?? []) map.set(a._id, a);
    for (const a of existingArticles ?? []) map.set(a._id, a);
    return [...map.values()];
  }, [unmapped, existingArticles]);

  const filtered = allAvailable.filter(a => {
    if (!search) return true;
    const text = (a.aiTitle ?? a.originalTitle).toLowerCase();
    return text.includes(search.toLowerCase()) || a.sourceName.toLowerCase().includes(search.toLowerCase());
  });

  const toggle = (id: Id<"articles">) => {
    onChange(selected.includes(id) ? selected.filter(i => i !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
        Map Articles ({selected.length} selected)
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search articles to map…"
          className="pl-8 h-8 text-xs bg-background"
        />
      </div>

      {!unmapped ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="rounded-lg border border-border overflow-auto max-h-56 bg-background">
          {filtered.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground">
              {search ? "No matching articles" : "No unmapped enriched articles available"}
            </div>
          )}
          {filtered.map(article => {
            const isSelected = selected.includes(article._id);
            const cfg = CAT_CONFIG[article.sourceCategory];
            return (
              <button
                key={article._id}
                type="button"
                onClick={() => toggle(article._id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 border-b border-border last:border-0 cursor-pointer transition-colors flex items-center gap-3",
                  isSelected ? "bg-primary/10" : "hover:bg-muted/40"
                )}
              >
                <CheckCircle2 className={cn("w-4 h-4 shrink-0", isSelected ? "text-primary" : "text-border")} />
                <cfg.icon className={cn("w-3.5 h-3.5 shrink-0", cfg.color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{article.aiTitle ?? article.originalTitle}</p>
                  <p className="text-[10px] text-muted-foreground">{article.sourceName}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Existing events list ──────────────────────────────────────────────────────

function ExistingEventsList({ onEdit }: { onEdit: (e: Doc<"unifiedEvents">) => void }) {
  const deleteEvent = useMutation(api.unifiedEvents.deleteUnifiedEvent);
  const { results, status, loadMore } = usePaginatedQuery(
    api.unifiedEvents.listUnifiedEvents,
    {},
    { initialNumItems: 10 }
  );

  const handleDelete = async (id: Id<"unifiedEvents">) => {
    try {
      await deleteEvent({ id });
      toast.success("Event deleted");
    } catch {
      toast.error("Failed to delete event");
    }
  };

  if (status === "LoadingFirstPage") {
    return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }
  if (results.length === 0) {
    return <div className="text-center py-8 text-sm text-muted-foreground">No unified events created yet.</div>;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs uppercase tracking-widest font-mono text-muted-foreground">All Events ({results.length})</h3>
      <div className="rounded-xl border border-border overflow-hidden">
        {results.map((event, i) => {
          const time = (() => {
            try { return formatDistanceToNow(new Date(event.updatedAt), { addSuffix: true }); }
            catch { return ""; }
          })();
          return (
            <div key={event._id} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t border-border")}>
              <Layers className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{event.title}</p>
                <p className="text-[10px] text-muted-foreground">{event.articleIds.length} sources · {time}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="secondary" className="h-7 px-2" onClick={() => onEdit(event)}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="secondary" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => handleDelete(event._id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {status === "CanLoadMore" && (
        <Button variant="secondary" size="sm" onClick={() => loadMore(10)}>
          <ChevronDown className="w-4 h-4 mr-1.5" /> Load more
        </Button>
      )}
    </div>
  );
}
