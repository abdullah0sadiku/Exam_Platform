# GenExam — AI-Powered Exam Platform

An internal-first, AI-powered exam generation and delivery platform.

## Features

- **AI-powered generation** — Generate exams from topics or uploaded documents (PDF/DOCX/TXT)
- **Multi-provider AI** — OpenAI, Databricks, or any OpenAI-compatible endpoint
- **Full exam editor** — Edit questions, settings, and publish with one click
- **Public sharing** — Share exam links with candidates, no login required
- **Candidate experience** — Clean timed exam UI with progress tracking
- **Results & analytics** — Scores, pass rates, per-candidate breakdowns
- **Generation logs** — Debug and audit all AI calls

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- PostgreSQL + Prisma 7 + `@prisma/adapter-pg`
- NextAuth v5 (credentials provider)
- OpenAI SDK + Databricks adapter

## Setup

### 1. Prerequisites
- Node.js 18+
- PostgreSQL database

### 2. Install dependencies
```bash
cd genexam && npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/genexam"
NEXTAUTH_SECRET="generate with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
ENCRYPTION_KEY="exactly-32-chars-or-more-here!!"
```

### 4. Initialize database
Run the SQL migration against your PostgreSQL database:
```bash
psql -U postgres -d genexam -f prisma/migrations/0001_init/migration.sql
```

### 5. Start development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

## Usage

1. **Register** at `/register`
2. **Add an AI provider** at Dashboard → AI Providers → Add provider
   - For OpenAI: provider = `openai`, model = `gpt-4o-mini`, paste your API key
3. **Create an exam** at Dashboard → New exam
   - Choose "From topics" or "From document"
4. **Edit the exam** — review questions, adjust settings
5. **Publish** and **copy the share link**
6. **Share the link** with candidates — they don't need an account
7. **View results** in Dashboard → Exam → Results

## Project Structure

```
src/
├── app/
│   ├── (auth)/            # Login & register pages
│   ├── (dashboard)/       # Protected dashboard
│   │   └── dashboard/
│   │       ├── page.tsx         # Exam list
│   │       ├── create/          # Creation wizard
│   │       ├── exams/[id]/      # Exam editor + attempts
│   │       ├── config/          # AI provider config
│   │       └── logs/            # Generation logs
│   ├── exam/[token]/      # Public exam-taking page
│   └── api/               # API routes
├── components/
│   ├── ui/                # Base UI components
│   ├── dashboard/         # Sidebar, exam list
│   └── exam/              # Editor, taker, attempts view
└── lib/
    ├── ai/                # Provider abstraction + prompts
    ├── document/          # PDF/DOCX parser + chunker
    ├── auth.ts            # NextAuth config
    ├── prisma.ts          # DB client
    ├── scoring.ts         # Scoring engine
    └── utils.ts           # Helpers
```

## Adding a new AI provider

1. Create `src/lib/ai/providers/yourprovider.ts` implementing `IProviderAdapter`
2. Register it in `src/lib/ai/index.ts`
3. Add the provider type to `src/types/index.ts`
