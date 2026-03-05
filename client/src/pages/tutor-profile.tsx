import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Star, MapPin, Clock, Award } from "lucide-react";
import { fadeInUp, fadeInLeft, fadeInRight, staggerContainer } from "@/lib/animations";

type Tutor = {
  id: number;
  name: string;
  email: string;
  specialization: string;
  bio: string | null;
  avatar: string | null;
  rating: string;
  reviewCount: number;
  classType: string;
  languageTaught: string;
  country: string | null;
  timezone: string | null;
  languages: string[] | null;
  certifications: string[] | null;
  yearsOfExperience: number | null;
};

type Review = {
  id: number;
  rating: number;
  comment: string | null;
  userName: string;
  createdAt: string;
};

export default function TutorProfilePage() {
  const [, params] = useRoute("/tutor/:id");
  const tutorId = params?.id;
  const { language } = useLanguage();
  const isEs = language === "es";

  const { data: tutor, isLoading } = useQuery<Tutor>({
    queryKey: [`/api/tutors/${tutorId}`],
    enabled: !!tutorId,
  });

  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: [`/api/tutors/${tutorId}/reviews`],
    enabled: !!tutorId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#EAF4FA]">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C7BB1]" />
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen bg-[#EAF4FA]">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-700">
            {isEs ? "Profesor no encontrado" : "Tutor not found"}
          </h2>
          <Link href="/tutors">
            <Button className="mt-4 bg-[#1C7BB1]">
              {isEs ? "Volver a Profesores" : "Back to Tutors"}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EAF4FA]">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link href="/tutors">
          <Button variant="ghost" className="mb-6 text-[#1C7BB1] hover:text-[#0A4A6E] -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {isEs ? "Volver a Profesores" : "Back to Tutors"}
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="lg:col-span-2 space-y-6"
          >
            {/* Profile Header */}
            <motion.div variants={fadeInLeft}>
              <Card className="p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="w-32 h-32 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                    {tutor.avatar ? (
                      <img
                        src={tutor.avatar}
                        alt={tutor.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#1C7BB1] flex items-center justify-center text-white text-3xl font-bold">
                        {tutor.name.split(" ").map(n => n[0]).join("")}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-[#0A4A6E]">{tutor.name}</h1>
                    <p className="text-[#1C7BB1] font-medium mt-1">{tutor.specialization}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-[#F59E1C] text-[#F59E1C]" />
                        <span className="font-semibold">{tutor.rating}</span>
                        <span>({tutor.reviewCount} {isEs ? "resenas" : "reviews"})</span>
                      </div>
                      {tutor.country && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{tutor.country}</span>
                        </div>
                      )}
                      {tutor.yearsOfExperience && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{tutor.yearsOfExperience} {isEs ? "anos exp." : "yrs exp."}</span>
                        </div>
                      )}
                    </div>
                    {tutor.languages && tutor.languages.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {tutor.languages.map(lang => (
                          <span key={lang} className="px-2 py-1 bg-[#EAF4FA] text-[#1C7BB1] rounded-full text-xs font-medium">
                            {lang}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* About */}
            <motion.div variants={fadeInUp}>
              <Card className="p-6">
                <h2 className="text-xl font-bold text-[#0A4A6E] mb-3">
                  {isEs ? "Sobre mi" : "About Me"}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{tutor.bio}</p>
              </Card>
            </motion.div>

            {/* Certifications */}
            {tutor.certifications && tutor.certifications.length > 0 && (
              <motion.div variants={fadeInUp}>
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-[#0A4A6E] mb-3">
                    {isEs ? "Certificaciones" : "Certifications"}
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {tutor.certifications.map(cert => (
                      <div key={cert} className="flex items-center gap-2 px-3 py-2 bg-[#F59E1C]/10 rounded-lg">
                        <Award className="w-4 h-4 text-[#F59E1C]" />
                        <span className="text-sm font-medium text-[#0A4A6E]">{cert}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Reviews */}
            <motion.div variants={fadeInUp}>
              <Card className="p-6">
                <h2 className="text-xl font-bold text-[#0A4A6E] mb-4">
                  {isEs ? "Resenas de Estudiantes" : "Student Reviews"} ({reviews.length})
                </h2>
                {reviews.length === 0 ? (
                  <p className="text-gray-500">
                    {isEs ? "Aun no hay resenas" : "No reviews yet"}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map(review => (
                      <motion.div
                        key={review.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-b border-gray-100 pb-4 last:border-0"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${i < review.rating ? "fill-[#F59E1C] text-[#F59E1C]" : "text-gray-300"}`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium text-gray-700">{review.userName}</span>
                        </div>
                        {review.comment && (
                          <p className="text-gray-600 text-sm">{review.comment}</p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          </motion.div>

          {/* Booking Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-24">
              <Card className="p-6">
                <Link href={`/tutors`}>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button className="w-full bg-[#F59E1C] hover:bg-[#e08a0e] text-white font-semibold py-6 text-lg mb-3 shadow-lg shadow-[#F59E1C]/20">
                      {isEs ? "Reservar Clase Gratis" : "Book Free Trial"}
                    </Button>
                  </motion.div>
                </Link>

                <p className="text-center text-xs text-gray-400 mt-2">
                  {isEs
                    ? "Tu primera clase de 50 min es GRATIS"
                    : "Your first 50-min class is FREE"}
                </p>

                <div className="mt-6 pt-4 border-t">
                  <p className="text-sm text-gray-500 text-center">
                    {isEs
                      ? "El calendario de reserva estara disponible pronto"
                      : "Booking calendar coming soon"}
                  </p>
                </div>
              </Card>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
