/**
 * Settings page for Parency Legal dashboard
 * Allows users to configure their account and integrations
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropboxConnection } from "@/components/dropbox";

export default function SettingsPage() {
  return (
    <main className="p-6 md:p-10">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      <div className="max-w-4xl space-y-6">
        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>
              Manage your account preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Account settings will be available here.
            </p>
          </CardContent>
        </Card>

        {/* Dropbox Integration */}
        <DropboxConnection />

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Notification settings will be available here.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
