import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { toast } from "sonner";
import { Shield } from "lucide-react";
import AdminUnifiedEvents from "@/pages/unified/_components/AdminUnifiedEvents.tsx";

export default function Admin() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <AdminContent />
    </div>
  );
}

function AdminContent() {
  const user = useQuery(api.users.getCurrentUser, {});
  const promote = useMutation(api.users.promoteFirstUserToAdmin);

  if (!user) return null;

  if (user.role !== "admin") {
    return (
      <div className="text-center py-20 space-y-4">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
        <h2 className="text-xl font-bold">Admin Access Required</h2>
        <p className="text-muted-foreground text-sm">You need admin privileges to access this panel.</p>
        <Button
          size="sm"
          onClick={async () => {
            try {
              await promote({});
              toast.success("You are now an admin. Refresh the page.");
            } catch {
              toast.error("Failed to promote to admin");
            }
          }}
        >
          Claim Admin (First Run)
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage sources, unified events, and platform settings</p>
      </div>

      <div className="border-t border-border pt-8">
        <AdminUnifiedEvents />
      </div>

      <div className="border-t border-border pt-8">
        <SourcesManager />
      </div>
    </div>
  );
}

function SourcesManager() {
  const sources = useQuery(api.sources.listSources, {});
  const toggleSource = useMutation(api.sources.toggleSource);

  if (!sources) return null;

  const grouped = {
    government: sources.filter(s => s.category === "government"),
    research: sources.filter(s => s.category === "research"),
    news: sources.filter(s => s.category === "news"),
  };

  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-lg">RSS Sources</h2>
      {(Object.entries(grouped) as [string, typeof sources[number][]][]).map(([cat, srcs]) => (
        <div key={cat} className="space-y-2">
          <h3 className="text-sm font-medium capitalize text-muted-foreground uppercase tracking-wider">{cat}</h3>
          <div className="rounded-xl border border-border overflow-hidden">
            {srcs.map((source, i) => (
              <div key={source._id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                <div>
                  <div className="text-sm font-medium">{source.name}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate max-w-xs">{source.url}</div>
                </div>
                <button
                  onClick={() => toggleSource({ id: source._id, enabled: !source.enabled })}
                  className={`text-xs px-3 py-1 rounded-full border cursor-pointer transition-colors ${
                    source.enabled
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {source.enabled ? "Enabled" : "Disabled"}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
