// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const { remote, ipcRenderer, shell } = require('electron');

const { dialog } = remote;
const ffmpeg = require('fluent-ffmpeg');
const ffmpegOnProgress = require('ffmpeg-on-progress');
const Dialogs = require('dialogs');
const tmp = require('tmp');
const concat = require('ffmpeg-concat');

const dialogs = Dialogs();
const _ = require('underscore');

const dropzone = document.getElementById('dropzone');
const filesDisplay = document.getElementById('files');
const dragZoneText = document.getElementById('dragzoneText');
const buttons = document.getElementById('btns');
const cancel = document.getElementById('cancel');
const convertButton = document.getElementById('convert');
const extractButton = document.getElementById('extract');
const videosToConvert = document.getElementById('files');
const mergeVideos = document.getElementById('merge');

const tmpDir = tmp.dirSync({ prefix: 'tmpDir_' });
// console.log("Dir: ", tmpDir.name);

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
    file =>
      new Promise((resolve, reject) => {
        const filepath = file.path ? file.path : file;
        ffmpeg.ffprobe(filepath, (err, metadata) => {
          resolve(metadata);
          console.log(metadata.streams[0].height, metadata.streams[0].width);
        });
      })
  );

  Promise.all(promises).then(results => {
    results.forEach(result => {
      const path = result.format.filename.split('/');
      const name = path[path.length - 1];
      const outputpath = result.format.filename.split(name)[0];

      // console.log();

      filesDisplay.innerHTML += `<div class="row filecontainer" data-outputpath="${outputpath}" name="${name}"><div class="col-md-4 removefile">X</div><div class="col-md-4" style="float: left;margin:20px">${name} <br><span id="dur">${new Date(
        result.format.duration * 1000
      )
        .toISOString()
        .substr(
          11,
          8
        )}</span></div><div class="col-md-4" style="float:right;margin:20px"><select id="${generateId()}"><option value="mp4">MP4</option><option value="avi">AVI</option><option value="mpeg">MPEG</option><option value="mp3">MP3</option></select></div></div>`;
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
      filters: [
        { name: 'videosToConvert', extensions: ['mp4', 'avi', 'mpeg', 'mkv'] },
      ],
    },
    files => {
      fileMetadata(files);
    }
  );
});

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropzone.addEventListener(eventName, preventDefaults);
});

['dragenter', 'dragover'].forEach(eventName => {
  dropzone.addEventListener(eventName, () => {
    dropzone.classList.add('highlight');
  });
});

['dragleave', 'drop'].forEach(eventName => {
  dropzone.addEventListener(eventName, () => {
    dropzone.classList.remove('highlight');
  });
});

dropzone.addEventListener('drop', e => {
  const dt = e.dataTransfer;
  const { files } = dt;

  fileMetadata(files);
});

convertButton.addEventListener('click', () => {
  mergeVideos.classList.add('disabled');
  extractButton.classList.add('disabled');
  convertButton.classList.add('disabled');

  const { children } = videosToConvert;

  _.each(children, child => {
    const video = child.attributes.name.nodeValue;
    const videoName = video.split('.')[0];
    const selectedFormat = child.lastChild.children[0].value;
    const outPutDir = child.attributes[1].nodeValue;
    const inPutPath = `${outPutDir}${video}`;
    const outPutPath = `${outPutDir}${videoName}.${selectedFormat}`;
    const durationEstimate =
      child.attributes.name.ownerElement.innerText.split(video)[1];

    ffmpeg(inPutPath)
      .output(outPutPath)
      .on(
        'progress',
        ffmpegOnProgress((progress, event) => {
          child.lastChild.innerHTML = `<span style="font-weight:bold;font-size:30px;color:green"> ${(
            progress * 100
          ).toFixed()}% </span>`;
        }, durationEstimate)
      )
      .on('error', error => {
        dialog.showErrorBox('Oops!', `An error ocurred ${error.message}`);
      })
      .on('end', () => {
        child.lastChild.innerHTML = `<div><button class="btn btn-info folder" id="folder" data-outputpath="${outPutPath}" style="border-radius:5px">Open Folder</button></div>`;
        mergeVideos.classList.remove('disabled');
        extractButton.classList.remove('disabled');
        convertButton.classList.remove('disabled');
      })
      .run();
  });
});

