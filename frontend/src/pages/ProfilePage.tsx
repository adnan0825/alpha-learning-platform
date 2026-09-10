/**
 * Profile Page - View and edit user profile.
 */
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usersAPI } from "@/lib/api";

import ImageUpload from "@/components/ImageUpload";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Shield,
  GraduationCap,
  BookOpen,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ProfilePage: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || "");
  const [saving, setSaving] = useState(false);

  const roleIcon = {
    student: <GraduationCap size={16} />,
    instructor: <BookOpen size={16} />,
    admin: <Shield size={16} />,
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await usersAPI.update(user.id, { displayName, bio, photoURL });
      await refreshProfile();
      toast({ title: "Profile updated successfully!" });
    } catch (err: any) {
      toast({
        title: "Error updating profile",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            My Profile
          </h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-6 space-y-6">
            {/* Avatar section */}
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={photoURL} />
                <AvatarFallback className="gradient-accent text-accent-foreground text-xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {displayName}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="gap-1">
                    {profile && roleIcon[profile.role]}
                    <span className="capitalize">{profile?.role}</span>
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Member since{" "}
                  {profile
                    ? new Date(profile.createdAt).toLocaleDateString()
                    : ""}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Profile Photo</Label>
              <ImageUpload
                value={photoURL}
                onChange={setPhotoURL}
                label="Upload profile photo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="email"
                  value={profile?.email || ""}
                  disabled
                  className="pl-10 opacity-60"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full gradient-accent text-accent-foreground font-semibold h-11 hover:opacity-90 gap-2"
            >
              <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default ProfilePage;
