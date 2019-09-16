const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const electron = require('electron')
const fs = require('fs');
const Test = require('./Test');
const Question = require('./Question');
const Section = require('./Section');
const jsPDF = require('jspdf')

const userDataPath = (electron.app || electron.remote.app).getPath(
  'userData'
);

try {
  getRecentArray();
  getRecents();
}
catch {
  mkdir(app.getPath('userData'));
  fs.writeFile(userDataPath + "/recents.json", "[]", (err) => {
    console.log(err);
    return;
  })
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win
const test = new Test();
var recents = [];
var recentArray = [];

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1000,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  win.loadFile('index.html')
  win.webContents.on('did-finish-load', () => {
    win.webContents.send("recents", recentArray)
  })
  win.maximize()

  var menu = Menu.buildFromTemplate([
    {
        label: 'Testy',
        submenu: [
            {label: "Preferences",accelerator:"CmdOrCtrl+,"},
            {type: "separator"},
            {label:'Quit', accelerator:"CmdOrCtrl+Q", click() { app.quit()}}
        ]
    },
    {
      label: 'File',
      submenu: [
          {label:'New', accelerator: "CmdOrCtrl+N", click() { saveAs() }},
          {label:'Open', accelerator: "CmdOrCtrl+O", click() { open() }},
          {type: "separator"},
          {label:"Save", accelerator: "CmdOrCtrl+S", click() { 
            if(test.pathToFile === "") {
              saveAs()
            } else {
              save()
            }
          }},
          {label: "Save As", accelerator: "CmdOrCtrl+Shift+S", click() { saveAs() }},
          {type: "separator"},
          {label:'Export PDF', accelerator: "CmdOrCtrl+E", click() { exportPDF() }},
      ]
  }
])
Menu.setApplicationMenu(menu); 

  // Open the DevTools.
  // win.webContents.openDevTools()

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
}

ipcMain.on('create-test', (event,arg)=> {
  if (arg) {
    saveAs()
  }
})

ipcMain.on('create-section', (event, arg) => {
  if (arg) {
    test.sections.push(new Section(arg,arg))
    win.webContents.send("data", test)
    save()
  }
})

ipcMain.on('delete-section', (event, arg) => {
  if (arg) {
    test.sections.splice(arg,1)
    save()
  }
})

ipcMain.on('update-questions', (event, arg) => {
  if (arg) {
    section = test.sections[arg[0]]
    try {
      if (section.type == "Multiple Choice") {
        question = new Question(section.type)
        question.fillMC(arg[1][1],arg[1][2],arg[1][3],arg[1][4],arg[1][5])
        section.questions[arg[1][0]] = question
      }else if(section.type == "Matching" || section.type == "True/False" || section.type == "Short Answer"){
        question = new Question(section.type)
        question.fillSAMTF(arg[1][1],arg[1][2])
        section.questions[arg[1][0]] = question
      }
    }
    catch(err) {
      console.log(err,arg,test.sections)
    }

    save()
  }
})

ipcMain.on('render-home', (event,arg)=> {
  if (arg) {
    win.loadFile('index.html')
    win.webContents.on('did-finish-load', () => {
      win.webContents.send("recents", recentArray)
  })
  }
})


ipcMain.on('open-test', (event,arg)=> {
  if (arg) {
    open()
  }
})

ipcMain.on('open-recent', (event,arg)=> {
  if (arg) {
    test.parseData(arg)
    openEditor()
  }
})

ipcMain.on('title-changed', (event,arg) => {
  if (arg) {
    test.name = arg
    save()
  }
})


function open() {
  let options = {
    buttonLabel : "Open Test",
    filters :[
     {name: 'Testy Files', extensions: ['test']}
    ]
   }
  dialog.showOpenDialog(win, options,(filePaths) => {
    if (filePaths == []) {
      console.log("File not opened")
      return;
    }
    var contents = [];
    fs.readFile(filePaths[0],"utf-8", (err,data) => {
      if (err) {
        console.log(err);
      }
      contents = JSON.parse(data)
      if (recents != undefined) {
        for (var i in recents) {
          if (recents[i] === contents.pathToFile) {
            recents.splice(i)
            console.log(recents)
            break;
          }
        }
        recents.unshift(contents.pathToFile)
        recents = recents.slice(0,4)
      } else {
        recents = [contents.pathToFile]
      }
      writeRecents(recents)
      getRecentArray()
      test.parseData(contents)
      openEditor()
    })
  })
}

