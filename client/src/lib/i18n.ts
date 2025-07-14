// Multi-language support for Passport2Fluency
import React from 'react';

export type Language = 'es' | 'en';

export interface Translations {
  // Navigation
  dashboard: string;
  tutors: string;
  plans: string;
  admin: string;
  about: string;
  contact: string;
  login: string;
  signup: string;
  logout: string;
  
  // Dashboard
  welcome: string;
  continueJourney: string;
  classesBooked: string;
  classesCompleted: string;
  learningHours: string;
  currentLevel: string;
  availableTutors: string;
  choosePreferredTutor: string;
  upcomingClasses: string;
  noUpcomingClasses: string;
  quickActions: string;
  bookNewClass: string;
  viewProgress: string;
  contactSupport: string;
  updatePlan: string;
  exploreTutors: string;
  reserveFirstClass: string;
  
  // Tutors Page
  findIdealTutor: string;
  findIdealTutorDesc: string;
  searchPlaceholder: string;
  allLanguages: string;
  allLevels: string;
  anyRating: string;
  showing: string;
  of: string;
  tutorsText: string;
  languages: string;
  specialties: string;
  levels: string;
  pricePerClass: string;
  perHour: string;
  bookClass: string;
  noTutorsFound: string;
  adjustFilters: string;
  clearFilters: string;
  
  // Calendar
  bookYourClasses: string;
  selectDateTime: string;
  classesRemaining: string;
  selectDate: string;
  selectTutor: string;
  selectTime: string;
  bookClassButton: string;
  cancel: string;
  
  // Levels
  beginner: string;
  elementary: string;
  intermediate: string;
  upperIntermediate: string;
  advanced: string;
  mastery: string;
  
  // Common
  with: string;
  by: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
  rememberMe: string;
  forgotPassword: string;
  loggingIn: string;
  registering: string;
  createAccount: string;
  demoCredentials: string;
  welcome: string;
  welcomeBack: string;
  accountCreated: string;
  loginFailed: string;
  registrationFailed: string;
  checkCredentials: string;
  journeyBegins: string;
  stars: string;
  reviews: string;
  country: string;
  rating: string;
  
  // Months
  january: string;
  february: string;
  march: string;
  april: string;
  may: string;
  june: string;
  july: string;
  august: string;
  september: string;
  october: string;
  november: string;
  december: string;
  
  // Days
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  
  // Short days
  mon: string;
  tue: string;
  wed: string;
  thu: string;
  fri: string;
  sat: string;
  sun: string;
}

