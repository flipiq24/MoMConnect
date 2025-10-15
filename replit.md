# MoM Wholesale System

## Overview

The MoM Wholesale System is a professional real estate wholesale property analysis platform designed to help investors assess property risk, calculate automated EMD (Earnest Money Deposit) recommendations, and make data-driven acquisition decisions. The platform combines a sophisticated point-based scoring system with AI-powered analysis to evaluate wholesale real estate opportunities.

The system focuses on three core capabilities:
1. **Risk Assessment** - Multi-factor scoring system based on property characteristics (MLS status, price range, permits, ARV confidence, etc.)
2. **EMD Recommendations** - Automated deposit recommendations based on calculated risk scores
3. **AI Analysis** - GPT-5 powered property analysis providing actionable insights and recommendations

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework Stack:**
- **React 18** with TypeScript for type safety
- **Vite** as the build tool and development server
- **Wouter** for client-side routing (lightweight alternative to React Router)
- **TanStack Query v5** for server state management and caching

**UI Design System:**
- **shadcn/ui** component library following Material Design principles with dashboard customization
- **Tailwind CSS** for utility-first styling with custom design tokens
- **Radix UI** primitives for accessible, unstyled component foundations
- **Custom theme system** with full dark mode support using CSS variables

**Design Philosophy:**
The design prioritizes data clarity and professional trust-building. Color is used purposefully to communicate risk levels:
- Status-driven color coding (Success/Green, Warning/Yellow, Danger/Red, Info/Blue)
- Typography uses Inter for readability and JetBrains Mono for numerical/financial data
- Consistent elevation patterns (hover/active states) for interactive elements

### Backend Architecture

**Server Framework:**
- **Express.js** with TypeScript for the REST API
- **Session-based authentication** with in-memory storage (MemStorage implementation)
- **Modular route registration** pattern for scalability

**API Design:**
- RESTful endpoints following resource-based URL patterns
- Centralized error handling middleware
- Request/response logging for debugging and monitoring

**Data Flow:**
1. User submits property data through form
2. Backend calculates risk score using predefined scoring rules
3. EMD recommendation generated based on total score thresholds
4. Optional AI analysis triggered via OpenAI integration
5. Results returned to client and optionally saved to Google Sheets

### Database & Data Storage

**Current Implementation:**
- **In-memory storage** (MemStorage class) for development/demo purposes
- **Schema-first approach** using Drizzle ORM for type safety

**Drizzle ORM Configuration:**
- PostgreSQL dialect configured (prepared for production database)
- Schema definitions in `shared/schema.ts` with Zod validation
- Migration support via `drizzle-kit`

**Data Models:**
- **Users Table**: Basic authentication (name, email)
- **Properties Table**: Comprehensive property data including:
  - Risk assessment fields (12+ factors)
  - Financial data (purchase price, rehab, ARV)
  - Calculated fields (total score, EMD recommendation, success chance)
  - External data (Zillow data, AI analysis stored as JSONB)

**Production-Ready Pattern:**
The system uses Drizzle with PostgreSQL configuration, allowing easy migration from MemStorage to a real database by:
1. Provisioning a PostgreSQL database
2. Setting DATABASE_URL environment variable
3. Running migrations with `npm run db:push`

### Scoring System Architecture

**Point-Based Risk Assessment:**
- 12 distinct risk factors with weighted scoring (-3 to +1 points)
- Centralized scoring rules in `shared/scoring.ts` for consistency
- Real-time score calculation as user fills form

**EMD Recommendation Algorithm:**
```
Score >= 0: $1,000 (High confidence - 80% success chance)
Score -1 to -2: $500 (Moderate confidence - 60% success chance)  
Score <= -3: $100 (Low confidence - 40% success chance)
```

**Key Risk Factors:**
- MLS listing duration and status
- Purchase price range (penalty for >$1M properties)
- Permit dependencies (heavy penalty for ADU/permit-dependent value)
- Wholesale vs asking price differential
- ARV confidence based on comparable sales
- Property characteristics (zoning, rehab level, occupancy, area desirability)

## External Dependencies

### Third-Party Services

**AI Integration (OpenAI):**
- **Provider**: Replit AI Integrations service (OpenAI-compatible API)
- **Model**: GPT-5 (latest model as of August 2025)
- **Purpose**: Property analysis generation with structured JSON output
- **Implementation**: `server/lib/openai.ts` with response format validation

**Google Sheets Integration:**
- **Provider**: Google Sheets API via Replit Connectors
- **Authentication**: OAuth 2.0 with automatic token refresh
- **Purpose**: Property data export and record-keeping
- **Implementation**: `server/lib/googleSheets.ts` with connection pooling

**Database (Production):**
- **Provider**: Neon (PostgreSQL serverless)
- **Package**: `@neondatabase/serverless` for edge-compatible connections
- **Configuration**: Environment-based via DATABASE_URL

### Development Tools

**Build & Development:**
- Vite plugins for development experience (error overlay, hot reload)
- Replit-specific plugins (cartographer, dev banner) for cloud IDE integration
- ESBuild for production server bundling

**Type Safety & Validation:**
- Zod for runtime schema validation
- drizzle-zod for automatic schema-to-validator generation
- TypeScript strict mode enabled across the project

**UI Component Dependencies:**
- Extensive Radix UI component collection (20+ primitives)
- date-fns for date manipulation
- class-variance-authority (CVA) for component variant management
- embla-carousel for carousel/slider functionality

### Environment Variables

**Required for Production:**
- `DATABASE_URL` - PostgreSQL connection string
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI-compatible API endpoint
- `AI_INTEGRATIONS_OPENAI_API_KEY` - API authentication key
- `REPLIT_CONNECTORS_HOSTNAME` - Google Sheets connector endpoint
- `REPL_IDENTITY` or `WEB_REPL_RENEWAL` - Replit authentication tokens

### Session Management

**Current Implementation:**
- `express-session` with `connect-pg-simple` for PostgreSQL session storage
- Session data stored alongside application data for consistency
- Automatic session cleanup and expiration handling