function saveAs() {

  let options = {
    buttonLabel : "Create Test",
    filters :[
     {name: 'Testy Files', extensions: ['test']}
    ]
   }

  dialog.showSaveDialog(win, options,(filePath) => {
    if (filePath === undefined) {
      console.log("File not saved.");
      return;
    }
    var pathArray = filePath.split('/')
    var fileName = pathArray[pathArray.length - 1].split('.')[0]

    test.name = fileName
    test.pathToFile = filePath

    recents.unshift(filePath)
    recentArray.unshift(test)

    fs.writeFile(filePath, getData(), (err) => {
      if(err){
        console.log("An error has occured creating the file " + err.message)
        return;
      }
        openEditor()

    })
  });
}

function save() {
  fs.writeFile(test.pathToFile, getData(), (err) => {
    if (err) throw err
  })
  recentArray.forEach((item) => {
    if(item.pathToFile === test.pathToFile){
      item.name = test.name;
      item.sections = test.sections;
    }
  })
}

function getData() {
  return JSON.stringify(test)
}

function openEditor() {
  win.loadFile('editor.html')

  win.webContents.on('did-finish-load', () => {
    win.webContents.send("data", test)
  })
}

function getRecentArray() {
  fs.readFile(userDataPath + "/recents.json", 'utf-8', (err,data) => {
    if (err) throw err;
    if (data === "") {
      return;
    }
      var content = JSON.parse(data)
      for (i in content) {
        fs.readFile(content[i], 'utf-8', (err,data) => {
          if (err) {
            console.log(err);
            return;
          }
          recentArray.unshift(JSON.parse(data))
          recentArray.slice(0,4)
      })
    }
  })
}

function getRecents() {
  fs.readFile(userDataPath + "/recents.json", 'utf-8', (err,data) => {
    if (err) throw err;
    if (data === "") {
      return;
    }
      var content = JSON.parse(data)
      for (i in content) {
        fs.readFile(content[i], 'utf-8', (err,data) => {
          if (err) {
            console.log(err);
            return;
          }
          recents.push(JSON.parse(data).pathToFile)
      })
    }
  })
}

function writeRecents(recents) {
  fs.writeFile(userDataPath + "/recents.json", JSON.stringify(recents), (err) => {
    if (err) {
      console.log(err);
      return;
    }
  })

}

function exportPDF() {
  var content = `<p style="font-family: 'Avenir'; text-align:right">Name: _______________________</p><h2 style="font-family: 'Avenir'; position: relative; text-align:center; top: 70px;">${test.name}</h2><ol style="display:flex; flex-direction:column; flex-wrap: wrap; height: 800px; top:100px; width: 70%; position:relative; left:50%; margin-left:-35%;">`

  test.sections.forEach((section) => {
    var questions = shuffle(section.questions)
    questions.forEach((question) => {
      if (question.type == "Multiple Choice") {
        content += `<li style="width:40%; flex: 1 1 autos; margin-bottom:20px;"><p>${question.text}</p><ol type="A" style="margin-top:-10px">`
        var answers = [question.correct,question.f1,question.f2,question.f3]
        ansArr = shuffle(answers)

        ansArr.forEach((answer) => {
          content += `<li>${answer}</li>`
        })
        
        content += `</ol></li>`
      }
      
    })
  })
  content += '</ol>'

  var base64Img = null;
  margins = {
    top: 70,
    bottom: 40,
    left: 30,
    width: 550
  };

  var pdf = new jsPDF('p', 'pt', 'a4');
  pdf.setFontSize(18);
  pdf.fromHTML(document.getElementById('html-2-pdfwrapper'), 
    margins.left,
    margins.top,
    {
      width: margins.width
    },function(dispose) {
      console.log(dispose)
    }, 
    margins);
  
  buffer = pdf.output('arraybuffer');



  let options = {
    buttonLabel : "Export Word Document",
    defaultPath: test.pathToFile.split('.')[0],
    filters :[
     {name: 'Word Files', extensions: ['docx']}
    ]
   }

  dialog.showSaveDialog(win, options,(filePath) => {
    if (filePath === undefined) {
      console.log("File not saved.");
      return;
    }
    fs.writeFile(filePath, document, err => {
      if (err) throw err;
    });
});
  
  
}

function shuffle(a) {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      x = a[i];
      a[i] = a[j];
      a[j] = x;
  }
  return a;
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)
// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.