"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileJson, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface InventoryUploadDialogProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onRefresh: () => Promise<void>;
}

export function InventoryUploadDialog({ isOpen, setIsOpen, onRefresh }: InventoryUploadDialogProps) {
    const { toast } = useToast();
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<{ inserted: number; updated: number } | null>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type === "application/json") {
            setFile(droppedFile);
            setResult(null);
        } else {
            toast({
                title: "Invalid File",
                description: "Please upload a valid JSON file.",
                variant: "destructive",
            });
        }
    }, [toast]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setResult(null);

        try {
            // 1. Read file as string
            const text = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = (e) => reject(new Error("Failed to read file"));
                reader.readAsText(file);
            });

            // 2. Parse JSON
            let json;
            try {
                json = JSON.parse(text);
            } catch (e) {
                throw new Error("Invalid JSON format. Please check the file content.");
            }

            // 3. Basic validation: ensure it's an array
            if (!Array.isArray(json)) {
                throw new Error("JSON must be an array of objects.");
            }

            // 4. API Request
            const response = await fetch("/api/inventory/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(json),
            });

            const data = await response.json();

            if (!response.ok) {
                let errorMessage = data.error || data.message || "Upload failed";

                // Enhanced validation error reporting
                if (data.details && typeof data.details === 'object') {
                    // If it's an array error (keys are indices), look at the first erroneous item
                    const indices = Object.keys(data.details).filter(k => k !== '_errors');
                    if (indices.length > 0) {
                        const firstError = data.details[indices[0]];
                        const fields = Object.keys(firstError).filter(k => k !== '_errors');
                        if (fields.length > 0) {
                            errorMessage = `Validation failed: Check ${fields.join(', ')} on your items`;
                        } else if (firstError._errors) {
                            errorMessage = `Validation failed: ${firstError._errors[0]}`;
                        }
                    }
                }

                throw new Error(errorMessage);
            }

            // 5. Update State
            setResult({
                inserted: data.insertedCount || 0,
                updated: data.updatedCount || 0,
            });

            toast({
                title: "Import Successful",
                description: `Processed ${data.processed} items.`,
            });

            // 6. Refresh Parent List
            await onRefresh();

            // Clear file for next potential upload
            setFile(null);

        } catch (error: any) {
            console.error("Bulk upload error:", error);
            toast({
                title: "Import Failed",
                description: error.message || "An unexpected error occurred during import.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const reset = () => {
        setFile(null);
        setResult(null);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && reset()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Bulk Inventory Upload</DialogTitle>
                    <DialogDescription>
                        Upload a JSON file containing an array of items.
                        Each item should have `name`, `category`, `base_price`, and `unit`.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {!result ? (
                        <div
                            className={`relative border-2 border-dashed rounded-xl p-8 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer
                ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
                ${file ? "bg-muted/30" : "bg-card"}
              `}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById("file-upload")?.click()}
                        >
                            <input
                                id="file-upload"
                                type="file"
                                className="hidden"
                                accept=".json"
                                onChange={handleFileSelect}
                                disabled={isUploading}
                            />

                            {file ? (
                                <div className="text-center space-y-2">
                                    <div className="bg-primary/10 p-3 rounded-full w-fit mx-auto">
                                        <FileJson className="h-8 w-8 text-primary" />
                                    </div>
                                    <p className="font-medium text-sm text-foreground">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-destructive h-auto p-0 hover:bg-transparent mt-1">
                                        Remove
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center space-y-2 pointer-events-none">
                                    <div className="bg-muted p-3 rounded-full w-fit mx-auto">
                                        <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <p className="font-medium text-sm text-foreground">Click to upload or drag & drop</p>
                                    <p className="text-xs text-muted-foreground">JSON files only</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="border border-emerald-500/20 bg-emerald-500/10 rounded-xl p-6 text-center space-y-3">
                            <div className="bg-emerald-500/20 p-3 rounded-full w-fit mx-auto">
                                <CheckCircle className="h-8 w-8 text-emerald-500" />
                            </div>
                            <h3 className="font-semibold text-emerald-700 dark:text-emerald-300">Import Complete!</h3>
                            <div className="flex justify-center gap-4 text-sm">
                                <div className="bg-background/50 px-3 py-1.5 rounded-md border border-border">
                                    <span className="font-bold text-foreground">{result.inserted}</span> New
                                </div>
                                <div className="bg-background/50 px-3 py-1.5 rounded-md border border-border">
                                    <span className="font-bold text-foreground">{result.updated}</span> Updated
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-between sm:gap-0 gap-2">
                    <Button variant="outline" onClick={reset} disabled={isUploading}>
                        {result ? "Close" : "Cancel"}
                    </Button>
                    {!result && (
                        <Button onClick={handleUpload} disabled={!file || isUploading}>
                            {isUploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                "Start Import"
                            )}
                        </Button>
                    )}
                    {result && (
                        <Button onClick={() => { setFile(null); setResult(null); }} variant="secondary">
                            Upload Another
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
