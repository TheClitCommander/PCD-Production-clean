import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, Globe, User, Settings, LogOut, MessageSquare, Check, Calendar, Save, Shield, CreditCard, Key, AlertTriangle } from "lucide-react";

export default function Account() {
  const [settings, setSettings] = useState({
    twoFactor: true,
    loginNotifications: true,
    apiAccess: false,
    dataExport: true
  });

  const handleSave = () => {
    console.log("Saving account settings:", settings);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <a href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Globe className="text-white w-4 h-4" />
              </div>
              <span className="font-bold text-xl text-gray-900">LocalBiz Pro</span>
            </a>
            <div className="hidden md:flex space-x-6 ml-8">
              <a href="/" className="text-gray-600 hover:text-gray-900">Dashboard</a>
              <a href="/prospects" className="text-gray-600 hover:text-gray-900">Prospects</a>
              <a href="/inbox" className="text-gray-600 hover:text-gray-900">Inbox</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Templates</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Analytics</a>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Notifications Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">3</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="px-3 py-2 border-b">
                  <h4 className="font-semibold">Notifications</h4>
                </div>
                <DropdownMenuItem className="flex items-start space-x-3 p-3">
                  <MessageSquare className="w-4 h-4 mt-1 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">New lead response</p>
                    <p className="text-xs text-gray-500">Coastal Electric replied to your SMS</p>
                    <p className="text-xs text-gray-400">5 minutes ago</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-start space-x-3 p-3">
                  <Calendar className="w-4 h-4 mt-1 text-green-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Meeting scheduled</p>
                    <p className="text-xs text-gray-500">Bath Plumbing Co booked a demo call</p>
                    <p className="text-xs text-gray-400">1 hour ago</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-start space-x-3 p-3">
                  <Check className="w-4 h-4 mt-1 text-purple-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Website delivered</p>
                    <p className="text-xs text-gray-500">Portland Auto Repair site is live</p>
                    <p className="text-xs text-gray-400">3 hours ago</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/notifications" className="text-center text-sm text-blue-600 hover:text-blue-800">
                    View all notifications
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Account Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-8 h-8 rounded-full bg-primary text-white hover:bg-primary/90">
                  <User className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 border-b">
                  <p className="font-medium">John Smith</p>
                  <p className="text-sm text-gray-500">john@localbizpro.com</p>
                </div>
                <DropdownMenuItem asChild>
                  <a href="/profile">
                    <User className="w-4 h-4 mr-2" />
                    Profile Settings
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/account">
                    <Settings className="w-4 h-4 mr-2" />
                    Account Settings
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/notifications">
                    <Bell className="w-4 h-4 mr-2" />
                    Notification Preferences
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600">Manage your account security and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                </div>
                <Switch
                  checked={settings.twoFactor}
                  onCheckedChange={(checked) => 
                    setSettings({...settings, twoFactor: checked})
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Login Notifications</Label>
                  <p className="text-sm text-gray-500">Get notified when someone signs into your account</p>
                </div>
                <Switch
                  checked={settings.loginNotifications}
                  onCheckedChange={(checked) => 
                    setSettings({...settings, loginNotifications: checked})
                  }
                />
              </div>
              <div className="pt-4 border-t">
                <Button variant="outline">
                  <Key className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Billing Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Billing & Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-600 mr-2" />
                  <div>
                    <h4 className="font-medium text-green-900">Pro Plan</h4>
                    <p className="text-sm text-green-700">$99/month • Next billing: Jan 15, 2024</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Monthly Plan</span>
                  <span className="font-medium">$99.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>SMS Credits (10,000)</span>
                  <span className="font-medium">$49.00</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Total</span>
                  <span>$148.00</span>
                </div>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline">Update Payment Method</Button>
                <Button variant="outline">View Invoices</Button>
              </div>
            </CardContent>
          </Card>

          {/* API & Integrations */}
          <Card>
            <CardHeader>
              <CardTitle>API & Integrations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>API Access</Label>
                  <p className="text-sm text-gray-500">Enable API access for custom integrations</p>
                </div>
                <Switch
                  checked={settings.apiAccess}
                  onCheckedChange={(checked) => 
                    setSettings({...settings, apiAccess: checked})
                  }
                />
              </div>
              {settings.apiAccess && (
                <div className="bg-gray-50 border rounded-lg p-4">
                  <Label>API Key</Label>
                  <div className="flex space-x-2 mt-2">
                    <Input 
                      type="password" 
                      value="sk_live_••••••••••••••••••••••••••••"
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button variant="outline" size="sm">Regenerate</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data & Privacy */}
          <Card>
            <CardHeader>
              <CardTitle>Data & Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Data Export</Label>
                  <p className="text-sm text-gray-500">Allow exporting your account data</p>
                </div>
                <Switch
                  checked={settings.dataExport}
                  onCheckedChange={(checked) => 
                    setSettings({...settings, dataExport: checked})
                  }
                />
              </div>
              <div className="flex space-x-3">
                <Button variant="outline">Export Data</Button>
                <Button variant="outline">Download Report</Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center text-red-700">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-900 mb-2">Delete Account</h4>
                <p className="text-sm text-red-700 mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Button variant="destructive" size="sm">
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}