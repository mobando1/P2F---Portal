import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, BookOpen, Globe, Clock, Star } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function Landing() {
  const { t } = useLanguage();

  const features = [
    {
      icon: <Users className="w-8 h-8 text-[#1C7BB1]" />,
      title: t.language === 'es' ? 'Profesores Certificados' : 'Certified Teachers',
      description: t.language === 'es' ? 'Aprende con profesores nativos y certificados' : 'Learn with native and certified teachers'
    },
    {
      icon: <Calendar className="w-8 h-8 text-[#1C7BB1]" />,
      title: t.language === 'es' ? 'Horarios Flexibles' : 'Flexible Schedules',
      description: t.language === 'es' ? 'Clases cuando más te convenga' : 'Classes when it suits you best'
    },
    {
      icon: <BookOpen className="w-8 h-8 text-[#1C7BB1]" />,
      title: t.language === 'es' ? 'Materiales Incluidos' : 'Materials Included',
      description: t.language === 'es' ? 'Acceso a recursos y ejercicios' : 'Access to resources and exercises'
    },
    {
      icon: <Globe className="w-8 h-8 text-[#1C7BB1]" />,
      title: t.language === 'es' ? 'Aprendizaje Personalizado' : 'Personalized Learning',
      description: t.language === 'es' ? 'Adaptado a tu nivel y objetivos' : 'Adapted to your level and goals'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EAF4FA] to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <img
                src="/assets/lOGO_1752434522756.png"
                alt="Passport2Fluency"
                className="h-10 w-auto"
              />
              <span className="text-2xl font-bold text-[#0A4A6E]">
                Passport2Fluency
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" asChild>
                <Link href="/login">{t.login}</Link>
              </Button>
              <Button asChild className="bg-[#1C7BB1] hover:bg-[#0A4A6E]">
                <a href="https://calendly.com/passport2fluency" target="_blank" rel="noopener noreferrer">
                  {t.language === 'es' ? 'Clase Gratis' : 'Free Trial'}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <Badge className="mb-4 bg-[#F59E1C] text-white">
                {t.language === 'es' ? '¡Primera Clase Gratis!' : 'Free First Class!'}
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold text-[#0A4A6E] mb-6">
                {t.language === 'es' ? 'Domina el ' : 'Master '}
                <span className="text-[#1C7BB1]">
                  {t.language === 'es' ? 'Inglés' : 'Spanish'}
                </span>
                {t.language === 'es' ? ' y el ' : ' and '}
                <span className="text-[#F59E1C]">
                  {t.language === 'es' ? 'Español' : 'English'}
                </span>
              </h1>
              <p className="text-xl text-[#0A4A6E]/70 mb-8">
                {t.journeyBegins}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button 
                  size="lg" 
                  className="bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white px-8"
                  asChild
                >
                  <a href="https://calendly.com/passport2fluency" target="_blank" rel="noopener noreferrer">
                    <Calendar className="w-5 h-5 mr-2" />
                    {t.language === 'es' ? 'Reservar Clase Gratis' : 'Book Free Trial'}
                  </a>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-[#1C7BB1] text-[#1C7BB1] hover:bg-[#1C7BB1] hover:text-white px-8"
                  asChild
                >
                  <Link href="/login">
                    {t.language === 'es' ? 'Acceder al Portal' : 'Access Portal'}
                  </Link>
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-[#1C7BB1]/20">
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-[#EAF4FA] rounded-full p-4">
                    <Globe className="w-12 h-12 text-[#1C7BB1]" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-[#0A4A6E] mb-4 text-center">
                  {t.language === 'es' ? '¿Por qué elegirnos?' : 'Why choose us?'}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Star className="w-5 h-5 text-[#F59E1C]" />
                    <span className="text-[#0A4A6E]">
                      {t.language === 'es' ? 'Profesores nativos certificados' : 'Certified native teachers'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-[#F59E1C]" />
                    <span className="text-[#0A4A6E]">
                      {t.language === 'es' ? 'Horarios flexibles 24/7' : 'Flexible schedules 24/7'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <BookOpen className="w-5 h-5 text-[#F59E1C]" />
                    <span className="text-[#0A4A6E]">
                      {t.language === 'es' ? 'Materiales incluidos' : 'Materials included'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0A4A6E] mb-4">
              {t.language === 'es' ? 'Nuestra Metodología' : 'Our Methodology'}
            </h2>
            <p className="text-xl text-[#0A4A6E]/70">
              {t.language === 'es' ? 'Aprendizaje efectivo y personalizado' : 'Effective and personalized learning'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-[#1C7BB1]/20 hover:shadow-lg transition-shadow">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-[#0A4A6E]">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-[#0A4A6E]/70">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#1C7BB1] to-[#0A4A6E]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            {t.language === 'es' ? '¡Comienza tu viaje hoy!' : 'Start your journey today!'}
          </h2>
          <p className="text-xl text-white/90 mb-8">
            {t.language === 'es' 
              ? 'Reserva tu clase gratuita y descubre cómo podemos ayudarte a alcanzar tus objetivos'
              : 'Book your free trial and discover how we can help you achieve your goals'
            }
          </p>
          <Button 
            size="lg" 
            className="bg-[#F59E1C] hover:bg-[#F59E1C]/90 text-white px-8"
            asChild
          >
            <a href="https://calendly.com/passport2fluency" target="_blank" rel="noopener noreferrer">
              <Calendar className="w-5 h-5 mr-2" />
              {t.language === 'es' ? 'Reservar Ahora' : 'Book Now'}
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A4A6E] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <img
                  src="/assets/lOGO_1752434522756.png"
                  alt="Passport2Fluency"
                  className="h-8 w-auto"
                />
                <span className="text-xl font-bold">Passport2Fluency</span>
              </div>
              <p className="text-white/70">
                {t.language === 'es' 
                  ? 'Tu academia de confianza para dominar inglés y español'
                  : 'Your trusted academy to master English and Spanish'
                }
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">
                {t.language === 'es' ? 'Enlaces' : 'Links'}
              </h4>
              <ul className="space-y-2 text-white/70">
                <li><Link href="/login" className="hover:text-white">{t.language === 'es' ? 'Portal de Estudiantes' : 'Student Portal'}</Link></li>
                <li><a href="https://calendly.com/passport2fluency" target="_blank" rel="noopener noreferrer" className="hover:text-white">{t.language === 'es' ? 'Clase Gratis' : 'Free Trial'}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">
                {t.language === 'es' ? 'Contacto' : 'Contact'}
              </h4>
              <p className="text-white/70">
                info@passport2fluency.com
              </p>
            </div>
          </div>
          <div className="border-t border-white/20 mt-8 pt-8 text-center text-white/70">
            <p>&copy; 2025 Passport2Fluency. {t.language === 'es' ? 'Todos los derechos reservados.' : 'All rights reserved.'}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}