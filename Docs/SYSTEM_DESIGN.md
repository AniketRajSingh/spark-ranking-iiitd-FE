# System Design

## Architecture

IRINS + DBLP + CORE
        |
        v
Backend (Django + PostgreSQL)
        |
REST APIs
        |
Frontend (HTML/CSS/JS)

## Data Flow
1. Import CORE rankings
2. Import faculty/institutions from IRINS
3. Verify publications via DBLP
4. Calculate scores
5. Expose rankings through APIs

## Scaling
- PostgreSQL indexes
- Redis cache (future)
- Background jobs (future)
- Static frontend deployment
