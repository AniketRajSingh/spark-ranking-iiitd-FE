# Database Schema

## institutions
- id
- name
- state
- city
- website

## departments
- id
- institution_id
- name

## faculty
- id
- institution_id
- department_id
- name
- designation
- orcid

## conferences
- id
- acronym
- full_name
- core_rank
- area

## publications
- id
- title
- year
- doi
- dblp_key
- conference_id

## authorships
- faculty_id
- publication_id
- credit
