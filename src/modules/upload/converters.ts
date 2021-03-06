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

/* Each is automatically attached to global THREE instance */
import 'three/examples/js/loaders/STLLoader';
import 'three/examples/js/loaders/OBJLoader';
import 'three/examples/js/loaders/DRACOLoader';
import 'three/examples/js/exporters/GLTFExporter';

const PNG = pngjs.PNG;

const three: any = THREE;

/* eslint-disable-next-line @typescript-eslint/no-empty-function */
const noop = () => {};
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

export default class Converter {
  SCENE_CONFIG = {
    backgroundColor: '#1a1a1a',
    meshColor: '#ffffff',
  };

  scene;
  renderer;
  camera;
  file;
  ext;
  height = 600;
  width = 1000;
  defaultMaterial = new three.MeshPhongMaterial({
    color: new three.Color(this.SCENE_CONFIG.meshColor),
    fog: false,
  });

  constructor(file, ext) {
    this.file = file;
    this.ext = ext;
    this.init();
  }

  private init = async () => {
    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initLights();

    await this.loadModel(this.file);
    this.renderer.render(this.scene, this.camera);
  };

  capture = async () => {
    return new Promise(async (resolve, reject) => {
      try {
        const glContext = this.renderer.getContext();
        const png = new PNG({
          width: this.width,
          height: this.height,
        });

        const pixels = new Uint8Array(4 * this.width * this.height);
        glContext.readPixels(
          0,
          0,
          this.width,
          this.height,
          glContext.RGBA,
          glContext.UNSIGNED_BYTE,
          pixels,
        );

        for (let j = 0; j < this.height; j++) {
          for (let i = 0; i < this.width; i++) {
            const k = j * this.width + i;
            const r = pixels[4 * k];
            const g = pixels[4 * k + 1];
            const b = pixels[4 * k + 2];
            const a = pixels[4 * k + 3];

            const m = (this.height - j + 1) * this.width + i;
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

  private centerCamera = (box) => {
    const center = new three.Vector3();
    let size = new three.Vector3();
    box.getCenter(center);
    size = box.getSize(size).length();
    this.camera.updateProjectionMatrix();
    this.camera.position.copy(center);
    this.camera.position.x -= size;
    this.camera.position.y -= size;
    this.camera.position.z += size;
    this.camera.near = size / 3;
    this.camera.far = size * 3;
    this.camera.lookAt(center);
    this.camera.updateProjectionMatrix();
  };

  private initCamera = () => {
    this.camera = new three.PerspectiveCamera(
      36,
      this.width / this.height,
      0.1,
      1000,
    );
    this.camera.position.set(-350, -100, 100);
    this.camera.up = new three.Vector3(0, 0, 1);

    this.setProjectionMatrix(this.width, this.height);
  };

  private initRenderer = () => {
    const webgl = gl(this.width, this.height, { preserveDrawingBuffer: true });
    const canvas: any = {
      addEventListener: noop,
    };

    this.renderer = new three.WebGLRenderer({
      antialias: true,
      height: this.height,
      width: this.width,
      canvas,
      context: webgl,
    });
  };

  private initScene = () => {
    this.scene = new three.Scene();
    this.scene.background = null; // new three.Color(this.SCENE_CONFIG.backgroundColor);
    this.scene.fog = new three.Fog(this.SCENE_CONFIG.backgroundColor);
  };

  private initLights = () => {
    const hemiphereLight = new three.HemisphereLight(0xffffff, 0x080820, 0.5);
    this.scene.add(hemiphereLight);

    const spotLightFront = new three.SpotLight(0xffffff, 0.5, 0);
    spotLightFront.position.set(-500, 500, 500);
    this.scene.add(spotLightFront);

    const lightbulb = new three.PointLight(0xffffff, 0.5, 0);
    lightbulb.position.set(2000, -2000, 2000);
    this.scene.add(lightbulb);
  };

  /* Load Model */
  private loadModel = async (file) => {
    let loader = null;
    let mesh;
    const material = this.defaultMaterial;

    if (this.ext === 'stl') {
      loader = new three.STLLoader();
      const geometry = loader.parse(file);

      mesh = new three.Mesh(geometry, this.defaultMaterial);
    } else if (this.ext === 'obj') {
      loader = new three.OBJLoader();
      mesh = loader.parse(file);

      mesh.traverse(function (child) {
        if (child instanceof THREE.Mesh) {
          child.material = material;
        }
      });
    } else {
      throw Error('Unsupported file type.');
    }

    this.scene.add(mesh);
    this.centerCamera(new three.Box3().setFromObject(mesh));
  };

  private setProjectionMatrix = (width, height) => {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  exportGlb = async () => {
    const exporter = new three.GLTFExporter();
    const options = {
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

    const material = new three.MeshBasicMaterial({
      color: new three.Color(this.SCENE_CONFIG.meshColor),
      fog: false,
    });

    // Don't want to overwrite changes in our actual scene
    const tempScene = new three.Scene();
    let foundMesh = false;
    this.scene.traverse((child) => {
      if (child instanceof three.Mesh) {
        const newChild = child.clone();
        newChild.material = material;
        tempScene.add(newChild);
        foundMesh = true;
      }
    });

    if (!foundMesh) throw new Error('No supported mesh was found.');

    return new Promise((resolve, reject) => {
      try {
        exporter.parse(
          tempScene,
          (geometry) => {
            gltfPipeline.gltfToGlb(geometry).then((results) => {
              resolve(results.glb);
            });
          },
          options,
        );
      } catch (error) {
        reject(error);
      }
    });
  };
}
