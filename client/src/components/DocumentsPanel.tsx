import { useRef, useState } from "react";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Trash2,
  Download,
  File,
  FileImage,
  FileSpreadsheet,
  Loader2,
  X,
} from "lucide-react";

const DOC_TYPES = [
  { value: "rapport", label: "Rapport" },
  { value: "offerte", label: "Offerte" },
  { value: "factuur", label: "Factuur" },
  { value: "keuring", label: "Keuring" },
  { value: "foto", label: "Foto" },
  { value: "overig", label: "Overig" },
] as const;

function fileIcon(mime: string | null) {
  if (!mime) return <File className="w-4 h-4 text-slate-400" />;
  if (mime.startsWith("image/")) return <FileImage className="w-4 h-4 text-blue-400" />;
  if (mime.includes("pdf")) return <FileText className="w-4 h-4 text-red-400" />;
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv"))
    return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
  return <File className="w-4 h-4 text-slate-400" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function DocumentsPanel({ propertyId, isAdmin }: { propertyId: number; isAdmin: boolean }) {
  const { data: docs = [], refetch } = trpc.documents.list.useQuery({ propertyId });
  const deleteDoc = trpc.documents.delete.useMutation({
    onSuccess: () => { toast.success("Document verwijderd"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<string>("overig");
  const [docTitle, setDocTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Bestand mag maximaal 20 MB zijn");
      return;
    }
    setSelectedFile(file);
    if (!docTitle) setDocTitle(file.name.replace(/\.[^.]+$/, ""));
    setShowForm(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      form.append("propertyId", String(propertyId));
      form.append("type", docType);
      form.append("title", docTitle || selectedFile.name);

      const res = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload mislukt");

      toast.success("Document geüpload");
      setSelectedFile(null);
      setDocTitle("");
      setDocType("overig");
      setShowForm(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload mislukt");
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setDocTitle("");
    setDocType("overig");
    setShowForm(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      {/* Upload area — admin only */}
      {isAdmin && (
        <div>
          {!showForm ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-6 text-sm text-slate-500 hover:border-[#1E3A5F]/40 hover:text-[#1E3A5F] hover:bg-slate-50 transition-all"
            >
              <Upload className="w-4 h-4" />
              Klik om een document te uploaden (max 20 MB)
            </button>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedFile && fileIcon(selectedFile.type)}
                  <span className="text-sm font-medium text-slate-700 truncate max-w-xs">
                    {selectedFile?.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {selectedFile ? formatBytes(selectedFile.size) : ""}
                  </span>
                </div>
                <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Titel</label>
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Naam van het document"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]"
                  >
                    {DOC_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-3 py-1.5 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] transition-colors disabled:opacity-60 flex items-center gap-1.5"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? "Uploaden..." : "Uploaden"}
                </button>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.zip"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Documents list */}
      {docs.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Nog geen documenten</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 py-3">
              <div className="flex-shrink-0">{fileIcon(doc.mimeType)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{doc.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-400 capitalize">
                    {DOC_TYPES.find((t) => t.value === doc.type)?.label || doc.type}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-400">
                    {new Date(doc.createdAt).toLocaleDateString("nl-NL")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-400 hover:text-[#1E3A5F] hover:bg-slate-100 rounded-lg transition-colors"
                  title="Openen / downloaden"
                >
                  <Download className="w-4 h-4" />
                </a>
                {isAdmin && (
                  <button
                    onClick={() => {
                      if (confirm(`"${doc.title}" verwijderen?`)) {
                        deleteDoc.mutate({ id: doc.id });
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Verwijderen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
