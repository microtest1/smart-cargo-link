import { Link } from "react-router-dom";
import { ArrowLeft, Search, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import amoligaLogo from "@/assets/amoliga-logo.png";
import { ChinaWarehouseInfo } from "@/components/warehouse/ChinaWarehouseInfo";
import { Seo } from "@/components/seo/Seo";

export default function Warehouses() {
  return (
    <>
      <Seo
        title="China Warehouse Addresses | Amoliga Elite Freight"
        description="Find the correct Amoliga China warehouse address for general goods, consolidation, air freight and vehicle shipping to Ghana."
        path="/china-warehouse-addresses"
      />
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3">
            <Link to="/" className="flex items-center gap-2">
              <img src={amoligaLogo} alt="Amoliga Elite Freight & Logistics" className="h-10 w-auto object-contain" />
            </Link>
            <div className="flex items-center gap-2">
              <Link to="/track">
                <Button variant="outline" size="sm">
                  <Search className="mr-2 h-4 w-4" />
                  Track
                </Button>
              </Link>
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Home
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="container mx-auto max-w-4xl px-4 py-10">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Warehouse className="h-4 w-4" />
              Warehouse Address Finder
            </div>
            <h1 className="font-display mb-4 text-3xl font-bold md:text-4xl">
              Get the Right China Warehouse Address
            </h1>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Choose the warehouse that matches your goods, copy the address and shipping details, and
              send them to your supplier. Always include your shipping mark on every package.
            </p>
          </div>

          <ChinaWarehouseInfo />

          <div className="mt-10 flex flex-wrap justify-center gap-3 text-sm">
            <Link to="/shipping-from-china-to-ghana" className="text-primary hover:underline">
              China to Ghana shipping
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/resources" className="text-primary hover:underline">
              Shipping guides
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/track" className="text-primary hover:underline">
              Track a shipment
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
