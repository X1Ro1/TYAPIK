'use strict';

class CodeEditor {
  constructor(root) {
    this.root = root;
    this.input = root.querySelector('.editor__input');
    this.gutterInner = root.querySelector('.editor__gutter-inner');
    this.mirrorInner = root.querySelector('.editor__mirror-inner');
    this.placeholder = root.dataset.placeholder || '';
    this.activeIndex = 0;
    this.count = 0;

    this.input.addEventListener('input', () => this.render());
    this.input.addEventListener('scroll', () => this.syncScroll());
    this.input.addEventListener('keydown', (e) => this.onKeyDown(e));
    ['click', 'keyup', 'focus'].forEach((ev) =>
      this.input.addEventListener(ev, () => this.updateActive())
    );
    document.addEventListener('selectionchange', () => {
      if (document.activeElement === this.input) this.updateActive();
    });

    root.addEventListener('mousedown', (e) => {
      if (e.target.closest('.editor__gutter')) {
        e.preventDefault();
        this.input.focus();
      }
    });

    this.render();
  }

  get value() { return this.input.value; }
  set value(v) { this.input.value = v; this.render(); }
  focus() { this.input.focus(); }

  render() {
    const lines = this.input.value.split('\n');
    const empty = this.input.value === '';
    this.count = lines.length;

    let gutter = '';
    let mirror = '';
    for (let i = 0; i < lines.length; i++) {
      gutter += `<div class="ln">${i + 1}</div>`;
      if (empty && i === 0) {
        mirror += `<div class="ln is-placeholder">${escapeHtml(this.placeholder)}</div>`;
      } else {
        mirror += `<div class="ln">${escapeHtml(lines[i])}</div>`;
      }
    }
    this.gutterInner.innerHTML = gutter;
    this.mirrorInner.innerHTML = mirror;

    this.updateActive();
    this.syncScroll();
  }

  updateActive() {
    const pos = this.input.selectionStart ?? 0;
    const idx = this.input.value.slice(0, pos).split('\n').length - 1;

    const prev = this.activeIndex;
    [this.gutterInner, this.mirrorInner].forEach((box) => {
      box.children[prev]?.classList.remove('is-active');
      box.children[idx]?.classList.add('is-active');
    });
    this.activeIndex = idx;
  }

  syncScroll() {
    const { scrollTop: y, scrollLeft: x } = this.input;
    this.gutterInner.style.transform = `translateY(${-y}px)`;
    this.mirrorInner.style.transform = `translate(${-x}px, ${-y}px)`;
  }

  onKeyDown(e) {
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      this.insert('\t');
      return;
    }
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      const { value, selectionStart } = this.input;
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const currentLine = value.slice(lineStart, selectionStart);
      let indent = currentLine.match(/^[\t ]*/)[0];
      if (/[{:]\s*$/.test(currentLine)) indent += '\t';
      e.preventDefault();
      this.insert('\n' + indent);
    }
  }

  insert(text) {
    this.input.focus();
    const ok = document.execCommand && document.execCommand('insertText', false, text);
    if (!ok) {
      const { selectionStart: s, selectionEnd: e } = this.input;
      this.input.setRangeText(text, s, e, 'end');
      this.render();
    }
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

class Terminal {
  constructor({ box, out, input, prompt }) {
    this.box = box;
    this.out = out;
    this.input = input;
    this.promptText = prompt.textContent;
    this.history = [];
    this.historyPos = 0;

    this.reset();

    box.addEventListener('click', () => {
      if (!window.getSelection().toString()) this.input.focus();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const cmd = input.value;
        input.value = '';
        this.echo(cmd);
        if (cmd.trim()) {
          this.history.push(cmd);
          this.execute(cmd.trim());
        }
        this.historyPos = this.history.length;
        this.scroll();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.historyPos > 0) input.value = this.history[--this.historyPos];
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        input.value = this.historyPos < this.history.length - 1
          ? this.history[++this.historyPos]
          : (this.historyPos = this.history.length, '');
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        this.clear();
      }
    });
  }

  reset() {
    this.out.innerHTML = '';
    this.print('Microsoft Windows [Version 10.0.26200.9550]');
    this.print('(c) Корпорация Майкрософт (Microsoft Corporation). Все права защищены.');
    this.print('');
  }

  print(text = '', type = '') {
    const row = document.createElement('div');
    row.className = 'row' + (type ? ` row--${type}` : '');
    row.textContent = text;
    this.out.appendChild(row);
    this.scroll();
  }

  echo(cmd) { this.print(`${this.promptText}${cmd}`); }

  clear() { this.out.innerHTML = ''; }

  scroll() { this.box.scrollTop = this.box.scrollHeight; }

  execute(cmdline) {
    const [cmd, ...rest] = cmdline.split(/\s+/);
    const arg = rest.join(' ');

    switch (cmd.toLowerCase()) {
      case 'cls':
      case 'clear':
        this.clear();
        return;
      case 'help':
        this.print('Доступные команды: help, cls, echo, date, time, ver');
        this.print('');
        return;
      case 'echo':
        this.print(arg);
        this.print('');
        return;
      case 'date':
        this.print('Текущая дата: ' + new Date().toLocaleDateString('ru-RU'));
        this.print('');
        return;
      case 'time':
        this.print('Текущее время: ' + new Date().toLocaleTimeString('ru-RU'));
        this.print('');
        return;
      case 'ver':
        this.print('');
        this.print('Microsoft Windows [Version 10.0.26200.9550]');
        this.print('');
        return;
      default:
        this.print(`"${cmd}" не является внутренней или внешней командой,`);
        this.print('исполняемой программой или пакетным файлом.');
        this.print('');
    }
  }
}


async function convertGoToPython(goCode) {
  return null;
}

const goEditor = new CodeEditor(document.getElementById('editor-go'));
const pyEditor = new CodeEditor(document.getElementById('editor-py'));

const term = new Terminal({
  box: document.getElementById('terminal'),
  out: document.getElementById('term-out'),
  input: document.getElementById('term-input'),
  prompt: document.getElementById('term-prompt'),
});

// Очистить
document.getElementById('btn-clear').addEventListener('click', () => {
  goEditor.value = '';
  pyEditor.value = '';
  goEditor.focus();
});

// Запустить
document.getElementById('btn-run').addEventListener('click', async () => {
  term.echo('tyapik4 convert main.go');

  const code = goEditor.value;
  if (!code.trim()) {
    term.print('Ошибка: окно GO пустое. Вставьте код и повторите.', 'err');
    term.print('');
    goEditor.focus();
    return;
  }

  term.print(`Строк в GO: ${goEditor.count}`);
  const result = await convertGoToPython(code);

  if (result == null) {
    term.print('Конвертер не подключён: работает только фронтенд.', 'err');
  } else {
    pyEditor.value = result;
    term.print('Готово. Результат в окне Python.', 'ok');
  }
  term.print('');
});
