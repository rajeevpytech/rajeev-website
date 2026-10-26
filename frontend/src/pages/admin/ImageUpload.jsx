import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2, X } from "lucide-react";
import { api } from "@/lib/api";

const API_BASE = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");

// Uploads an image to object storage and returns an absolute public URL via onChange.
export default function ImageUpload({ label, value, onChange, testid }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = () => ref.current?.click();

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/admin/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const url = String(data.url || "");
      onChange(/^https?:\/\//i.test(url) ? url : `${API_BASE}${url}`);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="rounded-lg border border-line p-2.5" data-testid={testid}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={pick} disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink text-white px-3 py-1.5 text-xs font-medium hover:bg-brand transition-colors disabled:opacity-50">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload
          </button>
          {value && (
            <button type="button" onClick={() => onChange("")} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line text-red-500 hover:border-red-400" aria-label="Remove image">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" onChange={upload} className="hidden" data-testid={testid ? `${testid}-input` : undefined} />
      <input
        className="mt-2 w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-xs outline-none focus:border-brand"
        aria-label={`${label} URL`}
        placeholder="…or paste an image URL"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && <img src={value} alt="preview" className="mt-2 h-24 w-full rounded-md object-cover border border-line" />}
    </div>
  );
}
