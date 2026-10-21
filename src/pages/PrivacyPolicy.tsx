import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ShieldCheck, Lock, Eye, FileText } from "lucide-react";

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-[#F48221] selection:text-black">
            <Header />

            <main className="pt-24 pb-16 px-4 md:px-8 max-w-4xl mx-auto">
                <div className="flex flex-col items-center text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="h-16 w-16 bg-[#F48221]/10 rounded-2xl flex items-center justify-center text-[#F48221] mb-6">
                        <ShieldCheck size={32} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
                        Privacy Policy
                    </h1>
                    <p className="text-xl text-muted-foreground font-medium max-w-2xl">
                        We value your trust and are committed to protecting your personal data.
                    </p>
                </div>

                <div className="space-y-6 text-left">
                    <Section
                        icon={Eye}
                        title="1. Information We Collect"
                        content={
                            <>
                                <p className="mb-2">We only collect data that is strictly necessary for providing our services (Data Minimization). This includes:</p>
                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                    <li><strong>Identity Data:</strong> Name, government-issued ID number, and facial recognition data for identity verification (required for security).</li>
                                    <li><strong>Contact Data:</strong> Email address and phone number for booking confirmations and communication.</li>
                                    <li><strong>Financial Data:</strong> Payment information processed securely by our payment partners.</li>
                                    <li><strong>Transaction Data:</strong> Details about payments and bookings.</li>
                                </ul>
                            </>
                        }
                    />

                    <Section
                        icon={Lock}
                        title="2. Purpose of Collection"
                        content={
                            <>
                                <p className="mb-2">Your data is collected for specific, explicit, and legitimate purposes:</p>
                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                    <li>To verify your identity and ensure the safety of our hosts and guests.</li>
                                    <li>To process bookings and payments.</li>
                                    <li>To comply with legal obligations (e.g., guest registration laws).</li>
                                    <li>To communicate with you regarding your account or bookings.</li>
                                </ul>
                            </>
                        }
                    />

                    <Section
                        icon={ShieldCheck}
                        title="3. Data Security"
                        content="We implement robust technical and organizational measures to protect your personal data. This includes encryption of sensitive data (like IDs and payment details) both in transit and at rest, strict access controls, and regular security assessments considering the risks involved in processing personal data."
                    />

                    <Section
                        icon={FileText}
                        title="4. Your Rights"
                        content={
                            <>
                                <p className="mb-2">Under the Nigerian Data Protection Regulation (NDPR) and GDPR (where applicable), you have the right to:</p>
                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                    <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
                                    <li><strong>Rectification:</strong> Request correction of inaccurate or incomplete data.</li>
                                    <li><strong>Erasure:</strong> Request deletion of your personal data ('Right to be Forgotten'), subject to legal retention obligations.</li>
                                    <li><strong>Restriction:</strong> Request restriction of processing of your personal data.</li>
                                    <li><strong>Withdraw Consent:</strong> Withdraw your consent at any time where we rely on consent to process your data.</li>
                                </ul>
                            </>
                        }
                    />
                    <Section
                        icon={Eye}
                        title="5. Data Retention"
                        content="We retain your personal data only for as long as necessary to fulfill the purposes for which it was collected, including for the purposes of satisfying any legal, accounting, or reporting requirements."
                    />
                    <Section
                        icon={Eye}
                        title="6. Analytics and Advertising Cookies"
                        content="With your permission, we use Meta Pixel to measure website activity, understand how visitors use our services, and show more relevant Digital Ridr advertising. We do not send your name, email address, payment details, or identity-verification information through these events. You can accept, reject, or later change this choice using Cookie settings in the footer."
                    />
                </div>

                <div className="p-6 bg-muted/30 rounded-3xl border border-border mt-8">
                    <h3 className="font-bold text-lg mb-2">Contact Us</h3>
                    <p className="text-muted-foreground">
                        If you have any questions about this Privacy Policy, please contact us at <a href="mailto:privacy@digitalridr.com" className="text-[#F48221] hover:underline">privacy@digitalridr.com</a>.
                    </p>
                </div>

            </main >

            <Footer />
        </div >
    );
};

const Section = ({ icon: Icon, title, content }: { icon: any, title: string, content: React.ReactNode }) => (
    <div className="flex gap-6">
        <div className="shrink-0 mt-1">
            <div className="h-10 w-10 bg-muted rounded-xl flex items-center justify-center text-foreground">
                <Icon size={20} />
            </div>
        </div>
        <div>
            <h2 className="text-xl font-bold mb-3 text-foreground">{title}</h2>
            <p className="text-muted-foreground leading-relaxed">
                {content}
            </p>
        </div>
    </div>
);

export default PrivacyPolicy;
