import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getListBibleVersionsQueryKey, getGetBibleStatsQueryKey } from "@workspace/api-client-react";

interface UploadBibleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadBibleDialog({ open, onOpenChange }: UploadBibleDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name || !abbreviation) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("bible", file);
      formData.append("name", name);
      formData.append("abbreviation", abbreviation);

      const response = await fetch("/api/bible/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let detail = "There was an error uploading the Bible file.";
        try {
          const body = await response.json();
          if (body?.error) detail = body.error;
        } catch {}
        throw new Error(detail);
      }

      toast({
        title: "Upload Successful",
        description: `${name} has been added to your library.`,
      });
      
      queryClient.invalidateQueries({ queryKey: getListBibleVersionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetBibleStatsQueryKey() });
      onOpenChange(false);
      setFile(null);
      setName("");
      setAbbreviation("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "There was an error uploading the Bible file.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-serif">Add to Library</DialogTitle>
          <DialogDescription>
            Upload a Bible file (.json or .txt) to expand Solomon's wisdom.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleUpload} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Version Name</Label>
            <Input 
              id="name" 
              placeholder="e.g. King James Version" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required
              data-testid="input-version-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="abbreviation">Abbreviation</Label>
            <Input 
              id="abbreviation" 
              placeholder="e.g. KJV" 
              value={abbreviation} 
              onChange={(e) => setAbbreviation(e.target.value)} 
              required
              data-testid="input-version-abbr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">Bible File (.json or .txt)</Label>
            <Input 
              id="file" 
              type="file" 
              accept="application/json,.json,text/plain,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)} 
              required
              data-testid="input-version-file"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isUploading || !file || !name || !abbreviation}
              data-testid="button-submit-upload"
            >
              {isUploading ? "Uploading..." : "Upload Version"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
