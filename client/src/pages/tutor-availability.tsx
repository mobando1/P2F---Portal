import { useLocation } from "wouter";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
import Header from "@/components/header";
import TutorAvailabilityGrid from "@/components/TutorAvailabilityGrid";

export default function TutorAvailabilityPage() {
  const [, setLocation] = useLocation();
  const user = getCurrentUser();
  const isAuthed = isAuthenticated() && !!user;
  const isTutorOrAdmin = isAuthed && (user?.userType === "tutor" || user?.userType === "admin");

  if (!isAuthed) { setLocation("/login"); return null; }
  if (!isTutorOrAdmin) { setLocation("/home"); return null; }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F9FA" }}>
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <TutorAvailabilityGrid showBackButton />
      </main>
    </div>
  );
}
