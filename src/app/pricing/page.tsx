import Navbar from "@/components/navbar";
import PricingCard from "@/components/pricing-card";
import { createClient } from "../../../supabase/server";

// Define the pricing plans
const PLANS = [
    {
        id: "starter",
        name: "Starter",
        price: 29.99,
        minutes: 400,
        numbers: 1,
        popular: false,
    },
    {
        id: "professional",
        name: "Professional",
        price: 69.99,
        minutes: 1500,
        numbers: 3,
        popular: true,
    },
    {
        id: "business",
        name: "Business",
        price: 149.99,
        minutes: 3500,
        numbers: 7,
        popular: false,
    },
    {
        id: "enterprise",
        name: "Enterprise",
        price: 349.99,
        minutes: 10000,
        numbers: 15,
        popular: false,
    },
];

export default async function Pricing() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get Stripe plans to map price IDs
    let stripePlans: any[] = [];
    try {
        const { data, error } = await supabase.functions.invoke('get-plans');
        if (error) {
            console.error("Error fetching Stripe plans:", error);
        } else {
            stripePlans = data || [];
        }
    } catch (error) {
        console.error("Error invoking get-plans function:", error);
    }
    
    // Map Stripe plans to our plan structure
    const plansWithPriceIds = PLANS.map(plan => {
        // Try to find matching Stripe plan by name or amount
        const planPrice = Math.round(plan.price * 100);
        const stripePlan = stripePlans?.find((sp: any) => {
            const spAmount = sp.amount || 0;
            const spNickname = (sp.nickname || "").toLowerCase();
            const planNameLower = plan.name.toLowerCase();
            
            return spNickname === planNameLower || 
                   spAmount === planPrice ||
                   (spNickname.includes(planNameLower) && Math.abs(spAmount - planPrice) < 100);
        });
        
        if (!stripePlan) {
            console.warn(`No matching Stripe plan found for ${plan.name} ($${plan.price})`);
        }
        
        return {
            ...plan,
            priceId: stripePlan?.id || "",
            stripePlan: stripePlan,
        };
    });

    return (
        <>
            <Navbar />
            <div className="container mx-auto px-4 py-16">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
                    <p className="text-xl text-muted-foreground">
                        Choose the perfect plan for your needs
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                    {plansWithPriceIds.map((item: any) => (
                        <PricingCard key={item.id} item={item} user={user} />
                    ))}
                </div>
            </div>
        </>
    );
}