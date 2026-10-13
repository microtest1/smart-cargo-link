import { useState } from "react";
import { Search, Sparkles, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function SmartSearch() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Enter a search term",
        description: "Try tracking number, user code, product name, or container number",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("smart-search", {
        body: { query: query.trim() },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        toast({
          title: "Search Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setResult(data.result);
    } catch (error: any) {
      console.error("Smart search error:", error);
      toast({
        title: "Search Failed",
        description: error.message || "Unable to perform search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Smart Search
        </CardTitle>
        <CardDescription>
          Search by tracking number, user code, customer name, product, or container
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="e.g., AEF_JOHNDOE, CONT-2024-001, iPhone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Search"
            )}
          </Button>
        </div>

        {result && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap text-sm">{result}</div>
            </div>
          </div>
        )}

        {!result && !isSearching && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <p>Try searching for:</p>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              <span className="px-2 py-1 bg-muted rounded text-xs">AEF_YOURNAME</span>
              <span className="px-2 py-1 bg-muted rounded text-xs">CONT-2024-001</span>
              <span className="px-2 py-1 bg-muted rounded text-xs">iPhone</span>
              <span className="px-2 py-1 bg-muted rounded text-xs">John Doe</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
