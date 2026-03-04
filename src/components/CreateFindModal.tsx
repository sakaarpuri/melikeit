import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Link, Hash, Upload, Image as ImageIcon } from 'lucide-react';
import type { Section } from '../data/mockData';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

interface CreateFindModalProps {
  sections: Section[];
  initialUrl?: string;
  onClose: () => void;
  onSubmit: (find: {
    title: string;
    description: string;
    url: string;
    sectionId: string;
    subsectionName?: string;
    imageFile?: File;
  }) => void;
}

export default function CreateFindModal({ sections, initialUrl = '', onClose, onSubmit }: CreateFindModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState(initialUrl);
  const [sectionId, setSectionId] = useState('');
  const [subsectionName, setSubsectionName] = useState('');
  const [imageFile, setImageFile] = useState<File | undefined>(undefined);
  const [uploadError, setUploadError] = useState('');
  const [draggingFile, setDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const mySections = sections;

  const inputClass =
    'w-full px-3 py-2.5 rounded-lg bg-white border-2 border-ink text-sm text-ink placeholder-ink/40 focus:outline-none focus:border-pink';

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files are supported right now.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('File is too large. Maximum size is 10MB.');
      return;
    }
    setImageFile(file);
    setUploadError('');
  };

  const previewUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : undefined), [imageFile]);
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    setUrl(initialUrl);
  }, [initialUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !url.trim() && !imageFile) return;
    onSubmit({ title, description, url, sectionId, subsectionName: subsectionName.trim(), imageFile });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl border-2 border-ink shadow-retro-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b-2 border-ink bg-yellow rounded-t-xl">
          <h2 className="text-lg font-black text-ink uppercase tracking-wide">Add a Find</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border-2 border-ink hover:bg-white transition-colors text-ink"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="block text-xs font-black text-ink uppercase tracking-wider mb-1.5">
              <span className="flex items-center gap-1">
                <Link size={12} /> Link (start here)
              </span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-ink uppercase tracking-wider mb-1.5">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What did you find?"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-ink uppercase tracking-wider mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why should people check this out?"
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-ink uppercase tracking-wider mb-1.5">
              <span className="flex items-center gap-1">
                <ImageIcon size={12} /> Image (optional)
              </span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.currentTarget.value = '';
              }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDraggingFile(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDraggingFile(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDraggingFile(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFile(file);
              }}
              className={`rounded-lg border-2 border-dashed px-4 py-4 cursor-pointer transition-colors ${
                draggingFile ? 'border-pink bg-pink/10' : 'border-ink/40 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-ink">
                <Upload size={16} />
                Drag and drop an image, or click to upload
              </div>
              <p className="text-xs text-ink/60 mt-1">Maximum file size: 10MB</p>
            </div>
            {previewUrl && (
              <div className="mt-3">
                <img src={previewUrl} alt="Upload preview" className="w-full max-h-44 object-cover rounded-lg border-2 border-ink" />
                <button
                  type="button"
                  onClick={() => setImageFile(undefined)}
                  className="mt-2 text-xs font-bold text-ink/70 hover:text-ink"
                >
                  Remove image
                </button>
              </div>
            )}
            {uploadError && <p className="text-xs text-pink-dark mt-2 font-bold">{uploadError}</p>}
          </div>

          {mySections.length > 0 && (
            <div>
              <label className="block text-xs font-black text-ink uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1">
                  <Hash size={12} /> Add to Section (optional)
                </span>
              </label>
              <select
                value={sectionId}
                onChange={(e) => {
                  setSectionId(e.target.value);
                  if (!e.target.value) setSubsectionName('');
                }}
                className={inputClass}
              >
                <option value="">No section</option>
                {mySections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
              {!!sectionId && (
                <input
                  type="text"
                  value={subsectionName}
                  onChange={(e) => setSubsectionName(e.target.value)}
                  placeholder="Subsection (optional)"
                  className={`${inputClass} mt-2`}
                />
              )}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-ink bg-white border-2 border-ink hover:bg-yellow transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-black text-ink bg-pink border-2 border-ink shadow-retro hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-retro-lg transition-all"
            >
              Add Find
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
