import { useState } from "react";
import Header from "@/components/header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Phone, Mail, MapPin, Clock, Send } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function Contact() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    currentLevel: '',
    preferredContact: 'email'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await apiRequest("POST", "/api/contact", {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        level: formData.currentLevel || undefined,
        subject: formData.subject,
        message: formData.message,
        preferredContact: formData.preferredContact || undefined,
      });

      toast({
        title: language === 'es' ? "Mensaje Enviado" : "Message Sent",
        description: language === 'es'
          ? "Gracias por contactarnos. Te responderemos dentro de 24 horas."
          : "Thank you for contacting us. We'll respond within 24 hours.",
      });

      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        currentLevel: '',
        preferredContact: 'email'
      });
    } catch (error) {
      toast({
        title: language === 'es' ? "Error" : "Error",
        description: language === 'es'
          ? "Hubo un problema enviando tu mensaje. Intenta de nuevo."
          : "There was a problem sending your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-[#EAF4FA]">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#0A4A6E] mb-4">
            {language === 'es' ? 'Contáctanos' : 'Contact Us'}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {language === 'es' 
              ? 'Estamos aquí para ayudarte en tu camino hacia la fluidez en español. ¡Ponte en contacto con nosotros!'
              : 'We\'re here to help you on your journey to Spanish fluency. Get in touch with us!'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Información de Contacto */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-[#0A4A6E] mb-6">
              {language === 'es' ? 'Información de Contacto' : 'Contact Information'}
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="bg-[#1C7BB1] p-3 rounded-lg">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#0A4A6E]">
                    {language === 'es' ? 'Teléfono' : 'Phone'}
                  </h3>
                  <p className="text-gray-600">+1 (555) 123-4567</p>
                  <p className="text-sm text-gray-500">
                    {language === 'es' ? 'Lunes a Viernes, 9:00 AM - 6:00 PM EST' : 'Monday to Friday, 9:00 AM - 6:00 PM EST'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="bg-[#F59E1C] p-3 rounded-lg">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#0A4A6E]">
                    {language === 'es' ? 'Correo Electrónico' : 'Email'}
                  </h3>
                  <p className="text-gray-600">info@passport2fluency.com</p>
                  <p className="text-sm text-gray-500">
                    {language === 'es' ? 'Respuesta en menos de 24 horas' : 'Response within 24 hours'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="bg-[#1C7BB1] p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#0A4A6E]">
                    {language === 'es' ? 'Horarios de Atención' : 'Business Hours'}
                  </h3>
                  <p className="text-gray-600">
                    {language === 'es' ? 'Lunes - Viernes: 9:00 AM - 6:00 PM EST' : 'Monday - Friday: 9:00 AM - 6:00 PM EST'}
                  </p>
                  <p className="text-gray-600">
                    {language === 'es' ? 'Sábados: 10:00 AM - 2:00 PM EST' : 'Saturday: 10:00 AM - 2:00 PM EST'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="bg-[#F59E1C] p-3 rounded-lg">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#0A4A6E]">
                    {language === 'es' ? 'Ubicación' : 'Location'}
                  </h3>
                  <p className="text-gray-600">
                    {language === 'es' ? 'Clases virtuales en línea' : 'Online virtual classes'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {language === 'es' ? 'Desde cualquier lugar del mundo' : 'From anywhere in the world'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Formulario de Contacto */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-[#0A4A6E] mb-6">
              {language === 'es' ? 'Envíanos un Mensaje' : 'Send us a Message'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0A4A6E] mb-2">
                    {language === 'es' ? 'Nombre Completo' : 'Full Name'} *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C7BB1] focus:border-transparent"
                    placeholder={language === 'es' ? 'Tu nombre completo' : 'Your full name'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#0A4A6E] mb-2">
                    {language === 'es' ? 'Correo Electrónico' : 'Email'} *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C7BB1] focus:border-transparent"
                    placeholder={language === 'es' ? 'tu@email.com' : 'your@email.com'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0A4A6E] mb-2">
                    {language === 'es' ? 'Teléfono' : 'Phone'}
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C7BB1] focus:border-transparent"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#0A4A6E] mb-2">
                    {language === 'es' ? 'Nivel Actual de Español' : 'Current Spanish Level'}
                  </label>
                  <select
                    name="currentLevel"
                    value={formData.currentLevel}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C7BB1] focus:border-transparent"
                  >
                    <option value="">
                      {language === 'es' ? 'Seleccionar nivel' : 'Select level'}
                    </option>
                    <option value="beginner">
                      {language === 'es' ? 'Principiante' : 'Beginner'}
                    </option>
                    <option value="intermediate">
                      {language === 'es' ? 'Intermedio' : 'Intermediate'}
                    </option>
                    <option value="advanced">
                      {language === 'es' ? 'Avanzado' : 'Advanced'}
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0A4A6E] mb-2">
                  {language === 'es' ? 'Asunto' : 'Subject'} *
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C7BB1] focus:border-transparent"
                  placeholder={language === 'es' ? 'Motivo de tu consulta' : 'Reason for your inquiry'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0A4A6E] mb-2">
                  {language === 'es' ? 'Mensaje' : 'Message'} *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C7BB1] focus:border-transparent resize-none"
                  placeholder={language === 'es' 
                    ? 'Cuéntanos cómo podemos ayudarte con tu aprendizaje de español...'
                    : 'Tell us how we can help you with your Spanish learning...'
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0A4A6E] mb-2">
                  {language === 'es' ? 'Forma Preferida de Contacto' : 'Preferred Contact Method'}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="preferredContact"
                      value="email"
                      checked={formData.preferredContact === 'email'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    {language === 'es' ? 'Correo' : 'Email'}
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="preferredContact"
                      value="phone"
                      checked={formData.preferredContact === 'phone'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    {language === 'es' ? 'Teléfono' : 'Phone'}
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-[#1C7BB1] to-[#0A4A6E] text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {isSubmitting 
                  ? (language === 'es' ? 'Enviando...' : 'Sending...')
                  : (language === 'es' ? 'Enviar Mensaje' : 'Send Message')
                }
              </button>
            </form>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-[#0A4A6E] mb-8 text-center">
            {language === 'es' ? 'Preguntas Frecuentes' : 'Frequently Asked Questions'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-[#0A4A6E] mb-2">
                {language === 'es' ? '¿Cómo funciona el programa?' : 'How does the program work?'}
              </h3>
              <p className="text-gray-600">
                {language === 'es' 
                  ? 'Nuestro programa ofrece clases personalizadas con profesores nativos certificados, materiales interactivos y seguimiento de progreso.'
                  : 'Our program offers personalized classes with certified native teachers, interactive materials, and progress tracking.'
                }
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-[#0A4A6E] mb-2">
                {language === 'es' ? '¿Puedo cancelar mi suscripción?' : 'Can I cancel my subscription?'}
              </h3>
              <p className="text-gray-600">
                {language === 'es' 
                  ? 'Sí, puedes cancelar tu suscripción en cualquier momento. Ofrecemos una garantía de 30 días.'
                  : 'Yes, you can cancel your subscription at any time. We offer a 30-day guarantee.'
                }
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-[#0A4A6E] mb-2">
                {language === 'es' ? '¿Qué nivel necesito para empezar?' : 'What level do I need to start?'}
              </h3>
              <p className="text-gray-600">
                {language === 'es' 
                  ? 'Aceptamos estudiantes de todos los niveles, desde principiante absoluto hasta avanzado.'
                  : 'We accept students of all levels, from absolute beginner to advanced.'
                }
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-[#0A4A6E] mb-2">
                {language === 'es' ? '¿Las clases son en grupo o individuales?' : 'Are classes group or individual?'}
              </h3>
              <p className="text-gray-600">
                {language === 'es' 
                  ? 'Ofrecemos clases individuales personalizadas para maximizar tu aprendizaje.'
                  : 'We offer personalized individual classes to maximize your learning.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}