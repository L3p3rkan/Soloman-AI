import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useListBibleVersions, useDeleteBibleVersion, useGetBibleStats, getListBibleVersionsQueryKey, getGetBibleStatsQueryKey } from "@workspace/api-client-react";
import { BookOpen, Upload, Trash2, Book, FileText, Database } from "lucide-react";
import { UploadBibleDialog } from "@/components/upload-bible-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function LibraryPage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const { data: versions = [], isLoading: loadingVersions } = useListBibleVersions();
  const { data: stats, isLoading: loadingStats } = useGetBibleStats();
  const deleteVersion = useDeleteBibleVersion();
  const queryClient = useQueryClient();

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to remove this Bible version?")) {
      deleteVersion.mutate({ versionId: id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBibleVersionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetBibleStatsQueryKey() });
        }
      });
    }
  };

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto">
        <header className="h-14 border-b bg-background/95 backdrop-blur flex items-center px-6 sticky top-0 z-10">
          <h2 className="font-serif font-medium text-lg">Library Settings</h2>
        </header>

        <div className="p-6 max-w-5xl mx-auto space-y-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium font-sans text-muted-foreground">Total Versions</CardTitle>
                <BookOpen className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-serif">{loadingStats ? "-" : stats?.totalVersions || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium font-sans text-muted-foreground">Total Books</CardTitle>
                <Book className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-serif">{loadingStats ? "-" : stats?.totalBooks || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium font-sans text-muted-foreground">Total Verses</CardTitle>
                <FileText className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-serif">{loadingStats ? "-" : stats?.totalVerses?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-serif font-medium text-foreground">Available Translations</h3>
              <p className="text-sm text-muted-foreground mt-1">Manage the scriptures Solomon draws wisdom from.</p>
            </div>
            <Button onClick={() => setUploadOpen(true)} className="gap-2" data-testid="button-upload-bible">
              <Upload className="w-4 h-4" />
              Upload JSON
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingVersions ? (
              <div className="col-span-full py-12 text-center text-muted-foreground font-serif italic">
                Scanning archives...
              </div>
            ) : versions.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl border-muted">
                <Database className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-serif text-lg">No scriptures found</p>
                <p className="text-sm max-w-sm mx-auto mt-2">Upload a JSON Bible to begin your theological inquiries.</p>
              </div>
            ) : (
              versions.map((version) => (
                <Card key={version.id} className="relative group overflow-hidden border-border bg-card">
                  <CardHeader className="pb-3 pr-12">
                    <CardTitle className="font-serif text-lg text-primary">{version.name}</CardTitle>
                    <CardDescription className="text-xs uppercase tracking-wider">{version.abbreviation}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Books recorded</span>
                      <span className="font-medium text-foreground">{version.bookCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Verses indexed</span>
                      <span className="font-medium text-foreground">{version.verseCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 mt-2 border-t text-xs opacity-70">
                      <span>Archived on</span>
                      <span>{format(new Date(version.uploadedAt), "MMM d, yyyy")}</span>
                    </div>
                  </CardContent>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(version.id)}
                    data-testid={`button-delete-version-${version.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      <UploadBibleDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </Layout>
  );
}
