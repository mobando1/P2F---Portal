import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import Header from "@/components/header";
import { TutorListSkeleton } from "@/components/loading-skeletons";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import {
  Search,
  Star,
  MapPin,
  Clock,
  Filter,
  X,
} from "lucide-react";
import type { Tutor } from "@shared/schema";

export default function TutorsPage() {
  const { language } = useLanguage();
  const isEs = language === "es";
  const user = getCurrentUser();
  const search = useSearch();
  const [, setLocation] = useLocation();

  // Parse URL query params
  const params = new URLSearchParams(search);
  const initialClassType = params.get("classType") || "all";
  const initialLanguage = params.get("language") || "all";

  const [classType, setClassType] = useState(initialClassType);
  const [langFilter, setLangFilter] = useState(initialLanguage);
  const [ratingFilter, setRatingFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Sync URL params when filters change
  useEffect(() => {
    const p = new URLSearchParams();
    if (classType !== "all") p.set("classType", classType);
    if (langFilter !== "all") p.set("language", langFilter);
    const qs = p.toString();
    setLocation(`/tutors${qs ? `?${qs}` : ""}`, { replace: true });
  }, [classType, langFilter]);

  // Build API query with filters
  const apiParams = new URLSearchParams();
  if (classType !== "all") apiParams.set("classType", classType);
  if (langFilter !== "all") apiParams.set("language", langFilter);
  if (ratingFilter !== "all") apiParams.set("minRating", ratingFilter);
  if (searchTerm) apiParams.set("search", searchTerm);
  const apiUrl = `/api/tutors${apiParams.toString() ? `?${apiParams.toString()}` : ""}`;

  const { data: tutors = [], isLoading } = useQuery<Tutor[]>({
    queryKey: ["/api/tutors", classType, langFilter, ratingFilter, searchTerm],
    queryFn: async () => {
      const res = await fetch(apiUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tutors");
      return res.json();
    },
  });

  const clearFilters = () => {
    setClassType("all");
    setLangFilter("all");
    setRatingFilter("all");
    setSearchTerm("");
  };

  const hasActiveFilters = classType !== "all" || langFilter !== "all" || ratingFilter !== "all" || searchTerm !== "";

  const categoryLabel = (ct: string, lang: string) => {
    if (ct === "all" && lang === "all") return isEs ? "Todas las Categorias" : "All Categories";
    const type = ct === "kids" ? (isEs ? "Ninos" : "Kids") : (isEs ? "Adultos" : "Adults");
    const language = lang === "english" ? (isEs ? "Ingles" : "English") : (isEs ? "Espanol" : "Spanish");
    if (ct === "all") return language;
    if (lang === "all") return type;
    return `${language} - ${type}`;
  };

  return (
    <div className="min-h-screen bg-[#EAF4FA]">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-[#0A4A6E] mb-1">
            {isEs ? "Nuestros Profesores" : "Our Tutors"}
          </h1>
          <p className="text-gray-600">
            {hasActiveFilters
              ? categoryLabel(classType, langFilter)
              : isEs
                ? "Explora nuestros profesores certificados y elige el perfecto para ti"
                : "Browse our certified tutors and find the perfect one for you"}
          </p>
        </motion.div>

        {/* Mobile filter toggle */}
        <Button
          variant="outline"
          className="lg:hidden mb-4 border-[#1C7BB1] text-[#1C7BB1]"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          {isEs ? "Filtros" : "Filters"}
          {hasActiveFilters && (
            <span className="ml-2 bg-[#F59E1C] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">!</span>
          )}
        </Button>

        <div className="flex gap-8">
          {/* Filter Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={`${showMobileFilters ? "block" : "hidden"} lg:block w-full lg:w-64 flex-shrink-0`}
          >
            <Card className="p-5 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#0A4A6E]">
                  {isEs ? "Filtros" : "Filters"}
                </h3>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-[#1C7BB1] hover:underline">
                    {isEs ? "Limpiar" : "Clear"}
                  </button>
                )}
              </div>

              {/* Search */}
              <div className="mb-5">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  {isEs ? "Buscar" : "Search"}
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder={isEs ? "Nombre o especialidad..." : "Name or specialty..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="mb-5">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  {isEs ? "Categoria" : "Category"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "all", label: isEs ? "Todos" : "All" },
                    { value: "adults", label: isEs ? "Adultos" : "Adults" },
                    { value: "kids", label: isEs ? "Ninos" : "Kids" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setClassType(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                        classType === opt.value
                          ? "bg-[#1C7BB1] text-white shadow-md shadow-[#1C7BB1]/20"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div className="mb-5">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  {isEs ? "Idioma que ensena" : "Language Taught"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "all", label: isEs ? "Todos" : "All" },
                    { value: "spanish", label: isEs ? "Espanol" : "Spanish" },
                    { value: "english", label: isEs ? "Ingles" : "English" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setLangFilter(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                        langFilter === opt.value
                          ? "bg-[#1C7BB1] text-white shadow-md shadow-[#1C7BB1]/20"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div className="mb-2">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  {isEs ? "Calificacion minima" : "Minimum Rating"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "all", label: isEs ? "Todas" : "Any" },
                    { value: "4.5", label: "4.5+" },
                    { value: "4", label: "4+" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setRatingFilter(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                        ratingFilter === opt.value
                          ? "bg-[#F59E1C] text-white shadow-md shadow-[#F59E1C]/20"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {opt.value !== "all" && <Star className="w-3 h-3" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </motion.aside>

          {/* Tutor Cards */}
          <div className="flex-1">
            {/* Results count */}
            <p className="text-sm text-gray-500 mb-4">
              {isEs ? `Mostrando ${tutors.length} profesores` : `Showing ${tutors.length} tutors`}
            </p>

            {isLoading ? (
              <TutorListSkeleton />
            ) : tutors.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  {isEs ? "No se encontraron profesores" : "No tutors found"}
                </h3>
                <p className="text-gray-500 mb-4">
                  {isEs ? "Intenta ajustar tus filtros" : "Try adjusting your filters"}
                </p>
                <Button onClick={clearFilters} variant="outline" className="border-[#1C7BB1] text-[#1C7BB1]">
                  {isEs ? "Limpiar Filtros" : "Clear Filters"}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {tutors.map((tutor) => (
                  <motion.div key={tutor.id} variants={fadeInUp}>
                    <motion.div whileHover={{ y: -3, boxShadow: "0 10px 30px rgba(28, 123, 177, 0.1)" }} transition={{ duration: 0.2 }}>
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-5">
                          <div className="flex flex-col sm:flex-row gap-5">
                            {/* Avatar */}
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                              {tutor.avatar ? (
                                <img
                                  src={tutor.avatar}
                                  alt={tutor.name}
                                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                />
                              ) : (
                                <div className="w-full h-full bg-[#1C7BB1] flex items-center justify-center text-white text-2xl font-bold">
                                  {tutor.name.split(" ").map(n => n[0]).join("")}
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div>
                                <h3 className="text-lg font-bold text-[#0A4A6E]">{tutor.name}</h3>
                                <p className="text-sm text-[#1C7BB1] font-medium">{tutor.specialization}</p>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 fill-[#F59E1C] text-[#F59E1C]" />
                                  <span className="font-semibold">{tutor.rating}</span>
                                  <span>({tutor.reviewCount} {isEs ? "resenas" : "reviews"})</span>
                                </div>
                                {tutor.country && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span>{tutor.country}</span>
                                  </div>
                                )}
                                {tutor.yearsOfExperience && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{tutor.yearsOfExperience} {isEs ? "anos" : "yrs"}</span>
                                  </div>
                                )}
                              </div>

                              {tutor.bio && (
                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                  {tutor.bio}
                                </p>
                              )}

                              <div className="flex gap-3 mt-4">
                                <Link href={`/tutor/${tutor.id}`}>
                                  <Button className="bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white">
                                    {isEs ? "Ver Perfil" : "View Profile"}
                                  </Button>
                                </Link>
                                <Link href={`/tutor/${tutor.id}`}>
                                  <Button variant="outline" className="border-[#F59E1C] text-[#F59E1C] hover:bg-[#F59E1C] hover:text-white">
                                    {user?.trialCompleted
                                      ? (isEs ? "Reservar Clase" : "Book Class")
                                      : (isEs ? "Clase Gratis" : "Free Trial")}
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