extractButton.addEventListener('click', () => {
  convertButton.classList.add('disabled');
  mergeVideos.classList.add('disabled');
  convertButton.classList.add('disabled');

  const { children } = videosToConvert;

  _.each(children, child => {
    const video = child.attributes.name.nodeValue;
    const videoName = video.split('.')[0];
    const outPutDir = child.attributes[1].nodeValue;
    const inPutPath = `${outPutDir}${video}`;
    const outPutPath = `${outPutDir}${videoName}.mp3`;
    const durationEstimate =
      child.attributes.name.ownerElement.innerText.split(video)[1];

    ffmpeg(inPutPath)
      .audioChannels(0)
      .format('mp3')
      .on(
        'progress',
        ffmpegOnProgress((progress, event) => {
          child.lastChild.innerHTML = `<span style="font-weight:bold;font-size:30px;color:green"> ${(
            progress * 100
          ).toFixed()}% </span>`;
        }, durationEstimate)
      )
      .on('end', () => {
        child.lastChild.innerHTML = `<div><button class="btn btn-info folder" id="folder" data-outputpath="${outPutPath}" style="border-radius:5px">Open Folder</button></div>`;
        convertButton.classList.remove('disabled');
        mergeVideos.classList.remove('disabled');
        convertButton.classList.remove('disabled');
      })
      .on('error', error => {
        dialog.showErrorBox('Oops!', `An error ocurred ${error.message}`);
      })
      .output(outPutPath)
      .run();
  });
});

videosToConvert.addEventListener('click', e => {
  if (e.target.classList.contains('removefile')) {
    e.target.parentElement.remove();
    if (filesDisplay.innerHTML === '') {
      filesDisplay.classList.remove('files');
      buttons.classList.remove('show');
      ipcRenderer.send('cancel');
    }
  }
});

mergeVideos.addEventListener('click', () => {
  convertButton.classList.add('disabled');
  mergeVideos.classList.add('disabled');
  extractButton.classList.add('disabled');

  const { children } = videosToConvert;
  const videos = [];
  const output = [];

  _.each(children, child => {
    const video = child.attributes.name.nodeValue;
    const name = child.attributes.name.nodeValue.split('.')[0];
    const inputVideo = `${child.attributes[1].nodeValue}${child.attributes.name.nodeValue}`;
    const finalOutPut = `${child.attributes[1].nodeValue}${name}-merged.mp4`;

    // ffmpeg.ffprobe(inputVideo, (err, metadata) => {
    //   console.log(metadata.streams[0].height);
    // });

    videos.push(`${inputVideo}`);
    output.push(finalOutPut);

    // console.log(child);
  });

  concat({
    output: `${children[0].attributes[1].nodeValue}${
      children[0].attributes.name.nodeValue.split('.')[0]
    }Merged.mp4`,
    videos,
    transition: {
      name: 'circleOpen',
      duration: 1000,
    },
  })
    .then(() => {
      console.log('concat finished');
    })
    .catch(error => {
      console.log(error.message);
    });
});

videosToConvert.addEventListener('click', e => {
  const clicked = e.target;
  if (clicked.classList.contains('folder')) {
    const path = clicked.getAttribute('data-outPutPath');
    shell.showItemInFolder(path);
  }
});
// .on('progress', ffmpegOnProgress((progress, event) => { children[0].lastChild.innerHTML = `<span style="font-weight:bold;font-size:30px;color:green"> ${(progress * 100).toFixed()}% </span>`; }, children[0].attributes.name.ownerElement.innerText.split(children[0].attributes.name.nodeValue)[1]));
