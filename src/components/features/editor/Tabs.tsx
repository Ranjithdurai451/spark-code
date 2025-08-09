import { useEditorStore, languages, Language, getLanguageConfig } from "@/components/features/editor/editorStore";
import { Button } from "@/components/ui/button";
import { DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Plus, X, Edit2, Code, MoreVertical, Code2 } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Validation function for filename
function validateFileName(name: string, language: Language): string | null {
  if (!name.trim()) return "Filename cannot be empty";

  const config = languages.find((l) => l.name === language);
  if (!config) return "Invalid language selected";

  const expectedExtension = config.extension;

  // Check if filename ends with correct extension
  if (!name.endsWith(`.${expectedExtension}`)) {
    return `Filename must end with .${expectedExtension}`;
  }

  // For Java, check if first letter is capitalized
  if (language === "java") {
    const baseName = name.slice(0, name.lastIndexOf(`.${expectedExtension}`));
    if (baseName.length === 0 || baseName[0] !== baseName[0].toUpperCase()) {
      return "Java class name must start with a capital letter";
    }
  }

  // For TypeScript, check if it's a valid identifier
  if (language === "typescript") {
    const baseName = name.slice(0, name.lastIndexOf(`.${expectedExtension}`));
    if (baseName.length === 0 || !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(baseName)) {
      return "TypeScript filename must be a valid identifier";
    }
  }

  return null;
}

interface TabsProps {
  onFormatCode: () => void;
  isFormatting: boolean;
}

