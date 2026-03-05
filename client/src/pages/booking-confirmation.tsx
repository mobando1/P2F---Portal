import { Link } from "wouter";
import { useLanguage } from "@/lib/i18n";
import Header from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function BookingConfirmation() {
  const { language } = useLanguage();
  const isEs = language === "es";

  return (
    <div className="min-h-screen bg-[#EAF4FA]">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-16 text-center">
        <Card className="p-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#0A4A6E] mb-2">
            {isEs ? "Clase Reservada!" : "Class Booked!"}
          </h1>
          <p className="text-gray-600 mb-6">
            {isEs
              ? "Tu clase ha sido programada exitosamente. Revisa tu email para mas detalles."
              : "Your class has been scheduled successfully. Check your email for details."}
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/dashboard">
              <Button className="w-full bg-[#1C7BB1] hover:bg-[#0A4A6E]">
                {isEs ? "Ir a Mi Panel" : "Go to Dashboard"}
              </Button>
            </Link>
            <Link href="/tutors">
              <Button variant="outline" className="w-full border-[#1C7BB1] text-[#1C7BB1]">
                {isEs ? "Reservar Otra Clase" : "Book Another Class"}
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
