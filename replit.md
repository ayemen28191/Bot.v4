# Overview

This is a financial analytics trading application called "Binar Join Analytic" that provides trading signals, technical analysis, and market data for forex pairs, cryptocurrencies, and stocks. The application is designed to help users make informed trading decisions by analyzing market conditions and generating buy/sell signals based on various timeframes.

The system includes features for real-time market data, technical indicators (RSI, MACD, EMA), market sentiment analysis, and an admin dashboard for managing API keys, users, and system configurations. It supports deployment to production servers and includes Arabic language localization.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **UI Library**: Radix UI components with Tailwind CSS for styling and shadcn/ui component system
- **State Management**: TanStack Query for server state, Zustand for client state (chat functionality)
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with CSS custom properties for theming, supporting both light and dark modes
- **Build System**: Vite with plugins for theme management and development overlays

## Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with SQLite as the primary database
- **Authentication**: Passport.js with local strategy, session-based authentication using express-session
- **Session Storage**: SQLite-backed session store using connect-sqlite3
- **API Design**: RESTful API endpoints organized by feature modules

## Data Storage Solutions
- **Primary Database**: SQLite with Drizzle ORM for local development and production
- **Database Schema**: Users, config keys, deployment servers, and deployment logs tables
- **Configuration Management**: Dual storage system - environment variables (.env) with database fallback
- **Session Management**: SQLite-based session store for user authentication state
- **File Storage**: Local file system for database files and static assets

## Authentication and Authorization
- **Strategy**: Session-based authentication using Passport.js with local strategy
- **Password Security**: Scrypt-based password hashing with salt for secure storage
- **Authorization**: Role-based access control with admin and regular user roles
- **Session Management**: Server-side session storage with automatic cleanup
- **Security Features**: CSRF protection, secure session cookies, and admin-only endpoints

## Key Features
- **Trading Signal Generation**: Real-time market analysis with buy/sell/wait signals
- **Technical Analysis**: Multiple indicators including RSI, MACD, EMA, SMA, and Bollinger Bands
- **Market Data Integration**: Multiple API sources with fallback mechanisms
- **Multi-language Support**: Arabic language interface with RTL support
- **Admin Dashboard**: User management, API key configuration, and system monitoring
- **Deployment System**: Built-in deployment tools with SSH integration for server management

# External Dependencies

## Market Data APIs
- **Alpha Vantage**: Primary source for stock and forex market data
- **TwelveData**: Secondary market data provider for redundancy
- **Binance API**: Cryptocurrency market data and trading information
- **Multiple API Key Support**: Automatic failover system between different API providers

## Development and Build Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Backend bundling for production builds
- **Tailwind CSS**: Utility-first CSS framework for styling

## Production Infrastructure
- **PM2**: Process management for production deployment
- **Nginx**: Web server and reverse proxy (configured for production)
- **SSH Integration**: Automated deployment tools with SSH connectivity
- **SQLite**: Embedded database requiring no external database server

## Authentication and Security
- **Passport.js**: Authentication middleware with local strategy
- **Bcrypt/Scrypt**: Password hashing and security
- **Express Session**: Session management with SQLite storage

## UI and User Experience
- **Radix UI**: Accessible component primitives
- **Shadcn/ui**: Pre-built component library
- **React Helmet**: SEO and document head management
- **TanStack Query**: Server state management and caching