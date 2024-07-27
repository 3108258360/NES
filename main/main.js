var SCREEN_WIDTH = 256;
var SCREEN_HEIGHT = 240;
var FRAMEBUFFER_SIZE = SCREEN_WIDTH * SCREEN_HEIGHT;
var canvas_ctx, image;
var framebuffer_u8, framebuffer_u32;
var AUDIO_BUFFERING = 512;
var SAMPLE_COUNT = 4 * 1024;
var SAMPLE_MASK = SAMPLE_COUNT - 1;
var audio_samples_L = new Float32Array(SAMPLE_COUNT);
var audio_samples_R = new Float32Array(SAMPLE_COUNT);
var audio_write_cursor = 0,
  audio_read_cursor = 0;
var nes = new jsnes.NES({
  onFrame: function (framebuffer_24) {
    for (var i = 0; i < FRAMEBUFFER_SIZE; i++)
      framebuffer_u32[i] = 0xff000000 | framebuffer_24[i];
  },
  onAudioSample: function (l, r) {
    audio_samples_L[audio_write_cursor] = l;
    audio_samples_R[audio_write_cursor] = r;
    audio_write_cursor = (audio_write_cursor + 1) & SAMPLE_MASK;
  },
});
function onAnimationFrame() {
  window.requestAnimationFrame(onAnimationFrame);

  image.data.set(framebuffer_u8);
  canvas_ctx.putImageData(image, 0, 0);
}
function audio_remain() {
  return (audio_write_cursor - audio_read_cursor) & SAMPLE_MASK;
}
function audio_callback(event) {
  var dst = event.outputBuffer;
  var len = dst.length;
  if (audio_remain() < AUDIO_BUFFERING) nes.frame();

  var dst_l = dst.getChannelData(0);
  var dst_r = dst.getChannelData(1);
  for (var i = 0; i < len; i++) {
    var src_idx = (audio_read_cursor + i) & SAMPLE_MASK;
    dst_l[i] = audio_samples_L[src_idx];
    dst_r[i] = audio_samples_R[src_idx];
  }
  audio_read_cursor = (audio_read_cursor + len) & SAMPLE_MASK;
}
function keyboard(callback, event) {
  switch (event.keyCode) {
    case 87:
      callback(1, jsnes.Controller.BUTTON_UP);
      break;
    case 83:
      callback(1, jsnes.Controller.BUTTON_DOWN);
      break;
    case 65:
      callback(1, jsnes.Controller.BUTTON_LEFT);
      break;
    case 68:
      callback(1, jsnes.Controller.BUTTON_RIGHT);
      break;
    case 74:
      callback(1, jsnes.Controller.BUTTON_B);
      break;
    case 75:
      callback(1, jsnes.Controller.BUTTON_A);
      break;
    case 16:
      callback(1, jsnes.Controller.BUTTON_SELECT);
      break;
    case 13:
      callback(1, jsnes.Controller.BUTTON_START);
      break;
    default:
      break;
  }
  switch (event.keyCode) {
    case 38:
      callback(2, jsnes.Controller.BUTTON_UP);
      break;
    case 40:
      callback(2, jsnes.Controller.BUTTON_DOWN);
      break;
    case 37:
      callback(2, jsnes.Controller.BUTTON_LEFT);
      break;
    case 39:
      callback(2, jsnes.Controller.BUTTON_RIGHT);
      break;
    case 97:
      callback(2, jsnes.Controller.BUTTON_B);
      break;
    case 98:
      callback(2, jsnes.Controller.BUTTON_A);
      break;
    case 107:
      callback(2, jsnes.Controller.BUTTON_SELECT);
      break;
    case 109:
      callback(2, jsnes.Controller.BUTTON_START);
      break;
    default:
      break;
  }
}
function nes_init(canvas_id) {
  var canvas = document.getElementById(canvas_id);
  canvas_ctx = canvas.getContext("2d");
  image = canvas_ctx.getImageData(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

  canvas_ctx.fillStyle = "black";
  canvas_ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  var buffer = new ArrayBuffer(image.data.length);
  framebuffer_u8 = new Uint8ClampedArray(buffer);
  framebuffer_u32 = new Uint32Array(buffer);
  var audio_ctx = new window.AudioContext();
  var script_processor = audio_ctx.createScriptProcessor(AUDIO_BUFFERING, 0, 2);
  script_processor.onaudioprocess = audio_callback;
  script_processor.connect(audio_ctx.destination);
}
function nes_boot(rom_data) {
  nes.loadROM(rom_data);
  window.requestAnimationFrame(onAnimationFrame);
}
function nes_load_data(canvas_id, rom_data) {
  nes_init(canvas_id);
  nes_boot(rom_data);
}
function nes_load_url(canvas_id, path) {
  nes_init(canvas_id);

  var req = new XMLHttpRequest();
  req.open("GET", path);
  req.overrideMimeType("text/plain; charset=x-user-defined");
  req.onerror = () => console.log(`Error loading ${path}: ${req.statusText}`);

  req.onload = function () {
    if (this.status === 200) {
      nes_boot(this.responseText);
    } else if (this.status === 0) {
    } else {
      req.onerror();
    }
  };

  req.send();
}
var canvas = document.getElementById("canvas");
var directory = document.getElementById("directory");
function setCanvasSize() {
  if (window.innerWidth < window.innerHeight) {
    canvas.style.width = window.innerWidth * 0.95 + "px";
  } else {
    canvas.style.width = window.innerHeight * 0.95 + "px";
  }
  if (
    typeof window.orientation !== "undefined" ||
    navigator.userAgent.indexOf("IEMobile") !== -1
  ) {
    window.matchMedia("(orientation: landscape)").matches
      ? (document.getElementById("controller").style.display = "block")
      : (document.getElementById("controller").style.display = "none");
  }
}
setCanvasSize();
window.addEventListener("resize", setCanvasSize);
var lis = "";
games.forEach((game) => {
  lis += `<li>${game.game}</li>`;
});
directory.innerHTML = lis;
directory.onclick = function (e) {
  if (e.target.tagName === "LI") {
    nes_load_url("canvas", `roms/${e.target.innerText}.nes`);
    document.title = e.target.innerText;
    document.getElementById("container").remove();
    canvas.style.display = "block";
  }
};
document.addEventListener("keydown", (event) => {
  keyboard(nes.buttonDown, event);
});
document.addEventListener("keyup", (event) => {
  keyboard(nes.buttonUp, event);
});
var rocker = document.getElementById("rocker");
var x, y, starx, stary, movex, movey, touch, endx, endy, angleRad, angleDeg;
rocker.addEventListener("touchstart", function (event) {
  event.preventDefault();
  x = this.offsetLeft;
  y = this.offsetTop;
  touch = event.targetTouches[0];
  starx = touch.pageX;
  stary = touch.pageY;
});
function dispatchKeybord(eventType, keyCode) {
  document.dispatchEvent(new KeyboardEvent(eventType, { keyCode }));
}
function dispatchKeysup() {
  document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: 87 }));
  document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: 83 }));
  document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: 65 }));
  document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: 68 }));
}
rocker.addEventListener("touchmove", function (event) {
  touch = event.targetTouches[0];
  endx = touch.pageX;
  endy = touch.pageY;
  movex = endx - starx;
  movey = endy - stary;
  angleRad = Math.atan2(movey, movex);
  angleDeg = angleRad * (180 / Math.PI);
  if (Math.sqrt(movex * movex + movey * movey) < 50) {
    this.style.top = y + movey + "px";
    this.style.left = x + movex + "px";
  } else {
    this.style.top = y + 50 * Math.sin(angleDeg * (Math.PI / 180)) + "px";
    this.style.left = x + 50 * Math.cos(angleDeg * (Math.PI / 180)) + "px";
  }
  switch (true) {
    case angleDeg >= -22.5 && angleDeg < 22.5:
      dispatchKeysup();
      dispatchKeybord("keydown", "68");
      break;
    case angleDeg >= -67.5 && angleDeg < -22.5:
      dispatchKeysup();
      dispatchKeybord("keydown", "68");
      dispatchKeybord("keydown", "87");
      break;
    case angleDeg >= -112.5 && angleDeg < -67.5:
      dispatchKeysup();
      dispatchKeybord("keydown", "87");
      break;
    case angleDeg >= -157.5 && angleDeg < -112.5:
      dispatchKeysup();
      dispatchKeybord("keydown", "65");
      dispatchKeybord("keydown", "87");
      break;
    case (angleDeg >= -180 && angleDeg < -157.5) ||
      (angleDeg >= 157.5 && angleDeg < 180):
      dispatchKeysup();
      dispatchKeybord("keydown", "65");
      break;
    case angleDeg >= 112.5 && angleDeg < 157.5:
      dispatchKeysup();
      dispatchKeybord("keydown", "65");
      dispatchKeybord("keydown", "83");
      break;
    case angleDeg >= 67.5 && angleDeg < 112.5:
      dispatchKeysup();
      dispatchKeybord("keydown", "83");
      break;
    case angleDeg >= 22.5 && angleDeg < 67.5:
      dispatchKeysup();
      dispatchKeybord("keydown", "68");
      dispatchKeybord("keydown", "83");
      break;
    default:
      dispatchKeysup();
      break;
  }
});
rocker.addEventListener("touchend", function () {
  dispatchKeysup();
  this.style.top = y + "px";
  this.style.left = x + "px";
});
document.getElementById("buttonA").addEventListener("touchstart", function () {
  dispatchKeybord("keydown", "74");
  setTimeout(function () {
    dispatchKeybord("keyup", "74");
  }, 100);
});
document.getElementById("buttonB").addEventListener("touchstart", function () {
  dispatchKeybord("keydown", "75");
  setTimeout(function () {
    dispatchKeybord("keyup", "75");
  }, 100);
});
document
  .getElementById("buttonSelect")
  .addEventListener("touchstart", function () {
    dispatchKeybord("keydown", "16");
    setTimeout(function () {
      dispatchKeybord("keyup", "16");
    }, 100);
  });
document
  .getElementById("buttonStart")
  .addEventListener("touchstart", function () {
    dispatchKeybord("keydown", "13");
    setTimeout(function () {
      dispatchKeybord("keyup", "13");
    }, 100);
  });
document.getElementById("fullScreen").addEventListener("click", function () {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    this.innerText = "Exit Full Screen";
  } else {
    document.exitFullscreen();
    this.innerText = "Full Screen";
  }
});
