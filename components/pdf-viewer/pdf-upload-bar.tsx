"use client";

import React, { useRef, useState } from "react";

interface PdfUploadBarProps {
  onUploaded?: (payload: {
    fileName: string;
    objectKey: string;
    fileUrl: string | null;
  }) => void;
}

export function PdfUploadBar({ onUploaded }: PdfUploadBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState("");

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setStatus("Please choose a PDF file.");
      return;
    }

    setIsUploading(true);
    setStatus("Uploading PDF...");

    try {
      const signResponse = await fetch("/api/uploads/r2/sign", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    fileName: file.name,
    contentType: file.type,
  }),
});

const signText = await signResponse.text();
const signData = signText ? JSON.parse(signText) : null;

if (!signResponse.ok) {
  throw new Error(signData?.error || "Failed to get upload URL");
}

const uploadResponse = await fetch(signData.uploadUrl, {
  method: "PUT",
  headers: {
    "Content-Type": file.type,
  },
  body: file,
});

if (!uploadResponse.ok) {
  throw new Error("Direct upload to storage failed");
}

setStatus("Upload complete.");

onUploaded?.({
  fileName: signData.fileName,
  objectKey: signData.objectKey,
  fileUrl: signData.fileUrl,
});

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;

      if (!response.ok) {
        throw new Error(data?.error || "Upload failed");
      }

      setStatus("Upload complete.");

      onUploaded?.({
        fileName: data.fileName,
        objectKey: data.objectKey,
        fileUrl: data.fileUrl,
      });
    } catch (error) {
      console.error("PDF upload failed:", error);
      setStatus(
        error instanceof Error ? error.message : "Upload failed."
      );
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:border-zinc-700 disabled:opacity-50"
      >
        {isUploading ? "Uploading..." : "Open PDF"}
      </button>

      {status ? <div className="text-xs text-zinc-400">{status}</div> : null}
    </div>
  );
}