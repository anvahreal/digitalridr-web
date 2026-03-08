import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { supabase } from "@/lib/supabase";
import {
  ChevronLeft, Camera, MapPin, Search,
  CheckCircle2, Plus, Minus, Home, Sparkles, X, Play, Video,
  Check, ChevronsUpDown, DollarSign, Calendar, Shield, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { formatNaira } from "@/lib/utils";
import { AMENITIES } from "@/constants/amenities";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const LAGOS_DISTRICTS = [
  "Abule Egba", "Agidingbi", "Agege", "Ajah", "Akoka", "Alagbado", "Alapere", "Alausa", "Alimosho",
  "Amuwo Odofin", "Anthony Village", "Apapa", "Badagry", "Banana Island", "Bariga", "Berger",
  "Bode Thomas", "Costain", "Dolphin Estate", "Ebute Metta", "Egbeda", "Eko Atlantic", "Epe",
  "Festac Town", "Gbagada", "Gowon Estate", "Ibeju Lekki", "Idimu", "Igando", "Ikeja GRA",
  "Ikorodu", "Ikotun", "Ikoyi", "Ilupeju", "Ipaja", "Isolo", "Iyana Ipaja",
  "Jakande", "Jibowu", "Ketu", "Lagos Island", "Lekki Phase 1", "Lekki Phase 2",
  "Magodo", "Maryland", "Mile 2", "Mushin", "Obalende", "Ogba", "Ogudu", "Ojo",
  "Ojodu", "Ojota", "Okota", "Omole Phase 1", "Omole Phase 2", "Onikan", "Onipanu", "Opebi",
  "Oshodi", "Palmgrove", "Raji Oba", "Sangotedo", "Satellite Town", "Shomolu", "Surulere",
  "Victoria Garden City (VGC)", "Victoria Island (VI)", "Yaba"
].sort();

const CreateListing = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Check if editing
  const isEditMode = !!id;

  const { user, updateProfile } = useProfile();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [openDistrict, setOpenDistrict] = useState(false);

  // Host Interest Form State
  const [interestFormOpen, setInterestFormOpen] = useState(false);
  const [interestData, setInterestData] = useState({
    name: "",
    phone: "",
    location: "",
    propertyType: "Apartment"
  });

  // Pre-fill user data if available when opening form
  useEffect(() => {
    if (user && interestFormOpen) {
      setInterestData(prev => ({
        ...prev,
        name: user.user_metadata?.full_name || prev.name,
        phone: user.user_metadata?.phone_number || prev.phone
      }));
    }
  }, [user, interestFormOpen]);

  // Handle WhatsApp Inquiry
  const handleSendInquiry = () => {
    if (!interestData.name || !interestData.phone) {
      toast.error("Please provide your name and phone number.");
      return;
    }

    const message = `Hi Digital Ridr, I'm interested in hosting a ${interestData.propertyType} in ${interestData.location || "Lagos"}. My name is ${interestData.name} (${interestData.phone}). Can you guide me?`;
    window.open(`https://wa.me/2348000000000?text=${encodeURIComponent(message)}`, '_blank');
    setInterestFormOpen(false);
    toast.success("Inquiry sent! Redirecting to WhatsApp...");
  };

  const totalSteps = 3;

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "", // Added description
    location: "",
    address: "", // Specific street address
    price: "",
    bedrooms: 1,
    bathrooms: 1,
    guests: 2,
    amenities: [] as string[],
    house_rules: "", // Added house rules
    images: [] as string[], // Stores public URLs
    video_url: "",
    security_deposit: "", // Added security deposit
    wifi_name: "",
    wifi_password: "",
    access_code: "",
    check_in_instructions: "",
    host_logo: "", // Added host logo field
  });

  const [uploading, setUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  // Fetch data if editing
  useEffect(() => {
    if (!id) return;

    const fetchListing = async () => {
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          setFormData({
            title: data.title,
            description: data.description || "",
            location: data.location,
            address: data.address || "",
            price: data.price_per_night.toString(),
            bedrooms: data.bedrooms,
            bathrooms: data.bathrooms,
            guests: data.max_guests,
            amenities: data.amenities || [],
            images: data.images || [],
            video_url: data.video_url || "",
            security_deposit: data.security_deposit ? data.security_deposit.toString() : "",
            house_rules: Array.isArray(data.house_rules) ? data.house_rules.join('\n') : (data.house_rules || ""),
            wifi_name: data.wifi_name || "",
            wifi_password: data.wifi_password || "",
            access_code: data.access_code || "",
            check_in_instructions: data.check_in_instructions || "",
            host_logo: data.host_logo || "",
          });
        }
      } catch (err: any) {
        toast.error("Failed to load listing details");
        navigate("/host/dashboard");
      } finally {
        setFetching(false);
      }
    };

    fetchListing();
  }, [id, navigate]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter(a => a !== amenity)
          : [...prev.amenities, amenity]
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!user) {
      toast.error("You must be logged in to upload images.");
      return;
    }

    setUploading(true);
    try {
      const newImages = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('listing-images')
          .getPublicUrl(filePath);

        newImages.push(publicUrl);
      }

      setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
      toast.success("Images uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload images");
    } finally {
      setUploading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      toast.error("You must be logged in to upload a logo.");
      return;
    }

    setLogoUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('listing-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, host_logo: publicUrl }));
      toast.success("Host logo uploaded successfully!");
    } catch (error: any) {
      console.error("Logo upload error:", error);
      toast.error(error.message || "Failed to upload host logo");
    } finally {
      setLogoUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const saveListing = async () => {
    if (!user) {
      toast.error("You must be logged in to host.");
      return;
    }
    if (!formData.title || !formData.location || !formData.address || !formData.price || formData.images.length === 0) {
      toast.error("Please fill in all required fields (Address included) and upload at least one photo.");
      return;
    }

    setLoading(true);
    try {
      const priceValue = parseInt(formData.price.toString().replace(/[^0-9]/g, ''));
      const securityDepositValue = formData.security_deposit ? parseInt(formData.security_deposit.toString().replace(/[^0-9]/g, '')) : 0;

      const payload = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        address: formData.address,
        price_per_night: priceValue,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        max_guests: formData.guests,
        amenities: formData.amenities,
        house_rules: formData.house_rules.split('\n').filter(r => r.trim() !== ''), // Convert to array
        images: formData.images,
        city: "Lagos",
        country: "Nigeria",
        video_url: formData.video_url,
        host_id: user.id,
        security_deposit: securityDepositValue,
        wifi_name: formData.wifi_name,
        wifi_password: formData.wifi_password,
        access_code: formData.access_code,
        check_in_instructions: formData.check_in_instructions,
        host_logo: formData.host_logo, // Include host_logo in payload
      };

      if (isEditMode) {
        const { error } = await supabase
          .from('listings')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
        toast.success("Listing updated successfully!");
      } else {
        const { error } = await supabase
          .from('listings')
          .insert({ ...payload, rating: 0, review_count: 0, is_superhost: false });
        if (error) throw error;

        // Update profile to be a host
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_host: true })
          .eq('id', user.id);

        if (profileError) console.error("Failed to update host status:", profileError);

        toast.success("Listing published successfully! You are now a host.");
      }

      navigate("/host/dashboard");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || "Failed to save listing");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && (!formData.title || !formData.price || !formData.location)) {
      toast.error("Please completely fill out the basics.");
      return;
    }
    setStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  if (fetching) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><LoadingSpinner className="h-10 w-10" /></div>;
  }

  // Host Approval Check
  if (user?.host_status !== 'approved') {
    return (
      <div className="min-h-screen bg-background font-sans transition-colors duration-300">
        {/* Navigation */}
        <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/assets/digitalridr-logo.PNG" alt="Digital Ridr Apartments" className="h-8 w-auto" />
            </div>
            <Button variant="ghost" onClick={() => navigate('/')} className="font-bold text-sm">
              Back to Home
            </Button>
          </div>
        </header>

        <main className="pt-24 pb-20">
          {/* Hero Section */}
          <section className="container mx-auto px-4 mb-20">
            <div className="max-w-4xl mx-auto text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="inline-flex items-center justify-center p-3 mb-4 rounded-full bg-[#F48221]/10 text-[#F48221]">
                <Sparkles className="h-6 w-6" />
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-foreground tracking-tight leading-tight">
                Turn your space into <br />
                <span className="text-[#F48221]">extra income</span>.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
                Join thousands of hosts renting their homes on Digital Ridr. It's simple, secure, and rewarding.
              </p>

              <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                {user?.host_status === 'pending' ? (
                  <div className="flex items-center gap-3 px-8 py-4 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-2xl font-bold border border-orange-200 dark:border-orange-800">
                    <LoadingSpinner className="h-4 w-4" />
                    Application Pending Review
                  </div>
                ) : (
                  <Button
                    size="lg"
                    onClick={async () => {
                      try {
                        await updateProfile({ host_status: 'pending' });
                        toast.success("Application submitted! Pending approval.");
                      } catch (e: any) {
                        toast.error(`Failed to apply: ${e.message || "Unknown error"}`);
                      }
                    }}
                    className="h-14 px-8 rounded-full bg-[#F48221] hover:bg-[#E36D0B] text-white font-black text-lg shadow-lg shadow-orange-500/20 active:scale-95 transition-all w-full sm:w-auto"
                  >
                    Apply to Host
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setInterestFormOpen(true)}
                  className="h-14 px-8 rounded-full border-2 border-border font-bold text-lg hover:bg-muted w-full sm:w-auto"
                >
                  Learn More
                </Button>
              </div>

              {/* Host Interest Form Modal */}
              <Dialog open={interestFormOpen} onOpenChange={setInterestFormOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-center">Let's get started</DialogTitle>
                    <DialogDescription className="text-center">
                      Tell us a bit about yourself and your property. We'll guide you through the rest on WhatsApp.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name" className="font-bold">Full Name</Label>
                      <Input
                        id="name"
                        value={interestData.name}
                        onChange={(e) => setInterestData({ ...interestData, name: e.target.value })}
                        className="rounded-xl bg-muted/50 border-transparent h-11"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone" className="font-bold">Phone Number</Label>
                      <Input
                        id="phone"
                        value={interestData.phone}
                        onChange={(e) => setInterestData({ ...interestData, phone: e.target.value })}
                        className="rounded-xl bg-muted/50 border-transparent h-11"
                        placeholder="080..."
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="location" className="font-bold">Property Location (Area)</Label>
                      <Input
                        id="location"
                        value={interestData.location}
                        onChange={(e) => setInterestData({ ...interestData, location: e.target.value })}
                        className="rounded-xl bg-muted/50 border-transparent h-11"
                        placeholder="e.g. Lekki Phase 1"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="type" className="font-bold">Property Type</Label>
                      <Select
                        value={interestData.propertyType}
                        onValueChange={(val) => setInterestData({ ...interestData, propertyType: val })}
                      >
                        <SelectTrigger className="w-full rounded-xl bg-muted/50 border-transparent h-11">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="Apartment">Apartment</SelectItem>
                          <SelectItem value="House">House</SelectItem>
                          <SelectItem value="Studio">Studio</SelectItem>
                          <SelectItem value="Villa">Villa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSendInquiry} className="w-full rounded-xl h-12 font-bold bg-[#25D366] hover:bg-[#128C7E] text-white gap-2">
                      Send Inquiry via WhatsApp <ArrowRight className="h-4 w-4" />
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </section>

          {/* Benefits Grid */}
          <section className="container mx-auto px-4 mb-24">
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  icon: DollarSign,
                  title: "Earn Extra Income",
                  desc: "Share your space and earn money to fund your dreams.",
                  color: "text-emerald-500",
                  bg: "bg-emerald-500/10"
                },
                {
                  icon: Calendar,
                  title: "Host Your Way",
                  desc: "You decide when your space is available and how you host.",
                  color: "text-blue-500",
                  bg: "bg-blue-500/10"
                },
                {
                  icon: Shield,
                  title: "Peace of Mind",
                  desc: "We verify guests and provide 24/7 support for every booking.",
                  color: "text-purple-500",
                  bg: "bg-purple-500/10"
                }
              ].map((item, i) => (
                <div key={i} className="bg-card p-8 rounded-[2rem] border border-border/50 hover:border-border transition-colors text-center space-y-4">
                  <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center ${item.bg} ${item.color}`}>
                    <item.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-black text-foreground">{item.title}</h3>
                  <p className="text-muted-foreground font-medium">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Steps */}
          <section className="container mx-auto px-4 mb-20">
            <div className="max-w-3xl mx-auto bg-muted/30 rounded-[3rem] p-8 md:p-12">
              <h2 className="text-3xl font-black text-center mb-12">How it works</h2>
              <div className="space-y-8">
                {[
                  { step: "01", title: "Apply to Host", desc: "Fill out a quick application. Our team will verify your identity." },
                  { step: "02", title: "List Your Space", desc: "Upload photos, set your price, and tell guests what makes your place special." },
                  { step: "03", title: "Welcome Guests", desc: "Receive bookings and earn money seamlessly through our platform." }
                ].map((s, i) => (
                  <div key={i} className="flex gap-6 items-start">
                    <span className="text-4xl font-black text-muted-foreground/20 shrink-0">{s.step}</span>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-1">{s.title}</h3>
                      <p className="text-muted-foreground">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-6">Ready to get started?</h2>
            {user?.host_status !== 'pending' && (
              <Button
                size="lg"
                onClick={async () => {
                  try {
                    await updateProfile({ host_status: 'pending' });
                    toast.success("Application submitted! Pending approval.");
                  } catch (e: any) {
                    toast.error(`Failed to apply: ${e.message || "Unknown error"}`);
                  }
                }}
                className="h-12 px-8 rounded-full bg-foreground text-background font-bold hover:bg-foreground/90 gap-2"
              >
                Start Hosting <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans transition-colors duration-300">
      {/* HEADER */}
      <header className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-50 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full text-foreground hover:bg-muted">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 w-6 rounded-full transition-all duration-500 ${step >= s ? "bg-primary w-10" : "bg-muted"
                  }`}
              />
            ))}
          </div>
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Step {step}/3</span>
        </div>
      </header>

      <main className="flex-1 py-6 px-4 pb-32">
        <div className="max-w-xl mx-auto space-y-8">

          {/* STEP 1: BASICS & LOCATION SEARCH */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header>
                <h1 className="text-3xl font-black text-foreground tracking-tighter">{isEditMode ? "Edit Listing" : "The Basics"}</h1>
                <p className="text-muted-foreground font-medium text-sm">Where is your luxury space located?</p>
              </header>

              <Card className="border-border shadow-soft rounded-[2.5rem] p-6 space-y-6 bg-card">
                <FormInput
                  label="Listing Title"
                  placeholder="e.g. Waterfront VI Penthouse"
                  value={formData.title}
                  onChange={(e: any) => handleInputChange("title", e.target.value)}
                />

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">About this place</label>
                  <Textarea
                    placeholder="Describe your property..."
                    className="min-h-[120px] bg-muted border-none rounded-2xl p-4 font-medium text-foreground resize-none focus-visible:ring-2 focus-visible:ring-primary/20"
                    value={formData.description}
                    onChange={(e: any) => handleInputChange("description", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">District</label>
                    <Popover open={openDistrict} onOpenChange={setOpenDistrict}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openDistrict}
                          className="w-full h-14 justify-between bg-muted border-none rounded-2xl px-4 font-bold text-foreground hover:bg-muted/80"
                        >
                          {formData.location
                            ? LAGOS_DISTRICTS.find((dict) => dict === formData.location)
                            : "Select District..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search district..." />
                          <CommandList>
                            <CommandEmpty>No district found.</CommandEmpty>
                            <CommandGroup>
                              {LAGOS_DISTRICTS.map((dict) => (
                                <CommandItem
                                  key={dict}
                                  value={dict}
                                  onSelect={() => {
                                    handleInputChange("location", dict);
                                    setOpenDistrict(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.location === dict ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {dict}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <FormInput
                    label="Street Address"
                    placeholder="e.g. 10 Admiralty Way"
                    value={formData.address}
                    onChange={(e: any) => handleInputChange("address", e.target.value)}
                  />

                  {/* Map Preview */}
                  {(formData.address || formData.location) && (
                    <div className="aspect-video w-full rounded-2xl overflow-hidden bg-muted border border-border mt-2">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(`${formData.address || ''}, ${formData.location || ''}, Lagos, Nigeria`)}&output=embed`}
                        title="Location Preview"
                        className="w-full h-full border-0"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>

                <FormInput
                  label="Price per Night (₦)"
                  placeholder="150,000"
                  type="number"
                  value={formData.price}
                  onChange={(e: any) => handleInputChange("price", e.target.value)}
                />

                <FormInput
                  label="Refundable Security Deposit (₦)"
                  placeholder="e.g. 50,000 (Optional)"
                  type="number"
                  value={formData.security_deposit}
                  onChange={(e: any) => handleInputChange("security_deposit", e.target.value)}
                />
              </Card>
            </div>
          )}

          {/* STEP 2: SPACE DETAILS */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header>
                <h1 className="text-3xl font-black text-foreground tracking-tighter">Space Details</h1>
                <p className="text-muted-foreground font-medium text-sm">Define the capacity and check-in details.</p>
              </header>

              <div className="grid grid-cols-1 gap-4">
                <Counter label="Bedrooms" value={formData.bedrooms} onChange={(v) => handleInputChange("bedrooms", v)} />
                <Counter label="Bathrooms" value={formData.bathrooms} onChange={(v) => handleInputChange("bathrooms", v)} />
                <Counter label="Max Guests" value={formData.guests} onChange={(v) => handleInputChange("guests", v)} />
              </div>

              {/* CHECK-IN INFO (New Section) */}
              <div className="bg-card border border-border rounded-[2rem] p-6 space-y-4">
                <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-2">
                  <span className="bg-emerald-500/10 text-emerald-600 p-1 rounded-md">Guest Access (Optional)</span>
                  (Visible only after booking)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Wifi Name (SSID)"
                    placeholder="e.g. Luxury_Guest"
                    value={formData.wifi_name}
                    onChange={(e: any) => handleInputChange("wifi_name", e.target.value)}
                  />
                  <FormInput
                    label="Wifi Password"
                    placeholder="e.g. Guest@2024"
                    value={formData.wifi_password}
                    onChange={(e: any) => handleInputChange("wifi_password", e.target.value)}
                  />
                  <FormInput
                    label="Access Code / Key Box"
                    placeholder="e.g. 1234 or Lobby (Optional)"
                    value={formData.access_code}
                    onChange={(e: any) => handleInputChange("access_code", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Special Check-in Instructions (Optional)</label>
                  <Textarea
                    placeholder="e.g. The key is under the mat, gate code is *777# (Optional)..."
                    className="min-h-[80px] bg-muted border-none rounded-2xl p-4 font-medium text-foreground resize-none focus-visible:ring-2 focus-visible:ring-primary/20"
                    value={formData.check_in_instructions}
                    onChange={(e: any) => handleInputChange("check_in_instructions", e.target.value)}
                  />
                </div>
              </div>


              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Key Amenities</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {AMENITIES.map((item) => (
                    <AmenityButton
                      key={item}
                      label={item}
                      selected={formData.amenities.includes(item)}
                      onClick={() => toggleAmenity(item)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">House Rules</h3>
                <Textarea
                  placeholder="e.g. No parties, quiet hours after 10 PM, no smoking..."
                  className="min-h-[100px] bg-muted border-none rounded-2xl p-4 font-medium text-foreground resize-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  value={formData.house_rules}
                  onChange={(e: any) => handleInputChange("house_rules", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 3: PHOTO UPLOAD */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header>
                <h1 className="text-3xl font-black text-foreground tracking-tighter">Visuals & Tour</h1>
                <p className="text-muted-foreground font-medium text-sm">Upload photos and add a virtual tour.</p>
              </header>

              <label
                className={`group border-4 border-dashed border-border rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center bg-card transition-all cursor-pointer relative overflow-hidden ${uploading ? 'opacity-50 pointer-events-none' : 'hover:border-primary hover:bg-muted/50'}`}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                  {uploading ? <LoadingSpinner className="h-8 w-8" /> : <Camera className="h-8 w-8 text-primary" />}
                </div>
                <p className="font-black text-foreground">{uploading ? "Uploading..." : "Add Property Photos"}</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Drag and drop or tap to browse</p>
              </label>

              {/* Image Preview Grid */}
              {formData.images.length > 0 && (
                <div className="grid grid-cols-3 gap-4 animate-in fade-in">
                  {formData.images.map((url, idx) => (
                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden shadow-sm group border border-border">
                      <img src={url} className="w-full h-full object-cover" alt="Preview" />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-2 right-2 p-1 bg-black/50 backdrop-blur rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-6 border-t border-border space-y-4">
                <FormInput
                  label="Virtual Tour URL (YouTube Only)"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={formData.video_url}
                  onChange={(e: any) => handleInputChange("video_url", e.target.value)}
                />
              </div>

              {/* Host Logo Upload Section */}
              <div className="pt-8 border-t border-border">
                <h3 className="text-xl font-bold text-foreground mb-4">Host Logo (Optional)</h3>
                <p className="text-sm text-muted-foreground mb-4">Add a logo to display on your listing page.</p>
                <div className="flex items-center gap-6">
                  <div className="relative h-24 w-24 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-muted/50 overflow-hidden">
                    {formData.host_logo ? (
                      <img src={formData.host_logo} alt="Host Logo" className="h-full w-full object-cover" />
                    ) : (
                      <Camera className="h-8 w-8 text-muted-foreground opacity-50" />
                    )}
                    {formData.host_logo && (
                      <button
                        onClick={() => handleInputChange('host_logo', '')}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <label className={`cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 ${logoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={logoUploading}
                    />
                    {logoUploading ? "Uploading..." : formData.host_logo ? "Change Logo" : "Upload Logo"}
                  </label>
                </div>
              </div>

              {/* Concierge Video Upload */}
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-800">Have a video file instead?</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">Send it to us via WhatsApp and we'll upload it for you.</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white hover:bg-emerald-100 border-emerald-200 text-emerald-700 h-9 rounded-xl gap-2 shadow-sm"
                  onClick={() => window.open(`https://wa.me/2348000000000?text=${encodeURIComponent(`Hello DigitalRidr, I have a video tour for my listing "${formData.title || 'Untitled'}" that I'd like to upload.`)}`, '_blank')}
                >
                  <Video className="h-4 w-4" /> Send Video
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER NAVIGATION */}
      < footer className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border p-4 pb-8 md:pb-6 z-50" >
        <div className="max-w-xl mx-auto flex gap-4">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={loading}
              className="rounded-2xl h-14 px-6 border-2 border-border font-black text-xs uppercase hover:bg-muted text-foreground"
            >
              Back
            </Button>
          )}
          <Button
            onClick={step === totalSteps ? saveListing : nextStep}
            disabled={loading || uploading}
            className="flex-1 rounded-2xl h-14 font-black shadow-xl transition-all active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? (
              <><LoadingSpinner className="mr-2 h-4 w-4" /> {isEditMode ? "Saving..." : "Publishing..."}</>
            ) : (
              step === totalSteps ? (isEditMode ? "Save Changes" : "Finish & Launch") : "Next Step"
            )}
          </Button>
        </div>
      </footer >
    </div >
  );
};

// --- HELPERS ---

const FormInput = ({ label, placeholder, type = "text", value, onChange }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">{label}</label>
    <Input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full h-14 bg-muted border-none rounded-2xl px-6 font-bold text-foreground focus:ring-2 focus:ring-primary/20 transition-all text-sm placeholder:text-muted-foreground"
    />
  </div>
);

const Counter = ({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) => {
  return (
    <div className="flex items-center justify-between p-5 bg-card rounded-[2rem] shadow-none border border-border">
      <span className="font-black text-foreground text-sm tracking-tight">{label}</span>
      <div className="flex items-center gap-4 bg-muted p-1.5 rounded-xl">
        <button onClick={() => onChange(Math.max(1, value - 1))} className="h-8 w-8 flex items-center justify-center rounded-lg bg-card shadow-sm text-foreground font-bold hover:bg-muted/80 transition-colors"><Minus className="h-4 w-4" /></button>
        <span className="w-4 text-center font-black text-sm text-foreground">{value}</span>
        <button onClick={() => onChange(value + 1)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-foreground shadow-sm text-background font-bold hover:bg-foreground/90 transition-colors"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
};

const AmenityButton = ({ label, selected, onClick }: { label: string, selected: boolean, onClick: () => void }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 font-black text-xs uppercase tracking-tight ${selected ? 'border-primary bg-primary text-white shadow-lg' : 'border-border bg-card text-muted-foreground hover:bg-muted'
        }`}
    >
      {label}
      <CheckCircle2 className={`h-4 w-4 ${selected ? 'text-white' : 'text-muted-foreground/30'}`} />
    </button>
  );
};

export default CreateListing;