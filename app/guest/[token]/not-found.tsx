import Link from "next/link";
import { Building2, QrCode } from "lucide-react";

export default function GuestNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <QrCode className="h-10 w-10 text-muted-foreground opacity-50" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">QR Code Invalid</h1>
          <p className="text-muted-foreground mt-2">
            This QR code is no longer valid or the room does not exist.
            Please ask the front desk for a new QR code.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" />
          HotelOS
        </div>
      </div>
    </div>
  );
}
