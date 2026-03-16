const { app, BrowserWindow } = require("electron");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: "INOX PHARMA",
    autoHideMenuBar: true,
  });

  // Charge l'URL de votre app en ligne
  win.loadURL("https://inox-pharma5.vercel.app/");

  // Si la page ne charge pas, afficher une erreur
  win.webContents.on("did-fail-load", () => {
    win.loadURL(`data:text/html,
      <html>
        <body style="font-family:sans-serif;text-align:center;padding:50px;background:#1e293b;color:white">
          <h1>INOX PHARMA</h1>
          <p>Vérifiez votre connexion internet</p>
          <button onclick="location.reload()" 
            style="padding:10px 20px;background:#0066CC;color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px">
            Réessayer
          </button>
        </body>
      </html>
    `);
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});