const os = require('os');
const blessed = require('blessed');


const WIDTH_LEFT_PANEL = 20;
const DEFAULT_PADDING = {
  top : 0,
  left : 1,
  right : 1
};
const STATUS_BAR = (copy) => {
  return [
    ' ',
    [
      '面板(left\/right\/click)',
      '滚动(up\/down\/wheel)',
      (copy
        ? '{8-fg}锁定(s){/}/{15-fg}复制(f){/}'
        : '{15-fg}锁定(s){/}\/{8-fg}复制(f){/}'
      ),
      '退出(Ctrl-C)',
    ].join(' | '),
    '{|} {cyan-fg}{bold}潜羽 https://loon.sankuai.com/{/}  ',
  ].join('');
};

const START_DATE = new Date();

function Dashboard() {
  this.log_boxes = [];
  this.log_index = 0;
  this.board_list = ['screen_type', 'screen_monitor', 'screen_info', 'log_boxes'];
  this.board_index = 0;
}

Dashboard.prototype.init = function() {
  this.screen = blessed.screen({
    smartCSR: true,
    fullUnicode: true,
  });

  this.screen.title = 'Loon Dashboard';
  this.screen_type = blessed.list({
    label: ' Type ',
    top: '0',
    left: '0',
    width: WIDTH_LEFT_PANEL + '%',
    height: '16%',
    padding: DEFAULT_PADDING,
    scrollbar: {
      ch: ' ',
      inverse: false
    },
    border: {
      type: 'line'
    },
    mouse: true,
    keys: true,
    autoCommandKeys: true,
    tags: true,
    style: {
      selected: {
        fg: 'green'
      },
      scrollbar: {
        bg: 'blue',
        fg: 'black'
      },
      fg: 'white',
      border: {
        fg: 'blue'
      },
      header: {
        fg: 'blue'
      }
    }
  });
  this.screen_monitor = blessed.box({
    label: ' Monitor ',
    top: '0',
    left: WIDTH_LEFT_PANEL + '%',
    width: 70 - WIDTH_LEFT_PANEL + '%',
    height: '16%',
    padding: DEFAULT_PADDING,
    mouse: true,
    scrollable: true,
    scrollbar: {
      ch: ' ',
      inverse: false
    },
    keys: true,
    autoCommandKeys: true,
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'white',
      border: {
        fg: 'white'
      },
      scrollbar: {
        bg: 'blue',
        fg: 'black'
      }
    }
  });
  this.screen_loving = blessed.box({
    label: ' ♡ ',
    top: '0',
    left: '70%',
    width: '30%',
    height: '16%',
    padding: DEFAULT_PADDING,
    mouse: true,
    scrollable: true,
    scrollbar: {
      ch: ' ',
      inverse: false
    },
    keys: true,
    autoCommandKeys: true,
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'white',
      border: {
        fg: 'white'
      },
      scrollbar: {
        bg: 'blue',
        fg: 'black'
      }
    }
  });
  this.screen_info = blessed.box({
    label: ' Info ',
    top: '16%',
    left: '0',
    width: WIDTH_LEFT_PANEL + '%',
    height: '80%',
    padding: DEFAULT_PADDING,
    mouse: true,
    scrollable: true,
    scrollbar: {
      ch: ' ',
      inverse: false
    },
    keys: true,
    autoCommandKeys: true,
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'white',
      border: {
        fg: 'white'
      },
      scrollbar: {
        bg: 'blue',
        fg: 'black'
      }
    }
  });
  this.screen_text = blessed.text({
    left: '0%',
    top: '95%',
    width: '100%',
    height: '6%',
    valign: 'middle',
    content: STATUS_BAR(),
    tags: true,
    style: {
      fg: 'white'
    }
  });

  // 运行总时长
  this.screen_type.focus();
  this.screen.append(this.screen_type);
  this.screen.append(this.screen_monitor);
  this.screen.append(this.screen_loving);
  this.screen.append(this.screen_info);
  this.screen.append(this.screen_text);
  this.screen_type.on('select', (i, index) => this.select(index));
  this.screen_type.on('click', () => this.focus('screen_type'));
  this.screen_info.on('click', () => this.focus('screen_info'));
  this.screen_monitor.on('click', () => this.focus('screen_monitor'));
  this.screen.key(['s'], () => this.copy(false));
  this.screen.key(['f'], () => this.copy(true));
  this.screen.key(['left', 'right'], (ch, key) => this.focus(key.name === 'left' ? -1 : 1));
  this.screen.key(['C-c'], () => {
    this.screen.destroy();
    process.exit(0)
  });
  this.screen.render();
  this.refresh();
};

Dashboard.prototype.copy = function(flag) {
  if (flag) {
    this.screen.program.disableMouse();
    this.screen_text.setContent(STATUS_BAR(flag));
  } else {
    this.screen.program.enableMouse();
    this.screen_text.setContent(STATUS_BAR(flag));
  }
  this.screen.render();
};

