"use client";

import * as React from "react";
import {
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getStoredToken } from "@/store/auth-store";

const ACCEPT = "image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png";
const MAX_BYTES = 5 * 1024 * 1024;
const TYPE_ERROR = "Only JPG and PNG image formats are accepted";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isAllowedImage(f: File): boolean {
  const type = f.type.toLowerCase();
  if (type === "image/jpeg" || type === "image/jpg" || type === "image/png") return true;
  return /\.(jpe?g|png)$/i.test(f.name);
}

async function uploadWithProgress(
  file: File,
  onProgress: (pct: number) => void,
): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const fileData = btoa(binary);
  const mime =
    file.type === "image/jpg" ? "image/jpeg" : file.type || "image/jpeg";
  const body = JSON.stringify({
    fileName: file.name,
    fileType: mime,
    fileData,
  });

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/issues/upload");
    xhr.setRequestHeader("Content-Type", "application/json");
    const token = getStoredToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      else onProgress(50);
    };

    xhr.onload = () => {
      try {
        const j = JSON.parse(xhr.responseText) as { fileUrl?: string; message?: string };
        if (xhr.status >= 200 && xhr.status < 300 && j.fileUrl) {
          onProgress(100);
          resolve(j.fileUrl);
          return;
        }
        reject(new Error(j.message ?? "Upload failed"));
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(body);
  });
}

export type IssueFileUploadProps = {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
};

export function IssueFileUpload({
  value,
  onChange,
  disabled,
  onUploadingChange,
}: IssueFileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [status, setStatus] = React.useState<"idle" | "uploading" | "success" | "error">(
    value ? "success" : "idle",
  );
  const [error, setError] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);

  React.useEffect(() => {
    if (value) setStatus("success");
    else if (!file) setStatus("idle");
  }, [value, file]);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const validate = (f: File): string | null => {
    if (!isAllowedImage(f)) return TYPE_ERROR;
    if (f.size > MAX_BYTES) return "File exceeds 5MB limit";
    return null;
  };

  const clear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    setProgress(0);
    setError(null);
    setStatus("idle");
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const startUpload = async (f: File) => {
    const err = validate(f);
    if (err) {
      setError(err);
      setStatus("error");
      onChange(null);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setError(null);
    setProgress(0);
    setStatus("uploading");
    onUploadingChange?.(true);
    setPreviewUrl(URL.createObjectURL(f));

    try {
      const url = await uploadWithProgress(f, setProgress);
      onChange(url);
      setStatus("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setStatus("error");
      onChange(null);
    } finally {
      onUploadingChange?.(false);
    }
  };

  const onPick = (f: File | undefined) => {
    if (!f || disabled) return;
    void startUpload(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    onPick(e.dataTransfer.files?.[0]);
  };

  const showPreview = !!(file || value);

  return (
    <div className="space-y-2">
      {!showPreview && (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "rounded-md border-2 border-dashed px-4 py-8 text-center transition-colors cursor-pointer",
            dragOver
              ? "border-brand-primary bg-brand-primaryLight/50"
              : "border-border hover:border-brand-primary/50 hover:bg-surfaceElevated/50",
            disabled && "opacity-50 pointer-events-none",
          )}
        >
          <Upload className="size-8 mx-auto text-textMuted mb-2" />
          <p className="text-sm font-medium text-textPrimary">Drag & Drop or Click to Upload</p>
          <p className="text-xs text-textSecondary mt-1">JPG, PNG (max 5MB)</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        disabled={disabled}
        onChange={(e) => onPick(e.target.files?.[0])}
      />

      {showPreview && (
        <div className="rounded-md border border-border bg-surfaceElevated/40 p-3 space-y-3">
          <div className="flex items-start gap-3">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt=""
                className="h-14 w-14 rounded-md object-cover border border-border shrink-0"
              />
            ) : value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt=""
                className="h-14 w-14 rounded-md object-cover border border-border shrink-0"
              />
            ) : null}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file?.name ?? "Uploaded image"}</p>
              {file && (
                <p className="text-xs text-textSecondary tabular-nums">
                  {formatFileSize(file.size)}
                </p>
              )}
              {status === "success" && value && (
                <p className="text-xs text-success flex items-center gap-1 mt-1 font-medium">
                  <CheckCircle2 className="size-3.5" />
                  Uploaded
                </p>
              )}
              {status === "error" && error && (
                <p className="text-xs text-danger flex items-center gap-1 mt-1">
                  <AlertCircle className="size-3.5" />
                  {error}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8"
              onClick={clear}
              disabled={disabled || status === "uploading"}
            >
              <X className="size-4" />
            </Button>
          </div>

          {status === "uploading" && (
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-brand-primary transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-textSecondary text-right tabular-nums">{progress}%</p>
            </div>
          )}

          {status === "error" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => file && void startUpload(file)}
            >
              <RotateCcw className="size-3.5" />
              Retry
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
