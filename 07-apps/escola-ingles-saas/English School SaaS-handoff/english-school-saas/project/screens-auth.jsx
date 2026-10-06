/* ============================================================
   Auth screens — minimal, centered (internal-tool style)
   References: Notion / Linear / Slack / Supabase login
   ============================================================ */

const MOCK_LOGINS = [
  { email: "admin@school.com", perfil: "Administrador", desc: "Acesso total · financeiro consolidado" },
  { email: "secretaria@school.com", perfil: "Secretaria", desc: "Operação · alunos e pagamentos" },
  { email: "professor@school.com", perfil: "Professor", desc: "Apenas turmas e alunos" },
  { email: "novo@school.com", perfil: "Primeiro acesso", desc: "Definir senha definitiva" },
];

/* Centered shell shared by both auth screens */
function AuthShell({ children, footer }) {
  return (
    <div style={{ minHeight: "100%", height: "100%", background: "var(--bg)", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }}>
      <div className="fade-in" style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Logo / brand mark */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 26 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--blue)", display: "grid", placeItems: "center",
            boxShadow: "0 4px 12px rgba(37,99,235,.28)" }}>
            <Icon name="graduation" size={24} style={{ color: "#fff" }} />
          </div>
          <div style={{ textAlign: "center", lineHeight: 1.2 }}>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-.01em" }}>English School Manager</div>
            <div style={{ fontSize: 12.5, color: "var(--muted-2)", marginTop: 3, fontWeight: 500, letterSpacing: ".02em", textTransform: "uppercase" }}>Sistema interno</div>
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ width: "100%", padding: 30, boxShadow: "var(--sh)" }}>
          {children}
        </div>

        {footer}
      </div>
    </div>
  );
}

/* Closed-by-default accordion for demo accounts */
function DemoAccordion({ onPick }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ width: "100%", marginTop: 14 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 42, padding: "0 14px", borderRadius: 10, border: "1px solid var(--line-2)",
          background: open ? "var(--surface)" : "transparent", color: "var(--muted)", fontSize: 13, fontWeight: 500,
          boxShadow: open ? "var(--sh-sm)" : "none", transition: "background .12s, box-shadow .12s" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Icon name="users" size={15} />Acessos de Demonstração
        </span>
        <Icon name="chevD" size={16} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .18s" }} />
      </button>
      {open && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {MOCK_LOGINS.map(m => (
            <button key={m.email} type="button" onClick={() => onPick(m)}
              className="card" style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 11px", textAlign: "left", cursor: "pointer", transition: "border-color .12s, box-shadow .12s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue)"; e.currentTarget.style.boxShadow = "var(--sh)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.boxShadow = "var(--sh-sm)"; }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--blue-50)", color: "var(--blue)", display: "grid", placeItems: "center", flex: "none" }}>
                <Icon name={m.perfil === "Primeiro acesso" ? "lock" : "user"} size={15} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }} className="truncate">{m.email}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }} className="truncate">{m.perfil}</div>
              </div>
              <Icon name="chevR" size={15} style={{ color: "var(--muted-2)" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [esqueciOpen, setEsqueciOpen] = useState(false);
  const toast = useToast();

  function submit(e) {
    e && e.preventDefault();
    setErr("");
    const known = MOCK_LOGINS.find(m => m.email === email.trim().toLowerCase());
    if (!known) { setErr("Usuário não encontrado."); return; }
    if (!senha) { setErr("Informe a senha."); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(known.email); }, 460);
  }

  return (
    <AuthShell footer={<DemoAccordion onPick={m => { setEmail(m.email); setSenha("demo1234"); setErr(""); }} />}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: "-.01em", textAlign: "center" }}>Entrar</h1>
        <p style={{ margin: "5px 0 0", color: "var(--muted)", fontSize: 13.5, textAlign: "center" }}>Acesse o painel da escola.</p>
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field">
          <label>Email</label>
          <input className="input" type="email" placeholder="voce@school.com"
            value={email} onChange={e => setEmail(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label>Senha</label>
            <button type="button" className="btn btn-subtle btn-sm" style={{ height: 20, padding: 0, color: "var(--blue)", fontWeight: 500, fontSize: 12.5 }}
              onClick={() => setEsqueciOpen(true)}>Esqueci minha senha</button>
          </div>
          <div style={{ position: "relative" }}>
            <input className="input" style={{ paddingRight: 40 }} type={show ? "text" : "password"} placeholder="••••••••"
              value={senha} onChange={e => setSenha(e.target.value)} />
            <button type="button" onClick={() => setShow(s => !s)}
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", color: "var(--muted-2)", display: "grid", placeItems: "center", padding: 5 }}>
              <Icon name={show ? "eyeOff" : "eye"} size={17} />
            </button>
          </div>
        </div>

        {err && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--red-text)", background: "var(--red-bg)", border: "1px solid #FECACA", padding: "9px 12px", borderRadius: 9 }}>
            <Icon name="alert" size={16} />{err}
          </div>
        )}

        <button className="btn btn-primary" type="submit" disabled={loading} style={{ height: 42, marginTop: 2 }}>
          {loading ? <><Icon name="clock" size={16} className="spin" />Entrando…</> : "Entrar"}
        </button>
      </form>
      <EsqueciSenhaModal open={esqueciOpen} onClose={() => setEsqueciOpen(false)}
        onSent={em => { setEsqueciOpen(false); toast("Link de recuperação enviado para " + em + ". Verifique sua caixa de entrada."); }} />
    </AuthShell>
  );
}

