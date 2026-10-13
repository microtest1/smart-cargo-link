import { useState } from "react";
import { useCustomerWarehouseUpdates, useWarehouseSubmissionByTracking } from "@/hooks/useWarehouseSubmissions";
import { WarehouseUpdateCard } from "./WarehouseUpdateCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Package, Warehouse } from "lucide-react";

export function CustomerWarehouseUpdates() {
  const [searchTracking, setSearchTracking] = useState("");
  const [searchedTracking, setSearchedTracking] = useState("");
  
  const { updates, isLoading } = useCustomerWarehouseUpdates();
  const { submission: searchResult, isLoading: searching } = useWarehouseSubmissionByTracking(searchedTracking);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchedTracking(searchTracking);
  };

  return (
    <div className="space-y-6">
      {/* Search by Tracking */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="w-5 h-5" />
            Track Your Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Enter tracking number..."
                value={searchTracking}
                onChange={(e) => setSearchTracking(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={!searchTracking.trim() || searching}>
              {searching ? "Searching..." : "Search"}
            </Button>
          </form>

          {/* Search Result */}
          {searchedTracking && !searching && (
            <div className="mt-4">
              {searchResult ? (
                <WarehouseUpdateCard update={searchResult} />
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No warehouse update found for this tracking number.</p>
                  <p className="text-sm">Your order may not have been received yet.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Updates */}
      <div>
        <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
          <Warehouse className="w-5 h-5" />
          Warehouse Updates
        </h2>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : updates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Warehouse className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium">No warehouse updates yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                You'll see updates here when your goods arrive at the warehouse.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {updates.map((update) => (
              <WarehouseUpdateCard key={update.id} update={update} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
