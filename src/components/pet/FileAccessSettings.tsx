import { useEffect, useState } from "react";
import { FolderPlus, Trash2 } from "lucide-react";
import {
  getAccessState,
  grantFolder,
  revokeFolder,
  setAccessMode,
  type AccessMode,
  type AccessState,
} from "@/capabilities/access";
import { getFilesystemBridge } from "@/capabilities/filesystem-bridge";

const MODES: { id: AccessMode; label: string; hint: string }[] = [
  { id: "default", label: "Default folders", hint: "Desktop, Documents and Downloads only." },
  { id: "selected", label: "Folders I pick", hint: "Default folders plus folders you choose." },
  { id: "device", label: "Entire device", hint: "Only granted after the desktop app asks you." },
];

/**
 * User-controlled file access scope. Presentation only: every change is an
 * explicit user action, and the desktop shell re-validates each request.
 */
export function FileAccessSettings({ enabled }: { enabled: boolean }) {
  const [access, setAccess] = useState<AccessState>({ mode: "default", folders: [] });
  const [note, setNote] = useState<string | null>(null);
  const bridge = getFilesystemBridge();

  useEffect(() => setAccess(getAccessState()), []);

  const chooseMode = async (mode: AccessMode) => {
    setNote(null);
    if (mode === "device") {
      if (!bridge?.requestDeviceAccess) {
        setNote("Whole-device access is only available in the desktop app.");
        return;
      }
      const res = await bridge.requestDeviceAccess();
      if (!res.ok || !res.data.granted) {
        setNote("Whole-device access was not granted.");
        return;
      }
    }
    setAccessMode(mode);
    setAccess(getAccessState());
  };

  const addFolder = async () => {
    setNote(null);
    if (!bridge?.requestFolderAccess) {
      setNote("Picking folders is only available in the desktop app.");
      return;
    }
    const res = await bridge.requestFolderAccess();
    if (!res.ok || !res.data) {
      setNote("No folder was added.");
      return;
    }
    grantFolder(res.data);
    setAccessMode("selected");
    setAccess(getAccessState());
  };

  const drop = (id: string) => {
    revokeFolder(id);
    setAccess(getAccessState());
  };

  return (
    <div className={enabled ? "" : "pointer-events-none opacity-40"}>
      <p className="text-xs font-semibold text-foreground">File access</p>
      <div className="mt-1 space-y-1">
        {MODES.map((mode) => (
          <label key={mode.id} className="flex cursor-pointer items-start gap-2">
            <input
              type="radio"
              name="shatta-file-access"
              checked={access.mode === mode.id}
              onChange={() => void chooseMode(mode.id)}
              className="mt-0.5 accent-[var(--color-primary)]"
            />
            <span>
              <span className="block text-xs font-medium text-foreground">{mode.label}</span>
              <span className="block text-[11px] leading-tight text-muted-foreground">{mode.hint}</span>
            </span>
          </label>
        ))}
      </div>

      {access.folders.length ? (
        <ul className="mt-2 space-y-1">
          {access.folders.map((folder) => (
            <li key={folder.id} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate text-muted-foreground">{folder.label}</span>
              <button
                type="button"
                onClick={() => drop(folder.id)}
                aria-label={`Remove access to ${folder.label}`}
                className="text-muted-foreground transition hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={() => void addFolder()}
        className="mt-2 flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
      >
        <FolderPlus className="h-3.5 w-3.5" /> Add a folder
      </button>

      {note ? <p className="mt-2 text-[11px] text-muted-foreground">{note}</p> : null}
    </div>
  );
}
