import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  Package, 
  CreditCard, 
  MessageCircle, 
  Megaphone,
  Mail,
  Smartphone,
  Save
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  push: boolean;
  email: boolean;
  sms: boolean;
}

export default function NotificationSettings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: "shipment",
      label: "Shipment Updates",
      description: "Status changes, delivery updates, and tracking info",
      icon: Package,
      push: true,
      email: true,
      sms: false,
    },
    {
      id: "payment",
      label: "Payment Notifications",
      description: "Payment confirmations and reminders",
      icon: CreditCard,
      push: true,
      email: true,
      sms: true,
    },
    {
      id: "support",
      label: "Support Messages",
      description: "Responses from customer support",
      icon: MessageCircle,
      push: true,
      email: true,
      sms: false,
    },
    {
      id: "announcements",
      label: "Announcements",
      description: "News, promotions, and company updates",
      icon: Megaphone,
      push: false,
      email: true,
      sms: false,
    },
  ]);

  const [masterSettings, setMasterSettings] = useState({
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: true,
  });

  const handleToggle = (settingId: string, channel: "push" | "email" | "sms") => {
    setSettings(prev => prev.map(s => 
      s.id === settingId ? { ...s, [channel]: !s[channel] } : s
    ));
  };

  const handleMasterToggle = (channel: "pushEnabled" | "emailEnabled" | "smsEnabled") => {
    setMasterSettings(prev => ({ ...prev, [channel]: !prev[channel] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({
      title: "Settings Saved",
      description: "Your notification preferences have been updated.",
    });
  };

  return (
    <AppLayout title="Notification Settings">
      <div className="px-4 py-5 space-y-5">
        <div>
          <h1 className="font-display font-bold text-2xl mb-1">Notification Settings</h1>
          <p className="text-muted-foreground text-sm">Control how you receive updates</p>
        </div>

        {/* Master Controls */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Notification Channels</CardTitle>
            <CardDescription>Enable or disable notification channels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <Label className="font-medium">Push Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive alerts on your device</p>
                </div>
              </div>
              <Switch
                checked={masterSettings.pushEnabled}
                onCheckedChange={() => handleMasterToggle("pushEnabled")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <Label className="font-medium">Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive updates via email</p>
                </div>
              </div>
              <Switch
                checked={masterSettings.emailEnabled}
                onCheckedChange={() => handleMasterToggle("emailEnabled")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <Label className="font-medium">SMS Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive text message alerts</p>
                </div>
              </div>
              <Switch
                checked={masterSettings.smsEnabled}
                onCheckedChange={() => handleMasterToggle("smsEnabled")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Individual Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Notification Types</CardTitle>
            <CardDescription>Choose what you want to be notified about</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.map((setting) => (
              <div key={setting.id} className="border-b border-border/50 last:border-0 pb-4 last:pb-0">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <setting.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <Label className="font-medium">{setting.label}</Label>
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
                  </div>
                </div>
                <div className="flex gap-6 ml-13 pl-13">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`${setting.id}-push`}
                      checked={setting.push && masterSettings.pushEnabled}
                      onCheckedChange={() => handleToggle(setting.id, "push")}
                      disabled={!masterSettings.pushEnabled}
                    />
                    <Label htmlFor={`${setting.id}-push`} className="text-xs">Push</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`${setting.id}-email`}
                      checked={setting.email && masterSettings.emailEnabled}
                      onCheckedChange={() => handleToggle(setting.id, "email")}
                      disabled={!masterSettings.emailEnabled}
                    />
                    <Label htmlFor={`${setting.id}-email`} className="text-xs">Email</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`${setting.id}-sms`}
                      checked={setting.sms && masterSettings.smsEnabled}
                      onCheckedChange={() => handleToggle(setting.id, "sms")}
                      disabled={!masterSettings.smsEnabled}
                    />
                    <Label htmlFor={`${setting.id}-sms`} className="text-xs">SMS</Label>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button 
          className="w-full" 
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </AppLayout>
  );
}