function PrimeiroAcessoScreen({ onDone, onBack }) {
  const [temp, setTemp] = useState("");
  const [nova, setNova] = useState("");
  const [conf, setConf] = useState("");
  const [show, setShow] = useState(false);

  const rules = [
    { id: "len", label: "Mínimo de 8 caracteres", ok: nova.length >= 8 },
    { id: "upper", label: "1 letra maiúscula", ok: /[A-Z]/.test(nova) },
    { id: "lower", label: "1 letra minúscula", ok: /[a-z]/.test(nova) },
    { id: "num", label: "1 número", ok: /[0-9]/.test(nova) },
  ];
  const allOk = rules.every(r => r.ok);
  const match = nova.length > 0 && nova === conf;
  const canSubmit = allOk && match && temp.length > 0;

  return (
    <AuthShell>
      <button className="btn btn-subtle btn-sm" onClick={onBack} style={{ paddingLeft: 0, marginBottom: 8, height: 24 }}>
        <Icon name="chevL" size={15} />Voltar ao login
      </button>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: "-.01em" }}>Primeiro acesso</h1>
        <p style={{ margin: "5px 0 0", color: "var(--muted)", fontSize: 13.5 }}>
          Defina uma nova senha para ativar sua conta.
        </p>
      </div>

      <form onSubmit={e => { e.preventDefault(); if (canSubmit) onDone(); }} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <div className="field">
          <label>Senha temporária</label>
          <input className="input" type={show ? "text" : "password"} placeholder="Senha recebida por email"
            value={temp} onChange={e => setTemp(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label>Nova senha</label>
          <div style={{ position: "relative" }}>
            <input className="input" style={{ paddingRight: 40 }} type={show ? "text" : "password"} placeholder="Crie uma nova senha"
              value={nova} onChange={e => setNova(e.target.value)} />
            <button type="button" onClick={() => setShow(s => !s)}
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", color: "var(--muted-2)", display: "grid", placeItems: "center", padding: 5 }}>
              <Icon name={show ? "eyeOff" : "eye"} size={17} />
            </button>
          </div>
        </div>
        <div className="field">
          <label>Confirmar senha</label>
          <input className="input" type={show ? "text" : "password"} placeholder="Repita a nova senha"
            value={conf} onChange={e => setConf(e.target.value)} />
          {conf.length > 0 && !match && <span className="hint" style={{ color: "var(--red-text)" }}>As senhas não coincidem.</span>}
        </div>

        <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "13px 14px", background: "var(--surface-2)" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 9 }}>Sua senha deve conter:</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
            {rules.map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: r.ok ? "var(--green-text)" : "var(--muted)", transition: "color .15s" }}>
                <span style={{ width: 17, height: 17, borderRadius: 99, display: "grid", placeItems: "center", flex: "none",
                  background: r.ok ? "var(--green)" : "var(--line-2)", color: "#fff", transition: "background .15s" }}>
                  <Icon name="check" size={11} strokeWidth={3} />
                </span>
                {r.label}
              </div>
            ))}
          </div>
        </div>

        <button className="btn btn-primary" type="submit" disabled={!canSubmit} style={{ height: 42, marginTop: 2 }}>
          <Icon name="checkCircle" size={17} />Ativar conta
        </button>
      </form>
    </AuthShell>
  );
}

Object.assign(window, { LoginScreen, PrimeiroAcessoScreen, MOCK_LOGINS });

/* ============================================================
   M3 — Recuperação de senha
   ============================================================ */

