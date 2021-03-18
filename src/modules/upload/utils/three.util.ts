// convert: https://github.com/Scandy-co/vr-playground/blob/500e7891811a06cd4447b685de1d0a14c97c05b1/asset-mgmt/assetConverter.js
// png gist: https://gist.github.com/bsergean/6780d7cc0cabb1b4d6c8#file-offscreen_sample-coffee-L5
import { TextDecoder } from 'util';
import * as THREE from 'three';
declare const global: any;
global.THREE = THREE;

import * as atob from 'atob';
import { Blob, FileReader } from 'vblob';
import { Image } from 'image-js';
import * as gl from 'gl';
import * as pngjs from 'pngjs';
import * as gltfPipeline from 'gltf-pipeline';
import * as sharp from 'sharp';

/* Each is automatically attached to global THREE instance */
import 'three/examples/js/loaders/STLLoader';
import 'three/examples/js/loaders/OBJLoader';
import 'three/examples/js/loaders/GLTFLoader';
import 'three/examples/js/exporters/GLTFExporter';

/* Custom DracLoader is required to run in Node */
/* eslint-disable-next-line @typescript-eslint/no-var-requires */
const NodeDRACOLoader = require('./NodeDRACOLoader.js');

const PNG = pngjs.PNG;

const three: any = THREE;

/* eslint-disable-next-line @typescript-eslint/no-empty-function */
const noop = () => {};

THREE.DRACOLoader.getDecoderModule = noop;
/* Mock browser window so three deps run w/o error */
global.window = global;
global.atob = atob;
global.Blob = Blob;
global.FileReader = FileReader;
global.TextDecoder = TextDecoder;
global.requestAnimationFrame = noop;
global.document = {
  addEventListener: noop,
  removeEventListener: noop,
  createElementNS: (namespaceURI, qualifiedName) => {
    if (qualifiedName == 'img') {
      const img: any = new Image();
      img.removeEventListener = noop;
      img.addEventListener = noop;
      return img;
    }
    throw new Error(`Cannot create node ${qualifiedName}`);
  },
  createElement: (nodeName) => {
    throw new Error(`Cannot create node ${nodeName}`);
  },
};

const exportOptions = {
  binary: false,
  trs: false,
  onlyVisible: false,
  truncateDrawRange: true,
  embedImages: true,
  maxTextureSize: Infinity,
  animations: [],
  forceIndices: false,
  forcePowerOfTwoTextures: false,
  includeCustomExtensions: false,
};

/* Compress GLTF using draco, then convert to binary GLB format */
const compressGltf = async (gltf) => {
  const options = {
    dracoOptions: { compressionLevel: 10 },
  };
  const compressedResult = await gltfPipeline.processGltf(gltf, options);
  const glbResult = await gltfPipeline.gltfToGlb(compressedResult.gltf);
  return glbResult.glb;
};

type ConvertOptions = {
  extension: string;
};
export async function convertModel(file, options: ConvertOptions) {
  const { extension } = options;
  const loaders = {
    stl: three.STLLoader,
    obj: three.OBJLoader,
  };
  const loader = new loaders[extension]();
  const formattedFile =
    extension === 'obj' ? file.toString('utf-8') : file.buffer;
  const geometry = loader.parse(formattedFile);
  const mesh = new three.Mesh(geometry);
  const scene = new three.Scene();
  scene.add(mesh);
  const exporter = new three.GLTFExporter();

  return new Promise((resolve, reject) => {
    try {
      exporter.parse(
        scene,
        async (gltf) => {
          const glb = await compressGltf(gltf);
          resolve(glb);
        },
        exportOptions,
      );
    } catch (error) {
      reject(error);
    }
  });
}

function createRenderer(dimensions) {
  const { width, height } = dimensions;
  const webgl = gl(width, height, { preserveDrawingBuffer: true });
  const canvas: any = { addEventListener: noop };

  const renderer = new three.WebGLRenderer({
    antialias: true,
    height: height,
    width: width,
    canvas,
    context: webgl,
  });
  return renderer;
}

type SceneOptions = {
  background?: any;
  fog?: any;
};

