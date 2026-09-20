"use client";

import { trpc } from "@/app/_trpc/client";
import UploadButton from "./UploadButton";
import {
  AlertCircle,
  FileText,
  Ghost,
  Loader2,
  Trash2,
} from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";

type UploadStatus = "PENDING" | "PROCESSING" | "FAILED" | "SUCCESS";

/** Small badge shown only while a file is not yet ready to query. */
const StatusBadge = ({ status }: { status: UploadStatus }) => {
  if (status === "SUCCESS") return null;

  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
        <AlertCircle className="size-3" />
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <Loader2 className="size-3 animate-spin" />
      Processing
    </span>
  );
};

const Dashboard = () => {
  const utils = trpc.useUtils();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: files, isLoading } = trpc.getUserFiles.useQuery();
  const { mutate: deleteFile } = trpc.deleteFile.useMutation({
    onSuccess: () => utils.getUserFiles.invalidate(),
    onMutate: ({ id }) => setDeletingId(id),
    onSettled: () => setDeletingId(null),
  });

  const hasFiles = (files?.length ?? 0) > 0;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12 sm:py-16">
      <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Your documents
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasFiles
              ? `${files!.length} ${files!.length === 1 ? "document" : "documents"}`
              : "Upload a PDF to start asking questions."}
          </p>
        </div>
        <UploadButton />
      </div>

      {hasFiles ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {files!.map((file) => {
            const isDeleting = deletingId === file.id;

            return (
              <li
                key={file.id}
                className={cn(
                  "group relative flex items-center gap-4 px-4 py-3.5 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-muted/50",
                  isDeleting && "opacity-50"
                )}
              >
                <Link
                  href={`/dashboard/${file.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3.5 outline-none"
                >
                  {/* Covers the row so the whole thing is clickable, while the
                      delete button stays above it in the stacking order. */}
                  <span className="absolute inset-0 rounded-lg" />

                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground transition-colors group-hover:text-foreground">
                    <FileText className="size-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {file.name}
                      </span>
                      <StatusBadge status={file.uploadStatus as UploadStatus} />
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      <time
                        dateTime={new Date(file.createdAt).toISOString()}
                        title={format(new Date(file.createdAt), "PPpp")}
                      >
                        Added{" "}
                        {formatDistanceToNow(new Date(file.createdAt), {
                          addSuffix: true,
                        })}
                      </time>
                    </span>
                  </span>
                </Link>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${file.name}`}
                  disabled={isDeleting}
                  onClick={() => deleteFile({ id: file.id })}
                  className="relative z-10 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                >
                  {isDeleting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : isLoading ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3.5 px-4 py-3.5">
              <Skeleton className="size-9 shrink-0 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-52" />
                <Skeleton className="h-3 w-28" />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-20 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl border border-border bg-muted/40">
            <Ghost className="size-6 text-muted-foreground" />
          </span>
          <h3 className="font-medium">No documents yet</h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            Upload a PDF and it will be ready to answer questions in a few
            moments.
          </p>
        </div>
      )}
    </main>
  );
};

export default Dashboard;
