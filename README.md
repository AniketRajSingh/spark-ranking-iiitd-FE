# SPARK — Scholarly Publication & Academic Ranking Knowledgebase

## Vision
A transparent, reproducible ranking system for Indian institutions based on CORE A and A* conference publications using IRINS, DBLP, and CORE.

## Goal
Rank Indian institutions by verified top-tier CS research output.

## Architecture
### Data Sources
- IRINS: Faculty and institution mapping
- DBLP: Publication verification
- CORE: Conference rankings

### Backend
- Django
- PostgreSQL
- REST APIs

### Frontend
- HTML
- CSS (Tailwind CSS)
- JavaScript (ES6 Modules)
- Static deployment compatible

### Ranking Formula
- CORE A* = 4 points
- CORE A = 2 points
- Fractional author credit

## Features
- National rankings
- Institution profiles (with trends and category score charts)
- Faculty profiles
- Conference directories
- Comparison scorecard with radar charts
- Area-wise rankings

## Principles
- Transparency
- Reproducibility
- Verifiability
- Simplicity
