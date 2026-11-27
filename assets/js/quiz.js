/* Version B: the quiz. One question per screen, a tap moves on by itself. The progress bar
   has one segment per step; tapping a step already reached goes back to it. The last step is the contact step, which fills the same
   lead record as the full form. Built with DOM methods and textContent only. */
(function () {
  "use strict";
  var root = document.getElementById("quiz");
  if (!root || !window.KPLead) return;
  var L = window.KPLead;
  var PAGE = root.dataset.page; // "home-loans" | "smsf"
  var THANKS = root.dataset.thanks;

  var STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];
  var stateStep = { key: "state", q: "Which state is the property in?", o: STATES, grid: true };
  var membersStep = {
    key: "members_working",
    q: "Are the fund’s members still working and paying into super?",
    o: ["Yes, employed (PAYG)", "Yes, self-employed", "Yes, a mix of both", "Mostly retired", "Not sure"]
  };

  var HOME_Q1 = ["Buy my first home", "Buy my next home", "Buy an investment property", "Refinance my loan"];
  var SMSF_Q1 = ["Buy premises for my own business", "Buy commercial property as an investment",
                 "Refinance my SMSF’s existing loan", "Not sure yet"];

  // Home loans price bands. First home buyers see bands that follow each state's price levels;
  // every other buying path, and a first home buyer with no state yet, sees one shared list.
  var FIRST_HOME_PRICES = {
    NSW: ["Under $800k", "$800k to $1m", "$1m to $1.5m"],
    VIC: ["Under $600k", "$600k to $950k", "$950k to $1.5m"],
    QLD: ["Under $700k", "$700k to $1m", "$1m to $1.5m"],
    WA: ["Under $600k", "$600k to $850k", "$850k to $1.5m"],
    SA: ["Under $500k", "$500k to $900k", "$900k to $1.5m"],
    TAS: ["Under $550k", "$550k to $700k", "$700k to $1.5m"],
    ACT: ["Under $750k", "$750k to $1m", "$1m to $1.5m"],
    NT: ["Under $750k", "$750k to $1m", "$1m to $1.5m"]
  };
  var BUY_TAIL = ["$1.5m to $2.5m", "$2.5m+", "Not sure"];
  function homePrices(goal, state) {
    if (goal === "Refinance my loan") return ["Under $500k", "$500k to $750k", "$750k to $1m", "$1m to $1.5m", "$1.5m+", "Not sure"];
    var head = goal === "Buy my first home" && FIRST_HOME_PRICES[state];
    return (head || ["Under $600k", "$600k to $1m", "$1m to $1.5m"]).concat(BUY_TAIL);
  }

  function allSteps(ans) {
    if (PAGE === "home-loans") {
      var g = ans.goal;
      var refi = g === "Refinance my loan";
      var first = g === "Buy my first home";
      var BUY_STAGE = ["Found a property", "Pre-approved, still looking", "Looking, no pre-approval yet", "Planning, 6+ months"];
      var REFI_STAGE = ["Fixed rate ending soon", "Rate feels high", "Access equity or consolidate debt", "Just checking"];
      var list = [
        { key: "goal", q: "What are you looking to do?", o: HOME_Q1 },
        stateStep,
        { key: "stage", q: refi ? "What’s prompting the refinance?" : "Where are you up to?", o: refi ? REFI_STAGE : BUY_STAGE },
        { key: "price_band", q: refi ? "Roughly how much is the loan?" : "Roughly what price?", o: homePrices(g, ans.state) },
        { key: "deposit_band",
          q: refi ? "How much equity do you have?" : first ? "How much deposit do you have?" : "How much deposit or equity do you have?",
          o: refi ? ["Under 20%", "20 to 30%", "30 to 40%", "40%+", "Not sure"]
                  : ["Under 5%", "5 to 10%", "10 to 20%", "20%+", "Not sure"] },
        { key: "residency", q: "What’s your residency status?",
          o: ["Australian citizen", "Permanent resident", "Temporary visa holder", "Non-resident"] }
      ];
      if (first) list.push({ key: "build_type", q: "New build or established?", o: ["New build", "Established", "Not sure yet"] });
      else if (g === "Buy my next home") list.push({ key: "sell_first", q: "Do you need to sell your current home first?", o: ["Yes", "No", "Not sure yet"] });
      else if (g === "Buy an investment property") list.push({ key: "use_equity", q: "Are you using equity from an existing property?", o: ["Yes", "No", "Not sure"] });
      else if (refi) list.push({ key: "loan_use", q: "Is it your home or an investment?", o: ["Home I live in", "Investment property"] });
      return list;
    }
    if (ans.smsf_goal === SMSF_Q1[2]) {
      return [
        { key: "smsf_goal", q: "What would you like help with?", o: SMSF_Q1 },
        { key: "loan_covers", q: "What does the loan cover?", o: ["Residential property", "Commercial property"] },
        { key: "amount_owing", q: "Roughly how much is owing?", o: ["Under $500k", "$500k to $1m", "$1m+"] },
        { key: "property_value", q: "Roughly what is the property worth?", o: ["Under $750k", "$750k to $1.5m", "$1.5m+", "Not sure"] },
        membersStep,
        stateStep
      ];
    }
    return [
      { key: "smsf_goal", q: "What would you like help with?", o: SMSF_Q1 },
      { key: "smsf_setup", q: "Is your SMSF set up?", o: ["Yes", "Being set up with my accountant", "Not yet"] },
      { key: "price_band", q: "Roughly what price?", o: ["Under $500k", "$500k to $1m", "$1m to $2m", "$2m+", "Not sure"] },
      { key: "fund_balance", q: "How much is in the fund, all members combined?", o: ["Under $200k", "$200k to $400k", "$400k to $750k", "$750k+", "Prefer not to say"] },
      membersStep,
      stateStep
    ];
  }

  // Home loans only: Not sure on the price (or loan amount) skips the deposit (or equity) step.
  // Any answer already given to the skipped step is dropped, and so is a price that is not on
  // the current list (the state or the goal changed after it was picked). The SMSF quiz never skips.
  function steps(ans) {
    var list = allSteps(ans);
    if (PAGE !== "home-loans") return list;
    var p = list[3];
    if (ans.price_band && p.o.indexOf(ans.price_band) < 0) delete ans.price_band;
    if (ans.price_band === "Not sure") {
      delete ans.deposit_band;
      list.splice(4, 1);
    }
    return list;
  }

  function isRefi(goal) { return goal === "Refinance my loan" || goal === SMSF_Q1[2]; }

  var S = { step: 0, max: 0, ans: {}, contact: {} };   // max: furthest step reached

  /* ---------- tiny DOM helpers ---------- */
  // Display only: tie the last two words of a line with a no-break space so a single
  // word never ends up alone on the last line. Stored answers keep plain spaces.
  var NBSP = String.fromCharCode(160);
  function tie(text) {
    var s = String(text);
    return s.split(" ").length > 2 ? s.replace(/ ([^ ]+)$/, NBSP + "$1") : s;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var body = document.getElementById("quizBody");

  /* ---------- motion: questions slide in the way you are going, a picked answer
     answers back before the next question arrives. All of it is skipped for anyone
     who asks for reduced motion. ---------- */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dir = 1;
  var busy = false;

  function go(delta) {
    if (busy) return;
    busy = true;
    dir = delta;
    body.classList.remove("is-in-fwd", "is-in-back");
    body.classList.add(delta > 0 ? "is-out-fwd" : "is-out-back");
    setTimeout(function () { S.step += delta; busy = false; render(true); }, reduce ? 0 : 180);
  }

  function ripple(btn, e) {
    if (reduce) return;
    var r = btn.getBoundingClientRect();
    var size = Math.max(r.width, r.height) * 2;
    var dot = el("span", "opt__ripple");
    var x = (e && e.clientX ? e.clientX - r.left : r.width / 2) - size / 2;
    var y = (e && e.clientY ? e.clientY - r.top : r.height / 2) - size / 2;
    dot.style.width = dot.style.height = size + "px";
    dot.style.left = x + "px";
    dot.style.top = y + "px";
    btn.appendChild(dot);
    setTimeout(function () { dot.remove(); }, 650);
  }

  function progress(stepIndex, total) {
    var wrap = el("div", "progress");
    var bar = el("ol", "progress__steps");
    bar.setAttribute("aria-label", "Steps");
    for (var i = 0; i < total; i++) {
      var li = el("li");
      var seg = el("button", "progress__seg");
      seg.type = "button";
      var label = i === total - 1 ? "Your details" : "Question " + (i + 1);
      if (i < stepIndex) seg.classList.add("is-done");
      else if (i === stepIndex) { seg.classList.add("is-current"); seg.setAttribute("aria-current", "step"); }
      else if (i <= S.max) seg.classList.add("is-ahead");
      if (i > S.max || i === stepIndex) { seg.disabled = true; seg.setAttribute("aria-label", label); }
      else {
        seg.setAttribute("aria-label", "Go to " + label.toLowerCase());
        seg.addEventListener("click", (function (to) { return function () { go(to - S.step); }; })(i));
      }
      li.appendChild(seg);
      bar.appendChild(li);
    }
    wrap.appendChild(bar);
    // Back on the left (under where you came from), nothing on the right
    var row = el("div", "progress__row");
    if (stepIndex > 0) {
      var b = el("button", "back", "← Back");
      b.type = "button";
      b.addEventListener("click", function () { go(-1); });
      row.appendChild(b);
    }
    wrap.appendChild(row);
    return wrap;
  }

  function render(focus) {
    var list = steps(S.ans);
    var total = list.length + 1;
    S.max = Math.min(Math.max(S.max, S.step), total - 1);
    body.textContent = "";
    body.classList.remove("is-out-fwd", "is-out-back", "is-in-fwd", "is-in-back");
    if (focus && !reduce) {
      void body.offsetWidth; // restart the entrance animation
      body.classList.add(dir > 0 ? "is-in-fwd" : "is-in-back");
    }
    body.appendChild(progress(S.step, total));

    if (S.step < list.length) {
      var s = list[S.step];
      var q = el("h2", "quiz-q", tie(s.q));
      q.id = "q-" + s.key;
      q.tabIndex = -1;
      body.appendChild(q);
      var opts = el("div", "opts" + (s.grid ? " opts--grid" : ""));
      opts.setAttribute("role", "group");
      opts.setAttribute("aria-labelledby", q.id);
      s.o.forEach(function (label) {
        var b = el("button", "opt" + (S.ans[s.key] === label ? " is-picked" : ""), tie(label));
        b.type = "button";
        b.addEventListener("click", function (ev) {
          if (busy) return;
          ripple(b, ev);
          var prev = S.ans[s.key];
          S.ans[s.key] = label;
          if (prev && (s.key === "goal" || s.key === "smsf_goal") && isRefi(prev) !== isRefi(label)) {
            // Switched between buying and refinance: the other branch's answers no longer apply.
            S.ans = {};
            S.ans[s.key] = label;
            S.max = S.step;
          }
          Array.prototype.forEach.call(opts.children, function (c) { c.classList.toggle("is-picked", c === b); });
          opts.classList.add("has-pick");
          setTimeout(function () { go(1); }, reduce ? 0 : 280);
        });
        opts.appendChild(b);
      });
      body.appendChild(opts);
      if (focus) q.focus({ preventScroll: true });
      return;
    }
    renderContact(total, focus);
  }

  function field(label, name, type, attrs) {
    var wrap = el("label", "f");
    wrap.appendChild(el("span", "f__label", label));
    var input = el("input");
    input.type = type;
    input.name = name;
    input.required = true;
    Object.keys(attrs || {}).forEach(function (k) { input.setAttribute(k, attrs[k]); });
    input.value = S.contact[name] || "";
    input.addEventListener("input", function () {
      S.contact[name] = input.value;
      wrap.classList.remove("is-error");
      var e = wrap.querySelector(".f__error");
      if (e) e.remove();
    });
    wrap.appendChild(input);
    return wrap;
  }

  function showError(wrap, msg) {
    wrap.classList.add("is-error");
    var e = wrap.querySelector(".f__error") || wrap.appendChild(el("span", "f__error"));
    e.textContent = msg;
  }

  function renderContact(total, focus) {
    var q = el("h2", "quiz-q", "Where should we send your options?");
    q.tabIndex = -1;
    body.appendChild(q);

    var form = el("form", "lead-form");
    form.noValidate = true;
    var first = field("First name", "first_name", "text", { autocomplete: "given-name", maxlength: "200" });
    var last = field("Last name", "last_name", "text", { autocomplete: "family-name", maxlength: "200" });
    var mob = field("Mobile", "mobile", "tel", { autocomplete: "tel", inputmode: "tel", maxlength: "20", placeholder: "04xx xxx xxx" });
    var mail = field("Email", "email", "email", { autocomplete: "email", maxlength: "254" });
    mob.classList.add("f--full");
    mail.classList.add("f--full");
    [first, last, mob, mail].forEach(function (n) { form.appendChild(n); });

    if (PAGE === "smsf") {
      var fs = el("fieldset", "yn");
      var lg = el("legend", null, "Does an accountant manage your SMSF? ");
      lg.appendChild(el("i", null, "(optional)"));
      fs.appendChild(lg);
      var yn = el("div", "yn__opts");
      ["Yes", "No"].forEach(function (v) {
        var lab = el("label");
        var r = el("input");
        r.type = "radio";
        r.name = "has_accountant";
        r.value = v;
        r.checked = S.contact.has_accountant === v;
        r.addEventListener("change", function () { S.contact.has_accountant = v; });
        lab.appendChild(r);
        lab.appendChild(el("span", null, v));
        yn.appendChild(lab);
      });
      fs.appendChild(yn);
      form.appendChild(fs);
    }

    var cons = el("label", "consent");
    var box = el("input");
    box.type = "checkbox";
    box.name = "consent";
    box.checked = Boolean(S.contact.consent);
    box.addEventListener("change", function () { S.contact.consent = box.checked; cons.classList.remove("is-error"); });
    cons.appendChild(box);
    var txt = el("span");
    txt.appendChild(document.createTextNode("I agree to the "));
    // TODO: real privacy policy and credit guide URLs.
    var a1 = el("a", null, "privacy policy"); a1.href = "#";
    var a2 = el("a", null, "credit guide"); a2.href = "#";
    txt.appendChild(a1);
    txt.appendChild(document.createTextNode(" and "));
    txt.appendChild(a2);
    txt.appendChild(document.createTextNode(", and to Fundwise contacting me about my enquiry."));
    cons.appendChild(txt);
    form.appendChild(cons);

    var btn = el("button", "btn", "See my options");
    btn.type = "submit";
    form.appendChild(btn);
    var note = el("p", "form-note", "Kien’s team calls within 15 minutes in business hours.");
    form.appendChild(note);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (btn.classList.contains("is-loading")) return;
      var ok = true;
      // clear old errors first so each new one shakes again
      Array.prototype.forEach.call(form.querySelectorAll(".is-error"), function (n) { n.classList.remove("is-error"); });
      void form.offsetWidth;
      [first, last].forEach(function (w) {
        if (!w.querySelector("input").value.trim()) { showError(w, "Required"); ok = false; }
      });
      if (!L.isAuMobile(mob.querySelector("input").value)) {
        showError(mob, "Use 04xx xxx xxx"); ok = false;
      }
      if (!L.isEmail(mail.querySelector("input").value)) {
        showError(mail, "Check the email"); ok = false;
      }
      if (!box.checked) { cons.classList.add("is-error"); ok = false; }
      if (!ok) {
        var bad = form.querySelector(".is-error input");
        if (bad) bad.focus();
        return;
      }
      btn.disabled = true;
      btn.classList.add("is-loading");
      btn.setAttribute("aria-busy", "true");
      var rec = buildRecord(form);
      // Straight on to the landing page, which opens with "Done, thanks <name>" (after-quiz.js).
      L.submit(rec, THANKS);
    });

    body.appendChild(form);
    if (focus) q.focus({ preventScroll: true });
  }

  function buildRecord(form) {
    var rec = L.blankRecord(PAGE, "b", "quiz");
    ["first_name", "last_name", "mobile", "email"].forEach(function (k) {
      rec[k] = form.elements[k].value.trim();
    });
    rec.consent = "Yes";
    rec.has_accountant = S.contact.has_accountant || "";
    var a = S.ans;
    rec.state = a.state || "";

    if (PAGE === "home-loans") {
      rec.stage = a.stage || "";
      rec.price_band = a.price_band || "";
      rec.deposit_band = a.deposit_band || "";
      rec.residency_status = a.residency === "Non-resident" ? "Non-resident / foreign investor" : (a.residency || "");
      rec.enquiry_type = a.goal === "Buy an investment property" ? L.PURPOSE.invest
        : a.goal === "Refinance my loan" ? L.PURPOSE.refinance : L.PURPOSE.live;
      rec.first_home_buyer = a.goal === "Buy my first home" ? L.FIRST_HOME.yes : L.FIRST_HOME.no;
    } else {
      var refi = a.smsf_goal === SMSF_Q1[2];
      rec.smsf_goal = a.smsf_goal || "";
      rec.members_working = a.members_working || "";
      rec.enquiry_type = refi ? L.PURPOSE.refinance : L.PURPOSE.commercial;
      if (refi) {
        rec.loan_covers = a.loan_covers || "";
        rec.amount_owing = a.amount_owing || "";
        rec.property_value = a.property_value || "";
      } else {
        rec.smsf_setup = a.smsf_setup || "";
        rec.price_band = a.price_band || "";
        rec.fund_balance = a.fund_balance || "";
      }
    }
    return rec;
  }

  render(false);
})();
