/**
 * gl-shim.ts — Minimal software WebGL2 context for Node.js
 *
 * Intercepts texture uploads (texImage2D / texSubImage2D) to capture
 * the emulator framebuffer without a real GPU. All other GL calls are
 * no-ops that return safe defaults.
 *
 * Usage: pass the shimmed canvas to the Emscripten module as Module.canvas.
 */

// WebGL constants used by RetroArch / EmulatorJS
const GL = {
  RGBA: 0x1908,
  RGB: 0x1907,
  UNSIGNED_BYTE: 0x1401,
  UNSIGNED_SHORT_5_6_5: 0x8363,
  UNSIGNED_SHORT_5_5_5_1: 0x8034,
  TEXTURE_2D: 0x0DE1,
  FRAMEBUFFER: 0x8D40,
  RENDERBUFFER: 0x8D41,
  COLOR_ATTACHMENT0: 0x8CE0,
  ARRAY_BUFFER: 0x8892,
  ELEMENT_ARRAY_BUFFER: 0x8893,
  FRAGMENT_SHADER: 0x8B30,
  VERTEX_SHADER: 0x8B31,
  COMPILE_STATUS: 0x8B81,
  LINK_STATUS: 0x8B82,
  MAX_TEXTURE_SIZE: 0x0D33,
  MAX_VERTEX_ATTRIBS: 0x8869,
  MAX_VERTEX_UNIFORM_VECTORS: 0x8DFB,
  MAX_VARYING_VECTORS: 0x8DFC,
  MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8B4D,
  MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8B4C,
  MAX_TEXTURE_IMAGE_UNITS: 0x8872,
  MAX_FRAGMENT_UNIFORM_VECTORS: 0x8DFD,
  VENDOR: 0x1F00,
  RENDERER: 0x1F01,
  VERSION: 0x1F02,
  SHADING_LANGUAGE_VERSION: 0x8B8C,
  MAX_RENDERBUFFER_SIZE: 0x84E8,
  MAX_VIEWPORT_DIMS: 0x0D3A,
  MAX_UNIFORM_BLOCK_SIZE: 0x8A30,
  ACTIVE_UNIFORMS: 0x8B86,
  ACTIVE_ATTRIBUTES: 0x8B89,
} as const;

let _nextId = 1;
function nextId() { return _nextId++; }

export interface FrameCapture {
  width: number;
  height: number;
  rgba: Uint8Array;
}

/**
 * Create a mock WebGL2 rendering context that captures framebuffer data.
 * Returns { ctx, canvas, getFrame() }.
 */