/* Shared password rules checklist */
function SenhaChecklist({ senha }) {
  const rules = [
    { id: "len", label: "Mínimo 8 caracteres", ok: senha.length >= 8 },
    { id: "upper", label: "1 maiúscula", ok: /[A-Z]/.test(senha) },
    { id: "lower", label: "1 minúscula", ok: /[a-z]/.test(senha) },
    { id: "num", label: "1 número", ok: /[0-9]/.test(senha) },
  ];
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "13px 14px", background: "var(--surface-2)" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 9 }}>Sua senha deve conter:</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
        {rules.map(r => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: r.ok ? "var(--green-text)" : "var(--muted)", transition: "color .15s" }}>
            <span style={{ width: 17, height: 17, borderRadius: 99, display: "grid", placeItems: "center", flex: "none",
              background: r.ok ? "var(--green)" : "var(--line-2)", color: "#fff", transition: "background .15s" }}>
              <Icon name="check" size={11} strokeWidth={3} />
            </span>
            {r.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* Modal: solicitar link de recuperação */
function EsqueciSenhaModal({ open, onClose, onSent }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (open) setEmail(""); }, [open]);
  function enviar(e) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); onSent(email); }, 900);
  }
  return (
    <Modal open={open} onClose={onClose} width={420} title="Recuperar senha" sub="Enviaremos um link de redefinição para o seu email" icon="lock">
      <form onSubmit={enviar} style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="field">
          <label>Email cadastrado</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="voce@school.com" autoFocus />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4, borderTop: "1px solid var(--line)" }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={!email.trim() || loading}>
            {loading ? <><Icon name="clock" size={16} className="spin" />Enviando…</> : <><Icon name="arrowRight" size={16} />Enviar link</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* Tela: redefinir senha (token válido) */
function RedefinirSenhaScreen({ onDone, onBack }) {
  const [nova, setNova] = useState("");
  const [conf, setConf] = useState("");
  const [show, setShow] = useState(false);
  const rules = [
    nova.length >= 8, /[A-Z]/.test(nova), /[a-z]/.test(nova), /[0-9]/.test(nova)
  ];
  const allOk = rules.every(Boolean);
  const match = nova.length > 0 && nova === conf;
  return (
    <AuthShell>
      <button className="btn btn-subtle btn-sm" onClick={onBack} style={{ paddingLeft: 0, marginBottom: 8, height: 24 }}>
        <Icon name="chevL" size={15} />Voltar ao login
      </button>
      <h1 style={{ margin: "0 0 6px", fontSize: 19, fontWeight: 600, letterSpacing: "-.01em" }}>Redefinir senha</h1>
      <p style={{ margin: "0 0 20px", color: "var(--muted)", fontSize: 13.5 }}>Escolha uma nova senha para sua conta.</p>
      <form onSubmit={e => { e.preventDefault(); if (allOk && match) onDone(); }} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <div className="field">
          <label>Nova senha</label>
          <div style={{ position: "relative" }}>
            <input className="input" style={{ paddingRight: 40 }} type={show ? "text" : "password"} placeholder="Crie uma nova senha" value={nova} onChange={e => setNova(e.target.value)} autoFocus />
            <button type="button" onClick={() => setShow(s => !s)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", color: "var(--muted-2)", display: "grid", placeItems: "center", padding: 5 }}>
              <Icon name={show ? "eyeOff" : "eye"} size={17} />
            </button>
          </div>
        </div>
        <div className="field">
          <label>Confirmar senha</label>
          <input className="input" type={show ? "text" : "password"} placeholder="Repita a nova senha" value={conf} onChange={e => setConf(e.target.value)} />
          {conf.length > 0 && !match && <span className="hint" style={{ color: "var(--red-text)" }}>As senhas não coincidem.</span>}
        </div>
        <SenhaChecklist senha={nova} />
        <button className="btn btn-primary" type="submit" disabled={!allOk || !match} style={{ height: 42, marginTop: 2 }}>
          <Icon name="checkCircle" size={17} />Salvar nova senha
        </button>
      </form>
    </AuthShell>
  );
}

/* Tela: token expirado */
function TokenExpiradoScreen({ onSolicitarNovo }) {
  return (
    <AuthShell>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--red-bg)", color: "var(--red-text)", display: "grid", placeItems: "center" }}>
          <Icon name="alert" size={24} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Link expirado</h2>
          <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 14 }}>Este link expirou ou já foi utilizado. Solicite um novo link de recuperação.</p>
        </div>
        <button className="btn btn-primary" style={{ width: "100%", height: 42 }} onClick={onSolicitarNovo}>
          <Icon name="arrowRight" size={16} />Solicitar novo link
        </button>
      </div>
    </AuthShell>
  );
}

Object.assign(window, { SenhaChecklist, EsqueciSenhaModal, RedefinirSenhaScreen, TokenExpiradoScreen });
