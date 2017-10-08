import {
  LZ77,
  decodeCharByte
} from "./rom-utils";

import { OFFSETS as OFS } from "./offsets";

export const I8 = Int8Array.BYTES_PER_ELEMENT;
export const I16 = Int16Array.BYTES_PER_ELEMENT;
export const I32 = Int32Array.BYTES_PER_ELEMENT;
export const PTR = Int32Array.BYTES_PER_ELEMENT;

export function readByte(buffer, offset) {
  return (
    buffer[offset] & 0xff
  );
};

export function readShort(buffer, offset) {
  return (
    (buffer[offset] << 0) |
    (buffer[offset + 1] << 8)
  );
};

export function readInt(buffer, offset) {
  return (
    (buffer[offset + 0] << 0)  |
    (buffer[offset + 1] << 8)  |
    (buffer[offset + 2] << 16) |
    (buffer[offset + 3] << 24)
  );
};

export function readPointer(buffer, offset) {
  return (
    readInt(buffer, offset) & 0x1FFFFFF
  );
};

export function readPointerAsInt(buffer, offset) {
  return (
    readPointer(buffer, offset) | 0
  );
};

export function readChar(buffer, offset) {
  return decodeCharByte(readByte(buffer, offset));
};

export function readBytes(buffer, offset, length) {
  let data = new Uint8Array(length);
  for (let ii = 0; ii < length; ++ii) {
    data[ii] = readByte(buffer, offset + ii * I8);
  };
  return data;
};

export function readShorts(buffer, offset, length) {
  let data = new Uint16Array(length);
  for (let ii = 0; ii < length; ++ii) {
    data[ii] = readShort(buffer, offset + ii * I16);
  };
  return data;
};

export function readInts(buffer, offset, length) {
  let data = new Uint32Array(length);
  for (let ii = 0; ii < length; ++ii) {
    data[ii] = readInt(buffer, offset + ii * I32);
  };
  return data;
};

export function readPointers(buffer, offset, length) {
  let ptrs = new Uint8Array(length);
  for (let ii = 0; ii < length; ++ii) {
    let ptr = readPointer(buffer, offset + ii * PTR);
    ptrs.push(ptr);
  };
  return ptrs;
};

export function readString(buffer, offset) {
  let ii = 0;
  let chars = [];
  let char = readChar(buffer, offset);
  while (char !== "|end|") {
    chars.push(char);
    char = readChar(buffer, offset + (++ii));
  };
  return chars.join("");
};

export function readBinaryString(buffer, offset, length) {
  let data = [];
  for (let ii = 0; ii < length; ++ii) {
    let char = readByte(buffer, offset + ii);
    data[ii] = String.fromCharCode(char);
  };
  return data.join("");
};

export function readPalette(buffer, offset, uncmp = false) {
  let colors = [];
  let palette = uncmp ? readBytes(buffer, offset, 0xfff) : LZ77(buffer, offset);
  for (let ii = 0; ii < palette.length; ++ii) {
    let value = palette[ii] | (palette[++ii] << 8);
    let r = ( value & 0x1F ) << 3;
    let g = ( value & 0x3E0 ) >> 2;
    let b = ( value & 0x7C00 ) >> 7;
    colors[ii / 2 | 0] = { r, g, b };
  };
  return colors;
};

export function readPixels(buffer, offset, palette, width, height, uncmp = false) {
  let index = 0;
  let TILE_SIZE = 8;
  let pixels = new ImageData(width, height);
  let size = (width / TILE_SIZE) * (height / TILE_SIZE) | 0;
  let data = uncmp ? readBytes(buffer, offset, 0xfff) : LZ77(buffer, offset);
  for (let ii = 0; ii < size; ++ii) {
    let xx = (ii % (width / TILE_SIZE)) | 0;
    let yy = (ii / (width / TILE_SIZE)) | 0;
    for (let jj = 0; jj < TILE_SIZE * TILE_SIZE; ++jj) {
      let px = (jj % (TILE_SIZE)) | 0;
      let py = (jj / (TILE_SIZE)) | 0;
      let depth = 4;
      let pix = (index / (TILE_SIZE / depth)) | 0;
      let pixel = data[pix];
      if ((index & 1) === 0) pixel &= 0x0F;
      else pixel = (pixel & 0xF0) >> depth;
      if (pixel > 0) {
        let r = palette[pixel].r;
        let g = palette[pixel].g;
        let b = palette[pixel].b;
        let idx = (((py + (yy * TILE_SIZE)) * width + (px + (xx * TILE_SIZE))) | 0) * 4;
        pixels.data[idx + 0] = r;
        pixels.data[idx + 1] = g;
        pixels.data[idx + 2] = b;
        pixels.data[idx + 3] = 0xff;
      }
      index++;
    };
  };
  return pixels;
};
