"use client"
import { trpc } from "@/app/_trpc/client";
import UploadButton from "./UploadButton";
import { Ghost, Loader2, Calendar, Trash, FileText } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import Link from "next/link";
import { format } from 'date-fns'
import { useState } from "react";

const Dashboard = () => {
  const utils = trpc.useUtils();
  const [currentlyDeletingFile, setCurrentlyDeletingFile] = useState<string | null>(null);

  const { data: files, isLoading } = trpc.getUserFiles.useQuery();
  const { mutate: deleteFile } = trpc.deleteFile.useMutation({
    onSuccess: () => { utils.getUserFiles.invalidate() },
    onMutate({ id }) { setCurrentlyDeletingFile(id) },
    onSettled() { setCurrentlyDeletingFile(null) },
  });

  const sorted = files?.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ) ?? [];

  return (
    <main className="min-h-screen text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-12">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-slate-800 text-xs font-medium tracking-widest uppercase mb-1">Workspace</p>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Files</h1>
          </div>
          <UploadButton />
        </div>

        {/* Table header */}
        {sorted.length > 0 && (
          <div className="grid grid-cols-12 gap-4 px-4 mb-2 text-xs font-medium text-slate-800 uppercase tracking-wider">
            <span className="col-span-6">Name</span>
            <span className="col-span-5 hidden sm:block">Uploaded</span>
            <span className="col-span-1" />
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-slate-200 mb-1" />

        {/* File List */}
        {sorted.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {sorted.map((file) => (
              <li
                key={file.id}
                className="group grid grid-cols-12 gap-4 items-center px-4 py-3.5 hover:bg-slate-200 transition-colors duration-150 rounded-lg"
              >
                {/* Name */}
                <Link
                  href={`/dashboard/${file.id}`}
                  className="col-span-6 flex items-center gap-3 min-w-0"
                >
                  <div className="flex-shrink-0 h-8 w-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center group-hover:border-slate-300 transition-colors">
                    <FileText className="h-4 w-4 text-slate-800" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 truncate group-hover:text-slate-900 transition-colors">
                    {file.name}
                  </span>
                </Link>

                {/* Date */}
                <div className="col-span-5 hidden sm:flex items-center gap-2 text-sm text-slate-800">
                  <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                  {format(new Date(file.createdAt), 'MMM d, yyyy')}
                </div>

                {/* Delete */}
                <div className="col-span-6 sm:col-span-1 flex justify-end">
                  <button
                    onClick={() => deleteFile({ id: file.id })}
                    className="h-7 w-10 flex items-center justify-center rounded-md text-black hover:text-red-500 hover:bg-red-50 group-hover:opacity-100 transition-all duration-150"
                  >
                    {currentlyDeletingFile === file.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash className="h-3.5 w-3.5" />
                    }
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : isLoading ? (
          <ul className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="grid grid-cols-12 gap-4 items-center px-4 py-3.5">
                <div className="col-span-6 flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-md bg-slate-200 flex-shrink-0" />
                  <Skeleton className="h-4 w-48 bg-slate-200" />
                </div>
                <div className="col-span-3 hidden sm:block">
                  <Skeleton className="h-4 w-24 bg-slate-200" />
                </div>
                <div className="col-span-2 hidden sm:block">
                  <Skeleton className="h-4 w-12 bg-slate-200" />
                </div>
                <div className="col-span-1" />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 gap-3 text-center">
            <div className="h-14 w-14 rounded-xl bg-slate-200 border border-slate-200 flex items-center justify-center mb-1 shadow-sm">
              <Ghost className="h-7 w-7 text-slate-600" />
            </div>
            <h3 className="font-semibold text-lg text-slate-900">No files yet</h3>
            <p className="text-slate-800 text-sm max-w-xs">Upload a PDF to start chatting with your documents.</p>
          </div>
        )}

        {/* Footer count */}
        {sorted.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-800">
            {sorted.length} {sorted.length === 1 ? "file" : "files"}
          </div>
        )}
      </div>
    </main>
  );
};

export default Dashboard;