import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min?url";
import { jsPDF } from "jspdf";

// 5,760 x 2,160 is size of cavern, with height doubled so the image appears twice
const cavern_width = 5760;
const cavern_height = 2160;

let pdf = undefined;
let filename = "";
let pageNum = 1;
let converting = false;
try {
  if (typeof window === "undefined" || !("Worker" in window)) {
    throw new Error("Web Workers not supported in this environment.");
  }

  window.pdfjsWorker = pdfjsWorker;
  GlobalWorkerOptions.workerSrc = pdfjsWorker;
} catch (error) {
  console.log(error);
}

function loadFile(f) {
  filename = f.name;
  let reader = new FileReader();
  reader.onload = async function () {
    let typedarray = new Uint8Array(this.result);
    const loadingTask = getDocument(typedarray);
    pdf = await loadingTask.promise;
  };
  reader.readAsArrayBuffer(f);
}

async function presentFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    if (pdf) {
      pageNum = 1;
      await renderSlide(pageNum);
    }
  }
}

function fullscreenCheck() {
  if (document.fullscreenElement) {
    // hide non-fullscreen things
    // show fullscreen things
    document.getElementById("hideOnFullscreen").hidden = true;
    document.getElementById("showOnFullscreen").hidden = false;
  } else {
    // hide fullscreen things
    // show non-screen things
    document.getElementById("hideOnFullscreen").hidden = false;
    document.getElementById("showOnFullscreen").hidden = true;
  }
}

async function nextPage() {
  if (pageNum >= pdf._pdfInfo.numPages) return;
  pageNum++;
  await renderSlide(pageNum);
}

async function prevPage() {
  if (pageNum <= 1) return;
  pageNum--;
  await renderSlide(pageNum);
}

async function renderSlide(pageNum) {
  let page = await pdf.getPage(pageNum);
  let viewport = page.getViewport({ scale: 1 });
  let scale = cavern_height / 2 / viewport.height;
  let scaledViewport = page.getViewport({ scale: scale });
  let canvas = document.getElementById("showOnFullscreen");
  let context = canvas.getContext("2d");
  let backgroundColor = document.getElementById("background-color").value;

  // match canvas dimensions to cavern dimensions
  canvas.width = cavern_width;
  canvas.height = cavern_height;
  canvas.style.width = cavern_width + "px";
  canvas.style.height = cavern_height + "px";

  // position the image at the top, centered
  var transform_top = [
    1,
    0,
    0,
    1,
    Math.floor(cavern_width / 2 - scaledViewport.width / 2),
    0,
  ];
  var renderContext = {
    canvasContext: context,
    transform: transform_top,
    viewport: scaledViewport,
    background: backgroundColor,
  };
  // render the page to the top half of the canvas
  await page.render(renderContext).promise;
  // copy the top half to the bottom half
  context.drawImage(
    canvas,
    0,
    0,
    cavern_width,
    cavern_height / 2,
    0,
    cavern_height / 2,
    cavern_width,
    cavern_height / 2
  );
}

async function renderSlideNoBorder(pageNum) {
  let page = await pdf.getPage(pageNum);
  let viewport = page.getViewport({ scale: 1 });
  let scale = cavern_height / 2 / viewport.height;
  let scaledViewport = page.getViewport({ scale: scale });
  let canvas = document.getElementById("showOnFullscreen");
  let context = canvas.getContext("2d");
  let backgroundColor = document.getElementById("background-color").value;

  // match canvas dimensions to cavern dimensions
  canvas.width = scaledViewport.width;
  canvas.height = cavern_height;
  canvas.style.width = scaledViewport.width + "px";
  canvas.style.height = cavern_height + "px";

  var renderContext = {
    canvasContext: context,
    viewport: scaledViewport,
    background: backgroundColor,
  };
  // render the page to the top half of the canvas
  await page.render(renderContext).promise;
  // copy the top half to the bottom half
  context.drawImage(
    canvas,
    0,
    0,
    scaledViewport.width,
    scaledViewport.height,
    0,
    scaledViewport.height,
    scaledViewport.width,
    scaledViewport.height
  );
  return scaledViewport.width;
}

