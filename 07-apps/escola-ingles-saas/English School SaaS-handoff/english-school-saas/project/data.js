/* ============================================================
   English School Manager — Mock Data Layer (deterministic)
   Plain JS. Attaches window.ESM with all seed data + helpers.
   ============================================================ */
(function () {
  "use strict";

  // ---- Seeded PRNG (mulberry32) for stable data across reloads ----
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rnd = mulberry32(20260601);
  function ri(min, max) { return Math.floor(rnd() * (max - min + 1)) + min; }
  function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function chance(p) { return rnd() < p; }

  // ---- Reference dates: "today" is 2026-06-01 ----
  var TODAY = new Date(2026, 5, 1);
  function fmtDate(d) {
    var dd = String(d.getDate()).padStart(2, "0");
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    return dd + "/" + mm + "/" + d.getFullYear();
  }
  function fmtDateTime(d) {
    var hh = String(d.getHours()).padStart(2, "0");
    var mi = String(d.getMinutes()).padStart(2, "0");
    return fmtDate(d) + " " + hh + ":" + mi;
  }
  function brl(n) {
    return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  var MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  var MESES_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  function competencia(d) { return MESES[d.getMonth()] + "/" + String(d.getFullYear()).slice(2); }

  // ---- Name pools (PT-BR) ----
  var FIRST = ["Ana","Bruno","Carla","Daniel","Eduarda","Felipe","Gabriela","Henrique","Isabela","João",
    "Karina","Lucas","Mariana","Nicolas","Olívia","Pedro","Quésia","Rafael","Sofia","Thiago",
    "Ursula","Vitor","Wesley","Yara","Zeca","Amanda","Beatriz","Caio","Débora","Enzo",
    "Fernanda","Gustavo","Helena","Igor","Júlia","Kauan","Larissa","Murilo","Natália","Otávio",
    "Patrícia","Renato","Sabrina","Tomás","Valentina","William","Letícia","Matheus","Camila","Diego"];
  var LAST = ["Silva","Santos","Oliveira","Souza","Costa","Pereira","Almeida","Ferreira","Rodrigues","Gomes",
    "Martins","Araújo","Melo","Barbosa","Ribeiro","Carvalho","Lima","Cardoso","Teixeira","Nascimento",
    "Moreira","Cavalcanti","Dias","Castro","Campos","Freitas","Pinto","Moraes","Azevedo","Correia"];

  function fullName() { return pick(FIRST) + " " + pick(LAST) + " " + pick(LAST); }
  function slugEmail(name, dom) {
    var parts = name.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .split(" ");
    return parts[0] + "." + parts[1] + "@" + (dom || "email.com");
  }
  function phone() {
    return "(" + ri(11, 85) + ") 9" + ri(1000, 9999) + "-" + ri(1000, 9999);
  }
  function ip() { return ri(10, 200) + "." + ri(0, 255) + "." + ri(0, 255) + "." + ri(1, 254); }

  // ---- Users ----
  var users = [
    { id: "u-admin", nome: "Marina Albuquerque", email: "admin@school.com", perfil: "Administrador", iniciais: "MA" },
    { id: "u-sec-1", nome: "Cláudia Ramos", email: "secretaria@school.com", perfil: "Secretário", iniciais: "CR" },
    { id: "u-sec-2", nome: "Patrícia Nunes", email: "patricia@school.com", perfil: "Secretário", iniciais: "PN" }
  ];

  // ---- Professors (8) ----
  var PROF_NAMES = ["Roberto Lemos"," Juliana Castro","Marcelo Tavares","Beatriz Andrade",
    "Fernando Rocha","Cristina Bastos","André Siqueira","Larissa Pontes"];
  var FORMAS_PROF = ["PIX", "Transferência", "Boleto"];
  var professores = PROF_NAMES.map(function (n, i) {
    var nome = n.trim();
    var cadMonthsAgo = ri(3, 40);
    return {
      id: "p-" + (i + 1),
      nome: nome,
      email: slugEmail(nome, "school.com"),
      perfil: "Professor",
      iniciais: nome.split(" ").map(function (x) { return x[0]; }).join("").slice(0, 2).toUpperCase(),
      telefone: phone(),
      dataCadastro: new Date(TODAY.getFullYear(), TODAY.getMonth() - cadMonthsAgo, ri(1, 28)),
      valorHora: pick([55, 60, 65, 70, 75, 80, 90]),
      formaPagamento: pick(FORMAS_PROF),
      obsFinanceiras: chance(0.4) ? pick([
        "Recebe via PJ — emite nota fiscal.",
        "Pagamento todo dia 5.",
        "Bônus por turma cheia.",
        "Reajuste previsto para jan/27."
      ]) : "",
      status: (i === 6) ? "Inativo" : "Ativo" // André Siqueira inativo p/ demonstrar
    };
  });
  // the logged-in professor uses professor@school.com
  professores[0].email = "professor@school.com";

  // ---- Plans / levels ----
  var PLANOS = [
    { nome: "Kids", valor: 290 },
    { nome: "Básico", valor: 320 },
    { nome: "Intermediário", valor: 390 },
    { nome: "Conversação", valor: 360 },
    { nome: "Avançado", valor: 460 },
    { nome: "Business", valor: 620 }
  ];
  var NIVEIS = ["A1", "A2", "B1", "B2", "C1", "C2"];
  var CARGAS = ["1x semana (1h)", "2x semana (1h)", "1x semana (1h30)", "2x semana (1h30)", "3x semana (1h)"];
  var FORMAS = ["Cartão", "PIX", "Boleto"];

  // ---- Students (80) ----
  // Status distribution: Ativo ~58%, Atrasado ~18%, Pendente ~12%, Inativo ~12%
  var STATUSES = ["Ativo", "Atrasado", "Pendente de Validação", "Inativo"];
  function rollStatus() {
    var r = rnd();
    if (r < 0.58) return "Ativo";
    if (r < 0.76) return "Atrasado";
    if (r < 0.88) return "Pendente de Validação";
    return "Inativo";
  }

  var alunos = [];
  for (var i = 0; i < 80; i++) {
    var nome = fullName();
    var plano = pick(PLANOS);
    var valor = plano.valor + (chance(0.3) ? ri(-2, 4) * 10 : 0);
    var status = rollStatus();
    var diaVenc = pick([5, 8, 10, 12, 15, 20, 25]);
    var nProf = chance(0.22) ? 2 : 1; // alguns alunos têm 2 professores
    var profs = [];
    var pidx = ri(0, professores.length - 1);
    profs.push(professores[pidx].id);
    if (nProf === 2) {
      var p2 = (pidx + ri(1, professores.length - 1)) % professores.length;
      profs.push(professores[p2].id);
    }
    // entry date within last ~18 months
    var entryMonthsAgo = ri(0, 17);
    var entry = new Date(TODAY.getFullYear(), TODAY.getMonth() - entryMonthsAgo, ri(1, 28));
    alunos.push({
      id: "a-" + (i + 1),
      nome: nome,
      email: slugEmail(nome),
      telefone: phone(),
      plano: plano.nome,
      nivel: pick(NIVEIS),
      valor: valor,
      diaVencimento: diaVenc,
      dataEntrada: entry,
      professores: profs,
      cargaHoraria: pick(CARGAS),
      observacoes: chance(0.25) ? pick([
        "Prefere aulas pela manhã.",
        "Foco em entrevistas de emprego.",
        "Viagem marcada para julho.",
        "Solicitou material extra de gramática.",
        "Aluno corporativo — nota fiscal pela empresa."
      ]) : "",
      status: status
    });
  }

  // ---- Financial records (mensalidades) ----
  // Generate the current competência record for each active-ish student,
  // plus history for the last few months.
  var formaById = {};
  alunos.forEach(function (a) { formaById[a.id] = pick(FORMAS); });

  var pagamentos = [];
  var pagId = 1;
  function statusForComp(aluno, monthOffset) {
    // monthOffset 0 = current month
    if (monthOffset > 0) {
      // history: almost all paid
      return chance(0.94) ? "Pago" : "Atrasado";
    }
    // current month derives from student status
    if (aluno.status === "Ativo") return "Pago";
    if (aluno.status === "Atrasado") return "Atrasado";
    if (aluno.status === "Pendente de Validação") return "Pendente de Validação";
    return "Inativo";
  }

  for (var m = 0; m <= 3; m++) {
    var compDate = new Date(TODAY.getFullYear(), TODAY.getMonth() - m, 1);
    alunos.forEach(function (a) {
      // inactive students stop generating after they went inactive
      if (a.status === "Inativo" && m === 0) {
        // skip current month for inactive (no charge)
        if (m === 0) return;
      }
      var forma = formaById[a.id];
      var st = statusForComp(a, m);
      var venc = new Date(compDate.getFullYear(), compDate.getMonth(), a.diaVencimento);
      var hasComp = forma !== "Cartão"; // PIX/Boleto têm comprovante
      pagamentos.push({
        id: "f-" + (pagId++),
        alunoId: a.id,
        aluno: a.nome,
        competencia: competencia(compDate),
        competenciaDate: compDate,
        valor: a.valor,
        forma: forma,
        vencimento: venc,
        status: st,
        comprovante: (st === "Pago" || st === "Pendente de Validação") && hasComp,
        comprovanteNome: hasComp ? (forma === "PIX" ? "comprovante-pix.png" : "boleto-pago.pdf") : null
      });
    });
  }
  // newest first
  pagamentos.sort(function (a, b) { return b.competenciaDate - a.competenciaDate; });

  // Pending validations = current-month records with "Pendente de Validação"
  var pendentes = pagamentos.filter(function (p) {
    return p.status === "Pendente de Validação";
  });

  // ---- Audit log ----
  var ACOES = [
    { acao: "Login realizado", entidade: "Sessão" },
    { acao: "Pagamento registrado", entidade: "Financeiro" },
    { acao: "Comprovante aprovado", entidade: "Financeiro" },
    { acao: "Comprovante rejeitado", entidade: "Financeiro" },
    { acao: "Aluno criado", entidade: "Aluno" },
    { acao: "Aluno editado", entidade: "Aluno" },
    { acao: "Relatório exportado", entidade: "Relatório" },
    { acao: "Professor criado", entidade: "Professor" },
    { acao: "Senha alterada", entidade: "Usuário" },
    { acao: "Filtro aplicado", entidade: "Financeiro" }
  ];
  var auditUsers = users.concat([professores[0]]);
  var auditoria = [];
  for (var k = 0; k < 64; k++) {
    var u = pick(auditUsers);
    var a = pick(ACOES);
    var minsAgo = ri(0, 60 * 24 * 20); // last 20 days
    var when = new Date(TODAY.getTime() - minsAgo * 60000);
    var alvo = "";
    if (a.entidade === "Aluno" || a.acao.indexOf("Pagamento") >= 0 || a.acao.indexOf("Comprovante") >= 0) {
      alvo = pick(alunos).nome;
    } else if (a.entidade === "Professor") {
      alvo = pick(professores).nome;
    }
    auditoria.push({
      id: "log-" + (k + 1),
      usuario: u.nome,
      perfil: u.perfil,
      acao: a.acao,
      entidade: a.entidade,
      alvo: alvo,
      data: when,
      ip: ip()
    });
  }
  auditoria.sort(function (a, b) { return b.data - a.data; });

  // ---- 12-month historical series ----
  var serieAlunos = [];
  var serieFinanceiro = [];
  var serieInadimplencia = [];
  var baseAlunos = 48;
  for (var s = 11; s >= 0; s--) {
    var d = new Date(TODAY.getFullYear(), TODAY.getMonth() - s, 1);
    var label = MESES[d.getMonth()] + "/" + String(d.getFullYear()).slice(2);
    baseAlunos += ri(1, 5);
    var totalAlunosMes = (s === 0) ? 80 : Math.min(baseAlunos, 80);
    var receita = totalAlunosMes * ri(360, 420);
    var inad = Math.round(receita * (0.06 + rnd() * 0.10));
    serieAlunos.push({ mes: label, valor: totalAlunosMes });
    serieFinanceiro.push({ mes: label, prevista: receita, recebida: Math.round(receita * (0.82 + rnd() * 0.14)) });
    serieInadimplencia.push({ mes: label, valor: inad });
  }

  // ---- Derived KPIs ----
  function countStatus(st) { return alunos.filter(function (a) { return a.status === st; }).length; }
  var kpis = {
    totalAlunos: alunos.length,
    ativos: countStatus("Ativo"),
    atrasados: countStatus("Atrasado"),
    pendentes: countStatus("Pendente de Validação"),
    inativos: countStatus("Inativo")
  };
  // financials based on current-month
  var atuais = pagamentos.filter(function (p) {
    return p.competenciaDate.getMonth() === TODAY.getMonth() &&
           p.competenciaDate.getFullYear() === TODAY.getFullYear();
  });
  var receitaPrevista = atuais.reduce(function (s, p) { return s + p.valor; }, 0);
  var receitaRecebida = atuais.filter(function (p) { return p.status === "Pago"; })
    .reduce(function (s, p) { return s + p.valor; }, 0);
  var inadimplencia = atuais.filter(function (p) { return p.status === "Atrasado"; })
    .reduce(function (s, p) { return s + p.valor; }, 0);
  var finance = {
    receitaPrevista: receitaPrevista,
    receitaRecebida: receitaRecebida,
    inadimplencia: inadimplencia,
    taxaInad: inadimplencia / (receitaPrevista || 1)
  };

  // ---- Próximos vencimentos (next 10 days) ----
  var proximosVencimentos = atuais
    .filter(function (p) { return p.status !== "Pago" && p.status !== "Inativo"; })
    .map(function (p) { return p; })
    .sort(function (a, b) { return a.vencimento - b.vencimento; })
    .slice(0, 6);

  // ============================================================
  //  AGENDA — recurring weekly lessons per (aluno, professor)
  // ============================================================
  var WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  var WEEKDAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  var AULA_OBS = ["Revisão de gramática", "Conversação livre", "Preparatório IELTS",
    "Business English", "Listening & speaking", "Foco em pronúncia", "Aula de reforço", ""];

  // Assign a weekly slot to each active aluno↔professor pairing
  var slots = []; // {alunoId, profId, weekday, hour, min, dur}
  alunos.forEach(function (a) {
    if (a.status === "Inativo") return;
    a.professores.forEach(function (pid, idx) {
      var prof = professores.find(function (x) { return x.id === pid; });
      if (!prof || prof.status === "Inativo") return;
      var freq = a.cargaHoraria.indexOf("2x") >= 0 ? 2 : a.cargaHoraria.indexOf("3x") >= 0 ? 3 : 1;
      var dur = a.cargaHoraria.indexOf("1h30") >= 0 ? 90 : 60;
      for (var f = 0; f < freq; f++) {
        var weekday = ri(1, 6); // Seg..Sáb
        var hour = pick([8, 9, 10, 11, 14, 15, 16, 17, 18, 19]);
        slots.push({ alunoId: a.id, aluno: a.nome, profId: pid, weekday: weekday, hour: hour, min: pick([0, 0, 30]), dur: dur });
      }
    });
  });

  // Materialize events across a window: 2 weeks before → 4 weeks after TODAY
  function startOfWeek(d) { var x = new Date(d); var day = x.getDay(); x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x; }
  var winStart = startOfWeek(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - 14));
  var agenda = [];
  var evId = 1;
  for (var wk = 0; wk < 7; wk++) {
    slots.forEach(function (sl) {
      var d = new Date(winStart);
      d.setDate(d.getDate() + wk * 7 + sl.weekday);
      d.setHours(sl.hour, sl.min, 0, 0);
      var isPast = d < TODAY;
      var st;
      if (isPast) { st = chance(0.10) ? "Cancelada" : "Realizada"; }
      else { st = chance(0.05) ? "Cancelada" : "Agendada"; }
      agenda.push({
        id: "ev-" + (evId++),
        alunoId: sl.alunoId, aluno: sl.aluno,
        profId: sl.profId,
        start: d, dur: sl.dur,
        observacoes: pick(AULA_OBS),
        status: st
      });
    });
  }
  agenda.sort(function (a, b) { return a.start - b.start; });

  // Per-professor monthly lesson counts (current month)
  function isThisMonth(d) { return d.getMonth() === TODAY.getMonth() && d.getFullYear() === TODAY.getFullYear(); }
  professores.forEach(function (p) {
    var evs = agenda.filter(function (e) { return e.profId === p.id && isThisMonth(e.start) && e.status !== "Cancelada"; });
    var realizadas = agenda.filter(function (e) { return e.profId === p.id && isThisMonth(e.start) && e.status === "Realizada"; });
    p.aulasNoMes = evs.length;
    p.aulasRealizadas = realizadas.length;
    p.numAlunos = alunos.filter(function (a) { return a.professores.indexOf(p.id) >= 0; }).length;
  });

  // ============================================================
  //  FINANCEIRO PROFESSORES — pagamento por aula realizada
  // ============================================================
  // Devido = horas realizadas no mês × valor hora.  (dur 90min = 1.5h)
  var pagamentosProf = professores.filter(function (p) { return p.status === "Ativo"; }).map(function (p) {
    var evs = agenda.filter(function (e) { return e.profId === p.id && isThisMonth(e.start) && e.status === "Realizada"; });
    var horas = evs.reduce(function (s, e) { return s + e.dur / 60; }, 0);
    var devido = Math.round(horas * p.valorHora);
    // status distribution
    var r = rnd();
    var pago, status;
    if (r < 0.45) { pago = devido; status = "Pago"; }
    else if (r < 0.78) { pago = 0; status = "Pendente"; }
    else { pago = Math.round(devido * (0.3 + rnd() * 0.4)); status = "Parcial"; }
    return {
      profId: p.id, professor: p.nome, valorHora: p.valorHora,
      aulas: evs.length, horas: horas, devido: devido, pago: pago, status: status,
      forma: p.formaPagamento
    };
  });
  var finProf = {
    totalAPagar: pagamentosProf.reduce(function (s, x) { return s + x.devido; }, 0),
    totalPago: pagamentosProf.reduce(function (s, x) { return s + x.pago; }, 0),
  };
  finProf.totalPendente = finProf.totalAPagar - finProf.totalPago;

  // ---- Helpers exposed ----
  function profName(id) {
    var p = professores.find(function (x) { return x.id === id; });
    return p ? p.nome : "—";
  }
  function alunoById(id) { return alunos.find(function (x) { return x.id === id; }); }
  function profById(id) { return professores.find(function (x) { return x.id === id; }); }
  function hhmm(d) { return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }

  window.ESM = {
    TODAY: TODAY,
    users: users,
    professores: professores,
    alunos: alunos,
    pagamentos: pagamentos,
    pendentes: pendentes,
    auditoria: auditoria,
    agenda: agenda,
    pagamentosProf: pagamentosProf,
    finProf: finProf,
    serieAlunos: serieAlunos,
    serieFinanceiro: serieFinanceiro,
    serieInadimplencia: serieInadimplencia,
    kpis: kpis,
    finance: finance,
    proximosVencimentos: proximosVencimentos,
    PLANOS: PLANOS, NIVEIS: NIVEIS, CARGAS: CARGAS, FORMAS: FORMAS, STATUSES: STATUSES,
    FORMAS_PROF: FORMAS_PROF,
    MESES_FULL: MESES_FULL, MESES: MESES, WEEKDAYS: WEEKDAYS, WEEKDAYS_FULL: WEEKDAYS_FULL,
    // helpers
    fmtDate: fmtDate, fmtDateTime: fmtDateTime, brl: brl, profName: profName,
    alunoById: alunoById, profById: profById, hhmm: hhmm
  };
})();
