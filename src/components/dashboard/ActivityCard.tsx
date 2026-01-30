import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Zap,
  Clock,
  MoreVertical,
  ExternalLink,
  Trash2,
  Edit,
  Copy,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Activity } from "@/hooks/useActivities";

interface ActivityCardProps {
  activity: Activity;
  onDelete: (id: string) => Promise<boolean>;
  onDuplicate: (id: string) => Promise<any>;
}

const statusStyles: Record<string, string> = {
  deployed: "status-deployed",
  generating: "status-generating",
  generated: "status-generated",
  draft: "status-draft",
  failed: "status-failed",
};

const getStatusBadge = (status: string) => {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        statusStyles[status] || statusStyles.draft
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

export function ActivityCard({ activity, onDelete, onDuplicate }: ActivityCardProps) {
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = () => {
    setOpenDropdown(false);
    navigate(`/dashboard/activities/${activity.id}`);
  };

  const handleDuplicate = async () => {
    setOpenDropdown(false);
    await onDuplicate(activity.id);
  };

  const handleDeleteClick = () => {
    setOpenDropdown(false);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    await onDelete(activity.id);
    setIsDeleting(false);
    setDeleteDialogOpen(false);
  };

  // Get deployment info from extracted_requirements if available
  const deploymentUrl = (activity.extracted_requirements as any)?.deploymentUrl;
  const provider = (activity.extracted_requirements as any)?.provider;

  return (
    <>
      <div className="relative rounded-xl border border-border bg-card p-5 card-hover group">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <Link
                to={`/dashboard/activities/${activity.id}`}
                className="font-semibold hover:text-primary transition-colors"
              >
                {activity.name}
              </Link>
              <p className="text-xs text-muted-foreground">
                {activity.selected_version === "javascript" ? "JavaScript" : "Node.js"}
              </p>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(!openDropdown)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {openDropdown && (
              <div className="absolute right-0 top-8 w-40 bg-popover border border-border rounded-lg shadow-lg py-1 z-10">
                <button
                  onClick={handleEdit}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={handleDuplicate}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Duplicate
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {activity.description || (activity.extracted_requirements as any)?.activityDescription || "No description"}
        </p>

        {/* Status & Meta */}
        <div className="flex items-center justify-between">
          {getStatusBadge(activity.status)}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDate(activity.updated_at)}</span>
          </div>
        </div>

        {/* Provider & URL */}
        {deploymentUrl && (
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{provider}</span>
            <a
              href={deploymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Open <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{activity.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
