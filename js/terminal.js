// Interactive "SOC terminal": a recruiter-friendly way to query the portfolio.
import { projects } from './projects.js';

const C = (cls, t) => `<span class="${cls}">${t}</span>`;

const COMMANDS = {
  help: () => [
    'Available commands:',
    ...[
      ['whoami', 'who I am'],
      ['role', 'current role & level'],
      ['playbooks', 'SOAR automation I built'],
      ['stack', 'security layers I work on'],
      ['skills', 'tools & platforms'],
      ['projects', 'GitHub projects'],
      ['certs', 'certifications'],
      ['education', 'degrees'],
      ['contact', 'how to reach me'],
      ['resume', 'download my résumé'],
      ['hire', '¯\\_(ツ)_/¯'],
      ['clear', 'clear the screen'],
      ['exit', 'close the terminal'],
    ].map(([c, d]) => `  ${C('c', c.padEnd(11))} ${C('m', d)}`),
  ],
  whoami: () => [
    `${C('c', 'Korada Purna Sai')} · L2 SOC Analyst & SOC Engineer`,
    'Visakhapatnam, India · Microsoft SC-200',
    'I investigate incidents and engineer the automation, integrations and',
    'policies behind a modern Microsoft security stack.',
  ],
  role: () => [
    `${C('a', 'Auxilium IT Services Pvt Ltd')} · Apr 2025 → present (L2 since Dec 2025)`,
    `  ${C('c', 'L2 SOC Analyst')}  escalations, investigations, RCA, phishing analysis`,
    `  ${C('v', 'SOC Engineer')}    playbooks, connectors, watchlists, policy hardening, DLP`,
    `  ${C('m', '~100 alerts/day · 30–40% fewer false positives · 3 DLP policy designs')}`,
    `  ${C('m', 'open to: SOC Engineer / SOC Analyst · remote or any location')}`,
  ],
  playbooks: () => [
    '10–15 Sentinel SOAR playbooks (Logic Apps):',
    `  ${C('c', '→')} Sentinel → Jira incident integration`,
    `  ${C('c', '→')} Alert & incident notifications by email`,
    `  ${C('c', '→')} Closure comments posted to Microsoft Teams chat`,
    `  ${C('c', '→')} Conditional auto-close of incidents`,
    `  ${C('m', '…and more across the incident lifecycle')}`,
  ],
  stack: () => [
    `${C('c', '01')} Identity & Access   identity & IAM audits, sign-in RCA, admin-reset detections`,
    `${C('c', '02')} Endpoint & Device   Defender / endpoint / Intune policy misconfig → ticket → fix`,
    `${C('c', '03')} Email Security      SPF · DKIM · DMARC checks, DNS TXT record fixes`,
    `${C('c', '04')} Data Protection     continuous Purview DLP tuning, sensitivity labeling`,
    `${C('c', '05')} Detection           connectors, log ingestion, domain watchlists, analytics`,
    `${C('c', '06')} Response            playbooks, SOPs, Jira / Teams / email`,
  ],
  skills: () => [
    `${C('v', 'microsoft')}  Sentinel, Defender XDR (Endpoint, O365), Purview, Intune, Entra ID, Logic Apps`,
    `${C('v', 'soc')}        incident response, RCA, phishing analysis, detection engineering, KQL`,
    `${C('v', 'offense')}    Kali, Nmap, Metasploit, Burp Suite, Wireshark, Nessus, OWASP Top 10`,
    `${C('v', 'code')}       Python, JavaScript, React, Firebase, HTML/CSS, Git`,
  ],
  projects: () => [
    ...projects.map((p) => `  ${C('c', p.date.padEnd(9))} ${p.title.padEnd(42)} <a href="${p.url}" target="_blank" rel="noopener">repo</a>${p.live ? ` · <a href="${p.live}" target="_blank" rel="noopener">live</a>` : ''}`),
  ],
  certs: () => ['Microsoft SC-200', 'AWS Academy Graduate: ML Foundations', 'Cyberthreya Elite Mastery', 'Palo Alto Cybersecurity Internship', 'NIKIST Hacker Mentorship Club Internship', 'IIDT Cybersecurity Internship'].map((c) => `  ${C('c', '✓')} ${c}`),
  education: () => [
    `  ${C('c', '2024–2027')} MCA · Andhra University · ~90% · completing Jan 2027`,
    `  ${C('c', '2021–2024')} BCA · Gayatri Vidya Parishad College · 70.0%`,
    `  ${C('c', '2019–2021')} Intermediate MPC · Sri Chaitanya Junior College · 73.3%`,
  ],
  contact: () => [
    `  email     <a href="mailto:siddhukorda756@gmail.com">siddhukorda756@gmail.com</a>`,
    `  linkedin  <a href="https://www.linkedin.com/in/purna-sai-korada-b6a634293/" target="_blank" rel="noopener">purna-sai-korada</a>`,
    `  github    <a href="https://github.com/Thondarock" target="_blank" rel="noopener">Thondarock</a>`,
    `  instagram <a href="https://www.instagram.com/tr__siddhu_" target="_blank" rel="noopener">tr__siddhu_</a>`,
  ],
  resume: () => {
    const a = document.createElement('a');
    a.href = 'assets/Korada-Purna-Sai-Resume.pdf';
    a.download = '';
    a.click();
    return [`${C('c', '✓')} downloading Korada-Purna-Sai-Resume.pdf …`];
  },
  hire: () => [
    `${C('a', '[!]')} privilege escalation request detected…`,
    `${C('c', '[✓]')} request approved. Great choice.`,
    `    → <a href="mailto:siddhukorda756@gmail.com?subject=Let's%20talk">send the offer letter</a>`,
  ],
  sudo: () => [`${C('a', 'nice try.')} this incident has been logged and escalated to L2 (that's me).`],
  ls: () => ['about/  experience/  engineering/  work/  lab/  skills/  credentials/  contact/'],
};