export default function Tabs({ onFormatCode, isFormatting }: TabsProps) {
  const { tabs, activeTabId, setActiveTabId, addTab, removeTab, updateTab, isFormatSupported } =
    useEditorStore();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [selectedTabId, setSelectedTabId] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newLang, setNewLang] = useState<Language>(languages[0].name);
  const [error, setError] = useState<string | null>(null);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const activeConfig = activeTab ? getLanguageConfig(activeTab.language) : null;

  const handleAddTab = () => {
    const validationError = validateFileName(newName.trim(), newLang);
    if (validationError) {
      setError(validationError);
      return;
    }

    const config = languages.find((l) => l.name === newLang)!;
    addTab({
      name: newName.trim(),
      language: newLang,
      code: config.defaultCode,
    });
    setShowNewDialog(false);
    setNewName("");
    setError(null);
  };

  const handleRename = () => {
    if (!selectedTabId) return;

    const currentTab = tabs.find(tab => tab.id === selectedTabId);
    if (!currentTab) return;

    const validationError = validateFileName(newName.trim(), currentTab.language);
    if (validationError) {
      setError(validationError);
      return;
    }

    updateTab(selectedTabId, { name: newName.trim() });
    setShowRenameDialog(false);
    setNewName("");
    setError(null);
  };

  const handleLanguageChange = () => {
    if (!selectedTabId) return;
    const config = languages.find((l) => l.name === newLang)!;
    updateTab(selectedTabId, {
      language: newLang,
      name: config.filename,
      code: config.defaultCode,
    });
    setShowLanguageDialog(false);
  };

  const openRenameDialog = (tabId: string, currentName: string) => {
    setSelectedTabId(tabId);
    setNewName(currentName);
    setError(null);
    setShowRenameDialog(true);
  };

  const openLanguageDialog = (tabId: string, currentLang: Language) => {
    setSelectedTabId(tabId);
    setNewLang(currentLang);
    setShowLanguageDialog(true);
  };

  const resetNewDialog = () => {
    setShowNewDialog(false);
    setNewName("");
    setNewLang(languages[0].name);
    setError(null);
  };

  const resetRenameDialog = () => {
    setShowRenameDialog(false);
    setNewName("");
    setSelectedTabId("");
    setError(null);
  };

  // Generate suggested filename based on language
  const getSuggestedFilename = (language: Language) => {
    const config = languages.find((l) => l.name === language);
    return config?.filename || "";
  };

  // Update suggested filename when language changes in new dialog
  const handleLanguageChangeInNewDialog = (language: Language) => {
    setNewLang(language);
    if (!newName || newName === getSuggestedFilename(newLang)) {
      setNewName(getSuggestedFilename(language));
    }
    if (error) setError(null);
  };

  // Get tooltip content based on format support and state
  const getTooltipContent = () => {
    if (!activeConfig) {
      return "No active file";
    }

    if (isFormatting) {
      return "Formatting code...";
    }

    if (!activeConfig.formatSupported) {
      return `Code formatting not yet supported for ${activeConfig.displayName}`;
    }

    return "Format Code (Ctrl+Shift+F)";
  };

  const formatSupported = isFormatSupported();

  return (
    <TooltipProvider>
      <div className="relative border-b border-border bg-muted/50">
        <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-muted/60 scrollbar-track-transparent">
          {tabs.map((tab) => {
            const config = languages.find((l) => l.name === tab.language);
            return (
              <div
                key={tab.id}
                className={`relative flex items-center group px-3 min-w-[140px] max-w-[220px] h-9
                  transition-all duration-200 cursor-pointer border-r border-border/50
                  ${activeTabId === tab.id
                    ? "bg-background text-foreground font-medium shadow-sm"
                    : "text-muted-foreground bg-muted/30 hover:bg-muted/70 hover:text-foreground"
                  }`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <span className="overflow-hidden text-sm text-ellipsis whitespace-nowrap flex-1 mr-2">
                  {tab.name}
                </span>

                <span className="text-xs opacity-60 capitalize px-1 py-0.5 bg-muted/60 rounded text-[10px] font-medium mr-1">
                  {config?.displayName || tab.language}
                </span>

                {/* Three dots dropdown menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="ml-1 p-1 rounded hover:bg-accent/60 opacity-0 group-hover:opacity-100 transition-all duration-200 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <MoreVertical size={12} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => openRenameDialog(tab.id, tab.name)}
                      className="cursor-pointer"
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      Rename File
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => openLanguageDialog(tab.id, tab.language)}
                      className="cursor-pointer"
                    >
                      <Code className="mr-2 h-4 w-4" />
                      Change Language
                    </DropdownMenuItem>
                    {tabs.length > 1 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => removeTab(tab.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Close File
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Close button */}
                {tabs.length > 1 && (
                  <button
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 rounded hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-400 focus-visible:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTab(tab.id);
                    }}
                    title="Close file"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add new tab button */}
          <button
            className="ml-2 px-3 flex items-center justify-center h-9 bg-background hover:bg-accent/70 transition-colors duration-200 border border-border/50 hover:border-border rounded-sm"
            onClick={() => {
              setNewName(getSuggestedFilename(languages[0].name));
              setShowNewDialog(true);
            }}
            title="Create new file"
          >
            <Plus size={16} />
          </button>

          {/* Format Code Button - Integrated in tabs area with better disabled state */}
          <div className="ml-auto flex items-center px-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-block">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={formatSupported ? onFormatCode : undefined}
                    disabled={isFormatting || !formatSupported}
                    className={`h-7 px-2 text-xs transition-all duration-200 ${formatSupported
                      ? "opacity-70 hover:opacity-100 hover:bg-accent/60 cursor-pointer"
                      : "opacity-40 cursor-not-allowed hover:bg-transparent"
                      }`}
                    style={!formatSupported ? { pointerEvents: 'none' } : {}}
                  >
                    {isFormatting ? (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Code2
                        className={`w-3 h-3 transition-all duration-200 ${!formatSupported ? 'text-muted-foreground/50' : ''
                          }`}
                      />
                    )}
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                <div className="text-center">
                  {getTooltipContent()}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* New Tab Dialog */}
      <Dialog open={showNewDialog} onOpenChange={(open) => !open && resetNewDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Language</label>
              <Select
                value={newLang}
                onValueChange={(value: Language) => handleLanguageChangeInNewDialog(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map(({ name, displayName }) => (
                    <SelectItem key={name} value={name}>
                      {displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Filename</label>
              <Input
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={getSuggestedFilename(newLang)}
                className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {error}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetNewDialog}>
                Cancel
              </Button>
              <Button onClick={handleAddTab} className="min-w-20">
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={(open) => !open && resetRenameDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">New filename</label>
              <Input
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="new filename"
                autoFocus
                className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {error}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetRenameDialog}>
                Cancel
              </Button>
              <Button onClick={handleRename} className="min-w-20">
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Language Change Dialog */}
      <Dialog open={showLanguageDialog} onOpenChange={setShowLanguageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Language</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select language</label>
              <Select
                value={newLang}
                onValueChange={(value: Language) => setNewLang(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map(({ name, displayName }) => (
                    <SelectItem key={name} value={name}>
                      {displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                ⚠️ This will reset the code to the default template
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowLanguageDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleLanguageChange} className="min-w-20">
                Change
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
