// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const { remote, ipcRenderer } = require('electron');

const { dialog } = remote;
const ffmpeg = require('fluent-ffmpeg');
const ffmpegOnProgress = require('ffmpeg-on-progress');
const extractAudio = require('ffmpeg-extract-audio');

const _ = require('underscore');

const dropzone = document.getElementById('dropzone');

const filesDisplay = document.getElementById('files');
const dragZoneText = document.getElementById('dragzoneText');
const buttons = document.getElementById('btns');
const cancel = document.getElementById('cancel');
const convertButton = document.getElementById('convert');
const extractButton = document.getElementById('extract');
const videosToConvert = document.getElementById('files');
const removeVideo = document.getElementById('removefile');


// const logProgress = (progress, event) => {
//   // progress is a floating point number from 0 to 1
//   console.log('progress', `${(progress * 100).toFixed()}%`);
// };

function generateId() {
  const S4 = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  };
  return `${S4() + S4()}`;
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}


function fileMetadata(files) {
  filesDisplay.classList.add('files');
  buttons.classList.add('show');
  const promises = _.map(
    files,
    file => new Promise((resolve, reject) => {
      const filepath = file.path ? file.path : file;
      ffmpeg.ffprobe(filepath, (err, metadata) => {
        resolve(metadata);
        // console.log(metadata);
      });
    }),
  );

  Promise.all(promises).then((results) => {
    results.forEach((result) => {
      const path = result.format.filename.split('/');
      const name = path[path.length - 1];
      const outputpath = result.format.filename.split(name)[0];

      // console.log();

      filesDisplay.innerHTML += `<div class="row filecontainer" data-outputpath="${outputpath}" name="${name}"><div class="col-md-4 removefile">X</div><div class="col-md-4" style="float: left;margin:20px">${name} <br><span id="dur">${
        new Date(result.format.duration * 1000).toISOString().substr(11, 8)
      }</span></div><div class="col-md-4" style="float:right;margin:20px"><select id="${generateId()}"><option>Select format</option><option value="avi">AVI</option><option value="mp4">MP4</option><option value="mpeg">MPEG</option></select></div></div>`;
    });
  });
  // console.log(files);
}

cancel.addEventListener('click', () => {
  ipcRenderer.send('cancel');
});

dropzone.addEventListener('click', () => {
  dialog.showOpenDialog(
    {
      properties: ['multiSelections', 'openFile'],
      filters: [{ name: 'Videos', extensions: ['mp4', 'avi', 'mpeg', 'mkv'] }],
    },
    (files) => {
      fileMetadata(files);
      // convertButton.addEventListener('click', convertVideo(files));
    },
  );
});

['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
  dropzone.addEventListener(eventName, preventDefaults);
});

[('dragenter', 'dragover')].forEach((eventName) => {
  dropzone.addEventListener(eventName, () => {
    dropzone.classList.add('highlight');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  dropzone.addEventListener(eventName, () => {
    dropzone.classList.remove('highlight');
  });
});

dropzone.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  const { files } = dt;

  fileMetadata(files);
});

convertButton.addEventListener('click', () => {
  const { children } = videosToConvert;

  _.each(children, (child) => {
    const video = child.attributes.name.nodeValue;
    const videoName = video.split('.')[0];
    const selectedFormat = child.lastChild.children[0].value;
    const outPutDir = child.attributes[1].nodeValue;
    const inPutPath = `${outPutDir}${video}`;
    const outPutPath = `${outPutDir}${videoName}.${selectedFormat}`;
    const durationEstimate = child.attributes.name.ownerElement.innerText.split(video)[1];
    const divWidth = child.attributes[2].ownerElement.clientWidth;
    const container = child.attributes[2].ownerElement;

    ffmpeg(inPutPath)
      .output(outPutPath)
      .on('end', () => {
        child.lastChild.innerHTML = '<div><button class="btn btn-info" id="folder" style="border-radius:5px">Open Folder</button></div>';
      })
      .run();
    // console.log();
  });
});

extractButton.addEventListener('click', () => {
  const { children } = videosToConvert;

  _.each(children, (child) => {
    const video = child.attributes.name.nodeValue;
    const videoName = video.split('.')[0];
    const outPutDir = child.attributes[1].nodeValue;
    const inPutPath = `${outPutDir}${video}`;
    const outPutPath = `${outPutDir}${videoName}.mp3`;

    extractAudio({
      input: inPutPath,
      output: outPutPath,
    }).then(() => { child.lastChild.innerHTML = '<p style="background:#03b1c4;;height:30px;color:white;padding:5px;line-height:20px">Congratulations!! Extraction Complete</p>'; });
  });
});

videosToConvert.addEventListener('click', (e) => {
  e.target.parentElement.remove();
  if (filesDisplay.innerHTML === '') {
    filesDisplay.classList.remove('files');
    buttons.classList.remove('show');
  }
});
