import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";

interface NewsletterSignupProps {
  className?: string;
  variant?: "default" | "inline";
}

export default function NewsletterSignup({ className = "", variant = "default" }: NewsletterSignupProps) {
  const { language } = useLanguage();
  const isEs = language === "es";
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setDone(true);
        setEmail("");
        toast({ title: isEs ? "¡Suscrito! Gracias por unirte." : "Subscribed! Thanks for joining." });
      } else {
        toast({ title: isEs ? "Error al suscribirse" : "Subscription failed", variant: "destructive" });
      }
    } catch {
      toast({ title: isEs ? "Error de red" : "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className={`flex items-center gap-2 text-green-600 text-sm ${className}`}>
        <Mail className="h-4 w-4" />
        {isEs ? "¡Gracias! Estás suscrito." : "Thanks! You're subscribed."}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
      <Input
        type="email"
        placeholder={isEs ? "Tu correo electrónico" : "Your email address"}
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="flex-1"
      />
      <Button type="submit" disabled={loading}>
        {loading
          ? (isEs ? "..." : "...")
          : (isEs ? "Suscribirse" : "Subscribe")}
      </Button>
    </form>
  );
}
