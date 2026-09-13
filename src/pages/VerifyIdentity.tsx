import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { Shield, Camera, Upload, CheckCircle2, FileCheck, ArrowLeft } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const VerifyIdentity = () => {
    const navigate = useNavigate();
    const { user, profile, loading: profileLoading } = useProfile();
    const [uploading, setUploading] = useState(false);
    const [idFile, setIdFile] = useState<File | null>(null);
    const [selfieFile, setSelfieFile] = useState<File | null>(null);

    // Preview URLs
    const [idPreview, setIdPreview] = useState<string | null>(null);
    const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'id' | 'selfie') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size must be less than 5MB");
                return;
            }

            const previewUrl = URL.createObjectURL(file);

            if (type === 'id') {
                setIdFile(file);
                setIdPreview(previewUrl);
            } else {
                setSelfieFile(file);
                setSelfiePreview(previewUrl);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            toast.error("User not found. Please log in.");
            return;
        }

        if (!idFile || !selfieFile) {
            toast.error("Please upload both documents");
            return;
        }

        setUploading(true);
        console.log("Starting verification submission...");

        try {
            const formData = new FormData();
            formData.append("idDocument", idFile);
            formData.append("selfie", selfieFile);

            const { data, error } = await supabase.functions.invoke("submit-verification", {
                body: formData,
            });

            if (error || !data?.success) {
                throw new Error(data?.error || error?.message || "Unable to submit verification");
            }

            toast.success("Verification submitted! We will email you once it has been reviewed.");
            navigate("/dashboard");

        } catch (error: any) {
            console.error("Verification error:", error);
            toast.error(error.message || "Secure document upload failed. Check your connection and try again.");
        } finally {
            setUploading(false);
        }
    };

    if (profileLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <LoadingSpinner className="h-10 w-10" />
            </div>
        );
    }

    if (profile?.verification_status === 'verified') {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <main className="container max-w-lg py-20 text-center space-y-6">
                    <div className="mx-auto h-24 w-24 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-12 w-12 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold">You are Verified!</h1>
                    <p className="text-muted-foreground">
                        Your identity has been confirmed. You have full access to all Digital Ridr features.
                    </p>
                    <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
                </main>
                <Footer />
            </div>
        );
    }

    if (profile?.verification_status === 'pending') {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <main className="container max-w-lg py-20 text-center space-y-6">
                    <div className="mx-auto h-24 w-24 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Shield className="h-12 w-12 text-yellow-600" />
                    </div>
                    <h1 className="text-3xl font-bold">Verification Pending</h1>
                    <p className="text-muted-foreground">
                        We are reviewing your documents. This usually takes less than 24 hours.
                        We'll notify you once approved.
                    </p>
                    <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <div className="container mx-auto px-4 py-6 md:py-12 max-w-4xl">
                <Button variant="ghost" className="mb-6 md:mb-8" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Button>

                <div className="space-y-6 md:space-y-8">
                    <div className="text-center space-y-2 md:space-y-4">
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Verify Your Identity</h1>
                        <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
                            To ensure the safety of our community, we require all users to verify their identity.
                            Please upload a valid government-issued ID and a selfie.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        {/* ID Document Upload */}
                        <Card className="bg-card border-border overflow-hidden group hover:border-primary/50 transition-all">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileCheck className="h-5 w-5 text-primary" />
                                    Government ID
                                </CardTitle>
                                <CardDescription>Upload a clear photo of your ID (Passport, Driver's License, or NIN).</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className={`
                                        relative border-2 border-dashed rounded-xl p-4 md:p-8 text-center transition-all cursor-pointer
                                        h-48 md:h-64 flex flex-col items-center justify-center gap-4
                                        ${idFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}
                                    `}
                                    onClick={() => document.getElementById('id-upload')?.click()}
                                >
                                    <input
                                        id="id-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleFileChange(e, 'id')}
                                    />

                                    {idPreview ? (
                                        <div className="relative w-full h-full rounded-lg overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
                                            <img src={idPreview} alt="ID Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-white font-bold flex items-center gap-2">
                                                    <Upload className="h-4 w-4" /> Change Photo
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="h-12 w-12 md:h-16 md:w-16 rounded-full bg-muted flex items-center justify-center mb-2">
                                                <Upload className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-bold text-sm md:text-base">Click to upload ID</p>
                                                <p className="text-xs text-muted-foreground">JPG, PNG up to 5MB</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Selfie Upload */}
                        <Card className="bg-card border-border overflow-hidden group hover:border-primary/50 transition-all">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Camera className="h-5 w-5 text-primary" />
                                    Selfie with ID
                                </CardTitle>
                                <CardDescription>Take a selfie holding your ID next to your face.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className={`
                                        relative border-2 border-dashed rounded-xl p-4 md:p-8 text-center transition-all cursor-pointer
                                        h-48 md:h-64 flex flex-col items-center justify-center gap-4
                                        ${selfieFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}
                                    `}
                                    onClick={() => document.getElementById('selfie-upload')?.click()}
                                >
                                    <input
                                        id="selfie-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleFileChange(e, 'selfie')}
                                    />

                                    {selfiePreview ? (
                                        <div className="relative w-full h-full rounded-lg overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
                                            <img src={selfiePreview} alt="Selfie Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-white font-bold flex items-center gap-2">
                                                    <Upload className="h-4 w-4" /> Change Photo
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="h-12 w-12 md:h-16 md:w-16 rounded-full bg-muted flex items-center justify-center mb-2">
                                                <Camera className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-bold text-sm md:text-base">Click to upload Selfie</p>
                                                <p className="text-xs text-muted-foreground">Make sure face is visible</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Button
                        onClick={handleSubmit}
                        className="w-full h-12 text-base font-bold rounded-xl"
                        disabled={uploading || !idFile || !selfieFile}
                    >
                        {uploading ? (
                            <>
                                <LoadingSpinner className="mr-2 h-4 w-4" /> Submitting...
                            </>
                        ) : (
                            "Submit Verification"
                        )}
                    </Button>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default VerifyIdentity;
