import { useEditorStore, languages, Language } from "@/store/editorStore";
import { Plus, X, Edit2, Code } from "lucide-react";
import { useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "./ui/context-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";

export default function Tabs() {
  const { tabs, activeTabId, setActiveTabId, addTab, removeTab, updateTab } =
    useEditorStore();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [selectedTabId, setSelectedTabId] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newLang, setNewLang] = useState<Language>(languages[0].name);

  const handleAddTab = () => {
    if (!newName.trim()) return;
    const config = languages.find((l) => l.name === newLang)!;
    addTab({
      name: newName,
      language: newLang,
      code: config.defaultCode,
    });
    setShowNewDialog(false);
    setNewName("");
  };

  const handleRename = () => {
    if (!newName.trim() || !selectedTabId) return;
    updateTab(selectedTabId, { name: newName });
    setShowRenameDialog(false);
    setNewName("");
  };

  const handleLanguageChange = () => {
    if (!selectedTabId) return;
    const config = languages.find((l) => l.name === newLang)!;
    updateTab(selectedTabId, {
      language: newLang,
      name: config.filename,
      code: config.defaultCode, // Reset to default code for new language
    });
    setShowLanguageDialog(false);
  };

  const openRenameDialog = (tabId: string, currentName: string) => {
    setSelectedTabId(tabId);
    setNewName(currentName);
    setShowRenameDialog(true);
  };

  const openLanguageDialog = (tabId: string, currentLang: Language) => {
    setSelectedTabId(tabId);
    setNewLang(currentLang);
    setShowLanguageDialog(true);
  };

  return (
    <>
      <div className="relative border-b border-border bg-muted/80">
        <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-muted/60">
          {tabs.map((tab) => (
            <ContextMenu key={tab.id}>
              <ContextMenuTrigger>
                <div
                  className={`relative flex items-center group px-4 min-w-[120px] max-w-[200px] h-12 
                    transition-colors cursor-pointer border-r border-border
                    ${activeTabId === tab.id
                      ? "bg-background text-primary font-semibold"
                      : "text-muted-foreground bg-muted/80 hover:bg-background/80"
                    }`}
                  onClick={() => setActiveTabId(tab.id)}
                >
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-1">
                    {tab.name}
                  </span>
                  <span className="ml-2 text-xs opacity-60 capitalize">
                    {tab.language}
                  </span>
                  {tabs.length > 1 && (
                    <button
                      className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTab(tab.id);
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  onClick={() => openRenameDialog(tab.id, tab.name)}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Rename
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() => openLanguageDialog(tab.id, tab.language)}
                >
                  <Code className="mr-2 h-4 w-4" />
                  Change Language
                </ContextMenuItem>
                {tabs.length > 1 && (
                  <ContextMenuItem
                    onClick={() => removeTab(tab.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Close
                  </ContextMenuItem>
                )}
              </ContextMenuContent>
            </ContextMenu>
          ))}

          <button
            className="ml-2 px-3 flex items-center justify-center h-12 bg-background hover:bg-accent"
            onClick={() => setShowNewDialog(true)}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* New Tab Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New File</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="filename.ext"
            />
            <Select
              value={newLang}
              onValueChange={(value: Language) => setNewLang(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map(({ name }) => (
                  <SelectItem key={name} value={name}>
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowNewDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTab}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="new filename"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowRenameDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleRename}>Rename</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Language Change Dialog */}
      <Dialog open={showLanguageDialog} onOpenChange={setShowLanguageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Language</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Select
              value={newLang}
              onValueChange={(value: Language) => setNewLang(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map(({ name }) => (
                  <SelectItem key={name} value={name}>
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              ⚠️ This will reset the code to the default template
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowLanguageDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleLanguageChange}>Change</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