export function createGLShim(targetWidth: number, targetHeight: number) {
  let capturedFrame: FrameCapture = {
    width: targetWidth,
    height: targetHeight,
    rgba: new Uint8Array(targetWidth * targetHeight * 4),
  };

  const canvas = {
    width: targetWidth,
    height: targetHeight,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: targetWidth, height: targetHeight }),
    setAttribute: () => {},
    getAttribute: () => null,
    getContext: (_type: string) => ctx,
    GLctxObject: undefined as any,
    focus: () => {},
    clientWidth: targetWidth,
    clientHeight: targetHeight,
  };

  const noop = () => {};
  const noopVal = () => null;

  // Generate a proxy that returns no-ops for any unknown property
  const ctx: any = new Proxy({}, {
    get(_target, prop) {
      // Known getters
      if (prop === "canvas") return canvas;
      if (prop === "drawingBufferWidth") return targetWidth;
      if (prop === "drawingBufferHeight") return targetHeight;

      // Parameter queries
      if (prop === "getParameter") return (pname: number) => {
        switch (pname) {
          case GL.MAX_TEXTURE_SIZE: return 8192;
          case GL.MAX_VERTEX_ATTRIBS: return 16;
          case GL.MAX_VERTEX_UNIFORM_VECTORS: return 256;
          case GL.MAX_VARYING_VECTORS: return 32;
          case GL.MAX_COMBINED_TEXTURE_IMAGE_UNITS: return 32;
          case GL.MAX_VERTEX_TEXTURE_IMAGE_UNITS: return 16;
          case GL.MAX_TEXTURE_IMAGE_UNITS: return 16;
          case GL.MAX_FRAGMENT_UNIFORM_VECTORS: return 256;
          case GL.MAX_RENDERBUFFER_SIZE: return 8192;
          case GL.MAX_VIEWPORT_DIMS: return new Int32Array([8192, 8192]);
          case GL.MAX_UNIFORM_BLOCK_SIZE: return 65536;
          case GL.VENDOR: return "SoftwareGL";
          case GL.RENDERER: return "zelda-overlay-shim";
          case GL.VERSION: return "WebGL 2.0";
          case GL.SHADING_LANGUAGE_VERSION: return "WebGL GLSL ES 3.00";
          default: return 0;
        }
      };

      // Texture uploads — this is where we capture the framebuffer
      if (prop === "texImage2D") return (...args: any[]) => {
        // texImage2D has multiple overloads. We care about the one with pixel data.
        // Standard: texImage2D(target, level, internalformat, width, height, border, format, type, pixels)
        // Or: texImage2D(target, level, internalformat, format, type, source)
        let width: number, height: number, format: number, type: number, pixels: any;

        if (args.length >= 9) {
          [, , , width, height, , format, type, pixels] = args;
        } else if (args.length >= 6) {
          // Source-based overload — skip
          return;
        } else {
          return;
        }

        if (!pixels || !width || !height) return;
        capturePixels(width, height, format, type, pixels);
      };

      if (prop === "texSubImage2D") return (...args: any[]) => {
        // texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels)
        if (args.length >= 9) {
          const [, , , , width, height, format, type, pixels] = args;
          if (pixels && width && height) {
            capturePixels(width, height, format, type, pixels);
          }
        }
      };

      // Object creation — return unique integer IDs
      if (prop === "createTexture" || prop === "createBuffer" ||
          prop === "createFramebuffer" || prop === "createRenderbuffer" ||
          prop === "createSampler" || prop === "createVertexArray") {
        return () => ({ _id: nextId() });
      }

      if (prop === "createShader") return () => ({ _id: nextId(), source: "" });
      if (prop === "createProgram") return () => ({ _id: nextId(), shaders: [] });

      // Shader compilation — always succeeds
      if (prop === "shaderSource") return (shader: any, source: string) => { if (shader) shader.source = source; };
      if (prop === "compileShader") return noop;
      if (prop === "getShaderParameter") return (_s: any, pname: number) =>
        pname === GL.COMPILE_STATUS ? true : 0;
      if (prop === "getProgramParameter") return (_p: any, pname: number) => {
        if (pname === GL.LINK_STATUS) return true;
        if (pname === GL.ACTIVE_UNIFORMS) return 0;
        if (pname === GL.ACTIVE_ATTRIBUTES) return 0;
        return 0;
      };
      if (prop === "getShaderInfoLog" || prop === "getProgramInfoLog") return () => "";
      if (prop === "linkProgram" || prop === "attachShader") return noop;
      if (prop === "getUniformLocation") return () => ({ _id: nextId() });
      if (prop === "getAttribLocation") return () => 0;
      if (prop === "getUniformBlockIndex") return () => 0;
      if (prop === "getActiveUniformBlockName") return () => "";

      // Extensions — return a minimal object
      if (prop === "getExtension") return (name: string) => {
        if (name.includes("disjointTimerQuery")) return { QUERY_COUNTER_BITS_EXT: 0 };
        return {};
      };
      if (prop === "getSupportedExtensions") return () => [];

      // readPixels — return the captured frame
      if (prop === "readPixels") return (
        _x: number, _y: number, w: number, h: number,
        _format: number, _type: number, pixels: Uint8Array
      ) => {
        if (pixels && capturedFrame.rgba) {
          const copyLen = Math.min(pixels.length, w * h * 4, capturedFrame.rgba.length);
          pixels.set(capturedFrame.rgba.subarray(0, copyLen));
        }
      };

      // Viewport / scissor
      if (prop === "viewport" || prop === "scissor") return (x: number, y: number, w: number, h: number) => {
        if (w > 0 && h > 0) {
          canvas.width = w;
          canvas.height = h;
        }
      };

      // Anything else is a no-op
      if (typeof prop === "string") {
        // Return appropriate no-ops based on naming patterns
        if (prop.startsWith("enable") || prop.startsWith("disable") ||
            prop.startsWith("bind") || prop.startsWith("delete") ||
            prop.startsWith("uniform") || prop.startsWith("vertexAttrib") ||
            prop.startsWith("draw") || prop.startsWith("clear") ||
            prop.startsWith("blend") || prop.startsWith("depth") ||
            prop.startsWith("stencil") || prop.startsWith("color") ||
            prop.startsWith("pixel") || prop.startsWith("tex") ||
            prop.startsWith("sampler") || prop.startsWith("use") ||
            prop.startsWith("active") || prop.startsWith("flush") ||
            prop.startsWith("finish") || prop.startsWith("generate") ||
            prop === "bufferData" || prop === "bufferSubData" ||
            prop === "lineWidth" || prop === "polygonOffset" ||
            prop === "frontFace" || prop === "cullFace") {
          return noop;
        }
        if (prop.startsWith("is")) return () => false;
        if (prop.startsWith("check")) return () => 0x8CD5; // FRAMEBUFFER_COMPLETE
        if (prop.startsWith("get")) return noopVal;
      }

      return undefined;
    }
  });

  function capturePixels(width: number, height: number, format: number, type: number, pixels: any) {
    // Convert whatever format to RGBA
    const pixelCount = width * height;
    if (pixelCount <= 0) return;

    // Reallocate if dimensions changed
    if (capturedFrame.width !== width || capturedFrame.height !== height) {
      capturedFrame = {
        width, height,
        rgba: new Uint8Array(pixelCount * 4),
      };
    }

    const out = capturedFrame.rgba;

    if (type === GL.UNSIGNED_BYTE) {
      if (format === GL.RGBA && pixels instanceof Uint8Array) {
        // Direct RGBA copy
        out.set(pixels.subarray(0, pixelCount * 4));
      } else if (format === GL.RGB && pixels instanceof Uint8Array) {
        // RGB -> RGBA
        for (let i = 0, j = 0; i < pixelCount; i++, j += 3) {
          out[i * 4] = pixels[j];
          out[i * 4 + 1] = pixels[j + 1];
          out[i * 4 + 2] = pixels[j + 2];
          out[i * 4 + 3] = 255;
        }
      }
    } else if (type === GL.UNSIGNED_SHORT_5_6_5 && pixels instanceof Uint16Array) {
      // RGB565 -> RGBA (common SNES format)
      for (let i = 0; i < pixelCount; i++) {
        const px = pixels[i];
        out[i * 4] = ((px >> 11) & 0x1F) * 255 / 31;
        out[i * 4 + 1] = ((px >> 5) & 0x3F) * 255 / 63;
        out[i * 4 + 2] = (px & 0x1F) * 255 / 31;
        out[i * 4 + 3] = 255;
      }
    }
  }

  return {
    canvas,
    ctx,
    getFrame(): FrameCapture { return capturedFrame; },
  };
}
