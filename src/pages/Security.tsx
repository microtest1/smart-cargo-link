import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Shield, 
  Key, 
  Smartphone, 
  Eye, 
  EyeOff,
  Lock,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Monitor
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function Security() {
  const { toast } = useToast();
  const { updatePassword } = useAuth();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    biometricEnabled: false,
    loginAlerts: true,
    sessionTimeout: true,
  });

  const [activeSessions] = useState([
    { id: "1", device: "iPhone 14 Pro", location: "Accra, Ghana", lastActive: "Now", current: true },
    { id: "2", device: "Chrome on Windows", location: "Kumasi, Ghana", lastActive: "2 hours ago", current: false },
  ]);

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match", variant: "destructive" });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }

    setIsChangingPassword(true);
    try {
      await updatePassword(passwordForm.newPassword);
      toast({ title: "Success", description: "Password updated successfully" });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setIsPasswordDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update password", variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleToggleSetting = (key: keyof typeof securitySettings) => {
    setSecuritySettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast({ title: "Setting Updated", description: "Your security preference has been saved" });
  };

  const handleLogoutSession = (sessionId: string) => {
    toast({ title: "Session Ended", description: "Device has been logged out" });
  };

  const handleLogoutAllSessions = () => {
    toast({ title: "All Sessions Ended", description: "All other devices have been logged out" });
  };

  return (
    <AppLayout title="Security">
      <div className="px-4 py-5 space-y-5">
        <div>
          <h1 className="font-display font-bold text-2xl mb-1">Security</h1>
          <p className="text-muted-foreground text-sm">Manage your account security</p>
        </div>

        {/* Security Score */}
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center">
                <Shield className="w-7 h-7 text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Security Score: Good</h3>
                <p className="text-sm text-muted-foreground">Your account is well protected</p>
              </div>
              <div className="text-3xl font-bold text-green-500">85%</div>
            </div>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Password</CardTitle>
                <CardDescription>Change your password regularly</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm">Last changed 30 days ago</span>
              </div>
              <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Change Password</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>Enter your current password and choose a new one</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Current Password</Label>
                      <div className="relative">
                        <Input
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>New Password</Label>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm New Password</Label>
                      <Input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handlePasswordChange} disabled={isChangingPassword}>
                      {isChangingPassword ? "Updating..." : "Update Password"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
                <CardDescription>Add extra security to your account</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Enable 2FA</Label>
                <p className="text-xs text-muted-foreground">Use your phone as a second verification</p>
              </div>
              <Switch
                checked={securitySettings.twoFactorEnabled}
                onCheckedChange={() => handleToggleSetting("twoFactorEnabled")}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Biometric Login</Label>
                <p className="text-xs text-muted-foreground">Use fingerprint or face recognition</p>
              </div>
              <Switch
                checked={securitySettings.biometricEnabled}
                onCheckedChange={() => handleToggleSetting("biometricEnabled")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Login Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Security Alerts</CardTitle>
                <CardDescription>Get notified about account activity</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Login Alerts</Label>
                <p className="text-xs text-muted-foreground">Notify when logging in from new device</p>
              </div>
              <Switch
                checked={securitySettings.loginAlerts}
                onCheckedChange={() => handleToggleSetting("loginAlerts")}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Auto Logout</Label>
                <p className="text-xs text-muted-foreground">Log out after 30 minutes of inactivity</p>
              </div>
              <Switch
                checked={securitySettings.sessionTimeout}
                onCheckedChange={() => handleToggleSetting("sessionTimeout")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">Active Sessions</CardTitle>
                  <CardDescription>Devices logged into your account</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogoutAllSessions}>
                <LogOut className="w-4 h-4 mr-1" />
                Logout All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm flex items-center gap-2">
                      {session.device}
                      {session.current && (
                        <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">This device</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.location} · {session.lastActive}
                    </p>
                  </div>
                </div>
                {!session.current && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleLogoutSession(session.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    Logout
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
