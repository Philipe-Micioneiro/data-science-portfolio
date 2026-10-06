-- ============================================================
-- Dashboard RPC Functions — Sprint 2A
-- Usadas pelo AdminDashboard para séries históricas e financeiro.
-- ============================================================

-- ----------------------------------------------------------
-- 1. dashboard_serie_alunos
--    Retorna contagem de alunos criados por mês nos últimos 12 meses.
--    Resultado: [{ mes: "2026-05", total: 42 }, ...]  (ordem ASC por mes)
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_serie_alunos()
RETURNS TABLE(mes text, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    TO_CHAR(DATE_TRUNC('month', criado_em AT TIME ZONE 'UTC'), 'YYYY-MM') AS mes,
    COUNT(*)::bigint AS total
  FROM students
  WHERE criado_em >= DATE_TRUNC('month', NOW() AT TIME ZONE 'UTC') - INTERVAL '11 months'
  GROUP BY DATE_TRUNC('month', criado_em AT TIME ZONE 'UTC')
  ORDER BY DATE_TRUNC('month', criado_em AT TIME ZONE 'UTC') ASC;
$$;

-- RLS: qualquer usuário autenticado pode chamar (Admin apenas é quem chama na UI)
REVOKE ALL ON FUNCTION public.dashboard_serie_alunos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_serie_alunos() TO authenticated;

-- ----------------------------------------------------------
-- 2. dashboard_serie_financeiro
--    Retorna soma de valor_previsto e valor_pago por mês (últimos 12 meses).
--    Resultado: [{ mes: "2026-05", prevista: 5000, recebida: 3200 }, ...]
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_serie_financeiro()
RETURNS TABLE(mes text, prevista numeric, recebida numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    TO_CHAR(competencia_date, 'YYYY-MM') AS mes,
    COALESCE(SUM(valor_previsto), 0)::numeric                                      AS prevista,
    COALESCE(SUM(CASE WHEN status = 'Pago' THEN valor_pago ELSE 0 END), 0)::numeric AS recebida
  FROM payments
  WHERE competencia_date >= DATE_TRUNC('month', NOW() AT TIME ZONE 'UTC') - INTERVAL '11 months'
  GROUP BY competencia_date
  ORDER BY competencia_date ASC;
$$;

-- Apenas Admin deve chamar esta função — Secretário e Professor são barrados na UI
REVOKE ALL ON FUNCTION public.dashboard_serie_financeiro() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_serie_financeiro() TO authenticated;

-- ----------------------------------------------------------
-- 3. dashboard_finance_mes
--    Retorna totais financeiros da competência atual.
--    Resultado: { receita_prevista, receita_recebida, inadimplencia }
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_finance_mes()
RETURNS TABLE(
  receita_prevista  numeric,
  receita_recebida  numeric,
  inadimplencia     numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(valor_previsto), 0)::numeric                                              AS receita_prevista,
    COALESCE(SUM(CASE WHEN status = 'Pago' THEN valor_pago ELSE 0 END), 0)::numeric       AS receita_recebida,
    COALESCE(SUM(CASE WHEN status = 'Atrasado' THEN valor_previsto ELSE 0 END), 0)::numeric AS inadimplencia
  FROM payments
  WHERE competencia_date = DATE_TRUNC('month', NOW() AT TIME ZONE 'UTC');
$$;

REVOKE ALL ON FUNCTION public.dashboard_finance_mes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_finance_mes() TO authenticated;
