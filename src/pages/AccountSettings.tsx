/**
 * AccountSettings – accessible by ALL roles (mother, doctor, asha).
 * Features: Profile Photo · Change Password · Login Security · Delete Account
 */
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    Shield,
    Trash2,
    Eye,
    EyeOff,
    Mail,
    CheckCircle2,
    LogOut,
    Loader2,
    ArrowLeft,
    UserCircle,
    Camera,
    Upload,
    X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile } from "@/lib/api";

function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function roleBadge(role: string) {
    if (role === "doctor") return "Doctor";
    if (role === "asha") return "ASHA Worker";
    if (role === "partner") return "Partner / Husband";
    return "Mother";
}

/** Resize an image File to a max dimension and return a base64 data-URL. */
function resizeImage(file: File, maxPx = 400): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.onerror = reject;
        img.src = url;
    });
}

const AccountSettings = () => {
    const { user, logout, changePassword, deleteAccount, reloadUser } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Photo state
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    // savedAvatar mirrors user.avatar but updates immediately from the PUT response
    const [savedAvatar, setSavedAvatar] = useState<string | null>(user?.avatar ?? null);
    const [photoLoading, setPhotoLoading] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const [photoSuccess, setPhotoSuccess] = useState(false);

    // Change password state
    const [cpCurrent, setCpCurrent] = useState("");
    const [cpNew, setCpNew] = useState("");
    const [cpConfirm, setCpConfirm] = useState("");
    const [cpShowCurrent, setCpShowCurrent] = useState(false);
    const [cpShowNew, setCpShowNew] = useState(false);
    const [cpLoading, setCpLoading] = useState(false);
    const [cpError, setCpError] = useState<string | null>(null);
    const [cpSuccess, setCpSuccess] = useState(false);

    // Delete account state
    const [delPassword, setDelPassword] = useState("");
    const [delShowPass, setDelShowPass] = useState(false);
    const [delLoading, setDelLoading] = useState(false);
    const [delError, setDelError] = useState<string | null>(null);
    const [delDialogOpen, setDelDialogOpen] = useState(false);

    if (!user) {
        navigate("/role-select");
        return null;
    }

    // Current displayed avatar: pending preview → local savedAvatar → null (shows initials)
    const currentAvatar = photoPreview ?? savedAvatar ?? null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhotoError(null);
        setPhotoSuccess(false);
        if (!file.type.startsWith("image/")) {
            setPhotoError("Please select an image file (JPG, PNG, WebP…).");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setPhotoError("Image must be smaller than 5 MB.");
            return;
        }
        try {
            const dataUrl = await resizeImage(file, 400);
            setPhotoPreview(dataUrl);
        } catch {
            setPhotoError("Could not read the image. Please try another file.");
        }
        // Reset file input so the same file can be re-selected
        e.target.value = "";
    };

    const handleSavePhoto = async () => {
        if (!photoPreview) return;
        setPhotoLoading(true);
        setPhotoError(null);
        try {
            const res = await updateProfile({ avatar: photoPreview } as any);
            if (res.ok) {
                // Update local state immediately so the image renders right away
                setSavedAvatar(photoPreview);
                setPhotoPreview(null);
                setPhotoSuccess(true);
                // Sync context in background
                reloadUser().catch(console.error);
            } else {
                setPhotoError(res.error || "Failed to save photo.");
            }
        } catch (err) {
            console.error("[Avatar] Save error:", err);
            setPhotoError("Network error. Is the server running?");
        }
        setPhotoLoading(false);
    };

    const handleRemovePhoto = async () => {
        if (photoPreview) {
            // Cancel pending selection without a server call
            setPhotoPreview(null);
            return;
        }
        setPhotoLoading(true);
        setPhotoError(null);
        try {
            const res = await updateProfile({ avatar: null } as any);
            if (res.ok) {
                setSavedAvatar(null);
                setPhotoSuccess(false);
                reloadUser().catch(console.error);
            } else {
                setPhotoError(res.error || "Failed to remove photo.");
            }
        } catch (err) {
            console.error("[Avatar] Remove error:", err);
            setPhotoError("Network error. Is the server running?");
        }
        setPhotoLoading(false);
    };

    const handleChangePassword = async () => {
        setCpError(null);
        setCpSuccess(false);
        if (!cpCurrent || !cpNew || !cpConfirm) { setCpError("All fields are required."); return; }
        if (cpNew !== cpConfirm) { setCpError("New passwords do not match."); return; }
        if (cpNew.length < 6) { setCpError("New password must be at least 6 characters."); return; }
        setCpLoading(true);
        const res = await changePassword(cpCurrent, cpNew);
        setCpLoading(false);
        if (res.success) { setCpSuccess(true); setCpCurrent(""); setCpNew(""); setCpConfirm(""); }
        else setCpError(res.error || "Failed to change password.");
    };

    const handleDeleteAccount = async () => {
        setDelError(null);
        if (!delPassword) { setDelError("Please enter your password."); return; }
        setDelLoading(true);
        const res = await deleteAccount(delPassword);
        setDelLoading(false);
        if (res.success) { setDelDialogOpen(false); navigate("/"); }
        else setDelError(res.error || "Failed to delete account.");
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto px-4 pt-24 pb-12 max-w-xl">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Back */}
                    <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>

                    {/* ── Profile Photo + Identity ─────────────────────────────── */}
                    <Card className="rounded-2xl overflow-hidden">
                        <CardContent className="pt-6 pb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Camera className="w-5 h-5 text-primary" />
                                <h2 className="font-semibold text-foreground">Profile Photo</h2>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                {/* Avatar preview */}
                                <div className="relative shrink-0">
                                    <Avatar className="h-24 w-24 ring-2 ring-primary/20">
                                        {currentAvatar && <AvatarImage src={currentAvatar} alt={user.name} className="object-cover" />}
                                        <AvatarFallback className="bg-primary/20 text-primary text-2xl font-semibold">
                                            {getInitials(user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    {/* Camera overlay button */}
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                                        aria-label="Change photo"
                                    >
                                        <Camera className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex-1 text-center sm:text-left">
                                    <p className="font-semibold text-foreground text-lg">{user.name}</p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1">
                                        <UserCircle className="w-3 h-3" />
                                        {roleBadge(user.role)}
                                    </span>

                                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-1.5"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className="w-3.5 h-3.5" />
                                            {currentAvatar ? "Change photo" : "Upload photo"}
                                        </Button>

                                        {currentAvatar && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={handleRemovePhoto}
                                                disabled={photoLoading}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                                id="avatar-file-input"
                            />

                            {/* Pending preview controls */}
                            {photoPreview && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border"
                                >
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-foreground">New photo selected</p>
                                        <p className="text-xs text-muted-foreground">Click "Save Photo" to apply it to your profile.</p>
                                    </div>
                                    <Button size="sm" onClick={handleSavePhoto} disabled={photoLoading} className="gap-1.5 shrink-0">
                                        {photoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                        Save Photo
                                    </Button>
                                </motion.div>
                            )}

                            {photoError && <p className="text-sm text-destructive mt-3">{photoError}</p>}
                            {photoSuccess && !photoPreview && (
                                <div className="flex items-center gap-2 text-sm text-[hsl(var(--health-good))] mt-3">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Profile photo updated!
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-3">Accepted: JPG, PNG, WebP. Max 5 MB. Image is resized automatically.</p>
                        </CardContent>
                    </Card>

                    {/* ── Change Password ─────────────────────────────────────── */}
                    <Card className="rounded-2xl overflow-hidden">
                        <CardContent className="pt-6 pb-6 space-y-4">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary" />
                                <h2 className="font-semibold text-foreground">Change Password</h2>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Update your login password. You'll need your current password to confirm.
                            </p>

                            <div className="relative">
                                <Input id="cp-current" type={cpShowCurrent ? "text" : "password"} placeholder="Current password"
                                    value={cpCurrent} onChange={(e) => { setCpCurrent(e.target.value); setCpError(null); setCpSuccess(false); }} className="pr-10" />
                                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => setCpShowCurrent((v) => !v)} aria-label="Toggle">
                                    {cpShowCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            <div className="relative">
                                <Input id="cp-new" type={cpShowNew ? "text" : "password"} placeholder="New password (min 6 characters)"
                                    value={cpNew} onChange={(e) => { setCpNew(e.target.value); setCpError(null); setCpSuccess(false); }} className="pr-10" />
                                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => setCpShowNew((v) => !v)} aria-label="Toggle">
                                    {cpShowNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            <Input id="cp-confirm" type="password" placeholder="Confirm new password"
                                value={cpConfirm} onChange={(e) => { setCpConfirm(e.target.value); setCpError(null); setCpSuccess(false); }} />

                            {cpError && <p className="text-sm text-destructive">{cpError}</p>}
                            {cpSuccess && (
                                <div className="flex items-center gap-2 text-sm text-[hsl(var(--health-good))]">
                                    <CheckCircle2 className="w-4 h-4" /> Password changed successfully!
                                </div>
                            )}
                            <Button onClick={handleChangePassword} disabled={cpLoading} className="gap-2">
                                {cpLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Shield className="w-4 h-4" />Update Password</>}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* ── Login Security ──────────────────────────────────────── */}
                    <Card className="rounded-2xl overflow-hidden">
                        <CardContent className="pt-6 pb-6 space-y-4">
                            <div className="flex items-center gap-2">
                                <Mail className="w-5 h-5 text-primary" />
                                <h2 className="font-semibold text-foreground">Login Security</h2>
                            </div>
                            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">Email address</p>
                                    <p className="text-sm font-medium text-foreground">{user.email}</p>
                                </div>
                                {user.isEmailVerified ? (
                                    <span className="flex items-center gap-1 text-xs font-medium text-[hsl(var(--health-good))] bg-[hsl(var(--health-good))]/10 px-2 py-1 rounded-full">
                                        <CheckCircle2 className="w-3 h-3" /> Verified
                                    </span>
                                ) : (
                                    <span className="text-xs font-medium text-[hsl(var(--health-warning))] bg-[hsl(var(--health-warning))]/10 px-2 py-1 rounded-full">
                                        Not verified
                                    </span>
                                )}
                            </div>
                            <div className="rounded-xl bg-muted/50 p-3">
                                <p className="text-xs text-muted-foreground mb-0.5">Session type</p>
                                <p className="text-sm font-medium text-foreground">JWT token — stored in this browser only</p>
                            </div>
                            <Button variant="outline" className="gap-2 w-full" onClick={() => { logout(); navigate("/"); }}>
                                <LogOut className="w-4 h-4" /> Sign out of all devices
                            </Button>
                        </CardContent>
                    </Card>

                    {/* ── Delete Account ──────────────────────────────────────── */}
                    <Card className="rounded-2xl overflow-hidden border-destructive/40 bg-destructive/5">
                        <CardContent className="pt-6 pb-6 space-y-3">
                            <div className="flex items-center gap-2">
                                <Trash2 className="w-5 h-5 text-destructive" />
                                <h2 className="font-semibold text-destructive">Delete Account</h2>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Permanently delete your account and all associated data. This action <strong>cannot be undone</strong>.
                            </p>
                            <AlertDialog open={delDialogOpen} onOpenChange={(open) => { setDelDialogOpen(open); if (!open) { setDelPassword(""); setDelError(null); } }}>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="gap-2 w-full" id="delete-account-btn">
                                        <Trash2 className="w-4 h-4" /> Delete My Account
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete your account and all your data. You cannot undo this. Enter your current password to confirm.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="py-2 space-y-2">
                                        <div className="relative">
                                            <Input id="del-password" type={delShowPass ? "text" : "password"} placeholder="Enter your password"
                                                value={delPassword} onChange={(e) => { setDelPassword(e.target.value); setDelError(null); }} className="pr-10" />
                                            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                onClick={() => setDelShowPass((v) => !v)} aria-label="Toggle">
                                                {delShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {delError && <p className="text-sm text-destructive">{delError}</p>}
                                    </div>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel disabled={delLoading}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }} disabled={delLoading}
                                            className="bg-destructive hover:bg-destructive/90 gap-2">
                                            {delLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Deleting…</> : <><Trash2 className="w-4 h-4" />Yes, delete my account</>}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                </motion.div>
            </main>
        </div>
    );
};

export default AccountSettings;
