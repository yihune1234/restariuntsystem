import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { UserRound, Lock, Shield, Mail, Phone, Building2, Calendar, Activity, AlertCircle, Check, Eye, EyeOff } from "lucide-react";
import { DEFAULT_RESTAURANT } from "@/config/restaurant";
import { toast } from "sonner";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be at most 100 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().required("Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters").max(128, "Password too long"),
  confirmPassword: z.string().min(6, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const ProfilePage = () => {
  const { authUser, updateProfile, changePassword, isLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState("profile");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: authUser?.name || "",
      email: authUser?.email || "",
      phone: authUser?.phone || "",
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onProfileSubmit = async (data) => {
    setProfileSaved(false);
    const result = await updateProfile(data);
    if (result.success) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    }
  };

  const onPasswordSubmit = async (data) => {
    const result = await changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    if (result.success) {
      passwordForm.reset();
    }
  };

  const roleColors = {
    OWNER: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    MANAGER: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    CASHIER: "bg-green-500/10 text-green-500 border-green-500/20",
    KITCHEN: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    WAITER: "bg-teal-500/10 text-teal-500 border-teal-500/20",
  };

  const roleColor = roleColors[authUser?.role] || "bg-gray-500/10 text-gray-500 border-gray-500/20";

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
      {/* Profile Header */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-card/50">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Avatar className="size-20 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
              {authUser?.avatar ? (
                <AvatarImage src={authUser.avatar} />
              ) : (
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {authUser?.name?.slice(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold">{authUser?.name}</h1>
              <p className="text-muted-foreground text-sm">{authUser?.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2 justify-center sm:justify-start">
                <Badge variant="outline" className={`capitalize ${roleColor}`}>
                  {authUser?.role?.toLowerCase()}
                </Badge>
                <Badge variant="outline" className={authUser?.isActive ? "border-green-500/20 text-green-500 bg-green-500/10" : "border-red-500/20 text-red-500 bg-red-500/10"}>
                  {authUser?.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-flex">
          <TabsTrigger value="profile" className="gap-2">
            <UserRound className="size-4" />
            <span>Personal Info</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="size-4" />
            <span>Security</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-5 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details. Your email is used for login and notifications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input placeholder="Enter your name" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input type="email" placeholder="your@email.com" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input placeholder="+1 (555) 000-0000" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button type="submit" disabled={isLoading || !profileForm.formState.isDirty}>
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                    {profileSaved && (
                      <span className="flex items-center gap-1 text-sm text-green-500 animate-in fade-in">
                        <Check className="size-4" />
                        Saved
                      </span>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Account Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5 text-primary" />
                Account Details
              </CardTitle>
              <CardDescription>Read-only information about your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Building2 className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Organization</p>
                    <p className="font-medium truncate">{authUser?.organizationId?.name || DEFAULT_RESTAURANT.nameEn}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Activity className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Branch</p>
                    <p className="font-medium truncate">{authUser?.branchId?.name || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Calendar className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Member Since</p>
                    <p className="font-medium">
                      {authUser?.createdAt ? new Date(authUser.createdAt).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Activity className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Last Updated</p>
                    <p className="font-medium">
                      {authUser?.updatedAt ? new Date(authUser.updatedAt).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="size-5 text-primary" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password. You'll need to enter your current password for security.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertBanner />
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-md">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                              type={showCurrent ? "text" : "password"}
                              placeholder="Enter current password"
                              className="pl-10 pr-10"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrent(!showCurrent)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Separator />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                              type={showNew ? "text" : "password"}
                              placeholder="Enter new password"
                              className="pl-10 pr-10"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowNew(!showNew)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                              type={showNew ? "text" : "password"}
                              placeholder="Confirm new password"
                              className="pl-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Changing..." : "Change Password"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const AlertBanner = () => (
  <div className="flex items-start gap-3 p-3 mb-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm">
    <AlertCircle className="size-4 mt-0.5 shrink-0" />
    <div>
      <p className="font-medium">Security Notice</p>
      <p className="text-xs mt-0.5 opacity-80">
        After changing your password, all other sessions will be revoked. You'll need to log in again.
      </p>
    </div>
  </div>
);

export default ProfilePage;
