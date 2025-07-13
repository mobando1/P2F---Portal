# Passport2Fluency Client Portal

## Overview
A comprehensive client portal for Passport2Fluency online Spanish school featuring subscription-based class booking, tutor management, and course access. Built with modern web technologies and inspired by Preply.com's design patterns.

## Project Architecture

### Frontend (React + TypeScript)
- **Framework**: React with TypeScript, Vite build system
- **Routing**: Wouter for client-side routing
- **UI Components**: Shadcn/ui with Tailwind CSS
- **State Management**: TanStack Query for server state
- **Forms**: React Hook Form with Zod validation
- **Payments**: Stripe React integration
- **Authentication**: Session-based auth with local storage

### Backend (Node.js + Express)
- **Runtime**: Node.js with Express server
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy
- **Payments**: Stripe API integration
- **Session Management**: Express sessions with PostgreSQL store

### Key Features
- User authentication and profile management
- Subscription-based class booking system
- Enhanced calendar with time slot selection
- Tutor selection and booking interface
- Video library for course content
- Progress tracking and analytics
- Stripe payment integration
- Responsive design with Passport2Fluency branding

## Database Schema

### Core Tables
- **users**: User profiles with authentication data
- **subscriptions**: Subscription plans and billing info
- **tutors**: Tutor profiles and availability
- **classes**: Scheduled classes and booking data
- **videos**: Course video library
- **user_progress**: Learning progress tracking

## Recent Changes

### January 1, 2025
✓ Fixed CSS build error caused by invalid @apply group utility in index.css
✓ Removed invalid @apply group-hover:bg-black/20 from video-overlay CSS class
✓ Added group-hover:bg-black/20 directly to HTML elements in video library component
✓ Resolved TailwindCSS PostCSS processing error
✓ Build process now completes successfully without CSS errors
✓ Deployment build issues resolved

### January 1, 2025 - Sistema Completo de Profesores y High Level
✓ Configuré base de datos PostgreSQL con esquemas expandidos para profesores
✓ Creé servicio completo de integración con High Level CRM
✓ Implementé gestión avanzada de profesores con fotos y disponibilidad
✓ Agregué panel de administración en `/admin` para gestionar profesores
✓ Configuré notificaciones automáticas: confirmación, recordatorios y cancelaciones
✓ Incluí 6 profesores reales con datos completos y fotos de perfil
✓ Creé APIs para importación masiva y gestión de calendarios
✓ Documenté guía completa de configuración en SETUP_GUIDE.md

### July 3, 2025 - Sistema de Notificaciones Automáticas Duales
✓ Implementé notificaciones duales automáticas (alumno + profesor) al reservar clase
✓ Configuré confirmaciones inmediatas via High Level para ambas partes
✓ Agregué notificaciones automáticas de cancelación para alumno y profesor
✓ Creé sistema de recordatorios automáticos 24h antes de cada clase
✓ Integré programación automática de recordatorios al crear clase
✓ Sistema funciona automáticamente cuando usuario logueado reserva clase
✓ Servicio de recordatorios ejecuta verificaciones cada hora automáticamente

### July 13, 2025 - Integración Completa de Branding Passport2Fluency
✓ Implementé paleta de colores oficial de la marca en toda la aplicación
✓ Integré logos actualizados de Passport2Fluency en header y login
✓ Apliqué colores de marca: Azul cielo (#1C7BB1), Naranja sol (#F59E1C), Azul noche (#0A4A6E)
✓ Actualicé fondos con Azul niebla (#EAF4FA) y Gris nube (#F8F9FA)
✓ Rediseñé dashboard con tarjetas de estadísticas usando colores de marca
✓ Mejoré página de login con diseño profesional y colores corporativos
✓ Actualizé header con navegación en colores de marca y botones estilizados
✓ Aplicé tipografía y espaciado consistente con identidad visual
✓ Rediseñé página de login con logo horizontal, animaciones modernas e iconos integrados
✓ Implementé mensaje inclusivo para español e inglés: "Tu camino hacia la fluidez en idiomas comienza aquí"
✓ Optimicé UX eliminando elementos confusos y mejorando credenciales de prueba

### July 13, 2025 - Sistema de Internacionalización Completo
✓ Implementé sistema completo de internacionalización (i18n) para español e inglés
✓ Creé biblioteca de traducciones con 100+ strings localizados
✓ Agregué selector de idioma en header con detección automática del navegador
✓ Configuré persistencia de idioma en localStorage
✓ Actualicé dashboard completo con traducciones dinámicas
✓ Implementé página de tutores completamente bilingüe con filtros localizados
✓ Mejoré UX con traducciones contextuales y formatos de fecha apropiados
✓ Corregí errores de header que causaban warnings en consola
✓ Integré funciones utilitarias para niveles y fechas localizadas

### December 27, 2025
✓ Implemented Stripe payment integration for subscription management
✓ Created enhanced calendar component with time slot selection
✓ Added subscription upgrade page with three-tier pricing
✓ Applied Passport2Fluency branding (blue/orange color scheme)
✓ Integrated company logos and professional styling
✓ Updated header navigation with subscription links
✓ Enhanced dashboard with improved calendar booking
✓ Added payment webhook handling for subscription activation

### Current Status
- Core platform functionality complete
- Stripe payments integrated and configured
- Enhanced calendar booking system operational
- Passport2Fluency branding applied throughout
- All major components tested and functional

## User Preferences
- Professional, clean design inspired by Preply.com
- Blue (#1E40AF) and orange color scheme for Passport2Fluency branding
- Subscription-based business model with class limits
- Focus on user experience and modern web standards
- PostgreSQL database for production scalability

## Technical Decisions
- Used in-memory storage for development/demo purposes
- Implemented Stripe for payment processing
- Applied responsive design patterns for mobile compatibility
- Integrated real-time booking system with availability checking
- Used TypeScript for type safety throughout the application

## Deployment Notes
- Environment variables required: STRIPE_SECRET_KEY, VITE_STRIPE_PUBLIC_KEY
- Database URL configured via DATABASE_URL environment variable
- Assets served from attached_assets directory
- Production deployment ready with Replit infrastructure