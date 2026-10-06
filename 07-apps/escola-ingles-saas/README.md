# Sistema de gestão escolar / School management system

**PT:** Plataforma web para centralizar a operação administrativa e financeira de uma escola de inglês, substituindo planilhas compartilhadas: cadastro e acompanhamento de alunos, professores, agenda de aulas, financeiro de alunos e de professores, relatórios, auditoria e perfis de acesso (administrador, secretaria, professor). Há especificação por módulo em [`SPEC/`](SPEC) e o requisitos em [`PRD.md`](PRD.md).

**EN:** Web platform that centralizes the administrative and financial operations of an English school, replacing shared spreadsheets: student and teacher management, class scheduling, student and teacher finance, reports, audit trail and role-based access (admin, secretary, teacher). Module-level specs are in [`SPEC/`](SPEC) and requirements in [`PRD.md`](PRD.md).

## Stack

Next.js (App Router, TypeScript) · Tailwind CSS · Supabase (Postgres, Auth, Storage) · Brevo SMTP · Vercel (deploy e cron)

## Estrutura / Structure

- `english-school-manager/` — aplicação Next.js / Next.js app
- `supabase/migrations/` — esquema do banco / database schema
- `SPEC/` — especificação por módulo / per-module spec
- `English School SaaS-handoff/` — protótipo de design (dados fictícios) / design prototype (synthetic data)

## Configuração / Setup

Copie `english-school-manager/.env.example` para `.env.local` e preencha com as suas credenciais. Nenhum segredo ou dado real de alunos faz parte deste repositório.

Copy `english-school-manager/.env.example` to `.env.local` and fill in your own credentials. No secrets or real student data are included in this repository.