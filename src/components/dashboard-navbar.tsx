"use client";

import Link from 'next/link';
import { Button } from './ui/button';
import { createClient } from '../../supabase/client';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import UserProfile from './user-profile';
import { Phone, Zap, Bell, Search } from 'lucide-react';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Building, User as UserIcon, RefreshCw } from 'lucide-react';

export default function DashboardNavbar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasEmployeeAccount, setHasEmployeeAccount] = useState(false);
  const [hasPersonalAccount, setHasPersonalAccount] = useState(false);
  const [currentDashboard, setCurrentDashboard] = useState<"employee" | "personal" | null>(null);

  useEffect(() => {
    const supabase = createClient();
    
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Check for employee account
        const { data: employeeData } = await supabase
          .from("business_employees")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        // Check for personal/owner account
        const { data: userData } = await supabase
          .from("users")
          .select("account_type")
          .eq("id", user.id)
          .single();

        const { data: ownerData } = await supabase
          .from("business_accounts")
          .select("*")
          .eq("owner_id", user.id)
          .maybeSingle();

        setHasEmployeeAccount(!!employeeData);
        setHasPersonalAccount(userData?.account_type === "individual" || !!ownerData);

        // Determine current dashboard from localStorage
        const savedPreference = localStorage.getItem("dashboard_preference");
        setCurrentDashboard(savedPreference as "employee" | "personal" | null);
      }
      
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const switchDashboard = (type: "employee" | "personal") => {
    localStorage.setItem("dashboard_preference", type);
    setCurrentDashboard(type);
    window.location.reload();
  };

  if (loading) {
    return (
      <nav className="w-full border-b border-gray-200 bg-white py-4 shadow-sm">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="flex gap-4 items-center">
            <div className="w-64 h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="w-full border-b border-gray-200 bg-white py-4 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/dashboard" className="flex items-center space-x-2 group">
          <div className="relative">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <Zap className="w-2 h-2 text-white" />
            </div>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Numsphere
          </span>
        </Link>
        
        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input 
              placeholder="Search numbers, flows, contacts..." 
              className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex gap-4 items-center">
          {/* Dashboard Switcher - Only show if user has both accounts */}
          {hasEmployeeAccount && hasPersonalAccount && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  {currentDashboard === "employee" ? (
                    <>
                      <Building className="w-4 h-4" />
                      Employee
                    </>
                  ) : (
                    <>
                      <UserIcon className="w-4 h-4" />
                      Personal
                    </>
                  )}
                  <RefreshCw className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Switch Dashboard</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => switchDashboard("employee")}>
                  <Building className="w-4 h-4 mr-2" />
                  Employee Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => switchDashboard("personal")}>
                  <UserIcon className="w-4 h-4 mr-2" />
                  Personal Dashboard
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-5 h-5 text-gray-600" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
          </Button>

          {/* User Profile */}
          <UserProfile />
        </div>
      </div>
    </nav>
  );
}