"use client";

import { User } from "@supabase/supabase-js";
import { Button } from "./ui/button";
import {
    Card,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    CardContent
} from "./ui/card";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useToast } from "./ui/use-toast";

export default function PricingCard({ item, user }: {
    item: any,
    user: User | null
}) {
    const router = useRouter();
    const { toast } = useToast();

    // Handle checkout process - navigate to custom checkout page
    const handleCheckout = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log("Get Started clicked for plan:", item);
        
        if (!user) {
            // Redirect to login if user is not authenticated
            router.push("/login?redirect=/pricing");
            return;
        }

        if (!item.priceId) {
            console.error("No price ID found for plan:", item.name, "Item:", item);
            toast({
                title: "Configuration Error",
                description: `Stripe price ID not found for ${item.name}. Please ensure your Stripe plans are configured with matching prices ($${item.price}/month).`,
                variant: "destructive",
            });
            return;
        }

        // Navigate to custom checkout page
        console.log("Navigating to checkout with plan:", item.id, "priceId:", item.priceId);
        router.push(`/checkout?plan=${item.id}&priceId=${item.priceId}`);
    };

    const price = item.price || (item.amount ? item.amount / 100 : 0);
    const minutes = item.minutes || 0;
    const numbers = item.numbers || 0;

    return (
        <Card className={`relative overflow-hidden ${item.popular ? 'border-2 border-blue-500 shadow-xl scale-105' : 'border border-gray-200'}`}>
            {item.popular && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-30" />
            )}
            <CardHeader className="relative">
                {item.popular && (
                    <div className="px-4 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full w-fit mb-4">
                        Most Popular
                    </div>
                )}
                <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">{item.name}</CardTitle>
                <CardDescription className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-bold text-gray-900">${price.toFixed(2)}</span>
                    <span className="text-gray-600">/month</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>{minutes.toLocaleString()} min</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>{numbers} number{numbers !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Check className="h-4 w-4 text-gray-400" />
                    <span>Coming soon: calling & flows</span>
                </div>
            </CardContent>
            <CardFooter className="relative flex flex-col">
                <Button
                    type="button"
                    onClick={handleCheckout}
                    className={`w-full py-6 text-lg font-medium`}
                    disabled={!item.priceId}
                >
                    {item.priceId ? "Get Started" : "Configure Plan"}
                </Button>
                {!item.priceId && (
                    <p className="text-xs text-red-500 mt-2 text-center w-full">
                        Stripe plan not configured. Please create a Stripe plan with price ${item.price}/month.
                    </p>
                )}
            </CardFooter>
        </Card>
    )
}