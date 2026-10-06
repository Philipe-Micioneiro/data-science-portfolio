import nodemailer from "nodemailer";

interface SendEmailParams {
  /** Template identifier (ex: 'senha-temporaria', 'boas-vindas') */
  template: string;
  /** Endereço de destino */
  to: string;
  /** Dados dinâmicos usados para popular o template */
  payload: Record<string, unknown>;
}

/**
 * Cria transporter Brevo SMTP.
 * Fallback para Gmail SMTP se variáveis Brevo não estiverem configuradas.
 */
function createTransporter() {
  const isBrevoConfigured =
    process.env.BREVO_SMTP_HOST &&
    process.env.BREVO_SMTP_USER &&
    process.env.BREVO_SMTP_PASS;

  if (isBrevoConfigured) {
    return nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST,
      port: Number(process.env.BREVO_SMTP_PORT ?? 587),
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
      },
    });
  }

  // Fallback Gmail SMTP
  return nodemailer.createTransport({
    host: process.env.FALLBACK_SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.FALLBACK_SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.FALLBACK_SMTP_USER,
      pass: process.env.FALLBACK_SMTP_PASS,
    },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Renderiza o conteúdo HTML do email com base no template e payload.
 * V1: templates inline simples. Evolução futura: integrar React Email ou Handlebars.
 */
function renderTemplate(
  template: string,
  payload: Record<string, unknown>
): { subject: string; html: string } {
  switch (template) {
    case "senha-temporaria": {
      const nome = escapeHtml(String(payload.nome ?? "Usuário"));
      const senha = escapeHtml(String(payload.senha ?? ""));
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      return {
        subject: "Seu acesso ao Smart Talk",
        html: `
          <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
            <div style="background:#2563EB;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
              <span style="color:#fff;font-size:18px;font-weight:700;">Smart Talk</span>
            </div>
            <h2 style="color:#0F172A;font-size:20px;margin-bottom:8px;">Olá, ${nome}!</h2>
            <p style="color:#334155;line-height:1.6;">Seu acesso foi criado. Use a senha temporária abaixo para entrar no sistema.</p>
            <div style="background:#EFF4FF;border:1px solid #DBE6FE;border-radius:10px;padding:20px;margin:24px 0;text-align:center;">
              <div style="color:#64748B;font-size:13px;margin-bottom:8px;">Senha temporária</div>
              <div style="color:#2563EB;font-size:22px;font-weight:700;letter-spacing:2px;font-family:monospace;">${senha}</div>
            </div>
            <p style="color:#334155;line-height:1.6;">Você precisará criar uma nova senha no seu primeiro acesso.</p>
            <a href="${appUrl}/login" style="display:inline-block;background:#2563EB;color:#fff;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none;margin-top:16px;">
              Acessar o sistema
            </a>
            <p style="color:#94A3B8;font-size:12px;margin-top:32px;">Se você não esperava este email, ignore-o com segurança.</p>
          </div>
        `,
      };
    }

    case "boas_vindas": {
      const nomeBv = escapeHtml(String(payload.nome ?? "Usuário"));
      const emailBv = escapeHtml(String(payload.email ?? ""));
      const senhaBv = escapeHtml(String(payload.senha ?? ""));
      const appUrlBv = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      return {
        subject: "Bem-vindo ao Smart Talk",
        html: `
          <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
            <div style="background:#2563EB;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
              <span style="color:#fff;font-size:18px;font-weight:700;">Smart Talk</span>
            </div>
            <h2 style="color:#0F172A;font-size:20px;margin-bottom:8px;">Bem-vindo, ${nomeBv}!</h2>
            <p style="color:#334155;line-height:1.6;">Seu acesso ao sistema foi criado. Use as credenciais abaixo para entrar pela primeira vez.</p>
            <div style="background:#EFF4FF;border:1px solid #DBE6FE;border-radius:10px;padding:20px;margin:24px 0;">
              <div style="margin-bottom:12px;">
                <div style="color:#64748B;font-size:13px;margin-bottom:4px;">Email de acesso</div>
                <div style="color:#0F172A;font-size:15px;font-weight:600;">${emailBv}</div>
              </div>
              <div>
                <div style="color:#64748B;font-size:13px;margin-bottom:4px;">Senha temporária</div>
                <div style="color:#2563EB;font-size:20px;font-weight:700;letter-spacing:2px;font-family:monospace;">${senhaBv}</div>
              </div>
            </div>
            <p style="color:#334155;line-height:1.6;">Você precisará criar uma nova senha no seu primeiro acesso.</p>
            <a href="${appUrlBv}/login" style="display:inline-block;background:#2563EB;color:#fff;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none;margin-top:16px;">
              Acessar o sistema
            </a>
            <p style="color:#94A3B8;font-size:12px;margin-top:32px;">Se você não esperava este email, ignore-o com segurança.</p>
          </div>
        `,
      };
    }

    case "recuperar-senha": {
      const nomeRecuperar = escapeHtml(String(payload.nome ?? "Usuário"));
      const linkRecuperar = escapeHtml(String(payload.link ?? "#"));
      return {
        subject: "Redefinição de senha — Smart Talk",
        html: `
          <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
            <div style="background:#2563EB;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
              <span style="color:#fff;font-size:18px;font-weight:700;">Smart Talk</span>
            </div>
            <h2 style="color:#0F172A;font-size:20px;margin-bottom:8px;">Redefinir senha</h2>
            <p style="color:#334155;line-height:1.6;">Olá, ${nomeRecuperar}! Recebemos uma solicitação para redefinir a senha da sua conta.</p>
            <a href="${linkRecuperar}" style="display:inline-block;background:#2563EB;color:#fff;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none;margin-top:16px;">
              Redefinir minha senha
            </a>
            <p style="color:#334155;line-height:1.6;margin-top:24px;">Este link expira em 1 hora. Se você não solicitou a redefinição, ignore este email.</p>
            <p style="color:#94A3B8;font-size:12px;margin-top:32px;">Smart Talk</p>
          </div>
        `,
      };
    }

    case "lembrete_vencimento": {
      const nomeLembrete = escapeHtml(String(payload.nome ?? "Aluno"));
      const competenciaLembrete = escapeHtml(String(payload.competencia ?? ""));
      const valorLembrete = !isNaN(Number(payload.valor))
        ? Number(payload.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : escapeHtml(String(payload.valor ?? ""));
      const vencimentoLembrete = escapeHtml(String(payload.vencimento ?? ""));
      const formaPagamentoLembrete = escapeHtml(String(payload.forma_pagamento ?? ""));
      return {
        subject: "Lembrete: pagamento vence hoje — Smart Talk",
        html: `
          <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
            <div style="background:#2563EB;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
              <span style="color:#fff;font-size:18px;font-weight:700;">Smart Talk</span>
            </div>
            <h2 style="color:#0F172A;font-size:20px;margin-bottom:8px;">Olá, ${nomeLembrete}!</h2>
            <p style="color:#334155;line-height:1.6;">Passamos para lembrar que o seu pagamento referente ao mês de <strong>${competenciaLembrete}</strong> vence hoje. Não deixe para depois!</p>
            <div style="background:#EFF4FF;border:1px solid #DBE6FE;border-radius:10px;padding:20px;margin:24px 0;">
              <div style="margin-bottom:12px;">
                <div style="color:#64748B;font-size:13px;margin-bottom:4px;">Competência</div>
                <div style="color:#0F172A;font-size:15px;font-weight:600;">${competenciaLembrete}</div>
              </div>
              <div style="margin-bottom:12px;">
                <div style="color:#64748B;font-size:13px;margin-bottom:4px;">Valor</div>
                <div style="color:#2563EB;font-size:18px;font-weight:700;">${valorLembrete}</div>
              </div>
              <div style="margin-bottom:12px;">
                <div style="color:#64748B;font-size:13px;margin-bottom:4px;">Vencimento</div>
                <div style="color:#0F172A;font-size:15px;font-weight:600;">${vencimentoLembrete}</div>
              </div>
              <div>
                <div style="color:#64748B;font-size:13px;margin-bottom:4px;">Forma de pagamento</div>
                <div style="color:#0F172A;font-size:15px;font-weight:600;">${formaPagamentoLembrete}</div>
              </div>
            </div>
            <p style="color:#334155;line-height:1.6;">Após efetuar o pagamento, envie o comprovante para a secretaria para regularizar sua situação. Qualquer dúvida, fale com a gente!</p>
            <p style="color:#94A3B8;font-size:12px;margin-top:32px;">Smart Talk — Este é um email automático.</p>
          </div>
        `,
      };
    }

    case "cobranca_pos_vencimento": {
      const nomeCobranca = escapeHtml(String(payload.nome ?? "Aluno"));
      const competenciaCobranca = escapeHtml(String(payload.competencia ?? ""));
      const valorCobranca = !isNaN(Number(payload.valor))
        ? Number(payload.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : escapeHtml(String(payload.valor ?? ""));
      const diasAtraso = escapeHtml(String(payload.dias_atraso ?? "0"));
      return {
        subject: "Pagamento em atraso — Smart Talk",
        html: `
          <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
            <div style="background:#2563EB;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
              <span style="color:#fff;font-size:18px;font-weight:700;">Smart Talk</span>
            </div>
            <h2 style="color:#0F172A;font-size:20px;margin-bottom:8px;">Olá, ${nomeCobranca}!</h2>
            <p style="color:#334155;line-height:1.6;">Identificamos que o seu pagamento referente ao mês de <strong>${competenciaCobranca}</strong> ainda não foi regularizado. Por favor, resolva isso o quanto antes para manter sua matrícula ativa.</p>
            <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:20px;margin:24px 0;">
              <div style="margin-bottom:12px;">
                <div style="color:#64748B;font-size:13px;margin-bottom:4px;">Competência</div>
                <div style="color:#0F172A;font-size:15px;font-weight:600;">${competenciaCobranca}</div>
              </div>
              <div style="margin-bottom:12px;">
                <div style="color:#64748B;font-size:13px;margin-bottom:4px;">Valor em aberto</div>
                <div style="color:#DC2626;font-size:18px;font-weight:700;">${valorCobranca}</div>
              </div>
              <div>
                <div style="color:#64748B;font-size:13px;margin-bottom:4px;">Dias em atraso</div>
                <div style="color:#DC2626;font-size:18px;font-weight:700;">${diasAtraso} dia(s)</div>
              </div>
            </div>
            <p style="color:#334155;line-height:1.6;">Solicitamos a regularização urgente deste pagamento para evitar a inativação da sua matrícula. Após o pagamento, envie o comprovante para a secretaria.</p>
            <p style="color:#94A3B8;font-size:12px;margin-top:32px;">Smart Talk — Este é um email automático.</p>
          </div>
        `,
      };
    }

    case "rejeicao_comprovante": {
      const nomeRejeicao = escapeHtml(String(payload.nome ?? "Aluno"));
      const motivoRejeicao = escapeHtml(String(payload.motivo ?? ""));
      return {
        subject: "Seu comprovante foi rejeitado — Smart Talk",
        html: `
          <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
            <div style="background:#2563EB;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
              <span style="color:#fff;font-size:18px;font-weight:700;">Smart Talk</span>
            </div>
            <h2 style="color:#0F172A;font-size:20px;margin-bottom:8px;">Olá, ${nomeRejeicao}!</h2>
            <p style="color:#334155;line-height:1.6;">Infelizmente seu comprovante de pagamento foi revisado e não pôde ser aprovado.</p>
            <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:20px;margin:24px 0;">
              <div style="color:#64748B;font-size:13px;margin-bottom:8px;font-weight:600;">Motivo da rejeição</div>
              <div style="color:#DC2626;font-size:14px;line-height:1.6;">${motivoRejeicao}</div>
            </div>
            <p style="color:#334155;line-height:1.6;">Por favor, entre em contato com a secretaria e envie um novo comprovante válido para regularizar sua situação.</p>
            <p style="color:#94A3B8;font-size:12px;margin-top:32px;">Smart Talk — Este é um email automático.</p>
          </div>
        `,
      };
    }

    case "resumo_cobranca_diario": {
      const alunos = Array.isArray(payload.alunos)
        ? (payload.alunos as Array<{
            nome: string;
            telefone: string;
            valor: number | null;
            data: string;
            dias: number;
          }>)
        : [];

      const linhas = alunos
        .map((a) => {
          const valorFmt = a.valor != null
            ? Number(a.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
            : "—";
          const diasLabel = a.dias === 0 ? "hoje" : a.dias === 1 ? "amanhã" : `em ${a.dias} dias`;
          return `
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:14px;font-weight:600;">${escapeHtml(a.nome)}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;color:#334155;font-size:13px;">${escapeHtml(a.telefone)}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;color:#334155;font-size:13px;">${escapeHtml(a.data)} (${diasLabel})</td>
              <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;color:#2563EB;font-size:14px;font-weight:700;text-align:right;">${valorFmt}</td>
            </tr>
          `;
        })
        .join("");

      return {
        subject: `Cobrança dos próximos 10 dias — ${alunos.length} aluno${alunos.length === 1 ? "" : "s"} — Smart Talk`,
        html: `
          <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;">
            <div style="background:#2563EB;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
              <span style="color:#fff;font-size:18px;font-weight:700;">Smart Talk</span>
            </div>
            <h2 style="color:#0F172A;font-size:20px;margin-bottom:8px;">Resumo diário de cobrança</h2>
            <p style="color:#334155;line-height:1.6;">Alunos com plano Recorrente que vencem nos próximos 10 dias — use o telefone abaixo para entrar em contato.</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;">
              <thead>
                <tr style="background:#EFF4FF;">
                  <th style="padding:10px 12px;text-align:left;color:#64748B;font-size:12px;text-transform:uppercase;">Aluno</th>
                  <th style="padding:10px 12px;text-align:left;color:#64748B;font-size:12px;text-transform:uppercase;">Telefone</th>
                  <th style="padding:10px 12px;text-align:left;color:#64748B;font-size:12px;text-transform:uppercase;">Vencimento</th>
                  <th style="padding:10px 12px;text-align:right;color:#64748B;font-size:12px;text-transform:uppercase;">Valor</th>
                </tr>
              </thead>
              <tbody>${linhas}</tbody>
            </table>
            <p style="color:#94A3B8;font-size:12px;margin-top:32px;">Smart Talk — Este é um email automático diário.</p>
          </div>
        `,
      };
    }

    default: {
      return {
        subject: `Notificação — Smart Talk`,
        html: `<div style="font-family:Inter,sans-serif;padding:24px;"><pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre></div>`,
      };
    }
  }
}

/**
 * Envia email via Brevo SMTP (com fallback Gmail SMTP).
 * Retorna true em sucesso, false em falha.
 * Falha de email NUNCA lança exceção — o fluxo principal nunca é interrompido.
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  try {
    const transporter = createTransporter();
    const { subject, html } = renderTemplate(params.template, params.payload);

    const fromName = process.env.BREVO_SMTP_FROM_NAME ?? "Smart Talk";
    const fromEmail =
      process.env.BREVO_SMTP_FROM ??
      process.env.FALLBACK_SMTP_FROM ??
      "no-reply@micioneiro.com.br";

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: params.to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error(`[email] Falha ao enviar template "${params.template}" para ${params.to}:`, err);
    return false;
  }
}
