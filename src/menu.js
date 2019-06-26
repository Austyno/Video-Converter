// const {Menu} = require('electron');

// const mainMenu = Menu.buildFromTemplate(menuTemplate);
//       Menu.setApplicationMenu(mainMenu);

const menuTemplate = [
  {
    label: 'file',
    submenu: [
      {
        label: 'Add Items',
        accelerator: 'CmdOrCtrl+O',
        click() {
          createAddWindow();
        },
      },
      {
        label: 'Clear Todo',
        click() {
          mainWindow.webContents.send('clear-all');
        },
      },
      {
        label: 'Clear Completed',
        click() {
          mainWindow.webContents.send('clear-completed');
        },
      },
      {
        role: 'reload',
      },
    ],
  },
  {
    label: ' Dev Tools',
    submenu: [
      {
        label: 'Toggle Devtools',
        click(item, focusedwindow) {
          focusedwindow.toggleDevTools();
        },
      },
    ],
  },
];
module.exports = menuTemplate;