Dashboard.prototype.select = function(index) {
  this.log_index = index;
  this.log_boxes.forEach((item, index) => {
    if (index === this.log_index) {
      item.box.show();
    } else {
      item.box.hide();
    }
  });
  this.screen.render();
};

Dashboard.prototype.focus = function(arg) {
  const board_count = this.board_list.length;
  this.board_index = typeof arg === 'string' ? this.board_list.indexOf(arg) : (this.board_index + arg + board_count) % board_count;
  this.board_list.forEach((key, index) => {
    [].concat(this[key]).forEach(board => {
      board = board.box || board;
      if (this.board_index === index) {
        board.focus();
        board.style.border.fg = 'blue';
      } else {
        board.style.border.fg = 'white';
      }
    });
  });
  this.screen.render();
};

Dashboard.prototype.get = function(type) {
  type = type || 'system';
  return this.log_boxes.find(i => i.type === type) || this.log(type);
};

Dashboard.prototype.log = function(type) {
  const log_box = blessed.log({
    label: ` Log: ${type} `,
    top: '16%',
    left: WIDTH_LEFT_PANEL + '%',
    width: 100 - WIDTH_LEFT_PANEL + '%',
    height: '80%',
    padding: DEFAULT_PADDING,
    mouse: true,
    scrollable: true,
    scrollbar: {
      ch: ' ',
      inverse: false
    },
    keys: true,
    autoCommandKeys: true,
    hidden: this.log_boxes.length > 0,
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'white',
      border: {
        fg: 'white'
      },
      scrollbar: {
        bg: 'blue',
        fg: 'black'
      }
    }
  });
  this.screen.append(log_box);
  log_box.on('click', () => this.focus('log_boxes'));

  const logger = level => {
    if (type === 'system' && level === 'info') {
      return (...args) => this.screen_info.pushLine(args.map(i => String(i)).join(' '))
    }
    let lastline = '';
    return (...args) => {
      let newline = '';
      if (args.length === 1) {
        newline = Buffer.isBuffer(args[0]) ? args[0].toString() : (args[0] + '\n');
      } else if (args.length > 1) {
        newline = args.map(i => String(i)).join(' ') + '\n';
      }

      newline = lastline + newline;
      lastline && log_box.popLine();
      newline.split('\n').forEach((line, index, list) => {
        if (line.length > 0) {
          if (/^<s>/.test(line)) {
            line = line.replace(/^<s>/, '');
            log_box.popLine();
          }
          log_box.pushLine(`${getLevelColor(level)}${level} > ${line}{/}`);
        }
        if (index === list.length - 1) {
          lastline = line;
        }
      });
    };
  };

  const log = {
    screen: this.screen,
    type: type,
    box: log_box,
    get: type => this.get(type),
  };
  ['log', 'trace', 'debug', 'info', 'warn', 'error'].forEach(level => {
    log[level] = logger(level);
  });

  this.log_boxes.push(log);
  this.screen_type.add(type);
  this.screen.render();
  return log;
};

Dashboard.prototype.refresh = function() {
  const current_date = new Date();
  const work_minutes = ((current_date - START_DATE) / 1000 / 60).toFixed(0);

  let work_tips = '';
  if (work_minutes > 60) {
    work_tips += '工作辛苦了~';
    if (work_minutes > 240) {
      work_tips += ' 休息一下吧';
    }
  }
  if (work_tips) {
    work_tips = `，${work_tips}`;
  }

  const usage = this.usage = this.usage || {};
  if (!this.usage.timestamp || current_date - this.usage.timestamp > 1000) {
    const [ loadavg ] = os.loadavg();
    usage.timestamp = +current_date;
    usage.loadavg = loadavg.toFixed(4);
    usage.mem_free = os.freemem();
    usage.mem_total = os.totalmem();
    usage.mem_usage = usage.mem_total - usage.mem_free;
    usage.mem_percent = (100 * usage.mem_usage / usage.mem_total).toFixed(2);
  }

  this.screen_loving.setLine(0, `运行时长: ${work_minutes} min${work_tips}`);
  this.screen_loving.setLine(1, `当前时间: ${current_date.toLocaleString()}`);
  this.screen_loving.setLine(2, `启动时间: ${START_DATE.toLocaleString()}`);

  this.screen_monitor.setLine(0, `Mem usage: ${usage.mem_percent}%, ${usage.mem_free} free, ${usage.mem_total} total`);
  this.screen_monitor.setLine(1, `loadavg: ${usage.loadavg}`);

  this.screen.render();
  setTimeout(() => this.refresh(), 300);
};

function getLevelColor(level) {
  switch (level) {
    case 'error':
      return '{9-fg}';
    case 'warn':
      return '{11-fg}';
    case 'debug':
      return '{13-fg}';
    case 'trace':
      return '{8-fg}';
    case 'info':
      return '{15-fg}';
    case 'log':
    default:
      return '{7-fg}';
  };
}

let dashboard;
exports = module.exports = type => {
  if (dashboard) {
    return dashboard.get(type);
  } else {
    dashboard = new Dashboard()
    dashboard.init();
    dashboard.get();
    return dashboard.get(type);
  }
};
