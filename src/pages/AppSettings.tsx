import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Settings, 
  Moon, 
  Sun, 
  Globe, 
  Smartphone,
  Database,
  Trash2,
  Download,
  RefreshCw,
  Info
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AppSettings() {
  const { toast } = useToast();
  const [isClearing, setIsClearing] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  
  const [settings, setSettings] = useState({
    darkMode: false,
    language: "en",
    currency: "GHS",
    autoSync: true,
    dataUsage: "normal",
    pushEnabled: true,
  });

  // Check for system dark mode preference
  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setSettings(prev => ({ ...prev, darkMode: isDark }));
  }, []);

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: !prev[key as keyof typeof prev] };
      
      // Handle dark mode toggle
      if (key === "darkMode") {
        document.documentElement.classList.toggle("dark", newSettings.darkMode);
      }
      
      return newSettings;
    });
    
    toast({ title: "Setting Updated", description: "Your preference has been saved" });
  };

  const handleSelectChange = (key: keyof typeof settings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast({ title: "Setting Updated", description: "Your preference has been saved" });
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    // Simulate clearing cache
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsClearing(false);
    setIsClearDialogOpen(false);
    toast({ title: "Cache Cleared", description: "App cache has been cleared successfully" });
  };

  const handleExportData = () => {
    toast({ title: "Export Started", description: "Your data export will be ready shortly" });
  };

  return (
    <AppLayout title="App Settings">
      <div className="px-4 py-5 space-y-5">
        <div>
          <h1 className="font-display font-bold text-2xl mb-1">App Settings</h1>
          <p className="text-muted-foreground text-sm">Customize your app experience</p>
        </div>

        {/* Appearance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              {settings.darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              Appearance
            </CardTitle>
            <CardDescription>Customize how the app looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Dark Mode</Label>
                <p className="text-xs text-muted-foreground">Use dark theme</p>
              </div>
              <Switch
                checked={settings.darkMode}
                onCheckedChange={() => handleToggle("darkMode")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Language & Region */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Language & Region
            </CardTitle>
            <CardDescription>Set your preferred language and currency</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={settings.language}
                onValueChange={(value) => handleSelectChange("language", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="tw">Twi</SelectItem>
                  <SelectItem value="ha">Hausa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={settings.currency}
                onValueChange={(value) => handleSelectChange("currency", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GHS">GHS (₵)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data & Sync */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Data & Sync
            </CardTitle>
            <CardDescription>Manage data synchronization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Auto Sync</Label>
                <p className="text-xs text-muted-foreground">Automatically sync data in background</p>
              </div>
              <Switch
                checked={settings.autoSync}
                onCheckedChange={() => handleToggle("autoSync")}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Usage</Label>
              <Select
                value={settings.dataUsage}
                onValueChange={(value) => handleSelectChange("dataUsage", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Only sync on WiFi</SelectItem>
                  <SelectItem value="normal">Normal - Balanced</SelectItem>
                  <SelectItem value="high">High - Always sync</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Storage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5" />
              Storage
            </CardTitle>
            <CardDescription>Manage app storage and cache</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
              <div>
                <p className="font-medium text-sm">Cache Size</p>
                <p className="text-xs text-muted-foreground">24.5 MB used</p>
              </div>
              <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Clear Cache</DialogTitle>
                    <DialogDescription>
                      This will clear all cached data. You may need to download some content again.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsClearDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleClearCache} disabled={isClearing}>
                      {isClearing ? (
                        <>
                          <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                          Clearing...
                        </>
                      ) : (
                        "Clear Cache"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Button variant="outline" className="w-full" onClick={handleExportData}>
              <Download className="w-4 h-4 mr-2" />
              Export My Data
            </Button>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5" />
              About
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">App Version</span>
              <span className="text-sm font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Build</span>
              <span className="text-sm font-medium">2025.01.11</span>
            </div>
            <div className="pt-2 space-y-2">
              <Button variant="link" className="w-full justify-start p-0 h-auto text-sm">
                Terms of Service
              </Button>
              <Button variant="link" className="w-full justify-start p-0 h-auto text-sm">
                Privacy Policy
              </Button>
              <Button variant="link" className="w-full justify-start p-0 h-auto text-sm">
                Open Source Licenses
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
