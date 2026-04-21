import { SignUpForm } from "@/components/sign-up-form";
import { Building2 } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 hotel-gradient" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-lg">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold text-foreground">HotelOS</span>
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">
            Register Your Property
          </p>
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}