export const translations: Record<Language, Translations> = {
  es: {
    // Navigation
    dashboard: 'Panel',
    tutors: 'Tutores',
    plans: 'Planes',
    admin: 'Admin',
    about: 'Acerca de',
    contact: 'Contacto',
    login: 'Iniciar Sesión',
    signup: 'Registrarse',
    logout: 'Cerrar Sesión',
    
    // Dashboard
    welcomeName: '¡Bienvenido,',
    continueJourney: 'Continúa tu camino hacia la fluidez en idiomas',
    classesBooked: 'Clases Reservadas',
    classesCompleted: 'Clases Completadas',
    learningHours: 'Horas de Aprendizaje',
    currentLevel: 'Nivel Actual',
    availableTutors: 'Tutores Disponibles',
    choosePreferredTutor: 'Elige tu tutor preferido para tus próximas clases',
    upcomingClasses: 'Próximas Clases',
    noUpcomingClasses: 'No hay clases programadas',
    quickActions: 'Acciones Rápidas',
    bookNewClass: 'Reservar Nueva Clase',
    viewProgress: 'Ver Progreso',
    contactSupport: 'Contactar Soporte',
    updatePlan: 'Actualizar Plan',
    exploreTutors: 'Explorar Tutores',
    reserveFirstClass: '¡Reserva tu primera clase con uno de nuestros tutores!',
    
    // Tutors Page
    findIdealTutor: 'Encuentra tu',
    findIdealTutorDesc: 'Explora nuestros tutores certificados y encuentra el perfecto para tu camino hacia la fluidez',
    searchPlaceholder: 'Buscar por nombre o especialidad...',
    allLanguages: 'Todos los idiomas',
    allLevels: 'Todos los niveles',
    anyRating: 'Cualquier calificación',
    showing: 'Mostrando',
    of: 'de',
    tutorsText: 'tutores',
    languages: 'Idiomas',
    specialties: 'Especialidades',
    levels: 'Niveles',
    pricePerClass: 'Precio por clase',
    perHour: '/hora',
    bookClass: 'Reservar Clase',
    noTutorsFound: 'No se encontraron tutores',
    adjustFilters: 'Intenta ajustar tus filtros de búsqueda para encontrar más tutores',
    clearFilters: 'Limpiar Filtros',
    
    // Calendar
    bookYourClasses: 'Reserva tus Clases',
    selectDateTime: 'Selecciona una fecha y hora para reservar tu próxima clase. Tienes',
    classesRemaining: 'clases disponibles.',
    selectDate: 'Seleccionar Fecha',
    selectTutor: 'Seleccionar Tutor',
    selectTime: 'Seleccionar Hora',
    bookClassButton: 'Reservar Clase',
    cancel: 'Cancelar',
    
    // Levels
    beginner: 'Principiante',
    elementary: 'Elemental',
    intermediate: 'Intermedio',
    upperIntermediate: 'Intermedio Alto',
    advanced: 'Avanzado',
    mastery: 'Maestría',
    
    // Common
    with: 'con',
    by: 'por',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    firstName: 'Nombre',
    lastName: 'Apellido',
    username: 'Nombre de Usuario',
    rememberMe: 'Recordarme',
    forgotPassword: '¿Olvidaste tu contraseña?',
    loggingIn: 'Iniciando sesión...',
    registering: 'Registrando...',
    createAccount: 'Crear Cuenta',
    demoCredentials: 'Credenciales de Prueba',
    welcome: '¡Bienvenido!',
    welcomeBack: '¡Bienvenido de nuevo!',
    accountCreated: 'Cuenta creada exitosamente',
    loginFailed: 'Error al iniciar sesión',
    registrationFailed: 'Error al registrarse',
    checkCredentials: 'Verifica tus credenciales e intenta de nuevo',
    journeyBegins: 'Tu camino hacia la fluidez en idiomas comienza aquí',
    stars: 'estrellas',
    reviews: 'reseñas',
    country: 'país',
    rating: 'calificación',
    
    // Months
    january: 'Enero',
    february: 'Febrero',
    march: 'Marzo',
    april: 'Abril',
    may: 'Mayo',
    june: 'Junio',
    july: 'Julio',
    august: 'Agosto',
    september: 'Septiembre',
    october: 'Octubre',
    november: 'Noviembre',
    december: 'Diciembre',
    
    // Days
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo',
    
    // Short days
    mon: 'Lun',
    tue: 'Mar',
    wed: 'Mié',
    thu: 'Jue',
    fri: 'Vie',
    sat: 'Sáb',
    sun: 'Dom',
  },
  
  en: {
    // Navigation
    dashboard: 'Dashboard',
    tutors: 'Tutors',
    plans: 'Plans',
    admin: 'Admin',
    about: 'About',
    contact: 'Contact',
    login: 'Log In',
    signup: 'Sign Up',
    logout: 'Log Out',
    
    // Dashboard
    welcomeName: 'Welcome,',
    continueJourney: 'Continue your language fluency journey',
    classesBooked: 'Classes Booked',
    classesCompleted: 'Classes Completed',
    learningHours: 'Learning Hours',
    currentLevel: 'Current Level',
    availableTutors: 'Available Tutors',
    choosePreferredTutor: 'Choose your preferred tutor for upcoming classes',
    upcomingClasses: 'Upcoming Classes',
    noUpcomingClasses: 'No upcoming classes scheduled',
    quickActions: 'Quick Actions',
    bookNewClass: 'Book New Class',
    viewProgress: 'View Progress',
    contactSupport: 'Contact Support',
    updatePlan: 'Update Plan',
    exploreTutors: 'Explore Tutors',
    reserveFirstClass: 'Book your first class with one of our tutors!',
    
    // Tutors Page
    findIdealTutor: 'Find your',
    findIdealTutorDesc: 'Explore our certified tutors and find the perfect one for your fluency journey',
    searchPlaceholder: 'Search by name or specialty...',
    allLanguages: 'All languages',
    allLevels: 'All levels',
    anyRating: 'Any rating',
    showing: 'Showing',
    of: 'of',
    tutorsText: 'tutors',
    languages: 'Languages',
    specialties: 'Specialties',
    levels: 'Levels',
    pricePerClass: 'Price per class',
    perHour: '/hour',
    bookClass: 'Book Class',
    noTutorsFound: 'No tutors found',
    adjustFilters: 'Try adjusting your search filters to find more tutors',
    clearFilters: 'Clear Filters',
    
    // Calendar
    bookYourClasses: 'Book Your Classes',
    selectDateTime: 'Select a date and time to book your next class. You have',
    classesRemaining: 'classes remaining.',
    selectDate: 'Select Date',
    selectTutor: 'Select Tutor',
    selectTime: 'Select Time',
    bookClassButton: 'Book Class',
    cancel: 'Cancel',
    
    // Levels
    beginner: 'Beginner',
    elementary: 'Elementary',
    intermediate: 'Intermediate',
    upperIntermediate: 'Upper Intermediate',
    advanced: 'Advanced',
    mastery: 'Mastery',
    
    // Common
    with: 'with',
    by: 'by',
    email: 'Email',
    password: 'Password',
    firstName: 'First Name',
    lastName: 'Last Name',
    username: 'Username',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot your password?',
    loggingIn: 'Logging in...',
    registering: 'Registering...',
    createAccount: 'Create Account',
    demoCredentials: 'Demo Credentials',
    welcome: 'Welcome!',
    welcomeBack: 'Welcome back!',
    accountCreated: 'Account created successfully',
    loginFailed: 'Login failed',
    registrationFailed: 'Registration failed',
    checkCredentials: 'Please check your credentials and try again',
    journeyBegins: 'Your path to language fluency starts here',
    stars: 'stars',
    reviews: 'reviews',
    country: 'country',
    rating: 'rating',
    
    // Months
    january: 'January',
    february: 'February',
    march: 'March',
    april: 'April',
    may: 'May',
    june: 'June',
    july: 'July',
    august: 'August',
    september: 'September',
    october: 'October',
    november: 'November',
    december: 'December',
    
    // Days
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
    
    // Short days
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    sun: 'Sun',
  }
};

