import { useState } from 'react';
import { Plus, Lock, Users, Trash2, Pencil } from 'lucide-react';
import type { ElementType } from 'react';
import type { Section, Visibility } from '../data/mockData';

const VISIBILITY_CONFIG = {
  specific_friends: { label: 'Private', icon: Lock, color: 'text-pink' },
  all_friends: { label: 'Friends', icon: Users, color: 'text-cyan' },
} satisfies Record<Visibility, { label: string; icon: ElementType; color: string }>;

interface SectionManagerProps {
  sections: Section[];
  onSectionClick?: (sectionId: string) => void;
  activeSectionId?: string;
  onCreateSection: (args: { name: string; visibility: Visibility }) => Promise<Section | null>;
  onRenameSection: (sectionId: string, nextName: string) => void;
  onDeleteSection: (sectionId: string) => void;
}

export default function SectionManager({
  sections,
  onSectionClick,
  activeSectionId,
  onCreateSection,
  onRenameSection,
  onDeleteSection,
}: SectionManagerProps) {
  const sectionList = sections;
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newVisibility, setNewVisibility] = useState<Visibility>('all_friends');

  const createSection = () => {
    if (!newName.trim()) return;
    void (async () => {
      const created = await onCreateSection({ name: newName, visibility: newVisibility });
      if (!created) return;
      setNewName('');
      setShowCreate(false);
    })();
  };

  const deleteSection = (id: string) => {
    onDeleteSection(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-ink/60 uppercase tracking-wider">My Sections</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="p-1 rounded-lg border-2 border-ink hover:bg-yellow transition-colors text-ink"
        >
          <Plus size={13} />
        </button>
      </div>

      {showCreate && (
        <div className="p-3 bg-white rounded-lg border-2 border-ink shadow-retro space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Section name..."
            className="w-full text-xs px-2 py-1.5 rounded-lg bg-gray-50 border-2 border-ink focus:outline-none focus:border-pink"
            onKeyDown={(e) => e.key === 'Enter' && createSection()}
          />
          <div className="grid grid-cols-2 gap-1">
            {(Object.keys(VISIBILITY_CONFIG) as Visibility[]).map((v) => {
              const conf = VISIBILITY_CONFIG[v];
              const Icon = conf.icon;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setNewVisibility(v)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                    newVisibility === v
                      ? 'bg-pink border-ink text-ink shadow-retro'
                      : 'bg-white border-ink text-ink hover:bg-yellow'
                  }`}
                >
                  <Icon size={10} />
                  <span>{conf.label}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={createSection}
            className="w-full text-xs py-1.5 rounded-lg bg-pink border-2 border-ink text-ink font-black hover:shadow-retro transition-all"
          >
            Create
          </button>
        </div>
      )}

      <div className="space-y-1">
        {sectionList.map((section) => {
          const conf = VISIBILITY_CONFIG[section.visibility];
          const Icon = conf.icon;
          const isActive = activeSectionId === section.id;

          return (
            <div
              key={section.id}
              className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all border-2 ${
                isActive
                  ? 'bg-ink text-white border-ink shadow-retro-pink'
                  : 'bg-white border-ink hover:bg-yellow'
              }`}
              onClick={() => onSectionClick?.(section.id)}
            >
              <Icon size={12} className={isActive ? 'text-white/70' : conf.color} />
              <span className={`flex-1 text-sm font-bold truncate ${isActive ? 'text-white' : 'text-ink'}`}>
                {section.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const nextName = window.prompt('Rename section', section.name);
                  if (!nextName || !nextName.trim()) return;
                  onRenameSection(section.id, nextName);
                }}
                className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity ${
                  isActive ? 'text-white/60 hover:text-white' : 'text-ink/40 hover:text-ink'
                }`}
              >
                <Pencil size={11} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }}
                className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity ${
                  isActive ? 'text-white/60 hover:text-red-300' : 'text-ink/40 hover:text-red-500'
                }`}
              >
                <Trash2 size={11} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