async function convert() {
  // create a new pdf
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [cavern_width, cavern_height],
    compress: true,
  });

  const progressBar = document.getElementById("progress-bar");
  progressBar.value = 0;
  progressBar.innerText = "0%";
  let image = document.getElementById("showOnFullscreen");
  let backgroundColor = document.getElementById("background-color").value;
  // render each page and add it to the pdf
  for (let i = 1; i <= pdf._pdfInfo.numPages; i++) {
    // await renderSlide(i);
    // doc.addImage(image, "PNG", 0, 0, cavern_width, cavern_height);

    // render smaller canvas + background color to reduce file size
    let im_width = await renderSlideNoBorder(i);
    doc
      .setFillColor(backgroundColor)
      .rect(0, 0, cavern_width, cavern_height, "F");
    doc.addImage(
      image,
      "PNG",
      cavern_width / 2 - im_width / 2,
      0,
      im_width,
      cavern_height
    );
    if (i != pdf._pdfInfo.numPages) {
      doc.addPage();
    }
    progressBar.value = (i / pdf._pdfInfo.numPages) * 100;
    progressBar.innerText = `${((i / pdf._pdfInfo.numPages) * 100).toFixed(
      1
    )}%`;
  }

  // figure out the filename to use
  const lastIndex = filename?.lastIndexOf(".") ?? -1;
  let new_filename = "cavern_presentation.pdf";
  if (filename && lastIndex !== -1) {
    new_filename = filename.substring(0, lastIndex) + "_cavernDoubled.pdf";
  }

  // convert the pdf to a blob to be downloaded
  const pdfOutput = doc.output("stringArray");
  const newBlob = new Blob(
    pdfOutput.map((chunk) => Uint8Array.from(chunk, (x) => x.charCodeAt(0))),
    { type: "application/pdf" }
  );

  // download the pdf
  const a = document.createElement("a");
  a.download = new_filename;
  a.rel = "noopener";
  a.href = URL.createObjectURL(newBlob);
  a.click();
  a.remove();
  URL.revokeObjectURL(newBlob);
}

document.addEventListener("fullscreenchange", fullscreenCheck);
document.getElementById("file-selector").onchange = function (e) {
  if (converting) return;
  const fileList = e.target.files;
  loadFile(fileList[0]);
};
document.getElementById("present").onclick = () => {
  if (converting) return;
  presentFullScreen();
};
document.getElementById("convert").onclick = async () => {
  if (converting) return;
  converting = true;
  const showOnConvert = document.getElementsByClassName("showOnConvert");
  const hideOnConvert = document.getElementsByClassName("hideOnConvert");
  for (let item of showOnConvert) {
    item.hidden = false;
  }
  for (let item of hideOnConvert) {
    item.hidden = true;
  }
  await convert();
  for (let item of showOnConvert) {
    item.hidden = true;
  }
  for (let item of hideOnConvert) {
    item.hidden = false;
  }
  converting = false;
};
// document.body.onload = fullscreenCheck;

document.addEventListener("keydown", function (event) {
  if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
    event.preventDefault();
    event.stopPropagation();
    if (converting) return;
    prevPage();
  } else if (
    event.key === "ArrowDown" ||
    event.key === "ArrowRight" ||
    event.key === " " ||
    event.key === "Enter"
  ) {
    event.preventDefault();
    event.stopPropagation();
    if (converting) return;
    nextPage();
  }
});

document.addEventListener("drop", function (e) {
  e.preventDefault();
  e.stopPropagation();
  if (converting) return;
  document.getElementById("file-selector").files = e.dataTransfer.files;
  loadFile(e.dataTransfer.files[0]);
  // if (e.dataTransfer.items && e.dataTransfer.items.length != 0) {
  //   if (e.dataTransfer.items[0].kind !== "file") {
  //     return;
  //   }
  //   const file = e.dataTransfer.items[0].getAsFile();
  //   loadFile(file);
  // } else {
  //   const file = e.dataTransfer.files[0];
  //   loadFile(file);
  // }
});
document.addEventListener("dragover", function (e) {
  e.preventDefault();
  e.stopPropagation();
});