// Language context and hooks
import { createContext, useContext, useState, useEffect } from 'react';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    // Check localStorage first, then browser language, fallback to Spanish
    const saved = localStorage.getItem('language') as Language;
    if (saved && (saved === 'es' || saved === 'en')) {
      return saved;
    }
    
    // Better browser language detection
    const browserLang = navigator.language.toLowerCase();
    const browserLangShort = browserLang.split('-')[0];
    
    // Check for English variants
    if (browserLangShort === 'en' || browserLang.includes('en')) {
      return 'en';
    }
    
    // Check for Spanish variants
    if (browserLangShort === 'es' || browserLang.includes('es')) {
      return 'es';
    }
    
    // Default to Spanish for Latin American users
    return 'es';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = translations[language];
  const contextValue = { language, setLanguage, t };

  return React.createElement(
    LanguageContext.Provider,
    { value: contextValue },
    children
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Utility function for month names
export function getMonthNames(language: Language): string[] {
  const t = translations[language];
  return [
    t.january, t.february, t.march, t.april, t.may, t.june,
    t.july, t.august, t.september, t.october, t.november, t.december
  ];
}

// Utility function for day names
export function getDayNames(language: Language): string[] {
  const t = translations[language];
  return [t.mon, t.tue, t.wed, t.thu, t.fri, t.sat, t.sun];
}

// Utility function for level mapping
export function getLevelText(level: string, language: Language): string {
  const t = translations[language];
  const levelMap: Record<string, string> = {
    'A1': t.beginner,
    'A2': t.elementary,
    'B1': t.intermediate,
    'B2': t.upperIntermediate,
    'C1': t.advanced,
    'C2': t.mastery,
  };
  return levelMap[level] || level;
}