export function initTerminal({ onOpen, onClose } = {}) {
  const root = document.getElementById('term');
  const out = document.getElementById('termOut');
  const form = document.getElementById('termForm');
  const input = document.getElementById('termInput');
  const fab = document.getElementById('termFab');
  const history = [];
  let hi = 0;
  let booted = false;

  const print = (lines, cls) => {
    (Array.isArray(lines) ? lines : [lines]).forEach((l) => {
      const p = document.createElement('div');
      if (cls) p.className = cls;
      p.innerHTML = l;
      out.appendChild(p);
    });
    out.scrollTop = out.scrollHeight;
  };

  const open = () => {
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    if (!booted) {
      booted = true;
      print([C('m', 'KPS-SOC secure shell · session established'), `Type ${C('c', 'help')} to list commands. Try ${C('c', 'playbooks')} or ${C('c', 'hire')}.`, '']);
    }
    setTimeout(() => input.focus(), 50);
    onOpen && onOpen();
  };
  const close = () => {
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    fab.focus();
    onClose && onClose();
  };

  fab.addEventListener('click', open);
  document.getElementById('termClose').addEventListener('click', close);
  root.addEventListener('click', (e) => { if (e.target === root) close(); });
  window.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement !== input;
    if (e.key === '`' && !typing) { e.preventDefault(); root.classList.contains('is-open') ? close() : open(); }
    if (e.key === 'Escape' && root.classList.contains('is-open')) close();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && history.length) { hi = Math.max(0, hi - 1); input.value = history[hi]; e.preventDefault(); }
    if (e.key === 'ArrowDown' && history.length) { hi = Math.min(history.length, hi + 1); input.value = history[hi] || ''; e.preventDefault(); }
    if (e.key === 'Tab') {
      e.preventDefault();
      const m = Object.keys(COMMANDS).concat(['clear', 'exit']).filter((c) => c.startsWith(input.value.trim()));
      if (m.length === 1) input.value = m[0];
    }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = input.value.trim();
    input.value = '';
    if (!raw) return;
    history.push(raw);
    hi = history.length;
    print(`${C('c', 'kps@soc:~$')} ${raw.replace(/</g, '&lt;')}`);
    const cmd = raw.split(/\s+/)[0].toLowerCase();
    if (cmd === 'clear') { out.innerHTML = ''; return; }
    if (cmd === 'exit') { close(); return; }
    const fn = COMMANDS[cmd];
    print(fn ? fn() : `${C('a', 'command not found:')} ${cmd.replace(/</g, '&lt;')} · type ${C('c', 'help')}`);
    print('');
  });
}
