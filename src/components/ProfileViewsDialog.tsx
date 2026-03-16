import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Eye, Stethoscope, Heart, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getProfileViews, type ProfileViewEntry } from "@/lib/patientApi";
import PartnerIcon from "@/components/icons/PartnerIcon";

interface ProfileViewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileViewsDialog({ open, onOpenChange }: ProfileViewsDialogProps) {
  const [views, setViews] = useState<ProfileViewEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
      getProfileViews()
        .then(setViews)
        .catch(() => setError("Failed to load profile views"))
        .finally(() => setLoading(false));
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Profile Views
          </DialogTitle>
          <DialogDescription>
            See who recently viewed your health profile. This history is private to you.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-destructive">{error}</div>
          ) : views.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Eye className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">No one has viewed your profile yet.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {views.map((view) => (
                <div key={view._id} className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border border-border">
                    {view.viewerAvatar && (
                      <AvatarImage src={view.viewerAvatar} alt={view.viewerName} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-primary/10">
                      {view.viewerRole === "doctor" ? (
                        <Stethoscope className="w-4 h-4 text-primary" />
                      ) : view.viewerRole === "asha" ? (
                        <Heart className="w-4 h-4 text-pink-500" />
                      ) : (
                        <PartnerIcon className="w-4 h-4 text-blue-500" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{view.viewerName}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {view.viewerRole}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                    {formatDistanceToNow(new Date(view.viewedAt), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