function createScene(options: SceneOptions) {
  const { background, fog } = options;
  const scene = new three.Scene();
  scene.background = background ? new three.Color(background) : null;
  scene.fog = fog ? new three.Fog(background) : null;

  /* Add lights */
  const hemiphereLight = new three.HemisphereLight(0xffffff, 0x080820, 0.5);
  scene.add(hemiphereLight);

  const spotLightFront = new three.SpotLight(0xffffff, 0.5, 0);
  spotLightFront.position.set(-500, 500, 500);
  scene.add(spotLightFront);

  const lightbulb = new three.PointLight(0xffffff, 0.5, 0);
  lightbulb.position.set(2000, -2000, 2000);
  scene.add(lightbulb);

  return scene;
}

function createCamera(dimensions) {
  const { width, height } = dimensions;
  const camera = new three.PerspectiveCamera(36, width / height, 0.1, 1000);
  camera.position.set(-350, -100, 100);
  camera.up = new three.Vector3(0, 0, 1);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  return camera;
}

const createPng = async (glContext, dimensions) => {
  return new Promise((resolve, reject) => {
    try {
      const { width, height } = dimensions;
      const png = new PNG({ width, height });
      const pixels = new Uint8Array(4 * width * height);

      glContext.readPixels(
        0,
        0,
        width,
        height,
        glContext.RGBA,
        glContext.UNSIGNED_BYTE,
        pixels,
      );

      for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
          const k = j * width + i;
          const r = pixels[4 * k];
          const g = pixels[4 * k + 1];
          const b = pixels[4 * k + 2];
          const a = pixels[4 * k + 3];

          const m = (height - j + 1) * width + i;
          png.data[4 * m] = r;
          png.data[4 * m + 1] = g;
          png.data[4 * m + 2] = b;
          png.data[4 * m + 3] = a;
        }
      }

      png.pack();

      const buffers = [];
      png.on('data', (buffer) => {
        buffers.push(buffer);
      });
      png.on('end', () => {
        const buffer = Buffer.concat(buffers);
        resolve(buffer);
      });
    } catch (error) {
      reject(error);
    }
  });
};

type ScreenshotDimensions = {
  height: number;
  width: number;
};

type ScreenshotColors = {
  background?: string;
  mesh: string;
  fog?: string;
};

type ScreenshotOptions = {
  dimensions: ScreenshotDimensions;
  colors: ScreenshotColors;
};

export async function createScreenshot(file, options: ScreenshotOptions) {
  const { dimensions, colors } = options;
  const renderer = createRenderer(dimensions);
  const scene = createScene(colors);
  const camera = createCamera(dimensions);

  /* Load file into scene */
  const loader = new three.GLTFLoader();
  loader.setDRACOLoader(new NodeDRACOLoader());
  const result = await gltfPipeline.glbToGltf(file);
  const gltf = JSON.stringify(result.gltf);
  const model: any = await new Promise((resolve, reject) => {
    loader.parse(
      gltf,
      null,
      (parsedGltf) => resolve(parsedGltf.scene),
      (error) => reject(error),
    );
  });

  /* Traverse model and set material */
  const material = new three.MeshPhongMaterial({
    color: new three.Color(colors.mesh),
    fog: false,
  });
  model.traverse((child) => {
    if (child.isMesh) {
      child.material = material;
    }
  });

  scene.add(model);

  /* Center camera */
  const box = new three.Box3().setFromObject(model);
  const center = new three.Vector3();
  let size = new three.Vector3();
  box.getCenter(center);
  size = box.getSize(size).length();
  camera.updateProjectionMatrix();
  camera.position.copy(center);
  camera.position.x -= size;
  camera.position.y -= size;
  camera.position.z += size;
  camera.near = size / 3;
  camera.far = size * 3;
  camera.lookAt(center);
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);

  /* Create PNG of scene */
  const glContext = renderer.getContext();
  const pngImage = await createPng(glContext, dimensions);
  /* Convert to webp */
  const webpImage = await sharp(pngImage).webp({ lossless: true }).toBuffer();
  return webpImage;
}
