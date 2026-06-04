import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export const RestrictedPaymentMethod = ({
    children,
    active,
    message = "This payment method is currently unavailable.",
}: {
    children: React.ReactNode,
    active: boolean,
    message?: string,
}) => {
    if (active) return <>{children}</>;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="opacity-50 cursor-not-allowed grayscale relative">
                        {children}
                        <div className="absolute inset-0 z-10" />
                    </div>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 border-none text-white font-bold text-xs">
                    <p>{message}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};
